'use client';

import React, { useState, useEffect } from 'react';
import {
  type InvestigationDatePreset,
  type InvestigationDateField,
  getDateRangeFromPreset,
} from '@/lib/investigation-dates';

interface InvestigationDateRangeFilterProps {
  fromDate?: string;
  toDate?: string;
  datePreset?: string;
  dateField?: string;
  onApply: (filters: {
    fromDate?: string;
    toDate?: string;
    datePreset?: string;
    dateField?: string;
  }) => void;
  onClear: () => void;
  className?: string;
}

const PRESETS: Array<{ id: InvestigationDatePreset; label: string; icon: string }> = [
  { id: 'today', label: 'Hôm nay', icon: '⚡' },
  { id: 'last_7_days', label: '7 ngày qua', icon: '📅' },
  { id: 'last_30_days', label: '30 ngày qua', icon: '🗓️' },
  { id: 'this_month', label: 'Tháng này', icon: '📆' },
  { id: 'this_year', label: 'Năm nay', icon: '📊' },
];

export default function InvestigationDateRangeFilter({
  fromDate = '',
  toDate = '',
  datePreset = '',
  dateField = 'startDate',
  onApply,
  onClear,
  className = '',
}: InvestigationDateRangeFilterProps) {
  const [localFrom, setLocalFrom] = useState(fromDate);
  const [localTo, setLocalTo] = useState(toDate);
  const [localField, setLocalField] = useState<InvestigationDateField>(
    dateField === 'createdAt' ? 'createdAt' : 'startDate'
  );
  const [showCustomInputs, setShowCustomInputs] = useState(Boolean(fromDate || toDate));

  useEffect(() => {
    setLocalFrom(fromDate);
    setLocalTo(toDate);
    if (fromDate || toDate) {
      setShowCustomInputs(true);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    setLocalField(dateField === 'createdAt' ? 'createdAt' : 'startDate');
  }, [dateField]);

  const handleSelectPreset = (presetId: InvestigationDatePreset) => {
    const range = getDateRangeFromPreset(presetId);
    if (range) {
      setLocalFrom(range.fromDate);
      setLocalTo(range.toDate);
      onApply({
        fromDate: range.fromDate,
        toDate: range.toDate,
        datePreset: presetId,
        dateField: localField,
      });
    }
  };

  const handleApplyCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localFrom && !localTo) {
      onClear();
      return;
    }
    onApply({
      fromDate: localFrom || undefined,
      toDate: localTo || undefined,
      datePreset: undefined, // Custom range resets preset
      dateField: localField,
    });
  };

  const handleFieldChange = (newField: InvestigationDateField) => {
    setLocalField(newField);
    if (localFrom || localTo) {
      onApply({
        fromDate: localFrom || undefined,
        toDate: localTo || undefined,
        datePreset: datePreset || undefined,
        dateField: newField,
      });
    }
  };

  const hasActiveDateFilter = Boolean(fromDate || toDate || datePreset);

  return (
    <div
      className={`bg-surface border border-border/80 rounded-lg p-3 text-xs space-y-2.5 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <span>⏱️</span>
          <span>Khoảng thời gian:</span>
          <select
            value={localField}
            onChange={(e) => handleFieldChange(e.target.value as InvestigationDateField)}
            className="ml-1 px-2 py-0.5 border border-border rounded bg-surface-elevated text-foreground text-xs font-normal"
          >
            <option value="startDate">Thời điểm xảy ra vụ việc</option>
            <option value="createdAt">Thời điểm thụ lý / tạo hồ sơ</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveDateFilter && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-0.5"
            >
              ✕ Bỏ lọc thời gian
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowCustomInputs(!showCustomInputs)}
            className="text-xs text-primary hover:underline"
          >
            {showCustomInputs ? 'Thu gọn ngày tuỳ chọn' : '⚙️ Tự chọn khoảng ngày'}
          </button>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (hasActiveDateFilter) onClear();
          }}
          className={`px-2.5 py-1 rounded-full transition-colors font-medium ${
            !hasActiveDateFilter
              ? 'bg-foreground text-background shadow-xs'
              : 'bg-surface-elevated text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          Toàn bộ thời gian
        </button>

        {PRESETS.map((p) => {
          const isActive = datePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={`px-2.5 py-1 rounded-full transition-colors font-medium flex items-center gap-1 ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-elevated text-muted-foreground hover:text-foreground border border-border hover:border-primary/50'
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Date Pickers */}
      {showCustomInputs && (
        <form
          onSubmit={handleApplyCustom}
          className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Từ ngày:</span>
            <input
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="px-2.5 py-1 border border-border rounded-md bg-surface-elevated text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Đến ngày:</span>
            <input
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              className="px-2.5 py-1 border border-border rounded-md bg-surface-elevated text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-3 py-1 bg-primary text-on-primary rounded-md font-medium text-xs hover:opacity-90 transition-opacity"
          >
            Áp dụng
          </button>
        </form>
      )}
    </div>
  );
}

