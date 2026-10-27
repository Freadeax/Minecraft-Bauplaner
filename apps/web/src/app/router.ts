import { useEffect, useState } from 'react';

/**
 * Hash routes keep reloads working on GitHub Pages without server rewrites.
 *   #/                     Projektzentrale
 *   #/bibliothek           Bibliothek (Gebäudevorschläge und Bauteile)
 *   #/bibliothek/fuer/<id> Bibliothek mit Vorschlägen für ein Projekt
 *   #/projekt/<id>         Editor
 *   #/projekt/<id>/<tab>   Projektunterseite (z. B. bauen)
 *   #/betrachter           Dateibetrachter
 */
export type Route =
  | { readonly view: 'projects' }
  | { readonly view: 'library'; readonly projectId?: string }
  | { readonly view: 'viewer' }
  | { readonly view: 'project'; readonly projectId: string; readonly tab: string }
  | { readonly view: 'not-found'; readonly path: string };

export function parseRoute(hash: string): Route {
  const path = decodeURIComponent(hash.replace(/^#/, '')).replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { view: 'projects' };
  if (parts[0] === 'bibliothek' && parts.length === 1) return { view: 'library' };
  if (parts[0] === 'bibliothek' && parts[1] === 'fuer' && parts[2] && parts.length === 3) return { view: 'library', projectId: parts[2] };
  if (parts[0] === 'betrachter' && parts.length === 1) return { view: 'viewer' };
  if (parts[0] === 'projekt' && parts[1] && parts.length <= 3) return { view: 'project', projectId: parts[1], tab: parts[2] ?? 'editor' };
  return { view: 'not-found', path };
}

export function href(route: Route): string {
  switch (route.view) {
    case 'projects': return '#/';
    case 'library': return route.projectId ? `#/bibliothek/fuer/${encodeURIComponent(route.projectId)}` : '#/bibliothek';
    case 'viewer': return '#/betrachter';
    case 'project': return `#/projekt/${encodeURIComponent(route.projectId)}${route.tab === 'editor' ? '' : `/${route.tab}`}`;
    case 'not-found': return '#/';
  }
}

export function navigate(route: Route): void { window.location.hash = href(route); }

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const update = () => { setRoute(parseRoute(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
