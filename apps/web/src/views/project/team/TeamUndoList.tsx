import { useMemo } from 'react';
import { undoableSteps } from '../../../../../../packages/domain/src/index.js';
import type { TeamContext, TeamEventBody, TeamState } from '../../../../../../packages/domain/src/index.js';
import { describeEvent } from '../../../../../../packages/domain/src/index.js';

/**
 * Team-Rückgängig (TEAM-02, TEAM_LIVE.md §13): one's own last steps, each with „Zurücknehmen“ when a checked counter
 * step exists. Strg+Z only works on this device; once a step reached the others it is taken back with a new step.
 */
export function TeamUndoList({ team, ctx, me, names, act }: { team: TeamState; ctx: TeamContext; me: string; names: ReadonlyMap<string, string>; act(body: TeamEventBody, label: string): boolean }) {
  const steps = useMemo(() => undoableSteps(team, ctx, me, 5), [team, ctx, me]);
  if (!steps.length) return null;
  return <details className="team-block team-undo" data-testid="team-undo">
    <summary>Meine letzten Schritte zurücknehmen</summary>
    <p className="muted">Was die anderen schon gesehen haben, nimmst du mit einem Gegenschritt zurück. Das geht nur, solange niemand anderes an derselben Stelle weitergemacht hat.</p>
    <ul>{steps.map(u => <li key={u.event.id}>
      <span>{describeEvent(u.event, ctx, names)}</span>
      {u.ok ? <button className="secondary" onClick={() => act(u.body, u.label)}>Zurücknehmen</button> : <small className="muted"> · {u.reason}</small>}
    </li>)}</ul>
  </details>;
}
