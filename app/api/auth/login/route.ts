import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_INTERNAL_URL } from '@/lib/backend/constants';
import { attachAuthCookies } from '@/lib/backend/cookies';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const backendUrl = new URL('/api/auth/login', BACKEND_INTERNAL_URL).toString();
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': clientIp,
        'user-agent': userAgent,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data?.error || 'Authentication failed' },
        { status: backendResponse.status }
      );
    }

    const { accessToken, refreshToken, user } = data;

    const response = NextResponse.json({ user }, { status: 200 });
    attachAuthCookies(response.headers, accessToken, refreshToken);
    return response;
  } catch (error) {
    logger.error({ error }, 'Error in login route');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

