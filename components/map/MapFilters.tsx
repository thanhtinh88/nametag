'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MapCase, MapGroup, MapMarker } from '@/lib/map/types';
import { distinctCities, distinctCountries, distinctRegions, type MapFilterState } from '@/lib/map/filter-markers';
import { getCountryName } from '@/lib/countries';

interface MapFiltersProps {
  filters: MapFilterState;
  markers: MapMarker[];
  groups: MapGroup[];
  cases?: MapCase[];
  /** Number of markers matching the active filters */
  resultCount: number;
  onChange: (next: MapFilterState) => void;
}

export default function MapFilters({
  filters,
  markers,
  groups,
  cases = [],
  resultCount: _resultCount,
  onChange,
}: MapFiltersProps) {
  const t = useTranslations('map');
  const [open, setOpen] = useState(false);
  const cities = distinctCities(markers);
  const regions = distinctRegions(markers);
  const countries = distinctCountries(markers);

  const uniquePersons = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ personId: string; personName: string }> = [];
    for (const m of markers) {
      if (m.source !== 'event_address' && !seen.has(m.personId)) {
        seen.add(m.personId);
        list.push({ personId: m.personId, personName: m.personName });
      }
    }
    return list.sort((a, b) => a.personName.localeCompare(b.personName));
  }, [markers]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.groupId) count++;
    if (filters.city || filters.region || filters.country) count++;
    if (filters.caseId) count++;
    if (filters.personId) count++;
    if (filters.radiusKm && filters.radiusKm > 0) count++;
    if (filters.onlyWithinRadius) count++;
    if (filters.activeCasesOnly) count++;
    if (filters.showRuledOut === false) count++;
    return count;
  }, [filters]);

  const selectClasses =
    'w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  const handleClear = () => {
    onChange({
      query: '',
      groupId: '',
      city: '',
      region: '',
      country: '',
      caseId: '',
      personId: '',
      radiusKm: 0,
      onlyWithinRadius: false,
      activeCasesOnly: false,
      showRuledOut: true,
    });
  };

  return (
    <div className="border-b border-border/60 bg-surface/30">
      {/* Search Input at Top of Sidebar */}
      <div className="p-2 border-b border-border/60">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder={t('searchPlaceholder')}
          className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label={t('searchPlaceholder')}
        />
      </div>

      {/* Filter Drawer Toggle & Reset Button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-elevated/40 border-b border-border/60">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors text-xs"
        >
          <span>⚙️ {t('filterTitle')}</span>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-bold">
              {activeFiltersCount}
            </span>
          )}
          <svg
            className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-muted hover:text-red-500 transition-colors"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>

      {/* Collapsible Filter Panel */}
      {open && (
        <div className="p-2.5 space-y-2 border-b border-border/60 max-h-72 overflow-y-auto text-xs">
          {cases.length > 0 && (
            <div className="space-y-1">
              <label className="font-semibold text-muted text-[11px] block">{t('allCases')}</label>
              <select
                value={filters.caseId ?? ''}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    caseId: e.target.value,
                    radiusKm: e.target.value ? (filters.radiusKm || 1) : (filters.personId ? filters.radiusKm : 0),
                  })
                }
                className={selectClasses}
                aria-label={t('allCases')}
              >
                <option value="">{t('allCases')}</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    🚨 {c.title} ({c.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {uniquePersons.length > 0 && (
            <div className="space-y-1">
              <label className="font-semibold text-muted text-[11px] block">{t('allPersons')}</label>
              <select
                value={filters.personId ?? ''}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    personId: e.target.value,
                    radiusKm: e.target.value ? (filters.radiusKm || 1) : (filters.caseId ? filters.radiusKm : 0),
                  })
                }
                className={selectClasses}
                aria-label={t('allPersons')}
              >
                <option value="">{t('allPersons')}</option>
                {uniquePersons.map((p) => (
                  <option key={p.personId} value={p.personId}>
                    👤 {p.personName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(filters.caseId || filters.personId) && (
            <div className="space-y-1">
              <label className="font-semibold text-muted text-[11px] block">{t('radiusKm', { km: filters.radiusKm ?? 1 })}</label>
              <select
                value={String(filters.radiusKm ?? 1)}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    radiusKm: Number(e.target.value),
                  })
                }
                className={selectClasses}
                aria-label={t('radiusOff')}
              >
                <option value="0">{t('radiusOff')}</option>
                <option value="0.5">{t('radius500m')}</option>
                <option value="1">{t('radiusKm', { km: 1 })}</option>
                <option value="2">{t('radiusKm', { km: 2 })}</option>
                <option value="5">{t('radiusKm', { km: 5 })}</option>
                <option value="10">{t('radiusKm', { km: 10 })}</option>
              </select>
            </div>
          )}

          {groups.length > 0 && (
            <div className="space-y-1">
              <label className="font-semibold text-muted text-[11px] block">{t('allGroups')}</label>
              <select
                value={filters.groupId}
                onChange={(e) => onChange({ ...filters, groupId: e.target.value })}
                className={selectClasses}
                aria-label={t('allGroups')}
              >
                <option value="">{t('allGroups')}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {cities.length > 0 && (
            <div className="space-y-1">
              <label className="font-semibold text-muted text-[11px] block">{t('allCities')}</label>
              <select
                value={filters.city}
                onChange={(e) => onChange({ ...filters, city: e.target.value, region: '', country: '' })}
                className={selectClasses}
                aria-label={t('allCities')}
              >
                <option value="">{t('allCities')}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          )}

          {regions.length > 0 && (
            <div className="space-y-1">
              <label className="font-semibold text-muted text-[11px] block">{t('allRegions')}</label>
              <select
                value={filters.region}
                onChange={(e) => onChange({ ...filters, region: e.target.value, city: '', country: '' })}
                className={selectClasses}
                aria-label={t('allRegions')}
              >
                <option value="">{t('allRegions')}</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          )}

          {countries.length > 0 && (
            <div className="space-y-1">
              <label className="font-semibold text-muted text-[11px] block">{t('allCountries')}</label>
              <select
                value={filters.country}
                onChange={(e) => onChange({ ...filters, country: e.target.value, city: '', region: '' })}
                className={selectClasses}
                aria-label={t('allCountries')}
              >
                <option value="">{t('allCountries')}</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {getCountryName(country) || country}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Toggles */}
          <div className="space-y-1 pt-1">
            {(filters.caseId || filters.personId) && (filters.radiusKm ?? 0) > 0 && (
              <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none text-[11px] block">
                <input
                  type="checkbox"
                  checked={Boolean(filters.onlyWithinRadius)}
                  onChange={(e) =>
                    onChange({ ...filters, onlyWithinRadius: e.target.checked })
                  }
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>{t('onlyWithinRadius', { km: filters.radiusKm ?? 1 })}</span>
              </label>
            )}
            <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none text-[11px] block">
              <input
                type="checkbox"
                checked={Boolean(filters.activeCasesOnly)}
                onChange={(e) =>
                  onChange({ ...filters, activeCasesOnly: e.target.checked })
                }
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>{t('activeCasesOnly')}</span>
            </label>
            {filters.caseId && (
              <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none text-[11px] block">
                <input
                  type="checkbox"
                  checked={filters.showRuledOut !== false}
                  onChange={(e) =>
                    onChange({ ...filters, showRuledOut: e.target.checked })
                  }
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>{t('showRuledOut')}</span>
              </label>
            )}
          </div>

          {/* Compact Legend */}
          <div className="pt-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 ring-1 ring-amber-300" />
              {t('legendCrimeScene')}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
              {t('legendSubjectLocation')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
