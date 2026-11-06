/**
 * Names and order of the project sub-pages (#/projekt/<id>/<id>) without their components, so the
 * command palette in the start bundle can list them without loading every tab (PERF-05, O-3).
 *
 * UX-01 (06.11.2026): Die zwölf Reiter stehen in vier Schritten (Gestalten → Bauen → Organisieren →
 * Teilen), jeder mit einem kurzen Satz, was man dort tut. Ids und Beschriftungen bleiben stabil
 * (Links, Tests, Schnellsuche); neue Reiter hängen sich in den passenden Schritt.
 */
export const projectTabGroups = [
  { id: 'gestalten', label: 'Gestalten', hint: 'Bauwerk zusammenstellen und an das Gelände anpassen' },
  { id: 'bauen', label: 'Bauen', hint: 'Im Spiel nachbauen: Anleitung, Material, Fortschritt' },
  { id: 'organisieren', label: 'Organisieren', hint: 'Termine, Farmen und Mitspieler' },
  { id: 'teilen', label: 'Teilen', hint: 'Weitergeben und aktuell halten' },
] as const;
export type ProjectTabGroupId = typeof projectTabGroups[number]['id'];

export const projectTabNames = [
  { id: 'editor', label: 'Editor', group: 'gestalten', hint: 'Gebäude aus der Bibliothek einfügen, verschieben und verbinden.' },
  { id: 'bloecke', label: 'Blöcke', group: 'gestalten', hint: 'Einzelne Blöcke im ganzen Projekt setzen oder entfernen.' },
  { id: 'gelaende', label: 'Gelände', group: 'gestalten', hint: 'Prüfen, wie dein Projekt auf das echte Gelände aus dem Spiel passt.' },
  { id: 'landschaft', label: 'Landschaft', group: 'gestalten', hint: 'Boden formen, Wasser füllen und Wege legen.' },
  { id: 'bauen', label: 'Bauen', group: 'bauen', hint: 'Schritt für Schritt Schicht um Schicht nachbauen und abhaken.' },
  { id: 'material', label: 'Material', group: 'bauen', hint: 'Welche Blöcke und wie viele du brauchst.' },
  { id: 'baustelle', label: 'Baustelle', group: 'bauen', hint: 'Bauabschnitte, Lager und Fortschritt auf einen Blick.' },
  { id: 'planung', label: 'Planung', group: 'organisieren', hint: 'Meilensteine, Termine und wer wann was baut.' },
  { id: 'produktion', label: 'Produktion', group: 'organisieren', hint: 'Farmen und Sammelaufträge für das Material.' },
  { id: 'team', label: 'Team', group: 'organisieren', hint: 'Mit Freunden gemeinsam bauen – Einladung per Link.' },
  { id: 'export', label: 'Export', group: 'teilen', hint: 'Als Schem- oder Litematic-Datei für andere Werkzeuge speichern.' },
  { id: 'updates', label: 'Updates', group: 'teilen', hint: 'Neuere Versionen deiner Gebäude übernehmen – nichts passiert automatisch.' },
] as const satisfies readonly { id: string; label: string; group: ProjectTabGroupId; hint: string }[];
export type ProjectTabId = typeof projectTabNames[number]['id'];
