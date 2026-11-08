import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { apiServer } from '@/lib/backend/api-client';
import DeleteGroupButton from '@/components/DeleteGroupButton';
import Navigation from '@/components/Navigation';
import GroupMembersManager from '@/components/GroupMembersManager';
import GroupSuspectedCases, { type SuspectedCaseItem } from '@/components/GroupSuspectedCases';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';
import type { Group } from '@/types/api/group';

export default async function GroupDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [{ id }, t, tCommon] = await Promise.all([
    params,
    getTranslations('groups'),
    getTranslations('common'),
  ]);

  const [groupRes, allPeopleRes, preferences, eventsRes] = await Promise.all([
    apiServer.get<{ group: Group }>(`/api/groups/${id}`).catch(() => null),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
    getUserDisplayPreferences(session.user.id),
    apiServer.get<{ events: any[] }>('/api/events').catch(() => ({ events: [] })),
  ]);

  const group = groupRes?.group;
  if (!group) {
    notFound();
  }

  const allPeople = allPeopleRes?.people || [];
  const { nameOrder, nameDisplayFormat, dateFormat } = preferences;

  const currentMembers = (group.people || [])
    .map((pg) => pg.person)
    .filter((p): p is NonNullable<typeof p> => p != null);
  const currentMemberIds = currentMembers.map((m) => m.id);
  const memberIdSet = new Set(currentMemberIds);

  const rawEvents = eventsRes?.events || [];
  const suspectedCases: SuspectedCaseItem[] = rawEvents
    .map((e: any) => {
      const isDirectlyAssignedToGroup = (e.groups || []).some((g: any) => g.groupId === id);
      const involvedGroupMembers = (e.people || []).filter((p: any) => memberIdSet.has(p.personId));

      return {
        id: e.id,
        title: e.title,
        caseCode: e.caseCode,
        crimeType: e.crimeType,
        caseStatus: e.caseStatus,
        status: e.status,
        startDate: e.startDate || null,
        endDate: e.endDate || null,
        incidentTimeNotes: e.incidentTimeNotes,
        damageAssessment: e.damageAssessment,
        isDirectlyAssignedToGroup,
        addresses: e.addresses || [],
        involvedGroupMembers,
      };
    })
    .filter((c: any) => c.isDirectlyAssignedToGroup || c.involvedGroupMembers.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/groups"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-page-enter">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div>
            <Link
              href="/groups"
              className="text-primary hover:underline text-sm"
            >
              {t('backToGroups')}
            </Link>
          </div>

          <div className="bg-surface shadow rounded-lg overflow-visible">
            <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-center flex-1 min-w-0">
                {group.color && (
                  <div
                    className="w-12 h-12 rounded-full mr-4 flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
                    {group.name}
                  </h1>
                  {group.description && (
                    <p className="text-muted mt-1">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 space-x-3 w-full sm:w-auto">
                <Link
                  href={`/groups/${group.id}/edit`}
                  className="flex-1 sm:flex-none px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary-dark transition-colors text-center"
                >
                  {tCommon('edit')}
                </Link>
                <DeleteGroupButton groupId={group.id} groupName={group.name} />
              </div>
            </div>

            <div className="px-6 py-5">
              <GroupMembersManager
                groupId={group.id}
                groupName={group.name}
                currentMembers={currentMembers}
                availablePeople={allPeople}
                nameOrder={nameOrder}
                nameDisplayFormat={nameDisplayFormat}
              />
            </div>
          </div>

          {/* Suspected Cases Section */}
          <div className="bg-surface shadow rounded-lg p-6">
            <GroupSuspectedCases
              groupId={group.id}
              groupName={group.name}
              cases={suspectedCases}
              groupMembers={currentMembers}
              dateFormat={dateFormat}
              nameOrder={nameOrder}
              nameDisplayFormat={nameDisplayFormat}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
