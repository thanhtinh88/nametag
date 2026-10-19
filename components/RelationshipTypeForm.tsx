'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import RelationshipTypeAutocomplete from './RelationshipTypeAutocomplete';
import { getRandomColor, PRESET_COLORS } from '@/lib/colors';
import { Button } from './ui/Button';

interface RelationshipType {
  id: string;
  name: string;
  label: string;
  category?: string | null;
  directionType?: string | null;
  lineStyle?: string | null;
  color: string | null;
  inverseId: string | null;
  inverse?: {
    id: string;
    name: string;
    label: string;
  } | null;
}

interface RelationshipTypeFormProps {
  relationshipType?: RelationshipType;
  availableTypes: RelationshipType[];
  mode: 'create' | 'edit';
}

export default function RelationshipTypeForm({
  relationshipType,
  availableTypes,
  mode,
}: RelationshipTypeFormProps) {
  const t = useTranslations('relationshipTypes.form');
  const tRel = useTranslations('relationshipTypes');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Symmetric relationship toggle (inverse is the same as main, e.g., accomplice <-> accomplice)
  const isInitiallySymmetric =
    relationshipType?.directionType === 'BIDIRECTIONAL' ||
    relationshipType?.inverseId === relationshipType?.id ||
    (!relationshipType && false);

  const [isSymmetric, setIsSymmetric] = useState(isInitiallySymmetric);

  const [formData, setFormData] = useState({
    label: relationshipType?.label || '',
    category: relationshipType?.category || 'CRIMINAL',
    directionType: relationshipType?.directionType || (isInitiallySymmetric ? 'BIDIRECTIONAL' : 'DIRECTED'),
    lineStyle: relationshipType?.lineStyle || 'SOLID',
    color: relationshipType?.color || getRandomColor(),
  });

  // Track inverse relationship
  const [inverseValue, setInverseValue] = useState(relationshipType?.inverseId || '');
  const [inverseIsExisting, setInverseIsExisting] = useState(!!relationshipType?.inverseId);
  const [inverseLabel, setInverseLabel] = useState(relationshipType?.inverse?.label || '');

  const handleRerollColor = () => {
    setFormData((prev) => ({
      ...prev,
      color: getRandomColor(),
    }));
  };

  // Sanitize label to create internal name
  const sanitizeName = (label: string): string => {
    return label
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip vietnamese diacritics for internal code
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
  };

  type RelationshipTypePayload = {
    label: string;
    category: string;
    directionType: string;
    lineStyle: string;
    color: string | null;
    name: string;
    symmetric?: true;
    inverseId?: string | null;
    inverseLabel?: string;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const url =
        mode === 'create'
          ? '/api/relationship-types'
          : `/api/relationship-types/${relationshipType?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      // Generate internal name from label
      const name = sanitizeName(formData.label) || 'CUSTOM_TYPE';

      // Prepare payload
      const payload: RelationshipTypePayload = {
        ...formData,
        directionType: isSymmetric ? 'BIDIRECTIONAL' : 'DIRECTED',
        name,
      };

      // Add inverse relationship data
      if (isSymmetric) {
        // Symmetric relationship - inverse is the same as main
        payload.symmetric = true;
      } else if (inverseValue) {
        if (inverseIsExisting) {
          // Existing type - send ID
          payload.inverseId = inverseValue;
        } else {
          // New type - send label to create
          payload.inverseLabel = inverseLabel || inverseValue;
        }
      } else {
        payload.inverseId = null;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('errorSomethingWrong'));
        return;
      }

      // Show success toast
      toast.success(
        mode === 'create'
          ? t('successCreated', { label: formData.label })
          : t('successUpdated', { label: formData.label })
      );

      router.push('/relationship-types');
      router.refresh();
    } catch {
      setError(t('errorConnection'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="bg-warning/10 border border-warning/30 text-warning px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Label */}
      <div>
        <label
          htmlFor="label"
          className="block text-sm font-medium text-foreground mb-1"
        >
          {t('labelRequired')}
        </label>
        <input
          type="text"
          id="label"
          required
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t('labelPlaceholder')}
        />
        <p className="text-xs text-muted mt-1">
          {t('labelHelp')}
        </p>
      </div>

      {/* Category selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-foreground mb-1"
          >
            {t('categoryLabel')}
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="CRIMINAL">{tRel('categories.CRIMINAL')}</option>
            <option value="FINANCIAL">{tRel('categories.FINANCIAL')}</option>
            <option value="FAMILY">{tRel('categories.FAMILY')}</option>
            <option value="LEGAL_CASE">{tRel('categories.LEGAL_CASE')}</option>
            <option value="SOCIAL">{tRel('categories.SOCIAL')}</option>
          </select>
          <p className="text-xs text-muted mt-1">
            {t('categoryHelp')}
          </p>
        </div>

        <div>
          <label
            htmlFor="lineStyle"
            className="block text-sm font-medium text-foreground mb-1"
          >
            {t('lineStyleLabel')}
          </label>
          <select
            id="lineStyle"
            value={formData.lineStyle}
            onChange={(e) => setFormData({ ...formData, lineStyle: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="SOLID">{tRel('lineStyles.SOLID')}</option>
            <option value="DASHED">{tRel('lineStyles.DASHED')}</option>
          </select>
          <p className="text-xs text-muted mt-1">
            {t('lineStyleHelp')}
          </p>
        </div>
      </div>

      {/* Direction & Symmetric toggle */}
      <div className="p-4 rounded-lg border border-border bg-surface-elevated/40">
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('directionLabel')}
        </label>

        <div className="flex items-center mb-3">
          <button
            type="button"
            role="switch"
            aria-checked={isSymmetric}
            onClick={() => {
              const nextSymmetric = !isSymmetric;
              setIsSymmetric(nextSymmetric);
              setFormData((prev) => ({
                ...prev,
                directionType: nextSymmetric ? 'BIDIRECTIONAL' : 'DIRECTED',
              }));
              if (nextSymmetric) {
                setInverseValue('');
                setInverseIsExisting(false);
                setInverseLabel('');
              }
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              isSymmetric ? 'bg-primary' : 'bg-surface-elevated border-border'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isSymmetric ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="ml-3 text-sm font-medium text-foreground">
            {isSymmetric ? tRel('directions.BIDIRECTIONAL') : tRel('directions.DIRECTED')}
          </span>
        </div>
        <p className="text-xs text-muted mb-3">
          {isSymmetric ? t('symmetricHelp') : t('nonSymmetricHelp')}
        </p>

        {/* Inverse autocomplete - only shown when not symmetric */}
        {!isSymmetric && (
          <div className="mt-3 pt-3 border-t border-border">
            <label className="block text-xs font-medium text-muted mb-1">
              {t('inverseRelationship')}
            </label>
            <RelationshipTypeAutocomplete
              types={availableTypes}
              value={inverseValue}
              isExisting={inverseIsExisting}
              onChange={(value, isExisting, label) => {
                setInverseValue(value);
                setInverseIsExisting(isExisting);
                setInverseLabel(label);
              }}
              placeholder={t('inversePlaceholder')}
            />
          </div>
        )}
      </div>

      {/* Color Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('color')}
        </label>
        <div className="flex flex-wrap gap-3">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-10 h-10 rounded-full transition-shadow ${
                formData.color === color
                  ? 'ring-4 ring-primary ring-offset-2 dark:ring-offset-gray-800'
                  : 'hover:ring-2 hover:ring-border'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="mt-3">
          <label
            htmlFor="customColor"
            className="block text-xs text-muted mb-1"
          >
            {t('customColor')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="customColor"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-20 h-10 rounded cursor-pointer"
            />
            <button
              type="button"
              onClick={handleRerollColor}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-elevated hover:text-foreground"
              aria-label={t('generateRandomColor')}
              title={t('generateRandomColor')}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <rect width="12" height="12" x="2" y="10" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18h.01" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14h.01" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 6h.01" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9h.01" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button variant="secondary" href="/relationship-types">
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? t('saving')
            : mode === 'create'
            ? t('createType')
            : t('updateType')}
        </Button>
      </div>
    </form>
  );
}
