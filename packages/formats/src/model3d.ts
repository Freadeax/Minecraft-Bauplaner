/**
 * 3D-Modelle für andere Programme (MODEL-01): ein neutrales Dreiecksnetz
 * mit Materialien und die Schreiber für OBJ/MTL, glTF-Binär (GLB), STL und
 * 3MF. Der Planer baut das Netz entweder aus der Blockdarstellung (echte
 * Blockformen, Farben oder Texturen) oder als geschlossene Druckhülle aus dem
 * Voxelgitter (`printGrid.ts`). Die Schreiber kennen keine Blöcke; sie
 * übernehmen Koordinaten, Einheiten und Achsen so, wie das Netz sie liefert.
 * Kein Browserframework, keine Abhängigkeiten.
 */
import { writeZip } from './zipWrite.js';

/** sRGB 0..1. */
export type Rgb = readonly [number, number, number];

export interface Material3d {
  /** Eindeutiger, dateisicherer Name (Buchstaben, Ziffern, _ und -). */
  readonly name: string;
  readonly color: Rgb;
  /** 1 = deckend. */
  readonly opacity: number;
  /** Fläche nutzt die Texturdatei (UVs im Netz). */
  readonly textured: boolean;
  /** opaque = deckend, mask = ausgeschnitten (Laub, Gitter), blend = durchscheinend (Glas, Wasser). */
  readonly alpha: 'opaque' | 'mask' | 'blend';
}

export interface MeshGroup3d {
  /** Index in `materials`. */
  readonly material: number;
  /** x, y, z je Eckpunkt. */
  readonly positions: Float32Array;
  /** Normale je Eckpunkt oder null (Schreiber rechnen Flächennormalen). */
  readonly normals: Float32Array | null;
  /** u, v je Eckpunkt (v nach unten wie im Texturatlas) oder null. */
  readonly uvs: Float32Array | null;
  /** r, g, b je Eckpunkt in sRGB 0..1 (eingebackene Helligkeit) oder null. */
  readonly colors: Float32Array | null;
  /** Drei Eckpunkte je Dreieck, gegen den Uhrzeigersinn von außen gesehen. */
  readonly indices: Uint32Array;
}

export interface Mesh3d {
  readonly name: string;
  readonly materials: readonly Material3d[];
  readonly groups: readonly MeshGroup3d[];
  /** Einheit der Koordinaten. */
  readonly unit: 'meter' | 'millimeter';
  /** Achse nach oben: y (Minecraft, glTF, OBJ) oder z (Druckprogramme, STL, 3MF). */
  readonly up: 'y' | 'z';
}

export interface MeshStats {
  readonly vertices: number;
  readonly triangles: number;
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export function meshStats(mesh: Mesh3d): MeshStats {
  let vertices = 0, triangles = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const g of mesh.groups) {
    vertices += g.positions.length / 3; triangles += g.indices.length / 3;
    for (let i = 0; i < g.positions.length; i += 3) for (let a = 0; a < 3; a++) {
      const v = g.positions[i + a]!;
      if (v < min[a]!) min[a] = v; if (v > max[a]!) max[a] = v;
    }
  }
  if (!vertices) return { vertices, triangles, min: [0, 0, 0], max: [0, 0, 0] };
  return { vertices, triangles, min: min as [number, number, number], max: max as [number, number, number] };
}

/** Alle Gruppen mit gemeinsamen Eckpunkten (gleiche Lage ⇒ ein Punkt), wie Druckprogramme sie zusammenführen. */
export interface WeldedMesh {
  readonly positions: Float64Array;
  /** Drei Punktindizes je Dreieck. */
  readonly triangles: Uint32Array;
  /** Material je Dreieck. */
  readonly materials: Uint32Array;
}

export function weldMesh(mesh: Mesh3d, tolerance = 1e-4): WeldedMesh {
  const stats = meshStats(mesh);
  const q = (v: number, a: number) => Math.round((v - stats.min[a]!) / tolerance);
  const range = [0, 1, 2].map(a => q(stats.max[a]!, a) + 1);
  // Numeric keys while the quantised box fits into 2^53, strings beyond (huge models at fine tolerance).
  const numeric = range[0]! * range[1]! * range[2]! < Number.MAX_SAFE_INTEGER;
  const index = new Map<number | string, number>(), pos: number[] = [];
  const triangles = new Uint32Array(stats.triangles * 3), materials = new Uint32Array(stats.triangles);
  let t = 0;
  for (const g of mesh.groups) {
    const local = new Int32Array(g.positions.length / 3).fill(-1);
    const id = (v: number): number => {
      let k = local[v]!;
      if (k >= 0) return k;
      const x = g.positions[v * 3]!, y = g.positions[v * 3 + 1]!, z = g.positions[v * 3 + 2]!;
      const key = numeric ? (q(x, 0) * range[1]! + q(y, 1)) * range[2]! + q(z, 2) : `${q(x, 0)},${q(y, 1)},${q(z, 2)}`;
      k = index.get(key) ?? -1;
      if (k < 0) { k = pos.length / 3; pos.push(x, y, z); index.set(key, k); }
      local[v] = k;
      return k;
    };
    for (let i = 0; i < g.indices.length; i += 3) {
      triangles[t * 3] = id(g.indices[i]!); triangles[t * 3 + 1] = id(g.indices[i + 1]!); triangles[t * 3 + 2] = id(g.indices[i + 2]!);
      materials[t] = g.material; t++;
    }
  }
  return { positions: Float64Array.from(pos), triangles, materials };
}

export interface ClosedCheck {
  /** Kanten mit nur einer angrenzenden Fläche (Loch). */
  readonly boundaryEdges: number;
  /** Kanten mit mehr als zwei Flächen (nicht mannigfaltig). */
  readonly nonManifoldEdges: number;
  /** Kanten, an denen beide Flächen gleich laufen (Normale verdreht). */
  readonly flippedEdges: number;
  /** Punkte, an denen sich Teile nur berühren (mehr als ein Flächenfächer). */
  readonly nonManifoldVertices: number;
  /** Dreiecke ohne Fläche (zusammenfallende Punkte). */
  readonly degenerate: number;
  /** Eingeschlossenes Volumen in Einheit³ (positiv bei Normalen nach außen). */
  readonly volume: number;
  /** Wasserdicht: geschlossen, mannigfaltig, einheitlich ausgerichtet. */
  readonly closed: boolean;
}

/** Prüft, ob das Netz eine geschlossene, ausgerichtete Hülle ist (Druckprüfung). */
export function checkClosed(mesh: Mesh3d | WeldedMesh): ClosedCheck {
  const w = 'groups' in mesh ? weldMesh(mesh) : mesh;
  const n = w.positions.length / 3, tri = w.triangles;
  let degenerate = 0, volume = 0;
  const p = w.positions;
  const T = tri.length;
  const valid = new Uint8Array(T / 3);
  for (let t = 0; t < T; t += 3) {
    const a = tri[t]!, b = tri[t + 1]!, c = tri[t + 2]!;
    if (a === b || b === c || a === c) { degenerate++; continue; }
    valid[t / 3] = 1;
    const ax = p[a * 3]!, ay = p[a * 3 + 1]!, az = p[a * 3 + 2]!, bx = p[b * 3]!, by = p[b * 3 + 1]!, bz = p[b * 3 + 2]!, cx = p[c * 3]!, cy = p[c * 3 + 1]!, cz = p[c * 3 + 2]!;
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  // Outgoing directed edges per vertex (compressed rows): corner c is the edge tri[c] → next corner.
  const next = (c: number) => c - (c % 3) + ((c % 3) + 1) % 3;
  const start = new Uint32Array(n + 1);
  for (let c = 0; c < T; c++) if (valid[(c / 3) | 0]) start[tri[c]! + 1]!++;
  for (let v = 0; v < n; v++) start[v + 1]! += start[v]!;
  const fillAt = start.slice(0, n), corners = new Uint32Array(start[n]!);
  for (let c = 0; c < T; c++) if (valid[(c / 3) | 0]) corners[fillAt[tri[c]!]!++] = c;
  /** First corner whose edge runs u → v, and how many there are. */
  const edge = (u: number, v: number): [number, number] => {
    let first = -1, count = 0;
    for (let k = start[u]!; k < start[u + 1]!; k++) { const c = corners[k]!; if (tri[next(c)] === v) { if (first < 0) first = c; count++; } }
    return [first, count];
  };
  // Vertex fans: corners joined across each shared edge; one fan per vertex when manifold.
  const parent = new Int32Array(T).map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]!]!; i = parent[i]!; } return i; };
  let boundaryEdges = 0, nonManifoldEdges = 0, flippedEdges = 0;
  for (let c = 0; c < T; c++) {
    if (!valid[(c / 3) | 0]) continue;
    const u = tri[c]!, v = tri[next(c)]!;
    const [first, count] = edge(u, v), [twin, back] = edge(v, u);
    if (twin >= 0) {
      // The twin's corner at u follows its corner at v.
      const a = find(c), b = find(next(twin));
      if (a !== b) parent[a] = b;
    }
    if (first !== c || (back && v < u)) continue; // each undirected edge once
    const total = count + back;
    if (total === 1) boundaryEdges++;
    else if (total > 2) nonManifoldEdges++;
    else if (count !== 1) flippedEdges++;
  }
  const fan = new Int32Array(n).fill(-1);
  let nonManifoldVertices = 0;
  for (let c = 0; c < T; c++) {
    if (!valid[(c / 3) | 0]) continue;
    const v = tri[c]!, r = find(c), seen = fan[v]!;
    if (seen === -1) fan[v] = r;
    else if (seen >= 0 && seen !== r) { nonManifoldVertices++; fan[v] = -2; }
  }
  return {
    boundaryEdges, nonManifoldEdges, flippedEdges, nonManifoldVertices, degenerate, volume,
    closed: boundaryEdges === 0 && nonManifoldEdges === 0 && flippedEdges === 0 && nonManifoldVertices === 0 && degenerate === 0,
  };
}

// ------------------------------------------------------------------ helpers
const enc = new TextEncoder();
/** Kurze Dezimalzahl ohne Exponent (OBJ/3MF lesen keine Exponenten zuverlässig). */
export function num(v: number, digits = 5): string {
  if (!Number.isFinite(v)) return '0';
  const s = v.toFixed(digits);
  // Trailing zeros off: "1.50000" → "1.5", "2.00000" → "2", "-0.00000" → "0".
  let end = s.length;
  if (s.includes('.')) { while (s[end - 1] === '0') end--; if (s[end - 1] === '.') end--; }
  const out = s.slice(0, end);
  return out === '-0' ? '0' : out;
}
/** Text in Stücken sammeln: ein einziger riesiger String ist bei Millionen Zeilen langsam. */
class TextSink {
  private parts: Uint8Array[] = []; private buf: string[] = []; private len = 0;
  add(line: string): void { this.buf.push(line); this.len += line.length; if (this.len > 1 << 20) this.flush(); }
  private flush(): void { if (this.buf.length) { this.parts.push(enc.encode(this.buf.join(''))); this.buf = []; this.len = 0; } }
  bytes(): Uint8Array {
    this.flush();
    const total = this.parts.reduce((s, p) => s + p.length, 0), out = new Uint8Array(total);
    let o = 0; for (const p of this.parts) { out.set(p, o); o += p.length; }
    return out;
  }
}
const faceNormal = (p: Float32Array | Float64Array, a: number, b: number, c: number): [number, number, number] => {
  const ux = p[b * 3]! - p[a * 3]!, uy = p[b * 3 + 1]! - p[a * 3 + 1]!, uz = p[b * 3 + 2]! - p[a * 3 + 2]!;
  const vx = p[c * 3]! - p[a * 3]!, vy = p[c * 3 + 1]! - p[a * 3 + 1]!, vz = p[c * 3 + 2]! - p[a * 3 + 2]!;
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
};
export const safeName = (s: string): string => s.normalize('NFKD').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'modell';
const hex = (c: Rgb): string => c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
/** sRGB → linear (glTF-Farben und COLOR_0 sind linear). */
export const toLinear = (v: number): number => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

// ------------------------------------------------------------------ OBJ / MTL
export interface ObjOptions {
  /** Dateiname der Materialdatei, auf den das OBJ verweist. */
  readonly mtlFile: string;
  /** Dateiname der Texturdatei für texturierte Materialien. */
  readonly textureFile?: string;
  /** Kommentarzeilen am Dateianfang. */
  readonly comment?: readonly string[];
}

/** Wavefront OBJ mit MTL. Eckpunktfarben (eingebackene Helligkeit) als verbreitete Erweiterung `v x y z r g b`. */
export function writeObj(mesh: Mesh3d, options: ObjOptions): { obj: Uint8Array; mtl: Uint8Array } {
  const o = new TextSink();
  for (const c of options.comment ?? []) o.add(`# ${c}\n`);
  o.add(`# Einheit: ${mesh.unit === 'meter' ? 'Meter' : 'Millimeter'}, oben = ${mesh.up.toUpperCase()}\n`);
  o.add(`mtllib ${options.mtlFile}\no ${safeName(mesh.name)}\n`);
  let vBase = 1, tBase = 1, nBase = 1;
  for (const g of mesh.groups) {
    const m = mesh.materials[g.material]!, count = g.positions.length / 3;
    o.add(`g ${m.name}\nusemtl ${m.name}\n`);
    for (let i = 0; i < count; i++) {
      const p = g.positions;
      o.add(g.colors
        ? `v ${num(p[i * 3]!)} ${num(p[i * 3 + 1]!)} ${num(p[i * 3 + 2]!)} ${num(g.colors[i * 3]!, 4)} ${num(g.colors[i * 3 + 1]!, 4)} ${num(g.colors[i * 3 + 2]!, 4)}\n`
        : `v ${num(p[i * 3]!)} ${num(p[i * 3 + 1]!)} ${num(p[i * 3 + 2]!)}\n`);
    }
    if (g.uvs) for (let i = 0; i < count; i++) o.add(`vt ${num(g.uvs[i * 2]!, 6)} ${num(1 - g.uvs[i * 2 + 1]!, 6)}\n`);
    if (g.normals) for (let i = 0; i < count; i++) o.add(`vn ${num(g.normals[i * 3]!, 4)} ${num(g.normals[i * 3 + 1]!, 4)} ${num(g.normals[i * 3 + 2]!, 4)}\n`);
    const ref = (k: number) => {
      const v = vBase + k;
      if (g.uvs && g.normals) return `${v}/${tBase + k}/${nBase + k}`;
      if (g.uvs) return `${v}/${tBase + k}`;
      if (g.normals) return `${v}//${nBase + k}`;
      return `${v}`;
    };
    for (let i = 0; i < g.indices.length; i += 3) o.add(`f ${ref(g.indices[i]!)} ${ref(g.indices[i + 1]!)} ${ref(g.indices[i + 2]!)}\n`);
    vBase += count; if (g.uvs) tBase += count; if (g.normals) nBase += count;
  }
  const t = new TextSink();
  for (const c of options.comment ?? []) t.add(`# ${c}\n`);
  for (const m of mesh.materials) {
    const [r, g, b] = m.color;
    t.add(`\nnewmtl ${m.name}\nKa 0 0 0\nKd ${num(r, 4)} ${num(g, 4)} ${num(b, 4)}\nKs 0 0 0\nNs 0\nd ${num(m.opacity, 3)}\nTr ${num(1 - m.opacity, 3)}\nillum 1\n`);
    if (m.textured && options.textureFile) { t.add(`map_Kd ${options.textureFile}\n`); if (m.alpha !== 'opaque') t.add(`map_d ${options.textureFile}\n`); }
  }
  return { obj: o.bytes(), mtl: t.bytes() };
}

// ------------------------------------------------------------------ glTF binary
export interface GlbOptions {
  /** PNG der Texturen (nur für texturierte Materialien). */
  readonly texturePng?: Uint8Array;
  readonly generator?: string;
  /** Zusätzliche Angaben in `asset.extras` (Herkunft, Maßstab). */
  readonly extras?: Readonly<Record<string, unknown>>;
}

/** glTF 2.0 als eine GLB-Datei: ein Knoten, ein Mesh, eine Primitive je Gruppe, Textur eingebettet. */
export function writeGlb(mesh: Mesh3d, options: GlbOptions = {}): Uint8Array {
  if (mesh.up !== 'y') throw new Error('glTF verlangt Y nach oben.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  const bufferViews: Record<string, unknown>[] = [], accessors: Record<string, unknown>[] = [];
  const view = (bytes: Uint8Array, target?: number): number => {
    const pad = (4 - (length % 4)) % 4;
    if (pad) { chunks.push(new Uint8Array(pad)); length += pad; }
    bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.byteLength, ...(target !== undefined && { target }) });
    chunks.push(bytes); length += bytes.byteLength;
    return bufferViews.length - 1;
  };
  const accessor = (data: Float32Array | Uint32Array, type: 'VEC2' | 'VEC3' | 'SCALAR', withBounds: boolean, target: number): number => {
    const size = type === 'VEC3' ? 3 : type === 'VEC2' ? 2 : 1, count = data.length / size;
    const bv = view(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), target);
    const a: Record<string, unknown> = { bufferView: bv, componentType: data instanceof Float32Array ? 5126 : 5125, count, type };
    if (withBounds) {
      const min = new Array(size).fill(Infinity), max = new Array(size).fill(-Infinity);
      for (let i = 0; i < data.length; i++) { const k = i % size; if (data[i]! < min[k]) min[k] = data[i]!; if (data[i]! > max[k]) max[k] = data[i]!; }
      a.min = min; a.max = max;
    }
    accessors.push(a);
    return accessors.length - 1;
  };
  const useTexture = !!options.texturePng && mesh.materials.some(m => m.textured);
  const images: Record<string, unknown>[] = [], textures: Record<string, unknown>[] = [], samplers: Record<string, unknown>[] = [];
  if (useTexture) {
    images.push({ bufferView: view(options.texturePng!), mimeType: 'image/png', name: 'bloecke' });
    // Pixelgrafik: nächster Nachbar, kein Wiederholen über den Atlas hinaus.
    samplers.push({ magFilter: 9728, minFilter: 9728, wrapS: 33071, wrapT: 33071 });
    textures.push({ sampler: 0, source: 0 });
  }
  const materials = mesh.materials.map(m => {
    const lin = m.color.map(toLinear);
    const textured = useTexture && m.textured;
    return {
      name: m.name,
      pbrMetallicRoughness: { baseColorFactor: [lin[0], lin[1], lin[2], m.opacity], metallicFactor: 0, roughnessFactor: 1, ...(textured && { baseColorTexture: { index: 0 } }) },
      alphaMode: m.alpha === 'opaque' ? 'OPAQUE' : m.alpha === 'mask' ? (textured ? 'MASK' : 'OPAQUE') : 'BLEND',
      ...(m.alpha === 'mask' && textured && { alphaCutoff: 0.5 }),
    };
  });
  const primitives = mesh.groups.filter(g => g.indices.length).map(g => {
    const attributes: Record<string, number> = { POSITION: accessor(g.positions, 'VEC3', true, 34962) };
    if (g.normals) attributes.NORMAL = accessor(g.normals, 'VEC3', false, 34962);
    if (g.uvs && useTexture && mesh.materials[g.material]!.textured) attributes.TEXCOORD_0 = accessor(g.uvs, 'VEC2', false, 34962);
    if (g.colors) attributes.COLOR_0 = accessor(Float32Array.from(g.colors, toLinear), 'VEC3', false, 34962);
    return { attributes, indices: accessor(g.indices, 'SCALAR', false, 34963), material: g.material, mode: 4 };
  });
  const gltf: Record<string, unknown> = {
    asset: { version: '2.0', generator: options.generator ?? 'Minecraft-Bauplaner', ...(options.extras && { extras: options.extras }) },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: mesh.name, mesh: 0 }],
    meshes: [{ name: mesh.name, primitives }],
    materials, accessors, bufferViews,
    buffers: [{ byteLength: 0 }],
    ...(useTexture && { images, samplers, textures }),
  };
  const binPad = (4 - (length % 4)) % 4;
  if (binPad) { chunks.push(new Uint8Array(binPad)); length += binPad; }
  (gltf.buffers as { byteLength: number }[])[0]!.byteLength = length;
  let json = enc.encode(JSON.stringify(gltf));
  const jsonPad = (4 - (json.length % 4)) % 4;
  if (jsonPad) { const j = new Uint8Array(json.length + jsonPad).fill(0x20); j.set(json); json = j; }
  const total = 12 + 8 + json.length + (length ? 8 + length : 0);
  const out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, json.length, true); dv.setUint32(16, 0x4e4f534a, true); out.set(json, 20);
  if (length) {
    let o = 20 + json.length;
    dv.setUint32(o, length, true); dv.setUint32(o + 4, 0x004e4942, true); o += 8;
    for (const c of chunks) { out.set(c, o); o += c.length; }
  }
  return out;
}

// ------------------------------------------------------------------ STL
/** Binäres STL: Dreiecke mit Flächennormale, ohne Farben. */
export function writeStl(mesh: Mesh3d, header = 'Minecraft-Bauplaner'): Uint8Array {
  let count = 0;
  for (const g of mesh.groups) count += g.indices.length / 3;
  const out = new Uint8Array(84 + count * 50), dv = new DataView(out.buffer);
  out.set(enc.encode(header.replace(/^solid/i, 'Solid')).slice(0, 80));
  dv.setUint32(80, count, true);
  let o = 84;
  for (const g of mesh.groups) {
    const p = g.positions;
    for (let i = 0; i < g.indices.length; i += 3) {
      const a = g.indices[i]!, b = g.indices[i + 1]!, c = g.indices[i + 2]!, n = faceNormal(p, a, b, c);
      dv.setFloat32(o, n[0], true); dv.setFloat32(o + 4, n[1], true); dv.setFloat32(o + 8, n[2], true); o += 12;
      for (const v of [a, b, c]) { dv.setFloat32(o, p[v * 3]!, true); dv.setFloat32(o + 4, p[v * 3 + 1]!, true); dv.setFloat32(o + 8, p[v * 3 + 2]!, true); o += 12; }
      o += 2;
    }
  }
  return out;
}

/** Liest binäres STL (Prüfungen, Rundreise). */
export function readStl(bytes: Uint8Array): { triangles: number; positions: Float32Array; normals: Float32Array } {
  if (bytes.length < 84) throw new Error('STL zu kurz.');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), n = dv.getUint32(80, true);
  if (84 + n * 50 !== bytes.length) throw new Error('STL-Länge passt nicht zur Dreieckszahl.');
  const positions = new Float32Array(n * 9), normals = new Float32Array(n * 3);
  for (let t = 0; t < n; t++) {
    const o = 84 + t * 50;
    for (let k = 0; k < 3; k++) normals[t * 3 + k] = dv.getFloat32(o + k * 4, true);
    for (let k = 0; k < 9; k++) positions[t * 9 + k] = dv.getFloat32(o + 12 + k * 4, true);
  }
  return { triangles: n, positions, normals };
}

// ------------------------------------------------------------------ 3MF
export interface ThreeMfOptions {
  readonly title?: string;
  readonly designer?: string;
  readonly description?: string;
  /** Kompression für die ZIP-Einträge (deflate-raw); ohne wird gespeichert. */
  readonly deflate?: (bytes: Uint8Array) => Promise<Uint8Array>;
  readonly date?: Date;
  /** Bereits zusammengeführte Eckpunkte desselben Netzes (spart einen Durchlauf). */
  readonly welded?: WeldedMesh;
}
const xml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 3MF-Kern (Millimeter, Z oben): ein Objekt, gemeinsame Eckpunkte, Farbe je Dreieck über Grundmaterialien. */
export async function write3mf(mesh: Mesh3d, options: ThreeMfOptions = {}): Promise<Uint8Array> {
  if (mesh.up !== 'z') throw new Error('3MF verlangt Z nach oben.');
  const w = options.welded ?? weldMesh(mesh);
  const s = new TextSink();
  s.add('<?xml version="1.0" encoding="UTF-8"?>\n');
  s.add(`<model unit="${mesh.unit === 'meter' ? 'meter' : 'millimeter'}" xml:lang="de-DE" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n`);
  s.add(` <metadata name="Title">${xml(options.title ?? mesh.name)}</metadata>\n <metadata name="Application">Minecraft-Bauplaner</metadata>\n`);
  if (options.designer) s.add(` <metadata name="Designer">${xml(options.designer)}</metadata>\n`);
  if (options.description) s.add(` <metadata name="Description">${xml(options.description)}</metadata>\n`);
  s.add(' <resources>\n  <basematerials id="1">\n');
  for (const m of mesh.materials) s.add(`   <base name="${xml(m.name)}" displaycolor="#${hex(m.color)}" />\n`);
  s.add('  </basematerials>\n  <object id="2" type="model" pid="1" pindex="0">\n   <mesh>\n    <vertices>\n');
  const p = w.positions;
  for (let i = 0; i < p.length; i += 3) s.add(`     <vertex x="${num(p[i]!, 4)}" y="${num(p[i + 1]!, 4)}" z="${num(p[i + 2]!, 4)}" />\n`);
  s.add('    </vertices>\n    <triangles>\n');
  for (let t = 0; t < w.materials.length; t++) {
    s.add(`     <triangle v1="${w.triangles[t * 3]}" v2="${w.triangles[t * 3 + 1]}" v3="${w.triangles[t * 3 + 2]}" pid="1" p1="${w.materials[t]}" />\n`);
  }
  s.add('    </triangles>\n   </mesh>\n  </object>\n </resources>\n <build>\n  <item objectid="2" />\n </build>\n</model>\n');
  const types = '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
    + ' <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />\n'
    + ' <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />\n</Types>\n';
  const rels = '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
    + ' <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />\n</Relationships>\n';
  return writeZip([
    { name: '[Content_Types].xml', data: enc.encode(types) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: '3D/3dmodel.model', data: s.bytes() },
  ], { ...(options.deflate && { deflate: options.deflate }), ...(options.date && { date: options.date }) });
}
