import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Cell } from '../../../../../packages/voxel/src/index.js';
import { facetLabel, SIZE_CLASS_LABEL, STAGE_HINT, STAGE_LABEL } from '../../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, BuildingFacets, BuildingInfo, CatalogEntry, Ensemble, Project, Similar, Suggestion } from '../../../../../packages/domain/src/index.js';
import { formatNumber } from '../../app/ui';
import { mix, stateColor } from '../../colors';
import { SchemView, SCHEM_TABS } from '../../schem/SchemView';
import type { SchemTab } from '../../schem/SchemView';
import { Thumb } from '../../thumbnail/Thumb';
import { VersionsSection } from './VersionsSection';
import { GeneratedInfo } from './GeneratorsPage';
import { ConnectorEditor } from './ConnectorEditor';
import type { Highlight } from './ConnectorEditor';
import { CropPanel } from './CropPanel';
import { stars } from './BuildingCard';
import { EquipmentSection, FactsSection, MatchSection, MaterialBar, MaterialsSection, MetricsSection, TechSection, TipsSection } from './BuildingSheet';

/**
 * Detail page of one building (#/bibliothek/gebaeude/<id>): large 3D view next
 * to a summary with the key figures and actions, then the full Steckbrief in
 * cards, similar buildings as a card row and the management tools (versions,
 * connectors, area as new part) at the end.
 */
export function BuildingDetail({ entry, asset, latest, versions, info, group, variantName, sub, ensembles, similar, suggestion, project, projects, adding,
  favorite, comparing, libHref, onFavorite, onCompare, onAdd, onNewProject, onSaveFacets, onArchive, onMessage, onSelectSaved }: {
  entry: CatalogEntry;
  /** Variant group (family and derived material variants) including this entry. */
  group: readonly CatalogEntry[];
  variantName(e: CatalogEntry): string;
  /** Sub route: schem tab (bilder, ebenen) or "versionen". */
  sub: string | undefined;
  asset: Asset;
  latest: AssetVersion;
  versions: ReadonlyMap<string, AssetVersion>;
  info: BuildingInfo | undefined;
  ensembles: readonly Ensemble[];
  similar: readonly Similar[];
  suggestion: Suggestion | undefined;
  project: Project | null;
  projects: readonly Project[];
  adding: boolean;
  favorite: boolean;
  comparing: boolean;
  libHref(page: 'browse' | 'building' | 'ensembles', id?: string, sub?: string): string;
  onFavorite(): void;
  onCompare(): void;
  onAdd(projectId: string): void;
  onNewProject(): void;
  onSaveFacets: ((facets: BuildingFacets, tags: string[]) => void) | undefined;
  onArchive(): void;
  onMessage(text: string): void;
  onSelectSaved(assetId: string): void;
}) {
  const m = entry.metrics;
  const [target, setTarget] = useState(project?.id ?? projects[0]?.id ?? '');
  const targetId = projects.some(p => p.id === target) ? target : project?.id ?? projects[0]?.id ?? '';
  const [connectorMarks, setConnectorMarksState] = useState<Highlight>(null);
  const [cropMarks, setCropMarksState] = useState<Highlight>(null);
  const setConnectorMarks = useCallback((h: Highlight) => setConnectorMarksState(() => h), []);
  const setCropMarks = useCallback((h: Highlight) => setCropMarksState(() => h), []);
  const payload = latest.payload;
  const [tab, setTabState] = useState<SchemTab>(() => SCHEM_TABS.some(([t]) => t === sub) ? sub as SchemTab : '3d');
  // Tab changes rewrite the address without navigation, so the page does not jump to the top.
  const setTab = (t: SchemTab) => { setTabState(t); history.replaceState(history.state, '', libHref('building', asset.id, t === '3d' ? undefined : t)); };
  useEffect(() => { if (sub === 'versionen') document.getElementById('sec-versionen')?.scrollIntoView(); }, [sub]);
  const colorFor = useMemo(() => (cell: Cell) => {
    const base = cell.kind === 'erase' ? '#d35f5f' : stateColor(payload.palette[cell.paletteIndex]!.id);
    const mark = cropMarks?.(cell) ?? connectorMarks?.(cell) ?? null;
    return mark === 'hit' ? '#ffd166' : mark === 'dim' ? mix(base, '#16303c', 0.7) : base;
  }, [payload, cropMarks, connectorMarks]);
  const category = entry.facets.kategorie[0];
  const kicker = [...entry.facets.kategorie.map(k => facetLabel('kategorie', k)), ...entry.facets.stil.map(v => facetLabel('stil', v))].join(' · ');

  return <article className="building-detail" aria-label={`Gebäude ${asset.name}`}>
    <nav className="crumbs" aria-label="Pfad"><a href={libHref('browse')}>Bibliothek</a><span aria-hidden="true">›</span>
      {category && <><span>{facetLabel('kategorie', category)}</span><span aria-hidden="true">›</span></>}<span aria-current="page">{asset.name}</span></nav>
    <section className="detail-hero">
      <SchemView payload={payload} cacheKey={latest.id} name={asset.name} tab={tab} onTab={setTab} colorFor={colorFor} />
      <div className="detail-summary building-sheet">
        <span className="panel-kicker">{kicker ? kicker.toUpperCase() : 'GEBÄUDE'}</span>
        <h1 className="detail-title">{asset.name}</h1>
        <div className="chips sheet-badges">
          {asset.demo && <span className="tag">Synthetisches Beispiel</span>}
          {!asset.demo && <span className="tag">Eigenes Bauteil</span>}
          {asset.archived && <span className="tag">archiviert</span>}
          <span className={`stage stage-${m.progression.stage}`} title={STAGE_HINT[m.progression.stage]}>{STAGE_LABEL[m.progression.stage]}</span>
        </div>
        {asset.description && <p className="detail-lead">{asset.description}</p>}
        <dl className="stat-tiles">
          <div><dt>Größe</dt><dd>{m.size.join(' × ')}</dd><small>B × H × T · {SIZE_CLASS_LABEL[m.sizeClass].split(' (')[0]}</small></div>
          <div><dt>Blöcke</dt><dd>{formatNumber(m.blocks)}</dd><small>{m.distinctBlocks} Blocktypen</small></div>
          <div title="Heuristik, Faktoren unten"><dt>Schwierigkeit</dt><dd className="stars">{stars(m.difficulty.level)}</dd><small>{m.difficulty.label}</small></div>
          <div title={m.buildTime.assumptions}><dt>Bauzeit</dt><dd>≈ {m.buildTime.minutes} min</dd><small>Schätzung</small></div>
          <div><dt>Material</dt><dd>{m.items.shulkerBoxes} Shulker</dd><small>{formatNumber(m.items.total)} Items · {m.items.lines} Sorten</small></div>
          <div><dt>Schlafplätze</dt><dd>{m.beds}</dd><small>{m.lightSources} Lichtquellen</small></div>
        </dl>
        <MaterialBar entry={entry} />
        <GeneratedInfo version={latest} />
        {group.length > 1 && <div className="variant-row" role="group" aria-label="Varianten">
          <span className="filter-label">{info?.family?.label ?? asset.name}: {group.length} Varianten · <a href={libHref('building', asset.id, 'versionen')}
            onClick={e => { e.preventDefault(); document.getElementById('sec-versionen')?.scrollIntoView({ behavior: 'smooth' }); }}>vergleichen</a></span>
          <div className="variant-thumbs">{group.map(v =>
            <a key={v.asset.id} href={libHref('building', v.asset.id)} aria-current={v.asset.id === asset.id ? 'true' : undefined}>
              <Thumb cacheKey={v.version.id} payload={() => v.version.payload} alt="" width={96} height={66} className="thumb mini" /><span>{variantName(v)}</span></a>)}</div></div>}
        <div className="detail-actions">
          {projects.length > 0 ? <div className="add-row">
            <select aria-label="Zielprojekt" value={targetId} onChange={e => setTarget(e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <button className="primary" disabled={adding || !targetId} onClick={() => onAdd(targetId)}>＋ Ins Projekt übernehmen</button></div>
            : null}
          <div className="button-row">
            <button type="button" className={projects.length ? '' : 'primary'} onClick={onNewProject}>Neues Projekt damit starten</button>
            <button type="button" aria-pressed={favorite} onClick={onFavorite}>{favorite ? '♥ Gemerkt' : '♡ Merken'}</button>
            <button type="button" aria-pressed={comparing} onClick={onCompare}>{comparing ? '⇄ Im Vergleich' : '⇄ Vergleichen'}</button>
          </div>
        </div>
        {suggestion && project && <MatchSection suggestion={suggestion} projectName={project.name} />}
      </div>
    </section>

    <nav className="detail-nav" aria-label="Abschnitte">
      <a href="#" onClick={e => { e.preventDefault(); document.getElementById('sec-ueberblick')?.scrollIntoView({ behavior: 'smooth' }); }}>Überblick</a>
      <a href="#" onClick={e => { e.preventDefault(); document.getElementById('sec-material')?.scrollIntoView({ behavior: 'smooth' }); }}>Material</a>
      <a href="#" onClick={e => { e.preventDefault(); document.getElementById('sec-technik')?.scrollIntoView({ behavior: 'smooth' }); }}>Technik</a>
      <a href="#" onClick={e => { e.preventDefault(); document.getElementById('sec-versionen')?.scrollIntoView({ behavior: 'smooth' }); }}>Versionen</a>
      {similar.length > 0 && <a href="#" onClick={e => { e.preventDefault(); document.getElementById('sec-aehnlich')?.scrollIntoView({ behavior: 'smooth' }); }}>Ähnliche</a>}
      <a href="#" onClick={e => { e.preventDefault(); document.getElementById('sec-verwalten')?.scrollIntoView({ behavior: 'smooth' }); }}>Verwalten</a>
    </nav>

    <div className="detail-grid">
      <div id="sec-ueberblick" className="detail-col">
        <TipsSection info={info} />
        <FactsSection key={asset.id} entry={entry} onSaveFacets={onSaveFacets} />
        {ensembles.length > 0 && <section className="sheet-section" aria-label="Teil von Ensembles">
          <h3>Teil von Ensembles</h3>
          <div className="chips">{ensembles.map(e => <a key={e.id} className="chip-link" href={libHref('ensembles', e.id)}>{e.name}</a>)}</div>
        </section>}
        <MetricsSection entry={entry} />
      </div>
      <div id="sec-material" className="detail-col"><MaterialsSection entry={entry} /><EquipmentSection entry={entry} /></div>
      <div id="sec-technik" className="detail-col"><TechSection entry={entry} /></div>
    </div>

    <VersionsSection key={latest.id} entry={entry} group={group} versions={versions} variantName={variantName} libHref={(p, id) => libHref(p, id)} onSaved={onSelectSaved} onMessage={onMessage} />

    {similar.length > 0 && <section id="sec-aehnlich" className="sheet-section similar-row" aria-label="Ähnliche Gebäude">
      <h3>Ähnliche Gebäude</h3>
      <ul className="mini-cards">{similar.map(s => <li key={s.entry.asset.id}><a href={libHref('building', s.entry.asset.id)}>
        <Thumb cacheKey={s.entry.version.id} payload={() => s.entry.version.payload} alt="" width={200} height={130} className="thumb" />
        <strong>{s.entry.asset.name}</strong><span>{s.reasons.join(' · ') || 'ähnliche Größe'}</span><b title="Ähnlichkeit">{s.score}</b></a></li>)}</ul>
    </section>}

    <section id="sec-verwalten" className="manage" aria-label="Verwalten">
      <h2>Verwalten</h2>
      <div className="manage-grid">
        <div className="sheet-section">
          <span className="panel-kicker">HERKUNFT</span>
          <dl className="stats">
            <div><dt>Autor</dt><dd>{asset.provenance.author || '–'}</dd></div><div><dt>Herkunft</dt><dd>{asset.provenance.source || '–'}</dd></div>
            <div><dt>Nutzungsrechte</dt><dd>{asset.provenance.license}</dd></div><div><dt>Profil</dt><dd>{latest.payload.profileId}</dd></div>
            <div><dt>Anschlüsse</dt><dd>{latest.connectors.map(c => c.id).join(', ') || 'keine'}</dd></div></dl>
          <span className="panel-kicker">VERSIONEN</span>
          <ul className="version-list">{asset.versionIds.map(id => { const v = versions.get(id); return <li key={id}><strong>{v?.label ?? '?'}</strong> <span className="hash">{v?.payloadHash.slice(0, 12) ?? 'fehlt'}</span> {v && <small>{new Date(v.createdAt).toLocaleDateString('de-DE')} · {v.source.format}</small>}</li>; })}</ul>
          <div className="button-row"><button onClick={onArchive}>{asset.archived ? 'Aus Archiv holen' : 'Archivieren'}</button></div>
        </div>
        <div className="sheet-section">
          <ConnectorEditor key={`c-${latest.id}`} asset={asset} version={latest} onHighlight={setConnectorMarks} onSaved={onMessage} />
          <CropPanel key={`r-${latest.id}`} payload={latest.payload} name={asset.name} provenance={asset.provenance} getSource={async () => latest.source}
            onHighlight={setCropMarks} onSaved={(msg, id) => { onMessage(msg); onSelectSaved(id); }} />
        </div>
      </div>
    </section>
  </article>;
}
