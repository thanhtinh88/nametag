import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import Navigation from '@/components/Navigation';
import JournalTimeline from '@/components/JournalTimeline';
import JournalFilters from '@/components/JournalFilters';
import { Button } from '@/components/ui/Button';
import { getUserDisplayPreferences } from '@/lib/user-preferences';

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

  const [preferences, people, events, entries] = await Promise.all([
    getUserDisplayPreferences(session.user.id),
    prisma.person.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        surname: true,
        nickname: true,
        displayNameOverride: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.event.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: { title: 'asc' },
    }),
    prisma.journalEntry.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        AND: [
          ...personFilterIds.map((pid) => ({
            people: { some: { personId: pid } },
          })),
          ...eventFilterIds.map((eid) => ({
            events: { some: { eventId: eid } },
          })),
        ],
        ...(searchQuery
          ? {
              OR: [
                { title: { contains: searchQuery, mode: 'insensitive' } },
                { body: { contains: searchQuery, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        people: {
          where: { person: { deletedAt: null } },
          include: {
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
                nickname: true,
                displayNameOverride: true,
              },
            },
          },
        },
        events: {
          where: { event: { deletedAt: null } },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  const { nameOrder, nameDisplayFormat, language: locale } = preferences;

  // Serialize Date objects to ISO strings for client components
  const serializedEntries = entries.map((entry) => ({
    ...entry,
    date: entry.date.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
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

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8 animate-page-enter">
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
            entries={serializedEntries}
            nameOrder={nameOrder}
            nameDisplayFormat={nameDisplayFormat}
            locale={locale}
          />
        </div>
      </main>
    </div>
  );
}
