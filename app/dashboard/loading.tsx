import NavigationSkeleton from '@/components/NavigationSkeleton';
import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSkeleton currentPath="/dashboard" />
      <PageLoadingSkeleton variant="dashboard" />
    </div>
  );
}
