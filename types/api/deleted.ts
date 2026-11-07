export interface DeletedItemPersonSummary {
  id: string;
  name: string;
  surname: string | null;
}

export interface DeletedPerson {
  id: string;
  name: string;
  surname: string | null;
  nickname: string | null;
  displayNameOverride: string | null;
  deletedAt: string;
}

export interface DeletedGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  deletedAt: string;
}

export interface DeletedRelationship {
  id: string;
  deletedAt: string;
  person: DeletedItemPersonSummary;
  relatedPerson: DeletedItemPersonSummary;
  relationshipType: { id: string; label: string } | null;
}

export interface DeletedRelationshipType {
  id: string;
  name: string;
  label: string;
  color: string | null;
  deletedAt: string;
}

export interface DeletedImportantDate {
  id: string;
  title: string;
  date: string;
  deletedAt: string;
  person: DeletedItemPersonSummary;
}

export interface DeletedEvent {
  id: string;
  title: string;
  category: string | null;
  status: string;
  deletedAt: string;
}

export interface DeletedGang {
  id: string;
  name: string;
  color: string | null;
  deletedAt: string;
}

export interface DeletedCustomFieldTemplate {
  id: string;
  name: string;
  slug: string;
  type: string;
  deletedAt: string;
}

export type DeletedItem =
  | DeletedPerson
  | DeletedGroup
  | DeletedRelationship
  | DeletedRelationshipType
  | DeletedImportantDate
  | DeletedEvent
  | DeletedGang
  | DeletedCustomFieldTemplate;

export interface DeletedResponse {
  deleted: DeletedItem[];
  retentionDays: number;
  cutoffDate: string;
}

