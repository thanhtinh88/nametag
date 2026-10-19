'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { getRandomColor, PRESET_COLORS } from '@/lib/colors';
import { Button } from './ui/Button';

interface GangFormProps {
  gang?: {
    id: string;
    name: string;
    description: string | null;
    turf: string | null;
    color: string | null;
  };
  mode: 'create' | 'edit';
}

export default function GangForm({ gang, mode }: GangFormProps) {
  const t = useTranslations('gangs.form');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: gang?.name || '',
    turf: gang?.turf || '',
    description: gang?.description || '',
    color: gang?.color || getRandomColor(),
  });

  const handleRerollColor = () => {
    setFormData((prev) => ({
      ...prev,
      color: getRandomColor(),
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError(t('gangNameRequired'));
      return;
    }

    setIsLoading(true);

    try {
      const url = mode === 'create' ? '/api/gangs' : `/api/gangs/${gang?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const payload = {
        name: formData.name.trim(),
        turf: formData.turf.trim() || null,
        description: formData.description.trim() || null,
        color: formData.color || '#EF4444',
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('errorSomethingWrong'));
        return;
      }

      toast.success(
        mode === 'create'
          ? t('successCreated', { name: formData.name })
          : t('successUpdated', { name: formData.name })
      );

      const targetId = mode === 'create' ? data.gang?.id : gang?.id;
      if (targetId) {
        router.push(`/gangs/${targetId}`);
      } else {
        router.push('/gangs');
      }
      router.refresh();
    } catch {
      setError(t('errorConnection'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Tên băng nhóm */}
      <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-4">
        <div>
          <label htmlFor="gang-name" className="block text-sm font-semibold text-foreground mb-1">
            {t('gangName')} <span className="text-red-500">*</span>
          </label>
          <input
            id="gang-name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('gangNamePlaceholder')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
          />
        </div>

        {/* Địa bàn hoạt động */}
        <div>
          <label htmlFor="gang-turf" className="block text-sm font-semibold text-foreground mb-1">
            {t('turf')}
          </label>
          <input
            id="gang-turf"
            type="text"
            value={formData.turf}
            onChange={(e) => setFormData({ ...formData, turf: e.target.value })}
            placeholder={t('turfPlaceholder')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        {/* Mô tả & Thủ đoạn */}
        <div>
          <label htmlFor="gang-description" className="block text-sm font-semibold text-foreground mb-1">
            {t('description')}
          </label>
          <textarea
            id="gang-description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('descriptionPlaceholder')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        {/* Màu sắc nhận diện */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            {t('color')}
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setFormData({ ...formData, color: preset })}
                className={`w-7 h-7 rounded-full transition-transform ${
                  formData.color.toUpperCase() === preset.toUpperCase()
                    ? 'scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: preset }}
                aria-label={`Select color ${preset}`}
              />
            ))}
            <button
              type="button"
              onClick={handleRerollColor}
              className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-elevated transition-colors ml-2"
            >
              🎲 {t('generateRandomColor')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{t('customColor')}</span>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
            />
            <span className="text-xs font-mono font-medium text-foreground uppercase">
              {formData.color}
            </span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          {t('cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading
            ? t('saving')
            : mode === 'create'
              ? t('createGang')
              : t('updateGang')}
        </Button>
      </div>
    </form>
  );
}

