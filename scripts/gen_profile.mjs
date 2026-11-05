#!/usr/bin/env node
// PROFILE-01: erzeugt das verbindliche Java-Versionsprofil aus dem offiziellen Minecraft-Server.
// Eingecheckt werden nur abgeleitete Fakten (Item-IDs, Tag-Mitgliedschaften, Rezeptmengen,
// Brennzeiten) – keine Dateien, Texturen oder Code von Mojang (ADR-020).
//
//   java -DbundlerMainClass=net.minecraft.data.Main -jar server.jar --reports --output out
//   unzip versions/<v>/server-<v>.jar 'data/minecraft/recipe/*' 'data/minecraft/tags/item/*' \
//         'data/minecraft/context_int_provider/*' 'data/minecraft/context_float_provider/*' -d jar
//   node scripts/gen_profile.mjs out jar 26.3 5023 <server.jar sha1>
//
// Ausgabe: packages/voxel/src/profileData.ts (Profilkopf, Items, Item-Tags, Brennstoffe) und
// packages/domain/src/materials/profileRecipes.ts (alle Bau-relevanten Rezepte des Profils).
// Prüfung: tests/profile.test.mjs (Hashes, Bindung an blockFacts.ts) und tests/recipe-profile.test.mjs.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const [reports, jar, version, dataVersion, serverSha1] = process.argv.slice(2);
if (!reports || !jar || !version || !/^\d+$/.test(dataVersion ?? '') || !/^[0-9a-f]{40}$/.test(serverSha1 ?? '')) {
  console.error('Aufruf: gen_profile.mjs <report-ordner> <jar-daten-ordner> <version> <dataVersion> <server.jar sha1>'); process.exit(2);
}
const sha256 = b => createHash('sha256').update(b).digest('hex');
const bare = id => id.replace(/^minecraft:/, '');
function files(dir) {
  const out = [];
  (function walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); e.isDirectory() ? walk(p) : out.push(p); } })(dir);
  return out.sort();
}
/** Hash over a directory: relative path + NUL + content, sorted, so the digest is independent of unpack order. */
function treeHash(dir) {
  const h = createHash('sha256');
  for (const f of files(dir)) { h.update(relative(dir, f).replaceAll('\\', '/')); h.update('\0'); h.update(readFileSync(f)); h.update('\0'); }
  return h.digest('hex');
}

const blocksReport = readFileSync(join(reports, 'reports/blocks.json'));
const registriesReport = readFileSync(join(reports, 'reports/registries.json'));
const registries = JSON.parse(registriesReport.toString('utf8'));
const items = Object.keys(registries['minecraft:item'].entries).map(bare).sort();
const itemSet = new Set(items);
const componentsDir = join(reports, 'reports/minecraft/components/item');
const recipeDir = join(jar, 'data/minecraft/recipe');
const tagDir = join(jar, 'data/minecraft/tags/item');
const intDir = join(jar, 'data/minecraft/context_int_provider');
const floatDir = join(jar, 'data/minecraft/context_float_provider');

// --- Item tags, flattened (nested tags resolved).
const rawTags = new Map(files(tagDir).filter(f => f.endsWith('.json')).map(f => [relative(tagDir, f).replaceAll('\\', '/').slice(0, -5),
  JSON.parse(readFileSync(f, 'utf8')).values.map(v => typeof v === 'string' ? v : v.id)]));
const flat = new Map();
function resolveTag(t, stack = new Set()) {
  if (flat.has(t)) return flat.get(t);
  if (stack.has(t)) throw new Error(`Tag-Zyklus ${t}`);
  stack.add(t);
  const out = new Set();
  for (const v of rawTags.get(t) ?? (() => { throw new Error(`Unbekannter Tag ${t}`); })()) {
    if (v.startsWith('#')) for (const m of resolveTag(bare(v.slice(1)), stack)) out.add(m);
    else out.add(bare(v));
  }
  const sorted = [...out].sort();
  flat.set(t, sorted);
  return sorted;
}
for (const t of rawTags.keys()) resolveTag(t);

// --- Recipes. Only types that turn items into building items; special/brewing/trim recipes are counted, not kept.
const STATION = {
  'minecraft:crafting_shaped': 'crafting', 'minecraft:crafting_shapeless': 'crafting', 'minecraft:crafting_transmute': 'crafting',
  'minecraft:stonecutting': 'stonecutter', 'minecraft:smelting': 'smelting', 'minecraft:blasting': 'blasting', 'minecraft:smoking': 'smoking',
  'minecraft:campfire_cooking': 'campfire', 'minecraft:smithing_transform': 'smithing',
};
const usedTags = new Set();
/** Ingredient → `alt/alt` (bare ids or #tag). */
function ingredient(i) {
  const alts = Array.isArray(i) ? i : [i];
  return alts.map(a => {
    if (typeof a !== 'string') throw new Error(`Unbekannte Zutatform ${JSON.stringify(a)}`);
    if (a.startsWith('#')) { const t = bare(a.slice(1)); resolveTag(t); usedTags.add(t); return `#${t}`; }
    if (!itemSet.has(bare(a))) throw new Error(`Zutat ${a} ist kein Item des Profils`);
    return bare(a);
  }).join('/');
}
function countIngredients(list) {
  const m = new Map();
  for (const i of list) { const k = ingredient(i); m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].map(([k, n]) => `${n}*${k}`);
}
const typeCounts = {};
const kept = [];
for (const f of files(recipeDir).filter(f => f.endsWith('.json'))) {
  const name = relative(recipeDir, f).replaceAll('\\', '/').slice(0, -5);
  const r = JSON.parse(readFileSync(f, 'utf8'));
  typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1;
  const station = STATION[r.type];
  if (!station || !r.result?.id) continue; // map cloning (result = input) and specials are no building recipes
  const out = bare(r.result.id), count = r.result.count ?? 1;
  if (!itemSet.has(out)) throw new Error(`Rezept ${name}: Ergebnis ${out} ist kein Item`);
  if (r.result.components) continue; // Items with extra components (suspicious stew …) are no building items.
  let inputs;
  if (r.type === 'minecraft:crafting_shaped') {
    const cells = r.pattern.join('').split('').filter(c => c !== ' ');
    inputs = countIngredients(cells.map(c => { if (!(c in r.key)) throw new Error(`${name}: Schlüssel ${c} fehlt`); return r.key[c]; }));
  } else if (r.type === 'minecraft:crafting_shapeless') inputs = countIngredients(r.ingredients);
  else if (r.type === 'minecraft:crafting_transmute') inputs = countIngredients([r.input, r.material]);
  else if (r.type === 'minecraft:smithing_transform') inputs = countIngredients([r.template, r.base, r.addition]);
  else inputs = countIngredients([r.ingredient]);
  const cook = station === 'smelting' || station === 'blasting' || station === 'smoking' || station === 'campfire' ? String(r.cookingtime ?? 200) : '';
  kept.push([name, station, out, String(count), cook, inputs.join(';')].join('|'));
}

// --- Fuels: every item with a cooking_fuel component, burn ticks in a normal and a fast (blast furnace/smoker) block.
function provider(dir, ref, ctx) {
  if (typeof ref === 'number') return ref;
  if (typeof ref === 'string') return provider(dir, JSON.parse(readFileSync(join(dir === 'int' ? intDir : floatDir, `${bare(ref)}.json`), 'utf8')), ctx);
  switch (ref.type) {
    case 'minecraft:div': return Math.trunc(provider(dir, ref.left, ctx) / provider(dir, ref.right, ctx));
    case 'minecraft:conditional':
      if (ref.condition !== 'minecraft:block/fast_cooking') throw new Error(`Unbekannte Bedingung ${ref.condition}`);
      return provider(dir, ctx.fast ? ref.on_true : ref.on_false, ctx);
    default: throw new Error(`Unbekannter Zahlenanbieter ${ref.type}`);
  }
}
const floatProvider = (ref, ctx) => typeof ref === 'number' ? ref : typeof ref === 'string'
  ? floatProvider(JSON.parse(readFileSync(join(floatDir, `${bare(ref)}.json`), 'utf8')), ctx)
  : ref.type === 'minecraft:conditional' ? floatProvider(ctx.fast ? ref.on_true : ref.on_false, ctx) : (() => { throw new Error(`Unbekannter Anbieter ${ref.type}`); })();
const fuels = [];
for (const id of items) {
  const c = JSON.parse(readFileSync(join(componentsDir, `${id}.json`), 'utf8')).components['minecraft:cooking_fuel'];
  if (!c) continue;
  const normal = provider('int', c.burn_time, { fast: false }), fast = provider('int', c.burn_time, { fast: true });
  const sn = floatProvider(c.speed_multiplier, { fast: false }), sf = floatProvider(c.speed_multiplier, { fast: true });
  fuels.push(`${id}|${normal}|${fast}|${sn}|${sf}`);
}

const tagLines = [...usedTags].sort().map(t => `${t}|${flat.get(t).join(',')}`);
const sources = {
  blocksReport: sha256(blocksReport), registriesReport: sha256(registriesReport), itemComponents: treeHash(componentsDir),
  recipes: treeHash(recipeDir), itemTags: treeHash(tagDir), cookingProviders: sha256(treeHash(intDir) + treeHash(floatDir)),
};
const header = `// Generated by scripts/gen_profile.mjs from the official Minecraft ${version} server (server.jar SHA-1 ${serverSha1}):
// data generator reports (blocks.json, registries.json, item components) and the data files inside the jar
// (recipes, item tags, cooking providers). Facts only: ids, counts, tag membership, burn times. Do not edit by
// hand; regenerate for a new profile version (PROFILE-01, docs/architecture/VERSION_PROFILE.md).
`;
const voxel = `${header}
export const PROFILE_VERSION = '${version}';
export const PROFILE_DATA_VERSION = ${dataVersion};
export const PROFILE_SERVER_SHA1 = '${serverSha1}';
/** SHA-256 of every source the profile was derived from (directories: sorted path + content). */
export const PROFILE_SOURCES = ${JSON.stringify(sources, null, 2)} as const;
export const PROFILE_COUNTS = ${JSON.stringify({ blocks: Object.keys(JSON.parse(blocksReport.toString('utf8'))).length, items: items.length, recipeFiles: Object.values(typeCounts).reduce((a, b) => a + b, 0), recipesKept: kept.length, itemTags: rawTags.size, fuels: fuels.length })} as const;
/** Recipe files per type in the jar (kept or not). */
export const PROFILE_RECIPE_TYPES: Readonly<Record<string, number>> = ${JSON.stringify(Object.fromEntries(Object.entries(typeCounts).sort()))};

/** Block entity types of the profile (registry minecraft:block_entity_type), bare, sorted (NBT-01). */
export const PROFILE_BLOCK_ENTITY_TYPES: readonly string[] = ${JSON.stringify(Object.keys(registries['minecraft:block_entity_type'].entries).map(bare).sort())};

/** Every item id of the profile (registry minecraft:item), bare, sorted. */
export const PROFILE_ITEMS = \`${items.join('\n')}\`;

/** Item tags used by the kept recipes, flattened: \`tag|member,member\`. */
export const PROFILE_ITEM_TAGS = \`${tagLines.join('\n')}\`;

/** Fuels: \`item|burn ticks normal|burn ticks fast block|speed normal|speed fast\` (cooking_fuel component). */
export const PROFILE_FUELS = \`${fuels.join('\n')}\`;
`;
const domain = `${header}
/**
 * Recipes: \`file|station|output|count|cooking ticks|n*ingredient;…\`. An ingredient is \`alt/alt\` of bare
 * item ids or \`#tag\` (see PROFILE_ITEM_TAGS). Stations: crafting, stonecutter, smelting, blasting, smoking,
 * campfire, smithing.
 */
export const PROFILE_RECIPES = \`${kept.join('\n')}\`;
`;
writeFileSync('packages/voxel/src/profileData.ts', voxel);
writeFileSync('packages/domain/src/materials/profileRecipes.ts', domain);
console.log(`Profil ${version}: ${items.length} Items, ${kept.length}/${Object.values(typeCounts).reduce((a, b) => a + b, 0)} Rezepte, ${tagLines.length} Tags, ${fuels.length} Brennstoffe.`);
console.log(JSON.stringify(sources, null, 2));
