'use client';

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
  resultCount,
  onChange,
}: MapFiltersProps) {
  const t = useTranslations('map');
  const cities = distinctCities(markers);
  const regions = distinctRegions(markers);
  const countries = distinctCountries(markers);
  const hasActiveFilters = Boolean(
    filters.query ||
      filters.groupId ||
      filters.city ||
      filters.region ||
      filters.country ||
      filters.caseId ||
      (filters.radiusKm && filters.radiusKm > 0) ||
      filters.onlyWithinRadius ||
      filters.activeCasesOnly
  );

  const selectClasses =
    'w-full sm:w-auto px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="space-y-2 px-4 py-3 bg-surface border-b border-border">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder={t('searchPlaceholder')}
          className={`${selectClasses} col-span-2 sm:flex-1 sm:min-w-[10rem]`}
          aria-label={t('searchPlaceholder')}
        />

        {cases.length > 0 && (
          <select
            value={filters.caseId ?? ''}
            onChange={(e) =>
              onChange({
                ...filters,
                caseId: e.target.value,
                radiusKm: e.target.value ? (filters.radiusKm || 1) : 0,
              })
            }
            className={selectClasses}
            aria-label="Filter by Case"
          >
            <option value="">All Cases / Incidents</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                🚨 {c.title} ({c.status})
              </option>
            ))}
          </select>
        )}

        {filters.caseId && (
          <select
            value={String(filters.radiusKm ?? 1)}
            onChange={(e) =>
              onChange({
                ...filters,
                radiusKm: Number(e.target.value),
              })
            }
            className={selectClasses}
            aria-label="Crime Scene Radius"
          >
            <option value="0">Radius: Off</option>
            <option value="0.5">Radius: 500 m</option>
            <option value="1">Radius: 1 km</option>
            <option value="2">Radius: 2 km</option>
            <option value="5">Radius: 5 km</option>
            <option value="10">Radius: 10 km</option>
          </select>
        )}

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

        {/* City, state/province and country are mutually exclusive: picking
            one clears the others, since combining them mostly produces
            impossible matches. */}
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

        {hasActiveFilters && (
          <div className="col-span-2 flex items-center justify-between gap-3 sm:ml-auto">
            <span className="text-sm text-muted whitespace-nowrap" role="status">
              {t('resultsCount', { count: resultCount })}
            </span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  query: '',
                  groupId: '',
                  city: '',
                  region: '',
                  country: '',
                  caseId: '',
                  radiusKm: 0,
                  onlyWithinRadius: false,
                  activeCasesOnly: false,
                  showRuledOut: false,
                })
              }
              className="px-3 py-2 text-sm text-primary hover:text-primary-dark transition-colors whitespace-nowrap"
            >
              {t('clearFilters')}
            </button>
          </div>
        )}
      </div>

      {/* Investigation Quick Toggles */}
      {cases.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted">
          {filters.caseId && (filters.radiusKm ?? 0) > 0 && (
            <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(filters.onlyWithinRadius)}
                onChange={(e) =>
                  onChange({ ...filters, onlyWithinRadius: e.target.checked })
                }
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Only subjects within {filters.radiusKm} km of crime scene</span>
            </label>
          )}
          <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(filters.activeCasesOnly)}
              onChange={(e) =>
                onChange({ ...filters, activeCasesOnly: e.target.checked })
              }
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Active Cases Only</span>
          </label>
          {filters.caseId && (
            <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.showRuledOut !== false}
                onChange={(e) =>
                  onChange({ ...filters, showRuledOut: e.target.checked })
                }
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Show Ruled-Out Subjects</span>
            </label>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-amber-300" />
              Crime Scene
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
              Subject Location
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
