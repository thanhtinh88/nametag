import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import PersonAvatar from '@/components/PersonPhoto';

export interface ProminentGangItem {
  id: string;
  name: string;
  turf: string | null;
  color: string | null;
  members: {
    person: {
      id: string;
      name: string;
      surname?: string | null;
      photo?: string | null;
    };
  }[];
}

interface ProminentGangsWidgetProps {
  gangs: ProminentGangItem[];
  totalGangsCount: number;
}

export default async function ProminentGangsWidget({
  gangs,
  totalGangsCount,
}: ProminentGangsWidgetProps) {
  const t = await getTranslations('dashboard');

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <h2 className="text-base font-bold text-foreground">
            {t('gangs.title')}
          </h2>
        </div>
        <Link
          href="/gangs"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          {t('gangs.viewAll', { count: totalGangsCount })}
        </Link>
      </div>

      {gangs.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted">
          {t('gangs.noGangs')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {gangs.map((gang) => {
            const memberCount = gang.members.length;

            return (
              <Link
                key={gang.id}
                href={`/gangs/${gang.id}`}
                className="block p-3 bg-surface-elevated/60 hover:bg-surface-elevated active:scale-[0.99] active:opacity-75 rounded-lg border border-border/80 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: gang.color || '#C4552A' }}
                    />
                    <span className="text-xs font-bold text-foreground truncate">
                      {gang.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-muted shrink-0">
                    {memberCount} {t('gangs.members')}
                  </span>
                </div>

                {gang.turf && (
                  <div className="text-[11px] text-muted flex items-center gap-1 mb-2">
                    <span>📍</span>
                    <span className="truncate">{gang.turf}</span>
                  </div>
                )}

                {gang.members.length > 0 && (
                  <div className="flex -space-x-1.5 overflow-hidden pt-1 border-t border-border/30">
                    {gang.members.slice(0, 5).map((m) => {
                      const personName = [m.person.surname, m.person.name].filter(Boolean).join(' ') || m.person.name;
                      return (
                        <div key={m.person.id} className="inline-block ring-2 ring-surface rounded-full" title={personName}>
                          <PersonAvatar
                            personId={m.person.id}
                            name={personName}
                            photo={m.person.photo}
                            size={20}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

