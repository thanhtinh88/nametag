import { cookies } from 'next/headers';
import * as jose from 'jose';
import {
  BACKEND_INTERNAL_URL,
  COOKIE_ACCESS_TOKEN,
} from './constants';
import { logger } from '@/lib/logger';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  photo?: string | null;
  [key: string]: unknown;
}

export interface SessionResult {
  user: UserSession;
}

export type Session = SessionResult;

let jwksRemote: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwksRemote) {
    const jwksUrl = new URL('/.well-known/jwks.json', BACKEND_INTERNAL_URL);
    jwksRemote = jose.createRemoteJWKSet(jwksUrl, {
      cacheMaxAge: 10 * 60 * 1000, // 10 minutes cache
      cooldownDuration: 30 * 1000,  // 30 seconds cooldown
    });
  }
  return jwksRemote;
}

/**
 * Validates the current JWT from httpOnly cookie and returns the authenticated user session.
 * Used in Server Components and Route Handlers as a drop-in replacement for auth().
 */
export async function getSession(): Promise<SessionResult | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;

    if (!token) {
      return null;
    }

    const JWKS = getJwks();
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: 'nametag-api',
      audience: 'nametag-app',
    });

    if (!payload.sub || !payload.email) {
      return null;
    }

    return {
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        name: (payload.name as string) || '',
        surname: (payload.surname as string) || null,
        nickname: (payload.nickname as string) || null,
        photo: (payload.photo as string) || null,
      },
    };
  } catch (error) {
    logger.debug({ error }, 'Failed to verify session token');
    return null;
  }
}

export const auth = getSession;


