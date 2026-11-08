import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiServer } from '@/lib/backend/api-client';
import { getTranslations } from 'next-intl/server';
import CustomFieldsManager from '@/components/customFields/CustomFieldsManager';

export default async function CustomFieldsSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const res = await apiServer.get<{ customFieldTemplates: any[] }>('/api/custom-field-templates').catch(() => ({ customFieldTemplates: [] }));
  const templates = res?.customFieldTemplates || [];

  const t = await getTranslations('customFields.settings');

  return (
    <div className="bg-surface shadow rounded-lg">
      <div className="px-6 py-5 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('description')}</p>
      </div>
      <div className="p-6">
        <CustomFieldsManager initialTemplates={templates} usage={null} />
      </div>
    </div>
  );
}
