import { createPayload, stateKey, AIR_IDS } from '../../voxel/src/validation.js';
import type { BlockEntity, BlockState, Cell, NbtTag, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { FormatError, NBT_LIMITS, readNbt } from './nbt.js';
import { gunzipLimited } from './schem.js';

/**
 * Litematica `.litematic` reader (P5-01). Layout as written by Litematica
 * (LitematicaSchematic / LitematicaBitArray): GZip NBT root with Version,
 * SubVersion, MinecraftDataVersion, Metadata and Regions. Every region has a
 * Position and a signed Size relative to the schematic origin, a palette list
 * and the block indices tightly bit-packed into a LongArray (entries may span
 * two longs). Regions are merged into one payload whose local 0/0/0 is the
 * minimum corner of the enclosing box; gaps between regions stay unselected.
 */

/** Newest Litematica schematic format this reader knows (Litematica for MC 1.20.5+ writes 7). */
export const LITEMATIC_MAX_VERSION = 7;
/** Version 1 stored tile entities and entities differently; Litematica converts it, this reader refuses it. */
export const LITEMATIC_MIN_VERSION = 2;
/** From format 5 or DataVersion 1631 (MC 1.13.2) on, palettes use flattened block ids. */
const FLATTENED_VERSION = 5, FLATTENED_DATA_VERSION = 1631;

export interface LitematicLimits {
  maxCompressedBytes: number; maxUncompressedBytes: number;
  /** Cells over all imported regions (every region cell becomes a payload cell). */
  maxVolume: number;
  /** Per axis of the enclosing box. */
  maxDimension: number;
  maxRegions: number; maxPalette: number; maxDepth: number; maxNodes: number; maxDurationMs: number;
}
/** Same budget as the Schem import, so both formats behave alike in the viewer. */
export const LITEMATIC_LIMITS: Readonly<LitematicLimits> = Object.freeze({
  maxCompressedBytes: 2_000_000, maxUncompressedBytes: 8_000_000, maxVolume: 20_000, maxDimension: 256,
  maxRegions: 64, maxPalette: 20_000, maxDepth: 32, maxNodes: 200_000, maxDurationMs: 5_000,
});

export interface LitematicOptions extends Partial<LitematicLimits> {
  /** Import only this region; default: all regions merged. */
  readonly region?: string;
}

export interface LitematicRegion {
  readonly name: string;
  /** As stored: Position and signed Size. */
  readonly position: Vec3;
  readonly size: Vec3;
  /** Minimum corner relative to the schematic origin, and absolute size. */
  readonly min: Vec3;
  readonly dimensions: Vec3;
  readonly volume: number;
  readonly paletteSize: number;
  readonly bitsPerEntry: number;
  readonly blocks: number;
  readonly air: number;
  readonly tileEntities: number;
  readonly entities: number;
}

export interface LitematicMetadata {
  readonly name?: string;
  readonly author?: string;
  readonly description?: string;
  /** Milliseconds since epoch as int64 decimal strings. */
  readonly timeCreated?: string;
  readonly timeModified?: string;
  readonly enclosingSize?: Vec3;
  readonly totalBlocks?: number;
  readonly totalVolume?: number;
}

export interface LitematicResult {
  readonly format: 'litematic';
  readonly payload: VoxelPayload;
  /** `MinecraftDataVersion`; 0 when the file has none (early 1.13.2 builds of Litematica). */
  readonly dataVersion: number;
  readonly version: number;
  readonly subVersion: number | null;
  /** Schematic-origin coordinate of the payload's local 0/0/0 (enclosing box minimum). */
  readonly offset: Vec3;
  /** All regions of the file, in file order, also when only one was imported. */
  readonly regions: readonly LitematicRegion[];
  readonly selectedRegion: string | null;
  readonly metadata: LitematicMetadata;
  readonly sourceSha256: string;
  readonly sourceNbt: { name: string; tag: NbtTag };
  readonly warnings: string[];
}

type Compound = Readonly<Record<string, NbtTag>>;
function fail(message: string): never { throw new FormatError('LITEMATIC', message); }
function compound(tag: NbtTag | undefined, path: string): Compound { if (tag?.type !== 'compound') fail(`${path}: NBT-Compound fehlt.`); return tag.value; }
function int(tag: NbtTag | undefined, path: string): number { if (tag?.type !== 'int') fail(`${path}: NBT-Int fehlt.`); return tag.value; }
function list(tag: NbtTag | undefined, path: string): readonly NbtTag[] {
  if (tag === undefined) return [];
  if (tag.type !== 'list' || (tag.elementType !== 'compound' && tag.value.length !== 0)) fail(`${path}: Compound-Liste erwartet.`);
  return tag.value;
}
function blockPos(tag: NbtTag | undefined, path: string): Vec3 { const c = compound(tag, path); return [int(c.x, `${path}.x`), int(c.y, `${path}.y`), int(c.z, `${path}.z`)]; }
function namespaced(id: string, path: string): string {
  const result = id.includes(':') ? id : `minecraft:${id}`;
  if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(result)) fail(`${path}: ungültige Block-ID ${id}.`);
  return result;
}

/** Palette entry `{Name, Properties:{key:string}}` as written by Minecraft's NbtHelper. */
function paletteState(tag: NbtTag, path: string): BlockState {
  const c = compound(tag, path);
  if (c.Name?.type !== 'string') fail(`${path}.Name: NBT-String fehlt.`);
  const properties: Record<string, string> = Object.create(null);
  if (c.Properties !== undefined) for (const [k, v] of Object.entries(compound(c.Properties, `${path}.Properties`))) {
    if (v.type !== 'string' || !k || !v.value) fail(`${path}.Properties.${k}: nichtleerer NBT-String erwartet.`);
    properties[k] = v.value;
  }
  return { id: namespaced(c.Name.value, `${path}.Name`), properties };
}

/** Litematica: `max(2, ceil(log2(paletteSize)))` bits per entry. */
export function litematicBits(paletteSize: number): number {
  return Math.max(2, 32 - Math.clz32(Math.max(paletteSize, 1) - 1));
}

/**
 * Splits int64 decimal strings into a little-endian stream of 32-bit words
 * (low word first), which is exactly LitematicaBitArray's bit order.
 */
function words32(longs: readonly string[]): Uint32Array {
  const out = new Uint32Array(longs.length * 2);
  longs.forEach((s, i) => { const v = BigInt.asUintN(64, BigInt(s)); out[2 * i] = Number(v & 0xffffffffn); out[2 * i + 1] = Number(v >> 32n); });
  return out;
}
/** Value `index` of `bits` width from the packed stream; entries may straddle two words. */
export function unpackAt(words: Uint32Array, bits: number, index: number): number {
  const start = index * bits, word = Math.floor(start / 32), shift = start % 32;
  const mask = bits === 32 ? 0xffffffff : (1 << bits) - 1;
  let v = words[word]! >>> shift;
  if (shift + bits > 32) v |= words[word + 1]! << (32 - shift);
  return (v & mask) >>> 0;
}

interface ParsedRegion { info: LitematicRegion; palette: BlockState[]; words: Uint32Array; tiles: readonly NbtTag[] }

function readRegion(name: string, tag: NbtTag, limits: LitematicLimits, budget: { volume: number }): ParsedRegion {
  const path = `Regions.${name}`, r = compound(tag, path);
  const position = blockPos(r.Position, `${path}.Position`), size = blockPos(r.Size, `${path}.Size`);
  if (size.some(n => n === 0)) fail(`${path}.Size: keine Achse darf 0 sein.`);
  // Negative sizes extend from Position towards smaller coordinates (PositionUtils.getRelativeEndPositionFromAreaSize).
  const min = position.map((p, i) => size[i]! < 0 ? p + size[i]! + 1 : p) as unknown as Vec3;
  const dimensions = size.map(Math.abs) as unknown as Vec3;
  if (dimensions.some(n => n > limits.maxDimension)) fail(`${path}: höchstens ${limits.maxDimension} Blöcke je Achse.`);
  const volume = dimensions[0] * dimensions[1] * dimensions[2];
  budget.volume += volume;
  if (budget.volume > limits.maxVolume) throw new FormatError('LIMIT', `Regionen überschreiten zusammen ${limits.maxVolume} Zellen.`);
  const paletteTags = list(r.BlockStatePalette, `${path}.BlockStatePalette`);
  if (paletteTags.length < 1 || paletteTags.length > limits.maxPalette) fail(`${path}.BlockStatePalette fehlt oder ist zu groß.`);
  const palette = paletteTags.map((t, i) => paletteState(t, `${path}.BlockStatePalette[${i}]`));
  if (r.BlockStates?.type !== 'longArray') fail(`${path}.BlockStates: NBT-LongArray fehlt.`);
  const bits = litematicBits(palette.length), expected = Math.ceil(volume * bits / 64);
  if (r.BlockStates.value.length !== expected) fail(`${path}.BlockStates: ${r.BlockStates.value.length} Longs, erwartet ${expected} für ${volume} Zellen à ${bits} Bit.`);
  const words = words32(r.BlockStates.value);
  let blocks = 0, air = 0;
  for (let i = 0; i < volume; i++) {
    const v = unpackAt(words, bits, i);
    if (v >= palette.length) fail(`${path}: Zelle ${i} verweist auf Paletteneintrag ${v}, Palette hat ${palette.length}.`);
    if (AIR_IDS.has(palette[v]!.id)) air++; else blocks++;
  }
  const tiles = list(r.TileEntities, `${path}.TileEntities`);
  const entities = list(r.Entities, `${path}.Entities`).length;
  return { info: { name, position, size, min, dimensions, volume, paletteSize: palette.length, bitsPerEntry: bits, blocks, air, tileEntities: tiles.length, entities }, palette, words, tiles };
}

function readMetadata(tag: NbtTag | undefined): LitematicMetadata {
  if (tag === undefined) return {};
  const m = compound(tag, 'Metadata');
  const text = (k: string) => m[k]?.type === 'string' ? m[k].value : undefined;
  const long = (k: string) => m[k]?.type === 'long' ? m[k].value : undefined;
  const num = (k: string) => m[k]?.type === 'int' ? m[k].value : undefined;
  const out: Record<string, unknown> = { name: text('Name'), author: text('Author'), description: text('Description'), timeCreated: long('TimeCreated'), timeModified: long('TimeModified'), totalBlocks: num('TotalBlocks'), totalVolume: num('TotalVolume') };
  if (m.EnclosingSize?.type === 'compound') out.enclosingSize = blockPos(m.EnclosingSize, 'Metadata.EnclosingSize');
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out as LitematicMetadata;
}

/** Pure schema adapter on an already parsed NBT tree; independently testable. */
export function normalizeLitematic(sourceNbt: { name: string; tag: NbtTag }, options: LitematicOptions = {}): Omit<LitematicResult, 'sourceSha256'> {
  const { region: only, ...overrides } = options;
  const limits = { ...LITEMATIC_LIMITS, ...overrides };
  for (const [key, value] of Object.entries(limits)) if (!Number.isSafeInteger(value) || value < 1) throw new FormatError('LIMIT', `Ungültiges Limit: ${key}`);
  const root = compound(sourceNbt.tag, 'Root');
  if (root.Schematic !== undefined) fail('Das ist eine Sponge-Schematic, keine Litematic-Datei.');
  const version = int(root.Version, 'Version');
  if (version > LITEMATIC_MAX_VERSION) fail(`Litematic-Format ${version} ist neuer als die bekannte Version ${LITEMATIC_MAX_VERSION}; bitte die Datei mit einer älteren Litematica-Version speichern oder den Bauplaner aktualisieren.`);
  if (version < LITEMATIC_MIN_VERSION) fail(`Litematic-Format ${version} (frühe Litematica-Versionen) wird nicht unterstützt; bitte die Datei in Litematica öffnen und neu speichern.`);
  const subVersion = root.SubVersion === undefined ? null : int(root.SubVersion, 'SubVersion');
  const dataVersion = root.MinecraftDataVersion === undefined ? 0 : int(root.MinecraftDataVersion, 'MinecraftDataVersion');
  if (dataVersion < 0) fail('MinecraftDataVersion darf nicht negativ sein.');
  const regionsTag = compound(root.Regions, 'Regions');
  const names = Object.keys(regionsTag);
  if (names.length < 1) fail('Die Datei enthält keine Region.');
  if (names.length > limits.maxRegions) throw new FormatError('LIMIT', `Mehr als ${limits.maxRegions} Regionen.`);
  if (only !== undefined && !names.includes(only)) fail(`Region „${only}“ gibt es in dieser Datei nicht.`);

  // Every region is read and checked, also when only one is imported, so the report is complete.
  const budget = { volume: 0 };
  const parsed = names.map(name => readRegion(name, regionsTag[name]!, limits, only !== undefined && name !== only ? { volume: 0 } : budget));
  const used = parsed.filter(p => only === undefined || p.info.name === only);
  const lo = [0, 1, 2].map(i => Math.min(...used.map(p => p.info.min[i]!))) as unknown as Vec3;
  const hi = [0, 1, 2].map(i => Math.max(...used.map(p => p.info.min[i]! + p.info.dimensions[i]!))) as unknown as Vec3;
  const box = [0, 1, 2].map(i => hi[i]! - lo[i]!) as unknown as Vec3;
  if (box.some(n => n > limits.maxDimension)) throw new FormatError('LIMIT', `Die Regionen spannen ${box.join(' × ')} Blöcke auf; erlaubt sind höchstens ${limits.maxDimension} je Achse. Einzelne Regionen lassen sich getrennt importieren.`);

  const palette: BlockState[] = [], byState = new Map<string, number>();
  const cellAt = new Map<string, Cell>(), entityAt = new Map<string, BlockEntity>();
  let overlaps = 0, droppedTiles = 0, tilesWithoutId = 0;
  const warnings: string[] = [];
  for (const p of used) {
    const remap = p.palette.map(state => {
      const key = stateKey(state); let i = byState.get(key);
      if (i === undefined) { i = palette.length; palette.push(state); byState.set(key, i); }
      return i;
    });
    const [W, H, L] = p.info.dimensions, base = p.info.min.map((v, i) => v - lo[i]!);
    // LitematicaBlockStateContainer.getIndex: y·W·L + z·W + x.
    for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
      const v = unpackAt(p.words, p.info.bitsPerEntry, y * W * L + z * W + x), paletteIndex = remap[v]!;
      const position: Vec3 = [base[0]! + x, base[1]! + y, base[2]! + z], key = position.join(',');
      const before = cellAt.get(key);
      if (before) { if (before.kind === 'erase' || before.paletteIndex !== paletteIndex) overlaps++; entityAt.delete(key); }
      cellAt.set(key, { position, kind: AIR_IDS.has(palette[paletteIndex]!.id) ? 'air' : 'block', paletteIndex });
    }
    for (const [i, t] of p.tiles.entries()) {
      const tilePath = `Regions.${p.info.name}.TileEntities[${i}]`, c = compound(t, tilePath);
      // Tile positions are relative to the region's minimum corner.
      const rel = [int(c.x, `${tilePath}.x`), int(c.y, `${tilePath}.y`), int(c.z, `${tilePath}.z`)];
      if (rel.some((n, k) => n < 0 || n >= p.info.dimensions[k]!)) { droppedTiles++; continue; }
      const position: Vec3 = [base[0]! + rel[0]!, base[1]! + rel[1]!, base[2]! + rel[2]!], key = position.join(',');
      if (cellAt.get(key)?.kind !== 'block') { droppedTiles++; continue; }
      if (c.id?.type !== 'string') tilesWithoutId++;
      entityAt.set(key, { position, data: t });
    }
  }
  const cells = [...cellAt.values()].sort((a, b) => a.position[1] - b.position[1] || a.position[2] - b.position[2] || a.position[0] - b.position[0]);
  const blockEntities = [...entityAt.values()].sort((a, b) => a.position[1] - b.position[1] || a.position[2] - b.position[2] || a.position[0] - b.position[0]);

  const regions = parsed.map(p => p.info);
  const selectedRegion = only ?? null;
  if (used.length > 1) warnings.push(`${used.length} Regionen zu einem Bauteil zusammengeführt (${used.map(p => p.info.name).join(', ')}). Zwischenräume bleiben unausgewählt.`);
  if (only !== undefined && names.length > 1) warnings.push(`Nur Region „${only}“ von ${names.length} importiert; die übrigen bleiben im Original erhalten.`);
  if (overlaps) warnings.push(`${overlaps} Zellen liegen in mehreren Regionen mit verschiedenem Inhalt. Hier gilt die spätere Region; Litematica legt die Reihenfolge nicht fest.`);
  if (version < FLATTENED_VERSION || (dataVersion > 0 && dataVersion < FLATTENED_DATA_VERSION)) warnings.push('Datei stammt aus Minecraft 1.12 oder älter: Block-IDs sind nicht umgewandelt und passen nicht zu 1.13+.');
  if (dataVersion === 0) warnings.push('MinecraftDataVersion fehlt; die Zielversion ist unbekannt.');
  warnings.push('Vorschau in lokalen Koordinaten; Regionspositionen und vollständige Quelldaten bleiben separat erhalten.', 'MinecraftDataVersion ist aus der Datei gelesen; Registry-/Modpack-Kompatibilität ist nicht geprüft.');
  if (droppedTiles) warnings.push(`${droppedTiles} BlockEntities liegen außerhalb ihrer Region oder auf Luft und sind nur im Original erhalten.`);
  if (tilesWithoutId) warnings.push(`${tilesWithoutId} BlockEntities ohne id; ein späterer Export kann sie nicht zuordnen.`);
  const entities = used.reduce((n, p) => n + p.info.entities, 0);
  if (entities) warnings.push(`${entities} freie Entities sind im Original/NBT erhalten, werden aber nicht dargestellt.`);
  const ticks = used.reduce((n, p) => { const r = compound(regionsTag[p.info.name], 'Region'); return n + list(r.PendingBlockTicks, 'PendingBlockTicks').length + list(r.PendingFluidTicks, 'PendingFluidTicks').length; }, 0);
  if (ticks) warnings.push(`${ticks} geplante Block-/Flüssigkeitsticks sind im Original erhalten, werden aber nicht übernommen.`);
  if (palette.some(s => !s.id.startsWith('minecraft:'))) warnings.push('Modblöcke gefunden: IDs/Properties bleiben erhalten, Registry unbekannt.');
  const metadata = readMetadata(root.Metadata);

  const payload = createPayload({
    schemaVersion: 1, profileId: `java:dataversion-${dataVersion}:registry-unverified`,
    bounds: { min: [0, 0, 0], maxExclusive: box }, pivot: [0, 0, 0], sourceOrigin: lo,
    palette, cells, blockEntities,
  }, { maxCells: limits.maxVolume, maxVolume: limits.maxDimension ** 3, maxPalette: limits.maxPalette, maxNbtDepth: limits.maxDepth, maxNbtNodes: limits.maxNodes });
  return { format: 'litematic', payload, dataVersion, version, subVersion, offset: lo, regions, selectedRegion, metadata, sourceNbt, warnings };
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/** GZip → NBT with the shared byte, node and time budgets. */
export async function readCompressedNbt(buffer: ArrayBuffer, limits: Pick<LitematicLimits, 'maxCompressedBytes' | 'maxUncompressedBytes' | 'maxDepth' | 'maxNodes' | 'maxDurationMs'>): Promise<{ sourceNbt: { name: string; tag: NbtTag }; sourceSha256: string }> {
  if (buffer.byteLength > limits.maxCompressedBytes) throw new FormatError('LIMIT', 'Komprimierte Datei überschreitet das Größenlimit.');
  const input = new Uint8Array(buffer);
  if (input[0] !== 31 || input[1] !== 139) throw new FormatError('GZIP', 'Erwartet GZip-komprimiertes NBT.');
  const start = performance.now();
  const raw = await gunzipLimited(buffer, limits);
  const remaining = limits.maxDurationMs - (performance.now() - start);
  if (remaining < 1) throw new FormatError('TIMEOUT', 'Zeitbudget überschritten.');
  const sourceNbt = readNbt(raw, { ...NBT_LIMITS, maxBytes: limits.maxUncompressedBytes, maxDepth: limits.maxDepth, maxNodes: limits.maxNodes, maxDurationMs: Math.max(1, Math.floor(remaining)) });
  return { sourceNbt, sourceSha256: await sha256Hex(buffer) };
}

export async function importLitematic(buffer: ArrayBuffer, options: LitematicOptions = {}): Promise<LitematicResult> {
  const limits = { ...LITEMATIC_LIMITS, ...options };
  const { sourceNbt, sourceSha256 } = await readCompressedNbt(buffer, limits);
  return { ...normalizeLitematic(sourceNbt, options), sourceSha256 };
}
