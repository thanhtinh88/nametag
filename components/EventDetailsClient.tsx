'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { formatDate, type DateFormat } from '@/lib/date-format';
import { formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';
import { getCountryName } from '@/lib/countries';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import EventPeopleManager from '@/components/EventPeopleManager';
import EventRelationshipManager from '@/components/EventRelationshipManager';
import EventDeleteButton from '@/components/EventDeleteButton';
import ImmichGallerySection from '@/components/ImmichGallerySection';
import SuspectMatcherModal from '@/components/investigation/SuspectMatcherModal';
import CrimeSceneMapTab from '@/components/investigation/CrimeSceneMapTab';
import UnifiedNetworkGraph from '@/components/UnifiedNetworkGraph';
import { CASE_STATUS_COLORS } from './EventsListClient';

interface EventAddress {
  id: string;
  type: string;
  streetLine1?: string | null;
  streetLine2?: string | null;
  locality?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude: number | null;
  longitude: number | null;
  geocodeStatus?: string | null;
}

interface EventParticipant {
  id: string;
  personId: string;
  role: string | null;
  involvementType?: string;
  verificationStatus?: string;
  confidence?: string | null;
  reasonForSuspicion?: string | null;
  alibi?: string | null;
  notes: string | null;
  person: {
    id: string;
    name: string;
    surname?: string | null;
    nickname?: string | null;
    displayNameOverride?: string | null;
    photo?: string | null;
  };
}

interface JournalEntryItem {
  id: string;
  title: string;
  date: string | Date;
  body: string;
  people: Array<{
    person: {
      id: string;
      name: string;
      surname?: string | null;
      nickname?: string | null;
      displayNameOverride?: string | null;
    };
  }>;
}

export interface EventDetailsClientProps {
  event: {
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
    immichAlbumId?: string | null;
    groups: Array<{
      group: {
        id: string;
        name: string;
        color: string | null;
      };
    }>;
    addresses: EventAddress[];
    urls: Array<{ id: string; type: string; url: string }>;
    customFields: Array<{ id: string; key: string; value: string }>;
    people: EventParticipant[];
    relationshipsFrom: any[];
    journalEntries: Array<{ journalEntry: JournalEntryItem }>;
    mapCounts?: {
      markers: number;
      routes: number;
      drawings: number;
    };
  };
  availablePeople: any[];
  availableEvents: any[];
  immichConfigured: boolean;
  dateFormat: DateFormat;
  nameOrder?: 'WESTERN' | 'EASTERN';
  nameDisplayFormat?: NameDisplayFormat;
}

export default function EventDetailsClient({
  event: initialEvent,
  availablePeople,
  availableEvents,
  immichConfigured,
  dateFormat,
  nameOrder,
  nameDisplayFormat,
}: EventDetailsClientProps) {
  const t = useTranslations('events');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [event, setEvent] = useState(initialEvent);
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'network' | 'timeline'>('network');
  const [mapCounts, setMapCounts] = useState(
    initialEvent.mapCounts ?? { markers: 0, routes: 0, drawings: 0 }
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [graphRefreshKey, setGraphRefreshKey] = useState(0);

  const currentCaseStatus = event.caseStatus || 'UNRESOLVED';
  const colorDef = CASE_STATUS_COLORS[currentCaseStatus] || CASE_STATUS_COLORS.UNRESOLVED;

  const handleCaseStatusChange = async (newStatus: string) => {
    if (newStatus === currentCaseStatus) {
      setIsStatusMenuOpen(false);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseStatus: newStatus }),
      });

      if (!response.ok) throw new Error('Cập nhật thất bại');

      setEvent((prev) => ({ ...prev, caseStatus: newStatus }));
      toast.success(t('statusUpdatedToast', { status: t(`caseStatuses.${newStatus}`) }));
      setIsStatusMenuOpen(false);
      setGraphRefreshKey((k) => k + 1);
      router.refresh();
    } catch {
      toast.error('Không thể cập nhật trạng thái thụ lý vụ án');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleMutation = () => {
    setGraphRefreshKey((k) => k + 1);
    router.refresh();
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'ONGOING':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    }
  };

  // Participant counts summary
  const suspectCount = event.people.filter((p) => p.involvementType === 'SUSPECT').length;
  const poiCount = event.people.filter((p) => p.involvementType === 'PERSON_OF_INTEREST').length;
  const witnessCount = event.people.filter((p) => p.involvementType === 'WITNESS').length;
  const victimCount = event.people.filter((p) => p.involvementType === 'VICTIM').length;

  return (
    <div className="space-y-6">
      {/* 1. TOP CASE IDENTITY BAR */}
      <div className="bg-surface border border-border shadow-xs rounded-xl p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="space-y-3 flex-1 min-w-0">
            {/* Badges line: Case Code, Status, Crime Type */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {event.caseCode && (
                <span className="font-mono text-xs px-2.5 py-1 rounded bg-surface-elevated border border-border font-bold text-foreground tracking-wider">
                  {event.caseCode}
                </span>
              )}

              {/* Interactive Quick Status Switcher */}
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 focus:outline-none ${colorDef.badge}`}
                  title="Nhấp để đổi trạng thái thụ lý"
                >
                  <span className={`w-2 h-2 rounded-full ${colorDef.dot}`} />
                  <span>{t(`caseStatuses.${currentCaseStatus}`) || currentCaseStatus}</span>
                  <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isStatusMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsStatusMenuOpen(false)} />
                    <div className="absolute left-0 mt-1.5 w-56 rounded-lg bg-surface border border-border shadow-xl z-40 py-1.5 text-xs animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1 text-[11px] font-semibold text-muted uppercase tracking-wider border-b border-border mb-1">
                        Cập nhật trạng thái thụ lý
                      </div>
                      {(['UNRESOLVED', 'INVESTIGATING', 'SOLVED', 'SUSPENDED'] as const).map((st) => {
                        const active = st === currentCaseStatus;
                        const def = CASE_STATUS_COLORS[st];
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleCaseStatusChange(st)}
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

              {/* Event Progress Badge */}
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(
                  event.status
                )}`}
              >
                {t(`status.${event.status}`)}
              </span>

              {event.crimeType && (
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/25">
                  ⚖️ {event.crimeType}
                </span>
              )}

              {event.category && (
                <span className="text-xs text-muted-foreground font-medium">
                  • {event.category}
                </span>
              )}
            </div>

            {/* Case Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
              {event.title}
            </h1>

            {/* Dates & Time Notes */}
            {(event.startDate || event.endDate || event.incidentTimeNotes) && (
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                {(event.startDate || event.endDate) && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <span>📅</span>
                    <span>
                      {event.startDate ? formatDate(new Date(event.startDate), dateFormat) : ''}
                      {event.endDate ? ` - ${formatDate(new Date(event.endDate), dateFormat)}` : ''}
                    </span>
                  </span>
                )}
                {event.incidentTimeNotes && (
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                    <span>⏱️</span>
                    <span>{t('incidentTimeNotesLabel')}: {event.incidentTimeNotes}</span>
                  </span>
                )}
              </div>
            )}

            {/* Groups */}
            {event.groups.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {event.groups.map(({ group }) => (
                  <span
                    key={group.id}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${group.color || '#3B82F6'}20`,
                      color: group.color || '#3B82F6',
                    }}
                  >
                    👥 {group.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-wrap lg:justify-end shrink-0">
            <SuspectMatcherModal
              eventId={event.id}
              eventTitle={event.title}
              crimeType={event.crimeType}
              nameOrder={nameOrder}
              nameDisplayFormat={nameDisplayFormat}
            />

            <Link
              href={`/events/${event.id}/edit`}
              className="px-3.5 py-2 bg-surface-elevated hover:bg-surface border border-border text-foreground font-medium text-xs rounded-lg shadow-xs transition-colors"
            >
              ✏️ {tCommon('edit')}
            </Link>

            <EventDeleteButton
              eventId={event.id}
              eventTitle={event.title}
            />
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>📑</span> Hồ sơ
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'map'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>🗺️</span> Bản đồ hiện trường
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold">
            {mapCounts.markers + mapCounts.routes}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>🕒</span> Nhật ký
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-surface-elevated border border-border text-muted-foreground font-bold">
            {event.journalEntries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('network')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'network'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>🌐</span> Sơ đồ mạng lưới
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-bold">
            {event.people.length}
          </span>
        </button>
      </div>

      {/* 3. TAB CONTENTS */}      

      {/* TAB: CRIME SCENE & EVIDENCE MAP */}
      {activeTab === 'map' && (
        <CrimeSceneMapTab
          eventId={event.id}
          eventTitle={event.title}
          caseCode={event.caseCode}
          immichAlbumId={event.immichAlbumId}
          casePeople={event.people}
          availablePeople={availablePeople}
          onCountChange={setMapCounts}
        />
      )}

      {/* TAB 1: OVERVIEW & DOSSIER */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Damage Assessment Alert */}
          {event.damageAssessment && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
              <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>💥</span> {t('damageAssessmentLabel')}
              </h3>
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                {event.damageAssessment}
              </p>
            </div>
          )}

          {/* Description & Modus Operandi */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
              📝 Diễn biến vụ việc & Phương thức thủ đoạn
            </h2>
            {event.description ? (
              <MarkdownRenderer content={event.description} />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Chưa có nội dung mô tả chi tiết vụ án.
              </p>
            )}
          </div>

          {/* Crime Scene Addresses */}
          {event.addresses.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>📍</span> Hiện trường & Địa điểm xảy ra vụ việc ({event.addresses.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {event.addresses.map((address) => (
                  <div
                    key={address.id}
                    className="p-3.5 rounded-lg border border-border bg-surface-elevated"
                  >
                    {address.type && (
                      <span className="text-xs font-bold uppercase tracking-wide text-primary block mb-1">
                        {address.type}
                      </span>
                    )}
                    {address.streetLine1 && (
                      <div className="text-sm font-medium text-foreground">
                        {address.streetLine1}
                      </div>
                    )}
                    {address.streetLine2 && (
                      <div className="text-sm text-foreground">
                        {address.streetLine2}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[address.locality, address.region, address.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                    {address.country && (
                      <div className="text-xs text-muted-foreground">
                        {getCountryName(address.country) || address.country}
                      </div>
                    )}
                    {address.latitude !== null && address.longitude !== null && (
                      <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>
                          📍 {Number(address.latitude).toFixed(6)}, {Number(address.longitude).toFixed(6)}
                        </span>
                        <Link
                          href={`/map?focus=evaddr_${address.id}`}
                          className="text-primary hover:underline font-sans font-semibold"
                        >
                          Xem bản đồ →
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Immich Crime Scene Gallery */}
          <ImmichGallerySection
            mode="event"
            entityId={event.id}
            initialImmichAlbumId={event.immichAlbumId}
            immichConfigured={immichConfigured}
          />

          {/* URLs & Attachments */}
          {event.urls.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                🔗 Tài liệu & Liên kết hồ sơ ({event.urls.length})
              </h2>
              <div className="space-y-2">
                {event.urls.map((u) => (
                  <div key={u.id} className="text-sm flex items-center gap-2">
                    {u.type && (
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        {u.type}:
                      </span>
                    )}
                    <a
                      href={u.url.startsWith('http') ? u.url : `https://${u.url}`}
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
            <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                ⚙️ Thuộc tính bổ sung
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {event.customFields.map((cf) => (
                  <div key={cf.id} className="p-3 bg-surface-elevated rounded-lg border border-border">
                    <span className="text-xs text-muted-foreground block font-medium">
                      {cf.key}
                    </span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block">
                      {cf.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INVESTIGATION TIMELINE & JOURNAL */}
      {activeTab === 'timeline' && (
        <div className="bg-surface border border-border shadow-xs rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t('journalTitle', { count: event.journalEntries.length })}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('journalDescription')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/journal?event=${event.id}`}
                className="text-xs text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/10 transition-colors font-medium"
              >
                {t('viewAllJournalEntries', { count: event.journalEntries.length })}
              </Link>
              <Link
                href={`/journal/new?event=${event.id}`}
                className="text-xs font-semibold bg-primary text-on-primary rounded-md px-3 py-1.5 hover:opacity-90 transition-opacity"
              >
                + Ghi chép mới
              </Link>
            </div>
          </div>

          {event.journalEntries.length > 0 ? (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-border">
              {event.journalEntries.map(({ journalEntry }) => (
                <div key={journalEntry.id} className="relative pl-8">
                  <div className="absolute left-1.5 top-2 w-3 h-3 rounded-full bg-primary ring-4 ring-surface" />
                  <Link
                    href={`/journal/${journalEntry.id}`}
                    className="block p-4 rounded-xl border border-border bg-surface-elevated hover:border-primary/40 transition-colors shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <span className="text-sm font-bold text-foreground">
                        {journalEntry.title}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium shrink-0">
                        {formatDate(new Date(journalEntry.date), dateFormat)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {journalEntry.body.replace(/[#*_`~>-]/g, '').trim()}
                    </p>
                    {journalEntry.people.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border/60">
                        {journalEntry.people.map(({ person }) => (
                          <span
                            key={person.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                          >
                            👤 {formatGraphName(person, nameOrder, nameDisplayFormat)}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {t('noJournalEntries')}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: UNIFIED NETWORK GRAPH & PARTICIPANTS */}
      {activeTab === 'network' && (
        <div className="space-y-6">
          {/* A. Participant Statistics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="text-xs font-semibold text-red-700 dark:text-red-300">
                🔴 Nghi can chính
              </div>
              <div className="text-xl font-bold text-foreground mt-1">{suspectCount}</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                🟠 Đối tượng nghi vấn
              </div>
              <div className="text-xl font-bold text-foreground mt-1">{poiCount}</div>
            </div>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
              <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                🔵 Nhân chứng / Báo tin
              </div>
              <div className="text-xl font-bold text-foreground mt-1">{witnessCount}</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                🟣 Bị hại
              </div>
              <div className="text-xl font-bold text-foreground mt-1">{victimCount}</div>
            </div>
          </div>

          {/* B. Integrated People Manager (Allows adding, editing, verifying, and removing subjects) */}
          <EventPeopleManager
            eventId={event.id}
            participants={event.people}
            availablePeople={availablePeople}
            nameOrder={nameOrder}
            nameDisplayFormat={nameDisplayFormat}
            onMutate={handleMutation}
          />

          {/* C. Integrated Related Events Manager (Allows adding and linking other cases) */}
          <EventRelationshipManager
            eventId={event.id}
            relationships={event.relationshipsFrom}
            availableEvents={availableEvents}
            onMutate={handleMutation}
          />
          
          {/* D. Embedded Interactive D3 Network Graph */}
          <div className="bg-surface border border-border rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>🕸️</span> Sơ đồ tương quan đối tượng & Vụ án
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trực quan hóa mạng lưới liên can giữa các đối tượng trong chuyên án, các vụ án liên đới và quan hệ xã hội
                </p>
              </div>              
            </div>

            {/* Canvas Container */}
            <div className="w-full relative rounded-lg overflow-hidden border border-border bg-surface shadow-inner">
              <UnifiedNetworkGraph
                apiEndpoint={`/api/events/${event.id}/graph`}
                compact={true}
                refreshKey={graphRefreshKey}
              />
            </div>
          </div>          
        </div>
      )}
    </div>
  );
}
