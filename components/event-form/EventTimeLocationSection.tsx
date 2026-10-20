'use client';

import { useTranslations } from 'next-intl';
import FieldManager from '@/components/fields/FieldManager';
import { addressFieldConfig, type PersonAddress } from '@/lib/field-configs';

interface EventTimeLocationSectionProps {
  incidentTimeNotes: string;
  setIncidentTimeNotes: (val: string) => void;
  hasTime: boolean;
  setHasTime: (val: boolean) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  addresses: PersonAddress[];
  setAddresses: (val: PersonAddress[]) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm';

export default function EventTimeLocationSection({
  incidentTimeNotes,
  setIncidentTimeNotes,
  hasTime,
  setHasTime,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  addresses,
  setAddresses,
}: EventTimeLocationSectionProps) {
  const t = useTranslations('events');
  const tPeopleForm = useTranslations('people.form');

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-xs space-y-5">
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span>📍</span> Thời điểm & Địa bàn hiện trường
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Thời gian xảy ra sự việc và địa chỉ hiện trường khám nghiệm
        </p>
      </div>

      {/* Incident Time Notes */}
      <div>
        <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
          ⏱️ {t('incidentTimeNotesLabel')}
        </label>
        <input
          type="text"
          value={incidentTimeNotes}
          onChange={(e) => setIncidentTimeNotes(e.target.value)}
          placeholder="VD: Rạng sáng khoảng 02:00 - 03:30, trời mưa to..."
          className={inputClass}
        />
      </div>

      {/* Dates with hasTime checkbox */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasTime"
            checked={hasTime}
            onChange={(e) => setHasTime(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
          />
          <label htmlFor="hasTime" className="text-xs font-semibold text-foreground cursor-pointer">
            {t('includeTime')}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              {t('startDateLabel')}
            </label>
            <input
              type={hasTime ? 'datetime-local' : 'date'}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              {t('endDateLabel')}
            </label>
            <input
              type={hasTime ? 'datetime-local' : 'date'}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="pt-2 border-t border-border">
        <FieldManager<PersonAddress>
          items={addresses}
          onChange={setAddresses}
          fieldConfig={addressFieldConfig}
          label={t('form.addresses')}
          emptyText={t('form.noAddresses')}
        />
      </div>
    </div>
  );
}

