'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useEventForm } from '@/hooks/useEventForm';
import EventBasicInfoSection from './EventBasicInfoSection';
import EventTimeLocationSection from './EventTimeLocationSection';
import EventInvestigationDetailsSection from './EventInvestigationDetailsSection';
import EventParticipantsSection from './EventParticipantsSection';
import type { PersonAddress, PersonUrl, PersonCustomField } from '@/lib/field-configs';

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

export default function EventForm({
  mode,
  event,
  groups,
  availablePeople = [],
  nameOrder,
}: EventFormProps) {
  const t = useTranslations('events');
  const tCommon = useTranslations('common');

  const {
    isLoading,
    error,
    title,
    setTitle,
    category,
    setCategory,
    status,
    setStatus,
    hasTime,
    setHasTime,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    description,
    setDescription,
    caseCode,
    setCaseCode,
    crimeType,
    setCrimeType,
    caseStatus,
    setCaseStatus,
    incidentTimeNotes,
    setIncidentTimeNotes,
    damageAssessment,
    setDamageAssessment,
    groupIds,
    setGroupIds,
    addresses,
    setAddresses,
    urls,
    setUrls,
    customFields,
    setCustomFields,
    participants,
    selectedPersonId,
    setSelectedPersonId,
    selectedPersonName,
    setSelectedPersonName,
    participantRole,
    setParticipantRole,
    participantInvolvementType,
    setParticipantInvolvementType,
    participantVerificationStatus,
    setParticipantVerificationStatus,
    participantReasonForSuspicion,
    setParticipantReasonForSuspicion,
    participantAlibi,
    setParticipantAlibi,
    participantNotes,
    setParticipantNotes,
    handleAddParticipant,
    handleRemoveParticipant,
    handleSubmit,
  } = useEventForm({ mode, event });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-700 dark:text-red-300 text-sm font-medium">
          {error}
        </div>
      )}

      {/* 1. Basic Info Section */}
      <EventBasicInfoSection
        title={title}
        setTitle={setTitle}
        caseCode={caseCode}
        setCaseCode={setCaseCode}
        crimeType={crimeType}
        setCrimeType={setCrimeType}
        category={category}
        setCategory={setCategory}
        status={status}
        setStatus={setStatus}
        caseStatus={caseStatus}
        setCaseStatus={setCaseStatus}
        groupIds={groupIds}
        setGroupIds={setGroupIds}
        groups={groups}
      />

      {/* 2. Time & Crime Scene Location Section */}
      <EventTimeLocationSection
        incidentTimeNotes={incidentTimeNotes}
        setIncidentTimeNotes={setIncidentTimeNotes}
        hasTime={hasTime}
        setHasTime={setHasTime}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        addresses={addresses}
        setAddresses={setAddresses}
      />

      {/* 3. Investigation Details & Evidence Section */}
      <EventInvestigationDetailsSection
        damageAssessment={damageAssessment}
        setDamageAssessment={setDamageAssessment}
        description={description}
        setDescription={setDescription}
        urls={urls}
        setUrls={setUrls}
        customFields={customFields}
        setCustomFields={setCustomFields}
      />

      {/* 4. Participants Section (Available during creation) */}
      {mode === 'create' && availablePeople.length > 0 && (
        <EventParticipantsSection
          participants={participants}
          selectedPersonId={selectedPersonId}
          setSelectedPersonId={setSelectedPersonId}
          selectedPersonName={selectedPersonName}
          setSelectedPersonName={setSelectedPersonName}
          participantRole={participantRole}
          setParticipantRole={setParticipantRole}
          participantInvolvementType={participantInvolvementType}
          setParticipantInvolvementType={setParticipantInvolvementType}
          participantVerificationStatus={participantVerificationStatus}
          setParticipantVerificationStatus={setParticipantVerificationStatus}
          participantReasonForSuspicion={participantReasonForSuspicion}
          setParticipantReasonForSuspicion={setParticipantReasonForSuspicion}
          participantAlibi={participantAlibi}
          setParticipantAlibi={setParticipantAlibi}
          participantNotes={participantNotes}
          setParticipantNotes={setParticipantNotes}
          handleAddParticipant={handleAddParticipant}
          handleRemoveParticipant={handleRemoveParticipant}
          availablePeople={availablePeople}
          nameOrder={nameOrder}
        />
      )}

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link href={mode === 'create' ? '/events' : `/events/${event?.id}`}>
          <Button type="button" variant="secondary" disabled={isLoading}>
            {tCommon('cancel')}
          </Button>
        </Link>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading
            ? mode === 'create'
              ? t('form.creating')
              : t('form.saving')
            : mode === 'create'
            ? t('form.createButton')
            : t('form.saveButton')}
        </Button>
      </div>
    </form>
  );
}
