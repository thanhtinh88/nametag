import { NextResponse } from 'next/server';
import { BACKEND_INTERNAL_URL } from '@/lib/backend/constants';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const backendUrl = new URL('/api/auth/registration-status', BACKEND_INTERNAL_URL).toString();
    const res = await fetch(backendUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ enabled: true });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch registration status from backend');
    return NextResponse.json({ enabled: true });
  }
}
