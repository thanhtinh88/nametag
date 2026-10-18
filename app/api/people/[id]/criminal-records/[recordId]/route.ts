import { prisma } from '@/lib/prisma';
import { updateCriminalRecordSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// PUT /api/people/[id]/criminal-records/[recordId] - Update a criminal record
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id, recordId } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const existingRecord = await prisma.criminalRecord.findUnique({
      where: { id: recordId, personId: id, deletedAt: null },
    });

    if (!existingRecord) {
      return apiResponse.notFound('Criminal record not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(updateCriminalRecordSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const criminalRecord = await prisma.criminalRecord.update({
      where: { id: recordId },
      data: {
        ...(data.charge !== undefined ? { charge: data.charge } : {}),
        ...(data.recordType !== undefined ? { recordType: data.recordType } : {}),
        ...(data.sentenceDetail !== undefined ? { sentenceDetail: data.sentenceDetail ?? null } : {}),
        ...(data.adjudicatedBy !== undefined ? { adjudicatedBy: data.adjudicatedBy ?? null } : {}),
        ...(data.incidentDate !== undefined
          ? { incidentDate: data.incidentDate ? new Date(data.incidentDate) : null }
          : {}),
        ...(data.verdictDate !== undefined
          ? { verdictDate: data.verdictDate ? new Date(data.verdictDate) : null }
          : {}),
        ...(data.isPardoned !== undefined ? { isPardoned: data.isPardoned } : {}),
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
      },
    });

    return apiResponse.ok({ criminalRecord });
  } catch (error) {
    return handleApiError(error, 'criminal-records-update');
  }
});

// DELETE /api/people/[id]/criminal-records/[recordId] - Delete (soft delete) a criminal record
export const DELETE = withAuth(async (_request, session, context) => {
  try {
    const { id, recordId } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const existingRecord = await prisma.criminalRecord.findUnique({
      where: { id: recordId, personId: id, deletedAt: null },
    });

    if (!existingRecord) {
      return apiResponse.notFound('Criminal record not found');
    }

    await prisma.criminalRecord.update({
      where: { id: recordId },
      data: { deletedAt: new Date() },
    });

    return apiResponse.ok({ success: true });
  } catch (error) {
    return handleApiError(error, 'criminal-records-delete');
  }
});

