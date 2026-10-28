import { door, ladder, lantern, Plot, rod } from '../build/plot.js';
import { joint } from '../build/spec.js';
import type { Connector } from '../types.js';
import { buildRoof, coneRoof } from './roofs.js';
import { Mason, styleParam, WEATHER_PARAMS, wallProfile } from './types.js';
import type { Generator } from './types.js';

/**
 * Turm: round or square tower with floors, ladder, windows and a choice of
 * tops. Optional wall joints on all four faces use the wall generator's
 * profile (thickness × total height), so generated walls dock on directly.
 */
export const TOWER_GENERATOR: Generator = {
  id: 'turm', name: 'Turm', version: 1,
  description: 'Runder oder eckiger Turm mit Geschossen, Leiter, Fenstern und Kegeldach, Walmdach, Zinnen oder Plattform; optional mit Mauer-Anschlüssen.',
  params: [
    { key: 'form', label: 'Grundriss', group: 'Maße', type: 'choice', default: 'rund', options: [{ value: 'rund', label: 'Rund' }, { value: 'eckig', label: 'Eckig' }] },
    { key: 'radius', label: 'Radius', group: 'Maße', type: 'int', min: 2, max: 8, default: 3, unit: 'Blöcke', hint: 'Durchmesser = 2 × Radius + 1.' },
    { key: 'hoehe', label: 'Turmhöhe', group: 'Maße', type: 'int', min: 5, max: 48, default: 14, unit: 'Blöcke', hint: 'Bis zur Plattform, ohne Dach.' },
    { key: 'geschoss', label: 'Geschosshöhe', group: 'Maße', type: 'int', min: 3, max: 8, default: 4, unit: 'Blöcke' },
    styleParam(), ...WEATHER_PARAMS,
    { key: 'dach', label: 'Abschluss', group: 'Dach', type: 'choice', default: 'kegel', options: [
      { value: 'kegel', label: 'Kegel- bzw. Zeltdach' }, { value: 'zinnen', label: 'Zinnenkranz' }, { value: 'walm', label: 'Flaches Zeltdach' }, { value: 'plattform', label: 'Offene Plattform' }] },
    { key: 'spitze', label: 'Blitzableiter auf der Spitze', group: 'Dach', type: 'bool', default: true, when: { key: 'dach', values: ['kegel', 'walm'] } },
    { key: 'fenster', label: 'Fenster je Geschoss', group: 'Details', type: 'bool', default: true },
    { key: 'gesims', label: 'Gesimsband je Geschoss', group: 'Details', type: 'bool', default: true },
    { key: 'licht', label: 'Laterne je Geschoss', group: 'Details', type: 'bool', default: true },
    { key: 'anschluesse', label: 'Mauer-Anschlüsse', group: 'Anschlüsse', type: 'bool', default: false },
    { key: 'mauerStaerke', label: 'Mauerstärke', group: 'Anschlüsse', type: 'int', min: 1, max: 4, default: 2, when: { key: 'anschluesse', values: [true] } },
    { key: 'mauerHoehe', label: 'Mauer-Gesamthöhe', group: 'Anschlüsse', type: 'int', min: 3, max: 17, default: 5, when: { key: 'anschluesse', values: [true] } },
  ],
  presets: [
    { id: 'wachturm', label: 'Wachturm', values: { form: 'eckig', radius: 2, hoehe: 10, stil: 'nordisch', dach: 'walm' } },
    { id: 'burgturm', label: 'Burgturm zur Burgmauer', values: { form: 'rund', radius: 4, hoehe: 14, stil: 'mittelalter', dach: 'zinnen', anschluesse: true, mauerStaerke: 3, mauerHoehe: 9, verwitterung: 20 } },
    { id: 'zauberturm', label: 'Zaubererturm', values: { form: 'rund', radius: 3, hoehe: 24, geschoss: 6, stil: 'fernost', dach: 'kegel' } },
    { id: 'leuchtturm', label: 'Aussichtsturm', values: { form: 'rund', radius: 2, hoehe: 18, stil: 'antik', dach: 'plattform' } },
    { id: 'netherturm', label: 'Netherturm', values: { form: 'eckig', radius: 3, hoehe: 20, stil: 'nether', dach: 'zinnen', verwitterung: 25 } },
    { id: 'beispiel', label: 'Passend zu den Beispielmauern', values: { form: 'eckig', radius: 2, hoehe: 8, dach: 'zinnen', anschluesse: true, mauerStaerke: 2, mauerHoehe: 5 } },
  ],
  build(a) {
    const r = a.int('radius'), H = a.int('hoehe'), fh = a.int('geschoss'), round = a.str('form') === 'rund', top = a.str('dach');
    const W = 2 * r + 1, c = r;
    const p = new Plot([W, 1, W]), m = new Mason(p, a), s = m.style, notes: string[] = [];
    const inside = (x: number, z: number, rr: number) => round ? (x - c) ** 2 + (z - c) ** 2 <= rr * rr + rr * 0.8 : Math.abs(x - c) <= rr && Math.abs(z - c) <= rr;
    const edge = (x: number, z: number) => inside(x, z, r) && !(inside(x + 1, z, r) && inside(x - 1, z, r) && inside(x, z + 1, r) && inside(x, z - 1, r));
    const cornerCell = (x: number, z: number) => !round && Math.abs(x - c) === r && Math.abs(z - c) === r;
    // Shell, floors and interior air.
    for (let x = 0; x < W; x++) for (let z = 0; z < W; z++) {
      if (!inside(x, z, r)) continue;
      m.base(x, 0, z);
      for (let y = 1; y <= H; y++) {
        // Corner posts and a string course of the corner material at every floor.
        if (edge(x, z)) cornerCell(x, z) || (a.bool('gesims') && (y % (fh + 1) === 0 || y === H)) ? m.corner(x, y, z) : m.wall(x, y, z);
        else if (y % (fh + 1) === 0 || y === H) p.set(x, y, z, s.floor);
        else p.air(x, y, z);
      }
    }
    // Ladder on the east inner wall, through every floor.
    const lx = c + r - 1;
    for (let y = 1; y <= H; y++) p.set(lx, y, c, 'ladder', ladder('west'));
    // Entrance in the north face (z = 0), placed from outside: the door faces south.
    p.air(c, 1, 0); p.air(c, 2, 0); door(p, c, 1, 0, s.wood, 'south');
    const floors: number[] = [];
    for (let y = 0; y < H; y += fh + 1) floors.push(y);
    for (const fy of floors) {
      if (a.bool('fenster')) for (const [x, z] of [[c, W - 1], [0, c], [c, 0]] as const) {
        if (z === 0 && fy === 0) continue;
        const wy = fy + 2;
        if (wy < H && wy < fy + fh + 1) { p.set(x, wy, z, s.window); if (fh >= 5 && wy + 1 < H) p.set(x, wy + 1, z, s.window); }
      }
      if (a.bool('licht') && fy + fh < H && fh >= 3) p.set(c, fy + fh, c, s.light, lantern(true));
    }
    // Top.
    let peak = H;
    if (top === 'zinnen' || top === 'plattform') {
      for (let x = 0; x < W; x++) for (let z = 0; z < W; z++) if (edge(x, z)) {
        if (top === 'plattform') p.set(x, H + 1, z, `${s.wood}_fence`);
        else if ((x + z) % 2 === 0 || cornerCell(x, z)) m.wall(x, H + 1, z);
      }
      peak = H + 1;
      if (a.bool('licht')) p.set(c, H + 1, c, s.light, lantern());
    } else if (top === 'kegel') {
      peak = round ? coneRoof(p, c, c, H + 1, r, s)
        : buildRoof(p, { x0: 0, x1: W - 1, z0: 0, z1: W - 1, y: H + 1, form: 'walm', pitch: 'steil', ridge: 'z', style: s });
    } else {
      peak = buildRoof(p, { x0: 0, x1: W - 1, z0: 0, z1: W - 1, y: H + 1, form: 'walm', pitch: 'flach', ridge: 'z', style: s });
      if (round) notes.push('Flaches Zeltdach auf rundem Turm: Dach bleibt quadratisch über dem Grundriss.');
    }
    if ((top === 'kegel' || top === 'walm') && a.bool('spitze')) { p.set(c, peak + 1, c, 'lightning_rod', rod('up')); peak++; }
    // Wall joints on the four faces, centred on the wall section like the wall generator.
    const connectors: Connector[] = [];
    if (a.bool('anschluesse')) {
      const t = a.int('mauerStaerke'), hh = a.int('mauerHoehe'), profile = wallProfile(t, hh);
      const j = c - Math.floor((t - 1) / 2) + Math.floor(t / 2);
      connectors.push(joint('west', [0, 0, j], [-1, 0, 0], 'wall_joint', profile), joint('east', [W, 0, j], [1, 0, 0], 'wall_joint', profile),
        joint('north', [j, 0, 0], [0, 0, -1], 'wall_joint', profile), joint('south', [j, 0, W], [0, 0, 1], 'wall_joint', profile));
      notes.push(`Vier Mauer-Anschlüsse, Profil ${profile}${profile === 'wall_2x5' ? ' (passt zu den Beispielmauern)' : ''}. Erzeuge eine Mauer mit Stärke ${t} und Gesamthöhe ${hh}.`);
      if (hh > H) notes.push('Die Mauer wäre höher als der Turm.');
      if (t > W - 2) notes.push('Die Mauer ist breiter als die Turmseite.');
    }
    if (round && r === 2) notes.push('Bei Radius 2 ist der Innenraum nur 3 Blöcke breit.');
    const label = round ? 'Rundturm' : 'Turm';
    return {
      payload: p.payload(), connectors,
      name: `${label} Ø ${W}, ${floors.length} Geschoss${floors.length === 1 ? '' : 'e'} (${s.short})`,
      description: `Generierter ${round ? 'runder' : 'eckiger'} Turm, Durchmesser ${W}, ${floors.length} Geschoss${floors.length === 1 ? '' : 'e'}, Abschluss ${top}.`,
      facets: { kategorie: ['befestigung'], stil: [...s.stil], biom: [...s.biom], funktion: ['verteidigung', 'aussicht'] },
      notes,
    };
  },
};
