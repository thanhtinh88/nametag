import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  BACKEND_INTERNAL_URL,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
} from '@/lib/backend/constants';
import {
  attachAuthCookies,
  attachClearAuthCookies,
  buildAccessTokenCookie,
} from '@/lib/backend/cookies';
import { logger } from '@/lib/logger';

function getJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const startTime = Date.now();
  const { pathname, search } = request.nextUrl;
  const method = request.method;
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';

  let response = NextResponse.next();
  response.headers.set('x-request-id', crypto.randomUUID());

  // Proactive token refresh for page/SSR requests
  const isApiRoute = pathname.startsWith('/api/');
  const accessToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value;

  if (!isApiRoute && refreshToken) {
    let shouldRefresh = false;
    if (!accessToken) {
      shouldRefresh = true;
    } else {
      const exp = getJwtExp(accessToken);
      const nowSeconds = Math.floor(Date.now() / 1000);
      // Refresh if expired or expiring within 60 seconds
      if (!exp || exp - nowSeconds <= 60) {
        shouldRefresh = true;
      }
    }

    if (shouldRefresh) {
      try {
        const refreshUrl = new URL('/api/auth/refresh', BACKEND_INTERNAL_URL).toString();
        const refreshRes = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': ip,
            'user-agent': userAgent,
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const newAccessToken = data.accessToken;
          const newRefreshToken = data.refreshToken;

          // Attach cookies to outgoing response
          attachAuthCookies(response.headers, newAccessToken, newRefreshToken);

          // Also forward the new token in request cookie for current SSR render
          request.cookies.set(COOKIE_ACCESS_TOKEN, newAccessToken);
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          attachAuthCookies(response.headers, newAccessToken, newRefreshToken);
        } else {
          // Refresh token invalid or expired -> clear cookies
          attachClearAuthCookies(response.headers);
        }
      } catch (err) {
        logger.warn({ err }, 'Background proactive token refresh failed');
      }
    }
  }

  // Log after response (this runs on every request)
  const duration = Date.now() - startTime;

  if (process.env.NODE_ENV === 'development') {
    logger.info({
      method,
      path: pathname,
      query: search,
      ip,
      userAgent,
      durationMs: duration,
    }, `${method} ${pathname}${search}`);
  }

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * But DO match API routes and public assets to log them
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

