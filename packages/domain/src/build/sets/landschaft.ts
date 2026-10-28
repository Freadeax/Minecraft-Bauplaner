import { Plot, axis, grass, leaves, noise, roundTree, spruceTree, palmTree, tallPlant, lantern, slab, stairs, water, mushroom, F, T } from '../plot.js';
import type { TreeKind } from '../plot.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/** Landschaft & Garten: hand-shaped trees, rocks, ponds, gardens. Trees are deterministic, no randomness. */


function lawn(p: Plot, x0: number, z0: number, x1: number, z1: number): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (!p.has(x, 0, z)) p.set(x, 0, z, 'grass_block', grass());
}

/** Big oak: thick 2×2 trunk, branches and three overlapping crown lobes. */
function grosseEiche() {
  const p = new Plot([13, 16, 13]);
  lawn(p, 0, 0, 12, 12);
  const lobes: [number, number, number, number][] = [[6, 11, 6, 4.2], [3, 9, 5, 2.8], [9, 9, 8, 2.8], [6, 13, 7, 2.6]];
  for (const [x, y, z, r] of lobes) p.blob(x, y, z, r, r * 0.65, r, 'oak_leaves', leaves(), false, (bx, by, bz) => noise(bx, by, bz) > 0.12 || by < y);
  p.fill(5, 1, 5, 6, 9, 6, 'oak_log', axis('y'));
  for (let i = 1; i <= 3; i++) { p.set(5 - i, 7 + (i > 1 ? 1 : 0), 5, 'oak_log', axis('x')); p.set(6 + i, 7 + (i > 1 ? 1 : 0), 7, 'oak_log', axis('x')); }
  for (const [x, z] of [[4, 5], [7, 6], [5, 7], [6, 4]] as const) p.set(x, 1, z, 'oak_log', axis('y'));
  p.set(2, 1, 9, 'oak_stairs', stairs('north')); p.set(3, 1, 9, 'oak_stairs', stairs('north'));
  return p.payload();
}

function baum(kind: TreeKind | 'palme' | 'fichte') {
  return () => {
    const p = new Plot([9, 14, 9]);
    lawn(p, 1, 1, 7, 7);
    if (kind === 'palme') { p.fill(1, 0, 1, 7, 0, 7, 'sand'); palmTree(p, 3, 1, 4, 7); }
    else if (kind === 'fichte') { spruceTree(p, 4, 1, 4, 10); p.set(4, 0, 4, 'podzol', grass()); }
    else if (kind === 'cherry') {
      p.fill(4, 1, 4, 4, 4, 4, 'cherry_log', axis('y'));
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, 1]] as const) { p.set(4 + dx, 5, 4 + dz, 'cherry_log', axis(dx ? 'x' : 'z')); p.set(4 + 2 * dx, 6, 4 + 2 * dz, 'cherry_log', axis('y')); }
      for (const [cx, cz] of [[2, 4], [6, 4], [4, 6]] as const) p.blob(cx, 8, cz, 2.3, 1.3, 2.3, 'cherry_leaves', leaves());
      for (const [x, z] of [[1, 2], [6, 7], [7, 2], [2, 6]] as const) p.set(x, 1, z, x % 2 ? 'pink_tulip' : 'allium');
    } else if (kind === 'birch') {
      for (const [x, z, h] of [[2, 2, 6], [6, 3, 7], [3, 6, 5]] as const) roundTree(p, x, 1, z, 'birch', h, 1.6);
    } else roundTree(p, 4, 1, 4, kind, 6, 2.6);
    return p.payload();
  };
}

function riesenpilz(color: 'rot' | 'braun') {
  return () => {
    const p = new Plot([9, 10, 9]);
    p.fill(0, 0, 0, 8, 0, 8, 'mycelium', grass());
    p.fill(4, 1, 4, 4, 5, 4, 'mushroom_stem', mushroom());
    if (color === 'braun') p.disc(4, 4, 6, 3, 'brown_mushroom_block', mushroom());
    else { p.disc(4, 4, 7, 1, 'red_mushroom_block', mushroom()); p.disc(4, 4, 6, 2, 'red_mushroom_block', mushroom(), true); p.disc(4, 4, 6, 1, 'red_mushroom_block', mushroom()); for (const y of [4, 5]) p.disc(4, 4, y, 3, 'red_mushroom_block', mushroom(), true); p.fill(4, 1, 4, 4, 6, 4, 'mushroom_stem', mushroom()); }
    p.set(1, 1, 7, color === 'rot' ? 'red_mushroom' : 'brown_mushroom'); p.set(7, 1, 2, color === 'rot' ? 'brown_mushroom' : 'red_mushroom');
    return p.payload();
  };
}

function findling() {
  const p = new Plot([9, 6, 8]);
  lawn(p, 0, 0, 8, 7);
  p.blob(4, 1, 4, 3.2, 2.4, 2.6, 'stone', {}, false, (x, y, z) => y >= 1 && noise(x, y, z) > 0.08);
  p.blob(4, 3, 3, 2, 1, 1.5, 'andesite', {}, true, (x, y, z) => noise(x, y, z) > 0.55 && p.has(x, y, z));
  p.blob(5, 1, 5, 2, 1, 2, 'mossy_cobblestone', {}, true, (x, y, z) => noise(x, y, z) > 0.5 && p.has(x, y, z));
  for (let x = 0; x <= 8; x++) for (let z = 0; z <= 7; z++) if (!p.has(x, 1, z) && noise(x, 1, z) > 0.86) p.set(x, 1, z, 'short_grass');
  return p.payload();
}

function teich() {
  const p = new Plot([11, 3, 9]);
  for (let x = 0; x < 11; x++) for (let z = 0; z < 9; z++) {
    const d = ((x - 5) / 4.6) ** 2 + ((z - 4) / 3.6) ** 2;
    p.set(x, 0, z, d < 1 ? (d < 0.45 ? 'clay' : 'sand') : 'grass_block', d < 1 ? {} : grass());
    if (d < 0.8) p.set(x, 1, z, 'water', water());
    else p.set(x, 1, z, 'grass_block', grass());
  }
  for (const [x, z] of [[4, 3], [6, 5], [3, 5]] as const) p.set(x, 2, z, 'lily_pad');
  for (const [x, z] of [[1, 2], [9, 6], [2, 7]] as const) if (p.get(x, 1, z)?.id.endsWith('grass_block')) tallPlant(p, x, 2, z, 'tall_grass');
  p.set(9, 2, 2, 'sugar_cane', { age: '0' }); p.set(9, 3, 2, 'sugar_cane', { age: '0' });
  return p.payload();
}

function blumenwiese() {
  const p = new Plot([12, 3, 10]);
  lawn(p, 0, 0, 11, 9);
  const flowers = ['poppy', 'dandelion', 'cornflower', 'oxeye_daisy', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'lily_of_the_valley', 'short_grass', 'short_grass', 'short_grass'];
  for (let x = 0; x < 12; x++) for (let z = 0; z < 10; z++) {
    const n = noise(x, 0, z);
    if (n > 0.9) tallPlant(p, x, 1, z, n > 0.95 ? 'rose_bush' : 'lilac');
    else if (n > 0.25) p.set(x, 1, z, flowers[Math.floor(n * 100) % flowers.length]!);
  }
  p.set(5, 1, 4, 'beehive', { facing: 'south', honey_level: '0' }); p.set(5, 0, 4, 'oak_log', axis('y'));
  return p.payload();
}

function zengarten() {
  const p = new Plot([13, 6, 11]);
  p.fill(0, 0, 0, 12, 0, 10, 'sand');
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 10; z++) if (x === 0 || z === 0 || x === 12 || z === 10) p.set(x, 0, z, 'stone_bricks');
  for (const [x, z] of [[3, 3], [9, 7]] as const) p.blob(x, 1, z, 1.2, 0.8, 1.2, 'cobblestone', {}, false, (_x, y) => y >= 1);
  p.set(3, 2, 3, 'moss_carpet'); p.set(10, 1, 2, 'stone_brick_wall', { east: 'none', north: 'none', south: 'none', up: T, waterlogged: F, west: 'none' });
  p.set(10, 2, 2, 'lantern', lantern()); p.set(10, 3, 2, 'stone_brick_slab', slab());
  for (let x = 1; x <= 4; x++) p.set(x, 0, 8, 'water', water());
  p.set(2, 0, 9, 'water', water()); p.set(3, 0, 9, 'water', water());
  p.fill(6, 1, 1, 6, 3, 1, 'cherry_log', axis('y')); p.blob(6, 5, 1, 2, 1, 1.4, 'cherry_leaves', leaves());
  for (const x of [5, 6, 7]) p.set(x, 0, 5, 'smooth_stone_slab', slab('top'));
  p.set(11, 1, 9, 'bamboo_block', axis('y')); p.set(11, 2, 9, 'bamboo_block', axis('y'));
  return p.payload();
}

function pavillon() {
  const p = new Plot([9, 8, 9]);
  p.disc(4, 4, 0, 4, 'smooth_stone'); p.disc(4, 4, 0, 3, 'polished_andesite');
  for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7], [4, 0], [4, 8], [0, 4], [8, 4]] as const) if (Math.abs(x - 4) + Math.abs(z - 4) > 3) p.fill(x, 1, z, x, 3, z, 'birch_fence');
  p.disc(4, 4, 4, 4, 'birch_slab', slab('top'));
  p.disc(4, 4, 5, 3, 'dark_oak_slab', slab()); p.disc(4, 4, 6, 1, 'dark_oak_slab', slab()); p.set(4, 6, 4, 'dark_oak_planks'); p.set(4, 7, 4, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  p.set(4, 3, 4, 'lantern', lantern(true));
  for (const [x, z, f] of [[3, 2, 'south'], [5, 2, 'south'], [3, 6, 'north'], [5, 6, 'north']] as const) p.set(x, 1, z, 'birch_stairs', stairs(f));
  return p.payload();
}

const BAEUME: BuildingSpec[] = ([
  ['oak', 'Eiche', ['ebene', 'wald']], ['birch', 'Birkenhain', ['wald']], ['fichte', 'Fichte', ['taiga', 'schnee']], ['cherry', 'Kirschbaum', ['kirschhain']],
  ['dark_oak', 'Schwarzeiche', ['wald']], ['acacia', 'Akazie', ['savanne']], ['palme', 'Palme', ['kueste', 'dschungel']],
] as const).map(([k, label, biom]) => ({
  id: `bld_baum_${k}`, name: `Baum: ${label}`, payload: baum(k), tags: ['baum', 'natur', 'begrünung'],
  description: `Handgeformter ${label === 'Birkenhain' ? 'Birkenhain aus drei schlanken Birken' : label === 'Palme' ? 'Palmenbaum mit geneigtem Stamm auf Sand (Dschungelholz)' : `Baum (${label}) mit runder, vollerer Krone als im Vanilla-Wuchs`}.`,
  facets: { kategorie: ['landschaft'], stil: k === 'palme' ? ['tropisch'] : k === 'cherry' ? ['fernoestlich'] : ['rustikal'], biom: [...biom], funktion: ['deko'] },
  family: { id: 'baum', label: 'Bäume', variant: label },
  tips: ['Blätter sind „persistent“ gesetzt – im Spiel per Hand platzierte Blätter zerfallen nicht.'],
}));

export const LANDSCHAFT_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_grosse_eiche', name: 'Große Eiche', payload: grosseEiche, tags: ['baum', 'riesig', 'dorfmitte'],
    description: 'Mächtige Eiche mit 2×2-Stamm, Ästen und drei Kronenteilen – ein Blickfang für den Dorfplatz, mit Bank darunter.',
    facets: { kategorie: ['landschaft'], stil: ['rustikal', 'fantasy'], biom: ['ebene', 'wald'], funktion: ['deko', 'versammlung'] },
    family: { id: 'baum', label: 'Bäume', variant: 'Große Eiche' } },
  ...BAEUME,
  ...(['rot', 'braun'] as const).map((c): BuildingSpec => ({
    id: `bld_riesenpilz_${c}`, name: `Riesenpilz (${c})`, payload: riesenpilz(c), tags: ['pilz', 'natur', 'pilzinsel'],
    description: c === 'rot' ? 'Roter Riesenpilz mit hängendem Hutrand auf Myzel.' : 'Brauner Riesenpilz mit flachem, breitem Hut auf Myzel.',
    facets: { kategorie: ['landschaft'], stil: ['fantasy'], biom: ['pilzinsel', 'sumpf'], funktion: ['deko'] },
    family: { id: 'riesenpilz', label: 'Riesenpilz', variant: c === 'rot' ? 'Rot' : 'Braun' } })),
  { id: 'bld_findling', name: 'Findling', payload: findling, tags: ['fels', 'stein', 'natur'],
    description: 'Moosbewachsener Felsbrocken aus Stein, Andesit und bemoostem Bruchstein – bricht flache Wiesen auf.',
    facets: { kategorie: ['landschaft'], stil: ['rustikal'], biom: ['ueberall', 'gebirge'], funktion: ['deko'] } },
  { id: 'bld_teich', name: 'Gartenteich', payload: teich, tags: ['wasser', 'seerosen', 'garten'],
    description: 'Ovaler Teich mit Sand- und Tonboden, Seerosen, Zuckerrohr und hohem Gras am Ufer.',
    facets: { kategorie: ['garten'], stil: ['rustikal', 'klassisch'], biom: ['ebene', 'wald', 'sumpf'], funktion: ['deko', 'wasserquelle'] },
    gaps: ['minecraft:water'], tips: ['Zuckerrohr braucht Wasser direkt neben dem Block, auf dem es steht.'] },
  { id: 'bld_blumenwiese', name: 'Blumenwiese', payload: blumenwiese, tags: ['blumen', 'bienen', 'farbstoff'],
    description: 'Bunte Wiese mit neun Blumensorten, Fliederbüschen und Bienenstock – gleichzeitig Farbstoffquelle.',
    facets: { kategorie: ['garten'], stil: ['rustikal'], biom: ['ebene'], funktion: ['deko', 'ressourcen'] },
    tips: ['Knochenmehl auf Gras erzeugt neue Blumen der jeweiligen Biom-Sorte.'] },
  { id: 'bld_zengarten', name: 'Zen-Garten', payload: zengarten, tags: ['garten', 'japanisch', 'ruhe'],
    description: 'Sandgarten in Steinziegel-Fassung mit Steininseln, Steinlaterne, kleinem Wasserlauf, Trittplatten und Kirschbaum.',
    facets: { kategorie: ['garten'], stil: ['fernoestlich'], biom: ['kirschhain', 'ueberall'], funktion: ['deko'] },
    gaps: ['minecraft:water'], inspiration: [WIKI('Cherry_Grove', 'Kirschhain-Biom')] },
  { id: 'bld_pavillon', name: 'Gartenpavillon', payload: pavillon, tags: ['garten', 'rund', 'laube'],
    description: 'Achteckiger Pavillon aus Birke mit gestuftem Dach, Hängelaterne und Sitzbänken.',
    facets: { kategorie: ['garten'], stil: ['klassisch'], biom: ['ueberall'], funktion: ['versammlung', 'deko'] } },
];
