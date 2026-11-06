import { useEffect, useRef, useState } from 'react';
import {
  LIVE_FEATURE_BOX, LIVE_FEATURE_TERRAIN, boxQuery, chunkBatches, knownQuery, liveCan, surveyFromLiveTerrain, terrainCoverage,
} from '../../../../../packages/domain/src/index.js';
import type { LiveTerrainChunk, SurveyArea, TerrainCoverage, TerrainGrid, TerrainSurvey } from '../../../../../packages/domain/src/index.js';
import { parseBlockState } from '../../../../../packages/formats/src/index.js';
import type { Bounds } from '../../../../../packages/voxel/src/index.js';
import { LiveError, liveApi } from '../map/liveClient';
import type { LiveGame } from '../map/liveClient';

/**
 * Gelände direkt aus der Mod (TERRAIN-04) for the project tabs „Gelände“ and „Landschaft“: the
 * building site's surface from the game (loaded chunks and, from mod 0.20.0, the Geländegedächtnis
 * with biomes) and the block-exact box for the terrain check. No region files, nothing goes to a server.
 */

export type GameTerrainLevel = 'memory' | 'loaded' | 'none';

/** What the connected mod can deliver for terrain: memory with biomes (0.20.0+), only loaded chunks, nothing. */
export function gameTerrainLevel(game: LiveGame): GameTerrainLevel {
  if (game.phase !== 'connected' || !game.token()) return 'none';
  return liveCan(game.hello, LIVE_FEATURE_TERRAIN) ? 'memory' : 'loaded';
}

export const canReadBox = (game: LiveGame): boolean => game.phase === 'connected' && !!game.token() && liveCan(game.hello, LIVE_FEATURE_BOX);

/** Player's dimension in the game, null when unknown. */
export const gameDimension = (game: LiveGame): string | null => game.status?.player?.dimension ?? null;

export interface GameSurveyResult { readonly survey: TerrainSurvey; readonly live: number; readonly remembered: number; readonly missing: number }

/** Reads all chunks of an area from the game (64 per request) and builds a Geländeaufnahme (source `mod`). */
export async function takeGameSurvey(game: LiveGame, area: SurveyArea, dimension: string, progress?: (done: number, total: number) => void, signal?: { aborted: boolean }): Promise<GameSurveyResult> {
  const token = game.token();
  if (!token) throw new LiveError('Nicht mit dem Spiel verbunden.', 0);
  const here = gameDimension(game);
  if (here && here !== dimension) throw new LiveError(`Du bist im Spiel in ${here}, der Bauplatz liegt in ${dimension}. Für die Aufnahme in diese Dimension wechseln.`, 409);
  const legacy = !liveCan(game.hello, LIVE_FEATURE_TERRAIN);
  const batches = chunkBatches(area), total = batches.reduce((n, b) => n + b.length, 0);
  const chunks: LiveTerrainChunk[] = [];
  let done = 0, live = 0, remembered = 0, missing = 0;
  progress?.(0, total);
  for (const batch of batches) {
    if (signal?.aborted) throw new Error('Abgebrochen.');
    const answer = await liveApi.terrain(game.settings.port, token, batch, legacy);
    if (answer.dimension !== dimension) throw new LiveError(`Die Mod antwortet aus ${answer.dimension}, der Bauplatz liegt in ${dimension}.`, 409);
    for (const c of answer.chunks) { chunks.push(c); if (c.live) live++; else remembered++; }
    missing += answer.missing.length;
    done += batch.length;
    progress?.(done, total);
  }
  return { survey: surveyFromLiveTerrain(area, dimension, chunks), live, remembered, missing };
}

/** Block-exact box from the loaded chunks (feature `box`) as grid for `checkTerrain`; unloaded cells stay unknown. */
export async function readGameGrid(game: LiveGame, box: Bounds, dimension: string): Promise<{ grid: TerrainGrid; unloaded: number }> {
  const token = game.token();
  if (!token) throw new LiveError('Nicht mit dem Spiel verbunden.', 0);
  const r = await liveApi.box(game.settings.port, token, boxQuery(box.min, box.maxExclusive));
  if (r.dimension !== dimension) throw new LiveError(`Du bist im Spiel in ${r.dimension}, das Projekt liegt in ${dimension}. Für die Prüfung in diese Dimension wechseln.`, 409);
  const size: [number, number, number] = [r.maxExclusive[0] - r.min[0], r.maxExclusive[1] - r.min[1], r.maxExclusive[2] - r.min[2]];
  return { grid: { box: { min: [...r.min], maxExclusive: [...r.maxExclusive] }, size, palette: r.palette.map(parseBlockState), data: Uint32Array.from(r.data) }, unloaded: r.unloaded };
}

/**
 * How much of the area the Geländegedächtnis already holds (mod 0.20.0+), refreshed every 5 s while the
 * game is connected, so the page can say „noch 12 Chunks im Norden fehlen“ while the player flies around.
 */
export function useGameCoverage(game: LiveGame, area: SurveyArea | null, dimension: string | null): TerrainCoverage | null {
  const [coverage, setCoverage] = useState<TerrainCoverage | null>(null);
  const gameRef = useRef(game); gameRef.current = game;
  const level = gameTerrainLevel(game);
  const key = area && dimension ? `${area.minX},${area.minZ},${area.width},${area.length},${dimension}` : '';
  useEffect(() => {
    setCoverage(null);
    if (!area || !dimension || level !== 'memory') return;
    const q = knownQuery(area);
    if (!q) return;
    let stop = false, timer = 0;
    const tick = async () => {
      const g = gameRef.current, t = g.token();
      if (t && gameDimension(g) === dimension) {
        try { const k = await liveApi.terrainKnown(g.settings.port, t, q); if (!stop && k.dimension === dimension) setCoverage(terrainCoverage(area, k.chunks)); } catch { /* keep the last */ }
      }
      if (!stop) timer = window.setTimeout(() => void tick(), 5000);
    };
    void tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [key, level]); // eslint-disable-line react-hooks/exhaustive-deps
  return coverage;
}

export const ageLabel = (ms: number, now = Date.now()): string => {
  const m = Math.max(0, Math.round((now - ms) / 60_000));
  return m < 1 ? 'gerade eben' : m < 60 ? `vor ${m} min` : m < 48 * 60 ? `vor ${Math.round(m / 60)} h` : `vor ${Math.round(m / 1440)} Tagen`;
};
