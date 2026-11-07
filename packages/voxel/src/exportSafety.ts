import type { BlockEntity, Cell, FreeEntity, NbtTag, Vec3, VoxelPayload } from './types.js';

/**
 * Sicherer Exportmodus (RELEASE-01): findet in einem Bauplan alles, was beim Einfügen in eine Welt mehr tut als
 * Blöcke zu setzen – Befehlsblöcke, Befehls-Minecarts, Klickbefehle in Schildern, Büchern und Gegenständen,
 * Spawner mit eigener Kreatur sowie Struktur- und Verbundblöcke. Der Planer führt nichts davon aus; beim
 * Einfügen gelten die Regeln des Zielservers und des Werkzeugs. Der Bericht macht diese Stellen sichtbar,
 * `sanitizeForExport` entfernt sie auf Wunsch, ohne den Rest des Plans zu verändern.
 */
export type ExportSafetyKind = 'command_block' | 'command_minecart' | 'click_command' | 'command_item' | 'spawner' | 'structure_block';

export interface ExportSafetyFinding {
  readonly kind: ExportSafetyKind;
  /** Block- oder Entity-Position im Plan (Weltkoordinaten des Plans). */
  readonly position: Vec3;
  /** Block- oder Entity-Id, an der der Fund hängt. */
  readonly id: string;
  /** Befehlstext, soweit vorhanden (gekürzt). */
  readonly detail?: string;
}

export interface ExportSafetyReport {
  readonly findings: readonly ExportSafetyFinding[];
  readonly counts: Readonly<Record<ExportSafetyKind, number>>;
  readonly total: number;
}

export const EXPORT_SAFETY_LABEL: Readonly<Record<ExportSafetyKind, string>> = Object.freeze({
  command_block: 'Befehlsblock',
  command_minecart: 'Befehls-Minecart',
  click_command: 'Klickbefehl (Schild, Buch, Text)',
  command_item: 'Befehlsblock oder Befehls-Minecart als Gegenstand',
  spawner: 'Spawner mit eigener Kreatur',
  structure_block: 'Struktur- oder Verbundblock',
});

export const COMMAND_BLOCK_IDS: ReadonlySet<string> = new Set(['minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block']);
export const COMMAND_MINECART_ID = 'minecraft:command_block_minecart';
const SPAWNER_IDS: ReadonlySet<string> = new Set(['minecraft:spawner', 'minecraft:mob_spawner', 'minecraft:trial_spawner']);
const STRUCTURE_IDS: ReadonlySet<string> = new Set(['minecraft:structure_block', 'minecraft:jigsaw']);
/** Gegenstände, die beim Einsetzen Befehle mitbringen. */
const COMMAND_ITEM_IDS: ReadonlySet<string> = new Set([...COMMAND_BLOCK_IDS, COMMAND_MINECART_ID]);
const KINDS: readonly ExportSafetyKind[] = ['command_block', 'command_minecart', 'click_command', 'command_item', 'spawner', 'structure_block'];
const DETAIL_MAX = 120;

const ns = (id: string): string => { const l = id.toLowerCase(); return l.includes(':') ? l : `minecraft:${l}`; };
const compound = (t: NbtTag | undefined): Readonly<Record<string, NbtTag>> | undefined => t?.type === 'compound' ? t.value : undefined;
const text = (t: NbtTag | undefined): string | undefined => t?.type === 'string' ? t.value : undefined;
const short = (s: string): string => s.length > DETAIL_MAX ? `${s.slice(0, DETAIL_MAX - 1)}…` : s;

function blockEntityId(e: BlockEntity): string {
  const d = compound(e.data);
  const id = text(d?.Id) ?? text(d?.id);
  return id ? ns(id) : '';
}
function freeEntityId(e: FreeEntity): string {
  const d = compound(e.data);
  const id = text(d?.id) ?? text(d?.Id);
  return id ? ns(id) : '';
}
/** NBT of a block entity: Sponge v3 keeps fields under Data, raw tile NBT keeps them at the top level. */
function blockEntityFields(e: BlockEntity): Readonly<Record<string, NbtTag>> {
  const d = compound(e.data) ?? {};
  return compound(d.Data) ?? d;
}
function hasSpawnData(fields: Readonly<Record<string, NbtTag>>): boolean {
  if (compound(fields.SpawnData) && Object.keys(compound(fields.SpawnData)!).length) return true;
  if (fields.SpawnPotentials?.type === 'list' && fields.SpawnPotentials.value.length) return true;
  // trial_spawner (1.21): spawn_data / normal_config / ominous_config.
  return !!(compound(fields.spawn_data) || compound(fields.normal_config) || compound(fields.ominous_config) || text(fields.normal_config) || text(fields.ominous_config));
}

const isRunCommand = (c: Readonly<Record<string, NbtTag>>): boolean => text(c.action)?.toLowerCase() === 'run_command';
const commandOf = (c: Readonly<Record<string, NbtTag>>): string => text(c.command) ?? text(c.value) ?? '';

/** JSON text components (Schilder vor 1.21.5, Bücher, Namen): entfernt clickEvent/click_event mit run_command. */
function cleanJsonText(value: string, found: (detail: string) => void): string | null {
  if (!/run_command/i.test(value)) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { found(short(value)); return '""'; }
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== 'object') return v;
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if ((k === 'clickEvent' || k === 'click_event') && x && typeof x === 'object' && String((x as Record<string, unknown>).action).toLowerCase() === 'run_command') {
        const c = x as Record<string, unknown>;
        found(short(String(c.value ?? c.command ?? '')));
        continue;
      }
      out[k] = walk(x);
    }
    return out;
  };
  return JSON.stringify(walk(parsed));
}

/**
 * Walks NBT, reports click commands and command items, and returns the cleaned copy
 * (`undefined` = the tag itself has to go). Unchanged subtrees keep their identity.
 */
function cleanNbt(tag: NbtTag, report: (kind: ExportSafetyKind, id: string, detail?: string) => void, ownerId: string): NbtTag | undefined {
  if (tag.type === 'string') {
    const cleaned = cleanJsonText(tag.value, d => report('click_command', ownerId, d));
    return cleaned === null ? tag : { type: 'string', value: cleaned };
  }
  if (tag.type === 'list') {
    let changed = false;
    const value: NbtTag[] = [];
    for (const el of tag.value) {
      const c = cleanNbt(el, report, ownerId);
      if (c !== el) changed = true;
      if (c) value.push(c);
    }
    return changed ? { type: 'list', elementType: value.length ? tag.elementType : 'end', value } : tag;
  }
  if (tag.type !== 'compound') return tag;
  const v = tag.value;
  if (isRunCommand(v)) { report('click_command', ownerId, short(commandOf(v))); return undefined; }
  const id = text(v.id) ?? text(v.Id);
  // A command block or command minecart carried as an item or nested entity (passenger, spawn egg data).
  if (id && COMMAND_ITEM_IDS.has(ns(id))) { report('command_item', ownerId, ns(id)); return undefined; }
  let changed = false;
  const out: Record<string, NbtTag> = {};
  for (const [k, x] of Object.entries(v)) {
    const c = cleanNbt(x, report, ownerId);
    if (c !== x) changed = true;
    if (c) out[k] = c;
  }
  return changed ? { type: 'compound', value: out } : tag;
}

function emptyCounts(): Record<ExportSafetyKind, number> {
  return Object.fromEntries(KINDS.map(k => [k, 0])) as Record<ExportSafetyKind, number>;
}

interface Pass { readonly report: ExportSafetyReport; readonly world: VoxelPayload }

function run(world: VoxelPayload): Pass {
  const findings: ExportSafetyFinding[] = [];
  const counts = emptyCounts();
  const add = (kind: ExportSafetyKind, position: Vec3, id: string, detail?: string): void => {
    counts[kind]++;
    findings.push({ kind, position: [position[0], position[1], position[2]], id, ...(detail && { detail }) });
  };
  const key = (p: Vec3): string => `${p[0]},${p[1]},${p[2]}`;
  const removeCells = new Set<string>();
  // Blocks: command blocks and structure/jigsaw blocks are operator-only; their cells leave the plan.
  // Palette first, so a plan of millions of cells without such blocks costs one pass over the palette.
  const paletteIds = world.palette.map(p => ns(p.id));
  const flagged = paletteIds.map(id => COMMAND_BLOCK_IDS.has(id) || STRUCTURE_IDS.has(id));
  const flaggedCells: Cell[] = [];
  if (flagged.some(Boolean)) for (const cell of world.cells) if (cell.kind === 'block' && flagged[cell.paletteIndex]) flaggedCells.push(cell);
  for (const cell of flaggedCells) {
    if (cell.kind !== 'block') continue;
    const id = paletteIds[cell.paletteIndex]!;
    removeCells.add(key(cell.position));
    if (STRUCTURE_IDS.has(id)) add('structure_block', cell.position, id);
  }
  const commandAt = new Map<string, string>();
  const blockEntities: BlockEntity[] = [];
  for (const e of world.blockEntities) {
    const id = blockEntityId(e), fields = blockEntityFields(e);
    if (COMMAND_BLOCK_IDS.has(id) || (removeCells.has(key(e.position)) && text(fields.Command) !== undefined)) {
      commandAt.set(key(e.position), text(fields.Command) ?? '');
      continue;
    }
    if (removeCells.has(key(e.position))) continue;
    if (SPAWNER_IDS.has(id) && hasSpawnData(fields)) { add('spawner', e.position, id); continue; }
    const cleaned = cleanNbt(e.data, (kind, owner, detail) => add(kind, e.position, owner, detail), id || 'BlockEntity');
    if (cleaned) blockEntities.push(cleaned === e.data ? e : { position: e.position, data: cleaned });
  }
  for (const cell of flaggedCells) {
    if (cell.kind !== 'block') continue;
    const id = paletteIds[cell.paletteIndex]!;
    if (!COMMAND_BLOCK_IDS.has(id)) continue;
    const cmd = commandAt.get(key(cell.position));
    commandAt.delete(key(cell.position));
    add('command_block', cell.position, id, cmd ? short(cmd) : undefined);
  }
  // Command block data without its block (e.g. a damaged import) goes as well and is reported.
  for (const [k, cmd] of commandAt) add('command_block', k.split(',').map(Number) as unknown as Vec3, 'minecraft:command_block', cmd ? short(cmd) : undefined);
  const entities: FreeEntity[] = [];
  for (const e of world.entities ?? []) {
    const id = freeEntityId(e);
    const pos: Vec3 = [Math.floor(e.position[0]), Math.floor(e.position[1]), Math.floor(e.position[2])];
    if (id === COMMAND_MINECART_ID) { add('command_minecart', pos, id, short(text(compound(e.data)?.Command) ?? '') || undefined); continue; }
    const cleaned = cleanNbt(e.data, (kind, owner, detail) => add(kind, pos, owner, detail), id || 'Entity');
    if (cleaned) entities.push(cleaned === e.data ? e : { position: e.position, data: cleaned });
  }
  const total = findings.length;
  const report: ExportSafetyReport = { findings, counts, total };
  if (!total) return { report, world };
  const cells: readonly Cell[] = removeCells.size ? world.cells.filter(c => !(c.kind === 'block' && flagged[c.paletteIndex])) : world.cells;
  return {
    report,
    world: { ...world, cells, blockEntities, ...(world.entities !== undefined && { entities }) },
  };
}

/** Lists every command or operator-only part of a plan; changes nothing. */
export function scanExportSafety(world: VoxelPayload): ExportSafetyReport { return run(world).report; }

/**
 * Safe mode: the same plan without command blocks, command minecarts, click commands, command items,
 * spawner contents and structure/jigsaw blocks. Removed block cells become unselected, so the
 * export writes them per its `unselected` policy. Returns the input unchanged when nothing was found.
 */
export function sanitizeForExport(world: VoxelPayload): { readonly world: VoxelPayload; readonly report: ExportSafetyReport } { return run(world); }

/** One German line per finding kind, for export reports. */
export function exportSafetyLines(report: ExportSafetyReport, removed: boolean): string[] {
  if (!report.total) return [];
  const parts = KINDS.filter(k => report.counts[k]).map(k => `${report.counts[k]}× ${EXPORT_SAFETY_LABEL[k]}`);
  return [removed
    ? `Sicherer Modus: entfernt ${parts.join(', ')}. Der Rest des Plans ist unverändert.`
    : `Achtung, der Plan enthält ${parts.join(', ')}. Der Planer führt nichts davon aus; beim Einfügen gelten die Regeln von Server und Einfügewerkzeug. „Sicherer Modus“ entfernt diese Stellen.`];
}
