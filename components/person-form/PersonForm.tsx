'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { usePersonForm } from '../../hooks/usePersonForm';
import FieldManager from '../fields/FieldManager';
import {
  phoneFieldConfig,
  emailFieldConfig,
  addressFieldConfig,
  urlFieldConfig,
} from '../../lib/field-configs';
import PhotoSection from './PhotoSection';
import TopIdentityBar from './TopIdentityBar';
import SimpleAttributesSection from './SimpleAttributesSection';
import NetworkRelationsSection from './NetworkRelationsSection';
import InvestigationSection from './InvestigationSection';
import GroupsSection from './GroupsSection';
import LastContactSection from './LastContactSection';
import ImportantDatesManager from '../ImportantDatesManager';
import MarkdownEditor from '../MarkdownEditor';
import { Button } from '../ui/Button';
import CardDavSyncSection from './CardDavSyncSection';
import CustomFieldsSection from '../customFields/CustomFieldsSection';
import type { CustomFieldTemplate } from '@prisma/client';
import { useSearchIndex } from '@/components/SearchIndexProvider';
import { isHeicFile, convertHeicToJpeg } from '@/lib/photo-client';
import type { NameDisplayFormat } from '@/lib/nameUtils';

type ReminderIntervalUnit = 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';

// These must be defined OUTSIDE the component to prevent re-renders
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-semibold text-foreground mb-4">{children}</h3>
);

const Section = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-border rounded-lg p-4">{children}</div>
);

export interface PersonFormProps {
  person?: {
    id: string;
    name: string;
    surname: string | null;
    middleName: string | null;
    secondLastName: string | null;
    nickname: string | null;
    displayNameOverride?: string | null;
    prefix: string | null;
    suffix: string | null;
    photo?: string | null;
    organization: string | null;
    jobTitle: string | null;
    gender?: string | null;
    lastContact: Date | null;
    notes: string | null;
    relationshipToUserId: string | null;
    relationshipToUser?: {
      label: string;
    } | null;
    groups: Array<{ groupId: string }>;
    contactReminderEnabled?: boolean;
    contactReminderInterval?: number | null;
    contactReminderIntervalUnit?: ReminderIntervalUnit | null;
    cardDavSyncEnabled?: boolean;
    cardDavMapping?: { id: string } | null;
    importantDates?: Array<{
      id: string;
      type?: string | null;
      title: string;
      date: Date;
      reminderEnabled?: boolean;
      reminderType?: 'ONCE' | 'RECURRING' | null;
      reminderInterval?: number | null;
      reminderIntervalUnit?: ReminderIntervalUnit | null;
      reminderLeadDays?: number | null;
    }>;
    phoneNumbers?: Array<{
      id?: string;
      type: string;
      number: string;
    }>;
    emails?: Array<{
      id?: string;
      type: string;
      email: string;
    }>;
    addresses?: Array<{
      id?: string;
      type: string;
      streetLine1?: string | null;
      streetLine2?: string | null;
      locality?: string | null;
      region?: string | null;
      postalCode?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }>;
    urls?: Array<{
      id?: string;
      type: string;
      url: string;
    }>;
    // Only populated in edit mode; undefined on create
    customFieldValues?: Array<{
      templateId: string;
      value: string;
    }>;
    citizenId?: string | null;
    citizenIdIssueDate?: Date | null;
    citizenIdIssuePlace?: string | null;
    residenceStatus?: string | null;
    managementLevel?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    bloodType?: string | null;
    threatLevel?: string | null;
    modusOperandi?: string | null;
    riskNotes?: string | null;
    vehicles?: any[];
    physicalMarks?: any[];
    criminalRecords?: any[];
    bankAccounts?: any[];
    gangMemberships?: any[];
    relationshipsTo?: any[];
    events?: any[];
  };
  customFieldTemplates?: CustomFieldTemplate[];
  groups: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
  relationshipTypes: Array<{
    id: string;
    label: string;
    color: string | null;
  }>;
  availablePeople?: Array<{
    id: string;
    name: string;
    surname: string | null;
    middleName: string | null;
    secondLastName: string | null;
    nickname: string | null;
    displayNameOverride?: string | null;
    groups: Array<{ groupId: string }>;
  }>;
  availableEvents?: Array<{
    id: string;
    title: string;
  }>;
  availableGangs?: Array<{
    id: string;
    name: string;
    color: string | null;
    turf: string | null;
  }>;
  nameDisplayFormat?: NameDisplayFormat;
  userName?: string;
  mode: 'create' | 'edit';
  dateFormat?: 'MDY' | 'DMY' | 'YMD';
  hasCardDavConnection?: boolean;
  nameOrder?: 'WESTERN' | 'EASTERN';
  initialName?: string;
  initialKnownThrough?: string;
  initialRelationshipType?: string;
  initialConnectedEventId?: string;
  reminderLimit?: {
    canCreate: boolean;
    current: number;
    limit: number;
    isUnlimited: boolean;
  };
  // Required, unlike reminderLimit?: 0 is a real, meaningful lead time
  // (day-of only), not a safe "feature off" fallback. A missing prop here
  // would silently mislabel the "Default" option for any user whose real
  // account default isn't 0, with nothing visibly wrong. Making this a
  // compile error is cheaper than that failure mode.
  defaultReminderLeadDays: number;
}

export default function PersonForm({
  person,
  customFieldTemplates = [],
  groups,
  relationshipTypes,
  availablePeople = [],
  availableEvents = [],
  availableGangs = [],
  nameDisplayFormat,
  mode,
  dateFormat = 'MDY',
  hasCardDavConnection,
  nameOrder,
  initialName,
  initialKnownThrough,
  initialRelationshipType,
  initialConnectedEventId,
  reminderLimit,
  defaultReminderLeadDays,
}: PersonFormProps) {
  const t = useTranslations('people.form');
  const tPhoto = useTranslations('people.photo');
  const router = useRouter();
  const { refreshIndex } = useSearchIndex();
  const isSubmittingRef = useRef(false);

  const {
    state,
    isDirty,
    setIsLoading,
    setError,
    setPhotoPreview,
    setPhotoRemoved,
    setPendingPhotoBlob,
    setCropImageSrc,
    setShowPhotoSourceModal,
    setKnownThrough,
    setInheritGroups,
    setShowDropdown,
    setFormData,
    setImportantDates,
    setPhoneNumbers,
    setEmails,
    setAddresses,
    setUrls,
    setCustomFieldValues,
    setVehicles,
    setPhysicalMarks,
    setCriminalRecords,
    setBankAccounts,
    setGangMemberships,
  } = usePersonForm({
    person,
    mode,
    initialName,
    initialKnownThrough,
    initialRelationshipType,
    initialConnectedEventId,
    availablePeople,
    youLabel: t('you'),
  });

  const {
    isLoading,
    error,
    photoPreview,
    photoRemoved,
    pendingPhotoBlob,
    cropImageSrc,
    showPhotoSourceModal,
    knownThroughId,
    knownThroughName,
    inheritGroups,
    showDropdown,
    formData,
    importantDates,
    phoneNumbers,
    emails,
    addresses,
    urls,
    customFieldValues,
    vehicles,
    physicalMarks,
    criminalRecords,
    bankAccounts,
    gangMemberships,
  } = state;

  const confirmedNavRef = useRef(false);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isSubmittingRef.current || confirmedNavRef.current) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    window.history.pushState({ unsavedGuard: true }, '');
    const handlePopState = () => {
      if (isSubmittingRef.current) return;
      if (window.confirm(t('unsavedChangesWarning'))) {
        window.history.back();
      } else {
        window.history.pushState({ unsavedGuard: true }, '');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, t]);

  useEffect(() => {
    if (!isDirty) return;
    const handleClick = (e: MouseEvent) => {
      if (isSubmittingRef.current) return;
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      if (!anchor) return;
      if (anchor.hasAttribute('download') || anchor.target === '_blank' || anchor.hasAttribute('data-no-unsaved-guard')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
      } catch {
        return;
      }
      if (!window.confirm(t('unsavedChangesWarning'))) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        confirmedNavRef.current = true;
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty, t]);

  const selectedBasePerson = knownThroughId
    ? availablePeople.find((p) => p.id === knownThroughId) ?? null
    : null;

  const handleInheritGroupsChange = (checked: boolean) => {
    setInheritGroups(checked);
    if (checked && selectedBasePerson) {
      const inheritedGroupIds = selectedBasePerson.groups.map((g) => g.groupId);
      setFormData({
        groupIds: Array.from(
          new Set([...formData.groupIds, ...inheritedGroupIds])
        ),
      });
    }
  };

  const handleKnownThroughChange = (
    newPersonId: string,
    newPersonName: string
  ) => {
    setKnownThrough(newPersonId, newPersonName);
    if (inheritGroups && newPersonId) {
      const newBasePerson = availablePeople.find((p) => p.id === newPersonId);
      if (newBasePerson) {
        const inheritedGroupIds = newBasePerson.groups.map((g) => g.groupId);
        setFormData({
          groupIds: Array.from(
            new Set([...formData.groupIds, ...inheritedGroupIds])
          ),
        });
      }
    }
  };

  const handlePhotoSourceSelect = async (file: File) => {
    setShowPhotoSourceModal(false);

    if (isHeicFile(file)) {
      const toastId = toast.loading(tPhoto('converting'));
      try {
        const jpegBlob = await convertHeicToJpeg(file);
        toast.dismiss(toastId);
        setCropImageSrc(URL.createObjectURL(jpegBlob));
      } catch {
        toast.dismiss(toastId);
        toast.error(tPhoto('convertError'));
      }
      return;
    }

    setCropImageSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = (blob: Blob) => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    const previewUrl = URL.createObjectURL(blob);
    setPhotoPreview(previewUrl);
    setPhotoRemoved(false);
    setPendingPhotoBlob(blob);
  };

  const handlePhotoRemove = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
    setPhotoRemoved(true);
    setPendingPhotoBlob(null);
  };

  const peopleWithUser = availablePeople;

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
    addAnother = false
  ) => {
    e.preventDefault();
    setError('');

    if (formData.lastContact) {
      const lastContactDate = new Date(formData.lastContact);
      if (lastContactDate > new Date()) {
        setError(t('errorFutureDate'));
        return;
      }
    }

    setIsLoading(true);

    try {
      const url =
        mode === 'create' ? '/api/people' : `/api/people/${person?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const payload = {
        ...formData,
        heightCm: formData.heightCm ? parseInt(formData.heightCm, 10) : null,
        weightKg: formData.weightKg ? parseInt(formData.weightKg, 10) : null,
        gender: formData.gender ? formData.gender.trim() : null,
        citizenIdIssueDate: formData.citizenIdIssueDate || null,
        citizenId: formData.citizenId.trim() || null,
        citizenIdIssuePlace: formData.citizenIdIssuePlace.trim() || null,
        residenceStatus: formData.residenceStatus.trim() || null,
        bloodType: formData.bloodType.trim() || null,
        modusOperandi: formData.modusOperandi.trim() || null,
        riskNotes: formData.riskNotes.trim() || null,
        ...(mode === 'create'
          ? {
              bankAccounts: [
                ...bankAccounts
                  .filter((acc) => acc.bankName?.trim() && acc.accountNumber?.trim())
                  .map((acc) => ({
                    bankName: acc.bankName.trim(),
                    accountNumber: acc.accountNumber.trim(),
                    accountHolder: acc.accountHolder?.trim() || null,
                    accountType: acc.accountType || 'OWNER',
                    isPrimary: acc.isPrimary ?? false,
                    notes: acc.notes?.trim() || null,
                  })),
                ...(formData.initialBankName?.trim() && formData.initialAccountNumber?.trim() && bankAccounts.length === 0
                  ? [
                      {
                        bankName: formData.initialBankName.trim(),
                        accountNumber: formData.initialAccountNumber.trim(),
                        accountHolder: formData.initialAccountHolder?.trim() || null,
                        accountType: formData.initialAccountType || 'OWNER',
                        isPrimary: true,
                      },
                    ]
                  : []),
              ],
              vehicles: vehicles
                .filter((v) => v.plateNumber?.trim() && v.vehicleType?.trim())
                .map((v) => ({
                  plateNumber: v.plateNumber.trim(),
                  vehicleType: v.vehicleType.trim(),
                  brandModel: v.brandModel?.trim() || null,
                  color: v.color?.trim() || null,
                  identifyingFeatures: v.identifyingFeatures?.trim() || null,
                  registeredOwner: v.registeredOwner?.trim() || null,
                  isSuspicious: v.isSuspicious ?? false,
                })),
              physicalMarks: physicalMarks
                .filter((m) => m.type?.trim() && m.location?.trim() && m.description?.trim())
                .map((m) => ({
                  type: m.type.trim(),
                  location: m.location.trim(),
                  description: m.description.trim(),
                  photoUrl: m.photoUrl || null,
                })),
              criminalRecords: criminalRecords
                .filter((r) => r.charge?.trim())
                .map((r) => ({
                  charge: r.charge.trim(),
                  recordType: r.recordType || 'CONVICTION',
                  sentenceDetail: r.sentenceDetail?.trim() || null,
                  adjudicatedBy: r.adjudicatedBy?.trim() || null,
                  incidentDate: r.incidentDate || null,
                  verdictDate: r.verdictDate || null,
                  isPardoned: r.isPardoned ?? false,
                  notes: r.notes?.trim() || null,
                })),
              gangMemberships: gangMemberships
                .filter((g) => g.gangId?.trim())
                .map((g) => ({
                  gangId: g.gangId.trim(),
                  role: g.role?.trim() || 'MEMBER',
                  notes: g.notes?.trim() || null,
                })),
            }
          : {}),
        importantDates,
        phoneNumbers,
        emails,
        addresses,
        urls,
        customFieldValues,
        ...(mode === 'create' && knownThroughId
          ? { connectedThroughId: knownThroughId }
          : {}),
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        if (data.details) {
          console.error('Validation errors:', data.details);
        }
        setError(data.error || t('errorSomethingWrong'));
        return;
      }

      // Apply pending photo changes (upload or delete)
      const personId = mode === 'create' ? data.person?.id : person?.id;
      if (personId) {
        if (pendingPhotoBlob) {
          try {
            const photoFormData = new FormData();
            photoFormData.append('photo', pendingPhotoBlob, 'photo.png');
            const photoRes = await fetch(`/api/people/${personId}/photo`, {
              method: 'POST',
              body: photoFormData,
            });
            if (!photoRes.ok) {
              toast.error(tPhoto('uploadError'));
            }
          } catch {
            toast.error(tPhoto('uploadError'));
          }
        } else if (photoRemoved) {
          try {
            const deleteRes = await fetch(`/api/people/${personId}/photo`, {
              method: 'DELETE',
            });
            if (!deleteRes.ok) {
              toast.error(tPhoto('removeError'));
            }
          } catch {
            toast.error(tPhoto('removeError'));
          }
        }
      }

      const displayName = `${formData.name}${formData.surname ? ' ' + formData.surname : ''}`;
      toast.success(
        mode === 'create'
          ? t('successCreated', { name: displayName })
          : t('successUpdated', { name: displayName })
      );

      isSubmittingRef.current = true;

      if (mode === 'edit' && person?.id) {
        router.push(`/people/${person.id}`);
        router.refresh();
        refreshIndex();
      } else if (mode === 'create' && addAnother) {
        const params = new URLSearchParams();
        if (initialKnownThrough) {
          params.set('knownThrough', initialKnownThrough);
        }
        if (initialRelationshipType) {
          params.set('relationshipType', initialRelationshipType);
        }
        const queryString = params.toString();
        refreshIndex();
        window.location.href = queryString
          ? `/people/new?${queryString}`
          : '/people/new';
      } else if (mode === 'create' && data.person?.id) {
        router.push(`/people/${data.person.id}`);
        router.refresh();
        refreshIndex();
      } else {
        router.push('/people');
        router.refresh();
        refreshIndex();
      }
    } catch {
      setError(t('errorSomethingWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const [formTab, setFormTab] = useState<'investigation' | 'network' | 'notes'>('investigation');

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {error && (
        <div role="alert" className="bg-warning/10 border border-warning/30 text-warning px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* ROW 1: TOP IDENTITY BAR - TÊN & DIỆN QUẢN LÝ & MỨC ĐỘ NGUY HIỂM */}
      <TopIdentityBar
        mode={mode}
        formData={formData}
        onFormDataChange={setFormData}
      />

      {/* ROW 2: BỐ CỤC 2 CỘT ĐỒNG BỘ THEO TRANG CHI TIẾT ĐỐI TƯỢNG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI - SIDEBAR ĐỒNG BỘ (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Chân dung, Phân nhóm & Đồng bộ CardDAV */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-4">
            <PhotoSection
              personId={person?.id}
              personPhoto={person?.photo}
              personName={formData.name}
              personSurname={formData.surname}
              photoPreview={photoPreview}
              photoRemoved={photoRemoved}
              cropImageSrc={cropImageSrc}
              showPhotoSourceModal={showPhotoSourceModal}
              onShowPhotoSourceModal={setShowPhotoSourceModal}
              onPhotoSourceSelect={handlePhotoSourceSelect}
              onCropConfirm={handleCropConfirm}
              onCropCancel={() => {
                if (cropImageSrc) {
                  URL.revokeObjectURL(cropImageSrc);
                }
                setCropImageSrc(null);
              }}
              onPhotoRemove={handlePhotoRemove}
            />

            {(groups.length > 0 || hasCardDavConnection) && (
              <div className="pt-4 border-t border-border space-y-4">
                {groups.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                      <span>👥</span>
                      <span>{t('sectionGroups')}</span>
                    </h3>
                    <GroupsSection
                      mode={mode}
                      groups={groups}
                      formData={formData}
                      onFormDataChange={setFormData}
                      knownThroughId={knownThroughId}
                      selectedBasePerson={selectedBasePerson ?? null}
                      inheritGroups={inheritGroups}
                      onInheritGroupsChange={handleInheritGroupsChange}
                    />
                  </div>
                )}

                {hasCardDavConnection && (
                  <div className={groups.length > 0 ? 'pt-4 border-t border-border' : ''}>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                      <span>🔄</span>
                      <span>{t('sectionCardDavSync')}</span>
                    </h3>
                    <CardDavSyncSection
                      mode={mode}
                      formData={formData}
                      onFormDataChange={setFormData}
                      hasCardDavMapping={Boolean(person?.cardDavMapping)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: 🪪 Hồ sơ nhận dạng & Nhân thân (CCCD, Cư trú, Thể chất, Nghề nghiệp/Cơ quan) */}
          <SimpleAttributesSection
            formData={formData}
            onFormDataChange={setFormData}
          />

          {/* Card 3: 📞 Liên hệ & Địa chỉ (Điện thoại, Email, Địa chỉ, MXH/Web, Last Contact) */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <span>📞</span>
                <span>Liên hệ & Địa chỉ</span>
              </h3>
              <span className="text-[11px] text-muted">Kênh liên lạc</span>
            </div>

            <FieldManager
              items={phoneNumbers}
              onChange={setPhoneNumbers}
              fieldConfig={phoneFieldConfig}
              label={t('phones.label')}
              emptyText={t('phones.noPhones')}
            />

            <FieldManager
              items={emails}
              onChange={setEmails}
              fieldConfig={emailFieldConfig}
              label={t('emails.label')}
              emptyText={t('emails.noEmails')}
            />

            <FieldManager
              items={addresses}
              onChange={setAddresses}
              fieldConfig={addressFieldConfig}
              label={t('addresses.label')}
              emptyText={t('addresses.noAddresses')}
            />

            <FieldManager
              items={urls}
              onChange={setUrls}
              fieldConfig={urlFieldConfig}
              label={t('urls.label')}
              emptyText={t('urls.noUrls')}
            />

            <div className="pt-3 border-t border-border">
              <LastContactSection
                formData={formData}
                onFormDataChange={setFormData}
                dateFormat={dateFormat}
                reminderLimit={reminderLimit}
              />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI - WORKSPACE 3 TABS NGHIỆP VỤ (ĐỒNG BỘ VỚI TRANG CHI TIẾT - 7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tabs Navigation Header */}
          <div className="bg-surface rounded-xl border border-border p-1.5 flex flex-wrap gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setFormTab('investigation')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                formTab === 'investigation'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              <span>🛡️</span>
              <span>Hồ sơ nghiệp vụ</span>
            </button>

            <button
              type="button"
              onClick={() => setFormTab('network')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                formTab === 'network'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              <span>🕸️</span>
              <span>Mạng lưới quan hệ</span>
            </button>

            <button
              type="button"
              onClick={() => setFormTab('notes')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                formTab === 'notes'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              <span>📝</span>
              <span>Nhật ký & Ghi chú</span>
            </button>
          </div>

          {/* TAB 1: 🛡️ HỒ SƠ NGHIỆP VỤ */}
          <div className={formTab === 'investigation' ? 'space-y-4' : 'hidden'}>
            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-4">
              <InvestigationSection
                formData={formData}
                onFormDataChange={setFormData}
                mode={mode}
                personId={person?.id}
                vehicles={vehicles}
                onVehiclesChange={setVehicles}
                physicalMarks={physicalMarks}
                onPhysicalMarksChange={setPhysicalMarks}
                criminalRecords={criminalRecords}
                onCriminalRecordsChange={setCriminalRecords}
                bankAccounts={bankAccounts}
                onBankAccountsChange={setBankAccounts}
                gangMemberships={gangMemberships}
                onGangMembershipsChange={setGangMemberships}
                availableGangs={availableGangs}
                dateFormat={dateFormat}
              />
            </div>
          </div>

          {/* TAB 2: 🕸️ MẠNG LƯỚI QUAN HỆ */}
          <div className={formTab === 'network' ? 'space-y-4' : 'hidden'}>
            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-4">
              <NetworkRelationsSection
                mode={mode}
                personId={person?.id}
                personName={person?.name}
                relationships={person?.relationshipsTo}
                personEvents={person?.events}
                formData={formData}
                onFormDataChange={setFormData}
                knownThroughId={knownThroughId}
                knownThroughName={knownThroughName}
                onKnownThroughChange={handleKnownThroughChange}
                peopleWithUser={peopleWithUser}
                relationshipTypes={relationshipTypes}
                availableEvents={availableEvents}
                nameOrder={nameOrder}
                nameDisplayFormat={nameDisplayFormat}
              />
            </div>
          </div>

          {/* TAB 3: 📝 NHẬT KÝ & GHI CHÚ */}
          <div className={formTab === 'notes' ? 'space-y-4' : 'hidden'}>
            <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-4">
              {/* Ngày quan trọng & Kỷ niệm */}
              <div>
                <ImportantDatesManager
                  personId={person?.id}
                  initialDates={importantDates}
                  onChange={setImportantDates}
                  mode={mode}
                  dateFormat={dateFormat}
                  reminderLimit={reminderLimit}
                  defaultReminderLeadDays={defaultReminderLeadDays}
                />
              </div>

              {/* Trường tùy biến */}
              {customFieldTemplates.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <CustomFieldsSection
                    templates={customFieldTemplates}
                    values={customFieldValues}
                    onChange={setCustomFieldValues}
                  />
                </div>
              )}

              {/* Ghi chú nghiệp vụ */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">
                  {t('sectionNotes')}
                </h3>
                <MarkdownEditor
                  id="notes"
                  value={formData.notes}
                  onChange={(notes) => setFormData({ notes })}
                  placeholder={t('notesPlaceholder')}
                  rows={5}
                />
                <p className="text-xs text-muted mt-1">{t('markdownSupport')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur border-t border-border py-3 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link
            href="/people"
            data-no-unsaved-guard
            className="px-4 py-2 border border-border text-muted rounded-lg font-medium hover:bg-surface-elevated transition-colors text-sm"
          >
            {t('cancel')}
          </Link>

          <div className="flex items-center gap-3">
            {mode === 'create' ? (
              <div className="relative">
                <div className="flex shadow-sm">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-primary text-on-primary rounded-l-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isLoading ? t('saving') : t('create')}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="px-2.5 py-2 bg-primary text-on-primary border-l border-primary-dark/30 rounded-r-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title="Thêm tùy chọn"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>

                {showDropdown && (
                  <div className="absolute right-0 bottom-full mb-2 w-56 rounded-lg shadow-lg bg-surface border border-border z-40 py-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        setShowDropdown(false);
                        const form = e.currentTarget.closest('form');
                        if (form) {
                          if (form.checkValidity()) {
                            const submitEvent = new Event('submit', {
                              bubbles: true,
                              cancelable: true,
                            });
                            Object.defineProperty(submitEvent, 'target', {
                              value: form,
                              enumerable: true,
                            });
                            handleSubmit(
                              submitEvent as unknown as FormEvent<HTMLFormElement>,
                              true
                            );
                          } else {
                            form.reportValidity();
                          }
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-elevated transition-colors"
                    >
                      {t('createAndAddAnother')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button type="submit" disabled={isLoading} className="text-sm shadow-sm">
                {isLoading ? t('saving') : t('save')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
