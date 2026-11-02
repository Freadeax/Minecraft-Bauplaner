import { useMemo } from 'react';
import './content.css';
import { blockEntityContent, entityAnchor, entityEquipment, entityFacing, entityItems, entityKind, entityLabel, hasContent, paintingInfo, sortedEntities, EQUIPMENT_SLOTS } from '../../../../packages/voxel/src/index.js';
import type { BlockEntityContent, FreeEntity, ItemStack, NbtTag, Vec3, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { containerLabel } from '../../../../packages/domain/src/index.js';

/**
 * Contents of blocks and free entities (ENTITY-01): sign text, container items,
 * banner patterns, paintings, frames and armor stands. Read-only views on the
 * stored NBT; nothing here changes a payload.
 */
const short = (id: string) => id.replace(/^minecraft:/, '').replace(/_/g, ' ');
const xyz = (p: readonly number[]) => `X ${p[0]} · Y ${p[1]} · Z ${p[2]}`;
const FACING_DE: Readonly<Record<string, string>> = { north: 'Norden', south: 'Süden', east: 'Osten', west: 'Westen', up: 'oben', down: 'unten' };
const SLOT_DE: Readonly<Record<string, string>> = { head: 'Kopf', chest: 'Brust', legs: 'Beine', feet: 'Füße', mainhand: 'Haupthand', offhand: 'Nebenhand' };
const stack = (s: ItemStack) => `${s.count > 1 ? `${s.count}× ` : ''}${short(s.id)}${s.name ? ` „${s.name}“` : ''}`;

export function ItemList({ items, max = 27 }: { items: readonly ItemStack[]; max?: number }) {
  if (!items.length) return <p className="muted">leer</p>;
  return <ul className="content-items">{items.slice(0, max).map((s, i) => <li key={i}>{typeof s.slot === 'number' && <small>Platz {s.slot}</small>}<span>{stack(s)}</span></li>)}
    {items.length > max && <li className="muted">… und {items.length - max} weitere</li>}</ul>;
}

/** Card for the content of one block entity (null when it holds nothing readable). */
export function BlockContent({ content }: { content: BlockEntityContent }) {
  if (!hasContent(content)) return null;
  const lines = (l: readonly string[]) => l.map((t, i) => <span key={i}>{t || ' '}</span>);
  return <div className="content-card" data-testid="block-content">
    <strong>{content.sign ? 'Schild' : content.patterns ? 'Banner' : containerLabel(content.id)}{content.name && ` „${content.name}“`}</strong>
    {content.sign && <div className="sign-text">
      <div aria-label="Vorderseite">{lines(content.sign.front)}</div>
      {content.sign.back.some(l => l.trim()) && <div aria-label="Rückseite"><small>Rückseite</small>{lines(content.sign.back)}</div>}
      {content.sign.waxed && <small>gewachst</small>}
    </div>}
    {content.patterns && <ol className="banner-patterns">{content.patterns.map((p, i) => <li key={i}>{short(p.color)} · {short(p.pattern)}</li>)}</ol>}
    {(content.items.length > 0 || (!content.sign && !content.patterns)) && <ItemList items={content.items} />}
  </div>;
}

/** Card for one free entity. */
export function EntityCard({ entity }: { entity: FreeEntity }) {
  const kind = entityKind(entity), facing = entityFacing(entity), anchor = entityAnchor(entity);
  const eq = kind === 'armor_stand' ? entityEquipment(entity) : null;
  return <div className="content-card" data-testid="entity-card">
    <strong>{entityLabel(entity)}</strong>
    <dl>
      <dt>Zelle</dt><dd>{xyz(anchor)}</dd>
      <dt>Position</dt><dd>{entity.position.map(n => Math.round(n * 1000) / 1000).join(' / ')}</dd>
      {facing && <><dt>Blickrichtung</dt><dd>{FACING_DE[facing]}</dd></>}
      {kind === 'painting' && (() => { const p = paintingInfo(entity); return <><dt>Motiv</dt><dd>{short(p.variant)} · {p.width} × {p.height}{!p.known && ' (unbekanntes Motiv)'}</dd></>; })()}
      {(kind === 'item_frame' || kind === 'glow_item_frame') && <><dt>Gegenstand</dt><dd>{entityItems(entity).contents.map(stack).join(', ') || 'leer'}</dd></>}
      {eq && EQUIPMENT_SLOTS.filter(s => eq[s]).map(s => <div key={s} style={{ display: 'contents' }}><dt>{SLOT_DE[s]}</dt><dd>{stack(eq[s]!)}</dd></div>)}
    </dl>
  </div>;
}

/** Content at one block position of a payload (block entity), or null. */
export function contentAt(payload: Pick<VoxelPayload, 'blockEntities'>, position: Vec3): BlockEntityContent | null {
  const be = payload.blockEntities.find(e => e.position[0] === position[0] && e.position[1] === position[1] && e.position[2] === position[2]);
  return be ? blockEntityContent(be.data as NbtTag) : null;
}

/**
 * Summary below a 3D view: free entities and blocks with content, each with
 * its details in a fold-out list.
 */
export function FurnishingSummary({ payload }: { payload: Pick<VoxelPayload, 'blockEntities' | 'entities'> }) {
  const data = useMemo(() => {
    const entities = sortedEntities(payload.entities ?? []);
    const contents = payload.blockEntities.map(e => ({ position: e.position, content: blockEntityContent(e.data) })).filter(c => hasContent(c.content));
    const kinds = new Map<string, number>(['Gemälde', 'Rahmen', 'Leuchtrahmen', 'Rüstungsständer', 'andere Entities'].map(k => [k, 0]));
    for (const e of entities) { const k = entityKind(e), label = k === 'painting' ? 'Gemälde' : k === 'item_frame' ? 'Rahmen' : k === 'glow_item_frame' ? 'Leuchtrahmen' : k === 'armor_stand' ? 'Rüstungsständer' : 'andere Entities'; kinds.set(label, (kinds.get(label) ?? 0) + 1); }
    const signs = contents.filter(c => c.content.sign).length, banners = contents.filter(c => c.content.patterns).length;
    const containers = contents.length - signs - banners;
    return { entities, contents, kinds, signs, banners, containers };
  }, [payload]);
  if (!data.entities.length && !data.contents.length) return null;
  const parts = [...[...data.kinds].filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`),
    ...(data.containers ? [`${data.containers} Behälter mit Inhalt`] : []), ...(data.signs ? [`${data.signs} beschriftete Schilder`] : []), ...(data.banners ? [`${data.banners} gemusterte Banner`] : [])];
  return <details className="furnishing" data-testid="furnishing-summary">
    <summary><strong>Ausstattung und Inhalte</strong> · {parts.join(' · ')}</summary>
    <div className="furnishing-grid">
      {data.entities.map((e, i) => <EntityCard key={`e${i}`} entity={e} />)}
      {data.contents.map(c => <div key={c.position.join(',')}><small className="muted">{xyz(c.position)}</small><BlockContent content={c.content} /></div>)}
    </div>
  </details>;
}
