import { connectFamily, settleState } from '../../../voxel/src/blocklogic/index.js';
import type { BlockState, Vec3 } from '../../../voxel/src/types.js';
import { changedKeys } from '../placement.js';
import { draftEntries, keyPos, posKey } from './draft.js';
import type { CellChange, Draft, Edit } from './draft.js';
import { inBox } from './tools.js';
import type { Box } from './tools.js';

/**
 * „Wie im Spiel verbinden“ (BLOCK-01): one undoable edit that gives fences, walls,
 * panes, bars, stairs, gates, snowy grass and mushroom blocks of the draft the state
 * the game derives from their neighbours. Stairs first (their shape changes the faces
 * fences see), then walls top-down, then the rest. Optional box limits the cells that
 * change; neighbours outside it are still read.
 */
export function settleEdit(draft: Draft, box?: Box | null): Edit | null {
  const entries = draftEntries(draft);
  const current = new Map<string, BlockState>();
  for (const [k, v] of entries) if (v.kind === 'block') current.set(k, v.state);
  const lookup = (p: Vec3) => current.get(posKey(p));
  const inside = (p: Vec3) => !box || inBox(box, p);
  const rank = (s: BlockState) => { const f = connectFamily(s.id); return f === 'stairs' ? 0 : f === 'wall' ? 1 : 2; };
  const todo = [...current].filter(([k, s]) => connectFamily(s.id) && inside(keyPos(k)))
    .map(([k, s]) => ({ k, s, p: keyPos(k) })).sort((a, b) => rank(a.s) - rank(b.s) || b.p[1] - a.p[1]);
  const changes: CellChange[] = [];
  for (const { k, s, p } of todo) {
    const to = settleState(s, p, lookup);
    if (!changedKeys(s, to).length) continue;
    current.set(k, to);
    const v = entries.get(k)!;
    changes.push({ position: p, value: v.kind === 'block' && v.entity ? { kind: 'block', state: to, entity: v.entity } : { kind: 'block', state: to } });
  }
  return changes.length ? { label: `Wie im Spiel verbunden (${changes.length})`, changes } : null;
}
