import { describe, it, expect } from 'vitest';
import { filterMarkers, distinctCities, distinctCountries, distinctRegions } from '../../lib/map/filter-markers';
import type { MapMarker } from '../../lib/map/types';

function marker(overrides: Partial<MapMarker>): MapMarker {
  return {
    id: 'addr_1',
    source: 'address',
    personId: 'p1',
    personName: 'Alice Smith',
    latitude: 0,
    longitude: 0,
    label: 'home',
    city: 'London',
    region: 'Greater London',
    country: 'GB',
    addressText: null,
    groupIds: ['g1'],
    hasPhoto: false,
    groupColor: null,
    ...overrides,
  };
}

const markers: MapMarker[] = [
  marker({ id: 'addr_1', personName: 'Alice Smith', city: 'London', region: 'Greater London', country: 'GB', groupIds: ['g1'] }),
  marker({ id: 'addr_2', personName: 'Bob Jones', city: 'Paris', region: 'Ile-de-France', country: 'FR', groupIds: ['g2'] }),
  marker({ id: 'loc_1', source: 'location', personName: 'Carol King', city: null, region: null, country: null, groupIds: [] }),
];

const noFilters = { query: '', groupId: '', city: '', region: '', country: '' };

describe('filterMarkers', () => {
  it('returns everything when no filters are set', () => {
    expect(filterMarkers(markers, noFilters)).toHaveLength(3);
  });

  it('filters by name, case-insensitively', () => {
    const result = filterMarkers(markers, { ...noFilters, query: 'alice' });
    expect(result.map((m) => m.id)).toEqual(['addr_1']);
  });

  it('filters by group', () => {
    const result = filterMarkers(markers, { ...noFilters, groupId: 'g2' });
    expect(result.map((m) => m.id)).toEqual(['addr_2']);
  });

  it('filters by city and by country', () => {
    expect(filterMarkers(markers, { ...noFilters, city: 'london' }).map((m) => m.id)).toEqual(['addr_1']);
    expect(filterMarkers(markers, { ...noFilters, country: 'FR' }).map((m) => m.id)).toEqual(['addr_2']);
  });

  it('filters by region, case-insensitively', () => {
    expect(filterMarkers(markers, { ...noFilters, region: 'ile-de-france' }).map((m) => m.id)).toEqual(['addr_2']);
  });

  it('combines filters with AND semantics', () => {
    expect(filterMarkers(markers, { ...noFilters, query: 'alice', country: 'FR' })).toHaveLength(0);
  });

  it('filters by radius around a target person', () => {
    const geoMarkers: MapMarker[] = [
      marker({ id: 'addr_a', personId: 'pA', personName: 'Person A', latitude: 21.03, longitude: 105.85 }),
      marker({ id: 'addr_b', personId: 'pB', personName: 'Person B', latitude: 21.035, longitude: 105.855 }), // ~0.76 km away
      marker({ id: 'addr_c', personId: 'pC', personName: 'Person C', latitude: 21.15, longitude: 105.85 }), // ~13.3 km away
    ];
    const filtered1km = filterMarkers(geoMarkers, {
      ...noFilters,
      personId: 'pA',
      radiusKm: 1,
      onlyWithinRadius: true,
    });
    expect(filtered1km.map((m) => m.id)).toEqual(['addr_a', 'addr_b']);

    const filtered500m = filterMarkers(geoMarkers, {
      ...noFilters,
      personId: 'pA',
      radiusKm: 0.5,
      onlyWithinRadius: true,
    });
    expect(filtered500m.map((m) => m.id)).toEqual(['addr_a']);
  });

  it('filters by case: returns crime scene and linked subjects only when radius is off', () => {
    const caseMarkers: MapMarker[] = [
      marker({ id: 'ev_1', source: 'event_address', personId: 'case_1', latitude: 21.03, longitude: 105.85 }),
      marker({ id: 'ev_2', source: 'event_address', personId: 'case_2', latitude: 21.05, longitude: 105.85 }),
      marker({
        id: 'addr_linked',
        personId: 'p_linked',
        latitude: 21.032,
        longitude: 105.852,
        caseLinks: [{ eventId: 'case_1', eventTitle: 'Case 1', eventStatus: 'ONGOING', role: 'SUSPECT', involvementType: 'SUSPECT', verificationStatus: 'CONFIRMED', confidence: null }],
      }),
      marker({ id: 'addr_unrelated', personId: 'p_unrelated', latitude: 21.031, longitude: 105.851 }),
    ];

    const result = filterMarkers(caseMarkers, {
      ...noFilters,
      caseId: 'case_1',
      onlyWithinRadius: false,
    });
    expect(result.map((m) => m.id)).toEqual(['ev_1', 'addr_linked']);
  });

  it('filters by case with radius: returns crime scene, linked subjects, and other subjects within radius', () => {
    const caseMarkers: MapMarker[] = [
      marker({ id: 'ev_1', source: 'event_address', personId: 'case_1', latitude: 21.03, longitude: 105.85 }),
      marker({
        id: 'addr_linked',
        personId: 'p_linked',
        latitude: 21.08,
        longitude: 105.85, // ~5.5km away
        caseLinks: [{ eventId: 'case_1', eventTitle: 'Case 1', eventStatus: 'ONGOING', role: 'SUSPECT', involvementType: 'SUSPECT', verificationStatus: 'CONFIRMED', confidence: null }],
      }),
      marker({ id: 'addr_nearby', personId: 'p_nearby', latitude: 21.033, longitude: 105.852 }), // ~0.4km away
      marker({ id: 'addr_far', personId: 'p_far', latitude: 21.15, longitude: 105.85 }), // ~13km away
    ];

    const result = filterMarkers(caseMarkers, {
      ...noFilters,
      caseId: 'case_1',
      radiusKm: 1,
      onlyWithinRadius: true,
    });
    expect(result.map((m) => m.id)).toEqual(['ev_1', 'addr_linked', 'addr_nearby']);
  });

  it('includes an inspected candidate subject even when outside case radius or not linked', () => {
    const caseMarkers: MapMarker[] = [
      marker({ id: 'ev_1', source: 'event_address', personId: 'case_1', latitude: 21.03, longitude: 105.85 }),
      marker({
        id: 'addr_linked',
        personId: 'p_linked',
        latitude: 21.032,
        longitude: 105.852,
        caseLinks: [{ eventId: 'case_1', eventTitle: 'Case 1', eventStatus: 'ONGOING', role: 'SUSPECT', involvementType: 'SUSPECT', verificationStatus: 'CONFIRMED', confidence: null }],
      }),
      marker({ id: 'addr_far', personId: 'p_far', latitude: 21.15, longitude: 105.85 }), // ~13km away
    ];

    // Case selected, radius is OFF (normally returns only ev_1 and addr_linked)
    const resultWithoutRadius = filterMarkers(caseMarkers, {
      ...noFilters,
      caseId: 'case_1',
      inspectedPersonId: 'p_far',
    });
    expect(resultWithoutRadius.map((m) => m.id)).toEqual(['ev_1', 'addr_linked', 'addr_far']);

    // Case selected with 1km radius (addr_far is 13km away)
    const resultWithRadius = filterMarkers(caseMarkers, {
      ...noFilters,
      caseId: 'case_1',
      radiusKm: 1,
      onlyWithinRadius: true,
      inspectedPersonId: 'p_far',
    });
    expect(resultWithRadius.map((m) => m.id)).toEqual(['ev_1', 'addr_linked', 'addr_far']);
  });

  it('does not let personId filter out other linked subjects when a case is active', () => {
    const caseMarkers: MapMarker[] = [
      marker({ id: 'ev_1', source: 'event_address', personId: 'case_1', latitude: 21.03, longitude: 105.85 }),
      marker({
        id: 'addr_linked_1',
        personId: 'p_1',
        latitude: 21.032,
        longitude: 105.852,
        caseLinks: [{ eventId: 'case_1', eventTitle: 'Case 1', eventStatus: 'ONGOING', role: 'SUSPECT', involvementType: 'SUSPECT', verificationStatus: 'CONFIRMED', confidence: null }],
      }),
      marker({
        id: 'addr_linked_2',
        personId: 'p_2',
        latitude: 21.033,
        longitude: 105.853,
        caseLinks: [{ eventId: 'case_1', eventTitle: 'Case 1', eventStatus: 'ONGOING', role: 'ACCOMPLICE', involvementType: 'ACCOMPLICE', verificationStatus: 'CONFIRMED', confidence: null }],
      }),
    ];

    const result = filterMarkers(caseMarkers, {
      ...noFilters,
      caseId: 'case_1',
      personId: 'p_1', // even if personId is passed, case subjects remain
    });
    expect(result.map((m) => m.id)).toEqual(['ev_1', 'addr_linked_1', 'addr_linked_2']);
  });
});

describe('distinct value helpers', () => {
  it('lists sorted distinct cities, skipping nulls', () => {
    expect(distinctCities(markers)).toEqual(['London', 'Paris']);
  });

  it('lists sorted distinct countries, skipping nulls', () => {
    expect(distinctCountries(markers)).toEqual(['FR', 'GB']);
  });

  it('lists sorted distinct regions, skipping nulls', () => {
    expect(distinctRegions(markers)).toEqual(['Greater London', 'Ile-de-France']);
  });
});
