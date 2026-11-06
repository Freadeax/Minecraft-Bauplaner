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
const MANIFEST = {"version":"733fe178c8b9c07a","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-DYbqU2JE.js","assets/BuildTab-BZRh0Ivy.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-B7P1fnq3.js","assets/EditorTab-DwpNBMFf.js","assets/ExportTab-J8Azlvg3.js","assets/GameCheckPanel-CR7alEwF.js","assets/LandscapeTab-CsSOggTh.css","assets/LandscapeTab-l_DhGzYz.js","assets/LayerControl-Bq45XiyY.js","assets/LayerSheet-Y3ea2cQt.js","assets/LibraryView-B3_r-Hj6.js","assets/LibraryView-B9Axpnjw.css","assets/MaterialsTab-BwKNd4oI.js","assets/MaterialsTab-CSjNu3WV.css","assets/ModView-B_wW2Bk7.js","assets/ModelExportPanel-CPG46y4F.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-CnN5gr3r.js","assets/ProductionTab-CfCZPKp3.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-DI5elSrx.js","assets/ProjectView-DR2ThTz_.css","assets/SchemView-CWX4xR52.js","assets/SiteTab-CoHkYp6d.js","assets/SystemView-BeV0VEo6.js","assets/TeamJoinView-eVrVlkUs.js","assets/TeamRoom-CPyKBC8r.js","assets/TeamTab-Bgbb3X9J.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-CeZ5xsHb.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-BJbZACq9.js","assets/ThreeViewer-BmwccN_8.js","assets/UpdatesTab-BvhsJ6ki.js","assets/Viewer-D9NVjAqL.js","assets/ViewerView-DTjKle_z.js","assets/WorkshopPage-CygzolLt.js","assets/WorldImportView-K3vD8s-d.js","assets/WorldMapView-CzaDlTfu.css","assets/WorldMapView-PQRwzNnO.js","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-HpGf7bcQ.js","assets/catalogSnapshot-BPeY4hKB.js","assets/cellColumns-B1uZgsUd.js","assets/client-lhKAEu_r.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-ckv1sB5N.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-BCPMMZy5.css","assets/editor-ozEAG1GE.js","assets/entityScene-B1uPuXYo.js","assets/entityShapes-BwmEWCze.js","assets/glShot-DIZsn46R.js","assets/heavy.worker-EV_HMmmd.js","assets/idbRepository-DYXvQ5qO.js","assets/importJob-DUq5lcfK.js","assets/index-CHidlrWi.css","assets/index-oUAYXVgy.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-C8h4bEHl.js","assets/litematicWrite-BWdn96rt.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-CYIARplG.js","assets/roomClient-C4md1act.js","assets/scan.worker-DannAPJx.js","assets/serverClient-Dzf5xmud.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-CDG64lxK.js","assets/src-CQJlgoH2.js","assets/src-Cp8CMzw4.js","assets/src-DfwuwgC1.js","assets/src-DoUSIbkA.js","assets/src-DsoFrKzY.js","assets/src-MZPs-IJC.js","assets/surveys-CVhcdci2.js","assets/terrainLayer-B8A0E-2z.js","assets/tint-DqjA_nEY.js","assets/updateJob-C88Mecy2.js","assets/useProjectComputation-cPPBWdD4.js","assets/useWorldPlan-CldZUfKA.js","assets/versionJob-nv5ZdraC.js","assets/world-CHEUV9u-.css","assets/world-DEfIzngY.js","assets/world.worker-Qq67r-TK.js"]};
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
