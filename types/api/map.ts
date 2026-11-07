import type { DashboardCaseLink } from './dashboard';

export interface MapGroup {
  id: string;
  name: string;
  color: string | null;
}

export interface MapGang {
  id: string;
  name: string;
  color: string | null;
}

export interface MapCase {
  id: string;
  title: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

export interface MapMarker {
  id: string;
  source: 'address' | 'location' | 'event_address';
  personId: string;
  personName: string;
  latitude: number;
  longitude: number;
  label: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  addressText: string | null;
  groupIds: string[];
  hasPhoto: boolean;
  groupColor: string | null;
  markerType?: string;
  eventStatus?: string;
  managementLevel?: string | null;
  threatLevel?: string | null;
  residenceStatus?: string | null;
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
  caseLinks?: DashboardCaseLink[];
}

export interface UnlocatedPerson {
  personId: string;
  personName: string;
  failedCount: number;
}

export interface UnmappedSubject {
  personId: string;
  personName: string;
  groupIds: string[];
  groupColor: string | null;
  caseLinks?: DashboardCaseLink[];
}

export interface MapMarkersResponse {
  markers: MapMarker[];
  groups: MapGroup[];
  gangs: MapGang[];
  cases?: MapCase[];
  unmappedSubjects?: UnmappedSubject[];
  pendingCount: number;
  failedCount: number;
  unlocatedPeople: UnlocatedPerson[];
  geocodingEnabled: boolean;
}

