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
const MANIFEST = {"version":"5b5de9ec9b5f6c19","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-Dlz7pDoy.js","assets/BuildTab-CE3Oxv82.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-BLdNEpNx.js","assets/EditorTab-D-RoB-b6.js","assets/ExportTab-C9Yb3XHU.js","assets/GameCheckPanel-CqYqYCLj.js","assets/GameLinkBar-BH_U2kl3.js","assets/GuideView-D6yAsvnE.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-1jh9_pGa.js","assets/LandscapeTab-CR5WL-8r.css","assets/LayerControl-HiDR71bW.js","assets/LayerSheet-ClgQDSQe.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-Cyxp9DfL.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-CgHMMEkR.js","assets/ModView-C8__xy9a.js","assets/ModelExportPanel-B4Mf9U0k.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-D0s5EVp9.js","assets/PrivacyView-D4jSKQI_.js","assets/ProductionTab-BZA5bsZn.css","assets/ProductionTab-BjP1T9fF.js","assets/ProjectView-EgAGD-e5.js","assets/ProjectView-h43PPl5E.css","assets/RegionPicker-C5zoVlvt.js","assets/SchemView-D0i6u_bI.js","assets/ShareNote-CbBoK4El.js","assets/SiteTab-DeVHgC4X.js","assets/StorageWarning-BrlfVzcj.js","assets/SystemView-BHOTa73-.js","assets/TeamJoinView-AAwlNmvA.js","assets/TeamRoom-BvGo-MAS.js","assets/TeamTab-VM6gc9ix.css","assets/TeamTab-dr4LlKsw.js","assets/TerrainTab-DSucgX54.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-CEE2Kt1O.js","assets/ThreeViewer-C2kRdjEs.js","assets/UpdatesTab-DMgpA6d9.js","assets/Viewer-C6j6Wh64.js","assets/ViewerView-BFAoqc3m.js","assets/WorkshopPage-C8ErwcEx.js","assets/WorldImportView-HzDw3uZ8.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-DbCHfVWM.js","assets/assets-u-5b6C_k.js","assets/build-XJUUmikB.js","assets/buildings-nW0HP-8B.js","assets/catalogSnapshot-BGMHP2N6.js","assets/cellColumns-DGEWPp3s.js","assets/client-DCmkF6gZ.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-XqAAGOMB.js","assets/diff-CtLuKGdo.js","assets/diffJob-D28cOWFN.js","assets/editor-CUMrSb3H.css","assets/editor-Dw8oIDHq.js","assets/entityScene-D5f8aV7e.js","assets/entityShapes-BwmEWCze.js","assets/exportSafety-CSj4NNNP.js","assets/flow-Bh2kOY8D.css","assets/glShot-lO94nWyW.js","assets/heavy.worker-DuPnP4JP.js","assets/idbRepository-CC7bmOsZ.js","assets/importJob-Dt6VzfVC.js","assets/index-BZbF9hY8.css","assets/index-Dlm2HK93.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-wRe1PGxP.js","assets/litematicWrite-BWG_ppHS.js","assets/liveClient-CHPKEUoC.js","assets/map.worker-duP4X7-v.js","assets/mapHosts-CVCY9zyc.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-BEbxI0G8.js","assets/model-BOXYYw9u.js","assets/modelJob-BhyPQi8L.js","assets/navGroups-C9VwOe8J.css","assets/observation-BvfExXJQ.js","assets/packJob-DO6upBQh.js","assets/packKit-C7L2hm0b.js","assets/preload-helper-YpCHtD0s.js","assets/privacy-DZZy_pwS.css","assets/profile-n0r3L-n1.js","assets/project.worker-BmxtUr9C.js","assets/renderers-gatq8VbV.js","assets/repository-Ci-owRVn.js","assets/roomClient-BPAT0HPx.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-CrjHu-CY.js","assets/site-B3XPZgBt.css","assets/snapshot-C6m44fxm.js","assets/snapshot-DE3lHcyr.js","assets/src-0dtxF-b9.js","assets/src-B1C4Qkfu.js","assets/src-B9rb8Wjx.js","assets/src-BX7ytc83.js","assets/src-DMN3O0XO.js","assets/src-jqi2klV6.js","assets/src-xlmRd5mx.js","assets/surveys-Banp7Xyi.js","assets/terrainLayer-B4XpnM06.js","assets/tint-DqjA_nEY.js","assets/updateJob-BIBoeeTu.js","assets/useProjectComputation-CjagLAt6.js","assets/useWorldPlan-B91W5cRq.js","assets/versionJob-jKvfr5T1.js","assets/world-DKrPT1tu.css","assets/world.worker-CSQM7mxP.js"]};
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
