'use client';

import React, { useState } from 'react';
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
  const [open, setOpen] = useState(false);

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
      icon: '🎯',
      label: t('chipKeyTarget'),
      active: isKeyTarget,
      onClick: () => toggleManagementLevel('KEY_TARGET'),
      activeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40',
    },
    {
      id: 'armed',
      icon: '🔫',
      label: t('chipArmed'),
      active: isArmed,
      onClick: () => toggleThreatLevel('ARMED_DANGEROUS'),
      activeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    },
    {
      id: 'wanted',
      icon: '🚨',
      label: t('chipWanted'),
      active: isWanted,
      onClick: () => toggleResidenceStatus('WANTED'),
      activeClass: 'bg-rose-600/15 text-rose-700 dark:text-rose-300 border-rose-600/40',
    },
    {
      id: 'conviction',
      icon: '⚖️',
      label: t('chipConviction'),
      active: isConvicted,
      onClick: () => toggleCriminalFilter('conviction'),
      activeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40',
    },
    {
      id: 'gang',
      icon: '🕸️',
      label: t('chipGang'),
      active: isGangAffiliate,
      onClick: toggleGang,
      activeClass: 'bg-slate-700/15 text-slate-800 dark:text-slate-200 border-slate-600/40',
    },
    {
      id: 'vehicle',
      icon: '🏍️',
      label: t('chipSuspiciousVehicle'),
      active: isSuspiciousVehicle,
      onClick: toggleSuspiciousVehicle,
      activeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40',
    },
    {
      id: 'mule',
      icon: '💳',
      label: t('chipMuleAccount'),
      active: isMuleAccount,
      onClick: toggleMuleAccount,
      activeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    },
  ];

  const activeCount = chips.filter((c) => c.active).length;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap ${
          open || activeCount > 0
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
            : 'bg-surface hover:bg-surface-elevated text-foreground border-border'
        }`}
        title="Tiêu chí lọc tác chiến nhanh"
      >
        <span>⚡</span>
        <span className="hidden md:inline">Lọc nhanh</span>
        {activeCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
            {activeCount}
          </span>
        )}
        <span className="text-[9px] opacity-75">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-1.5 w-60 bg-surface border border-border rounded-xl shadow-2xl z-50 p-2 space-y-1 text-xs">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/60 mb-1">
              ⚡ Tiêu chí lọc nhanh
            </div>
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={chip.onClick}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium border transition-all cursor-pointer ${
                  chip.active
                    ? chip.activeClass
                    : 'bg-transparent hover:bg-surface-elevated text-foreground border-transparent'
                }`}
              >
                <span className="truncate">{chip.label}</span>
                {chip.active && <span className="text-[11px] font-bold shrink-0">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

