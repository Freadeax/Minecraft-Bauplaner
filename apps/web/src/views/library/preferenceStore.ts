/** Browser preferences are disposable; failed writes must still survive navigation in this tab. */
export function createPreferenceStore(storage: () => Pick<Storage, 'getItem' | 'setItem'>) {
  const session = new Map<string, string>();
  const pending = new Set<string>();
  return {
    read(key: string): string | null {
      if (pending.has(key)) return session.get(key) ?? null;
      try {
        const value = storage().getItem(key);
        if (value === null) session.delete(key); else session.set(key, value);
        return value;
      } catch { return session.get(key) ?? null; }
    },
    write(key: string, value: string): void {
      session.set(key, value);
      pending.add(key);
      try { storage().setItem(key, value); pending.delete(key); } catch { /* tab-local fallback */ }
    },
    /** A real storage event supersedes a local fallback, including removeItem/clear. */
    invalidate(key: string | null): void {
      if (key === null) { session.clear(); pending.clear(); }
      else { session.delete(key); pending.delete(key); }
    },
  };
}

export function parsePreferenceIds(value: string | null, max: number): string[] {
  try {
    const raw: unknown = JSON.parse(value ?? '[]');
    return Array.isArray(raw) ? [...new Set(raw.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(-max) : [];
  } catch { return []; }
}
