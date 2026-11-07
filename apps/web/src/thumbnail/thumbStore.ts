/**
 * Dauerhafter Vorschaubild-Speicher (PERF-05, Befund O-1).
 *
 * Bisher wurden alle Vorschaubilder bei jedem Start neu gerendert (WebGL, Rücklesen
 * der Leinwand): beim Neustart rund 0,6 s Hauptthread allein für die Projektzentrale,
 * in der Bibliothek je sichtbarer Karte erneut. Bilder hängen nur ab von
 *  - dem Schlüssel des Aufrufers (unveränderliche Version-id bzw. Projektrevision,
 *    Blockbild, Blick, Schnitt, Größe – siehe `keyOf` in Thumb.tsx),
 *  - der Pixeldichte des Bildschirms,
 *  - dem Rendercode (`revision`: die gehashten Baustein-Adressen des Renderers).
 * Je Rendercode gibt es einen eigenen Cache; Caches anderer Stände werden beim ersten
 * Zugriff gelöscht, damit alte Bilder nie angezeigt werden und kein Speicher liegen bleibt.
 *
 * Ohne Cache Storage (alte Browser, unsichere Herkunft, gesperrter Speicher) oder bei
 * jedem Fehler wird einfach wie bisher gerendert; gespeichert wird nur ein echtes Bild.
 */
const PREFIX = 'bauplaner-vorschau-';
const stores = new Map<string, Promise<Cache | null>>();

function nameOf(revision: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < revision.length; i++) h = Math.imul(h ^ revision.charCodeAt(i), 0x01000193);
  return PREFIX + (h >>> 0).toString(16).padStart(8, '0');
}

function open(revision: string): Promise<Cache | null> {
  let store = stores.get(revision);
  if (!store) {
    store = (async () => {
      if (!('caches' in globalThis)) return null;
      const name = nameOf(revision);
      const cache = await caches.open(name);
      // Old render code: its images are never right again.
      void caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== name).map(k => caches.delete(k)))).catch(() => {});
      return cache;
    })().catch(() => null);
    stores.set(revision, store);
  }
  return store;
}

const requestOf = (key: string) => new Request(`https://vorschau.invalid/${encodeURIComponent(`${key}@${globalThis.devicePixelRatio || 1}`)}`);

/**
 * The stored image as a data URL, or undefined.
 * Block 5 (WebKit/Safari): only bytes cross the Cache API here, never a Blob or an object URL – Safari refuses
 * object URLs in <img> while the offline store controls the page, and Blob bodies in private tabs
 * („Cannot load blob … due to access control checks“). A data URL loads everywhere.
 */
export async function readStoredShot(revision: string, key: string): Promise<string | undefined> {
  try {
    const cache = await open(revision);
    const hit = await cache?.match(requestOf(key));
    if (!hit) return undefined;
    const bytes = new Uint8Array(await hit.arrayBuffer());
    return bytes.length ? `data:${hit.headers.get('content-type') || 'image/png'};base64,${toBase64(bytes)}` : undefined;
  } catch { return undefined; }
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Decodes a data URL without fetch(): Safari blocks fetch() of data: URLs while a service worker controls the page. */
export function dataUrlBytes(dataUrl: string): { type: string; bytes: Uint8Array } {
  const comma = dataUrl.indexOf(',');
  const head = dataUrl.slice(5, comma);
  const type = head.split(';')[0] || 'application/octet-stream';
  const body = dataUrl.slice(comma + 1);
  if (!head.endsWith(';base64')) return { type, bytes: new TextEncoder().encode(decodeURIComponent(body)) };
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { type, bytes };
}

/** Keeps a rendered image (data URL) for later starts; failures are ignored. */
export function storeShot(revision: string, key: string, dataUrl: string): void {
  if (!dataUrl.startsWith('data:image/')) return;
  void (async () => {
    const cache = await open(revision);
    if (!cache) return;
    const { type, bytes } = dataUrlBytes(dataUrl);
    await cache.put(requestOf(key), new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { 'content-type': type } }));
  })().catch(() => {});
}
