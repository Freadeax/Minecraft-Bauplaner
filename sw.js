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
const MANIFEST = {"version":"0a71c89b27e92a3b","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-CHWK0wEN.js","assets/BuildTab-BwmsOv6z.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-BmjnLccs.js","assets/EditorTab-DpFdYyMk.js","assets/ExportTab-DSHTgKtj.js","assets/FixHelp-BXvUP6b8.css","assets/FixHelp-CiIfG-Ri.js","assets/GameCheckPanel-DSl0j76H.js","assets/GameLinkBar-nEMbI4Cn.js","assets/GameSetupBar-B_xc01Be.js","assets/GameSetupBar-T64Y727N.css","assets/GuideView-ByhdiYIX.js","assets/GuideView-LRWRbua6.css","assets/JobStatus-BvwJDIs2.css","assets/JobStatus-CIS-Kq3G.js","assets/LandscapeTab-5W24lmPe.js","assets/LandscapeTab-CR5WL-8r.css","assets/LayerControl-ClQ7PlVe.js","assets/LayerSheet-DcipP669.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-BvzHpIl9.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-Cqrwj4j9.js","assets/ModView-D8nZv-Dn.js","assets/ModelExportPanel-BTBtCBSd.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/OverviewTab-CNsQaqJV.css","assets/OverviewTab-DbghC6Ql.js","assets/PlanningTab-8OZSvM6P.js","assets/PlanningTab-BfKQbhEJ.css","assets/PrivacyView-BDysZfny.js","assets/ProductionTab-BQeR-KdA.js","assets/ProductionTab-BZA5bsZn.css","assets/ProjectView-BBTZ6P4N.js","assets/RegionPicker-DeoENg0F.js","assets/SchemView-DPDtA7eq.js","assets/ShareNote-BdeDoGOh.js","assets/SiteTab-CjsUuGqV.js","assets/StorageWarning-Dw5n4wwK.js","assets/SystemView-BPI40DT7.js","assets/TeamJoinView-DHqVV4gH.js","assets/TeamRoom-CRQQDs1p.js","assets/TeamTab-ByFKWbme.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-Cv4gAcCw.js","assets/TestphaseView-C0h6qIBH.css","assets/TestphaseView-CR6n-2-K.js","assets/TexturePanel--JfxjjR7.js","assets/ThreeViewer-CeidQfwa.js","assets/UpdatesTab-DP0uJKqa.js","assets/Viewer-ybgFHGR4.js","assets/ViewerView-B7k4cXR0.js","assets/WorkshopPage-CxGPndF0.js","assets/WorldImportView-DMnkTDan.js","assets/WorldMapView-Cdpw66d8.css","assets/WorldMapView-vqpaTf_P.js","assets/analysis-CylabThO.js","assets/assets-BWY9eRY9.js","assets/backup-CVgCbeIi.js","assets/blocks-DhxUzLZx.js","assets/build-XJUUmikB.js","assets/buildings-CLi7BfJJ.js","assets/catalogSnapshot-Dlf4YBX3.js","assets/cellColumns-LVM9rmF8.js","assets/client-CDpohVf7.js","assets/colors-IdYtFrXv.js","assets/colors26-DYip44m0.js","assets/commit-DFoGmBit.js","assets/content-DmhLuwqD.css","assets/context-DfXjP18m.js","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-BgVbVK7f.js","assets/diff-Bl8UIcDr.js","assets/diffJob-DSnN1F0A.js","assets/draft-B6MOV4ls.js","assets/editor-CUMrSb3H.css","assets/editor-CjXI4WrT.js","assets/entities-BKG1leJN.js","assets/entityScene-CAm69eOp.js","assets/entityShapes-BwmEWCze.js","assets/flow-Bh2kOY8D.css","assets/glShot-DUTuumaK.js","assets/graphics-DuhQ-1QQ.js","assets/heavy.worker-C7fM0PAt.js","assets/homeDomain-BlbRmY0p.js","assets/icons-DSTEqP_C.js","assets/idbRepository-CLPwJWle.js","assets/importJob-DLeE0ECH.js","assets/index-DUv91h9h.js","assets/index-JE5GU8Kj.css","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-CNnMApIY.js","assets/litematicWrite-BvSbd_VD.js","assets/liveClient-BBAIJx1P.js","assets/map.worker-duP4X7-v.js","assets/mapHosts-CVCY9zyc.js","assets/materials-CipMsPgc.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-CeuaojTO.js","assets/model-BOXYYw9u.js","assets/modelJob-CWiTNaYd.js","assets/navGroups-C7zPEqJA.css","assets/observation-u3Jvvnh6.js","assets/packJob-DO6upBQh.js","assets/packKit-C7L2hm0b.js","assets/preload-helper-YpCHtD0s.js","assets/privacy-DZZy_pwS.css","assets/profile-BATFAw5F.js","assets/programMaterial-Ddki4hcO.js","assets/project.worker-BmxtUr9C.js","assets/projectOrder-DCgSEQo8.js","assets/renderers-gatq8VbV.js","assets/repository-DV9Ph6pX.js","assets/revisionExport-C36S06_U.js","assets/revisionExport-C71vp9pD.js","assets/roomClient-C9s3wwgY.js","assets/router-B0-of-fW.js","assets/scan.worker-DQ4C2uhx.js","assets/serverClient-DN3BDBGN.js","assets/session-Cs4AFlTS.js","assets/site-B3XPZgBt.css","assets/snapshot-C6m44fxm.js","assets/snapshot-DE3lHcyr.js","assets/src-BHE6s2tZ.js","assets/src-BWY_cAKY.js","assets/src-BbmKYrrU.js","assets/src-CU1NZ9zd.js","assets/src-DnEQVaj_.js","assets/stencils--z-BI_aF.js","assets/surveys-BiJR2oVS.js","assets/team-Cg52YXKE.css","assets/terrainDesign-PvWyFjdA.js","assets/terrainLayer-DWiFODaX.js","assets/tint-DqjA_nEY.js","assets/ui-D5V1K9Jk.js","assets/updateJob-sQMnjZ2N.js","assets/updates-BgUoWy0A.js","assets/useProjectComputation-BCgPP0Ji.js","assets/useWorldPlan-Cq1gJErP.js","assets/validation-B2m9KIpF.js","assets/versionCompat-I_Pg_aCo.js","assets/versionJob-evQhak9C.js","assets/viewTools-Ctu518Mw.css","assets/workspaceLayout-BtTtHCIm.css","assets/workspaceLayout-CmxbFFke.js","assets/world-DKrPT1tu.css","assets/world.worker-CSQM7mxP.js"]};
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
