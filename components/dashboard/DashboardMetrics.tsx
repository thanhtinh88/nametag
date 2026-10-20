import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

interface DashboardMetricsProps {
  totalPeople: number;
  convictedPeople: number;
  recentPeopleMonth: number;
  totalCases: number;
  activeCases: number;
  unresolvedCases: number;
  totalGangs: number;
  turfsCount: number;
  totalJournalEntries: number;
  recentJournalMonth: number;
}

export default async function DashboardMetrics({
  totalPeople,
  convictedPeople,
  recentPeopleMonth,
  totalCases,
  activeCases,
  unresolvedCases,
  totalGangs,
  turfsCount,
  totalJournalEntries,
  recentJournalMonth,
}: DashboardMetricsProps) {
  const t = await getTranslations('dashboard');

  const cards = [
    {
      title: t('metrics.peopleTitle'),
      value: totalPeople,
      subtitle: t('metrics.peopleSubtitle', {
        convicted: convictedPeople,
        recent: recentPeopleMonth,
      }),
      href: '/people',
      icon: (
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      badgeColor: 'bg-primary/10 text-primary border-primary/20',
      accentColor: 'border-l-4 border-l-primary',
    },
    {
      title: t('metrics.casesTitle'),
      value: totalCases,
      subtitle: t('metrics.casesSubtitle', {
        unresolved: unresolvedCases,
        ongoing: activeCases,
      }),
      href: '/events',
      icon: (
        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badgeColor: 'bg-accent/10 text-accent border-accent/20',
      accentColor: 'border-l-4 border-l-accent',
    },
    {
      title: t('metrics.gangsTitle'),
      value: totalGangs,
      subtitle: t('metrics.gangsSubtitle', {
        turfs: turfsCount,
      }),
      href: '/gangs',
      icon: (
        <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badgeColor: 'bg-warning/10 text-warning border-warning/20',
      accentColor: 'border-l-4 border-l-warning',
    },
    {
      title: t('metrics.journalTitle'),
      value: totalJournalEntries,
      subtitle: t('metrics.journalSubtitle', {
        recent: recentJournalMonth,
      }),
      href: '/journal',
      icon: (
        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      accentColor: 'border-l-4 border-l-emerald-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <Link
          key={idx}
          href={card.href}
          className={`p-4 bg-surface rounded-xl border border-border hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between ${card.accentColor}`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              {card.title}
            </span>
            <div className={`p-2 rounded-lg border ${card.badgeColor}`}>
              {card.icon}
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {card.value}
            </div>
            <div className="text-xs text-muted mt-1 truncate">
              {card.subtitle}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
