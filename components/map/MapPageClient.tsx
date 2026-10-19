'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MapMarkersResponse, UnmappedSubject } from '@/lib/map/types';
import {
  distinctCities,
  distinctCountries,
  distinctRegions,
  filterMarkers,
  type MapFilterState,
} from '@/lib/map/filter-markers';
import {
  DEFAULT_PERSON_FILTER_STATE,
  matchesPersonTacticalFilters,
  countActiveTacticalFilters,
} from '@/lib/filters/person-filter-types';
import TacticalSidebarContainer from '@/components/filters/TacticalSidebarContainer';
import TacticalPersonCard from '@/components/filters/TacticalPersonCard';
import TacticalQuickChips from '@/components/filters/TacticalQuickChips';
import ActiveTacticalBadges from '@/components/filters/ActiveTacticalBadges';
import TacticalFilterDrawer from '@/components/filters/TacticalFilterDrawer';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

function MapPageInner() {
  const t = useTranslations('map');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<MapMarkersResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [unlocatedOpen, setUnlocatedOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(true);
  const [focusRequest, setFocusRequest] = useState<{ id: string; seq: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cities = useMemo(() => distinctCities(data?.markers ?? []), [data?.markers]);
  const regions = useMemo(() => distinctRegions(data?.markers ?? []), [data?.markers]);
  const countries = useMemo(() => distinctCountries(data?.markers ?? []), [data?.markers]);

  const filters: MapFilterState = useMemo(
    () => ({
      ...DEFAULT_PERSON_FILTER_STATE,
      query: searchParams.get('q') ?? '',
      groupId: searchParams.get('group') ?? '',
      city: searchParams.get('city') ?? '',
      region: searchParams.get('region') ?? '',
      country: searchParams.get('country') ?? '',
      caseId: searchParams.get('case') ?? '',
      personId: searchParams.get('person') ?? searchParams.get('focus') ?? '',
      radiusKm: Number(searchParams.get('radius') ?? '0') || 0,
      onlyWithinRadius: searchParams.get('within') === '1',
      activeCasesOnly: searchParams.get('activeCases') === '1',
      showRuledOut: searchParams.get('ruledOut') !== '0',
      managementLevels: searchParams.get('ml')?.split(',').filter(Boolean) ?? [],
      threatLevels: searchParams.get('tl')?.split(',').filter(Boolean) ?? [],
      residenceStatuses: searchParams.get('rs')?.split(',').filter(Boolean) ?? [],
      gender: searchParams.get('gender') ?? '',
      involvementTypes: searchParams.get('inv')?.split(',').filter(Boolean) ?? [],
      verificationStatuses: searchParams.get('ver')?.split(',').filter(Boolean) ?? [],
      criminalRecordFilter: (searchParams.get('rec') as any) || 'all',
      criminalCharge: searchParams.get('charge') ?? '',
      gangId: searchParams.get('gang') ?? '',
      gangRole: searchParams.get('gangRole') ?? '',
      markTypes: searchParams.get('marks')?.split(',').filter(Boolean) ?? [],
      vehicleType: searchParams.get('veh') ?? '',
      onlySuspiciousVehicles: searchParams.get('suspVeh') === '1',
      onlyMuleAccounts: searchParams.get('mule') === '1',
    }),
    [searchParams]
  );
  const hasActiveFilters = countActiveTacticalFilters(filters) > 0 || Boolean(filters.query);
  const focusId = searchParams.get('focus');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/map/markers')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<MapMarkersResponse>;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFiltersChange = useCallback(
    (next: MapFilterState) => {
      const params = new URLSearchParams();
      if (next.query) params.set('q', next.query);
      if (next.groupId) params.set('group', next.groupId);
      if (next.city) params.set('city', next.city);
      if (next.region) params.set('region', next.region);
      if (next.country) params.set('country', next.country);
      if (next.caseId) params.set('case', next.caseId);
      if (next.personId) params.set('person', next.personId);
      if (next.radiusKm && next.radiusKm > 0) params.set('radius', String(next.radiusKm));
      if (next.onlyWithinRadius) params.set('within', '1');
      if (next.activeCasesOnly) params.set('activeCases', '1');
      if (next.showRuledOut === false) params.set('ruledOut', '0');

      if (next.managementLevels.length > 0) params.set('ml', next.managementLevels.join(','));
      if (next.threatLevels.length > 0) params.set('tl', next.threatLevels.join(','));
      if (next.residenceStatuses.length > 0) params.set('rs', next.residenceStatuses.join(','));
      if (next.gender) params.set('gender', next.gender);
      if (next.involvementTypes.length > 0) params.set('inv', next.involvementTypes.join(','));
      if (next.verificationStatuses.length > 0) params.set('ver', next.verificationStatuses.join(','));
      if (next.criminalRecordFilter && next.criminalRecordFilter !== 'all') params.set('rec', next.criminalRecordFilter);
      if (next.criminalCharge) params.set('charge', next.criminalCharge);
      if (next.gangId) params.set('gang', next.gangId);
      if (next.gangRole) params.set('gangRole', next.gangRole);
      if (next.markTypes.length > 0) params.set('marks', next.markTypes.join(','));
      if (next.vehicleType) params.set('veh', next.vehicleType);
      if (next.onlySuspiciousVehicles) params.set('suspVeh', '1');
      if (next.onlyMuleAccounts) params.set('mule', '1');

      // Changing filters drops the focus deep link on purpose
      const qs = params.toString();
      router.replace(qs ? `/map?${qs}` : '/map', { scroll: false });
    },
    [router]
  );

  const visibleMarkers = useMemo(
    () => (data ? filterMarkers(data.markers, filters) : []),
    [data, filters]
  );

  const filteredUnmappedSubjects = useMemo<UnmappedSubject[]>(() => {
    if (!data?.unmappedSubjects) return [];
    const needle = filters.query.trim().toLowerCase();
    return data.unmappedSubjects.filter((subj) => {
      if (needle && !subj.personName.toLowerCase().includes(needle)) {
        return false;
      }
      return matchesPersonTacticalFilters(subj, filters);
    });
  }, [data, filters]);

  const selectedCase = useMemo(
    () =>
      filters.caseId && data?.cases
        ? data.cases.find((c) => c.id === filters.caseId) ?? null
        : null,
    [data, filters.caseId]
  );

  const radiusCenter = useMemo(() => {
    if (filters.personId) {
      const personMarker = data?.markers.find((m) => m.personId === filters.personId);
      if (personMarker && personMarker.latitude !== null && personMarker.longitude !== null) {
        return {
          latitude: personMarker.latitude,
          longitude: personMarker.longitude,
          label: personMarker.personName,
          isPerson: true,
        };
      }
    }
    if (selectedCase && selectedCase.latitude !== null && selectedCase.longitude !== null) {
      return {
        latitude: selectedCase.latitude,
        longitude: selectedCase.longitude,
        label: selectedCase.title,
        isPerson: false,
      };
    }
    return null;
  }, [data?.markers, filters.personId, selectedCase]);

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted">{t('loadError')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted">{t('loading')}</p>
      </div>
    );
  }

  const showBanner = !bannerDismissed && (data.pendingCount > 0 || data.failedCount > 0);

  return (
    <div className="flex-1 flex flex-col">

      {showBanner && (
        <div className="flex items-center justify-between gap-4 px-4 py-2 bg-surface-elevated border-b border-border text-sm text-muted">
          <span>
            {data.pendingCount > 0 && t('pendingBanner', { count: data.pendingCount })}
            {data.pendingCount > 0 && data.failedCount > 0 && ' '}
            {data.failedCount > 0 && (
              <button
                type="button"
                onClick={() => setUnlocatedOpen(true)}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {t('failedBanner', { count: data.failedCount })}
              </button>
            )}
          </span>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-primary hover:text-primary-dark transition-colors"
          >
            {t('dismiss')}
          </button>
        </div>
      )}

      <div className="flex-1 relative min-h-[60vh]">
        {data.markers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <h2 className="text-lg font-semibold text-foreground mb-2">{t('emptyTitle')}</h2>
              <p className="text-muted">
                {data.geocodingEnabled ? t('emptyDescription') : t('emptyGeocodingDisabled')}
              </p>
            </div>
          </div>
        ) : (
          <>
            <MapView
              markers={visibleMarkers}
              focusId={focusId}
              focusRequest={focusRequest}
              filtersKey={`${filters.query}|${filters.groupId}|${filters.city}|${filters.region}|${filters.country}|${filters.caseId ?? ''}|${filters.personId ?? ''}|${filters.radiusKm ?? 0}|${filters.onlyWithinRadius ? '1' : ''}|${filters.activeCasesOnly ? '1' : ''}|${filters.showRuledOut === false ? '0' : ''}`}
              selectedCase={selectedCase}
              radiusCenter={radiusCenter}
              radiusKm={filters.radiusKm ?? 0}
              onSelectMarker={(marker) => {
                if (marker.source === 'event_address') {
                  handleFiltersChange({
                    ...filters,
                    caseId: marker.personId,
                    personId: '',
                    radiusKm: filters.radiusKm || 1,
                  });
                } else {
                  handleFiltersChange({
                    ...filters,
                    personId: marker.personId,
                    radiusKm: filters.radiusKm || 1,
                  });
                }
              }}
            />

            {/* Toggle button when Subject Roster Sidebar is collapsed */}
            {!rosterOpen && (
              <button
                type="button"
                onClick={() => setRosterOpen(true)}
                className="absolute top-3 left-3 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface/95 backdrop-blur border border-border shadow-md text-xs font-medium text-foreground hover:bg-surface-elevated transition-colors"
              >
                <span>📋 {t('rosterToggle')}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                  {visibleMarkers.length}
                </span>
                {filteredUnmappedSubjects.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">
                    +{filteredUnmappedSubjects.length}
                  </span>
                )}
                {hasActiveFilters && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary text-white font-semibold">
                    ⚙️
                  </span>
                )}
              </button>
            )}

            {/* Resizable / Dual-Pane Subject Roster Sidebar */}
            <TacticalSidebarContainer
              isOpen={rosterOpen}
              onClose={() => setRosterOpen(false)}
              title={t('rosterTitle')}
              rosterCount={visibleMarkers.length + filteredUnmappedSubjects.length}
              activeFilterCount={countActiveTacticalFilters(filters)}
              onClearFilters={() => handleFiltersChange({ ...DEFAULT_PERSON_FILTER_STATE, query: filters.query })}
              filtersOpen={filtersOpen}
              onToggleFilters={() => setFiltersOpen((prev) => !prev)}
              storageKeyPrefix="map-tactical-sidebar"
              searchBar={
                <input
                  type="search"
                  value={filters.query}
                  onChange={(e) => handleFiltersChange({ ...filters, query: e.target.value })}
                  placeholder={t('searchPlaceholder')}
                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label={t('searchPlaceholder')}
                />
              }
              quickChips={
                <TacticalQuickChips filters={filters} onChange={handleFiltersChange} />
              }
              activeBadges={
                <ActiveTacticalBadges
                  filters={filters}
                  onChange={handleFiltersChange}
                  cases={data.cases ?? []}
                  gangs={data.gangs ?? []}
                  groups={data.groups}
                />
              }
              filterDrawer={
                <TacticalFilterDrawer
                  filters={filters}
                  onChange={handleFiltersChange}
                  cases={data.cases ?? []}
                  gangs={data.gangs ?? []}
                  groups={data.groups}
                  cities={cities}
                  regions={regions}
                  countries={countries}
                  isGraphMode={false}
                />
              }
              rosterContent={
                <div className="divide-y divide-border/60 text-xs">
                  {/* Section 1: Located on Map */}
                  <div className="p-2.5">
                    <div className="flex items-center justify-between px-1.5 mb-1.5">
                      <span className="font-semibold text-muted">
                        📍 {t('rosterLocatedSection')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold text-[11px]">
                        {visibleMarkers.length}
                      </span>
                    </div>
                    {visibleMarkers.length === 0 ? (
                      <p className="px-1.5 py-2 text-muted italic">{t('noResults')}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {visibleMarkers.map((marker) => {
                          const isCrimeScene = marker.source === 'event_address';
                          if (isCrimeScene) {
                            return (
                              <div
                                key={marker.id}
                                className="rounded-xl hover:bg-surface-elevated transition-colors p-2 border border-border/50 bg-surface text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFocusRequest((prev) => ({
                                        id: marker.id,
                                        seq: (prev?.seq ?? 0) + 1,
                                      }));
                                      handleFiltersChange({
                                        ...filters,
                                        caseId: marker.personId,
                                        personId: '',
                                        radiusKm: filters.radiusKm || 1,
                                      });
                                    }}
                                    className="min-w-0 flex-1 text-left flex items-start gap-2 cursor-pointer group"
                                    title="Tâm điểm hiện trường"
                                  >
                                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 border border-white/60" />
                                    <div className="min-w-0 flex-1">
                                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                        {marker.personName}
                                      </div>
                                      {(marker.city || marker.addressText) && (
                                        <div className="text-[11px] text-muted truncate">
                                          {marker.addressText ?? marker.city}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                  <Link
                                    href={`/events/${marker.personId}`}
                                    className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-elevated transition-colors shrink-0"
                                    title="Xem vụ án"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </Link>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <TacticalPersonCard
                              key={marker.id}
                              id={marker.personId}
                              name={marker.personName}
                              hasPhoto={marker.hasPhoto}
                              color={marker.groupColor ?? '#3b82f6'}
                              tacticalData={marker}
                              subtitle={marker.addressText ?? marker.city}
                              onFocus={() => {
                                setFocusRequest((prev) => ({
                                  id: marker.id,
                                  seq: (prev?.seq ?? 0) + 1,
                                }));
                                handleFiltersChange({
                                  ...filters,
                                  personId: marker.personId,
                                  radiusKm: filters.radiusKm || 1,
                                });
                              }}
                              focusTitle="Định vị trên bản đồ"
                              detailsHref={`/people/${marker.personId}`}
                              detailsTitle="Xem hồ sơ"
                              gangs={data.gangs ?? []}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Unlocated Subjects */}
                  <div className="p-2.5 bg-amber-500/5">
                    <div className="flex items-center justify-between px-1.5 mb-1">
                      <span className="font-semibold text-amber-700 dark:text-amber-300">
                        ❓ {t('rosterUnlocatedSection')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                        {filteredUnmappedSubjects.length}
                      </span>
                    </div>
                    <p className="px-1.5 mb-2 text-[11px] text-muted">
                      {t('rosterUnlocatedHint')}
                    </p>
                    {filteredUnmappedSubjects.length === 0 ? (
                      <p className="px-1.5 py-1 text-[11px] text-muted italic">
                        {t('rosterUnlocatedEmpty')}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {filteredUnmappedSubjects.map((subj) => {
                          const activeCaseLink = filters.caseId
                            ? subj.caseLinks?.find((cl) => cl.eventId === filters.caseId)
                            : subj.caseLinks?.[0];
                          return (
                            <TacticalPersonCard
                              key={subj.personId}
                              id={subj.personId}
                              name={subj.personName}
                              hasPhoto={false}
                              color="#f59e0b"
                              tacticalData={subj}
                              subtitle={activeCaseLink?.role || activeCaseLink?.eventTitle || t('rosterAddCoordsLink')}
                              detailsHref={`/people/${subj.personId}`}
                              detailsTitle="Xem hồ sơ"
                              gangs={data.gangs ?? []}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              }
            />

            {visibleMarkers.length === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-8 pointer-events-none">
                <p
                  className="px-4 py-2 rounded-lg bg-surface border border-border text-muted shadow"
                  role="status"
                >
                  {t('noResults')}
                </p>
              </div>
            )}
          </>
        )}

        {unlocatedOpen && data.unlocatedPeople.length > 0 && (
          <div
            className="absolute inset-y-0 right-0 z-20 w-full max-w-sm bg-surface border-l border-border shadow-lg flex flex-col"
            role="dialog"
            aria-label={t('unlocatedTitle')}
          >
            <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{t('unlocatedTitle')}</h2>
              <button
                type="button"
                onClick={() => setUnlocatedOpen(false)}
                aria-label={tCommon('close')}
                className="text-muted hover:text-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="px-4 pt-3 text-sm text-muted">{t('unlocatedHint')}</p>
            <ul className="flex-1 overflow-y-auto p-2">
              {data.unlocatedPeople.map((person) => (
                <li key={person.personId}>
                  <Link
                    href={`/people/${person.personId}`}
                    className="block px-3 py-2 rounded-lg text-foreground hover:bg-surface-elevated transition-colors"
                  >
                    {person.personName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MapPageClient() {
  return (
    <Suspense fallback={null}>
      <MapPageInner />
    </Suspense>
  );
}
