/**
 * Next.js Instrumentation
 * This file is automatically loaded by Next.js to set up instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { createModuleLogger } = await import('./lib/logger');
    const log = createModuleLogger('init');
    log.info('Nametag Next.js frontend initialized');
  }
}
