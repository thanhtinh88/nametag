import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';
import EventForm from '@/components/event-form/EventForm';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';

export default async function NewEventPage() {
  const session = await auth();
  const t = await getTranslations('events');

  if (!session?.user) {
    redirect('/login');
  }

  const [{ nameOrder }, groups, availablePeople] = await Promise.all([
    getUserDisplayPreferences(session.user.id),
    prisma.group.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.person.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        surname: true,
        middleName: true,
        secondLastName: true,
        nickname: true,
        displayNameOverride: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/events"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-foreground mb-6">
            {t('addNewEvent')}
          </h1>

          <div className="bg-surface shadow rounded-lg p-6">
            <EventForm
              mode="create"
              groups={groups}
              availablePeople={availablePeople}
              nameOrder={nameOrder}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

