import NavigationSkeleton from '@/components/NavigationSkeleton';
import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function RelationshipTypesLoading() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSkeleton currentPath="/relationship-types" />
      <PageLoadingSkeleton variant="list" />
    </div>
  );
}
