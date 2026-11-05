'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 423) {
          setError(tErrors('auth.accountLocked'));
        } else {
          setError(data.error || tErrors('auth.invalidCredentials'));
        }
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError(tErrors('server.networkError'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <Image
            src="/logo.svg"
            alt="Nametag Logo"
            width={192}
            height={192}
            priority
          />
          <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
            {t('welcomeTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            {t('welcomeSubtitle')}
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-surface border border-border rounded-lg p-8" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-warning/10 border border-warning/30 text-warning px-4 py-3 rounded-lg">
              <p>{error}</p>
            </div>
          )}
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted mb-2">
                {t('emailAddress')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-border placeholder-muted text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted mb-2">
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-border placeholder-muted text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <Button type="submit" disabled={isLoading} fullWidth>
              {isLoading ? t('signingIn') : t('login')}
            </Button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted">
              {t('dontHaveAccount')}{' '}
              <Link
                href="/register"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                {t('register')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
