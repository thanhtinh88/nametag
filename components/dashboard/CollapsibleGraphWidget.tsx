'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import UnifiedNetworkGraph from '@/components/UnifiedNetworkGraph';
import GraphFilterHelpModal from '@/components/GraphFilterHelpModal';

interface GroupOption {
  id: string;
  name: string;
  color: string | null;
}

interface CaseOption {
  id: string;
  title: string;
  status: string;
}

interface CustomFieldTemplateOption {
  id: string;
  name: string;
  slug: string;
  type?: string;
  options?: string[];
}

interface CollapsibleGraphWidgetProps {
  groups: GroupOption[];
  events: CaseOption[];
  customFieldTemplates: CustomFieldTemplateOption[];
  graphMode?: 'individuals' | 'bubbles' | null;
  peopleCount: number;
  casesCount: number;
}

export default function CollapsibleGraphWidget({
  groups,
  events,
  customFieldTemplates,
  graphMode,
  peopleCount,
  casesCount,
}: CollapsibleGraphWidgetProps) {
  const t = useTranslations('dashboard');
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Widget Header */}
      <div className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border bg-surface-elevated/30">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌐</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                {t('graphWidget.title')}
              </h2>
              <GraphFilterHelpModal />
            </div>
            <p className="text-xs text-muted">
              {t('graphWidget.subtitle', {
                people: peopleCount,
                events: casesCount,
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-surface-elevated text-foreground transition-colors shadow-2xs"
          >
            <span>🗺️</span>
            <span>{t('graphWidget.openMap')}</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-surface-elevated text-foreground transition-colors shadow-2xs"
          >
            {isExpanded ? (
              <>
                <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span>{t('graphWidget.collapse')}</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>{t('graphWidget.expand')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Graph Canvas */}
      {isExpanded ? (
        <div className="p-4 sm:p-6">
          <UnifiedNetworkGraph
            apiEndpoint="/api/dashboard/graph"
            groups={groups}
            events={events}
            customFieldTemplates={customFieldTemplates}
            centerNodeNonClickable={true}
            graphMode={graphMode}
          />
        </div>
      ) : (
        <div className="p-8 text-center bg-surface-elevated/20">
          <p className="text-xs text-muted mb-3">
            Đồ thị đang thu gọn để tối ưu hiệu năng hiển thị và tải trang.
          </p>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-dark text-on-primary transition-colors shadow-sm"
          >
            <span>{t('graphWidget.expand')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
