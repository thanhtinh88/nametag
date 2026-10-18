import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';

// DELETE /api/gangs/[id]/members/[personId] - Remove a person from a gang
export const DELETE = withAuth(async (_request, session, context) => {
  try {
    const { id, personId } = await context.params;

    const gang = await prisma.gang.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!gang) {
      return apiResponse.notFound('Gang not found');
    }

    const membership = await prisma.gangMembership.findUnique({
      where: {
        gangId_personId: {
          gangId: id,
          personId,
        },
      },
    });

    if (!membership) {
      return apiResponse.notFound('Member not found in gang');
    }

    await prisma.gangMembership.delete({
      where: {
        gangId_personId: {
          gangId: id,
          personId,
        },
      },
    });

    return apiResponse.ok({ success: true });
  } catch (error) {
    return handleApiError(error, 'gangs-member-remove');
  }
});

