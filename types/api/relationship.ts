import type { PersonSummary } from './group';

export type VerificationStatus = 'UNVERIFIED' | 'INVESTIGATING' | 'CONFIRMED' | 'RULED_OUT';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type RelationshipCategory = 'CRIMINAL' | 'FINANCIAL' | 'FAMILY' | 'LEGAL_CASE' | 'SOCIAL';
export type DirectionType = 'DIRECTED' | 'BIDIRECTIONAL';
export type LineStyle = 'SOLID' | 'DASHED' | 'DOTTED';

export interface RelationshipTypeSummary {
  id: string;
  name: string;
  label: string;
  color?: string | null;
}

export interface RelationshipType {
  id: string;
  userId: string;
  name: string;
  label: string;
  category: RelationshipCategory;
  directionType: DirectionType;
  lineStyle?: LineStyle | null;
  color?: string | null;
  inverseId?: string | null;
  inverse?: RelationshipTypeSummary | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface RelationshipTypeListResponse {
  relationshipTypes: RelationshipType[];
}

export interface RelationshipTypeResponse {
  relationshipType: RelationshipType;
}

export interface CreateRelationshipTypeRequest {
  name: string;
  label: string;
  category?: RelationshipCategory;
  directionType?: DirectionType;
  lineStyle?: LineStyle | null;
  color?: string | null;
  inverseId?: string | null;
  inverseLabel?: string | null;
  symmetric?: boolean;
}

export interface UpdateRelationshipTypeRequest {
  name: string;
  label: string;
  category?: RelationshipCategory;
  directionType?: DirectionType;
  lineStyle?: LineStyle | null;
  color?: string | null;
  inverseId?: string | null;
  inverseLabel?: string | null;
  symmetric?: boolean;
}

export interface Relationship {
  id: string;
  personId: string;
  relatedPersonId: string;
  relationshipTypeId?: string | null;
  verificationStatus: VerificationStatus;
  confidence?: ConfidenceLevel | null;
  startDate?: string | null;
  endDate?: string | null;
  source?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  person?: PersonSummary | null;
  relatedPerson?: PersonSummary | null;
  relationshipType?: RelationshipTypeSummary | null;
}

export interface RelationshipListResponse {
  relationships: Relationship[];
}

export interface RelationshipResponse {
  relationship: Relationship;
}

export interface CreateRelationshipRequest {
  personId: string;
  relatedPersonId: string;
  relationshipTypeId: string;
  verificationStatus?: VerificationStatus;
  confidence?: ConfidenceLevel | null;
  startDate?: string | null;
  endDate?: string | null;
  source?: string | null;
  notes?: string | null;
}

export interface UpdateRelationshipRequest {
  relationshipTypeId?: string | null;
  verificationStatus?: VerificationStatus;
  confidence?: ConfidenceLevel | null;
  startDate?: string | null;
  endDate?: string | null;
  source?: string | null;
  notes?: string | null;
}

export interface RelationshipDeleteResponse {
  message: string;
}

export interface RelationshipPermanentDeleteResponse {
  success: boolean;
}

