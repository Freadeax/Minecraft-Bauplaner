import { useMemo } from 'react';
import { formatStacks, recipesForMaterials, recipesToCsv } from '../../../../../packages/domain/src/index.js';
import type { BaseKind, MaterialReport, ProfileRecipe, RecipeStep, Station } from '../../../../../packages/domain/src/index.js';
import { download, formatNumber } from '../../app/ui';

const stationLabel: Record<Station, string> = { crafting: 'Werkbank', stonecutter: 'Steinsäge', smelting: 'Ofen', tool: 'Werkzeug', water: 'Wasser' };
const kindLabel: Record<BaseKind, string> = { raw: 'Rohstoff', stock: 'vorhanden', unknown: 'kein Rezept' };
const short = (id: string): string => id.replace(/^minecraft:/, '');
const profileStationLabel: Record<ProfileRecipe['station'], string> = { crafting: 'Werkbank', stonecutter: 'Steinsäge', smelting: 'Ofen', blasting: 'Schmelzofen', smoking: 'Räucherofen', campfire: 'Lagerfeuer', smithing: 'Schmiedetisch' };
/** One profile recipe as text: "Steinsäge: 1 stone → 1 stone_bricks". */
const altText = (r: ProfileRecipe): string => `${profileStationLabel[r.station]}: ${r.inputs.map(i => `${i.count} ${i.tag ? i.tag.slice(1) : i.alternatives.map(short).slice(0, 3).join('/') + (i.alternatives.length > 3 ? '/…' : '')}`).join(' + ')} → ${r.count}`;

export interface RawMaterialsSettings {
  /** Items marked "vorhanden" (stored in the project's site plan, B14). */
  readonly stock: readonly string[];
  readonly cutter: boolean;
  onToggle(itemId: string): void;
  onReset(): void;
  onCutter(cutter: boolean): void;
}

/** Raw materials and crafting steps for the build items of a material report (domain `recipes.ts`). */
export function RawMaterialsPanel({ report, fileStem, settings }: { report: MaterialReport; fileStem: string; settings: RawMaterialsSettings }) {
  const { stock, cutter, onToggle: toggle } = settings;
  const recipes = useMemo(() => recipesForMaterials(report, { method: cutter ? 'stonecutter' : 'crafting', stock }), [report, cutter, stock]);
  if (!report.items.length) return null;
  const ops = (Object.keys(stationLabel) as Station[]).filter(s => recipes.stations[s] > 0);

  return <section className="raw-materials" aria-label="Rohstoffe und Rezepte">
    <div className="raw-head">
      <h3 className="materials-title">Rohstoffe und Rezepte <small>aus {formatNumber(report.totals.items)} Bauitems</small></h3>
      <label className="raw-toggle"><input type="checkbox" checked={cutter} onChange={e => settings.onCutter(e.target.checked)} /> Steinsäge bevorzugen</label>
      {stock.length > 0 && <button className="materials-csv" onClick={settings.onReset}>Vorhanden zurücksetzen ({stock.length})</button>}
      <button className="materials-csv" onClick={() => download(`${fileStem}-rohstoffe.csv`, '﻿' + recipesToCsv(recipes), 'text/csv;charset=utf-8')}>⤓ Rohstoff-CSV</button>
    </div>
    <div className={`notice raw-status ${recipes.complete ? 'ok' : 'warning'}`} role="status">
      <strong>{recipes.complete ? '✓ Alle Bauitems bis zu Rohstoffen aufgelöst' : `⚠ ${recipes.base.filter(b => b.kind === 'unknown').length} Items ohne Rezept im Katalog`}</strong>
      {!report.complete && <ul><li>Grundlage ist eine vorläufige Bauitemliste – ungelöste Blockzustände fehlen auch hier.</li></ul>}
    </div>
    <dl className="report-stats raw-stats">
      <div><dt>Rohstoffe</dt><dd>{formatNumber(recipes.totals.raw)}</dd></div>
      <div><dt>Inventarplätze Rohstoffe</dt><dd>{formatNumber(recipes.totals.slots)}</dd></div>
      {ops.map(s => <div key={s}><dt>{stationLabel[s]}-Vorgänge</dt><dd>{formatNumber(recipes.stations[s])}</dd></div>)}
      {recipes.fuel.smelts > 0 && <div title={recipes.fuel.options.map(o => `${formatNumber(o.count)} ${short(o.itemId)} (je ${o.smeltsEach} Vorgänge)`).join(' · ')}><dt>Brennstoff (Kohle)</dt><dd>{formatNumber(recipes.fuel.coal)} <small>nicht enthalten</small></dd></div>}
    </dl>
    <div className="table-wrap"><table className="materials-table raw-table">
      <thead><tr><th>Grundbedarf</th><th className="num">Menge</th><th className="num">Stacks</th><th>Herkunft</th></tr></thead>
      <tbody>{recipes.base.map(b => <tr key={b.itemId} className={b.kind === 'unknown' ? 'assumed' : undefined}>
        <td><code>{short(b.itemId)}</code>{b.direct > 0 && b.direct < b.count && <small>davon {formatNumber(b.direct)} direkt verbaut</small>}</td>
        <td className="num">{formatNumber(b.count)}</td>
        <td className="num">{formatStacks(b)}{b.stackSize !== 64 && <small>Stapel {b.stackSize}</small>}</td>
        <td>{b.kind === 'raw' ? b.source : <><em className={`badge ${b.kind === 'unknown' ? 'warn' : 'stock'}`}>{kindLabel[b.kind]}</em>{b.kind === 'stock' &&
          <button className="link-button" onClick={() => toggle(b.itemId)}>wieder auflösen</button>}</>}</td>
      </tr>)}</tbody>
    </table></div>
    {recipes.steps.length > 0 && <>
      <h3 className="materials-title">Arbeitsschritte <small>Reihenfolge: Zutaten zuerst · {recipes.steps.length} Schritte</small></h3>
      <ol className="recipe-steps">{recipes.steps.map(s => <StepRow key={s.recipe.id} step={s} onStock={() => toggle(s.itemId)} />)}</ol>
    </>}
    {recipes.surplus.length > 0 && <p className="raw-surplus"><strong>Rest nach dem Herstellen:</strong> {recipes.surplus.map(s => `${formatNumber(s.count)} ${short(s.item)}`).join(' · ')}</p>}
    <ul className="materials-notes">{recipes.notes.map(n => <li key={n}>{n}</li>)}</ul>
  </section>;
}

function StepRow({ step, onStock }: { step: RecipeStep; onStock: () => void }) {
  const r = step.recipe;
  return <li className={step.buildItem ? 'build-item' : undefined}>
    <span className="step-station">{stationLabel[r.station]} × {formatNumber(step.operations)}</span>
    <span className="step-formula">{step.inputs.map(i => `${formatNumber(i.count)} ${short(i.item)}`).join(' + ')} → <b>{formatNumber(step.produced)} {short(step.itemId)}</b>
      {step.surplus > 0 && <small> (Rest {formatNumber(step.surplus)})</small>}{r.note && <small className="note"> · {r.note}</small>}
      {step.alternatives.length > 0 && <details className="recipe-alternatives"><summary>{step.alternatives.length === 1 ? '1 Alternative' : `${step.alternatives.length} Alternativen`} im Spiel</summary>
        {step.alternatives.slice(0, 8).map(a => <span key={a.file} className="alt-line">{altText(a)}</span>)}</details>}</span>
    <button className="link-button" onClick={onStock} title="Nicht herstellen, sondern als vorhanden zählen">vorhanden</button>
  </li>;
}
