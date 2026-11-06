/**
 * Team-Rückgängig (TEAM-02, docs/architecture/team/TEAM_LIVE.md §13). The team log only grows: a step that already
 * reached the others cannot be taken back by deleting it. Instead the author sends a checked counter step – a new
 * event that restores what was there before. Checked means three things:
 * 1. Only one's own step, and only kinds with a real counterpart (claim ↔ release, assign back, offer withdrawn …).
 * 2. Nobody else decided about the same subject after it (otherwise undoing would overwrite their step).
 * 3. The counter step passes the rights and the fold like any other step (no rejection, no new conflict).
 * In the room the counter step is guarded like every deciding step, so a race in the last second ends as „stale“.
 * Pure functions; the page writes the event like any other action.
 */
import { compareEvents, foldTeam, authorize, eventLabel, isKnownEvent, laterThan, teamEvent } from './team.js';
import type { KnownTeamEvent, TeamContext, TeamEvent, TeamEventBody, TeamState, TeamView } from './team.js';
import { subjectsOf } from './teamSync.js';

export type TeamUndo =
  | { readonly ok: true; readonly event: TeamEvent; readonly body: TeamEventBody; readonly label: string }
  | { readonly ok: false; readonly event: TeamEvent; readonly reason: string };

/** Steps that can be meaningful counter steps of each other; all others are final (Fertigmeldung, Prüfung, Lager …). */
const NOT_UNDOABLE: Readonly<Record<string, string>> = {
  'section.done': 'Eine Fertigmeldung nimmt ein Baumeister mit „Nacharbeit“ zurück.',
  'section.verify': 'Eine Prüfung ersetzt man durch eine neue Prüfung.',
  'section.accept': 'Eine angenommene Übergabe gibst du mit „Übergeben“ zurück – der andere muss annehmen.',
  'note.resolve': 'Eine erledigte Notiz bleibt erledigt; schreib eine neue Notiz.',
  'plan.release': 'Ein freigegebener Planstand wird durch eine neue Freigabe ersetzt.',
  'contribution': 'Lieferungen korrigierst du mit einer neuen Lieferung.',
};

const sectionOf = (v: TeamView, id: string) => v.sections.find(s => s.sectionId === id);

function counterBody(e: KnownTeamEvent, before: TeamView, now: TeamView): TeamEventBody | string {
  switch (e.kind) {
    case 'section.claim': {
      const b = sectionOf(before, e.section), n = sectionOf(now, e.section);
      if (b?.owner) return 'Die Übernahme hat nichts geändert (der Abschnitt war schon vergeben).';
      if (n?.owner !== e.by || n.status !== 'vergeben') return 'Der Abschnitt ist nicht mehr nur übernommen.';
      return { kind: 'section.release', section: e.section };
    }
    case 'section.release': {
      const b = sectionOf(before, e.section), n = sectionOf(now, e.section);
      if (!b?.owner) return 'Der Abschnitt war schon frei.';
      if (n?.owner || n?.status !== 'frei') return 'Der Abschnitt ist inzwischen wieder vergeben.';
      return b.owner === e.by ? { kind: 'section.claim', section: e.section } : { kind: 'section.assign', section: e.section, member: b.owner };
    }
    case 'section.assign': {
      const b = sectionOf(before, e.section), n = sectionOf(now, e.section);
      if (n?.owner !== e.member) return 'Der Abschnitt hat inzwischen jemand anderes.';
      if (b?.owner === e.member) return 'Die Zuweisung hat nichts geändert.';
      return b?.owner ? { kind: 'section.assign', section: e.section, member: b.owner } : { kind: 'section.release', section: e.section };
    }
    case 'section.handover': {
      const n = sectionOf(now, e.section);
      if (!n?.offer || n.offer.by !== e.by || n.offer.to !== e.member) return 'Das Übergabeangebot ist nicht mehr offen.';
      return { kind: 'section.decline', section: e.section };
    }
    case 'section.decline': {
      const b = sectionOf(before, e.section), n = sectionOf(now, e.section);
      if (!b?.offer || b.offer.by !== e.by) return 'Nur ein eigenes zurückgezogenes Angebot lässt sich erneuern.';
      if (n?.offer) return 'Es gibt schon wieder ein Übergabeangebot.';
      return { kind: 'section.handover', section: e.section, member: b.offer.to, ...(b.offer.note && { note: b.offer.note }) };
    }
    case 'note.add': {
      const n = now.notes.find(x => x.id === e.noteId);
      if (!n || n.by !== e.by) return 'Die Notiz gibt es so nicht.';
      if (n.resolved) return 'Die Notiz ist schon erledigt.';
      return { kind: 'note.resolve', noteId: e.noteId, text: 'zurückgenommen' };
    }
    case 'gather.claim': {
      const prev = before.gather.find(g => g.member === e.by && g.item === e.item);
      const cur = now.gather.find(g => g.member === e.by && g.item === e.item);
      if ((cur?.count ?? 0) !== e.count) return 'Der Sammelauftrag wurde inzwischen geändert.';
      if ((prev?.count ?? 0) === e.count) return 'Der Sammelauftrag hat sich nicht geändert.';
      return { kind: 'gather.claim', item: e.item, count: prev?.count ?? 0 };
    }
    case 'member.role': {
      const prev = before.members.find(m => m.id === e.member), cur = now.members.find(m => m.id === e.member);
      if (!prev) return 'Das Mitglied war vorher nicht im Team.';
      if (cur?.role !== e.role) return 'Die Rolle wurde inzwischen wieder geändert.';
      if (prev.role === e.role) return 'Die Rolle hat sich nicht geändert.';
      return { kind: 'member.role', member: e.member, role: prev.role };
    }
    case 'member.away': {
      const prev = before.members.find(m => m.id === e.member)?.away, cur = now.members.find(m => m.id === e.member)?.away;
      if ((cur?.until ?? '') !== (e.until ?? '') || (cur?.note ?? '') !== (e.note ?? '')) return 'Die Abwesenheit wurde inzwischen geändert.';
      return { kind: 'member.away', member: e.member, ...(prev?.until && { until: prev.until }), ...(prev?.note && { note: prev.note }) };
    }
    case 'member.tally':
      if (now.members.find(m => m.id === e.member)?.tally !== e.on) return 'Der Baunachweis wurde inzwischen wieder umgeschaltet.';
      return { kind: 'member.tally', member: e.member, on: !e.on };
    default: return NOT_UNDOABLE[e.kind] ?? `${eventLabel(e)} lässt sich nicht zurücknehmen.`;
  }
}

/**
 * Checks whether `me` can take back the step `eventId` with a counter step, and builds it. The event of the
 * counter step comes with an `at` after everything known, so it folds after the step it undoes.
 */
export function teamUndo(team: TeamState, ctx: TeamContext, eventId: string, me: string, now: string = new Date().toISOString()): TeamUndo | null {
  const e = team.events.find(x => x.id === eventId);
  if (!e) return null;
  const no = (reason: string): TeamUndo => ({ ok: false, event: e, reason });
  if (e.by !== me) return no('Zurücknehmen kann nur, wer den Schritt gemacht hat.');
  if (!isKnownEvent(e)) return no('Unbekannte Ereignisart.');
  if (e.origin === 'server') return no('Messungen des Servers nimmt niemand zurück.');
  const subjects = new Set(subjectsOf(e).length ? subjectsOf(e) : e.kind === 'gather.claim' ? [`gather:${e.item}`] : []);
  const later = team.events.filter(x => compareEvents(x, e) > 0);
  const other = later.find(x => x.by !== me && subjectsOf(x).some(s => subjects.has(s)));
  if (other) return no(`Danach hat jemand anderes an derselben Stelle entschieden (${eventLabel(other)}) – zurücknehmen würde das überschreiben.`);
  const before = foldTeam({ ...team, events: team.events.filter(x => compareEvents(x, e) < 0) }, ctx);
  const current = foldTeam(team, ctx);
  if (current.rejected.some(r => r.event.id === e.id)) return no('Der Schritt wurde nie wirksam (abgelehnt).');
  const body = counterBody(e, before, current);
  if (typeof body === 'string') return no(body);
  const ok = authorize(team, ctx, me, body);
  if (!ok.ok) return no(ok.reason);
  const counter = teamEvent(me, body, laterThan(team, now));
  const trial = foldTeam({ ...team, events: [...team.events, counter] }, ctx);
  // Re-assigning back is always a visible hint in the fold („umgewiesen“) – the very thing an undo does; all other
  // counter steps must fold cleanly.
  if (trial.rejected.some(r => r.event.id === counter.id) || (body.kind !== 'section.assign' && trial.conflicts.some(c => c.event.id === counter.id)))
    return no('Der Gegenschritt würde abgelehnt oder einen Konflikt auslösen.');
  return { ok: true, event: e, body, label: `Zurückgenommen: ${eventLabel(e)}` };
}

/** The newest own steps (at most `limit`) with whether and how they can be taken back – for „Meine letzten Schritte“. */
export function undoableSteps(team: TeamState, ctx: TeamContext, me: string, limit = 5, now?: string): TeamUndo[] {
  const own = team.events.filter(e => e.by === me && e.origin !== 'server' && e.kind !== 'member.join' && e.kind !== 'issue.ack' && e.kind !== 'team.digest');
  return own.slice().sort(compareEvents).reverse().slice(0, limit).map(e => teamUndo(team, ctx, e.id, me, now)!);
}
