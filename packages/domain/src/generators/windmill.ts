import { barrel, chest, door, ladder, lantern, Plot, slab } from '../build/plot.js';
import { buildRoof, coneRoof } from './roofs.js';
import { Mason, styleParam, WEATHER_PARAMS } from './types.js';
import type { Generator } from './types.js';

/**
 * Windmühle (GEN-02): round tower mill, optionally tapering, with floors,
 * ladder, a gallery, a cap (cone or hip) and four sails in the plane in front
 * of the north face. The sail cloth trails on the same side of every spar, as
 * on a real mill; sails that would hit the ground are shortened visibly.
 */
export const WINDMILL_GENERATOR: Generator = {
  id: 'windmuehle', name: 'Windmühle', version: 2,
  description: 'Turmwindmühle mit Verjüngung, Geschossen, Galerie, Kappe und vier Flügeln als Kreuz oder schräg; innen Mahlboden mit Vorräten.',
  params: [
    { key: 'radius', label: 'Radius unten', group: 'Maße', type: 'int', min: 3, max: 6, default: 4, unit: 'Blöcke' },
    { key: 'hoehe', label: 'Turmhöhe', group: 'Maße', type: 'int', min: 8, max: 28, default: 14, unit: 'Blöcke' },
    { key: 'verjuengung', label: 'Nach oben schmaler', group: 'Maße', type: 'bool', default: true },
    styleParam('fachwerk'), ...WEATHER_PARAMS,
    { key: 'fluegel', label: 'Flügellänge', group: 'Flügel', type: 'int', min: 4, max: 12, default: 8, unit: 'Blöcke', hint: 'Wird gekürzt, wenn die Flügel sonst den Boden berühren.' },
    { key: 'stellung', label: 'Flügelstellung', group: 'Flügel', type: 'choice', default: 'kreuz', options: [{ value: 'kreuz', label: 'Senkrechtes Kreuz (+)' }, { value: 'schraeg', label: 'Schräg (×)' }] },
    { key: 'haube', label: 'Kappe', group: 'Dach', type: 'choice', default: 'kegel', options: [{ value: 'kegel', label: 'Kegelkappe' }, { value: 'walm', label: 'Zeltdach' }] },
    { key: 'galerie', label: 'Galerie (Umgang)', group: 'Details', type: 'bool', default: true },
    { key: 'mahlwerk', label: 'Mahlboden mit Vorräten', group: 'Details', type: 'bool', default: true },
  ],
  presets: [
    { id: 'hollaender', label: 'Holländermühle', values: { radius: 4, hoehe: 16, verjuengung: true, fluegel: 9, stil: 'fachwerk', galerie: true } },
    { id: 'dorfmuehle', label: 'Kleine Dorfmühle', values: { radius: 3, hoehe: 9, verjuengung: false, fluegel: 6, stil: 'mittelalter', galerie: false } },
    { id: 'steinmuehle', label: 'Steinmühle auf dem Hügel', values: { radius: 5, hoehe: 20, fluegel: 11, stil: 'mittelalter', stellung: 'schraeg', verwitterung: 25 } },
    { id: 'nordmuehle', label: 'Nordische Mühle', values: { radius: 4, hoehe: 12, fluegel: 8, stil: 'nordisch', haube: 'walm' } },
    { id: 'wuestenmuehle', label: 'Wüstenmühle', values: { radius: 4, hoehe: 11, verjuengung: false, fluegel: 7, stil: 'wueste', haube: 'kegel', stellung: 'schraeg' } },
  ],
  build(a) {
    const r = a.int('radius'), H = a.int('hoehe'), taper = a.bool('verjuengung'), diag = a.str('stellung') === 'schraeg';
    const notes: string[] = [];
    const rAt = (y: number) => taper ? Math.max(2, r - Math.floor((r - 2) * y / H)) : r;
    const rTop = rAt(H), hy = H - 1;
    const F = Math.min(a.int('fluegel'), hy - 2);
    if (F < a.int('fluegel')) notes.push(`Flügel auf ${F} gekürzt, damit sie den Boden nicht berühren.`);
    const W = Math.max(2 * r + 1, 2 * F + 5), c = (W - 1) / 2, zo = 2, zc = zo + r;
    const p = new Plot([W, 2, zc + r + 1]), m = new Mason(p, a), s = m.style;
    const inside = (x: number, z: number, rr: number) => (x - c) ** 2 + (z - zc) ** 2 <= rr * rr + rr * 0.8;
    const edge = (x: number, z: number, rr: number) => inside(x, z, rr) && !(inside(x + 1, z, rr) && inside(x - 1, z, rr) && inside(x, z + 1, rr) && inside(x, z - 1, rr));
    const gy = Math.floor(H / 2), galleryOn = a.bool('galerie') && H >= 10;
    if (a.bool('galerie') && !galleryOn) notes.push('Galerie erst ab Turmhöhe 10.');
    // Body with floors every five layers and at the gallery.
    for (let x = 0; x < W; x++) for (let z = zo; z <= zc + r; z++) {
      if (inside(x, z, r)) m.base(x, 0, z);
      for (let y = 1; y <= H; y++) {
        const rr = rAt(y);
        if (!inside(x, z, rr)) continue;
        if (edge(x, z, rr)) m.wall(x, y, z);
        else if (y === H || y % 5 === 0 || (galleryOn && y === gy)) p.set(x, y, z, s.floor);
        else p.air(x, y, z);
      }
    }
    // Ladder on the east side, against a post where the wall steps outwards.
    const lx = c + rTop - 1;
    for (let y = 1; y < H; y++) {
      if (!edge(lx + 1, zc, rAt(y))) m.put(lx + 1, y, zc, s.beam);
      p.set(lx, y, zc, 'ladder', ladder('west'));
    }
    door(p, c, 1, zc + r, s.wood, 'north');
    p.set(c, 0, zc + r, s.base.full);
    // Windows: one per floor on the west and south sides.
    for (let y = 3; y < H - 1; y += 5) { const rr = rAt(y); p.set(c - rr, y, zc, s.window); p.set(c, y, zc + rr, s.window); }
    // Gallery: slab ring around the wall with a fence, door from the gallery floor (south side).
    if (galleryOn) {
      const rg = rAt(gy) + 2;
      for (let x = 0; x < W; x++) for (let z = zo; z <= zc + r; z++) {
        if (inside(x, z, rAt(gy)) || !inside(x, z, rg)) continue;
        p.set(x, gy, z, s.trim.slab, slab('top'));
        if (edge(x, z, rg) && !inside(x, z, rAt(gy + 1))) p.set(x, gy + 1, z, `${s.wood}_fence`);
      }
      p.set(c, gy, zc + rAt(gy + 1), s.trim.full); // threshold: the door needs a full block below (BLOCK-02)
      door(p, c, gy + 1, zc + rAt(gy + 1), s.wood, 'north');
    }
    // Cap.
    const capTop = a.str('haube') === 'kegel' ? coneRoof(p, c, zc, H + 1, rTop, s)
      : buildRoof(p, { x0: c - rTop, x1: c + rTop, z0: zc - rTop, z1: zc + rTop, y: H + 1, form: 'walm', pitch: 'steil', ridge: 'z', style: s });
    // Hub and sails in the plane z = 0.
    for (let z = 0; z < zc - rAt(hy); z++) m.beam(c, hy, z, 'z');
    const cloth = s.key === 'nether' ? 'red_wool' : 'white_wool';
    const arms: readonly (readonly [number, number])[] = diag ? [[1, 1], [1, -1], [-1, -1], [-1, 1]] : [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of arms) for (let i = 1; i <= F; i++) {
      const x = c + dx * i, y = hy + dy * i;
      if (diag) p.set(x, y, 0, s.trim.full);
      else if (dx === 0) m.put(x, y, 0, s.beam); else m.beam(x, y, 0, 'x');
      if (i < 2) continue;
      if (diag) { p.set(x + dy, y, 0, cloth); p.set(x, y - dx, 0, cloth); }
      else p.set(x + dy, y - dx, 0, cloth);
    }
    // Mill floor.
    if (a.bool('mahlwerk')) {
      p.set(c - 1, 1, zc + 1, 'hay_block', { axis: 'y' }); p.set(c - 1, 2, zc + 1, 'hay_block', { axis: 'y' });
      p.set(c + 1, 1, zc + 1, 'barrel', barrel('up')); p.set(c, 1, zc - 1, 'chest', chest('south'));
      p.set(c, Math.min(4, H - 1), zc, s.light, lantern(true));
    }
    notes.push(`Flügel ${F} lang in der Ebene vor der Nordseite; Spannweite ${2 * F + 1 + (diag ? 2 : 1)} Blöcke.`);
    return {
      payload: m.payload(), connectors: [],
      name: `Windmühle ${capTop + 1} m (${s.short})`,
      description: `Generierte Windmühle: Turm Radius ${r}${taper ? ` bis ${rTop}` : ''}, ${H} hoch, ${diag ? 'schräge' : 'senkrechte'} Flügel ${F} lang${galleryOn ? ', mit Galerie' : ''}.`,
      facets: { kategorie: ['landwirtschaft'], stil: [...s.stil], biom: [...s.biom], funktion: ['landwirtschaft', 'orientierung'] },
      notes,
    };
  },
};
