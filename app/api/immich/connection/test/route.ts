import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';
import { immichConnectionTestSchema, validateRequest } from '@/lib/validations';
import { validateServerUrl } from '@/lib/net/url-validation';
import {
  getImmichConfig,
  ImmichError,
  normalizeImmichUrl,
  testImmichConnection,
  type ImmichConfig,
} from '@/lib/immich/client';

// POST /api/immich/connection/test - Test either the submitted values or the saved connection
export const POST = withAuth(async (request, session) => {
  try {
    let body: unknown = {};
    try {
      body = await parseRequestBody(request);
    } catch {
      body = {};
    }
    const validation = validateRequest(immichConnectionTestSchema, body ?? {});
    if (!validation.success) return validation.response;

    const saved = await getImmichConfig(session.user.id);
    const serverUrl = validation.data.serverUrl
      ? normalizeImmichUrl(validation.data.serverUrl)
      : saved?.serverUrl;
    const apiKey = validation.data.apiKey || saved?.apiKey;

    if (!serverUrl || !apiKey) {
      return apiResponse.error('Server URL and API key are required');
    }

    try {
      await validateServerUrl(serverUrl);
    } catch (error) {
      return apiResponse.error(error instanceof Error ? error.message : 'Invalid URL');
    }

    const config: ImmichConfig = { serverUrl, apiKey, publicUrl: null };
    const isSavedTarget = !!saved && saved.serverUrl === serverUrl && saved.apiKey === apiKey;

    try {
      const result = await testImmichConnection(config);
      if (isSavedTarget) {
        await prisma.immichConnection.update({
          where: { userId: session.user.id },
          data: { lastError: null, lastCheckedAt: new Date() },
        });
      }
      return apiResponse.ok({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof ImmichError ? error.message : 'Connection failed';
      if (isSavedTarget) {
        await prisma.immichConnection.update({
          where: { userId: session.user.id },
          data: { lastError: message, lastCheckedAt: new Date() },
        });
      }
      return apiResponse.ok({ ok: false, error: message });
    }
  } catch (error) {
    return handleApiError(error, 'immich-connection-test');
  }
});

