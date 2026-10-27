import type { BlockState, Bounds, Transform, Vec3, VoxelPayload } from './types.js';
import { assertVec3, createPayload, validatePayload } from './validation.js';

function checkTransform(t: Transform): void {
  assertVec3(t.position, 'transform.position');
  if (![0,1,2,3].includes(t.quarterTurns) || typeof t.mirrorX !== 'boolean') throw new Error('Ungültige diskrete Transformation');
}
function vector(v: Vec3, t: Transform): Vec3 {
  let [x,y,z] = v;
  if (t.mirrorX) x = -x;
  for (let i = 0; i < t.quarterTurns; i++) [x,z] = [-z,x];
  return [x === 0 ? 0 : x, y, z === 0 ? 0 : z];
}
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
const directionVectors: Record<string, Vec3> = {
  north: [0,0,-1], east: [1,0,0], south: [0,0,1], west: [-1,0,0], up: [0,1,0], down: [0,-1,0],
};
function direction(name: string, t: Transform): string {
  const transformed = vector(directionVectors[name]!, t);
  return Object.entries(directionVectors).find(([,v])=>v.every((n,i)=>n===transformed[i]))![0];
}
const horizontal = ['north','east','south','west'];
function matches(p: Readonly<Record<string,string>>, expected: Record<string, readonly string[]>): boolean {
  return Object.keys(p).length === Object.keys(expected).length && Object.entries(expected).every(([k,values])=>values.includes(p[k]!));
}
export interface StateTransformResult { readonly state: BlockState; readonly resolved: boolean }
/** Intentionally small, explicit rule catalogue. No generic property-name guessing. */
export function transformBlockState(state: BlockState, t: Transform): StateTransformResult {
  checkTransform(t);
  if (!t.mirrorX && t.quarterTurns === 0) return { state, resolved: true };
  const p = state.properties;
  const next: Record<string,string> = { ...p };
  // Vanilla stores every orientation in block-state properties, so a vanilla
  // state without properties is orientation-free. Mod namespaces stay unresolved.
  if (state.id.startsWith('minecraft:') && matches(p, {})) {
    return { state, resolved: true };
  }
  if (state.id === 'minecraft:oak_log' && matches(p, { axis: ['x','y','z'] })) {
    if (t.quarterTurns % 2 && p.axis !== 'y') next.axis = p.axis === 'x' ? 'z' : 'x';
  } else if (state.id === 'minecraft:barrel' && matches(p, { facing: Object.keys(directionVectors), open: ['true','false'] })) {
    next.facing = direction(p.facing!, t);
  } else if (state.id === 'minecraft:oak_stairs' && matches(p, {
    facing: horizontal, half: ['top','bottom'], shape: ['straight','inner_left','inner_right','outer_left','outer_right'], waterlogged: ['true','false'],
  })) {
    next.facing = direction(p.facing!, t);
    if (t.mirrorX && p.shape !== 'straight') next.shape = p.shape!.endsWith('_left') ? p.shape!.replace('_left','_right') : p.shape!.replace('_right','_left');
  } else if (state.id === 'minecraft:oak_fence' && matches(p, {
    north: ['true','false'], east: ['true','false'], south: ['true','false'], west: ['true','false'], waterlogged: ['true','false'],
  })) {
    for (const name of horizontal) next[direction(name, t)] = p[name]!;
  } else return { state, resolved: false };
  return { state: { id: state.id, properties: next }, resolved: true };
}
export interface TransformIssue {
  readonly code: 'UNRESOLVED_BLOCK_STATE' | 'UNRESOLVED_BLOCK_ENTITY';
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
    if (!result.resolved) issues.push({ code: 'UNRESOLVED_BLOCK_STATE', path: `palette[${i}]`, message: `Keine geprüfte Transformationsregel für ${s.id}; Zustand unverändert erhalten.` });
    return result.state;
  });
  const blockEntities = payload.blockEntities.map((e,i)=>{
    if (!identity) issues.push({ code: 'UNRESOLVED_BLOCK_ENTITY', path: `blockEntities[${i}]`, message: 'Position der Zuordnung transformiert, NBT unverändert erhalten; semantischer Adapter fehlt.' });
    return { ...e, position: transformCellPosition(e.position,payload.pivot,t) };
  });
  const output = createPayload({ ...payload, bounds: bounds(payload.bounds,payload.pivot,t), pivot: t.position, palette,
    cells: payload.cells.map(c=>({ ...c, position: transformCellPosition(c.position,payload.pivot,t) })), blockEntities,
  });
  return { payload: output, issues: Object.freeze(issues), semanticsResolved: issues.length === 0 };
}
