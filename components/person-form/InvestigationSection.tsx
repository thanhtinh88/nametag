'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FormData } from '../../hooks/usePersonForm';

interface InvestigationSectionProps {
  formData: FormData;
  onFormDataChange: (updates: Partial<FormData>) => void;
  mode?: 'create' | 'edit';
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export default function InvestigationSection({
  formData,
  onFormDataChange,
  mode = 'create',
}: InvestigationSectionProps) {
  const t = useTranslations('people.form');
  const isMonitored =
    formData.managementLevel !== 'NORMAL' ||
    Boolean(formData.citizenId) ||
    formData.threatLevel !== 'LOW' ||
    Boolean(formData.modusOperandi) ||
    Boolean(formData.riskNotes) ||
    Boolean(formData.initialBankName) ||
    Boolean(formData.initialAccountNumber);

  const [expanded, setExpanded] = useState<boolean>(isMonitored);

  const handleToggle = (checked: boolean) => {
    setExpanded(checked);
    if (!checked) {
      onFormDataChange({
        managementLevel: 'NORMAL',
        threatLevel: 'LOW',
      });
    } else if (formData.managementLevel === 'NORMAL') {
      onFormDataChange({
        managementLevel: 'SURVEILLANCE',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={expanded}
            onChange={(e) => handleToggle(e.target.checked)}
            className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
          />
          <span className="text-sm font-medium text-foreground">
            {t('enableInvestigationProfile')}
          </span>
        </label>
        {formData.managementLevel === 'KEY_TARGET' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
            🔴 {t('managementLevels.KEY_TARGET')}
          </span>
        )}
        {formData.managementLevel === 'SURVEILLANCE' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            🟠 {t('managementLevels.SURVEILLANCE')}
          </span>
        )}
      </div>

      {expanded && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Classification & Threat Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="managementLevel"
                className="block text-sm font-medium text-muted mb-1"
              >
                {t('managementLevelLabel')}
              </label>
              <select
                id="managementLevel"
                value={formData.managementLevel || 'NORMAL'}
                onChange={(e) =>
                  onFormDataChange({
                    managementLevel: e.target.value as FormData['managementLevel'],
                  })
                }
                className={inputClass}
              >
                <option value="NORMAL">{t('managementLevels.NORMAL')}</option>
                <option value="SURVEILLANCE">{t('managementLevels.SURVEILLANCE')}</option>
                <option value="KEY_TARGET">{t('managementLevels.KEY_TARGET')}</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="threatLevel"
                className="block text-sm font-medium text-muted mb-1"
              >
                {t('threatLevelLabel')}
              </label>
              <select
                id="threatLevel"
                value={formData.threatLevel || 'LOW'}
                onChange={(e) =>
                  onFormDataChange({
                    threatLevel: e.target.value as FormData['threatLevel'],
                  })
                }
                className={inputClass}
              >
                <option value="LOW">{t('threatLevels.LOW')}</option>
                <option value="MEDIUM">{t('threatLevels.MEDIUM')}</option>
                <option value="HIGH">{t('threatLevels.HIGH')}</option>
                <option value="ARMED_DANGEROUS">{t('threatLevels.ARMED_DANGEROUS')}</option>
              </select>
            </div>
          </div>

          {/* Citizen ID & Residence */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="citizenId"
                className="block text-sm font-medium text-muted mb-1"
              >
                {t('citizenIdLabel')}
              </label>
              <input
                type="text"
                id="citizenId"
                value={formData.citizenId}
                onChange={(e) => onFormDataChange({ citizenId: e.target.value })}
                placeholder={t('citizenIdPlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="citizenIdIssueDate"
                className="block text-sm font-medium text-muted mb-1"
              >
                {t('citizenIdIssueDateLabel')}
              </label>
              <input
                type="date"
                id="citizenIdIssueDate"
                value={formData.citizenIdIssueDate}
                onChange={(e) =>
                  onFormDataChange({ citizenIdIssueDate: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="citizenIdIssuePlace"
                className="block text-sm font-medium text-muted mb-1"
              >
                {t('citizenIdIssuePlaceLabel')}
              </label>
              <input
                type="text"
                id="citizenIdIssuePlace"
                value={formData.citizenIdIssuePlace}
                onChange={(e) =>
                  onFormDataChange({ citizenIdIssuePlace: e.target.value })
                }
                placeholder={t('citizenIdIssuePlacePlaceholder')}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="residenceStatus"
                className="block text-sm font-medium text-muted mb-1"
              >
                {t('residenceStatusLabel')}
              </label>
              <select
                id="residenceStatus"
                value={formData.residenceStatus}
                onChange={(e) =>
                  onFormDataChange({ residenceStatus: e.target.value })
                }
                className={inputClass}
              >
                <option value="">-- {t('residenceStatusLabel')} --</option>
                <option value="PERMANENT">{t('residenceStatusOptions.PERMANENT')}</option>
                <option value="TEMPORARY">{t('residenceStatusOptions.TEMPORARY')}</option>
                <option value="TRANSIENT">{t('residenceStatusOptions.TRANSIENT')}</option>
                <option value="ABSENT">{t('residenceStatusOptions.ABSENT')}</option>
                <option value="WANTED">{t('residenceStatusOptions.WANTED')}</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="heightCm"
                className="block text-sm font-medium text-muted mb-1"
              >
                {t('heightCmLabel')}
              </label>
              <input
                type="number"
                id="heightCm"
                min="30"
                max="250"
                value={formData.heightCm}
                onChange={(e) => onFormDataChange({ heightCm: e.target.value })}
                placeholder={t('heightCmPlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="weightKg"
                className="block text-sm font-medium text-muted mb-1"
              >
                {t('weightKgLabel')}
              </label>
              <input
                type="number"
                id="weightKg"
                min="10"
                max="300"
                value={formData.weightKg}
                onChange={(e) => onFormDataChange({ weightKg: e.target.value })}
                placeholder={t('weightKgPlaceholder')}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="bloodType"
                className="block text-sm font-medium text-muted mb-1"
              >
                {t('bloodTypeLabel')}
              </label>
              <input
                type="text"
                id="bloodType"
                value={formData.bloodType}
                onChange={(e) => onFormDataChange({ bloodType: e.target.value })}
                placeholder={t('bloodTypePlaceholder')}
                className={inputClass}
              />
            </div>
          </div>

          {/* M.O & Risk Notes */}
          <div>
            <label
              htmlFor="modusOperandi"
              className="block text-sm font-medium text-muted mb-1"
            >
              {t('modusOperandiLabel')}
            </label>
            <textarea
              id="modusOperandi"
              rows={3}
              value={formData.modusOperandi}
              onChange={(e) =>
                onFormDataChange({ modusOperandi: e.target.value })
              }
              placeholder={t('modusOperandiPlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="riskNotes"
              className="block text-sm font-medium text-muted mb-1"
            >
              {t('riskNotesLabel')}
            </label>
            <textarea
              id="riskNotes"
              rows={2}
              value={formData.riskNotes}
              onChange={(e) => onFormDataChange({ riskNotes: e.target.value })}
              placeholder={t('riskNotesPlaceholder')}
              className={inputClass}
            />
          </div>

          {/* Initial Bank Account */}
          {mode !== 'edit' && (
            <div className="pt-3 border-t border-border/60">
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1.5">
                <span>💳</span>
                <span>{t('initialBankAccountTitle')}</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="initialBankName"
                    className="block text-sm font-medium text-muted mb-1"
                  >
                    {t('bankNameLabel')}
                  </label>
                  <input
                    type="text"
                    id="initialBankName"
                    value={formData.initialBankName}
                    onChange={(e) =>
                      onFormDataChange({ initialBankName: e.target.value })
                    }
                    placeholder={t('bankNamePlaceholder')}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="initialAccountNumber"
                    className="block text-sm font-medium text-muted mb-1"
                  >
                    {t('accountNumberLabel')}
                  </label>
                  <input
                    type="text"
                    id="initialAccountNumber"
                    value={formData.initialAccountNumber}
                    onChange={(e) =>
                      onFormDataChange({ initialAccountNumber: e.target.value })
                    }
                    placeholder={t('accountNumberPlaceholder')}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <label
                    htmlFor="initialAccountHolder"
                    className="block text-sm font-medium text-muted mb-1"
                  >
                    {t('accountHolderLabel')}
                  </label>
                  <input
                    type="text"
                    id="initialAccountHolder"
                    value={formData.initialAccountHolder}
                    onChange={(e) =>
                      onFormDataChange({ initialAccountHolder: e.target.value })
                    }
                    placeholder={t('accountHolderPlaceholder')}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="initialAccountType"
                    className="block text-sm font-medium text-muted mb-1"
                  >
                    {t('accountTypeLabel')}
                  </label>
                  <select
                    id="initialAccountType"
                    value={formData.initialAccountType || 'OWNER'}
                    onChange={(e) =>
                      onFormDataChange({
                        initialAccountType: e.target.value as FormData['initialAccountType'],
                      })
                    }
                    className={inputClass}
                  >
                    <option value="OWNER">{t('accountTypes.OWNER')}</option>
                    <option value="MULE">{t('accountTypes.MULE')}</option>
                    <option value="SUSPICIOUS">{t('accountTypes.SUSPICIOUS')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

