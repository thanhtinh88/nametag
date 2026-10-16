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
  const tStatus = useTranslations('events.status');
  const tDetail = useTranslations('events.detail');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    eventId: '',
    role: '',
    notes: '',
  });

  const existingEventIds = new Set(personEvents.map((pe) => pe.eventId));
  const unlinkedEvents = availableEvents.filter(
    (ev) => !existingEventIds.has(ev.id)
  );

  // Compute co-participants across all events this person is part of
  const coParticipantsMap = new Map<
    string,
    {
      person: CoParticipantPerson;
      sharedEvents: Array<{ id: string; title: string; role: string | null }>;
    }
  >();

  for (const pe of personEvents) {
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
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to add to event');
        setIsLoading(false);
        return;
      }

      toast.success(t('addEvent'));
      setShowAddModal(false);
      setFormData({ eventId: '', role: '', notes: '' });
      router.refresh();
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setIsLoading(false);
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {t('title')} ({personEvents.length})
          </h3>
          {unlinkedEvents.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setFormData({
                  eventId: unlinkedEvents[0]?.id || '',
                  role: '',
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

        {personEvents.length === 0 ? (
          <p className="text-sm text-muted">{t('noEvents')}</p>
        ) : (
          <div className="space-y-2">
            {personEvents.map((pe) => (
              <div
                key={pe.id}
                className="flex items-start justify-between p-3 bg-surface-elevated rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/events/${pe.event.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {pe.event.title}
                    </Link>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface text-muted">
                      {tStatus(pe.event.status)}
                    </span>
                    {pe.role && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {pe.role}
                      </span>
                    )}
                  </div>
                  {pe.notes && (
                    <p className="text-xs text-muted mt-1">{pe.notes}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(pe.event.id)}
                  className="text-xs text-error hover:underline"
                >
                  {tCommon('delete')}
                </button>
              </div>
            ))}
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {tDetail('notes')}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
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

