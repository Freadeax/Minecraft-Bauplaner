import type { BuildingSpec } from '../spec.js';
import { WOHNEN_SPECS } from './wohnen.js';
import { DORF_SPECS } from './dorf.js';
import { FARM_SPECS } from './farmen.js';
import { REDSTONE_SPECS } from './redstone.js';
import { BEFESTIGUNG_SPECS } from './befestigung.js';
import { SAKRAL_SPECS } from './sakral.js';
import { INFRA_SPECS } from './infrastruktur.js';
import { LANDSCHAFT_SPECS } from './landschaft.js';
import { DEKO_SPECS } from './deko.js';
import { WELTEN_SPECS } from './welten.js';

/** All themed building sets of the extended catalogue, in display order. */
export const ALL_SET_SPECS: readonly BuildingSpec[] = [
  ...WOHNEN_SPECS,
  ...DORF_SPECS,
  ...FARM_SPECS,
  ...REDSTONE_SPECS,
  ...BEFESTIGUNG_SPECS,
  ...SAKRAL_SPECS,
  ...INFRA_SPECS,
  ...LANDSCHAFT_SPECS,
  ...DEKO_SPECS,
  ...WELTEN_SPECS,
];
