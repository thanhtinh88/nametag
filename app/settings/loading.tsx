import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-36 bg-surface-elevated rounded" />
      <div className="h-4 w-64 bg-surface-elevated/60 rounded" />
      <div className="h-64 bg-surface border border-border rounded-xl mt-4" />
    </div>
  );
}

