'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import BulkDeleteModal from './BulkDeleteModal';
import BulkGroupAssignModal from './BulkGroupAssignModal';
import BulkRelationshipModal from './BulkRelationshipModal';
import BulkManagementLevelModal from './BulkManagementLevelModal';
import PersonAvatar from './PersonPhoto';
import { formatCanonicalName, type NameDisplayFormat } from '@/lib/nameUtils';
import { formatDate, parseCalendarDate, type DateFormat } from '@/lib/date-format';
import CustomFieldFilter from './customFields/CustomFieldFilter';
import type { CustomFieldTemplate } from '@prisma/client';

interface PersonRow {
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
}

interface Group {
  id: string;
  name: string;
  color: string | null;
}

interface RelationshipType {
  id: string;
  label: string;
  color: string | null;
}

interface QuickCounts {
  totalAll: number;
  countKeyTarget: number;
  countSurveillance: number;
  countHighRisk: number;
  countCriminal: number;
  countUnassignedGroup: number;
}

export function getContactStatusBadge(lastContact: Date | string | null | undefined): {
  label: string;
  badgeClass: string;
  icon: string;
} {
  if (!lastContact) {
    return {
      label: 'Chưa kiểm diện',
      badgeClass:
        'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800',
      icon: '⚪',
    };
  }

  const contactTime = new Date(lastContact).getTime();
  if (isNaN(contactTime)) {
    return {
      label: 'Chưa kiểm diện',
      badgeClass:
        'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800',
      icon: '⚪',
    };
  }

  const now = Date.now();
  const diffDays = Math.max(0, Math.floor((now - contactTime) / (1000 * 60 * 60 * 24)));

  if (diffDays <= 7) {
    return {
      label: diffDays === 0 ? 'Kiểm diện hôm nay' : `Đã kiểm diện (${diffDays} ngày trước)`,
      badgeClass:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      icon: '🟢',
    };
  }

  if (diffDays <= 30) {
    return {
      label: `Bình thường (${diffDays} ngày trước)`,
      badgeClass:
        'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      icon: '🔵',
    };
  }

  if (diffDays <= 90) {
    return {
      label: `Quá hạn (${diffDays} ngày trước)`,
      badgeClass:
        'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium',
      icon: '⚠️',
    };
  }

  return {
    label: `Mất dấu vết (${diffDays} ngày trước)`,
    badgeClass:
      'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold',
    icon: '🚨',
  };
}

interface PeopleListClientProps {
  people: PersonRow[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize?: number;
  sortBy: string;
  order: string;
  groupFilter: string;
  relationshipFilter: string;
  managementFilter?: string;
  threatFilter?: string;
  hasRecordFilter?: string;
  contactRecencyFilter?: string;
  recordRecencyFilter?: string;
  query?: string;
  cfFilter: { slug: string; value: string } | null;
  quickCounts?: QuickCounts;
  dateFormat: DateFormat;
  availableGroups: Group[];
  relationshipTypes: RelationshipType[];
  customFieldTemplates: CustomFieldTemplate[];
  nameOrder?: 'WESTERN' | 'EASTERN';
  nameDisplayFormat?: NameDisplayFormat;
  translations: {
    fullName: string;
    surname: string;
    nickname: string;
    relationshipToUser: string;
    groups: string;
    lastContact: string;
    actions: string;
    indirect: string;
    orphanWarning: string;
    showing: string;
    page: string;
    of: string;
    pageSize?: string;
    perPage?: string;
    jumpToPage?: string;
    jump?: string;
    changeManagementLevel?: string;
  };
  commonTranslations: {
    name: string;
    edit: string;
    view: string;
    previous: string;
    next: string;
  };
}

function QuickStatusSelector({
  personId,
  currentLevel,
  personName,
  onUpdate,
}: {
  personId: string;
  currentLevel?: string | null;
  personName: string;
  onUpdate: (id: string, newLevel: 'NORMAL' | 'SURVEILLANCE' | 'KEY_TARGET') => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const t = useTranslations('people');

  const handleSelect = async (level: 'NORMAL' | 'SURVEILLANCE' | 'KEY_TARGET') => {
    setIsOpen(false);
    if (level === currentLevel) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/people/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managementLevel: level }),
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      onUpdate(personId, level);
      toast.success(t('quickStatusSuccess') || `Đã chuyển diện quản lý của ${personName}`);
    } catch {
      toast.error(t('quickStatusFailed') || 'Không thể cập nhật diện quản lý');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={isUpdating}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
          currentLevel === 'KEY_TARGET'
            ? 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800 hover:bg-red-200'
            : currentLevel === 'SURVEILLANCE'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-200'
            : 'bg-surface-elevated text-muted border-border hover:bg-surface hover:text-foreground'
        }`}
        title="Nhấn để đổi diện quản lý nhanh"
      >
        {currentLevel === 'KEY_TARGET' && '🔴 Trọng điểm'}
        {currentLevel === 'SURVEILLANCE' && '🟠 Nghi vấn'}
        {(!currentLevel || currentLevel === 'NORMAL') && '⚪ Bình thường'}
        <span className="text-[9px] opacity-70">▼</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1 w-44 rounded-md shadow-lg bg-surface border border-border z-50 py-1 text-xs">
            <button
              type="button"
              onClick={() => handleSelect('NORMAL')}
              className={`w-full text-left px-3 py-1.5 hover:bg-surface-elevated flex items-center gap-2 ${
                !currentLevel || currentLevel === 'NORMAL' ? 'font-bold text-foreground bg-surface-elevated/50' : 'text-muted'
              }`}
            >
              <span>⚪</span>
              <span>Bình thường</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelect('SURVEILLANCE')}
              className={`w-full text-left px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2 ${
                currentLevel === 'SURVEILLANCE' ? 'font-bold text-amber-700 dark:text-amber-300 bg-amber-50/50' : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              <span>🟠</span>
              <span>Nghi vấn</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelect('KEY_TARGET')}
              className={`w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 ${
                currentLevel === 'KEY_TARGET' ? 'font-bold text-red-700 dark:text-red-300 bg-red-50/50' : 'text-red-700 dark:text-red-400'
              }`}
            >
              <span>🔴</span>
              <span>Trọng điểm</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NameCell({
  href,
  label,
  isOrphan,
  orphanWarning,
  displayNameOverride,
}: {
  href: string;
  label: string;
  isOrphan: boolean;
  orphanWarning: string;
  displayNameOverride?: string | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Link href={href} className="text-primary hover:underline font-semibold text-sm">
          {label}
        </Link>

        {isOrphan && (
          <span className="relative group cursor-help">
            <span className="text-yellow-500">{'⚠️'}</span>
            <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 text-xs text-foreground bg-surface-elevated rounded-lg whitespace-normal max-w-xs z-50 shadow-lg border border-border">
              {orphanWarning}
              <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-surface-elevated" />
            </span>
          </span>
        )}
      </div>

      {displayNameOverride && (
        <div className="text-xs text-muted mt-0.5">
          {displayNameOverride}
        </div>
      )}
    </div>
  );
}

function TacticalDossierCard({
  person,
  isSelected,
  onToggle,
  nameOrder,
  onStatusUpdate,
}: {
  person: PersonRow;
  isSelected: boolean;
  onToggle: () => void;
  nameOrder?: 'WESTERN' | 'EASTERN';
  onStatusUpdate: (id: string, newLevel: 'NORMAL' | 'SURVEILLANCE' | 'KEY_TARGET') => void;
}) {
  const fullDisplayName = formatCanonicalName(person, nameOrder);
  const contactStatus = getContactStatusBadge(person.lastContact);
  const isKey = person.managementLevel === 'KEY_TARGET';
  const isSurveillance = person.managementLevel === 'SURVEILLANCE';
  const isArmed = person.threatLevel === 'ARMED_DANGEROUS';
  const isHighThreat = person.threatLevel === 'HIGH';

  return (
    <div
      className={`rounded-xl border transition-all p-4 flex flex-col justify-between ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03] shadow-sm'
          : isKey
          ? 'border-red-500/50 bg-surface hover:border-red-500 shadow-xs'
          : isSurveillance
          ? 'border-amber-500/50 bg-surface hover:border-amber-500 shadow-xs'
          : 'border-border bg-surface hover:border-primary/50 hover:shadow-xs'
      }`}
    >
      <div className="space-y-3">
        {/* Header: Checkbox + Avatar + Name + Nickname + Status */}
        <div className="flex items-start gap-3">
          <div className="pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              className="w-4 h-4 text-primary bg-surface border-border rounded focus:ring-primary cursor-pointer"
              aria-label={`Chọn đối tượng ${fullDisplayName}`}
            />
          </div>

          <Link href={`/people/${person.id}`} className="shrink-0 relative group">
            <PersonAvatar
              personId={person.id}
              photo={person.photo}
              name={fullDisplayName}
              size={48}
            />
            {isKey && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-surface animate-pulse" />
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/people/${person.id}`}
                className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate block"
              >
                {fullDisplayName}
              </Link>
              {person.nickname && (
                <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 truncate max-w-[140px]">
                  🎭 &quot;{person.nickname}&quot;
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <QuickStatusSelector
                personId={person.id}
                currentLevel={person.managementLevel}
                personName={fullDisplayName}
                onUpdate={onStatusUpdate}
              />
              {isArmed && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                  ⚠️ Vũ khí
                </span>
              )}
              {isHighThreat && !isArmed && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/15 text-orange-600 dark:text-orange-400">
                  ⚡ Nguy hiểm
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tactical Info Section */}
        <div className="bg-surface-elevated/50 rounded-lg p-2.5 text-xs space-y-1.5 border border-border/60">
          {/* Citizen ID & Contact status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 font-mono text-muted-foreground">
              <span className="text-muted">🆔</span>
              {person.citizenId ? (
                <span className="font-semibold text-foreground">{person.citizenId}</span>
              ) : (
                <span className="text-muted italic">Chưa có CCCD</span>
              )}
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${contactStatus.badgeClass}`}
            >
              <span>{contactStatus.icon}</span>
              <span>{contactStatus.label}</span>
            </span>
          </div>

          {/* Vehicle plate */}
          {person.vehicles && person.vehicles.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground truncate pt-0.5">
              <span>🚗</span>
              <span className="font-medium text-foreground">
                {person.vehicles[0].plateNumber}
              </span>
              {(person.vehicles[0].brandModel || person.vehicles[0].color) && (
                <span className="text-muted text-[11px] truncate">
                  ({[person.vehicles[0].brandModel, person.vehicles[0].color].filter(Boolean).join(' ')})
                </span>
              )}
              {person.vehicles.length > 1 && (
                <span className="text-[10px] text-muted">+{person.vehicles.length - 1} xe</span>
              )}
            </div>
          )}

          {/* Physical mark */}
          {person.physicalMarks && person.physicalMarks.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground truncate">
              <span>🔍</span>
              <span className="truncate text-foreground text-[11px]">
                {person.physicalMarks[0].type} ở {person.physicalMarks[0].location}
                {person.physicalMarks[0].description ? `: ${person.physicalMarks[0].description}` : ''}
              </span>
            </div>
          )}

          {/* Gang membership */}
          {person.gangs && person.gangs.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground truncate">
              <span>👥</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium text-[11px] truncate">
                {person.gangs.map((g) => g.name).join(', ')}
              </span>
            </div>
          )}

          {/* Records & Cases metrics */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <span>⚖️</span>
              <span className="font-semibold text-foreground">
                {person.criminalRecordsCount ?? 0}
              </span>{' '}
              tiền án/tiền sự
            </span>
            <span className="text-border">•</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <span>📁</span>
              <span className="font-semibold text-foreground">
                {person.casesCount ?? 0}
              </span>{' '}
              vụ án liên quan
            </span>
          </div>
        </div>

        {/* Groups */}
        {person.groups.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {person.groups.map((pg) => (
              <span
                key={pg.groupId}
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                style={{
                  backgroundColor: pg.group.color ? `${pg.group.color}20` : 'var(--badge-bg)',
                  color: pg.group.color || 'var(--badge-text)',
                }}
              >
                {pg.group.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="pt-3 mt-2 border-t border-border/60 flex items-center justify-between">
        <Link
          href={`/people/${person.id}`}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>Xem hồ sơ chi tiết</span>
          <span>→</span>
        </Link>

        <Link
          href={`/people/${person.id}/edit`}
          className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
          title="Chỉnh sửa thông tin"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default function PeopleListClient({
  people: initialPeople,
  totalCount,
  currentPage,
  totalPages,
  pageSize = 25,
  sortBy,
  order,
  groupFilter,
  relationshipFilter,
  managementFilter = '',
  threatFilter = '',
  hasRecordFilter = '',
  contactRecencyFilter = '',
  recordRecencyFilter = '',
  query = '',
  cfFilter,
  quickCounts,
  dateFormat,
  availableGroups,
  relationshipTypes,
  customFieldTemplates,
  nameOrder,
  nameDisplayFormat,
  translations: tt,
  commonTranslations: tc,
}: PeopleListClientProps) {
  const t = useTranslations('people.bulk');
  const tPeople = useTranslations('people');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for optimistic status updates
  const [people, setPeople] = useState<PersonRow[]>(initialPeople);
  useEffect(() => {
    setPeople(initialPeople);
  }, [initialPeople]);

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const handleStatusUpdate = useCallback((id: string, newLevel: 'NORMAL' | 'SURVEILLANCE' | 'KEY_TARGET') => {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, managementLevel: newLevel } : p))
    );
  }, []);

  // Jump page input
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Search input state with enter submit
  const [searchInput, setSearchInput] = useState(query);
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const hasActiveFilters = Boolean(
    groupFilter ||
      relationshipFilter ||
      managementFilter ||
      threatFilter ||
      hasRecordFilter ||
      contactRecencyFilter ||
      recordRecencyFilter ||
      query ||
      cfFilter
  );

  const clearAllFilters = () => {
    setSearchInput('');
    router.push('/people');
  };

  // Save current people list URL so back link returns here
  useEffect(() => {
    const url = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    sessionStorage.setItem('backLink:/people', url);
  }, [pathname, searchParams]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllPages, setSelectAllPages] = useState(false);

  // Modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);

  const [groups, setGroups] = useState<Group[]>(availableGroups);

  const pageIds = useMemo(() => people.map((p) => p.id), [people]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 || selectAllPages;
  const effectiveCount = selectAllPages ? totalCount : selectedIds.size;

  const togglePerson = useCallback((id: string) => {
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

  const selectedNames = useMemo(() => {
    const fullName = (p: PersonRow) => formatCanonicalName(p, nameOrder);
    if (selectAllPages) return people.map(fullName);
    return people.filter((p) => selectedIds.has(p.id)).map(fullName);
  }, [selectedIds, selectAllPages, people, nameOrder]);

  const handleSuccess = useCallback(() => {
    clearSelection();
    setShowDeleteModal(false);
    setShowGroupModal(false);
    setShowRelationshipModal(false);
    setShowManagementModal(false);
    router.refresh();
  }, [clearSelection, router]);

  const handleDeleteSuccess = useCallback(() => {
    const count = effectiveCount;
    handleSuccess();
    toast.success(t('deleteSuccess', { count }));
  }, [effectiveCount, handleSuccess, t]);

  const handleGroupCreated = useCallback((group: Group) => {
    setGroups((prev) => [...prev, group]);
  }, []);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (groupFilter) params.set('group', groupFilter);
    if (relationshipFilter) params.set('relationship', relationshipFilter);
    if (managementFilter) params.set('managementLevel', managementFilter);
    if (threatFilter) params.set('threatLevel', threatFilter);
    if (hasRecordFilter) params.set('hasRecord', hasRecordFilter);
    if (contactRecencyFilter) params.set('contactRecency', contactRecencyFilter);
    if (recordRecencyFilter) params.set('recordRecency', recordRecencyFilter);
    if (query) params.set('q', query);
    if (cfFilter) params.set('cf', `${cfFilter.slug}:${cfFilter.value}`);
    if (pageSize !== 25) params.set('pageSize', String(pageSize));
    return params;
  }, [
    groupFilter,
    relationshipFilter,
    managementFilter,
    threatFilter,
    hasRecordFilter,
    contactRecencyFilter,
    recordRecencyFilter,
    query,
    cfFilter,
    pageSize,
  ]);

  const buildSortUrl = (col: string) => {
    const params = buildFilterParams();
    params.set('sortBy', col);
    params.set('order', sortBy === col && order === 'asc' ? 'desc' : 'asc');
    params.set('page', String(currentPage));
    return `/people?${params.toString()}`;
  };

  const fullNameSortKey = nameOrder === 'EASTERN' ? 'surname' : 'name';

  const buildPageUrl = (page: number, newPageSize?: number) => {
    const params = buildFilterParams();
    params.set('page', page.toString());
    if (newPageSize) params.set('pageSize', newPageSize.toString());
    if (sortBy !== 'name') params.set('sortBy', sortBy);
    if (order !== 'asc') params.set('order', order);
    return `/people?${params.toString()}`;
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (sortBy !== 'name') params.set('sortBy', sortBy);
    if (order !== 'asc') params.set('order', order);
    if (pageSize !== 25) params.set('pageSize', String(pageSize));

    const filters: Record<string, string> = {
      group: groupFilter,
      relationship: relationshipFilter,
      managementLevel: managementFilter,
      threatLevel: threatFilter,
      hasRecord: hasRecordFilter,
      contactRecency: contactRecencyFilter,
      recordRecency: recordRecencyFilter,
      q: query,
      cf: cfFilter ? `${cfFilter.slug}:${cfFilter.value}` : '',
      [key]: value,
    };

    if (filters.group) params.set('group', filters.group);
    if (filters.relationship) params.set('relationship', filters.relationship);
    if (filters.managementLevel) params.set('managementLevel', filters.managementLevel);
    if (filters.threatLevel) params.set('threatLevel', filters.threatLevel);
    if (filters.hasRecord) params.set('hasRecord', filters.hasRecord);
    if (filters.contactRecency) params.set('contactRecency', filters.contactRecency);
    if (filters.recordRecency) params.set('recordRecency', filters.recordRecency);
    if (filters.q) params.set('q', filters.q);
    if (filters.cf) params.set('cf', filters.cf);

    params.set('page', '1');
    router.push(`/people?${params.toString()}`);
  };

  const handleQuickChipClick = (type: 'all' | 'KEY_TARGET' | 'SURVEILLANCE' | 'highRisk' | 'criminal' | 'unassigned') => {
    const params = new URLSearchParams();
    if (sortBy !== 'name') params.set('sortBy', sortBy);
    if (order !== 'asc') params.set('order', order);
    if (pageSize !== 25) params.set('pageSize', String(pageSize));

    if (type === 'KEY_TARGET') {
      params.set('managementLevel', 'KEY_TARGET');
    } else if (type === 'SURVEILLANCE') {
      params.set('managementLevel', 'SURVEILLANCE');
    } else if (type === 'highRisk') {
      params.set('threatLevel', 'high');
    } else if (type === 'criminal') {
      params.set('hasRecord', 'true');
    } else if (type === 'unassigned') {
      params.set('group', 'none');
    }

    params.set('page', '1');
    router.push(`/people?${params.toString()}`);
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

  return (
    <>
      {/* 1. Tactical Quick Chips Bar */}
      {quickCounts && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 p-2 bg-surface rounded-lg border border-border">
          <span className="text-xs font-semibold text-muted px-1.5 py-1">Khoanh vùng nhanh:</span>

          <button
            type="button"
            onClick={() => handleQuickChipClick('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              !managementFilter && !threatFilter && !hasRecordFilter && !groupFilter
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-elevated text-foreground hover:bg-surface-elevated/80 border border-border'
            }`}
          >
            Tất cả ({quickCounts.totalAll})
          </button>

          <button
            type="button"
            onClick={() => handleQuickChipClick('KEY_TARGET')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
              managementFilter === 'KEY_TARGET'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-100'
            }`}
          >
            <span>🔴 Trọng điểm</span>
            <span className="opacity-90 font-bold">({quickCounts.countKeyTarget})</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChipClick('SURVEILLANCE')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
              managementFilter === 'SURVEILLANCE'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100'
            }`}
          >
            <span>🟠 Nghi vấn</span>
            <span className="opacity-90 font-bold">({quickCounts.countSurveillance})</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChipClick('highRisk')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
              threatFilter === 'high'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100'
            }`}
          >
            <span>⚠️ Nguy hiểm / Vũ khí</span>
            <span className="opacity-90 font-bold">({quickCounts.countHighRisk})</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChipClick('criminal')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
              hasRecordFilter === 'true'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100'
            }`}
          >
            <span>⛓️ Có tiền án</span>
            <span className="opacity-90 font-bold">({quickCounts.countCriminal})</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChipClick('unassigned')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
              groupFilter === 'none'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-surface-elevated text-muted border border-border hover:bg-surface-elevated/80'
            }`}
          >
            <span>👥 Chưa phân nhóm</span>
            <span className="opacity-90 font-bold">({quickCounts.countUnassignedGroup})</span>
          </button>
        </div>
      )}

      {/* 2. Search & Detailed Filter Bar */}
      <div className="mb-4 bg-surface border border-border rounded-lg p-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên, biệt danh, CCCD, biển số xe, hình xăm..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg bg-surface-elevated text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <svg
              className="w-4 h-4 text-muted absolute left-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  handleFilterChange('q', '');
                }}
                className="absolute right-2.5 top-2.5 text-muted hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
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

            {/* View Mode Switcher */}
            <div className="flex items-center border border-border rounded-lg bg-surface-elevated p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Hiển thị dạng thẻ hồ sơ trinh sát"
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
                title="Hiển thị dạng sổ danh sách quản lý"
              >
                <span>📋</span> Sổ quản lý
              </button>
            </div>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <select
            value={managementFilter}
            onChange={(e) => handleFilterChange('managementLevel', e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary"
          >
            <option value="">{tPeople('allManagementLevels')}</option>
            <option value="monitored">{tPeople('allMonitored')}</option>
            <option value="KEY_TARGET">🔴 {tPeople('form.managementLevels.KEY_TARGET')}</option>
            <option value="SURVEILLANCE">🟠 {tPeople('form.managementLevels.SURVEILLANCE')}</option>
            <option value="NORMAL">{tPeople('normalOnly')}</option>
          </select>

          <select
            value={groupFilter}
            onChange={(e) => handleFilterChange('group', e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary"
          >
            <option value="">{tPeople('allGroups')}</option>
            <option value="none">{tPeople('noGroup')}</option>
            {availableGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <select
            value={relationshipFilter}
            onChange={(e) => handleFilterChange('relationship', e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary"
          >
            <option value="">{tPeople('allRelationships')}</option>
            <option value="none">{tPeople('noRelationship')}</option>
            {relationshipTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>{rt.label}</option>
            ))}
          </select>

          {/* Temporal Investigation Filters */}
          <select
            value={contactRecencyFilter}
            onChange={(e) => handleFilterChange('contactRecency', e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary"
          >
            <option value="">-- Mức độ kiểm diện / Tiếp xúc --</option>
            <option value="uncontacted_30d">⚠️ Mất liên lạc &gt; 30 ngày</option>
            <option value="uncontacted_90d">🚨 Vắng mặt &gt; 90 ngày</option>
            <option value="contacted_7d">✅ Đã kiểm diện trong 7 ngày</option>
          </select>

          <select
            value={recordRecencyFilter}
            onChange={(e) => handleFilterChange('recordRecency', e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary"
          >
            <option value="">-- Mốc tiền án / tiền sự --</option>
            <option value="record_within_1y">⚡ Tiền án trong 1 năm qua (Mới về)</option>
            <option value="record_within_3y">📅 Tiền án trong 3 năm qua</option>
          </select>

          <CustomFieldFilter
            templates={customFieldTemplates}
            current={cfFilter}
            onChange={(value) => handleFilterChange('cf', value)}
          />

          {/* Page size selector */}
          <div className="flex items-center gap-1 border border-border rounded-lg bg-surface px-2 py-1 text-xs text-muted">
            <span>{tt.pageSize || 'Hiển thị'}:</span>
            {[25, 50, 100].map((size) => (
              <Link
                key={size}
                href={buildPageUrl(1, size)}
                className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                  pageSize === size ? 'bg-primary text-on-primary' : 'hover:bg-surface-elevated text-foreground'
                }`}
              >
                {size}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Showing count summary */}
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>{tt.showing}</span>
        {totalCount > 0 && (
          <span>
            {tt.page} {currentPage} {tt.of} {totalPages}
          </span>
        )}
      </div>

      {/* 3. People List Render (Grid or Table) */}
      {people.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-12 text-center">
          <p className="text-base text-muted-foreground mb-4">
            {totalCount === 0 && !hasActiveFilters
              ? 'Chưa có đối tượng nào trong hệ thống.'
              : 'Không tìm thấy đối tượng phù hợp với bộ lọc hiện tại.'}
          </p>
          {totalCount === 0 && !hasActiveFilters ? (
            <Link
              href="/people/new"
              className="inline-flex items-center px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              + Thêm đối tượng mới
            </Link>
          ) : (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center px-4 py-2 bg-surface-elevated border border-border text-foreground rounded-lg font-medium hover:bg-surface transition-colors"
            >
              ✕ Xóa bộ lọc tìm kiếm
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW - TACTICAL DOSSIER CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {people.map((person) => {
            const isSelected = selectedIds.has(person.id);
            return (
              <TacticalDossierCard
                key={person.id}
                person={person}
                isSelected={isSelected}
                onToggle={() => togglePerson(person.id)}
                nameOrder={nameOrder}
                onStatusUpdate={handleStatusUpdate}
              />
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW - ENHANCED DOSSIER LEDGER */
        <div className="bg-surface shadow-sm rounded-lg overflow-hidden border border-border mb-4">
          <div className="overflow-x-auto max-w-full">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePage}
                      className="w-4 h-4 text-primary bg-surface-elevated border-border rounded focus:ring-primary cursor-pointer"
                      title={t('selectAll')}
                      aria-label={t('selectAll')}
                    />
                  </th>
                  <th className="w-[32px] py-3 px-2" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    <Link
                      href={buildSortUrl(fullNameSortKey)}
                      className="flex items-center gap-1 hover:text-foreground py-2 -my-2 min-h-11 sm:min-h-0"
                    >
                      {tt.fullName}
                      {sortBy === fullNameSortKey && (
                        <span className="text-primary">{order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </Link>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    <Link
                      href={buildSortUrl('managementLevel')}
                      className="flex items-center gap-1 hover:text-foreground py-2 -my-2 min-h-11 sm:min-h-0"
                    >
                      Diện quản lý
                      {sortBy === 'managementLevel' && (
                        <span className="text-primary">{order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </Link>
                  </th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    <Link
                      href={buildSortUrl('citizenId')}
                      className="flex items-center gap-1 hover:text-foreground py-2 -my-2 min-h-11 sm:min-h-0"
                    >
                      Số CCCD / CMND
                      {sortBy === 'citizenId' && (
                        <span className="text-primary">{order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </Link>
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    <Link
                      href={buildSortUrl('lastContact')}
                      className="flex items-center gap-1 hover:text-foreground py-2 -my-2 min-h-11 sm:min-h-0"
                    >
                      Kiểm diện / Tiếp xúc
                      {sortBy === 'lastContact' && (
                        <span className="text-primary">{order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </Link>
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Án tích &amp; Vụ việc
                  </th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    <Link
                      href={buildSortUrl('group')}
                      className="flex items-center gap-1 hover:text-foreground py-2 -my-2 min-h-11 sm:min-h-0"
                    >
                      {tt.groups}
                      {sortBy === 'group' && (
                        <span className="text-primary">{order === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </Link>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                    {tt.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {people.map((person) => {
                  const isSelected = selectedIds.has(person.id);
                  const isOrphan =
                    person.relationshipsFrom.length === 0 &&
                    person.relationshipsTo.length === 0 &&
                    !person.relationshipToUser;
                  const fullDisplayName = formatCanonicalName(person, nameOrder);
                  const combinedName = formatCanonicalName(person, nameOrder, nameDisplayFormat);
                  const contactStatus = getContactStatusBadge(person.lastContact);

                  return (
                    <tr
                      key={person.id}
                      className={`hover:bg-surface-elevated transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="pl-4 pr-2 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePerson(person.id)}
                          className="w-4 h-4 text-primary bg-surface-elevated border-border rounded focus:ring-primary cursor-pointer"
                          aria-label={`Select ${fullDisplayName}`}
                        />
                      </td>
                      <td className="w-[32px] py-4 px-2">
                        <PersonAvatar
                          personId={person.id}
                          name={fullDisplayName}
                          photo={person.photo}
                          size={34}
                        />
                      </td>
                      {/* Name + Nickname */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <NameCell
                            href={`/people/${person.id}`}
                            label={combinedName}
                            isOrphan={isOrphan}
                            orphanWarning={tt.orphanWarning}
                            displayNameOverride={person.displayNameOverride}
                          />
                          {person.nickname && (
                            <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                              Biệt danh: &quot;{person.nickname}&quot;
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Management Level */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <QuickStatusSelector
                            personId={person.id}
                            currentLevel={person.managementLevel}
                            personName={fullDisplayName}
                            onUpdate={handleStatusUpdate}
                          />
                          {(person.threatLevel === 'HIGH' ||
                            person.threatLevel === 'ARMED_DANGEROUS') && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shadow-xs"
                              title={
                                person.threatLevel === 'ARMED_DANGEROUS'
                                  ? 'Có vũ khí, cực kỳ nguy hiểm'
                                  : 'Nguy hiểm cao'
                              }
                            >
                              ⚠️ {person.threatLevel === 'ARMED_DANGEROUS' ? 'Vũ khí' : 'Nguy hiểm'}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* CCCD */}
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-xs font-mono">
                        {person.citizenId ? (
                          <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border/70 font-semibold text-foreground">
                            {person.citizenId}
                          </span>
                        ) : (
                          <span className="text-muted italic">—</span>
                        )}
                      </td>
                      {/* Contact Status Badge */}
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-xs">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${contactStatus.badgeClass}`}
                        >
                          <span>{contactStatus.icon}</span>
                          <span>{contactStatus.label}</span>
                        </span>
                      </td>
                      {/* Records & Cases metrics */}
                      <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-elevated border border-border text-foreground"
                            title={`${person.criminalRecordsCount ?? 0} tiền án/tiền sự`}
                          >
                            <span>⚖️</span>
                            <span>{person.criminalRecordsCount ?? 0}</span>
                          </span>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-elevated border border-border text-foreground"
                            title={`${person.casesCount ?? 0} vụ án liên quan`}
                          >
                            <span>📁</span>
                            <span>{person.casesCount ?? 0}</span>
                          </span>
                        </div>
                      </td>
                      {/* Groups */}
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {person.groups.map((pg) => (
                            <span
                              key={pg.groupId}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: pg.group.color
                                  ? `${pg.group.color}20`
                                  : 'var(--badge-bg)',
                                color: pg.group.color || 'var(--badge-text)',
                              }}
                            >
                              {pg.group.name}
                            </span>
                          ))}
                          {person.groups.length === 0 && (
                            <span className="text-sm text-muted">{'—'}</span>
                          )}
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/people/${person.id}/edit`}
                            className="text-primary hover:text-primary-dark transition-colors"
                            title={tc.edit}
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </Link>
                          <Link
                            href={`/people/${person.id}`}
                            className="text-muted hover:text-foreground transition-colors"
                            title={tc.view}
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

        {/* Enhanced Pagination Bar */}
        {totalPages > 1 && (
          <div className="bg-surface px-4 py-3 border-t border-border sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Left: Summary & Jump Page */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-foreground">
                <p>
                  {tt.page} <span className="font-semibold">{currentPage}</span> / <span className="font-semibold">{totalPages}</span>
                  <span className="text-muted ml-2">({totalCount} đối tượng)</span>
                </p>

                <form onSubmit={handleJumpToPage} className="flex items-center gap-1.5 ml-2">
                  <span className="text-xs text-muted">{tt.jumpToPage || 'Đến trang'}:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    placeholder={String(currentPage)}
                    className="w-14 px-2 py-1 text-xs border border-border rounded bg-surface-elevated text-foreground focus:ring-1 focus:ring-primary text-center"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs bg-surface-elevated hover:bg-surface-elevated/80 border border-border rounded text-foreground font-medium"
                  >
                    {tt.jump || 'Đi'}
                  </button>
                </form>
              </div>

              {/* Right: Page Buttons */}
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {/* First Page */}
                {currentPage > 2 && (
                  <Link
                    href={buildPageUrl(1)}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-surface-elevated text-xs font-medium text-foreground hover:bg-surface-elevated/80"
                    title="Trang đầu"
                  >
                    «
                  </Link>
                )}

                {/* Previous Page */}
                {currentPage > 1 ? (
                  <Link
                    href={buildPageUrl(currentPage - 1)}
                    className={`relative inline-flex items-center px-3 py-2 border border-border bg-surface-elevated text-xs font-medium text-foreground hover:bg-surface-elevated/80 ${
                      currentPage <= 2 ? 'rounded-l-md' : ''
                    }`}
                  >
                    {tc.previous || '←'}
                  </Link>
                ) : (
                  <span className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-border bg-surface text-xs font-medium text-muted cursor-not-allowed">
                    {tc.previous || '←'}
                  </span>
                )}

                {/* Page numbers (up to 7 items) */}
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  return pageNum === currentPage ? (
                    <span
                      key={pageNum}
                      className="relative inline-flex items-center px-3 py-2 border border-primary bg-primary/10 text-xs font-bold text-primary"
                    >
                      {pageNum}
                    </span>
                  ) : (
                    <Link
                      key={pageNum}
                      href={buildPageUrl(pageNum)}
                      className="relative inline-flex items-center px-3 py-2 border border-border bg-surface-elevated text-xs font-medium text-foreground hover:bg-surface-elevated/80 transition-colors"
                    >
                      {pageNum}
                    </Link>
                  );
                })}

                {/* Next Page */}
                {currentPage < totalPages ? (
                  <Link
                    href={buildPageUrl(currentPage + 1)}
                    className={`relative inline-flex items-center px-3 py-2 border border-border bg-surface-elevated text-xs font-medium text-foreground hover:bg-surface-elevated/80 ${
                      currentPage >= totalPages - 1 ? 'rounded-r-md' : ''
                    }`}
                  >
                    {tc.next || '→'}
                  </Link>
                ) : (
                  <span className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-border bg-surface text-xs font-medium text-muted cursor-not-allowed">
                    {tc.next || '→'}
                  </span>
                )}

                {/* Last Page */}
                {currentPage < totalPages - 1 && (
                  <Link
                    href={buildPageUrl(totalPages)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-surface-elevated text-xs font-medium text-foreground hover:bg-surface-elevated/80"
                    title="Trang cuối"
                  >
                    »
                  </Link>
                )}
              </nav>
            </div>
          </div>
        )}

      {/* Floating action bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
          someSelected ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="bg-surface shadow-xl border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {selectAllPages
                  ? t('allSelected', { count: totalCount })
                  : t('selected', { count: selectedIds.size })}
              </span>
              {allPageSelected && !selectAllPages && totalCount > people.length && (
                <>
                  <span className="text-muted">·</span>
                  <button
                    onClick={handleSelectAllPages}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {t('selectAllPages', { count: totalCount })}
                  </button>
                </>
              )}
              <button
                onClick={clearSelection}
                className="text-muted hover:text-foreground transition-colors p-1"
                title={t('clearSelection')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowManagementModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <span>🛡️</span>
                <span>Chuyển diện quản lý</span>
              </button>
              <button
                onClick={() => setShowGroupModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-foreground bg-surface-elevated border border-border rounded-lg hover:bg-surface-elevated/80 transition-colors"
              >
                {t('addToGroups')}
              </button>
              <button
                onClick={() => setShowRelationshipModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-foreground bg-surface-elevated border border-border rounded-lg hover:bg-surface-elevated/80 transition-colors"
              >
                {t('setRelationship')}
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <BulkManagementLevelModal
        isOpen={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        selectedIds={Array.from(selectedIds)}
        selectAll={selectAllPages}
        totalCount={totalCount}
        onSuccess={handleSuccess}
      />

      <BulkDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        selectedIds={Array.from(selectedIds)}
        selectAll={selectAllPages}
        selectedNames={selectedNames}
        totalCount={totalCount}
        onSuccess={handleDeleteSuccess}
      />

      <BulkGroupAssignModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        selectedIds={Array.from(selectedIds)}
        selectAll={selectAllPages}
        totalCount={totalCount}
        availableGroups={groups}
        onSuccess={handleSuccess}
        onGroupCreated={handleGroupCreated}
      />

      <BulkRelationshipModal
        isOpen={showRelationshipModal}
        onClose={() => setShowRelationshipModal(false)}
        selectedIds={Array.from(selectedIds)}
        selectAll={selectAllPages}
        totalCount={totalCount}
        relationshipTypes={relationshipTypes}
        onSuccess={handleSuccess}
      />
    </>
  );
}
