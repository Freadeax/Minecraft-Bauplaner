import { chain, lampPost, Plot, slab, water } from '../build/plot.js';
import { buildRoof } from './roofs.js';
import { Mason, styleParam, WEATHER_PARAMS } from './types.js';
import type { Generator } from './types.js';

/**
 * Brunnen (GEN-02): draw well with posts, crossbeam, chain and roof, or a
 * round fountain with stacked basins; optionally on a paved square with
 * lamps at the corners. Water source blocks are part of the plan.
 */
export const WELL_GENERATOR: Generator = {
  id: 'brunnen', name: 'Brunnen', version: 4,
  description: 'Ziehbrunnen mit Dach und Kette oder runder Springbrunnen mit bis zu drei Schalen, auf Wunsch mit gepflastertem Platz und Laternen.',
  params: [
    { key: 'form', label: 'Bauart', group: 'Maße', type: 'choice', default: 'springbrunnen', options: [{ value: 'ziehbrunnen', label: 'Ziehbrunnen' }, { value: 'springbrunnen', label: 'Springbrunnen' }] },
    { key: 'radius', label: 'Beckenradius', group: 'Maße', type: 'int', min: 1, max: 6, default: 3, unit: 'Blöcke', hint: 'Wasserfläche ohne Rand.' },
    { key: 'schalen', label: 'Schalen übereinander', group: 'Maße', type: 'int', min: 1, max: 3, default: 2, when: { key: 'form', values: ['springbrunnen'] } },
    { key: 'dach', label: 'Dach über dem Brunnen', group: 'Maße', type: 'bool', default: true, when: { key: 'form', values: ['ziehbrunnen'] } },
    styleParam('mittelalter'), ...WEATHER_PARAMS,
    { key: 'wasser', label: 'Mit Wasser', group: 'Stil & Material', type: 'bool', default: true,
      hint: 'Wasserquellen stehen im Plan; die Materialliste zählt sie nicht als Items (Eimer selbst einplanen).' },
    { key: 'platz', label: 'Platz ringsum', group: 'Platz', type: 'int', min: 0, max: 6, default: 2, unit: 'Blöcke' },
    { key: 'laternen', label: 'Laternen an den Ecken', group: 'Platz', type: 'bool', default: true },
  ],
  presets: [
    { id: 'dorfbrunnen', label: 'Dorfbrunnen', values: { form: 'ziehbrunnen', radius: 1, dach: true, platz: 1, stil: 'fachwerk' } },
    { id: 'marktbrunnen', label: 'Marktbrunnen', values: { form: 'springbrunnen', radius: 3, schalen: 2, platz: 3, stil: 'mittelalter' } },
    { id: 'schlossbrunnen', label: 'Schlossbrunnen', values: { form: 'springbrunnen', radius: 5, schalen: 3, platz: 4, stil: 'antik' } },
    { id: 'oase', label: 'Oasenbrunnen', values: { form: 'ziehbrunnen', radius: 2, dach: true, platz: 2, stil: 'wueste' } },
    { id: 'zierbrunnen', label: 'Zierbrunnen im Garten', values: { form: 'springbrunnen', radius: 2, schalen: 1, platz: 0, laternen: false, stil: 'fernost' } },
  ],
  build(a) {
    const form = a.str('form'), r = a.int('radius'), margin = a.int('platz');
    const R = r + 1, half = R + margin + (form === 'ziehbrunnen' && a.bool('dach') ? 1 : 0), W = 2 * half + 1, c = half;
    const p = new Plot([W, 2, W]), m = new Mason(p, a), s = m.style, notes: string[] = [];
    const wet = a.bool('wasser');
    const pour = (x: number, y: number, z: number) => { if (wet) p.set(x, y, z, 'water', water()); else p.air(x, y, z); };
    // Paving.
    for (let x = 0; x < W; x++) for (let z = 0; z < W; z++) m.base(x, 0, z);
    if (form === 'ziehbrunnen') {
      for (let x = c - R; x <= c + R; x++) for (let z = c - R; z <= c + R; z++) {
        const rim = Math.max(Math.abs(x - c), Math.abs(z - c)) === R;
        if (rim) { m.base(x, 1, z); if (s.trim.wall) p.set(x, 2, z, s.trim.wall); else p.set(x, 2, z, s.trim.slab, slab()); }
        else { pour(x, 0, z); pour(x, 1, z); }
      }
      if (a.bool('dach')) {
        for (const x of [c - R, c + R]) for (let y = 2; y <= 4; y++) m.put(x, y, c, s.beam);
        for (let x = c - R; x <= c + R; x++) m.beam(x, 5, c, 'x');
        for (let y = 3; y <= 4; y++) p.set(c, y, c, 'iron_chain', chain('y'));
        buildRoof(p, { x0: c - R - 1, x1: c + R + 1, z0: c - R - 1, z1: c + R + 1, y: 6, form: 'sattel', pitch: 'steil', ridge: 'x', style: s });
      } else notes.push('Ohne Dach: Brunnenrand mit Mauerkrone.');
    } else {
      // Basin: rim ring on a full disc, water inside, stacked bowls on a central column.
      p.disc(c, c, 0, R, s.base.full);
      for (let x = 0; x < W; x++) for (let z = 0; z < W; z++) {
        const q = (x - c) ** 2 + (z - c) ** 2;
        if (q <= R * R + R * 0.8 && q > r * r + r * 0.8) { if (s.trim.wall) p.set(x, 1, z, s.trim.wall); else m.put(x, 1, z, s.trim.full); }
        else if (q <= r * r + r * 0.8) pour(x, 1, z);
      }
      let y = 1;
      const tiers = Math.min(a.int('schalen'), Math.max(1, r));
      if (tiers < a.int('schalen')) notes.push(`Nur ${tiers} Schale${tiers === 1 ? '' : 'n'} bei Radius ${r}.`);
      for (let k = 1; k < tiers; k++) {
        const top = y + 2;
        for (let yy = y; yy < top; yy++) m.put(c, yy, c, s.trim.full);
        const rk = Math.max(1, r - 1 - 2 * (k - 1));
        p.disc(c, c, top, rk, s.trim.full);
        for (let x = c - rk - 1; x <= c + rk + 1; x++) for (let z = c - rk - 1; z <= c + rk + 1; z++) {
          const q = (x - c) ** 2 + (z - c) ** 2;
          if (q <= rk * rk + rk * 0.8 && rk >= 2 && q > (rk - 1) * (rk - 1) + (rk - 1) * 0.8) p.set(x, top + 1, z, s.trim.slab, slab());
          else if (q <= (rk - 1) * (rk - 1) + (rk - 1) * 0.8 && rk >= 2) pour(x, top + 1, z);
        }
        y = top + 1;
      }
      m.put(c, y, c, s.trim.full);
      if (wet) { p.set(c, y + 1, c, 'water', water()); notes.push('Oberste Wasserquelle fließt im Spiel über die Schalen ab; im Plan stehen nur Quellblöcke.'); }
    }
    if (a.bool('laternen') && margin >= 1) for (const x of [0, W - 1]) for (const z of [0, W - 1]) lampPost(p, x, 1, z, `${s.wood}_fence`, 2, s.light);
    else if (a.bool('laternen')) notes.push('Laternen erst mit Platz ringsum.');
    if (wet) notes.push('Wasserquellen zählt die Materialliste nicht als Items: Eimer selbst einplanen.');
    const label = form === 'ziehbrunnen' ? 'Ziehbrunnen' : 'Springbrunnen';
    return {
      payload: m.payload(), connectors: [],
      name: `${label} ${W} × ${W} (${s.short})`,
      description: `Generierter ${label} mit Becken Radius ${r}${margin ? ` auf einem Platz ${W} × ${W}` : ''}.`,
      facets: { kategorie: ['dekoration'], stil: [...s.stil], biom: [...s.biom], funktion: ['wasserquelle', 'deko'] },
      notes,
    };
  },
};
