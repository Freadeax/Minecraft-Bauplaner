import { createPayload } from '../../voxel/src/validation.js';
import { stateKey } from '../../voxel/src/validation.js';
import type { BlockState, Cell, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { addAssetVersion, createAsset } from './library.js';
import { SAMPLE_PROFILE } from './samples.js';
import { facetTags } from './catalog.js';
import { FAMILY_PREFIX } from './catalog.js';
import type { Asset, AssetVersion } from './types.js';
import { PATH_PROFILE, WIKI, joint } from './build/spec.js';
import type { BuildingSpec, Inspiration } from './build/spec.js';
import { ALL_SET_SPECS } from './build/sets/index.js';
import { refinedSpec } from './build/refine.js';
import { gameReady } from './build/gameReady.js';
import { baumhaus, blockhuette, fachwerkhaus, kapelle, leuchtturm, scheune, schmiede, wachturm, wuestenhaus } from './build/sets/klassiker.js';

export { PATH_PROFILE };
export type { BuildingSpec, Inspiration };

/**
 * Gebäudevorschläge (B9): original synthetic buildings generated from code.
 * No imported world, no Minecraft textures, no third-party designs. Every state
 * with properties uses the exact schema of the B7 state catalogue so the
 * buildings rotate and mirror without unresolved states (tested).
 *
 * Declared values (category, style, biome, function) are stored as facet tags
 * and labelled "Angabe" in the UI; all numbers are computed by catalog.ts.
 */

type Props = Readonly<Record<string, string>>;
const F = 'false', T = 'true';

/** Small sparse grid with bounds check; later writes replace earlier ones. */
class Plot {
  private readonly cells = new Map<string, { position: Vec3; air: boolean; state?: BlockState }>();
  constructor(readonly size: readonly [number, number, number]) {}
  private put(x: number, y: number, z: number, value: { air: boolean; state?: BlockState }): void {
    if (![x, y, z].every((n, i) => Number.isInteger(n) && n >= 0 && n < this.size[i]!)) throw new Error(`Gebäudegenerator: ${x},${y},${z} außerhalb ${this.size.join('×')}`);
    this.cells.set(`${x},${y},${z}`, { position: [x, y, z], ...value });
  }
  set(x: number, y: number, z: number, id: string, properties: Props = {}): void {
    this.put(x, y, z, { air: false, state: { id: `minecraft:${id}`, properties: { ...properties } } });
  }
  /** Explicit air: the cell must be empty after building (clears terrain inside rooms). */
  air(x: number, y: number, z: number): void { this.put(x, y, z, { air: true }); }
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: string | null, properties: Props = {}): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) id === null ? this.air(x, y, z) : this.set(x, y, z, id, properties);
  }
  /** Perimeter of a rectangle on one layer. */
  ring(x0: number, z0: number, x1: number, z1: number, y: number, id: string, properties: Props = {}): void {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) this.set(x, y, z, id, properties);
  }
  get(x: number, y: number, z: number): BlockState | undefined { return this.cells.get(`${x},${y},${z}`)?.state; }
  has(x: number, y: number, z: number): boolean { return this.cells.has(`${x},${y},${z}`); }

  /** Sets fence/pane/wall arms from neighbours, like the game does on placement. */
  private connect(): void {
    const sides: readonly [string, number, number][] = [['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]];
    const connectable = (s: BlockState | undefined, self: BlockState): boolean => {
      if (!s) return false;
      const id = s.id.slice(10);
      if (/(_fence|_fence_gate)$/.test(self.id)) return /_fence(_gate)?$/.test(id) || isFull(id);
      return /(glass_pane|iron_bars|_wall)$/.test(id) || isFull(id);
    };
    for (const cell of this.cells.values()) {
      const s = cell.state;
      if (!s || !/(_fence|glass_pane|iron_bars|_wall)$/.test(s.id) || /_fence_gate$/.test(s.id)) continue;
      const [x, y, z] = cell.position, wall = s.id.endsWith('_wall');
      const props: Record<string, string> = { waterlogged: F };
      let count = 0;
      for (const [name, dx, dz] of sides) {
        const on = connectable(this.get(x + dx, y, z + dz), s);
        if (on) count++;
        props[name] = wall ? (on ? 'low' : 'none') : on ? T : F;
      }
      if (wall) {
        const straight = count === 2 && ((props.north !== 'none' && props.south !== 'none') || (props.east !== 'none' && props.west !== 'none'));
        props.up = straight && !this.get(x, y + 1, z) ? F : T;
      }
      cell.state = { id: s.id, properties: props };
    }
  }

  payload(): VoxelPayload {
    this.connect();
    const palette: BlockState[] = [{ id: 'minecraft:air', properties: {} }], index = new Map<string, number>([[stateKey(palette[0]!), 0]]);
    const cells: Cell[] = [];
    const sorted = [...this.cells.values()].sort((a, b) => a.position[1] - b.position[1] || a.position[2] - b.position[2] || a.position[0] - b.position[0]);
    for (const c of sorted) {
      if (c.air) { cells.push({ position: c.position, kind: 'air', paletteIndex: 0 }); continue; }
      const key = stateKey(c.state!);
      if (!index.has(key)) { index.set(key, palette.length); palette.push(c.state!); }
      cells.push({ position: c.position, kind: 'block', paletteIndex: index.get(key)! });
    }
    return gameReady(createPayload({ schemaVersion: 1, profileId: SAMPLE_PROFILE, bounds: { min: [0, 0, 0], maxExclusive: [...this.size] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] }));
  }
}

const FULL_PATTERN = /(_planks|_log|_wood|_bricks|_concrete|_terracotta|_wool|stone|cobblestone|sandstone|_block|glass)$/;
function isFull(id: string): boolean { return FULL_PATTERN.test(id) && !/(_slab|_stairs|_pane|_wall|_pressure_plate|_button)$/.test(id); }

// ------------------------------------------------------------ state helpers
type H = 'north' | 'east' | 'south' | 'west';
const stairs = (facing: H, half: 'bottom' | 'top' = 'bottom'): Props => ({ facing, half, shape: 'straight', waterlogged: F });
const slab = (type: 'bottom' | 'top' | 'double' = 'bottom'): Props => ({ type, waterlogged: F });
const axis = (a: 'x' | 'y' | 'z'): Props => ({ axis: a });
const facing = (f: H): Props => ({ facing: f });
const lantern = (hanging = false): Props => ({ hanging: hanging ? T : F, waterlogged: F });
const chest = (f: H): Props => ({ facing: f, type: 'single', waterlogged: F });
const furnace = (f: H): Props => ({ facing: f, lit: F });
const ladder = (f: H): Props => ({ facing: f, waterlogged: F });
const trapdoor = (f: H, half: 'top' | 'bottom' = 'bottom', open = false): Props => ({ facing: f, half, open: open ? T : F, powered: F, waterlogged: F });

function door(p: Plot, x: number, y: number, z: number, wood: string, f: H, hinge: 'left' | 'right' = 'left'): void {
  p.set(x, y, z, `${wood}_door`, { facing: f, half: 'lower', hinge, open: F, powered: F });
  p.set(x, y + 1, z, `${wood}_door`, { facing: f, half: 'upper', hinge, open: F, powered: F });
}
/** Bed from foot to head along `f`. */
function bed(p: Plot, x: number, y: number, z: number, color: string, f: H): void {
  const [dx, dz] = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }[f];
  p.set(x, y, z, `${color}_bed`, { facing: f, occupied: F, part: 'foot' });
  p.set(x + dx!, y, z + dz!, `${color}_bed`, { facing: f, occupied: F, part: 'head' });
}
// ------------------------------------------------------------ buildings

function dorfbrunnen(): VoxelPayload {
  const p = new Plot([5, 5, 5]);
  p.fill(0, 0, 0, 4, 0, 4, 'cobblestone'); p.ring(0, 0, 4, 4, 1, 'mossy_cobblestone');
  p.fill(1, 0, 1, 3, 1, 3, 'water', { level: '0' });
  for (const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]] as const) p.fill(x, 2, z, x, 3, z, 'oak_fence');
  p.fill(0, 4, 0, 4, 4, 4, 'oak_slab', slab()); p.set(2, 4, 2, 'oak_planks');
  p.set(2, 3, 2, 'lantern', lantern(true));
  return p.payload();
}

function marktstand(): VoxelPayload {
  const p = new Plot([5, 4, 3]);
  for (const [x, z] of [[0, 0], [4, 0], [0, 2], [4, 2]] as const) p.fill(x, 0, z, x, 2, z, 'spruce_fence');
  for (let x = 1; x <= 3; x++) p.set(x, 0, 0, 'barrel', { facing: 'up', open: F });
  p.set(1, 1, 0, 'carved_pumpkin', facing('north')); p.set(2, 1, 0, 'melon'); p.set(3, 1, 0, 'potted_red_tulip');
  p.set(2, 0, 2, 'chest', chest('north')); p.set(1, 0, 2, 'crafting_table'); p.set(3, 0, 2, 'hay_block', axis('y'));
  for (let x = 0; x <= 4; x++) for (let z = 0; z <= 2; z++) p.set(x, 3, z, x % 2 === 0 ? 'red_wool' : 'white_wool');
  p.set(2, 2, 1, 'lantern', lantern(true));
  return p.payload();
}

function gewaechshaus(): VoxelPayload {
  const p = new Plot([9, 5, 7]);
  p.fill(0, 0, 0, 8, 0, 6, 'stone_bricks');
  for (let x = 1; x <= 7; x++) for (let z = 1; z <= 5; z++) p.set(x, 0, z, x === 4 ? 'water' : 'farmland', x === 4 ? { level: '0' } : { moisture: '7' });
  for (let y = 1; y <= 3; y++) p.ring(0, 0, 8, 6, y, 'glass');
  for (const [x, z] of [[0, 0], [8, 0], [0, 6], [8, 6], [4, 6]] as const) p.fill(x, 1, z, x, 3, z, 'birch_log', axis('y'));
  p.fill(1, 1, 1, 7, 3, 5, null);
  for (let z = 1; z <= 5; z++) {
    for (const x of [1, 2, 3]) p.set(x, 1, z, 'wheat', { age: '7' });
    for (const x of [5, 6]) p.set(x, 1, z, 'carrots', { age: '7' });
    p.set(7, 1, z, 'potatoes', { age: '7' });
  }
  door(p, 4, 1, 0, 'birch', 'north');
  p.fill(0, 4, 0, 8, 4, 6, 'glass'); p.fill(0, 4, 3, 8, 4, 3, 'birch_slab', slab());
  p.set(4, 3, 3, 'lantern', lantern(true)); p.set(4, 4, 3, 'birch_planks');
  return p.payload();
}

function villa(): VoxelPayload {
  const p = new Plot([13, 8, 9]);
  p.fill(0, 0, 0, 12, 0, 8, 'smooth_stone'); p.fill(1, 0, 1, 11, 0, 7, 'smooth_quartz');
  for (let y = 1; y <= 3; y++) p.ring(0, 0, 12, 8, y, 'white_concrete');
  p.fill(1, 1, 0, 11, 3, 0, 'glass'); for (const x of [4, 8]) p.fill(x, 1, 0, x, 3, 0, 'white_concrete');
  p.fill(12, 2, 2, 12, 2, 6, 'glass_pane'); p.fill(0, 2, 2, 0, 2, 6, 'glass_pane');
  p.fill(1, 1, 1, 11, 3, 7, null);
  p.fill(6, 1, 0, 6, 2, 0, null); door(p, 6, 1, 0, 'dark_oak', 'north');
  p.fill(0, 4, 0, 12, 4, 8, 'smooth_quartz');
  for (let y = 5; y <= 6; y++) p.ring(0, 0, 8, 8, y, 'white_concrete');
  p.fill(1, 5, 0, 7, 6, 0, 'glass'); p.fill(8, 5, 2, 8, 6, 6, 'glass'); p.fill(1, 6, 8, 7, 6, 8, 'glass_pane');
  p.fill(1, 5, 1, 7, 6, 7, null);
  p.fill(0, 7, 0, 8, 7, 8, 'gray_concrete');
  for (let x = 9; x <= 12; x++) { p.set(x, 5, 0, 'glass_pane'); p.set(x, 5, 8, 'glass_pane'); }
  p.fill(12, 5, 1, 12, 5, 7, 'glass_pane');
  p.set(10, 5, 4, 'potted_bamboo'); p.set(11, 5, 6, 'potted_fern'); p.set(10, 5, 2, 'lantern', lantern());
  p.fill(1, 1, 4, 3, 1, 6, 'light_gray_carpet'); p.set(1, 1, 7, 'bookshelf'); p.set(2, 1, 7, 'bookshelf'); p.set(3, 1, 7, 'bookshelf');
  p.set(10, 1, 7, 'smoker', furnace('north')); p.set(11, 1, 7, 'barrel', { facing: 'up', open: F }); p.set(9, 1, 7, 'crafting_table');
  p.fill(11, 1, 1, 11, 4, 1, 'ladder', ladder('west'));
  bed(p, 2, 5, 6, 'light_gray', 'south'); bed(p, 4, 5, 6, 'light_gray', 'south'); p.set(6, 5, 7, 'chest', chest('north'));
  for (const [x, z] of [[2, 3], [10, 3]] as const) p.set(x, 3, z, 'lantern', lantern(true));
  p.set(4, 6, 4, 'lantern', lantern(true));
  return p.payload();
}

function iglu(): VoxelPayload {
  const p = new Plot([7, 4, 7]);
  const inside = (x: number, z: number, r: number) => (x - 3) ** 2 + (z - 3) ** 2 <= r * r + 0.5;
  for (let x = 0; x < 7; x++) for (let z = 0; z < 7; z++) {
    if (!inside(x, z, 3)) continue;
    p.set(x, 0, z, 'snow_block');
    if (!inside(x, z, 2)) p.set(x, 1, z, 'snow_block'); else p.air(x, 1, z);
    if (inside(x, z, 2.6)) { if (!inside(x, z, 1.6)) p.set(x, 2, z, 'snow_block'); else p.air(x, 2, z); }
    if (inside(x, z, 1.6)) p.set(x, 3, z, 'snow_block');
  }
  p.air(3, 1, 0); p.set(1, 2, 3, 'ice'); p.set(5, 2, 3, 'ice');
  p.set(3, 1, 3, 'white_carpet'); p.set(2, 1, 3, 'white_carpet'); p.set(4, 1, 3, 'white_carpet');
  bed(p, 2, 1, 4, 'white', 'east'); p.set(4, 1, 4, 'chest', chest('west'));
  p.set(4, 1, 2, 'furnace', furnace('west')); p.set(2, 1, 2, 'crafting_table'); p.set(3, 1, 2, 'lantern', lantern());
  return p.payload();
}

function steinbruecke(): VoxelPayload {
  const p = new Plot([13, 5, 4]);
  for (const x0 of [0, 11]) p.fill(x0, 0, 0, x0 + 1, 2, 3, 'stone_bricks');
  p.fill(0, 3, 0, 12, 3, 3, 'stone_bricks');
  for (let x = 2; x <= 10; x++) for (let z = 0; z <= 3; z++) p.set(x, 2, z, x === 2 ? 'stone_brick_stairs' : x === 10 ? 'stone_brick_stairs' : 'stone_bricks', x === 2 ? stairs('west', 'top') : x === 10 ? stairs('east', 'top') : {});
  for (let z = 0; z <= 3; z++) { p.set(2, 1, z, 'stone_brick_stairs', stairs('west', 'top')); p.set(10, 1, z, 'stone_brick_stairs', stairs('east', 'top')); }
  p.set(3, 0, 0, 'mossy_stone_bricks'); p.set(9, 0, 3, 'mossy_stone_bricks');
  for (let x = 0; x <= 12; x++) { p.set(x, 4, 0, 'stone_brick_wall'); p.set(x, 4, 3, 'stone_brick_wall'); }
  p.fill(0, 4, 1, 0, 4, 2, null); p.fill(12, 4, 1, 12, 4, 2, null);
  for (const x of [1, 11]) for (const z of [0, 3]) p.set(x, 4, z, 'lantern', lantern());
  for (const x of [4, 8]) { p.set(x, 3, 0, 'chiseled_stone_bricks'); p.set(x, 3, 3, 'chiseled_stone_bricks'); }
  return p.payload();
}

function hafensteg(): VoxelPayload {
  const p = new Plot([4, 4, 12]);
  for (const z of [0, 3, 6, 9, 11]) for (const x of [0, 3]) p.fill(x, 0, z, x, 1, z, 'stripped_oak_log', axis('y'));
  p.fill(0, 2, 0, 3, 2, 11, 'spruce_planks');
  for (let z = 1; z <= 11; z++) { p.set(0, 3, z, 'spruce_fence'); p.set(3, 3, z, 'spruce_fence'); }
  p.fill(1, 3, 11, 2, 3, 11, 'spruce_fence');
  p.set(0, 3, 11, 'lantern', lantern()); p.set(3, 3, 11, 'lantern', lantern()); p.set(0, 3, 0, 'lantern', lantern()); p.set(3, 3, 0, 'lantern', lantern());
  p.set(1, 3, 9, 'barrel', { facing: 'up', open: F }); p.set(2, 3, 9, 'chest', chest('west'));
  p.fill(1, 2, 5, 2, 2, 5, 'spruce_trapdoor', trapdoor('north', 'top'));
  return p.payload();
}

// ------------------------------------------------------------ catalogue

/** The 16 original B9 designs; nine were redrawn with the design kit in LIB-05 (build/sets/klassiker.ts). */
const CLASSIC_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_fachwerkhaus', name: 'Fachwerkhaus', payload: fachwerkhaus, tags: ['dorf', 'zweistöckig'],
    description: 'Zweistöckiges Wohnhaus mit Eichenfachwerk, Satteldach, Dachboden mit Schlafplatz und Leiter.',
    facets: { kategorie: ['wohnhaus'], stil: ['mittelalterlich'], biom: ['ebene', 'wald'], funktion: ['wohnen', 'lagern'] } },
  { id: 'bld_blockhuette', name: 'Blockhütte', payload: blockhuette, tags: ['hütte', 'schornstein'],
    description: 'Kleine Fichtenstamm-Hütte mit Satteldach und Bruchsteinschornstein für kalte Wälder.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal', 'nordisch'], biom: ['taiga', 'gebirge'], funktion: ['wohnen'] } },
  { id: 'bld_wuestenhaus', name: 'Wüstenhaus', payload: wuestenhaus, tags: ['flachdach', 'dachterrasse'],
    description: 'Sandsteinhaus mit Flachdach, Zinnenbrüstung, Klappläden und Leiter zur Dachterrasse.',
    facets: { kategorie: ['wohnhaus'], stil: ['wuestenstil'], biom: ['wueste', 'savanne'], funktion: ['wohnen'] } },
  { id: 'bld_leuchtturm', name: 'Leuchtturm', payload: leuchtturm, tags: ['turm', 'hafen', 'leuchtfeuer'],
    description: 'Rot-weiß gestreifter Leuchtturm mit Innenleiter, Aussichtsplattform, Laternenhaus und Blitzableiter.',
    facets: { kategorie: ['wahrzeichen'], stil: ['kuestenstil'], biom: ['kueste'], funktion: ['orientierung', 'aussicht'] } },
  { id: 'bld_dorfbrunnen', name: 'Dorfbrunnen', payload: dorfbrunnen, tags: ['dorfplatz', 'wasser'],
    description: 'Überdachter Brunnen mit Wasserbecken und Hängelaterne als Mittelpunkt eines Dorfplatzes.',
    facets: { kategorie: ['dekoration'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['wasserquelle', 'versammlung'] },
    gaps: ['minecraft:water'], tips: ['Wasser als Quelle setzen: zwei Eimer in gegenüberliegende Ecken füllen das Becken unendlich.'], inspiration: [WIKI('Village', 'Dorf')] },
  { id: 'bld_schmiede', name: 'Schmiede', payload: schmiede, tags: ['werkstatt', 'esse'],
    description: 'Offene Werkstatt mit Ofen, Schmelzofen, Amboss, Schmiedetisch und Schleifstein unter Pultdach.',
    facets: { kategorie: ['handwerk'], stil: ['mittelalterlich'], biom: ['ebene', 'wald', 'taiga'], funktion: ['handwerk', 'lagern'] },
    assumed: ['minecraft:cauldron'], tips: ['Der Löschtrog ist ein Kessel mit Wasser: Kessel setzen und mit einem Eimer füllen.'] },
  { id: 'bld_scheune', name: 'Scheune', payload: scheune, tags: ['bauernhof', 'heuboden', 'stall'],
    description: 'Große Scheune mit Tierboxen aus Zäunen, Heuboden mit Leiter und breitem Tor.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal'], biom: ['ebene', 'savanne'], funktion: ['tierhaltung', 'lagern'] } },
  { id: 'bld_marktstand', name: 'Marktstand', payload: marktstand, tags: ['markt', 'klein'],
    description: 'Kompakter Marktstand mit gestreiftem Wollbaldachin, Fass-Theke und Warenauslage.',
    facets: { kategorie: ['handel'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['handel', 'deko'] } },
  { id: 'bld_kapelle', name: 'Kapelle', payload: kapelle, tags: ['glockenturm', 'buntglas'],
    description: 'Steinkapelle mit Glockenturm, Buntglasfenstern, Bankreihen, Altar und Lesepult.',
    facets: { kategorie: ['sakral'], stil: ['mittelalterlich', 'klassisch'], biom: ['ebene', 'wald'], funktion: ['versammlung'] } },
  { id: 'bld_gewaechshaus', name: 'Gewächshaus', payload: gewaechshaus, tags: ['feld', 'glas'],
    description: 'Glasgewächshaus mit bewässerten Beeten für Weizen, Karotten und Kartoffeln.',
    facets: { kategorie: ['landwirtschaft'], stil: ['modern'], biom: ['ueberall'], funktion: ['landwirtschaft'] },
    gaps: ['minecraft:water'], assumed: ['minecraft:dirt'], tips: ['Wasser bewässert Ackerboden bis 4 Blöcke weit; Glasdach hält Monster fern und lässt Licht durch.'] },
  { id: 'bld_villa', name: 'Moderne Villa', payload: villa, tags: ['flachdach', 'terrasse', 'zweistöckig'],
    description: 'Zweistöckige Villa aus weißem Beton mit Glasfront, Dachterrasse und Schlafzimmer im Obergeschoss.',
    facets: { kategorie: ['wohnhaus'], stil: ['modern'], biom: ['ebene', 'kueste'], funktion: ['wohnen', 'aussicht'] } },
  { id: 'bld_iglu', name: 'Iglu', payload: iglu, tags: ['kuppel', 'klein'],
    description: 'Schneekuppel mit Eisfenstern, Bett, Ofen und Truhe für Schneebiome.',
    facets: { kategorie: ['wohnhaus'], stil: ['nordisch'], biom: ['schnee'], funktion: ['wohnen'] } },
  { id: 'bld_steinbruecke', name: 'Steinbrücke', payload: steinbruecke, tags: ['bogen', 'weg'],
    description: 'Steinziegelbrücke mit Bogen, Mauerbrüstung und Laternen; Weganschlüsse an beiden Enden.',
    facets: { kategorie: ['infrastruktur'], stil: ['mittelalterlich', 'klassisch'], biom: ['ueberall'], funktion: ['verbindung'] },
    connectors: [joint('west', [0, 3, 2], [-1, 0, 0], 'path_joint', PATH_PROFILE), joint('east', [13, 3, 2], [1, 0, 0], 'path_joint', PATH_PROFILE)] },
  { id: 'bld_hafensteg', name: 'Hafensteg', payload: hafensteg, tags: ['hafen', 'steg', 'weg'],
    description: 'Holzsteg auf Pfählen mit Geländer, Laternen und Ladeplatz am Ende; Weganschluss zur Landseite.',
    facets: { kategorie: ['infrastruktur'], stil: ['kuestenstil', 'rustikal'], biom: ['kueste'], funktion: ['verbindung', 'lagern'] },
    connectors: [joint('land', [2, 2, 0], [0, 0, -1], 'path_joint', PATH_PROFILE)] },
  { id: 'bld_wachturm', name: 'Holz-Wachturm', payload: wachturm, tags: ['turm', 'aussicht'],
    description: 'Offener Wachturm aus Eichenstämmen mit Leiter, Brüstung und Dach über der Plattform.',
    facets: { kategorie: ['befestigung'], stil: ['rustikal'], biom: ['wald', 'taiga', 'ebene'], funktion: ['verteidigung', 'aussicht'] } },
  { id: 'bld_baumhaus', name: 'Baumhaus', payload: baumhaus, tags: ['baum', 'versteck'],
    description: 'Hütte auf einem Tropenbaumstamm mit umlaufender Veranda, Leiter und Blätterkrone.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal'], biom: ['dschungel', 'wald'], funktion: ['wohnen', 'aussicht'] } },
];

export const BUILDING_SPECS: readonly BuildingSpec[] = [...CLASSIC_SPECS.map(refinedSpec), ...ALL_SET_SPECS];

/** Plain tags, facet tags and the family tag of a spec. */
export function specTags(spec: BuildingSpec): string[] {
  return [...spec.tags, ...facetTags(spec.facets), ...(spec.family ? [`${FAMILY_PREFIX}${spec.family.id}`] : [])];
}
const FAMILY_LABEL = new Map(BUILDING_SPECS.filter(s => s.family).map(s => [s.family!.id, s.family!.label]));
export function familyLabel(id: string): string { return FAMILY_LABEL.get(id) ?? id; }

export interface BuildingInfo {
  readonly family?: { readonly id: string; readonly label: string; readonly variant: string };
  readonly tips: readonly string[];
  readonly inspiration: readonly Inspiration[];
  /** Asset ids of the other members of the variant family, in catalogue order. */
  readonly variants: readonly { readonly assetId: string; readonly variant: string }[];
}
const BY_ID = new Map(BUILDING_SPECS.map(s => [s.id, s]));
/** Static design information of a shipped building (undefined for own assets). */
export function buildingInfo(assetId: string): BuildingInfo | undefined {
  const spec = BY_ID.get(assetId);
  if (!spec) return undefined;
  const variants = spec.family ? BUILDING_SPECS.filter(s => s.family?.id === spec.family!.id).map(s => ({ assetId: s.id, variant: s.family!.variant })) : [];
  return { ...(spec.family && { family: spec.family }), tips: spec.tips ?? [], inspiration: spec.inspiration ?? [], variants };
}

export interface BuildingLibrary { readonly assets: readonly Asset[]; readonly versions: readonly AssetVersion[] }

const PROVENANCE = { author: 'Minecraft-Bauplaner', source: 'eigener synthetischer Entwurf (Gebäudegenerator)', license: 'frei für dieses Projekt' };

/** Builds every shipped building as demo asset with one immutable version 1.0. `onProgress` gets (done, total) after each building. */
export async function createBuildingLibrary(onProgress?: (done: number, total: number) => void): Promise<BuildingLibrary> {
  const assets: Asset[] = [], versions: AssetVersion[] = [];
  for (const spec of BUILDING_SPECS) {
    const asset = createAsset({ id: spec.id, name: spec.name, description: spec.description, tags: specTags(spec), provenance: PROVENANCE, demo: true });
    const r = await addAssetVersion(asset, { payload: spec.payload(), label: '1.0', connectors: spec.connectors ?? [], source: { format: 'demo' } });
    assets.push(r.asset); versions.push(r.version);
    onProgress?.(versions.length, BUILDING_SPECS.length);
  }
  return { assets, versions };
}
