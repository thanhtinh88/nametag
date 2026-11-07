import type { PersonSummary } from './group';

export type EventStatus = 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface GroupSummary {
  id: string;
  name: string;
  color?: string | null;
}

export interface EventGroupItem {
  eventId: string;
  groupId: string;
  addedAt: string;
  group?: GroupSummary | null;
}

export interface EventAddress {
  id: string;
  eventId?: string;
  type: string;
  streetLine1?: string | null;
  streetLine2?: string | null;
  locality?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocodeStatus?: string | null;
  geocodedAt?: string | null;
  geocodeHash?: string | null;
}

export interface EventUrl {
  id: string;
  eventId?: string;
  type: string;
  url: string;
}

export interface EventCustomField {
  id: string;
  eventId?: string;
  key: string;
  value: string;
  type?: string | null;
}

export interface EventParticipant {
  id: string;
  personId: string;
  eventId?: string;
  role?: string | null;
  involvementType?: string;
  verificationStatus?: string;
  confidence?: string | null;
  reasonForSuspicion?: string | null;
  alibi?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  person?: PersonSummary | null;
}

export interface JournalEntryInEvent {
  id: string;
  title: string;
  date: string;
  body: string;
  people?: Array<{ person?: PersonSummary | null }>;
}

export interface EventJournalEntry {
  id: string;
  journalEntryId: string;
  eventId: string;
  journalEntry?: JournalEntryInEvent | null;
}

export interface Event {
  id: string;
  userId: string;
  title: string;
  category?: string | null;
  status: EventStatus;
  startDate?: string | null;
  endDate?: string | null;
  hasTime: boolean;
  description?: string | null;
  photo?: string | null;
  immichAlbumId?: string | null;
  caseCode?: string | null;
  crimeType?: string | null;
  caseStatus?: string | null;
  incidentTimeNotes?: string | null;
  damageAssessment?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  groups: EventGroupItem[];
  addresses: EventAddress[];
  urls: EventUrl[];
  customFields: EventCustomField[];
  people: EventParticipant[];
  journalEntries?: EventJournalEntry[];
}

export interface EventListResponse {
  events: Event[];
}

export interface EventResponse {
  event: Event;
}

export interface EventAddressInput {
  type: string;
  streetLine1?: string | null;
  streetLine2?: string | null;
  locality?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface EventUrlInput {
  type: string;
  url: string;
}

export interface EventCustomFieldInput {
  key: string;
  value: string;
  type?: string | null;
}

export interface EventParticipantInput {
  personId: string;
  role?: string | null;
  involvementType?: string;
  verificationStatus?: string;
  confidence?: string | null;
  reasonForSuspicion?: string | null;
  alibi?: string | null;
  notes?: string | null;
}

export interface CreateEventRequest {
  title: string;
  category?: string | null;
  status?: EventStatus;
  startDate?: string | null;
  endDate?: string | null;
  hasTime?: boolean;
  description?: string | null;
  photo?: string | null;
  caseCode?: string | null;
  crimeType?: string | null;
  caseStatus?: string | null;
  incidentTimeNotes?: string | null;
  damageAssessment?: string | null;
  groupIds?: string[];
  addresses?: EventAddressInput[];
  urls?: EventUrlInput[];
  customFields?: EventCustomFieldInput[];
  participants?: EventParticipantInput[];
}

export interface UpdateEventRequest {
  title?: string;
  category?: string | null;
  status?: EventStatus;
  startDate?: string | null;
  endDate?: string | null;
  hasTime?: boolean;
  description?: string | null;
  photo?: string | null;
  caseCode?: string | null;
  crimeType?: string | null;
  caseStatus?: string | null;
  incidentTimeNotes?: string | null;
  damageAssessment?: string | null;
  groupIds?: string[];
  addresses?: EventAddressInput[];
  urls?: EventUrlInput[];
  customFields?: EventCustomFieldInput[];
  participants?: EventParticipantInput[];
}

export interface AddEventPersonRequest {
  personId: string;
  role?: string | null;
  involvementType?: string;
  verificationStatus?: string;
  confidence?: string | null;
  reasonForSuspicion?: string | null;
  alibi?: string | null;
  notes?: string | null;
}

export interface UpdateEventPersonRequest {
  id?: string;
  personId?: string;
  role?: string | null;
  involvementType?: string;
  verificationStatus?: string;
  confidence?: string | null;
  reasonForSuspicion?: string | null;
  alibi?: string | null;
  notes?: string | null;
}

export interface EventPersonResponse {
  personEvent: EventParticipant;
}

export interface BulkEventActionRequest {
  eventIds?: string[];
  selectAll?: boolean;
  action: 'delete' | 'setCaseStatus' | 'setEventStatus' | 'addToGroups' | 'removeFromGroups';
  caseStatus?: string;
  status?: EventStatus;
  groupIds?: string[];
}

export interface BulkEventActionResponse {
  success: boolean;
  affectedCount: number;
}

export interface EventDeleteResponse {
  message: string;
}

export interface EventPermanentDeleteResponse {
  success: boolean;
}

