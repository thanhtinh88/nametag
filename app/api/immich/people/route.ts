import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import { getImmichConfig, listImmichPeople } from '@/lib/immich/client';
import { immichErrorResponse, notConfiguredResponse } from '@/lib/immich/route-helpers';

// GET /api/immich/people?q= - Immich face clusters for the person picker
export const GET = withAuth(async (request, session) => {
  try {
    const config = await getImmichConfig(session.user.id);
    if (!config) return notConfiguredResponse();
    const q = new URL(request.url).searchParams.get('q') ?? undefined;
    const people = await listImmichPeople(config, q);
    return apiResponse.ok({ people });
  } catch (error) {
    return immichErrorResponse(error) ?? handleApiError(error, 'immich-people');
  }
});

