// Sicherungs-Tresor des Team-Raums (OPS-04, docs/architecture/team/TEAM_BACKUP.md). Without Cloudflare APIs, so the
// Durable Object `RoomVault` and the Node tests run the same code. One vault per room, in its own Durable Object
// (own SQLite storage, separate from the room): a broken or deleted room does not take its backups with it.
// Big pieces (plan snapshots, shared documents) are stored once by SHA-256 and shared by all backups that hold them.
import { RoomError, sha256, randomKey, BACKUP_FORMAT, LIMITS } from './core.js';

const DAY = 86_400_000;
/**
 * Retention (free Cloudflare plan: 5 GB in all Durable Objects of the account). Automatic backups: every one of the
 * last 48 hours, then the newest of each day for 30 days. Backups with a reason (by hand, before a restore, before
 * deleting) 30 days. The newest backup always stays. A room nobody opened for `idleDays` is deleted after a last
 * backup, which stays `deletedKeepDays` and can bring the room back with the admin key.
 */
export const RETENTION = Object.freeze({ hourlyMs: 48 * 3_600_000, dailyDays: 30, markedDays: 30, max: 80, maxMarked: 20,
  idleDays: 365, deletedKeepDays: 90, autoDelayMs: 15 * 60_000, autoEveryMs: 60 * 60_000, manualEveryMs: 60_000 });
export const REASONS = Object.freeze({ auto: 'automatisch', manuell: 'von Hand', 'vor-wiederherstellung': 'vor einer Wiederherstellung', loeschen: 'vor dem Löschen', inaktiv: 'vor dem Löschen (lange unbenutzt)' });

/** Ids of backups to drop under RETENTION; `list` = backup metas {id, at, reason}. Pure (tested). */
export function pruneBackups(list, now = Date.now()) {
  const sorted = [...list].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const keep = new Set(sorted.length ? [sorted[0].id] : []);
  const days = new Set();
  let marked = 0;
  for (const b of sorted) {
    const age = now - Date.parse(b.at);
    if (b.reason === 'auto') {
      if (age <= RETENTION.hourlyMs) keep.add(b.id);
      else if (age <= RETENTION.dailyDays * DAY) { const d = b.at.slice(0, 10); if (!days.has(d)) { days.add(d); keep.add(b.id); } }
    } else if (age <= RETENTION.markedDays * DAY && marked < RETENTION.maxMarked) { keep.add(b.id); marked++; }
  }
  const kept = sorted.filter(b => keep.has(b.id)).slice(0, RETENTION.max).map(b => b.id);
  const set = new Set(kept);
  return sorted.filter(b => !set.has(b.id)).map(b => b.id);
}

async function gzip(bytes) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); }
async function gunzip(bytes) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); }

/** Packs head and events of a snapshot into gzip bytes (the blobs travel separately). */
export async function packSnapshot({ head, events }) {
  return gzip(new TextEncoder().encode(JSON.stringify({ head, events })));
}
export async function unpackSnapshot(bytes) {
  let data;
  try { data = JSON.parse(new TextDecoder().decode(await gunzip(bytes))); } catch { throw new RoomError(500, 'sicherung-beschaedigt', 'Die Sicherung lässt sich nicht lesen.'); }
  if (data?.head?.format !== BACKUP_FORMAT) throw new RoomError(500, 'sicherung-beschaedigt', 'Die Sicherung lässt sich nicht lesen.');
  return data;
}

const chunk = bytes => { const out = []; for (let i = 0; i < bytes.byteLength; i += LIMITS.planChunk) out.push(bytes.slice(i, i + LIMITS.planChunk)); return out.length ? out : [new Uint8Array(0)]; };
const join = chunks => { const total = chunks.reduce((n, c) => n + c.byteLength, 0), out = new Uint8Array(total); let o = 0; for (const c of chunks) { out.set(new Uint8Array(c), o); o += c.byteLength; } return out; };

/**
 * The vault of one room. Store = MemoryStore/SqlStore (meta + chunked blobs): meta `backups` (list), `admin`
 * (hash of the admin key of the newest backup, so a deleted room can still be brought back), `deletedAt`.
 * Blobs: `blob:<sha>` (plans, documents), `data:<id>` (gzip of head + events).
 */
export class VaultCore {
  constructor(store) { this.store = store; }
  list() { return [...(this.store.getMeta('backups') ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)); }
  /** Which of these blob hashes the vault does not hold yet. */
  missing(shas) { return [...new Set(shas)].filter(s => !this.store.getPlan(`blob:${s}`)); }
  async putBlob(sha, bytes) {
    if (!/^[a-f0-9]{64}$/.test(sha) || await sha256(bytes) !== sha) throw new RoomError(400, 'sicherung-pruefsumme', 'Prüfsumme eines Sicherungsteils stimmt nicht.');
    if (!this.store.getPlan(`blob:${sha}`)) this.store.putPlan(`blob:${sha}`, chunk(bytes));
  }
  /**
   * Stores one backup: `data` = packSnapshot bytes, `head` = its head (for the listing), blobs must be there already.
   * Returns the backup meta. Old backups are dropped under RETENTION and blobs nobody uses any more with them.
   */
  async put({ head, data, reason = 'auto', now = new Date().toISOString() }) {
    if (!REASONS[reason]) throw new RoomError(400, 'sicherung-grund', 'Unbekannter Sicherungsgrund.');
    const blobs = [...head.plans, ...Object.values(head.docs ?? {}).map(d => d.sha256)];
    if (this.missing(blobs).length) throw new RoomError(400, 'sicherung-unvollstaendig', 'Ein Planstand oder Dokument fehlt im Tresor.');
    const id = `bk_${now.replace(/[-:TZ.]/g, '').slice(0, 14)}_${randomKey(4)}`;
    this.store.putPlan(`data:${id}`, chunk(data));
    const meta = { id, at: now, reason, events: head.events, cursor: head.cursor, bytes: data.byteLength + blobs.reduce((n, s) => n + (this.store.getPlan(`blob:${s}`) ?? []).reduce((m, c) => m + c.byteLength, 0), 0),
      sha256: await sha256(data), blobs, name: head.room.name, teamId: head.room.teamId, header: !!head.header, plans: head.plans.length, docs: Object.keys(head.docs ?? {}) };
    this.store.setMeta('backups', [...this.list(), meta]);
    this.store.setMeta('admin', head.room.admin);
    this.store.setMeta('floor', Math.max(Number(this.store.getMeta('floor') ?? 0), Number(head.floor) || 0));
    this.prune(Date.parse(now));
    return meta;
  }
  prune(now = Date.now()) {
    const drop = new Set(pruneBackups(this.list(), now));
    if (!drop.size) return [];
    const left = this.list().filter(b => !drop.has(b.id));
    for (const id of drop) this.store.deletePlan(`data:${id}`);
    const used = new Set(left.flatMap(b => b.blobs));
    for (const b of this.list()) if (drop.has(b.id)) for (const s of b.blobs) if (!used.has(s)) this.store.deletePlan(`blob:${s}`);
    this.store.setMeta('backups', left);
    return [...drop];
  }
  /** The backup as {head, events, blobs: Map}; 404 if unknown, 500 if damaged. */
  async get(id, { withBlobs = true } = {}) {
    const meta = this.list().find(b => b.id === id);
    const c = meta && this.store.getPlan(`data:${id}`);
    if (!c) throw new RoomError(404, 'sicherung-fehlt', 'Diese Sicherung gibt es nicht (mehr).');
    const data = join(c);
    if (await sha256(data) !== meta.sha256) throw new RoomError(500, 'sicherung-beschaedigt', 'Die Sicherung ist beschädigt (Prüfsumme).');
    const { head, events } = await unpackSnapshot(data);
    const blobs = new Map();
    if (withBlobs) for (const s of meta.blobs) { const b = this.store.getPlan(`blob:${s}`); if (b) blobs.set(s, join(b)); }
    return { head, events, blobs };
  }
  /** One stored blob (plan snapshot, document) by SHA-256; restore fetches them one by one (DO calls stay small). */
  getBlob(sha) { const b = this.store.getPlan(`blob:${sha}`); if (!b) throw new RoomError(404, 'sicherung-unvollstaendig', 'Ein Teil der Sicherung fehlt.'); return join(b); }
  /** Hash of the admin key of the newest backup (to bring back a deleted room). */
  adminHash() { return this.store.getMeta('admin'); }
  /** Highest arrival number any backup knew. */
  floor() { return Number(this.store.getMeta('floor') ?? 0); }
  markDeleted(now = new Date().toISOString()) { this.store.setMeta('deletedAt', now); return Date.parse(now) + RETENTION.deletedKeepDays * DAY; }
  markRestored() { this.store.deleteMeta('deletedAt'); }
  deletedAt() { return this.store.getMeta('deletedAt'); }
  /** True when the vault itself is due to go (room deleted longer ago than deletedKeepDays). */
  expired(now = Date.now()) { const d = this.deletedAt(); return !!d && now >= Date.parse(d) + RETENTION.deletedKeepDays * DAY; }
  wipe() { for (const b of this.list()) { this.store.deletePlan(`data:${b.id}`); for (const s of b.blobs) this.store.deletePlan(`blob:${s}`); } for (const k of this.store.metaKeys()) this.store.deleteMeta(k); }
}

/** Copies a room snapshot into a vault (blobs first, only those the vault lacks). `vault` may be a VaultCore or a DO stub with the same methods. */
export async function backupInto(vault, snapshot, reason, now) {
  const data = await packSnapshot(snapshot);
  for (const sha of await vault.missing([...snapshot.blobs.keys()])) await vault.putBlob(sha, snapshot.blobs.get(sha));
  return vault.put({ head: snapshot.head, data, reason, ...(now && { now }) });
}

export const DAY_MS = DAY;
