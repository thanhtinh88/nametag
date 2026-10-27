'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  computeRouteMetrics,
  DEFAULT_LAYER_VISIBILITY,
  type CameraStatus,
  type DrawingCoord,
  type DrawingType,
  type EvidenceMapDrawing,
  type EvidenceMapMarker,
  type EvidenceMapPayload,
  type EvidenceMapRoute,
  type LayerVisibilityState,
  type LinkedPersonSummary,
  type MarkerType,
  type RouteType,
  type RouteWaypoint,
} from '@/lib/map/evidence-map';
import type {
  ActiveDrawingStyle,
  MapBaseStyle,
  MapToolMode,
  MapViewportBounds,
} from './CrimeSceneMapCanvas';
import TacticalSidebarContainer from '@/components/filters/TacticalSidebarContainer';
import TacticalSectionExpander from '@/components/filters/TacticalSectionExpander';

const CrimeSceneMapCanvas = dynamic(() => import('./CrimeSceneMapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-300 text-sm">
      🛰️ Đang tải bản đồ...
    </div>
  ),
});

interface ImmichAlbumSummary {
  id: string;
  albumName: string;
  assetCount: number;
}

interface ImmichAssetItem {
  id: string;
  type: 'IMAGE' | 'VIDEO' | string;
  originalFileName: string | null;
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  camera: string | null;
}

type FlyoutPanelType =
  | 'NONE'
  | 'PIN'
  | 'ROUTE'
  | 'DRAW'
  | 'ITEMS'
  | 'LAYERS'
  | 'INSPECTOR';

interface CrimeSceneMapTabProps {
  eventId: string;
  eventTitle: string;
  caseCode?: string | null;
  immichAlbumId?: string | null;
  casePeople: Array<{
    personId: string;
    involvementType?: string;
    person: LinkedPersonSummary;
  }>;
  availablePeople: LinkedPersonSummary[];
  onCountChange?: (counts: {
    markers: number;
    routes: number;
    drawings: number;
  }) => void;
}

const MARKER_TYPE_META: Record<
  MarkerType,
  { label: string; shortLabel: string; icon: string; defaultColor: string }
> = {
  CAMERA: {
    label: 'Camera an ninh',
    shortLabel: 'Camera',
    icon: '📹',
    defaultColor: '#dc2626',
  },
  BTS: {
    label: 'Trạm phát sóng BTS',
    shortLabel: 'Trạm BTS',
    icon: '📡',
    defaultColor: '#2563eb',
  },
  CRIME_SCENE: {
    label: 'Hiện trường chính',
    shortLabel: 'Hiện trường',
    icon: '🔥',
    defaultColor: '#b91c1c',
  },
  PHYSICAL_EVIDENCE: {
    label: 'Vật chứng thu giữ',
    shortLabel: 'Vật chứng',
    icon: '🧤',
    defaultColor: '#d97706',
  },
  WITNESS: {
    label: 'Nhân chứng',
    shortLabel: 'Nhân chứng',
    icon: '👁️',
    defaultColor: '#059669',
  },
  CUSTOM: {
    label: 'Điểm đánh dấu',
    shortLabel: 'Điểm ghim',
    icon: '📍',
    defaultColor: '#7c3aed',
  },
};

const TACTICAL_COLORS = [
  { hex: '#ef4444', name: 'Đỏ' },
  { hex: '#f59e0b', name: 'Vàng' },
  { hex: '#10b981', name: 'Xanh lá' },
  { hex: '#3b82f6', name: 'Xanh dương' },
  { hex: '#a855f7', name: 'Tím' },
  { hex: '#ffffff', name: 'Trắng' },
];

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatDateTimeVN(iso: string | null | undefined): string {
  if (!iso) return 'Chưa rõ giờ';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Chưa rõ giờ';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getImmichPosterUrl(mediaUrl: string | null): string | undefined {
  if (!mediaUrl) return undefined;
  if (mediaUrl.includes('/api/immich/assets/')) {
    return mediaUrl.replace(/\/(video|preview|original)$/, '/thumbnail');
  }
  return undefined;
}

export default function CrimeSceneMapTab({
  eventId,
  eventTitle,
  caseCode,
  immichAlbumId: initialImmichAlbumId,
  casePeople,
  availablePeople,
  onCountChange,
}: CrimeSceneMapTabProps) {
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<EvidenceMapMarker[]>([]);
  const [routes, setRoutes] = useState<EvidenceMapRoute[]>([]);
  const [drawings, setDrawings] = useState<EvidenceMapDrawing[]>([]);
  const [defaultCenter, setDefaultCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Tactical Sidebar State (matching UnifiedNetworkGraph / Sơ đồ mạng lưới đối tượng và điều tra)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rosterFlyoutOpen, setRosterFlyoutOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<
    'ALL' | 'CAMERA' | 'BTS' | 'ROUTES' | 'EVIDENCE' | 'DRAWINGS'
  >('ALL');
  const [cameraStatusFilter, setCameraStatusFilter] = useState<
    'ALL' | 'CAPTURED' | 'CLEAR' | 'BLIND_BROKEN'
  >('ALL');
  const [groupByMode, setGroupByMode] = useState<
    'CATEGORY' | 'SUBJECT' | 'TIMELINE'
  >('CATEGORY');
  const [filterInViewOnly, setFilterInViewOnly] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapViewportBounds | null>(null);
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(10);
  const [camerasExpanded, setCamerasExpanded] = useState(true);
  const [btsExpanded, setBtsExpanded] = useState(true);
  const [evidenceExpanded, setEvidenceExpanded] = useState(true);
  const [routesExpanded, setRoutesExpanded] = useState(true);
  const [drawingsExpanded, setDrawingsExpanded] = useState(true);
  const [activeFlyout, setActiveFlyout] = useState<FlyoutPanelType>('NONE');
  const [baseStyle, setBaseStyle] = useState<MapBaseStyle>('SATELLITE_HYBRID');
  const [toolMode, setToolMode] = useState<MapToolMode>('SELECT');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibilityState>(
    DEFAULT_LAYER_VISIBILITY
  );
  const [subjectFilterId, setSubjectFilterId] = useState<string>('ALL');
  const [focusTarget, setFocusTarget] = useState<{
    lat: number;
    lng: number;
    seq: number;
  } | null>(null);

  // Snapshot getter registered by MapLibre canvas for Print Map feature
  const snapshotGetterRef = useRef<(() => Promise<string | null>) | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Drawing style for Pencil / Line / Polygon / Circle / Text
  const [drawingStyle, setDrawingStyle] = useState<ActiveDrawingStyle>({
    strokeColor: '#f59e0b',
    strokeWidth: 3,
    strokeStyle: 'SOLID',
    fillOpacity: 0.22,
    label: '',
  });

  // Selected item for inspection in Flyout
  const [selectedMarker, setSelectedMarker] =
    useState<EvidenceMapMarker | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<EvidenceMapRoute | null>(
    null
  );
  const [selectedDrawing, setSelectedDrawing] =
    useState<EvidenceMapDrawing | null>(null);

  // Marker Modal (Create / Edit)
  const [markerModalOpen, setMarkerModalOpen] = useState(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [markerForm, setMarkerForm] = useState({
    markerType: 'CAMERA' as MarkerType,
    personId: '',
    label: '',
    description: '',
    latitude: 21.0278,
    longitude: 105.8342,
    occurredAt: '',
    color: '#dc2626',
    mediaUrl: '',
    mediaType: 'IMAGE' as 'IMAGE' | 'VIDEO',
    cameraDirection: 90,
    hasCameraDirection: true,
    cameraFovDeg: 60,
    cameraStatus: 'CAPTURED' as CameraStatus,
    rawTimeNote: '',
    btsCode: '',
    btsCarrier: 'Viettel',
    btsRadiusMeters: 300,
    btsAzimuthDeg: '',
    subscriberInfo: '',
  });
  const [isSavingMarker, setIsSavingMarker] = useState(false);

  // Immich state (Albums + Assets from `/api/immich/albums` and `/api/immich/assets`)
  const [activeImmichAlbumId, setActiveImmichAlbumId] = useState<string>(
    initialImmichAlbumId || ''
  );
  const [immichAlbums, setImmichAlbums] = useState<ImmichAlbumSummary[]>([]);
  const [immichAssets, setImmichAssets] = useState<ImmichAssetItem[]>([]);
  const [loadingImmich, setLoadingImmich] = useState(false);
  const [immichMediaFilter, setImmichMediaFilter] = useState<
    'ALL' | 'IMAGE' | 'VIDEO' | 'GPS' | 'TIME_MATCH'
  >('ALL');
  const [immichSearchQuery, setImmichSearchQuery] = useState('');
  const [isBatchImportingGps, setIsBatchImportingGps] = useState(false);

  // Draft Route builder state
  const [draftRouteWaypoints, setDraftRouteWaypoints] = useState<
    RouteWaypoint[]
  >([]);
  const [routeForm, setRouteForm] = useState({
    label: '',
    personId: '',
    routeType: 'CONFIRMED_PATH' as RouteType,
    color: '#ef4444',
    notes: '',
  });
  const [isSavingRoute, setIsSavingRoute] = useState(false);

  // Timeline Scrubber & Playback state
  const [timelineEnabled, setTimelineEnabled] = useState(false);
  const [timelineCursorMs, setTimelineCursorMs] = useState<number | null>(null);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [openToolMenu, setOpenToolMenu] = useState<'NONE' | 'ADD' | 'DRAW' | 'CATEGORY'>('NONE');
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/evidence-map`);
      if (!res.ok) throw new Error('Không tải được dữ liệu bản đồ');
      const data = (await res.json()) as EvidenceMapPayload;
      setMarkers(data.markers || []);
      setRoutes(data.routes || []);
      setDrawings(data.drawings || []);
      setDefaultCenter(data.defaultCenter || null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Lỗi tải dữ liệu bản đồ'
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  useEffect(() => {
    onCountChange?.({
      markers: markers.length,
      routes: routes.length,
      drawings: drawings.length,
    });
  }, [markers.length, routes.length, drawings.length, onCountChange]);

  // Load Immich albums catalog
  useEffect(() => {
    fetch('/api/immich/albums')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.albums)) {
          setImmichAlbums(data.albums);
          if (!activeImmichAlbumId && data.albums.length > 0) {
            setActiveImmichAlbumId(data.albums[0].id);
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Immich assets whenever activeImmichAlbumId changes
  useEffect(() => {
    if (!activeImmichAlbumId) {
      setImmichAssets([]);
      return;
    }
    setLoadingImmich(true);
    fetch(
      `/api/immich/assets?albumId=${encodeURIComponent(activeImmichAlbumId)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.assets)) {
          setImmichAssets(data.assets);
        } else {
          setImmichAssets([]);
        }
      })
      .catch(() => {
        setImmichAssets([]);
      })
      .finally(() => {
        setLoadingImmich(false);
      });
  }, [activeImmichAlbumId]);

  const filteredImmichAssets = useMemo(() => {
    const q = immichSearchQuery.trim().toLowerCase();
    const formTimeMs = markerForm.occurredAt
      ? new Date(markerForm.occurredAt).getTime()
      : null;

    return immichAssets.filter((a) => {
      if (
        q &&
        !(a.originalFileName || '').toLowerCase().includes(q) &&
        !(a.camera || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      if (immichMediaFilter === 'IMAGE') return a.type === 'IMAGE';
      if (immichMediaFilter === 'VIDEO') return a.type === 'VIDEO';
      if (immichMediaFilter === 'GPS') {
        return a.latitude !== null && a.longitude !== null;
      }
      if (immichMediaFilter === 'TIME_MATCH') {
        if (!formTimeMs || Number.isNaN(formTimeMs) || !a.takenAt) return false;
        const assetMs = new Date(a.takenAt).getTime();
        return (
          !Number.isNaN(assetMs) && Math.abs(assetMs - formTimeMs) <= 30 * 60 * 1000
        );
      }
      return true;
    });
  }, [immichAssets, immichMediaFilter, immichSearchQuery, markerForm.occurredAt]);

  // Restore & persist starred item IDs per event
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`crime-scene-starred-${eventId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setStarredIds(parsed);
      }
    } catch {
      // ignore
    }
  }, [eventId]);

  const toggleStarItem = useCallback(
    (itemId: string) => {
      setStarredIds((prev) => {
        const next = prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId];
        try {
          localStorage.setItem(
            `crime-scene-starred-${eventId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });
    },
    [eventId]
  );

  // Batch auto-pin Immich assets that have EXIF GPS coordinates onto the map
  const handleBatchImportGpsImmichAssets = async () => {
    const gpsAssets = immichAssets.filter(
      (a) =>
        a.latitude !== null &&
        a.longitude !== null &&
        !markers.some((m) => m.mediaUrl?.includes(a.id))
    );
    if (gpsAssets.length === 0) {
      toast.info('Tất cả ảnh/video có tọa độ GPS trong Album đã được ghim!');
      return;
    }

    setIsBatchImportingGps(true);
    let createdCount = 0;
    const newlyCreated: EvidenceMapMarker[] = [];

    try {
      for (const asset of gpsAssets) {
        const isVideo = asset.type === 'VIDEO';
        const mediaUrl = isVideo
          ? `/api/immich/assets/${encodeURIComponent(asset.id)}/video`
          : `/api/immich/assets/${encodeURIComponent(asset.id)}/preview`;
        const label =
          asset.originalFileName?.replace(/\.[^.]+$/, '') ||
          (isVideo ? 'Video hiện trường' : 'Ảnh hiện trường');

        const res = await fetch(`/api/events/${eventId}/evidence-map/markers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            markerType: isVideo ? 'CAMERA' : 'PHYSICAL_EVIDENCE',
            label,
            latitude: Number(asset.latitude),
            longitude: Number(asset.longitude),
            occurredAt: asset.takenAt || null,
            color: isVideo ? '#dc2626' : '#d97706',
            mediaUrl,
            mediaType: isVideo ? 'VIDEO' : 'IMAGE',
          }),
        });
        if (res.ok) {
          const { marker: saved } = (await res.json()) as {
            marker: EvidenceMapMarker;
          };
          newlyCreated.push(saved);
          createdCount += 1;
        }
      }

      if (newlyCreated.length > 0) {
        setMarkers((prev) => [...prev, ...newlyCreated]);
        toast.success(`Đã tự động ghim ${createdCount} file có GPS lên bản đồ!`);
      }
    } catch {
      toast.error('Lỗi khi tự động rải ảnh GPS lên bản đồ');
    } finally {
      setIsBatchImportingGps(false);
    }
  };

  // Save selected Immich album link to the Event in DB if user changes it
  const handleSelectImmichAlbum = async (albumId: string) => {
    setActiveImmichAlbumId(albumId);
    if (albumId && albumId !== initialImmichAlbumId) {
      fetch(`/api/events/${eventId}/immich`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immichAlbumId: albumId }),
      }).catch(() => {});
    }
  };

  const subjectOptions = useMemo(() => {
    const casePersonIds = new Set(casePeople.map((cp) => cp.personId));
    const caseList = casePeople.map((cp) => ({
      id: cp.person.id,
      label: `${
        cp.person.displayNameOverride ||
        [cp.person.surname, cp.person.name].filter(Boolean).join(' ')
      }${cp.person.nickname ? ` (${cp.person.nickname})` : ''} ★`,
    }));
    const otherList = availablePeople
      .filter((p) => !casePersonIds.has(p.id))
      .map((p) => ({
        id: p.id,
        label: `${
          p.displayNameOverride || [p.surname, p.name].filter(Boolean).join(' ')
        }${p.nickname ? ` (${p.nickname})` : ''}`,
      }));
    return [...caseList, ...otherList];
  }, [casePeople, availablePeople]);

  const filteredMarkers = useMemo(() => {
    if (subjectFilterId === 'ALL') return markers;
    return markers.filter((m) => m.personId === subjectFilterId);
  }, [markers, subjectFilterId]);

  const filteredRoutes = useMemo(() => {
    if (subjectFilterId === 'ALL') return routes;
    return routes.filter((r) => r.personId === subjectFilterId);
  }, [routes, subjectFilterId]);

  const timestampedMarkers = useMemo(() => {
    return [...filteredMarkers]
      .filter(
        (m) => m.occurredAt && !Number.isNaN(new Date(m.occurredAt).getTime())
      )
      .sort(
        (a, b) =>
          new Date(a.occurredAt!).getTime() - new Date(b.occurredAt!).getTime()
      );
  }, [filteredMarkers]);

  const timelineRange = useMemo(() => {
    if (timestampedMarkers.length === 0) return null;
    const minMs = new Date(timestampedMarkers[0].occurredAt!).getTime();
    const maxMs = new Date(
      timestampedMarkers[timestampedMarkers.length - 1].occurredAt!
    ).getTime();
    return {
      minMs,
      maxMs: maxMs > minMs ? maxMs : minMs + 60 * 60 * 1000,
    };
  }, [timestampedMarkers]);

  useEffect(() => {
    if (!isPlayingTimeline || !timelineRange) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }

    const span = Math.max(60_000, timelineRange.maxMs - timelineRange.minMs);
    const stepMs = (span / 80) * playbackSpeed;

    playIntervalRef.current = setInterval(() => {
      setTimelineCursorMs((prev) => {
        const current = prev ?? timelineRange.minMs;
        const next = current + stepMs;
        if (next >= timelineRange.maxMs) {
          setIsPlayingTimeline(false);
          return timelineRange.maxMs;
        }
        return next;
      });
    }, 200);

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlayingTimeline, timelineRange, playbackSpeed]);

  const handleMapClickForNewMarker = useCallback(
    (lat: number, lng: number, markerType: MarkerType) => {
      const meta = MARKER_TYPE_META[markerType];
      setEditingMarkerId(null);
      setMarkerForm({
        markerType,
        personId: subjectFilterId !== 'ALL' ? subjectFilterId : '',
        label: '',
        description: '',
        latitude: lat,
        longitude: lng,
        occurredAt: toDatetimeLocalValue(new Date().toISOString()),
        color: meta.defaultColor,
        mediaUrl: '',
        mediaType: 'IMAGE',
        cameraDirection: 90,
        hasCameraDirection: true,
        cameraFovDeg: 60,
        cameraStatus: 'CAPTURED',
        rawTimeNote: '',
        btsCode: '',
        btsCarrier: 'Viettel',
        btsRadiusMeters: 300,
        btsAzimuthDeg: '',
        subscriberInfo: '',
      });
      setMarkerModalOpen(true);
    },
    [subjectFilterId]
  );

  const handleOpenEditMarker = (marker: EvidenceMapMarker) => {
    setEditingMarkerId(marker.id);
    setMarkerForm({
      markerType: marker.markerType,
      personId: marker.personId || '',
      label: marker.label,
      description: marker.description || '',
      latitude: marker.latitude,
      longitude: marker.longitude,
      occurredAt: toDatetimeLocalValue(marker.occurredAt),
      color:
        marker.color ||
        MARKER_TYPE_META[marker.markerType]?.defaultColor ||
        '#dc2626',
      mediaUrl: marker.mediaUrl || '',
      mediaType: marker.mediaType || 'IMAGE',
      cameraDirection: marker.cameraDirection ?? 90,
      hasCameraDirection:
        marker.cameraDirection !== null && marker.cameraDirection !== undefined,
      cameraFovDeg: marker.cameraFovDeg ?? 60,
      cameraStatus: marker.cameraStatus || 'CAPTURED',
      rawTimeNote: marker.rawTimeNote || '',
      btsCode: marker.btsCode || '',
      btsCarrier: marker.btsCarrier || 'Viettel',
      btsRadiusMeters: marker.btsRadiusMeters ?? 300,
      btsAzimuthDeg:
        marker.btsAzimuthDeg !== null && marker.btsAzimuthDeg !== undefined
          ? String(marker.btsAzimuthDeg)
          : '',
      subscriberInfo: marker.subscriberInfo || '',
    });
    setMarkerModalOpen(true);
  };

  const handleSaveMarker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markerForm.label.trim()) {
      toast.error('Vui lòng nhập tên điểm');
      return;
    }

    setIsSavingMarker(true);
    try {
      const payload = {
        markerType: markerForm.markerType,
        personId: markerForm.personId || null,
        label: markerForm.label.trim(),
        description: markerForm.description.trim() || null,
        latitude: Number(markerForm.latitude),
        longitude: Number(markerForm.longitude),
        occurredAt: markerForm.occurredAt
          ? new Date(markerForm.occurredAt).toISOString()
          : null,
        color: markerForm.color || null,
        mediaUrl: markerForm.mediaUrl.trim() || null,
        mediaType: markerForm.mediaType,
        cameraDirection:
          markerForm.markerType === 'CAMERA' && markerForm.hasCameraDirection
            ? Number(markerForm.cameraDirection)
            : null,
        cameraFovDeg:
          markerForm.markerType === 'CAMERA'
            ? Number(markerForm.cameraFovDeg) || 60
            : null,
        cameraStatus:
          markerForm.markerType === 'CAMERA' ? markerForm.cameraStatus : null,
        rawTimeNote:
          markerForm.markerType === 'CAMERA'
            ? markerForm.rawTimeNote.trim() || null
            : null,
        btsCode:
          markerForm.markerType === 'BTS'
            ? markerForm.btsCode.trim() || null
            : null,
        btsCarrier:
          markerForm.markerType === 'BTS'
            ? markerForm.btsCarrier.trim() || null
            : null,
        btsRadiusMeters:
          markerForm.markerType === 'BTS'
            ? Number(markerForm.btsRadiusMeters) || 300
            : null,
        btsAzimuthDeg:
          markerForm.markerType === 'BTS' && markerForm.btsAzimuthDeg !== ''
            ? Number(markerForm.btsAzimuthDeg)
            : null,
        subscriberInfo:
          markerForm.markerType === 'BTS'
            ? markerForm.subscriberInfo.trim() || null
            : null,
      };

      const url = editingMarkerId
        ? `/api/events/${eventId}/evidence-map/markers/${editingMarkerId}`
        : `/api/events/${eventId}/evidence-map/markers`;
      const method = editingMarkerId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Lưu điểm thất bại');
      }

      const { marker: saved } = (await res.json()) as {
        marker: EvidenceMapMarker;
      };

      if (editingMarkerId) {
        setMarkers((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
        setSelectedMarker(saved);
        toast.success('Đã cập nhật điểm');
      } else {
        setMarkers((prev) => [...prev, saved]);
        setSelectedMarker(saved);
        setToolMode('SELECT');
        toast.success('Đã ghim điểm mới');
      }

      setActiveFlyout('INSPECTOR');
      setMarkerModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu điểm');
    } finally {
      setIsSavingMarker(false);
    }
  };

  const handleMarkerDragEnd = useCallback(
    async (markerId: string, lat: number, lng: number) => {
      setMarkers((prev) =>
        prev.map((m) =>
          m.id === markerId ? { ...m, latitude: lat, longitude: lng } : m
        )
      );
      try {
        const res = await fetch(
          `/api/events/${eventId}/evidence-map/markers/${markerId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lng }),
          }
        );
        if (!res.ok) throw new Error('Không cập nhật được tọa độ');
        const { marker: updated } = await res.json();
        setMarkers((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m))
        );
        setSelectedMarker((prev) => (prev?.id === updated.id ? updated : prev));
        toast.success('Đã lưu vị trí mới');
      } catch {
        toast.error('Lỗi lưu tọa độ');
      }
    },
    [eventId]
  );

  const handleDeleteMarker = async (markerId: string) => {
    try {
      const res = await fetch(
        `/api/events/${eventId}/evidence-map/markers/${markerId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Xóa thất bại');
      setMarkers((prev) => prev.filter((m) => m.id !== markerId));
      if (selectedMarker?.id === markerId) {
        setSelectedMarker(null);
        setActiveFlyout('NONE');
      }
      toast.success('Đã xóa điểm');
    } catch {
      toast.error('Không xóa được điểm');
    }
  };

  const handleAddRouteWaypoint = useCallback((wp: RouteWaypoint) => {
    setDraftRouteWaypoints((prev) => [...prev, wp]);
  }, []);

  const handleAutoConnectByTime = () => {
    if (timestampedMarkers.length < 2) {
      toast.error('Cần ít nhất 2 điểm có thời gian để tự động nối!');
      return;
    }
    const autoWaypoints: RouteWaypoint[] = timestampedMarkers.map((m) => ({
      lat: m.latitude,
      lng: m.longitude,
      markerId: m.id,
      timestamp: m.occurredAt,
      label: m.label,
    }));
    setToolMode('DRAW_ROUTE');
    setActiveFlyout('ROUTE');
    setDraftRouteWaypoints(autoWaypoints);
    setRouteForm((prev) => ({
      ...prev,
      label:
        prev.label || `Lộ trình theo giờ (${timestampedMarkers.length} điểm)`,
      personId: subjectFilterId !== 'ALL' ? subjectFilterId : prev.personId,
    }));
    toast.success(`Đã nối ${autoWaypoints.length} điểm! Bấm Lưu hoặc Enter.`);
  };

  const handleSaveRoute = useCallback(async () => {
    if (draftRouteWaypoints.length < 2 || isSavingRoute) {
      if (draftRouteWaypoints.length < 2) {
        toast.error('Chọn ít nhất 2 điểm để lưu lộ trình');
      }
      return;
    }
    const label =
      routeForm.label.trim() ||
      `Lộ trình (${draftRouteWaypoints.length} điểm)`;

    setIsSavingRoute(true);
    try {
      const res = await fetch(`/api/events/${eventId}/evidence-map/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          personId: routeForm.personId || null,
          routeType: routeForm.routeType,
          color: routeForm.color,
          waypoints: draftRouteWaypoints,
          notes: routeForm.notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Không lưu được lộ trình');
      const { route: created } = (await res.json()) as {
        route: EvidenceMapRoute;
      };
      setRoutes((prev) => [...prev, created]);
      setDraftRouteWaypoints([]);
      setRouteForm({
        label: '',
        personId: '',
        routeType: 'CONFIRMED_PATH',
        color: '#ef4444',
        notes: '',
      });
      setToolMode('SELECT');
      setSelectedRoute(created);
      setActiveFlyout('INSPECTOR');
      toast.success('Đã lưu lộ trình');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi lưu lộ trình');
    } finally {
      setIsSavingRoute(false);
    }
  }, [draftRouteWaypoints, isSavingRoute, routeForm, eventId]);

  const handleCancelTool = useCallback(() => {
    setDraftRouteWaypoints([]);
    setToolMode('SELECT');
    setActiveFlyout('NONE');
  }, []);

  const handleDeleteRoute = async (routeId: string) => {
    try {
      const res = await fetch(
        `/api/events/${eventId}/evidence-map/routes/${routeId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Xóa thất bại');
      setRoutes((prev) => prev.filter((r) => r.id !== routeId));
      if (selectedRoute?.id === routeId) {
        setSelectedRoute(null);
        setActiveFlyout('NONE');
      }
      toast.success('Đã xóa lộ trình');
    } catch {
      toast.error('Không xóa được lộ trình');
    }
  };

  const handleUpdateRouteWaypoints = useCallback(
    async (routeId: string, nextWaypoints: RouteWaypoint[]) => {
      if (nextWaypoints.length < 2) {
        toast.error('Lộ trình phải có ít nhất 2 điểm');
        return;
      }

      // Optimistic update for responsive road/river shaping
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === routeId ? { ...r, waypoints: nextWaypoints } : r
        )
      );
      setSelectedRoute((prev) =>
        prev?.id === routeId ? { ...prev, waypoints: nextWaypoints } : prev
      );

      try {
        const res = await fetch(
          `/api/events/${eventId}/evidence-map/routes/${routeId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ waypoints: nextWaypoints }),
          }
        );
        if (!res.ok) throw new Error('Không cập nhật được điểm uốn lộ trình');
        const { route: updated } = (await res.json()) as {
          route: EvidenceMapRoute;
        };
        setRoutes((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        setSelectedRoute((prev) =>
          prev?.id === updated.id ? updated : prev
        );
        toast.success('Đã lưu đường uốn lộ trình');
      } catch {
        toast.error('Lỗi khi lưu điểm uốn lộ trình');
      }
    },
    [eventId]
  );

  const handleCreateDrawing = useCallback(
    async (payload: {
      drawingType: DrawingType;
      coordinates: DrawingCoord[];
      radiusMeters?: number | null;
      label?: string | null;
    }) => {
      try {
        const res = await fetch(
          `/api/events/${eventId}/evidence-map/drawings`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              drawingType: payload.drawingType,
              label: payload.label || drawingStyle.label.trim() || null,
              strokeColor: drawingStyle.strokeColor,
              strokeWidth: drawingStyle.strokeWidth,
              strokeStyle: drawingStyle.strokeStyle,
              fillColor: drawingStyle.strokeColor,
              fillOpacity: drawingStyle.fillOpacity,
              coordinates: payload.coordinates,
              radiusMeters: payload.radiusMeters ?? null,
            }),
          }
        );
        if (!res.ok) throw new Error('Lưu hình vẽ thất bại');
        const { drawing: created } = (await res.json()) as {
          drawing: EvidenceMapDrawing;
        };
        setDrawings((prev) => [...prev, created]);
        toast.success('Đã lưu hình vẽ');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Lỗi lưu hình vẽ');
      }
    },
    [eventId, drawingStyle]
  );

  const handleDeleteDrawing = async (drawingId: string) => {
    try {
      const res = await fetch(
        `/api/events/${eventId}/evidence-map/drawings/${drawingId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Xóa thất bại');
      setDrawings((prev) => prev.filter((d) => d.id !== drawingId));
      if (selectedDrawing?.id === drawingId) {
        setSelectedDrawing(null);
        setActiveFlyout('NONE');
      }
      toast.success('Đã xóa hình vẽ');
    } catch {
      toast.error('Không xóa được hình vẽ');
    }
  };

  // Print Crime Scene Map Report
  const handlePrintMap = async () => {
    if (!snapshotGetterRef.current) {
      toast.error('Bản đồ chưa sẵn sàng để in');
      return;
    }

    setIsPrinting(true);
    try {
      const dataUrl = await snapshotGetterRef.current();
      if (!dataUrl) {
        throw new Error('Không chụp được khung hình bản đồ');
      }

      const printWin = window.open('', '_blank', 'width=1100,height=850');
      if (!printWin) {
        toast.error('Trình duyệt chặn popup. Hãy cho phép mở cửa sổ in!');
        return;
      }

      const nowStr = new Date().toLocaleString('vi-VN');
      const rowsHtml = filteredMarkers
        .map((m, idx) => {
          const meta = MARKER_TYPE_META[m.markerType];
          const extra =
            m.markerType === 'CAMERA'
              ? `Hướng ${m.cameraDirection ?? '-'}° · ${
                  m.rawTimeNote || 'Giờ chuẩn'
                }`
              : m.markerType === 'BTS'
              ? `${m.btsCode || ''} (${m.btsCarrier || 'BTS'}, R=${
                  m.btsRadiusMeters || 300
                }m)`
              : m.description || '';
          return `
            <tr>
              <td style="text-align:center;">${idx + 1}</td>
              <td><strong>${meta.icon} ${escapeHtml(meta.shortLabel)}</strong></td>
              <td><strong>${escapeHtml(m.label)}</strong></td>
              <td>${escapeHtml(formatDateTimeVN(m.occurredAt))}</td>
              <td style="font-family:monospace;">${m.latitude.toFixed(5)}, ${m.longitude.toFixed(5)}</td>
              <td>${escapeHtml(extra)}</td>
            </tr>
          `;
        })
        .join('');

      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>Sơ đồ hiện trường - ${escapeHtml(eventTitle)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
            .title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 0; }
            .sub { font-size: 12px; color: #475569; margin-top: 2px; }
            .map-box { border: 1.5px solid #0f172a; border-radius: 6px; overflow: hidden; text-align: center; background: #0f172a; }
            .map-box img { width: 100%; max-height: 440px; object-fit: contain; display: block; margin: 0 auto; }
            .legend { display: flex; gap: 16px; font-size: 11px; margin: 8px 0; padding: 6px 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; flex-wrap: wrap; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
            th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: left; }
            th { background: #e2e8f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">SƠ ĐỒ HIỆN TRƯỜNG & THU THẬP CHỨNG CỨ</h1>
              <div class="sub">Vụ việc: <strong>${escapeHtml(eventTitle)}</strong> ${
        caseCode ? `(Mã hồ sơ: ${escapeHtml(caseCode)})` : ''
      }</div>
            </div>
            <div class="sub">Thời điểm xuất bản in: ${escapeHtml(nowStr)}</div>
          </div>

          <div class="map-box">
            <img src="${dataUrl}" alt="Bản đồ hiện trường" />
          </div>

          <div class="legend">
            <span><strong>Chú giải:</strong></span>
            <span>📹 Camera an ninh</span>
            <span>📡 Trạm BTS</span>
            <span>🔥 Hiện trường</span>
            <span>🧤 Vật chứng</span>
            <span>👁️ Nhân chứng</span>
            <span>〰️ Lộ trình di chuyển</span>
          </div>

          ${
            filteredMarkers.length > 0
              ? `
            <table>
              <thead>
                <tr>
                  <th style="width:32px;text-align:center;">#</th>
                  <th style="width:110px;">Phân loại</th>
                  <th>Tên điểm / Vị trí</th>
                  <th style="width:130px;">Thời gian</th>
                  <th style="width:140px;">Tọa độ GPS</th>
                  <th>Thông số / Ghi chú</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          `
              : ''
          }
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 250);
            };
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi in bản đồ');
    } finally {
      setIsPrinting(false);
    }
  };

  const draftRouteStats = useMemo(
    () => computeRouteMetrics(draftRouteWaypoints),
    [draftRouteWaypoints]
  );

  const selectedItemId =
    selectedMarker?.id || selectedRoute?.id || selectedDrawing?.id || null;

  const isMarkupToolActive =
    toolMode === 'DRAW_FREEHAND' ||
    toolMode === 'DRAW_LINE' ||
    toolMode === 'DRAW_POLYGON' ||
    toolMode === 'DRAW_RECTANGLE' ||
    toolMode === 'DRAW_CIRCLE' ||
    toolMode === 'DRAW_TEXT';

  // Search, Viewport, and Starred filtering for Roster
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const starredSet = useMemo(() => new Set(starredIds), [starredIds]);

  const isCoordInView = useCallback(
    (lat: number, lng: number) => {
      if (!filterInViewOnly || !mapBounds) return true;
      return (
        lat <= mapBounds.north &&
        lat >= mapBounds.south &&
        lng <= mapBounds.east &&
        lng >= mapBounds.west
      );
    },
    [filterInViewOnly, mapBounds]
  );

  const sortStarredFirst = useCallback(
    <T extends { id: string }>(items: T[]): T[] => {
      return [...items].sort((a, b) => {
        const aStar = starredSet.has(a.id) ? 1 : 0;
        const bStar = starredSet.has(b.id) ? 1 : 0;
        return bStar - aStar;
      });
    },
    [starredSet]
  );

  const searchedMarkers = useMemo(() => {
    const list = filteredMarkers.filter((m) => {
      if (onlyStarred && !starredSet.has(m.id)) return false;
      if (!isCoordInView(m.latitude, m.longitude)) return false;
      if (!normalizedQuery) return true;
      return (
        m.label.toLowerCase().includes(normalizedQuery) ||
        (m.description && m.description.toLowerCase().includes(normalizedQuery)) ||
        (m.btsCode && m.btsCode.toLowerCase().includes(normalizedQuery))
      );
    });
    return sortStarredFirst(list);
  }, [
    filteredMarkers,
    onlyStarred,
    starredSet,
    isCoordInView,
    normalizedQuery,
    sortStarredFirst,
  ]);

  const cameraMarkers = useMemo(
    () =>
      searchedMarkers.filter((m) => {
        if (m.markerType !== 'CAMERA') return false;
        if (cameraStatusFilter !== 'ALL') {
          return (m.cameraStatus || 'CAPTURED') === cameraStatusFilter;
        }
        return true;
      }),
    [searchedMarkers, cameraStatusFilter]
  );
  const btsMarkers = useMemo(
    () => searchedMarkers.filter((m) => m.markerType === 'BTS'),
    [searchedMarkers]
  );
  const evidenceMarkers = useMemo(
    () =>
      searchedMarkers.filter(
        (m) => m.markerType !== 'CAMERA' && m.markerType !== 'BTS'
      ),
    [searchedMarkers]
  );

  const searchedRoutes = useMemo(() => {
    const list = filteredRoutes.filter((r) => {
      if (onlyStarred && !starredSet.has(r.id)) return false;
      if (
        filterInViewOnly &&
        mapBounds &&
        !r.waypoints.some((w) => isCoordInView(w.lat, w.lng))
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (
        r.label.toLowerCase().includes(normalizedQuery) ||
        (r.notes && r.notes.toLowerCase().includes(normalizedQuery))
      );
    });
    return sortStarredFirst(list);
  }, [
    filteredRoutes,
    onlyStarred,
    starredSet,
    filterInViewOnly,
    mapBounds,
    isCoordInView,
    normalizedQuery,
    sortStarredFirst,
  ]);

  const searchedDrawings = useMemo(() => {
    const list = drawings.filter((d) => {
      if (onlyStarred && !starredSet.has(d.id)) return false;
      if (
        filterInViewOnly &&
        mapBounds &&
        !d.coordinates.some((c) => isCoordInView(c.lat, c.lng))
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (d.label || d.drawingType).toLowerCase().includes(normalizedQuery);
    });
    return sortStarredFirst(list);
  }, [
    drawings,
    onlyStarred,
    starredSet,
    filterInViewOnly,
    mapBounds,
    isCoordInView,
    normalizedQuery,
    sortStarredFirst,
  ]);

  const layerCounts = useMemo(() => {
    return {
      cameras: filteredMarkers.filter((m) => m.markerType === 'CAMERA').length,
      bts: filteredMarkers.filter((m) => m.markerType === 'BTS').length,
      evidence: filteredMarkers.filter(
        (m) =>
          m.markerType === 'CRIME_SCENE' ||
          m.markerType === 'PHYSICAL_EVIDENCE' ||
          m.markerType === 'WITNESS'
      ).length,
      customMarkers: filteredMarkers.filter((m) => m.markerType === 'CUSTOM')
        .length,
      routes: filteredRoutes.length,
      drawings: drawings.length,
    };
  }, [filteredMarkers, filteredRoutes, drawings]);

  const totalRosterCount =
    searchedMarkers.length + searchedRoutes.length + searchedDrawings.length;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (subjectFilterId !== 'ALL') count += 1;
    if (filterInViewOnly) count += 1;
    if (onlyStarred) count += 1;
    (Object.keys(DEFAULT_LAYER_VISIBILITY) as Array<keyof LayerVisibilityState>).forEach(
      (k) => {
        if (!layerVisibility[k]) count += 1;
      }
    );
    return count;
  }, [subjectFilterId, filterInViewOnly, onlyStarred, layerVisibility]);

  const handleClearFilters = () => {
    setSubjectFilterId('ALL');
    setFilterInViewOnly(false);
    setOnlyStarred(false);
    setCameraStatusFilter('ALL');
    setLayerVisibility(DEFAULT_LAYER_VISIBILITY);
  };

  const renderMarkerRow = (m: EvidenceMapMarker) => {
    const meta = MARKER_TYPE_META[m.markerType];
    const isSelected = selectedMarker?.id === m.id;
    const isStarred = starredSet.has(m.id);
    return (
      <div
        key={m.id}
        onClick={() => {
          setSelectedMarker(m);
          setSelectedRoute(null);
          setSelectedDrawing(null);
          setActiveFlyout('INSPECTOR');
          setFocusTarget({
            lat: m.latitude,
            lng: m.longitude,
            seq: Date.now(),
          });
        }}
        className={`rounded-xl transition-all p-2 border cursor-pointer flex items-center justify-between gap-1.5 ${
          isSelected
            ? 'bg-primary/10 border-primary ring-1 ring-primary/40'
            : 'bg-surface hover:bg-surface-elevated border-border/50'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 text-white shadow-2xs"
            style={{ backgroundColor: m.color || meta.defaultColor }}
          >
            {meta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`font-semibold truncate flex items-center gap-1 ${
                isSelected ? 'text-primary' : 'text-foreground'
              }`}
            >
              <span className="truncate">{m.label}</span>
              {m.mediaUrl && (
                <span className="text-[10px] shrink-0" title="Có đính kèm ảnh/video">
                  {m.mediaType === 'VIDEO' ? '🎬' : '🖼️'}
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {formatDateTimeVN(m.occurredAt)}
              {m.person
                ? ` · 👤 ${
                    m.person.displayNameOverride ||
                    [m.person.surname, m.person.name].filter(Boolean).join(' ')
                  }`
                : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleStarItem(m.id);
            }}
            className={`p-1 rounded transition-colors ${
              isStarred
                ? 'text-amber-400'
                : 'text-muted-foreground/40 hover:text-amber-400'
            }`}
            title={isStarred ? 'Bỏ ghim quan trọng' : 'Ghim quan trọng lên đầu'}
          >
            ★
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditMarker(m);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-elevated hover:bg-primary/15 text-muted-foreground hover:text-primary border border-border/50"
          >
            Sửa
          </button>
        </div>
      </div>
    );
  };

  const renderRouteRow = (r: EvidenceMapRoute) => {
    const stats = computeRouteMetrics(r.waypoints);
    const isSelected = selectedRoute?.id === r.id;
    const isStarred = starredSet.has(r.id);
    return (
      <div
        key={r.id}
        onClick={() => {
          setSelectedRoute(r);
          setSelectedMarker(null);
          setSelectedDrawing(null);
          setActiveFlyout('INSPECTOR');
          if (r.waypoints.length > 0) {
            setFocusTarget({
              lat: r.waypoints[0].lat,
              lng: r.waypoints[0].lng,
              seq: Date.now(),
            });
          }
        }}
        className={`rounded-xl transition-all p-2 border cursor-pointer flex items-center justify-between gap-2 ${
          isSelected
            ? 'bg-primary/10 border-primary ring-1 ring-primary/40'
            : 'bg-surface hover:bg-surface-elevated border-border/50'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: r.color }}
            />
            <span className="truncate">{r.label}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {r.waypoints.length} điểm nút ·{' '}
            {formatDistance(stats.totalDistanceMeters)}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleStarItem(r.id);
            }}
            className={`p-1 rounded transition-colors ${
              isStarred
                ? 'text-amber-400'
                : 'text-muted-foreground/40 hover:text-amber-400'
            }`}
            title={isStarred ? 'Bỏ ghim quan trọng' : 'Ghim quan trọng lên đầu'}
          >
            ★
          </button>
          <span className="px-1.5 py-0.5 rounded bg-surface-elevated border border-border/60 text-[10px] text-muted-foreground">
            Nắn đường
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-background flex flex-col'
          : 'bg-surface border border-border rounded-xl overflow-hidden shadow-xs flex flex-col h-[560px] sm:h-[620px] lg:h-[660px]'
      }
    >
      {/* MAP CANVAS + DOCKED TOP BAR & LEFT SIDEBAR CONTAINER */}
      <div className="flex-1 flex flex-col relative h-full min-h-0 bg-slate-950 overflow-hidden isolate">
        <TacticalSidebarContainer
          isOpen={sidebarOpen}
          onOpen={() => setSidebarOpen(true)}
          onClose={() => setSidebarOpen(false)}
          title="Sơ đồ hiện trường"
          rosterCount={totalRosterCount}
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((prev) => !prev)}
          storageKeyPrefix="crime-scene-tactical-sidebar"
          defaultWidth={240}
          minWidth={200}
          rosterFlyoutOpen={rosterFlyoutOpen}
          onRosterFlyoutOpenChange={setRosterFlyoutOpen}
          extraHeaderActions={
            <div className="flex items-center gap-1 flex-nowrap">
              <button
                type="button"
                onClick={() => {
                  const next = !timelineEnabled;
                  setTimelineEnabled(next);
                  if (next && timelineRange) {
                    setTimelineCursorMs(timelineRange.maxMs);
                  } else {
                    setIsPlayingTimeline(false);
                    setTimelineCursorMs(null);
                  }
                }}
                className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                  timelineEnabled
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                }`}
                title="Tua theo dòng thời gian"
              >
                <span>⏱️</span>
              </button>

              <button
                type="button"
                disabled={isPrinting}
                onClick={handlePrintMap}
                className="px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-elevated disabled:opacity-40 flex items-center gap-1 transition-colors whitespace-nowrap"
                title="In sơ đồ hiện trường A4"
              >
                <span>🖨️</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen((f) => !f)}
                className="px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-elevated transition-colors"
                title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              >
                {isFullscreen ? '🗗' : '⛶'}
              </button>
            </div>
          }
          searchBar={
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setRosterFlyoutOpen(true);
              }}
              placeholder="Tìm Cam, BTS, lộ trình..."
              className="w-full px-2 py-1 bg-surface border border-border rounded-lg text-xs text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          }
          quickChips={
            <div className="flex items-center gap-1 flex-nowrap">
              {/* Tool 1: Pointer / Select */}
              <button
                type="button"
                onClick={() => {
                  setDraftRouteWaypoints([]);
                  setToolMode('SELECT');
                  setOpenToolMenu('NONE');
                }}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                  toolMode === 'SELECT'
                    ? 'bg-primary text-white border-primary shadow-2xs'
                    : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                }`}
                title="Chế độ chọn & kéo điểm"
              >
                <span>👆</span>
              </button>

              {/* Level-1 Dropdown Menu: ➕ Thêm điểm (Cam, BTS, Vật chứng, Ghim) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenToolMenu((prev) => (prev === 'ADD' ? 'NONE' : 'ADD'))
                  }
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                    toolMode === 'ADD_CAMERA' ||
                    toolMode === 'ADD_BTS' ||
                    toolMode === 'ADD_EVIDENCE' ||
                    toolMode === 'ADD_CUSTOM'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                  }`}
                  title="Thêm điểm ghim mới lên bản đồ (Camera, BTS, Vật chứng...)"
                >
                  <span>
                    {toolMode === 'ADD_CAMERA'
                      ? '📹 +Cam'
                      : toolMode === 'ADD_BTS'
                      ? '📡 +BTS'
                      : toolMode === 'ADD_EVIDENCE'
                      ? '🧤 +Chứng cứ'
                      : toolMode === 'ADD_CUSTOM'
                      ? '📍 +Ghim'
                      : '➕ Thêm'}
                  </span>
                  <span className="text-[9px] opacity-80">▾</span>
                </button>

                {openToolMenu === 'ADD' && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOpenToolMenu('NONE')}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 text-xs">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
                        📌 Chọn loại điểm cần ghim
                      </div>
                      {(
                        [
                          ['ADD_CAMERA', '📹 Camera an ninh', 'text-red-500'],
                          ['ADD_BTS', '📡 Trạm phát sóng BTS', 'text-blue-500'],
                          ['ADD_EVIDENCE', '🧤 Hiện trường / Vật chứng', 'text-amber-500'],
                          ['ADD_CUSTOM', '📍 Điểm ghim tùy chỉnh', 'text-purple-500'],
                        ] as const
                      ).map(([mode, label, colorCls]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setToolMode(mode);
                            setOpenToolMenu('NONE');
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left font-semibold transition-colors ${
                            toolMode === mode
                              ? 'bg-primary/15 text-primary'
                              : `hover:bg-surface-elevated ${colorCls}`
                          }`}
                        >
                          <span>{label}</span>
                          {toolMode === mode && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Level-1 Dropdown Menu: ✏️ Vẽ & Lộ trình */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenToolMenu((prev) => (prev === 'DRAW' ? 'NONE' : 'DRAW'))
                  }
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                    toolMode === 'DRAW_ROUTE' || isMarkupToolActive
                      ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                      : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                  }`}
                  title="Vẽ lộ trình di chuyển hoặc khoanh vùng đánh dấu"
                >
                  <span>
                    {toolMode === 'DRAW_ROUTE'
                      ? '〰️ Lộ trình'
                      : isMarkupToolActive
                      ? '✏️ Đang vẽ'
                      : '✏️ Vẽ'}
                  </span>
                  <span className="text-[9px] opacity-80">▾</span>
                </button>

                {openToolMenu === 'DRAW' && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOpenToolMenu('NONE')}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface border border-border rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setToolMode('DRAW_ROUTE');
                          setOpenToolMenu('NONE');
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left font-bold transition-colors ${
                          toolMode === 'DRAW_ROUTE'
                            ? 'bg-rose-500/15 text-rose-500'
                            : 'hover:bg-surface-elevated text-rose-500'
                        }`}
                      >
                        <span>〰️ Vẽ lộ trình di chuyển</span>
                        {toolMode === 'DRAW_ROUTE' && <span>✓</span>}
                      </button>

                      <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t border-border/60">
                        ✏️ Vẽ khoanh vùng / Đánh dấu
                      </div>
                      {(
                        [
                          ['DRAW_FREEHAND', '✏️ Bút vẽ tự do'],
                          ['DRAW_LINE', '📏 Đường kẻ thẳng'],
                          ['DRAW_POLYGON', '⬠ Đa giác khoanh vùng'],
                          ['DRAW_RECTANGLE', '▭ Hình chữ nhật'],
                          ['DRAW_CIRCLE', '⭕ Vòng tròn bán kính'],
                          ['DRAW_TEXT', '🔤 Nhãn chữ ghi chú'],
                        ] as const
                      ).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setToolMode(mode);
                            setOpenToolMenu('NONE');
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors ${
                            toolMode === mode
                              ? 'bg-amber-500/20 text-amber-500 font-bold'
                              : 'hover:bg-surface-elevated text-foreground'
                          }`}
                        >
                          <span>{label}</span>
                          {toolMode === mode && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          }
          rosterFilterControls={
            <div className="flex items-center gap-1 flex-nowrap">
              {/* Level-1 Dropdown Menu: 📂 Phân loại & Gom nhóm */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenToolMenu((prev) =>
                      prev === 'CATEGORY' ? 'NONE' : 'CATEGORY'
                    )
                  }
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                    activeCategoryTab !== 'ALL' ||
                    groupByMode !== 'CATEGORY' ||
                    cameraStatusFilter !== 'ALL'
                      ? 'bg-primary text-white border-primary shadow-2xs'
                      : 'bg-surface hover:bg-surface-elevated text-foreground border-border'
                  }`}
                  title="Phân loại danh mục & chế độ gom nhóm danh sách"
                >
                  <span>
                    {groupByMode === 'SUBJECT'
                      ? '👤 Theo đối tượng'
                      : groupByMode === 'TIMELINE'
                      ? '🕒 Theo giờ'
                      : activeCategoryTab === 'CAMERA'
                      ? `📹 Cam (${cameraMarkers.length})`
                      : activeCategoryTab === 'BTS'
                      ? `📡 BTS (${btsMarkers.length})`
                      : activeCategoryTab === 'ROUTES'
                      ? `〰️ Đường (${searchedRoutes.length})`
                      : activeCategoryTab === 'EVIDENCE'
                      ? `🧤 Chứng cứ (${evidenceMarkers.length})`
                      : activeCategoryTab === 'DRAWINGS'
                      ? `✏️ Vẽ (${searchedDrawings.length})`
                      : `📂 Tất cả (${totalRosterCount})`}
                  </span>
                  <span className="text-[9px] opacity-80">▾</span>
                </button>

                {openToolMenu === 'CATEGORY' && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOpenToolMenu('NONE')}
                      aria-hidden="true"
                    />
                    <div className="absolute left-0 top-full mt-1.5 w-60 bg-surface border border-border rounded-xl shadow-2xl z-50 p-2 space-y-2 text-xs">
                      <div>
                        <div className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          📂 Chế độ gom nhóm
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {(
                            [
                              ['CATEGORY', '📂 Loại'],
                              ['SUBJECT', '👤 Đ.Tượng'],
                              ['TIMELINE', '🕒 Giờ'],
                            ] as const
                          ).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                setGroupByMode(mode);
                                setRosterFlyoutOpen(true);
                                if (mode !== 'CATEGORY') {
                                  setOpenToolMenu('NONE');
                                }
                              }}
                              className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border text-center transition-colors ${
                                groupByMode === mode
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-surface-elevated border-border text-foreground hover:bg-surface'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {groupByMode === 'CATEGORY' && (
                        <div className="pt-1.5 border-t border-border/60 space-y-0.5">
                          <div className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            📌 Lọc theo loại chứng cứ
                          </div>
                          {(
                            [
                              ['ALL', '📋 Tất cả danh mục', totalRosterCount],
                              ['CAMERA', '📹 Camera an ninh', cameraMarkers.length],
                              ['BTS', '📡 Trạm phát sóng BTS', btsMarkers.length],
                              ['ROUTES', '〰️ Lộ trình di chuyển', searchedRoutes.length],
                              ['EVIDENCE', '🧤 Hiện trường & Vật chứng', evidenceMarkers.length],
                              ['DRAWINGS', '✏️ Hình vẽ đánh dấu', searchedDrawings.length],
                            ] as const
                          ).map(([tabKey, label, count]) => {
                            const active = activeCategoryTab === tabKey;
                            return (
                              <button
                                key={tabKey}
                                type="button"
                                onClick={() => {
                                  setActiveCategoryTab(tabKey);
                                  setVisibleLimit(10);
                                  setRosterFlyoutOpen(true);
                                  if (tabKey !== 'CAMERA') {
                                    setOpenToolMenu('NONE');
                                  }
                                }}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left font-semibold transition-colors ${
                                  active
                                    ? 'bg-primary/15 text-primary'
                                    : 'hover:bg-surface-elevated text-foreground'
                                }`}
                              >
                                <span>{label}</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-elevated border border-border/60">
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {layerCounts.cameras > 0 && (
                        <div className="pt-1.5 border-t border-border/60">
                          <div className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            📹 Lọc trạng thái Camera
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {(
                              [
                                ['ALL', 'Tất cả Cam'],
                                ['CAPTURED', '🎯 Có hình'],
                                ['CLEAR', '⚪ Trống'],
                                ['BLIND_BROKEN', '🚫 Hỏng'],
                              ] as const
                            ).map(([st, label]) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => {
                                  setCameraStatusFilter(st);
                                  setRosterFlyoutOpen(true);
                                  setOpenToolMenu('NONE');
                                }}
                                className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                                  cameraStatusFilter === st
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-surface-elevated border-border text-foreground hover:bg-surface'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setFilterInViewOnly((v) => !v);
                  setRosterFlyoutOpen(true);
                }}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                  filterInViewOnly
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                }`}
                title="Chỉ liệt kê các điểm nằm trong khung bản đồ đang zoom"
              >
                📍
              </button>
              <button
                type="button"
                onClick={() => {
                  setOnlyStarred((v) => !v);
                  setRosterFlyoutOpen(true);
                }}
                className={`inline-flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                  onlyStarred
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                }`}
                title="Chỉ xem các mục đã đánh dấu sao quan trọng"
              >
                <span>★</span>
                {starredIds.length > 0 && (
                  <span className="text-[10px]">{starredIds.length}</span>
                )}
              </button>
            </div>
          }
          filterDrawer={
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                  🛰️ Nền bản đồ
                </label>
                <select
                  value={baseStyle}
                  onChange={(e) => setBaseStyle(e.target.value as MapBaseStyle)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border font-semibold"
                >
                  <option value="SATELLITE_HYBRID">
                    🛰️ Vệ tinh + Tên đường
                  </option>
                  <option value="SATELLITE_PURE">🛰️ Vệ tinh thuần</option>
                  <option value="DARK">🌑 Bản đồ Tối</option>
                  <option value="LIGHT">☀️ Bản đồ Sáng</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                  👤 Lọc theo đối tượng
                </label>
                <select
                  value={subjectFilterId}
                  onChange={(e) => setSubjectFilterId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border font-semibold"
                >
                  <option value="ALL">
                    Tất cả đối tượng ({markers.length} điểm)
                  </option>
                  {subjectOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">
                    Các lớp hiển thị
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLayerVisibility(DEFAULT_LAYER_VISIBILITY)
                    }
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Bật hết
                  </button>
                </div>

                <div className="p-2 rounded-lg border border-border bg-surface-elevated space-y-1.5">
                  <label className="flex items-center justify-between cursor-pointer font-semibold">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.cameras}
                        onChange={(e) =>
                          setLayerVisibility((prev) => ({
                            ...prev,
                            cameras: e.target.checked,
                          }))
                        }
                        className="rounded accent-red-600"
                      />
                      <span>📹 Camera an ninh</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {layerCounts.cameras}
                    </span>
                  </label>
                  {layerVisibility.cameras && (
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-muted-foreground pl-5">
                      <input
                        type="checkbox"
                        checked={layerVisibility.cameraFov}
                        onChange={(e) =>
                          setLayerVisibility((prev) => ({
                            ...prev,
                            cameraFov: e.target.checked,
                          }))
                        }
                        className="rounded accent-red-500"
                      />
                      <span>📐 Góc chiếu FoV</span>
                    </label>
                  )}
                </div>

                <div className="p-2 rounded-lg border border-border bg-surface-elevated space-y-1.5">
                  <label className="flex items-center justify-between cursor-pointer font-semibold">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.bts}
                        onChange={(e) =>
                          setLayerVisibility((prev) => ({
                            ...prev,
                            bts: e.target.checked,
                          }))
                        }
                        className="rounded accent-blue-600"
                      />
                      <span>📡 Trạm BTS</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {layerCounts.bts}
                    </span>
                  </label>
                  {layerVisibility.bts && (
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-muted-foreground pl-5">
                      <input
                        type="checkbox"
                        checked={layerVisibility.btsCoverage}
                        onChange={(e) =>
                          setLayerVisibility((prev) => ({
                            ...prev,
                            btsCoverage: e.target.checked,
                          }))
                        }
                        className="rounded accent-blue-500"
                      />
                      <span>🛜 Vùng phủ sóng</span>
                    </label>
                  )}
                </div>

                <label className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface-elevated cursor-pointer font-semibold">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layerVisibility.evidence}
                      onChange={(e) =>
                        setLayerVisibility((prev) => ({
                          ...prev,
                          evidence: e.target.checked,
                        }))
                      }
                      className="rounded accent-amber-600"
                    />
                    <span>🧤 Hiện trường & Vật chứng</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {layerCounts.evidence}
                  </span>
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface-elevated cursor-pointer font-semibold">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layerVisibility.customMarkers}
                      onChange={(e) =>
                        setLayerVisibility((prev) => ({
                          ...prev,
                          customMarkers: e.target.checked,
                        }))
                      }
                      className="rounded accent-purple-600"
                    />
                    <span>📍 Điểm ghim khác</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {layerCounts.customMarkers}
                  </span>
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface-elevated cursor-pointer font-semibold">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layerVisibility.routes}
                      onChange={(e) =>
                        setLayerVisibility((prev) => ({
                          ...prev,
                          routes: e.target.checked,
                        }))
                      }
                      className="rounded accent-rose-600"
                    />
                    <span>〰️ Lộ trình di chuyển</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {layerCounts.routes}
                  </span>
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface-elevated cursor-pointer font-semibold">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layerVisibility.drawings}
                      onChange={(e) =>
                        setLayerVisibility((prev) => ({
                          ...prev,
                          drawings: e.target.checked,
                        }))
                      }
                      className="rounded accent-amber-500"
                    />
                    <span>✏️ Hình vẽ đánh dấu</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {layerCounts.drawings}
                  </span>
                </label>
              </div>

              {/* Compact Legend matching UnifiedNetworkGraph */}
              <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>📹 Camera</span>
                <span>📡 Trạm BTS</span>
                <span>🧤 Vật chứng</span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-red-500" />
                  Lộ trình xác nhận
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-3 border-t border-dashed border-orange-500" />
                  Nghi vấn
                </span>
              </div>
            </div>
          }
          rosterContent={
            <div className="text-xs">
              {/* VIEW MODE 1: GROUP BY SUBJECT */}
              {groupByMode === 'SUBJECT' && (
                <div className="divide-y divide-border/60">
                  {subjectOptions.map((subj) => {
                    const subjMarkers = searchedMarkers.filter(
                      (m) => m.personId === subj.id
                    );
                    const subjRoutes = searchedRoutes.filter(
                      (r) => r.personId === subj.id
                    );
                    if (subjMarkers.length === 0 && subjRoutes.length === 0) {
                      return null;
                    }
                    return (
                      <div key={subj.id} className="p-2 space-y-1.5">
                        <div className="flex items-center justify-between px-1 py-0.5 font-bold text-rose-500">
                          <span className="truncate">👤 {subj.label}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSubjectFilterId((prev) =>
                                prev === subj.id ? 'ALL' : subj.id
                              )
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] border ${
                              subjectFilterId === subj.id
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-surface border-border text-muted-foreground'
                            }`}
                          >
                            {subjectFilterId === subj.id
                              ? '✓ Đang lọc riêng'
                              : '👁️ Lọc riêng'}
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {subjRoutes.map(renderRouteRow)}
                          {subjMarkers.slice(0, visibleLimit).map(renderMarkerRow)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Unassigned items */}
                  {(() => {
                    const unassignedMarkers = searchedMarkers.filter(
                      (m) => !m.personId
                    );
                    const unassignedRoutes = searchedRoutes.filter(
                      (r) => !r.personId
                    );
                    if (
                      unassignedMarkers.length === 0 &&
                      unassignedRoutes.length === 0
                    ) {
                      return null;
                    }
                    return (
                      <div className="p-2 space-y-1.5">
                        <div className="px-1 py-0.5 font-bold text-muted-foreground">
                          📍 Chưa gắn đối tượng (
                          {unassignedMarkers.length + unassignedRoutes.length})
                        </div>
                        {unassignedRoutes.map(renderRouteRow)}
                        {unassignedMarkers
                          .slice(0, visibleLimit)
                          .map(renderMarkerRow)}
                        {unassignedMarkers.length > visibleLimit && (
                          <button
                            type="button"
                            onClick={() => setVisibleLimit((v) => v + 15)}
                            className="w-full py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-[11px] font-semibold text-primary"
                          >
                            Xem thêm (+
                            {unassignedMarkers.length - visibleLimit} mục)
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* VIEW MODE 2: CHRONOLOGICAL TIMELINE STREAM */}
              {groupByMode === 'TIMELINE' && (
                <div className="p-2 space-y-1.5">
                  {[...searchedMarkers]
                    .sort((a, b) => {
                      const ta = a.occurredAt
                        ? new Date(a.occurredAt).getTime()
                        : Number.MAX_SAFE_INTEGER;
                      const tb = b.occurredAt
                        ? new Date(b.occurredAt).getTime()
                        : Number.MAX_SAFE_INTEGER;
                      return ta - tb;
                    })
                    .slice(0, visibleLimit)
                    .map(renderMarkerRow)}
                  {searchedMarkers.length > visibleLimit && (
                    <button
                      type="button"
                      onClick={() => setVisibleLimit((v) => v + 15)}
                      className="w-full py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-[11px] font-semibold text-primary"
                    >
                      Xem thêm (+{searchedMarkers.length - visibleLimit} điểm)
                    </button>
                  )}
                </div>
              )}

              {/* VIEW MODE 3: CATEGORY PILL / ACCORDION MODE */}
              {groupByMode === 'CATEGORY' && (
                <div className="divide-y divide-border/60">
                  {/* Section 1: Lộ trình di chuyển */}
                  {(activeCategoryTab === 'ALL' ||
                    activeCategoryTab === 'ROUTES') && (
                    <TacticalSectionExpander
                      title="Lộ trình di chuyển"
                      icon="〰️"
                      count={searchedRoutes.length}
                      isExpanded={
                        activeCategoryTab === 'ROUTES' || routesExpanded
                      }
                      onToggle={() => setRoutesExpanded((prev) => !prev)}
                      badgeColor="bg-rose-500/15 text-rose-500"
                      emptyMessage="Chưa có lộ trình nào"
                    >
                      <div className="space-y-1.5">
                        {searchedRoutes
                          .slice(0, visibleLimit)
                          .map(renderRouteRow)}
                        {searchedRoutes.length > visibleLimit && (
                          <button
                            type="button"
                            onClick={() => setVisibleLimit((v) => v + 15)}
                            className="w-full py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-[11px] font-semibold text-primary"
                          >
                            Xem thêm (+{searchedRoutes.length - visibleLimit} lộ
                            trình)
                          </button>
                        )}
                      </div>
                    </TacticalSectionExpander>
                  )}

                  {/* Section 2: Camera an ninh */}
                  {(activeCategoryTab === 'ALL' ||
                    activeCategoryTab === 'CAMERA') && (
                    <TacticalSectionExpander
                      title="Camera an ninh"
                      icon="📹"
                      count={cameraMarkers.length}
                      isExpanded={
                        activeCategoryTab === 'CAMERA' || camerasExpanded
                      }
                      onToggle={() => setCamerasExpanded((prev) => !prev)}
                      badgeColor="bg-red-500/15 text-red-500"
                      emptyMessage="Chưa có Camera khớp bộ lọc"
                    >
                      <div className="space-y-1.5">
                        {cameraMarkers
                          .slice(0, visibleLimit)
                          .map(renderMarkerRow)}
                        {cameraMarkers.length > visibleLimit && (
                          <button
                            type="button"
                            onClick={() => setVisibleLimit((v) => v + 15)}
                            className="w-full py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-[11px] font-semibold text-primary"
                          >
                            Xem thêm (+{cameraMarkers.length - visibleLimit}{' '}
                            Camera)
                          </button>
                        )}
                      </div>
                    </TacticalSectionExpander>
                  )}

                  {/* Section 3: Trạm BTS */}
                  {(activeCategoryTab === 'ALL' ||
                    activeCategoryTab === 'BTS') && (
                    <TacticalSectionExpander
                      title="Trạm phát sóng BTS"
                      icon="📡"
                      count={btsMarkers.length}
                      isExpanded={activeCategoryTab === 'BTS' || btsExpanded}
                      onToggle={() => setBtsExpanded((prev) => !prev)}
                      badgeColor="bg-blue-500/15 text-blue-500"
                      emptyMessage="Chưa ghim Trạm BTS nào"
                    >
                      <div className="space-y-1.5">
                        {btsMarkers.slice(0, visibleLimit).map(renderMarkerRow)}
                        {btsMarkers.length > visibleLimit && (
                          <button
                            type="button"
                            onClick={() => setVisibleLimit((v) => v + 15)}
                            className="w-full py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-[11px] font-semibold text-primary"
                          >
                            Xem thêm (+{btsMarkers.length - visibleLimit} trạm
                            BTS)
                          </button>
                        )}
                      </div>
                    </TacticalSectionExpander>
                  )}

                  {/* Section 4: Hiện trường & Vật chứng */}
                  {(activeCategoryTab === 'ALL' ||
                    activeCategoryTab === 'EVIDENCE') && (
                    <TacticalSectionExpander
                      title="Hiện trường & Chứng cứ"
                      icon="🧤"
                      count={evidenceMarkers.length}
                      isExpanded={
                        activeCategoryTab === 'EVIDENCE' || evidenceExpanded
                      }
                      onToggle={() => setEvidenceExpanded((prev) => !prev)}
                      badgeColor="bg-amber-500/15 text-amber-500"
                      emptyMessage="Chưa có vật chứng / điểm ghim"
                    >
                      <div className="space-y-1.5">
                        {evidenceMarkers
                          .slice(0, visibleLimit)
                          .map(renderMarkerRow)}
                        {evidenceMarkers.length > visibleLimit && (
                          <button
                            type="button"
                            onClick={() => setVisibleLimit((v) => v + 15)}
                            className="w-full py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-[11px] font-semibold text-primary"
                          >
                            Xem thêm (+{evidenceMarkers.length - visibleLimit}{' '}
                            mục)
                          </button>
                        )}
                      </div>
                    </TacticalSectionExpander>
                  )}

                  {/* Section 5: Hình vẽ đánh dấu */}
                  {(activeCategoryTab === 'ALL' ||
                    activeCategoryTab === 'DRAWINGS') && (
                    <TacticalSectionExpander
                      title="Hình vẽ đánh dấu"
                      icon="✏️"
                      count={searchedDrawings.length}
                      isExpanded={
                        activeCategoryTab === 'DRAWINGS' || drawingsExpanded
                      }
                      onToggle={() => setDrawingsExpanded((prev) => !prev)}
                      badgeColor="bg-purple-500/15 text-purple-500"
                      emptyMessage="Chưa có hình vẽ đánh dấu"
                    >
                      <div className="space-y-1.5">
                        {searchedDrawings.slice(0, visibleLimit).map((d) => {
                          const isSelected = selectedDrawing?.id === d.id;
                          return (
                            <div
                              key={d.id}
                              onClick={() => {
                                setSelectedDrawing(d);
                                setSelectedMarker(null);
                                setSelectedRoute(null);
                                setActiveFlyout('INSPECTOR');
                                if (d.coordinates.length > 0) {
                                  setFocusTarget({
                                    lat: d.coordinates[0].lat,
                                    lng: d.coordinates[0].lng,
                                    seq: Date.now(),
                                  });
                                }
                              }}
                              className={`rounded-xl transition-all p-2 border cursor-pointer flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-primary/10 border-primary ring-1 ring-primary/40'
                                  : 'bg-surface hover:bg-surface-elevated border-border/50'
                              }`}
                            >
                              <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: d.strokeColor }}
                                />
                                <span className="truncate">
                                  {d.label || `Hình vẽ ${d.drawingType}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {searchedDrawings.length > visibleLimit && (
                          <button
                            type="button"
                            onClick={() => setVisibleLimit((v) => v + 15)}
                            className="w-full py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-[11px] font-semibold text-primary"
                          >
                            Xem thêm (+{searchedDrawings.length - visibleLimit}{' '}
                            hình vẽ)
                          </button>
                        )}
                      </div>
                    </TacticalSectionExpander>
                  )}
                </div>
              )}
            </div>
          }
        >
          {/* Active Tool Status Pill */}
          {toolMode !== 'SELECT' && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-xl border border-white/15 text-xs shadow-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                {toolMode === 'ADD_CAMERA' && 'Click bản đồ để đặt Camera'}
                {toolMode === 'ADD_BTS' && 'Click bản đồ để đặt Trạm BTS'}
                {toolMode === 'ADD_EVIDENCE' && 'Click bản đồ để đặt Vật chứng'}
                {toolMode === 'ADD_CUSTOM' && 'Click bản đồ để đặt Điểm ghim'}
                {toolMode === 'DRAW_ROUTE' && 'Click các điểm để vẽ lộ trình'}
                {isMarkupToolActive && 'Đang bật chế độ vẽ đánh dấu'}
              </span>
              <button
                type="button"
                onClick={handleCancelTool}
                className="ml-1 px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[10px] font-bold"
              >
                Thoát (Esc)
              </button>
            </div>
          )}

          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
              Đang tải dữ liệu hiện trường...
            </div>
          ) : (
            <CrimeSceneMapCanvas
              markers={filteredMarkers}
              routes={filteredRoutes}
              drawings={drawings}
              defaultCenter={defaultCenter}
              layerVisibility={layerVisibility}
              baseStyle={baseStyle}
              toolMode={toolMode}
              drawingStyle={drawingStyle}
              selectedItemId={selectedItemId}
              draftRouteWaypoints={draftRouteWaypoints}
              activeTimelineTimestamp={
                timelineEnabled ? timelineCursorMs : null
              }
              focusTarget={focusTarget}
              onMapClickForNewMarker={handleMapClickForNewMarker}
              onSelectMarker={(m) => {
                setSelectedMarker(m);
                setSelectedRoute(null);
                setSelectedDrawing(null);
                setActiveFlyout('INSPECTOR');
              }}
              onMarkerDragEnd={handleMarkerDragEnd}
              onAddRouteWaypoint={handleAddRouteWaypoint}
              onQuickFinishRoute={handleSaveRoute}
              onCancelTool={handleCancelTool}
              onSelectRoute={(r) => {
                setSelectedRoute(r);
                setSelectedMarker(null);
                setSelectedDrawing(null);
                setActiveFlyout('INSPECTOR');
              }}
              onUpdateRouteWaypoints={handleUpdateRouteWaypoints}
              onUpdateDraftRouteWaypoints={setDraftRouteWaypoints}
              onSelectDrawing={(d) => {
                setSelectedDrawing(d);
                setSelectedMarker(null);
                setSelectedRoute(null);
                setActiveFlyout('INSPECTOR');
              }}
              onCreateDrawing={handleCreateDrawing}
              onRegisterSnapshotGetter={(getter) => {
                snapshotGetterRef.current = getter;
              }}
              onBoundsChange={setMapBounds}
              inspectorCoordinate={
                activeFlyout === 'INSPECTOR'
                  ? selectedMarker
                    ? {
                        lat: selectedMarker.latitude,
                        lng: selectedMarker.longitude,
                      }
                    : selectedRoute && selectedRoute.waypoints.length > 0
                    ? {
                        lat: selectedRoute.waypoints[
                          Math.floor(selectedRoute.waypoints.length / 2)
                        ].lat,
                        lng: selectedRoute.waypoints[
                          Math.floor(selectedRoute.waypoints.length / 2)
                        ].lng,
                      }
                    : selectedDrawing && selectedDrawing.coordinates.length > 0
                    ? {
                        lat: selectedDrawing.coordinates[0].lat,
                        lng: selectedDrawing.coordinates[0].lng,
                      }
                    : null
                  : null
              }
              inspectorContent={
                activeFlyout === 'INSPECTOR' && selectedMarker ? (
                  <div className="w-64 sm:w-72 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md text-white border border-white/20 space-y-2 shadow-2xl text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-amber-400 block">
                          {MARKER_TYPE_META[selectedMarker.markerType]?.icon}{' '}
                          {
                            MARKER_TYPE_META[selectedMarker.markerType]
                              ?.shortLabel
                          }
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">
                          {selectedMarker.label}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMarker(null);
                          setActiveFlyout('NONE');
                        }}
                        className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10"
                      >
                        ✕
                      </button>
                    </div>

                    {selectedMarker.mediaUrl && (
                      <div className="rounded-lg overflow-hidden border border-white/15 bg-black">
                        {selectedMarker.mediaType === 'VIDEO' ? (
                          <video
                            src={selectedMarker.mediaUrl}
                            poster={getImmichPosterUrl(selectedMarker.mediaUrl)}
                            controls
                            className="w-full max-h-36 object-contain"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedMarker.mediaUrl}
                            alt={selectedMarker.label}
                            className="w-full max-h-36 object-cover"
                          />
                        )}
                      </div>
                    )}

                    <div className="space-y-1 text-[11px] bg-slate-800/90 p-2 rounded-lg border border-white/10">
                      <div>
                        🕒 <strong>Thời gian:</strong>{' '}
                        {formatDateTimeVN(selectedMarker.occurredAt)}
                      </div>
                      <div className="font-mono text-[10px] text-slate-300">
                        📍 {selectedMarker.latitude.toFixed(5)},{' '}
                        {selectedMarker.longitude.toFixed(5)}
                      </div>
                      {selectedMarker.markerType === 'CAMERA' && (
                        <>
                          <div>
                            📐 Hướng chiếu:{' '}
                            {selectedMarker.cameraDirection !== null
                              ? `${selectedMarker.cameraDirection}° (Mở ${
                                  selectedMarker.cameraFovDeg || 60
                                }°)`
                              : 'Chưa đặt'}
                          </div>
                          {selectedMarker.rawTimeNote && (
                            <div>⏱️ Đầu ghi: {selectedMarker.rawTimeNote}</div>
                          )}
                        </>
                      )}
                      {selectedMarker.markerType === 'BTS' && (
                        <div>
                          📡 Trạm: {selectedMarker.btsCode || 'BTS'} (
                          {selectedMarker.btsCarrier || 'BTS'} · R=
                          {selectedMarker.btsRadiusMeters || 300}m)
                        </div>
                      )}
                      {selectedMarker.description && (
                        <div className="text-slate-300 italic pt-0.5 border-t border-white/10">
                          {selectedMarker.description}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditMarker(selectedMarker)}
                        className="flex-1 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-[11px]"
                      >
                        ✏️ Sửa điểm
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMarker(selectedMarker.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white font-bold text-[11px]"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                ) : activeFlyout === 'INSPECTOR' && selectedRoute ? (
                  <div className="w-64 sm:w-72 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md text-white border border-rose-500/40 space-y-2 shadow-2xl text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-rose-400 block">
                          〰️ Lộ trình di chuyển
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">
                          {selectedRoute.label}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoute(null);
                          setActiveFlyout('NONE');
                        }}
                        className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10"
                      >
                        ✕
                      </button>
                    </div>

                    {(() => {
                      const metrics = computeRouteMetrics(
                        selectedRoute.waypoints
                      );
                      return (
                        <div className="text-[11px] bg-slate-800/90 p-2 rounded-lg border border-white/10 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>
                              Điểm nút:{' '}
                              <strong>{selectedRoute.waypoints.length}</strong>
                            </span>
                            <span>
                              Dài:{' '}
                              <strong>
                                {formatDistance(metrics.totalDistanceMeters)}
                              </strong>
                            </span>
                          </div>
                          {metrics.avgSpeedKmh !== null && (
                            <div>
                              Vận tốc TB:{' '}
                              <strong>
                                {metrics.avgSpeedKmh.toFixed(1)} km/h
                              </strong>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-slate-200 leading-relaxed">
                      💡 Kéo nút <strong>[+]</strong> trên đường để chèn điểm uốn theo sông/đường, kéo nút số để dời, chuột phải vào điểm trung gian để xóa.
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRoute(selectedRoute.id)}
                      className="w-full py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white font-bold text-[11px]"
                    >
                      🗑️ Xóa lộ trình
                    </button>
                  </div>
                ) : activeFlyout === 'INSPECTOR' && selectedDrawing ? (
                  <div className="w-60 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md text-white border border-amber-500/40 space-y-2 shadow-2xl text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-amber-400 block">
                          ✏️ Hình vẽ ({selectedDrawing.drawingType})
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">
                          {selectedDrawing.label || 'Vùng đánh dấu'}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDrawing(null);
                          setActiveFlyout('NONE');
                        }}
                        className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10"
                      >
                        ✕
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDrawing(selectedDrawing.id)}
                      className="w-full py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white font-bold text-[11px]"
                    >
                      🗑️ Xóa hình vẽ
                    </button>
                  </div>
                ) : null
              }
            />
          )}

          {/* FLOATING HUD ON MAP FOR ACTIVE ROUTE / MARKUP DRAWING TOOLS */}
          {(toolMode === 'DRAW_ROUTE' || isMarkupToolActive) && (
            <div className="absolute top-3 right-12 z-20 w-68 max-w-[calc(100%-24px)] rounded-xl bg-slate-900/95 backdrop-blur-md text-white border border-white/20 p-2.5 shadow-2xl text-xs space-y-2">
              {toolMode === 'DRAW_ROUTE' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400 uppercase text-[11px]">
                      〰️ Vẽ lộ trình ({draftRouteWaypoints.length} điểm)
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelTool}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoConnectByTime}
                    className="w-full py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px]"
                  >
                    ⚡ Tự nối theo giờ ({timestampedMarkers.length})
                  </button>

                  <input
                    type="text"
                    value={routeForm.label}
                    onChange={(e) =>
                      setRouteForm((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                    placeholder="Tên lộ trình (VD: Hướng tẩu thoát)"
                    className="w-full px-2 py-1 rounded-lg bg-slate-800 border border-white/15 text-white text-xs"
                  />

                  <div className="grid grid-cols-2 gap-1">
                    <select
                      value={routeForm.routeType}
                      onChange={(e) =>
                        setRouteForm((prev) => ({
                          ...prev,
                          routeType: e.target.value as RouteType,
                        }))
                      }
                      className="px-1.5 py-1 rounded-lg bg-slate-800 border border-white/15 text-[11px]"
                    >
                      <option value="CONFIRMED_PATH">━━ Xác nhận</option>
                      <option value="SUSPECTED_PATH">╌╌ Nghi vấn</option>
                      <option value="RELATION_LINK">🔗 Liên kết</option>
                    </select>

                    <select
                      value={routeForm.personId}
                      onChange={(e) =>
                        setRouteForm((prev) => ({
                          ...prev,
                          personId: e.target.value,
                        }))
                      }
                      className="px-1.5 py-1 rounded-lg bg-slate-800 border border-white/15 text-[11px]"
                    >
                      <option value="">-- Đối tượng --</option>
                      {subjectOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Màu:</span>
                    <div className="flex items-center gap-1.5">
                      {TACTICAL_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() =>
                            setRouteForm((prev) => ({
                              ...prev,
                              color: c.hex,
                            }))
                          }
                          className={`w-3.5 h-3.5 rounded-full border ${
                            routeForm.color === c.hex
                              ? 'scale-125 border-white'
                              : 'border-transparent opacity-75'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={draftRouteWaypoints.length === 0}
                      onClick={() =>
                        setDraftRouteWaypoints((prev) => prev.slice(0, -1))
                      }
                      className="px-2 py-1 rounded-lg bg-slate-800 border border-white/15 disabled:opacity-40 text-[11px]"
                    >
                      ↩ Lùi
                    </button>
                    <button
                      type="button"
                      disabled={
                        draftRouteWaypoints.length < 2 || isSavingRoute
                      }
                      onClick={handleSaveRoute}
                      className="flex-1 py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-40 text-[11px]"
                    >
                      {isSavingRoute ? 'Đang lưu...' : '💾 Lưu (Enter)'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 uppercase text-[11px]">
                      ✏️ Thuộc tính nét vẽ
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelTool}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <input
                    type="text"
                    value={drawingStyle.label}
                    onChange={(e) =>
                      setDrawingStyle((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                    placeholder="Nhãn hiển thị (VD: Đã rà cam)"
                    className="w-full px-2 py-1 rounded-lg bg-slate-800 border border-white/15 text-white text-xs"
                  />

                  <div className="grid grid-cols-2 gap-1">
                    <select
                      value={drawingStyle.strokeStyle}
                      onChange={(e) =>
                        setDrawingStyle((prev) => ({
                          ...prev,
                          strokeStyle: e.target.value as 'SOLID' | 'DASHED',
                        }))
                      }
                      className="px-1.5 py-1 rounded-lg bg-slate-800 border border-white/15 text-[11px]"
                    >
                      <option value="SOLID">━━ Nét liền</option>
                      <option value="DASHED">╌╌ Nét đứt</option>
                    </select>

                    <select
                      value={drawingStyle.strokeWidth}
                      onChange={(e) =>
                        setDrawingStyle((prev) => ({
                          ...prev,
                          strokeWidth: Number(e.target.value),
                        }))
                      }
                      className="px-1.5 py-1 rounded-lg bg-slate-800 border border-white/15 text-[11px]"
                    >
                      <option value={2}>Mảnh (2px)</option>
                      <option value={3}>Vừa (3px)</option>
                      <option value={5}>Đậm (5px)</option>
                      <option value={8}>Rất đậm (8px)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Màu:</span>
                    <div className="flex items-center gap-1.5">
                      {TACTICAL_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() =>
                            setDrawingStyle((prev) => ({
                              ...prev,
                              strokeColor: c.hex,
                            }))
                          }
                          className={`w-3.5 h-3.5 rounded-full border ${
                            drawingStyle.strokeColor === c.hex
                              ? 'scale-125 border-white'
                              : 'border-transparent opacity-75'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TIMELINE PLAYBACK BAR AT BOTTOM OF MAP */}
          {timelineEnabled && timelineRange && (
            <div className="absolute bottom-3 left-3 right-14 z-20 bg-slate-900/95 text-white border border-amber-500/40 rounded-xl p-2.5 shadow-2xl space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !isPlayingTimeline &&
                        timelineCursorMs !== null &&
                        timelineCursorMs >= timelineRange.maxMs
                      ) {
                        setTimelineCursorMs(timelineRange.minMs);
                      }
                      setIsPlayingTimeline((p) => !p);
                    }}
                    className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold"
                  >
                    {isPlayingTimeline ? '⏸ Dừng' : '▶ Phát'}
                  </button>

                  <select
                    value={playbackSpeed}
                    onChange={(e) =>
                      setPlaybackSpeed(Number(e.target.value) as 1 | 2 | 5)
                    }
                    className="px-2 py-1 rounded bg-slate-800 border border-white/15 text-xs"
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={5}>5x</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setTimelineCursorMs(timelineRange.maxMs)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs"
                  >
                    Hiện hết
                  </button>
                </div>

                <div className="font-mono text-xs text-amber-300 font-bold">
                  🕒{' '}
                  {timelineCursorMs
                    ? formatDateTimeVN(new Date(timelineCursorMs).toISOString())
                    : 'Tất cả'}
                </div>
              </div>

              <input
                type="range"
                min={timelineRange.minMs}
                max={timelineRange.maxMs}
                value={timelineCursorMs ?? timelineRange.maxMs}
                onChange={(e) => {
                  setIsPlayingTimeline(false);
                  setTimelineCursorMs(Number(e.target.value));
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          )}
        </TacticalSidebarContainer>
      </div>

      {/* MODAL: CREATE / EDIT MARKER WITH IMMICH PHOTO/VIDEO PICKER */}
      {markerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground">
                {editingMarkerId ? '✏️ Sửa điểm ghim' : '📌 Thêm điểm ghim mới'}
              </h3>
              <button
                type="button"
                onClick={() => setMarkerModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMarker} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(Object.keys(MARKER_TYPE_META) as MarkerType[]).map((type) => {
                  const meta = MARKER_TYPE_META[type];
                  const active = markerForm.markerType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setMarkerForm((prev) => ({
                          ...prev,
                          markerType: type,
                          color: meta.defaultColor,
                        }))
                      }
                      className={`p-2 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-colors ${
                        active
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border bg-surface-elevated text-foreground hover:border-primary/40'
                      }`}
                    >
                      <span className="text-base">{meta.icon}</span>
                      <span className="text-[11px]">{meta.shortLabel}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    Tên điểm / Vị trí *
                  </label>
                  <input
                    type="text"
                    required
                    value={markerForm.label}
                    onChange={(e) =>
                      setMarkerForm((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                    placeholder="VD: Cam số 14 ngõ 68 / BTS Viettel"
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">
                    🕒 Thời gian
                  </label>
                  <input
                    type="datetime-local"
                    value={markerForm.occurredAt}
                    onChange={(e) =>
                      setMarkerForm((prev) => ({
                        ...prev,
                        occurredAt: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    Vĩ độ (Lat)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={markerForm.latitude}
                    onChange={(e) =>
                      setMarkerForm((prev) => ({
                        ...prev,
                        latitude: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    Kinh độ (Lng)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={markerForm.longitude}
                    onChange={(e) =>
                      setMarkerForm((prev) => ({
                        ...prev,
                        longitude: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    👤 Đối tượng
                  </label>
                  <select
                    value={markerForm.personId}
                    onChange={(e) =>
                      setMarkerForm((prev) => ({
                        ...prev,
                        personId: e.target.value,
                      }))
                    }
                    className="w-full px-2.5 py-2 rounded-lg bg-surface-elevated border border-border"
                  >
                    <option value="">-- Không gắn --</option>
                    {subjectOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {markerForm.markerType === 'CAMERA' && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 space-y-3">
                  <div className="font-bold text-red-500 uppercase text-[11px]">
                    📹 Thông số Camera
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">
                        Trạng thái
                      </label>
                      <select
                        value={markerForm.cameraStatus}
                        onChange={(e) =>
                          setMarkerForm((prev) => ({
                            ...prev,
                            cameraStatus: e.target.value as CameraStatus,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border"
                      >
                        <option value="CAPTURED">🎯 Có hình đối tượng</option>
                        <option value="CLEAR">⚪ Không thấy qua</option>
                        <option value="BLIND_BROKEN">🚫 Cam hỏng / Khuất</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">
                        Lệch giờ đầu ghi
                      </label>
                      <input
                        type="text"
                        value={markerForm.rawTimeNote}
                        onChange={(e) =>
                          setMarkerForm((prev) => ({
                            ...prev,
                            rawTimeNote: e.target.value,
                          }))
                        }
                        placeholder="VD: Nhanh 8 phút"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="font-semibold flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={markerForm.hasCameraDirection}
                          onChange={(e) =>
                            setMarkerForm((prev) => ({
                              ...prev,
                              hasCameraDirection: e.target.checked,
                            }))
                          }
                        />
                        <span>Hướng nhìn: {markerForm.cameraDirection}°</span>
                      </label>
                      {markerForm.hasCameraDirection && (
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={markerForm.cameraDirection}
                          onChange={(e) =>
                            setMarkerForm((prev) => ({
                              ...prev,
                              cameraDirection: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-red-500"
                        />
                      )}
                    </div>

                    {markerForm.hasCameraDirection && (
                      <div>
                        <label className="font-semibold block mb-1">
                          Góc mở (FoV): {markerForm.cameraFovDeg}°
                        </label>
                        <input
                          type="range"
                          min={20}
                          max={160}
                          value={markerForm.cameraFovDeg}
                          onChange={(e) =>
                            setMarkerForm((prev) => ({
                              ...prev,
                              cameraFovDeg: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-red-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {markerForm.markerType === 'BTS' && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 space-y-3">
                  <div className="font-bold text-blue-500 uppercase text-[11px]">
                    📡 Thông số Trạm BTS
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">
                        Mã trạm / Cell ID
                      </label>
                      <input
                        type="text"
                        value={markerForm.btsCode}
                        onChange={(e) =>
                          setMarkerForm((prev) => ({
                            ...prev,
                            btsCode: e.target.value,
                          }))
                        }
                        placeholder="VD: HNI-042"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Nhà mạng
                      </label>
                      <select
                        value={markerForm.btsCarrier}
                        onChange={(e) =>
                          setMarkerForm((prev) => ({
                            ...prev,
                            btsCarrier: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border"
                      >
                        <option value="Viettel">Viettel</option>
                        <option value="Vinaphone">Vinaphone</option>
                        <option value="Mobifone">Mobifone</option>
                        <option value="Vietnamobile">Vietnamobile</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Bán kính (m)
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={20000}
                        value={markerForm.btsRadiusMeters}
                        onChange={(e) =>
                          setMarkerForm((prev) => ({
                            ...prev,
                            btsRadiusMeters: Number(e.target.value),
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">
                        Thuê bao / IMEI
                      </label>
                      <input
                        type="text"
                        value={markerForm.subscriberInfo}
                        onChange={(e) =>
                          setMarkerForm((prev) => ({
                            ...prev,
                            subscriberInfo: e.target.value,
                          }))
                        }
                        placeholder="VD: 0987.xxx.xxx"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Góc Sector (0-360°, trống = tròn)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={markerForm.btsAzimuthDeg}
                        onChange={(e) =>
                          setMarkerForm((prev) => ({
                            ...prev,
                            btsAzimuthDeg: e.target.value,
                          }))
                        }
                        placeholder="Bỏ trống nếu phủ 360°"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* IMMICH PHOTO & VIDEO SELECTOR */}
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <span>🖼️</span> Ảnh / Video từ Immich (
                    {filteredImmichAssets.length}/{immichAssets.length})
                  </label>

                  {/* Filter All / Photos / Videos / GPS / Time match */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {(
                      [
                        ['ALL', 'Tất cả'],
                        ['GPS', '📍 Có GPS'],
                        ['TIME_MATCH', '🕒 Cùng giờ (±30p)'],
                        ['IMAGE', '🖼️ Ảnh'],
                        ['VIDEO', '🎬 Video'],
                      ] as const
                    ).map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setImmichMediaFilter(type)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          immichMediaFilter === type
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-border text-muted-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Immich Album Selector + Search + Batch Auto-pin GPS */}
                {immichAlbums.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={activeImmichAlbumId}
                      onChange={(e) => handleSelectImmichAlbum(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface border border-border font-semibold"
                    >
                      <option value="">-- Chọn Album Immich --</option>
                      {immichAlbums.map((alb) => (
                        <option key={alb.id} value={alb.id}>
                          {alb.albumName} ({alb.assetCount})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="search"
                        value={immichSearchQuery}
                        onChange={(e) => setImmichSearchQuery(e.target.value)}
                        placeholder="Tìm tên file / thiết bị..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs"
                      />
                      {immichAssets.some(
                        (a) => a.latitude !== null && a.longitude !== null
                      ) && (
                        <button
                          type="button"
                          disabled={isBatchImportingGps}
                          onClick={handleBatchImportGpsImmichAssets}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] whitespace-nowrap disabled:opacity-50"
                          title="Tự động tạo điểm ghim cho tất cả ảnh/video có tọa độ GPS trong Album này"
                        >
                          {isBatchImportingGps
                            ? 'Đang rải...'
                            : '🗺️ Rải ảnh GPS'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">
                    Chưa tìm thấy Album Immich (Kiểm tra cấu hình tại Cài đặt →
                    Immich).
                  </div>
                )}

                {/* Immich Assets Grid */}
                {loadingImmich ? (
                  <div className="py-4 text-center text-muted-foreground">
                    Đang tải ảnh/video từ Immich...
                  </div>
                ) : filteredImmichAssets.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-44 overflow-y-auto p-1.5 rounded-xl bg-surface border border-border">
                    {filteredImmichAssets.map((asset) => {
                      const isVideo = asset.type === 'VIDEO';
                      const targetUrl = isVideo
                        ? `/api/immich/assets/${encodeURIComponent(asset.id)}/video`
                        : `/api/immich/assets/${encodeURIComponent(asset.id)}/preview`;
                      const thumbUrl = `/api/immich/assets/${encodeURIComponent(asset.id)}/thumbnail`;
                      const isSelected = markerForm.mediaUrl === targetUrl;

                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => {
                            setMarkerForm((prev) => ({
                              ...prev,
                              mediaUrl: targetUrl,
                              mediaType: isVideo ? 'VIDEO' : 'IMAGE',
                              label:
                                prev.label ||
                                asset.originalFileName?.replace(
                                  /\.[^.]+$/,
                                  ''
                                ) ||
                                prev.label,
                              occurredAt: asset.takenAt
                                ? toDatetimeLocalValue(asset.takenAt)
                                : prev.occurredAt,
                            }));
                            toast.success(
                              isVideo
                                ? 'Đã chọn Video từ Immich'
                                : 'Đã chọn Ảnh từ Immich'
                            );
                          }}
                          className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/40'
                              : 'border-transparent hover:border-primary/60'
                          }`}
                          title={asset.originalFileName || asset.id}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbUrl}
                            alt={asset.originalFileName || asset.id}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          {isVideo && (
                            <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/75 text-white text-[9px] font-bold">
                              🎬 VIDEO
                            </span>
                          )}
                          {asset.latitude !== null &&
                            asset.longitude !== null && (
                              <span className="absolute bottom-1 right-1 px-1 rounded bg-emerald-600/90 text-white text-[9px] font-bold">
                                📍 GPS
                              </span>
                            )}
                        </button>
                      );
                    })}
                  </div>
                ) : activeImmichAlbumId ? (
                  <div className="py-3 text-center text-muted-foreground text-[11px]">
                    Không có ảnh/video trong album này.
                  </div>
                ) : null}

                {/* Selected Media Preview & Optional GPS Sync from Immich Asset */}
                {markerForm.mediaUrl && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-3">
                      {markerForm.mediaType === 'VIDEO' ? (
                        <video
                          src={markerForm.mediaUrl}
                          poster={getImmichPosterUrl(markerForm.mediaUrl)}
                          controls
                          className="h-20 w-32 rounded-lg border border-border bg-black object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={markerForm.mediaUrl}
                          alt="Preview"
                          className="h-20 w-32 object-cover rounded-lg border border-border"
                        />
                      )}
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-bold text-[10px]">
                          {markerForm.mediaType === 'VIDEO'
                            ? '🎬 Video Immich'
                            : '🖼️ Ảnh Immich'}
                        </span>
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setMarkerForm((prev) => ({
                                ...prev,
                                mediaUrl: '',
                              }))
                            }
                            className="text-red-500 hover:underline text-xs font-semibold block"
                          >
                            Bỏ chọn
                          </button>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const matchedAsset = immichAssets.find(
                        (a) =>
                          markerForm.mediaUrl.includes(a.id) &&
                          a.latitude !== null &&
                          a.longitude !== null
                      );
                      if (!matchedAsset) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setMarkerForm((prev) => ({
                              ...prev,
                              latitude: Number(matchedAsset.latitude),
                              longitude: Number(matchedAsset.longitude),
                            }));
                            toast.success('Đã lấy tọa độ GPS từ EXIF của file!');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/15 text-emerald-500 border border-emerald-500/30 font-bold text-[11px]"
                        >
                          📍 Lấy tọa độ GPS từ file này
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  📝 Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={markerForm.description}
                  onChange={(e) =>
                    setMarkerForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Đặc điểm nhận dạng, trang phục, phương tiện..."
                  className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setMarkerModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-elevated border border-border text-foreground font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingMarker}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold disabled:opacity-50"
                >
                  {isSavingMarker ? 'Đang lưu...' : '💾 Lưu điểm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
