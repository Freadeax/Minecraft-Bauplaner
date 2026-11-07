import { location, spriteFile } from './model.ts';
import type { ModelSource } from './model.ts';
import { readZip, ZipBudget, ZIP_LIMITS } from './zip.ts';

/**
 * Texture sources (Blockdarstellung). Mojang's models and textures are never
 * part of this project or its website. The browser fetches them itself –
 * either the official client jar straight from Mojang's servers (as a
 * launcher does) or files the user picks: their own client jar from
 * `.minecraft/versions/<version>/`, resource packs, mod jars. Only
 * blockstates, block models and the textures they use are extracted and kept
 * in this browser (IndexedDB); nothing is uploaded.
 */
export interface PackSourceInfo {
  readonly label: string;
  readonly kind: 'mojang' | 'file';
  readonly version?: string;
  readonly sha1?: string;
  readonly bytes: number;
}
export interface PackMeta {
  readonly id: string;
  readonly createdAt: string;
  readonly sources: readonly PackSourceInfo[];
  readonly files: number;
  readonly bytes: number;
}
export interface TexturePack { readonly meta: PackMeta; readonly files: ReadonlyMap<string, Uint8Array> }

export const MOJANG_MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

export type Progress = (step: string, fraction?: number) => void;

const MODEL_FILE = /^assets\/[a-z0-9_.-]+\/(blockstates\/.+\.json|models\/(?!item\/).+\.json)$/;
const TEXTURE_FILE = /^assets\/[a-z0-9_.-]+\/textures\/.+\.png(\.mcmeta)?$/;

/** JSON view of a pack for the model bakery (parsed lazily, cached). */
export function packSource(files: ReadonlyMap<string, Uint8Array>): ModelSource {
  const cache = new Map<string, unknown>(), decoder = new TextDecoder();
  return {
    json(path) {
      if (cache.has(path)) return cache.get(path);
      const bytes = files.get(path);
      let value: unknown;
      try { value = bytes ? JSON.parse(decoder.decode(bytes)) : undefined; } catch { value = undefined; }
      cache.set(path, value);
      return value;
    },
  };
}

/** Texture ids referenced by the block models of a file set. */
export function referencedSprites(files: ReadonlyMap<string, Uint8Array>): Set<string> {
  const out = new Set<string>(), decoder = new TextDecoder();
  const add = (v: unknown) => {
    const s = typeof v === 'string' ? v : typeof v === 'object' && v && typeof (v as { sprite?: unknown }).sprite === 'string' ? (v as { sprite: string }).sprite : null;
    if (s && !s.startsWith('#')) { const [ns, p] = location(s); out.add(`${ns}:${p}`); }
  };
  for (const [path, bytes] of files) {
    if (!/\/models\/.+\.json$/.test(path)) continue;
    try {
      const json = JSON.parse(decoder.decode(bytes)) as { textures?: Record<string, unknown> };
      if (json.textures) for (const v of Object.values(json.textures)) add(v);
    } catch { /* broken model files are skipped */ }
  }
  // Used by the own shapes for liquids.
  out.add('minecraft:block/water_still'); out.add('minecraft:block/lava_still');
  return out;
}

/**
 * Image check (P1 Härtung 07.11.2026): a texture must be a real PNG whose header names a sane size, before any
 * browser decoder sees it – a few kilobytes of PNG may otherwise claim a picture of gigapixels. Block textures are
 * 16–512 px wide; animated ones are strips (width × n·width).
 */
export const TEXTURE_LIMITS = Object.freeze({ maxSide: 4096, maxHeight: 65_536, maxPixels: 4_194_304 });
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 33 || sig.some((b, i) => bytes[i] !== b)) return null;
  // First chunk must be IHDR (length 13).
  if (bytes[8] !== 0 || bytes[9] !== 0 || bytes[10] !== 0 || bytes[11] !== 13 || String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') return null;
  const be = (o: number) => ((bytes[o]! << 24) | (bytes[o + 1]! << 16) | (bytes[o + 2]! << 8) | bytes[o + 3]!) >>> 0;
  return { width: be(16), height: be(20) };
}
export function textureOk(bytes: Uint8Array): boolean {
  const size = pngSize(bytes);
  if (!size) return false;
  const { width, height } = size;
  return width >= 1 && height >= 1 && width <= TEXTURE_LIMITS.maxSide && height <= TEXTURE_LIMITS.maxHeight && width * height <= TEXTURE_LIMITS.maxPixels;
}

export interface ExtractOptions {
  /** Shared by all archives of one import (P1 Härtung): the sum of everything extracted stays bounded. */
  readonly budget?: ZipBudget;
  readonly signal?: AbortSignal;
}

/**
 * Extracts blockstates, block models and the textures those models use from
 * one archive (jar or zip). Later archives override earlier ones file by file,
 * as resource packs do. Textures that fail the image check are left out.
 */
export async function extractArchive(bytes: Uint8Array, into: Map<string, Uint8Array>, progress?: Progress, options: ExtractOptions = {}): Promise<number> {
  const budget = options.budget ?? new ZipBudget(ZIP_LIMITS.maxExtractedBytes);
  const zip = { budget, ...(options.signal && { signal: options.signal }) };
  const models = await readZip(bytes, name => MODEL_FILE.test(name), undefined, (d, t) => progress?.('Modelle entpacken', t ? d / t : undefined), zip);
  for (const [k, v] of models) into.set(k, v);
  const wanted = new Set([...referencedSprites(into)].map(spriteFile));
  const textures = await readZip(bytes, name => TEXTURE_FILE.test(name) && (wanted.has(name) || wanted.has(name.replace(/\.mcmeta$/, ''))), undefined,
    (d, t) => progress?.('Texturen entpacken', t ? d / t : undefined), zip);
  let kept = 0;
  for (const [k, v] of textures) {
    if (k.endsWith('.png') && !textureOk(v)) continue;
    into.set(k, v); kept++;
  }
  return models.size + kept;
}

async function sha1(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', bytes as BufferSource);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Mojang-Server antwortet mit ${r.status} (${url}).`);
  return r.json();
}

async function download(url: string, size: number, progress?: Progress, signal?: AbortSignal): Promise<Uint8Array> {
  const r = await fetch(url, { ...(signal && { signal }) });
  if (!r.ok || !r.body) throw new Error(`Download fehlgeschlagen (${r.status}).`);
  const reader = r.body.getReader(), chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length;
    // Never more than announced in Mojang's (checksummed) version file.
    if (got > size) { void reader.cancel(); throw new Error('Der Download ist größer als angekündigt und wird verworfen.'); }
    progress?.(`Client-Jar laden (${Math.round(got / 1e6)} von ${Math.round(size / 1e6)} MB)`, size ? got / size : undefined);
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export interface MojangVersion { readonly id: string; readonly type: string; readonly url: string }
/** Release versions from Mojang's manifest, newest first. */
export async function mojangReleases(): Promise<MojangVersion[]> {
  const manifest = await fetchJson(MOJANG_MANIFEST) as { versions?: MojangVersion[] };
  return (manifest.versions ?? []).filter(v => v.type === 'release');
}

/** Downloads the official client jar of `version` from Mojang, verifies its SHA-1 and extracts the block assets. */
export async function loadFromMojang(version: string, progress?: Progress, signal?: AbortSignal): Promise<{ files: Map<string, Uint8Array>; info: PackSourceInfo }> {
  progress?.('Versionsliste von Mojang laden');
  const releases = await mojangReleases();
  const entry = releases.find(v => v.id === version);
  if (!entry) throw new Error(`Version ${version} ist in Mojangs Versionsliste nicht enthalten.`);
  const detail = await fetchJson(entry.url) as { downloads?: { client?: { url: string; sha1: string; size: number } } };
  const client = detail.downloads?.client;
  if (!client) throw new Error(`Für ${version} ist kein Client-Download angegeben.`);
  if (!(client.size > 0 && client.size <= ZIP_LIMITS.maxArchiveBytes)) throw new Error('Die angegebene Größe der Client-Jar ist unplausibel.');
  const bytes = await download(client.url, client.size, progress, signal);
  progress?.('Prüfsumme kontrollieren');
  const hash = await sha1(bytes);
  if (hash !== client.sha1) throw new Error('Die heruntergeladene Datei hat eine falsche Prüfsumme und wird verworfen.');
  const files = new Map<string, Uint8Array>();
  await extractArchive(bytes, files, progress, { ...(signal && { signal }) });
  return { files, info: { label: `Minecraft ${version} (Mojang)`, kind: 'mojang', version, sha1: hash, bytes: bytes.length } };
}

/**
 * Extracts the block assets of user files in order (client jar first, then resource packs or mod jars). All files
 * share one budget, minus what the kept base already holds, so many small packs cannot add up past the limit.
 */
export async function loadFromFiles(list: readonly File[], base: Map<string, Uint8Array> = new Map(),
  progress?: Progress, signal?: AbortSignal, heldElsewhere = 0): Promise<{ files: Map<string, Uint8Array>; infos: PackSourceInfo[] }> {
  const files = new Map(base), infos: PackSourceInfo[] = [];
  let held = heldElsewhere;
  for (const v of base.values()) held += v.length;
  const budget = new ZipBudget(Math.max(0, ZIP_LIMITS.maxExtractedBytes - held));
  for (const file of list) {
    progress?.(`${file.name} lesen`);
    if (file.size > ZIP_LIMITS.maxArchiveBytes) throw new Error(`${file.name} ist größer als ${Math.round(ZIP_LIMITS.maxArchiveBytes / 1e6)} MB.`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const count = await extractArchive(bytes, files, progress, { budget, ...(signal && { signal }) });
    if (!count) throw new Error(`${file.name} enthält keine Blockmodelle oder Texturen (assets/…/blockstates, models, textures).`);
    infos.push({ label: file.name, kind: 'file', sha1: await sha1(bytes), bytes: bytes.length });
  }
  return { files, infos };
}

// ------------------------------------------------------------------ browser storage
const DB = 'bauplaner-texturen', STORE = 'packs', KEY = 'aktiv';
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB nicht verfügbar'));
  });
}
async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode), req = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result); t.onerror = () => reject(t.error ?? new Error('Speichern fehlgeschlagen'));
      t.onabort = () => reject(t.error ?? new Error('Speichern abgebrochen'));
    });
  } finally { db.close(); }
}

/** `bytes` since Block 5 (06.11.2026): WebKit cannot store Blobs in private windows; `blob` = older entries. */
interface Stored { meta: PackMeta; paths: string[]; bytes?: ArrayBuffer; blob?: Blob; sizes: number[] }
export async function savePack(pack: TexturePack): Promise<void> {
  const paths = [...pack.files.keys()], sizes = paths.map(p => pack.files.get(p)!.length);
  const all = new Uint8Array(sizes.reduce((a, n) => a + n, 0));
  let o = 0;
  for (const p of paths) { const f = pack.files.get(p)!; all.set(f, o); o += f.length; }
  await tx('readwrite', s => s.put({ meta: pack.meta, paths, sizes, bytes: all.buffer } satisfies Stored, KEY));
}
export async function loadStoredPack(): Promise<TexturePack | null> {
  if (typeof indexedDB === 'undefined') return null;
  const stored = await tx('readonly', s => s.get(KEY) as IDBRequest<Stored | undefined>);
  if (!stored) return null;
  const all = new Uint8Array(stored.bytes ?? (stored.blob ? await stored.blob.arrayBuffer() : new ArrayBuffer(0))), files = new Map<string, Uint8Array>();
  let o = 0;
  stored.paths.forEach((p, i) => { const n = stored.sizes[i]!; files.set(p, all.subarray(o, o + n)); o += n; });
  return { meta: stored.meta, files };
}
export async function deleteStoredPack(): Promise<void> { await tx('readwrite', s => s.delete(KEY)); }

export function makeMeta(sources: readonly PackSourceInfo[], files: ReadonlyMap<string, Uint8Array>): PackMeta {
  let bytes = 0;
  for (const v of files.values()) bytes += v.length;
  return { id: `${sources.map(s => s.sha1?.slice(0, 10) ?? s.label).join('+')}`, createdAt: new Date().toISOString(), sources, files: files.size, bytes };
}
