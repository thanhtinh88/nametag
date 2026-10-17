import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, parseRequestBody, withAuth } from '@/lib/api-utils';
import { personImmichLinkSchema, immichSetPhotoSchema, validateRequest } from '@/lib/validations';
import { getImmichConfig, immichFetch } from '@/lib/immich/client';
import { immichErrorResponse, notConfiguredResponse } from '@/lib/immich/route-helpers';
import { savePhotoFromBuffer } from '@/lib/photo-storage';

/**
 * PUT /api/people/[id]/immich
 * Update a subject's linked Immich person cluster ID and/or album ID.
 */
export const PUT = withAuth(async (request, session, context) => {
  try {
    const { id } = await context.params;
    const person = await prisma.person.findFirst({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(personImmichLinkSchema, body);
    if (!validation.success) return validation.response;

    const validated = validation.data;

    const updated = await prisma.person.update({
      where: { id },
      data: {
        immichPersonId:
          validated.immichPersonId !== undefined
            ? validated.immichPersonId || null
            : undefined,
        immichAlbumId:
          validated.immichAlbumId !== undefined
            ? validated.immichAlbumId || null
            : undefined,
      },
      select: {
        id: true,
        immichPersonId: true,
        immichAlbumId: true,
      },
    });

    return apiResponse.ok(updated);
  } catch (error) {
    return immichErrorResponse(error) ?? handleApiError(error, 'person-immich-put');
  }
});

/**
 * POST /api/people/[id]/immich
 * Download an Immich asset preview/thumbnail, resize to 256x256 avatar via
 * savePhotoFromBuffer, and set as the subject's primary profile photo.
 */
export const POST = withAuth(async (request, session, context) => {
  try {
    const { id } = await context.params;
    const person = await prisma.person.findFirst({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person');
    }

    const body = await parseRequestBody(request);
    const validation = validateRequest(immichSetPhotoSchema, body);
    if (!validation.success) return validation.response;

    const { assetId } = validation.data;

    const config = await getImmichConfig(session.user.id);
    if (!config) {
      return notConfiguredResponse();
    }

    // Fetch preview image from Immich (JPEG/WebP suitable for sharp resize to 256px)
    const response = await immichFetch(
      config,
      `/api/assets/${encodeURIComponent(assetId)}/thumbnail?size=preview`,
      {
        headers: {
          Accept: 'image/jpeg,image/png,image/webp,image/*,*/*',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch asset from Immich (HTTP ${response.status})` },
        { status: 502 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = await savePhotoFromBuffer(session.user.id, id, buffer);

    await prisma.person.update({
      where: { id },
      data: { photo: filename },
    });

    return apiResponse.ok({
      success: true,
      photo: filename,
      photoUrl: `/api/photos/${filename}?t=${Date.now()}`,
    });
  } catch (error) {
    return immichErrorResponse(error) ?? handleApiError(error, 'person-immich-post');
  }
});
