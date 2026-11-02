/**
 * Diagnose für Fehlerberichte der Testphase (QA-04). Ergänzt das Fehlerprotokoll (errorLog.ts) um
 * Konsolenwarnungen, die zuletzt besuchten Seiten und eine Umgebungsbeschreibung (Build, Browser,
 * Grafik, Speicher). Alles bleibt im Speicher dieses Tabs; gesendet wird nichts. Der Bericht enthält
 * keine Projektdaten, nur Seitenadressen (mit Projekt-IDs) und Zahlen.
 */
import { loggedErrors } from './errorLog.ts';
import type { LoggedError } from './errorLog.ts';

export interface ConsoleEntry { readonly at: string; readonly level: 'warn' | 'error'; readonly text: string }
export interface RouteVisit { readonly at: string; readonly route: string }

const MAX_CONSOLE = 60, MAX_ROUTES = 25;
const consoleEntries: ConsoleEntry[] = [];
const routes: RouteVisit[] = [];

function stringify(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value)?.slice(0, 300) ?? String(value); } catch { return String(value); }
}

/** Nimmt einen Konsoleneintrag auf (auch für Tests direkt aufrufbar). */
export function recordConsole(level: ConsoleEntry['level'], args: readonly unknown[]): void {
  consoleEntries.push({ at: new Date().toISOString(), level, text: args.map(stringify).join(' ').slice(0, 600) });
  if (consoleEntries.length > MAX_CONSOLE) consoleEntries.splice(0, consoleEntries.length - MAX_CONSOLE);
}

export function recordRoute(route: string): void {
  if (routes.at(-1)?.route === route) return;
  routes.push({ at: new Date().toISOString(), route });
  if (routes.length > MAX_ROUTES) routes.splice(0, routes.length - MAX_ROUTES);
}

export const consoleLog = (): readonly ConsoleEntry[] => consoleEntries.slice();
export const routeHistory = (): readonly RouteVisit[] => routes.slice();

let installed = false;
/** Hängt sich an console.warn/error und an Seitenwechsel; idempotent, die Originalausgabe bleibt. */
export function installDiagnostics(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  for (const level of ['warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => { try { recordConsole(level, args); } catch { /* nie die Ausgabe verhindern */ } original(...args); };
  }
  recordRoute(location.hash || '#/');
  window.addEventListener('hashchange', () => recordRoute(location.hash || '#/'));
}

/** Umgebung als geordnete Liste „Bezeichnung → Wert“. */
export type Environment = ReadonlyArray<readonly [string, string]>;

export interface EnvironmentInput {
  readonly build?: { readonly sourceCommit?: string; readonly builtAt?: string } | null;
  readonly repoKind?: string;
  readonly projects?: number | undefined;
  readonly ownAssets?: number | undefined;
}

function webgl(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'keine';
    const version = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'WebGL 2' : 'WebGL 1';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    return `${version} · ${renderer} · max. Textur ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`;
  } catch { return 'nicht ermittelbar'; }
}

const mb = (n: number) => `${Math.round(n / 1_048_576).toLocaleString('de-DE')} MB`;

/** Liest Browser, Gerät, Grafik und Speicher aus; nichts davon verlässt den Rechner. */
export async function collectEnvironment(input: EnvironmentInput = {}): Promise<Environment> {
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] } };
  let storage = 'unbekannt';
  try {
    const est = await navigator.storage?.estimate?.();
    const persisted = await navigator.storage?.persisted?.();
    if (est?.usage !== undefined) storage = `${mb(est.usage)}${est.quota ? ` von ${mb(est.quota)}` : ''}${persisted === undefined ? '' : persisted ? ' · geschützt' : ' · nicht geschützt'}`;
  } catch { /* bleibt unbekannt */ }
  const build = input.build;
  const brands = nav.userAgentData?.brands?.filter(b => !/Not.?A.?Brand/i.test(b.brand)).map(b => `${b.brand} ${b.version}`).join(', ');
  return [
    ['Build', build?.sourceCommit ? `${build.sourceCommit.slice(0, 7)}${build.builtAt ? ` (${build.builtAt})` : ''}` : 'unbekannt (Entwicklung oder Manifest fehlt)'],
    ['Adresse', `${location.origin}${location.pathname}`],
    ['Seite', location.hash || '#/'],
    ['Browser', brands ? `${brands} · ${navigator.userAgent}` : navigator.userAgent],
    ['System', nav.userAgentData?.platform ?? navigator.platform ?? 'unbekannt'],
    ['Sprache / Zeitzone', `${navigator.language} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`],
    ['Bildschirm', `${screen.width}×${screen.height} · Fenster ${innerWidth}×${innerHeight} · Pixeldichte ${devicePixelRatio}`],
    ['Eingabe', navigator.maxTouchPoints > 0 ? `Touch (${navigator.maxTouchPoints} Punkte)` : 'Maus/Tastatur'],
    ['Rechenkerne / Arbeitsspeicher', `${navigator.hardwareConcurrency ?? '?'} / ${nav.deviceMemory ? `${nav.deviceMemory} GB` : '?'}`],
    ['Grafik', webgl()],
    ['Speicher', storage],
    ['Speicherart', input.repoKind === 'indexeddb' ? 'IndexedDB (dauerhaft)' : input.repoKind ? `${input.repoKind} (nur Sitzung)` : 'unbekannt'],
    ['Projekte / eigene Bauteile', `${input.projects ?? '?'} / ${input.ownAssets ?? '?'}`],
    ['Farbschema', document.documentElement.dataset.theme ?? 'automatisch'],
    ['Online', navigator.onLine ? 'ja' : 'nein'],
  ];
}

export interface BugInput {
  readonly title: string;
  readonly area: string;
  readonly severity: string;
  readonly caseId?: string;
  readonly steps: string;
  readonly expected: string;
  readonly actual: string;
  readonly tester?: string;
}

export const SEVERITIES = ['Absturz / Datenverlust', 'Funktion geht nicht', 'Falsches Ergebnis', 'Darstellung / Text', 'Idee / Wunsch'] as const;

const fence = (text: string) => `\`\`\`\n${text.replaceAll('```', "'''")}\n\`\`\``;

/** Nur der automatische Teil: Umgebung, Fehlerprotokoll, Konsole, letzte Seiten. */
export function diagnosisText(env: Environment, errors: readonly LoggedError[] = loggedErrors(), log: readonly ConsoleEntry[] = consoleLog(), visits: readonly RouteVisit[] = routeHistory()): string {
  const time = (iso: string) => iso.slice(11, 19);
  return [
    '### Umgebung',
    ...env.map(([k, v]) => `- ${k}: ${v}`),
    '',
    `### Fehlerprotokoll (${errors.length})`,
    errors.length ? fence(errors.map((e, i) => `#${i + 1} ${time(e.at)} [${e.source}] ${e.route}\n${e.message}${e.detail ? `\n${e.detail}` : ''}`).join('\n\n')) : 'Keine Fehler in dieser Sitzung.',
    '',
    `### Konsole (${log.length} Warnungen/Fehler)`,
    log.length ? fence(log.map(e => `${time(e.at)} ${e.level === 'error' ? 'FEHLER' : 'Warnung'}: ${e.text}`).join('\n')) : 'Keine.',
    '',
    '### Zuletzt besuchte Seiten',
    visits.length ? visits.map(v => `- ${time(v.at)} ${v.route}`).join('\n') : '- keine erfasst',
  ].join('\n');
}

/** Vollständiger Fehlerbericht als Markdown (für GitHub-Issue, Nachricht oder Datei). */
export function bugReport(bug: BugInput, diagnosis: string, at = new Date()): string {
  return [
    `## ${bug.title.trim() || 'Fehler in der Testphase'}`,
    `- Bereich: ${bug.area || '–'}`,
    `- Schwere: ${bug.severity || '–'}`,
    ...(bug.caseId ? [`- Testfall: ${bug.caseId}`] : []),
    ...(bug.tester?.trim() ? [`- Tester: ${bug.tester.trim()}`] : []),
    `- Zeit: ${at.toISOString()}`,
    '',
    '### Was ich gemacht habe',
    bug.steps.trim() || '–',
    '',
    '### Erwartet',
    bug.expected.trim() || '–',
    '',
    '### Tatsächlich',
    bug.actual.trim() || '–',
    '',
    '## Diagnose (automatisch erfasst, ohne Projektdaten)',
    diagnosis,
  ].join('\n');
}

/** GitHub lehnt sehr lange Adressen ab; darüber wird die Diagnose gekürzt und auf die Datei verwiesen. */
export const ISSUE_URL_LIMIT = 7_500;

/**
 * Adresse für ein neues GitHub-Issue mit der Vorlage „Testphase: Planer“; füllt Titel und Felder vor
 * (GitHub-Issue-Formulare nehmen Feldwerte als Parameter mit der Feld-ID).
 */
export function issueUrl(repoUrl: string, bug: BugInput, diagnosis: string): { url: string; truncated: boolean } {
  const build = (diag: string) => {
    const params = new URLSearchParams({
      template: 'testphase-planer.yml',
      title: `[Planer] ${bug.title.trim() || 'Fehler'}`,
      bereich: bug.area,
      schwere: bug.severity,
      testfall: bug.caseId ?? '',
      schritte: bug.steps,
      erwartet: bug.expected,
      tatsaechlich: bug.actual,
      diagnose: diag,
    });
    return `${repoUrl}/issues/new?${params.toString()}`;
  };
  let url = build(diagnosis);
  if (url.length <= ISSUE_URL_LIMIT) return { url, truncated: false };
  const note = '\n\n… gekürzt. Vollständige Diagnose: im Planer unter „Testphase → Fehler melden“ als Datei speichern und hier anhängen.';
  let keep = diagnosis.length;
  while (keep > 0) {
    keep = Math.floor(keep * 0.8);
    url = build(diagnosis.slice(0, keep) + note);
    if (url.length <= ISSUE_URL_LIMIT) return { url, truncated: true };
  }
  return { url: build(note.trim()), truncated: true };
}
