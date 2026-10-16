import { prisma } from '@/lib/prisma';
import { createPersonEventSchema, updatePersonEventSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';
import { sanitizeName, sanitizeNotes } from '@/lib/sanitize';

// POST /api/events/[id]/people - Add a person to an event
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
    const validation = validateRequest(createPersonEventSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { personId, role, notes } = validation.data;

    const person = await prisma.person.findUnique({
      where: { id: personId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const existing = await prisma.personEvent.findFirst({
      where: {
        eventId,
        personId,
        deletedAt: null,
      },
    });
    if (existing) {
      return apiResponse.error('Person is already linked to this event');
    }

    const personEvent = await prisma.personEvent.create({
      data: {
        eventId,
        personId,
        role: role ? sanitizeName(role) : null,
        notes: notes ? sanitizeNotes(notes) : null,
      },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            surname: true,
            nickname: true,
            displayNameOverride: true,
            photo: true,
          },
        },
        event: {
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

    return apiResponse.created({ personEvent });
  } catch (error) {
    return handleApiError(error, 'event-people-add');
  }
});

// PUT /api/events/[id]/people - Update a person's role/notes in an event
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
    const validation = validateRequest(updatePersonEventSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { id, role, notes } = validation.data;

    const existing = await prisma.personEvent.findFirst({
      where: { id, eventId, deletedAt: null },
    });
    if (!existing) {
      return apiResponse.notFound('Person-event link not found');
    }

    const personEvent = await prisma.personEvent.update({
      where: { id },
      data: {
        role: role ? sanitizeName(role) : null,
        notes: notes ? sanitizeNotes(notes) : null,
      },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            surname: true,
            nickname: true,
            displayNameOverride: true,
            photo: true,
          },
        },
      },
    });

    return apiResponse.ok({ personEvent });
  } catch (error) {
    return handleApiError(error, 'event-people-update');
  }
});

// DELETE /api/events/[id]/people?linkId=... - Remove a person from an event
export const DELETE = withAuth(async (request, session, context) => {
  try {
    const { id: eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');

    if (!linkId) {
      return apiResponse.error('linkId is required');
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const existing = await prisma.personEvent.findFirst({
      where: { id: linkId, eventId, deletedAt: null },
    });
    if (!existing) {
      return apiResponse.notFound('Person-event link not found');
    }

    await prisma.personEvent.update({
      where: { id: linkId },
      data: { deletedAt: new Date() },
    });

    return apiResponse.ok({ message: 'Removed person from event' });
  } catch (error) {
    return handleApiError(error, 'event-people-delete');
  }
});

