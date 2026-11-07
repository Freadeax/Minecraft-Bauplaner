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
const MANIFEST = {"version":"8b5aaec5aa330df9","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-C60uNJ0M.js","assets/BuildTab-CtDkTcFj.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-Da9lAP_m.js","assets/EditorTab-C503WiKt.js","assets/ExportTab-Pgd2vw_2.js","assets/GameCheckPanel-DHp6ZQuD.js","assets/GameLinkBar-BXtPQEOb.js","assets/GuideView-DqqDztAP.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-BoBJVDsn.js","assets/LandscapeTab-CR5WL-8r.css","assets/LayerControl-sgnuOfhS.js","assets/LayerSheet-CECPvJLF.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-jzFqwZB5.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-Cp0SdOp2.js","assets/ModView-DngEXBgv.js","assets/ModelExportPanel-B8d_49ZV.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-CNxWlg9L.js","assets/ProductionTab-BUer5BIa.js","assets/ProductionTab-BZA5bsZn.css","assets/ProjectView-h43PPl5E.css","assets/ProjectView-tYqydJ1k.js","assets/RegionPicker-_sV_GiJP.js","assets/SchemView-DZK3HXRh.js","assets/SiteTab-DDIcyLTy.js","assets/SystemView-CsxhvrQQ.js","assets/TeamJoinView-ArUu_ELB.js","assets/TeamRoom-DvqOUMsr.js","assets/TeamTab-DLPBmExF.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-CrfMGzBl.js","assets/TestphaseView-BqTfMrLH.js","assets/TestphaseView-C0h6qIBH.css","assets/ThreeViewer-DKnhYXI0.js","assets/UpdatesTab-CTgAbV4k.js","assets/Viewer-BuSyFdJd.js","assets/ViewerView-qDOssVSW.js","assets/WorkshopPage-Cq3UZIA-.js","assets/WorldImportView-CEpOQpAu.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-uOYOyJNi.js","assets/assets-DNDvSM8j.js","assets/build-XJUUmikB.js","assets/buildings-Dyq6kO5n.js","assets/catalogSnapshot-RhZSJiRG.js","assets/cellColumns-DGEWPp3s.js","assets/client-DTuexjX1.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-7ZhEcQXd.js","assets/diff-DcVrPQIh.js","assets/diffJob-CSm-KBZe.js","assets/editor-CUMrSb3H.css","assets/editor-DTk0EVs1.js","assets/entityScene-xCQriRjw.js","assets/entityShapes-BwmEWCze.js","assets/glShot-BXNwkoVU.js","assets/heavy.worker--HdgMUJy.js","assets/idbRepository-B2pXfTz6.js","assets/importJob-B2hv2Z56.js","assets/index-Drmiswmq.css","assets/index-It7t84xu.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-CzRp53pk.js","assets/litematicWrite-BWG_ppHS.js","assets/liveClient-BY3hrUTr.js","assets/map.worker-duP4X7-v.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-CFgiqdJD.js","assets/modelJob-8_1wTw96.js","assets/navGroups-C9VwOe8J.css","assets/observation-BvfExXJQ.js","assets/packKit-xissJbzi.js","assets/preload-helper-YpCHtD0s.js","assets/profile-n0r3L-n1.js","assets/project.worker-BmxtUr9C.js","assets/renderers-gatq8VbV.js","assets/repository-DcfH1bN1.js","assets/roomClient-CqIRP3FH.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-fuID-b8y.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-8EBs0PAU.js","assets/src-BB7mH5tT.js","assets/src-BV8A6jA-.js","assets/src-CHfpoQvH.js","assets/src-jqi2klV6.js","assets/src-vb0ozsE8.js","assets/src-xlmRd5mx.js","assets/surveys-DakXE-4L.js","assets/terrainLayer-DFW2M4Nf.js","assets/tint-DqjA_nEY.js","assets/updateJob-dgNnKzUG.js","assets/useProjectComputation-H2i9GxRp.js","assets/useWorldPlan-CPLHkMWZ.js","assets/versionJob-DplQmbmk.js","assets/world-DKrPT1tu.css","assets/world.worker-DAe253Sz.js"]};
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
