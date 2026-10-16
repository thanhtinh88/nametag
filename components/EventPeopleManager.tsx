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
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { refreshIndex } = useSearchIndex();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    personId: '',
    role: '',
    notes: '',
  });

  const existingPersonIds = new Set(participants.map((p) => p.personId));
  const unlinkedPeople = availablePeople.filter((p) => !existingPersonIds.has(p.id));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personId) {
      setError('Please select a person');
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
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to add person to event');
        setIsLoading(false);
        return;
      }

      toast.success(t('addParticipant'));
      setShowAddModal(false);
      setFormData({ personId: '', role: '', notes: '' });
      router.refresh();
      refreshIndex();
    } catch {
      setError('Unable to connect to server. Please check your connection and try again.');
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
          personId: selectedParticipant.personId,
          role: formData.role.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update participant');
        setIsLoading(false);
        return;
      }

      toast.success(tCommon('save'));
      setShowEditModal(false);
      setSelectedParticipant(null);
      router.refresh();
    } catch {
      setError('Unable to connect to server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
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
        setError(data.error || 'Failed to remove participant.');
        return;
      }

      setShowDeleteModal(false);
      setSelectedParticipant(null);
      router.refresh();
      refreshIndex();
    } catch {
      setError('Unable to connect to server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (participant: Participant) => {
    setSelectedParticipant(participant);
    setFormData({
      personId: participant.personId,
      role: participant.role || '',
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-foreground">
          {t('participants')} ({participants.length})
        </h2>
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
              setFormData({ personId: '', role: '', notes: '' });
              setError('');
              setShowAddModal(true);
            }}
          >
            + {t('addParticipant')}
          </Button>
        </div>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noParticipants')}</p>
      ) : (
        <div className="space-y-3">
          {participants.map((participant) => {
            const displayName = formatGraphName(
              participant.person,
              nameOrder,
              nameDisplayFormat
            );
            return (
              <div
                key={participant.id}
                className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <Link href={`/people/${participant.person.id}`}>
                    <PersonAvatar
                      personId={participant.person.id}
                      photo={participant.person.photo}
                      name={displayName}
                      size={32}
                    />
                  </Link>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/people/${participant.person.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {displayName}
                      </Link>
                      {participant.role && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {participant.role}
                        </span>
                      )}
                    </div>
                    {participant.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {participant.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(participant)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {tCommon('edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(participant)}
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('notes')}
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('notes')}
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

