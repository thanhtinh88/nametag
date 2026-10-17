import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/crypto/secrets';

/**
 * Server-side Immich client.
 *
 * The Immich URL and API key live per-user in `ImmichConnection` (configured
 * in Settings → Immich). The API key is stored encrypted and NEVER sent to the
 * browser: every image/video request goes through Nametag's own
 * `/api/immich/...` proxy routes, which attach `x-api-key` server-side.
 */

export interface ImmichConfig {
  serverUrl: string;
  publicUrl: string | null;
  apiKey: string;
}

export interface ImmichAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO' | string;
  originalFileName: string | null;
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  camera: string | null;
}

export interface ImmichPersonSummary {
  id: string;
  name: string;
}

export interface ImmichAlbumSummary {
  id: string;
  albumName: string;
  assetCount: number;
}

export class ImmichError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
    this.name = 'ImmichError';
  }
}

const REQUEST_TIMEOUT_MS = 15000;
// Immich ids are UUIDs; accept a slightly looser charset but never slashes,
// dots, or query characters so they cannot alter the proxied path.
const IMMICH_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export function isValidImmichId(id: unknown): id is string {
  return typeof id === 'string' && IMMICH_ID_PATTERN.test(id);
}

/** Strips trailing slashes and a trailing `/api` so callers can paste either form. */
export function normalizeImmichUrl(url: string): string {
  let out = url.trim().replace(/\/+$/, '');
  if (out.toLowerCase().endsWith('/api')) out = out.slice(0, -4);
  return out;
}

/** Loads the user's Immich connection, or null when not configured / disabled. */
export async function getImmichConfig(userId: string): Promise<ImmichConfig | null> {
  const connection = await prisma.immichConnection.findUnique({
    where: { userId },
    select: { serverUrl: true, publicUrl: true, apiKey: true, enabled: true },
  });
  if (!connection || !connection.enabled) return null;
  try {
    return {
      serverUrl: normalizeImmichUrl(connection.serverUrl),
      publicUrl: connection.publicUrl ? normalizeImmichUrl(connection.publicUrl) : null,
      apiKey: decryptSecret(connection.apiKey),
    };
  } catch {
    // NEXTAUTH_SECRET rotated or the value is corrupt: treat as unconfigured.
    return null;
  }
}

/** Low-level fetch against the Immich API with the API key attached. */
export async function immichFetch(
  config: ImmichConfig,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = new Headers(init.headers);
    headers.set('x-api-key', config.apiKey);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    return await fetch(`${config.serverUrl}/api${path}`, {
      ...init,
      headers,
      signal: controller.signal,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ImmichError('Immich server timed out', 504);
    }
    throw new ImmichError('Could not reach Immich server', 502);
  } finally {
    clearTimeout(timer);
  }
}

async function immichJson<T>(config: ImmichConfig, path: string, init?: RequestInit): Promise<T> {
  const response = await immichFetch(config, path, init);
  if (response.status === 401 || response.status === 403) {
    throw new ImmichError('Immich rejected the API key', 401);
  }
  if (!response.ok) {
    throw new ImmichError(`Immich responded with HTTP ${response.status}`, response.status === 404 ? 404 : 502);
  }
  return (await response.json()) as T;
}

/** Validates URL + key. Returns the Immich user and server version. */
export async function testImmichConnection(
  config: ImmichConfig,
): Promise<{ userName: string; email: string; version: string | null }> {
  const me = await immichJson<{ name?: string; email?: string }>(config, '/users/me');
  let version: string | null = null;
  try {
    const about = await immichJson<{ version?: string }>(config, '/server/about');
    version = about.version ?? null;
  } catch {
    // /server/about needs a "server.about" permission on scoped keys; optional.
  }
  return { userName: me.name ?? '', email: me.email ?? '', version };
}

interface RawImmichAsset {
  id: string;
  type?: string;
  originalFileName?: string;
  fileCreatedAt?: string;
  localDateTime?: string;
  exifInfo?: {
    latitude?: number | null;
    longitude?: number | null;
    city?: string | null;
    country?: string | null;
    make?: string | null;
    model?: string | null;
    dateTimeOriginal?: string | null;
  } | null;
}

export function mapImmichAsset(raw: RawImmichAsset): ImmichAsset {
  const exif = raw.exifInfo ?? {};
  const camera = [exif.make, exif.model].filter(Boolean).join(' ').trim();
  return {
    id: raw.id,
    type: raw.type ?? 'IMAGE',
    originalFileName: raw.originalFileName ?? null,
    takenAt: exif.dateTimeOriginal ?? raw.localDateTime ?? raw.fileCreatedAt ?? null,
    latitude: typeof exif.latitude === 'number' ? exif.latitude : null,
    longitude: typeof exif.longitude === 'number' ? exif.longitude : null,
    city: exif.city ?? null,
    country: exif.country ?? null,
    camera: camera || null,
  };
}

/** Lists named (and unnamed) face clusters, optionally filtered by name. */
export async function listImmichPeople(config: ImmichConfig, query?: string): Promise<ImmichPersonSummary[]> {
  const q = query?.trim();
  if (q) {
    const results = await immichJson<Array<{ id: string; name?: string }>>(
      config,
      `/search/person?name=${encodeURIComponent(q)}&withHidden=false`,
    );
    return results.map((p) => ({ id: p.id, name: p.name ?? '' }));
  }
  const data = await immichJson<{ people?: Array<{ id: string; name?: string }> } | Array<{ id: string; name?: string }>>(
    config,
    '/people?withHidden=false&size=500',
  );
  const people = Array.isArray(data) ? data : data.people ?? [];
  return people.map((p) => ({ id: p.id, name: p.name ?? '' }));
}

export async function listImmichAlbums(config: ImmichConfig): Promise<ImmichAlbumSummary[]> {
  const albums = await immichJson<Array<{ id: string; albumName?: string; assetCount?: number }>>(config, '/albums');
  return albums
    .map((a) => ({ id: a.id, albumName: a.albumName ?? '', assetCount: a.assetCount ?? 0 }))
    .sort((a, b) => a.albumName.localeCompare(b.albumName));
}

const MAX_ASSETS = 200;

/** Assets in which Immich's face recognition found the given person. */
export async function listAssetsForPerson(config: ImmichConfig, personId: string): Promise<ImmichAsset[]> {
  const data = await immichJson<{ assets?: { items?: RawImmichAsset[] } }>(config, '/search/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personIds: [personId], size: MAX_ASSETS, withExif: true, order: 'desc' }),
  });
  return (data.assets?.items ?? []).map(mapImmichAsset);
}

/** Assets in an album (crime-scene / CCTV evidence, subject dossiers). */
export async function listAssetsForAlbum(config: ImmichConfig, albumId: string): Promise<ImmichAsset[]> {
  const album = await immichJson<{ assets?: RawImmichAsset[] }>(config, `/albums/${albumId}?withoutAssets=false`);
  if (album.assets && album.assets.length > 0) {
    return album.assets.slice(0, MAX_ASSETS).map(mapImmichAsset);
  }
  // Newer Immich versions may omit album assets; fall back to metadata search.
  const data = await immichJson<{ assets?: { items?: RawImmichAsset[] } }>(config, '/search/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ albumIds: [albumId], size: MAX_ASSETS, withExif: true, order: 'desc' }),
  });
  return (data.assets?.items ?? []).map(mapImmichAsset);
}

