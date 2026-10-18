import { prisma } from '@/lib/prisma';
import { updateSuspectVehicleSchema, validateRequest } from '@/lib/validations';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';

// PUT /api/people/[id]/vehicles/[vehicleId] - Update a vehicle
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id, vehicleId } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const existingVehicle = await prisma.suspectVehicle.findUnique({
      where: { id: vehicleId, personId: id, deletedAt: null },
    });

    if (!existingVehicle) {
      return apiResponse.notFound('Vehicle not found');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(updateSuspectVehicleSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const vehicle = await prisma.suspectVehicle.update({
      where: { id: vehicleId },
      data: {
        ...(data.plateNumber !== undefined ? { plateNumber: data.plateNumber.toUpperCase() } : {}),
        ...(data.vehicleType !== undefined ? { vehicleType: data.vehicleType } : {}),
        ...(data.brandModel !== undefined ? { brandModel: data.brandModel ?? null } : {}),
        ...(data.color !== undefined ? { color: data.color ?? null } : {}),
        ...(data.identifyingFeatures !== undefined ? { identifyingFeatures: data.identifyingFeatures ?? null } : {}),
        ...(data.registeredOwner !== undefined ? { registeredOwner: data.registeredOwner ?? null } : {}),
        ...(data.isSuspicious !== undefined ? { isSuspicious: data.isSuspicious } : {}),
      },
    });

    return apiResponse.ok({ vehicle });
  } catch (error) {
    return handleApiError(error, 'vehicles-update');
  }
});

// DELETE /api/people/[id]/vehicles/[vehicleId] - Delete (soft delete) a vehicle
export const DELETE = withAuth(async (_request, session, context) => {
  try {
    const { id, vehicleId } = await context.params;

    const person = await prisma.person.findUnique({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const existingVehicle = await prisma.suspectVehicle.findUnique({
      where: { id: vehicleId, personId: id, deletedAt: null },
    });

    if (!existingVehicle) {
      return apiResponse.notFound('Vehicle not found');
    }

    await prisma.suspectVehicle.update({
      where: { id: vehicleId },
      data: { deletedAt: new Date() },
    });

    return apiResponse.ok({ success: true });
  } catch (error) {
    return handleApiError(error, 'vehicles-delete');
  }
});

