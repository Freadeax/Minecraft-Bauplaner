// Release-Check (RELEASE-01): prüft vor und nach einer Veröffentlichung alles, was nicht im Code-Test steckt.
//
//   npm run check:release                 alles (Netz nötig)
//   npm run check:release -- --offline    nur lokale Prüfungen (Abhängigkeiten aus dem Lockfile, JARs, Geheimnisse)
//   npm run check:release -- --commit <sha>   Live-Seiten müssen diesen Quellcommit ausliefern
//
// 1. npm audit: keine hohen oder kritischen Lücken in Abhängigkeiten.
// 2. Gradle: Wrapper-JAR ist ein offizielles Gradle-Wrapper-JAR, die Distribution kommt per HTTPS von
//    services.gradle.org und wird über distributionSha256Sum geprüft.
// 3. Mod-JARs: jede Datei in downloads/mod stimmt mit Größe und SHA-256 aus releases.json überein;
//    die JARs der aktuellen Version sind live auf beiden Adressen und auf Modrinth byte-gleich.
// 4. Live-Header: HTTP leitet auf HTTPS um, die Header aus scripts/pages/security_headers.mjs sind gesetzt.
// 5. Keine Zugangsdaten im Pages-Artefakt (dist-web).
// Ergebnis: Tabelle mit ✓ / ⚠ / ✗, Exitcode 1 bei mindestens einem ✗.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { LIVE_TARGETS, SECURITY_HEADERS } from '../pages/security_headers.mjs';

const args = process.argv.slice(2);
const offline = args.includes('--offline');
const expectCommit = args.includes('--commit') ? args[args.indexOf('--commit') + 1] : undefined;
const ROOT = process.cwd();
const MOD = 'mods/bauplaner-bridge';
const results = [];
const ok = (area, text) => results.push({ level: 'ok', area, text });
const warn = (area, text) => results.push({ level: 'warn', area, text });
const fail = (area, text) => results.push({ level: 'fail', area, text });
const sha = (algo, bytes) => createHash(algo).update(bytes).digest('hex');

async function get(url, init = {}) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 30_000);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}
async function text(url) { const r = await get(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return (await r.text()).trim(); }
async function bytes(url, headers) { const r = await get(url, { headers, cache: 'no-store' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }

// 1. npm audit --------------------------------------------------------------------------------------------
function npmAudit() {
  if (offline) { warn('npm audit', 'übersprungen (--offline)'); return; }
  let out;
  try { out = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { out = e.stdout?.toString() ?? ''; }
  let report;
  try { report = JSON.parse(out); } catch { fail('npm audit', 'keine auswertbare Antwort von npm audit'); return; }
  const v = report.metadata?.vulnerabilities ?? {};
  const names = Object.entries(report.vulnerabilities ?? {}).map(([n, x]) => `${n} (${x.severity})`);
  if ((v.high ?? 0) + (v.critical ?? 0) > 0) fail('npm audit', `${v.critical ?? 0} kritisch, ${v.high ?? 0} hoch: ${names.join(', ')}`);
  else if ((v.moderate ?? 0) + (v.low ?? 0) > 0) warn('npm audit', `${v.moderate ?? 0} mittel, ${v.low ?? 0} niedrig: ${names.join(', ')}`);
  else ok('npm audit', `${report.metadata?.dependencies?.total ?? 'alle'} Pakete ohne bekannte Lücke`);
}

// 2. Gradle wrapper ---------------------------------------------------------------------------------------
async function gradle() {
  const propsFile = path.join(MOD, 'gradle/wrapper/gradle-wrapper.properties');
  const props = Object.fromEntries(readFileSync(propsFile, 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/\\:/g, ':')]));
  const url = props.distributionUrl ?? '';
  const m = /^https:\/\/services\.gradle\.org\/distributions\/gradle-([\w.-]+)-(bin|all)\.zip$/.exec(url);
  if (!m) { fail('Gradle', `distributionUrl nicht von https://services.gradle.org: ${url}`); return; }
  if (props.validateDistributionUrl !== 'true') fail('Gradle', 'validateDistributionUrl=true fehlt');
  if (!/^[0-9a-f]{64}$/.test(props.distributionSha256Sum ?? '')) fail('Gradle', 'distributionSha256Sum fehlt: Gradle prüft die geladene Distribution sonst nicht');
  const wrapperSha = sha('sha256', readFileSync(path.join(MOD, 'gradle/wrapper/gradle-wrapper.jar')));
  if (offline) { warn('Gradle', `Gradle ${m[1]}, Prüfsummen nicht gegen services.gradle.org verglichen (--offline)`); return; }
  try {
    const official = await text(`https://services.gradle.org/distributions/gradle-${m[1]}-${m[2]}.zip.sha256`);
    if (props.distributionSha256Sum && props.distributionSha256Sum !== official) fail('Gradle', `distributionSha256Sum ${props.distributionSha256Sum.slice(0, 12)}… ≠ offiziell ${official.slice(0, 12)}…`);
    else if (props.distributionSha256Sum) ok('Gradle', `Distribution ${m[1]} per HTTPS, SHA-256 passt zur offiziellen Angabe`);
  } catch (e) { fail('Gradle', `Prüfsumme der Distribution nicht abrufbar: ${e.message}`); }
  // Wrapper JAR: the official checksums of every Gradle release (as gradle/actions wrapper-validation does).
  try {
    const versions = JSON.parse(await text('https://services.gradle.org/versions/all')).filter(v => v.wrapperChecksumUrl && !v.snapshot && !v.nightly && !v.releaseNightly);
    let hit = null, i = 0;
    await Promise.all(Array.from({ length: 16 }, async () => {
      while (!hit && i < versions.length) {
        const v = versions[i++];
        try { if ((await text(v.wrapperChecksumUrl)) === wrapperSha) hit = v.version; } catch { /* einzelne Version nicht abrufbar */ }
      }
    }));
    if (hit) ok('Gradle', `gradle-wrapper.jar ist ein offizielles Wrapper-JAR (wie Gradle ${hit})`);
    else fail('Gradle', `gradle-wrapper.jar (${wrapperSha.slice(0, 12)}…) passt zu keinem offiziellen Gradle-Wrapper`);
  } catch (e) { fail('Gradle', `Wrapper-Prüfsummen nicht abrufbar: ${e.message}`); }
}

// 3. Mod JARs ---------------------------------------------------------------------------------------------
async function jars() {
  const manifest = JSON.parse(readFileSync('apps/web/src/views/mod/releases.json', 'utf8'));
  const dir = 'downloads/mod';
  const files = new Set(readdirSync(dir).filter(f => f.endsWith('.jar')));
  let good = 0;
  for (const r of manifest.releases) {
    if (!files.has(r.file)) { fail('Mod-JARs', `${r.file} steht in releases.json, fehlt in downloads/mod`); continue; }
    files.delete(r.file);
    const b = readFileSync(path.join(dir, r.file));
    if (b.length !== r.bytes || sha('sha256', b) !== r.sha256) fail('Mod-JARs', `${r.file}: Größe oder SHA-256 weicht von releases.json ab`);
    else good++;
  }
  for (const f of files) fail('Mod-JARs', `${f} liegt in downloads/mod, steht aber nicht in releases.json`);
  if (good) ok('Mod-JARs', `${good} JARs stimmen mit releases.json überein (Größe, SHA-256)`);

  const version = readFileSync(path.join(MOD, 'VERSION'), 'utf8').trim();
  const current = manifest.releases.filter(r => r.modVersion === version);
  if (!current.length) { warn('Mod-JARs', `Version ${version} ist noch nicht in releases.json (nicht veröffentlicht)`); return; }
  if (offline) { warn('Mod-JARs live', 'übersprungen (--offline)'); return; }
  for (const t of LIVE_TARGETS) {
    const bad = [];
    for (const r of current) {
      try { const b = await bytes(new URL(`downloads/mod/${r.file}`, t.url)); if (sha('sha256', b) !== r.sha256) bad.push(`${r.file} anders`); }
      catch (e) { bad.push(`${r.file}: ${e.message}`); }
    }
    if (bad.length) fail('Mod-JARs live', `${t.name}: ${bad.join('; ')}`);
    else ok('Mod-JARs live', `${t.name}: ${current.length} JARs von ${version} byte-gleich`);
  }
  // Modrinth (GAME-09): same file name, same SHA-512. The token only lifts the visibility of unlisted projects.
  try {
    const headers = process.env.MODRINTH_TOKEN ? { Authorization: process.env.MODRINTH_TOKEN } : {};
    const list = JSON.parse((await bytes('https://api.modrinth.com/v2/project/bauplaner-bridge/version?include_changelog=false', headers)).toString('utf8'));
    const remote = new Map(list.filter(v => v.version_number.split('+')[0] === version).flatMap(v => v.files).map(f => [f.filename, f.hashes.sha512]));
    if (!remote.size) { warn('Modrinth', `Version ${version} ist auf Modrinth noch nicht veröffentlicht`); return; }
    const bad = [];
    let same = 0;
    for (const [file, sha512] of remote) {
      const local = path.join(dir, file);
      if (!existsSync(local)) { bad.push(`${file} fehlt lokal`); continue; }
      if (sha('sha512', readFileSync(local)) !== sha512) bad.push(`${file} anders`); else same++;
    }
    if (bad.length) fail('Modrinth', bad.join('; '));
    else ok('Modrinth', `${same} Dateien von ${version} byte-gleich mit downloads/mod`);
  } catch (e) { warn('Modrinth', `nicht abrufbar (${e.message}); mit MODRINTH_TOKEN auch für nicht gelistete Projekte`); }
}

// 4. Live headers -----------------------------------------------------------------------------------------
async function liveHeaders() {
  if (offline) { warn('Live-Header', 'übersprungen (--offline)'); return; }
  for (const t of LIVE_TARGETS) {
    try {
      const r = await get(t.http, { redirect: 'manual' });
      const to = r.headers.get('location') ?? '';
      if ([301, 302, 307, 308].includes(r.status) && to.startsWith('https://')) ok('HTTPS', `${t.name}: HTTP ${r.status} → ${to}`);
      else fail('HTTPS', `${t.name}: HTTP antwortet mit ${r.status} ohne Umleitung auf HTTPS`);
    } catch (e) { fail('HTTPS', `${t.name}: ${e.message}`); }
    try {
      const r = await get(t.url, { cache: 'no-store' });
      const missing = [], wrong = [];
      for (const k of t.expect) {
        const got = r.headers.get(k);
        if (got === null) missing.push(k);
        else if (k !== 'Strict-Transport-Security' && got !== SECURITY_HEADERS[k]) wrong.push(k);
        else if (k === 'Strict-Transport-Security' && !/max-age=(\d{8,})/.test(got)) wrong.push(`${k} (${got})`);
      }
      if (missing.length || wrong.length) fail('Live-Header', `${t.name}: ${[...missing.map(k => `${k} fehlt`), ...wrong.map(k => `${k} weicht ab`)].join(', ')}`);
      else ok('Live-Header', `${t.name}: ${t.expect.length} Schutz-Header wie vorgesehen`);
      if (t.limit) {
        const absent = Object.keys(SECURITY_HEADERS).filter(k => !t.expect.includes(k) && r.headers.get(k) === null);
        warn('Live-Header', `${t.name}: ${absent.join(', ')} nicht setzbar. ${t.limit}`);
      }
      const html = await r.text();
      if (!html.includes('http-equiv="Content-Security-Policy"')) fail('Live-Header', `${t.name}: Meta-CSP fehlt in index.html`);
      const dep = JSON.parse(await text(new URL('deployment.json', t.url)));
      if (expectCommit && !dep.sourceCommit?.startsWith(expectCommit)) fail('Live-Stand', `${t.name}: liefert ${dep.sourceCommit?.slice(0, 7)}, erwartet ${expectCommit.slice(0, 7)}`);
      else ok('Live-Stand', `${t.name}: Quellcommit ${dep.sourceCommit?.slice(0, 7)}`);
    } catch (e) { fail('Live-Header', `${t.name}: ${e.message}`); }
  }
}

// 5. Secrets in the Pages artifact ------------------------------------------------------------------------
const SECRET = [
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'GitHub-Token'], [/github_pat_[A-Za-z0-9_]{40,}/, 'GitHub-Token'], [/mrp_[A-Za-z0-9]{30,}/, 'Modrinth-Token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'privater Schlüssel'], [/AKIA[0-9A-Z]{16}/, 'AWS-Schlüssel'],
];
function secrets() {
  const dist = path.join(ROOT, 'dist-web');
  if (!existsSync(dist)) { warn('Geheimnisse', 'dist-web fehlt; erst `npm run build`'); return; }
  const envValues = ['MODRINTH_TOKEN', 'CLOUDFLARE_API_TOKEN', 'GITHUB_TOKEN'].map(k => process.env[k]).filter(v => v && v.length >= 12);
  const hits = [];
  let n = 0;
  const walk = dir => {
    for (const e of readdirSync(dir)) {
      const f = path.join(dir, e), s = statSync(f);
      if (s.isDirectory()) { walk(f); continue; }
      if (!/\.(js|json|html|css|txt|map|svg|webmanifest)$/.test(e)) continue;
      n++;
      const body = readFileSync(f, 'utf8');
      for (const [re, label] of SECRET) if (re.test(body)) hits.push(`${path.relative(ROOT, f)}: ${label}`);
      if (envValues.some(v => body.includes(v))) hits.push(`${path.relative(ROOT, f)}: Wert einer Zugangs-Umgebungsvariablen`);
    }
  };
  walk(dist);
  if (hits.length) fail('Geheimnisse', hits.join('; '));
  else ok('Geheimnisse', `${n} Textdateien in dist-web ohne Token oder Schlüssel`);
}

npmAudit();
await gradle();
await jars();
await liveHeaders();
secrets();

const icon = { ok: '✓', warn: '⚠', fail: '✗' };
const width = Math.max(...results.map(r => r.area.length));
for (const r of results) console.log(`${icon[r.level]} ${r.area.padEnd(width)}  ${r.text}`);
const failed = results.filter(r => r.level === 'fail').length;
console.log(failed ? `\nRelease-Check: ${failed} Fehler.` : `\nRelease-Check bestanden (${results.filter(r => r.level === 'warn').length} Hinweise).`);
process.exitCode = failed ? 1 : 0;
