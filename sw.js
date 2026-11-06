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
const MANIFEST = {"version":"715c6d515085f3ae","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-Sd5RnTb2.js","assets/BuildTab-CPnuYMw5.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-C5xVyhww.js","assets/EditorTab-DF4lAzDi.js","assets/ExportTab-CLEEQepQ.js","assets/GameCheckPanel-DEhKTQfs.js","assets/GameLinkBar-Fnh2N6aU.js","assets/LandscapeTab-Cc8TL2cq.js","assets/LandscapeTab-CsSOggTh.css","assets/LayerControl-D5aQNBw4.js","assets/LayerSheet-CcJlZ2tZ.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-BY7VEY_z.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-Xp3y08dh.js","assets/ModView-B1JpEe_U.js","assets/ModelExportPanel-CGdgAPus.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-C7RnW_Kq.js","assets/ProductionTab-2jKbwCVu.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-BI3_5ntu.css","assets/ProjectView-_Al2BtIX.js","assets/RegionPicker-CXpFSySO.js","assets/SchemView-BizaFXJ6.js","assets/SiteTab-C9ZVd3Jt.js","assets/SystemView-Oysy__cP.js","assets/TeamJoinView-CzVpqGCV.js","assets/TeamRoom-DepQVbf_.js","assets/TeamTab-CoR3Qsfe.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-lA-v6_BD.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-C0ty-WBU.js","assets/ThreeViewer-BBQXdjUH.js","assets/UpdatesTab-BoP-KbP_.js","assets/Viewer-Bo0DQMpL.js","assets/ViewerView-C6eRqSVn.js","assets/WorkshopPage-BBZp8pNV.js","assets/WorldImportView-BOLFtMh7.js","assets/WorldMapView-CzaDlTfu.css","assets/WorldMapView-DtY9LpPb.js","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-DU05PjaV.js","assets/catalogSnapshot-cyj0iVs4.js","assets/cellColumns-B1uZgsUd.js","assets/client-KzInW_cD.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-4pHBw6KM.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-BCPMMZy5.css","assets/editor-CIkePQC6.js","assets/entityScene-9BsWPtHK.js","assets/entityShapes-BwmEWCze.js","assets/glShot-DyPXn6fh.js","assets/heavy.worker-cs1R60sg.js","assets/idbRepository-DnK-TctK.js","assets/importJob-DUq5lcfK.js","assets/index-C5SzkY2O.js","assets/index-CHidlrWi.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-oNXt3AEV.js","assets/litematicWrite-BWdn96rt.js","assets/liveClient-DU5cYpxS.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-CX5dmkQF.js","assets/roomClient-NUAWAOCX.js","assets/scan.worker-DannAPJx.js","assets/serverClient-D4AxdXLM.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-B3SVUsii.js","assets/src-BTdokYBA.js","assets/src-Cp8CMzw4.js","assets/src-CtAeAk1M.js","assets/src-DYnCVJrH.js","assets/src-DfwuwgC1.js","assets/src-MZPs-IJC.js","assets/surveys-C2eR_jdR.js","assets/terrainLayer-C2WgS9m7.js","assets/tint-DqjA_nEY.js","assets/updateJob-BCldMcHy.js","assets/useProjectComputation-Dejz26ui.js","assets/useWorldPlan-DVAu0Wf8.js","assets/versionJob-CDrv_tQs.js","assets/world-DKrPT1tu.css","assets/world.worker-DA2JzQgg.js"]};
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
