import NavigationSkeleton from '@/components/NavigationSkeleton';
import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function GangDetailsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSkeleton currentPath="/gangs" />
      <PageLoadingSkeleton variant="detail" />
    </div>
  );
}
