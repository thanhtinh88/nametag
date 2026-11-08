import { NextResponse } from 'next/server';
import { BACKEND_INTERNAL_URL } from '@/lib/backend/constants';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('health');

/**
 * Health check endpoint for monitoring and orchestration
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const backendRes = await fetch(`${BACKEND_INTERNAL_URL}/health`, {
      cache: 'no-store',
    });
    const dbLatency = Date.now() - startTime;

    if (!backendRes.ok) {
      throw new Error(`Backend returned status ${backendRes.status}`);
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        backend: {
          status: 'connected',
          latency: `${dbLatency}ms`,
        },
      },
    });
  } catch (error) {
    const dbLatency = Date.now() - startTime;
    log.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Health check failed: backend unreachable'
    );

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          backend: {
            status: 'disconnected',
            latency: `${dbLatency}ms`,
          },
        },
      },
      { status: 503 }
    );
  }
}
