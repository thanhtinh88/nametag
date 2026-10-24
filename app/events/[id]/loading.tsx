import NavigationSkeleton from '@/components/NavigationSkeleton';
import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function EventDetailsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSkeleton currentPath="/events" />
      <PageLoadingSkeleton variant="detail" />
    </div>
  );
}
