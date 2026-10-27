import { validatePayload, AIR_IDS } from '../../voxel/src/validation.js';
import type { BlockEntity, BlockState, NbtTag, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { FormatError } from './nbt.js';
import { gzip, writeNbt } from './nbtWrite.js';
import { litematicBits } from './litematic.js';
import { SCHEM_EXPORT_LIMITS } from './schemWrite.js';
import type { SchemAnchor, SchemExportLimits, SchemExportReport, UnselectedPolicy } from './schemWrite.js';

/**
 * Litematica `.litematic` writer: one region holding the resolved world box.
 * Same anchor, air and unselected policies as the Schem export, so both files
 * describe the same cells. Litematica refuses files whose Version is newer than
 * its own, so the format follows the target: Litematica for MC 1.13–1.17
 * writes 5, for 1.18–1.20.4 writes 6, from 1.20.5 on 7. The block, palette and
 * tile layout is the same in all three.
 */

/** First DataVersion of MC 1.18 (format 6) and last of MC 1.20.4 (format 6). */
export const LITEMATIC_V6_FIRST_DATA_VERSION = 2860, LITEMATIC_V6_LAST_DATA_VERSION = 3700;
export type LitematicWriteVersion = 5 | 6 | 7;
export function litematicVersionFor(dataVersion: number): LitematicWriteVersion {
  return dataVersion > LITEMATIC_V6_LAST_DATA_VERSION ? 7 : dataVersion >= LITEMATIC_V6_FIRST_DATA_VERSION ? 6 : 5;
}
const VERSION_NOTE: Readonly<Record<LitematicWriteVersion, string>> = { 5: 'Litematica für Minecraft 1.13–1.17', 6: 'Litematica für Minecraft 1.18–1.20.4', 7: 'Litematica ab Minecraft 1.20.5' };

export interface LitematicWriteOptions {
  readonly dataVersion: number;
  readonly anchor: SchemAnchor;
  readonly unselected: UnselectedPolicy;
  /** Region name; Litematica shows it in the placement list. */
  readonly regionName?: string;
  readonly metadata?: {
    readonly name?: string;
    readonly author?: string;
    readonly description?: string;
    /** Milliseconds since epoch. */
    readonly date?: number;
    /** Own compound fields under Metadata; Litematica ignores unknown keys. */
    readonly extra?: Readonly<Record<string, NbtTag>>;
  };
}

export interface LitematicExportReport extends SchemExportReport {
  readonly format: 'litematic';
  readonly litematicVersion: LitematicWriteVersion;
  readonly subVersion: number;
  readonly regionName: string;
  readonly bitsPerEntry: number;
  /** Fields next to Id/Pos/Data in Sponge-style entries that the tile format has no place for. */
  readonly droppedBlockEntityFields: number;
}

export interface LitematicExport {
  readonly bytes: Uint8Array;
  readonly raw: Uint8Array;
  readonly sha256: string;
  readonly nbt: { readonly name: string; readonly tag: NbtTag };
  readonly report: LitematicExportReport;
}

function fail(message: string): never { throw new FormatError('LITEMATIC_EXPORT', message); }
const int = (value: number): NbtTag => ({ type: 'int', value });
const str = (value: string): NbtTag => ({ type: 'string', value });
const long = (value: number | bigint): NbtTag => ({ type: 'long', value: String(value) });
const pos = (v: Vec3): NbtTag => ({ type: 'compound', value: { x: int(v[0]), y: int(v[1]), z: int(v[2]) } });
const compoundList = (value: NbtTag[]): NbtTag => ({ type: 'list', elementType: value.length ? 'compound' : 'end', value });

/** `{Name, Properties}` with properties sorted, as Minecraft's NbtHelper writes them. */
function paletteEntry(state: BlockState): NbtTag {
  const props = Object.entries(state.properties).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const value: Record<string, NbtTag> = { Name: str(state.id) };
  if (props.length) value.Properties = { type: 'compound', value: Object.fromEntries(props.map(([k, v]) => [k, str(v)])) };
  return { type: 'compound', value };
}

/** Packs values tightly, little-endian across longs (LitematicaBitArray), as int64 decimal strings. */
export function packLongs(values: ArrayLike<number>, bits: number): string[] {
  const words = new Uint32Array(Math.ceil(values.length * bits / 64) * 2);
  for (let i = 0; i < values.length; i++) {
    const start = i * bits, w = Math.floor(start / 32), shift = start % 32, v = values[i]!;
    words[w] = (words[w]! | (v << shift)) >>> 0;
    if (shift + bits > 32) words[w + 1] = (words[w + 1]! | (v >>> (32 - shift))) >>> 0;
  }
  const out: string[] = [];
  for (let i = 0; i < words.length; i += 2) out.push(BigInt.asIntN(64, (BigInt(words[i + 1]!) << 32n) | BigInt(words[i]!)).toString());
  return out;
}

/** Converts a stored BlockEntity into Litematica's tile layout: raw tile NBT with id and region-local x/y/z. */
function tileEntry(entity: BlockEntity, local: Vec3): { tag: NbtTag; converted: boolean; dropped: number } {
  const where = entity.position.join('/');
  if (entity.data.type !== 'compound') fail(`BlockEntity bei ${where} ist kein Compound.`);
  const data = entity.data.value, xyz = { x: int(local[0]), y: int(local[1]), z: int(local[2]) };
  if (data.Id) {
    if (data.Id.type !== 'string') fail(`BlockEntity bei ${where}: Id ist kein Text.`);
    if (data.Data && data.Data.type !== 'compound') fail(`BlockEntity bei ${where}: Data ist kein Compound.`);
    const rest: Record<string, NbtTag> = {};
    for (const [k, v] of Object.entries(data.Data?.type === 'compound' ? data.Data.value : {})) if (!['id', 'x', 'y', 'z'].includes(k)) rest[k] = v;
    const dropped = Object.keys(data).filter(k => !['Id', 'Pos', 'Data'].includes(k)).length;
    return { tag: { type: 'compound', value: { ...rest, id: data.Id, ...xyz } }, converted: true, dropped };
  }
  if (data.id?.type === 'string') {
    const rest: Record<string, NbtTag> = {};
    for (const [k, v] of Object.entries(data)) if (!['x', 'y', 'z'].includes(k)) rest[k] = v;
    return { tag: { type: 'compound', value: { ...rest, ...xyz } }, converted: false, dropped: 0 };
  }
  return fail(`BlockEntity bei ${where} hat keine id; Export würde Daten verlieren.`);
}

/** Pure and deterministic: palette index 0 is air, further states in Y→Z→X order of first use. */
export function buildLitematic(world: VoxelPayload, options: LitematicWriteOptions, limitOverrides: Partial<SchemExportLimits> = {}): { nbt: { name: string; tag: NbtTag }; report: LitematicExportReport } {
  const limits = { ...SCHEM_EXPORT_LIMITS, ...limitOverrides };
  validatePayload(world, { maxVolume: Math.max(limits.maxVolume, 1) });
  if (!Number.isSafeInteger(options.dataVersion) || options.dataVersion < 1 || options.dataVersion > 2_147_483_647) fail('DataVersion muss eine positive Ganzzahl sein.');
  if (options.anchor !== 'project-origin' && options.anchor !== 'min-corner') fail('Unbekannter Ankerpunkt.');
  if (options.unselected !== 'air' && options.unselected !== 'structure_void') fail('Unbekannte Politik für nicht ausgewählte Zellen.');
  const regionName = (options.regionName ?? '').trim() || 'Bauplan';
  const min = world.bounds.min, max = world.bounds.maxExclusive;
  const [W, H, L] = [0, 1, 2].map(i => max[i]! - min[i]!) as [number, number, number];
  for (const [name, n] of [['Breite', W], ['Höhe', H], ['Länge', L]] as const) if (n > limits.maxDimension) fail(`${name} ${n} überschreitet ${limits.maxDimension}.`);
  const volume = W * H * L;
  if (volume > limits.maxVolume) fail(`Exportvolumen ${volume} überschreitet ${limits.maxVolume} Zellen.`);

  const AIR = 'minecraft:air';
  const states: BlockState[] = [{ id: AIR, properties: {} }];
  const keyOf = (s: BlockState) => JSON.stringify([s.id, Object.entries(s.properties).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)]);
  const index = new Map<string, number>([[keyOf(states[0]!), 0]]);
  const idOf = (s: BlockState): number => { const k = keyOf(s); let i = index.get(k); if (i === undefined) { i = states.length; states.push(s); index.set(k, i); } return i; };
  const at = (p: Vec3): number => (p[0] - min[0]) + (p[2] - min[2]) * W + (p[1] - min[1]) * W * L;
  // Cell source per box index: palette index of the world, -2 = erase, -1 = unselected.
  const source = new Int32Array(volume).fill(-1);
  let blocks = 0, explicitAir = 0, erasedAsAir = 0;
  for (const cell of world.cells) {
    if (cell.kind === 'erase') { erasedAsAir++; source[at(cell.position)] = -2; continue; }
    if (cell.kind === 'air') explicitAir++; else blocks++;
    source[at(cell.position)] = cell.paletteIndex;
  }
  const unselectedState: BlockState = { id: options.unselected === 'air' ? AIR : 'minecraft:structure_void', properties: {} };
  const unselected = volume - world.cells.length;
  const worldToFile = new Int32Array(world.palette.length).fill(-1);
  const values = new Uint32Array(volume);
  for (let i = 0; i < volume; i++) {
    const s = source[i]!;
    if (s === -2) values[i] = 0;
    else if (s === -1) values[i] = idOf(unselectedState);
    else { if (worldToFile[s] === -1) worldToFile[s] = idOf(world.palette[s]!); values[i] = worldToFile[s]!; }
  }
  const bits = litematicBits(states.length);

  const tiles: NbtTag[] = [];
  let converted = 0, droppedFields = 0;
  for (const e of [...world.blockEntities].sort((a, b) => at(a.position) - at(b.position))) {
    const r = tileEntry(e, [e.position[0] - min[0], e.position[1] - min[1], e.position[2] - min[2]]);
    tiles.push(r.tag); if (r.converted) converted++; droppedFields += r.dropped;
  }

  const position: Vec3 = options.anchor === 'project-origin' ? [min[0], min[1], min[2]] : [0, 0, 0];
  const version = litematicVersionFor(options.dataVersion), subVersion = 1;
  const requiredMods = [...new Set(world.palette.map(s => s.id.split(':')[0]!).filter(ns => ns !== 'minecraft'))].sort();
  const date = options.metadata?.date;
  if (date !== undefined && !Number.isSafeInteger(date)) fail('Metadata-Zeit muss Millisekunden als Ganzzahl sein.');
  const totalBlocks = Array.from(values).filter(v => !AIR_IDS.has(states[v]!.id)).length;
  const meta: Record<string, NbtTag> = {
    Name: str(options.metadata?.name ?? regionName), Author: str(options.metadata?.author ?? ''), Description: str(options.metadata?.description ?? ''),
    RegionCount: int(1), TotalVolume: int(volume), TotalBlocks: int(totalBlocks),
    TimeCreated: long(date ?? 0), TimeModified: long(date ?? 0), EnclosingSize: pos([W, H, L]),
  };
  for (const [k, v] of Object.entries(options.metadata?.extra ?? {})) {
    if (k in meta) fail(`Metadata-Feld ${k} ist reserviert.`);
    meta[k] = v;
  }
  const region: Record<string, NbtTag> = {
    Position: pos(position), Size: pos([W, H, L]),
    BlockStatePalette: compoundList(states.map(paletteEntry)),
    BlockStates: { type: 'longArray', value: packLongs(values, bits) },
    TileEntities: compoundList(tiles), Entities: compoundList([]), PendingBlockTicks: compoundList([]), PendingFluidTicks: compoundList([]),
  };
  const root: Record<string, NbtTag> = {
    MinecraftDataVersion: int(options.dataVersion), Version: int(version), SubVersion: int(subVersion),
    Metadata: { type: 'compound', value: meta }, Regions: { type: 'compound', value: { [regionName]: { type: 'compound', value: region } } },
  };

  const warnings: string[] = [
    `DataVersion ${options.dataVersion} ist gewählt, nicht gegen eine Minecraft-Registry geprüft. Litematic-Format ${version} (${VERSION_NOTE[version]}; neuere Litematica-Versionen lesen es ebenfalls).`,
    'Ob Luftzellen beim Einfügen vorhandene Blöcke räumen, entscheidet die Litematica-Einstellung „Paste Replace Behavior“.',
    'Biome und freie Entities werden nicht exportiert.',
  ];
  if (erasedAsAir) warnings.push(`${erasedAsAir} Löschzellen sind als minecraft:air geschrieben.`);
  if (unselected && options.unselected === 'air') warnings.push(`${unselected} nicht ausgewählte Zellen der Box sind als Luft geschrieben.`);
  if (unselected && options.unselected === 'structure_void') warnings.push(`${unselected} nicht ausgewählte Zellen sind minecraft:structure_void, ein echter Block.`);
  if (requiredMods.length) warnings.push(`Modblöcke aus ${requiredMods.join(', ')}: Registry unbekannt.`);
  if (converted) warnings.push(`${converted} BlockEntities aus dem Sponge-Format (Id/Pos/Data) in Litematicas Tile-Format (id/x/y/z) übertragen.`);
  if (droppedFields) warnings.push(`${droppedFields} Zusatzfelder neben Id/Pos/Data haben im Tile-Format keinen Platz und fehlen in der Datei.`);

  return {
    nbt: { name: '', tag: { type: 'compound', value: root } },
    report: {
      format: 'litematic', litematicVersion: version, subVersion, regionName, bitsPerEntry: bits, droppedBlockEntityFields: droppedFields,
      dimensions: [W, H, L], volume, offset: position, anchor: options.anchor, worldMin: [min[0], min[1], min[2]], dataVersion: options.dataVersion,
      paletteSize: states.length, counts: { blocks, explicitAir, erasedAsAir, unselected }, unselectedState: unselectedState.id,
      blockEntities: tiles.length, convertedBlockEntities: converted, requiredMods, warnings,
    },
  };
}

/** Builds, serialises and GZip-compresses a `.litematic` file. */
export async function writeLitematic(world: VoxelPayload, options: LitematicWriteOptions, limits: Partial<SchemExportLimits> = {}): Promise<LitematicExport> {
  const { nbt, report } = buildLitematic(world, options, limits);
  const raw = writeNbt(nbt);
  const bytes = await gzip(raw);
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return { bytes, raw, sha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join(''), nbt, report };
}
