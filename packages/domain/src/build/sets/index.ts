import type { BuildingSpec } from '../spec.js';
import { WOHNEN_SPECS } from './wohnen.js';
import { DORF_SPECS } from './dorf.js';
import { FARM_SPECS } from './farmen.js';

/** All themed building sets of the extended catalogue, in display order. */
export const ALL_SET_SPECS: readonly BuildingSpec[] = [
  ...WOHNEN_SPECS,
  ...DORF_SPECS,
  ...FARM_SPECS,
];
