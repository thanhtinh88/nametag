import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { apiServer } from '@/lib/backend/api-client';
import RelationshipTypeForm from '@/components/RelationshipTypeForm';
import Navigation from '@/components/Navigation';
import { getTranslations } from 'next-intl/server';
import type { RelationshipType } from '@/types/api/relationship';

export default async function EditRelationshipTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const t = await getTranslations('relationshipTypes');

  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;

  const [typeRes, allTypesRes] = await Promise.all([
    apiServer.get<{ relationshipType: RelationshipType }>(`/api/relationship-types/${id}`).catch(() => null),
    apiServer.get<{ relationshipTypes: RelationshipType[] }>('/api/relationship-types').catch(() => ({ relationshipTypes: [] })),
  ]);

  const relationshipType = typeRes?.relationshipType;
  if (!relationshipType) {
    notFound();
  }

  const serializedType = {
    id: relationshipType.id,
    name: relationshipType.name,
    label: relationshipType.label,
    category: relationshipType.category ?? null,
    directionType: relationshipType.directionType ?? null,
    lineStyle: relationshipType.lineStyle ?? null,
    color: relationshipType.color ?? null,
    inverseId: relationshipType.inverseId ?? null,
    inverse: relationshipType.inverse ? {
      id: relationshipType.inverse.id,
      name: relationshipType.inverse.name,
      label: relationshipType.inverse.label,
    } : null,
  };

  const availableTypes = (allTypesRes?.relationshipTypes || [])
    .filter((t) => t.id !== id)
    .map((t) => ({
      id: t.id,
      name: t.name,
      label: t.label,
      color: t.color ?? null,
      inverseId: t.inverseId ?? null,
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
              {t('editType')}
            </h1>
            <RelationshipTypeForm
              relationshipType={serializedType}
              availableTypes={availableTypes}
              mode="edit"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
