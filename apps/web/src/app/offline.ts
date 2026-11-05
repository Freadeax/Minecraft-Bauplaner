/**
 * Offline-Speicher (PERF-06): meldet den Service Worker `sw.js` an, den
 * `scripts/pages/build_service_worker.mjs` beim Bauen erzeugt. Er hält die
 * Programmdateien im Browser: der nächste Start lädt sie aus dem Speicher statt
 * aus dem Netz, und ohne Internet startet die zuletzt geladene Fassung. Projekte
 * liegen davon unabhängig wie bisher in IndexedDB.
 *
 * Nur im gebauten Planer. In automatisierten Browsern (Playwright) bleibt er aus,
 * damit Tests, die Anfragen abfangen, unverändert arbeiten; ein Test schaltet ihn
 * über `bauplaner.offline.test` ein. `bauplaner.offline` = `aus` schaltet ihn ab.
 */
const OFF_KEY = 'bauplaner.offline', TEST_KEY = 'bauplaner.offline.test', CACHE = 'bauplaner-app';
const base = import.meta.env.BASE_URL;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export const offlineSupported = (): boolean => import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext;
const automated = (): boolean => navigator.webdriver === true && read(TEST_KEY) !== '1';
export const offlineSwitchedOff = (): boolean => read(OFF_KEY) === 'aus';

/** Registers the service worker after the page has loaded; failures only mean: no offline copy. */
export function registerOffline(): void {
  if (!offlineSupported() || automated()) return;
  if (offlineSwitchedOff()) { void clearOffline(); return; }
  const go = () => { navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(e => console.warn('Offline-Speicher nicht verfügbar:', e)); };
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
}

export interface OfflineState {
  readonly supported: boolean;
  readonly active: boolean;
  readonly switchedOff: boolean;
  readonly version?: string;
  readonly files?: number;
  readonly bytes?: number;
}

/** What the system page shows: is the page kept offline, which app version, how much is stored. */
export async function offlineState(): Promise<OfflineState> {
  const supported = offlineSupported(), switchedOff = offlineSwitchedOff();
  if (!supported) return { supported, active: false, switchedOff };
  const reg = await navigator.serviceWorker.getRegistration(base).catch(() => undefined);
  const worker = reg?.active;
  if (!worker) return { supported, active: false, switchedOff };
  const info = await new Promise<{ version?: string; assets?: number } | null>(resolve => {
    const timer = setTimeout(() => resolve(null), 2000);
    const channel = (e: MessageEvent) => {
      if (e.data?.type !== 'bauplaner:version') return;
      clearTimeout(timer); navigator.serviceWorker.removeEventListener('message', channel); resolve(e.data);
    };
    navigator.serviceWorker.addEventListener('message', channel);
    worker.postMessage('bauplaner:version');
  });
  let files: number | undefined, bytes: number | undefined;
  try {
    // caches.open would create an empty store again after switching off; only read an existing one.
    if (!(await caches.has(CACHE))) throw new Error('kein Speicher');
    const cache = await caches.open(CACHE), keys = await cache.keys();
    files = keys.length; bytes = 0;
    for (const k of keys) { const r = await cache.match(k); const len = Number(r?.headers.get('content-length')); bytes += Number.isFinite(len) && len > 0 ? len : (await r?.blob())?.size ?? 0; }
  } catch { /* Cache Storage blocked: sizes stay unknown */ }
  return { supported, active: true, switchedOff, ...(info?.version ? { version: info.version } : {}), ...(files !== undefined ? { files } : {}), ...(bytes !== undefined ? { bytes } : {}) };
}

/** Removes the offline copy and the service worker. The page keeps working online. */
export async function clearOffline(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  for (const reg of await navigator.serviceWorker.getRegistrations().catch(() => [])) if (new URL(reg.scope).pathname === base) await reg.unregister().catch(() => false);
  try { await caches.delete(CACHE); } catch { /* nothing stored */ }
}

/** Switches the offline copy on or off for this browser (remembered in localStorage). */
export async function setOffline(on: boolean): Promise<void> {
  try { if (on) localStorage.removeItem(OFF_KEY); else localStorage.setItem(OFF_KEY, 'aus'); } catch { /* storage blocked */ }
  if (on) registerOffline(); else await clearOffline();
}
