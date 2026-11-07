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
const MANIFEST = {"version":"e88dc8ecc60b580c","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-BVXYArVb.js","assets/BuildTab-CKp89Gwv.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-DzliBFdo.js","assets/EditorTab-6NF_bf1_.js","assets/ExportTab-CAENnGBV.js","assets/GameCheckPanel-Bve_uJXv.js","assets/GameLinkBar-BUXMn5OL.js","assets/GuideView-D-WFRVeW.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-P3FtkNCR.js","assets/LayerControl-CM0L7JGG.js","assets/LayerSheet-CaFZ_lk7.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-D2hX30aM.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-Cyoac02t.js","assets/ModView-DActeTZd.js","assets/ModelExportPanel-BeFTyh6W.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-RPwB3iD3.js","assets/ProductionTab-BZA5bsZn.css","assets/ProductionTab-D3g8S0xP.js","assets/ProjectView-BqcC5tV0.js","assets/ProjectView-nhGRmnGi.css","assets/RegionPicker-CjSsC3e2.js","assets/SchemView-BNVTa367.js","assets/SiteTab-DauGXV8p.js","assets/SystemView-ME0Q0JqO.js","assets/TeamJoinView-DuWSNoEy.js","assets/TeamRoom-C116Wujw.js","assets/TeamTab-CLhN_vkC.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-CFiOK3rK.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-DBr5njdo.js","assets/ThreeViewer-COqBeV3Z.js","assets/UpdatesTab-BLZBrymy.js","assets/Viewer-CR18oryC.js","assets/ViewerView-BqG08RrR.js","assets/WorkshopPage-CYamR27Q.js","assets/WorldImportView-BKH7kemH.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-DgXBPySR.js","assets/assets-DNDvSM8j.js","assets/build-XJUUmikB.js","assets/buildings-Nq4EKThG.js","assets/catalogSnapshot-hbLknu6F.js","assets/cellColumns-B1uZgsUd.js","assets/client-CBSl7OSt.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-DDKcd8tH.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-C3tJFX_6.js","assets/editor-CUMrSb3H.css","assets/entityScene-CjaKHQg-.js","assets/entityShapes-BwmEWCze.js","assets/glShot-C2bhoWzQ.js","assets/heavy.worker-r9-CJoUW.js","assets/idbRepository-DR3K2gwu.js","assets/importJob-D8hPiu3Z.js","assets/index-BGplBbVG.js","assets/index-C7GD3yNJ.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-Cf1xblz1.js","assets/litematicWrite-CEya01UF.js","assets/liveClient-DWbCYF_U.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-Cq-gIrYK.js","assets/navGroups-C9VwOe8J.css","assets/observation-vV6-Wp6m.js","assets/packKit-xissJbzi.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-CS1EU7Wy.js","assets/roomClient-DRgpXkXW.js","assets/scan.worker-BY6md5Dk.js","assets/serverClient-BcHHdgBU.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BYHmg6sC.js","assets/src-Bzx0D9Bw.js","assets/src-CHEzl81U.js","assets/src-CmTP7eWN.js","assets/src-Cp8CMzw4.js","assets/src-Dnm6mVx9.js","assets/src-MZPs-IJC.js","assets/surveys-38G0zOtH.js","assets/terrainLayer-CGCtcCLQ.js","assets/tint-DqjA_nEY.js","assets/updateJob-B4XOp0K_.js","assets/useProjectComputation-BXGUQ2dQ.js","assets/useWorldPlan-CYoDUNR2.js","assets/versionJob-CeFw8hmt.js","assets/world-DKrPT1tu.css","assets/world.worker-CMdlYd10.js"]};
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
