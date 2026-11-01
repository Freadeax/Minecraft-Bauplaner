import { useMemo, useState } from 'react';
import { BLOCK_CATEGORY_LABEL, blockLabel, blockSchema, defaultState, paletteEntries, searchPalette } from '../../../../packages/domain/src/index.js';
import type { BlockCategory, CellSlot } from '../../../../packages/domain/src/index.js';
import type { BlockState } from '../../../../packages/voxel/src/index.js';
import { stateColor } from '../colors';
import { topColor } from './LayerGrid';

const LIMIT = 240;
const RECENT_KEY = 'bauplaner.editor.recent';
function loadRecent(): string[] { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 16) : []; } catch { return []; } }
function saveRecent(ids: string[]): void { try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 16))); } catch { /* private mode */ } }

export const brushLabel = (b: CellSlot): string => !b ? 'Entfernen' : b.kind === 'air' ? 'Luft (explizit)' : b.kind === 'erase' ? 'Löschzelle' : blockLabel(b.state.id);
export const brushColor = (b: CellSlot): string => !b ? '#d35f5f' : b.kind === 'block' ? stateColor(b.state.id) : b.kind === 'air' ? '#9cc8ff' : '#d35f5f';
export const stateText = (s: BlockState) => `${s.id}${Object.keys(s.properties).length ? `[${Object.entries(s.properties).map(([k, v]) => `${k}=${v}`).join(',')}]` : ''}`;

/**
 * Block picker over every block of the registry (search in German and by id,
 * categories, recently used, blocks of the current model). Choosing a block
 * starts with its default state; states are adjusted in StateFields.
 */
export function BlockPalette({ brush, onBrush, used }: { brush: CellSlot; onBrush: (b: CellSlot) => void; used: readonly { state: BlockState; count: number }[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<BlockCategory | 'model' | null>(null);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const total = paletteEntries().length;
  const hits = useMemo(() => category === 'model' ? [] : searchPalette(query, category), [query, category]);
  const choose = (state: BlockState) => {
    onBrush({ kind: 'block', state });
    const next = [state.id, ...recent.filter(r => r !== state.id)].slice(0, 16);
    setRecent(next); saveRecent(next);
  };
  const current = brush?.kind === 'block' ? brush.state.id : null;
  const tile = (id: string, state?: BlockState, count?: number) => <button key={state ? stateText(state) : id} className="block-tile" aria-pressed={current === id && (!state || stateText(state) === (brush?.kind === 'block' ? stateText(brush.state) : ''))}
    title={`${blockLabel(id)} · ${state ? stateText(state) : id}`} onClick={() => choose(state ?? defaultState(id))}>
    <span className="swatch" style={{ background: topColor(id) }} aria-hidden="true" />
    <span className="name">{blockLabel(id)}</span><span className="id">{(state ? stateText(state) : id).replace('minecraft:', '')}{count ? ` · ${count}×` : ''}</span>
  </button>;

  return <section className="block-palette" aria-label="Blockpalette">
    <div className="palette-head">
      <input type="search" placeholder={`${total.toLocaleString('de-DE')} Blöcke durchsuchen (z. B. „eiche treppe“, „glass“)`} aria-label="Blöcke suchen" value={query}
        onChange={e => { setQuery(e.target.value); if (category === 'model') setCategory(null); }} />
      <div className="special-brushes" role="group" aria-label="Besondere Pinsel">
        <button aria-pressed={brush === null} onClick={() => onBrush(null)} title="Zelle aus dem Modell entfernen (nicht ausgewählt)">⌫ Entfernen</button>
        <button aria-pressed={brush?.kind === 'air'} onClick={() => onBrush({ kind: 'air' })} title="Explizite Luft: räumt beim Einfügen im Spiel diesen Block frei">◌ Luft</button>
        <button aria-pressed={brush?.kind === 'erase'} onClick={() => onBrush({ kind: 'erase' })} title="Löschzelle: entfernt im Projekt den Block einer anderen Instanz">✕ Löschzelle</button>
      </div>
    </div>
    <div className="palette-cats" role="group" aria-label="Kategorien">
      <button aria-pressed={category === null} onClick={() => setCategory(null)}>Alle</button>
      {used.length > 0 && <button aria-pressed={category === 'model'} onClick={() => setCategory('model')}>Im Modell ({used.length})</button>}
      {(Object.keys(BLOCK_CATEGORY_LABEL) as BlockCategory[]).map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{BLOCK_CATEGORY_LABEL[c]}</button>)}
    </div>
    {recent.length > 0 && category !== 'model' && !query && <div className="palette-recent"><span className="panel-kicker">ZULETZT</span>
      <div className="tiles">{recent.filter(id => blockSchema(id) !== undefined).map(id => tile(id))}</div></div>}
    <div className="tiles" role="list" aria-label="Blöcke">
      {category === 'model'
        ? used.map(u => tile(u.state.id, u.state, u.count))
        : hits.slice(0, LIMIT).map(e => tile(e.id))}
    </div>
    {category !== 'model' && hits.length > LIMIT && <p className="muted">{hits.length - LIMIT} weitere Treffer – Suche verfeinern.</p>}
    {category !== 'model' && !hits.length && <p className="muted">Kein Block gefunden. Suche nach deutschem Namen oder ID.</p>}
  </section>;
}

/**
 * Property editor for the brush (or a picked block): one select per property
 * with the allowed values. Mod blocks without schema keep their properties as text.
 */
export function StateFields({ state, onChange, label = 'Zustand' }: { state: BlockState; onChange: (s: BlockState) => void; label?: string }) {
  const schema = blockSchema(state.id);
  if (!schema) return <p className="muted">{state.id}: kein Eintrag im Blockverzeichnis (Mod-Block). Zustand bleibt unverändert: {stateText(state)}</p>;
  const keys = Object.keys(schema);
  if (!keys.length) return <p className="muted">{label}: keine Eigenschaften.</p>;
  return <fieldset className="state-fields"><legend>{label}</legend>
    {keys.map(k => <label key={k}><span>{k}</span>
      <select value={state.properties[k] ?? ''} onChange={e => { const properties = { ...state.properties }; if (e.target.value) properties[k] = e.target.value; else delete properties[k]; onChange({ id: state.id, properties }); }} aria-label={`${label}: ${k}`}>
        {state.properties[k] === undefined && <option value="">– Spielstandard –</option>}
        {schema[k]!.map(v => <option key={v} value={v}>{v}</option>)}
      </select></label>)}
  </fieldset>;
}
