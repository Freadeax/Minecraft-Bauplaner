/** Team-Raum of the project (Cloudflare worker bauplaner-team, services/team-room). Without imports: the mod and map views use it too. */
export const DEFAULT_ROOM_URL = 'https://bauplaner-team.team-room.workers.dev';
/**
 * RELEASE-01 (Philipp 10.11.2026: „Nur der Projekt-Raum“): the page talks to the project's team room only, the
 * Content-Security-Policy allows no other address. A local room on 127.0.0.1/localhost stays possible for development
 * and the browser tests. Must match connect-src in scripts/pages/security_headers.mjs.
 */
export const LOCAL_ROOM = /^http:\/\/(127\.0\.0\.1|localhost)(:\d{1,5})?$/;
export const roomUrlAllowed = (url: string): boolean => { const u = url.trim().replace(/\/+$/, ''); return u === DEFAULT_ROOM_URL || LOCAL_ROOM.test(u); };
export const ROOM_URL_REFUSED = `Diese Seite verbindet sich nur mit dem Team-Raum des Build Studios (${DEFAULT_ROOM_URL.replace('https://', '')}). Eigene Team-Raum-Adressen sind aus Sicherheitsgründen gesperrt.`;
