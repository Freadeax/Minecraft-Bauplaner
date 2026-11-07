import { smeltsPerFuel } from '../../../voxel/src/profile.js';
import type { PaceSetting } from '../building/buildRun.js';
import { computeMaterials, stackSizeOf } from './materials.js';
import type { VoxelPayload } from '../../../voxel/src/types.js';
import { FARM_TYPES, farmType, flowFor, productionOf } from './production.js';
import type { Dimension, FarmEntry, FarmPlace, FarmType, ProductionPlan } from './production.js';
import type { ScheduledSection } from '../planning/program.js';
import { fuelBalance, resolveRecipes } from './recipes.js';
import { gatherRuleFor } from '../building/site.js';
import type { GatherLine, SiteOverview, SitePlan } from '../building/site.js';
import { effectiveEvents, isKnownEvent } from '../team/team.js';
import type { DigestBody, TeamEvent, TeamState } from '../team/team.js';
import type { WorldItem } from '../world/worldPlan.js';

/**
 * Production analysis (PROD-02 … PROD-04). Pure functions over the site
 * overview (gathering plan of the open steps, B14), the production record
 * (production.ts) and optional inputs from other modules (farm build costs
 * from the catalogue, the schedule of the build program, world plan points,
 * builders). Nothing here counts material a second way: demand is exactly the
 * `missing` of the gathering plan, which already subtracts the stock.
 *
 * Model (all assumptions are shown in `notes`):
 *  - automatic farms (mode auto) run while the player is near them: during
 *    the daily gathering hours and – if the AFK spot reaches them – during
 *    the AFK hours;
 *  - semi-automatic farms (mode halb) and hand gathering share ONE queue of
 *    player hours per day; a running semi-automatic farm raises the hand rate
 *    of its items;
 *  - a play day = one building day of the program (PROJ-01).
 */

export const HOPPER_ITEMS_PER_HOUR = 9000; // 2.5 items per second
export const BUILD_BLOCKS_PER_HOUR = 500; // Richtwert for building a farm by hand
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const mc = (id: string): string => id.includes(':') ? id : `minecraft:${id}`;
const de = (n: number): string => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
/** Suggestions that save less player time than this are noise for a small demand. */
export const MIN_SAVED_HOURS = 1;

// ---------------------------------------------------------------------------
// Ranges and the AFK spot

export interface RangeCheck { readonly ok: boolean; readonly reason: string }

const chunkDist = (a: Pick<FarmPlace, 'x' | 'z'>, b: Pick<FarmPlace, 'x' | 'z'>): number =>
  Math.max(Math.abs(Math.floor(a.x / 16) - Math.floor(b.x / 16)), Math.abs(Math.floor(a.z / 16) - Math.floor(b.z / 16)));
const horiz = (a: FarmPlace, b: FarmPlace): number => Math.hypot(a.x - b.x, a.z - b.z);
const dist3 = (a: FarmPlace, b: FarmPlace): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Whether a farm of `type` at `at` keeps running while the player stands at `spot`. */
export function inRange(type: FarmType, at: FarmPlace, spot: FarmPlace, simulationDistance: number): RangeCheck {
  if (at.dimension !== spot.dimension) return { ok: false, reason: `andere Dimension (${at.dimension})` };
  const chunks = chunkDist(at, spot);
  if (chunks > simulationDistance) return { ok: false, reason: `${chunks} Chunks entfernt, Simulationsdistanz ${simulationDistance}` };
  if (type.range === 'zufall') {
    const d = horiz(at, spot);
    return d <= 128 ? { ok: true, reason: `${Math.round(d)} Blöcke` } : { ok: false, reason: `${Math.round(d)} Blöcke – Zufallsticks nur bis 128` };
  }
  if (type.range === 'mob') {
    const d = dist3(at, spot);
    if (d < 24) return { ok: false, reason: `${Math.round(d)} Blöcke – zu nah, Mobs spawnen erst ab 24` };
    return d <= 128 ? { ok: true, reason: `${Math.round(d)} Blöcke` } : { ok: false, reason: `${Math.round(d)} Blöcke – Mobs verschwinden ab 128` };
  }
  return { ok: true, reason: `${chunks} Chunks` };
}

export interface AfkSpot {
  readonly spot: FarmPlace;
  readonly covered: readonly string[];
  readonly missed: readonly { readonly farmId: string; readonly reason: string }[];
  /** Items per hour of the covered farms (all outputs). */
  readonly itemsPerHour: number;
}

const farmsWithPlace = (p: ProductionPlan): { farm: FarmEntry; type: FarmType; at: FarmPlace }[] =>
  p.farms.filter(f => f.state !== 'aus' && f.at).map(f => ({ farm: f, type: farmType(f.type)!, at: f.at! })).filter(f => f.type.mode === 'auto');

const farmPerHour = (f: FarmEntry, t: FarmType): number => t.outputs.reduce((n, o) => n + o.perHour * f.units, 0);

/** Coverage of all automatic farms with a place from one spot. */
export function afkCoverage(production: ProductionPlan, spot: FarmPlace): AfkSpot {
  const covered: string[] = [], missed: { farmId: string; reason: string }[] = [];
  let itemsPerHour = 0;
  for (const { farm, type, at } of farmsWithPlace(production)) {
    const r = inRange(type, at, spot, production.simulationDistance);
    if (r.ok) { covered.push(farm.id); itemsPerHour += farmPerHour(farm, type); } else missed.push({ farmId: farm.id, reason: r.reason });
  }
  return { spot, covered, missed, itemsPerHour: Math.round(itemsPerHour) };
}

/**
 * Best AFK spot for the automatic farms with a known place: candidates are
 * the farms, the midpoints of every pair, the centre of each dimension and
 * 32 blocks above every mob farm (mob farms need distance). Most covered
 * farms win, then most items per hour, then the candidate closest to the centre.
 */
export function bestAfkSpot(production: ProductionPlan): AfkSpot | null {
  const farms = farmsWithPlace(production);
  if (!farms.length) return null;
  const candidates: FarmPlace[] = [];
  for (const dim of new Set<Dimension>(farms.map(f => f.at.dimension))) {
    const own = farms.filter(f => f.at.dimension === dim);
    const c = { x: 0, y: 0, z: 0 };
    for (const f of own) { c.x += f.at.x; c.y += f.at.y; c.z += f.at.z; }
    candidates.push({ x: Math.round(c.x / own.length), y: Math.round(c.y / own.length), z: Math.round(c.z / own.length), dimension: dim });
    for (const [i, a] of own.entries()) {
      candidates.push(a.at);
      if (a.type.range === 'mob') candidates.push({ ...a.at, y: Math.min(2048, a.at.y + 32) });
      for (const b of own.slice(i + 1)) candidates.push({ x: Math.round((a.at.x + b.at.x) / 2), y: Math.round((a.at.y + b.at.y) / 2) + (a.type.range === 'mob' || b.type.range === 'mob' ? 24 : 0), z: Math.round((a.at.z + b.at.z) / 2), dimension: dim });
    }
  }
  let best: AfkSpot | null = null, bestCentre = Infinity;
  for (const spot of candidates) {
    const cov = afkCoverage(production, spot);
    const own = farms.filter(f => f.at.dimension === spot.dimension);
    const centre = own.reduce((n, f) => n + horiz(f.at, spot), 0);
    if (!best || cov.covered.length > best.covered.length || (cov.covered.length === best.covered.length && (cov.itemsPerHour > best.itemsPerHour || (cov.itemsPerHour === best.itemsPerHour && centre < bestCentre)))) {
      best = cov; bestCentre = centre;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Farm rates

export interface FarmRate {
  readonly itemId: string;
  /** Items per hour for the whole farm (all units). */
  readonly perHour: number;
  /** Lagerkiste = hopper bookings of the linked team chest (server), gemessen = harvest log, Richtwert = farm type. */
  readonly source: 'Lagerkiste' | 'gemessen' | 'Richtwert';
  /** Logged hours behind a measured rate. */
  readonly measuredHours: number;
  /** Items per play day (auto: loaded hours; halb: 0, they use player hours). */
  readonly perDay: number;
  readonly covers: readonly string[];
}

export interface FarmStatus {
  readonly farm: FarmEntry;
  readonly type: FarmType;
  readonly running: boolean;
  /** Loaded hours per day (auto farms). */
  readonly loadedHoursPerDay: number;
  /** null = no place or no AFK spot known (assumed reachable). */
  readonly afk: RangeCheck | null;
  readonly rates: readonly FarmRate[];
  readonly inputs: readonly { readonly itemId: string; readonly perDay: number; readonly suppliedPerDay: number }[];
  readonly logistics: FarmLogistics | null;
  readonly issues: readonly string[];
  /** Hopper output of the linked team chest (PROD-05); null = no chest linked. */
  readonly chest: ChestYield | null;
}

export interface FarmLogistics {
  readonly itemsPerHour: number;
  readonly hoppers: number;
  readonly slotsPerHour: number;
  /** Hours until a single / double chest is full when nobody empties it. */
  readonly chestHours: number;
  readonly doubleChestHours: number;
  readonly fullWithinDay: boolean;
}

function measured(p: ProductionPlan, farmId: string, itemId: string): { count: number; hours: number } {
  let count = 0, hours = 0;
  for (const h of p.log) if (h.farmId === farmId && h.itemId === itemId) { count += h.count; hours += h.hours; }
  return { count, hours };
}

// ---------------------------------------------------------------------------
// Team storage chests as farm output (PROD-05)

/** A hopper booking that comes more than this after the previous one starts a new running period (chunk was unloaded). */
export const CHEST_GAP_MINUTES = 5;
/**
 * Yield reports of the server (store.yield) carry the minutes the farm really ran: like /bauplaner lager info, the
 * planner uses their rate from 10 minutes on (LAGER-10). Rates estimated from hopper bookings need an hour.
 */
export const SERVER_YIELD_MIN_MINUTES = 10;
const chestMinMinutes = (y: { readonly basis: 'server' | 'trichter' }): number => y.basis === 'server' ? SERVER_YIELD_MIN_MINUTES - 0.5 : 60;
const MINUTE = 60_000;

export interface TeamChest { readonly id: string; readonly name: string; readonly pos: readonly [number, number, number]; readonly dimension: string; readonly hopperIn: Readonly<Record<string, number>>;
  /** Farm id the server assigned to this yield store (store.config.farm, COOP-08). */
  readonly farm?: string }

/** Team storage chests (not removed) with everything hoppers put in (store.move via trichter, store.yield), from the team log. */
export function teamChests(team: TeamState | undefined): TeamChest[] {
  if (!team) return [];
  const chests = new Map<string, { name: string; pos: readonly [number, number, number]; dimension: string; hopperIn: Record<string, number>; farm?: string }>();
  for (const e of effectiveEvents(team)) {
    // COOP-11: hopper intake up to the cutoff of a digest.
    for (const r of digestOf(e)?.chests ?? []) { const c = chests.get(r.chest); if (c) for (const mv of r.moves ?? []) if (mv.who === 'trichter') for (const l of mv.in ?? []) c.hopperIn[l.item] = (c.hopperIn[l.item] ?? 0) + l.count; }
    if (!isKnownEvent(e)) continue;
    if (e.kind === 'store.chest') { if (e.remove) chests.delete(e.chest); else { const old = chests.get(e.chest); chests.set(e.chest, { name: e.name, pos: e.pos, dimension: e.dimension, hopperIn: old?.hopperIn ?? {}, ...(old?.farm && { farm: old.farm }) }); } }
    else if (e.kind === 'store.config') {
      const c = chests.get(e.chest);
      if (c && e.name?.trim()) c.name = e.name;
      if (c && e.farm !== undefined) { if (e.farm) c.farm = e.farm; else delete c.farm; }
    }
    else if (e.kind === 'store.move' && e.via === 'trichter') { const c = chests.get(e.chest); if (c) for (const l of e.in ?? []) c.hopperIn[l.item] = (c.hopperIn[l.item] ?? 0) + l.count; }
  }
  // The plugin's yield reports (store.yield) count as hopper intake too.
  for (const y of yieldEvents(team)) { const c = chests.get(y.chest); if (c) for (const l of y.items) c.hopperIn[l.item] = (c.hopperIn[l.item] ?? 0) + l.count; }
  return [...chests.entries()].map(([id, c]) => ({ id, ...c }));
}

export interface ChestYield {
  readonly chest: string;
  /** Items put into the chest, by item. */
  readonly items: Readonly<Record<string, number>>;
  /** Running hours: loaded minutes reported by the server (store.yield), or estimated from hopper bookings. */
  readonly hours: number;
  readonly bookings: number;
  readonly from: string | null;
  readonly until: string | null;
  /** server = store.yield reports with real loaded minutes; trichter = estimated from hopper bookings (older plugins). */
  readonly basis: 'server' | 'trichter';
}

interface YieldEvent { chest: string; farm?: string; items: { item: string; count: number }[]; from: string; until: string; minutes: number }
/** The digest part an event is, when it is one of the digest in force (effectiveEvents keeps only those). */
const digestOf = (e: TeamEvent): DigestBody | null => e.kind === 'team.digest' ? e as unknown as DigestBody : null;
/** store.yield (server only, plugin COOP-05 follow-up): read loosely so older and newer planners keep working. */
function yieldEvents(team: TeamState | undefined): YieldEvent[] {
  const out: YieldEvent[] = [];
  for (const raw of team ? effectiveEvents(team) : []) {
    for (const y of digestOf(raw)?.yields ?? []) out.push({ chest: y.chest, ...(y.farm && { farm: y.farm }), items: [...y.items], from: y.from, until: y.until, minutes: y.minutes });
    if (raw.kind !== 'store.yield') continue;
    const e = raw as unknown as Record<string, unknown>;
    if (typeof e.chest !== 'string' || !Array.isArray(e.items) || typeof e.minutes !== 'number' || !Number.isFinite(e.minutes) || e.minutes < 0) continue;
    const items = (e.items as unknown[]).filter((l): l is { item: string; count: number } => typeof l === 'object' && l !== null && typeof (l as { item?: unknown }).item === 'string' && typeof (l as { count?: unknown }).count === 'number');
    out.push({ chest: e.chest, ...(typeof e.farm === 'string' && { farm: e.farm }), items, from: String(e.from ?? raw.at), until: String(e.until ?? raw.at), minutes: e.minutes });
  }
  return out;
}

/**
 * Output of a farm read from the team storage: preferably the plugin's
 * store.yield reports (items put in and the minutes the chest's chunk was
 * really loaded), matched by farm id or chest; otherwise hopper bookings
 * (`store.move` via trichter, booked every second while the chunk runs) with
 * gaps up to CHEST_GAP_MINUTES counted as running time.
 */
export function chestYield(team: TeamState | undefined, chest: string | null, farmId?: string): ChestYield {
  const reports = yieldEvents(team).filter(y => (farmId && y.farm === farmId) || (chest && y.chest === chest));
  if (reports.length) {
    const items: Record<string, number> = {};
    let minutes = 0;
    for (const y of reports) { minutes += y.minutes; for (const l of y.items) items[mc(l.item)] = (items[mc(l.item)] ?? 0) + l.count; }
    const from = reports.map(y => y.from).sort()[0]!, until = reports.map(y => y.until).sort().at(-1)!;
    // Unrounded: the rate divides by it (10 min → 0.1667 h, not 0.17 h).
    return { chest: chest ?? reports[0]!.chest, items, hours: minutes / 60, bookings: reports.length, from, until, basis: 'server' };
  }
  const items: Record<string, number> = {};
  const times: number[] = [];
  // COOP-11: running time and intake up to the cutoff of a digest.
  let digestMs = 0, digestBookings = 0, digestFrom: string | null = null, digestUntil: string | null = null;
  const events = team ? effectiveEvents(team) : [];
  for (const e of events) for (const r of digestOf(e)?.chests ?? []) {
    if (r.chest !== chest) continue;
    for (const mv of r.moves ?? []) if (mv.who === 'trichter') for (const l of mv.in ?? []) items[l.item] = (items[l.item] ?? 0) + l.count;
    if (r.hopper) {
      digestMs += r.hopper.seconds * 1000; digestBookings += r.hopper.bookings;
      if (!digestFrom || r.hopper.from < digestFrom) digestFrom = r.hopper.from;
      if (!digestUntil || r.hopper.until > digestUntil) digestUntil = r.hopper.until;
    }
  }
  for (const e of events) {
    if (!isKnownEvent(e) || e.kind !== 'store.move' || e.via !== 'trichter' || e.chest !== chest || !e.in?.length) continue;
    const t = Date.parse(e.at);
    if (!Number.isFinite(t)) continue;
    times.push(t);
    for (const l of e.in) items[l.item] = (items[l.item] ?? 0) + l.count;
  }
  times.sort((a, b) => a - b);
  let ms = (times.length ? 1000 : 0) + digestMs;
  for (let i = 1; i < times.length; i++) { const gap = times[i]! - times[i - 1]!; ms += gap <= CHEST_GAP_MINUTES * MINUTE ? gap : 1000; }
  const from = digestFrom ?? (times.length ? new Date(times[0]!).toISOString() : null);
  const until = times.length ? new Date(times[times.length - 1]!).toISOString() : digestUntil;
  return { chest: chest ?? '', items, hours: round2(ms / 3_600_000), bookings: times.length + digestBookings, from, until, basis: 'trichter' };
}

export interface ChestSuggestion { readonly farmId: string; readonly chest: TeamChest; readonly why: string; readonly score: number }

/** Team chests that look like a farm's collection chest: hoppers brought its outputs in, or it stands next to the farm. */
export function suggestChests(production: ProductionPlan, team: TeamState | undefined): ChestSuggestion[] {
  const chests = teamChests(team), taken = new Set(production.farms.map(f => f.chest).filter(Boolean));
  const out: ChestSuggestion[] = [];
  for (const f of production.farms) {
    if (f.chest) continue;
    const t = farmType(f.type);
    if (!t) continue;
    let best: ChestSuggestion | null = null;
    for (const c of chests) {
      if (taken.has(c.id) || (c.farm && c.farm !== f.id)) continue;
      if (c.farm === f.id) { best = { farmId: f.id, chest: c, why: 'auf dem Server dieser Farm zugeordnet', score: 100 }; break; }
      const own = t.outputs.filter(o => (c.hopperIn[o.item] ?? 0) > 0).map(o => o.item.replace(/^minecraft:/, ''));
      const near = f.at && dimensionOf(c.dimension) === f.at.dimension ? Math.hypot(c.pos[0] - f.at.x, c.pos[1] - f.at.y, c.pos[2] - f.at.z) : Infinity;
      const score = own.length * 10 + (near <= 32 ? 5 : 0);
      if (!score) continue;
      const why = [own.length ? `Trichter liefern ${own.join(', ')}` : '', near <= 32 ? `${Math.round(near)} Blöcke von der Farm` : ''].filter(Boolean).join(' · ');
      if (!best || score > best.score) best = { farmId: f.id, chest: c, why, score };
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.score - a.score);
}

export function farmStatuses(production: ProductionPlan, team?: TeamState): FarmStatus[] {
  const p = production;
  const loaded = (f: FarmEntry, t: FarmType): { hours: number; afk: RangeCheck | null } => {
    if (t.mode !== 'auto') return { hours: 0, afk: null };
    const afk = f.at && p.afk ? inRange(t, f.at, p.afk, p.simulationDistance) : null;
    return { hours: p.gatherHoursPerDay + (afk && !afk.ok ? 0 : p.afkHoursPerDay), afk };
  };
  const serverChest = new Map(teamChests(team).filter(c => c.farm).map(c => [c.farm!, c.id]));
  const base = p.farms.map(f => {
    const t = farmType(f.type)!, { hours, afk } = loaded(f, t), running = f.state === 'laeuft';
    // A chest linked here, else the yield store the server assigned to this farm (store.config.farm).
    const chestId = f.chest ?? serverChest.get(f.id) ?? null;
    const linked = chestYield(team, chestId, f.id);
    const fromChest = chestId || linked.bookings ? linked : null, useChest = !!fromChest && fromChest.hours * 60 >= chestMinMinutes(fromChest);
    const rates: FarmRate[] = t.outputs.map(o => {
      const m = measured(p, f.id, o.item), useMeasured = m.hours >= 1;
      const perHour = useChest ? round1((fromChest!.items[o.item] ?? 0) / fromChest!.hours) : useMeasured ? round1(m.count / m.hours) : o.perHour * f.units;
      const source: FarmRate['source'] = useChest ? 'Lagerkiste' : useMeasured ? 'gemessen' : 'Richtwert';
      return { itemId: o.item, perHour, source, measuredHours: useChest ? round1(fromChest!.hours) : round1(m.hours), perDay: running ? round1(perHour * hours) : 0, covers: o.covers ?? [] };
    });
    return { farm: f, type: t, running, hours, afk, rates, fromChest };
  });
  const supply = new Map<string, number>();
  for (const b of base) for (const r of b.rates) supply.set(r.itemId, (supply.get(r.itemId) ?? 0) + r.perDay);
  return base.map(b => {
    const issues: string[] = [];
    const inputs = (b.type.inputs ?? []).map(i => {
      const perDay = b.running ? round1(i.perHour * b.farm.units * (b.type.mode === 'auto' ? b.hours : p.gatherHoursPerDay)) : 0;
      return { itemId: i.item, perDay, suppliedPerDay: round1(supply.get(i.item) ?? 0) };
    });
    for (const i of inputs) if (i.perDay > 0 && i.suppliedPerDay < i.perDay) issues.push(`Braucht ${Math.round(i.perDay)} ${i.itemId.replace(/^minecraft:/, '')}/Tag, Farmen liefern ${Math.round(i.suppliedPerDay)}.`);
    if (b.farm.chest && !teamChests(team).some(c => c.id === b.farm.chest)) issues.push('Die verknüpfte Sammeltruhe gibt es im Team-Lager nicht mehr.');
    else if (b.fromChest && b.fromChest.hours * 60 < chestMinMinutes(b.fromChest)) issues.push(`Sammeltruhe: erst ${de(b.fromChest.hours * 60)} min Laufzeit gemeldet – ab ${b.fromChest.basis === 'server' ? `${SERVER_YIELD_MIN_MINUTES} min` : '1 h'} rechnet der Planer mit ihr.`);
    if (b.afk && !b.afk.ok && p.afkHoursPerDay > 0) issues.push(`Vom AFK-Platz nicht erreicht: ${b.afk.reason}.`);
    else if (!b.afk && b.type.mode === 'auto' && b.running && p.afkHoursPerDay > 0) issues.push(`AFK-Zeit angenommen, Reichweite ungeprüft: ${b.farm.at ? 'kein AFK-Platz gesetzt' : 'Ort der Farm fehlt'}.`);
    if (b.type.mode === 'auto' && b.running && b.hours === 0) issues.push('Läuft nur, wenn ein Spieler in der Nähe ist – Sammel- und AFK-Zeit sind 0.');
    let logistics: FarmLogistics | null = null;
    if (b.type.mode === 'auto') {
      const itemsPerHour = b.rates.reduce((n, r) => n + r.perHour, 0), slotsPerHour = b.rates.reduce((n, r) => n + r.perHour / stackSizeOf(r.itemId), 0);
      const chestHours = slotsPerHour ? round1(27 / slotsPerHour) : Infinity, doubleChestHours = slotsPerHour ? round1(54 / slotsPerHour) : Infinity;
      logistics = { itemsPerHour: Math.round(itemsPerHour), hoppers: Math.max(1, Math.ceil(itemsPerHour / HOPPER_ITEMS_PER_HOUR)), slotsPerHour: round2(slotsPerHour), chestHours, doubleChestHours,
        fullWithinDay: b.running && doubleChestHours < b.hours };
      if (logistics.fullWithinDay) issues.push(`Doppeltruhe ist nach ${de(doubleChestHours)} h voll – öfter leeren oder Lager/Sortieranlage anschließen.`);
      if (logistics.hoppers > 1) issues.push(`Mehr als ein Trichter Durchsatz: ${logistics.hoppers} parallele Trichterstränge nötig.`);
    }
    return { farm: b.farm, type: b.type, running: b.running, loadedHoursPerDay: b.hours, afk: b.afk, rates: b.rates, inputs, logistics, issues, chest: b.fromChest };
  });
}

// ---------------------------------------------------------------------------
// Coverage of the gathering plan

export type CoverWay = 'farm' | 'hand' | 'offen';
export const COVER_WAY_LABEL: Readonly<Record<CoverWay, string>> = { farm: 'Farm', hand: 'Handarbeit', offen: 'ohne Richtwert' };

export interface CoverageLine {
  readonly itemId: string;
  readonly missing: number;
  readonly kind: GatherLine['kind'];
  /** Items per play day from running automatic farms. */
  readonly autoPerDay: number;
  /** Items per player hour: best of hand gathering and running semi-automatic farms; null = unknown. */
  readonly handRate: number | null;
  readonly handBy: 'Richtwert' | 'Farm' | null;
  readonly farmDays: number | null;
  readonly handHours: number | null;
  readonly way: CoverWay;
  /** Play days until this item is covered on the chosen way (hand items wait in the shared queue). */
  readonly days: number | null;
  readonly farmIds: readonly string[];
  readonly dimension?: string;
  readonly activity: string;
}

export interface SectionReadiness {
  readonly id: string;
  readonly name: string;
  readonly complete: boolean;
  /** Play days from today until the material of this section (and all before) is there; null = contains items without rate. */
  readonly readyDay: number | null;
  readonly bottleneck: string | null;
  readonly handHours: number;
  readonly unknown: readonly string[];
  /** Building day the program schedules this section to start (PROJ-01); null = no program. */
  readonly start: number | null;
  readonly startDate: string | null;
  readonly late: boolean;
}

export interface FarmCost { readonly blocks: number; readonly gatherHours: number }

/** Build cost of a farm building: placed blocks and the hand-gathering hours of its raw materials (Richtwerte). */
export function farmCostOf(world: VoxelPayload): FarmCost {
  const report = computeMaterials(world);
  const raw = report.items.length ? resolveRecipes(report.items.map(i => ({ itemId: i.itemId, count: i.count }))).base : [];
  let hours = 0;
  for (const b of raw) { const r = b.kind === 'raw' ? gatherRuleFor(b.itemId) : null; if (r?.perHour) hours += b.count / r.perHour; }
  return { blocks: report.placed.blocks, gatherHours: round1(hours) };
}

export type Verdict = 'lohnt' | 'knapp' | 'lohnt nicht' | 'planbar' | 'unbekannt';
export interface FarmSuggestion {
  readonly type: FarmType;
  readonly items: readonly { readonly itemId: string; readonly missing: number; readonly savedHours: number | null; readonly daysWithOne: number | null }[];
  /** Units so that the farm covers its slowest demanded item within TARGET_DAYS. */
  readonly units: number;
  readonly savedHours: number | null;
  readonly buildHours: number | null;
  /** Where the build hours come from: counted from the catalogue building, or the type's Richtwert. */
  readonly costSource: 'Bauplan' | 'Richtwert' | null;
  readonly verdict: Verdict;
  readonly planned: boolean;
  /** Player hours the farm saves per built hour; null when unknown. */
  readonly ratio: number | null;
}
export const SUGGESTION_TARGET_DAYS = 7;

export interface FurnacePlan {
  readonly smelts: number;
  readonly ticks: number;
  /** Hours one furnace needs for all smelts. */
  readonly furnaceHours: number;
  readonly furnacesFor: readonly { readonly hours: number; readonly furnaces: number }[];
  readonly fuel: readonly { readonly itemId: string; readonly count: number }[];
  /** Smelts per play day from fuel farms that are running, net of the fuel needed to make the fuel. */
  readonly farmFuelSmeltsPerDay: number;
  readonly farmFuelDays: number | null;
  readonly fuelFarms: readonly { readonly farmId: string; readonly itemId: string; readonly smeltsPerDay: number }[];
}

export interface StorageLine {
  readonly id: string;
  readonly name: string;
  readonly slots: number;
  readonly doubleChests: number;
  readonly shulkers: number;
  /** Building days to carry it at the pace's shulker boxes per day. */
  readonly trips: number;
}

export interface ProductionReport {
  readonly farms: readonly FarmStatus[];
  readonly coverage: readonly CoverageLine[];
  readonly sections: readonly SectionReadiness[];
  readonly suggestions: readonly FarmSuggestion[];
  readonly furnaces: FurnacePlan;
  readonly storage: readonly StorageLine[];
  /** Distinct items of running automatic farms (sorter modules needed for one storage). */
  readonly sorterItems: readonly string[];
  readonly totals: {
    readonly missing: number;
    readonly running: number;
    readonly farmPerDay: number;
    readonly handHours: number;
    readonly handDays: number | null;
    readonly farmDays: number;
    /** Play days until everything is gathered on the chosen ways; null = some item has no rate. */
    readonly readyDays: number | null;
    readonly bottleneck: { readonly itemId: string; readonly why: string } | null;
    readonly unknown: number;
    readonly late: number;
  };
  readonly afk: AfkSpot | null;
  readonly bestAfk: AfkSpot | null;
  readonly notes: readonly string[];
}

export interface ProductionInput {
  readonly site: SitePlan;
  readonly overview: SiteOverview;
  readonly pace: PaceSetting;
  /** Build cost of catalogue farm buildings by building id (caller computes it from the library). */
  readonly farmCosts?: ReadonlyMap<string, FarmCost>;
  /** Schedule of the build program (planProgram) to compare readiness with the start of each section. */
  readonly schedule?: readonly Pick<ScheduledSection, 'id' | 'start' | 'startDate' | 'state'>[];
}

/** Net smelts one item of a fuel farm's output gives (dried kelp needs smelting itself: 9 kelp → 1 block = 20, minus 9). */
export function netFuelSmelts(itemId: string): number {
  const id = mc(itemId);
  if (id === 'minecraft:kelp') return round2((smeltsPerFuel('minecraft:dried_kelp_block') - 9) / 9);
  return smeltsPerFuel(id);
}

/** The whole analysis. */
export function analyzeProduction(input: ProductionInput): ProductionReport {
  const p = productionOf(input.site), farms = farmStatuses(p, input.site.team), perDayGather = p.gatherHoursPerDay;
  // Demand: missing of the gathering plan per item, in build order.
  const demand = new Map<string, { missing: number; kind: GatherLine['kind']; line: GatherLine }>();
  for (const s of input.overview.sections) for (const g of s.gather) if (g.missing > 0) {
    const d = demand.get(g.itemId);
    if (d) d.missing += g.missing; else demand.set(g.itemId, { missing: g.missing, kind: g.kind, line: g });
  }
  const supplyOf = (itemId: string): { autoPerDay: number; halbRate: number; farmIds: string[] } => {
    let autoPerDay = 0, halbRate = 0;
    const farmIds: string[] = [];
    for (const f of farms) if (f.running) for (const r of f.rates) if (r.itemId === itemId || r.covers.includes(itemId)) {
      farmIds.push(f.farm.id);
      if (f.type.mode === 'auto') autoPerDay += r.perDay; else halbRate += r.perHour;
    }
    return { autoPerDay: round1(autoPerDay), halbRate, farmIds };
  };

  type Draft = Omit<CoverageLine, 'way' | 'days'> & { way: CoverWay };
  const drafts: Draft[] = [...demand.entries()].map(([itemId, d]) => {
    const s = supplyOf(itemId), rule = d.kind === 'unknown' ? null : gatherRuleFor(itemId);
    const handFromRule = rule?.perHour ?? null;
    const handRate = s.halbRate > (handFromRule ?? 0) ? s.halbRate : handFromRule;
    const handBy = handRate === null ? null : s.halbRate > (handFromRule ?? 0) ? 'Farm' as const : 'Richtwert' as const;
    const farmDays = s.autoPerDay > 0 ? round2(d.missing / s.autoPerDay) : null;
    const handHours = handRate ? round1(d.missing / handRate) : null;
    const way: CoverWay = farmDays !== null ? 'farm' : handHours !== null ? 'hand' : 'offen';
    return { itemId, missing: d.missing, kind: d.kind, autoPerDay: s.autoPerDay, handRate, handBy, farmDays, handHours, way, farmIds: s.farmIds,
      ...(rule?.dimension && { dimension: rule.dimension }), activity: d.line.rule?.activity ?? rule?.activity ?? (d.kind === 'unknown' ? 'unbekannt' : '–') };
  });
  // Greedy balance: move the slowest farm item to hand while that shortens the whole plan.
  const queueDays = (): number => perDayGather > 0 ? drafts.filter(d => d.way === 'hand').reduce((n, d) => n + d.handHours!, 0) / perDayGather : (drafts.some(d => d.way === 'hand') ? Infinity : 0);
  const farmMax = (): Draft | null => drafts.filter(d => d.way === 'farm').sort((a, b) => b.farmDays! - a.farmDays!)[0] ?? null;
  for (let guard = 0; guard < drafts.length; guard++) {
    const slow = farmMax();
    if (!slow || slow.handHours === null) break;
    const before = Math.max(queueDays(), slow.farmDays!);
    slow.way = 'hand';
    const nextFarm = farmMax(), after = Math.max(queueDays(), nextFarm?.farmDays ?? 0);
    if (after >= before) { slow.way = 'farm'; break; }
  }
  // Days on the chosen way; hand items in order of the plan (largest first is how people gather – keep plan order: by missing).
  let queue = 0;
  const handOrder = new Map<string, number>();
  for (const d of [...drafts].filter(d => d.way === 'hand').sort((a, b) => b.missing - a.missing)) { queue += d.missing / d.handRate!; handOrder.set(d.itemId, queue); }
  const coverage: CoverageLine[] = drafts.map(d => ({
    ...d, days: d.way === 'farm' ? d.farmDays : d.way === 'hand' ? (perDayGather > 0 ? round1(handOrder.get(d.itemId)! / perDayGather) : null) : null,
  })).sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity) || b.missing - a.missing);

  const way = new Map(coverage.map(c => [c.itemId, c]));
  const exactHand = coverage.filter(c => c.way === 'hand').reduce((n, c) => n + c.missing / c.handRate!, 0);
  const handHours = round1(exactHand);
  const handDays = perDayGather > 0 ? round1(exactHand / perDayGather) : (exactHand > 0 ? null : 0);
  const slowestFarm = coverage.filter(c => c.way === 'farm').sort((a, b) => b.farmDays! - a.farmDays!)[0];
  const farmDays = round1(slowestFarm?.farmDays ?? 0);
  const unknownLines = coverage.filter(c => c.way === 'offen');
  const readyDays = unknownLines.length || handDays === null ? null : round1(Math.max(handDays, farmDays));
  let bottleneck: ProductionReport['totals']['bottleneck'] = null;
  if (handDays === null) bottleneck = { itemId: coverage.find(c => c.way === 'hand')?.itemId ?? '', why: 'Keine Sammelzeit je Tag eingestellt.' };
  else if (slowestFarm && farmDays > handDays) bottleneck = { itemId: slowestFarm.itemId, why: `Farm liefert ${de(slowestFarm.autoPerDay)}/Tag – braucht ${de(farmDays)} Tage.` };
  else {
    const big = coverage.filter(c => c.way === 'hand').sort((a, b) => b.handHours! - a.handHours!)[0];
    if (big) bottleneck = { itemId: big.itemId, why: `${de(big.handHours!)} h Handarbeit von ${de(handHours)} h insgesamt.` };
  }

  // Readiness per section, in build order (the gathering plan already consumed stock in that order).
  const schedule = new Map((input.schedule ?? []).map(s => [s.id, s]));
  const cum = new Map<string, number>();
  let handCum = 0;
  const sections: SectionReadiness[] = input.overview.sections.map(s => {
    let farmDay = 0, farmWorst: string | null = null, own = 0, handWorst: string | null = null, handWorstHours = 0;
    const unknown: string[] = [];
    for (const g of s.gather) {
      if (g.missing <= 0) continue;
      const c = way.get(g.itemId)!;
      cum.set(g.itemId, (cum.get(g.itemId) ?? 0) + g.missing);
      if (c.way === 'farm') { const day = cum.get(g.itemId)! / c.autoPerDay; if (day > farmDay) { farmDay = day; farmWorst = g.itemId; } }
      else if (c.way === 'hand') { const h = g.missing / c.handRate!; handCum += h; own += h; if (h > handWorstHours) { handWorstHours = h; handWorst = g.itemId; } }
      else unknown.push(g.itemId);
    }
    // Hand work of this section waits behind the hand work of all earlier sections.
    const handDay = perDayGather > 0 ? handCum / perDayGather : (own > 0 ? Infinity : 0);
    const ready = Math.max(farmDay, handDay), bottleneck = handDay > 0 && handDay >= farmDay ? handWorst : farmWorst;
    const sch = schedule.get(s.id), readyDay = unknown.length || !Number.isFinite(ready) ? null : round1(ready);
    const late = !!sch && !s.complete && sch.state !== 'done' && readyDay !== null && readyDay > sch.start + 0.05;
    return { id: s.id, name: s.name, complete: s.complete, readyDay, bottleneck, handHours: round1(own), unknown, start: sch ? sch.start : null, startDate: sch?.startDate ?? null, late };
  });

  // Suggestions: farm types that cover demanded items, aggregated per type.
  const loadedPerDay = p.gatherHoursPerDay + p.afkHoursPerDay;
  const suggestions: FarmSuggestion[] = [];
  for (const type of FARM_TYPES) {
    if (p.farms.some(f => f.type === type.id && f.state === 'laeuft')) continue;
    const items = coverage.filter(c => c.missing > 0 && flowFor(type, c.itemId)).map(c => {
      const flow = flowFor(type, c.itemId)!;
      const daysWithOne = type.mode === 'auto' ? (loadedPerDay > 0 ? round1(c.missing / (flow.perHour * loadedPerDay)) : null) : null;
      let savedHours: number | null;
      if (c.handRate === null) savedHours = null;
      else if (type.mode === 'auto') savedHours = c.way === 'hand' ? c.missing / c.handRate : 0;
      else savedHours = flow.perHour > c.handRate ? c.missing / c.handRate - c.missing / flow.perHour : 0;
      return { itemId: c.itemId, missing: c.missing, savedHours, daysWithOne, perHour: flow.perHour };
    });
    if (!items.length) continue;
    const units = type.mode === 'auto' && loadedPerDay > 0
      ? Math.min(256, Math.max(1, ...items.map(i => Math.ceil(i.missing / (i.perHour * loadedPerDay * SUGGESTION_TARGET_DAYS)))))
      : 1;
    const known = items.filter(i => i.savedHours !== null);
    const savedHours = known.length ? round1(known.reduce((n, i) => n + i.savedHours!, 0)) : null;
    const cost = type.buildingId ? input.farmCosts?.get(type.buildingId) : undefined;
    const perUnit = cost ? cost.gatherHours + cost.blocks / BUILD_BLOCKS_PER_HOUR : type.effortHours ?? null;
    const buildHours = perUnit === null ? null : round1(perUnit * Math.max(1, units));
    const costSource: FarmSuggestion['costSource'] = cost ? 'Bauplan' : type.effortHours !== undefined ? 'Richtwert' : null;
    if (savedHours !== null && savedHours < MIN_SAVED_HOURS) continue;
    let verdict: Verdict;
    if (savedHours === null) verdict = 'planbar';
    else if (buildHours === null) verdict = 'unbekannt';
    else verdict = savedHours >= buildHours ? 'lohnt' : savedHours >= buildHours / 2 ? 'knapp' : 'lohnt nicht';
    suggestions.push({ type, items: items.map(({ perHour: _p, ...i }) => { void _p; return { ...i, savedHours: i.savedHours === null ? null : round1(i.savedHours) }; }), units, savedHours, buildHours, costSource, verdict,
      planned: p.farms.some(f => f.type === type.id), ratio: savedHours !== null && buildHours ? round1(savedHours / buildHours) : null });
  }
  const rank: Record<Verdict, number> = { lohnt: 0, planbar: 1, knapp: 2, unbekannt: 3, 'lohnt nicht': 4 };
  suggestions.sort((a, b) => rank[a.verdict] - rank[b.verdict] || (b.savedHours ?? 0) - (a.savedHours ?? 0));

  // Furnaces and fuel.
  const smelts = input.overview.sections.reduce((n, s) => n + s.smelts, 0), ticks = input.overview.sections.reduce((n, s) => n + s.cookTicks, 0);
  const furnaceHours = round1(ticks / 20 / 3600);
  const balance = fuelBalance(ticks, smelts);
  const fuelFarms: { farmId: string; itemId: string; smeltsPerDay: number }[] = [];
  for (const f of farms) if (f.running && f.type.mode === 'auto') for (const r of f.rates) {
    const net = netFuelSmelts(r.itemId);
    if (net > 0 && r.perDay > 0) fuelFarms.push({ farmId: f.farm.id, itemId: r.itemId, smeltsPerDay: round1(r.perDay * net) });
  }
  const farmFuelSmeltsPerDay = round1(fuelFarms.reduce((n, f) => n + f.smeltsPerDay, 0));
  const furnaces: FurnacePlan = {
    smelts, ticks, furnaceHours,
    furnacesFor: [1, 2, 4, 8].map(hours => ({ hours, furnaces: furnaceHours ? Math.ceil(furnaceHours / hours) : 0 })),
    fuel: balance.options.map(o => ({ itemId: o.itemId, count: o.count })),
    farmFuelSmeltsPerDay, farmFuelDays: smelts && farmFuelSmeltsPerDay ? round1(smelts / farmFuelSmeltsPerDay) : null, fuelFarms,
  };

  // Storage per section for the build items still to place.
  const storage: StorageLine[] = input.overview.sections.filter(s => !s.complete).map(s => {
    const slots = s.items.reduce((n, i) => n + Math.ceil(i.need / stackSizeOf(i.itemId)), 0);
    const shulkers = Math.ceil(slots / 27);
    return { id: s.id, name: s.name, slots, doubleChests: Math.ceil(slots / 54), shulkers, trips: Math.ceil(shulkers / Math.max(1, input.pace.boxesPerSession)) };
  });
  const sorterItems = [...new Set(farms.filter(f => f.running && f.type.mode === 'auto').flatMap(f => f.rates.map(r => r.itemId)))].sort();

  const notes = [
    'Farmraten sind Richtwerte für einfache, verbreitete Bauweisen – trag Ernten ins Ertragsbuch ein, dann rechnet der Planer mit deiner gemessenen Rate.',
    `Automatische Farmen laufen nur in deiner Nähe: angenommen während der Sammelzeit (${p.gatherHoursPerDay} h/Tag)${p.afkHoursPerDay ? ` und der AFK-Zeit (${p.afkHoursPerDay} h/Tag, nur im Bereich des AFK-Platzes)` : ''}.`,
    'Handarbeit und halbautomatische Farmen teilen sich eine Warteschlange aus Spielerstunden; ein Spieltag entspricht einem Bautag der Planung.',
    'Bedarf = „Noch sammeln“ des Sammelplans der Baustelle (nur offene Schritte, Lager schon abgezogen).',
  ];
  if (unknownLines.length) notes.push(`${unknownLines.length} Items haben keinen Richtwert (Funde, Handel, unbekannte Blöcke) – sie bremsen die Materialbereitschaft, bis sie im Lager sind.`);
  if (input.farmCosts === undefined || !input.farmCosts.size) notes.push('Baukosten der Farmen sind unbekannt – „Lohnt sich“ vergleicht dann nur die gesparte Zeit.');

  return {
    farms, coverage, sections, suggestions, furnaces, storage, sorterItems,
    totals: {
      missing: coverage.reduce((n, c) => n + c.missing, 0), running: farms.filter(f => f.running).length,
      farmPerDay: Math.round(farms.reduce((n, f) => n + f.rates.reduce((m, r) => m + r.perDay, 0), 0)),
      handHours, handDays, farmDays, readyDays, bottleneck, unknown: unknownLines.length, late: sections.filter(s => s.late).length,
    },
    afk: p.afk ? afkCoverage(p, p.afk) : null, bestAfk: bestAfkSpot(p), notes,
  };
}

// ---------------------------------------------------------------------------
// Connections: project instances, world plan, builders

export interface DetectedFarm {
  readonly instanceId: string;
  readonly instanceName: string;
  readonly type: FarmType;
  /** Share of the instance's blocks already ticked as built (0…1). */
  readonly built: number;
  readonly farmId: string | null;
  /** State the project's progress suggests. */
  readonly suggested: 'plan' | 'bau' | 'laeuft';
}

/** Instances of catalogue farm buildings in the project, with build progress and link to a farm entry. */
export function detectFarms(production: ProductionPlan, instances: readonly { readonly id: string; readonly name: string; readonly assetId: string; readonly built: number }[]): DetectedFarm[] {
  const out: DetectedFarm[] = [];
  for (const inst of instances) {
    const type = FARM_TYPES.find(t => t.buildingId === inst.assetId);
    if (!type) continue;
    const linked = production.farms.find(f => f.instanceId === inst.id);
    out.push({ instanceId: inst.id, instanceName: inst.name, type, built: inst.built, farmId: linked?.id ?? null, suggested: inst.built >= 1 ? 'laeuft' : inst.built > 0 ? 'bau' : 'plan' });
  }
  return out;
}

const KEYWORDS: readonly [RegExp, string][] = [
  [/eisen|golem|iron/i, 'eisen'], [/zuckerrohr|sugar/i, 'zuckerrohr'], [/kaktus|cactus/i, 'kaktus'], [/kürbis|kuerbis|pumpkin/i, 'kuerbis'], [/melone|melon/i, 'melone'],
  [/bambus|bamboo/i, 'bambus'], [/seetang|kelp/i, 'seetang'], [/weizen|wheat/i, 'weizen'], [/karotte|carrot/i, 'karotten'], [/kartoffel|potato/i, 'kartoffeln'],
  [/baum|holz|tree|wood/i, 'baum'], [/pilz|mushroom/i, 'pilze'], [/warze|wart/i, 'netherwarze'], [/huhn|hühner|ei(er)?\b|chicken/i, 'huehner'], [/woll|schaf|sheep/i, 'wolle'],
  [/kuh|kühe|leder|cow/i, 'kuehe'], [/biene|honig|bee/i, 'bienen'], [/schleim|slime/i, 'schleim'], [/hexe|witch/i, 'hexen'], [/raid|überfall|pillager/i, 'raid'],
  [/bibliothek|librarian/i, 'bibliothekar'], [/steinmetz|mason/i, 'steinmetz'], [/piglin|tausch|barter/i, 'piglin'], [/bruchstein|cobble/i, 'bruchstein'], [/basalt/i, 'basalt'],
  [/lava/i, 'lava'], [/gold/i, 'gold'], [/lohe|blaze/i, 'lohen'], [/wither/i, 'wither'], [/quarz|quartz/i, 'quarz'], [/ender/i, 'enderman'], [/wächter|guardian|monument/i, 'waechter'],
  [/stein|stone/i, 'stein'], [/mob|xp|erfahrung|spawner/i, 'mobfarm'],
];
/** Farm type guessed from a name (world plan points), or null. */
export function guessFarmType(name: string): FarmType | null {
  for (const [re, id] of KEYWORDS) if (re.test(name)) return farmType(id) ?? null;
  return null;
}

const DIM_OF: Readonly<Record<string, Dimension>> = { overworld: 'Oberwelt', 'minecraft:overworld': 'Oberwelt', oberwelt: 'Oberwelt', the_nether: 'Nether', 'minecraft:the_nether': 'Nether', nether: 'Nether', the_end: 'Ende', 'minecraft:the_end': 'Ende', ende: 'Ende', end: 'Ende' };
export const dimensionOf = (worldDimension: string): Dimension => DIM_OF[worldDimension.toLowerCase()] ?? 'Oberwelt';
const WORLD_DIM: Readonly<Record<Dimension, string>> = { Oberwelt: 'minecraft:overworld', Nether: 'minecraft:the_nether', Ende: 'minecraft:the_end' };
export const worldDimensionOf = (d: Dimension): string => WORLD_DIM[d];

export interface MapFarm { readonly pointId: string; readonly name: string; readonly at: FarmPlace; readonly type: FarmType | null; readonly farmId: string | null }
/** Farm points of the world plan (type „farm“) with a guessed type and the farm entry they are linked to. */
export function farmsOnMap(production: ProductionPlan, items: readonly WorldItem[]): MapFarm[] {
  return items.filter(i => i.kind === 'point' && i.type === 'farm').map(i => {
    const pt = i as Extract<WorldItem, { kind: 'point' }>;
    return { pointId: pt.id, name: pt.name, at: { x: pt.x, y: pt.y, z: pt.z, dimension: dimensionOf(pt.dimension) }, type: guessFarmType(`${pt.name} ${pt.note}`),
      farmId: production.farms.find(f => f.pointId === pt.id)?.id ?? null };
  });
}

export interface GatherJob { readonly label: string; readonly items: readonly { readonly itemId: string; readonly missing: number; readonly hours: number; readonly activity: string }[]; readonly hours: number }
export interface GatherAssignment { readonly builderId: string; readonly name: string; readonly jobs: readonly GatherJob[]; readonly hours: number }

/**
 * Hand-gathering jobs split over builders (TEAM-03-S02): items of the Nether
 * and the End stay together as one trip, other items are single jobs; the
 * longest job goes to the builder with the least hours so far (LPT).
 */
export function splitGathering(coverage: readonly CoverageLine[], builders: readonly { readonly id: string; readonly name: string }[]): GatherAssignment[] {
  if (!builders.length) return [];
  const hand = coverage.filter(c => c.way === 'hand' && c.handHours);
  const jobs: GatherJob[] = [];
  for (const dim of ['Nether', 'Ende'] as const) {
    const own = hand.filter(c => c.dimension === dim);
    if (own.length) jobs.push({ label: `${dim}-Tour`, items: own.map(c => ({ itemId: c.itemId, missing: c.missing, hours: c.handHours!, activity: c.activity })), hours: round1(own.reduce((n, c) => n + c.handHours!, 0)) });
  }
  for (const c of hand.filter(c => !c.dimension)) jobs.push({ label: c.itemId.replace(/^minecraft:/, ''), items: [{ itemId: c.itemId, missing: c.missing, hours: c.handHours!, activity: c.activity }], hours: c.handHours! });
  const load = builders.map(b => ({ builderId: b.id, name: b.name, jobs: [] as GatherJob[], hours: 0 }));
  for (const job of jobs.sort((a, b) => b.hours - a.hours || (a.label < b.label ? -1 : 1))) {
    const target = load.reduce((best, l) => l.hours < best.hours ? l : best, load[0]!);
    target.jobs.push(job); target.hours = round1(target.hours + job.hours);
  }
  return load;
}

const nice = (id: string): string => id.replace(/^minecraft:/, '');
const num = (n: number): string => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });

/** Plain-text production sheet for chat, notes or printing. */
export function productionText(report: ProductionReport, title: string, assignments: readonly GatherAssignment[] = []): string {
  const t = report.totals, lines = [`Produktion – ${title}`, ''];
  lines.push(`Noch zu beschaffen: ${num(t.missing)} Items · Handarbeit ${num(t.handHours)} h${t.handDays !== null ? ` (${num(t.handDays)} Spieltage)` : ''} · Farmen ${num(t.farmPerDay)}/Tag`);
  lines.push(t.readyDays !== null ? `Material komplett nach etwa ${num(t.readyDays)} Spieltagen.` : 'Material komplett: offen (Items ohne Richtwert).');
  if (t.bottleneck) lines.push(`Engpass: ${nice(t.bottleneck.itemId)} – ${t.bottleneck.why}`);
  lines.push('', 'Farmen:');
  for (const f of report.farms) lines.push(`- ${f.farm.name} (${f.farm.units}× ${f.type.unit}, ${f.running ? 'läuft' : f.farm.state}): ${f.rates.map(r => `${num(r.perHour)} ${nice(r.itemId)}/h (${r.source === 'Lagerkiste' ? 'Sammeltruhe' : r.source})`).join(', ')}`);
  if (!report.farms.length) lines.push('- keine');
  lines.push('', 'Deckung je Item:');
  for (const c of report.coverage) lines.push(`- ${nice(c.itemId)}: ${num(c.missing)} · ${COVER_WAY_LABEL[c.way]}${c.days !== null ? ` · ${num(c.days)} Tage` : ''}${c.handHours !== null && c.way === 'hand' ? ` · ${num(c.handHours)} h` : ''}`);
  lines.push('', 'Abschnitte:');
  for (const s of report.sections) lines.push(`- ${s.name}: ${s.complete ? 'fertig' : s.readyDay === null ? 'Material offen' : `Material nach ${num(s.readyDay)} Tagen`}${s.start !== null && !s.complete ? ` · Baubeginn Tag ${s.start + 1}${s.late ? ' · ZU SPÄT' : ''}` : ''}`);
  if (report.furnaces.smelts) lines.push('', `Öfen: ${num(report.furnaces.smelts)} Schmelzvorgänge = ${num(report.furnaces.furnaceHours)} Ofenstunden; ${report.furnaces.furnacesFor.map(f => `${f.furnaces} Öfen für ${f.hours} h`).join(', ')}.`);
  if (assignments.length) {
    lines.push('', 'Sammelaufträge:');
    for (const a of assignments) lines.push(`- ${a.name} (${num(a.hours)} h): ${a.jobs.map(j => j.label).join(', ') || 'nichts'}`);
  }
  lines.push('', ...report.notes.map(n => `Hinweis: ${n}`));
  return lines.join('\n');
}
