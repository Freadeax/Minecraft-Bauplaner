import { chest, ladder, lantern, Plot, slab, stairs, trapdoor } from '../build/plot.js';
import type { H } from '../build/plot.js';
import { wallBanner } from '../build/furnish.js';
import { joint } from '../build/spec.js';
import type { Connector } from '../../core/types.js';
import { Mason, pathProfile, styleParam, WEATHER_PARAMS } from './types.js';
import type { Generator } from './types.js';
import { stableAtan2, stableCos, stableHypot, stableSin } from '../../../../voxel/src/stableMath.js';

/**
 * Arena (GEN-03): oval amphitheatre after the classic Roman model. Outer ring
 * of arched façade storeys around a vaulted ambulatory, an inner ring wall,
 * two bands of seating on hollow vaults, a podium wall and a sand arena;
 * optionally the hypogeum below (corridors, chambers, cells, lifts) and the
 * velarium (sun sails on masts). The preset „Kolosseum“ follows Philipp's
 * plan: 81 × 61 blocks, four storeys of eight, arena 41 × 21, eight rows,
 * four gates, hypogeum nine blocks deep.
 *
 * Geometry is organised by *depth*: the number of nested offset ellipses
 * (a−k, b−k) a column lies inside. Depth 0 is the façade shell, 1–3 the
 * ambulatory, 4 the inner wall, then the upper rows, the walkway, the lower
 * rows, the podium and the arena. Along the perimeter, bays of ~7 blocks
 * (2 pillar + 5 opening) are laid out by arc length so pillars stay evenly
 * spaced on the oval.
 */

const HYPO = 9;
const GAL = 3; // ambulatory width
const PITCH = 7; // bay pitch along the perimeter

const dom = (dx: number, dz: number): H => Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? 'east' : 'west') : (dz >= 0 ? 'south' : 'north');

export const ARENA_GENERATOR: Generator = {
  id: 'arena', name: 'Arena', version: 1,
  description: 'Ovales Amphitheater mit Rundbogenfassade über mehrere Etagen, Wandelgang mit Treppen, zwei Rängen auf Gewölben, Podiumsmauer, Sandarena und Toren; auf Wunsch Hypogäum unter der Arena und Sonnensegel. Vorlage „Kolosseum“ 81 × 61.',
  params: [
    { key: 'laenge', label: 'Halbe Länge (Ost–West)', group: 'Maße', type: 'int', min: 14, max: 60, default: 40, unit: 'Blöcke', hint: 'Gesamtlänge = 2 × Wert + 1.' },
    { key: 'breite', label: 'Halbe Breite (Nord–Süd)', group: 'Maße', type: 'int', min: 16, max: 50, default: 30, unit: 'Blöcke', hint: 'Höchstens die halbe Länge; größere Werte werden getauscht.' },
    { key: 'etagen', label: 'Etagen der Fassade', group: 'Maße', type: 'int', min: 1, max: 4, default: 4 },
    { key: 'etagenhoehe', label: 'Etagenhöhe', group: 'Maße', type: 'int', min: 7, max: 10, default: 8, unit: 'Blöcke', hint: 'Bogenhöhe = Etagenhöhe − 2.' },
    { key: 'sitzreihen', label: 'Sitzreihen unterer Rang', group: 'Ränge', type: 'int', min: 4, max: 12, default: 8 },
    { key: 'oberrang', label: 'Sitzreihen oberer Rang', group: 'Ränge', type: 'int', min: 0, max: 8, default: 4, hint: '0 = nur ein Rang.' },
    { key: 'tore', label: 'Tore', group: 'Arena', type: 'choice', default: 'vier', options: [{ value: 'zwei', label: 'Zwei (Ost und West)' }, { value: 'vier', label: 'Vier (alle Seiten)' }] },
    { key: 'hypogaeum', label: 'Hypogäum unter der Arena', group: 'Arena', type: 'bool', default: true, hint: 'Gänge, Kammern, Zellen und Aufzugsschächte, 9 Blöcke unter dem Boden; muss im Spiel ausgehoben werden.' },
    { key: 'segel', label: 'Sonnensegel (Velarium)', group: 'Details', type: 'bool', default: true },
    { key: 'banner', label: 'Banner und Laternen an den Toren', group: 'Details', type: 'bool', default: true },
    styleParam('antik'), ...WEATHER_PARAMS,
  ],
  presets: [
    { id: 'kolosseum', label: 'Kolosseum (81 × 61, vier Etagen)', values: { laenge: 40, breite: 30, etagen: 4, etagenhoehe: 8, sitzreihen: 8, oberrang: 4, tore: 'vier', hypogaeum: true, segel: true, stil: 'wueste', verwitterung: 10 } },
    { id: 'kolosseum_marmor', label: 'Kolosseum aus Marmor (Quarz)', values: { laenge: 40, breite: 30, etagen: 4, etagenhoehe: 8, sitzreihen: 8, oberrang: 4, stil: 'antik' } },
    { id: 'provinz', label: 'Provinzarena', values: { laenge: 26, breite: 20, etagen: 2, etagenhoehe: 7, sitzreihen: 6, oberrang: 0, tore: 'zwei', hypogaeum: false, segel: false, stil: 'mittelalter', verwitterung: 20 } },
    { id: 'kampfplatz', label: 'Kleiner Kampfplatz', values: { laenge: 20, breite: 16, etagen: 1, etagenhoehe: 7, sitzreihen: 4, oberrang: 0, tore: 'zwei', hypogaeum: false, segel: false, stil: 'nordisch' } },
    { id: 'ruine', label: 'Verfallene Arena', values: { laenge: 32, breite: 24, etagen: 3, etagenhoehe: 8, sitzreihen: 7, oberrang: 3, hypogaeum: true, segel: false, banner: false, stil: 'mittelalter', verwitterung: 45 } },
    { id: 'nether', label: 'Nether-Arena', values: { laenge: 22, breite: 17, etagen: 2, etagenhoehe: 8, sitzreihen: 5, oberrang: 0, hypogaeum: false, segel: false, stil: 'nether' } },
  ],
  build(a) {
    const notes: string[] = [];
    let A = a.int('laenge'), B = a.int('breite');
    if (B > A) { [A, B] = [B, A]; notes.push(`Halbe Breite war größer als die halbe Länge: Maße getauscht (${A} × ${B}).`); }
    const etagen = a.int('etagen'), fh = a.int('etagenhoehe');
    let rows = a.int('sitzreihen'), upper = a.int('oberrang');
    const hypo = a.bool('hypogaeum') ? HYPO : 0, fourGates = a.str('tore') === 'vier', deko = a.bool('banner');
    const G = hypo, H = G + etagen * fh;
    // Depth budget: façade (1) + ambulatory (3) + wall (1) + walkway (2) + podium (1) + arena half-width ≥ 4 leaves B − 12 for the rows.
    const budget = B - 12;
    if (rows + upper > budget) {
      const u0 = upper, r0 = rows;
      upper = Math.max(0, Math.min(upper, budget - 4));
      rows = Math.max(4, budget - upper);
      notes.push(`Zu wenig Platz für ${r0} + ${u0} Sitzreihen bei halber Breite ${B}: ${rows} + ${upper} Reihen.`);
    }
    // Height budget: the walkway must stay two below the roof; the upper band ends on a storey floor.
    if (rows > etagen * fh - 3) { notes.push(`Fassade zu niedrig für ${rows} Sitzreihen: ${etagen * fh - 3}.`); rows = etagen * fh - 3; }
    const yW = G + 1 + rows;               // walkway top block
    const storeyFor = (need: number) => { let k = 1; while (G + k * fh < need && k < etagen) k++; return k; };
    let kStar = storeyFor(yW + 2 + upper);
    if (upper > 0 && G + kStar * fh - upper < yW + 2) { notes.push(`Kein Platz für den oberen Rang (${upper} Reihen) unter der Fassade: nur ein Rang.`); upper = 0; kStar = storeyFor(yW + 2); }
    const W = 2 * A + 1, D = 2 * B + 1, cx = A, cz = B;
    const p = new Plot([W, H + 4, D]), m = new Mason(p, a), s = m.style;

    // ---- depth by nested offset ellipses, arc length by angle
    const inEll = (x: number, z: number, ea: number, eb: number) => ((x - cx) / (ea + 0.5)) ** 2 + ((z - cz) / (eb + 0.5)) ** 2 <= 1;
    const depth = new Int16Array(W * D).fill(-1);
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
      if (!inEll(x, z, A, B)) continue;
      let d = 0;
      while (d < B && inEll(x, z, A - d - 1, B - d - 1)) d++;
      depth[x + W * z] = d;
    }
    const dep = (x: number, z: number) => (x < 0 || z < 0 || x >= W || z >= D) ? -1 : depth[x + W * z]!;
    const N = 4096, arc = new Float64Array(N + 1);
    for (let i = 1; i <= N; i++) {
      const t0 = (i - 1) / N * 2 * Math.PI, t1 = i / N * 2 * Math.PI;
      arc[i] = arc[i - 1]! + stableHypot(A * (stableCos(t1) - stableCos(t0)), B * (stableSin(t1) - stableSin(t0)));
    }
    const perimeter = arc[N]!;
    const theta = (x: number, z: number) => { const t = stableAtan2((z - cz) / B, (x - cx) / A); return t < 0 ? t + 2 * Math.PI : t; };
    const arcAt = (t: number) => { const f = t / (2 * Math.PI) * N, i = Math.min(N - 1, Math.floor(f)); return arc[i]! + (arc[i + 1]! - arc[i]!) * (f - i); };
    const nB = Math.max(8, Math.round(perimeter / PITCH)), pitch = perimeter / nB;
    /** Bay index and position within the bay (0 ≤ c < pitch); bay 0 is centred on the east axis. */
    const bay = (x: number, z: number) => {
      const t = theta(x, z), q = arcAt(t) / pitch + 0.5, i = Math.floor(q);
      return { i: ((i % nB) + nB) % nB, c: (q - i) * pitch, t };
    };
    const tangent = (t: number, toPillar: boolean, c: number): H => {
      const sgn = (c < pitch / 2) === toPillar ? -1 : 1;
      return dom(sgn * -A * stableSin(t), sgn * B * stableCos(t));
    };
    const gateAngles = fourGates ? [0, Math.PI / 2, Math.PI, 1.5 * Math.PI] : [0, Math.PI];
    const gateBays = new Set(gateAngles.map(t => Math.floor(arcAt(t) / pitch + 0.5) % nB));

    // ---- layout constants
    const DWALL = GAL + 1;                 // inner ring wall
    const DU0 = DWALL + 1;                 // outermost upper row
    const DWALK = DU0 + upper;             // walkway: DWALK, DWALK + 1
    const DL0 = DWALK + 2;                 // outermost lower row
    const DLIN = DL0 + rows - 1;           // innermost lower row
    const DPOD = DLIN + 1, DA = DPOD + 1;  // podium wall, arena
    const yTop4 = G + kStar * fh;          // top of the inner wall = a storey floor
    const yU0 = yTop4 - upper;             // support under the innermost upper row
    const floorAt = (y: number) => y > G && (y - G) % fh === 0 && y <= H;

    /** Top block of the seating shell at a column, or −1 outside the seating bands. */
    const seatTop = (d: number): number => {
      if (d >= DU0 && d < DWALK) return yU0 + (DWALK - d);
      if (d === DWALK || d === DWALK + 1) return yW;
      if (d >= DL0 && d <= DLIN) return G + 1 + (DLIN - d + 1);
      return -1;
    };
    const isStairRow = (d: number) => (d >= DU0 && d < DWALK) || (d >= DL0 && d <= DLIN);

    // ---- ground slab and arena
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
      const d = dep(x, z);
      if (d < 0) continue;
      m.base(x, G, z);
      if (d >= DA) p.set(x, G + 1, z, 'sand');
    }

    // ---- façade shell (depth 0), storeys of arched bays
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
      if (dep(x, z) !== 0) continue;
      const { i, c, t } = bay(x, z);
      const pillar = c < 1 || c >= pitch - 1, edge = (c >= 1 && c < 2) || (c >= pitch - 2 && c < pitch - 1), inner = (c >= 2 && c < 3) || (c >= pitch - 3 && c < pitch - 2);
      const toPillar = tangent(t, true, c), inward = dom(cx - x, cz - z);
      for (let k = 0; k < etagen; k++) {
        const y0 = G + k * fh + 1, top = k === etagen - 1 && etagen >= 3;
        for (let y = y0; y < y0 + fh; y++) {
          const r = y - y0;
          if (r === fh - 1) { m.put(x, y, z, k === etagen - 1 ? s.trim.full : s.wall); continue; }        // floor band / cornice course
          if (pillar) { m.corner(x, y, z); continue; }
          if (top) {
            // Attic: pilasters, rectangular windows between a sill and a lintel.
            if (edge) m.wall(x, y, z);
            else if (r === 0 || r >= fh - 3) m.wall(x, y, z);
            else p.air(x, y, z);
            continue;
          }
          if (r <= fh - 4) p.air(x, y, z);
          else if (r === fh - 3) { if (edge) p.set(x, y, z, s.trim.stairs, stairs(toPillar, 'top')); else p.air(x, y, z); }
          else if (inner) p.set(x, y, z, s.trim.stairs, stairs(toPillar, 'top'));
          else m.wall(x, y, z);
        }
      }
      // Cornice: upside-down stairs with the step outward; masts for the velarium on every second pillar.
      p.set(x, H, z, s.trim.stairs, stairs(inward, 'top'));
      if (pillar && c < 1 && i % 2 === 0) {
        for (let y = H + 1; y <= H + 3; y++) p.set(x, y, z, `${s.wood}_fence`, { east: 'false', north: 'false', south: 'false', waterlogged: 'false', west: 'false' });
      }
    }

    // ---- ambulatory floors, roof, inner wall, seating shell
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
      const d = dep(x, z);
      if (d < 1 || d >= DA) continue;
      const { i, c, t } = bay(x, z);
      if (d <= GAL) {
        for (let k = 1; k < etagen; k++) p.set(x, G + k * fh, z, s.floor);
        m.base(x, H, z);
        if (a.bool('segel')) p.set(x, H + 3, z, i % 2 ? 'red_wool' : 'white_wool');
        // Lanterns under every storey ceiling in the middle of every third bay.
        if (d === 2 && i % 3 === 1 && c >= pitch / 2 - 0.5 && c < pitch / 2 + 0.5) for (let k = 1; k <= etagen; k++) p.set(x, G + k * fh - 1, z, s.light, lantern(true));
        continue;
      }
      if (d === DWALL) {
        const pillar = c < 1;
        for (let y = G + 1; y <= yTop4; y++) m.wall(x, y, z);
        for (let y = yTop4 + 1; y < H; y++) {
          if (floorAt(y)) m.wall(x, y, z);
          else if (pillar) m.corner(x, y, z);
          else if (floorAt(y - 1) && y - 1 > yTop4) { if (s.trim.wall) p.set(x, y, z, s.trim.wall, { east: 'none', north: 'none', south: 'none', up: 'true', waterlogged: 'false', west: 'none' }); else p.set(x, y, z, s.trim.slab, slab()); }
        }
        m.base(x, H, z);
        if (a.bool('segel')) p.set(x, H + 3, z, i % 2 ? 'red_wool' : 'white_wool');
        // Doorways from the ambulatory into the vaults under the seating (every second bay, not at the gates).
        if (i % 2 === 1 && !gateBays.has(i) && c >= 2 && c < pitch - 2) {
          for (let y = G + 1; y <= G + 2; y++) p.air(x, y, z);
          if ((c >= 2 && c < 3) || (c >= pitch - 3 && c < pitch - 2)) p.set(x, G + 3, z, s.trim.stairs, stairs(tangent(t, true, c), 'top')); else p.air(x, G + 3, z);
        }
        continue;
      }
      if (d === DPOD) { for (let y = G + 1; y <= G + 3; y++) m.put(x, y, z, s.trim.full); continue; }
      const top = seatTop(d);
      if (top < 0) continue;
      const outward = dom(x - cx, z - cz);
      if (isStairRow(d)) p.set(x, top, z, s.base.stairs, stairs(outward)); else m.put(x, top, z, s.base.full);
      if (top - 1 > G) m.base(x, top - 1, z);
      for (let y = G + 1; y < top - 1; y++) p.air(x, y, z);
      // Vault lighting under the walkway.
      if (d === DWALK + 1 && i % 2 === 0 && c >= pitch / 2 - 0.5 && c < pitch / 2 + 0.5 && top - 2 > G + 1) p.set(x, top - 2, z, s.light, lantern(true));
      // Balteus: a parapet between the walkway and the upper band.
      if (d === DWALK && upper > 0) for (let y = yW + 1; y <= yU0; y++) m.put(x, y, z, s.trim.full);
    }

    // ---- diagonal stairs from the vaults up to the walkway
    const runLen = rows + 1;
    for (const t0 of [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]) {
      const s0 = arcAt(t0);
      for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
        const d = dep(x, z);
        if (d < DWALK || d > DL0) continue;
        let ds = arcAt(theta(x, z)) - s0;
        if (ds > perimeter / 2) ds -= perimeter; if (ds < -perimeter / 2) ds += perimeter;
        if (ds < 0 || ds >= runLen) continue;
        const i = Math.floor(ds), top = seatTop(d), y = G + 1 + i, f = tangent(theta(x, z), false, 0);
        for (let yy = G + 1; yy < y; yy++) m.base(x, yy, z);
        p.set(x, y, z, s.base.stairs, stairs(f));
        for (let yy = Math.max(y + 1, top - 1); yy <= Math.min(top, y + 2); yy++) p.air(x, yy, z);
      }
    }

    // ---- gates: vaulted tunnels through the ring and the vaults into the arena, with stairs beside them
    const gates: { t: number; along: 'x' | 'z'; side: (x: number, z: number) => boolean; off: (x: number, z: number) => number; name: string; normal: [number, number, number]; pos: [number, number, number] }[] = [
      { t: Math.PI, along: 'z', side: (x) => x < cx, off: (_x, z) => z - cz, name: 'west', normal: [-1, 0, 0], pos: [0, G + 1, cz] },
      { t: 0, along: 'z', side: (x) => x > cx, off: (_x, z) => z - cz, name: 'ost', normal: [1, 0, 0], pos: [W, G + 1, cz] },
    ];
    if (fourGates) gates.push(
      { t: 1.5 * Math.PI, along: 'x', side: (_x, z) => z < cz, off: (x) => x - cx, name: 'nord', normal: [0, 0, -1], pos: [cx, G + 1, 0] },
      { t: Math.PI / 2, along: 'x', side: (_x, z) => z > cz, off: (x) => x - cx, name: 'sued', normal: [0, 0, 1], pos: [cx, G + 1, D] });
    const connectors: Connector[] = [];
    for (const g of gates) {
      connectors.push(joint(g.name, g.pos, g.normal, 'path_joint', pathProfile(5)));
      for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
        const d = dep(x, z);
        if (d < 0 || d >= DA || !g.side(x, z)) continue;
        const off = g.off(x, z), ao = Math.abs(off);
        const toPillar: H = g.along === 'x' ? (off < 0 ? 'west' : 'east') : (off < 0 ? 'north' : 'south');
        if (d <= DWALL && ao <= 2) {
          for (let y = G + 1; y <= G + 5; y++) p.air(x, y, z);
          if (ao === 2) p.set(x, G + 6, z, s.trim.stairs, stairs(toPillar, 'top')); else p.air(x, G + 6, z);
          if (ao === 1) p.set(x, G + 7, z, s.trim.stairs, stairs(toPillar, 'top')); else m.put(x, G + 7, z, s.trim.full);
          if (ao === 0 && deko && (d === 0 || d === 2)) p.set(x, G + 6, z, s.light, lantern(true));
        }
        if (d <= DWALL && ao === 3 && d === 0) for (let y = G + 1; y <= G + 7; y++) m.corner(x, y, z);
        if (d === GAL && ao === 3 && deko) p.set(x, G + 4, z, 'red_wall_banner', wallBanner(g.along === 'x' ? (g.side(cx, cz - 1) ? 'north' : 'south') : (g.side(cx - 1, cz) ? 'west' : 'east')));
        if (d > DWALL && ao <= 1) {
          // Passage at ground level through the vaults and the podium into the arena; low rows become an open aisle.
          const top = seatTop(d);
          for (let y = G + 1; y <= G + 3; y++) p.air(x, y, z);
          if (top >= 0 && top <= G + 4) for (let y = G + 1; y <= top; y++) p.air(x, y, z);
        }
        // Stairs in the ambulatory beside the tunnel, one run per storey, alternating sides.
        if (d >= 1 && d <= GAL && ao >= 3 && ao <= 2 + fh) {
          const idx = ao - 3;
          for (let k = 0; k + 1 < etagen; k++) {
            const east = k % 2 === 0;
            if ((off > 0) !== east) continue;
            const yk = G + k * fh, f: H = g.along === 'x' ? (east ? 'east' : 'west') : (east ? 'south' : 'north');
            if (idx <= fh - 2) {
              for (let y = yk + 1; y <= yk + idx; y++) m.base(x, y, z);
              p.set(x, yk + 1 + idx, z, s.base.stairs, stairs(f));
              if (idx >= fh - 3) p.air(x, yk + fh, z);
            }
          }
        }
      }
    }

    // ---- hypogeum
    if (hypo) {
      const corridor = (x: number, z: number) => Math.abs(x - cx) <= 1 || Math.abs(z - cz) <= 1;
      const ra = A - DA, rb = B - DA; // arena half axes
      const chamberW = Math.max(2, Math.min(6, Math.floor(ra / 2) - 4)), chamberD = Math.max(2, Math.min(4, rb - 5));
      const chamber = (x: number, z: number) => { const ax = Math.abs(x - cx), az = Math.abs(z - cz); return ax >= 3 && ax < 3 + chamberW && az >= 3 && az < 3 + chamberD; };
      const chamberDoor = (x: number, z: number) => Math.abs(z - cz) === 2 && Math.abs(x - cx) === 3 + Math.floor(chamberW / 2);
      const ringC = (x: number, z: number) => { const d = dep(x, z); return d === DA + 1 || d === DA + 2; };
      for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
        const d = dep(x, z);
        if (d < DPOD) continue;
        m.base(x, 0, z);
        if (d === DPOD || d === DA) { for (let y = 1; y < G; y++) m.base(x, y, z); continue; }
        for (let y = 1; y < G; y++) {
          const open = y <= 3 && (corridor(x, z) || chamber(x, z) || chamberDoor(x, z) || ringC(x, z));
          if (open) p.air(x, y, z); else m.base(x, y, z);
        }
        if (y3Light(x, z)) p.set(x, 3, z, s.light, lantern(true));
      }
      function y3Light(x: number, z: number): boolean { return (Math.abs(z - cz) === 0 && (x - cx) % 6 === 0 && Math.abs(x - cx) >= 3 && Math.abs(x - cx) < ra - 2) || (Math.abs(x - cx) === 0 && (z - cz) % 5 === 0 && Math.abs(z - cz) >= 3 && Math.abs(z - cz) < rb - 2); }
      // Cells with bars along the chambers' corridor side, a chest and a barrel in every chamber.
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x0 = cx + sx * 3, x1 = cx + sx * (2 + chamberW), z1 = cz + sz * (2 + chamberD);
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
          if (x === cx + sx * (3 + Math.floor(chamberW / 2)) || dep(x, cz + sz * 2) <= DA) continue;
          for (let y = 1; y <= 3; y++) p.set(x, y, cz + sz * 2, 'iron_bars', { east: 'false', north: 'false', south: 'false', waterlogged: 'false', west: 'false' });
        }
        if (dep(x1, z1) > DA) {
          p.set(x1, 1, z1, 'chest', chest(sz < 0 ? 'south' : 'north'));
          p.set(x1 - sx, 1, z1, 'barrel', { facing: 'up', open: 'false' });
        }
      }
      // Lifts: four shafts with ladders from the corridors up to trapdoors in the arena floor; the ladder leans on a solid neighbour.
      const solidAt = (x: number, z: number) => { const d = dep(x, z); return d >= DPOD && (d <= DA || !(corridor(x, z) || chamber(x, z) || chamberDoor(x, z) || ringC(x, z))); };
      const lifts: [number, number][] = [[cx + Math.floor(ra / 2), cz - 2], [cx - Math.floor(ra / 2), cz + 2], [cx + 2, cz - Math.max(3, Math.floor(rb / 2))], [cx - 2, cz + Math.max(3, Math.floor(rb / 2))]];
      const SIDES: readonly [H, number, number][] = [['south', 0, -1], ['north', 0, 1], ['west', 1, 0], ['east', -1, 0]];
      for (const [lx, lz] of lifts) {
        if (dep(lx, lz) <= DA) continue;
        let side = SIDES.find(([, dx, dz]) => solidAt(lx + dx, lz + dz));
        if (!side) { side = SIDES[0]!; for (let y = 1; y < G; y++) m.base(lx + side[1], y, lz + side[2]); }
        const face = side[0];
        for (let y = 1; y <= G; y++) { p.air(lx, y, lz); p.set(lx, y, lz, 'ladder', ladder(face)); }
        p.set(lx, G + 1, lz, `${s.wood}_trapdoor`, trapdoor(face, 'bottom'));
      }
      notes.push(`Hypogäum: ${HYPO} Blöcke unter dem Boden (Ebene 0–${HYPO - 1} des Plans), im Spiel vorher ausheben; Aufzüge sind Leiterschächte mit Falltür im Arenaboden.`);
    }

    // Hanging lanterns need a block above: stair openings and tunnels may have removed it.
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) for (let y = 0; y <= H; y++) {
      const st = p.get(x, y, z);
      if (!st || !/lantern$/.test(st.id) || st.properties.hanging !== 'true') continue;
      const above = p.get(x, y + 1, z);
      if (!above || above.id === 'minecraft:air') p.air(x, y, z);
    }
    const label = etagen >= 3 && A >= 30 ? 'Kolosseum' : 'Amphitheater';
    const arenaW = 2 * (A - DA) + 1, arenaD = 2 * (B - DA) + 1;
    notes.push(`Arena ${arenaW} × ${arenaD}, ${rows} Sitzreihen unten${upper ? ` und ${upper} oben` : ''}, ${nB} Bögen je Etage, ${gates.length} Tore mit Wegeanschluss (Profil weg_5).`);
    if (hypo) notes.push(`Bodenniveau liegt auf Ebene ${G}; darunter nur die Arena (Hypogäum).`);
    return {
      payload: m.payload(), connectors,
      name: `${label} ${W} × ${D} (${s.short})`,
      description: `Generiertes ovales Amphitheater ${W} × ${D} mit ${etagen} Etage${etagen === 1 ? '' : 'n'} aus Rundbögen, Wandelgang, ${rows + upper} Sitzreihen auf Gewölben, Sandarena ${arenaW} × ${arenaD}${hypo ? ' und Hypogäum' : ''}.`,
      facets: { kategorie: ['oeffentlich'], stil: [...new Set([...s.stil, 'antik'])], biom: [...s.biom], funktion: ['versammlung', 'unterhaltung'] },
      notes,
    };
  },
};
