import type { BlockState, Cell } from '../../../../packages/voxel/src/index.js';
import type { ClosedCheck, WeldedMesh, Material3d, Mesh3d, MeshGroup3d, MeshStats, Rgb } from '../../../../packages/formats/src/index.js';
import { blockLook } from '../blockmodels/colors26.ts';
import { buildBlockMesh } from '../blockmodels/mesh.ts';
import type { BlockRenderer, SpriteLookup } from '../blockmodels/mesh.ts';
import { hashedColor, solidParts } from '../blockmodels/shapes.ts';
import type { SolidPart } from '../blockmodels/shapes.ts';

/**
 * 3D-Export (MODEL-01): baut aus Blöcken ein Dreiecksnetz für andere
 * Programme. Zwei Wege:
 *
 * - **Ansichtsmodell** – dieselbe Geometrie wie der Betrachter
 *   (`buildBlockMesh`): echte Blockformen nach Zustand, verdeckte Flächen
 *   weggelassen, Farben oder Texturen der geladenen Quelle, wahlweise mit
 *   eingebackener Flächenhelligkeit und Eckschatten. Für Blender, Spiele,
 *   AR-Ansichten (OBJ/MTL, glTF/GLB).
 * - **Druckmodell** – geschlossene Hülle aus einem Voxelgitter mit 1, 2 oder
 *   4 Zellen je Blockkante. Jeder Block trägt die geschlossenen Quader seiner
 *   eigenen Form (Platten, Treppen, Mauern, Zäune, Türen …) ein; Pflanzen,
 *   Schienen, Leitern und Flüssigkeiten haben kein Volumen. Danach optional
 *   Innenräume füllen, aushöhlen, kleine lose Teile entfernen, Kanten- und
 *   Eckberührungen verbinden. Für STL/3MF (und auf Wunsch OBJ/GLB).
 *
 * Mengen, Bauplan und Schem-Export lesen nie hieraus.
 *
 * Die Schreiber und Gitteroperationen kommen aus `packages/formats`
 * (`model3d.ts`, `printGrid.ts`) und werden übergeben: die Oberfläche reicht
 * die Quelle, die Node-Prüfungen den gebauten Kern (`dist`).
 */
export type FormatsApi = Pick<typeof import('../../../../packages/formats/src/index.js'),
  'checkClosed' | 'createPrintGrid' | 'fillCavities' | 'hollowGrid' | 'labelParts' | 'meshStats' | 'reduceMaterials' | 'removeSmallParts' | 'repairGrid'
  | 'safeName' | 'shellMesh' | 'weldMesh' | 'writeGlb' | 'writeObj' | 'writeStl' | 'write3mf' | 'writeZip' | 'deflateRaw'>;
export type ModelFormat = 'glb' | 'obj' | 'stl' | '3mf';
export type ModelKind = 'view' | 'print';


const FLUIDS = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const bare = (id: string) => id.startsWith('minecraft:') ? id.slice(10) : id;
const hexRgb = (h: string): Rgb => { const n = Number.parseInt(h.slice(1, 7), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const rgbHex = (c: readonly number[]) => c.slice(0, 3).map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

/** Durchschnittsfarbe eines Blocks (Seitenfläche) für Druckfarben. */
export function blockColor(id: string): Rgb {
  const ns = id.includes(':') ? id.slice(0, id.indexOf(':')) : 'minecraft';
  const look = ns === 'minecraft' ? blockLook(bare(id)) : undefined;
  return hexRgb(look?.side ?? hashedColor(id));
}

type BlockCell = Extract<Cell, { paletteIndex: number }>;
const blocksOf = (cells: readonly Cell[]): BlockCell[] => cells.filter((c): c is BlockCell => c.kind === 'block');
function bounds(cells: readonly Cell[]): { lo: [number, number, number]; hi: [number, number, number] } {
  const lo: [number, number, number] = [Infinity, Infinity, Infinity], hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const c of cells) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, c.position[i]!); hi[i] = Math.max(hi[i]!, c.position[i]!); }
  return { lo, hi };
}

// ------------------------------------------------------------------ view model
export interface ViewModelOptions {
  readonly name: string;
  /** Kantenlänge eines Blocks in Metern (glTF/OBJ). */
  readonly blockSize: number;
  /** center = Mitte unten auf 0/0/0, world = Minecraft-Koordinaten. */
  readonly place: 'center' | 'world';
  /** Flächenhelligkeit und Eckschatten als Eckpunktfarbe einbacken. */
  readonly bake: boolean;
}

export function viewModel(cells: readonly Cell[], palette: readonly BlockState[], renderer: BlockRenderer, sprites: SpriteLookup, textured: boolean, options: ViewModelOptions): Mesh3d & { readonly blocks: number } {
  const blocks = blocksOf(cells);
  if (!blocks.length) throw new Error('Keine Blöcke zum Exportieren.');
  const { lo, hi } = bounds(blocks);
  const origin: [number, number, number] = options.place === 'world' ? [0, 0, 0] : [(lo[0] + hi[0] + 1) / 2, lo[1], (lo[2] + hi[2] + 1) / 2];
  const m = buildBlockMesh(blocks, palette, renderer, sprites, origin, undefined, { light: false, ao: options.bake });
  const s = options.blockSize;
  const materials: Material3d[] = [], groups: MeshGroup3d[] = [];
  ([[m.solid, false], [m.translucent, true]] as const).forEach(([layer, glass]) => {
    const byKey = new Map<string, number[]>();
    for (let q = 0; q < layer.quads; q++) {
      const key = rgbHex([layer.colors[q * 12]!, layer.colors[q * 12 + 1]!, layer.colors[q * 12 + 2]!]);
      let list = byKey.get(key);
      if (!list) { list = []; byKey.set(key, list); }
      list.push(q);
    }
    for (const [key, quads] of [...byKey].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
      const material = materials.length;
      materials.push({
        name: `${glass ? 'glas' : 'block'}_${key}`, color: hexRgb(`#${key}`), opacity: glass && !textured ? 0.6 : 1, textured,
        alpha: glass ? 'blend' : textured ? 'mask' : 'opaque',
      });
      const n = quads.length, positions = new Float32Array(n * 12), normals = new Float32Array(n * 12), indices = new Uint32Array(n * 6);
      const uvs = textured ? new Float32Array(n * 8) : null, colors = options.bake ? new Float32Array(n * 12) : null;
      quads.forEach((q, k) => {
        const p = layer.positions, o = q * 12;
        const ux = p[o + 3]! - p[o]!, uy = p[o + 4]! - p[o + 1]!, uz = p[o + 5]! - p[o + 2]!, vx = p[o + 6]! - p[o]!, vy = p[o + 7]! - p[o + 1]!, vz = p[o + 8]! - p[o + 2]!;
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        for (let j = 0; j < 4; j++) {
          const d = k * 12 + j * 3, src = o + j * 3;
          positions[d] = p[src]! * s; positions[d + 1] = p[src + 1]! * s; positions[d + 2] = p[src + 2]! * s;
          normals[d] = nx; normals[d + 1] = ny; normals[d + 2] = nz;
          if (uvs) { uvs[k * 8 + j * 2] = layer.uvs[q * 8 + j * 2]!; uvs[k * 8 + j * 2 + 1] = layer.uvs[q * 8 + j * 2 + 1]!; }
          if (colors) {
            const li = q * 16 + j * 4, f = layer.light[li]! * layer.light[li + 1]!;
            colors[d] = layer.colors[src]! * f; colors[d + 1] = layer.colors[src + 1]! * f; colors[d + 2] = layer.colors[src + 2]! * f;
          }
        }
        const b = k * 4, i = k * 6;
        indices[i] = b; indices[i + 1] = b + 1; indices[i + 2] = b + 2; indices[i + 3] = b; indices[i + 4] = b + 2; indices[i + 5] = b + 3;
      });
      groups.push({ material, positions, normals, uvs, colors, indices });
    }
  });
  return { name: options.name, materials, groups, unit: 'meter', up: 'y', blocks: blocks.length };
}

// ------------------------------------------------------------------ print model
export interface PrintModelOptions {
  readonly name: string;
  /** Gitterzellen je Blockkante (Feinheit): 1 = ganze Blöcke, 2 = Platten/Stufen, 4 = Zäune, Türen, Teppiche. */
  readonly detail: 1 | 2 | 4;
  /** Kantenlänge eines Blocks in der Zieleinheit (mm bei Druck, m bei glTF/OBJ). */
  readonly blockSize: number;
  readonly unit: 'meter' | 'millimeter';
  readonly up: 'y' | 'z';
  /** Kleinteile unter 1/8 Block (Fackeln, Knöpfe, Teppiche, Druckplatten) mitnehmen. */
  readonly smallParts: boolean;
  /** Innenräume und Lufteinschlüsse füllen (massiv). */
  readonly fill: boolean;
  /** Aushöhlen auf diese Wandstärke in Gitterzellen; 0 = massiv lassen. */
  readonly hollow: number;
  /** Lose Teile unter dieser Zellzahl entfernen; 0 = alle behalten. */
  readonly minPart: number;
  /** Höchstens so viele Farben (3MF-Mehrfarbdruck); 0 = alle. */
  readonly maxColors: number;
}

export interface PrintReport {
  readonly blocks: number;
  /** Blöcke ohne Volumen (Pflanzen, Schienen …) bzw. als Kleinteile/Flüssigkeit weggelassen. */
  readonly skipped: number;
  readonly cellsFilled: number;
  readonly cellsHollowed: number;
  readonly repairCells: number;
  readonly removedParts: number;
  readonly parts: number;
  readonly colors: number;
  /** Flächen der Hülle nach dem Zusammenfassen (MODEL-01-S06). */
  readonly faces: number;
  /** Einheitsflächen vor dem Zusammenfassen. */
  readonly unitFaces: number;
  readonly check: ClosedCheck;
  /** Kantenlänge einer Gitterzelle in der Zieleinheit. */
  readonly cellSize: number;
}

export function printModel(f: FormatsApi, cells: readonly Cell[], palette: readonly BlockState[], options: PrintModelOptions, progress: Progress = () => {}): Mesh3d & { readonly report: PrintReport; readonly welded: WeldedMesh } {
  const blocks = blocksOf(cells);
  if (!blocks.length) throw new Error('Keine Blöcke zum Exportieren.');
  const d = options.detail, pad = 2;
  const { lo, hi } = bounds(blocks);
  const sx = (hi[0] - lo[0] + 1) * d + 2 * pad, sy = (hi[1] - lo[1] + 1) * d + 2 * pad, sz = (hi[2] - lo[2] + 1) * d + 2 * pad;
  const grid = f.createPrintGrid(sx, sy, sz);
  // Materials per block id (all states of a block share the colour).
  const materialOf = new Map<string, number>(), materials: Material3d[] = [], colors: Rgb[] = [];
  const shapeOf = new Map<number, readonly SolidPart[] | null>();
  const parts = (index: number): readonly SolidPart[] | null => {
    let hit = shapeOf.get(index);
    if (hit !== undefined) return hit;
    const state = palette[index];
    if (!state || FLUIDS.has(state.id)) hit = null;
    else {
      const list = solidParts(state.id, state.properties);
      const volume = list.reduce((v, b) => v + (Math.min(1, b[3]) - Math.max(0, b[0])) * (Math.min(1, b[4]) - Math.max(0, b[1])) * (Math.min(1, b[5]) - Math.max(0, b[2])), 0);
      hit = !list.length || (!options.smallParts && volume < 0.125) ? null : list;
    }
    shapeOf.set(index, hit);
    return hit;
  };
  const material = (id: string): number => {
    let m = materialOf.get(id);
    if (m === undefined) {
      m = materials.length; materialOf.set(id, m);
      const color = blockColor(id);
      colors.push(color);
      materials.push({ name: f.safeName(bare(id)), color, opacity: 1, textured: false, alpha: 'opaque' });
    }
    return m;
  };
  if (palette.length > 0xfffe) throw new Error('Zu viele Blockzustände für den Druckexport.');
  const a = sy * sz;
  // Sub-cell range along one axis covered by [p0, p1] (block units): at least half a cell, thin parts get one cell.
  const span = (p0: number, p1: number): [number, number] => {
    const c0 = Math.max(0, p0), c1 = Math.min(1, p1);
    if (c1 <= c0) return [0, -1];
    let i0: number = d, i1 = -1;
    for (let i = 0; i < d; i++) { const ov = Math.min(c1, (i + 1) / d) - Math.max(c0, i / d); if (ov >= 0.5 / d - 1e-9) { i0 = Math.min(i0, i); i1 = i; } }
    if (i1 < 0) { const k = Math.min(d - 1, Math.max(0, Math.floor(((c0 + c1) / 2) * d))); return [k, k]; }
    return [i0, i1];
  };
  let skipped = 0;
  progress('Druckgitter füllen', 0.05);
  for (const c of blocks) {
    const list = parts(c.paletteIndex);
    if (!list) { skipped++; continue; }
    const v = material(palette[c.paletteIndex]!.id) + 1;
    const bx = (c.position[0] - lo[0]) * d + pad, by = (c.position[1] - lo[1]) * d + pad, bz = (c.position[2] - lo[2]) * d + pad;
    for (const b of list) {
      const [x0, x1] = span(b[0], b[3]), [y0, y1] = span(b[1], b[4]), [z0, z1] = span(b[2], b[5]);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) grid.cells[(bx + x) * a + (by + y) * sz + bz + z] = v;
    }
  }
  if (skipped === blocks.length) throw new Error('Kein Block hat ein druckbares Volumen (nur Pflanzen, Schienen, Flüssigkeiten oder Kleinteile).');
  if (options.fill) progress('Innenräume füllen', 0.25);
  const cellsFilled = options.fill ? f.fillCavities(grid) : 0;
  if (options.hollow > 0) progress('Aushöhlen', 0.35);
  const cellsHollowed = options.hollow > 0 ? f.hollowGrid(grid, options.hollow) : 0;
  if (options.minPart > 0) progress('Kleine lose Teile entfernen', 0.42);
  const removed = options.minPart > 0 ? f.removeSmallParts(grid, options.minPart) : { removedParts: 0, removedCells: 0 };
  progress('Kanten- und Eckberührungen verbinden', 0.48);
  const repairCells = f.repairGrid(grid);
  const reduced = options.maxColors > 0 && materials.length > options.maxColors ? f.reduceMaterials(grid, colors, options.maxColors).kept : null;
  progress('Teile zählen', 0.55);
  const partCount = f.labelParts(grid).sizes.length;
  const cellSize = options.blockSize / d;
  progress('Hülle bauen', 0.6);
  const mesh = f.shellMesh(grid, { cellSize, unit: options.unit, up: options.up, name: options.name, materials });
  progress('Eckpunkte verschweißen', 0.75);
  const welded = f.weldMesh(mesh);
  progress('Druckprüfung (wasserdicht)', 0.82);
  const check = f.checkClosed(welded);
  const used = new Set(mesh.groups.map(g => g.material)).size;
  return {
    ...mesh, welded,
    report: {
      blocks: blocks.length, skipped, cellsFilled, cellsHollowed, repairCells, removedParts: removed.removedParts, parts: partCount,
      colors: reduced ?? used, faces: mesh.faces, unitFaces: mesh.unitFaces, check, cellSize,
    },
  };
}

// ------------------------------------------------------------------ files
export interface ModelFile { readonly name: string; readonly bytes: Uint8Array; readonly type: string }

export interface ExportRequest {
  readonly format: ModelFormat;
  readonly kind: ModelKind;
  readonly name: string;
  readonly cells: readonly Cell[];
  readonly palette: readonly BlockState[];
  /** Kantenlänge eines Blocks: Meter für GLB/OBJ, Millimeter für STL/3MF. */
  readonly blockSize: number;
  readonly view: { readonly renderer: BlockRenderer; readonly sprites: SpriteLookup; readonly textured: boolean; readonly place: 'center' | 'world'; readonly bake: boolean; readonly texturePng?: () => Promise<Uint8Array | null> };
  readonly print: Omit<PrintModelOptions, 'name' | 'blockSize' | 'unit' | 'up'>;
  /** Herkunftszeilen für Kommentare/Metadaten. */
  readonly source?: string;
  /** Fortschritt (Schritt, Anteil 0..1) für die Hintergrundberechnung (PERF-04). */
  readonly progress?: Progress;
}

export type Progress = (step: string, fraction: number) => void;

export interface ExportResult {
  readonly file: ModelFile;
  readonly stats: MeshStats;
  readonly materials: number;
  readonly unit: 'meter' | 'millimeter';
  readonly print: PrintReport | null;
  readonly textured: boolean;
  readonly blocks: number;
}

/** Erzeugt die Datei (bei OBJ ein ZIP mit OBJ, MTL und gegebenenfalls Textur-PNG). */
export async function exportModel(f: FormatsApi, req: ExportRequest): Promise<ExportResult> {
  const printFormat = req.format === 'stl' || req.format === '3mf';
  const kind: ModelKind = printFormat ? 'print' : req.kind;
  const unit = printFormat ? 'millimeter' : 'meter';
  const up = printFormat ? 'z' : 'y';
  const base = f.safeName(req.name);
  const comment = ['Minecraft-Bauplaner – 3D-Export', `Modell: ${req.name}`, ...(req.source ? [req.source] : []),
    `1 Block = ${req.blockSize} ${unit === 'meter' ? 'm' : 'mm'}`, kind === 'print' ? `Druckmodell, Feinheit ${req.print.detail} je Block` : 'Ansichtsmodell mit Blockformen'];
  let mesh: Mesh3d, print: PrintReport | null = null, blocks: number, welded: WeldedMesh | undefined;
  let textured = false;
  const progress: Progress = req.progress ?? (() => {});
  if (kind === 'view') {
    textured = req.view.textured;
    progress('Blockflächen bauen', 0.1);
    const v = viewModel(req.cells, req.palette, req.view.renderer, req.view.sprites, textured, { name: req.name, blockSize: req.blockSize, place: req.view.place, bake: req.view.bake });
    mesh = v; blocks = v.blocks;
  } else {
    const p = printModel(f, req.cells, req.palette, { ...req.print, name: req.name, blockSize: req.blockSize, unit, up }, progress);
    mesh = p; print = p.report; blocks = p.report.blocks; welded = p.welded;
  }
  progress('Datei schreiben', 0.9);
  const png = textured && req.view.texturePng ? await req.view.texturePng() : null;
  if (textured && !png) textured = false;
  let file: ModelFile;
  switch (req.format) {
    case 'glb':
      file = { name: `${base}.glb`, type: 'model/gltf-binary', bytes: f.writeGlb(mesh, { ...(png && { texturePng: png }), extras: { quelle: 'Minecraft-Bauplaner', modell: req.name, blockgroesse: req.blockSize, art: kind } }) };
      break;
    case 'obj': {
      const textureFile = png ? `${base}_bloecke.png` : undefined;
      const { obj, mtl } = f.writeObj(mesh, { mtlFile: `${base}.mtl`, ...(textureFile && { textureFile }), comment });
      const zip = await f.writeZip([
        { name: `${base}.obj`, data: obj }, { name: `${base}.mtl`, data: mtl },
        ...(png && textureFile ? [{ name: textureFile, data: png }] : []),
      ], { deflate: f.deflateRaw, date: new Date() });
      file = { name: `${base}_obj.zip`, type: 'application/zip', bytes: zip };
      break;
    }
    case 'stl':
      file = { name: `${base}.stl`, type: 'model/stl', bytes: f.writeStl(mesh, `Minecraft-Bauplaner ${base} mm`) };
      break;
    case '3mf':
      file = { name: `${base}.3mf`, type: 'model/3mf', bytes: await f.write3mf(mesh, { title: req.name, description: comment.join(' · '), deflate: f.deflateRaw, date: new Date(), ...(welded && { welded }) }) };
      break;
  }
  return { file, stats: f.meshStats(mesh), materials: mesh.materials.length, unit, print, textured, blocks };
}
