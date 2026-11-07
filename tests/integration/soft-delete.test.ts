/**
 * Integration tests for soft delete and data retention functionality.
 * Tests verify:
 * - Soft delete sets deletedAt instead of removing records
 * - Soft-deleted items are filtered from normal queries
 * - Restore functionality works correctly
 * - Cascade delete with orphans
 * - Purge removes records older than retention period
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock data store to simulate database state
const mockDataStore = {
  people: new Map<string, any>(),
  groups: new Map<string, any>(),
  relationships: new Map<string, any>(),
  relationshipTypes: new Map<string, any>(),
  importantDates: new Map<string, any>(),
};

function resetStore() {
  mockDataStore.people.clear();
  mockDataStore.groups.clear();
  mockDataStore.relationships.clear();
  mockDataStore.relationshipTypes.clear();
  mockDataStore.importantDates.clear();
}

// Use vi.hoisted to create mocks before hoisting
const mocks = vi.hoisted(() => ({
  // Person operations
  personFindUnique: vi.fn(),
  personFindMany: vi.fn(),
  personUpdate: vi.fn(),
  personUpdateMany: vi.fn(),
  personDeleteMany: vi.fn(),
  // Group operations
  groupFindUnique: vi.fn(),
  groupFindMany: vi.fn(),
  groupUpdate: vi.fn(),
  groupDeleteMany: vi.fn(),
  // Relationship operations
  relationshipFindUnique: vi.fn(),
  relationshipFindFirst: vi.fn(),
  relationshipFindMany: vi.fn(),
  relationshipUpdate: vi.fn(),
  relationshipUpdateMany: vi.fn(),
  relationshipDeleteMany: vi.fn(),
  // RelationshipType operations
  relationshipTypeFindFirst: vi.fn(),
  relationshipTypeFindMany: vi.fn(),
  relationshipTypeUpdate: vi.fn(),
  relationshipTypeUpdateMany: vi.fn(),
  relationshipTypeDeleteMany: vi.fn(),
  // ImportantDate operations
  importantDateFindUnique: vi.fn(),
  importantDateFindMany: vi.fn(),
  importantDateUpdate: vi.fn(),
  importantDateDeleteMany: vi.fn(),
  // PersonGroup operations
  personGroupDeleteMany: vi.fn(),
  // CronJobLog operations
  cronJobLogCreate: vi.fn(),
  cronJobLogUpdate: vi.fn(),
  // CardDavMapping operations
  cardDavMappingDeleteMany: vi.fn(),
}));

// Hoist mockEnv so it's available for vi.mock
const mockEnv = vi.hoisted(() => ({
  CRON_SECRET: 'test-cron-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
}));

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    person: {
      findUnique: mocks.personFindUnique,
      findMany: mocks.personFindMany,
      update: mocks.personUpdate,
      updateMany: mocks.personUpdateMany,
      deleteMany: mocks.personDeleteMany,
    },
    group: {
      findUnique: mocks.groupFindUnique,
      findMany: mocks.groupFindMany,
      update: mocks.groupUpdate,
      deleteMany: mocks.groupDeleteMany,
    },
    relationship: {
      findUnique: mocks.relationshipFindUnique,
      findFirst: mocks.relationshipFindFirst,
      findMany: mocks.relationshipFindMany,
      update: mocks.relationshipUpdate,
      updateMany: mocks.relationshipUpdateMany,
      deleteMany: mocks.relationshipDeleteMany,
    },
    relationshipType: {
      findFirst: mocks.relationshipTypeFindFirst,
      findMany: mocks.relationshipTypeFindMany,
      update: mocks.relationshipTypeUpdate,
      updateMany: mocks.relationshipTypeUpdateMany,
      deleteMany: mocks.relationshipTypeDeleteMany,
    },
    importantDate: {
      findUnique: mocks.importantDateFindUnique,
      findMany: mocks.importantDateFindMany,
      update: mocks.importantDateUpdate,
      deleteMany: mocks.importantDateDeleteMany,
    },
    personGroup: {
      deleteMany: mocks.personGroupDeleteMany,
    },
    cronJobLog: {
      create: mocks.cronJobLogCreate,
      update: mocks.cronJobLogUpdate,
    },
    cardDavMapping: {
      deleteMany: mocks.cardDavMappingDeleteMany,
    },
  },
  // The trash routes scope ownership inside the lookup, so they use findFirst
  // where they once used findUnique. This double answers either the same way:
  // which method a given route picks is asserted in permanent-delete.test.ts,
  // while these tests are about restore and purge behaviour.
  prismaIncludingDeleted: {
    person: {
      findUnique: mocks.personFindUnique,
      findFirst: mocks.personFindUnique,
      findMany: mocks.personFindMany,
      update: mocks.personUpdate,
      updateMany: mocks.personUpdateMany,
      deleteMany: mocks.personDeleteMany,
    },
    group: {
      findUnique: mocks.groupFindUnique,
      findFirst: mocks.groupFindUnique,
      findMany: mocks.groupFindMany,
      update: mocks.groupUpdate,
      deleteMany: mocks.groupDeleteMany,
    },
    relationship: {
      findUnique: mocks.relationshipFindUnique,
      findFirst: mocks.relationshipFindFirst,
      findMany: mocks.relationshipFindMany,
      update: mocks.relationshipUpdate,
      updateMany: mocks.relationshipUpdateMany,
      deleteMany: mocks.relationshipDeleteMany,
    },
    relationshipType: {
      findFirst: mocks.relationshipTypeFindFirst,
      findMany: mocks.relationshipTypeFindMany,
      update: mocks.relationshipTypeUpdate,
      updateMany: mocks.relationshipTypeUpdateMany,
      deleteMany: mocks.relationshipTypeDeleteMany,
    },
    importantDate: {
      findUnique: mocks.importantDateFindUnique,
      findMany: mocks.importantDateFindMany,
      update: mocks.importantDateUpdate,
      deleteMany: mocks.importantDateDeleteMany,
    },
    personGroup: {
      deleteMany: mocks.personGroupDeleteMany,
    },
    cronJobLog: {
      create: mocks.cronJobLogCreate,
      update: mocks.cronJobLogUpdate,
    },
    $disconnect: vi.fn(),
  },
}));

// Mock auth
vi.mock('../../lib/auth', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
    })
  ),
}));

// Mock env for cron secret
vi.mock('../../lib/env', () => ({
  env: mockEnv,
  getEnv: () => mockEnv,
  getAppUrl: () => mockEnv.NEXTAUTH_URL,
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  createModuleLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  securityLogger: {
    authFailure: vi.fn(),
  },
}));

// Import routes after mocking
import { DELETE as deleteGroup } from '../../app/api/groups/[id]/route';
import { POST as restoreGroup } from '../../app/api/groups/[id]/restore/route';
import { DELETE as deleteRelationship } from '../../app/api/relationships/[id]/route';
import { POST as restoreRelationship } from '../../app/api/relationships/[id]/restore/route';
import { GET as listDeleted } from '../../app/api/deleted/route';
import { GET as purgeDeleted } from '../../app/api/cron/purge-deleted/route';

describe('Soft Delete Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();

    // Setup cronJobLog mocks
    mocks.cronJobLogCreate.mockResolvedValue({ id: 'cron-1' });
    mocks.cronJobLogUpdate.mockResolvedValue({ id: 'cron-1' });
  });

  describe('Relationship Soft Delete', () => {
    it('should soft delete both primary and inverse relationships', async () => {
      const relationship = {
        id: 'rel-1',
        personId: 'person-1',
        relatedPersonId: 'person-2',
        person: { id: 'person-1', userId: 'user-123' },
        deletedAt: null,
      };

      const inverseRelationship = {
        id: 'rel-2',
        personId: 'person-2',
        relatedPersonId: 'person-1',
        deletedAt: null,
      };

      mocks.relationshipFindUnique.mockResolvedValue(relationship);
      mocks.relationshipUpdate.mockResolvedValue({ ...relationship, deletedAt: new Date() });
      mocks.relationshipFindFirst.mockResolvedValue(inverseRelationship);

      const request = new Request('http://localhost/api/relationships/rel-1', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ id: 'rel-1' }) };

      const response = await deleteRelationship(request, context);

      expect(response.status).toBe(200);

      // Verify both relationships were soft deleted
      expect(mocks.relationshipUpdate).toHaveBeenCalledTimes(2);

      // Primary relationship
      expect(mocks.relationshipUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rel-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );

      // Inverse relationship
      expect(mocks.relationshipUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rel-2' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });

  describe('Relationship Restore', () => {
    it('should restore both primary and inverse relationships', async () => {
      const deletedRelationship = {
        id: 'rel-1',
        personId: 'person-1',
        relatedPersonId: 'person-2',
        person: { id: 'person-1', userId: 'user-123' },
        deletedAt: new Date('2024-01-01'),
      };

      const deletedInverse = {
        id: 'rel-2',
        personId: 'person-2',
        relatedPersonId: 'person-1',
        deletedAt: new Date('2024-01-01'),
      };

      mocks.relationshipFindUnique.mockResolvedValue(deletedRelationship);
      mocks.relationshipUpdate.mockResolvedValue({ ...deletedRelationship, deletedAt: null });
      mocks.relationshipFindFirst.mockResolvedValue(deletedInverse);

      const request = new Request('http://localhost/api/relationships/rel-1/restore', {
        method: 'POST',
      });
      const context = { params: Promise.resolve({ id: 'rel-1' }) };

      const response = await restoreRelationship(request, context);

      expect(response.status).toBe(200);

      // Verify both relationships were restored
      expect(mocks.relationshipUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Group Soft Delete and Restore', () => {
    it('should soft delete a group', async () => {
      const group = {
        id: 'group-1',
        name: 'Friends',
        userId: 'user-123',
        deletedAt: null,
      };

      mocks.groupFindUnique.mockResolvedValue(group);
      mocks.groupUpdate.mockResolvedValue({ ...group, deletedAt: new Date() });

      const request = new Request('http://localhost/api/groups/group-1', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ id: 'group-1' }) };

      const response = await deleteGroup(request, context);

      expect(response.status).toBe(200);
      expect(mocks.groupUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it('should restore a soft-deleted group', async () => {
      const deletedGroup = {
        id: 'group-1',
        name: 'Friends',
        userId: 'user-123',
        deletedAt: new Date('2024-01-01'),
      };

      mocks.groupFindUnique.mockResolvedValue(deletedGroup);
      mocks.groupUpdate.mockResolvedValue({ ...deletedGroup, deletedAt: null });

      const request = new Request('http://localhost/api/groups/group-1/restore', {
        method: 'POST',
      });
      const context = { params: Promise.resolve({ id: 'group-1' }) };

      const response = await restoreGroup(request, context);

      expect(response.status).toBe(200);
      expect(mocks.groupUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { deletedAt: null },
        })
      );
    });
  });

  describe('List Deleted Items', () => {
    it('should return deleted people', async () => {
      const deletedPeople = [
        { id: 'person-1', name: 'John', surname: 'Doe', deletedAt: new Date() },
        { id: 'person-2', name: 'Jane', surname: 'Smith', deletedAt: new Date() },
      ];

      mocks.personFindMany.mockResolvedValue(deletedPeople);

      const request = new Request('http://localhost/api/deleted?type=people');
      const response = await listDeleted(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.deleted).toHaveLength(2);
      expect(body.retentionDays).toBe(30);
    });

    it('should return deleted groups', async () => {
      mocks.groupFindMany.mockResolvedValue([
        { id: 'group-1', name: 'Friends', deletedAt: new Date() },
      ]);

      const request = new Request('http://localhost/api/deleted?type=groups');
      const response = await listDeleted(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.deleted).toHaveLength(1);
    });

    it('should return error for invalid type', async () => {
      const request = new Request('http://localhost/api/deleted?type=invalid');
      const response = await listDeleted(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Invalid type');
    });
  });

  describe('Purge Deleted Records', () => {
    it('should require valid cron secret', async () => {
      const request = new Request('http://localhost/api/cron/purge-deleted', {
        headers: { authorization: 'Bearer invalid-secret' },
      });

      const response = await purgeDeleted(request);

      expect(response.status).toBe(401);
    });

    it('should permanently delete records older than retention period', async () => {
      // Mock records to be purged
      const oldPersons = [{ id: 'person-old' }];

      mocks.importantDateDeleteMany.mockResolvedValue({ count: 5 });
      mocks.personFindMany.mockResolvedValue(oldPersons);
      mocks.personGroupDeleteMany.mockResolvedValue({ count: 3 });
      mocks.relationshipDeleteMany.mockResolvedValue({ count: 10 });
      mocks.groupFindMany.mockResolvedValue([]);
      mocks.groupDeleteMany.mockResolvedValue({ count: 2 });
      mocks.relationshipTypeFindMany.mockResolvedValue([]);
      mocks.relationshipTypeDeleteMany.mockResolvedValue({ count: 1 });
      mocks.personDeleteMany.mockResolvedValue({ count: 4 });
      mocks.personUpdateMany.mockResolvedValue({ count: 0 });
      mocks.relationshipUpdateMany.mockResolvedValue({ count: 0 });
      mocks.relationshipTypeUpdateMany.mockResolvedValue({ count: 0 });

      const request = new Request('http://localhost/api/cron/purge-deleted', {
        headers: { authorization: 'Bearer test-cron-secret' },
      });

      const response = await purgeDeleted(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.purged).toBeDefined();

      // Verify deleteMany was called for permanent deletion
      expect(mocks.personDeleteMany).toHaveBeenCalled();
      expect(mocks.groupDeleteMany).toHaveBeenCalled();
      expect(mocks.relationshipDeleteMany).toHaveBeenCalled();
    });

    it('should clean up related data when purging persons', async () => {
      const oldPersons = [{ id: 'person-old-1' }, { id: 'person-old-2' }];

      mocks.personFindMany.mockResolvedValue(oldPersons);
      mocks.groupFindMany.mockResolvedValue([]);
      mocks.relationshipTypeFindMany.mockResolvedValue([]);
      mocks.importantDateDeleteMany.mockResolvedValue({ count: 0 });
      mocks.personGroupDeleteMany.mockResolvedValue({ count: 0 });
      mocks.relationshipDeleteMany.mockResolvedValue({ count: 0 });
      mocks.groupDeleteMany.mockResolvedValue({ count: 0 });
      mocks.relationshipTypeDeleteMany.mockResolvedValue({ count: 0 });
      mocks.personDeleteMany.mockResolvedValue({ count: 2 });
      mocks.personUpdateMany.mockResolvedValue({ count: 0 });
      mocks.relationshipUpdateMany.mockResolvedValue({ count: 0 });
      mocks.relationshipTypeUpdateMany.mockResolvedValue({ count: 0 });

      const request = new Request('http://localhost/api/cron/purge-deleted', {
        headers: { authorization: 'Bearer test-cron-secret' },
      });

      await purgeDeleted(request);

      // Verify PersonGroups are deleted for persons being purged
      expect(mocks.personGroupDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { personId: { in: ['person-old-1', 'person-old-2'] } },
        })
      );

      // Verify orphaned ImportantDates are deleted
      expect(mocks.importantDateDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { personId: { in: ['person-old-1', 'person-old-2'] } },
        })
      );
    });
  });

});
