// Browser-Schutz für die ausgelieferte Seite (RELEASE-01, docs/architecture/betrieb/SICHERHEITSHEADER.md).
// Eine Quelle für drei Stellen: `_headers` auf Cloudflare Pages (publish_cloudflare.mjs), die lokale
// Header-Probe im Browser (tests/e2e/security-headers.e2e.mjs) und den Release-Check gegen die Live-Seite
// (scripts/checks/release_check.mjs). GitHub Pages erlaubt keine eigenen Header; dort gelten nur die
// Meta-Richtlinie in index.html und der Einbettungsschutz im Programm.

/** Team-Raum des Projekts (apps/web/src/views/project/team/roomClient.ts DEFAULT_ROOM_URL). */
export const TEAM_ROOM_ORIGIN = 'https://bauplaner-team.team-room.workers.dev';

/**
 * Verbindungsziele der Seite. Alles andere ist ein Verstoß, den der Report-Only-Modus zunächst nur meldet:
 * - eigener Ursprung (Programm, Katalog, deployment.json, Mod-Downloads)
 * - Team-Raum per HTTPS und WebSocket
 * - die Mod auf diesem Rechner (nur 127.0.0.1/localhost, Freigabe im Spiel)
 * - Mojang für das optionale Original-Texturpaket (Versionsliste und Client-Jar)
 */
export const CONNECT_SRC = Object.freeze([
  "'self'",
  TEAM_ROOM_ORIGIN, TEAM_ROOM_ORIGIN.replace(/^https:/, 'wss:'),
  'http://127.0.0.1:*', 'ws://127.0.0.1:*', 'http://localhost:*', 'ws://localhost:*',
  'https://piston-meta.mojang.com', 'https://piston-data.mojang.com',
]);

/** Vollständige Richtlinie, zuerst nur als Report-Only (meldet, blockiert nichts). */
export const CSP_DIRECTIVES = Object.freeze({
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  // React setzt style-Attribute (Farben, Positionen); ohne 'unsafe-inline' fiele die Darstellung aus.
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': [...CONNECT_SRC],
  'worker-src': ["'self'", 'blob:'],
  'media-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
  // Live-Karten (BlueMap, Dynmap, Pl3xMap) liegen auf dem Server der Spieler; eingebettet wird nur HTTPS.
  'frame-src': ['https:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
});

const render = directives => Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ');
export const CSP_REPORT_ONLY = render(CSP_DIRECTIVES);
/** Sofort durchgesetzt: nichts davon braucht die Seite, alles davon schützt vor Einbettung und Fremdcode. */
export const CSP_ENFORCED = render({ 'frame-ancestors': ["'none'"], 'object-src': ["'none'"], 'base-uri': ["'self'"] });
/** Für <meta http-equiv> (GitHub Pages): frame-ancestors und Report-Only wirken dort nicht. */
export const CSP_META = render({ 'object-src': ["'none'"], 'base-uri': ["'self'"] });

/** Browser-Funktionen, die die Seite nicht nutzt, bleiben auch für eingebettete Karten gesperrt. */
export const PERMISSIONS_POLICY = [
  'accelerometer=()', 'ambient-light-sensor=()', 'autoplay=()', 'bluetooth=()', 'browsing-topics=()', 'camera=()',
  'display-capture=()', 'geolocation=()', 'gyroscope=()', 'hid=()', 'magnetometer=()', 'microphone=()', 'midi=()',
  'payment=()', 'publickey-credentials-get=()', 'serial=()', 'usb=()', 'xr-spatial-tracking=()', 'fullscreen=(self)',
].join(', ');

/** Ein Jahr; pages.dev-Unteradressen (Vorschauen) laufen ebenfalls nur über HTTPS. */
export const HSTS = 'max-age=31536000; includeSubDomains';

/** Header für jede Antwort der Seite. */
export const SECURITY_HEADERS = Object.freeze({
  'Strict-Transport-Security': HSTS,
  'Content-Security-Policy': CSP_ENFORCED,
  'Content-Security-Policy-Report-Only': CSP_REPORT_ONLY,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': PERMISSIONS_POLICY,
  'Cross-Origin-Opener-Policy': 'same-origin',
});

/** Erwartung je Adresse für den Release-Check; `limit` erklärt, warum ein Header dort fehlen darf. */
export const LIVE_TARGETS = Object.freeze([
  { name: 'Cloudflare Pages', url: 'https://bauplaner.pages.dev/Minecraft-Bauplaner/', http: 'http://bauplaner.pages.dev/Minecraft-Bauplaner/', expect: Object.keys(SECURITY_HEADERS) },
  {
    name: 'GitHub Pages', url: 'https://freadeax.github.io/Minecraft-Bauplaner/', http: 'http://freadeax.github.io/Minecraft-Bauplaner/',
    expect: ['Strict-Transport-Security'],
    limit: 'GitHub Pages setzt keine eigenen Header: CSP nur als Meta (object-src, base-uri), Einbettungsschutz im Programm.',
  },
]);
