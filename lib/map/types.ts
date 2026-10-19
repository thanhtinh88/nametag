// lib/map/types.ts

export interface MapCaseLink {
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  role: string | null;
  involvementType: string;
  verificationStatus: string;
  confidence: string | null;
}

export interface MapCase {
  id: string;
  title: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

import type { PersonTacticalData } from '@/lib/filters/person-filter-types';

/** One plottable point: a geocoded address or a vCard GEO location. */
export interface MapMarker extends PersonTacticalData {
  /** "addr_<addressId>", "loc_<locationId>", or "evaddr_<eventAddressId>", used by /map?focus= deep links */
  id: string;
  source: 'address' | 'location' | 'event_address';
  personId: string;
  personName: string;
  latitude: number;
  longitude: number;
  /** Address/location type or label, e.g. "home" */
  label: string;
  city: string | null;
  /** State/Province (address region), null for GEO locations */
  region: string | null;
  /** Full address as a single line for the marker popup; null for GEO locations */
  addressText: string | null;
  country: string | null;
  groupIds: string[];
  /** Whether the contact has a photo, used to render a photo thumbnail marker instead of a dot */
  hasPhoto: boolean;
  /** First group's color (in returned order), like the network graph; null falls back to the default dot color */
  groupColor: string | null;
  /** Optional investigation metadata when events are loaded */
  markerType?: 'subject' | 'crime_scene';
  eventStatus?: string;
  caseLinks?: MapCaseLink[];
}

export interface MapGroup {
  id: string;
  name: string;
  color: string | null;
}

/** A contact with at least one address the geocoder could not locate */
export interface UnlocatedPerson {
  personId: string;
  personName: string;
  failedCount: number;
}

/** A subject who has no geocoded markers on the map at all */
export interface UnmappedSubject {
  personId: string;
  personName: string;
  groupIds: string[];
  groupColor: string | null;
  caseLinks?: MapCaseLink[];
}

export interface MapMarkersResponse {
  markers: MapMarker[];
  groups: MapGroup[];
  gangs?: Array<{ id: string; name: string; color: string | null }>;
  cases?: MapCase[];
  unmappedSubjects?: UnmappedSubject[];
  pendingCount: number;
  failedCount: number;
  /** Contacts with failed addresses, name-sorted, for the map's unlocated drawer */
  unlocatedPeople: UnlocatedPerson[];
  /** The user's geocoding privacy toggle, used by the map's empty state */
  geocodingEnabled: boolean;
}
