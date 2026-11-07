import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { DATA_FLOWS, HOSTS, hostOf } from '../app/dataFlows';
import type { StorageInfo } from '../app/repository';
import { storageRisk } from '../app/StorageWarning';
import { trustedMapHosts, forgetMapHost } from './map/mapHosts';
import '../styles/privacy.css';

const mb = (b: number) => `${(b / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;

/**
 * PRIV-01 „Datenschutz und Freigaben“ (#/datenschutz): jeder Datenweg mit was, wohin, wer, wie lange und wie
 * man ihn zurücknimmt; Speicherzustand dieses Browsers; Umzug zwischen GitHub Pages und Cloudflare Pages;
 * freigegebene Webkarten-Domains.
 */
export function PrivacyView() {
  const { repo } = useApp();
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [hosts, setHosts] = useState(trustedMapHosts);
  const [note, setNote] = useState('');
  useEffect(() => { void repo.storageInfo().then(setInfo).catch(() => setInfo({})); }, [repo]);
  const risk = info ? storageRisk(info, repo.kind) : null;
  const here = hostOf(location.origin);
  const persist = async () => {
    const ok = await repo.requestPersistence();
    setInfo(await repo.storageInfo().catch(() => ({})));
    setNote(ok ? 'Der Browser hält die Daten jetzt dauerhaft vor.' : 'Der Browser hat dauerhaftes Speichern nicht gewährt. Sicherungsdateien bleiben wichtig.');
  };
  return <div className="page privacy-page">
    <div className="page-head"><div><span className="eyebrow">DATENSCHUTZ UND FREIGABEN</span><h1 className="page-title">Was geht wohin?</h1>
      <p className="muted">Ohne Team bleibt alles in diesem Browser: keine Anmeldung, kein Konto, kein Welt-Upload. Ins Internet geht nur, was du im Team ausdrücklich teilst. An jeder Freigabe im Planer steht derselbe Hinweis wie hier.</p></div></div>

    <section aria-labelledby="priv-storage" className="system-card">
      <h2 id="priv-storage">Speicher in diesem Browser</h2>
      <p>{repo.kind === 'memory' ? 'Nur Sitzungsspeicher: nach dem Schließen ist alles weg.' : 'Projekte liegen in IndexedDB dieses Browsers.'}
        {info?.usage !== undefined && ` Belegt: ${mb(info.usage)}${info.quota ? ` von ${mb(info.quota)}` : ''}.`}
        {info?.persisted === true && ' Vor Löschen geschützt (dauerhafter Speicher gewährt).'}</p>
      {risk && <p className={risk.level === 'evictable' ? 'muted' : 'warn-text'} data-storage-risk={risk.level}>{risk.text}</p>}
      <div className="button-row">
        {repo.kind === 'indexeddb' && info?.persisted === false && <button className="secondary" onClick={() => void persist()}>Dauerhaft speichern anfragen</button>}
        <a className="secondary button-link" href="#/">Zur Sicherung (Projektzentrale → Speicher &amp; Sicherung)</a>
      </div>
      {note && <p className="muted" role="status">{note}</p>}
      <p className="muted small">Eine Sicherungsdatei ist die einzige Kopie außerhalb dieses Browsers. Der Planer merkt sich, wann er eine erzeugt hat, kann aber nicht prüfen, wo sie liegt.</p>
    </section>

    <section aria-labelledby="priv-hosts" className="system-card">
      <h2 id="priv-hosts">Zwei Adressen, zwei Speicher</h2>
      <p>Der Planer läuft unter {HOSTS.map((h, i) => <span key={h.id}>{i > 0 && ' und '}<a href={`${h.origin}${h.path}`} rel="noopener">{h.label}</a></span>)}. Beide liefern dasselbe Programm, aber jeder Browser-Speicher gehört zu genau einer Adresse.
        {here ? ` Du bist gerade auf ${here.here.label}.` : ' Diese Adresse ist eine lokale oder eigene Kopie mit eigenem Speicher.'}</p>
      <ol className="host-steps">
        <li>Auf der alten Adresse: Projektzentrale → „Speicher &amp; Sicherung“ → „Alles sichern“.</li>
        <li>Die neue Adresse öffnen{here && <> (<a href={`${here.other.origin}${here.other.path}#/`} rel="noopener">{here.other.label} öffnen ↗</a>)</>}.</li>
        <li>Dort „Sicherung wiederherstellen …“ und die Datei wählen. Nichts wird überschrieben: gleiche, aber geänderte Projekte kommen als Kopie dazu.</li>
      </ol>
      <p className="muted small">Team-Räume, die Mod-Kopplung und freigegebene Webkarten gehören ebenfalls zur Adresse: Nach dem Umzug einmal „Mein Spiel verbinden“ und auf der Weltkarte die Kopplung erneuern.</p>
    </section>

    <section aria-labelledby="priv-flows">
      <h2 id="priv-flows">Alle Datenwege</h2>
      <ul className="flow-list">{DATA_FLOWS.map(f => <li key={f.id} id={`weg-${f.id}`} className="flow-card" data-flow={f.id}>
        <h3>{f.title} <span className={`flow-badge ${f.online ? 'online' : 'local'}`}>{f.online ? 'über das Internet' : 'nur dieses Gerät'}</span></h3>
        <dl>
          <div><dt>Was</dt><dd>{f.what}</dd></div>
          <div><dt>Wohin</dt><dd>{f.where}</dd></div>
          <div><dt>Wer sieht es</dt><dd>{f.who}</dd></div>
          <div><dt>Wie lange</dt><dd>{f.keep}</dd></div>
          <div><dt>Zurücknehmen</dt><dd>{f.stop}</dd></div>
        </dl>
      </li>)}</ul>
    </section>

    <section aria-labelledby="priv-maps" className="system-card">
      <h2 id="priv-maps">Freigegebene Webkarten-Domains</h2>
      <p className="muted">Eine Server-Webkarte öffnet oder bettet der Planer erst ein, nachdem du ihre Domain einmal bestätigt hast. Das gilt nur in diesem Browser.</p>
      {hosts.length ? <ul>{hosts.map(h => <li key={h}><code>{h}</code> <button className="text-button" onClick={() => { forgetMapHost(h); setHosts(trustedMapHosts()); }}>Freigabe entfernen</button></li>)}</ul>
        : <p className="muted">Noch keine.</p>}
    </section>
  </div>;
}
