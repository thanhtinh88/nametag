import { prisma } from '@/lib/prisma';
import { createEventSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';
import { createEvent, eventDetailsInclude } from '@/lib/services/event';

// GET /api/events - List events for the current user
export const GET = withAuth(async (request, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const categoryParam = searchParams.get('category');
    const personIdParam = searchParams.get('personId');
    const groupIdParam = searchParams.get('groupId');
    const q = searchParams.get('q');

    const events = await prisma.event.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        ...(statusParam && ['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(statusParam)
          ? { status: statusParam as 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' }
          : {}),
        ...(categoryParam ? { category: categoryParam } : {}),
        ...(personIdParam
          ? {
              people: {
                some: {
                  personId: personIdParam,
                  deletedAt: null,
                  person: { deletedAt: null },
                },
              },
            }
          : {}),
        ...(groupIdParam
          ? {
              groups: {
                some: {
                  groupId: groupIdParam,
                },
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: eventDetailsInclude(),
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    return apiResponse.ok({ events });
  } catch (error) {
    return handleApiError(error, 'events-list');
  }
});

// POST /api/events - Create a new event
export const POST = withAuth(async (request, session) => {
  try {
    const body = await parseRequestBody(request);
    const validation = validateRequest(createEventSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const event = await createEvent(session.user.id, validation.data);
    return apiResponse.created({ event });
  } catch (error) {
    return handleApiError(error, 'events-create');
  }
});

