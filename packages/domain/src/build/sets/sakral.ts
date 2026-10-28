import { Plot, axis, candle, door, facing, gableRoof, grass, hipRoof, lantern, lectern, noise, roundTree, stairs } from '../plot.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/** Sakral & Magie: cathedral, temples, shrines, stone circle, enchanting tower, graveyard. */

function kathedrale() {
  const p = new Plot([15, 10, 27]);
  p.fill(0, 0, 0, 14, 0, 26, 'stone_bricks'); p.fill(3, 0, 1, 11, 0, 25, 'polished_andesite');
  // nave high, aisles low
  p.room(3, 4, 11, 26, 1, 12, 'stone_bricks'); p.room(0, 6, 3, 24, 1, 5, 'stone_bricks'); p.room(11, 6, 14, 24, 1, 5, 'stone_bricks');
  p.fill(3, 1, 7, 3, 5, 23, null); p.fill(11, 1, 7, 11, 5, 23, null);
  for (let z = 7; z <= 23; z += 4) { p.fill(3, 1, z, 3, 12, z, 'stone_bricks'); p.fill(11, 1, z, 11, 12, z, 'stone_bricks'); }
  for (let z = 9; z <= 21; z += 4) { for (let y = 8; y <= 10; y++) { p.set(3, y, z, 'purple_stained_glass'); p.set(11, y, z, 'blue_stained_glass'); } for (let y = 2; y <= 4; y++) { p.set(0, y, z, 'yellow_stained_glass'); p.set(14, y, z, 'yellow_stained_glass'); } }
  gableRoof(p, 3, 11, 4, 26, 13, 'deepslate_tile_stairs', 'stone_bricks', 'deepslate_tile_slab');
  for (let z = 6; z <= 24; z++) { p.set(0, 6, z, 'deepslate_tile_stairs', stairs('east')); p.set(1, 7, z, 'deepslate_tile_stairs', stairs('east')); p.set(2, 8, z, 'deepslate_tile_stairs', stairs('east'));
    p.set(14, 6, z, 'deepslate_tile_stairs', stairs('west')); p.set(13, 7, z, 'deepslate_tile_stairs', stairs('west')); p.set(12, 8, z, 'deepslate_tile_stairs', stairs('west')); }
  // west front with two towers
  for (const x0 of [2, 9]) { p.room(x0, 0, x0 + 3, 4, 1, 19, 'stone_bricks'); hipRoof(p, x0, x0 + 3, 0, 4, 20, 'deepslate_tile_stairs', 'deepslate_tile_slab'); for (const y of [8, 14]) p.set(x0 + 1, y, 0, 'iron_bars'); }
  p.fill(6, 1, 4, 8, 4, 4, null); p.set(6, 1, 4, 'dark_oak_planks'); p.set(8, 1, 4, 'dark_oak_planks'); door(p, 7, 1, 4, 'dark_oak', 'south');
  p.disc(7, 4, 9, 2, 'red_stained_glass'); p.set(7, 9, 4, 'orange_stained_glass');
  p.fill(4, 9, 4, 4, 11, 4, 'stone_bricks'); p.fill(10, 9, 4, 10, 11, 4, 'stone_bricks');
  // interior
  for (let z = 8; z <= 20; z += 2) for (const x of [5, 6, 8, 9]) p.set(x, 1, z, 'spruce_stairs', stairs('south'));
  p.fill(5, 1, 23, 9, 1, 25, 'polished_diorite'); p.fill(6, 2, 24, 8, 2, 24, 'quartz_block'); p.set(7, 2, 23, 'lectern', lectern('north'));
  for (const x of [6, 8]) p.set(x, 3, 24, 'candle', candle(3, true));
  for (let z = 9; z <= 21; z += 6) p.set(7, 11, z, 'lantern', lantern(true));
  return p.payload();
}

function antikerTempel() {
  const p = new Plot([13, 12, 19]);
  for (let i = 0; i < 3; i++) p.fill(i, i, i, 12 - i, i, 18 - i, i === 2 ? 'smooth_quartz' : 'quartz_bricks');
  for (let x = 3; x <= 9; x += 2) for (const z of [3, 15]) p.fill(x, 3, z, x, 8, z, 'quartz_pillar', axis('y'));
  for (let z = 5; z <= 13; z += 2) for (const x of [3, 9]) p.fill(x, 3, z, x, 8, z, 'quartz_pillar', axis('y'));
  p.room(5, 6, 7, 12, 3, 8, 'smooth_quartz'); p.fill(6, 3, 6, 6, 5, 6, null);
  p.fill(2, 9, 2, 10, 9, 16, 'chiseled_quartz_block');
  gableRoof(p, 2, 10, 2, 16, 10, 'quartz_stairs', 'smooth_quartz', 'smooth_quartz_slab');
  p.set(6, 3, 11, 'gold_block'); p.set(6, 4, 11, 'lantern', lantern());
  for (const [x, z] of [[1, 1], [11, 1], [1, 17], [11, 17]] as const) p.set(x, 2, z, 'lantern', lantern());
  return p.payload();
}

function schrein() {
  const p = new Plot([7, 8, 7]);
  p.fill(0, 0, 0, 6, 0, 6, 'stone_bricks'); p.fill(1, 1, 1, 5, 1, 5, 'mossy_stone_bricks');
  for (const [x, z] of [[1, 1], [5, 1], [1, 5], [5, 5]] as const) p.fill(x, 2, z, x, 4, z, 'stripped_dark_oak_log', axis('y'));
  hipRoof(p, 0, 6, 0, 6, 5, 'dark_oak_stairs', 'dark_oak_slab');
  p.set(3, 2, 4, 'chiseled_stone_bricks'); p.set(3, 3, 4, 'candle', candle(4, true)); p.set(3, 4, 3, 'lantern', lantern(true));
  p.set(2, 2, 4, 'flower_pot'); p.set(4, 2, 4, 'potted_red_tulip');
  for (let x = 2; x <= 4; x++) p.set(x, 1, 0, 'stone_brick_stairs', stairs('south'));
  return p.payload();
}

function torii() {
  const p = new Plot([9, 8, 3]);
  for (const x of [1, 7]) { p.set(x, 0, 1, 'stone_bricks'); p.fill(x, 1, 1, x, 5, 1, 'crimson_stem', axis('y')); }
  p.fill(1, 4, 1, 7, 4, 1, 'red_concrete');
  p.fill(1, 6, 1, 7, 6, 1, 'black_concrete'); p.set(4, 5, 1, 'red_concrete');
  p.set(0, 6, 1, 'polished_blackstone_stairs', stairs('east')); p.set(8, 6, 1, 'polished_blackstone_stairs', stairs('west'));
  return p.payload();
}

function wuestenpyramide() {
  const p = new Plot([21, 12, 21]);
  for (let i = 0; i <= 10; i++) p.ring(i, i, 20 - i, 20 - i, i, i % 3 === 2 ? 'cut_sandstone' : 'sandstone');
  for (let i = 0; i < 10; i++) p.fill(i + 1, i, i + 1, 19 - i, i, 19 - i, null);
  p.fill(0, 0, 0, 20, 0, 20, 'sandstone'); p.fill(4, 1, 4, 16, 1, 16, null);
  p.fill(9, 1, 0, 11, 3, 3, null);
  for (let x = 8; x <= 12; x++) for (let z = 8; z <= 12; z++) p.set(x, 0, z, (x + z) % 2 ? 'orange_terracotta' : 'blue_terracotta');
  p.set(10, 0, 10, 'blue_terracotta');
  p.set(10, 1, 14, 'chest', { facing: 'north', type: 'single', waterlogged: 'false' });
  for (const [x, z] of [[6, 6], [14, 6], [6, 14], [14, 14]] as const) p.set(x, 1, z, 'lantern', lantern());
  return p.payload();
}

function steinkreis() {
  const p = new Plot([13, 6, 13]);
  for (let x = 0; x < 13; x++) for (let z = 0; z < 13; z++) p.set(x, 0, z, 'grass_block', grass());
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, x = Math.round(6 + Math.cos(a) * 5), z = Math.round(6 + Math.sin(a) * 5);
    const h = 2 + (i % 3 === 0 ? 1 : 0);
    p.fill(x, 1, z, x, h, z, noise(x, 0, z) > 0.5 ? 'mossy_cobblestone' : 'stone');
  }
  p.fill(6, 1, 6, 6, 1, 6, 'chiseled_stone_bricks'); p.set(6, 2, 6, 'candle', candle(3, true));
  return p.payload();
}

function zaubererturm() {
  const p = new Plot([11, 26, 11]);
  p.disc(5, 5, 0, 5, 'deepslate_bricks');
  p.tube(5, 5, 4, 1, 16, 'deepslate_bricks');
  for (const y of [6, 11]) p.disc(5, 5, y, 3, 'dark_oak_planks');
  // enchanting room on the ground floor: 15 bookshelves around a table
  p.ring(3, 3, 7, 7, 1, 'bookshelf'); p.air(5, 1, 3);
  p.set(5, 1, 5, 'enchanting_table');
  p.fill(5, 1, 1, 5, 2, 1, null); door(p, 5, 1, 1, 'dark_oak', 'south');
  for (let y = 1; y <= 16; y++) p.set(8, y, 5, 'ladder', { facing: 'west', waterlogged: 'false' });
  for (const y of [4, 9, 14]) { p.set(1, y, 5, 'purple_stained_glass'); p.set(9, y, 5, 'purple_stained_glass'); p.set(5, y, 9, 'purple_stained_glass'); }
  p.disc(5, 5, 17, 5, 'deepslate_tiles'); p.set(8, 17, 5, 'ladder', { facing: 'west', waterlogged: 'false' });
  for (let i = 0; i <= 5; i++) p.disc(5, 5, 18 + i, 4.5 - i * 0.85, 'purple_concrete', {}, true);
  p.set(5, 24, 5, 'amethyst_block'); p.set(5, 25, 5, 'end_rod', facing('up'));
  p.set(4, 7, 4, 'brewing_stand', { has_bottle_0: 'false', has_bottle_1: 'false', has_bottle_2: 'false' }); p.set(6, 7, 6, 'cauldron'); p.set(5, 12, 7, 'lectern', lectern('north'));
  for (const y of [5, 10, 15]) p.set(5, y, 5, 'lantern', lantern(true));
  return p.payload();
}

function friedhof() {
  const p = new Plot([13, 5, 11]);
  for (let x = 0; x < 13; x++) for (let z = 0; z < 11; z++) p.set(x, 0, z, 'grass_block', grass());
  for (let x = 0; x < 13; x++) for (const z of [0, 10]) p.set(x, 1, z, 'cobblestone_wall');
  for (let z = 1; z < 10; z++) for (const x of [0, 12]) p.set(x, 1, z, 'cobblestone_wall');
  p.air(6, 1, 0); p.set(6, 1, 0, 'spruce_fence_gate', { facing: 'south', in_wall: 'true', open: 'false', powered: 'false' });
  for (const x of [2, 5, 8, 11]) for (const z of [3, 7]) { if (x === 11) continue; p.set(x, 1, z, 'mossy_stone_brick_wall'); p.set(x, 0, z + 1, 'coarse_dirt'); }
  roundTree(p, 10, 1, 5, 'dark_oak', 4, 2);
  p.set(1, 1, 1, 'lantern', lantern()); p.set(11, 1, 9, 'lantern', lantern());
  return p.payload();
}

export const SAKRAL_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_kathedrale', name: 'Kathedrale', payload: kathedrale, tags: ['kirche', 'türme', 'buntglas'],
    description: 'Gotische Kathedrale mit hohem Mittelschiff, Seitenschiffen, Doppelturmfassade, Rosette und Buntglasfenstern.',
    facets: { kategorie: ['sakral'], stil: ['mittelalterlich', 'klassisch'], biom: ['ueberall'], funktion: ['versammlung', 'orientierung'] } },
  { id: 'bld_antiker_tempel', name: 'Antiker Tempel', payload: antikerTempel, tags: ['säulen', 'quarz', 'stufen'],
    description: 'Säulentempel aus Quarz auf drei Stufen, mit Cella, goldenem Altar und flachem Giebeldach.',
    facets: { kategorie: ['sakral'], stil: ['antik', 'klassisch'], biom: ['ueberall'], funktion: ['versammlung', 'deko'] } },
  { id: 'bld_schrein', name: 'Schrein', payload: schrein, tags: ['schrein', 'kerzen', 'klein'],
    description: 'Kleiner Schrein mit Walmdach, Kerzenaltar, Blumentöpfen und Stufenzugang.',
    facets: { kategorie: ['sakral'], stil: ['fernoestlich'], biom: ['kirschhain', 'ueberall'], funktion: ['deko'] } },
  { id: 'bld_torii', name: 'Torii', payload: torii, tags: ['tor', 'japan', 'rot'],
    description: 'Rotes Torii-Tor aus Karmesinstämmen und Beton mit geschwungenem schwarzem Querbalken.',
    facets: { kategorie: ['dekoration'], stil: ['fernoestlich'], biom: ['kirschhain', 'ueberall'], funktion: ['deko', 'verbindung'] } },
  { id: 'bld_wuestenpyramide', name: 'Wüstenpyramide', payload: wuestenpyramide, tags: ['pyramide', 'sandstein', 'schatz'],
    description: 'Begehbare Sandsteinpyramide mit Eingang, Muster aus Terrakotta und Schatzkammer – eigene Interpretation des Wüstentempels.',
    facets: { kategorie: ['wahrzeichen'], stil: ['wuestenstil', 'antik'], biom: ['wueste', 'badlands'], funktion: ['deko', 'lagern'] }, inspiration: [WIKI('Desert_pyramid', 'Wüstentempel')] },
  { id: 'bld_steinkreis', name: 'Steinkreis', payload: steinkreis, tags: ['menhire', 'kreis', 'ritual'],
    description: 'Zehn bemooste Menhire im Kreis um einen Altarstein mit Kerzen.',
    facets: { kategorie: ['wahrzeichen'], stil: ['antik', 'fantasy'], biom: ['ebene', 'gebirge'], funktion: ['deko', 'orientierung'] } },
  { id: 'bld_zaubererturm', name: 'Zaubererturm', payload: zaubererturm, tags: ['zauberei', 'bücherregale', 'spitzdach'],
    description: 'Runder Tiefenschiefer-Turm: unten ein Verzauberungsraum mit 15 Bücherregalen (Stufe 30), darüber Braukammer und Studierstube, lila Spitzdach mit Endstab.',
    facets: { kategorie: ['magie'], stil: ['fantasy'], biom: ['ueberall'], funktion: ['verzaubern', 'aussicht'] },
    tips: ['15 Bücherregale im Abstand von genau einem Block zum Zaubertisch geben Stufe 30.', 'Zwischen Tisch und Regal darf nur Luft sein – keine Fackeln oder Teppiche.'],
    inspiration: [WIKI('Enchanting_mechanics', 'Verzauberungsmechanik')] },
  { id: 'bld_friedhof', name: 'Friedhof', payload: friedhof, tags: ['gräber', 'grusel', 'mauer'],
    description: 'Kleiner ummauerter Friedhof mit Grabsteinen, Grabhügeln, Schwarzeiche und Laternen.',
    facets: { kategorie: ['sakral'], stil: ['mittelalterlich', 'fantasy'], biom: ['ueberall'], funktion: ['deko'] } },
];
