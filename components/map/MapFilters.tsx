'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MapCase, MapGroup, MapMarker } from '@/lib/map/types';
import {
  distinctCities,
  distinctCountries,
  distinctRegions,
  type MapFilterState,
} from '@/lib/map/filter-markers';
import {
  DEFAULT_PERSON_FILTER_STATE,
  countActiveTacticalFilters,
} from '@/lib/filters/person-filter-types';
import TacticalQuickChips from '@/components/filters/TacticalQuickChips';
import ActiveTacticalBadges from '@/components/filters/ActiveTacticalBadges';
import TacticalFilterDrawer from '@/components/filters/TacticalFilterDrawer';

interface MapFiltersProps {
  filters: MapFilterState;
  markers: MapMarker[];
  groups: MapGroup[];
  gangs?: Array<{ id: string; name: string; color?: string | null }>;
  cases?: MapCase[];
  /** Number of markers matching the active filters */
  resultCount: number;
  onChange: (next: MapFilterState) => void;
}

export default function MapFilters({
  filters,
  markers,
  groups,
  gangs = [],
  cases = [],
  resultCount,
  onChange,
}: MapFiltersProps) {
  const t = useTranslations('map');
  const tTactical = useTranslations('tacticalFilters');
  const [open, setOpen] = useState(false);

  const cities = useMemo(() => distinctCities(markers), [markers]);
  const regions = useMemo(() => distinctRegions(markers), [markers]);
  const countries = useMemo(() => distinctCountries(markers), [markers]);

  const activeFiltersCount = useMemo(() => countActiveTacticalFilters(filters), [filters]);

  const handleClear = () => {
    onChange({
      ...DEFAULT_PERSON_FILTER_STATE,
      query: filters.query, // preserve search query when clearing filters
    });
  };

  return (
    <div className="border-b border-border/60 bg-surface/30">
      {/* 1. Search Input at Top */}
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

      {/* 2. Tactical Quick Chips (1-Tap Filters) */}
      <div className="px-2.5 py-1.5 border-b border-border/50 bg-surface-elevated/20">
        <TacticalQuickChips filters={filters} onChange={onChange} />
      </div>

      {/* 3. Filter Drawer Toggle, Match Counter & Clear Button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-elevated/40 border-b border-border/60">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors text-xs"
        >
          <span>⚙️ {tTactical('title')}</span>
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

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted">
            {resultCount} {resultCount === 1 ? 'vị trí' : 'vị trí'}
          </span>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-muted hover:text-red-500 transition-colors"
            >
              {tTactical('clearAll')}
            </button>
          )}
        </div>
      </div>

      {/* 4. Active Badges Bar (Removable pills) */}
      <div className="px-2.5 bg-surface/40">
        <ActiveTacticalBadges
          filters={filters}
          onChange={onChange}
          cases={cases}
          gangs={gangs}
          groups={groups}
        />
      </div>

      {/* 5. Collapsible Comprehensive Filter Drawer */}
      {open && (
        <div className="p-2.5 space-y-2 border-b border-border/60 max-h-80 overflow-y-auto text-xs bg-surface/20">
          <TacticalFilterDrawer
            filters={filters}
            onChange={onChange}
            cases={cases}
            gangs={gangs}
            groups={groups}
            cities={cities}
            regions={regions}
            countries={countries}
            isGraphMode={false}
          />
        </div>
      )}

      {/* Compact Legend */}
      <div className="px-3 py-1.5 flex items-center gap-3 text-[10px] text-muted border-b border-border/40">
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
  );
}
