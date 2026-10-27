import type { Cell, Vec3 } from '../../../../packages/voxel/src/index.js';

/** Linear RGB in 0..1, as the renderer expects it. */
export type Rgb = readonly [number, number, number];

/**
 * Preview mesh of exposed block faces. Only a face whose neighbour cell holds
 * no visible block is emitted; air, erase and unselected cells count as empty.
 * Purely a view artefact: materials and export never read this.
 */
export interface FaceMesh {
  /** Vertex positions relative to `origin`, four per quad. */
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly colors: Float32Array;
  /** Two triangles per quad. */
  readonly indices: Uint32Array;
  /** Quad → index into the input cell list (triangle t belongs to quad t >> 1). */
  readonly quadCells: Int32Array;
  readonly quads: number;
  readonly blocks: number;
  /** Quads an unculled cube per block would need (6 per block), for measurements. */
  readonly naiveQuads: number;
}

// Normal, then in-plane axes u, v with u × v = normal, so (0,u,u+v,v) is counter-clockwise from outside.
const FACES: readonly (readonly [Vec3, Vec3, Vec3])[] = [
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
];

export function buildFaces(cells: readonly Cell[], colorOf: (cell: Cell) => Rgb, origin: Vec3): FaceMesh {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  let blocks = 0;
  for (const c of cells) if (c.kind === 'block') {
    blocks++;
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, c.position[i]!); hi[i] = Math.max(hi[i]!, c.position[i]!); }
  }
  // Dense occupancy over the block bounds plus a one-cell margin; payload limits keep it small.
  const sx = blocks ? hi[0]! - lo[0]! + 3 : 0, sy = blocks ? hi[1]! - lo[1]! + 3 : 0, sz = blocks ? hi[2]! - lo[2]! + 3 : 0;
  const filled = new Uint8Array(sx * sy * sz);
  const at = (x: number, y: number, z: number) => ((x - lo[0]! + 1) * sy + (y - lo[1]! + 1)) * sz + (z - lo[2]! + 1);
  for (const c of cells) if (c.kind === 'block') filled[at(c.position[0], c.position[1], c.position[2])] = 1;

  let quads = 0;
  for (const c of cells) if (c.kind === 'block') {
    const [x, y, z] = c.position;
    for (const [n] of FACES) if (!filled[at(x + n[0], y + n[1], z + n[2])]) quads++;
  }
  const positions = new Float32Array(quads * 12), normals = new Float32Array(quads * 12), colors = new Float32Array(quads * 12);
  const indices = new Uint32Array(quads * 6), quadCells = new Int32Array(quads);
  let q = 0;
  cells.forEach((c, index) => {
    if (c.kind !== 'block') return;
    const [x, y, z] = c.position;
    let rgb: Rgb | null = null;
    for (const [n, u, v] of FACES) {
      if (filled[at(x + n[0], y + n[1], z + n[2])]) continue;
      rgb ??= colorOf(c);
      const bx = x - origin[0] + Math.max(0, n[0]), by = y - origin[1] + Math.max(0, n[1]), bz = z - origin[2] + Math.max(0, n[2]);
      for (let k = 0; k < 4; k++) {
        const du = k === 1 || k === 2 ? 1 : 0, dv = k >= 2 ? 1 : 0, o = q * 12 + k * 3;
        positions[o] = bx + u[0] * du + v[0] * dv; positions[o + 1] = by + u[1] * du + v[1] * dv; positions[o + 2] = bz + u[2] * du + v[2] * dv;
        normals[o] = n[0]; normals[o + 1] = n[1]; normals[o + 2] = n[2];
        colors[o] = rgb[0]; colors[o + 1] = rgb[1]; colors[o + 2] = rgb[2];
      }
      const i = q * 6, b = q * 4;
      indices[i] = b; indices[i + 1] = b + 1; indices[i + 2] = b + 2; indices[i + 3] = b; indices[i + 4] = b + 2; indices[i + 5] = b + 3;
      quadCells[q++] = index;
    }
  });
  return { positions, normals, colors, indices, quadCells, quads, blocks, naiveQuads: blocks * 6 };
}
