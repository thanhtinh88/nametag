import { prisma } from '@/lib/prisma';
import { createPhysicalMarkSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// GET /api/people/[id]/physical-marks - List physical marks for a person
export const GET = withAuth(async (_request, session, context) => {
  try {
    const { id } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const physicalMarks = await prisma.physicalMark.findMany({
      where: { personId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return apiResponse.ok({ physicalMarks });
  } catch (error) {
    return handleApiError(error, 'physical-marks-list');
  }
});

// POST /api/people/[id]/physical-marks - Add a physical mark
export const POST = withAuth(async (request, session, context) => {
  try {
    const { id } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(createPhysicalMarkSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { type, location, description, photoUrl } = validation.data;

    const physicalMark = await prisma.physicalMark.create({
      data: {
        personId: id,
        type: type.toUpperCase(),
        location,
        description,
        photoUrl: photoUrl ?? null,
      },
    });

    return apiResponse.created({ physicalMark });
  } catch (error) {
    return handleApiError(error, 'physical-marks-create');
  }
});

