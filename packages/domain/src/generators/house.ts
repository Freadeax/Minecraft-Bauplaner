import { bed, chest, door, furnace, ladder, lantern, Plot, slab, stairs } from '../build/plot.js';
import { buildRoof, PITCH_OPTIONS, ROOF_OPTIONS } from './roofs.js';
import type { Pitch, RoofForm } from './roofs.js';
import { chimney, ridgeFor, roofTopAt } from './roof.js';
import { Mason, styleParam, WEATHER_PARAMS } from './types.js';
import type { Generator } from './types.js';

/**
 * Haus: rectangular house with storeys, ladder, windows in a regular rhythm,
 * visible posts and floor beams, roof from the shared roof shapes, optional
 * furniture, porch and chimney. The front with the door faces north (z = 0).
 */
export const HOUSE_GENERATOR: Generator = {
  id: 'haus', name: 'Haus', version: 1,
  description: 'Wohnhaus mit wählbarer Grundfläche, Geschossen, Stil, Dachform, Fensterrhythmus, Einrichtung, Vordach und Schornstein.',
  params: [
    { key: 'breite', label: 'Breite (x)', group: 'Maße', type: 'int', min: 5, max: 25, default: 9, unit: 'Blöcke' },
    { key: 'tiefe', label: 'Tiefe (z)', group: 'Maße', type: 'int', min: 5, max: 25, default: 7, unit: 'Blöcke' },
    { key: 'geschosse', label: 'Geschosse', group: 'Maße', type: 'int', min: 1, max: 4, default: 2 },
    { key: 'geschoss', label: 'Geschosshöhe', group: 'Maße', type: 'int', min: 3, max: 6, default: 4, unit: 'Blöcke', hint: 'Lichte Höhe eines Geschosses.' },
    styleParam('fachwerk'), ...WEATHER_PARAMS,
    { key: 'dach', label: 'Dachform', group: 'Dach', type: 'choice', default: 'stil', options: [{ value: 'stil', label: 'Passend zum Stil' }, ...ROOF_OPTIONS] },
    { key: 'neigung', label: 'Neigung', group: 'Dach', type: 'choice', default: 'steil', options: PITCH_OPTIONS },
    { key: 'first', label: 'Firstrichtung', group: 'Dach', type: 'choice', default: 'auto',
      options: [{ value: 'auto', label: 'Entlang der längeren Seite' }, { value: 'x', label: 'Entlang x (Traufe vorn)' }, { value: 'z', label: 'Entlang z (Giebel vorn)' }] },
    { key: 'ueberstand', label: 'Dachüberstand', group: 'Dach', type: 'int', min: 0, max: 2, default: 1, unit: 'Blöcke' },
    { key: 'fensterabstand', label: 'Fensterabstand', group: 'Details', type: 'int', min: 2, max: 6, default: 3, unit: 'Blöcke' },
    { key: 'pfosten', label: 'Sichtbare Pfosten und Balken', group: 'Details', type: 'bool', default: true },
    { key: 'einrichtung', label: 'Einrichtung (Bett, Truhe, Werkbank, Ofen, Licht)', group: 'Details', type: 'bool', default: true },
    { key: 'vordach', label: 'Vordach über der Tür', group: 'Details', type: 'bool', default: false },
    { key: 'schornstein', label: 'Schornstein', group: 'Details', type: 'bool', default: true },
  ],
  presets: [
    { id: 'starter', label: 'Starterhaus', values: { breite: 7, tiefe: 6, geschosse: 1, stil: 'fachwerk', dach: 'sattel', vordach: true } },
    { id: 'stadthaus', label: 'Fachwerk-Stadthaus', values: { breite: 7, tiefe: 9, geschosse: 3, stil: 'fachwerk', dach: 'sattel', first: 'z', fensterabstand: 2 } },
    { id: 'blockhaus', label: 'Nordisches Langhaus', values: { breite: 15, tiefe: 7, geschosse: 1, geschoss: 4, stil: 'nordisch', dach: 'sattel', ueberstand: 1, vordach: true } },
    { id: 'wuestenhaus', label: 'Wüstenhaus mit Dachterrasse', values: { breite: 9, tiefe: 9, geschosse: 2, stil: 'wueste', dach: 'flach', schornstein: false } },
    { id: 'villa', label: 'Moderne Villa', values: { breite: 15, tiefe: 11, geschosse: 2, geschoss: 4, stil: 'modern', dach: 'flach', fensterabstand: 2, pfosten: false, schornstein: false } },
    { id: 'teehaus', label: 'Teehaus', values: { breite: 9, tiefe: 9, geschosse: 1, stil: 'fernost', dach: 'walm', neigung: 'flach', ueberstand: 2, vordach: true, schornstein: false } },
    { id: 'netherhaus', label: 'Unterschlupf im Nether', values: { breite: 7, tiefe: 7, geschosse: 1, stil: 'nether', dach: 'walm', schornstein: false } },
  ],
  build(a) {
    const B = a.int('breite'), T = a.int('tiefe'), F = a.int('geschosse'), fh = a.int('geschoss'), ov = a.int('ueberstand'), porch = a.bool('vordach');
    const x0 = ov, z0 = porch ? Math.max(2, ov) : ov, x1 = x0 + B - 1, z1 = z0 + T - 1;
    const p = new Plot([B + 2 * ov, 2, z1 + ov + 1]), m = new Mason(p, a), s = m.style, notes: string[] = [];
    const form: RoofForm = a.str('dach') === 'stil' ? (s.flat ? 'flach' : 'sattel') : a.str('dach') as RoofForm;
    const cx = x0 + Math.floor(B / 2), cz = z0 + Math.floor(T / 2), yTop = F * (fh + 1);
    const posts = a.bool('pfosten'), furnished = a.bool('einrichtung');
    const chimneyAt = a.bool('schornstein') ? [x0 + 1, z1] as const : null;
    const isPost = (x: number, z: number) => (x === x0 || x === x1) && (z === z0 || z === z1) || (posts && (((z === z0 || z === z1) && (x - x0) % 4 === 0) || ((x === x0 || x === x1) && (z - z0) % 4 === 0)));
    const onRing = (x: number, z: number) => x === x0 || x === x1 || z === z0 || z === z1;
    // Plinth, storeys, beams, interior air.
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) m.base(x, 0, z);
    for (let k = 0; k <= F; k++) {
      const yf = k * (fh + 1);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
        if (k > 0) {
          if (!onRing(x, z)) p.set(x, yf, z, s.floor);
          else if (isPost(x, z)) m.corner(x, yf, z);
          else if (posts) m.beam(x, yf, z, z === z0 || z === z1 ? 'x' : 'z');
          else m.wall(x, yf, z);
        }
        if (k === F) continue;
        for (let y = yf + 1; y <= yf + fh; y++) {
          if (!onRing(x, z)) p.air(x, y, z);
          else if (isPost(x, z)) m.corner(x, y, z);
          else m.wall(x, y, z);
        }
      }
    }
    // Windows: regular rhythm, not next to corners, posts, the door or the chimney.
    const spacing = a.int('fensterabstand');
    for (let k = 0; k < F; k++) {
      const yf = k * (fh + 1);
      const rows = fh >= 4 ? [yf + 2, yf + 3] : [yf + 2];
      const place = (x: number, z: number) => {
        if (isPost(x, z) || (chimneyAt && x === chimneyAt[0] && z === chimneyAt[1])) return;
        if (k === 0 && z === z0 && Math.abs(x - cx) <= (porch ? 2 : 1)) return;
        for (const y of rows) p.set(x, y, z, s.window);
      };
      for (let x = x0 + 2; x <= x1 - 2; x += spacing) { place(x, z0); place(x, z1); }
      for (let z = z0 + 2; z <= z1 - 2; z += spacing) { place(x0, z); place(x1, z); }
    }
    // Ladder through the storeys in the back right corner.
    if (F > 1) for (let y = 1; y <= (F - 1) * (fh + 1); y++) p.set(x1 - 1, y, z1 - 1, 'ladder', ladder('west'));
    // Door in the front (north) face; a step in front when there is room.
    door(p, cx, 1, z0, s.wood, 'south');
    if (!porch && z0 > 0) p.set(cx, 0, z0 - 1, s.base.stairs, stairs('south'));
    if (furnished) for (let k = 0; k < F; k++) {
      const y = k * (fh + 1) + 1;
      bed(p, x0 + 1, y, z1 - 2, s.bed, 'south');
      p.set(x0 + 2, y, z1 - 1, 'chest', chest('north'));
      if (k === 0) { p.set(x0 + 1, y, z0 + 1, 'crafting_table'); p.set(x1 - 1, y, z0 + 1, 'furnace', furnace('west')); }
      if (fh >= 3 && !(cx === x1 - 1 && cz === z1 - 1)) p.set(cx, y + fh - 1, cz, s.light, lantern(true));
    }
    // Roof over the top ceiling.
    const pitch = a.str('neigung') as Pitch, ridge = ridgeFor(a.str('first'), B, T);
    buildRoof(p, { x0: x0 - ov, x1: x1 + ov, z0: z0 - ov, z1: z1 + ov, y: yTop + 1, form, pitch, ridge, style: s,
      gable: { x0, x1, z0, z1, block: s.wall }, parapet: true });
    if (form === 'flach') notes.push('Flachdach mit Brüstung: als Dachterrasse nutzbar (Zugang selbst ergänzen).');
    if (porch) {
      for (const x of [cx - 2, cx + 2]) for (let y = 1; y <= fh; y++) p.set(x, y, z0 - 2, `${s.wood}_fence`);
      for (let x = cx - 2; x <= cx + 2; x++) for (let z = z0 - 2; z < z0; z++) {
        p.set(x, 0, z, s.floor);
        if (!p.has(x, fh + 1, z)) p.set(x, fh + 1, z, s.roof.slab, slab());
      }
      p.set(cx, fh, z0 - 1, s.light, lantern(true));
    }
    if (chimneyAt) chimney(m, chimneyAt[0], chimneyAt[1], 1, roofTopAt(p, chimneyAt[0], chimneyAt[1], yTop) + 1);
    if (furnished && B < 6) notes.push('Bei Breite 5 stehen Truhe und Bett eng beieinander.');
    const roofLabel = ROOF_OPTIONS.find(o => o.value === form)!.label.replace(/ \(.*\)$/, '');
    return {
      payload: p.payload(), connectors: [],
      name: `Haus ${B} × ${T}, ${F} Geschoss${F === 1 ? '' : 'e'} (${s.short})`,
      description: `Generiertes Wohnhaus ${B} × ${T}, ${F} Geschoss${F === 1 ? '' : 'e'} à ${fh} Blöcke, ${roofLabel}${furnished ? ', eingerichtet' : ''}.`,
      facets: { kategorie: ['wohnhaus'], stil: [...s.stil], biom: [...s.biom], funktion: ['wohnen', ...(furnished ? ['lagern'] : [])] },
      notes,
    };
  },
};
