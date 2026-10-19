import type { MapMarker } from './types';
import {
  type UnifiedPersonFilterState,
  DEFAULT_PERSON_FILTER_STATE,
  matchesPersonTacticalFilters,
} from '@/lib/filters/person-filter-types';

export type MapFilterState = UnifiedPersonFilterState;

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
  const resolvedFilters: UnifiedPersonFilterState = {
    ...DEFAULT_PERSON_FILTER_STATE,
    ...filters,
  };
  const query = resolvedFilters.query.trim().toLowerCase();
  const city = (resolvedFilters.city ?? '').trim().toLowerCase();
  const region = (resolvedFilters.region ?? '').trim().toLowerCase();
  const caseId = resolvedFilters.caseId?.trim() || '';
  const personId = resolvedFilters.personId?.trim() || '';
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
    if (!matchesPersonTacticalFilters(marker, resolvedFilters)) {
      return false;
    }

    // Geographic filters
    if (city && (marker.city ?? '').toLowerCase() !== city) return false;
    if (region && (marker.region ?? '').toLowerCase() !== region) return false;
    if (filters.country && marker.country !== filters.country) return false;

    // Direct person focus (if user selected a specific person and radius is not restricted to surrounding)
    if (personId && !onlyWithinRadius && marker.personId !== personId) {
      return false;
    }

    // Radius filtering around selected case's crime scene(s)
    if (caseId && onlyWithinRadius && radiusKm > 0 && crimeSceneMarkers.length > 0) {
      const withinAnyScene = crimeSceneMarkers.some(
        (scene) =>
          haversineDistanceKm(scene.latitude, scene.longitude, marker.latitude, marker.longitude) <=
          radiusKm,
      );
      if (!withinAnyScene) return false;
    }

    // Radius filtering around selected person
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
