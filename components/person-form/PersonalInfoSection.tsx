'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import PersonAutocomplete from '../PersonAutocomplete';
import { parseVietnameseFullName } from '@/lib/nameUtils';
import type { FormData } from '../../hooks/usePersonForm';

interface AvailablePerson {
  id: string;
  name: string;
  surname: string | null;
  middleName: string | null;
  secondLastName: string | null;
  nickname: string | null;
  groups: Array<{ groupId: string }>;
}

interface RelationshipType {
  id: string;
  label: string;
  color: string | null;
}

interface AvailableEvent {
  id: string;
  title: string;
}

interface PersonalInfoSectionProps {
  mode: 'create' | 'edit';
  formData: FormData;
  onFormDataChange: (updates: Partial<FormData>) => void;
  knownThroughId: string;
  knownThroughName: string;
  onKnownThroughChange: (id: string, name: string) => void;
  peopleWithUser: AvailablePerson[];
  relationshipTypes: RelationshipType[];
  availableEvents?: AvailableEvent[];
  nameOrder?: 'WESTERN' | 'EASTERN';
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

import TooltipIcon from '@/components/ui/TooltipIcon';

export default function PersonalInfoSection({
  mode,
  formData,
  onFormDataChange,
  knownThroughId,
  knownThroughName,
  onKnownThroughChange,
  peopleWithUser,
  relationshipTypes,
  availableEvents = [],
  nameOrder,
}: PersonalInfoSectionProps) {
  const t = useTranslations('people.form');
  const tEvents = useTranslations('events');
  const [quickFullName, setQuickFullName] = useState('');

  const handleQuickFullNameChange = (value: string) => {
    setQuickFullName(value);
    const parsed = parseVietnameseFullName(value);
    onFormDataChange({
      surname: parsed.surname,
      middleName: parsed.middleName,
      name: parsed.name,
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
        <label
          htmlFor="quickFullName"
          className="block text-sm font-medium text-foreground mb-1"
        >
          {t('quickFullNameLabel')}
        </label>
        <input
          type="text"
          id="quickFullName"
          value={quickFullName}
          onChange={(e) => handleQuickFullNameChange(e.target.value)}
          placeholder={t('quickFullNamePlaceholder')}
          className={inputClass}
        />
        <p className="text-xs text-muted mt-1">{t('quickFullNameHelp')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label
            htmlFor="surname"
            className="block text-sm font-medium text-muted mb-1"
          >
            {t('surnameLabel')}
          </label>
          <input
            type="text"
            id="surname"
            value={formData.surname}
            onChange={(e) => onFormDataChange({ surname: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="middleName"
            className="block text-sm font-medium text-muted mb-1"
          >
            {t('middleNameLabel')}
          </label>
          <input
            type="text"
            id="middleName"
            value={formData.middleName}
            onChange={(e) => onFormDataChange({ middleName: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-muted mb-1"
          >
            {t('nameRequired')}
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => onFormDataChange({ name: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="nickname"
            className="block text-sm font-medium text-muted mb-1"
          >
            {t('nicknameLabel')}
          </label>
          <input
            type="text"
            id="nickname"
            value={formData.nickname}
            onChange={(e) => onFormDataChange({ nickname: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <details
        className="rounded-lg border border-border bg-surface-elevated/40 p-3"
        open={Boolean(
          formData.prefix ||
            formData.secondLastName ||
            formData.suffix ||
            formData.displayNameOverride
        )}
      >
        <summary className="cursor-pointer text-xs font-medium text-muted hover:text-foreground select-none">
          {t('advancedNameFields')}
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div>
            <label
              htmlFor="prefix"
              className="block text-sm font-medium text-muted mb-1"
            >
              {t('prefixLabel')}
            </label>
            <input
              type="text"
              id="prefix"
              value={formData.prefix}
              onChange={(e) => onFormDataChange({ prefix: e.target.value })}
              placeholder={t('prefixPlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="secondLastName"
              className="block text-sm font-medium text-muted mb-1"
            >
              {t('secondLastNameLabel')}
            </label>
            <input
              type="text"
              id="secondLastName"
              value={formData.secondLastName}
              onChange={(e) =>
                onFormDataChange({ secondLastName: e.target.value })
              }
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="suffix"
              className="block text-sm font-medium text-muted mb-1"
            >
              {t('suffixLabel')}
            </label>
            <input
              type="text"
              id="suffix"
              value={formData.suffix}
              onChange={(e) => onFormDataChange({ suffix: e.target.value })}
              placeholder={t('suffixPlaceholder')}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="displayNameOverride"
                className="block text-sm font-medium text-muted"
              >
                {t('displayNameOverrideLabel')}
              </label>
              {formData.nickname && !formData.displayNameOverride && (
                <button
                  type="button"
                  onClick={() =>
                    onFormDataChange({ displayNameOverride: formData.nickname })
                  }
                  className="text-xs text-primary hover:underline"
                >
                  {t('displayNameOverrideUseNickname')}
                </button>
              )}
            </div>
            <input
              type="text"
              id="displayNameOverride"
              value={formData.displayNameOverride}
              onChange={(e) =>
                onFormDataChange({ displayNameOverride: e.target.value })
              }
              placeholder={t('displayNameOverridePlaceholder')}
              className={inputClass}
              maxLength={200}
            />
            <p className="text-xs text-muted mt-1">
              {t('displayNameOverrideHelp')}
            </p>
          </div>
        </div>
      </details>

      {mode === 'create' && (
        <div>
          <label
            htmlFor="knownThrough"
            className="block text-sm font-medium text-muted mb-1"
          >
            {t('knownThroughLabel')}
          </label>
          <PersonAutocomplete
            people={peopleWithUser}
            value={knownThroughId}
            onChange={onKnownThroughChange}
            placeholder={t('searchForPerson')}
            nameOrder={nameOrder}
          />
          <p className="text-xs text-muted mt-1">{t('knownThroughHelp')}</p>
        </div>
      )}

      {mode === 'create' && knownThroughId && (
        <div>
          <label
            htmlFor="relationshipToKnownThrough"
            className="flex items-center gap-1.5 text-sm font-medium text-muted mb-1"
          >
            {t('relationshipToRequired', { name: knownThroughName })}
            <TooltipIcon tooltip={t('relationshipToYouTooltip')} />
          </label>
          <select
            id="relationshipToKnownThrough"
            required
            value={formData.relationshipToUserId}
            onChange={(e) =>
              onFormDataChange({ relationshipToUserId: e.target.value })
            }
            className={inputClass}
          >
            <option value="">{t('selectRelationship')}</option>
            {relationshipTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted mt-1">
            {t('willBeConnectedTo', { name: knownThroughName })}
          </p>
        </div>
      )}

      {mode === 'create' && availableEvents.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="connectedEventId"
                className="block text-sm font-medium text-muted mb-1"
              >
                {t('connectedEventLabel')}
              </label>
              <select
                id="connectedEventId"
                value={formData.connectedEventId}
                onChange={(e) =>
                  onFormDataChange({ connectedEventId: e.target.value })
                }
                className={inputClass}
              >
                <option value="">{t('selectEvent')}</option>
                {availableEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted mt-1">{t('connectedEventHelp')}</p>
            </div>

            {formData.connectedEventId && (
              <div>
                <label
                  htmlFor="connectedEventRole"
                  className="block text-sm font-medium text-muted mb-1"
                >
                  {t('connectedEventRoleLabel')}
                </label>
                <input
                  type="text"
                  id="connectedEventRole"
                  value={formData.connectedEventRole}
                  onChange={(e) =>
                    onFormDataChange({ connectedEventRole: e.target.value })
                  }
                  placeholder={t('connectedEventRolePlaceholder')}
                  className={inputClass}
                />
              </div>
            )}
          </div>

          {formData.connectedEventId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="connectedEventInvolvementType"
                  className="block text-sm font-medium text-muted mb-1"
                >
                  {tEvents('involvementTypeLabel')}
                </label>
                <select
                  id="connectedEventInvolvementType"
                  value={formData.connectedEventInvolvementType || 'SUSPECT'}
                  onChange={(e) =>
                    onFormDataChange({
                      connectedEventInvolvementType: e.target.value,
                    })
                  }
                  className={inputClass}
                >
                  <option value="SUSPECT">{tEvents('involvementTypes.SUSPECT')}</option>
                  <option value="PERSON_OF_INTEREST">{tEvents('involvementTypes.PERSON_OF_INTEREST')}</option>
                  <option value="ACCOMPLICE">{tEvents('involvementTypes.ACCOMPLICE')}</option>
                  <option value="WITNESS">{tEvents('involvementTypes.WITNESS')}</option>
                  <option value="VICTIM">{tEvents('involvementTypes.VICTIM')}</option>
                  <option value="INFORMANT">{tEvents('involvementTypes.INFORMANT')}</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="connectedEventVerificationStatus"
                  className="block text-sm font-medium text-muted mb-1"
                >
                  {tEvents('verificationStatusLabel')}
                </label>
                <select
                  id="connectedEventVerificationStatus"
                  value={
                    formData.connectedEventVerificationStatus || 'HYPOTHESIS'
                  }
                  onChange={(e) =>
                    onFormDataChange({
                      connectedEventVerificationStatus: e.target.value,
                    })
                  }
                  className={inputClass}
                >
                  <option value="HYPOTHESIS">{tEvents('verificationStatuses.HYPOTHESIS')}</option>
                  <option value="INVESTIGATING">{tEvents('verificationStatuses.INVESTIGATING')}</option>
                  <option value="CONFIRMED">{tEvents('verificationStatuses.CONFIRMED')}</option>
                  <option value="RULED_OUT">{tEvents('verificationStatuses.RULED_OUT')}</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
