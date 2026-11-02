import { useEffect, useState } from 'react';
import { createSurvey, decodeSurvey, surveyFile } from '../../../../../packages/domain/src/index.js';
import type { ProjectTerrainReference, SurveyArea, TerrainSurvey } from '../../../../../packages/domain/src/index.js';
import type { Repository } from '../../app/repository';
import { errorText } from '../../app/ui';
import type { WorldClient } from './protocol';

/**
 * Geländeaufnahmen in the web app (TERRAIN-01): read an area through the world
 * worker, store the survey file in the original store and load it again by
 * its content address. Decoded surveys are cached per hash for the session.
 */

const cache = new Map<string, Promise<TerrainSurvey>>();

/** Reads the columns of an area from the picked region files and builds a survey. */
export async function readSurvey(client: WorldClient, area: SurveyArea, dimension: string, includeIncomplete: boolean, progress?: (done: number, total: number) => void): Promise<TerrainSurvey> {
  const r = await client.survey({ area, includeIncomplete, ...(dimension === 'minecraft:the_nether' && { maxY: 120 }) }, progress);
  return createSurvey(r.columns, { dimension, newestChunkSave: r.newest, dataVersions: r.columns.dataVersions, regions: r.regions });
}

/** Stores the survey bytes (original store) and returns the project reference for `terrain.set`. */
export async function storeSurvey(repo: Repository, survey: TerrainSurvey, name: string): Promise<ProjectTerrainReference> {
  const { original, reference } = await surveyFile(survey, name);
  await repo.applyBatch({ originals: [original] });
  cache.set(reference.sha256, Promise.resolve(survey));
  return reference;
}

export function loadSurvey(repo: Repository, ref: ProjectTerrainReference): Promise<TerrainSurvey> {
  let p = cache.get(ref.sha256);
  if (!p) {
    p = repo.getOriginal(ref.sha256).then(o => {
      if (!o) throw new Error(`Geländeaufnahme ${ref.fileName} fehlt im Speicher. Bitte im Reiter „Gelände“ neu aufnehmen.`);
      return decodeSurvey(o.bytes);
    });
    p.catch(() => cache.delete(ref.sha256));
    cache.set(ref.sha256, p);
  }
  return p;
}

/** Loads the survey of a reference; `null` while loading or without reference. */
export function useSurvey(repo: Repository, ref: ProjectTerrainReference | null | undefined): { survey: TerrainSurvey | null; error: string } {
  const [state, setState] = useState<{ sha: string; survey: TerrainSurvey | null; error: string }>({ sha: '', survey: null, error: '' });
  const sha = ref?.sha256 ?? '';
  useEffect(() => {
    if (!ref) return;
    let live = true;
    loadSurvey(repo, ref).then(s => { if (live) setState({ sha: ref.sha256, survey: s, error: '' }); }, e => { if (live) setState({ sha: ref.sha256, survey: null, error: errorText(e) }); });
    return () => { live = false; };
  }, [repo, sha]); // eslint-disable-line react-hooks/exhaustive-deps
  return state.sha === sha && sha ? { survey: state.survey, error: state.error } : { survey: null, error: '' };
}

/** Area around world bounds with a margin, clamped to the survey limits around the centre. */
export function areaAround(x0: number, z0: number, x1: number, z1: number, margin: number, maxSide = 512): SurveyArea {
  const clamp = (a: number, b: number): [number, number] => {
    let lo = a - margin, hi = b + margin; // hi exclusive
    if (hi - lo > maxSide) { const mid = Math.floor((a + b) / 2); lo = mid - maxSide / 2; hi = lo + maxSide; }
    return [lo, hi];
  };
  const [ax, bx] = clamp(x0, x1), [az, bz] = clamp(z0, z1);
  return { minX: ax, minZ: az, width: bx - ax, length: bz - az };
}

export const areaLabel = (a: SurveyArea) => `X ${a.minX} … ${a.minX + a.width - 1} · Z ${a.minZ} … ${a.minZ + a.length - 1} (${a.width} × ${a.length})`;
