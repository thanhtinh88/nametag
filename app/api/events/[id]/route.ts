import { prisma } from '@/lib/prisma';
import { updateEventSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';
import { deleteEvent, eventDetailsInclude, updateEvent } from '@/lib/services/event';

// GET /api/events/[id] - Get a single event
export const GET = withAuth(async (_request, session, context) => {
  try {
    const { id } = await context.params;

    const event = await prisma.event.findUnique({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      include: eventDetailsInclude(),
    });

    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    return apiResponse.ok({ event });
  } catch (error) {
    return handleApiError(error, 'events-get');
  }
});

// PUT /api/events/[id] - Update an event
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id } = await context.params;
    const body = await parseRequestBody(request);
    const validation = validateRequest(updateEventSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const event = await updateEvent(id, session.user.id, validation.data);

    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    return apiResponse.ok({ event });
  } catch (error) {
    return handleApiError(error, 'events-update');
  }
});

// DELETE /api/events/[id] - Soft-delete an event
export const DELETE = withAuth(async (_request, session, context) => {
  try {
    const { id } = await context.params;

    const deleted = await deleteEvent(id, session.user.id);
    if (!deleted) {
      return apiResponse.notFound('Event not found');
    }

    return apiResponse.ok({ message: 'Event deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'events-delete');
  }
});

