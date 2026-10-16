import { prisma } from '@/lib/prisma';
import {
  createEventRelationshipSchema,
  updateEventRelationshipSchema,
  validateRequest,
} from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';
import { sanitizeName, sanitizeNotes } from '@/lib/sanitize';

// POST /api/events/[id]/relationships - Link an event to another event
export const POST = withAuth(async (request, session, context) => {
  try {
    const { id: eventId } = await context.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(createEventRelationshipSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { relatedEventId, relationshipType, notes } = validation.data;

    if (relatedEventId === eventId) {
      return apiResponse.error('Cannot link an event to itself');
    }

    const relatedEvent = await prisma.event.findUnique({
      where: { id: relatedEventId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!relatedEvent) {
      return apiResponse.notFound('Related event not found');
    }

    const existing = await prisma.eventRelationship.findFirst({
      where: {
        OR: [
          { fromEventId: eventId, toEventId: relatedEventId, deletedAt: null },
          { fromEventId: relatedEventId, toEventId: eventId, deletedAt: null },
        ],
      },
    });
    if (existing) {
      return apiResponse.error('These events are already linked');
    }

    const relationship = await prisma.eventRelationship.create({
      data: {
        fromEventId: eventId,
        toEventId: relatedEventId,
        relationshipType: relationshipType ? sanitizeName(relationshipType) : null,
        notes: notes ? sanitizeNotes(notes) : null,
      },
      include: {
        toEvent: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    return apiResponse.created({ relationship });
  } catch (error) {
    return handleApiError(error, 'event-relationships-create');
  }
});

// PUT /api/events/[id]/relationships - Update an event relationship
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id: eventId } = await context.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(updateEventRelationshipSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { id, relationshipType, notes } = validation.data;

    const existing = await prisma.eventRelationship.findFirst({
      where: {
        id,
        OR: [{ fromEventId: eventId }, { toEventId: eventId }],
        deletedAt: null,
      },
    });
    if (!existing) {
      return apiResponse.notFound('Event relationship not found');
    }

    const relationship = await prisma.eventRelationship.update({
      where: { id },
      data: {
        relationshipType: relationshipType ? sanitizeName(relationshipType) : null,
        notes: notes ? sanitizeNotes(notes) : null,
      },
    });

    return apiResponse.ok({ relationship });
  } catch (error) {
    return handleApiError(error, 'event-relationships-update');
  }
});

// DELETE /api/events/[id]/relationships?relationshipId=... - Delete an event relationship
export const DELETE = withAuth(async (request, session, context) => {
  try {
    const { id: eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get('relationshipId');

    if (!relationshipId) {
      return apiResponse.error('relationshipId is required');
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const existing = await prisma.eventRelationship.findFirst({
      where: {
        id: relationshipId,
        OR: [{ fromEventId: eventId }, { toEventId: eventId }],
        deletedAt: null,
      },
    });
    if (!existing) {
      return apiResponse.notFound('Event relationship not found');
    }

    await prisma.eventRelationship.update({
      where: { id: relationshipId },
      data: { deletedAt: new Date() },
    });

    return apiResponse.ok({ message: 'Event relationship removed' });
  } catch (error) {
    return handleApiError(error, 'event-relationships-delete');
  }
});

