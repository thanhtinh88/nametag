import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { apiServer } from '@/lib/backend/api-client';
import Navigation from '@/components/Navigation';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import EventDetailsClient from '@/components/EventDetailsClient';
import type { EventDto } from '@/types/api/event';

export default async function EventDetailPage({
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
    getTranslations('events'),
  ]);

  const [eventRes, peopleRes, eventsRes, preferences, immichRes] = await Promise.all([
    apiServer.get<{ event: EventDto }>(`/api/events/${id}`).catch(() => null),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
    apiServer.get<{ events: EventDto[] }>('/api/events').catch(() => ({ events: [] })),
    getUserDisplayPreferences(session.user.id),
    apiServer.get<{ configured?: boolean; enabled?: boolean }>('/api/immich/connection').catch(() => null),
  ]);

  const event = eventRes?.event;
  if (!event) {
    notFound();
  }

  const availablePeople = peopleRes?.people || [];
  const availableEvents = (eventsRes?.events || []).map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    status: e.status,
    startDate: e.startDate,
  }));

  const { dateFormat, nameOrder, nameDisplayFormat } = preferences;

  const serializedEvent = {
    id: event.id,
    title: event.title,
    category: event.category,
    status: event.status,
    caseCode: event.caseCode,
    crimeType: event.crimeType,
    caseStatus: event.caseStatus,
    incidentTimeNotes: event.incidentTimeNotes,
    damageAssessment: event.damageAssessment,
    startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
    endDate: event.endDate ? new Date(event.endDate).toISOString() : null,
    hasTime: event.hasTime,
    description: event.description,
    immichAlbumId: event.immichAlbumId,
    groups: (event.groups || []).map((g) => ({
      ...g,
      group: g.group || { id: g.groupId, name: '', color: null },
    })),
    addresses: (event.addresses || []).map((a) => ({
      id: a.id,
      type: a.type,
      streetLine1: a.streetLine1,
      streetLine2: a.streetLine2,
      locality: a.locality,
      region: a.region,
      postalCode: a.postalCode,
      country: a.country,
      latitude: a.latitude === null || a.latitude === undefined ? null : Number(a.latitude),
      longitude: a.longitude === null || a.longitude === undefined ? null : Number(a.longitude),
      geocodeStatus: a.geocodeStatus,
    })),
    urls: (event.urls || []).map((u) => ({
      id: u.id,
      type: u.type,
      url: u.url,
    })),
    customFields: (event.customFields || []).map((cf) => ({
      id: cf.id,
      key: cf.key,
      value: cf.value,
    })),
    people: (event.people || []).map((p) => ({
      id: p.id,
      personId: p.personId,
      role: p.role,
      involvementType: p.involvementType,
      verificationStatus: p.verificationStatus,
      confidence: p.confidence,
      reasonForSuspicion: p.reasonForSuspicion,
      alibi: p.alibi,
      notes: p.notes,
      person: p.person,
    })),
    relationshipsFrom: [],
    journalEntries: (event.journalEntries || []).map((j: any) => ({
      ...j,
      journalEntry: j.journalEntry || {
        id: j.journalEntryId,
        title: '',
        date: '',
        hasTime: false,
        body: '',
        people: [],
      },
    })),
    mapCounts: {
      markers: 0,
      routes: 0,
      drawings: 0,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/events"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-page-enter">
        <div className="px-4 py-4 sm:px-0 space-y-4">
          <div>
            <Link
              href="/events"
              className="text-primary hover:underline text-sm font-semibold inline-flex items-center gap-1"
            >
              ← {t('backToEvents')}
            </Link>
          </div>

          <EventDetailsClient
            event={serializedEvent as any}
            availablePeople={availablePeople}
            availableEvents={availableEvents as any}
            immichConfigured={Boolean(immichRes?.enabled || immichRes?.configured)}
            dateFormat={dateFormat}
            nameOrder={nameOrder}
            nameDisplayFormat={nameDisplayFormat}
          />
        </div>
      </main>
    </div>
  );
}
