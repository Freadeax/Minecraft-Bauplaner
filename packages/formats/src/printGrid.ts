/**
 * Druckhülle aus einem Voxelgitter (MODEL-01, Ideen wie Mineways): Das
 * Gitter hält je Zelle ein Material (0 = leer). Daraus entsteht eine
 * geschlossene, mannigfaltige Hülle aus Einheitsflächen – jede Kante gehört
 * genau zwei Flächen, Normalen zeigen nach außen, keine T-Stöße. Vorher
 * lassen sich eingeschlossene Lufträume füllen, das Innere bis auf eine
 * Wandstärke aushöhlen, kleine lose Teile entfernen und Stellen, an denen
 * sich Zellen nur an einer Kante oder Ecke berühren, mit einer Zelle
 * verbinden (sonst ist die Hülle nicht druckbar).
 *
 * Zellindex = (x · sy + y) · sz + z. Die äußerste Zellschicht muss leer
 * bleiben; Erzeuger lassen dafür einen Rand von mindestens einer Zelle.
 */
import type { Material3d, Mesh3d, MeshGroup3d } from './model3d.js';

export interface PrintGrid {
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
  /** Material + 1 je Zelle, 0 = leer. */
  readonly cells: Uint16Array;
}

/** Größtes Gitter (Zellen), das die Druckhülle verarbeitet (~100 MB Arbeitsspeicher). */
export const PRINT_GRID_LIMIT = 48_000_000;

export function createPrintGrid(sx: number, sy: number, sz: number): PrintGrid {
  const n = sx * sy * sz;
  if (!(sx > 0 && sy > 0 && sz > 0)) throw new Error('Leeres Druckgitter.');
  if (n > PRINT_GRID_LIMIT) throw new Error(`Druckgitter mit ${n.toLocaleString('de-DE')} Zellen ist zu groß (höchstens ${PRINT_GRID_LIMIT.toLocaleString('de-DE')}). Feinheit verringern oder einen kleineren Ausschnitt wählen.`);
  return { sx, sy, sz, cells: new Uint16Array(n) };
}

const onBorder = (g: PrintGrid, i: number): boolean => {
  const z = i % g.sz, y = Math.floor(i / g.sz) % g.sy, x = Math.floor(i / (g.sz * g.sy));
  return x === 0 || y === 0 || z === 0 || x === g.sx - 1 || y === g.sy - 1 || z === g.sz - 1;
};
const strides = (g: PrintGrid): readonly [number, number, number] => [g.sy * g.sz, g.sz, 1];

/** Material eines belegten Nachbarn (für neu gefüllte Zellen). */
function neighbourMaterial(g: PrintGrid, i: number): number {
  const [sx, sy] = strides(g);
  for (const d of [-sy, sy, -sx, sx, -1, 1]) { const v = g.cells[i + d]; if (v) return v; }
  return 0;
}

/** Füllt Luft, die von außen nicht erreichbar ist (Innenräume, Lufteinschlüsse). Ergebnis: Anzahl gefüllter Zellen. */
export function fillCavities(g: PrintGrid): number {
  const n = g.cells.length, outside = new Uint8Array(n), queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (let i = 0; i < n; i++) if (!g.cells[i] && onBorder(g, i)) { outside[i] = 1; queue[tail++] = i; }
  const [a, b] = strides(g), steps = [a, -a, b, -b, 1, -1];
  while (head < tail) {
    const i = queue[head++]!;
    for (const d of steps) {
      const j = i + d;
      if (j < 0 || j >= n || outside[j] || g.cells[j]) continue;
      // Wrap-around along z/y is impossible: border cells are empty and reached first.
      outside[j] = 1; queue[tail++] = j;
    }
  }
  // Fill from the walls inwards so each new cell takes a neighbouring material.
  head = 0; tail = 0;
  let filled = 0;
  for (let i = 0; i < n; i++) if (!g.cells[i] && !outside[i] && neighbourMaterial(g, i)) queue[tail++] = i;
  const seen = new Uint8Array(n);
  for (let k = 0; k < tail; k++) seen[queue[k]!] = 1;
  while (head < tail) {
    const i = queue[head++]!;
    if (g.cells[i]) continue;
    g.cells[i] = neighbourMaterial(g, i); filled++;
    for (const d of steps) { const j = i + d; if (j >= 0 && j < n && !g.cells[j] && !outside[j] && !seen[j]) { seen[j] = 1; queue[tail++] = j; } }
  }
  return filled;
}

/**
 * Höhlt aus: entfernt belegte Zellen, deren Abstand (Schritte über Flächen)
 * zur nächsten leeren Zelle größer als `wall` ist. Ergebnis: entfernte Zellen.
 */
export function hollowGrid(g: PrintGrid, wall: number): number {
  if (wall < 1) throw new Error('Wandstärke mindestens eine Zelle.');
  const n = g.cells.length, dist = new Uint16Array(n).fill(0xffff), queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (let i = 0; i < n; i++) if (!g.cells[i]) { dist[i] = 0; queue[tail++] = i; }
  const [a, b] = strides(g), steps = [a, -a, b, -b, 1, -1];
  while (head < tail) {
    const i = queue[head++]!, nd = dist[i]! + 1;
    if (nd > wall) continue;
    for (const d of steps) { const j = i + d; if (j >= 0 && j < n && dist[j]! > nd) { dist[j] = nd; queue[tail++] = j; } }
  }
  let removed = 0;
  for (let i = 0; i < n; i++) if (g.cells[i] && dist[i]! > wall) { g.cells[i] = 0; removed++; }
  return removed;
}

/** Zusammenhängende Teile (über Flächen verbunden). */
export function labelParts(g: PrintGrid): { readonly labels: Int32Array; readonly sizes: readonly number[] } {
  const n = g.cells.length, labels = new Int32Array(n).fill(-1), queue = new Int32Array(n), sizes: number[] = [];
  const [a, b] = strides(g), steps = [a, -a, b, -b, 1, -1];
  for (let s = 0; s < n; s++) {
    if (!g.cells[s] || labels[s]! >= 0) continue;
    const id = sizes.length;
    let head = 0, tail = 0;
    labels[s] = id; queue[tail++] = s;
    while (head < tail) {
      const i = queue[head++]!;
      for (const d of steps) { const j = i + d; if (j >= 0 && j < n && g.cells[j] && labels[j]! < 0) { labels[j] = id; queue[tail++] = j; } }
    }
    sizes.push(tail);
  }
  return { labels, sizes };
}

/** Entfernt lose Teile mit weniger als `minCells` Zellen (das größte Teil bleibt immer). */
export function removeSmallParts(g: PrintGrid, minCells: number): { removedParts: number; removedCells: number } {
  const { labels, sizes } = labelParts(g);
  const largest = sizes.reduce((best, s, i) => s > (sizes[best] ?? -1) ? i : best, 0);
  const drop = sizes.map((s, i) => i !== largest && s < minCells);
  let removedCells = 0;
  for (let i = 0; i < g.cells.length; i++) if (g.cells[i] && drop[labels[i]!]) { g.cells[i] = 0; removedCells++; }
  return { removedParts: drop.filter(Boolean).length, removedCells };
}

// 2×2×2-Fenster: Zelle b = dx + 2·dy + 4·dz. Mannigfaltig, wenn belegte und leere Zellen je über Flächen zusammenhängen.
const CONNECTED = new Uint8Array(256);
const FIX = new Int8Array(256).fill(-1);
(function tables() {
  const connected = (set: number): boolean => {
    if (!set) return true;
    let seen = set & -set, grow = true;
    while (grow) {
      grow = false;
      for (let b = 0; b < 8; b++) if (seen & (1 << b)) for (const f of [1, 2, 4]) { const o = 1 << (b ^ f); if (set & o && !(seen & o)) { seen |= o; grow = true; } }
    }
    return seen === set;
  };
  for (let m = 0; m < 256; m++) {
    CONNECTED[m] = connected(m) && connected(~m & 255) ? 1 : 0;
    if (CONNECTED[m]) continue;
    // Repair: fill the empty cell with the most filled face neighbours (ties: lowest index).
    let best = -1, score = -1;
    for (let b = 0; b < 8; b++) {
      if (m & (1 << b)) continue;
      const s = [1, 2, 4].filter(f => m & (1 << (b ^ f))).length;
      if (s > score) { score = s; best = b; }
    }
    FIX[m] = best;
  }
})();

/**
 * Verbindet Zellen, die sich nur an einer Kante oder Ecke berühren, durch eine
 * zusätzliche Zelle, bis jede Kante und jede Ecke der Hülle mannigfaltig ist.
 * Ergebnis: Anzahl ergänzter Zellen.
 */
export function repairGrid(g: PrintGrid, maxRounds = 64): number {
  const { sx, sy, sz, cells } = g, [a, b] = strides(g);
  const off = [0, a, b, a + b, 1, a + 1, b + 1, a + b + 1];
  let added = 0;
  for (let round = 0; round < maxRounds; round++) {
    let changed = 0;
    for (let x = 0; x < sx - 1; x++) for (let y = 0; y < sy - 1; y++) {
      const base = x * a + y * b;
      for (let z = 0; z < sz - 1; z++) {
        const i = base + z;
        let m = 0;
        for (let k = 0; k < 8; k++) if (cells[i + off[k]!]) m |= 1 << k;
        if (CONNECTED[m]) continue;
        const fix = i + off[FIX[m]!]!;
        if (onBorder(g, fix)) continue;
        cells[fix] = neighbourMaterial(g, fix) || 1;
        changed++;
      }
    }
    added += changed;
    if (!changed) break;
  }
  return added;
}

/** Fasst seltene Materialien mit dem ähnlichsten häufigen zusammen (Mehrfarbdruck mit wenigen Filamenten). */
export function reduceMaterials(g: PrintGrid, colors: readonly (readonly [number, number, number])[], max: number): { readonly map: Uint16Array; readonly kept: number } {
  const count = new Float64Array(colors.length + 1);
  for (let i = 0; i < g.cells.length; i++) count[g.cells[i]!]!++;
  const used = colors.map((_, k) => k + 1).filter(v => count[v]! > 0).sort((p, q) => count[q]! - count[p]! || p - q);
  const keep = used.slice(0, Math.max(1, max));
  const map = new Uint16Array(colors.length + 1);
  for (let v = 1; v <= colors.length; v++) {
    if (keep.includes(v)) { map[v] = v; continue; }
    const c = colors[v - 1]!;
    let best = keep[0] ?? v, d = Infinity;
    for (const k of keep) { const o = colors[k - 1]!; const e = (c[0] - o[0]) ** 2 + (c[1] - o[1]) ** 2 + (c[2] - o[2]) ** 2; if (e < d) { d = e; best = k; } }
    map[v] = best;
  }
  for (let i = 0; i < g.cells.length; i++) if (g.cells[i]) g.cells[i] = map[g.cells[i]!]!;
  return { map, kept: keep.length };
}

export interface ShellOptions {
  /** Kantenlänge einer Zelle in der Zieleinheit. */
  readonly cellSize: number;
  readonly unit: 'meter' | 'millimeter';
  /** z = Druckprogramme (Minecraft-Y wird Z, Norden wird +Y). */
  readonly up: 'y' | 'z';
  readonly name: string;
  /** Material je Gitterwert − 1. */
  readonly materials: readonly Material3d[];
  /** Untere Ecke auf 0/0/0 legen (Druckbett); sonst Gitterzelle `origin` = 0/0/0. */
  readonly origin?: readonly [number, number, number];
}

// Corners per face (unit cube), counter-clockwise seen from outside.
const FACES: readonly { readonly d: readonly [number, number, number]; readonly c: readonly (readonly [number, number, number])[] }[] = [
  { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { d: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { d: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { d: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
  { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
];

/** Hülle aus Einheitsflächen zwischen belegten und leeren Zellen, Gruppen je Material, Eckpunkte je Gruppe geteilt. */
export function shellMesh(g: PrintGrid, options: ShellOptions): Mesh3d & { readonly faces: number } {
  const { sx, sy, sz, cells } = g, [a, b] = strides(g);
  let lo = [sx, sy, sz], any = false;
  for (let x = 0; x < sx; x++) for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) if (cells[x * a + y * b + z]) {
    any = true; if (x < lo[0]!) lo[0] = x; if (y < lo[1]!) lo[1] = y; if (z < lo[2]!) lo[2] = z;
  }
  if (!any) lo = [0, 0, 0];
  const origin = options.origin ?? lo;
  const s = options.cellSize, up = options.up;
  // Grid z grows to the south; with Z up the north side is +Y, keeping the solid right-handed.
  let hiZ = 0;
  if (up === 'z' && !options.origin) for (let i = 0; i < cells.length; i++) if (cells[i]) { const z = i % sz; if (z > hiZ) hiZ = z; }
  const tx = (x: number, y: number, z: number): [number, number, number] => up === 'y'
    ? [(x - origin[0]!) * s, (y - origin[1]!) * s, (z - origin[2]!) * s]
    : [(x - origin[0]!) * s, (options.origin ? -(z - origin[2]!) : hiZ + 1 - z) * s, (y - origin[1]!) * s];
  interface Acc { pos: number[]; idx: number[]; map: Map<number, number> }
  const acc = new Map<number, Acc>();
  const vkey = (x: number, y: number, z: number) => (x * (sy + 1) + y) * (sz + 1) + z;
  let faces = 0;
  for (let x = 1; x < sx - 1; x++) for (let y = 1; y < sy - 1; y++) for (let z = 1; z < sz - 1; z++) {
    const i = x * a + y * b + z, v = cells[i]!;
    if (!v) continue;
    for (const f of FACES) {
      if (cells[i + f.d[0] * a + f.d[1] * b + f.d[2]]) continue;
      let t = acc.get(v);
      if (!t) { t = { pos: [], idx: [], map: new Map() }; acc.set(v, t); }
      const ids = f.c.map(([cx, cy, cz]) => {
        const k = vkey(x + cx, y + cy, z + cz);
        let id = t!.map.get(k);
        if (id === undefined) { id = t!.pos.length / 3; t!.pos.push(...tx(x + cx, y + cy, z + cz)); t!.map.set(k, id); }
        return id;
      });
      t.idx.push(ids[0]!, ids[1]!, ids[2]!, ids[0]!, ids[2]!, ids[3]!);
      faces++;
    }
  }
  const groups: MeshGroup3d[] = [...acc.entries()].sort((p, q) => p[0] - q[0]).map(([v, t]) => ({
    material: v - 1, positions: Float32Array.from(t.pos), normals: null, uvs: null, colors: null, indices: Uint32Array.from(t.idx),
  }));
  return { name: options.name, materials: options.materials, groups, unit: options.unit, up, faces };
}
