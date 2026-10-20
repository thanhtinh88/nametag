'use client';

import { useTranslations } from 'next-intl';
import PillSelector from '@/components/PillSelector';
import type { EventStatusType, CaseStatus } from './EventForm';

interface EventBasicInfoSectionProps {
  title: string;
  setTitle: (val: string) => void;
  caseCode: string;
  setCaseCode: (val: string) => void;
  crimeType: string;
  setCrimeType: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  status: EventStatusType;
  setStatus: (val: EventStatusType) => void;
  caseStatus: CaseStatus;
  setCaseStatus: (val: CaseStatus) => void;
  groupIds: string[];
  setGroupIds: (val: string[] | ((prev: string[]) => string[])) => void;
  groups: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm';

export default function EventBasicInfoSection({
  title,
  setTitle,
  caseCode,
  setCaseCode,
  crimeType,
  setCrimeType,
  category,
  setCategory,
  status,
  setStatus,
  caseStatus,
  setCaseStatus,
  groupIds,
  setGroupIds,
  groups,
}: EventBasicInfoSectionProps) {
  const t = useTranslations('events');

  const groupItems = groups.map((g) => ({
    id: g.id,
    label: g.name,
    color: g.color,
  }));

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-xs space-y-5">
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span>📋</span> {t('sectionBasicInfo')}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Mã số thụ lý, tên vụ việc, phân loại tội danh và các trạng thái điều tra
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Case Code */}
        <div>
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
            Mã thụ lý / Số hồ sơ
          </label>
          <input
            type="text"
            value={caseCode}
            onChange={(e) => setCaseCode(e.target.value)}
            placeholder="VD: VV-2026-001"
            className={`${inputClass} font-mono`}
          />
        </div>

        {/* Title */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
            {t('titleLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Crime Type */}
        <div>
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
            ⚖️ Phân loại tội danh (Tội danh chính)
          </label>
          <input
            type="text"
            value={crimeType}
            onChange={(e) => setCrimeType(e.target.value)}
            placeholder="VD: Trộm cắp tài sản, Cướp giật, Cố ý gây thương tích..."
            className={inputClass}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
            {t('form.category')}
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t('form.categoryPlaceholder')}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Case Status */}
        <div>
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
            Trạng thái thụ lý vụ án
          </label>
          <select
            value={caseStatus}
            onChange={(e) => setCaseStatus(e.target.value as CaseStatus)}
            className={inputClass}
          >
            <option value="UNRESOLVED">{t('caseStatuses.UNRESOLVED')}</option>
            <option value="INVESTIGATING">{t('caseStatuses.INVESTIGATING')}</option>
            <option value="SOLVED">{t('caseStatuses.SOLVED')}</option>
            <option value="SUSPENDED">{t('caseStatuses.SUSPENDED')}</option>
          </select>
        </div>

        {/* Event Status */}
        <div>
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
            {t('statusLabel')}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as EventStatusType)}
            className={inputClass}
          >
            <option value="PLANNED">{t('statuses.PLANNED')}</option>
            <option value="ONGOING">{t('statuses.ONGOING')}</option>
            <option value="COMPLETED">{t('statuses.COMPLETED')}</option>
            <option value="CANCELLED">{t('statuses.CANCELLED')}</option>
          </select>
        </div>
      </div>

      {/* Groups / Gangs */}
      {groups.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
            👥 {t('form.groups')} (Băng nhóm / Chuyên án)
          </label>
          <PillSelector
            selectedItems={groupItems.filter((g) => groupIds.includes(g.id))}
            availableItems={groupItems}
            onAdd={(item) =>
              setGroupIds((prev) =>
                prev.includes(item.id) ? prev : [...prev, item.id]
              )
            }
            onRemove={(itemId) =>
              setGroupIds((prev) => prev.filter((id) => id !== itemId))
            }
          />
        </div>
      )}
    </div>
  );
}
