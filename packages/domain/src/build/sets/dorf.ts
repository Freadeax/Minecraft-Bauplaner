import { Plot, axis, barrel, bed, door, facing, furnace, gableRoof, gableRoofX, grass, hipRoof, lantern, lectern, slab, stairs, trapdoor, water, F, T } from '../plot.js';
import type { Props } from '../plot.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/** Dorf: one workshop per villager profession, market stalls and the buildings of a village centre. */

const pane = { east: F, north: F, south: F, waterlogged: F, west: F };

interface Profession {
  readonly key: string; readonly label: string; readonly job: string; readonly station: string; readonly stationProps?: Props;
  readonly wood: string; readonly roof: string; readonly wall: string; readonly extra: (p: Plot) => void; readonly note: string;
}
const PROFESSIONS: readonly Profession[] = [
  { key: 'bibliothekar', label: 'Bibliothek', job: 'Bibliothekar', station: 'lectern', stationProps: lectern('south'), wood: 'oak', roof: 'dark_oak', wall: 'white_terracotta',
    extra: p => { p.fill(1, 1, 5, 5, 3, 5, 'bookshelf'); p.set(1, 1, 3, 'bookshelf'); p.set(5, 1, 3, 'bookshelf'); }, note: 'Verzauberte Bücher handeln – Mending ist der begehrteste Tausch.' },
  { key: 'kartograf', label: 'Kartenzeichnerei', job: 'Kartograf', station: 'cartography_table', wood: 'birch', roof: 'spruce', wall: 'birch_planks',
    extra: p => { p.set(1, 1, 5, 'chest', { facing: 'north', type: 'single', waterlogged: F }); p.set(5, 2, 5, 'white_wool'); }, note: 'Verkauft Erkundungskarten zu Ozeanmonumenten und Waldanwesen.' },
  { key: 'pfeilmacher', label: 'Pfeilmacherei', job: 'Pfeilmacher', station: 'fletching_table', wood: 'spruce', roof: 'spruce', wall: 'spruce_planks',
    extra: p => { p.set(1, 1, 5, 'hay_block', axis('y')); p.set(5, 1, 5, 'barrel', barrel('up')); }, note: 'Kauft Stöcke – mit einer Baumfarm eine verlässliche Smaragdquelle.' },
  { key: 'steinmetz', label: 'Steinmetzhütte', job: 'Steinmetz', station: 'stonecutter', stationProps: facing('south'), wood: 'oak', roof: 'stone_brick', wall: 'stone_bricks',
    extra: p => { p.set(1, 1, 5, 'chiseled_stone_bricks'); p.set(5, 1, 5, 'polished_andesite'); p.set(5, 2, 5, 'polished_granite'); }, note: 'Kauft Ton und Stein, verkauft Quarz und glasierte Keramik.' },
  { key: 'schaefer', label: 'Schäferei', job: 'Schäfer', station: 'loom', stationProps: facing('south'), wood: 'oak', roof: 'birch', wall: 'oak_planks',
    extra: p => { for (const [x, c] of [[1, 'white'], [2, 'red'], [4, 'yellow'], [5, 'blue']] as const) p.set(x, 1, 5, `${c}_wool`); }, note: 'Kauft Wolle in allen Farben, verkauft Banner und Gemälde.' },
  { key: 'gerber', label: 'Gerberei', job: 'Gerber', station: 'water_cauldron', stationProps: { level: '3' }, wood: 'acacia', roof: 'acacia', wall: 'acacia_planks',
    extra: p => { p.set(1, 1, 5, 'barrel', barrel('up')); p.set(5, 1, 5, 'brown_carpet'); p.set(4, 1, 5, 'brown_carpet'); }, note: 'Verkauft Lederrüstung und Sattel.' },
  { key: 'metzger', label: 'Metzgerei', job: 'Metzger', station: 'smoker', stationProps: furnace('south'), wood: 'spruce', roof: 'dark_oak', wall: 'smooth_stone',
    extra: p => { p.set(1, 1, 5, 'barrel', barrel('up')); p.set(5, 1, 5, 'campfire', { facing: 'north', lit: T, signal_fire: F, waterlogged: F }); }, note: 'Kauft Kohle, Hühner und Kaninchen, verkauft Gebratenes.' },
  { key: 'fischer', label: 'Fischerei', job: 'Fischer', station: 'barrel', stationProps: barrel('up'), wood: 'oak', roof: 'spruce', wall: 'oak_planks',
    extra: p => { p.set(1, 1, 5, 'barrel', barrel('north')); p.set(5, 1, 5, 'barrel', barrel('north')); p.set(5, 2, 5, 'barrel', barrel('up')); }, note: 'Kauft Fisch und Kohle – ideal neben einer Angelstelle.' },
  { key: 'werkzeugschmied', label: 'Werkzeugschmiede', job: 'Werkzeugschmied', station: 'smithing_table', wood: 'oak', roof: 'stone_brick', wall: 'cobblestone',
    extra: p => { p.set(1, 1, 5, 'anvil', facing('east')); p.set(5, 1, 5, 'furnace', furnace('north')); }, note: 'Verkauft verzauberte Diamantwerkzeuge auf Meisterstufe.' },
  { key: 'waffenschmied', label: 'Waffenschmiede', job: 'Waffenschmied', station: 'grindstone', stationProps: { face: 'floor', facing: 'south' }, wood: 'dark_oak', roof: 'dark_oak', wall: 'cobblestone',
    extra: p => { p.set(1, 1, 5, 'anvil', facing('east')); p.set(5, 1, 5, 'blast_furnace', furnace('north')); }, note: 'Verkauft verzauberte Äxte und Schwerter.' },
  { key: 'ruestungsschmied', label: 'Rüstungsschmiede', job: 'Rüstungsschmied', station: 'blast_furnace', stationProps: furnace('south'), wood: 'spruce', roof: 'deepslate_tile', wall: 'stone_bricks',
    extra: p => { p.set(1, 1, 5, 'anvil', facing('east')); p.set(5, 1, 5, 'lava_cauldron'); }, note: 'Verkauft Diamantrüstung; Kauf von Eisen hebt die Stufe schnell.' },
  { key: 'bauer', label: 'Bauernhütte', job: 'Bauer', station: 'composter', wood: 'oak', roof: 'oak', wall: 'oak_planks',
    extra: p => { p.set(1, 1, 5, 'hay_block', axis('y')); p.set(5, 1, 5, 'barrel', barrel('up')); }, note: 'Kauft Weizen, Kartoffeln, Karotten, Rote Bete, Kürbis und Melonen.' },
];

/** 7×7 workshop on a cobblestone base, open front with the job block at the door. */
function werkstatt(pr: Profession) {
  return () => {
    const p = new Plot([7, 8, 8]), w = pr.wood;
    p.fill(0, 0, 0, 6, 0, 6, 'cobblestone'); p.fill(1, 0, 1, 5, 0, 5, `${w}_planks`);
    p.room(0, 0, 6, 6, 1, 3, pr.wall);
    for (const [x, z] of [[0, 0], [6, 0], [0, 6], [6, 6]] as const) p.fill(x, 1, z, x, 3, z, `${w}_log`, axis('y'));
    p.fill(2, 1, 0, 4, 2, 0, null);
    for (const x of [2, 4]) p.set(x, 2, 0, `${w}_trapdoor`, trapdoor('south', 'top', true));
    door(p, 3, 1, 0, w, 'south');
    p.set(0, 2, 3, 'glass_pane', pane); p.set(6, 2, 3, 'glass_pane', pane);
    const stair = `${pr.roof}_stairs`, slb = `${pr.roof}_slab`;
    gableRoof(p, 0, 6, 0, 6, 4, stair, `${w}_planks`, slb);
    for (let x = 0; x <= 6; x++) p.set(x, 3, 7, `${w}_fence`);
    p.fill(0, 0, 7, 6, 0, 7, 'dirt_path');
    p.set(3, 1, 3, pr.station, pr.stationProps ?? {});
    pr.extra(p);
    p.set(3, 3, 3, 'lantern', lantern(true));
    p.set(0, 1, 7, 'lantern', lantern()); p.set(6, 1, 7, 'lantern', lantern());
    p.clear(0, 3, 7); p.clear(6, 3, 7); for (let x = 1; x <= 5; x++) p.clear(x, 3, 7);
    return p.payload();
  };
}

function marktbude(color: string) {
  return () => {
    const p = new Plot([5, 5, 4]);
    for (const [x, z] of [[0, 0], [4, 0], [0, 3], [4, 3]] as const) p.fill(x, 0, z, x, 2, z, 'spruce_fence');
    for (let x = 0; x <= 4; x++) for (let z = 0; z <= 3; z++) p.set(x, 3, z, x % 2 ? 'white_wool' : `${color}_wool`);
    for (let x = 1; x <= 3; x++) p.set(x, 0, 1, 'spruce_slab', slab('top'));
    const goods: Readonly<Record<string, readonly [string, Props]>> = { red: ['melon', {}], blue: ['barrel', barrel('up')], green: ['pumpkin', {}], yellow: ['hay_block', axis('y')] };
    const [good, goodProps] = goods[color]!;
    p.set(1, 1, 1, good, goodProps);
    p.set(3, 1, 1, 'barrel', barrel('up')); p.set(2, 1, 2, 'chest', { facing: 'south', type: 'single', waterlogged: F });
    p.set(2, 2, 2, 'lantern', lantern(true));
    return p.payload();
  };
}

function taverne() {
  const p = new Plot([13, 12, 11]);
  p.fill(0, 0, 0, 12, 0, 10, 'cobblestone'); p.fill(1, 0, 1, 11, 0, 9, 'spruce_planks');
  p.room(0, 0, 12, 10, 1, 3, 'stone_bricks'); p.room(0, 0, 12, 10, 4, 6, 'white_terracotta');
  for (let y = 1; y <= 6; y++) for (const [x, z] of [[0, 0], [12, 0], [0, 10], [12, 10], [6, 0], [6, 10]] as const) p.set(x, y, z, 'dark_oak_log', axis('y'));
  p.fill(1, 4, 1, 11, 4, 9, 'spruce_planks');
  door(p, 6, 1, 0, 'dark_oak', 'south');
  for (const x of [2, 3, 9, 10]) { p.set(x, 2, 0, 'glass_pane', pane); p.set(x, 5, 0, 'glass_pane', pane); p.set(x, 5, 10, 'glass_pane', pane); }
  gableRoofX(p, 0, 12, 0, 10, 7, 'dark_oak_stairs', 'white_terracotta', 'dark_oak_slab');
  // Schankraum: Theke, Fässer, Tische
  p.fill(8, 1, 7, 11, 1, 7, 'spruce_planks'); for (let x = 8; x <= 11; x++) p.set(x, 2, 7, 'spruce_slab', slab());
  for (let x = 8; x <= 11; x++) p.set(x, 1, 9, 'barrel', barrel('south'));
  for (let x = 8; x <= 11; x++) p.set(x, 2, 9, 'barrel', barrel('south'));
  for (const [x, z] of [[2, 3], [2, 7], [5, 5]] as const) { p.set(x, 1, z, 'spruce_fence'); p.set(x, 2, z, 'spruce_pressure_plate', { powered: F }); p.set(x - 1, 1, z, 'spruce_stairs', stairs('east')); p.set(x + 1, 1, z, 'spruce_stairs', stairs('west')); }
  p.fill(1, 1, 9, 1, 4, 9, 'ladder', { facing: 'east', waterlogged: F });
  // Gästezimmer oben
  for (const x of [3, 7, 10]) bed(p, x, 5, 8, 'red', 'south');
  p.set(1, 5, 1, 'chest', { facing: 'east', type: 'single', waterlogged: F });
  p.fill(11, 1, 1, 11, 9, 1, 'cobblestone'); p.set(11, 1, 2, 'campfire', { facing: 'west', lit: T, signal_fire: F, waterlogged: F });
  p.set(11, 10, 1, 'cobblestone_wall');
  for (const [x, z] of [[3, 5], [9, 3], [6, 8]] as const) p.set(x, 3, z, 'lantern', lantern(true));
  return p.payload();
}

function rathaus() {
  const p = new Plot([15, 20, 13]);
  p.fill(0, 0, 0, 14, 0, 12, 'stone_bricks'); p.fill(1, 0, 1, 13, 0, 11, 'polished_andesite');
  for (let x = 4; x <= 10; x++) { p.set(x, 0, 0, 'stone_brick_stairs', stairs('north')); }
  p.room(1, 1, 13, 11, 1, 5, 'stone_bricks'); p.room(1, 1, 13, 11, 6, 9, 'smooth_quartz');
  p.fill(2, 5, 2, 12, 5, 10, 'spruce_planks');
  for (const x of [1, 4, 7, 10, 13]) p.fill(x, 1, 1, x, 9, 1, 'stone_brick_wall');
  for (const x of [1, 4, 10, 13]) p.fill(x, 1, 1, x, 9, 1, 'quartz_pillar', axis('y'));
  p.fill(6, 1, 1, 8, 3, 1, null); door(p, 7, 1, 1, 'spruce', 'south'); p.set(6, 1, 1, 'spruce_planks'); p.set(8, 1, 1, 'spruce_planks');
  for (const x of [2, 3, 5, 9, 11, 12]) { p.set(x, 3, 1, 'glass_pane', pane); p.set(x, 7, 1, 'glass_pane', pane); p.set(x, 8, 1, 'glass_pane', pane); }
  hipRoof(p, 0, 14, 0, 12, 10, 'deepslate_tile_stairs', 'deepslate_tile_slab');
  // Uhrturm in der Mitte
  p.room(5, 4, 9, 8, 10, 16, 'smooth_quartz'); p.set(7, 14, 4, 'black_concrete'); p.set(6, 14, 4, 'gold_block'); p.set(8, 14, 4, 'gold_block'); p.set(7, 15, 4, 'gold_block'); p.set(7, 13, 4, 'gold_block');
  hipRoof(p, 4, 10, 3, 9, 17, 'deepslate_tile_stairs', 'deepslate_tile_slab');
  p.set(7, 19, 6, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  // Ratssaal
  p.fill(4, 1, 8, 10, 1, 8, 'dark_oak_planks'); p.set(7, 1, 9, 'lectern', lectern('north')); p.set(7, 2, 10, 'red_wool');
  for (const x of [4, 5, 9, 10]) for (const z of [4, 6]) p.set(x, 1, z, 'spruce_stairs', stairs('north'));
  p.set(7, 4, 6, 'lantern', lantern(true)); p.set(3, 4, 3, 'lantern', lantern(true)); p.set(11, 4, 3, 'lantern', lantern(true));
  p.fill(12, 1, 10, 12, 5, 10, 'ladder', { facing: 'west', waterlogged: F });
  p.set(2, 6, 10, 'chest', { facing: 'north', type: 'single', waterlogged: F }); p.set(7, 6, 6, 'cartography_table');
  return p.payload();
}

function windmuehle() {
  const p = new Plot([13, 21, 9]);
  p.tube(6, 4, 3, 0, 9, 'cobblestone'); p.disc(6, 4, 0, 2, 'spruce_planks');
  p.tube(6, 4, 2, 10, 13, 'spruce_planks');
  for (let i = 0; i < 3; i++) p.disc(6, 4, 14 + i, 2.6 - i, 'dark_oak_planks', {}, i < 2);
  p.set(6, 17, 4, 'dark_oak_fence');
  p.fill(6, 1, 1, 6, 2, 1, null); door(p, 6, 1, 1, 'spruce', 'south');
  p.set(4, 5, 2, 'glass_pane', pane); p.set(8, 7, 2, 'glass_pane', pane);
  p.fill(6, 12, 6, 6, 12, 8, 'stripped_spruce_log', axis('z'));
  // Flügel als Kreuz in der x-y-Ebene an der Rückseite (Wind von Süden)
  for (let i = 1; i <= 6; i++) {
    p.set(6, 12 + i, 8, 'spruce_fence'); p.set(6, 12 - i, 8, 'spruce_fence'); p.set(6 + i, 12, 8, 'spruce_fence'); p.set(6 - i, 12, 8, 'spruce_fence');
    if (i > 1) { p.set(7, 12 + i, 8, 'white_wool'); p.set(5, 12 - i, 8, 'white_wool'); p.set(6 + i, 11, 8, 'white_wool'); p.set(6 - i, 13, 8, 'white_wool'); }
  }
  p.fill(4, 1, 6, 4, 8, 6, 'ladder', { facing: 'north', waterlogged: F });
  p.set(7, 1, 6, 'barrel', barrel('up')); p.set(8, 1, 4, 'hay_block', axis('y')); p.set(8, 2, 4, 'hay_block', axis('y')); p.set(6, 1, 4, 'composter');
  p.set(6, 9, 4, 'lantern', lantern(true));
  return p.payload();
}

function lagerhaus() {
  const p = new Plot([11, 9, 9]);
  p.fill(0, 0, 0, 10, 0, 8, 'stone_bricks');
  p.room(0, 0, 10, 8, 1, 4, 'spruce_planks');
  for (const x of [0, 5, 10]) for (const z of [0, 8]) p.fill(x, 1, z, x, 4, z, 'spruce_log', axis('y'));
  p.fill(4, 1, 0, 6, 3, 0, null); p.fill(4, 4, 0, 6, 4, 0, 'spruce_log', axis('x'));
  gableRoofX(p, 0, 10, 0, 8, 5, 'spruce_stairs', 'spruce_planks', 'spruce_slab');
  for (let x = 1; x <= 9; x++) { p.set(x, 1, 7, 'chest', { facing: 'north', type: x % 2 ? 'left' : 'right', waterlogged: F }); p.set(x, 2, 7, 'barrel', barrel('north')); }
  p.clear(9, 1, 7); p.set(9, 1, 7, 'barrel', barrel('north'));
  for (let z = 2; z <= 6; z++) { p.set(1, 1, z, 'barrel', barrel('east')); p.set(9, 1, z, 'barrel', barrel('west')); }
  p.set(5, 1, 4, 'crafting_table'); p.set(5, 3, 4, 'lantern', lantern(true));
  for (const x of [3, 7]) p.set(x, 2, 0, 'spruce_trapdoor', trapdoor('south', 'top', true));
  return p.payload();
}

function dorfplatz() {
  const p = new Plot([15, 6, 15]);
  for (let x = 0; x < 15; x++) for (let z = 0; z < 15; z++) {
    const d = Math.hypot(x - 7, z - 7);
    p.set(x, 0, z, d < 6.5 ? ((x + z) % 3 ? 'cobblestone' : 'stone_bricks') : (x === 7 || z === 7 ? 'dirt_path' : 'grass_block'), d >= 6.5 && x !== 7 && z !== 7 ? grass() : {});
  }
  p.disc(7, 7, 1, 2, 'stone_brick_wall', {}, true); p.disc(7, 7, 0, 1, 'water', water()); p.set(7, 1, 7, 'chiseled_stone_bricks'); p.set(7, 2, 7, 'lantern', lantern());
  p.fill(7, 0, 7, 7, 0, 7, 'water', water()); p.set(7, 0, 6, 'water', water()); p.set(7, 0, 8, 'water', water()); p.set(6, 0, 7, 'water', water()); p.set(8, 0, 7, 'water', water());
  for (const [x, z] of [[2, 2], [12, 2], [2, 12], [12, 12]] as const) { p.fill(x, 1, z, x, 2, z, 'spruce_fence'); p.set(x, 3, z, 'lantern', lantern()); }
  for (const [x, z, f] of [[4, 2, 'north'], [10, 12, 'south']] as const) for (let i = 0; i < 3; i++) p.set(x + i, 1, z, 'spruce_stairs', stairs(f));
  p.set(11, 1, 4, 'oak_log', axis('y')); p.set(11, 2, 4, 'oak_fence'); p.set(11, 3, 4, 'oak_planks');
  for (const [x, z] of [[1, 6], [13, 8], [6, 13], [8, 1]] as const) p.set(x, 1, z, (x + z) % 2 ? 'poppy' : 'dandelion');
  for (const [x, z] of [[0, 0], [14, 14]] as const) { p.set(x, 1, z, 'oak_leaves', { distance: '1', persistent: T, waterlogged: F }); }
  return p.payload();
}

function dorfmauerTor() {
  const p = new Plot([9, 7, 3]);
  p.fill(0, 0, 0, 8, 0, 2, 'cobblestone');
  p.fill(0, 1, 1, 2, 4, 1, 'cobblestone'); p.fill(6, 1, 1, 8, 4, 1, 'cobblestone');
  p.fill(3, 4, 1, 5, 4, 1, 'spruce_log', axis('x')); p.fill(2, 5, 0, 6, 5, 2, 'spruce_slab', slab());
  p.set(3, 1, 1, 'spruce_fence_gate', { facing: 'south', in_wall: F, open: F, powered: F }); p.set(4, 1, 1, 'spruce_fence_gate', { facing: 'south', in_wall: F, open: F, powered: F }); p.set(5, 1, 1, 'spruce_fence_gate', { facing: 'south', in_wall: F, open: F, powered: F });
  for (const x of [0, 8]) p.set(x, 5, 1, 'lantern', lantern());
  for (const x of [2, 6]) p.set(x, 3, 0, 'wall_torch', facing('north'));
  return p.payload();
}

const WERKSTAETTEN: BuildingSpec[] = PROFESSIONS.map(pr => ({
  id: `bld_werkstatt_${pr.key}`, name: `Werkstatt: ${pr.label}`, payload: werkstatt(pr), tags: ['dorf', 'beruf', pr.job.toLowerCase()],
  description: `Kleine Werkstatt mit Arbeitsblock für den Beruf ${pr.job} (${pr.station.replace(/_/g, ' ')}), Vorplatz mit Laternen und passender Einrichtung.`,
  facets: { kategorie: ['handwerk'], stil: ['mittelalterlich', 'rustikal'], biom: ['ueberall'], funktion: ['handwerk', 'handelsplatz'] },
  family: { id: 'dorfwerkstatt', label: 'Dorfwerkstatt', variant: pr.job },
  assumed: /cauldron/.test(pr.station) || pr.key === 'ruestungsschmied' ? ['minecraft:cauldron', 'minecraft:dirt'] : ['minecraft:dirt'],
  tips: [`Ein arbeitsloser Dorfbewohner in Reichweite des Arbeitsblocks wird ${pr.job}.`, pr.note], inspiration: [WIKI('Villager', 'Dorfbewohner')],
}));
const BUDEN: BuildingSpec[] = (([['red', 'Rot'], ['blue', 'Blau'], ['green', 'Grün'], ['yellow', 'Gelb']]) as const).map(([c, label]) => ({
  id: `bld_marktbude_${c}`, name: `Marktbude (${label})`, payload: marktbude(c), tags: ['markt', 'klein', 'bude'],
  description: `Offene Marktbude mit gestreiftem Wolldach in ${label}/Weiß, Theke, Kiste und Hängelaterne.`,
  facets: { kategorie: ['handel'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['handel', 'deko'] },
  family: { id: 'marktbude', label: 'Marktbude', variant: label },
}));

export const DORF_SPECS: readonly BuildingSpec[] = [
  ...WERKSTAETTEN,
  ...BUDEN,
  { id: 'bld_taverne', name: 'Taverne', payload: taverne, tags: ['gasthaus', 'zweistöckig', 'schank'],
    description: 'Zweistöckige Taverne mit Schankraum, Fässertheke, Tischen, Kamin und drei Gästebetten im Obergeschoss.',
    facets: { kategorie: ['handel'], stil: ['mittelalterlich'], biom: ['ebene', 'wald', 'ueberall'], funktion: ['versammlung', 'wohnen', 'unterhaltung'] } },
  { id: 'bld_rathaus', name: 'Rathaus', payload: rathaus, tags: ['stadt', 'uhrturm', 'säulen'],
    description: 'Repräsentatives Rathaus mit Säulenfront aus Quarz, Ratssaal mit Lesepult und mittigem Uhrturm.',
    facets: { kategorie: ['wahrzeichen'], stil: ['klassisch'], biom: ['ueberall'], funktion: ['versammlung', 'orientierung'] } },
  { id: 'bld_windmuehle', name: 'Windmühle', payload: windmuehle, tags: ['mühle', 'flügel', 'turm'],
    description: 'Runde Turmwindmühle aus Bruchstein mit Holzkappe und vier Segelflügeln; Lager für Heu und Getreide.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal', 'mittelalterlich'], biom: ['ebene', 'savanne'], funktion: ['landwirtschaft', 'lagern', 'orientierung'] } },
  { id: 'bld_lagerhaus', name: 'Lagerhaus', payload: lagerhaus, tags: ['lager', 'truhen', 'tor'],
    description: 'Hallenlager mit breitem Tor, Doppeltruhenreihe und Fasswänden – 26 Lagerplätze ohne Umbau.',
    facets: { kategorie: ['handel'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['lagern'] },
    tips: ['Fässer brauchen keinen freien Block darüber – sie lassen sich stapeln.'] },
  { id: 'bld_dorfplatz', name: 'Dorfplatz', payload: dorfplatz, tags: ['platz', 'mittelpunkt', 'brunnen'],
    description: 'Gepflasterter Dorfplatz mit rundem Brunnen, vier Laternen, Bänken und Wegen in alle Richtungen.',
    facets: { kategorie: ['dekoration'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['versammlung', 'wasserquelle'] }, gaps: ['minecraft:water'], assumed: ['minecraft:dirt'] },
  { id: 'bld_dorftor', name: 'Dorftor', payload: dorfmauerTor, tags: ['tor', 'eingang', 'mauer'],
    description: 'Einfaches Dorftor aus Bruchstein mit Zauntoren, Holzsturz, Laternen und Fackeln.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich', 'rustikal'], biom: ['ueberall'], funktion: ['verteidigung', 'verbindung'] } },
];
