import { candle, chain, door, ladder, lantern, lectern, Plot, rod, stairs } from '../build/plot.js';
import type { H } from '../build/plot.js';
import { bell } from '../build/furnish.js';
import { buildRoof, PITCH_OPTIONS } from './roofs.js';
import type { Pitch } from './roofs.js';
import { Mason, styleParam, WEATHER_PARAMS } from './types.js';
import type { Generator } from './types.js';
import type { Style } from './styles.js';

/**
 * Kirche (GEN-02): nave along z with a steep gable roof, front (north) tower
 * with belfry and spire, a ridge turret or a rose window, choir as apse or
 * rectangle at the south end, optional side aisles under lean-to roofs with
 * an arcade and clerestory windows, pews, altar and bell.
 */
export const CHURCH_GENERATOR: Generator = {
  id: 'kirche', name: 'Kirche', version: 1,
  description: 'Kirche mit Langhaus, Turm (Helm, Zeltdach, Zinnen) oder Dachreiter, Apsis oder Rechteckchor, Seitenschiffen, Fensterreihen, Rosette, Bänken, Altar und Glocke.',
  params: [
    { key: 'breite', label: 'Breite Langhaus', group: 'Maße', type: 'int', min: 7, max: 19, step: 2, default: 9, unit: 'Blöcke', hint: 'Ungerade, damit Tür, Turm und Mittelgang mittig liegen.' },
    { key: 'laenge', label: 'Länge Langhaus', group: 'Maße', type: 'int', min: 9, max: 41, default: 17, unit: 'Blöcke' },
    { key: 'wandhoehe', label: 'Wandhöhe', group: 'Maße', type: 'int', min: 5, max: 14, default: 7, unit: 'Blöcke' },
    styleParam('mittelalter'), ...WEATHER_PARAMS,
    { key: 'neigung', label: 'Dachneigung', group: 'Dach', type: 'choice', default: 'steil', options: PITCH_OPTIONS },
    { key: 'turm', label: 'Turm', group: 'Turm', type: 'choice', default: 'front', options: [
      { value: 'front', label: 'Westturm vor der Fassade' }, { value: 'dachreiter', label: 'Dachreiter auf dem First' }, { value: 'keiner', label: 'Kein Turm (Rosette)' }] },
    { key: 'turmhoehe', label: 'Turmhöhe über der Wand', group: 'Turm', type: 'int', min: 6, max: 30, default: 12, unit: 'Blöcke', when: { key: 'turm', values: ['front'] } },
    { key: 'spitze', label: 'Turmabschluss', group: 'Turm', type: 'choice', default: 'helm', when: { key: 'turm', values: ['front'] }, options: [
      { value: 'helm', label: 'Spitzhelm' }, { value: 'zelt', label: 'Zeltdach' }, { value: 'zinnen', label: 'Zinnen (Wehrkirche)' }] },
    { key: 'glocke', label: 'Glocke', group: 'Turm', type: 'bool', default: true, when: { key: 'turm', values: ['front', 'dachreiter'] } },
    { key: 'chor', label: 'Chor', group: 'Grundriss', type: 'choice', default: 'apsis', options: [
      { value: 'apsis', label: 'Halbrunde Apsis' }, { value: 'rechteck', label: 'Rechteckiger Chor' }, { value: 'gerade', label: 'Gerader Abschluss' }] },
    { key: 'seitenschiffe', label: 'Seitenschiffe mit Arkaden', group: 'Grundriss', type: 'bool', default: false, hint: 'Ab Wandhöhe 8: niedrigere Schiffe unter Pultdächern, Obergaden-Fenster im Langhaus.' },
    { key: 'fensterabstand', label: 'Fensterabstand', group: 'Details', type: 'int', min: 2, max: 6, default: 3, unit: 'Blöcke' },
    { key: 'einrichtung', label: 'Bänke, Altar, Lesepult, Leuchter', group: 'Details', type: 'bool', default: true },
  ],
  presets: [
    { id: 'dorfkirche', label: 'Dorfkirche', values: { breite: 9, laenge: 15, wandhoehe: 6, turm: 'front', turmhoehe: 10, spitze: 'helm', chor: 'apsis', stil: 'mittelalter' } },
    { id: 'kapelle', label: 'Kapelle mit Dachreiter', values: { breite: 7, laenge: 11, wandhoehe: 5, turm: 'dachreiter', chor: 'gerade', stil: 'fachwerk' } },
    { id: 'basilika', label: 'Basilika mit Seitenschiffen', values: { breite: 11, laenge: 27, wandhoehe: 11, turm: 'front', turmhoehe: 18, spitze: 'helm', chor: 'apsis', seitenschiffe: true, verwitterung: 15 } },
    { id: 'wehrkirche', label: 'Wehrkirche', values: { breite: 11, laenge: 19, wandhoehe: 8, turm: 'front', turmhoehe: 10, spitze: 'zinnen', chor: 'rechteck', fensterabstand: 4, verwitterung: 30 } },
    { id: 'stabkirche', label: 'Nordische Holzkirche', values: { breite: 9, laenge: 15, wandhoehe: 6, turm: 'dachreiter', chor: 'rechteck', stil: 'nordisch' } },
    { id: 'tempel', label: 'Antiker Tempel mit Rosette', values: { breite: 13, laenge: 21, wandhoehe: 9, turm: 'keiner', chor: 'apsis', stil: 'antik', neigung: 'flach' } },
    { id: 'kathedrale', label: 'Große Kathedrale', values: { breite: 15, laenge: 37, wandhoehe: 13, turm: 'front', turmhoehe: 26, spitze: 'helm', chor: 'apsis', seitenschiffe: true, fensterabstand: 2 } },
  ],
  build(a) {
    const B = a.int('breite'), Ln = a.int('laenge'), h = a.int('wandhoehe'), towerKind = a.str('turm'), chor = a.str('chor');
    const notes: string[] = [];
    const aisles = a.bool('seitenschiffe') && h >= 8;
    if (a.bool('seitenschiffe') && !aisles) notes.push('Seitenschiffe erst ab Wandhöhe 8 (Platz für Pultdach und Obergaden).');
    const A = aisles ? 3 : 0, ha = h - 5;
    const x0 = aisles ? 4 : 1, x1 = x0 + B - 1, cx = x0 + (B - 1) / 2;
    const rt = B >= 13 ? 3 : 2, tw = 2 * rt + 1, front = towerKind === 'front';
    const zf = front ? tw - 1 : 1, zb = zf + Ln - 1;
    const ra = (B - 1) / 2 - 1, Bc = Math.max(5, B - 4), Dc = Math.max(4, Math.min(9, Math.floor(Ln / 3)));
    const depth = chor === 'apsis' ? zb + ra + 1 : chor === 'rechteck' ? zb + Dc + 2 : zb + 2;
    const width = aisles ? x1 + A + 2 : x1 + 2;
    const p = new Plot([width, 2, depth]), m = new Mason(p, a), s = m.style;
    const pitch = a.str('neigung') as Pitch;
    // Nave: base, walls, air.
    for (let x = x0; x <= x1; x++) for (let z = zf; z <= zb; z++) {
      m.base(x, 0, z);
      const shell = x === x0 || x === x1 || z === zf || z === zb, corner = (x === x0 || x === x1) && (z === zf || z === zb);
      for (let y = 1; y <= h; y++) shell ? (corner ? m.corner(x, y, z) : m.wall(x, y, z)) : p.air(x, y, z);
    }
    const roofZ0 = front ? zf : zf - 1, roofZ1 = chor === 'gerade' ? zb + 1 : zb;
    // Side aisles: outer walls, arcade in the nave walls, lean-to roofs rising toward the nave.
    if (aisles) for (const side of [-1, 1] as const) {
      const xo = side < 0 ? x0 - 3 : x1 + 3, xn = side < 0 ? x0 : x1;
      const lo = Math.min(xo, xn), hi = Math.max(xo, xn);
      for (let x = lo; x <= hi; x++) for (let z = zf; z <= zb; z++) {
        if (x === xn) continue;
        m.base(x, 0, z);
        const shell = x === xo || z === zf || z === zb;
        for (let y = 1; y <= ha; y++) shell ? ((x === xo && (z === zf || z === zb)) ? m.corner(x, y, z) : m.wall(x, y, z)) : p.air(x, y, z);
      }
      for (let z = zf + 1; z < zb; z++) for (let y = 1; y < ha; y++) (z - zf) % 3 === 0 ? m.corner(xn, y, z) : p.air(xn, y, z);
      buildRoof(p, { x0: side < 0 ? xo - 1 : xn + 1, x1: side < 0 ? xn - 1 : xo + 1, z0: roofZ0, z1: roofZ1, y: ha + 1, form: 'pult', pitch: 'flach', ridge: 'z', style: s, flip: side > 0,
        gable: { x0: lo, x1: hi, z0: zf, z1: zb, block: s.wall } });
      const spacing = a.int('fensterabstand');
      for (let z = zf + 2; z <= zb - 2; z += spacing) for (let y = 2; y < ha; y++) p.set(xo, y, z, s.window);
    }
    // Choir.
    if (chor === 'apsis') {
      for (let x = cx - ra - 1; x <= cx + ra + 1; x++) for (let z = zb + 1; z <= zb + ra + 1; z++) {
        const q = (x - cx) ** 2 + (z - zb) ** 2, R = ra * ra + ra * 0.8, inner = (ra - 1) * (ra - 1) + (ra - 1) * 0.8;
        if (q > R || !p.inside(x, 0, z)) continue;
        m.base(x, 0, z);
        for (let y = 1; y < h; y++) q > inner ? m.wall(x, y, z) : p.air(x, y, z);
      }
      for (let x = cx - ra + 1; x <= cx + ra - 1; x++) for (let y = 1; y < h - 1; y++) p.air(x, y, zb);
      halfCone(p, cx, zb, h, ra, s);
      if (h >= 6) for (const [x, z] of [[cx, zb + ra], [cx - ra, zb + 1], [cx + ra, zb + 1]] as const) if (p.inside(x, 3, z)) for (let y = 2; y <= Math.min(h - 3, 5); y++) p.set(x, y, z, s.window);
    } else if (chor === 'rechteck') {
      const c0 = cx - (Bc - 1) / 2, c1 = cx + (Bc - 1) / 2, ze = zb + Dc, hc = h - 1;
      for (let x = c0; x <= c1; x++) for (let z = zb + 1; z <= ze; z++) {
        m.base(x, 0, z);
        const shell = x === c0 || x === c1 || z === ze;
        for (let y = 1; y <= hc; y++) shell ? ((x === c0 || x === c1) && z === ze ? m.corner(x, y, z) : m.wall(x, y, z)) : p.air(x, y, z);
      }
      for (let x = c0 + 1; x <= c1 - 1; x++) for (let y = 1; y < hc; y++) p.air(x, y, zb);
      buildRoof(p, { x0: c0 - 1, x1: c1 + 1, z0: zb + 1, z1: ze + 1, y: hc + 1, form: 'sattel', pitch, ridge: 'z', style: s, gable: { x0: c0, x1: c1, z0: zb, z1: ze, block: s.wall } });
      for (let y = 2; y <= Math.min(hc - 2, 5); y++) p.set(cx, y, ze, s.window);
      for (let z = zb + 2; z < ze; z += 3) for (let y = 2; y <= hc - 2; y++) { p.set(c0, y, z, s.window); p.set(c1, y, z, s.window); }
    }
    // Nave roof and windows (clerestory above the aisle roofs).
    const ridgeTop = buildRoof(p, { x0: x0 - 1, x1: x1 + 1, z0: roofZ0, z1: roofZ1, y: h + 1, form: 'sattel', pitch, ridge: 'z', style: s, gable: { x0, x1, z0: zf, z1: zb, block: s.wall } });
    const spacing = a.int('fensterabstand'), wy0 = aisles ? ha + 3 : 2, wy1 = h - (aisles ? 1 : 2);
    for (let z = zf + 2; z <= zb - 2; z += spacing) for (let y = wy0; y <= wy1; y++) { p.set(x0, y, z, s.window); p.set(x1, y, z, s.window); }
    // Facade: door, step, rose window.
    if (!front) {
      door(p, cx, 1, zf, s.wood, 'south');
      p.set(cx, 3, zf, s.trim.full);
      p.set(cx - 1, 3, zf, s.trim.stairs, stairs('east', 'top')); p.set(cx + 1, 3, zf, s.trim.stairs, stairs('west', 'top'));
      p.set(cx, 0, zf - 1, s.base.stairs, stairs('south'));
      const rr = B >= 13 ? 2 : 1, yc = rr === 2 ? h + 1 : h - 1;
      if (yc - rr > 3) for (let x = cx - rr; x <= cx + rr; x++) for (let y = yc - rr; y <= yc + rr; y++) if ((x - cx) ** 2 + (y - yc) ** 2 <= rr * rr + rr * 0.8) p.set(x, y, zf, s.window);
    }
    // Interior: pews facing the altar, altar with candles, lectern, chandeliers.
    const altarZ = chor === 'apsis' ? zb + Math.max(1, Math.floor(ra / 2)) : chor === 'rechteck' ? zb + Math.floor(Dc / 2) + 1 : zb - 2;
    if (a.bool('einrichtung')) {
      for (let z = zf + 2; z <= zb - (chor === 'gerade' ? 6 : 4); z += 2) for (let x = x0 + 1; x <= x1 - 1; x++) if (Math.abs(x - cx) > (B >= 13 ? 1 : 0)) p.set(x, 1, z, `${s.wood}_stairs`, stairs('north'));
      for (let x = cx - 1; x <= cx + 1; x++) p.set(x, 1, altarZ, s.trim.full);
      p.set(cx - 1, 2, altarZ, 'candle', candle(3, true)); p.set(cx + 1, 2, altarZ, 'candle', candle(3, true));
      p.set(cx, 2, altarZ, s.light, lantern());
      p.set(cx + 2 <= x1 - 1 ? cx + 2 : cx, 1, Math.min(zb - 2, altarZ - 2), 'lectern', lectern('north'));
      for (let z = zf + 2; z <= zb - 2; z += 4) {
        let y = h + 1;
        while (y < ridgeTop && !p.has(cx, y, z)) y++;
        for (let yy = h + 1; yy < y; yy++) p.set(cx, yy, z, 'chain', chain('y'));
        p.set(cx, h, z, s.light, lantern(true));
      }
    }
    // Tower or ridge turret.
    let peak = ridgeTop;
    if (front) {
      const Ht = h + a.int('turmhoehe'), tx0 = cx - rt, tx1 = cx + rt, czt = rt;
      if (Ht - 3 <= ridgeTop) notes.push('Der Turm ist kaum höher als der Dachfirst: Schallöffnung nach Süden entfällt.');
      for (let x = tx0; x <= tx1; x++) for (let z = 0; z <= zf; z++) {
        m.base(x, 0, z);
        const shell = x === tx0 || x === tx1 || z === 0 || z === zf, corner = (x === tx0 || x === tx1) && (z === 0 || z === zf);
        for (let y = 1; y <= Ht; y++) {
          if (shell) corner || (y === h + 1) ? m.corner(x, y, z) : m.wall(x, y, z);
          else if (y === Ht || (y === h + 1 && Ht - h > 6)) p.set(x, y, z, s.floor);
          else p.air(x, y, z);
        }
      }
      for (let y = 1; y < Ht; y++) p.set(tx1 - 1, y, czt, 'ladder', ladder('west'));
      if (a.str('spitze') === 'zinnen') p.set(tx1 - 1, Ht, czt, 'ladder', ladder('west'));
      door(p, cx, 1, 0, s.wood, 'south');
      p.air(cx, 1, zf); p.air(cx, 2, zf);
      for (let y = 3; y <= Math.min(h - 2, 5); y++) p.set(cx, y + 1, 0, s.window);
      // Belfry: sound openings near the top.
      const faces: [number, number, H][] = [[cx, 0, 'north'], [tx0, czt, 'west'], [tx1, czt, 'east']];
      if (Ht - 3 > ridgeTop) faces.push([cx, zf, 'south']);
      const ow = rt >= 3 ? 1 : 0;
      for (const [fx, fz, f] of faces) for (let o = -ow; o <= ow; o++) for (let y = Ht - 3; y <= Ht - 1; y++) {
        const [x, z] = f === 'north' || f === 'south' ? [fx + o, fz] : [fx, fz + o];
        p.air(x, y, z);
        if (y === Ht - 3) p.set(x, y, z, s.trim.slab, { type: 'bottom', waterlogged: 'false' });
      }
      if (a.bool('glocke')) p.set(cx, Ht - 1, czt, 'bell', bell('north', 'ceiling'));
      const kind = a.str('spitze');
      if (kind === 'helm') peak = spire(p, cx, czt, Ht + 1, rt, s);
      else if (kind === 'zelt') peak = buildRoof(p, { x0: tx0, x1: tx1, z0: 0, z1: zf, y: Ht + 1, form: 'walm', pitch: 'steil', ridge: 'z', style: s });
      else { for (let x = tx0; x <= tx1; x++) for (let z = 0; z <= zf; z++) if ((x === tx0 || x === tx1 || z === 0 || z === zf) && ((x + z) % 2 === 0 || ((x === tx0 || x === tx1) && (z === 0 || z === zf)))) m.wall(x, Ht + 1, z); peak = Ht + 1; }
      if (kind !== 'zinnen') { p.set(cx, peak + 1, czt, 'lightning_rod', rod('up')); peak++; }
    } else if (towerKind === 'dachreiter') {
      const zr = zf + 2;
      let yb = ridgeTop + 1;
      while (yb > h + 1 && !p.has(cx, yb - 1, zr)) yb--;
      for (let x = cx - 1; x <= cx + 1; x++) for (let z = zr - 1; z <= zr + 1; z++) {
        p.set(x, yb, z, s.roof.full);
        for (let y = yb - 1; y > h && !p.has(x, y, z); y--) p.set(x, y, z, s.roof.full);
      }
      for (const [x, z] of [[cx - 1, zr - 1], [cx + 1, zr - 1], [cx - 1, zr + 1], [cx + 1, zr + 1]] as const) for (let y = yb + 1; y <= yb + 3; y++) m.put(x, y, z, s.beam);
      for (let x = cx - 1; x <= cx + 1; x++) for (let z = zr - 1; z <= zr + 1; z++) if (x === cx || z === zr) for (let y = yb + 1; y <= yb + 3; y++) p.air(x, y, z);
      const capTop = buildRoof(p, { x0: cx - 1, x1: cx + 1, z0: zr - 1, z1: zr + 1, y: yb + 4, form: 'walm', pitch: 'steil', ridge: 'z', style: s });
      if (a.bool('glocke')) p.set(cx, yb + 3, zr, 'bell', bell('north', 'ceiling'));
      p.set(cx, capTop + 1, zr, 'lightning_rod', rod('up'));
      peak = Math.max(peak, capTop + 1);
    }
    if (towerKind === 'keiner') notes.push('Ohne Turm: Rosette in der Giebelfassade (ab Wandhöhe 5).');
    notes.push(`Eingang im Norden; ${chor === 'apsis' ? 'Apsis' : chor === 'rechteck' ? 'Chor' : 'Altar'} im Süden. Höchster Punkt ${peak + 1} Blöcke.`);
    const towerLabel = front ? 'mit Turm' : towerKind === 'dachreiter' ? 'mit Dachreiter' : 'mit Rosette';
    return {
      payload: m.payload(), connectors: [],
      name: `Kirche ${B} × ${Ln} ${towerLabel} (${s.short})`,
      description: `Generierte Kirche: Langhaus ${B} × ${Ln}, Wandhöhe ${h}${aisles ? ', drei Schiffe' : ''}, ${chor === 'apsis' ? 'Apsis' : chor === 'rechteck' ? 'Rechteckchor' : 'gerader Chorabschluss'}, ${towerLabel}.`,
      facets: { kategorie: ['sakral'], stil: [...s.stil], biom: [...s.biom], funktion: ['versammlung', 'orientierung'] },
      notes,
    };
  },
};

/** Half cone over an apse: rings of stairs rising toward (cx, cz), only south of the nave wall. */
function halfCone(p: Plot, cx: number, cz: number, h: number, r: number, style: Style): void {
  for (let rr = r, layer = 0; rr >= 1; rr--, layer++) {
    const R = rr * rr + rr * 0.8, inner = (rr - 1) * (rr - 1) + (rr - 1) * 0.8, y = h + layer;
    for (let x = cx - rr - 1; x <= cx + rr + 1; x++) for (let z = cz + 1; z <= cz + rr + 1; z++) {
      const q = (x - cx) ** 2 + (z - cz) ** 2;
      if (q > R || (rr > 1 && q <= inner) || !p.inside(x, y, z)) continue;
      const dx = cx - x, dz = cz - z;
      const up: H = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : 'north';
      p.set(x, y, z, style.roof.stairs, stairs(up));
      if (layer > 0 && !p.has(x, y - 1, z)) p.set(x, y - 1, z, style.roof.full);
    }
  }
}

/** Steep pyramid spire: each ring two layers high, the upper one stairs; returns the top layer. */
function spire(p: Plot, cx: number, cz: number, y0: number, r: number, style: Style): number {
  let y = y0;
  for (let k = r; k >= 1; k--) for (let j = 0; j < 2; j++, y++) for (let x = cx - k; x <= cx + k; x++) for (let z = cz - k; z <= cz + k; z++) {
    if (Math.max(Math.abs(x - cx), Math.abs(z - cz)) !== k) continue;
    if (j === 0) { p.set(x, y, z, style.roof.full); continue; }
    const dx = cx - x, dz = cz - z;
    const up: H = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north');
    p.set(x, y, z, style.roof.stairs, stairs(up));
  }
  p.set(cx, y, cz, style.roof.full); p.set(cx, y + 1, cz, style.roof.full);
  return y + 1;
}
