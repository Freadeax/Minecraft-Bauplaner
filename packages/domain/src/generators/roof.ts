import { campfire, Plot } from '../build/plot.js';
import { buildRoof, PITCH_OPTIONS, ROOF_OPTIONS } from './roofs.js';
import type { Pitch, RoofForm } from './roofs.js';
import { Mason, styleParam, WEATHER_PARAMS } from './types.js';
import type { Generator } from './types.js';
import type { Style } from './styles.js';

/** Chimney column with a lit campfire on top (smoke signal of a home). */
export function chimney(m: Mason, x: number, z: number, y0: number, top: number): void {
  for (let y = y0; y <= top; y++) m.put(x, y, z, m.style.base.full);
  m.p.set(x, top + 1, z, 'campfire', campfire('north', true));
}

/** Highest roof layer above (x, z) after building, for chimneys. */
export function roofTopAt(p: Plot, x: number, z: number, from: number): number {
  let y = from;
  while (p.has(x, y + 1, z) || p.has(x, y + 2, z)) y++;
  return y;
}

export const ridgeFor = (choice: string, width: number, depth: number): 'x' | 'z' => choice === 'x' || choice === 'z' ? choice : width <= depth ? 'z' : 'x';

/**
 * Dach as its own part: covers an outer wall footprint `breite × tiefe`, with
 * overhang beyond it. Place it on a building of that size at y = wall top and
 * x/z = −Überstand.
 */
export const ROOF_GENERATOR: Generator = {
  id: 'dach', name: 'Dach', version: 1,
  description: 'Sattel-, Walm-, Pult- oder Flachdach für ein beliebiges Rechteck, steil oder flach geneigt, mit Überstand, Giebelwänden und Schornstein.',
  params: [
    { key: 'breite', label: 'Breite (x)', group: 'Maße', type: 'int', min: 3, max: 31, default: 9, unit: 'Blöcke', hint: 'Außenmaß des Gebäudes, ohne Überstand.' },
    { key: 'tiefe', label: 'Tiefe (z)', group: 'Maße', type: 'int', min: 3, max: 31, default: 7, unit: 'Blöcke' },
    { key: 'form', label: 'Dachform', group: 'Dach', type: 'choice', default: 'sattel', options: ROOF_OPTIONS },
    { key: 'neigung', label: 'Neigung', group: 'Dach', type: 'choice', default: 'steil', options: PITCH_OPTIONS, when: { key: 'form', values: ['sattel', 'walm', 'pult'] } },
    { key: 'first', label: 'Firstrichtung', group: 'Dach', type: 'choice', default: 'auto', when: { key: 'form', values: ['sattel', 'pult'] },
      options: [{ value: 'auto', label: 'Entlang der längeren Seite' }, { value: 'x', label: 'Entlang x' }, { value: 'z', label: 'Entlang z' }] },
    { key: 'ueberstand', label: 'Überstand', group: 'Dach', type: 'int', min: 0, max: 2, default: 1, unit: 'Blöcke' },
    styleParam(), ...WEATHER_PARAMS,
    { key: 'giebel', label: 'Giebelwände schließen', group: 'Details', type: 'bool', default: true, when: { key: 'form', values: ['sattel', 'pult'] } },
    { key: 'bruestung', label: 'Brüstung', group: 'Details', type: 'bool', default: true, when: { key: 'form', values: ['flach'] } },
    { key: 'schornstein', label: 'Schornstein', group: 'Details', type: 'bool', default: false },
  ],
  presets: [
    { id: 'hausdach', label: 'Satteldach für 9 × 7', values: { breite: 9, tiefe: 7, form: 'sattel', ueberstand: 1, schornstein: true } },
    { id: 'zeltdach', label: 'Zeltdach (quadratisch)', values: { breite: 7, tiefe: 7, form: 'walm', neigung: 'steil', stil: 'nordisch' } },
    { id: 'scheune', label: 'Flaches Scheunendach', values: { breite: 13, tiefe: 9, form: 'sattel', neigung: 'flach', stil: 'fachwerk' } },
    { id: 'pagode', label: 'Pagodendach', values: { breite: 9, tiefe: 9, form: 'walm', neigung: 'flach', ueberstand: 2, stil: 'fernost' } },
    { id: 'anbau', label: 'Pultdach für einen Anbau', values: { breite: 5, tiefe: 7, form: 'pult', first: 'z', ueberstand: 0 } },
  ],
  build(a) {
    const B = a.int('breite'), T = a.int('tiefe'), ov = a.int('ueberstand'), form = a.str('form') as RoofForm;
    const W = B + 2 * ov, D = T + 2 * ov;
    const p = new Plot([W, 2, D]), m = new Mason(p, a), s: Style = m.style;
    const ridge = ridgeFor(a.str('first'), B, T), notes: string[] = [];
    const top = buildRoof(p, { x0: 0, x1: W - 1, z0: 0, z1: D - 1, y: 0, form, pitch: (form === 'flach' ? 'steil' : a.str('neigung')) as Pitch, ridge, style: s,
      gable: a.bool('giebel') ? { x0: ov, x1: ov + B - 1, z0: ov, z1: ov + T - 1, block: s.wall } : undefined, parapet: a.bool('bruestung') });
    if (a.bool('schornstein')) {
      const x = ov + 1, z = ov + T - 2;
      chimney(m, x, z, 0, roofTopAt(p, x, z, 0) + 1);
    }
    notes.push(`Auf ein Gebäude mit Außenmaß ${B} × ${T} setzen: Dachunterkante auf Höhe der Mauerkrone${ov ? `, um ${ov} nach x und z versetzt (Überstand)` : ''}.`);
    if (form === 'walm' && B === T) notes.push('Quadratisches Walmdach = Zeltdach.');
    if (form === 'pult' && Math.max(B, T) > 15 && a.str('neigung') === 'steil') notes.push('Steiles Pultdach über große Breite wird sehr hoch.');
    const formLabel = ROOF_OPTIONS.find(o => o.value === form)!.label.replace(/ \(.*\)$/, '');
    return {
      payload: p.payload(), connectors: [],
      name: `${formLabel} ${B} × ${T} (${s.short})`,
      description: `Generiertes ${formLabel} für ${B} × ${T}, Überstand ${ov}, Firsthöhe ${top + 1}.`,
      facets: { kategorie: ['wohnhaus'], stil: [...s.stil], biom: [...s.biom], funktion: ['wohnen'] },
      notes,
    };
  },
};
