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

/**
 * Hülle zwischen belegten und leeren Zellen, Gruppen je Material, Eckpunkte je Gruppe geteilt.
 *
 * MODEL-01-S06: Einheitsflächen gleicher Richtung, Ebene und Farbe werden gierig zu Rechtecken
 * zusammengefasst (`merge`, Standard an). Damit keine T-Stöße entstehen, bekommt jedes Rechteck auf
 * seinem Rand jeden Eckpunkt eines anderen Rechtecks, der darauf liegt; ein solches Rechteck wird als
 * Fächer um seine Mitte trianguliert, sonst mit zwei Dreiecken. Jede Kante gehört weiter genau zwei
 * Dreiecken mit denselben Eckpunkten (wasserdicht, `checkClosed`).
 */
export function shellMesh(g: PrintGrid, options: ShellOptions & { readonly merge?: boolean }): Mesh3d & { readonly faces: number; readonly unitFaces: number } {
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
  const groupOf = (v: number): Acc => { let t = acc.get(v); if (!t) { t = { pos: [], idx: [], map: new Map() }; acc.set(v, t); } return t; };
  const vertex = (t: Acc, x: number, y: number, z: number): number => {
    const k = vkey(x, y, z);
    let id = t.map.get(k);
    if (id === undefined) { id = t.pos.length / 3; t.pos.push(...tx(x, y, z)); t.map.set(k, id); }
    return id;
  };
  let unitFaces = 0;
  // Rectangles: direction index, material, four corners (lattice points, counter-clockwise from outside).
  const rects: { v: number; c: [number, number, number][] }[] = [];
  for (let fi = 0; fi < 6; fi++) {
    const f = FACES[fi]!, k = f.d.findIndex(n => n !== 0), [ua, va] = k === 0 ? [1, 2] : k === 1 ? [0, 2] : [0, 1];
    const size = [sx, sy, sz] as const, U = size[ua]!, V = size[va]!;
    const off = f.d[0] * a + f.d[1] * b + f.d[2];
    const mask = new Uint16Array(U * V);
    for (let w = 1; w < size[k]! - 1; w++) {
      let has = false;
      for (let u = 1; u < U - 1; u++) for (let v = 1; v < V - 1; v++) {
        const p = [0, 0, 0]; p[k] = w; p[ua] = u; p[va] = v;
        const i = p[0]! * a + p[1]! * b + p[2]!, m = cells[i]!;
        const face = m && !cells[i + off] ? m : 0;
        mask[u * V + v] = face;
        if (face) { has = true; unitFaces++; }
      }
      if (!has) continue;
      const plane = w + (f.d[k]! > 0 ? 1 : 0);
      const emit = (u0: number, v0: number, u1: number, v1: number, m: number) => {
        rects.push({ v: m, c: f.c.map(cc => { const p: [number, number, number] = [0, 0, 0]; p[k] = plane; p[ua] = cc[ua] ? u1 : u0; p[va] = cc[va] ? v1 : v0; return p; }) });
      };
      for (let u = 1; u < U - 1; u++) for (let v = 1; v < V - 1; v++) {
        const m = mask[u * V + v]!;
        if (!m) continue;
        if (options.merge === false) { mask[u * V + v] = 0; emit(u, v, u + 1, v + 1, m); continue; }
        let v1 = v + 1;
        while (v1 < V - 1 && mask[u * V + v1] === m) v1++;
        let u1 = u + 1;
        grow: while (u1 < U - 1) { for (let t = v; t < v1; t++) if (mask[u1 * V + t] !== m) break grow; u1++; }
        for (let uu = u; uu < u1; uu++) for (let t = v; t < v1; t++) mask[uu * V + t] = 0;
        emit(u, v, u1, v1, m);
      }
    }
  }
  // Corner points on axis-parallel lines, to split the edges of neighbouring rectangles at the same points.
  const lines = [new Map<string, number[]>(), new Map<string, number[]>(), new Map<string, number[]>()];
  const lineKey = (axis: number, p: readonly number[]) => axis === 0 ? `${p[1]},${p[2]}` : axis === 1 ? `${p[0]},${p[2]}` : `${p[0]},${p[1]}`;
  for (const r of rects) for (const p of r.c) for (let axis = 0; axis < 3; axis++) {
    const key = lineKey(axis, p); let l = lines[axis]!.get(key); if (!l) lines[axis]!.set(key, l = []); l.push(p[axis]!);
  }
  for (const m of lines) for (const [key, l] of m) m.set(key, [...new Set(l)].sort((p, q) => p - q));
  const between = (from: readonly number[], to: readonly number[]): [number, number, number][] => {
    const axis = from[0] !== to[0] ? 0 : from[1] !== to[1] ? 1 : 2;
    const l = lines[axis]!.get(lineKey(axis, from)) ?? [];
    const lo = Math.min(from[axis]!, to[axis]!), hi = Math.max(from[axis]!, to[axis]!);
    // Binary search for the first value > lo.
    let i = 0, j = l.length;
    while (i < j) { const h = (i + j) >> 1; if (l[h]! <= lo) i = h + 1; else j = h; }
    const out: [number, number, number][] = [];
    for (; i < l.length && l[i]! < hi; i++) { const p = [...from] as [number, number, number]; p[axis] = l[i]!; out.push(p); }
    return from[axis]! < to[axis]! ? out : out.reverse();
  };
  for (const r of rects) {
    const t = groupOf(r.v);
    const ring: [number, number, number][] = [];
    for (let e = 0; e < 4; e++) { ring.push(r.c[e]!); ring.push(...between(r.c[e]!, r.c[(e + 1) % 4]!)); }
    const ids = ring.map(p => vertex(t, p[0], p[1], p[2]));
    if (ring.length === 4) { t.idx.push(ids[0]!, ids[1]!, ids[2]!, ids[0]!, ids[2]!, ids[3]!); continue; }
    // Fan around the centre: no sliver or degenerate triangles from the extra edge points.
    const c0 = r.c[0]!, c2 = r.c[2]!;
    const centre = t.pos.length / 3;
    t.pos.push(...tx((c0[0] + c2[0]) / 2, (c0[1] + c2[1]) / 2, (c0[2] + c2[2]) / 2));
    for (let n = 0; n < ids.length; n++) t.idx.push(centre, ids[n]!, ids[(n + 1) % ids.length]!);
  }
  const groups: MeshGroup3d[] = [...acc.entries()].sort((p, q) => p[0] - q[0]).map(([v, t]) => ({
    material: v - 1, positions: Float32Array.from(t.pos), normals: null, uvs: null, colors: null, indices: Uint32Array.from(t.idx),
  }));
  return { name: options.name, materials: options.materials, groups, unit: options.unit, up, faces: rects.length, unitFaces };
}
