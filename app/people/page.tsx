import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import EmptyState from '@/components/EmptyState';
import ImportSuccessToast from '@/components/ImportSuccessToast';
import { canCreateResource } from '@/lib/billing/subscription';
import { getTranslations } from 'next-intl/server';
import PeopleListClient from '@/components/PeopleListClient';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import {
  getContactRecencyFilter,
  getRecordRecencyFilter,
  type ContactRecencyPreset,
  type RecordRecencyPreset,
} from '@/lib/investigation-dates';

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sortBy?: string;
    order?: string;
    group?: string;
    relationship?: string;
    managementLevel?: string;
    threatLevel?: string;
    hasRecord?: string;
    q?: string;
    cf?: string;
    contactRecency?: string;
    recordRecency?: string;
  }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [t, tCommon, canCreate, { dateFormat, nameOrder, nameDisplayFormat }, params] = await Promise.all([
    getTranslations('people'),
    getTranslations('common'),
    canCreateResource(session.user.id, 'people'),
    getUserDisplayPreferences(session.user.id),
    searchParams,
  ]);

  const currentPage = Math.max(1, Number(params.page) || 1);
  const parsedPageSize = Number(params.pageSize);
  const pageSize = ALLOWED_PAGE_SIZES.includes(parsedPageSize) ? parsedPageSize : DEFAULT_PAGE_SIZE;

  const sortBy = params.sortBy || 'name';
  const order = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
  const groupFilter = params.group || '';
  const relationshipFilter = params.relationship || '';
  const managementFilter = params.managementLevel || '';
  const threatFilter = params.threatLevel || '';
  const hasRecordFilter = params.hasRecord || '';
  const contactRecencyFilter = params.contactRecency || '';
  const recordRecencyFilter = params.recordRecency || '';
  const query = (params.q || '').trim();

  const cfParam = params.cf || '';
  let cfFilter: { slug: string; value: string } | null = null;
  if (cfParam) {
    const idx = cfParam.indexOf(':');
    if (idx > 0) {
      cfFilter = { slug: cfParam.slice(0, idx), value: cfParam.slice(idx + 1) };
    }
  }

  const skip = (currentPage - 1) * pageSize;

  // Build where clause for people query
  const peopleWhere: Prisma.PersonWhereInput = {
    userId: session.user.id,
    deletedAt: null,
  };

  // Search keyword (q)
  if (query) {
    peopleWhere.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { surname: { contains: query, mode: 'insensitive' } },
      { nickname: { contains: query, mode: 'insensitive' } },
      { citizenId: { contains: query, mode: 'insensitive' } },
      {
        vehicles: {
          some: {
            plateNumber: { contains: query, mode: 'insensitive' },
            deletedAt: null,
          },
        },
      },
      {
        physicalMarks: {
          some: {
            description: { contains: query, mode: 'insensitive' },
            deletedAt: null,
          },
        },
      },
    ];
  }

  if (groupFilter === 'none') {
    peopleWhere.groups = { none: {} };
  } else if (groupFilter) {
    peopleWhere.groups = { some: { groupId: groupFilter } };
  }

  if (relationshipFilter === 'none') {
    peopleWhere.AND = [
      { relationshipsFrom: { none: {} } },
      { relationshipsTo: { none: {} } },
    ];
  } else if (relationshipFilter) {
    peopleWhere.OR = [
      { relationshipsFrom: { some: { relationshipTypeId: relationshipFilter, deletedAt: null } } },
      { relationshipsTo: { some: { relationshipTypeId: relationshipFilter, deletedAt: null } } },
    ];
  }

  if (managementFilter === 'monitored') {
    peopleWhere.managementLevel = { in: ['SURVEILLANCE', 'KEY_TARGET'] };
  } else if (managementFilter === 'KEY_TARGET' || managementFilter === 'SURVEILLANCE' || managementFilter === 'NORMAL') {
    peopleWhere.managementLevel = managementFilter;
  }

  if (threatFilter === 'armed') {
    peopleWhere.threatLevel = 'ARMED_DANGEROUS';
  } else if (threatFilter === 'high') {
    peopleWhere.threatLevel = { in: ['HIGH', 'ARMED_DANGEROUS'] };
  } else if (threatFilter) {
    peopleWhere.threatLevel = threatFilter;
  }

  if (hasRecordFilter === 'true') {
    peopleWhere.criminalRecords = { some: { deletedAt: null } };
  }

  if (contactRecencyFilter) {
    const filter = getContactRecencyFilter(contactRecencyFilter as ContactRecencyPreset);
    if (filter) {
      if (filter.condition === 'lt') {
        peopleWhere.AND = [
          ...(Array.isArray(peopleWhere.AND)
            ? peopleWhere.AND
            : peopleWhere.AND
            ? [peopleWhere.AND]
            : []),
          { OR: [{ lastContact: { lt: filter.threshold } }, { lastContact: null }] },
        ];
      } else {
        peopleWhere.lastContact = { gte: filter.threshold };
      }
    }
  }

  if (recordRecencyFilter) {
    const threshold = getRecordRecencyFilter(recordRecencyFilter as RecordRecencyPreset);
    if (threshold) {
      peopleWhere.criminalRecords = {
        some: {
          deletedAt: null,
          OR: [
            { verdictDate: { gte: threshold } },
            { incidentDate: { gte: threshold } },
          ],
        },
      };
    }
  }

  if (cfFilter) {
    peopleWhere.customFieldValues = {
      some: {
        value: { equals: cfFilter.value, mode: 'insensitive' },
        template: {
          slug: cfFilter.slug,
          userId: session.user.id,
          deletedAt: null,
        },
      },
    };
  }

  const isDbSortable = ['name', 'surname', 'lastContact', 'nickname'].includes(sortBy);

  let prismaOrderBy: Prisma.PersonOrderByWithRelationInput[] = [];
  if (isDbSortable) {
    if (sortBy === 'name') {
      prismaOrderBy = nameOrder === 'EASTERN'
        ? [{ surname: order }, { name: order }]
        : [{ name: order }, { surname: order }];
    } else if (sortBy === 'surname') {
      prismaOrderBy = [{ surname: order }, { name: order }];
    } else if (sortBy === 'lastContact') {
      prismaOrderBy = [{ lastContact: order }, { name: 'asc' }];
    } else if (sortBy === 'nickname') {
      prismaOrderBy = [{ nickname: order }, { name: 'asc' }];
    }
  }

  const personInclude = {
    relationshipToUser: { select: { label: true, color: true } },
    groups: {
      where: { group: { deletedAt: null } },
      include: { group: { select: { name: true, color: true } } },
    },
    relationshipsFrom: { select: { id: true } },
    relationshipsTo: { select: { id: true } },
    vehicles: {
      where: { deletedAt: null },
      select: { plateNumber: true, brandModel: true, color: true },
      take: 3,
    },
    physicalMarks: {
      where: { deletedAt: null },
      select: { type: true, location: true, description: true },
      take: 3,
    },
    criminalRecords: {
      where: { deletedAt: null },
      select: { id: true },
    },
    gangMemberships: {
      where: { gang: { deletedAt: null } },
      include: { gang: { select: { id: true, name: true, color: true } } },
    },
    events: {
      where: { deletedAt: null },
      select: { eventId: true },
    },
  };

  // Get total count for pagination, quick chips counts, and records in parallel
  const [
    totalCount,
    totalAll,
    countKeyTarget,
    countSurveillance,
    countHighRisk,
    countCriminal,
    countUnassignedGroup,
    allGroups,
    relationshipTypes,
    customFieldTemplates,
    rawDbPeople,
  ] = await Promise.all([
    prisma.person.count({ where: peopleWhere }),
    prisma.person.count({ where: { userId: session.user.id, deletedAt: null } }),
    prisma.person.count({ where: { userId: session.user.id, deletedAt: null, managementLevel: 'KEY_TARGET' } }),
    prisma.person.count({ where: { userId: session.user.id, deletedAt: null, managementLevel: 'SURVEILLANCE' } }),
    prisma.person.count({ where: { userId: session.user.id, deletedAt: null, threatLevel: { in: ['HIGH', 'ARMED_DANGEROUS'] } } }),
    prisma.person.count({ where: { userId: session.user.id, deletedAt: null, criminalRecords: { some: { deletedAt: null } } } }),
    prisma.person.count({ where: { userId: session.user.id, deletedAt: null, groups: { none: {} } } }),
    prisma.group.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
    prisma.relationshipType.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { label: 'asc' },
      select: { id: true, label: true, color: true },
    }),
    prisma.customFieldTemplate.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    }),
    isDbSortable
      ? prisma.person.findMany({
          where: peopleWhere,
          include: personInclude,
          orderBy: prismaOrderBy,
          skip,
          take: pageSize,
        })
      : null,
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  let people: Array<{
    id: string;
    name: string;
    middleName: string | null;
    surname: string | null;
    secondLastName: string | null;
    nickname: string | null;
    displayNameOverride?: string | null;
    photo: string | null;
    lastContact: Date | null;
    relationshipToUser: { label: string; color: string | null } | null;
    groups: Array<{ groupId: string; group: { name: string; color: string | null } }>;
    relationshipsFrom: Array<{ id: string }>;
    relationshipsTo: Array<{ id: string }>;
    managementLevel?: string | null;
    threatLevel?: string | null;
    citizenId?: string | null;
    vehicles?: Array<{ plateNumber: string; brandModel: string | null; color: string | null }>;
    physicalMarks?: Array<{ type: string; location: string; description: string | null }>;
    criminalRecordsCount?: number;
    gangs?: Array<{ id: string; name: string; color: string | null }>;
    casesCount?: number;
  }> = [];

  if (isDbSortable && rawDbPeople) {
    people = rawDbPeople.map((p) => ({
      ...p,
      vehicles: p.vehicles,
      physicalMarks: p.physicalMarks,
      criminalRecordsCount: p.criminalRecords.length,
      gangs: p.gangMemberships.map((gm) => gm.gang),
      casesCount: p.events.length,
    }));
  } else {
    // In-memory sort fallback for relations count or groups
    const allPeople = await prisma.person.findMany({
      where: peopleWhere,
      include: personInclude,
    });

    const sortedPeople = [...allPeople].sort((a, b) => {
      let primaryComparison = 0;
      switch (sortBy) {
        case 'relationship': {
          const aCount = a.relationshipsFrom.length + a.relationshipsTo.length;
          const bCount = b.relationshipsFrom.length + b.relationshipsTo.length;
          primaryComparison = bCount - aCount;
          break;
        }
        case 'group': {
          const aGroup = a.groups[0]?.group.name || 'zzz';
          const bGroup = b.groups[0]?.group.name || 'zzz';
          primaryComparison = aGroup.localeCompare(bGroup);
          break;
        }
        default: {
          const aFull = `${a.name} ${a.surname || ''}`.trim();
          const bFull = `${b.name} ${b.surname || ''}`.trim();
          primaryComparison = aFull.localeCompare(bFull);
        }
      }

      const ordered = order === 'desc' ? -primaryComparison : primaryComparison;
      if (ordered !== 0) return ordered;
      const aFallback = `${a.name} ${a.surname || ''}`.trim();
      const bFallback = `${b.name} ${b.surname || ''}`.trim();
      return aFallback.localeCompare(bFallback);
    });

    people = sortedPeople.slice(skip, skip + pageSize).map((p) => ({
      ...p,
      vehicles: p.vehicles,
      physicalMarks: p.physicalMarks,
      criminalRecordsCount: p.criminalRecords.length,
      gangs: p.gangMemberships.map((gm) => gm.gang),
      casesCount: p.events.length,
    }));
  }

  const quickCounts = {
    totalAll,
    countKeyTarget,
    countSurveillance,
    countHighRisk,
    countCriminal,
    countUnassignedGroup,
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
      <Suspense>
        <ImportSuccessToast />
      </Suspense>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-page-enter">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold text-foreground">
              {t('title')}
            </h1>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <Button href="/people/duplicates" variant="secondary" className="flex-1 sm:flex-initial">
                {t('duplicates.findDuplicates')}
              </Button>
              {canCreate.allowed ? (
                <Button href="/people/new" className="flex-1 sm:flex-initial">
                  {t('addPerson')}
                </Button>
              ) : (
                <div className="relative group flex-1 sm:flex-initial">
                  <span className="px-4 py-2 min-h-11 sm:min-h-0 bg-muted/50 text-white rounded-lg font-semibold cursor-not-allowed inline-flex items-center justify-center w-full">
                    {t('addPerson')}
                  </span>
                  <div className="invisible group-hover:visible absolute right-0 top-full mt-2 w-64 p-3 bg-surface-elevated text-white text-sm rounded-lg shadow-lg z-10">
                    <p className="mb-2">{t('limitReached', { limit: canCreate.limit })}</p>
                    <Link href="/settings/billing" className="text-primary hover:text-primary-dark underline">
                      {t('upgradePlan')}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {totalCount === 0 && !groupFilter && !relationshipFilter && !cfFilter && !managementFilter && !threatFilter && !hasRecordFilter && !query ? (
            <div className="bg-surface rounded-lg border border-border">
              <EmptyState
                icon={
                  <svg className="w-12 h-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                title={t('noPeopleYet')}
                description={t('noPeopleDescription')}
                actionLabel={t('addFirstPerson')}
                actionHref="/people/new"
              />
            </div>
          ) : (
            <PeopleListClient
              people={people}
              totalCount={totalCount}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              sortBy={sortBy}
              order={order}
              groupFilter={groupFilter}
              relationshipFilter={relationshipFilter}
              managementFilter={managementFilter}
              threatFilter={threatFilter}
              hasRecordFilter={hasRecordFilter}
              contactRecencyFilter={contactRecencyFilter}
              recordRecencyFilter={recordRecencyFilter}
              query={query}
              cfFilter={cfFilter}
              quickCounts={quickCounts}
              dateFormat={dateFormat}
              availableGroups={allGroups}
              relationshipTypes={relationshipTypes}
              customFieldTemplates={customFieldTemplates}
              nameOrder={nameOrder}
              nameDisplayFormat={nameDisplayFormat}
              translations={{
                fullName: t('fullName'),
                surname: t('surname'),
                nickname: t('nickname'),
                relationshipToUser: t('relationships'),
                groups: t('groups'),
                lastContact: t('lastContact'),
                actions: t('actions'),
                indirect: t('indirect'),
                orphanWarning: t('orphanWarning'),
                showing: t('showing', {
                  start: totalCount === 0 ? 0 : skip + 1,
                  end: Math.min(skip + pageSize, totalCount),
                  total: totalCount,
                }),
                page: t('page'),
                of: t('of'),
                pageSize: t('pageSize'),
                perPage: t('perPage'),
                jumpToPage: t('jumpToPage'),
                jump: t('jump'),
                changeManagementLevel: t('changeManagementLevel'),
              }}
              commonTranslations={{
                name: tCommon('name'),
                edit: tCommon('edit'),
                view: tCommon('view'),
                previous: tCommon('previous'),
                next: tCommon('next'),
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
