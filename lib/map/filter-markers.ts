import type { MapMarker } from './types';

export interface MapFilterState {
  query: string;
  groupId: string;
  city: string;
  region: string;
  country: string;
  caseId?: string;
  radiusKm?: number;
  onlyWithinRadius?: boolean;
  activeCasesOnly?: boolean;
  showRuledOut?: boolean;
}

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

export function filterMarkers(markers: MapMarker[], filters: MapFilterState): MapMarker[] {
  const query = filters.query.trim().toLowerCase();
  const city = filters.city.trim().toLowerCase();
  const region = filters.region.trim().toLowerCase();
  const caseId = filters.caseId?.trim() || '';
  const radiusKm = filters.radiusKm ?? 0;
  const onlyWithinRadius = Boolean(filters.onlyWithinRadius);
  const activeCasesOnly = Boolean(filters.activeCasesOnly);
  const showRuledOut = filters.showRuledOut !== false;

  const crimeSceneMarkers = caseId
    ? markers.filter((m) => m.source === 'event_address' && m.personId === caseId)
    : [];

  return markers.filter((marker) => {
    if (query && !marker.personName.toLowerCase().includes(query)) return false;
    if (filters.groupId && !marker.groupIds.includes(filters.groupId)) return false;
    if (city && (marker.city ?? '').toLowerCase() !== city) return false;
    if (region && (marker.region ?? '').toLowerCase() !== region) return false;
    if (filters.country && marker.country !== filters.country) return false;

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
      return true;
    }

    // Subject marker filtering when a Case is selected
    if (caseId && !showRuledOut && marker.caseLinks) {
      const linkForCase = marker.caseLinks.find((l) => l.eventId === caseId);
      if (linkForCase && linkForCase.verificationStatus === 'RULED_OUT') {
        return false;
      }
    }

    if (caseId && onlyWithinRadius && radiusKm > 0 && crimeSceneMarkers.length > 0) {
      const withinAnyScene = crimeSceneMarkers.some(
        (scene) =>
          haversineDistanceKm(scene.latitude, scene.longitude, marker.latitude, marker.longitude) <=
          radiusKm,
      );
      if (!withinAnyScene) return false;
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
