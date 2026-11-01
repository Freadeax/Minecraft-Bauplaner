import { FormatError } from './nbt.js';

/**
 * LZ4 as Minecraft writes region chunks with `region-file-compression=lz4`
 * (chunk compression type 4, since 24w04a). The game wraps the data in the
 * framing of lz4-java's `LZ4BlockOutputStream`:
 *
 *   "LZ4Block" · token (method | level) · compressedLength (int32 LE)
 *   · originalLength (int32 LE) · checksum (int32 LE) · payload
 *
 * repeated until an empty block (both lengths 0). Method 0x10 stores the bytes
 * raw, 0x20 is one LZ4 block. The checksum is XXH32 (seed 0x9747B28C) of the
 * decompressed block, masked to 28 bits as lz4-java's `asChecksum()` does.
 */

const MAGIC = [0x4c, 0x5a, 0x34, 0x42, 0x6c, 0x6f, 0x63, 0x6b]; // "LZ4Block"
const HEADER = 21;
const METHOD_RAW = 0x10, METHOD_LZ4 = 0x20;
export const LZ4_CHECKSUM_SEED = 0x9747b28c;

function fail(message: string): never { throw new FormatError('LZ4', message); }

const P1 = 2654435761, P2 = 2246822519, P3 = 3266489917, P4 = 668265263, P5 = 374761393;
const rotl = (x: number, r: number) => (x << r) | (x >>> (32 - r));
const u32le = (b: Uint8Array, i: number) => (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24)) >>> 0;

/** XXH32 of `bytes` (reference algorithm, unsigned result). */
export function xxhash32(bytes: Uint8Array, seed = 0): number {
  const n = bytes.length;
  let i = 0, h: number;
  if (n >= 16) {
    let v1 = (seed + P1 + P2) | 0, v2 = (seed + P2) | 0, v3 = seed | 0, v4 = (seed - P1) | 0;
    const limit = n - 16;
    while (i <= limit) {
      v1 = Math.imul(rotl((v1 + Math.imul(u32le(bytes, i), P2)) | 0, 13), P1); i += 4;
      v2 = Math.imul(rotl((v2 + Math.imul(u32le(bytes, i), P2)) | 0, 13), P1); i += 4;
      v3 = Math.imul(rotl((v3 + Math.imul(u32le(bytes, i), P2)) | 0, 13), P1); i += 4;
      v4 = Math.imul(rotl((v4 + Math.imul(u32le(bytes, i), P2)) | 0, 13), P1); i += 4;
    }
    h = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) | 0;
  } else h = (seed + P5) | 0;
  h = (h + n) | 0;
  while (i + 4 <= n) { h = Math.imul(rotl((h + Math.imul(u32le(bytes, i), P3)) | 0, 17), P4); i += 4; }
  while (i < n) { h = Math.imul(rotl((h + Math.imul(bytes[i]!, P5)) | 0, 11), P1); i++; }
  h ^= h >>> 15; h = Math.imul(h, P2); h ^= h >>> 13; h = Math.imul(h, P3); h ^= h >>> 16;
  return h >>> 0;
}

/** Decodes one raw LZ4 block into `out[at..at+size)`; returns the bytes written. */
export function lz4DecodeBlock(src: Uint8Array, out: Uint8Array, at: number, size: number): number {
  let s = 0, d = at;
  const end = at + size;
  while (s < src.length) {
    const token = src[s++]!;
    let literals = token >>> 4;
    if (literals === 15) { let b: number; do { if (s >= src.length) fail('Literal-Länge abgeschnitten.'); b = src[s++]!; literals += b; } while (b === 255); }
    if (s + literals > src.length || d + literals > end) fail('Literale überschreiten den Block.');
    out.set(src.subarray(s, s + literals), d); s += literals; d += literals;
    if (s === src.length) break; // the last sequence has literals only
    if (s + 2 > src.length) fail('Match-Versatz abgeschnitten.');
    const offset = src[s]! | (src[s + 1]! << 8); s += 2;
    if (offset === 0 || offset > d - at) fail('Ungültiger Match-Versatz.');
    let length = token & 15;
    if (length === 15) { let b: number; do { if (s >= src.length) fail('Match-Länge abgeschnitten.'); b = src[s++]!; length += b; } while (b === 255); }
    length += 4;
    if (d + length > end) fail('Match überschreitet den Block.');
    // Overlapping copies repeat the pattern byte by byte, like the reference decoder.
    for (let k = 0; k < length; k++, d++) out[d] = out[d - offset]!;
  }
  if (d !== end) fail('Block kürzer als angegeben.');
  return d - at;
}

/** Decompresses an lz4-java block stream with a byte budget. */
export function lz4BlockStreamDecompress(input: Uint8Array, maxBytes: number): Uint8Array {
  const parts: Uint8Array[] = [];
  let pos = 0, total = 0;
  while (pos < input.length) {
    if (input.length - pos < HEADER) fail('Blockkopf abgeschnitten.');
    for (let k = 0; k < 8; k++) if (input[pos + k] !== MAGIC[k]) fail('LZ4Block-Kennung fehlt.');
    const token = input[pos + 8]!, method = token & 0xf0;
    const compressed = u32le(input, pos + 9), original = u32le(input, pos + 13), checksum = u32le(input, pos + 17);
    pos += HEADER;
    if (method !== METHOD_RAW && method !== METHOD_LZ4) fail(`Unbekannte LZ4-Blockmethode 0x${method.toString(16)}.`);
    if (compressed > input.length - pos) fail('LZ4-Block abgeschnitten.');
    if (original === 0 && compressed === 0) { if (checksum !== 0) fail('Abschlussblock mit Prüfsumme.'); break; }
    if (original > 0x2000000 || total + original > maxBytes) throw new FormatError('LIMIT', 'Entpackter Chunk überschreitet das Größenlimit.');
    const out = new Uint8Array(original);
    if (method === METHOD_RAW) { if (compressed !== original) fail('Roh-Block mit abweichender Länge.'); out.set(input.subarray(pos, pos + compressed)); }
    else lz4DecodeBlock(input.subarray(pos, pos + compressed), out, 0, original);
    pos += compressed;
    const hash = xxhash32(out, LZ4_CHECKSUM_SEED);
    if ((hash & 0x0fffffff) !== checksum) fail('LZ4-Prüfsumme stimmt nicht.');
    parts.push(out); total += original;
  }
  if (parts.length === 1) return parts[0]!;
  const result = new Uint8Array(total); let p = 0;
  for (const part of parts) { result.set(part, p); p += part.length; }
  return result;
}
