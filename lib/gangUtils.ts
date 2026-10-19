export interface GangRoleInfo {
  key: string;
  label: string;
  icon: string;
  badgeClass: string;
  isCustom?: boolean;
}

export const DEFAULT_GANG_ROLE = 'MEMBER';

export const PRESET_GANG_ROLES: GangRoleInfo[] = [
  {
    key: 'LEADER',
    label: 'Cầm đầu / Đầu sỏ',
    icon: '👑',
    badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  },
  {
    key: 'SECOND_IN_COMMAND',
    label: 'Phó tướng / Cánh tay phải',
    icon: '⚔️',
    badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  },
  {
    key: 'ENFORCER',
    label: 'Đao phủ / Hành hung / Đòi nợ',
    icon: '🥊',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    key: 'LOOKOUT',
    label: 'Cảnh giới / Tiền trạm',
    icon: '🛡️',
    badgeClass: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  },
  {
    key: 'DRIVER',
    label: 'Vận chuyển / Lái xe',
    icon: '🚗',
    badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  },
  {
    key: 'FINANCE',
    label: 'Quản lý tài chính / Sổ sách / Cho vay',
    icon: '💰',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    key: 'CUSTODIAN',
    label: 'Cất giấu vũ khí / Kho hàng / Hàng cấm',
    icon: '📦',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  {
    key: 'ASSOCIATE',
    label: 'Vệ tinh / Móc nối / Tiêu thụ',
    icon: '🛰️',
    badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  },
  {
    key: 'MEMBER',
    label: 'Thành viên / Đàn em (Mặc định)',
    icon: '👥',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
];

const PRESET_MAP = new Map<string, GangRoleInfo>(
  PRESET_GANG_ROLES.map((r) => [r.key, r])
);

export function getGangRoleInfo(role: string | null | undefined): GangRoleInfo {
  if (!role || role.trim() === '') {
    return PRESET_MAP.get(DEFAULT_GANG_ROLE)!;
  }

  const normalized = role.trim();
  const matched = PRESET_MAP.get(normalized.toUpperCase());
  if (matched) {
    return matched;
  }

  // Custom user-defined role
  return {
    key: normalized,
    label: normalized,
    icon: '🏷️',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
    isCustom: true,
  };
}

