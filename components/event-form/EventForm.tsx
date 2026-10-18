'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import FieldManager from '@/components/fields/FieldManager';
import {
  addressFieldConfig,
  urlFieldConfig,
  customFieldFieldConfig,
  type PersonAddress,
  type PersonUrl,
  type PersonCustomField,
} from '@/lib/field-configs';
import MarkdownEditor from '@/components/MarkdownEditor';
import PillSelector from '@/components/PillSelector';
import PersonAutocomplete from '@/components/PersonAutocomplete';
import { Button } from '@/components/ui/Button';

export type EventStatusType = 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type CaseStatus = 'UNRESOLVED' | 'INVESTIGATING' | 'SOLVED' | 'SUSPENDED';
export type InvolvementType = 'SUSPECT' | 'PERSON_OF_INTEREST' | 'ACCOMPLICE' | 'WITNESS' | 'VICTIM' | 'INFORMANT';
export type VerificationStatus = 'HYPOTHESIS' | 'INVESTIGATING' | 'CONFIRMED' | 'RULED_OUT';

export interface EventParticipantInput {
  personId: string;
  personName: string;
  role: string;
  involvementType: string;
  verificationStatus: string;
  confidence?: string | null;
  reasonForSuspicion?: string;
  alibi?: string;
  notes: string;
}

export interface EventFormProps {
  mode: 'create' | 'edit';
  event?: {
    id: string;
    title: string;
    category: string | null;
    status: EventStatusType;
    startDate: string | null;
    endDate: string | null;
    hasTime: boolean;
    description: string | null;
    caseCode?: string | null;
    crimeType?: string | null;
    caseStatus?: string | null;
    incidentTimeNotes?: string | null;
    damageAssessment?: string | null;
    groups: Array<{ groupId: string }>;
    addresses: PersonAddress[];
    urls: PersonUrl[];
    customFields: PersonCustomField[];
  };
  groups: Array<{
    id: string;
    name: string;
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
  }>;
  nameOrder?: 'WESTERN' | 'EASTERN';
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

function formatDateInput(iso: string | null | undefined, hasTime: boolean): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (hasTime) {
    return d.toISOString().slice(0, 16);
  }
  return d.toISOString().split('T')[0];
}

export default function EventForm({
  mode,
  event,
  groups,
  availablePeople = [],
  nameOrder,
}: EventFormProps) {
  const t = useTranslations('events');
  const tPeopleForm = useTranslations('people.form');
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState(event?.title || '');
  const [category, setCategory] = useState(event?.category || '');
  const [status, setStatus] = useState<EventStatusType>(event?.status || 'PLANNED');
  const [hasTime, setHasTime] = useState(event?.hasTime ?? false);
  const [startDate, setStartDate] = useState(
    formatDateInput(event?.startDate, event?.hasTime ?? false)
  );
  const [endDate, setEndDate] = useState(
    formatDateInput(event?.endDate, event?.hasTime ?? false)
  );
  const [description, setDescription] = useState(event?.description || '');
  const [caseCode, setCaseCode] = useState(event?.caseCode || '');
  const [crimeType, setCrimeType] = useState(event?.crimeType || '');
  const [caseStatus, setCaseStatus] = useState(event?.caseStatus || 'UNRESOLVED');
  const [incidentTimeNotes, setIncidentTimeNotes] = useState(event?.incidentTimeNotes || '');
  const [damageAssessment, setDamageAssessment] = useState(event?.damageAssessment || '');
  const [groupIds, setGroupIds] = useState<string[]>(
    event?.groups.map((g) => g.groupId) || []
  );
  const [addresses, setAddresses] = useState<PersonAddress[]>(event?.addresses || []);
  const [urls, setUrls] = useState<PersonUrl[]>(event?.urls || []);
  const [customFields, setCustomFields] = useState<PersonCustomField[]>(
    event?.customFields || []
  );

  // Participants state (for create mode)
  const [participants, setParticipants] = useState<EventParticipantInput[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedPersonName, setSelectedPersonName] = useState('');
  const [participantRole, setParticipantRole] = useState('');
  const [participantInvolvementType, setParticipantInvolvementType] = useState('SUSPECT');
  const [participantVerificationStatus, setParticipantVerificationStatus] = useState('HYPOTHESIS');
  const [participantReasonForSuspicion, setParticipantReasonForSuspicion] = useState('');
  const [participantAlibi, setParticipantAlibi] = useState('');
  const [participantNotes, setParticipantNotes] = useState('');

  const handleAddParticipant = () => {
    if (!selectedPersonId) return;
    if (participants.some((p) => p.personId === selectedPersonId)) {
      return;
    }
    setParticipants([
      ...participants,
      {
        personId: selectedPersonId,
        personName: selectedPersonName,
        role: participantRole.trim(),
        involvementType: participantInvolvementType,
        verificationStatus: participantVerificationStatus,
        reasonForSuspicion: participantReasonForSuspicion.trim(),
        alibi: participantAlibi.trim(),
        notes: participantNotes.trim(),
      },
    ]);
    setSelectedPersonId('');
    setSelectedPersonName('');
    setParticipantRole('');
    setParticipantInvolvementType('SUSPECT');
    setParticipantVerificationStatus('HYPOTHESIS');
    setParticipantReasonForSuspicion('');
    setParticipantAlibi('');
    setParticipantNotes('');
  };

  const handleRemoveParticipant = (personId: string) => {
    setParticipants(participants.filter((p) => p.personId !== personId));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError(t('errorTitleRequired'));
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = mode === 'create' ? '/api/events' : `/api/events/${event?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const payload = {
        title: title.trim(),
        category: category.trim() || null,
        status,
        caseCode: caseCode.trim() || null,
        crimeType: crimeType.trim() || null,
        caseStatus: caseStatus || 'UNRESOLVED',
        incidentTimeNotes: incidentTimeNotes.trim() || null,
        damageAssessment: damageAssessment.trim() || null,
        hasTime,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        description: description.trim() || null,
        groupIds,
        addresses,
        urls,
        customFields,
        ...(mode === 'create' && participants.length > 0
          ? {
              participants: participants.map((p) => ({
                personId: p.personId,
                role: p.role || null,
                involvementType: p.involvementType || 'SUSPECT',
                verificationStatus: p.verificationStatus || 'HYPOTHESIS',
                reasonForSuspicion: p.reasonForSuspicion || null,
                alibi: p.alibi || null,
                notes: p.notes || null,
              })),
            }
          : {}),
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('errorSaving'));
        return;
      }

      toast.success(
        mode === 'create'
          ? t('successCreated', { title: title.trim() })
          : t('successUpdated', { title: title.trim() })
      );

      router.push(`/events/${data.event.id}`);
      router.refresh();
    } catch {
      setError(t('errorSaving'));
    } finally {
      setIsLoading(false);
    }
  };

  const groupItems = groups.map((g) => ({
    id: g.id,
    label: g.name,
    color: g.color,
  }));

  const unselectedPeople = availablePeople.filter(
    (p) => !participants.some((part) => part.personId === p.id)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="border border-border rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{t('sectionBasicInfo')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="event-title" className="block text-sm font-medium text-muted mb-1">
              {t('titleLabel')} *
            </label>
            <input
              id="event-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="event-case-code" className="block text-sm font-medium text-muted mb-1">
              {t('caseCodeLabel')}
            </label>
            <input
              id="event-case-code"
              type="text"
              value={caseCode}
              onChange={(e) => setCaseCode(e.target.value)}
              placeholder={t('caseCodePlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="event-case-status" className="block text-sm font-medium text-muted mb-1">
              {t('caseStatusLabel')}
            </label>
            <select
              id="event-case-status"
              value={caseStatus}
              onChange={(e) => setCaseStatus(e.target.value as CaseStatus)}
              className={inputClass}
            >
              <option value="UNRESOLVED">{t('caseStatuses.UNRESOLVED')}</option>
              <option value="INVESTIGATING">{t('caseStatuses.INVESTIGATING')}</option>
              <option value="SOLVED">{t('caseStatuses.SOLVED')}</option>
              <option value="SUSPENDED">{t('caseStatuses.SUSPENDED')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="event-crime-type" className="block text-sm font-medium text-muted mb-1">
              {t('crimeTypeLabel')}
            </label>
            <input
              id="event-crime-type"
              type="text"
              list="event-crime-type-presets"
              value={crimeType}
              onChange={(e) => setCrimeType(e.target.value)}
              placeholder={t('crimeTypePlaceholder')}
              className={inputClass}
            />
            <datalist id="event-crime-type-presets">
              <option value={t('crimeTypes.THEFT')} />
              <option value={t('crimeTypes.ROBBERY')} />
              <option value={t('crimeTypes.ASSAULT')} />
              <option value={t('crimeTypes.FRAUD')} />
              <option value={t('crimeTypes.GAMBLING')} />
              <option value={t('crimeTypes.DRUGS')} />
              <option value={t('crimeTypes.PUBLIC_DISORDER')} />
              <option value={t('crimeTypes.OTHER')} />
            </datalist>
          </div>

          <div>
            <label htmlFor="event-category" className="block text-sm font-medium text-muted mb-1">
              {t('categoryLabel')}
            </label>
            <input
              id="event-category"
              type="text"
              list="event-category-presets"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('categoryPlaceholder')}
              className={inputClass}
            />
            <datalist id="event-category-presets">
              <option value={t('categories.conference')} />
              <option value={t('categories.meeting')} />
              <option value={t('categories.trip')} />
              <option value={t('categories.project')} />
              <option value={t('categories.celebration')} />
              <option value={t('categories.incident')} />
              <option value={t('categories.other')} />
            </datalist>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="event-status" className="block text-sm font-medium text-muted mb-1">
              {t('statusLabel')}
            </label>
            <select
              id="event-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatusType)}
              className={inputClass}
            >
              <option value="PLANNED">{t('statuses.PLANNED')}</option>
              <option value="ONGOING">{t('statuses.ONGOING')}</option>
              <option value="COMPLETED">{t('statuses.COMPLETED')}</option>
              <option value="CANCELLED">{t('statuses.CANCELLED')}</option>
            </select>
          </div>
        </div>

        {/* Date & Time */}
        <div className="pt-2 space-y-3">
          <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={hasTime}
              onChange={(e) => setHasTime(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            {t('includeTime')}
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-start-date" className="block text-sm font-medium text-muted mb-1">
                {t('startDateLabel')}
              </label>
              <input
                id="event-start-date"
                type={hasTime ? 'datetime-local' : 'date'}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="event-end-date" className="block text-sm font-medium text-muted mb-1">
                {t('endDateLabel')}
              </label>
              <input
                id="event-end-date"
                type={hasTime ? 'datetime-local' : 'date'}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-incident-time-notes" className="block text-sm font-medium text-muted mb-1">
              {t('incidentTimeNotesLabel')}
            </label>
            <input
              id="event-incident-time-notes"
              type="text"
              value={incidentTimeNotes}
              onChange={(e) => setIncidentTimeNotes(e.target.value)}
              placeholder={t('incidentTimeNotesPlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="event-damage-assessment" className="block text-sm font-medium text-muted mb-1">
              {t('damageAssessmentLabel')}
            </label>
            <textarea
              id="event-damage-assessment"
              rows={2}
              value={damageAssessment}
              onChange={(e) => setDamageAssessment(e.target.value)}
              placeholder={t('damageAssessmentPlaceholder')}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Location / Addresses */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {tPeopleForm('sectionLocation')}
        </h3>
        <FieldManager
          items={addresses}
          onChange={setAddresses}
          fieldConfig={addressFieldConfig}
          label={tPeopleForm('addresses.label')}
          emptyText={tPeopleForm('addresses.noAddresses')}
        />
      </div>

      {/* Initial Participants (Create mode) */}
      {mode === 'create' && availablePeople.length > 0 && (
        <div className="border border-border rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">{t('sectionParticipants')}</h3>
          <p className="text-xs text-muted">{t('participantsHelp')}</p>

          <div className="p-3 bg-surface-elevated rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t('searchPersonPlaceholder')} *
                </label>
                <PersonAutocomplete
                  people={unselectedPeople}
                  value={selectedPersonId}
                  onChange={(id, name) => {
                    setSelectedPersonId(id);
                    setSelectedPersonName(name);
                  }}
                  placeholder={t('searchPersonPlaceholder')}
                  nameOrder={nameOrder}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t('involvementTypeLabel')}
                </label>
                <select
                  value={participantInvolvementType}
                  onChange={(e) => setParticipantInvolvementType(e.target.value as InvolvementType)}
                  className={inputClass}
                >
                  <option value="SUSPECT">{t('involvementTypes.SUSPECT')}</option>
                  <option value="PERSON_OF_INTEREST">{t('involvementTypes.PERSON_OF_INTEREST')}</option>
                  <option value="ACCOMPLICE">{t('involvementTypes.ACCOMPLICE')}</option>
                  <option value="WITNESS">{t('involvementTypes.WITNESS')}</option>
                  <option value="VICTIM">{t('involvementTypes.VICTIM')}</option>
                  <option value="INFORMANT">{t('involvementTypes.INFORMANT')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t('verificationStatusLabel')}
                </label>
                <select
                  value={participantVerificationStatus}
                  onChange={(e) => setParticipantVerificationStatus(e.target.value as VerificationStatus)}
                  className={inputClass}
                >
                  <option value="HYPOTHESIS">{t('verificationStatuses.HYPOTHESIS')}</option>
                  <option value="INVESTIGATING">{t('verificationStatuses.INVESTIGATING')}</option>
                  <option value="CONFIRMED">{t('verificationStatuses.CONFIRMED')}</option>
                  <option value="RULED_OUT">{t('verificationStatuses.RULED_OUT')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t('rolePlaceholder')}
                </label>
                <input
                  type="text"
                  value={participantRole}
                  onChange={(e) => setParticipantRole(e.target.value)}
                  placeholder={t('rolePlaceholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t('reasonForSuspicionLabel')}
                </label>
                <input
                  type="text"
                  value={participantReasonForSuspicion}
                  onChange={(e) => setParticipantReasonForSuspicion(e.target.value)}
                  placeholder={t('reasonForSuspicionPlaceholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t('alibiLabel')}
                </label>
                <input
                  type="text"
                  value={participantAlibi}
                  onChange={(e) => setParticipantAlibi(e.target.value)}
                  placeholder={t('alibiPlaceholder')}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={participantNotes}
                onChange={(e) => setParticipantNotes(e.target.value)}
                placeholder={t('notesPlaceholderShort')}
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleAddParticipant}
                disabled={!selectedPersonId}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 shrink-0"
              >
                + {t('addParticipant')}
              </button>
            </div>
          </div>

          {participants.length > 0 && (
            <div className="space-y-2 pt-2">
              {participants.map((p) => (
                <div
                  key={p.personId}
                  className="p-3 bg-surface-elevated rounded-lg text-sm space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{p.personName}</span>
                      <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 font-medium">
                        {t(`involvementTypes.${p.involvementType}`)}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-surface border border-border text-foreground font-medium">
                        {t(`verificationStatuses.${p.verificationStatus}`)}
                      </span>
                      {p.role && (
                        <span className="px-2 py-0.5 text-xs rounded bg-primary/15 text-primary font-medium">
                          {p.role}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(p.personId)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      {tPeopleForm('addresses.remove')}
                    </button>
                  </div>
                  {p.reasonForSuspicion && (
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      <span className="font-medium">{t('reasonForSuspicionLabel')}:</span> {p.reasonForSuspicion}
                    </div>
                  )}
                  {p.alibi && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-400">
                      <span className="font-medium">{t('alibiLabel')}:</span> {p.alibi}
                    </div>
                  )}
                  {p.notes && <div className="text-muted text-xs">— {p.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Groups */}
      {groups.length > 0 && (
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {tPeopleForm('sectionGroups')}
          </h3>
          <PillSelector
            selectedItems={groupItems.filter((g) => groupIds.includes(g.id))}
            availableItems={groupItems}
            onAdd={(item) =>
              setGroupIds((prev) =>
                prev.includes(item.id) ? prev : [...prev, item.id]
              )
            }
            onRemove={(itemId) =>
              setGroupIds((prev) => prev.filter((id) => id !== itemId))
            }
            placeholder={tPeopleForm('searchGroups')}
          />
        </div>
      )}

      {/* Websites / Documents */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {tPeopleForm('sectionWebsites')}
        </h3>
        <FieldManager
          items={urls}
          onChange={setUrls}
          fieldConfig={urlFieldConfig}
          label={tPeopleForm('urls.label')}
          emptyText={tPeopleForm('urls.noUrls')}
        />
      </div>

      {/* Custom Fields */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {tPeopleForm('sectionCustomFields')}
        </h3>
        <FieldManager
          items={customFields}
          onChange={setCustomFields}
          fieldConfig={customFieldFieldConfig}
          label={tPeopleForm('customFields.label')}
          emptyText={tPeopleForm('customFields.noCustomFields')}
        />
      </div>

      {/* Description / Notes */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('descriptionLabel')}
        </h3>
        <MarkdownEditor
          id="event-description"
          value={description}
          onChange={setDescription}
          placeholder={t('descriptionPlaceholder')}
          rows={5}
        />
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Link
          href={mode === 'edit' && event ? `/events/${event.id}` : '/events'}
          className="px-6 py-2 border border-border text-muted rounded-lg font-medium hover:bg-surface-elevated transition-colors"
        >
          {tPeopleForm('cancel')}
        </Link>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? tPeopleForm('saving')
            : mode === 'create'
              ? t('createEvent')
              : tPeopleForm('save')}
        </Button>
      </div>
    </form>
  );
}
