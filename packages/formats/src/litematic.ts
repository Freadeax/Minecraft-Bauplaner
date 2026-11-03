import { EXPLICIT_AIR_MAX_VOLUME, MODEL_MAX_CELLS, MODEL_MAX_FILE_BYTES, MODEL_MAX_SIDE, MODEL_MAX_UNCOMPRESSED_BYTES, MODEL_MAX_VOLUME, formatCount } from '../../voxel/src/sizeLimits.js';
import { adoptPayload, stateKey, AIR_IDS } from '../../voxel/src/validation.js';
import type { BlockEntity, BlockState, Cell, FreeEntity, NbtTag, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { readFileEntities } from './entityIo.js';
import { FormatError, NBT_LIMITS, readNbt } from './nbt.js';
import { gunzipLimited } from './schem.js';

/**
 * Litematica `.litematic` reader (P5-01). Layout as written by Litematica
 * (LitematicaSchematic / LitematicaBitArray): NBT root (GZip as Litematica
 * writes it; also uncompressed or zlib, as some converters do) with Version,
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
  /** Cells over all imported regions' boxes (air included). */
  maxVolume: number;
  /** Payload cells actually kept (blocks, plus explicit air while the volume allows it). */
  maxCells: number;
  /**
   * Up to this imported volume air stays an explicit `air` cell. Larger files
   * (e.g. converted maps) keep only their blocks; air becomes unselected so the
   * preview stays responsive. A warning names the case.
   */
  maxAirVolume: number;
  /** Per axis of the enclosing box. */
  maxDimension: number;
  maxRegions: number; maxPalette: number; maxDepth: number; maxNodes: number; maxDurationMs: number;
}
/**
 * Up to 250 000 cells the result is the same as the Schem import (air explicit).
 * Bigger Litematic files are common (whole builds converted from schematics),
 * so the box may reach 16.7 million cells (4096 per axis) and up to four million blocks (SIZE-01);
 * the BlockStates LongArray of such a box needs up to ~4 million NBT nodes at 16 bit.
 */
export const LITEMATIC_LIMITS: Readonly<LitematicLimits> = Object.freeze({
  // SIZE-01: large builds (vorher 256 je Achse, 1 Mio. Blöcke, 4 MB Datei).
  maxCompressedBytes: MODEL_MAX_FILE_BYTES, maxUncompressedBytes: MODEL_MAX_UNCOMPRESSED_BYTES, maxVolume: MODEL_MAX_VOLUME, maxCells: MODEL_MAX_CELLS, maxAirVolume: EXPLICIT_AIR_MAX_VOLUME, maxDimension: MODEL_MAX_SIDE,
  maxRegions: 64, maxPalette: 20_000, maxDepth: 32, maxNodes: MODEL_MAX_VOLUME, maxDurationMs: 60_000,
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
  /** Count per `id` (e.g. minecraft:sign, minecraft:painting), most frequent first; '?' without id. */
  readonly tileEntityTypes: readonly (readonly [string, number])[];
  readonly entityTypes: readonly (readonly [string, number])[];
  /** Scheduled block and fluid ticks stored with the region. */
  readonly pendingTicks: number;
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
  readonly regionCount?: number;
  /** Not written by Litematica itself; converters such as Litemapy add it. */
  readonly software?: string;
  /** Edge length of the square ARGB `PreviewImageData`, 0 when the array is empty. */
  readonly previewImageSize?: number;
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
  /** How the file was stored; Litematica itself writes gzip. */
  readonly compression?: NbtCompression;
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

/** `id` histogram of tile entity / entity compounds, most frequent first, then by name. */
function typeCounts(tags: readonly NbtTag[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const t of tags) { const id = t.type === 'compound' && t.value.id?.type === 'string' ? t.value.id.value : '?'; counts.set(id, (counts.get(id) ?? 0) + 1); }
  return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
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
  if (budget.volume > limits.maxVolume) throw new FormatError('LIMIT', `Regionen überschreiten zusammen ${formatCount(limits.maxVolume)} Zellen.`);
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
  const tiles = list(r.TileEntities, `${path}.TileEntities`), entityTags = list(r.Entities, `${path}.Entities`);
  const pendingTicks = list(r.PendingBlockTicks, `${path}.PendingBlockTicks`).length + list(r.PendingFluidTicks, `${path}.PendingFluidTicks`).length;
  return { info: { name, position, size, min, dimensions, volume, paletteSize: palette.length, bitsPerEntry: bits, blocks, air, tileEntities: tiles.length, entities: entityTags.length,
    tileEntityTypes: typeCounts(tiles), entityTypes: typeCounts(entityTags), pendingTicks }, palette, words, tiles };
}

function readMetadata(tag: NbtTag | undefined): LitematicMetadata {
  if (tag === undefined) return {};
  const m = compound(tag, 'Metadata');
  const text = (k: string) => m[k]?.type === 'string' ? m[k].value : undefined;
  const long = (k: string) => m[k]?.type === 'long' ? m[k].value : undefined;
  const num = (k: string) => m[k]?.type === 'int' ? m[k].value : undefined;
  const out: Record<string, unknown> = { name: text('Name'), author: text('Author'), description: text('Description'), timeCreated: long('TimeCreated'), timeModified: long('TimeModified'), totalBlocks: num('TotalBlocks'), totalVolume: num('TotalVolume'), regionCount: num('RegionCount'), software: text('Software') };
  if (m.PreviewImageData?.type === 'intArray') out.previewImageSize = Math.floor(Math.sqrt(m.PreviewImageData.value.length));
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
  const [BW, BH, BL] = box, boxVolume = BW * BH * BL;
  // Regions far apart span a box much larger than their own volume; the merge works on that dense box.
  if (boxVolume > limits.maxVolume) throw new FormatError('LIMIT', `Die Regionen spannen ${box.join(' × ')} Blöcke (${formatCount(boxVolume)} Zellen) auf; erlaubt sind höchstens ${formatCount(limits.maxVolume)}. Einzelne Regionen lassen sich getrennt importieren.`);
  const keepAir = used.reduce((n, p) => n + p.info.volume, 0) <= limits.maxAirVolume;
  // Dense box: payload palette index + 1 per cell, 0 = not covered by any imported region.
  const dense = new Int32Array(boxVolume);
  const boxIndex = (x: number, y: number, z: number) => (y * BL + z) * BW + x;
  const entityAt = new Map<number, BlockEntity>();
  let overlaps = 0, droppedTiles = 0, tilesWithoutId = 0, airCells = 0;
  const warnings: string[] = [];
  for (const p of used) {
    const remap = p.palette.map(state => {
      const key = stateKey(state); let i = byState.get(key);
      if (i === undefined) { i = palette.length; palette.push(state); byState.set(key, i); }
      return i;
    });
    const [W, H, L] = p.info.dimensions, base = p.info.min.map((v, i) => v - lo[i]!), bits = p.info.bitsPerEntry;
    // LitematicaBlockStateContainer.getIndex: y·W·L + z·W + x.
    let source = 0;
    for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) {
      let at = boxIndex(base[0]!, base[1]! + y, base[2]! + z);
      for (let x = 0; x < W; x++, at++, source++) {
        const next = remap[unpackAt(p.words, bits, source)]! + 1, before = dense[at]!;
        if (before) { if (before !== next) overlaps++; entityAt.delete(at); }
        dense[at] = next;
      }
    }
    for (const [i, t] of p.tiles.entries()) {
      const tilePath = `Regions.${p.info.name}.TileEntities[${i}]`, c = compound(t, tilePath);
      // Tile positions are relative to the region's minimum corner.
      const rel = [int(c.x, `${tilePath}.x`), int(c.y, `${tilePath}.y`), int(c.z, `${tilePath}.z`)];
      if (rel.some((n, k) => n < 0 || n >= p.info.dimensions[k]!)) { droppedTiles++; continue; }
      const position: Vec3 = [base[0]! + rel[0]!, base[1]! + rel[1]!, base[2]! + rel[2]!], at = boxIndex(...position);
      if (!dense[at] || AIR_IDS.has(palette[dense[at]! - 1]!.id)) { droppedTiles++; continue; }
      if (c.id?.type !== 'string') tilesWithoutId++;
      entityAt.set(at, { position, data: t });
    }
  }
  const isAir = palette.map(s => AIR_IDS.has(s.id));
  // Cells in Y→Z→X order straight from the dense box (already sorted).
  const cells: Cell[] = [];
  for (let at = 0, y = 0; y < BH; y++) for (let z = 0; z < BL; z++) for (let x = 0; x < BW; x++, at++) {
    const v = dense[at]!; if (!v) continue;
    const paletteIndex = v - 1;
    if (isAir[paletteIndex]) { airCells++; if (!keepAir) continue; }
    if (cells.length >= limits.maxCells) throw new FormatError('LIMIT', `Mehr als ${formatCount(limits.maxCells)} Blöcke; einzelne Regionen lassen sich getrennt importieren.`);
    cells.push({ position: [x, y, z], kind: isAir[paletteIndex] ? 'air' : 'block', paletteIndex });
  }
  const blockEntities = [...entityAt.keys()].sort((a, b) => a - b).map(k => entityAt.get(k)!);

  const regions = parsed.map(p => p.info);
  const selectedRegion = only ?? null;
  if (used.length > 1) warnings.push(`${used.length} Regionen zu einem Bauteil zusammengeführt (${used.map(p => p.info.name).join(', ')}). Zwischenräume bleiben unausgewählt.`);
  if (only !== undefined && names.length > 1) warnings.push(`Nur Region „${only}“ von ${names.length} importiert; die übrigen bleiben im Original erhalten.`);
  if (!keepAir && airCells) warnings.push(`Großes Modell: ${airCells.toLocaleString('de-DE')} Luftzellen sind nicht als Zellen übernommen (bleiben unausgewählt), damit Vorschau und Mengen flüssig bleiben. Das Original enthält sie unverändert.`);
  if (overlaps) warnings.push(`${overlaps} Zellen liegen in mehreren Regionen mit verschiedenem Inhalt. Hier gilt die spätere Region; Litematica legt die Reihenfolge nicht fest.`);
  if (version < FLATTENED_VERSION || (dataVersion > 0 && dataVersion < FLATTENED_DATA_VERSION)) warnings.push('Datei stammt aus Minecraft 1.12 oder älter: Block-IDs sind nicht umgewandelt und passen nicht zu 1.13+.');
  if (dataVersion === 0) warnings.push('MinecraftDataVersion fehlt; die Zielversion ist unbekannt.');
  warnings.push('Vorschau in lokalen Koordinaten; Regionspositionen und vollständige Quelldaten bleiben separat erhalten.', 'MinecraftDataVersion ist aus der Datei gelesen; Registry-/Modpack-Kompatibilität ist nicht geprüft.');
  if (droppedTiles) warnings.push(`${droppedTiles} BlockEntities liegen außerhalb ihrer Region oder auf Luft und sind nur im Original erhalten.`);
  if (tilesWithoutId) warnings.push(`${tilesWithoutId} BlockEntities ohne id; ein späterer Export kann sie nicht zuordnen.`);
  const metadata = readMetadata(root.Metadata);
  const counted = used.reduce((n, p) => n + p.info.blocks, 0);
  if (only === undefined && metadata.totalBlocks !== undefined && metadata.totalBlocks !== counted) warnings.push(`Metadata nennt ${metadata.totalBlocks} Blöcke, gelesen wurden ${counted}; die Datei wurde vermutlich außerhalb von Litematica verändert.`);
  if (metadata.software) warnings.push(`Erstellt mit ${metadata.software}, nicht von Litematica selbst gespeichert.`);
  if (counted <= 1 && parsed.every(p => p.info.volume <= 1)) warnings.push('Die Datei enthält nur einen einzelnen Block; vermutlich ist die Umwandlung an der Quelle fehlgeschlagen.');
  // Free entities: `Pos` is relative to the region's Position (not its minimum corner), see LITEMATIC.md.
  const entities: FreeEntity[] = [];
  let droppedEntities = 0;
  for (const p of used) {
    const tags = list(compound(regionsTag[p.info.name], 'Region').Entities, 'Entities');
    const r = readFileEntities(tags, pos => [p.info.position[0] + pos[0] - lo[0], p.info.position[1] + pos[1] - lo[1], p.info.position[2] + pos[2] - lo[2]], { min: [0, 0, 0], maxExclusive: box });
    entities.push(...r.entities); droppedEntities += r.dropped;
  }
  if (entities.length) {
    const kinds = typeCounts(entities.map(e => e.data)).map(([id, n]) => `${n}× ${id.replace(/^minecraft:/, '')}`).join(', ');
    warnings.push(`${entities.length} freie Entities übernommen (${kinds}); Gemälde, Rahmen und Rüstungsständer werden dargestellt, andere als Platzhalter.`);
  }
  if (droppedEntities) warnings.push(`${droppedEntities} Entities ohne lesbare Position/id oder weit außerhalb der Box sind nur im Original erhalten.`);
  const ticks = used.reduce((n, p) => n + p.info.pendingTicks, 0);
  if (ticks) warnings.push(`${ticks} geplante Block-/Flüssigkeitsticks sind im Original erhalten, werden aber nicht übernommen.`);
  if (palette.some(s => !s.id.startsWith('minecraft:'))) warnings.push('Modblöcke gefunden: IDs/Properties bleiben erhalten, Registry unbekannt.');

  const payload = adoptPayload({
    schemaVersion: 1, profileId: `java:dataversion-${dataVersion}:registry-unverified`,
    bounds: { min: [0, 0, 0], maxExclusive: box }, pivot: [0, 0, 0], sourceOrigin: lo,
    palette, cells, blockEntities, ...(entities.length && { entities }),
  }, { maxCells: limits.maxCells, maxVolume: Math.max(limits.maxVolume, boxVolume), maxPalette: limits.maxPalette, maxNbtDepth: limits.maxDepth, maxNbtNodes: limits.maxNodes });
  return { format: 'litematic', payload, dataVersion, version, subVersion, offset: lo, regions, selectedRegion, metadata, sourceNbt, warnings };
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export type NbtCompression = 'gzip' | 'zlib' | 'none';
/**
 * Litematica and Sponge tools write GZip; converters (e.g. Litemapy-based
 * sites) and hand-built files also produce uncompressed or zlib NBT. All three
 * are recognised by their first bytes, never by the file name.
 */
export function detectNbtCompression(bytes: Uint8Array): NbtCompression | null {
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return 'gzip';
  if (bytes[0] === 0x78 && bytes.length > 1 && ((bytes[0] << 8) | bytes[1]!) % 31 === 0) return 'zlib';
  // Uncompressed NBT: TAG_Compound followed by a name length.
  if (bytes[0] === 0x0a && bytes.length >= 3) return 'none';
  return null;
}

async function inflateLimited(buffer: ArrayBuffer, limits: Pick<LitematicLimits, 'maxUncompressedBytes' | 'maxDurationMs'>): Promise<Uint8Array> {
  const reader = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  const chunks: Uint8Array[] = []; let total = 0; let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new FormatError('TIMEOUT', 'Zeitbudget beim Entpacken überschritten.')), limits.maxDurationMs); });
  try {
    while (true) { const { done, value } = await Promise.race([reader.read(), timeout]); if (done) break; total += value.byteLength; if (total > limits.maxUncompressedBytes) throw new FormatError('LIMIT', 'Entpackte Datei überschreitet das Größenlimit.'); chunks.push(value); }
  } catch (e) { if (e instanceof FormatError) throw e; throw new FormatError('ZLIB', 'zlib-Daten sind beschädigt oder unvollständig.'); }
  finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
  const raw = new Uint8Array(total); let p = 0; for (const chunk of chunks) { raw.set(chunk, p); p += chunk.byteLength; }
  return raw;
}

/** GZip, zlib or uncompressed → NBT with the shared byte, node and time budgets. */
export async function readCompressedNbt(buffer: ArrayBuffer, limits: Pick<LitematicLimits, 'maxCompressedBytes' | 'maxUncompressedBytes' | 'maxDepth' | 'maxNodes' | 'maxDurationMs'>): Promise<{ sourceNbt: { name: string; tag: NbtTag }; sourceSha256: string; compression: NbtCompression }> {
  const input = new Uint8Array(buffer), compression = detectNbtCompression(input);
  if (compression === null) throw new FormatError('GZIP', 'Erwartet NBT (GZip-komprimiert, zlib oder unkomprimiert).');
  if (buffer.byteLength > (compression === 'none' ? limits.maxUncompressedBytes : limits.maxCompressedBytes)) throw new FormatError('LIMIT', compression === 'none' ? 'Datei überschreitet das Größenlimit.' : 'Komprimierte Datei überschreitet das Größenlimit.');
  const start = performance.now();
  const raw = compression === 'gzip' ? await gunzipLimited(buffer, limits) : compression === 'zlib' ? await inflateLimited(buffer, limits) : input;
  const remaining = limits.maxDurationMs - (performance.now() - start);
  if (remaining < 1) throw new FormatError('TIMEOUT', 'Zeitbudget überschritten.');
  const sourceNbt = readNbt(raw, { ...NBT_LIMITS, maxBytes: limits.maxUncompressedBytes, maxDepth: limits.maxDepth, maxNodes: limits.maxNodes, maxDurationMs: Math.max(1, Math.floor(remaining)) });
  return { sourceNbt, sourceSha256: await sha256Hex(buffer), compression };
}

export async function importLitematic(buffer: ArrayBuffer, options: LitematicOptions = {}): Promise<LitematicResult> {
  const limits = { ...LITEMATIC_LIMITS, ...options };
  const { sourceNbt, sourceSha256, compression } = await readCompressedNbt(buffer, limits);
  return { ...normalizeLitematic(sourceNbt, options), sourceSha256, compression };
}
