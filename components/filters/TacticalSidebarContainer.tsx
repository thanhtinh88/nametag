'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';

export interface TacticalSidebarContainerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  rosterCount?: number;
  activeFilterCount: number;
  onClearFilters: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  searchBar: React.ReactNode;
  quickChips: React.ReactNode;
  activeBadges: React.ReactNode;
  filterDrawer: React.ReactNode;
  rosterContent: React.ReactNode;
  extraHeaderActions?: React.ReactNode;
  storageKeyPrefix?: string;
}

export default function TacticalSidebarContainer({
  isOpen,
  onClose,
  title,
  rosterCount = 0,
  activeFilterCount,
  onClearFilters,
  filtersOpen,
  onToggleFilters,
  searchBar,
  quickChips,
  activeBadges,
  filterDrawer,
  rosterContent,
  extraHeaderActions,
  storageKeyPrefix = 'tactical-sidebar',
}: TacticalSidebarContainerProps) {
  const t = useTranslations('tacticalFilters');

  // Width management
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 380;
    try {
      const saved = localStorage.getItem(`${storageKeyPrefix}-width`);
      return saved ? Math.min(Math.max(parseInt(saved, 10), 320), 720) : 380;
    } catch {
      return 380;
    }
  });

  // Layout mode: 'flyout' (dual pane) vs 'tabs' (single pane with tabs)
  const [layoutMode, setLayoutMode] = useState<'flyout' | 'tabs'>(() => {
    if (typeof window === 'undefined') return 'flyout';
    try {
      const saved = localStorage.getItem(`${storageKeyPrefix}-layout-mode`);
      return saved === 'tabs' ? 'tabs' : 'flyout';
    } catch {
      return 'flyout';
    }
  });

  // Active tab when in 'tabs' mode: 'roster' | 'filters'
  const [activeTab, setActiveTab] = useState<'roster' | 'filters'>('roster');

  // Resizing state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(380);

  const handleMouseDownResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = moveEvent.clientX - startXRef.current;
      const maxWidth = Math.min(window.innerWidth * 0.6, 750);
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, 320), maxWidth);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        try {
          localStorage.setItem(`${storageKeyPrefix}-width`, String(width));
        } catch {
          // Ignore storage error
        }
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [width, storageKeyPrefix]);

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode((prev) => {
      const next = prev === 'flyout' ? 'tabs' : 'flyout';
      try {
        localStorage.setItem(`${storageKeyPrefix}-layout-mode`, next);
      } catch {
        // Ignore
      }
      return next;
    });
  }, [storageKeyPrefix]);

  // Width presets: cycle 360 -> 480 -> 600 -> 360
  const cycleWidthPreset = useCallback(() => {
    setWidth((prev) => {
      let next = 360;
      if (prev < 420) next = 480;
      else if (prev < 550) next = 600;
      else next = 360;
      try {
        localStorage.setItem(`${storageKeyPrefix}-width`, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, [storageKeyPrefix]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-3 left-3 bottom-3 z-20 flex items-stretch gap-2.5 pointer-events-none select-none">
      {/* ============================================================ */}
      {/* 1. MAIN PANE (ROSTER & CONTROLS)                             */}
      {/* ============================================================ */}
      <aside
        style={{ width: `${width}px` }}
        className="pointer-events-auto relative bg-surface/95 backdrop-blur border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs transition-shadow"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface-elevated/70 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground truncate">
              {title}
            </h2>
            {rosterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold text-[11px] shrink-0">
                {rosterCount}
              </span>
            )}
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1 shrink-0 text-muted">
            {extraHeaderActions}

            {/* Width Preset Cycle */}
            <button
              type="button"
              onClick={cycleWidthPreset}
              className="p-1 rounded hover:text-foreground hover:bg-surface transition-colors"
              title={`Đổi độ rộng (${width}px)`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </button>

            {/* Layout Mode Toggle (Flyout vs Tabs) */}
            <button
              type="button"
              onClick={toggleLayoutMode}
              className={`p-1 rounded transition-colors ${
                layoutMode === 'flyout'
                  ? 'text-primary bg-primary/10'
                  : 'hover:text-foreground hover:bg-surface'
              }`}
              title={layoutMode === 'flyout' ? 'Chế độ Cánh phụ (Flyout) đang bật' : 'Chế độ Chuyển Tab đang bật'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>

            {/* Close Sidebar */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:text-foreground hover:bg-surface transition-colors"
              title="Thu gọn sidebar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab switcher when in 'tabs' mode */}
        {layoutMode === 'tabs' && (
          <div className="flex border-b border-border bg-surface-elevated/40 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`flex-1 py-1.5 px-3 text-center font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'roster'
                  ? 'border-primary text-primary font-bold bg-surface'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <span>📋 Danh sách</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-elevated">
                {rosterCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('filters')}
              className={`flex-1 py-1.5 px-3 text-center font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'filters'
                  ? 'border-primary text-primary font-bold bg-surface'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <span>⚙️ Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary text-white font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: TAB MODE -> SHOW FILTER DRAWER FULL HEIGHT          */}
        {/* ============================================================ */}
        {layoutMode === 'tabs' && activeTab === 'filters' ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="font-semibold text-foreground">
                Điều kiện lọc ({activeFilterCount})
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-xs text-muted hover:text-red-500 transition-colors"
                >
                  {t('clearAll')}
                </button>
              )}
            </div>
            {filterDrawer}
          </div>
        ) : (
          /* ============================================================ */
          /* VIEW 2: ROSTER LIST VIEW                                     */
          /* ============================================================ */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search input */}
            <div className="p-2 border-b border-border/60 bg-surface/40 shrink-0">
              {searchBar}
            </div>

            {/* Quick Tactical Chips (1-tap filters) */}
            <div className="px-2.5 py-1.5 border-b border-border/50 bg-surface-elevated/20 shrink-0 overflow-x-auto">
              {quickChips}
            </div>

            {/* Filter Drawer Toggle & Active count bar (Flyout Mode) */}
            {layoutMode === 'flyout' && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-surface-elevated/40 border-b border-border/60 shrink-0">
                <button
                  type="button"
                  onClick={onToggleFilters}
                  className={`flex items-center gap-1.5 font-semibold transition-colors text-xs px-2 py-0.5 rounded-md ${
                    filtersOpen
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:text-primary hover:bg-surface-elevated'
                  }`}
                  title={filtersOpen ? 'Đóng cánh phụ bộ lọc' : 'Mở cánh phụ bộ lọc'}
                >
                  <span>⚙️ {t('title')}</span>
                  {activeFilterCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      filtersOpen ? 'bg-white/20 text-white' : 'bg-primary text-white'
                    }`}>
                      {activeFilterCount}
                    </span>
                  )}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${filtersOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="text-[11px] text-muted hover:text-red-500 transition-colors"
                  >
                    {t('clearAll')}
                  </button>
                )}
              </div>
            )}

            {/* Active Badges */}
            <div className="px-2.5 bg-surface/40 shrink-0">
              {activeBadges}
            </div>

            {/* Scrollable Roster Content */}
            <div className="flex-1 overflow-y-auto">
              {rosterContent}
            </div>
          </div>
        )}

        {/* Right edge drag handle for resizing */}
        <div
          onMouseDown={handleMouseDownResize}
          className="absolute top-0 right-0 bottom-0 w-1.5 hover:w-2 hover:bg-primary/50 cursor-col-resize transition-all z-30 group"
          title="Kéo sang phải/trái để chỉnh độ rộng sidebar"
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0.5 w-1 h-6 rounded-full bg-border group-hover:bg-primary" />
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. DUAL-PANE FLYOUT PANEL (ATTACHED TO RIGHT IN FLYOUT MODE) */}
      {/* ============================================================ */}
      {layoutMode === 'flyout' && filtersOpen && (
        <aside className="pointer-events-auto w-84 sm:w-96 max-w-[calc(100vw-450px)] bg-surface/95 backdrop-blur border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs animate-in fade-in slide-in-from-left-4 duration-150">
          {/* Flyout Header */}
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-border bg-surface-elevated/70 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                ⚙️ {t('title')}
              </span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-[11px] text-muted hover:text-red-500 transition-colors mr-1"
                >
                  {t('clearAll')}
                </button>
              )}
              <button
                type="button"
                onClick={onToggleFilters}
                className="p-1 rounded text-muted hover:text-foreground hover:bg-surface transition-colors"
                title="Đóng cánh phụ"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Flyout Scrollable Body (100% full height for 5 filter groups) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filterDrawer}
          </div>

          {/* Flyout Sticky Footer */}
          <div className="p-2.5 border-t border-border bg-surface-elevated/60 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] text-muted">
              {t('matchCount', { matched: rosterCount, total: rosterCount })}
            </span>
            <button
              type="button"
              onClick={onToggleFilters}
              className="px-3 py-1 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors shadow-xs"
            >
              Đóng & Áp dụng
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

