/**
 * PRIV-01: Domains von Server-Webkarten, die der Nutzer in diesem Browser freigegeben hat. Webkarten können über
 * den Team-Raum von anderen eingetragen werden; geöffnet oder eingebettet wird eine Karte erst, wenn ihre Domain
 * hier steht (eigene Eingabe zählt als Freigabe). Nur eine Ansichts-Einstellung, darum localStorage.
 */
const KEY = 'bauplaner.webkarten.freigegeben';
const MAX = 50;

/** Domain mit Port, klein geschrieben; '' wenn keine http(s)-Adresse. */
export function mapHostOf(url: string): string {
  try { const u = new URL(url.replace(/\{\w+\}/g, '0')); return /^https?:$/.test(u.protocol) ? u.host.toLowerCase() : ''; } catch { return ''; }
}

export function trustedMapHosts(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown; return Array.isArray(v) ? v.filter((h): h is string => typeof h === 'string' && !!h).slice(0, MAX) : []; } catch { return []; }
}
function save(list: readonly string[]) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch { /* privates Fenster: gilt nur jetzt */ } }

export function isTrustedMapHost(host: string): boolean { return !!host && (sessionTrusted.has(host) || trustedMapHosts().includes(host)); }
/** Merkt eine Domain (oder die Domain einer Adresse) als freigegeben. */
export function trustMapHost(hostOrUrl: string): void {
  const host = hostOrUrl.includes('/') ? mapHostOf(hostOrUrl) : hostOrUrl.toLowerCase();
  if (!host) return;
  sessionTrusted.add(host);
  const list = trustedMapHosts();
  if (!list.includes(host)) save([host, ...list]);
}
export function forgetMapHost(host: string): void { sessionTrusted.delete(host); save(trustedMapHosts().filter(h => h !== host)); }
const sessionTrusted = new Set<string>();
