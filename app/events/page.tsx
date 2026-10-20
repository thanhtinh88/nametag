import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import EventsListClient, {
  type SerializedEventItem,
  type QuickEventCounts,
  type CrossCaseSuspectEntry,
} from '@/components/EventsListClient';

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sortBy?: string;
    order?: string;
    caseStatus?: string;
    status?: string;
    group?: string;
    person?: string;
    category?: string;
    q?: string;
  }>;
}) {
  const session = await auth();
  const t = await getTranslations('events');
  const tCommon = await getTranslations('common');

  if (!session?.user) {
    redirect('/login');
  }

  const { dateFormat, nameOrder, nameDisplayFormat } = await getUserDisplayPreferences(
    session.user.id
  );

  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const parsedPageSize = Number(params.pageSize);
  const pageSize = ALLOWED_PAGE_SIZES.includes(parsedPageSize)
    ? parsedPageSize
    : DEFAULT_PAGE_SIZE;

  const sortBy = params.sortBy || 'startDate';
  const order = (params.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
  const caseStatusFilter = params.caseStatus || '';
  const statusFilter = params.status || '';
  const groupFilter = params.group || '';
  const personFilter = params.person || '';
  const categoryFilter = params.category || '';
  const query = (params.q || '').trim();

  const skip = (currentPage - 1) * pageSize;

  // Build where clause
  const eventsWhere: Prisma.EventWhereInput = {
    userId: session.user.id,
    deletedAt: null,
  };

  if (query) {
    eventsWhere.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { caseCode: { contains: query, mode: 'insensitive' } },
      { crimeType: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { incidentTimeNotes: { contains: query, mode: 'insensitive' } },
      { damageAssessment: { contains: query, mode: 'insensitive' } },
      {
        people: {
          some: {
            person: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { surname: { contains: query, mode: 'insensitive' } },
                { nickname: { contains: query, mode: 'insensitive' } },
              ],
              deletedAt: null,
            },
            deletedAt: null,
          },
        },
      },
    ];
  }

  if (caseStatusFilter === 'UNRESOLVED') {
    eventsWhere.AND = [
      ...(Array.isArray(eventsWhere.AND)
        ? eventsWhere.AND
        : eventsWhere.AND
        ? [eventsWhere.AND]
        : []),
      { OR: [{ caseStatus: 'UNRESOLVED' }, { caseStatus: null }] },
    ];
  } else if (caseStatusFilter) {
    eventsWhere.caseStatus = caseStatusFilter;
  }

  if (statusFilter === 'ACTIVE_ONLY') {
    eventsWhere.status = { in: ['PLANNED', 'ONGOING'] };
  } else if (statusFilter === 'PLANNED' || statusFilter === 'ONGOING' || statusFilter === 'COMPLETED' || statusFilter === 'CANCELLED') {
    eventsWhere.status = statusFilter;
  }

  if (groupFilter === 'none') {
    eventsWhere.groups = { none: {} };
  } else if (groupFilter) {
    eventsWhere.groups = { some: { groupId: groupFilter } };
  }

  if (personFilter) {
    eventsWhere.people = { some: { personId: personFilter, deletedAt: null } };
  }

  if (categoryFilter) {
    eventsWhere.category = categoryFilter;
  }

  // Order By construction
  let orderByClause: Prisma.EventOrderByWithRelationInput[];
  if (sortBy === 'title') {
    orderByClause = [{ title: order }, { createdAt: 'desc' }];
  } else if (sortBy === 'caseCode') {
    orderByClause = [{ caseCode: order }, { createdAt: 'desc' }];
  } else if (sortBy === 'createdAt') {
    orderByClause = [{ createdAt: order }];
  } else {
    // Default: startDate
    orderByClause = [{ startDate: order }, { createdAt: 'desc' }];
  }

  // Parallel data fetching: counts, events list, dropdown options & cross-case data
  const [
    totalCount,
    totalAll,
    countUnresolved,
    countInvestigating,
    countSolved,
    countSuspended,
    countActive,
    events,
    allGroups,
    allPeople,
    categoryResults,
    crossCaseRaw,
  ] = await Promise.all([
    prisma.event.count({ where: eventsWhere }),
    prisma.event.count({ where: { userId: session.user.id, deletedAt: null } }),
    prisma.event.count({
      where: {
        userId: session.user.id,
        deletedAt: null,
        OR: [{ caseStatus: 'UNRESOLVED' }, { caseStatus: null }],
      },
    }),
    prisma.event.count({
      where: {
        userId: session.user.id,
        deletedAt: null,
        caseStatus: 'INVESTIGATING',
      },
    }),
    prisma.event.count({
      where: {
        userId: session.user.id,
        deletedAt: null,
        caseStatus: 'SOLVED',
      },
    }),
    prisma.event.count({
      where: {
        userId: session.user.id,
        deletedAt: null,
        caseStatus: 'SUSPENDED',
      },
    }),
    prisma.event.count({
      where: {
        userId: session.user.id,
        deletedAt: null,
        status: { in: ['PLANNED', 'ONGOING'] },
      },
    }),
    prisma.event.findMany({
      where: eventsWhere,
      orderBy: orderByClause,
      skip,
      take: pageSize,
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
    prisma.event.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        category: { not: null },
      },
      select: { category: true },
      distinct: ['category'],
    }),
    prisma.personEvent.findMany({
      where: {
        event: {
          userId: session.user.id,
          deletedAt: null,
          caseStatus: { not: 'SOLVED' },
        },
        deletedAt: null,
        verificationStatus: { not: 'RULED_OUT' },
      },
      select: {
        personId: true,
        involvementType: true,
        verificationStatus: true,
        event: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
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
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Compute Cross-Case Suspect Analysis
  const personCasesMap = new Map<
    string,
    {
      person: CrossCaseSuspectEntry['person'];
      cases: CrossCaseSuspectEntry['cases'];
    }
  >();

  for (const item of crossCaseRaw) {
    if (!item.person) continue;
    const existing = personCasesMap.get(item.personId);
    const caseEntry = {
      id: item.event.id,
      title: item.event.title,
      status: item.event.status,
      involvementType: item.involvementType || 'SUSPECT',
      verificationStatus: item.verificationStatus || 'HYPOTHESIS',
    };
    if (existing) {
      if (!existing.cases.some((c) => c.id === caseEntry.id)) {
        existing.cases.push(caseEntry);
      }
    } else {
      personCasesMap.set(item.personId, {
        person: item.person,
        cases: [caseEntry],
      });
    }
  }

  const crossCaseSuspects: CrossCaseSuspectEntry[] = Array.from(personCasesMap.values())
    .filter((entry) => entry.cases.length >= 2)
    .sort((a, b) => b.cases.length - a.cases.length);

  const availableCategories = categoryResults
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c))
    .sort();

  const serializedEvents: SerializedEventItem[] = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    category: ev.category,
    status: ev.status,
    caseCode: ev.caseCode,
    crimeType: ev.crimeType,
    caseStatus: ev.caseStatus,
    incidentTimeNotes: ev.incidentTimeNotes,
    damageAssessment: ev.damageAssessment,
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

  const quickCounts: QuickEventCounts = {
    totalAll,
    countUnresolved,
    countInvestigating,
    countSolved,
    countSuspended,
    countActive,
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('totalCount', { count: totalCount })}
                {totalCount !== totalAll && (
                  <span className="ml-1 text-xs text-muted-foreground/80">
                    (lọc từ tổng số {totalAll} vụ án)
                  </span>
                )}
              </p>
            </div>
            <Link href="/events/new">
              <Button variant="primary">+ {t('addNewEvent')}</Button>
            </Link>
          </div>

          <EventsListClient
            events={serializedEvents}
            totalCount={totalCount}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            sortBy={sortBy}
            order={order}
            caseStatusFilter={caseStatusFilter}
            statusFilter={statusFilter}
            groupFilter={groupFilter}
            personFilter={personFilter}
            categoryFilter={categoryFilter}
            query={query}
            quickCounts={quickCounts}
            crossCaseSuspects={crossCaseSuspects}
            categories={availableCategories}
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
