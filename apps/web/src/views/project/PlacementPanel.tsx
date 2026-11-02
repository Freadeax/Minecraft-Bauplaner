import { useMemo, useState } from 'react';
import { PLACEMENT_LABEL, checkPlacement } from '../../../../../packages/domain/src/index.js';
import type { Guide, PlacementKind } from '../../../../../packages/domain/src/index.js';
import type { BlockState, VoxelPayload } from '../../../../../packages/voxel/src/index.js';
import { formatNumber } from '../../app/ui';

const stateText = (s: BlockState): string => {
  const keys = Object.keys(s.properties).sort();
  return `${s.id.replace(/^minecraft:/, '')}${keys.length ? `[${keys.map(k => `${k}=${s.properties[k]}`).join(',')}]` : ''}`;
};
const KINDS: readonly PlacementKind[] = ['unsupported', 'falls', 'half', 'connection', 'invalid-state'];

/**
 * Spielprüfung der Bauanleitung (BLOCK-01): what the game will do with the plan –
 * blocks without support, falling blocks, missing halves, connections the game sets
 * differently, and buckets needed. Computed only when opened (large worlds).
 */
export function PlacementPanel({ world, guide, onSelect }: { readonly world: VoxelPayload; readonly guide: Guide; readonly onSelect: (stepId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PlacementKind | 'all'>('all');
  const report = useMemo(() => open ? checkPlacement(world, { maxIssues: 600 }) : null, [open, world]);
  const stepOf = useMemo(() => {
    if (!open) return null;
    const m = new Map<string, string>();
    for (const s of guide.steps) for (const p of s.positions) m.set(`${p[0]},${p[1]},${p[2]}`, s.id);
    return m;
  }, [open, guide]);
  const total = report ? KINDS.reduce((n, k) => n + report.counts[k], 0) : 0;
  const shown = report ? report.issues.filter(i => kind === 'all' || i.kind === kind).slice(0, 60) : [];
  return <details className="placement-check build-wide" onToggle={e => setOpen((e.target as HTMLDetailsElement).open)} data-testid="placement-panel">
    <summary><span className="panel-kicker">SPIELPRÜFUNG · BLOCKLOGIK 26.3</span> <strong>Halt, Schwerkraft und Verbindungen wie im Spiel</strong>
      {report && <span className={`badge${total ? ' review' : ''}`}>{total ? `${formatNumber(total)} Hinweise` : 'alles hält'}</span>}</summary>
    {report && <div className="placement-body">
      <p className="muted">Geprüft mit den Regeln des echten Spiels (canSurvive, Stützflächen, Verbindungen) für {formatNumber(report.blocks)} Blöcke.
        {report.dependsOnSurroundings > 0 && ` ${formatNumber(report.dependsOnSurroundings)} Blöcke stützen sich auf Zellen außerhalb des Plans (Gelände oder Bestand) – dort im Spiel nachsehen.`}
        {report.unknownBlocks > 0 && ` ${formatNumber(report.unknownBlocks)} Mod-Blöcke ohne Spielfakten wurden nicht geprüft.`}</p>
      <div className="chips" role="group" aria-label="Hinweisart">
        <button aria-pressed={kind === 'all'} onClick={() => setKind('all')}>Alle ({formatNumber(total)})</button>
        {KINDS.filter(k => report.counts[k]).map(k => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} data-kind={k}>{PLACEMENT_LABEL[k]} ({formatNumber(report.counts[k])})</button>)}
      </div>
      {report.aids.length > 0 && <ul className="placement-aids" aria-label="Hilfsmittel">{report.aids.map(a => <li key={a.reason}><strong>{formatNumber(a.count)} × {a.itemId.replace(/^minecraft:/, '')}</strong> – {a.reason}</li>)}</ul>}
      {shown.length > 0 && <ol className="placement-issues">
        {shown.map(i => { const step = stepOf?.get(`${i.position[0]},${i.position[1]},${i.position[2]}`); return <li key={`${i.kind}:${i.position.join(',')}`} data-kind={i.kind}>
          <span className="badge">{PLACEMENT_LABEL[i.kind]}</span> <code>{stateText(i.state)}</code> bei X {i.position[0]} · Y {i.position[1]} · Z {i.position[2]}
          <small>{i.note}{i.expected ? ` → ${stateText(i.expected)}` : ''}</small>
          {step && <button className="link-button" onClick={() => onSelect(step)}>Schritt zeigen</button>}
        </li>; })}
      </ol>}
      {report.truncated > 0 && <p className="muted">Weitere {formatNumber(report.truncated)} Hinweise nur gezählt.</p>}
      {report.counts.connection > 0 && <p className="muted">Verbindungen setzt das Spiel selbst; in der <strong>Werkstatt</strong> übernimmt „⛓ Wie im Spiel verbinden“ sie in den Plan, damit Vorschau und Export stimmen.</p>}
    </div>}
  </details>;
}
