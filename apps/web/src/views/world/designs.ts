import { useEffect, useState } from 'react';
import { cloneDesign, decodeDesign, designFile, flatSurvey, plannedSurvey } from '../../../../../packages/domain/src/index.js';
import type { Project, ProjectTerrainDesignReference, ProjectTerrainReference, TerrainDesign, TerrainSurvey } from '../../../../../packages/domain/src/index.js';
import type { Repository } from '../../app/repository';
import { errorText } from '../../app/ui';
import { loadSurvey } from './surveys';

/**
 * Geländegestaltungen in the web app (TERRAIN-02): store and load the design
 * file, its base (the survey it was made on, or flat ground) and the planned
 * terrain as a survey for the world map and the Anlagen planner. Decoded
 * designs are cached per hash; callers clone before editing.
 */

const designs = new Map<string, Promise<TerrainDesign>>();
const planned = new Map<string, Promise<TerrainSurvey>>();

export function loadDesign(repo: Repository, ref: ProjectTerrainDesignReference): Promise<TerrainDesign> {
  let p = designs.get(ref.sha256);
  if (!p) {
    p = repo.getOriginal(ref.sha256).then(o => {
      if (!o) throw new Error(`Geländegestaltung ${ref.fileName} fehlt im Speicher. Bitte aus einer Sicherung wiederherstellen.`);
      return decodeDesign(o.bytes);
    });
    p.catch(() => designs.delete(ref.sha256));
    designs.set(ref.sha256, p);
  }
  return p.then(cloneDesign);
}

/** The base of a design: its survey from the original store, or flat ground. */
export function loadDesignBase(repo: Repository, ref: Pick<ProjectTerrainDesignReference, 'base' | 'area' | 'dimension'>): Promise<TerrainSurvey> {
  if (ref.base.kind === 'flat') return Promise.resolve(flatSurvey(ref.area, ref.base.y, ref.dimension));
  const pseudo = { sha256: ref.base.sha256, fileName: 'Geländeaufnahme unter der Gestaltung' } as ProjectTerrainReference;
  return loadSurvey(repo, pseudo);
}

/** Planned terrain of a project's design as a survey. */
export function loadPlannedSurvey(repo: Repository, ref: ProjectTerrainDesignReference): Promise<TerrainSurvey> {
  let p = planned.get(ref.sha256);
  if (!p) {
    // Built-in scatter parts (trees, rocks) raise the surface like real vegetation; own Schablonen need the library and are left out here.
    p = Promise.all([loadDesignBase(repo, ref), loadDesign(repo, ref)]).then(([base, d]) => plannedSurvey(base, d));
    p.catch(() => planned.delete(ref.sha256));
    planned.set(ref.sha256, p);
  }
  return p;
}

/** Stores the design bytes and returns the project reference for `terrainDesign.set`. */
export async function storeDesign(repo: Repository, design: TerrainDesign, base: TerrainSurvey, name: string): Promise<ProjectTerrainDesignReference> {
  const { original, reference } = await designFile(design, base, name);
  await repo.applyBatch({ originals: [original] });
  designs.set(reference.sha256, Promise.resolve(cloneDesign(design)));
  return reference;
}

/** Terrain a project offers to the world map and the Anlagen planner: planned (design) or measured (survey). */
export type TerrainSource = 'planned' | 'measured';

export function projectTerrain(repo: Repository, p: Project, prefer: TerrainSource): Promise<TerrainSurvey> | null {
  if (prefer === 'planned' && p.terrainDesign) return loadPlannedSurvey(repo, p.terrainDesign);
  if (p.terrain) return loadSurvey(repo, p.terrain);
  if (p.terrainDesign) return loadPlannedSurvey(repo, p.terrainDesign);
  return null;
}

/** Dimension of the terrain a project would offer. */
export const projectTerrainDimension = (p: Project, prefer: TerrainSource): string | null =>
  (prefer === 'planned' && p.terrainDesign ? p.terrainDesign.dimension : p.terrain?.dimension ?? p.terrainDesign?.dimension) ?? null;

/** Loads the project's terrain (planned or measured); null while loading or without terrain. */
export function useProjectTerrain(repo: Repository, p: Project | null | undefined, prefer: TerrainSource): { survey: TerrainSurvey | null; error: string; source: TerrainSource | null } {
  const key = p ? `${prefer}:${prefer === 'planned' && p.terrainDesign ? p.terrainDesign.sha256 : p.terrain?.sha256 ?? p.terrainDesign?.sha256 ?? ''}` : '';
  const source: TerrainSource | null = !p ? null : prefer === 'planned' && p.terrainDesign ? 'planned' : p.terrain ? 'measured' : p.terrainDesign ? 'planned' : null;
  const [state, setState] = useState<{ key: string; survey: TerrainSurvey | null; error: string }>({ key: '', survey: null, error: '' });
  useEffect(() => {
    if (!p) return;
    const promise = projectTerrain(repo, p, prefer);
    if (!promise) return;
    let live = true;
    promise.then(s => { if (live) setState({ key, survey: s, error: '' }); }, e => { if (live) setState({ key, survey: null, error: errorText(e) }); });
    return () => { live = false; };
  }, [repo, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state.key === key && key.split(':')[1] ? { survey: state.survey, error: state.error, source } : { survey: null, error: '', source };
}
