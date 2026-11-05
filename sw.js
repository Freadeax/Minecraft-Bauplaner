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
const MANIFEST = {"version":"b4ad4f1603bdd388","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-Bp9jlIlA.js","assets/BuildTab-Heq9MD91.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-B7SMzt7C.js","assets/EditorTab-Kzd7SnzK.js","assets/ExportTab-DMPzcRbI.js","assets/GameCheckPanel-91zRn-9D.js","assets/LandscapeTab-CQS_-Jms.js","assets/LandscapeTab-CsSOggTh.css","assets/LayerControl-BoZocVNG.js","assets/LayerSheet-Dbv0T1hr.js","assets/LibraryView-D87l_bgM.css","assets/LibraryView-REARSbqh.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-kYovX1yN.js","assets/ModView-CExLnIN8.js","assets/ModelExportPanel-BbwjvHbI.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-DOrKv92S.js","assets/PlanningTab-DnPUH7I5.css","assets/ProductionTab-D_moAKgz.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-DR2ThTz_.css","assets/ProjectView-Dqdmy0LM.js","assets/SchemView-CvahR851.js","assets/SiteTab-BoxIhqiB.js","assets/SystemView-BXvjbOKk.js","assets/TeamJoinView-BXZRMwKX.js","assets/TeamRoom-Sbug3mRj.js","assets/TeamTab-Cu80qhzP.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-D0F7d2fR.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-B_PR_3wk.js","assets/ThreeViewer-CSncXQnT.js","assets/UpdatesTab-K6_NrRQp.js","assets/Viewer-mm265nQ3.js","assets/ViewerView-CN6OlraI.js","assets/WorkshopPage-pPhyJC52.js","assets/WorldImportView-DCkghzZ4.js","assets/WorldMapView-CLlNzLmR.css","assets/WorldMapView-tZP7G3z_.js","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-DBT27sE9.js","assets/catalogSnapshot-Bq2kmkOR.js","assets/cellColumns-B1uZgsUd.js","assets/client-ButviXJs.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-CKZ5shlH.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-BCPMMZy5.css","assets/editor-BWWhUGjP.js","assets/entityScene-BtLKeXP3.js","assets/entityShapes-BwmEWCze.js","assets/glShot-CVgHxrQO.js","assets/heavy.worker-BUTHrJUp.js","assets/idbRepository-N0Z4b7c6.js","assets/importJob-DUq5lcfK.js","assets/index-DOPQ9U3W.js","assets/index-DdESbV98.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-BD86ZTV1.js","assets/litematicWrite-BWdn96rt.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-Bs4Ceca0.js","assets/roomClient-Cams9dOW.js","assets/scan.worker-DannAPJx.js","assets/scanPersistence-CeEqXT71.js","assets/serverClient-Crt_Dv1r.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-B6kZbt0Y.js","assets/src-CGIIaHKf.js","assets/src-Cp8CMzw4.js","assets/src-CxogIoE9.js","assets/src-DfwuwgC1.js","assets/src-DoUSIbkA.js","assets/src-MZPs-IJC.js","assets/surveys-Cm20JAxZ.js","assets/terrainLayer-CPJ78zsG.js","assets/tint-DqjA_nEY.js","assets/updateJob-BfyZhn2f.js","assets/useProjectComputation-Brt5d_0t.js","assets/useWorldPlan-Cg92yrUO.js","assets/versionJob-BfP5TMD9.js","assets/world-BQtOagyH.js","assets/world-CHEUV9u-.css","assets/world.worker-Lr1-3Z7t.js"]};
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
