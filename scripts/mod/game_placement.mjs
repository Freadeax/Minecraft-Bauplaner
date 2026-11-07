// BLOCK-01/02 Spielprüfstand, Treiber zu scripts/mod/test_game_placement.sh:
//   prepare <dir> [set ...]   schreibt je Plan eine Auftragsdatei <dir>/jobs/<n>.txt für das Test-Plugin
//                             scripts/mod/probe/PlacementProbe.java (Sätze: catalog, generators, gelaende, basis,
//                             grossprojekte, grossprojekteGelaende,
//                             alle; Standard: catalog generators)
//   verify <dir>              liest <dir>/results/*.json, ordnet jede Abweichung ein, schreibt <dir>/bericht.md
//                             und beendet sich mit Fehler, wenn das Spiel einen Plan verändert hat
// Weitere Sätze melden sich in SETS an (Gelände, Basisplaner, Großprojekte: placement_worlds.mjs): eine Funktion, die
// { name, payload } liefert. Der Plan steht mit y = 0 auf einer flachen Grasebene; leere Zellen sind Luft.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const main = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
const [mode, dir, ...wanted] = main ? process.argv.slice(2) : [];
if (main && (!['prepare', 'verify'].includes(mode) || !dir)) throw new Error('usage: game_placement.mjs prepare|verify <dir> [set ...]');

const stateString = s => s.id + (Object.keys(s.properties ?? {}).length
  ? `[${Object.entries(s.properties).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}=${v}`).join(',')}]` : '');

/** Plan sets; each yields { name, payload } with a block payload (cells, palette, bounds). */
export const SETS = {
  async *catalog() {
    const { BUILDING_SPECS } = await import('../../dist/domain/src/index.js');
    for (const s of BUILDING_SPECS) yield { name: `Gebäude ${s.id}`, payload: s.payload() };
  },
  async *generators() {
    const { GENERATORS, runGenerator, presetValues, defaultsOf, rollParams, STYLES } = await import('../../dist/domain/src/index.js');
    for (const g of GENERATORS) {
      const cases = [['Standard', defaultsOf(g.params)], ...g.presets.map(p => [`Vorlage ${p.id}`, presetValues(g.id, p.id)]),
        ...STYLES.map(st => [`Stil ${st.key}`, { ...defaultsOf(g.params), stil: st.key, verwitterung: 30 }])];
      for (let seed = 1; seed <= 3; seed++) cases.push([`Würfel ${seed}`, rollParams(g.params, seed * 7919)]);
      for (const end of ['min', 'max']) cases.push([`alle ${end}`, Object.fromEntries(g.params.map(d => [d.key, d.type === 'int' ? d[end] : d.default]))]);
      const seen = new Set();
      for (const [label, values] of cases) {
        const payload = runGenerator(g.id, values).payload;
        const sig = `${payload.cells.length}:${JSON.stringify(payload.bounds)}:${payload.palette.length}`;
        if (seen.has(sig)) continue; // same output as an earlier case (e.g. a style the generator ignores)
        seen.add(sig);
        yield { name: `Generator ${g.id} ${label}`, payload };
      }
    }
  },
  // TERRAIN-03/05, BASE-01, GROSS-01: Gelände, Basisplaner und Großprojekte als ganze Welten (placement_worlds.mjs).
  async *gelaende() { yield* (await import('./placement_worlds.mjs')).terrainParts(); },
  async *basis() { yield* (await import('./placement_worlds.mjs')).basePlans(); },
  async *grossprojekte() { yield* (await import('./placement_worlds.mjs')).grossprojektPlans(); },
  async *grossprojekteGelaende() { yield* (await import('./placement_worlds.mjs')).grossprojektLandscapes(); },
};

const isLiquid = s => /^minecraft:(water|lava)$/.test(s.id) || s.properties?.waterlogged === 'true';

/** Job text for the plugin: positions relative to the plan's min corner, air left out. */
export function jobText(name, payload) {
  const min = payload.bounds.min, size = payload.bounds.maxExclusive.map((v, i) => v - min[i]);
  const blocks = [];
  let sea = -1;
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const s = payload.palette[c.paletteIndex];
    if (!s || s.id === 'minecraft:air' || s.id === 'minecraft:cave_air' || s.id === 'minecraft:void_air') continue;
    const [x, y, z] = [c.position[0] - min[0], c.position[1] - min[1], c.position[2] - min[2]];
    // Liquid on the plan's outer side: the plan stands at (or in) water or continues in a neighbour
    // module; the probe puts a water body around it up to that height.
    if ((x === 0 || z === 0 || x === size[0] - 1 || z === size[2] - 1) && isLiquid(s)) sea = Math.max(sea, y);
    blocks.push(`${x} ${y} ${z} ${stateString(s)}`);
  }
  return [`${name.replace(/\s+/g, ' ')}\t${size.join(' ')}${sea >= 0 ? `\t${sea}` : ''}`, ...blocks].join('\n') + '\n';
}

/** Part of every block (relative position → part name), for worlds made of several parts (placement_worlds.mjs). */
function partsOf(payload) {
  const min = payload.bounds.min, out = {};
  payload.cells.forEach((c, i) => { if (c.kind === 'block') out[`${c.position[0] - min[0]},${c.position[1] - min[1]},${c.position[2] - min[2]}`] = payload.parts[i]; });
  return out;
}

const SIDES = { north: [0, 0, -1], south: [0, 0, 1], east: [1, 0, 0], west: [-1, 0, 0] };
/**
 * A connection the game makes towards a block of another part (a fence of a house next to the terrain,
 * the next house or a rim stone): every part is drawn for itself, the planner cannot show it connected.
 * Reported as a seam (Naht), not as an error.
 */
export function isSeam(d, parts) {
  if (!parts) return false;
  const want = parseState(d.want), got = parseState(d.got);
  if (want.id !== got.id) return false;
  const changed = Object.keys({ ...want.props, ...got.props }).filter(k => want.props[k] !== got.props[k]);
  const own = parts[d.p.join(',')];
  return changed.length > 0 && changed.every(k => {
    const o = SIDES[k];
    if (!o) return false;
    const n = parts[[d.p[0] + o[0], d.p[1] + o[1], d.p[2] + o[2]].join(',')];
    return n !== undefined && n !== own;
  });
}

const parseState = s => {
  if (!s) return { id: 'minecraft:air', props: {} };
  const m = s.match(/^([^[]+)(?:\[(.*)\])?$/);
  return { id: m[1], props: Object.fromEntries((m[2] ?? '').split(',').filter(Boolean).map(kv => kv.split('='))) };
};

/**
 * Sorts one difference between plan and game into a kind. Harmless kinds are counted but do not fail:
 * leaves recompute their distance to the next log (only a decaying leaf counts), and the flat world's
 * grass under a plan is not part of the plan.
 */
const SIGNAL = new Set(['power', 'powered', 'enabled', 'triggered', 'lit']);
export function classify(d) {
  const want = parseState(d.want), got = parseState(d.got);
  if (d.want == null) {
    if (/water|lava/.test(got.id)) return { kind: 'flows', note: `${got.id} läuft aus` };
    return { kind: 'appeared', note: `${got.id} entstanden` };
  }
  if (got.id === 'minecraft:air') return { kind: 'breaks', note: `${want.id} fällt ab` };
  if (want.id === 'minecraft:water' && got.id === 'minecraft:bubble_column') return { kind: 'harmless', note: 'Blasensäule aus Wasser über Seelensand/Magma' };
  if (got.id !== want.id) return { kind: 'turns', note: `${want.id} wird zu ${got.id}` };
  const changed = Object.keys({ ...want.props, ...got.props }).filter(k => want.props[k] !== got.props[k]);
  // Switching states the game derives from redstone signals, daylight or inventory contents: the plan
  // cannot know them, the game sets them on the first update (no block changes or drops).
  if (changed.every(k => SIGNAL.has(k) || (k.startsWith('has_bottle_') && want.id === 'minecraft:brewing_stand'))) return { kind: 'harmless', note: 'Schaltzustand' };
  if (/_leaves$/.test(want.id) && changed.every(k => k === 'distance')) {
    return got.props.persistent === 'false' && got.props.distance === '7' ? { kind: 'decays', note: `${want.id} verrottet (kein Stamm in 6 Blöcken)` } : { kind: 'harmless', note: 'Laub-Abstand' };
  }
  return { kind: 'connects', note: `${want.id}: ${changed.map(k => `${k} ${want.props[k]}→${got.props[k]}`).join(', ')}` };
}

if (!main) {
  // imported as a module (SETS, jobText, classify)
} else if (mode === 'prepare') {
  rmSync(join(dir, 'parts'), { recursive: true, force: true });
  mkdirSync(join(dir, 'jobs'), { recursive: true });
  mkdirSync(join(dir, 'parts'), { recursive: true });
  const sets = !wanted.length ? ['catalog', 'generators'] : wanted.includes('alle') ? Object.keys(SETS) : wanted;
  let n = 0, blocks = 0;
  for (const set of sets) {
    if (!SETS[set]) throw new Error(`Unbekannter Satz ${set} (${Object.keys(SETS).join(', ')})`);
    for await (const { name, payload } of SETS[set]()) {
      const text = jobText(name, payload);
      blocks += text.split('\n').length - 2;
      const file = String(n++).padStart(5, '0');
      writeFileSync(join(dir, 'jobs', `${file}.txt`), text);
      if (payload.parts) writeFileSync(join(dir, 'parts', `${file}.json`), JSON.stringify(partsOf(payload)));
    }
  }
  console.log(`Spielprüfung vorbereitet: ${n} Pläne, ${blocks} Blöcke (${sets.join(', ')}).`);
} else {
  const files = readdirSync(join(dir, 'results')).filter(f => f.endsWith('.json')).sort();
  const jobs = readdirSync(join(dir, 'jobs')).filter(f => f.endsWith('.txt'));
  const counts = {}, bad = [], infos = [];
  let blocks = 0;
  for (const f of files) {
    const r = JSON.parse(readFileSync(join(dir, 'results', f), 'utf8'));
    blocks += r.blocks;
    const groups = new Map(), info = [];
    const add = (kind, note, p) => { const k = `${kind}: ${note}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p.join(',')); };
    // Cells the plan fills with a liquid (or a waterlogged block): a spill starts next to one of them.
    const plan = new Map(readFileSync(join(dir, 'jobs', f.replace(/\.json$/, '.txt')), 'utf8').split('\n').slice(1).filter(Boolean)
      .map(l => { const [x, y, z, st] = l.split(' '); return [`${x},${y},${z}`, st]; }));
    const partsFile = join(dir, 'parts', f);
    const parts = existsSync(partsFile) ? JSON.parse(readFileSync(partsFile, 'utf8')) : null;
    let seams = 0;
    const plannedWater = new Set([...plan].filter(([, st]) => /minecraft:(water|lava)\b|waterlogged=true/.test(st)).map(([k]) => k));
    const flowing = new Map(r.diffs.filter(d => d.want == null && /water|lava/.test(d.got)).map(d => [d.p.join(','), d]));
    for (const d of r.diffs) {
      let c = classify(d);
      if (c.kind === 'connects' && isSeam(d, parts)) { c = { kind: 'seam', note: c.note }; seams++; }
      counts[c.kind] = (counts[c.kind] ?? 0) + 1;
      if (c.kind === 'seam') continue;
      if (c.kind === 'harmless') continue;
      if (c.kind === 'flows') {
        // Only the first cell of a spill is reported: the one next to (or under) a cell the plan fills.
        const [x, y, z] = d.p;
        const neighbours = [[x + 1, y, z], [x - 1, y, z], [x, y, z + 1], [x, y, z - 1], [x, y + 1, z]];
        const inside = x >= 0 && z >= 0 && x < r.size[0] && z < r.size[2];
        if (!neighbours.some(n => plannedWater.has(n.join(',')))) continue;
        // Inside the plan, water above a basin (a spout that spills over its bowl and falls back) is a
        // water feature; water where the plan has no liquid below runs out of its basin (gap in the rim).
        const overBasin = Array.from({ length: y + 1 }, (_, yy) => `${x},${yy},${z}`).some(k => plannedWater.has(k));
        // Lava runs at most three blocks: a lava stream inside the plan is a feature too.
        if (inside && (overBasin || /lava/.test(c.note))) { info.push(`${c.note} im Plan bei ${d.p.join(',')} (Wasserspiel über dem Becken)`); continue; }
        if (inside) { add('spills', `${c.note} über den Boden (Lücke im Becken)`, d.p); continue; }
        add('leaks', `${c.note} (über den Planrand)`, d.p);
        continue;
      }
      add(c.kind, c.note, d.p);
    }
    for (const e of r.entities) { counts.entity = (counts.entity ?? 0) + 1; add('entity', e.what.replace(/ x\d+$/, ''), e.p); }
    const found = [...groups].map(([k, ps]) => `${k} – ${ps.length}× bei ${ps.slice(0, 4).join(' / ')}${ps.length > 4 ? ' …' : ''}`);
    const outside = [...flowing.values()].filter(d => d.p[0] < 0 || d.p[2] < 0 || d.p[0] >= r.size[0] || d.p[2] >= r.size[2]).length;
    if (outside && !found.some(f => /^leaks/.test(f))) found.push(`leaks: ${outside} Zellen Flüssigkeit außerhalb des Plans (über abgeleitete Wasserzellen)`);
    if (info.length || seams) infos.push({ name: r.name, info, seams });
    if (found.length) bad.push({ name: r.name, found });
  }
  const lines = [`# Spielprüfung ${new Date().toISOString().slice(0, 10)}`, '',
    `${files.length} von ${jobs.length} Plänen im echten Server geprüft, ${blocks} Blöcke. Abweichungen: ${JSON.stringify(counts)}.`, ''];
  for (const b of bad) lines.push(`## ${b.name}`, '', ...b.found.slice(0, 40).map(l => `- ${l}`), b.found.length > 40 ? `- … ${b.found.length - 40} weitere` : '', '');
  if (infos.length) lines.push('## Hinweise (kein Fehler)', '', ...infos.map(i => `- ${i.name}: ${[
    i.info.length && `${i.info.length} Zellen fließendes Wasser/Lava im Plan, z. B. ${i.info[0]}`,
    i.seams && `${i.seams} Verbindungen an Nähten zwischen zwei Bauteilen (Zaun, Mauer oder Scheibe verbindet sich im Spiel mit dem Nachbarbauteil, z. B. Haus und Gelände)`].filter(Boolean).join('; ')}`), '');
  writeFileSync(join(dir, 'bericht.md'), lines.join('\n'));
  console.log(lines.slice(0, 3).join('\n'));
  for (const b of bad.slice(0, 30)) console.log(`  ${b.name}: ${b.found.length} – ${b.found.slice(0, 3).join(' | ')}`);
  if (files.length !== jobs.length) { console.error(`Es fehlen ${jobs.length - files.length} Ergebnisse.`); process.exit(1); }
  if (bad.length) { console.error(`${bad.length} Pläne verändert das Spiel (Bericht ${join(dir, 'bericht.md')}).`); process.exit(1); }
  console.log('Alle Pläne bleiben im echten Spiel so, wie sie gezeichnet sind.');
}
