import { gate, lantern, Plot, slab, stairs } from '../build/plot.js';
import { joint } from '../build/spec.js';
import { Mason, styleParam, WEATHER_PARAMS, wallProfile } from './types.js';
import type { Generator } from './types.js';

/**
 * Mauer: straight defensive wall along x. The cross-section (thickness ×
 * total height) is the connector profile, so walls of equal section chain and
 * dock onto towers generated with the same section; 2 × 5 matches the shipped
 * sample wall, tower and gatehouse.
 */
export const WALL_GENERATOR: Generator = {
  id: 'mauer', name: 'Mauer', version: 1,
  description: 'Gerade Wehrmauer mit wählbarer Länge, Höhe und Stärke, Zinnen oder Mauerkrone, Wehrgang, Strebepfeilern, Schießscharten und Tor.',
  params: [
    { key: 'laenge', label: 'Länge', group: 'Maße', type: 'int', min: 3, max: 64, default: 12, unit: 'Blöcke' },
    { key: 'hoehe', label: 'Mauerhöhe', group: 'Maße', type: 'int', min: 2, max: 16, default: 4, unit: 'Blöcke', hint: 'Ohne Krone; die Gesamthöhe nennt das Anschlussprofil.' },
    { key: 'staerke', label: 'Stärke', group: 'Maße', type: 'int', min: 1, max: 4, default: 2, unit: 'Blöcke' },
    styleParam(), ...WEATHER_PARAMS,
    { key: 'krone', label: 'Krone', group: 'Details', type: 'choice', default: 'zinnen', options: [
      { value: 'zinnen', label: 'Zinnen' }, { value: 'mauer', label: 'Mauerkrone (Mauerblöcke)' }, { value: 'stufen', label: 'Abgestuft (Treppen)' }, { value: 'keine', label: 'Keine' }] },
    { key: 'wehrgang', label: 'Wehrgang mit Laternen', group: 'Details', type: 'bool', default: true },
    { key: 'pfeiler', label: 'Strebepfeiler alle', group: 'Details', type: 'int', min: 0, max: 16, default: 0, unit: 'Blöcke', hint: '0 = keine; Pfeiler stehen auf der Feldseite (Norden).' },
    { key: 'scharten', label: 'Schießscharten', group: 'Details', type: 'bool', default: false },
    { key: 'tor', label: 'Tor in der Mitte', group: 'Details', type: 'bool', default: false },
  ],
  presets: [
    { id: 'passend', label: 'Passend zu den Beispielmodulen (2 × 5)', values: { laenge: 6, hoehe: 4, staerke: 2, stil: 'mittelalter', krone: 'zinnen' } },
    { id: 'burgmauer', label: 'Burgmauer', values: { laenge: 24, hoehe: 8, staerke: 3, stil: 'mittelalter', krone: 'zinnen', pfeiler: 6, scharten: true, verwitterung: 20 } },
    { id: 'stadttor', label: 'Stadtmauer mit Tor', values: { laenge: 15, hoehe: 7, staerke: 3, stil: 'mittelalter', tor: true, scharten: true } },
    { id: 'gartenmauer', label: 'Gartenmauer', values: { laenge: 10, hoehe: 2, staerke: 1, stil: 'fachwerk', krone: 'stufen', wehrgang: false } },
    { id: 'wuestenwall', label: 'Wüstenwall', values: { laenge: 20, hoehe: 6, staerke: 2, stil: 'wueste', krone: 'mauer', pfeiler: 5 } },
    { id: 'netherwall', label: 'Netherfestung', values: { laenge: 18, hoehe: 9, staerke: 2, stil: 'nether', krone: 'zinnen', scharten: true } },
  ],
  build(a) {
    const L = a.int('laenge'), h = a.int('hoehe'), t = a.int('staerke'), crown = a.str('krone'), every = a.int('pfeiler');
    const off = every > 0 ? 1 : 0, depth = t + off, z0 = off, z1 = off + t - 1;
    const crownH = crown === 'keine' ? 0 : 1;
    const p = new Plot([L, h + crownH, depth]), m = new Mason(p, a), s = m.style;
    const notes: string[] = [];
    // Body; every 6th column a corner block as pilaster rhythm, ends as posts.
    for (let x = 0; x < L; x++) for (let y = 0; y < h; y++) for (let z = z0; z <= z1; z++) {
      if (y === 0) m.base(x, y, z);
      else if (x === 0 || x === L - 1) m.corner(x, y, z);
      else m.wall(x, y, z);
    }
    if (every > 0) for (let x = 0; x < L; x += every) {
      for (let y = 0; y < h - 1; y++) m.put(x, y, 0, y === 0 ? s.base.full : s.corner);
      p.set(x, h - 1, 0, s.trim.stairs, stairs('south'));
    }
    if (a.bool('scharten') && h >= 4) {
      const y = Math.min(h - 2, 2);
      for (let x = 3; x < L - 2; x += 4) for (let z = z0; z <= z1; z++) { p.air(x, y, z); p.air(x, y + 1, z); }
    } else if (a.bool('scharten')) notes.push('Schießscharten erst ab Mauerhöhe 4.');
    if (a.bool('tor')) {
      const w = L >= 7 ? 3 : 1, gh = Math.min(h - 1, w === 3 ? 4 : 2), gx = Math.floor((L - w) / 2);
      if (gh < 2) notes.push('Für ein Tor ist die Mauer zu niedrig (mindestens 3).');
      else {
        for (let x = gx; x < gx + w; x++) for (let z = z0; z <= z1; z++) for (let y = 1; y <= gh; y++) p.air(x, y, z);
        // Arch corners and a gate leaf in the outer plane.
        if (w === 3 && gh >= 3) { p.set(gx, gh, z0, s.trim.stairs, stairs('east', 'top')); p.set(gx + 2, gh, z0, s.trim.stairs, stairs('west', 'top')); }
        for (let x = gx; x < gx + w; x++) p.set(x, 1, z0, `${s.wood}_fence_gate`, gate('south'));
        notes.push(`Tor ${w} × ${gh} in der Mitte (Zauntore auf der Feldseite).`);
      }
    }
    // Crown on the outer (north) edge, walkway behind.
    for (let x = 0; x < L; x++) {
      if (crown === 'zinnen') { if (x % 2 === 0 || x === L - 1) m.wall(x, h, z0); }
      else if (crown === 'mauer') { if (s.trim.wall) p.set(x, h, z0, s.trim.wall); else p.set(x, h, z0, s.trim.slab, slab()); }
      else if (crown === 'stufen') for (let z = z0; z <= z1; z++) p.set(x, h, z, s.trim.slab, slab());
      if (crownH && crown !== 'stufen' && t >= 2) for (let z = z0 + 1; z <= z1; z++) p.air(x, h, z);
    }
    if (a.bool('wehrgang') && crown !== 'stufen') {
      if (t < 2) notes.push('Wehrgang erst ab Stärke 2 begehbar.');
      else if (crownH) for (let x = 2; x < L - 1; x += 8) p.set(x, h, z1, s.light, lantern());
    }
    const total = h + crownH, profile = wallProfile(t, total), jz = z0 + Math.floor(t / 2);
    notes.push(`Anschlüsse an beiden Enden: wall_joint, Profil ${profile}${profile === 'wall_2x5' ? ' – passt zu Mauersegment, Turm und Torhaus der Beispiele' : ''}. Türme mit gleichem Profil docken an.`);
    return {
      payload: p.payload(),
      connectors: [joint('west', [0, 0, jz], [-1, 0, 0], 'wall_joint', profile), joint('east', [L, 0, jz], [1, 0, 0], 'wall_joint', profile)],
      name: `Mauer ${L} × ${total}${a.bool('tor') ? ' mit Tor' : ''} (${s.short})`,
      description: `Generierte Wehrmauer, ${L} Blöcke lang, ${t} stark, ${total} hoch.`,
      facets: { kategorie: ['befestigung'], stil: [...s.stil], biom: [...s.biom], funktion: ['verteidigung', 'verbindung'] },
      notes,
    };
  },
};
