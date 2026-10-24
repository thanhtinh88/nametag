import NavigationSkeleton from '@/components/NavigationSkeleton';
import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function EventsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSkeleton currentPath="/events" />
      <PageLoadingSkeleton variant="list" />
    </div>
  );
}
