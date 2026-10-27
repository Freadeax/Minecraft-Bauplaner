import { useMemo, useRef, useState } from 'react';
import { countBlocks } from '../../../../packages/voxel/src/index.js';
import type { Cell } from '../../../../packages/voxel/src/index.js';
import { addAssetVersion, createAsset, searchAssets, updateAssetMeta } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersionSource, OriginalFile } from '../../../../packages/domain/src/index.js';
import { useApp } from '../app/context';
import { importFile } from '../app/importFile';
import type { ImportedFile } from '../app/importFile';
import { errorText, formatNumber } from '../app/ui';
import { stateColor } from '../colors';
import { Viewer } from '../Viewer';

const size = (b: { min: readonly number[]; maxExclusive: readonly number[] }) => b.maxExclusive.map((n, i) => n - b.min[i]!).join(' × ');

/** Bauteilbibliothek: search, provenance, immutable versions and file import as asset. */
export function LibraryView() {
  const { repo, library, reloadLibrary } = useApp();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imported, setImported] = useState<ImportedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const abort = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const tags = useMemo(() => [...new Set(library.assets.flatMap(a => a.tags))].sort(), [library.assets]);
  const results = searchAssets(library.assets, { text: query, tags: tag ? [tag] : [], includeArchived: showArchived });
  const selected = library.assets.find(a => a.id === selectedId) ?? null;
  const latest = selected ? library.versions.get(selected.versionIds.at(-1) ?? '') ?? null : null;
  const noSelect = useMemo(() => () => {}, []);

  const open = async (f: File) => {
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); setMessage('');
    try { const r = await importFile(f, controller.signal); if (!controller.signal.aborted) { setImported(r); setSelectedId(null); } }
    catch (e) { if (!controller.signal.aborted) setMessage(`Import nicht übernommen: ${errorText(e)}`); }
    finally { if (abort.current === controller) setBusy(false); }
  };
  const sourceOf = (r: ImportedFile): Promise<AssetVersionSource> => crypto.subtle.digest('SHA-256', r.original).then(d => ({
    format: r.format === 'schem' ? 'schem-v3' : 'voxel-json', fileName: r.name,
    originalSha256: Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join(''),
    ...(r.report && { dataVersion: r.report.dataVersion }),
  }));
  // Original bytes are stored unchanged next to the version, in the same transaction (B3).
  const originalOf = (r: ImportedFile, source: AssetVersionSource): OriginalFile => ({
    sha256: source.originalSha256!, fileName: r.name, mediaType: r.format === 'json' ? 'application/json' : 'application/octet-stream',
    size: r.original.byteLength, createdAt: new Date().toISOString(), bytes: new Uint8Array(r.original.slice(0)),
  });
  const saveNew = async (form: FormData) => {
    if (!imported) return;
    try {
      const asset = createAsset({ name: String(form.get('name')), description: String(form.get('description') ?? ''),
        tags: String(form.get('tags') ?? '').split(',').map(t => t.trim()).filter(Boolean),
        provenance: { author: String(form.get('author') ?? ''), source: String(form.get('source') ?? ''), license: String(form.get('license') ?? '') } });
      const r = await addAssetVersion(asset, { payload: imported.payload, label: '1.0', source: await sourceOf(imported) });
      await repo.applyBatch({ versions: [r.version], assets: [r.asset], originals: [originalOf(imported, r.version.source)] }); await reloadLibrary();
      setImported(null); setSelectedId(r.asset.id); setMessage(`„${r.asset.name}“ als Bauteil gespeichert.`);
    } catch (e) { setMessage(`Nicht gespeichert: ${errorText(e)}`); }
  };
  const saveVersion = async (asset: Asset, label: string) => {
    if (!imported) return;
    try {
      const previous = library.versions.get(asset.versionIds.at(-1) ?? '');
      const r = await addAssetVersion(asset, { payload: imported.payload, label, connectors: previous?.connectors ?? [], source: await sourceOf(imported) });
      await repo.applyBatch({ versions: [r.version], assets: [r.asset], originals: [originalOf(imported, r.version.source)] }); await reloadLibrary();
      setImported(null); setSelectedId(asset.id); setMessage(`Version ${r.version.label} von „${asset.name}“ gespeichert. Bestehende Projekte behalten ihre Version.`);
    } catch (e) { setMessage(`Nicht gespeichert: ${errorText(e)}`); }
  };
  const archive = async (asset: Asset) => {
    try { await repo.saveAsset(updateAssetMeta(asset, { archived: !asset.archived })); await reloadLibrary(); }
    catch (e) { setMessage(errorText(e)); }
  };

  const preview = imported?.payload ?? latest?.payload ?? null;
  const colorFor = useMemo(() => (cell: Cell) => cell.kind === 'erase' || !preview ? '#d35f5f' : stateColor(preview.palette[cell.paletteIndex]!.id), [preview]);
  return <div className="page">
    <header className="page-head"><div><span className="eyebrow">BAUTEILBIBLIOTHEK</span><h1 className="page-title">Bauteile</h1>
      <p className="muted">Jede Version ist unveränderlich. Projekte verweisen auf eine feste Version; neue Versionen ändern bestehende Projekte nicht.</p></div>
      <div className="button-row"><button className="primary" disabled={busy} onClick={() => file.current?.click()}>＋ Schem / JSON importieren</button>
        <input ref={file} className="file-input" type="file" aria-label="Bauteildatei" accept=".schem,.json,application/json,application/octet-stream"
          onChange={e => { const f = e.target.files?.[0]; if (f) void open(f); e.target.value = ''; }} />
        {busy && <button onClick={() => { abort.current?.abort(); setBusy(false); setMessage('Import abgebrochen.'); }}>Abbrechen</button>}</div></header>
    {message && <div className="notice" role="status">{message}</div>}
    <section className="library">
      <aside className="library-list">
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Suchen: Name, Tag, Autor …" aria-label="Bauteile suchen" />
        <div className="chips" role="group" aria-label="Tags">{tags.map(t => <button key={t} aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)}>{t}</button>)}</div>
        <label className="check"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Archivierte zeigen</label>
        <ul className="instance-list">{results.map(a => <li key={a.id}><button aria-pressed={a.id === selectedId} onClick={() => { setSelectedId(a.id); setImported(null); }}>
          <strong>{a.name}</strong><span>{a.versionIds.length} Version(en){a.demo ? ' · Beispiel' : ''}{a.archived ? ' · archiviert' : ''}</span></button></li>)}
          {results.length === 0 && <li className="muted">Keine Treffer.</li>}</ul>
      </aside>
      <div className="viewport library-preview">
        {preview ? <Viewer key={imported ? `import-${imported.name}` : latest?.id} payload={preview} cells={preview.cells} onSelect={noSelect} colorFor={colorFor} />
          : <div className="scene empty-scene"><p>Wähle links ein Bauteil oder importiere eine Datei.</p></div>}
      </div>
      <aside className="inspector">
        {imported ? <form onSubmit={e => { e.preventDefault(); void saveNew(new FormData(e.currentTarget)); }}>
          <span className="panel-kicker">DATEI GEPRÜFT</span>
          <p className="muted">{imported.name} · {imported.format === 'schem' ? `Sponge Schem v3, DataVersion ${imported.report?.dataVersion}` : 'Voxel-JSON'} · {size(imported.payload.bounds)} · {formatNumber(countBlocks(imported.payload).blocks)} Blöcke</p>
          {imported.report?.warnings.map((w, i) => <p className="small-note" key={i}>{w}</p>)}
          <label>Name<input name="name" required maxLength={120} defaultValue={imported.name.replace(/\.(schem|json)$/i, '')} /></label>
          <label>Beschreibung<textarea name="description" maxLength={2000} rows={2} /></label>
          <label>Tags (Komma-getrennt)<input name="tags" placeholder="mauer, hafen" /></label>
          <label>Autor<input name="author" maxLength={120} /></label>
          <label>Herkunft<input name="source" maxLength={300} defaultValue={imported.name} /></label>
          <label>Nutzungsrechte<input name="license" maxLength={300} placeholder="ungeklärt" /></label>
          <button className="primary" type="submit">Als neues Bauteil speichern</button>
          <button className="text-button" type="button" onClick={() => setImported(null)}>Verwerfen</button>
        </form> : selected && latest ? <div className="inspector-body">
          <span className="panel-kicker">BAUTEIL</span><h2>{selected.name}</h2>
          {selected.demo && <span className="tag">Synthetisches Beispiel</span>}
          {selected.description && <p className="muted">{selected.description}</p>}
          <dl className="stats"><div><dt>Abmessungen</dt><dd>{size(latest.payload.bounds)}</dd></div><div><dt>Blöcke</dt><dd>{formatNumber(countBlocks(latest.payload).blocks)}</dd></div>
            <div><dt>Autor</dt><dd>{selected.provenance.author || '–'}</dd></div><div><dt>Herkunft</dt><dd>{selected.provenance.source || '–'}</dd></div>
            <div><dt>Nutzungsrechte</dt><dd>{selected.provenance.license}</dd></div><div><dt>Profil</dt><dd>{latest.payload.profileId}</dd></div>
            <div><dt>Anschlüsse</dt><dd>{latest.connectors.map(c => c.id).join(', ') || 'keine'}</dd></div></dl>
          <span className="panel-kicker">VERSIONEN</span>
          <ul className="version-list">{selected.versionIds.map(id => { const v = library.versions.get(id); return <li key={id}><strong>{v?.label ?? '?'}</strong> <span className="hash">{v?.payloadHash.slice(0, 12) ?? 'fehlt'}</span> {v && <small>{new Date(v.createdAt).toLocaleDateString('de-DE')} · {v.source.format}</small>}</li>; })}</ul>
          <div className="button-row"><button onClick={() => void archive(selected)}>{selected.archived ? 'Aus Archiv holen' : 'Archivieren'}</button></div>
        </div> : <p className="muted">Keine Auswahl.</p>}
        {imported && library.assets.length > 0 && <details className="version-from-import"><summary>Stattdessen als neue Version speichern</summary>
          <ul className="asset-picker">{library.assets.filter(a => !a.demo).map(a => <li key={a.id}><button onClick={() => void saveVersion(a, `${a.versionIds.length + 1}.0`)}>→ {a.name} (v{a.versionIds.length + 1}.0)</button></li>)}</ul>
          {library.assets.every(a => a.demo) && <p className="small-note">Beispielbauteile erhalten keine neuen Versionen.</p>}</details>}
      </aside>
    </section>
  </div>;
}
