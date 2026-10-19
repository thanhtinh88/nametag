'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  forceSimulation, forceLink, forceManyBody, forceCenter,
  forceCollide, forceX, forceY, type Simulation,
} from 'd3-force';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomTransform, type ZoomBehavior } from 'd3-zoom';
import { drag } from 'd3-drag';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import PillSelector from './PillSelector';
import { GraphFilterGroupPill } from './GraphFilterPills';
import { paintFrame } from './graph/canvas-renderer';
import { getLODTier } from './graph/lod';
import { getCachedPhoto, loadPhoto } from './graph/photo-cache';
import { buildQuadtree, findNodeAtPoint, type NodeQuadtree } from './graph/hit-test';
import { diffSimulationData } from './graph/diff-simulation';
import { resolveGraphMode } from './graph/mode-resolution';
import { buildSimulationNodes, type RawGraphPerson } from './graph/bubble-composition';
import { buildHubAndSpokeEdges } from './graph/edge-composition';
import { UNGROUPED_SYNTHETIC_ID } from './graph/simulation-types';
import type { SimulationNode, SimulationEdge, BubbleSimNode } from './graph/simulation-types';
import TacticalQuickChips from './filters/TacticalQuickChips';
import ActiveTacticalBadges from './filters/ActiveTacticalBadges';
import TacticalFilterDrawer from './filters/TacticalFilterDrawer';
import TacticalSidebarContainer from './filters/TacticalSidebarContainer';
import TacticalPersonCard from './filters/TacticalPersonCard';
import {
  DEFAULT_PERSON_FILTER_STATE,
  matchesPersonTacticalFilters,
  countActiveTacticalFilters,
  type UnifiedPersonFilterState,
} from '@/lib/filters/person-filter-types';

interface GraphContextMenuState {
  node: SimulationNode;
  x: number;
  y: number;
  isPinned: boolean;
}

// Props interface — unchanged from pre-rewrite file
interface Group { id: string; name: string; color: string | null; }
interface CaseOption { id: string; title: string; status: string; }
interface CustomFieldTemplateOption {
  id: string;
  name: string;
  slug: string;
  type?: string;
  options?: string[];
}
type IncludeMode = 'or' | 'and';
type GroupFilterItem = { id: string; label: string; color: string | null; isNegative: boolean; };

interface UnifiedNetworkGraphProps {
  apiEndpoint?: string;
  groups?: Group[];
  events?: CaseOption[];
  customFieldTemplates?: CustomFieldTemplateOption[];
  centerNodeNonClickable?: boolean;
  linkDistance?: number;
  chargeStrength?: number;
  refreshKey?: number;
  graphMode?: 'individuals' | 'bubbles' | null;
  compact?: boolean;
}

export default function UnifiedNetworkGraph({
  apiEndpoint,
  groups,
  events,
  customFieldTemplates,
  centerNodeNonClickable = false,
  linkDistance = 160,
  chargeStrength = -400,
  refreshKey,
  graphMode: graphModeProp = null,
  compact = false,
}: UnifiedNetworkGraphProps) {
  const t = useTranslations('dashboard.graph');
  const tTactical = useTranslations('tacticalFilters');
  const tPeople = useTranslations('people');
  const tEvents = useTranslations('events');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  // Simulation state
  const simRef = useRef<Simulation<SimulationNode, SimulationEdge> | null>(null);
  const nodesRef = useRef<SimulationNode[]>([]);
  const edgesRef = useRef<SimulationEdge[]>([]);
  const quadtreeRef = useRef<NodeQuadtree | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const zoomBehaviorRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const touchSelectedNodeIdRef = useRef<string | null>(null);
  const dirtyRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);
  const unpinTimeoutRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const pinnedPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [contextMenu, setContextMenu] = useState<GraphContextMenuState | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: RawGraphPerson[]; edges: SimulationEdge[] } | null>(null);
  const [rosterOpen, setRosterOpen] = useState<boolean>(false);
  const [rosterQuery, setRosterQuery] = useState<string>('');
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const storageScope = apiEndpoint || 'default';
  const filtersStorageKey = `nametag:graph:filters:${storageScope}`;
  const positionsStorageKey = `nametag:graph:positions:${storageScope}`;

  // Tactical Filter state
  const [tacticalFilters, setTacticalFilters] = useState<UnifiedPersonFilterState>(() => ({
    ...DEFAULT_PERSON_FILTER_STATE,
    activeCasesOnly: Boolean(events),
    showRuledOut: !events,
  }));
  const [gangs, setGangs] = useState<Array<{ id: string; name: string; color?: string | null }>>([]);

  useEffect(() => {
    fetch('/api/gangs')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.gangs) setGangs(payload.gangs);
      })
      .catch(() => {});
  }, []);

  // Filter state
  const [selectedGroupFilters, setSelectedGroupFilters] = useState<GroupFilterItem[]>([]);
  const [includeMode, setIncludeMode] = useState<IncludeMode>('or');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [includeHop, setIncludeHop] = useState<boolean>(true);
  const [activeCasesOnly, setActiveCasesOnly] = useState<boolean>(Boolean(events));
  const [showRuledOut, setShowRuledOut] = useState<boolean>(!events);
  const [hideUserNode, setHideUserNode] = useState<boolean>(Boolean(events));
  const [customFieldSlug, setCustomFieldSlug] = useState<string>('');
  const [customFieldValue, setCustomFieldValue] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [filtersHydrated, setFiltersHydrated] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);
  const capitalizeType = useLocale().startsWith('de');

  const activeFilterCount = useMemo(() => {
    return (
      countActiveTacticalFilters(tacticalFilters) +
      (selectedGroupFilters.length > 0 ? selectedGroupFilters.length : 0)
    );
  }, [tacticalFilters, selectedGroupFilters.length]);

  const handleClearFilters = useCallback(() => {
    setSelectedGroupFilters([]);
    setIncludeMode('or');
    setTacticalFilters({
      ...DEFAULT_PERSON_FILTER_STATE,
      activeCasesOnly: false,
      showRuledOut: true,
    });
  }, []);

  const invMap = useMemo<Record<string, string>>(() => {
    try {
      return {
        SUSPECT: tEvents('involvementTypes.SUSPECT'),
        PERSON_OF_INTEREST: tEvents('involvementTypes.PERSON_OF_INTEREST'),
        ACCOMPLICE: tEvents('involvementTypes.ACCOMPLICE'),
        WITNESS: tEvents('involvementTypes.WITNESS'),
        VICTIM: tEvents('involvementTypes.VICTIM'),
        INFORMANT: tEvents('involvementTypes.INFORMANT'),
      };
    } catch {
      return {
        SUSPECT: 'Nghi phạm',
        PERSON_OF_INTEREST: 'Đối tượng nghi vấn',
        ACCOMPLICE: 'Đồng phạm',
        WITNESS: 'Nhân chứng',
        VICTIM: 'Bị hại',
        INFORMANT: 'Nguồn tin / Cơ sở',
      };
    }
  }, [tEvents]);

  // Hydrate saved filters & pinned node positions from localStorage (browser runtime only)
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
      setFiltersHydrated(true);
      return;
    }
    try {
      const savedPos = window.localStorage.getItem(positionsStorageKey);
      if (savedPos) {
        const parsedPos = JSON.parse(savedPos);
        if (parsedPos && typeof parsedPos === 'object') {
          pinnedPositionsRef.current = parsedPos;
        }
      }
      const savedFilters = window.localStorage.getItem(filtersStorageKey);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        if (Array.isArray(parsed.selectedGroupFilters)) setSelectedGroupFilters(parsed.selectedGroupFilters);
        if (parsed.includeMode === 'or' || parsed.includeMode === 'and') setIncludeMode(parsed.includeMode);
        if (typeof parsed.selectedCaseId === 'string') setSelectedCaseId(parsed.selectedCaseId);
        if (typeof parsed.includeHop === 'boolean') setIncludeHop(parsed.includeHop);
        if (typeof parsed.activeCasesOnly === 'boolean') setActiveCasesOnly(parsed.activeCasesOnly);
        if (typeof parsed.showRuledOut === 'boolean') setShowRuledOut(parsed.showRuledOut);
        if (typeof parsed.hideUserNode === 'boolean') setHideUserNode(parsed.hideUserNode);
        if (typeof parsed.customFieldSlug === 'string') setCustomFieldSlug(parsed.customFieldSlug);
        if (typeof parsed.customFieldValue === 'string') setCustomFieldValue(parsed.customFieldValue);
      }
    } catch {
      // Ignore storage errors
    } finally {
      setFiltersHydrated(true);
    }
  }, [filtersStorageKey, positionsStorageKey]);

  // Persist filter changes to localStorage
  useEffect(() => {
    if (!filtersHydrated || typeof window === 'undefined' || process.env.NODE_ENV === 'test') return;
    try {
      window.localStorage.setItem(
        filtersStorageKey,
        JSON.stringify({
          selectedGroupFilters,
          includeMode,
          selectedCaseId,
          includeHop,
          activeCasesOnly,
          showRuledOut,
          hideUserNode,
          customFieldSlug,
          customFieldValue,
        }),
      );
    } catch {
      // Ignore storage errors
    }
  }, [
    filtersHydrated,
    filtersStorageKey,
    selectedGroupFilters,
    includeMode,
    selectedCaseId,
    includeHop,
    activeCasesOnly,
    showRuledOut,
    hideUserNode,
    customFieldSlug,
    customFieldValue,
  ]);

  const savePinnedPositions = useCallback(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') return;
    try {
      window.localStorage.setItem(positionsStorageKey, JSON.stringify(pinnedPositionsRef.current));
    } catch {
      // Ignore storage errors
    }
  }, [positionsStorageKey]);

  // Bubble state
  const [expandedBubbles, setExpandedBubbles] = useState<Set<string>>(new Set());
  const [localGraphMode, setLocalGraphMode] = useState<'individuals' | 'bubbles' | null>(graphModeProp);
  const rawCacheRef = useRef<{ nodes: RawGraphPerson[]; edges: SimulationEdge[] } | null>(null);

  // Ungrouped label for bubble composition
  const ungroupedLabel = t('unsortedBubbleLabel');

  const includeGroupIds = useMemo(
    () => [
      ...selectedGroupFilters.filter((f) => !f.isNegative).map((f) => f.id),
      ...(tacticalFilters.groupId ? [tacticalFilters.groupId] : []),
      ...tacticalFilters.includeGroupIds,
    ],
    [selectedGroupFilters, tacticalFilters.groupId, tacticalFilters.includeGroupIds],
  );
  const excludeGroupIds = useMemo(
    () => [
      ...selectedGroupFilters.filter((f) => f.isNegative).map((f) => f.id),
      ...tacticalFilters.excludeGroupIds,
    ],
    [selectedGroupFilters, tacticalFilters.excludeGroupIds],
  );

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Recenter simulation when canvas resizes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new ResizeObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const sim = simRef.current;
        if (!sim || isDraggingRef.current) return;

        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        type XForce = ReturnType<typeof forceX<SimulationNode>>;
        type YForce = ReturnType<typeof forceY<SimulationNode>>;

        const fx = sim.force('centerX') as XForce | undefined;
        if (fx) fx.x(w / 2);

        const fy = sim.force('centerY') as YForce | undefined;
        if (fy) fy.y(h / 2);

        sim.alpha(0.3).restart();
      }, 150);
    });

    observer.observe(canvas);
    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  // Re-center the graph view
  const recenterGraph = useCallback(() => {
    const canvas = canvasRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    if (!canvas || !zoomBehavior) return;
    select(canvas)
      .transition()
      .duration(750)
      .call(zoomBehavior.transform, zoomIdentity);
  }, []);

  // Reset all pinned node positions and re-run force layout
  const resetGraphLayout = useCallback(() => {
    pinnedPositionsRef.current = {};
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
      try {
        window.localStorage.removeItem(positionsStorageKey);
      } catch {
        // Ignore storage errors
      }
    }
    for (const node of nodesRef.current) {
      node.fx = null;
      node.fy = null;
    }
    if (simRef.current) {
      simRef.current.alpha(0.6).restart();
    }
    recenterGraph();
  }, [positionsStorageKey, recenterGraph]);

  const toggleFilterSign = (id: string) => {
    setSelectedGroupFilters((prev) =>
      prev.map((filter) =>
        filter.id === id
          ? { ...filter, isNegative: !filter.isNegative }
          : filter,
      ),
    );
  };

  const requestPaint = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  // Toggle pinned position for a specific node via context menu
  const togglePinNode = useCallback((node: SimulationNode) => {
    const isCurrentlyPinned = Boolean(
      pinnedPositionsRef.current[node.id] ||
      (node.fx !== null && node.fx !== undefined)
    );

    if (isCurrentlyPinned) {
      node.fx = null;
      node.fy = null;
      delete pinnedPositionsRef.current[node.id];
      savePinnedPositions();
      if (simRef.current) simRef.current.alpha(0.2).restart();
    } else {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      node.fx = x;
      node.fy = y;
      pinnedPositionsRef.current[node.id] = { x, y };
      savePinnedPositions();
    }
    setContextMenu((prev) => (prev ? { ...prev, isPinned: !isCurrentlyPinned } : null));
    requestPaint();
  }, [savePinnedPositions, requestPaint]);

  // Dismiss context menu on left-click outside or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleGlobalClick = (e: MouseEvent) => {
      // Dismiss immediately on left-click (button 0) outside the menu
      if (e.button === 0 && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleGlobalTouch = (e: TouchEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    // capture: true ensures this handler runs before D3 or canvas cancels event propagation
    window.addEventListener('mousedown', handleGlobalClick, true);
    window.addEventListener('touchstart', handleGlobalTouch, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleGlobalClick, true);
      window.removeEventListener('touchstart', handleGlobalTouch, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  // Items for the Subject & Case Roster Sidebar
  const rosterItems = useMemo(() => {
    if (!graphData?.nodes) return { cases: [], persons: [] };
    const q = rosterQuery.trim().toLowerCase();

    const effectiveFilters = {
      ...tacticalFilters,
      includeGroupIds,
      excludeGroupIds,
      groupMatchOperator: includeMode,
    };

    const cases: RawGraphPerson[] = [];
    const persons: RawGraphPerson[] = [];

    for (const node of graphData.nodes) {
      if (node.id.startsWith('user-')) continue;
      if (q && !node.label.toLowerCase().includes(q)) continue;

      if (node.nodeType === 'event' || node.id.startsWith('event-')) {
        const evId = node.id.replace(/^event-/, '');
        if (effectiveFilters.caseId && evId !== effectiveFilters.caseId) continue;
        if (
          effectiveFilters.activeCasesOnly &&
          node.eventStatus &&
          node.eventStatus !== 'PLANNED' &&
          node.eventStatus !== 'ONGOING'
        ) {
          continue;
        }
        cases.push(node);
      } else {
        if (!matchesPersonTacticalFilters(node, effectiveFilters)) continue;
        persons.push(node);
      }
    }

    cases.sort((a, b) => a.label.localeCompare(b.label));
    persons.sort((a, b) => a.label.localeCompare(b.label));

    return { cases, persons };
  }, [graphData, rosterQuery, tacticalFilters, includeGroupIds, excludeGroupIds, includeMode]);

  const focusNodeInGraph = useCallback(
    (nodeId: string) => {
      // If the node is currently inside a collapsed bubble, expand its group bubble first
      const rawNode = graphData?.nodes.find((n) => n.id === nodeId);
      if (rawNode && rawNode.groups && rawNode.groups.length > 0) {
        setExpandedBubbles((prev) => {
          const next = new Set(prev);
          for (const g of rawNode.groups) next.add(g);
          return next;
        });
      }

      touchSelectedNodeIdRef.current = nodeId;
      requestPaint();

      const canvas = canvasRef.current;
      const zoomBehavior = zoomBehaviorRef.current;
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (canvas && zoomBehavior && node && node.x !== undefined && node.y !== undefined) {
        const rect = canvas.getBoundingClientRect();
        const k = Math.max(transformRef.current.k, 1);
        const targetX = rect.width / 2 - node.x * k;
        const targetY = rect.height / 2 - node.y * k;
        select(canvas)
          .transition()
          .duration(500)
          .call(
            zoomBehavior.transform,
            zoomIdentity.translate(targetX, targetY).scale(k)
          );
      }
    },
    [graphData, requestPaint]
  );

  const formatEdgeLabel = useCallback((edge: SimulationEdge) => {
    if (edge.type === 'aggregated' || edge.type === 'membership') {
      return { before: '', emphasis: '', after: '' };
    }
    const youLabel = tPeople('you');
    const sourceName = edge.sourceLabel ?? '';
    const targetName = edge.targetLabel ?? '';

    let rawType = edge.type;
    if (edge.involvementType && invMap[edge.involvementType]) {
      rawType = invMap[edge.involvementType];
    } else if (invMap[rawType]) {
      rawType = invMap[rawType];
    }

    const typeStr = capitalizeType
      ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
      : rawType.toLowerCase();

    let full: string;
    if (sourceName === youLabel || sourceName === 'You') {
      full = tPeople('graphEdgeLabelFromYou', { type: typeStr });
    } else if (targetName === youLabel || targetName === 'You') {
      full = tPeople('graphEdgeLabelToYou', { type: typeStr });
    } else {
      full = tPeople('graphEdgeLabel', { type: typeStr });
    }
    const idx = full.toLowerCase().indexOf(typeStr.toLowerCase());
    if (idx < 0) return { before: full, emphasis: '', after: '' };
    return {
      before: full.substring(0, idx),
      emphasis: full.substring(idx, idx + typeStr.length),
      after: full.substring(idx + typeStr.length),
    };
  }, [tPeople, capitalizeType, invMap]);

  // Step 1: Paint loop
  const runPaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Keep backing store in sync with CSS size and DPR.
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const wantW = Math.floor(rect.width * dpr);
    const wantH = Math.floor(rect.height * dpr);
    if (canvas.width !== wantW || canvas.height !== wantH) {
      canvas.width = wantW;
      canvas.height = wantH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const transform = transformRef.current;
    const lod = getLODTier(transform.k);
    const isDark = document.documentElement.classList.contains('dark');

    // Request photos for nodes that will render at full LOD and are in viewport.
    if (lod !== 'dots') {
      const padPx = 64;
      for (const node of nodesRef.current) {
        if (node.kind !== 'person') continue;
        if (!node.photo) continue;
        if (node.x === undefined || node.y === undefined) continue;
        const screenX = node.x * transform.k + transform.x;
        const screenY = node.y * transform.k + transform.y;
        if (
          screenX < -padPx || screenX > rect.width + padPx ||
          screenY < -padPx || screenY > rect.height + padPx
        ) continue;
        const src = node.id.startsWith('user-')
          ? '/api/photos/user'
          : `/api/photos/${node.id}`;
        loadPhoto(node.id, src, requestPaint);
      }
    }

    paintFrame(
      {
        ctx,
        transform,
        width: rect.width,
        height: rect.height,
        lod,
        isDark,
        isMobile,
        hoveredNodeId: touchSelectedNodeIdRef.current ?? hoveredNodeIdRef.current,
        getPhoto: getCachedPhoto,
        formatEdgeLabel,
      },
      nodesRef.current,
      edgesRef.current,
    );
  }, [isMobile, requestPaint, formatEdgeLabel]);

  useEffect(() => {
    const tick = () => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        runPaint();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [runPaint]);

  // Step 2: Simulation builder
  const buildSimulation = useCallback((nodes: SimulationNode[], edges: SimulationEdge[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mobileLinkDistance = isMobile ? 110 : linkDistance;
    const mobileChargeStrength = isMobile ? -250 : chargeStrength;
    const personCollisionR = isMobile ? 38 : 52;

    // Visible-radius-aware collision so bubbles don't overlap "you" or each other.
    const collisionForNode = (d: SimulationNode): number => {
      if (d.kind === 'bubble') return (isMobile ? 12 : 14) + (isMobile ? 18 : 28);
      return personCollisionR;
    };

    const membershipLinkDistance = isMobile ? 22 : 32;
    const aggregatedLinkDistance = isMobile ? 150 : 220;

    // Custom force: each expanded ghost behaves like an "invisible big bubble".
    // Members get strongly pulled toward the ghost (orbiting close to it);
    // non-members get pushed out of the ghost's domain so the cluster reads
    // as a coherent island.
    const expandedClusterField = (() => {
      const tightenStrength = 0.35;
      const repelStrength = 0.5;
      const padding = isMobile ? 18 : 24;
      const memberRadius = isMobile ? 12 : 14;
      let attached: SimulationNode[] = [];
      const memberToGhostId = new Map<string, string>();

      const force = (alpha: number) => {
        // Build per-ghost domain (ghost position + radius + member set + protected ids)
        type Domain = { ghostId: string; x: number; y: number; r: number; protectedIds: Set<string> };
        const domains: Domain[] = [];
        for (const n of attached) {
          if (n.kind !== 'bubble' || !n.isExpanded || n.x === undefined) continue;
          const r = Math.sqrt(Math.max(n.memberCount, 1)) * memberRadius * 1.2 + padding;
          const protectedIds = new Set<string>([n.id, ...n.memberIds]);
          domains.push({ ghostId: n.id, x: n.x, y: n.y ?? 0, r, protectedIds });
        }
        if (domains.length === 0) return;

        // Tighten each expanded member toward its ghost
        for (const node of attached) {
          if (node.kind !== 'person') continue;
          const ghostId = memberToGhostId.get(node.id);
          if (!ghostId) continue;
          const dom = domains.find((d) => d.ghostId === ghostId);
          if (!dom || node.x === undefined) continue;
          const dx = dom.x - (node.x ?? 0);
          const dy = dom.y - (node.y ?? 0);
          node.vx = (node.vx ?? 0) + dx * tightenStrength * alpha;
          node.vy = (node.vy ?? 0) + dy * tightenStrength * alpha;
        }

        // Push non-members out of each domain
        for (const dom of domains) {
          for (const node of attached) {
            if (dom.protectedIds.has(node.id)) continue;
            if (node.x === undefined) continue;
            const dx = (node.x ?? 0) - dom.x;
            const dy = (node.y ?? 0) - dom.y;
            const d = Math.hypot(dx, dy);
            if (d > 0 && d < dom.r) {
              const push = ((dom.r - d) / dom.r) * repelStrength * alpha;
              node.vx = (node.vx ?? 0) + (dx / d) * push * dom.r;
              node.vy = (node.vy ?? 0) + (dy / d) * push * dom.r;
            }
          }
        }
      };

      force.initialize = (n: SimulationNode[]) => {
        attached = n;
        memberToGhostId.clear();
        for (const node of n) {
          if (node.kind === 'bubble' && node.isExpanded) {
            for (const memberId of node.memberIds) {
              memberToGhostId.set(memberId, node.id);
            }
          }
        }
      };

      return force;
    })();

    const sim = forceSimulation<SimulationNode>(nodes)
      .velocityDecay(0.7)
      .force('link', forceLink<SimulationNode, SimulationEdge>(edges)
        .id((d) => d.id)
        .distance((e) => {
          if (e.type === 'membership') return membershipLinkDistance;
          if (e.type === 'aggregated') return aggregatedLinkDistance;
          return mobileLinkDistance;
        })
        .strength((e) => e.type === 'membership' ? 0.4 : 0.7))
      .force('charge', forceManyBody<SimulationNode>().strength(mobileChargeStrength).distanceMax(380))
      // Stable centering forces acting on each node independently, avoiding centroid runaway
      .force('centerX', forceX<SimulationNode>(width / 2).strength((d) => {
        if (d.kind === 'person' && d.isCenter) return 0.5;
        if (d.kind === 'bubble' && d.isExpanded) return 0;
        return 0.05;
      }))
      .force('centerY', forceY<SimulationNode>(height / 2).strength((d) => {
        if (d.kind === 'person' && d.isCenter) return 0.5;
        if (d.kind === 'bubble' && d.isExpanded) return 0;
        return 0.05;
      }))
      .force('collision', forceCollide<SimulationNode>().radius(collisionForNode))
      .force('expandedCluster', expandedClusterField);

    sim.on('tick', () => {
      quadtreeRef.current = buildQuadtree(nodes);
      requestPaint();
    });

    return sim;
  }, [isMobile, linkDistance, chargeStrength, requestPaint]);

  // Step 3: Composition helper — recomposes sim data from raw cache
  const recomposeAndBuildSim = useCallback((raw: { nodes: RawGraphPerson[]; edges: SimulationEdge[] } | null) => {
    const incomingPeople = Array.isArray(raw?.nodes) ? raw.nodes : [];

    const effectiveFilters = {
      ...tacticalFilters,
      includeGroupIds,
      excludeGroupIds,
      groupMatchOperator: includeMode,
    };

    const filteredPeople = incomingPeople.filter((p) => {
      if (p.isCenter || p.id.startsWith('user-')) return true;
      if (p.nodeType === 'event' || p.id.startsWith('event-')) {
        const evId = p.id.replace(/^event-/, '');
        if (effectiveFilters.caseId && evId !== effectiveFilters.caseId) return false;
        if (
          effectiveFilters.activeCasesOnly &&
          p.eventStatus &&
          p.eventStatus !== 'PLANNED' &&
          p.eventStatus !== 'ONGOING'
        ) {
          return false;
        }
        return true;
      }
      return matchesPersonTacticalFilters(p, effectiveFilters);
    });

    // If no groups prop, we're not on the dashboard — skip bubble logic.
    const resolvedMode = groups ? resolveGraphMode(localGraphMode) : 'individuals';

    // Always expand any group that's currently in the include filter.
    const nextExpanded = new Set(expandedBubbles);
    if (resolvedMode === 'bubbles' && groups) {
      for (const id of includeGroupIds) {
        nextExpanded.add(id);
      }
    }

    // Drop expanded groups that no longer exist in the current data.
    if (resolvedMode === 'bubbles' && groups) {
      const presentGroups = new Set(groups.map((g) => g.id));
      presentGroups.add(UNGROUPED_SYNTHETIC_ID);
      for (const id of [...nextExpanded]) {
        if (!presentGroups.has(id)) nextExpanded.delete(id);
      }
    }
    if (nextExpanded.size !== expandedBubbles.size) {
      setExpandedBubbles(nextExpanded);
    }

    const incomingNodes = buildSimulationNodes({
      people: filteredPeople,
      groups: groups ?? [],
      mode: resolvedMode,
      expandedBubbles: nextExpanded,
      ungroupedLabel,
    });

    const rawEdges: SimulationEdge[] = Array.isArray(raw?.edges) ? raw.edges : [];
    const composedEdges = resolvedMode === 'bubbles'
      ? buildHubAndSpokeEdges({
          rawEdges,
          simNodes: incomingNodes,
          neutralEdgeColor: '#9ca3af',
        })
      : rawEdges;

    // d3-force's forceLink mutates each edge's source/target from string ids
    // to node-object references on the first sim build. If we reused those
    // mutated edges on a later rebuild, forceLink would keep the stale refs
    // (it skips resolution when source/target is already an object) — so the
    // new simulation would move new node objects while edges still drew
    // between the previous sim's node objects, leaving the visible
    // disconnect from #240. Clone edges with string ids each time.
    const incomingEdges: SimulationEdge[] = composedEdges.map((e) => ({
      ...e,
      source: typeof e.source === 'string' ? e.source : e.source.id,
      target: typeof e.target === 'string' ? e.target : e.target.id,
    }));

    const { nodes, edges } = diffSimulationData(nodesRef.current, incomingNodes, edgesRef.current, incomingEdges);

    // Restore user-pinned node positions from localStorage/ref
    const pinnedMap = pinnedPositionsRef.current;
    for (const node of nodes) {
      const pinned = pinnedMap[node.id];
      if (pinned && Number.isFinite(pinned.x) && Number.isFinite(pinned.y)) {
        node.x = pinned.x;
        node.y = pinned.y;
        node.fx = pinned.x;
        node.fy = pinned.y;
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;

    simRef.current?.stop();
    const sim = buildSimulation(nodes, edges);
    if (sim) {
      sim.alpha(0.3).restart();
      simRef.current = sim;
    }
  }, [
    groups, localGraphMode, expandedBubbles,
    includeGroupIds, excludeGroupIds, includeMode,
    tacticalFilters, ungroupedLabel, buildSimulation,
  ]);

  // Step 4: Data-fetch effect
  useEffect(() => {
    if (!canvasRef.current || !apiEndpoint) return;

    let cancelled = false;

    const fetchData = async () => {
      const url = new URL(apiEndpoint, window.location.origin);
      url.searchParams.set('groupMatchOperator', includeMode);
      if (includeGroupIds.length > 0) url.searchParams.set('includeGroupIds', includeGroupIds.join(','));
      if (excludeGroupIds.length > 0) url.searchParams.set('excludeGroupIds', excludeGroupIds.join(','));
      if (selectedCaseId) {
        url.searchParams.set('caseId', selectedCaseId);
        url.searchParams.set('includeHop', includeHop ? 'true' : 'false');
      }
      if (activeCasesOnly) url.searchParams.set('includeSolvedCases', 'false');
      if (!showRuledOut) url.searchParams.set('includeRuledOut', 'false');
      if (hideUserNode) url.searchParams.set('hideUserNode', 'true');
      if (customFieldSlug) {
        const cfQuery = customFieldValue.trim()
          ? `${customFieldSlug}:${customFieldValue.trim()}`
          : customFieldSlug;
        url.searchParams.set('cf', cfQuery);
      }

      try {
        const response = await fetch(url.toString());
        if (!response.ok) return;
        const data = await response.json() as { nodes: RawGraphPerson[]; edges: SimulationEdge[] };

        if (cancelled || !Array.isArray(data?.nodes)) return;

        rawCacheRef.current = data;
        setGraphData(data);
        recomposeAndBuildSim(data);
      } catch {
        // Ignore network errors on aborted/failed graph fetch
      }
    };

    fetchData();
    return () => { cancelled = true; };
    // recomposeAndBuildSim intentionally excluded: it depends on bubble state
    // (expandedBubbles, localGraphMode) which are handled by the Step 5 effect
    // from the cached raw data — no need to re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    apiEndpoint,
    refreshKey,
    includeMode,
    includeGroupIds,
    excludeGroupIds,
    selectedCaseId,
    includeHop,
    activeCasesOnly,
    showRuledOut,
    hideUserNode,
    customFieldSlug,
    customFieldValue,
  ]);

  // Step 5: Recompose when bubble state or tactical filters change
  useEffect(() => {
    const raw = rawCacheRef.current;
    if (!raw) return;
    recomposeAndBuildSim(raw);
  }, [localGraphMode, expandedBubbles, tacticalFilters, recomposeAndBuildSim]);

  // Step 6: Zoom, click, hover, and drag handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clientCoordsOf = (e: Event): [number, number] => {
      if ('touches' in e) {
        const te = e as TouchEvent;
        const t = te.touches[0] ?? te.changedTouches[0];
        return [t.clientX, t.clientY];
      }
      const me = e as MouseEvent;
      return [me.clientX, me.clientY];
    };

    const toGraphCoords = (clientX: number, clientY: number): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      const xPx = clientX - rect.left;
      const yPx = clientY - rect.top;
      const t = transformRef.current;
      return [(xPx - t.x) / t.k, (yPx - t.y) / t.k];
    };

    const nodeAt = (clientX: number, clientY: number): SimulationNode | undefined => {
      const tree = quadtreeRef.current;
      if (!tree) return undefined;
      const [gx, gy] = toGraphCoords(clientX, clientY);
      return findNodeAtPoint(tree, gx, gy, isMobile ? 28 : 22);
    };

    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 3])
      .filter((event: Event) => {
        const me = event as MouseEvent;
        if (me.ctrlKey || me.button) return false;
        if (event.type === 'mousedown' || event.type === 'touchstart') {
          const touch = 'touches' in event ? (event as TouchEvent).touches[0] : null;
          const cx = touch ? touch.clientX : me.clientX;
          const cy = touch ? touch.clientY : me.clientY;
          if (nodeAt(cx, cy)) return false;
        }
        return true;
      })
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        setContextMenu(null);
        requestPaint();
      });
    zoomBehaviorRef.current = zoomBehavior;
    select(canvas).call(zoomBehavior);

    const onMove = (event: MouseEvent) => {
      const node = nodeAt(event.clientX, event.clientY);
      const id = node?.id ?? null;
      if (hoveredNodeIdRef.current !== id) {
        hoveredNodeIdRef.current = id;
        canvas.style.cursor = id ? 'pointer' : 'default';
        requestPaint();
      }
    };

    const handleBubbleToggle = (node: BubbleSimNode) => {
      // Collapse is instant.
      if (node.isExpanded) {
        setExpandedBubbles((prev) => {
          const next = new Set(prev);
          next.delete(node.groupId);
          return next;
        });
        return;
      }
      // Expand: push the bubble outward, pin it, reheat the sim so other
      // nodes redistribute, wait briefly, THEN trigger expansion so the
      // cluster lands in cleared space.
      if (node.x !== undefined && node.y !== undefined) {
        const center = nodesRef.current.find(
          (n): n is SimulationNode & { x: number; y: number } =>
            n.kind === 'person' && n.isCenter && n.x !== undefined && n.y !== undefined,
        );
        if (center) {
          const dx = node.x - center.x;
          const dy = node.y - center.y;
          const dist = Math.hypot(dx, dy) || 1;
          const memberRadius = isMobile ? 12 : 14;
          const padding = isMobile ? 18 : 24;
          const clusterRadius = Math.sqrt(Math.max(node.memberCount, 1)) * memberRadius * 1.2 + padding;
          const targetDist = (clusterRadius + (isMobile ? 130 : 180)) * 2;
          const finalDist = Math.max(dist, targetDist);
          const ratio = finalDist / dist;
          const targetX = center.x + dx * ratio;
          const targetY = center.y + dy * ratio;

          node.x = targetX;
          node.y = targetY;
          node.fx = targetX;
          node.fy = targetY;
          node.vx = 0;
          node.vy = 0;
          if (simRef.current) simRef.current.alpha(0.3).restart();

          const bubbleId = node.id;
          const groupId = node.groupId;

          setExpandedBubbles((prev) => {
            const next = new Set(prev);
            next.add(groupId);
            return next;
          });
          // Release the pin once the cluster has had time to settle. With
          // centerX/Y strength = 0 for expanded ghosts, it stays put.
          if (unpinTimeoutRef.current !== null) window.clearTimeout(unpinTimeoutRef.current);
          unpinTimeoutRef.current = window.setTimeout(() => {
            unpinTimeoutRef.current = null;
            const ghost = nodesRef.current.find((n) => n.id === bubbleId);
            if (ghost) {
              ghost.fx = null;
              ghost.fy = null;
            }
          }, 1500);
        }
      }
    };

    const openContextMenuForNode = (node: SimulationNode, clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      const menuWidth = 240;
      const menuHeight = 220;
      const x = Math.max(8, Math.min(rawX, rect.width - menuWidth - 8));
      const y = Math.max(8, Math.min(rawY, rect.height - menuHeight - 8));
      const isPinned = Boolean(
        pinnedPositionsRef.current[node.id] ||
        (node.fx !== null && node.fx !== undefined)
      );
      setContextMenu({ node, x, y, isPinned });
      touchSelectedNodeIdRef.current = node.id;
      requestPaint();
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const node = nodeAt(event.clientX, event.clientY);
      if (!node) {
        setContextMenu(null);
        return;
      }
      openContextMenuForNode(node, event.clientX, event.clientY);
    };

    let touchTimer: NodeJS.Timeout | null = null;
    let touchStartPos: [number, number] | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchStartPos = [t.clientX, t.clientY];
      const node = nodeAt(t.clientX, t.clientY);
      if (node) {
        touchTimer = setTimeout(() => {
          openContextMenuForNode(node, t.clientX, t.clientY);
        }, 500);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartPos || !touchTimer) return;
      const t = e.touches[0];
      const dist = Math.hypot(t.clientX - touchStartPos[0], t.clientY - touchStartPos[1]);
      if (dist > 10) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    };

    const onTouchEndOrCancel = () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      touchStartPos = null;
    };

    let dragStartX = 0;
    let dragStartY = 0;
    const CLICK_TRAVEL_PX = 4;
    const TOUCH_TRAVEL_PX = 12;

    const drag_ = drag<HTMLCanvasElement, unknown>()
      .container(canvas)
      .subject((event) => {
        const [cx, cy] = clientCoordsOf(event.sourceEvent);
        const node = nodeAt(cx, cy);
        return node ?? null;
      })
      .on('start', (event) => {
        const d = event.subject as SimulationNode | null;
        if (!d) return;
        setContextMenu(null);
        dragStartX = event.x;
        dragStartY = event.y;
        isDraggingRef.current = true;
        if (!event.active && simRef.current) simRef.current.alphaTarget(0.02).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event) => {
        const d = event.subject as SimulationNode | null;
        if (!d) return;
        const [cx, cy] = clientCoordsOf(event.sourceEvent);
        const [gx, gy] = toGraphCoords(cx, cy);
        d.x = gx;
        d.y = gy;
        d.fx = gx;
        d.fy = gy;
      })
      .on('end', (event) => {
        const d = event.subject as SimulationNode | null;
        if (!d) return;
        isDraggingRef.current = false;
        if (!event.active && simRef.current) simRef.current.alphaTarget(0);
        const isTouch = event.sourceEvent?.type?.startsWith('touch');
        const threshold = isTouch ? TOUCH_TRAVEL_PX : CLICK_TRAVEL_PX;
        const traveled = Math.hypot(event.x - dragStartX, event.y - dragStartY);
        if (traveled >= threshold) {
          // Keep dragged node pinned at its dropped coordinates and persist
          if (d.x !== undefined && d.y !== undefined) {
            d.fx = d.x;
            d.fy = d.y;
            pinnedPositionsRef.current[d.id] = { x: d.x, y: d.y };
            savePinnedPositions();
          }
          return;
        }

        // It was a click/tap, not a drag: keep previous pin if it was already pinned, else release
        const existingPin = pinnedPositionsRef.current[d.id];
        if (!existingPin) {
          d.fx = null;
          d.fy = null;
        }

        setContextMenu(null);

        // Bubble toggle on click
        if (d.kind === 'bubble') {
          handleBubbleToggle(d as BubbleSimNode);
          return;
        }

        // Left-click / tap on a person or event node:
        // DO NOT navigate! Toggle selection highlight so user can easily examine relationships
        if (touchSelectedNodeIdRef.current === d.id) {
          touchSelectedNodeIdRef.current = null;
        } else {
          touchSelectedNodeIdRef.current = d.id;
        }
        requestPaint();
      });

    select(canvas).call(drag_);

    const onTapEmpty = (event: TouchEvent) => {
      setContextMenu(null);
      if (!touchSelectedNodeIdRef.current) return;
      const touch = event.changedTouches[0];
      if (touch && !nodeAt(touch.clientX, touch.clientY)) {
        touchSelectedNodeIdRef.current = null;
        requestPaint();
      }
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchend', onTapEmpty);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEndOrCancel);
    canvas.addEventListener('touchcancel', onTouchEndOrCancel);

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchend', onTapEmpty);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEndOrCancel);
      canvas.removeEventListener('touchcancel', onTouchEndOrCancel);
      if (touchTimer) clearTimeout(touchTimer);
      select(canvas).on('.zoom', null);
      select(canvas).on('.drag', null);
      if (unpinTimeoutRef.current !== null) {
        window.clearTimeout(unpinTimeoutRef.current);
        unpinTimeoutRef.current = null;
      }
    };
  }, [centerNodeNonClickable, isMobile, requestPaint, savePinnedPositions]);

  const activeCustomFieldTemplate = customFieldTemplates?.find((cf) => cf.slug === customFieldSlug);

  return (
    <div className="w-full h-full">
      <div className="relative" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className={`w-full bg-surface rounded-lg border border-border ${
            compact
              ? 'h-[400px] sm:h-[500px] lg:h-[600px] xl:h-[700px] 2xl:h-[800px]'
              : 'h-[400px] sm:h-[500px] lg:h-[70vh] lg:min-h-[600px]'
          }`}
        />

        {/* Toggle button when Subject & Case Roster Sidebar is collapsed */}
        {!rosterOpen && (
          <button
            type="button"
            onClick={() => setRosterOpen(true)}
            className="absolute top-3 left-3 z-10 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface/95 backdrop-blur border border-border shadow-md text-xs font-medium text-foreground hover:bg-surface-elevated transition-colors"
            title={t('rosterTitle')}
          >
            <span>📋 {t('rosterToggle')}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
              {rosterItems.persons.length + rosterItems.cases.length}
            </span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-white font-semibold">
                ⚙️ {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* Resizable / Dual-Pane Subject & Case Roster Sidebar */}
        <TacticalSidebarContainer
          isOpen={rosterOpen}
          onClose={() => setRosterOpen(false)}
          title={t('rosterTitle')}
          rosterCount={rosterItems.persons.length + rosterItems.cases.length}
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((prev) => !prev)}
          storageKeyPrefix="graph-tactical-sidebar"
          searchBar={
            <input
              type="search"
              value={rosterQuery}
              onChange={(e) => setRosterQuery(e.target.value)}
              placeholder={t('rosterSearchPlaceholder')}
              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          }
          quickChips={
            <TacticalQuickChips filters={tacticalFilters} onChange={setTacticalFilters} />
          }
          activeBadges={
            <ActiveTacticalBadges
              filters={tacticalFilters}
              onChange={setTacticalFilters}
              cases={events}
              gangs={gangs}
              groups={groups}
            />
          }
          filterDrawer={
            <div className="space-y-2.5">
              {groups && groups.length > 0 && (
                <div className="space-y-1.5 pb-2 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted text-[11px]">{t('filterByGroups')}</span>
                    <button
                      type="button"
                      onClick={() => setIncludeMode((prev) => (prev === 'or' ? 'and' : 'or'))}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-elevated text-foreground hover:bg-surface border border-border"
                    >
                      {includeMode === 'or' ? t('matchMode.any') : t('matchMode.all')}
                    </button>
                  </div>
                  <PillSelector<GroupFilterItem>
                    selectedItems={selectedGroupFilters}
                    availableItems={groups.map((g) => ({
                      id: g.id,
                      label: g.name,
                      color: g.color,
                      isNegative: false,
                    }))}
                    onAdd={(item) => {
                      setSelectedGroupFilters((prev) =>
                        prev.some((f) => f.id === item.id)
                          ? prev
                          : [...prev, { ...item, isNegative: false }],
                      );
                    }}
                    onRemove={(itemId) =>
                      setSelectedGroupFilters((prev) =>
                        prev.filter((f) => f.id !== itemId),
                      )
                    }
                    onClearAll={() => setSelectedGroupFilters([])}
                    placeholder={t('filterPlaceholder')}
                    emptyMessage={t('noGroupsFound')}
                    showAllOnFocus={true}
                    renderPill={(item, onRemove) => (
                      <GraphFilterGroupPill
                        key={item.id}
                        id={item.id}
                        label={item.label}
                        color={item.color}
                        isNegative={item.isNegative}
                        onToggle={() => toggleFilterSign(item.id)}
                        onRemove={onRemove}
                        title={
                          item.isNegative
                            ? t('filterState.excluded')
                            : t('filterState.included')
                        }
                        ariaLabel={
                          item.isNegative
                            ? t('filterState.excludedWithLabel', {
                                label: item.label,
                              })
                            : t('filterState.includedWithLabel', {
                                label: item.label,
                              })
                        }
                      />
                    )}
                  />
                </div>
              )}

              <TacticalFilterDrawer
                filters={tacticalFilters}
                onChange={setTacticalFilters}
                cases={events}
                gangs={gangs}
                groups={groups}
                isGraphMode={true}
                customFieldTemplates={customFieldTemplates}
              />

              {/* Compact Legend */}
              <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2 rounded-sm bg-amber-500 border border-amber-800" />
                  {t('legendCase')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-red-500" />
                  {t('legendConfirmed')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-3 border-t border-dashed border-orange-500" />
                  {t('legendInvestigating')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-3 border-t border-dotted border-gray-500" />
                  {t('legendRuledOut')}
                </span>
              </div>
            </div>
          }
          rosterContent={
            <div className="divide-y divide-border/60 text-xs">
              {/* Cases section */}
              {rosterItems.cases.length > 0 && (
                <div className="p-2.5">
                  <div className="flex items-center justify-between px-1.5 mb-1.5">
                    <span className="font-semibold text-muted">
                      📁 {t('rosterCases')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                      {rosterItems.cases.length}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {rosterItems.cases.map((ev) => {
                      const eventId = ev.id.replace(/^event-/, '');
                      const isSelected = selectedCaseId === eventId;
                      return (
                        <li key={ev.id} className="rounded-xl hover:bg-surface-elevated transition-colors p-2 border border-border/50 bg-surface">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => focusNodeInGraph(ev.id)}
                              className="min-w-0 flex-1 text-left flex items-center gap-2 group cursor-pointer"
                              title={t('focusInGraph')}
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                {ev.label.replace(/^📅\s*/, '')}
                              </span>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              {events && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedCaseId((prev) => (prev === eventId ? '' : eventId))}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                    isSelected
                                      ? 'bg-primary text-white'
                                      : 'bg-surface-elevated text-muted hover:text-foreground'
                                  }`}
                                  title={t('contextMenu.focusCase')}
                                >
                                  {isSelected ? '✓' : '🎯'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => router.push(`/events/${eventId}`)}
                                className="px-1.5 py-0.5 rounded text-[10px] text-muted hover:text-foreground bg-surface-elevated hover:bg-surface transition-colors"
                                title={t('contextMenu.viewDetails')}
                              >
                                →
                              </button>
                            </div>
                          </div>
                          {ev.eventStatus && (
                            <div className="pl-4.5 text-[10px] text-muted truncate mt-0.5">
                              {ev.eventStatus}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Persons section */}
              <div className="p-2.5">
                <div className="flex items-center justify-between px-1.5 mb-1.5">
                  <span className="font-semibold text-muted">
                    👤 {t('rosterPersons')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold text-[11px]">
                    {rosterItems.persons.length}
                  </span>
                </div>
                {rosterItems.persons.length === 0 ? (
                  <p className="px-1.5 py-2 text-muted italic">{t('rosterEmpty')}</p>
                ) : (
                  <div className="space-y-1.5">
                    {rosterItems.persons.map((person) => (
                      <TacticalPersonCard
                        key={person.id}
                        id={person.id}
                        name={person.label}
                        photoUrl={person.photo ? `/api/photos/${person.id}` : null}
                        hasPhoto={Boolean(person.photo)}
                        color={person.colors?.[0] ?? '#3b82f6'}
                        tacticalData={person}
                        onFocus={() => focusNodeInGraph(person.id)}
                        focusTitle={t('focusInGraph')}
                        detailsHref={`/people/${person.id}`}
                        detailsTitle={t('contextMenu.viewDetails')}
                        gangs={gangs}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          }
        />

        {/* Backdrop to dismiss context menu on click anywhere outside */}
        {contextMenu && (
          <div
            className="fixed inset-0 z-20"
            onClick={() => setContextMenu(null)}
          />
        )}

        {/* Node Right-Click Context Menu */}
        {contextMenu && (() => {
          const node = contextMenu.node;
          const isPersonNode = node.kind === 'person';
          const personNode = isPersonNode ? node : null;
          const isBubbleNode = node.kind === 'bubble';
          const isUserNode = personNode ? (personNode.isCenter || personNode.id.startsWith('user-')) : false;
          const isEventNode = personNode ? personNode.id.startsWith('event-') : false;

          return (
            <div
              ref={contextMenuRef}
              style={{
                left: `${contextMenu.x}px`,
                top: `${contextMenu.y}px`,
              }}
              className="absolute z-30 w-64 bg-surface/95 dark:bg-surface/95 backdrop-blur-md border border-border/90 rounded-xl shadow-2xl p-2.5 text-foreground animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 pb-2 mb-2 border-b border-border/60">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm shrink-0 overflow-hidden">
                  {personNode && personNode.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        personNode.id.startsWith('user-')
                          ? '/api/photos/user'
                          : `/api/photos/${personNode.id}`
                      }
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : isEventNode ? (
                    '📁'
                  ) : isUserNode ? (
                    '⭐'
                  ) : isBubbleNode ? (
                    '👥'
                  ) : (
                    '👤'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground truncate text-sm">
                    {node.label}
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    {isBubbleNode
                      ? t('contextMenu.bubbleTitle')
                      : isEventNode
                      ? t('contextMenu.eventTitle')
                      : isUserNode
                      ? t('contextMenu.userTitle')
                      : t('contextMenu.personTitle')}
                  </div>
                </div>
              </div>

              {/* Actions list */}
              <div className="flex flex-col gap-1">
                {/* Navigate / Open details */}
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    if (isBubbleNode) {
                      // Bubble toggle
                    } else if (contextMenu.node.id.startsWith('user-')) {
                      router.push('/dashboard');
                    } else if (isEventNode) {
                      router.push(`/events/${contextMenu.node.id.slice('event-'.length)}`);
                    } else {
                      router.push(`/people/${contextMenu.node.id}`);
                    }
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-left font-medium"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="truncate">
                    {isBubbleNode
                      ? (contextMenu.node as BubbleSimNode).isExpanded
                        ? t('contextMenu.collapseGroup')
                        : t('contextMenu.expandGroup')
                      : t('contextMenu.viewDetails')}
                  </span>
                </button>

                {/* Open in new tab (for person and event) */}
                {isPersonNode && (
                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      const path = contextMenu.node.id.startsWith('user-')
                        ? '/dashboard'
                        : isEventNode
                        ? `/events/${contextMenu.node.id.slice('event-'.length)}`
                        : `/people/${contextMenu.node.id}`;
                      window.open(path, '_blank');
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/30 transition-colors text-left"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span className="truncate">{t('contextMenu.openNewTab')}</span>
                  </button>
                )}

                {/* View Journal entries for person or event */}
                {isPersonNode && !isUserNode && (
                  <button
                    type="button"
                    onClick={() => {
                      setContextMenu(null);
                      const query = isEventNode
                        ? `?event=${contextMenu.node.id.slice('event-'.length)}`
                        : `?person=${contextMenu.node.id}`;
                      router.push(`/journal${query}`);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/30 transition-colors text-left"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="truncate">{t('contextMenu.viewJournal')}</span>
                  </button>
                )}

                {/* Focus graph on this case (if event) */}
                {isEventNode && events && (
                  <button
                    type="button"
                    onClick={() => {
                      const eventId = contextMenu.node.id.slice('event-'.length);
                      setSelectedCaseId(eventId);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-left"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="truncate">{t('contextMenu.focusCase')}</span>
                  </button>
                )}

                {/* Pin / Unpin node */}
                <button
                  type="button"
                  onClick={() => togglePinNode(contextMenu.node)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/30 transition-colors text-left"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="truncate">
                    {contextMenu.isPinned
                      ? t('contextMenu.unpinNode')
                      : t('contextMenu.pinNode')}
                  </span>
                </button>

                {/* Hide user node (if user) */}
                {isUserNode && (
                  <button
                    type="button"
                    onClick={() => {
                      setHideUserNode(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/30 transition-colors text-left"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                    <span className="truncate">{t('contextMenu.hideUserNode')}</span>
                  </button>
                )}

                {/* Close menu button */}
                <button
                  type="button"
                  onClick={() => setContextMenu(null)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-md text-muted hover:text-foreground transition-colors text-left mt-1 border-t border-border/40 pt-1.5 text-[11px]"
                >
                  <span>✕ {t('contextMenu.close')}</span>
                </button>
              </div>
            </div>
          );
        })()}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          {events && (
            <button
              type="button"
              onClick={() => setHideUserNode((prev) => !prev)}
              className={`p-2.5 border rounded-lg transition-all ${
                hideUserNode
                  ? 'bg-surface/60 border-border/60 text-muted opacity-60 hover:opacity-100'
                  : 'bg-surface border-border text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
              aria-label={t('hideUserNode')}
              title={t('hideUserNode')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                {hideUserNode && (
                  <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" strokeWidth={2} />
                )}
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={resetGraphLayout}
            className="p-3 bg-surface border border-border rounded-lg hover:bg-surface-elevated transition-colors"
            aria-label={t('resetLayout')}
            title={t('resetLayout')}
          >
            <svg
              className="w-5 h-5 text-primary dark:text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {groups && (() => {
            const bubblesActive = resolveGraphMode(localGraphMode) === 'bubbles';
            const label = bubblesActive ? t('showIndividuals') : t('showAsGroups');
            return (
              <>
                <button
                  onClick={async () => {
                    const next: 'individuals' | 'bubbles' = bubblesActive ? 'individuals' : 'bubbles';
                    setLocalGraphMode(next);
                    try {
                      await fetch('/api/user/graph-display', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ graphMode: next }),
                      });
                    } catch {
                      // Silent fail — local state is source of truth until next page load.
                    }
                  }}
                  className={`p-3 border rounded-lg transition-colors ${
                    bubblesActive
                      ? 'bg-primary/20 border-primary/40 dark:bg-primary dark:border-primary'
                      : 'bg-surface border-border hover:bg-surface-elevated'
                  }`}
                  aria-label={label}
                  title={label}
                >
                  <svg className="w-5 h-5 text-primary dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="8" cy="8" r="4" strokeWidth="2"/>
                    <circle cx="16" cy="16" r="4" strokeWidth="2"/>
                  </svg>
                </button>
                {bubblesActive && expandedBubbles.size > 0 && (
                  <button
                    onClick={() => setExpandedBubbles(new Set())}
                    className="p-3 bg-surface border border-border rounded-lg hover:bg-surface-elevated transition-colors"
                    aria-label={t('collapseAllGroups')}
                    title={t('collapseAllGroups')}
                  >
                    <svg
                      className="w-5 h-5 text-primary dark:text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </button>
                )}
              </>
            );
          })()}
          <button
            onClick={recenterGraph}
            className="p-3 bg-surface border border-border rounded-lg hover:bg-surface-elevated transition-colors"
            aria-label={t('recenterGraph')}
            title={t('recenterGraph')}
          >
            <svg
              className="w-5 h-5 text-primary dark:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" strokeWidth="2" fill="currentColor" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
