import { transformBoundaryPoint } from '../../voxel/src/transforms.js';
import type { Bounds, Transform, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { resolveProject } from './compose.js';
import { newId } from './hash.js';
import { checkConnectorShape } from './library.js';
import type { Operation } from './project.js';
import { DomainError } from './types.js';
import type { AssetVersion, Connector, ConnectorLink, Handedness, Instance, Project } from './types.js';

/**
 * Connector geometry, snapping and stored links (P2-02, R-009).
 *
 * A connector is an integer point on a face of the asset bounds plus an outward
 * normal and an up vector. Two connectors mate when, in project coordinates,
 * positions are equal, normals are opposite, ups are equal, type and profile
 * match and handedness is complementary (left↔right, or both symmetric). All geometry goes through the shared voxel transform; voxel conflicts
 * are decided by `resolveProject`, never by a second rule set here.
 */

export const FACES = {
  west: [-1, 0, 0], east: [1, 0, 0], down: [0, -1, 0], up: [0, 1, 0], north: [0, 0, -1], south: [0, 0, 1],
} as const satisfies Record<string, Vec3>;
export type FaceName = keyof typeof FACES;

const eq = (a: Vec3, b: Vec3): boolean => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const neg = (v: Vec3): Vec3 => [-v[0] || 0, -v[1] || 0, -v[2] || 0];
const isAxis = (v: Vec3): boolean => v.filter(n => n !== 0).length === 1 && v.every(n => n === 0 || n === 1 || n === -1);
const axisOf = (v: Vec3): 0 | 1 | 2 => v.findIndex(n => n !== 0) as 0 | 1 | 2;

export function faceOf(normal: Vec3): FaceName | null {
  return (Object.keys(FACES) as FaceName[]).find(f => eq(FACES[f], normal)) ?? null;
}

/** Maximum simultaneous links of a connector (default 1). */
export const capacityOf = (c: Connector): number => c.maxLinks ?? 1;

export interface ConnectorIssue {
  readonly connectorId: string;
  readonly severity: 'error' | 'warning';
  readonly code: 'SHAPE' | 'NORMAL' | 'UP' | 'OFF_FACE' | 'OUTSIDE_FACE' | 'NO_BLOCK';
  readonly message: string;
}

/**
 * Geometric validation against the payload bounds. Errors make a connector
 * unusable; warnings (no block touches the anchor) stay visible but allowed.
 */
export function validateConnectors(payload: VoxelPayload, connectors: readonly Connector[]): ConnectorIssue[] {
  const issues: ConnectorIssue[] = [];
  try { checkConnectorShape(connectors); } catch (e) {
    return [{ connectorId: '', severity: 'error', code: 'SHAPE', message: e instanceof Error ? e.message : String(e) }];
  }
  const occupied = new Set(payload.cells.filter(c => c.kind === 'block').map(c => c.position.join(',')));
  const { min, maxExclusive: max } = payload.bounds;
  for (const c of connectors) {
    const err = (code: ConnectorIssue['code'], message: string) => issues.push({ connectorId: c.id, severity: 'error', code, message: `${c.id}: ${message}` });
    if (!isAxis(c.normal)) { err('NORMAL', 'Normale muss eine Achsrichtung sein (z. B. 1,0,0)'); continue; }
    if (!isAxis(c.up)) { err('UP', 'Up muss eine Achsrichtung sein'); continue; }
    if (axisOf(c.up) === axisOf(c.normal)) { err('UP', 'Up muss senkrecht zur Normale stehen'); continue; }
    const a = axisOf(c.normal), plane = c.normal[a] > 0 ? max[a] : min[a];
    if (c.position[a] !== plane) { err('OFF_FACE', `liegt nicht auf der Fläche ${faceOf(c.normal)} (${'xyz'[a]} = ${plane} erwartet)`); continue; }
    const outside = [0, 1, 2].filter(i => i !== a && (c.position[i]! < min[i]! || c.position[i]! > max[i]!));
    if (outside.length) { err('OUTSIDE_FACE', `liegt außerhalb der Fläche (${outside.map(i => 'xyz'[i]).join(', ')})`); continue; }
    const touching = anchorCells(c).some(p => occupied.has(p.join(',')));
    if (!touching) issues.push({ connectorId: c.id, severity: 'warning', code: 'NO_BLOCK', message: `${c.id}: kein Block berührt den Anschlusspunkt` });
  }
  return issues;
}

/** The up to four cells inside the face layer that touch the connector anchor. */
export function anchorCells(c: Connector): Vec3[] {
  if (!isAxis(c.normal)) return [];
  const a = axisOf(c.normal), inner = c.normal[a] > 0 ? c.position[a] - 1 : c.position[a];
  const [u, v] = [0, 1, 2].filter(i => i !== a) as [number, number];
  const cells: Vec3[] = [];
  for (const du of [-1, 0]) for (const dv of [-1, 0]) {
    const p = [0, 0, 0]; p[a] = inner; p[u] = c.position[u]! + du; p[v] = c.position[v]! + dv;
    cells.push(p as unknown as Vec3);
  }
  return cells;
}

const directionOnly = (t: Transform): Transform => ({ position: [0, 0, 0], quarterTurns: t.quarterTurns, mirrorX: t.mirrorX });

const FLIP: Readonly<Record<Handedness, Handedness>> = { left: 'right', right: 'left' };

/** Connector in project coordinates for a placed version. Mirroring flips the handedness of asymmetric profiles. */
export function transformConnector(c: Connector, pivot: Vec3, t: Transform): Connector {
  const dir = directionOnly(t);
  const moved: Connector = { ...c, position: transformBoundaryPoint(c.position, pivot, t),
    normal: transformBoundaryPoint(c.normal, [0, 0, 0], dir), up: transformBoundaryPoint(c.up, [0, 0, 0], dir) };
  return t.mirrorX && c.handedness ? { ...moved, handedness: FLIP[c.handedness] } : moved;
}

/** Profiles fit when both are symmetric or one is left and the other right. */
export function handednessFits(a: Connector, b: Connector): boolean {
  return a.handedness === undefined ? b.handedness === undefined : b.handedness === FLIP[a.handedness];
}
/** Type, profile and handedness: everything but the geometry. */
const semanticMatch = (a: Connector, b: Connector): boolean => a.type === b.type && a.profile === b.profile && handednessFits(a, b);

export interface PlacedConnector {
  readonly instanceId: string;
  readonly connector: Connector;
  /** Connector in project coordinates. */
  readonly world: Connector;
}

export function placedConnectors(instance: Instance, version: AssetVersion): PlacedConnector[] {
  return version.connectors.map(connector => ({ instanceId: instance.id, connector, world: transformConnector(connector, version.payload.pivot, instance.transform) }));
}

/** Whether two project-space connectors fit: semantic match and exact geometric mate. */
export function connectorsMate(a: Connector, b: Connector): boolean {
  return semanticMatch(a, b) && eq(a.position, b.position) && eq(a.normal, neg(b.normal)) && eq(a.up, b.up);
}

const linkKey = (instanceId: string, connectorId: string): string => `${instanceId}\u0000${connectorId}`;

/** Number of stored links per connector (instanceId + connectorId). */
export function linkUsage(links: readonly ConnectorLink[], exceptInstanceId?: string): Map<string, number> {
  const usage = new Map<string, number>();
  for (const l of links) {
    if (exceptInstanceId && (l.a.instanceId === exceptInstanceId || l.b.instanceId === exceptInstanceId)) continue;
    for (const r of [l.a, l.b]) usage.set(linkKey(r.instanceId, r.connectorId), (usage.get(linkKey(r.instanceId, r.connectorId)) ?? 0) + 1);
  }
  return usage;
}

export type LinkState = 'ok' | 'missing-instance' | 'missing-version' | 'missing-connector' | 'mismatch' | 'misaligned' | 'over-capacity';
export interface LinkStatus { readonly link: ConnectorLink; readonly state: LinkState; readonly message: string }

/** Re-checks every stored link against the current placement. */
export function checkLinks(project: Project, versions: ReadonlyMap<string, AssetVersion>): LinkStatus[] {
  const usage = linkUsage(project.links);
  const lookup = (r: ConnectorLink['a']): PlacedConnector | LinkState => {
    const instance = project.instances.find(i => i.id === r.instanceId);
    if (!instance) return 'missing-instance';
    const version = versions.get(instance.assetVersionId);
    if (!version) return 'missing-version';
    return placedConnectors(instance, version).find(p => p.connector.id === r.connectorId) ?? 'missing-connector';
  };
  const text: Record<LinkState, string> = {
    'ok': 'verbunden', 'missing-instance': 'Instanz fehlt', 'missing-version': 'Bauteilversion fehlt', 'missing-connector': 'Anschluss existiert in dieser Version nicht',
    'mismatch': 'Typ, Profil oder Händigkeit passen nicht', 'misaligned': 'Anschlüsse liegen nicht mehr aufeinander', 'over-capacity': 'Nutzungsgrenze eines Anschlusses überschritten',
  };
  return project.links.map(link => {
    const a = lookup(link.a), b = lookup(link.b);
    let state: LinkState = 'ok';
    if (typeof a === 'string') state = a; else if (typeof b === 'string') state = b;
    else if (!semanticMatch(a.world, b.world)) state = 'mismatch';
    else if (!connectorsMate(a.world, b.world)) state = 'misaligned';
    else if ((usage.get(linkKey(a.instanceId, a.connector.id)) ?? 0) > capacityOf(a.connector)
      || (usage.get(linkKey(b.instanceId, b.connector.id)) ?? 0) > capacityOf(b.connector)) state = 'over-capacity';
    return { link, state, message: text[state] };
  });
}

export interface SnapCandidate {
  /** Stable key for UI lists and tests. */
  readonly key: string;
  /** Connector of the moving instance/version. */
  readonly connectorId: string;
  readonly target: { readonly instanceId: string; readonly connectorId: string };
  readonly transform: Transform;
  /** Unresolved voxel conflicts with the rest of the project at this placement. */
  readonly conflicts: number;
  /** Conflicts decided by an explicit override. */
  readonly overridden: number;
  /** Identical overlapping cells (counted once). */
  readonly duplicates: number;
  /** All free connector pairs that mate at this placement (including the target). */
  readonly pairs: readonly { readonly connectorId: string; readonly target: { readonly instanceId: string; readonly connectorId: string } }[];
  /** Manhattan distance of the pivot from the current/reference position. */
  readonly distance: number;
}

export interface SnapQuery {
  readonly project: Project;
  readonly versions: ReadonlyMap<string, AssetVersion>;
  /** Version to place. */
  readonly version: AssetVersion;
  /** Existing instance being moved; excluded from targets and conflict checks. */
  readonly instanceId?: string;
  /** Override flag of the moving instance (conflict resolution as in the composer). */
  readonly override?: boolean;
  /** Only targets on these instances. Default: all other instances. */
  readonly targetInstanceIds?: readonly string[];
  /** Also offer mirrored placements. Mirroring flips the handedness of asymmetric profiles, which is checked. */
  readonly allowMirror?: boolean;
  /** Reference point for sorting by distance; default the current transform position. */
  readonly reference?: Vec3;
  /** Default 50. */
  readonly limit?: number;
}

const boundsOverlap = (a: Bounds, b: Bounds): boolean => [0, 1, 2].every(i => a.min[i]! < b.maxExclusive[i]! && b.min[i]! < a.maxExclusive[i]!);

/** Project-space bounds of a version placed with transform `t` (same rule as the composer). */
export function placementBounds(version: AssetVersion, t: Transform): Bounds { return transformedBounds(version, t); }

function transformedBounds(version: AssetVersion, t: Transform): Bounds {
  const { min, maxExclusive: max } = version.payload.bounds, pivot = version.payload.pivot;
  const corners = [transformBoundaryPoint(min, pivot, t), transformBoundaryPoint(max, pivot, t)];
  return ({ min: [0, 1, 2].map(i => Math.min(corners[0]![i]!, corners[1]![i]!)) as unknown as Vec3,
    maxExclusive: [0, 1, 2].map(i => Math.max(corners[0]![i]!, corners[1]![i]!)) as unknown as Vec3 });
}

/**
 * Deterministic snap candidates. For every free connector of the moving version
 * and every free, compatible connector on another instance, each of the eight
 * discrete orientations (four without mirroring) is tried; an orientation is a
 * candidate when normals oppose and ups agree. The translation follows exactly
 * from the integer anchor, so the result always lies on the integer grid.
 * Voxel conflicts are computed by `resolveProject` on the moving instance plus
 * the instances whose bounds overlap (AABB as pre-filter only).
 * Order: conflicts, overridden, distance, more mated pairs, then target order,
 * connector ids and orientation as final tie-breakers.
 */
export function findSnapCandidates(q: SnapQuery): SnapCandidate[] {
  const { project, versions, version } = q;
  const moving = q.instanceId ? project.instances.find(i => i.id === q.instanceId) : undefined;
  if (q.instanceId && !moving) throw new DomainError('NOT_FOUND', `Instanz ${q.instanceId} existiert nicht`);
  const usage = linkUsage(project.links, q.instanceId);
  const invalidOwn = new Set(validateConnectors(version.payload, version.connectors).filter(i => i.severity === 'error').map(i => i.connectorId));
  const own = version.connectors.filter(c => !invalidOwn.has(c.id));
  const targetIds = new Set(q.targetInstanceIds ?? project.instances.map(i => i.id));
  const others: { instance: Instance; version: AssetVersion; connectors: PlacedConnector[]; bounds: Bounds }[] = [];
  project.instances.forEach(instance => {
    if (instance.id === q.instanceId) return;
    const v = versions.get(instance.assetVersionId);
    if (!v) return;
    const invalid = new Set(validateConnectors(v.payload, v.connectors).filter(i => i.severity === 'error').map(i => i.connectorId));
    others.push({ instance, version: v, bounds: transformedBounds(v, instance.transform),
      connectors: placedConnectors(instance, v).filter(p => !invalid.has(p.connector.id) && (usage.get(linkKey(p.instanceId, p.connector.id)) ?? 0) < capacityOf(p.connector)) });
  });
  const reference = q.reference ?? moving?.transform.position ?? [0, 0, 0];
  const orientations: Transform[] = [];
  for (const mirrorX of q.allowMirror ? [false, true] : [false])
    for (const quarterTurns of [0, 1, 2, 3] as const) orientations.push({ position: [0, 0, 0], quarterTurns, mirrorX });
  const seen = new Map<string, SnapCandidate>();
  const order = new Map(project.instances.map((i, n) => [i.id, n]));
  for (const other of others) {
    if (!targetIds.has(other.instance.id)) continue;
    for (const target of other.connectors) for (const c of own) {
      if (c.type !== target.world.type || c.profile !== target.world.profile) continue;
      for (const o of orientations) {
        const dir = transformConnector(c, [0, 0, 0], o);
        if (!handednessFits(dir, target.world) || !eq(dir.normal, neg(target.world.normal)) || !eq(dir.up, target.world.up)) continue;
        const pivot = version.payload.pivot;
        const rel = transformBoundaryPoint(c.position, pivot, o); // pivot mapped to origin
        const position: Vec3 = [target.world.position[0] - rel[0], target.world.position[1] - rel[1], target.world.position[2] - rel[2]];
        const transform: Transform = { position, quarterTurns: o.quarterTurns, mirrorX: o.mirrorX };
        const key = `${transform.position.join(',')}|${transform.quarterTurns}|${transform.mirrorX ? 'm' : ''}`;
        if (seen.has(key)) continue; // the same placement reached via another pair
        const probe: Instance = { id: moving?.id ?? '__snap_probe__', name: moving?.name ?? 'Neu', assetVersionId: version.id, transform, override: q.override ?? moving?.override ?? false };
        const bounds = transformedBounds(version, transform);
        const near = others.filter(x => boundsOverlap(bounds, x.bounds)).map(x => x.instance);
        const map = versions.has(version.id) ? versions : new Map([...versions, [version.id, version]]);
        const r = resolveProject({ ...project, instances: [...near, probe], links: [] }, map);
        const pairs: SnapCandidate['pairs'][number][] = [];
        const placed = placedConnectors(probe, version);
        const taken = new Set<string>();
        for (const p of placed) {
          if (invalidOwn.has(p.connector.id)) continue;
          for (const x of others) for (const t of x.connectors) {
            if (taken.has(linkKey(t.instanceId, t.connector.id)) || pairs.some(e => e.connectorId === p.connector.id)) continue;
            if (connectorsMate(p.world, t.world)) { pairs.push({ connectorId: p.connector.id, target: { instanceId: t.instanceId, connectorId: t.connector.id } }); taken.add(linkKey(t.instanceId, t.connector.id)); }
          }
        }
        const conflicts = r.conflicts.filter(x => x.instanceIds.includes(probe.id)).length;
        const overridden = r.overridden.filter(x => x.instanceIds.includes(probe.id)).length;
        let shared = 0;
        for (const ids of r.owners.values()) if (ids.length > 1 && ids.includes(probe.id)) shared++;
        seen.set(key, { key, connectorId: c.id, target: { instanceId: target.instanceId, connectorId: target.connector.id }, transform, conflicts, overridden,
          duplicates: shared - conflicts - overridden, pairs, distance: [0, 1, 2].reduce((n, i) => n + Math.abs(position[i]! - reference[i]!), 0) });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.conflicts - b.conflicts || a.overridden - b.overridden || a.distance - b.distance || b.pairs.length - a.pairs.length
    || order.get(a.target.instanceId)! - order.get(b.target.instanceId)! || cmp(a.target.connectorId, b.target.connectorId) || cmp(a.connectorId, b.connectorId)
    || a.transform.quarterTurns - b.transform.quarterTurns || Number(a.transform.mirrorX) - Number(b.transform.mirrorX)).slice(0, q.limit ?? 50);
}
const cmp = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

const lexLess = (a: readonly number[], b: readonly number[]): boolean => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! < b[i]!;
  return false;
};

/** Default catch radius (Manhattan distance in blocks) for drag-to-snap. */
export const DRAG_SNAP_RADIUS = 3;

/**
 * Snap target while dragging: among candidates whose pivot lies within
 * `radius` (Manhattan) of the dragged pivot, the conflict-free one first, then
 * the nearest, then the one keeping the current orientation; candidate order
 * (deterministic) breaks remaining ties. Null when nothing is in reach, so the
 * drop is a plain move.
 */
export function nearestSnap(candidates: readonly SnapCandidate[], dragged: Vec3, current: Transform, radius = DRAG_SNAP_RADIUS): SnapCandidate | null {
  let best: { c: SnapCandidate; score: readonly number[] } | null = null;
  for (const c of candidates) {
    const d = [0, 1, 2].reduce((n, i) => n + Math.abs(c.transform.position[i]! - dragged[i]!), 0);
    if (d > radius) continue;
    const turned = c.transform.quarterTurns !== current.quarterTurns || c.transform.mirrorX !== current.mirrorX ? 1 : 0;
    const score = [c.conflicts > 0 ? 1 : 0, d, turned];
    if (!best || lexLess(score, best.score)) best = { c, score };
  }
  return best?.c ?? null;
}

/**
 * One undoable operation applying a candidate: for an existing instance it moves
 * the instance, drops its links that no longer mate and links every mated pair;
 * for a new instance it adds the instance and the links. Throws when the
 * candidate is stale (geometry changed meanwhile).
 */
export function snapOperation(
  project: Project, versions: ReadonlyMap<string, AssetVersion>, candidate: SnapCandidate,
  target: { readonly instanceId: string } | { readonly newInstance: Instance },
): Operation {
  const map = versions;
  const instance = 'newInstance' in target ? { ...target.newInstance, transform: candidate.transform }
    : project.instances.find(i => i.id === target.instanceId);
  if (!instance) throw new DomainError('NOT_FOUND', 'Instanz existiert nicht');
  const version = map.get(instance.assetVersionId);
  if (!version) throw new DomainError('NOT_FOUND', 'Bauteilversion fehlt');
  const moved: Instance = { ...instance, transform: candidate.transform };
  const mine = new Map(placedConnectors(moved, version).map(p => [p.connector.id, p]));
  const operations: Operation[] = [];
  if ('newInstance' in target) operations.push({ kind: 'instance.add', instance: moved });
  else {
    operations.push({ kind: 'instance.transform', instanceId: moved.id, transform: candidate.transform });
    const after: Project = { ...project, instances: project.instances.map(i => i.id === moved.id ? moved : i) };
    const broken = checkLinks(after, map).filter(s => s.state !== 'ok' && (s.link.a.instanceId === moved.id || s.link.b.instanceId === moved.id));
    for (const s of broken) operations.push({ kind: 'link.remove', linkId: s.link.id });
  }
  for (const pair of candidate.pairs) {
    const other = project.instances.find(i => i.id === pair.target.instanceId);
    const v = other && map.get(other.assetVersionId);
    const t = other && v ? placedConnectors(other, v).find(p => p.connector.id === pair.target.connectorId) : undefined;
    const m = mine.get(pair.connectorId);
    if (!t || !m || !connectorsMate(m.world, t.world)) throw new DomainError('STALE', 'Snap-Vorschlag ist veraltet; bitte neu berechnen');
    const exists = project.links.some(l => [l.a, l.b].some(r => r.instanceId === moved.id && r.connectorId === pair.connectorId)
      && [l.a, l.b].some(r => r.instanceId === pair.target.instanceId && r.connectorId === pair.target.connectorId));
    if (exists && !('newInstance' in target)) continue;
    operations.push({ kind: 'link.add', link: { id: newId('link'), a: { instanceId: moved.id, connectorId: pair.connectorId }, b: { instanceId: pair.target.instanceId, connectorId: pair.target.connectorId } } });
  }
  return { kind: 'batch', label: `${moved.name} angedockt`, operations };
}

/** Link operation for two already mating, free connectors; throws otherwise. */
export function linkOperation(project: Project, versions: ReadonlyMap<string, AssetVersion>, a: ConnectorLink['a'], b: ConnectorLink['b']): Operation {
  const link: ConnectorLink = { id: newId('link'), a, b };
  const status = checkLinks({ ...project, links: [...project.links, link] }, versions).at(-1)!;
  if (status.state !== 'ok') throw new DomainError('INVALID', `Verbindung nicht möglich: ${status.message}`);
  return { kind: 'link.add', link };
}

/** Free connectors in the project that already mate but are not linked yet. */
export function unlinkedMates(project: Project, versions: ReadonlyMap<string, AssetVersion>): { a: ConnectorLink['a']; b: ConnectorLink['b'] }[] {
  const usage = linkUsage(project.links);
  const free = project.instances.flatMap(i => { const v = versions.get(i.assetVersionId); return v ? placedConnectors(i, v) : []; })
    .filter(p => (usage.get(linkKey(p.instanceId, p.connector.id)) ?? 0) < capacityOf(p.connector));
  const linked = new Set(project.links.map(l => [linkKey(l.a.instanceId, l.a.connectorId), linkKey(l.b.instanceId, l.b.connectorId)].sort().join('|')));
  const result: { a: ConnectorLink['a']; b: ConnectorLink['b'] }[] = [];
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
    const x = free[i]!, y = free[j]!;
    if (x.instanceId === y.instanceId || !connectorsMate(x.world, y.world)) continue;
    if (linked.has([linkKey(x.instanceId, x.connector.id), linkKey(y.instanceId, y.connector.id)].sort().join('|'))) continue;
    result.push({ a: { instanceId: x.instanceId, connectorId: x.connector.id }, b: { instanceId: y.instanceId, connectorId: y.connector.id } });
  }
  return result;
}

/**
 * Suggests a connector on a face: anchor at the face centre (rounded down to the
 * grid) and the lowest y of the bounds for side faces. `up` is +Y for side faces
 * and north (−Z) for top/bottom faces.
 */
export function suggestConnector(payload: VoxelPayload, face: FaceName, input: { id: string; type: string; profile: string; maxLinks?: number; handedness?: Handedness }): Connector {
  const normal = FACES[face], a = axisOf(normal), { min, maxExclusive: max } = payload.bounds;
  const position = [0, 1, 2].map(i => i === a ? (normal[a] > 0 ? max[i]! : min[i]!) : i === 1 ? min[1] : Math.floor((min[i]! + max[i]!) / 2)) as unknown as Vec3;
  const up: Vec3 = a === 1 ? [0, 0, -1] : [0, 1, 0];
  return { id: input.id, position, normal, up, type: input.type, profile: input.profile, ...(input.maxLinks !== undefined && { maxLinks: input.maxLinks }),
    ...(input.handedness !== undefined && { handedness: input.handedness }) };
}
