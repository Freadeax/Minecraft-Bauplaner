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
const MANIFEST = {"version":"d91de41349ba4370","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-n2kHpZL_.js","assets/BuildTab-DLgvpLIG.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-DZvDpeIr.js","assets/EditorTab-DbHjcS4f.js","assets/ExportTab-Bn0yRk4K.js","assets/FixHelp-BXvUP6b8.css","assets/FixHelp-CiIfG-Ri.js","assets/GameCheckPanel-CXnOaRni.js","assets/GameLinkBar-C-OmjebO.js","assets/GameSetupBar-Dl6uv5kr.js","assets/GameSetupBar-T64Y727N.css","assets/GuideView-BCSkqwI7.js","assets/GuideView-LRWRbua6.css","assets/LandscapeTab-CR5WL-8r.css","assets/LandscapeTab-DQlGtkaZ.js","assets/LayerControl-Bfene8FL.js","assets/LayerSheet-CQDMJqQ2.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-Dvw3U_kl.js","assets/MaterialsTab-B-P0UZq3.js","assets/MaterialsTab-CSjNu3WV.css","assets/ModView-DZoAwh6F.js","assets/ModelExportPanel-CzFvtFwC.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/OverviewTab-CNsQaqJV.css","assets/OverviewTab-Dw7K6IjW.js","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-okOHV6jj.js","assets/PrivacyView-BlIC5zyC.js","assets/ProductionTab-B5pVQiRG.js","assets/ProductionTab-BZA5bsZn.css","assets/ProjectView-Cg52YXKE.css","assets/ProjectView-uRJaLN49.js","assets/RegionPicker-ClXiLu57.js","assets/SchemView-DWPNiZkB.js","assets/ShareNote-8P8doSDT.js","assets/SiteTab-BvkBkRUs.js","assets/StorageWarning-DPXy3SrX.js","assets/SystemView-C-ZGk5hg.js","assets/TeamJoinView-CA8QZNGj.js","assets/TeamRoom-D_UqJl-R.js","assets/TeamTab-VBO3fTsb.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-DCOcq-Ex.js","assets/TestphaseView-B3rEeRmn.js","assets/TestphaseView-C0h6qIBH.css","assets/ThreeViewer-BUXsl-2l.js","assets/UpdatesTab-Dx4n5Rs7.js","assets/Viewer-uc_H8IW_.js","assets/ViewerView-W90VpvXk.js","assets/WorkshopPage-CaVk-Mm2.js","assets/WorldImportView-DacsISWX.js","assets/WorldMapView-CEloPwrP.js","assets/WorldMapView-Cdpw66d8.css","assets/analysis-C46D6KwN.js","assets/assetConcurrency-CssSFvjA.js","assets/assets-4mfVsff8.js","assets/backup-BZ3d0i63.js","assets/backupLimits-Dcb306oc.js","assets/blocks-RQG6TB5y.js","assets/build-XJUUmikB.js","assets/buildings-DBEsUTh2.js","assets/catalogSnapshot-BAmF4cQy.js","assets/cellColumns-PFSA-J46.js","assets/client-DCYuvsMv.js","assets/colors26-DYip44m0.js","assets/commit-DREtMwGv.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-FXvY58jF.js","assets/diff-DwvEh1nu.js","assets/diffJob-B57sSTV6.js","assets/draft-Cl9Hde5c.js","assets/editor-BM8IUdC3.js","assets/editor-CUMrSb3H.css","assets/entities-y10HFXCY.js","assets/entityScene-BTXOUPs1.js","assets/entityShapes-BwmEWCze.js","assets/flow-Bh2kOY8D.css","assets/glShot-Bgjwbw3S.js","assets/heavy.worker-D11KpeIp.js","assets/homeDomain-CytgaI8e.js","assets/idbRepository-CQqfAudm.js","assets/importJob-D3D4cqSm.js","assets/index-BLTDMB-6.js","assets/index-BePJiE-C.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-DPj4CJV7.js","assets/litematicWrite-Cas5fvbs.js","assets/litematicWrite-DpBvJ48_.js","assets/liveClient-CwyP1yPX.js","assets/map.worker-duP4X7-v.js","assets/mapHosts-CVCY9zyc.js","assets/materials-B3bwJ-Ug.js","assets/memoryRepository-BMLqBqCH.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-BzpMD69p.js","assets/model-BOXYYw9u.js","assets/modelJob-DrM-NsLs.js","assets/navGroups-C7zPEqJA.css","assets/nbt-C-8CJUDf.js","assets/observation-u3Jvvnh6.js","assets/packJob-DO6upBQh.js","assets/packKit-C7L2hm0b.js","assets/preload-helper-YpCHtD0s.js","assets/privacy-DZZy_pwS.css","assets/profile-FA5T9gI9.js","assets/programMaterial-CoFA4qDj.js","assets/project-7bPA0XeI.js","assets/project.worker-BmxtUr9C.js","assets/projectOrder-Cd-ZLivs.js","assets/recordChecks-CuGfKx9N.js","assets/renderers-gatq8VbV.js","assets/repository-B5x5wi_T.js","assets/repository-CWp_zeOj.js","assets/revisionExport-DEbXpgZ5.js","assets/revisionExport-DZgiD5r4.js","assets/revisionExport-lAqTbmc6.js","assets/roomClient-DaNZHQ9t.js","assets/samples-DgbkrKA8.js","assets/scan.worker-DQ4C2uhx.js","assets/schem-CttpkbSu.js","assets/serverClient-CV-xr4SU.js","assets/site-B3XPZgBt.css","assets/snapshot-C6m44fxm.js","assets/snapshot-DE3lHcyr.js","assets/src-BgnYcDTK.js","assets/src-CV2HOm5H.js","assets/src-Do7bVM8j.js","assets/src-Dp4cWBsl.js","assets/src-pWHHzxWb.js","assets/stencils-CMxJ6nIP.js","assets/surveys-D3OFfs2r.js","assets/teamAccess-BLX_SwgC.js","assets/teamAccessBasics-vPDNLLRr.js","assets/terrainDesign-CKoorKmm.js","assets/terrainLayer-CSpnhAfx.js","assets/tint-DqjA_nEY.js","assets/transport-12-R6JkK.js","assets/types-Bx4QWjXM.js","assets/updateJob-DM6IdZJW.js","assets/updates-DD1vL8uS.js","assets/useProjectComputation-CZip4-wq.js","assets/useWorldPlan-BJ6IY6tU.js","assets/validation-BPpmM-90.js","assets/variants-DTVFb2BW.js","assets/versionCompat-CSqYWYgU.js","assets/versionJob-BtBtlq1h.js","assets/versionStorage-Ch0soVOU.js","assets/viewTools-Ctu518Mw.css","assets/workspaceLayout-BtTtHCIm.css","assets/workspaceLayout-CmxbFFke.js","assets/world-DKrPT1tu.css","assets/world.worker-CSQM7mxP.js","assets/worldExcerpt-lLzkJU0D.js","assets/worldPlan-BjvzG3aw.js","assets/writeJob-VNF0b5Bg.js"]};
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
