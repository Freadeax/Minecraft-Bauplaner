import { useEffect, useState } from 'react';

/**
 * Hash routes keep reloads working on GitHub Pages without server rewrites.
 *   #/                     Projektzentrale
 *   #/bibliothek           Bibliothek (Gebäudevorschläge und Bauteile)
 *   #/bibliothek/fuer/<id> Bibliothek mit Vorschlägen für ein Projekt
 *   #/bibliothek/gebaeude/<assetId>[/<ansicht>]  Detailseite eines Gebäudes (Ansicht: bilder, ebenen, versionen)
 *   #/bibliothek?q=…&kategorie=…         Übersicht mit Suche und Filtern (teilbar)
 *   #/bibliothek/ensembles[/<id>]        Ensembles (Übersicht / Detail)
 *   #/bibliothek/vergleich/<id>,<id>,…   Gebäude nebeneinander vergleichen
 *   #/bibliothek/generatoren[/<gen>[~<vorlage>|@<assetId>|!<templateId>]]  Parametrische Generatoren (B13)
 *   #/bibliothek/sammlungen[/<id>]       Eigene Sammlungen und Ordner (LIB-02)
 *   #/bibliothek/vorlagen[/<id>]         Eigene Ensemble- und Generatorvorlagen (LIB-03)
 *   #/bibliothek/anlagen[/<id>]          Bauwelt-Anlagen mit Konfliktvorschau (BUILD-05)
 *   #/projekt/<id>         Editor
 *   #/projekt/<id>/<tab>   Projektunterseite (z. B. bauen)
 *   #/betrachter           Dateibetrachter
 *   #/karte[?projekt=<id>&dim=<dimension>]  Weltkarte aller platzierten Projekte (MAP-01)
 *   #/mod[?minecraft=…&loader=…&version=…]  Mod-Download mit Versionsauswahl (GAME-02)
 *   #/werkstatt/neu | #/werkstatt/<versionId>  Blockeditor für ein neues oder vorhandenes Bauteil (EDIT-02)
 *   #/welt                 Ausschnitt aus Regionsdateien der eigenen Welt übernehmen (WORLD-IMPORT-01)
 *   #/system               Systemcheck (Auslieferung, Speicher, Datencheck, Fehlerprotokoll)
 *   #/testphase[?melden[=<fall>]]  Testphase: Checklisten, Testprotokoll, Fehler melden mit Diagnose (QA-04)
 *   #/anleitung[?weg=<id>&schritt=<n>]  Anleitung „Wie geh ich es an?“ mit Wegen und Schritten (GUIDE-01)
 */
export type Route =
  | { readonly view: 'projects' }
  | { readonly view: 'library'; readonly projectId?: string; readonly page?: LibraryPage; readonly id?: string; readonly sub?: string; readonly search?: string }
  | { readonly view: 'viewer' }
  | { readonly view: 'system' }
  | { readonly view: 'testphase'; readonly search?: string }
  | { readonly view: 'guide'; readonly search?: string }
  | { readonly view: 'map'; readonly search?: string }
  | { readonly view: 'mod'; readonly search?: string }
  | { readonly view: 'team-join'; readonly search?: string }
  | { readonly view: 'workshop'; readonly versionId: string | null }
  | { readonly view: 'world' }
  | { readonly view: 'project'; readonly projectId: string; readonly tab: string }
  | { readonly view: 'not-found'; readonly path: string };

export type LibraryPage = 'browse' | 'building' | 'ensembles' | 'compare' | 'generators' | 'themes' | 'collections' | 'templates' | 'facilities' | 'base' | 'grossprojekte';
const LIBRARY_PAGES: Readonly<Record<string, LibraryPage>> = { gebaeude: 'building', ensembles: 'ensembles', vergleich: 'compare', generatoren: 'generators', bauwelten: 'themes', sammlungen: 'collections', vorlagen: 'templates', anlagen: 'facilities', basis: 'base', grossprojekte: 'grossprojekte' };
const LIBRARY_SEGMENT: Readonly<Record<LibraryPage, string>> = { browse: '', building: 'gebaeude', ensembles: 'ensembles', compare: 'vergleich', generators: 'generatoren', themes: 'bauwelten', collections: 'sammlungen', templates: 'vorlagen', facilities: 'anlagen', base: 'basis', grossprojekte: 'grossprojekte' };

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, ''), q = raw.indexOf('?');
  const search = q >= 0 ? raw.slice(q + 1) : '';
  const encodedPath = (q >= 0 ? raw.slice(0, q) : raw).replace(/\/+$/, '') || '/';
  let path: string;
  let parts: string[];
  try {
    path = decodeURIComponent(encodedPath);
    // Decode each segment after splitting: an encoded slash belongs to the ID.
    parts = encodedPath.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    // The route hook runs outside the page error boundary, including on first load.
    return { view: 'not-found', path: encodedPath };
  }
  if (parts.length === 0) return { view: 'projects' };
  if (parts[0] === 'bibliothek' && parts.length === 1) return { view: 'library', ...(search && { search }) };
  if (parts[0] === 'bibliothek' && parts[1] === 'fuer' && parts[2] && parts.length === 3) return { view: 'library', projectId: parts[2], ...(search && { search }) };
  if (parts[0] === 'bibliothek') {
    const rest = parts[1] === 'fuer' && parts[2] ? parts.slice(3) : parts.slice(1);
    const projectId = parts[1] === 'fuer' ? parts[2] : undefined;
    const segment = rest[0] ?? '';
    const page = Object.hasOwn(LIBRARY_PAGES, segment) ? LIBRARY_PAGES[segment] : undefined;
    const needsId = page === 'building' || page === 'compare';
    if (page && (rest.length <= 2 || (page === 'building' && rest.length === 3)) && (!needsId || rest[1]))
      return { view: 'library', page, ...(projectId && { projectId }), ...(rest[1] && { id: rest[1] }), ...(rest[2] && { sub: rest[2] }) };
  }
  if (parts[0] === 'betrachter' && parts.length === 1) return { view: 'viewer' };
  if (parts[0] === 'system' && parts.length === 1) return { view: 'system' };
  if (parts[0] === 'testphase' && parts.length === 1) return { view: 'testphase', ...(search && { search }) };
  if (parts[0] === 'anleitung' && parts.length === 1) return { view: 'guide', ...(search && { search }) };
  if (parts[0] === 'mod' && parts.length === 1) return { view: 'mod', ...(search && { search }) };
  if (parts[0] === 'team' && parts[1] === 'beitreten' && parts.length === 2) return { view: 'team-join', ...(search && { search }) };
  if (parts[0] === 'welt' && parts.length === 1) return { view: 'world' };
  if (parts[0] === 'karte' && parts.length === 1) return { view: 'map', ...(search && { search }) };
  if (parts[0] === 'werkstatt' && parts[1] && parts.length === 2) return { view: 'workshop', versionId: parts[1] === 'neu' ? null : parts[1] };
  if (parts[0] === 'projekt' && parts[1] && parts.length <= 3) return { view: 'project', projectId: parts[1], tab: parts[2] ?? 'editor' };
  return { view: 'not-found', path };
}

export function href(route: Route): string {
  switch (route.view) {
    case 'projects': return '#/';
    case 'library': {
      const base = route.projectId ? `#/bibliothek/fuer/${encodeURIComponent(route.projectId)}` : '#/bibliothek';
      const page = route.page && route.page !== 'browse' ? `/${LIBRARY_SEGMENT[route.page]}` : '';
      const id = route.id && page ? `/${encodeURIComponent(route.id)}${route.sub && route.page === 'building' ? `/${encodeURIComponent(route.sub)}` : ''}` : '';
      return `${base}${page}${id}${route.search && !page ? `?${route.search}` : ''}`;
    }
    case 'viewer': return '#/betrachter';
    case 'system': return '#/system';
    case 'testphase': return `#/testphase${route.search ? `?${route.search}` : ''}`;
    case 'guide': return `#/anleitung${route.search ? `?${route.search}` : ''}`;
    case 'mod': return `#/mod${route.search ? `?${route.search}` : ''}`;
    case 'team-join': return `#/team/beitreten${route.search ? `?${route.search}` : ''}`;
    case 'world': return '#/welt';
    case 'map': return `#/karte${route.search ? `?${route.search}` : ''}`;
    case 'workshop': return `#/werkstatt/${route.versionId ? encodeURIComponent(route.versionId) : 'neu'}`;
    case 'project': return `#/projekt/${encodeURIComponent(route.projectId)}${route.tab === 'editor' ? '' : `/${encodeURIComponent(route.tab)}`}`;
    case 'not-found': return '#/';
  }
}

/** `afterSave`: the caller has just stored the unsaved work; the leave question is skipped for this navigation. */
export function navigate(route: Route, options: { afterSave?: boolean } = {}): void {
  if (options.afterSave) skipGuardOnce = true;
  window.location.hash = href(route);
}
let skipGuardOnce = false;

/**
 * Leave guards: views with unsaved work (e.g. an editor draft) register a question. Leaving the
 * route (hash change, closing or reloading the tab) then asks first; „Abbrechen“ keeps the old route.
 */
const leaveGuards = new Set<() => string | null>();
const pendingLeave = (): string | null => { for (const g of leaveGuards) { const m = g(); if (m) return m; } return null; };
export function useLeaveGuard(message: string | null): void {
  useEffect(() => {
    if (!message) return;
    const guard = () => message;
    leaveGuards.add(guard);
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = message; };
    window.addEventListener('beforeunload', onUnload);
    return () => { leaveGuards.delete(guard); window.removeEventListener('beforeunload', onUnload); };
  }, [message]);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    let current = window.location.href;
    const update = (e?: HashChangeEvent) => {
      const message = skipGuardOnce ? null : pendingLeave();
      skipGuardOnce = false;
      if (message && e && !window.confirm(`${message}\n\nTrotzdem verlassen?`)) {
        // Stay: put the previous address back without another hashchange.
        history.replaceState(history.state, '', current);
        return;
      }
      current = window.location.href;
      setRoute(parseRoute(window.location.hash)); window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
