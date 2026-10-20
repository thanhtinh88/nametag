'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { PersonAddress, PersonUrl, PersonCustomField } from '@/lib/field-configs';
import type {
  EventFormProps,
  EventStatusType,
  CaseStatus,
  EventParticipantInput,
} from '@/components/event-form/EventForm';

function formatDateInput(iso: string | null | undefined, hasTime: boolean): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (hasTime) {
    return d.toISOString().slice(0, 16);
  }
  return d.toISOString().split('T')[0];
}

export function useEventForm({ mode, event }: { mode: 'create' | 'edit'; event?: EventFormProps['event'] }) {
  const t = useTranslations('events');
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
  const [caseStatus, setCaseStatus] = useState<CaseStatus>(
    (event?.caseStatus as CaseStatus) || 'UNRESOLVED'
  );
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

  return {
    isLoading,
    error,
    setError,
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
  };
}

