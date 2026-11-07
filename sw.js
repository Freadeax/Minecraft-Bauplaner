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
const MANIFEST = {"version":"2fabdccb94c4fc9f","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-CM-zdfLF.js","assets/BuildTab-CzIz9BSZ.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-Cqkehto8.js","assets/EditorTab-BDSrt3y8.js","assets/ExportTab-ih0f5eLI.js","assets/GameCheckPanel-C79Pqt6u.js","assets/GameLinkBar-BMMefg0e.js","assets/GuideView-Bv27KvvG.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-_yJg_EpK.js","assets/LayerControl-CEoWc8d8.js","assets/LayerSheet-DR-fESgR.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-zTkFdHqN.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-Dn0f866e.js","assets/ModView-CKCzuMFn.js","assets/ModelExportPanel--meGEInd.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-Cc17cGl7.js","assets/ProductionTab-BZA5bsZn.css","assets/ProductionTab-BjmL7B9C.js","assets/ProjectView-Hl2yvJ2r.js","assets/ProjectView-nhGRmnGi.css","assets/RegionPicker-C1K9rr6n.js","assets/SchemView-Dg7PFsmU.js","assets/SiteTab-Dh322QxI.js","assets/SystemView-Ce1hTf5Z.js","assets/TeamJoinView-DS2_xoZF.js","assets/TeamRoom-BuKeq0xZ.js","assets/TeamTab-CQofoY7N.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-BEmhFh_O.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-DjKkIb2A.js","assets/ThreeViewer-BsJD10yR.js","assets/UpdatesTab-d7FxFO8V.js","assets/Viewer-Bj3sNevJ.js","assets/ViewerView-BvPXxYuD.js","assets/WorkshopPage-DQtZh0Py.js","assets/WorldImportView-CpR-JOG3.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-FVp_hwoq.js","assets/assets-DNDvSM8j.js","assets/build-XJUUmikB.js","assets/buildings-BxbyUV9w.js","assets/catalogSnapshot-BLgGP3qB.js","assets/cellColumns-Ba37nb2q.js","assets/client-CcTnWDqe.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-DT4jYuqD.js","assets/diff-BWA45IdR.js","assets/diffJob-DzsL97Co.js","assets/editor-CUMrSb3H.css","assets/editor-CivlDEYo.js","assets/entityScene-BctIz2Rn.js","assets/entityShapes-BwmEWCze.js","assets/glShot-BWG-1u3D.js","assets/heavy.worker-L8KtQ3Ix.js","assets/idbRepository-CQ6nKowf.js","assets/importJob-CY3VgnhZ.js","assets/index-Bt8PJ6Ku.js","assets/index-C7GD3yNJ.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-DE9qn9FN.js","assets/litematicWrite-DYZoXNKZ.js","assets/liveClient-BahTYF-s.js","assets/map.worker-duP4X7-v.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-DsGlGlCA.js","assets/modelJob-CApPIDLB.js","assets/navGroups-C9VwOe8J.css","assets/observation-Bu_jB6_w.js","assets/packKit-xissJbzi.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CCxR_exi.js","assets/project.worker-BmxtUr9C.js","assets/renderers-gatq8VbV.js","assets/repository-zgFIZiH8.js","assets/roomClient-DeLiQq3m.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-BgpOL4KD.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-935aylju.js","assets/src-BQTgw3p6.js","assets/src-BQlTT2WF.js","assets/src-BvbcQL8z.js","assets/src-Dw3jJzUt.js","assets/src-iSnQ2NRu.js","assets/src-nXBdKfKV.js","assets/surveys-DvMBMB7v.js","assets/terrainLayer-aPb5g-8h.js","assets/tint-DqjA_nEY.js","assets/updateJob-6W8DPUVo.js","assets/useProjectComputation-X0tL__79.js","assets/useWorldPlan-DiLkR6av.js","assets/versionJob-DE-94dSQ.js","assets/world-DKrPT1tu.css","assets/world.worker-CBbn3uso.js"]};
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
