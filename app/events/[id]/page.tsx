import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import { formatDate } from '@/lib/date-format';
import { formatGraphName } from '@/lib/nameUtils';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import EventPeopleManager from '@/components/EventPeopleManager';
import EventRelationshipManager from '@/components/EventRelationshipManager';
import EventDeleteButton from '@/components/EventDeleteButton';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const t = await getTranslations('events');
  const tCommon = await getTranslations('common');

  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;

  const [event, availablePeople, availableEvents, preferences] = await Promise.all([
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
          take: 5,
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
  ]);

  if (!event) {
    notFound();
  }

  const { dateFormat, nameOrder, nameDisplayFormat } = preferences;

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'ONGOING':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }
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

      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div>
            <Link
              href="/events"
              className="text-primary hover:underline text-sm"
            >
              {t('backToEvents')}
            </Link>
          </div>

          {/* Header Card */}
          <div className="bg-surface shadow rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-foreground">
                    {event.title}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(
                      event.status
                    )}`}
                  >
                    {t(`status.${event.status}`)}
                  </span>
                </div>

                {event.category && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.category}
                  </p>
                )}

                {(event.startDate || event.endDate) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    📅{' '}
                    {event.startDate
                      ? formatDate(new Date(event.startDate), dateFormat)
                      : ''}
                    {event.endDate
                      ? ` - ${formatDate(new Date(event.endDate), dateFormat)}`
                      : ''}
                  </p>
                )}

                {event.groups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {event.groups.map(({ group }) => (
                      <span
                        key={group.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${group.color || '#3B82F6'}20`,
                          color: group.color || '#3B82F6',
                        }}
                      >
                        {group.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/events/${event.id}/edit`}>
                  <Button variant="secondary">{tCommon('edit')}</Button>
                </Link>
                <EventDeleteButton
                  eventId={event.id}
                  eventTitle={event.title}
                />
              </div>
            </div>

            {event.description && (
              <div className="mt-6 pt-6 border-t border-border">
                <h2 className="text-sm font-medium text-muted-foreground mb-2">
                  {t('form.description')}
                </h2>
                <MarkdownRenderer content={event.description} />
              </div>
            )}

            {/* Addresses */}
            {event.addresses.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {t('form.addresses')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.addresses.map((address) => (
                    <div
                      key={address.id}
                      className="p-3 rounded-md border border-border bg-muted/20"
                    >
                      {address.type && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                          {address.type}
                        </span>
                      )}
                      {address.streetLine1 && (
                        <div className="text-sm text-foreground">
                          {address.streetLine1}
                        </div>
                      )}
                      {address.streetLine2 && (
                        <div className="text-sm text-foreground">
                          {address.streetLine2}
                        </div>
                      )}
                      <div className="text-sm text-foreground">
                        {[address.locality, address.region, address.postalCode]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                      {address.country && (
                        <div className="text-sm text-foreground">
                          {address.country}
                        </div>
                      )}
                      {address.latitude !== null && address.longitude !== null && (
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground font-mono">
                          <span>
                            📍 {Number(address.latitude).toFixed(6)},{' '}
                            {Number(address.longitude).toFixed(6)}
                          </span>
                          <Link
                            href={`/map?focus=evaddr_${address.id}`}
                            className="text-primary hover:underline font-sans"
                          >
                            Map →
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* URLs */}
            {event.urls.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h2 className="text-sm font-medium text-muted-foreground mb-2">
                  {t('form.urls')}
                </h2>
                <div className="space-y-1">
                  {event.urls.map((u) => (
                    <div key={u.id} className="text-sm">
                      {u.type && (
                        <span className="text-muted-foreground mr-2 capitalize">
                          {u.type}:
                        </span>
                      )}
                      <a
                        href={
                          u.url.startsWith('http') ? u.url : `https://${u.url}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {u.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {event.customFields.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.customFields.map((cf) => (
                    <div key={cf.id}>
                      <span className="text-xs text-muted-foreground block">
                        {cf.key}
                      </span>
                      <span className="text-sm text-foreground font-medium">
                        {cf.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Participants / Suspects Manager */}
          <EventPeopleManager
            eventId={event.id}
            participants={event.people}
            availablePeople={availablePeople}
            nameOrder={nameOrder}
            nameDisplayFormat={nameDisplayFormat}
          />

          {/* Case Investigation Log (Journal) */}
          <div className="bg-surface shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Investigation Log (Nhật ký điều tra vụ án)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Chronological field notes, witness interviews, and evidence updates linked to this case
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/journal?event=${event.id}`}
                  className="text-xs text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/10 transition-colors"
                >
                  View All ({event.journalEntries.length})
                </Link>
                <Link
                  href={`/journal/new?event=${event.id}`}
                  className="text-xs font-medium bg-primary text-on-primary rounded-md px-3 py-1.5 hover:opacity-90 transition-opacity"
                >
                  + Add Log Entry
                </Link>
              </div>
            </div>

            {event.journalEntries.length > 0 ? (
              <div className="space-y-3">
                {event.journalEntries.map(({ journalEntry }) => (
                  <Link
                    key={journalEntry.id}
                    href={`/journal/${journalEntry.id}`}
                    className="block p-3 rounded-lg border border-border bg-muted/10 hover:border-primary/40 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {journalEntry.title}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(new Date(journalEntry.date), dateFormat)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {journalEntry.body.replace(/[#*_`~>-]/g, '').trim()}
                    </p>
                    {journalEntry.people.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {journalEntry.people.map(({ person }) => (
                          <span
                            key={person.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                          >
                            {formatGraphName(person, nameOrder, nameDisplayFormat)}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No investigation log entries recorded for this case yet.
              </p>
            )}
          </div>

          {/* Related Events Manager */}
          <EventRelationshipManager
            eventId={event.id}
            relationships={event.relationshipsFrom}
            availableEvents={availableEvents}
          />
        </div>
      </main>
    </div>
  );
}

