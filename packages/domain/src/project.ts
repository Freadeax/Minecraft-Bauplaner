import { assertVec3 } from '../../voxel/src/validation.js';
import type { Transform } from '../../voxel/src/types.js';
import { newId } from './hash.js';
import { deepFreeze } from './library.js';
import { DomainError } from './types.js';
import type { BlueprintRevision, ConnectorLink, Instance, Project, StepProgress } from './types.js';

const now = (): string => new Date().toISOString();

export function createProject(input: { name: string; description?: string; profileId?: string; id?: string }): Project {
  const name = input.name.trim();
  if (!name || name.length > 120) throw new DomainError('INVALID', 'Projektname mit 1–120 Zeichen erforderlich');
  const at = now();
  return deepFreeze({
    schemaVersion: 1, id: input.id ?? newId('project'), name, description: (input.description ?? '').trim(),
    profileId: input.profileId ?? 'java:registry-unverified', revision: 0, createdAt: at, updatedAt: at,
    instances: [], links: [], progress: {}, revisions: [],
  });
}

export function checkTransform(t: Transform): void {
  assertVec3(t.position, 'transform.position');
  if (![0, 1, 2, 3].includes(t.quarterTurns) || typeof t.mirrorX !== 'boolean') throw new DomainError('INVALID', 'Ungültige diskrete Transformation');
}

/**
 * Every project change is an explicit operation with an exact inverse. Undo and
 * redo replay inverses; the later team service can order the same operations
 * with operationId/baseRevision without a second change model.
 */
export type Operation =
  | { readonly kind: 'instance.add'; readonly instance: Instance; readonly index?: number }
  | { readonly kind: 'instance.remove'; readonly instanceId: string }
  | { readonly kind: 'instance.transform'; readonly instanceId: string; readonly transform: Transform }
  | { readonly kind: 'instance.update'; readonly instanceId: string; readonly name?: string; readonly override?: boolean; readonly assetVersionId?: string }
  | { readonly kind: 'link.add'; readonly link: ConnectorLink }
  | { readonly kind: 'link.remove'; readonly linkId: string }
  | { readonly kind: 'progress.set'; readonly stepId: string; readonly progress: StepProgress | null }
  | { readonly kind: 'project.rename'; readonly name: string; readonly description?: string }
  | { readonly kind: 'batch'; readonly label: string; readonly operations: readonly Operation[] };

function find(project: Project, id: string): number {
  const index = project.instances.findIndex(i => i.id === id);
  if (index < 0) throw new DomainError('NOT_FOUND', `Instanz ${id} existiert nicht`);
  return index;
}

function apply(project: Project, op: Operation): { project: Project; inverse: Operation } {
  switch (op.kind) {
    case 'instance.add': {
      if (project.instances.some(i => i.id === op.instance.id)) throw new DomainError('DUPLICATE', `Instanz ${op.instance.id} existiert bereits`);
      checkTransform(op.instance.transform);
      if (!op.instance.name.trim()) throw new DomainError('INVALID', 'Instanzname erforderlich');
      const instances = [...project.instances];
      instances.splice(op.index ?? instances.length, 0, structuredClone(op.instance));
      return { project: { ...project, instances }, inverse: { kind: 'instance.remove', instanceId: op.instance.id } };
    }
    case 'instance.remove': {
      const index = find(project, op.instanceId), instance = project.instances[index]!;
      const links = project.links.filter(l => l.a.instanceId === op.instanceId || l.b.instanceId === op.instanceId);
      const instances = project.instances.filter(i => i.id !== op.instanceId);
      const inverse: Operation = { kind: 'batch', label: 'Instanz wiederherstellen', operations: [
        { kind: 'instance.add', instance, index }, ...links.map(link => ({ kind: 'link.add' as const, link })),
      ] };
      return { project: { ...project, instances, links: project.links.filter(l => !links.includes(l)) }, inverse };
    }
    case 'instance.transform': {
      checkTransform(op.transform);
      const index = find(project, op.instanceId), previous = project.instances[index]!;
      const instances = [...project.instances]; instances[index] = { ...previous, transform: structuredClone(op.transform) };
      return { project: { ...project, instances }, inverse: { kind: 'instance.transform', instanceId: op.instanceId, transform: previous.transform } };
    }
    case 'instance.update': {
      const index = find(project, op.instanceId), previous = project.instances[index]!;
      if (op.name !== undefined && !op.name.trim()) throw new DomainError('INVALID', 'Instanzname erforderlich');
      const next: Instance = {
        ...previous, ...(op.name !== undefined && { name: op.name.trim() }), ...(op.override !== undefined && { override: op.override }),
        ...(op.assetVersionId !== undefined && { assetVersionId: op.assetVersionId }),
      };
      const instances = [...project.instances]; instances[index] = next;
      return { project: { ...project, instances }, inverse: {
        kind: 'instance.update', instanceId: op.instanceId, name: previous.name, override: previous.override, assetVersionId: previous.assetVersionId,
      } };
    }
    case 'link.add': {
      if (project.links.some(l => l.id === op.link.id)) throw new DomainError('DUPLICATE', 'Verbindung existiert bereits');
      find(project, op.link.a.instanceId); find(project, op.link.b.instanceId);
      return { project: { ...project, links: [...project.links, structuredClone(op.link)] }, inverse: { kind: 'link.remove', linkId: op.link.id } };
    }
    case 'link.remove': {
      const link = project.links.find(l => l.id === op.linkId);
      if (!link) throw new DomainError('NOT_FOUND', 'Verbindung existiert nicht');
      return { project: { ...project, links: project.links.filter(l => l !== link) }, inverse: { kind: 'link.add', link } };
    }
    case 'progress.set': {
      const previous = project.progress[op.stepId] ?? null;
      const progress = { ...project.progress };
      if (op.progress) progress[op.stepId] = structuredClone(op.progress); else delete progress[op.stepId];
      return { project: { ...project, progress }, inverse: { kind: 'progress.set', stepId: op.stepId, progress: previous } };
    }
    case 'project.rename': {
      const name = op.name.trim();
      if (!name || name.length > 120) throw new DomainError('INVALID', 'Projektname mit 1–120 Zeichen erforderlich');
      return { project: { ...project, name, description: (op.description ?? project.description).trim() },
        inverse: { kind: 'project.rename', name: project.name, description: project.description } };
    }
    case 'batch': {
      let current = project; const inverses: Operation[] = [];
      for (const child of op.operations) { const r = apply(current, child); current = r.project; inverses.unshift(r.inverse); }
      return { project: current, inverse: { kind: 'batch', label: op.label, operations: inverses } };
    }
  }
}

/** Applies atomically: on error the input project is returned unchanged by the caller. */
export function applyOperation(project: Project, op: Operation): { project: Project; inverse: Operation } {
  const result = apply(project, op);
  return { project: deepFreeze({ ...result.project, updatedAt: now() }), inverse: result.inverse };
}

export function describeOperation(op: Operation): string {
  switch (op.kind) {
    case 'instance.add': return `${op.instance.name} eingefügt`;
    case 'instance.remove': return 'Instanz entfernt';
    case 'instance.transform': return 'Instanz verschoben/gedreht';
    case 'instance.update': return 'Instanz geändert';
    case 'link.add': return 'Anschluss verbunden';
    case 'link.remove': return 'Verbindung gelöst';
    case 'progress.set': return op.progress ? 'Schritt abgehakt' : 'Haken entfernt';
    case 'project.rename': return 'Projekt umbenannt';
    case 'batch': return op.label;
  }
}

export interface HistoryEntry { readonly label: string; readonly forward: Operation; readonly inverse: Operation }
export interface History { readonly undo: readonly HistoryEntry[]; readonly redo: readonly HistoryEntry[] }
export const EMPTY_HISTORY: History = Object.freeze({ undo: Object.freeze([]), redo: Object.freeze([]) });
const HISTORY_LIMIT = 200;

/** Session-local undo/redo over the caller's own operations. */
export function execute(project: Project, history: History, op: Operation): { project: Project; history: History } {
  const r = applyOperation(project, op);
  const entry = { label: describeOperation(op), forward: op, inverse: r.inverse };
  return { project: r.project, history: { undo: [...history.undo, entry].slice(-HISTORY_LIMIT), redo: [] } };
}

export function undo(project: Project, history: History): { project: Project; history: History } | null {
  const entry = history.undo.at(-1);
  if (!entry) return null;
  const r = applyOperation(project, entry.inverse);
  return { project: r.project, history: { undo: history.undo.slice(0, -1), redo: [...history.redo, { ...entry, forward: entry.forward, inverse: r.inverse }] } };
}

export function redo(project: Project, history: History): { project: Project; history: History } | null {
  const entry = history.redo.at(-1);
  if (!entry) return null;
  const r = applyOperation(project, entry.forward);
  return { project: r.project, history: { undo: [...history.undo, { ...entry, inverse: r.inverse }], redo: history.redo.slice(0, -1) } };
}

export function newInstance(input: { assetVersionId: string; name: string; transform?: Transform; override?: boolean }): Instance {
  return { id: newId('inst'), name: input.name, assetVersionId: input.assetVersionId,
    transform: input.transform ?? { position: [0, 0, 0], quarterTurns: 0, mirrorX: false }, override: input.override ?? false };
}

/** Freezes the current instances/links as an immutable numbered revision. */
export function freezeRevision(project: Project, comment: string): { project: Project; revision: BlueprintRevision } {
  const revision: BlueprintRevision = deepFreeze({
    id: newId('rev'), number: (project.revisions.at(-1)?.number ?? 0) + 1, comment: comment.trim().slice(0, 500), createdAt: now(),
    instances: structuredClone(project.instances), links: structuredClone(project.links),
  });
  return { project: deepFreeze({ ...project, revisions: [...project.revisions, revision], updatedAt: now() }), revision };
}

/** Quarter turn around the instance's own placement pivot. */
export function rotateInPlace(t: Transform, turns: 1 | 3): Transform {
  return { ...t, quarterTurns: ((t.quarterTurns + turns) % 4) as Transform['quarterTurns'] };
}
