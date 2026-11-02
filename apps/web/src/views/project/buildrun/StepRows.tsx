import { useMemo, useState } from 'react';
import { runCoords, runLabel, stepRunsIn } from '../../../../../../packages/domain/src/index.js';
import type { BuildAnchor, CellLookup, GuideStep, StepRun } from '../../../../../../packages/domain/src/index.js';
import type { VoxelPayload } from '../../../../../../packages/voxel/src/index.js';
import { formatNumber } from '../../../app/ui';
import { stateColor } from '../../../colors';

const PREVIEW = 24;

/** Rectangles of equal blocks of one step (Schichtführung), with anchor-relative and world coordinates. */
export function useStepRuns(step: GuideStep | null, world: VoxelPayload | null, lookup: CellLookup | null): StepRun[] {
  return useMemo(() => step && world && lookup ? stepRunsIn(step, world, lookup) : [], [step, world, lookup]);
}

export function StepRows({ runs, anchor, big = false, checked, onToggle }: {
  runs: readonly StepRun[]; anchor: BuildAnchor; big?: boolean;
  /** Optional per-run checkboxes (Baumodus); purely local, never a tick. */
  checked?: ReadonlySet<number>; onToggle?(index: number): void;
}) {
  const [all, setAll] = useState(false);
  if (!runs.length) return null;
  const shown = all || big ? runs : runs.slice(0, PREVIEW);
  return <div className={`run-rows${big ? ' big' : ''}`}>
    <table className="build-materials run-table">
      <caption>Schichtführung · {runs.length} Reihen/Rechtecke{anchor.origin ? ' · Weltkoordinaten (F3), darunter relativ zum Anker' : ' · relativ zum Anker (Projekt 0/0/0)'}</caption>
      <thead><tr>{onToggle && <th aria-label="Gesetzt" />}<th>Wo</th><th>Block</th><th>Anzahl</th></tr></thead>
      <tbody>{shown.map((r, i) => {
        const c = runCoords(r, anchor), done = checked?.has(i) ?? false;
        return <tr key={`${r.x0},${r.z0},${r.key}`} className={done ? 'run-done' : undefined}>
          {onToggle && <td><input type="checkbox" checked={done} onChange={() => onToggle(i)} aria-label={`Reihe ${i + 1} gesetzt`} /></td>}
          <td className="run-where"><span>{c.abs ?? c.rel}</span>{c.abs && <small>Anker {c.rel}</small>}</td>
          <td><i style={{ background: r.state ? stateColor(r.state.id) : r.kind === 'erase' ? '#d35f5f' : '#2a4552' }} aria-hidden="true" /><code title={r.key}>{runLabel(r)}</code></td>
          <td>{formatNumber(r.count)}</td>
        </tr>;
      })}</tbody>
    </table>
    {!big && runs.length > PREVIEW && <button className="link-button" onClick={() => setAll(!all)}>{all ? 'Weniger zeigen' : `Alle ${runs.length} Reihen zeigen`}</button>}
  </div>;
}
