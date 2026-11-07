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
const MANIFEST = {"version":"f030da626779322c","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-CMzx6Wtd.js","assets/BuildTab-lKNN5V7K.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-B3DfKFDu.js","assets/EditorTab-DP-336HJ.js","assets/ExportTab-OYaqkRfq.js","assets/GameCheckPanel-C_CccidX.js","assets/GameLinkBar-BXOwetx2.js","assets/GuideView-6uY68bPI.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-DeHYkc1o.js","assets/LayerControl-BnvpHaOC.js","assets/LayerSheet-PJOCQb7H.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-CSzZAQpy.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-uL7c0-aZ.js","assets/ModView-RN3jagRY.js","assets/ModelExportPanel-DUtKZ_Ij.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-o3MMQOi9.js","assets/PrivacyView-uSdkbher.js","assets/ProductionTab-BZA5bsZn.css","assets/ProductionTab-Dd-hwdIx.js","assets/ProjectView-B2fX7_4y.js","assets/ProjectView-h43PPl5E.css","assets/RegionPicker-ceq9h3bQ.js","assets/SchemView-DGHie_It.js","assets/ShareNote-CrqzTkRD.js","assets/SiteTab-CQaR9jlL.js","assets/StorageWarning-DUCQCeEt.js","assets/SystemView-B3NPdo3V.js","assets/TeamJoinView-Dghgs9c0.js","assets/TeamRoom-B93MLud7.js","assets/TeamTab-BdBEiLp-.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-DABlCxG9.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-u1tyxmkh.js","assets/ThreeViewer-fsdMjCIk.js","assets/UpdatesTab-CV0Vy9Sk.js","assets/Viewer-B2SQMQP_.js","assets/ViewerView-DixUz-nf.js","assets/WorkshopPage-D2omQtqC.js","assets/WorldImportView-CR4N8KfJ.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-CiDo62qn.js","assets/assets-DkLBiu8e.js","assets/build-XJUUmikB.js","assets/buildings-BA1bOGvJ.js","assets/catalogSnapshot-OTW6cK7a.js","assets/cellColumns-DGEWPp3s.js","assets/client-BgdXe2YL.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-CUwCccxy.js","assets/diff-CtLuKGdo.js","assets/diffJob-D28cOWFN.js","assets/editor-CUMrSb3H.css","assets/editor-DJxuBa8w.js","assets/entityScene-CK1gsTEz.js","assets/entityShapes-BwmEWCze.js","assets/exportSafety-CSj4NNNP.js","assets/flow-Bh2kOY8D.css","assets/glShot-B7Q4Ljgz.js","assets/heavy.worker-B7OxY49V.js","assets/idbRepository-DnQLM2s8.js","assets/importJob-Dt6VzfVC.js","assets/index-BZbF9hY8.css","assets/index-DI5j2gHl.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-Bk7Zt8lU.js","assets/litematicWrite-BWG_ppHS.js","assets/liveClient-Css2Hucw.js","assets/map.worker-duP4X7-v.js","assets/mapHosts-CVCY9zyc.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-BEbxI0G8.js","assets/model-BOXYYw9u.js","assets/modelJob-BhyPQi8L.js","assets/navGroups-C9VwOe8J.css","assets/observation-BvfExXJQ.js","assets/packJob-DO6upBQh.js","assets/packKit-C7L2hm0b.js","assets/preload-helper-YpCHtD0s.js","assets/privacy-DZZy_pwS.css","assets/profile-n0r3L-n1.js","assets/project.worker-BmxtUr9C.js","assets/renderers-gatq8VbV.js","assets/repository-CdUMt_nD.js","assets/roomClient-BtqcvaN_.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-BfKsPiNq.js","assets/site-B3XPZgBt.css","assets/snapshot-C6m44fxm.js","assets/snapshot-DE3lHcyr.js","assets/src-B9rb8Wjx.js","assets/src-BX7ytc83.js","assets/src-Bz9Orx3E.js","assets/src-CTLY9QEh.js","assets/src-D73AeRa1.js","assets/src-jqi2klV6.js","assets/src-xlmRd5mx.js","assets/surveys-ZvgiRRse.js","assets/terrainLayer-y47S0CCK.js","assets/tint-DqjA_nEY.js","assets/updateJob-BaqiOM5S.js","assets/useProjectComputation-DQU7qD7r.js","assets/useWorldPlan-BO8MHhEc.js","assets/versionJob-D9FlEArL.js","assets/world-DKrPT1tu.css","assets/world.worker-CSQM7mxP.js"]};
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
