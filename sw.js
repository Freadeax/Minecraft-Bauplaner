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
const MANIFEST = {"version":"5755619f7f5441ad","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-CrUTYJ01.js","assets/BuildTab-ReIHlDwO.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-BgJQWnEk.js","assets/EditorTab-jtnKeuKi.js","assets/ExportTab-BbGjhnRD.js","assets/GameCheckPanel-C2czrA23.js","assets/GameLinkBar-CLBO0Bhe.js","assets/GuideView-BEem3Pey.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-Cgu5ql_R.js","assets/LayerControl-BKjNYQcM.js","assets/LayerSheet-9QMw96wo.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-DbM4eQr-.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-DRX0MMK_.js","assets/ModView-zIT0jxRo.js","assets/ModelExportPanel-B-TZDWdd.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-DPf5vQlE.js","assets/ProductionTab-BMh5bH5n.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-BH7RBJBq.css","assets/ProjectView-D_ipBKbl.js","assets/RegionPicker-d8Pgv2tZ.js","assets/SchemView-luF5ztJ9.js","assets/SiteTab-CiYTfVg5.js","assets/SystemView-ympDneWO.js","assets/TeamJoinView-CscfDZoe.js","assets/TeamRoom-DsR-BWgz.js","assets/TeamTab-SdPlwa84.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-DBq3SFm5.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-CDSEpGsr.js","assets/ThreeViewer-DfCiilOM.js","assets/UpdatesTab-cF5M1p2R.js","assets/Viewer-8LEQ6K9-.js","assets/ViewerView-DLm-W38B.js","assets/WorkshopPage-PeAvFVh0.js","assets/WorldImportView-D31wbOpt.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-Des7kPCQ.js","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-DSCXhhRD.js","assets/catalogSnapshot-9O3SQgnI.js","assets/cellColumns-B1uZgsUd.js","assets/client-B7UQssNo.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-B5v-18OR.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-CUMrSb3H.css","assets/editor-D2CwzKn7.js","assets/entityScene-CM3BGTD4.js","assets/entityShapes-BwmEWCze.js","assets/glShot-6TPaRQ3t.js","assets/heavy.worker-GHp1xeqo.js","assets/idbRepository-CqHB0AJ3.js","assets/importJob-DUq5lcfK.js","assets/index-BpXXHrEl.js","assets/index-GN2X7f0Z.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-CnNcGsmq.js","assets/litematicWrite-BWdn96rt.js","assets/liveClient-CXt-S37l.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/navGroups-C9VwOe8J.css","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-Yz5_QXWA.js","assets/roomClient-CEnStdb3.js","assets/scan.worker-DannAPJx.js","assets/serverClient-BMI6gYSl.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BE8wdso_.js","assets/src-BTdokYBA.js","assets/src-BYdzT3bG.js","assets/src-Cp8CMzw4.js","assets/src-CqvBratu.js","assets/src-DfwuwgC1.js","assets/src-MZPs-IJC.js","assets/surveys-C9hJ71Yo.js","assets/terrainLayer-DdNWveZk.js","assets/tint-DqjA_nEY.js","assets/updateJob-D2shvyX4.js","assets/useProjectComputation-Zuo1w-Mk.js","assets/useWorldPlan-C80gF5n0.js","assets/versionJob-CKHaTsCY.js","assets/world-DKrPT1tu.css","assets/world.worker-CMdlYd10.js"]};
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
