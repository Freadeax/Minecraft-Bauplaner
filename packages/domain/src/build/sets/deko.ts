import { Plot, axis, campfire, chain, facing, grass, lantern, leaves, slab, stairs, water, spruceTree, banner, F, T } from '../plot.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/** Dekoration, Statuen & Wahrzeichen: small set pieces and big landmarks. */

const wall = (up = true): Record<string, string> => ({ east: 'none', north: 'none', south: 'none', up: up ? T : F, waterlogged: F, west: 'none' });

function springbrunnen() {
  const p = new Plot([9, 6, 9]);
  p.disc(4, 4, 0, 4, 'stone_bricks');
  p.disc(4, 4, 1, 4, 'stone_brick_wall', wall(), true); p.disc(4, 4, 1, 3, 'water', water());
  p.fill(4, 1, 4, 4, 3, 4, 'chiseled_stone_bricks'); p.set(4, 4, 4, 'water', water());
  for (const [x, z] of [[3, 4], [5, 4], [4, 3], [4, 5]] as const) p.set(x, 3, z, 'stone_brick_slab', slab());
  p.set(4, 5, 4, 'sea_lantern');
  return p.payload();
}

function sitzbank() {
  const p = new Plot([5, 3, 3]);
  for (let x = 1; x <= 3; x++) p.set(x, 0, 1, 'spruce_stairs', stairs('north'));
  p.set(0, 0, 1, 'spruce_trapdoor', { facing: 'west', half: 'bottom', open: T, powered: F, waterlogged: F }); p.set(4, 0, 1, 'spruce_trapdoor', { facing: 'east', half: 'bottom', open: T, powered: F, waterlogged: F });
  p.set(0, 0, 0, 'potted_red_tulip'); p.set(4, 0, 0, 'potted_cornflower');
  p.fill(1, 0, 0, 3, 0, 0, 'oak_leaves', leaves());
  return p.payload();
}

function lagerfeuer() {
  const p = new Plot([7, 3, 7]);
  p.disc(3, 3, 0, 3, 'coarse_dirt'); p.disc(3, 3, 0, 1, 'cobblestone');
  p.set(3, 1, 3, 'campfire', campfire());
  for (const [x, z, a] of [[1, 3, 'z'], [5, 3, 'z'], [3, 1, 'x'], [3, 5, 'x']] as const) p.set(x, 1, z, 'stripped_oak_log', axis(a));
  p.set(5, 1, 5, 'barrel', { facing: 'up', open: F }); p.set(1, 1, 1, 'lantern', lantern());
  return p.payload();
}

function creeper() {
  const p = new Plot([4, 9, 3]);
  // 4×4 head, 2-wide body, four 1×1 feet. Face from black wool on the south.
  for (const [x, z] of [[0, 0], [3, 0], [0, 2], [3, 2]] as const) p.fill(x, 0, z, x, 1, z, 'lime_concrete');
  p.fill(1, 2, 1, 2, 4, 1, 'lime_concrete'); p.fill(1, 2, 0, 2, 4, 0, 'green_concrete'); p.fill(1, 0, 1, 2, 1, 1, 'lime_concrete');
  p.fill(0, 5, 0, 3, 8, 2, 'lime_concrete');
  for (const [x, y] of [[0, 7], [3, 7], [1, 6], [2, 6], [1, 5], [2, 5]] as const) p.set(x, y, 2, 'black_concrete');
  p.set(0, 6, 2, 'black_concrete'); p.set(3, 6, 2, 'black_concrete'); p.set(0, 8, 1, 'green_concrete'); p.set(3, 5, 0, 'green_concrete');
  return p.payload();
}

function schwertImStein() {
  const p = new Plot([7, 9, 7]);
  p.disc(3, 3, 0, 3, 'grass_block', grass());
  p.blob(3, 1, 3, 2.2, 1.2, 2, 'stone', {}, false, (_x, y) => y >= 1); p.set(2, 2, 3, 'mossy_cobblestone'); p.set(4, 1, 2, 'mossy_cobblestone');
  p.fill(3, 3, 3, 3, 6, 3, 'iron_bars'); p.set(3, 3, 3, 'iron_block');
  p.set(2, 7, 3, 'gold_block'); p.set(3, 7, 3, 'gold_block'); p.set(4, 7, 3, 'gold_block');
  p.set(3, 8, 3, 'dark_oak_fence'); p.set(3, 9, 3, 'gold_block');
  return p.payload();
}

function eisengolem() {
  const p = new Plot([5, 8, 3]);
  p.fill(1, 0, 1, 1, 2, 1, 'iron_block'); p.fill(3, 0, 1, 3, 2, 1, 'iron_block');
  p.fill(0, 3, 1, 4, 5, 1, 'iron_block'); p.fill(1, 3, 0, 3, 5, 2, 'iron_block');
  p.fill(0, 2, 1, 0, 2, 1, 'iron_block'); p.fill(4, 2, 1, 4, 2, 1, 'iron_block');
  p.set(2, 6, 1, 'carved_pumpkin', facing('south')); p.set(1, 6, 1, 'iron_block'); p.set(3, 6, 1, 'iron_block'); p.set(2, 7, 1, 'iron_block');
  return p.payload();
}

function ritter() {
  const p = new Plot([5, 10, 3]);
  p.fill(1, 0, 1, 1, 3, 1, 'polished_andesite'); p.fill(3, 0, 1, 3, 3, 1, 'polished_andesite');
  p.fill(1, 4, 1, 3, 6, 1, 'iron_block'); p.set(2, 5, 0, 'red_wool');
  p.fill(0, 4, 1, 0, 6, 1, 'polished_andesite'); p.fill(4, 4, 1, 4, 6, 1, 'polished_andesite');
  p.set(2, 7, 1, 'iron_block'); p.set(2, 8, 1, 'iron_block'); p.set(2, 9, 1, 'iron_trapdoor', { facing: 'south', half: 'bottom', open: F, powered: F, waterlogged: F });
  p.fill(4, 0, 2, 4, 8, 2, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  p.fill(0, 3, 2, 0, 6, 2, 'spruce_trapdoor', { facing: 'south', half: 'bottom', open: T, powered: F, waterlogged: F });
  return p.payload();
}

function heissluftballon() {
  const p = new Plot([9, 17, 9]);
  p.room(3, 3, 5, 5, 0, 1, 'spruce_planks'); p.fill(3, 0, 3, 5, 0, 5, 'spruce_planks'); p.fill(4, 1, 4, 4, 1, 4, null);
  p.set(4, 1, 4, 'campfire', campfire());
  for (const [x, z] of [[3, 3], [5, 3], [3, 5], [5, 5]] as const) p.fill(x, 2, z, x, 5, z, 'chain', chain());
  const rows = [3, 4, 4, 4, 4, 3, 3, 2, 1];
  rows.forEach((r, i) => { const y = 7 + i; p.disc(4, 4, y, r, i % 2 ? 'red_wool' : 'white_wool', {}, true); });
  p.disc(4, 4, 6, 2, 'red_wool', {}, true);
  return p.payload();
}

function segelschiff() {
  const p = new Plot([25, 20, 9]);
  for (let x = 0; x < 25; x++) {
    const halfW = Math.min(x + 1, 3); // pointed bow at x = 0, full width from x = 2
    for (let y = 0; y <= 4; y++) {
      const r = Math.max(0, halfW - Math.max(0, 2 - y)); // keel narrows towards the bottom
      for (let z = 4 - r; z <= 4 + r; z++) {
        const shell = z === 4 - r || z === 4 + r || y === 0 || x === 0 || x === 24;
        if (shell) p.set(x, y, z, y >= 3 ? 'spruce_planks' : 'dark_oak_planks');
      }
    }
    for (let z = 2; z <= 6; z++) if (x > 0 && x < 24) p.set(x, 3, z, 'spruce_planks');
  }
  for (let z = 1; z <= 7; z++) for (let x = 19; x <= 24; x++) if (p.has(x, 3, z)) p.set(x, 4, z, 'spruce_planks');
  p.room(19, 2, 23, 6, 5, 6, 'dark_oak_planks'); p.fill(19, 7, 2, 23, 7, 6, 'spruce_slab', slab());
  p.set(19, 5, 4, 'spruce_door', { facing: 'west', half: 'lower', hinge: 'left', open: F, powered: F }); p.set(19, 6, 4, 'spruce_door', { facing: 'west', half: 'upper', hinge: 'left', open: F, powered: F });
  for (const [mx, h] of [[7, 16], [14, 18]] as const) {
    p.fill(mx, 4, 4, mx, h, 4, 'stripped_dark_oak_log', axis('y'));
    for (let y = h - 9; y <= h - 2; y++) for (let z = 1; z <= 7; z++) if (z !== 4) p.set(mx + 1, y, z, 'white_wool');
    p.fill(mx - 1, h - 1, 1, mx - 1, h - 1, 7, 'spruce_log', axis('z')); p.fill(mx - 1, h - 10, 2, mx - 1, h - 10, 6, 'spruce_log', axis('z'));
  }
  p.fill(0, 4, 4, 0, 6, 4, 'spruce_fence');
  p.set(14, 19, 4, 'black_banner', banner(4));
  p.set(22, 8, 4, 'lantern', lantern());
  return p.payload();
}

function weihnachtsbaum() {
  const p = new Plot([9, 14, 9]);
  p.disc(4, 4, 0, 4, 'snow_block'); spruceTree(p, 4, 1, 4, 10);
  const colors = ['red', 'blue', 'yellow', 'white'];
  let i = 0;
  for (let y = 3; y <= 10; y++) for (let x = 0; x < 9; x++) for (let z = 0; z < 9; z++) {
    if (p.get(x, y, z)?.id === 'minecraft:spruce_leaves' && (x + y * 3 + z * 5) % 7 === 0) p.set(x, y, z, `${colors[i++ % 4]}_stained_glass`);
  }
  p.set(4, 12, 4, 'glowstone');
  for (const [x, z, c] of [[2, 6, 'red'], [6, 6, 'blue'], [6, 2, 'lime']] as const) p.set(x, 1, z, `${c}_shulker_box`, facing('up'));
  return p.payload();
}

function zeltlager() {
  const p = new Plot([13, 5, 11]);
  for (let x = 0; x < 13; x++) for (let z = 0; z < 11; z++) p.set(x, 0, z, 'grass_block', grass());
  for (const [x0, c] of [[0, 'white'], [8, 'green']] as const) {
    for (let z = 1; z <= 5; z++) {
      p.set(x0, 1, z, `${c}_wool`); p.set(x0 + 4, 1, z, `${c}_wool`);
      p.set(x0 + 1, 2, z, `${c}_wool`); p.set(x0 + 3, 2, z, `${c}_wool`); p.set(x0 + 2, 3, z, `${c}_wool`);
    }
    p.fill(x0 + 1, 1, 5, x0 + 3, 1, 5, null); p.air(x0 + 2, 2, 5);
    p.set(x0 + 2, 1, 2, `${c === 'white' ? 'red' : 'yellow'}_bed`, { facing: 'south', occupied: F, part: 'head' }); p.set(x0 + 2, 1, 3, `${c === 'white' ? 'red' : 'yellow'}_bed`, { facing: 'south', occupied: F, part: 'foot' });
  }
  p.set(6, 1, 8, 'campfire', campfire()); p.set(5, 1, 8, 'spruce_log', axis('z')); p.set(7, 1, 8, 'spruce_log', axis('z'));
  p.set(2, 1, 8, 'chest', { facing: 'north', type: 'single', waterlogged: F }); p.set(10, 1, 8, 'crafting_table');
  return p.payload();
}

function uhrturm() {
  const p = new Plot([7, 24, 7]);
  p.fill(0, 0, 0, 6, 0, 6, 'stone_bricks');
  p.room(0, 0, 6, 6, 1, 4, 'stone_bricks'); p.room(1, 1, 5, 5, 5, 16, 'bricks');
  for (const [x, z] of [[1, 1], [5, 1], [1, 5], [5, 5]] as const) p.fill(x, 5, z, x, 17, z, 'stone_bricks');
  p.fill(3, 1, 0, 3, 2, 0, null);
  for (const [x, z, f] of [[3, 0, 'north'], [3, 6, 'south'], [0, 3, 'west'], [6, 3, 'east']] as const) {
    const fx = f === 'west' ? 1 : f === 'east' ? 5 : x, fz = f === 'north' ? 1 : f === 'south' ? 5 : z;
    p.set(fx, 13, fz, 'quartz_block');
    if (f === 'north' || f === 'south') { p.set(2, 13, fz, 'quartz_block'); p.set(4, 13, fz, 'quartz_block'); p.set(3, 14, fz, 'quartz_block'); p.set(3, 12, fz, 'quartz_block'); p.set(3, 13, fz, 'black_concrete'); }
    else { p.set(fx, 13, 2, 'quartz_block'); p.set(fx, 13, 4, 'quartz_block'); p.set(fx, 14, 3, 'quartz_block'); p.set(fx, 12, 3, 'quartz_block'); p.set(fx, 13, 3, 'black_concrete'); }
    for (let y = 7; y <= 9; y++) if (f === 'east' || f === 'west') p.set(fx, y, 3, 'glass_pane', { east: F, north: T, south: T, waterlogged: F, west: F }); else p.set(3, y, fz, 'glass_pane', { east: T, north: F, south: F, waterlogged: F, west: T });
  }
  p.fill(1, 17, 1, 5, 17, 5, 'stone_bricks'); p.set(3, 18, 3, 'gold_block');
  for (const [x, z] of [[1, 1], [5, 1], [1, 5], [5, 5]] as const) p.fill(x, 18, z, x, 19, z, 'stone_brick_wall', wall());
  for (let i = 0; i <= 2; i++) p.ring(1 + i, 1 + i, 5 - i, 5 - i, 20 + i, i === 2 ? 'dark_prismarine' : 'dark_prismarine_slab', i === 2 ? {} : slab());
  p.set(3, 23, 3, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  return p.payload();
}

function obelisk() {
  const p = new Plot([7, 18, 7]);
  p.fill(0, 0, 0, 6, 0, 6, 'smooth_sandstone'); p.fill(1, 1, 1, 5, 1, 5, 'cut_sandstone');
  p.fill(2, 2, 2, 4, 3, 4, 'chiseled_sandstone'); p.fill(2, 4, 2, 4, 13, 4, 'sandstone');
  p.fill(3, 14, 3, 3, 15, 3, 'sandstone'); p.set(3, 16, 3, 'gold_block');
  for (let y = 5; y <= 12; y += 3) { p.set(3, y, 1, 'chiseled_sandstone'); p.set(3, y, 5, 'chiseled_sandstone'); }
  for (const [x, z, f] of [[3, 0, 'south'], [3, 6, 'north'], [0, 3, 'east'], [6, 3, 'west']] as const) p.set(x, 1, z, 'sandstone_stairs', stairs(f));
  return p.payload();
}

function triumphbogen() {
  const p = new Plot([13, 13, 5]);
  p.fill(0, 0, 0, 12, 10, 4, 'smooth_quartz'); p.fill(4, 0, 0, 8, 6, 4, null); p.fill(5, 7, 0, 7, 7, 4, null);
  for (let z = 0; z <= 4; z++) { p.set(4, 7, z, 'quartz_stairs', stairs('west', 'top')); p.set(8, 7, z, 'quartz_stairs', stairs('east', 'top')); }
  p.fill(1, 0, 1, 2, 4, 3, null); p.fill(10, 0, 1, 11, 4, 3, null);
  for (const x of [0, 3, 9, 12]) for (const z of [0, 4]) p.fill(x, 0, z, x, 8, z, 'quartz_pillar', axis('y'));
  p.fill(0, 9, 0, 12, 9, 4, 'chiseled_quartz_block'); p.fill(0, 11, 0, 12, 11, 4, 'smooth_quartz_slab', slab());
  p.fill(4, 12, 2, 8, 12, 2, 'gold_block');
  return p.payload();
}

function leuchtfeuerPyramide() {
  const p = new Plot([9, 6, 9]);
  for (let l = 0; l < 4; l++) p.fill(l, l, l, 8 - l, l, 8 - l, l === 0 ? 'iron_block' : l === 1 ? 'gold_block' : l === 2 ? 'emerald_block' : 'diamond_block');
  p.set(4, 4, 4, 'beacon'); p.set(4, 5, 4, 'light_blue_stained_glass');
  return p.payload();
}

function spiralturm() {
  const p = new Plot([11, 27, 11]);
  p.disc(5, 5, 0, 5, 'deepslate_tiles');
  p.tube(5, 5, 3, 1, 22, 'calcite');
  for (let y = 1; y <= 22; y++) {
    const a = (y / 22) * Math.PI * 4;
    for (const d of [0, 0.3]) { const x = Math.round(5 + Math.cos(a + d) * 4.4), z = Math.round(5 + Math.sin(a + d) * 4.4); p.set(x, y, z, 'amethyst_block'); }
    if (y % 5 === 0) { p.set(5 + (y % 10 === 0 ? 3 : -3), y, 5, 'purple_stained_glass'); }
  }
  for (let y = 23; y <= 26; y++) p.disc(5, 5, y, Math.max(0, 3 - (y - 23)), 'purpur_block', {}, true);
  p.set(5, 26, 5, 'end_rod', facing('up'));
  return p.payload();
}

const STATUE = (id: string, name: string, payload: () => ReturnType<Plot['payload']>, description: string, extra: Partial<BuildingSpec> = {}): BuildingSpec => ({
  id, name, payload, description, tags: ['statue', 'blickfang'],
  facets: { kategorie: ['statue'], stil: ['fantasy'], biom: ['ueberall'], funktion: ['deko'] }, ...extra,
});

export const DEKO_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_springbrunnen', name: 'Springbrunnen', payload: springbrunnen, tags: ['wasser', 'platz', 'rund'],
    description: 'Runder Brunnen mit Steinziegel-Becken, Mittelsäule, Wasserspeier und Seelaterne obenauf.',
    facets: { kategorie: ['dekoration'], stil: ['klassisch', 'mittelalterlich'], biom: ['ueberall'], funktion: ['deko', 'wasserquelle', 'versammlung'] }, gaps: ['minecraft:water'] },
  { id: 'bld_sitzbank', name: 'Parkbank', payload: sitzbank, tags: ['bank', 'park', 'klein'],
    description: 'Bank aus Fichtentreppen mit Falltür-Lehnen, Blumentöpfen und Hecke dahinter.',
    facets: { kategorie: ['dekoration'], stil: ['klassisch', 'rustikal'], biom: ['ueberall'], funktion: ['deko'] } },
  { id: 'bld_lagerfeuer', name: 'Lagerfeuerplatz', payload: lagerfeuer, tags: ['feuer', 'rast', 'klein'],
    description: 'Lagerfeuer im Steinkreis mit vier Baumstamm-Sitzen, Fass und Laterne.',
    facets: { kategorie: ['dekoration'], stil: ['rustikal'], biom: ['ueberall', 'taiga'], funktion: ['versammlung', 'deko'] },
    tips: ['Ein Heuballen unter dem Lagerfeuer macht daraus ein weit sichtbares Rauchsignal.'] },
  { id: 'bld_zeltlager', name: 'Zeltlager', payload: zeltlager, tags: ['zelt', 'expedition', 'erste-nacht'],
    description: 'Zwei Wollzelte mit Betten, Lagerfeuer, Kiste und Werkbank – die erste Nacht auf einer Expedition.',
    facets: { kategorie: ['basis'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['wohnen'] } },
  STATUE('bld_statue_creeper', 'Creeper-Statue', creeper, 'Creeper in Originalproportionen aus Beton, mit Gesicht nach Süden.', { tags: ['statue', 'mob', 'creeper'] }),
  STATUE('bld_schwert_im_stein', 'Schwert im Stein', schwertImStein, 'Riesiges Schwert mit goldenem Heft in einem bemoosten Fels.', { facets: { kategorie: ['statue'], stil: ['fantasy', 'mittelalterlich'], biom: ['ueberall'], funktion: ['deko', 'orientierung'] } }),
  STATUE('bld_statue_golem', 'Eisengolem-Statue', eisengolem, 'Eisengolem aus Eisenblöcken mit geschnitztem Kürbis als Kopf. Achtung: so gebaut erwacht er im Spiel zum Leben.', { tags: ['statue', 'golem'], tips: ['Statt Kürbis Stein verwenden, wenn er Statue bleiben soll – sonst entsteht ein echter Golem.'] }),
  STATUE('bld_statue_ritter', 'Ritter-Statue', ritter, 'Stehender Ritter aus Andesit und Eisen mit Lanze (Blitzableiter) und Schild.', { facets: { kategorie: ['statue'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['deko'] } }),
  { id: 'bld_heissluftballon', name: 'Heißluftballon', payload: heissluftballon, tags: ['ballon', 'luft', 'gestreift'],
    description: 'Gestreifter Woll-Ballon an Ketten mit Holzkorb und Lagerfeuer als Brenner.',
    facets: { kategorie: ['fahrzeug'], stil: ['fantasy'], biom: ['ueberall'], funktion: ['deko', 'aussicht'] } },
  { id: 'bld_segelschiff', name: 'Segelschiff', payload: segelschiff, tags: ['schiff', 'segel', 'hafen'],
    description: 'Zweimaster mit Rumpf aus Schwarzeiche, Achterkajüte, Wollsegeln und Flagge.',
    facets: { kategorie: ['fahrzeug'], stil: ['kuestenstil', 'mittelalterlich'], biom: ['kueste', 'ozean'], funktion: ['deko', 'wohnen'] },
    tips: ['Ins Wasser setzen: der Rumpf liegt mit y 0–2 unter der Wasserlinie.'] },
  { id: 'bld_weihnachtsbaum', name: 'Weihnachtsbaum', payload: weihnachtsbaum, tags: ['fest', 'winter', 'geschenke'],
    description: 'Geschmückte Fichte mit bunten Glaskugeln, Leuchtstern und drei Shulker-Kisten als Geschenke.',
    facets: { kategorie: ['dekoration'], stil: ['nordisch'], biom: ['schnee', 'ueberall'], funktion: ['deko'] } },
  { id: 'bld_uhrturm', name: 'Uhrturm', payload: uhrturm, tags: ['turm', 'uhr', 'stadt'],
    description: 'Ziegelturm auf Steinsockel mit vier Zifferblättern aus Quarz, Glockenstube und Prismarin-Helm.',
    facets: { kategorie: ['wahrzeichen'], stil: ['klassisch'], biom: ['ueberall'], funktion: ['aussicht', 'orientierung'] } },
  { id: 'bld_spiralturm', name: 'Amethyst-Spiralturm', payload: spiralturm, tags: ['turm', 'spirale', 'magisch'],
    description: 'Kalzit-Turm, um den sich eine doppelte Amethyst-Spirale windet, mit Purpur-Kuppel und Endstab.',
    facets: { kategorie: ['wahrzeichen'], stil: ['fantasy'], biom: ['ueberall', 'hoehle'], funktion: ['aussicht', 'deko'] } },
  { id: 'bld_obelisk', name: 'Obelisk', payload: obelisk, tags: ['säule', 'wüste', 'gold'],
    description: 'Schlanker Sandstein-Obelisk auf Stufensockel mit goldener Spitze.',
    facets: { kategorie: ['wahrzeichen'], stil: ['antik', 'wuestenstil'], biom: ['wueste', 'ueberall'], funktion: ['orientierung', 'deko'] } },
  { id: 'bld_triumphbogen', name: 'Triumphbogen', payload: triumphbogen, tags: ['bogen', 'quarz', 'tor'],
    description: 'Quarz-Triumphbogen mit Hauptdurchgang, zwei Seitenbögen, Säulen und goldener Attika.',
    facets: { kategorie: ['wahrzeichen'], stil: ['antik', 'klassisch'], biom: ['ueberall'], funktion: ['verbindung', 'deko'] } },
  { id: 'bld_leuchtfeuer', name: 'Leuchtfeuer-Pyramide', payload: leuchtfeuerPyramide, tags: ['beacon', 'effekte', 'endgame'],
    description: 'Volle vierstufige Leuchtfeuer-Pyramide (Eisen, Gold, Smaragd, Diamant) mit hellblauem Strahl.',
    facets: { kategorie: ['wahrzeichen'], stil: ['technisch'], biom: ['ueberall'], funktion: ['orientierung', 'ressourcen'] },
    tips: ['Vier Stufen schalten den Zweiteffekt frei; die Mischung der Erzblöcke ist egal.', 'Gefärbtes Glas über dem Leuchtfeuer färbt den Strahl.'],
    inspiration: [WIKI('Beacon', 'Leuchtfeuer')] },
];
