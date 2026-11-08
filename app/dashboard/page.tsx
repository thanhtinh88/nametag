import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navigation from '@/components/Navigation';
import InstallPrompt from '@/components/InstallPrompt';
import { apiServer } from '@/lib/backend/api-client';
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
import type { EventDto } from '@/types/api/event';
import type { Gang } from '@/types/api/gang';
import type { Group } from '@/types/api/group';
import type { JournalEntry } from '@/types/api/journal';

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

  const [
    t,
    { dateFormat, graphMode },
    peopleRes,
    eventsRes,
    gangsRes,
    journalRes,
    groupsRes,
    templatesRes,
  ] = await Promise.all([
    getTranslations('dashboard'),
    getUserDisplayPreferences(userId),
    apiServer.get<{ people: any[] }>('/api/people?includeAll=true&includeDetails=true').catch(() => ({ people: [] })),
    apiServer.get<{ events: EventDto[] }>('/api/events').catch(() => ({ events: [] })),
    apiServer.get<{ gangs: Gang[] }>('/api/gangs').catch(() => ({ gangs: [] })),
    apiServer.get<{ entries: JournalEntry[] }>('/api/journal').catch(() => ({ entries: [] })),
    apiServer.get<{ groups: Group[] }>('/api/groups').catch(() => ({ groups: [] })),
    apiServer.get<{ customFieldTemplates: any[] }>('/api/custom-field-templates').catch(() => ({ customFieldTemplates: [] })),
  ]);

  const allPeople = peopleRes?.people || [];
  const allEvents = eventsRes?.events || [];
  const allGangs = gangsRes?.gangs || [];
  const allJournal = journalRes?.entries || [];
  const groups = groupsRes?.groups || [];
  const customFieldTemplates = templatesRes?.customFieldTemplates || [];

  const totalPeople = allPeople.length;
  const convictedPeople = allPeople.filter((p: any) => p.criminalRecords && p.criminalRecords.length > 0).length;
  const recentPeopleMonth = allPeople.filter((p: any) => new Date(p.createdAt) >= thirtyDaysAgo).length;

  const totalCases = allEvents.length;
  const activeCasesCount = allEvents.filter((e) => e.status === 'ONGOING').length;
  const unresolvedCasesCount = allEvents.filter((e) => e.status === 'PLANNED').length;

  const totalGangs = allGangs.length;
  const totalJournalEntries = allJournal.length;
  const recentJournalMonth = allJournal.filter((j) => new Date(j.createdAt || j.date) >= thirtyDaysAgo).length;

  const turfsCount = new Set(allGangs.map((g) => g.turf?.trim()).filter(Boolean)).size;

  // Priority cases: planned or ongoing, sorted by updatedAt/startDate desc, take 5
  const priorityCasesRaw = [...allEvents]
    .filter((e) => e.status === 'ONGOING' || e.status === 'PLANNED')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5);

  const priorityCases: PriorityCaseItem[] = priorityCasesRaw.map((e) => ({
    id: e.id,
    title: e.title,
    status: e.status,
    caseCode: e.caseCode || null,
    crimeType: e.crimeType || null,
    caseStatus: e.caseStatus || null,
    startDate: e.startDate ? new Date(e.startDate) : null,
    updatedAt: new Date(e.updatedAt),
    people: (e.people || []).map((p: any) => ({
      person: {
        id: p.person?.id || p.personId,
        name: p.person?.name || '',
        surname: p.person?.surname || null,
        nickname: p.person?.nickname || null,
        photo: p.person?.photo || null,
      },
    })),
  }));

  // Recent journal entries (take 4)
  const recentJournalEntries = [...allJournal]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4)
    .map((j) => ({
      id: j.id,
      title: j.title,
      date: new Date(j.date),
      body: j.body || '',
      people: (j.people || []).map((p: any) => ({
        person: {
          id: p.person?.id || p.personId,
          name: p.person?.name || '',
          surname: p.person?.surname || null,
          nickname: p.person?.nickname || null,
        },
      })),
      events: (j.events || []).map((ev: any) => ({
        event: {
          id: ev.event?.id || ev.eventId,
          title: ev.event?.title || '',
        },
      })),
    }));

  // Prominent gangs (take 3)
  const prominentGangs: ProminentGangItem[] = [...allGangs]
    .sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0))
    .slice(0, 3)
    .map((g) => ({
      id: g.id,
      name: g.name,
      turf: g.turf || null,
      color: g.color || null,
      members: (g.members || []).map((m: any) => ({
        person: {
          id: m.person?.id || m.personId,
          name: m.person?.name || '',
          surname: m.person?.surname || null,
          photo: m.person?.photo || null,
        },
      })),
    }));

  // Recent people (take 4)
  const recentPeople: RecentPersonItem[] = [...allPeople]
    .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 4)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      surname: p.surname || null,
      nickname: p.nickname || null,
      photo: p.photo || null,
      updatedAt: new Date(p.updatedAt || p.createdAt),
      criminalRecordsCount: (p.criminalRecords || []).length,
      gangName: p.gangMemberships?.[0]?.gang?.name || null,
    }));

  const allCasesForFilter = allEvents.map((e) => ({
    id: e.id,
    title: e.title,
    status: e.status,
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

          {/* Key Metrics Stat Cards */}
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
                groups={(groups || []).map((g) => ({ id: g.id, name: g.name, color: g.color ?? null }))}
                events={allCasesForFilter}
                customFieldTemplates={customFieldTemplates.map((tmpl: any) => ({
                  id: tmpl.id,
                  name: tmpl.name,
                  slug: tmpl.slug,
                  type: tmpl.type,
                  options: Array.isArray(tmpl.options) ? (tmpl.options as string[]) : undefined,
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
