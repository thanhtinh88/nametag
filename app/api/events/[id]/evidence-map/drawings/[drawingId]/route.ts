import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/validations';
import {
  apiResponse,
  handleApiError,
  parseRequestBody,
  withAuth,
} from '@/lib/api-utils';
import {
  serializeDrawing,
  updateDrawingSchema,
  verifyEventOwnership,
} from '@/lib/services/evidence-map';

// PUT /api/events/[id]/evidence-map/drawings/[drawingId]
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id: eventId, drawingId } = await context.params;

    const event = await verifyEventOwnership(eventId, session.user.id);
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const existing = await prisma.eventMapDrawing.findFirst({
      where: { id: drawingId, eventId },
    });
    if (!existing) {
      return apiResponse.notFound('Drawing not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(updateDrawingSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    const updated = await prisma.eventMapDrawing.update({
      where: { id: drawingId },
      data: {
        ...(data.drawingType !== undefined && { drawingType: data.drawingType }),
        ...(data.label !== undefined && { label: data.label || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.strokeColor !== undefined && { strokeColor: data.strokeColor }),
        ...(data.strokeWidth !== undefined && { strokeWidth: data.strokeWidth }),
        ...(data.strokeStyle !== undefined && { strokeStyle: data.strokeStyle }),
        ...(data.fillColor !== undefined && { fillColor: data.fillColor || null }),
        ...(data.fillOpacity !== undefined && { fillOpacity: data.fillOpacity }),
        ...(data.coordinates !== undefined && { coordinates: data.coordinates }),
        ...(data.radiusMeters !== undefined && { radiusMeters: data.radiusMeters }),
      },
    });

    return apiResponse.ok({ drawing: serializeDrawing(updated) });
  } catch (error) {
    return handleApiError(error, 'evidence-map-drawing-update');
  }
});

// DELETE /api/events/[id]/evidence-map/drawings/[drawingId]
export const DELETE = withAuth(async (_request, session, context) => {
  try {
    const { id: eventId, drawingId } = await context.params;

    const event = await verifyEventOwnership(eventId, session.user.id);
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const existing = await prisma.eventMapDrawing.findFirst({
      where: { id: drawingId, eventId },
    });
    if (!existing) {
      return apiResponse.notFound('Drawing not found');
    }

    await prisma.eventMapDrawing.delete({
      where: { id: drawingId },
    });

    return apiResponse.ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, 'evidence-map-drawing-delete');
  }
});

