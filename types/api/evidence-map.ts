export type MarkerType =
  | 'CAMERA'
  | 'BTS'
  | 'CRIME_SCENE'
  | 'PHYSICAL_EVIDENCE'
  | 'WITNESS'
  | 'CUSTOM';

export type CameraStatus = 'CAPTURED' | 'CLEAR' | 'BLIND_BROKEN';

export type RouteType = 'CONFIRMED_PATH' | 'SUSPECTED_PATH' | 'RELATION_LINK';

export type DrawingType =
  | 'FREEHAND'
  | 'LINE'
  | 'POLYGON'
  | 'RECTANGLE'
  | 'CIRCLE'
  | 'TEXT';

export interface LinkedPersonSummary {
  id: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
  photo?: string | null;
}

export interface EvidenceMapMarker {
  id: string;
  eventId: string;
  personId: string | null;
  person?: LinkedPersonSummary | null;
  markerType: MarkerType;
  label: string;
  description: string | null;
  latitude: number;
  longitude: number;
  occurredAt: string | null;
  color: string | null;
  mediaUrl: string | null;
  mediaType?: 'IMAGE' | 'VIDEO' | null;
  cameraDirection: number | null;
  cameraFovDeg: number | null;
  cameraStatus: CameraStatus | null;
  rawTimeNote: string | null;
  btsCode: string | null;
  btsCarrier: string | null;
  btsRadiusMeters: number | null;
  btsAzimuthDeg: number | null;
  subscriberInfo: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  markerId?: string;
  timestamp?: string | null;
  label?: string;
}

export interface EvidenceMapRoute {
  id: string;
  eventId: string;
  personId: string | null;
  person?: LinkedPersonSummary | null;
  label: string;
  routeType: RouteType;
  color: string;
  waypoints: RouteWaypoint[];
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DrawingCoord {
  lat: number;
  lng: number;
}

export interface EvidenceMapDrawing {
  id: string;
  eventId: string;
  drawingType: DrawingType;
  label: string | null;
  notes: string | null;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: 'SOLID' | 'DASHED';
  fillColor: string | null;
  fillOpacity: number;
  coordinates: DrawingCoord[];
  radiusMeters: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvidenceMapOverview {
  markers: EvidenceMapMarker[];
  routes: EvidenceMapRoute[];
  drawings: EvidenceMapDrawing[];
  defaultCenter: { latitude: number; longitude: number } | null;
}

