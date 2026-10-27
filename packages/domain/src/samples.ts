import { createPayload } from '../../voxel/src/validation.js';
import type { BlockState, Cell, VoxelPayload } from '../../voxel/src/types.js';
import { addAssetVersion, createAsset } from './library.js';
import { facetTags } from './catalog.js';
import type { BuildingFacets } from './catalog.js';
import type { Asset, AssetVersion, Connector } from './types.js';

/**
 * Original synthetic sample modules (no imported world, no Minecraft textures).
 * Marked demo=true so the UI labels them as samples. Profile is deliberately
 * unverified.
 */
export const SAMPLE_PROFILE = 'java:registry-unverified';

function build(size: [number, number, number], palette: BlockState[], fill: (set: (x: number, y: number, z: number, i: number) => void) => void): VoxelPayload {
  const cells = new Map<string, Cell>();
  fill((x, y, z, paletteIndex) => { cells.set(`${x},${y},${z}`, { position: [x, y, z], kind: 'block', paletteIndex }); });
  return createPayload({ schemaVersion: 1, profileId: SAMPLE_PROFILE, bounds: { min: [0, 0, 0], maxExclusive: size }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells: [...cells.values()], blockEntities: [] });
}

const joint = (id: string, position: [number, number, number], normal: [number, number, number]): Connector =>
  ({ id, position, normal, up: [0, 1, 0], type: 'wall_joint', profile: 'wall_2x5' });

/** 4×8×4 tower; wall joints centred on all four faces at ground level. */
export function sampleTowerPayload(): VoxelPayload {
  return build([4, 8, 4], [
    { id: 'minecraft:stone_bricks', properties: {} }, { id: 'minecraft:oak_planks', properties: {} },
    { id: 'minecraft:oak_log', properties: { axis: 'y' } }, { id: 'minecraft:cobblestone', properties: {} },
  ], set => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) {
      const edge = x === 0 || x === 3 || z === 0 || z === 3, corner = (x === 0 || x === 3) && (z === 0 || z === 3);
      if (y === 0) set(x, y, z, 3);
      else if (corner) set(x, y, z, 2);
      else if (edge && !(y === 4 && (x === 1 || z === 1))) set(x, y, z, 0); // one window per face
      else if (y === 3 && !edge) set(x, y, z, 1);
    }
    for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) if ((x + z) % 2 === 0 && (x === 0 || x === 3 || z === 0 || z === 3)) set(x, 7, z, 0);
  });
}

/** 6×5×2 wall segment with joints on its two short ends. */
export function sampleWallPayload(): VoxelPayload {
  return build([6, 5, 2], [
    { id: 'minecraft:stone_bricks', properties: {} }, { id: 'minecraft:mossy_stone_bricks', properties: {} }, { id: 'minecraft:cobblestone', properties: {} },
  ], set => {
    for (let x = 0; x < 6; x++) for (let z = 0; z < 2; z++) {
      set(x, 0, z, 2);
      for (let y = 1; y < 4; y++) set(x, y, z, (x * 7 + y * 3 + z) % 5 === 0 ? 1 : 0);
      if (x % 2 === 0) set(x, 4, z, 0);
    }
  });
}

/** 6×5×2 gate segment: same joints as the wall, with an opening. */
export function sampleGatePayload(): VoxelPayload {
  return build([6, 5, 2], [
    { id: 'minecraft:stone_bricks', properties: {} }, { id: 'minecraft:oak_fence', properties: { north: 'false', east: 'true', south: 'false', west: 'true', waterlogged: 'false' } },
    { id: 'minecraft:cobblestone', properties: {} },
  ], set => {
    for (let x = 0; x < 6; x++) for (let z = 0; z < 2; z++) {
      const opening = x >= 2 && x <= 3;
      set(x, 0, z, 2);
      for (let y = 1; y < 4; y++) if (!opening || y === 3) set(x, y, z, 0);
      if (opening && z === 0) set(x, 2, z, 1);
      set(x, 4, z, 0);
    }
  });
}

/** Declared catalogue facets of the sample modules (B9). Geometry and ids are unchanged. */
export const SAMPLE_FACETS: Readonly<Record<string, BuildingFacets>> = {
  sample_tower: { kategorie: ['befestigung'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['verteidigung', 'aussicht'] },
  sample_wall: { kategorie: ['befestigung'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['verteidigung'] },
  sample_gate: { kategorie: ['befestigung'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['verteidigung', 'verbindung'] },
};

export interface SampleLibrary { readonly assets: readonly Asset[]; readonly versions: readonly AssetVersion[] }

export async function createSampleLibrary(): Promise<SampleLibrary> {
  const provenance = { author: 'Minecraft-Bauplaner', source: 'eigener synthetischer Entwurf', license: 'frei für dieses Projekt' };
  const wallJoints = [joint('west', [0, 0, 1], [-1, 0, 0]), joint('east', [6, 0, 1], [1, 0, 0])];
  const specs = [
    { id: 'sample_tower', name: 'Eckturm', tags: ['befestigung', 'turm'], description: 'Vierseitiger Turm mit Anschlüssen für Mauern auf allen Seiten.', payload: sampleTowerPayload(),
      connectors: [joint('west', [0, 0, 2], [-1, 0, 0]), joint('east', [4, 0, 2], [1, 0, 0]), joint('north', [2, 0, 0], [0, 0, -1]), joint('south', [2, 0, 4], [0, 0, 1])] },
    { id: 'sample_wall', name: 'Mauersegment', tags: ['befestigung', 'mauer'], description: 'Sechs Blöcke lange Wehrmauer mit Zinnen.', payload: sampleWallPayload(), connectors: wallJoints },
    { id: 'sample_gate', name: 'Tor', tags: ['befestigung', 'mauer', 'tor'], description: 'Mauersegment mit Durchgang und Zaungitter.', payload: sampleGatePayload(), connectors: wallJoints },
  ];
  const assets: Asset[] = [], versions: AssetVersion[] = [];
  for (const spec of specs) {
    const asset = createAsset({ id: spec.id, name: spec.name, description: spec.description, tags: [...spec.tags, ...facetTags(SAMPLE_FACETS[spec.id] ?? {})], provenance, demo: true });
    const r = await addAssetVersion(asset, { payload: spec.payload, label: '1.0', connectors: spec.connectors, source: { format: 'demo' } });
    assets.push(r.asset); versions.push(r.version);
  }
  return { assets, versions };
}
