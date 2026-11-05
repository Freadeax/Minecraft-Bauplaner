import { test } from 'node:test';
import assert from 'node:assert/strict';
import { survives, isFactBlock, createPayload } from '../../../dist/voxel/src/index.js';
import {
  BUILDING_SPECS, GENERATORS, checkPlacement, runGenerator, presetValues, defaultsOf, rollParams, STYLES, hangLanterns, gameReady, MAX_CHAIN,
} from '../../../dist/domain/src/index.js';

/**
 * BLOCK-02: Katalog und Generatoren bauen nur, was im Spiel hält. Jedes Gebäude
 * und jeder Generator-Fall wird mit der echten Blocklogik geprüft; der Plan
 * beansprucht seinen Raum (leere Zellen gelten als Luft, nur der Boden unter
 * der Grundfläche bleibt offen). Neue Gebäude sind automatisch dabei.
 */
const KINDS = ['connection', 'unsupported', 'falls', 'half', 'invalid-state'];
function problems(payload) {
  const r = checkPlacement(payload, { ownSpace: true, maxIssues: 20 });
  const out = r.issues.map(i => `${i.kind} ${i.state.id} @${i.position.join(',')}: ${i.note}`);
  if (r.unknownBlocks) out.push(`${r.unknownBlocks} Blöcke ohne 26.3-Fakten (unbekannte oder alte IDs, z. B. chain statt iron_chain)`);
  for (const k of KINDS) assert.ok(r.counts[k] >= 0);
  return out;
}

test('every catalogue building holds in the game: no floating, falling, half or unknown block, connections as in the game', () => {
  let blocks = 0;
  for (const s of BUILDING_SPECS) {
    const payload = s.payload();
    blocks += payload.cells.length;
    assert.deepEqual(problems(payload), [], s.id);
  }
  assert.ok(BUILDING_SPECS.length >= 300 && blocks > 100000, `${BUILDING_SPECS.length} Gebäude`);
});

test('every generator builds only valid buildings: defaults, presets, styles, 25 rolled sets and the range ends', () => {
  let n = 0;
  for (const g of GENERATORS) {
    const cases = [['Standard', defaultsOf(g.params)], ...g.presets.map(p => [`Vorlage ${p.id}`, presetValues(g.id, p.id)]),
      ...STYLES.map(st => [`Stil ${st.key}`, { ...defaultsOf(g.params), stil: st.key, verwitterung: 30 }])];
    for (let seed = 1; seed <= 25; seed++) cases.push([`Würfel ${seed}`, rollParams(g.params, seed * 7919)]);
    for (const end of ['min', 'max']) cases.push([`alle ${end}`, Object.fromEntries(g.params.map(d => [d.key, d.type === 'int' ? d[end] : d.default]))]);
    for (const [label, values] of cases) { n++; assert.deepEqual(problems(runGenerator(g.id, values).payload), [], `${g.id} ${label}`); }
  }
  assert.ok(n > 400, `${n} Fälle`);
});

test('chain is iron_chain in 26.3: no catalogue building or generator uses the old id', () => {
  assert.equal(isFactBlock('minecraft:chain'), false);
  assert.equal(isFactBlock('minecraft:iron_chain'), true);
  for (const s of BUILDING_SPECS) assert.ok(!s.payload().palette.some(p => p.id === 'minecraft:chain'), s.id);
});

const air = { id: 'minecraft:air', properties: {} }, stone = { id: 'minecraft:stone', properties: {} };
const lantern = hanging => ({ id: 'minecraft:lantern', properties: { hanging: String(hanging), waterlogged: 'false' } });
const payloadOf = (size, blocks) => {
  const palette = [air], cells = [];
  for (const [pos, state] of blocks) {
    let i = palette.findIndex(p => JSON.stringify(p) === JSON.stringify(state));
    if (i < 0) { i = palette.length; palette.push(state); }
    cells.push({ position: pos, kind: 'block', paletteIndex: i });
  }
  return createPayload({ schemaVersion: 1, profileId: 'test', bounds: { min: [0, 0, 0], maxExclusive: size }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
};
const at = (payload, pos) => { const c = payload.cells.find(c => c.position.join() === pos.join()); return c && payload.palette[c.paletteIndex]; };

test('hangLanterns: a lantern under a high ceiling hangs from iron chains; a standing lantern without floor hangs; without ceiling nothing changes', () => {
  const high = hangLanterns(payloadOf([1, 6, 1], [[[0, 1, 0], lantern(true)], [[0, 5, 0], stone]]));
  for (const y of [2, 3, 4]) assert.equal(at(high, [0, y, 0]).id, 'minecraft:iron_chain', `Kette auf ${y}`);
  assert.ok(checkPlacement(high, { ownSpace: true }).counts.unsupported === 0);
  const flip = hangLanterns(payloadOf([1, 3, 1], [[[0, 1, 0], lantern(false)], [[0, 2, 0], stone]]));
  assert.equal(at(flip, [0, 1, 0]).properties.hanging, 'true');
  const sky = payloadOf([1, 4, 1], [[[0, 2, 0], lantern(true)]]);
  assert.equal(hangLanterns(sky), sky, 'ohne Decke unverändert – die Prüfung meldet es');
  const far = payloadOf([1, MAX_CHAIN + 4, 1], [[[0, 1, 0], lantern(true)], [[0, MAX_CHAIN + 3, 0], stone]]);
  assert.equal(hangLanterns(far), far, `mehr als ${MAX_CHAIN} Kettenglieder werden nicht erzeugt`);
  // A held lantern stays as drawn; gameReady is stable.
  const ok = payloadOf([1, 3, 1], [[[0, 0, 0], stone], [[0, 1, 0], lantern(false)]]);
  assert.equal(hangLanterns(ok), ok);
  const ready = gameReady(high);
  assert.equal(gameReady(ready), ready);
});

test('ownSpace: empty cells of the plan are air, only the ground below the base stays Umgebung', () => {
  const floating = payloadOf([1, 3, 1], [[[0, 2, 0], lantern(false)]]);
  assert.equal(checkPlacement(floating).counts.unsupported, 0, 'ohne ownSpace: Zelle darunter gehört nicht zur Auswahl');
  assert.equal(checkPlacement(floating, { ownSpace: true }).counts.unsupported, 1);
  const onGround = payloadOf([1, 2, 1], [[[0, 0, 0], lantern(false)]]);
  const r = checkPlacement(onGround, { ownSpace: true });
  assert.equal(r.counts.unsupported, 0); assert.equal(r.dependsOnSurroundings, 1);
});

test('cocoa holds only on jungle logs in its facing direction (CocoaBlock.canSurvive)', () => {
  const cocoa = { id: 'minecraft:cocoa', properties: { age: '2', facing: 'south' } };
  const look = id => p => p[2] === 1 && p[0] === 0 && p[1] === 0 ? { id, properties: { axis: 'y' } } : undefined;
  assert.equal(survives(cocoa, [0, 0, 0], look('minecraft:jungle_log')).survives, true);
  assert.equal(survives(cocoa, [0, 0, 0], look('minecraft:stripped_jungle_wood')).survives, true);
  assert.equal(survives(cocoa, [0, 0, 0], look('minecraft:oak_log')).survives, false);
  assert.equal(survives({ ...cocoa, properties: { age: '2', facing: 'north' } }, [0, 0, 0], look('minecraft:jungle_log')).survives, false);
});
