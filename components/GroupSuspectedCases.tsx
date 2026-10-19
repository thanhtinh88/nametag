'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import PersonAvatar from './PersonPhoto';
import { formatDate, type DateFormat } from '@/lib/date-format';
import { formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';

export interface GroupMemberItem {
  id: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
  photo?: string | null;
}

export interface CaseInvolvedMemberItem {
  id: string;
  personId: string;
  role: string | null;
  involvementType?: string;
  verificationStatus?: string;
  confidence?: string | null;
  reasonForSuspicion?: string | null;
  alibi?: string | null;
  notes: string | null;
  person: GroupMemberItem;
}

export interface CaseAddressItem {
  id: string;
  streetLine1?: string | null;
  locality?: string | null;
  region?: string | null;
  country?: string | null;
}

export interface SuspectedCaseItem {
  id: string;
  title: string;
  caseCode?: string | null;
  crimeType?: string | null;
  caseStatus?: string | null;
  status: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  incidentTimeNotes?: string | null;
  damageAssessment?: string | null;
  isDirectlyAssignedToGroup: boolean;
  addresses: CaseAddressItem[];
  involvedGroupMembers: CaseInvolvedMemberItem[];
}

interface GroupSuspectedCasesProps {
  groupId: string;
  groupName: string;
  cases: SuspectedCaseItem[];
  groupMembers: GroupMemberItem[];
  dateFormat?: DateFormat;
  nameOrder?: 'WESTERN' | 'EASTERN';
  nameDisplayFormat?: NameDisplayFormat;
}

const INVOLVEMENT_BADGE_CLASSES: Record<string, string> = {
  SUSPECT: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30',
  PERSON_OF_INTEREST: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  ACCOMPLICE: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30',
  WITNESS: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30',
  VICTIM: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30',
  INFORMANT: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30',
};

const VERIFICATION_BADGE_CLASSES: Record<string, string> = {
  HYPOTHESIS: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border border-dashed border-yellow-500/60',
  INVESTIGATING: 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border border-dashed border-orange-500/60',
  CONFIRMED: 'bg-red-600 text-white font-semibold shadow-sm',
  RULED_OUT: 'bg-muted/40 text-muted-foreground line-through border border-border',
};

const caseStatusBadgeClass = (status?: string | null) => {
  switch (status) {
    case 'UNRESOLVED':
      return 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 font-semibold';
    case 'INVESTIGATING':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium';
    case 'SOLVED':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-medium';
    case 'SUSPENDED':
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 font-medium';
    default:
      return 'bg-muted/30 text-muted-foreground border border-border';
  }
};

export default function GroupSuspectedCases({
  cases,
  groupMembers,
  dateFormat = 'DMY',
  nameOrder,
  nameDisplayFormat,
}: GroupSuspectedCasesProps) {
  const t = useTranslations('groups.suspectedCases');
  const tEvents = useTranslations('events');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');

  const involvementLabels: Record<string, string> = {
    SUSPECT: tEvents('involvementTypes.SUSPECT'),
    PERSON_OF_INTEREST: tEvents('involvementTypes.PERSON_OF_INTEREST'),
    ACCOMPLICE: tEvents('involvementTypes.ACCOMPLICE'),
    WITNESS: tEvents('involvementTypes.WITNESS'),
    VICTIM: tEvents('involvementTypes.VICTIM'),
    INFORMANT: tEvents('involvementTypes.INFORMANT'),
  };

  const verificationLabels: Record<string, string> = {
    HYPOTHESIS: tEvents('verificationStatuses.HYPOTHESIS'),
    INVESTIGATING: tEvents('verificationStatuses.INVESTIGATING'),
    CONFIRMED: tEvents('verificationStatuses.CONFIRMED'),
    RULED_OUT: tEvents('verificationStatuses.RULED_OUT'),
  };

  const confidenceLabels: Record<string, string> = {
    HIGH: tEvents('confidenceLevels.HIGH'),
    MEDIUM: tEvents('confidenceLevels.MEDIUM'),
    LOW: tEvents('confidenceLevels.LOW'),
  };

  const caseStatusLabels: Record<string, string> = {
    UNRESOLVED: tEvents('caseStatuses.UNRESOLVED'),
    INVESTIGATING: tEvents('caseStatuses.INVESTIGATING'),
    SOLVED: tEvents('caseStatuses.SOLVED'),
    SUSPENDED: tEvents('caseStatuses.SUSPENDED'),
  };

  // Filter cases based on search and filters
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // Status filter
      if (selectedStatus !== 'ALL') {
        if ((c.caseStatus || 'UNRESOLVED') !== selectedStatus) {
          return false;
        }
      }

      // Member filter
      if (selectedMemberId !== 'ALL') {
        const hasMember = c.involvedGroupMembers.some(
          (m) => m.personId === selectedMemberId
        );
        if (!hasMember) return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = c.title.toLowerCase().includes(q);
        const codeMatch = c.caseCode?.toLowerCase().includes(q);
        const crimeMatch = c.crimeType?.toLowerCase().includes(q);
        const notesMatch = c.incidentTimeNotes?.toLowerCase().includes(q);
        const damageMatch = c.damageAssessment?.toLowerCase().includes(q);
        const memberMatch = c.involvedGroupMembers.some((m) => {
          const name = formatGraphName(m.person, nameOrder, nameDisplayFormat).toLowerCase();
          const role = m.role?.toLowerCase() || '';
          const reason = m.reasonForSuspicion?.toLowerCase() || '';
          return name.includes(q) || role.includes(q) || reason.includes(q);
        });

        if (!titleMatch && !codeMatch && !crimeMatch && !notesMatch && !damageMatch && !memberMatch) {
          return false;
        }
      }

      return true;
    });
  }, [cases, selectedStatus, selectedMemberId, searchQuery, nameOrder, nameDisplayFormat]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedStatus !== 'ALL' || selectedMemberId !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedMemberId('ALL');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">
              {t('title')}
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              {t('badgeCount', { count: cases.length })}
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {cases.length > 0 && (
        <div className="bg-surface-subtle p-3.5 rounded-lg border border-border flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full text-sm bg-surface border border-input rounded-md pl-9 pr-3 py-1.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <svg
              className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs sm:text-sm bg-surface border border-input rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">{t('filterByStatus')}</option>
              <option value="UNRESOLVED">{caseStatusLabels.UNRESOLVED}</option>
              <option value="INVESTIGATING">{caseStatusLabels.INVESTIGATING}</option>
              <option value="SOLVED">{caseStatusLabels.SOLVED}</option>
              <option value="SUSPENDED">{caseStatusLabels.SUSPENDED}</option>
            </select>

            {/* Member Filter */}
            {groupMembers.length > 1 && (
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="text-xs sm:text-sm bg-surface border border-input rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px] truncate"
              >
                <option value="ALL">{t('filterByMember')}</option>
                {groupMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {formatGraphName(member, nameOrder, nameDisplayFormat)}
                  </option>
                ))}
              </select>
            )}

            {/* Reset button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-primary hover:underline px-2 py-1"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Case List */}
      {cases.length === 0 ? (
        <div className="text-center py-10 px-4 border border-dashed border-border rounded-lg bg-surface-subtle/50">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted/20 flex items-center justify-center text-muted text-xl mb-3">
            ⚖️
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {t('empty')}
          </h3>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">
            {t('emptyDescription')}
          </p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="text-center py-8 px-4 border border-border rounded-lg bg-surface-subtle/30">
          <p className="text-sm text-muted">{t('noMatches')}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-2 text-xs text-primary font-medium hover:underline"
          >
            {t('clearFilters')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((caseItem) => {
            const formattedDate = caseItem.startDate
              ? formatDate(new Date(caseItem.startDate), dateFormat)
              : null;

            const addressText = caseItem.addresses
              .map((a) => [a.streetLine1, a.locality, a.region].filter(Boolean).join(', '))
              .filter(Boolean)
              .join('; ');

            return (
              <div
                key={caseItem.id}
                className="border border-border rounded-xl bg-surface p-4 sm:p-5 shadow-sm hover:shadow transition-shadow space-y-4"
              >
                {/* Case Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {caseItem.caseCode && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted/30 border border-border font-bold text-foreground">
                          {caseItem.caseCode}
                        </span>
                      )}

                      <Link
                        href={`/events/${caseItem.id}`}
                        className="text-base sm:text-lg font-bold text-foreground hover:text-primary transition-colors hover:underline break-words"
                      >
                        {caseItem.title}
                      </Link>

                      {caseItem.caseStatus && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${caseStatusBadgeClass(
                            caseItem.caseStatus
                          )}`}
                        >
                          {caseStatusLabels[caseItem.caseStatus] || caseItem.caseStatus}
                        </span>
                      )}

                      {caseItem.isDirectlyAssignedToGroup && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                          {t('assignedToGroupBadge')}
                        </span>
                      )}
                    </div>

                    {/* Sub metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {caseItem.crimeType && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                          ⚖️ {caseItem.crimeType}
                        </span>
                      )}

                      {formattedDate && (
                        <span className="inline-flex items-center gap-1">
                          📅 {t('incidentDate')}: <span className="text-foreground font-medium">{formattedDate}</span>
                        </span>
                      )}

                      {caseItem.incidentTimeNotes && (
                        <span className="text-amber-700 dark:text-amber-400">
                          ⏱️ {caseItem.incidentTimeNotes}
                        </span>
                      )}

                      {addressText && (
                        <span className="inline-flex items-center gap-1 truncate max-w-md" title={addressText}>
                          📍 {addressText}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <Link
                      href={`/events/${caseItem.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md border border-border bg-surface-subtle hover:bg-surface-subtle/80 text-foreground transition-colors"
                    >
                      <span>{t('viewCase')}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>

                {/* Damage notes if any */}
                {caseItem.damageAssessment && (
                  <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 px-3 py-2 rounded-md">
                    <span className="font-semibold">{t('damage')}: </span>
                    {caseItem.damageAssessment}
                  </div>
                )}

                {/* Involved Group Members */}
                {caseItem.involvedGroupMembers.length > 0 && (
                  <div className="pt-2 border-t border-border/70 space-y-2.5">
                    <div className="text-xs font-semibold text-muted tracking-wide uppercase">
                      {t('involvedMembers', { count: caseItem.involvedGroupMembers.length })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {caseItem.involvedGroupMembers.map((memberRel) => {
                        const memberName = formatGraphName(
                          memberRel.person,
                          nameOrder,
                          nameDisplayFormat
                        );
                        const invClass = memberRel.involvementType
                          ? INVOLVEMENT_BADGE_CLASSES[memberRel.involvementType] || 'bg-muted/40 text-muted-foreground'
                          : 'bg-muted/40 text-muted-foreground';
                        const verClass = memberRel.verificationStatus
                          ? VERIFICATION_BADGE_CLASSES[memberRel.verificationStatus] || ''
                          : '';

                        return (
                          <div
                            key={memberRel.id}
                            className="bg-surface-subtle/70 border border-border/80 rounded-lg p-3 space-y-2 hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <PersonAvatar
                                  personId={memberRel.person.id}
                                  name={memberName}
                                  photo={memberRel.person.photo}
                                  size={28}
                                />
                                <Link
                                  href={`/people/${memberRel.person.id}`}
                                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate hover:underline"
                                >
                                  {memberName}
                                </Link>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                                {memberRel.involvementType && (
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${invClass}`}>
                                    {involvementLabels[memberRel.involvementType] || memberRel.involvementType}
                                  </span>
                                )}
                                {memberRel.verificationStatus && (
                                  <span className={`px-2 py-0.5 rounded text-[11px] ${verClass}`}>
                                    {verificationLabels[memberRel.verificationStatus] || memberRel.verificationStatus}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Role / Reason details */}
                            <div className="space-y-1 text-xs">
                              {memberRel.role && (
                                <div className="text-foreground">
                                  <span className="text-muted font-medium">{t('role')}: </span>
                                  <span className="font-semibold">{memberRel.role}</span>
                                </div>
                              )}

                              {memberRel.confidence && (
                                <div className="text-muted">
                                  {t('confidencePrefix', {
                                    level: confidenceLabels[memberRel.confidence] || memberRel.confidence,
                                  })}
                                </div>
                              )}

                              {memberRel.reasonForSuspicion && (
                                <div className="bg-surface border border-border/60 p-2 rounded text-muted-foreground italic">
                                  <span className="not-italic font-medium text-foreground">
                                    {t('reason')}:{' '}
                                  </span>
                                  &ldquo;{memberRel.reasonForSuspicion}&rdquo;
                                </div>
                              )}

                              {memberRel.alibi && (
                                <div className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{t('alibi')}: </span>
                                  {memberRel.alibi}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

