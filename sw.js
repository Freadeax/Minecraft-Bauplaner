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
const MANIFEST = {"version":"4eed39fa776defe2","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-CKBNu4jz.js","assets/BuildTab-s9JD4fd4.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-BJGb_XAu.js","assets/EditorTab-CXXHiDD5.js","assets/ExportTab-7ZiaC8v6.js","assets/GameCheckPanel-Cs2isYZV.js","assets/GameLinkBar-BuHDEYds.js","assets/GuideView-B9DF9k1l.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-Deh29P9F.js","assets/LayerControl-DzHRM20b.js","assets/LayerSheet-CCcU7b76.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-CCxfxyFr.js","assets/MaterialsTab-BvWS05np.js","assets/MaterialsTab-CSjNu3WV.css","assets/ModView-DE2U8AAJ.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/ModelExportPanel-S3ZTPNIE.js","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-Cfi9Vqro.js","assets/ProductionTab-BPYmUuWF.js","assets/ProductionTab-BZA5bsZn.css","assets/ProjectView-J-rijO4d.js","assets/ProjectView-nhGRmnGi.css","assets/RegionPicker-Fii8s8tQ.js","assets/SchemView-D_TlEFfC.js","assets/SiteTab-DK41KKv1.js","assets/SystemView-DusJ96NF.js","assets/TeamJoinView-68cims5-.js","assets/TeamRoom-BpysmeNe.js","assets/TeamTab-DrQqz6Sb.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-BFRjJlz_.js","assets/TestphaseView-BbglWlna.js","assets/TestphaseView-C0h6qIBH.css","assets/ThreeViewer-BZhSfUP6.js","assets/UpdatesTab-Dk711JPK.js","assets/Viewer-CwKmN54F.js","assets/ViewerView-IQqEtAu2.js","assets/WorkshopPage-lAH84pwC.js","assets/WorldImportView-BLdzEPsL.js","assets/WorldMapView-BnrNsoYN.js","assets/WorldMapView-Cdpw66d8.css","assets/assets-DNDvSM8j.js","assets/build-XJUUmikB.js","assets/buildings-BSMtoJgA.js","assets/catalogSnapshot-C8XuEw57.js","assets/cellColumns-DGEWPp3s.js","assets/client-BKyrCxIZ.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-CleSq9om.js","assets/diff-DcVrPQIh.js","assets/diffJob-CSm-KBZe.js","assets/editor-CUMrSb3H.css","assets/editor-DK7woja-.js","assets/entityScene-BgrekHyl.js","assets/entityShapes-BwmEWCze.js","assets/glShot-DA5aMVby.js","assets/heavy.worker-D-o7pVrA.js","assets/idbRepository-B1F9Q0zQ.js","assets/importJob-42hDYQXb.js","assets/index-C7GD3yNJ.css","assets/index-X38ahFny.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-DCeCVycv.js","assets/litematicWrite-DKCF_TEf.js","assets/liveClient-BOY0xnDb.js","assets/map.worker-duP4X7-v.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-CFgiqdJD.js","assets/modelJob-D79ku8fV.js","assets/navGroups-C9VwOe8J.css","assets/observation-BvfExXJQ.js","assets/packKit-xissJbzi.js","assets/preload-helper-YpCHtD0s.js","assets/profile-n0r3L-n1.js","assets/project.worker-BmxtUr9C.js","assets/renderers-gatq8VbV.js","assets/repository-DhMOakBW.js","assets/roomClient-BWInZWrK.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-Bs_c5uE7.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BB7mH5tT.js","assets/src-CreN4PGS.js","assets/src-DX2fV1Qz.js","assets/src-DtYPxNDH.js","assets/src-YhykBrZa.js","assets/src-rbShrH-o.js","assets/src-vb0ozsE8.js","assets/surveys-BuO6VRBn.js","assets/terrainLayer-DqREdU9W.js","assets/tint-DqjA_nEY.js","assets/updateJob-DDkF1kx1.js","assets/useProjectComputation-NdfOFH07.js","assets/useWorldPlan-Npg1cvrP.js","assets/versionJob-BfJsVps_.js","assets/world-DKrPT1tu.css","assets/world.worker-CiT51YKm.js"]};
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
