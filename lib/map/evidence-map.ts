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
  mediaType: 'IMAGE' | 'VIDEO' | null;
  // Camera fields
  cameraDirection: number | null;
  cameraFovDeg: number | null;
  cameraStatus: CameraStatus | null;
  rawTimeNote: string | null;
  // BTS fields
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

export interface EvidenceMapPayload {
  markers: EvidenceMapMarker[];
  routes: EvidenceMapRoute[];
  drawings: EvidenceMapDrawing[];
  defaultCenter: { latitude: number; longitude: number } | null;
}

export interface LayerVisibilityState {
  cameras: boolean;
  cameraFov: boolean;
  bts: boolean;
  btsCoverage: boolean;
  evidence: boolean; // CRIME_SCENE, PHYSICAL_EVIDENCE, WITNESS
  customMarkers: boolean; // CUSTOM
  routes: boolean;
  drawings: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibilityState = {
  cameras: true,
  cameraFov: true,
  bts: true,
  btsCoverage: true,
  evidence: true,
  customMarkers: true,
  routes: true,
  drawings: true,
};

/** Haversine distance in meters between two WGS84 coordinates */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface RouteMetrics {
  totalDistanceMeters: number;
  durationSeconds: number | null;
  avgSpeedKmh: number | null;
  isUnrealisticSpeed: boolean;
}

/** Calculate total distance, duration, and average speed for a sequence of waypoints */
export function computeRouteMetrics(waypoints: RouteWaypoint[]): RouteMetrics {
  if (!waypoints || waypoints.length < 2) {
    return {
      totalDistanceMeters: 0,
      durationSeconds: null,
      avgSpeedKmh: null,
      isUnrealisticSpeed: false,
    };
  }

  let totalDistanceMeters = 0;
  for (let i = 1; i < waypoints.length; i++) {
    totalDistanceMeters += haversineMeters(
      waypoints[i - 1].lat,
      waypoints[i - 1].lng,
      waypoints[i].lat,
      waypoints[i].lng
    );
  }

  const timestamps = waypoints
    .map((w) => (w.timestamp ? new Date(w.timestamp).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));

  if (timestamps.length >= 2) {
    const first = timestamps[0];
    const last = timestamps[timestamps.length - 1];
    const durationSeconds = Math.abs(last - first) / 1000;
    if (durationSeconds > 0) {
      const avgSpeedKmh = (totalDistanceMeters / 1000) / (durationSeconds / 3600);
      return {
        totalDistanceMeters,
        durationSeconds,
        avgSpeedKmh,
        isUnrealisticSpeed: avgSpeedKmh > 110,
      };
    }
  }

  return {
    totalDistanceMeters,
    durationSeconds: null,
    avgSpeedKmh: null,
    isUnrealisticSpeed: false,
  };
}

/** Project a point from (lat, lng) by bearing (degrees clockwise from North) and distance (meters) */
export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceMeters: number
): [number, number] {
  const R = 6371000;
  const d = distanceMeters / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

/** Build a GeoJSON Polygon representing a camera's Field of View cone or a BTS sector */
export function buildSectorConeCoords(
  lat: number,
  lng: number,
  directionDeg: number,
  fovDeg: number = 60,
  rangeMeters: number = 45,
  steps: number = 24
): [number, number][] {
  const halfAngle = Math.max(5, Math.min(180, fovDeg / 2));
  const startAngle = directionDeg - halfAngle;
  const endAngle = directionDeg + halfAngle;
  const ring: [number, number][] = [[lng, lat]];

  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + ((endAngle - startAngle) * i) / steps;
    ring.push(destinationPoint(lat, lng, angle, rangeMeters));
  }
  ring.push([lng, lat]);
  return ring;
}

/** Build a GeoJSON Polygon ring approximating a circle of `radiusMeters` around `(lat, lng)` */
export function buildCircleCoords(
  lat: number,
  lng: number,
  radiusMeters: number,
  steps: number = 64
): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 360;
    ring.push(destinationPoint(lat, lng, angle, radiusMeters));
  }
  return ring;
}

/** Ramer-Douglas-Peucker simplification for freehand pencil paths */
export function simplifyDrawingCoords(
  coords: DrawingCoord[],
  toleranceDeg: number = 0.000015
): DrawingCoord[] {
  if (coords.length <= 3) return coords;

  const sqTolerance = toleranceDeg * toleranceDeg;

  function getSqSegDist(p: DrawingCoord, p1: DrawingCoord, p2: DrawingCoord): number {
    let x = p1.lng;
    let y = p1.lat;
    let dx = p2.lng - x;
    let dy = p2.lat - y;

    if (dx !== 0 || dy !== 0) {
      const t = ((p.lng - x) * dx + (p.lat - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = p2.lng;
        y = p2.lat;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }

    dx = p.lng - x;
    dy = p.lat - y;
    return dx * dx + dy * dy;
  }

  function simplifyDPStep(
    points: DrawingCoord[],
    first: number,
    last: number,
    sqTol: number,
    simplified: DrawingCoord[]
  ) {
    let maxSqDist = sqTol;
    let index = 0;

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSqSegDist(points[i], points[first], points[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTol) {
      if (index - first > 1) simplifyDPStep(points, first, index, sqTol, simplified);
      simplified.push(points[index]);
      if (last - index > 1) simplifyDPStep(points, index, last, sqTol, simplified);
    }
  }

  const last = coords.length - 1;
  const simplified: DrawingCoord[] = [coords[0]];
  simplifyDPStep(coords, 0, last, sqTolerance, simplified);
  simplified.push(coords[last]);
  return simplified;
}

