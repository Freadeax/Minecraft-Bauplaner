import type { BuildingMetrics } from '../../../../packages/domain/src/index.js';

/**
 * Catalogue metrics by version id, shared by the library and the background
 * save (PERF-04): a version is immutable, so its metrics never change, and a
 * worker that already analysed a new large version hands them over here
 * instead of the page recomputing them for seconds.
 */
export const catalogMetrics = new Map<string, BuildingMetrics>();
