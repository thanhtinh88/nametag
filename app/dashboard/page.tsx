import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navigation from '@/components/Navigation';
import InstallPrompt from '@/components/InstallPrompt';
import { prisma } from '@/lib/prisma';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';
import PriorityCasesList, { type PriorityCaseItem } from '@/components/dashboard/PriorityCasesList';
import RecentJournalWidget from '@/components/dashboard/RecentJournalWidget';
import ProminentGangsWidget, { type ProminentGangItem } from '@/components/dashboard/ProminentGangsWidget';
import RecentPeopleWidget, { type RecentPersonItem } from '@/components/dashboard/RecentPeopleWidget';
import CollapsibleGraphWidget from '@/components/dashboard/CollapsibleGraphWidget';
import EmptyState from '@/components/EmptyState';
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const userId = session.user.id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Time-of-day greeting
  const hour = now.getHours();
  const greetingKey = hour < 12 ? 'greetingMorning' : hour < 18 ? 'greetingAfternoon' : 'greetingEvening';

  // Parallel data fetching for optimal performance — only real, active data
  const [
    t,
    { dateFormat, graphMode },
    totalPeople,
    convictedPeople,
    recentPeopleMonth,
    totalCases,
    activeCasesCount,
    unresolvedCasesCount,
    totalGangs,
    totalJournalEntries,
    recentJournalMonth,
    gangTurfs,
    priorityCasesRaw,
    recentJournalEntries,
    prominentGangsRaw,
    recentPeopleRaw,
    groups,
    allCasesForFilter,
    customFieldTemplates,
  ] = await Promise.all([
    getTranslations('dashboard'),
    getUserDisplayPreferences(userId),
    // 1. Total people count
    prisma.person.count({
      where: { userId, deletedAt: null },
    }),
    // 2. People with criminal records
    prisma.person.count({
      where: {
        userId,
        deletedAt: null,
        criminalRecords: { some: { deletedAt: null } },
      },
    }),
    // 3. New people added this month
    prisma.person.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    // 4. Total cases
    prisma.event.count({
      where: { userId, deletedAt: null },
    }),
    // 5. Active cases (ongoing)
    prisma.event.count({
      where: { userId, deletedAt: null, status: 'ONGOING' },
    }),
    // 6. Unresolved cases (planned / new)
    prisma.event.count({
      where: { userId, deletedAt: null, status: 'PLANNED' },
    }),
    // 7. Total gangs
    prisma.gang.count({
      where: { userId, deletedAt: null },
    }),
    // 8. Total journal entries
    prisma.journalEntry.count({
      where: { userId, deletedAt: null },
    }),
    // 9. Recent journal entries this month
    prisma.journalEntry.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    // 10. Distinct turfs count
    prisma.gang.findMany({
      where: { userId, deletedAt: null, turf: { not: null } },
      select: { turf: true },
    }),
    // 11. Priority cases (take 5)
    prisma.event.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['ONGOING', 'PLANNED'] },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 5,
      include: {
        people: {
          where: { deletedAt: null, person: { deletedAt: null } },
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
        },
      },
    }),
    // 12. Recent investigation journal entries (take 4)
    prisma.journalEntry.findMany({
      where: { userId, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 4,
      include: {
        people: {
          where: { person: { deletedAt: null } },
          include: {
            person: {
              select: { id: true, name: true, surname: true, nickname: true },
            },
          },
        },
        events: {
          where: { event: { deletedAt: null } },
          include: {
            event: {
              select: { id: true, title: true },
            },
          },
        },
      },
    }),
    // 13. Prominent gangs (take 3)
    prisma.gang.findMany({
      where: { userId, deletedAt: null },
      orderBy: { members: { _count: 'desc' } },
      take: 3,
      include: {
        members: {
          where: { person: { deletedAt: null } },
          include: {
            person: {
              select: { id: true, name: true, surname: true, photo: true },
            },
          },
        },
      },
    }),
    // 14. Recently updated subjects (take 4)
    prisma.person.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }],
      take: 4,
      include: {
        criminalRecords: {
          where: { deletedAt: null },
          select: { id: true },
        },
        gangMemberships: {
          include: {
            gang: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    // 15. Groups for graph filter
    prisma.group.findMany({
      where: { userId, deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    // 16. All cases for graph filter
    prisma.event.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, status: true },
    }),
    // 17. Custom field templates for graph
    prisma.customFieldTemplate.findMany({
      where: { userId, deletedAt: null },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, slug: true, type: true, options: true },
    }),
  ]);

  // Unique turfs count
  const turfsCount = new Set(gangTurfs.map((g) => g.turf?.trim()).filter(Boolean)).size;

  const prominentGangs: ProminentGangItem[] = prominentGangsRaw;
  const priorityCases: PriorityCaseItem[] = priorityCasesRaw;

  // Format recently updated subjects
  const recentPeople: RecentPersonItem[] = recentPeopleRaw.map((p) => ({
    id: p.id,
    name: p.name,
    surname: p.surname,
    nickname: p.nickname,
    photo: p.photo,
    updatedAt: p.updatedAt,
    criminalRecordsCount: p.criminalRecords.length,
    gangName: p.gangMemberships[0]?.gang?.name || null,
  }));

  const hasData = totalPeople > 0 || totalCases > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/dashboard"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-page-enter">
        <div className="px-4 sm:px-0">
          {/* Command Header */}
          <DashboardHeader
            userName={session.user.nickname || session.user.name || ''}
            greetingKey={greetingKey}
          />

          <InstallPrompt />

          {/* Key Metrics Stat Cards - 4 Core Operational Modules */}
          <DashboardMetrics
            totalPeople={totalPeople}
            convictedPeople={convictedPeople}
            recentPeopleMonth={recentPeopleMonth}
            totalCases={totalCases}
            activeCases={activeCasesCount}
            unresolvedCases={unresolvedCasesCount}
            totalGangs={totalGangs}
            turfsCount={turfsCount}
            totalJournalEntries={totalJournalEntries}
            recentJournalMonth={recentJournalMonth}
          />

          {/* Main 2-Column Tactical Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Left Column (Primary Cases & Scout Journal): 7 Cols on Large */}
            <div className="lg:col-span-7 space-y-6">
              <PriorityCasesList
                cases={priorityCases}
                totalCount={totalCases}
                dateFormat={dateFormat}
              />

              <RecentJournalWidget
                entries={recentJournalEntries}
                dateFormat={dateFormat}
              />
            </div>

            {/* Right Column (Prominent Gangs & Recent Subjects): 5 Cols on Large */}
            <div className="lg:col-span-5 space-y-6">
              <ProminentGangsWidget
                gangs={prominentGangs}
                totalGangsCount={totalGangs}
              />

              <RecentPeopleWidget
                people={recentPeople}
                totalCount={totalPeople}
                dateFormat={dateFormat}
              />
            </div>
          </div>

          {/* Collapsible Network Graph Section */}
          {hasData ? (
            <div className="mb-8">
              <CollapsibleGraphWidget
                groups={groups}
                events={allCasesForFilter}
                customFieldTemplates={customFieldTemplates.map((t) => ({
                  id: t.id,
                  name: t.name,
                  slug: t.slug,
                  type: t.type,
                  options: Array.isArray(t.options) ? (t.options as string[]) : undefined,
                }))}
                graphMode={graphMode}
                peopleCount={totalPeople}
                casesCount={totalCases}
              />
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-border p-12 text-center mb-8">
              <EmptyState
                icon="🛡️"
                title={t('emptyNetwork.title')}
                description={t('emptyNetwork.description')}
                actionLabel={t('emptyNetwork.action')}
                actionHref="/people/new"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
