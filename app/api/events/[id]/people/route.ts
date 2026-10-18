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

    const { personId, role, involvementType, verificationStatus, confidence, reasonForSuspicion, alibi, notes } = validation.data;

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
      },
    });
    if (existing && existing.deletedAt === null) {
      return apiResponse.error('Person is already linked to this event');
    }

    const personEvent = existing
      ? await prisma.personEvent.update({
          where: { id: existing.id },
          data: {
            role: role ? sanitizeName(role) : null,
            involvementType: involvementType ?? 'SUSPECT',
            verificationStatus: verificationStatus ?? 'HYPOTHESIS',
            confidence: confidence ?? null,
            reasonForSuspicion: reasonForSuspicion ? sanitizeNotes(reasonForSuspicion) : null,
            alibi: alibi ? sanitizeNotes(alibi) : null,
            notes: notes ? sanitizeNotes(notes) : null,
            deletedAt: null,
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
        })
      : await prisma.personEvent.create({
          data: {
            eventId,
            personId,
            role: role ? sanitizeName(role) : null,
            involvementType: involvementType ?? 'SUSPECT',
            verificationStatus: verificationStatus ?? 'HYPOTHESIS',
            confidence: confidence ?? null,
            reasonForSuspicion: reasonForSuspicion ? sanitizeNotes(reasonForSuspicion) : null,
            alibi: alibi ? sanitizeNotes(alibi) : null,
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

// PUT /api/events/[id]/people - Update a person's role/involvement/status/notes in an event
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

    const { id, personId, role, involvementType, verificationStatus, confidence, reasonForSuspicion, alibi, notes } = validation.data;

    const existing = await prisma.personEvent.findFirst({
      where: {
        eventId,
        deletedAt: null,
        ...(id ? { id } : { personId }),
      },
    });
    if (!existing) {
      return apiResponse.notFound('Person-event link not found');
    }

    const personEvent = await prisma.personEvent.update({
      where: { id: existing.id },
      data: {
        ...(role !== undefined && { role: role ? sanitizeName(role) : null }),
        ...(involvementType !== undefined && { involvementType }),
        ...(verificationStatus !== undefined && { verificationStatus }),
        ...(confidence !== undefined && { confidence }),
        ...(reasonForSuspicion !== undefined && {
          reasonForSuspicion: reasonForSuspicion ? sanitizeNotes(reasonForSuspicion) : null,
        }),
        ...(alibi !== undefined && {
          alibi: alibi ? sanitizeNotes(alibi) : null,
        }),
        ...(notes !== undefined && { notes: notes ? sanitizeNotes(notes) : null }),
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

// DELETE /api/events/[id]/people?linkId=... or ?personId=... - Remove a person from an event
export const DELETE = withAuth(async (request, session, context) => {
  try {
    const { id: eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');
    const personId = searchParams.get('personId');

    if (!linkId && !personId) {
      return apiResponse.error('linkId or personId is required');
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const existing = await prisma.personEvent.findFirst({
      where: {
        eventId,
        deletedAt: null,
        ...(linkId ? { id: linkId } : { personId: personId! }),
      },
    });
    if (!existing) {
      return apiResponse.notFound('Person-event link not found');
    }

    await prisma.personEvent.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    return apiResponse.ok({ message: 'Removed person from event' });
  } catch (error) {
    return handleApiError(error, 'event-people-delete');
  }
});

