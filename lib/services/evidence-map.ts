import { z } from 'zod';
import type {
  EventMapDrawing,
  EventMapMarker,
  EventMapRoute,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  CameraStatus,
  DrawingCoord,
  DrawingType,
  EvidenceMapDrawing,
  EvidenceMapMarker,
  EvidenceMapRoute,
  LinkedPersonSummary,
  MarkerType,
  RouteType,
  RouteWaypoint,
} from '@/lib/map/evidence-map';

export const markerTypeEnum = z.enum([
  'CAMERA',
  'BTS',
  'CRIME_SCENE',
  'PHYSICAL_EVIDENCE',
  'WITNESS',
  'CUSTOM',
]);

export const cameraStatusEnum = z.enum(['CAPTURED', 'CLEAR', 'BLIND_BROKEN']);

export const createMarkerSchema = z.object({
  markerType: markerTypeEnum.default('CAMERA'),
  personId: z.string().nullable().optional(),
  label: z.string().trim().min(1, 'Tên điểm không được để trống').max(200),
  description: z.string().max(5000).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  occurredAt: z.string().nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  mediaUrl: z.string().max(3_000_000).nullable().optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO']).nullable().optional(),
  // Camera fields
  cameraDirection: z.number().int().min(0).max(360).nullable().optional(),
  cameraFovDeg: z.number().int().min(10).max(360).nullable().optional(),
  cameraStatus: cameraStatusEnum.nullable().optional(),
  rawTimeNote: z.string().max(300).nullable().optional(),
  // BTS fields
  btsCode: z.string().max(150).nullable().optional(),
  btsCarrier: z.string().max(100).nullable().optional(),
  btsRadiusMeters: z.number().int().min(10).max(50000).nullable().optional(),
  btsAzimuthDeg: z.number().int().min(0).max(360).nullable().optional(),
  subscriberInfo: z.string().max(200).nullable().optional(),
});

export const updateMarkerSchema = createMarkerSchema.partial();

export const waypointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  markerId: z.string().optional(),
  timestamp: z.string().nullable().optional(),
  label: z.string().max(200).optional(),
});

export const createRouteSchema = z.object({
  personId: z.string().nullable().optional(),
  label: z.string().trim().min(1, 'Tên lộ trình không được để trống').max(200),
  routeType: z
    .enum(['CONFIRMED_PATH', 'SUSPECTED_PATH', 'RELATION_LINK'])
    .default('CONFIRMED_PATH'),
  color: z.string().max(32).default('#ef4444'),
  waypoints: z.array(waypointSchema).min(2, 'Lộ trình cần ít nhất 2 điểm'),
  notes: z.string().max(5000).nullable().optional(),
});

export const updateRouteSchema = createRouteSchema.partial();

export const drawingCoordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createDrawingSchema = z.object({
  drawingType: z
    .enum(['FREEHAND', 'LINE', 'POLYGON', 'RECTANGLE', 'CIRCLE', 'TEXT'])
    .default('POLYGON'),
  label: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  strokeColor: z.string().max(32).default('#f59e0b'),
  strokeWidth: z.number().int().min(1).max(16).default(3),
  strokeStyle: z.enum(['SOLID', 'DASHED']).default('SOLID'),
  fillColor: z.string().max(32).nullable().optional(),
  fillOpacity: z.number().min(0).max(1).default(0.2),
  coordinates: z.array(drawingCoordSchema).min(1),
  radiusMeters: z.number().min(1).max(100000).nullable().optional(),
});

export const updateDrawingSchema = createDrawingSchema.partial();

export const personSummarySelect = {
  id: true,
  name: true,
  surname: true,
  nickname: true,
  displayNameOverride: true,
  photo: true,
} as const;

export function serializeMarker(
  row: EventMapMarker & { person?: LinkedPersonSummary | null }
): EvidenceMapMarker {
  return {
    id: row.id,
    eventId: row.eventId,
    personId: row.personId ?? null,
    person: row.person ?? null,
    markerType: row.markerType as MarkerType,
    label: row.label,
    description: row.description ?? null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    occurredAt: row.occurredAt ? new Date(row.occurredAt).toISOString() : null,
    color: row.color ?? null,
    mediaUrl: row.mediaUrl ?? null,
    mediaType: (row.mediaType as 'IMAGE' | 'VIDEO' | null) ?? 'IMAGE',
    cameraDirection: row.cameraDirection ?? null,
    cameraFovDeg: row.cameraFovDeg ?? 60,
    cameraStatus: (row.cameraStatus as CameraStatus | null) ?? 'CAPTURED',
    rawTimeNote: row.rawTimeNote ?? null,
    btsCode: row.btsCode ?? null,
    btsCarrier: row.btsCarrier ?? null,
    btsRadiusMeters: row.btsRadiusMeters ?? 300,
    btsAzimuthDeg: row.btsAzimuthDeg ?? null,
    subscriberInfo: row.subscriberInfo ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
}

export function serializeRoute(
  row: EventMapRoute & { person?: LinkedPersonSummary | null }
): EvidenceMapRoute {
  return {
    id: row.id,
    eventId: row.eventId,
    personId: row.personId ?? null,
    person: row.person ?? null,
    label: row.label,
    routeType: row.routeType as RouteType,
    color: row.color,
    waypoints: Array.isArray(row.waypoints)
      ? (row.waypoints as unknown as RouteWaypoint[])
      : [],
    notes: row.notes ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
}

export function serializeDrawing(row: EventMapDrawing): EvidenceMapDrawing {
  return {
    id: row.id,
    eventId: row.eventId,
    drawingType: row.drawingType as DrawingType,
    label: row.label ?? null,
    notes: row.notes ?? null,
    strokeColor: row.strokeColor,
    strokeWidth: row.strokeWidth,
    strokeStyle: row.strokeStyle === 'DASHED' ? 'DASHED' : 'SOLID',
    fillColor: row.fillColor ?? null,
    fillOpacity: typeof row.fillOpacity === 'number' ? row.fillOpacity : 0.2,
    coordinates: Array.isArray(row.coordinates)
      ? (row.coordinates as unknown as DrawingCoord[])
      : [],
    radiusMeters: row.radiusMeters ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
}

/** Verify the user owns this non-deleted Event */
export async function verifyEventOwnership(eventId: string, userId: string) {
  return prisma.event.findFirst({
    where: {
      id: eventId,
      userId,
      deletedAt: null,
    },
    include: {
      addresses: true,
    },
  });
}
