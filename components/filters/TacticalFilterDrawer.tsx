'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  UnifiedPersonFilterState,
  CriminalRecordFilterOption,
} from '@/lib/filters/person-filter-types';

interface TacticalFilterDrawerProps {
  filters: UnifiedPersonFilterState;
  onChange: (next: UnifiedPersonFilterState) => void;
  cases?: Array<{ id: string; title: string; status?: string }>;
  gangs?: Array<{ id: string; name: string; color?: string | null }>;
  groups?: Array<{ id: string; name: string; color?: string | null }>;
  cities?: string[];
  regions?: string[];
  countries?: string[];
  customFieldTemplates?: Array<{ id: string; name: string; slug: string; type?: string; options?: string[] }>;
  isGraphMode?: boolean;
}

export default function TacticalFilterDrawer({
  filters,
  onChange,
  cases = [],
  gangs = [],
  groups = [],
  cities = [],
  regions = [],
  countries = [],
  customFieldTemplates = [],
  isGraphMode = false,
}: TacticalFilterDrawerProps) {
  const t = useTranslations('tacticalFilters');

  // Accordion active sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    tactical: true,
    cases: false,
    criminal: false,
    marks: false,
    territory: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectClasses =
    'w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  const multiToggle = (
    currentList: string[],
    item: string,
    field: keyof UnifiedPersonFilterState,
  ) => {
    const next = currentList.includes(item)
      ? currentList.filter((x) => x !== item)
      : [...currentList, item];
    onChange({ ...filters, [field]: next });
  };

  // Section badge counts
  const tacticalCount =
    filters.managementLevels.length +
    filters.threatLevels.length +
    filters.residenceStatuses.length +
    (filters.gender ? 1 : 0);

  const caseCount =
    (filters.caseId ? 1 : 0) +
    filters.involvementTypes.length +
    filters.verificationStatuses.length +
    (filters.activeCasesOnly ? 1 : 0) +
    (filters.showRuledOut === false ? 1 : 0);

  const criminalCount =
    (filters.criminalRecordFilter !== 'all' ? 1 : 0) +
    (filters.criminalCharge ? 1 : 0) +
    (filters.gangId ? 1 : 0) +
    (filters.gangRole ? 1 : 0);

  const marksCount =
    filters.markTypes.length +
    (filters.onlySuspiciousVehicles ? 1 : 0) +
    (filters.vehicleType ? 1 : 0) +
    (filters.onlyMuleAccounts ? 1 : 0);

  const territoryCount =
    (filters.groupId ? 1 : 0) +
    filters.includeGroupIds.length +
    filters.excludeGroupIds.length +
    (filters.city ? 1 : 0) +
    (filters.region ? 1 : 0) +
    (filters.country ? 1 : 0) +
    (filters.radiusKm && filters.radiusKm > 0 ? 1 : 0) +
    (filters.customFieldSlug ? 1 : 0);

  return (
    <div className="space-y-2 text-xs">
      {/* SECTION 1: Tác chiến & Mức độ quản lý */}
      <div className="border border-border/70 rounded-lg overflow-hidden bg-surface/50">
        <button
          type="button"
          onClick={() => toggleSection('tactical')}
          className="w-full flex items-center justify-between px-3 py-2 bg-surface-elevated/40 hover:bg-surface-elevated/70 text-left font-semibold text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span>🎯 {t('sectionTactical')}</span>
            {tacticalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-bold">
                {tacticalCount}
              </span>
            )}
          </span>
          <span className="text-muted text-xs">{openSections.tactical ? '▲' : '▼'}</span>
        </button>

        {openSections.tactical && (
          <div className="p-3 space-y-3 border-t border-border/60">
            {/* Management Level */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">
                {t('managementLevel')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['KEY_TARGET', 'SURVEILLANCE', 'NORMAL'] as const).map((lvl) => {
                  const active = filters.managementLevels.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => multiToggle(filters.managementLevels, lvl, 'managementLevels')}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        active
                          ? lvl === 'KEY_TARGET'
                            ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50'
                            : lvl === 'SURVEILLANCE'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50'
                            : 'bg-primary/20 text-primary border-primary/50'
                          : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                      }`}
                    >
                      {t(`management.${lvl}` as any)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Threat Level */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">
                {t('threatLevel')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['ARMED_DANGEROUS', 'HIGH', 'MEDIUM', 'LOW'] as const).map((thr) => {
                  const active = filters.threatLevels.includes(thr);
                  return (
                    <button
                      key={thr}
                      type="button"
                      onClick={() => multiToggle(filters.threatLevels, thr, 'threatLevels')}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        active
                          ? thr === 'ARMED_DANGEROUS'
                            ? 'bg-rose-600/20 text-rose-700 dark:text-rose-300 border-rose-500/50'
                            : thr === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/50'
                            : 'bg-primary/20 text-primary border-primary/50'
                          : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                      }`}
                    >
                      {t(`threat.${thr}` as any)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Residence Status */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">
                {t('residenceStatus')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['WANTED', 'ABSENT', 'TRANSIENT', 'TEMPORARY', 'PERMANENT'] as const).map(
                  (res) => {
                    const active = filters.residenceStatuses.includes(res);
                    return (
                      <button
                        key={res}
                        type="button"
                        onClick={() =>
                          multiToggle(filters.residenceStatuses, res, 'residenceStatuses')
                        }
                        className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                          active
                            ? res === 'WANTED'
                              ? 'bg-red-600/20 text-red-600 dark:text-red-400 border-red-500/50'
                              : 'bg-primary/20 text-primary border-primary/50'
                            : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                        }`}
                      >
                        {t(`residence.${res}` as any)}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">{t('gender')}</label>
              <select
                value={filters.gender ?? ''}
                onChange={(e) => onChange({ ...filters, gender: e.target.value })}
                className={selectClasses}
              >
                <option value="">{t('all')}</option>
                <option value="MALE">{t('male')}</option>
                <option value="FEMALE">{t('female')}</option>
                <option value="OTHER">{t('otherGender')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Vụ án & Tố tụng */}
      <div className="border border-border/70 rounded-lg overflow-hidden bg-surface/50">
        <button
          type="button"
          onClick={() => toggleSection('cases')}
          className="w-full flex items-center justify-between px-3 py-2 bg-surface-elevated/40 hover:bg-surface-elevated/70 text-left font-semibold text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span>📁 {t('sectionCase')}</span>
            {caseCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-bold">
                {caseCount}
              </span>
            )}
          </span>
          <span className="text-muted text-xs">{openSections.cases ? '▲' : '▼'}</span>
        </button>

        {openSections.cases && (
          <div className="p-3 space-y-3 border-t border-border/60">
            {cases.length > 0 && (
              <div>
                <label className="font-medium text-muted block mb-1 text-[11px]">
                  {t('caseLabel')}
                </label>
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
                >
                  <option value="">{t('allCases')}</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      🚨 {c.title} {c.status ? `(${c.status})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Involvement types */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">
                {t('involvementLabel')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    'SUSPECT',
                    'PERSON_OF_INTEREST',
                    'ACCOMPLICE',
                    'WITNESS',
                    'VICTIM',
                    'INFORMANT',
                  ] as const
                ).map((inv) => {
                  const active = filters.involvementTypes.includes(inv);
                  return (
                    <button
                      key={inv}
                      type="button"
                      onClick={() =>
                        multiToggle(filters.involvementTypes, inv, 'involvementTypes')
                      }
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        active
                          ? 'bg-primary/20 text-primary border-primary/50'
                          : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                      }`}
                    >
                      {t(`involvement.${inv}` as any)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verification statuses */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">
                {t('verificationLabel')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['CONFIRMED', 'INVESTIGATING', 'HYPOTHESIS', 'RULED_OUT'] as const).map(
                  (ver) => {
                    const active = filters.verificationStatuses.includes(ver);
                    return (
                      <button
                        key={ver}
                        type="button"
                        onClick={() =>
                          multiToggle(filters.verificationStatuses, ver, 'verificationStatuses')
                        }
                        className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                          active
                            ? 'bg-primary/20 text-primary border-primary/50'
                            : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                        }`}
                      >
                        {t(`verification.${ver}` as any)}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-1 pt-1">
              {isGraphMode && filters.caseId && (
                <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none text-[11px] block">
                  <input
                    type="checkbox"
                    checked={filters.includeHop !== false}
                    onChange={(e) => onChange({ ...filters, includeHop: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>{t('includeHop')}</span>
                </label>
              )}
              <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none text-[11px] block">
                <input
                  type="checkbox"
                  checked={Boolean(filters.activeCasesOnly)}
                  onChange={(e) => onChange({ ...filters, activeCasesOnly: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>{t('activeCasesOnly')}</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none text-[11px] block">
                <input
                  type="checkbox"
                  checked={filters.showRuledOut !== false}
                  onChange={(e) => onChange({ ...filters, showRuledOut: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>{t('showRuledOut')}</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: Tiền án, tiền sự & Băng nhóm */}
      <div className="border border-border/70 rounded-lg overflow-hidden bg-surface/50">
        <button
          type="button"
          onClick={() => toggleSection('criminal')}
          className="w-full flex items-center justify-between px-3 py-2 bg-surface-elevated/40 hover:bg-surface-elevated/70 text-left font-semibold text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span>⚖️ {t('sectionCriminal')}</span>
            {criminalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-bold">
                {criminalCount}
              </span>
            )}
          </span>
          <span className="text-muted text-xs">{openSections.criminal ? '▲' : '▼'}</span>
        </button>

        {openSections.criminal && (
          <div className="p-3 space-y-3 border-t border-border/60">
            {/* Criminal record option */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">
                {t('criminalHistory')}
              </label>
              <select
                value={filters.criminalRecordFilter}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    criminalRecordFilter: e.target.value as CriminalRecordFilterOption,
                  })
                }
                className={selectClasses}
              >
                <option value="all">{t('criminalRecordOptions.all')}</option>
                <option value="has_record">{t('criminalRecordOptions.has_record')}</option>
                <option value="conviction">{t('criminalRecordOptions.conviction')}</option>
                <option value="admin_violation">{t('criminalRecordOptions.admin_violation')}</option>
                <option value="no_record">{t('criminalRecordOptions.no_record')}</option>
              </select>
            </div>

            {/* Charge search input */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">
                {t('chargeSearch')}
              </label>
              <input
                type="text"
                value={filters.criminalCharge ?? ''}
                onChange={(e) => onChange({ ...filters, criminalCharge: e.target.value })}
                placeholder={t('chargePlaceholder')}
                className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Gangs */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">
                {t('gangLabel')}
              </label>
              <select
                value={filters.gangId ?? ''}
                onChange={(e) => onChange({ ...filters, gangId: e.target.value })}
                className={selectClasses}
              >
                <option value="">{t('allGangs')}</option>
                <option value="__any__">{t('anyGang')}</option>
                {gangs.map((g) => (
                  <option key={g.id} value={g.id}>
                    🏴‍☠️ {g.name}
                  </option>
                ))}
              </select>
            </div>

            {filters.gangId && (
              <div>
                <label className="font-medium text-muted block mb-1 text-[11px]">
                  {t('gangRoleLabel')}
                </label>
                <select
                  value={filters.gangRole ?? ''}
                  onChange={(e) => onChange({ ...filters, gangRole: e.target.value })}
                  className={selectClasses}
                >
                  <option value="">{t('allGangRoles')}</option>
                  {(['LEADER', 'SECOND_IN_COMMAND', 'ENFORCER', 'MEMBER'] as const).map((r) => (
                    <option key={r} value={r}>
                      {t(`gangRoles.${r}` as any)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: Nhận dạng, Phương tiện & Tài chính */}
      <div className="border border-border/70 rounded-lg overflow-hidden bg-surface/50">
        <button
          type="button"
          onClick={() => toggleSection('marks')}
          className="w-full flex items-center justify-between px-3 py-2 bg-surface-elevated/40 hover:bg-surface-elevated/70 text-left font-semibold text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span>🔍 {t('sectionMarks')}</span>
            {marksCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-bold">
                {marksCount}
              </span>
            )}
          </span>
          <span className="text-muted text-xs">{openSections.marks ? '▲' : '▼'}</span>
        </button>

        {openSections.marks && (
          <div className="p-3 space-y-3 border-t border-border/60">
            {/* Mark types */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">
                {t('marksLabel')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['TATTOO', 'SCAR', 'DEFORMITY', 'MOLE', 'OTHER'] as const).map((mt) => {
                  const active = filters.markTypes.includes(mt);
                  return (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => multiToggle(filters.markTypes, mt, 'markTypes')}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        active
                          ? 'bg-primary/20 text-primary border-primary/50'
                          : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                      }`}
                    >
                      {t(`markTypes.${mt}` as any)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vehicle filters */}
            <div>
              <label className="font-medium text-muted block mb-1 text-[11px]">
                {t('vehicleType')}
              </label>
              <input
                type="text"
                value={filters.vehicleType ?? ''}
                onChange={(e) => onChange({ ...filters, vehicleType: e.target.value })}
                placeholder={t('vehicleTypePlaceholder')}
                className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1 pt-1">
              <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none text-[11px] block">
                <input
                  type="checkbox"
                  checked={Boolean(filters.onlySuspiciousVehicles)}
                  onChange={(e) =>
                    onChange({ ...filters, onlySuspiciousVehicles: e.target.checked })
                  }
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>{t('onlySuspiciousVehicles')}</span>
              </label>

              <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none text-[11px] block">
                <input
                  type="checkbox"
                  checked={Boolean(filters.onlyMuleAccounts)}
                  onChange={(e) => onChange({ ...filters, onlyMuleAccounts: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>{t('onlyMuleAccounts')}</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5: Địa bàn & Nhóm nghiệp vụ */}
      <div className="border border-border/70 rounded-lg overflow-hidden bg-surface/50">
        <button
          type="button"
          onClick={() => toggleSection('territory')}
          className="w-full flex items-center justify-between px-3 py-2 bg-surface-elevated/40 hover:bg-surface-elevated/70 text-left font-semibold text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span>📍 {t('sectionTerritory')}</span>
            {territoryCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-bold">
                {territoryCount}
              </span>
            )}
          </span>
          <span className="text-muted text-xs">{openSections.territory ? '▲' : '▼'}</span>
        </button>

        {openSections.territory && (
          <div className="p-3 space-y-3 border-t border-border/60">
            {/* Single Group Select (if provided) */}
            {groups.length > 0 && (
              <div>
                <label className="font-medium text-muted block mb-1 text-[11px]">
                  {t('filterByGroups')}
                </label>
                <select
                  value={filters.groupId ?? ''}
                  onChange={(e) => onChange({ ...filters, groupId: e.target.value })}
                  className={selectClasses}
                >
                  <option value="">{t('all')}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* City */}
            {cities.length > 0 && (
              <div>
                <label className="font-medium text-muted block mb-1 text-[11px]">
                  {t('territoryCity')}
                </label>
                <select
                  value={filters.city ?? ''}
                  onChange={(e) => onChange({ ...filters, city: e.target.value })}
                  className={selectClasses}
                >
                  <option value="">{t('all')}</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Region */}
            {regions.length > 0 && (
              <div>
                <label className="font-medium text-muted block mb-1 text-[11px]">
                  {t('territoryRegion')}
                </label>
                <select
                  value={filters.region ?? ''}
                  onChange={(e) => onChange({ ...filters, region: e.target.value })}
                  className={selectClasses}
                >
                  <option value="">{t('all')}</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Countries */}
            {countries.length > 0 && (
              <div>
                <label className="font-medium text-muted block mb-1 text-[11px]">
                  {t('territoryCountry')}
                </label>
                <select
                  value={filters.country ?? ''}
                  onChange={(e) => onChange({ ...filters, country: e.target.value })}
                  className={selectClasses}
                >
                  <option value="">{t('all')}</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Radius for Case or Person */}
            {(filters.caseId || filters.personId) && (
              <div className="space-y-1">
                <label className="font-medium text-muted block mb-1 text-[11px]">
                  {t('radiusLabel')}
                </label>
                <select
                  value={String(filters.radiusKm ?? 0)}
                  onChange={(e) => onChange({ ...filters, radiusKm: Number(e.target.value) })}
                  className={selectClasses}
                >
                  <option value="0">Tắt bán kính</option>
                  <option value="0.5">500 m</option>
                  <option value="1">1 km</option>
                  <option value="2">2 km</option>
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                </select>

                {(filters.radiusKm ?? 0) > 0 && (
                  <label className="inline-flex items-center gap-1.5 text-foreground cursor-pointer select-none text-[11px] pt-1 block">
                    <input
                      type="checkbox"
                      checked={Boolean(filters.onlyWithinRadius)}
                      onChange={(e) => onChange({ ...filters, onlyWithinRadius: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>{t('onlyWithinRadius', { km: filters.radiusKm ?? 1 })}</span>
                  </label>
                )}
              </div>
            )}

            {/* Custom Field Template Filter */}
            {customFieldTemplates.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <label className="font-medium text-muted block text-[11px]">
                  Trường nghiệp vụ tùy biến:
                </label>
                <select
                  value={filters.customFieldSlug ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      customFieldSlug: e.target.value,
                      customFieldValue: '',
                    })
                  }
                  className={selectClasses}
                >
                  <option value="">Tất cả</option>
                  {customFieldTemplates.map((cf) => (
                    <option key={cf.id} value={cf.slug}>
                      {cf.name}
                    </option>
                  ))}
                </select>

                {filters.customFieldSlug && (
                  <input
                    type="text"
                    value={filters.customFieldValue ?? ''}
                    onChange={(e) => onChange({ ...filters, customFieldValue: e.target.value })}
                    placeholder="Giá trị cần lọc..."
                    className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
