import { useMemo, useState } from 'react';
import { compactBefore, compactTeam, digestInfo, MAX_TEAM_EVENTS } from '../../../../../packages/domain/src/index.js';
import type { CompactionPlan, TeamContext, TeamRole, TeamState } from '../../../../../packages/domain/src/index.js';
import { errorText, formatNumber } from '../../app/ui';

const day = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const kb = (chars: number) => `${formatNumber(Math.max(1, Math.round(chars / 1024)))} KB`;
const DAYS = [3, 7, 14, 30, 60] as const;

/**
 * Verlauf verdichten (COOP-11, TEAMBAU.md §19): the Bauleitung replaces the measurements up to a cutoff
 * by their sums. The visible team state stays the same (checked before saving); the step is undoable
 * like every team change (site.set) and reaches the other copies like any event.
 */
export function TeamCompact({ team, ctx, me, role, live, onSave, onUndo }: {
  team: TeamState; ctx: TeamContext; me: string | null; role: TeamRole; live: boolean;
  onSave(next: TeamState, label: string): boolean;
  onUndo(): void;
}) {
  const [days, setDays] = useState<number>(14);
  const [plan, setPlan] = useState<CompactionPlan | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const dg = useMemo(() => digestInfo(team), [team]);
  const fill = team.events.length / MAX_TEAM_EVENTS;
  const leader = role === 'leitung' && !!me;
  const preview = () => {
    setError(''); setDone('');
    try { setPlan(compactTeam(team, ctx, { before: compactBefore(days), by: me! })); }
    catch (e) { setPlan(null); setError(errorText(e)); }
  };
  const apply = () => {
    if (!plan) return;
    if (onSave(plan.team, 'Verlauf verdichtet')) {
      setDone(`Verdichtet: ${formatNumber(plan.eventsBefore)} → ${formatNumber(plan.eventsAfter)} Ereignisse.`);
      setPlan(null);
    }
  };
  return <details className="team-block team-compact" open={fill >= 0.75 || undefined}>
    <summary>Verlauf verdichten <small>{formatNumber(team.events.length)} von {formatNumber(MAX_TEAM_EVENTS)} Ereignissen{dg ? ` · verdichtet bis ${day(dg.at)}` : ''}</small></summary>
    <div className="team-compact-meter" role="meter" aria-label="Teamprotokoll belegt" aria-valuemin={0} aria-valuemax={MAX_TEAM_EVENTS} aria-valuenow={team.events.length}>
      <span style={{ width: `${Math.min(100, Math.round(fill * 100))}%` }} className={fill >= 0.75 ? 'bad' : undefined} /></div>
    <p className="muted">Jede Baunachweis-Meldung, jede Lagerbuchung und jede Ertragsmeldung ist ein Ereignis. Verdichten ersetzt alles vor dem Stichtag durch Summen je Person, Abschnitt und Kiste.
      Rollen, Abschnitte, Übergaben, Planstände und offene Notizen bleiben unverändert; erledigte Notizen und abgelehnte Einträge vor dem Stichtag entfallen.
      Der Teamstand bleibt gleich – der Planer prüft das vor dem Speichern.</p>
    {dg && <p className="team-compact-last">Zuletzt verdichtet am {day(dg.made)} bis {day(dg.at)}: {formatNumber(dg.covered)} Ereignisse in {dg.parts} Teil{dg.parts === 1 ? '' : 'en'} zusammengefasst.</p>}
    {!leader ? <p className="muted">Verdichten darf nur die Bauleitung. Ältere Kopien schadet es nicht: beim Einlesen bleiben ersetzte Ereignisse draußen.</p> : <>
      <div className="team-inline">
        <label>Alles älter als <select value={days} onChange={e => { setDays(Number(e.target.value)); setPlan(null); }}>
          {DAYS.map(d => <option key={d} value={d}>{d} Tage</option>)}</select></label>
        <button onClick={preview}>Vorschau</button>
        {plan && <button className="primary" onClick={apply}>Jetzt verdichten</button>}
      </div>
      {plan && <ul className="team-compact-plan" aria-label="Vorschau">
        <li>Stichtag: {day(plan.cutoff.at)} (letztes Ereignis davor)</li>
        <li>{formatNumber(plan.eventsBefore)} → <strong>{formatNumber(plan.eventsAfter)}</strong> Ereignisse, {kb(plan.bytesBefore)} → <strong>{kb(plan.bytesAfter)}</strong></li>
        <li>{formatNumber(plan.replaced)} Messungen, ältere Zählungen und erledigte Notizen werden zu {plan.parts} Summenteil{plan.parts === 1 ? '' : 'en'}{plan.rejectedDropped ? `; ${formatNumber(plan.rejectedDropped)} abgelehnte Einträge entfallen` : ''}</li>
        {live && <li>Die Summenteile gehen auch in den Team-Raum. Der Raum selbst behält alle alten Ereignisse; ist er voll, mit dem verdichteten Stand einen neuen Raum eröffnen.</li>}
      </ul>}
    </>}
    {error && <p role="alert" className="notice warning">{error}</p>}
    {done && <p role="status" className="notice">{done} <button type="button" className="secondary" onClick={() => { onUndo(); setDone(''); }}>Rückgängig</button></p>}
  </details>;
}
