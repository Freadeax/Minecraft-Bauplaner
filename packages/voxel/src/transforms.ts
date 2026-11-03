import type { StateTransformResult } from './states.js';
import type { Bounds, Transform, Vec3, VoxelPayload } from './types.js';
import { adoptPayload, assertVec3, createPayload, isSealedPayload, sealTransportedPayload, stateKey, validatePayload } from './validation.js';
import { checkTransform, transformBlockState, transformVector as vector } from './states.js';
import { entityLabel, transformEntity } from './entities.js';
import { transformBlockEntity } from './nbtTransforms.js';

function point(v: Vec3, pivot: Vec3, t: Transform): Vec3 {
  const r = vector([v[0]-pivot[0], v[1]-pivot[1], v[2]-pivot[2]], t);
  return [r[0]+t.position[0], r[1]+t.position[1], r[2]+t.position[2]];
}
export function transformBoundaryPoint(v: Vec3, pivot: Vec3, t: Transform): Vec3 {
  assertVec3(v); assertVec3(pivot, 'pivot'); checkTransform(t);
  const result = point(v, pivot, t); assertVec3(result, 'transformed point'); return result;
}
export function transformCellPosition(v: Vec3, pivot: Vec3, t: Transform): Vec3 {
  assertVec3(v); assertVec3(pivot, 'pivot'); checkTransform(t);
  // Rotating a unit cube rotates its centre, not its minimum corner.
  const centre = point([v[0]+0.5, v[1]+0.5, v[2]+0.5], pivot, t);
  const result: Vec3 = [Math.floor(centre[0]), Math.floor(centre[1]), Math.floor(centre[2])];
  assertVec3(result, 'transformed cell'); return result;
}
function bounds(b: Bounds, pivot: Vec3, t: Transform): Bounds {
  const corners: Vec3[] = [];
  for (const x of [b.min[0],b.maxExclusive[0]])
    for (const y of [b.min[1],b.maxExclusive[1]])
      for (const z of [b.min[2],b.maxExclusive[2]]) corners.push(point([x,y,z], pivot, t));
  const min: Vec3 = [Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.min(...corners.map(p=>p[2]))];
  const maxExclusive: Vec3 = [Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[2]))];
  assertVec3(min); assertVec3(maxExclusive); return { min, maxExclusive };
}
function unresolvedMessage(id: string, r: StateTransformResult): string {
  if (r.reason === 'schema-mismatch') return `${id}: Properties passen nicht exakt zur Katalogfamilie „${r.family}“; Zustand unverändert erhalten.`;
  if (r.reason === 'unrepresentable') return `${id}: Transformation in Familie „${r.family}“ nicht als Blockzustand darstellbar; Zustand unverändert erhalten.`;
  return `Keine geprüfte Transformationsregel für ${id}; Zustand unverändert erhalten.`;
}
export interface TransformIssue {
  readonly code: 'UNRESOLVED_BLOCK_STATE' | 'UNRESOLVED_BLOCK_ENTITY' | 'UNRESOLVED_ENTITY';
  readonly path: string;
  readonly message: string;
}
export interface PayloadTransformResult {
  readonly payload: VoxelPayload;
  readonly issues: readonly TransformIssue[];
  /** Only state/NBT transformation completeness; never a registry or export approval. */
  readonly semanticsResolved: boolean;
}
export function transformPayload(payload: VoxelPayload, t: Transform): PayloadTransformResult {
  validatePayload(payload); checkTransform(t);
  const identity = !t.mirrorX && t.quarterTurns === 0 && payload.pivot.every((n,i)=>n===t.position[i]);
  const issues: TransformIssue[] = [];
  const palette = payload.palette.map((s,i)=>{
    const result = transformBlockState(s,t);
    if (!result.resolved) issues.push({ code: 'UNRESOLVED_BLOCK_STATE', path: `palette[${i}]`, message: unresolvedMessage(s.id, result) });
    return result.state;
  });
  // NBT-01: each block entity follows the rule of its family (nbtTransforms.ts); the block at the cell names
  // the type when the entry has no id. Unresolved entries keep their NBT and block the semantic approval.
  let blockAt: Map<string, string> | null = null;
  const blockIdAt = (p: Vec3): string | undefined => {
    if (!blockAt) {
      const wanted = new Set(payload.blockEntities.map(e => e.position.join(',')));
      blockAt = new Map();
      for (const c of payload.cells) if (c.kind === 'block' && wanted.has(c.position.join(','))) blockAt.set(c.position.join(','), payload.palette[c.paletteIndex]!.id);
    }
    return blockAt.get(p.join(','));
  };
  const blockEntities = payload.blockEntities.map((e,i)=>{
    const to = transformCellPosition(e.position,payload.pivot,t);
    if (identity) return { ...e, position: to };
    const r = transformBlockEntity(e, to, t, blockIdAt(e.position));
    if (!r.resolved) issues.push({ code: 'UNRESOLVED_BLOCK_ENTITY', path: `blockEntities[${i}]`, message: r.note ?? 'BlockEntity ohne geprüfte Transformation; NBT unverändert erhalten.' });
    return r.entity;
  });
  const entities = payload.entities?.map((e,i)=>{
    if (identity) return e;
    const r = transformEntity(e,payload.pivot,t);
    if (!r.resolved) issues.push({ code: 'UNRESOLVED_ENTITY', path: `entities[${i}]`, message: `${entityLabel(e)}: ${r.note ?? 'Transformation nicht geprüft'}` });
    return r.entity;
  });
  if (isSealedPayload(payload)) {
    // Sealed input (SIZE-01): its cells are validated already and a transform maps integer cells one to one,
    // so the output is built frozen without checking every cell again. An identity transform keeps the payload.
    if (identity && issues.length === 0 && palette.every((st, i) => st === payload.palette[i] || stateKey(st) === stateKey(payload.palette[i]!)))
      return { payload, issues: Object.freeze(issues), semanticsResolved: true };
    const [px, py, pz] = payload.pivot, [tx, ty, tz] = t.position, mirror = t.mirrorX, turns = ((t.quarterTurns % 4) + 4) % 4;
    const cells = payload.cells.map(c => {
      let x = c.position[0] + 0.5 - px, z = c.position[2] + 0.5 - pz;
      if (mirror) x = -x;
      for (let i = 0; i < turns; i++) { const nx = -z; z = x; x = nx; }
      const position = Object.freeze([Math.floor(x + tx), c.position[1] - py + ty, Math.floor(z + tz)] as Vec3);
      return Object.freeze({ ...c, position });
    });
    const head = { ...payload, bounds: bounds(payload.bounds,payload.pivot,t), pivot: t.position, palette, cells, blockEntities, ...(entities && { entities }) };
    return { payload: sealTransportedPayload(head, {}), issues: Object.freeze(issues), semanticsResolved: issues.length === 0 };
  }
  // Fresh cells and entity wrappers. Palette states and NBT data are shared with the input, so the copy is only
  // skipped when the input is a sealed (deeply frozen) payload; e.g. records read from IndexedDB are copied.
  const output = (isSealedPayload(payload) ? adoptPayload : createPayload)({ ...payload, bounds: bounds(payload.bounds,payload.pivot,t), pivot: t.position, palette,
    cells: payload.cells.map(c=>({ ...c, position: transformCellPosition(c.position,payload.pivot,t) })), blockEntities,
    ...(entities && { entities }),
  });
  return { payload: output, issues: Object.freeze(issues), semanticsResolved: issues.length === 0 };
}
