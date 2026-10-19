import { describe, it, expect } from 'vitest';
import {
  matchesPersonTacticalFilters,
  countActiveTacticalFilters,
  DEFAULT_PERSON_FILTER_STATE,
  type PersonTacticalData,
  type UnifiedPersonFilterState,
} from '@/lib/filters/person-filter-types';

function createSamplePerson(overrides: Partial<PersonTacticalData> = {}): PersonTacticalData {
  return {
    id: 'p1',
    managementLevel: 'CAT_A',
    threatLevel: 'HIGH',
    residenceStatus: 'PERMANENT',
    gender: 'MALE',
    hasCriminalRecord: true,
    hasActiveConviction: true,
    criminalRecordCharges: ['Trộm cắp tài sản'],
    gangIds: ['gang-1'],
    gangRoles: ['LEADER'],
    hasSuspiciousVehicle: true,
    vehicleTypes: ['CAR'],
    hasMuleAccount: false,
    markTypes: ['TATTOO'],
    caseLinks: [
      {
        eventId: 'case-101',
        role: 'CHỦ MƯU',
        involvementType: 'CHỦ MƯU',
        verificationStatus: 'CONFIRMED',
      },
    ],
    customFieldValues: {
      'tier-special': 'yes',
      'vip': 'true',
    },
    ...overrides,
  };
}

describe('matchesPersonTacticalFilters', () => {
  it('returns true when default filters are active', () => {
    const person = createSamplePerson();
    expect(matchesPersonTacticalFilters(person, DEFAULT_PERSON_FILTER_STATE)).toBe(true);
  });

  describe('Category 1: Management & Threat Level', () => {
    it('filters by managementLevel array', () => {
      const person = createSamplePerson({ managementLevel: 'CAT_A' });
      const matching: UnifiedPersonFilterState = {
        ...DEFAULT_PERSON_FILTER_STATE,
        managementLevels: ['CAT_A', 'CAT_B'],
      };
      const nonMatching: UnifiedPersonFilterState = {
        ...DEFAULT_PERSON_FILTER_STATE,
        managementLevels: ['CAT_C'],
      };
      expect(matchesPersonTacticalFilters(person, matching)).toBe(true);
      expect(matchesPersonTacticalFilters(person, nonMatching)).toBe(false);
    });

    it('filters by threatLevel array', () => {
      const person = createSamplePerson({ threatLevel: 'HIGH' });
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          threatLevels: ['CRITICAL', 'HIGH'],
        }),
      ).toBe(true);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          threatLevels: ['LOW'],
        }),
      ).toBe(false);
    });

    it('filters by residenceStatus', () => {
      const person = createSamplePerson({ residenceStatus: 'PERMANENT' });
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          residenceStatuses: ['TEMPORARY'],
        }),
      ).toBe(false);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          residenceStatuses: ['PERMANENT'],
        }),
      ).toBe(true);
    });

    it('filters by gender', () => {
      const person = createSamplePerson({ gender: 'MALE' });
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          gender: 'FEMALE',
        }),
      ).toBe(false);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          gender: 'MALE',
        }),
      ).toBe(true);
    });
  });

  describe('Category 2: Case & Legal Involvements', () => {
    it('filters by caseId', () => {
      const person = createSamplePerson();
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          caseId: 'case-101',
        }),
      ).toBe(true);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          caseId: 'case-999',
        }),
      ).toBe(false);
    });

    it('filters by involvementTypes', () => {
      const person = createSamplePerson();
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          involvementTypes: ['CHỦ MƯU'],
        }),
      ).toBe(true);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          involvementTypes: ['GIÚP SỨC'],
        }),
      ).toBe(false);
    });

    it('filters by verificationStatuses', () => {
      const person = createSamplePerson();
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          verificationStatuses: ['CONFIRMED'],
        }),
      ).toBe(true);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          verificationStatuses: ['RULED_OUT'],
        }),
      ).toBe(false);
    });

    it('filters ruled out subjects when showRuledOut is false', () => {
      const ruledOutPerson = createSamplePerson({
        caseLinks: [
          { eventId: 'case-101', involvementType: 'NGHI PHẠM', verificationStatus: 'RULED_OUT' },
        ],
      });
      expect(
        matchesPersonTacticalFilters(ruledOutPerson, {
          ...DEFAULT_PERSON_FILTER_STATE,
          showRuledOut: false,
        }),
      ).toBe(false);
      expect(
        matchesPersonTacticalFilters(ruledOutPerson, {
          ...DEFAULT_PERSON_FILTER_STATE,
          showRuledOut: true,
        }),
      ).toBe(true);
    });
  });

  describe('Category 3: Criminal Records & Gangs', () => {
    it('filters by criminalRecordFilter', () => {
      const cleanPerson = createSamplePerson({
        hasCriminalRecord: false,
        hasActiveConviction: false,
        criminalRecordCharges: [],
      });
      const recordPerson = createSamplePerson();

      expect(
        matchesPersonTacticalFilters(cleanPerson, {
          ...DEFAULT_PERSON_FILTER_STATE,
          criminalRecordFilter: 'has_record',
        }),
      ).toBe(false);
      expect(
        matchesPersonTacticalFilters(recordPerson, {
          ...DEFAULT_PERSON_FILTER_STATE,
          criminalRecordFilter: 'has_record',
        }),
      ).toBe(true);
      expect(
        matchesPersonTacticalFilters(cleanPerson, {
          ...DEFAULT_PERSON_FILTER_STATE,
          criminalRecordFilter: 'no_record',
        }),
      ).toBe(true);
    });

    it('filters by criminalCharge keyword', () => {
      const person = createSamplePerson();
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          criminalCharge: 'trộm cắp',
        }),
      ).toBe(true);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          criminalCharge: 'ma túy',
        }),
      ).toBe(false);
    });

    it('filters by gangId and gangRole', () => {
      const person = createSamplePerson();
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          gangId: 'gang-1',
          gangRole: 'LEADER',
        }),
      ).toBe(true);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          gangId: 'gang-2',
        }),
      ).toBe(false);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          gangId: 'gang-1',
          gangRole: 'MEMBER',
        }),
      ).toBe(false);
    });
  });

  describe('Category 4: Biometrics, Vehicles & Finance', () => {
    it('filters by markTypes', () => {
      const person = createSamplePerson();
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          markTypes: ['TATTOO'],
        }),
      ).toBe(true);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          markTypes: ['SCAR'],
        }),
      ).toBe(false);
    });

    it('filters by vehicleType and onlySuspiciousVehicles', () => {
      const person = createSamplePerson();
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          vehicleType: 'CAR',
          onlySuspiciousVehicles: true,
        }),
      ).toBe(true);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          vehicleType: 'MOTORBIKE',
        }),
      ).toBe(false);
    });

    it('filters by onlyMuleAccounts', () => {
      const person = createSamplePerson({ hasMuleAccount: false });
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          onlyMuleAccounts: true,
        }),
      ).toBe(false);

      const mulePerson = createSamplePerson({ hasMuleAccount: true });
      expect(
        matchesPersonTacticalFilters(mulePerson, {
          ...DEFAULT_PERSON_FILTER_STATE,
          onlyMuleAccounts: true,
        }),
      ).toBe(true);
    });
  });

  describe('Category 5: Groups & Custom Fields', () => {
    it('filters by customFields matching', () => {
      const person = createSamplePerson({ customFieldValues: { vip: 'true' } });
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          customFieldSlug: 'vip',
          customFieldValue: 'true',
        }),
      ).toBe(true);
      expect(
        matchesPersonTacticalFilters(person, {
          ...DEFAULT_PERSON_FILTER_STATE,
          customFieldSlug: 'vip',
          customFieldValue: 'false',
        }),
      ).toBe(false);
    });
  });
});

describe('countActiveTacticalFilters', () => {
  it('returns 0 for default state', () => {
    expect(countActiveTacticalFilters(DEFAULT_PERSON_FILTER_STATE)).toBe(0);
  });

  it('accurately counts multi-category filters', () => {
    const filters: UnifiedPersonFilterState = {
      ...DEFAULT_PERSON_FILTER_STATE,
      managementLevels: ['CAT_A'], // +1
      threatLevels: ['HIGH'], // +1
      gangId: 'gang-1', // +1
      onlySuspiciousVehicles: true, // +1
      customFieldSlug: 'vip', // +1
    };
    expect(countActiveTacticalFilters(filters)).toBe(5);
  });
});

