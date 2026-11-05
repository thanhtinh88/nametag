import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from './constants';

export interface CookieOptions {
  accessToken: string;
  refreshToken?: string;
}

export function buildAccessTokenCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${COOKIE_ACCESS_TOKEN}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ACCESS_TOKEN_MAX_AGE}${isProd ? '; Secure' : ''}`;
}

export function buildRefreshTokenCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${COOKIE_REFRESH_TOKEN}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${REFRESH_TOKEN_MAX_AGE}${isProd ? '; Secure' : ''}`;
}

export function buildClearAccessTokenCookie(): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${COOKIE_ACCESS_TOKEN}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`;
}

export function buildClearRefreshTokenCookie(): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${COOKIE_REFRESH_TOKEN}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`;
}

export function attachAuthCookies(
  headers: Headers,
  accessToken: string,
  refreshToken?: string
): void {
  headers.append('Set-Cookie', buildAccessTokenCookie(accessToken));
  if (refreshToken) {
    headers.append('Set-Cookie', buildRefreshTokenCookie(refreshToken));
  }
}

export function attachClearAuthCookies(headers: Headers): void {
  headers.append('Set-Cookie', buildClearAccessTokenCookie());
  headers.append('Set-Cookie', buildClearRefreshTokenCookie());
}

