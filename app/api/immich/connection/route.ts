import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';
import { immichConnectionSchema, validateRequest } from '@/lib/validations';
import { encryptSecret } from '@/lib/crypto/secrets';
import { validateServerUrl } from '@/lib/net/url-validation';
import { normalizeImmichUrl } from '@/lib/immich/client';

// GET /api/immich/connection - Current user's Immich settings (API key never returned)
export const GET = withAuth(async (_request, session) => {
  try {
    const connection = await prisma.immichConnection.findUnique({
      where: { userId: session.user.id },
      select: {
        serverUrl: true,
        publicUrl: true,
        enabled: true,
        lastError: true,
        lastCheckedAt: true,
        updatedAt: true,
      },
    });
    return apiResponse.ok({
      connection: connection ? { ...connection, hasApiKey: true } : null,
    });
  } catch (error) {
    return handleApiError(error, 'immich-connection-get');
  }
});

// PUT /api/immich/connection - Create or update Immich settings
export const PUT = withAuth(async (request, session) => {
  try {
    const body = await parseRequestBody(request);
    const validation = validateRequest(immichConnectionSchema, body);
    if (!validation.success) return validation.response;

    const { serverUrl, publicUrl, apiKey, enabled } = validation.data;
    const normalizedServerUrl = normalizeImmichUrl(serverUrl);
    const normalizedPublicUrl = publicUrl ? normalizeImmichUrl(publicUrl) : null;

    try {
      await validateServerUrl(normalizedServerUrl);
      if (normalizedPublicUrl) await validateServerUrl(normalizedPublicUrl);
    } catch (error) {
      return apiResponse.error(error instanceof Error ? error.message : 'Invalid URL');
    }

    const existing = await prisma.immichConnection.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!existing && !apiKey) {
      return apiResponse.error('API key is required');
    }

    const data = {
      serverUrl: normalizedServerUrl,
      publicUrl: normalizedPublicUrl,
      ...(enabled !== undefined ? { enabled } : {}),
      ...(apiKey ? { apiKey: encryptSecret(apiKey) } : {}),
    };

    const connection = existing
      ? await prisma.immichConnection.update({
          where: { userId: session.user.id },
          data,
          select: { serverUrl: true, publicUrl: true, enabled: true },
        })
      : await prisma.immichConnection.create({
          data: { ...data, apiKey: encryptSecret(apiKey as string), userId: session.user.id },
          select: { serverUrl: true, publicUrl: true, enabled: true },
        });

    return apiResponse.ok({ connection: { ...connection, hasApiKey: true } });
  } catch (error) {
    return handleApiError(error, 'immich-connection-put');
  }
});

// DELETE /api/immich/connection - Remove Immich settings
export const DELETE = withAuth(async (_request, session) => {
  try {
    await prisma.immichConnection.deleteMany({ where: { userId: session.user.id } });
    return apiResponse.success();
  } catch (error) {
    return handleApiError(error, 'immich-connection-delete');
  }
});

