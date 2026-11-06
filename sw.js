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
const MANIFEST = {"version":"3189075096d226e5","off":false,"assets":["assets/AssetRevisionNotice-BstR-DxU.js","assets/BlocksTab-p-lbBGEx.js","assets/BuildTab-DinQEH2M.js","assets/BuildTab-zcGgGU2n.css","assets/DiffView-CyfCd7gU.js","assets/EditorTab-DY1dI5SU.js","assets/ExportTab-BJVVm3AX.js","assets/GameCheckPanel-D7FFRSax.js","assets/GameLinkBar-DWebjeJk.js","assets/LandscapeTab-Bho9zGw7.js","assets/LandscapeTab-CsSOggTh.css","assets/LayerControl-DiHg4nN_.js","assets/LayerSheet-DFB4yHeW.js","assets/LibraryView-B9Axpnjw.css","assets/LibraryView-HLdhWut5.js","assets/MaterialsTab-CSjNu3WV.css","assets/MaterialsTab-CUYSAujJ.js","assets/ModView-DDQ1XPf1.js","assets/ModelExportPanel-Dpy_k2lR.css","assets/ModelExportPanel-U67sGIwS.js","assets/PlanningTab-BfKQbhEJ.css","assets/PlanningTab-BwX571iR.js","assets/ProductionTab-9_1Icj-2.js","assets/ProductionTab-DmtitLaH.css","assets/ProjectView-C_X57YJC.js","assets/ProjectView-DR2ThTz_.css","assets/RegionPicker-CXiy_KrC.js","assets/SchemView-DIMbTtsz.js","assets/SiteTab-C8V7ym6k.js","assets/SystemView-CBOaIupQ.js","assets/TeamJoinView-DIF8tByV.js","assets/TeamRoom-3R_Zuubc.js","assets/TeamTab-Csyxvlc6.js","assets/TeamTab-VM6gc9ix.css","assets/TerrainTab-CqMuYcZI.js","assets/TestphaseView-3C-_XQya.css","assets/TestphaseView-hHmeSks0.js","assets/ThreeViewer-CGtFarNx.js","assets/UpdatesTab-n6Zp5yAD.js","assets/Viewer-D23JVLpF.js","assets/ViewerView-BhA_ExIf.js","assets/WorkshopPage-BpalxLRy.js","assets/WorldImportView-CsKBP0IY.js","assets/WorldMapView-CzaDlTfu.css","assets/WorldMapView-plHqrGtp.js","assets/assets-CcHv4Qtd.js","assets/build-DaB3322C.js","assets/buildings-C5evr8lJ.js","assets/catalogSnapshot-DwcIzCp9.js","assets/cellColumns-B1uZgsUd.js","assets/client-KzInW_cD.js","assets/colors26-DYip44m0.js","assets/content-DmhLuwqD.css","assets/datamodel-CNZDyLiG.css","assets/delivery-Bfz5OlNQ.js","assets/designs-Gc6lKwLO.js","assets/diff-D777wo0X.js","assets/diffJob-CyBvSYbb.js","assets/editor-BCPMMZy5.css","assets/editor-GB5xtREp.js","assets/entityScene-DBgjPzXk.js","assets/entityShapes-BwmEWCze.js","assets/glShot-CXkoI9F2.js","assets/heavy.worker-cs1R60sg.js","assets/idbRepository-CQmbDUKf.js","assets/importJob-DUq5lcfK.js","assets/index-CHidlrWi.css","assets/index-CuPA6R6p.js","assets/jsx-runtime-DHXBON9B.js","assets/libraryJob-oNXt3AEV.js","assets/litematicWrite-BWdn96rt.js","assets/liveClient-CqhcX4hb.js","assets/map.worker-D7NkOKCW.js","assets/mesh-DQ6J-7ty.js","assets/meshJob-8KgLEuYN.js","assets/modelJob-BI3VzLQd.js","assets/observation-vV6-Wp6m.js","assets/packKit-DSsrgXTd.js","assets/preload-helper-YpCHtD0s.js","assets/profile-CfQnUYk9.js","assets/project.worker-RAR32jPs.js","assets/renderers-gatq8VbV.js","assets/repository-DMPn-r5t.js","assets/roomClient-I1q2RVaV.js","assets/scan.worker-DannAPJx.js","assets/serverClient-DSbS6kXV.js","assets/site-B3XPZgBt.css","assets/snapshot-CqDFAVK_.js","assets/snapshot-DE3lHcyr.js","assets/src-BTdokYBA.js","assets/src-BrwrHZXa.js","assets/src-Cp8CMzw4.js","assets/src-CtAeAk1M.js","assets/src-Ddkd7Z10.js","assets/src-DfwuwgC1.js","assets/src-MZPs-IJC.js","assets/surveys-5oKzv6tr.js","assets/terrainLayer-DAzZREhe.js","assets/tint-DqjA_nEY.js","assets/updateJob-BCldMcHy.js","assets/useProjectComputation-BlH9r_uw.js","assets/useWorldPlan-Cr4PYUf7.js","assets/versionJob-CDrv_tQs.js","assets/world-DKrPT1tu.css","assets/world.worker-DA2JzQgg.js"]};
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
