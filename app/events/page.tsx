import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { apiServer } from '@/lib/backend/api-client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import EventsListClient, {
  type SerializedEventItem,
  type QuickEventCounts,
  type CrossCaseSuspectEntry,
} from '@/components/EventsListClient';
import type { EventDto } from '@/types/api/event';
import type { Group } from '@/types/api/group';

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
    fromDate?: string;
    toDate?: string;
    datePreset?: string;
    dateField?: string;
  }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [t, _tCommon, { dateFormat, nameOrder, nameDisplayFormat }, params] = await Promise.all([
    getTranslations('events'),
    getTranslations('common'),
    getUserDisplayPreferences(session.user.id),
    searchParams,
  ]);
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
  const fromDate = params.fromDate || '';
  const toDate = params.toDate || '';
  const datePreset = params.datePreset || '';
  const dateField = params.dateField === 'createdAt' ? 'createdAt' : 'startDate';

  const [eventsRes, groupsRes, peopleRes] = await Promise.all([
    apiServer.get<{ events: EventDto[] }>('/api/events').catch(() => ({ events: [] })),
    apiServer.get<{ groups: Group[] }>('/api/groups').catch(() => ({ groups: [] })),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
  ]);

  const allEvents = eventsRes?.events || [];
  const allGroups = groupsRes?.groups || [];
  const allPeople = peopleRes?.people || [];

  // Filter in memory for rich multi-facet search
  let filtered = allEvents;

  if (query) {
    const qLower = query.toLowerCase();
    filtered = filtered.filter((ev) => {
      if (ev.title.toLowerCase().includes(qLower)) return true;
      if (ev.caseCode && ev.caseCode.toLowerCase().includes(qLower)) return true;
      if (ev.crimeType && ev.crimeType.toLowerCase().includes(qLower)) return true;
      if (ev.description && ev.description.toLowerCase().includes(qLower)) return true;
      if (ev.incidentTimeNotes && ev.incidentTimeNotes.toLowerCase().includes(qLower)) return true;
      if (ev.damageAssessment && ev.damageAssessment.toLowerCase().includes(qLower)) return true;
      if (
        ev.people &&
        ev.people.some((p) => {
          const person = p.person;
          if (!person) return false;
          return (
            person.name.toLowerCase().includes(qLower) ||
            (person.surname && person.surname.toLowerCase().includes(qLower)) ||
            (person.nickname && person.nickname.toLowerCase().includes(qLower))
          );
        })
      ) {
        return true;
      }
      return false;
    });
  }

  if (caseStatusFilter === 'UNRESOLVED') {
    filtered = filtered.filter((ev) => !ev.caseStatus || ev.caseStatus === 'UNRESOLVED');
  } else if (caseStatusFilter) {
    filtered = filtered.filter((ev) => ev.caseStatus === caseStatusFilter);
  }

  if (statusFilter === 'ACTIVE_ONLY') {
    filtered = filtered.filter((ev) => ev.status === 'PLANNED' || ev.status === 'ONGOING');
  } else if (statusFilter) {
    filtered = filtered.filter((ev) => ev.status === statusFilter);
  }

  if (groupFilter === 'none') {
    filtered = filtered.filter((ev) => !ev.groups || ev.groups.length === 0);
  } else if (groupFilter) {
    filtered = filtered.filter((ev) => (ev.groups || []).some((g) => g.groupId === groupFilter));
  }

  if (personFilter) {
    filtered = filtered.filter((ev) => (ev.people || []).some((p) => p.personId === personFilter));
  }

  if (categoryFilter) {
    filtered = filtered.filter((ev) => ev.category === categoryFilter);
  }

  if (fromDate || toDate) {
    filtered = filtered.filter((ev) => {
      const dStr = dateField === 'createdAt' ? ev.createdAt : ev.startDate;
      if (!dStr) return false;
      const d = new Date(dStr);
      if (fromDate && d < new Date(`${fromDate}T00:00:00.000Z`)) return false;
      if (toDate && d > new Date(`${toDate}T23:59:59.999Z`)) return false;
      return true;
    });
  }

  // Sort
  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else if (sortBy === 'caseCode') {
      cmp = (a.caseCode || '').localeCompare(b.caseCode || '');
    } else if (sortBy === 'createdAt') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      const da = a.startDate ? new Date(a.startDate).getTime() : 0;
      const db = b.startDate ? new Date(b.startDate).getTime() : 0;
      cmp = da - db;
    }
    return order === 'asc' ? cmp : -cmp;
  });

  const totalCount = filtered.length;
  const totalAll = allEvents.length;
  const countUnresolved = allEvents.filter((e) => !e.caseStatus || e.caseStatus === 'UNRESOLVED').length;
  const countInvestigating = allEvents.filter((e) => e.caseStatus === 'INVESTIGATING').length;
  const countSolved = allEvents.filter((e) => e.caseStatus === 'SOLVED').length;
  const countSuspended = allEvents.filter((e) => e.caseStatus === 'SUSPENDED').length;
  const countActive = allEvents.filter((e) => e.status === 'PLANNED' || e.status === 'ONGOING').length;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const skip = (currentPage - 1) * pageSize;
  const pagedEvents = filtered.slice(skip, skip + pageSize);

  // Cross-case suspects analysis
  const personCasesMap = new Map<
    string,
    {
      person: CrossCaseSuspectEntry['person'];
      cases: CrossCaseSuspectEntry['cases'];
    }
  >();

  for (const ev of allEvents) {
    if (ev.caseStatus === 'SOLVED') continue;
    for (const p of ev.people || []) {
      if (!p.person || p.verificationStatus === 'RULED_OUT') continue;
      const caseEntry = {
        id: ev.id,
        title: ev.title,
        status: ev.status,
        involvementType: p.involvementType || 'SUSPECT',
        verificationStatus: p.verificationStatus || 'HYPOTHESIS',
      };
      const existing = personCasesMap.get(p.personId);
      if (existing) {
        if (!existing.cases.some((c) => c.id === caseEntry.id)) {
          existing.cases.push(caseEntry);
        }
      } else {
        personCasesMap.set(p.personId, {
          person: p.person as any,
          cases: [caseEntry],
        });
      }
    }
  }

  const crossCaseSuspects: CrossCaseSuspectEntry[] = Array.from(personCasesMap.values())
    .filter((entry) => entry.cases.length >= 2)
    .sort((a, b) => b.cases.length - a.cases.length);

  const availableCategories = Array.from(
    new Set(allEvents.map((e) => e.category).filter((c): c is string => Boolean(c)))
  ).sort();

  const serializedEvents: SerializedEventItem[] = pagedEvents.map((ev) => ({
    id: ev.id,
    title: ev.title,
    category: ev.category ?? null,
    status: ev.status,
    caseCode: ev.caseCode ?? null,
    crimeType: ev.crimeType ?? null,
    caseStatus: ev.caseStatus ?? null,
    incidentTimeNotes: ev.incidentTimeNotes ?? null,
    damageAssessment: ev.damageAssessment ?? null,
    startDate: ev.startDate ? new Date(ev.startDate).toISOString() : null,
    endDate: ev.endDate ? new Date(ev.endDate).toISOString() : null,
    hasTime: ev.hasTime,
    description: ev.description ?? null,
    groups: (ev.groups || []).map((g) => ({
      groupId: g.groupId,
      group: {
        id: g.group?.id || g.groupId,
        name: g.group?.name || '',
        color: g.group?.color ?? null,
      },
    })),
    addresses: (ev.addresses || []).map((a) => ({
      id: a.id,
      type: a.type,
      locality: a.locality ?? null,
      country: a.country ?? null,
      latitude: a.latitude === null || a.latitude === undefined ? null : Number(a.latitude),
      longitude: a.longitude === null || a.longitude === undefined ? null : Number(a.longitude),
      geocodeStatus: a.geocodeStatus ?? null,
    })),
    people: (ev.people || []).map((p) => ({
      id: p.id,
      personId: p.personId,
      role: p.role ?? null,
      involvementType: p.involvementType,
      verificationStatus: p.verificationStatus,
      person: p.person as any,
    })),
    relatedEventsCount: 0,
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-page-enter">
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
            fromDateFilter={fromDate}
            toDateFilter={toDate}
            datePresetFilter={datePreset}
            dateFieldFilter={dateField}
            quickCounts={quickCounts}
            crossCaseSuspects={crossCaseSuspects}
            categories={availableCategories}
            groups={(allGroups || []).map((g) => ({ id: g.id, name: g.name, color: g.color ?? null }))}
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
