'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import ConfirmationModal from './ui/ConfirmationModal';

interface BulkEventCaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  selectAll: boolean;
  totalCount: number;
  onSuccess: () => void;
}

export type CaseStatus = 'UNRESOLVED' | 'INVESTIGATING' | 'SOLVED' | 'SUSPENDED';

export default function BulkEventCaseStatusModal({
  isOpen,
  onClose,
  selectedIds,
  selectAll,
  totalCount,
  onSuccess,
}: BulkEventCaseStatusModalProps) {
  const t = useTranslations('events');
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus>('INVESTIGATING');
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
      const response = await fetch('/api/events/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setCaseStatus',
          eventIds: selectAll ? undefined : selectedIds,
          selectAll: selectAll ? true : undefined,
          caseStatus: selectedStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update case status');
      }

      const data = await response.json();
      toast.success(
        t('statusUpdatedToast', {
          status: t(`caseStatuses.${selectedStatus}`),
        }) || `Đã cập nhật ${data.affectedCount || count} vụ án`
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update case status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Cập nhật trạng thái thụ lý vụ án"
      confirmText={isSubmitting ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}
      variant="default"
      isLoading={isSubmitting}
    >
      <div className="space-y-4 py-2">
        <p className="text-sm text-foreground">
          Chọn trạng thái thụ lý mới cho <strong>{count}</strong> vụ án được chọn:
        </p>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-elevated cursor-pointer hover:border-red-500/50 transition-colors">
            <input
              type="radio"
              name="caseStatus"
              value="UNRESOLVED"
              checked={selectedStatus === 'UNRESOLVED'}
              onChange={() => setSelectedStatus('UNRESOLVED')}
              className="text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600"></span>
                <span className="font-semibold text-sm text-foreground">
                  {t('caseStatuses.UNRESOLVED')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vụ án mới tiếp nhận hoặc chưa có manh mối, chưa xác định rõ thủ phạm.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-elevated cursor-pointer hover:border-amber-500/50 transition-colors">
            <input
              type="radio"
              name="caseStatus"
              value="INVESTIGATING"
              checked={selectedStatus === 'INVESTIGATING'}
              onChange={() => setSelectedStatus('INVESTIGATING')}
              className="text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="font-semibold text-sm text-foreground">
                  {t('caseStatuses.INVESTIGATING')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Đang trong quá trình trinh sát, xác minh nhân chứng, thu thập chứng cứ.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-elevated cursor-pointer hover:border-emerald-500/50 transition-colors">
            <input
              type="radio"
              name="caseStatus"
              value="SOLVED"
              checked={selectedStatus === 'SOLVED'}
              onChange={() => setSelectedStatus('SOLVED')}
              className="text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span className="font-semibold text-sm text-foreground">
                  {t('caseStatuses.SOLVED')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Đã khám phá thành công, làm rõ đối tượng gây án hoặc đã khởi tố/kết luận.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-elevated cursor-pointer hover:border-slate-500/50 transition-colors">
            <input
              type="radio"
              name="caseStatus"
              value="SUSPENDED"
              checked={selectedStatus === 'SUSPENDED'}
              onChange={() => setSelectedStatus('SUSPENDED')}
              className="text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                <span className="font-semibold text-sm text-foreground">
                  {t('caseStatuses.SUSPENDED')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tạm đình chỉ điều tra do hết thời hạn hoặc chờ kết quả giám định/tương trợ tư pháp.
              </p>
            </div>
          </label>
        </div>
      </div>
    </ConfirmationModal>
  );
}
