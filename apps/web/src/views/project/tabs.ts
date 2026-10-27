import type { ComponentType } from 'react';
import { EditorTab } from './EditorTab';
import { BuildTab } from './BuildTab';
import { ExportTab } from './ExportTab';
import { MaterialsTab } from './MaterialsTab';
import type { ProjectSession } from './session';

/**
 * Registry of project sub-pages (#/projekt/<id>/<id>). Each feature block adds
 * exactly one entry here and keeps its UI in its own file, so parallel work
 * does not edit the same components.
 */
export interface ProjectTab {
  readonly id: string;
  readonly label: string;
  readonly component: ComponentType<{ session: ProjectSession }>;
}

export const projectTabs: readonly ProjectTab[] = [
  { id: 'editor', label: 'Editor', component: EditorTab },
  { id: 'bauen', label: 'Bauen', component: BuildTab },
  { id: 'export', label: 'Export', component: ExportTab },
  { id: 'material', label: 'Material', component: MaterialsTab },
];
