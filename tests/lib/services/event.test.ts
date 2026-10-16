import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const eventCreate = vi.fn();
  const eventUpdate = vi.fn();
  const eventFindUnique = vi.fn();
  const personEventUpdateMany = vi.fn();
  const eventRelationshipUpdateMany = vi.fn();
  const transaction = vi.fn();
  const geocodeEventAddresses = vi.fn().mockResolvedValue(undefined);

  return {
    eventCreate,
    eventUpdate,
    eventFindUnique,
    personEventUpdateMany,
    eventRelationshipUpdateMany,
    transaction,
    geocodeEventAddresses,
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      create: mocks.eventCreate,
      update: mocks.eventUpdate,
      findUnique: mocks.eventFindUnique,
    },
    personEvent: {
      updateMany: mocks.personEventUpdateMany,
    },
    eventRelationship: {
      updateMany: mocks.eventRelationshipUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/geocoding/geocode-event', () => ({
  geocodeEventAddresses: mocks.geocodeEventAddresses,
}));

import { createEvent, deleteEvent } from '@/lib/services/event';

describe('event service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
  });

  it('creates an event with manual coordinates marked as geocodeStatus=success and geocodeHash=manual', async () => {
    mocks.eventCreate.mockResolvedValue({
      id: 'ev-1',
      title: 'Tech Summit 2026',
    });

    await createEvent('user-1', {
      title: 'Tech Summit 2026',
      status: 'PLANNED',
      hasTime: false,
      addresses: [
        {
          type: 'venue',
          streetLine1: '123 Main St',
          locality: 'Hanoi',
          latitude: 21.028511,
          longitude: 105.804817,
        },
      ],
    });

    expect(mocks.eventCreate).toHaveBeenCalledTimes(1);
    const callArg = mocks.eventCreate.mock.calls[0][0];
    expect(callArg.data.title).toBe('Tech Summit 2026');
    expect(callArg.data.addresses.create[0]).toMatchObject({
      type: 'venue',
      streetLine1: '123 Main St',
      locality: 'Hanoi',
      latitude: 21.028511,
      longitude: 105.804817,
      geocodeStatus: 'success',
      geocodeHash: 'manual',
    });
  });

  it('soft deletes an event and its participant and event relationships', async () => {
    mocks.eventFindUnique.mockResolvedValue({ id: 'ev-1' });
    mocks.eventUpdate.mockResolvedValue({ id: 'ev-1' });

    const deleted = await deleteEvent('ev-1', 'user-1');

    expect(deleted).toBe(true);
    expect(mocks.eventUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.personEventUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.eventRelationshipUpdateMany).toHaveBeenCalledTimes(1);
  });
});

