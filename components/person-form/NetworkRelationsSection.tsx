'use client';

import { useTranslations } from 'next-intl';
import PersonAutocomplete from '../PersonAutocomplete';
import TooltipIcon from '@/components/ui/TooltipIcon';
import RelationshipManager from '../RelationshipManager';
import PersonEventsManager from '../PersonEventsManager';
import type { FormData } from '../../hooks/usePersonForm';
import type { NameDisplayFormat } from '@/lib/nameUtils';

interface AvailablePerson {
  id: string;
  name: string;
  surname: string | null;
  middleName: string | null;
  secondLastName: string | null;
  nickname: string | null;
  displayNameOverride?: string | null;
  photo?: string | null;
  groups: Array<{ groupId: string }>;
}

interface RelationshipType {
  id: string;
  name?: string;
  label: string;
  color: string | null;
  inverseId?: string | null;
}

interface AvailableEvent {
  id: string;
  title: string;
}

interface NetworkRelationsSectionProps {
  mode: 'create' | 'edit';
  personId?: string;
  personName?: string;
  relationships?: any[];
  personEvents?: any[];
  formData: FormData;
  onFormDataChange: (updates: Partial<FormData>) => void;
  knownThroughId: string;
  knownThroughName: string;
  onKnownThroughChange: (id: string, name: string) => void;
  peopleWithUser: AvailablePerson[];
  relationshipTypes: RelationshipType[];
  availableEvents?: AvailableEvent[];
  nameOrder?: 'WESTERN' | 'EASTERN';
  nameDisplayFormat?: NameDisplayFormat;
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm';

export default function NetworkRelationsSection({
  mode,
  personId,
  personName,
  relationships = [],
  personEvents = [],
  formData,
  onFormDataChange,
  knownThroughId,
  knownThroughName,
  onKnownThroughChange,
  peopleWithUser,
  relationshipTypes,
  availableEvents = [],
  nameOrder,
  nameDisplayFormat,
}: NetworkRelationsSectionProps) {
  const t = useTranslations('people.form');
  const tEvents = useTranslations('events');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
          <span>🕸️</span>
          <span>Mạng lưới quan hệ & Vụ án liên quan</span>
        </h3>
        <span className="text-[11px] text-muted">
          {mode === 'edit' ? 'Quản lý quan hệ trực tiếp' : 'Người kết nối ban đầu'}
        </span>
      </div>

      {mode === 'edit' && personId ? (
        <div className="space-y-6">
          {/* 1. Quản lý Mối quan hệ giữa các đối tượng (Thêm, Sửa, Xóa) */}
          <div className="space-y-3">
            <RelationshipManager
              personId={personId}
              personName={personName || formData.name}
              relationships={relationships}
              availablePeople={peopleWithUser as any}
              relationshipTypes={relationshipTypes as any}
              nameOrder={nameOrder}
              nameDisplayFormat={nameDisplayFormat}
            />
          </div>

          {/* 2. Quản lý Sự kiện / Vụ án / Chuyên án liên quan */}
          <div className="space-y-3 pt-3 border-t border-border">
            <PersonEventsManager
              personId={personId}
              personEvents={personEvents}
              availableEvents={availableEvents as any}
              nameOrder={nameOrder}
              nameDisplayFormat={nameDisplayFormat}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chế độ tạo mới: Người kết nối */}
          <div className="p-4 bg-surface-elevated/60 rounded-xl border border-border/70 space-y-3">
            <div>
              <label
                htmlFor="knownThrough"
                className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1"
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

            {knownThroughId && (
              <div className="pt-2 border-t border-border/50">
                <label
                  htmlFor="relationshipToKnownThrough"
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider mb-1"
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
          </div>

          {/* Chế độ tạo mới: Liên kết sự kiện ban đầu */}
          {availableEvents.length > 0 && (
            <div className="p-4 bg-surface-elevated/60 rounded-xl border border-border/70 space-y-3">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Liên kết với Sự kiện / Vụ án
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="connectedEventId"
                    className="block text-xs font-medium text-muted mb-1"
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
                  <p className="text-[11px] text-muted mt-1">{t('connectedEventHelp')}</p>
                </div>

                {formData.connectedEventId && (
                  <div>
                    <label
                      htmlFor="connectedEventRole"
                      className="block text-xs font-medium text-muted mb-1"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  <div>
                    <label
                      htmlFor="connectedEventInvolvementType"
                      className="block text-xs font-medium text-muted mb-1"
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
                      className="block text-xs font-medium text-muted mb-1"
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
      )}
    </div>
  );
}
