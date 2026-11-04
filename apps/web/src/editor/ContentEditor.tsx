import { useMemo, useState } from 'react';
import { MAX_STACK, SIGN_COLORS, SIGN_LINES, checkContainer, checkSign, editableContent, profileItemIds, readContainer, readSign, slotLabel, withContainer, withSign } from '../../../../packages/voxel/src/index.js';
import type { BlockState, ContainerEdit, NbtTag, SignEdit, SlotItem, Vec3 } from '../../../../packages/voxel/src/index.js';
import { containerLabel, setCells } from '../../../../packages/domain/src/index.js';
import type { Edit } from '../../../../packages/domain/src/index.js';

/**
 * Werkstatt: contents of the chosen block (EDIT-06, follows ENTITY-01).
 * Containers get their items per slot and a custom name, signs and hanging
 * signs their text on both sides, colour, glow and wax. „Übernehmen“ writes
 * one undoable edit that replaces only this cell's block entity; fields the
 * planner does not know stay in the NBT.
 */
const COLOR_DE: Readonly<Record<string, string>> = {
  black: 'Schwarz', white: 'Weiß', orange: 'Orange', magenta: 'Magenta', light_blue: 'Hellblau', yellow: 'Gelb', lime: 'Hellgrün', pink: 'Rosa',
  gray: 'Grau', light_gray: 'Hellgrau', cyan: 'Türkis', purple: 'Violett', blue: 'Blau', brown: 'Braun', green: 'Grün', red: 'Rot',
};
const ITEM_LIST_ID = 'profile-item-ids';
const short = (id: string) => id.replace(/^minecraft:/, '');

export interface ContentEditorProps {
  readonly position: Vec3;
  readonly state: BlockState;
  readonly entity: NbtTag | undefined;
  readonly run: (edit: Edit, ok?: string) => boolean;
}

export function ContentEditor(props: ContentEditorProps) {
  const info = editableContent(props.state.id);
  if (!info) return null;
  return info.kind === 'sign' ? <SignForm {...props} /> : <ContainerForm {...props} type={info.type} slots={info.slots} />;
}

function write(props: ContentEditorProps, entity: NbtTag, label: string): boolean {
  return props.run(setCells([props.position], { kind: 'block', state: props.state, entity }, label), label);
}

function ContainerForm(props: ContentEditorProps & { type: string; slots: number }) {
  const { type, slots } = props;
  const start = useMemo(() => readContainer(props.entity), [props.entity]);
  const [rows, setRows] = useState<SlotItem[]>(() => [...start.items]);
  const [name, setName] = useState(start.name);
  const [error, setError] = useState('');
  const ids = useMemo(() => profileItemIds(), []);
  const edit: ContainerEdit = { items: rows.map(r => ({ ...r, id: r.id.trim() ? (r.id.includes(':') ? r.id.trim() : `minecraft:${r.id.trim()}`) : '' })), name };
  const problems = checkContainer(type, edit);
  const free = Array.from({ length: slots }, (_, i) => i).filter(i => !rows.some(r => r.slot === i));
  const changed = JSON.stringify(edit) !== JSON.stringify(start);
  const set = (i: number, patch: Partial<SlotItem>) => setRows(rs => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
  const apply = () => {
    try { if (write(props, withContainer(props.entity, props.state.id, edit), `Inhalt ${containerLabel(type)}`)) setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const total = rows.reduce((n, r) => n + (Number.isFinite(r.count) ? r.count : 0), 0);
  return <div className="content-editor" data-testid="content-editor" data-kind="container">
    <span className="panel-kicker">INHALT · {containerLabel(type).toUpperCase()}</span>
    <p className="muted small">{rows.length} von {slots} Plätzen belegt · {total} Gegenstände</p>
    <datalist id={ITEM_LIST_ID}>{ids.map(id => <option key={id} value={short(id)} />)}</datalist>
    {rows.length > 0 && <ol className="content-slots">
      {rows.map((r, i) => <li key={i}>
        <select aria-label="Platz" value={r.slot} onChange={e => set(i, { slot: Number(e.target.value) })}>
          {[r.slot, ...free].sort((a, b) => a - b).map(s => <option key={s} value={s}>{slotLabel(type, s)}</option>)}
        </select>
        <input aria-label="Gegenstand" list={ITEM_LIST_ID} value={short(r.id)} placeholder="z. B. torch" onChange={e => set(i, { id: e.target.value })} />
        <input aria-label="Anzahl" type="number" min={1} max={MAX_STACK} value={r.count} onChange={e => set(i, { count: Math.trunc(Number(e.target.value)) })} />
        <button className="link" aria-label={`${slotLabel(type, r.slot)} leeren`} title="Platz leeren" onClick={() => setRows(rs => rs.filter((_, j) => j !== i))}>✕</button>
      </li>)}
    </ol>}
    <div className="button-grid">
      <button disabled={!free.length} onClick={() => setRows(rs => [...rs, { slot: free[0]!, id: '', count: 1 }])}>＋ Gegenstand</button>
      <button disabled={!rows.length} onClick={() => setRows([])}>Alles leeren</button>
    </div>
    <label>Name (Amboss)<input value={name} maxLength={50} placeholder="ohne Namen" onChange={e => setName(e.target.value)} aria-label="Name des Behälters" /></label>
    {problems.length > 0 && <p className="muted small content-problem" role="status">{problems[0]}</p>}
    {error && <p className="content-problem" role="alert">{error}</p>}
    <button className="primary" disabled={!changed || problems.length > 0} onClick={apply}>Inhalt übernehmen</button>
  </div>;
}

function SignForm(props: ContentEditorProps) {
  const start = useMemo(() => readSign(props.entity), [props.entity]);
  const [sign, setSign] = useState<SignEdit>(start);
  const [error, setError] = useState('');
  const problems = checkSign(sign);
  const changed = JSON.stringify(sign) !== JSON.stringify(start);
  const line = (side: 'front' | 'back', i: number, v: string) => setSign(s => ({ ...s, [side]: s[side].map((l, j) => j === i ? v : l) }));
  const apply = () => {
    try { if (write(props, withSign(props.entity, props.state.id, sign), 'Schildtext')) setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const lines = (side: 'front' | 'back', label: string) => <fieldset className="sign-lines">
    <legend>{label}</legend>
    {Array.from({ length: SIGN_LINES }, (_, i) => <input key={i} aria-label={`${label} Zeile ${i + 1}`} value={sign[side][i] ?? ''} maxLength={90} onChange={e => line(side, i, e.target.value)} />)}
  </fieldset>;
  return <div className="content-editor" data-testid="content-editor" data-kind="sign">
    <span className="panel-kicker">SCHILDTEXT</span>
    {lines('front', 'Vorderseite')}
    {lines('back', 'Rückseite')}
    <div className="sel-range">
      <label>Farbe<select value={sign.color} onChange={e => setSign(s => ({ ...s, color: e.target.value }))} aria-label="Textfarbe">
        {SIGN_COLORS.map(c => <option key={c} value={c}>{COLOR_DE[c] ?? c}</option>)}</select></label>
    </div>
    <label className="check"><input type="checkbox" checked={sign.glowing} onChange={e => setSign(s => ({ ...s, glowing: e.target.checked }))} /> leuchtender Text (Leuchttintenbeutel)</label>
    <label className="check"><input type="checkbox" checked={sign.waxed} onChange={e => setSign(s => ({ ...s, waxed: e.target.checked }))} /> gewachst (im Spiel nicht mehr änderbar)</label>
    {problems.length > 0 && <p className="muted small content-problem" role="status">{problems[0]}</p>}
    {error && <p className="content-problem" role="alert">{error}</p>}
    <button className="primary" disabled={!changed || problems.length > 0} onClick={apply}>Text übernehmen</button>
  </div>;
}
