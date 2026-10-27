import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/validations';
import {
  apiResponse,
  handleApiError,
  parseRequestBody,
  withAuth,
} from '@/lib/api-utils';
import {
  personSummarySelect,
  serializeMarker,
  updateMarkerSchema,
  verifyEventOwnership,
} from '@/lib/services/evidence-map';

const MAX_MARKER_PAYLOAD = 4 * 1024 * 1024;

// PUT /api/events/[id]/evidence-map/markers/[markerId]
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id: eventId, markerId } = await context.params;

    const event = await verifyEventOwnership(eventId, session.user.id);
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const existing = await prisma.eventMapMarker.findFirst({
      where: { id: markerId, eventId },
    });
    if (!existing) {
      return apiResponse.notFound('Marker not found');
    }

    const body = await parseRequestBody(request, MAX_MARKER_PAYLOAD);
    const validation = validateRequest(updateMarkerSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    if (data.personId) {
      const person = await prisma.person.findFirst({
        where: { id: data.personId, userId: session.user.id, deletedAt: null },
        select: { id: true },
      });
      if (!person) {
        return apiResponse.error('Invalid personId');
      }
    }

    const updated = await prisma.eventMapMarker.update({
      where: { id: markerId },
      data: {
        ...(data.markerType !== undefined && { markerType: data.markerType }),
        ...(data.personId !== undefined && { personId: data.personId || null }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.occurredAt !== undefined && {
          occurredAt: data.occurredAt ? new Date(data.occurredAt) : null,
        }),
        ...(data.color !== undefined && { color: data.color || null }),
        ...(data.mediaUrl !== undefined && { mediaUrl: data.mediaUrl || null }),
        ...(data.mediaType !== undefined && { mediaType: data.mediaType || 'IMAGE' }),
        ...(data.cameraDirection !== undefined && { cameraDirection: data.cameraDirection }),
        ...(data.cameraFovDeg !== undefined && { cameraFovDeg: data.cameraFovDeg }),
        ...(data.cameraStatus !== undefined && { cameraStatus: data.cameraStatus }),
        ...(data.rawTimeNote !== undefined && { rawTimeNote: data.rawTimeNote || null }),
        ...(data.btsCode !== undefined && { btsCode: data.btsCode || null }),
        ...(data.btsCarrier !== undefined && { btsCarrier: data.btsCarrier || null }),
        ...(data.btsRadiusMeters !== undefined && { btsRadiusMeters: data.btsRadiusMeters }),
        ...(data.btsAzimuthDeg !== undefined && { btsAzimuthDeg: data.btsAzimuthDeg }),
        ...(data.subscriberInfo !== undefined && { subscriberInfo: data.subscriberInfo || null }),
      },
      include: {
        person: { select: personSummarySelect },
      },
    });

    return apiResponse.ok({ marker: serializeMarker(updated) });
  } catch (error) {
    return handleApiError(error, 'evidence-map-marker-update');
  }
});

// DELETE /api/events/[id]/evidence-map/markers/[markerId]
export const DELETE = withAuth(async (_request, session, context) => {
  try {
    const { id: eventId, markerId } = await context.params;

    const event = await verifyEventOwnership(eventId, session.user.id);
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const existing = await prisma.eventMapMarker.findFirst({
      where: { id: markerId, eventId },
    });
    if (!existing) {
      return apiResponse.notFound('Marker not found');
    }

    await prisma.eventMapMarker.delete({
      where: { id: markerId },
    });

    return apiResponse.ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, 'evidence-map-marker-delete');
  }
});
