// COMPAT-01: Was kommt von einem Plan im eigenen Spiel an? Prüft die Blockzustände eines Plans gegen eine
// Ziel-Minecraft-Version (Daten aus den offiziellen Blockberichten, versionCompatData.ts), den Loader und das
// Einfügewerkzeug. Nichts wird umgewandelt: der Bericht sagt vorher, was fehlt, sich ändert oder Mods braucht.
import type { BlockState } from './types.js';
import { BLOCK_FACTS_DATA_VERSION, BLOCK_FACTS_VERSION } from './blockFacts.js';
import { COMPAT_BASE_VERSION, COMPAT_VERSIONS } from './versionCompatData.js';

export type GameLoader = 'fabric' | 'neoforge' | 'forge' | 'paper' | 'vanilla';
export type PasteTool = 'litematica' | 'worldedit';
/** The player's game: Minecraft version, mod loader (or server software) and the tool that pastes the file. */
export interface GameSetup { readonly version: string; readonly loader: GameLoader; readonly tool: PasteTool }

export const GAME_LOADER_LABEL: Readonly<Record<GameLoader, string>> = { fabric: 'Fabric', neoforge: 'NeoForge', forge: 'Forge', paper: 'Paper-Server', vanilla: 'Vanilla (ohne Mods)' };
export const PASTE_TOOL_LABEL: Readonly<Record<PasteTool, string>> = { litematica: 'Litematica', worldedit: 'WorldEdit / FAWE' };
/** File format each tool reads. */
export const TOOL_FORMAT: Readonly<Record<PasteTool, 'litematic' | 'schem'>> = { litematica: 'litematic', worldedit: 'schem' };
/** Default: the version profile with Fabric and WorldEdit (Sponge Schematic, the planner's main format). */
export const DEFAULT_GAME_SETUP: GameSetup = Object.freeze({ version: BLOCK_FACTS_VERSION, loader: 'fabric', tool: 'worldedit' });

export interface GameVersion { readonly version: string; readonly dataVersion: number }
/** Every checked Java version, newest first: the version profile and all versions with a block report. */
export const GAME_VERSIONS: readonly GameVersion[] = Object.freeze([
  { version: COMPAT_BASE_VERSION, dataVersion: BLOCK_FACTS_DATA_VERSION },
  ...COMPAT_VERSIONS.map(v => ({ version: v.version, dataVersion: v.dataVersion })),
]);

export const dataVersionOf = (version: string): number | null => GAME_VERSIONS.find(v => v.version === version)?.dataVersion ?? null;

interface TargetTable { readonly missing: ReadonlySet<string>; readonly changed: ReadonlyMap<string, { readonly properties: Readonly<Record<string, readonly string[]>>; readonly defaults: Readonly<Record<string, string>> }> }
const tables = new Map<string, TargetTable>();
function targetTable(version: string): TargetTable | null {
  if (version === COMPAT_BASE_VERSION) return { missing: new Set(), changed: new Map() };
  const hit = tables.get(version);
  if (hit) return hit;
  const data = COMPAT_VERSIONS.find(v => v.version === version);
  if (!data) return null;
  const changed = new Map<string, { properties: Record<string, readonly string[]>; defaults: Record<string, string> }>();
  for (const line of data.changed ? data.changed.split('\n') : []) {
    const [id = '', props = '', defs = ''] = line.split('|');
    const properties: Record<string, readonly string[]> = {}, defaults: Record<string, string> = {};
    for (const p of props ? props.split(';') : []) { const [k = '', v = ''] = p.split('='); properties[k] = v.split(','); }
    for (const d of defs ? defs.split(',') : []) { const [k = '', v = ''] = d.split('='); defaults[k] = v; }
    changed.set(id, { properties, defaults });
  }
  const table = { missing: new Set(data.missing ? data.missing.split('\n') : []), changed };
  tables.set(version, table);
  return table;
}

export type CompatSeverity = 'loss' | 'warn' | 'info';
export type CompatKind = 'version-unknown' | 'mod-build' | 'missing-block' | 'changed-state' | 'mod-block' | 'tool' | 'format' | 'entities' | 'newer-profile';
export interface CompatIssue {
  readonly kind: CompatKind;
  readonly severity: CompatSeverity;
  readonly message: string;
  /** Affected bare block ids (or mod namespaces), sorted by cell count. */
  readonly ids?: readonly string[];
  /** Affected cells (when counts were given). */
  readonly cells?: number;
}
export interface CompatReport {
  readonly setup: GameSetup;
  readonly dataVersion: number | null;
  readonly format: 'litematic' | 'schem';
  /** ok: nothing lost; warn: works with adjustments or needs a check; loss: blocks or features are lost. */
  readonly level: 'ok' | 'warn' | 'loss';
  /** One line for a status bar. */
  readonly headline: string;
  readonly issues: readonly CompatIssue[];
  readonly missingCells: number;
  readonly changedCells: number;
  readonly mods: readonly string[];
}

export interface CompatInput {
  readonly palette: readonly BlockState[];
  /** Cells per palette index; without it the report counts states, not cells. */
  readonly counts?: readonly number[];
  readonly blockEntities?: number;
  readonly entities?: number;
}

const bare = (id: string) => id.replace(/^minecraft:/, '');
const isVanilla = (id: string) => !id.includes(':') || id.startsWith('minecraft:');
const nOf = (n: number, one: string, many: string) => `${n.toLocaleString('de-DE')} ${n === 1 ? one : many}`;
const list = (ids: readonly string[], max = 6) => ids.slice(0, max).join(', ') + (ids.length > max ? ` und ${ids.length - max} weitere` : '');

/** Cells per palette index of a payload's cells (block and explicit air). */
export function paletteCounts(cells: Iterable<{ readonly kind: string; readonly paletteIndex?: number }>, size: number): number[] {
  const counts = new Array<number>(size).fill(0);
  for (const c of cells) if (c.kind !== 'erase' && c.paletteIndex !== undefined && c.paletteIndex < size) counts[c.paletteIndex]!++;
  return counts;
}

/**
 * The compatibility report for one setup. Missing blocks and invalid states are counted per cell when
 * `counts` is given. The verdict is about the file as written by the planner (no conversion).
 */
export function checkCompatibility(input: CompatInput, setup: GameSetup): CompatReport {
  const issues: CompatIssue[] = [];
  const format = TOOL_FORMAT[setup.tool];
  const dataVersion = dataVersionOf(setup.version);
  const table = targetTable(setup.version);
  const count = (i: number) => input.counts ? (input.counts[i] ?? 0) : 1;
  const used = (i: number) => !input.counts || (input.counts[i] ?? 0) > 0;
  let missingCells = 0, changedCells = 0;
  const missing = new Map<string, number>(), changed = new Map<string, number>(), mods = new Map<string, number>();
  input.palette.forEach((state, i) => {
    if (!used(i)) return;
    if (!isVanilla(state.id)) { const ns = state.id.split(':')[0]!; mods.set(ns, (mods.get(ns) ?? 0) + count(i)); return; }
    if (!table) return;
    const id = bare(state.id);
    if (table.missing.has(id)) { missing.set(id, (missing.get(id) ?? 0) + count(i)); missingCells += count(i); return; }
    const target = table.changed.get(id);
    if (target && Object.entries(state.properties).some(([k, v]) => !target.properties[k]?.includes(v))) {
      changed.set(id, (changed.get(id) ?? 0) + count(i)); changedCells += count(i);
    }
  });
  const byCount = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
  const unit = input.counts ? (n: number) => nOf(n, 'Block', 'Blöcke') : (n: number) => nOf(n, 'Zustand', 'Zustände');

  if (!table) issues.push({ kind: 'version-unknown', severity: 'warn', message: `Für Minecraft ${setup.version} liegt kein Blockbericht vor; Blöcke werden nicht geprüft.` });
  if (missing.size) {
    const ids = byCount(missing);
    issues.push({ kind: 'missing-block', severity: 'loss', ids, cells: missingCells,
      message: `${nOf(ids.length, 'Blockart gibt', 'Blockarten gibt')} es in ${setup.version} noch nicht (${unit(missingCells)}): ${list(ids)}. Beim Einfügen bleiben diese Stellen leer.` });
  }
  if (changed.size) {
    const ids = byCount(changed);
    issues.push({ kind: 'changed-state', severity: 'warn', ids, cells: changedCells,
      message: `${nOf(ids.length, 'Blockart hat', 'Blockarten haben')} in ${setup.version} andere Eigenschaften (${unit(changedCells)}): ${list(ids)}. Das Spiel setzt dort die Grundeinstellung.` });
  }
  if (mods.size) {
    const ids = byCount(mods);
    const loss = setup.loader === 'vanilla' || setup.loader === 'paper';
    issues.push({ kind: 'mod-block', severity: loss ? 'loss' : 'warn', ids, cells: [...mods.values()].reduce((a, b) => a + b, 0),
      message: loss ? `Blöcke aus Mods (${list(ids)}) gibt es ${setup.loader === 'paper' ? 'auf einem Paper-Server' : 'ohne Mods'} nicht; sie fehlen im Spiel.`
        : `Braucht die Mods ${list(ids)} für ${GAME_LOADER_LABEL[setup.loader]} ${setup.version}; ohne sie bleiben diese Stellen leer.` });
  }
  if (table && dataVersion !== null && dataVersion < BLOCK_FACTS_DATA_VERSION && !missing.size && !changed.size)
    issues.push({ kind: 'newer-profile', severity: 'info', message: `Alle Blöcke gibt es auch in ${setup.version}. Die Datei nennt DataVersion ${dataVersion}.` });

  // Tool and loader.
  if (setup.tool === 'litematica') {
    if (setup.loader === 'vanilla') issues.push({ kind: 'tool', severity: 'loss', message: 'Litematica ist eine Mod: ohne Mod-Loader lässt sich die Datei nicht einfügen. Für Vanilla-Server WorldEdit auf dem Server oder einen Mod-Client verwenden.' });
    else if (setup.loader === 'neoforge' || setup.loader === 'forge') issues.push({ kind: 'tool', severity: 'warn', message: `Litematica gibt es offiziell nur für Fabric; für ${GAME_LOADER_LABEL[setup.loader]} nur inoffizielle Portierungen. Vorher prüfen, ob es eine für ${setup.version} gibt, sonst WorldEdit wählen.` });
    else if (setup.loader === 'paper') issues.push({ kind: 'tool', severity: 'info', message: 'Litematica läuft im eigenen Fabric-Client; auf dem Paper-Server braucht das Einfügen Rechte (Kreativ/OP) oder du baust per Easy Place nach.' });
  } else {
    if (setup.loader === 'vanilla') issues.push({ kind: 'tool', severity: 'loss', message: 'WorldEdit ist eine Mod bzw. ein Server-Plugin: ohne Loader oder Plugin lässt sich die .schem-Datei nicht einfügen.' });
    issues.push({ kind: 'format', severity: 'info', message: 'Sponge Schematic v3: WorldEdit liest das Format ab Version 7.3, aktuelle FAWE-Versionen ebenso. Einfügen mit //schem load und //paste.' });
  }
  if ((input.entities ?? 0) > 0) issues.push({ kind: 'entities', severity: 'info',
    message: setup.tool === 'worldedit' ? `${nOf(input.entities!, 'Entity wird', 'Entities werden')} nur mit //paste -e eingefügt.` : `${nOf(input.entities!, 'Entity ist', 'Entities sind')} in der Datei; Litematica setzt sie beim Einfügen mit.` });

  const level: CompatReport['level'] = issues.some(i => i.severity === 'loss') ? 'loss' : issues.some(i => i.severity === 'warn') ? 'warn' : 'ok';
  const where = `Minecraft ${setup.version} · ${GAME_LOADER_LABEL[setup.loader]} · ${PASTE_TOOL_LABEL[setup.tool]}`;
  const parts = [
    missing.size ? `${unit(missingCells)} fehlen` : '',
    changed.size ? `${unit(changedCells)} werden angepasst` : '',
    mods.size ? `${nOf(mods.size, 'Mod', 'Mods')} nötig` : '',
    issues.some(i => i.kind === 'tool' && i.severity !== 'info') ? 'Werkzeug prüfen' : '',
  ].filter(Boolean);
  const headline = level === 'ok' ? `${where}: passt, nichts geht verloren.` : `${where}: ${parts.join(', ') || 'bitte Hinweise prüfen'}.`;
  return { setup, dataVersion, format, level, headline, issues, missingCells, changedCells, mods: byCount(mods) };
}

/** Parses a stored setup; anything unknown falls back to the default. */
export function parseGameSetup(raw: unknown): GameSetup {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof GameSetup, unknown>>;
  const version = typeof r.version === 'string' && GAME_VERSIONS.some(v => v.version === r.version) ? r.version : DEFAULT_GAME_SETUP.version;
  const loader = typeof r.loader === 'string' && r.loader in GAME_LOADER_LABEL ? r.loader as GameLoader : DEFAULT_GAME_SETUP.loader;
  const tool = typeof r.tool === 'string' && r.tool in PASTE_TOOL_LABEL ? r.tool as PasteTool : DEFAULT_GAME_SETUP.tool;
  return { version, loader, tool };
}
