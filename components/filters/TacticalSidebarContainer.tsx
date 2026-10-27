'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';

export interface TacticalSidebarContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  title: string;
  rosterCount?: number;
  activeFilterCount: number;
  onClearFilters: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  searchBar: React.ReactNode;
  quickChips?: React.ReactNode;
  /**
   * Controls for filtering, sorting, grouping, and category selection of the list.
   * Rendered in the Top Horizontal Bar outside the map/graph.
   */
  rosterFilterControls?: React.ReactNode;
  activeBadges?: React.ReactNode;
  filterDrawer: React.ReactNode;
  rosterContent: React.ReactNode;
  extraHeaderActions?: React.ReactNode;
  storageKeyPrefix?: string;
  defaultWidth?: number;
  minWidth?: number;
  defaultRosterWidth?: number;
  rosterFlyoutOpen?: boolean;
  onRosterFlyoutOpenChange?: (open: boolean) => void;
  onWidthChange?: (totalWidth: number) => void;
  /**
   * The Map or Graph viewport to render in the main right-hand area, completely outside the sidebar & top bar.
   */
  children?: React.ReactNode;
}

export default function TacticalSidebarContainer({
  isOpen,
  onClose,
  onOpen,
  title,
  rosterCount = 0,
  activeFilterCount,
  onClearFilters,
  filtersOpen,
  onToggleFilters,
  searchBar,
  quickChips,
  rosterFilterControls,
  activeBadges,
  filterDrawer,
  rosterContent,
  extraHeaderActions,
  storageKeyPrefix = 'tactical-sidebar',
  defaultWidth = 280,
  minWidth = 220,
  rosterFlyoutOpen: controlledListOpen,
  onRosterFlyoutOpenChange,
  onWidthChange,
  children,
}: TacticalSidebarContainerProps) {
  const t = useTranslations('tacticalFilters');

  // Docked Left Pure-List Sidebar Width (default 280px)
  const [width, setWidth] = useState<number>(defaultWidth);

  const listOpen = controlledListOpen !== undefined ? controlledListOpen : isOpen;

  const handleToggleList = useCallback(() => {
    const next = !listOpen;
    onRosterFlyoutOpenChange?.(next);
    if (next) {
      onOpen?.();
    } else {
      onClose();
    }
    try {
      localStorage.setItem(`${storageKeyPrefix}-docked-open`, next ? '1' : '0');
    } catch {
      // Ignore storage error
    }
  }, [listOpen, onRosterFlyoutOpenChange, onOpen, onClose, storageKeyPrefix]);

  useEffect(() => {
    try {
      const savedW = localStorage.getItem(`${storageKeyPrefix}-docked-width`);
      if (savedW) {
        const parsed = parseInt(savedW, 10);
        if (!isNaN(parsed)) {
          setWidth(Math.min(Math.max(parsed, minWidth), 450));
        }
      }
    } catch {
      // Ignore storage error
    }
  }, [storageKeyPrefix, minWidth]);

  useEffect(() => {
    onWidthChange?.(listOpen ? width : 0);
    // Notify MapLibre / Canvas instances so they resize smoothly to the new flex container bounds
    if (typeof window !== 'undefined') {
      const id = window.setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 30);
      return () => window.clearTimeout(id);
    }
  }, [width, listOpen, onWidthChange]);

  // Resizing Docked Left List Sidebar
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(defaultWidth);

  const handleMouseDownResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      startXRef.current = e.clientX;
      startWRef.current = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const delta = moveEvent.clientX - startXRef.current;
        const nextW = Math.min(Math.max(startWRef.current + delta, minWidth), 450);
        setWidth(nextW);
      };

      const handleMouseUp = () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          try {
            localStorage.setItem(`${storageKeyPrefix}-docked-width`, String(width));
          } catch {
            // Ignore
          }
          window.dispatchEvent(new Event('resize'));
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [width, storageKeyPrefix, minWidth]
  );

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden bg-surface">
      {/* ===================================================================== */}
      {/* THANH NGANG PHÍA TRÊN 1 DÒNG GỌN GÀNG (SINGLE-ROW TOP BAR NGOÀI MAP) */}
      {/* ===================================================================== */}
      <div className="shrink-0 border-b border-border bg-surface-elevated/70 px-2 py-1.5 space-y-1.5 z-30 relative">
        {/* Main Single-Row Horizontal Control Bar */}
        <div className="flex items-center justify-between gap-1.5 flex-nowrap">
          {/* Left cluster: Toggle List Sidebar + Search + Compact Category/Sort Controls */}
          <div className="flex items-center gap-1.5 flex-nowrap flex-1 min-w-0">
            <button
              type="button"
              onClick={handleToggleList}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 whitespace-nowrap ${
                listOpen
                  ? 'bg-primary text-white border-primary shadow-2xs'
                  : 'bg-surface hover:bg-surface-elevated text-foreground border-border'
              }`}
              title={`${listOpen ? 'Ẩn' : 'Hiện'} ${title}`}
            >
              <span>📋</span>
              <span className="hidden 2xl:inline">Danh sách</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  listOpen ? 'bg-white/20 text-white' : 'bg-primary/15 text-primary'
                }`}
              >
                {rosterCount}
              </span>
              <span className="text-[9px] opacity-85">{listOpen ? '◀' : '▶'}</span>
            </button>

            {/* Compact Search Input */}
            <div className="w-32 sm:w-40 md:w-44 shrink-0">
              {searchBar}
            </div>

            {/* Category Pills + Viewport Sync + Starred + Group-by */}
            {rosterFilterControls && (
              <div className="flex items-center gap-1 flex-nowrap shrink-0">
                {rosterFilterControls}
              </div>
            )}
          </div>

          {/* Right cluster: Level-1/Level-2 Menus + Detailed Filter Popover Button + Extra Actions */}
          <div className="flex items-center gap-1 flex-nowrap shrink-0">
            {quickChips && (
              <div className="flex items-center gap-1 flex-nowrap">
                {quickChips}
              </div>
            )}

            {/* Detailed Filter Popover Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={onToggleFilters}
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap ${
                  filtersOpen || activeFilterCount > 0
                    ? 'bg-primary/15 text-primary border-primary/40'
                    : 'bg-surface hover:bg-surface-elevated text-foreground border-border'
                }`}
                title="Mở bảng bộ lọc điều tra chi tiết"
              >
                <span>⚙️</span>
                <span className="hidden md:inline">Lọc</span>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-white">
                    {activeFilterCount}
                  </span>
                )}
                <span className="text-[9px] opacity-75">{filtersOpen ? '▲' : '▼'}</span>
              </button>

              {/* Detailed Filter Popover Dropdown */}
              {filtersOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={onToggleFilters}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-[340px] sm:w-[400px] max-h-[72vh] bg-surface border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden text-xs">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-elevated/80 shrink-0">
                      <span className="font-semibold text-foreground">
                        ⚙️ {t('title')} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {activeFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={onClearFilters}
                            className="text-[11px] text-red-500 hover:underline font-medium"
                          >
                            {t('clearAll')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onToggleFilters}
                          className="px-1.5 py-0.5 rounded hover:bg-surface text-muted hover:text-foreground"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      {filterDrawer}
                    </div>
                    <div className="px-3 py-2 border-t border-border bg-surface-elevated/60 flex items-center justify-between shrink-0">
                      <span className="text-[11px] text-muted">
                        Kết quả khớp: <strong>{rosterCount}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={onToggleFilters}
                        className="px-3 py-1 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onClearFilters}
                className="px-1.5 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
                title={t('clearAll')}
              >
                ✕
              </button>
            )}

            {extraHeaderActions}
          </div>
        </div>

        {/* Secondary strip for Active Filter Badges / Active Tool Forms / Selected Item Inspector */}
        {activeBadges && (
          <div className="empty:hidden">
            {activeBadges}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* KHUNG CHÍNH BÊN DƯỚI: [SIDEBAR DANH SÁCH TRÁI] + [BẢN ĐỒ / SƠ ĐỒ PHẢI] */}
      {/* ===================================================================== */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* CỘT SIDEBAR DANH SÁCH CỐ ĐỊNH BÊN TRÁI (NGOÀI BẢN ĐỒ, CHỈ THUẦN LIST) */}
        {listOpen && (
          <aside
            style={{ width: `${width}px` }}
            className="relative shrink-0 h-full border-r border-border bg-surface flex flex-col overflow-hidden text-xs select-none z-10"
          >
            {/* Minimal Pure-List Header */}
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border bg-surface-elevated/50 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">
                  📋 Danh sách
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold text-[10px] shrink-0">
                  {rosterCount}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleList}
                className="px-1.5 py-0.5 rounded text-[11px] font-medium text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
                title="Thu gọn cột danh sách (mở rộng bản đồ 100%)"
              >
                ◀ Ẩn
              </button>
            </div>

            {/* 100% Pure Scrollable List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {rosterContent}
            </div>

            {/* Right edge drag handle for resizing the Docked Sidebar */}
            <div
              onMouseDown={handleMouseDownResize}
              className="absolute top-0 right-0 bottom-0 w-1.5 hover:w-2 hover:bg-primary/50 cursor-col-resize transition-all z-20 group"
              title="Kéo để chỉnh độ rộng cột danh sách"
            >
              <div className="absolute top-1/2 -translate-y-1/2 right-0.5 w-1 h-6 rounded-full bg-border group-hover:bg-primary" />
            </div>
          </aside>
        )}

        {/* KHUNG BẢN ĐỒ / SƠ ĐỒ ĐỘC LẬP 100% BÊN PHẢI */}
        <div className="flex-1 relative min-w-0 h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
