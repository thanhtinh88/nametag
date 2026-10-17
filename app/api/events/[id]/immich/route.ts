import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';
import { eventImmichLinkSchema, validateRequest } from '@/lib/validations';
import { immichErrorResponse } from '@/lib/immich/route-helpers';

/**
 * PUT /api/events/[id]/immich
 * Update a case/event's linked Immich album ID.
 */
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id } = await context.params;
    const event = await prisma.event.findFirst({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!event) {
      return apiResponse.notFound('Event');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(eventImmichLinkSchema, body);
    if (!validation.success) return validation.response;

    const validated = validation.data;

    const updated = await prisma.event.update({
      where: { id },
      data: {
        immichAlbumId:
          validated.immichAlbumId !== undefined
            ? validated.immichAlbumId || null
            : undefined,
      },
      select: {
        id: true,
        immichAlbumId: true,
      },
    });

    return apiResponse.ok(updated);
  } catch (error) {
    return immichErrorResponse(error) ?? handleApiError(error, 'event-immich-put');
  }
});
