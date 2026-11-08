import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AccountManagement from '@/components/AccountManagement';
import { apiServer } from '@/lib/backend/api-client';
import { getTranslations } from 'next-intl/server';
import type { Group } from '@/types/api/group';

export default async function AccountSettingsPage() {
  const session = await auth();
  const t = await getTranslations('settings.account');

  if (!session?.user) {
    redirect('/login');
  }

  const [groupsRes, peopleRes] = await Promise.all([
    apiServer.get<{ groups: Group[] }>('/api/groups').catch(() => ({ groups: [] })),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
  ]);

  const groups = groupsRes?.groups || [];
  const peopleCount = peopleRes?.people?.length || 0;

  return (
    <div className="bg-surface shadow rounded-lg p-6">
      <h2 className="text-xl font-bold text-foreground mb-4">
        {t('title')}
      </h2>
      <p className="text-muted mb-6">
        {t('pageDescription')}
      </p>
      <AccountManagement
        groups={(groups || []).map((g) => ({ id: g.id, name: g.name, color: g.color ?? null }))}
        peopleCount={peopleCount}
      />
    </div>
  );
}
