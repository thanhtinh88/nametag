import { NextRequest, NextResponse } from 'next/server';
import {
  BACKEND_INTERNAL_URL,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
} from '@/lib/backend/constants';
import { attachClearAuthCookies } from '@/lib/backend/cookies';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
    const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value;

    const backendUrl = new URL('/api/auth/logout', BACKEND_INTERNAL_URL).toString();
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (accessToken) {
      headers['authorization'] = `Bearer ${accessToken}`;
    }

    // Call backend to revoke refreshToken and jti
    await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken: refreshToken || '' }),
    }).catch((err) => {
      logger.warn({ err }, 'Failed to notify .NET backend on logout');
    });

    const response = NextResponse.json({ success: true }, { status: 200 });
    attachClearAuthCookies(response.headers);
    return response;
  } catch (error) {
    logger.error({ error }, 'Error in logout route');
    const response = NextResponse.json({ success: true }, { status: 200 });
    attachClearAuthCookies(response.headers);
    return response;
  }
}

