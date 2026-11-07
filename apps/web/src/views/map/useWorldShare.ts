import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildMapListDoc, buildWorldShareDoc, mapShapes, siteOf, teamContextOf, teamView, mergeMapLists, mergeShapes, mergeWorldItems, readMapListDoc, readWorldShareDoc, sameItems,
} from '../../../../../packages/domain/src/index.js';
import type { MapShape, Project, RoomTeam, SavedLiveMap, WorldItem } from '../../../../../packages/domain/src/index.js';
import { DIMENSIONS } from '../../../../../packages/domain/src/world/worldmap.js';
import type { WorldMapView } from '../../../../../packages/domain/src/world/worldmap.js';
import { errorText } from '../../app/ui';
import type { LiveMapSettings } from './liveMapConfig';

/**
 * WORLD-SHARE-01: the Weltplan and the server web maps over the Team-Raum (documents `weltplan` and
 * `karten`, services/team-room). This browser merges the room's version with its own and puts the result
 * back; the mods of the team and the Paper plugin read the same document. No file anywhere.
 */
export interface ShareRoom { readonly projectId: string; readonly projectName: string; readonly teamName: string; readonly url: string; readonly room: string; readonly key: string; readonly keys: readonly string[]; readonly me: string; readonly who: string }

/** Projects with a live Team-Raum (one per room, the first by name). Copies of a project may hold an older
 *  key (invitation renewed), so every key seen for the room is kept and tried in turn (admin keys first). */
export function shareRooms(projects: readonly Project[] | null): ShareRoom[] {
  const out: ShareRoom[] = [], keys = new Map<string, string[]>();
  for (const p of projects ?? []) {
    const team = p.site?.team as RoomTeam | undefined, live = team?.live;
    if (!team || !live) continue;
    const list = keys.get(live.room);
    if (list) { if (live.adminKey && !list.includes(live.adminKey)) list.unshift(live.adminKey); if (!list.includes(live.key)) list.push(live.key); continue; }
    const mine = [...new Set([live.adminKey, live.key].filter((k): k is string => !!k))];
    keys.set(live.room, mine);
    // Block B (KARTE-10): „zuletzt von …“ shows the player's name, not the builder id (bld_…).
    const name = team.self ? teamView(team, teamContextOf(siteOf(p))).members.find(m => m.id === team.self)?.name : undefined;
    out.push({ projectId: p.id, projectName: p.name, teamName: team.name, url: live.url, room: live.room, key: mine[0]!, keys: mine, me: team.self ?? 'planer', who: name ?? team.self ?? 'planer' });
  }
  return out;
}

/** The key that worked last per room (copies of a project may carry a renewed one). */
const goodKey = new Map<string, string>();
async function withKey<T>(r: ShareRoom, run: (key: string) => Promise<T>): Promise<T> {
  const first = goodKey.get(r.room);
  const order = first && r.keys.includes(first) ? [first, ...r.keys.filter(k => k !== first)] : [...r.keys];
  for (let i = 0; ; i++) {
    try { const out = await run(order[i]!); goodKey.set(r.room, order[i]!); return out; }
    catch (e) { if (!(e instanceof DocError && (e.status === 401 || e.status === 403) && i + 1 < order.length)) throw e; }
  }
}

class DocError extends Error { constructor(readonly status: number, message: string) { super(message); } }
interface DocAnswer { readonly rev: number; readonly by?: string; readonly at?: string; readonly unchanged?: boolean; readonly doc?: unknown }

const getDoc = (r: ShareRoom, name: string, known?: number) => withKey(r, key => getDocWith(r, key, name, known));
async function getDocWith(r: ShareRoom, key: string, name: string, known?: number): Promise<DocAnswer | null> {
  let res: Response;
  try { res = await fetch(`${r.url.replace(/\/+$/, '')}/v1/rooms/${r.room}/doc/${name}${known ? `?known=${known}` : ''}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' }); }
  catch { throw new DocError(0, 'Team-Raum nicht erreichbar (offline?).'); }
  if (res.status === 404) { const b = await res.json().catch(() => ({})) as { error?: string; message?: string }; if (b.error === 'dokument-fehlt') return null; throw new DocError(404, b.message ?? 'Team-Raum kennt geteilte Dokumente noch nicht.'); }
  if (!res.ok) { const b = await res.json().catch(() => ({})) as { message?: string }; throw new DocError(res.status, b.message ?? `Team-Raum antwortet ${res.status}.`); }
  return await res.json() as DocAnswer;
}
const putDoc = (r: ShareRoom, name: string, doc: unknown, ifMatch: number) => withKey(r, key => putDocWith(r, key, name, doc, ifMatch));
async function putDocWith(r: ShareRoom, key: string, name: string, doc: unknown, ifMatch: number): Promise<{ rev: number; at: string }> {
  let res: Response;
  try { res = await fetch(`${r.url.replace(/\/+$/, '')}/v1/rooms/${r.room}/doc/${name}?by=${encodeURIComponent(r.me)}`, { method: 'PUT', body: JSON.stringify(doc), headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'If-Match': String(ifMatch) } }); }
  catch { throw new DocError(0, 'Team-Raum nicht erreichbar (offline?).'); }
  if (!res.ok) { const b = await res.json().catch(() => ({})) as { message?: string }; throw new DocError(res.status, b.message ?? `Team-Raum antwortet ${res.status}.`); }
  return await res.json() as { rev: number; at: string };
}

const CHOICE_KEY = 'bauplaner.weltplan.teilen';
const baseKey = (name: string, room: string) => `bauplaner.weltplan.basis.${name}.${room}`;
interface Base<T> { readonly rev: number; readonly data: T }
function readBase<T>(name: string, room: string, empty: T): Base<T> {
  try { const b = JSON.parse(localStorage.getItem(baseKey(name, room)) ?? 'null') as Base<T> | null; return b && Number.isInteger(b.rev) ? b : { rev: 0, data: empty }; } catch { return { rev: 0, data: empty }; }
}
function writeBase<T>(name: string, room: string, b: Base<T>): void { try { localStorage.setItem(baseKey(name, room), JSON.stringify(b)); } catch { /* quota: next contact merges as first contact */ } }

/** Every dimension that has Weltplan entries or is shown, with the projects of the shown one. */
export function shapesFor(map: WorldMapView | null, items: readonly WorldItem[], dimension: string): Record<string, MapShape[]> {
  const dims = new Set<string>([...DIMENSIONS.map(d => d.id), ...items.map(i => i.dimension)]);
  const out: Record<string, MapShape[]> = {};
  for (const d of dims) {
    if (d !== dimension && !items.some(i => i.dimension === d)) continue;
    out[d] = mapShapes(d === dimension ? map : null, items, d);
  }
  return out;
}

export interface WorldShareState {
  readonly rooms: readonly ShareRoom[];
  readonly room: ShareRoom | null;
  /** null = sharing switched off in this browser. */
  choose(projectId: string | null): void;
  readonly rev: number;
  readonly by: string;
  readonly at: string;
  readonly syncedAt: number;
  readonly error: string;
  readonly message: string;
  readonly busy: boolean;
  syncNow(): void;
}

const POLL_MS = 8000;

/**
 * Keeps the Weltplan (and the list of server web maps) of this browser and of the chosen Team-Raum equal.
 * `replace` stores merged entries locally (no undo step: they are the others' changes).
 */
export function useWorldShare(opts: {
  projects: readonly Project[] | null; items: readonly WorldItem[]; loaded: boolean; map: WorldMapView | null; dimension: string;
  replace: (items: WorldItem[], expected: readonly WorldItem[]) => Promise<boolean>;
  savedMaps: readonly SavedLiveMap[]; setSavedMaps: (m: SavedLiveMap[]) => void; live: LiveMapSettings; setLive: (s: LiveMapSettings) => void;
}): WorldShareState {
  const rooms = useMemo(() => shareRooms(opts.projects), [opts.projects]);
  const [choice, setChoice] = useState<string | null | undefined>(() => { try { const v = localStorage.getItem(CHOICE_KEY); return v === null ? undefined : v === '' ? null : v; } catch { return undefined; } });
  const room = choice === null ? null : rooms.find(r => r.projectId === choice) ?? rooms[0] ?? null;
  const [state, setState] = useState({ rev: 0, by: '', at: '', syncedAt: 0, error: '', message: '', busy: false });
  const latest = useRef(opts); latest.current = opts;
  const running = useRef(false), again = useRef(false);
  /** Markers of the room's last full version (project markers of other dimensions are kept from it). */
  const lastShapes = useRef<{ room: string; shapes: Record<string, readonly MapShape[]> } | undefined>(undefined);
  const [kick, setKick] = useState(0);

  const choose = useCallback((id: string | null) => { setChoice(id); try { localStorage.setItem(CHOICE_KEY, id ?? ''); } catch { /* session only */ } }, []);

  const roundWorld = useCallback(async (r: ShareRoom) => {
    const o = latest.current;
    const base = readBase<WorldItem[]>('weltplan', r.room, []);
    // The first round of a page load reads the whole document (for the project markers of other dimensions).
    const answer = await getDoc(r, 'weltplan', lastShapes.current?.room === r.room ? base.rev || undefined : undefined);
    let remoteItems: readonly WorldItem[] = base.data, remoteShapes: Record<string, readonly MapShape[]> | undefined, rev = base.rev, by = '', at = '';
    if (answer === null) { remoteItems = []; rev = 0; }
    else if (!answer.unchanged) { const doc = readWorldShareDoc(answer.doc); remoteItems = doc.items; remoteShapes = doc.shapes; lastShapes.current = { room: r.room, shapes: doc.shapes }; rev = answer.rev; by = doc.by; at = doc.at; }
    else rev = answer.rev;
    const merged = mergeWorldItems(answer === null ? [] : base.data, o.items, remoteItems);
    let note = '';
    if (!sameItems(merged.items, o.items)) {
      if (!(await o.replace(merged.items, o.items))) { again.current = true; return; } // a local change came in meanwhile
      const f = merged.fromRoom;
      note = `Aus dem Team: ${[f.added && `${f.added} neu`, f.changed && `${f.changed} geändert`, f.removed && `${f.removed} entfernt`].filter(Boolean).join(', ') || 'abgeglichen'}${merged.conflicts.length ? ` · gleichzeitig geändert, der Stand im Team gilt: ${merged.conflicts.slice(0, 3).join(', ')}` : ''}.`;
    }
    const fresh = shapesFor(o.map, merged.items, o.dimension);
    const shapesKey = JSON.stringify(fresh);
    const sentShapes = (() => { try { return localStorage.getItem(baseKey('weltplan-marker', r.room)); } catch { return null; } })();
    if (merged.toSend || answer === null || shapesKey !== sentShapes) {
      const doc = buildWorldShareDoc(merged.items, mergeShapes(remoteShapes ?? (answer?.unchanged ? lastShapes.current?.shapes : undefined), fresh, o.dimension), r.who);
      const put = await putDoc(r, 'weltplan', doc, rev);
      writeBase('weltplan', r.room, { rev: put.rev, data: merged.items });
      lastShapes.current = { room: r.room, shapes: { ...doc.shapes } };
      try { localStorage.setItem(baseKey('weltplan-marker', r.room), shapesKey); } catch { /* resend next time */ }
      setState(s => ({ ...s, rev: put.rev, by: r.who, at: put.at, message: note || s.message }));
    } else {
      writeBase('weltplan', r.room, { rev, data: [...remoteItems] });
      setState(s => ({ ...s, rev, ...(by && { by, at }), message: note || s.message }));
    }
  }, []);

  const roundMaps = useCallback(async (r: ShareRoom) => {
    const o = latest.current;
    const base = readBase<{ maps: SavedLiveMap[]; active: SavedLiveMap | null }>('karten', r.room, { maps: [], active: null });
    const answer = await getDoc(r, 'karten', base.rev || undefined);
    let remote = base.data, rev = base.rev;
    if (answer === null) { remote = { maps: [], active: null }; rev = 0; }
    else if (!answer.unchanged) { const d = readMapListDoc(answer.doc); remote = { maps: [...d.maps], active: d.active }; rev = answer.rev; }
    const merged = mergeMapLists(answer === null ? [] : base.data.maps, o.savedMaps, remote.maps);
    if (JSON.stringify(merged.maps) !== JSON.stringify(o.savedMaps)) o.setSavedMaps(merged.maps);
    // The linked map: changed here → goes up; changed in the room → taken here.
    const mine: SavedLiveMap | null = o.live.urlTemplate ? { name: o.live.name.trim() || 'Live-Karte', urlTemplate: o.live.urlTemplate, worlds: o.live.worlds } : null;
    const k = (m: SavedLiveMap | null) => JSON.stringify(m);
    let active = remote.active;
    if (k(mine) !== k(base.data.active) && k(remote.active) === k(base.data.active)) active = mine;
    else if (k(remote.active) !== k(mine) && remote.active) o.setLive({ ...o.live, name: remote.active.name, urlTemplate: remote.active.urlTemplate, worlds: { ...remote.active.worlds } });
    if (merged.toSend || k(active) !== k(remote.active)) {
      if (!merged.maps.length && !active && answer === null) return;
      let put: { rev: number };
      try { put = await putDoc(r, 'karten', buildMapListDoc(merged.maps, active, r.who), rev); }
      catch (e) { if (e instanceof Error && /Kartenvorlage|Vorlage|URL/.test(e.message)) return; throw e; }
      writeBase('karten', r.room, { rev: put.rev, data: { maps: merged.maps, active } });
    } else writeBase('karten', r.room, { rev, data: remote });
  }, []);

  const round = useCallback(async () => {
    const r = room;
    if (!r || !latest.current.loaded) return;
    if (running.current) { again.current = true; return; }
    running.current = true;
    setState(s => ({ ...s, busy: true }));
    try {
      await roundWorld(r);
      await roundMaps(r).catch(e => setState(s => ({ ...s, message: `Kartenliste nicht abgeglichen: ${errorText(e)}` })));
      setState(s => ({ ...s, error: '', syncedAt: Date.now() }));
    } catch (e) {
      if (e instanceof DocError && e.status === 409) again.current = true; // someone else saved meanwhile: merge again
      else setState(s => ({ ...s, error: errorText(e) }));
    } finally {
      running.current = false;
      setState(s => ({ ...s, busy: false }));
      if (again.current) { again.current = false; setKick(n => n + 1); }
    }
  }, [room, roundWorld, roundMaps]);

  // Poll the room (cheap: `known` answers „unchanged“), on focus, and shortly after a local change.
  useEffect(() => {
    if (!room) return;
    setState(s => ({ ...s, rev: readBase('weltplan', room.room, []).rev, error: '' }));
    const t = setInterval(() => { if (document.visibilityState === 'visible') void round(); }, POLL_MS);
    const focus = () => void round();
    window.addEventListener('focus', focus);
    return () => { clearInterval(t); window.removeEventListener('focus', focus); };
  }, [room?.room, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const localKey = useMemo(() => JSON.stringify(opts.items) + '|' + opts.dimension + '|' + JSON.stringify(opts.savedMaps) + '|' + opts.live.urlTemplate + JSON.stringify(opts.live.worlds), [opts.items, opts.dimension, opts.savedMaps, opts.live]);
  useEffect(() => {
    if (!room || !opts.loaded) return;
    const t = setTimeout(() => void round(), 1200);
    return () => clearTimeout(t);
  }, [localKey, opts.loaded, room?.room, kick, opts.map]); // eslint-disable-line react-hooks/exhaustive-deps

  return { rooms, room, choose, ...state, syncNow: () => void round() };
}
