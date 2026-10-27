import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import {
  personSummarySelect,
  serializeDrawing,
  serializeMarker,
  serializeRoute,
  verifyEventOwnership,
} from '@/lib/services/evidence-map';

// GET /api/events/[id]/evidence-map - Fetch all markers, routes, and drawings for a case
export const GET = withAuth(async (_request, session, context) => {
  try {
    const { id: eventId } = await context.params;

    const event = await verifyEventOwnership(eventId, session.user.id);
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const [markers, routes, drawings] = await Promise.all([
      prisma.eventMapMarker.findMany({
        where: { eventId },
        include: { person: { select: personSummarySelect } },
        orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.eventMapRoute.findMany({
        where: { eventId },
        include: { person: { select: personSummarySelect } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.eventMapDrawing.findMany({
        where: { eventId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const addrWithCoords = event.addresses.find(
      (a) => a.latitude !== null && a.longitude !== null
    );
    const defaultCenter = addrWithCoords
      ? {
          latitude: Number(addrWithCoords.latitude),
          longitude: Number(addrWithCoords.longitude),
        }
      : null;

    return apiResponse.ok({
      markers: markers.map(serializeMarker),
      routes: routes.map(serializeRoute),
      drawings: drawings.map(serializeDrawing),
      defaultCenter,
    });
  } catch (error) {
    return handleApiError(error, 'evidence-map-get');
  }
});

