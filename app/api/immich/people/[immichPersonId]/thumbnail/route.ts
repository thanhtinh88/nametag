import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getImmichConfig, isValidImmichId } from '@/lib/immich/client';
import { proxyImmichBinary } from '@/lib/immich/route-helpers';

// GET /api/immich/people/[immichPersonId]/thumbnail - Face thumbnail proxy
export const GET = withAuth(async (request, session, context) => {
  const { immichPersonId } = await context.params;
  if (!isValidImmichId(immichPersonId)) return new NextResponse(null, { status: 400 });
  const config = await getImmichConfig(session.user.id);
  if (!config) return new NextResponse(null, { status: 409 });
  return proxyImmichBinary(config, `/people/${immichPersonId}/thumbnail`, request, 3600);
});

