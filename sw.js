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
const MANIFEST = {"version":"868e42bae87d2aad","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-CmtDzH2Q.js","assets/BuildTab-C4uz4yMj.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-BFKXLjcL.js","assets/EditorTab-BBVfwG7m.js","assets/ExportTab-MlVSaBKN.js","assets/GameCheckPanel-DGie8eJV.js","assets/LandscapeTab-CsSOggTh.css","assets/LandscapeTab-qFNPAxQv.js","assets/LayerControl-B1SK5uh3.js","assets/LayerSheet-D7YHfSAF.js","assets/LibraryView-C_jtOKW6.js","assets/LibraryView-D87l_bgM.css","assets/MaterialsTab-BzGH5s0e.js","assets/MaterialsTab-CSjNu3WV.css","assets/ModView-DmB_wlVd.js","assets/ModelExportPanel-CrsZo2gP.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-DUQ0Q3B9.js","assets/ProductionTab-DWIm2cEI.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-B8D9o9ch.js","assets/ProjectView-DR2ThTz_.css","assets/SchemView-CcKP1z5s.js","assets/SiteTab-DRKYaNNR.js","assets/SystemView-JhlWTHgR.js","assets/TeamJoinView-tgBLChVK.js","assets/TeamRoom-LJ_Ryf94.js","assets/TeamTab-VM6gc9ix.css","assets/TeamTab-p-lfIquE.js","assets/TerrainTab-DNDpVTCf.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-cnj2hXJw.js","assets/ThreeViewer-Ja5mcGIr.js","assets/UpdatesTab-UGwk1vgE.js","assets/Viewer-kKVbIZu-.js","assets/ViewerView-BPBQewCI.js","assets/WorkshopPage-CFxG5vhv.js","assets/WorldImportView-ni7c3TzV.js","assets/WorldMapView-CLlNzLmR.css","assets/WorldMapView-sDqdgIDH.js","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-BxZnVHos.js","assets/catalogSnapshot-BxRNSabg.js","assets/cellColumns-B1uZgsUd.js","assets/client-ButviXJs.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-gTHn5aQY.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-BCPMMZy5.css","assets/editor-wlfIMeY_.js","assets/entityScene-BkXnwZWy.js","assets/entityShapes-BwmEWCze.js","assets/glShot-D2kHnBDO.js","assets/heavy.worker-BUTHrJUp.js","assets/idbRepository-hHbK4lYT.js","assets/importJob-DUq5lcfK.js","assets/index-DdESbV98.css","assets/index-DnbmBZ_H.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-BD86ZTV1.js","assets/litematicWrite-BWdn96rt.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-JFhkXhy2.js","assets/roomClient-CukMBsIB.js","assets/scan.worker-DannAPJx.js","assets/scanPersistence-B45KL75Y.js","assets/serverClient-UsBb7fWX.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-B6kZbt0Y.js","assets/src-Bj4uyQed.js","assets/src-Cp8CMzw4.js","assets/src-DVi2VJA1.js","assets/src-DfwuwgC1.js","assets/src-DoUSIbkA.js","assets/src-MZPs-IJC.js","assets/surveys-AN4F8c9m.js","assets/terrainLayer-CuqZp-e3.js","assets/tint-DqjA_nEY.js","assets/updateJob-BfyZhn2f.js","assets/useProjectComputation-Dl7_3deo.js","assets/useWorldPlan-z8gZf_fb.js","assets/versionJob-BfP5TMD9.js","assets/world-CHEUV9u-.css","assets/world-W_zr8e-y.js","assets/world.worker-Lr1-3Z7t.js"]};
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
