import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import {
  getImmichConfig,
  isValidImmichId,
  listAssetsForAlbum,
  listAssetsForPerson,
} from '@/lib/immich/client';
import { immichErrorResponse, notConfiguredResponse } from '@/lib/immich/route-helpers';

// GET /api/immich/assets?personId=...|albumId=... - Asset list for the gallery
export const GET = withAuth(async (request, session) => {
  try {
    const params = new URL(request.url).searchParams;
    const personId = params.get('personId');
    const albumId = params.get('albumId');

    if (personId && !isValidImmichId(personId)) return apiResponse.error('Invalid personId');
    if (albumId && !isValidImmichId(albumId)) return apiResponse.error('Invalid albumId');
    if (!personId && !albumId) return apiResponse.error('personId or albumId is required');

    const config = await getImmichConfig(session.user.id);
    if (!config) return notConfiguredResponse();

    const [personAssets, albumAssets] = await Promise.all([
      personId ? listAssetsForPerson(config, personId) : Promise.resolve([]),
      albumId ? listAssetsForAlbum(config, albumId) : Promise.resolve([]),
    ]);

    // Merge and de-duplicate (a photo can be both in the album and face-tagged)
    const seen = new Set<string>();
    const assets = [...personAssets, ...albumAssets].filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
    assets.sort((a, b) => (b.takenAt ?? '').localeCompare(a.takenAt ?? ''));

    return apiResponse.ok({ assets, publicUrl: config.publicUrl ?? config.serverUrl });
  } catch (error) {
    return immichErrorResponse(error) ?? handleApiError(error, 'immich-assets');
  }
});

