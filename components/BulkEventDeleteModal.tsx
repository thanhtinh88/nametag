'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import ConfirmationModal from './ui/ConfirmationModal';

interface BulkEventDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  selectAll: boolean;
  totalCount: number;
  onSuccess: () => void;
}

export default function BulkEventDeleteModal({
  isOpen,
  onClose,
  selectedIds,
  selectAll,
  totalCount,
  onSuccess,
}: BulkEventDeleteModalProps) {
  const t = useTranslations('events');
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
          action: 'delete',
          eventIds: selectAll ? undefined : selectedIds,
          selectAll: selectAll ? true : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Đã xóa ${data.affectedCount || count} vụ án`);
        onSuccess();
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Xóa vụ án thất bại');
        setIsSubmitting(false);
      }
    } catch {
      setError('Xóa vụ án thất bại');
      setIsSubmitting(false);
    }
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Xác nhận xóa hồ sơ vụ án"
      confirmText={isSubmitting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
      variant="danger"
      isLoading={isSubmitting}
    >
      <div className="space-y-3 py-2">
        <p className="text-sm text-foreground">
          Bạn có chắc chắn muốn xóa <strong>{count}</strong> hồ sơ vụ án đã chọn?
        </p>
        <p className="text-xs text-muted-foreground">
          Hành động này sẽ chuyển các vụ án và liên kết đối tượng, sơ đồ liên quan vào thùng rác.
        </p>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}
      </div>
    </ConfirmationModal>
  );
}
