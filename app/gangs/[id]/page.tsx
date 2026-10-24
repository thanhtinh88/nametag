import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import GangMembersManager from '@/components/GangMembersManager';
import DeleteGangButton from '@/components/DeleteGangButton';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';

export default async function GangDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [{ id }, t] = await Promise.all([
    params,
    getTranslations('gangs'),
  ]);

  const [gang, allPeople, preferences] = await Promise.all([
    prisma.gang.findUnique({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        members: {
          include: {
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
                nickname: true,
                displayNameOverride: true,
                photo: true,
                managementLevel: true,
                threatLevel: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    }),
    prisma.person.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        surname: true,
        nickname: true,
        displayNameOverride: true,
        photo: true,
        managementLevel: true,
        threatLevel: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    getUserDisplayPreferences(session.user.id),
  ]);

  if (!gang) {
    notFound();
  }

  const gangColor = gang.color || '#EF4444';

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/gangs"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-page-enter">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Breadcrumb / Back link */}
          <div className="flex items-center justify-between">
            <Link
              href="/gangs"
              className="text-xs text-muted hover:text-foreground font-medium flex items-center gap-1"
            >
              <span>←</span>
              <span>{t('backToGangs')}</span>
            </Link>

            <div className="flex items-center gap-2">
              <Button href={`/map?gang=${gang.id}`} variant="secondary" size="sm">
                🗺️ {t('viewOnMap')}
              </Button>
              <Button href={`/gangs/${gang.id}/edit`} variant="secondary" size="sm">
                ✏️ {t('editGang')}
              </Button>
              <DeleteGangButton gangId={gang.id} gangName={gang.name} />
            </div>
          </div>

          {/* Hero Banner */}
          <div className="bg-surface rounded-xl border border-border p-6 shadow-sm relative overflow-hidden">
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: gangColor }}
            />

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="w-5 h-5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: gangColor }}
                  />
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {gang.name}
                  </h1>

                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-elevated text-foreground border border-border">
                    {t('memberCount', { count: gang.members.length })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted font-medium">
                  <span>📍 {t('turfLabel')}:</span>
                  <span className="text-foreground font-semibold">
                    {gang.turf || <span className="text-muted italic font-normal">{t('noTurf')}</span>}
                  </span>
                </div>

                {gang.description && (
                  <p className="text-sm text-foreground/80 leading-relaxed max-w-3xl pt-2">
                    {gang.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quản lý danh sách thành viên */}
          <GangMembersManager
            gangId={gang.id}
            gangName={gang.name}
            gangColor={gang.color}
            currentMembers={gang.members}
            availablePeople={allPeople}
            nameOrder={preferences.nameOrder}
            nameDisplayFormat={preferences.nameDisplayFormat as any}
          />
        </div>
      </main>
    </div>
  );
}

