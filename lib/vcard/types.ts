export interface PersonPhone {
  type: string;
  number: string;
}

export interface PersonEmail {
  type: string;
  email: string;
}

export interface SerializablePersonAddress {
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

export interface PersonUrl {
  type: string;
  url: string;
}

export interface PersonIM {
  protocol: string;
  handle: string;
}

export interface SerializablePersonLocation {
  type: string;
  latitude: number;
  longitude: number;
  label?: string | null;
}

export interface PersonCustomField {
  key: string;
  value: string;
  type?: string | null;
}

export interface PersonCustomFieldValue {
  template: {
    slug: string;
    type: string;
    deletedAt?: Date | string | null;
  };
  value: string;
}

export interface ImportantDate {
  id: string;
  title: string;
  date: Date | string;
  yearUnknown?: boolean;
  type?: string | null;
  deletedAt?: Date | string | null;
}

export interface PersonWithRelations {
  id: string;
  uid?: string;
  name: string;
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
  notes?: string | null;
  photo?: string | null;
  anniversary?: Date | string | null;
  phoneNumbers: PersonPhone[];
  emails: PersonEmail[];
  addresses: SerializablePersonAddress[];
  urls: PersonUrl[];
  imHandles?: PersonIM[];
  locations?: SerializablePersonLocation[];
  customFields?: PersonCustomField[];
  customFieldValues?: PersonCustomFieldValue[];
  importantDates?: ImportantDate[];
  relationshipsFrom?: Array<{
    relatedPerson: { name: string; surname?: string | null };
    relationshipType?: { label: string } | null;
  }>;
  groups?: Array<{
    group: { name: string };
  }>;
}

export interface ParsedVCardData {
  name: string;
  surname?: string;
  secondLastName?: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
  nickname?: string;
  uid?: string;
  organization?: string;
  jobTitle?: string;
  photo?: string;
  gender?: string;
  notes?: string;
  anniversary?: Date;
  lastContact?: Date;
  phoneNumbers: { type: string; number: string }[];
  emails: { type: string; email: string }[];
  addresses: {
    type: string;
    streetLine1?: string;
    streetLine2?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }[];
  urls: { type: string; url: string }[];
  imHandles: { protocol: string; handle: string }[];
  locations: Array<{
    type: string;
    latitude: number;
    longitude: number;
    label?: string | null;
  }>;
  categories: string[];
  customFields: { key: string; value: string; type?: string }[];
  customFieldValues: { slug: string; value: string }[];
  importantDates: {
    title: string;
    date: Date;
    yearUnknown?: boolean;
    type?: string | null;
  }[];
}
