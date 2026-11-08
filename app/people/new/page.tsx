import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { apiServer } from '@/lib/backend/api-client';
import PersonForm from '@/components/PersonForm';
import Navigation from '@/components/Navigation';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';

export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string;
    knownThrough?: string;
    relationshipType?: string;
    connectedEventId?: string;
  }>;
}) {
  const session = await auth();
  const t = await getTranslations('people');

  if (!session?.user) {
    redirect('/login');
  }

  const params = await searchParams;

  const [
    preferences,
    groupsRes,
    relTypesRes,
    peopleRes,
    eventsRes,
    templatesRes,
    gangsRes,
  ] = await Promise.all([
    getUserDisplayPreferences(session.user.id),
    apiServer.get<{ groups: any[] }>('/api/groups').catch(() => ({ groups: [] })),
    apiServer.get<{ relationshipTypes: any[] }>('/api/relationship-types').catch(() => ({ relationshipTypes: [] })),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
    apiServer.get<{ events: any[] }>('/api/events').catch(() => ({ events: [] })),
    apiServer.get<{ customFieldTemplates: any[] }>('/api/custom-field-templates').catch(() => ({ customFieldTemplates: [] })),
    apiServer.get<{ gangs: any[] }>('/api/gangs').catch(() => ({ gangs: [] })),
  ]);

  const { dateFormat, nameOrder } = preferences;
  const groups = groupsRes?.groups || [];
  const relationshipTypes = relTypesRes?.relationshipTypes || [];
  const people = peopleRes?.people || [];
  const events = eventsRes?.events || [];
  const customFieldTemplates = templatesRes?.customFieldTemplates || [];
  const gangs = gangsRes?.gangs || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/people"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t('addNewPerson')}
            </h1>
            <Link
              href="/people"
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              {t('backToPeople')}
            </Link>
          </div>

          <PersonForm
            groups={(groups || []).map((g) => ({ id: g.id, name: g.name, color: g.color ?? null }))}
            customFieldTemplates={customFieldTemplates}
            relationshipTypes={(relationshipTypes || []).map((rt) => ({ id: rt.id, label: rt.label, color: rt.color ?? null }))}
            availablePeople={people}
            availableEvents={events}
            availableGangs={(gangs || []).map((g) => ({ id: g.id, name: g.name, color: g.color ?? null, turf: g.turf ?? null }))}
            userName={session.user.name || session.user.email || 'You'}
            mode="create"
            dateFormat={dateFormat}
            initialName={params.name}
            initialKnownThrough={params.knownThrough}
            initialRelationshipType={params.relationshipType}
            initialConnectedEventId={params.connectedEventId}
            hasCardDavConnection={false}
            nameOrder={nameOrder}
            nameDisplayFormat={preferences.nameDisplayFormat as any}
            defaultReminderLeadDays={0}
            reminderLimit={{
              canCreate: true,
              current: 0,
              limit: Infinity,
              isUnlimited: true,
            }}
          />
        </div>
      </main>
    </div>
  );
}
