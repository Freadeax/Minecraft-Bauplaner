// Modrinth-Projekt der Bauplaner-Brücke pflegen (Projekt anlegen, Texte/Bilder abgleichen, neue Versionen hochladen).
//
//   node scripts/mod/modrinth_publish.mjs check     Offline: project.json, Beschreibung, Bilder, Änderungsliste und
//                                               die hochzuladenden Dateien prüfen (läuft in npm test, braucht nichts).
//   node scripts/mod/modrinth_publish.mjs plan      Zeigt, was create/sync/release tun würden. Ohne Token nur öffentliche Daten.
//   node scripts/mod/modrinth_publish.mjs create    Legt das Projekt als Entwurf an (Icon, Bilder, Versionen) und reicht es zur Prüfung ein.
//   node scripts/mod/modrinth_publish.mjs sync      Gleicht Texte, Kategorien, Links, Icon, Galerie (ersetzen/entfernen/sortieren) und Offenlegungen ab.
//   node scripts/mod/modrinth_publish.mjs release   Lädt fehlende Versionen hoch und ruft danach sync auf.
//
// Quelle der Dateien ist apps/web/src/views/mod/releases.json mit downloads/mod/ (dieselben geprüften .jar wie auf der
// Website, SHA-256 wird verglichen). Metadaten: mods/bauplaner-bridge/modrinth/, Änderungen: mods/bauplaner-bridge/CHANGELOG.md.
// Der Token kommt nur aus der Umgebungsvariablen MODRINTH_TOKEN und wird nie ausgegeben.
// Nötige Token-Rechte: PROJECT_CREATE, PROJECT_READ, PROJECT_WRITE, VERSION_CREATE, VERSION_READ.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const API = process.env.MODRINTH_API ?? 'https://api.modrinth.com/v2';
// Modrinth keeps the client/server environment per version only in API v3 (required before review).
const API3 = API.replace(/\/v2$/, '/v3');
const UA = 'Freadeax/Minecraft-Bauplaner (github.com/Freadeax/Minecraft-Bauplaner; scripts/mod/modrinth_publish.mjs)';
const DIR = 'mods/bauplaner-bridge/modrinth';
const MANIFEST = 'apps/web/src/views/mod/releases.json';
const CHANGELOG = 'mods/bauplaner-bridge/CHANGELOG.md';
const SIDES = ['required', 'optional', 'unsupported'];
const STATUSES = ['approved', 'unlisted', 'private'];
const DISCLOSURES = ['ai_content', 'ai_functionality', 'advertisements', 'paid_features', 'telemetry', 'derivative_work', 'epilepsy_triggers', 'system_interactions', 'archived'];
const ENVIRONMENTS = ['client_only', 'server_only', 'client_and_server', 'client_only_server_optional', 'server_only_client_optional', 'client_or_server', 'client_or_server_prefers_both', 'singleplayer_only', 'dedicated_server_only'];

export function loadConfig(root = '.') {
  const project = JSON.parse(readFileSync(join(root, DIR, 'project.json'), 'utf8'));
  const body = readFileSync(join(root, DIR, 'DESCRIPTION.md'), 'utf8');
  const manifest = JSON.parse(readFileSync(join(root, MANIFEST), 'utf8'));
  const changelog = readFileSync(join(root, CHANGELOG), 'utf8');
  return { root, project, body, manifest, changelog };
}

export function compareVersions(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

/** Text of the section `## <version>` (up to the next `## `), without the heading. */
export function changelogFor(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex(l => new RegExp(`^## ${version.replace(/\./g, '\\.')}(\\s|$)`).test(l));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim() || null;
}

/** The Modrinth versions this repository wants to exist, from releases.json. */
export function wantedVersions({ root, project, manifest, changelog }) {
  return manifest.releases
    .filter(r => project.loaders[r.loader] && compareVersions(r.modVersion, project.firstVersion) >= 0)
    .map(r => {
      const cfg = project.loaders[r.loader];
      const target = r.minecraftVersions ? 'paper' : `${r.loader}-${r.minecraft}`;
      const gameVersions = r.minecraftVersions ?? [r.minecraft];
      const range = gameVersions.length > 1 ? `${gameVersions[0]}–${gameVersions.at(-1)}` : gameVersions[0];
      return {
        file: r.file, path: join(root, 'downloads/mod', r.file), sha256: r.sha256, bytes: r.bytes,
        version_number: `${r.modVersion}+${target}`,
        name: `${r.modVersion} · ${cfg.label} ${range}`,
        changelog: changelogFor(changelog, r.modVersion),
        loaders: cfg.loaders, game_versions: gameVersions, version_type: project.versionType,
        dependencies: cfg.dependencies.map(({ project_id, dependency_type }) => ({ project_id, dependency_type })),
        modVersion: r.modVersion, environment: cfg.environment,
      };
    })
    .sort((a, b) => compareVersions(a.modVersion, b.modVersion) || a.version_number.localeCompare(b.version_number));
}

/** Offline checks. Returns a list of problems (empty = fine). */
export function checkConfig(cfg) {
  const { root, project: p, body } = cfg;
  const problems = [];
  const need = (ok, msg) => { if (!ok) problems.push(msg); };
  need(/^[a-z0-9-]{3,64}$/.test(p.slug), 'slug: 3–64 Zeichen a-z, 0-9, -');
  need(typeof p.title === 'string' && p.title.length >= 3 && p.title.length <= 64, 'title: 3–64 Zeichen');
  need(typeof p.summary === 'string' && p.summary.length >= 3 && p.summary.length <= 256, 'summary: 3–256 Zeichen');
  need(STATUSES.includes(p.visibility), `visibility: eins von ${STATUSES.join(', ')}`);
  need(SIDES.includes(p.clientSide) && SIDES.includes(p.serverSide), 'clientSide/serverSide: required, optional oder unsupported');
  need(Array.isArray(p.categories) && p.categories.length >= 1 && p.categories.length <= 3, 'categories: 1–3 Einträge');
  need(p.license?.id, 'license.id fehlt');
  need(body.length >= 100 && /[A-Za-z]/.test(body), 'DESCRIPTION.md zu kurz (Modrinth verlangt eine englische Beschreibung)');
  need(existsSync(join(root, DIR, p.icon)), `Icon ${p.icon} fehlt`);
  const iconBytes = existsSync(join(root, DIR, p.icon)) ? readFileSync(join(root, DIR, p.icon)).length : 0;
  need(iconBytes > 0 && iconBytes < 256 * 1024, 'Icon muss unter 256 KiB sein');
  for (const g of p.gallery) {
    const f = join(root, DIR, g.file);
    need(existsSync(f), `Bild ${g.file} fehlt`);
    if (existsSync(f)) need(readFileSync(f).length < 5 * 1024 * 1024, `Bild ${g.file} über 5 MiB`);
    need(g.title && g.title.length <= 255, `Bild ${g.file}: Titel fehlt`);
  }
  need(p.gallery.filter(g => g.featured).length <= 1, 'höchstens ein hervorgehobenes Bild');
  need(new Set(p.gallery.map(g => sha1(join(root, DIR, g.file)))).size === p.gallery.length, 'zwei Galeriebilder sind dieselbe Datei');
  for (const d of p.disclosures ?? []) {
    need(DISCLOSURES.includes(d.type), `Offenlegung ${d.type} unbekannt`);
    if (d.type === 'telemetry') need(['opt_in', 'opt_out', 'always_active'].includes(d.consent) && d.data_collected?.length, 'Offenlegung telemetry braucht consent und data_collected');
    if (d.type === 'ai_content') need(d.uses?.length && d.uses.every(u => ['code', 'assets', 'text'].includes(u)), 'Offenlegung ai_content braucht uses (code, assets, text)');
    if (d.type === 'system_interactions') need(d.interactions?.length, 'Offenlegung system_interactions braucht interactions');
    if (['advertisements', 'epilepsy_triggers'].includes(d.type)) need(d.note?.length > 20, `Offenlegung ${d.type} braucht eine Erklärung`);
  }
  // Philipp 03.11.2026: no AI tool names anywhere on Modrinth (texts, changelogs, image titles).
  const forbidden = /claude|anthropic/i;
  const texts = [p.title, p.summary, body, ...p.gallery.flatMap(g => [g.title, g.description ?? '']), JSON.stringify(p.disclosures ?? [])];
  need(!texts.some(t => forbidden.test(t)), 'Projekttext oder Bildtitel nennt ein KI-Werkzeug');
  const wanted = wantedVersions(cfg);
  need(wanted.length > 0, `keine Version ab ${p.firstVersion} in ${MANIFEST}`);
  const numbers = new Set();
  for (const v of wanted) {
    need(!numbers.has(v.version_number), `Versionsnummer doppelt: ${v.version_number}`); numbers.add(v.version_number);
    need(ENVIRONMENTS.includes(v.environment), `${v.version_number}: environment fehlt oder unbekannt`);
    need(v.changelog, `${CHANGELOG}: Abschnitt „## ${v.modVersion}“ fehlt`);
    need(!forbidden.test(v.changelog ?? '') && !forbidden.test(v.name), `${v.version_number}: Änderungsliste nennt ein KI-Werkzeug`);
    if (!existsSync(v.path)) { problems.push(`${v.path} fehlt`); continue; }
    const bytes = readFileSync(v.path);
    need(createHash('sha256').update(bytes).digest('hex') === v.sha256, `${v.file}: SHA-256 passt nicht zu ${MANIFEST}`);
  }
  return problems;
}

function sha1(path) { return existsSync(path) ? createHash('sha1').update(readFileSync(path)).digest('hex') : null; }
/** Modrinth names uploaded images by the SHA-1 of the original file (raw_url / raw_icon_url). */
function liveSha1(url) { return url?.match(/\/([0-9a-f]{40})\.[a-z]+$/)?.[1] ?? null; }

async function api(method, path, { token, json, form, raw, contentType, ok = [200, 201, 204], base = API } = {}) {
  const headers = { 'User-Agent': UA };
  if (token) headers.Authorization = token;
  let body;
  if (json) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  else if (form) body = form;
  else if (raw) { headers['Content-Type'] = contentType; body = raw; }
  const res = await fetch(base + path, { method, headers, body });
  if (res.status === 404 && method === 'GET') return null;
  const text = await res.text();
  if (!ok.includes(res.status)) throw new Error(`${method} ${path}: HTTP ${res.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

function token(required) {
  const t = process.env.MODRINTH_TOKEN?.trim();
  if (!t && required) throw new Error('MODRINTH_TOKEN ist nicht gesetzt (GitHub: Settings → Secrets and variables → Actions).');
  return t || undefined;
}

function projectFields(p, body) {
  return {
    title: p.title, description: p.summary, body,
    categories: p.categories, additional_categories: p.additionalCategories ?? [],
    client_side: p.clientSide, server_side: p.serverSide,
    license_id: p.license.id, license_url: p.license.url ?? null,
    source_url: p.links.source ?? null, issues_url: p.links.issues ?? null, wiki_url: p.links.wiki ?? null,
    discord_url: p.links.discord ?? null,
  };
}

async function checkOnline(cfg) {
  const problems = [];
  const tags = await api('GET', '/tag/game_version');
  const known = new Set(tags.map(t => t.version));
  const loaders = new Set((await api('GET', '/tag/loader')).map(l => l.name));
  const cats = new Set((await api('GET', '/tag/category')).map(c => c.name));
  for (const v of wantedVersions(cfg)) {
    for (const g of v.game_versions) if (!known.has(g)) problems.push(`Modrinth kennt Minecraft ${g} nicht (${v.file})`);
    for (const l of v.loaders) if (!loaders.has(l)) problems.push(`Modrinth kennt den Loader ${l} nicht`);
  }
  for (const c of [...cfg.project.categories, ...(cfg.project.additionalCategories ?? [])]) if (!cats.has(c)) problems.push(`Kategorie ${c} unbekannt`);
  return problems;
}

async function existingVersions(slug, t) {
  const list = await api('GET', `/project/${slug}/version?include_changelog=false`, { token: t });
  return new Set((list ?? []).map(v => v.version_number));
}

async function create(cfg, dry) {
  const t = token(!dry);
  const { project: p, body } = cfg;
  const existing = await api('GET', `/project/${p.slug}`, { token: t });
  if (existing) { console.log(`Projekt ${p.slug} gibt es schon (${existing.status}), nichts angelegt. Weiter mit sync/release.`); return; }
  console.log(`${dry ? '[plan] würde anlegen' : 'Lege an'}: ${p.title} (${p.slug}), Sichtbarkeit nach Prüfung: ${p.visibility}`);
  if (dry) return;
  const data = {
    slug: p.slug, project_type: p.projectType, ...projectFields(p, body),
    initial_versions: [], is_draft: true, requested_status: p.visibility,
  };
  const form = new FormData();
  form.append('data', JSON.stringify(data));
  form.append('icon', new Blob([readFileSync(join(cfg.root, DIR, p.icon))], { type: 'image/png' }), 'icon.png');
  const created = await api('POST', '/project', { token: t, form });
  console.log(`Angelegt als Entwurf: https://modrinth.com/mod/${created.slug} (id ${created.id}).`);
  await syncGallery(cfg, t, false);
  await release(cfg, false);
  await submit(cfg, t, false);
}

/** Gallery exactly as project.json: same files (SHA-1), titles, texts, order and featured image; extra images go. */
async function syncGallery(cfg, t, dry) {
  const { project: p } = cfg;
  const live = await api('GET', `/project/${p.slug}`, { token: t });
  const byHash = new Map((live?.gallery ?? []).map(g => [liveSha1(g.raw_url), g]));
  const wanted = new Set(p.gallery.map(g => sha1(join(cfg.root, DIR, g.file))));
  let order = 0, changes = 0;
  const say = (msg) => { changes++; console.log(`${dry ? '[plan] würde ' : ''}${msg}`); };
  // Remove first, so the new featured image never competes with an old one.
  for (const [hash, g] of byHash) if (!wanted.has(hash)) {
    say(`Bild entfernen: ${g.title}`);
    if (!dry) await api('DELETE', `/project/${p.slug}/gallery?${new URLSearchParams({ url: g.url })}`, { token: t });
  }
  for (const g of p.gallery) {
    order++;
    const hash = sha1(join(cfg.root, DIR, g.file));
    const meta = { featured: String(!!g.featured), title: g.title, description: g.description ?? '', ordering: String(order) };
    const have = byHash.get(hash);
    if (!have) {
      say(`Bild hochladen: ${g.file}`);
      if (!dry) await api('POST', `/project/${p.slug}/gallery?${new URLSearchParams({ ext: 'png', ...meta })}`, { token: t, raw: readFileSync(join(cfg.root, DIR, g.file)), contentType: 'image/png' });
    } else if (have.title !== g.title || (have.description ?? '') !== meta.description || have.featured !== !!g.featured || have.ordering !== order) {
      say(`Bildangaben ändern: ${g.file}`);
      if (!dry) await api('PATCH', `/project/${p.slug}/gallery?${new URLSearchParams({ url: have.url, ...meta })}`, { token: t });
    }
  }
  if (!changes) console.log('Galerie aktuell.');
}

async function syncIcon(cfg, t, dry) {
  const { project: p } = cfg;
  const live = await api('GET', `/project/${p.slug}`, { token: t, base: API3 });
  const file = join(cfg.root, DIR, p.icon);
  if (liveSha1(live?.raw_icon_url) === sha1(file)) { console.log('Icon aktuell.'); return; }
  console.log(dry ? '[plan] würde das Icon ersetzen' : 'Ersetze das Icon.');
  if (!dry) await api('PATCH', `/project/${p.slug}/icon?ext=png`, { token: t, raw: readFileSync(file), contentType: 'image/png' });
}

/** Content disclosures (API v3 only): exactly the list in project.json. */
async function syncDisclosures(cfg, t, dry) {
  const { project: p } = cfg;
  const want = (p.disclosures ?? []).map(d => Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'updated_at')));
  const live = await api('GET', `/project/${p.slug}/disclosures`, { token: t, base: API3 });
  const norm = list => JSON.stringify((list ?? []).map(d => Object.fromEntries(Object.entries(d).filter(([k, v]) => !['updated_at', 'updated_by', 'set_by_moderator', 'lock_status', 'deleted_at'].includes(k) && v != null && !(Array.isArray(v) && !v.length)).sort())).sort((a, b) => a.type.localeCompare(b.type)));
  // Only the types listed in project.json are managed; others stay as set on Modrinth.
  const managed = (live?.disclosures ?? []).filter(d => want.some(w => w.type === d.type));
  if (norm(managed) === norm(want)) { console.log('Offenlegungen aktuell.'); return; }
  console.log(`${dry ? '[plan] würde Offenlegungen setzen' : 'Setze Offenlegungen'}: ${want.map(d => d.type).join(', ') || 'keine'}`);
  if (!dry) await api('PATCH', `/project/${p.slug}/disclosures`, { token: t, json: { set: want, remove: [] }, base: API3 });
}

async function sync(cfg, dry) {
  const t = token(!dry);
  const { project: p, body } = cfg;
  const live = await api('GET', `/project/${p.slug}`, { token: t });
  if (!live) { console.log(`Projekt ${p.slug} gibt es noch nicht – zuerst create.`); return; }
  // client_side/server_side are only sent on create: a later v2 change overwrites every version's environment.
  const { client_side, server_side, ...want } = projectFields(p, body);
  const diff = Object.keys(want).filter(k => {
    const have = k === 'license_id' ? live.license?.id : k === 'license_url' ? live.license?.url : live[k];
    const norm = x => JSON.stringify(Array.isArray(x) ? [...x].sort() : x ?? null);
    return norm(have) !== norm(want[k]);
  });
  console.log(diff.length ? `${dry ? '[plan] würde ändern' : 'Ändere'}: ${diff.join(', ')}` : 'Projekttexte aktuell.');
  if (diff.length && !dry) await api('PATCH', `/project/${p.slug}`, { token: t, json: Object.fromEntries(diff.map(k => [k, want[k]])) });
  await syncIcon(cfg, t, dry);
  await syncGallery(cfg, t, dry);
  await syncDisclosures(cfg, t, dry);
  if (live.status === 'draft') await submit(cfg, t, dry);
}

/** Drafts go to Modrinth's review; after approval the project gets project.visibility. Needs at least one version. */
async function submit(cfg, t, dry) {
  console.log(dry ? '[plan] würde das Projekt zur Prüfung einreichen' : 'Reiche das Projekt zur Prüfung bei Modrinth ein.');
  if (!dry) await api('PATCH', `/project/${cfg.project.slug}`, { token: t, json: { status: 'processing' } });
}

async function release(cfg, dry) {
  const t = token(!dry);
  const { project: p } = cfg;
  const live = await api('GET', `/project/${p.slug}`, { token: t });
  if (!live) { console.log(`Projekt ${p.slug} gibt es noch nicht – zuerst create.`); return; }
  const have = await existingVersions(p.slug, t);
  const missing = wantedVersions(cfg).filter(v => !have.has(v.version_number));
  if (!missing.length) console.log('Alle Versionen sind schon auf Modrinth.');
  for (const v of missing) {
    console.log(`${dry ? '[plan] würde hochladen' : 'Lade hoch'}: ${v.version_number} (${v.file}, Minecraft ${v.game_versions.join(', ')})`);
    if (dry) continue;
    const bytes = readFileSync(v.path);
    if (createHash('sha256').update(bytes).digest('hex') !== v.sha256) throw new Error(`${v.file}: SHA-256 passt nicht`);
    const data = {
      project_id: live.id, name: v.name, version_number: v.version_number, changelog: v.changelog,
      dependencies: v.dependencies, game_versions: v.game_versions, version_type: v.version_type,
      loaders: v.loaders, featured: false, status: 'listed', file_parts: ['file'], primary_file: 'file',
    };
    const form = new FormData();
    form.append('data', JSON.stringify(data));
    form.append('file', new Blob([bytes], { type: 'application/java-archive' }), v.file);
    const made = await api('POST', '/version', { token: t, form });
    await api('PATCH', `/version/${made.id}`, { token: t, json: { environment: v.environment }, base: API3 });
    console.log(`  → https://modrinth.com/mod/${p.slug}/version/${made.id} (${v.environment})`);
  }
  // Every release also brings text, icon, gallery and disclosures up to date (Philipp 05.11.2026).
  if (!dry) await sync(cfg, false);
}

async function main() {
  const [cmd] = process.argv.slice(2);
  const cfg = loadConfig();
  const problems = checkConfig(cfg);
  if (problems.length) { console.error('Modrinth-Daten fehlerhaft:\n- ' + problems.join('\n- ')); process.exit(1); }
  if (cmd === 'check') { console.log(`Modrinth-Daten in Ordnung: ${wantedVersions(cfg).map(v => v.version_number).join(', ')}.`); return; }
  const online = await checkOnline(cfg);
  if (online.length) { console.error('Modrinth lehnt ab:\n- ' + online.join('\n- ')); process.exit(1); }
  if (cmd === 'plan') { await create(cfg, true); await release(cfg, true); await sync(cfg, true); return; }
  if (cmd === 'create') return create(cfg, false);
  if (cmd === 'sync') return sync(cfg, false);
  if (cmd === 'release') return release(cfg, false);
  throw new Error('usage: modrinth_publish.mjs check|plan|create|sync|release');
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
