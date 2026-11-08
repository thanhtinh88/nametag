import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { apiServer } from '@/lib/backend/api-client';
import RelationshipTypeForm from '@/components/RelationshipTypeForm';
import Navigation from '@/components/Navigation';
import { getTranslations } from 'next-intl/server';
import type { RelationshipType } from '@/types/api/relationship';

export default async function NewRelationshipTypePage() {
  const session = await auth();
  const t = await getTranslations('relationshipTypes');

  if (!session?.user) {
    redirect('/login');
  }

  // Get all available types for inverse relationship selection
  const res = await apiServer.get<{ relationshipTypes: RelationshipType[] }>('/api/relationship-types').catch(() => ({ relationshipTypes: [] }));
  const availableTypes = (res?.relationshipTypes || []).map((t) => ({
    id: t.id,
    name: t.name,
    label: t.label,
    color: t.color || null,
    inverseId: t.inverseId || null,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/relationship-types"
      />

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              href="/relationship-types"
              className="text-primary hover:underline text-sm"
            >
              {t('backToTypes')}
            </Link>
          </div>

          <div className="bg-surface shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">
              {t('createRelationshipType')}
            </h1>
            <RelationshipTypeForm availableTypes={availableTypes} mode="create" />
          </div>
        </div>
      </main>
    </div>
  );
}
