'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const tValidation = useTranslations('validation');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if registration is enabled
  useEffect(() => {
    async function checkRegistrationStatus() {
      try {
        const response = await fetch('/api/auth/registration-status');
        const data = await response.json();
        setRegistrationEnabled(data.enabled !== false);
      } catch {
        setRegistrationEnabled(true);
      } finally {
        setCheckingStatus(false);
      }
    }
    checkRegistrationStatus();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setValidationErrors([]);

    if (password !== confirmPassword) {
      setError(tValidation('passwordsDoNotMatch'));
      return;
    }

    // Client-side password validation
    if (password.length < 8) {
      setError(tErrors('password.tooShort', { min: '8' }));
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError(tErrors('password.requiresUppercase'));
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError(tErrors('password.requiresLowercase'));
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError(tErrors('password.requiresNumber'));
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError(tErrors('password.requiresSpecial'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, surname, nickname }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          setValidationErrors(data.details);
        }
        setError(data.error || tErrors('server.internalError'));
        return;
      }

      // Successful registration sets auth cookies automatically
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(tErrors('server.networkError'));
    } finally {
      setIsLoading(false);
    }
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-muted">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  if (!registrationEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex flex-col items-center">
            <Image
              src="/logo.svg"
              alt="Nametag Logo"
              width={192}
              height={192}
              priority
            />
            <h2 className="mt-6 text-3xl font-bold text-foreground">
              {t('registrationDisabledTitle')}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {t('registrationDisabledMessage')}
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary-dark"
            >
              {t('returnToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
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
            {t('createAccountTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            {t('createAccountSubtitle')}
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-surface border border-border rounded-lg p-8" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-warning/10 border border-warning/30 text-warning px-4 py-3 rounded-lg">
              <p>{error}</p>
              {validationErrors.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm">
                  {validationErrors.map((err, index) => (
                    <li key={index}>{err.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">
                {tCommon('name')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-border placeholder-muted text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="surname" className="sr-only">
                {t('surname')}
              </label>
              <input
                id="surname"
                name="surname"
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-border placeholder-muted text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('surnamePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="nickname" className="sr-only">
                {t('nickname')}
              </label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-border placeholder-muted text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('nicknamePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
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
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-border placeholder-muted text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('emailAddress')}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="sr-only">
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-border placeholder-muted text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('password')}
              />
              <PasswordStrengthIndicator password={password} showRequirements={true} />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                {t('confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-border placeholder-muted text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('confirmPasswordPlaceholder')}
              />
            </div>
          </div>

          <div>
            <Button type="submit" disabled={isLoading} fullWidth>
              {isLoading ? t('creatingAccount') : t('signUp')}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted">
              {t('alreadyHaveAccount')}{' '}
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary-dark"
              >
                {t('signIn')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
