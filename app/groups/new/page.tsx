import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiServer } from '@/lib/backend/api-client';
import GroupForm from '@/components/GroupForm';
import Navigation from '@/components/Navigation';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';

export default async function NewGroupPage() {
  const session = await auth();
  const t = await getTranslations('groups');

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch user's name order preference and available people
  const [{ nameOrder }, peopleRes] = await Promise.all([
    getUserDisplayPreferences(session.user.id),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
  ]);

  const availablePeople = peopleRes?.people || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/groups"
      />

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-foreground mb-6">
            {t('createNewGroup')}
          </h1>

          <div className="bg-surface shadow rounded-lg p-6">
            <GroupForm
              mode="create"
              availablePeople={availablePeople}
              nameOrder={nameOrder}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
