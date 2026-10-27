import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/validations';
import {
  apiResponse,
  handleApiError,
  parseRequestBody,
  withAuth,
} from '@/lib/api-utils';
import {
  createRouteSchema,
  personSummarySelect,
  serializeRoute,
  verifyEventOwnership,
} from '@/lib/services/evidence-map';

// POST /api/events/[id]/evidence-map/routes - Create a new trajectory/route
export const POST = withAuth(async (request, session, context) => {
  try {
    const { id: eventId } = await context.params;

    const event = await verifyEventOwnership(eventId, session.user.id);
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(createRouteSchema, body);
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

    const created = await prisma.eventMapRoute.create({
      data: {
        eventId,
        personId: data.personId || null,
        label: data.label,
        routeType: data.routeType,
        color: data.color,
        waypoints: data.waypoints,
        notes: data.notes || null,
      },
      include: {
        person: { select: personSummarySelect },
      },
    });

    return apiResponse.created({ route: serializeRoute(created) });
  } catch (error) {
    return handleApiError(error, 'evidence-map-route-create');
  }
});
