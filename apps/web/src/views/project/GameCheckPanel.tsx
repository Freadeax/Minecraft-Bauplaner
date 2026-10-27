import { useState } from 'react';
import type { WorldScan } from '../../../../../packages/formats/src/index.js';
import { GAME_STATUS_LABEL, VERDICT_LABEL } from '../../../../../packages/domain/src/index.js';
import type { CellVerdict, GameCheck, GameStepStatus, GuideStep } from '../../../../../packages/domain/src/index.js';
import type { Vec3 } from '../../../../../packages/voxel/src/index.js';
import { errorText, formatNumber } from '../../app/ui';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError('');
    try { p.onLoad(await readScan(file)); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
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
      {p.scan && <button className="file-button" onClick={p.onClear}>Aufnahme ausblenden</button>}
    </div>
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
        <button className="primary" disabled={!p.confirmable.length} onClick={p.onTickConfirmed}>{p.confirmable.length ? `${p.confirmable.length} im Spiel bestätigte Schritte abhaken` : 'Keine weiteren bestätigten Schritte zum Abhaken'}</button>
      </div>
      <p className="muted build-honesty">Die Aufnahme zeigt den Stand zum Aufnahmezeitpunkt in den gelesenen Chunks. Haken und Spielstand bleiben getrennt; abgehakt wird nur auf ausdrücklichen Klick. Die Aufnahme wird nicht gespeichert und muss nach dem Neuladen erneut importiert werden.</p>
    </div>}
  </section>;
}

export const gameStatusText = (s: GameStepStatus, ok: number, total: number): string => s === 'partial' ? `im Spiel ${ok}/${total}` : GAME_STATUS_LABEL[s];
