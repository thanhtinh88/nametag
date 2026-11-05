export const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080';

export const COOKIE_ACCESS_TOKEN = 'nt_at';
export const COOKIE_REFRESH_TOKEN = 'nt_rt';

// Access token lifetime: 15 minutes
export const ACCESS_TOKEN_MAX_AGE = 15 * 60;

// Refresh token lifetime: 30 days
export const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

