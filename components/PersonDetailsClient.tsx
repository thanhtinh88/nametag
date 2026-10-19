'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import PhotoLightbox from '@/components/PhotoLightbox';
import PersonAvatar from '@/components/PersonPhoto';
import PersonActionsMenu from '@/components/PersonActionsMenu';
import LastContactQuickUpdate from '@/components/LastContactQuickUpdate';
import RetryGeocodeButton from '@/components/RetryGeocodeButton';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import MessagingLinks from '@/components/MessagingLinks';
import PersonInvestigationDossier from '@/components/investigation/PersonInvestigationDossier';
import RelationshipManager from '@/components/RelationshipManager';
import PersonEventsManager from '@/components/PersonEventsManager';
import JournalSection from '@/components/JournalSection';
import ImmichGallerySection from '@/components/ImmichGallerySection';
import UnifiedNetworkGraph from '@/components/UnifiedNetworkGraph';
import PersonVCardRawView from '@/components/PersonVCardRawView';
import { formatDate, formatDateWithoutYear, isYearUnknownDate, type DateFormat } from '@/lib/date-format';
import { formatCanonicalName, formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';
import { getCountryName } from '@/lib/countries';
import { getDateDisplayTitle } from '@/lib/important-date-types';

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export interface PersonDetailsClientProps {
  person: any;
  availablePeople: any[];
  relationshipTypes: any[];
  hasCardDavConnection: boolean;
  latestJournalEntry: any;
  allEvents: any[];
  immichConfigured: boolean;
  dateFormat: DateFormat;
  nameOrder?: 'WESTERN' | 'EASTERN';
  nameDisplayFormat?: NameDisplayFormat;
  userLanguage?: string;
  contactReminderDesc: string | null;
}

export default function PersonDetailsClient({
  person: initialPerson,
  availablePeople,
  relationshipTypes,
  hasCardDavConnection,
  latestJournalEntry,
  allEvents,
  immichConfigured,
  dateFormat,
  nameOrder,
  nameDisplayFormat,
  userLanguage = 'vi',
  contactReminderDesc,
}: PersonDetailsClientProps) {
  const t = useTranslations('people');
  const tForm = useTranslations('people.form');
  const tDates = useTranslations('people.form.importantDates');
  const tCf = useTranslations('customFields.person');

  const [person, setPerson] = useState(initialPerson);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Check if subject has investigation profile data
  const hasInvestigationData =
    person.managementLevel !== 'NORMAL' ||
    Boolean(person.citizenId) ||
    Boolean(person.residenceStatus) ||
    Boolean(person.heightCm) ||
    Boolean(person.weightKg) ||
    Boolean(person.bloodType) ||
    Boolean(person.modusOperandi) ||
    Boolean(person.riskNotes) ||
    (person.vehicles && person.vehicles.length > 0) ||
    (person.physicalMarks && person.physicalMarks.length > 0) ||
    (person.criminalRecords && person.criminalRecords.length > 0) ||
    (person.gangMemberships && person.gangMemberships.length > 0) ||
    (person.bankAccounts && person.bankAccounts.length > 0);

  // Default tab: investigation if monitored or has investigation data, else network
  const [activeTab, setActiveTab] = useState<'investigation' | 'network' | 'journal'>(
    hasInvestigationData ? 'investigation' : 'network'
  );

  const handleManagementLevelChange = async (newLevel: 'NORMAL' | 'SURVEILLANCE' | 'KEY_TARGET') => {
    if (newLevel === person.managementLevel) return;
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/people/${person.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managementLevel: newLevel }),
      });
      if (!response.ok) throw new Error('Failed to update');
      setPerson((prev: any) => ({ ...prev, managementLevel: newLevel }));
      toast.success(t('quickStatusSuccess') || 'Đã cập nhật diện quản lý thành công');
    } catch {
      toast.error(t('quickStatusFailed') || 'Không thể cập nhật diện quản lý');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}: ${text}`);
  };

  const investigationPerson = {
    id: person.id,
    managementLevel: person.managementLevel,
    threatLevel: person.threatLevel,
    citizenId: person.citizenId,
    citizenIdIssueDate: person.citizenIdIssueDate,
    citizenIdIssuePlace: person.citizenIdIssuePlace,
    residenceStatus: person.residenceStatus,
    heightCm: person.heightCm,
    weightKg: person.weightKg,
    bloodType: person.bloodType,
    modusOperandi: person.modusOperandi,
    riskNotes: person.riskNotes,
    vehicles: person.vehicles || [],
    physicalMarks: person.physicalMarks || [],
    criminalRecords: person.criminalRecords || [],
    gangMemberships: person.gangMemberships || [],
    bankAccounts: person.bankAccounts || [],
  };

  const displayName = formatGraphName(person, nameOrder, nameDisplayFormat);
  const canonicalName = formatCanonicalName(person, nameOrder);

  // Total counts for tab badges
  const investigationItemCount =
    (person.criminalRecords?.length || 0) +
    (person.vehicles?.length || 0) +
    (person.physicalMarks?.length || 0) +
    (person.gangMemberships?.length || 0);

  const relationshipsCount = (person.relationshipsTo?.length || 0) + (person.events?.length || 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Banner */}
      <div className="bg-surface shadow rounded-xl p-6 border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-5">
          <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
            <PhotoLightbox
              personId={person.id}
              name={displayName}
              photo={person.photo}
            >
              <div className="relative group cursor-pointer">
                <PersonAvatar
                  personId={person.id}
                  name={displayName}
                  photo={person.photo}
                  size={80}
                  loading="eager"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-full transition-opacity flex items-center justify-center text-white text-xs font-medium">
                  🔍
                </div>
              </div>
            </PhotoLightbox>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
                  {displayName}
                </h1>
                {person.nickname && (
                  <span className="text-lg text-muted font-normal">
                    (&apos;{person.nickname}&apos;)
                  </span>
                )}
              </div>

              {/* Status Badges & Quick Dropdown */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {/* Management Level Dropdown */}
                <div className="relative inline-block">
                  <select
                    value={person.managementLevel || 'NORMAL'}
                    disabled={isUpdatingStatus}
                    onChange={(e) =>
                      handleManagementLevelChange(
                        e.target.value as 'NORMAL' | 'SURVEILLANCE' | 'KEY_TARGET'
                      )
                    }
                    className={`text-xs font-bold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer appearance-none pr-6 ${
                      person.managementLevel === 'KEY_TARGET'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800'
                        : person.managementLevel === 'SURVEILLANCE'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        : 'bg-surface-elevated text-foreground border-border hover:bg-surface'
                    }`}
                  >
                    <option value="NORMAL">⚪ Dân cư bình thường</option>
                    <option value="SURVEILLANCE">🟠 Đối tượng nghi vấn</option>
                    <option value="KEY_TARGET">🔴 Đối tượng trọng điểm</option>
                  </select>
                  <span className="absolute right-2 top-1.5 text-[10px] pointer-events-none opacity-60">▼</span>
                </div>

                {/* Threat Level */}
                {person.threatLevel === 'ARMED_DANGEROUS' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-red-600 text-white shadow-sm">
                    ⚠️ {tForm('threatLevels.ARMED_DANGEROUS')}
                  </span>
                )}
                {person.threatLevel === 'HIGH' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-600 text-white shadow-sm">
                    ⚠️ {tForm('threatLevels.HIGH')}
                  </span>
                )}

                {/* Groups pills */}
                {person.groups && person.groups.map((pg: any) => (
                  <span
                    key={pg.groupId}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: pg.group.color ? `${pg.group.color}20` : 'var(--badge-bg)',
                      color: pg.group.color || 'var(--badge-text)',
                    }}
                  >
                    {pg.group.name}
                  </span>
                ))}

                {/* CardDAV Status */}
                {hasCardDavConnection && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                      person.cardDavSyncEnabled ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30' : 'text-muted bg-surface-elevated'
                    }`}
                    title={person.cardDavSyncEnabled ? t('cardDavSynced') : t('cardDavNotSynced')}
                  >
                    <span>{person.cardDavSyncEnabled ? '✓' : '—'}</span>
                    <span>CardDAV</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto mt-2 sm:mt-0">
            <Link
              href={`/people/${person.id}/edit`}
              className="flex-1 sm:flex-none px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary-dark transition-colors text-center text-sm shadow-sm"
            >
              {t('edit')}
            </Link>

            <PersonActionsMenu
              personId={person.id}
              personName={displayName}
              person={person}
              hasCardDavSync={Boolean(hasCardDavConnection && person.cardDavMapping)}
              allPeople={availablePeople}
              nameOrder={nameOrder}
              nameDisplayFormat={nameDisplayFormat}
            />
          </div>
        </div>
      </div>

      {/* 2. Dashboard Layout (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Full Identity & Personal Dossier Sidebar (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Core Identification & Personal Dossier */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <span>🪪</span>
                <span>Hồ sơ nhận dạng & Nhân thân</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-elevated text-muted">
                ID: {person.id.slice(-6)}
              </span>
            </div>

            {/* CCCD Highlight Tile */}
            {person.citizenId && (
              <div className="p-3 bg-surface-elevated rounded-lg border border-border/70 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-muted block font-medium">Số CCCD / CMND</span>
                  <span className="font-mono text-base font-bold text-foreground tracking-wide">
                    {person.citizenId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(person.citizenId, 'CCCD')}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface text-foreground border border-border hover:bg-surface-elevated transition-colors flex items-center gap-1 shadow-xs"
                  title="Sao chép CCCD"
                >
                  <span>📋</span>
                  <span>Sao chép</span>
                </button>
              </div>
            )}

            {/* Ngày cấp & Nơi cấp CCCD */}
            {(person.citizenIdIssueDate || person.citizenIdIssuePlace) && (
              <div className="p-2.5 bg-surface-elevated/60 rounded-lg text-xs space-y-0.5 border border-border/40">
                <span className="text-muted block font-medium">Cấp ngày & Nơi cấp:</span>
                <div className="text-foreground font-medium leading-relaxed">
                  {[
                    person.citizenIdIssueDate ? formatDate(person.citizenIdIssueDate, dateFormat) : null,
                    person.citizenIdIssuePlace,
                  ].filter(Boolean).join(' — ')}
                </div>
              </div>
            )}

            {/* Sub-grid 2 columns for quick personal attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {person.residenceStatus && (
                <div className="p-2.5 bg-surface-elevated rounded-lg border border-border/50">
                  <span className="text-muted block text-[11px] mb-0.5">Tình trạng cư trú</span>
                  <span className="font-semibold text-foreground">
                    {tForm(`residenceStatuses.${person.residenceStatus}`) || person.residenceStatus}
                  </span>
                </div>
              )}

              {person.gender && (
                <div className="p-2.5 bg-surface-elevated rounded-lg border border-border/50">
                  <span className="text-muted block text-[11px] mb-0.5">Giới tính</span>
                  <span className="font-semibold text-foreground">{person.gender}</span>
                </div>
              )}

              {(person.heightCm || person.weightKg) && (
                <div className="p-2.5 bg-surface-elevated rounded-lg border border-border/50">
                  <span className="text-muted block text-[11px] mb-0.5">Thể hình (Cao / Nặng)</span>
                  <span className="font-semibold text-foreground">
                    {person.heightCm ? `${person.heightCm} cm` : '—'} / {person.weightKg ? `${person.weightKg} kg` : '—'}
                  </span>
                </div>
              )}

              {person.bloodType && (
                <div className="p-2.5 bg-surface-elevated rounded-lg border border-border/50">
                  <span className="text-muted block text-[11px] mb-0.5">Nhóm máu</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{person.bloodType}</span>
                </div>
              )}
            </div>

            {/* Nơi làm việc & Chức vụ */}
            {(person.organization || person.jobTitle) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                {person.organization && (
                  <div className="p-2.5 bg-surface-elevated rounded-lg border border-border/50">
                    <span className="text-muted block text-[11px] mb-0.5">Nơi làm việc / Cơ quan</span>
                    <span className="font-medium text-foreground leading-snug block">{person.organization}</span>
                  </div>
                )}
                {person.jobTitle && (
                  <div className="p-2.5 bg-surface-elevated rounded-lg border border-border/50">
                    <span className="text-muted block text-[11px] mb-0.5">Chức danh / Chức vụ</span>
                    <span className="font-medium text-foreground leading-snug block">{person.jobTitle}</span>
                  </div>
                )}
              </div>
            )}

            {/* Important Dates / Birthdays */}
            {person.importantDates && person.importantDates.length > 0 && (
              <div className="pt-2 border-t border-border space-y-2">
                <span className="text-muted text-xs font-semibold uppercase tracking-wider block">Ngày quan trọng & Kỷ niệm:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {person.importantDates.map((dateItem: any) => {
                    const title = getDateDisplayTitle(dateItem, tDates);
                    const formattedDate = isYearUnknownDate(dateItem.date)
                      ? formatDateWithoutYear(dateItem.date, dateFormat)
                      : formatDate(dateItem.date, dateFormat);
                    return (
                      <div key={dateItem.id} className="text-xs p-2 bg-surface-elevated rounded-lg border border-border/40 flex items-center justify-between">
                        <span className="text-muted">{title}</span>
                        <span className="font-semibold text-foreground">{formattedDate}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Contact Information & Locations */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2 border-b border-border pb-3">
              <span>📞</span>
              <span>Liên hệ & Địa chỉ</span>
            </h3>

            {/* Phone numbers */}
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase mb-2">Số điện thoại</h4>
              {person.phoneNumbers && person.phoneNumbers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {person.phoneNumbers.map((phone: any) => (
                    <div key={phone.id} className="p-2.5 bg-surface-elevated rounded-lg border border-border/60 flex flex-col justify-between gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-surface text-muted">
                          {phone.type}
                        </span>
                        <a href={`tel:${phone.number}`} className="text-sm font-bold text-primary hover:underline font-mono">
                          {phone.number}
                        </a>
                      </div>
                      {phone.type === 'Mobile' && (
                        <div className="pt-1 border-t border-border/40 flex justify-end">
                          <MessagingLinks phoneNumber={phone.number} personId={person.id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted italic">Chưa lưu số điện thoại</p>
              )}
            </div>

            {/* Emails */}
            {person.emails && person.emails.length > 0 && (
              <div className="pt-3 border-t border-border">
                <h4 className="text-xs font-semibold text-muted uppercase mb-2">Hộp thư điện tử (Email)</h4>
                <div className="grid grid-cols-1 gap-2">
                  {person.emails.map((email: any) => (
                    <div key={email.id} className="p-2 bg-surface-elevated rounded-lg border border-border/40 flex items-center justify-between text-xs">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface text-muted uppercase">
                        {email.type}
                      </span>
                      <a href={`mailto:${email.email}`} className="text-primary hover:underline font-mono truncate max-w-[260px]">
                        {email.email}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Addresses */}
            {person.addresses && person.addresses.length > 0 && (
              <div className="pt-3 border-t border-border space-y-2">
                <h4 className="text-xs font-semibold text-muted uppercase mb-2">Địa chỉ đăng ký & Cư trú</h4>
                <div className="space-y-2.5">
                  {person.addresses.map((addr: any) => (
                    <div key={addr.id} className="text-xs text-foreground p-3 bg-surface-elevated rounded-lg space-y-1.5 border border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface text-primary border border-primary/20 uppercase tracking-wide">
                          📍 {addr.type}
                        </span>
                        {addr.latitude !== null && addr.longitude !== null && (
                          <Link
                            href={`/map?focus=addr_${addr.id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-medium"
                          >
                            Xem bản đồ ↗
                          </Link>
                        )}
                      </div>
                      {addr.streetLine1 && <div className="font-semibold text-sm">{addr.streetLine1}</div>}
                      {addr.streetLine2 && <div className="text-muted">{addr.streetLine2}</div>}
                      <div className="text-muted">
                        {[addr.locality, addr.region, addr.postalCode].filter(Boolean).join(', ')}
                      </div>
                      {addr.country && <div className="text-muted">{getCountryName(addr.country) || addr.country}</div>}
                      {addr.geocodeStatus === 'failed' && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[11px] text-amber-600">{t('addressNotLocated')}</span>
                          <RetryGeocodeButton addressId={addr.id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Websites & IM */}
            {(person.urls?.length > 0 || person.imHandles?.length > 0) && (
              <div className="pt-3 border-t border-border space-y-2">
                <h4 className="text-xs font-semibold text-muted uppercase mb-1.5">Mạng xã hội & Web</h4>
                <div className="flex flex-wrap gap-2">
                  {person.urls?.map((url: any) => (
                    <a
                      key={url.id}
                      href={url.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-elevated rounded-md text-xs text-primary hover:underline border border-border"
                    >
                      <span>🌐</span>
                      <span className="truncate max-w-[220px]">{url.type}: {url.url.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ))}
                  {person.imHandles?.map((im: any) => (
                    <span
                      key={im.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-elevated rounded-md text-xs text-foreground border border-border"
                    >
                      <span>💬</span>
                      <span>{im.protocol}: {im.handle}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Last Contact Quick Tracker */}
            <div className="pt-3 border-t border-border">
              <LastContactQuickUpdate
                personId={person.id}
                currentLastContact={person.lastContact ? new Date(person.lastContact).toISOString() : null}
                dateFormat={dateFormat}
                contactReminderDescription={contactReminderDesc}
              />
            </div>
          </div>

          {/* Card 3: Notes & Custom Fields */}
          {((person.customFieldValues && person.customFieldValues.length > 0) || person.notes) && (
            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2 border-b border-border pb-3">
                <span>📝</span>
                <span>Ghi chú & Trường tùy biến</span>
              </h3>

              {person.customFieldValues && person.customFieldValues.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-muted uppercase">{tCf('sectionTitle')}</h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {person.customFieldValues.map((v: any) => (
                      <div key={v.id} className="p-2.5 bg-surface-elevated rounded-lg border border-border/40">
                        <dt className="text-[11px] text-muted">{v.template?.name}</dt>
                        <dd className="text-xs font-semibold text-foreground mt-0.5">{v.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {person.notes && (
                <div className={person.customFieldValues?.length > 0 ? 'pt-3 border-t border-border space-y-1.5' : 'space-y-1.5'}>
                  <h4 className="text-xs font-semibold text-muted uppercase">{t('notes')}</h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs bg-surface-elevated p-3 rounded-lg border border-border/50">
                    <MarkdownRenderer content={person.notes} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Deep Operational Workspace (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tabs Navigation Header */}
          <div className="bg-surface rounded-xl border border-border p-1.5 flex flex-wrap gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('investigation')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'investigation'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              <span>🛡️</span>
              <span>{t('tabs.investigation') || 'Hồ sơ nghiệp vụ'}</span>
              {investigationItemCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  activeTab === 'investigation' ? 'bg-white/20 text-white' : 'bg-surface-elevated text-muted'
                }`}>
                  {investigationItemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('network')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'network'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              <span>🕸️</span>
              <span>{t('tabs.network') || 'Mạng lưới quan hệ'}</span>
              {relationshipsCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  activeTab === 'network' ? 'bg-white/20 text-white' : 'bg-surface-elevated text-muted'
                }`}>
                  {relationshipsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'journal'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              <span>📝</span>
              <span>{t('tabs.journal') || 'Nhật ký & Chứng cứ'}</span>
            </button>
          </div>

          {/* TAB 1: INVESTIGATION DOSSIER */}
          {activeTab === 'investigation' && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl p-5 border border-border shadow-sm">
                <PersonInvestigationDossier
                  person={investigationPerson}
                  dateFormat={dateFormat}
                />
              </div>
            </div>
          )}

          {/* TAB 2: NETWORK & RELATIONSHIPS */}
          {activeTab === 'network' && (
            <div className="space-y-4">
              {/* Unified Network Graph Canvas */}
              <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">
                    {t('relationshipNetwork')}
                  </h3>
                  <span className="text-xs text-muted">
                    {t('graphHelp')}
                  </span>
                </div>
                <div className="rounded-lg overflow-hidden border border-border">
                  <UnifiedNetworkGraph
                    apiEndpoint={`/api/people/${person.id}/graph`}
                    linkDistance={110}
                    chargeStrength={-350}
                    compact
                    refreshKey={person.relationshipsTo.length + (person.relationshipToUserId ? 1000 : 0)}
                  />
                </div>
              </div>

              {/* Relationships Manager */}
              <div className="bg-surface rounded-xl p-5 border border-border shadow-sm">
                <h3 className="text-base font-bold text-foreground mb-4">
                  {t('relationships')}
                </h3>
                <RelationshipManager
                  personId={person.id}
                  personName={displayName}
                  relationships={person.relationshipsTo}
                  availablePeople={availablePeople}
                  relationshipTypes={relationshipTypes}
                  nameOrder={nameOrder}
                  nameDisplayFormat={nameDisplayFormat}
                />
              </div>

              {/* Events & Co-participants */}
              <div className="bg-surface rounded-xl p-5 border border-border shadow-sm">
                <PersonEventsManager
                  personId={person.id}
                  personEvents={person.events}
                  availableEvents={allEvents}
                  nameOrder={nameOrder}
                  nameDisplayFormat={nameDisplayFormat}
                />
              </div>
            </div>
          )}

          {/* TAB 3: JOURNAL & EVIDENCE */}
          {activeTab === 'journal' && (
            <div className="space-y-4">
              {/* Journal Section */}
              <div className="bg-surface rounded-xl p-5 border border-border shadow-sm">
                <JournalSection
                  personId={person.id}
                  latestEntry={latestJournalEntry ? {
                    ...latestJournalEntry,
                    date: latestJournalEntry.date.toISOString(),
                  } : null}
                  nameOrder={nameOrder}
                  nameDisplayFormat={nameDisplayFormat}
                  locale={userLanguage}
                />
              </div>

              {/* Immich Photo & Video Evidence Gallery */}
              <div className="bg-surface rounded-xl p-5 border border-border shadow-sm">
                <ImmichGallerySection
                  mode="person"
                  entityId={person.id}
                  initialImmichPersonId={person.immichPersonId}
                  initialImmichAlbumId={person.immichAlbumId}
                  immichConfigured={immichConfigured}
                />
              </div>

              {/* Raw vCard for development */}
              <PersonVCardRawView person={person} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

