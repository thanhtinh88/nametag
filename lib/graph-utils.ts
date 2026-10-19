import { Prisma } from '@prisma/client';
import { formatGraphName, type NameDisplayFormat } from './nameUtils';
import type { PersonTacticalData } from './filters/person-filter-types';

export interface GraphNode extends PersonTacticalData {
  id: string;
  label: string;
  groups: string[];
  colors: string[];
  isCenter: boolean;
  photo?: string | null;
  nodeType?: 'person' | 'event' | 'user';
  eventStatus?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  color: string;
  sourceLabel?: string;
  targetLabel?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  verificationStatus?: string;
  involvementType?: string;
}

type PersonId = Prisma.PersonGetPayload<{
  select: { id: true };
}>;

type RelationshipToUser = Prisma.RelationshipTypeGetPayload<{
  select: { label: true; color: true };
}>;

type InverseRelationship = RelationshipToUser;

interface PersonWithRelationshipToUser extends PersonId {
  relationshipToUser:
    | (RelationshipToUser & {
        inverse: InverseRelationship | null;
      })
    | null;
}

/**
 * Converts a person's relationship to the user into graph edges.
 */
export function relationshipsWithUserToGraphEdges(
  person: PersonWithRelationshipToUser,
  userId: string,
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  if (person.relationshipToUser) {
    // Add edge from person to user (their relationship to you)
    edges.push({
      source: person.id,
      target: userId,
      type: person.relationshipToUser.label,
      color: person.relationshipToUser.color || '#9CA3AF',
    });

    // Add edge from user to person (your relationship to them)
    // Use inverse type if available, otherwise use the type itself
    // (correct for symmetric types where the inverse IS the same type)
    const inverseType = person.relationshipToUser.inverse || person.relationshipToUser;
    edges.push({
      source: userId,
      target: person.id,
      type: inverseType.label,
      color: inverseType.color || '#9CA3AF',
    });
  }
  return edges;
}

type Relationship = Prisma.RelationshipGetPayload<{
  select: {
    personId: true;
    relatedPersonId: true;
    relationshipType: { select: { label: true; color: true } };
  };
}>;

/**
 * Converts a relationship into a graph edge.
 * Returns undefined if the relationship type is missing.
 */
export function relationshipToGraphEdge(
  relationship: Relationship,
): GraphEdge | undefined {
  if (!relationship.relationshipType) {
    return;
  }
  return {
    source: relationship.personId,
    target: relationship.relatedPersonId,
    type: relationship.relationshipType.label,
    color: relationship.relationshipType.color || '#999999',
  };
}

interface RelationshipWithInverse extends Relationship {
  relationshipType:
    | (Relationship['relationshipType'] & {
        inverse: InverseRelationship | null;
      })
    | null;
}

/**
 * Converts the inverse relationship into a graph edge
 * E.g., if the relationship is "parent", this creates
 * the "child" edge.
 * Returns undefined if there is no inverse relationship.
 */
export function inverseRelationshipToGraphEdge(
  relationship: RelationshipWithInverse,
): GraphEdge | undefined {
  if (!relationship.relationshipType) {
    return;
  }
  // Use inverse type if available, otherwise use the type itself
  // (correct for symmetric types where the inverse IS the same type)
  const inverseType = relationship.relationshipType.inverse || relationship.relationshipType;
  return {
    source: relationship.relatedPersonId,
    target: relationship.personId,
    type: inverseType.label,
    color: inverseType.color || '#999999',
  };
}

type Group = Prisma.GroupGetPayload<{
  select: { id: true; name: true; color: true };
}>;

interface Person
  extends Prisma.PersonGetPayload<{
    select: { id: true; name: true; surname: true; nickname: true; displayNameOverride: true; photo: true };
  }> {
  middleName?: string | null;
  groups: { group: Group }[];
  managementLevel?: string | null;
  threatLevel?: string | null;
  residenceStatus?: string | null;
  gender?: string | null;
  criminalRecords?: Array<{ id: string; charge: string; recordType: string; isPardoned: boolean }>;
  gangMemberships?: Array<{ gangId: string; role: string; gang?: { id: string; name: string; color: string | null } }>;
  vehicles?: Array<{ id: string; vehicleType: string; plateNumber: string; isSuspicious: boolean }>;
  physicalMarks?: Array<{ id: string; type: string; location: string }>;
  bankAccounts?: Array<{ id: string; accountType: string }>;
  events?: Array<{
    eventId: string;
    involvementType?: string;
    verificationStatus?: string;
    confidence?: string | null;
    role?: string | null;
  }>;
}

export function personToGraphNode(
  person: Person,
  isCenter = false,
  nameOrder?: 'WESTERN' | 'EASTERN',
  nameDisplayFormat?: NameDisplayFormat
): GraphNode {
  return {
    id: person.id,
    label: formatGraphName(person, nameOrder, nameDisplayFormat),
    groups: person.groups.map((pg) => pg.group.id),
    colors: person.groups.map((pg) => pg.group.color || '#3B82F6'),
    isCenter,
    photo: person.photo,
    managementLevel: person.managementLevel,
    threatLevel: person.threatLevel,
    residenceStatus: person.residenceStatus,
    gender: person.gender,
    hasCriminalRecord: (person.criminalRecords && person.criminalRecords.length > 0) || false,
    criminalRecordCharges: person.criminalRecords?.map((r) => r.charge) ?? [],
    hasActiveConviction: person.criminalRecords?.some((r) => r.recordType === 'CONVICTION' && !r.isPardoned) ?? false,
    gangIds: person.gangMemberships?.map((g) => g.gangId) ?? [],
    gangRoles: person.gangMemberships?.map((g) => g.role) ?? [],
    hasSuspiciousVehicle: person.vehicles?.some((v) => v.isSuspicious) ?? false,
    vehicleTypes: person.vehicles?.map((v) => v.vehicleType) ?? [],
    markTypes: person.physicalMarks?.map((m) => m.type) ?? [],
    hasMuleAccount: person.bankAccounts?.some((b) => b.accountType === 'MULE' || b.accountType === 'SUSPICIOUS') ?? false,
    caseLinks: person.events?.map((e) => ({
      eventId: e.eventId,
      involvementType: e.involvementType,
      verificationStatus: e.verificationStatus,
      confidence: e.confidence,
      role: e.role,
    })) ?? [],
  };
}

export function userToGraphNode(id: string, isCenter = false, photo?: string | null): GraphNode {
  return {
    id,
    label: 'You',
    groups: [],
    colors: [],
    isCenter,
    photo: photo || undefined,
  };
}
