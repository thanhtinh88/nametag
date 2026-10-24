import Image from 'next/image';

interface NavigationSkeletonProps {
  currentPath?: string;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/people', label: 'People' },
  { href: '/gangs', label: 'Gangs' },
  { href: '/events', label: 'Events' },
  { href: '/groups', label: 'Groups' },
  { href: '/map', label: 'Map' },
  { href: '/journal', label: 'Journal' },
  { href: '/relationship-types', label: 'Relationship Types' },
];

export default function NavigationSkeleton({ currentPath }: NavigationSkeletonProps) {
  const isActive = (href: string) => {
    if (!currentPath) return false;
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  return (
    <nav className="relative bg-surface border-b border-border pt-[env(safe-area-inset-top)] pointer-events-none select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="relative z-30 flex items-center justify-between h-16">
          <div className="flex items-center shrink-0 z-10">
            <Image
              src="/logo.svg"
              alt="Nametag Logo"
              width={64}
              height={64}
              className="text-foreground"
              priority
            />
          </div>

          {/* Desktop search skeleton */}
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 w-full max-w-md lg:max-w-lg px-20 lg:px-24">
            <div className="h-9 w-full bg-surface-elevated/70 rounded-lg border border-border/50" />
          </div>

          {/* Right section: user avatar skeleton */}
          <div className="flex items-center space-x-1 sm:space-x-2 z-10">
            <div className="w-8 h-8 rounded-full bg-surface-elevated animate-pulse" />
          </div>
        </div>

        {/* Separator between rows */}
        <div className="hidden md:block border-t border-border" />

        {/* Bottom row: Nav items tab bar */}
        <div className="hidden md:flex items-center justify-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <div key={item.href} className="relative">
                <div
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                    active ? 'text-primary' : 'text-muted'
                  }`}
                >
                  {item.label}
                </div>
                {active && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

