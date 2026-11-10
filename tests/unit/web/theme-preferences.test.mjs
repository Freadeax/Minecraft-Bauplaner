import test from 'node:test';
import assert from 'node:assert/strict';
import { createThemePreferences, parseThemePreference, THEME_STORAGE_KEY } from '../../../apps/web/src/theme/themePreferences.ts';

test('damaged and hostile stored theme preferences fall back to safe defaults', () => {
  for (const raw of [null, 'null', 'invalid', '7', '[]', '{"theme":"__proto__","appearance":"pink"}']) {
    assert.deepEqual(parseThemePreference(raw), { theme: 'lmnt', appearance: 'system' });
  }
});
test('denied localStorage keeps appearance changes for subsequent component mounts', () => {
  const prefs = createThemePreferences(() => { throw new Error('SecurityError'); });
  prefs.write({ theme: 'nether', appearance: 'light' });
  assert.deepEqual(prefs.read(), { theme: 'nether', appearance: 'light' });
});
test('failed quota writes cannot revive an older persisted choice', () => {
  let value = '{"theme":"modern","appearance":"system"}';
  const prefs = createThemePreferences(() => ({ getItem: () => value, setItem: () => { throw new Error('QuotaExceededError'); } }));
  prefs.write({ theme: 'fantasy', appearance: 'dark' });
  assert.deepEqual(prefs.read(), { theme: 'fantasy', appearance: 'dark' });
  value = '{"theme":"industrial","appearance":"light"}';
  prefs.invalidate(THEME_STORAGE_KEY);
  assert.deepEqual(prefs.read(), { theme: 'industrial', appearance: 'light' });
  value = null;
  prefs.invalidate(null);
  assert.deepEqual(prefs.read(), { theme: 'lmnt', appearance: 'system' });
});
test('valid preference survives reload without changing its source object', () => {
  const data = new Map();
  const storage = () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) });
  const preference = Object.freeze({ theme: 'medieval', appearance: 'system' });
  createThemePreferences(storage).write(preference);
  assert.deepEqual(createThemePreferences(storage).read(), preference);
});
