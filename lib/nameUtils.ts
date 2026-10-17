/**
 * Checks if a string consists entirely of CJK characters.
 * Used to determine whether to omit spaces in Eastern name order
 * (Chinese, Japanese kanji/kana, Korean hangul don't use spaces between name parts).
 */
function isCJK(text: string): boolean {
  return /^[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]+$/.test(text);
}

/**
 * Determines the separator for joining name parts.
 * Returns '' if all parts are CJK characters, ' ' otherwise.
 */
export function nameSeparator(...parts: (string | null | undefined)[]): string {
  const nonEmpty = parts.filter((p): p is string => !!p);
  return nonEmpty.length > 0 && nonEmpty.every(isCJK) ? '' : ' ';
}

export type NameDisplayFormat = 'FULL' | 'NICKNAME_PREFERRED' | 'SHORT';

/**
 * Formats a person's name with optional nickname and all name parts
 * Western format: "Name 'Nickname' MiddleName Surname SecondLastName"
 * Eastern format: "Surname SecondLastName 'Nickname' Name MiddleName"
 * CJK names in Eastern order omit spaces (e.g., 田中太郎 not 田中 太郎)
 *
 * nameDisplayFormat controls which parts are shown:
 * - FULL (default): all parts with nickname in quotes
 * - NICKNAME_PREFERRED: same as FULL in this context (full name views)
 * - SHORT: just nickname or first name
 */
export function formatPersonName(
  name: string,
  surname?: string | null,
  middleName?: string | null,
  secondLastName?: string | null,
  nickname?: string | null,
  nameOrder?: 'WESTERN' | 'EASTERN',
  nameDisplayFormat?: NameDisplayFormat
): string {
  // SHORT: just nickname or name, nothing else
  if (nameDisplayFormat === 'SHORT') {
    return nickname || name;
  }

  const nicknameStr = nickname ? `'${nickname}'` : null;

  if (nameOrder === 'EASTERN') {
    const sep = nameSeparator(name, surname, middleName, secondLastName);
    const parts: string[] = [];
    if (surname) parts.push(surname);
    if (secondLastName) parts.push(secondLastName);
    if (middleName) parts.push(middleName);
    parts.push(name);
    if (nicknameStr) parts.push(nicknameStr);
    return parts.join(sep);
  }

  // Western order (default)
  const parts: string[] = [name];
  if (nicknameStr) parts.push(nicknameStr);
  if (middleName) parts.push(middleName);
  if (surname) parts.push(surname);
  if (secondLastName) parts.push(secondLastName);
  return parts.join(' ');
}

/**
 * Formats a person's full name for display
 * Same as formatPersonName but with a person object
 *
 * FULL and NICKNAME_PREFERRED both show all parts in full context
 * SHORT shows just nickname or name
 */
export function formatFullName(person: {
  name: string;
  surname?: string | null;
  middleName?: string | null;
  secondLastName?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
}, nameOrder?: 'WESTERN' | 'EASTERN', nameDisplayFormat?: NameDisplayFormat): string {
  if (person.displayNameOverride) {
    return person.displayNameOverride;
  }

  return formatPersonName(
    person.name,
    person.surname,
    person.middleName,
    person.secondLastName,
    person.nickname,
    nameOrder,
    nameDisplayFormat
  );
}

/**
 * Formats a person's canonical (real) full name, ignoring displayNameOverride.
 * Use this wherever the underlying name data must be shown or matched
 * (e.g. person details, duplicate detection, import name matching) so that
 * display overrides never leak into identity contexts.
 */
export function formatCanonicalName(person: {
  name: string;
  surname?: string | null;
  middleName?: string | null;
  secondLastName?: string | null;
  nickname?: string | null;
  // Accepted so person objects can be passed as-is, but intentionally unused.
  displayNameOverride?: string | null;
}, nameOrder?: 'WESTERN' | 'EASTERN', nameDisplayFormat?: NameDisplayFormat): string {
  return formatPersonName(
    person.name,
    person.surname,
    person.middleName,
    person.secondLastName,
    person.nickname,
    nameOrder,
    nameDisplayFormat
  );
}

/**
 * Formats a person's name for display in network graphs
 *
 * nameDisplayFormat controls the display:
 * - FULL (default): complete name with nickname in quotes
 * - NICKNAME_PREFERRED: nickname replaces first name
 * - SHORT: just nickname or first name, no surname
 */
export function formatGraphName(person: {
  name: string;
  surname?: string | null;
  middleName?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
}, nameOrder?: 'WESTERN' | 'EASTERN', nameDisplayFormat?: NameDisplayFormat): string {
  if (person.displayNameOverride) {
    return person.displayNameOverride;
  }

  // SHORT: just nickname or name
  if (nameDisplayFormat === 'SHORT') {
    return person.nickname || person.name;
  }

  // NICKNAME_PREFERRED: use nickname in place of first name
  if (nameDisplayFormat === 'NICKNAME_PREFERRED') {
    const displayName = person.nickname || person.name;
    if (!person.surname) return displayName;

    if (nameOrder === 'EASTERN') {
      const sep = nameSeparator(displayName, person.surname);
      return `${person.surname}${sep}${displayName}`;
    }
    return `${displayName} ${person.surname}`;
  }

  // FULL (default): show complete name with nickname in quotes
  const nicknameStr = person.nickname ? `'${person.nickname}'` : null;

  if (!person.surname && (!person.middleName || nameOrder !== 'EASTERN')) {
    if (nicknameStr) {
      return `${person.name} ${nicknameStr}`;
    }
    return person.name;
  }

  if (nameOrder === 'EASTERN') {
    const parts: string[] = [];
    if (person.surname) parts.push(person.surname);
    if (person.middleName) parts.push(person.middleName);
    parts.push(person.name);
    if (nicknameStr) parts.push(nicknameStr);
    const sep = nameSeparator(person.name, person.surname, person.middleName);
    return parts.join(sep);
  }

  // Western FULL
  const parts: string[] = [person.name];
  if (nicknameStr) parts.push(nicknameStr);
  if (person.surname) parts.push(person.surname);
  return parts.join(' ');
}

/**
 * Parses a Vietnamese full name string into { surname, middleName, name }.
 * - 1 word (e.g. "Hùng") -> { surname: '', middleName: '', name: 'Hùng' }
 * - 2 words (e.g. "Nguyễn Hùng") -> { surname: 'Nguyễn', middleName: '', name: 'Hùng' }
 * - 3+ words (e.g. "Nguyễn Văn Hùng", "Trần Thị Minh Ánh") ->
 *   first word is surname, last word is name, middle words joined as middleName.
 */
export function parseVietnameseFullName(rawFullName: string): {
  surname: string;
  middleName: string;
  name: string;
} {
  const tokens = rawFullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { surname: '', middleName: '', name: '' };
  }
  if (tokens.length === 1) {
    return { surname: '', middleName: '', name: tokens[0] };
  }
  if (tokens.length === 2) {
    return { surname: tokens[0], middleName: '', name: tokens[1] };
  }
  return {
    surname: tokens[0],
    middleName: tokens.slice(1, -1).join(' '),
    name: tokens[tokens.length - 1],
  };
}

/**
 * The label shown for the signed-in user in navigation chrome.
 * Falls back through nickname, name, then email so there is always something
 * to render even for accounts that never filled in a profile.
 */
export function formatUserDisplayName(user: {
  nickname?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  return user.nickname || user.name || user.email || '?';
}
