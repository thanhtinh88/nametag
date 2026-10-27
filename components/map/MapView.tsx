'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslations } from 'next-intl';
import type { MapCase, MapMarker } from '@/lib/map/types';
import { groupByCoordinates } from '@/lib/map/colocation';
import { haversineDistanceKm } from '@/lib/map/filter-markers';

// OpenFreeMap hosted styles: free, no API key, commercial use permitted.
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/positron';

export type TacticalMapBaseMode = 'SATELLITE_HYBRID' | 'SATELLITE_PURE' | 'STANDARD';

function buildTacticalSatelliteStyleSpec(includeHybridOverlay: boolean): maplibregl.StyleSpecification {
  const sources: Record<string, maplibregl.SourceSpecification> = {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© Esri, Maxar, Earthstar Geographics',
    },
  };

  const layers: maplibregl.LayerSpecification[] = [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 22,
    },
  ];

  if (includeHybridOverlay) {
    sources['openfreemap-vector'] = {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    };

    layers.push(
      {
        id: 'hybrid-roads-casing',
        type: 'line',
        source: 'openfreemap-vector',
        'source-layer': 'transportation',
        paint: {
          'line-color': 'rgba(15, 23, 42, 0.65)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 15, 4, 18, 8],
        },
      },
      {
        id: 'hybrid-roads-line',
        type: 'line',
        source: 'openfreemap-vector',
        'source-layer': 'transportation',
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.55)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 15, 2, 18, 4.5],
        },
      },
      {
        id: 'hybrid-road-labels',
        type: 'symbol',
        source: 'openfreemap-vector',
        'source-layer': 'transportation_name',
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': 'rgba(15, 23, 42, 0.9)',
          'text-halo-width': 1.5,
        },
      },
      {
        id: 'hybrid-place-labels',
        type: 'symbol',
        source: 'openfreemap-vector',
        'source-layer': 'place',
        layout: {
          'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name']],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 14],
        },
        paint: {
          'text-color': '#fef08a',
          'text-halo-color': 'rgba(15, 23, 42, 0.92)',
          'text-halo-width': 1.8,
        },
      },
    );
  }

  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources,
    layers,
  };
}

const SOURCE_ID = 'people';
const RADIUS_SOURCE_ID = 'crime-scene-radius';
const FOCUS_ZOOM = 15;
// MapLibre scales animation time with camera distance, so long jumps (world
// view to one city) can run for several seconds. Cap all camera animations.
const CAMERA_ANIMATION_MS = 1000;

// Photo marker icons: rendered offscreen at 2x devicePixelRatio (48px bitmap
// for a 24px displayed icon), matching how the network graph draws person
// nodes (filled/ringed circle, photo clipped on top).
const ICON_BITMAP_SIZE = 48;
const ICON_PIXEL_RATIO = 2; // 48 / 2 = 24px displayed icon
// Bitmap-space stroke width. The photo clip covers the inner half of the
// stroke, so the visible ring is 2 bitmap pixels = 1px at display scale.
const ICON_RING_WIDTH = 4;
const ICON_FILL_RADIUS = 22; // bitmap-space; leaves room for the ring to stay inside the canvas
// Same fallback grays the network graph uses for ungrouped nodes.
const RING_FALLBACK_LIGHT = '#d1d5db';
const RING_FALLBACK_DARK = '#4b5563';

type PhotoEntry = HTMLImageElement | 'loading' | 'error';

function iconIdFor(personId: string): string {
  return `person-${personId}`;
}

function ringColorFor(marker: MapMarker, isDark: boolean): string {
  return marker.groupColor ?? (isDark ? RING_FALLBACK_DARK : RING_FALLBACK_LIGHT);
}

export interface RadiusCenter {
  latitude: number;
  longitude: number;
  label?: string;
  isPerson?: boolean;
}

/** Builds a 64-vertex GeoJSON polygon approximating a circle of `radiusKm` around `[lng, lat]`. */
function buildRadiusGeoJSON(
  center: RadiusCenter | null | undefined,
  radiusKm: number | undefined,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  if (
    !center ||
    center.latitude === null ||
    center.longitude === null ||
    !radiusKm ||
    radiusKm <= 0
  ) {
    return { type: 'FeatureCollection', features: [] };
  }

  const centerLat = center.latitude;
  const centerLng = center.longitude;
  const points = 64;
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLng + x, centerLat + y]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
        properties: {
          color: center.isPerson ? '#3b82f6' : '#ef4444',
        },
      },
    ],
  };
}

/** Draws a circle-clipped photo with a colored ring onto an offscreen canvas, like the network graph's person nodes. */
function compositeIcon(image: HTMLImageElement, ringColor: string): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_BITMAP_SIZE;
  canvas.height = ICON_BITMAP_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const center = ICON_BITMAP_SIZE / 2;

  ctx.beginPath();
  ctx.arc(center, center, ICON_FILL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = ringColor;
  ctx.fill();
  ctx.lineWidth = ICON_RING_WIDTH;
  ctx.strokeStyle = ringColor;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, ICON_FILL_RADIUS, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    image,
    center - ICON_FILL_RADIUS,
    center - ICON_FILL_RADIUS,
    ICON_FILL_RADIUS * 2,
    ICON_FILL_RADIUS * 2,
  );
  ctx.restore();

  return ctx.getImageData(0, 0, ICON_BITMAP_SIZE, ICON_BITMAP_SIZE);
}

interface MapViewProps {
  markers: MapMarker[];
  focusId: string | null;
  focusRequest?: { id: string; seq: number } | null;
  /**
   * Serialized filter state ("|"-joined values). The camera fits to the
   * visible markers on initial load and whenever filters change.
   */
  filtersKey: string;
  selectedCase?: MapCase | null;
  radiusKm?: number;
  radiusCenter?: RadiusCenter | null;
  inspectedPersonId?: string | null;
  onSelectMarker?: (marker: MapMarker) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}

interface MarkerProperties {
  id: string;
  personId: string;
  personName: string;
  label: string;
  addressText?: string;
  /** Registered icon image id, present only once the person's photo icon has loaded */
  iconId?: string;
  /** First group's color, used for the plain dot when there is no photo icon yet */
  dotColor?: string;
  isCrimeScene?: boolean;
  colocatedCount: number;
  isDimmed?: boolean;
  isInspected?: boolean;
}

function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function toGeoJSON(
  markers: MapMarker[],
  registeredIconPersonIds: ReadonlySet<string>,
  selectedCaseId?: string | null,
  inspectedPersonId?: string | null,
): GeoJSON.FeatureCollection<GeoJSON.Point, MarkerProperties> {
  const groups = groupByCoordinates(markers);
  const features: GeoJSON.Feature<GeoJSON.Point, MarkerProperties>[] = [];

  for (const groupMarkers of groups.values()) {
    const representative = groupMarkers[0];
    const count = groupMarkers.length;
    const isSolo = count === 1;
    const isCrimeScene = representative.source === 'event_address';
    const names = groupMarkers.map((m) => m.personName).join(', ');
    const isInspected = Boolean(
      inspectedPersonId && groupMarkers.some((m) => m.personId === inspectedPersonId)
    );

    const isRelated = !selectedCaseId
      ? true
      : (isCrimeScene && representative.personId === selectedCaseId) ||
        groupMarkers.some((m) => m.caseLinks?.some((cl) => cl.eventId === selectedCaseId));
    const isDimmed = selectedCaseId ? (!isRelated && !isInspected) : false;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [representative.longitude, representative.latitude] },
      properties: {
        id: representative.id,
        personId: representative.personId,
        personName: names,
        label: representative.label,
        // Omitted rather than null: null-valued GeoJSON properties do not
        // survive the round trip through queryRenderedFeatures reliably.
        ...(representative.addressText ? { addressText: representative.addressText } : {}),
        ...(isSolo && representative.hasPhoto && registeredIconPersonIds.has(representative.personId)
          ? { iconId: iconIdFor(representative.personId) }
          : {}),
        ...(representative.groupColor ? { dotColor: representative.groupColor } : {}),
        ...(isCrimeScene ? { isCrimeScene: true } : {}),
        colocatedCount: count,
        ...(isDimmed ? { isDimmed: true } : {}),
        ...(isInspected ? { isInspected: true } : {}),
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

export default function MapView({
  markers,
  focusId,
  focusRequest = null,
  filtersKey,
  selectedCase = null,
  radiusKm = 0,
  radiusCenter = null,
  inspectedPersonId = null,
  onSelectMarker,
  onBoundsChange,
}: MapViewProps) {
  const t = useTranslations('map');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const currentStyleKeyRef = useRef<string | null>(null);
  const markersRef = useRef<MapMarker[]>(markers);
  const inspectedPersonIdRef = useRef<string | null>(inspectedPersonId);
  const selectedCaseRef = useRef<MapCase | null>(selectedCase);
  const radiusKmRef = useRef<number>(radiusKm);
  const focusHandledRef = useRef<string | null>(null);
  const appliedFiltersKeyRef = useRef<string | null>(null);
  const isDark = useIsDarkTheme();
  const isDarkRef = useRef(isDark);
  const [baseMode, setBaseMode] = useState<TacticalMapBaseMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('tactical-map-base-mode');
      if (saved === 'SATELLITE_HYBRID' || saved === 'SATELLITE_PURE' || saved === 'STANDARD') {
        return saved;
      }
    }
    return 'SATELLITE_HYBRID';
  });
  const baseModeRef = useRef<TacticalMapBaseMode>(baseMode);
  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);
  useEffect(() => {
    baseModeRef.current = baseMode;
    try {
      window.localStorage.setItem('tactical-map-base-mode', baseMode);
    } catch {
      // Ignore storage error
    }
  }, [baseMode]);
  const translationsRef = useRef({
    viewContact: t('viewContact'),
    directions: t('directions'),
    colocatedTitle: (count: number) => t('colocatedTitle', { count }),
    clusterTitle: (count: number) => t('clusterTitle', { count }),
    clusterZoomIn: t('clusterZoomIn'),
    clusterHoverTip: t('clusterHoverTip'),
    distanceMetersFromScene: (meters: number) => t('distanceMetersFromScene', { meters }),
    distanceKmFromScene: (km: string) => t('distanceKmFromScene', { km }),
    flagAsSuspectInCase: (title: string) => t('flagAsSuspectInCase', { title }),
    flagSaving: t('flagSaving'),
    flaggedInCase: t('flaggedInCase'),
    flagFailed: t('flagFailed'),
  });
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  // Photo marker icon caches. These live for the component's lifetime (not
  // per map instance) so a theme switch or style reload only has to
  // re-register already-composited bitmaps, never re-fetch photos.
  const photoElementCacheRef = useRef(new Map<string, PhotoEntry>());
  const bitmapCacheRef = useRef(new Map<string, ImageData>());
  // personId -> ring color currently registered as a map image, scoped to
  // the CURRENT style: custom images do not survive setStyle, so this is
  // cleared and rebuilt every time the style (re)loads.
  const registeredColorRef = useRef(new Map<string, string>());
  const ensureIconsRef = useRef<(() => void) | null>(null);
  const pendingSourceUpdateRef = useRef(false);
  const lastFocusedCaseIdRef = useRef<string | null>(null);

  // Keep "latest value" refs in sync via effects rather than during render,
  // since the map init effect below registers event handlers once (empty
  // deps) and reads these refs later, outside of render.
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  const effectiveRadiusCenter = useMemo(
    () =>
      radiusCenter ??
      (selectedCase && selectedCase.latitude !== null && selectedCase.longitude !== null
        ? {
            latitude: selectedCase.latitude,
            longitude: selectedCase.longitude,
            label: selectedCase.title,
            isPerson: false,
          }
        : null),
    [radiusCenter, selectedCase]
  );
  const radiusCenterRef = useRef<RadiusCenter | null>(effectiveRadiusCenter);
  const onSelectMarkerRef = useRef(onSelectMarker);

  useEffect(() => {
    onSelectMarkerRef.current = onSelectMarker;
  }, [onSelectMarker]);

  useEffect(() => {
    selectedCaseRef.current = selectedCase;
    radiusCenterRef.current = effectiveRadiusCenter;
    radiusKmRef.current = radiusKm;
    const map = mapRef.current;
    if (!map) return;

    const radiusSource = map.getSource(RADIUS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (radiusSource) {
      radiusSource.setData(buildRadiusGeoJSON(effectiveRadiusCenter, radiusKm));
    }

    const markerSource = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (markerSource) {
      markerSource.setData(toGeoJSON(markers, new Set(registeredColorRef.current.keys()), selectedCase?.id, inspectedPersonId));
    }

    // Auto-fit camera when selectedCase is chosen (unless user is currently inspecting a candidate person)
    if (selectedCase && !inspectedPersonId) {
      const caseId = selectedCase.id;
      if (lastFocusedCaseIdRef.current !== caseId) {
        lastFocusedCaseIdRef.current = caseId;
        const coords: [number, number][] = [];
        if (selectedCase.latitude !== null && selectedCase.longitude !== null) {
          coords.push([selectedCase.longitude, selectedCase.latitude]);
        }
        for (const m of markers) {
          if (m.latitude === null || m.longitude === null) continue;
          const isScene = m.source === 'event_address' && m.personId === caseId;
          const isLinked = m.source !== 'event_address' && m.caseLinks?.some((cl) => cl.eventId === caseId);
          if (isScene || isLinked) {
            if (!coords.some((c) => c[0] === m.longitude && c[1] === m.latitude)) {
              coords.push([m.longitude, m.latitude]);
            }
          }
        }

        if (coords.length === 1) {
          map.easeTo({
            center: coords[0],
            zoom: FOCUS_ZOOM,
            duration: CAMERA_ANIMATION_MS,
          });
        } else if (coords.length > 1) {
          const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
          for (const pt of coords) {
            bounds.extend(pt);
          }
          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 80, right: 80 },
            maxZoom: FOCUS_ZOOM,
            duration: CAMERA_ANIMATION_MS,
          });
        }
      }
    } else if (!selectedCase) {
      lastFocusedCaseIdRef.current = null;
    }
  }, [selectedCase, effectiveRadiusCenter, radiusKm, markers, inspectedPersonId]);

  // Focus and fit bounds around inspected candidate person and crime scene
  useEffect(() => {
    inspectedPersonIdRef.current = inspectedPersonId;
    const map = mapRef.current;
    if (!map) return;

    // Refresh GeoJSON so isInspected styles and dimmed states update immediately
    const markerSource = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (markerSource) {
      markerSource.setData(toGeoJSON(markers, new Set(registeredColorRef.current.keys()), selectedCase?.id, inspectedPersonId));
    }

    if (!inspectedPersonId) return;

    const target = markers.find((m) => m.personId === inspectedPersonId);
    if (!target || target.latitude === null || target.longitude === null) return;

    const coords: [number, number][] = [[target.longitude, target.latitude]];
    if (selectedCase && selectedCase.latitude !== null && selectedCase.longitude !== null) {
      coords.push([selectedCase.longitude, selectedCase.latitude]);
    }

    if (coords.length > 1) {
      const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
      coords.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, {
        padding: { top: 90, bottom: 90, left: 90, right: 90 },
        maxZoom: 15,
        duration: CAMERA_ANIMATION_MS,
      });
    } else {
      map.easeTo({
        center: coords[0],
        zoom: FOCUS_ZOOM,
        duration: CAMERA_ANIMATION_MS,
      });
    }

    openPopup(
      map,
      [target.longitude, target.latitude],
      {
        id: target.id,
        personId: target.personId,
        personName: target.personName,
        label: target.label,
        ...(target.addressText ? { addressText: target.addressText } : {}),
        isInspected: true,
        colocatedCount: 1,
      },
      translationsRef.current,
      selectedCaseRef.current,
      radiusCenterRef.current,
    );
  }, [inspectedPersonId, markers, selectedCase]);

  useEffect(() => {
    translationsRef.current = {
      viewContact: t('viewContact'),
      directions: t('directions'),
      colocatedTitle: (count: number) => t('colocatedTitle', { count }),
      clusterTitle: (count: number) => t('clusterTitle', { count }),
      clusterZoomIn: t('clusterZoomIn'),
      clusterHoverTip: t('clusterHoverTip'),
      distanceMetersFromScene: (meters: number) => t('distanceMetersFromScene', { meters }),
      distanceKmFromScene: (km: string) => t('distanceKmFromScene', { km }),
      flagAsSuspectInCase: (title: string) => t('flagAsSuspectInCase', { title }),
      flagSaving: t('flagSaving'),
      flaggedInCase: t('flaggedInCase'),
      flagFailed: t('flagFailed'),
    };
  }, [t]);

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  // Initialize the map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Per-map-instance disposed flag. Deliberately a closure variable and
    // NOT a shared ref: async photo loads started by one map instance can
    // complete after a StrictMode unmount/remount cycle, and a shared ref
    // reset by the new mount would let the stale closure operate on the
    // removed map (whose style is gone, crashing hasImage/addImage).
    let mapDisposed = false;

    if (!isWebGLAvailable()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reflecting a one-time platform capability check into UI state is intentional
      setWebglUnavailable(true);
      return;
    }

    const isDarkNow = document.documentElement.classList.contains('dark');
    const initialMode = baseModeRef.current;
    const initialStyle =
      initialMode === 'SATELLITE_HYBRID'
        ? buildTacticalSatelliteStyleSpec(true)
        : initialMode === 'SATELLITE_PURE'
          ? buildTacticalSatelliteStyleSpec(false)
          : isDarkNow
            ? DARK_STYLE
            : LIGHT_STYLE;
    currentStyleKeyRef.current = `${initialMode}:${isDarkNow ? 'dark' : 'light'}`;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: initialStyle,
        center: [105.85, 21.03],
        zoom: 12,
        attributionControl: { compact: true },
      });
    } catch {
      // The feature-detection probe above can pass while the real context
      // creation still fails (e.g. some driver/blocklist combinations).
      setWebglUnavailable(true);
      return;
    }
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const emitBounds = () => {
      if (!onBoundsChangeRef.current) return;
      const b = map.getBounds();
      onBoundsChangeRef.current({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    };
    map.on('load', emitBounds);
    map.on('moveend', emitBounds);

    map.once('idle', () => {
      containerRef.current
        ?.querySelector('.maplibregl-ctrl-attrib')
        ?.classList.remove('maplibregl-compact-show');
    });

    // Coalesces synchronous or rapid-fire icon updates (a batch of photo
    // loads finishing around the same time) into a single setData call.
    const scheduleSourceUpdate = () => {
      if (pendingSourceUpdateRef.current) return;
      pendingSourceUpdateRef.current = true;
      queueMicrotask(() => {
        pendingSourceUpdateRef.current = false;
        if (mapDisposed) return;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (!source) return;
        source.setData(toGeoJSON(markersRef.current, new Set(registeredColorRef.current.keys()), selectedCaseRef.current?.id, inspectedPersonIdRef.current));
      });
    };

    const registerBitmap = (personId: string, bitmap: ImageData, color: string) => {
      const iconId = iconIdFor(personId);
      if (map.hasImage(iconId)) {
        map.updateImage(iconId, bitmap);
      } else {
        map.addImage(iconId, bitmap, { pixelRatio: ICON_PIXEL_RATIO });
      }
      registeredColorRef.current.set(personId, color);
    };

    // Loads and composites each photo marker's icon (from cache when
    // possible) and registers it as a map image. Re-entrant and safe to call
    // repeatedly: markers already registered with the current ring color are
    // skipped, so this never loops. Called on marker changes, when a photo
    // finishes loading, and on every style reload (setStyle drops custom
    // images, so re-registering from the bitmap cache is required, but never
    // re-fetches the photo itself).
    const ensureIcons = () => {
      if (mapDisposed) return;
      let didRegisterAny = false;
      for (const marker of markersRef.current) {
        if (!marker.hasPhoto) continue;
        const personId = marker.personId;
        const color = ringColorFor(marker, isDarkRef.current);
        if (registeredColorRef.current.get(personId) === color && map.hasImage(iconIdFor(personId))) {
          continue;
        }

        const bitmapKey = `${personId}:${color}`;
        const cachedBitmap = bitmapCacheRef.current.get(bitmapKey);
        if (cachedBitmap) {
          registerBitmap(personId, cachedBitmap, color);
          didRegisterAny = true;
          continue;
        }

        const photoEntry = photoElementCacheRef.current.get(personId);
        if (photoEntry === 'error') continue; // permanently falls back to the dot for this session
        if (photoEntry === 'loading') continue; // already in flight; onload will re-run ensureIcons
        if (photoEntry instanceof HTMLImageElement) {
          const bitmap = compositeIcon(photoEntry, color);
          if (bitmap) {
            bitmapCacheRef.current.set(bitmapKey, bitmap);
            registerBitmap(personId, bitmap, color);
            didRegisterAny = true;
          }
          continue;
        }

        // Not cached yet: kick off a same-origin photo fetch (canvas
        // compositing stays untainted).
        photoElementCacheRef.current.set(personId, 'loading');
        const img = new Image();
        // The caches are shared across map instances on purpose (photos and
        // bitmaps stay valid), but re-entry goes through ensureIconsRef so
        // it always runs against the LIVE map instance, which self-guards
        // with its own mapDisposed flag.
        img.onload = () => {
          photoElementCacheRef.current.set(personId, img);
          ensureIconsRef.current?.();
        };
        img.onerror = () => {
          photoElementCacheRef.current.set(personId, 'error');
        };
        img.src = `/api/photos/${personId}`;
      }
      if (didRegisterAny) scheduleSourceUpdate();
    };
    ensureIconsRef.current = ensureIcons;

    const addDataLayers = () => {
      if (map.getSource(SOURCE_ID)) return;
      // Custom images do not survive setStyle; every registration here is
      // for the fresh style, even if the underlying bitmap was cached.
      registeredColorRef.current.clear();
      const primary =
        getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2563EB';
      const darkTheme = isDarkRef.current || baseModeRef.current !== 'STANDARD';

      ensureIcons();

      map.addSource(RADIUS_SOURCE_ID, {
        type: 'geojson',
        data: buildRadiusGeoJSON(radiusCenterRef.current, radiusKmRef.current),
      });

      map.addLayer({
        id: 'crime-scene-radius-fill',
        type: 'fill',
        source: RADIUS_SOURCE_ID,
        paint: {
          'fill-color': ['coalesce', ['get', 'color'], '#ef4444'],
          'fill-opacity': 0.1,
        },
      });

      map.addLayer({
        id: 'crime-scene-radius-line',
        type: 'line',
        source: RADIUS_SOURCE_ID,
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#ef4444'],
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toGeoJSON(markersRef.current, new Set(registeredColorRef.current.keys()), selectedCaseRef.current?.id, inspectedPersonIdRef.current),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
        clusterProperties: {
          clusterNames: [
            ['concat', ['accumulated'], ', ', ['get', 'clusterNames']],
            ['get', 'personName'],
          ],
        },
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': primary,
          'circle-opacity': 0.85,
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28],
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Plain colored dot: markers without a photo, or whose photo icon
      // has not registered yet (upgrades to the photo layer once ready).
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['!', ['has', 'iconId']], ['==', ['get', 'colocatedCount'], 1]],
        paint: {
          'circle-color': [
            'case',
            ['==', ['get', 'isInspected'], true],
            '#2563eb',
            ['==', ['get', 'isDimmed'], true],
            '#9ca3af',
            ['coalesce', ['get', 'dotColor'], primary],
          ],
          'circle-opacity': [
            'case',
            ['==', ['get', 'isInspected'], true],
            1,
            ['==', ['get', 'isDimmed'], true],
            0.7,
            1,
          ],
          'circle-radius': [
            'case',
            ['==', ['get', 'isInspected'], true],
            9,
            ['case', ['==', ['get', 'isCrimeScene'], true], 10, 7],
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'isInspected'], true],
            3.5,
            ['==', ['get', 'isDimmed'], true],
            1.5,
            ['case', ['==', ['get', 'isCrimeScene'], true], 3, 2],
          ],
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'isInspected'], true],
            '#60a5fa',
            ['==', ['get', 'isDimmed'], true],
            '#cbd5e1',
            ['case', ['==', ['get', 'isCrimeScene'], true], '#fde047', '#ffffff'],
          ],
        },
      });

      // Circular photo thumbnail, ringed with the person's first group
      // color, matching the network graph's person nodes.
      map.addLayer({
        id: 'unclustered-photo',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['has', 'iconId'], ['==', ['get', 'colocatedCount'], 1]],
        layout: {
          'icon-image': ['get', 'iconId'],
          'icon-size': ['case', ['==', ['get', 'isInspected'], true], 1.25, 1],
          'icon-allow-overlap': true,
        },
        paint: {
          'icon-opacity': [
            'case',
            ['==', ['get', 'isInspected'], true],
            1,
            ['==', ['get', 'isDimmed'], true],
            0.7,
            1,
          ],
        },
      });

      // Co-located markers: multiple people sharing the exact same
      // coordinates render as a single count circle instead of stacking
      // overlapping individual markers on top of each other.
      map.addLayer({
        id: 'colocated-circle',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['>', ['get', 'colocatedCount'], 1]],
        paint: {
          'circle-color': [
            'case',
            ['==', ['get', 'isDimmed'], true],
            '#9ca3af',
            primary,
          ],
          'circle-opacity': [
            'case',
            ['==', ['get', 'isDimmed'], true],
            0.7,
            0.85,
          ],
          'circle-radius': 14,
        },
      });

      map.addLayer({
        id: 'colocated-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['>', ['get', 'colocatedCount'], 1]],
        layout: {
          'text-field': ['to-string', ['get', 'colocatedCount']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
          'text-opacity': [
            'case',
            ['==', ['get', 'isDimmed'], true],
            0.8,
            1,
          ],
        },
      });

      // Text labels directly below unclustered markers (Subject name or Case title)
      map.addLayer({
        id: 'marker-labels',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'colocatedCount'], 1]],
        layout: {
          'text-field': ['get', 'personName'],
          'text-font': ['Noto Sans Regular'],
          'text-size': [
            'case',
            ['==', ['get', 'isInspected'], true],
            13,
            ['case', ['==', ['get', 'isCrimeScene'], true], 12, 11],
          ],
          'text-offset': [0, 1.15],
          'text-anchor': 'top',
          'text-max-width': 14,
          'text-optional': true,
        },
        paint: {
          'text-color': [
            'case',
            ['==', ['get', 'isInspected'], true],
            darkTheme ? '#60a5fa' : '#2563eb',
            ['==', ['get', 'isDimmed'], true],
            '#64748b',
            ['case', ['==', ['get', 'isCrimeScene'], true], darkTheme ? '#fde047' : '#b91c1c', darkTheme ? '#f3f4f6' : '#111827'],
          ],
          'text-opacity': [
            'case',
            ['==', ['get', 'isInspected'], true],
            1,
            ['==', ['get', 'isDimmed'], true],
            0.75,
            1,
          ],
          'text-halo-color': darkTheme ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.95)',
          'text-halo-width': 1.75,
        },
      });
    };

    // Fires after initial style load AND after every setStyle (theme switch)
    map.on('style.load', addDataLayers);

    let hoverPopup: maplibregl.Popup | null = null;

    const handleClusterClick = (event: maplibregl.MapLayerMouseEvent) => {
      if (hoverPopup) {
        hoverPopup.remove();
        hoverPopup = null;
      }
      const features = map.queryRenderedFeatures(event.point, { layers: ['clusters'] });
      const feature = features[0];
      const clusterId = Number(feature?.properties?.cluster_id);
      const pointCount = Number(feature?.properties?.point_count || 0);
      if (!Number.isFinite(clusterId)) return;
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
      const geometry = feature.geometry as GeoJSON.Point;
      const center = geometry.coordinates as [number, number];

      source
        .getClusterLeaves(clusterId, 100, 0)
        .then((leaves) => {
          const leafIds = new Set(leaves.map((l) => l.properties?.id));
          const clusterMarkers = markersRef.current.filter((m) => leafIds.has(m.id));
          openClusterPopup(
            map,
            center,
            clusterId,
            pointCount || clusterMarkers.length,
            clusterMarkers,
            translationsRef.current,
            onSelectMarkerRef.current,
          );
        })
        .catch(() => {});
    };

    map.on('click', 'clusters', handleClusterClick);

    map.on('mouseenter', 'clusters', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const feature = features[0];
      if (!feature) return;
      const pointCount = Number(feature.properties?.point_count || 0);
      const clusterNames = String(feature.properties?.clusterNames || '');
      const geometry = feature.geometry as GeoJSON.Point;
      const center = geometry.coordinates as [number, number];

      const namesList = clusterNames ? clusterNames.split(', ').filter(Boolean) : [];

      const tooltipEl = document.createElement('div');
      tooltipEl.className = 'text-xs text-gray-900 w-max max-w-[340px] sm:max-w-[420px] p-0.5';

      const namesHtml =
        namesList.length > 0
          ? `<div class="mt-1.5 space-y-1 max-h-52 overflow-y-auto pr-1">
              ${namesList
                .map(
                  (name) =>
                    `<div class="flex items-start gap-1.5 text-gray-800">
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5"></span>
                      <span class="break-words font-medium leading-tight">${name}</span>
                    </div>`
                )
                .join('')}
            </div>`
          : '';

      tooltipEl.innerHTML = `
        <div class="font-semibold text-xs border-b border-gray-200 pb-1 flex items-center justify-between gap-2">
          <span>👥 ${translationsRef.current.clusterTitle(pointCount)}</span>
        </div>
        ${namesHtml}
        <div class="text-[10px] text-blue-600 mt-1.5 pt-1 border-t border-gray-100 font-medium">${translationsRef.current.clusterHoverTip}</div>
      `;

      if (hoverPopup) hoverPopup.remove();
      hoverPopup = new maplibregl.Popup({
        closeButton: false,
        offset: 12,
        maxWidth: '440px',
        className: 'cluster-hover-popup',
      })
        .setLngLat(center)
        .setDOMContent(tooltipEl)
        .addTo(map);
    });

    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
      if (hoverPopup) {
        hoverPopup.remove();
        hoverPopup = null;
      }
    });

    const handleUnclusteredClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const props = feature.properties as unknown as MarkerProperties;
      const geometry = feature.geometry as GeoJSON.Point;
      const marker = markersRef.current.find((m) => m.id === props.id);
      if (marker && onSelectMarkerRef.current) {
        onSelectMarkerRef.current(marker);
      }
      openPopup(
        map,
        geometry.coordinates as [number, number],
        props,
        translationsRef.current,
        selectedCaseRef.current,
        radiusCenterRef.current,
      );
    };

    map.on('click', 'unclustered-point', handleUnclusteredClick);
    map.on('click', 'unclustered-photo', handleUnclusteredClick);
    map.on('click', 'marker-labels', handleUnclusteredClick);

    const handleColocatedClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const props = feature.properties as unknown as MarkerProperties;
      const representative = markersRef.current.find((m) => m.id === props.id);
      if (!representative) return;
      const colocated = markersRef.current.filter(
        (m) => m.latitude === representative.latitude && m.longitude === representative.longitude
      );
      if (colocated.length === 0) return;
      openColocatedPopup(
        map,
        [representative.longitude, representative.latitude],
        colocated,
        translationsRef.current,
        onSelectMarkerRef.current,
      );
    };

    map.on('click', 'colocated-circle', handleColocatedClick);
    map.on('click', 'colocated-count', handleColocatedClick);

    for (const layer of [
      'unclustered-point',
      'unclustered-photo',
      'marker-labels',
      'colocated-circle',
      'colocated-count',
    ]) {
      map.on('mouseenter', layer, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = '';
      });
    }

    // Captured once for the cleanup below: it is always the same Map
    // instance for the component's lifetime (only ever mutated, never
    // reassigned), so reading it via this local satisfies the lint rule
    // without changing behavior.
    const registeredColors = registeredColorRef.current;

    return () => {
      mapDisposed = true;
      ensureIconsRef.current = null;
      // Registered images belonged to this map instance; a remount starts
      // from an empty style with no custom images.
      registeredColors.clear();
      map.remove();
      mapRef.current = null;
      // The popup and camera state died with the map; let the focus and
      // filter-fit effects re-apply on the next map instance (StrictMode
      // remounts in dev, for example).
      focusHandledRef.current = null;
      appliedFiltersKeyRef.current = null;
    };
  }, []);

  // Switch style on theme or baseMode change (layers re-added via the style.load handler)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextKey = `${baseMode}:${isDark ? 'dark' : 'light'}`;
    if (currentStyleKeyRef.current === nextKey) return;
    currentStyleKeyRef.current = nextKey;
    const nextStyle =
      baseMode === 'SATELLITE_HYBRID'
        ? buildTacticalSatelliteStyleSpec(true)
        : baseMode === 'SATELLITE_PURE'
          ? buildTacticalSatelliteStyleSpec(false)
          : isDark
            ? DARK_STYLE
            : LIGHT_STYLE;
    map.setStyle(nextStyle);
  }, [isDark, baseMode]);

  // Push marker updates into the source, and load/register any newly
  // visible photo icons (upgrading their markers from dot to photo once
  // ready; see ensureIcons in the map init effect).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    ensureIconsRef.current?.();
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(toGeoJSON(markers, new Set(registeredColorRef.current.keys()), selectedCaseRef.current?.id, inspectedPersonIdRef.current));
    }
  }, [markers]);

  // Handle the ?focus= deep link once, after the map and data exist
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusId || focusHandledRef.current === focusId) return;
    const target = markers.find((marker) => marker.id === focusId);
    if (!target) return;
    focusHandledRef.current = focusId;

    // Camera moves and popups do not depend on the style being loaded, so
    // apply immediately. Waiting for style.load here is a race: MapLibre's
    // isStyleLoaded() can still report false after the event already fired,
    // in which case a once('style.load') listener never runs.
    map.jumpTo({ center: [target.longitude, target.latitude], zoom: FOCUS_ZOOM });
    openPopup(
      map,
      [target.longitude, target.latitude],
      {
        id: target.id,
        personId: target.personId,
        personName: target.personName,
        label: target.label,
        ...(target.addressText ? { addressText: target.addressText } : {}),
        colocatedCount: 1,
      },
      translationsRef.current,
      selectedCaseRef.current,
      radiusCenterRef.current,
    );
  }, [focusId, markers]);

  // Handle imperative focus requests from the Subject Roster Sidebar
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRequest) return;
    const target = markers.find((marker) => marker.id === focusRequest.id);
    if (!target) return;
    if (prefersReducedMotion()) {
      map.jumpTo({ center: [target.longitude, target.latitude], zoom: FOCUS_ZOOM });
    } else {
      map.easeTo({ center: [target.longitude, target.latitude], zoom: FOCUS_ZOOM, duration: CAMERA_ANIMATION_MS });
    }
    openPopup(
      map,
      [target.longitude, target.latitude],
      {
        id: target.id,
        personId: target.personId,
        personName: target.personName,
        label: target.label,
        ...(target.addressText ? { addressText: target.addressText } : {}),
        ...(target.source === 'event_address' ? { isCrimeScene: true } : {}),
        colocatedCount: 1,
      },
      translationsRef.current,
      selectedCaseRef.current,
      radiusCenterRef.current,
    );
  }, [focusRequest, markers]);

  // Fit the camera to the visible markers on initial load and whenever the
  // user changes filters, including clearing them back to "all".
  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusId || selectedCase || inspectedPersonId) {
      appliedFiltersKeyRef.current = filtersKey;
      return;
    }
    if (markers.length === 0) return;
    const previous = appliedFiltersKeyRef.current;
    appliedFiltersKeyRef.current = filtersKey;
    if (previous === filtersKey) return;
    const bounds = new maplibregl.LngLatBounds();
    for (const marker of markers) {
      bounds.extend([marker.longitude, marker.latitude]);
    }
    map.fitBounds(bounds, {
      padding: 64,
      maxZoom: 14,
      duration: CAMERA_ANIMATION_MS,
      animate: !prefersReducedMotion(),
    });
  }, [markers, focusId, filtersKey, selectedCase]);

  if (webglUnavailable) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-muted">{t('webglUnavailable')}</p>
        </div>
      </div>
    );
  }

  // MapLibre's stylesheet forces position: relative on its container, which
  // would override Tailwind's `absolute` and collapse the element to zero
  // height. Positioning lives on an outer div we own; MapLibre gets a child
  // sized with h-full/w-full, which its position override cannot break.
  return (
    <div className="absolute inset-0" aria-label={t('title')} role="application">
      <div ref={containerRef} className="h-full w-full" />
      {/* Floating Satellite / Base Map Switcher */}
      <div className="absolute bottom-8 right-3 z-20 flex items-center gap-0.5 rounded-lg border border-slate-700/80 bg-slate-900/90 p-1 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setBaseMode('SATELLITE_HYBRID')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
            baseMode === 'SATELLITE_HYBRID'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Hiển thị ảnh vệ tinh kèm tên đường & địa danh"
        >
          🛰️ Vệ tinh + Đường
        </button>
        <button
          type="button"
          onClick={() => setBaseMode('SATELLITE_PURE')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
            baseMode === 'SATELLITE_PURE'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Chỉ hiển thị ảnh vệ tinh gốc"
        >
          🛰️ Vệ tinh
        </button>
        <button
          type="button"
          onClick={() => setBaseMode('STANDARD')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
            baseMode === 'STANDARD'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Hiển thị bản đồ đường phố tiêu chuẩn"
        >
          🗺️ Bản đồ
        </button>
      </div>
    </div>
  );
}

// Popup content is built with DOM APIs and textContent (never innerHTML with
// user data) so person names cannot inject markup.
function openPopup(
  map: maplibregl.Map,
  coordinates: [number, number],
  props: MarkerProperties,
  labels: {
    viewContact: string;
    directions: string;
    distanceMetersFromScene?: (meters: number) => string;
    distanceKmFromScene?: (km: string) => string;
    flagAsSuspectInCase?: (title: string) => string;
    flagSaving?: string;
    flaggedInCase?: string;
    flagFailed?: string;
  },
  selectedCase?: MapCase | null,
  radiusCenter?: RadiusCenter | null,
): void {
  const container = document.createElement('div');
  // MapLibre popups have a white background regardless of app theme, so the
  // text color must be explicit; inheriting the dark theme's light text
  // would render white-on-white.
  container.className = 'space-y-1 text-gray-900';

  const name = document.createElement('div');
  name.className = 'font-semibold text-sm';
  name.textContent = props.personName;
  container.appendChild(name);

  const label = document.createElement('div');
  label.className = 'text-xs opacity-70 capitalize';
  label.textContent = props.label;
  container.appendChild(label);

  if (typeof props.addressText === 'string' && props.addressText.length > 0) {
    const addressLine = document.createElement('div');
    addressLine.className = 'text-xs max-w-56';
    addressLine.textContent = props.addressText;
    container.appendChild(addressLine);
  }

  const isEventMarker = props.id.startsWith('evaddr_');

  if (
    radiusCenter &&
    radiusCenter.latitude !== null &&
    radiusCenter.longitude !== null
  ) {
    const distKm = haversineDistanceKm(
      radiusCenter.latitude,
      radiusCenter.longitude,
      coordinates[1],
      coordinates[0],
    );
    if (distKm > 0.005) {
      const distLine = document.createElement('div');
      distLine.className = `text-xs font-medium pt-0.5 ${radiusCenter.isPerson ? 'text-blue-700' : 'text-red-700'}`;
      const centerLabel = radiusCenter.label ? ` từ "${radiusCenter.label}"` : '';
      distLine.textContent =
        distKm < 1
          ? `📍 ${Math.round(distKm * 1000)} m${centerLabel}`
          : `📍 ${distKm.toFixed(2)} km${centerLabel}`;
      container.appendChild(distLine);
    } else {
      const distLine = document.createElement('div');
      distLine.className = 'text-xs font-semibold text-blue-700 pt-0.5';
      distLine.textContent = '🎯 Tâm bán kính lọc';
      container.appendChild(distLine);
    }
  } else if (
    !isEventMarker &&
    selectedCase &&
    selectedCase.latitude !== null &&
    selectedCase.longitude !== null
  ) {
    const distKm = haversineDistanceKm(
      selectedCase.latitude,
      selectedCase.longitude,
      coordinates[1],
      coordinates[0],
    );
    const distLine = document.createElement('div');
    distLine.className = 'text-xs font-medium text-red-700 pt-0.5';
    distLine.textContent =
      distKm < 1
        ? labels.distanceMetersFromScene
          ? labels.distanceMetersFromScene(Math.round(distKm * 1000))
          : `📍 ${Math.round(distKm * 1000)} m from crime scene`
        : labels.distanceKmFromScene
          ? labels.distanceKmFromScene(distKm.toFixed(2))
          : `📍 ${distKm.toFixed(2)} km from crime scene`;
    container.appendChild(distLine);
  }

  const links = document.createElement('div');
  links.className = 'flex gap-3 pt-1 text-xs';

  const contactLink = document.createElement('a');
  contactLink.href = isEventMarker
    ? `/events/${encodeURIComponent(props.personId)}`
    : `/people/${encodeURIComponent(props.personId)}`;
  contactLink.textContent = labels.viewContact;
  contactLink.className = 'underline text-blue-700';
  links.appendChild(contactLink);

  const directionsLink = document.createElement('a');
  directionsLink.href = `https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}`;
  directionsLink.target = '_blank';
  directionsLink.rel = 'noopener noreferrer';
  directionsLink.textContent = labels.directions;
  directionsLink.className = 'underline text-blue-700';
  links.appendChild(directionsLink);

  container.appendChild(links);

  if (!isEventMarker && selectedCase) {
    const actionWrap = document.createElement('div');
    actionWrap.className = 'pt-1.5 border-t border-gray-200 mt-1';
    const flagBtn = document.createElement('button');
    flagBtn.type = 'button';
    flagBtn.className =
      'w-full px-2 py-1 text-xs font-medium rounded bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors';
    flagBtn.textContent = labels.flagAsSuspectInCase
      ? labels.flagAsSuspectInCase(selectedCase.title)
      : `+ Flag as Suspect in "${selectedCase.title}"`;
    flagBtn.onclick = async () => {
      flagBtn.disabled = true;
      flagBtn.textContent = labels.flagSaving || 'Saving...';
      try {
        const res = await fetch(`/api/events/${encodeURIComponent(selectedCase.id)}/people`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personId: props.personId,
            role: 'Proximity Subject',
            involvementType: 'SUSPECT',
            verificationStatus: 'HYPOTHESIS',
            confidence: 'MEDIUM',
          }),
        });
        if (res.ok || res.status === 409) {
          flagBtn.textContent = labels.flaggedInCase || '✓ Flagged in Case';
          flagBtn.className =
            'w-full px-2 py-1 text-xs font-medium rounded bg-emerald-100 text-emerald-900';
        } else {
          flagBtn.textContent = labels.flagFailed || 'Failed — try again';
          flagBtn.disabled = false;
        }
      } catch {
        flagBtn.textContent = labels.flagFailed || 'Failed — try again';
        flagBtn.disabled = false;
      }
    };
    actionWrap.appendChild(flagBtn);
    container.appendChild(actionWrap);
  }

  new maplibregl.Popup({ closeButton: true, offset: 12 }).setLngLat(coordinates).setDOMContent(container).addTo(map);
}

function openClusterPopup(
  map: maplibregl.Map,
  coordinates: [number, number],
  clusterId: number,
  pointCount: number,
  clusterMarkers: MapMarker[],
  labels: {
    clusterTitle: (count: number) => string;
    clusterZoomIn: string;
    clusterHoverTip: string;
    viewContact: string;
    directions: string;
  },
  onSelectMarker?: (marker: MapMarker) => void,
): void {
  const container = document.createElement('div');
  container.className = 'space-y-1.5 text-gray-900 min-w-56 max-w-xs sm:max-w-sm';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between gap-2 border-b border-gray-200 pb-1.5';

  const title = document.createElement('div');
  title.className = 'font-semibold text-sm';
  title.textContent = labels.clusterTitle(pointCount);
  header.appendChild(title);

  const zoomBtn = document.createElement('button');
  zoomBtn.type = 'button';
  zoomBtn.className =
    'px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap';
  zoomBtn.textContent = labels.clusterZoomIn;
  zoomBtn.onclick = () => {
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source
        .getClusterExpansionZoom(clusterId)
        .then((zoom) => {
          map.easeTo({ center: coordinates, zoom });
        })
        .catch(() => {});
    }
  };
  header.appendChild(zoomBtn);
  container.appendChild(header);

  const list = document.createElement('div');
  list.className = 'max-h-60 overflow-y-auto divide-y divide-gray-100 text-xs pr-1';

  for (const m of clusterMarkers) {
    const row = document.createElement('div');
    row.className = 'py-1 flex items-start justify-between gap-2';

    const left = document.createElement('div');
    left.className = 'min-w-0 flex-1';

    const isCrimeScene = m.source === 'event_address';
    const nameLine = document.createElement('div');
    nameLine.className = 'font-medium flex items-start gap-1.5';

    const dot = document.createElement('span');
    dot.className = 'w-2 h-2 rounded-full shrink-0 mt-1';
    dot.style.backgroundColor = isCrimeScene ? '#ef4444' : m.groupColor ?? '#3b82f6';
    nameLine.appendChild(dot);

    const nameText = document.createElement('span');
    nameText.className = 'break-words leading-tight';
    nameText.textContent = m.personName;
    nameLine.appendChild(nameText);
    left.appendChild(nameLine);

    if (m.addressText) {
      const addr = document.createElement('div');
      addr.className = 'text-[11px] text-gray-500 break-words pl-3.5 leading-tight mt-0.5';
      addr.textContent = m.addressText;
      left.appendChild(addr);
    }
    row.appendChild(left);

    const right = document.createElement('div');
    right.className = 'flex items-center gap-2 shrink-0 pt-0.5';

    if (onSelectMarker) {
      const focusBtn = document.createElement('button');
      focusBtn.type = 'button';
      focusBtn.className = 'text-xs text-blue-700 hover:underline whitespace-nowrap font-medium';
      focusBtn.textContent = '🎯 Focus';
      focusBtn.onclick = () => {
        onSelectMarker(m);
      };
      right.appendChild(focusBtn);
    }

    const viewLink = document.createElement('a');
    viewLink.href = m.id.startsWith('evaddr_')
      ? `/events/${encodeURIComponent(m.personId)}`
      : `/people/${encodeURIComponent(m.personId)}`;
    viewLink.textContent = labels.viewContact;
    viewLink.className = 'text-xs underline text-blue-700 whitespace-nowrap';
    right.appendChild(viewLink);

    row.appendChild(right);
    list.appendChild(row);
  }

  container.appendChild(list);

  new maplibregl.Popup({ closeButton: true, offset: 12, maxWidth: '440px' })
    .setLngLat(coordinates)
    .setDOMContent(container)
    .addTo(map);
}

// Popup for a location shared by multiple people (e.g. partners or family
// members living together), listing everyone at that address instead of a
// single person's details.
function openColocatedPopup(
  map: maplibregl.Map,
  coordinates: [number, number],
  colocatedMarkers: MapMarker[],
  labels: { viewContact: string; directions: string; colocatedTitle: (count: number) => string },
  onSelectMarker?: (marker: MapMarker) => void,
): void {
  const container = document.createElement('div');
  container.className = 'space-y-1 text-gray-900';

  const title = document.createElement('div');
  title.className = 'font-semibold text-sm';
  title.textContent = labels.colocatedTitle(colocatedMarkers.length);
  container.appendChild(title);

  const addressText = colocatedMarkers.find((m) => m.addressText)?.addressText;
  if (addressText) {
    const addressLine = document.createElement('div');
    addressLine.className = 'text-xs max-w-56 opacity-70';
    addressLine.textContent = addressText;
    container.appendChild(addressLine);
  }

  const topDivider = document.createElement('div');
  topDivider.className = 'border-t border-gray-200 my-1';
  container.appendChild(topDivider);

  for (const m of colocatedMarkers) {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-3 py-0.5';

    const nameEl = document.createElement('span');
    nameEl.className = 'text-sm';
    nameEl.textContent = m.personName;
    row.appendChild(nameEl);

    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-2';

    if (onSelectMarker) {
      const focusBtn = document.createElement('button');
      focusBtn.type = 'button';
      focusBtn.className = 'text-xs text-blue-700 hover:underline whitespace-nowrap';
      focusBtn.textContent = '🎯 Focus';
      focusBtn.onclick = () => {
        onSelectMarker(m);
      };
      actions.appendChild(focusBtn);
    }

    const link = document.createElement('a');
    link.href = m.id.startsWith('evaddr_')
      ? `/events/${encodeURIComponent(m.personId)}`
      : `/people/${encodeURIComponent(m.personId)}`;
    link.textContent = labels.viewContact;
    link.className = 'text-xs underline text-blue-700 whitespace-nowrap';
    actions.appendChild(link);

    row.appendChild(actions);
    container.appendChild(row);
  }

  const bottomDivider = document.createElement('div');
  bottomDivider.className = 'border-t border-gray-200 mt-1 pt-1';

  const directionsLink = document.createElement('a');
  directionsLink.href = `https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}`;
  directionsLink.target = '_blank';
  directionsLink.rel = 'noopener noreferrer';
  directionsLink.textContent = labels.directions;
  directionsLink.className = 'text-xs underline text-blue-700';
  bottomDivider.appendChild(directionsLink);

  container.appendChild(bottomDivider);

  new maplibregl.Popup({ closeButton: true, offset: 12 })
    .setLngLat(coordinates)
    .setDOMContent(container)
    .addTo(map);
}
