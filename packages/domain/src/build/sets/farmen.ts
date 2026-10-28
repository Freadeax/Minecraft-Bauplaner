import { Plot, axis, barrel, beehive, chest, crop, farmland, gate, grass, hopper, lantern, observer, piston, roundTree, sapling, slab, tallPlant, water, lava, wire, F } from '../plot.js';
import { WIKI, joint } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/** Farmen: fields, chainable crop modules and simple, reliable resource farms. */

/** 9×9 field around a water source, fenced, with gate and lamp posts. */
function acker(cropId: string, maxAge: number) {
  return () => {
    const p = new Plot([11, 4, 11]);
    for (let x = 0; x <= 10; x++) for (let z = 0; z <= 10; z++) {
      const edge = x === 0 || z === 0 || x === 10 || z === 10;
      if (edge) { p.set(x, 0, z, 'grass_block', grass()); p.set(x, 1, z, 'oak_fence'); continue; }
      if (x === 5 && z === 5) { p.set(x, 0, z, 'water', water()); continue; }
      p.set(x, 0, z, 'farmland', farmland()); p.set(x, 1, z, cropId, crop(maxAge));
    }
    p.set(5, 1, 5, 'oak_slab', slab()); // keeps players from stepping into the water
    p.set(5, 1, 0, 'oak_fence_gate', gate('south'));
    for (const [x, z] of [[0, 0], [10, 0], [0, 10], [10, 10]] as const) { p.set(x, 1, z, 'oak_log', axis('y')); p.set(x, 2, z, 'lantern', lantern()); }
    return p.payload();
  };
}

/**
 * Sugar cane module: observer sees the cane grow, piston pushes the top off,
 * a hopper line under the water channel collects. 10 long, chainable along x.
 */
function zuckerrohrModul() {
  const p = new Plot([10, 5, 6]);
  for (let x = 0; x < 10; x++) {
    p.set(x, 0, 1, 'hopper', hopper('east')); p.set(x, 0, 0, 'stone_bricks'); p.set(x, 0, 2, 'stone_bricks'); p.set(x, 0, 3, 'stone_bricks');
    p.set(x, 1, 1, 'water', water()); p.set(x, 1, 2, 'sand'); p.set(x, 1, 0, 'glass');
    p.set(x, 2, 2, 'sugar_cane', { age: '0' });
    p.set(x, 3, 3, 'piston', piston('north')); p.set(x, 3, 4, 'observer', observer('south'));
    p.set(x, 2, 3, 'stone_bricks'); p.set(x, 2, 4, 'stone_bricks'); p.set(x, 4, 4, 'redstone_wire', wire(false, true));
  }
  p.set(9, 0, 1, 'chest', chest('west'));
  return p.payload();
}

/** Pumpkin or melon module: stems on farmland, fruit spots on dirt, observers trigger pistons that break the fruit. */
function fruchtModul(fruit: 'pumpkin' | 'melon') {
  return () => {
    const p = new Plot([6, 5, 5]);
    for (let x = 0; x < 6; x++) {
      p.set(x, 0, 0, 'water', water()); p.set(x, 0, 1, 'farmland', farmland()); p.set(x, 1, 1, `attached_${fruit}_stem`, { facing: 'south' });
      p.set(x, 0, 2, 'dirt'); p.set(x, 1, 2, fruit); p.set(x, 1, 3, 'piston', piston('north')); p.set(x, 0, 3, 'stone_bricks');
      p.set(x, 2, 3, 'observer', observer('south')); p.set(x, 2, 2, 'glass'); p.set(x, 1, 4, 'stone_bricks'); p.set(x, 2, 4, 'redstone_wire', wire(false, true));
      p.set(x, 0, 4, 'stone_bricks');
    }
    return p.payload();
  };
}

function huehnerfarm() {
  const p = new Plot([5, 6, 5]);
  p.fill(0, 0, 0, 4, 0, 4, 'smooth_stone'); p.set(2, 0, 2, 'hopper', hopper('south')); p.set(2, 0, 3, 'chest', chest('north'));
  p.ring(0, 0, 4, 4, 1, 'glass'); p.ring(0, 0, 4, 4, 2, 'glass'); p.fill(1, 1, 1, 3, 2, 3, null);
  p.fill(0, 3, 0, 4, 3, 4, 'smooth_stone_slab', slab());
  p.set(2, 3, 2, 'lantern', lantern());
  p.set(2, 4, 2, 'hay_block', axis('y'));
  return p.payload();
}

function kaktusfarm() {
  const p = new Plot([7, 6, 7]);
  p.fill(0, 0, 0, 6, 0, 6, 'stone_bricks');
  for (let x = 1; x <= 5; x++) p.set(x, 0, 6, 'hopper', hopper('east'));
  p.set(6, 0, 6, 'chest', chest('west'));
  for (let x = 1; x <= 5; x++) for (let z = 1; z <= 5; z++) {
    if ((x + z) % 2) continue;
    p.set(x, 1, z, 'sand'); p.set(x, 2, z, 'cactus', { age: '0' });
    p.set(x, 3, z + (z < 5 ? 1 : -1), 'oak_fence');
  }
  for (let x = 1; x <= 5; x++) for (let z = 1; z <= 5; z++) if (!p.has(x, 1, z)) p.set(x, 1, z, 'water', water());
  p.ring(0, 0, 6, 6, 1, 'glass');
  return p.payload();
}

function baumfarm() {
  const p = new Plot([13, 4, 13]);
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 12; z++) p.set(x, 0, z, (x % 4 === 2 && z % 4 === 2) ? 'dirt' : 'grass_block', (x % 4 === 2 && z % 4 === 2) ? {} : grass());
  for (const x of [2, 6, 10]) for (const z of [2, 6, 10]) p.set(x, 1, z, 'birch_sapling', sapling());
  for (let i = 0; i <= 12; i += 4) { p.set(i, 1, 0, 'torch'); p.set(i, 1, 12, 'torch'); p.set(0, 1, i, 'torch'); p.set(12, 1, i, 'torch'); }
  p.set(0, 1, 6, 'chest', chest('east')); p.set(0, 1, 7, 'crafting_table');
  return p.payload();
}

function pilzfarm() {
  const p = new Plot([7, 5, 7]);
  p.fill(0, 0, 0, 6, 0, 6, 'mycelium', grass());
  p.room(0, 0, 6, 6, 1, 3, 'cobblestone'); p.fill(0, 4, 0, 6, 4, 6, 'cobblestone');
  p.fill(3, 1, 0, 3, 2, 0, null);
  for (let x = 1; x <= 5; x++) for (let z = 1; z <= 5; z++) if ((x + z) % 2 === 0) p.set(x, 1, z, x % 2 ? 'red_mushroom' : 'brown_mushroom');
  p.set(5, 1, 5, 'chest', chest('west'));
  return p.payload();
}

function bienenhaus() {
  const p = new Plot([9, 7, 7]);
  for (let x = 0; x <= 8; x++) for (let z = 0; z <= 6; z++) p.set(x, 0, z, 'grass_block', grass());
  const flowers = ['poppy', 'dandelion', 'cornflower', 'allium', 'oxeye_daisy', 'azure_bluet'];
  for (let x = 0; x <= 8; x++) for (let z = 3; z <= 6; z++) if ((x + z) % 2) p.set(x, 1, z, flowers[(x * 3 + z) % flowers.length]!);
  for (const x of [1, 3, 5, 7]) { p.set(x, 1, 1, 'oak_log', axis('y')); p.set(x, 2, 1, 'beehive', beehive('south')); }
  p.fill(0, 3, 0, 8, 3, 2, 'oak_slab', slab());
  p.set(8, 1, 0, 'barrel', barrel('up'));
  for (const x of [0, 8]) p.fill(x, 1, 2, x, 2, 2, 'oak_fence');
  return p.payload();
}

function tierweide() {
  const p = new Plot([13, 4, 11]);
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 10; z++) {
    p.set(x, 0, z, 'grass_block', grass());
    if (x === 0 || z === 0 || x === 12 || z === 10) p.set(x, 1, z, 'oak_fence');
  }
  p.set(6, 1, 0, 'oak_fence_gate', gate('south'));
  p.fill(8, 0, 6, 10, 0, 8, 'water', water());
  for (let x = 1; x <= 4; x++) p.set(x, 1, 9, 'hay_block', axis('y'));
  p.fill(1, 2, 7, 4, 2, 9, 'spruce_slab', slab());
  for (const [x, z] of [[1, 7], [4, 7]] as const) p.set(x, 1, z, 'spruce_fence');
  for (const [x, z] of [[0, 0], [12, 0], [0, 10], [12, 10]] as const) { p.set(x, 1, z, 'oak_log', axis('y')); p.set(x, 2, z, 'lantern', lantern()); }
  for (const [x, z] of [[3, 3], [9, 3], [5, 5]] as const) tallPlant(p, x, 1, z, 'tall_grass');
  return p.payload();
}

/** Iron farm core: three villager beds, zombie cage, lava blades and collection. Spawn platform 1 below the blades. */
function eisenfarm() {
  const p = new Plot([9, 11, 9]);
  p.fill(0, 0, 0, 8, 0, 8, 'stone_bricks');
  p.set(4, 0, 4, 'hopper', hopper('south')); p.set(4, 0, 5, 'hopper', hopper('south')); p.set(4, 0, 6, 'chest', chest('north'));
  p.ring(1, 1, 7, 7, 1, 'glass'); p.ring(1, 1, 7, 7, 2, 'glass');
  p.fill(2, 1, 2, 6, 1, 6, 'water', water()); p.set(4, 1, 4, 'water', water());
  p.fill(2, 3, 2, 6, 3, 6, 'stone_bricks'); p.fill(3, 3, 3, 5, 3, 5, null);
  p.set(4, 3, 4, 'lava', lava()); p.set(4, 2, 4, 'oak_sign', { rotation: '0', waterlogged: F });
  // Dorfbewohner-Kammer
  p.fill(0, 4, 0, 8, 4, 8, 'stone_bricks');
  p.ring(0, 0, 8, 8, 5, 'glass'); p.ring(0, 0, 8, 8, 6, 'glass');
  for (const x of [2, 4, 6]) { p.set(x, 5, 1, 'white_bed', { facing: 'north', occupied: F, part: 'head' }); p.set(x, 5, 2, 'white_bed', { facing: 'north', occupied: F, part: 'foot' }); p.set(x, 5, 3, 'composter'); }
  p.fill(0, 7, 0, 8, 7, 8, 'stone_brick_slab', slab());
  p.ring(3, 6, 5, 8, 5, 'glass'); p.set(4, 5, 7, 'green_wool');
  p.set(4, 8, 4, 'lantern', lantern());
  return p.payload();
}

function obstgarten() {
  const p = new Plot([13, 9, 13]);
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 12; z++) p.set(x, 0, z, (x === 6 || z === 6) ? 'dirt_path' : 'grass_block', (x === 6 || z === 6) ? {} : grass());
  for (const [x, z] of [[2, 2], [10, 2], [2, 10], [10, 10]] as const) roundTree(p, x, 1, z, 'oak', 4, 2);
  for (const [x, z] of [[2, 6], [10, 6], [6, 2], [6, 10]] as const) roundTree(p, x, 1, z, 'cherry', 3, 1.5);
  p.set(6, 1, 6, 'composter'); p.set(7, 1, 6, 'barrel', barrel('up'));
  return p.payload();
}

const ACKER: BuildingSpec[] = ([['wheat', 'Weizen', 7, 'weizen'], ['carrots', 'Karotten', 7, 'karotten'], ['potatoes', 'Kartoffeln', 7, 'kartoffeln'], ['beetroots', 'Rote Bete', 3, 'rote_bete']] as const).map(([c, label, age, key]) => ({
  id: `bld_acker_${key}`, name: `Acker: ${label}`, payload: acker(c, age), tags: ['feld', 'anbau', 'nahrung'],
  description: `9×9-Feld mit ${label} um eine Wasserquelle (abgedeckt mit einer Stufe), eingezäunt, mit Tor und vier Laternenpfosten.`,
  facets: { kategorie: ['landwirtschaft'], stil: ['rustikal'], biom: ['ebene', 'ueberall'], funktion: ['landwirtschaft'] },
  family: { id: 'acker', label: 'Acker', variant: label }, gaps: ['minecraft:water'], assumed: ['minecraft:dirt'],
  tips: ['Eine Wasserquelle bewässert 9×9 Ackerboden – genau dieses Feld.', 'Laternen statt Fackeln: Pflanzen wachsen auch nachts bei Licht 9+.'],
  inspiration: [WIKI('Tutorials/Crop_farming', 'Ackerbau')],
}));

export const FARM_SPECS: readonly BuildingSpec[] = [
  ...ACKER,
  { id: 'bld_zuckerrohr_modul', name: 'Zuckerrohr-Modul', payload: zuckerrohrModul, tags: ['automatisch', 'beobachter', 'kettenbar'],
    description: 'Vollautomatisches Zuckerrohr-Modul: Beobachter erkennen Wachstum, Kolben ernten, Trichterkette sammelt in eine Truhe. Beliebig verlängerbar.',
    facets: { kategorie: ['farm'], stil: ['technisch'], biom: ['ueberall'], funktion: ['ressourcen'] },
    family: { id: 'farmmodul', label: 'Farm-Modul', variant: 'Zuckerrohr' }, gaps: ['minecraft:water'],
    connectors: [joint('west', [0, 1, 2], [-1, 0, 0], 'farm_joint', 'zuckerrohr_5x6'), joint('east', [10, 1, 2], [1, 0, 0], 'farm_joint', 'zuckerrohr_5x6')],
    tips: ['Module an den Anschlüssen aneinanderreihen; die letzte Trichterreihe in eine Truhe führen.'], inspiration: [WIKI('Tutorials/Sugar_cane_farming', 'Zuckerrohr-Farmen')] },
  { id: 'bld_kuerbis_modul', name: 'Kürbis-Modul', payload: fruchtModul('pumpkin'), tags: ['automatisch', 'kolben', 'kettenbar'],
    description: 'Kürbis-Modul: Stängel auf Ackerboden, Beobachter über dem Fruchtplatz schalten Kolben, die den Kürbis abbauen. Gezeigt im geernteten Zustand mit reifer Frucht.',
    facets: { kategorie: ['farm'], stil: ['technisch'], biom: ['ueberall'], funktion: ['ressourcen'] },
    family: { id: 'farmmodul', label: 'Farm-Modul', variant: 'Kürbis' }, gaps: ['minecraft:water'], assumed: ['minecraft:dirt'],
    connectors: [joint('west', [0, 1, 2], [-1, 0, 0], 'farm_joint', 'frucht_6x5'), joint('east', [6, 1, 2], [1, 0, 0], 'farm_joint', 'frucht_6x5')] },
  { id: 'bld_melonen_modul', name: 'Melonen-Modul', payload: fruchtModul('melon'), tags: ['automatisch', 'kolben', 'kettenbar'],
    description: 'Melonen-Modul im gleichen Raster wie das Kürbis-Modul – beide lassen sich mischen.',
    facets: { kategorie: ['farm'], stil: ['technisch'], biom: ['ueberall'], funktion: ['ressourcen'] },
    family: { id: 'farmmodul', label: 'Farm-Modul', variant: 'Melone' }, gaps: ['minecraft:water'], assumed: ['minecraft:dirt'],
    connectors: [joint('west', [0, 1, 2], [-1, 0, 0], 'farm_joint', 'frucht_6x5'), joint('east', [6, 1, 2], [1, 0, 0], 'farm_joint', 'frucht_6x5')] },
  { id: 'bld_huehnerfarm', name: 'Hühnerfarm', payload: huehnerfarm, tags: ['eier', 'trichter', 'kompakt'],
    description: 'Kompakter Hühnerstall: Glaswände, Trichter im Boden sammelt Eier und Federn in eine Truhe.',
    facets: { kategorie: ['farm'], stil: ['technisch'], biom: ['ueberall'], funktion: ['ressourcen', 'tierhaltung'] },
    tips: ['Hühner mit Samen hineinlocken; Eier werfen, um mehr Hühner zu bekommen.'] },
  { id: 'bld_kaktusfarm', name: 'Kaktusfarm', payload: kaktusfarm, tags: ['kaktus', 'grüner-farbstoff', 'passiv'],
    description: 'Passive Kaktusfarm: Kakteen wachsen gegen Zäune, brechen ab und schwimmen über Wasser in eine Trichterleiste.',
    facets: { kategorie: ['farm'], stil: ['technisch'], biom: ['wueste', 'ueberall'], funktion: ['ressourcen'] }, gaps: ['minecraft:water'] },
  { id: 'bld_baumfarm', name: 'Baumfarm', payload: baumfarm, tags: ['holz', 'setzlinge', 'raster'],
    description: 'Raster aus neun Birkensetzlingen mit 3 Blöcken Abstand, beleuchtet, mit Truhe und Werkbank am Rand.',
    facets: { kategorie: ['farm'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['ressourcen'] },
    tips: ['Birken wachsen ohne Ausläufer und bleiben schmal – ideal für Handernte.'] },
  { id: 'bld_pilzfarm', name: 'Pilzfarm', payload: pilzfarm, tags: ['pilze', 'dunkel', 'myzel'],
    description: 'Dunkle Steinkammer auf Myzel – Pilze breiten sich bei Licht unter 13 von selbst aus.',
    facets: { kategorie: ['farm'], stil: ['rustikal'], biom: ['ueberall', 'hoehle'], funktion: ['ressourcen'] } },
  { id: 'bld_bienenhaus', name: 'Bienenhaus', payload: bienenhaus, tags: ['honig', 'bienen', 'blumen'],
    description: 'Vier Bienenstöcke unter einem Dach vor einer Blumenwiese; Fass für Honigflaschen.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal'], biom: ['ebene', 'ueberall'], funktion: ['ressourcen', 'tierhaltung'] },
    tips: ['Ein Lagerfeuer unter dem Stock beruhigt Bienen beim Ernten.'] },
  { id: 'bld_tierweide', name: 'Tierweide', payload: tierweide, tags: ['kühe', 'schafe', 'zaun'],
    description: 'Eingezäunte Weide mit Tor, Tränke, Heuunterstand und Laternenpfosten.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal'], biom: ['ebene', 'savanne'], funktion: ['tierhaltung'] }, gaps: ['minecraft:water'] },
  { id: 'bld_eisenfarm', name: 'Eisenfarm (kompakt)', payload: eisenfarm, tags: ['eisen', 'golem', 'dorfbewohner'],
    description: 'Kompakte Eisenfarm: drei Dorfbewohner mit Betten und Arbeitsblöcken, Zombieplatz als Angstauslöser, Golems fallen in Lava, Trichter sammeln.',
    facets: { kategorie: ['farm'], stil: ['technisch'], biom: ['ueberall'], funktion: ['ressourcen'] }, gaps: ['minecraft:water', 'minecraft:lava'],
    tips: ['Zombie mit Namensschild sichern, damit er nicht verschwindet.', 'Dorfbewohner müssen schlafen und arbeiten können, sonst entstehen keine Golems.'],
    inspiration: [WIKI('Tutorials/Iron_golem_farming', 'Eisengolem-Farmen')] },
  { id: 'bld_obstgarten', name: 'Obstgarten', payload: obstgarten, tags: ['äpfel', 'bäume', 'garten'],
    description: 'Obstgarten mit vier Eichen (Äpfel) und vier Kirschbäumen an einem Wegekreuz mit Komposter.',
    facets: { kategorie: ['garten'], stil: ['rustikal'], biom: ['ebene', 'wald'], funktion: ['ressourcen', 'deko'] }, assumed: ['minecraft:dirt'] },
];
