import { useMemo, useState } from 'react';
import { commitProjectEdit, detectMaterials, MATERIAL_KIND_LABEL, materialTargets, previewProjectSwap, siteOf, swapLabel } from '../../../../../packages/domain/src/index.js';
import type { MaterialSwap, Resolution } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { errorText, formatNumber } from '../../app/ui';
import { Thumb } from '../../thumbnail/Thumb';
import type { ProjectSession } from './session';

const short = (id: string): string => id.replace(/^minecraft:/, '');
/** Vorschaubilder nur bis zu dieser Größe (große Städte rendern sonst spürbar lange). */
const THUMB_MAX_CELLS = 300_000;

/**
 * Materialtausch im Projekt mit Vorschau (FLOW-01): wählt Holz-, Stein-, Farb- oder Glassätze der zusammengesetzten
 * Projektwelt (ganz oder eine Instanz), zeigt vorher/nachher, betroffene Instanzen, Blockwechsel, Mehr- und
 * Minderbedarf gegen das Lager und welche abgehakten Schritte danach neu zu prüfen sind. Übernehmen schreibt neue
 * Bauteilversionen wie der Reiter „Blöcke“ und ist ein Rückgängig-Schritt.
 */
export function ProjectSwapPanel({ session, resolution, onDone }: { session: ProjectSession; resolution: Resolution; onDone(text: string): void }) {
  const { repo, library, reloadLibrary } = useApp();
  const { project } = session;
  const world = resolution.world;
  const [instanceId, setInstanceId] = useState('');
  const scoped = useMemo(() => {
    if (!world) return null;
    if (!instanceId) return world;
    const cells = world.cells.filter(c => (resolution.owners.get(c.position.join(',')) ?? []).includes(instanceId));
    return { ...world, cells };
  }, [world, instanceId, resolution]);
  const used = useMemo(() => scoped ? detectMaterials(scoped, { scoped: true }) : [], [scoped]);
  const [targets, setTargets] = useState<Readonly<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);
  const swaps: MaterialSwap[] = used.map(u => ({ from: u.set.id, to: targets[u.set.id] ?? u.set.id, forms: u.forms })).filter(s => s.from !== s.to);
  const swapKey = swaps.map(s => `${s.from}>${s.to}`).join(',');
  const guide = session.computation?.guide ?? null, progress = session.computation?.site.progress ?? null;
  const stock = siteOf(project).stock;
  const preview = useMemo(() => {
    if (!swaps.length) return null;
    try { return { result: previewProjectSwap({ resolution, guide, status: id => progress?.status.get(id) ?? 'open', swaps, instanceId: instanceId || null, stock }), error: '' }; }
    catch (e) { return { result: null, error: errorText(e) }; }
  }, [resolution, guide, progress, swapKey, instanceId, stock]);
  const p = preview?.result ?? null;
  const label = swapLabel(swaps);

  const apply = async () => {
    if (!p || !p.replaced) return;
    setBusy(true); setNote(null);
    try {
      const c = await commitProjectEdit(project, resolution, library.assets, p.draft, { loose: 'new', newName: `Eigene Blöcke · ${project.name}`.slice(0, 120) });
      if (!c.operation) { setNote({ text: 'Keine Änderung zu übernehmen.' }); return; }
      await repo.applyBatch({ assets: c.assets, versions: c.versions });
      try { await reloadLibrary(); } catch (e) { setNote({ text: `Bauteilversionen gespeichert, aber die Bibliothek ließ sich nicht neu laden (${errorText(e)}). Bitte die Seite neu laden.`, error: true }); return; }
      const err = session.execute({ kind: 'batch', label: `Materialtausch: ${label}`, operations: [c.operation] });
      if (err) { setNote({ text: `Bauteilversionen gespeichert, aber das Projekt wurde nicht umgestellt: ${err}`, error: true }); return; }
      setTargets({});
      onDone(`Material getauscht (${label}): ${formatNumber(p.replaced)} Blöcke in ${c.versions.length} neuen Bauteilversion(en).${p.recheck.length ? ` ${p.recheck.length} abgehakte Schritte sind jetzt „neu prüfen“.` : ''} Rückgängig im Editor (Strg+Z).`);
    } catch (e) { setNote({ text: errorText(e), error: true }); } finally { setBusy(false); }
  };

  if (!world) return null;
  return <details className="swap-maker project-swap" data-testid="project-swap">
    <summary>Material tauschen <small>mit Vorschau der Änderungen</small></summary>
    <p className="small-note">Jeder Satz wird Form für Form getauscht (Brett → Brett, Treppe → Treppe), Ausrichtung bleibt. Erst die Vorschau zeigt, was sich ändert; übernommen wird erst mit „Tausch übernehmen“.</p>
    <label>Umfang
      <select value={instanceId} onChange={e => { setInstanceId(e.target.value); setTargets({}); }} aria-label="Umfang des Materialtauschs">
        <option value="">Ganzes Projekt</option>
        {project.instances.map(i => <option key={i.id} value={i.id}>Instanz: {i.name}</option>)}
      </select></label>
    {used.length === 0 ? <p className="muted">Keine tauschbaren Materialsätze in diesem Umfang.</p> : <table className="swap-table">
      <thead><tr><th scope="col">Im Plan</th><th scope="col">Blöcke</th><th scope="col">ersetzen durch</th></tr></thead>
      <tbody>{used.map(u => <tr key={u.set.id}><th scope="row">{u.set.label} <small>{MATERIAL_KIND_LABEL[u.set.kind]} · {u.forms.length} Formen</small></th><td>{formatNumber(u.blocks)}</td>
        <td><select aria-label={`${u.set.label} ersetzen durch`} value={targets[u.set.id] ?? u.set.id} onChange={e => setTargets(t => ({ ...t, [u.set.id]: e.target.value }))}>
          {materialTargets(u.set).map(m => <option key={m.id} value={m.id}>{m.id === u.set.id ? `${m.label} (unverändert)` : m.label}</option>)}</select></td></tr>)}</tbody>
    </table>}
    {preview?.error && <p className="field-error" role="alert">{preview.error}</p>}
    {p && <div className="swap-result" data-testid="swap-preview" role="region" aria-label="Vorschau des Materialtauschs">
      <h4>Vorschau: {label} <small>{formatNumber(p.replaced)} Blöcke ändern sich</small></h4>
      {p.after && world.cells.length <= THUMB_MAX_CELLS && <div className="swap-preview">
        <figure><Thumb cacheKey={`swap-before:${project.id}:${project.revision}:${instanceId}`} payload={() => world} alt="Projekt vorher" width={260} height={180} /><figcaption>vorher</figcaption></figure>
        <figure><Thumb cacheKey={`swap-after:${project.id}:${project.revision}:${instanceId}:${swapKey}`} payload={() => p.after!} alt="Projekt nachher" width={260} height={180} /><figcaption>nachher</figcaption></figure>
      </div>}
      <div className="swap-facts">
        <div><h5>Betroffene Instanzen</h5><ul>{p.instances.slice(0, 8).map(i => <li key={i.id}>{i.name} <b>{formatNumber(i.cells)}</b></li>)}{p.instances.length > 8 && <li>… und {p.instances.length - 8} weitere</li>}</ul></div>
        <div><h5>Blockwechsel</h5><ul>{p.transitions.slice(0, 8).map(t => <li key={`${t.from}>${t.to}`}><code>{short(t.from)}</code> → <code>{short(t.to)}</code> <b>{formatNumber(t.count)}</b></li>)}{p.transitions.length > 8 && <li>… und {p.transitions.length - 8} weitere</li>}</ul></div>
      </div>
      {p.items.length > 0 && <div className="table-wrap"><table className="materials-table swap-items" aria-label="Bauitems vorher und nachher">
        <thead><tr><th>Item</th><th className="num">vorher</th><th className="num">nachher</th><th className="num">Änderung</th><th className="num">Lager</th><th className="num">fehlt</th></tr></thead>
        <tbody>{p.items.map(i => <tr key={i.itemId}><td><code>{short(i.itemId)}</code></td><td className="num">{formatNumber(i.before)}</td><td className="num">{formatNumber(i.after)}</td>
          <td className={`num ${i.delta > 0 ? 'bad' : 'good'}`}>{i.delta > 0 ? '+' : ''}{formatNumber(i.delta)}</td><td className="num">{formatNumber(i.stock)}</td><td className={`num${i.shortfall ? ' bad' : ''}`}>{formatNumber(i.shortfall)}</td></tr>)}</tbody>
      </table></div>}
      {p.unresolved.length > 0 && <p className="warn-note" role="note">Unverändert, weil der Zielsatz die Form nicht hat: {p.unresolved.map(u => `${short(u.id)} (${formatNumber(u.count)}, ${u.form} fehlt in ${u.target})`).join('; ')}.</p>}
      <p className={p.recheck.length ? 'notice warning' : 'muted'} role="status" data-testid="swap-recheck">
        {p.stepsTouched} Bauschritte ändern sich{p.recheck.length ? <>, davon <b>{p.recheck.length} bereits abgehakt</b>: Sie stehen danach auf „neu prüfen“ (z. B. Schritt {p.recheck.slice(0, 3).map(s => s.order).join(', ')}).</> : '; keiner davon ist abgehakt.'}</p>
      <div className="button-row"><button className="primary" disabled={busy || !p.replaced} onClick={() => void apply()}>Tausch übernehmen</button>
        <button disabled={busy} onClick={() => setTargets({})}>Verwerfen</button></div>
    </div>}
    {note && <p className={`notice ${note.error ? 'warning' : 'success'}`} role={note.error ? 'alert' : 'status'}>{note.text}</p>}
  </details>;
}
