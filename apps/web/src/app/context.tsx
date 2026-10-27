import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Asset, AssetVersion } from '../../../../packages/domain/src/index.js';
import { openRepository } from './repository';
import type { Repository } from './repository';

export interface Library {
  readonly assets: readonly Asset[];
  readonly versions: ReadonlyMap<string, AssetVersion>;
}

interface AppState {
  readonly repo: Repository;
  readonly library: Library;
  /** Re-reads assets and versions from the repository. */
  reloadLibrary(): Promise<void>;
}

const Context = createContext<AppState | null>(null);

export function useApp(): AppState {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider fehlt');
  return value;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [repo, setRepo] = useState<Repository | null>(null);
  const [library, setLibrary] = useState<Library>({ assets: [], versions: new Map() });
  const [error, setError] = useState('');
  const load = useCallback(async (r: Repository) => {
    const [assets, versions] = await Promise.all([r.listAssets(), r.listVersions()]);
    setLibrary({ assets, versions: new Map(versions.map(v => [v.id, v])) });
  }, []);
  useEffect(() => {
    let alive = true;
    openRepository().then(async r => { await load(r); if (alive) setRepo(r); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [load]);
  const reloadLibrary = useCallback(async () => { if (repo) await load(repo); }, [repo, load]);
  // Another tab imported or restored assets: refresh the shared library (B3).
  useEffect(() => repo?.subscribe(c => { if (c.kind === 'library') void load(repo).catch(() => {}); }), [repo, load]);
  if (error) return <div className="notice warning" role="alert"><strong>Lokaler Speicher nicht verfügbar</strong><p>{error}</p></div>;
  if (!repo) return <div className="loading" role="status">Lokale Daten werden geladen …</div>;
  return <Context.Provider value={{ repo, library, reloadLibrary }}>{children}</Context.Provider>;
}
