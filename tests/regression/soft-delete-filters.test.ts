/**
 * Regression tests for soft-delete filtering.
 *
 * These tests verify that `deletedAt: null` is included in Prisma queries
 * for the highest-risk read paths. If a future change accidentally removes
 * a soft-delete filter, these tests will catch it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Shared mock factories (hoisted so vi.mock can reference them)
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  // Person
  personFindMany: vi.fn(),
  personFindFirst: vi.fn(),
  personCount: vi.fn(),
  personFindUnique: vi.fn(),
  // Group
  groupFindMany: vi.fn(),
  groupFindFirst: vi.fn(),
  groupCount: vi.fn(),
  groupCreate: vi.fn(),
  // Relationship
  relationshipFindFirst: vi.fn(),
  relationshipCreate: vi.fn(),
  // RelationshipType
  relationshipTypeFindMany: vi.fn(),
  relationshipTypeFindFirst: vi.fn(),
  relationshipTypeCreate: vi.fn(),
  relationshipTypeUpdate: vi.fn(),
  // User
  userFindUnique: vi.fn(),
  // Upcoming events helper
  getUpcomingEvents: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock Prisma — only the models/methods exercised by the routes under test
// ---------------------------------------------------------------------------
vi.mock('../../lib/prisma', () => ({
  prisma: {
    person: {
      findMany: mocks.personFindMany,
      findFirst: mocks.personFindFirst,
      findUnique: mocks.personFindUnique,
      count: mocks.personCount,
    },
    group: {
      findMany: mocks.groupFindMany,
      findFirst: mocks.groupFindFirst,
      count: mocks.groupCount,
      create: mocks.groupCreate,
    },
    relationship: {
      findFirst: mocks.relationshipFindFirst,
      create: mocks.relationshipCreate,
    },
    relationshipType: {
      findMany: mocks.relationshipTypeFindMany,
      findFirst: mocks.relationshipTypeFindFirst,
      create: mocks.relationshipTypeCreate,
      update: mocks.relationshipTypeUpdate,
    },
    user: {
      findUnique: mocks.userFindUnique,
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock auth — always returns a valid session with user-123
// ---------------------------------------------------------------------------
vi.mock('../../lib/auth', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
    })
  ),
}));

// ---------------------------------------------------------------------------
// Mock billing — allow everything
// ---------------------------------------------------------------------------
vi.mock('../../lib/billing', () => ({
  canCreateResource: vi.fn(() =>
    Promise.resolve({ allowed: true, current: 0, limit: 50, tier: 'FREE', isUnlimited: false })
  ),
  canEnableReminder: vi.fn(() =>
    Promise.resolve({ allowed: true, current: 0, limit: 5, isUnlimited: false })
  ),
  getUserUsage: vi.fn(() =>
    Promise.resolve({ people: 0, groups: 0, reminders: 0 })
  ),
}));

// ---------------------------------------------------------------------------
// Mock features — needed for import/validate route (SaaS mode)
// ---------------------------------------------------------------------------
vi.mock('../../lib/features', () => ({
  isSaasMode: vi.fn(() => true),
  isFeatureEnabled: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Mock upcoming-events helper used by dashboard stats
// ---------------------------------------------------------------------------
vi.mock('../../lib/upcoming-events', () => ({
  getUpcomingEvents: (...args: unknown[]) => mocks.getUpcomingEvents(...args),
}));

// ---------------------------------------------------------------------------
// Import route handlers *after* all mocks are in place
// ---------------------------------------------------------------------------
import { GET as getDashboardStats } from '../../app/api/dashboard/stats/route';
import { GET as exportData } from '../../app/api/user/export/route';
import { POST as validateImport } from '../../app/api/user/import/validate/route';

// ===========================================================================
// Tests
// ===========================================================================
describe('Soft-delete filter regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 5. GET /api/dashboard/stats
  // -------------------------------------------------------------------------
  describe('GET /api/dashboard/stats', () => {
    beforeEach(() => {
      mocks.getUpcomingEvents.mockResolvedValue([]);
    });

    it('should include deletedAt: null in person.count where clause', async () => {
      mocks.personCount.mockResolvedValue(0);
      mocks.groupCount.mockResolvedValue(0);

      const request = new Request('http://localhost/api/dashboard/stats');
      await getDashboardStats(request);

      expect(mocks.personCount).toHaveBeenCalledTimes(1);
      const callArg = mocks.personCount.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('deletedAt', null);
    });

    it('should include deletedAt: null in group.count where clause', async () => {
      mocks.personCount.mockResolvedValue(0);
      mocks.groupCount.mockResolvedValue(0);

      const request = new Request('http://localhost/api/dashboard/stats');
      await getDashboardStats(request);

      expect(mocks.groupCount).toHaveBeenCalledTimes(1);
      const callArg = mocks.groupCount.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('deletedAt', null);
    });
  });

  // -------------------------------------------------------------------------
  // 6. GET /api/user/export
  // -------------------------------------------------------------------------
  describe('GET /api/user/export', () => {
    beforeEach(() => {
      mocks.userFindUnique.mockResolvedValue({
        email: 'test@example.com',
        name: 'Test',
        theme: 'LIGHT',
        dateFormat: 'MDY',
        createdAt: new Date(),
      });
    });

    it('should include deletedAt: null in person.findMany where clause', async () => {
      mocks.personFindMany.mockResolvedValue([]);
      mocks.groupFindMany.mockResolvedValue([]);
      mocks.relationshipTypeFindMany.mockResolvedValue([]);

      const request = new Request('http://localhost/api/user/export');
      await exportData(request);

      expect(mocks.personFindMany).toHaveBeenCalledTimes(1);
      const callArg = mocks.personFindMany.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('deletedAt', null);
    });

    it('should include deletedAt: null in group.findMany where clause', async () => {
      mocks.personFindMany.mockResolvedValue([]);
      mocks.groupFindMany.mockResolvedValue([]);
      mocks.relationshipTypeFindMany.mockResolvedValue([]);

      const request = new Request('http://localhost/api/user/export');
      await exportData(request);

      expect(mocks.groupFindMany).toHaveBeenCalledTimes(1);
      const callArg = mocks.groupFindMany.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('deletedAt', null);
    });

    it('should include deletedAt: null in relationshipType.findMany where clause', async () => {
      mocks.personFindMany.mockResolvedValue([]);
      mocks.groupFindMany.mockResolvedValue([]);
      mocks.relationshipTypeFindMany.mockResolvedValue([]);

      const request = new Request('http://localhost/api/user/export');
      await exportData(request);

      expect(mocks.relationshipTypeFindMany).toHaveBeenCalledTimes(1);
      const callArg = mocks.relationshipTypeFindMany.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('deletedAt', null);
    });

    it('should include deletedAt: null in nested relationshipsFrom include', async () => {
      mocks.personFindMany.mockResolvedValue([]);
      mocks.groupFindMany.mockResolvedValue([]);
      mocks.relationshipTypeFindMany.mockResolvedValue([]);

      const request = new Request('http://localhost/api/user/export');
      await exportData(request);

      expect(mocks.personFindMany).toHaveBeenCalledTimes(1);
      const callArg = mocks.personFindMany.mock.calls[0][0];
      expect(callArg.include.relationshipsFrom).toHaveProperty('where');
      expect(callArg.include.relationshipsFrom.where).toHaveProperty('deletedAt', null);
    });

    it('should include deletedAt: null in nested importantDates include', async () => {
      mocks.personFindMany.mockResolvedValue([]);
      mocks.groupFindMany.mockResolvedValue([]);
      mocks.relationshipTypeFindMany.mockResolvedValue([]);

      const request = new Request('http://localhost/api/user/export');
      await exportData(request);

      expect(mocks.personFindMany).toHaveBeenCalledTimes(1);
      const callArg = mocks.personFindMany.mock.calls[0][0];
      expect(callArg.include.importantDates).toHaveProperty('where');
      expect(callArg.include.importantDates.where).toHaveProperty('deletedAt', null);
    });

    it('should filter soft-deleted groups in nested groups include (issue #255)', async () => {
      mocks.personFindMany.mockResolvedValue([]);
      mocks.groupFindMany.mockResolvedValue([]);
      mocks.relationshipTypeFindMany.mockResolvedValue([]);

      const request = new Request('http://localhost/api/user/export');
      await exportData(request);

      expect(mocks.personFindMany).toHaveBeenCalledTimes(1);
      const callArg = mocks.personFindMany.mock.calls[0][0];
      expect(callArg.include.groups).toHaveProperty('where');
      expect(callArg.include.groups.where).toEqual({ group: { deletedAt: null } });
    });
  });

  // -------------------------------------------------------------------------
  // 9. POST /api/user/import/validate
  // -------------------------------------------------------------------------
  describe('POST /api/user/import/validate', () => {
    it('should include deletedAt: null in person.findFirst dedup check', async () => {
      // Return null so the person is counted as new
      mocks.personFindFirst.mockResolvedValue(null);
      mocks.groupFindFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/user/import/validate', {
        method: 'POST',
        body: JSON.stringify({
          version: '1.0',
          exportDate: new Date().toISOString(),
          people: [{
            id: 'person-1',
            name: 'John',
            surname: 'Doe',
            groups: [],
            relationships: [],
          }],
          groups: [],
        }),
        headers: { 'content-type': 'application/json' },
      });

      await validateImport(request);

      expect(mocks.personFindFirst).toHaveBeenCalledTimes(1);
      const callArg = mocks.personFindFirst.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('deletedAt', null);
    });

    it('should include deletedAt: null in group.findFirst dedup check', async () => {
      mocks.personFindFirst.mockResolvedValue(null);
      mocks.groupFindFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/user/import/validate', {
        method: 'POST',
        body: JSON.stringify({
          version: '1.0',
          exportDate: new Date().toISOString(),
          people: [],
          groups: [{ id: 'group-1', name: 'Family' }],
        }),
        headers: { 'content-type': 'application/json' },
      });

      await validateImport(request);

      expect(mocks.groupFindFirst).toHaveBeenCalledTimes(1);
      const callArg = mocks.groupFindFirst.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('deletedAt', null);
    });
  });
});
