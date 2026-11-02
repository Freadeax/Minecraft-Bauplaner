import { useState } from 'react';
import { SAMPLE_PROFILE, commitDraftAsNewAsset, commitDraftAsVersion } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, CommitWarning } from '../../../../packages/domain/src/index.js';
import { useApp } from '../app/context';
import { navigate } from '../app/router';
import { errorText } from '../app/ui';
import { AssetRevisionNotice } from '../views/library/AssetRevisionNotice';
import { BlockEditor } from './BlockEditor';
import type { DraftModel } from './useDraft';
import './editor.css';

/**
 * Werkstatt (EDIT-02): block editor for one library version (#/werkstatt/<versionId>)
 * or a new module from scratch (#/werkstatt/neu). Saving appends a new version
 * to the asset or creates a new asset; the edited version stays unchanged.
 */
export function WorkshopPage({ versionId }: { versionId: string | null }) {
  const { library } = useApp();
  if (!versionId) return <Workshop key="neu" asset={null} version={null} />;
  const version = library.versions.get(versionId);
  const asset = version && library.assets.find(a => a.id === version.assetId);
  if (!version || !asset) return <div className="page"><div className="notice warning" role="alert">Version „{versionId}“ gibt es in der Bibliothek nicht. <a href="#/bibliothek">Zur Bibliothek</a></div></div>;
  return <Workshop key={version.id} asset={asset} version={version} />;
}

type Notice = { text: string; warnings: readonly CommitWarning[]; error?: boolean };
/** Result of the last save, shown again after switching to the new version's page. */
let carried: Notice | null = null;

function Workshop({ asset, version }: { asset: Asset | null; version: AssetVersion | null }) {
  const { repo, library, reloadLibrary } = useApp();
  const [base] = useState(asset); // storage base of this editing session
  const current = asset ? library.assets.find(a => a.id === asset.id) ?? asset : null;
  const [name, setName] = useState(asset ? `${asset.name} (Umbau)` : 'Eigenes Bauteil');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Notice | null>(() => { const n = carried; carried = null; return n; });
  const latest = asset ? asset.versionIds.at(-1) : null;

  const save = async (model: DraftModel, mode: 'version' | 'copy') => {
    setBusy(true); setResult(null);
    try {
      const r = mode === 'version' && base
        ? await commitDraftAsVersion(model.draft, base, version)
        : await commitDraftAsNewAsset(model.draft, { name: name.trim() || 'Eigenes Bauteil', ...(asset && { description: `Im Blockeditor aus „${asset.name}“ v${version?.label ?? ''} umgebaut.`, tags: asset.tags.filter(t => !t.includes(':')) }), from: version });
      await repo.applyBatch({ assets: [r.asset], versions: [r.version] });
      await reloadLibrary();
      carried = ({ text: mode === 'version' ? `Version ${r.version.label} von „${r.asset.name}“ gespeichert. Projekte behalten ihre bisherige Version, bis du sie dort umstellst.` : `Neues Bauteil „${r.asset.name}“ gespeichert.`, warnings: r.warnings });
      model.reset(r.version.payload);
      navigate({ view: 'workshop', versionId: r.version.id });
    } catch (e) { setResult({ text: errorText(e), warnings: [], error: true }); } finally { setBusy(false); }
  };

  const saveBar = (model: DraftModel) => {
    const empty = model.cellCount === 0, dirty = model.draft.overlay.size > 0 || model.summary.entities > 0;
    return <div className="save-bar">
      {asset && <button className="primary" disabled={busy || !dirty || empty} onClick={() => void save(model, 'version')} title="Neue Version desselben Bauteils; die alte bleibt erhalten">
        Als Version {asset.versionIds.length + 1}.0 speichern</button>}
      <label className="inline">Name<input value={name} onChange={e => setName(e.target.value)} maxLength={120} aria-label="Name des neuen Bauteils" /></label>
      <button className={asset ? '' : 'primary'} disabled={busy || empty} onClick={() => void save(model, 'copy')}>{asset ? 'Als neues Bauteil' : 'Bauteil speichern'}</button>
    </div>;
  };

  return <div className="page workshop">
    <header className="page-head">
      <span className="panel-kicker">WERKSTATT · BLOCKEDITOR</span>
      <h1>{asset ? asset.name : 'Neues Bauteil bauen'}</h1>
      <p className="muted">{asset && version
        ? <>Bearbeitet wird Version <b>{version.label}</b>{latest !== version.id && <> (nicht die neueste)</>} · {version.payload.cells.length.toLocaleString('de-DE')} Zellen. <a href={`#/bibliothek/gebaeude/${encodeURIComponent(asset.id)}`}>Zum Steckbrief</a></>
        : <>Leeres Modell. Alle Blöcke von Minecraft Java 26.3 stehen in der Palette.</>}</p>
    </header>
    {base && current && <AssetRevisionNotice base={base} current={current} />}
    {result && <div className={`notice ${result.error ? 'warning' : 'success'}`} role={result.error ? 'alert' : 'status'}>
      <p>{result.text}</p>{result.warnings.length > 0 && <ul>{result.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>}</div>}
    <BlockEditor base={version?.payload ?? null} profileId={version?.payload.profileId ?? SAMPLE_PROFILE} saveBar={saveBar} entityTools />
  </div>;
}
