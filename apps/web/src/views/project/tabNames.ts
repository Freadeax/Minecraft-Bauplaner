/**
 * Names and order of the project sub-pages (#/projekt/<id>/<id>) without their components, so the
 * command palette in the start bundle can list them without loading every tab (PERF-05, O-3).
 */
export const projectTabNames = [
  { id: 'editor', label: 'Editor' },
  { id: 'bauen', label: 'Bauen' },
  { id: 'export', label: 'Export' },
  { id: 'material', label: 'Material' },
  { id: 'baustelle', label: 'Baustelle' },
  { id: 'planung', label: 'Planung' },
  { id: 'produktion', label: 'Produktion' },
  { id: 'bloecke', label: 'Blöcke' },
  { id: 'gelaende', label: 'Gelände' },
  { id: 'landschaft', label: 'Landschaft' },
  { id: 'updates', label: 'Updates' },
  { id: 'team', label: 'Team' },
] as const;
export type ProjectTabId = typeof projectTabNames[number]['id'];
