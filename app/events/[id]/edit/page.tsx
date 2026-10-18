import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';
import EventForm from '@/components/event-form/EventForm';
import { getTranslations } from 'next-intl/server';

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const t = await getTranslations('events');

  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;

  const [event, groups] = await Promise.all([
    prisma.event.findFirst({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        groups: true,
        addresses: true,
        urls: true,
        customFields: true,
      },
    }),
    prisma.group.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  if (!event) {
    notFound();
  }

  const serializedEvent = {
    id: event.id,
    title: event.title,
    category: event.category,
    status: event.status,
    startDate: event.startDate ? event.startDate.toISOString() : null,
    endDate: event.endDate ? event.endDate.toISOString() : null,
    hasTime: event.hasTime,
    description: event.description,
    caseCode: event.caseCode,
    crimeType: event.crimeType,
    caseStatus: event.caseStatus,
    incidentTimeNotes: event.incidentTimeNotes,
    damageAssessment: event.damageAssessment,
    groups: event.groups.map((g) => ({ groupId: g.groupId })),
    addresses: event.addresses.map((address) => ({
      id: address.id,
      type: address.type,
      streetLine1: address.streetLine1,
      streetLine2: address.streetLine2,
      locality: address.locality,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
      latitude: address.latitude === null ? null : Number(address.latitude),
      longitude: address.longitude === null ? null : Number(address.longitude),
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

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              href={`/events/${event.id}`}
              className="text-primary hover:underline text-sm"
            >
              ← {event.title}
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-6">
            {t('editEvent', { title: event.title })}
          </h1>

          <div className="bg-surface shadow rounded-lg p-6">
            <EventForm
              event={serializedEvent}
              groups={groups}
              mode="edit"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

