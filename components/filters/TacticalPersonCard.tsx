'use client';

import React from 'react';
import Link from 'next/link';
import type { PersonTacticalData } from '@/lib/filters/person-filter-types';

export interface TacticalPersonCardProps {
  id: string;
  name: string;
  photoUrl?: string | null;
  hasPhoto?: boolean;
  color?: string | null;
  tacticalData?: PersonTacticalData;
  subtitle?: string | null;
  onFocus?: () => void;
  focusTitle?: string;
  detailsHref?: string;
  detailsTitle?: string;
  isSelected?: boolean;
  isCompact?: boolean;
  gangs?: Array<{ id: string; name: string }>;
}

export default function TacticalPersonCard({
  id,
  name,
  photoUrl,
  hasPhoto,
  color = '#3b82f6',
  tacticalData,
  subtitle,
  onFocus,
  focusTitle = 'Định vị',
  detailsHref = `/people/${id}`,
  detailsTitle = 'Xem chi tiết',
  isSelected = false,
  isCompact = false,
  gangs = [],
}: TacticalPersonCardProps) {
  const mgmt = tacticalData?.managementLevel;
  const threat = tacticalData?.threatLevel;
  const residence = tacticalData?.residenceStatus;
  const charges = tacticalData?.criminalRecordCharges;
  const hasRecord = tacticalData?.hasCriminalRecord;
  const hasSuspiciousCar = tacticalData?.hasSuspiciousVehicle;
  const hasMule = tacticalData?.hasMuleAccount;
  const gangIds = tacticalData?.gangIds || [];

  // Find gang names
  const matchedGangs = gangs.filter((g) => gangIds.includes(g.id));

  return (
    <div
      className={`group relative rounded-xl border transition-all text-xs overflow-hidden ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-sm'
          : 'border-border/60 bg-surface hover:bg-surface-elevated hover:border-border'
      } ${isCompact ? 'p-2' : 'p-2.5'}`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left: Avatar & Main info */}
        <button
          type="button"
          onClick={onFocus}
          className="min-w-0 flex-1 text-left flex items-start gap-2.5 cursor-pointer"
          title={focusTitle}
        >
          {/* Avatar with group color border */}
          <div className="relative shrink-0">
            {photoUrl || hasPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl || `/api/photos/${id}`}
                alt=""
                className="w-8 h-8 rounded-full object-cover border-2 shadow-xs bg-surface-elevated"
                style={{ borderColor: color || '#3b82f6' }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[11px] shadow-xs"
                style={{ backgroundColor: color || '#3b82f6' }}
              >
                {name ? name.slice(0, 1).toUpperCase() : '?'}
              </div>
            )}
            {/* Online/Threat indicator dot */}
            {threat === 'ARMED_DANGEROUS' && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-600 border-2 border-surface animate-pulse" />
            )}
          </div>

          {/* Subject textual summary */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-xs truncate max-w-[180px]">
                {name}
              </span>

              {/* Management Level Pill */}
              {mgmt === 'KEY_TARGET' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                  TRỌNG ĐIỂM
                </span>
              )}
              {mgmt === 'SURVEILLANCE' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  GIÁM SÁT
                </span>
              )}

              {/* Threat Level */}
              {threat === 'ARMED_DANGEROUS' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white">
                  VŨ KHÍ
                </span>
              )}
              {threat === 'HIGH' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-orange-500/15 text-orange-600 dark:text-orange-400">
                  NGUY HIỂM
                </span>
              )}
            </div>

            {/* Subtitle / Location / Residence */}
            {subtitle ? (
              <div className="text-[11px] text-muted truncate mt-0.5">
                {subtitle}
              </div>
            ) : (
              residence && residence !== 'PERMANENT' && (
                <div className="text-[10px] text-muted truncate mt-0.5">
                  Tình trạng: {residence === 'WANTED' ? '🚨 TRUY NÃ' : residence === 'TEMPORARY' ? 'Tạm trú' : residence}
                </div>
              )
            )}

            {/* Additional tactical badges (expanded mode) */}
            {!isCompact && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[10px]">
                {/* Gang membership */}
                {matchedGangs.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <span>👥</span>
                    <span className="truncate max-w-[120px]">{matchedGangs[0].name}</span>
                  </span>
                )}

                {/* Criminal Record */}
                {hasRecord && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <span>⚖️</span>
                    <span>{charges && charges.length > 0 ? charges[0] : 'Tiền án'}</span>
                  </span>
                )}

                {/* Suspicious Vehicle */}
                {hasSuspiciousCar && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    <span>🚗 Xe nghi vấn</span>
                  </span>
                )}

                {/* Mule Bank Account */}
                {hasMule && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    <span>💳 TK nghi vấn</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </button>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {onFocus && (
            <button
              type="button"
              onClick={onFocus}
              className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-elevated transition-colors"
              title={focusTitle}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" strokeWidth="2" />
                <path strokeWidth="2" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              </svg>
            </button>
          )}

          <Link
            href={detailsHref}
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
            title={detailsTitle}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

