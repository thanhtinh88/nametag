import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';
import { validateRequest, bulkEventActionSchema } from '@/lib/validations';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('events-bulk');

async function resolveEventIds(
  eventIds: string[] | undefined,
  selectAll: boolean | undefined,
  userId: string
): Promise<string[]> {
  if (!selectAll && (!eventIds || eventIds.length === 0)) {
    return [];
  }
  if (selectAll) {
    const allEvents = await prisma.event.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    return allEvents.map((e) => e.id);
  }
  const events = await prisma.event.findMany({
    where: { id: { in: eventIds! }, userId, deletedAt: null },
    select: { id: true },
  });
  return events.map((e) => e.id);
}

export const POST = withAuth(async (request, session) => {
  try {
    const body = await parseRequestBody(request);
    const validation = validateRequest(bulkEventActionSchema, body);
    if (!validation.success) return validation.response;

    const data = validation.data;
    const ids = await resolveEventIds(data.eventIds, data.selectAll, session.user.id);
    if (ids.length === 0) return apiResponse.ok({ success: true, affectedCount: 0 });

    switch (data.action) {
      case 'delete': {
        const now = new Date();
        const [result] = await prisma.$transaction([
          prisma.event.updateMany({
            where: { id: { in: ids }, userId: session.user.id, deletedAt: null },
            data: { deletedAt: now },
          }),
          prisma.personEvent.updateMany({
            where: { eventId: { in: ids }, deletedAt: null },
            data: { deletedAt: now },
          }),
          prisma.eventRelationship.updateMany({
            where: {
              OR: [{ fromEventId: { in: ids } }, { toEventId: { in: ids } }],
              deletedAt: null,
            },
            data: { deletedAt: now },
          }),
        ]);

        return apiResponse.ok({ success: true, affectedCount: result.count });
      }

      case 'setCaseStatus': {
        const result = await prisma.event.updateMany({
          where: { id: { in: ids }, userId: session.user.id, deletedAt: null },
          data: { caseStatus: data.caseStatus },
        });

        return apiResponse.ok({ success: true, affectedCount: result.count });
      }

      case 'setEventStatus': {
        const result = await prisma.event.updateMany({
          where: { id: { in: ids }, userId: session.user.id, deletedAt: null },
          data: { status: data.status },
        });

        return apiResponse.ok({ success: true, affectedCount: result.count });
      }

      case 'addToGroups': {
        const validGroups = await prisma.group.findMany({
          where: { id: { in: data.groupIds }, userId: session.user.id, deletedAt: null },
          select: { id: true },
        });
        const validGroupIds = validGroups.map((g) => g.id);
        if (validGroupIds.length === 0) {
          return apiResponse.notFound('No valid groups found');
        }

        const existingMemberships = await prisma.eventGroup.findMany({
          where: {
            eventId: { in: ids },
            groupId: { in: validGroupIds },
          },
          select: { eventId: true, groupId: true },
        });

        const existingSet = new Set(
          existingMemberships.map((m) => `${m.eventId}:${m.groupId}`)
        );

        const newMemberships: { eventId: string; groupId: string }[] = [];
        for (const eventId of ids) {
          for (const groupId of validGroupIds) {
            if (!existingSet.has(`${eventId}:${groupId}`)) {
              newMemberships.push({ eventId, groupId });
            }
          }
        }

        if (newMemberships.length > 0) {
          await prisma.eventGroup.createMany({
            data: newMemberships,
            skipDuplicates: true,
          });
        }

        return apiResponse.ok({ success: true, affectedCount: ids.length });
      }

      case 'removeFromGroups': {
        const validGroups = await prisma.group.findMany({
          where: { id: { in: data.groupIds }, userId: session.user.id, deletedAt: null },
          select: { id: true },
        });
        const validGroupIds = validGroups.map((g) => g.id);
        if (validGroupIds.length === 0) {
          return apiResponse.notFound('No valid groups found');
        }

        const result = await prisma.eventGroup.deleteMany({
          where: {
            eventId: { in: ids },
            groupId: { in: validGroupIds },
          },
        });

        return apiResponse.ok({ success: true, affectedCount: result.count });
      }
    }
  } catch (error) {
    return handleApiError(error, 'events-bulk');
  }
});

