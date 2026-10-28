import { useCallback, useEffect, useState } from 'react';

/**
 * Per-browser conveniences of the library: Merkliste (favourites) and the
 * comparison tray. Kept in localStorage on purpose: they are view preferences,
 * not project data, so they are not part of backups. Storage may be missing
 * (private mode, blocked site data); the lists then live for the session only.
 */
const read = (key: string): string[] => {
  try { const v = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; }
  catch { return []; }
};
const write = (key: string, ids: readonly string[]) => {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* session only */ }
  window.dispatchEvent(new CustomEvent('bauplaner:prefs', { detail: key }));
};

function useIdList(key: string, max: number) {
  const [ids, setIds] = useState<string[]>(() => read(key));
  useEffect(() => {
    const sync = (e: Event) => { if (!(e instanceof CustomEvent) || e.detail === key) setIds(read(key)); };
    const storage = (e: StorageEvent) => { if (e.key === key) setIds(read(key)); };
    window.addEventListener('bauplaner:prefs', sync); window.addEventListener('storage', storage);
    return () => { window.removeEventListener('bauplaner:prefs', sync); window.removeEventListener('storage', storage); };
  }, [key]);
  const update = useCallback((next: string[]) => { const cut = next.slice(-max); setIds(cut); write(key, cut); }, [key, max]);
  const toggle = useCallback((id: string) => update(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]), [ids, update]);
  return { ids, has: (id: string) => ids.includes(id), toggle, set: update };
}

export const MAX_COMPARE = 4;
export const useFavorites = () => useIdList('bauplaner.merkliste', 500);
export const useCompare = () => useIdList('bauplaner.vergleich', MAX_COMPARE);
