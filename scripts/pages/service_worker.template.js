// Offline-Speicher des Planers (PERF-06). Vorlage: scripts/pages/build_service_worker.mjs
// setzt __SW_MANIFEST__ ein und schreibt dist-web/sw.js. Nicht von Hand ändern.
//
// Regeln:
// - Startseite (index.html): erst Netz (höchstens 3 s), sonst die gespeicherte Fassung.
//   Ein neuer Stand kommt so beim nächsten Laden an, ohne Netz startet die letzte.
// - assets/*: Dateinamen tragen einen Inhalts-Hash, Inhalte ändern sich nie. Erst Speicher,
//   sonst Netz. Beim Installieren werden nur Dateien geholt, die noch fehlen.
// - Alles andere (deployment.json, Mod-Downloads, Katalogdatei, fremde Adressen, Team-Raum,
//   127.0.0.1) geht unverändert ans Netz. Die Katalogdatei hält der Planer selbst in IndexedDB.
// - Notbremse: Eine sw.js mit `"off": true` im Manifest löscht den Speicher und meldet sich ab.
const MANIFEST = __SW_MANIFEST__;
const CACHE = 'bauplaner-app';
const SCOPE = new URL(self.registration.scope);
const SHELL = new URL('./', SCOPE).href;
const ASSETS = new Set(MANIFEST.assets.map(p => new URL(p, SCOPE).href));
const NETWORK_WAIT_MS = 3000;

const cached = url => ASSETS.has(url);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    if (MANIFEST.off) return self.skipWaiting();
    const cache = await caches.open(CACHE);
    const have = new Set((await cache.keys()).map(r => r.url));
    const missing = [...ASSETS].filter(u => !have.has(u));
    // Few at a time: on a slow line (iPad unterwegs) the page itself keeps priority.
    let next = 0;
    const worker = async () => {
      while (next < missing.length) {
        const url = missing[next++];
        try { const res = await fetch(url, { credentials: 'same-origin' }); if (res.ok) await cache.put(url, res); } catch { /* fetched again on first use */ }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if (MANIFEST.off) {
      await caches.delete(CACHE);
      await self.registration.unregister();
      return;
    }
    const cache = await caches.open(CACHE);
    // Files of older app versions go; the shell stays until the next one replaces it.
    for (const req of await cache.keys()) if (req.url !== SHELL && !cached(req.url)) await cache.delete(req);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'bauplaner:version') event.source?.postMessage({ type: 'bauplaner:version', version: MANIFEST.version, assets: ASSETS.size });
});

async function shell(request) {
  if (!(await caches.has(CACHE))) return fetch(request);
  const cache = await caches.open(CACHE);
  const network = fetch(request).then(async res => {
    if (res.ok && res.type === 'basic') await cache.put(SHELL, res.clone());
    return res;
  });
  const timeout = new Promise(resolve => setTimeout(() => resolve(null), NETWORK_WAIT_MS));
  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
  } catch { /* offline: fall back below */ }
  const stored = await cache.match(SHELL);
  if (stored) { network.catch(() => {}); return stored; }
  return network;
}

async function asset(request, key) {
  // Store removed (switched off on the system page): plain network, nothing is stored again.
  if (!(await caches.has(CACHE))) return fetch(request);
  const cache = await caches.open(CACHE);
  const stored = await cache.match(key);
  if (stored) return stored;
  const res = await fetch(request);
  if (res.ok && res.type === 'basic') await cache.put(key, res.clone());
  return res;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (MANIFEST.off || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  const local = url.pathname.slice(SCOPE.pathname.length);
  if (request.mode === 'navigate' && (local === '' || local === 'index.html')) { event.respondWith(shell(request)); return; }
  url.search = ''; url.hash = '';
  if (cached(url.href) && !request.headers.has('range')) event.respondWith(asset(request, url.href));
});
