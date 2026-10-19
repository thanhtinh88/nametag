import type { MapMarker } from './types';
import {
  type UnifiedPersonFilterState,
  DEFAULT_PERSON_FILTER_STATE,
  matchesPersonTacticalFilters,
} from '@/lib/filters/person-filter-types';

export type MapFilterState = UnifiedPersonFilterState & {
  inspectedPersonId?: string | null;
};

/** Calculates great-circle distance in kilometers between two coordinates using the Haversine formula. */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function filterMarkers(markers: MapMarker[], filters: Partial<MapFilterState>): MapMarker[] {
  const resolvedFilters: MapFilterState = {
    ...DEFAULT_PERSON_FILTER_STATE,
    ...filters,
  };
  const query = resolvedFilters.query.trim().toLowerCase();
  const city = (resolvedFilters.city ?? '').trim().toLowerCase();
  const region = (resolvedFilters.region ?? '').trim().toLowerCase();
  const caseId = resolvedFilters.caseId?.trim() || '';
  const personId = resolvedFilters.personId?.trim() || '';
  const inspectedPersonId = resolvedFilters.inspectedPersonId?.trim() || '';
  const radiusKm = resolvedFilters.radiusKm ?? 0;
  const onlyWithinRadius = Boolean(resolvedFilters.onlyWithinRadius);
  const activeCasesOnly = Boolean(resolvedFilters.activeCasesOnly);

  const crimeSceneMarkers = caseId
    ? markers.filter((m) => m.source === 'event_address' && m.personId === caseId)
    : [];

  const targetPersonMarker = personId
    ? markers.find(
        (m) =>
          m.personId === personId &&
          m.source !== 'event_address' &&
          m.latitude !== null &&
          m.longitude !== null,
      ) ?? markers.find((m) => m.personId === personId)
    : null;

  return markers.filter((marker) => {
    // Basic search query
    if (query && !marker.personName.toLowerCase().includes(query)) return false;

    // Handle crime scene markers (event addresses)
    if (marker.source === 'event_address') {
      if (caseId && marker.personId !== caseId) return false;
      if (
        activeCasesOnly &&
        !caseId &&
        marker.eventStatus &&
        marker.eventStatus !== 'PLANNED' &&
        marker.eventStatus !== 'ONGOING'
      ) {
        return false;
      }
      if (city && (marker.city ?? '').toLowerCase() !== city) return false;
      if (region && (marker.region ?? '').toLowerCase() !== region) return false;
      if (filters.country && marker.country !== filters.country) return false;

      // If filtering within radius of a target person, apply to crime scenes too
      if (personId && onlyWithinRadius && radiusKm > 0 && targetPersonMarker) {
        const dist = haversineDistanceKm(
          targetPersonMarker.latitude,
          targetPersonMarker.longitude,
          marker.latitude,
          marker.longitude,
        );
        if (dist > radiusKm) return false;
      }
      return true;
    }

    // Handle subject markers: apply full tactical filters (managementLevel, threatLevel, gang, record, etc.)
    const isLinkedToSelectedCase = Boolean(
      caseId && marker.caseLinks?.some((cl) => cl.eventId === caseId)
    );
    const isInspected = Boolean(
      inspectedPersonId && marker.personId === inspectedPersonId
    );

    let withinCaseRadius = false;
    if (caseId && onlyWithinRadius && radiusKm > 0 && crimeSceneMarkers.length > 0) {
      withinCaseRadius = crimeSceneMarkers.some(
        (scene) =>
          haversineDistanceKm(scene.latitude, scene.longitude, marker.latitude, marker.longitude) <=
          radiusKm
      );
    }

    if (caseId) {
      if (isInspected) {
        // User explicitly inspected this subject -> always pass case-level exclusion
      } else if (onlyWithinRadius && radiusKm > 0 && crimeSceneMarkers.length > 0) {
        if (!isLinkedToSelectedCase && !withinCaseRadius) return false;
      } else {
        if (!isLinkedToSelectedCase) return false;
      }
    }

    const tacticalFiltersToApply = caseId
      ? { ...resolvedFilters, caseId: undefined }
      : resolvedFilters;
    if (!matchesPersonTacticalFilters(marker, tacticalFiltersToApply)) {
      return false;
    }

    if (caseId && isLinkedToSelectedCase) {
      const targetLink = marker.caseLinks?.find((l) => l.eventId === caseId);
      if (targetLink && resolvedFilters.showRuledOut === false && targetLink.verificationStatus === 'RULED_OUT') {
        return false;
      }
      if (resolvedFilters.involvementTypes.length > 0) {
        if (!targetLink || !resolvedFilters.involvementTypes.includes(targetLink.involvementType)) return false;
      }
      if (resolvedFilters.verificationStatuses.length > 0) {
        if (!targetLink || !resolvedFilters.verificationStatuses.includes(targetLink.verificationStatus)) return false;
      }
    }

    if (isInspected) return true;

    // Geographic filters
    if (city && (marker.city ?? '').toLowerCase() !== city) return false;
    if (region && (marker.region ?? '').toLowerCase() !== region) return false;
    if (filters.country && marker.country !== filters.country) return false;

    // Direct person focus (if user selected a specific person and no case is active, and radius is not restricted to surrounding)
    if (!caseId && personId && !onlyWithinRadius && marker.personId !== personId) {
      return false;
    }

    // Radius filtering around selected person (when no case is active)
    if (!caseId && personId && onlyWithinRadius && radiusKm > 0 && targetPersonMarker) {
      const dist = haversineDistanceKm(
        targetPersonMarker.latitude,
        targetPersonMarker.longitude,
        marker.latitude,
        marker.longitude,
      );
      if (dist > radiusKm) return false;
    }

    return true;
  });
}

export function distinctCities(markers: MapMarker[]): string[] {
  const seen = new Map<string, string>();
  for (const marker of markers) {
    if (marker.city) {
      const key = marker.city.toLowerCase();
      if (!seen.has(key)) seen.set(key, marker.city);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function distinctRegions(markers: MapMarker[]): string[] {
  const seen = new Map<string, string>();
  for (const marker of markers) {
    if (marker.region) {
      const key = marker.region.toLowerCase();
      if (!seen.has(key)) seen.set(key, marker.region);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function distinctCountries(markers: MapMarker[]): string[] {
  const seen = new Set<string>();
  for (const marker of markers) {
    if (marker.country) seen.add(marker.country);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
