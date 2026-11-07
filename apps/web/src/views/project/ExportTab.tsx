import { useMemo, useState } from 'react';
import { suggestDataVersion, canonicalJson } from '../../../../../packages/domain/src/index.js';
import { prepareRevisionExport, EXPORT_FORMAT_LABEL, KNOWN_DATA_VERSIONS } from '../../../../../packages/application/src/index.js';
import type { ExportFormat, RevisionExport } from '../../../../../packages/application/src/index.js';
import { litematicVersionFor } from '../../../../../packages/formats/src/index.js';
import { scanExportSafety, EXPORT_SAFETY_LABEL } from '../../../../../packages/voxel/src/index.js';
import type { ExportSafetyKind } from '../../../../../packages/voxel/src/index.js';
import type { SchemAnchor, UnselectedPolicy } from '../../../../../packages/formats/src/index.js';
import { useApp } from '../../app/context';
import { download, errorText, formatNumber } from '../../app/ui';
import { isResolved } from './session';
import { ModelExportPanel } from '../../export3d/ModelExportPanel';
import type { ProjectSession } from './session';
import { checkCompatibility, dataVersionOf, paletteCounts, TOOL_FORMAT } from '../../../../../packages/voxel/src/versionCompat.js';
import type { GameSetup } from '../../../../../packages/voxel/src/versionCompat.js';
import { useGameSetup } from '../../app/gameSetup';
import { CompatStatus, GameSetupFields } from '../compat/GameSetupBar';

const date = (iso: string): string => new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Tab „Export“ (P3-01, P5-01): Sponge Schem v3 or Litematic from a frozen revision. The export lock
 * mirrors `resolution.exportBlockers`; the file is written from the revision,
 * and the revision is only stored after the file was produced successfully.
 */
export function ExportTab({ session }: { session: ProjectSession }) {
  const { library } = useApp();
  const { project, resolution } = session;
  const resolved = isResolved(resolution) ? resolution : null;
  const suggestion = useMemo(() => suggestDataVersion(project, library.versions), [project, library.versions]);
  // COMPAT-01: the target game decides DataVersion and file format; both stay editable.
  const [setup, changeSetup] = useGameSetup();
  const [dataVersion, setDataVersion] = useState(() => String(dataVersionOf(setup.version) ?? suggestion.dataVersion ?? ''));
  const [format, setFormat] = useState<ExportFormat>(() => TOOL_FORMAT[setup.tool]);
  const changeGame = (next: Partial<GameSetup>) => {
    changeSetup(next);
    if (next.version) { const d = dataVersionOf(next.version); if (d) setDataVersion(String(d)); }
    if (next.tool) setFormat(TOOL_FORMAT[next.tool]);
  };
  const chooseFormat = (f: ExportFormat) => { setFormat(f); changeSetup({ tool: f === 'litematic' ? 'litematica' : 'worldedit' }); };
  const [anchor, setAnchor] = useState<SchemAnchor>('project-origin');
  const [unselected, setUnselected] = useState<UnselectedPolicy>('air');
  const [comment, setComment] = useState('');
  const [author, setAuthor] = useState('');
  const [safeMode, setSafeMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RevisionExport | null>(null);

  const blockers = isResolved(resolution) ? resolution.exportBlockers : [resolution.error];
  const dv = Number(dataVersion);
  const dvValid = /^\d{1,10}$/.test(dataVersion) && dv >= 1 && dv <= 2_147_483_647;
  const saveBlocked = session.saveState === 'conflict' || session.saveState === 'error';
  const world = resolved?.world ?? null;
  const box = world ? [0, 1, 2].map(i => world.bounds.maxExclusive[i]! - world.bounds.min[i]!) : null;
  const volume = box ? box[0]! * box[1]! * box[2]! : 0;
  // RELEASE-01: command and operator-only parts of the current state, shown before the export.
  const safety = useMemo(() => world ? scanExportSafety(world) : null, [world]);
  const compat = useMemo(() => world ? checkCompatibility({ palette: world.palette, counts: paletteCounts(world.cells, world.palette.length), blockEntities: world.blockEntities.length, entities: world.entities?.length ?? 0 }, setup) : null, [world, setup]);
  const last = project.revisions.at(-1);
  const current = last && canonicalJson(last.instances) === canonicalJson(project.instances) && canonicalJson(last.links) === canonicalJson(project.links) ? last : null;

  async function run(revisionId?: string) {
    setError(''); setBusy(true);
    try {
      const prepared = await prepareRevisionExport(project, library.versions,
        { format, dataVersion: dv, anchor, unselected, author, safeMode },
        { ...(revisionId !== undefined && { revisionId }), comment });
      const out = prepared.output;
      // A failed writer leaves no new revision in the session or repository.
      if (prepared.created) { session.replace(prepared.project); setComment(''); }
      download(out.fileName, out.bytes as Uint8Array<ArrayBuffer>);
      setResult(out);
    } catch (e) { setError(errorText(e)); setResult(null); }
    finally { setBusy(false); }
  }

  const disabled = busy || !dvValid || saveBlocked;
  return <section className="export-tab" aria-label="Export">
    <div className="export-main">
      <section className={`report ${blockers.length ? 'danger-report' : 'ok-report'} export-status`} aria-label="Exportstatus">
        <h3>{blockers.length ? '🔒 Export gesperrt' : '✓ Exportbereit'}</h3>
        {blockers.length > 0
          ? <><p>Ein baubarer Schem-Export ist erst möglich, wenn diese Punkte geklärt sind (Editor → Konfliktbericht):</p><ul>{blockers.map(b => <li key={b}>{b}</li>)}</ul></>
          : <p>Export friert den aktuellen Stand als Revision ein{current ? ` – er entspricht bereits Revision ${current.number}, es wird keine neue angelegt` : ''}. Die Datei wird nur aus dieser Revision erzeugt.</p>}
        {box && <dl className="report-stats">
          <div><dt>Box B×H×L</dt><dd>{box.join(' × ')}</dd></div>
          <div><dt>Zellen gesamt</dt><dd>{formatNumber(volume)}</dd></div>
          <div><dt>Ausgewählt</dt><dd>{formatNumber(world!.cells.length)}</dd></div>
          <div><dt>Nicht ausgewählt</dt><dd>{formatNumber(volume - world!.cells.length)}</dd></div>
        </dl>}
      </section>

      <section className="export-compat" aria-label="Passt zu deinem Spiel?">
        <span className="panel-kicker">PASST ZU DEINEM SPIEL?</span>
        <GameSetupFields setup={setup} onChange={changeGame} />
        {compat ? <CompatStatus report={compat} /> : <p className="muted">Die Prüfung folgt, sobald das Projekt berechnet ist.</p>}
        {compat && dvValid && compat.dataVersion !== null && dv !== compat.dataVersion && <p className="notice warning" role="alert" data-compat-dataversion="">DataVersion {dv} passt nicht zu Minecraft {setup.version} ({compat.dataVersion}). Die Datei nennt dann eine andere Version als dein Spiel.</p>}
      </section>

      <form className="export-form" onSubmit={e => { e.preventDefault(); void run(); }}>
        <span className="panel-kicker">EINSTELLUNGEN</span>
        <label>Dateiformat
          <select value={format} onChange={e => chooseFormat(e.target.value as ExportFormat)} aria-label="Dateiformat">
            {(Object.keys(EXPORT_FORMAT_LABEL) as ExportFormat[]).map(f => <option key={f} value={f}>{EXPORT_FORMAT_LABEL[f]}</option>)}
          </select>
        </label>
        {format === 'litematic' && <p className="muted">Eine Region mit dem Projektnamen. {dvValid ? `Für DataVersion ${dv} wird Litematic-Format ${litematicVersionFor(dv)} geschrieben, damit auch ältere Litematica-Versionen die Datei öffnen.` : ''} Die Region liegt am gewählten Einfügepunkt.</p>}
        <label>DataVersion (Zielversion)
          <input inputMode="numeric" value={dataVersion} onChange={e => setDataVersion(e.target.value.trim())} aria-invalid={!dvValid} placeholder="z. B. 3955" list="known-data-versions" />
          <datalist id="known-data-versions">{KNOWN_DATA_VERSIONS.map(k => <option key={k.dataVersion} value={k.dataVersion}>{`Minecraft ${k.version}`}</option>)}</datalist>
        </label>
        <p className="muted">Vorgabe aus „Passt zu deinem Spiel?“. {suggestion.source}{suggestion.dataVersion ? ` (${suggestion.dataVersion})` : ''}. Blockzustände werden nicht umgewandelt; was in der Zielversion fehlt, steht oben.</p>
        <label>Einfügepunkt
          <select value={anchor} onChange={e => setAnchor(e.target.value as SchemAnchor)}>
            <option value="project-origin">Projektursprung 0/0/0 (Offset = {world ? world.bounds.min.join('/') : 'Weltminimum'})</option>
            <option value="min-corner">Untere Nordwest-Ecke (Offset = 0/0/0)</option>
          </select>
        </label>
        <label>Nicht ausgewählte Zellen der Box
          <select value={unselected} onChange={e => setUnselected(e.target.value as UnselectedPolicy)}>
            <option value="air">als Luft schreiben (kann beim Einfügen vorhandene Blöcke räumen)</option>
            <option value="structure_void">als minecraft:structure_void markieren</option>
          </select>
        </label>
        <p className="muted">Löschzellen werden immer als minecraft:air geschrieben; ausdrückliche Luft behält ihren Luftzustand. Ob Luft beim Einfügen räumt, entscheidet das Einfügewerkzeug.</p>
        <label className="check"><input type="checkbox" checked={safeMode} onChange={e => setSafeMode(e.target.checked)} aria-label="Sicherer Modus" /> Sicherer Modus: Befehlsblöcke, Befehls-Minecarts, Klickbefehle, Spawner-Inhalte sowie Struktur- und Verbundblöcke weglassen</label>
        {safety && safety.total > 0
          ? <div className={`notice ${safeMode ? '' : 'warning'}`} role="note" aria-label="Befehle im Plan">
            <strong>{safeMode ? 'Wird beim Export entfernt:' : 'Der Plan enthält Befehle oder Betreiberblöcke:'}</strong>
            <ul>{(Object.keys(safety.counts) as ExportSafetyKind[]).filter(k => safety.counts[k]).map(k => <li key={k}>{safety.counts[k]}× {EXPORT_SAFETY_LABEL[k]}</li>)}</ul>
            <details><summary>Stellen anzeigen</summary><ul className="safety-findings">{safety.findings.slice(0, 50).map((f, i) => <li key={i}><code>{f.position.join(' / ')}</code> {EXPORT_SAFETY_LABEL[f.kind]} ({f.id}){f.detail ? <>: <code>{f.detail}</code></> : null}</li>)}</ul>
              {safety.findings.length > 50 && <p className="muted">… und {safety.findings.length - 50} weitere.</p>}</details>
            <p className="muted">Der Planer führt diese Befehle nie aus. Beim Einfügen in Minecraft gelten die Regeln des Zielservers und des Einfügewerkzeugs.</p>
          </div>
          : safety && <p className="muted">Keine Befehlsblöcke, Befehls-Minecarts, Klickbefehle oder Betreiberblöcke im Plan.</p>}
        <label>Autor (optional)<input type="text" value={author} maxLength={120} onChange={e => setAuthor(e.target.value)} /></label>
        <label>Kommentar zur Revision<input type="text" value={comment} maxLength={500} onChange={e => setComment(e.target.value)} placeholder="Schem-Export" disabled={!!current} /></label>
        {saveBlocked && <p className="notice warning" role="alert">Der gespeicherte Stand ist nicht aktuell. Erst neu laden, dann exportieren.</p>}
        <div className="button-row">
          <button className="primary" type="submit" disabled={disabled || blockers.length > 0}>{busy ? 'Exportiert …' : current ? `Revision ${current.number} als .${format} exportieren` : `Revision einfrieren und .${format} exportieren`}</button>
        </div>
        {!dvValid && <p className="muted">Bitte eine DataVersion als positive Ganzzahl angeben.</p>}
      </form>
      {error && <div className="notice warning" role="alert"><strong>Export fehlgeschlagen.</strong><p>{error}</p></div>}
      {result && <ExportReport result={result} />}
      {world && <details className="report export-model3d">
        <summary>3D-Datei für Blender und 3D-Druck (OBJ, GLB, STL, 3MF)</summary>
        <p className="muted">Exportiert den aktuellen Stand des Projekts als 3D-Modell – auch mit offenen Konflikten, ohne Revision. Kein Minecraft-Bauplan.</p>
        <ModelExportPanel cells={world.cells} palette={world.palette} name={project.name} source={`Projekt ${project.name}`} />
      </details>}
    </div>

    <aside className="export-revisions" aria-label="Revisionen">
      <span className="panel-kicker">EINGEFRORENE REVISIONEN</span>
      {project.revisions.length === 0 && <p className="muted">Noch keine Revision. Der erste Export legt Revision 1 an.</p>}
      <ul>{[...project.revisions].reverse().map(r => <li key={r.id}>
        <div><strong>Revision {r.number}</strong>{r === current && <em className="badge">aktueller Stand</em>}</div>
        <small>{date(r.createdAt)} · {r.instances.length} Instanzen{r.comment ? ` · ${r.comment}` : ''}</small>
        <button onClick={() => void run(r.id)} disabled={disabled} aria-label={`Revision ${r.number} exportieren`}>⇩ .{format}</button>
      </li>)}</ul>
      <p className="muted">Ältere Revisionen werden mit ihren festen Bauteilversionen exportiert und bleiben reproduzierbar. Die Exportsperre wird für jede Revision neu geprüft.</p>
    </aside>
  </section>;
}

function ExportReport({ result }: { result: RevisionExport }) {
  const { report } = result;
  return <section className="import-report export-report" aria-label="Exportbericht">
    <div><span className="eyebrow">DATEI ERZEUGT</span><h2>{result.fileName}</h2></div>
    <p>{EXPORT_FORMAT_LABEL[result.format]}{'litematicVersion' in report ? `, Format ${report.litematicVersion}, Region „${report.regionName}“,` : ''} aus <strong>Revision {result.revision.number}</strong> ({date(result.revision.createdAt)}). Die Datei wurde lokal erzeugt und heruntergeladen; nichts wurde hochgeladen.</p>
    <dl>
      <div><dt>Größe B×H×L</dt><dd>{report.dimensions.join(' × ')} = {formatNumber(report.volume)} Zellen</dd></div>
      <div><dt>{result.format === 'litematic' ? 'Regionsposition' : 'Offset'} · Einfügepunkt</dt><dd>{report.offset.join(' / ')} · {report.anchor === 'project-origin' ? 'Projektursprung' : 'untere Ecke'}</dd></div>
      <div><dt>Weltkoordinate der Ecke 0/0/0</dt><dd>{report.worldMin.join(' / ')}</dd></div>
      <div><dt>DataVersion</dt><dd>{report.dataVersion} · Registry ungeprüft</dd></div>
      <div><dt>Blöcke · Palette</dt><dd>{formatNumber(report.counts.blocks)} · {report.paletteSize} Zustände</dd></div>
      <div><dt>Ausdrückliche Luft · Löschzellen</dt><dd>{formatNumber(report.counts.explicitAir)} · {formatNumber(report.counts.erasedAsAir)} (als Luft)</dd></div>
      <div><dt>Nicht ausgewählt</dt><dd>{formatNumber(report.counts.unselected)} als {report.unselectedState}</dd></div>
      <div><dt>BlockEntities</dt><dd>{report.blockEntities}{report.convertedBlockEntities ? ` (${report.convertedBlockEntities} aus Roh-NBT übertragen)` : ''}</dd></div>
      <div><dt>Dateigröße</dt><dd>{formatNumber(result.bytes.byteLength)} Bytes (GZip)</dd></div>
      <div><dt>Sicherer Modus</dt><dd>{result.safety.removed ? `${result.safety.total} Stellen entfernt` : result.safety.total ? `aus, ${result.safety.total} Stellen enthalten` : 'nichts zu entfernen'}</dd></div>
      <div><dt>SHA-256</dt><dd className="hash">{result.sha256}</dd></div>
    </dl>
    <ul>{[...result.notes, ...report.warnings].map((w, i) => <li key={i}>{w}</li>)}</ul>
    <div className="button-row"><button onClick={() => download(result.fileName, result.bytes as Uint8Array<ArrayBuffer>)}>Erneut herunterladen</button></div>
  </section>;
}
