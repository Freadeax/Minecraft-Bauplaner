import { useEffect, useState } from 'react';
import { NETWORK_MODE_LABEL, applyPlanLandscape, designFromSurvey, fitAnlageToTerrain, lampPostPart, landscapeRims, withoutNetwork } from '../../../../../packages/domain/src/index.js';
import type { AnlagePlan, AnlageTerrainFit, Asset, AssetVersion, NetworkMode, Operation, PathSteps, PathWater, PlanLandscapeResult, PlanNetwork, Project, TerrainDesign, TerrainMode, TerrainSurvey } from '../../../../../packages/domain/src/index.js';
import type { Repository } from '../../app/repository';
import { formatNumber } from '../../app/ui';
import { loadDesign, loadDesignBase, projectTerrain, storeDesign } from '../world/designs';
import { loadSurvey } from '../world/surveys';

/**
 * Pläne auf geplantem Gelände in the web app (TERRAIN-03-S08, GROSS-01-S08):
 * shared by the base planner and the Großprojekt planner. The preview works on
 * a throwaway design from the planned terrain; adoption loads the project's
 * real design (or starts one from its Geländeaufnahme), writes building sites
 * and network into it, stores it and returns the operations.
 */

export interface LandscapeChoice {
  readonly network: NetworkMode;
  readonly steps: PathSteps;
  readonly water: PathWater;
  /** Level the building sites (margin 3) and reclaim sites in the water. */
  readonly grade: boolean;
  /** Quay walls at the water edges of graded sites. */
  readonly quay: boolean;
}
export const DEFAULT_LANDSCAPE: LandscapeChoice = { network: 'bauteil', steps: 'stairs', water: 'bridge', grade: false, quay: true };
const GRADE_MARGIN = 3;

/** Whether the choice writes anything into the terrain design. */
export const writesLandscape = (c: LandscapeChoice) => c.network === 'landschaft' || c.grade;

export interface LandscapePreview {
  readonly fit: AnlageTerrainFit;
  readonly result: PlanLandscapeResult;
}

/** Terrain fit of the plan as adopted (without its network part in landscape mode) plus the landscape result on a throwaway design. */
export function previewLandscape(plan: AnlagePlan, survey: TerrainSurvey, input: {
  origin: readonly [number, number, number]; offset: readonly [number, number]; mode: TerrainMode; choice: LandscapeChoice; network: PlanNetwork | null;
}): LandscapePreview {
  const landscape = input.choice.network === 'landschaft';
  const fitted = landscape ? withoutNetwork(plan) : plan;
  const fit = fitAnlageToTerrain(fitted, { survey, origin: [...input.origin], offset: input.offset, mode: input.mode });
  const d = designFromSurvey(survey, { kind: 'flat', y: 0 });
  const result = applyPlanLandscape(d, fitted, { origin: [...input.origin], offset: input.offset, heights: fit.heights, network: landscape ? input.network : null,
    steps: input.choice.steps, water: input.choice.water, grade: input.choice.grade ? GRADE_MARGIN : null, quay: input.choice.quay });
  return { fit, result };
}

/** The project's design for editing: its stored design, or a new one from its Geländeaufnahme. */
async function editableDesign(repo: Repository, project: Project): Promise<{ design: TerrainDesign; base: TerrainSurvey }> {
  if (project.terrainDesign) {
    const [design, base] = await Promise.all([loadDesign(repo, project.terrainDesign), loadDesignBase(repo, project.terrainDesign)]);
    return { design, base };
  }
  if (!project.terrain) throw new Error('Das Zielprojekt hat keine Geländeaufnahme');
  const base = await loadSurvey(repo, project.terrain);
  return { design: designFromSurvey(base, { kind: 'survey', sha256: project.terrain.sha256 }), base };
}

export interface LandscapeAdoption<T extends AnlagePlan> {
  /** Plan to adopt: without the flat network, with the lamp part when there are lamps. */
  readonly plan: T;
  readonly heights: ReadonlyMap<string, number>;
  readonly operation: Operation;
  readonly result: PlanLandscapeResult;
  /** Lamp part to store before the project (asset and version). */
  readonly lamps: { readonly asset: Asset; readonly version: AssetVersion } | null;
}

/**
 * Writes the plan into the project's terrain design and returns the plan to
 * adopt with its heights and the `terrainDesign.set` operation. The design is
 * stored (original store); the operation is applied by the caller together
 * with the plan, so undo removes both.
 */
export async function adoptLandscape<T extends AnlagePlan & { network: unknown }>(repo: Repository, project: Project, plan: T, input: {
  offset: readonly [number, number]; mode: TerrainMode; choice: LandscapeChoice; network: PlanNetwork | null; name: string; networkKey: string; asphalt?: boolean;
}): Promise<LandscapeAdoption<T>> {
  if (!project.world) throw new Error('Das Zielprojekt liegt nicht auf der Weltkarte');
  const origin = project.world.origin;
  const landscape = input.choice.network === 'landschaft';
  const fitted = landscape ? withoutNetwork(plan) : plan;
  const { design, base } = await editableDesign(repo, project);
  // Fit on the terrain as planned so far (the design before this plan), like the preview.
  const planned = await (projectTerrain(repo, project, 'planned') ?? Promise.resolve(base));
  const fit = fitAnlageToTerrain(fitted, { survey: planned, origin, offset: input.offset, mode: input.mode });
  const result = applyPlanLandscape(design, fitted, { origin, offset: input.offset, heights: fit.heights, network: landscape ? input.network : null,
    steps: input.choice.steps, water: input.choice.water, grade: input.choice.grade ? GRADE_MARGIN : null, quay: input.choice.quay });
  const reference = await storeDesign(repo, design, base, `${input.name} – Gelände`);
  const operation: Operation = { kind: 'terrainDesign.set', design: reference, label: `Gelände für „${input.name}“ angepasst` };
  if (!landscape) return { plan, heights: fit.heights, operation, result, lamps: null };
  // The network part (with its rims at open water edges) is replaced: the lamp part takes the rims at the fitted heights.
  const rims = landscapeRims(fitted, { origin, offset: input.offset, heights: fit.heights });
  const lamps = await lampPostPart(result.lamps, { origin, offset: input.offset, key: input.networkKey, name: input.name, asphalt: !!input.asphalt, rims });
  const adopted = { ...fitted, placements: [...fitted.placements, ...(lamps ? [lamps.placement] : [])], network: lamps ? { asset: lamps.asset, version: lamps.version } : null } as T;
  return { plan: adopted, heights: fit.heights, operation, result, lamps: lamps ? { asset: lamps.asset, version: lamps.version } : null };
}

/** One sentence on what the landscape step does or did. */
export function landscapeSummary(r: PlanLandscapeResult): string {
  const parts: string[] = [];
  if (r.path && r.path.columns) {
    const pieces = [r.path.stairs && `${formatNumber(r.path.stairs)} Treppen`, r.path.slabs && `${formatNumber(r.path.slabs)} Halbstufen`].filter(Boolean).join(' und ');
    parts.push(`Weg ${formatNumber(r.path.columns)} Felder${pieces ? ` mit ${pieces}` : ''}${r.path.bridge ? `, Brücke über ${formatNumber(r.path.bridge)} Wasserfelder (${formatNumber(r.path.rails)} mit Geländer)` : ''}${r.path.causeway ? `, ${formatNumber(r.path.causeway)} Felder Damm` : ''}${r.path.open ? `, ${formatNumber(r.path.open)} Höhenwechsel ohne Stufe` : ''}`);
  }
  if (r.grade) parts.push(`${formatNumber(r.grade.graded)} Bauplatzspalten eingeebnet, ${formatNumber(r.grade.blended)} angeglichen`);
  if (r.reclaimed) parts.push(`${formatNumber(r.reclaimed)} Spalten Bauplatz aus dem Wasser gewonnen`);
  if (r.quay) parts.push(`${formatNumber(r.quay)} Felder Kaimauer`);
  if (r.lamps.length || r.lampsDropped) parts.push(`${r.lamps.length} Laternen auf dem Gelände${r.lampsDropped ? ` (${r.lampsDropped} im Wasser, auf dem Weg oder am steilen Hang ausgelassen)` : ''}`);
  if (r.path && !r.path.columns && r.path.unknown) parts.push('Wege liegen außerhalb der Geländeaufnahme');
  return parts.length ? `${parts.join('; ')}.` : 'Keine Änderung am Gelände (Plan liegt außerhalb der Geländeaufnahme?).';
}

/** Controls for the landscape step (only shown with a target project that has terrain). */
export function LandscapeControls({ choice, onChange, label, idPrefix }: { choice: LandscapeChoice; onChange(c: LandscapeChoice): void; label: string; idPrefix: string }) {
  const set = (patch: Partial<LandscapeChoice>) => onChange({ ...choice, ...patch });
  return <fieldset className="plan-landscape" data-testid={`${idPrefix}-landscape`}>
    <legend>Gelände anpassen</legend>
    <label>{label}<select value={choice.network} aria-label={label} onChange={e => set({ network: e.target.value as NetworkMode })}>
      {(Object.keys(NETWORK_MODE_LABEL) as NetworkMode[]).map(m => <option key={m} value={m}>{NETWORK_MODE_LABEL[m]}</option>)}</select></label>
    {choice.network === 'landschaft' && <>
      <label>Stufen<select value={choice.steps} aria-label="Wegstufen" onChange={e => set({ steps: e.target.value as PathSteps })}>
        <option value="stairs">Treppen</option><option value="slabs">Halbstufen</option><option value="none">keine</option></select></label>
      <label>Über Wasser<select value={choice.water} aria-label="Weg über Wasser" onChange={e => set({ water: e.target.value as PathWater })}>
        <option value="bridge">Brücke mit Geländer</option><option value="causeway">Damm</option></select></label>
    </>}
    <label className="chip-check"><input type="checkbox" checked={choice.grade} onChange={e => set({ grade: e.target.checked })} /> Bauplätze einebnen</label>
    {choice.grade && <label className="chip-check"><input type="checkbox" checked={choice.quay} onChange={e => set({ quay: e.target.checked })} /> Wasserkanten als Kaimauer</label>}
  </fieldset>;
}

/**
 * The target project as stored now: the list the library got on opening can be
 * older than an adoption made since (e.g. a base, then a town into the same
 * project), and preview, terrain and free-place search must see the real state.
 * Falls back to the listed project while loading; `bump` re-reads after an adoption.
 */
export function useStoredProject(repo: Repository, listed: Project | undefined, bump = 0): Project | undefined {
  const id = listed?.id;
  const [state, setState] = useState<{ id: string; project: Project } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    repo.getProject(id).then(p => { if (live && p) setState({ id, project: p }); }, () => {});
    return () => { live = false; };
  }, [repo, id, listed?.revision, bump]);
  return state && state.id === id && (!listed || (state.project.revision ?? 0) >= (listed.revision ?? 0)) ? state.project : listed;
}
