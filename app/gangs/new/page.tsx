import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import GangForm from '@/components/GangForm';
import { getTranslations } from 'next-intl/server';

export default async function NewGangPage() {
  const session = await auth();
  const t = await getTranslations('gangs');

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/gangs"
      />

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/gangs"
                className="text-xs text-muted hover:text-foreground font-medium mb-1 inline-block"
              >
                {t('backToGangs')}
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <span>🏴</span>
                <span>{t('createNewGang')}</span>
              </h1>
            </div>
          </div>

          <GangForm mode="create" />
        </div>
      </main>
    </div>
  );
}

