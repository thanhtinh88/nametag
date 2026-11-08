import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiServer } from '@/lib/backend/api-client';
import { getTranslations } from 'next-intl/server';
import Navigation from '@/components/Navigation';
import JournalEntryForm from '@/components/JournalEntryForm';
import { getUserDisplayPreferences } from '@/lib/user-preferences';

export default async function NewJournalEntryPage() {
  const session = await auth();
  const t = await getTranslations('journal');

  if (!session?.user) {
    redirect('/login');
  }

  const [preferences, peopleRes, eventsRes] = await Promise.all([
    getUserDisplayPreferences(session.user.id),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
    apiServer.get<{ events: any[] }>('/api/events').catch(() => ({ events: [] })),
  ]);

  const availablePeople = peopleRes?.people || [];
  const availableEvents = eventsRes?.events || [];
  const { nameOrder, dateFormat } = preferences;

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/journal"
      />

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-foreground mb-6">
            {t('newEntry')}
          </h1>

          <div className="bg-surface shadow rounded-lg p-6">
            <JournalEntryForm
              mode="create"
              availablePeople={availablePeople}
              availableEvents={availableEvents}
              nameOrder={nameOrder}
              dateFormat={dateFormat}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
