import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import { saveMarkPhoto } from '@/lib/photo-storage';

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

// POST /api/people/[id]/physical-marks/photo - Upload a physical mark photo
export const POST = withAuth(async (request, session, context) => {
  try {
    const { id } = await context.params;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiResponse.error('Invalid form data');
    }

    const file = formData.get('photo');
    if (!file || typeof file === 'string') {
      return apiResponse.error('No photo file provided');
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return apiResponse.error(`Photo exceeds maximum size of ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB`);
    }

    const person = await prisma.person.findUnique({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let filename: string;
    try {
      filename = await saveMarkPhoto(session.user.id, id, buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process photo';
      return apiResponse.error(message);
    }

    // Photo URL path served by the app
    const photoUrl = `/api/photos/marks/${filename}`;

    return apiResponse.ok({ photoUrl, filename });
  } catch (error) {
    return handleApiError(error, 'physical-mark-photo-upload');
  }
});

