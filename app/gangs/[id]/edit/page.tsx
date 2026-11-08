import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { apiServer } from '@/lib/backend/api-client';
import Navigation from '@/components/Navigation';
import GangForm from '@/components/GangForm';
import { getTranslations } from 'next-intl/server';
import type { Gang } from '@/types/api/gang';

export default async function EditGangPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const t = await getTranslations('gangs');

  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;

  const gangRes = await apiServer.get<{ gang: Gang }>(`/api/gangs/${id}`).catch(() => null);
  const gang = gangRes?.gang;

  if (!gang) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/gangs"
      />

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/gangs/${gang.id}`}
                className="text-xs text-muted hover:text-foreground font-medium mb-1 inline-block"
              >
                {t('backToGang', { name: gang.name })}
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <span>✏️</span>
                <span>{t('editGangName', { name: gang.name })}</span>
              </h1>
            </div>
          </div>

          <GangForm
            gang={{
              id: gang.id,
              name: gang.name,
              description: gang.description ?? null,
              turf: gang.turf ?? null,
              color: gang.color ?? null,
            }}
            mode="edit"
          />
        </div>
      </main>
    </div>
  );
}
