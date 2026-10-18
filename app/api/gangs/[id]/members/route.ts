import { prisma } from '@/lib/prisma';
import { gangMemberSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// POST /api/gangs/[id]/members - Add or update a person in a gang
export const POST = withAuth(async (request, session, context) => {
  try {
    const { id } = await context.params;

    const gang = await prisma.gang.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!gang) {
      return apiResponse.notFound('Gang not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(gangMemberSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { personId, role, notes, joinedAt, leftAt } = validation.data;

    const person = await prisma.person.findUnique({
      where: { id: personId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const membership = await prisma.gangMembership.upsert({
      where: {
        gangId_personId: {
          gangId: id,
          personId,
        },
      },
      create: {
        gangId: id,
        personId,
        role: role ?? 'MEMBER',
        notes: notes ?? null,
        joinedAt: joinedAt ? new Date(joinedAt) : null,
        leftAt: leftAt ? new Date(leftAt) : null,
      },
      update: {
        role: role ?? 'MEMBER',
        notes: notes ?? null,
        joinedAt: joinedAt ? new Date(joinedAt) : null,
        leftAt: leftAt ? new Date(leftAt) : null,
      },
    });

    return apiResponse.ok({ membership });
  } catch (error) {
    return handleApiError(error, 'gangs-member-add');
  }
});

