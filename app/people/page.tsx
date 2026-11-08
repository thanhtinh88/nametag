import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { apiServer } from '@/lib/backend/api-client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import EmptyState from '@/components/EmptyState';
import ImportSuccessToast from '@/components/ImportSuccessToast';
import { getTranslations } from 'next-intl/server';
import PeopleListClient from '@/components/PeopleListClient';
import { getUserDisplayPreferences } from '@/lib/user-preferences';

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sortBy?: string;
    order?: string;
    group?: string;
    relationship?: string;
    managementLevel?: string;
    threatLevel?: string;
    hasRecord?: string;
    q?: string;
    cf?: string;
    contactRecency?: string;
    recordRecency?: string;
  }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [t, tCommon, { dateFormat, nameOrder, nameDisplayFormat }, params] = await Promise.all([
    getTranslations('people'),
    getTranslations('common'),
    getUserDisplayPreferences(session.user.id),
    searchParams,
  ]);

  const currentPage = Math.max(1, Number(params.page) || 1);
  const parsedPageSize = Number(params.pageSize);
  const pageSize = ALLOWED_PAGE_SIZES.includes(parsedPageSize) ? parsedPageSize : DEFAULT_PAGE_SIZE;

  const sortBy = params.sortBy || 'name';
  const order = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
  const groupFilter = params.group || '';
  const relationshipFilter = params.relationship || '';
  const managementFilter = params.managementLevel || '';
  const threatFilter = params.threatLevel || '';
  const hasRecordFilter = params.hasRecord || '';
  const contactRecencyFilter = params.contactRecency || '';
  const recordRecencyFilter = params.recordRecency || '';
  const query = (params.q || '').trim();

  const cfParam = params.cf || '';
  let cfFilter: { slug: string; value: string } | null = null;
  if (cfParam) {
    const idx = cfParam.indexOf(':');
    if (idx > 0) {
      cfFilter = { slug: cfParam.slice(0, idx), value: cfParam.slice(idx + 1) };
    }
  }

  const [peopleRes, groupsRes, relTypesRes, templatesRes] = await Promise.all([
    apiServer.get<{ people: any[] }>('/api/people?includeAll=true&includeDetails=true').catch(() => ({ people: [] })),
    apiServer.get<{ groups: any[] }>('/api/groups').catch(() => ({ groups: [] })),
    apiServer.get<{ relationshipTypes: any[] }>('/api/relationship-types').catch(() => ({ relationshipTypes: [] })),
    apiServer.get<{ customFieldTemplates: any[] }>('/api/custom-field-templates').catch(() => ({ customFieldTemplates: [] })),
  ]);

  const allPeopleRaw = peopleRes?.people || [];
  const allGroups = groupsRes?.groups || [];
  const relationshipTypes = relTypesRes?.relationshipTypes || [];
  const customFieldTemplates = templatesRes?.customFieldTemplates || [];

  // Filter
  let filtered = allPeopleRaw;

  if (query) {
    const qLower = query.toLowerCase();
    filtered = filtered.filter((p: any) => {
      if (p.name && p.name.toLowerCase().includes(qLower)) return true;
      if (p.surname && p.surname.toLowerCase().includes(qLower)) return true;
      if (p.nickname && p.nickname.toLowerCase().includes(qLower)) return true;
      if (p.citizenId && p.citizenId.toLowerCase().includes(qLower)) return true;
      if (p.vehicles && p.vehicles.some((v: any) => v.plateNumber?.toLowerCase().includes(qLower))) return true;
      return false;
    });
  }

  if (managementFilter) {
    filtered = filtered.filter((p: any) => p.managementLevel === managementFilter);
  }

  if (threatFilter) {
    filtered = filtered.filter((p: any) => p.threatLevel === threatFilter);
  }

  if (groupFilter === 'none') {
    filtered = filtered.filter((p: any) => !p.groups || p.groups.length === 0);
  } else if (groupFilter) {
    filtered = filtered.filter((p: any) => (p.groups || []).some((g: any) => g.groupId === groupFilter || g.id === groupFilter));
  }

  if (hasRecordFilter === 'true') {
    filtered = filtered.filter((p: any) => p.criminalRecords && p.criminalRecords.length > 0);
  }

  // Sort
  filtered.sort((a: any, b: any) => {
    let cmp = 0;
    if (sortBy === 'name') {
      const aName = `${a.name || ''} ${a.surname || ''}`.trim();
      const bName = `${b.name || ''} ${b.surname || ''}`.trim();
      cmp = aName.localeCompare(bName);
    } else if (sortBy === 'citizenId') {
      cmp = (a.citizenId || '').localeCompare(b.citizenId || '');
    } else if (sortBy === 'managementLevel') {
      cmp = (a.managementLevel || '').localeCompare(b.managementLevel || '');
    } else if (sortBy === 'threatLevel') {
      cmp = (a.threatLevel || '').localeCompare(b.threatLevel || '');
    } else if (sortBy === 'createdAt') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      const aName = `${a.name || ''} ${a.surname || ''}`.trim();
      const bName = `${b.name || ''} ${b.surname || ''}`.trim();
      cmp = aName.localeCompare(bName);
    }
    return order === 'desc' ? -cmp : cmp;
  });

  const totalCount = filtered.length;
  const totalAll = allPeopleRaw.length;
  const countKeyTarget = allPeopleRaw.filter((p: any) => p.managementLevel === 'KEY_TARGET').length;
  const countSurveillance = allPeopleRaw.filter((p: any) => p.managementLevel === 'SURVEILLANCE').length;
  const countHighRisk = allPeopleRaw.filter((p: any) => p.threatLevel === 'HIGH' || p.threatLevel === 'ARMED_DANGEROUS').length;
  const countCriminal = allPeopleRaw.filter((p: any) => p.criminalRecords && p.criminalRecords.length > 0).length;
  const countUnassignedGroup = allPeopleRaw.filter((p: any) => !p.groups || p.groups.length === 0).length;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const skip = (currentPage - 1) * pageSize;
  const pagedPeople = filtered.slice(skip, skip + pageSize);

  const people = pagedPeople.map((p: any) => ({
    id: p.id,
    name: p.name,
    middleName: p.middleName || null,
    surname: p.surname || null,
    secondLastName: p.secondLastName || null,
    nickname: p.nickname || null,
    displayNameOverride: p.displayNameOverride || null,
    photo: p.photo || null,
    lastContact: p.lastContact ? new Date(p.lastContact) : null,
    relationshipToUser: p.relationshipToUser || null,
    groups: (p.groups || []).map((g: any) => ({
      groupId: g.groupId || g.id,
      group: g.group || { name: g.name || '', color: g.color || null },
    })),
    relationshipsFrom: p.relationshipsFrom || [],
    relationshipsTo: p.relationshipsTo || [],
    managementLevel: p.managementLevel || null,
    threatLevel: p.threatLevel || null,
    citizenId: p.citizenId || null,
    vehicles: p.vehicles || [],
    physicalMarks: p.physicalMarks || [],
    criminalRecordsCount: (p.criminalRecords || []).length,
    gangs: (p.gangMemberships || []).map((gm: any) => gm.gang || gm),
    casesCount: (p.events || []).length,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <ImportSuccessToast />
      </Suspense>

      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/people"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-page-enter">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold text-foreground">
              {t('title')}
            </h1>
            <Button href="/people/new">
              {t('addPerson')}
            </Button>
          </div>

          {totalCount === 0 && !query && !groupFilter && !managementFilter && !threatFilter && !hasRecordFilter ? (
            <div className="bg-surface shadow rounded-lg">
              <EmptyState
                icon={
                  <svg className="w-12 h-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                title={t('noPeopleYet')}
                description={t('noPeopleDescription')}
                actionLabel={t('addFirstPerson')}
                actionHref="/people/new"
              />
            </div>
          ) : (
            <PeopleListClient
              people={people}
              availableGroups={allGroups}
              relationshipTypes={relationshipTypes}
              customFieldTemplates={customFieldTemplates}
              totalCount={totalCount}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              sortBy={sortBy}
              order={order}
              groupFilter={groupFilter}
              relationshipFilter={relationshipFilter}
              managementFilter={managementFilter}
              threatFilter={threatFilter}
              hasRecordFilter={hasRecordFilter}
              contactRecencyFilter={contactRecencyFilter}
              recordRecencyFilter={recordRecencyFilter}
              cfFilter={cfFilter}
              query={query}
              quickCounts={{
                totalAll,
                countKeyTarget,
                countSurveillance,
                countHighRisk,
                countCriminal,
                countUnassignedGroup,
              }}
              dateFormat={dateFormat}
              nameOrder={nameOrder}
              nameDisplayFormat={nameDisplayFormat}
              translations={{
                fullName: t('fullName'),
                surname: t('surname'),
                nickname: t('nickname'),
                relationshipToUser: t('relationships'),
                groups: t('groups'),
                lastContact: t('lastContact'),
                actions: t('actions'),
                indirect: t('indirect'),
                orphanWarning: t('orphanWarning'),
                showing: t('showing'),
                page: t('page'),
                of: t('of'),
                pageSize: t('pageSize'),
                perPage: t('perPage'),
                jumpToPage: t('jumpToPage'),
                jump: t('jump'),
                changeManagementLevel: t('changeManagementLevel'),
              }}
              commonTranslations={{
                name: tCommon('name'),
                edit: tCommon('edit'),
                view: tCommon('view'),
                previous: tCommon('previous'),
                next: tCommon('next'),
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
