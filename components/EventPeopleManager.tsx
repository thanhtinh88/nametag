'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import PersonAutocomplete from './PersonAutocomplete';
import { formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';
import { Button } from './ui/Button';
import PersonAvatar from './PersonPhoto';
import { useSearchIndex } from './SearchIndexProvider';

interface Person {
  id: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
  photo?: string | null;
}

interface Participant {
  id: string;
  personId: string;
  role: string | null;
  involvementType?: string;
  verificationStatus?: string;
  confidence?: string | null;
  notes: string | null;
  person: Person;
}

interface EventPeopleManagerProps {
  eventId: string;
  participants: Participant[];
  availablePeople: Person[];
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

const inputClass =
  'block w-full rounded-md border border-input bg-surface text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2';

export default function EventPeopleManager({
  eventId,
  participants,
  availablePeople,
  nameOrder,
  nameDisplayFormat,
}: EventPeopleManagerProps) {
  const t = useTranslations('events.detail');
  const tEvents = useTranslations('events');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { refreshIndex } = useSearchIndex();

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

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRuledOut, setShowRuledOut] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    personId: '',
    role: '',
    involvementType: 'SUSPECT',
    verificationStatus: 'HYPOTHESIS',
    confidence: '',
    notes: '',
  });

  const existingPersonIds = new Set(participants.map((p) => p.personId));
  const unlinkedPeople = availablePeople.filter((p) => !existingPersonIds.has(p.id));

  const ruledOutCount = participants.filter(
    (p) => p.verificationStatus === 'RULED_OUT'
  ).length;
  const visibleParticipants = showRuledOut
    ? participants
    : participants.filter((p) => p.verificationStatus !== 'RULED_OUT');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personId) {
      setError(t('selectPerson'));
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/events/${eventId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: formData.personId,
          role: formData.role.trim() || null,
          involvementType: formData.involvementType || 'SUSPECT',
          verificationStatus: formData.verificationStatus || 'HYPOTHESIS',
          confidence: formData.confidence || null,
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || tEvents('errorSaving'));
        setIsLoading(false);
        return;
      }

      toast.success(t('addParticipant'));
      setShowAddModal(false);
      setFormData({
        personId: '',
        role: '',
        involvementType: 'SUSPECT',
        verificationStatus: 'HYPOTHESIS',
        confidence: '',
        notes: '',
      });
      router.refresh();
      refreshIndex();
    } catch {
      setError(tEvents('errorSaving'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipant) return;

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/events/${eventId}/people`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedParticipant.id,
          personId: selectedParticipant.personId,
          role: formData.role.trim() || null,
          involvementType: formData.involvementType || 'SUSPECT',
          verificationStatus: formData.verificationStatus || 'HYPOTHESIS',
          confidence: formData.confidence || null,
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || tEvents('errorSaving'));
        setIsLoading(false);
        return;
      }

      toast.success(tCommon('save'));
      setShowEditModal(false);
      setSelectedParticipant(null);
      router.refresh();
    } catch {
      setError(tEvents('errorSaving'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStatusChange = async (
    participant: Participant,
    newStatus: string
  ) => {
    try {
      const response = await fetch(`/api/events/${eventId}/people`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: participant.id,
          personId: participant.personId,
          verificationStatus: newStatus,
        }),
      });
      if (response.ok) {
        toast.success(
          tEvents('statusUpdatedToast', {
            status: verificationLabels[newStatus] || newStatus,
          })
        );
        router.refresh();
      }
    } catch {
      toast.error(tEvents('errorSaving'));
    }
  };

  const handleDelete = async () => {
    if (!selectedParticipant) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/events/${eventId}/people?personId=${encodeURIComponent(selectedParticipant.personId)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || tEvents('errorSaving'));
        return;
      }

      setShowDeleteModal(false);
      setSelectedParticipant(null);
      router.refresh();
      refreshIndex();
    } catch {
      setError(tEvents('errorSaving'));
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (participant: Participant) => {
    setSelectedParticipant(participant);
    setFormData({
      personId: participant.personId,
      role: participant.role || '',
      involvementType: participant.involvementType || 'SUSPECT',
      verificationStatus: participant.verificationStatus || 'HYPOTHESIS',
      confidence: participant.confidence || '',
      notes: participant.notes || '',
    });
    setError('');
    setShowEditModal(true);
  };

  const openDeleteModal = (participant: Participant) => {
    setSelectedParticipant(participant);
    setError('');
    setShowDeleteModal(true);
  };

  return (
    <div className="bg-surface shadow rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">
            {t('participants')} ({visibleParticipants.length}
            {ruledOutCount > 0 && !showRuledOut ? ` / ${participants.length}` : ''})
          </h2>
          {ruledOutCount > 0 && (
            <button
              type="button"
              onClick={() => setShowRuledOut((prev) => !prev)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                showRuledOut
                  ? 'bg-primary/15 text-primary border-primary/40 font-medium'
                  : 'bg-muted/20 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {showRuledOut
                ? tEvents('hideRuledOutCount', { count: ruledOutCount })
                : tEvents('showRuledOutCount', { count: ruledOutCount })}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/people/new?connectedEventId=${eventId}`}>
            <Button variant="secondary" size="sm">
              + {t('newPersonForEvent')}
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFormData({
                personId: '',
                role: '',
                involvementType: 'SUSPECT',
                verificationStatus: 'HYPOTHESIS',
                confidence: '',
                notes: '',
              });
              setError('');
              setShowAddModal(true);
            }}
          >
            + {t('addParticipant')}
          </Button>
        </div>
      </div>

      {visibleParticipants.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noParticipants')}</p>
      ) : (
        <div className="space-y-3">
          {visibleParticipants.map((participant) => {
            const displayName = formatGraphName(
              participant.person,
              nameOrder,
              nameDisplayFormat
            );
            const invType = participant.involvementType || 'SUSPECT';
            const verStatus = participant.verificationStatus || 'HYPOTHESIS';
            return (
              <div
                key={participant.id}
                className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3.5 rounded-lg border transition-colors ${
                  verStatus === 'RULED_OUT'
                    ? 'border-border bg-muted/10 opacity-65'
                    : verStatus === 'CONFIRMED'
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-border hover:bg-muted/20'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Link href={`/people/${participant.person.id}`}>
                    <PersonAvatar
                      personId={participant.person.id}
                      photo={participant.person.photo}
                      name={displayName}
                      size={36}
                    />
                  </Link>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/people/${participant.person.id}`}
                        className={`text-sm font-semibold hover:underline ${
                          verStatus === 'RULED_OUT'
                            ? 'text-muted-foreground line-through'
                            : 'text-primary'
                        }`}
                      >
                        {displayName}
                      </Link>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          INVOLVEMENT_BADGE_CLASSES[invType] ||
                          INVOLVEMENT_BADGE_CLASSES.SUSPECT
                        }`}
                      >
                        {involvementLabels[invType] || invType}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                          VERIFICATION_BADGE_CLASSES[verStatus] ||
                          VERIFICATION_BADGE_CLASSES.HYPOTHESIS
                        }`}
                      >
                        {verificationLabels[verStatus] || verStatus}
                      </span>
                      {participant.confidence && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-elevated border border-border text-muted-foreground">
                          {tEvents('confidencePrefix', {
                            level: confidenceLabels[participant.confidence] || participant.confidence,
                          })}
                        </span>
                      )}
                      {participant.role && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {participant.role}
                        </span>
                      )}
                    </div>
                    {participant.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-line">
                        📋 {participant.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                  <select
                    aria-label={tEvents('verificationStatusLabel')}
                    value={verStatus}
                    onChange={(e) =>
                      handleQuickStatusChange(participant, e.target.value)
                    }
                    className="text-xs rounded border border-border bg-surface px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="HYPOTHESIS">{verificationLabels.HYPOTHESIS}</option>
                    <option value="INVESTIGATING">{verificationLabels.INVESTIGATING}</option>
                    <option value="CONFIRMED">{verificationLabels.CONFIRMED}</option>
                    <option value="RULED_OUT">{verificationLabels.RULED_OUT}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => openEditModal(participant)}
                    className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-1"
                  >
                    {tCommon('edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(participant)}
                    className="text-xs text-error hover:underline px-1.5 py-1"
                  >
                    {tCommon('delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              {t('addParticipant')}
            </h3>
            {error && (
              <div className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error">
                {error}
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('selectPerson')}
                </label>
                <PersonAutocomplete
                  people={unlinkedPeople}
                  value={formData.personId}
                  onChange={(personId) =>
                    setFormData((prev) => ({ ...prev, personId }))
                  }
                  placeholder={t('selectPerson')}
                  nameOrder={nameOrder}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {tEvents('involvementTypeLabel')}
                  </label>
                  <select
                    value={formData.involvementType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        involvementType: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="SUSPECT">{involvementLabels.SUSPECT}</option>
                    <option value="PERSON_OF_INTEREST">{involvementLabels.PERSON_OF_INTEREST}</option>
                    <option value="ACCOMPLICE">{involvementLabels.ACCOMPLICE}</option>
                    <option value="WITNESS">{involvementLabels.WITNESS}</option>
                    <option value="VICTIM">{involvementLabels.VICTIM}</option>
                    <option value="INFORMANT">{involvementLabels.INFORMANT}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {tEvents('verificationStatusLabel')}
                  </label>
                  <select
                    value={formData.verificationStatus}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        verificationStatus: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="HYPOTHESIS">{verificationLabels.HYPOTHESIS}</option>
                    <option value="INVESTIGATING">{verificationLabels.INVESTIGATING}</option>
                    <option value="CONFIRMED">{verificationLabels.CONFIRMED}</option>
                    <option value="RULED_OUT">{verificationLabels.RULED_OUT}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {tEvents('confidenceLevelLabel')}
                  </label>
                  <select
                    value={formData.confidence}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        confidence: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">{tEvents('confidenceOptional')}</option>
                    <option value="HIGH">{confidenceLabels.HIGH}</option>
                    <option value="MEDIUM">{confidenceLabels.MEDIUM}</option>
                    <option value="LOW">{confidenceLabels.LOW}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('role')}
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, role: e.target.value }))
                    }
                    placeholder={t('rolePlaceholder')}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {tEvents('evidenceNotesLabel')}
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder={tEvents('evidenceNotesPlaceholder')}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={isLoading}
                >
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={isLoading}>
                  {tCommon('add')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              {tCommon('edit')} -{' '}
              {formatGraphName(
                selectedParticipant.person,
                nameOrder,
                nameDisplayFormat
              )}
            </h3>
            {error && (
              <div className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error">
                {error}
              </div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {tEvents('involvementTypeLabel')}
                  </label>
                  <select
                    value={formData.involvementType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        involvementType: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="SUSPECT">{involvementLabels.SUSPECT}</option>
                    <option value="PERSON_OF_INTEREST">{involvementLabels.PERSON_OF_INTEREST}</option>
                    <option value="ACCOMPLICE">{involvementLabels.ACCOMPLICE}</option>
                    <option value="WITNESS">{involvementLabels.WITNESS}</option>
                    <option value="VICTIM">{involvementLabels.VICTIM}</option>
                    <option value="INFORMANT">{involvementLabels.INFORMANT}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {tEvents('verificationStatusLabel')}
                  </label>
                  <select
                    value={formData.verificationStatus}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        verificationStatus: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="HYPOTHESIS">{verificationLabels.HYPOTHESIS}</option>
                    <option value="INVESTIGATING">{verificationLabels.INVESTIGATING}</option>
                    <option value="CONFIRMED">{verificationLabels.CONFIRMED}</option>
                    <option value="RULED_OUT">{verificationLabels.RULED_OUT}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {tEvents('confidenceLevelLabel')}
                  </label>
                  <select
                    value={formData.confidence}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        confidence: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">{tEvents('confidenceOptional')}</option>
                    <option value="HIGH">{confidenceLabels.HIGH}</option>
                    <option value="MEDIUM">{confidenceLabels.MEDIUM}</option>
                    <option value="LOW">{confidenceLabels.LOW}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('role')}
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, role: e.target.value }))
                    }
                    placeholder={t('rolePlaceholder')}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {tEvents('evidenceNotesLabel')}
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder={tEvents('evidenceNotesPlaceholder')}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={isLoading}
                >
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={isLoading}>
                  {tCommon('save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('removeParticipant')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {formatGraphName(
                selectedParticipant.person,
                nameOrder,
                nameDisplayFormat
              )}
            </p>
            {error && (
              <div className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error">
                {error}
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isLoading}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {tCommon('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

