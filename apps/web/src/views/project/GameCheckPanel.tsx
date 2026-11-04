import { useEffect, useRef, useState } from 'react';
import type { WorldScan } from '../../../../../packages/formats/src/index.js';
import { GAME_STATUS_LABEL, VERDICT_LABEL } from '../../../../../packages/domain/src/index.js';
import type { CellVerdict, GameCheck, GameStepStatus, GuideStep, Project, ProjectScanReference } from '../../../../../packages/domain/src/index.js';
import type { Vec3 } from '../../../../../packages/voxel/src/index.js';
import { download, errorText, formatNumber } from '../../app/ui';
import { useApp } from '../../app/context';
import { loadProjectScanOriginal, saveProjectScan } from '../../app/scanPersistence';
import { MODEL_MAX_FILE_BYTES } from '../../../../../packages/voxel/src/sizeLimits.js';
import { hasServerPairing, latestServerRecording, recordOnServer } from '../mod/serverClient';
import type { ServerRecording } from '../mod/serverClient';
import { useRoomConnection } from './roomClient';
import type { RoomScan } from './roomClient';

export type LoadedScan = WorldScan & { readonly sourceSha256: string; readonly fileName: string };
const MAX_SCAN_BYTES = MODEL_MAX_FILE_BYTES;

/** Reads one recording in a worker. */
export function readScan(file: File): Promise<LoadedScan> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_SCAN_BYTES) { reject(new Error(`Die Aufnahme ist zu groß (maximal ${MAX_SCAN_BYTES / 1_000_000} MB).`)); return; }
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
  const [serverStep, setServerStep] = useState('');
  const serverCancel = useRef(false);
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
      if (file.size > MAX_SCAN_BYTES) throw new Error(`Die Aufnahme ist zu groß (maximal ${MAX_SCAN_BYTES / 1_000_000} MB).`);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const scan = await readScan(file);
      if (request !== requestId.current) return;
      setOriginal({ hash: scan.sourceSha256, bytes }); setNotice(''); latest.current.onLoad(scan);
    } catch (e) { if (request === requestId.current) setError(errorText(e)); }
    finally { if (request === requestId.current) setBusy(false); }
  };
  /** LINK-06: recording from the paired server by click (instead of `/bp scan` and copying the file). */
  const fromServer = async (fresh: boolean) => {
    serverCancel.current = false;
    setError(''); setNotice(''); setServerStep(fresh ? 'Aufnahme auf dem Server wird gestartet …' : 'Letzte Aufnahme wird gesucht …');
    try {
      const id = latest.current.project.id;
      const r: ServerRecording = fresh ? await recordOnServer(id, setServerStep, () => serverCancel.current) : await latestServerRecording(id, setServerStep, () => serverCancel.current);
      if (latest.current.project.id !== id) return;
      setServerStep('');
      await load(new File([r.bytes as Uint8Array<ArrayBuffer>], r.fileName));
      setNotice(`Aufnahme von „${r.server}“${r.via === 'room' ? ' (über den Team-Raum)' : ''} geladen: ${r.fileName}.${r.summary ? ` ${r.summary}` : ''} Zum Behalten „Aufnahme im Projekt speichern“.`);
    } catch (e) { setError(errorText(e)); }
    finally { setServerStep(''); }
  };
  /** LINK-07: recordings the players' games put into the team room – no server, no plugin. */
  const room = useRoomConnection();
  const games = room.presence.filter(x => x.where === 'spiel');
  const roomScans = room.scans.filter(sc => !sc.projectId || sc.projectId === p.project.id);
  const [waitingSince, setWaitingSince] = useState(0);
  const fromRoom = async (sc: RoomScan) => {
    setError(''); setNotice(''); setServerStep(`Aufnahme „${sc.file}“ wird aus dem Team-Raum geholt …`);
    try {
      const id = latest.current.project.id;
      const bytes = await room.fetchScan(sc.id);
      if (latest.current.project.id !== id) return;
      setServerStep('');
      await load(new File([bytes as Uint8Array<ArrayBuffer>], sc.file));
      setNotice(`Aufnahme aus dem Team-Raum geladen: ${sc.file}, aufgenommen ${new Date(sc.at).toLocaleString('de-DE')}. Zum Behalten „Aufnahme im Projekt speichern“.`);
    } catch (e) { setError(errorText(e)); }
    finally { setServerStep(''); }
  };
  const askGames = () => {
    setError(''); setNotice('');
    if (room.askScan(p.project.id)) setWaitingSince(Date.now());
  };
  // The recording we asked for arrives: load it right away.
  const newest = roomScans[0];
  useEffect(() => {
    if (!waitingSince || !newest || Date.parse(newest.at) < waitingSince - 5_000) return;
    setWaitingSince(0);
    void fromRoom(newest);
  }, [newest?.id, waitingSince]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!waitingSince || !room.asked || room.asked.at < waitingSince) return;
    if (room.asked.games === 0) { setWaitingSince(0); setError(room.asked.message ?? 'Gerade ist kein Spiel mit dem Team-Raum verbunden. Im Spiel „Mein Spiel verbinden“ nutzen (Reiter „Team“).'); }
    else setNotice(`Anforderung an ${room.asked.games === 1 ? 'ein Spiel' : `${room.asked.games} Spiele`} geschickt. Wer den Plan platziert hat, nimmt den Baustand auf – das dauert ein paar Sekunden.`);
  }, [room.asked?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!waitingSince) return; const t = setTimeout(() => { setWaitingSince(0); setNotice(''); setError('Keine Aufnahme gekommen. Im Spiel muss der Plan platziert sein (Hologramm), dann klappt es – oder dort /bauplaner team aufnahme eingeben.'); }, 90_000); return () => clearTimeout(t); }, [waitingSince]);
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
        </> : <small>Noch keine Aufnahme. {hasServerPairing() ? 'Mit „Auf dem Server aufnehmen“ liest der gekoppelte Server den Bau per Klick.' : <>Mit einem auf der Seite <a href="#/mod">„Spiel“</a> gekoppelten Server geht die Aufnahme per Klick; sonst schreibt die Mod sie mit <code>/bauplaner scan</code> in den Ordner <code>bauplaner/scans</code>.</>}</small>}
      </div>
      <label className="file-button">{busy ? 'Liest …' : p.scan ? 'Neue Aufnahme importieren' : 'Spielaufnahme importieren (.schem)'}
        <input type="file" accept=".schem,application/octet-stream" disabled={busy} onChange={e => { void load(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {p.scan && <button className="file-button" disabled={busy} onClick={p.onClear}>Aufnahme ausblenden</button>}
    </div>
    {hasServerPairing() && <div className="button-row game-server-scan">
      <button className="primary" disabled={busy || !!serverStep} onClick={() => void fromServer(true)}
        title="Der gekoppelte Server liest die Planbox am gespeicherten Anker und schickt die Aufnahme hierher – ohne Befehl und ohne Datei kopieren. Die Welt wird nicht verändert.">⇩ Auf dem Server aufnehmen</button>
      <button disabled={busy || !!serverStep} onClick={() => void fromServer(false)} title="Holt die neueste Aufnahme dieses Projekts, die schon auf dem Server liegt.">Letzte Aufnahme vom Server holen</button>
      {serverStep && <><span className="muted" role="status">{serverStep}</span><button className="link-button" onClick={() => { serverCancel.current = true; }}>Abbrechen</button></>}
    </div>}
    {room.connected && <div className="button-row game-room-scan" data-testid="room-scans">
      <button className={hasServerPairing() ? '' : 'primary'} disabled={busy || !!serverStep || !games.length || !!waitingSince} onClick={askGames}
        title="Die Spiele im Team-Raum lesen den platzierten Plan aus ihren geladenen Chunks und legen die Aufnahme in den Raum – ganz ohne Server-Plugin.">
        {waitingSince ? 'Warte auf Aufnahme …' : '⇩ Aufnahme im Spiel anfordern'}</button>
      <span className="muted">{games.length ? `${games.length === 1 ? 'Ein Spiel' : `${games.length} Spiele`} im Team-Raum` : 'Kein Spiel im Team-Raum verbunden'}</span>
      {roomScans.length > 0 && <label>Aufnahmen im Team-Raum ({roomScans.length})<select aria-label="Aufnahme im Team-Raum" disabled={busy || !!serverStep} value=""
        onChange={e => { const sc = roomScans.find(x => x.id === e.target.value); if (sc) void fromRoom(sc); }}><option value="">Aufnahme holen …</option>
        {roomScans.map(sc => <option key={sc.id} value={sc.id}>{sc.file} · {new Date(sc.at).toLocaleString('de-DE')}{sc.revision !== undefined ? ` · Planstand ${sc.revision}` : ''}</option>)}</select></label>}
    </div>}
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
