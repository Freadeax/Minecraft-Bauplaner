import type { ItemLine, MaterialReport } from './materials.js';
import { materialOf } from './variants.js';

/** Display groups reuse the explicit variant catalogue; they never define recipes or swaps. */
export const LAB_FAMILY_LABEL = { holz: 'Holz', stein: 'Stein', farbe: 'Farbmaterial', sonstige: 'Weitere Materialien' } as const;
export type LabFamily = keyof typeof LAB_FAMILY_LABEL;
export interface LabEntry {
  readonly line: ItemLine;
  readonly family: LabFamily;
  readonly setLabel: string | null;
}
export interface LabOptions {
  readonly query?: string;
  readonly family?: LabFamily | 'all';
  readonly confidence?: 'all' | 'catalog' | 'assumed';
  readonly sort?: 'count' | 'name';
}

export function labEntry(line: ItemLine): LabEntry {
  // materialOf accepts bare ids; an unrelated namespace must never inherit a Vanilla family.
  const member = line.itemId.startsWith('minecraft:') ? materialOf(line.itemId) : undefined;
  return { line, family: member?.set.kind ?? 'sonstige', setLabel: member?.set.label ?? null };
}

/** A view of a computed report: no cell counting, item mapping, stock consumption or mutation. */
export function materialLab(report: Pick<MaterialReport, 'items'>, options: LabOptions = {}) {
  const all = report.items.map(labEntry);
  const families = (Object.keys(LAB_FAMILY_LABEL) as LabFamily[]).map(id => {
    const entries = all.filter(e => e.family === id);
    return { id, label: LAB_FAMILY_LABEL[id], types: entries.length, count: entries.reduce((n, e) => n + e.line.count, 0) };
  });
  const words = (options.query ?? '').trim().toLocaleLowerCase('de-DE').split(/\s+/).filter(Boolean);
  const entries = all.filter(e => {
    if (options.family && options.family !== 'all' && e.family !== options.family) return false;
    if (options.confidence && options.confidence !== 'all' && e.line.confidence !== options.confidence) return false;
    const text = [e.line.itemId, e.setLabel ?? '', LAB_FAMILY_LABEL[e.family], ...e.line.sources.map(s => s.state.id)].join(' ').toLocaleLowerCase('de-DE');
    return words.every(word => text.includes(word));
  }).sort((a, b) => (options.sort === 'name' ? 0 : b.line.count - a.line.count) || (a.line.itemId < b.line.itemId ? -1 : a.line.itemId > b.line.itemId ? 1 : 0));
  return { families, entries, count: entries.reduce((n, e) => n + e.line.count, 0), slots: entries.reduce((n, e) => n + e.line.slots, 0) };
}
