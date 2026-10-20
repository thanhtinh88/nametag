'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import ConfirmationModal from './ui/ConfirmationModal';
import GroupsSelector from './GroupsSelector';

interface Group {
  id: string;
  name: string;
  color: string | null;
}

interface BulkEventGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  selectAll: boolean;
  totalCount: number;
  availableGroups: Group[];
  onSuccess: () => void;
  onGroupCreated?: (group: Group) => void;
}

export default function BulkEventGroupModal({
  isOpen,
  onClose,
  selectedIds,
  selectAll,
  totalCount,
  availableGroups,
  onSuccess,
  onGroupCreated,
}: BulkEventGroupModalProps) {
  const t = useTranslations('events');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = selectAll ? totalCount : selectedIds.length;

  const handleClose = () => {
    setSelectedGroupIds([]);
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (selectedGroupIds.length === 0) {
      setError('Vui lòng chọn ít nhất một nhóm / chuyên án');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/events/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addToGroups',
          eventIds: selectAll ? undefined : selectedIds,
          selectAll: selectAll ? true : undefined,
          groupIds: selectedGroupIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Đã gán nhóm cho ${data.affectedCount || count} vụ án`);
        setSelectedGroupIds([]);
        onSuccess();
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Gán nhóm thất bại');
        setIsSubmitting(false);
      }
    } catch {
      setError('Gán nhóm thất bại');
      setIsSubmitting(false);
    }
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Gán Nhóm / Chuyên án cho vụ án"
      confirmText={isSubmitting ? 'Đang gán...' : 'Gán vào nhóm'}
      variant="default"
      isLoading={isSubmitting}
    >
      <div className="space-y-4 py-2">
        <p className="text-sm text-foreground">
          Chọn nhóm hoặc chuyên án để gán cho <strong>{count}</strong> vụ án đã chọn:
        </p>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="border border-border rounded-lg p-3 bg-surface-elevated">
          <GroupsSelector
            selectedGroupIds={selectedGroupIds}
            onChange={setSelectedGroupIds}
            availableGroups={availableGroups}
            onGroupCreated={onGroupCreated}
          />
        </div>
      </div>
    </ConfirmationModal>
  );
}
