export type Theme = 'LIGHT' | 'DARK';
export type DateFormat = 'MDY' | 'DMY' | 'YMD';
export type NameOrder = 'WESTERN' | 'EASTERN';
export type NameDisplayFormat = 'FULL' | 'NICKNAME_PREFERRED' | 'SHORT';
export type GraphMode = 'individuals' | 'bubbles';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  theme: Theme;
  dateFormat: DateFormat;
  language?: string | null;
  nameOrder: NameOrder;
  nameDisplayFormat: NameDisplayFormat;
  graphMode?: GraphMode | null;
  geocodingEnabled: boolean;
  defaultReminderLeadDays: number;
  weeklyDigestEnabled: boolean;
  weeklyDigestWeekday: number;
  photo?: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileResponse {
  user: UserProfile;
}

export interface UpdateProfileRequest {
  name: string;
  surname?: string | null;
  nickname?: string | null;
  email: string;
}

export interface UpdateProfileResponse {
  user: UserProfile;
  emailChanged: boolean;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateThemeRequest {
  theme: Theme;
}

export interface UpdateThemeResponse {
  user: {
    id: string;
    theme: Theme;
  };
}

export interface UpdateLanguageRequest {
  language: string;
}

export interface UpdateLanguageResponse {
  success: boolean;
  language: string;
}

export interface UpdateDateFormatRequest {
  dateFormat: DateFormat;
}

export interface UpdateDateFormatResponse {
  user: {
    id: string;
    dateFormat: DateFormat;
  };
}

export interface UpdateNameOrderRequest {
  nameOrder: NameOrder;
}

export interface UpdateNameOrderResponse {
  user: {
    id: string;
    nameOrder: NameOrder;
  };
}

export interface UpdateNameDisplayFormatRequest {
  nameDisplayFormat: NameDisplayFormat;
}

export interface UpdateNameDisplayFormatResponse {
  user: {
    id: string;
    nameDisplayFormat: NameDisplayFormat;
  };
}

export interface UpdateGraphDisplayRequest {
  graphMode?: GraphMode | null;
}

export interface UpdateGraphDisplayResponse {
  user: {
    id: string;
    graphMode?: GraphMode | null;
  };
}

export interface UpdateGeocodingRequest {
  geocodingEnabled: boolean;
}

export interface UpdateGeocodingResponse {
  user: {
    id: string;
    geocodingEnabled: boolean;
  };
}

export interface UpdateReminderLeadDaysRequest {
  days: number;
}

export interface UpdateReminderLeadDaysResponse {
  user: {
    id: string;
    defaultReminderLeadDays: number;
  };
}

export interface UpdateWeeklyDigestRequest {
  enabled: boolean;
  weekday: number;
}

export interface UpdateWeeklyDigestResponse {
  user: {
    id: string;
    weeklyDigestEnabled: boolean;
    weeklyDigestWeekday: number;
  };
}

export interface DeleteAccountRequest {
  password?: string;
  confirmationText: string;
}

export interface DeleteAccountResponse {
  message: string;
  success: boolean;
}

