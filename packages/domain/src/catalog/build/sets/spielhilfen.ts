import { Plot, axis, barrel, candle, chest, door, flatRoof, lantern, lectern, slab, stairs, F } from '../plot.js';
import type { H, Props } from '../plot.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/**
 * Spielhilfen (B12): rooms whose geometry follows a game mechanic exactly –
 * enchanting with 15 bookshelves, a brewing room, a villager trading hall and
 * the four beacon pyramid levels – plus three animal statues and an archery
 * range. Own designs; the mechanics are linked to the Minecraft Wiki.
 */

const brewing = (): Props => ({ has_bottle_0: F, has_bottle_1: F, has_bottle_2: F });
const anvil = (f: H): Props => ({ facing: f });
const grindstone = (f: H): Props => ({ face: 'floor', facing: f });
const facingH = (f: H): Props => ({ facing: f });

/**
 * Enchanting table with exactly 15 bookshelves at distance two (one ring of
 * 16 minus the walkway) and explicit air at distance one, as the game checks
 * it; candles on the shelves, anvil, grindstone and lectern along the walls.
 */
function verzauberungsraum() {
  const p = new Plot([9, 7, 9]);
  p.fill(0, 0, 0, 8, 0, 8, 'deepslate_tiles');
  p.room(0, 0, 8, 8, 1, 4, 'deepslate_bricks');
  for (const [x, z] of [[0, 0], [8, 0], [0, 8], [8, 8]] as const) p.fill(x, 1, z, x, 4, z, 'dark_oak_log', axis('y'));
  p.fill(1, 0, 1, 7, 0, 7, 'dark_oak_planks');
  p.set(4, 1, 4, 'enchanting_table');
  // Distance one: must stay empty, or the shelves behind do not count.
  for (let x = 3; x <= 5; x++) for (let z = 3; z <= 5; z++) if (x !== 4 || z !== 4) { p.air(x, 1, z); p.air(x, 2, z); }
  p.air(4, 2, 4);
  let shelves = 0;
  for (let x = 2; x <= 6; x++) for (let z = 2; z <= 6; z++) {
    if (Math.max(Math.abs(x - 4), Math.abs(z - 4)) !== 2 || (x === 4 && z === 6)) continue;
    p.set(x, 1, z, 'bookshelf'); shelves++;
    if ((x + z) % 2 === 0) p.set(x, 2, z, 'purple_candle', candle(1 + ((x * 3 + z) % 3), true));
  }
  if (shelves !== 15) throw new Error(`Verzauberungsraum: ${shelves} Bücherregale statt 15`);
  door(p, 4, 1, 8, 'dark_oak', 'north');
  p.set(1, 1, 7, 'anvil', anvil('east')); p.set(7, 1, 7, 'grindstone', grindstone('west'));
  p.set(1, 1, 1, 'lectern', lectern('east')); p.set(7, 1, 1, 'chest', chest('west'));
  for (const [x, z] of [[1, 4], [7, 4]] as const) p.set(x, 3, z, 'lantern', lantern());
  flatRoof(p, 0, 8, 0, 8, 5, 'dark_oak_planks', 'deepslate_brick_wall');
  p.set(4, 4, 4, 'lantern', lantern(true));
  for (const z of [3, 5]) { p.set(0, 2, z, 'purple_stained_glass_pane'); p.set(8, 2, z, 'purple_stained_glass_pane'); }
  return p.payload();
}

/** Brewing room: two stands, cauldron, nether wart on soul sand, storage and a fire-resistant blackstone floor. */
function braustube() {
  const p = new Plot([7, 6, 7]);
  p.fill(0, 0, 0, 6, 0, 6, 'polished_blackstone');
  p.room(0, 0, 6, 6, 1, 3, 'nether_bricks');
  p.fill(1, 0, 1, 5, 0, 5, 'polished_blackstone_bricks');
  door(p, 3, 1, 6, 'crimson', 'north');
  p.set(2, 1, 1, 'brewing_stand', brewing()); p.set(4, 1, 1, 'brewing_stand', brewing());
  p.set(3, 1, 1, 'cauldron');
  p.fill(1, 0, 3, 1, 0, 4, 'soul_sand'); p.set(1, 1, 3, 'nether_wart', { age: '3' }); p.set(1, 1, 4, 'nether_wart', { age: '3' });
  p.set(5, 1, 3, 'chest', chest('west')); p.set(5, 1, 4, 'barrel', barrel('west'));
  p.set(5, 1, 5, 'crafting_table');
  for (const x of [2, 4]) p.set(x, 2, 6, 'red_stained_glass_pane');
  p.set(3, 3, 3, 'soul_lantern', lantern(true));
  flatRoof(p, 0, 6, 0, 6, 4, 'nether_bricks', 'nether_brick_fence');
  return p.payload();
}

const WORKSTATIONS: readonly (readonly [string, Props])[] = [
  ['lectern', lectern('south')], ['cartography_table', {}], ['fletching_table', {}], ['smithing_table', {}], ['stonecutter', facingH('south')], ['loom', facingH('south')],
];

/**
 * Villager trading hall with six one-block cells. The workstation in front of
 * each villager is the step; the ceiling one block above it leaves only one
 * free block, so villagers cannot climb out but stay reachable for trading.
 */
function handelshalle() {
  const p = new Plot([13, 6, 6]);
  p.fill(0, 0, 0, 12, 0, 5, 'stone_bricks');
  p.fill(0, 1, 0, 12, 3, 0, 'stone_bricks');
  for (let x = 0; x <= 12; x += 2) p.fill(x, 1, 1, x, 3, 2, 'stone_bricks');
  WORKSTATIONS.forEach(([id, props], i) => {
    const x = 1 + i * 2;
    p.air(x, 1, 1); p.air(x, 2, 1); p.air(x, 2, 2);
    p.set(x, 1, 2, id, props);
    p.set(x, 3, 1, 'glass'); p.set(x, 3, 2, 'stone_brick_slab', slab('top'));
  });
  for (const x of [0, 12]) p.fill(x, 1, 3, x, 3, 5, 'stone_bricks');
  p.fill(1, 1, 3, 11, 3, 5, null);
  p.fill(0, 4, 0, 12, 4, 5, 'spruce_planks');
  for (let x = 0; x <= 12; x++) p.set(x, 5, 0, 'spruce_stairs', stairs('south'));
  for (const x of [3, 9]) p.set(x, 3, 4, 'lantern', lantern(true));
  p.set(6, 1, 5, 'barrel', barrel('up'));
  return p.payload();
}

/** Beacon pyramid of 1–3 levels; level 4 is the existing Leuchtfeuer-Pyramide. */
function leuchtfeuerStufe(levels: 1 | 2 | 3) {
  return () => {
    const n = 2 * levels + 1, p = new Plot([n, levels + 2, n]);
    const ores = ['iron_block', 'gold_block', 'emerald_block'];
    for (let l = 0; l < levels; l++) p.fill(l, l, l, n - 1 - l, l, n - 1 - l, ores[levels - 1 - l]!);
    p.set(levels, levels, levels, 'beacon');
    p.set(levels, levels + 1, levels, 'light_blue_stained_glass');
    return p.payload();
  };
}

function axolotl() {
  const p = new Plot([5, 5, 9]);
  p.fill(1, 0, 1, 3, 1, 6, 'pink_concrete');
  p.fill(1, 2, 2, 3, 2, 5, 'pink_concrete');
  p.fill(0, 0, 2, 0, 0, 2, 'pink_terracotta'); p.fill(4, 0, 2, 4, 0, 2, 'pink_terracotta');
  p.fill(0, 0, 5, 0, 0, 5, 'pink_terracotta'); p.fill(4, 0, 5, 4, 0, 5, 'pink_terracotta');
  // Head at the south end with black eyes and magenta gills.
  p.fill(1, 0, 7, 3, 2, 7, 'pink_concrete'); p.set(1, 1, 8, 'black_concrete'); p.set(3, 1, 8, 'black_concrete');
  for (const [x, y] of [[0, 2], [0, 3], [4, 2], [4, 3], [1, 3], [3, 3]] as const) p.set(x, y, 7, 'magenta_concrete');
  p.fill(2, 1, 0, 2, 2, 0, 'pink_terracotta');
  return p.payload();
}

function biene() {
  const p = new Plot([6, 7, 7]);
  for (let z = 1; z <= 5; z++) p.fill(1, 1, z, 4, 4, z, z % 2 === 0 ? 'black_concrete' : 'yellow_concrete');
  p.fill(1, 1, 6, 4, 4, 6, 'yellow_concrete'); p.set(1, 3, 6, 'black_concrete'); p.set(4, 3, 6, 'black_concrete');
  p.set(2, 2, 6, 'brown_concrete'); p.set(3, 2, 6, 'brown_concrete');
  p.set(2, 2, 0, 'black_concrete');
  for (const x of [0, 5]) p.fill(x, 5, 2, x, 5, 4, 'white_stained_glass');
  p.fill(1, 5, 2, 1, 5, 4, 'white_stained_glass'); p.fill(4, 5, 2, 4, 5, 4, 'white_stained_glass');
  for (const [x, z] of [[1, 2], [4, 2], [1, 4], [4, 4]] as const) p.set(x, 0, z, 'black_concrete');
  p.fill(2, 5, 6, 2, 6, 6, 'black_concrete'); p.fill(3, 5, 6, 3, 6, 6, 'black_concrete');
  return p.payload();
}

function schwein() {
  const p = new Plot([6, 7, 9]);
  for (const [x, z] of [[1, 1], [4, 1], [1, 5], [4, 5]] as const) p.fill(x, 0, z, x, 1, z, 'pink_terracotta');
  p.fill(1, 2, 1, 4, 4, 6, 'pink_concrete');
  p.fill(1, 2, 7, 4, 5, 8, 'pink_concrete');
  p.set(2, 3, 8, 'pink_terracotta'); p.set(3, 3, 8, 'pink_terracotta');
  p.set(1, 4, 8, 'black_concrete'); p.set(4, 4, 8, 'black_concrete');
  p.set(2, 4, 0, 'pink_terracotta');
  return p.payload();
}

/** Archery range: three lanes of 9 blocks with targets on hay bales, a shooting line and a weapon rack. */
function schiessstand() {
  const p = new Plot([9, 5, 12]);
  p.fill(0, 0, 0, 8, 0, 11, 'grass_block', { snowy: F });
  for (const x of [1, 4, 7]) p.fill(x, 0, 1, x, 0, 10, 'dirt_path');
  p.fill(0, 0, 1, 8, 0, 1, 'spruce_planks');
  for (const x of [1, 4, 7]) { p.set(x, 1, 10, 'hay_block', axis('y')); p.set(x, 2, 10, 'target', { power: '0' }); }
  for (let z = 2; z <= 10; z++) { p.set(0, 1, z, 'spruce_fence'); p.set(8, 1, z, 'spruce_fence'); }
  for (const x of [2, 3, 5, 6]) p.set(x, 1, 11, 'spruce_fence');
  p.set(0, 1, 0, 'barrel', barrel('up')); p.set(8, 1, 0, 'fletching_table');
  p.set(2, 1, 0, 'spruce_trapdoor', { facing: 'south', half: 'bottom', open: F, powered: F, waterlogged: F });
  for (const x of [0, 8]) p.set(x, 2, 2, 'lantern', lantern());
  p.set(4, 1, 0, 'chest', chest('south'));
  return p.payload();
}

const BEACON_TIPS = ['Jede volle Stufe darunter erweitert Reichweite und Wirkungen; Eisen, Gold, Smaragd und Diamant lassen sich beliebig mischen.', 'Über dem Leuchtfeuer darf nur Durchsichtiges liegen, sonst bleibt der Strahl aus.'];

export const SPIELHILFEN_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_verzauberungsraum', name: 'Verzauberungsraum', payload: verzauberungsraum, tags: ['verzauberung', 'bücherregale', 'stufe-30'],
    description: 'Zaubertisch mit genau 15 Bücherregalen im Abstand von zwei Blöcken für Stufe-30-Verzauberungen, dazu Amboss, Schleifstein, Lesepult und Truhe.',
    facets: { kategorie: ['magie'], stil: ['fantasy', 'mittelalterlich'], biom: ['ueberall'], funktion: ['verzaubern', 'handwerk'] },
    tips: ['Zwischen Tisch und Regal muss genau ein Block Luft bleiben; schon ein Teppich oder eine Fackel dort lässt das Regal nicht mehr zählen.', 'Die Kerzen stehen auf den Regalen und stören nicht.'],
    inspiration: [WIKI('Enchanting_Table', 'Zaubertisch')] },
  { id: 'bld_braustube', name: 'Braustube', payload: braustube, tags: ['tränke', 'netherwarze', 'brauen'],
    description: 'Netherziegel-Stube mit zwei Brauständen, Kessel, Netherwarzenbeet auf Seelensand, Truhe und Fass.',
    facets: { kategorie: ['magie'], stil: ['nether', 'fantasy'], biom: ['ueberall', 'nether'], funktion: ['handwerk'] },
    tips: ['Netherwarzen wachsen auch in der Oberwelt, aber nur auf Seelensand.', 'Lohenpulver als Brennstoff in den Braustand legen.'],
    inspiration: [WIKI('Brewing', 'Brauen')] },
  { id: 'bld_handelshalle', name: 'Handelshalle', payload: handelshalle, tags: ['dorfbewohner', 'handel', 'zellen'],
    description: 'Sechs Handelszellen mit je einem Arbeitsblock als Stufe; die Decke direkt darüber hält die Dorfbewohner in ihrer Zelle, gehandelt wird über den Arbeitsblock.',
    facets: { kategorie: ['handel'], stil: ['mittelalterlich', 'rustikal'], biom: ['ueberall'], funktion: ['handelsplatz', 'handel'] },
    tips: ['Dorfbewohner brauchen ihren Arbeitsblock in Reichweite, um Angebote aufzufüllen.', 'Zum Einsetzen die Zelle vorübergehend nach oben öffnen.'],
    inspiration: [WIKI('Villager', 'Dorfbewohner')] },
  ...([1, 2, 3] as const).map((n): BuildingSpec => ({
    id: `bld_leuchtfeuer_stufe${n}`, name: `Leuchtfeuer Stufe ${n}`, payload: leuchtfeuerStufe(n), tags: ['beacon', 'effekte'],
    description: `Leuchtfeuer auf einer ${n}-stufigen Pyramide (${(2 * n + 1)}×${(2 * n + 1)} unten). ${n === 1 ? 'Eine Wirkung, 20 Blöcke Reichweite.' : n === 2 ? 'Mehr Reichweite (30 Blöcke) und weitere Wirkungen.' : 'Stärke wird wählbar, 40 Blöcke Reichweite.'}`,
    facets: { kategorie: ['wahrzeichen'], stil: ['technisch'], biom: ['ueberall'], funktion: ['orientierung', 'ressourcen'] },
    family: { id: 'leuchtfeuer', label: 'Leuchtfeuer', variant: `Stufe ${n}` }, tips: BEACON_TIPS, inspiration: [WIKI('Beacon', 'Leuchtfeuer')],
  })),
  { id: 'bld_statue_axolotl', name: 'Axolotl-Statue', payload: axolotl, tags: ['statue', 'mob', 'axolotl'],
    description: 'Liegender Axolotl aus rosa Beton mit magentafarbenen Kiemen.',
    facets: { kategorie: ['statue'], stil: ['fantasy'], biom: ['ueberall', 'hoehle'], funktion: ['deko'] } },
  { id: 'bld_statue_biene', name: 'Bienen-Statue', payload: biene, tags: ['statue', 'mob', 'biene'],
    description: 'Gestreifte Biene aus gelbem und schwarzem Beton mit Glasflügeln.',
    facets: { kategorie: ['statue'], stil: ['fantasy'], biom: ['ueberall', 'ebene'], funktion: ['deko'] } },
  { id: 'bld_statue_schwein', name: 'Schweine-Statue', payload: schwein, tags: ['statue', 'mob', 'schwein'],
    description: 'Schwein in groben Proportionen aus rosa Beton und Keramik.',
    facets: { kategorie: ['statue'], stil: ['fantasy', 'rustikal'], biom: ['ueberall'], funktion: ['deko'] } },
  { id: 'bld_schiessstand', name: 'Schießstand', payload: schiessstand, tags: ['bogen', 'zielscheibe', 'training'],
    description: 'Drei Bahnen mit Zielblöcken auf Heuballen, Schusslinie aus Holz, Pfeilmacher-Tisch und Truhe.',
    facets: { kategorie: ['dekoration'], stil: ['rustikal', 'mittelalterlich'], biom: ['ebene', 'wald', 'ueberall'], funktion: ['unterhaltung'] },
    tips: ['Der Zielblock gibt je nach Treffergenauigkeit ein Redstone-Signal aus – daran lässt sich eine Anzeige anschließen.'],
    inspiration: [WIKI('Target', 'Zielblock')], assumed: ['minecraft:dirt'] },
];
