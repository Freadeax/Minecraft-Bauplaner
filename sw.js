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
const MANIFEST = {"version":"078f089c815ca396","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-BSDgf3Td.js","assets/BuildTab-DqvmEuar.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-D8aPgPSM.js","assets/EditorTab-BiROCZ9m.js","assets/ExportTab-CQqWJ7Ad.js","assets/GameCheckPanel-Bd9LJwXf.js","assets/LandscapeTab-CsSOggTh.css","assets/LandscapeTab-DZbiQ2G4.js","assets/LayerControl-z560vRx3.js","assets/LayerSheet-D7TICOIC.js","assets/LibraryView-D87l_bgM.css","assets/LibraryView-yHT8jh_x.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-DQDNgYQw.js","assets/ModView-B1YsLiNs.js","assets/ModelExportPanel-BfvhHThW.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-CrzCFJqM.js","assets/PlanningTab-DnPUH7I5.css","assets/ProductionTab-DkCn682o.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-BZITdI6j.js","assets/ProjectView-DR2ThTz_.css","assets/SchemView-DJxn9nwA.js","assets/SiteTab-BFe-ctBc.js","assets/SystemView-BYflp5CF.js","assets/TeamJoinView-BqDoJCW6.js","assets/TeamRoom-DU1svJeD.js","assets/TeamTab-CidSo6tZ.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-eY_USwTA.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-CTaAd7mt.js","assets/ThreeViewer-CtrS4iUl.js","assets/UpdatesTab-BcusZAhA.js","assets/Viewer-D4pGqRBD.js","assets/ViewerView-DSav6Es-.js","assets/WorkshopPage-DvBRPeH2.js","assets/WorldImportView-_PYarXNq.js","assets/WorldMapView-9VrS4-EX.js","assets/WorldMapView-CLlNzLmR.css","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-CwtGX3Cu.js","assets/catalogSnapshot-BvmtN47m.js","assets/cellColumns-B1uZgsUd.js","assets/client-ButviXJs.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-Ba5tgQL_.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-BCPMMZy5.css","assets/editor-DuJmvqAd.js","assets/entityScene-BX3u1G_N.js","assets/entityShapes-BwmEWCze.js","assets/glShot-BW3HJ98D.js","assets/heavy.worker-BUTHrJUp.js","assets/idbRepository-BK82yXng.js","assets/importJob-DUq5lcfK.js","assets/index-DdESbV98.css","assets/index-n_6IcBNV.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-BD86ZTV1.js","assets/litematicWrite-BWdn96rt.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-DJfhZa6D.js","assets/roomClient-ycvYlypl.js","assets/scan.worker-DannAPJx.js","assets/scanPersistence-DlqjgcuK.js","assets/serverClient-DxwCF3LJ.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-B6kZbt0Y.js","assets/src-BRNviaxk.js","assets/src-Cp8CMzw4.js","assets/src-DfwuwgC1.js","assets/src-DoUSIbkA.js","assets/src-MZPs-IJC.js","assets/src-ar3obkRl.js","assets/surveys-P5g-Nqm-.js","assets/terrainLayer-BkrgQK4y.js","assets/tint-DqjA_nEY.js","assets/updateJob-BfyZhn2f.js","assets/useProjectComputation-B6G5EkCB.js","assets/useWorldPlan-3acYmtEH.js","assets/versionJob-BfP5TMD9.js","assets/world-BZ7mJe68.js","assets/world-CHEUV9u-.css","assets/world.worker-Lr1-3Z7t.js"]};
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
