import { useMemo, useState } from 'react';
import { exportRevisionSchem, EXPORT_FORMAT_LABEL, KNOWN_DATA_VERSIONS, revisionForExport, suggestDataVersion, canonicalJson } from '../../../../../packages/domain/src/index.js';
import type { ExportFormat, RevisionExport } from '../../../../../packages/domain/src/index.js';
import { litematicVersionFor } from '../../../../../packages/formats/src/index.js';
import type { SchemAnchor, UnselectedPolicy } from '../../../../../packages/formats/src/index.js';
import { useApp } from '../../app/context';
import { download, errorText, formatNumber } from '../../app/ui';
import { isResolved } from './session';
import type { ProjectSession } from './session';

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
  const [dataVersion, setDataVersion] = useState(suggestion.dataVersion ? String(suggestion.dataVersion) : '');
  const [format, setFormat] = useState<ExportFormat>('schem');
  const [anchor, setAnchor] = useState<SchemAnchor>('project-origin');
  const [unselected, setUnselected] = useState<UnselectedPolicy>('air');
  const [comment, setComment] = useState('');
  const [author, setAuthor] = useState('');
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
  const last = project.revisions.at(-1);
  const current = last && canonicalJson(last.instances) === canonicalJson(project.instances) && canonicalJson(last.links) === canonicalJson(project.links) ? last : null;

  async function run(revisionId?: string) {
    setError(''); setBusy(true);
    try {
      let target = project, id = revisionId, created = false;
      if (!id) {
        if (!resolved) throw new Error(blockers.join('; '));
        const r = revisionForExport(project, resolved, comment);
        target = r.project; id = r.revision.id; created = r.created;
      }
      const out = await exportRevisionSchem(target, id, library.versions, { format, dataVersion: dv, anchor, unselected, author });
      // Store the new revision only after the file exists: a failed export leaves no half-done state.
      if (created) { session.replace(target); setComment(''); }
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

      <form className="export-form" onSubmit={e => { e.preventDefault(); void run(); }}>
        <span className="panel-kicker">EINSTELLUNGEN</span>
        <label>Dateiformat
          <select value={format} onChange={e => setFormat(e.target.value as ExportFormat)} aria-label="Dateiformat">
            {(Object.keys(EXPORT_FORMAT_LABEL) as ExportFormat[]).map(f => <option key={f} value={f}>{EXPORT_FORMAT_LABEL[f]}</option>)}
          </select>
        </label>
        {format === 'litematic' && <p className="muted">Eine Region mit dem Projektnamen. {dvValid ? `Für DataVersion ${dv} wird Litematic-Format ${litematicVersionFor(dv)} geschrieben, damit auch ältere Litematica-Versionen die Datei öffnen.` : ''} Die Region liegt am gewählten Einfügepunkt.</p>}
        <label>DataVersion (Zielversion)
          <input inputMode="numeric" value={dataVersion} onChange={e => setDataVersion(e.target.value.trim())} aria-invalid={!dvValid} placeholder="z. B. 3955" list="known-data-versions" />
          <datalist id="known-data-versions">{KNOWN_DATA_VERSIONS.map(k => <option key={k.dataVersion} value={k.dataVersion}>{`Minecraft ${k.version}`}</option>)}</datalist>
        </label>
        <p className="muted">{suggestion.source}. Bekannte Werte: {KNOWN_DATA_VERSIONS.map(k => `${k.version} = ${k.dataVersion}`).join(' · ')} (Auswahlhilfe, Registry nicht geprüft; Blockzustände werden nicht umgewandelt).</p>
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
      <div><dt>SHA-256</dt><dd className="hash">{result.sha256}</dd></div>
    </dl>
    <ul>{[...result.notes, ...report.warnings].map((w, i) => <li key={i}>{w}</li>)}</ul>
    <div className="button-row"><button onClick={() => download(result.fileName, result.bytes as Uint8Array<ArrayBuffer>)}>Erneut herunterladen</button></div>
  </section>;
}
