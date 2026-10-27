'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  buildCircleCoords,
  buildSectorConeCoords,
  haversineMeters,
  simplifyDrawingCoords,
  type DrawingCoord,
  type DrawingType,
  type EvidenceMapDrawing,
  type EvidenceMapMarker,
  type EvidenceMapRoute,
  type LayerVisibilityState,
  type MarkerType,
  type RouteWaypoint,
} from '@/lib/map/evidence-map';

export type MapBaseStyle = 'SATELLITE_HYBRID' | 'SATELLITE_PURE' | 'DARK' | 'LIGHT';

export type MapToolMode =
  | 'SELECT'
  | 'ADD_CAMERA'
  | 'ADD_BTS'
  | 'ADD_EVIDENCE'
  | 'ADD_CUSTOM'
  | 'DRAW_ROUTE'
  | 'DRAW_FREEHAND'
  | 'DRAW_LINE'
  | 'DRAW_POLYGON'
  | 'DRAW_RECTANGLE'
  | 'DRAW_CIRCLE'
  | 'DRAW_TEXT';

export interface ActiveDrawingStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: 'SOLID' | 'DASHED';
  fillOpacity: number;
  label: string;
}

export interface MapViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface CrimeSceneMapCanvasProps {
  markers: EvidenceMapMarker[];
  routes: EvidenceMapRoute[];
  drawings: EvidenceMapDrawing[];
  defaultCenter: { latitude: number; longitude: number } | null;
  layerVisibility: LayerVisibilityState;
  baseStyle: MapBaseStyle;
  toolMode: MapToolMode;
  drawingStyle: ActiveDrawingStyle;
  selectedItemId: string | null;
  draftRouteWaypoints: RouteWaypoint[];
  activeTimelineTimestamp: number | null;
  focusTarget: { lat: number; lng: number; seq: number } | null;
  onMapClickForNewMarker: (lat: number, lng: number, markerType: MarkerType) => void;
  onSelectMarker: (marker: EvidenceMapMarker) => void;
  onMarkerDragEnd: (markerId: string, lat: number, lng: number) => void;
  onAddRouteWaypoint: (wp: RouteWaypoint) => void;
  onQuickFinishRoute: () => void;
  onCancelTool: () => void;
  onSelectRoute: (route: EvidenceMapRoute) => void;
  onUpdateRouteWaypoints: (routeId: string, waypoints: RouteWaypoint[]) => void;
  onUpdateDraftRouteWaypoints: (waypoints: RouteWaypoint[]) => void;
  onSelectDrawing: (drawing: EvidenceMapDrawing) => void;
  onCreateDrawing: (payload: {
    drawingType: DrawingType;
    coordinates: DrawingCoord[];
    radiusMeters?: number | null;
    label?: string | null;
  }) => void;
  onRegisterSnapshotGetter?: (getter: () => Promise<string | null>) => void;
  onBoundsChange?: (bounds: MapViewportBounds) => void;
  inspectorCoordinate?: { lat: number; lng: number } | null;
  inspectorContent?: React.ReactNode;
}

const DEFAULT_VIETNAM_CENTER: [number, number] = [105.8342, 21.0278];

function buildStyleSpec(baseStyle: MapBaseStyle): maplibregl.StyleSpecification | string {
  if (baseStyle === 'DARK') {
    return 'https://tiles.openfreemap.org/styles/dark';
  }
  if (baseStyle === 'LIGHT') {
    return 'https://tiles.openfreemap.org/styles/positron';
  }

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

  if (baseStyle === 'SATELLITE_HYBRID') {
    sources['ofm-vector'] = {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    };
    layers.push(
      {
        id: 'hybrid-roads-line',
        type: 'line',
        source: 'ofm-vector',
        'source-layer': 'transportation',
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.35)',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12,
            0.8,
            16,
            2.2,
            19,
            4,
          ],
        },
      },
      {
        id: 'hybrid-road-labels',
        type: 'symbol',
        source: 'ofm-vector',
        'source-layer': 'transportation_name',
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(15, 23, 42, 0.9)',
          'text-halo-width': 1.8,
        },
      },
      {
        id: 'hybrid-poi-labels',
        type: 'symbol',
        source: 'ofm-vector',
        'source-layer': 'poi',
        minzoom: 15,
        layout: {
          'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-offset': [0, 0.8],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#fde68a',
          'text-halo-color': 'rgba(15, 23, 42, 0.9)',
          'text-halo-width': 1.5,
        },
      },
      {
        id: 'hybrid-place-labels',
        type: 'symbol',
        source: 'ofm-vector',
        'source-layer': 'place',
        layout: {
          'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name']],
          'text-font': ['Noto Sans Bold'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            12,
            14,
            15,
            18,
            17,
          ],
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(15, 23, 42, 0.95)',
          'text-halo-width': 2.2,
        },
      }
    );
  }

  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources,
    layers,
  };
}

export function getMarkerBadgeConfig(marker: EvidenceMapMarker): {
  icon: string;
  bg: string;
  border: string;
  typeLabel: string;
} {
  switch (marker.markerType) {
    case 'CAMERA': {
      if (marker.cameraStatus === 'CLEAR') {
        return {
          icon: '📹',
          bg: '#475569',
          border: '#94a3b8',
          typeLabel: 'Cam (Trống)',
        };
      }
      if (marker.cameraStatus === 'BLIND_BROKEN') {
        return {
          icon: '🚫',
          bg: '#1e293b',
          border: '#64748b',
          typeLabel: 'Cam hỏng',
        };
      }
      return {
        icon: '📹',
        bg: marker.color || '#dc2626',
        border: '#fca5a5',
        typeLabel: 'Camera',
      };
    }
    case 'BTS':
      return {
        icon: '📡',
        bg: marker.color || '#2563eb',
        border: '#93c5fd',
        typeLabel: marker.btsCarrier ? `BTS ${marker.btsCarrier}` : 'Trạm BTS',
      };
    case 'CRIME_SCENE':
      return {
        icon: '🔥',
        bg: marker.color || '#b91c1c',
        border: '#fde047',
        typeLabel: 'Hiện trường',
      };
    case 'PHYSICAL_EVIDENCE':
      return {
        icon: '🧤',
        bg: marker.color || '#d97706',
        border: '#fde68a',
        typeLabel: 'Vật chứng',
      };
    case 'WITNESS':
      return {
        icon: '👁️',
        bg: marker.color || '#059669',
        border: '#6ee7b7',
        typeLabel: 'Nhân chứng',
      };
    case 'CUSTOM':
    default:
      return {
        icon: '📍',
        bg: marker.color || '#7c3aed',
        border: '#c4b5fd',
        typeLabel: 'Điểm ghim',
      };
  }
}

function formatShortTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CrimeSceneMapCanvas({
  markers,
  routes,
  drawings,
  defaultCenter,
  layerVisibility,
  baseStyle,
  toolMode,
  drawingStyle,
  selectedItemId,
  draftRouteWaypoints,
  activeTimelineTimestamp,
  focusTarget,
  onMapClickForNewMarker,
  onSelectMarker,
  onMarkerDragEnd,
  onAddRouteWaypoint,
  onQuickFinishRoute,
  onCancelTool,
  onSelectRoute,
  onUpdateRouteWaypoints,
  onUpdateDraftRouteWaypoints,
  onSelectDrawing,
  onCreateDrawing,
  onRegisterSnapshotGetter,
  onBoundsChange,
  inspectorCoordinate,
  inspectorContent,
}: CrimeSceneMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [styleReadyVersion, setStyleReadyVersion] = useState(0);
  const htmlMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routeHandleMarkersRef = useRef<maplibregl.Marker[]>([]);
  const inspectorMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [inspectorPortalEl, setInspectorPortalEl] = useState<HTMLDivElement | null>(null);
  const hasFittedInitialBoundsRef = useRef(false);

  // Interactive drawing draft states (for Pencil, Line, Polygon, Rectangle, Circle)
  const [draftCoords, setDraftCoords] = useState<DrawingCoord[]>([]);
  const [cursorCoord, setCursorCoord] = useState<DrawingCoord | null>(null);
  const isFreehandDrawingRef = useRef(false);
  const freehandPointsRef = useRef<DrawingCoord[]>([]);

  // Clear draft coordinates whenever toolMode changes
  useEffect(() => {
    setDraftCoords([]);
    setCursorCoord(null);
    isFreehandDrawingRef.current = false;
    freehandPointsRef.current = [];
  }, [toolMode]);

  // Visible markers filtered by layer toggles and timeline playback
  const visibleMarkers = useMemo(() => {
    return markers.filter((m) => {
      if (m.markerType === 'CAMERA' && !layerVisibility.cameras) return false;
      if (m.markerType === 'BTS' && !layerVisibility.bts) return false;
      if (
        (m.markerType === 'CRIME_SCENE' ||
          m.markerType === 'PHYSICAL_EVIDENCE' ||
          m.markerType === 'WITNESS') &&
        !layerVisibility.evidence
      ) {
        return false;
      }
      if (m.markerType === 'CUSTOM' && !layerVisibility.customMarkers) return false;

      if (activeTimelineTimestamp !== null && m.occurredAt) {
        const t = new Date(m.occurredAt).getTime();
        if (!Number.isNaN(t) && t > activeTimelineTimestamp) {
          return false;
        }
      }
      return true;
    });
  }, [markers, layerVisibility, activeTimelineTimestamp]);

  // Keep latest callbacks & state in ref for MapLibre & keyboard listeners
  const callbacksRef = useRef({
    toolMode,
    drawingStyle,
    draftCoords,
    draftRouteWaypoints,
    visibleMarkers,
    onMapClickForNewMarker,
    onSelectMarker,
    onMarkerDragEnd,
    onAddRouteWaypoint,
    onQuickFinishRoute,
    onCancelTool,
    onSelectRoute,
    onUpdateRouteWaypoints,
    onUpdateDraftRouteWaypoints,
    onSelectDrawing,
    onCreateDrawing,
    onBoundsChange,
    routes,
    drawings,
  });
  useEffect(() => {
    callbacksRef.current = {
      toolMode,
      drawingStyle,
      draftCoords,
      draftRouteWaypoints,
      visibleMarkers,
      onMapClickForNewMarker,
      onSelectMarker,
      onMarkerDragEnd,
      onAddRouteWaypoint,
      onQuickFinishRoute,
      onCancelTool,
      onSelectRoute,
      onUpdateRouteWaypoints,
      onUpdateDraftRouteWaypoints,
      onSelectDrawing,
      onCreateDrawing,
      onBoundsChange,
      routes,
      drawings,
    };
  });

  // Helper to commit in-progress Line, Polygon, or Route (triggered by Right-click, Double-click, or Enter)
  const commitActiveDraft = () => {
    const {
      toolMode: mode,
      draftCoords: coords,
      draftRouteWaypoints: routeWps,
      drawingStyle: style,
      onCreateDrawing: handleCreateDrawing,
      onQuickFinishRoute: handleFinishRoute,
    } = callbacksRef.current;

    if (mode === 'DRAW_LINE' && coords.length >= 2) {
      handleCreateDrawing({
        drawingType: 'LINE',
        coordinates: coords,
        label: style.label || null,
      });
      setDraftCoords([]);
      return true;
    }
    if (mode === 'DRAW_POLYGON' && coords.length >= 3) {
      handleCreateDrawing({
        drawingType: 'POLYGON',
        coordinates: coords,
        label: style.label || null,
      });
      setDraftCoords([]);
      return true;
    }
    if (mode === 'DRAW_ROUTE' && routeWps.length >= 2) {
      handleFinishRoute();
      return true;
    }
    return false;
  };

  // Keyboard shortcuts: Escape to cancel, Enter to finish drawing/route
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (ev.key === 'Escape') {
        if (callbacksRef.current.draftCoords.length > 0) {
          setDraftCoords([]);
          return;
        }
        if (callbacksRef.current.toolMode !== 'SELECT') {
          callbacksRef.current.onCancelTool();
        }
      } else if (ev.key === 'Enter') {
        if (commitActiveDraft()) {
          ev.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Register high-res composite snapshot function for Print Map feature
  useEffect(() => {
    if (!onRegisterSnapshotGetter) return;

    const getSnapshot = async (): Promise<string | null> => {
      const map = mapRef.current;
      if (!map) return null;

      return new Promise((resolve) => {
        map.once('render', () => {
          try {
            const glCanvas = map.getCanvas();
            const outCanvas = document.createElement('canvas');
            outCanvas.width = glCanvas.width;
            outCanvas.height = glCanvas.height;
            const ctx = outCanvas.getContext('2d');
            if (!ctx) {
              resolve(glCanvas.toDataURL('image/png'));
              return;
            }

            // 1. Draw the WebGL base map (Satellite + Cones + Routes + Drawings)
            ctx.drawImage(glCanvas, 0, 0);

            // 2. Composite visible HTML markers directly onto the snapshot so print output has all pins & labels
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.scale(dpr, dpr);

            callbacksRef.current.visibleMarkers.forEach((m) => {
              const pt = map.project([m.longitude, m.latitude]);
              const cfg = getMarkerBadgeConfig(m);
              const timeStr = formatShortTime(m.occurredAt);
              const text = `${cfg.icon} ${m.label}${timeStr ? ` (${timeStr})` : ''}`;

              ctx.font = 'bold 11px sans-serif';
              const textWidth = Math.min(ctx.measureText(text).width, 190);
              const pillW = textWidth + 16;
              const pillH = 22;
              const x = pt.x - pillW / 2;
              const y = pt.y - pillH / 2;

              // Pill background
              ctx.fillStyle = cfg.bg;
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(x, y, pillW, pillH, 11);
              ctx.fill();
              ctx.stroke();

              // Label text
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, pt.x, pt.y, 190);
            });

            ctx.restore();
            resolve(outCanvas.toDataURL('image/png'));
          } catch {
            resolve(null);
          }
        });
        map.triggerRepaint();
      });
    };

    onRegisterSnapshotGetter(getSnapshot);
  }, [onRegisterSnapshotGetter]);

  // Initialize MapLibre instance
  useEffect(() => {
    if (!containerRef.current) return;

    const initialCenter: [number, number] = defaultCenter
      ? [defaultCenter.longitude, defaultCenter.latitude]
      : markers.length > 0
      ? [markers[0].longitude, markers[0].latitude]
      : DEFAULT_VIETNAM_CENTER;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyleSpec(baseStyle),
      center: initialCenter,
      zoom: defaultCenter || markers.length > 0 ? 16 : 13,
      attributionControl: false,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
      },
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      'bottom-right'
    );
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }),
      'bottom-left'
    );

    const emitBounds = () => {
      if (!callbacksRef.current.onBoundsChange) return;
      const b = map.getBounds();
      callbacksRef.current.onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    };

    map.on('load', () => {
      setStyleReadyVersion((v) => v + 1);
      emitBounds();
    });

    map.on('moveend', emitBounds);

    // Right-click (contextmenu) on map: Finish active drawing/route OR cancel tool
    map.on('contextmenu', (e) => {
      const mode = callbacksRef.current.toolMode;
      if (mode === 'SELECT') return;
      e.preventDefault();

      if (!commitActiveDraft()) {
        setDraftCoords([]);
        callbacksRef.current.onCancelTool();
      }
    });

    // Double-click on map: Finish active Line, Polygon, or Route
    map.on('dblclick', (e) => {
      const mode = callbacksRef.current.toolMode;
      if (
        mode === 'DRAW_LINE' ||
        mode === 'DRAW_POLYGON' ||
        mode === 'DRAW_ROUTE'
      ) {
        e.preventDefault();
        commitActiveDraft();
      }
    });

    // Left-click handler
    map.on('click', (e) => {
      const {
        toolMode: mode,
        onMapClickForNewMarker: handleNewMarker,
        onAddRouteWaypoint: handleAddWp,
        onCreateDrawing: handleCreateDrawing,
        onSelectRoute: handleSelectRoute,
        onSelectDrawing: handleSelectDrawing,
        routes: currentRoutes,
        drawings: currentDrawings,
      } = callbacksRef.current;

      const lat = Number(e.lngLat.lat.toFixed(7));
      const lng = Number(e.lngLat.lng.toFixed(7));

      if (mode === 'ADD_CAMERA') {
        handleNewMarker(lat, lng, 'CAMERA');
        return;
      }
      if (mode === 'ADD_BTS') {
        handleNewMarker(lat, lng, 'BTS');
        return;
      }
      if (mode === 'ADD_EVIDENCE') {
        handleNewMarker(lat, lng, 'PHYSICAL_EVIDENCE');
        return;
      }
      if (mode === 'ADD_CUSTOM') {
        handleNewMarker(lat, lng, 'CUSTOM');
        return;
      }
      if (mode === 'DRAW_ROUTE') {
        handleAddWp({ lat, lng });
        return;
      }
      if (mode === 'DRAW_TEXT') {
        handleCreateDrawing({
          drawingType: 'TEXT',
          coordinates: [{ lat, lng }],
          label: callbacksRef.current.drawingStyle.label || 'Ghi chú',
        });
        return;
      }
      if (mode === 'DRAW_LINE' || mode === 'DRAW_POLYGON') {
        setDraftCoords((prev) => [...prev, { lat, lng }]);
        return;
      }
      if (mode === 'DRAW_RECTANGLE') {
        setDraftCoords((prev) => {
          if (prev.length === 0) {
            return [{ lat, lng }];
          }
          const start = prev[0];
          const rectCoords: DrawingCoord[] = [
            { lat: start.lat, lng: start.lng },
            { lat: start.lat, lng },
            { lat, lng },
            { lat, lng: start.lng },
          ];
          handleCreateDrawing({
            drawingType: 'RECTANGLE',
            coordinates: rectCoords,
            label: callbacksRef.current.drawingStyle.label || null,
          });
          return [];
        });
        return;
      }
      if (mode === 'DRAW_CIRCLE') {
        setDraftCoords((prev) => {
          if (prev.length === 0) {
            return [{ lat, lng }];
          }
          const center = prev[0];
          const radiusMeters = Math.max(
            5,
            Math.round(haversineMeters(center.lat, center.lng, lat, lng))
          );
          handleCreateDrawing({
            drawingType: 'CIRCLE',
            coordinates: [center],
            radiusMeters,
            label:
              callbacksRef.current.drawingStyle.label ||
              `R = ${radiusMeters}m`,
          });
          return [];
        });
        return;
      }

      if (mode === 'SELECT') {
        const interactiveLayers = [
          'evidence-routes-hit',
          'evidence-drawings-line-hit',
          'evidence-drawings-fill',
          'evidence-drawings-text',
        ].filter((id) => map.getLayer(id));

        if (interactiveLayers.length > 0) {
          const features = map.queryRenderedFeatures(e.point, {
            layers: interactiveLayers,
          });
          if (features.length > 0) {
            const top = features[0];
            const kind = top.properties?.featureKind;
            const itemId = top.properties?.itemId;
            if (kind === 'ROUTE' && itemId) {
              const found = currentRoutes.find((r) => r.id === itemId);
              if (found) handleSelectRoute(found);
              return;
            }
            if (kind === 'DRAWING' && itemId) {
              const found = currentDrawings.find((d) => d.id === itemId);
              if (found) handleSelectDrawing(found);
              return;
            }
          }
        }
      }
    });

    map.on('mousemove', (e) => {
      const mode = callbacksRef.current.toolMode;
      const lat = Number(e.lngLat.lat.toFixed(7));
      const lng = Number(e.lngLat.lng.toFixed(7));

      if (mode === 'DRAW_FREEHAND' && isFreehandDrawingRef.current) {
        freehandPointsRef.current.push({ lat, lng });
        setDraftCoords([...freehandPointsRef.current]);
        return;
      }

      if (
        mode === 'DRAW_LINE' ||
        mode === 'DRAW_POLYGON' ||
        mode === 'DRAW_RECTANGLE' ||
        mode === 'DRAW_CIRCLE' ||
        mode === 'DRAW_ROUTE'
      ) {
        setCursorCoord({ lat, lng });
      }
    });

    map.on('mousedown', (e) => {
      if (callbacksRef.current.toolMode !== 'DRAW_FREEHAND') return;
      if (e.originalEvent.button !== 0) return;
      e.preventDefault();
      isFreehandDrawingRef.current = true;
      const startPt = {
        lat: Number(e.lngLat.lat.toFixed(7)),
        lng: Number(e.lngLat.lng.toFixed(7)),
      };
      freehandPointsRef.current = [startPt];
      setDraftCoords([startPt]);
    });

    map.on('mouseup', () => {
      if (
        callbacksRef.current.toolMode !== 'DRAW_FREEHAND' ||
        !isFreehandDrawingRef.current
      ) {
        return;
      }
      isFreehandDrawingRef.current = false;
      const rawPoints = freehandPointsRef.current;
      freehandPointsRef.current = [];
      setDraftCoords([]);

      if (rawPoints.length >= 2) {
        const simplified = simplifyDrawingCoords(rawPoints, 0.000012);
        callbacksRef.current.onCreateDrawing({
          drawingType: 'FREEHAND',
          coordinates: simplified,
          label: callbacksRef.current.drawingStyle.label || null,
        });
      }
    });

    mapRef.current = map;

    return () => {
      htmlMarkersRef.current.forEach((m) => m.remove());
      htmlMarkersRef.current = [];
      routeHandleMarkersRef.current.forEach((m) => m.remove());
      routeHandleMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle dragPan & doubleClickZoom based on active tool
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (toolMode === 'DRAW_FREEHAND') {
      map.dragPan.disable();
      map.doubleClickZoom.disable();
    } else if (
      toolMode === 'DRAW_LINE' ||
      toolMode === 'DRAW_POLYGON' ||
      toolMode === 'DRAW_ROUTE'
    ) {
      map.dragPan.enable();
      map.doubleClickZoom.disable();
    } else {
      map.dragPan.enable();
      map.doubleClickZoom.enable();
    }
  }, [toolMode]);

  // Update map base style when user switches Satellite Hybrid / Pure / Dark / Light
  const prevBaseStyleRef = useRef<MapBaseStyle>(baseStyle);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || prevBaseStyleRef.current === baseStyle) return;
    prevBaseStyleRef.current = baseStyle;

    map.setStyle(buildStyleSpec(baseStyle));
    const onStyleData = () => {
      if (map.isStyleLoaded()) {
        setStyleReadyVersion((v) => v + 1);
        map.off('styledata', onStyleData);
      }
    };
    map.on('styledata', onStyleData);
  }, [baseStyle]);

  // Fit bounds on initial data load
  useEffect(() => {
    const map = mapRef.current;
    if (!map || hasFittedInitialBoundsRef.current) return;

    const allCoords: [number, number][] = [];
    markers.forEach((m) => allCoords.push([m.longitude, m.latitude]));
    routes.forEach((r) => r.waypoints.forEach((w) => allCoords.push([w.lng, w.lat])));
    drawings.forEach((d) => d.coordinates.forEach((c) => allCoords.push([c.lng, c.lat])));

    if (allCoords.length > 0) {
      hasFittedInitialBoundsRef.current = true;
      if (allCoords.length === 1) {
        map.jumpTo({ center: allCoords[0], zoom: 16 });
      } else {
        const bounds = new maplibregl.LngLatBounds(allCoords[0], allCoords[0]);
        allCoords.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, { padding: 70, maxZoom: 17, duration: 600 });
      }
    } else if (defaultCenter) {
      hasFittedInitialBoundsRef.current = true;
      map.jumpTo({
        center: [defaultCenter.longitude, defaultCenter.latitude],
        zoom: 16,
      });
    }
  }, [markers, routes, drawings, defaultCenter]);

  // Respond to explicit flyTo focus requests
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    map.flyTo({
      center: [focusTarget.lng, focusTarget.lat],
      zoom: Math.max(map.getZoom(), 17),
      duration: 700,
    });
  }, [focusTarget]);

  // Build GeoJSON for Camera FoV Cones & BTS Coverage Circles/Sectors
  const coverageGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];

    visibleMarkers.forEach((m) => {
      if (
        m.markerType === 'CAMERA' &&
        layerVisibility.cameraFov &&
        m.cameraDirection !== null &&
        m.cameraDirection !== undefined
      ) {
        const coneRing = buildSectorConeCoords(
          m.latitude,
          m.longitude,
          m.cameraDirection,
          m.cameraFovDeg || 60,
          48
        );
        const color =
          m.cameraStatus === 'CLEAR'
            ? '#94a3b8'
            : m.cameraStatus === 'BLIND_BROKEN'
            ? '#475569'
            : m.color || '#ef4444';
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coneRing],
          },
          properties: {
            color,
            fillOpacity: 0.26,
          },
        });
      }

      if (m.markerType === 'BTS' && layerVisibility.btsCoverage) {
        const radius = m.btsRadiusMeters || 300;
        const ring =
          m.btsAzimuthDeg !== null && m.btsAzimuthDeg !== undefined
            ? buildSectorConeCoords(
                m.latitude,
                m.longitude,
                m.btsAzimuthDeg,
                120,
                radius,
                32
              )
            : buildCircleCoords(m.latitude, m.longitude, radius, 64);

        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [ring],
          },
          properties: {
            color: m.color || '#3b82f6',
            fillOpacity: 0.14,
          },
        });
      }
    });

    return { type: 'FeatureCollection', features };
  }, [visibleMarkers, layerVisibility.cameraFov, layerVisibility.btsCoverage]);

  // Build GeoJSON for Tactical Drawings
  const drawingsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!layerVisibility.drawings) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features: GeoJSON.Feature[] = [];

    drawings.forEach((d) => {
      if (!d.coordinates || d.coordinates.length === 0) return;
      const isSelected = selectedItemId === d.id;

      if (d.drawingType === 'CIRCLE') {
        const center = d.coordinates[0];
        const radius = d.radiusMeters || 100;
        const ring = buildCircleCoords(center.lat, center.lng, radius, 64);
        features.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [ring] },
          properties: {
            itemId: d.id,
            featureKind: 'DRAWING',
            geomKind: 'POLYGON',
            strokeColor: d.strokeColor,
            strokeWidth: isSelected ? d.strokeWidth + 2 : d.strokeWidth,
            strokeStyle: d.strokeStyle,
            fillColor: d.fillColor || d.strokeColor,
            fillOpacity: d.fillOpacity,
            label: d.label || `R = ${Math.round(radius)}m`,
          },
        });
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [center.lng, center.lat] },
          properties: {
            itemId: d.id,
            featureKind: 'DRAWING',
            geomKind: 'LABEL',
            strokeColor: d.strokeColor,
            label: d.label || `R = ${Math.round(radius)}m`,
          },
        });
      } else if (d.drawingType === 'POLYGON' || d.drawingType === 'RECTANGLE') {
        if (d.coordinates.length < 3) return;
        const ring: [number, number][] = d.coordinates.map((c) => [c.lng, c.lat]);
        ring.push([d.coordinates[0].lng, d.coordinates[0].lat]);
        const avgLat =
          d.coordinates.reduce((acc, c) => acc + c.lat, 0) / d.coordinates.length;
        const avgLng =
          d.coordinates.reduce((acc, c) => acc + c.lng, 0) / d.coordinates.length;

        features.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [ring] },
          properties: {
            itemId: d.id,
            featureKind: 'DRAWING',
            geomKind: 'POLYGON',
            strokeColor: d.strokeColor,
            strokeWidth: isSelected ? d.strokeWidth + 2 : d.strokeWidth,
            strokeStyle: d.strokeStyle,
            fillColor: d.fillColor || d.strokeColor,
            fillOpacity: d.fillOpacity,
            label: d.label || '',
          },
        });
        if (d.label) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [avgLng, avgLat] },
            properties: {
              itemId: d.id,
              featureKind: 'DRAWING',
              geomKind: 'LABEL',
              strokeColor: d.strokeColor,
              label: d.label,
            },
          });
        }
      } else if (d.drawingType === 'LINE' || d.drawingType === 'FREEHAND') {
        if (d.coordinates.length < 2) return;
        const lineCoords: [number, number][] = d.coordinates.map((c) => [
          c.lng,
          c.lat,
        ]);
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: lineCoords },
          properties: {
            itemId: d.id,
            featureKind: 'DRAWING',
            geomKind: 'LINE',
            strokeColor: d.strokeColor,
            strokeWidth: isSelected ? d.strokeWidth + 2 : d.strokeWidth,
            strokeStyle: d.strokeStyle,
            label: d.label || '',
          },
        });
        if (d.label) {
          const mid = d.coordinates[Math.floor(d.coordinates.length / 2)];
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [mid.lng, mid.lat] },
            properties: {
              itemId: d.id,
              featureKind: 'DRAWING',
              geomKind: 'LABEL',
              strokeColor: d.strokeColor,
              label: d.label,
            },
          });
        }
      } else if (d.drawingType === 'TEXT') {
        const pt = d.coordinates[0];
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
          properties: {
            itemId: d.id,
            featureKind: 'DRAWING',
            geomKind: 'LABEL',
            strokeColor: d.strokeColor,
            label: d.label || 'Ghi chú',
          },
        });
      }
    });

    return { type: 'FeatureCollection', features };
  }, [drawings, layerVisibility.drawings, selectedItemId]);

  // Build GeoJSON for Routes
  const routesGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!layerVisibility.routes) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features: GeoJSON.Feature[] = [];

    routes.forEach((r) => {
      if (!r.waypoints || r.waypoints.length < 2) return;

      const pts =
        activeTimelineTimestamp !== null
          ? r.waypoints.filter((w) => {
              if (!w.timestamp) return true;
              const t = new Date(w.timestamp).getTime();
              return Number.isNaN(t) || t <= activeTimelineTimestamp;
            })
          : r.waypoints;

      if (pts.length < 2) return;

      const isSelected = selectedItemId === r.id;
      const coords: [number, number][] = pts.map((w) => [w.lng, w.lat]);

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
        properties: {
          itemId: r.id,
          featureKind: 'ROUTE',
          label: r.label,
          color: r.color || '#ef4444',
          routeType: r.routeType,
          strokeWidth: isSelected ? 6 : 4,
        },
      });
    });

    return { type: 'FeatureCollection', features };
  }, [routes, layerVisibility.routes, selectedItemId, activeTimelineTimestamp]);

  // Build GeoJSON for active interactive draft
  const draftGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];

    if (toolMode === 'DRAW_ROUTE' && draftRouteWaypoints.length > 0) {
      const pts: [number, number][] = draftRouteWaypoints.map((w) => [
        w.lng,
        w.lat,
      ]);
      if (cursorCoord) {
        pts.push([cursorCoord.lng, cursorCoord.lat]);
      }
      if (pts.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: pts },
          properties: { color: '#ef4444' },
        });
      }
    }

    if (
      (toolMode === 'DRAW_FREEHAND' || toolMode === 'DRAW_LINE') &&
      draftCoords.length > 0
    ) {
      const pts: [number, number][] = draftCoords.map((c) => [c.lng, c.lat]);
      if (toolMode === 'DRAW_LINE' && cursorCoord) {
        pts.push([cursorCoord.lng, cursorCoord.lat]);
      }
      if (pts.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: pts },
          properties: { color: drawingStyle.strokeColor },
        });
      }
    }

    if (toolMode === 'DRAW_POLYGON' && draftCoords.length > 0) {
      const pts: [number, number][] = draftCoords.map((c) => [c.lng, c.lat]);
      if (cursorCoord) {
        pts.push([cursorCoord.lng, cursorCoord.lat]);
      }
      if (pts.length >= 3) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...pts, pts[0]]],
          },
          properties: { color: drawingStyle.strokeColor },
        });
      } else if (pts.length === 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: pts },
          properties: { color: drawingStyle.strokeColor },
        });
      }
    }

    if (
      toolMode === 'DRAW_RECTANGLE' &&
      draftCoords.length === 1 &&
      cursorCoord
    ) {
      const s = draftCoords[0];
      const e = cursorCoord;
      const ring: [number, number][] = [
        [s.lng, s.lat],
        [e.lng, s.lat],
        [e.lng, e.lat],
        [s.lng, e.lat],
        [s.lng, s.lat],
      ];
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: { color: drawingStyle.strokeColor },
      });
    }

    if (
      toolMode === 'DRAW_CIRCLE' &&
      draftCoords.length === 1 &&
      cursorCoord
    ) {
      const center = draftCoords[0];
      const r = Math.max(
        5,
        haversineMeters(center.lat, center.lng, cursorCoord.lat, cursorCoord.lng)
      );
      const ring = buildCircleCoords(center.lat, center.lng, r, 48);
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: { color: drawingStyle.strokeColor },
      });
    }

    return { type: 'FeatureCollection', features };
  }, [
    toolMode,
    draftRouteWaypoints,
    draftCoords,
    cursorCoord,
    drawingStyle.strokeColor,
  ]);

  // Sync GeoJSON sources & layers onto MapLibre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleReadyVersion === 0) return;

    const covSource = map.getSource('evidence-coverage') as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!covSource) {
      map.addSource('evidence-coverage', {
        type: 'geojson',
        data: coverageGeoJSON,
      });
      map.addLayer({
        id: 'evidence-coverage-fill',
        type: 'fill',
        source: 'evidence-coverage',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['get', 'fillOpacity'],
        },
      });
      map.addLayer({
        id: 'evidence-coverage-outline',
        type: 'line',
        source: 'evidence-coverage',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.85,
        },
      });
    } else {
      covSource.setData(coverageGeoJSON);
    }

    const drawSource = map.getSource('evidence-drawings') as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!drawSource) {
      map.addSource('evidence-drawings', {
        type: 'geojson',
        data: drawingsGeoJSON,
      });
      map.addLayer({
        id: 'evidence-drawings-fill',
        type: 'fill',
        source: 'evidence-drawings',
        filter: ['==', ['get', 'geomKind'], 'POLYGON'],
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': ['get', 'fillOpacity'],
        },
      });
      map.addLayer({
        id: 'evidence-drawings-solid-line',
        type: 'line',
        source: 'evidence-drawings',
        filter: [
          'all',
          ['!=', ['get', 'geomKind'], 'LABEL'],
          ['!=', ['get', 'strokeStyle'], 'DASHED'],
        ],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'strokeColor'],
          'line-width': ['get', 'strokeWidth'],
        },
      });
      map.addLayer({
        id: 'evidence-drawings-dashed-line',
        type: 'line',
        source: 'evidence-drawings',
        filter: [
          'all',
          ['!=', ['get', 'geomKind'], 'LABEL'],
          ['==', ['get', 'strokeStyle'], 'DASHED'],
        ],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'strokeColor'],
          'line-width': ['get', 'strokeWidth'],
          'line-dasharray': [3, 2],
        },
      });
      map.addLayer({
        id: 'evidence-drawings-line-hit',
        type: 'line',
        source: 'evidence-drawings',
        filter: ['!=', ['get', 'geomKind'], 'LABEL'],
        paint: {
          'line-color': '#000000',
          'line-width': 14,
          'line-opacity': 0,
        },
      });
      map.addLayer({
        id: 'evidence-drawings-text',
        type: 'symbol',
        source: 'evidence-drawings',
        filter: ['==', ['get', 'geomKind'], 'LABEL'],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Bold', 'Open Sans Bold'],
          'text-size': 13,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#0f172a',
          'text-halo-width': 2,
        },
      });
    } else {
      drawSource.setData(drawingsGeoJSON);
    }

    const routeSource = map.getSource('evidence-routes') as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!routeSource) {
      map.addSource('evidence-routes', {
        type: 'geojson',
        data: routesGeoJSON,
      });
      map.addLayer({
        id: 'evidence-routes-casing',
        type: 'line',
        source: 'evidence-routes',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#0f172a',
          'line-width': ['+', ['get', 'strokeWidth'], 3],
          'line-opacity': 0.7,
        },
      });
      map.addLayer({
        id: 'evidence-routes-confirmed',
        type: 'line',
        source: 'evidence-routes',
        filter: ['==', ['get', 'routeType'], 'CONFIRMED_PATH'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'strokeWidth'],
        },
      });
      map.addLayer({
        id: 'evidence-routes-dashed',
        type: 'line',
        source: 'evidence-routes',
        filter: ['!=', ['get', 'routeType'], 'CONFIRMED_PATH'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'strokeWidth'],
          'line-dasharray': [2.5, 2],
        },
      });
      map.addLayer({
        id: 'evidence-routes-arrows',
        type: 'symbol',
        source: 'evidence-routes',
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 75,
          'text-field': '▶',
          'text-font': ['Noto Sans Bold', 'Open Sans Bold'],
          'text-size': 14,
          'text-keep-upright': false,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': ['get', 'color'],
          'text-halo-width': 2,
        },
      });
      map.addLayer({
        id: 'evidence-routes-labels',
        type: 'symbol',
        source: 'evidence-routes',
        layout: {
          'symbol-placement': 'line-center',
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Bold', 'Open Sans Bold'],
          'text-size': 12,
          'text-offset': [0, -1],
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#0f172a',
          'text-halo-width': 2,
        },
      });
      map.addLayer({
        id: 'evidence-routes-hit',
        type: 'line',
        source: 'evidence-routes',
        paint: {
          'line-color': '#000000',
          'line-width': 16,
          'line-opacity': 0,
        },
      });
    } else {
      routeSource.setData(routesGeoJSON);
    }

    const draftSource = map.getSource('evidence-draft') as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!draftSource) {
      map.addSource('evidence-draft', {
        type: 'geojson',
        data: draftGeoJSON,
      });
      map.addLayer({
        id: 'evidence-draft-fill',
        type: 'fill',
        source: 'evidence-draft',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.22,
        },
      });
      map.addLayer({
        id: 'evidence-draft-line',
        type: 'line',
        source: 'evidence-draft',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-dasharray': [2, 1.5],
        },
      });
    } else {
      draftSource.setData(draftGeoJSON);
    }
  }, [
    styleReadyVersion,
    coverageGeoJSON,
    drawingsGeoJSON,
    routesGeoJSON,
    draftGeoJSON,
  ]);

  // Render interactive HTML markers inside isolated canvas stacking context
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    htmlMarkersRef.current.forEach((m) => m.remove());
    htmlMarkersRef.current = [];

    visibleMarkers.forEach((marker) => {
      const cfg = getMarkerBadgeConfig(marker);
      const isSelected = selectedItemId === marker.id;
      const timeStr = formatShortTime(marker.occurredAt);

      let isTimelineFocused = false;
      if (activeTimelineTimestamp !== null && marker.occurredAt) {
        const diff = Math.abs(
          activeTimelineTimestamp - new Date(marker.occurredAt).getTime()
        );
        isTimelineFocused = diff <= 15 * 60 * 1000;
      }

      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer select-none';
      // Keep marker z-index strictly low (1 to 5) inside isolated map container so it never overlaps UI overlays
      el.style.zIndex = isSelected || isTimelineFocused ? '5' : '2';

      const pill = document.createElement('div');
      pill.style.backgroundColor = cfg.bg;
      pill.style.borderColor =
        isSelected || isTimelineFocused ? '#ffffff' : cfg.border;
      pill.style.borderWidth = isSelected || isTimelineFocused ? '2.5px' : '1.5px';
      pill.style.boxShadow =
        isSelected || isTimelineFocused
          ? '0 0 0 3px rgba(250, 204, 21, 0.55), 0 4px 12px rgba(0,0,0,0.6)'
          : '0 2px 6px rgba(0,0,0,0.45)';
      pill.className =
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[11px] font-bold transition-transform duration-150 hover:scale-105';

      const iconSpan = document.createElement('span');
      iconSpan.textContent = cfg.icon;
      pill.appendChild(iconSpan);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'max-w-[105px] truncate';
      labelSpan.textContent = marker.label;
      pill.appendChild(labelSpan);

      if (timeStr) {
        const timeBadge = document.createElement('span');
        timeBadge.className =
          'ml-0.5 px-1 rounded bg-black/35 text-[10px] font-mono text-amber-200';
        timeBadge.textContent = timeStr;
        pill.appendChild(timeBadge);
      }

      el.appendChild(pill);

      if (marker.mediaUrl) {
        const thumbWrap = document.createElement('div');
        thumbWrap.className = `${
          isSelected || isTimelineFocused ? 'block' : 'hidden group-hover:block'
        } absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-32 bg-slate-900/95 border border-white/25 rounded-lg p-1 shadow-xl pointer-events-none z-10`;

        const thumbSrc = marker.mediaUrl.replace(
          /\/(video|preview|original)$/,
          '/thumbnail'
        );
        const img = document.createElement('img');
        img.src = thumbSrc;
        img.alt = marker.label;
        img.className = 'w-full h-16 object-cover rounded';
        thumbWrap.appendChild(img);

        if (marker.mediaType === 'VIDEO') {
          const vidBadge = document.createElement('span');
          vidBadge.className =
            'absolute top-2 right-2 px-1 py-0.2 rounded bg-black/75 text-white text-[9px] font-bold';
          vidBadge.textContent = '🎬 VIDEO';
          thumbWrap.appendChild(vidBadge);
        }

        el.appendChild(thumbWrap);
      }

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (callbacksRef.current.toolMode === 'DRAW_ROUTE') {
          callbacksRef.current.onAddRouteWaypoint({
            lat: marker.latitude,
            lng: marker.longitude,
            markerId: marker.id,
            timestamp: marker.occurredAt,
            label: marker.label,
          });
        } else {
          callbacksRef.current.onSelectMarker(marker);
        }
      });

      const mapMarker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        draggable: toolMode === 'SELECT',
      })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);

      mapMarker.on('dragend', () => {
        const lngLat = mapMarker.getLngLat();
        callbacksRef.current.onMarkerDragEnd(
          marker.id,
          Number(lngLat.lat.toFixed(7)),
          Number(lngLat.lng.toFixed(7))
        );
      });

      htmlMarkersRef.current.push(mapMarker);
    });
  }, [
    visibleMarkers,
    selectedItemId,
    activeTimelineTimestamp,
    toolMode,
  ]);

  // Render interactive route vertex & midpoint [+] handles to bend/shape routes along roads or rivers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    routeHandleMarkersRef.current.forEach((m) => m.remove());
    routeHandleMarkersRef.current = [];

    const isDraftMode = toolMode === 'DRAW_ROUTE';
    const selectedSavedRoute =
      !isDraftMode && layerVisibility.routes && selectedItemId
        ? routes.find((r) => r.id === selectedItemId) || null
        : null;

    const activeWaypoints = isDraftMode
      ? draftRouteWaypoints
      : selectedSavedRoute?.waypoints || [];

    if (activeWaypoints.length === 0) return;

    const routeColor = isDraftMode
      ? '#ef4444'
      : selectedSavedRoute?.color || '#ef4444';

    // Helper to live-preview bent route geometry on the MapLibre canvas during drag
    const previewWaypointsLive = (tempWaypoints: RouteWaypoint[]) => {
      if (isDraftMode) {
        const draftSrc = map.getSource('evidence-draft') as
          | maplibregl.GeoJSONSource
          | undefined;
        if (draftSrc && tempWaypoints.length >= 2) {
          draftSrc.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: tempWaypoints.map((w) => [w.lng, w.lat]),
                },
                properties: { color: routeColor },
              },
            ],
          });
        }
      } else if (selectedSavedRoute) {
        const routeSrc = map.getSource('evidence-routes') as
          | maplibregl.GeoJSONSource
          | undefined;
        if (routeSrc) {
          const features: GeoJSON.Feature[] = [];
          callbacksRef.current.routes.forEach((r) => {
            const wps =
              r.id === selectedSavedRoute.id ? tempWaypoints : r.waypoints;
            if (!wps || wps.length < 2) return;
            features.push({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: wps.map((w) => [w.lng, w.lat]),
              },
              properties: {
                itemId: r.id,
                featureKind: 'ROUTE',
                label: r.label,
                color: r.color || '#ef4444',
                routeType: r.routeType,
                strokeWidth: r.id === selectedSavedRoute.id ? 6 : 4,
              },
            });
          });
          routeSrc.setData({ type: 'FeatureCollection', features });
        }
      }
    };

    const commitWaypoints = (nextWaypoints: RouteWaypoint[]) => {
      if (isDraftMode) {
        callbacksRef.current.onUpdateDraftRouteWaypoints(nextWaypoints);
      } else if (selectedSavedRoute) {
        callbacksRef.current.onUpdateRouteWaypoints(
          selectedSavedRoute.id,
          nextWaypoints
        );
      }
    };

    // 1. Render Vertex Handles (numbered circles at each waypoint: drag to move, right-click to delete)
    activeWaypoints.forEach((wp, idx) => {
      const vEl = document.createElement('div');
      vEl.className = 'group relative select-none';
      vEl.style.zIndex = '6';

      const dot = document.createElement('div');
      dot.style.backgroundColor = routeColor;
      dot.className =
        'w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[9px] font-extrabold text-white cursor-move transition-transform hover:scale-125';
      dot.textContent = String(idx + 1);
      dot.title =
        activeWaypoints.length > 2
          ? `Điểm lộ trình #${idx + 1}${
              wp.label ? ` (${wp.label})` : ''
            }\n• Kéo thả để nắn đường\n• Chuột phải để xóa điểm này`
          : `Điểm lộ trình #${idx + 1}${
              wp.label ? ` (${wp.label})` : ''
            }\n• Kéo thả để nắn đường`;

      vEl.appendChild(dot);

      vEl.addEventListener('click', (ev) => {
        ev.stopPropagation();
      });

      vEl.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (activeWaypoints.length <= 2) return;
        const next = activeWaypoints.filter((_, i) => i !== idx);
        commitWaypoints(next);
      });

      const vMarker = new maplibregl.Marker({
        element: vEl,
        anchor: 'center',
        draggable: true,
      })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map);

      vMarker.on('drag', () => {
        const pos = vMarker.getLngLat();
        const temp = activeWaypoints.map((item, i) =>
          i === idx
            ? {
                ...item,
                lat: Number(pos.lat.toFixed(7)),
                lng: Number(pos.lng.toFixed(7)),
              }
            : item
        );
        previewWaypointsLive(temp);
      });

      vMarker.on('dragend', () => {
        const pos = vMarker.getLngLat();
        const next = activeWaypoints.map((item, i) =>
          i === idx
            ? {
                ...item,
                lat: Number(pos.lat.toFixed(7)),
                lng: Number(pos.lng.toFixed(7)),
              }
            : item
        );
        commitWaypoints(next);
      });

      routeHandleMarkersRef.current.push(vMarker);
    });

    // 2. Render Midpoint [+] Handles between each consecutive pair of waypoints to bend along roads/rivers
    for (let i = 0; i < activeWaypoints.length - 1; i++) {
      const a = activeWaypoints[i];
      const b = activeWaypoints[i + 1];
      const midLat = Number(((a.lat + b.lat) / 2).toFixed(7));
      const midLng = Number(((a.lng + b.lng) / 2).toFixed(7));

      const mEl = document.createElement('div');
      mEl.className = 'select-none';
      mEl.style.zIndex = '6';

      const plusBtn = document.createElement('div');
      plusBtn.style.borderColor = routeColor;
      plusBtn.className =
        'w-4 h-4 rounded-full bg-white/95 text-slate-900 border-2 shadow-md flex items-center justify-center text-[11px] font-black leading-none cursor-grab active:cursor-grabbing transition-transform hover:scale-125';
      plusBtn.textContent = '+';
      plusBtn.title =
        'Kéo hoặc click [+] để chèn thêm điểm uốn nắn theo đường / sông';
      mEl.appendChild(plusBtn);

      let wasDragged = false;

      mEl.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (wasDragged) return;
        const next = [
          ...activeWaypoints.slice(0, i + 1),
          { lat: midLat, lng: midLng, label: 'Điểm uốn' },
          ...activeWaypoints.slice(i + 1),
        ];
        commitWaypoints(next);
      });

      const mMarker = new maplibregl.Marker({
        element: mEl,
        anchor: 'center',
        draggable: true,
      })
        .setLngLat([midLng, midLat])
        .addTo(map);

      mMarker.on('dragstart', () => {
        wasDragged = true;
      });

      mMarker.on('drag', () => {
        const pos = mMarker.getLngLat();
        const temp = [
          ...activeWaypoints.slice(0, i + 1),
          {
            lat: Number(pos.lat.toFixed(7)),
            lng: Number(pos.lng.toFixed(7)),
            label: 'Điểm uốn',
          },
          ...activeWaypoints.slice(i + 1),
        ];
        previewWaypointsLive(temp);
      });

      mMarker.on('dragend', () => {
        const pos = mMarker.getLngLat();
        const next = [
          ...activeWaypoints.slice(0, i + 1),
          {
            lat: Number(pos.lat.toFixed(7)),
            lng: Number(pos.lng.toFixed(7)),
            label: 'Điểm uốn',
          },
          ...activeWaypoints.slice(i + 1),
        ];
        commitWaypoints(next);
      });

      routeHandleMarkersRef.current.push(mMarker);
    }
  }, [
    toolMode,
    draftRouteWaypoints,
    selectedItemId,
    routes,
    layerVisibility.routes,
  ]);

  // Anchor interactive tooltip/inspector card directly at the selected item's GPS coordinates on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !inspectorCoordinate || !inspectorContent) {
      if (inspectorMarkerRef.current) {
        inspectorMarkerRef.current.remove();
        inspectorMarkerRef.current = null;
      }
      setInspectorPortalEl(null);
      return;
    }

    let el = inspectorPortalEl;
    if (!el) {
      el = document.createElement('div');
      el.className = 'z-30 pointer-events-auto select-text';
      el.addEventListener('click', (e) => e.stopPropagation());
      el.addEventListener('dblclick', (e) => e.stopPropagation());
      el.addEventListener('mousedown', (e) => e.stopPropagation());
      el.addEventListener('wheel', (e) => e.stopPropagation());
      setInspectorPortalEl(el);
    }

    if (!inspectorMarkerRef.current) {
      inspectorMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
        offset: [0, -24],
      })
        .setLngLat([inspectorCoordinate.lng, inspectorCoordinate.lat])
        .addTo(map);
    } else {
      inspectorMarkerRef.current.setLngLat([
        inspectorCoordinate.lng,
        inspectorCoordinate.lat,
      ]);
    }
  }, [inspectorCoordinate, Boolean(inspectorContent), inspectorPortalEl]);

  useEffect(() => {
    return () => {
      if (inspectorMarkerRef.current) {
        inspectorMarkerRef.current.remove();
        inspectorMarkerRef.current = null;
      }
    };
  }, []);

  const cursorClass =
    toolMode === 'SELECT'
      ? 'cursor-grab active:cursor-grabbing'
      : 'cursor-crosshair';

  return (
    <div className="relative w-full h-full overflow-hidden isolate">
      <div
        ref={containerRef}
        className={`w-full h-full ${cursorClass}`}
        data-testid="crime-scene-map-canvas"
      />

      {inspectorPortalEl &&
        inspectorContent &&
        createPortal(
          <div className="relative flex flex-col items-center">
            {inspectorContent}
            <div className="w-3 h-3 rotate-45 bg-slate-900 border-r border-b border-white/20 -mt-1.5 shadow-md" />
          </div>,
          inspectorPortalEl
        )}

      {/* Compact Floating Action Bar when drawing multi-point Line or Polygon */}
      {(toolMode === 'DRAW_LINE' || toolMode === 'DRAW_POLYGON') && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/95 text-white px-3 py-1.5 rounded-xl shadow-lg border border-white/15 text-xs">
          <span>
            {draftCoords.length > 0 ? (
              <>
                Đã chấm <strong>{draftCoords.length}</strong> điểm{' '}
                <span className="text-slate-400">
                  (Chuột phải / Enter để lưu · Esc để hủy)
                </span>
              </>
            ) : (
              <span>
                Click chấm điểm trên bản đồ{' '}
                <span className="text-slate-400">
                  (Chuột phải / Enter hoàn tất · Esc thoát)
                </span>
              </span>
            )}
          </span>
          {draftCoords.length >= (toolMode === 'DRAW_LINE' ? 2 : 3) && (
            <button
              type="button"
              onClick={() => {
                onCreateDrawing({
                  drawingType: toolMode === 'DRAW_LINE' ? 'LINE' : 'POLYGON',
                  coordinates: draftCoords,
                  label: drawingStyle.label || null,
                });
                setDraftCoords([]);
              }}
              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 font-bold"
            >
              ✓ Lưu
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setDraftCoords([]);
              onCancelTool();
            }}
            className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600"
          >
            Thoát (Esc)
          </button>
        </div>
      )}
    </div>
  );
}
