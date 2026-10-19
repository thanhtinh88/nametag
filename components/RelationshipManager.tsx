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

interface RelationshipType {
  id: string;
  name: string;
  label: string;
  color: string | null;
  inverseId: string | null;
}

interface Relationship {
  id: string;
  personId: string;
  relatedPersonId?: string;
  relationshipTypeId: string | null;
  verificationStatus?: string | null;
  confidence?: string | null;
  source?: string | null;
  startDate?: string | null | Date;
  endDate?: string | null | Date;
  notes: string | null;
  person: Person;
  relationshipType: RelationshipType | null;
}

interface RelationshipManagerProps {
  personId: string;
  personName: string;
  relationships: Relationship[];
  availablePeople: Person[];
  relationshipTypes: RelationshipType[];
  nameOrder?: 'WESTERN' | 'EASTERN';
  nameDisplayFormat?: NameDisplayFormat;
}

export default function RelationshipManager({
  personId,
  personName,
  relationships,
  availablePeople,
  relationshipTypes,
  nameOrder,
  nameDisplayFormat,
}: RelationshipManagerProps) {
  const t = useTranslations('people');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { refreshIndex } = useSearchIndex();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRelationship, setSelectedRelationship] =
    useState<Relationship | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Find default FRIEND type or use first available
  const defaultTypeId = relationshipTypes.find((t) => t.name === 'FRIEND')?.id || relationshipTypes[0]?.id || '';

  const [formData, setFormData] = useState({
    relatedPersonId: '',
    relationshipTypeId: defaultTypeId,
    verificationStatus: 'CONFIRMED' as 'UNVERIFIED' | 'INVESTIGATING' | 'CONFIRMED' | 'RULED_OUT',
    confidence: 'HIGH' as 'HIGH' | 'MEDIUM' | 'LOW',
    source: '',
    startDate: '',
    endDate: '',
    notes: '',
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: formData.relatedPersonId,  // The other person (source)
          relatedPersonId: personId,           // The current person (target)
          relationshipTypeId: formData.relationshipTypeId,  // Use the type the user selected
          verificationStatus: formData.verificationStatus,
          confidence: formData.confidence,
          source: formData.source.trim() || null,
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create relationship');
        setIsLoading(false);
        return;
      }

      const relatedPerson = availablePeople.find(p => p.id === formData.relatedPersonId);
      toast.success(`Relationship with ${formatGraphName(relatedPerson!, nameOrder, nameDisplayFormat)} has been added`);

      setShowAddModal(false);
      setFormData({
        relatedPersonId: '',
        relationshipTypeId: defaultTypeId,
        verificationStatus: 'CONFIRMED',
        confidence: 'HIGH',
        source: '',
        startDate: '',
        endDate: '',
        notes: '',
      });
      router.refresh();
      refreshIndex();
    } catch (_error) {
      setError('Unable to connect to server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRelationship) return;

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/relationships/${selectedRelationship.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipTypeId: formData.relationshipTypeId,
          verificationStatus: formData.verificationStatus,
          confidence: formData.confidence,
          source: formData.source.trim() || null,
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
          notes: formData.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update relationship');
        setIsLoading(false);
        return;
      }

      toast.success(`Relationship with ${formatGraphName(selectedRelationship.person, nameOrder, nameDisplayFormat)} has been updated`);

      setShowEditModal(false);
      setSelectedRelationship(null);
      router.refresh();
      refreshIndex();
    } catch (_error) {
      setError('Unable to connect to server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRelationship) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/relationships/${selectedRelationship.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete relationship. Please try again.');
        return;
      }

      setShowDeleteModal(false);
      setSelectedRelationship(null);
      router.refresh();
      refreshIndex();
    } catch (_error) {
      setError('Unable to connect to server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (relationship: Relationship) => {
    setSelectedRelationship(relationship);
    const startStr = relationship.startDate
      ? new Date(relationship.startDate).toISOString().substring(0, 10)
      : '';
    const endStr = relationship.endDate
      ? new Date(relationship.endDate).toISOString().substring(0, 10)
      : '';

    setFormData({
      relatedPersonId: relationship.personId,
      relationshipTypeId: relationship.relationshipTypeId || defaultTypeId,
      verificationStatus: (relationship.verificationStatus as typeof formData.verificationStatus) || 'CONFIRMED',
      confidence: (relationship.confidence as typeof formData.confidence) || 'HIGH',
      source: relationship.source || '',
      startDate: startStr,
      endDate: endStr,
      notes: relationship.notes || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (relationship: Relationship) => {
    setSelectedRelationship(relationship);
    setShowDeleteModal(true);
  };

  const handleCreateNewPerson = (searchTerm: string) => {
    // Navigate to create person page with pre-filled data
    const params = new URLSearchParams({
      name: searchTerm,
      knownThrough: personId,
      relationshipType: formData.relationshipTypeId,
    });
    router.push(`/people/new?${params.toString()}`);
  };

  const renderVerificationBadge = (status?: string | null) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            ✓ {t('verificationStatuses.CONFIRMED')}
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            🔍 {t('verificationStatuses.INVESTIGATING')}
          </span>
        );
      case 'UNVERIFIED':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-dashed border-orange-500/40">
            ❓ {t('verificationStatuses.UNVERIFIED')}
          </span>
        );
      case 'RULED_OUT':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20 line-through">
            ✕ {t('verificationStatuses.RULED_OUT')}
          </span>
        );
      default:
        return null;
    }
  };

  const formatDateDisplay = (dateVal?: string | null | Date) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-base font-medium text-muted">
          {t('otherRelationships')}
        </h4>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          {t('addRelationship')}
        </button>
      </div>

      {relationships.length === 0 ? (
        <p className="text-muted text-sm">
          {t('noRelationshipsYet')}
        </p>
      ) : (
        <div className="space-y-2">
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap text-foreground">
                  {t.rich('isRelationshipOf', {
                    name: () => (
                      <span className="inline-flex items-center gap-1.5">
                        <PersonAvatar personId={rel.personId} name={formatGraphName(rel.person, nameOrder, nameDisplayFormat)} photo={rel.person.photo} size={24} />
                        <Link
                          href={`/people/${rel.personId}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {formatGraphName(rel.person, nameOrder, nameDisplayFormat)}
                        </Link>
                      </span>
                    ),
                    personName: personName,
                    type: () => (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: rel.relationshipType?.color
                            ? `${rel.relationshipType.color}20`
                            : 'var(--badge-bg)',
                          color: rel.relationshipType?.color || 'var(--badge-text)',
                        }}
                      >
                        {rel.relationshipType?.label || 'Unknown'}
                      </span>
                    ),
                  })}
                  {renderVerificationBadge(rel.verificationStatus)}
                </div>

                {(rel.startDate || rel.endDate || rel.source) && (
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted mt-1">
                    {(rel.startDate || rel.endDate) && (
                      <span>
                        🕒 {formatDateDisplay(rel.startDate) || '...'} → {formatDateDisplay(rel.endDate) || t('present')}
                      </span>
                    )}
                    {rel.source && (
                      <span className="inline-flex items-center gap-1">
                        📁 {t('relationshipSource')}: <span className="font-medium text-foreground">{rel.source}</span>
                      </span>
                    )}
                  </div>
                )}

                {rel.notes && (
                  <p className="text-sm text-muted mt-1">
                    {rel.notes}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => openEditModal(rel)}
                  className="text-primary hover:text-primary-dark transition-colors"
                  aria-label={t('edit')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => openDeleteModal(rel)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                  aria-label={t('delete')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-relationship-title">
          <div className="bg-surface rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 id="add-relationship-title" className="text-lg font-semibold text-foreground mb-4">
              {t('addRelationship')}
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              {error && (
                <div className="bg-warning/10 border border-warning/30 text-warning px-3 py-2 rounded text-sm" role="alert">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  {t('person')} *
                </label>
                <PersonAutocomplete
                  people={availablePeople}
                  value={formData.relatedPersonId}
                  onChange={(personId) =>
                    setFormData({ ...formData, relatedPersonId: personId })
                  }
                  placeholder={t('searchForPerson')}
                  required
                  onCreateNew={handleCreateNewPerson}
                  nameOrder={nameOrder}
                  nameDisplayFormat={nameDisplayFormat}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  {t('relationshipType')} *
                </label>
                <select
                  required
                  value={formData.relationshipTypeId}
                  onChange={(e) =>
                    setFormData({ ...formData, relationshipTypeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {relationshipTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Investigation Verification & Confidence */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    {t('verificationStatus')}
                  </label>
                  <select
                    value={formData.verificationStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        verificationStatus: e.target.value as typeof formData.verificationStatus,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="CONFIRMED">✓ {t('verificationStatuses.CONFIRMED')}</option>
                    <option value="INVESTIGATING">🔍 {t('verificationStatuses.INVESTIGATING')}</option>
                    <option value="UNVERIFIED">❓ {t('verificationStatuses.UNVERIFIED')}</option>
                    <option value="RULED_OUT">✕ {t('verificationStatuses.RULED_OUT')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    {t('confidenceLevel')}
                  </label>
                  <select
                    value={formData.confidence}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confidence: e.target.value as typeof formData.confidence,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="HIGH">{t('confidenceLevels.HIGH')}</option>
                    <option value="MEDIUM">{t('confidenceLevels.MEDIUM')}</option>
                    <option value="LOW">{t('confidenceLevels.LOW')}</option>
                  </select>
                </div>
              </div>

              {/* Basis / Source */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  {t('relationshipSource')}
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder={t('relationshipSourcePlaceholder')}
                />
              </div>

              {/* Timeline (Start / End Date) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    {t('relationshipStartDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    {t('relationshipEndDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  {t('notes')}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('optionalNotes')}
                />
              </div>
              {/* Preview sentence */}
              {formData.relatedPersonId && (
                <div
                  className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm text-primary"
                  data-testid="relationship-preview"
                >
                  {(() => {
                    const selectedPerson = availablePeople.find(p => p.id === formData.relatedPersonId);
                    const selectedType = formData.relationshipTypeId
                      ? relationshipTypes.find(rt => rt.id === formData.relationshipTypeId)
                      : null;

                    const nameDisplay = selectedPerson
                      ? formatGraphName(selectedPerson, nameOrder, nameDisplayFormat)
                      : t('formPreviewSelectPerson');
                    const typeDisplay = selectedType
                      ? selectedType.label
                      : t('formPreviewSelectType');

                    return t('formPreview', {
                      name: nameDisplay,
                      personName: personName,
                      type: typeDisplay,
                    });
                  })()}
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? t('adding') : t('addRelationship')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRelationship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-relationship-title">
          <div className="bg-surface rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 id="edit-relationship-title" className="text-lg font-semibold text-foreground mb-4">
              {t('editRelationship', { name: formatGraphName(selectedRelationship.person, nameOrder, nameDisplayFormat) })}
            </h3>
            <form onSubmit={handleEdit} className="space-y-4">
              {error && (
                <div className="bg-warning/10 border border-warning/30 text-warning px-3 py-2 rounded text-sm" role="alert">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  {t('relationshipType')} *
                </label>
                <select
                  required
                  value={formData.relationshipTypeId}
                  onChange={(e) =>
                    setFormData({ ...formData, relationshipTypeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {relationshipTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Investigation Verification & Confidence */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    {t('verificationStatus')}
                  </label>
                  <select
                    value={formData.verificationStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        verificationStatus: e.target.value as typeof formData.verificationStatus,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="CONFIRMED">✓ {t('verificationStatuses.CONFIRMED')}</option>
                    <option value="INVESTIGATING">🔍 {t('verificationStatuses.INVESTIGATING')}</option>
                    <option value="UNVERIFIED">❓ {t('verificationStatuses.UNVERIFIED')}</option>
                    <option value="RULED_OUT">✕ {t('verificationStatuses.RULED_OUT')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    {t('confidenceLevel')}
                  </label>
                  <select
                    value={formData.confidence}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confidence: e.target.value as typeof formData.confidence,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="HIGH">{t('confidenceLevels.HIGH')}</option>
                    <option value="MEDIUM">{t('confidenceLevels.MEDIUM')}</option>
                    <option value="LOW">{t('confidenceLevels.LOW')}</option>
                  </select>
                </div>
              </div>

              {/* Basis / Source */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  {t('relationshipSource')}
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder={t('relationshipSourcePlaceholder')}
                />
              </div>

              {/* Timeline (Start / End Date) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    {t('relationshipStartDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    {t('relationshipEndDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  {t('notes')}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('optionalNotes')}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? t('saving') : t('saveChanges')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedRelationship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-relationship-title" aria-describedby="delete-relationship-desc">
          <div className="bg-surface rounded-lg max-w-md w-full p-6">
            <h3 id="delete-relationship-title" className="text-lg font-semibold text-foreground mb-2">
              {t('deleteRelationship')}
            </h3>
            <p id="delete-relationship-desc" className="text-muted mb-6">
              {t('deleteRelationshipConfirm', { name: formatGraphName(selectedRelationship.person, nameOrder, nameDisplayFormat) })}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-warning/10 border border-warning/30 text-warning rounded text-sm" role="alert">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isLoading}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? t('deleting') : t('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
