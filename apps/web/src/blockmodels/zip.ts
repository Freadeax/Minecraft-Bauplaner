/**
 * Minimal ZIP reader for texture sources (client jar, resource packs, mod jars).
 * Reads the central directory and inflates only entries accepted by `want`,
 * with the platform's DecompressionStream ('deflate-raw'); no dependency.
 * ZIP64, encryption and multi-disk archives are refused.
 */
export interface ZipLimits {
  /** Largest accepted archive (bytes). */
  readonly maxArchiveBytes: number;
  /** Sum of all extracted entries (bytes). */
  readonly maxExtractedBytes: number;
  /** Largest single extracted entry (bytes). */
  readonly maxEntryBytes: number;
  readonly maxEntries: number;
}
export const ZIP_LIMITS: Readonly<ZipLimits> = Object.freeze({
  maxArchiveBytes: 400_000_000, maxExtractedBytes: 120_000_000, maxEntryBytes: 16_000_000, maxEntries: 200_000,
});

export class ZipError extends Error {}

export interface ZipEntry { readonly name: string; readonly method: number; readonly compressedSize: number; readonly size: number; readonly offset: number }

const u16 = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8);
const u32 = (b: Uint8Array, o: number) => (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;

/** Lists the entries of the central directory. */
export function zipEntries(bytes: Uint8Array, limits: ZipLimits = ZIP_LIMITS): ZipEntry[] {
  if (bytes.length > limits.maxArchiveBytes) throw new ZipError(`Archiv größer als ${Math.round(limits.maxArchiveBytes / 1e6)} MB.`);
  // End of central directory: signature 0x06054b50 within the last 64 KiB + 22 bytes.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) if (u32(bytes, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new ZipError('Keine ZIP-/JAR-Datei (Verzeichnis fehlt).');
  if (u16(bytes, eocd + 4) !== 0 || u16(bytes, eocd + 6) !== 0) throw new ZipError('Mehrteilige ZIP-Archive werden nicht unterstützt.');
  const count = u16(bytes, eocd + 10), dirOffset = u32(bytes, eocd + 16);
  if (count === 0xffff || dirOffset === 0xffffffff) throw new ZipError('ZIP64-Archive werden nicht unterstützt.');
  if (count > limits.maxEntries) throw new ZipError(`Mehr als ${limits.maxEntries} Einträge.`);
  const decoder = new TextDecoder();
  const out: ZipEntry[] = [];
  let p = dirOffset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > bytes.length || u32(bytes, p) !== 0x02014b50) throw new ZipError('Beschädigtes ZIP-Verzeichnis.');
    const flags = u16(bytes, p + 8), method = u16(bytes, p + 10);
    const compressedSize = u32(bytes, p + 20), size = u32(bytes, p + 24);
    const nameLength = u16(bytes, p + 28), extra = u16(bytes, p + 30), comment = u16(bytes, p + 32);
    const offset = u32(bytes, p + 42);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength));
    if (!(flags & 1) && !name.endsWith('/')) out.push({ name, method, compressedSize, size, offset });
    p += 46 + nameLength + extra + comment;
  }
  return out;
}

/**
 * Shared extraction budget (P1 Härtung 07.11.2026): several archives of one import draw from the same budget, and
 * every byte counted is a byte really read or inflated – the sizes in the ZIP directory are only a first check.
 */
export class ZipBudget {
  left: number;
  constructor(left: number) { this.left = left; }
  /** Charges `n` bytes; throws as soon as the budget is exceeded. */
  take(n: number): void {
    this.left -= n;
    if (this.left < 0) throw new ZipError(`Entpackte Daten überschreiten das Speicherbudget dieses Imports (höchstens ${Math.round(ZIP_LIMITS.maxExtractedBytes / 1e6)} MB für alle Dateien zusammen).`);
  }
}
export interface ZipReadOptions {
  /** Shared budget for several archives; default: a fresh one of `limits.maxExtractedBytes`. */
  readonly budget?: ZipBudget;
  /** Aborts between entries and while inflating. */
  readonly signal?: AbortSignal;
}

const aborted = (signal?: AbortSignal) => { if (signal?.aborted) throw Object.assign(new Error('Abgebrochen.'), { name: 'AbortError' }); };

/**
 * Inflates one entry and counts the bytes as they come: more than `expected` (the size from the directory) or than
 * the budget allows stops the stream at once, so a forged directory cannot make the browser inflate gigabytes.
 */
async function inflateRaw(data: Uint8Array, expected: number, name: string, budget: ZipBudget, signal?: AbortSignal): Promise<Uint8Array> {
  const reader = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const out = new Uint8Array(expected);
  let got = 0;
  try {
    for (;;) {
      aborted(signal);
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try { chunk = await reader.read(); } catch { throw new ZipError(`${name}: Daten sind beschädigt.`); }
      if (chunk.done) break;
      const n = chunk.value.byteLength;
      if (got + n > expected) throw new ZipError(`${name}: Eintrag ist größer als im ZIP-Verzeichnis angegeben.`);
      budget.take(n);
      out.set(chunk.value, got); got += n;
    }
  } finally { void reader.cancel().catch(() => { /* finished */ }); }
  if (got !== expected) throw new ZipError(`${name}: Eintrag hat eine falsche Länge.`);
  return out;
}

/** Extracts the wanted entries (stored or deflated). */
export async function readZip(bytes: Uint8Array, want: (name: string) => boolean, limits: ZipLimits = ZIP_LIMITS,
  progress?: (done: number, total: number) => void, options: ZipReadOptions = {}): Promise<Map<string, Uint8Array>> {
  const { budget = new ZipBudget(limits.maxExtractedBytes), signal } = options;
  const entries = zipEntries(bytes, limits).filter(e => want(e.name));
  const files = new Map<string, Uint8Array>();
  let done = 0;
  for (const e of entries) {
    aborted(signal);
    if (e.size > limits.maxEntryBytes) throw new ZipError(`${e.name}: Eintrag zu groß.`);
    if (e.size > budget.left) budget.take(e.size);
    if (e.offset + 30 > bytes.length || u32(bytes, e.offset) !== 0x04034b50) throw new ZipError(`${e.name}: lokaler Kopf fehlt.`);
    const start = e.offset + 30 + u16(bytes, e.offset + 26) + u16(bytes, e.offset + 28);
    const raw = bytes.subarray(start, start + e.compressedSize);
    if (raw.length !== e.compressedSize) throw new ZipError(`${e.name}: abgeschnitten.`);
    if (e.method === 0) {
      // Stored: the bytes copied are the compressed size – it has to match the declared size exactly.
      if (e.compressedSize !== e.size) throw new ZipError(`${e.name}: Eintrag hat eine falsche Länge.`);
      budget.take(raw.length);
      files.set(e.name, raw.slice());
    } else if (e.method === 8) files.set(e.name, await inflateRaw(raw, e.size, e.name, budget, signal));
    else throw new ZipError(`${e.name}: Kompressionsverfahren ${e.method} nicht unterstützt.`);
    if (++done % 200 === 0) progress?.(done, entries.length);
  }
  progress?.(done, entries.length);
  return files;
}
