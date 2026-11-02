import type { Route } from './router';
import type { IconName } from './icons';

/**
 * Hauptnavigation als Liste: Kopfzeile (Desktop), untere Leiste (Handy) und
 * Schnellsuche lesen dieselben Einträge. Ein neuer Hauptbereich hängt genau
 * einen Eintrag an; `views` bestimmt, wann er als aktuell markiert ist.
 */
export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: IconName;
  readonly views: readonly Route['view'][];
  /** Kurzbeschreibung für die Schnellsuche. */
  readonly hint: string;
}

export const mainNav: readonly NavItem[] = [
  { id: 'projects', label: 'Projekte', href: '#/', icon: 'projects', views: ['projects', 'project'], hint: 'Projektzentrale, Vorlagen, Sicherung' },
  { id: 'library', label: 'Bibliothek', href: '#/bibliothek', icon: 'library', views: ['library'], hint: 'Gebäude, Ensembles, Vergleich, Generatoren' },
  { id: 'viewer', label: 'Betrachter', href: '#/betrachter', icon: 'viewer', views: ['viewer'], hint: 'Einzelne Schem-/Litematic-Datei ansehen' },
  { id: 'map', label: 'Weltkarte', href: '#/karte', icon: 'map', views: ['map'], hint: 'Alle Projekte auf der Weltkarte, Überflug und Live-Karte' },
  { id: 'world', label: 'Weltimport', href: '#/welt', icon: 'terrain', views: ['world'], hint: 'Bereich aus den Regionsdateien deiner Welt als Bauteil übernehmen' },
  { id: 'game', label: 'Spiel', href: '#/mod', icon: 'game', views: ['mod'], hint: 'Mod herunterladen (Bauplaner-Brücke, .jar), mit dem Spiel verbinden, Live-Status' },
];

/** Seitentitel im Browser-Tab je Route; Projekte setzen ihren Namen selbst. */
export function routeTitle(route: Route): string {
  const area = mainNav.find(n => n.views.includes(route.view));
  if (route.view === 'system') return 'Systemcheck';
  if (route.view === 'testphase') return 'Testphase';
  if (route.view === 'mod') return 'Mod herunterladen';
  if (route.view === 'not-found') return 'Seite nicht gefunden';
  return area?.label ?? 'LMNT Build Studio';
}
