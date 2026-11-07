import { useMemo } from 'react';
import { positionKey, VERDICT_LABEL } from '../../../../../../packages/domain/src/index.js';
import type { CellDeviation, Guide, GuideStep, Resolution, StepStatus } from '../../../../../../packages/domain/src/index.js';
import type { BlockState } from '../../../../../../packages/voxel/src/index.js';
import { mix, stateColor } from '../../../colors';

const DIM = '#16303c', DONE = '#3f6b5c', MAX_GRID = 96;
function stateText(state: BlockState): string {
  const props = Object.entries(state.properties).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`);
  return props.length ? `${state.id}[${props.join(',')}]` : state.id;
}

/** Top-down plan of the step's layer: current step bright, rest of the layer dimmed, coordinates on both axes. */
export function LayerPlan({ step, guide, status, resolution, deviations, big = false }: { step: GuideStep; guide: Guide; status: (id: string) => StepStatus; resolution: Pick<Resolution, 'world'>; deviations: ReadonlyMap<string, CellDeviation> | null; big?: boolean }) {
  const world = resolution.world!;
  const { cells, region } = useMemo(() => {
    const own = new Set(step.positions.map(positionKey));
    const stepOf = new Map<string, GuideStep>();
    for (const s of guide.steps) if (s.y === step.y) for (const p of s.positions) stepOf.set(positionKey(p), s);
    let min = [world.bounds.min[0], world.bounds.min[2]], max = [world.bounds.maxExclusive[0], world.bounds.maxExclusive[2]];
    if (max[0]! - min[0]! > MAX_GRID || max[1]! - min[1]! > MAX_GRID) {
      min = [step.bounds.min[0] - 2, step.bounds.min[2] - 2]; max = [Math.min(step.bounds.maxExclusive[0] + 2, min[0]! + MAX_GRID), Math.min(step.bounds.maxExclusive[2] + 2, min[1]! + MAX_GRID)];
    }
    const out: { x: number; z: number; fill: string; label: string; own: boolean; dev: string }[] = [];
    for (const c of world.cells) {
      const [x, y, z] = c.position;
      if (y !== step.y || x < min[0]! || x >= max[0]! || z < min[1]! || z >= max[1]!) continue;
      const key = positionKey(c.position), s = stepOf.get(key);
      const state = c.kind === 'erase' ? null : world.palette[c.paletteIndex]!;
      const base = c.kind === 'block' ? stateColor(state!.id) : c.kind === 'erase' ? '#d35f5f' : '#2a4552';
      const mine = own.has(key);
      const fill = mine ? base : s && status(s.id) === 'done' ? mix(base, DONE, 0.6) : mix(base, DIM, 0.7);
      const dev = deviations?.get(key);
      out.push({ x, z, fill, own: mine, dev: dev ? `dev ${dev.verdict}` : '', label: `X ${x} · Y ${y} · Z ${z}: ${c.kind === 'erase' ? 'löschen' : c.kind === 'air' ? 'Luft' : stateText(state!)}${s ? ` (Schritt ${s.order})` : ''}${dev ? ` · im Spiel: ${VERDICT_LABEL[dev.verdict]}${dev.actual ? ` (${dev.actual})` : ''}` : ''}` });
    }
    return { cells: out, region: { min, max } };
  }, [step, guide, status, world, deviations]);
  const w = region.max[0]! - region.min[0]!, h = region.max[1]! - region.min[1]!;
  const tickEvery = Math.max(1, Math.ceil(Math.max(w, h) / 12));
  return <figure className={`layer-plan${big ? ' big' : ''}`}>
    <figcaption>Draufsicht Schicht Y {step.y} · Norden oben (−Z), Osten rechts (+X)</figcaption>
    <svg viewBox={`-2 -2 ${w + 3} ${h + 3}`} role="img" aria-label={`Schichtplan Y ${step.y} mit ${step.positions.length} Zellen dieses Schritts`}>
      {Array.from({ length: w }, (_, i) => i % tickEvery === 0 && <text key={`x${i}`} x={i + 0.5} y={-0.6} className="axis">{region.min[0]! + i}</text>)}
      {Array.from({ length: h }, (_, i) => i % tickEvery === 0 && <text key={`z${i}`} x={-0.6} y={i + 0.75} className="axis end">{region.min[1]! + i}</text>)}
      <rect x={0} y={0} width={w} height={h} className="plan-bg" />
      {cells.map(c => <rect key={`${c.x},${c.z}`} x={c.x - region.min[0]!} y={c.z - region.min[1]!} width={0.94} height={0.94} fill={c.fill} className={[c.own ? 'own' : '', c.dev].filter(Boolean).join(' ') || undefined}><title>{c.label}</title></rect>)}
    </svg>
  </figure>;
}
