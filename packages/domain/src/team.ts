import { canonicalJson, newId, sha256Hex } from './hash.js';
import { DomainError } from './types.js';

/**
 * Teambau (COOP-01, docs/architecture/TEAMBAU.md). Several players build one
 * project without a backend. Everything that happens while building (take a
 * section, report it done, deliver items, write a note, release a plan) is an
 * immutable event in the team log `site.team`. Merging two logs is the union
 * of their events by id, so merging is commutative, idempotent and loses
 * nothing; the visible state is always derived by folding the events in the
 * same deterministic order (`at`, then `id`). Rights are checked during the
 * fold with the role the author had at that moment; events without the right
 * stay in the log (nothing is deleted) but have no effect and are listed.
 *
 * Geometry is not part of the log: the plan has one authority (Bauleitung),
 * which releases frozen revisions with `plan.release`.
 */

export const TEAM_SCHEMA_VERSION = 1;
export const MAX_TEAM_EVENTS = 20_000;
const MAX_EVENT_JSON = 4096;

export type TeamRole = 'leitung' | 'meister' | 'helfer' | 'gast';
export const TEAM_ROLES: readonly TeamRole[] = ['leitung', 'meister', 'helfer', 'gast'];
export const TEAM_ROLE_LABEL: Readonly<Record<TeamRole, string>> = { leitung: 'Bauleitung', meister: 'Baumeister', helfer: 'Helfer', gast: 'Gast' };
export const TEAM_ROLE_TEXT: Readonly<Record<TeamRole, string>> = {
  leitung: 'darf alles: Plan freigeben, Rollen vergeben, zuweisen, bestätigen',
  meister: 'darf Abschnitte zuweisen, Meldungen bestätigen und Notizen schließen',
  helfer: 'darf freie Abschnitte übernehmen, melden, liefern und Notizen schreiben',
  gast: 'darf ansehen und Notizen schreiben',
};
const RANK: Readonly<Record<TeamRole, number>> = { leitung: 3, meister: 2, helfer: 1, gast: 0 };

export type NoteTag = 'frage' | 'problem' | 'material' | 'info';
export const NOTE_TAGS: readonly NoteTag[] = ['frage', 'problem', 'material', 'info'];
export const NOTE_TAG_LABEL: Readonly<Record<NoteTag, string>> = { frage: 'Frage', problem: 'Problem', material: 'Material fehlt', info: 'Info' };

export interface ItemCount { readonly item: string; readonly count: number }

interface Base {
  /** Unique id; merging relies on it. */
  readonly id: string;
  /** ISO time of the author's device. */
  readonly at: string;
  /** Builder id of the author (site.program.builders or a member.join). */
  readonly by: string;
  /** Where the event was written: in a planner, or by the server plugin with the player's real identity (COOP-02). */
  readonly origin: 'planer' | 'server';
}
export type TeamEventBody =
  | { readonly kind: 'member.join'; readonly member: string; readonly name: string; readonly player?: string }
  | { readonly kind: 'member.role'; readonly member: string; readonly role: TeamRole }
  | { readonly kind: 'member.player'; readonly member: string; readonly player: string }
  | { readonly kind: 'section.claim'; readonly section: string; readonly note?: string }
  | { readonly kind: 'section.assign'; readonly section: string; readonly member: string }
  | { readonly kind: 'section.release'; readonly section: string }
  | { readonly kind: 'section.done'; readonly section: string; readonly note?: string }
  | { readonly kind: 'section.verify'; readonly section: string; readonly ok: boolean; readonly note?: string }
  | { readonly kind: 'contribution'; readonly section?: string; readonly blocks?: number; readonly items?: readonly ItemCount[]; readonly note?: string }
  | { readonly kind: 'gather.claim'; readonly item: string; readonly count: number }
  | { readonly kind: 'note.add'; readonly noteId: string; readonly text: string; readonly tag: NoteTag; readonly section?: string; readonly pos?: readonly [number, number, number] }
  | { readonly kind: 'note.resolve'; readonly noteId: string; readonly text?: string }
  | { readonly kind: 'plan.release'; readonly revisionId: string; readonly revisionNumber: number; readonly summary: string }
  /** Baunachweis (COOP-04): blocks a player placed/broke inside one section box, counted by the server plugin between from and until. */
  | { readonly kind: 'build.tally'; readonly section: string; readonly placed: number; readonly broken: number; readonly blocks?: readonly ItemCount[]; readonly from: string; readonly until: string }
  /** Switches one's own Baunachweis on or off; off also hides earlier numbers. */
  | { readonly kind: 'member.tally'; readonly member: string; readonly on: boolean }
  /** Registers (or with remove removes) a storage chest of the team (COOP-04). */
  | { readonly kind: 'store.chest'; readonly chest: string; readonly name: string; readonly pos: readonly [number, number, number]; readonly dimension: string; readonly remove?: boolean }
  /** Full content of a storage chest, read by the server plugin when someone closed it; `more` when lines were cut. */
  | { readonly kind: 'store.count'; readonly chest: string; readonly items: readonly ItemCount[]; readonly more?: boolean }
  /** Checked storage chests (COOP-05, docs/architecture/LAGERKISTEN.md): section ('' = whole project), purpose, protection, second half of a double chest (null = none). */
  | { readonly kind: 'store.config'; readonly chest: string; readonly section?: string; readonly purpose?: StorePurpose; readonly protection?: StoreProtection; readonly pos2?: readonly [number, number, number] | null; readonly name?: string }
  /** What one player (or a hopper) put in / took out, net per opening; moves the expected content, never booked again as stored/taken. */
  | { readonly kind: 'store.move'; readonly chest: string; readonly in?: readonly ItemCount[]; readonly out?: readonly ItemCount[]; readonly via: 'spieler' | 'trichter' | 'abbau'; readonly player?: string }
  /** Server comparison of a count with the expected content; differences add up until a seal. */
  | { readonly kind: 'store.check'; readonly chest: string; readonly status: 'geprueft' | 'abweichend' | 'fehlt'; readonly sha256?: string; readonly diff?: readonly { readonly item: string; readonly delta: number }[] }
  /** Baumeister+ accepts the current content: open differences are closed. */
  | { readonly kind: 'store.seal'; readonly chest: string; readonly sha256: string; readonly note?: string };
export type StorePurpose = 'vorrat' | 'eingang' | 'ausgabe' | 'rest';
export type StoreProtection = 'offen' | 'team' | 'abschnitt' | 'eingang' | 'gesperrt';
export const STORE_PURPOSES: readonly StorePurpose[] = ['vorrat', 'eingang', 'ausgabe', 'rest'];
export const STORE_PROTECTIONS: readonly StoreProtection[] = ['offen', 'team', 'abschnitt', 'eingang', 'gesperrt'];
export type StoreStatus = 'ungeprueft' | 'geprueft' | 'abweichend' | 'fehlt';
export type KnownTeamEvent = Base & TeamEventBody;
/** Events of a newer planner version: kept and passed on, but without effect. */
export type UnknownTeamEvent = Base & { readonly kind: string; readonly [key: string]: unknown };
export type TeamEvent = KnownTeamEvent | UnknownTeamEvent;
export type TeamEventKind = TeamEventBody['kind'];
const KNOWN = new Set<string>(['member.join', 'member.role', 'member.player', 'section.claim', 'section.assign', 'section.release', 'section.done',
  'section.verify', 'contribution', 'gather.claim', 'note.add', 'note.resolve', 'plan.release', 'build.tally', 'member.tally', 'store.chest', 'store.count',
  'store.config', 'store.move', 'store.check', 'store.seal']);
/** Kinds only the server plugin may write (origin server): they are measurements, not claims. */
export const SERVER_ONLY_KINDS: ReadonlySet<string> = new Set(['build.tally', 'store.count', 'store.move', 'store.check']);
export const isKnownEvent = (e: TeamEvent): e is KnownTeamEvent => KNOWN.has(e.kind);

export interface TeamState {
  readonly schemaVersion: 1;
  /** Shared by every copy of the project in every browser and on the server. */
  readonly teamId: string;
  readonly name: string;
  readonly createdAt: string;
  /** Builder id of the founder: Bauleitung until a member.role event says otherwise. */
  readonly founder: string;
  /** "Ich bin" of this browser. Local only: never exported in a team package. */
  readonly self?: string;
  /** Minecraft server address for invitations (display only). */
  readonly server?: string;
  /** Ordered by (at, id), ids unique. Only appended or merged, never rewritten. */
  readonly events: readonly TeamEvent[];
}

// ---------------------------------------------------------------- validation

const fail = (message: string): never => { throw new DomainError('INVALID', `Team: ${message}`); };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number, what: string, min = 1): string => {
  if (typeof v !== 'string' || v.length < min || v.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)) fail(`${what} ungültig`);
  return v as string;
};
const optText = (v: unknown, max: number, what: string) => { if (v !== undefined) text(v, max, what, 0); };
const int = (v: unknown, min: number, max: number, what: string): number => {
  if (!Number.isSafeInteger(v) || (v as number) < min || (v as number) > max) fail(`${what} ungültig`);
  return v as number;
};
const iso = (v: unknown, what: string) => { if (typeof v !== 'string' || !Number.isFinite(Date.parse(v)) || v.length > 40) fail(`${what} ist keine Zeit`); };
/** Minecraft player names: 3–16 letters, digits, underscore (Bedrock prefixes like "." allowed). */
export const PLAYER_NAME = /^[.*]?[A-Za-z0-9_]{2,16}$/;
const ITEM_ID = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;

function itemLines(v: unknown, max: number, what: string, required = false) {
  if (v === undefined && !required) return;
  if (!Array.isArray(v) || v.length > max) fail(`${what}: höchstens ${max} Zeilen`);
  const seen = new Set<string>();
  for (const l of v as unknown[]) {
    if (!isObj(l) || typeof l.item !== 'string' || !ITEM_ID.test(l.item)) fail(`${what}: Item ungültig`);
    const item = (l as Record<string, unknown>).item as string;
    if (seen.has(item)) fail(`${what}: ${item} doppelt`);
    seen.add(item);
    int((l as Record<string, unknown>).count, 1, 1e9, `${what}: Menge`);
  }
}

export function checkTeamEvent(raw: unknown): TeamEvent {
  if (!isObj(raw)) return fail('Ereignis ist kein Objekt');
  text(raw.id, 64, 'Ereignis-ID'); iso(raw.at, 'Ereigniszeit'); text(raw.by, 64, 'Urheber'); text(raw.kind, 40, 'Ereignisart');
  if (raw.origin !== 'planer' && raw.origin !== 'server') fail('Herkunft muss planer oder server sein');
  if (JSON.stringify(raw).length > MAX_EVENT_JSON) fail(`Ereignis ${String(raw.id)} ist zu groß`);
  const where = `Ereignis ${String(raw.id)}`;
  switch (raw.kind) {
    case 'member.join': text(raw.member, 64, `${where}: Mitglied`); text(raw.name, 60, `${where}: Name`);
      if (raw.player !== undefined && (typeof raw.player !== 'string' || !PLAYER_NAME.test(raw.player))) fail(`${where}: Spielername ungültig`); break;
    case 'member.role': text(raw.member, 64, `${where}: Mitglied`); if (!TEAM_ROLES.includes(raw.role as TeamRole)) fail(`${where}: Rolle unbekannt`); break;
    case 'member.player': text(raw.member, 64, `${where}: Mitglied`);
      if (typeof raw.player !== 'string' || !PLAYER_NAME.test(raw.player)) fail(`${where}: Spielername ungültig`); break;
    case 'section.claim': case 'section.done': text(raw.section, 64, `${where}: Abschnitt`); optText(raw.note, 300, `${where}: Notiz`); break;
    case 'section.assign': text(raw.section, 64, `${where}: Abschnitt`); text(raw.member, 64, `${where}: Mitglied`); break;
    case 'section.release': text(raw.section, 64, `${where}: Abschnitt`); break;
    case 'section.verify': text(raw.section, 64, `${where}: Abschnitt`); if (typeof raw.ok !== 'boolean') fail(`${where}: Prüfergebnis fehlt`);
      optText(raw.note, 300, `${where}: Notiz`); break;
    case 'contribution': {
      if (raw.section !== undefined) text(raw.section, 64, `${where}: Abschnitt`);
      if (raw.blocks !== undefined) int(raw.blocks, 0, 10_000_000, `${where}: Blöcke`);
      if (raw.items !== undefined) {
        if (!Array.isArray(raw.items) || raw.items.length > 64) fail(`${where}: Itemliste ungültig`);
        for (const l of raw.items as unknown[]) {
          if (!isObj(l) || typeof l.item !== 'string' || !ITEM_ID.test(l.item)) fail(`${where}: Item ungültig`);
          int((l as Record<string, unknown>).count, 1, 1e9, `${where}: Menge`);
        }
      }
      if (raw.blocks === undefined && raw.items === undefined && raw.note === undefined) fail(`${where}: Beitrag ohne Inhalt`);
      optText(raw.note, 300, `${where}: Notiz`); break;
    }
    case 'build.tally': {
      text(raw.section, 64, `${where}: Abschnitt`); int(raw.placed, 0, 10_000_000, `${where}: gesetzt`); int(raw.broken, 0, 10_000_000, `${where}: abgebaut`);
      iso(raw.from, `${where}: von`); iso(raw.until, `${where}: bis`);
      if (raw.blocks !== undefined) itemLines(raw.blocks, 48, `${where}: Blockarten`);
      break;
    }
    case 'member.tally': text(raw.member, 64, `${where}: Mitglied`); if (typeof raw.on !== 'boolean') fail(`${where}: an/aus fehlt`); break;
    case 'store.chest': {
      text(raw.chest, 64, `${where}: Kiste`); text(raw.name, 60, `${where}: Name`); text(raw.dimension, 80, `${where}: Dimension`);
      if (!Array.isArray(raw.pos) || raw.pos.length !== 3) fail(`${where}: Position ungültig`);
      for (const c of raw.pos as unknown[]) int(c, -30_000_000, 30_000_000, `${where}: Position`);
      if (raw.remove !== undefined && raw.remove !== true) fail(`${where}: remove ist nur true`);
      break;
    }
    case 'store.count':
      text(raw.chest, 64, `${where}: Kiste`); itemLines(raw.items, 64, `${where}: Inhalt`, true);
      if (raw.more !== undefined && raw.more !== true) fail(`${where}: more ist nur true`);
      break;
    case 'store.config': {
      text(raw.chest, 64, `${where}: Kiste`);
      if (raw.section !== undefined) text(raw.section, 64, `${where}: Abschnitt`, 0);
      if (raw.purpose !== undefined && !STORE_PURPOSES.includes(raw.purpose as StorePurpose)) fail(`${where}: Zweck unbekannt`);
      if (raw.protection !== undefined && !STORE_PROTECTIONS.includes(raw.protection as StoreProtection)) fail(`${where}: Schutzstufe unbekannt`);
      if (raw.pos2 !== undefined && raw.pos2 !== null) {
        if (!Array.isArray(raw.pos2) || raw.pos2.length !== 3) fail(`${where}: zweite Position ungültig`);
        for (const c of raw.pos2 as unknown[]) int(c, -30_000_000, 30_000_000, `${where}: zweite Position`);
      }
      if (raw.name !== undefined) text(raw.name, 60, `${where}: Name`);
      break;
    }
    case 'store.move':
      text(raw.chest, 64, `${where}: Kiste`); itemLines(raw.in, 64, `${where}: eingelegt`); itemLines(raw.out, 64, `${where}: entnommen`);
      if (raw.via !== 'spieler' && raw.via !== 'trichter' && raw.via !== 'abbau') fail(`${where}: Weg unbekannt`);
      if (raw.player !== undefined) text(raw.player, 40, `${where}: Spieler`);
      break;
    case 'store.check': {
      text(raw.chest, 64, `${where}: Kiste`);
      if (raw.status !== 'geprueft' && raw.status !== 'abweichend' && raw.status !== 'fehlt') fail(`${where}: Prüfstatus unbekannt`);
      if (raw.sha256 !== undefined && (typeof raw.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(raw.sha256))) fail(`${where}: Prüfsumme ungültig`);
      if (raw.diff !== undefined) {
        if (!Array.isArray(raw.diff) || raw.diff.length > 64) fail(`${where}: Abweichung: höchstens 64 Zeilen`);
        for (const l of raw.diff as unknown[]) {
          if (!isObj(l) || typeof l.item !== 'string' || !ITEM_ID.test(l.item)) fail(`${where}: Abweichung: Item ungültig`);
          int((l as Record<string, unknown>).delta, -1e9, 1e9, `${where}: Abweichung: Menge`);
        }
      }
      break;
    }
    case 'store.seal':
      text(raw.chest, 64, `${where}: Kiste`);
      if (typeof raw.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(raw.sha256)) fail(`${where}: Prüfsumme ungültig`);
      optText(raw.note, 300, `${where}: Notiz`); break;
    case 'gather.claim': if (typeof raw.item !== 'string' || !ITEM_ID.test(raw.item)) fail(`${where}: Item ungültig`); int(raw.count, 0, 1e9, `${where}: Menge`); break;
    case 'note.add': text(raw.noteId, 64, `${where}: Notiz-ID`); text(raw.text, 500, `${where}: Text`);
      if (!NOTE_TAGS.includes(raw.tag as NoteTag)) fail(`${where}: Notizart unbekannt`);
      if (raw.section !== undefined) text(raw.section, 64, `${where}: Abschnitt`);
      if (raw.pos !== undefined && (!Array.isArray(raw.pos) || raw.pos.length !== 3 || !raw.pos.every(n => Number.isSafeInteger(n) && Math.abs(n) <= 30_000_000)))
        fail(`${where}: Position ungültig`);
      break;
    case 'note.resolve': text(raw.noteId, 64, `${where}: Notiz-ID`); optText(raw.text, 300, `${where}: Text`); break;
    case 'plan.release': text(raw.revisionId, 64, `${where}: Revision`); int(raw.revisionNumber, 0, 1e6, `${where}: Revisionsnummer`);
      text(raw.summary, 300, `${where}: Beschreibung`, 0); break;
    default: break; // newer kinds: kept as they are
  }
  return raw as unknown as TeamEvent;
}

export const compareEvents = (a: { at: string; id: string }, b: { at: string; id: string }): number =>
  a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

export function checkTeam(raw: unknown): TeamState {
  if (!isObj(raw)) return fail('kein Objekt');
  if (raw.schemaVersion !== TEAM_SCHEMA_VERSION) fail(`unbekannte Schemaversion ${String(raw.schemaVersion)}`);
  text(raw.teamId, 64, 'Team-ID'); text(raw.name, 120, 'Teamname'); iso(raw.createdAt, 'Erstellzeit'); text(raw.founder, 64, 'Gründer');
  if (raw.self !== undefined) text(raw.self, 64, '„Ich bin“');
  optText(raw.server, 120, 'Serveradresse');
  if (!Array.isArray(raw.events) || raw.events.length > MAX_TEAM_EVENTS) fail(`höchstens ${MAX_TEAM_EVENTS} Ereignisse`);
  const ids = new Set<string>();
  let previous: TeamEvent | undefined;
  for (const e of raw.events as unknown[]) {
    const event = checkTeamEvent(e);
    if (ids.has(event.id)) fail(`Ereignis-ID ${event.id} doppelt`);
    ids.add(event.id);
    if (previous && compareEvents(previous, event) > 0) fail('Ereignisse sind nicht geordnet');
    previous = event;
  }
  return raw as unknown as TeamState;
}

// ---------------------------------------------------------------- building

export function createTeam(input: { name: string; founder: string; server?: string; teamId?: string; at?: string }): TeamState {
  const team: TeamState = {
    schemaVersion: 1, teamId: input.teamId ?? newId('team'), name: input.name.trim().slice(0, 120) || 'Team', createdAt: input.at ?? new Date().toISOString(),
    founder: input.founder, self: input.founder, ...(input.server?.trim() && { server: input.server.trim() }), events: [],
  };
  return checkTeam(team);
}

/** A new event by `by`. Does not check rights; {@link authorize} does. */
export function teamEvent(by: string, body: TeamEventBody, at: string = new Date().toISOString(), origin: 'planer' | 'server' = 'planer'): KnownTeamEvent {
  return checkTeamEvent({ id: newId('tev'), at, by, origin, ...body }) as KnownTeamEvent;
}

/** Appends events (sorted in, duplicates by id ignored). */
export function appendEvents(team: TeamState, events: readonly TeamEvent[]): TeamState {
  return mergeTeam(team, { ...team, events }).team;
}

export interface TeamMerge {
  readonly team: TeamState;
  /** Events that were new for the local log, in log order. */
  readonly added: readonly TeamEvent[];
  /** Events known already (same id). */
  readonly known: number;
  /** Same id but different content: the local one is kept, the other is reported. */
  readonly clashes: readonly { readonly local: TeamEvent; readonly incoming: TeamEvent }[];
}

/**
 * Union of two team logs. Order-independent and idempotent: merge(a, b) and
 * merge(b, a) give the same events; merging again adds nothing. Local fields
 * (self) stay; `server` is taken from the incoming log when missing locally.
 */
export function mergeTeam(local: TeamState, incoming: TeamState): TeamMerge {
  if (local.teamId !== incoming.teamId) throw new DomainError('TEAM_MISMATCH', `Das Paket gehört zu einem anderen Team (${incoming.name}).`);
  const byId = new Map(local.events.map(e => [e.id, e]));
  const added: TeamEvent[] = [], clashes: { local: TeamEvent; incoming: TeamEvent }[] = [];
  let known = 0;
  for (const raw of incoming.events) {
    const e = checkTeamEvent(raw), mine = byId.get(e.id);
    if (!mine) { byId.set(e.id, e); added.push(e); continue; }
    if (canonicalJson(mine) === canonicalJson(e)) known++; else clashes.push({ local: mine, incoming: e });
  }
  if (byId.size > MAX_TEAM_EVENTS) throw new DomainError('TEAM_FULL', `Das Teamprotokoll hätte mehr als ${MAX_TEAM_EVENTS} Ereignisse.`);
  const events = [...byId.values()].sort(compareEvents);
  // The founder is fixed at creation; a different founder means two teams were created with one id (should not happen).
  const team: TeamState = { ...local, events, ...(local.server === undefined && incoming.server !== undefined && { server: incoming.server }) };
  return { team, added: added.sort(compareEvents), known, clashes };
}

// ---------------------------------------------------------------- derived view

export type SectionTeamStatus = 'frei' | 'vergeben' | 'gemeldet' | 'bestaetigt' | 'nacharbeit';
export const SECTION_TEAM_STATUS_LABEL: Readonly<Record<SectionTeamStatus, string>> = {
  frei: 'frei', vergeben: 'in Arbeit', gemeldet: 'fertig gemeldet', bestaetigt: 'bestätigt', nacharbeit: 'Nacharbeit',
};

export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly role: TeamRole;
  readonly player?: string;
  /** In site.program.builders (known to the plan) or only through a member.join. */
  readonly inProgram: boolean;
  readonly sections: readonly string[];
  readonly blocks: number;
  readonly items: Readonly<Record<string, number>>;
  readonly reportedSections: number;
  readonly confirmedSections: number;
  readonly lastActive?: string;
  /** Baunachweis from the server plugin (COOP-04): blocks placed and broken inside section boxes. */
  readonly placed: number;
  readonly broken: number;
  /** Booked into / taken out of team storage chests (difference of two counts), by item. */
  readonly stored: Readonly<Record<string, number>>;
  readonly taken: Readonly<Record<string, number>>;
  /** false: the member switched the Baunachweis off; no numbers are shown. */
  readonly tally: boolean;
}
export interface SectionTeamState {
  readonly sectionId: string;
  readonly status: SectionTeamStatus;
  readonly owner: string | null;
  readonly doneBy?: string;
  readonly verifiedBy?: string;
  readonly note?: string;
  /** Section is not (any more) in the plan. */
  readonly orphan: boolean;
  readonly history: readonly { readonly at: string; readonly by: string; readonly text: string }[];
  /** Baunachweis inside this section: placed blocks over all members, and per member. */
  readonly placed: number;
  readonly broken: number;
  readonly builders: Readonly<Record<string, number>>;
}
export interface StoreChest {
  readonly id: string;
  readonly name: string;
  readonly pos: readonly [number, number, number];
  readonly dimension: string;
  /** Last count; empty until the plugin read the chest. */
  readonly items: Readonly<Record<string, number>>;
  readonly countedAt?: string;
  readonly countedBy?: string;
  readonly partial: boolean;
  /** COOP-05: section the store belongs to (absent = whole project), purpose and protection level. */
  readonly section?: string;
  readonly purpose: StorePurpose;
  readonly protection?: StoreProtection;
  readonly pos2?: readonly [number, number, number];
  /** Server check: geprueft, abweichend (open difference since the last seal), fehlt (no container any more), ungeprueft. */
  readonly status: StoreStatus;
  readonly checkedAt?: string;
  /** Unexplained difference since the last seal (+ more than expected, − less). */
  readonly deviation: Readonly<Record<string, number>>;
  readonly sealedBy?: string;
  readonly sealedAt?: string;
  /** Booked moves per member (store.move by players), and of hoppers. */
  readonly movedIn: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly movedOut: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly hopperIn: Readonly<Record<string, number>>;
  readonly hopperOut: Readonly<Record<string, number>>;
}
export interface TeamNote {
  readonly id: string;
  readonly at: string;
  readonly by: string;
  readonly text: string;
  readonly tag: NoteTag;
  readonly section?: string;
  readonly pos?: readonly [number, number, number];
  readonly resolved?: { readonly at: string; readonly by: string; readonly text?: string };
  /** Builder ids mentioned with @Name. */
  readonly mentions: readonly string[];
}
export interface TeamRejection { readonly event: TeamEvent; readonly reason: string }
export interface TeamConflict { readonly event: TeamEvent; readonly text: string }
export interface GatherClaim { readonly member: string; readonly item: string; readonly count: number; readonly at: string }
export interface PlanRelease { readonly revisionId: string; readonly revisionNumber: number; readonly summary: string; readonly at: string; readonly by: string }

export interface TeamView {
  readonly members: readonly TeamMember[];
  readonly sections: readonly SectionTeamState[];
  readonly notes: readonly TeamNote[];
  readonly gather: readonly GatherClaim[];
  /** Delivered items over all members. */
  readonly delivered: Readonly<Record<string, number>>;
  readonly release: PlanRelease | null;
  /** Releases by different leaders pointing to different revisions after each other. */
  readonly releases: readonly PlanRelease[];
  readonly rejected: readonly TeamRejection[];
  /** Effective, but worth a look (taken over, reported by someone else …). */
  readonly conflicts: readonly TeamConflict[];
  readonly unknownKinds: number;
  /** Team storage chests (COOP-04), not removed ones. */
  readonly stores: readonly StoreChest[];
  /** Sum of the last counts of all chests. */
  readonly stock: Readonly<Record<string, number>>;
  /** Placed blocks by block id over all visible tallies (material really used). */
  readonly placedBlocks: Readonly<Record<string, number>>;
  /** Time span of the visible Baunachweis. */
  readonly tallySpan: { readonly from: string; readonly until: string } | null;
}

export interface TeamContext {
  /** Plan sections in build order. */
  readonly sections: readonly { readonly id: string; readonly name: string }[];
  /** site.program.builders (PROJ-01). */
  readonly builders: readonly { readonly id: string; readonly name: string }[];
}

export type TeamAction = TeamEventKind;
/** Minimum role per event kind; some kinds have extra rules in the fold (own section, own note, self). */
const NEED: Readonly<Record<TeamEventKind, TeamRole>> = {
  'member.join': 'gast', 'member.role': 'leitung', 'member.player': 'gast', 'section.claim': 'helfer', 'section.assign': 'meister',
  'section.release': 'helfer', 'section.done': 'helfer', 'section.verify': 'meister', contribution: 'helfer', 'gather.claim': 'helfer',
  'note.add': 'gast', 'note.resolve': 'helfer', 'plan.release': 'leitung',
  'build.tally': 'gast', 'member.tally': 'gast', 'store.chest': 'meister', 'store.count': 'gast',
  'store.config': 'meister', 'store.seal': 'meister', 'store.move': 'gast', 'store.check': 'gast',
};
export const canTeam = (role: TeamRole | undefined, action: TeamAction): boolean => RANK[role ?? 'gast'] >= RANK[NEED[action]];

const mentionRe = /@([A-Za-zÄÖÜäöüß0-9_.-]{2,40})/g;

/** Folds the log into the visible state. Pure and deterministic. */
export function teamView(team: TeamState, ctx: TeamContext): TeamView {
  const sectionIds = new Set(ctx.sections.map(s => s.id));
  const names = new Map<string, string>(ctx.builders.map(b => [b.id, b.name]));
  const inProgram = new Set(ctx.builders.map(b => b.id));
  const roles = new Map<string, TeamRole>([[team.founder, 'leitung']]);
  const players = new Map<string, string>();
  const known = new Set<string>([...inProgram, team.founder]);
  const lastActive = new Map<string, string>();
  type Mutable = { status: SectionTeamStatus; owner: string | null; doneBy?: string; verifiedBy?: string; note?: string; history: { at: string; by: string; text: string }[] };
  const sections = new Map<string, Mutable>();
  const sec = (id: string): Mutable => { let s = sections.get(id); if (!s) sections.set(id, s = { status: 'frei', owner: null, history: [] }); return s; };
  const notes = new Map<string, { at: string; by: string; text: string; tag: NoteTag; section?: string; pos?: readonly [number, number, number]; resolved?: { at: string; by: string; text?: string } }>();
  const gather = new Map<string, GatherClaim>();
  const blocks = new Map<string, number>(), items = new Map<string, Map<string, number>>();
  const delivered: Record<string, number> = {};
  const releases: PlanRelease[] = [];
  const rejected: TeamRejection[] = [], conflicts: TeamConflict[] = [];
  let unknownKinds = 0;
  const tallyOff = new Set<string>();
  const tallies: { by: string; section: string; placed: number; broken: number; blocks?: readonly ItemCount[]; from: string; until: string }[] = [];
  type Chest = { name: string; pos: readonly [number, number, number]; dimension: string; items: Map<string, number>; countedAt?: string; countedBy?: string; partial: boolean; counted: boolean;
    // COOP-05, same rules as StoreIndex.java
    section?: string; purpose: StorePurpose; protection?: StoreProtection; pos2?: readonly [number, number, number]; expected: Map<string, number> | null;
    status: StoreStatus; checkedAt?: string; deviation: Map<string, number>; sealedBy?: string; sealedAt?: string;
    movedIn: Map<string, Map<string, number>>; movedOut: Map<string, Map<string, number>> };
  const addTo = (m: Map<string, number>, item: string, n: number) => { const v = (m.get(item) ?? 0) + n; if (v === 0) m.delete(item); else m.set(item, v); };
  const chests = new Map<string, Chest>();
  const stored = new Map<string, Map<string, number>>(), taken = new Map<string, Map<string, number>>();
  const book = (m: Map<string, Map<string, number>>, who: string, item: string, n: number) => {
    let x = m.get(who); if (!x) m.set(who, x = new Map()); x.set(item, (x.get(item) ?? 0) + n);
  };
  const nameOf = (id: string) => names.get(id) ?? id;
  const roleOf = (id: string): TeamRole => roles.get(id) ?? (known.has(id) ? 'helfer' : 'gast');
  const reject = (event: TeamEvent, reason: string) => { rejected.push({ event, reason }); };

  for (const event of team.events) {
    if (!isKnownEvent(event)) { unknownKinds++; continue; }
    const role = roleOf(event.by);
    const self = (m: string) => m === event.by;
    // member.join and member.player may always be written for oneself.
    const selfAllowed = (event.kind === 'member.join' || event.kind === 'member.player' || event.kind === 'member.tally') && self(event.member);
    if (SERVER_ONLY_KINDS.has(event.kind) && event.origin !== 'server') { reject(event, `${eventLabel(event)} kommt nur vom Server-Plugin.`); continue; }
    if (!selfAllowed && !canTeam(role, event.kind)) {
      // Helpers may release their own section and resolve their own notes; handled below with their own rule.
      if (!(event.kind === 'note.resolve' && notes.get(event.noteId)?.by === event.by)) {
        reject(event, `${nameOf(event.by)} ist ${TEAM_ROLE_LABEL[role]} und darf das nicht (${eventLabel(event)}).`);
        continue;
      }
    }
    lastActive.set(event.by, event.at);
    switch (event.kind) {
      case 'member.join':
        if (!self(event.member) && role !== 'leitung') { reject(event, `Nur die Bauleitung kann andere aufnehmen.`); break; }
        known.add(event.member);
        if (!names.has(event.member)) names.set(event.member, event.name);
        if (event.player) players.set(event.member, event.player);
        break;
      case 'member.role': {
        if (!known.has(event.member)) { reject(event, `Unbekanntes Mitglied ${event.member}.`); break; }
        const leaders = [...known].filter(id => roleOf(id) === 'leitung');
        if (roleOf(event.member) === 'leitung' && event.role !== 'leitung' && leaders.length <= 1) { reject(event, 'Es muss mindestens eine Bauleitung bleiben.'); break; }
        roles.set(event.member, event.role);
        break;
      }
      case 'member.player':
        if (!self(event.member) && role !== 'leitung') { reject(event, 'Den Spielernamen setzt jeder selbst oder die Bauleitung.'); break; }
        players.set(event.member, event.player);
        break;
      case 'section.claim': {
        const s = sec(event.section);
        if (s.owner === event.by) break;
        if (s.owner) { conflicts.push({ event, text: `${nameOf(event.by)} wollte „${sectionName(ctx, event.section)}“ übernehmen, der Abschnitt war schon an ${nameOf(s.owner)} vergeben.` }); break; }
        if (s.status === 'bestaetigt') { reject(event, `„${sectionName(ctx, event.section)}“ ist schon bestätigt.`); break; }
        s.owner = event.by; s.status = 'vergeben'; delete s.doneBy; delete s.verifiedBy;
        if (event.note) s.note = event.note;
        s.history.push({ at: event.at, by: event.by, text: 'übernommen' });
        break;
      }
      case 'section.assign': {
        const s = sec(event.section);
        if (!known.has(event.member)) { reject(event, `Unbekanntes Mitglied ${event.member}.`); break; }
        if (s.owner && s.owner !== event.member) conflicts.push({ event, text: `${nameOf(event.by)} hat „${sectionName(ctx, event.section)}“ von ${nameOf(s.owner)} an ${nameOf(event.member)} umgewiesen.` });
        s.owner = event.member;
        if (s.status === 'frei') s.status = 'vergeben';
        s.history.push({ at: event.at, by: event.by, text: `zugewiesen an ${nameOf(event.member)}` });
        break;
      }
      case 'section.release': {
        const s = sec(event.section);
        if (s.owner !== event.by && !canTeam(role, 'section.assign')) { reject(event, `Nur ${s.owner ? nameOf(s.owner) : 'der Inhaber'} oder ein Baumeister kann „${sectionName(ctx, event.section)}“ abgeben.`); break; }
        if (s.status === 'bestaetigt') { reject(event, `„${sectionName(ctx, event.section)}“ ist bestätigt und kann nicht mehr abgegeben werden.`); break; }
        s.owner = null; s.status = 'frei'; delete s.doneBy;
        s.history.push({ at: event.at, by: event.by, text: 'abgegeben' });
        break;
      }
      case 'section.done': {
        const s = sec(event.section);
        if (s.owner && s.owner !== event.by) conflicts.push({ event, text: `${nameOf(event.by)} hat „${sectionName(ctx, event.section)}“ fertig gemeldet, Inhaber ist ${nameOf(s.owner)}.` });
        if (!s.owner) s.owner = event.by;
        s.status = 'gemeldet'; s.doneBy = event.by; delete s.verifiedBy;
        if (event.note) s.note = event.note;
        s.history.push({ at: event.at, by: event.by, text: 'fertig gemeldet' });
        break;
      }
      case 'section.verify': {
        const s = sec(event.section);
        if (s.status === 'frei') { reject(event, `„${sectionName(ctx, event.section)}“ ist frei, es gibt nichts zu prüfen.`); break; }
        s.status = event.ok ? 'bestaetigt' : 'nacharbeit'; s.verifiedBy = event.by;
        if (event.note) s.note = event.note;
        s.history.push({ at: event.at, by: event.by, text: event.ok ? 'bestätigt' : `Nacharbeit${event.note ? `: ${event.note}` : ''}` });
        break;
      }
      case 'contribution': {
        if (event.blocks) blocks.set(event.by, (blocks.get(event.by) ?? 0) + event.blocks);
        for (const l of event.items ?? []) {
          let m = items.get(event.by); if (!m) items.set(event.by, m = new Map());
          m.set(l.item, (m.get(l.item) ?? 0) + l.count);
          delivered[l.item] = (delivered[l.item] ?? 0) + l.count;
        }
        break;
      }
      case 'gather.claim': {
        const key = `${event.by} ${event.item}`;
        if (event.count === 0) gather.delete(key); else gather.set(key, { member: event.by, item: event.item, count: event.count, at: event.at });
        break;
      }
      case 'note.add':
        if (notes.has(event.noteId)) { reject(event, 'Notiz-ID doppelt.'); break; }
        notes.set(event.noteId, { at: event.at, by: event.by, text: event.text, tag: event.tag, ...(event.section && { section: event.section }), ...(event.pos && { pos: event.pos }) });
        break;
      case 'note.resolve': {
        const n = notes.get(event.noteId);
        if (!n) { reject(event, 'Notiz unbekannt.'); break; }
        if (n.by !== event.by && !canTeam(role, 'section.verify')) { reject(event, 'Fremde Notizen schließt ein Baumeister.'); break; }
        n.resolved = { at: event.at, by: event.by, ...(event.text && { text: event.text }) };
        break;
      }
      case 'plan.release':
        releases.push({ revisionId: event.revisionId, revisionNumber: event.revisionNumber, summary: event.summary, at: event.at, by: event.by });
        break;
      case 'member.tally':
        if (!self(event.member)) { reject(event, 'Den Baunachweis schaltet jeder nur für sich selbst.'); break; }
        if (event.on) tallyOff.delete(event.member); else tallyOff.add(event.member);
        break;
      case 'build.tally':
        tallies.push({ by: event.by, section: event.section, placed: event.placed, broken: event.broken, ...(event.blocks && { blocks: event.blocks }), from: event.from, until: event.until });
        break;
      case 'store.chest': {
        const c = chests.get(event.chest);
        if (event.remove) { if (!c) reject(event, 'Lagerkiste unbekannt.'); else chests.delete(event.chest); break; }
        if (c) { c.name = event.name; c.pos = event.pos; c.dimension = event.dimension; break; }
        chests.set(event.chest, { name: event.name, pos: event.pos, dimension: event.dimension, items: new Map(), partial: false, counted: false,
          purpose: 'vorrat', expected: null, status: 'ungeprueft', deviation: new Map(), movedIn: new Map(), movedOut: new Map() });
        break;
      }
      case 'store.count': {
        const c = chests.get(event.chest);
        if (!c) { reject(event, 'Lagerkiste unbekannt oder entfernt.'); break; }
        const next = new Map(event.items.map(l => [l.item, l.count]));
        // Difference to the previous count is what this player put in or took out; never for the first count or cut lists.
        if (c.counted && !c.partial && !event.more) {
          for (const item of new Set([...c.items.keys(), ...next.keys()])) {
            const d = (next.get(item) ?? 0) - (c.items.get(item) ?? 0);
            if (d > 0) book(stored, event.by, item, d); else if (d < 0) book(taken, event.by, item, -d);
          }
        }
        c.items = next; c.countedAt = event.at; c.countedBy = event.by; c.partial = !!event.more; c.counted = true;
        c.expected = new Map(next);
        break;
      }
      case 'store.config': {
        const c = chests.get(event.chest);
        if (!c) { reject(event, 'Lagerkiste unbekannt oder entfernt.'); break; }
        if (event.section !== undefined) { if (event.section) c.section = event.section; else delete c.section; }
        if (event.purpose) c.purpose = event.purpose;
        if (event.protection) c.protection = event.protection;
        if (event.pos2 !== undefined) { if (event.pos2) c.pos2 = event.pos2; else delete c.pos2; }
        if (event.name?.trim()) c.name = event.name;
        break;
      }
      case 'store.move': {
        const c = chests.get(event.chest);
        if (!c) { reject(event, 'Lagerkiste unbekannt oder entfernt.'); break; }
        const who = event.via === 'trichter' ? 'trichter' : event.by;
        for (const [list, target, sign] of [[event.in, c.movedIn, 1], [event.out, c.movedOut, -1]] as const) {
          let m = target.get(who); if (!m) target.set(who, m = new Map());
          for (const l of list ?? []) { addTo(m, l.item, l.count); if (c.expected) addTo(c.expected, l.item, sign * l.count); }
        }
        break;
      }
      case 'store.check': {
        const c = chests.get(event.chest);
        if (!c) { reject(event, 'Lagerkiste unbekannt oder entfernt.'); break; }
        c.checkedAt = event.at;
        if (event.status === 'abweichend') for (const l of event.diff ?? []) addTo(c.deviation, l.item, l.delta);
        // A deviation stays until a seal; a later clean check does not hide it.
        c.status = event.status === 'geprueft' && c.deviation.size ? 'abweichend' : event.status;
        break;
      }
      case 'store.seal': {
        const c = chests.get(event.chest);
        if (!c) { reject(event, 'Lagerkiste unbekannt oder entfernt.'); break; }
        c.deviation.clear(); c.status = 'geprueft'; c.sealedBy = event.by; c.sealedAt = event.at;
        if (c.counted) c.expected = new Map(c.items);
        break;
      }
    }
  }

  // Baunachweis: a member who switched it off is left out completely (also earlier numbers).
  const placedBy = new Map<string, number>(), brokenBy = new Map<string, number>();
  const sectionTally = new Map<string, { placed: number; broken: number; builders: Map<string, number> }>();
  const placedBlocks: Record<string, number> = {};
  let tallyFrom: string | null = null, tallyUntil: string | null = null;
  for (const t of tallies) {
    if (tallyOff.has(t.by)) continue;
    placedBy.set(t.by, (placedBy.get(t.by) ?? 0) + t.placed); brokenBy.set(t.by, (brokenBy.get(t.by) ?? 0) + t.broken);
    let st = sectionTally.get(t.section); if (!st) sectionTally.set(t.section, st = { placed: 0, broken: 0, builders: new Map() });
    st.placed += t.placed; st.broken += t.broken;
    if (t.placed) st.builders.set(t.by, (st.builders.get(t.by) ?? 0) + t.placed);
    for (const l of t.blocks ?? []) placedBlocks[l.item] = (placedBlocks[l.item] ?? 0) + l.count;
    if (!tallyFrom || t.from < tallyFrom) tallyFrom = t.from;
    if (!tallyUntil || t.until > tallyUntil) tallyUntil = t.until;
  }
  const stock: Record<string, number> = {};
  const stores: StoreChest[] = [...chests.entries()].map(([id, c]) => {
    for (const [item, n] of c.items) stock[item] = (stock[item] ?? 0) + n;
    const rec = (m: Map<string, Map<string, number>>, hopper: boolean) => Object.fromEntries([...m].filter(([w, x]) => (w === 'trichter') === hopper && x.size).map(([w, x]) => [w, Object.fromEntries(x)]));
    return { id, name: c.name, pos: c.pos, dimension: c.dimension, items: Object.fromEntries(c.items), ...(c.countedAt && { countedAt: c.countedAt }), ...(c.countedBy && { countedBy: c.countedBy }), partial: c.partial,
      ...(c.section && { section: c.section }), purpose: c.purpose, ...(c.protection && { protection: c.protection }), ...(c.pos2 && { pos2: c.pos2 }),
      status: c.status, ...(c.checkedAt && { checkedAt: c.checkedAt }), deviation: Object.fromEntries(c.deviation),
      ...(c.sealedBy && { sealedBy: c.sealedBy, sealedAt: c.sealedAt }),
      movedIn: rec(c.movedIn, false), movedOut: rec(c.movedOut, false),
      hopperIn: Object.fromEntries(c.movedIn.get('trichter') ?? []), hopperOut: Object.fromEntries(c.movedOut.get('trichter') ?? []) };
  }).sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const ownerOf = new Map<string, string[]>();
  for (const [id, s] of sections) if (s.owner) { let l = ownerOf.get(s.owner); if (!l) ownerOf.set(s.owner, l = []); l.push(id); }
  const order = new Map(ctx.sections.map((s, i) => [s.id, i]));
  const byOrder = (a: string, b: string) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9) || (a < b ? -1 : 1);
  const counts = (id: string, st: SectionTeamStatus[]) => [...sections.values()].filter(s => (s.doneBy === id || s.owner === id) && st.includes(s.status)).length;
  const members: TeamMember[] = [...known].map(id => ({
    id, name: nameOf(id), role: roleOf(id), ...(players.has(id) && { player: players.get(id)! }), inProgram: inProgram.has(id),
    sections: (ownerOf.get(id) ?? []).sort(byOrder), blocks: blocks.get(id) ?? 0, items: Object.fromEntries(items.get(id) ?? []),
    reportedSections: counts(id, ['gemeldet', 'bestaetigt']), confirmedSections: counts(id, ['bestaetigt']), ...(lastActive.has(id) && { lastActive: lastActive.get(id)! }),
    placed: placedBy.get(id) ?? 0, broken: brokenBy.get(id) ?? 0, stored: Object.fromEntries(stored.get(id) ?? []), taken: Object.fromEntries(taken.get(id) ?? []), tally: !tallyOff.has(id),
  })).sort((a, b) => RANK[b.role] - RANK[a.role] || a.name.localeCompare(b.name, 'de'));

  const allSectionIds = [...new Set([...ctx.sections.map(s => s.id), ...sections.keys()])].sort(byOrder);
  const sectionStates: SectionTeamState[] = allSectionIds.map(id => {
    const s = sections.get(id) ?? { status: 'frei' as const, owner: null, history: [] };
    return { sectionId: id, status: s.status, owner: s.owner, ...(s.doneBy && { doneBy: s.doneBy }), ...(s.verifiedBy && { verifiedBy: s.verifiedBy }),
      ...(s.note && { note: s.note }), orphan: !sectionIds.has(id), history: s.history,
      placed: sectionTally.get(id)?.placed ?? 0, broken: sectionTally.get(id)?.broken ?? 0, builders: Object.fromEntries(sectionTally.get(id)?.builders ?? []) };
  });
  const memberByName = new Map<string, string>();
  for (const m of members) { memberByName.set(m.name.toLowerCase().replace(/\s+/g, ''), m.id); if (m.player) memberByName.set(m.player.toLowerCase(), m.id); }
  const noteList: TeamNote[] = [...notes.entries()].map(([id, n]) => ({
    id, ...n, mentions: [...new Set([...n.text.matchAll(mentionRe)].map(m => memberByName.get(m[1]!.toLowerCase())).filter((x): x is string => !!x))],
  })).sort((a, b) => (a.resolved ? 1 : 0) - (b.resolved ? 1 : 0) || compareEvents({ at: b.at, id: b.id }, { at: a.at, id: a.id }));
  const release = releases.at(-1) ?? null;
  if (releases.length > 1) {
    const last = releases.at(-1)!, previous = releases.at(-2)!;
    if (last.by !== previous.by && last.revisionNumber < previous.revisionNumber)
      conflicts.push({ event: team.events.find(e => e.kind === 'plan.release' && (e as KnownTeamEvent & { revisionId: string }).revisionId === last.revisionId)!,
        text: `Planstände auseinander: ${nameOf(last.by)} hat Planstand ${last.revisionNumber} nach Planstand ${previous.revisionNumber} von ${nameOf(previous.by)} freigegeben.` });
  }
  return { members, sections: sectionStates, notes: noteList, gather: [...gather.values()].sort((a, b) => a.item.localeCompare(b.item) || a.member.localeCompare(b.member)),
    delivered, release, releases, rejected, conflicts, unknownKinds, stores, stock, placedBlocks,
    tallySpan: tallyFrom && tallyUntil ? { from: tallyFrom, until: tallyUntil } : null };
}

const sectionName = (ctx: TeamContext, id: string) => ctx.sections.find(s => s.id === id)?.name ?? 'entfernter Abschnitt';

export function eventLabel(e: TeamEvent): string {
  if (!isKnownEvent(e)) return `unbekannte Art ${e.kind}`;
  switch (e.kind) {
    case 'member.join': return `beigetreten: ${e.name}`;
    case 'member.role': return `Rolle ${TEAM_ROLE_LABEL[e.role]}`;
    case 'member.player': return `Spielername ${e.player}`;
    case 'section.claim': return 'Abschnitt übernommen';
    case 'section.assign': return 'Abschnitt zugewiesen';
    case 'section.release': return 'Abschnitt abgegeben';
    case 'section.done': return 'fertig gemeldet';
    case 'section.verify': return e.ok ? 'bestätigt' : 'Nacharbeit verlangt';
    case 'contribution': return 'Beitrag';
    case 'gather.claim': return e.count ? `sammelt ${e.count} ${e.item}` : `Sammelauftrag ${e.item} zurückgegeben`;
    case 'note.add': return `Notiz (${NOTE_TAG_LABEL[e.tag]})`;
    case 'note.resolve': return 'Notiz erledigt';
    case 'plan.release': return `Planstand ${e.revisionNumber} freigegeben`;
    case 'build.tally': return `Baunachweis: ${e.placed} gesetzt, ${e.broken} abgebaut`;
    case 'member.tally': return e.on ? 'Baunachweis an' : 'Baunachweis aus';
    case 'store.chest': return e.remove ? `Lagerkiste „${e.name}“ entfernt` : `Lagerkiste „${e.name}“`;
    case 'store.count': return `Lager gezählt (${e.items.length} Sorten)`;
    case 'store.config': return 'Lager eingestellt';
    case 'store.move': return e.via === 'trichter' ? 'Trichter bewegt Items' : 'Lagerbuchung';
    case 'store.check': return e.status === 'geprueft' ? 'Lager geprüft' : e.status === 'fehlt' ? 'Lagerkiste fehlt' : 'Lager weicht ab';
    case 'store.seal': return 'Lager gesiegelt';
  }
}

/** Human readable line for an event, with names. */
export function describeEvent(e: TeamEvent, ctx: TeamContext, names: ReadonlyMap<string, string> = new Map(ctx.builders.map(b => [b.id, b.name]))): string {
  const who = names.get(e.by) ?? e.by;
  if (!isKnownEvent(e)) return `${who}: ${eventLabel(e)}`;
  const s = 'section' in e && typeof e.section === 'string' ? ` „${sectionName(ctx, e.section)}“` : '';
  switch (e.kind) {
    case 'section.assign': return `${who}: Abschnitt${s} an ${names.get(e.member) ?? e.member} zugewiesen`;
    case 'member.role': return `${who}: ${names.get(e.member) ?? e.member} ist jetzt ${TEAM_ROLE_LABEL[e.role]}`;
    case 'contribution': {
      const parts = [e.blocks ? `${e.blocks} Blöcke gebaut` : '', ...(e.items ?? []).map(l => `${l.count} × ${l.item.replace(/^minecraft:/, '')}`)].filter(Boolean);
      return `${who}:${s} ${parts.join(', ') || 'Beitrag'}${e.note ? ` – ${e.note}` : ''}`;
    }
    case 'note.add': return `${who}: ${NOTE_TAG_LABEL[e.tag]}${s} – ${e.text}`;
    default: return `${who}: ${eventLabel(e)}${s}${'note' in e && e.note ? ` – ${e.note}` : ''}`;
  }
}

/** Checks whether `by` may write this event now (same rules as the fold). */
export function authorize(team: TeamState, ctx: TeamContext, by: string, body: TeamEventBody): { ok: true } | { ok: false; reason: string } {
  const probe = teamEvent(by, body, laterThan(team));
  const view = teamView({ ...team, events: [...team.events, probe] }, ctx);
  const r = view.rejected.find(x => x.event.id === probe.id);
  if (r) return { ok: false, reason: r.reason };
  const c = view.conflicts.find(x => x.event.id === probe.id);
  if (c && body.kind === 'section.claim') return { ok: false, reason: c.text };
  return { ok: true };
}

/** Time for a new event: now, but never before the last event (device clocks may lag). */
export function laterThan(team: TeamState, now: string = new Date().toISOString()): string {
  const last = team.events.at(-1)?.at;
  if (!last || now > last) return now;
  return new Date(Date.parse(last) + 1).toISOString();
}

// ---------------------------------------------------------------- PROJ-01 assignments

/**
 * Owners from the team log for the schedule (site.program.assignments). Only
 * sections the team log touched are returned; others keep their planned
 * assignment.
 */
export function teamAssignments(view: TeamView): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const s of view.sections) if (!s.orphan && (s.owner || s.history.length)) out[s.sectionId] = s.owner ? [s.owner] : [];
  return out;
}

// ---------------------------------------------------------------- report code (Meldecode)

export const REPORT_CODE_PREFIX = 'BPT1';
export const MAX_REPORT_CODE = 16_384;

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
const b64url = (bytes: Uint8Array) => {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (t: string) => {
  const s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4));
  return Uint8Array.from(s, c => c.charCodeAt(0));
};
const teamTag = (teamId: string) => teamId.replace(/^team_/, '').slice(0, 8);

/** A one-line code with the given events for chat messages: `BPT1:<team>:<data>:<check>`. */
export async function encodeReportCode(team: TeamState, events: readonly TeamEvent[]): Promise<string> {
  const json = canonicalJson({ t: team.teamId, e: events });
  const data = b64url(await gzip(new TextEncoder().encode(json)));
  const check = (await sha256Hex(data)).slice(0, 8);
  const code = `${REPORT_CODE_PREFIX}:${teamTag(team.teamId)}:${data}:${check}`;
  if (code.length > MAX_REPORT_CODE) throw new DomainError('TOO_LONG', `Zu viele Ereignisse für einen Meldecode (${code.length} Zeichen). Bitte ein Teampaket schicken.`);
  return code;
}

export async function decodeReportCode(code: string): Promise<{ teamId: string; events: TeamEvent[] }> {
  const clean = code.trim().replace(/\s+/g, '');
  const m = /^BPT1:([A-Za-z0-9]{1,8}):([A-Za-z0-9_-]+):([a-f0-9]{8})$/.exec(clean);
  if (!m) throw new DomainError('CODE', 'Das ist kein Meldecode (er beginnt mit „BPT1:“ und hat vier Teile).');
  if ((await sha256Hex(m[2]!)).slice(0, 8) !== m[3]) throw new DomainError('CODE', 'Der Meldecode ist unvollständig oder verändert (Prüfsumme passt nicht). Bitte ganz kopieren.');
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(await gunzip(fromB64url(m[2]!)))); }
  catch { throw new DomainError('CODE', 'Der Meldecode lässt sich nicht entpacken.'); }
  if (!isObj(parsed) || typeof parsed.t !== 'string' || !Array.isArray(parsed.e)) throw new DomainError('CODE', 'Der Meldecode hat keinen gültigen Inhalt.');
  if (teamTag(parsed.t) !== m[1]) throw new DomainError('CODE', 'Der Meldecode ist beschädigt (Teamkennung passt nicht).');
  return { teamId: parsed.t, events: (parsed.e as unknown[]).map(checkTeamEvent).sort(compareEvents) };
}

// ---------------------------------------------------------------- team package

export const TEAM_PACKAGE_FORMAT = 'minecraft-bauplaner-team';
export const TEAM_PACKAGE_VERSION = 1;

export interface TeamPackage {
  readonly format: typeof TEAM_PACKAGE_FORMAT;
  readonly formatVersion: 1;
  readonly createdAt: string;
  /** Team without `self`. */
  readonly team: Omit<TeamState, 'self'>;
  /** Who exported it. */
  readonly from: { readonly member: string; readonly name: string };
  /** Serialized project backup (backup.ts), present when the plan travels along. */
  readonly backup?: string;
  /** A helper's own changed copy for the Bauleitung to compare (§10). */
  readonly proposal?: boolean;
  /** SHA-256 over the canonical JSON of team and backup. */
  readonly contentSha256: string;
}

const packageHash = (team: unknown, backup: string | undefined) => sha256Hex(canonicalJson({ team, ...(backup !== undefined && { backup }) }));

export async function buildTeamPackage(team: TeamState, from: { member: string; name: string }, backup?: string, proposal = false): Promise<TeamPackage> {
  const { self: _self, ...shared } = team;
  return { format: TEAM_PACKAGE_FORMAT, formatVersion: 1, createdAt: new Date().toISOString(), team: shared, from, ...(backup !== undefined && { backup }),
    ...(proposal && { proposal: true }), contentSha256: await packageHash(shared, backup) };
}

export const teamPackageFileName = (team: Pick<TeamState, 'name'>, date = new Date()) =>
  `${team.name.replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'team'}-${date.toISOString().slice(0, 10)}.bauteam.json`;

export async function readTeamPackage(textValue: string): Promise<TeamPackage> {
  let raw: unknown;
  try { raw = JSON.parse(textValue); } catch { throw new DomainError('TEAM_PACKAGE', 'Die Datei ist kein gültiges JSON (abgeschnitten?).'); }
  if (!isObj(raw) || raw.format !== TEAM_PACKAGE_FORMAT) throw new DomainError('TEAM_PACKAGE', 'Das ist kein Teampaket des Bauplaners.');
  if (typeof raw.formatVersion !== 'number' || raw.formatVersion > TEAM_PACKAGE_VERSION) throw new DomainError('TEAM_PACKAGE', 'Das Teampaket stammt aus einer neueren Planer-Version. Bitte die Seite neu laden.');
  if (raw.formatVersion !== 1) throw new DomainError('TEAM_PACKAGE', 'Unbekannte Teampaket-Version.');
  const team = checkTeam({ ...(isObj(raw.team) ? raw.team : {}) });
  if (!isObj(raw.from)) throw new DomainError('TEAM_PACKAGE', 'Absender fehlt.');
  if (raw.backup !== undefined && typeof raw.backup !== 'string') throw new DomainError('TEAM_PACKAGE', 'Projektteil ungültig.');
  if (await packageHash(raw.team, raw.backup as string | undefined) !== raw.contentSha256) throw new DomainError('TEAM_PACKAGE', 'Das Teampaket ist beschädigt oder verändert (Prüfsumme passt nicht).');
  return { ...(raw as unknown as TeamPackage), team };
}

// ---------------------------------------------------------------- status text

export function teamStatusText(input: { projectName: string; team: TeamState; view: TeamView; ctx: TeamContext; progressBySection?: ReadonlyMap<string, number>; date?: Date }): string {
  const { view, ctx } = input, names = new Map(view.members.map(m => [m.id, m.player ? `${m.name} (${m.player})` : m.name]));
  const d = input.date ?? new Date();
  const lines = [`**${input.projectName}** · Stand ${d.toLocaleDateString('de-DE')}${input.team.server ? ` · Server ${input.team.server}` : ''}`];
  if (view.release) lines.push(`Planstand ${view.release.revisionNumber} gilt${view.release.summary ? ` (${view.release.summary})` : ''}.`);
  lines.push('', 'Abschnitte:');
  ctx.sections.forEach((s, i) => {
    const st = view.sections.find(x => x.sectionId === s.id);
    const p = input.progressBySection?.get(s.id);
    lines.push(`${i + 1}. ${s.name} – ${SECTION_TEAM_STATUS_LABEL[st?.status ?? 'frei']}${st?.owner ? ` · ${names.get(st.owner) ?? st.owner}` : ''}${p !== undefined ? ` · ${Math.round(p * 100)} %` : ''}`);
  });
  const free = view.sections.filter(s => !s.orphan && s.status === 'frei').length;
  if (free) lines.push(`→ ${free} Abschnitt${free === 1 ? '' : 'e'} frei – wer will?`);
  if (view.gather.length) { lines.push('', 'Sammelaufträge:'); for (const g of view.gather) lines.push(`- ${names.get(g.member) ?? g.member}: ${g.count} × ${g.item.replace(/^minecraft:/, '')}`); }
  const open = view.notes.filter(n => !n.resolved);
  if (open.length) { lines.push('', 'Offene Notizen:'); for (const n of open.slice(0, 10)) lines.push(`- ${NOTE_TAG_LABEL[n.tag]}: ${n.text} (${names.get(n.by) ?? n.by})`); }
  return lines.join('\n');
}

// ---------------------------------------------------------------- server file (COOP-02)

export const TEAM_SERVER_FORMAT = 'minecraft-bauplaner-team-server';

export interface TeamServerFile {
  readonly format: typeof TEAM_SERVER_FORMAT;
  readonly formatVersion: 1;
  readonly teamId: string;
  readonly name: string;
  readonly projectName: string;
  readonly founder: string;
  readonly createdAt: string;
  /** Dimension of the world placement (Weltkarte). */
  readonly dimension: string;
  /** Sections in build order with world boxes (inclusive min/max), one per section and instance. */
  readonly sections: readonly { readonly id: string; readonly name: string; readonly boxes: readonly (readonly [number, number, number, number, number, number])[] }[];
  /** Members with role at export time (the server folds the log itself; roles here are for reading). */
  readonly members: readonly { readonly id: string; readonly name: string; readonly player?: string; readonly role: TeamRole }[];
  readonly events: readonly TeamEvent[];
  readonly exportedAt?: string;
}

interface StepBox { readonly instanceId: string; readonly layer: number; readonly bounds: { readonly min: readonly number[]; readonly maxExclusive: readonly number[] } }

/**
 * The file the Paper plugin reads (plugins/BauplanerBridge/team/*.team.json). Section boxes come from
 * the guide steps of each section (first-match rule of site.ts) moved by the world origin, so the
 * server knows where a section is without the plan geometry.
 */
export function teamServerFile(input: {
  team: TeamState; view: TeamView; projectName: string;
  sections: readonly { readonly id: string; readonly name: string; readonly members: readonly { readonly instanceId: string; readonly fromLayer?: number; readonly toLayer?: number }[] }[];
  steps: readonly StepBox[]; origin: readonly [number, number, number]; dimension: string;
}): TeamServerFile {
  const { team, view, origin } = input;
  const boxes = new Map<string, Map<string, [number, number, number, number, number, number]>>();
  for (const step of input.steps) {
    const section = input.sections.find(s => s.members.some(m => m.instanceId === step.instanceId && step.layer >= (m.fromLayer ?? 0) && step.layer <= (m.toLayer ?? Infinity)));
    if (!section) continue;
    let byInstance = boxes.get(section.id); if (!byInstance) boxes.set(section.id, byInstance = new Map());
    const [x0, y0, z0] = step.bounds.min as [number, number, number], [x1, y1, z1] = step.bounds.maxExclusive.map(v => v - 1) as [number, number, number];
    const b = byInstance.get(step.instanceId);
    if (!b) byInstance.set(step.instanceId, [x0, y0, z0, x1, y1, z1]);
    else { b[0] = Math.min(b[0], x0); b[1] = Math.min(b[1], y0); b[2] = Math.min(b[2], z0); b[3] = Math.max(b[3], x1); b[4] = Math.max(b[4], y1); b[5] = Math.max(b[5], z1); }
  }
  const move = (b: readonly number[]) => [b[0]! + origin[0], b[1]! + origin[1], b[2]! + origin[2], b[3]! + origin[0], b[4]! + origin[1], b[5]! + origin[2]] as const;
  return {
    format: TEAM_SERVER_FORMAT, formatVersion: 1, teamId: team.teamId, name: team.name, projectName: input.projectName, founder: team.founder,
    createdAt: new Date().toISOString(), dimension: input.dimension,
    sections: input.sections.map(s => ({ id: s.id, name: s.name, boxes: [...(boxes.get(s.id)?.values() ?? [])].map(move) })),
    members: view.members.map(m => ({ id: m.id, name: m.name, ...(m.player && { player: m.player }), role: m.role })),
    events: team.events,
  };
}

export const teamServerFileName = (team: Pick<TeamState, 'name' | 'teamId'>) =>
  `${team.name.replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'team'}-${team.teamId.replace(/^team_/, '').slice(0, 8)}.team.json`;

/** Reads a server file or a server export (events only matter for the planner). */
export function readTeamServerFile(textValue: string): { teamId: string; name: string; events: TeamEvent[]; exportedAt?: string } {
  let raw: unknown;
  try { raw = JSON.parse(textValue); } catch { throw new DomainError('TEAM_PACKAGE', 'Die Datei ist kein gültiges JSON (abgeschnitten?).'); }
  if (!isObj(raw) || raw.format !== TEAM_SERVER_FORMAT) throw new DomainError('TEAM_PACKAGE', 'Das ist keine Server-Teamdatei.');
  if (raw.formatVersion !== 1) throw new DomainError('TEAM_PACKAGE', 'Unbekannte Version der Server-Teamdatei.');
  const teamId = text(raw.teamId, 64, 'Team-ID'), name = text(raw.name, 120, 'Teamname');
  if (!Array.isArray(raw.events) || raw.events.length > MAX_TEAM_EVENTS) throw new DomainError('TEAM_PACKAGE', 'Ereignisliste ungültig.');
  const ids = new Set<string>();
  const events = (raw.events as unknown[]).map(checkTeamEvent).filter(e => !ids.has(e.id) && (ids.add(e.id), true)).sort(compareEvents);
  return { teamId, name, events, ...(typeof raw.exportedAt === 'string' && { exportedAt: raw.exportedAt }) };
}

// ---------------------------------------------------------------- project integration

/** Plan builders (PROJ-01 `site.program.builders`), empty without a program. */
export function programBuilders(site: unknown): { id: string; name: string }[] {
  const program = isObj(site) && isObj(site.program) ? site.program : null;
  return program && Array.isArray(program.builders) ? (program.builders as unknown[]).filter(isObj).map(b => ({ id: String(b.id), name: String(b.name) })) : [];
}

/** Context of the fold for a site plan: its sections and builders. */
export function teamContextOf(site: { readonly sections: readonly { readonly id: string; readonly name: string }[] }): TeamContext {
  return { sections: site.sections.map(s => ({ id: s.id, name: s.name })), builders: programBuilders(site) };
}

/**
 * Takes over a released plan from the Bauleitung: geometry, sections, program and placement come from
 * the incoming project; this project keeps its id, storage revision and the merged team log with its
 * own "Ich bin"; ticks of both are kept (a step ticked anywhere stays ticked).
 */
export function takeOverPlan<P extends { readonly id: string; readonly revision: number; readonly createdAt: string; readonly progress: Readonly<Record<string, unknown>>; readonly site?: { readonly team?: TeamState } }>(
  local: P, incoming: P, team: TeamState): P {
  const self = local.site?.team?.self;
  const site = incoming.site ? { ...incoming.site, team: { ...team, ...(self !== undefined ? { self } : {}) } } : undefined;
  if (site && self === undefined) delete (site.team as { self?: string }).self;
  return { ...incoming, id: local.id, revision: local.revision, createdAt: local.createdAt,
    progress: { ...incoming.progress, ...local.progress }, ...(site && { site }) };
}

/** Members a merge would add to the plan's builder list (joined through the team log only). */
export function joinedOnly(view: TeamView): TeamMember[] { return view.members.filter(m => !m.inProgram); }
