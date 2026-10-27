import { describe, expect, it } from 'vitest';
import {
  buildCircleCoords,
  buildSectorConeCoords,
  computeRouteMetrics,
  haversineMeters,
  simplifyDrawingCoords,
} from '@/lib/map/evidence-map';
import {
  createDrawingSchema,
  createMarkerSchema,
  createRouteSchema,
} from '@/lib/services/evidence-map';

describe('evidence-map geometry and validation helpers', () => {
  it('computes haversine distance accurately in meters', () => {
    // ~1.11km for 0.01 degree of latitude
    const d = haversineMeters(21.02, 105.83, 21.03, 105.83);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1125);
  });

  it('computes route distance, duration, and average speed', () => {
    const stats = computeRouteMetrics([
      {
        lat: 21.02,
        lng: 105.83,
        timestamp: '2026-10-26T21:00:00.000Z',
      },
      {
        lat: 21.03,
        lng: 105.83,
        timestamp: '2026-10-26T21:02:00.000Z',
      },
    ]);

    expect(stats.totalDistanceMeters).toBeGreaterThan(1100);
    expect(stats.durationSeconds).toBe(120);
    expect(stats.avgSpeedKmh).not.toBeNull();
    expect(stats.avgSpeedKmh!).toBeGreaterThan(30);
    expect(stats.avgSpeedKmh!).toBeLessThan(36);
    expect(stats.isUnrealisticSpeed).toBe(false);
  });

  it('builds closed polygon rings for camera FoV cones and BTS circles', () => {
    const cone = buildSectorConeCoords(21.0278, 105.8342, 90, 60, 50, 12);
    expect(cone.length).toBe(15);
    expect(cone[0]).toEqual(cone[cone.length - 1]);

    const circle = buildCircleCoords(21.0278, 105.8342, 300, 32);
    expect(circle.length).toBe(33);
    expect(circle[0][0]).toBeCloseTo(circle[circle.length - 1][0], 6);
    expect(circle[0][1]).toBeCloseTo(circle[circle.length - 1][1], 6);
  });

  it('simplifies dense freehand drawing coordinates', () => {
    const raw = Array.from({ length: 50 }, (_, i) => ({
      lat: 21.02 + i * 0.0001,
      lng: 105.83 + i * 0.0001,
    }));
    const simplified = simplifyDrawingCoords(raw, 0.00002);
    expect(simplified.length).toBe(2);
    expect(simplified[0]).toEqual(raw[0]);
    expect(simplified[1]).toEqual(raw[raw.length - 1]);
  });

  it('validates marker, route, and drawing schemas', () => {
    const validCam = createMarkerSchema.safeParse({
      markerType: 'CAMERA',
      label: 'Cam số 12 ngõ 4',
      latitude: 21.028,
      longitude: 105.834,
      cameraDirection: 120,
      cameraStatus: 'CAPTURED',
    });
    expect(validCam.success).toBe(true);

    const validRoute = createRouteSchema.safeParse({
      label: 'Hướng tẩu thoát',
      routeType: 'CONFIRMED_PATH',
      color: '#ef4444',
      waypoints: [
        { lat: 21.028, lng: 105.834 },
        { lat: 21.03, lng: 105.836 },
      ],
    });
    expect(validRoute.success).toBe(true);

    const validDrawing = createDrawingSchema.safeParse({
      drawingType: 'CIRCLE',
      label: 'Vùng phong tỏa',
      strokeColor: '#f59e0b',
      strokeWidth: 3,
      strokeStyle: 'SOLID',
      fillOpacity: 0.25,
      coordinates: [{ lat: 21.028, lng: 105.834 }],
      radiusMeters: 250,
    });
    expect(validDrawing.success).toBe(true);
  });
});

