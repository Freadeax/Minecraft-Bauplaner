// EDIT-04 (mod side): cells of curves and symmetric images computed by the planner, which the mod's Java port
// (mods/bauplaner-bridge/mod-core/.../edit/Curve.java, Symmetry.java) must reproduce exactly.
// Usage: node scripts/fixtures/make_edit_vectors.mjs [--check]   (needs `npm run build:core`)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { curveCells, symmetryGroup, symmetryImage } from '../../dist/domain/src/index.js';
import { transformBlockState } from '../../dist/voxel/src/index.js';

const OUT = 'fixtures/edit/mod-edit-vectors.json';
const sortCells = cells => cells.map(c => [...c]).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);

const CURVES = [
  { name: 'Linie diagonal', points: [[0, 64, 0], [7, 64, 3]], options: { profile: 'tube', radius: 0 } },
  { name: 'Linie steigend', points: [[0, 64, 0], [5, 70, -4], [12, 66, 2]], options: { profile: 'tube', radius: 0 } },
  { name: 'Rohr r1', points: [[-3, 70, 2], [4, 72, 9], [10, 70, 4]], options: { profile: 'tube', radius: 1 } },
  { name: 'Weg 3 S-Kurve', points: [[0, 64, 0], [8, 64, 6], [16, 64, 0], [24, 64, 6]], options: { profile: 'road', width: 3 } },
  { name: 'Weg 4 gerade Stücke', points: [[0, 64, 0], [10, 64, 0], [10, 64, 10]], options: { profile: 'road', width: 4, tension: 0 } },
  { name: 'Mauer Ring', points: [[0, 64, 0], [12, 64, 0], [12, 64, 12], [0, 64, 12]], options: { profile: 'wall', width: 2, height: 3, closed: true } },
  { name: 'Mauer halbe Spannung', points: [[-20, 80, -20], [-5, 82, -14], [3, 80, -25]], options: { profile: 'wall', width: 1, height: 2, tension: 0.5 } },
];

const SYMMETRIES = [
  { mirrorX: true, mirrorZ: false, rotate: 1, centre2: [10, 0] },
  { mirrorX: false, mirrorZ: true, rotate: 1, centre2: [0, 7] },
  { mirrorX: true, mirrorZ: true, rotate: 1, centre2: [3, -5] },
  { mirrorX: false, mirrorZ: false, rotate: 2, centre2: [1, 1] },
  { mirrorX: false, mirrorZ: false, rotate: 4, centre2: [4, -2] },
  { mirrorX: true, mirrorZ: false, rotate: 4, centre2: [-1, 3] },
];
const CELLS = [[3, 64, 2], [-4, 70, 9], [0, 64, 0]];
const STATES = [
  { id: 'minecraft:oak_door', properties: { facing: 'north', half: 'lower', hinge: 'left', open: 'false' } },
  { id: 'minecraft:stone_brick_stairs', properties: { facing: 'east', half: 'bottom', shape: 'inner_left' } },
  { id: 'minecraft:chest', properties: { facing: 'south', type: 'left' } },
  { id: 'minecraft:rail', properties: { shape: 'north_east' } },
  { id: 'minecraft:oak_log', properties: { axis: 'x' } },
  { id: 'minecraft:oak_sign', properties: { rotation: '3' } },
];

export function vectors() {
  const curves = CURVES.map(c => ({ ...c, cells: sortCells(curveCells(c.points, c.options)) }));
  const symmetries = SYMMETRIES.map(s => {
    const group = symmetryGroup(s);
    return {
      symmetry: s,
      group: group.map(t => [t.quarterTurns, t.mirrorX]),
      images: CELLS.map(cell => group.map(t => symmetryImage(cell, t, s))),
      states: STATES.map(st => group.map(t => { const r = transformBlockState(st, { ...t, position: [0, 0, 0] }); return { id: r.state.id, properties: r.state.properties }; })),
    };
  });
  return { note: 'Erzeugt von scripts/fixtures/make_edit_vectors.mjs aus dem Planer (EDIT-04); die Mod (Curve.java, Symmetry.java) muss genau diese Werte liefern.', curves, cells: CELLS, states: STATES, symmetries };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop())) {
  const text = JSON.stringify(vectors(), null, 1) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(OUT, 'utf8') !== text) { console.error(`${OUT} ist veraltet: node scripts/fixtures/make_edit_vectors.mjs`); process.exit(1); }
    console.log(`${OUT} aktuell`);
  } else {
    mkdirSync('fixtures/edit', { recursive: true });
    writeFileSync(OUT, text);
    console.log(`${OUT} geschrieben`);
  }
}
