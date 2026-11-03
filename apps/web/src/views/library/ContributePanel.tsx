import { useState } from 'react';
import {
  CONTRIBUTION_FILE_SUFFIX, CONTRIBUTION_LICENSES, MAX_PREVIEW_BYTES, contributionIdFor, contributionWarnings, createContribution,
} from '../../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, CatalogEntry, ContributionFile, ContributionLicense } from '../../../../../packages/domain/src/index.js';
import { REPO_URL, download, errorText, formatNumber } from '../../app/ui';
import { renderShot } from '../../thumbnail/iso';
import { FacetFields, facetsFromForm } from './FacetFields';

/**
 * „In Bibliothek einreichen“ (LIB-06) on the building sheet of an own asset.
 * The page is static: nothing is uploaded from here. It builds a contribution
 * package (metadata, the latest version with packed cells, checksum, plain
 * preview) for download and opens the GitHub form „Bibliotheksbeitrag“, where
 * the file is attached. The maintainer takes it in with `npm run library:add`;
 * after the next published update the building is a fixed catalogue entry for
 * everyone. See docs/architecture/CONTRIBUTIONS.md.
 */
const AUTHOR_KEY = 'bauplaner.beitrag.autor';
const readAuthor = (): string => { try { return localStorage.getItem(AUTHOR_KEY) ?? ''; } catch { return ''; } };
const keepAuthor = (name: string): void => { try { localStorage.setItem(AUTHOR_KEY, name); } catch { /* private window: just not remembered */ } };

export function contributionIssueUrl(file: ContributionFile, fileName: string): string {
  const m = file.meta;
  const params = new URLSearchParams({
    template: 'bibliotheksbeitrag.yml',
    title: `[Bibliothek] ${m.name}`,
    name: m.name,
    kennung: m.id,
    autor: m.author,
    rechte: CONTRIBUTION_LICENSES[m.license],
    beschreibung: m.description.slice(0, 1500),
    datei: `Bitte hier die Datei „${fileName}“ hineinziehen (Prüfsumme ${file.checksum.slice(0, 16)}…).`,
  });
  return `${REPO_URL}/issues/new?${params.toString()}`;
}

export function ContributePanel({ asset, version, entry }: { asset: Asset; version: AssetVersion; entry: CatalogEntry }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(asset.name);
  const [id, setId] = useState<string | null>(null);
  const [result, setResult] = useState<{ file: ContributionFile; fileName: string; bytes: number; warnings: string[]; preview: boolean } | null>(null);
  const shownId = id ?? contributionIdFor(name);
  const blocks = entry.metrics.blocks;

  async function submit(form: HTMLFormElement): Promise<void> {
    const f = new FormData(form);
    setBusy(true); setError(''); setResult(null);
    try {
      const author = String(f.get('author') ?? '').trim();
      const meta = {
        id: shownId, name: name.trim(), description: String(f.get('description') ?? ''), facets: facetsFromForm(f),
        tags: String(f.get('tags') ?? '').split(',').map(t => t.trim()).filter(Boolean),
        tips: String(f.get('tips') ?? '').split('\n').map(t => t.trim()).filter(Boolean),
        author, source: String(f.get('source') ?? ''), license: String(f.get('license')) as ContributionLicense,
        rightsConfirmed: f.get('rights') === 'on',
      };
      // Plain colours only: a preview with loaded textures would put Minecraft textures into the repository.
      await new Promise(r => setTimeout(r, 0));
      let preview = '';
      try { preview = renderShot(version.payload, 360, 240); } catch { preview = ''; }
      const usePreview = preview.startsWith('data:image/png;base64,') && preview.length <= MAX_PREVIEW_BYTES;
      const file = await createContribution(asset, version, { meta, ...(usePreview && { preview }) });
      const text = JSON.stringify(file);
      const fileName = `${file.meta.id}${CONTRIBUTION_FILE_SUFFIX}`;
      download(fileName, text, 'application/json');
      keepAuthor(author);
      const v = file.version as { packedCells?: { base64?: string } };
      setResult({ file, fileName, bytes: text.length, preview: usePreview, warnings: contributionWarnings(version.payload, file.meta, v.packedCells?.base64?.length ?? text.length) });
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  return <section className="contribute" aria-label="In Bibliothek einreichen" id="sec-einreichen">
    <span className="panel-kicker">IN BIBLIOTHEK EINREICHEN</span>
    <p className="contribute-note">Macht dieses Bauteil zu einem <b>festen Eintrag der Bibliothek</b>, den alle sehen, die den Bauplaner öffnen. Hier entsteht ein
      Beitragspaket (Blockdaten, Angaben, Vorschaubild); nichts wird automatisch hochgeladen. Nach Prüfung wird es in den Katalog übernommen und erscheint
      mit dem nächsten Update für alle.</p>
    {!open ? <button type="button" onClick={() => setOpen(true)}>⇪ Beitrag vorbereiten …</button> :
      <form className="contribute-form" onSubmit={e => { e.preventDefault(); if (!busy) void submit(e.currentTarget); }}>
        <p className="contribute-note">Eingereicht wird Version <b>{version.label}</b> ({formatNumber(blocks)} Blöcke, {entry.metrics.size.join(' × ')}). Die Blöcke bleiben genau so, wie sie gebaut sind.</p>
        <label>Name<input name="name" required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Kennung (dauerhaft, nur a–z, 0–9, _)<input name="id" required value={shownId} pattern="beitrag_[a-z0-9](?:[a-z0-9_]{0,46}[a-z0-9])?"
          onChange={e => setId(e.target.value)} /></label>
        <label>Beschreibung<textarea name="description" rows={3} maxLength={2000} defaultValue={asset.description} /></label>
        <FacetFields initial={entry.facets} />
        <label>Weitere Tags (Komma-getrennt)<input name="tags" defaultValue={entry.tags.filter(t => t !== 'beitrag').join(', ')} /></label>
        <label>Bautipps (einer je Zeile, freiwillig)<textarea name="tips" rows={3} /></label>
        <label>Autor oder Erbauer<input name="author" required maxLength={120} defaultValue={readAuthor() || asset.provenance.author} /></label>
        <label>Herkunft<input name="source" maxLength={300} defaultValue={asset.provenance.source || 'eigener Entwurf'} placeholder="z. B. eigener Entwurf, gebaut auf unserem Server" /></label>
        <label>Nutzungsrechte<select name="license" defaultValue="frei-projekt">
          {Object.entries(CONTRIBUTION_LICENSES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
        <label className="check"><input type="checkbox" name="rights" required /> Ich habe das Bauwerk selbst gebaut oder habe die Erlaubnis des Erbauers. Es ist keine
          fremde Schematic ohne Zustimmung, und es darf unter den gewählten Nutzungsrechten im Bauplaner veröffentlicht werden.</label>
        <div className="button-row"><button className="primary" type="submit" disabled={busy}>{busy ? 'Paket wird erstellt …' : '↓ Beitragspaket erstellen'}</button>
          <button type="button" disabled={busy} onClick={() => { setOpen(false); setResult(null); setError(''); }}>Schließen</button></div>
      </form>}
    {error && <p className="warn-text" role="alert">Nicht erstellt: {error}</p>}
    {result && <div className="contribute-result" role="status">
      <p><b>Paket „{result.fileName}“ heruntergeladen</b> ({formatNumber(Math.round(result.bytes / 1024))} kB{result.preview ? ', mit Vorschaubild' : ', ohne Vorschaubild'}).</p>
      {result.warnings.length > 0 && <ul className="contribute-note">{result.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
      <ol className="contribute-note">
        <li><a href={contributionIssueUrl(result.file, result.fileName)} target="_blank" rel="noreferrer">Formular „Bibliotheksbeitrag“ auf GitHub öffnen ↗</a> (vorausgefüllt) und die Datei in das Feld „Beitragsdatei“ ziehen.</li>
        <li>Ohne GitHub-Konto: die Datei an den Betreuer des Bauplaners geben.</li>
        <li>Nach der Übernahme (<code>npm run library:add</code>) und dem nächsten Update steht das Gebäude für alle in der Bibliothek, gekennzeichnet als Bibliotheksbeitrag.</li>
      </ol>
      <button type="button" onClick={() => download(result.fileName, JSON.stringify(result.file), 'application/json')}>↓ Paket erneut herunterladen</button>
    </div>}
  </section>;
}
