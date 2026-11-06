/**
 * FALLBACK-01: which way brings the Baustand (an in-game recording) into the planner, and in which order.
 *
 * Client first (Philipp, 04.11.2026): the own game on this computer comes first (127.0.0.1, no server, no
 * internet), then the games of the team over the team room, then the optional Paper plugin. Each way that
 * fails hands over to the next one; the last way out is always the file import. Pure and testable: the view
 * passes what it knows and gets the order with a reason for every way that is not possible right now.
 */

export type ScanRouteId = 'mod' | 'room' | 'server';

export interface ScanRouteInput {
  readonly projectId: string;
  /** The mod on this computer: paired (key stored in this browser); after a hello also features/hologram. */
  readonly mod: { readonly paired: boolean; readonly features?: readonly string[]; readonly hologramProjectId?: string | null } | null;
  /** Team live: connected to a room, and how many games are there right now. */
  readonly room: { readonly connected: boolean; readonly games: number };
  /** Paper plugin paired with this browser (LINK-01). */
  readonly server: { readonly paired: boolean };
}

export interface ScanRoute {
  readonly id: ScanRouteId;
  readonly label: string;
  readonly available: boolean;
  /** Why the way is not possible now (only when not available). */
  readonly why?: string;
  /** What this way can see (shown next to the result). */
  readonly reach: string;
}

export const SCAN_ROUTE_LABEL: Readonly<Record<ScanRouteId, string>> = {
  mod: 'dein Spiel auf diesem PC',
  room: 'Spiele im Team-Raum',
  server: 'Server-Plugin',
};

const REACH: Readonly<Record<ScanRouteId, string>> = {
  mod: 'liest die Chunks, die dein Spiel gerade geladen hat',
  room: 'ein Mitspieler mit platziertem Plan liest seine geladenen Chunks',
  server: 'liest die Serverwelt, auch ferne Chunks',
};

/** All three ways in the order they are tried, each with availability and reason. */
export function planScanRoutes(input: ScanRouteInput): ScanRoute[] {
  const route = (id: ScanRouteId, why: string | null): ScanRoute =>
    why ? { id, label: SCAN_ROUTE_LABEL[id], available: false, why, reach: REACH[id] } : { id, label: SCAN_ROUTE_LABEL[id], available: true, reach: REACH[id] };
  const m = input.mod;
  const modWhy = !m || !m.paired ? 'nicht mit dem Planer verbunden (Seite „Spiel“)'
    : m.features && !m.features.includes('scan') ? 'Mod zu alt für den Baustand (ab 0.7.1)'
    : m.hologramProjectId !== undefined && m.hologramProjectId !== input.projectId ? (m.hologramProjectId ? 'im Spiel ist ein anderer Plan platziert' : 'im Spiel ist kein Plan dieses Projekts platziert')
    : null;
  const roomWhy = !input.room.connected ? 'Team live ist nicht eingeschaltet'
    : input.room.games < 1 ? 'gerade ist kein Spiel im Team-Raum'
    : null;
  const serverWhy = input.server.paired ? null : 'kein Server gekoppelt (freiwillig)';
  return [route('mod', modWhy), route('room', roomWhy), route('server', serverWhy)];
}

/** One line for the result: which way worked and which were skipped or failed before. */
export function scanRouteSummary(used: ScanRouteId | null, failures: readonly { readonly id: ScanRouteId; readonly why: string }[]): string {
  const before = failures.map(f => `${SCAN_ROUTE_LABEL[f.id]}: ${f.why}`).join(' · ');
  if (!used) return `Kein Weg hat geklappt${before ? ` (${before})` : ''}. Prüfe, ob dein Spiel oder ein Mitspieler mit „Team live“ verbunden ist (Notfall ohne Internet: /bauplaner scan und „Notfall: Aufnahme-Datei“).`;
  return `Baustand über ${SCAN_ROUTE_LABEL[used]} geholt (${REACH[used]}).${before ? ` Vorher versucht: ${before}.` : ''}`;
}
