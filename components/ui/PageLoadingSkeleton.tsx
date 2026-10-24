import React from 'react';

interface PageLoadingSkeletonProps {
  variant?: 'dashboard' | 'list' | 'detail' | 'map' | 'settings';
}

export function PageLoadingSkeleton({ variant = 'list' }: PageLoadingSkeletonProps) {
  if (variant === 'dashboard') {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-pulse">
        <div className="px-4 sm:px-0 space-y-6">
          {/* Greeting Header */}
          <div className="flex items-center justify-between pb-2">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-surface-elevated rounded-lg" />
              <div className="h-4 w-40 bg-surface-elevated/70 rounded-md" />
            </div>
            <div className="h-9 w-28 bg-surface-elevated rounded-lg" />
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-surface-elevated rounded" />
                  <div className="h-8 w-8 rounded-lg bg-surface-elevated" />
                </div>
                <div className="h-8 w-16 bg-surface-elevated rounded-lg" />
                <div className="h-3 w-28 bg-surface-elevated/60 rounded" />
              </div>
            ))}
          </div>

          {/* 2 Big Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-xl p-6 h-72 shadow-xs space-y-4">
              <div className="h-5 w-36 bg-surface-elevated rounded" />
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-surface-elevated shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 bg-surface-elevated rounded" />
                      <div className="h-3 w-1/2 bg-surface-elevated/60 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6 h-72 shadow-xs space-y-4">
              <div className="h-5 w-40 bg-surface-elevated rounded" />
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-surface-elevated shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/5 bg-surface-elevated rounded" />
                      <div className="h-3 w-1/3 bg-surface-elevated/60 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (variant === 'detail') {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-pulse">
        <div className="px-4 sm:px-0 space-y-6">
          {/* Back link */}
          <div className="h-4 w-24 bg-surface-elevated rounded" />

          {/* Profile header */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-surface-elevated shrink-0" />
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div className="h-7 w-48 bg-surface-elevated rounded-lg" />
              <div className="h-4 w-32 bg-surface-elevated/70 rounded" />
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="h-6 w-20 bg-surface-elevated rounded-full" />
                <div className="h-6 w-24 bg-surface-elevated rounded-full" />
              </div>
            </div>
          </div>

          {/* Content sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-surface border border-border rounded-xl p-6 h-64 space-y-3">
                <div className="h-5 w-32 bg-surface-elevated rounded" />
                <div className="h-4 w-full bg-surface-elevated/50 rounded" />
                <div className="h-4 w-5/6 bg-surface-elevated/50 rounded" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-surface border border-border rounded-xl p-6 h-64 space-y-3">
                <div className="h-5 w-28 bg-surface-elevated rounded" />
                <div className="h-4 w-3/4 bg-surface-elevated/50 rounded" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (variant === 'map') {
    return (
      <main className="flex-1 flex flex-col animate-pulse min-h-[calc(100vh-65px)]">
        <div className="flex-1 bg-surface-elevated flex items-center justify-center">
          <div className="h-8 w-32 bg-surface/80 rounded-lg" />
        </div>
      </main>
    );
  }

  if (variant === 'settings') {
    return (
      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8 animate-pulse">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="h-8 w-48 bg-surface-elevated rounded-lg" />
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-64 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-surface-elevated rounded-lg" />
              ))}
            </div>
            <div className="flex-1 bg-surface border border-border rounded-xl p-6 h-96 space-y-4">
              <div className="h-6 w-40 bg-surface-elevated rounded" />
              <div className="h-4 w-60 bg-surface-elevated/60 rounded" />
              <div className="h-10 w-full bg-surface-elevated/40 rounded-lg mt-6" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Default: 'list' (People, Gangs, Events, Groups, Journal, Relationship Types)
  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-pulse">
      <div className="px-4 sm:px-0 space-y-6">
        {/* Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-44 bg-surface-elevated rounded-lg" />
            <div className="h-4 w-60 bg-surface-elevated/70 rounded" />
          </div>
          <div className="h-10 w-32 bg-surface-elevated rounded-lg" />
        </div>

        {/* Filter Chips / Search bar row */}
        <div className="flex items-center gap-3">
          <div className="h-10 flex-1 max-w-md bg-surface border border-border rounded-lg" />
          <div className="h-10 w-24 bg-surface-elevated rounded-lg" />
          <div className="h-10 w-24 bg-surface-elevated rounded-lg" />
        </div>

        {/* Items List Skeleton */}
        <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden shadow-xs">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-surface-elevated shrink-0" />
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="h-4 w-36 bg-surface-elevated rounded" />
                  <div className="h-3 w-48 bg-surface-elevated/60 rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-surface-elevated rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

