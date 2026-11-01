import { createPreferenceStore } from '../views/library/preferenceStore.ts';
import { normalizeAppearance, normalizeTheme } from './themeTokens.mjs';
import type { Appearance, ThemeId } from './themeTokens.mjs';

export const THEME_STORAGE_KEY = 'lmnt:appearance:v1';
export interface ThemePreference { readonly theme: ThemeId; readonly appearance: Appearance }
export function parseThemePreference(raw: string | null): ThemePreference {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>;
      return { theme: normalizeTheme(item.theme), appearance: normalizeAppearance(item.appearance) };
    }
  } catch { /* damaged preferences do not prevent starting the app */ }
  return { theme: 'modern', appearance: 'system' };
}
export function createThemePreferences(storage: () => Pick<Storage, 'getItem' | 'setItem'>) {
  const store = createPreferenceStore(storage);
  return {
    read: () => parseThemePreference(store.read(THEME_STORAGE_KEY)),
    write(value: ThemePreference) {
      store.write(THEME_STORAGE_KEY, JSON.stringify({ theme: normalizeTheme(value.theme), appearance: normalizeAppearance(value.appearance) }));
    },
    invalidate: (key: string | null) => store.invalidate(key),
  };
}
