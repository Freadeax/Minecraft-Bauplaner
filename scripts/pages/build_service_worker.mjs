// Offline-Speicher (PERF-06): schreibt dist-web/sw.js aus service_worker.template.js.
// Läuft in `npm run build:web` nach Vite und Katalogdatei, vor prepare_pages (Manifest).
// Das Manifest nennt alle Programmdateien unter assets/ außer der Katalogdatei, die der
// Planer selbst in IndexedDB ablegt. Die Version ist ein Hash über Namen und Inhalte:
// gleicher Build, gleiche sw.js; jeder neue Stand ergibt eine neue sw.js, die der Browser
// beim nächsten Laden bemerkt.
// Notbremse: `node scripts/pages/build_service_worker.mjs dist-web --off` erzeugt eine
// sw.js, die den Speicher leert und sich abmeldet.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = path.resolve(args.find(a => !a.startsWith('--')) ?? 'dist-web'), off = args.includes('--off');

/** Files under assets/ the service worker keeps: hashed program files, not the catalogue. */
export const offlineAsset = name => /^[A-Za-z0-9_.-]+\.(?:js|css|woff2?|png|webp|svg)$/.test(name) && !name.startsWith('catalog-');

export async function serviceWorkerSource(dir, { off: stop = false } = {}) {
  const names = (await readdir(path.join(dir, 'assets'))).filter(offlineAsset).sort();
  const hash = createHash('sha256');
  for (const n of names) hash.update(n).update('\0').update(await readFile(path.join(dir, 'assets', n))).update('\0');
  const manifest = { version: hash.digest('hex').slice(0, 16), off: stop, assets: names.map(n => `assets/${n}`) };
  const template = await readFile(path.join(here, 'service_worker.template.js'), 'utf8');
  const slot = 'const MANIFEST = __SW_MANIFEST__;';
  if (!template.includes(slot)) throw new Error('Vorlage ohne Manifestplatz');
  return { manifest, source: template.replace(slot, `const MANIFEST = ${JSON.stringify(manifest)};`) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { manifest, source } = await serviceWorkerSource(out, { off });
  await writeFile(path.join(out, 'sw.js'), source);
  console.log(`Offline-Speicher: sw.js (${manifest.assets.length} Programmdateien, Stand ${manifest.version}${off ? ', NOTBREMSE' : ''})`);
}
