'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import ConfirmationModal from './ui/ConfirmationModal';
import { useOptionalSearchIndex } from './SearchIndexProvider';

interface BulkManagementLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  selectAll: boolean;
  totalCount: number;
  onSuccess: () => void;
}

export default function BulkManagementLevelModal({
  isOpen,
  onClose,
  selectedIds,
  selectAll,
  totalCount,
  onSuccess,
}: BulkManagementLevelModalProps) {
  const t = useTranslations('people.bulk');
  const tPeople = useTranslations('people');
  const searchIndex = useOptionalSearchIndex();
  const [selectedLevel, setSelectedLevel] = useState<'NORMAL' | 'SURVEILLANCE' | 'KEY_TARGET'>('SURVEILLANCE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = selectAll ? totalCount : selectedIds.length;

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/people/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setManagementLevel',
          personIds: selectAll ? undefined : selectedIds,
          selectAll: selectAll ? true : undefined,
          managementLevel: selectedLevel,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || t('setManagementLevelFailed'));
      }

      const data = await response.json();
      toast.success(t('setManagementLevelSuccess', { count: data.affectedCount || count }));
      searchIndex?.refreshIndex();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('setManagementLevelFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={t('setManagementLevelTitle', { count })}
      confirmText={tPeople('save') || 'Lưu'}
      variant="default"
      isLoading={isSubmitting}
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          {t('selectManagementLevelDescription', { count })}
        </p>

        {error && (
          <div role="alert" className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-elevated transition-colors">
            <input
              type="radio"
              name="managementLevel"
              value="NORMAL"
              checked={selectedLevel === 'NORMAL'}
              onChange={() => setSelectedLevel('NORMAL')}
              className="text-primary focus:ring-primary h-4 w-4"
            />
            <div>
              <div className="text-sm font-medium text-foreground">{tPeople('normalOnly')}</div>
              <div className="text-xs text-muted">Dân cư bình thường, không áp dụng biện pháp theo dõi</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-colors">
            <input
              type="radio"
              name="managementLevel"
              value="SURVEILLANCE"
              checked={selectedLevel === 'SURVEILLANCE'}
              onChange={() => setSelectedLevel('SURVEILLANCE')}
              className="text-amber-600 focus:ring-amber-500 h-4 w-4"
            />
            <div>
              <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                🟠 {tPeople('form.managementLevels.SURVEILLANCE')}
              </div>
              <div className="text-xs text-amber-700/80 dark:text-amber-400/80">
                Đưa vào diện quản lý nghiệp vụ, theo dõi di biến động
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 rounded-lg cursor-pointer hover:bg-red-100/50 dark:hover:bg-red-950/40 transition-colors">
            <input
              type="radio"
              name="managementLevel"
              value="KEY_TARGET"
              checked={selectedLevel === 'KEY_TARGET'}
              onChange={() => setSelectedLevel('KEY_TARGET')}
              className="text-red-600 focus:ring-red-500 h-4 w-4"
            />
            <div>
              <div className="text-sm font-semibold text-red-800 dark:text-red-300">
                🔴 {tPeople('form.managementLevels.KEY_TARGET')}
              </div>
              <div className="text-xs text-red-700/80 dark:text-red-400/80">
                Đối tượng trọng điểm chuyên án, áp dụng biện pháp trinh sát đặc biệt
              </div>
            </div>
          </label>
        </div>
      </div>
    </ConfirmationModal>
  );
}
