import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { isPhotoFilename, readPhotoFile } from '@/lib/photo-storage';

// GET /api/photos/marks/[filename] - Serve a mark's photo from disk
export const GET = withAuth(async (_request, session, context) => {
  try {
    const { filename } = await context.params;

    if (!filename || !isPhotoFilename(filename)) {
      return new NextResponse(null, { status: 404 });
    }

    const result = await readPhotoFile(session.user.id, filename);
    if (!result) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Length': String(result.buffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
});

