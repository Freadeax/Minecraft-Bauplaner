import type { Grossprojekt } from '../grossprojekte.js';
import { GP_MARKTSTADT } from './marktstadt.js';
import { GP_HAFENSTADT } from './hafenstadt.js';
import { GP_INNENSTADT } from './innenstadt.js';
import { GP_BURGANLAGE } from './burganlage.js';
import { GP_BERGBAUSTADT } from './bergbaustadt.js';
import { GP_TEMPELSTADT } from './tempelstadt.js';
import { GP_LANDGUT } from './landgut.js';
import { GP_MAGIERSTADT } from './magierstadt.js';
import { GP_INDUSTRIEHAFEN } from './industriehafen.js';
import { GP_HAUPTSTADT } from './hauptstadt.js';
import { GP_KOLOSSEUM } from './kolosseum.js';
import { GP_RESIDENZSTADT } from './residenzstadt.js';
import { GP_KLOSTERDORF } from './klosterdorf.js';

/** Shipped Großprojekte in display order. Add a new project as its own file plus one line here. */
export const GROSSPROJEKTE: readonly Grossprojekt[] = [
  GP_MARKTSTADT,
  GP_HAFENSTADT,
  GP_INNENSTADT,
  GP_BURGANLAGE,
  GP_BERGBAUSTADT,
  GP_TEMPELSTADT,
  GP_LANDGUT,
  GP_MAGIERSTADT,
  GP_INDUSTRIEHAFEN,
  GP_HAUPTSTADT,
  GP_KOLOSSEUM,
  GP_RESIDENZSTADT,
  GP_KLOSTERDORF,
];
export const grossprojektById = (id: string): Grossprojekt | undefined => GROSSPROJEKTE.find(g => g.id === id);
export const grossprojekteForTheme = (themeId: string): Grossprojekt[] => GROSSPROJEKTE.filter(g => g.themeId === themeId);
