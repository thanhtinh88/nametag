import type { PersonSummary } from './group';

export interface JournalEventSummary {
  id: string;
  title: string;
  status?: string;
  category?: string | null;
}

export interface JournalEntryPerson {
  id: string;
  journalEntryId: string;
  personId: string;
  person?: PersonSummary | null;
}

export interface JournalEntryEvent {
  id: string;
  journalEntryId: string;
  eventId: string;
  event?: JournalEventSummary | null;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  date: string;
  hasTime: boolean;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  people: JournalEntryPerson[];
  events: JournalEntryEvent[];
}

export interface JournalPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface JournalListResponse {
  entries: JournalEntry[];
  pagination: JournalPagination;
}

export interface JournalEntryResponse {
  entry: JournalEntry;
}

export interface CreateJournalEntryRequest {
  title: string;
  date: string;
  hasTime?: boolean;
  body: string;
  personIds?: string[];
  eventIds?: string[];
  updateLastContact?: boolean;
}

export interface UpdateJournalEntryRequest {
  title?: string;
  date?: string;
  hasTime?: boolean;
  body?: string;
  personIds?: string[];
  eventIds?: string[];
  updateLastContact?: boolean;
}

export interface JournalDeleteResponse {
  message: string;
}

export interface JournalPermanentDeleteResponse {
  success: boolean;
}

