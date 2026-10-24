import NavigationSkeleton from '@/components/NavigationSkeleton';
import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function MapLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationSkeleton currentPath="/map" />
      <PageLoadingSkeleton variant="map" />
    </div>
  );
}
