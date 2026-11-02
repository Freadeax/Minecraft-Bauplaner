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
import { SPIELHILFEN_SPECS } from './spielhilfen.js';
import { INTERIEUR_SPECS } from './interieur.js';
import { GARTEN_SPECS } from './garten.js';
import { NATUR_SPECS } from './natur.js';
import { HOF_SPECS } from './hof.js';
import { TECHNIK_SPECS } from './technik.js';
import { STADT_SPECS } from './stadt.js';
import { FANTASY_SPECS } from './fantasy.js';
import { EPOCHEN_SPECS } from './epochen.js';
import { KUESTE_SPECS } from './kueste.js';
import { FAHRZEUGE_SPECS } from './fahrzeuge.js';
import { UNTERGRUND_SPECS } from './untergrund.js';
import { DIMENSIONEN_SPECS } from './dimensionen.js';
import { withMaterialFamilies } from './varianten.js';
import { refinedSpec } from '../refine.js';

/** All themed building sets of the extended catalogue, in display order, with the generated material families (B12); every design passes the finishing pass first (LIB-05). */
export const ALL_SET_SPECS: readonly BuildingSpec[] = withMaterialFamilies([
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
  ...SPIELHILFEN_SPECS,
  ...INTERIEUR_SPECS,
  ...GARTEN_SPECS,
  ...NATUR_SPECS,
  ...HOF_SPECS,
  ...TECHNIK_SPECS,
  ...STADT_SPECS,
  ...FANTASY_SPECS,
  ...EPOCHEN_SPECS,
  ...KUESTE_SPECS,
  ...FAHRZEUGE_SPECS,
  ...UNTERGRUND_SPECS,
  ...DIMENSIONEN_SPECS,
].map(refinedSpec));
