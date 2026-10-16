'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from './ui/Button';

interface RelatedEventItem {
  id: string;
  title: string;
  category: string | null;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  startDate: Date | string | null;
}

interface EventRelationshipItem {
  id: string;
  toEventId: string;
  relationshipType: string | null;
  notes: string | null;
  toEvent: RelatedEventItem;
}

interface EventRelationshipManagerProps {
  eventId: string;
  relationships: EventRelationshipItem[];
  availableEvents: RelatedEventItem[];
}

const inputClass =
  'block w-full rounded-md border border-input bg-surface text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2';

export default function EventRelationshipManager({
  eventId,
  relationships,
  availableEvents,
}: EventRelationshipManagerProps) {
  const t = useTranslations('events.detail');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRel, setSelectedRel] = useState<EventRelationshipItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    relatedEventId: '',
    relationshipType: '',
    notes: '',
  });

  const existingEventIds = new Set([
    eventId,
    ...relationships.map((r) => r.toEventId),
  ]);
  const unlinkedEvents = availableEvents.filter((ev) => !existingEventIds.has(ev.id));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.relatedEventId) {
      setError('Please select an event');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/events/${eventId}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relatedEventId: formData.relatedEventId,
          relationshipType: formData.relationshipType.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to add related event');
        setIsLoading(false);
        return;
      }

      toast.success(t('addRelatedEvent'));
      setShowAddModal(false);
      setFormData({ relatedEventId: '', relationshipType: '', notes: '' });
      router.refresh();
    } catch {
      setError('Unable to connect to server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRel) return;

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/events/${eventId}/relationships`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relatedEventId: selectedRel.toEventId,
          relationshipType: formData.relationshipType.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update related event');
        setIsLoading(false);
        return;
      }

      toast.success(tCommon('save'));
      setShowEditModal(false);
      setSelectedRel(null);
      router.refresh();
    } catch {
      setError('Unable to connect to server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRel) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/events/${eventId}/relationships?relatedEventId=${encodeURIComponent(selectedRel.toEventId)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to remove related event.');
        return;
      }

      setShowDeleteModal(false);
      setSelectedRel(null);
      router.refresh();
    } catch {
      setError('Unable to connect to server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-foreground">
          {t('relatedEvents')} ({relationships.length})
        </h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setFormData({
              relatedEventId: unlinkedEvents[0]?.id || '',
              relationshipType: '',
              notes: '',
            });
            setError('');
            setShowAddModal(true);
          }}
        >
          + {t('addRelatedEvent')}
        </Button>
      </div>

      {relationships.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noRelatedEvents')}</p>
      ) : (
        <div className="space-y-3">
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/events/${rel.toEvent.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {rel.toEvent.title}
                  </Link>
                  {rel.relationshipType && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                      {rel.relationshipType}
                    </span>
                  )}
                </div>
                {rel.notes && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {rel.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRel(rel);
                    setFormData({
                      relatedEventId: rel.toEventId,
                      relationshipType: rel.relationshipType || '',
                      notes: rel.notes || '',
                    });
                    setError('');
                    setShowEditModal(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {tCommon('edit')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRel(rel);
                    setError('');
                    setShowDeleteModal(true);
                  }}
                  className="text-xs text-error hover:underline"
                >
                  {tCommon('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              {t('addRelatedEvent')}
            </h3>
            {error && (
              <div className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error">
                {error}
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('selectEvent')}
                </label>
                <select
                  value={formData.relatedEventId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      relatedEventId: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">{t('selectEvent')}</option>
                  {unlinkedEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('relationshipType')}
                </label>
                <input
                  type="text"
                  value={formData.relationshipType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      relationshipType: e.target.value,
                    }))
                  }
                  placeholder={t('relationshipTypePlaceholder')}
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
      {showEditModal && selectedRel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              {tCommon('edit')} - {selectedRel.toEvent.title}
            </h3>
            {error && (
              <div className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error">
                {error}
              </div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('relationshipType')}
                </label>
                <input
                  type="text"
                  value={formData.relationshipType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      relationshipType: e.target.value,
                    }))
                  }
                  placeholder={t('relationshipTypePlaceholder')}
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
      {showDeleteModal && selectedRel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {tCommon('delete')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedRel.toEvent.title}
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

