import { useMemo } from 'react';
import { inspectCell } from '../../../../packages/domain/src/index.js';
import type { Resolution } from '../../../../packages/domain/src/index.js';
import type { BlockState, Vec3 } from '../../../../packages/voxel/src/index.js';

const xyz = (p: Vec3) => `X ${p[0]} · Y ${p[1]} · Z ${p[2]}`;
const stateText = (s: BlockState | null) => s ? `${s.id}${Object.keys(s.properties).length ? `[${Object.entries(s.properties).map(([k, v]) => `${k}=${v}`).join(',')}]` : ''}` : 'Löschzelle';

/** Inspector card for a picked block: world coordinate, block state and the local coordinate in each contributing instance. */
export function BlockInfo({ resolution, position, onSelectInstance }: { resolution: Resolution; position: Vec3; onSelectInstance: (id: string) => void }) {
  const info = useMemo(() => inspectCell(resolution, position), [resolution, position]);
  if (!info.cell) return null;
  return <section className="block-info" aria-label="Gewählter Block" aria-live="polite">
    <span className="panel-kicker">GEWÄHLTER BLOCK</span>
    <dl>
      <dt>Welt</dt><dd><strong>{xyz(info.world)}</strong></dd>
      <dt>Zustand</dt><dd>{info.cell.kind === 'air' ? 'explizite Luft' : stateText(info.state)}</dd>
      {info.sources.map(s => <div key={s.instanceId} style={{ display: 'contents' }}>
        <dt>Lokal</dt><dd>{xyz(s.local)} in <button className="link" onClick={() => onSelectInstance(s.instanceId)}>{s.instanceName}</button>
          {info.sources.length > 1 && <> · {stateText(s.state)}</>}</dd>
      </div>)}
    </dl>
    {info.conflict && <p className="badge danger">Ungeklärter Konflikt – Vorschau zeigt die erste Instanz.</p>}
    {info.overridden && <p className="muted">Per Vorrang entschieden.</p>}
  </section>;
}
