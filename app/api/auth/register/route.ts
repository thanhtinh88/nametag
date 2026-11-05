import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_INTERNAL_URL } from '@/lib/backend/constants';
import { attachAuthCookies } from '@/lib/backend/cookies';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, surname, nickname } = body || {};

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const backendUrl = new URL('/api/auth/register', BACKEND_INTERNAL_URL).toString();
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': clientIp,
        'user-agent': userAgent,
      },
      body: JSON.stringify({ email, password, name, surname, nickname }),
    });

    const data = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data?.error || 'Registration failed' },
        { status: backendResponse.status }
      );
    }

    const { accessToken, refreshToken, user } = data;

    const response = NextResponse.json({ user }, { status: 201 });
    attachAuthCookies(response.headers, accessToken, refreshToken);
    return response;
  } catch (error) {
    logger.error({ error }, 'Error in register route');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
