// lib/filters/person-filter-types.ts

export interface PersonCaseLink {
  eventId: string;
  eventTitle?: string;
  eventStatus?: string;
  role?: string | null;
  involvementType?: string;
  verificationStatus?: string;
  confidence?: string | null;
}

export interface PersonTacticalData {
  id?: string;
  name?: string;
  managementLevel?: string | null; // "NORMAL" | "SURVEILLANCE" | "KEY_TARGET"
  threatLevel?: string | null;     // "LOW" | "MEDIUM" | "HIGH" | "ARMED_DANGEROUS"
  residenceStatus?: string | null; // "PERMANENT" | "TEMPORARY" | "TRANSIENT" | "ABSENT" | "WANTED"
  gender?: string | null;
  hasCriminalRecord?: boolean;
  criminalRecordCharges?: string[];
  hasActiveConviction?: boolean;
  gangIds?: string[];
  gangRoles?: string[];
  hasSuspiciousVehicle?: boolean;
  vehicleTypes?: string[];
  markTypes?: string[];
  hasMuleAccount?: boolean;
  caseLinks?: PersonCaseLink[];
  groupIds?: string[];
  city?: string | null;
  region?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  customFieldValues?: Record<string, string>;
}

export type CriminalRecordFilterOption =
  | 'all'
  | 'has_record'
  | 'conviction'
  | 'admin_violation'
  | 'no_record';

export interface UnifiedPersonFilterState {
  // Query
  query: string;

  // Nhóm 1: Tác chiến & Mức độ quản lý / Rủi ro
  managementLevels: string[]; // e.g. ["KEY_TARGET", "SURVEILLANCE"]
  threatLevels: string[];     // e.g. ["HIGH", "ARMED_DANGEROUS"]
  residenceStatuses: string[];// e.g. ["WANTED", "ABSENT", "PERMANENT"]
  gender?: string;            // "MALE" | "FEMALE" | "OTHER" | ""

  // Nhóm 2: Vụ án & Tố tụng
  caseId?: string;
  personId?: string;
  involvementTypes: string[];   // e.g. ["SUSPECT", "ACCOMPLICE", "PERSON_OF_INTEREST", ...]
  verificationStatuses: string[];// e.g. ["CONFIRMED", "INVESTIGATING", "HYPOTHESIS", "RULED_OUT"]
  includeHop?: boolean;
  activeCasesOnly?: boolean;
  showRuledOut?: boolean;

  // Nhóm 3: Tiền án, tiền sự & Băng nhóm
  criminalRecordFilter: CriminalRecordFilterOption;
  criminalCharge?: string;
  gangId?: string;
  gangRole?: string;

  // Nhóm 4: Nhận dạng, Phương tiện & Tài chính
  markTypes: string[];          // e.g. ["TATTOO", "SCAR", "DEFORMITY", "MOLE", "OTHER"]
  vehicleType?: string;
  onlySuspiciousVehicles?: boolean;
  onlyMuleAccounts?: boolean;

  // Nhóm 5: Địa bàn & Phân loại nhóm
  groupId?: string;             // single group filter for simple selects
  includeGroupIds: string[];
  excludeGroupIds: string[];
  groupMatchOperator: 'or' | 'and';
  city?: string;
  region?: string;
  country?: string;
  radiusKm?: number;
  onlyWithinRadius?: boolean;

  // Thuộc tính tùy chỉnh
  customFieldSlug?: string;
  customFieldValue?: string;
}

export const DEFAULT_PERSON_FILTER_STATE: UnifiedPersonFilterState = {
  query: '',
  managementLevels: [],
  threatLevels: [],
  residenceStatuses: [],
  gender: '',
  caseId: '',
  personId: '',
  involvementTypes: [],
  verificationStatuses: [],
  includeHop: true,
  activeCasesOnly: false,
  showRuledOut: true,
  criminalRecordFilter: 'all',
  criminalCharge: '',
  gangId: '',
  gangRole: '',
  markTypes: [],
  vehicleType: '',
  onlySuspiciousVehicles: false,
  onlyMuleAccounts: false,
  groupId: '',
  includeGroupIds: [],
  excludeGroupIds: [],
  groupMatchOperator: 'or',
  city: '',
  region: '',
  country: '',
  radiusKm: 0,
  onlyWithinRadius: false,
  customFieldSlug: '',
  customFieldValue: '',
};

/**
 * Checks if a subject meets all active tactical filter criteria
 */
export function matchesPersonTacticalFilters(
  subject: PersonTacticalData,
  filters: UnifiedPersonFilterState,
): boolean {
  // 1. Management level
  if (filters.managementLevels.length > 0) {
    const level = subject.managementLevel || 'NORMAL';
    if (!filters.managementLevels.includes(level)) return false;
  }

  // 2. Threat level
  if (filters.threatLevels.length > 0) {
    const threat = subject.threatLevel || 'LOW';
    if (!filters.threatLevels.includes(threat)) return false;
  }

  // 3. Residence status
  if (filters.residenceStatuses.length > 0) {
    const status = subject.residenceStatus || 'PERMANENT';
    if (!filters.residenceStatuses.includes(status)) return false;
  }

  // 4. Gender
  if (filters.gender && subject.gender && subject.gender !== filters.gender) {
    return false;
  }

  // 5. Criminal record filter
  if (filters.criminalRecordFilter === 'has_record' && !subject.hasCriminalRecord) {
    return false;
  }
  if (filters.criminalRecordFilter === 'no_record' && subject.hasCriminalRecord) {
    return false;
  }
  if (filters.criminalRecordFilter === 'conviction') {
    if (!subject.hasActiveConviction && !subject.hasCriminalRecord) return false;
  }

  // Criminal charge substring
  if (filters.criminalCharge && filters.criminalCharge.trim()) {
    const queryCharge = filters.criminalCharge.trim().toLowerCase();
    const hasMatch = subject.criminalRecordCharges?.some((c) =>
      c.toLowerCase().includes(queryCharge),
    );
    if (!hasMatch) return false;
  }

  // 6. Gang membership & role
  if (filters.gangId) {
    if (filters.gangId === '__any__') {
      if (!subject.gangIds || subject.gangIds.length === 0) return false;
    } else {
      if (!subject.gangIds || !subject.gangIds.includes(filters.gangId)) return false;
    }
  }

  if (filters.gangRole) {
    if (!subject.gangRoles || !subject.gangRoles.includes(filters.gangRole)) return false;
  }

  // 7. Physical marks
  if (filters.markTypes.length > 0) {
    if (!subject.markTypes || subject.markTypes.length === 0) return false;
    const hasAnySelectedMark = filters.markTypes.some((mt) => subject.markTypes?.includes(mt));
    if (!hasAnySelectedMark) return false;
  }

  // 8. Vehicles
  if (filters.onlySuspiciousVehicles && !subject.hasSuspiciousVehicle) {
    return false;
  }

  if (filters.vehicleType) {
    const reqType = filters.vehicleType.toLowerCase();
    const hasType = subject.vehicleTypes?.some((vt) => vt.toLowerCase().includes(reqType));
    if (!hasType) return false;
  }

  // 9. Bank accounts
  if (filters.onlyMuleAccounts && !subject.hasMuleAccount) {
    return false;
  }

  // 10. Case & Involvements
  if (filters.caseId) {
    const targetLink = subject.caseLinks?.find((l) => l.eventId === filters.caseId);
    if (!targetLink) return false;

    if (filters.showRuledOut === false && targetLink.verificationStatus === 'RULED_OUT') {
      return false;
    }

    if (filters.involvementTypes.length > 0) {
      if (!targetLink.involvementType || !filters.involvementTypes.includes(targetLink.involvementType)) {
        return false;
      }
    }

    if (filters.verificationStatuses.length > 0) {
      if (!targetLink.verificationStatus || !filters.verificationStatuses.includes(targetLink.verificationStatus)) {
        return false;
      }
    }
  } else {
    // If no case is selected, but user filtered by involvementType or verificationStatus globally
    if (filters.involvementTypes.length > 0) {
      const hasMatchingInvolvement = subject.caseLinks?.some(
        (l) => l.involvementType && filters.involvementTypes.includes(l.involvementType),
      );
      if (!hasMatchingInvolvement) return false;
    }

    if (filters.showRuledOut === false) {
      if (subject.caseLinks && subject.caseLinks.length > 0) {
        const allRuledOut = subject.caseLinks.every((l) => l.verificationStatus === 'RULED_OUT');
        if (allRuledOut) return false;
      }
    }

    if (filters.verificationStatuses.length > 0) {
      const hasMatchingStatus = subject.caseLinks?.some(
        (l) => l.verificationStatus && filters.verificationStatuses.includes(l.verificationStatus),
      );
      if (!hasMatchingStatus) return false;
    }
  }

  // 11. Groups
  if (filters.groupId && (!subject.groupIds || !subject.groupIds.includes(filters.groupId))) {
    return false;
  }

  if (filters.includeGroupIds.length > 0) {
    if (!subject.groupIds || subject.groupIds.length === 0) return false;
    if (filters.groupMatchOperator === 'and') {
      const hasAll = filters.includeGroupIds.every((gid) => subject.groupIds?.includes(gid));
      if (!hasAll) return false;
    } else {
      const hasAny = filters.includeGroupIds.some((gid) => subject.groupIds?.includes(gid));
      if (!hasAny) return false;
    }
  }

  if (filters.excludeGroupIds.length > 0) {
    if (subject.groupIds && subject.groupIds.length > 0) {
      const hasExcluded = filters.excludeGroupIds.some((gid) => subject.groupIds?.includes(gid));
      if (hasExcluded) return false;
    }
  }

  // 12. Custom fields
  if (filters.customFieldSlug && filters.customFieldValue) {
    const val = subject.customFieldValues?.[filters.customFieldSlug];
    if (!val || !val.toLowerCase().includes(filters.customFieldValue.toLowerCase())) {
      return false;
    }
  }

  return true;
}

/**
 * Counts total active tactical filters applied
 */
export function countActiveTacticalFilters(filters: UnifiedPersonFilterState): number {
  let count = 0;
  if (filters.managementLevels.length > 0) count += filters.managementLevels.length;
  if (filters.threatLevels.length > 0) count += filters.threatLevels.length;
  if (filters.residenceStatuses.length > 0) count += filters.residenceStatuses.length;
  if (filters.gender) count++;
  if (filters.caseId) count++;
  if (filters.involvementTypes.length > 0) count += filters.involvementTypes.length;
  if (filters.verificationStatuses.length > 0) count += filters.verificationStatuses.length;
  if (filters.criminalRecordFilter !== 'all') count++;
  if (filters.criminalCharge) count++;
  if (filters.gangId) count++;
  if (filters.gangRole) count++;
  if (filters.markTypes.length > 0) count += filters.markTypes.length;
  if (filters.vehicleType) count++;
  if (filters.onlySuspiciousVehicles) count++;
  if (filters.onlyMuleAccounts) count++;
  if (filters.groupId) count++;
  if (filters.includeGroupIds.length > 0) count += filters.includeGroupIds.length;
  if (filters.excludeGroupIds.length > 0) count += filters.excludeGroupIds.length;
  if (filters.city) count++;
  if (filters.region) count++;
  if (filters.country) count++;
  if (filters.radiusKm && filters.radiusKm > 0) count++;
  if (filters.onlyWithinRadius) count++;
  if (filters.activeCasesOnly) count++;
  if (filters.showRuledOut === false) count++;
  if (filters.customFieldSlug) count++;
  return count;
}
