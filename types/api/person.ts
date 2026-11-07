export type ReminderType = 'ONCE' | 'RECURRING';
export type ReminderIntervalUnit = 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';

export interface PersonEmail {
  id: string;
  type: string;
  email: string;
}

export interface CreatePersonEmail {
  type: string;
  email: string;
}

export interface PersonPhone {
  id: string;
  type: string;
  number: string;
}

export interface CreatePersonPhone {
  type: string;
  number: string;
}

export interface PersonAddress {
  id: string;
  type: string;
  streetLine1?: string | null;
  streetLine2?: string | null;
  locality?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocodedAt?: string | null;
  geocodeStatus?: string | null;
}

export interface CreatePersonAddress {
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

export interface PersonSocialProfile {
  id: string;
  type: string;
  url?: string | null;
  network?: string | null;
  username?: string | null;
}

export interface CreatePersonSocialProfile {
  type: string;
  url?: string | null;
  network?: string | null;
  username?: string | null;
}

export interface PersonUrl {
  id: string;
  type: string;
  url: string;
}

export interface CreatePersonUrl {
  type: string;
  url: string;
}

export interface PersonImHandle {
  id: string;
  protocol: string;
  handle: string;
}

export interface CreatePersonImHandle {
  protocol: string;
  handle: string;
}

export interface PersonCustomField {
  id: string;
  key: string;
  value: string;
  type?: string | null;
}

export interface CreatePersonCustomField {
  key: string;
  value: string;
  type?: string | null;
}

export interface ImportantDate {
  id: string;
  personId: string;
  title: string;
  type?: string | null;
  date: string;
  yearUnknown?: boolean;
  reminderEnabled?: boolean;
  reminderType?: ReminderType | null;
  reminderInterval?: number | null;
  reminderIntervalUnit?: ReminderIntervalUnit | null;
  reminderLeadDays?: number | null;
  lastReminderSent?: string | null;
  lastLeadReminderSent?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateImportantDate {
  title: string;
  type?: string | null;
  date: string;
  yearUnknown?: boolean;
  reminderEnabled?: boolean;
  reminderType?: ReminderType | null;
  reminderInterval?: number | null;
  reminderIntervalUnit?: ReminderIntervalUnit | null;
  reminderLeadDays?: number | null;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PersonSummary {
  id: string;
  name: string;
  surname?: string | null;
  middleName?: string | null;
  secondLastName?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
  photo?: string | null;
}

export interface Person {
  id: string;
  name: string;
  surname?: string | null;
  middleName?: string | null;
  secondLastName?: string | null;
  nickname?: string | null;
  prefix?: string | null;
  suffix?: string | null;
  uid?: string | null;
  organization?: string | null;
  jobTitle?: string | null;
  photo?: string | null;
  gender?: string | null;
  anniversary?: string | null;
  lastContact?: string | null;
  notes?: string | null;
  relationshipToUserId?: string | null;
  contactReminderEnabled: boolean;
  contactReminderInterval?: number | null;
  contactReminderIntervalUnit?: ReminderIntervalUnit | null;
  lastContactReminderSent?: string | null;
  cardDavSyncEnabled: boolean;
  displayNameOverride?: string | null;

  // Investigation & Subject Monitoring Fields
  citizenId?: string | null;
  citizenIdIssueDate?: string | null;
  citizenIdIssuePlace?: string | null;
  residenceStatus?: string | null;
  managementLevel?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bloodType?: string | null;
  threatLevel?: string | null;
  modusOperandi?: string | null;
  riskNotes?: string | null;
  immichPersonId?: string | null;
  immichAlbumId?: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  emails: PersonEmail[];
  phoneNumbers: PersonPhone[];
  addresses: PersonAddress[];
  socialProfiles: PersonSocialProfile[];
  urls: PersonUrl[];
  imHandles: PersonImHandle[];
  customFields: PersonCustomField[];
  importantDates: ImportantDate[];

  // Investigation collections
  vehicles?: SuspectVehicle[];
  physicalMarks?: PhysicalMark[];
  criminalRecords?: CriminalRecord[];
  bankAccounts?: SuspectBankAccount[];

  // Compatibility collections
  groups?: unknown[];
  relationshipsFrom?: unknown[];
  relationshipsTo?: unknown[];
  customFieldValues?: unknown[];
  gangMemberships?: unknown[];
}

export interface PersonListResponse {
  people: Person[];
  pagination?: Pagination | null;
}

export interface SinglePersonResponse {
  person: Person;
}

export interface CreatePersonRequest {
  name: string;
  surname?: string | null;
  middleName?: string | null;
  secondLastName?: string | null;
  nickname?: string | null;
  prefix?: string | null;
  suffix?: string | null;
  uid?: string | null;
  organization?: string | null;
  jobTitle?: string | null;
  photo?: string | null;
  gender?: string | null;
  anniversary?: string | null;
  lastContact?: string | null;
  notes?: string | null;
  relationshipToUserId?: string | null;
  contactReminderEnabled?: boolean;
  contactReminderInterval?: number | null;
  contactReminderIntervalUnit?: ReminderIntervalUnit | null;
  cardDavSyncEnabled?: boolean;
  displayNameOverride?: string | null;
  cardDavDisplayName?: string | null;

  // Investigation
  citizenId?: string | null;
  citizenIdIssueDate?: string | null;
  citizenIdIssuePlace?: string | null;
  residenceStatus?: string | null;
  managementLevel?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bloodType?: string | null;
  threatLevel?: string | null;
  modusOperandi?: string | null;
  riskNotes?: string | null;
  immichPersonId?: string | null;
  immichAlbumId?: string | null;

  emails?: CreatePersonEmail[];
  phoneNumbers?: CreatePersonPhone[];
  addresses?: CreatePersonAddress[];
  socialProfiles?: CreatePersonSocialProfile[];
  urls?: CreatePersonUrl[];
  imHandles?: CreatePersonImHandle[];
  customFields?: CreatePersonCustomField[];
  importantDates?: CreateImportantDate[];
  groupIds?: string[];
}

export interface UpdatePersonRequest extends Partial<CreatePersonRequest> {}

export interface DeletePersonRequest {
  deleteOrphans?: boolean;
  orphanIds?: string[];
  deleteFromCardDav?: boolean;
}

// ─── Investigation Sub-resources ─────────────────────────────────────────────

export interface SuspectVehicle {
  id: string;
  personId: string;
  plateNumber: string;
  vehicleType: string;
  brandModel?: string | null;
  color?: string | null;
  identifyingFeatures?: string | null;
  registeredOwner?: string | null;
  isSuspicious: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSuspectVehicle {
  plateNumber: string;
  vehicleType: string;
  brandModel?: string | null;
  color?: string | null;
  identifyingFeatures?: string | null;
  registeredOwner?: string | null;
  isSuspicious?: boolean;
}

export interface UpdateSuspectVehicle extends Partial<CreateSuspectVehicle> {}

export interface PhysicalMark {
  id: string;
  personId: string;
  type: string;
  location: string;
  description: string;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhysicalMark {
  type: string;
  location: string;
  description: string;
  photoUrl?: string | null;
}

export interface UpdatePhysicalMark extends Partial<CreatePhysicalMark> {}

export interface CriminalRecord {
  id: string;
  personId: string;
  charge: string;
  recordType: string;
  sentenceDetail?: string | null;
  adjudicatedBy?: string | null;
  incidentDate?: string | null;
  verdictDate?: string | null;
  isPardoned: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCriminalRecord {
  charge: string;
  recordType?: string;
  sentenceDetail?: string | null;
  adjudicatedBy?: string | null;
  incidentDate?: string | null;
  verdictDate?: string | null;
  isPardoned?: boolean;
  notes?: string | null;
}

export interface UpdateCriminalRecord extends Partial<CreateCriminalRecord> {}

export interface SuspectBankAccount {
  id: string;
  personId: string;
  bankName: string;
  accountNumber: string;
  accountHolder?: string | null;
  accountType: string;
  isPrimary: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSuspectBankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder?: string | null;
  accountType?: string;
  isPrimary?: boolean;
  notes?: string | null;
}

export interface UpdateSuspectBankAccount extends Partial<CreateSuspectBankAccount> {}

// ─── Duplicates & Dismiss ────────────────────────────────────────────────────

export interface DismissDuplicateRequest {
  personAId: string;
  personBId: string;
}

export interface DuplicateCandidate {
  personId: string;
  name: string;
  surname?: string | null;
  similarity: number;
}

export interface DuplicatePersonItem {
  id: string;
  name: string;
  surname?: string | null;
}

export interface DuplicateGroup {
  people: DuplicatePersonItem[];
  similarity: number;
}

// ─── Merge ───────────────────────────────────────────────────────────────────

export interface MergeOverrides {
  name?: string;
  surname?: string | null;
  middleName?: string | null;
  secondLastName?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
  prefix?: string | null;
  suffix?: string | null;
  organization?: string | null;
  jobTitle?: string | null;
  gender?: string | null;
  photo?: string | null;
  notes?: string | null;
  anniversary?: string | null;
  lastContact?: string | null;
  relationshipToUserId?: string | null;
}

export interface MergePersonRequest {
  primaryId: string;
  secondaryId: string;
  fieldOverrides?: MergeOverrides;
}

// ─── Orphans ─────────────────────────────────────────────────────────────────

export interface PersonOrphan {
  id: string;
  fullName: string;
}

export interface BulkOrphansRequest {
  personIds?: string[];
  selectAll?: boolean;
}

export interface BulkOrphansResponse {
  orphans: PersonOrphan[];
  hasCardDavSync: boolean;
}

// ─── Search Index ────────────────────────────────────────────────────────────

export interface PersonSearchIndexItem {
  id: string;
  name: string;
  surname?: string | null;
  middleName?: string | null;
  secondLastName?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
  organization?: string | null;
  jobTitle?: string | null;
  notes?: string | null;
  photo?: string | null;
  citizenId?: string | null;
  modusOperandi?: string | null;
  vehicles: string;
  physicalMarks: string;
  criminalRecords: string;
  gangs: string;
  bankAccounts: string;
  phones: string;
  emails: string;
  addresses: string;
  urls: string;
  imHandles: string;
  groups: string;
  customFields: string;
}

// ─── Graph ───────────────────────────────────────────────────────────────────

export interface PersonGraphNode {
  id: string;
  label: string;
  groups: string[];
  colors: string[];
  isCenter: boolean;
  photo?: string | null;
  nodeType?: string;
  eventStatus?: string;
}

export interface PersonGraphEdge {
  source: string;
  target: string;
  type: string;
  color: string;
  lineStyle?: string;
  verificationStatus?: string;
  involvementType?: string;
  sourceLabel: string;
  targetLabel: string;
}

export interface PersonGraphResponse {
  nodes: PersonGraphNode[];
  edges: PersonGraphEdge[];
}

