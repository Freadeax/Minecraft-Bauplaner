import { useMemo, useState } from 'react';
import { addAssetVersion, applyPalette, createTemplate, materialSet, detectMaterials, MATERIAL_KIND_LABEL, PALETTE_ROLE_LABEL, paletteRolesOf, swapLabel, swapMaterials } from '../../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, CatalogEntry, MaterialSwap } from '../../../../../packages/domain/src/index.js';
import { materialTargets } from '../../../../../packages/domain/src/materials/variants.js';
import { useApp } from '../../app/context';
import { errorText, formatNumber } from '../../app/ui';
import { DiffView } from '../../schem/DiffView';
import { Thumb } from '../../thumbnail/Thumb';
import { AssetRevisionNotice } from './AssetRevisionNotice';
import { paletteChoices, variantAsset } from './paletteVariants';
import { useUserLibrary } from './userLibrary';

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

function MaterialVariantPanel({ asset: currentAsset, latest: currentLatest, family, onSaved, onMessage }: {
  asset: Asset; latest: AssetVersion; family: string | undefined; onSaved(assetId: string): void; onMessage(text: string): void;
}) {
  const { repo, reloadLibrary } = useApp();
  const [{ asset, latest }, setBase] = useState(() => ({ asset: currentAsset, latest: currentLatest }));
  const used = useMemo(() => detectMaterials(latest.payload, { scoped: true }), [latest]);
  const [targets, setTargets] = useState<Readonly<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const swaps: MaterialSwap[] = used.map(u => ({ from: u.set.id, to: targets[u.set.id] ?? u.set.id, forms: u.forms })).filter(s => s.from !== s.to);
  const swapKey = swaps.map(s => `${s.from}>${s.to}:${s.forms?.join('|') ?? '*'}`).join(',');
  const result = useMemo(() => {
    if (!swaps.length) return null;
    try { return { ...swapMaterials(latest.payload, swaps), error: '' }; } catch (e) { return { error: errorText(e) }; }
  }, [latest, swapKey]);
  const label = swapLabel(swaps);
  const [name, setName] = useState('');
  // LIB-07: a Baustil-Palette fills the targets by role (main/accent wood and stone, colour, glass, concrete, terracotta).
  const userLib = useUserLibrary(repo);
  const palettes = useMemo(() => paletteChoices(userLib.templates), [userLib.templates]);
  const [paletteId, setPaletteId] = useState('');
  const roleOf = useMemo(() => paletteRolesOf(latest.payload), [latest]);
  const palette = palettes.find(p => p.id === paletteId);
  const choosePalette = (id: string) => {
    setPaletteId(id);
    const p = palettes.find(x => x.id === id);
    setSkipped([]);
    if (!p) { setTargets({}); return; }
    try {
      // Swaps the original must be protected from (block content without an adapter) are left out and named.
      const r = applyPalette(latest.payload, p.roles);
      setTargets(Object.fromEntries((r?.swaps ?? []).map(s => [s.from, s.to])));
      setSkipped((r?.skipped ?? []).map(s => `${materialSet(s.swap.from)?.label ?? s.swap.from} → ${materialSet(s.swap.to)?.label ?? s.swap.to}: ${s.reason}`));
    } catch (e) { setError(errorText(e)); }
  };
  const [skipped, setSkipped] = useState<string[]>([]);
  const paletteUnchanged = palette && swaps.every(s => roleOf.some(a => a.use.set.id === s.from && palette.roles[a.role] === s.to));
  const [paletteName, setPaletteName] = useState('');
  const savePalette = async () => {
    const roles = Object.fromEntries(roleOf.map(a => [a.role, targets[a.use.set.id] ?? a.use.set.id]));
    try {
      const t = createTemplate({ name: paletteName.trim() || `Palette aus ${asset.name}`, description: `Aus „${asset.name}“: ${roleOf.map(a => `${PALETTE_ROLE_LABEL[a.role]} ${materialTargets(a.use.set).find(m => m.id === (targets[a.use.set.id] ?? a.use.set.id))?.label ?? ''}`).join(', ')}.`, body: { kind: 'palette', roles } });
      const err = await userLib.write({ templates: [t] });
      if (err) setError(err); else { onMessage(`Baustil-Palette „${t.name}“ gespeichert. Sie steht jetzt bei jedem Gebäude und unter Bibliothek › Paletten bereit.`); setPaletteId(t.id); setPaletteName(''); }
    } catch (e) { setError(errorText(e)); }
  };
  const shownName = name || (paletteUnchanged && palette ? `${asset.name} (${palette.name})` : label ? `${asset.name} (${label})` : asset.name);

  const save = async (asVersion: boolean) => {
    if (!result || !('payload' in result) || !result.payload) return;
    setBusy(true); setError('');
    try {
      const source = { format: 'variant' as const };
      if (asVersion) {
        const r = await addAssetVersion(asset, { payload: result.payload, label: `${asset.versionIds.length + 1}.0`, connectors: latest.connectors, source });
        await repo.applyBatch({ versions: [r.version], assets: [r.asset] }); await reloadLibrary();
        setBase({ asset: { ...r.asset, revision: (r.asset.revision ?? 0) + 1 }, latest: r.version });
        onMessage(`Version ${r.version.label} von „${asset.name}“ gespeichert (${label}). Bestehende Projekte behalten ihre Version.`);
        onSaved(asset.id);
      } else {
        const r = await variantAsset(asset, latest, result.payload, swaps, { name: shownName, family, ...(paletteUnchanged && palette && { palette: palette.name }) });
        await repo.applyBatch({ versions: [r.version], assets: [r.asset] }); await reloadLibrary();
        onMessage(`Materialvariante „${r.asset.name}“ gespeichert.`);
        onSaved(r.asset.id);
      }
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return <details className="variant-maker">
    <summary>Materialvariante erzeugen</summary>
    <AssetRevisionNotice base={asset} current={currentAsset} />
    {used.length === 0 ? <p className="muted">Keine tauschbaren Holz-, Stein-, Farb-, Glas-, Beton- oder Terrakottasätze in diesem Bauwerk.</p> : <>
      <div className="palette-pick">
        <label>Baustil-Palette<select aria-label="Baustil-Palette übernehmen" value={paletteId} onChange={e => choosePalette(e.target.value)}>
          <option value="">– eigene Auswahl –</option>
          {palettes.some(p => p.own) && <optgroup label="Eigene Paletten">{palettes.filter(p => p.own).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>}
          <optgroup label="Mitgeliefert">{palettes.filter(p => !p.own).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup></select></label>
        {palette && <small className="muted">{palette.description}</small>}
        {skipped.length > 0 && <p className="warn-note" role="note">Ausgelassen, damit das Original geschützt bleibt: {skipped.join('; ')}.</p>}
        <small className="muted">Die Palette ordnet die Materialien nach Rollen: das häufigste Holz und der häufigste Stein sind die Hauptmaterialien, die zweithäufigsten die Akzente.</small>
      </div>
      <p className="small-note">Jeder Satz wird Form für Form getauscht (Brett → Brett, Treppe → Treppe), Ausrichtung und Eigenschaften bleiben gleich. Glas, Beton und Terrakotta lassen sich getrennt umfärben; Zellen mit BlockEntity-Daten benötigen zuerst einen NBT-Adapter. Fehlt eine Form im Zielsatz, bleibt der Block unverändert und wird genannt.</p>
      <table className="swap-table"><thead><tr><th scope="col">Im Bauwerk</th><th scope="col">Blöcke</th><th scope="col">ersetzen durch</th></tr></thead>
        <tbody>{used.map(u => <tr key={u.set.id}><th scope="row">{u.set.label} <small>{roleOf.find(a => a.use.set.id === u.set.id) ? PALETTE_ROLE_LABEL[roleOf.find(a => a.use.set.id === u.set.id)!.role] : MATERIAL_KIND_LABEL[u.set.kind]} · {u.forms.length} Formen</small></th><td>{formatNumber(u.blocks)}</td>
          <td><select aria-label={`${u.set.label} ersetzen durch`} value={targets[u.set.id] ?? u.set.id} onChange={e => setTargets(t => ({ ...t, [u.set.id]: e.target.value }))}>
            {materialTargets(u.set).map(m => <option key={m.id} value={m.id}>{m.id === u.set.id ? `${m.label} (unverändert)` : m.label}</option>)}</select></td></tr>)}</tbody></table>
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
      {roleOf.length > 0 && <div className="palette-save">
        <label>Als eigene Baustil-Palette speichern<input value={paletteName} maxLength={120} placeholder={`Palette aus ${asset.name}`} aria-label="Name der neuen Palette" onChange={e => setPaletteName(e.target.value)} /></label>
        <button type="button" disabled={!userLib.loaded} onClick={() => void savePalette()}>Palette speichern</button>
        <small className="muted">Speichert die gewählten Ziele je Rolle (ohne Auswahl die Materialien dieses Gebäudes), um denselben Stil auf andere Gebäude zu legen.</small></div>}
      {result && 'error' in result && result.error && <p className="field-error" role="alert">{result.error}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </>}
  </details>;
}
