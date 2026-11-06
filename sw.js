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
const MANIFEST = {"version":"76c117b992b471e9","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-DZDUQMwl.js","assets/BuildTab-BEqYeS76.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-CFrfJBwB.js","assets/EditorTab-BB6gwt8E.js","assets/ExportTab-B3ANz0IF.js","assets/GameCheckPanel-BWhamFza.js","assets/GameLinkBar-BLOGJT04.js","assets/GuideView-DdlfNlwy.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-B-EMpSVB.js","assets/LandscapeTab-CR5WL-8r.css","assets/LayerControl-DVeDrxK6.js","assets/LayerSheet-CwFPTJnV.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-z7kcU1KL.js","assets/MaterialsTab-BIloGhxu.js","assets/MaterialsTab-CSjNu3WV.css","assets/ModView-B4l3RMJD.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/ModelExportPanel-U1Ozdvs5.js","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-CkB3jCtE.js","assets/ProductionTab-B9evTUdd.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-CS1YcJ-L.js","assets/ProjectView-rWQQkQkb.css","assets/RegionPicker-ClwawGyp.js","assets/SchemView-D1D3hdbI.js","assets/SiteTab-emakd1W3.js","assets/SystemView-XCkBOJsQ.js","assets/TeamJoinView-3EVW10z_.js","assets/TeamRoom-BPpJ5uKD.js","assets/TeamTab-CTPXNz7k.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-Ds8W72AB.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-CCohQfMI.js","assets/ThreeViewer-aFoDuDuM.js","assets/UpdatesTab-BEalfW2E.js","assets/Viewer-Dov7YV1J.js","assets/ViewerView-BS2dilxY.js","assets/WorkshopPage-B8P7xolE.js","assets/WorldImportView-O9XNd8ko.js","assets/WorldMapView-8ecsOZDY.js","assets/WorldMapView-Cdpw66d8.css","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-0-_f13UF.js","assets/catalogSnapshot-gl0DFvFO.js","assets/cellColumns-B1uZgsUd.js","assets/client-B9PoX4wH.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-XajP-y0g.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-CUMrSb3H.css","assets/editor-EDbilYre.js","assets/entityScene-CJP2ZPFX.js","assets/entityShapes-BwmEWCze.js","assets/glShot-D7Tw6Snz.js","assets/heavy.worker-B25w0lOK.js","assets/idbRepository-B6COwUY0.js","assets/importJob-DUq5lcfK.js","assets/index-GN2X7f0Z.css","assets/index-HZrs4FQV.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-D_SHYNyy.js","assets/litematicWrite-BWdn96rt.js","assets/liveClient-BPw0u9Dv.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/navGroups-C9VwOe8J.css","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-DbeOMgiH.js","assets/roomClient-CDvK32Yu.js","assets/scan.worker-DannAPJx.js","assets/serverClient-BkiatRty.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BTdokYBA.js","assets/src-CHhTFmsR.js","assets/src-Cp8CMzw4.js","assets/src-D5Mf8oq9.js","assets/src-D9Vieqsp.js","assets/src-DfwuwgC1.js","assets/src-MZPs-IJC.js","assets/surveys-B2TjuzrF.js","assets/terrainLayer-DizOCNjd.js","assets/tint-DqjA_nEY.js","assets/updateJob-C0ogg12I.js","assets/useProjectComputation-CBMqck9a.js","assets/useWorldPlan-DYmpBQfh.js","assets/versionJob-aedd5mRw.js","assets/world-DKrPT1tu.css","assets/world.worker-CMdlYd10.js"]};
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
