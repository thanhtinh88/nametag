import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import PersonAvatar from '@/components/PersonPhoto';
import { formatDate, type DateFormat } from '@/lib/date-format';

export interface RecentPersonItem {
  id: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  photo?: string | null;
  updatedAt: Date;
  criminalRecordsCount: number;
  gangName?: string | null;
}

interface RecentPeopleWidgetProps {
  people: RecentPersonItem[];
  totalCount: number;
  dateFormat: DateFormat;
}

export default async function RecentPeopleWidget({
  people,
  totalCount,
  dateFormat,
}: RecentPeopleWidgetProps) {
  const t = await getTranslations('dashboard');

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">👤</span>
          <h2 className="text-base font-bold text-foreground">
            {t('recentPeople.title')}
          </h2>
        </div>
        <Link
          href="/people"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          {t('recentPeople.viewAll', { count: totalCount })}
        </Link>
      </div>

      {people.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted">
          {t('recentPeople.noPeople')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {people.map((p) => {
            const fullName = [p.surname, p.name].filter(Boolean).join(' ') || p.name;

            return (
              <Link
                key={p.id}
                href={`/people/${p.id}`}
                className="flex items-center justify-between p-2.5 bg-surface-elevated/60 hover:bg-surface-elevated active:scale-[0.99] active:opacity-75 rounded-lg border border-border/80 transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PersonAvatar
                    personId={p.id}
                    name={fullName}
                    photo={p.photo}
                    size={32}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {fullName}
                      </span>
                      {p.nickname && (
                        <span className="text-[11px] text-muted italic">
                          ({p.nickname})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                      {p.gangName && (
                        <span className="text-warning font-medium truncate max-w-[120px]">
                          👥 {p.gangName}
                        </span>
                      )}
                      {p.criminalRecordsCount > 0 ? (
                        <span className="text-danger font-medium">
                          ⚠️ {t('recentPeople.records', { count: p.criminalRecordsCount })}
                        </span>
                      ) : (
                        <span>{t('recentPeople.noRecords')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-muted shrink-0 ml-2">
                  {formatDate(new Date(p.updatedAt), dateFormat)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

