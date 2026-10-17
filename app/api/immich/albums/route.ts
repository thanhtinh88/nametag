import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import { getImmichConfig, listImmichAlbums } from '@/lib/immich/client';
import { immichErrorResponse, notConfiguredResponse } from '@/lib/immich/route-helpers';

// GET /api/immich/albums - Immich albums for the album picker
export const GET = withAuth(async (_request, session) => {
  try {
    const config = await getImmichConfig(session.user.id);
    if (!config) return notConfiguredResponse();
    const albums = await listImmichAlbums(config);
    return apiResponse.ok({ albums });
  } catch (error) {
    return immichErrorResponse(error) ?? handleApiError(error, 'immich-albums');
  }
});

