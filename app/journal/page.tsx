import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiServer } from '@/lib/backend/api-client';
import { getTranslations } from 'next-intl/server';
import Navigation from '@/components/Navigation';
import JournalTimeline from '@/components/JournalTimeline';
import JournalFilters from '@/components/JournalFilters';
import { Button } from '@/components/ui/Button';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import type { JournalEntry } from '@/types/api/journal';

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; event?: string; q?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [t, params] = await Promise.all([
    getTranslations('journal'),
    searchParams,
  ]);

  const personFilterParam = params.person;
  const personFilterIds = personFilterParam ? personFilterParam.split(',').filter(Boolean) : [];
  const eventFilterParam = params.event;
  const eventFilterIds = eventFilterParam ? eventFilterParam.split(',').filter(Boolean) : [];
  const searchQuery = params.q;

  const queryParams = new URLSearchParams();
  if (personFilterIds[0]) queryParams.set('personId', personFilterIds[0]);
  if (eventFilterIds[0]) queryParams.set('eventId', eventFilterIds[0]);
  if (searchQuery) queryParams.set('search', searchQuery);

  const [preferences, peopleRes, eventsRes, journalRes] = await Promise.all([
    getUserDisplayPreferences(session.user.id),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
    apiServer.get<{ events: any[] }>('/api/events').catch(() => ({ events: [] })),
    apiServer.get<{ entries: JournalEntry[] }>(`/api/journal?${queryParams.toString()}`).catch(() => ({ entries: [] })),
  ]);

  const people = peopleRes?.people || [];
  const events = eventsRes?.events || [];
  let entries = journalRes?.entries || [];

  // Filter if multiple person or event IDs
  if (personFilterIds.length > 1) {
    entries = entries.filter((e) =>
      personFilterIds.every((pid) => (e.people || []).some((p) => p.personId === pid))
    );
  }
  if (eventFilterIds.length > 1) {
    entries = entries.filter((e) =>
      eventFilterIds.every((eid) => (e.events || []).some((ev) => ev.eventId === eid))
    );
  }

  const { nameOrder, nameDisplayFormat, language: locale } = preferences;

  // Serialize Date strings if needed
  const serializedEntries = entries.map((entry) => ({
    ...entry,
    date: typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString(),
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date(entry.createdAt).toISOString(),
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date(entry.updatedAt).toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/journal"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-page-enter">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold text-foreground">
              {t('title')}
            </h1>
            <Button href="/journal/new">
              {t('addEntry')}
            </Button>
          </div>

          <JournalFilters
            people={people}
            events={events}
            currentPersonIds={personFilterIds}
            currentEventIds={eventFilterIds}
            currentSearch={searchQuery}
            nameOrder={nameOrder}
            nameDisplayFormat={nameDisplayFormat}
          />

          <JournalTimeline
            entries={serializedEntries as any}
            nameOrder={nameOrder}
            nameDisplayFormat={nameDisplayFormat}
            locale={locale}
          />
        </div>
      </main>
    </div>
  );
}
