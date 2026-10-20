import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  eventFindMany: vi.fn(),
  eventUpdateMany: vi.fn(),
  personEventUpdateMany: vi.fn(),
  eventRelationshipUpdateMany: vi.fn(),
  eventGroupCreateMany: vi.fn(),
  eventGroupDeleteMany: vi.fn(),
  eventGroupFindMany: vi.fn(),
  groupFindMany: vi.fn(),
  transaction: vi.fn((fns) => Promise.all(fns)),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    event: {
      findMany: mocks.eventFindMany,
      updateMany: mocks.eventUpdateMany,
    },
    personEvent: {
      updateMany: mocks.personEventUpdateMany,
    },
    eventRelationship: {
      updateMany: mocks.eventRelationshipUpdateMany,
    },
    eventGroup: {
      createMany: mocks.eventGroupCreateMany,
      deleteMany: mocks.eventGroupDeleteMany,
      findMany: mocks.eventGroupFindMany,
    },
    group: {
      findMany: mocks.groupFindMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock('../../lib/auth', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
    })
  ),
}));

import { POST } from '../../app/api/events/bulk/route';

describe('Bulk Events API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('delete action', () => {
    it('should soft-delete specified events and their relations', async () => {
      mocks.eventFindMany.mockResolvedValueOnce([{ id: 'ev-1' }, { id: 'ev-2' }]);
      mocks.eventUpdateMany.mockResolvedValueOnce({ count: 2 });
      mocks.personEventUpdateMany.mockResolvedValueOnce({ count: 4 });
      mocks.eventRelationshipUpdateMany.mockResolvedValueOnce({ count: 1 });

      const req = new Request('http://localhost/api/events/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          eventIds: ['ev-1', 'ev-2'],
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true, affectedCount: 2 });
      expect(mocks.transaction).toHaveBeenCalled();
      expect(mocks.eventUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: ['ev-1', 'ev-2'] }, userId: 'user-123', deletedAt: null },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      });
    });
  });

  describe('setCaseStatus action', () => {
    it('should update caseStatus for specified events', async () => {
      mocks.eventFindMany.mockResolvedValueOnce([{ id: 'ev-1' }]);
      mocks.eventUpdateMany.mockResolvedValueOnce({ count: 1 });

      const req = new Request('http://localhost/api/events/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setCaseStatus',
          eventIds: ['ev-1'],
          caseStatus: 'SOLVED',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true, affectedCount: 1 });
      expect(mocks.eventUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: ['ev-1'] }, userId: 'user-123', deletedAt: null },
        data: { caseStatus: 'SOLVED' },
      });
    });
  });

  describe('addToGroups action', () => {
    it('should add events to valid groups without duplicates', async () => {
      mocks.groupFindMany.mockResolvedValueOnce([{ id: 'g-1' }]);
      mocks.eventFindMany.mockResolvedValueOnce([{ id: 'ev-1' }]);
      mocks.eventGroupFindMany.mockResolvedValueOnce([]);
      mocks.eventGroupCreateMany.mockResolvedValueOnce({ count: 1 });

      const req = new Request('http://localhost/api/events/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addToGroups',
          eventIds: ['ev-1'],
          groupIds: ['g-1'],
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true, affectedCount: 1 });
      expect(mocks.eventGroupCreateMany).toHaveBeenCalledWith({
        data: [{ eventId: 'ev-1', groupId: 'g-1' }],
        skipDuplicates: true,
      });
    });
  });
});

