import type { EventAddress } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { createModuleLogger } from '@/lib/logger';
import { buildAddressHash, hasGeocodableContent } from './hash';
import { geocodeAddress, GeocodingProviderError, type GeocodeResult } from './provider';
import type { GeocodeOutcome } from './geocode-person';

const log = createModuleLogger('geocoding-event');

/**
 * Geocode one event address row if it needs it.
 */
export async function geocodeSingleEventAddress(address: EventAddress): Promise<GeocodeOutcome> {
  if (
    address.geocodeStatus === 'success' &&
    address.latitude !== null &&
    address.longitude !== null &&
    address.geocodeHash === 'manual'
  ) {
    return 'skipped';
  }

  const hash = buildAddressHash(address);

  if (!hasGeocodableContent(address)) {
    if (address.geocodeStatus !== 'failed') {
      await prisma.eventAddress.updateMany({
        where: { id: address.id },
        data: { geocodeStatus: 'failed', geocodedAt: new Date(), geocodeHash: hash },
      });
    }
    return 'skipped';
  }

  const alreadyResolved = address.geocodeStatus === 'success' || address.geocodeStatus === 'failed';
  if (alreadyResolved && address.geocodeHash === hash) {
    return 'skipped';
  }

  const cached = await prisma.geocodeCache.findUnique({ where: { hash } });
  if (cached) {
    await prisma.eventAddress.updateMany({
      where: { id: address.id },
      data: {
        latitude: cached.latitude,
        longitude: cached.longitude,
        geocodeStatus: cached.status,
        geocodedAt: new Date(),
        geocodeHash: hash,
      },
    });
    return cached.status === 'success' ? 'success' : 'failed';
  }

  try {
    let result: GeocodeResult | null;
    try {
      result = await geocodeAddress(address);
    } catch (error) {
      if (error instanceof GeocodingProviderError && error.status === 429) {
        log.warn({ addressId: address.id }, 'Geocoder rate limited, backing off');
        await prisma.eventAddress.updateMany({
          where: { id: address.id },
          data: { geocodeStatus: 'pending' },
        });
        return 'rate_limited';
      }
      if (!(error instanceof GeocodingProviderError)) {
        throw error;
      }
      result = await geocodeAddress(address);
    }
    const status = result ? 'success' : 'failed';

    await prisma.geocodeCache.upsert({
      where: { hash },
      create: {
        hash,
        latitude: result?.latitude ?? null,
        longitude: result?.longitude ?? null,
        status,
      },
      update: {
        latitude: result?.latitude ?? null,
        longitude: result?.longitude ?? null,
        status,
      },
    });

    await prisma.eventAddress.updateMany({
      where: { id: address.id },
      data: {
        latitude: result?.latitude ?? null,
        longitude: result?.longitude ?? null,
        geocodeStatus: status,
        geocodedAt: new Date(),
        geocodeHash: hash,
      },
    });

    return status;
  } catch (error) {
    log.warn(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        addressId: address.id,
      },
      'Event geocoding attempt failed, leaving address pending'
    );
    await prisma.eventAddress.updateMany({
      where: { id: address.id },
      data: { geocodeStatus: 'pending' },
    });
    if (error instanceof GeocodingProviderError && error.status === 429) {
      return 'rate_limited';
    }
    return 'pending';
  }
}

/**
 * Geocode all addresses of an event in the background.
 */
export async function geocodeEventAddresses(eventId: string): Promise<void> {
  if (env.DISABLE_GEOCODING) {
    return;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId, deletedAt: null },
    include: {
      addresses: true,
      user: { select: { geocodingEnabled: true } },
    },
  });
  if (!event) {
    return;
  }

  if (!event.user.geocodingEnabled) {
    await prisma.eventAddress.updateMany({
      where: { eventId, geocodeStatus: null },
      data: { geocodeStatus: 'disabled' },
    });
    return;
  }

  for (const address of event.addresses) {
    const outcome = await geocodeSingleEventAddress(address);
    if (outcome === 'rate_limited') {
      break;
    }
  }
}

