import type { StepProgress } from '../core/types.js';
import type { GameStepStatus } from './gameCheck.js';
import type { Guide, GuideStep } from './guide.js';

/**
 * Nachweis eines Bauschritts (FLOW-01): in einem Wort, worauf sich „erledigt“ stützt.
 *
 *  - `manual`: von Hand abgehakt, ohne Beleg aus dem Spiel;
 *  - `game`: im Spiel bestätigt (Haken aus einer Spielaufnahme bzw. der Mod, oder die aktuelle Aufnahme bestätigt den Haken);
 *  - `recheck`: abgehakt, aber der Plan des Schritts hat sich seither geändert (Geometrie-Hash weicht ab);
 *  - `contradicted`: abgehakt, die aktuelle Aufnahme zeigt aber Abweichungen;
 *  - `confirmed-open`: nicht abgehakt, die Aufnahme bestätigt den Schritt aber vollständig (Haken fehlt nur noch);
 *  - `ready` / `open`: noch zu bauen (bereit = alle Vorgänger erledigt).
 *
 * Reine Ableitung aus Haken, Schritt-Hash und (optional) Spielabgleich: nichts wird geraten oder gemessen.
 */
export type StepProof = 'open' | 'ready' | 'confirmed-open' | 'manual' | 'game' | 'recheck' | 'contradicted';

export const STEP_PROOF_LABEL: Readonly<Record<StepProof, string>> = {
  open: 'offen', ready: 'bereit', 'confirmed-open': 'im Spiel fertig, nicht abgehakt',
  manual: 'manuell abgehakt', game: 'im Spiel bestätigt', recheck: 'neu prüfen (Plan geändert)', contradicted: 'abgehakt, im Spiel abweichend',
};

/** Kurzzeichen für enge Listen und den Druck (immer zusammen mit dem Text). */
export const STEP_PROOF_MARK: Readonly<Record<StepProof, string>> = {
  open: '○', ready: '▷', 'confirmed-open': '◐', manual: '✓', game: '✔', recheck: '↻', contradicted: '⚠',
};

/** Reihenfolge der Zähler (erst Erledigtes, dann was Aufmerksamkeit braucht, dann Offenes). */
export const STEP_PROOF_ORDER: readonly StepProof[] = ['game', 'manual', 'recheck', 'contradicted', 'confirmed-open', 'ready', 'open'];

export function stepProof(step: Pick<GuideStep, 'geometryHash'>, entry: StepProgress | undefined, ready: boolean, game?: GameStepStatus | null): StepProof {
  if (!entry) return game === 'confirmed' ? 'confirmed-open' : ready ? 'ready' : 'open';
  if (entry.geometryHash !== step.geometryHash) return 'recheck';
  if (game === 'deviating') return 'contradicted';
  return entry.source === 'game' || game === 'confirmed' ? 'game' : 'manual';
}

export type ProofCounts = Readonly<Record<StepProof, number>> & { readonly blocks: Readonly<Record<StepProof, number>> };

/** Zählt die Nachweise aller Schritte (und deren Blöcke) für Fortschrittsleisten. */
export function proofCounts(guide: Pick<Guide, 'steps'>, progress: Readonly<Record<string, StepProgress>>, ready: ReadonlySet<string>,
  game?: ((stepId: string) => GameStepStatus | null | undefined) | null): ProofCounts {
  const zero = (): Record<StepProof, number> => ({ open: 0, ready: 0, 'confirmed-open': 0, manual: 0, game: 0, recheck: 0, contradicted: 0 });
  const counts = zero(), blocks = zero();
  for (const s of guide.steps) {
    const p = stepProof(s, progress[s.id], ready.has(s.id), game?.(s.id) ?? null);
    counts[p]++; blocks[p] += s.blocks;
  }
  return { ...counts, blocks };
}
