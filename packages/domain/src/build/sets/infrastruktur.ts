import { Plot, axis, chain, chest, facing, grass, hipRoof, lampPost, lantern, slab, stairs, sign, water, barrel, F } from '../plot.js';
import { PATH_PROFILE, WIKI, joint } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/** Infrastruktur: path kit compatible with bridge and jetty, street lights, bridges, portals, harbour crane. */

/** Path surface: a stable mix of path, gravel and cobblestone. */
function pave(p: Plot, x: number, z: number): void {
  const h = (x * 7 + z * 13) % 9;
  p.set(x, 0, z, h < 6 ? 'dirt_path' : h < 8 ? 'gravel' : 'cobblestone');
}
function verge(p: Plot, x: number, z: number): void { if (!p.has(x, 0, z)) p.set(x, 0, z, 'grass_block', grass()); }

type Shape = 'gerade' | 'kurve' | 'kreuzung' | 'tstueck' | 'wendeplatz';
/** Path modules: 4 wide (z 1–4 or x 1–4) on a 6-wide verge; joints in the middle of every open side. */
function weg(shape: Shape) {
  return () => {
    const L = shape === 'gerade' ? 8 : 6, p = new Plot([L, 3, 6]);
    const along = (x0: number, x1: number) => { for (let x = x0; x <= x1; x++) for (let z = 1; z <= 4; z++) pave(p, x, z); };
    const across = (z0: number, z1: number) => { for (let z = z0; z <= z1; z++) for (let x = 1; x <= 4; x++) pave(p, x, z); };
    if (shape === 'gerade') along(0, 7);
    if (shape === 'kurve') { along(0, 4); across(1, 5); }
    if (shape === 'kreuzung') { along(0, 5); across(0, 5); }
    if (shape === 'tstueck') { along(0, 5); across(1, 5); }
    if (shape === 'wendeplatz') { along(0, 4); across(1, 4); p.set(5, 0, 2, 'cobblestone'); p.set(5, 0, 3, 'cobblestone'); }
    for (let x = 0; x < L; x++) for (let z = 0; z < 6; z++) verge(p, x, z);
    if (shape === 'gerade') { lampPost(p, 0, 1, 0, 'oak_fence', 1); lampPost(p, 4, 1, 5, 'oak_fence', 1); }
    if (shape === 'kurve' || shape === 'tstueck') lampPost(p, 5, 1, 0, 'oak_fence', 1);
    if (shape === 'kreuzung') { lampPost(p, 0, 1, 0, 'oak_fence', 1); lampPost(p, 5, 1, 5, 'oak_fence', 1); }
    if (shape === 'wendeplatz') { p.set(5, 1, 1, 'oak_stairs', stairs('east')); p.set(5, 1, 4, 'oak_stairs', stairs('east')); lampPost(p, 5, 1, 0, 'oak_fence', 1); p.set(5, 1, 5, 'oak_sign', sign(4)); }
    return p.payload();
  };
}
const W = (id: string, pos: [number, number, number], n: [number, number, number]) => joint(id, pos, n, 'path_joint', PATH_PROFILE);
const WEG_JOINTS: Record<Shape, ReturnType<typeof joint>[]> = {
  gerade: [W('west', [0, 0, 3], [-1, 0, 0]), W('east', [8, 0, 3], [1, 0, 0])],
  kurve: [W('west', [0, 0, 3], [-1, 0, 0]), W('south', [3, 0, 6], [0, 0, 1])],
  kreuzung: [W('west', [0, 0, 3], [-1, 0, 0]), W('east', [6, 0, 3], [1, 0, 0]), W('north', [3, 0, 0], [0, 0, -1]), W('south', [3, 0, 6], [0, 0, 1])],
  tstueck: [W('west', [0, 0, 3], [-1, 0, 0]), W('east', [6, 0, 3], [1, 0, 0]), W('south', [3, 0, 6], [0, 0, 1])],
  wendeplatz: [W('west', [0, 0, 3], [-1, 0, 0])],
};

function laterne(kind: 'holz' | 'eisen' | 'seele') {
  return () => {
    const p = new Plot([3, 6, 3]);
    if (kind === 'holz') { p.set(1, 0, 1, 'cobblestone'); p.fill(1, 1, 1, 1, 3, 1, 'oak_fence'); p.set(1, 4, 1, 'oak_planks'); p.set(2, 4, 1, 'oak_fence'); p.set(2, 3, 1, 'lantern', lantern(true)); p.set(0, 4, 1, 'oak_fence'); p.set(0, 3, 1, 'lantern', lantern(true)); }
    if (kind === 'eisen') { p.set(1, 0, 1, 'smooth_stone'); p.fill(1, 1, 1, 1, 4, 1, 'iron_bars'); p.set(1, 5, 1, 'smooth_stone_slab', slab()); p.set(0, 4, 1, 'chain', chain('x')); p.set(0, 3, 1, 'lantern', lantern(true)); p.set(2, 4, 1, 'chain', chain('x')); p.set(2, 3, 1, 'lantern', lantern(true)); }
    if (kind === 'seele') { p.set(1, 0, 1, 'polished_blackstone'); p.fill(1, 1, 1, 1, 3, 1, 'blackstone_wall'); p.set(1, 4, 1, 'soul_lantern', lantern()); for (const [x, z] of [[0, 1], [2, 1], [1, 0], [1, 2]] as const) p.set(x, 0, z, 'polished_blackstone_slab', slab()); }
    return p.payload();
  };
}

function holzbruecke() {
  const p = new Plot([14, 5, 6]);
  for (let x = 0; x < 14; x++) {
    const h = Math.round(2 - Math.abs(x - 6.5) / 3.3);
    for (let z = 1; z <= 4; z++) p.set(x, h, z, 'spruce_planks');
    p.set(x, h + 1, 0, 'spruce_fence'); p.set(x, h + 1, 5, 'spruce_fence'); p.set(x, h, 0, 'spruce_log', axis('x')); p.set(x, h, 5, 'spruce_log', axis('x'));
  }
  for (const x of [3, 10]) for (const z of [0, 5]) { const top = Math.round(2 - Math.abs(x - 6.5) / 3.3); p.fill(x, 0, z, x, top - 1, z, 'stripped_spruce_log', axis('y')); }
  for (const x of [0, 13]) for (const z of [0, 5]) p.set(x, 2, z, 'lantern', lantern());
  return p.payload();
}

function aquaedukt() {
  const p = new Plot([16, 9, 3]);
  for (let x = 0; x < 16; x++) {
    p.set(x, 6, 0, 'stone_bricks'); p.set(x, 6, 2, 'stone_bricks'); p.set(x, 5, 1, 'stone_bricks'); p.set(x, 6, 1, 'water', water());
    p.set(x, 7, 0, 'stone_brick_slab', slab()); p.set(x, 7, 2, 'stone_brick_slab', slab());
  }
  for (const x0 of [0, 5, 10, 15]) p.fill(x0, 0, 0, x0, 5, 2, 'stone_bricks');
  for (const x0 of [0, 5, 10]) for (let z = 0; z <= 2; z++) { p.set(x0 + 1, 4, z, 'stone_brick_stairs', stairs('west', 'top')); p.set(x0 + 4, 4, z, 'stone_brick_stairs', stairs('east', 'top')); p.set(x0 + 2, 5, z, 'stone_bricks'); p.set(x0 + 3, 5, z, 'stone_bricks'); }
  return p.payload();
}

function netherportal() {
  const p = new Plot([8, 7, 5]);
  p.fill(0, 0, 0, 7, 0, 4, 'polished_blackstone_bricks'); p.fill(1, 0, 1, 6, 0, 3, 'blackstone');
  p.fill(2, 1, 2, 5, 5, 2, 'obsidian'); p.fill(3, 2, 2, 4, 4, 2, null);
  for (const x of [1, 6]) { p.fill(x, 1, 2, x, 3, 2, 'blackstone_wall'); p.set(x, 4, 2, 'soul_lantern', lantern()); }
  for (let x = 2; x <= 5; x++) { p.set(x, 1, 1, 'polished_blackstone_stairs', stairs('south')); p.set(x, 1, 3, 'polished_blackstone_stairs', stairs('north')); }
  p.set(2, 6, 2, 'polished_blackstone_slab', slab()); p.set(5, 6, 2, 'polished_blackstone_slab', slab()); p.fill(3, 6, 2, 4, 6, 2, 'gilded_blackstone');
  return p.payload();
}

function tunnelportal() {
  const p = new Plot([9, 8, 6]);
  p.blob(4, 3, 4, 4.5, 4, 3, 'stone', {}, false, (_x, y) => y >= 0);
  p.fill(2, 0, 0, 6, 0, 5, 'cobblestone'); p.fill(3, 1, 0, 5, 3, 5, null); p.fill(4, 4, 0, 4, 4, 5, null);
  for (const z of [0, 3]) { p.fill(2, 1, z, 2, 3, z, 'stone_bricks'); p.fill(6, 1, z, 6, 3, z, 'stone_bricks'); p.set(3, 4, z, 'stone_brick_stairs', stairs('west', 'top')); p.set(5, 4, z, 'stone_brick_stairs', stairs('east', 'top')); p.set(4, 5, z, 'chiseled_stone_bricks'); }
  p.set(3, 3, 1, 'wall_torch', facing('east')); p.set(5, 3, 1, 'wall_torch', facing('west'));
  for (let z = 0; z <= 5; z++) p.set(4, 1, z, 'rail', { shape: 'north_south', waterlogged: F });
  return p.payload();
}

function wegweiser() {
  const p = new Plot([3, 5, 3]);
  p.set(1, 0, 1, 'cobblestone'); p.fill(1, 1, 1, 1, 3, 1, 'spruce_fence'); p.set(1, 4, 1, 'spruce_log', axis('y'));
  p.set(0, 3, 1, 'spruce_wall_sign', { facing: 'west', waterlogged: F }); p.set(2, 3, 1, 'spruce_wall_sign', { facing: 'east', waterlogged: F });
  p.set(1, 2, 0, 'spruce_wall_sign', { facing: 'north', waterlogged: F }); p.set(1, 2, 2, 'spruce_wall_sign', { facing: 'south', waterlogged: F });
  return p.payload();
}

function hafenkran() {
  const p = new Plot([9, 13, 5]);
  p.fill(0, 0, 0, 4, 0, 4, 'spruce_planks');
  for (const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]] as const) p.fill(x, 1, z, x, 6, z, 'spruce_log', axis('y'));
  p.room(0, 0, 4, 4, 7, 9, 'spruce_planks'); p.fill(0, 6, 0, 4, 6, 4, 'spruce_planks');
  hipRoof(p, 0, 4, 0, 4, 10, 'dark_oak_stairs', 'dark_oak_slab');
  for (let x = 4; x <= 8; x++) p.set(x, 9, 2, 'spruce_log', axis('x'));
  p.fill(8, 4, 2, 8, 8, 2, 'chain', chain('y')); p.set(8, 3, 2, 'barrel', barrel()); p.set(7, 9, 2, 'spruce_log', axis('x'));
  p.fill(2, 1, 0, 2, 6, 0, 'ladder', { facing: 'south', waterlogged: F }); p.fill(2, 7, 0, 2, 8, 0, 'ladder', { facing: 'south', waterlogged: F });
  p.set(2, 7, 2, 'chest', chest('north')); p.set(2, 8, 2, 'lantern', lantern());
  for (const [x, z] of [[1, 1], [3, 3]] as const) p.set(x, 1, z, 'barrel', barrel());
  return p.payload();
}

const WEGE: BuildingSpec[] = ([['gerade', 'Gerade (8)'], ['kurve', 'Kurve'], ['kreuzung', 'Kreuzung'], ['tstueck', 'T-Stück'], ['wendeplatz', 'Wendeplatz']] as const).map(([shape, label]) => ({
  id: `bld_weg_${shape}`, name: `Weg: ${label}`, payload: weg(shape), tags: ['weg', 'pfad', 'kettenbar'],
  description: `Wegmodul „${label}“: 4 Blöcke breiter Pfad aus Trampelpfad, Kies und Bruchstein mit Grasrand${shape === 'gerade' ? ' und zwei Laternenpfählen' : ''}.`,
  facets: { kategorie: ['infrastruktur'], stil: ['rustikal', 'mittelalterlich'], biom: ['ueberall'], funktion: ['verbindung'] },
  family: { id: 'wegbau', label: 'Wege-Baukasten', variant: label },
  connectors: WEG_JOINTS[shape], assumed: ['minecraft:dirt'],
  tips: ['Gleicher Anschluss wie Steinbrücke und Hafensteg (weg_4): Wege, Brücken und Stege verbinden sich im Editor.', 'Trampelpfad mit der Schaufel auf Grasblöcken anlegen.'],
}));

const LATERNEN: BuildingSpec[] = ([['holz', 'Holz'], ['eisen', 'Eisen'], ['seele', 'Seelenfeuer']] as const).map(([kind, label]) => ({
  id: `bld_laterne_${kind}`, name: `Straßenlaterne (${label})`, payload: laterne(kind), tags: ['licht', 'straße', 'klein'],
  description: kind === 'holz' ? 'Doppelte Hängelaterne an einem Holzgalgen auf Bruchsteinfuß.' : kind === 'eisen' ? 'Schlanke Eisenlaterne mit zwei Laternen an Ketten.' : 'Schwarzsteinsäule mit blauer Seelenlaterne – hält Piglins nicht ab, sieht aber düster aus.',
  facets: { kategorie: ['dekoration'], stil: kind === 'seele' ? ['nether', 'fantasy'] : kind === 'eisen' ? ['modern', 'klassisch'] : ['mittelalterlich'], biom: kind === 'seele' ? ['nether', 'ueberall'] : ['ueberall'], funktion: ['beleuchtung'] },
  family: { id: 'strassenlaterne', label: 'Straßenlaterne', variant: label },
  tips: ['Licht ab Stufe 1 verhindert seit 1.18 Monsterspawns – Laternen alle 12 Blöcke reichen.'],
}));

export const INFRA_SPECS: readonly BuildingSpec[] = [
  ...WEGE,
  ...LATERNEN,
  { id: 'bld_holzbruecke', name: 'Holzbrücke', payload: holzbruecke, tags: ['brücke', 'bogen', 'holz'],
    description: 'Leicht gewölbte Holzbrücke aus Fichte mit Geländer, Stützpfählen und Laternen an beiden Enden.',
    facets: { kategorie: ['infrastruktur'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['verbindung'] },
    connectors: [W('west', [0, 0, 3], [-1, 0, 0]), W('east', [14, 0, 3], [1, 0, 0])],
    tips: ['Passt an den Wege-Baukasten (weg_4).'] },
  { id: 'bld_aquaedukt', name: 'Aquädukt', payload: aquaedukt, tags: ['wasser', 'bögen', 'kanal'],
    description: 'Steinernes Aquädukt mit drei Bögen und Wasserrinne – führt Wasser über Täler.',
    facets: { kategorie: ['infrastruktur'], stil: ['antik', 'klassisch'], biom: ['ueberall'], funktion: ['wasserquelle', 'verbindung'] },
    gaps: ['minecraft:water'], connectors: [joint('west', [0, 6, 1], [-1, 0, 0], 'water_joint', 'rinne_1'), joint('east', [16, 6, 1], [1, 0, 0], 'water_joint', 'rinne_1')],
    tips: ['Jede zweite Zelle als Quelle setzen, damit das Wasser steht statt fließt.'] },
  { id: 'bld_netherportal', name: 'Netherportal-Tor', payload: netherportal, tags: ['portal', 'obsidian', 'nether'],
    description: 'Gefasster Netherportal-Rahmen aus Obsidian auf Schwarzstein-Podest mit Seelenlaternen und vergoldetem Sturz.',
    facets: { kategorie: ['infrastruktur'], stil: ['nether', 'fantasy'], biom: ['ueberall', 'nether'], funktion: ['reisen'] },
    tips: ['Der Rahmen ist 4×5 Obsidian; mit Feuerzeug entzünden.', 'Netherkoordinaten = Oberwelt ÷ 8.'], inspiration: [WIKI('Nether_portal', 'Netherportal')] },
  { id: 'bld_tunnelportal', name: 'Tunnelportal', payload: tunnelportal, tags: ['tunnel', 'bogen', 'schiene'],
    description: 'Gemauerter Tunneleingang mit Bogen und Fackeln im Fels, Schiene führt hinein.',
    facets: { kategorie: ['infrastruktur'], stil: ['mittelalterlich', 'industriell'], biom: ['gebirge', 'hoehle'], funktion: ['verbindung', 'transport'] } },
  { id: 'bld_wegweiser', name: 'Wegweiser', payload: wegweiser, tags: ['schild', 'kreuzung', 'klein'],
    description: 'Fichtenpfahl mit vier Schildern in alle Himmelsrichtungen – zum Beschriften.',
    facets: { kategorie: ['dekoration'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['orientierung'] } },
  { id: 'bld_hafenkran', name: 'Hafenkran', payload: hafenkran, tags: ['hafen', 'kran', 'ladung'],
    description: 'Hölzerner Tretradkran-Turm mit Ausleger, Kette und Fass als Last; Lager im Kranhaus.',
    facets: { kategorie: ['infrastruktur'], stil: ['mittelalterlich', 'kuestenstil'], biom: ['kueste'], funktion: ['lagern', 'deko'] } },
];
