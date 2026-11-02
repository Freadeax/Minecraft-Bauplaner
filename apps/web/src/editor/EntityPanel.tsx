import { useState } from 'react';
import { PAINTING_VARIANTS, entityAnchor, entityLabel, makeArmorStand, makeItemFrame, makePainting, sortedEntities } from '../../../../packages/voxel/src/index.js';
import type { EquipmentSlot, Facing, FreeEntity, Vec3 } from '../../../../packages/voxel/src/index.js';
import type { Edit } from '../../../../packages/domain/src/index.js';
import '../viewer/content.css';

/**
 * Werkstatt: put up paintings, item frames and armor stands (ENTITY-01).
 * Hanging things go on the face of the picked block that looks towards the
 * chosen direction; armor stands stand on top of it. Every change is one
 * undoable edit that replaces the entity list of the draft.
 */
type Kind = 'painting' | 'frame' | 'stand';
const FACINGS: readonly (readonly [Facing, string])[] = [['north', 'Norden'], ['east', 'Osten'], ['south', 'Süden'], ['west', 'Westen'], ['up', 'oben'], ['down', 'unten']];
const STEP: Readonly<Record<Facing, Vec3>> = { north: [0, 0, -1], south: [0, 0, 1], west: [-1, 0, 0], east: [1, 0, 0], up: [0, 1, 0], down: [0, -1, 0] };
const MATERIALS = ['', 'leather', 'chainmail', 'iron', 'golden', 'diamond', 'netherite'] as const;
const MATERIAL_DE: Readonly<Record<string, string>> = { '': 'ohne', leather: 'Leder', chainmail: 'Ketten', iron: 'Eisen', golden: 'Gold', diamond: 'Diamant', netherite: 'Netherit' };
const PIECES: readonly (readonly [EquipmentSlot, string, string])[] = [['head', 'helmet', 'Helm'], ['chest', 'chestplate', 'Brustpanzer'], ['legs', 'leggings', 'Hose'], ['feet', 'boots', 'Stiefel']];
const VARIANTS = Object.entries(PAINTING_VARIANTS).sort((a, b) => a[1][0] * a[1][1] - b[1][0] * b[1][1] || a[0].localeCompare(b[0]));
const xyz = (p: readonly number[]) => `X ${p[0]} · Y ${p[1]} · Z ${p[2]}`;

export function EntityPanel({ entities, picked, run }: { entities: readonly FreeEntity[]; picked: Vec3 | null; run: (edit: Edit, ok?: string) => boolean }) {
  const [kind, setKind] = useState<Kind>('painting');
  const [facing, setFacing] = useState<Facing>('south');
  const [variant, setVariant] = useState('kebab');
  const [item, setItem] = useState('minecraft:diamond_sword');
  const [glow, setGlow] = useState(false);
  const [armor, setArmor] = useState<Record<EquipmentSlot, string>>({ head: 'iron', chest: 'iron', legs: '', feet: '', mainhand: '', offhand: '' });
  const [arms, setArms] = useState(true);
  const list = sortedEntities(entities);
  const hangs = kind !== 'stand';
  const validFacing = kind === 'painting' && (facing === 'up' || facing === 'down') ? 'south' : facing;

  const place = () => {
    if (!picked) return;
    let e: FreeEntity, ok: string;
    if (kind === 'stand') {
      const cell: Vec3 = [picked[0], picked[1] + 1, picked[2]];
      const eq: Partial<Record<EquipmentSlot, string>> = {};
      for (const [slot, piece] of PIECES) if (armor[slot]) eq[slot] = `minecraft:${armor[slot]}_${piece}`;
      e = makeArmorStand(cell, validFacing, eq, { arms });
      ok = `Rüstungsständer auf ${xyz(picked)} gestellt.`;
    } else {
      // The entity lives in the free cell in front of the picked block's face.
      const d = STEP[validFacing], anchor: Vec3 = [picked[0] + d[0], picked[1] + d[1], picked[2] + d[2]];
      e = kind === 'painting' ? makePainting(anchor, validFacing, `minecraft:${variant}`) : makeItemFrame(anchor, validFacing, item.trim() || null, glow);
      ok = `${kind === 'painting' ? 'Gemälde' : 'Rahmen'} an ${xyz(picked)} gehängt.`;
    }
    run({ label: entityLabel(e), changes: [], entities: [...entities, e] }, ok);
  };
  const remove = (e: FreeEntity) => run({ label: `${entityLabel(e)} entfernt`, changes: [], entities: entities.filter(x => x !== e) }, `${entityLabel(e)} entfernt.`);

  return <section className="panel-lite entity-panel" aria-label="Ausstattung" data-testid="entity-panel">
    <span className="panel-kicker">AUSSTATTUNG</span>
    <div className="seg" role="group" aria-label="Art">
      <button aria-pressed={kind === 'painting'} onClick={() => setKind('painting')}>Gemälde</button>
      <button aria-pressed={kind === 'frame'} onClick={() => setKind('frame')}>Rahmen</button>
      <button aria-pressed={kind === 'stand'} onClick={() => setKind('stand')}>Rüstungsständer</button>
    </div>
    <label>{hangs ? 'Hängt an der Seite nach' : 'Blickrichtung'}<select value={validFacing} onChange={e => setFacing(e.target.value as Facing)} aria-label="Richtung">
      {FACINGS.filter(([f]) => kind === 'frame' || (f !== 'up' && f !== 'down')).map(([f, l]) => <option key={f} value={f}>{l}</option>)}
    </select></label>
    {kind === 'painting' && <label>Motiv<select value={variant} onChange={e => setVariant(e.target.value)} aria-label="Motiv">
      {VARIANTS.map(([v, [w, h]]) => <option key={v} value={v}>{v.replace(/_/g, ' ')} ({w}×{h})</option>)}
    </select></label>}
    {kind === 'frame' && <>
      <label>Gegenstand<input value={item} onChange={e => setItem(e.target.value)} placeholder="minecraft:diamond_sword (leer = ohne)" aria-label="Gegenstand im Rahmen" /></label>
      <label className="check"><input type="checkbox" checked={glow} onChange={e => setGlow(e.target.checked)} /> Leuchtrahmen</label>
    </>}
    {kind === 'stand' && <>
      {PIECES.map(([slot, , label]) => <label key={slot}>{label}<select value={armor[slot]} onChange={e => setArmor(a => ({ ...a, [slot]: e.target.value }))} aria-label={label}>
        {MATERIALS.map(m => <option key={m} value={m}>{MATERIAL_DE[m]}</option>)}</select></label>)}
      <label className="check"><input type="checkbox" checked={arms} onChange={e => setArms(e.target.checked)} /> mit Armen</label>
    </>}
    <button className="primary" disabled={!picked} onClick={place} data-testid="entity-place">
      {picked ? `${kind === 'stand' ? 'Aufstellen auf' : 'Anbringen an'} ${xyz(picked)}` : 'Erst einen Block wählen (Prüfen oder Klick in 3D)'}</button>
    <p className="muted small">{hangs ? 'Hängt vor der gewählten Seite des gewählten Blocks; die Zelle davor muss frei sein.' : 'Steht auf dem gewählten Block.'} Speichern legt eine neue Version mit der Ausstattung an.</p>
    {list.length > 0 && <ul className="entity-list" aria-label="Ausstattung im Modell">{list.map((e, i) => <li key={i}>
      <span>{entityLabel(e)}<small className="muted"> · {xyz(entityAnchor(e))}</small></span>
      <button className="link" onClick={() => remove(e)} aria-label={`${entityLabel(e)} entfernen`}>entfernen</button></li>)}</ul>}
  </section>;
}
