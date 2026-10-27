import { createPayload } from '../../../packages/voxel/src/index.js';
import type { Cell, VoxelPayload } from '../../../packages/voxel/src/index.js';
/** Original synthetic study, not a reconstruction of a supplied world or harbour atlas. */
export function makeDemo(): VoxelPayload {
  const cells = new Map<string, Cell>();
  const set = (x: number, y: number, z: number, paletteIndex: number) =>
    cells.set(`${x},${y},${z}`, { position: [x,y,z], kind: 'block', paletteIndex });
  // Quay and wooden jetty.
  for (let x=-7;x<=7;x++) for (let z=-5;z<=4;z++) {
    set(x,0,z,0);
    if (x>=-5 && x<=5 && z>=-3 && z<=3) set(x,1,z,1);
  }
  for (let z=5;z<=9;z++) for (let x=-2;x<=2;x++) set(x,0,z,1);
  for (const x of [-2,2]) for (const z of [5,9]) { set(x,1,z,2); set(x,2,z,2); }
  // Open timber pavilion with front entrance and a stepped roof.
  for (const x of [-5,5]) for (const z of [-3,3]) for (let y=2;y<=6;y++) set(x,y,z,2);
  for (let x=-5;x<=5;x++) { set(x,6,-3,1); set(x,6,3,1); }
  for (let z=-3;z<=3;z++) { set(-5,6,z,1); set(5,6,z,1); }
  for (let tier=0;tier<4;tier++) for (let x=-6;x<=6;x++) {
    set(x,7+tier,-4+tier,0); set(x,7+tier,4-tier,0);
  }
  for (let x=-5;x<=5;x++) {set(x,2,-3,1); if(Math.abs(x)>2) set(x,3,-3,1);}
  return createPayload({ schemaVersion: 1, profileId: 'demo:synthetic-java-unverified',
    bounds: { min: [-7,0,-5], maxExclusive: [8,11,10] }, pivot: [0,0,0], sourceOrigin: [0,0,0],
    palette: [
      {id:'minecraft:stone',properties:{}},
      {id:'minecraft:oak_log',properties:{axis:'x'}},
      {id:'minecraft:oak_log',properties:{axis:'y'}},
    ], cells:[...cells.values()], blockEntities:[],
  });
}
