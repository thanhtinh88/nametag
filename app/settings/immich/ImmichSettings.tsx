'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

interface ImmichConnectionData {
  id: string;
  serverUrl: string;
  publicUrl: string | null;
  enabled: boolean;
  lastError: string | null;
  lastCheckedAt: string | null;
  hasApiKey: boolean;
}

interface ImmichSettingsProps {
  connection: ImmichConnectionData | null;
  linkedPeopleCount: number;
  linkedEventsCount: number;
}

export default function ImmichSettings({
  connection,
  linkedPeopleCount,
  linkedEventsCount,
}: ImmichSettingsProps) {
  const router = useRouter();
  const t = useTranslations('settings.immich');
  const tCommon = useTranslations('common');

  const [serverUrl, setServerUrl] = useState(connection?.serverUrl || '');
  const [publicUrl, setPublicUrl] = useState(connection?.publicUrl || '');
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(connection?.enabled ?? true);

  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/immich/connection/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: serverUrl.trim(),
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        setStatusMessage({
          type: 'error',
          text: data.error || t('testFailed'),
        });
      } else {
        const details = [
          data.userName || data.userEmail,
          data.serverVersion ? `v${data.serverVersion}` : null,
        ]
          .filter(Boolean)
          .join(' • ');
        setStatusMessage({
          type: 'success',
          text: details
            ? `${t('testSuccess')} (${details})`
            : t('testSuccess'),
        });
        router.refresh();
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: t('testFailed'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/immich/connection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: serverUrl.trim(),
          publicUrl: publicUrl.trim() || null,
          apiKey: apiKey.trim() || undefined,
          enabled,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setStatusMessage({
          type: 'error',
          text: data.error || t('saveFailed'),
        });
      } else {
        setApiKey('');
        setStatusMessage({
          type: 'success',
          text: t('saveSuccess'),
        });
        router.refresh();
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: t('saveFailed'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(t('confirmDisconnect'))) {
      return;
    }

    setIsDeleting(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/immich/connection', {
        method: 'DELETE',
      });

      if (!response.ok) {
        setStatusMessage({
          type: 'error',
          text: t('disconnectFailed'),
        });
      } else {
        setServerUrl('');
        setPublicUrl('');
        setApiKey('');
        setEnabled(true);
        setStatusMessage({
          type: 'success',
          text: t('disconnectSuccess'),
        });
        router.refresh();
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: t('disconnectFailed'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {t('title')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('description')}
            </p>
          </div>
          {connection && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                connection.enabled && !connection.lastError
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : connection.lastError
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connection.enabled && !connection.lastError
                    ? 'bg-green-500'
                    : connection.lastError
                    ? 'bg-red-500'
                    : 'bg-gray-400'
                }`}
              />
              {connection.enabled
                ? connection.lastError
                  ? t('statusError')
                  : t('statusConnected')
                : t('statusDisabled')}
            </span>
          )}
        </div>

        {/* Overview / Statistics */}
        {connection && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 p-4 rounded-lg bg-surface-elevated border border-border">
            <div>
              <div className="text-xs text-muted-foreground">
                {t('linkedSubjects')}
              </div>
              <div className="text-xl font-bold text-foreground mt-0.5">
                {linkedPeopleCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {t('linkedCases')}
              </div>
              <div className="text-xl font-bold text-foreground mt-0.5">
                {linkedEventsCount}
              </div>
            </div>
          </div>
        )}

        {statusMessage && (
          <div
            className={`my-4 p-3 rounded-lg text-sm border ${
              statusMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {connection?.lastError && !statusMessage && (
          <div className="my-4 p-3 rounded-lg text-sm border bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
            <strong>{t('lastErrorLabel')}:</strong> {connection.lastError}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('serverUrlLabel')}
            </label>
            <input
              type="url"
              required
              placeholder={t('serverUrlPlaceholder')}
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('serverUrlHelp')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('publicUrlLabel')}
            </label>
            <input
              type="url"
              placeholder={t('publicUrlPlaceholder')}
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('publicUrlHelp')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('apiKeyLabel')}
            </label>
            <input
              type="password"
              required={!connection?.hasApiKey}
              placeholder={
                connection?.hasApiKey
                  ? t('apiKeySavedPlaceholder')
                  : t('apiKeyPlaceholder')
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('apiKeyHelp')}
            </p>
          </div>

          <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-sm font-medium text-foreground">
              {t('enabledLabel')}
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving || !serverUrl.trim()}
              >
                {isSaving ? tCommon('saving') : t('saveButton')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isTesting ||
                  !serverUrl.trim() ||
                  (!apiKey.trim() && !connection?.hasApiKey)
                }
                onClick={handleTestConnection}
              >
                {isTesting ? t('testingButton') : t('testButton')}
              </Button>
            </div>

            {connection && (
              <Button
                type="button"
                variant="danger"
                disabled={isDeleting}
                onClick={handleDisconnect}
              >
                {isDeleting ? t('disconnectingButton') : t('disconnectButton')}
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Instructions Card */}
      <div className="bg-surface shadow rounded-lg p-6">
        <h3 className="text-base font-semibold text-foreground mb-2">
          {t('guideTitle')}
        </h3>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>{t('guideStep1')}</li>
          <li>{t('guideStep2')}</li>
          <li>{t('guideStep3')}</li>
          <li>{t('guideStep4')}</li>
        </ul>
      </div>
    </div>
  );
}
