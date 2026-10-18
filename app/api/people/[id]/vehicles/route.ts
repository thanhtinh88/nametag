import { prisma } from '@/lib/prisma';
import { createSuspectVehicleSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// GET /api/people/[id]/vehicles - List vehicles for a person
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

    const vehicles = await prisma.suspectVehicle.findMany({
      where: { personId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return apiResponse.ok({ vehicles });
  } catch (error) {
    return handleApiError(error, 'vehicles-list');
  }
});

// POST /api/people/[id]/vehicles - Add a vehicle for a person
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
    const validation = validateRequest(createSuspectVehicleSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const {
      plateNumber,
      vehicleType,
      brandModel,
      color,
      identifyingFeatures,
      registeredOwner,
      isSuspicious,
    } = validation.data;

    const vehicle = await prisma.suspectVehicle.create({
      data: {
        personId: id,
        plateNumber: plateNumber.toUpperCase(),
        vehicleType,
        brandModel: brandModel ?? null,
        color: color ?? null,
        identifyingFeatures: identifyingFeatures ?? null,
        registeredOwner: registeredOwner ?? null,
        isSuspicious: isSuspicious ?? false,
      },
    });

    return apiResponse.created({ vehicle });
  } catch (error) {
    return handleApiError(error, 'vehicles-create');
  }
});

