import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import EventDetailsClient from '@/components/EventDetailsClient';

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

  const [event, availablePeople, availableEvents, preferences, immichConnection] = await Promise.all([
    prisma.event.findFirst({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        groups: {
          where: { group: { deletedAt: null } },
          include: { group: true },
        },
        addresses: true,
        urls: true,
        customFields: true,
        people: {
          where: { deletedAt: null, person: { deletedAt: null } },
          include: {
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
                nickname: true,
                displayNameOverride: true,
                photo: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        relationshipsFrom: {
          where: { deletedAt: null, toEvent: { deletedAt: null } },
          include: {
            toEvent: {
              select: {
                id: true,
                title: true,
                category: true,
                status: true,
                startDate: true,
              },
            },
          },
        },
        journalEntries: {
          where: { journalEntry: { deletedAt: null } },
          include: {
            journalEntry: {
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
              },
            },
          },
          orderBy: { journalEntry: { date: 'desc' } },
          take: 20,
        },
        _count: {
          select: {
            mapMarkers: true,
            mapRoutes: true,
            mapDrawings: true,
          },
        },
      },
    }),
    prisma.person.findMany({
      where: { userId: session.user.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        surname: true,
        nickname: true,
        displayNameOverride: true,
        photo: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.event.findMany({
      where: { userId: session.user.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        startDate: true,
      },
      orderBy: { title: 'asc' },
    }),
    getUserDisplayPreferences(session.user.id),
    prisma.immichConnection.findUnique({
      where: { userId: session.user.id },
      select: { enabled: true },
    }),
  ]);

  if (!event) {
    notFound();
  }

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
    startDate: event.startDate ? event.startDate.toISOString() : null,
    endDate: event.endDate ? event.endDate.toISOString() : null,
    hasTime: event.hasTime,
    description: event.description,
    immichAlbumId: event.immichAlbumId,
    groups: event.groups,
    addresses: event.addresses.map((a) => ({
      id: a.id,
      type: a.type,
      streetLine1: a.streetLine1,
      streetLine2: a.streetLine2,
      locality: a.locality,
      region: a.region,
      postalCode: a.postalCode,
      country: a.country,
      latitude: a.latitude === null ? null : Number(a.latitude),
      longitude: a.longitude === null ? null : Number(a.longitude),
      geocodeStatus: a.geocodeStatus,
    })),
    urls: event.urls.map((u) => ({
      id: u.id,
      type: u.type,
      url: u.url,
    })),
    customFields: event.customFields.map((cf) => ({
      id: cf.id,
      key: cf.key,
      value: cf.value,
    })),
    people: event.people.map((p) => ({
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
    relationshipsFrom: event.relationshipsFrom,
    journalEntries: event.journalEntries,
    mapCounts: {
      markers: event._count.mapMarkers,
      routes: event._count.mapRoutes,
      drawings: event._count.mapDrawings,
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
            event={serializedEvent}
            availablePeople={availablePeople}
            availableEvents={availableEvents}
            immichConfigured={Boolean(immichConnection?.enabled)}
            dateFormat={dateFormat}
            nameOrder={nameOrder}
            nameDisplayFormat={nameDisplayFormat}
          />
        </div>
      </main>
    </div>
  );
}
