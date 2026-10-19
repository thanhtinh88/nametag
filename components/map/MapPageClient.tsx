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
  haversineDistanceKm,
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
import TacticalSectionExpander from '@/components/filters/TacticalSectionExpander';
import QuickLinkCasePopover from './QuickLinkCasePopover';

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
  const [casesExpanded, setCasesExpanded] = useState<boolean>(true);
  const [subjectsExpanded, setSubjectsExpanded] = useState<boolean>(true);
  const [linkingTarget, setLinkingTarget] = useState<{
    personId: string;
    personName: string;
    distanceText?: string | null;
  } | null>(null);
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
  const [inspectedPersonId, setInspectedPersonId] = useState<string | null>(null);
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(null);

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
      if (next.caseId !== filters.caseId) {
        setInspectedPersonId(null);
        setHighlightedPersonId(null);
      }
      // When a case is actively selected, personId must not restrict the case's subjects
      if (next.caseId) {
        next.personId = '';
      }
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
    [router, filters.caseId]
  );

  const visibleMarkers = useMemo(
    () => (data ? filterMarkers(data.markers, { ...filters, inspectedPersonId }) : []),
    [data, filters, inspectedPersonId]
  );

  const filteredCases = useMemo(() => {
    if (!data?.cases) return [];
    let list = data.cases;
    if (filters.activeCasesOnly) {
      list = list.filter((c) => c.status === 'PLANNED' || c.status === 'ONGOING');
    }
    const needle = filters.query.trim().toLowerCase();
    if (needle) {
      list = list.filter((c) => c.title.toLowerCase().includes(needle));
    }
    return list;
  }, [data?.cases, filters.activeCasesOnly, filters.query]);

  const casesWithCoords = useMemo(
    () => filteredCases.filter((c) => c.latitude !== null && c.longitude !== null),
    [filteredCases]
  );

  const casesWithoutCoords = useMemo(
    () => filteredCases.filter((c) => c.latitude === null || c.longitude === null),
    [filteredCases]
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

  const isCaseFocused = Boolean(selectedCase);

  const allScreenedMarkers = useMemo(() => {
    if (!data) return [];
    return filterMarkers(data.markers, {
      ...filters,
      caseId: undefined,
      onlyWithinRadius: false,
    }).filter((m) => m.source !== 'event_address');
  }, [data, filters]);

  const allScreenedUnmapped = useMemo<UnmappedSubject[]>(() => {
    if (!data?.unmappedSubjects) return [];
    const needle = filters.query.trim().toLowerCase();
    const filtersWithoutCase = { ...filters, caseId: undefined };
    return data.unmappedSubjects.filter((subj) => {
      if (needle && !subj.personName.toLowerCase().includes(needle)) {
        return false;
      }
      return matchesPersonTacticalFilters(subj, filtersWithoutCase);
    });
  }, [data, filters]);

  const standardMappedSubjects = useMemo(
    () => visibleMarkers.filter((m) => m.source !== 'event_address'),
    [visibleMarkers]
  );

  const linkedMappedSubjects = useMemo(() => {
    if (!selectedCase) return [];
    return allScreenedMarkers.filter((m) =>
      m.caseLinks?.some((cl) => cl.eventId === selectedCase.id)
    );
  }, [allScreenedMarkers, selectedCase]);

  const linkedUnmappedSubjects = useMemo(() => {
    if (!selectedCase) return [];
    return allScreenedUnmapped.filter((s) =>
      s.caseLinks?.some((cl) => cl.eventId === selectedCase.id)
    );
  }, [allScreenedUnmapped, selectedCase]);

  const otherMappedSubjects = useMemo(() => {
    if (!selectedCase) return [];
    const candidates = allScreenedMarkers.filter(
      (m) => !m.caseLinks?.some((cl) => cl.eventId === selectedCase.id)
    );

    const withDist = candidates.map((m) => {
      let distanceKm: number | null = null;
      if (
        selectedCase.latitude !== null &&
        selectedCase.longitude !== null &&
        m.latitude !== null &&
        m.longitude !== null
      ) {
        distanceKm = haversineDistanceKm(
          selectedCase.latitude,
          selectedCase.longitude,
          m.latitude,
          m.longitude
        );
      }
      return { marker: m, distanceKm };
    });

    withDist.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return a.marker.personName.localeCompare(b.marker.personName);
    });

    if (filters.onlyWithinRadius && (filters.radiusKm ?? 0) > 0) {
      return withDist.filter(
        (item) => item.distanceKm !== null && item.distanceKm <= (filters.radiusKm ?? 0)
      );
    }

    return withDist;
  }, [allScreenedMarkers, selectedCase, filters.onlyWithinRadius, filters.radiusKm]);

  const otherUnmappedSubjects = useMemo(() => {
    if (!selectedCase) return [];
    return allScreenedUnmapped.filter(
      (s) => !s.caseLinks?.some((cl) => cl.eventId === selectedCase.id)
    );
  }, [allScreenedUnmapped, selectedCase]);

  const rosterSubjectsCount = isCaseFocused
    ? linkedMappedSubjects.length +
      linkedUnmappedSubjects.length +
      otherMappedSubjects.length +
      otherUnmappedSubjects.length
    : standardMappedSubjects.length + filteredUnmappedSubjects.length;

  const rosterTotalCount = filteredCases.length + rosterSubjectsCount;

  const handlePersonLinked = useCallback(
    (linkData: {
      personId: string;
      involvementType: string;
      verificationStatus: string;
      role?: string;
    }) => {
      if (!selectedCase) return;
      const newLink = {
        eventId: selectedCase.id,
        eventTitle: selectedCase.title,
        eventStatus: selectedCase.status,
        role: linkData.role || linkData.involvementType,
        involvementType: linkData.involvementType,
        verificationStatus: linkData.verificationStatus,
        confidence: null,
      };

      setData((prev) => {
        if (!prev) return prev;
        const updatedMarkers = prev.markers.map((m) => {
          if (m.personId === linkData.personId) {
            const caseLinks = m.caseLinks ? [...m.caseLinks] : [];
            const existingIdx = caseLinks.findIndex((cl) => cl.eventId === selectedCase.id);
            if (existingIdx >= 0) {
              caseLinks[existingIdx] = newLink;
            } else {
              caseLinks.push(newLink);
            }
            return {
              ...m,
              caseLinks,
            };
          }
          return m;
        });

        const updatedUnmapped = (prev.unmappedSubjects ?? []).map((s) => {
          if (s.personId === linkData.personId) {
            const caseLinks = s.caseLinks ? [...s.caseLinks] : [];
            const existingIdx = caseLinks.findIndex((cl) => cl.eventId === selectedCase.id);
            if (existingIdx >= 0) {
              caseLinks[existingIdx] = newLink;
            } else {
              caseLinks.push(newLink);
            }
            return {
              ...s,
              caseLinks,
            };
          }
          return s;
        });

        return {
          ...prev,
          markers: updatedMarkers,
          unmappedSubjects: updatedUnmapped,
        };
      });

      setLinkingTarget(null);
      setInspectedPersonId((prev) => (prev === linkData.personId ? null : prev));
    },
    [selectedCase]
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

  const renderCaseItem = (c: (typeof filteredCases)[number]) => {
    const isSelected = filters.caseId === c.id;
    return (
      <div
        key={c.id}
        className={`rounded-xl transition-all p-2 border text-xs ${
          isSelected
            ? 'bg-primary/10 border-primary ring-1 ring-primary/40'
            : 'bg-surface hover:bg-surface-elevated border-border/50'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              handleFiltersChange({
                ...filters,
                caseId: isSelected ? '' : c.id,
                personId: '',
              });
            }}
            className="min-w-0 flex-1 text-left flex items-start gap-2 cursor-pointer group"
            title={isSelected ? 'Bỏ chọn vụ án' : 'Lọc đối tượng theo vụ án'}
          >
            <span
              className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 border ${
                isSelected
                  ? 'bg-primary border-primary'
                  : 'bg-amber-500 border-amber-600/40'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div
                className={`font-semibold transition-colors truncate ${
                  isSelected
                    ? 'text-primary'
                    : 'text-foreground group-hover:text-primary'
                }`}
              >
                {c.title}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted">
                <span className="px-1 py-0.2 rounded bg-surface-elevated border border-border/60">
                  {c.status}
                </span>
                {c.latitude !== null && c.longitude !== null ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    📍 Đã định vị
                  </span>
                ) : (
                  <span className="text-muted">
                    Chưa có GPS
                  </span>
                )}
              </div>
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                handleFiltersChange({
                  ...filters,
                  caseId: isSelected ? '' : c.id,
                  personId: '',
                });
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                isSelected
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-elevated hover:bg-primary/15 text-muted hover:text-primary border border-border/50'
              }`}
              title={isSelected ? 'Đang lọc vụ án (nhấp để bỏ lọc)' : 'Lọc theo vụ án'}
            >
              {isSelected ? '✓ Đang chọn' : 'Chọn'}
            </button>
            <Link
              href={`/events/${c.id}`}
              className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
              title="Xem chi tiết hồ sơ vụ án"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  };

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
              filtersKey={`${filters.query}|${filters.groupId}|${filters.city}|${filters.region}|${filters.country}|${filters.caseId ?? ''}|${filters.personId ?? ''}|${filters.radiusKm ?? 0}|${filters.onlyWithinRadius ? '1' : ''}|${filters.activeCasesOnly ? '1' : ''}|${filters.showRuledOut === false ? '0' : ''}|${inspectedPersonId ?? ''}`}
              selectedCase={selectedCase}
              radiusCenter={radiusCenter}
              radiusKm={filters.radiusKm ?? 0}
              inspectedPersonId={inspectedPersonId}
              onSelectMarker={(marker) => {
                if (marker.source === 'event_address') {
                  if (filters.caseId !== marker.personId) {
                    handleFiltersChange({
                      ...filters,
                      caseId: marker.personId,
                      personId: '',
                      radiusKm: filters.radiusKm || 1,
                    });
                  }
                } else {
                  setHighlightedPersonId(marker.personId);
                  if (selectedCase && !marker.caseLinks?.some((cl) => cl.eventId === selectedCase.id)) {
                    setInspectedPersonId(marker.personId);
                  }
                  setRosterOpen(true);
                  setSubjectsExpanded(true);
                  setTimeout(() => {
                    const el = document.getElementById(`person-card-${marker.personId}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 60);
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
              rosterCount={rosterTotalCount}
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
                  {/* Section 1: Cases (Topmost) */}
                  {filteredCases.length > 0 && (
                    <TacticalSectionExpander
                      title={t('rosterCasesTitle')}
                      icon="📁"
                      count={filteredCases.length}
                      isExpanded={casesExpanded}
                      onToggle={() => setCasesExpanded((prev) => !prev)}
                      badgeColor="bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      emptyMessage={t('noResults')}
                    >
                      <div className="space-y-1.5">
                        {casesWithCoords.map((c) => renderCaseItem(c))}

                        {casesWithoutCoords.length > 0 && (
                          <div className="pt-2 pb-1 border-t border-border/50">
                            <div className="flex items-center gap-1.5 px-1 py-1 text-[11px] font-semibold text-muted">
                              <span>❓</span>
                              <span>{t('withoutCoordsSection')}</span>
                              <span className="px-1.5 py-0.2 rounded-full bg-surface-elevated text-[10px] border border-border">
                                {casesWithoutCoords.length}
                              </span>
                            </div>
                            <div className="mt-1 space-y-1.5">
                              {casesWithoutCoords.map((c) => renderCaseItem(c))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TacticalSectionExpander>
                  )}

                  {/* Section 2: Subjects */}
                  <TacticalSectionExpander
                    title={t('rosterSubjectsTitle')}
                    icon="👤"
                    count={rosterSubjectsCount}
                    isExpanded={subjectsExpanded}
                    onToggle={() => setSubjectsExpanded((prev) => !prev)}
                    badgeColor="bg-primary/15 text-primary"
                    emptyMessage={t('noResults')}
                  >
                    {isCaseFocused ? (
                      <div className="space-y-3">
                        {/* Nhóm 1: Đối tượng trong vụ án */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-1 py-1 text-[11px] font-semibold text-foreground">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              {t('linkedSubjectsSection')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-bold">
                              {linkedMappedSubjects.length + linkedUnmappedSubjects.length}
                            </span>
                          </div>

                          {linkedMappedSubjects.length === 0 && linkedUnmappedSubjects.length === 0 ? (
                            <p className="px-2 py-2 text-muted text-[11px] italic bg-surface-elevated/40 rounded-lg border border-dashed border-border/60">
                              Chưa có đối tượng nào được gắn vào vụ án này. Bạn có thể chọn đối tượng từ danh sách soát xét bên dưới để đưa vào vụ án.
                            </p>
                          ) : (
                            <>
                              {linkedMappedSubjects.map((marker) => {
                                const activeCaseLink = marker.caseLinks?.find((cl) => cl.eventId === selectedCase!.id);
                                const isHighlighted = highlightedPersonId === marker.personId;
                                return (
                                  <div
                                    key={marker.id}
                                    id={`person-card-${marker.personId}`}
                                    className={`rounded-xl transition-all ${
                                      isHighlighted
                                        ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                                        : ''
                                    }`}
                                  >
                                    <TacticalPersonCard
                                      id={marker.personId}
                                      name={marker.personName}
                                      hasPhoto={marker.hasPhoto}
                                      color={marker.groupColor ?? '#3b82f6'}
                                      tacticalData={marker}
                                      subtitle={
                                        activeCaseLink?.role ||
                                        activeCaseLink?.involvementType ||
                                        (marker.addressText ?? marker.city)
                                      }
                                      onFocus={() => {
                                        setHighlightedPersonId(marker.personId);
                                        setFocusRequest((prev) => ({
                                          id: marker.id,
                                          seq: (prev?.seq ?? 0) + 1,
                                        }));
                                      }}
                                      focusTitle="Định vị trên bản đồ"
                                      detailsHref={`/people/${marker.personId}`}
                                      detailsTitle="Xem hồ sơ"
                                      gangs={data.gangs ?? []}
                                    />
                                  </div>
                                );
                              })}

                              {linkedUnmappedSubjects.length > 0 && (
                                <div className="pt-2 border-t border-border/50 space-y-1.5">
                                  <div className="flex items-center gap-1.5 px-1 py-1 text-[11px] font-semibold text-muted">
                                    <span>❓</span>
                                    <span>{t('withoutCoordsSection')}</span>
                                    <span className="px-1.5 py-0.2 rounded-full bg-surface-elevated text-[10px] border border-border">
                                      {linkedUnmappedSubjects.length}
                                    </span>
                                  </div>
                                  {linkedUnmappedSubjects.map((subj) => {
                                    const activeCaseLink = subj.caseLinks?.find((cl) => cl.eventId === selectedCase!.id);
                                    const isHighlighted = highlightedPersonId === subj.personId;
                                    return (
                                      <div
                                        key={subj.personId}
                                        id={`person-card-${subj.personId}`}
                                        className={`rounded-xl transition-all ${
                                          isHighlighted
                                            ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                                            : ''
                                        }`}
                                      >
                                        <TacticalPersonCard
                                          id={subj.personId}
                                          name={subj.personName}
                                          hasPhoto={false}
                                          color="#f59e0b"
                                          tacticalData={subj}
                                          subtitle={
                                            activeCaseLink?.role ||
                                            activeCaseLink?.involvementType ||
                                            t('rosterAddCoordsLink')
                                          }
                                          detailsHref={`/people/${subj.personId}`}
                                          detailsTitle="Xem hồ sơ"
                                          gangs={data.gangs ?? []}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Nhóm 2: Đối tượng khác trong diện soát xét */}
                        <div className="pt-3 border-t border-border/70 space-y-2">
                          <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-foreground">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              {t('otherSubjectsSection')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full bg-surface-elevated text-muted text-[10px] border border-border">
                              {otherMappedSubjects.length + otherUnmappedSubjects.length}
                            </span>
                          </div>

                          {/* Radius controls if selected case has coords */}
                          {selectedCase!.latitude !== null && selectedCase!.longitude !== null && (
                            <div className="p-2 rounded-xl bg-surface-elevated/70 border border-border/60 space-y-2 text-[11px]">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-xs font-medium text-foreground">
                                  {t('radiusFilterLabel')}
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-muted hover:text-foreground">
                                  <input
                                    type="checkbox"
                                    checked={filters.onlyWithinRadius}
                                    onChange={(e) =>
                                      handleFiltersChange({
                                        ...filters,
                                        onlyWithinRadius: e.target.checked,
                                        radiusKm: filters.radiusKm || 1,
                                      })
                                    }
                                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                                  />
                                  <span>{t('withinRadiusOnly')}</span>
                                </label>
                              </div>

                              {/* Quick Radius Chips */}
                              <div className="flex items-center gap-1 flex-wrap">
                                {[
                                  { label: 'Tất cả', km: 0 },
                                  { label: '500m', km: 0.5 },
                                  { label: '1km', km: 1 },
                                  { label: '2km', km: 2 },
                                  { label: '5km', km: 5 },
                                  { label: '10km', km: 10 },
                                  { label: '20km', km: 20 },
                                  { label: '50km', km: 50 },
                                ].map((chip) => {
                                  const isActive =
                                    chip.km === 0
                                      ? !filters.onlyWithinRadius || filters.radiusKm === 0
                                      : filters.onlyWithinRadius && filters.radiusKm === chip.km;
                                  return (
                                    <button
                                      key={chip.km}
                                      type="button"
                                      onClick={() =>
                                        handleFiltersChange({
                                          ...filters,
                                          radiusKm: chip.km,
                                          onlyWithinRadius: chip.km > 0,
                                        })
                                      }
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                                        isActive
                                          ? 'bg-primary text-white shadow-sm'
                                          : 'bg-surface hover:bg-surface-elevated text-muted hover:text-foreground border border-border/50'
                                      }`}
                                    >
                                      {chip.label}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Slider */}
                              <div className="flex items-center gap-2 pt-0.5">
                                <input
                                  type="range"
                                  min="0"
                                  max="50"
                                  step="0.5"
                                  value={filters.radiusKm || 0}
                                  onChange={(e) => {
                                    const km = parseFloat(e.target.value);
                                    handleFiltersChange({
                                      ...filters,
                                      radiusKm: km,
                                      onlyWithinRadius: km > 0,
                                    });
                                  }}
                                  className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <span className="text-[11px] font-mono text-muted shrink-0 w-12 text-right">
                                  {(filters.radiusKm || 0) > 0 ? `${filters.radiusKm} km` : '0 km'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Other mapped subjects */}
                          <div className="space-y-1.5">
                            {otherMappedSubjects.length === 0 && otherUnmappedSubjects.length === 0 ? (
                              <p className="px-2 py-2 text-muted text-[11px] italic">
                                Không có đối tượng nào khác khớp bộ lọc.
                              </p>
                            ) : (
                              otherMappedSubjects.map(({ marker, distanceKm }) => {
                                const distText =
                                  distanceKm !== null ? `${distanceKm.toFixed(2)} km` : null;
                                const isInspected = inspectedPersonId === marker.personId;
                                return (
                                  <div
                                    key={marker.id}
                                    id={`person-card-${marker.personId}`}
                                    className={`rounded-xl transition-all ${
                                      isInspected || highlightedPersonId === marker.personId
                                        ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                                        : ''
                                    }`}
                                  >
                                    <TacticalPersonCard
                                      id={marker.personId}
                                      name={marker.personName}
                                      hasPhoto={marker.hasPhoto}
                                      color={isInspected ? '#2563eb' : (marker.groupColor ?? '#64748b')}
                                      tacticalData={marker}
                                      subtitle={
                                        distText
                                          ? t('distanceKmFromScene', { km: distanceKm!.toFixed(2) })
                                          : marker.addressText ?? marker.city
                                      }
                                      onFocus={() => {
                                        setInspectedPersonId((prev) =>
                                          prev === marker.personId ? null : marker.personId
                                        );
                                      }}
                                      focusTitle={isInspected ? 'Đang soát xét trên bản đồ (nhấn để tắt)' : 'Soát xét trên bản đồ'}
                                      detailsHref={`/people/${marker.personId}`}
                                      detailsTitle="Xem hồ sơ"
                                      gangs={data.gangs ?? []}
                                      extraActions={
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setInspectedPersonId((prev) =>
                                                prev === marker.personId ? null : marker.personId
                                              );
                                            }}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors whitespace-nowrap shadow-2xs ${
                                              isInspected
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-surface hover:bg-surface-elevated text-foreground border border-border'
                                            }`}
                                            title={
                                              isInspected
                                                ? 'Đang soát xét trên bản đồ (nhấn để tắt)'
                                                : 'Bật/tắt hiển thị đối tượng này trên bản đồ cùng vụ án'
                                            }
                                          >
                                            <span>👁️</span>
                                            <span>{isInspected ? 'Đang xem' : 'Soát xét'}</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setLinkingTarget({
                                                personId: marker.personId,
                                                personName: marker.personName,
                                                distanceText: distText,
                                              });
                                            }}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors whitespace-nowrap shadow-2xs"
                                            title={t('quickLinkBtn')}
                                          >
                                            <span>➕</span>
                                            <span>Vào vụ án</span>
                                          </button>
                                        </div>
                                      }
                                    />
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Other unmapped subjects */}
                          {otherUnmappedSubjects.length > 0 && (
                            <div className="pt-2 border-t border-border/50 space-y-1.5">
                              <div className="flex items-center gap-1.5 px-1 py-1 text-[11px] font-semibold text-muted">
                                <span>❓</span>
                                <span>{t('withoutCoordsSection')}</span>
                                <span className="px-1.5 py-0.2 rounded-full bg-surface-elevated text-[10px] border border-border">
                                  {otherUnmappedSubjects.length}
                                </span>
                              </div>
                              {otherUnmappedSubjects.map((subj) => {
                                const isHighlighted = highlightedPersonId === subj.personId;
                                return (
                                  <div
                                    key={subj.personId}
                                    id={`person-card-${subj.personId}`}
                                    className={`rounded-xl transition-all ${
                                      isHighlighted
                                        ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                                        : ''
                                    }`}
                                  >
                                    <TacticalPersonCard
                                      id={subj.personId}
                                      name={subj.personName}
                                      hasPhoto={false}
                                      color="#94a3b8"
                                      tacticalData={subj}
                                      subtitle={t('rosterAddCoordsLink')}
                                      detailsHref={`/people/${subj.personId}`}
                                      detailsTitle="Xem hồ sơ"
                                      gangs={data.gangs ?? []}
                                      extraActions={
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLinkingTarget({
                                              personId: subj.personId,
                                              personName: subj.personName,
                                              distanceText: null,
                                            });
                                          }}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors whitespace-nowrap shadow-2xs"
                                          title={t('quickLinkBtn')}
                                        >
                                          <span>➕</span>
                                          <span>Vào vụ án</span>
                                        </button>
                                      }
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {standardMappedSubjects.map((marker) => {
                          const isHighlighted = highlightedPersonId === marker.personId;
                          return (
                            <div
                              key={marker.id}
                              id={`person-card-${marker.personId}`}
                              className={`rounded-xl transition-all ${
                                isHighlighted
                                  ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                                  : ''
                              }`}
                            >
                              <TacticalPersonCard
                                id={marker.personId}
                                name={marker.personName}
                                hasPhoto={marker.hasPhoto}
                                color={marker.groupColor ?? '#3b82f6'}
                                tacticalData={marker}
                                subtitle={marker.addressText ?? marker.city}
                                onFocus={() => {
                                  setHighlightedPersonId(marker.personId);
                                  setFocusRequest((prev) => ({
                                    id: marker.id,
                                    seq: (prev?.seq ?? 0) + 1,
                                  }));
                                }}
                                focusTitle="Định vị trên bản đồ"
                                detailsHref={`/people/${marker.personId}`}
                                detailsTitle="Xem hồ sơ"
                                gangs={data.gangs ?? []}
                              />
                            </div>
                          );
                        })}

                        {filteredUnmappedSubjects.length > 0 && (
                          <div className="pt-2 border-t border-border/50 space-y-1.5">
                            <div className="flex items-center gap-1.5 px-1 py-1 text-[11px] font-semibold text-muted">
                              <span>❓</span>
                              <span>{t('withoutCoordsSection')}</span>
                              <span className="px-1.5 py-0.2 rounded-full bg-surface-elevated text-[10px] border border-border">
                                {filteredUnmappedSubjects.length}
                              </span>
                            </div>
                            <p className="px-1.5 text-[11px] text-muted">
                              {t('rosterUnlocatedHint')}
                            </p>
                            {filteredUnmappedSubjects.map((subj) => {
                              const activeCaseLink = subj.caseLinks?.[0];
                              const isHighlighted = highlightedPersonId === subj.personId;
                              return (
                                <div
                                  key={subj.personId}
                                  id={`person-card-${subj.personId}`}
                                  className={`rounded-xl transition-all ${
                                    isHighlighted
                                      ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                                      : ''
                                  }`}
                                >
                                  <TacticalPersonCard
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
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </TacticalSectionExpander>
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

        {linkingTarget && selectedCase && (
          <QuickLinkCasePopover
            isOpen={Boolean(linkingTarget)}
            onClose={() => setLinkingTarget(null)}
            personId={linkingTarget.personId}
            personName={linkingTarget.personName}
            caseId={selectedCase.id}
            caseTitle={selectedCase.title}
            distanceText={linkingTarget.distanceText}
            onLinked={handlePersonLinked}
          />
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
