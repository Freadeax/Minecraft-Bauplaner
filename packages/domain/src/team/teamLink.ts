/**
 * Teambau über die Mod (COOP-03, docs/architecture/team/TEAMBAU.md §7): what the planner sends to the Bauplaner
 * mod on this computer (`POST /v1/team`, format "team-link" 1 – the Paper plugin sends the same shape on the
 * team channel) and how it reads the mod's answers (`GET /v1/team`, `GET /v1/team/pull`). Pure functions;
 * the page does the requests.
 */
import { DomainError } from '../core/types.js';
import { checkTeamEvent, compareEvents } from './team.js';
import type { TeamContext, TeamEvent, TeamState, TeamView } from './team.js';

/** `hello.features` entry of mods with the team endpoints (mod 0.10.0+). */
export const LIVE_FEATURE_TEAM = 'team';

export interface TeamLinkSection {
  readonly id: string;
  /** 1-based in build order, the same number as in the plan file and on the server. */
  readonly nr: number;
  readonly name: string;
  readonly owner?: string;
  readonly status: string;
  readonly offer?: { readonly to: string };
}
export interface TeamLinkMember { readonly id: string; readonly name: string; readonly player?: string; readonly role: string; readonly away?: boolean }
export interface TeamLinkNote { readonly id: string; readonly tag: string; readonly text: string; readonly by: string; readonly section?: string; readonly pos?: readonly [number, number, number] }
export interface TeamLinkState {
  readonly teamId: string;
  readonly name: string;
  readonly dimension?: string;
  readonly revision?: number;
  readonly revisionSummary?: string;
  /** "Ich bin" of this browser: the mod reports in this member's name. */
  readonly me?: string;
  readonly sections: readonly TeamLinkSection[];
  readonly members: readonly TeamLinkMember[];
  readonly notes: readonly TeamLinkNote[];
  readonly at: string;
}

/** Team view in the mod's format: sections in build order (orphans left out), members, open notes. */
export function teamLinkState(team: TeamState, view: TeamView, ctx: TeamContext, opts: { readonly dimension?: string; readonly at?: string } = {}): TeamLinkState {
  const byId = new Map(view.sections.map(s => [s.sectionId, s]));
  const sections: TeamLinkSection[] = ctx.sections.slice(0, 1000).map((s, i) => {
    const st = byId.get(s.id);
    // Newer planner views (hand-over offers) are passed on when present; the mod ignores what it does not know.
    const offer = (st as { offer?: { to?: unknown } } | undefined)?.offer;
    return {
      id: s.id, nr: i + 1, name: s.name.slice(0, 120), status: st?.status ?? 'frei',
      ...(st?.owner && { owner: st.owner }),
      ...(offer && typeof offer.to === 'string' && { offer: { to: offer.to } }),
    };
  });
  const members: TeamLinkMember[] = view.members.slice(0, 500).map(m => ({
    id: m.id, name: m.name.slice(0, 60), role: m.role, ...(m.player && { player: m.player }),
    ...((m as { away?: unknown }).away ? { away: true } : {}),
  }));
  const notes: TeamLinkNote[] = view.notes.filter(n => !n.resolved).slice(0, 500).map(n => ({
    id: n.id, tag: n.tag, text: n.text.slice(0, 500), by: n.by, ...(n.section && { section: n.section }), ...(n.pos && { pos: n.pos }),
  }));
  return {
    teamId: team.teamId, name: team.name, ...(opts.dimension && { dimension: opts.dimension }),
    ...(view.release && { revision: view.release.revisionNumber, revisionSummary: view.release.summary.slice(0, 300) }),
    ...(team.self && { me: team.self }),
    sections, members, notes, at: opts.at ?? new Date().toISOString(),
  };
}

export type TeamLinkWay = 'none' | 'no_plugin' | 'ask' | 'waiting' | 'live' | 'off';
export const TEAM_LINK_WAY_TEXT: Readonly<Record<TeamLinkWay, string>> = {
  none: 'Minecraft ist mit keinem Server verbunden (Einzelspieler oder Hauptmenü).',
  no_plugin: 'Der Server hat kein Bauplaner-Plugin mit Teambau – Abgleich nur zwischen Planer und Spiel.',
  ask: 'Auf dem Server läuft das Plugin. Im Spiel einmal /bauplaner team erlauben eingeben, dann geht der Abgleich live über den Server.',
  waiting: 'Die Mod wartet auf die erste Antwort des Server-Plugins.',
  live: 'Live mit dem Server-Plugin: Meldungen aller Spieler kommen sofort an.',
  off: 'Der Teamkanal ist für diesen Server im Spiel ausgeschaltet (/bauplaner team erlauben schaltet ihn ein).',
};

export interface LiveTeam {
  readonly way: TeamLinkWay;
  readonly wayText: string;
  readonly allowed: boolean;
  /** Team the game shows (from this planner or the server). */
  readonly shown?: { readonly teamId: string; readonly name: string; readonly source: 'planer' | 'server'; readonly revision?: number; readonly me?: string; readonly sections: number };
  /** Team state the server plugin sent. */
  readonly server?: { readonly teamId: string; readonly name: string; readonly revision?: number; readonly me?: string; readonly stores: number };
  /** Own actions from the game, as planner events of "Ich bin" – merge with mergeTeam, then acknowledge. */
  readonly outbox: readonly TeamEvent[];
  readonly waiting: number;
  readonly rejections: readonly string[];
  readonly lastError?: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 200): string | undefined => typeof v === 'string' && v.length <= max ? v : undefined;
const num = (v: unknown): number | undefined => typeof v === 'number' && Number.isSafeInteger(v) ? v : undefined;

/** Reads `GET /v1/team`. Malformed outbox events are dropped (and counted in `waiting`, which stays the mod's number). */
export function readLiveTeam(raw: unknown): LiveTeam {
  if (!isObj(raw)) throw new DomainError('LIVELINK', 'Antwort der Mod zum Teambau ist ungültig.');
  const ways: readonly TeamLinkWay[] = ['none', 'no_plugin', 'ask', 'waiting', 'live', 'off'];
  const way = ways.includes(raw.link as TeamLinkWay) ? raw.link as TeamLinkWay : 'none';
  const outbox: TeamEvent[] = [];
  if (Array.isArray(raw.outbox)) for (const e of raw.outbox.slice(0, 500)) { try { outbox.push(checkTeamEvent(e)); } catch { /* skip */ } }
  const shown = isObj(raw.shown) && str(raw.shown.teamId, 64) ? {
    teamId: str(raw.shown.teamId, 64)!, name: str(raw.shown.name, 120) ?? '', source: raw.shown.source === 'server' ? 'server' as const : 'planer' as const,
    ...(num(raw.shown.revision) !== undefined && { revision: num(raw.shown.revision)! }), ...(str(raw.shown.me, 64) && { me: str(raw.shown.me, 64)! }),
    sections: num(raw.shown.sections) ?? 0,
  } : undefined;
  const server = isObj(raw.server) && str(raw.server.teamId, 64) ? {
    teamId: str(raw.server.teamId, 64)!, name: str(raw.server.name, 120) ?? '', ...(num(raw.server.revision) !== undefined && { revision: num(raw.server.revision)! }),
    ...(str(raw.server.me, 64) && { me: str(raw.server.me, 64)! }), stores: num(raw.server.stores) ?? 0,
  } : undefined;
  return {
    way, wayText: TEAM_LINK_WAY_TEXT[way], allowed: raw.allowed === true,
    ...(shown && { shown }), ...(server && { server }),
    outbox: outbox.sort(compareEvents), waiting: num(raw.waiting) ?? outbox.length,
    rejections: Array.isArray(raw.rejections) ? raw.rejections.filter((r): r is string => typeof r === 'string').slice(-20) : [],
    ...(str(raw.lastError, 500) && { lastError: str(raw.lastError, 500)! }),
  };
}

export interface LiveTeamPull { readonly teamId: string; readonly name: string; readonly events: readonly TeamEvent[]; readonly more: boolean; readonly total: number }

/** Reads `GET /v1/team/pull` (events of the server plugin, origin "server"). */
export function readLiveTeamPull(raw: unknown): LiveTeamPull {
  if (!isObj(raw) || !str(raw.teamId, 64) || !Array.isArray(raw.events)) throw new DomainError('LIVELINK', 'Antwort des Server-Plugins ist ungültig.');
  const events = raw.events.slice(0, 20_000).map(checkTeamEvent);
  return { teamId: str(raw.teamId, 64)!, name: str(raw.name, 120) ?? '', events, more: raw.more === true, total: num(raw.total) ?? events.length };
}

/** Code at the start of a 409 answer of the mod: why there is no way to the server. */
export function teamLinkProblem(message: string): 'team-plugin-fehlt' | 'team-nicht-erlaubt' | null {
  if (message.startsWith('team-plugin-fehlt')) return 'team-plugin-fehlt';
  if (message.startsWith('team-nicht-erlaubt')) return 'team-nicht-erlaubt';
  return null;
}

/** Text without the leading code ("team-plugin-fehlt: …" → "…"). */
export const teamLinkText = (message: string): string => message.replace(/^team-[a-z-]+:\s*/, '');
