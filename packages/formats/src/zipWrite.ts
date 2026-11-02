/**
 * Kleiner ZIP-Schreiber (für 3MF und OBJ-Pakete): lokale Kopfzeilen,
 * Zentralverzeichnis, CRC-32. Einträge werden mit der übergebenen
 * deflate-raw-Funktion gepackt, wenn sie dadurch kleiner werden, sonst
 * gespeichert. Ohne ZIP64: höchstens 65.535 Einträge und 4 GiB.
 */
export interface ZipInput { readonly name: string; readonly data: Uint8Array }
export interface ZipWriteOptions {
  readonly deflate?: (bytes: Uint8Array) => Promise<Uint8Array>;
  /** Zeitstempel aller Einträge (Standard 01.01.2026 für gleiche Bytes bei gleichem Inhalt). */
  readonly date?: Date;
}

let table: Uint32Array | null = null;
export function crc32(bytes: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** deflate-raw über die Plattform (Browser, Node ≥ 21). */
export async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function writeZip(entries: readonly ZipInput[], options: ZipWriteOptions = {}): Promise<Uint8Array> {
  if (entries.length > 0xffff) throw new Error('Zu viele ZIP-Einträge.');
  const d = options.date ?? new Date(2026, 0, 1);
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name), crc = crc32(e.data);
    let data = e.data, method = 0;
    if (options.deflate && e.data.length > 64) {
      try { const packed = await options.deflate(e.data); if (packed.length < e.data.length) { data = packed; method = 8; } } catch { /* gespeichert */ }
    }
    if (offset + 30 + name.length + data.length > 0xffffffff) throw new Error('ZIP größer als 4 GiB.');
    const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, method, true);
    lv.setUint16(10, time, true); lv.setUint16(12, date, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); lv.setUint32(22, e.data.length, true); lv.setUint16(26, name.length, true);
    local.set(name, 30);
    const head = new Uint8Array(46 + name.length), cv = new DataView(head.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, method, true);
    cv.setUint16(12, time, true); cv.setUint16(14, date, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true); cv.setUint32(24, e.data.length, true); cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true); head.set(name, 46);
    parts.push(local, data); central.push(head);
    offset += local.length + data.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let o = 0;
  for (const p of [...parts, ...central, end]) { out.set(p, o); o += p.length; }
  return out;
}
