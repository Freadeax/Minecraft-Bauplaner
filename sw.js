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
const MANIFEST = {"version":"2d4713ad8f1f583e","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-S-Ro5BbM.js","assets/BuildTab-BBU9Z1ao.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-49giDc0s.js","assets/EditorTab-IaRzA-gw.js","assets/ExportTab-CjTJLio6.js","assets/GameCheckPanel-CnqjpxUk.js","assets/GameLinkBar-8cvpN7DT.js","assets/LandscapeTab-Bh9S2Yht.js","assets/LandscapeTab-CsSOggTh.css","assets/LayerControl-XyhrKB4a.js","assets/LayerSheet-CuuVd_f5.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-BaFk-8Pg.js","assets/MaterialsTab-BbXfDLdh.js","assets/MaterialsTab-CSjNu3WV.css","assets/ModView-C0SCK_Rh.js","assets/ModelExportPanel-CxOY9nCv.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BOeS4o1I.js","assets/PlanningTab-BfKQbhEJ.css","assets/ProductionTab-Da9K0uD5.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-BI3_5ntu.css","assets/ProjectView-CNZaTk2D.js","assets/RegionPicker-CtUDPrxf.js","assets/SchemView-B69fDWuj.js","assets/SiteTab-BriyG_h9.js","assets/SystemView-Dlb4w0Fe.js","assets/TeamJoinView-BTXBARuz.js","assets/TeamRoom-CShV0jzz.js","assets/TeamTab-CnfexXKM.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-SItMom6V.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-9nUMznqn.js","assets/ThreeViewer-CJw_eWCi.js","assets/UpdatesTab-Cd_-jLcZ.js","assets/Viewer-CZdbuUDb.js","assets/ViewerView-y9sAKW-V.js","assets/WorkshopPage-BwLt4TjC.js","assets/WorldImportView-DLghgKgA.js","assets/WorldMapView-CAofyo6f.css","assets/WorldMapView-DTHNzkHO.js","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-D6HcpmAn.js","assets/catalogSnapshot-DZpqDL5Y.js","assets/cellColumns-B1uZgsUd.js","assets/client-KzInW_cD.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-C9xx9sJS.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-BCPMMZy5.css","assets/editor-CrCRzWZW.js","assets/entityScene-t3Owu5JP.js","assets/entityShapes-BwmEWCze.js","assets/glShot-BqGMgiqG.js","assets/heavy.worker-cs1R60sg.js","assets/idbRepository-COjzXrf8.js","assets/importJob-DUq5lcfK.js","assets/index-CHidlrWi.css","assets/index-D4gBoYVN.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-oNXt3AEV.js","assets/litematicWrite-BWdn96rt.js","assets/liveClient-B5dmGcPZ.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-BfyiUHWC.js","assets/roomClient-BqW8QNJP.js","assets/scan.worker-DannAPJx.js","assets/serverClient-DRwhCbx6.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BTdokYBA.js","assets/src-Cp8CMzw4.js","assets/src-CtAeAk1M.js","assets/src-DRPimdcZ.js","assets/src-DfwuwgC1.js","assets/src-MZPs-IJC.js","assets/src-Sd26PLmD.js","assets/surveys-Dx4HIyKH.js","assets/terrainLayer-DgSLvc1_.js","assets/tint-DqjA_nEY.js","assets/updateJob-BCldMcHy.js","assets/useProjectComputation-xq6kN-jT.js","assets/useWorldPlan-BmD6AewB.js","assets/versionJob-CDrv_tQs.js","assets/world-DKrPT1tu.css","assets/world.worker-DA2JzQgg.js"]};
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
