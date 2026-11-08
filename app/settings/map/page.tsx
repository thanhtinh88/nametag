import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiServer } from '@/lib/backend/api-client';
import { env } from '@/lib/env';
import { getTranslations } from 'next-intl/server';
import GeocodingToggle from '@/components/GeocodingToggle';

export default async function MapSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const t = await getTranslations('settings.map');

  const userRes = await apiServer.get<{ user: { geocodingEnabled?: boolean } }>('/api/user/profile').catch(() => null);
  const geocodingEnabled = userRes?.user?.geocodingEnabled ?? true;

  const providerHost = new URL(env.GEOCODER_URL).host;

  return (
    <div className="space-y-6">
      <div className="bg-surface shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">{t('geocodingTitle')}</h2>
        <p className="text-muted mb-6">{t('geocodingDescription', { provider: providerHost })}</p>
        <GeocodingToggle currentEnabled={geocodingEnabled} />
      </div>
    </div>
  );
}
