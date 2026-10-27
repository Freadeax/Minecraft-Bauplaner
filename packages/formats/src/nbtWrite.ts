import type { NbtTag, NbtType } from '../../voxel/src/types.js';
import { FormatError } from './nbt.js';

/** Writer limits. Minecraft itself refuses NBT nested deeper than 512. */
export interface NbtWriteLimits { maxDepth: number; maxBytes: number }
export const NBT_WRITE_LIMITS: Readonly<NbtWriteLimits> = Object.freeze({ maxDepth: 512, maxBytes: 64_000_000 });

const TYPE_ID: Readonly<Record<NbtType | 'end', number>> = {
  end: 0, byte: 1, short: 2, int: 3, long: 4, float: 5, double: 6, byteArray: 7, string: 8, list: 9, compound: 10, intArray: 11, longArray: 12,
};
const INT_RANGES: Readonly<Record<string, readonly [number, number]>> = {
  byte: [-128, 127], short: [-32768, 32767], int: [-2147483648, 2147483647],
};
const LONG_MIN = -(1n << 63n), LONG_MAX = (1n << 63n) - 1n;

/** Growable big-endian byte sink. */
class Sink {
  private buf = new Uint8Array(1024);
  private view = new DataView(this.buf.buffer);
  length = 0;
  constructor(private readonly maxBytes: number) {}
  private reserve(n: number): void {
    if (this.length + n > this.maxBytes) throw new FormatError('LIMIT', 'NBT-Ausgabe überschreitet das Größenlimit.');
    if (this.length + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.length + n) size *= 2;
    const next = new Uint8Array(size); next.set(this.buf.subarray(0, this.length));
    this.buf = next; this.view = new DataView(next.buffer);
  }
  u8(v: number): void { this.reserve(1); this.view.setUint8(this.length++, v); }
  i8(v: number): void { this.reserve(1); this.view.setInt8(this.length++, v); }
  i16(v: number): void { this.reserve(2); this.view.setInt16(this.length, v); this.length += 2; }
  u16(v: number): void { this.reserve(2); this.view.setUint16(this.length, v); this.length += 2; }
  i32(v: number): void { this.reserve(4); this.view.setInt32(this.length, v); this.length += 4; }
  i64(v: bigint): void { this.reserve(8); this.view.setBigInt64(this.length, v); this.length += 8; }
  f32(v: number): void { this.reserve(4); this.view.setFloat32(this.length, v); this.length += 4; }
  f64(v: number): void { this.reserve(8); this.view.setFloat64(this.length, v); this.length += 8; }
  bytes(b: Uint8Array): void { this.reserve(b.length); this.buf.set(b, this.length); this.length += b.length; }
  result(): Uint8Array { return this.buf.slice(0, this.length); }
}

/** Java DataOutput.writeUTF: Modified UTF-8 per UTF-16 code unit, NUL as two bytes, max 65535 bytes. */
export function modifiedUtf8(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 1 && unit < 0x80) out.push(unit);
    else if (unit < 0x800) out.push(0xc0 | (unit >> 6), 0x80 | (unit & 63));
    else out.push(0xe0 | (unit >> 12), 0x80 | ((unit >> 6) & 63), 0x80 | (unit & 63));
  }
  if (out.length > 0xffff) throw new FormatError('STRING', `NBT-Text ist kodiert länger als 65535 Bytes (${out.length}).`);
  return Uint8Array.from(out);
}

/**
 * Big-endian Java NBT writer, the exact inverse of `readNbt` for the JSON-safe
 * tag model. Every value is range-checked; nothing is clamped or coerced.
 * Compound keys are written in object order, so callers control field order.
 */
export function writeNbt(root: { name: string; tag: NbtTag }, options: Partial<NbtWriteLimits> = {}): Uint8Array {
  const limits = { ...NBT_WRITE_LIMITS, ...options };
  for (const [key, v] of Object.entries(limits)) if (!Number.isSafeInteger(v) || v < 1) throw new FormatError('LIMIT', `Ungültiges Limit: ${key}`);
  if (root.tag.type !== 'compound') throw new FormatError('ROOT', 'NBT-Wurzel muss ein Compound sein.');
  const out = new Sink(limits.maxBytes);
  const fail = (path: string, message: string): never => { throw new FormatError('TYPE', `NBT ${path || 'Wurzel'}: ${message}`); };
  const string = (text: unknown, path: string): void => {
    if (typeof text !== 'string') fail(path, 'Text erwartet.');
    const b = modifiedUtf8(text as string); out.u16(b.length); out.bytes(b);
  };
  const integer = (v: unknown, type: string, path: string): number => {
    const [min, max] = INT_RANGES[type]!;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) fail(path, `${type} außerhalb ${min}…${max}.`);
    return v as number;
  };
  const long = (v: unknown, path: string): bigint => {
    if (typeof v !== 'string' || !/^-?\d{1,20}$/.test(v)) fail(path, 'Long als dezimaler Text erwartet.');
    const n = BigInt(v as string);
    if (n < LONG_MIN || n > LONG_MAX) fail(path, 'Long außerhalb von int64.');
    return n;
  };
  const array = (v: unknown, path: string): readonly unknown[] => {
    if (!Array.isArray(v)) fail(path, 'Array erwartet.');
    return v as unknown[];
  };
  function payload(tag: NbtTag, depth: number, path: string): void {
    if (depth > limits.maxDepth) fail(path, `Tiefenlimit ${limits.maxDepth} überschritten.`);
    switch (tag.type) {
      case 'byte': out.i8(integer(tag.value, 'byte', path)); return;
      case 'short': out.i16(integer(tag.value, 'short', path)); return;
      case 'int': out.i32(integer(tag.value, 'int', path)); return;
      case 'long': out.i64(long(tag.value, path)); return;
      case 'float':
        if (typeof tag.value !== 'number' || !Number.isFinite(tag.value) || !Object.is(Math.fround(tag.value), tag.value)) fail(path, 'Float muss endlich und exakt als float32 darstellbar sein.');
        out.f32(tag.value); return;
      case 'double':
        if (typeof tag.value !== 'number' || !Number.isFinite(tag.value)) fail(path, 'Double muss endlich sein.');
        out.f64(tag.value); return;
      case 'string': string(tag.value, path); return;
      case 'byteArray': { const a = array(tag.value, path); out.i32(a.length); for (const v of a) out.i8(integer(v, 'byte', path)); return; }
      case 'intArray': { const a = array(tag.value, path); out.i32(a.length); for (const v of a) out.i32(integer(v, 'int', path)); return; }
      case 'longArray': { const a = array(tag.value, path); out.i32(a.length); for (const v of a) out.i64(long(v, path)); return; }
      case 'list': {
        const a = array(tag.value, path) as readonly NbtTag[], element = TYPE_ID[tag.elementType];
        if (element === undefined) fail(path, 'Unbekannter Listentyp.');
        if (element === 0 && a.length) fail(path, 'End-Liste muss leer sein.');
        out.u8(element!); out.i32(a.length);
        a.forEach((child, i) => {
          if (child?.type !== tag.elementType) fail(`${path}[${i}]`, `Listenelement ${String(child?.type)} statt ${tag.elementType}.`);
          payload(child, depth + 1, `${path}[${i}]`);
        });
        return;
      }
      case 'compound': {
        if (!tag.value || typeof tag.value !== 'object' || Array.isArray(tag.value)) fail(path, 'Compound-Objekt erwartet.');
        for (const [key, child] of Object.entries(tag.value)) {
          const id = TYPE_ID[child?.type as NbtType];
          if (!id) fail(`${path}.${key}`, 'Unbekannter NBT-Typ.');
          out.u8(id!); string(key, `${path}.${key}`); payload(child, depth + 1, path ? `${path}.${key}` : key);
        }
        out.u8(0);
        return;
      }
      default: fail(path, `Unbekannter NBT-Typ ${String((tag as { type: unknown }).type)}.`);
    }
  }
  out.u8(10); string(root.name, ''); payload(root.tag, 0, '');
  return out.result();
}

/** GZip via the platform CompressionStream (browser and Node ≥ 18). */
export async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
