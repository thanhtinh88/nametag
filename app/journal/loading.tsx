import NavigationSkeleton from '@/components/NavigationSkeleton';
import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function JournalLoading() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSkeleton currentPath="/journal" />
      <PageLoadingSkeleton variant="list" />
    </div>
  );
}
