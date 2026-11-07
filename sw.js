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
const MANIFEST = {"version":"6a914793dd17857f","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-DWuqjVeF.js","assets/BuildTab-BW_o6m51.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-CC8IrFxm.js","assets/EditorTab-BWWRXiEC.js","assets/ExportTab-Dly701t_.js","assets/GameCheckPanel-CW3WDyyN.js","assets/GameLinkBar-BJGEMLJW.js","assets/GuideView-DTUouK_Z.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-CTwsgB2Y.js","assets/LayerControl-fOH9l_KE.js","assets/LayerSheet-hXK180FD.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-DAxLGcNh.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-DWHZEd0i.js","assets/ModView-lEMXCPJm.js","assets/ModelExportPanel-0E_8OisX.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-pNIV0Web.js","assets/ProductionTab-B6ED-dkZ.js","assets/ProductionTab-BZA5bsZn.css","assets/ProjectView-Cz0ys83K.js","assets/ProjectView-nhGRmnGi.css","assets/RegionPicker-BgEpK9cW.js","assets/SchemView-Y-WUD_4u.js","assets/SiteTab-DrqIpV2g.js","assets/SystemView-ClEHuAic.js","assets/TeamJoinView-BiJ-NdIJ.js","assets/TeamRoom-CKN3koIn.js","assets/TeamTab-CEBsVc3f.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-BlJsgfhM.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-CufkSt9M.js","assets/ThreeViewer-DSBd42R7.js","assets/UpdatesTab-C5L8PaxB.js","assets/Viewer-Z9GS0fJd.js","assets/ViewerView-B1eV1QOs.js","assets/WorkshopPage-BlfTMkCc.js","assets/WorldImportView-DAqdcS1M.js","assets/WorldMapView-2kVh1g8X.js","assets/WorldMapView-Cdpw66d8.css","assets/assets-DNDvSM8j.js","assets/build-XJUUmikB.js","assets/buildings-De1X55Qt.js","assets/catalogSnapshot-BLGarqFj.js","assets/cellColumns-DGEWPp3s.js","assets/client-BKyrCxIZ.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-DCQ5CUni.js","assets/diff-DcVrPQIh.js","assets/diffJob-CSm-KBZe.js","assets/editor-CUMrSb3H.css","assets/editor-CyLda0st.js","assets/entityScene-CMFI7Nda.js","assets/entityShapes-BwmEWCze.js","assets/glShot-C_BbkJ_7.js","assets/heavy.worker-D-o7pVrA.js","assets/idbRepository-BWrE7ODD.js","assets/importJob-42hDYQXb.js","assets/index-C7GD3yNJ.css","assets/index-HcpXthq0.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-DCeCVycv.js","assets/litematicWrite-DKCF_TEf.js","assets/liveClient-CZs1bPOO.js","assets/map.worker-duP4X7-v.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-CFgiqdJD.js","assets/modelJob-D79ku8fV.js","assets/navGroups-C9VwOe8J.css","assets/observation-BvfExXJQ.js","assets/packKit-xissJbzi.js","assets/preload-helper-YpCHtD0s.js","assets/profile-n0r3L-n1.js","assets/project.worker-BmxtUr9C.js","assets/renderers-gatq8VbV.js","assets/repository-CDra53vh.js","assets/roomClient-C4YPHnS8.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-xHPdpx2p.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BB7mH5tT.js","assets/src-C45hImtV.js","assets/src-C7e--sCy.js","assets/src-CreN4PGS.js","assets/src-DX2fV1Qz.js","assets/src-DtYPxNDH.js","assets/src-vb0ozsE8.js","assets/surveys-D7kcrx6i.js","assets/terrainLayer-CM7sjaeE.js","assets/tint-DqjA_nEY.js","assets/updateJob-DDkF1kx1.js","assets/useProjectComputation-CxmgbBbc.js","assets/useWorldPlan-D_Ca2fvp.js","assets/versionJob-BfJsVps_.js","assets/world-DKrPT1tu.css","assets/world.worker-CiT51YKm.js"]};
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
