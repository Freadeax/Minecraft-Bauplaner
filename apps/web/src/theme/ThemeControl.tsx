import { useEffect, useState } from 'react';
import { THEME_IDS, normalizeAppearance, normalizeTheme, resolveAppearance, themeTokens } from './themeTokens.mjs';
import { createThemePreferences, THEME_STORAGE_KEY } from './themePreferences';
import type { ThemePreference } from './themePreferences';

const preferences = createThemePreferences(() => window.localStorage);
const names = { modern: 'Modern', medieval: 'Mittelalter', industrial: 'Industrie', fantasy: 'Fantasy', nether: 'Nether' };

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
  useEffect(() => {
    const root = document.documentElement;
    const tokens = themeTokens(choice.theme, appearance);
    root.dataset.theme = tokens.id;
    root.dataset.appearance = appearance;
    for (const [key, value] of Object.entries(tokens.colors)) root.style.setProperty(`--theme-${key}`, value);
  }, [choice.theme, appearance]);
  function update(next: Partial<ThemePreference>) {
    const value = { ...preferences.read(), ...next };
    preferences.write(value);
    setChoice(value);
  }
  return <details className="theme-control">
    <summary>Darstellung <span aria-hidden="true">◐</span></summary>
    <div className="theme-popover">
      <strong>Dein Baustil</strong>
      <label>Oberflächenthema<select aria-label="Oberflächenthema" value={choice.theme} onChange={event => update({ theme: normalizeTheme(event.target.value) })}>
        {THEME_IDS.map(id => <option key={id} value={id}>{names[id]}</option>)}
      </select></label>
      <label>Erscheinungsbild<select aria-label="Erscheinungsbild" value={choice.appearance} onChange={event => update({ appearance: normalizeAppearance(event.target.value) })}>
        <option value="system">Wie das Gerät</option><option value="dark">Dunkel</option><option value="light">Hell</option>
      </select></label>
      <p>Die Auswahl gestaltet deine Oberfläche. Blockfarben und Baupläne bleiben unverändert.</p>
    </div>
  </details>;
}
