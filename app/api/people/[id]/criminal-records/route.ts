import { prisma } from '@/lib/prisma';
import { createCriminalRecordSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// GET /api/people/[id]/criminal-records - List criminal records for a person
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

    const criminalRecords = await prisma.criminalRecord.findMany({
      where: { personId: id, deletedAt: null },
      orderBy: { incidentDate: 'desc' },
    });

    return apiResponse.ok({ criminalRecords });
  } catch (error) {
    return handleApiError(error, 'criminal-records-list');
  }
});

// POST /api/people/[id]/criminal-records - Add a criminal record
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
    const validation = validateRequest(createCriminalRecordSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const {
      charge,
      recordType,
      sentenceDetail,
      adjudicatedBy,
      incidentDate,
      verdictDate,
      isPardoned,
      notes,
    } = validation.data;

    const criminalRecord = await prisma.criminalRecord.create({
      data: {
        personId: id,
        charge,
        recordType: recordType ?? 'CONVICTION',
        sentenceDetail: sentenceDetail ?? null,
        adjudicatedBy: adjudicatedBy ?? null,
        incidentDate: incidentDate ? new Date(incidentDate) : null,
        verdictDate: verdictDate ? new Date(verdictDate) : null,
        isPardoned: isPardoned ?? false,
        notes: notes ?? null,
      },
    });

    return apiResponse.created({ criminalRecord });
  } catch (error) {
    return handleApiError(error, 'criminal-records-create');
  }
});

