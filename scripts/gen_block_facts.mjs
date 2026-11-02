#!/usr/bin/env node
// BLOCK-01: erzeugt packages/voxel/src/blockFacts.ts aus Berichten des offiziellen Minecraft-Servers.
// Nichts davon wird eingecheckt außer den abgeleiteten Fakten (IDs, Property-Werte, Zahlen,
// Tag-Mitgliedschaften) – keine Texturen, Modelle oder Code von Mojang (ADR-020).
//
//   java -DbundlerMainClass=net.minecraft.data.Main -jar server.jar --reports --output out
//   javac/java scripts/probe/BlockFactsProbe.java  → out/probe/*.jsonl   (siehe docs/architecture/BLOCK_LOGIC.md)
//   node scripts/gen_block_facts.mjs out 26.3 5023 <server.jar sha1>
//
// Die Prüfvektoren (out/probe/vectors.jsonl) werden als fixtures/blocks/block-vectors-26.3.json
// übernommen: Zufallsnachbarschaften mit dem Zustand, den das Spiel daraus errechnet.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const [dir, version, dataVersion, serverSha1] = process.argv.slice(2);
if (!dir || !version || !/^\d+$/.test(dataVersion ?? '') || !/^[0-9a-f]{40}$/.test(serverSha1 ?? '')) {
  console.error('Aufruf: gen_block_facts.mjs <report-ordner> <version> <dataVersion> <server.jar sha1>'); process.exit(2);
}
const read = p => readFileSync(join(dir, p));
const lines = p => read(p).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const reportBytes = read('reports/blocks.json');
const report = JSON.parse(reportBytes.toString('utf8'));
const probeBlocks = new Map(lines('probe/blocks.jsonl').map(b => [b.id, b]));
const probeStates = new Map(lines('probe/states.jsonl').map(s => [s.s, s]));
const tags = new Map(lines('probe/tags.jsonl').map(t => [t.tag, t.blocks]));
const bare = id => id.replace(/^minecraft:/, '');

function stackOf(item) {
  if (item === 'minecraft:air') return 0;
  try { return JSON.parse(read(`reports/minecraft/components/item/${bare(item)}.json`).toString('utf8')).components['minecraft:max_stack_size'] ?? 64; }
  catch { throw new Error(`Kein Item-Bericht für ${item}`); }
}
const stateString = (id, props) => {
  const keys = Object.keys(props).sort();
  return keys.length ? `${id}[${keys.map(k => `${k}=${props[k]}`).join(',')}]` : id;
};

// Klassen, die für Bauregeln zählen (Rest der Vererbungskette entfällt).
const FAMILY = new Set(['FallingBlock', 'FenceBlock', 'WallBlock', 'IronBarsBlock', 'StairBlock', 'FenceGateBlock', 'SlabBlock', 'DoorBlock', 'TrapDoorBlock', 'BedBlock',
  'LeavesBlock', 'LiquidBlock', 'SnowyBlock', 'HugeMushroomBlock', 'ChorusPlantBlock', 'ChestBlock', 'CactusBlock', 'SugarCaneBlock', 'DoublePlantBlock', 'TallSeagrassBlock',
  'BaseTorchBlock', 'WallTorchBlock', 'ButtonBlock', 'BasePressurePlateBlock', 'SignBlock', 'WallSignBlock', 'CeilingHangingSignBlock', 'WallHangingSignBlock', 'BannerBlock',
  'WallBannerBlock', 'LanternBlock', 'LadderBlock', 'BaseRailBlock', 'RedstoneWireBlock', 'DiodeBlock', 'CarpetBlock', 'VegetationBlock', 'CropBlock', 'SaplingBlock',
  'VineBlock', 'MultifaceBlock', 'SnowLayerBlock', 'ScaffoldingBlock', 'AnvilBlock', 'ConcretePowderBlock', 'DragonEggBlock', 'PointedDripstoneBlock', 'FlowerPotBlock',
  'ShulkerBoxBlock', 'SkullBlock', 'WallSkullBlock', 'CandleBlock', 'LeverBlock', 'FaceAttachedHorizontalDirectionalBlock', 'GrowingPlantHeadBlock', 'GrowingPlantBodyBlock',
  'BellBlock', 'ChainBlock', 'RotatedPillarBlock', 'AirBlock', 'FireBlock', 'BaseFireBlock', 'PortalBlock', 'NetherPortalBlock', 'TripWireBlock', 'TripWireHookBlock',
  'KelpBlock', 'SeagrassBlock', 'CoralPlantBlock', 'BaseCoralPlantTypeBlock', 'BaseCoralWallFanBlock', 'LilyPadBlock', 'NetherWartBlock', 'CocoaBlock', 'StemBlock',
  'AttachedStemBlock', 'MushroomBlock', 'BushBlock', 'FlowerBlock', 'TallFlowerBlock', 'PistonBaseBlock', 'PistonHeadBlock', 'CakeBlock', 'CandleCakeBlock', 'BaseEntityBlock',
  'TransparentBlock', 'HalfTransparentBlock', 'StainedGlassPaneBlock', 'WeatheringCopper']);

// Fakten je Zustand → Tupeltext (dedupliziert in FACTS).
function factTuple(s) {
  const how = s.how ? Object.entries(s.how).map(([d, v]) => `${d[0]}${compressHow(v)}`).join('&') : '';
  return [s.st.toString(36), s.full ? 1 : 0, s.alone ? 1 : 0, s.dirs, s.repl ? 1 : 0, s.light, bare(s.fluid), (s.occ ? 1 : 0) | (s.solid ? 2 : 0), s.wc, how,
    groundsSpec(s.on), groundsSpec(s.onWater), groundsSpec(s.under), groundsSpec(s.onDark)].join('~');
}
/** Exceptions to a support predicate as block ids, or `id{k=v,k2=v|…}` combinations when only some states of a block pass. */
const parseState = st => {
  const m = /^([^[]+)(?:\[(.*)\])?$/.exec(st);
  return { id: m[1], props: Object.fromEntries((m[2] ?? '').split(',').filter(Boolean).map(kv => kv.split('='))) };
};
function stateGroup(id, states) {
  const all = report[id]?.states ?? [];
  if (states.length >= all.length) return bare(id);
  const pass = new Set(states.map(st => JSON.stringify(parseState(st).props, Object.keys(parseState(st).props).sort())));
  const names = Object.keys(report[id].properties ?? {});
  const key = props => JSON.stringify(props, Object.keys(props).sort());
  let keys = [...names];
  for (const k of names) {
    const trial = keys.filter(x => x !== k), seen = new Map(); let ok = true;
    for (const s of all) {
      const sig = trial.map(x => s.properties[x]).join(','), v = pass.has(key(s.properties));
      if (seen.has(sig) && seen.get(sig) !== v) { ok = false; break; }
      seen.set(sig, v);
    }
    if (ok) keys = trial;
  }
  const combos = new Set();
  for (const s of all) if (pass.has(key(s.properties))) combos.add(keys.map(k => `${k}=${s.properties[k]}`).join(','));
  return `${bare(id)}{${[...combos].sort().join('|')}}`;
}
function compressHow(v) {
  const [pred, plus = '+', minus = '-'] = v.split('|');
  const group = list => {
    const items = list.slice(1).split(';').filter(Boolean);
    if (!items.length) return '';
    const byId = new Map();
    for (const it of items) { const id = parseState(it).id; (byId.get(id) ?? byId.set(id, []).get(id)).push(it); }
    return [...byId].map(([id, sts]) => stateGroup(id, sts)).join(';');
  };
  const p = group(plus), m = group(minus);
  return howId(pred + (p ? `+${p}` : '') + (m ? `-${m}` : ''));
}
const hows = [], howIndex = new Map();
function howId(h) {
  if (!h.includes('+') && !h.includes('-')) return h;
  let i = howIndex.get(h); if (i === undefined) { i = hows.length; hows.push(h); howIndex.set(h, i); }
  return `@${i}`;
}
/** Ground candidates → the smallest vanilla tag with exactly these members among the candidates, else the list. */
const GROUNDS = JSON.parse(read('probe/grounds.json').toString('utf8'));
const tagCache = new Map(), usedTags = new Set();
function groundsSpec(list) {
  if (!list?.length) return '';
  if (list.length === 1 && list[0] === '=self') return '=';
  const self = list.includes('=self');
  const want = list.filter(x => x !== '=self').sort();
  const key = want.join(',');
  if (!tagCache.has(key)) {
    let best = null;
    for (const [tag, members] of tags) {
      if (tag.includes('/')) continue;
      const m = new Set(members.map(bare));
      const hit = GROUNDS.filter(g => m.has(g)).sort();
      // supports_* tags first (all their members are candidates, so a match is exact), then the smallest tag;
      // among identical sets the general one (supports_vegetation = supports_melon_stem_fruit).
      const rank = tag === 'supports_vegetation' ? -2 : tag.startsWith('supports_') ? -1 : 0;
      if (hit.join(',') === key && (!best || rank < best[2] || (rank === best[2] && members.length < best[1]))) best = [tag, members.length, rank];
    }
    if (best) usedTags.add(best[0]);
    tagCache.set(key, best ? `#${best[0]}` : want.join(';'));
  }
  const spec = tagCache.get(key);
  return [spec, self ? '=' : ''].filter(Boolean).join(';');
}

const facts = [], factIndex = new Map();
const tables = [], tableIndex = new Map();
const tableId = t => { let i = tableIndex.get(t); if (i === undefined) { i = tables.length; tables.push(t); tableIndex.set(t, i); } return i; };
const factId = t => { let i = factIndex.get(t); if (i === undefined) { i = facts.length; facts.push(t); factIndex.set(t, i); } return i; };
const classes = [], classIndex = new Map();
const classId = c => { let i = classIndex.get(c); if (i === undefined) { i = classes.length; classes.push(c); classIndex.set(c, i); } return i; };

const out = [];
const ids = Object.keys(report).sort();
for (const id of ids) {
  const b = report[id], pb = probeBlocks.get(id);
  if (!pb) throw new Error(`Probe ohne ${id}`);
  const props = b.properties ?? {};
  const names = Object.keys(props);
  const def = b.states.find(s => s.default);
  const tuples = new Map(b.states.map(s => {
    const ps = probeStates.get(stateString(id, s.properties ?? {}));
    if (!ps) throw new Error(`Probe ohne Zustand ${stateString(id, s.properties ?? {})}`);
    return [JSON.stringify(s.properties ?? {}), factTuple(ps)];
  }));
  // Minimal determining property set (greedy).
  let keys = [...names];
  for (const k of names) {
    const trial = keys.filter(x => x !== k), seen = new Map(); let ok = true;
    for (const s of b.states) {
      const sig = trial.map(x => s.properties[x]).join(','), t = tuples.get(JSON.stringify(s.properties ?? {}));
      if (seen.has(sig) && seen.get(sig) !== t) { ok = false; break; }
      seen.set(sig, t);
    }
    if (ok) keys = trial;
  }
  const combos = keys.reduce((acc, k) => acc.flatMap(c => props[k].map(v => ({ ...c, [k]: v }))), [{}]);
  const table = combos.map(c => {
    const s = b.states.find(st => keys.every(k => st.properties[k] === c[k]));
    return factId(tuples.get(JSON.stringify(s.properties ?? {})));
  });
  const cls = pb.cls.filter(c => FAMILY.has(c) || c === pb.cls[0]).filter(c => c !== 'Block' && c !== 'BlockBehaviour').map(classId);
  const item = pb.item === id ? '' : pb.item === 'minecraft:air' ? '-' : bare(pb.item);
  const stack = stackOf(pb.item);
  const propSpec = names.map(k => `${k}=${props[k].join(',')}${def.properties[k] === props[k][0] ? '' : `:${def.properties[k]}`}`).join(';');
  out.push([bare(id), cls.join(','), item, stack === 64 ? '' : stack, pb.hardness, (pb.tool ? 1 : 0) | (pb.fallable ? 2 : 0), propSpec, keys.join(','), table.length === 1 ? table[0].toString(36) : `@${tableId(table.map(i => i.toString(36)).join(','))}`].join('|'));
}

const KEEP_TAG = /^(fences|wooden_fences|walls|fence_gates|stairs|slabs|doors|trapdoors|beds|leaves|logs|planks|wall_post_override|snow|shulker_boxes|climbable|replaceable|sand|dirt|crops|flowers|small_flowers|saplings|rails|buttons|pressure_plates|signs|wall_signs|standing_signs|all_hanging_signs|banners|candles|wool_carpets|ice|fire|bars|chains|lanterns|copper|glazed_terracotta|concrete_powders|impermeable|needs_stone_tool|needs_iron_tool|needs_diamond_tool|mineable\/.*|supports_.*|support_override_.*|cannot_support_.*|replaceable_by_trees|maintains_farmland|grass_blocks|moss_blocks|mud|nylium|base_stone_overworld|stone_bricks|wool|terracotta|concrete|coral_blocks|corals|cauldrons|campfires|skulls|flower_pots|candle_cakes|anvil|portals)$/;
const tagLines = [...tags].filter(([t]) => KEEP_TAG.test(t) || usedTags.has(t)).map(([t, m]) => `${t}|${m.map(bare).join(',')}`);

const sha = createHash('sha256').update(reportBytes).digest('hex');
const file = `// Generated by scripts/gen_block_facts.mjs from the official Minecraft ${version} server: the data
// generator block report (blocks.json SHA-256 ${sha}), item component reports, block tags and the
// probe scripts/probe/BlockFactsProbe.java, which asks the real game code (canSurvive, isFaceSturdy,
// updateShape, asItem). Server jar SHA-1 ${serverSha1}. Facts only: ids, property values, numbers and
// tag membership. Do not edit by hand; regenerate for a new profile version (BLOCK-01).

export const BLOCK_FACTS_VERSION = '${version}';
export const BLOCK_FACTS_DATA_VERSION = ${Number(dataVersion)};
export const BLOCK_FACTS_REPORT_SHA256 = '${sha}';
export const BLOCK_FACTS_SERVER_SHA1 = '${serverSha1}';

/** Game classes that matter for building rules (index → simple class name). */
export const FACT_CLASSES: readonly string[] = ${JSON.stringify(classes)};

/**
 * State facts, one per line: sturdy mask (base 36, 3×6 bits FULL/CENTER/RIGID × down,up,north,south,west,east)
 * ~ full collision cube ~ survives alone ~ support directions (bits as above) ~ replaceable ~ light
 * ~ fluid ~ flags (1 occludes, 2 solid) ~ wall cover bits (post,n,s,w,e; −1 unknown) ~ support predicate per direction
 * ~ grounds ~ grounds with adjacent water ~ blocks above that hold it ~ grounds only in the dark (light < 13).
 */
export const FACT_STATES = \`${facts.join('\n')}\`;

/**
 * Blocks, one per line: name | class indices | item (empty = same id, - = none) | stack (empty = 64)
 * | hardness | flags (1 tool needed, 2 falls) | properties \`k=v1,v2[:default]\` (game order, default
 * first unless given) | keys that determine the state facts | fact index (base 36) or @table with one index per key
 * combination (first key slowest).
 */
/** Support predicates with exceptions (referenced as @n from FACT_STATES): \`predicate+blocks-blocks\`. */
export const FACT_SUPPORT = \`${hows.join('\n')}\`;

/** Shared fact tables (blocks of one family share them), one per line. */
export const FACT_TABLES = \`${tables.join('\n')}\`;

export const FACT_BLOCKS = \`${out.join('\n')}\`;

/** Selected vanilla block tags (resolved): \`tag|block,block,…\`. */
export const FACT_TAGS = \`${tagLines.join('\n')}\`;
`;
writeFileSync(new URL('../packages/voxel/src/blockFacts.ts', import.meta.url), file);

// Prüfvektoren
// Only families the TS logic settles (BLOCK-01); the probe also writes others for later work.
const SETTLED = new Set(['oak_fence', 'nether_brick_fence', 'oak_fence_gate', 'cobblestone_wall', 'glass_pane', 'iron_bars', 'copper_bars', 'oak_stairs', 'stone_brick_stairs',
  'grass_block', 'mycelium', 'podzol', 'brown_mushroom_block', 'survive']);
const perFamily = new Map();
const vectors = lines('probe/vectors.jsonl').filter(v => {
  if (!SETTLED.has(v.family)) return false;
  const n = (perFamily.get(v.family) ?? 0) + 1; perFamily.set(v.family, n);
  return n <= (v.family === 'survive' ? 1500 : 120);
});
writeFileSync(new URL(`../fixtures/blocks/block-vectors-${version}.json`, import.meta.url), JSON.stringify({
  source: `Minecraft ${version} server ${serverSha1}, scripts/probe/BlockFactsProbe.java`, count: vectors.length, vectors,
}));
console.log(`${out.length} Blöcke, ${facts.length} Zustandsfakten, ${classes.length} Klassen, ${tagLines.length} Tags, ${vectors.length} Prüfvektoren; ${(file.length / 1024).toFixed(0)} KB`);
