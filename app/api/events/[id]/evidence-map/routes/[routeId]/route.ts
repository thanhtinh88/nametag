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
  serializeRoute,
  updateRouteSchema,
  verifyEventOwnership,
} from '@/lib/services/evidence-map';

// PUT /api/events/[id]/evidence-map/routes/[routeId]
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id: eventId, routeId } = await context.params;

    const event = await verifyEventOwnership(eventId, session.user.id);
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const existing = await prisma.eventMapRoute.findFirst({
      where: { id: routeId, eventId },
    });
    if (!existing) {
      return apiResponse.notFound('Route not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(updateRouteSchema, body);
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

    const updated = await prisma.eventMapRoute.update({
      where: { id: routeId },
      data: {
        ...(data.personId !== undefined && { personId: data.personId || null }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.routeType !== undefined && { routeType: data.routeType }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.waypoints !== undefined && { waypoints: data.waypoints }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: {
        person: { select: personSummarySelect },
      },
    });

    return apiResponse.ok({ route: serializeRoute(updated) });
  } catch (error) {
    return handleApiError(error, 'evidence-map-route-update');
  }
});

// DELETE /api/events/[id]/evidence-map/routes/[routeId]
export const DELETE = withAuth(async (_request, session, context) => {
  try {
    const { id: eventId, routeId } = await context.params;

    const event = await verifyEventOwnership(eventId, session.user.id);
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const existing = await prisma.eventMapRoute.findFirst({
      where: { id: routeId, eventId },
    });
    if (!existing) {
      return apiResponse.notFound('Route not found');
    }

    await prisma.eventMapRoute.delete({
      where: { id: routeId },
    });

    return apiResponse.ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, 'evidence-map-route-delete');
  }
});
