import { useMemo } from 'react';
import { blockLabel, programSummary, siteOf, teamContextOf, teamView } from '../../../../../packages/domain/src/index.js';
import type { TeamState } from '../../../../../packages/domain/src/index.js';
import { href } from '../../app/router';
import { formatNumber, localToday } from '../../app/ui';
import { isResolved } from './session';
import type { ProjectSession } from './session';
import { lastTab, projectTabNames } from './tabNames';
import { FixHelp } from '../../app/FixHelp';
import './overview.css';
import '../../styles/site.css';

const pct = (a: number, b: number) => b ? Math.round(a / b * 100) : 0;

/**
 * Projektübersicht (UX-02): auf einen Blick, wo das Projekt steht – letzter Arbeitsstand, alles, was offen
 * ist (Konflikte, prüfbedürftige Schritte, Team-Hinweise), und der nächste Bauabschnitt mit Packliste.
 * Liest nur die vorhandene Projektberechnung; jede Karte führt mit einem Klick zum passenden Reiter.
 */
export function OverviewTab({ session }: { session: ProjectSession }) {
  const { project, resolution, computation } = session;
  const link = (tab: string) => href({ view: 'project', projectId: project.id, tab });
  const site = siteOf(project);
  const resolved = isResolved(resolution) ? resolution : null;
  const plan = computation?.site.plan ?? null;
  const current = plan?.sections.find(s => s.id === plan.currentId) ?? null;
  const team = site.team as TeamState | undefined;
  const teamConflicts = useMemo(() => {
    if (!team) return 0;
    try { return teamView(team, teamContextOf(site)).conflicts.length; } catch { return 0; }
  }, [team, site]);
  const program = programSummary(site, localToday());
  const last = lastTab(project.id), lastLabel = projectTabNames.find(t => t.id === last)?.label ?? 'Editor';
  const undoLabel = session.history.undo.at(-1)?.label;

  const open: { id: string; text: string; tab: string; action: string; help?: Parameters<typeof FixHelp>[0]['topic'] }[] = [];
  if (session.saveState === 'conflict' || session.saveState === 'error') open.push({ id: 'save', text: 'Der letzte Stand ist nicht gespeichert.', tab: 'uebersicht', action: 'Oben neu laden', help: 'save' });
  if (!resolved) open.push({ id: 'resolve', text: `Projekt kann nicht berechnet werden: ${'error' in resolution ? resolution.error : ''}`, tab: 'editor', action: 'Im Editor ansehen', help: 'resolve' });
  if (resolved?.conflicts.length) open.push({ id: 'voxel', text: `${formatNumber(resolved.conflicts.length)} Block${resolved.conflicts.length === 1 ? '' : 'e'} überschneiden sich.`, tab: 'editor', action: 'Im Editor lösen', help: 'conflict' });
  if (plan && plan.totals.review > 0) open.push({ id: 'review', text: `${plan.totals.review} Bauschritt${plan.totals.review === 1 ? '' : 'e'} nach einer Planänderung erneut prüfen.`, tab: 'bauen', action: 'In der Bauanleitung prüfen', help: 'review' });
  if (teamConflicts) open.push({ id: 'team', text: `${teamConflicts} Team-Hinweis${teamConflicts === 1 ? '' : 'e'} zum Ansehen (übernommen oder von anderen gemeldet).`, tab: 'team', action: 'Im Team ansehen' });
  const blockers = resolved?.exportBlockers.filter(b => !/Konflikt/i.test(b)) ?? [];
  for (const [i, b] of blockers.slice(0, 3).entries()) open.push({ id: `block-${i}`, text: b, tab: 'export', action: 'Zum Export' });

  return <section className="overview" aria-label="Projektübersicht">
    <article className="card overview-card" aria-labelledby="ov-last">
      <span className="panel-kicker">LETZTER ARBEITSSTAND</span>
      <h2 id="ov-last">Gespeichert {new Date(project.updatedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</h2>
      <ul className="overview-facts">
        <li><b>{project.instances.length}</b> Bauteile</li>
        <li><b>{formatNumber(computation?.guide.totals.blocks ?? 0)}</b> Blöcke</li>
        <li><b>{project.revisions.length}</b> Revisionen</li>
      </ul>
      {undoLabel && <p className="muted">Zuletzt in dieser Sitzung: „{undoLabel}“</p>}
      <a className="primary button-link" href={link(last)} data-continue={last}>Weiter im Reiter „{lastLabel}“</a>
    </article>

    <article className={`card overview-card ${open.length ? 'has-open' : 'all-clear'}`} aria-labelledby="ov-open">
      <span className="panel-kicker">OFFEN</span>
      <h2 id="ov-open">{open.length ? `${open.length} offene${open.length === 1 ? 'r Punkt' : ' Punkte'}` : '✓ Nichts offen'}</h2>
      {open.length ? <ul className="overview-open">{open.map(o => <li key={o.id} data-open={o.id}>
        <span>{o.text}</span><a href={link(o.tab)}>{o.action} →</a>{o.help && <FixHelp topic={o.help} />}</li>)}</ul>
        : <p className="muted">Keine Überschneidungen, keine prüfbedürftigen Schritte{team ? ', keine Team-Hinweise' : ''}.</p>}
    </article>

    <article className="card overview-card" aria-labelledby="ov-next">
      <span className="panel-kicker">NÄCHSTER BAUABSCHNITT</span>
      {!plan ? <p className="muted" role="status">{session.computationState === 'pending' ? 'Wird berechnet …' : 'Noch kein Bauplan – füge im Editor Bauteile ein.'}</p>
        : !current ? <><h2 id="ov-next">✓ Alles gebaut</h2><p className="muted">{formatNumber(plan.totals.blocks)} Blöcke laut Haken gesetzt.</p></>
        : <>
          <h2 id="ov-next">{current.name}</h2>
          <div className="site-bar" role="progressbar" aria-label={`Fortschritt ${current.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct(current.blocksDone, current.blocks)}>
            <span style={{ width: `${pct(current.blocksDone, current.blocks)}%` }} /></div>
          <p className="muted">{current.done} von {current.steps.length} Schritten · {formatNumber(current.blocks - current.blocksDone)} Blöcke offen{current.review ? ` · ${current.review} prüfen` : ''}</p>
          {current.items.length > 0 && <><h3 className="overview-sub">Packliste</h3><ul className="overview-items">{[...current.items].sort((a, b) => b.need - a.need).slice(0, 5).map(i =>
            <li key={i.itemId}><span>{blockLabel(i.itemId)}</span><b>{formatNumber(i.need)}</b>{i.missing > 0 && <small> · {formatNumber(i.missing)} fehlen</small>}</li>)}</ul></>}
          <div className="button-row"><a className="primary button-link" href={link('bauen')}>Abschnitt bauen</a><a className="secondary button-link" href={link('baustelle')}>Alle Abschnitte</a></div>
        </>}
    </article>

    {program.next && <article className="card overview-card" aria-labelledby="ov-date">
      <span className="panel-kicker">NÄCHSTER MEILENSTEIN</span>
      <h2 id="ov-date">{program.next.name}</h2>
      <p className="muted">{program.next.due ? `bis ${new Date(`${program.next.due}T12:00:00`).toLocaleDateString('de-DE')}` : 'ohne Termin'} · {program.milestones} Meilenstein(e), {program.builders} Bauleute</p>
      <a className="secondary button-link" href={link('planung')}>Zur Planung</a>
    </article>}
  </section>;
}
