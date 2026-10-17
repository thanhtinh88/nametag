import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import EventsListClient, { type SerializedEventItem } from '@/components/EventsListClient';

export default async function EventsPage() {
  const session = await auth();
  const t = await getTranslations('events');

  if (!session?.user) {
    redirect('/login');
  }

  const { dateFormat, nameOrder, nameDisplayFormat } = await getUserDisplayPreferences(
    session.user.id
  );

  const [events, allGroups, allPeople] = await Promise.all([
    prisma.event.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        groups: {
          where: { group: { deletedAt: null } },
          include: { group: { select: { id: true, name: true, color: true } } },
        },
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
        },
        addresses: {
          select: {
            id: true,
            type: true,
            locality: true,
            country: true,
            latitude: true,
            longitude: true,
            geocodeStatus: true,
          },
        },
        relationshipsFrom: {
          where: { deletedAt: null, toEvent: { deletedAt: null } },
          select: { id: true },
        },
      },
    }),
    prisma.group.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
    prisma.person.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        surname: true,
        nickname: true,
        displayNameOverride: true,
      },
    }),
  ]);

  const serializedEvents: SerializedEventItem[] = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    category: ev.category,
    status: ev.status,
    startDate: ev.startDate ? ev.startDate.toISOString() : null,
    endDate: ev.endDate ? ev.endDate.toISOString() : null,
    hasTime: ev.hasTime,
    description: ev.description,
    groups: ev.groups,
    addresses: ev.addresses.map((a) => ({
      id: a.id,
      type: a.type,
      locality: a.locality,
      country: a.country,
      latitude: a.latitude === null ? null : Number(a.latitude),
      longitude: a.longitude === null ? null : Number(a.longitude),
      geocodeStatus: a.geocodeStatus,
    })),
    people: ev.people.map((p) => ({
      id: p.id,
      personId: p.personId,
      role: p.role,
      involvementType: p.involvementType,
      verificationStatus: p.verificationStatus,
      person: p.person,
    })),
    relatedEventsCount: ev.relationshipsFrom.length,
  }));

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('totalCount', { count: serializedEvents.length })}
              </p>
            </div>
            <Link href="/events/new">
              <Button variant="primary">+ {t('addNewEvent')}</Button>
            </Link>
          </div>

          <EventsListClient
            events={serializedEvents}
            groups={allGroups}
            people={allPeople}
            dateFormat={dateFormat}
            nameOrder={nameOrder}
            nameDisplayFormat={nameDisplayFormat}
          />
        </div>
      </main>
    </div>
  );
}

