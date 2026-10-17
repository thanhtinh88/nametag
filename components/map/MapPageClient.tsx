'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MapMarkersResponse, UnmappedSubject } from '@/lib/map/types';
import { filterMarkers, type MapFilterState } from '@/lib/map/filter-markers';
import MapFilters from './MapFilters';

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

  const filters: MapFilterState = useMemo(
    () => ({
      query: searchParams.get('q') ?? '',
      groupId: searchParams.get('group') ?? '',
      city: searchParams.get('city') ?? '',
      region: searchParams.get('region') ?? '',
      country: searchParams.get('country') ?? '',
      caseId: searchParams.get('case') ?? '',
      radiusKm: Number(searchParams.get('radius') ?? '0') || 0,
      onlyWithinRadius: searchParams.get('within') === '1',
      activeCasesOnly: searchParams.get('activeCases') === '1',
      showRuledOut: searchParams.get('ruledOut') !== '0',
    }),
    [searchParams]
  );
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
      if (next.radiusKm && next.radiusKm > 0) params.set('radius', String(next.radiusKm));
      if (next.onlyWithinRadius) params.set('within', '1');
      if (next.activeCasesOnly) params.set('activeCases', '1');
      if (next.showRuledOut === false) params.set('ruledOut', '0');
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
      if (filters.groupId && !subj.groupIds.includes(filters.groupId)) {
        return false;
      }
      if (filters.caseId) {
        const link = subj.caseLinks?.find((cl) => cl.eventId === filters.caseId);
        if (!link) return false;
        if (filters.showRuledOut === false && link.verificationStatus === 'RULED_OUT') {
          return false;
        }
      } else if (filters.showRuledOut === false && subj.caseLinks && subj.caseLinks.length > 0) {
        const allRuledOut = subj.caseLinks.every((cl) => cl.verificationStatus === 'RULED_OUT');
        if (allRuledOut) return false;
      }
      return true;
    });
  }, [data, filters]);

  const selectedCase = useMemo(
    () =>
      filters.caseId && data?.cases
        ? data.cases.find((c) => c.id === filters.caseId) ?? null
        : null,
    [data, filters.caseId]
  );

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
      <MapFilters
        filters={filters}
        resultCount={visibleMarkers.length}
        markers={data.markers}
        groups={data.groups}
        cases={data.cases ?? []}
        onChange={handleFiltersChange}
      />

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
              filtersKey={`${filters.query}|${filters.groupId}|${filters.city}|${filters.region}|${filters.country}|${filters.caseId ?? ''}|${filters.radiusKm ?? 0}|${filters.onlyWithinRadius ? '1' : ''}|${filters.activeCasesOnly ? '1' : ''}|${filters.showRuledOut === false ? '0' : ''}`}
              selectedCase={selectedCase}
              radiusKm={filters.radiusKm ?? 0}
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
              </button>
            )}

            {/* Collapsible Subject Roster Sidebar */}
            {rosterOpen && (
              <aside
                className="absolute top-3 left-3 bottom-3 z-20 w-72 sm:w-80 bg-surface/95 backdrop-blur border border-border rounded-xl shadow-lg flex flex-col overflow-hidden"
                aria-label={t('rosterTitle')}
              >
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-border bg-surface-elevated/60">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    📋 {t('rosterTitle')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setRosterOpen(false)}
                    aria-label={tCommon('close')}
                    className="p-1 rounded text-muted hover:text-foreground hover:bg-surface transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border/60 text-xs">
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
                      <ul className="space-y-1">
                        {visibleMarkers.map((marker) => {
                          const isCrimeScene = marker.source === 'event_address';
                          return (
                            <li key={marker.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  setFocusRequest((prev) => ({
                                    id: marker.id,
                                    seq: (prev?.seq ?? 0) + 1,
                                  }))
                                }
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-elevated transition-colors flex items-start gap-2 group"
                              >
                                <span
                                  className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 border border-white/60"
                                  style={{
                                    backgroundColor: isCrimeScene
                                      ? '#ef4444'
                                      : marker.groupColor ?? '#3b82f6',
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                    {marker.personName}
                                  </div>
                                  {(marker.city || marker.addressText) && (
                                    <div className="text-[11px] text-muted truncate">
                                      {marker.addressText ?? marker.city}
                                    </div>
                                  )}
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
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
                      <ul className="space-y-1">
                        {filteredUnmappedSubjects.map((subj) => {
                          const activeCaseLink = filters.caseId
                            ? subj.caseLinks?.find((cl) => cl.eventId === filters.caseId)
                            : subj.caseLinks?.[0];
                          return (
                            <li key={subj.personId}>
                              <Link
                                href={`/people/${subj.personId}`}
                                className="block px-2.5 py-1.5 rounded-lg border border-amber-500/25 bg-surface hover:bg-surface-elevated transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-foreground truncate">
                                    {subj.personName}
                                  </span>
                                  <span className="text-[10px] text-primary shrink-0 hover:underline">
                                    {t('rosterAddCoordsLink')}
                                  </span>
                                </div>
                                {activeCaseLink && (
                                  <div className="text-[11px] text-muted truncate mt-0.5">
                                    {activeCaseLink.role || activeCaseLink.eventTitle}
                                  </div>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </aside>
            )}

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
