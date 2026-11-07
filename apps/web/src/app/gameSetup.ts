// COMPAT-01: „Mein Spiel“ – Minecraft-Version, Loader und Einfügewerkzeug, einmal gewählt und in diesem
// Browser gemerkt. Export, Bibliothek und Mod-Seite prüfen damit vorher, was im eigenen Spiel ankommt.
import { useCallback, useEffect, useState } from 'react';
import { parseGameSetup } from '../../../../packages/voxel/src/versionCompat.js';
import type { GameSetup } from '../../../../packages/voxel/src/versionCompat.js';
import { createPreferenceStore } from '../views/library/preferenceStore';

export const GAME_SETUP_KEY = 'bauplaner.spiel';
const store = createPreferenceStore(() => window.localStorage);
const listeners = new Set<(s: GameSetup) => void>();

export function readGameSetup(): GameSetup {
  try { return parseGameSetup(JSON.parse(store.read(GAME_SETUP_KEY) ?? 'null')); } catch { return parseGameSetup(null); }
}

export function saveGameSetup(setup: GameSetup): void {
  store.write(GAME_SETUP_KEY, JSON.stringify(setup));
  for (const l of listeners) l(setup);
}

/** The stored setup, shared by every view of this tab and updated from other tabs. */
export function useGameSetup(): [GameSetup, (next: Partial<GameSetup>) => void] {
  const [setup, setSetup] = useState(readGameSetup);
  useEffect(() => {
    const local = (s: GameSetup) => setSetup(s);
    const other = (e: StorageEvent) => { if (e.key === GAME_SETUP_KEY || e.key === null) { store.invalidate(e.key); setSetup(readGameSetup()); } };
    listeners.add(local); window.addEventListener('storage', other);
    return () => { listeners.delete(local); window.removeEventListener('storage', other); };
  }, []);
  const change = useCallback((next: Partial<GameSetup>) => saveGameSetup(parseGameSetup({ ...readGameSetup(), ...next })), []);
  return [setup, change];
}
