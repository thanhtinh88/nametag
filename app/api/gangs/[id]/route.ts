import { prisma } from '@/lib/prisma';
import { updateGangSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// GET /api/gangs/[id] - Get gang details
export const GET = withAuth(async (_request, session, context) => {
  try {
    const { id } = await context.params;

    const gang = await prisma.gang.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      include: {
        members: {
          include: {
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
                nickname: true,
                photo: true,
                managementLevel: true,
                threatLevel: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!gang) {
      return apiResponse.notFound('Gang not found');
    }

    return apiResponse.ok({ gang });
  } catch (error) {
    return handleApiError(error, 'gangs-get');
  }
});

// PUT /api/gangs/[id] - Update a gang
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id } = await context.params;

    const existingGang = await prisma.gang.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!existingGang) {
      return apiResponse.notFound('Gang not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(updateGangSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const gang = await prisma.gang.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.turf !== undefined ? { turf: data.turf ?? null } : {}),
        ...(data.color !== undefined ? { color: data.color ?? null } : {}),
      },
    });

    return apiResponse.ok({ gang });
  } catch (error) {
    return handleApiError(error, 'gangs-update');
  }
});

// DELETE /api/gangs/[id] - Soft delete a gang
export const DELETE = withAuth(async (_request, session, context) => {
  try {
    const { id } = await context.params;

    const existingGang = await prisma.gang.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!existingGang) {
      return apiResponse.notFound('Gang not found');
    }

    await prisma.gang.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return apiResponse.ok({ success: true });
  } catch (error) {
    return handleApiError(error, 'gangs-delete');
  }
});

