// Mitgelieferter Katalog als Datei (PERF-05). Erzeugt nach `vite build` die Datei
// dist-web/assets/catalog-<key>.json: dieselbe Rechnung, die der Browser sonst beim
// ersten Start eines neuen App-Stands im Worker macht (alle Gebäude erzeugen, hashen,
// packen, Kennwerte). <key> ist derselbe Katalogschlüssel wie `__CATALOG_KEY__`.
// Der Kern muss frisch übersetzt sein (dist/ aus `npm run build:core`), sonst passt
// die Datei nicht zum Code: das prüft dieses Skript und bricht ab.
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { catalogFingerprint } from './catalog_key.mjs';

const root = process.cwd(), out = path.resolve(process.argv[2] ?? 'dist-web');

/** Every packages/**\/*.ts must have a dist/**\/*.js that is at least as new. */
function checkFreshCore() {
  const stale = [];
  const walk = dir => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
        const js = path.join(root, 'dist', path.relative(path.join(root, 'packages'), p)).replace(/\.ts$/, '.js');
        let fresh = false;
        try { fresh = statSync(js).mtimeMs >= statSync(p).mtimeMs; } catch {}
        if (!fresh) stale.push(path.relative(root, p));
      }
    }
  };
  walk(path.join(root, 'packages'));
  if (stale.length) throw new Error(`Kern nicht frisch übersetzt (${stale.length} Dateien, z. B. ${stale[0]}): erst \`npm run build:core\`.`);
}

checkFreshCore();
const { buildShippedCatalog, shipmentMetrics, writeCatalogSnapshot } = await import(pathToFileURL(path.join(root, 'dist/application/src/index.js')).href);
const key = catalogFingerprint(root), started = performance.now();
const shipment = await buildShippedCatalog(undefined, (id, reason) => console.warn(`Bibliotheksbeitrag ${id} nicht übernommen: ${reason}`));
const file = writeCatalogSnapshot(key, shipment, shipmentMetrics(shipment), bytes => Buffer.from(bytes).toString('base64'));
mkdirSync(path.join(out, 'assets'), { recursive: true });
const target = path.join(out, 'assets', `catalog-${key}.json`), text = JSON.stringify(file);
writeFileSync(target, text);
console.log(`Katalogdatei: ${path.relative(root, target)} (${shipment.assets.length} Assets, ${shipment.versions.length} Versionen, ${(text.length / 1024 / 1024).toFixed(1)} MB, ${Math.round(performance.now() - started)} ms)`);
