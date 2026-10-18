import { describe, it, expect, vi, beforeEach } from 'vitest';
import manifest from '@/app/manifest';

const mocks = vi.hoisted(() => ({
  getLocaleFromCookie: vi.fn(),
  detectBrowserLocale: vi.fn(),
}));

/**
 * Mocked with a minimal factory rather than importActual, because the real
 * lib/locale pulls in Prisma and Pino, neither of which loads cleanly under
 * jsdom. getUserLocale is included because lib/i18n-utils imports it, though
 * nothing here calls it. Same approach as tests/lib/i18n-utils.test.ts.
 */
vi.mock('@/lib/locale', () => ({
  getLocaleFromCookie: mocks.getLocaleFromCookie,
  detectBrowserLocale: mocks.detectBrowserLocale,
  getUserLocale: vi.fn(),
}));

const SUPPORTED_LOCALES = ['en', 'vi-VN'] as const;

describe('app/manifest.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLocaleFromCookie.mockResolvedValue(null);
    mocks.detectBrowserLocale.mockResolvedValue('en');
  });

  it('sets a stable app identity and launch behaviour', async () => {
    const result = await manifest();

    expect(result.id).toBe('/');
    expect(result.name).toBe('Nametag');
    expect(result.short_name).toBe('Nametag');
    // start_url is '/' so app/page.tsx can redirect based on session state.
    // Pointing at /dashboard would show an auth redirect on cold launch.
    expect(result.start_url).toBe('/');
    expect(result.display).toBe('standalone');
    expect(result.background_color).toBe('#121110');
    expect(result.theme_color).toBe('#121110');
    expect(result.categories).toEqual(['productivity', 'lifestyle']);
  });

  it('does not lock orientation', async () => {
    const result = await manifest();
    expect(result.orientation).toBeUndefined();
  });

  it('declares both any and maskable icons at 192, 512 and 1024', async () => {
    const result = await manifest();
    const icons = result.icons ?? [];

    expect(icons).toHaveLength(6);
    for (const purpose of ['any', 'maskable']) {
      for (const size of ['192x192', '512x512', '1024x1024']) {
        const match = icons.find((i) => i.purpose === purpose && i.sizes === size);
        expect(match, `${purpose} ${size}`).toBeDefined();
        expect(match?.type).toBe('image/png');
      }
    }
  });

  it('points icons at real files under /icons/', async () => {
    const result = await manifest();
    const srcs = (result.icons ?? []).map((i) => i.src).sort();
    expect(srcs).toEqual([
      '/icons/icon-1024.png',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/maskable-1024.png',
      '/icons/maskable-192.png',
      '/icons/maskable-512.png',
    ]);
  });

  it('declares three shortcuts', async () => {
    const result = await manifest();
    const shortcuts = result.shortcuts ?? [];

    expect(shortcuts.map((s) => s.url)).toEqual(['/people/new', '/people', '/dashboard']);
    for (const shortcut of shortcuts) {
      expect(shortcut.name).toBeTruthy();
    }
  });

  it('uses English copy by default', async () => {
    const result = await manifest();

    expect(result.lang).toBe('en');
    expect(result.description).toBe('Keep track of the people in your life.');
    expect((result.shortcuts ?? [])[0].name).toBe('Add person');
  });

  it('prefers the locale cookie over Accept-Language', async () => {
    mocks.getLocaleFromCookie.mockResolvedValue('vi-VN');
    mocks.detectBrowserLocale.mockResolvedValue('en');

    const result = await manifest();

    expect(result.lang).toBe('vi-VN');
    expect(result.description).toBe('Hệ thống quản lý hồ sơ vụ án, phân tích mạng lưới và định vị đối tượng nghi vấn.');
    expect((result.shortcuts ?? [])[0].name).toBe('Thêm đối tượng');
    expect(mocks.detectBrowserLocale).not.toHaveBeenCalled();
  });

  it('falls back to Accept-Language when there is no cookie', async () => {
    mocks.detectBrowserLocale.mockResolvedValue('vi-VN');

    const result = await manifest();

    expect(result.lang).toBe('vi-VN');
    expect(result.description).toBe('Hệ thống quản lý hồ sơ vụ án, phân tích mạng lưới và định vị đối tượng nghi vấn.');
  });

  it('translates the description in every supported locale', async () => {
    const seen = new Set<string>();

    for (const locale of SUPPORTED_LOCALES) {
      mocks.getLocaleFromCookie.mockResolvedValue(locale);
      const result = await manifest();

      expect(result.lang).toBe(locale);
      // A missing key would make getTranslationsForLocale return the key path.
      expect(result.description).not.toBe('description');
      expect(result.description).toBeTruthy();
      seen.add(result.description as string);
    }

    // Two genuinely different strings, so nothing silently fell back.
    expect(seen.size).toBe(SUPPORTED_LOCALES.length);
  });
});
