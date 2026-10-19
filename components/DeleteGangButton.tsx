'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import ConfirmationModal from './ui/ConfirmationModal';
import { Button } from './ui/Button';

interface DeleteGangButtonProps {
  gangId: string;
  gangName: string;
}

export default function DeleteGangButton({ gangId, gangName }: DeleteGangButtonProps) {
  const t = useTranslations('gangs.delete');
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/gangs/${gangId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('success'));
        router.push('/gangs');
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || t('errorGeneric'));
        setIsDeleting(false);
      }
    } catch {
      setError(t('errorGeneric'));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => setShowConfirm(true)}
      >
        🗑️ {t('button')}
      </Button>

      {showConfirm && (
        <ConfirmationModal
          isOpen={showConfirm}
          title={t('title')}
          confirmText={t('confirmButton')}
          cancelText="Hủy"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setShowConfirm(false)}
        >
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              {t('confirmMessage')} <strong className="font-bold text-red-500">"{gangName}"</strong>?
            </p>
            <p className="text-xs text-muted">
              {t('explanation')}
            </p>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 font-medium">
                {error}
              </div>
            )}
          </div>
        </ConfirmationModal>
      )}
    </>
  );
}
