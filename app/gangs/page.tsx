import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import EmptyState from '@/components/EmptyState';
import PersonAvatar from '@/components/PersonPhoto';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import { formatFullName } from '@/lib/nameUtils';

export default async function GangsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [t, params, { nameOrder }] = await Promise.all([
    getTranslations('gangs'),
    searchParams,
    getUserDisplayPreferences(session.user.id),
  ]);

  const searchQuery = params.q?.trim() || '';

  const whereClause: any = {
    userId: session.user.id,
    deletedAt: null,
  };

  if (searchQuery) {
    whereClause.OR = [
      { name: { contains: searchQuery, mode: 'insensitive' } },
      { turf: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  const gangs = await prisma.gang.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          members: true,
        },
      },
      members: {
        include: {
          person: {
            select: {
              id: true,
              name: true,
              surname: true,
              nickname: true,
              photo: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5">
                <span>🏴</span>
                <span>{t('title')}</span>
              </h1>
              <p className="text-sm text-muted mt-1">
                {t('description')}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button href="/map" variant="secondary" size="md">
                🗺️ {t('viewOnMap')}
              </Button>
              <Button href="/gangs/new" variant="primary" size="md">
                + {t('addGang')}
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <form method="GET" action="/gangs" className="flex-1 max-w-md relative">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-surface text-foreground placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <svg
                className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </form>

            {searchQuery && (
              <Link
                href="/gangs"
                className="text-xs text-muted hover:text-foreground font-medium underline"
              >
                Xóa bộ lọc
              </Link>
            )}
          </div>

          {/* Empty state */}
          {gangs.length === 0 ? (
            <div className="bg-surface shadow-sm rounded-xl p-8 border border-border">
              <EmptyState
                icon={
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-3xl">
                    🏴
                  </div>
                }
                title={t('empty.title')}
                description={t('empty.description')}
                actionLabel={t('empty.action')}
                actionHref="/gangs/new"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {gangs.map((gang) => {
                const leader = gang.members.find((m) => m.role === 'LEADER');
                const second = gang.members.find((m) => m.role === 'SECOND_IN_COMMAND');
                const gangColor = gang.color || '#EF4444';

                return (
                  <div
                    key={gang.id}
                    className="bg-surface rounded-xl border border-border hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Top color stripe */}
                    <div className="h-1.5 w-full" style={{ backgroundColor: gangColor }} />

                    <div className="p-5 flex-1 space-y-3">
                      {/* Name & Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/gangs/${gang.id}`}
                          className="text-lg font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: gangColor }}
                          />
                          <span className="line-clamp-1">{gang.name}</span>
                        </Link>

                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-elevated text-foreground border border-border shrink-0">
                          {gang._count.members} thành viên
                        </span>
                      </div>

                      {/* Turf / Địa bàn */}
                      <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
                        <span>📍</span>
                        <span className="truncate">
                          {gang.turf || <span className="italic">{t('noTurf')}</span>}
                        </span>
                      </div>

                      {/* Description */}
                      {gang.description && (
                        <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                          {gang.description}
                        </p>
                      )}

                      {/* Leadership highlights */}
                      <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
                        {leader && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-red-500 shrink-0">👑 Cầm đầu:</span>
                            <div className="flex items-center gap-1.5 truncate">
                              <PersonAvatar
                                personId={leader.person.id}
                                name={leader.person.name}
                                photo={leader.person.photo}
                                size={24}
                              />
                              <Link
                                href={`/people/${leader.person.id}`}
                                className="font-semibold text-foreground hover:underline truncate"
                              >
                                {formatFullName(leader.person, nameOrder)}
                                {leader.person.nickname ? ` (${leader.person.nickname})` : ''}
                              </Link>
                            </div>
                          </div>
                        )}

                        {second && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-orange-500 shrink-0">⚔️ Phó tướng:</span>
                            <div className="flex items-center gap-1.5 truncate">
                              <PersonAvatar
                                personId={second.person.id}
                                name={second.person.name}
                                photo={second.person.photo}
                                size={24}
                              />
                              <Link
                                href={`/people/${second.person.id}`}
                                className="font-semibold text-foreground hover:underline truncate"
                              >
                                {formatFullName(second.person, nameOrder)}
                                {second.person.nickname ? ` (${second.person.nickname})` : ''}
                              </Link>
                            </div>
                          </div>
                        )}

                        {!leader && !second && gang._count.members > 0 && (
                          <p className="text-[11px] text-muted italic">
                            Chưa phân định đối tượng cầm đầu
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-5 py-3 bg-surface-elevated/40 border-t border-border flex items-center justify-between text-xs font-semibold">
                      <Link
                        href={`/map?gang=${gang.id}`}
                        className="text-muted hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        <span>🗺️</span>
                        <span>Vị trí bản đồ</span>
                      </Link>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/gangs/${gang.id}/edit`}
                          className="text-muted hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-surface"
                        >
                          {t('editGang')}
                        </Link>
                        <Link
                          href={`/gangs/${gang.id}`}
                          className="text-primary hover:text-primary-dark font-bold px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                        >
                          Chi tiết →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
