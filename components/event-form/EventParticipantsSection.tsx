'use client';

import { useTranslations } from 'next-intl';
import PersonAutocomplete from '@/components/PersonAutocomplete';
import { Button } from '@/components/ui/Button';
import type { EventParticipantInput } from './EventForm';

interface EventParticipantsSectionProps {
  participants: EventParticipantInput[];
  selectedPersonId: string;
  setSelectedPersonId: (val: string) => void;
  selectedPersonName: string;
  setSelectedPersonName: (val: string) => void;
  participantRole: string;
  setParticipantRole: (val: string) => void;
  participantInvolvementType: string;
  setParticipantInvolvementType: (val: string) => void;
  participantVerificationStatus: string;
  setParticipantVerificationStatus: (val: string) => void;
  participantReasonForSuspicion: string;
  setParticipantReasonForSuspicion: (val: string) => void;
  participantAlibi: string;
  setParticipantAlibi: (val: string) => void;
  participantNotes: string;
  setParticipantNotes: (val: string) => void;
  handleAddParticipant: () => void;
  handleRemoveParticipant: (personId: string) => void;
  availablePeople: Array<{
    id: string;
    name: string;
    surname: string | null;
    middleName: string | null;
    secondLastName: string | null;
    nickname: string | null;
    displayNameOverride?: string | null;
  }>;
  nameOrder?: 'WESTERN' | 'EASTERN';
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm';

export default function EventParticipantsSection({
  participants,
  selectedPersonId,
  setSelectedPersonId,
  selectedPersonName,
  setSelectedPersonName,
  participantRole,
  setParticipantRole,
  participantInvolvementType,
  setParticipantInvolvementType,
  participantVerificationStatus,
  setParticipantVerificationStatus,
  participantReasonForSuspicion,
  setParticipantReasonForSuspicion,
  participantAlibi,
  setParticipantAlibi,
  participantNotes,
  setParticipantNotes,
  handleAddParticipant,
  handleRemoveParticipant,
  availablePeople,
  nameOrder,
}: EventParticipantsSectionProps) {
  const t = useTranslations('events');

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-xs space-y-5">
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span>👥</span> {t('sectionParticipants')}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('participantsHelp')}
        </p>
      </div>

      {/* Add New Participant Form */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
        <div className="font-semibold text-xs text-primary uppercase tracking-wider">
          + Gắn đối tượng vào vụ án
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Chọn đối tượng
            </label>
            <PersonAutocomplete
              people={availablePeople}
              value={selectedPersonId}
              onChange={(id: string, name: string) => {
                setSelectedPersonId(id);
                setSelectedPersonName(name);
              }}
              nameOrder={nameOrder}
              placeholder={t('searchPersonPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {t('involvementTypeLabel')}
            </label>
            <select
              value={participantInvolvementType}
              onChange={(e) => setParticipantInvolvementType(e.target.value)}
              className={inputClass}
            >
              <option value="SUSPECT">{t('involvementTypes.SUSPECT')}</option>
              <option value="PERSON_OF_INTEREST">{t('involvementTypes.PERSON_OF_INTEREST')}</option>
              <option value="ACCOMPLICE">{t('involvementTypes.ACCOMPLICE')}</option>
              <option value="WITNESS">{t('involvementTypes.WITNESS')}</option>
              <option value="VICTIM">{t('involvementTypes.VICTIM')}</option>
              <option value="INFORMANT">{t('involvementTypes.INFORMANT')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {t('verificationStatusLabel')}
            </label>
            <select
              value={participantVerificationStatus}
              onChange={(e) => setParticipantVerificationStatus(e.target.value)}
              className={inputClass}
            >
              <option value="HYPOTHESIS">{t('verificationStatuses.HYPOTHESIS')}</option>
              <option value="INVESTIGATING">{t('verificationStatuses.INVESTIGATING')}</option>
              <option value="CONFIRMED">{t('verificationStatuses.CONFIRMED')}</option>
              <option value="RULED_OUT">{t('verificationStatuses.RULED_OUT')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Vai trò cụ thể trong vụ việc
            </label>
            <input
              type="text"
              value={participantRole}
              onChange={(e) => setParticipantRole(e.target.value)}
              placeholder="VD: Cầm đầu, cảnh giới, lái xe tẩu thoát..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Căn cứ đưa vào diện nghi vấn
            </label>
            <input
              type="text"
              value={participantReasonForSuspicion}
              onChange={(e) => setParticipantReasonForSuspicion(e.target.value)}
              placeholder="VD: Nhận diện qua camera, có mặt tại hiện trường..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={handleAddParticipant}
            disabled={!selectedPersonId}
          >
            + {t('addParticipant')}
          </Button>
        </div>
      </div>

      {/* Participants List */}
      {participants.length > 0 && (
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            Danh sách đối tượng đã gắn ({participants.length})
          </label>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {participants.map((p) => (
              <div
                key={p.personId}
                className="p-3 bg-surface flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <span className="font-bold text-foreground mr-2">
                    {p.personName}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary mr-1.5">
                    {t(`involvementTypes.${p.involvementType}`)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted/30 text-muted-foreground mr-1.5">
                    {t(`verificationStatuses.${p.verificationStatus}`)}
                  </span>
                  {p.role && (
                    <span className="text-xs text-muted-foreground italic">
                      ({p.role})
                    </span>
                  )}
                  {p.reasonForSuspicion && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Căn cứ: {p.reasonForSuspicion}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveParticipant(p.personId)}
                  className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Gỡ bỏ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

