import { useState } from 'react';
import type { ReactNode } from 'react';
import { isTrustedMapHost, mapHostOf, trustMapHost } from './mapHosts';

/**
 * PRIV-01: Link auf eine Server-Webkarte. Ist die Domain noch nicht freigegeben, zeigt der Knopf zuerst die
 * Zieldomain und öffnet erst nach Bestätigung (die Domain wird dann für diesen Browser gemerkt).
 */
export function MapLink({ url, children, className }: { url: string; children: ReactNode; className?: string }) {
  const host = mapHostOf(url);
  const [, setTick] = useState(0);
  const [asking, setAsking] = useState(false);
  if (!host) return null;
  if (isTrustedMapHost(host)) return <a className={className} href={url} target="_blank" rel="noreferrer noopener">{children}</a>;
  return <span className="map-link-ask">
    <button type="button" className={className ?? 'link-button'} onClick={() => setAsking(a => !a)} aria-expanded={asking}>{children}</button>
    {asking && <MapHostConfirm host={url} onDone={ok => { setAsking(false); if (ok) { setTick(t => t + 1); window.open(url, '_blank', 'noopener,noreferrer'); } }} />}
  </span>;
}

/** Bestätigung „fremde Seite öffnen“ mit Domain; `host` darf auch eine ganze Adresse sein. */
export function MapHostConfirm({ host, onDone, action = 'Öffnen' }: { host: string; onDone(ok: boolean): void; action?: string }) {
  const h = host.includes('/') ? mapHostOf(host) : host;
  const insecure = /^http:\/\//i.test(host);
  return <span className="notice map-host-confirm" role="note" data-map-host={h}>
    Fremde Seite: <b>{h}</b>. Diese Webkarte gehört nicht zum Build Studio; ihr Betreiber sieht deine IP-Adresse und die Koordinaten in der Adresse.{insecure && ' Die Verbindung ist unverschlüsselt (http).'} Nur öffnen, wenn du die Domain kennst.
    <span className="button-row"><button type="button" className="primary" onClick={() => { trustMapHost(h); onDone(true); }}>{action} und Domain merken</button>
      <button type="button" onClick={() => onDone(false)}>Abbrechen</button></span>
  </span>;
}
