import { canonicalJson, newId, sha256Hex } from '../core/hash.js';
import { DomainError } from '../core/types.js';

/**
 * Teambau (COOP-01, docs/architecture/team/TEAMBAU.md). Several players build one
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
  | { readonly kind: 'section.claim'; readonly section: string; readonly note?: string; readonly base?: number }
  | { readonly kind: 'section.assign'; readonly section: string; readonly member: string; readonly base?: number }
  | { readonly kind: 'section.release'; readonly section: string; readonly base?: number }
  | { readonly kind: 'section.done'; readonly section: string; readonly note?: string }
  | { readonly kind: 'section.verify'; readonly section: string; readonly ok: boolean; readonly note?: string }
  | { readonly kind: 'contribution'; readonly section?: string; readonly blocks?: number; readonly items?: readonly ItemCount[]; readonly note?: string }
  | { readonly kind: 'gather.claim'; readonly item: string; readonly count: number; readonly base?: number }
  | { readonly kind: 'note.add'; readonly noteId: string; readonly text: string; readonly tag: NoteTag; readonly section?: string; readonly pos?: readonly [number, number, number] }
  | { readonly kind: 'note.resolve'; readonly noteId: string; readonly text?: string }
  | { readonly kind: 'plan.release'; readonly revisionId: string; readonly revisionNumber: number; readonly summary: string }
  /** Baunachweis (COOP-04): blocks a player placed/broke inside one section box, counted by the server plugin between from and until. */
  | { readonly kind: 'build.tally'; readonly section: string; readonly placed: number; readonly broken: number; readonly blocks?: readonly ItemCount[]; readonly from: string; readonly until: string }
  /** Switches one's own Baunachweis on or off; off also hides earlier numbers. */
  | { readonly kind: 'member.tally'; readonly member: string; readonly on: boolean }
  /** Registers (or with remove removes) a storage chest of the team (COOP-04). */
  | { readonly kind: 'store.chest'; readonly chest: string; readonly name: string; readonly pos: readonly [number, number, number]; readonly dimension: string; readonly remove?: boolean }
  /** COOP-10 (client first): build state of a section as the player's mod counts it in range – unverified, by the member. */
  | { readonly kind: 'section.seen'; readonly section: string; readonly placed: number; readonly total: number; readonly wrong?: number; readonly missing?: readonly ItemCount[] }
  /** COOP-10: content of a known team chest as the player's mod saw it when opening/closing – unverified (store.count is the server's). */
  | { readonly kind: 'store.seen'; readonly chest: string; readonly items: readonly ItemCount[]; readonly more?: boolean }
  /** Full content of a storage chest, read by the server plugin when someone closed it; `more` when lines were cut. */
  | { readonly kind: 'store.count'; readonly chest: string; readonly items: readonly ItemCount[]; readonly more?: boolean }
  /** Checked storage chests (COOP-05, docs/architecture/team/LAGERKISTEN.md): section ('' = whole project), purpose, protection, second half of a double chest (null = none). */
  | { readonly kind: 'store.config'; readonly chest: string; readonly section?: string; readonly purpose?: StorePurpose; readonly protection?: StoreProtection; readonly pos2?: readonly [number, number, number] | null; readonly name?: string; readonly farm?: string }
  /** What one player (or a hopper) put in / took out, net per opening; moves the expected content, never booked again as stored/taken. */
  | { readonly kind: 'store.move'; readonly chest: string; readonly in?: readonly ItemCount[]; readonly out?: readonly ItemCount[]; readonly via: 'spieler' | 'trichter' | 'abbau'; readonly player?: string }
  /** Server comparison of a count with the expected content; differences add up until a seal. */
  | { readonly kind: 'store.check'; readonly chest: string; readonly status: 'geprueft' | 'abweichend' | 'fehlt'; readonly sha256?: string; readonly diff?: readonly { readonly item: string; readonly delta: number }[] }
  /** Baumeister+ accepts the current content: open differences are closed. */
  | { readonly kind: 'store.seal'; readonly chest: string; readonly sha256: string; readonly note?: string }
  // COOP-06 (TEAMBAU §4, §18): handover with acceptance, absence, acknowledged hints
  | { readonly kind: 'section.handover'; readonly section: string; readonly member: string; readonly note?: string; readonly base?: number }
  | { readonly kind: 'section.accept'; readonly section: string; readonly base?: number }
  | { readonly kind: 'section.decline'; readonly section: string }
  | { readonly kind: 'member.away'; readonly member: string; readonly until?: string; readonly note?: string }
  | { readonly kind: 'issue.ack'; readonly events: readonly string[] }
  /** COOP-08 (LAGERKISTEN §13): what hoppers and players put into a yield store (purpose ertrag) between from and until, minutes = time the store's chunk was loaded. Server only. */
  | { readonly kind: 'store.yield'; readonly chest: string; readonly farm?: string; readonly items: readonly ItemCount[]; readonly from: string; readonly until: string; readonly minutes: number }
  /** COOP-11 „Verlauf verdichten“: one part of a digest of all measurements up to `cutoff` (Bauleitung). Sorts right after the cutoff event. */
  | ({ readonly kind: 'team.digest' } & DigestBody)
  // TEAM-03 (TEAMBAU §20): several players per section and per gather order; versioned assignments and bookings.
  // `base` = version of the section / gather order / booking the author saw; a change on an older version
  // that someone else has changed since is not applied (überholt) – nothing is overwritten silently.
  /** Baumeister+: sets who builds along (Mitbauer) besides the responsible owner; without an owner the first one becomes it. */
  | { readonly kind: 'section.crew'; readonly section: string; readonly members: readonly string[]; readonly base?: number; readonly note?: string }
  /** Helfer+: builds along in a taken section (a free one is taken over). */
  | { readonly kind: 'section.join'; readonly section: string; readonly base?: number }
  /** Leaves a section (oneself; others: Baumeister+). The owner leaving hands the lead to the first Mitbauer. */
  | { readonly kind: 'section.leave'; readonly section: string; readonly member?: string; readonly base?: number }
  /** Baumeister+: splits one gather order (item) over several players; replaces all shares of that item. */
  | { readonly kind: 'gather.assign'; readonly item: string; readonly shares: readonly { readonly member: string; readonly count: number }[]; readonly base?: number; readonly note?: string }
  /** Corrects (or with nothing left cancels) a booked contribution; author of the booking or Baumeister+. New version, the old one stays in the history. */
  | { readonly kind: 'contribution.fix'; readonly ref: string; readonly blocks?: number; readonly items?: readonly ItemCount[]; readonly note?: string; readonly base?: number }
  /** GAME-06 (SIGNED_EVENTS.md): section protection on the server (Bauleitung); free = who may build in free sections. */
  | { readonly kind: 'team.protect'; readonly mode: ProtectMode; readonly free?: ProtectFree }
  /** GAME-06: the Bauleitung vouches for every room event up to this arrival number (written before signatures existed). */
  | { readonly kind: 'team.trust'; readonly upTo: string };
/** Most players per section (owner + Mitbauer) and per split gather order. */
export const MAX_CREW = 8;

export type ProtectMode = 'aus' | 'hinweis' | 'sperren';
export type ProtectFree = 'alle' | 'team';
export const PROTECT_MODES: readonly ProtectMode[] = ['aus', 'hinweis', 'sperren'];
export const PROTECT_MODE_LABEL: Readonly<Record<ProtectMode, string>> = { aus: 'aus', hinweis: 'nur Hinweis im Chat', sperren: 'Bauen verhindern' };

/** An item and a signed amount (expected stock and open differences of a store can be negative). */
export interface ItemDelta { readonly item: string; readonly delta: number }
/** Baunachweis of one member in one section up to the cutoff (sum of build.tally). Blocks may be split over several rows. */
export interface DigestTally { readonly member: string; readonly section: string; readonly placed: number; readonly broken: number; readonly blocks?: readonly ItemCount[]; readonly from: string; readonly until: string }
/** Contributions and store bookings of one member up to the cutoff (sums, added up over rows). */
export interface DigestMember { readonly member: string; readonly blocks?: number; readonly items?: readonly ItemCount[]; readonly stored?: readonly ItemCount[]; readonly taken?: readonly ItemCount[]; readonly last?: string }
/**
 * State of one store chest at the cutoff. The row with `head` sets status, check and seal and resets the
 * expected stock; every row adds its amounts (a chest with many items is split over rows).
 * The newest count itself stays in the log as a store.count event.
 */
export interface DigestChest {
  readonly chest: string;
  readonly head?: { readonly status: StoreStatus; readonly expected: boolean; readonly checkedAt?: string; readonly sealedBy?: string; readonly sealedAt?: string };
  readonly expected?: readonly ItemDelta[];
  readonly deviation?: readonly ItemDelta[];
  /** Booked moves; who = member id or 'trichter'. */
  readonly moves?: readonly { readonly who: string; readonly in?: readonly ItemCount[]; readonly out?: readonly ItemCount[] }[];
  readonly yieldIn?: readonly ItemCount[];
  readonly yieldMinutes?: number;
  /** Hopper intake as running time (PROD-05 estimate from the booking times), so the Produktion keeps its rate. */
  readonly hopper?: { readonly seconds: number; readonly bookings: number; readonly from: string; readonly until: string };
}
/** Measured yield of one store (and farm) up to the cutoff, summed over `periods` store.yield reports. */
export interface DigestYield { readonly chest: string; readonly farm?: string; readonly items: readonly ItemCount[]; readonly minutes: number; readonly from: string; readonly until: string; readonly periods: number }
export interface DigestBody {
  /** Id of the last event the digest covers; the digest's `at` is that event's time. */
  readonly cutoff: string;
  /** Random tag of one compaction run; parts of one run share it. */
  readonly run: string;
  readonly part: number;
  readonly parts: number;
  /** When the Bauleitung compacted (display only). */
  readonly made: string;
  /** Events the run took out of the log (display only). */
  readonly covered: number;
  readonly tallies?: readonly DigestTally[];
  readonly members?: readonly DigestMember[];
  readonly chests?: readonly DigestChest[];
  readonly yields?: readonly DigestYield[];
  /** Notes that were closed before the cutoff: their note.add and note.resolve are gone. */
  readonly notes?: readonly string[];
}
export type StorePurpose = 'vorrat' | 'eingang' | 'ausgabe' | 'rest' | 'ertrag';
export type StoreProtection = 'offen' | 'team' | 'abschnitt' | 'eingang' | 'gesperrt';
export const STORE_PURPOSES: readonly StorePurpose[] = ['vorrat', 'eingang', 'ausgabe', 'rest', 'ertrag'];
export const STORE_PROTECTIONS: readonly StoreProtection[] = ['offen', 'team', 'abschnitt', 'eingang', 'gesperrt'];
export type StoreStatus = 'ungeprueft' | 'geprueft' | 'abweichend' | 'fehlt';
export type KnownTeamEvent = Base & TeamEventBody;
/** Events of a newer planner version: kept and passed on, but without effect. */
export type UnknownTeamEvent = Base & { readonly kind: string; readonly [key: string]: unknown };
export type TeamEvent = KnownTeamEvent | UnknownTeamEvent;
export type TeamEventKind = TeamEventBody['kind'];
const KNOWN = new Set<string>(['member.join', 'member.role', 'member.player', 'section.claim', 'section.assign', 'section.release', 'section.done',
  'section.verify', 'contribution', 'gather.claim', 'note.add', 'note.resolve', 'plan.release', 'build.tally', 'member.tally', 'store.chest', 'store.count',
  'store.config', 'store.move', 'store.check', 'store.seal',
  'section.handover', 'section.accept', 'section.decline', 'member.away', 'issue.ack', 'store.yield', 'section.seen', 'store.seen', 'team.digest',
  'section.crew', 'section.join', 'section.leave', 'gather.assign', 'contribution.fix', 'team.protect', 'team.trust']);
/** Kinds only the server plugin may write (origin server): they are measurements, not claims. */
export const SERVER_ONLY_KINDS: ReadonlySet<string> = new Set(['build.tally', 'store.count', 'store.move', 'store.check', 'store.yield']);
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
  if (raw.base !== undefined) int(raw.base, 0, 1_000_000, `${where}: Version`);
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
      if (raw.farm !== undefined) text(raw.farm, 64, `${where}: Farm`, 0);
      break;
    }
    case 'section.seen':
      text(raw.section, 64, `${where}: Abschnitt`); int(raw.total, 0, 50_000_000, `${where}: Blöcke im Plan`); int(raw.placed, 0, 50_000_000, `${where}: richtig gesetzt`);
      if ((raw.placed as number) > (raw.total as number)) fail(`${where}: mehr gesetzt als geplant`);
      if (raw.wrong !== undefined) int(raw.wrong, 0, 50_000_000, `${where}: falsch`);
      if (raw.missing !== undefined) itemLines(raw.missing, 24, `${where}: fehlt`);
      break;
    case 'store.seen':
      text(raw.chest, 64, `${where}: Kiste`); itemLines(raw.items, 64, `${where}: Inhalt`, true);
      if (raw.more !== undefined && raw.more !== true) fail(`${where}: more ist nur true`);
      break;
    case 'store.yield':
      text(raw.chest, 64, `${where}: Kiste`); if (raw.farm !== undefined) text(raw.farm, 64, `${where}: Farm`);
      itemLines(raw.items, 64, `${where}: Ertrag`, true); iso(raw.from, `${where}: von`); iso(raw.until, `${where}: bis`);
      int(raw.minutes, 0, 1_000_000, `${where}: Minuten`); break;
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
    case 'section.handover': text(raw.section, 64, `${where}: Abschnitt`); text(raw.member, 64, `${where}: Mitglied`); optText(raw.note, 300, `${where}: Notiz`); break;
    case 'section.accept': case 'section.decline': text(raw.section, 64, `${where}: Abschnitt`); break;
    case 'member.away': text(raw.member, 64, `${where}: Mitglied`); optText(raw.note, 120, `${where}: Notiz`);
      if (raw.until !== undefined && (typeof raw.until !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.until) || !Number.isFinite(Date.parse(raw.until)))) fail(`${where}: Datum ungültig`); break;
    case 'issue.ack':
      if (!Array.isArray(raw.events) || raw.events.length < 1 || raw.events.length > 200) fail(`${where}: Liste der Hinweise ungültig`);
      for (const id of raw.events as unknown[]) text(id, 64, `${where}: Ereignis-ID`);
      break;
    case 'team.digest': checkDigest(raw, where); break;
    case 'section.crew': {
      text(raw.section, 64, `${where}: Abschnitt`); optText(raw.note, 300, `${where}: Notiz`);
      if (!Array.isArray(raw.members) || raw.members.length > MAX_CREW) fail(`${where}: höchstens ${MAX_CREW} Mitbauer`);
      for (const m of raw.members as unknown[]) text(m, 64, `${where}: Mitglied`);
      if (new Set(raw.members as string[]).size !== (raw.members as string[]).length) fail(`${where}: Mitglied doppelt`);
      break;
    }
    case 'section.join': text(raw.section, 64, `${where}: Abschnitt`); break;
    case 'section.leave': text(raw.section, 64, `${where}: Abschnitt`); if (raw.member !== undefined) text(raw.member, 64, `${where}: Mitglied`); break;
    case 'gather.assign': {
      if (typeof raw.item !== 'string' || !ITEM_ID.test(raw.item)) fail(`${where}: Item ungültig`);
      optText(raw.note, 300, `${where}: Notiz`);
      if (!Array.isArray(raw.shares) || raw.shares.length > MAX_CREW) fail(`${where}: höchstens ${MAX_CREW} Anteile`);
      const seen = new Set<string>();
      for (const l of raw.shares as unknown[]) {
        if (!isObj(l)) fail(`${where}: Anteil ungültig`);
        const m = text((l as Record<string, unknown>).member, 64, `${where}: Mitglied`);
        if (seen.has(m)) fail(`${where}: Mitglied doppelt`);
        seen.add(m);
        int((l as Record<string, unknown>).count, 1, 1e9, `${where}: Menge`);
      }
      break;
    }
    case 'contribution.fix': {
      text(raw.ref, 64, `${where}: Buchung`);
      if (raw.blocks !== undefined) int(raw.blocks, 0, 10_000_000, `${where}: Blöcke`);
      itemLines(raw.items, 64, `${where}: Items`);
      optText(raw.note, 300, `${where}: Notiz`);
      break;
    }
    case 'team.protect':
      if (!PROTECT_MODES.includes(raw.mode as ProtectMode)) fail(`${where}: Schutzstufe unbekannt`);
      if (raw.free !== undefined && raw.free !== 'alle' && raw.free !== 'team') fail(`${where}: freie Abschnitte alle oder team`);
      break;
    case 'team.trust': if (typeof raw.upTo !== 'string' || !/^\d{1,15}$/.test(raw.upTo)) fail(`${where}: Ankunftsnummer ungültig`); break;
    default: break; // newer kinds: kept as they are
  }
  return raw as unknown as TeamEvent;
}

function deltaLines(v: unknown, max: number, what: string) {
  if (v === undefined) return;
  if (!Array.isArray(v) || v.length > max) fail(`${what}: höchstens ${max} Zeilen`);
  for (const l of v as unknown[]) {
    if (!isObj(l) || typeof l.item !== 'string' || !ITEM_ID.test(l.item)) fail(`${what}: Item ungültig`);
    int((l as Record<string, unknown>).delta, -1e12, 1e12, `${what}: Menge`);
  }
}
const STORE_STATUSES: readonly StoreStatus[] = ['ungeprueft', 'geprueft', 'abweichend', 'fehlt'];
function checkDigest(raw: Record<string, unknown>, where: string) {
  text(raw.cutoff, 64, `${where}: Stichtag`);
  if (typeof raw.run !== 'string' || !/^[a-z0-9]{4,12}$/.test(raw.run)) fail(`${where}: Lauf ungültig`);
  const parts = int(raw.parts, 1, 999, `${where}: Teile`); int(raw.part, 0, parts - 1, `${where}: Teil`);
  iso(raw.made, `${where}: verdichtet am`); int(raw.covered, 0, 1e7, `${where}: Anzahl`);
  const rows = (v: unknown, what: string): Record<string, unknown>[] => {
    if (v === undefined) return [];
    if (!Array.isArray(v) || v.length > 400 || v.some(r => !isObj(r))) fail(`${where}: ${what} ungültig`);
    return v as Record<string, unknown>[];
  };
  for (const t of rows(raw.tallies, 'Baunachweis')) {
    text(t.member, 64, `${where}: Mitglied`); text(t.section, 64, `${where}: Abschnitt`);
    int(t.placed, 0, 1e12, `${where}: gesetzt`); int(t.broken, 0, 1e12, `${where}: abgebaut`);
    itemLines(t.blocks, 64, `${where}: Blöcke`); iso(t.from, `${where}: von`); iso(t.until, `${where}: bis`);
  }
  for (const m of rows(raw.members, 'Mitglieder')) {
    text(m.member, 64, `${where}: Mitglied`); if (m.blocks !== undefined) int(m.blocks, 0, 1e12, `${where}: Blöcke`);
    itemLines(m.items, 64, `${where}: geliefert`); itemLines(m.stored, 64, `${where}: eingelagert`); itemLines(m.taken, 64, `${where}: entnommen`);
    if (m.last !== undefined) iso(m.last, `${where}: zuletzt`);
  }
  for (const c of rows(raw.chests, 'Lager')) {
    text(c.chest, 64, `${where}: Kiste`);
    if (c.head !== undefined) {
      if (!isObj(c.head) || !STORE_STATUSES.includes(c.head.status as StoreStatus) || typeof c.head.expected !== 'boolean') fail(`${where}: Kistenstand ungültig`);
      const h = c.head as Record<string, unknown>;
      if (h.checkedAt !== undefined) iso(h.checkedAt, `${where}: geprüft`);
      if (h.sealedBy !== undefined) text(h.sealedBy, 64, `${where}: gesiegelt von`);
      if (h.sealedAt !== undefined) iso(h.sealedAt, `${where}: gesiegelt`);
    }
    deltaLines(c.expected, 64, `${where}: Sollstand`); deltaLines(c.deviation, 64, `${where}: Abweichung`);
    if (c.moves !== undefined) {
      if (!Array.isArray(c.moves) || c.moves.length > 64) fail(`${where}: Buchungen ungültig`);
      for (const mv of c.moves as unknown[]) {
        if (!isObj(mv)) fail(`${where}: Buchung ungültig`);
        const x = mv as Record<string, unknown>;
        text(x.who, 64, `${where}: Buchung von`); itemLines(x.in, 64, `${where}: eingelegt`); itemLines(x.out, 64, `${where}: entnommen`);
      }
    }
    itemLines(c.yieldIn, 64, `${where}: Ertrag`); if (c.yieldMinutes !== undefined) int(c.yieldMinutes, 0, 1e9, `${where}: Laufzeit`);
    if (c.hopper !== undefined) {
      if (!isObj(c.hopper)) fail(`${where}: Trichter ungültig`);
      const h = c.hopper as Record<string, unknown>;
      int(h.seconds, 0, 1e12, `${where}: Trichterlaufzeit`); int(h.bookings, 0, 1e12, `${where}: Trichterbuchungen`); iso(h.from, `${where}: von`); iso(h.until, `${where}: bis`);
    }
  }
  for (const y of rows(raw.yields, 'Ertrag')) {
    text(y.chest, 64, `${where}: Kiste`); if (y.farm !== undefined) text(y.farm, 64, `${where}: Farm`);
    itemLines(y.items, 64, `${where}: Ertrag`, true); int(y.minutes, 0, 1e9, `${where}: Minuten`); iso(y.from, `${where}: von`); iso(y.until, `${where}: bis`);
    int(y.periods, 1, 1e9, `${where}: Zeiträume`);
  }
  if (raw.notes !== undefined) {
    if (!Array.isArray(raw.notes) || raw.notes.length > 400) fail(`${where}: Notizen ungültig`);
    for (const n of raw.notes as unknown[]) text(n, 64, `${where}: Notiz-ID`);
  }
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

// ---------------------------------------------------------------- COOP-11 digest (Verlauf verdichten)

/** Measurements that a digest replaces completely up to its cutoff. */
const DIGESTED_KINDS: ReadonlySet<string> = new Set(['build.tally', 'contribution', 'contribution.fix', 'store.move', 'store.check', 'store.seal', 'store.yield']);
/** Snapshot kinds: only the newest per chest/section up to the cutoff stays (it is the state; older ones are history). */
function snapshotKey(e: TeamEvent): string | null {
  const r = e as unknown as Record<string, unknown>;
  if (e.kind === 'store.count' && typeof r.chest === 'string') return `count ${r.chest}`;
  if (e.kind === 'store.seen' && typeof r.chest === 'string') return `seen ${r.chest}`;
  if (e.kind === 'section.seen' && typeof r.section === 'string') return `section ${r.section}`;
  return null;
}

/** The digest the fold uses: the newest complete run of a Bauleitung. */
export interface DigestInfo {
  /** Cutoff event: time and id. Everything up to here is folded through the digest. */
  readonly at: string;
  readonly id: string;
  readonly run: string;
  readonly by: string;
  readonly made: string;
  readonly covered: number;
  readonly parts: number;
  /** Event ids of the parts. */
  readonly ids: ReadonlySet<string>;
  /** Closed notes whose events are gone. */
  readonly notes: ReadonlySet<string>;
  /** Snapshot events that stay (newest per key at or before the cutoff). */
  readonly keep: ReadonlySet<string>;
}

type DigestEvent = Base & { readonly kind: 'team.digest' } & DigestBody;

/**
 * Finds the digest in force: among complete runs (all parts present) the one with the latest cutoff whose
 * author was Bauleitung at the cutoff. Roles are replayed from member.role events alone (founder first),
 * so every copy decides the same without the plan. Pure; null without a usable digest.
 */
export function digestInfo(team: Pick<TeamState, 'founder' | 'events'>): DigestInfo | null {
  const runs = new Map<string, DigestEvent[]>();
  for (const e of team.events) {
    if (e.kind !== 'team.digest') continue;
    const d = e as DigestEvent, key = `${d.run}|${d.cutoff}`;
    let l = runs.get(key); if (!l) runs.set(key, l = []); l.push(d);
  }
  if (!runs.size) return null;
  const complete = [...runs.values()].filter(l => {
    const parts = l[0]!.parts, by = l[0]!.by, at = l[0]!.at;
    const seen = new Set(l.map(d => d.part));
    return l.every(d => d.parts === parts && d.by === by && d.at === at) && seen.size === parts && l.length === parts;
  }).map(l => ({ l, ref: { at: l[0]!.at, id: l[0]!.cutoff } })).sort((a, b) => compareEvents(b.ref, a.ref) || (a.l[0]!.run < b.l[0]!.run ? -1 : 1));
  if (!complete.length) return null;
  // Role history from member.role (simplified: who is Bauleitung at that moment may change roles).
  const history = new Map<string, { at: string; id: string; role: TeamRole }[]>([[team.founder, [{ at: '', id: '', role: 'leitung' }]]]);
  const roleAt = (m: string, ref: { at: string; id: string }): TeamRole | undefined => {
    let r: TeamRole | undefined;
    for (const h of history.get(m) ?? []) if (compareEvents(h, ref) <= 0) r = h.role;
    return r;
  };
  for (const e of team.events) {
    if (e.kind !== 'member.role') continue;
    const r = e as unknown as { member: string; role: TeamRole };
    if (roleAt(e.by, e) !== 'leitung') continue;
    let l = history.get(r.member); if (!l) history.set(r.member, l = []); l.push({ at: e.at, id: e.id, role: r.role });
  }
  const chosen = complete.find(c => roleAt(c.l[0]!.by, c.ref) === 'leitung');
  if (!chosen) return null;
  const { l, ref } = chosen;
  const newest = new Map<string, string>();
  for (const e of team.events) {
    if (compareEvents(e, ref) > 0) break;
    const k = snapshotKey(e); if (k) newest.set(k, e.id);
  }
  const first = l.find(d => d.part === 0)!;
  return { at: ref.at, id: ref.id, run: first.run, by: first.by, made: first.made, covered: first.covered, parts: first.parts,
    ids: new Set(l.map(d => d.id)), notes: new Set(l.flatMap(d => d.notes ?? [])), keep: new Set(newest.values()) };
}

/** True for events the digest replaces: the fold skips them and a merge leaves them out. */
export function coveredByDigest(e: TeamEvent, dg: DigestInfo): boolean {
  if (compareEvents(e, dg) > 0) return false;
  if (e.kind === 'team.digest') return !dg.ids.has(e.id);
  if (DIGESTED_KINDS.has(e.kind)) return true;
  if (snapshotKey(e)) return !dg.keep.has(e.id);
  if ((e.kind === 'note.add' || e.kind === 'note.resolve') && dg.notes.has((e as unknown as { noteId: string }).noteId)) return true;
  return false;
}

/** The log without what the digest in force replaces (what the fold really reads). */
export function effectiveEvents(team: Pick<TeamState, 'founder' | 'events'>): readonly TeamEvent[] {
  const dg = digestInfo(team);
  return dg ? team.events.filter(e => !coveredByDigest(e, dg)) : team.events;
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
  /** COOP-11: events left out because the digest in force replaces them (late arrivals from older copies). */
  readonly pruned: number;
}

/**
 * Union of two team logs. Order-independent and idempotent: merge(a, b) and
 * merge(b, a) give the same events; merging again adds nothing. Local fields
 * (self) stay; `server` is taken from the incoming log when missing locally.
 */
const hasSig = (e: TeamEvent) => typeof (e as unknown as { sig?: unknown }).sig === 'string';
const unsigned = (e: TeamEvent) => { const { sig: _s, ...rest } = e as unknown as Record<string, unknown>; return rest; };

export function mergeTeam(local: TeamState, incoming: TeamState): TeamMerge {
  if (local.teamId !== incoming.teamId) throw new DomainError('TEAM_MISMATCH', `Das Paket gehört zu einem anderen Team (${incoming.name}).`);
  const byId = new Map(local.events.map(e => [e.id, e]));
  const added: TeamEvent[] = [], clashes: { local: TeamEvent; incoming: TeamEvent }[] = [];
  let known = 0;
  for (const raw of incoming.events) {
    const e = checkTeamEvent(raw), mine = byId.get(e.id);
    if (!mine) { byId.set(e.id, e); added.push(e); continue; }
    if (canonicalJson(mine) === canonicalJson(e)) { known++; continue; }
    // GAME-06: the same event with the Bauleitung's signature (as it came back from the room) is the same event;
    // the signed copy is kept, whichever side has it, so the result does not depend on the merge order.
    if (canonicalJson(unsigned(mine)) === canonicalJson(unsigned(e))) { known++; if (hasSig(e) && !hasSig(mine)) byId.set(e.id, e); continue; }
    clashes.push({ local: mine, incoming: e });
  }
  // COOP-11: what a digest replaces does not come back with an older copy of the log.
  let events = [...byId.values()].sort(compareEvents);
  const dg = digestInfo({ founder: local.founder, events });
  let pruned = 0;
  if (dg) { const before = events.length; events = events.filter(e => !coveredByDigest(e, dg)); pruned = before - events.length; }
  if (events.length > MAX_TEAM_EVENTS) throw new DomainError('TEAM_FULL', `Das Teamprotokoll hätte mehr als ${MAX_TEAM_EVENTS} Ereignisse. Die Bauleitung kann den Verlauf verdichten.`);
  const kept = new Set(events.map(e => e.id));
  // The founder is fixed at creation; a different founder means two teams were created with one id (should not happen).
  const team: TeamState = { ...local, events, ...(local.server === undefined && incoming.server !== undefined && { server: incoming.server }) };
  return { team, added: added.filter(e => kept.has(e.id)).sort(compareEvents), known, clashes, pruned };
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
  /** TEAM-03: sections this member builds along in (Mitbauer), not as owner. */
  readonly crewSections: readonly string[];
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
  /** Absent (member.away): until that day inclusive, or open-ended without `until`. */
  readonly away?: { readonly until?: string; readonly note?: string };
}
export interface SectionTeamState {
  readonly sectionId: string;
  readonly status: SectionTeamStatus;
  readonly owner: string | null;
  /** TEAM-03: Mitbauer besides the owner, in the order they came. */
  readonly crew: readonly string[];
  /** TEAM-03: version of the assignment (owner + crew); counts every effective change. */
  readonly version: number;
  readonly doneBy?: string;
  readonly verifiedBy?: string;
  readonly note?: string;
  /** Section is not (any more) in the plan. */
  readonly orphan: boolean;
  /** Open handover offer (section.handover) until accepted, declined or overtaken by another section event. */
  readonly offer?: { readonly to: string; readonly by: string; readonly at: string; readonly note?: string };
  readonly history: readonly { readonly at: string; readonly by: string; readonly text: string }[];
  /** Baunachweis inside this section: placed blocks over all members, and per member. */
  readonly placed: number;
  readonly broken: number;
  readonly builders: Readonly<Record<string, number>>;
  /** COOP-10: newest build state reported by a player's mod (section.seen) – unverified. */
  readonly seen?: SectionSeen;
}
export interface SectionSeen { readonly by: string; readonly at: string; readonly placed: number; readonly total: number; readonly wrong: number; readonly missing: readonly ItemCount[] }
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
  /** COOP-08: farm (site.production farm id) of a yield store, measured yield and loaded minutes over all store.yield. */
  readonly farm?: string;
  readonly yieldIn: Readonly<Record<string, number>>;
  readonly yieldMinutes: number;
  /** COOP-10: content seen in the game by a player's mod (store.seen) – unverified, newest. */
  readonly seen?: { readonly by: string; readonly at: string; readonly items: Readonly<Record<string, number>>; readonly partial: boolean };
}
/** One measured yield period of a yield store (store.yield), for the Ertragsbuch (Produktion). */
export interface StoreYield {
  readonly eventId: string;
  readonly chest: string;
  readonly chestName: string;
  readonly farm?: string;
  readonly items: Readonly<Record<string, number>>;
  /** Minutes the chunk of the store was loaded (the farm really ran). */
  readonly minutes: number;
  readonly from: string;
  readonly until: string;
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
/** `stale`: TEAM-03 – the event was written on an older version that someone else changed since (not applied). */
export interface TeamRejection { readonly event: TeamEvent; readonly reason: string; readonly stale?: { readonly current: number } }
export interface TeamConflict { readonly event: TeamEvent; readonly text: string }
/** `by`: who assigned it when not the member (gather.assign, TEAM-03). */
export interface GatherClaim { readonly member: string; readonly item: string; readonly count: number; readonly at: string; readonly by?: string }
/** TEAM-03: one booked contribution with its versions (contribution.fix); amounts are the newest version. */
export interface TeamBooking {
  readonly id: string;
  readonly by: string;
  readonly at: string;
  readonly section?: string;
  readonly blocks: number;
  readonly items: readonly ItemCount[];
  readonly note?: string;
  readonly version: number;
  readonly cancelled: boolean;
  readonly history: readonly { readonly at: string; readonly by: string; readonly version: number; readonly text: string }[];
}
export interface PlanRelease { readonly revisionId: string; readonly revisionNumber: number; readonly summary: string; readonly at: string; readonly by: string }

export interface TeamView {
  readonly members: readonly TeamMember[];
  readonly sections: readonly SectionTeamState[];
  readonly notes: readonly TeamNote[];
  readonly gather: readonly GatherClaim[];
  /** TEAM-03: version per gathered item (changes by gather.claim and gather.assign). */
  readonly gatherVersions: Readonly<Record<string, number>>;
  /** TEAM-03: booked contributions after the last digest, newest first, with their versions. */
  readonly bookings: readonly TeamBooking[];
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
  /** COOP-10: stock of chests without a server count, from what players' mods saw (unverified). */
  readonly stockSeen: Readonly<Record<string, number>>;
  /** Sum of the last counts of all chests. */
  readonly stock: Readonly<Record<string, number>>;
  /** Placed blocks by block id over all visible tallies (material really used). */
  readonly placedBlocks: Readonly<Record<string, number>>;
  /** Time span of the visible Baunachweis. */
  readonly tallySpan: { readonly from: string; readonly until: string } | null;
  /** Event ids of hints and rejections marked as done (issue.ack). */
  readonly acknowledged: readonly string[];
  /** Measured yield periods of yield stores, oldest first (COOP-08). */
  readonly yields: readonly StoreYield[];
  /** GAME-06: section protection the Bauleitung set for the server (null = the server's own setting). */
  readonly protect: { readonly mode: ProtectMode; readonly free: ProtectFree; readonly by: string; readonly at: string } | null;
}

export interface TeamContext {
  /** Plan sections in build order. */
  readonly sections: readonly { readonly id: string; readonly name: string }[];
  /** site.program.builders (PROJ-01). */
  readonly builders: readonly { readonly id: string; readonly name: string; readonly player?: string }[];
}

export type TeamAction = TeamEventKind;
/** Minimum role per event kind; some kinds have extra rules in the fold (own section, own note, self). */
const NEED: Readonly<Record<TeamEventKind, TeamRole>> = {
  'member.join': 'gast', 'member.role': 'leitung', 'member.player': 'gast', 'section.claim': 'helfer', 'section.assign': 'meister',
  'section.release': 'helfer', 'section.done': 'helfer', 'section.verify': 'meister', contribution: 'helfer', 'gather.claim': 'helfer',
  'note.add': 'gast', 'note.resolve': 'helfer', 'plan.release': 'leitung',
  'build.tally': 'gast', 'member.tally': 'gast', 'store.chest': 'meister', 'store.count': 'gast',
  'store.config': 'meister', 'store.seal': 'meister', 'store.move': 'gast', 'store.check': 'gast', 'store.yield': 'gast',
  'section.handover': 'helfer', 'section.accept': 'helfer', 'section.decline': 'helfer', 'member.away': 'gast', 'issue.ack': 'meister',
  'section.seen': 'helfer', 'store.seen': 'helfer', 'team.digest': 'leitung',
  'section.crew': 'meister', 'section.join': 'helfer', 'section.leave': 'helfer', 'gather.assign': 'meister', 'contribution.fix': 'helfer', 'team.protect': 'leitung', 'team.trust': 'leitung',
};
export const canTeam = (role: TeamRole | undefined, action: TeamAction): boolean => RANK[role ?? 'gast'] >= RANK[NEED[action]];
/** Minimum role of an event kind (unknown kinds: undefined), as `TeamLog.need` in the server plugin. */
export const teamKindNeed = (kind: string): TeamRole | undefined => (NEED as Record<string, TeamRole>)[kind];

const mentionRe = /@([A-Za-zÄÖÜäöüß0-9_.-]{2,40})/g;

/** Folds the log into the visible state. Pure and deterministic. */
export function teamView(team: TeamState, ctx: TeamContext): TeamView { return foldTeam(team, ctx); }

/** Raw fold state at the end of the fold, for the digest (COOP-11). Internal. */
export interface FoldRaw {
  readonly tallies: readonly { by: string; section: string; placed: number; broken: number; blocks?: readonly ItemCount[]; from: string; until: string }[];
  readonly blocks: ReadonlyMap<string, number>;
  readonly items: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly stored: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly taken: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly lastActive: ReadonlyMap<string, string>;
  readonly chests: ReadonlyMap<string, { counted: boolean; expected: ReadonlyMap<string, number> | null; status: StoreStatus; checkedAt?: string; sealedBy?: string; sealedAt?: string;
    deviation: ReadonlyMap<string, number>; movedIn: ReadonlyMap<string, ReadonlyMap<string, number>>; movedOut: ReadonlyMap<string, ReadonlyMap<string, number>>;
    farm?: string; yieldIn: ReadonlyMap<string, number>; yieldMinutes: number }>;
  readonly yields: readonly StoreYield[];
  readonly notes: ReadonlyMap<string, { resolved?: { at: string } }>;
  readonly rejected: readonly TeamRejection[];
}

/**
 * The fold. `until` stops after that event (the digest folds the log up to its cutoff); `capture` gets
 * the raw state at the end. Events the digest in force replaces are skipped.
 */
export function foldTeam(team: TeamState, ctx: TeamContext, opts: { until?: { at: string; id: string }; capture?: (raw: FoldRaw) => void } = {}): TeamView {
  const dg = digestInfo(team);
  const sectionIds = new Set(ctx.sections.map(s => s.id));
  const names = new Map<string, string>(ctx.builders.map(b => [b.id, b.name]));
  const inProgram = new Set(ctx.builders.map(b => b.id));
  const roles = new Map<string, TeamRole>([[team.founder, 'leitung']]);
  const players = new Map<string, string>(ctx.builders.filter(b => b.player).map(b => [b.id, b.player!]));
  const known = new Set<string>([...inProgram, team.founder]);
  const lastActive = new Map<string, string>();
  type Mutable = { status: SectionTeamStatus; owner: string | null; crew: string[]; changes: string[]; doneBy?: string; verifiedBy?: string; note?: string; offer?: { to: string; by: string; at: string; note?: string };
    history: { at: string; by: string; text: string }[] };
  const sections = new Map<string, Mutable>();
  const sec = (id: string): Mutable => { let s = sections.get(id); if (!s) sections.set(id, s = { status: 'frei', owner: null, crew: [], changes: [], history: [] }); return s; };
  // TEAM-03 versions: `changes` holds the author of every effective change (version = its length).
  const gatherChanges = new Map<string, string[]>();
  type Booking = { by: string; at: string; section?: string; blocks: number; items: ItemCount[]; note?: string; changes: string[]; history: { at: string; by: string; version: number; text: string }[] };
  const bookings = new Map<string, Booking>();
  /** Written on an older version that someone else has changed since: not applied (TEAM-03). */
  const staleAgainst = (event: KnownTeamEvent, changes: readonly string[], what: string): boolean => {
    const base = (event as { base?: number }).base;
    if (base === undefined || base >= changes.length) return false;
    const others = [...new Set(changes.slice(base).filter(by => by !== event.by))];
    if (!others.length) return false;
    rejected.push({ event, reason: `Überholt: ${what} wurde inzwischen von ${others.map(nameOf).join(', ')} geändert (gesehen Version ${base}, jetzt ${changes.length}). Bitte neu entscheiden.`, stale: { current: changes.length } });
    return true;
  };
  const changed = (s: Mutable, by: string) => { s.changes.push(by); };
  const canBuild = (id: string) => canTeam(roleOf(id), 'section.claim');
  const notes = new Map<string, { at: string; by: string; text: string; tag: NoteTag; section?: string; pos?: readonly [number, number, number]; resolved?: { at: string; by: string; text?: string } }>();
  const gather = new Map<string, GatherClaim>();
  const blocks = new Map<string, number>(), items = new Map<string, Map<string, number>>();
  const delivered: Record<string, number> = {};
  const releases: PlanRelease[] = [];
  const away = new Map<string, { until?: string; note?: string }>();
  const acknowledged = new Set<string>();
  const rejected: TeamRejection[] = [], conflicts: TeamConflict[] = [];
  let unknownKinds = 0;
  let protect: TeamView['protect'] = null;
  const tallyOff = new Set<string>();
  const tallies: { by: string; section: string; placed: number; broken: number; blocks?: readonly ItemCount[]; from: string; until: string }[] = [];
  type Chest = { name: string; pos: readonly [number, number, number]; dimension: string; items: Map<string, number>; countedAt?: string; countedBy?: string; partial: boolean; counted: boolean;
    // COOP-05, same rules as StoreIndex.java
    section?: string; purpose: StorePurpose; protection?: StoreProtection; pos2?: readonly [number, number, number]; expected: Map<string, number> | null;
    status: StoreStatus; checkedAt?: string; deviation: Map<string, number>; sealedBy?: string; sealedAt?: string;
    movedIn: Map<string, Map<string, number>>; movedOut: Map<string, Map<string, number>>;
    // COOP-08: farm link and measured yield
    farm?: string; yieldIn: Map<string, number>; yieldMinutes: number;
    // COOP-10: what a player's mod saw
    seen?: { by: string; at: string; items: Map<string, number>; partial: boolean } };
  const seenSections = new Map<string, SectionSeen>();
  const yields: StoreYield[] = [];
  const addTo = (m: Map<string, number>, item: string, n: number) => { const v = (m.get(item) ?? 0) + n; if (v === 0) m.delete(item); else m.set(item, v); };
  const chests = new Map<string, Chest>();
  const stored = new Map<string, Map<string, number>>(), taken = new Map<string, Map<string, number>>();
  const book = (m: Map<string, Map<string, number>>, who: string, item: string, n: number) => {
    let x = m.get(who); if (!x) m.set(who, x = new Map()); x.set(item, (x.get(item) ?? 0) + n);
  };
  const nameOf = (id: string) => names.get(id) ?? id;
  const roleOf = (id: string): TeamRole => roles.get(id) ?? (known.has(id) ? 'helfer' : 'gast');
  const reject = (event: TeamEvent, reason: string) => { rejected.push({ event, reason }); };
  const later = (m: string, at?: string) => { if (at && (!lastActive.has(m) || at > lastActive.get(m)!)) lastActive.set(m, at); };
  const applyDigest = (d: DigestBody) => {
    for (const t of d.tallies ?? []) tallies.push({ by: t.member, section: t.section, placed: t.placed, broken: t.broken, ...(t.blocks && { blocks: t.blocks }), from: t.from, until: t.until });
    for (const m of d.members ?? []) {
      if (m.blocks) blocks.set(m.member, (blocks.get(m.member) ?? 0) + m.blocks);
      for (const l of m.items ?? []) {
        let x = items.get(m.member); if (!x) items.set(m.member, x = new Map());
        x.set(l.item, (x.get(l.item) ?? 0) + l.count);
        delivered[l.item] = (delivered[l.item] ?? 0) + l.count;
      }
      for (const l of m.stored ?? []) book(stored, m.member, l.item, l.count);
      for (const l of m.taken ?? []) book(taken, m.member, l.item, l.count);
      later(m.member, m.last);
    }
    for (const r of d.chests ?? []) {
      const c = chests.get(r.chest);
      if (!c) continue; // removed after all: nothing to restore
      if (r.head) {
        c.status = r.head.status; c.deviation.clear();
        if (r.head.checkedAt) c.checkedAt = r.head.checkedAt; else delete c.checkedAt;
        if (r.head.sealedBy) { c.sealedBy = r.head.sealedBy; c.sealedAt = r.head.sealedAt!; } else { delete c.sealedBy; delete c.sealedAt; }
        c.expected = r.head.expected ? new Map() : null;
      }
      for (const l of r.expected ?? []) if (c.expected) addTo(c.expected, l.item, l.delta);
      for (const l of r.deviation ?? []) addTo(c.deviation, l.item, l.delta);
      for (const mv of r.moves ?? []) for (const [list, target] of [[mv.in, c.movedIn], [mv.out, c.movedOut]] as const) {
        if (!list?.length) continue;
        let m = target.get(mv.who); if (!m) target.set(mv.who, m = new Map());
        for (const l of list) addTo(m, l.item, l.count);
      }
      for (const l of r.yieldIn ?? []) addTo(c.yieldIn, l.item, l.count);
      c.yieldMinutes += r.yieldMinutes ?? 0;
    }
    for (const y of d.yields ?? []) {
      const c = chests.get(y.chest);
      if (!c) continue;
      yields.push({ eventId: `${(d as unknown as { id: string }).id}#${y.chest}`, chest: y.chest, chestName: c.name, ...(y.farm && { farm: y.farm }),
        items: Object.fromEntries(y.items.map(l => [l.item, l.count])), minutes: y.minutes, from: y.from, until: y.until });
    }
  };

  for (const event of team.events) {
    if (opts.until && compareEvents(event, opts.until) > 0) break;
    if (!isKnownEvent(event)) { unknownKinds++; continue; }
    if (dg && coveredByDigest(event, dg)) continue;
    if (event.kind === 'team.digest') {
      // Decided before the fold (digestInfo): a run that is not in force has no effect and is no error.
      if (dg?.ids.has(event.id)) applyDigest(event);
      continue;
    }
    const role = roleOf(event.by);
    const self = (m: string) => m === event.by;
    // member.join and member.player may always be written for oneself.
    const selfAllowed = (event.kind === 'member.join' || event.kind === 'member.player' || event.kind === 'member.tally' || event.kind === 'member.away') && self(event.member);
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
        // A claim needs no version: a taken section gives the known double-claim hint, a free one is simply taken.
        if (s.owner) { conflicts.push({ event, text: `${nameOf(event.by)} wollte „${sectionName(ctx, event.section)}“ übernehmen, der Abschnitt war schon an ${nameOf(s.owner)} vergeben.` }); break; }
        if (s.status === 'bestaetigt') { reject(event, `„${sectionName(ctx, event.section)}“ ist schon bestätigt.`); break; }
        s.owner = event.by; s.crew = s.crew.filter(m => m !== event.by); s.status = 'vergeben'; delete s.doneBy; delete s.verifiedBy; delete s.offer;
        if (event.note) s.note = event.note;
        changed(s, event.by);
        s.history.push({ at: event.at, by: event.by, text: 'übernommen' });
        break;
      }
      case 'section.assign': {
        const s = sec(event.section);
        if (!known.has(event.member)) { reject(event, `Unbekanntes Mitglied ${event.member}.`); break; }
        if (staleAgainst(event, s.changes, `„${sectionName(ctx, event.section)}“`)) break;
        if (s.owner === event.member) break;
        if (s.owner && !s.crew.includes(event.member)) conflicts.push({ event, text: `${nameOf(event.by)} hat „${sectionName(ctx, event.section)}“ von ${nameOf(s.owner)} an ${nameOf(event.member)} umgewiesen.` });
        s.crew = s.crew.filter(m => m !== event.member);
        s.owner = event.member; delete s.offer;
        if (s.status === 'frei') s.status = 'vergeben';
        changed(s, event.by);
        s.history.push({ at: event.at, by: event.by, text: `zugewiesen an ${nameOf(event.member)}` });
        break;
      }
      case 'section.release': {
        const s = sec(event.section);
        if (staleAgainst(event, s.changes, `„${sectionName(ctx, event.section)}“`)) break;
        if (s.owner !== event.by && s.crew.includes(event.by)) {
          // A Mitbauer giving back only leaves the crew.
          s.crew = s.crew.filter(m => m !== event.by); changed(s, event.by);
          s.history.push({ at: event.at, by: event.by, text: 'baut nicht mehr mit' });
          break;
        }
        if (s.owner !== event.by && !canTeam(role, 'section.assign')) { reject(event, `Nur ${s.owner ? nameOf(s.owner) : 'der Inhaber'} oder ein Baumeister kann „${sectionName(ctx, event.section)}“ abgeben.`); break; }
        if (s.status === 'bestaetigt') { reject(event, `„${sectionName(ctx, event.section)}“ ist bestätigt und kann nicht mehr abgegeben werden.`); break; }
        s.owner = null; s.crew = []; s.status = 'frei'; delete s.doneBy; delete s.offer;
        changed(s, event.by);
        s.history.push({ at: event.at, by: event.by, text: 'abgegeben' });
        break;
      }
      case 'section.done': {
        const s = sec(event.section);
        if (s.owner && s.owner !== event.by && !s.crew.includes(event.by)) conflicts.push({ event, text: `${nameOf(event.by)} hat „${sectionName(ctx, event.section)}“ fertig gemeldet, Inhaber ist ${nameOf(s.owner)}.` });
        if (!s.owner) { s.owner = event.by; changed(s, event.by); }
        s.status = 'gemeldet'; s.doneBy = event.by; delete s.verifiedBy; delete s.offer;
        if (event.note) s.note = event.note;
        s.history.push({ at: event.at, by: event.by, text: 'fertig gemeldet' });
        break;
      }
      case 'section.verify': {
        const s = sec(event.section);
        if (s.status === 'frei') { reject(event, `„${sectionName(ctx, event.section)}“ ist frei, es gibt nichts zu prüfen.`); break; }
        s.status = event.ok ? 'bestaetigt' : 'nacharbeit'; s.verifiedBy = event.by; delete s.offer;
        if (event.note) s.note = event.note;
        s.history.push({ at: event.at, by: event.by, text: event.ok ? 'bestätigt' : `Nacharbeit${event.note ? `: ${event.note}` : ''}` });
        break;
      }
      case 'contribution': {
        bookings.set(event.id, { by: event.by, at: event.at, ...(event.section && { section: event.section }), blocks: event.blocks ?? 0, items: [...(event.items ?? [])],
          ...(event.note && { note: event.note }), changes: [event.by], history: [] });
        if (event.blocks) blocks.set(event.by, (blocks.get(event.by) ?? 0) + event.blocks);
        for (const l of event.items ?? []) {
          let m = items.get(event.by); if (!m) items.set(event.by, m = new Map());
          m.set(l.item, (m.get(l.item) ?? 0) + l.count);
          delivered[l.item] = (delivered[l.item] ?? 0) + l.count;
        }
        break;
      }
      case 'gather.claim': {
        let ch = gatherChanges.get(event.item); if (!ch) gatherChanges.set(event.item, ch = []);
        if (staleAgainst(event, ch, `Der Sammelauftrag ${event.item.replace(/^minecraft:/, '')}`)) break;
        const key = `${event.by} ${event.item}`;
        if (event.count === 0) gather.delete(key); else gather.set(key, { member: event.by, item: event.item, count: event.count, at: event.at });
        ch.push(event.by);
        break;
      }
      case 'gather.assign': {
        let ch = gatherChanges.get(event.item); if (!ch) gatherChanges.set(event.item, ch = []);
        const bad = event.shares.find(l => !known.has(l.member) || !canBuild(l.member));
        if (bad) { reject(event, known.has(bad.member) ? `${nameOf(bad.member)} ist ${TEAM_ROLE_LABEL[roleOf(bad.member)]} und sammelt nicht für das Team.` : `Unbekanntes Mitglied ${bad.member}.`); break; }
        if (staleAgainst(event, ch, `Der Sammelauftrag ${event.item.replace(/^minecraft:/, '')}`)) break;
        for (const key of [...gather.keys()]) if (gather.get(key)!.item === event.item) gather.delete(key);
        for (const l of event.shares) gather.set(`${l.member} ${event.item}`, { member: l.member, item: event.item, count: l.count, at: event.at, ...(l.member !== event.by && { by: event.by }) });
        ch.push(event.by);
        break;
      }
      case 'contribution.fix': {
        const b = bookings.get(event.ref);
        if (!b) { reject(event, 'Die Buchung gibt es nicht (mehr) – vielleicht schon verdichtet.'); break; }
        if (b.by !== event.by && !canTeam(role, 'section.verify')) { reject(event, `Nur ${nameOf(b.by)} oder ein Baumeister kann diese Buchung ändern.`); break; }
        if (staleAgainst(event, b.changes, 'Die Buchung')) break;
        // take the old version out, put the new one in (always on the account of the one who booked it)
        if (b.blocks) blocks.set(b.by, (blocks.get(b.by) ?? 0) - b.blocks);
        const mine = items.get(b.by) ?? new Map<string, number>(); items.set(b.by, mine);
        for (const l of b.items) { addTo(mine, l.item, -l.count); delivered[l.item] = (delivered[l.item] ?? 0) - l.count; if (!delivered[l.item]) delete delivered[l.item]; }
        b.blocks = event.blocks ?? 0; b.items = [...(event.items ?? [])];
        if (event.note !== undefined) { if (event.note) b.note = event.note; else delete b.note; }
        if (b.blocks) blocks.set(b.by, (blocks.get(b.by) ?? 0) + b.blocks);
        for (const l of b.items) { addTo(mine, l.item, l.count); delivered[l.item] = (delivered[l.item] ?? 0) + l.count; }
        b.changes.push(event.by);
        const cancelled = !b.blocks && !b.items.length;
        b.history.push({ at: event.at, by: event.by, version: b.changes.length, text: cancelled ? 'storniert' : `korrigiert${event.note ? `: ${event.note}` : ''}` });
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
      case 'section.seen':
        seenSections.set(event.section, { by: event.by, at: event.at, placed: event.placed, total: event.total, wrong: event.wrong ?? 0, missing: event.missing ?? [] });
        break;
      case 'store.seen': {
        const c = chests.get(event.chest);
        if (!c) { reject(event, 'Lagerkiste unbekannt oder entfernt.'); break; }
        c.seen = { by: event.by, at: event.at, items: new Map(event.items.map(l => [l.item, l.count])), partial: !!event.more };
        break;
      }
      case 'build.tally':
        tallies.push({ by: event.by, section: event.section, placed: event.placed, broken: event.broken, ...(event.blocks && { blocks: event.blocks }), from: event.from, until: event.until });
        break;
      case 'store.chest': {
        const c = chests.get(event.chest);
        if (event.remove) { if (!c) reject(event, 'Lagerkiste unbekannt.'); else chests.delete(event.chest); break; }
        if (c) { c.name = event.name; c.pos = event.pos; c.dimension = event.dimension; break; }
        chests.set(event.chest, { name: event.name, pos: event.pos, dimension: event.dimension, items: new Map(), partial: false, counted: false,
          purpose: 'vorrat', expected: null, status: 'ungeprueft', deviation: new Map(), movedIn: new Map(), movedOut: new Map(), yieldIn: new Map(), yieldMinutes: 0 });
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
        if (event.farm !== undefined) { if (event.farm) c.farm = event.farm; else delete c.farm; }
        break;
      }
      case 'store.yield': {
        const c = chests.get(event.chest);
        if (!c) { reject(event, 'Lagerkiste unbekannt oder entfernt.'); break; }
        for (const l of event.items) addTo(c.yieldIn, l.item, l.count);
        c.yieldMinutes += event.minutes;
        const farm = event.farm ?? c.farm;
        yields.push({ eventId: event.id, chest: event.chest, chestName: c.name, ...(farm && { farm }), items: Object.fromEntries(event.items.map(l => [l.item, l.count])),
          minutes: event.minutes, from: event.from, until: event.until });
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
      case 'section.handover': {
        const s = sec(event.section), label = sectionName(ctx, event.section);
        if (s.status === 'bestaetigt' || s.status === 'gemeldet') { reject(event, `„${label}“ ist ${s.status === 'bestaetigt' ? 'bestätigt' : 'fertig gemeldet'} und wird nicht mehr übergeben.`); break; }
        if (s.owner !== event.by && !canTeam(role, 'section.assign')) { reject(event, `Nur ${s.owner ? nameOf(s.owner) : 'der Inhaber'} oder ein Baumeister kann „${label}“ übergeben.`); break; }
        if (!known.has(event.member)) { reject(event, `Unbekanntes Mitglied ${event.member}.`); break; }
        if (staleAgainst(event, s.changes, `„${label}“`)) break;
        if (event.member === s.owner) { reject(event, `${nameOf(event.member)} hat „${label}“ schon.`); break; }
        if (!canTeam(roleOf(event.member), 'section.claim')) { reject(event, `${nameOf(event.member)} ist ${TEAM_ROLE_LABEL[roleOf(event.member)]} und kann keine Abschnitte übernehmen.`); break; }
        s.offer = { to: event.member, by: event.by, at: event.at, ...(event.note && { note: event.note }) };
        s.history.push({ at: event.at, by: event.by, text: `Übergabe an ${nameOf(event.member)} angeboten${event.note ? `: ${event.note}` : ''}` });
        break;
      }
      case 'section.accept': {
        const s = sec(event.section), label = sectionName(ctx, event.section);
        if (!s.offer || s.offer.to !== event.by) { reject(event, `Für ${nameOf(event.by)} liegt kein Übergabeangebot für „${label}“ vor.`); break; }
        const from = s.owner;
        s.owner = event.by; s.crew = s.crew.filter(m => m !== event.by); if (s.status === 'frei') s.status = 'vergeben';
        changed(s, event.by);
        if (s.offer.note) s.note = s.offer.note;
        delete s.offer;
        s.history.push({ at: event.at, by: event.by, text: `Übergabe angenommen${from ? ` (von ${nameOf(from)})` : ''}` });
        break;
      }
      case 'section.decline': {
        const s = sec(event.section), label = sectionName(ctx, event.section);
        if (!s.offer) { reject(event, `Für „${label}“ gibt es kein offenes Übergabeangebot.`); break; }
        if (![s.offer.to, s.offer.by, s.owner].includes(event.by) && !canTeam(role, 'section.assign')) { reject(event, 'Ein fremdes Übergabeangebot zieht ein Baumeister zurück.'); break; }
        s.history.push({ at: event.at, by: event.by, text: event.by === s.offer.to ? 'Übergabe abgelehnt' : 'Übergabeangebot zurückgezogen' });
        delete s.offer;
        break;
      }
      case 'section.crew': {
        const s = sec(event.section), label = sectionName(ctx, event.section);
        if (s.status === 'bestaetigt') { reject(event, `„${label}“ ist schon bestätigt.`); break; }
        const bad = event.members.find(m => !known.has(m) || !canBuild(m));
        if (bad) { reject(event, known.has(bad) ? `${nameOf(bad)} ist ${TEAM_ROLE_LABEL[roleOf(bad)]} und kann nicht mitbauen.` : `Unbekanntes Mitglied ${bad}.`); break; }
        if (staleAgainst(event, s.changes, `„${label}“`)) break;
        let list = [...event.members];
        if (!s.owner && list.length) { s.owner = list.shift()!; if (s.status === 'frei') s.status = 'vergeben'; }
        list = list.filter(m => m !== s.owner).slice(0, MAX_CREW - 1);
        s.crew = list;
        if (event.note) s.note = event.note;
        changed(s, event.by);
        s.history.push({ at: event.at, by: event.by, text: s.crew.length ? `Mitbauer: ${s.crew.map(nameOf).join(', ')}` : 'keine Mitbauer mehr' });
        break;
      }
      case 'section.join': {
        const s = sec(event.section), label = sectionName(ctx, event.section);
        if (s.owner === event.by || s.crew.includes(event.by)) break;
        if (s.status === 'bestaetigt') { reject(event, `„${label}“ ist schon bestätigt.`); break; }
        if (staleAgainst(event, s.changes, `„${label}“`)) break;
        if (!s.owner) { s.owner = event.by; s.status = 'vergeben'; delete s.doneBy; delete s.verifiedBy; changed(s, event.by); s.history.push({ at: event.at, by: event.by, text: 'übernommen' }); break; }
        if (s.crew.length >= MAX_CREW - 1) { reject(event, `An „${label}“ bauen schon ${MAX_CREW} Spieler.`); break; }
        s.crew.push(event.by); changed(s, event.by);
        s.history.push({ at: event.at, by: event.by, text: 'baut mit' });
        break;
      }
      case 'section.leave': {
        const s = sec(event.section), label = sectionName(ctx, event.section), who = event.member ?? event.by;
        if (who !== event.by && !canTeam(role, 'section.assign')) { reject(event, `Nur ${nameOf(who)} selbst oder ein Baumeister nimmt ${nameOf(who)} aus „${label}“.`); break; }
        if (s.owner !== who && !s.crew.includes(who)) { reject(event, `${nameOf(who)} baut nicht an „${label}“.`); break; }
        if (s.status === 'bestaetigt') { reject(event, `„${label}“ ist bestätigt und bleibt so.`); break; }
        if (staleAgainst(event, s.changes, `„${label}“`)) break;
        if (s.owner === who) {
          s.owner = s.crew.shift() ?? null;
          if (!s.owner) { s.status = 'frei'; delete s.doneBy; }
          delete s.offer;
        } else s.crew = s.crew.filter(m => m !== who);
        changed(s, event.by);
        s.history.push({ at: event.at, by: event.by, text: `${who === event.by ? 'ausgestiegen' : `${nameOf(who)} herausgenommen`}${s.owner && s.owner !== who ? ` – verantwortlich: ${nameOf(s.owner)}` : ''}` });
        break;
      }
      case 'member.away':
        if (!self(event.member) && role !== 'leitung') { reject(event, 'Abwesenheit trägt jeder selbst ein oder die Bauleitung.'); break; }
        if (event.until || event.note) away.set(event.member, { ...(event.until && { until: event.until }), ...(event.note && { note: event.note }) });
        else away.delete(event.member);
        break;
      case 'issue.ack':
        for (const id of event.events) acknowledged.add(id);
        break;
      case 'team.protect': protect = { mode: event.mode, free: event.free ?? 'alle', by: event.by, at: event.at }; break;
      case 'team.trust': break;
    }
  }

  opts.capture?.({ tallies, blocks, items, stored, taken, lastActive, chests, yields, notes, rejected });

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
  const stock: Record<string, number> = {}, stockSeen: Record<string, number> = {};
  const stores: StoreChest[] = [...chests.entries()].map(([id, c]) => {
    for (const [item, n] of c.items) stock[item] = (stock[item] ?? 0) + n;
    // A server count wins; a newer sighting counts only for chests the server never counted.
    if (!c.counted && c.seen) for (const [item, n] of c.seen.items) stockSeen[item] = (stockSeen[item] ?? 0) + n;
    const rec = (m: Map<string, Map<string, number>>, hopper: boolean) => Object.fromEntries([...m].filter(([w, x]) => (w === 'trichter') === hopper && x.size).map(([w, x]) => [w, Object.fromEntries(x)]));
    return { id, name: c.name, pos: c.pos, dimension: c.dimension, items: Object.fromEntries(c.items), ...(c.countedAt && { countedAt: c.countedAt }), ...(c.countedBy && { countedBy: c.countedBy }), partial: c.partial,
      ...(c.section && { section: c.section }), purpose: c.purpose, ...(c.protection && { protection: c.protection }), ...(c.pos2 && { pos2: c.pos2 }),
      status: c.status, ...(c.checkedAt && { checkedAt: c.checkedAt }), deviation: Object.fromEntries(c.deviation),
      ...(c.sealedBy && { sealedBy: c.sealedBy, sealedAt: c.sealedAt }),
      movedIn: rec(c.movedIn, false), movedOut: rec(c.movedOut, false),
      hopperIn: Object.fromEntries(c.movedIn.get('trichter') ?? []), hopperOut: Object.fromEntries(c.movedOut.get('trichter') ?? []),
      ...(c.farm && { farm: c.farm }), yieldIn: Object.fromEntries(c.yieldIn), yieldMinutes: c.yieldMinutes,
      ...(c.seen && { seen: { by: c.seen.by, at: c.seen.at, items: Object.fromEntries(c.seen.items), partial: c.seen.partial } }) };
  }).sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const ownerOf = new Map<string, string[]>(), crewOf = new Map<string, string[]>();
  for (const [id, s] of sections) {
    if (s.owner) { let l = ownerOf.get(s.owner); if (!l) ownerOf.set(s.owner, l = []); l.push(id); }
    for (const m of s.crew) { let l = crewOf.get(m); if (!l) crewOf.set(m, l = []); l.push(id); }
  }
  const order = new Map(ctx.sections.map((s, i) => [s.id, i]));
  const byOrder = (a: string, b: string) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9) || (a < b ? -1 : 1);
  const counts = (id: string, st: SectionTeamStatus[]) => [...sections.values()].filter(s => (s.doneBy === id || s.owner === id || s.crew.includes(id)) && st.includes(s.status)).length;
  const members: TeamMember[] = [...known].map(id => ({
    id, name: nameOf(id), role: roleOf(id), ...(players.has(id) && { player: players.get(id)! }), inProgram: inProgram.has(id),
    sections: (ownerOf.get(id) ?? []).sort(byOrder), crewSections: (crewOf.get(id) ?? []).sort(byOrder), blocks: blocks.get(id) ?? 0, items: Object.fromEntries(items.get(id) ?? []),
    reportedSections: counts(id, ['gemeldet', 'bestaetigt']), confirmedSections: counts(id, ['bestaetigt']), ...(lastActive.has(id) && { lastActive: lastActive.get(id)! }),
    placed: placedBy.get(id) ?? 0, broken: brokenBy.get(id) ?? 0, stored: Object.fromEntries(stored.get(id) ?? []), taken: Object.fromEntries(taken.get(id) ?? []), tally: !tallyOff.has(id),
    ...(away.has(id) && { away: away.get(id)! }),
  })).sort((a, b) => RANK[b.role] - RANK[a.role] || a.name.localeCompare(b.name, 'de'));

  const allSectionIds = [...new Set([...ctx.sections.map(s => s.id), ...sections.keys()])].sort(byOrder);
  const sectionStates: SectionTeamState[] = allSectionIds.map(id => {
    const s = sections.get(id) ?? { status: 'frei' as const, owner: null, crew: [], changes: [], history: [] };
    return { sectionId: id, status: s.status, owner: s.owner, crew: [...s.crew], version: s.changes.length, ...(s.doneBy && { doneBy: s.doneBy }), ...(s.verifiedBy && { verifiedBy: s.verifiedBy }),
      ...(s.note && { note: s.note }), orphan: !sectionIds.has(id), ...(s.offer && { offer: s.offer }), history: s.history,
      placed: sectionTally.get(id)?.placed ?? 0, broken: sectionTally.get(id)?.broken ?? 0, builders: Object.fromEntries(sectionTally.get(id)?.builders ?? []),
      ...(seenSections.has(id) && { seen: seenSections.get(id)! }) };
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
  const bookingList: TeamBooking[] = [...bookings.entries()].map(([id, b]) => ({ id, by: b.by, at: b.at, ...(b.section && { section: b.section }), blocks: b.blocks, items: b.items,
    ...(b.note && { note: b.note }), version: b.changes.length, cancelled: !b.blocks && !b.items.length && b.changes.length > 1, history: b.history }))
    .sort((a, b) => compareEvents({ at: b.at, id: b.id }, { at: a.at, id: a.id }));
  return { members, sections: sectionStates, notes: noteList, gather: [...gather.values()].sort((a, b) => a.item.localeCompare(b.item) || a.member.localeCompare(b.member)),
    gatherVersions: Object.fromEntries([...gatherChanges].map(([item, ch]) => [item, ch.length])), bookings: bookingList,
    delivered, release, releases, rejected, conflicts, unknownKinds, stores, stock, stockSeen, placedBlocks,
    tallySpan: tallyFrom && tallyUntil ? { from: tallyFrom, until: tallyUntil } : null, acknowledged: [...acknowledged], yields, protect };
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
    case 'section.seen': return `Baustand laut Spiel: ${e.placed} von ${e.total} Blöcken${e.total ? ` (${Math.floor(e.placed / e.total * 100)} %)` : ''}`;
    case 'store.seen': return `Kiste im Spiel gesehen (${e.items.length} Sorten)`;
    case 'store.yield': return `Ertrag gemessen (${e.items.reduce((n, l) => n + l.count, 0)} Items in ${e.minutes} min)`;
    case 'section.handover': return 'Übergabe angeboten';
    case 'section.accept': return 'Übergabe angenommen';
    case 'section.decline': return 'Übergabe abgelehnt oder zurückgezogen';
    case 'member.away': return e.until || e.note ? `abwesend${e.until ? ` bis ${e.until}` : ''}` : 'wieder da';
    case 'issue.ack': return `${e.events.length} Hinweis${e.events.length === 1 ? '' : 'e'} erledigt`;
    case 'team.digest': return `Verlauf verdichtet (Teil ${e.part + 1} von ${e.parts}, ${e.covered} Ereignisse)`;
    case 'section.crew': return e.members.length ? `Mitbauer festgelegt (${e.members.length})` : 'Mitbauer entfernt';
    case 'section.join': return 'baut mit';
    case 'section.leave': return e.member && e.member !== e.by ? 'aus dem Abschnitt genommen' : 'aus dem Abschnitt ausgestiegen';
    case 'gather.assign': return e.shares.length ? `Sammelauftrag ${e.item.replace(/^minecraft:/, '')} auf ${e.shares.length} verteilt` : `Sammelauftrag ${e.item.replace(/^minecraft:/, '')} aufgehoben`;
    case 'contribution.fix': return !e.blocks && !e.items?.length ? 'Buchung storniert' : 'Buchung korrigiert';
    case 'team.protect': return `Abschnittsschutz auf dem Server: ${PROTECT_MODE_LABEL[e.mode]}${e.free === 'team' ? ', freie Abschnitte nur fürs Team' : ''}`;
    case 'team.trust': return `bisherigen Teamstand für den Server bestätigt (bis Nr. ${e.upTo})`;
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
    case 'section.handover': return `${who}: Abschnitt${s} an ${names.get(e.member) ?? e.member} übergeben (wartet auf Annahme)${e.note ? ` – ${e.note}` : ''}`;
    case 'section.crew': return `${who}: Mitbauer an${s}: ${e.members.map(m => names.get(m) ?? m).join(', ') || 'keine'}`;
    case 'section.leave': return e.member && e.member !== e.by ? `${who}: ${names.get(e.member) ?? e.member} aus${s} genommen` : `${who}: aus${s} ausgestiegen`;
    case 'gather.assign': return `${who}: Sammelauftrag ${e.item.replace(/^minecraft:/, '')} → ${e.shares.map(l => `${names.get(l.member) ?? l.member} ${l.count}`).join(', ') || 'aufgehoben'}`;
    case 'member.away': return e.member === e.by ? `${who}: ${eventLabel(e)}${e.note ? ` (${e.note})` : ''}` : `${who}: ${names.get(e.member) ?? e.member} ${eventLabel(e)}`;
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
  for (const s of view.sections) if (!s.orphan && (s.owner || s.history.length)) out[s.sectionId] = s.owner ? [s.owner, ...s.crew] : [];
  return out;
}

// ---------------------------------------------------------------- report code (Meldecode)

export const REPORT_CODE_PREFIX = 'BPT1';
export const MAX_REPORT_CODE = 16_384;

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
/**
 * GZip with a cap on the inflated size (P1 Härtung 07.11.2026): the bytes are counted while they come and the
 * stream stops at the first byte over `maxBytes` – a small code or plan cannot unfold into gigabytes.
 */
export async function gunzipCapped(bytes: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  const reader = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new DomainError('LIMIT', `Entpackt größer als ${Math.round(maxBytes / 1_000_000) || 1} MB – abgebrochen.`);
      chunks.push(value);
    }
  } finally { void reader.cancel().catch(() => { /* finished */ }); }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}
/** A report code holds at most a few hundred events; its JSON stays far below this. */
export const MAX_REPORT_CODE_JSON = 1_000_000;
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
  try { parsed = JSON.parse(new TextDecoder().decode(await gunzipCapped(fromB64url(m[2]!), MAX_REPORT_CODE_JSON))); }
  catch (e) { throw new DomainError('CODE', e instanceof DomainError ? `Der Meldecode ist zu groß (${e.message}).` : 'Der Meldecode lässt sich nicht entpacken.'); }
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
  // Local fields never travel: "Ich bin" and the live connection with its key (TEAM_LIVE.md).
  const { self: _self, live: _live, ...shared } = team as TeamState & { live?: unknown };
  return { format: TEAM_PACKAGE_FORMAT, formatVersion: 1, createdAt: new Date().toISOString(), team: shared, from, ...(backup !== undefined && { backup }),
    ...(proposal && { proposal: true }), contentSha256: await packageHash(shared, backup) };
}

export const teamPackageFileName = (team: Pick<TeamState, 'name'>, date = new Date()) =>
  `${team.name.replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'team'}-${date.toISOString().slice(0, 10)}.bauteam.json`;

export async function readTeamPackage(textValue: string): Promise<TeamPackage> {
  let raw: unknown;
  try { raw = JSON.parse(textValue); } catch { throw new DomainError('TEAM_PACKAGE', 'Die Datei ist kein gültiges JSON (abgeschnitten?).'); }
  if (!isObj(raw) || raw.format !== TEAM_PACKAGE_FORMAT) throw new DomainError('TEAM_PACKAGE', 'Das ist kein Teampaket des Build Studios.');
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
  readonly sections: readonly { readonly id: string; readonly name: string; readonly boxes: readonly (readonly [number, number, number, number, number, number])[];
    /** Full need of build items of the section (all steps, first-match rule), largest first (COOP-06, for the store comparison). */
    readonly need?: readonly ItemCount[] }[];
  /** Full need of build items of the whole project, largest first. */
  readonly need?: readonly ItemCount[];
  /** COOP-08: farms of the project for yield stores (purpose ertrag). */
  readonly farms?: readonly { readonly id: string; readonly name: string; readonly items: readonly string[] }[];
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
  /** MAP-07: turn of the world placement (mirror X first, then (x,z) → (−z,x) per quarter turn, like the mod). */
  turns?: number; mirror?: boolean;
  /** Material need per section and in total (teamPlan.sectionNeeds). */
  needs?: { readonly sections: ReadonlyMap<string, readonly ItemCount[]>; readonly total: readonly ItemCount[] };
  /** Farms of the project (production.serverFarms), so yield stores on the server can name their farm (COOP-08). */
  farms?: readonly { readonly id: string; readonly name: string; readonly items: readonly string[] }[];
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
  const turns = (((input.turns ?? 0) % 4) + 4) % 4, mirror = input.mirror === true;
  const turn = (x: number, z: number): [number, number] => { if (mirror) x = -x; for (let i = 0; i < turns; i++) { const k = x; x = -z; z = k; } return [x, z]; };
  const move = (b: readonly number[]) => {
    const [ax, az] = turn(b[0]!, b[2]!), [cx, cz] = turn(b[3]!, b[5]!);
    return [Math.min(ax, cx) + origin[0], b[1]! + origin[1], Math.min(az, cz) + origin[2], Math.max(ax, cx) + origin[0], b[4]! + origin[1], Math.max(az, cz) + origin[2]] as const;
  };
  return {
    format: TEAM_SERVER_FORMAT, formatVersion: 1, teamId: team.teamId, name: team.name, projectName: input.projectName, founder: team.founder,
    createdAt: new Date().toISOString(), dimension: input.dimension,
    sections: input.sections.map(s => ({ id: s.id, name: s.name, boxes: [...(boxes.get(s.id)?.values() ?? [])].map(move),
      ...(input.needs?.sections.get(s.id)?.length && { need: input.needs.sections.get(s.id)! }) })),
    ...(input.needs?.total.length && { need: input.needs.total }),
    ...(input.farms?.length && { farms: input.farms }),
    members: view.members.map(m => ({ id: m.id, name: m.name, ...(m.player && { player: m.player }), role: m.role })),
    events: team.events,
  };
}

/**
 * LINK-11: what of a room header the server plugin needs (plan, sections with boxes and need, place, farms) as one
 * comparable text. Members and events come live; createdAt and the plan snapshot do not count. The Bauleitung's
 * planner puts the header again only when this changes, so the server follows sections and world placement
 * without a release and without a file.
 */
export function headerFingerprint(h: Pick<TeamServerFile, 'teamId' | 'name' | 'projectName' | 'dimension' | 'sections'> & { readonly need?: unknown; readonly farms?: unknown }): string {
  return JSON.stringify([h.teamId, h.name, h.projectName, h.dimension, h.sections, h.need ?? null, h.farms ?? null]);
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
export function programBuilders(site: unknown): { id: string; name: string; player?: string }[] {
  const program = isObj(site) && isObj(site.program) ? site.program : null;
  return program && Array.isArray(program.builders) ? (program.builders as unknown[]).filter(isObj)
    .map(b => ({ id: String(b.id), name: String(b.name), ...(typeof b.player === 'string' && { player: b.player }) })) : [];
}

/**
 * Takes the team into the project planning (PROJ-01, COOP-01-S04): members who only joined the team
 * become builders (same id, so the team log keeps pointing at them), Minecraft names are copied where
 * the builder has none, and every section the team touched gets its current owner as assignment
 * (a free section loses its assignment). Sections the team never touched keep their planning.
 */
type ProgramAbsence = { readonly from: string; readonly to: string; readonly note?: string };
export function teamIntoProgram(program: {
  readonly builders: readonly { readonly id: string; readonly name: string; readonly player?: string; readonly absences?: readonly ProgramAbsence[] }[];
  readonly assignments: Readonly<Record<string, readonly string[]>>;
}, view: TeamView, today?: string): { builders: { id: string; name: string; player?: string; absences?: ProgramAbsence[] }[]; assignments: Record<string, string[]>; added: number; linked: number; assigned: number; absences: number } {
  const builders: { id: string; name: string; player?: string; absences?: ProgramAbsence[] }[] = program.builders.map(({ absences: a, ...b }) => ({ ...b, ...(a && { absences: [...a] }) }));
  let added = 0, linked = 0, assigned = 0, absences = 0;
  for (const m of view.members) {
    if (m.role === 'gast' && !m.sections.length) continue;
    let b = builders.find(x => x.id === m.id);
    if (!b) { builders.push(b = { id: m.id, name: m.name.slice(0, 60), ...(m.player && { player: m.player }) }); added++; }
    else if (m.player && !b.player) { b.player = m.player; linked++; }
    // PROJ-03: „abwesend bis …“ from the team becomes an absence from today in the schedule (once).
    const until = m.away?.until;
    if (today && until && until >= today && !(b.absences ?? []).some(a => a.from <= today && a.to >= until)) {
      const list = [...(b.absences ?? []).filter(a => !(a.from >= today && a.to <= until)), { from: today, to: until, note: (m.away?.note ?? 'laut Team').slice(0, 80) }];
      b.absences = list.sort((x, y) => x.from.localeCompare(y.from)).slice(-24);
      absences++;
    }
  }
  const assignments: Record<string, string[]> = Object.fromEntries(Object.entries(program.assignments).map(([k, v]) => [k, [...v]]));
  for (const [section, owners] of Object.entries(teamAssignments(view))) {
    const before = (assignments[section] ?? []).join();
    if (owners.length) assignments[section] = owners; else delete assignments[section];
    if ((assignments[section] ?? []).join() !== before) assigned++;
  }
  return { builders, assignments, added, linked, assigned, absences };
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
  const self = local.site?.team?.self, live = (local.site?.team as { live?: unknown } | undefined)?.live;
  const site = incoming.site ? { ...incoming.site, team: { ...team, ...(self !== undefined ? { self } : {}), ...(live !== undefined ? { live } : {}) } } : undefined;
  if (site && self === undefined) delete (site.team as { self?: string }).self;
  if (site && live === undefined) delete (site.team as { live?: unknown }).live;
  return { ...incoming, id: local.id, revision: local.revision, createdAt: local.createdAt,
    progress: { ...incoming.progress, ...local.progress }, ...(site && { site }) };
}

/** Members a merge would add to the plan's builder list (joined through the team log only). */
export function joinedOnly(view: TeamView): TeamMember[] { return view.members.filter(m => !m.inProgram); }

/**
 * COOP-10: where a player stands relative to the plan, from the world boxes of the server file (teamServerFile).
 * Returns the section that contains the position (smallest box wins when boxes overlap) or, outside all, the
 * nearest section with its distance in blocks; null without boxes or in another dimension.
 */
export function whereInPlan(sections: TeamServerFile['sections'], dimension: string, pos: { readonly x: number; readonly y: number; readonly z: number; readonly dim?: string }):
  { readonly section: string; readonly inside: boolean; readonly distance: number } | null {
  if ((pos.dim ?? 'minecraft:overworld') !== dimension) return null;
  let best: { section: string; inside: boolean; distance: number; volume: number } | null = null;
  for (const s of sections) for (const b of s.boxes) {
    const d = Math.hypot(Math.max(b[0] - pos.x, 0, pos.x - b[3]), Math.max(b[1] - pos.y, 0, pos.y - b[4]), Math.max(b[2] - pos.z, 0, pos.z - b[5]));
    const volume = (b[3] - b[0] + 1) * (b[4] - b[1] + 1) * (b[5] - b[2] + 1);
    if (!best || d < best.distance || (d === best.distance && volume < best.volume)) best = { section: s.id, inside: d === 0, distance: Math.round(d), volume };
  }
  return best && { section: best.section, inside: best.inside, distance: best.distance };
}
