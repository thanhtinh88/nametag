'use client';

import React from 'react';

export interface TacticalSectionExpanderProps {
  title: string;
  icon?: React.ReactNode;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  badgeColor?: string;
  children: React.ReactNode;
  emptyMessage?: string;
}

export default function TacticalSectionExpander({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  badgeColor = 'bg-primary/15 text-primary',
  children,
  emptyMessage = 'Không có dữ liệu',
}: TacticalSectionExpanderProps) {
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-xs font-semibold text-foreground cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-sm shrink-0">{icon}</span>}
          <span className="truncate uppercase tracking-wider text-[11px] font-bold text-foreground">
            {title}
          </span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${badgeColor}`}>
            {count}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-muted transition-transform duration-200 shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-2 space-y-1.5 bg-surface/20 animate-in fade-in duration-150">
          {count === 0 ? (
            <p className="px-1.5 py-2 text-muted italic text-[11px] text-center">
              {emptyMessage}
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
