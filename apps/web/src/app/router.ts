import { useEffect, useState } from 'react';

/**
 * Hash routes keep reloads working on GitHub Pages without server rewrites.
 *   #/                     Projektzentrale
 *   #/bibliothek           Bibliothek (Gebäudevorschläge und Bauteile)
 *   #/bibliothek/fuer/<id> Bibliothek mit Vorschlägen für ein Projekt
 *   #/bibliothek/gebaeude/<assetId>      Detailseite eines Gebäudes
 *   #/bibliothek/ensembles[/<id>]        Ensembles (Übersicht / Detail)
 *   #/bibliothek/vergleich/<id>,<id>,…   Gebäude nebeneinander vergleichen
 *   #/projekt/<id>         Editor
 *   #/projekt/<id>/<tab>   Projektunterseite (z. B. bauen)
 *   #/betrachter           Dateibetrachter
 */
export type Route =
  | { readonly view: 'projects' }
  | { readonly view: 'library'; readonly projectId?: string; readonly page?: LibraryPage; readonly id?: string }
  | { readonly view: 'viewer' }
  | { readonly view: 'project'; readonly projectId: string; readonly tab: string }
  | { readonly view: 'not-found'; readonly path: string };

export type LibraryPage = 'browse' | 'building' | 'ensembles' | 'compare';
const LIBRARY_PAGES: Readonly<Record<string, LibraryPage>> = { gebaeude: 'building', ensembles: 'ensembles', vergleich: 'compare' };
const LIBRARY_SEGMENT: Readonly<Record<LibraryPage, string>> = { browse: '', building: 'gebaeude', ensembles: 'ensembles', compare: 'vergleich' };

export function parseRoute(hash: string): Route {
  const path = decodeURIComponent(hash.replace(/^#/, '')).replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { view: 'projects' };
  if (parts[0] === 'bibliothek' && parts.length === 1) return { view: 'library' };
  if (parts[0] === 'bibliothek' && parts[1] === 'fuer' && parts[2] && parts.length === 3) return { view: 'library', projectId: parts[2] };
  if (parts[0] === 'bibliothek') {
    const rest = parts[1] === 'fuer' && parts[2] ? parts.slice(3) : parts.slice(1);
    const projectId = parts[1] === 'fuer' ? parts[2] : undefined;
    const page = LIBRARY_PAGES[rest[0] ?? ''];
    const needsId = page === 'building' || page === 'compare';
    if (page && rest.length <= 2 && (!needsId || rest[1])) return { view: 'library', page, ...(projectId && { projectId }), ...(rest[1] && { id: rest[1] }) };
  }
  if (parts[0] === 'betrachter' && parts.length === 1) return { view: 'viewer' };
  if (parts[0] === 'projekt' && parts[1] && parts.length <= 3) return { view: 'project', projectId: parts[1], tab: parts[2] ?? 'editor' };
  return { view: 'not-found', path };
}

export function href(route: Route): string {
  switch (route.view) {
    case 'projects': return '#/';
    case 'library': {
      const base = route.projectId ? `#/bibliothek/fuer/${encodeURIComponent(route.projectId)}` : '#/bibliothek';
      const page = route.page && route.page !== 'browse' ? `/${LIBRARY_SEGMENT[route.page]}` : '';
      return `${base}${page}${route.id && page ? `/${encodeURIComponent(route.id)}` : ''}`;
    }
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
