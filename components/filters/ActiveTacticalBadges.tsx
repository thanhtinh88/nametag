'use client';

import { useTranslations } from 'next-intl';
import type { UnifiedPersonFilterState } from '@/lib/filters/person-filter-types';

interface ActiveTacticalBadgesProps {
  filters: UnifiedPersonFilterState;
  onChange: (next: UnifiedPersonFilterState) => void;
  cases?: Array<{ id: string; title: string }>;
  gangs?: Array<{ id: string; name: string }>;
  groups?: Array<{ id: string; name: string }>;
  className?: string;
}

export default function ActiveTacticalBadges({
  filters,
  onChange,
  cases = [],
  gangs = [],
  groups = [],
  className = '',
}: ActiveTacticalBadgesProps) {
  const t = useTranslations('tacticalFilters');

  const badges: Array<{ id: string; label: string; onRemove: () => void }> = [];

  // Management levels
  filters.managementLevels.forEach((level) => {
    badges.push({
      id: `ml_${level}`,
      label: `${t('managementLevel')}: ${t(`management.${level}` as any)}`,
      onRemove: () =>
        onChange({
          ...filters,
          managementLevels: filters.managementLevels.filter((l) => l !== level),
        }),
    });
  });

  // Threat levels
  filters.threatLevels.forEach((threat) => {
    badges.push({
      id: `tl_${threat}`,
      label: `${t('threatLevel')}: ${t(`threat.${threat}` as any)}`,
      onRemove: () =>
        onChange({
          ...filters,
          threatLevels: filters.threatLevels.filter((tVal) => tVal !== threat),
        }),
    });
  });

  // Residence statuses
  filters.residenceStatuses.forEach((status) => {
    badges.push({
      id: `rs_${status}`,
      label: `${t('residenceStatus')}: ${t(`residence.${status}` as any)}`,
      onRemove: () =>
        onChange({
          ...filters,
          residenceStatuses: filters.residenceStatuses.filter((s) => s !== status),
        }),
    });
  });

  // Gender
  if (filters.gender) {
    badges.push({
      id: 'gender',
      label: `${t('gender')}: ${filters.gender === 'MALE' ? t('male') : filters.gender === 'FEMALE' ? t('female') : t('otherGender')}`,
      onRemove: () => onChange({ ...filters, gender: '' }),
    });
  }

  // Case Focus
  if (filters.caseId) {
    const c = cases.find((item) => item.id === filters.caseId);
    badges.push({
      id: 'caseId',
      label: `🚨 ${c ? c.title : filters.caseId}`,
      onRemove: () => onChange({ ...filters, caseId: '', radiusKm: 0, onlyWithinRadius: false }),
    });
  }

  // Involvements
  filters.involvementTypes.forEach((inv) => {
    badges.push({
      id: `inv_${inv}`,
      label: `${t('involvementLabel')}: ${t(`involvement.${inv}` as any)}`,
      onRemove: () =>
        onChange({
          ...filters,
          involvementTypes: filters.involvementTypes.filter((i) => i !== inv),
        }),
    });
  });

  // Verification statuses
  filters.verificationStatuses.forEach((ver) => {
    badges.push({
      id: `ver_${ver}`,
      label: `${t('verificationLabel')}: ${t(`verification.${ver}` as any)}`,
      onRemove: () =>
        onChange({
          ...filters,
          verificationStatuses: filters.verificationStatuses.filter((v) => v !== ver),
        }),
    });
  });

  // Criminal record
  if (filters.criminalRecordFilter !== 'all') {
    badges.push({
      id: 'criminalRecordFilter',
      label: t(`criminalRecordOptions.${filters.criminalRecordFilter}` as any),
      onRemove: () => onChange({ ...filters, criminalRecordFilter: 'all' }),
    });
  }

  if (filters.criminalCharge) {
    badges.push({
      id: 'criminalCharge',
      label: `${t('chargeSearch')}: ${filters.criminalCharge}`,
      onRemove: () => onChange({ ...filters, criminalCharge: '' }),
    });
  }

  // Gang
  if (filters.gangId) {
    const gang = gangs.find((g) => g.id === filters.gangId);
    badges.push({
      id: 'gangId',
      label: filters.gangId === '__any__' ? t('anyGang') : `🏴‍☠️ ${gang ? gang.name : filters.gangId}`,
      onRemove: () => onChange({ ...filters, gangId: '' }),
    });
  }

  if (filters.gangRole) {
    badges.push({
      id: 'gangRole',
      label: `${t('gangRoleLabel')}: ${t(`gangRoles.${filters.gangRole}` as any)}`,
      onRemove: () => onChange({ ...filters, gangRole: '' }),
    });
  }

  // Mark types
  filters.markTypes.forEach((mark) => {
    badges.push({
      id: `mark_${mark}`,
      label: `${t('marksLabel')}: ${t(`markTypes.${mark}` as any)}`,
      onRemove: () =>
        onChange({
          ...filters,
          markTypes: filters.markTypes.filter((m) => m !== mark),
        }),
    });
  });

  // Vehicle
  if (filters.onlySuspiciousVehicles) {
    badges.push({
      id: 'onlySuspiciousVehicles',
      label: t('chipSuspiciousVehicle'),
      onRemove: () => onChange({ ...filters, onlySuspiciousVehicles: false }),
    });
  }

  if (filters.vehicleType) {
    badges.push({
      id: 'vehicleType',
      label: `${t('vehicleType')}: ${filters.vehicleType}`,
      onRemove: () => onChange({ ...filters, vehicleType: '' }),
    });
  }

  // Bank
  if (filters.onlyMuleAccounts) {
    badges.push({
      id: 'onlyMuleAccounts',
      label: t('chipMuleAccount'),
      onRemove: () => onChange({ ...filters, onlyMuleAccounts: false }),
    });
  }

  // Group single
  if (filters.groupId) {
    const grp = groups.find((g) => g.id === filters.groupId);
    badges.push({
      id: 'groupId',
      label: `📁 ${grp ? grp.name : filters.groupId}`,
      onRemove: () => onChange({ ...filters, groupId: '' }),
    });
  }

  // Geo
  if (filters.city) {
    badges.push({
      id: 'city',
      label: `📍 ${filters.city}`,
      onRemove: () => onChange({ ...filters, city: '' }),
    });
  }

  if (filters.region) {
    badges.push({
      id: 'region',
      label: `📍 ${filters.region}`,
      onRemove: () => onChange({ ...filters, region: '' }),
    });
  }

  if (filters.radiusKm && filters.radiusKm > 0) {
    badges.push({
      id: 'radiusKm',
      label: `🎯 ${filters.radiusKm} km`,
      onRemove: () => onChange({ ...filters, radiusKm: 0, onlyWithinRadius: false }),
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 py-1 ${className}`}>
      {badges.map((badge) => (
        <span
          key={badge.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
        >
          <span>{badge.label}</span>
          <button
            type="button"
            onClick={badge.onRemove}
            className="rounded-full hover:bg-primary/20 p-0.5 transition-colors leading-none"
            title="Gỡ bỏ"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

