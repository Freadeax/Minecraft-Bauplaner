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
const MANIFEST = {"version":"a476465ac8eee9c4","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-Ctb8b11s.js","assets/BuildTab-Do8trtCm.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-CLn2GeZD.js","assets/EditorTab-Bpew5IAj.js","assets/ExportTab-vj7aohhM.js","assets/GameCheckPanel-DjLMWaJB.js","assets/LandscapeTab-CsSOggTh.css","assets/LandscapeTab-ztlFPb2x.js","assets/LayerControl-D-qw6KhG.js","assets/LayerSheet-WS4LTVpv.js","assets/LibraryView-B7Wx_yHk.js","assets/LibraryView-B9Axpnjw.css","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-DF5mqYt1.js","assets/ModView-Dl91CWcf.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/ModelExportPanel-nh4wDWrS.js","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-DJ4nsHYr.js","assets/ProductionTab-DmtitLaH.css","assets/ProductionTab-laKXWns6.js","assets/ProjectView-DKDESG30.js","assets/ProjectView-DR2ThTz_.css","assets/SchemView-tFujevLp.js","assets/SiteTab-JoWAtGa8.js","assets/SystemView-Dc1RvUvQ.js","assets/TeamJoinView-BJNaFvn7.js","assets/TeamRoom-c5EPGJcu.js","assets/TeamTab-D7SFHXuS.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-CADZ64uv.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-DIxtYNEZ.js","assets/ThreeViewer-DD9lXIyO.js","assets/UpdatesTab-DiQcqfAo.js","assets/Viewer-ke-Y_O-j.js","assets/ViewerView-CfueKT94.js","assets/WorkshopPage-DvVZ97H4.js","assets/WorldImportView-BzNGu48h.js","assets/WorldMapView-CIZ1JS7M.js","assets/WorldMapView-CLlNzLmR.css","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-CpUxE5Vq.js","assets/catalogSnapshot-DZ-s_Yj-.js","assets/cellColumns-B1uZgsUd.js","assets/client-lhKAEu_r.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-D8XJ9WVk.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-BCPMMZy5.css","assets/editor-CByJmEOK.js","assets/entityScene-DNzzjyf5.js","assets/entityShapes-BwmEWCze.js","assets/glShot-B9wSbYCd.js","assets/heavy.worker-EV_HMmmd.js","assets/idbRepository-BGT0iefn.js","assets/importJob-DUq5lcfK.js","assets/index-DctMuv0L.js","assets/index-DdESbV98.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-C8h4bEHl.js","assets/litematicWrite-BWdn96rt.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-C1wDC7rM.js","assets/roomClient-C-6FGAYM.js","assets/scan.worker-DannAPJx.js","assets/scanPersistence-Di_5uFLp.js","assets/serverClient-DNAilUfu.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-4oNVBTD3.js","assets/src-CQJlgoH2.js","assets/src-Cp8CMzw4.js","assets/src-CzyrquHp.js","assets/src-DfwuwgC1.js","assets/src-DoUSIbkA.js","assets/src-MZPs-IJC.js","assets/surveys-BPgesW_9.js","assets/terrainLayer-boEYUps9.js","assets/tint-DqjA_nEY.js","assets/updateJob-C88Mecy2.js","assets/useProjectComputation-C9o3zwF-.js","assets/useWorldPlan-BOY8_4df.js","assets/versionJob-nv5ZdraC.js","assets/world-2yuOopS7.js","assets/world-CHEUV9u-.css","assets/world.worker-Qq67r-TK.js"]};
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
