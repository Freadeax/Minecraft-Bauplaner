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
const MANIFEST = {"version":"fd7c9aa0bf24b357","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-I4a9SsUt.js","assets/BuildTab-D28acoWG.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-Da5EcQxo.js","assets/EditorTab-CAvMQ_K8.js","assets/ExportTab-W1I6Fduv.js","assets/GameCheckPanel-lUyLKvam.js","assets/GameLinkBar-BP2LLj_L.js","assets/GuideView-JR4haXqh.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-D5UaRH17.js","assets/LayerControl-Dk5nQAT5.js","assets/LayerSheet-BlqWHen0.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-BO_QPimT.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-CbRLO4pj.js","assets/ModView-Dkfl6lP0.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/ModelExportPanel-snpKNH7H.js","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-Rg0dIdXl.js","assets/ProductionTab-BZA5bsZn.css","assets/ProductionTab-BjNZT940.js","assets/ProjectView-Drb8pV-L.js","assets/ProjectView-nhGRmnGi.css","assets/RegionPicker-BFnbBAUm.js","assets/SchemView-DsYPcl2W.js","assets/SiteTab-B4RZ2eT-.js","assets/SystemView-CxdcsEbi.js","assets/TeamJoinView-BXKuJijA.js","assets/TeamRoom-B4wjOy9o.js","assets/TeamTab-ORlnuqdt.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-BeAhwCBT.js","assets/TestphaseView-B5pZYHNR.js","assets/TestphaseView-C0h6qIBH.css","assets/ThreeViewer-D1ZxCk5v.js","assets/UpdatesTab-BgXLLIjo.js","assets/Viewer-BSYBeej6.js","assets/ViewerView-DjA8oP4S.js","assets/WorkshopPage-DkomsjaO.js","assets/WorldImportView-Boxj0ON2.js","assets/WorldMapView-CORi5mVm.js","assets/WorldMapView-Cdpw66d8.css","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-BS05OJA9.js","assets/catalogSnapshot-CooYwwZ_.js","assets/cellColumns-B1uZgsUd.js","assets/client-ShZ-A3Eu.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-B9ftz41v.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-CKYYIMUm.js","assets/editor-CUMrSb3H.css","assets/entityScene-vLUQtXMJ.js","assets/entityShapes-BwmEWCze.js","assets/glShot-JbEHeeSM.js","assets/heavy.worker-C9Va_Wno.js","assets/idbRepository-DmlKdpC6.js","assets/importJob-BUPS8uwq.js","assets/index-BmndUQVt.js","assets/index-GN2X7f0Z.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-CnNcGsmq.js","assets/litematicWrite-BWdn96rt.js","assets/liveClient-tS9HwUJK.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-DFki26g9.js","assets/navGroups-C9VwOe8J.css","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-CBgIImtD.js","assets/roomClient-mj1TvAnU.js","assets/scan.worker-DannAPJx.js","assets/serverClient-Tc1Juy_M.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BYdzT3bG.js","assets/src-BuGClYT0.js","assets/src-CGtXz0GB.js","assets/src-Cp8CMzw4.js","assets/src-D4jnbG9Q.js","assets/src-MZPs-IJC.js","assets/src-TjnIlnFa.js","assets/surveys-Du5PwVh1.js","assets/terrainLayer-BQmkWAvG.js","assets/tint-DqjA_nEY.js","assets/updateJob-D2shvyX4.js","assets/useProjectComputation-BhgpnZUw.js","assets/useWorldPlan-CpO1f13M.js","assets/versionJob-CKHaTsCY.js","assets/world-DKrPT1tu.css","assets/world.worker-CMdlYd10.js"]};
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
