'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { formatDate, type DateFormat } from '@/lib/date-format';
import { formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';
import { getCountryName } from '@/lib/countries';
import PersonAvatar from './PersonPhoto';
import BulkEventCaseStatusModal from './BulkEventCaseStatusModal';
import BulkEventGroupModal from './BulkEventGroupModal';
import BulkEventDeleteModal from './BulkEventDeleteModal';

export interface SerializedEventItem {
  id: string;
  title: string;
  category: string | null;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  caseCode?: string | null;
  crimeType?: string | null;
  caseStatus?: string | null;
  incidentTimeNotes?: string | null;
  damageAssessment?: string | null;
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

export interface QuickEventCounts {
  totalAll: number;
  countUnresolved: number;
  countInvestigating: number;
  countSolved: number;
  countSuspended: number;
  countActive: number;
}

export interface CrossCaseSuspectEntry {
  person: {
    id: string;
    name: string;
    surname: string | null;
    nickname: string | null;
    displayNameOverride: string | null;
    photo: string | null;
  };
  cases: Array<{
    id: string;
    title: string;
    status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
    involvementType: string;
    verificationStatus: string;
  }>;
}

interface EventsListClientProps {
  events: SerializedEventItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  sortBy: string;
  order: string;
  caseStatusFilter: string;
  statusFilter: string;
  groupFilter: string;
  personFilter: string;
  categoryFilter: string;
  query: string;
  quickCounts?: QuickEventCounts;
  crossCaseSuspects?: CrossCaseSuspectEntry[];
  categories: string[];
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

export const CASE_STATUS_COLORS: Record<string, { badge: string; text: string; bg: string; dot: string }> = {
  UNRESOLVED: {
    badge: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 font-semibold',
    text: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-600',
    dot: 'bg-red-600',
  },
  INVESTIGATING: {
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold',
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-600',
    dot: 'bg-amber-500',
  },
  SOLVED: {
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-600',
    dot: 'bg-emerald-600',
  },
  SUSPENDED: {
    badge: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 font-medium',
    text: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-500',
    dot: 'bg-slate-400',
  },
};

const STATUS_BADGE_CLASSES: Record<SerializedEventItem['status'], string> = {
  PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ONGOING: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

// Inline Quick Status Popover
function QuickCaseStatusSelector({
  eventId,
  currentStatus,
  onUpdate,
}: {
  eventId: string;
  currentStatus: string;
  onUpdate: (id: string, newStatus: string) => void;
}) {
  const t = useTranslations('events');
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const normalizedStatus = currentStatus || 'UNRESOLVED';
  const colorDef = CASE_STATUS_COLORS[normalizedStatus] || CASE_STATUS_COLORS.UNRESOLVED;

  const handleSelect = async (status: string) => {
    if (status === normalizedStatus) {
      setIsOpen(false);
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseStatus: status }),
      });
      if (!res.ok) throw new Error('Update failed');
      onUpdate(eventId, status);
      toast.success(t('statusUpdatedToast', { status: t(`caseStatuses.${status}`) }));
      setIsOpen(false);
    } catch {
      toast.error('Không thể cập nhật trạng thái vụ án');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 focus:outline-none ${colorDef.badge}`}
        title="Nhấp để đổi trạng thái thụ lý nhanh"
      >
        <span className={`w-2 h-2 rounded-full ${colorDef.dot}`} />
        <span>{t(`caseStatuses.${normalizedStatus}`) || normalizedStatus}</span>
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-52 rounded-lg bg-surface border border-border shadow-xl z-40 py-1.5 text-xs animate-in fade-in zoom-in-95">
            <div className="px-3 py-1 text-[11px] font-semibold text-muted uppercase tracking-wider border-b border-border mb-1">
              Đổi trạng thái thụ lý
            </div>
            {(['UNRESOLVED', 'INVESTIGATING', 'SOLVED', 'SUSPENDED'] as const).map((st) => {
              const active = st === normalizedStatus;
              const def = CASE_STATUS_COLORS[st];
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleSelect(st)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                    active ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-surface-elevated text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${def.dot}`} />
                    {t(`caseStatuses.${st}`)}
                  </span>
                  {active && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function EventsListClient({
  events: initialEvents,
  totalCount,
  currentPage,
  totalPages,
  pageSize,
  sortBy,
  order,
  caseStatusFilter,
  statusFilter,
  groupFilter,
  personFilter,
  categoryFilter,
  query,
  quickCounts,
  crossCaseSuspects = [],
  categories,
  groups,
  people,
  dateFormat,
  nameOrder,
  nameDisplayFormat,
}: EventsListClientProps) {
  const t = useTranslations('events');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState(initialEvents);
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const [searchInput, setSearchInput] = useState(query);
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // View Mode: grid (card) or table
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showCrossCasePanel, setShowCrossCasePanel] = useState(crossCaseSuspects.length > 0);

  // Selection state for Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllPages, setSelectAllPages] = useState(false);

  // Modals state
  const [showCaseStatusModal, setShowCaseStatusModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [jumpPageInput, setJumpPageInput] = useState('');

  const pageIds = useMemo(() => events.map((e) => e.id), [events]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 || selectAllPages;
  const effectiveCount = selectAllPages ? totalCount : selectedIds.size;

  const toggleEvent = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSelectAllPages(false);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const togglePage = useCallback(() => {
    setSelectedIds((prev) => {
      if (allPageSelected) {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        setSelectAllPages(false);
        return next;
      } else {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      }
    });
  }, [allPageSelected, pageIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectAllPages(false);
  }, []);

  const handleSelectAllPages = useCallback(() => {
    setSelectAllPages(true);
    setSelectedIds(new Set(pageIds));
  }, [pageIds]);

  const handleSuccess = useCallback(() => {
    clearSelection();
    setShowCaseStatusModal(false);
    setShowGroupModal(false);
    setShowDeleteModal(false);
    router.refresh();
  }, [clearSelection, router]);

  const handleQuickStatusUpdated = (eventId: string, newStatus: string) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, caseStatus: newStatus } : ev))
    );
    router.refresh();
  };

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (caseStatusFilter) params.set('caseStatus', caseStatusFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (groupFilter) params.set('group', groupFilter);
    if (personFilter) params.set('person', personFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (query) params.set('q', query);
    if (pageSize !== 25) params.set('pageSize', String(pageSize));
    return params;
  }, [caseStatusFilter, statusFilter, groupFilter, personFilter, categoryFilter, query, pageSize]);

  const buildSortUrl = (col: string) => {
    const params = buildFilterParams();
    params.set('sortBy', col);
    params.set('order', sortBy === col && order === 'asc' ? 'desc' : 'asc');
    params.set('page', String(currentPage));
    return `/events?${params.toString()}`;
  };

  const buildPageUrl = (page: number, newPageSize?: number) => {
    const params = buildFilterParams();
    params.set('page', page.toString());
    if (newPageSize) params.set('pageSize', newPageSize.toString());
    if (sortBy !== 'startDate') params.set('sortBy', sortBy);
    if (order !== 'desc') params.set('order', order);
    return `/events?${params.toString()}`;
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (sortBy !== 'startDate') params.set('sortBy', sortBy);
    if (order !== 'desc') params.set('order', order);
    if (pageSize !== 25) params.set('pageSize', String(pageSize));

    const currentFilters: Record<string, string> = {
      caseStatus: caseStatusFilter,
      status: statusFilter,
      group: groupFilter,
      person: personFilter,
      category: categoryFilter,
      q: query,
      [key]: value,
    };

    if (currentFilters.caseStatus) params.set('caseStatus', currentFilters.caseStatus);
    if (currentFilters.status) params.set('status', currentFilters.status);
    if (currentFilters.group) params.set('group', currentFilters.group);
    if (currentFilters.person) params.set('person', currentFilters.person);
    if (currentFilters.category) params.set('category', currentFilters.category);
    if (currentFilters.q) params.set('q', currentFilters.q);

    params.set('page', '1');
    router.push(`/events?${params.toString()}`);
  };

  const handleQuickChipClick = (type: 'all' | 'UNRESOLVED' | 'INVESTIGATING' | 'SOLVED' | 'SUSPENDED' | 'active') => {
    const params = new URLSearchParams();
    if (sortBy !== 'startDate') params.set('sortBy', sortBy);
    if (order !== 'desc') params.set('order', order);
    if (pageSize !== 25) params.set('pageSize', String(pageSize));

    if (type === 'all') {
      // Clear filters
    } else if (type === 'active') {
      params.set('status', 'ACTIVE_ONLY');
    } else {
      params.set('caseStatus', type);
    }

    params.set('page', '1');
    router.push(`/events?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange('q', searchInput.trim());
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      router.push(buildPageUrl(pageNum));
      setJumpPageInput('');
    }
  };

  const clearAllFilters = () => {
    setSearchInput('');
    router.push('/events');
  };

  const hasActiveFilters = Boolean(
    caseStatusFilter || statusFilter || groupFilter || personFilter || categoryFilter || query
  );

  return (
    <div className="space-y-5">
      {/* 1. Tactical Quick Chips Bar */}
      {quickCounts && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-surface rounded-lg border border-border shadow-xs">
          <span className="text-xs font-semibold text-muted px-1.5 py-1 flex items-center gap-1">
            <span>🎯</span> Phân loại án:
          </span>

          <button
            type="button"
            onClick={() => handleQuickChipClick('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              !caseStatusFilter && !statusFilter
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-elevated text-foreground hover:bg-surface-elevated/80 border border-border'
            }`}
          >
            Tất cả ({quickCounts.totalAll})
          </button>

          <button
            type="button"
            onClick={() => handleQuickChipClick('UNRESOLVED')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              caseStatusFilter === 'UNRESOLVED'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-100'
            }`}
          >
            <span>🔴 Chưa rõ đối tượng</span>
            <span className="font-bold">({quickCounts.countUnresolved})</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChipClick('INVESTIGATING')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              caseStatusFilter === 'INVESTIGATING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100'
            }`}
          >
            <span>🟠 Đang thụ lý điều tra</span>
            <span className="font-bold">({quickCounts.countInvestigating})</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChipClick('SOLVED')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              caseStatusFilter === 'SOLVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100'
            }`}
          >
            <span>🟢 Đã phá án / Kết luận</span>
            <span className="font-bold">({quickCounts.countSolved})</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChipClick('SUSPENDED')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              caseStatusFilter === 'SUSPENDED'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-200'
            }`}
          >
            <span>⚪ Tạm đình chỉ</span>
            <span className="font-bold">({quickCounts.countSuspended})</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChipClick('active')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'ACTIVE_ONLY'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100'
            }`}
          >
            <span>🔥 Án đang diễn ra</span>
            <span className="font-bold">({quickCounts.countActive})</span>
          </button>
        </div>
      )}

      {/* 2. Cross-Case Suspect Analysis Accordion */}
      {crossCaseSuspects.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-4 transition-all">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => setShowCrossCasePanel(!showCrossCasePanel)}
            >
              <span className="text-base">⚠️</span>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {t('crossCaseAnalysisTitle', { count: crossCaseSuspects.length })}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('crossCaseAnalysisDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {personFilter && (
                <button
                  type="button"
                  onClick={() => handleFilterChange('person', '')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t('clearPersonFilter')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCrossCasePanel(!showCrossCasePanel)}
                className="text-xs text-amber-800 dark:text-amber-300 hover:underline px-2 py-1 rounded bg-amber-500/10"
              >
                {showCrossCasePanel ? 'Thu gọn ▲' : 'Mở rộng ▼'}
              </button>
            </div>
          </div>

          {showCrossCasePanel && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-3 border-t border-amber-500/20">
              {crossCaseSuspects.map(({ person, cases }) => {
                const displayName = formatGraphName(person, nameOrder, nameDisplayFormat);
                const isSelected = personFilter === person.id;
                return (
                  <div
                    key={person.id}
                    onClick={() => handleFilterChange('person', isSelected ? '' : person.id)}
                    className={`cursor-pointer p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-surface border-border hover:border-amber-500/50 hover:shadow-xs'
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
          )}
        </div>
      )}

      {/* 3. Filter Controls & View Switcher */}
      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã án, tên vụ việc, tội danh, nghi can..."
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-surface-elevated text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">🔍</span>
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Tìm
            </button>
          </form>

          {/* View Mode & Sorters */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900 transition-colors"
              >
                ✕ Xóa bộ lọc
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center border border-border rounded-lg bg-surface-elevated p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Hiển thị dạng thẻ trực quan"
              >
                <span>🔲</span> Dạng thẻ
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Hiển thị dạng bảng quản lý hồ sơ"
              >
                <span>📋</span> Sổ thụ lý
              </button>
            </div>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-border">
          <select
            value={caseStatusFilter}
            onChange={(e) => handleFilterChange('caseStatus', e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg bg-surface-elevated text-foreground text-xs"
          >
            <option value="">-- Tất cả trạng thái thụ lý --</option>
            <option value="UNRESOLVED">{t('caseStatuses.UNRESOLVED')}</option>
            <option value="INVESTIGATING">{t('caseStatuses.INVESTIGATING')}</option>
            <option value="SOLVED">{t('caseStatuses.SOLVED')}</option>
            <option value="SUSPENDED">{t('caseStatuses.SUSPENDED')}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg bg-surface-elevated text-foreground text-xs"
          >
            <option value="">-- Tiến độ vụ việc --</option>
            <option value="ACTIVE_ONLY">🔥 Chỉ vụ đang hoạt động</option>
            <option value="PLANNED">{t('statuses.PLANNED')}</option>
            <option value="ONGOING">{t('statuses.ONGOING')}</option>
            <option value="COMPLETED">{t('statuses.COMPLETED')}</option>
            <option value="CANCELLED">{t('statuses.CANCELLED')}</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg bg-surface-elevated text-foreground text-xs"
          >
            <option value="">-- Phân loại tội danh --</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={groupFilter}
            onChange={(e) => handleFilterChange('group', e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg bg-surface-elevated text-foreground text-xs"
          >
            <option value="">-- Nhóm / Chuyên án --</option>
            <option value="none">Chưa gán nhóm</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={personFilter}
            onChange={(e) => handleFilterChange('person', e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg bg-surface-elevated text-foreground text-xs"
          >
            <option value="">-- Lọc theo đối tượng --</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {formatGraphName(p, nameOrder, nameDisplayFormat)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Bulk Action Floating Bar */}
      {someSelected && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-foreground">
              Đã chọn: <span className="text-primary">{effectiveCount}</span> vụ án
            </span>
            {!selectAllPages && totalCount > events.length && (
              <button
                type="button"
                onClick={handleSelectAllPages}
                className="text-xs text-primary underline font-semibold hover:text-primary-dark"
              >
                Chọn toàn bộ {totalCount} vụ án trong hệ thống
              </button>
            )}
            {selectAllPages && (
              <span className="text-xs text-muted-foreground font-medium">
                (Đang chọn toàn bộ {totalCount} vụ án)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCaseStatusModal(true)}
              className="px-3 py-1.5 bg-surface border border-border text-foreground hover:bg-surface-elevated text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5"
            >
              <span>📋</span> Đổi trạng thái thụ lý
            </button>
            <button
              type="button"
              onClick={() => setShowGroupModal(true)}
              className="px-3 py-1.5 bg-surface border border-border text-foreground hover:bg-surface-elevated text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5"
            >
              <span>👥</span> Gán nhóm / Chuyên án
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5"
            >
              <span>🗑️</span> Xóa hàng loạt
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              Hủy chọn
            </button>
          </div>
        </div>
      )}

      {/* 5. Events List Render (Grid or Table) */}
      {events.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-12 text-center">
          <p className="text-base text-muted-foreground mb-4">
            {totalCount === 0 && !hasActiveFilters ? t('noEventsYet') : t('noMatchingEvents')}
          </p>
          {totalCount === 0 && !hasActiveFilters ? (
            <Link
              href="/events/new"
              className="inline-flex items-center px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              + {t('createEvent')}
            </Link>
          ) : (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center px-4 py-2 bg-surface-elevated border border-border text-foreground rounded-lg font-medium hover:bg-surface transition-colors"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((ev) => {
            const isSelected = selectedIds.has(ev.id);
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
              <div
                key={ev.id}
                className={`bg-surface rounded-lg border transition-all p-5 flex flex-col justify-between ${
                  isSelected ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-border hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Bar: Checkbox + Badges */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEvent(ev.id)}
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        aria-label={`Chọn vụ án ${ev.title}`}
                      />
                      {ev.caseCode ? (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-elevated border border-border font-bold text-foreground">
                          {ev.caseCode}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">#Án</span>
                      )}
                      <QuickCaseStatusSelector
                        eventId={ev.id}
                        currentStatus={ev.caseStatus || 'UNRESOLVED'}
                        onUpdate={handleQuickStatusUpdated}
                      />
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        STATUS_BADGE_CLASSES[ev.status]
                      }`}
                    >
                      {t(`statuses.${ev.status}`)}
                    </span>
                  </div>

                  {/* Title */}
                  <Link
                    href={`/events/${ev.id}`}
                    className="text-lg font-bold text-foreground hover:text-primary transition-colors block leading-tight mb-2"
                  >
                    {ev.title}
                  </Link>

                  {/* Crime Type & Category */}
                  {(ev.crimeType || ev.category) && (
                    <div className="flex items-center gap-2 flex-wrap mb-2.5">
                      {ev.crimeType && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
                          ⚖️ {ev.crimeType}
                        </span>
                      )}
                      {ev.category && (
                        <span className="text-xs text-muted-foreground font-medium">
                          • {ev.category}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Time & Location */}
                  <div className="text-xs text-muted-foreground space-y-1 mb-3">
                    {(ev.startDate || ev.endDate) && (
                      <div className="flex items-center gap-1.5">
                        <span>📅</span>
                        <span>
                          {ev.startDate ? formatDate(new Date(ev.startDate), dateFormat) : ''}
                          {ev.endDate ? ` - ${formatDate(new Date(ev.endDate), dateFormat)}` : ''}
                        </span>
                        {ev.incidentTimeNotes && (
                          <span className="text-amber-700 dark:text-amber-400">
                            ({ev.incidentTimeNotes})
                          </span>
                        )}
                      </div>
                    )}
                    {locationText && (
                      <div className="flex items-center gap-1.5 truncate">
                        <span>📍</span>
                        <span className="truncate">{locationText}</span>
                      </div>
                    )}
                  </div>

                  {/* Damage Assessment preview */}
                  {ev.damageAssessment && (
                    <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20 mb-3 line-clamp-2">
                      💥 {ev.damageAssessment}
                    </p>
                  )}

                  {/* Groups */}
                  {ev.groups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {ev.groups.map(({ group }) => (
                        <span
                          key={group.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
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

                {/* Bottom Footer: Participants & Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {ev.people.length > 0 ? (
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {ev.people.slice(0, 4).map((p) => {
                          const pName = formatGraphName(p.person, nameOrder, nameDisplayFormat);
                          return (
                            <div key={p.id} title={`${pName} (${p.involvementType || 'Liên quan'})`}>
                              <PersonAvatar
                                personId={p.personId}
                                name={pName}
                                photo={p.person.photo}
                                size={24}
                              />
                            </div>
                          );
                        })}
                        {ev.people.length > 4 && (
                          <span className="w-6 h-6 rounded-full bg-surface-elevated border border-border text-[10px] font-bold flex items-center justify-center text-muted-foreground z-10">
                            +{ev.people.length - 4}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Chưa có đối tượng</span>
                    )}
                    <span className="text-xs text-muted-foreground font-medium ml-1">
                      {t('participantsCount', { count: ev.people.length })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/events/${ev.id}`}
                      className="px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
                    >
                      Chi tiết →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (SỔ THỤ LÝ ĐIỀU TRA) */
        <div className="bg-surface border border-border rounded-lg overflow-x-auto shadow-xs">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-elevated text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={togglePage}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    aria-label="Chọn tất cả trang này"
                  />
                </th>
                <th className="py-3 px-3">
                  <Link href={buildSortUrl('caseCode')} className="hover:underline flex items-center gap-1">
                    Mã số / Tiêu đề {sortBy === 'caseCode' && (order === 'asc' ? '↑' : '↓')}
                  </Link>
                </th>
                <th className="py-3 px-3">Tội danh & Phân loại</th>
                <th className="py-3 px-3">Trạng thái thụ lý</th>
                <th className="py-3 px-3">Tiến độ</th>
                <th className="py-3 px-3">
                  <Link href={buildSortUrl('startDate')} className="hover:underline flex items-center gap-1">
                    Thời điểm {sortBy === 'startDate' && (order === 'asc' ? '↑' : '↓')}
                  </Link>
                </th>
                <th className="py-3 px-3">Đối tượng liên quan</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((ev) => {
                const isSelected = selectedIds.has(ev.id);
                return (
                  <tr
                    key={ev.id}
                    className={`hover:bg-surface-elevated/60 transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEvent(ev.id)}
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {ev.caseCode && (
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-elevated border border-border font-bold text-foreground">
                            {ev.caseCode}
                          </span>
                        )}
                        <Link
                          href={`/events/${ev.id}`}
                          className="font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                        >
                          {ev.title}
                        </Link>
                      </div>
                      {ev.groups.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {ev.groups.map(({ group }) => (
                            <span
                              key={group.id}
                              className="text-[10px] px-1.5 py-0.2 rounded font-medium"
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
                    </td>
                    <td className="py-3 px-3">
                      {ev.crimeType ? (
                        <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                          {ev.crimeType}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {ev.category && (
                        <div className="text-[11px] text-muted-foreground">{ev.category}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <QuickCaseStatusSelector
                        eventId={ev.id}
                        currentStatus={ev.caseStatus || 'UNRESOLVED'}
                        onUpdate={handleQuickStatusUpdated}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_BADGE_CLASSES[ev.status]
                        }`}
                      >
                        {t(`statuses.${ev.status}`)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                      {ev.startDate ? formatDate(new Date(ev.startDate), dateFormat) : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          {ev.people.length}
                        </span>
                        <span className="text-xs text-muted-foreground">người</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/events/${ev.id}`}
                          className="px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded"
                        >
                          Xem
                        </Link>
                        <Link
                          href={`/events/${ev.id}/edit`}
                          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-elevated rounded"
                        >
                          Sửa
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground flex items-center gap-3">
            <span>
              Hiển thị <strong>{(currentPage - 1) * pageSize + 1}</strong> -{' '}
              <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> trong tổng số{' '}
              <strong>{totalCount}</strong> vụ án
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span>Mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => router.push(buildPageUrl(1, Number(e.target.value)))}
                className="px-2 py-1 border border-border rounded bg-surface-elevated text-foreground text-xs"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={buildPageUrl(Math.max(1, currentPage - 1))}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border border-border ${
                currentPage === 1
                  ? 'opacity-50 pointer-events-none bg-surface-elevated text-muted-foreground'
                  : 'bg-surface hover:bg-surface-elevated text-foreground'
              }`}
            >
              ← Trước
            </Link>

            <span className="text-xs font-semibold text-foreground px-2">
              Trang {currentPage} / {totalPages}
            </span>

            <Link
              href={buildPageUrl(Math.min(totalPages, currentPage + 1))}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border border-border ${
                currentPage === totalPages
                  ? 'opacity-50 pointer-events-none bg-surface-elevated text-muted-foreground'
                  : 'bg-surface hover:bg-surface-elevated text-foreground'
              }`}
            >
              Sau →
            </Link>

            {/* Jump to page */}
            <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-2">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                placeholder="Trang"
                className="w-14 px-2 py-1 text-xs border border-border rounded bg-surface-elevated text-foreground text-center"
              />
              <button
                type="submit"
                className="px-2 py-1 text-xs font-medium bg-surface-elevated border border-border hover:bg-surface rounded text-foreground"
              >
                Đi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. Bulk Action Modals */}
      <BulkEventCaseStatusModal
        isOpen={showCaseStatusModal}
        onClose={() => setShowCaseStatusModal(false)}
        selectedIds={Array.from(selectedIds)}
        selectAll={selectAllPages}
        totalCount={totalCount}
        onSuccess={handleSuccess}
      />

      <BulkEventGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        selectedIds={Array.from(selectedIds)}
        selectAll={selectAllPages}
        totalCount={totalCount}
        availableGroups={groups}
        onSuccess={handleSuccess}
      />

      <BulkEventDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        selectedIds={Array.from(selectedIds)}
        selectAll={selectAllPages}
        totalCount={totalCount}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
