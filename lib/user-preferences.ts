import { cache } from 'react';
import { apiServer } from '@/lib/backend/api-client';
import type { Theme } from '@/lib/theme-colors';
import type { DateFormat } from '@/lib/date-format';
import type { NameOrder } from '@/types/api/user';
import type { NameDisplayFormat } from '@/lib/nameUtils';

export type { Theme, DateFormat, NameOrder, NameDisplayFormat };

export type GraphMode = 'individuals' | 'bubbles';

export interface DisplayPreferences {
  theme: Theme;
  dateFormat: DateFormat;
  nameOrder: NameOrder;
  nameDisplayFormat: NameDisplayFormat;
  graphMode: GraphMode;
  language: string;
}

export const DISPLAY_PREFERENCE_DEFAULTS: DisplayPreferences = {
  theme: 'DARK',
  dateFormat: 'MDY',
  nameOrder: 'WESTERN',
  nameDisplayFormat: 'FULL',
  graphMode: 'individuals',
  language: 'en',
};

function toGraphMode(value: string | null | undefined): GraphMode {
  return value === 'bubbles' ? 'bubbles' : 'individuals';
}

export const getUserDisplayPreferences = cache(
  async (_userId?: string): Promise<DisplayPreferences> => {
    try {
      const res = await apiServer<{ user: {
        theme?: Theme;
        dateFormat?: DateFormat;
        nameOrder?: NameOrder;
        nameDisplayFormat?: NameDisplayFormat;
        graphMode?: string;
        language?: string;
      } }>('/api/user/profile', {
        autoNotFound: false,
        autoRedirect: false,
      });

      const user = res?.user;
      return {
        theme: user?.theme ?? DISPLAY_PREFERENCE_DEFAULTS.theme,
        dateFormat: user?.dateFormat ?? DISPLAY_PREFERENCE_DEFAULTS.dateFormat,
        nameOrder: user?.nameOrder ?? DISPLAY_PREFERENCE_DEFAULTS.nameOrder,
        nameDisplayFormat:
          user?.nameDisplayFormat ?? DISPLAY_PREFERENCE_DEFAULTS.nameDisplayFormat,
        graphMode: toGraphMode(user?.graphMode),
        language: user?.language ?? DISPLAY_PREFERENCE_DEFAULTS.language,
      };
    } catch {
      return DISPLAY_PREFERENCE_DEFAULTS;
    }
  }
);
