/**
 * Session error log (S-01). Collects render crashes, uncaught errors and
 * unhandled promise rejections in memory so the Systemcheck page can show
 * them and the user can copy a report. Nothing is sent anywhere or stored.
 */
export interface LoggedError {
  readonly at: string;
  readonly source: 'render' | 'error' | 'promise';
  readonly message: string;
  readonly detail?: string;
  /** Hash route active when the error happened. */
  readonly route: string;
}

const MAX = 50;
const entries: LoggedError[] = [];
const listeners = new Set<() => void>();

export function logError(source: LoggedError['source'], error: unknown, detail?: string): LoggedError {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const stack = error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 8).join('\n') : undefined;
  const extra = detail ?? stack;
  const entry: LoggedError = { at: new Date().toISOString(), source, message, route: location.hash || '#/', ...(extra !== undefined && { detail: extra }) };
  entries.push(entry);
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
  listeners.forEach(l => l());
  return entry;
}

export const loggedErrors = (): readonly LoggedError[] => entries.slice();
export function onErrorLogged(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function clearErrors(): void { entries.length = 0; listeners.forEach(l => l()); }

let installed = false;
/** Records uncaught errors and unhandled rejections; idempotent. */
export function installErrorCapture(): void {
  if (installed) return;
  installed = true;
  window.addEventListener('error', e => { logError('error', e.error ?? e.message, e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined); });
  window.addEventListener('unhandledrejection', e => { logError('promise', e.reason); });
}

/** Plain-text report for bug reports; contains no project data. */
export function errorReport(list: readonly LoggedError[], build?: { sourceCommit?: string; builtAt?: string }): string {
  const head = [
    'Minecraft-Bauplaner Fehlerbericht',
    `Zeit: ${new Date().toISOString()}`,
    `Build: ${build?.sourceCommit?.slice(0, 7) ?? 'unbekannt'}${build?.builtAt ? ` (${build.builtAt})` : ''}`,
    `Browser: ${navigator.userAgent}`,
    `Seite: ${location.hash || '#/'}`,
  ];
  const body = list.map((e, i) => `#${i + 1} ${e.at} [${e.source}] ${e.route}\n${e.message}${e.detail ? `\n${e.detail}` : ''}`);
  return [...head, '', ...(body.length ? body : ['Keine Fehler in dieser Sitzung.'])].join('\n');
}
