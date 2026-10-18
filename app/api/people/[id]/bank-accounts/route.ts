import { prisma } from '@/lib/prisma';
import { createSuspectBankAccountSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// GET /api/people/[id]/bank-accounts - List bank accounts for a person
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

    const bankAccounts = await prisma.suspectBankAccount.findMany({
      where: { personId: id, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return apiResponse.ok({ bankAccounts });
  } catch (error) {
    return handleApiError(error, 'bank-accounts-list');
  }
});

// POST /api/people/[id]/bank-accounts - Add a bank account for a person
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
    const validation = validateRequest(createSuspectBankAccountSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const {
      bankName,
      accountNumber,
      accountHolder,
      accountType,
      isPrimary,
      notes,
    } = validation.data;

    // If marked as primary, unmark other primary bank accounts of this person
    if (isPrimary) {
      await prisma.suspectBankAccount.updateMany({
        where: { personId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const bankAccount = await prisma.suspectBankAccount.create({
      data: {
        personId: id,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder?.trim() || null,
        accountType: accountType || 'OWNER',
        isPrimary: isPrimary ?? false,
        notes: notes?.trim() || null,
      },
    });

    return apiResponse.created({ bankAccount });
  } catch (error) {
    return handleApiError(error, 'bank-accounts-create');
  }
});

