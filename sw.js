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
const MANIFEST = {"version":"28f014655a1ce081","off":false,"assets":["assets/AssetRevisionNotice-CXlZQteQ.js","assets/BlocksTab-75QRcTwi.js","assets/BuildTab-D6VO0fVE.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-ClJ_Q_cZ.js","assets/EditorTab-CDe9_PyH.js","assets/ExportTab-CjwZrYwS.js","assets/FixHelp-BXvUP6b8.css","assets/FixHelp-DI5AxJz5.js","assets/GameCheckPanel-CCfqRKJe.js","assets/GameLinkBar-DcYgAFa_.js","assets/GameSetupBar-DiUguzbE.js","assets/GameSetupBar-T64Y727N.css","assets/GuideView-BIHn-cfK.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-x4_KkBz2.js","assets/LayerControl-BOLhdevn.js","assets/LayerSheet-BFGPbcCF.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-VtvI_aD-.js","assets/MaterialsTab-C3jL_5KR.js","assets/MaterialsTab-CSjNu3WV.css","assets/ModView-xl2BC8ma.js","assets/ModelExportPanel-BOqC-ma9.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/OverviewTab-CKcG_jKf.js","assets/OverviewTab-CNsQaqJV.css","assets/PlanningTab-BDG3wQJs.js","assets/PlanningTab-BfKQbhEJ.css","assets/PrivacyView-Cg3BFUx9.js","assets/ProductionTab-BZA5bsZn.css","assets/ProductionTab-DdS1u5hH.js","assets/ProjectView-B9j8dW3W.js","assets/ProjectView-Cg52YXKE.css","assets/RegionPicker-CGSXKRpC.js","assets/SchemView-DisX28Vw.js","assets/ShareNote-CWTU1OoL.js","assets/SiteTab-DMGL9e88.js","assets/StorageWarning-CZt-tQ7Z.js","assets/SystemView-Bs3rVgBT.js","assets/TeamJoinView-D3AFGVCE.js","assets/TeamRoom-dRYtnAJR.js","assets/TeamTab-VM6gc9ix.css","assets/TeamTab-demfmG6r.js","assets/TerrainTab-e6E2RTyk.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-kEqyNVTS.js","assets/ThreeViewer-B1M9qRmt.js","assets/UpdatesTab-5CSxF5_C.js","assets/Viewer-1Obgyw0Y.js","assets/ViewerView-DNzMPf13.js","assets/WorkshopPage-DQI7H3VG.js","assets/WorldImportView-i9l1wJzm.js","assets/WorldMapView-B_cfhaeV.js","assets/WorldMapView-Cdpw66d8.css","assets/analysis-C46D6KwN.js","assets/archivo-black-latin-400-normal-BTVu2TQR.woff2","assets/assetConcurrency-D97YhrBS.js","assets/assets-YTUgErMB.js","assets/backup-buSCj9p7.js","assets/backupLimits-Dcb306oc.js","assets/blocks-Cl542Mlf.js","assets/build-laG15Xg9.js","assets/buildings-RpiH98Ot.js","assets/catalogSnapshot-DZeVLUSv.js","assets/cellColumns-PFSA-J46.js","assets/client-DA8c4gyF.js","assets/colors26-DYip44m0.js","assets/commit-CeoW-AD7.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-UHFSQUBN.js","assets/diff-Dhxph73D.js","assets/diffJob-B57sSTV6.js","assets/dm-sans-latin-wght-normal-Xz1IZZA0.woff2","assets/draft-m22HeFXX.js","assets/editor-BRzKEksw.js","assets/editor-CUMrSb3H.css","assets/entities-y10HFXCY.js","assets/entityScene-cxOosbpD.js","assets/entityShapes-BwmEWCze.js","assets/flow-Bh2kOY8D.css","assets/glShot-XnfeSYSQ.js","assets/heavy.worker-CJCK-Gfr.js","assets/homeDomain-CZe0VhOV.js","assets/idbRepository-CGVIGxDn.js","assets/importJob-C-nyE7rT.js","assets/index-BQ6PpIHK.css","assets/index-pSUdU48p.js","assets/jsx-runtime-gzR6375A.js","assets/libraryJob-DApALPTW.js","assets/litematicWrite-Cksi88dW.js","assets/litematicWrite-DpBvJ48_.js","assets/liveClient-dAau_TlL.js","assets/map.worker-duP4X7-v.js","assets/mapHosts-CVCY9zyc.js","assets/materials-BU1_3rwB.js","assets/memoryRepository-fI2Ai-w2.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-BzpMD69p.js","assets/model-BOXYYw9u.js","assets/modelJob-YNYnRbng.js","assets/navGroups-C7zPEqJA.css","assets/nbt-C-8CJUDf.js","assets/observation-u3Jvvnh6.js","assets/packJob-DO6upBQh.js","assets/packKit-C7L2hm0b.js","assets/preload-helper-BHMwqdv1.js","assets/privacy-DZZy_pwS.css","assets/profile-FA5T9gI9.js","assets/programMaterial-GyWB8e2O.js","assets/project-B-fUxXb0.js","assets/project.worker-BmxtUr9C.js","assets/projectOrder-SsWY2Zyc.js","assets/recordChecks-CsrYML5i.js","assets/renderers-gatq8VbV.js","assets/repository-B5x5wi_T.js","assets/repository-CAYrioQJ.js","assets/revisionExport-CRAsI5xq.js","assets/revisionExport-egbkdrgd.js","assets/revisionExport-lAqTbmc6.js","assets/rolldown-runtime-4tVxZq34.js","assets/roomAddress-D9KoORvk.js","assets/roomClient-ERhKFwef.js","assets/samples-D_UlBRtP.js","assets/scan.worker-DQ4C2uhx.js","assets/schem-nKhg0jtZ.js","assets/serverClient-DJuMxCEc.js","assets/site-B3XPZgBt.css","assets/snapshot-C6m44fxm.js","assets/snapshot-CYrxDi-M.js","assets/src-Bz4FioWW.js","assets/src-DrEy-vJe.js","assets/src-FT_RshhG.js","assets/src-NjmhUcVf.js","assets/src-pWHHzxWb.js","assets/stencils-itx5RX0M.js","assets/surveys-B5Y8Xkoo.js","assets/teamAccess-BxeSVOHd.js","assets/teamAccessBasics-vPDNLLRr.js","assets/terrainDesign-BqLO4Z4V.js","assets/terrainLayer-C3G8ugH3.js","assets/tint-DqjA_nEY.js","assets/transport-Co0jXS6K.js","assets/types-Bx4QWjXM.js","assets/updateJob-BzQRVFmP.js","assets/updates-tQavkMH5.js","assets/useProjectComputation-CWhRopGO.js","assets/useWorldPlan-Dl0mie9B.js","assets/validation-BPpmM-90.js","assets/variants-akOG2EQz.js","assets/versionCompat-Bs6dyJ34.js","assets/versionJob-8oceG-Vk.js","assets/versionStorage-Ch0soVOU.js","assets/viewTools-Ctu518Mw.css","assets/workspaceLayout-BV9zW9WX.js","assets/workspaceLayout-BtTtHCIm.css","assets/world-DKrPT1tu.css","assets/world.worker-CSQM7mxP.js","assets/worldExcerpt-lLzkJU0D.js","assets/worldPlan-BjvzG3aw.js","assets/writeJob-B1ztxKDE.js"]};
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

// Chromium verliert unter Last gelegentlich das skipWaiting() aus der Installation: die neue Fassung bliebe dann
// „wartend“, bis alle Tabs zu sind. Deshalb noch einmal, sobald sie installiert ist (self.serviceWorker), und auf
// Zuruf des Planers (offline.ts) für Browser ohne self.serviceWorker.
self.serviceWorker?.addEventListener('statechange', () => {
  if (self.serviceWorker.state === 'installed') void self.skipWaiting();
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
  if (event.data === 'bauplaner:skip-waiting') { void self.skipWaiting(); return; }
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
