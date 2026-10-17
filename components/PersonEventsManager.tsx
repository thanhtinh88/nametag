'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import PersonAvatar from './PersonPhoto';
import { formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';

interface CoParticipantPerson {
  id: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
  photo?: string | null;
}

interface EventItem {
  id: string;
  title: string;
  category: string | null;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  startDate: Date | string | null;
  people: Array<{
    personId: string;
    role: string | null;
    person: CoParticipantPerson;
  }>;
}

interface PersonEventEntry {
  id: string;
  eventId: string;
  role: string | null;
  involvementType?: string;
  verificationStatus?: string;
  confidence?: string | null;
  notes: string | null;
  event: EventItem;
}

interface AvailableEventOption {
  id: string;
  title: string;
}

interface PersonEventsManagerProps {
  personId: string;
  personEvents: PersonEventEntry[];
  availableEvents: AvailableEventOption[];
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

export default function PersonEventsManager({
  personId,
  personEvents,
  availableEvents,
  nameOrder,
  nameDisplayFormat,
}: PersonEventsManagerProps) {
  const t = useTranslations('events.personSection');
  const tEvents = useTranslations('events');
  const tStatus = useTranslations('events.status');
  const tDetail = useTranslations('events.detail');
  const tCommon = useTranslations('common');
  const router = useRouter();

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
  const [showRuledOut, setShowRuledOut] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    eventId: '',
    role: '',
    involvementType: 'SUSPECT',
    verificationStatus: 'HYPOTHESIS',
    confidence: '',
    notes: '',
  });

  const existingEventIds = new Set(personEvents.map((pe) => pe.eventId));
  const unlinkedEvents = availableEvents.filter(
    (ev) => !existingEventIds.has(ev.id)
  );

  const ruledOutCount = personEvents.filter(
    (pe) => pe.verificationStatus === 'RULED_OUT'
  ).length;
  const visiblePersonEvents = showRuledOut
    ? personEvents
    : personEvents.filter((pe) => pe.verificationStatus !== 'RULED_OUT');

  // Compute co-participants across all events this person is part of
  const coParticipantsMap = new Map<
    string,
    {
      person: CoParticipantPerson;
      sharedEvents: Array<{ id: string; title: string; role: string | null }>;
    }
  >();

  for (const pe of personEvents) {
    if (pe.verificationStatus === 'RULED_OUT' && !showRuledOut) continue;
    for (const participant of pe.event.people) {
      if (participant.personId === personId) continue;
      const existing = coParticipantsMap.get(participant.personId);
      if (existing) {
        existing.sharedEvents.push({
          id: pe.event.id,
          title: pe.event.title,
          role: participant.role,
        });
      } else {
        coParticipantsMap.set(participant.personId, {
          person: participant.person,
          sharedEvents: [
            {
              id: pe.event.id,
              title: pe.event.title,
              role: participant.role,
            },
          ],
        });
      }
    }
  }

  const coParticipants = Array.from(coParticipantsMap.values());

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.eventId) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/events/${formData.eventId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId,
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

      toast.success(t('addEvent'));
      setShowAddModal(false);
      setFormData({
        eventId: '',
        role: '',
        involvementType: 'SUSPECT',
        verificationStatus: 'HYPOTHESIS',
        confidence: '',
        notes: '',
      });
      router.refresh();
    } catch {
      setError(tEvents('errorSaving'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStatusChange = async (
    pe: PersonEventEntry,
    newStatus: string
  ) => {
    try {
      const response = await fetch(`/api/events/${pe.event.id}/people`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pe.id,
          personId,
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

  const handleRemove = async (eventId: string) => {
    try {
      const response = await fetch(
        `/api/events/${eventId}/people?personId=${encodeURIComponent(personId)}`,
        {
          method: 'DELETE',
        }
      );
      if (response.ok) {
        router.refresh();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-6">
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-foreground">
              {t('title')} ({visiblePersonEvents.length}
              {ruledOutCount > 0 && !showRuledOut ? ` / ${personEvents.length}` : ''})
            </h3>
            {ruledOutCount > 0 && (
              <button
                type="button"
                onClick={() => setShowRuledOut((prev) => !prev)}
                className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
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
          {unlinkedEvents.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setFormData({
                  eventId: unlinkedEvents[0]?.id || '',
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
              + {t('addEvent')}
            </Button>
          )}
        </div>

        {visiblePersonEvents.length === 0 ? (
          <p className="text-sm text-muted">{t('noEvents')}</p>
        ) : (
          <div className="space-y-2">
            {visiblePersonEvents.map((pe) => {
              const invType = pe.involvementType || 'SUSPECT';
              const verStatus = pe.verificationStatus || 'HYPOTHESIS';
              return (
                <div
                  key={pe.id}
                  className={`flex flex-col sm:flex-row sm:items-start justify-between gap-2 p-3 rounded-lg border ${
                    verStatus === 'RULED_OUT'
                      ? 'bg-muted/10 border-border opacity-65'
                      : verStatus === 'CONFIRMED'
                      ? 'bg-red-500/5 border-red-500/40'
                      : 'bg-surface-elevated border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/events/${pe.event.id}`}
                        className={`text-sm font-semibold hover:underline ${
                          verStatus === 'RULED_OUT'
                            ? 'text-muted-foreground line-through'
                            : 'text-primary'
                        }`}
                      >
                        {pe.event.title}
                      </Link>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface text-muted">
                        {tStatus(pe.event.status)}
                      </span>
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
                      {pe.confidence && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface border border-border text-muted-foreground">
                          {confidenceLabels[pe.confidence] || pe.confidence}
                        </span>
                      )}
                      {pe.role && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {pe.role}
                        </span>
                      )}
                    </div>
                    {pe.notes && (
                      <p className="text-xs text-muted mt-1">📋 {pe.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <select
                      aria-label={tEvents('verificationStatusLabel')}
                      value={verStatus}
                      onChange={(e) =>
                        handleQuickStatusChange(pe, e.target.value)
                      }
                      className="text-xs rounded border border-border bg-surface px-2 py-1 text-foreground"
                    >
                      <option value="HYPOTHESIS">{verificationLabels.HYPOTHESIS}</option>
                      <option value="INVESTIGATING">{verificationLabels.INVESTIGATING}</option>
                      <option value="CONFIRMED">{verificationLabels.CONFIRMED}</option>
                      <option value="RULED_OUT">{verificationLabels.RULED_OUT}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemove(pe.event.id)}
                      className="text-xs text-error hover:underline"
                    >
                      {tCommon('delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Co-participants discovery section */}
      {personEvents.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground mb-1">
            {t('coParticipants')} ({coParticipants.length})
          </h4>
          <p className="text-xs text-muted mb-3">
            {t('coParticipantsDescription')}
          </p>

          {coParticipants.length === 0 ? (
            <p className="text-xs text-muted">{t('noCoParticipants')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {coParticipants.map(({ person, sharedEvents }) => {
                const displayName = formatGraphName(
                  person,
                  nameOrder,
                  nameDisplayFormat
                );
                return (
                  <div
                    key={person.id}
                    className="flex items-start space-x-3 p-2.5 rounded-lg bg-surface-elevated"
                  >
                    <Link href={`/people/${person.id}`}>
                      <PersonAvatar
                        personId={person.id}
                        photo={person.photo}
                        name={displayName}
                        size={32}
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/people/${person.id}`}
                        className="text-sm font-medium text-primary hover:underline block truncate"
                      >
                        {displayName}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sharedEvents.map((ev) => (
                          <Link
                            key={ev.id}
                            href={`/events/${ev.id}`}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-surface text-muted hover:text-primary"
                          >
                            📅 {ev.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              {t('addEvent')}
            </h3>
            {error && (
              <div className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error">
                {error}
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {tDetail('selectEvent')}
                </label>
                <select
                  value={formData.eventId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      eventId: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  {unlinkedEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
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
                    {tDetail('role')}
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, role: e.target.value }))
                    }
                    placeholder={tDetail('rolePlaceholder')}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {tEvents('evidenceNotesLabel')}
                </label>
                <textarea
                  rows={2}
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
    </div>
  );
}

