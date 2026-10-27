import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/validations';
import {
  apiResponse,
  handleApiError,
  parseRequestBody,
  withAuth,
} from '@/lib/api-utils';
import {
  createDrawingSchema,
  serializeDrawing,
  verifyEventOwnership,
} from '@/lib/services/evidence-map';

// POST /api/events/[id]/evidence-map/drawings - Create a new tactical drawing / shape / pencil stroke
export const POST = withAuth(async (request, session, context) => {
  try {
    const { id: eventId } = await context.params;

    const event = await verifyEventOwnership(eventId, session.user.id);
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(createDrawingSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    const created = await prisma.eventMapDrawing.create({
      data: {
        eventId,
        drawingType: data.drawingType,
        label: data.label || null,
        notes: data.notes || null,
        strokeColor: data.strokeColor,
        strokeWidth: data.strokeWidth,
        strokeStyle: data.strokeStyle,
        fillColor: data.fillColor || data.strokeColor,
        fillOpacity: data.fillOpacity,
        coordinates: data.coordinates,
        radiusMeters: data.radiusMeters ?? null,
      },
    });

    return apiResponse.created({ drawing: serializeDrawing(created) });
  } catch (error) {
    return handleApiError(error, 'evidence-map-drawing-create');
  }
});

