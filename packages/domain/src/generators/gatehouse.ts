import { barrel, chest, door, ladder, lantern, Plot, stairs } from '../build/plot.js';
import { joint } from '../build/spec.js';
import type { Connector } from '../types.js';
import { buildRoof } from './roofs.js';
import { Mason, styleParam, WEATHER_PARAMS, wallProfile } from './types.js';
import type { Generator } from './types.js';

/**
 * Torhaus (GEN-02): gate building in the line of a wall. The passage runs
 * north–south through the middle, guard rooms flank it, the upper hall lies
 * at wall-walk height when possible, so the walk of a generated wall of the
 * same section continues through doorways on both sides. Wall joints use the
 * wall generator's profile (thickness × total height) and the tower's
 * centring, so towers, walls and gatehouses of one section snap together.
 */
export const GATEHOUSE_GENERATOR: Generator = {
  id: 'torhaus', name: 'Torhaus', version: 1,
  description: 'Torbau mit Durchfahrt, Fallgitter, Wachstuben, Obergeschoss auf Wehrgangshöhe, Zinnen oder Dach und Mauer-Anschlüssen auf beiden Seiten.',
  params: [
    { key: 'breite', label: 'Breite (entlang der Mauer)', group: 'Maße', type: 'int', min: 7, max: 21, step: 2, default: 11, unit: 'Blöcke' },
    { key: 'tiefe', label: 'Tiefe (Durchfahrt)', group: 'Maße', type: 'int', min: 5, max: 13, step: 2, default: 7, unit: 'Blöcke' },
    { key: 'hoehe', label: 'Höhe', group: 'Maße', type: 'int', min: 6, max: 24, default: 10, unit: 'Blöcke', hint: 'Bis zur Plattform, ohne Zinnen oder Dach.' },
    { key: 'torbreite', label: 'Torbreite', group: 'Tor', type: 'int', min: 1, max: 7, step: 2, default: 3, unit: 'Blöcke' },
    { key: 'torhoehe', label: 'Torhöhe', group: 'Tor', type: 'int', min: 3, max: 8, default: 4, unit: 'Blöcke' },
    { key: 'fallgitter', label: 'Fallgitter herabgelassen', group: 'Tor', type: 'bool', default: false },
    styleParam(), ...WEATHER_PARAMS,
    { key: 'abschluss', label: 'Abschluss', group: 'Dach', type: 'choice', default: 'zinnen', options: [
      { value: 'zinnen', label: 'Zinnen' }, { value: 'walm', label: 'Walmdach' }, { value: 'sattel', label: 'Satteldach' }] },
    { key: 'wachstuben', label: 'Wachstuben neben der Durchfahrt', group: 'Details', type: 'bool', default: true },
    { key: 'anschluesse', label: 'Mauer-Anschlüsse', group: 'Anschlüsse', type: 'bool', default: true },
    { key: 'mauerStaerke', label: 'Mauerstärke', group: 'Anschlüsse', type: 'int', min: 1, max: 4, default: 2, when: { key: 'anschluesse', values: [true] } },
    { key: 'mauerHoehe', label: 'Mauer-Gesamthöhe', group: 'Anschlüsse', type: 'int', min: 3, max: 17, default: 7, when: { key: 'anschluesse', values: [true] },
      hint: 'Ab Torhöhe + 3 liegt der Wehrgang auf Höhe des Obergeschosses und führt hindurch.' },
  ],
  presets: [
    { id: 'beispiel', label: 'Passend zu den Beispielmauern (2 × 5)', values: { breite: 9, tiefe: 5, hoehe: 8, torbreite: 3, torhoehe: 3, mauerStaerke: 2, mauerHoehe: 5 } },
    { id: 'burgtor', label: 'Burgtor zur Burgmauer', values: { breite: 13, tiefe: 9, hoehe: 12, torbreite: 3, torhoehe: 5, mauerStaerke: 3, mauerHoehe: 9, fallgitter: true, verwitterung: 20 } },
    { id: 'stadttor', label: 'Stadttor mit Dach', values: { breite: 15, tiefe: 9, hoehe: 14, torbreite: 5, torhoehe: 6, abschluss: 'walm', mauerStaerke: 3, mauerHoehe: 8 } },
    { id: 'palisadentor', label: 'Nordisches Hoftor', values: { breite: 9, tiefe: 5, hoehe: 7, torbreite: 3, torhoehe: 4, stil: 'nordisch', abschluss: 'sattel', wachstuben: false, mauerStaerke: 1, mauerHoehe: 5 } },
    { id: 'wuestentor', label: 'Wüstentor', values: { breite: 13, tiefe: 7, hoehe: 11, torbreite: 3, torhoehe: 5, stil: 'wueste', mauerStaerke: 2, mauerHoehe: 8 } },
    { id: 'netherpforte', label: 'Netherpforte', values: { breite: 11, tiefe: 7, hoehe: 12, torbreite: 3, torhoehe: 5, stil: 'nether', fallgitter: true, mauerStaerke: 2, mauerHoehe: 10, verwitterung: 25 } },
  ],
  build(a) {
    const W = a.int('breite'), T = a.int('tiefe'), H0 = a.int('hoehe'), top = a.str('abschluss'), withJoints = a.bool('anschluesse');
    const notes: string[] = [];
    const cx = (W - 1) / 2, cz = (T - 1) / 2;
    const tw = Math.min(a.int('torbreite'), W - 4), gh0 = a.int('torhoehe');
    if (tw < a.int('torbreite')) notes.push(`Torbreite auf ${tw} begrenzt (Torhausbreite).`);
    const gx0 = cx - (tw - 1) / 2, gx1 = cx + (tw - 1) / 2;
    const t = withJoints ? Math.min(a.int('mauerStaerke'), T - 2) : 0, wallTotal = a.int('mauerHoehe');
    if (withJoints && t < a.int('mauerStaerke')) notes.push(`Mauerstärke auf ${t} begrenzt (Torhaustiefe).`);
    // Upper floor at wall-walk height when it lies above the gate vault.
    const walkFloor = wallTotal - 2;
    const gh = Math.min(gh0, H0 - 3);
    const matchWalk = withJoints && t >= 2 && walkFloor >= gh + 1;
    const fy = matchWalk ? walkFloor : gh + 1;
    if (withJoints && t >= 2 && !matchWalk) notes.push(`Der Wehrgang (Höhe ${walkFloor + 1}) liegt unter dem Obergeschoss: kein Durchgang vom Torhaus zur Mauer.`);
    const H = Math.max(H0, fy + 4);
    if (H > H0) notes.push(`Höhe auf ${H} erhöht, damit über dem Tor ein Obergeschoss Platz hat.`);
    if (gh < gh0) notes.push(`Torhöhe auf ${gh} begrenzt.`);
    const p = new Plot([W, 2, T]), m = new Mason(p, a), s = m.style;
    const roomW = gx0 - 2 >= 1 && a.bool('wachstuben');
    // Body.
    for (let x = 0; x < W; x++) for (let z = 0; z < T; z++) {
      m.base(x, 0, z);
      const shell = x === 0 || x === W - 1 || z === 0 || z === T - 1, corner = (x === 0 || x === W - 1) && (z === 0 || z === T - 1);
      for (let y = 1; y <= H; y++) {
        if (shell) { corner || y === fy ? m.corner(x, y, z) : m.wall(x, y, z); continue; }
        if (y === fy || y === H) { p.set(x, y, z, s.floor); continue; }
        if (y > fy) { p.air(x, y, z); continue; }
        const passage = x >= gx0 && x <= gx1, room = roomW && (x < gx0 - 1 || x > gx1 + 1);
        if (passage) y <= gh ? p.air(x, y, z) : m.wall(x, y, z);
        else if (room) p.air(x, y, z);
        else m.wall(x, y, z);
      }
    }
    // Passage through both faces with arch corners.
    for (let x = gx0; x <= gx1; x++) for (let y = 1; y <= gh; y++) { p.air(x, y, 0); p.air(x, y, T - 1); }
    if (tw >= 3) for (const z of [0, T - 1]) { p.set(gx0, gh, z, s.trim.stairs, stairs('east', 'top')); p.set(gx1, gh, z, s.trim.stairs, stairs('west', 'top')); }
    if (a.bool('fallgitter')) { for (let x = gx0; x <= gx1; x++) for (let y = 1; y <= gh - (tw >= 3 ? 1 : 0); y++) p.set(x, y, 1, 'iron_bars'); notes.push('Fallgitter herabgelassen: Durchfahrt geschlossen.'); }
    // Guard rooms: doors to the courtyard (south), storage, light, ladder up in the west room.
    if (roomW) {
      for (const [r0, r1] of [[1, gx0 - 2], [gx1 + 2, W - 2]] as const) {
        const dx = Math.floor((r0 + r1) / 2);
        door(p, dx, 1, T - 1, s.wood, 'north');
        if (T >= 7) { p.set(r0, 1, 1, 'chest', chest('south')); p.set(r1, 1, 1, 'barrel', barrel('up')); }
        if (fy - 1 >= 3) p.set(dx, fy - 1, cz, s.light, lantern(true));
      }
      for (let y = 1; y < H; y++) p.set(1, y, T - 2, 'ladder', ladder('east'));
    } else {
      for (let y = fy + 1; y < H; y++) p.set(1, y, T - 2, 'ladder', ladder('east'));
      notes.push(roomW ? '' : 'Ohne Wachstuben: Obergeschoss nur über den Wehrgang erreichbar.');
    }
    if (top === 'zinnen') p.set(1, H, T - 2, 'ladder', ladder('east'));
    // Upper hall: arrow slits to the field and the courtyard, light.
    for (let x = 2; x < W - 2; x += 2) for (const z of [0, T - 1]) p.set(x, fy + 2, z, s.window);
    if (H - fy >= 4) p.set(cx, H - 1, cz, s.light, lantern(true));
    // Wall joints and walk-through doorways.
    const connectors: Connector[] = [];
    if (withJoints) {
      const profile = wallProfile(t, wallTotal), jz = cz - Math.floor((t - 1) / 2) + Math.floor(t / 2), wz0 = jz - Math.floor(t / 2);
      connectors.push(joint('west', [0, 0, jz], [-1, 0, 0], 'wall_joint', profile), joint('east', [W, 0, jz], [1, 0, 0], 'wall_joint', profile));
      if (matchWalk) for (const x of [0, W - 1]) for (let z = wz0 + 1; z < wz0 + t; z++) { p.air(x, fy + 1, z); p.air(x, fy + 2, z); }
      notes.push(`Mauer-Anschlüsse West und Ost, Profil ${profile}${profile === 'wall_2x5' ? ' (passt zu den Beispielmauern)' : ''}${matchWalk ? '; der Wehrgang führt durch das Obergeschoss' : ''}.`);
      if (wallTotal > H) notes.push('Die Mauer wäre höher als das Torhaus.');
    }
    // Top.
    if (top === 'zinnen') {
      for (let x = 0; x < W; x++) for (let z = 0; z < T; z++) if ((x === 0 || x === W - 1 || z === 0 || z === T - 1) && ((x + z) % 2 === 0 || ((x === 0 || x === W - 1) && (z === 0 || z === T - 1)))) m.wall(x, H + 1, z);
    } else buildRoof(p, { x0: 0, x1: W - 1, z0: 0, z1: T - 1, y: H + 1, form: top === 'walm' ? 'walm' : 'sattel', pitch: 'steil', ridge: 'x', style: s, gable: { x0: 0, x1: W - 1, z0: 0, z1: T - 1, block: s.wall } });
    return {
      payload: m.payload(), connectors,
      name: `Torhaus ${W} × ${T}, Tor ${tw} × ${gh} (${s.short})`,
      description: `Generiertes Torhaus ${W} × ${T}, Höhe ${H}, Durchfahrt ${tw} breit und ${gh} hoch${roomW ? ', mit Wachstuben' : ''}.`,
      facets: { kategorie: ['befestigung'], stil: [...s.stil], biom: [...s.biom], funktion: ['verteidigung', 'verbindung'] },
      notes: notes.filter(Boolean),
    };
  },
};
