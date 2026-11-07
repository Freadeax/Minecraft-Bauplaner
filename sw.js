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
const MANIFEST = {"version":"68f819d8b7ac4008","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-CI67ZNp3.js","assets/BuildTab-CnxRljyg.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-1EmdeUcS.js","assets/EditorTab-BLQeLyaq.js","assets/ExportTab-4eY2q2p1.js","assets/FixHelp-BXvUP6b8.css","assets/FixHelp-CiIfG-Ri.js","assets/GameCheckPanel-DyZgLWCj.js","assets/GameLinkBar-BH_U2kl3.js","assets/GuideView-Bvv6UG9y.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-Bb_Zp7JI.js","assets/LandscapeTab-CR5WL-8r.css","assets/LayerControl-HiDR71bW.js","assets/LayerSheet-DsUXfbaa.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-_JECvSBT.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-CffXNd5g.js","assets/ModView-22m2h91k.js","assets/ModelExportPanel-BtvmVsEy.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/OverviewTab-BTaTvW_L.js","assets/OverviewTab-CNsQaqJV.css","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-JeZc_dtx.js","assets/PrivacyView-Dea1yzmQ.js","assets/ProductionTab-3UAB9zIy.js","assets/ProductionTab-BZA5bsZn.css","assets/ProjectView-Cg52YXKE.css","assets/ProjectView-Ddq3KHng.js","assets/RegionPicker-DIxbUPBl.js","assets/SchemView-CwgCS_vH.js","assets/ShareNote-eBthNn3p.js","assets/SiteTab-DdMAiLXw.js","assets/StorageWarning-B7BvCgT-.js","assets/SystemView-CTNzitX3.js","assets/TeamJoinView-B8ZMQLif.js","assets/TeamRoom-BqFQUEMN.js","assets/TeamTab-CicQNWY8.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-CBn05auY.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-Cnv0daRZ.js","assets/ThreeViewer-BVd6gbGI.js","assets/UpdatesTab-BxrBWG4o.js","assets/Viewer-BOGZosaA.js","assets/ViewerView-Ca_KShfB.js","assets/WorkshopPage-D3WWPjlb.js","assets/WorldImportView-CoDzT6gK.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-DSsmN7LQ.js","assets/assets-u-5b6C_k.js","assets/build-XJUUmikB.js","assets/buildings-nW0HP-8B.js","assets/catalogSnapshot-BGMHP2N6.js","assets/cellColumns-DGEWPp3s.js","assets/client-DCmkF6gZ.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-BibS4mjm.js","assets/diff-CtLuKGdo.js","assets/diffJob-D28cOWFN.js","assets/editor-CUMrSb3H.css","assets/editor-DW_Rbh8x.js","assets/entityScene-By-NLYyU.js","assets/entityShapes-BwmEWCze.js","assets/exportSafety-CSj4NNNP.js","assets/flow-Bh2kOY8D.css","assets/glShot-DwW4xs5F.js","assets/heavy.worker-DuPnP4JP.js","assets/idbRepository-CC7bmOsZ.js","assets/importJob-Dt6VzfVC.js","assets/index-BePJiE-C.css","assets/index-CRqV8eC8.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-wRe1PGxP.js","assets/litematicWrite-BWG_ppHS.js","assets/liveClient-CHPKEUoC.js","assets/map.worker-duP4X7-v.js","assets/mapHosts-CVCY9zyc.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-BEbxI0G8.js","assets/model-BOXYYw9u.js","assets/modelJob-BhyPQi8L.js","assets/navGroups-C7zPEqJA.css","assets/observation-BvfExXJQ.js","assets/packJob-DO6upBQh.js","assets/packKit-C7L2hm0b.js","assets/preload-helper-YpCHtD0s.js","assets/privacy-DZZy_pwS.css","assets/profile-n0r3L-n1.js","assets/project.worker-BmxtUr9C.js","assets/renderers-gatq8VbV.js","assets/repository-Ci-owRVn.js","assets/roomClient-ceyWiVer.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-CrjHu-CY.js","assets/site-B3XPZgBt.css","assets/snapshot-C6m44fxm.js","assets/snapshot-DE3lHcyr.js","assets/src-0dtxF-b9.js","assets/src-B1C4Qkfu.js","assets/src-B9rb8Wjx.js","assets/src-BX7ytc83.js","assets/src-DMN3O0XO.js","assets/src-jqi2klV6.js","assets/src-xlmRd5mx.js","assets/surveys-CQYoRvhf.js","assets/terrainLayer-Dk1C4qaR.js","assets/tint-DqjA_nEY.js","assets/updateJob-BIBoeeTu.js","assets/useProjectComputation-CjagLAt6.js","assets/useWorldPlan-BqXwfVX-.js","assets/versionJob-jKvfr5T1.js","assets/viewTools-Ctu518Mw.css","assets/workspaceLayout-BtTtHCIm.css","assets/workspaceLayout-CmxbFFke.js","assets/world-DKrPT1tu.css","assets/world.worker-CSQM7mxP.js"]};
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
