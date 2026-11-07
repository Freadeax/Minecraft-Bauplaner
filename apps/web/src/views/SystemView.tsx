import { useCallback, useEffect, useState } from 'react';
import { buildPlanGraph, cellStorageEstimate, checkIntegrity, lazyCellsStatus, INTEGRITY_SEVERITY_LABEL, PLAN_KIND_LABEL, sha256Hex } from '../../../../packages/domain/src/index.js';
import type { IntegrityReport, PlanNodeKind } from '../../../../packages/domain/src/index.js';
import '../styles/datamodel.css';
import { useApp } from '../app/context';
import { parseManifest, verifyDelivery } from '../app/delivery';
import type { DeliveryResult, DeploymentManifest } from '../app/delivery';
import { clearErrors, errorReport, loggedErrors, onErrorLogged } from '../app/errorLog';
import { offlineState, setOffline } from '../app/offline';
import type { OfflineState } from '../app/offline';
import type { StorageInfo } from '../app/repository';
import { errorText, formatNumber } from '../app/ui';
import { deviceSummary } from '../app/diagnostics';

const mb = (n: number) => `${(n / 1_048_576).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
const base = import.meta.env.BASE_URL;

interface Capability { readonly name: string; readonly ok: boolean; readonly note: string }
function capabilities(kind: string): Capability[] {
  const canvas = document.createElement('canvas');
  let webgl = 'keine';
  try { webgl = canvas.getContext('webgl2') ? 'WebGL 2' : canvas.getContext('webgl') ? 'WebGL 1' : 'keine'; } catch { /* reported as none */ }
  return [
    { name: 'Dauerhafter Speicher (IndexedDB)', ok: kind === 'indexeddb', note: kind === 'indexeddb' ? 'aktiv' : 'nur Sitzungsspeicher – Daten gehen beim Schließen verloren' },
    { name: '3D-Grafik', ok: webgl !== 'keine', note: webgl === 'keine' ? 'nicht verfügbar – isometrische Ersatzansicht' : webgl },
    { name: 'Hintergrund-Import (Web Worker)', ok: typeof Worker !== 'undefined', note: typeof Worker !== 'undefined' ? 'verfügbar' : 'fehlt – Dateiimport nicht möglich' },
    { name: 'Prüfsummen (Web Crypto)', ok: !!globalThis.crypto?.subtle, note: globalThis.crypto?.subtle ? 'verfügbar' : 'fehlt – Sicherungen nicht prüfbar (nur über HTTPS verfügbar)' },
    { name: 'Entpacken im Browser', ok: typeof DecompressionStream !== 'undefined', note: typeof DecompressionStream !== 'undefined' ? 'DecompressionStream' : 'fehlt – Schem/Litematic-Import nicht möglich' },
    { name: 'Zwischenablage', ok: !!navigator.clipboard, note: navigator.clipboard ? 'verfügbar' : 'nicht verfügbar – Bericht manuell markieren' },
  ];
}

/** Offline-Speicher (PERF-06): is the app kept in the browser, which version, switch it off or on. */
function OfflineCard() {
  const [state, setState] = useState<OfflineState | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => { void offlineState().then(setState, () => setState(null)); }, []);
  useEffect(refresh, [refresh]);
  const toggle = async (on: boolean) => { setBusy(true); try { await setOffline(on); } finally { setBusy(false); setTimeout(refresh, on ? 1500 : 0); } };
  return <section className="system-card" aria-labelledby="sys-offline" data-offline={state?.active ? 'aktiv' : 'aus'}>
    <h2 id="sys-offline">Offline-Speicher</h2>
    <p className="muted">Hält die Programmdateien im Browser: Start ohne erneutes Laden, auch ohne Internet. Nach einem Update werden nur geänderte Dateien geholt. Projekte liegen davon unabhängig im Speicher unten.</p>
    {!state ? <p className="muted">Wird geprüft …</p> : !state.supported
      ? <p className="muted">Nicht verfügbar (Entwicklungsumgebung oder Browser ohne Service Worker).</p>
      : <>
        <dl className="system-facts">
          <div><dt>Zustand</dt><dd>{state.active ? 'aktiv' : state.switchedOff ? 'ausgeschaltet' : 'wird eingerichtet'}</dd></div>
          {state.version && <div><dt>Programmstand</dt><dd><code>{state.version}</code></dd></div>}
          {state.files !== undefined && <div><dt>Gespeichert</dt><dd>{formatNumber(state.files)} Dateien{state.bytes ? `, ${mb(state.bytes)}` : ''}</dd></div>}
        </dl>
        <div className="button-row">
          {state.switchedOff
            ? <button onClick={() => void toggle(true)} disabled={busy}>Offline-Speicher einschalten</button>
            : <button onClick={() => void toggle(false)} disabled={busy}>Offline-Speicher leeren und ausschalten</button>}
        </div>
      </>}
  </section>;
}

interface DataModelFacts {
  readonly counts: Readonly<Record<PlanNodeKind, number>>;
  readonly references: number;
  readonly dangling: number;
  readonly cells: ReturnType<typeof cellStorageEstimate>;
  /** Library versions whose cells are unpacked in memory right now (compact runtime form). */
  readonly resident: ReturnType<typeof lazyCellsStatus>;
}

const KINDS: readonly PlanNodeKind[] = ['project', 'asset', 'version', 'original', 'collection', 'template'];

/** Datenmodell (ARCH-02): records per kind, references between them and how compactly block data is stored. */
function DataModelCard({ model, storedAs }: { model: DataModelFacts | null; storedAs: string }) {
  return <section className="system-card system-wide datamodel" aria-labelledby="sys-model">
    <h2 id="sys-model">Datenmodell</h2>
    <p className="muted">Was gespeichert ist und wie es zusammenhängt: Projekte platzieren feste Bauteilversionen, Vorlagen und Sammlungen verweisen auf Bauteile, Aufnahmen und Gelände auf Originaldateien. Die Zahlen erscheinen nach dem Datencheck.</p>
    {model ? <>
      <ul className="datamodel-counts">{KINDS.map(k => <li key={k} data-kind={k}><b>{formatNumber(model.counts[k])}</b><span>{PLAN_KIND_LABEL[k]}</span></li>)}</ul>
      <dl className="system-facts">
        <div><dt>Verweise zwischen Datensätzen</dt><dd>{formatNumber(model.references)}{model.dangling ? ` · ${formatNumber(model.dangling)} ins Leere` : ' · alle aufgelöst'}</dd></div>
        <div><dt>Blockzellen in allen Versionen</dt><dd>{formatNumber(model.cells.cells)}</dd></div>
        <div><dt>Blockdaten als Einzelobjekte</dt><dd>{mb(model.cells.plainBytes)}</dd></div>
        <div><dt>Blockdaten gepackt ({storedAs})</dt><dd data-packed-bytes={model.cells.packedBytes}>{mb(model.cells.packedBytes)}{model.cells.plainBytes ? ` · ${Math.max(1, Math.round(model.cells.plainBytes / Math.max(1, model.cells.packedBytes)))}× kleiner` : ''}</dd></div>
        {model.cells.unpackable > 0 && <div><dt>Ungepackt gespeichert</dt><dd>{formatNumber(model.cells.unpackable)} Version(en)</dd></div>}
        <div><dt>Im Arbeitsspeicher entpackt</dt><dd data-resident-cells={model.resident.cells}>{formatNumber(model.resident.cells)} Zellen aus {formatNumber(model.resident.versions)} Version(en) · Grenze {formatNumber(model.resident.budget)}{model.resident.packedBack ? ` · ${formatNumber(model.resident.packedBack)}× wieder eingepackt` : ''}</dd></div>
      </dl>
    </> : <p className="muted">Noch nicht ermittelt.</p>}
  </section>;
}

/** Systemcheck (S-01…S-03): build delivery, browser capabilities, storage, data check and session error log. */
export function SystemView() {
  const { repo, library } = useApp();
  const [storage, setStorage] = useState<StorageInfo>({});
  const [manifest, setManifest] = useState<DeploymentManifest | null>(null);
  const [manifestError, setManifestError] = useState('');
  const [delivery, setDelivery] = useState<DeliveryResult | null>(null);
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [model, setModel] = useState<DataModelFacts | null>(null);
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState<'' | 'data' | 'delivery'>('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState(loggedErrors);
  const [caps] = useState(() => capabilities(repo.kind));
  const [device] = useState(deviceSummary);

  useEffect(() => onErrorLogged(() => setErrors(loggedErrors())), []);
  useEffect(() => {
    void repo.storageInfo().then(setStorage, () => setStorage({}));
    fetch(`${base}deployment.json`, { cache: 'no-store' })
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return parseManifest(await r.json()); })
      .then(setManifest, e => setManifestError(errorText(e)));
  }, [repo]);

  const runData = useCallback(async () => {
    setBusy('data'); setMessage('');
    try {
      const [projects, originalHashes] = await Promise.all([repo.listProjects(), repo.listOriginalHashes()]);
      const assets = await repo.listAssets(), versions = await repo.listVersions();
      const [collections, templates] = await Promise.all([repo.listCollections(), repo.listTemplates()]);
      setReport(await checkIntegrity({ projects, assets, versions, originalHashes, collections, templates, ...(deep && { getOriginal: (sha: string) => repo.getOriginal(sha) }) }));
      const graph = buildPlanGraph({ projects, assets, versions, collections, templates, originalHashes });
      setModel({ counts: graph.counts, references: graph.edges.length, dangling: graph.dangling.length, cells: cellStorageEstimate(versions), resident: lazyCellsStatus() });
    } catch (e) { setMessage(`Datencheck nicht möglich: ${errorText(e)}`); }
    finally { setBusy(''); }
  }, [repo, deep]);

  const runDelivery = async () => {
    if (!manifest) return;
    setBusy('delivery');
    try {
      setDelivery(await verifyDelivery(manifest, async path => {
        const r = await fetch(`${base}${path}`, { cache: 'no-store' });
        return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
      }, bytes => sha256Hex(bytes)));
    } catch (e) { setMessage(`Auslieferung nicht prüfbar: ${errorText(e)}`); }
    finally { setBusy(''); }
  };

  const copyReport = async () => {
    const text = errorReport(errors, manifest ?? undefined);
    try { await navigator.clipboard.writeText(text); setMessage('Fehlerbericht kopiert. Er enthält keine Projektdaten.'); }
    catch { setMessage('Kopieren nicht möglich – der Browser hat den Zugriff auf die Zwischenablage verweigert.'); }
  };

  const ownAssets = library.assets.filter(a => !a.demo).length;
  return <div className="page system-page">
    <div className="page-head"><div><span className="eyebrow">SYSTEMCHECK</span><h1 className="page-title">Läuft alles sauber?</h1>
      <p className="muted">Prüft Auslieferung, Browserfähigkeiten, Speicher und deine gespeicherten Daten. Alles bleibt lokal; es wird nichts gesendet und nichts verändert.</p></div></div>
    {message && <div className="notice" role="status">{message}</div>}

    <div className="system-grid">
      <section className="system-card" aria-labelledby="sys-build">
        <h2 id="sys-build">Auslieferung</h2>
        {manifest ? <>
          <dl className="system-facts"><div><dt>Quellstand</dt><dd><code>{manifest.sourceCommit.slice(0, 7)}</code></dd></div>
            <div><dt>Gebaut</dt><dd>{new Date(manifest.builtAt).toLocaleString('de-DE')}</dd></div>
            <div><dt>Dateien</dt><dd>{formatNumber(manifest.files.length)}</dd></div></dl>
          <div className="button-row"><button onClick={() => void runDelivery()} disabled={busy !== ''}>{busy === 'delivery' ? 'Prüfe …' : 'Geladene Dateien prüfen'}</button></div>
          {delivery && (delivery.problems.length === 0
            ? <p className="system-ok" role="status">✓ {delivery.checked} Programmdateien stimmen mit dem Build überein.</p>
            : <div className="system-bad" role="alert"><p>{delivery.problems.length} von {delivery.checked} Dateien weichen ab – bitte die Seite ohne Cache neu laden (Strg+Umschalt+R).</p>
              <ul>{delivery.problems.map(p => <li key={p.path}><code>{p.path}</code> – {p.verdict === 'missing' ? 'fehlt' : 'verändert'} ({p.detail})</li>)}</ul></div>)}
        </> : <p className="muted">{manifestError ? `Kein Build-Manifest (${manifestError}). In der Entwicklungsumgebung ist das normal.` : 'Manifest wird geladen …'}</p>}
      </section>

      <section className="system-card" aria-labelledby="sys-device">
        <h2 id="sys-device">Dieses Gerät</h2>
        <dl className="system-facts" data-testid="device-facts">
          <div><dt>Browser</dt><dd>{device.browser}</dd></div>
          <div><dt>System</dt><dd>{device.system}</dd></div>
          <div><dt>Grafik</dt><dd>{device.graphics}</dd></div>
          <div><dt>Eingabe</dt><dd>{device.input}</dd></div>
        </dl>
        <p className="muted">Für das Testprotokoll: diese Angaben beim Namen dazuschreiben (z. B. „Philipp · iPad“).</p>
      </section>

      <section className="system-card" aria-labelledby="sys-caps">
        <h2 id="sys-caps">Browser</h2>
        <ul className="system-caps">{caps.map(c => <li key={c.name} data-ok={c.ok}><span aria-hidden="true">{c.ok ? '✓' : '!'}</span><b>{c.name}</b><small>{c.note}</small></li>)}</ul>
      </section>

      <OfflineCard />

      <section className="system-card" aria-labelledby="sys-storage">
        <h2 id="sys-storage">Speicher</h2>
        <dl className="system-facts">
          <div><dt>Projekte / eigene Bauteile</dt><dd>{report ? formatNumber(report.counts.projects) : '–'} / {formatNumber(ownAssets)}</dd></div>
          <div><dt>Belegt</dt><dd>{storage.usage !== undefined ? `${mb(storage.usage)}${storage.quota ? ` von ${mb(storage.quota)}` : ''}` : 'unbekannt'}</dd></div>
          <div><dt>Vor Löschen geschützt</dt><dd>{storage.persisted === undefined ? 'unbekannt' : storage.persisted ? 'ja' : 'nein – Browser darf bei Platzmangel löschen'}</dd></div>
        </dl>
        {storage.usage !== undefined && storage.quota ? <meter className="system-meter" min={0} max={storage.quota} value={storage.usage} high={storage.quota * 0.8} aria-label="Speicherbelegung" /> : null}
        <p className="muted">Sicherungen erstellst du in der <a href="#/">Projektzentrale</a> unter „Speicher & Sicherung“.</p>
      </section>
    </div>

    <section className="system-card system-wide" aria-labelledby="sys-data">
      <h2 id="sys-data">Datencheck</h2>
      <p className="muted">Berechnet die Prüfsumme jeder Bauteilversion neu und prüft, ob Projekte, Bauteile, Versionen und Originaldateien vollständig zueinander passen. Es wird nichts repariert oder gelöscht.</p>
      <div className="button-row">
        <button className="primary" onClick={() => void runData()} disabled={busy !== ''}>{busy === 'data' ? 'Prüfe …' : 'Datencheck starten'}</button>
        <label className="system-check"><input type="checkbox" checked={deep} onChange={e => setDeep(e.target.checked)} /> Originaldateien neu einlesen (langsamer)</label>
      </div>
      {report && <div className="system-result" data-ok={report.ok}>
        <p role="status"><b>{report.ok ? (report.findings.length ? '✓ Keine Fehler' : '✓ Alles in Ordnung') : `✕ ${report.errors} Fehler`}</b>
          {report.warnings ? ` · ${report.warnings} Warnung(en)` : ''} · geprüft: {formatNumber(report.counts.projects)} Projekte, {formatNumber(report.counts.assets)} Bauteile, {formatNumber(report.counts.versions)} Versionen, {formatNumber(report.counts.originals)} Originale</p>
        {!report.ok && <p className="muted">Empfehlung: zuerst in der Projektzentrale „Alles sichern“, dann betroffene Projekte öffnen. Eine beschädigte Version lässt sich durch erneuten Import der Originaldatei ersetzen.</p>}
        {report.findings.length > 0 && <table className="system-findings"><thead><tr><th>Art</th><th>Betrifft</th><th>Befund</th></tr></thead><tbody>
          {report.findings.map((f, i) => <tr key={i} data-severity={f.severity}><td>{INTEGRITY_SEVERITY_LABEL[f.severity]}</td>
            <td>{f.subject.kind === 'project' ? <a href={`#/projekt/${encodeURIComponent(f.subject.id)}`}>{f.subject.name ?? f.subject.id}</a> : f.subject.name ?? <code>{f.subject.id.slice(0, 16)}</code>}</td>
            <td>{f.message}</td></tr>)}
        </tbody></table>}
      </div>}
    </section>

    <DataModelCard model={model} storedAs={repo.kind === 'indexeddb' ? 'Browserspeicher und Sicherungen' : 'nur Sicherungen; Sitzungsspeicher'} />

    <section className="system-card system-wide" aria-labelledby="sys-errors">
      <h2 id="sys-errors">Fehlerprotokoll dieser Sitzung</h2>
      {errors.length === 0 ? <p className="muted">Keine Fehler aufgetreten.</p>
        : <ol className="system-errors">{errors.map((e, i) => <li key={i}><small>{new Date(e.at).toLocaleTimeString('de-DE')} · {e.route}</small><code>{e.message}</code></li>)}</ol>}
      <div className="button-row"><button onClick={() => void copyReport()}>Fehlerbericht kopieren</button>
        {errors.length > 0 && <button onClick={() => clearErrors()}>Protokoll leeren</button>}
        <a className="button" href="#/testphase?melden">Fehler melden (mit Diagnose)</a></div>
    </section>
  </div>;
}
