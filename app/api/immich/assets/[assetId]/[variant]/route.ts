import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getImmichConfig, isValidImmichId } from '@/lib/immich/client';
import { proxyImmichBinary } from '@/lib/immich/route-helpers';

const VARIANTS: Record<string, { path: (id: string) => string; cache: number }> = {
  thumbnail: { path: (id) => `/assets/${id}/thumbnail?size=thumbnail`, cache: 86400 },
  preview: { path: (id) => `/assets/${id}/thumbnail?size=preview`, cache: 86400 },
  original: { path: (id) => `/assets/${id}/original`, cache: 3600 },
  video: { path: (id) => `/assets/${id}/video/playback`, cache: 3600 },
};

// GET /api/immich/assets/[assetId]/[variant] - Streams thumbnail | preview | original | video
export const GET = withAuth(async (request, session, context) => {
  const { assetId, variant } = await context.params;
  const spec = VARIANTS[variant];
  if (!spec || !isValidImmichId(assetId)) return new NextResponse(null, { status: 400 });

  const config = await getImmichConfig(session.user.id);
  if (!config) return new NextResponse(null, { status: 409 });

  return proxyImmichBinary(config, spec.path(assetId), request, spec.cache);
});

