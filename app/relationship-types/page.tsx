import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import EmptyState from '@/components/EmptyState';
import DeleteRelationshipTypeButton from '@/components/DeleteRelationshipTypeButton';
import { getTranslations } from 'next-intl/server';
import { createPreloadedRelationshipTypes, type RelationshipCategory } from '@/lib/relationship-types';

interface PageProps {
  searchParams?: Promise<{
    category?: string;
  }>;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CRIMINAL: { bg: 'bg-red-500/10 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', border: 'border-red-500/30' },
  FINANCIAL: { bg: 'bg-emerald-500/10 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/30' },
  FAMILY: { bg: 'bg-amber-500/10 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/30' },
  LEGAL_CASE: { bg: 'bg-rose-500/10 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-500/30' },
  SOCIAL: { bg: 'bg-blue-500/10 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/30' },
};

export default async function RelationshipTypesPage({ searchParams }: PageProps) {
  const session = await auth();
  const t = await getTranslations('relationshipTypes');

  if (!session?.user) {
    redirect('/login');
  }

  const params = searchParams ? await searchParams : {};
  const selectedCategory = params.category || 'ALL';

  // Check if user has any relationship types; if not, seed investigation defaults
  const totalCount = await prisma.relationshipType.count({
    where: {
      userId: session.user.id,
      deletedAt: null,
    },
  });

  if (totalCount === 0) {
    await createPreloadedRelationshipTypes(prisma, session.user.id);
  }

  const allRelationshipTypes = await prisma.relationshipType.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
    },
    include: {
      inverse: {
        select: {
          id: true,
          name: true,
          label: true,
        },
      },
      _count: {
        select: {
          relationships: {
            where: {
              person: { deletedAt: null },
              relatedPerson: { deletedAt: null },
            },
          },
        },
      },
    },
    orderBy: [
      { category: 'asc' },
      { label: 'asc' },
    ],
  });

  // Calculate usage counts
  const typesWithUsage = allRelationshipTypes.map((type) => ({
    ...type,
    totalUsageCount: type._count.relationships,
  }));

  // Group counts by category
  const categoryCounts: Record<string, number> = {
    ALL: typesWithUsage.length,
    CRIMINAL: 0,
    FINANCIAL: 0,
    FAMILY: 0,
    LEGAL_CASE: 0,
    SOCIAL: 0,
  };

  typesWithUsage.forEach((t) => {
    const cat = t.category || 'SOCIAL';
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat]++;
    }
  });

  // Filter by selected category
  const filteredTypes =
    selectedCategory === 'ALL'
      ? typesWithUsage
      : typesWithUsage.filter((t) => (t.category || 'SOCIAL') === selectedCategory);

  const categories: Array<{ key: string; label: string; icon: string }> = [
    { key: 'ALL', label: t('allCategories'), icon: '📂' },
    { key: 'CRIMINAL', label: t('categories.CRIMINAL'), icon: '🔴' },
    { key: 'FINANCIAL', label: t('categories.FINANCIAL'), icon: '🟢' },
    { key: 'FAMILY', label: t('categories.FAMILY'), icon: '🟡' },
    { key: 'LEGAL_CASE', label: t('categories.LEGAL_CASE'), icon: '⚖️' },
    { key: 'SOCIAL', label: t('categories.SOCIAL'), icon: '🔵' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/relationship-types"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {t('title')}
              </h1>
              <p className="text-sm text-muted mt-1">
                {t('noRelationshipTypesDescription')}
              </p>
            </div>
            <Button href="/relationship-types/new">
              {t('createNewType')}
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border scrollbar-thin">
            {categories.map((cat) => {
              const count = categoryCounts[cat.key] || 0;
              const isActive = selectedCategory === cat.key;
              const href = cat.key === 'ALL' ? '/relationship-types' : `/relationship-types?category=${cat.key}`;

              return (
                <Link
                  key={cat.key}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted hover:text-foreground hover:bg-surface-elevated'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-xs font-semibold ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-surface-elevated text-muted'
                    }`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Content Table */}
          {filteredTypes.length > 0 ? (
            <div className="bg-surface shadow rounded-lg overflow-hidden border border-border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface-elevated">
                  <tr>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider w-16">
                      {t('color')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      {t('relationship')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      {t('category')}
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      {t('direction')}
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      {t('inverseRelationship')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {filteredTypes.map((type) => {
                    const catKey = type.category || 'SOCIAL';
                    const catStyle = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.SOCIAL;
                    const isBidirectional = type.directionType === 'BIDIRECTIONAL' || type.inverseId === type.id;
                    const isDashed = type.lineStyle === 'DASHED';

                    return (
                      <tr key={type.id} className="hover:bg-surface-elevated transition-colors">
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          <div
                            className={`w-7 h-7 rounded flex items-center justify-center ${
                              isDashed ? 'border-2 border-dashed' : 'border border-solid'
                            }`}
                            style={{
                              backgroundColor: `${type.color || '#6B7280'}25`,
                              borderColor: type.color || '#6B7280',
                            }}
                            title={isDashed ? t('lineStyles.DASHED') : t('lineStyles.SOLID')}
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color || '#6B7280' }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-foreground">
                            {type.label}
                          </div>
                          <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                            <span>{t('usedTimes', { count: type.totalUsageCount })}</span>
                            {isDashed && (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                • {t('lineStyles.DASHED')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                          >
                            {t(`categories.${catKey as RelationshipCategory}` as any) || catKey}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm">
                          {isBidirectional ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted font-medium bg-surface-elevated px-2 py-1 rounded">
                              <span className="text-primary font-bold">↔</span> {t('directions.BIDIRECTIONAL')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted font-medium bg-surface-elevated px-2 py-1 rounded">
                              <span className="text-amber-500 font-bold">➔</span> {t('directions.DIRECTED')}
                            </span>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          {type.inverse ? (
                            <span className="text-sm text-foreground font-medium">
                              {type.inverse.label}
                            </span>
                          ) : (
                            <span className="text-sm text-muted">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-3">
                            <Link
                              href={`/relationship-types/${type.id}/edit`}
                              className="text-primary hover:text-primary-dark transition-colors"
                              title={t('edit')}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <DeleteRelationshipTypeButton
                              relationshipTypeId={type.id}
                              relationshipTypeName={type.label}
                              usageCount={type.totalUsageCount}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-surface shadow rounded-lg border border-border">
              <EmptyState
                icon={
                  <div className="p-4 bg-primary/10 rounded-lg inline-block">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                }
                title={t('noRelationshipTypes')}
                description={t('noRelationshipTypesDescription')}
                actionLabel={t('createRelationshipType')}
                actionHref="/relationship-types/new"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
