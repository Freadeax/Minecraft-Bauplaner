import { chain, door, lantern, Plot, slab, stairs } from '../build/plot.js';
import type { H } from '../build/plot.js';
import { buildRoof, ROOF_OPTIONS } from './roofs.js';
import type { RoofForm } from './roofs.js';
import { Mason, styleParam, WEATHER_PARAMS } from './types.js';
import type { Generator } from './types.js';

/**
 * Treppenhaus (GEN-02): square stair tower whose stairs wind clockwise
 * around a core, one full turn per storey. Every storey uses the same ring
 * positions, so all doors sit above each other in the north face at the
 * floor heights of the house generator (k × (Geschosshöhe + 1)); the
 * stairwell docks onto a house of the same storey height.
 *
 * Walkability by construction: one block rise per step at most, landings and
 * flat steps at the same height as the step before, two free blocks above
 * every step (the next turn is a whole storey higher).
 */
export const STAIRWELL_GENERATOR: Generator = {
  id: 'treppenhaus', name: 'Treppenhaus', version: 3,
  description: 'Treppenturm mit Wendeltreppe um Pfeiler, offenes Treppenauge oder Lichtschacht; Türen je Geschoss übereinander, passend zur Geschosshöhe des Hauses.',
  params: [
    { key: 'breite', label: 'Außenmaß', group: 'Maße', type: 'int', min: 5, max: 11, default: 7, unit: 'Blöcke', hint: 'Quadratischer Grundriss; innen 2 Blöcke weniger.' },
    { key: 'geschosse', label: 'Geschosse', group: 'Maße', type: 'int', min: 2, max: 10, default: 3, hint: 'Erdgeschoss mitgezählt; je Geschoss eine Tür.' },
    { key: 'geschoss', label: 'Geschosshöhe', group: 'Maße', type: 'int', min: 3, max: 6, default: 4, unit: 'Blöcke', hint: 'Wie beim Haus: lichte Höhe, Geschossabstand = Höhe + 1.' },
    styleParam('mittelalter'), ...WEATHER_PARAMS,
    { key: 'kern', label: 'Treppenkern', group: 'Treppe', type: 'choice', default: 'pfeiler', options: [
      { value: 'pfeiler', label: 'Spindel (massiver Pfeiler)' }, { value: 'auge', label: 'Offenes Treppenauge mit Geländer' }, { value: 'lichtschacht', label: 'Verglaster Lichtschacht' }],
      hint: 'Bei Außenmaß 5 immer Spindel.' },
    { key: 'unterbau', label: 'Stufen untermauert', group: 'Treppe', type: 'bool', default: true, hint: 'Ein Block unter jeder Stufe: wirkt wie eine gemauerte Wendel.' },
    { key: 'dach', label: 'Dach', group: 'Dach', type: 'choice', default: 'stil', options: [{ value: 'stil', label: 'Passend zum Stil' }, ...ROOF_OPTIONS] },
    { key: 'fenster', label: 'Fenster je Geschoss', group: 'Details', type: 'bool', default: true },
    { key: 'balkone', label: 'Austritt vor den oberen Türen', group: 'Details', type: 'bool', default: false, hint: 'Kleiner Balkon mit Geländer, wenn das Treppenhaus frei steht.' },
    { key: 'licht', label: 'Laternen', group: 'Details', type: 'bool', default: true },
  ],
  presets: [
    { id: 'anbau', label: 'Anbau für ein Haus (Geschoss 4)', values: { breite: 5, geschosse: 3, geschoss: 4, stil: 'fachwerk', dach: 'walm' } },
    { id: 'burgtreppe', label: 'Burgtreppe mit Spindel', values: { breite: 7, geschosse: 5, geschoss: 4, stil: 'mittelalter', kern: 'pfeiler', verwitterung: 20, dach: 'walm' } },
    { id: 'treppenauge', label: 'Stadthaus-Treppenauge', values: { breite: 9, geschosse: 4, geschoss: 4, stil: 'antik', kern: 'auge', unterbau: false, dach: 'walm' } },
    { id: 'lichtschacht', label: 'Moderner Treppenturm', values: { breite: 9, geschosse: 6, geschoss: 4, stil: 'modern', kern: 'lichtschacht', dach: 'flach', balkone: true } },
    { id: 'aussichtsturm', label: 'Nordischer Aussichtsturm', values: { breite: 7, geschosse: 4, geschoss: 5, stil: 'nordisch', dach: 'walm', balkone: true } },
    { id: 'netherstiege', label: 'Netherstiege', values: { breite: 7, geschosse: 6, geschoss: 3, stil: 'nether', kern: 'pfeiler', dach: 'flach', verwitterung: 25 } },
  ],
  build(a) {
    const W = a.int('breite'), F = a.int('geschosse'), fh = a.int('geschoss'), R = fh + 1, balcony = a.bool('balkone');
    const n = W - 2, core = n - 2, kern = core <= 1 ? 'pfeiler' : a.str('kern');
    const oz = balcony ? 2 : 0, x0 = 0, x1 = W - 1, z0 = oz, z1 = oz + W - 1, c = Math.floor(W / 2);
    const p = new Plot([W, 2, z1 + 1]), m = new Mason(p, a), s = m.style, notes: string[] = [];
    if (core <= 1 && a.str('kern') !== 'pfeiler') notes.push('Außenmaß 5: Platz nur für eine Spindel.');
    const ceiling = (F - 1) * R + R; // layer of the top ceiling
    // Ring of steps clockwise (north side eastwards), starting at the landing in front of the doors.
    const ring: [number, number][] = [];
    const r0 = 1, r1 = W - 2;
    for (let x = r0; x <= r1; x++) ring.push([x, z0 + r0]);
    for (let z = r0 + 1; z <= r1; z++) ring.push([r1, z0 + z]);
    for (let x = r1 - 1; x >= r0; x--) ring.push([x, z0 + r1]);
    for (let z = r1 - 1; z > r0; z--) ring.push([r0, z0 + z]);
    const start = ring.findIndex(([x, z]) => x === c && z === z0 + r0);
    const path = [...ring.slice(start), ...ring.slice(0, start)], L = path.length;
    const dirTo = (i: number): H => {
      const [ax, az] = path[i]!, [bx, bz] = path[(i + 1) % L]!;
      return bx > ax ? 'east' : bx < ax ? 'west' : bz > az ? 'south' : 'north';
    };
    // Shell, base, ceiling.
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      m.base(x, 0, z);
      const shell = x === x0 || x === x1 || z === z0 || z === z1, corner = (x === x0 || x === x1) && (z === z0 || z === z1);
      for (let y = 1; y < ceiling; y++) {
        if (shell) corner || y % R === 0 ? m.corner(x, y, z) : m.wall(x, y, z);
        else p.air(x, y, z);
      }
      if (shell) m.corner(x, ceiling, z); else p.set(x, ceiling, z, s.floor);
    }
    // Core.
    const k0 = 2, k1 = W - 3;
    for (let y = 1; y < ceiling; y++) for (let x = k0; x <= k1; x++) for (let z = z0 + k0; z <= z0 + k1; z++) {
      const rim = x === k0 || x === k1 || z === z0 + k0 || z === z0 + k1;
      if (kern === 'pfeiler') m.put(x, y, z, core === 1 ? s.corner : s.trim.full);
      else if (kern === 'lichtschacht') { if (rim) (x === k0 || x === k1) && (z === z0 + k0 || z === z0 + k1) ? m.corner(x, y, z) : p.set(x, y, z, s.window); }
    }
    if (kern === 'lichtschacht') for (let y = 1; y < ceiling; y++) for (let x = k0 + 1; x < k1; x++) for (let z = z0 + k0 + 1; z < z0 + k1; z++) p.air(x, y, z);
    // Steps: per storey R rises right after the landing, the rest of the turn is flat.
    const heightAt: number[][] = []; // [storey][position] → block layer under the walker
    for (let k = 0; k < F - 1; k++) {
      const Y = k * R, row: number[] = [];
      for (let i = 0; i < L; i++) {
        const rise = Math.min(i, R), y = Y + rise, [x, z] = path[i]!;
        row.push(y);
        if (i === 0 && k === 0) continue; // ground floor is the base
        if (i === 0) { p.set(x, y, z, s.floor); continue; }
        if (i <= R) {
          p.set(x, y, z, s.trim.stairs, stairs(dirTo(i - 1)));
          if (a.bool('unterbau') && y - 1 > Y) m.put(x, y - 1, z, s.trim.full);
        } else p.set(x, y, z, s.floor);
      }
      heightAt.push(row);
    }
    // Top landing: the last turn ends at the top floor; its flat part is the landing there.
    const top = (F - 1) * R;
    // Railing of the open well: fences on the core rim, following the steps beside them.
    if (kern === 'auge') {
      for (let k = 0; k < F - 1; k++) for (let i = 0; i < L; i++) {
        const [x, z] = path[i]!, y = heightAt[k]![i]!;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const fx = x + dx, fz = z + dz;
          if (fx < k0 || fx > k1 || fz < z0 + k0 || fz > z0 + k1) continue;
          if (fx > k0 && fx < k1 && fz > z0 + k0 && fz < z0 + k1) continue;
          if (!p.get(fx, y + 1, fz)) p.set(fx, y + 1, fz, `${s.wood}_fence`);
        }
      }
      for (let y = 1; y < ceiling; y++) for (let x = k0; x <= k1; x++) for (let z = z0 + k0; z <= z0 + k1; z++) if (!p.has(x, y, z)) p.air(x, y, z);
      // Hanging light in the well.
      if (a.bool('licht')) { const cx = Math.floor((k0 + k1) / 2), cz = z0 + Math.floor((k0 + k1) / 2); for (let y = ceiling - 1; y > ceiling - 3; y--) p.set(cx, y, cz, 'iron_chain', chain('y')); p.set(cx, ceiling - 3, cz, s.light, lantern(true)); }
    }
    if (kern === 'lichtschacht' && a.bool('licht')) {
      const cx = Math.floor((k0 + k1) / 2), cz = z0 + Math.floor((k0 + k1) / 2);
      for (let y = 1; y < ceiling - 1; y++) p.set(cx, y, cz, 'iron_chain', chain('y'));
      for (let k = 0; k < F; k++) if (k * R + 2 < ceiling - 1) p.set(cx, k * R + 2, cz, s.light, lantern(true));
    }
    // Doors in the north face above each other, one per storey; landings inside.
    for (let k = 0; k < F; k++) {
      const Y = k * R;
      if (k > 0) p.set(c, Y, z0 + 1, s.floor);
      door(p, c, Y + 1, z0, s.wood, 'south');
      if (balcony && k > 0) {
        for (let x = c - 1; x <= c + 1; x++) for (let z = z0 - 2; z < z0; z++) p.set(x, Y, z, s.trim.slab, slab('top'));
        for (let x = c - 1; x <= c + 1; x++) p.set(x, Y + 1, z0 - 2, `${s.wood}_fence`);
        for (const x of [c - 1, c + 1]) p.set(x, Y + 1, z0 - 1, `${s.wood}_fence`);
      }
      if (a.bool('licht') && kern === 'pfeiler' && k < F - 1) p.set(c, Y + fh, z0 + 1, s.light, lantern(true));
    }
    if (balcony && F > 1) notes.push('Austritte vor den oberen Türen: Treppenhaus steht frei. Zum Anbauen an ein Haus ohne Austritte erzeugen.');
    if (z0 > 0) p.set(c, 0, z0 - 1, s.base.stairs, stairs('south'));
    // Windows on the east, south and west faces, one per storey in the middle of the face.
    if (a.bool('fenster')) for (let k = 0; k < F; k++) {
      const Y = k * R, ys = fh >= 4 ? [Y + 2, Y + 3] : [Y + 2];
      for (const y of ys) { p.set(x1, y, z0 + c, s.window); p.set(x0, y, z0 + c, s.window); p.set(c, y, z1, s.window); }
    }
    // Light on the top landing.
    if (a.bool('licht')) p.set(c, ceiling - 1, z0 + 1, s.light, lantern(true));
    // Roof.
    const choice = a.str('dach'), form: RoofForm = choice === 'stil' ? (s.flat ? 'flach' : 'walm') : choice as RoofForm;
    buildRoof(p, { x0, x1, z0, z1, y: ceiling + 1, form, pitch: 'steil', ridge: 'z', style: s, gable: { x0, x1, z0, z1, block: s.wall }, parapet: true });
    notes.push(`Türen nach Norden auf den Geschosshöhen 1, ${Array.from({ length: Math.min(F, 4) - 1 }, (_, k) => (k + 1) * R + 1).join(', ')}${F > 4 ? ' …' : ''}: passt an ein Haus mit Geschosshöhe ${fh}.`);
    notes.push(`Eine Umdrehung je Geschoss: ${R} Stufen und ${L - R - 1} ebene Schritte.`);
    const coreLabel = { pfeiler: 'Spindel', auge: 'Treppenauge', lichtschacht: 'Lichtschacht' }[kern]!;
    return {
      payload: m.payload(), connectors: [],
      name: `Treppenhaus ${W} × ${W}, ${F} Geschosse (${s.short})`,
      description: `Generiertes Treppenhaus ${W} × ${W} mit Wendeltreppe (${coreLabel}), ${F} Geschosse à ${fh} Blöcke, Höhe ${top} bis zum obersten Boden.`,
      facets: { kategorie: ['infrastruktur'], stil: [...s.stil], biom: [...s.biom], funktion: ['verbindung', 'aussicht'] },
      notes,
    };
  },
};
