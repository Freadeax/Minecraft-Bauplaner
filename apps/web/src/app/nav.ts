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
  { id: 'projects', label: 'Projekte', href: '#/', icon: 'projects', views: ['projects', 'project'], hint: 'Deine Projekte, Vorlagen, Sicherung' },
  { id: 'library', label: 'Bibliothek', href: '#/bibliothek', icon: 'library', views: ['library'], hint: 'Gebäude finden, vergleichen, nach Maß erzeugen' },
  { id: 'map', label: 'Weltkarte', href: '#/karte', icon: 'map', views: ['map'], hint: 'Alle Projekte auf der Karte, live mit dem Spiel' },
  { id: 'game', label: 'Spiel', href: '#/mod', icon: 'game', views: ['mod'], hint: 'Mod holen und Minecraft mit dem Planer verbinden' },
  { id: 'guide', label: 'Anleitung', href: '#/anleitung', icon: 'guide', views: ['guide'], hint: 'Wie geh ich es an? Jeder Schritt mit Bild und kurzem Satz' },
];

/**
 * UX-01 (06.11.2026): Datei-Wege stehen nicht mehr in der Hauptnavigation, weil der Planer
 * über das Internet mit Mod und Team-Raum arbeitet. Sie bleiben über Schnellsuche und Fußzeile erreichbar.
 */
export const fileTools: readonly NavItem[] = [
  { id: 'viewer', label: 'Datei ansehen', href: '#/betrachter', icon: 'viewer', views: ['viewer'], hint: 'Einzelne Schem-/Litematic-Datei ansehen (Betrachter)' },
  { id: 'world', label: 'Weltimport aus Datei', href: '#/welt', icon: 'terrain', views: ['world'], hint: 'Notfall ohne Mod: Bereich aus Regionsdateien übernehmen' },
];

/** Seitentitel im Browser-Tab je Route; Projekte setzen ihren Namen selbst. */
export function routeTitle(route: Route): string {
  const area = mainNav.find(n => n.views.includes(route.view));
  if (route.view === 'system') return 'Systemcheck';
  if (route.view === 'testphase') return 'Testphase';
  if (route.view === 'guide') return 'Wie geh ich es an?';
  if (route.view === 'privacy') return 'Datenschutz und Freigaben';
  if (route.view === 'mod') return 'Mod herunterladen';
  if (route.view === 'viewer') return 'Betrachter';
  if (route.view === 'world') return 'Weltimport';
  if (route.view === 'not-found') return 'Seite nicht gefunden';
  return area?.label ?? 'LMNT — Build Studio';
}
