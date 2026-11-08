import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import BackLink from '@/components/BackLink';
import { apiServer } from '@/lib/backend/api-client';
import Navigation from '@/components/Navigation';
import { getTranslations } from 'next-intl/server';
import PersonDetailsClient from '@/components/PersonDetailsClient';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import type { NameDisplayFormat } from '@/lib/nameUtils';

type TranslationFn = (key: string, values?: Record<string, string | number | Date>) => string;

function getContactReminderDescription(
  person: {
    contactReminderEnabled: boolean;
    contactReminderInterval?: number | null;
    contactReminderIntervalUnit?: string | null;
  },
  t: TranslationFn
): string | null {
  if (!person.contactReminderEnabled) return null;
  if (person.contactReminderInterval && person.contactReminderIntervalUnit) {
    const unit = person.contactReminderIntervalUnit.toLowerCase();
    const translatedUnit = person.contactReminderInterval === 1 ? t(unit.slice(0, -1)) : t(unit);
    return t('remindAfter', { interval: person.contactReminderInterval, unit: translatedUnit });
  }
  return null;
}

export default async function PersonDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [{ id }, t] = await Promise.all([
    params,
    getTranslations('people'),
  ]);

  const [
    preferences,
    personRes,
    peopleRes,
    relTypesRes,
    journalRes,
    eventsRes,
    immichRes,
  ] = await Promise.all([
    getUserDisplayPreferences(session.user.id),
    apiServer.get<{ person: any }>(`/api/people/${id}`).catch(() => null),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
    apiServer.get<{ relationshipTypes: any[] }>('/api/relationship-types').catch(() => ({ relationshipTypes: [] })),
    apiServer.get<{ entries: any[] }>(`/api/journal?personId=${id}`).catch(() => ({ entries: [] })),
    apiServer.get<{ events: any[] }>('/api/events').catch(() => ({ events: [] })),
    apiServer.get<{ configured?: boolean; enabled?: boolean }>('/api/immich/connection').catch(() => null),
  ]);

  const person = personRes?.person;
  if (!person) {
    notFound();
  }

  const allPeople = peopleRes?.people || [];
  const relationshipTypes = relTypesRes?.relationshipTypes || [];
  const latestJournalEntry = journalRes?.entries?.[0] || null;
  const allEvents = eventsRes?.events || [];

  const { dateFormat, nameOrder, nameDisplayFormat, language } = preferences;

  const serializedPerson = {
    ...person,
    groups: person.groups || [],
    relationshipsTo: person.relationshipsTo || [],
    relationshipsFrom: person.relationshipsFrom || [],
    importantDates: (person.importantDates || []).map((d: any) => ({
      ...d,
      date: typeof d.date === 'string' ? d.date : new Date(d.date).toISOString(),
    })),
    phoneNumbers: person.phoneNumbers || [],
    emails: person.emails || [],
    urls: person.urls || [],
    imHandles: person.imHandles || [],
    customFields: person.customFields || [],
    customFieldValues: person.customFieldValues || [],
    events: person.events || [],
    vehicles: person.vehicles || [],
    physicalMarks: person.physicalMarks || [],
    criminalRecords: person.criminalRecords || [],
    gangMemberships: person.gangMemberships || [],
    bankAccounts: person.bankAccounts || [],
    locations: (person.locations || []).map((loc: any) => ({
      ...loc,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
    })),
    addresses: (person.addresses || []).map((address: any) => ({
      ...address,
      latitude: address.latitude === null || address.latitude === undefined ? null : Number(address.latitude),
      longitude: address.longitude === null || address.longitude === undefined ? null : Number(address.longitude),
    })),
  };

  const relatedPersonIds = new Set(
    (person.relationshipsTo || []).map((r: any) => r.personId)
  );
  const availablePeople = allPeople.filter(
    (p: any) => p.id !== id && !relatedPersonIds.has(p.id)
  );

  const contactReminderDesc = getContactReminderDescription(person, t);

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/people"
      />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-page-enter">
        <div className="mb-4">
          <BackLink
            fallbackHref="/people"
            className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1"
          >
            {t('backToPeople')}
          </BackLink>
        </div>

        <PersonDetailsClient
          person={serializedPerson as any}
          availablePeople={availablePeople}
          relationshipTypes={relationshipTypes}
          hasCardDavConnection={false}
          latestJournalEntry={latestJournalEntry}
          allEvents={allEvents}
          immichConfigured={Boolean(immichRes?.enabled || immichRes?.configured)}
          dateFormat={dateFormat}
          nameOrder={nameOrder}
          nameDisplayFormat={nameDisplayFormat as NameDisplayFormat}
          userLanguage={language || 'vi'}
          contactReminderDesc={contactReminderDesc}
        />
      </main>
    </div>
  );
}
