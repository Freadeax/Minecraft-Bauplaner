import { Plot, axis, chest, door, facing, lantern, slab } from '../plot.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/** Nether, End & Ozean: builds for the other dimensions and under water. */

/** Safe nether base: blast-resistant blackstone hall around the portal, with storage and a respawn anchor instead of a bed. */
function netherbasis() {
  const p = new Plot([11, 9, 11]);
  p.fill(0, 0, 0, 10, 0, 10, 'polished_blackstone_bricks');
  p.room(0, 0, 10, 10, 1, 5, 'blackstone'); p.fill(0, 6, 0, 10, 6, 10, 'polished_blackstone_bricks');
  for (const [x, z] of [[0, 0], [10, 0], [0, 10], [10, 10]] as const) p.fill(x, 1, z, x, 7, z, 'basalt', axis('y'));
  p.fill(3, 1, 5, 6, 5, 5, 'obsidian'); p.fill(4, 2, 5, 5, 4, 5, null);
  p.fill(5, 1, 0, 5, 2, 0, null); door(p, 5, 1, 0, 'crimson', 'south');
  for (const x of [2, 8]) for (const y of [2, 3]) p.set(x, y, 0, 'iron_bars');
  p.fill(1, 1, 9, 4, 1, 9, 'chest', chest('north')); p.set(9, 1, 9, 'respawn_anchor'); p.set(8, 1, 9, 'smithing_table'); p.set(9, 1, 8, 'blast_furnace', { facing: 'west', lit: 'false' });
  for (const [x, z] of [[2, 2], [8, 2], [2, 8], [8, 8]] as const) p.set(x, 5, z, 'soul_lantern', lantern(true));
  for (let x = 0; x <= 10; x += 2) { p.set(x, 7, 0, 'polished_blackstone_brick_wall'); p.set(x, 7, 10, 'polished_blackstone_brick_wall'); }
  for (let z = 2; z <= 8; z += 2) { p.set(0, 7, z, 'polished_blackstone_brick_wall'); p.set(10, 7, z, 'polished_blackstone_brick_wall'); }
  p.set(5, 7, 5, 'shroomlight');
  return p.payload();
}

/** End launch platform: obsidian pad with purpur railing and end rods; elytra start point. */
function endplattform() {
  const p = new Plot([11, 6, 11]);
  p.disc(5, 5, 0, 5, 'end_stone_bricks'); p.disc(5, 5, 0, 3, 'purpur_block'); p.disc(5, 5, 0, 1, 'obsidian');
  p.disc(5, 5, 1, 5, 'purpur_slab', slab(), true);
  for (const [x, z] of [[1, 3], [9, 3], [1, 7], [9, 7], [3, 1], [7, 1], [3, 9], [7, 9]] as const) { p.set(x, 1, z, 'purpur_pillar', axis('y')); p.set(x, 2, z, 'end_rod', facing('up')); }
  p.clear(5, 1, 0); p.clear(5, 1, 10);
  for (const x of [4, 5, 6]) p.set(x, 0, 10, 'end_stone_brick_slab', slab('top'));
  p.set(5, 1, 5, 'ender_chest', { facing: 'south', waterlogged: 'false' });
  return p.payload();
}

/** Under-water dome: glass dome on a prismarine ring, lit with sea lanterns; build it, then drain it with sponges. */
function unterwasserkuppel() {
  const p = new Plot([13, 9, 13]);
  p.disc(6, 6, 0, 6, 'dark_prismarine'); p.disc(6, 6, 0, 4, 'prismarine_bricks');
  for (let y = 1; y <= 7; y++) {
    const r = Math.sqrt(Math.max(0, 36 - (y - 1) ** 2 * 0.9));
    if (r < 0.8) { p.set(6, y, 6, 'glass'); continue; }
    p.disc(6, 6, y, r, 'glass', {}, true);
    p.disc(6, 6, y, r - 1, null);
  }
  p.disc(6, 6, 8, 1, 'glass');
  for (const [x, z] of [[2, 6], [10, 6], [6, 2], [6, 10]] as const) p.set(x, 1, z, 'sea_lantern');
  p.set(6, 0, 6, 'sea_lantern'); p.set(4, 1, 8, 'chest', chest('north')); p.set(8, 1, 8, 'crafting_table');
  return p.payload();
}

export const WELTEN_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_netherbasis', name: 'Netherbasis', payload: netherbasis, tags: ['nether', 'portal', 'sicher'],
    description: 'Ghast-sichere Halle aus Schwarzstein um ein Netherportal, mit Lager, Seelenanker statt Bett, Schmiede und Seelenlaternen.',
    facets: { kategorie: ['basis'], stil: ['nether'], biom: ['nether'], funktion: ['reisen', 'lagern'] },
    tips: ['Betten explodieren im Nether – zum Spawnen den Seelenanker mit Glowstone laden.', 'Schwarzstein und Basalt halten Ghast-Feuerbällen stand.'],
    inspiration: [WIKI('Respawn_Anchor', 'Seelenanker')] },
  { id: 'bld_endplattform', name: 'End-Startplattform', payload: endplattform, tags: ['end', 'elytra', 'plattform'],
    description: 'Runde Plattform aus Endsteinziegeln und Purpur mit Obsidian-Mitte, Endstäben und Endertruhe – Startpunkt für Elytraflüge.',
    facets: { kategorie: ['infrastruktur'], stil: ['end'], biom: ['end'], funktion: ['reisen', 'aussicht'] } },
  { id: 'bld_unterwasserkuppel', name: 'Unterwasserkuppel', payload: unterwasserkuppel, tags: ['ozean', 'glas', 'kuppel'],
    description: 'Glaskuppel auf einem Prismarinring mit Meereslaternen – Basis am Meeresgrund.',
    facets: { kategorie: ['basis'], stil: ['modern', 'kuestenstil'], biom: ['ozean'], funktion: ['wohnen', 'aussicht'] },
    tips: ['Erst die Kuppel schließen, dann das Wasser innen mit Schwämmen oder Sand trockenlegen.'], inspiration: [WIKI('Ocean_Monument', 'Ozeanmonument')] },
];
