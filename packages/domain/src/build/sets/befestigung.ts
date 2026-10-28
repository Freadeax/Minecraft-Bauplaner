import { Plot, axis, banner, bed, chest, crenels, door, facing, furnace, gate, hipRoof, ladder, lantern, slab, stairs, trapdoor, F } from '../plot.js';
import { WIKI, joint } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/** Befestigung: palisade kit, keep, towers, gatehouse matching the sample walls, desert fort, outpost, bunker. */

/** Palisade: sharpened log wall with a walkway behind; 4 long, chainable. */
function palisadeGerade() {
  const p = new Plot([4, 6, 3]);
  for (let x = 0; x < 4; x++) {
    p.set(x, 0, 1, 'cobblestone'); p.fill(x, 1, 1, x, 4, 1, 'spruce_log', axis('y')); p.set(x, 5, 1, 'spruce_fence');
    p.set(x, 3, 2, 'spruce_slab', slab('top'));
  }
  return p.payload();
}
function palisadeTurm() {
  const p = new Plot([5, 10, 5]);
  p.fill(0, 0, 0, 4, 0, 4, 'cobblestone');
  for (let y = 1; y <= 6; y++) p.ring(0, 0, 4, 4, y, 'spruce_log', axis('y'));
  p.fill(1, 1, 1, 3, 6, 3, null);
  p.fill(0, 7, 0, 4, 7, 4, 'spruce_planks'); p.ring(0, 0, 4, 4, 8, 'spruce_fence');
  hipRoof(p, 0, 4, 0, 4, 9, 'spruce_stairs', 'spruce_slab');
  p.fill(2, 1, 3, 2, 7, 3, 'ladder', ladder('north'));
  p.fill(2, 1, 0, 2, 2, 0, null); door(p, 2, 1, 0, 'spruce', 'south');
  p.set(2, 8, 2, 'lantern', lantern());
  return p.payload();
}
function palisadeTor() {
  const p = new Plot([6, 8, 3]);
  for (const x of [0, 5]) { p.set(x, 0, 1, 'cobblestone'); p.fill(x, 1, 1, x, 6, 1, 'spruce_log', axis('y')); p.set(x, 7, 1, 'spruce_fence'); }
  p.fill(1, 0, 1, 4, 0, 1, 'cobblestone');
  p.fill(1, 4, 1, 4, 4, 1, 'stripped_spruce_log', axis('x')); p.fill(1, 5, 1, 4, 5, 1, 'spruce_log', axis('y'));
  for (let x = 1; x <= 4; x++) { p.set(x, 1, 1, 'spruce_fence_gate', gate('south')); p.set(x, 6, 1, 'spruce_fence'); }
  for (const x of [0, 5]) p.set(x, 3, 0, 'wall_torch', facing('north'));
  return p.payload();
}

function bergfried() {
  const p = new Plot([9, 22, 9]);
  p.fill(0, 0, 0, 8, 0, 8, 'stone_bricks');
  p.room(0, 0, 8, 8, 1, 16, 'stone_bricks');
  for (const y of [5, 10, 15]) p.fill(1, y, 1, 7, y, 7, 'spruce_planks');
  for (const [x, z] of [[0, 0], [8, 0], [0, 8], [8, 8]] as const) p.fill(x, 1, z, x, 17, z, 'polished_andesite');
  for (const y of [3, 7, 12]) for (const [x, z] of [[4, 0], [0, 4], [8, 4], [4, 8]] as const) p.set(x, y, z, 'iron_bars');
  p.fill(4, 1, 0, 4, 2, 0, null); door(p, 4, 1, 0, 'dark_oak', 'south');
  for (let y = 1; y <= 16; y++) p.set(7, y, 7, 'ladder', ladder('west'));
  p.fill(0, 16, 0, 8, 16, 8, 'stone_bricks'); p.set(7, 16, 7, 'ladder', ladder('west'));
  crenels(p, 0, 0, 8, 8, 17, 'stone_bricks');
  bed(p, 2, 6, 6, 'red', 'south'); p.set(5, 6, 7, 'chest', chest('north')); p.set(1, 1, 7, 'furnace', furnace('east')); p.set(2, 1, 7, 'crafting_table');
  p.set(1, 11, 1, 'barrel', { facing: 'up', open: F }); p.set(2, 11, 1, 'barrel', { facing: 'up', open: F });
  for (const y of [4, 9, 14]) p.set(4, y, 4, 'lantern', lantern(true));
  p.set(4, 17, 4, 'spruce_fence'); p.set(4, 18, 4, 'red_banner', banner(0));
  return p.payload();
}

function rundturm() {
  const p = new Plot([9, 20, 9]);
  p.disc(4, 4, 0, 4, 'cobblestone');
  p.tube(4, 4, 4, 1, 14, 'stone_bricks');
  for (const y of [5, 10]) p.disc(4, 4, y, 3, 'spruce_planks');
  p.fill(4, 1, 0, 4, 2, 0, null); door(p, 4, 1, 0, 'spruce', 'south');
  for (let y = 1; y <= 14; y++) p.set(4, y, 7, 'ladder', ladder('north'));
  for (const y of [3, 8, 12]) { p.set(0, y, 4, 'iron_bars'); p.set(8, y, 4, 'iron_bars'); }
  p.disc(4, 4, 15, 4, 'stone_bricks'); p.set(4, 15, 7, 'ladder', ladder('north'));
  for (let i = 0; i <= 3; i++) p.disc(4, 4, 16 + i, 4 - i, 'dark_oak_planks', {}, true);
  for (const y of [4, 9, 14]) p.set(4, y, 4, 'lantern', lantern(true));
  return p.payload();
}

/** Gatehouse between two wall segments (wall_2x5 like the sample walls). */
function torhaus() {
  const p = new Plot([13, 13, 7]);
  p.fill(0, 0, 0, 12, 0, 6, 'stone_bricks');
  for (const x0 of [0, 8]) { p.room(x0, 0, x0 + 4, 6, 1, 9, 'stone_bricks'); p.fill(x0 + 1, 5, 1, x0 + 3, 5, 5, 'spruce_planks'); crenels(p, x0, 0, x0 + 4, 6, 10, 'stone_bricks'); p.fill(x0, 9, 0, x0 + 4, 9, 6, 'stone_bricks'); }
  p.fill(5, 6, 0, 7, 9, 6, 'stone_bricks'); p.fill(5, 8, 1, 7, 8, 5, null); p.fill(5, 9, 1, 7, 9, 5, 'spruce_planks');
  for (let z = 0; z <= 6; z++) { p.set(5, 6, z, 'stone_brick_stairs', stairs('west', 'top')); p.set(7, 6, z, 'stone_brick_stairs', stairs('east', 'top')); }
  p.fill(5, 1, 0, 7, 5, 6, null);
  for (let x = 5; x <= 7; x++) p.set(x, 5, 1, 'iron_bars');
  for (const x of [4, 8]) { p.fill(x, 1, 3, x, 2, 3, null); door(p, x, 1, 3, 'spruce', x === 4 ? 'east' : 'west'); }
  for (const x0 of [0, 8]) p.fill(x0 + 3, 1, 5, x0 + 3, 9, 5, 'ladder', ladder('north'));
  p.fill(0, 0, 1, 0, 4, 2, 'stone_bricks'); p.fill(12, 0, 1, 12, 4, 2, 'stone_bricks');
  for (const x of [3, 9]) p.set(x, 4, 0, 'red_wall_banner', facing('north'));
  for (const x of [5, 7]) p.set(x, 4, 0, 'wall_torch', facing('north'));
  p.set(2, 4, 3, 'lantern', lantern(true)); p.set(10, 4, 3, 'lantern', lantern(true));
  return p.payload();
}

function wuestenfort() {
  const p = new Plot([15, 9, 15]);
  p.fill(0, 0, 0, 14, 0, 14, 'sandstone');
  for (let y = 1; y <= 4; y++) p.ring(0, 0, 14, 14, y, 'smooth_sandstone');
  crenels(p, 0, 0, 14, 14, 5, 'cut_sandstone');
  for (const [x, z] of [[0, 0], [11, 0], [0, 11], [11, 11]] as const) { p.room(x, z, x + 3, z + 3, 1, 6, 'cut_sandstone'); p.fill(x, 6, z, x + 3, 6, z + 3, 'smooth_sandstone'); crenels(p, x, z, x + 3, z + 3, 7, 'cut_sandstone'); }
  p.fill(6, 1, 0, 8, 3, 0, null); p.fill(6, 4, 0, 8, 4, 0, 'chiseled_sandstone');
  for (let z = 1; z <= 13; z++) for (const x of [1, 13]) p.set(x, 3, z, 'smooth_sandstone_slab', slab('top'));
  for (let x = 1; x <= 13; x++) for (const z of [1, 13]) p.set(x, 3, z, 'smooth_sandstone_slab', slab('top'));
  p.fill(6, 1, 6, 8, 1, 8, 'cut_sandstone'); p.set(7, 2, 7, 'barrel', { facing: 'up', open: F });
  p.room(4, 9, 10, 13, 1, 3, 'smooth_sandstone'); p.fill(4, 4, 9, 10, 4, 13, 'smooth_sandstone'); p.fill(7, 1, 9, 7, 2, 9, null);
  bed(p, 5, 1, 12, 'orange', 'north'); bed(p, 9, 1, 12, 'orange', 'north'); p.set(6, 1, 12, 'chest', { facing: 'south', type: 'single', waterlogged: F });
  for (const [x, z] of [[3, 3], [11, 3]] as const) p.set(x, 1, z, 'lantern', lantern());
  return p.payload();
}

function aussenposten() {
  const p = new Plot([9, 21, 9]);
  p.fill(0, 0, 0, 8, 0, 8, 'cobblestone');
  for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7]] as const) p.fill(x, 1, z, x, 15, z, 'dark_oak_log', axis('y'));
  for (const y of [5, 10, 15]) { p.fill(0, y, 0, 8, y, 8, 'dark_oak_planks'); p.ring(0, 0, 8, 8, y + 1, 'dark_oak_fence'); }
  p.room(2, 2, 6, 6, 1, 4, 'cobblestone'); p.fill(4, 1, 2, 4, 2, 2, null); door(p, 4, 1, 2, 'dark_oak', 'south');
  for (let y = 1; y <= 16; y++) p.set(5, y, 5, 'ladder', ladder('north'));
  hipRoof(p, 0, 8, 0, 8, 17, 'dark_oak_stairs', 'dark_oak_slab');
  for (const y of [7, 12]) p.set(2, y, 2, 'lantern', lantern());
  p.set(3, 16, 3, 'chest', { facing: 'south', type: 'single', waterlogged: F });
  return p.payload();
}

function bunker() {
  const p = new Plot([11, 6, 11]);
  p.fill(0, 0, 0, 10, 0, 10, 'deepslate_bricks');
  p.room(0, 0, 10, 10, 1, 3, 'polished_deepslate'); p.fill(0, 4, 0, 10, 4, 10, 'deepslate_tiles');
  for (let x = 2; x <= 8; x += 2) { p.set(x, 2, 0, 'iron_bars'); p.set(x, 2, 10, 'iron_bars'); p.set(0, 2, x, 'iron_bars'); p.set(10, 2, x, 'iron_bars'); }
  p.fill(5, 1, 0, 5, 2, 0, null); door(p, 5, 1, 0, 'iron', 'south');
  for (const x of [2, 4, 6, 8]) { bed(p, x, 1, 8, 'gray', 'north'); }
  p.fill(1, 1, 1, 1, 1, 6, 'chest', { facing: 'east', type: 'single', waterlogged: F });
  p.set(9, 1, 1, 'furnace', furnace('west')); p.set(9, 1, 2, 'blast_furnace', furnace('west')); p.set(9, 1, 3, 'smithing_table'); p.set(9, 1, 4, 'anvil', facing('west'));
  p.set(5, 3, 5, 'sea_lantern');
  p.fill(0, 5, 0, 10, 5, 10, 'deepslate_tile_slab', slab());
  p.set(5, 4, 9, 'iron_trapdoor', trapdoor('north')); p.fill(5, 1, 9, 5, 3, 9, 'ladder', ladder('north'));
  return p.payload();
}

export const BEFESTIGUNG_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_palisade_gerade', name: 'Palisade: Wand', payload: palisadeGerade, tags: ['palisade', 'holz', 'kettenbar'],
    description: 'Vier Blöcke Palisade aus Fichtenstämmen mit Zaunspitzen und Wehrgang aus Stufen.',
    facets: { kategorie: ['befestigung'], stil: ['rustikal', 'nordisch'], biom: ['ueberall'], funktion: ['verteidigung'] },
    family: { id: 'palisade', label: 'Palisaden-Baukasten', variant: 'Wand' },
    connectors: [joint('west', [0, 0, 1], [-1, 0, 0], 'palisade_joint', 'palisade_1x4'), joint('east', [4, 0, 1], [1, 0, 0], 'palisade_joint', 'palisade_1x4')] },
  { id: 'bld_palisade_turm', name: 'Palisade: Turm', payload: palisadeTurm, tags: ['palisade', 'turm', 'ausguck'],
    description: 'Hölzerner Eckturm mit Plattform, Brüstung, Leiter und Walmdach.',
    facets: { kategorie: ['befestigung'], stil: ['rustikal', 'nordisch'], biom: ['ueberall'], funktion: ['verteidigung', 'aussicht'] },
    family: { id: 'palisade', label: 'Palisaden-Baukasten', variant: 'Turm' },
    connectors: [joint('west', [0, 0, 2], [-1, 0, 0], 'palisade_joint', 'palisade_1x4'), joint('east', [5, 0, 2], [1, 0, 0], 'palisade_joint', 'palisade_1x4')] },
  { id: 'bld_palisade_tor', name: 'Palisade: Tor', payload: palisadeTor, tags: ['palisade', 'tor', 'eingang'],
    description: 'Palisadentor mit vier Zauntoren, Querbalken und Fackeln.',
    facets: { kategorie: ['befestigung'], stil: ['rustikal', 'nordisch'], biom: ['ueberall'], funktion: ['verteidigung', 'verbindung'] },
    family: { id: 'palisade', label: 'Palisaden-Baukasten', variant: 'Tor' },
    connectors: [joint('west', [0, 0, 1], [-1, 0, 0], 'palisade_joint', 'palisade_1x4'), joint('east', [6, 0, 1], [1, 0, 0], 'palisade_joint', 'palisade_1x4')] },
  { id: 'bld_bergfried', name: 'Bergfried', payload: bergfried, tags: ['burg', 'turm', 'zinnen'],
    description: 'Viergeschossiger Wohnturm aus Steinziegeln mit Schießscharten, Innenleiter, Wohn- und Lagerebene und Zinnen.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich'], biom: ['ueberall', 'gebirge'], funktion: ['verteidigung', 'wohnen', 'aussicht'] } },
  { id: 'bld_rundturm', name: 'Rundturm', payload: rundturm, tags: ['burg', 'rund', 'kegeldach'],
    description: 'Runder Steinturm mit drei Ebenen, Schießscharten und Kegeldach aus Schwarzeiche.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich', 'fantasy'], biom: ['ueberall'], funktion: ['verteidigung', 'aussicht'] } },
  { id: 'bld_torhaus', name: 'Torhaus', payload: torhaus, tags: ['burg', 'tor', 'fallgitter'],
    description: 'Torhaus mit zwei Flankentürmen, Torbogen, Fallgitter aus Eisenstäben und Wehrgang; passt zwischen die Beispiel-Mauerstücke.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['verteidigung', 'verbindung'] },
    connectors: [joint('west', [0, 0, 1], [-1, 0, 0], 'wall_joint', 'wall_2x5'), joint('east', [13, 0, 1], [1, 0, 0], 'wall_joint', 'wall_2x5')],
    tips: ['Die Anschlüsse passen zur Beispiel-Mauer: Torhaus und Mauerstücke rasten im Editor ein.'] },
  { id: 'bld_wuestenfort', name: 'Wüstenfort', payload: wuestenfort, tags: ['fort', 'sandstein', 'innenhof'],
    description: 'Quadratisches Sandsteinfort mit vier Ecktürmen, Wehrgang, Torbogen und Unterkunft im Innenhof.',
    facets: { kategorie: ['befestigung'], stil: ['wuestenstil'], biom: ['wueste', 'badlands'], funktion: ['verteidigung', 'wohnen'] } },
  { id: 'bld_aussenposten', name: 'Außenposten', payload: aussenposten, tags: ['turm', 'schwarzeiche', 'stockwerke'],
    description: 'Hoher Wachturm aus Schwarzeiche mit drei Plattformen, Steinkern unten und Walmdach – eigene Interpretation des Plünderer-Außenpostens.',
    facets: { kategorie: ['befestigung'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['verteidigung', 'aussicht'] }, inspiration: [WIKI('Pillager_Outpost', 'Plünderer-Außenposten')] },
  { id: 'bld_bunker', name: 'Bunker', payload: bunker, tags: ['bunker', 'tiefenschiefer', 'versteck'],
    description: 'Flacher Tiefenschiefer-Bunker mit Eisentür, Schlafsaal, Lagerreihe, Schmiedeecke und Dachluke.',
    facets: { kategorie: ['basis'], stil: ['modern', 'industriell'], biom: ['ueberall', 'hoehle'], funktion: ['verteidigung', 'wohnen', 'lagern'] } },
];
