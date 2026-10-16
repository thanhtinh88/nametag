'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from './ui/Button';

interface EventDeleteButtonProps {
  eventId: string;
  eventTitle: string;
}

export default function EventDeleteButton({
  eventId,
  eventTitle,
}: EventDeleteButtonProps) {
  const t = useTranslations('events.detail');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/events');
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={() => setShowConfirm(true)}
      >
        {t('deleteEvent')}
      </Button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('deleteEvent')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('confirmDelete')} ({eventTitle})
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {tCommon('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

