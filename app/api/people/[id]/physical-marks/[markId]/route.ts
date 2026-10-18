import { prisma } from '@/lib/prisma';
import { updatePhysicalMarkSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// PUT /api/people/[id]/physical-marks/[markId] - Update a physical mark
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id, markId } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const existingMark = await prisma.physicalMark.findUnique({
      where: { id: markId, personId: id, deletedAt: null },
    });

    if (!existingMark) {
      return apiResponse.notFound('Physical mark not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(updatePhysicalMarkSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const physicalMark = await prisma.physicalMark.update({
      where: { id: markId },
      data: {
        ...(data.type !== undefined ? { type: data.type.toUpperCase() } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl ?? null } : {}),
      },
    });

    return apiResponse.ok({ physicalMark });
  } catch (error) {
    return handleApiError(error, 'physical-marks-update');
  }
});

// DELETE /api/people/[id]/physical-marks/[markId] - Delete (soft delete) a physical mark
export const DELETE = withAuth(async (_request, session, context) => {
  try {
    const { id, markId } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const existingMark = await prisma.physicalMark.findUnique({
      where: { id: markId, personId: id, deletedAt: null },
    });

    if (!existingMark) {
      return apiResponse.notFound('Physical mark not found');
    }

    await prisma.physicalMark.update({
      where: { id: markId },
      data: { deletedAt: new Date() },
    });

    return apiResponse.ok({ success: true });
  } catch (error) {
    return handleApiError(error, 'physical-marks-delete');
  }
});

