/**
 * Auth module compatibility shim.
 * Forwards to the RS256 JWKS-based session validator in lib/backend/session.ts.
 */
export { getSession, auth } from '@/lib/backend/session';
export type { UserSession, SessionResult, Session } from '@/lib/backend/session';
