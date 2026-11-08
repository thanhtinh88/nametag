import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { apiServer } from '@/lib/backend/api-client';
import PersonForm from '@/components/PersonForm';
import Navigation from '@/components/Navigation';
import { formatGraphName } from '@/lib/nameUtils';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const t = await getTranslations('people');

  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;

  const [
    personRes,
    groupsRes,
    relationshipTypesRes,
    preferences,
    customFieldTemplatesRes,
    allPeopleRes,
    allEventsRes,
    availableGangsRes,
  ] = await Promise.all([
    apiServer.get<{ person: any }>(`/api/people/${id}`).catch(() => null),
    apiServer.get<{ groups: any[] }>('/api/groups').catch(() => ({ groups: [] })),
    apiServer.get<{ relationshipTypes: any[] }>('/api/relationship-types').catch(() => ({ relationshipTypes: [] })),
    getUserDisplayPreferences(session.user.id),
    apiServer.get<{ customFieldTemplates: any[] }>('/api/custom-field-templates').catch(() => ({ customFieldTemplates: [] })),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
    apiServer.get<{ events: any[] }>('/api/events').catch(() => ({ events: [] })),
    apiServer.get<{ gangs: any[] }>('/api/gangs').catch(() => ({ gangs: [] })),
  ]);

  const person = personRes?.person;
  if (!person) {
    notFound();
  }

  const groups = groupsRes?.groups || [];
  const relationshipTypes = relationshipTypesRes?.relationshipTypes || [];
  const customFieldTemplates = customFieldTemplatesRes?.customFieldTemplates || [];
  const allPeople = allPeopleRes?.people || [];
  const allEvents = allEventsRes?.events || [];
  const availableGangs = availableGangsRes?.gangs || [];

  const { dateFormat, nameOrder, nameDisplayFormat } = preferences;

  const initialData = {
    name: person.name,
    middleName: person.middleName || undefined,
    surname: person.surname || undefined,
    secondLastName: person.secondLastName || undefined,
    nickname: person.nickname || undefined,
    displayNameOverride: person.displayNameOverride || undefined,
    prefix: person.prefix || undefined,
    suffix: person.suffix || undefined,
    organization: person.organization || undefined,
    jobTitle: person.jobTitle || undefined,
    gender: person.gender || undefined,
    anniversary: person.anniversary ? new Date(person.anniversary).toISOString().split('T')[0] : undefined,
    lastContact: person.lastContact ? new Date(person.lastContact).toISOString().split('T')[0] : undefined,
    notes: person.notes || undefined,
    relationshipToUserId: person.relationshipToUserId || undefined,
    groupMemberships: (person.groups || []).map((g: any) => ({
      groupId: g.groupId || g.id,
    })),
    importantDates: (person.importantDates || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      type: d.type || undefined,
      date: typeof d.date === 'string' ? d.date : new Date(d.date).toISOString().split('T')[0],
      yearUnknown: d.yearUnknown || false,
      reminderEnabled: d.reminderEnabled || false,
      reminderType: d.reminderType || undefined,
      reminderInterval: d.reminderInterval || undefined,
      reminderIntervalUnit: d.reminderIntervalUnit || undefined,
      reminderLeadDays: d.reminderLeadDays ?? undefined,
    })),
    phoneNumbers: (person.phoneNumbers || []).map((p: any) => ({
      type: p.type,
      number: p.number,
    })),
    emails: (person.emails || []).map((e: any) => ({
      type: e.type,
      email: e.email,
    })),
    addresses: (person.addresses || []).map((a: any) => ({
      type: a.type,
      streetLine1: a.streetLine1 || undefined,
      streetLine2: a.streetLine2 || undefined,
      locality: a.locality || undefined,
      region: a.region || undefined,
      postalCode: a.postalCode || undefined,
      country: a.country || undefined,
    })),
    urls: (person.urls || []).map((u: any) => ({
      type: u.type,
      url: u.url,
    })),
    relationships: (person.relationshipsTo || []).map((r: any) => ({
      relatedPersonId: r.personId,
      relationshipTypeId: r.relationshipTypeId || undefined,
      relationshipType: r.relationshipType || undefined,
      relatedPerson: r.person,
    })),
    contactReminderEnabled: person.contactReminderEnabled || false,
    contactReminderInterval: person.contactReminderInterval || undefined,
    contactReminderIntervalUnit: person.contactReminderIntervalUnit || undefined,
    customFieldValues: (person.customFieldValues || []).map((cfv: any) => ({
      templateId: cfv.templateId,
      value: cfv.value,
    })),
    citizenId: person.citizenId || undefined,
    citizenIdIssueDate: person.citizenIdIssueDate ? new Date(person.citizenIdIssueDate).toISOString().split('T')[0] : undefined,
    citizenIdIssuePlace: person.citizenIdIssuePlace || undefined,
    residenceStatus: person.residenceStatus || undefined,
    managementLevel: person.managementLevel || undefined,
    heightCm: person.heightCm ?? undefined,
    weightKg: person.weightKg ?? undefined,
    bloodType: person.bloodType || undefined,
    threatLevel: person.threatLevel || undefined,
    modusOperandi: person.modusOperandi || undefined,
    riskNotes: person.riskNotes || undefined,
    gangMemberships: (person.gangMemberships || []).map((gm: any) => ({
      gangId: gm.gangId || gm.gang?.id,
      role: gm.role,
      notes: gm.notes,
      joinedAt: gm.joinedAt,
      leftAt: gm.leftAt,
    })),
    events: (person.events || []).map((pe: any) => ({
      eventId: pe.eventId || pe.event?.id,
      role: pe.role,
      involvementType: pe.involvementType,
      verificationStatus: pe.verificationStatus,
      confidence: pe.confidence,
      reasonForSuspicion: pe.reasonForSuspicion,
      alibi: pe.alibi,
      notes: pe.notes,
    })),
  };

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
              {t('editPerson', { name: formatGraphName(person, nameOrder, nameDisplayFormat as any) })}
            </h1>
            <Link
              href={`/people/${person.id}`}
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              ← {t('backToPerson')}
            </Link>
          </div>

          <PersonForm
            person={initialData as any}
            groups={(groups || []).map((g) => ({ id: g.id, name: g.name, color: g.color ?? null }))}
            customFieldTemplates={customFieldTemplates}
            relationshipTypes={(relationshipTypes || []).map((rt) => ({ id: rt.id, label: rt.label, color: rt.color ?? null }))}
            availablePeople={allPeople}
            availableEvents={allEvents}
            availableGangs={(availableGangs || []).map((g) => ({ id: g.id, name: g.name, color: g.color ?? null, turf: g.turf ?? null }))}
            userName={session.user.name || session.user.email || 'You'}
            mode="edit"
            dateFormat={dateFormat}
            hasCardDavConnection={false}
            nameOrder={nameOrder}
            nameDisplayFormat={nameDisplayFormat as any}
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
