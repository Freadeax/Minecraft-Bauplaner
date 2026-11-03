import type { Grossprojekt, GrossprojektPhase, GrossprojektUnit, Quartier } from '../grossprojekte.js';

/** Slot: catalogue building `bld_<id>` with role (name in the plan) and optional curated turn. */
export const s = (key: string, id: string, role?: string, turns?: 0 | 1 | 2 | 3): GrossprojektUnit => ({ kind: 'slot', key, assetId: `bld_${id}`, ...(role && { role }), ...(turns && { turns }) });
/** Shipped ensemble as one unit with its curated layout. */
export const e = (key: string, ensembleId: string): GrossprojektUnit => ({ kind: 'ensemble', key, ensembleId: `ens_${ensembleId}` });
/** Whole Bauwelt-Anlage as one unit (its own main path included). */
export const a = (key: string, anlageId: string): GrossprojektUnit => ({ kind: 'anlage', key, anlageId: `anl_${anlageId}` });

export const q = (id: string, name: string, cell: readonly [number, number], purpose: string, units: readonly GrossprojektUnit[],
  extra: Partial<Pick<Quartier, 'kind' | 'span' | 'gap' | 'rowWidth' | 'reserve'>> = {}): Quartier =>
  ({ id, name, purpose, kind: extra.kind ?? 'bauten', cell, units, ...extra });

export const ph = (id: string, name: string, note: string, quartiere: readonly string[]): GrossprojektPhase => ({ id, name, note, quartiere });

export type { Grossprojekt };
