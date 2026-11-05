import { NextRequest, NextResponse } from 'next/server';
import {
  BACKEND_INTERNAL_URL,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
} from '@/lib/backend/constants';
import { attachAuthCookies } from '@/lib/backend/cookies';
import { logger } from '@/lib/logger';

async function handleProxy(request: NextRequest): Promise<Response> {
  const { pathname, search } = request.nextUrl;
  const targetUrl = new URL(`${pathname}${search}`, BACKEND_INTERNAL_URL);

  const forwardHeaders = new Headers();
  const hopByHopHeaders = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'host',
    'cookie',
  ]);

  request.headers.forEach((value, key) => {
    if (!hopByHopHeaders.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });

  // Attach Bearer token from httpOnly cookie if not already set
  const accessToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  if (accessToken && !forwardHeaders.has('authorization')) {
    forwardHeaders.set('authorization', `Bearer ${accessToken}`);
  }

  // Forward request ID and client IP
  forwardHeaders.set('x-forwarded-for', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1');

  const fetchOptions: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers: forwardHeaders,
    redirect: 'manual',
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = request.body;
    fetchOptions.duplex = 'half';
  }

  try {
    let backendResponse = await fetch(targetUrl.toString(), fetchOptions);

    // If 401 Unauthorized, try refreshing access token with refresh token cookie
    const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
    if (backendResponse.status === 401 && refreshToken) {
      try {
        const refreshResponse = await fetch(new URL('/api/auth/refresh', BACKEND_INTERNAL_URL).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData.accessToken;
          const newRefreshToken = refreshData.refreshToken;

          // Retry original request with new token
          forwardHeaders.set('authorization', `Bearer ${newAccessToken}`);
          backendResponse = await fetch(targetUrl.toString(), {
            ...fetchOptions,
            headers: forwardHeaders,
          });

          const response = new Response(backendResponse.body, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: backendResponse.headers,
          });

          // Update cookies in response
          attachAuthCookies(response.headers, newAccessToken, newRefreshToken);

          return response;
        }
      } catch (err) {
        logger.warn({ err }, 'Failed automatic token refresh during proxy call');
      }
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: backendResponse.headers,
    });
  } catch (error) {
    logger.error({ error, path: pathname }, 'Proxy request to .NET backend failed');
    return NextResponse.json(
      { error: 'Backend service unavailable', path: pathname },
      { status: 503 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const HEAD = handleProxy;
export const OPTIONS = handleProxy;

