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
const MANIFEST = {"version":"46fdbc20d5b81e96","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-D4zderUk.js","assets/BuildTab-vrgg1o8b.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-D3IBfyBP.js","assets/EditorTab-K7qWBtCv.js","assets/ExportTab-BhyxKqhg.js","assets/GameCheckPanel-DkwEU3Oe.js","assets/GameLinkBar-BH_JGrFB.js","assets/GuideView-Ckd5Mohe.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-MkcJO2ZJ.js","assets/LayerControl-DlwEB7eC.js","assets/LayerSheet-DSbg4QwP.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-mu7tRbUu.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-DHqqItrw.js","assets/ModView-B8KwY4-s.js","assets/ModelExportPanel-DEoGmwva.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BUL_Gi53.js","assets/PlanningTab-BfKQbhEJ.css","assets/PrivacyView-c7a3yohz.js","assets/ProductionTab-BZA5bsZn.css","assets/ProductionTab-DkF1-eyE.js","assets/ProjectView-h43PPl5E.css","assets/ProjectView-hL3S2mYr.js","assets/RegionPicker-s7X2b34-.js","assets/SchemView-xElvZGzj.js","assets/ShareNote-C1UmZsyK.js","assets/SiteTab-BbslmuML.js","assets/StorageWarning-CKbf205-.js","assets/SystemView-CBS1ldPF.js","assets/TeamJoinView-CWMZGE1-.js","assets/TeamRoom-C6yVq1sp.js","assets/TeamTab-BBin4A-d.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-D8x-tBc7.js","assets/TestphaseView-BhYltWFM.js","assets/TestphaseView-C0h6qIBH.css","assets/ThreeViewer-CIZe1Ird.js","assets/UpdatesTab-BKnTK0BF.js","assets/Viewer-BkV1rjDA.js","assets/ViewerView-BXqXqsqn.js","assets/WorkshopPage-4a7lwJhi.js","assets/WorldImportView-BTv2SOMe.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-DQZ7IHON.js","assets/assets-DkLBiu8e.js","assets/build-XJUUmikB.js","assets/buildings-DhEe6stU.js","assets/catalogSnapshot-Cw4FSzgU.js","assets/cellColumns-DGEWPp3s.js","assets/client-BgdXe2YL.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-oXtLeirR.js","assets/diff-CtLuKGdo.js","assets/diffJob-D28cOWFN.js","assets/editor-CUMrSb3H.css","assets/editor-DON-JPAd.js","assets/entityScene-DC4NZPKw.js","assets/entityShapes-BwmEWCze.js","assets/exportSafety-CSj4NNNP.js","assets/glShot-CmpPmR9n.js","assets/heavy.worker-B7OxY49V.js","assets/idbRepository-BNJ5jXNV.js","assets/importJob-Dt6VzfVC.js","assets/index-BZbF9hY8.css","assets/index-iWxEOSoW.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-Bk7Zt8lU.js","assets/litematicWrite-BWG_ppHS.js","assets/liveClient-ClNMQnvK.js","assets/map.worker-duP4X7-v.js","assets/mapHosts-CVCY9zyc.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-BEbxI0G8.js","assets/model-BOXYYw9u.js","assets/modelJob-BhyPQi8L.js","assets/navGroups-C9VwOe8J.css","assets/observation-BvfExXJQ.js","assets/packJob-DO6upBQh.js","assets/packKit-C7L2hm0b.js","assets/preload-helper-YpCHtD0s.js","assets/privacy-DZZy_pwS.css","assets/profile-n0r3L-n1.js","assets/project.worker-BmxtUr9C.js","assets/renderers-gatq8VbV.js","assets/repository-B3Qy89_-.js","assets/roomClient-DpGtuHf1.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-BjejN5KI.js","assets/site-B3XPZgBt.css","assets/snapshot-C6m44fxm.js","assets/snapshot-DE3lHcyr.js","assets/src-B9rb8Wjx.js","assets/src-BX7ytc83.js","assets/src-CTLY9QEh.js","assets/src-DthZxQwt.js","assets/src-jqi2klV6.js","assets/src-p_ieNjXV.js","assets/src-xlmRd5mx.js","assets/surveys-C5WKA41w.js","assets/terrainLayer-lAjfG3aQ.js","assets/tint-DqjA_nEY.js","assets/updateJob-BaqiOM5S.js","assets/useProjectComputation-6JaIpYnL.js","assets/useWorldPlan-BnwjuMR7.js","assets/versionJob-D9FlEArL.js","assets/world-DKrPT1tu.css","assets/world.worker-CSQM7mxP.js"]};
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
