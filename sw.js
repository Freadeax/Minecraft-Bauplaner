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
const MANIFEST = {"version":"4e6d0e98cdb29f07","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-QGY5nlNC.js","assets/BuildTab-B5vJchMc.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-DPp_EKUM.js","assets/EditorTab-C3rvjfh2.js","assets/ExportTab-COiEPIhE.js","assets/GameCheckPanel-Du25fJyb.js","assets/LandscapeTab-CsSOggTh.css","assets/LandscapeTab-g3zJCqZS.js","assets/LayerControl-BoZocVNG.js","assets/LayerSheet-D45OuJg5.js","assets/LibraryView-BXQ64ZXr.js","assets/LibraryView-D87l_bgM.css","assets/MaterialsTab-BlSTkVlZ.js","assets/MaterialsTab-CSjNu3WV.css","assets/ModView-Bzu5nN0p.js","assets/ModelExportPanel-Cvw9ga9P.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-DLtilFD6.js","assets/PlanningTab-DnPUH7I5.css","assets/ProductionTab-BwHpQTLu.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-3FYbJ9sP.js","assets/ProjectView-DR2ThTz_.css","assets/SchemView-BzdphVjE.js","assets/SiteTab-BzuVOool.js","assets/SystemView-CNl6dKWy.js","assets/TeamJoinView-k0rEJaKN.js","assets/TeamRoom-Ce0ePEHy.js","assets/TeamTab-VM6gc9ix.css","assets/TeamTab-mdDsjEZB.js","assets/TerrainTab-DsCwj8gQ.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-wqrV3bnp.js","assets/ThreeViewer-3qNr2tMl.js","assets/UpdatesTab-DEgFkG63.js","assets/Viewer-DxPe7U1J.js","assets/ViewerView-Dogg2AnA.js","assets/WorkshopPage-hBS6KnTi.js","assets/WorldImportView-BxAyyG-a.js","assets/WorldMapView-CLlNzLmR.css","assets/WorldMapView-Cb1HKipy.js","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-DBT27sE9.js","assets/catalogSnapshot-Bq2kmkOR.js","assets/cellColumns-B1uZgsUd.js","assets/client-ButviXJs.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-Dyz3xQU6.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-2-tdlO8f.js","assets/editor-BCPMMZy5.css","assets/entityScene-p49slkuI.js","assets/entityShapes-BwmEWCze.js","assets/glShot-C1EX4w2z.js","assets/heavy.worker-BUTHrJUp.js","assets/idbRepository-N0Z4b7c6.js","assets/importJob-DUq5lcfK.js","assets/index-DdESbV98.css","assets/index-jUxoM8qr.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-BD86ZTV1.js","assets/litematicWrite-BWdn96rt.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-Bs4Ceca0.js","assets/roomClient-Cams9dOW.js","assets/scan.worker-DannAPJx.js","assets/scanPersistence-CeEqXT71.js","assets/serverClient-Crt_Dv1r.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-B6kZbt0Y.js","assets/src-CGIIaHKf.js","assets/src-Cp8CMzw4.js","assets/src-CxogIoE9.js","assets/src-DfwuwgC1.js","assets/src-DoUSIbkA.js","assets/src-MZPs-IJC.js","assets/surveys-DXA7QM2C.js","assets/terrainLayer-CnO7I_L8.js","assets/tint-DqjA_nEY.js","assets/updateJob-BfyZhn2f.js","assets/useProjectComputation-Brt5d_0t.js","assets/useWorldPlan-BX-MCKGL.js","assets/versionJob-BfP5TMD9.js","assets/world-CHEUV9u-.css","assets/world-CinVzRAb.js","assets/world.worker-Lr1-3Z7t.js"]};
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
