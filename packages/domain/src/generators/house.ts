import { bed, chest, furnace, ladder, lantern, Plot, slab } from '../build/plot.js';
import { house as composeHouse, putFree } from '../build/style.js';
import type { RoofKind, StoreySpec } from '../build/style.js';
import { kitPitch, PITCH_OPTIONS, ROOF_OPTIONS } from './roofs.js';
import type { RoofForm } from './roofs.js';
import { ridgeFor } from './roof.js';
import { Mason, styleParam, WEATHER_PARAMS } from './types.js';
import type { Generator } from './types.js';

/**
 * Haus: house with storeys, ladder, windows in a regular rhythm, visible posts
 * and floor beams, optional furniture, porch and chimney. The front with the
 * door faces north (z = 0). Version 3 (LIB-05) builds the shell with the
 * design kit: masonry plinth, jetty, shutters, sills, lintels, flower boxes,
 * roofs with soffit and verge boards, an optional cross gable.
 */
export const HOUSE_GENERATOR: Generator = {
  id: 'haus', name: 'Haus', version: 3,
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
    { key: 'vorkragung', label: 'Obergeschosse kragen vor', group: 'Details', type: 'bool', default: true, hint: 'Jedes Obergeschoss steht vorn und hinten einen Block weiter vor, auf Knaggen aus umgedrehten Treppen.' },
    { key: 'sockel', label: 'Steinsockel', group: 'Details', type: 'int', min: 0, max: 4, default: 2, unit: 'Reihen', hint: 'Untere Wandreihen des Erdgeschosses aus Mauerwerk; Pfosten laufen hindurch.' },
    { key: 'laeden', label: 'Fensterläden und Blumenkästen', group: 'Details', type: 'bool', default: true },
    { key: 'quergiebel', label: 'Quergiebel', group: 'Dach', type: 'bool', default: false, hint: 'Ein Flügel nach hinten mit eigenem Giebel (L-Grundriss), Dächer treffen sich in einer Kehle.' },
    { key: 'schornstein', label: 'Schornstein', group: 'Details', type: 'bool', default: true },
  ],
  presets: [
    { id: 'starter', label: 'Starterhaus', values: { breite: 7, tiefe: 6, geschosse: 1, stil: 'fachwerk', dach: 'sattel', vordach: true } },
    { id: 'buergerhaus', label: 'Bürgerhaus mit Quergiebel', values: { breite: 11, tiefe: 7, geschosse: 2, stil: 'fachwerk', dach: 'sattel', neigung: 'sehrsteil', quergiebel: true, fensterabstand: 2 } },
    { id: 'stadthaus', label: 'Fachwerk-Stadthaus', values: { breite: 7, tiefe: 9, geschosse: 3, stil: 'fachwerk', dach: 'sattel', first: 'z', fensterabstand: 2 } },
    { id: 'blockhaus', label: 'Nordisches Langhaus', values: { breite: 15, tiefe: 7, geschosse: 1, geschoss: 4, stil: 'nordisch', dach: 'sattel', ueberstand: 1, vordach: true } },
    { id: 'wuestenhaus', label: 'Wüstenhaus mit Dachterrasse', values: { breite: 9, tiefe: 9, geschosse: 2, stil: 'wueste', dach: 'flach', schornstein: false } },
    { id: 'villa', label: 'Moderne Villa', values: { breite: 15, tiefe: 11, geschosse: 2, geschoss: 4, stil: 'modern', dach: 'flach', fensterabstand: 2, pfosten: false, schornstein: false } },
    { id: 'teehaus', label: 'Teehaus', values: { breite: 9, tiefe: 9, geschosse: 1, stil: 'fernost', dach: 'walm', neigung: 'flach', ueberstand: 2, vordach: true, schornstein: false } },
    { id: 'netherhaus', label: 'Unterschlupf im Nether', values: { breite: 7, tiefe: 7, geschosse: 1, stil: 'nether', dach: 'walm', schornstein: false } },
  ],
  build(a) {
    const B = a.int('breite'), T = a.int('tiefe'), F = a.int('geschosse'), fh = a.int('geschoss'), ov = a.int('ueberstand'), porch = a.bool('vordach');
    const jetty = a.bool('vorkragung') && F > 1 ? 1 : 0, cross = a.bool('quergiebel') && T >= 5 && B >= 7;
    const wingDepth = cross ? Math.max(3, Math.floor(T * 0.8)) : 0;
    const mz = ov + jetty, front = porch ? Math.max(2, mz) : mz;
    const x0 = ov, z0 = front, x1 = x0 + B - 1, z1 = z0 + T - 1;
    const p = new Plot([B + 2 * ov, 2, z1 + mz + wingDepth + 1]), m = new Mason(p, a), s = m.style, l = m.look, notes: string[] = [];
    const form: RoofForm = a.str('dach') === 'stil' ? (s.flat ? 'flach' : 'sattel') : a.str('dach') as RoofForm;
    const cx = x0 + Math.floor(B / 2), cz = z0 + Math.floor(T / 2);
    const posts = a.bool('pfosten'), furnished = a.bool('einrichtung'), plinth = a.int('sockel');
    const masonry = s.key === 'mittelalter' || s.key === 'wueste' || s.key === 'antik' || s.key === 'nether';
    const kind: StoreySpec['kind'] = masonry ? 'stein' : posts ? 'fachwerk' : 'wand';
    const storeys: StoreySpec[] = Array.from({ length: F }, () => ({ h: fh, kind }));
    const ridge = ridgeFor(a.str('first'), B, T);
    // Cross gable: a wing behind the right half, its ridge across the main ridge.
    const wing = cross ? { at: { x0: x1 - Math.max(3, Math.floor(B / 2)) + 1 - (Math.max(3, Math.floor(B / 2)) % 2 === 0 ? 1 : 0), z0: cz, x1, z1: z1 + wingDepth }, ridge: (ridge === 'x' ? 'z' : 'x') as 'x' | 'z' } : null;
    const chimneyAt = a.bool('schornstein') ? { x: x0 + 1, z: z1 } : null;
    const ladderX = x1 - 1, ladderZ = z1 - 1;
    const info = composeHouse(p, l, {
      at: { x0, z0, x1, z1 }, storeys, jetty, jettySides: ['north', 'south'], plinth: kind === 'stein' ? 0 : plinth,
      roof: { kind: form === 'flach' ? 'flach' : form as RoofKind, ridge, overhang: ov, pitch: kitPitch(a.str('neigung')) },
      wings: wing ? [wing] : [], door: { side: 'north', at: cx }, windowEvery: a.int('fensterabstand'), windowH: fh >= 4 ? 2 : 1,
      postEvery: 2 + (a.int('fensterabstand') % 3), flowerBoxes: a.bool('laeden') && s.shutters, noShutters: !a.bool('laeden') || !s.shutters,
      chimney: chimneyAt, seed: m.seed,
      noWindow: (x, _y, z) => (x === ladderX && z === z1) || (porch && z === z0 && Math.abs(x - cx) <= 2),
    });
    // Ladder through the storeys in the back right corner.
    if (F > 1) for (let y = 1; y <= info.floors[F - 1]!; y++) p.set(ladderX, y, ladderZ, 'ladder', ladder('west'));
    if (furnished) info.floors.forEach((f, k) => {
      const y = f + 1, room = info.rooms[k]!;
      bed(p, room.x0, y, room.z1 - 1, s.bed, 'south');
      p.set(room.x0 + 1, y, room.z1, 'chest', chest('north'));
      if (k === 0) { p.set(room.x0, y, room.z0, 'crafting_table'); p.set(room.x1, y, room.z0, 'furnace', furnace('west')); }
      const ly = y + fh - 1;
      if (fh >= 3 && !(cx === ladderX && cz === ladderZ)) p.set(cx, ly, cz, s.light, lantern(true));
    });
    if (form === 'flach') notes.push('Flachdach mit Brüstung: als Dachterrasse nutzbar (Zugang selbst ergänzen).');
    if (porch) {
      for (const x of [cx - 2, cx + 2]) for (let y = 1; y <= fh; y++) p.set(x, y, z0 - 2, `${s.wood}_fence`);
      for (let x = cx - 2; x <= cx + 2; x++) for (let z = z0 - 2; z < z0; z++) {
        if (!p.has(x, 0, z) || p.get(x, 0, z)?.id.endsWith('_stairs')) p.set(x, 0, z, s.floor);
        putFree(p, x, fh + 1, z, s.roof.slab, slab());
      }
    }
    if (cross) notes.push('Quergiebel: Flügel nach hinten, Dächer treffen sich in einer Kehle.');
    if (jetty) notes.push('Obergeschosse kragen vorn und hinten um einen Block vor.');
    if (furnished && B < 6) notes.push('Bei Breite 5 stehen Truhe und Bett eng beieinander.');
    const roofLabel = ROOF_OPTIONS.find(o => o.value === form)!.label.replace(/ \(.*\)$/, '');
    return {
      payload: m.payload(), connectors: [],
      name: `Haus ${B} × ${T}, ${F} Geschoss${F === 1 ? '' : 'e'} (${s.short})`,
      description: `Generiertes Wohnhaus ${B} × ${T}, ${F} Geschoss${F === 1 ? '' : 'e'} à ${fh} Blöcke, ${roofLabel}${cross ? ' mit Quergiebel' : ''}${furnished ? ', eingerichtet' : ''}.`,
      facets: { kategorie: ['wohnhaus'], stil: [...s.stil], biom: [...s.biom], funktion: ['wohnen', ...(furnished ? ['lagern'] : [])] },
      notes,
    };
  },
};
