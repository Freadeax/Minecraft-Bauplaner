import { hostOf } from '../app/dataFlows';

/**
 * PRIV-01: GitHub Pages und Cloudflare Pages sind zwei Adressen mit getrenntem Browser-Speicher. Der Umzug
 * geht nur über eine Sicherungsdatei: hier herunterladen, die andere Adresse öffnen, dort wiederherstellen.
 * `empty`: in diesem Browser gibt es hier noch keine Projekte (dann der Hinweis „Kommst du von …?“).
 */
export function HostMove({ onBackupAll, busy, empty, origin = location.origin }: { onBackupAll(): void; busy: boolean; empty: boolean; origin?: string }) {
  const hosts = hostOf(origin);
  if (!hosts) return null;
  const { here, other } = hosts;
  const otherUrl = `${other.origin}${other.path}#/`;
  return <section className="host-move" aria-label="Umzug zwischen den Adressen" data-host={here.id}>
    <span className="panel-kicker">UMZUG ZWISCHEN DEN ADRESSEN</span>
    <p className="muted">Du bist auf <b>{here.label}</b> ({here.origin.replace('https://', '')}). {other.label} ({other.origin.replace('https://', '')}) ist dieselbe App, hat aber einen eigenen Speicher: Projekte von hier sind dort nicht zu sehen.
      {empty && <> Fehlen hier deine Projekte, liegen sie vermutlich auf {other.label}: dort eine Gesamtsicherung herunterladen und hier unter „Sicherung wiederherstellen …“ öffnen.</>}</p>
    <ol className="host-steps">
      <li><button type="button" onClick={onBackupAll} disabled={busy || empty}>Gesamtsicherung herunterladen</button> {empty ? '(hier gibt es noch nichts zu sichern)' : '(hier auf ' + here.label + ')'}</li>
      <li><a href={otherUrl} target="_blank" rel="noopener">{other.label} öffnen ↗</a></li>
      <li>Dort „Speicher &amp; Sicherung“ → „Sicherung wiederherstellen …“ und die Datei wählen. Vorhandene Projekte dort bleiben erhalten; gleiche Projekte werden als Kopie angelegt.</li>
    </ol>
  </section>;
}
