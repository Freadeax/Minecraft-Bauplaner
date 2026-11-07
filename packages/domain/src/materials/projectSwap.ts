import { stateKey } from '../../../voxel/src/validation.js';
import type { BlockState, VoxelPayload } from '../../../voxel/src/types.js';
import type { Resolution } from '../core/compose.js';
import { applyEdit, createDraft, materializeDraft, posKey } from '../editor/draft.js';
import type { CellChange, Draft } from '../editor/draft.js';
import type { Guide, StepStatus } from '../building/guide.js';
import { PHASE_LABEL } from '../building/guide.js';
import { computeMaterials, stackSizeOf } from './materials.js';
import { swapMaterials } from './variants.js';
import type { MaterialSwap, SwapResult } from './variants.js';

/**
 * Materialtausch im Projekt mit Vorschau (FLOW-01). Dieselbe Tauschregel wie die Materialvarianten der Bibliothek
 * (`swapMaterials`: Form für Form, Ausrichtung bleibt), aber auf die zusammengesetzte Projektwelt und optional auf
 * eine Instanz beschränkt. Die Vorschau zeigt vor dem Übernehmen, was sich ändert:
 *  - welche Instanzen wie viele Zellen ändern;
 *  - welche Blockarten wohin wechseln;
 *  - Bauitems vorher/nachher mit Lagerbestand (was neu besorgt werden muss, was frei wird);
 *  - welche bereits abgehakten Schritte danach „neu prüfen“ sind, weil sich ihr Plan ändert.
 * Übernommen wird über `commitProjectEdit` mit dem gelieferten Entwurf (neue Bauteilversionen, ein Rückgängig-Schritt).
 */
export interface ProjectSwapPreview {
  /** Entwurf auf der Projektwelt, direkt für `commitProjectEdit`. */
  readonly draft: Draft;
  readonly after: VoxelPayload | null;
  readonly replaced: number;
  readonly unresolved: SwapResult['unresolved'];
  readonly instances: readonly { readonly id: string; readonly name: string; readonly cells: number }[];
  readonly transitions: readonly { readonly from: string; readonly to: string; readonly count: number }[];
  readonly items: readonly SwapItemLine[];
  /** Schritte, deren Zellen sich ändern. */
  readonly stepsTouched: number;
  /** Davon bereits abgehakt: werden nach dem Tausch „neu prüfen“. */
  readonly recheck: readonly { readonly id: string; readonly order: number; readonly title: string }[];
}

export interface SwapItemLine {
  readonly itemId: string;
  readonly before: number;
  readonly after: number;
  readonly delta: number;
  readonly stock: number;
  /** Mehrbedarf, den das Lager nicht deckt (nur bei delta > 0). */
  readonly shortfall: number;
  readonly stackSize: ReturnType<typeof stackSizeOf>;
}

const ns = (id: string): string => id.includes(':') ? id : `minecraft:${id}`;

export function previewProjectSwap(input: {
  readonly resolution: Pick<Resolution, 'world' | 'owners' | 'placed'>;
  readonly guide: Pick<Guide, 'steps'> | null;
  readonly status: (stepId: string) => StepStatus;
  readonly swaps: readonly MaterialSwap[];
  /** Nur diese Instanz tauschen; null/leer = ganzes Projekt. */
  readonly instanceId?: string | null;
  readonly stock?: Readonly<Record<string, number>>;
}): ProjectSwapPreview {
  const world = input.resolution.world;
  const empty: ProjectSwapPreview = { draft: createDraft(world, world?.profileId ?? 'minecraft:unknown'), after: world, replaced: 0, unresolved: [], instances: [], transitions: [], items: [], stepsTouched: 0, recheck: [] };
  if (!world || !input.swaps.some(s => s.from !== s.to)) return empty;
  const swapped = swapMaterials(world, input.swaps);
  const next = new Map<string, BlockState>();
  for (const c of swapped.payload.cells) if (c.kind === 'block') next.set(posKey(c.position), swapped.payload.palette[c.paletteIndex]!);
  const entities = new Map(world.blockEntities.map(e => [posKey(e.position), e.data]));
  const scope = input.instanceId || null;
  const names = new Map(input.resolution.placed.map(p => [p.instance.id, p.instance.name]));
  const changes: CellChange[] = [], changed = new Set<string>();
  const perInstance = new Map<string, number>(), transitions = new Map<string, { from: string; to: string; count: number }>();
  const unresolvedIds = new Map(swapped.unresolved.map(u => [u.id, { ...u, count: 0 }]));
  for (const c of world.cells) {
    if (c.kind !== 'block') continue;
    const k = posKey(c.position), owners = input.resolution.owners.get(k) ?? [];
    if (scope && !owners.includes(scope)) continue;
    const before = world.palette[c.paletteIndex]!;
    const miss = unresolvedIds.get(before.id); if (miss) miss.count++;
    const after = next.get(k);
    if (!after || stateKey(after) === stateKey(before)) continue;
    const entity = entities.get(k);
    changes.push({ position: c.position, value: entity ? { kind: 'block', state: after, entity } : { kind: 'block', state: after } });
    changed.add(k);
    for (const id of scope ? [scope] : owners.slice(0, 1)) perInstance.set(id, (perInstance.get(id) ?? 0) + 1);
    const t = `${before.id}>${after.id}`, tr = transitions.get(t);
    if (tr) tr.count++; else transitions.set(t, { from: before.id, to: after.id, count: 1 });
  }
  const unresolved = [...unresolvedIds.values()].filter(u => u.count > 0).sort((a, b) => b.count - a.count);
  if (!changes.length) return { ...empty, unresolved };
  const draft = applyEdit(createDraft(world), { label: 'Materialtausch', changes }).draft;
  const after = materializeDraft(draft);
  const itemsBefore = computeMaterials(world).items, itemsAfter = computeMaterials(after).items;
  const counts = new Map<string, { before: number; after: number }>();
  for (const l of itemsBefore) counts.set(l.itemId, { before: l.count, after: 0 });
  for (const l of itemsAfter) { const r = counts.get(l.itemId); if (r) r.after = l.count; else counts.set(l.itemId, { before: 0, after: l.count }); }
  const stock = new Map(Object.entries(input.stock ?? {}).map(([k, v]) => [ns(k), v]));
  const items: SwapItemLine[] = [...counts.entries()].filter(([, r]) => r.before !== r.after).map(([itemId, r]) => {
    const delta = r.after - r.before, have = stock.get(itemId) ?? 0;
    return { itemId, before: r.before, after: r.after, delta, stock: have, shortfall: delta > 0 ? Math.max(0, delta - have) : 0, stackSize: stackSizeOf(itemId) };
  }).sort((a, b) => b.delta - a.delta || (a.itemId < b.itemId ? -1 : 1));
  let stepsTouched = 0;
  const recheck: { id: string; order: number; title: string }[] = [];
  for (const s of input.guide?.steps ?? []) {
    if (!s.positions.some(p => changed.has(posKey(p)))) continue;
    stepsTouched++;
    if (input.status(s.id) === 'done') recheck.push({ id: s.id, order: s.order, title: `${PHASE_LABEL[s.phase]} · ${s.sectionName} · Y ${s.y}` });
  }
  return {
    draft, after, replaced: changes.length, unresolved,
    instances: [...perInstance.entries()].map(([id, cells]) => ({ id, name: names.get(id) ?? id, cells })).sort((a, b) => b.cells - a.cells),
    transitions: [...transitions.values()].sort((a, b) => b.count - a.count), items, stepsTouched, recheck,
  };
}
