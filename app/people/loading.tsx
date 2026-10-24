import NavigationSkeleton from '@/components/NavigationSkeleton';
import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function PeopleLoading() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSkeleton currentPath="/people" />
      <PageLoadingSkeleton variant="list" />
    </div>
  );
}
