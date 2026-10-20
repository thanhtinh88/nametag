import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { formatDate, type DateFormat } from '@/lib/date-format';

interface JournalPerson {
  person: {
    id: string;
    name: string;
    surname?: string | null;
    nickname?: string | null;
  };
}

interface JournalEvent {
  event: {
    id: string;
    title: string;
  };
}

export interface RecentJournalItem {
  id: string;
  title: string;
  date: Date;
  body: string;
  people: JournalPerson[];
  events: JournalEvent[];
}

interface RecentJournalWidgetProps {
  entries: RecentJournalItem[];
  dateFormat: DateFormat;
}

export default async function RecentJournalWidget({
  entries,
  dateFormat,
}: RecentJournalWidgetProps) {
  const t = await getTranslations('dashboard');

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h2 className="text-base font-bold text-foreground">
            {t('recentJournal.title')}
          </h2>
        </div>
        <Link
          href="/journal"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          {t('recentJournal.viewAll')}
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">
          {t('recentJournal.noEntries')}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const snippet = entry.body.replace(/[#*`_~]/g, '').slice(0, 120);

            return (
              <div
                key={entry.id}
                className="p-3.5 bg-surface-elevated/40 hover:bg-surface-elevated rounded-lg border border-border/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <Link
                    href={`/journal#entry-${entry.id}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors text-sm"
                  >
                    {entry.title}
                  </Link>
                  <span className="text-[11px] text-muted whitespace-nowrap">
                    {formatDate(new Date(entry.date), dateFormat)}
                  </span>
                </div>

                {snippet && (
                  <p className="text-xs text-muted/90 line-clamp-2 mb-2 leading-relaxed">
                    {snippet}...
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
                  {entry.events.map((ev) => (
                    <Link
                      key={ev.event.id}
                      href={`/events/${ev.event.id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <span>📁</span>
                      <span className="truncate max-w-[150px]">{ev.event.title}</span>
                    </Link>
                  ))}

                  {entry.people.map((p) => {
                    const fullName = [p.person.surname, p.person.name].filter(Boolean).join(' ') || p.person.name;
                    return (
                      <Link
                        key={p.person.id}
                        href={`/people/${p.person.id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-surface border border-border text-foreground hover:bg-surface-elevated transition-colors"
                      >
                        <span>👤</span>
                        <span className="truncate max-w-[120px]">{fullName}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
