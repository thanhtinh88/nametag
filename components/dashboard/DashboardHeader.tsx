import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

interface DashboardHeaderProps {
  userName: string;
  greetingKey: string;
}

export default async function DashboardHeader({
  userName,
  greetingKey,
}: DashboardHeaderProps) {
  const t = await getTranslations('dashboard');

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-6 border-b border-border">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🛡️</span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
        </div>
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">
            {t(greetingKey, { name: userName })}
          </span>
          {' — '}
          {t('subtitle')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/people/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-primary hover:bg-primary-dark text-on-primary transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>{t('actions.newPerson')}</span>
        </Link>

        <Link
          href="/events/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-surface border border-border hover:bg-surface-elevated text-foreground transition-colors shadow-sm"
        >
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <span>{t('actions.newEvent')}</span>
        </Link>

        <Link
          href="/journal/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-surface border border-border hover:bg-surface-elevated text-foreground transition-colors shadow-sm"
        >
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>{t('actions.newJournal')}</span>
        </Link>

        <Link
          href="/gangs/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-surface border border-border hover:bg-surface-elevated text-foreground transition-colors shadow-sm"
        >
          <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>{t('actions.newGang')}</span>
        </Link>
      </div>
    </div>
  );
}

