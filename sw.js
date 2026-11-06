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
const MANIFEST = {"version":"baf0f611741d3a46","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-B6bClzjx.js","assets/BuildTab-B6tP7cTO.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-DjiXmhVu.js","assets/EditorTab-TEz77f68.js","assets/ExportTab-s9iJ3B4o.js","assets/GameCheckPanel-DZLXJBuZ.js","assets/GameLinkBar-Cnn8Y9UQ.js","assets/GuideView-BUCgYH-n.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-Cd_bNJje.js","assets/LayerControl-D3IaCKUg.js","assets/LayerSheet-3gMWl6zL.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-CV21hCKI.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-fVgAgsrK.js","assets/ModView-Ctt5hCFG.js","assets/ModelExportPanel-D5y_aFay.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-DLQ5gBZE.js","assets/ProductionTab-BQgLgz3u.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-D1A6MVYt.js","assets/ProjectView-nhGRmnGi.css","assets/RegionPicker-yeYAjT7Y.js","assets/SchemView-D1R7Q_JO.js","assets/SiteTab-Ctb_BVNy.js","assets/SystemView-D2rI6e18.js","assets/TeamJoinView-HB4efRF8.js","assets/TeamRoom-inTjbu7T.js","assets/TeamTab-BXo_-AUd.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-Bhik9dtR.js","assets/TestphaseView-BiBwLY_p.js","assets/TestphaseView-C0h6qIBH.css","assets/ThreeViewer-C5iDgTje.js","assets/UpdatesTab-BZOpgKTx.js","assets/Viewer-BNmAvzMX.js","assets/ViewerView-CojaOp0e.js","assets/WorkshopPage-QqxaYPQw.js","assets/WorldImportView-Dw_bSXX3.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-DN3urgau.js","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-BfQ7NF3v.js","assets/catalogSnapshot-CXPLsim-.js","assets/cellColumns-B1uZgsUd.js","assets/client-B7UQssNo.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-D3vUJ1ra.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-CUMrSb3H.css","assets/editor-CmesZb64.js","assets/entityScene-BUd0Xhz-.js","assets/entityShapes-BwmEWCze.js","assets/glShot-DNyYrbZR.js","assets/heavy.worker-GHp1xeqo.js","assets/idbRepository-5cEorQSG.js","assets/importJob-DUq5lcfK.js","assets/index-Bs_g4u2i.js","assets/index-GN2X7f0Z.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-CnNcGsmq.js","assets/litematicWrite-BWdn96rt.js","assets/liveClient-D9WFhdVr.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/navGroups-C9VwOe8J.css","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-BIQgwOFm.js","assets/roomClient-DaTKZA1o.js","assets/scan.worker-DannAPJx.js","assets/serverClient-DEJmplHM.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BTdokYBA.js","assets/src-BYdzT3bG.js","assets/src-C4mec-Lx.js","assets/src-Cp8CMzw4.js","assets/src-DfbjGMS-.js","assets/src-DfwuwgC1.js","assets/src-MZPs-IJC.js","assets/surveys-BXUjC-Dx.js","assets/terrainLayer-CoEPJQyk.js","assets/tint-DqjA_nEY.js","assets/updateJob-D2shvyX4.js","assets/useProjectComputation-XWI9xzzh.js","assets/useWorldPlan-BV5M9PKC.js","assets/versionJob-CKHaTsCY.js","assets/world-DKrPT1tu.css","assets/world.worker-CMdlYd10.js"]};
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
