import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import PersonAvatar from '@/components/PersonPhoto';
import { formatDate, type DateFormat } from '@/lib/date-format';

interface CasePerson {
  person: {
    id: string;
    name: string;
    surname?: string | null;
    nickname?: string | null;
    photo?: string | null;
  };
}

export interface PriorityCaseItem {
  id: string;
  title: string;
  caseCode?: string | null;
  crimeType?: string | null;
  caseStatus?: string | null;
  status: string;
  startDate?: Date | null;
  updatedAt: Date;
  people: CasePerson[];
}

interface PriorityCasesListProps {
  cases: PriorityCaseItem[];
  totalCount: number;
  dateFormat: DateFormat;
}

const CASE_STATUS_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  UNRESOLVED: {
    badge: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
    dot: 'bg-red-500',
    label: 'Chưa rõ đối tượng',
  },
  INVESTIGATING: {
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    dot: 'bg-amber-500',
    label: 'Đang xác minh',
  },
  SOLVED: {
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    dot: 'bg-emerald-500',
    label: 'Đã làm rõ',
  },
  SUSPENDED: {
    badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    dot: 'bg-slate-400',
    label: 'Tạm đình chỉ',
  },
};

export default async function PriorityCasesList({
  cases,
  totalCount,
  dateFormat,
}: PriorityCasesListProps) {
  const t = await getTranslations('dashboard');
  const tEvents = await getTranslations('events');

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">📁</span>
          <h2 className="text-base font-bold text-foreground">
            {t('priorityCases.title')}
          </h2>
        </div>
        <Link
          href="/events"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          {t('priorityCases.viewAll', { count: totalCount })}
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">
          {t('priorityCases.noCases')}
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((cs) => {
            const st = (cs.caseStatus || 'UNRESOLVED').toUpperCase();
            const statusConfig = CASE_STATUS_STYLES[st] || CASE_STATUS_STYLES.UNRESOLVED;
            const participants = cs.people || [];

            return (
              <Link
                key={cs.id}
                href={`/events/${cs.id}`}
                className="group block p-3.5 bg-surface-elevated/60 hover:bg-surface-elevated active:scale-[0.99] active:opacity-75 rounded-lg border border-border/80 transition-all hover:border-primary/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {cs.caseCode && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                        {cs.caseCode}
                      </span>
                    )}
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                      {cs.title}
                    </span>
                    {cs.crimeType && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-surface border border-border text-muted">
                        {cs.crimeType}
                      </span>
                    )}
                  </div>

                  <span className={`self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                    <span>{statusConfig.label}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-border/40 mt-2">
                  <div className="flex items-center gap-2">
                    {participants.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {participants.slice(0, 4).map((p) => {
                            const personName = [p.person.surname, p.person.name].filter(Boolean).join(' ') || p.person.name;
                            return (
                              <div key={p.person.id} className="inline-block ring-2 ring-surface rounded-full" title={personName}>
                                <PersonAvatar
                                  personId={p.person.id}
                                  name={personName}
                                  photo={p.person.photo}
                                  size={22}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <span className="text-[11px]">
                          {tEvents('participantsCount', { count: participants.length })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] italic text-muted/80">
                        {t('priorityCases.unresolved')}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px]">
                    {t('priorityCases.updatedAt')}: {formatDate(new Date(cs.updatedAt), dateFormat)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
