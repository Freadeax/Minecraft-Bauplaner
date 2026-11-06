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
const MANIFEST = {"version":"4582f2d905393ce4","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-BXfsvHum.js","assets/BuildTab-BU7PzagO.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-BRhIoH5L.js","assets/EditorTab-CFgxNw7U.js","assets/ExportTab-CakmI6L6.js","assets/GameCheckPanel-DXHrsa4F.js","assets/GameLinkBar-BP2LLj_L.js","assets/GuideView-Dcu-uYsp.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-JWq-MLMh.js","assets/LayerControl-Dk5nQAT5.js","assets/LayerSheet-BZ7msWie.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-pZUP_Fd4.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-aBuZ2DjX.js","assets/ModView-CrY-F6Ug.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/ModelExportPanel-dN6O2om-.js","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-CkDiHLRF.js","assets/ProductionTab-BZA5bsZn.css","assets/ProductionTab-BvEgAaCq.js","assets/ProjectView-D4sVk4qT.js","assets/ProjectView-nhGRmnGi.css","assets/RegionPicker-B5HQmwH-.js","assets/SchemView-DJ2crb46.js","assets/SiteTab-DB-He2gw.js","assets/SystemView-DXQf3eoU.js","assets/TeamJoinView-B7sZVss-.js","assets/TeamRoom-B_G4eIBD.js","assets/TeamTab-VM6gc9ix.css","assets/TeamTab-uV9BOYY6.js","assets/TerrainTab-CPfDqS08.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-DgE5Atvb.js","assets/ThreeViewer-CVqGi59T.js","assets/UpdatesTab-dif4kmId.js","assets/Viewer-D87kA6l1.js","assets/ViewerView-IPdMvwLQ.js","assets/WorkshopPage-C5HugGE8.js","assets/WorldImportView-MOpycdSo.js","assets/WorldMapView-BP5TB3BT.js","assets/WorldMapView-Cdpw66d8.css","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-BS05OJA9.js","assets/catalogSnapshot-CooYwwZ_.js","assets/cellColumns-B1uZgsUd.js","assets/client-ShZ-A3Eu.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-D14jlPUL.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-ByuaZHVG.js","assets/editor-CUMrSb3H.css","assets/entityScene-B0FA-_oT.js","assets/entityShapes-BwmEWCze.js","assets/glShot-OnEsH845.js","assets/heavy.worker-C9Va_Wno.js","assets/idbRepository-DmlKdpC6.js","assets/importJob-BUPS8uwq.js","assets/index-BKNP8gJB.js","assets/index-GN2X7f0Z.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-CnNcGsmq.js","assets/litematicWrite-BWdn96rt.js","assets/liveClient-tS9HwUJK.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-DFki26g9.js","assets/navGroups-C9VwOe8J.css","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-CBgIImtD.js","assets/roomClient-mj1TvAnU.js","assets/scan.worker-DannAPJx.js","assets/serverClient-Tc1Juy_M.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BYdzT3bG.js","assets/src-BuGClYT0.js","assets/src-CGtXz0GB.js","assets/src-Cp8CMzw4.js","assets/src-D4jnbG9Q.js","assets/src-MZPs-IJC.js","assets/src-TjnIlnFa.js","assets/surveys-BVXfSN_Z.js","assets/terrainLayer-C9L9PTSr.js","assets/tint-DqjA_nEY.js","assets/updateJob-D2shvyX4.js","assets/useProjectComputation-BhgpnZUw.js","assets/useWorldPlan-CgQaYeiR.js","assets/versionJob-CKHaTsCY.js","assets/world-DKrPT1tu.css","assets/world.worker-CMdlYd10.js"]};
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
