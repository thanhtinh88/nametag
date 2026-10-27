import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/validations';
import {
  apiResponse,
  handleApiError,
  parseRequestBody,
  withAuth,
} from '@/lib/api-utils';
import {
  createMarkerSchema,
  personSummarySelect,
  serializeMarker,
  verifyEventOwnership,
} from '@/lib/services/evidence-map';

const MAX_MARKER_PAYLOAD = 4 * 1024 * 1024; // 4MB for thumbnail base64 / data URI

// POST /api/events/[id]/evidence-map/markers - Create a new marker on the case map
export const POST = withAuth(async (request, session, context) => {
  try {
    const { id: eventId } = await context.params;

    const event = await verifyEventOwnership(eventId, session.user.id);
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const body = await parseRequestBody(request, MAX_MARKER_PAYLOAD);
    const validation = validateRequest(createMarkerSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // Verify optional personId belongs to the same user
    if (data.personId) {
      const person = await prisma.person.findFirst({
        where: { id: data.personId, userId: session.user.id, deletedAt: null },
        select: { id: true },
      });
      if (!person) {
        return apiResponse.error('Invalid personId');
      }
    }

    const created = await prisma.eventMapMarker.create({
      data: {
        eventId,
        personId: data.personId || null,
        markerType: data.markerType,
        label: data.label,
        description: data.description || null,
        latitude: data.latitude,
        longitude: data.longitude,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : null,
        color: data.color || null,
        mediaUrl: data.mediaUrl || null,
        mediaType: data.mediaType || 'IMAGE',
        cameraDirection: data.cameraDirection ?? null,
        cameraFovDeg: data.cameraFovDeg ?? 60,
        cameraStatus: data.cameraStatus ?? 'CAPTURED',
        rawTimeNote: data.rawTimeNote || null,
        btsCode: data.btsCode || null,
        btsCarrier: data.btsCarrier || null,
        btsRadiusMeters: data.btsRadiusMeters ?? 300,
        btsAzimuthDeg: data.btsAzimuthDeg ?? null,
        subscriberInfo: data.subscriberInfo || null,
      },
      include: {
        person: { select: personSummarySelect },
      },
    });

    return apiResponse.created({ marker: serializeMarker(created) });
  } catch (error) {
    return handleApiError(error, 'evidence-map-marker-create');
  }
});
