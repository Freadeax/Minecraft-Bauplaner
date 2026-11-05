import { useMemo } from 'react';
import { buildPlanGraph, PLAN_ROLE_LABEL, whereUsed } from '../../../../../packages/domain/src/index.js';
import type { Asset, Project } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { useUserLibrary } from './userLibrary';
import '../../styles/datamodel.css';

/**
 * "Verwendet in" (ARCH-02): every project, template and collection that uses
 * this building or one of its versions, from the shared reference graph
 * (planGraph.ts) – the same answer the data check and backups rely on.
 */
export function UsageSection({ asset, projects }: { asset: Asset; projects: readonly Project[] }) {
  const { repo, library } = useApp();
  const user = useUserLibrary(repo);
  const groups = useMemo(() => {
    const graph = buildPlanGraph({ projects, assets: library.assets, versions: [...library.versions.values()], collections: user.collections, templates: user.templates });
    return whereUsed(graph, { kind: 'asset', id: asset.id }).filter(g => g.from.kind !== 'version');
  }, [asset.id, projects, library, user.collections, user.templates]);
  const nameOf = (kind: string, id: string) => kind === 'project' ? projects.find(p => p.id === id)?.name
    : kind === 'template' ? user.templates.find(t => t.id === id)?.name : user.collections.find(c => c.id === id)?.name;
  const hrefOf = (kind: string, id: string) => kind === 'project' ? `#/projekt/${encodeURIComponent(id)}` : kind === 'template' ? `#/bibliothek/vorlagen/${encodeURIComponent(id)}` : `#/bibliothek/sammlungen/${encodeURIComponent(id)}`;
  const label = { project: 'Projekt', template: 'Vorlage', collection: 'Sammlung' } as Record<string, string>;
  return <div className="usage-section" data-usage-count={groups.length}>
    <span className="panel-kicker">VERWENDET IN</span>
    {groups.length === 0
      ? <p className="muted">Noch in keinem Projekt, keiner Vorlage und keiner Sammlung.</p>
      : <ul className="usage-list">{groups.map(g => <li key={`${g.from.kind}:${g.from.id}`}>
          <a href={hrefOf(g.from.kind, g.from.id)}><small>{label[g.from.kind]}</small> <strong>{nameOf(g.from.kind, g.from.id) ?? g.from.id}</strong></a>
          <span className="muted">{g.roles.map(r => PLAN_ROLE_LABEL[r]).join(', ')}{g.details.length ? ` · ${g.details.slice(0, 3).join(', ')}${g.details.length > 3 ? ` +${g.details.length - 3}` : ''}` : ''}</span>
        </li>)}</ul>}
  </div>;
}
