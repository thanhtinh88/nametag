import { cookies } from 'next/headers';
import { BACKEND_INTERNAL_URL, COOKIE_ACCESS_TOKEN } from './constants';

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Server-side API client for Server Components and Server Actions.
 * Automatically injects the Authorization: Bearer token from the incoming request cookies.
 */
export async function apiServer<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;

  const url = `${BACKEND_INTERNAL_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !headers.has('Content-Type') && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: options.cache || 'no-store',
  });

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    let errorData: unknown;
    try {
      errorData = await response.json();
      if (typeof errorData === 'object' && errorData !== null && 'error' in errorData) {
        errorMessage = String((errorData as { error: unknown }).error);
      }
    } catch {
      // Body not JSON
    }
    throw new ApiError(response.status, errorMessage, errorData);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json() as Promise<T>;
}

