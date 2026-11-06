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
const MANIFEST = {"version":"321783fe22f4250f","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-CqOW4c6H.js","assets/BuildTab-D1O4fJDV.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-OlMhXxWF.js","assets/EditorTab-C0kpeSZ9.js","assets/ExportTab-COjz0YDF.js","assets/GameCheckPanel-Cgu5UAeM.js","assets/GameLinkBar-8cvpN7DT.js","assets/GuideView-DApfQqDb.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-Ca56y8sR.js","assets/LandscapeTab-CsSOggTh.css","assets/LayerControl-XyhrKB4a.js","assets/LayerSheet-CJM87qej.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-Dqanb1dA.js","assets/MaterialsTab-B2QHAMHO.js","assets/MaterialsTab-CSjNu3WV.css","assets/ModView-CHKjlUWa.js","assets/ModelExportPanel-DmSIzzAP.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BbjevR1e.js","assets/PlanningTab-BfKQbhEJ.css","assets/ProductionTab-DmtitLaH.css","assets/ProductionTab-DngqBWHo.js","assets/ProjectView-B9pBSoNc.js","assets/ProjectView-BI3_5ntu.css","assets/RegionPicker-DQgohQbW.js","assets/SchemView-C83nX5fh.js","assets/SiteTab-D9iCKeUW.js","assets/SystemView-B3hPh4iM.js","assets/TeamJoinView-VDQA0YDt.js","assets/TeamRoom-DmTabRH2.js","assets/TeamTab-CbVFEBRM.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-BFr0pZVc.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-MW24M1-7.js","assets/ThreeViewer-DRdDPpk6.js","assets/UpdatesTab-tX2irA6b.js","assets/Viewer-BFNbDSdt.js","assets/ViewerView-BcN0FhuD.js","assets/WorkshopPage-D4SzJKLi.js","assets/WorldImportView-ClkIWfJS.js","assets/WorldMapView-CAofyo6f.css","assets/WorldMapView-Dy1-xy2g.js","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-D6HcpmAn.js","assets/catalogSnapshot-DZpqDL5Y.js","assets/cellColumns-B1uZgsUd.js","assets/client-KzInW_cD.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-ywxLBJ_W.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-BCPMMZy5.css","assets/editor-BkRXny3o.js","assets/entityScene-BYtCBcxc.js","assets/entityShapes-BwmEWCze.js","assets/glShot-Ce3nd1IK.js","assets/heavy.worker-cs1R60sg.js","assets/idbRepository-COjzXrf8.js","assets/importJob-DUq5lcfK.js","assets/index-BGUWRN9n.css","assets/index-CD28LmJ7.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-oNXt3AEV.js","assets/litematicWrite-BWdn96rt.js","assets/liveClient-B5dmGcPZ.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-BfyiUHWC.js","assets/roomClient-BqW8QNJP.js","assets/scan.worker-DannAPJx.js","assets/serverClient-DRwhCbx6.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BTdokYBA.js","assets/src-Cp8CMzw4.js","assets/src-CtAeAk1M.js","assets/src-DRPimdcZ.js","assets/src-DfwuwgC1.js","assets/src-MZPs-IJC.js","assets/src-Sd26PLmD.js","assets/surveys-KLMmZnp3.js","assets/terrainLayer-DD5ncRhN.js","assets/tint-DqjA_nEY.js","assets/updateJob-BCldMcHy.js","assets/useProjectComputation-xq6kN-jT.js","assets/useWorldPlan-PKerUC0C.js","assets/versionJob-CDrv_tQs.js","assets/world-DKrPT1tu.css","assets/world.worker-DA2JzQgg.js"]};
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
