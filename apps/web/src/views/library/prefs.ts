import { useCallback, useEffect, useState } from 'react';
import { createPreferenceStore, parsePreferenceIds } from './preferenceStore';

/**
 * Per-browser conveniences of the library: Merkliste (favourites) and the
 * comparison tray. Kept in localStorage on purpose: they are view preferences,
 * not project data, so they are not part of backups. Storage may be missing
 * (private mode, blocked site data); the lists then live for the session only.
 */
const store = createPreferenceStore(() => localStorage);
const read = (key: string, max: number) => parsePreferenceIds(store.read(key), max);
const isLocalEvent = (e: StorageEvent) => {
  try { return e.storageArea === null || e.storageArea === localStorage; } catch { return false; }
};
const announce = (key: string) => window.dispatchEvent(new CustomEvent('bauplaner:prefs', { detail: key }));

function useIdList(key: string, max: number) {
  const [ids, setIds] = useState<string[]>(() => read(key, max));
  useEffect(() => {
    const sync = (e: Event) => { if (e instanceof CustomEvent && e.detail === key) setIds(read(key, max)); };
    const storage = (e: StorageEvent) => {
      if (!isLocalEvent(e)) return;
      if (e.key === null || e.key === key) { store.invalidate(e.key); setIds(read(key, max)); }
    };
    window.addEventListener('bauplaner:prefs', sync); window.addEventListener('storage', storage);
    return () => { window.removeEventListener('bauplaner:prefs', sync); window.removeEventListener('storage', storage); };
  }, [key, max]);
  const update = useCallback((next: string[]) => {
    store.write(key, JSON.stringify(parsePreferenceIds(JSON.stringify(next), max)));
    setIds(read(key, max)); announce(key);
  }, [key, max]);
  const toggle = useCallback((id: string) => {
    const current = read(key, max);
    update(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  }, [key, max, update]);
  return { ids, has: (id: string) => ids.includes(id), toggle, set: update };
}

export const MAX_COMPARE = 4;
export const useFavorites = () => useIdList('bauplaner.merkliste', 500);
export const useCompare = () => useIdList('bauplaner.vergleich', MAX_COMPARE);

/** Blickrichtung der Kartenbilder (B12): one of the still image views, per browser. */
const VIEW_KEY = 'bauplaner.blickrichtung';
export function useCardView<T extends string>(allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const pick = (): T => { const v = store.read(VIEW_KEY); return allowed.includes(v as T) ? v as T : fallback; };
  const [view, setView] = useState<T>(pick);
  useEffect(() => {
    const sync = (e: Event) => { if (e instanceof CustomEvent && e.detail === VIEW_KEY) setView(pick()); };
    const storage = (e: StorageEvent) => {
      if (!isLocalEvent(e)) return;
      if (e.key === null || e.key === VIEW_KEY) { store.invalidate(e.key); setView(pick()); }
    };
    window.addEventListener('bauplaner:prefs', sync); window.addEventListener('storage', storage);
    return () => { window.removeEventListener('bauplaner:prefs', sync); window.removeEventListener('storage', storage); };
  }, []);
  const update = useCallback((v: T) => {
    setView(v);
    store.write(VIEW_KEY, v); announce(VIEW_KEY);
  }, []);
  return [view, update];
}
