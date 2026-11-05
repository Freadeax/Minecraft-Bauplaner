import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING_SPECS } from '../../../dist/domain/src/index.js';
import { Plot } from '../../../dist/domain/src/catalog/build/plot.js';
import { house, pick, LOOKS, pitchedRoof } from '../../../dist/domain/src/catalog/build/style.js';
import { designMetrics } from '../../../dist/domain/src/catalog/build/quality.js';
import { refinePayload, refineOptionsFor } from '../../../dist/domain/src/catalog/build/refine.js';

/**
 * LIB-05 Baustil: die Regeln aus docs/architecture/bibliothek/BAUSTIL.md als Messwerte.
 * Vorlagen (31 untersuchte Bauten): 40 % Nicht-Vollblöcke, 52 % umgedrehte
 * Treppen, 24 % der Fassade auf der Hauptebene. Der Katalog lag vorher bei
 * 18 %, 4 % und 64 %.
 */
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const ofKind = k => BUILDING_SPECS.filter(s => s.facets?.kategorie?.includes(k)).map(s => designMetrics(s.payload()));

test('Wohnhäuser erreichen die Gestaltungsziele: Detailblöcke, Konsolen und Relief', () => {
  const m = ofKind('wohnhaus');
  assert.ok(m.length >= 40, `${m.length} Wohnhäuser`);
  assert.ok(median(m.map(x => x.detail)) >= 0.3, `Nicht-Vollblöcke ${median(m.map(x => x.detail))}`);
  assert.ok(median(m.map(x => x.upsideDown)) >= 0.2, `umgedrehte Treppen ${median(m.map(x => x.upsideDown))}`);
  assert.ok(median(m.map(x => x.flatFacade)) <= 0.5, `Fassade auf der Hauptebene ${median(m.map(x => x.flatFacade))}`);
  assert.ok(median(m.map(x => x.materials)) >= 20, 'gemischte Materialien');
});

test('Architektur insgesamt: mehr Relief als vorher (64 % → höchstens 55 % auf der Hauptebene)', () => {
  const kinds = ['wohnhaus', 'handel', 'handwerk', 'landwirtschaft', 'oeffentlich', 'sakral', 'befestigung', 'wahrzeichen', 'magie'];
  const m = BUILDING_SPECS.filter(s => s.facets?.kategorie?.some(k => kinds.includes(k))).map(s => designMetrics(s.payload()));
  assert.ok(median(m.map(x => x.flatFacade)) <= 0.55);
  assert.ok(median(m.map(x => x.detail)) >= 0.25);
});

test('Mischung ist deterministisch und folgt den Gewichten', () => {
  const mix = [['stone_bricks', 8], ['mossy_stone_bricks', 2]];
  const counts = { stone_bricks: 0, mossy_stone_bricks: 0 };
  for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) counts[pick(mix, x, 0, z, 5)]++;
  assert.equal(pick(mix, 3, 4, 5, 5), pick(mix, 3, 4, 5, 5));
  const share = counts.mossy_stone_bricks / 1600;
  assert.ok(share > 0.12 && share < 0.28, `Anteil bemoost ${share}`);
});

const build = () => {
  const p = new Plot([13, 2, 13]);
  const info = house(p, LOOKS.fachwerk, { at: { x0: 2, z0: 2, x1: 10, z1: 10 }, storeys: [{ h: 4, kind: 'stein' }, { h: 4, kind: 'fachwerk' }], jetty: 1,
    roof: { kind: 'sattel', ridge: 'z', overhang: 1, pitch: 'steil' }, flowerBoxes: true, chimney: { x: 9, z: 6 }, seed: 1 });
  return { payload: p.payload(), info };
};

test('house(): gleiche Eingabe, gleiches Haus; Fenster mit Läden, Sturz und Blumenkasten; Dach mit Traufkasten', () => {
  const a = build(), b = build();
  assert.deepEqual(a.payload, b.payload);
  const ids = a.payload.cells.filter(c => c.kind === 'block').map(c => a.payload.palette[c.paletteIndex]);
  assert.ok(ids.some(s => s.id.endsWith('_trapdoor') && s.properties.open === 'true'), 'Fensterläden');
  assert.ok(ids.some(s => s.id === 'minecraft:moss_block'), 'Blumenkasten');
  assert.ok(ids.filter(s => s.id.endsWith('_stairs') && s.properties.half === 'top').length >= 20, 'Sturz, Knaggen, Traufkasten');
  assert.ok(ids.some(s => s.id === 'minecraft:campfire'), 'Schornstein raucht');
  assert.equal(a.info.floors.length, 2);
  assert.ok(a.info.roofTop > a.info.eaves + 3, 'steiles Dach');
  const m = designMetrics(a.payload);
  assert.ok(m.detail >= 0.2 && m.upsideDown >= 0.2 && m.flatFacade <= 0.5, JSON.stringify(m));
});

test('pitchedRoof(): Überstand an allen Seiten, Giebel geschlossen', () => {
  const p = new Plot([11, 2, 11]);
  for (let x = 1; x <= 9; x++) for (let z = 1; z <= 9; z++) p.set(x, 0, z, 'stone_bricks');
  const top = pitchedRoof(p, LOOKS.fachwerk, { walls: { x0: 1, z0: 1, x1: 9, z1: 9 }, y: 1, kind: 'sattel', ridge: 'z', overhang: 1 });
  assert.ok(top > 4);
  const at = (x, y, z) => p.get(x, y, z)?.id ?? 'minecraft:air';
  assert.match(at(0, 1, 5), /stairs/, 'Traufe steht über');
  for (let y = 2; y < top - 1; y++) assert.notEqual(at(5, y, 1), 'minecraft:air', `Giebel geschlossen auf ${y}`);
});

test('Veredelung: Grenzen bleiben, kein Block verschwindet, Luft bleibt Luft', () => {
  const spec = BUILDING_SPECS.find(s => s.id === 'bld_villa');
  const p = new Plot([7, 6, 7]);
  p.fill(0, 0, 0, 6, 0, 6, 'stone_bricks');
  p.room(0, 0, 6, 6, 1, 3, 'stone_bricks');
  p.set(3, 2, 0, 'glass_pane'); p.air(3, 2, 3);
  const raw = p.payload();
  const out = refinePayload(raw, { seed: 3, weather: true, windows: true });
  assert.deepEqual(out.bounds, raw.bounds);
  const key = c => c.position.join(',');
  const after = new Map(out.cells.map(c => [key(c), c]));
  for (const c of raw.cells) {
    const a = after.get(key(c));
    assert.ok(a, `Zelle ${key(c)} bleibt`);
    assert.equal(a.kind, c.kind);
  }
  assert.ok(out.palette.some(s => /mossy|cracked/.test(s.id)), 'Verwitterung');
  assert.ok(refineOptionsFor(spec.id, spec.facets)?.weather === false, 'moderne Bauten verwittern nicht');
});

// ------------------------------------------------------------ LIB-05 Runde 2
import { facade, machicolations, dressRoom, innerRibs } from '../../../dist/domain/src/catalog/build/facade.js';

test('Runde 2: Stadt mit Relief, Meisterstücke reich gegliedert', () => {
  const stadt = BUILDING_SPECS.filter(s => s.id.startsWith('bld_stadt_') && ['oeffentlich', 'wohnhaus', 'handel'].includes(s.facets.kategorie[0])).map(s => designMetrics(s.payload()));
  assert.ok(median(stadt.map(x => x.flatFacade)) <= 0.62, `Stadt Hauptebene ${median(stadt.map(x => x.flatFacade))}`);
  const meister = BUILDING_SPECS.filter(s => s.id.startsWith('bld_meister_'));
  assert.ok(meister.length >= 7, `${meister.length} Meisterstücke`);
  for (const s of meister) {
    const m = designMetrics(s.payload());
    assert.ok(m.flatFacade <= 0.5 && m.materials >= 30 && m.upsideDown >= 0.2, `${s.id} ${JSON.stringify(m)}`);
  }
});

test('facade(): Lisenen neben Fenstern, Fensterbank, Gesims; nur freie Zellen, Entwurf bleibt', () => {
  const p = new Plot([9, 2, 9]);
  p.room(1, 1, 7, 7, 1, 4, 'bricks');
  p.set(3, 2, 1, 'glass_pane'); p.set(3, 3, 1, 'glass_pane');
  p.set(1, 2, 0, 'oak_fence'); // already used cell in front of the wall
  const before = p.payload();
  facade(p, { pilaster: 'stone_bricks', band: 'stone_brick_stairs', bandSlab: 'stone_brick_slab' }, { at: { x0: 1, z0: 1, x1: 7, z1: 7 }, y0: 1, y1: 4, bands: [3], crown: 5, sides: ['north'] });
  const out = p.payload();
  const at = (x, y, z) => { const c = out.cells.find(c => c.position.join() === [x, y, z].join()); return c && out.palette[c.paletteIndex]; };
  assert.equal(at(2, 2, 0).id, 'minecraft:stone_bricks', 'Lisene links vom Fenster');
  assert.equal(at(4, 2, 0).id, 'minecraft:stone_bricks', 'Lisene rechts vom Fenster');
  assert.equal(at(3, 1, 0).properties.half, 'top', 'Fensterbank');
  assert.equal(at(5, 3, 0).id, 'minecraft:stone_brick_stairs', 'Geschossgesims');
  assert.equal(at(1, 2, 0).id, 'minecraft:oak_fence', 'belegte Zelle bleibt');
  for (const c of before.cells) if (c.kind === 'block') assert.equal(at(...c.position).id, before.palette[c.paletteIndex].id, `Zelle ${c.position}`);
});

test('machicolations(): Konsolen, Brüstung und Zinnen außen um den Turm', () => {
  const p = new Plot([7, 2, 7]);
  p.room(1, 1, 5, 5, 1, 6, 'stone_bricks');
  machicolations(p, { x0: 1, z0: 1, x1: 5, z1: 5 }, 6, 'stone_brick_stairs', [['stone_bricks', 1]], 'stone_brick_slab');
  const out = p.payload();
  const at = (x, y, z) => { const c = out.cells.find(c => c.position.join() === [x, y, z].join()); return c && out.palette[c.paletteIndex]; };
  assert.equal(at(3, 6, 0).properties.half, 'top');
  assert.equal(at(3, 7, 0).id, 'minecraft:stone_bricks');
  assert.equal(at(0, 6, 0).id, 'minecraft:stone_brick_slab');
});

test('dressRoom(): Pfosten, Sockelleiste, Deckenprofil und Bodenrand nur an geschlossenen Wänden', async () => {
  const { roomShell } = await import('../../../dist/domain/src/catalog/build/furnish.js');
  const p = new Plot([7, 6, 7]);
  roomShell(p, 7, 7, 4, 'oak_planks', 'cobblestone', ['south', 'east'], null);
  p.set(1, 1, 1, 'barrel');
  dressRoom(p, 7, 7, 4, 'spruce', { posts: 3, border: 'spruce_planks' });
  const out = p.payload();
  const at = (x, y, z) => { const c = out.cells.find(c => c.kind === 'block' && c.position.join() === [x, y, z].join()); return c && out.palette[c.paletteIndex]; };
  assert.equal(at(3, 2, 0).id, 'minecraft:spruce_log', 'Pfosten in der Nordwand');
  assert.equal(at(2, 1, 0).id, 'minecraft:stripped_spruce_log', 'Sockelleiste');
  assert.equal(at(2, 4, 1).id, 'minecraft:spruce_stairs'); assert.equal(at(2, 4, 1).properties.half, 'top', 'Deckenprofil');
  assert.equal(at(1, 1, 1).id, 'minecraft:barrel', 'Möbel bleiben');
  assert.equal(at(2, 0, 1).id, 'minecraft:spruce_planks', 'Bodenrand');
  assert.equal(at(3, 0, 3).id, 'minecraft:oak_planks', 'Bodenmitte bleibt');
  assert.equal(at(3, 2, 6), undefined, 'offene Südseite bleibt offen');
});

test('innerRibs(): Wandrippen nur in freien Spalten vor geschlossener Wand', () => {
  const p = new Plot([9, 6, 9]);
  p.room(0, 0, 8, 8, 1, 4, 'stone_bricks');
  p.set(3, 1, 1, 'chest');
  p.fill(1, 1, 8, 1, 2, 8, null);
  const n = innerRibs(p, 0, 0, 8, 8, 1, 4, 'polished_deepslate', 3, 'chiseled_deepslate');
  const out = p.payload();
  const at = (x, y, z) => { const c = out.cells.find(c => c.kind === 'block' && c.position.join() === [x, y, z].join()); return c && out.palette[c.paletteIndex].id; };
  assert.equal(at(3, 1, 1), 'minecraft:chest', 'Truhe bleibt, keine Rippe');
  assert.equal(at(6, 1, 7), 'minecraft:chiseled_deepslate'); assert.equal(at(6, 4, 7), 'minecraft:polished_deepslate');
  assert.equal(at(1, 2, 3), 'minecraft:polished_deepslate');
  assert.ok(n >= 5 && n <= 7, `${n} Rippen`);
});

test('Runde 3: Interieur-Räume vertäfelt, Hallen mit Rippen', () => {
  const room = BUILDING_SPECS.find(s => s.id === 'bld_raum_bauernkueche').payload();
  assert.ok(room.palette.some(s => s.id === 'minecraft:stripped_spruce_log'), 'Sockelleiste in der Bauernküche');
  const hall = BUILDING_SPECS.find(s => s.id === 'bld_untergrund_zwergenhalle').payload();
  assert.ok(hall.palette.some(s => s.id === 'minecraft:chiseled_deepslate'), 'Rippenfüße in der Zwergenhalle');
});
