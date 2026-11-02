import { useState } from 'react';
import {
  BUILTIN_SCATTER_PARTS, SCATTER_GROUP_LABEL, SCATTER_MISS_LABEL, SCATTER_NEED_LABEL, SCATTER_PRESETS, SURFACE_STYLES, addScatterPreset, clearScatterLayer, newScatterLayer,
  putScatterLayer, removeScatterLayer, scatterLayers,
} from '../../../../../../packages/domain/src/index.js';
import type { ScatterCells, ScatterContext, ScatterGroup, ScatterLayer, ScatterMiss, ScatterPartRef, ScatterPartResolver, TerrainDesign } from '../../../../../../packages/domain/src/index.js';
import { faceColors } from '../../../colors';
import { formatNumber } from '../../../app/ui';

/** An own Schablone the panel offers as a part (library module tagged „schablone“). */
export interface StencilOption { readonly ref: Extract<ScatterPartRef, { kind: 'stencil' }>; readonly blocks: number }

const short = (id: string) => id.replace(/^minecraft:/, '');
const refKey = (r: ScatterPartRef) => r.kind === 'builtin' ? `b:${r.id}` : `s:${r.versionId}`;
const GROUPS: readonly ScatterGroup[] = ['baum', 'busch', 'fels', 'pflanze'];
const numOrNull = (v: string, min: number, max: number): number | null => v.trim() === '' || !Number.isFinite(Number(v)) ? null : Math.max(min, Math.min(max, Math.trunc(Number(v))));
export const missText = (m: ReadonlyMap<ScatterMiss, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${formatNumber(n)} ${SCATTER_MISS_LABEL[k]}`).join(', ');

/**
 * Streu-Ebene (TERRAIN-02-S06): layers of Natur-Bauteile with their rules.
 * Every change scatters the layer again right away (hand-set items stay);
 * `run` wraps a change with undo and a status note.
 */
export function ScatterPanel({ design, ctx, resolve, stencils, info, active, onActive, run }: {
  design: TerrainDesign; ctx: ScatterContext; resolve: ScatterPartResolver; stencils: readonly StencilOption[]; info: ScatterCells | null;
  active: string | null; onActive: (id: string | null) => void; run: (label: string, fn: (d: TerrainDesign) => string) => void;
}) {
  const plan = design.scatter ?? { layers: [], items: [] };
  const [preset, setPreset] = useState(SCATTER_PRESETS[0]!.id);
  const [partKey, setPartKey] = useState('b:eiche');
  const total = (id: string) => plan.items.filter(i => i.layer === id).length;
  const manual = (id: string) => plan.items.filter(i => i.layer === id && i.manual).length;

  const partByKey = (k: string): ScatterPartRef | null => k.startsWith('b:') ? { kind: 'builtin', id: k.slice(2) } : stencils.find(s => refKey(s.ref) === k)?.ref ?? null;
  const addPreset = () => run('Mischung', d => {
    const r = addScatterPreset(d.scatter ?? { layers: [], items: [] }, preset);
    d.scatter = r.plan;
    const out = scatterLayers(d, ctx, r.layers);
    onActive(r.layers[0] ?? null);
    const n = [...out.placed.values()].reduce((a, b) => a + b, 0);
    return `„${SCATTER_PRESETS.find(p => p.id === preset)!.label}“: ${r.layers.length} Ebenen, ${formatNumber(n)} Teile gestreut.${out.missed.size ? ` Ausgedünnt: ${missText(out.missed)}.` : ''}`;
  });
  const addLayer = () => {
    const ref = partByKey(partKey);
    if (!ref) return;
    run('Ebene', d => {
      const layer = newScatterLayer(d.scatter ?? { layers: [], items: [] }, { part: ref }, resolve);
      putScatterLayer(d, layer);
      const out = scatterLayers(d, ctx, [layer.id]);
      onActive(layer.id);
      return `Ebene „${layer.label}“ angelegt: ${formatNumber(out.placed.get(layer.id) ?? 0)} Teile gestreut.`;
    });
  };
  const change = (layer: ScatterLayer, patch: Partial<ScatterLayer>) => run('Ebene', d => {
    const next = { ...layer, ...patch };
    putScatterLayer(d, next);
    if (!next.enabled) return `„${next.label}“ ausgeblendet: zählt nicht zu Blöcken und Material.`;
    const out = scatterLayers(d, ctx, [next.id]);
    return `„${next.label}“ neu gestreut: ${formatNumber(out.placed.get(next.id) ?? 0)} Teile${manual(next.id) ? ` (+ ${manual(next.id)} von Hand)` : ''}.`;
  });

  return <section className="scatter-panel" aria-label="Streu-Ebene" data-testid="scatter-panel">
    <p className="muted small">Bäume, Büsche, Felsen und Pflanzen nach Oberflächenstil, Hang, Höhe und Dichte verteilen – immer gleich für dieselben Regeln. Mit dem Werkzeug „Streuen“ (N) setzt oder entfernst du einzelne Teile von Hand.</p>
    <div className="scatter-add">
      <label>Mischung <select value={preset} onChange={e => setPreset(e.target.value)} aria-label="Mischung">{SCATTER_PRESETS.map(p => <option key={p.id} value={p.id} title={p.hint}>{p.label}</option>)}</select></label>
      <button className="secondary" onClick={addPreset}>Mischung streuen</button>
    </div>
    <div className="scatter-add">
      <label>Bauteil <select value={partKey} onChange={e => setPartKey(e.target.value)} aria-label="Natur-Bauteil">
        {GROUPS.map(g => <optgroup key={g} label={SCATTER_GROUP_LABEL[g]}>{BUILTIN_SCATTER_PARTS.filter(p => p.group === g).map(p => <option key={refKey(p.ref)} value={refKey(p.ref)}>{p.label}</option>)}</optgroup>)}
        {stencils.length > 0 && <optgroup label="Eigene Schablonen">{stencils.map(s => <option key={refKey(s.ref)} value={refKey(s.ref)}>{s.ref.label} ({s.blocks} Blöcke)</option>)}</optgroup>}
      </select></label>
      <button className="secondary" onClick={addLayer}>Ebene hinzufügen</button>
    </div>
    {plan.layers.length === 0 && <p className="muted small">Noch keine Streu-Ebene. Eigene Bäume und Felsen speicherst du in der <a href="#/werkstatt">Werkstatt</a> als Schablone; sie erscheinen dann hier.</p>}
    <ul className="scatter-layers">
      {plan.layers.map(layer => {
        const part = resolve(layer.part), placed = info?.perLayer.get(layer.id) ?? 0, stored = total(layer.id);
        return <li key={layer.id} className={active === layer.id ? 'active' : ''} data-layer={layer.id}>
          <details>
            <summary>
              <input type="checkbox" checked={layer.enabled} onChange={e => change(layer, { enabled: e.target.checked })} aria-label={`${layer.label} aktiv`} onClick={e => e.stopPropagation()} />
              <b>{layer.label}</b> <span className="muted" data-testid="scatter-count">{formatNumber(placed)}{stored !== placed && layer.enabled ? ` von ${formatNumber(stored)}` : ''} Teile</span>
            </summary>
            {!part && <p className="notice warning small">Bauteil nicht gefunden (Schablone gelöscht?). Die Teile werden nicht gesetzt.</p>}
            {part && <p className="muted small">{part.hint} · Boden: {SCATTER_NEED_LABEL[part.needs]}</p>}
            <div className="scatter-grid">
              <label>Dichte <input type="number" min={0} max={1000} step="any" value={layer.density} aria-label="Dichte je 1000 Spalten"
                onChange={e => change(layer, { density: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) })} /> je 1000 Spalten</label>
              <label>Abstand <input type="number" min={1} max={32} value={layer.spacing} aria-label="Mindestabstand"
                onChange={e => change(layer, { spacing: Math.max(1, Math.min(32, Math.trunc(Number(e.target.value)) || 1)) })} /></label>
              <label>Hang von <input type="number" min={0} max={64} placeholder="–" value={layer.minSlope ?? ''} aria-label="Hang mindestens" onChange={e => change(layer, { minSlope: numOrNull(e.target.value, 0, 64) })} /></label>
              <label>bis <input type="number" min={0} max={64} placeholder="–" value={layer.maxSlope ?? ''} aria-label="Hang höchstens" onChange={e => change(layer, { maxSlope: numOrNull(e.target.value, 0, 64) })} /></label>
              <label>ab Y <input type="number" placeholder="–" value={layer.minY ?? ''} aria-label="ab Höhe" onChange={e => change(layer, { minY: numOrNull(e.target.value, -2048, 2047) })} /></label>
              <label>bis Y <input type="number" placeholder="–" value={layer.maxY ?? ''} aria-label="bis Höhe" onChange={e => change(layer, { maxY: numOrNull(e.target.value, -2048, 2047) })} /></label>
              <label>nur bis <input type="number" min={1} max={16} placeholder="–" value={layer.shore ?? ''} aria-label="Uferabstand" onChange={e => change(layer, { shore: numOrNull(e.target.value, 1, 16) })} /> vom Wasser</label>
              <label>Abstand zu Bauten <input type="number" min={0} max={16} value={layer.buildingGap} aria-label="Abstand zu Bauten" onChange={e => change(layer, { buildingGap: Math.max(0, Math.min(16, Math.trunc(Number(e.target.value)) || 0)) })} /></label>
            </div>
            <fieldset className="scatter-styles"><legend>Wächst auf {layer.styles.length ? '' : '(jeder Oberfläche)'}</legend>
              {SURFACE_STYLES.filter(s => !s.path).map(s => <label key={s.id} className="chip-check"><input type="checkbox" checked={layer.styles.includes(s.id)}
                onChange={e => change(layer, { styles: e.target.checked ? [...layer.styles, s.id] : layer.styles.filter(x => x !== s.id) })} /> {s.label}</label>)}
            </fieldset>
            <div className="scatter-actions">
              <button onClick={() => change(layer, { seed: (layer.seed * 48271 + 11) % 2_147_483_647 })} title="Andere, aber wieder feste Verteilung">Neu würfeln</button>
              <button className={active === layer.id ? 'active' : ''} aria-pressed={active === layer.id} onClick={() => onActive(layer.id)}>Von Hand setzen</button>
              <button onClick={() => run('Leeren', d => `${formatNumber(clearScatterLayer(d, layer.id))} Teile von „${layer.label}“ entfernt.`)}>Leeren</button>
              <button className="text-button" onClick={() => run('Ebene löschen', d => { removeScatterLayer(d, layer.id); if (active === layer.id) onActive(null); return `Ebene „${layer.label}“ gelöscht.`; })}>Ebene löschen</button>
            </div>
          </details>
        </li>;
      })}
    </ul>
    {plan.layers.length > 0 && <>
      <button className="secondary" onClick={() => run('Alle streuen', d => {
        const out = scatterLayers(d, ctx);
        return `Alle Ebenen neu gestreut: ${formatNumber([...out.placed.values()].reduce((a, b) => a + b, 0))} Teile.${out.missed.size ? ` Ausgedünnt: ${missText(out.missed)}.` : ''}`;
      })}>Alle Ebenen neu streuen</button>
      {info && <dl className="landscape-stats" data-testid="scatter-stats">
        <dt>Teile</dt><dd data-stat="scatter">{formatNumber(info.placed)}</dd>
        <dt>Blöcke</dt><dd data-stat="scatter-blocks">{formatNumber(info.cells.length)}</dd>
        {info.dropped.size > 0 && <><dt>Passen nicht mehr</dt><dd title="Das Gelände hat sich seit dem Streuen geändert">{missText(info.dropped)}</dd></>}
      </dl>}
      {info && info.materials.length > 0 && <table className="landscape-materials"><tbody>{info.materials.slice(0, 8).map(m =>
        <tr key={m.id}><td><i style={{ background: faceColors(m.id).top }} /> {short(m.id)}</td><td>{formatNumber(m.count)}</td></tr>)}</tbody></table>}
    </>}
  </section>;
}
