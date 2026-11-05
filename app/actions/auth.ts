'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  BACKEND_INTERNAL_URL,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
} from '@/lib/backend/constants';
import { logger } from '@/lib/logger';

export async function handleSignOut() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;
  const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

  try {
    const backendUrl = new URL('/api/auth/logout', BACKEND_INTERNAL_URL).toString();
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (accessToken) {
      headers['authorization'] = `Bearer ${accessToken}`;
    }

    await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken: refreshToken || '' }),
    }).catch((err) => {
      logger.warn({ err }, 'Failed to notify .NET backend on server action logout');
    });
  } catch (err) {
    logger.error({ err }, 'Error during logout');
  }

  cookieStore.delete(COOKIE_ACCESS_TOKEN);
  cookieStore.delete(COOKIE_REFRESH_TOKEN);

  redirect('/login');
}
