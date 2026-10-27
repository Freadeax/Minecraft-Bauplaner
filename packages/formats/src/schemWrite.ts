import { validatePayload } from '../../voxel/src/validation.js';
import type { BlockEntity, BlockState, NbtTag, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { FormatError } from './nbt.js';
import { gzip, writeNbt } from './nbtWrite.js';

/**
 * Where the paste point lies relative to the exported box.
 * - `project-origin`: Offset = world minimum, so the project coordinate 0/0/0 lands on the paste point.
 * - `min-corner`: Offset = 0/0/0, the lowest north-west corner lands on the paste point.
 */
export type SchemAnchor = 'project-origin' | 'min-corner';
/** State written for cells inside the box that no instance selects. */
export type UnselectedPolicy = 'air' | 'structure_void';

export interface SchemWriteOptions {
  /** Minecraft DataVersion the palette is meant for. Not verified against a registry. */
  readonly dataVersion: number;
  readonly anchor: SchemAnchor;
  readonly unselected: UnselectedPolicy;
  readonly metadata?: {
    readonly name?: string;
    readonly author?: string;
    /** Milliseconds since epoch. */
    readonly date?: number;
    /** Additional own compound fields, written under Metadata (e.g. revision identity). */
    readonly extra?: Readonly<Record<string, NbtTag>>;
  };
}

export interface SchemExportLimits { readonly maxVolume: number; readonly maxDimension: number }
/** Unsigned-short dimensions; the volume cap keeps the browser export bounded. */
export const SCHEM_EXPORT_LIMITS: Readonly<SchemExportLimits> = Object.freeze({ maxVolume: 4_000_000, maxDimension: 65_535 });

export interface SchemExportReport {
  readonly dimensions: Vec3;
  readonly volume: number;
  readonly offset: Vec3;
  readonly anchor: SchemAnchor;
  /** World coordinate of the schematic's local 0/0/0 cell. */
  readonly worldMin: Vec3;
  readonly dataVersion: number;
  readonly paletteSize: number;
  readonly counts: {
    /** Non-air block cells. */
    readonly blocks: number;
    /** Explicitly selected air cells, written with their own air id. */
    readonly explicitAir: number;
    /** Erase cells ("hier räumen"), written as minecraft:air. */
    readonly erasedAsAir: number;
    /** Box cells that no instance selects, written per `unselected` policy. */
    readonly unselected: number;
  };
  readonly unselectedState: string;
  readonly blockEntities: number;
  /** Raw tile NBT (id/x/y/z) converted into the Sponge v3 BlockEntity layout. */
  readonly convertedBlockEntities: number;
  readonly requiredMods: readonly string[];
  readonly warnings: readonly string[];
}

export interface SchemExport {
  /** GZip compressed .schem file. */
  readonly bytes: Uint8Array;
  /** Uncompressed NBT, identical content. */
  readonly raw: Uint8Array;
  /** SHA-256 of `bytes`. */
  readonly sha256: string;
  readonly nbt: { readonly name: string; readonly tag: NbtTag };
  readonly report: SchemExportReport;
}

function fail(message: string): never { throw new FormatError('SCHEM_EXPORT', message); }

const PROPERTY_TOKEN = /^[a-z0-9_.+-]+$/i;
/** Canonical `id[key=value,…]` with sorted keys; refuses text the Schem palette syntax cannot carry. */
export function formatBlockState(state: BlockState): string {
  const entries = Object.entries(state.properties).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  for (const [k, v] of entries) if (!PROPERTY_TOKEN.test(k) || !PROPERTY_TOKEN.test(v)) fail(`Property ${k}=${v} von ${state.id} ist im Schem-Palettenformat nicht darstellbar.`);
  return entries.length ? `${state.id}[${entries.map(([k, v]) => `${k}=${v}`).join(',')}]` : state.id;
}

const int = (value: number): NbtTag => ({ type: 'int', value });
const str = (value: string): NbtTag => ({ type: 'string', value });
const vec = (v: Vec3): NbtTag => ({ type: 'intArray', value: [v[0], v[1], v[2]] });

/**
 * Converts one stored BlockEntity into the Sponge v3 entry. Entries imported from
 * Schem keep Id, Data and unknown fields; Pos is rewritten to the export cell.
 * Raw tile NBT (`id`, `x`, `y`, `z`, …) becomes Id + Data without coordinates.
 */
function blockEntityEntry(entity: BlockEntity, local: Vec3): { tag: NbtTag; converted: boolean } {
  if (entity.data.type !== 'compound') fail(`BlockEntity bei ${entity.position.join('/')} ist kein Compound.`);
  const data = entity.data.value;
  if (data.Id) {
    if (data.Id.type !== 'string') fail(`BlockEntity bei ${entity.position.join('/')}: Id ist kein Text.`);
    if (data.Data && data.Data.type !== 'compound') fail(`BlockEntity bei ${entity.position.join('/')}: Data ist kein Compound.`);
    const value: Record<string, NbtTag> = { Pos: vec(local), Id: data.Id };
    if (data.Data) value.Data = data.Data;
    for (const [k, v] of Object.entries(data)) if (k !== 'Pos' && k !== 'Id' && k !== 'Data') value[k] = v;
    return { tag: { type: 'compound', value }, converted: false };
  }
  if (data.id?.type === 'string') {
    const rest: Record<string, NbtTag> = {};
    for (const [k, v] of Object.entries(data)) if (!['id', 'x', 'y', 'z'].includes(k)) rest[k] = v;
    return { tag: { type: 'compound', value: { Pos: vec(local), Id: data.id, Data: { type: 'compound', value: rest } } }, converted: true };
  }
  return fail(`BlockEntity bei ${entity.position.join('/')} hat keine Id; Export würde Daten verlieren.`);
}

/**
 * Builds the Sponge Schematic v3 NBT tree for a resolved world payload.
 * Pure and deterministic: palette ids follow the first occurrence in the
 * Y→Z→X scan, Data holds one VarInt per cell in index x + z·W + y·W·L.
 */
export function buildSchemV3(world: VoxelPayload, options: SchemWriteOptions, limitOverrides: Partial<SchemExportLimits> = {}): { nbt: { name: string; tag: NbtTag }; report: SchemExportReport } {
  const limits = { ...SCHEM_EXPORT_LIMITS, ...limitOverrides };
  validatePayload(world, { maxVolume: Math.max(limits.maxVolume, 1) });
  if (!Number.isSafeInteger(options.dataVersion) || options.dataVersion < 1 || options.dataVersion > 2_147_483_647) fail('DataVersion muss eine positive Ganzzahl sein.');
  if (options.anchor !== 'project-origin' && options.anchor !== 'min-corner') fail('Unbekannter Ankerpunkt.');
  if (options.unselected !== 'air' && options.unselected !== 'structure_void') fail('Unbekannte Politik für nicht ausgewählte Zellen.');
  const min = world.bounds.min, max = world.bounds.maxExclusive;
  const [W, H, L] = [0, 1, 2].map(i => max[i]! - min[i]!) as [number, number, number];
  for (const [name, n] of [['Breite', W], ['Höhe', H], ['Länge', L]] as const) if (n > limits.maxDimension) fail(`${name} ${n} überschreitet ${limits.maxDimension}.`);
  const volume = W * H * L;
  if (volume > limits.maxVolume) fail(`Exportvolumen ${volume} überschreitet ${limits.maxVolume} Zellen.`);

  // Dense index: palette text per cell; -1 = unselected.
  const cellText = new Int32Array(volume).fill(-1);
  const texts: string[] = [], textIndex = new Map<string, number>();
  const textId = (t: string): number => { let i = textIndex.get(t); if (i === undefined) { i = texts.length; texts.push(t); textIndex.set(t, i); } return i; };
  const stateText = world.palette.map(formatBlockState);
  const AIR = 'minecraft:air';
  const at = (p: Vec3): number => (p[0] - min[0]) + (p[2] - min[2]) * W + (p[1] - min[1]) * W * L;
  let blocks = 0, explicitAir = 0, erasedAsAir = 0;
  for (const cell of world.cells) {
    if (cell.kind === 'erase') { erasedAsAir++; cellText[at(cell.position)] = textId(AIR); continue; }
    if (cell.kind === 'air') explicitAir++; else blocks++;
    cellText[at(cell.position)] = textId(stateText[cell.paletteIndex]!);
  }
  const unselectedState = options.unselected === 'air' ? AIR : 'minecraft:structure_void';
  const unselected = volume - world.cells.length;

  // Palette numbering in scan order, so equal worlds give byte-equal files.
  const unselectedId = unselected ? textId(unselectedState) : -1;
  const paletteOf = new Int32Array(texts.length).fill(-1);
  const palette: Record<string, NbtTag> = Object.create(null);
  let next = 0;
  const data: number[] = [];
  for (let i = 0; i < volume; i++) {
    const t = cellText[i]! >= 0 ? cellText[i]! : unselectedId;
    if (paletteOf[t] === -1) { paletteOf[t] = next++; palette[texts[t]!] = int(paletteOf[t]!); }
    let v = paletteOf[t]!;
    while (v >= 0x80) { data.push(((v & 0x7f) | 0x80) << 24 >> 24); v >>>= 7; }
    data.push(v);
  }

  const entities: NbtTag[] = [];
  let converted = 0;
  for (const e of [...world.blockEntities].sort((a, b) => at(a.position) - at(b.position))) {
    const local: Vec3 = [e.position[0] - min[0], e.position[1] - min[1], e.position[2] - min[2]];
    const r = blockEntityEntry(e, local); entities.push(r.tag); if (r.converted) converted++;
  }

  const offset: Vec3 = options.anchor === 'project-origin' ? [min[0], min[1], min[2]] : [0, 0, 0];
  const requiredMods = [...new Set(world.palette.map(s => s.id.split(':')[0]!).filter(ns => ns !== 'minecraft'))].sort();
  const meta: Record<string, NbtTag> = {};
  if (options.metadata?.name) meta.Name = str(options.metadata.name);
  if (options.metadata?.author) meta.Author = str(options.metadata.author);
  if (options.metadata?.date !== undefined) {
    if (!Number.isSafeInteger(options.metadata.date)) fail('Metadata.Date muss Millisekunden als Ganzzahl sein.');
    meta.Date = { type: 'long', value: String(options.metadata.date) };
  }
  if (requiredMods.length) meta.RequiredMods = { type: 'list', elementType: 'string', value: requiredMods.map(str) };
  // WorldEdit reads the paste origin from WEOffset relative to Offset; keep both consistent.
  meta.WEOffsetX = int(offset[0]); meta.WEOffsetY = int(offset[1]); meta.WEOffsetZ = int(offset[2]);
  for (const [k, v] of Object.entries(options.metadata?.extra ?? {})) {
    if (k in meta) fail(`Metadata-Feld ${k} ist reserviert.`);
    meta[k] = v;
  }

  const blocksTag: Record<string, NbtTag> = { Palette: { type: 'compound', value: palette }, Data: { type: 'byteArray', value: data } };
  if (entities.length) blocksTag.BlockEntities = { type: 'list', elementType: 'compound', value: entities };
  const toShort = (n: number): NbtTag => ({ type: 'short', value: n > 32767 ? n - 65536 : n });
  const schematic: Record<string, NbtTag> = {
    Version: int(3), DataVersion: int(options.dataVersion), Metadata: { type: 'compound', value: meta },
    Width: toShort(W), Height: toShort(H), Length: toShort(L), Offset: vec(offset),
    Blocks: { type: 'compound', value: blocksTag },
  };

  const warnings: string[] = [
    `DataVersion ${options.dataVersion} ist gewählt, nicht gegen eine Minecraft-Registry geprüft.`,
    'Biome und freie Entities werden nicht exportiert.',
  ];
  if (erasedAsAir) warnings.push(`${erasedAsAir} Löschzellen sind als minecraft:air geschrieben. Sie räumen nur beim Einfügen ohne „Luft überspringen“ (WorldEdit -a).`);
  if (explicitAir) warnings.push(`${explicitAir} ausdrückliche Luftzellen behalten ihren Luftzustand und räumen ebenfalls nur ohne -a.`);
  if (unselected && options.unselected === 'air') warnings.push(`${unselected} nicht ausgewählte Zellen der Box sind als Luft geschrieben. Beim Einfügen ohne -a wird dort vorhandenes Gelände gelöscht.`);
  if (unselected && options.unselected === 'structure_void') warnings.push(`${unselected} nicht ausgewählte Zellen sind minecraft:structure_void. WorldEdit setzt diesen Block tatsächlich; nur Werkzeuge, die Strukturleere überspringen, lassen das Gelände unverändert.`);
  if (requiredMods.length) warnings.push(`Modblöcke aus ${requiredMods.join(', ')}: in RequiredMods vermerkt, Registry unbekannt.`);
  if (converted) warnings.push(`${converted} BlockEntities aus Roh-NBT (id/x/y/z) in das Sponge-v3-Format (Id/Pos/Data) übertragen.`);

  return {
    nbt: { name: '', tag: { type: 'compound', value: { Schematic: { type: 'compound', value: schematic } } } },
    report: {
      dimensions: [W, H, L], volume, offset, anchor: options.anchor, worldMin: [min[0], min[1], min[2]], dataVersion: options.dataVersion,
      paletteSize: next, counts: { blocks, explicitAir, erasedAsAir, unselected }, unselectedState,
      blockEntities: entities.length, convertedBlockEntities: converted, requiredMods, warnings,
    },
  };
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/** Builds, serialises and GZip-compresses a Sponge Schematic v3 file. */
export async function writeSchemV3(world: VoxelPayload, options: SchemWriteOptions, limits: Partial<SchemExportLimits> = {}): Promise<SchemExport> {
  const { nbt, report } = buildSchemV3(world, options, limits);
  const raw = writeNbt(nbt);
  const bytes = await gzip(raw);
  return { bytes, raw, sha256: await sha256(bytes), nbt, report };
}

