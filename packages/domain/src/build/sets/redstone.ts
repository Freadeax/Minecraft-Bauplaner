import { Plot, axis, button, chest, comparator, furnace, hopper, lamp, lantern, lever, poweredRail, rail, redstoneWallTorch, repeater, slab, stairs, water, wire } from '../plot.js';
import { WIKI, joint } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/**
 * Redstone & Verkehr: small, well-known circuits as clean modules.
 * Java facts used: repeater/comparator `facing` names the input side (output
 * is the opposite); a redstone torch on a hopper's side block locks it.
 */

/** Furnace array module: hopper feeds from the top chest, results go down into a collector chest. Chain along x. */
function schmelzModul() {
  const p = new Plot([3, 5, 5]);
  for (let x = 0; x < 3; x++) {
    p.set(x, 4, 2, 'chest', chest('south'));       // ore
    p.set(x, 3, 2, 'hopper', hopper('down'));
    p.set(x, 2, 2, 'furnace', furnace('south'));
    p.set(x, 1, 2, 'hopper', hopper('down'));
    p.set(x, 0, 2, 'chest', chest('south'));       // results
    p.set(x, 3, 1, 'chest', chest('south'));       // fuel
    p.set(x, 2, 1, 'hopper', hopper('south'));
    p.set(x, 0, 3, 'stone_bricks'); p.set(x, 0, 1, 'stone_bricks');
  }
  return p.payload();
}

/**
 * Item sorter cell: the filter hopper pulls from the item line above; while it
 * holds only the filter items, the wall torch powers and locks the hopper below.
 * More items raise the comparator output, the dust powers the torch's block and
 * the torch turns off: one item passes into the chest.
 */
function sortierModul() {
  const p = new Plot([5, 5, 5]);
  p.fill(0, 0, 0, 4, 0, 4, 'stone_bricks');
  for (let x = 0; x < 5; x++) p.set(x, 3, 2, 'hopper', hopper('east'));
  p.set(2, 2, 2, 'hopper', hopper('down'));       // filter
  p.set(2, 1, 2, 'hopper', hopper('down'));       // locked
  p.set(2, 0, 2, 'chest', chest('north'));
  p.set(2, 2, 3, 'comparator', comparator('north'));
  p.set(2, 2, 4, 'redstone_wire', wire(true, false)); p.set(2, 1, 4, 'stone_bricks');
  p.set(2, 1, 3, 'redstone_wall_torch', redstoneWallTorch('north'));
  p.fill(1, 1, 1, 3, 2, 1, 'glass');
  return p.payload();
}

/** Lamp row: a lever powers dust laid on top of eight redstone lamps (dust powers the block below). */
function lampenreihe() {
  const p = new Plot([11, 3, 3]);
  p.fill(0, 0, 0, 10, 0, 2, 'smooth_stone');
  p.set(0, 1, 1, 'stone_bricks'); p.set(0, 2, 1, 'lever', lever('east', 'floor'));
  for (let x = 1; x <= 8; x++) { p.set(x, 1, 1, 'redstone_lamp', lamp()); p.set(x, 2, 1, 'redstone_wire', wire(false, true)); }
  for (let x = 1; x <= 8; x++) { p.set(x, 1, 0, 'smooth_stone_slab', slab()); p.set(x, 1, 2, 'smooth_stone_slab', slab()); }
  return p.payload();
}

/** Repeater clock: four repeaters in a square loop; the lamp under a corner blinks. */
function taktgeber() {
  const p = new Plot([5, 3, 5]);
  p.fill(0, 0, 0, 4, 0, 4, 'smooth_stone');
  for (const [x, z] of [[1, 1], [3, 1], [3, 3], [1, 3]] as const) p.set(x, 1, z, 'redstone_wire', wire(true, true));
  // facing = input side: east along the north edge, south along the east edge, west along the south edge, north along the west edge.
  p.set(2, 1, 1, 'repeater', repeater('west', 4)); p.set(3, 1, 2, 'repeater', repeater('north', 4));
  p.set(2, 1, 3, 'repeater', repeater('east', 4)); p.set(1, 1, 2, 'repeater', repeater('south', 4));
  p.set(3, 0, 3, 'redstone_lamp', lamp());
  return p.payload();
}

function gleisGerade() {
  const p = new Plot([16, 2, 3]);
  for (let x = 0; x < 16; x++) {
    p.set(x, 0, 0, 'stone_brick_slab', slab('top')); p.set(x, 0, 2, 'stone_brick_slab', slab('top'));
    p.set(x, 0, 1, x % 8 === 0 ? 'redstone_block' : 'gravel');
    p.set(x, 1, 1, x % 8 === 0 ? 'powered_rail' : 'rail', x % 8 === 0 ? poweredRail('east_west', true) : rail('east_west'));
  }
  return p.payload();
}

function gleisKurve() {
  const p = new Plot([5, 2, 5]);
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) p.set(x, 0, z, 'stone_brick_slab', slab('top'));
  for (let x = 0; x <= 2; x++) { p.set(x, 0, 1, 'gravel'); p.set(x, 1, 1, 'rail', rail('east_west')); }
  for (let z = 2; z <= 4; z++) { p.set(3, 0, z, 'gravel'); p.set(3, 1, z, 'rail', rail('north_south')); }
  p.set(3, 0, 1, 'gravel'); p.set(3, 1, 1, 'rail', rail('south_west'));
  return p.payload();
}

function bahnhof() {
  const p = new Plot([16, 8, 7]);
  p.fill(0, 0, 0, 15, 0, 6, 'stone_bricks');
  for (let x = 0; x < 16; x++) { p.set(x, 1, 1, x === 0 || x === 15 ? 'powered_rail' : 'rail', x === 0 || x === 15 ? poweredRail('east_west', false) : rail('east_west')); p.set(x, 0, 1, x === 0 || x === 15 ? 'stone_bricks' : 'gravel'); }
  p.fill(0, 1, 3, 15, 1, 6, 'polished_andesite');
  for (const x of [1, 5, 10, 14]) { p.fill(x, 2, 3, x, 4, 3, 'dark_oak_fence'); p.fill(x, 2, 6, x, 4, 6, 'dark_oak_log', axis('y')); }
  p.fill(0, 5, 2, 15, 5, 6, 'dark_oak_slab', slab()); p.fill(0, 5, 6, 15, 5, 6, 'dark_oak_planks');
  for (let x = 0; x < 16; x++) p.set(x, 5, 2, 'dark_oak_stairs', stairs('north'));
  for (const x of [3, 8, 12]) { p.set(x, 2, 5, 'spruce_stairs', stairs('south')); p.set(x + 1, 2, 5, 'spruce_stairs', stairs('south')); }
  for (const x of [3, 12]) p.set(x, 4, 4, 'lantern', lantern(true));
  p.set(1, 2, 2, 'stone_button', button('north', 'floor'));
  p.set(7, 2, 6, 'chest', chest('north'));
  return p.payload();
}

function wasseraufzug() {
  const p = new Plot([7, 15, 4]);
  p.fill(0, 0, 0, 6, 0, 3, 'stone_bricks');
  for (let y = 1; y <= 13; y++) { p.ring(2, 0, 4, 2, y, 'glass'); p.set(3, y, 1, 'water', water()); }
  p.set(3, 0, 1, 'soul_sand');
  p.fill(2, 1, 0, 4, 2, 0, 'stone_bricks'); p.air(3, 1, 0); p.air(3, 2, 0); p.set(3, 1, 1, 'water', water()); p.set(3, 2, 1, 'water', water());
  p.fill(0, 14, 0, 6, 14, 3, 'stone_bricks'); p.air(3, 14, 1);
  p.set(3, 14, 2, 'stone_brick_slab', slab());
  for (const x of [1, 5]) p.set(x, 1, 1, 'lantern', lantern());
  return p.payload();
}

export const REDSTONE_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_schmelz_modul', name: 'Schmelzofen-Modul', payload: schmelzModul, tags: ['ofen', 'trichter', 'kettenbar'],
    description: 'Drei Öfen mit Trichterzufuhr: Erz oben, Brennstoff von der Seite, Ergebnis landet in der Sammeltruhe darunter. Beliebig reihbar.',
    facets: { kategorie: ['redstone'], stil: ['technisch'], biom: ['ueberall'], funktion: ['schmelzen'] },
    family: { id: 'technikmodul', label: 'Technik-Modul', variant: 'Schmelzen' },
    connectors: [joint('west', [0, 0, 2], [-1, 0, 0], 'machine_joint', 'reihe_3x5'), joint('east', [3, 0, 2], [1, 0, 0], 'machine_joint', 'reihe_3x5')],
    tips: ['Alle Truhen einer Ebene bilden Doppeltruhen über die Modulgrenze hinweg.'] },
  { id: 'bld_sortier_modul', name: 'Sortier-Modul', payload: sortierModul, tags: ['sortierer', 'komparator', 'kettenbar'],
    description: 'Sortierzelle nach dem bekannten Prinzip: Filtertrichter mit 41+1+1+1+1 Gegenständen, Komparator, gesperrter Trichter, Truhe.',
    facets: { kategorie: ['redstone'], stil: ['technisch'], biom: ['ueberall'], funktion: ['sortieren', 'lagern'] },
    family: { id: 'technikmodul', label: 'Technik-Modul', variant: 'Sortieren' },
    connectors: [joint('west', [0, 4, 2], [-1, 0, 0], 'machine_joint', 'sortierer_5x5'), joint('east', [5, 4, 2], [1, 0, 0], 'machine_joint', 'sortierer_5x5')],
    tips: ['Filter: 18 des Sortierguts im ersten Slot, je 1 Platzhalter in den übrigen vier.'], inspiration: [WIKI('Tutorials/Item_sorting', 'Gegenstände sortieren')] },
  { id: 'bld_lampenreihe', name: 'Lampenreihe', payload: lampenreihe, tags: ['lampen', 'hebel', 'beleuchtung'],
    description: 'Acht Redstone-Lampen mit Leitung obenauf, per Hebel schaltbar – Straßen- oder Hallenbeleuchtung.',
    facets: { kategorie: ['redstone'], stil: ['technisch', 'modern'], biom: ['ueberall'], funktion: ['beleuchtung'] } },
  { id: 'bld_taktgeber', name: 'Taktgeber', payload: taktgeber, tags: ['takt', 'verstärker', 'schaltung'],
    description: 'Verstärker-Taktgeber im Quadrat: ein Impuls kreist und lässt die Lampe unter einer Ecke blinken. Zum Start kurz eine Redstone-Fackel neben die Leitung setzen und wieder abbauen.',
    facets: { kategorie: ['redstone'], stil: ['technisch'], biom: ['ueberall'], funktion: ['deko'] } },
  { id: 'bld_gleis_gerade', name: 'Gleis gerade (16)', payload: gleisGerade, tags: ['schiene', 'lore', 'kettenbar'],
    description: '16 Blöcke Gleis auf Kiesbett mit Antriebsschiene alle 8 Blöcke (Redstone-Block darunter).',
    facets: { kategorie: ['infrastruktur'], stil: ['industriell'], biom: ['ueberall'], funktion: ['transport', 'verbindung'] },
    family: { id: 'gleisbau', label: 'Gleis-Baukasten', variant: 'Gerade' },
    connectors: [joint('west', [0, 1, 1], [-1, 0, 0], 'rail_joint', 'gleis_3'), joint('east', [16, 1, 1], [1, 0, 0], 'rail_joint', 'gleis_3')],
    tips: ['Eine dauerhaft gespeiste Antriebsschiene alle 8 Blöcke hält eine besetzte Lore auf Höchstgeschwindigkeit.'] },
  { id: 'bld_gleis_kurve', name: 'Gleis Kurve', payload: gleisKurve, tags: ['schiene', 'kurve', 'kettenbar'],
    description: 'Gleiskurve um 90° im gleichen Raster wie das gerade Gleis.',
    facets: { kategorie: ['infrastruktur'], stil: ['industriell'], biom: ['ueberall'], funktion: ['transport', 'verbindung'] },
    family: { id: 'gleisbau', label: 'Gleis-Baukasten', variant: 'Kurve' },
    connectors: [joint('west', [0, 1, 1], [-1, 0, 0], 'rail_joint', 'gleis_3'), joint('south', [3, 1, 5], [0, 0, 1], 'rail_joint', 'gleis_3')] },
  { id: 'bld_bahnhof', name: 'Bahnhof', payload: bahnhof, tags: ['bahnsteig', 'lore', 'dach'],
    description: 'Bahnsteig mit Dach, Bänken, Laternen und Startknopf; Gleis mit Anschluss an beiden Enden.',
    facets: { kategorie: ['infrastruktur'], stil: ['industriell', 'klassisch'], biom: ['ueberall'], funktion: ['transport', 'versammlung'] },
    family: { id: 'gleisbau', label: 'Gleis-Baukasten', variant: 'Bahnhof' },
    connectors: [joint('west', [0, 1, 1], [-1, 0, 0], 'rail_joint', 'gleis_3'), joint('east', [16, 1, 1], [1, 0, 0], 'rail_joint', 'gleis_3')] },
  { id: 'bld_wasseraufzug', name: 'Wasseraufzug', payload: wasseraufzug, tags: ['aufzug', 'seelensand', 'blasen'],
    description: 'Gläserner Wasseraufzug: Seelensand am Boden erzeugt eine Blasensäule, die 13 Blöcke nach oben trägt.',
    facets: { kategorie: ['redstone'], stil: ['technisch', 'modern'], biom: ['ueberall'], funktion: ['transport', 'verbindung'] }, gaps: ['minecraft:water'],
    tips: ['Alle Wasserblöcke müssen Quellen sein; Seetang hilft beim Umwandeln von Fließwasser.'], inspiration: [WIKI('Bubble_Column', 'Blasensäule')] },
];
