import { prisma } from '@/lib/prisma';
import { createGangSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// GET /api/gangs - List all gangs for the current user
export const GET = withAuth(async (_request, session) => {
  try {
    const gangs = await prisma.gang.findMany({
      where: { userId: session.user.id, deletedAt: null },
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiResponse.ok({ gangs });
  } catch (error) {
    return handleApiError(error, 'gangs-list');
  }
});

// POST /api/gangs - Create a new gang
export const POST = withAuth(async (request, session) => {
  try {
    const body = await parseRequestBody(request);
    const validation = validateRequest(createGangSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { name, description, turf, color } = validation.data;

    const gang = await prisma.gang.create({
      data: {
        userId: session.user.id,
        name,
        description: description ?? null,
        turf: turf ?? null,
        color: color ?? null,
      },
    });

    return apiResponse.created({ gang });
  } catch (error) {
    return handleApiError(error, 'gangs-create');
  }
});

