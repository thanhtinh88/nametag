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
  defaultWidth?: number;
  minWidth?: number;
  onWidthChange?: (width: number) => void;
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
  defaultWidth = 360,
  minWidth = 280,
  onWidthChange,
}: TacticalSidebarContainerProps) {
  const t = useTranslations('tacticalFilters');

  // Width management: initialize with defaultWidth to prevent SSR hydration mismatch,
  // then restore saved width in useEffect on client.
  const [width, setWidth] = useState<number>(defaultWidth);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${storageKeyPrefix}-width`);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) {
          setWidth(Math.min(Math.max(parsed, minWidth), 720));
        }
      }
    } catch {
      // Ignore storage error
    }
  }, [storageKeyPrefix, minWidth]);

  useEffect(() => {
    onWidthChange?.(width);
  }, [width, onWidthChange]);

  // Active tab: 'roster' (Danh sách) vs 'filters' (Bộ lọc điều tra)
  const [activeTab, setActiveTab] = useState<'roster' | 'filters'>('roster');

  // Sync when parent requests filters to open
  useEffect(() => {
    if (filtersOpen) {
      setActiveTab('filters');
    }
  }, [filtersOpen]);

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
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, minWidth), maxWidth);
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
  }, [width, storageKeyPrefix, minWidth]);

  // Width presets: cycle base -> medium -> large -> base
  const cycleWidthPreset = useCallback(() => {
    setWidth((prev) => {
      let next = defaultWidth;
      if (prev < defaultWidth + 60) next = defaultWidth + 120;
      else if (prev < defaultWidth + 180) next = defaultWidth + 240;
      else next = defaultWidth;
      try {
        localStorage.setItem(`${storageKeyPrefix}-width`, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, [storageKeyPrefix, defaultWidth]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-3 left-3 bottom-3 z-20 flex items-stretch gap-2.5 pointer-events-none select-none">
      {/* ============================================================ */}
      {/* MAIN SINGLE PANE (TABBED: ROSTER & INVESTIGATION FILTERS)    */}
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

        {/* Tab switcher: Danh sách (Roster) vs Bộ lọc (Filters) */}
        <div className="flex border-b border-border bg-surface-elevated/40 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('roster');
              if (filtersOpen) onToggleFilters();
            }}
            className={`flex-1 py-2 px-3 text-center font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'roster'
                ? 'border-primary text-primary font-bold bg-surface'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <span>📋 Danh sách</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-elevated font-semibold">
              {rosterCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('filters');
              if (!filtersOpen) onToggleFilters();
            }}
            className={`flex-1 py-2 px-3 text-center font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'filters'
                ? 'border-primary text-primary font-bold bg-surface'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <span>⚙️ Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-white font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: TAB 'FILTERS' -> SHOW FILTER FORM WITH FULL HEIGHT   */}
        {/* ============================================================ */}
        {activeTab === 'filters' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-2.5 border-b border-border/60 bg-surface/50 flex items-center justify-between shrink-0">
              <span className="font-semibold text-foreground text-xs">
                Điều kiện lọc nghiệp vụ ({activeFilterCount})
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-xs text-muted hover:text-red-500 transition-colors font-medium"
                >
                  {t('clearAll')}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filterDrawer}
            </div>
            <div className="p-2 border-t border-border bg-surface-elevated/60 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-muted">
                {t('matchCount', { matched: rosterCount, total: rosterCount })}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('roster');
                  if (filtersOpen) onToggleFilters();
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors text-xs"
              >
                Áp dụng & Xem danh sách
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* VIEW 2: TAB 'ROSTER' -> SEARCH + QUICK CHIPS + LIST          */
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

            {/* Quick jump to Filters tab */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-surface-elevated/40 border-b border-border/60 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('filters');
                  if (!filtersOpen) onToggleFilters();
                }}
                className="flex items-center gap-1.5 font-semibold transition-colors text-xs text-foreground hover:text-primary px-2 py-0.5 rounded-md hover:bg-surface-elevated"
              >
                <span>⚙️ {t('title')}</span>
                {activeFilterCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                    {activeFilterCount}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted font-normal">(Mở bộ lọc chi tiết)</span>
                )}
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
    </div>
  );
}
