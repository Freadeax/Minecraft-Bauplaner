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
const MANIFEST = {"version":"b881afc48d398a5f","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-CgJzaWdW.js","assets/BuildTab-SFgHDQz4.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-DQxgID6h.js","assets/EditorTab-iYCflhnR.js","assets/ExportTab-NFdkUIdN.js","assets/GameCheckPanel-D_qtVW6N.js","assets/GameLinkBar-DZHQ6yJt.js","assets/GuideView-D1lMOjKi.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-BpZWeAOA.js","assets/LandscapeTab-CR5WL-8r.css","assets/LayerControl-C8zoc-0Q.js","assets/LayerSheet-DJxDaKif.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-Dbkh2btQ.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-CTB9Y8PX.js","assets/ModView-CD_wqFV5.js","assets/ModelExportPanel-B9uSouim.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-Bvz-0070.js","assets/ProductionTab-BZA5bsZn.css","assets/ProductionTab-Dv0LFHdU.js","assets/ProjectView-Cpuf_XHo.js","assets/ProjectView-h43PPl5E.css","assets/RegionPicker-DmJFYJ_b.js","assets/SchemView-BMeHd7C7.js","assets/SiteTab-Bl_2ylTB.js","assets/SystemView-Br_Z6NNy.js","assets/TeamJoinView-CrdXi8ca.js","assets/TeamRoom-CeTqXVIw.js","assets/TeamTab-CCNppXJf.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-7PSTJMDO.js","assets/TestphaseView-BIhvoBXZ.js","assets/TestphaseView-C0h6qIBH.css","assets/ThreeViewer-BBoERHq1.js","assets/UpdatesTab-ty09ebxi.js","assets/Viewer-B7j7FLYz.js","assets/ViewerView-DJwE8C8A.js","assets/WorkshopPage-BcMPI8Hs.js","assets/WorldImportView-sZo_pHeg.js","assets/WorldMapView-CN_jrJ1q.js","assets/WorldMapView-Cdpw66d8.css","assets/assets-DNDvSM8j.js","assets/build-XJUUmikB.js","assets/buildings-DEDj1Cxk.js","assets/catalogSnapshot-Bqn6MDeW.js","assets/cellColumns-DGEWPp3s.js","assets/client-DloR-uSQ.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-DemFcilN.js","assets/diff-DcVrPQIh.js","assets/diffJob-CSm-KBZe.js","assets/editor-CUMrSb3H.css","assets/editor-lmEu9BWq.js","assets/entityScene-C1Txuph3.js","assets/entityShapes-BwmEWCze.js","assets/glShot-DXRdkn5o.js","assets/heavy.worker-BA6Yddzo.js","assets/idbRepository-DT3rVohi.js","assets/importJob-B2hv2Z56.js","assets/index-C7GD3yNJ.css","assets/index-yrLrMq6i.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-BQIAytvW.js","assets/litematicWrite-BWG_ppHS.js","assets/liveClient-CCVMlxRo.js","assets/map.worker-duP4X7-v.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-CFgiqdJD.js","assets/modelJob-8_1wTw96.js","assets/navGroups-C9VwOe8J.css","assets/observation-BvfExXJQ.js","assets/packKit-xissJbzi.js","assets/preload-helper-YpCHtD0s.js","assets/profile-n0r3L-n1.js","assets/project.worker-BmxtUr9C.js","assets/renderers-gatq8VbV.js","assets/repository-BUp4lhYm.js","assets/roomClient-COjXM-g5.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-B07NPOka.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BB7mH5tT.js","assets/src-BYdalMEj.js","assets/src-CJCOTO9W.js","assets/src-DxucdkOZ.js","assets/src-jqi2klV6.js","assets/src-vb0ozsE8.js","assets/src-xlmRd5mx.js","assets/surveys-DfeHMUiR.js","assets/terrainLayer-C3stbD8s.js","assets/tint-DqjA_nEY.js","assets/updateJob-BfyN9JLn.js","assets/useProjectComputation-o-jZcRri.js","assets/useWorldPlan-CF-dkK2v.js","assets/versionJob-xWKMiib4.js","assets/world-DKrPT1tu.css","assets/world.worker-BtfDRLr9.js"]};
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
