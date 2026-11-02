import { barrel, chain, chest, door, lampPost, lantern, Plot, stairs } from '../build/plot.js';
import { joint } from '../build/spec.js';
import { buildRoof } from './roofs.js';
import { Mason, pathProfile, styleParam, WEATHER_PARAMS } from './types.js';
import type { Generator } from './types.js';

/**
 * Hafen (GEN-02): quay wall along x with piers reaching north into the water.
 * The model stands on the sea floor (y = 0): pier decks lie one block above
 * the water surface at `wassertiefe`, the quay one block higher, and every
 * pier starts with a stair in the quay edge. Water itself is not part of the
 * plan; the model is placed into existing water. The land side is a path
 * connector (weg_4 = the shipped path kit).
 */
export const HARBOR_GENERATOR: Generator = {
  id: 'hafen', name: 'Hafen', version: 3,
  description: 'Kaimauer mit Holzstegen auf Pfählen, Pollern, Treppen, Kran, Lagerschuppen, Laternen und Leuchtfeuer; Landseite als Weg-Anschluss.',
  params: [
    { key: 'laenge', label: 'Kailänge (x)', group: 'Maße', type: 'int', min: 10, max: 48, default: 24, unit: 'Blöcke' },
    { key: 'kai', label: 'Kaitiefe (z)', group: 'Maße', type: 'int', min: 3, max: 10, default: 6, unit: 'Blöcke', hint: 'Ab 6 ist Platz für einen Lagerschuppen.' },
    { key: 'wassertiefe', label: 'Wassertiefe', group: 'Maße', type: 'int', min: 2, max: 10, default: 3, unit: 'Blöcke', hint: 'Abstand Meeresgrund bis Wasserspiegel; Stege liegen einen Block darüber.' },
    { key: 'stege', label: 'Stege', group: 'Stege', type: 'int', min: 0, max: 5, default: 2 },
    { key: 'steglaenge', label: 'Steglänge', group: 'Stege', type: 'int', min: 4, max: 32, default: 10, unit: 'Blöcke' },
    { key: 'stegbreite', label: 'Stegbreite', group: 'Stege', type: 'int', min: 2, max: 5, default: 3, unit: 'Blöcke' },
    styleParam('nordisch'), ...WEATHER_PARAMS,
    { key: 'kran', label: 'Hafenkran', group: 'Ausstattung', type: 'bool', default: true },
    { key: 'lager', label: 'Lagerschuppen', group: 'Ausstattung', type: 'bool', default: true },
    { key: 'leuchtfeuer', label: 'Leuchtfeuer am äußeren Steg', group: 'Ausstattung', type: 'bool', default: true },
    { key: 'poller', label: 'Poller und Laternen', group: 'Ausstattung', type: 'bool', default: true },
  ],
  presets: [
    { id: 'fischerhafen', label: 'Fischerhafen', values: { laenge: 18, kai: 6, wassertiefe: 3, stege: 2, steglaenge: 9, stegbreite: 2, stil: 'nordisch' } },
    { id: 'handelshafen', label: 'Handelshafen', values: { laenge: 40, kai: 9, wassertiefe: 5, stege: 4, steglaenge: 16, stegbreite: 4, stil: 'mittelalter', verwitterung: 25 } },
    { id: 'anleger', label: 'Kleiner Bootsanleger', values: { laenge: 10, kai: 3, wassertiefe: 2, stege: 1, steglaenge: 8, stegbreite: 3, stil: 'fachwerk', kran: false, lager: false } },
    { id: 'kaimauer', label: 'Kaimauer ohne Stege', values: { laenge: 30, kai: 5, wassertiefe: 4, stege: 0, stil: 'mittelalter', lager: false } },
    { id: 'marina', label: 'Moderne Marina', values: { laenge: 32, kai: 7, wassertiefe: 3, stege: 5, steglaenge: 12, stegbreite: 2, stil: 'modern', kran: false } },
    { id: 'netherhafen', label: 'Hafen am Lavasee', values: { laenge: 20, kai: 6, wassertiefe: 4, stege: 2, steglaenge: 10, stegbreite: 3, stil: 'nether' } },
  ],
  build(a) {
    const L = a.int('laenge'), K = a.int('kai'), tiefe = a.int('wassertiefe'), b = a.int('stegbreite');
    const wantPiers = a.int('stege'), Ls = wantPiers > 0 ? a.int('steglaenge') : (a.bool('kran') ? 4 : 1);
    const pierY = tiefe + 1, quayY = tiefe + 2, zq = Ls, ze = Ls + K - 1;
    const p = new Plot([L, 2, ze + 1]), m = new Mason(p, a), s = m.style, notes: string[] = [];
    // Piers: evenly spread, at least two free blocks between them and to the ends.
    const n = Math.min(wantPiers, Math.floor((L - 2) / (b + 3)));
    if (n < wantPiers) notes.push(`Nur ${n} Steg${n === 1 ? '' : 'e'} der Breite ${b} passen an ${L} Blöcke Kai.`);
    const piers: number[] = [];
    for (let i = 0; i < n; i++) { const seg = L / n; piers.push(Math.floor(i * seg + (seg - b) / 2)); }
    const inPier = (x: number) => piers.some(px => x >= px - 1 && x <= px + b);
    // Quay body from the sea floor, front row in base stone, edge as trim.
    for (let x = 0; x < L; x++) for (let z = zq; z <= ze; z++) {
      for (let y = 0; y < quayY; y++) m.base(x, y, z);
      if (z === zq) m.put(x, quayY, z, s.trim.full); else m.base(x, quayY, z);
    }
    const planks = `${s.wood}_planks`;
    for (const px of piers) {
      for (let z = 0; z < zq; z++) for (let x = px; x < px + b; x++) {
        const edge = x === px || x === px + b - 1;
        if (edge) m.beam(x, pierY, z, 'z'); else p.set(x, pierY, z, planks);
        if (edge && (z === 0 || (zq - 1 - z) % 3 === 0)) for (let y = 0; y < pierY; y++) m.put(x, y, z, s.beam);
      }
      // Step from the pier up onto the quay.
      for (let x = px; x < px + b; x++) p.set(x, quayY, zq, s.trim.stairs, stairs('south'));
      if (a.bool('poller')) for (const x of [px, px + b - 1]) p.set(x, pierY + 1, 0, `${s.wood}_fence`);
    }
    // Lighthouse beacon on the outermost pier.
    if (a.bool('leuchtfeuer') && piers.length) {
      const px = piers[piers.length - 1]!, x = px + Math.floor(b / 2);
      for (let y = pierY + 1; y <= pierY + 3; y++) m.corner(x, y, 0);
      p.set(x, pierY + 4, 0, 'sea_lantern');
      notes.push('Leuchtfeuer am Ende des östlichen Stegs.');
    } else if (a.bool('leuchtfeuer')) notes.push('Ohne Steg kein Leuchtfeuer.');
    // Free columns on the quay for crane, shed and lamps.
    const used = new Set<string>();
    const take = (x: number, z: number) => used.add(`${x},${z}`);
    const free = (x: number, z: number) => !used.has(`${x},${z}`);
    // Crane at the east end, clear of the piers; jib over the water.
    if (a.bool('kran')) {
      let kx = -1;
      for (let x = L - 2; x >= 1; x--) if (!inPier(x)) { kx = x; break; }
      if (kx < 0 || Ls < 4 || K < 3) notes.push('Für den Kran fehlt Platz am Kai.');
      else {
        const top = quayY + 6, kz = zq + 1;
        for (let y = quayY + 1; y <= top; y++) m.put(kx, y, kz, s.beam);
        for (let z = zq - 3; z <= Math.min(ze, kz + 1); z++) if (z !== kz) m.beam(kx, top, z, 'z');
        p.set(kx, top + 1, kz, s.trim.slab, { type: 'bottom', waterlogged: 'false' });
        if (kz + 1 <= ze) p.set(kx, top - 1, kz + 1, 'barrel', barrel('up'));
        for (let y = top - 1; y >= quayY + 3; y--) p.set(kx, y, zq - 3, 'iron_chain', chain('y'));
        p.set(kx, quayY + 2, zq - 3, 'hay_block', { axis: 'y' });
        for (let z = zq; z <= Math.min(ze, kz + 1); z++) take(kx, z);
        notes.push('Kran am Ostende: Last hängt über dem Wasser.');
      }
    }
    // Storage shed on the quay, west end.
    if (a.bool('lager')) {
      const sw = Math.min(9, L - 6), sz0 = zq + 2, sz1 = ze;
      if (K < 6 || sw < 5) notes.push('Lagerschuppen braucht Kaitiefe 6 und 11 Blöcke Kailänge.');
      else {
        const sx0 = 1, sx1 = sx0 + sw - 1, cx = sx0 + Math.floor(sw / 2), wh = 4;
        for (let x = sx0; x <= sx1; x++) for (let z = sz0; z <= sz1; z++) {
          take(x, z);
          const shell = x === sx0 || x === sx1 || z === sz0 || z === sz1, corner = (x === sx0 || x === sx1) && (z === sz0 || z === sz1);
          for (let y = quayY + 1; y <= quayY + wh; y++) shell ? (corner ? m.corner(x, y, z) : m.wall(x, y, z)) : p.air(x, y, z);
        }
        door(p, cx, quayY + 1, sz0, s.wood, 'south');
        for (let x = sx0 + 1; x < sx1; x++) if (x !== cx) p.set(x, quayY + 1, sz1 - 1, x % 2 ? 'barrel' : 'chest', x % 2 ? barrel('up') : chest('north'));
        if (sz1 - sz0 >= 4) p.set(sx0 + 1, quayY + 1, sz0 + 1, 'barrel', barrel('up'));
        // A top slab has no full underside: the lantern hangs from a chain link (BLOCK-02).
        p.set(cx, quayY + wh, sz0 + Math.floor((sz1 - sz0) / 2), 'iron_chain', chain('y')); p.set(cx, quayY + wh - 1, sz0 + Math.floor((sz1 - sz0) / 2), s.light, lantern(true));
        for (const x of [sx0 + 2, sx1 - 2]) if (x !== cx) p.set(x, quayY + 3, sz0, s.window);
        for (let x = sx0; x <= sx1; x++) take(x, sz0 - 1);
        buildRoof(p, { x0: sx0, x1: sx1, z0: sz0, z1: sz1, y: quayY + wh + 1, form: s.flat ? 'flach' : 'sattel', pitch: 'flach', ridge: 'x', style: s,
          gable: { x0: sx0, x1: sx1, z0: sz0, z1: sz1, block: s.wall }, parapet: true });
      }
    }
    // Bollards along the edge and lamps on the quay.
    if (a.bool('poller')) {
      for (let x = 1; x < L - 1; x += 4) if (!inPier(x) && free(x, zq)) p.set(x, quayY + 1, zq, `${s.wood}_fence`);
      for (let x = 3; x < L - 1; x += 8) if (!inPier(x) && free(x, zq + 1) && K >= 3) { lampPost(p, x, quayY + 1, zq + 1, `${s.wood}_fence`, 2, s.light); take(x, zq + 1); }
    }
    const jx = Math.floor(L / 2), profile = pathProfile(4);
    notes.push(`Stege auf Höhe ${pierY}, Kai auf Höhe ${quayY} über dem Meeresgrund; Wasser ist nicht Teil des Plans.`);
    notes.push(`Weg-Anschluss auf der Landseite, Profil ${profile} (Wege-Baukasten).`);
    return {
      payload: m.payload(),
      connectors: [joint('land', [jx, quayY, ze + 1], [0, 0, 1], 'path_joint', profile)],
      name: `Hafen ${L} m, ${n} Steg${n === 1 ? '' : 'e'} (${s.short})`,
      description: `Generierter Hafen: Kai ${L} × ${K}, ${n} Steg${n === 1 ? '' : 'e'} ${b} breit und ${Ls} lang, Wassertiefe ${tiefe}.`,
      facets: { kategorie: ['infrastruktur'], stil: [...new Set([...s.stil, 'kuestenstil'])], biom: ['kueste', 'ozean'], funktion: ['transport', 'handel', ...(a.bool('lager') ? ['lagern'] : [])] },
      notes,
    };
  },
};
