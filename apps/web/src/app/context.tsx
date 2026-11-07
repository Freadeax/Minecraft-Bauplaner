import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Asset, AssetVersion } from '../../../../packages/domain/src/index.js';
import { openRepository } from './repository';
import type { Repository } from './repository';
import { loadLibrary, startLibrary } from '../jobs/library';
import { JobStatus } from '../jobs/JobStatus';
import type { JobProgress } from '../jobs/protocol';
import { preloadPages } from './lazyPage';

export interface Library {
  readonly assets: readonly Asset[];
  readonly versions: ReadonlyMap<string, AssetVersion>;
}

interface AppState {
  readonly repo: Repository;
  readonly library: Library;
  /**
   * PERF-07: false while the shipped catalogue still loads in the background. The project centre already
   * shows the local projects meanwhile; everything that needs assets or versions waits for `whenLibrary`.
   */
  readonly libraryReady: boolean;
  /** Progress of the catalogue start while `libraryReady` is false. */
  readonly libraryProgress: JobProgress | null;
  /** Resolves with the loaded library (at once when it is ready). */
  whenLibrary(): Promise<Library>;
  /** Re-reads assets and versions from the repository. */
  reloadLibrary(): Promise<void>;
}

const Context = createContext<AppState | null>(null);

export function useApp(): AppState {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider fehlt');
  return value;
}

const EMPTY: Library = { assets: [], versions: new Map() };

/** One start per page: the promise outlives remounts (StrictMode, error boundary resets). */
let startPromise: Promise<Library> | null = null;
let resolveStart: ((lib: Library) => void) | null = null;
const libraryPromise = (): Promise<Library> => (startPromise ??= new Promise<Library>(r => { resolveStart = r; }));

/** Test hook and diagnosis (PERF-07): `laedt` while the catalogue loads, `bereit` afterwards. */
function markLibrary(state: 'laedt' | 'bereit'): void {
  try { document.documentElement.dataset.library = state; } catch { /* no document */ }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [repo, setRepo] = useState<Repository | null>(null);
  const [library, setLibrary] = useState<Library>(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const load = useCallback(async (r: Repository) => { setLibrary(await loadLibrary(r)); }, []);
  useEffect(() => {
    let alive = true;
    // PERF-04-S05: the shipped catalogue and the catalogue metrics are computed in the background worker.
    // PERF-07: the page opens as soon as the local store is open; the catalogue follows in the background.
    const onProgress = (p: JobProgress) => { if (alive) setProgress(p); };
    markLibrary('laedt');
    openRepository({ seed: false }).then(async r => {
      if (!alive) return;
      setRepo(r);
      onProgress({ step: 'Bibliothek prüfen', fraction: null });
      const lib = await startLibrary(r, { onProgress });
      if (!alive) return;
      setLibrary(lib); setReady(true); markLibrary('bereit');
      libraryPromise(); resolveStart?.(lib);
      preloadPages();
    }).catch(e => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, []);
  const reloadLibrary = useCallback(async () => { if (repo) await load(repo); }, [repo, load]);
  const whenLibrary = useCallback(() => ready ? Promise.resolve(library) : libraryPromise(), [ready, library]);
  // Another tab imported or restored assets: refresh the shared library (B3).
  useEffect(() => repo?.subscribe(c => { if (c.kind === 'library' && ready) void load(repo).catch(() => {}); }), [repo, load, ready]);
  if (error) return <div className="notice warning" role="alert"><strong>Lokaler Speicher nicht verfügbar</strong><p>{error}</p></div>;
  if (!repo) return <StartScreen progress={progress} />;
  return <Context.Provider value={{ repo, library, libraryReady: ready, libraryProgress: progress, whenLibrary, reloadLibrary }}>{children}</Context.Provider>;
}

function StartScreen({ progress }: { progress: JobProgress | null }) {
  return <div className="loading app-start" role="status" data-start="loading">
    <p>Lokale Daten werden geladen …</p>
    {progress && <JobStatus title="Bibliothek wird geladen" progress={progress} />}
  </div>;
}

/**
 * PERF-07: pages that work with assets and versions wait for the catalogue; the project centre does not.
 * Shows the same start screen as before, so a deep link opens exactly as it used to.
 */
export function LibraryGate({ children }: { children: ReactNode }) {
  const { libraryReady, libraryProgress } = useApp();
  return libraryReady ? <>{children}</> : <StartScreen progress={libraryProgress ?? { step: 'Bibliothek prüfen', fraction: null }} />;
}
