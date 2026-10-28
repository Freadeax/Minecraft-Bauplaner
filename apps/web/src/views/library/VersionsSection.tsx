import { useMemo, useState } from 'react';
import { addAssetVersion, BASIS_PREFIX, createAsset, detectMaterials, FAMILY_PREFIX, MATERIAL_KIND_LABEL, MATERIAL_SETS, swapLabel, swapMaterials } from '../../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, CatalogEntry, MaterialSwap } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { errorText, formatNumber } from '../../app/ui';
import { DiffView } from '../../schem/DiffView';
import { Thumb } from '../../thumbnail/Thumb';

/**
 * Bauversionen (B12): every variant of a building (family members and
 * material variants derived from any of them) and every stored version of the
 * asset side by side, a block-exact comparison of any two, and a generator for
 * new material variants. Versions stay immutable: a variant is a new asset
 * that names its basis; a new version is only offered for own assets.
 */
interface Option { readonly key: string; readonly label: string; readonly version: AssetVersion }

export function VersionsSection({ entry, group, versions, variantName, libHref, onSaved, onMessage }: {
  entry: CatalogEntry;
  /** Variant group including the entry itself. */
  group: readonly CatalogEntry[];
  versions: ReadonlyMap<string, AssetVersion>;
  /** Short variant label of a group member (family variant or material). */
  variantName(e: CatalogEntry): string;
  libHref(page: 'building', id: string): string;
  onSaved(assetId: string): void;
  onMessage(text: string): void;
}) {
  const asset = entry.asset;
  const own = asset.versionIds.map(id => versions.get(id)).filter((v): v is AssetVersion => !!v);
  const options = useMemo<Option[]>(() => [
    { key: `v:${asset.id}`, label: `${asset.name} (aktuell, v${entry.version.label})`, version: entry.version },
    ...group.filter(e => e.asset.id !== asset.id).map(e => ({ key: `v:${e.asset.id}`, label: `Variante: ${e.asset.name}`, version: e.version })),
    ...own.filter(v => v.id !== entry.version.id).reverse().map(v => ({ key: `r:${v.id}`, label: `Ältere Version v${v.label} (${new Date(v.createdAt).toLocaleDateString('de-DE')})`, version: v })),
  ], [asset, entry, group, own]);
  const [aKey, setA] = useState(options[0]!.key);
  const [bKey, setB] = useState(options[1]?.key ?? options[0]!.key);
  const a = options.find(o => o.key === aKey) ?? options[0]!, b = options.find(o => o.key === bKey) ?? options[1] ?? options[0]!;

  return <section id="sec-versionen" className="sheet-section versions-section" aria-label="Bauversionen">
    <h3>Bauversionen &amp; Varianten</h3>
    {group.length > 1 ? <ul className="variant-cards">{group.map(e => <li key={e.asset.id}>
      <a href={libHref('building', e.asset.id)} aria-current={e.asset.id === asset.id ? 'true' : undefined}>
        <Thumb cacheKey={e.version.id} payload={() => e.version.payload} alt="" width={180} height={120} className="thumb" />
        <strong>{variantName(e)}</strong>
        <span>{e.metrics.size.join('×')} · {formatNumber(e.metrics.blocks)} Blöcke{e.asset.demo ? '' : ' · eigenes'}</span></a></li>)}</ul>
      : <p className="muted">Noch keine Varianten. Unten lässt sich eine Materialvariante erzeugen.</p>}
    {own.length > 1 && <p className="small-note">{own.length} gespeicherte Versionen dieses Bauteils; Projekte behalten die Version, mit der sie gebaut wurden.</p>}
    {options.length > 1 ? <>
      <div className="diff-pick">
        <label>Stand A<select value={a.key} onChange={e => setA(e.target.value)} aria-label="Stand A">{options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</select></label>
        <button type="button" className="icon-button" aria-label="A und B tauschen" title="A und B tauschen" onClick={() => { setA(b.key); setB(a.key); }}>⇄</button>
        <label>Stand B<select value={b.key} onChange={e => setB(e.target.value)} aria-label="Stand B">{options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</select></label>
      </div>
      {a.key === b.key ? <p className="muted">Zwei verschiedene Stände wählen.</p>
        : <DiffView key={`${a.version.id}>${b.version.id}`} a={a.version.payload} b={b.version.payload} labelA="A" labelB="B" cacheKey={`${a.version.id}>${b.version.id}`} profileId={b.version.payload.profileId} />}
    </> : null}
    <MaterialVariantPanel asset={asset} latest={entry.version} family={entry.family} onSaved={onSaved} onMessage={onMessage} />
  </section>;
}

function MaterialVariantPanel({ asset, latest, family, onSaved, onMessage }: {
  asset: Asset; latest: AssetVersion; family: string | undefined; onSaved(assetId: string): void; onMessage(text: string): void;
}) {
  const { repo, reloadLibrary } = useApp();
  const used = useMemo(() => detectMaterials(latest.payload), [latest]);
  const [targets, setTargets] = useState<Readonly<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const swaps: MaterialSwap[] = used.map(u => ({ from: u.set.id, to: targets[u.set.id] ?? u.set.id })).filter(s => s.from !== s.to);
  const swapKey = swaps.map(s => `${s.from}>${s.to}`).join(',');
  const result = useMemo(() => {
    if (!swaps.length) return null;
    try { return { ...swapMaterials(latest.payload, swaps), error: '' }; } catch (e) { return { error: errorText(e) }; }
  }, [latest, swapKey]);
  const label = swapLabel(swaps);
  const [name, setName] = useState('');
  const shownName = name || (label ? `${asset.name} (${label})` : asset.name);

  const save = async (asVersion: boolean) => {
    if (!result || !('payload' in result) || !result.payload) return;
    setBusy(true); setError('');
    try {
      const source = { format: 'variant' as const };
      if (asVersion) {
        const r = await addAssetVersion(asset, { payload: result.payload, label: `${asset.versionIds.length + 1}.0`, connectors: latest.connectors, source });
        await repo.applyBatch({ versions: [r.version], assets: [r.asset] }); await reloadLibrary();
        onMessage(`Version ${r.version.label} von „${asset.name}“ gespeichert (${label}). Bestehende Projekte behalten ihre Version.`);
        onSaved(asset.id);
      } else {
        const keep = asset.tags.filter(t => !t.startsWith(BASIS_PREFIX) && !t.startsWith(FAMILY_PREFIX));
        const created = createAsset({ name: shownName.slice(0, 120), tags: [...keep, `${BASIS_PREFIX}${asset.id}`, ...(family ? [`${FAMILY_PREFIX}${family}`] : [])],
          description: `Materialvariante von „${asset.name}“ (v${latest.label}): ${swaps.map(s => `${MATERIAL_SETS.find(m => m.id === s.from)?.label} → ${MATERIAL_SETS.find(m => m.id === s.to)?.label}`).join(', ')}. Form und Ausrichtung jedes Blocks unverändert.`,
          provenance: { ...asset.provenance, source: `abgeleitet von „${asset.name}“ (Materialtausch im Bauplaner)` } });
        const r = await addAssetVersion(created, { payload: result.payload, label: '1.0', connectors: latest.connectors, source });
        await repo.applyBatch({ versions: [r.version], assets: [r.asset] }); await reloadLibrary();
        onMessage(`Materialvariante „${r.asset.name}“ gespeichert.`);
        onSaved(r.asset.id);
      }
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return <details className="variant-maker">
    <summary>Materialvariante erzeugen</summary>
    {used.length === 0 ? <p className="muted">Keine tauschbaren Holz-, Stein- oder Farbsätze in diesem Bauwerk.</p> : <>
      <p className="small-note">Jeder Satz wird Form für Form getauscht (Brett → Brett, Treppe → Treppe), Ausrichtung und Eigenschaften bleiben gleich. Fehlt eine Form im Zielsatz, bleibt der Block unverändert und wird genannt.</p>
      <table className="swap-table"><thead><tr><th scope="col">Im Bauwerk</th><th scope="col">Blöcke</th><th scope="col">ersetzen durch</th></tr></thead>
        <tbody>{used.map(u => <tr key={u.set.id}><th scope="row">{u.set.label} <small>{MATERIAL_KIND_LABEL[u.set.kind]} · {u.forms.length} Formen</small></th><td>{formatNumber(u.blocks)}</td>
          <td><select aria-label={`${u.set.label} ersetzen durch`} value={targets[u.set.id] ?? u.set.id} onChange={e => setTargets(t => ({ ...t, [u.set.id]: e.target.value }))}>
            {MATERIAL_SETS.filter(m => m.kind === u.set.kind).map(m => <option key={m.id} value={m.id}>{m.id === u.set.id ? `${m.label} (unverändert)` : m.label}</option>)}</select></td></tr>)}</tbody></table>
      {result && 'payload' in result && result.payload && <div className="swap-preview">
        <figure><Thumb cacheKey={latest.id} payload={() => latest.payload} alt={`${asset.name} vorher`} width={260} height={180} /><figcaption>vorher</figcaption></figure>
        <figure><Thumb cacheKey={`${latest.id}>${swapKey}`} payload={() => result.payload} alt={`${asset.name} nachher`} width={260} height={180} /><figcaption>nachher · {label}</figcaption></figure>
        <div>
          <p><b>{formatNumber(result.replaced)}</b> Blöcke getauscht.</p>
          {result.unresolved.length > 0 && <p className="warn-note" role="note">Unverändert, weil der Zielsatz die Form nicht hat: {result.unresolved.map(u => `${u.id.replace('minecraft:', '')} (${u.count}, ${u.form} fehlt in ${u.target})`).join('; ')}.</p>}
          <label>Name<input value={shownName} maxLength={120} onChange={e => setName(e.target.value)} aria-label="Name der Variante" /></label>
          <div className="button-row">
            <button type="button" className="primary" disabled={busy} onClick={() => void save(false)}>Als neue Variante speichern</button>
            {!asset.demo && <button type="button" disabled={busy} onClick={() => void save(true)}>Als neue Version v{asset.versionIds.length + 1}.0</button>}
          </div>
        </div>
      </div>}
      {result && 'error' in result && result.error && <p className="field-error" role="alert">{result.error}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </>}
  </details>;
}
