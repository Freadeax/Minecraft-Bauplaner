import type { Bounds, Cell, Vec3, VoxelPayload } from './types.js';

/**
 * Compact storage form of a payload's cell list (STORE-03, ARCH-02).
 *
 * A `Cell` object costs about 56 bytes as JSON and noticeably more as a
 * structured-clone record; the shipped catalogue alone is 11 MB, a large
 * Litematic import far more. Storage (IndexedDB, backups) therefore keeps the
 * cells as one byte stream; everything else (palette, bounds, block entities,
 * hashes) stays readable JSON and unchanged.
 *
 * Encoding `bp-cells-1`, a sequence of runs, each three unsigned LEB128 varints:
 *   1. zigzag(delta) – linear index of the run's first cell minus the linear
 *      index of the previous cell (start value −1); linear index is
 *      (x−minX) + sizeX·((y−minY) + sizeY·(z−minZ)), as in the validator;
 *   2. tag – 0 = erase, 1 + 2·paletteIndex = air, 2 + 2·paletteIndex = block;
 *   3. run length − 1 – further cells, each at linear index +1 with the same tag.
 *
 * The original cell order is kept exactly (deltas may be negative), so the
 * canonical payload JSON – and with it `payloadHash` and every AssetVersion id –
 * is identical after decoding. `packCells` checks this by decoding again and
 * returns null for anything it cannot represent exactly; the caller then keeps
 * the plain list. Decoding validates every run against bounds and count.
 */
export const PACKED_CELLS_ENCODING = 'bp-cells-1';

export interface PackedCells {
  readonly encoding: typeof PACKED_CELLS_ENCODING;
  /** Number of decoded cells. */
  readonly count: number;
  readonly bytes: Uint8Array;
}

export class PackedCellsError extends Error {
  constructor(message: string) { super(`Gepackte Blockdaten: ${message}`); this.name = 'PackedCellsError'; }
}

class Writer {
  private buf = new Uint8Array(1024);
  length = 0;
  uint(value: number): void {
    if (this.length + 8 > this.buf.length) { const next = new Uint8Array(this.buf.length * 2); next.set(this.buf); this.buf = next; }
    let v = value;
    while (v >= 0x80) { this.buf[this.length++] = (v % 0x80) | 0x80; v = Math.floor(v / 0x80); }
    this.buf[this.length++] = v;
  }
  bytes(): Uint8Array { return this.buf.slice(0, this.length); }
}

const zigzag = (n: number) => n >= 0 ? n * 2 : -n * 2 - 1;
const unzigzag = (n: number) => n % 2 === 0 ? n / 2 : -(n + 1) / 2;

function geometry(bounds: Bounds) {
  const min = bounds.min, sx = bounds.maxExclusive[0] - min[0], sy = bounds.maxExclusive[1] - min[1], sz = bounds.maxExclusive[2] - min[2];
  return { min, sx, sy, sz, volume: sx * sy * sz };
}

const tagOf = (c: Cell): number => c.kind === 'erase' ? 0 : (c.kind === 'air' ? 1 : 2) + 2 * c.paletteIndex;

function plainCell(c: Cell, min: Vec3, sx: number, sy: number, sz: number): boolean {
  if (c === null || typeof c !== 'object') return false;
  const keys = Object.keys(c);
  if (c.kind === 'erase' ? keys.length !== 2 : keys.length !== 3 || !Number.isSafeInteger(c.paletteIndex) || c.paletteIndex < 0) return false;
  if (c.kind !== 'erase' && c.kind !== 'air' && c.kind !== 'block') return false;
  const p = c.position;
  if (!Array.isArray(p) || p.length !== 3) return false;
  const size = [sx, sy, sz];
  for (let a = 0; a < 3; a++) { const v = p[a]! - min[a]!; if (!Number.isSafeInteger(v) || v < 0 || v >= size[a]!) return false; }
  return true;
}

/** Encodes `payload.cells`; null when a cell has a shape this encoding cannot reproduce exactly. */
export function packCells(payload: Pick<VoxelPayload, 'bounds' | 'cells'>): PackedCells | null {
  const { min, sx, sy, sz, volume } = geometry(payload.bounds);
  if (!Number.isSafeInteger(volume) || volume <= 0) return null;
  const cells = payload.cells, w = new Writer();
  let prev = -1, i = 0;
  while (i < cells.length) {
    const c = cells[i]!;
    if (!plainCell(c, min, sx, sy, sz)) return null;
    const index = (c.position[0] - min[0]) + sx * ((c.position[1] - min[1]) + sy * (c.position[2] - min[2]));
    const tag = tagOf(c);
    let run = 1;
    while (i + run < cells.length) {
      const n = cells[i + run]!;
      if (!plainCell(n, min, sx, sy, sz) || tagOf(n) !== tag) break;
      if ((n.position[0] - min[0]) + sx * ((n.position[1] - min[1]) + sy * (n.position[2] - min[2])) !== index + run) break;
      run++;
    }
    w.uint(zigzag(index - prev)); w.uint(tag); w.uint(run - 1);
    prev = index + run - 1; i += run;
  }
  const packed: PackedCells = { encoding: PACKED_CELLS_ENCODING, count: cells.length, bytes: w.bytes() };
  // Self-check: storage must never change a single cell.
  const back = unpackCells(payload.bounds, packed);
  for (let k = 0; k < cells.length; k++) {
    const a = cells[k]!, b = back[k]!;
    if (a.kind !== b.kind || a.position[0] !== b.position[0] || a.position[1] !== b.position[1] || a.position[2] !== b.position[2]
      || (a.kind !== 'erase' && b.kind !== 'erase' && a.paletteIndex !== b.paletteIndex)) return null;
  }
  return packed;
}

/** Decodes a packed cell list; throws PackedCellsError for any malformed or out-of-bounds data. */
export function unpackCells(bounds: Bounds, packed: PackedCells): Cell[] {
  if (packed.encoding !== PACKED_CELLS_ENCODING) throw new PackedCellsError(`unbekannte Kodierung ${String(packed.encoding)}`);
  if (!Number.isSafeInteger(packed.count) || packed.count < 0) throw new PackedCellsError('ungültige Zellanzahl');
  if (!(packed.bytes instanceof Uint8Array)) throw new PackedCellsError('Bytefolge fehlt');
  const { min, sx, sy, volume } = geometry(bounds);
  const bytes = packed.bytes, out: Cell[] = new Array(packed.count);
  let pos = 0, prev = -1, n = 0;
  const uint = (): number => {
    let value = 0, scale = 1;
    for (let k = 0; k < 8; k++) {
      if (pos >= bytes.length) throw new PackedCellsError('Daten enden mitten in einem Eintrag');
      const b = bytes[pos++]!;
      value += (b & 0x7f) * scale;
      if (b < 0x80) { if (!Number.isSafeInteger(value)) break; return value; }
      scale *= 0x80;
    }
    throw new PackedCellsError('Zahl zu groß');
  };
  while (pos < bytes.length) {
    const start = prev + unzigzag(uint()), tag = uint(), run = uint() + 1;
    if (start < 0 || start + run > volume) throw new PackedCellsError('Zelle außerhalb der Auswahlgrenzen');
    if (n + run > packed.count) throw new PackedCellsError('mehr Zellen als angegeben');
    for (let r = 0; r < run; r++) {
      const index = start + r, x = index % sx, rest = (index - x) / sx, y = rest % sy, z = (rest - y) / sy;
      const position: Vec3 = [min[0] + x, min[1] + y, min[2] + z];
      out[n++] = tag === 0 ? { position, kind: 'erase' } : { position, kind: tag % 2 === 1 ? 'air' : 'block', paletteIndex: (tag - (tag % 2 === 1 ? 1 : 2)) / 2 };
    }
    prev = start + run - 1;
  }
  if (n !== packed.count) throw new PackedCellsError(`${n} statt ${packed.count} Zellen`);
  return out;
}
