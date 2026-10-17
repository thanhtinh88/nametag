import { NextResponse } from 'next/server';
import { apiResponse } from '@/lib/api-utils';
import { ImmichError, immichFetch, type ImmichConfig } from './client';

/** Uniform JSON error for Immich failures in route handlers. */
export function immichErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ImmichError) {
    return apiResponse.error(error.message, error.status);
  }
  return null;
}

export const IMMICH_NOT_CONFIGURED = 'IMMICH_NOT_CONFIGURED';

export function notConfiguredResponse(): NextResponse {
  return NextResponse.json({ error: IMMICH_NOT_CONFIGURED }, { status: 409 });
}

const PASSTHROUGH_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];

/**
 * Streams a binary Immich response (thumbnail, original, video) back to the
 * browser without buffering, forwarding Range for video seeking.
 */
export async function proxyImmichBinary(
  config: ImmichConfig,
  path: string,
  request: Request,
  cacheSeconds: number,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: '*/*' };
  const range = request.headers.get('range');
  if (range) headers.Range = range;

  let upstream: Response;
  try {
    upstream = await immichFetch(config, path, { headers });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
  }

  const out = new Headers();
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  out.set('Cache-Control', `private, max-age=${cacheSeconds}`);
  out.set('X-Content-Type-Options', 'nosniff');

  return new NextResponse(upstream.body, { status: upstream.status, headers: out });
}

