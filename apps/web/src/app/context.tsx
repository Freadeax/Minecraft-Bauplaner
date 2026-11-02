import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Asset, AssetVersion } from '../../../../packages/domain/src/index.js';
import { openRepository } from './repository';
import type { Repository } from './repository';
import { loadLibrary, startLibrary } from '../jobs/library';
import { JobStatus } from '../jobs/JobStatus';
import type { JobProgress } from '../jobs/protocol';

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
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const load = useCallback(async (r: Repository) => { setLibrary(await loadLibrary(r)); }, []);
  useEffect(() => {
    let alive = true;
    // PERF-04-S05: the shipped catalogue and the catalogue metrics are computed in the background worker;
    // the start screen keeps drawing and shows how far it is.
    const onProgress = (p: JobProgress) => { if (alive) setProgress(p); };
    openRepository({ seed: false }).then(async r => {
      onProgress({ step: 'Bibliothek prüfen', fraction: null });
      const lib = await startLibrary(r, { onProgress });
      if (alive) { setLibrary(lib); setRepo(r); }
    }).catch(e => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, []);
  const reloadLibrary = useCallback(async () => { if (repo) await load(repo); }, [repo, load]);
  // Another tab imported or restored assets: refresh the shared library (B3).
  useEffect(() => repo?.subscribe(c => { if (c.kind === 'library') void load(repo).catch(() => {}); }), [repo, load]);
  if (error) return <div className="notice warning" role="alert"><strong>Lokaler Speicher nicht verfügbar</strong><p>{error}</p></div>;
  if (!repo) return <div className="loading app-start" role="status" data-start="loading">
    <p>Lokale Daten werden geladen …</p>
    {progress && <JobStatus title="Bibliothek wird geladen" progress={progress} />}
  </div>;
  return <Context.Provider value={{ repo, library, reloadLibrary }}>{children}</Context.Provider>;
}
