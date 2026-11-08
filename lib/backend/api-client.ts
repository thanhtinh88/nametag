import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  BACKEND_INTERNAL_URL,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
} from './constants';

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

export interface ApiServerOptions extends RequestInit {
  autoNotFound?: boolean;
  autoRedirect?: boolean;
}

/**
 * Server-side API client for React Server Components and Server Actions.
 * Automatically injects the Authorization: Bearer token from the incoming request cookies.
 * Handles 401 by redirecting to /login and 404 by triggering notFound().
 */
export async function apiServer<T>(
  endpoint: string,
  options: ApiServerOptions = {}
): Promise<T> {
  const { autoNotFound = true, autoRedirect = true, ...fetchOptions } = options;

  let token: string | undefined;
  let refreshToken: string | undefined;

  try {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;
    refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
  } catch {
    // cookies() might fail outside request context
  }

  if (!token && !refreshToken && autoRedirect) {
    redirect('/login');
  }

  const url = `${BACKEND_INTERNAL_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(fetchOptions.headers || {});
  headers.set('Accept', 'application/json');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (fetchOptions.body && !headers.has('Content-Type') && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    cache: fetchOptions.cache || 'no-store',
  });

  if (response.status === 401) {
    if (autoRedirect) {
      redirect('/login');
    }
    throw new ApiError(401, 'Unauthorized');
  }

  if (response.status === 404) {
    if (autoNotFound) {
      notFound();
    }
    throw new ApiError(404, 'Resource not found');
  }

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

apiServer.get = <T>(endpoint: string, options: ApiServerOptions = {}): Promise<T> => {
  return apiServer<T>(endpoint, { ...options, method: 'GET' });
};

apiServer.post = <T>(
  endpoint: string,
  body?: unknown,
  options: ApiServerOptions = {}
): Promise<T> => {
  return apiServer<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
};

apiServer.put = <T>(
  endpoint: string,
  body?: unknown,
  options: ApiServerOptions = {}
): Promise<T> => {
  return apiServer<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
};

apiServer.patch = <T>(
  endpoint: string,
  body?: unknown,
  options: ApiServerOptions = {}
): Promise<T> => {
  return apiServer<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
};

apiServer.delete = <T>(endpoint: string, options: ApiServerOptions = {}): Promise<T> => {
  return apiServer<T>(endpoint, { ...options, method: 'DELETE' });
};

export default apiServer;
