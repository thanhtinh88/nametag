'use client';

import { useTranslations } from 'next-intl';
import type { FormData } from '../../hooks/usePersonForm';

interface SimpleAttributesSectionProps {
  formData: FormData;
  onFormDataChange: (updates: Partial<FormData>) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm';

export default function SimpleAttributesSection({
  formData,
  onFormDataChange,
}: SimpleAttributesSectionProps) {
  const t = useTranslations('people.form');

  return (
    <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-4">
      {/* Header Hồ sơ nhận dạng & Nhân thân */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
          <span>🪪</span>
          <span>Hồ sơ nhận dạng & Nhân thân</span>
        </h3>
        <span className="text-[11px] text-muted">Căn cước & Thể chất</span>
      </div>

      <div className="space-y-3.5">
        {/* Số CCCD & Tình trạng cư trú */}
        <div>
          <label htmlFor="sidebar-citizenId" className="block text-xs font-semibold text-muted mb-1">
            Số CCCD / Hộ chiếu
          </label>
          <input
            type="text"
            id="sidebar-citizenId"
            value={formData.citizenId}
            onChange={(e) => onFormDataChange({ citizenId: e.target.value })}
            placeholder="VD: 001201012345"
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label htmlFor="sidebar-residenceStatus" className="block text-xs font-semibold text-muted mb-1">
            Tình trạng cư trú
          </label>
          <select
            id="sidebar-residenceStatus"
            value={formData.residenceStatus}
            onChange={(e) => onFormDataChange({ residenceStatus: e.target.value })}
            className={inputClass}
          >
            <option value="">-- Chưa xác định --</option>
            <option value="PERMANENT">Thường trú</option>
            <option value="TEMPORARY">Tạm trú</option>
            <option value="TRANSIENT">Lưu trú / Vãng lai</option>
            <option value="ABSENT">Vắng mặt tại địa phương</option>
            <option value="WANTED">Đang bị truy nã</option>
          </select>
        </div>

        {/* Ngày cấp & Nơi cấp CCCD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="sidebar-citizenIdIssueDate" className="block text-xs font-semibold text-muted mb-1">
              Ngày cấp CCCD
            </label>
            <input
              type="date"
              id="sidebar-citizenIdIssueDate"
              value={formData.citizenIdIssueDate}
              onChange={(e) => onFormDataChange({ citizenIdIssueDate: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="sidebar-citizenIdIssuePlace" className="block text-xs font-semibold text-muted mb-1">
              Nơi cấp CCCD
            </label>
            <input
              type="text"
              id="sidebar-citizenIdIssuePlace"
              value={formData.citizenIdIssuePlace}
              onChange={(e) => onFormDataChange({ citizenIdIssuePlace: e.target.value })}
              placeholder="VD: Cục CSQLHC về TTXH"
              className={inputClass}
            />
          </div>
        </div>

        {/* Giới tính & Nhóm máu */}
        <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-border/50">
          <div>
            <label htmlFor="sidebar-gender" className="block text-xs font-semibold text-muted mb-1">
              Giới tính
            </label>
            <select
              id="sidebar-gender"
              value={formData.gender}
              onChange={(e) => onFormDataChange({ gender: e.target.value })}
              className={inputClass}
            >
              <option value="">Chưa rõ</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div>
            <label htmlFor="sidebar-bloodType" className="block text-xs font-semibold text-muted mb-1">
              Nhóm máu
            </label>
            <select
              id="sidebar-bloodType"
              value={formData.bloodType}
              onChange={(e) => onFormDataChange({ bloodType: e.target.value })}
              className={inputClass}
            >
              <option value="">Chưa rõ</option>
              <option value="A">Nhóm A</option>
              <option value="B">Nhóm B</option>
              <option value="AB">Nhóm AB</option>
              <option value="O">Nhóm O</option>
            </select>
          </div>
        </div>

        {/* Chiều cao & Cân nặng */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="sidebar-height" className="block text-xs font-semibold text-muted mb-1">
              Chiều cao (cm)
            </label>
            <input
              type="number"
              id="sidebar-height"
              min="30"
              max="250"
              value={formData.heightCm}
              onChange={(e) => onFormDataChange({ heightCm: e.target.value })}
              placeholder="VD: 172"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="sidebar-weight" className="block text-xs font-semibold text-muted mb-1">
              Cân nặng (kg)
            </label>
            <input
              type="number"
              id="sidebar-weight"
              min="2"
              max="300"
              value={formData.weightKg}
              onChange={(e) => onFormDataChange({ weightKg: e.target.value })}
              placeholder="VD: 68"
              className={inputClass}
            />
          </div>
        </div>

        {/* Nghề nghiệp / Chức vụ */}
        <div className="pt-1 border-t border-border/50">
          <label htmlFor="sidebar-jobTitle" className="block text-xs font-semibold text-muted mb-1">
            {t('jobTitleLabel') || 'Nghề nghiệp / Chức vụ'}
          </label>
          <input
            type="text"
            id="sidebar-jobTitle"
            value={formData.jobTitle}
            onChange={(e) => onFormDataChange({ jobTitle: e.target.value })}
            placeholder={t('jobTitlePlaceholder') || 'VD: Kinh doanh tự do, Trưởng phòng...'}
            className={inputClass}
          />
        </div>

        {/* Cơ quan / Nơi làm việc */}
        <div>
          <label htmlFor="sidebar-organization" className="block text-xs font-semibold text-muted mb-1">
            {t('companyLabel') || 'Cơ quan / Đơn vị công tác'}
          </label>
          <input
            type="text"
            id="sidebar-organization"
            value={formData.organization}
            onChange={(e) => onFormDataChange({ organization: e.target.value })}
            placeholder={t('companyPlaceholder') || 'VD: Công ty TNHH ABC, Địa bàn...'}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
