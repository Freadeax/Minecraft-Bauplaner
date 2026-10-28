import { chain, lantern, Plot, slab, stairs } from '../build/plot.js';
import { joint } from '../build/spec.js';
import { Mason, pathProfile, styleParam, WEATHER_PARAMS } from './types.js';
import type { Generator } from './types.js';

/**
 * Brücke along x. The deck height follows a profile e(x) that never rises more
 * than one block per step, so stairs make every bridge walkable; the ends are
 * path connectors with profile weg_<breite> (weg_4 = the shipped path kit).
 */
export const BRIDGE_GENERATOR: Generator = {
  id: 'bruecke', name: 'Brücke', version: 1,
  description: 'Bogen-, Balken- oder Hängebrücke mit wählbarer Spannweite, Breite und Höhe, Geländer, Pfeilern und Laternen; Enden als Weg-Anschlüsse.',
  params: [
    { key: 'form', label: 'Bauart', group: 'Maße', type: 'choice', default: 'bogen', options: [
      { value: 'bogen', label: 'Steinbogen' }, { value: 'balken', label: 'Balkenbrücke auf Pfeilern' }, { value: 'haenge', label: 'Hängebrücke' }] },
    { key: 'laenge', label: 'Länge', group: 'Maße', type: 'int', min: 6, max: 48, default: 16, unit: 'Blöcke' },
    { key: 'breite', label: 'Wegbreite', group: 'Maße', type: 'int', min: 2, max: 9, default: 4, unit: 'Blöcke', hint: 'Ohne Geländer; 4 passt zum Wege-Baukasten.' },
    { key: 'hoehe', label: 'Höhe in der Mitte', group: 'Maße', type: 'int', min: 2, max: 12, default: 4, unit: 'Blöcke', when: { key: 'form', values: ['bogen', 'balken'] },
      hint: 'Wird durch die Länge begrenzt: höchstens ein Block Steigung je Schritt.' },
    styleParam(), ...WEATHER_PARAMS,
    { key: 'gelaender', label: 'Geländer', group: 'Details', type: 'choice', default: 'mauer', options: [
      { value: 'mauer', label: 'Steinbrüstung' }, { value: 'zaun', label: 'Holzzaun' }, { value: 'keins', label: 'Keins' }] },
    { key: 'pfeiler', label: 'Pfeiler alle', group: 'Details', type: 'int', min: 3, max: 12, default: 6, unit: 'Blöcke', when: { key: 'form', values: ['balken'] } },
    { key: 'laternen', label: 'Laternen alle 6 Blöcke', group: 'Details', type: 'bool', default: true },
  ],
  presets: [
    { id: 'dorfbruecke', label: 'Dorfbrücke für den Wege-Baukasten', values: { form: 'bogen', laenge: 12, breite: 4, hoehe: 3, stil: 'mittelalter' } },
    { id: 'viadukt', label: 'Langer Steinbogen', values: { form: 'bogen', laenge: 40, breite: 5, hoehe: 10, stil: 'mittelalter', verwitterung: 25 } },
    { id: 'holzsteg', label: 'Holzsteg auf Pfeilern', values: { form: 'balken', laenge: 20, breite: 3, hoehe: 3, stil: 'nordisch', gelaender: 'zaun', pfeiler: 5 } },
    { id: 'schlucht', label: 'Hängebrücke über eine Schlucht', values: { form: 'haenge', laenge: 30, breite: 3, stil: 'nordisch', gelaender: 'zaun' } },
    { id: 'garten', label: 'Gartenbrücke (Fernost)', values: { form: 'bogen', laenge: 9, breite: 2, hoehe: 2, stil: 'fernost', gelaender: 'zaun' } },
    { id: 'netherbruecke', label: 'Netherbrücke', values: { form: 'balken', laenge: 24, breite: 3, hoehe: 6, stil: 'nether', gelaender: 'zaun', pfeiler: 8 } },
  ],
  build(a) {
    const form = a.str('form'), L = a.int('laenge'), b = a.int('breite'), W = b + 2, rail = a.str('gelaender');
    const notes: string[] = [], c = (L - 1) / 2;
    // Deck profile.
    let e: number[];
    let wanted = a.int('hoehe');
    if (form === 'haenge') {
      const sag = Math.min(3, Math.floor(L / 10));
      e = Array.from({ length: L }, (_, x) => sag - Math.round(sag * (1 - ((x - c) / c) ** 2)));
      wanted = sag;
    } else {
      e = Array.from({ length: L }, (_, x) => {
        const target = form === 'bogen' ? Math.round(wanted * (1 - ((x - c) / (c + 1)) ** 2)) : wanted;
        return Math.max(0, Math.min(target, x, L - 1 - x));
      });
      const top = Math.max(...e);
      if (top < wanted) notes.push(`Höhe ${wanted} bei Länge ${L} nicht erreichbar; höchstens ${top} (ein Block Steigung je Schritt).`);
    }
    const p = new Plot([L, 1, W]), m = new Mason(p, a), s = m.style;
    const wood = form !== 'bogen', deck = wood ? (form === 'haenge' ? `${s.wood}_planks` : s.floor) : s.trim.full;
    for (let x = 0; x < L; x++) {
      const y = e[x]!;
      for (let z = 0; z < W; z++) {
        const edgeRow = z === 0 || z === W - 1;
        if (edgeRow && wood) m.beam(x, y, z, 'x'); else if (edgeRow) m.put(x, y, z, s.trim.full); else m.put(x, y, z, deck);
        if (form === 'bogen') {
          // Arched body two blocks thick, solid abutments at the ends.
          const under = x < 2 || x > L - 3 ? 0 : Math.max(0, y - 2);
          for (let yy = under; yy < y; yy++) m.base(x, yy, z);
        } else if (form === 'balken' && y < wanted) for (let yy = 0; yy < y; yy++) m.base(x, yy, z);
      }
      // Steps.
      for (let z = 1; z <= b; z++) {
        if (x + 1 < L && e[x + 1] === y + 1) p.set(x, y + 1, z, wood ? `${s.wood}_stairs` : s.trim.stairs, stairs('east'));
        else if (x > 0 && e[x - 1] === y + 1) p.set(x, y + 1, z, wood ? `${s.wood}_stairs` : s.trim.stairs, stairs('west'));
      }
      // Railing.
      for (const z of [0, W - 1]) {
        if (rail === 'mauer') { if (s.trim.wall) p.set(x, y + 1, z, s.trim.wall); else p.set(x, y + 1, z, s.trim.slab, slab()); }
        else if (rail === 'zaun') p.set(x, y + 1, z, `${s.wood}_fence`);
        if (a.bool('laternen') && rail !== 'keins' && x % 6 === 3 && (rail === 'zaun' || s.trim.wall)) p.set(x, y + 2, z, s.light, lantern());
      }
    }
    if (form === 'balken') {
      const every = a.int('pfeiler');
      for (let x = every; x < L - 1; x += every) if (e[x] === wanted) for (let z = 0; z < W; z++) for (let y = 0; y < wanted; y++) m.base(x, y, z);
    }
    if (form === 'haenge') {
      // Towers at both ends, chain cables sagging to the middle, hangers every third block.
      const towerTop = e[0]! + 5;
      for (const x of [0, L - 1]) for (const z of [0, W - 1]) { for (let y = 0; y <= towerTop; y++) m.put(x, y, z, s.corner); }
      for (const z of [0, W - 1]) for (let x = 1; x < L - 1; x++) {
        const cable = e[x]! + 1 + Math.round(3 * ((x - c) / c) ** 2) + 1;
        p.set(x, cable, z, 'chain', chain('x'));
        if (x % 3 === 0) for (let y = e[x]! + 2; y < cable; y++) p.set(x, y, z, 'chain', chain('y'));
      }
      if (rail === 'mauer') notes.push('Hängebrücke: Steinbrüstung wirkt schwer, Holzzaun passt besser.');
    }
    const jz = 1 + Math.floor(b / 2), profile = pathProfile(b);
    notes.push(`Weg-Anschlüsse an beiden Enden, Profil ${profile}${b === 4 ? ' – passt zum Wege-Baukasten und zur Steinbrücke' : ''}.`);
    if (form !== 'haenge' && wanted > 0 && L < 2 * wanted + 2) notes.push('Kurze Brücke: Rampen nehmen die ganze Länge ein.');
    const label = form === 'bogen' ? 'Bogenbrücke' : form === 'balken' ? 'Balkenbrücke' : 'Hängebrücke';
    return {
      payload: p.payload(),
      connectors: [joint('west', [0, e[0]!, jz], [-1, 0, 0], 'path_joint', profile), joint('east', [L, e[L - 1]!, jz], [1, 0, 0], 'path_joint', profile)],
      name: `${label} ${L} × ${b} (${s.short})`,
      description: `Generierte ${label}, ${L} Blöcke lang, Weg ${b} breit, Scheitel ${Math.max(...e)} über den Enden.`,
      facets: { kategorie: ['infrastruktur'], stil: [...s.stil], biom: [...s.biom], funktion: ['verbindung', 'transport'] },
      notes,
    };
  },
};
