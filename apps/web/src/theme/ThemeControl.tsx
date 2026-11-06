import { useEffect, useState } from 'react';
import type React from 'react';
import { THEME_IDS, normalizeAppearance, normalizeTheme, resolveAppearance, themeTokens } from './themeTokens.mjs';
import { createThemePreferences, THEME_STORAGE_KEY } from './themePreferences';
import type { ThemePreference } from './themePreferences';

const preferences = createThemePreferences(() => window.localStorage);
const names = { werkbank: 'Werkbank', modern: 'Modern', medieval: 'Mittelalter', industrial: 'Industrie', fantasy: 'Fantasy', nether: 'Nether' };

const resolvedFor = (choice: ThemePreference) => resolveAppearance(choice.appearance, window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);

/** Writes the colour tokens to <html>; also runs once at import so the first paint already uses the chosen theme (UI-03). */
function applyTheme(theme: ThemePreference['theme'], appearance: 'dark' | 'light') {
  const root = document.documentElement;
  const tokens = themeTokens(theme, appearance);
  root.dataset.theme = tokens.id;
  root.dataset.appearance = appearance;
  for (const [key, value] of Object.entries(tokens.colors)) root.style.setProperty(`--theme-${key}`, value);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens.colors.canvas);
}
try { const first = preferences.read(); applyTheme(first.theme, resolvedFor(first)); } catch { /* ThemeControl applies it after mounting */ }

/** Appearance changes only CSS tokens; it never touches stored buildings or project palettes. */
export function ThemeControl() {
  const [choice, setChoice] = useState(preferences.read);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);
  const appearance = resolveAppearance(choice.appearance, systemDark);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      preferences.invalidate(event.key);
      setChoice(preferences.read());
    };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);
  useEffect(() => { applyTheme(choice.theme, appearance); }, [choice.theme, appearance]);
  function update(next: Partial<ThemePreference>) {
    const value = { ...preferences.read(), ...next };
    preferences.write(value);
    setChoice(value);
  }
  const modes = [['system', 'Wie Gerät'], ['light', 'Hell'], ['dark', 'Dunkel']] as const;
  return <details className="theme-control">
    <summary title="Darstellung"><span className="theme-label">Darstellung</span><span className="theme-dot" aria-hidden="true" /></summary>
    <div className="theme-popover">
      <strong>Dein Baustil</strong>
      <div className="theme-swatches" role="radiogroup" aria-label="Oberflächenthema">
        {THEME_IDS.map(id => {
          const c = themeTokens(id, appearance).colors;
          const sw = { '--sw-a': c.accent, '--sw-b': c.accent2, '--sw-s': c.surface, '--sw-c': c.canvas } as React.CSSProperties;
          return <button key={id} type="button" role="radio" className="theme-swatch" data-theme-id={id} aria-checked={choice.theme === id} onClick={() => update({ theme: normalizeTheme(id) })} style={sw}>
            <span className="theme-swatch-chip" aria-hidden="true" /><span>{names[id]}</span>
          </button>;
        })}
      </div>
      <div className="seg theme-modes" role="radiogroup" aria-label="Erscheinungsbild">
        {modes.map(([id, label]) => <button key={id} type="button" role="radio" data-mode={id} aria-checked={choice.appearance === id} onClick={() => update({ appearance: normalizeAppearance(id) })}>{label}</button>)}
      </div>
      <p>Die Auswahl gestaltet nur deine Oberfläche. Blockfarben und Baupläne bleiben unverändert.</p>
    </div>
  </details>;
}
