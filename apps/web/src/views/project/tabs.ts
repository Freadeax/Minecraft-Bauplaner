import type { ComponentType } from 'react';
import { lazyPage } from '../../app/lazyPage';
import type { ProjectSession } from './session';

import { projectTabNames } from './tabNames';
import type { ProjectTabId } from './tabNames';

/**
 * Registry of project sub-pages (#/projekt/<id>/<id>). Each feature block adds
 * exactly one entry here (component) and one in tabNames.ts (id, label, order),
 * and keeps its UI in its own file, so parallel work does not edit the same components.
 */
export interface ProjectTab {
  readonly id: string;
  readonly label: string;
  readonly component: TabComponent;
}

type TabComponent = ComponentType<{ session: ProjectSession }>;
/** Each tab is its own chunk, loaded when it is first opened or ahead in idle time (PERF-05, O-3). */
const components: Record<ProjectTabId, TabComponent> = {
  editor: lazyPage(() => import('./EditorTab').then(m => m.EditorTab)),
  bauen: lazyPage(() => import('./BuildTab').then(m => m.BuildTab)),
  export: lazyPage(() => import('./ExportTab').then(m => m.ExportTab)),
  material: lazyPage(() => import('./MaterialsTab').then(m => m.MaterialsTab)),
  baustelle: lazyPage(() => import('./SiteTab').then(m => m.SiteTab)),
  planung: lazyPage(() => import('./PlanningTab').then(m => m.PlanningTab)),
  produktion: lazyPage(() => import('./ProductionTab').then(m => m.ProductionTab)),
  bloecke: lazyPage(() => import('./BlocksTab').then(m => m.BlocksTab)),
  gelaende: lazyPage(() => import('./TerrainTab').then(m => m.TerrainTab)),
  landschaft: lazyPage(() => import('./LandscapeTab').then(m => m.LandscapeTab)),
  updates: lazyPage(() => import('./UpdatesTab').then(m => m.UpdatesTab)),
  team: lazyPage(() => import('./team/TeamTab').then(m => m.TeamTab)),
};

export const projectTabs: readonly ProjectTab[] = projectTabNames.map(t => ({ ...t, component: components[t.id] }));
