import { prisma } from '@/lib/prisma';
import { updateSuspectBankAccountSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// PUT /api/people/[id]/bank-accounts/[accountId] - Update a bank account
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id, accountId } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const existingAccount = await prisma.suspectBankAccount.findUnique({
      where: { id: accountId, personId: id, deletedAt: null },
    });

    if (!existingAccount) {
      return apiResponse.notFound('Bank account not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(updateSuspectBankAccountSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // If marked as primary, unmark other primary bank accounts of this person
    if (data.isPrimary) {
      await prisma.suspectBankAccount.updateMany({
        where: { personId: id, isPrimary: true, NOT: { id: accountId } },
        data: { isPrimary: false },
      });
    }

    const bankAccount = await prisma.suspectBankAccount.update({
      where: { id: accountId },
      data: {
        ...(data.bankName !== undefined && { bankName: data.bankName.trim() }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber.trim() }),
        ...(data.accountHolder !== undefined && { accountHolder: data.accountHolder?.trim() || null }),
        ...(data.accountType !== undefined && { accountType: data.accountType }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
      },
    });

    return apiResponse.ok({ bankAccount });
  } catch (error) {
    return handleApiError(error, 'bank-accounts-update');
  }
});

// DELETE /api/people/[id]/bank-accounts/[accountId] - Soft-delete a bank account
export const DELETE = withAuth(async (_request, session, context) => {
  try {
    const { id, accountId } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const existingAccount = await prisma.suspectBankAccount.findUnique({
      where: { id: accountId, personId: id, deletedAt: null },
    });

    if (!existingAccount) {
      return apiResponse.notFound('Bank account not found');
    }

    await prisma.suspectBankAccount.update({
      where: { id: accountId },
      data: { deletedAt: new Date() },
    });

    return apiResponse.ok({ message: 'Bank account deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'bank-accounts-delete');
  }
});

