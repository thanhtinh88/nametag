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

  // Compatibility collections
  groups?: unknown[];
  relationshipsFrom?: unknown[];
  relationshipsTo?: unknown[];
  customFieldValues?: unknown[];
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

