import { useEffect, useRef, useState } from 'react';
import type { WorldScan } from '../../../../../packages/formats/src/index.js';
import { GAME_STATUS_LABEL, VERDICT_LABEL } from '../../../../../packages/domain/src/index.js';
import type { CellVerdict, GameCheck, GameStepStatus, GuideStep, Project, ProjectScanReference } from '../../../../../packages/domain/src/index.js';
import type { Vec3 } from '../../../../../packages/voxel/src/index.js';
import { download, errorText, formatNumber } from '../../app/ui';
import { useApp } from '../../app/context';
import { loadProjectScanOriginal, saveProjectScan } from '../../app/scanPersistence';

export type LoadedScan = WorldScan & { readonly sourceSha256: string; readonly fileName: string };
const MAX_SCAN_BYTES = 16_000_000;

/** Reads one recording in a worker. */
function readScan(file: File): Promise<LoadedScan> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_SCAN_BYTES) { reject(new Error('Die Aufnahme ist zu groß (maximal 16 MB).')); return; }
    void file.arrayBuffer().then(buffer => {
      const worker = new Worker(new URL('../../scan.worker.ts', import.meta.url), { type: 'module' });
      const timer = setTimeout(() => { worker.terminate(); reject(new Error('Lesen der Aufnahme wegen Zeitbudget abgebrochen.')); }, 30_000);
      worker.onmessage = (e: MessageEvent<{ scan?: WorldScan & { sourceSha256: string }; error?: string }>) => {
        clearTimeout(timer); worker.terminate();
        if (e.data.error || !e.data.scan) reject(new Error(e.data.error ?? 'Aufnahme konnte nicht gelesen werden.'));
        else resolve({ ...e.data.scan, fileName: file.name });
      };
      worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(new Error('Der Aufnahme-Worker ist fehlgeschlagen.')); };
      worker.postMessage({ buffer }, [buffer]);
    }, reject);
  });
}

const VERDICTS: readonly Exclude<CellVerdict, 'ok'>[] = ['missing', 'wrong', 'state', 'remove', 'unknown'];
export const GAME_BADGE: Readonly<Record<GameStepStatus, string>> = { confirmed: 'ok', partial: 'open', deviating: 'danger', unchecked: 'open' };

interface Props {
  project: Project;
  canSave: boolean;
  onStored(base: Project): Promise<void>;
  scan: LoadedScan | null;
  check: GameCheck | null;
  /** Error from matching the recording to this project (other project, unknown revision). */
  targetError: string;
  /** Revision named by the recording; null for foreign recordings. */
  revisionNumber: number | null;
  alignment: Vec3 | null;
  manual: boolean;
  onAlignment(v: Vec3): void;
  onLoad(scan: LoadedScan): void;
  onClear(): void;
  confirmable: readonly GuideStep[];
  contradicted: readonly GuideStep[];
  onTickConfirmed(): void;
  onSelect(id: string): void;
}

/** Import and summary of an in-game recording (B8, docs/architecture/MOD_BRIDGE.md). */
export function GameCheckPanel(p: Props) {
  const { repo } = useApp();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [original, setOriginal] = useState<{ hash: string; bytes: Uint8Array } | null>(null);
  const latest = useRef(p); latest.current = p;
  const projectId = p.project.id;
  const requestId = useRef(0);
  const history = p.project.scanHistory ?? [];
  const stored = !!p.scan && history.some(s => s.sha256 === p.scan!.sourceSha256);
  const loadStored = async (reference: ProjectScanReference, active: () => boolean = () => true) => {
    const file = await loadProjectScanOriginal(repo, reference);
    const scan = await readScan(new File([file.bytes as Uint8Array<ArrayBuffer>], reference.fileName));
    if (!active()) return;
    setOriginal({ hash: scan.sourceSha256, bytes: file.bytes });
    latest.current.onLoad(scan);
    if (!scan.meta) latest.current.onAlignment(reference.alignment);
    setNotice('Gespeicherte Aufnahme geladen. Der Vergleich wird neu berechnet; Haken bleiben unverändert.');
  };
  useEffect(() => {
    const request = ++requestId.current;
    setOriginal(null); setNotice(''); setError(''); latest.current.onClear();
    const reference = p.project.scanHistory?.at(-1);
    let active = true;
    if (reference) {
      setBusy(true);
      void loadStored(reference, () => active && request === requestId.current).catch(e => { if (active) setError(errorText(e)); })
        .finally(() => { if (active) setBusy(false); });
    } else setBusy(false);
    return () => { active = false; requestId.current++; };
    // Restore once per project; hiding the recording must not reload it immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, repo]);
  const load = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError('');
    const request = ++requestId.current;
    try {
      if (file.size > MAX_SCAN_BYTES) throw new Error('Die Aufnahme ist zu groß (maximal 16 MB).');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const scan = await readScan(file);
      if (request !== requestId.current) return;
      setOriginal({ hash: scan.sourceSha256, bytes }); setNotice(''); latest.current.onLoad(scan);
    } catch (e) { if (request === requestId.current) setError(errorText(e)); }
    finally { if (request === requestId.current) setBusy(false); }
  };
  const save = async () => {
    if (!p.scan || !original || original.hash !== p.scan.sourceSha256 || !p.alignment || !p.canSave || p.targetError) return;
    setBusy(true); setError('');
    const base = p.project;
    try {
      await saveProjectScan(repo, base, p.scan, original.bytes, p.alignment);
      await p.onStored(base);
      setNotice(repo.kind === 'indexeddb' ? 'Aufnahme mit Original und Verlauf lokal gespeichert.' : 'Aufnahme nur für diese Sitzung gespeichert. Bitte eine Projektsicherung herunterladen.');
    } catch (e) { setError(`Aufnahme nicht gespeichert: ${errorText(e)}`); }
    finally { setBusy(false); }
  };
  const chooseStored = async (hash: string) => {
    const reference = history.find(s => s.sha256 === hash);
    if (!reference) return;
    const request = ++requestId.current;
    setBusy(true); setError('');
    try { await loadStored(reference, () => request === requestId.current); }
    catch (e) { if (request === requestId.current) setError(errorText(e)); }
    finally { if (request === requestId.current) setBusy(false); }
  };
  const t = p.check?.totals;
  const pct = t && t.blocks ? Math.floor(t.blocksOk / t.blocks * 100) : 0;
  return <section className="game-check build-wide" aria-label="Abgleich mit dem Spiel">
    <div className="game-check-head">
      <div className="build-progress">
        <span className="panel-kicker">FORTSCHRITT · LAUT SPIELAUFNAHME</span>
        {t ? <>
          <div className="build-bar game" role="progressbar" aria-label="Gesetzte Blöcke laut Spielaufnahme" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
          <small>{formatNumber(t.blocksOk)} von {formatNumber(t.blocks)} Blöcken korrekt ({pct} %)</small>
        </> : <small>Noch keine Aufnahme. Die Mod schreibt sie mit <code>/bauplaner scan</code> in den Ordner <code>bauplaner/scans</code> des Spielordners.</small>}
      </div>
      <label className="file-button">{busy ? 'Liest …' : p.scan ? 'Neue Aufnahme importieren' : 'Spielaufnahme importieren (.schem)'}
        <input type="file" accept=".schem,application/octet-stream" disabled={busy} onChange={e => { void load(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {p.scan && <button className="file-button" disabled={busy} onClick={p.onClear}>Aufnahme ausblenden</button>}
    </div>
    {history.length > 0 && <label>Gespeicherte Spielaufnahmen ({history.length})<select aria-label="Gespeicherte Spielaufnahme" disabled={busy} value={stored ? p.scan!.sourceSha256 : ''}
      onChange={e => { void chooseStored(e.target.value); }}><option value="">Aufnahme wählen …</option>{[...history].reverse().map(s => <option key={s.sha256} value={s.sha256}>{s.fileName} · importiert {new Date(s.importedAt).toLocaleString('de-DE')}</option>)}</select></label>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {error && <p className="notice warning" role="alert">{error}</p>}
    {p.targetError && <p className="notice warning" role="alert">{p.targetError}</p>}
    {p.scan && !p.targetError && <div className="game-check-body">
      <p className="muted">
        {p.scan.fileName} · {p.revisionNumber !== null ? `Revision ${p.revisionNumber}` : 'fremde Aufnahme ohne Revision'}
        {p.scan.meta?.scannedAt && ` · aufgenommen ${new Date(p.scan.meta.scannedAt).toLocaleString('de-DE')}`}
        {p.scan.meta?.gameVersion && ` · Minecraft ${p.scan.meta.gameVersion}`}
        {p.scan.meta?.source && ` · ${p.scan.meta.source === 'client' ? 'geladene Chunks des Spielers' : 'Serverwelt'}`}
        {' · '}<span className="hash" title="SHA-256 der Aufnahmedatei">{p.scan.sourceSha256.slice(0, 12)}</span>
      </p>
      {p.manual && p.alignment && <fieldset className="game-align"><legend>Ausrichtung: Projektkoordinate der Aufnahme-Ecke 0/0/0</legend>
        {(['X', 'Y', 'Z'] as const).map((axis, i) => <label key={axis}>{axis}<input type="number" value={p.alignment![i]} onChange={e => {
          const v = [...p.alignment!] as [number, number, number]; v[i] = Math.trunc(Number(e.target.value) || 0); p.onAlignment(v);
        }} /></label>)}
      </fieldset>}
      {t && <ul className="game-counts">{VERDICTS.filter(v => t[v] > 0).map(v => <li key={v} className={`v-${v}`}>{formatNumber(t[v])} {VERDICT_LABEL[v]}</li>)}
        {VERDICTS.every(v => t[v] === 0) && <li className="v-ok">alle {formatNumber(t.cells)} Zellen korrekt</li>}</ul>}
      {[...p.scan.warnings, ...(p.check?.notes ?? [])].length > 0 && <ul className="build-notes">{[...p.scan.warnings, ...(p.check?.notes ?? [])].map(n => <li key={n}>{n}</li>)}</ul>}
      {p.contradicted.length > 0 && <div className="notice warning" role="status"><strong>{p.contradicted.length} abgehakte Schritte stimmen im Spiel nicht.</strong>
        <ul>{p.contradicted.slice(0, 5).map(s => <li key={s.id}><button className="link-button" onClick={() => p.onSelect(s.id)}>Schritt {s.order}</button></li>)}{p.contradicted.length > 5 && <li>… und {p.contradicted.length - 5} weitere</li>}</ul>
        Die Haken bleiben unverändert; bitte im Spiel nachsehen.</div>}
      <div className="button-row">
        <button disabled={busy || !p.canSave || !p.alignment || !original || original.hash !== p.scan.sourceSha256} onClick={() => void save()}>{stored ? 'Aufnahme und Ausrichtung erneut speichern' : 'Aufnahme im Projekt speichern'}</button>
        {original?.hash === p.scan.sourceSha256 && <button disabled={busy} onClick={() => download(p.scan!.fileName, original.bytes as Uint8Array<ArrayBuffer>)}>Aufnahme-Original herunterladen</button>}
      </div>
      <p className="muted">Speichern übernimmt die Originaldatei und Ausrichtung in die Projektsicherung. Dabei wird das gespeicherte Projekt neu geladen und die Rückgängig-Historie zurückgesetzt. {repo.kind === 'memory' ? 'Der Browserspeicher ist nicht verfügbar: Daten gelten nur für diese Sitzung.' : 'Die Daten bleiben lokal in diesem Browser; eine Sicherung schützt vor Browserdatenverlust.'}</p>
      <div className="button-row">
        <button className="primary" disabled={!p.confirmable.length} onClick={p.onTickConfirmed}>{p.confirmable.length ? `${p.confirmable.length} im Spiel bestätigte Schritte abhaken` : 'Keine weiteren bestätigten Schritte zum Abhaken'}</button>
      </div>
      <p className="muted build-honesty">Die Aufnahme zeigt den Stand zum Aufnahmezeitpunkt in den gelesenen Chunks. Haken und Spielstand bleiben getrennt; abgehakt wird nur auf ausdrücklichen Klick. Nur ausdrücklich gespeicherte Aufnahmen werden beim Neuladen wiederhergestellt. Ältere Aufnahmen bleiben im Verlauf auswählbar; spätere Weltänderungen benötigen eine neue Aufnahme.</p>
    </div>}
  </section>;
}

export const gameStatusText = (s: GameStepStatus, ok: number, total: number): string => s === 'partial' ? `im Spiel ${ok}/${total}` : GAME_STATUS_LABEL[s];
