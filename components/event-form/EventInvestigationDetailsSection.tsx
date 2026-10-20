'use client';

import { useTranslations } from 'next-intl';
import MarkdownEditor from '@/components/MarkdownEditor';
import FieldManager from '@/components/fields/FieldManager';
import {
  urlFieldConfig,
  customFieldFieldConfig,
  type PersonUrl,
  type PersonCustomField,
} from '@/lib/field-configs';

interface EventInvestigationDetailsSectionProps {
  damageAssessment: string;
  setDamageAssessment: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  urls: PersonUrl[];
  setUrls: (val: PersonUrl[]) => void;
  customFields: PersonCustomField[];
  setCustomFields: (val: PersonCustomField[]) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm';

export default function EventInvestigationDetailsSection({
  damageAssessment,
  setDamageAssessment,
  description,
  setDescription,
  urls,
  setUrls,
  customFields,
  setCustomFields,
}: EventInvestigationDetailsSectionProps) {
  const t = useTranslations('events');

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-xs space-y-5">
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span>🔍</span> Diễn biến, Thiệt hại & Hồ sơ tài liệu
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tóm tắt quá trình gây án, thống kê thiệt hại tài sản và các tài liệu tham chiếu
        </p>
      </div>

      {/* Damage Assessment */}
      <div>
        <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
          💥 {t('damageAssessmentLabel')}
        </label>
        <textarea
          value={damageAssessment}
          onChange={(e) => setDamageAssessment(e.target.value)}
          placeholder="Thống kê thiệt hại tài sản, thương tích bị hại, tang vật bị chiếm đoạt..."
          rows={3}
          className={inputClass}
        />
      </div>

      {/* Description & Modus Operandi (Markdown) */}
      <div>
        <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
          📝 {t('descriptionLabel')}
        </label>
        <MarkdownEditor
          value={description}
          onChange={setDescription}
          placeholder={t('descriptionPlaceholder')}
        />
      </div>

      {/* URLs */}
      <div className="pt-2 border-t border-border">
        <FieldManager<PersonUrl>
          items={urls}
          onChange={setUrls}
          fieldConfig={urlFieldConfig}
          label={`🔗 ${t('form.urls')}`}
          emptyText={t('form.noUrls')}
        />
      </div>

      {/* Custom Fields */}
      <div className="pt-2 border-t border-border">
        <FieldManager<PersonCustomField>
          items={customFields}
          onChange={setCustomFields}
          fieldConfig={customFieldFieldConfig}
          label="⚙️ Thuộc tính mở rộng"
          emptyText="Chưa có thuộc tính mở rộng nào"
        />
      </div>
    </div>
  );
}

