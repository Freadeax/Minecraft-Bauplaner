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
const MANIFEST = {"version":"44a0c79e4ffac049","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-BrBt6g8Y.js","assets/BuildTab-CsOJFOvD.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-DrbaDARY.js","assets/EditorTab-DWPYlIbD.js","assets/ExportTab-DX4L7ls7.js","assets/GameCheckPanel-DnY7PR-_.js","assets/GameLinkBar-CYkdAVFJ.js","assets/GuideView-CjhBgI0S.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-DHWzeQ8e.js","assets/LayerControl-CwdiPwdf.js","assets/LayerSheet-DHf5X6hY.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-CKgoIz8p.js","assets/MaterialsTab-BwxivyEw.js","assets/MaterialsTab-CSjNu3WV.css","assets/ModView-SHdR8091.js","assets/ModelExportPanel-B-cbdsS-.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-DqdjUB0M.js","assets/PrivacyView-BDyBDiRd.js","assets/ProductionTab-BZA5bsZn.css","assets/ProductionTab-wyjlJi6j.js","assets/ProjectView-Dt_QUjOe.js","assets/ProjectView-h43PPl5E.css","assets/RegionPicker-x1DlSimT.js","assets/SchemView-BoVMErpp.js","assets/ShareNote-1LoEJSwb.js","assets/SiteTab-TA3JTX5f.js","assets/StorageWarning-ocXSrUo1.js","assets/SystemView-CozKFo6Q.js","assets/TeamJoinView-Cu-G-uhY.js","assets/TeamRoom-Bi2WDvB_.js","assets/TeamTab-BrdBA6V9.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-Cg-kBOo0.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-Dm-tXJcO.js","assets/ThreeViewer-B1Atfoux.js","assets/UpdatesTab-D3fuKTo1.js","assets/Viewer-DpCunS8s.js","assets/ViewerView-BlFAZB_U.js","assets/WorkshopPage-D3pUR8vR.js","assets/WorldImportView-XHEpzECQ.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-D-3Q_BQ4.js","assets/assets-a4qWWp5J.js","assets/build-XJUUmikB.js","assets/buildings-CUzNIBeO.js","assets/catalogSnapshot-Db8zBHXv.js","assets/cellColumns-DGEWPp3s.js","assets/client-DuLKWs1T.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-DHq-poYK.js","assets/diff-DcVrPQIh.js","assets/diffJob-CSm-KBZe.js","assets/editor-CUMrSb3H.css","assets/editor-DpIUjuLt.js","assets/entityScene-BsulNEPD.js","assets/entityShapes-BwmEWCze.js","assets/glShot-D0EpGs2_.js","assets/heavy.worker-DsEi1ps2.js","assets/idbRepository-DKDO89jt.js","assets/importJob-B2hv2Z56.js","assets/index-DkznSavQ.js","assets/index-Drmiswmq.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-CzRp53pk.js","assets/litematicWrite-BWG_ppHS.js","assets/liveClient-wzRCBXXA.js","assets/map.worker-duP4X7-v.js","assets/mapHosts-CVCY9zyc.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-C0Y4UfU0.js","assets/model-BOXYYw9u.js","assets/modelJob-CNTe2X04.js","assets/navGroups-C9VwOe8J.css","assets/observation-BvfExXJQ.js","assets/packJob-DO6upBQh.js","assets/packKit-C7L2hm0b.js","assets/preload-helper-YpCHtD0s.js","assets/privacy-DZZy_pwS.css","assets/profile-n0r3L-n1.js","assets/project.worker-BmxtUr9C.js","assets/renderers-gatq8VbV.js","assets/repository-DalEZetK.js","assets/roomClient-CczqE7nE.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-BnxS-_Ey.js","assets/site-B3XPZgBt.css","assets/snapshot-C6m44fxm.js","assets/snapshot-DE3lHcyr.js","assets/src-BB7mH5tT.js","assets/src-BV8A6jA-.js","assets/src-CbdiDbgs.js","assets/src-CdQGHkyJ.js","assets/src-jqi2klV6.js","assets/src-vb0ozsE8.js","assets/src-xlmRd5mx.js","assets/surveys-IPs0qzAj.js","assets/terrainLayer-CJAS1Gd-.js","assets/tint-DqjA_nEY.js","assets/updateJob-dgNnKzUG.js","assets/useProjectComputation-EULjZhgp.js","assets/useWorldPlan-BvkQl60X.js","assets/versionJob-DplQmbmk.js","assets/world-DKrPT1tu.css","assets/world.worker-DAe253Sz.js"]};
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
