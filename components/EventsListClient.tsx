'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatDate, type DateFormat } from '@/lib/date-format';
import { formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';
import { getCountryName } from '@/lib/countries';
import PersonAvatar from './PersonPhoto';

export interface SerializedEventItem {
  id: string;
  title: string;
  category: string | null;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  startDate: string | null;
  endDate: string | null;
  hasTime: boolean;
  description: string | null;
  groups: Array<{
    groupId: string;
    group: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
  addresses: Array<{
    id: string;
    type: string;
    locality: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    geocodeStatus: string | null;
  }>;
  people: Array<{
    id: string;
    personId: string;
    role: string | null;
    involvementType?: string;
    verificationStatus?: string;
    person: {
      id: string;
      name: string;
      surname: string | null;
      nickname: string | null;
      displayNameOverride: string | null;
      photo: string | null;
    };
  }>;
  relatedEventsCount: number;
}

interface EventsListClientProps {
  events: SerializedEventItem[];
  groups: Array<{ id: string; name: string; color: string | null }>;
  people: Array<{
    id: string;
    name: string;
    surname: string | null;
    nickname: string | null;
    displayNameOverride: string | null;
  }>;
  dateFormat: DateFormat;
  nameOrder?: 'WESTERN' | 'EASTERN';
  nameDisplayFormat?: NameDisplayFormat;
}

const STATUS_BADGE_CLASSES: Record<SerializedEventItem['status'], string> = {
  PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ONGOING: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export default function EventsListClient({
  events,
  groups,
  people,
  dateFormat,
  nameOrder,
  nameDisplayFormat,
}: EventsListClientProps) {
  const t = useTranslations('events');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [personFilter, setPersonFilter] = useState<string>('ALL');

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      if (ev.category) set.add(ev.category);
    }
    return Array.from(set).sort();
  }, [events]);

  // Statistics & Cross-Case Suspect Analysis
  const { stats, crossCaseSuspects } = useMemo(() => {
    const totalEvents = events.length;
    const plannedCount = events.filter((e) => e.status === 'PLANNED').length;
    const ongoingCount = events.filter((e) => e.status === 'ONGOING').length;
    const uniquePeopleIds = new Set<string>();
    let topEvent: { title: string; count: number; id: string } | null = null;

    const personCasesMap = new Map<
      string,
      {
        person: SerializedEventItem['people'][number]['person'];
        cases: Array<{
          id: string;
          title: string;
          status: SerializedEventItem['status'];
          involvementType: string;
          verificationStatus: string;
        }>;
      }
    >();

    for (const ev of events) {
      const activeParticipants = ev.people.filter(
        (p) => p.verificationStatus !== 'RULED_OUT'
      );
      for (const p of activeParticipants) {
        uniquePeopleIds.add(p.personId);
        const existing = personCasesMap.get(p.personId);
        const caseInfo = {
          id: ev.id,
          title: ev.title,
          status: ev.status,
          involvementType: p.involvementType || 'SUSPECT',
          verificationStatus: p.verificationStatus || 'HYPOTHESIS',
        };
        if (existing) {
          existing.cases.push(caseInfo);
        } else {
          personCasesMap.set(p.personId, {
            person: p.person,
            cases: [caseInfo],
          });
        }
      }
      if (!topEvent || activeParticipants.length > topEvent.count) {
        if (activeParticipants.length > 0) {
          topEvent = {
            id: ev.id,
            title: ev.title,
            count: activeParticipants.length,
          };
        }
      }
    }

    const crossCaseList = Array.from(personCasesMap.values())
      .filter((entry) => entry.cases.length >= 2)
      .sort((a, b) => b.cases.length - a.cases.length);

    return {
      stats: {
        totalEvents,
        activeCount: plannedCount + ongoingCount,
        uniquePeopleCount: uniquePeopleIds.size,
        topEvent,
      },
      crossCaseSuspects: crossCaseList,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (statusFilter === 'ACTIVE_ONLY') {
        if (ev.status !== 'PLANNED' && ev.status !== 'ONGOING') return false;
      } else if (statusFilter !== 'ALL' && ev.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL' && ev.category !== categoryFilter) return false;
      if (groupFilter !== 'ALL' && !ev.groups.some((g) => g.groupId === groupFilter)) {
        return false;
      }
      if (personFilter !== 'ALL' && !ev.people.some((p) => p.personId === personFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = ev.title.toLowerCase().includes(q);
        const catMatch = ev.category?.toLowerCase().includes(q) ?? false;
        const descMatch = ev.description?.toLowerCase().includes(q) ?? false;
        const personMatch = ev.people.some((p) =>
          formatGraphName(p.person, nameOrder, nameDisplayFormat).toLowerCase().includes(q)
        );
        if (!titleMatch && !catMatch && !descMatch && !personMatch) return false;
      }
      return true;
    });
  }, [events, statusFilter, categoryFilter, groupFilter, personFilter, searchQuery, nameOrder, nameDisplayFormat]);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">
            {t('statsTotalEvents')}
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">{stats.totalEvents}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">
            {t('statsActiveEvents')}
          </div>
          <div className="mt-1 text-2xl font-bold text-primary">{stats.activeCount}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">
            {t('statsInvolvedPeople')}
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">{stats.uniquePeopleCount}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">
            {t('statsTopEvent')}
          </div>
          {stats.topEvent ? (
            <Link
              href={`/events/${stats.topEvent.id}`}
              className="mt-1 block text-base font-semibold text-primary hover:underline truncate"
              title={stats.topEvent.title}
            >
              {stats.topEvent.title} ({stats.topEvent.count})
            </Link>
          ) : (
            <div className="mt-1 text-base text-muted">—</div>
          )}
        </div>
      </div>

      {/* Cross-Case Suspect Analysis Panel */}
      {crossCaseSuspects.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                {t('crossCaseAnalysisTitle', { count: crossCaseSuspects.length })}
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {t('crossCaseAnalysisDesc')}
              </p>
            </div>
            {personFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setPersonFilter('ALL')}
                className="text-xs text-primary hover:underline"
              >
                {t('clearPersonFilter')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {crossCaseSuspects.map(({ person, cases }) => {
              const displayName = formatGraphName(person, nameOrder, nameDisplayFormat);
              const isSelected = personFilter === person.id;
              return (
                <div
                  key={person.id}
                  onClick={() =>
                    setPersonFilter(isSelected ? 'ALL' : person.id)
                  }
                  className={`cursor-pointer p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-surface border-border hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PersonAvatar
                        personId={person.id}
                        name={displayName}
                        photo={person.photo}
                        size={32}
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/people/${person.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-semibold text-primary hover:underline truncate block"
                        >
                          {displayName}
                        </Link>
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          {t('casesCountBadge', { count: cases.length })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {cases.map((c) => (
                      <Link
                        key={c.id}
                        href={`/events/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-surface-elevated border border-border text-foreground hover:border-primary"
                      >
                        <span>📁 {c.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="px-3 py-2 border border-border rounded-lg bg-surface-elevated text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-surface-elevated text-foreground text-sm"
            aria-label={t('statusLabel')}
          >
            <option value="ALL">{t('allStatuses')}</option>
            <option value="ACTIVE_ONLY">🔥 {t('activeCasesOnly')}</option>
            <option value="PLANNED">{t('statuses.PLANNED')}</option>
            <option value="ONGOING">{t('statuses.ONGOING')}</option>
            <option value="COMPLETED">{t('statuses.COMPLETED')}</option>
            <option value="CANCELLED">{t('statuses.CANCELLED')}</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-surface-elevated text-foreground text-sm"
            aria-label={t('categoryLabel')}
          >
            <option value="ALL">{t('allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-surface-elevated text-foreground text-sm"
            aria-label={t('allGroups')}
          >
            <option value="ALL">{t('allGroups')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-surface-elevated text-foreground text-sm"
            aria-label={t('allPeople')}
          >
            <option value="ALL">{t('allPeople')}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {formatGraphName(p, nameOrder, nameDisplayFormat)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-12 text-center">
          <p className="text-muted mb-4">
            {events.length === 0 ? t('noEventsYet') : t('noMatchingEvents')}
          </p>
          {events.length === 0 && (
            <Link
              href="/events/new"
              className="inline-flex items-center px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              + {t('createEvent')}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((ev) => {
            const firstAddr = ev.addresses[0];
            const locationText = firstAddr
              ? [firstAddr.locality, firstAddr.country ? getCountryName(firstAddr.country) || firstAddr.country : null]
                  .filter(Boolean)
                  .join(', ') ||
                (firstAddr.latitude !== null && firstAddr.longitude !== null
                  ? `${firstAddr.latitude.toFixed(4)}, ${firstAddr.longitude.toFixed(4)}`
                  : null)
              : null;

            return (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="block bg-surface border border-border hover:border-primary/60 rounded-lg p-5 transition-all shadow-sm hover:shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{ev.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_BADGE_CLASSES[ev.status]}`}
                      >
                        {t(`statuses.${ev.status}`)}
                      </span>
                      {ev.category && (
                        <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated text-muted">
                          {ev.category}
                        </span>
                      )}
                      {ev.groups.map((eg) => (
                        <span
                          key={eg.groupId}
                          className="text-xs px-2 py-0.5 rounded font-medium text-white"
                          style={{ backgroundColor: eg.group.color || '#6366f1' }}
                        >
                          {eg.group.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary">
                      {t('peopleCount', { count: ev.people.length })}
                    </span>
                  </div>
                </div>

                {/* Date & Location */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mt-3">
                  {ev.startDate && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {formatDate(new Date(ev.startDate), dateFormat)}
                      {ev.endDate ? ` → ${formatDate(new Date(ev.endDate), dateFormat)}` : ''}
                    </span>
                  )}
                  {locationText && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      {locationText}
                    </span>
                  )}
                </div>

                {/* Participant Avatars */}
                {ev.people.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center -space-x-2 overflow-hidden">
                      {ev.people.slice(0, 6).map((p) => (
                        <div key={p.id} className="inline-block ring-2 ring-surface rounded-full">
                          <PersonAvatar
                            personId={p.person.id}
                            name={formatGraphName(p.person, nameOrder, nameDisplayFormat)}
                            photo={p.person.photo}
                            size={28}
                          />
                        </div>
                      ))}
                      {ev.people.length > 6 && (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-elevated text-xs font-medium text-muted ring-2 ring-surface">
                          +{ev.people.length - 6}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted truncate max-w-[60%]">
                      {ev.people
                        .slice(0, 3)
                        .map((p) => formatGraphName(p.person, nameOrder, nameDisplayFormat))
                        .join(', ')}
                      {ev.people.length > 3 ? '...' : ''}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

