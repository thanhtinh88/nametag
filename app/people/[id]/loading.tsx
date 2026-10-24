import NavigationSkeleton from '@/components/NavigationSkeleton';
import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function PersonDetailsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSkeleton currentPath="/people" />
      <PageLoadingSkeleton variant="detail" />
    </div>
  );
}
