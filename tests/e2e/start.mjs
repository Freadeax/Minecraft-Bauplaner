// Shared start waiter for the browser tests (03.11.2026). The first start of a
// fresh browser builds the shipped catalogue in the worker (several seconds,
// more on a slow machine); afterwards the cache makes it fast. Tests wait for
// the start screen with this generous limit instead of the 10 s default, so a
// larger catalogue does not break unrelated tests.
export const START_TIMEOUT = 90_000;
const SAMPLE = 'Beispielprojekt „Burgmauer“';

/**
 * Waits until the start screen offers the sample project and the library is seeded and loaded. Since PERF-07
 * the project centre shows before the catalogue; `html[data-library="bereit"]` marks the loaded library.
 */
export async function waitForStart(page, timeout = START_TIMEOUT) {
  await page.getByRole('button', { name: SAMPLE }).waitFor({ timeout });
  await page.locator('html[data-library="bereit"]').waitFor({ state: 'attached', timeout });
}

/** Waits for the start screen, then opens the sample project „Burgmauer“. */
export async function openSampleProject(page, timeout = START_TIMEOUT) {
  await waitForStart(page, timeout);
  await page.getByRole('button', { name: SAMPLE }).click();
}

/** UX-01: klappt „Speicher & Sicherung“ in der Projektzentrale auf (bleibt offen, wenn schon offen). */
export async function openStorage(page) {
  await page.locator('details.storage-more').evaluate(d => { d.open = true; });
}

/**
 * Block 5: „Verbindung abgelehnt“ in allen Engines (Chromium, Firefox, WebKit). Der Planer fragt die Mod auf
 * 127.0.0.1 ab; ohne laufende Mod ist das erwartet und kein Fehler.
 */
export const REFUSED = /ERR_CONNECTION_REFUSED|Could not connect to (127\.0\.0\.1|localhost)|NS_ERROR_CONNECTION_REFUSED|resource at http:\/\/(127\.0\.0\.1|localhost):\d+\/.*CORS request did not succeed/;

/**
 * Block 5: Meldungen, die nur WebKit unter Playwright als Seitenfehler meldet, ohne dass die Seite etwas falsch macht:
 * - Playwright fängt Downloads ab; WebKit meldet das abgebrochene Laden der blob:-Adresse („Cannot load blob … due to
 *   access control checks“).
 * - Beim Verlassen einer Seite mitten in einer Hintergrundarbeit meldet das alte Dokument „Context is stopped“.
 * Nur in Tests mit Download bzw. schnellem Seitenwechsel herausfiltern.
 */
export const WEBKIT_NOISE = /^(Cannot load blob:)?h?ttp:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]{36} due to access control checks\.$|^Context is stopped$|127\.0\.0\.1:\d+\/Minecraft-Bauplaner\/assets\/[\w.-]+\.worker-[\w-]+\.js due to access control checks\.$/;
