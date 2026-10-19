'use client';

import { useTranslations } from 'next-intl';
import type { UnifiedPersonFilterState } from '@/lib/filters/person-filter-types';

interface TacticalQuickChipsProps {
  filters: UnifiedPersonFilterState;
  onChange: (next: UnifiedPersonFilterState) => void;
  className?: string;
}

export default function TacticalQuickChips({
  filters,
  onChange,
  className = '',
}: TacticalQuickChipsProps) {
  const t = useTranslations('tacticalFilters');

  const isKeyTarget = filters.managementLevels.includes('KEY_TARGET');
  const isArmed = filters.threatLevels.includes('ARMED_DANGEROUS');
  const isWanted = filters.residenceStatuses.includes('WANTED');
  const isConvicted = filters.criminalRecordFilter === 'conviction';
  const isGangAffiliate = Boolean(filters.gangId);
  const isSuspiciousVehicle = Boolean(filters.onlySuspiciousVehicles);
  const isMuleAccount = Boolean(filters.onlyMuleAccounts);

  const toggleManagementLevel = (level: string) => {
    const nextLevels = filters.managementLevels.includes(level)
      ? filters.managementLevels.filter((l) => l !== level)
      : [...filters.managementLevels, level];
    onChange({ ...filters, managementLevels: nextLevels });
  };

  const toggleThreatLevel = (threat: string) => {
    const nextThreats = filters.threatLevels.includes(threat)
      ? filters.threatLevels.filter((t) => t !== threat)
      : [...filters.threatLevels, threat];
    onChange({ ...filters, threatLevels: nextThreats });
  };

  const toggleResidenceStatus = (status: string) => {
    const nextStatuses = filters.residenceStatuses.includes(status)
      ? filters.residenceStatuses.filter((s) => s !== status)
      : [...filters.residenceStatuses, status];
    onChange({ ...filters, residenceStatuses: nextStatuses });
  };

  const toggleCriminalFilter = (option: 'conviction') => {
    onChange({
      ...filters,
      criminalRecordFilter: filters.criminalRecordFilter === option ? 'all' : option,
    });
  };

  const toggleGang = () => {
    onChange({
      ...filters,
      gangId: filters.gangId ? '' : '__any__',
    });
  };

  const toggleSuspiciousVehicle = () => {
    onChange({
      ...filters,
      onlySuspiciousVehicles: !filters.onlySuspiciousVehicles,
    });
  };

  const toggleMuleAccount = () => {
    onChange({
      ...filters,
      onlyMuleAccounts: !filters.onlyMuleAccounts,
    });
  };

  const chips = [
    {
      id: 'key_target',
      label: t('chipKeyTarget'),
      active: isKeyTarget,
      onClick: () => toggleManagementLevel('KEY_TARGET'),
      activeClass: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50 ring-1 ring-red-500/30',
    },
    {
      id: 'armed',
      label: t('chipArmed'),
      active: isArmed,
      onClick: () => toggleThreatLevel('ARMED_DANGEROUS'),
      activeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50 ring-1 ring-amber-500/30',
    },
    {
      id: 'wanted',
      label: t('chipWanted'),
      active: isWanted,
      onClick: () => toggleResidenceStatus('WANTED'),
      activeClass: 'bg-rose-600/20 text-rose-700 dark:text-rose-300 border-rose-600/50 ring-1 ring-rose-600/30',
    },
    {
      id: 'conviction',
      label: t('chipConviction'),
      active: isConvicted,
      onClick: () => toggleCriminalFilter('conviction'),
      activeClass: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50 ring-1 ring-purple-500/30',
    },
    {
      id: 'gang',
      label: t('chipGang'),
      active: isGangAffiliate,
      onClick: toggleGang,
      activeClass: 'bg-slate-700/20 text-slate-800 dark:text-slate-200 border-slate-600/50 ring-1 ring-slate-500/30',
    },
    {
      id: 'vehicle',
      label: t('chipSuspiciousVehicle'),
      active: isSuspiciousVehicle,
      onClick: toggleSuspiciousVehicle,
      activeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50 ring-1 ring-blue-500/30',
    },
    {
      id: 'mule',
      label: t('chipMuleAccount'),
      active: isMuleAccount,
      onClick: toggleMuleAccount,
      activeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/30',
    },
  ];

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={chip.onClick}
            className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium border transition-all shrink-0 cursor-pointer select-none ${
              chip.active
                ? chip.activeClass
                : 'bg-surface hover:bg-surface-elevated text-muted hover:text-foreground border-border/70'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

