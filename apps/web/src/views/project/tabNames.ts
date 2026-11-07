/**
 * Names and order of the project sub-pages (#/projekt/<id>/<id>) without their components, so the
 * command palette in the start bundle can list them without loading every tab (PERF-05, O-3).
 *
 * UX-02 (07.11.2026): Die Reiter stehen in drei Hauptansichten Entwerfen → Bauen → Verwalten (vorher
 * vier Schritte aus UX-01). Die aktive Ansicht zeigt ihre Reiter mit Namen, die anderen beiden nur als
 * kleine Symbole, damit über der Arbeitsfläche nicht zwölf Reiter gleich laut stehen. `related` nennt
 * Reiter anderer Ansichten, die zum aktuellen Schritt passen (Kurzlinks unter der Leiste). Ids und
 * Beschriftungen bleiben stabil (Links, Tests, Schnellsuche); neue Reiter hängen sich in die passende Ansicht.
 */
export const projectTabGroups = [
  { id: 'entwerfen', label: 'Entwerfen', hint: 'Bauwerk zusammenstellen und an das Gelände anpassen' },
  { id: 'bauen', label: 'Bauen', hint: 'Im Spiel nachbauen: Anleitung, Material, Fortschritt, Farmen' },
  { id: 'verwalten', label: 'Verwalten', hint: 'Überblick, Termine, Mitspieler, Weitergeben und Updates' },
] as const;
export type ProjectTabGroupId = typeof projectTabGroups[number]['id'];

export const projectTabNames = [
  { id: 'editor', label: 'Editor', group: 'entwerfen', hint: 'Gebäude aus der Bibliothek einfügen, verschieben und verbinden.', related: ['gelaende', 'material', 'export'] },
  { id: 'bloecke', label: 'Blöcke', group: 'entwerfen', hint: 'Einzelne Blöcke im ganzen Projekt setzen oder entfernen.', related: ['material'] },
  { id: 'gelaende', label: 'Gelände', group: 'entwerfen', hint: 'Prüfen, wie dein Projekt auf das echte Gelände aus dem Spiel passt.', related: ['editor', 'bauen'] },
  { id: 'landschaft', label: 'Landschaft', group: 'entwerfen', hint: 'Boden formen, Wasser füllen und Wege legen.', related: ['gelaende', 'material'] },
  { id: 'bauen', label: 'Bauen', group: 'bauen', hint: 'Schritt für Schritt Schicht um Schicht nachbauen und abhaken.', related: ['gelaende', 'team'] },
  { id: 'material', label: 'Material', group: 'bauen', hint: 'Welche Blöcke und wie viele du brauchst.', related: ['export'] },
  { id: 'baustelle', label: 'Baustelle', group: 'bauen', hint: 'Bauabschnitte, Lager und Fortschritt auf einen Blick.', related: ['team', 'uebersicht'] },
  { id: 'produktion', label: 'Produktion', group: 'bauen', hint: 'Farmen und Sammelaufträge für das Material.', related: ['planung'] },
  { id: 'uebersicht', label: 'Übersicht', group: 'verwalten', hint: 'Letzter Arbeitsstand, offene Konflikte und der nächste Bauabschnitt.', related: [] },
  { id: 'planung', label: 'Planung', group: 'verwalten', hint: 'Meilensteine, Termine und wer wann was baut.', related: ['baustelle'] },
  { id: 'team', label: 'Team', group: 'verwalten', hint: 'Mit Freunden gemeinsam bauen – Einladung per Link.', related: ['baustelle'] },
  { id: 'export', label: 'Export', group: 'verwalten', hint: 'Als Schem- oder Litematic-Datei für andere Werkzeuge speichern.', related: ['material'] },
  { id: 'updates', label: 'Updates', group: 'verwalten', hint: 'Neuere Versionen deiner Gebäude übernehmen – nichts passiert automatisch.', related: [] },
] as const satisfies readonly { id: string; label: string; group: ProjectTabGroupId; hint: string; related: readonly string[] }[];
export type ProjectTabId = typeof projectTabNames[number]['id'];

/** Zuletzt geöffnete Reiter je Projekt (nur dieser Browser): „Projekt fortsetzen“ und Wechsel der Hauptansicht. */
const LAST_KEY = 'bauplaner.projekt.reiter.v1';
type LastTabs = Record<string, { last?: string; groups?: Partial<Record<ProjectTabGroupId, string>> }>;
function readLast(): LastTabs {
  try { const raw = localStorage.getItem(LAST_KEY); const v = raw ? JSON.parse(raw) as unknown : null; return v && typeof v === 'object' ? v as LastTabs : {}; } catch { return {}; }
}
const known = (id: string | undefined): id is ProjectTabId => !!id && projectTabNames.some(t => t.id === id);

export function rememberTab(projectId: string, tab: string): void {
  const t = projectTabNames.find(x => x.id === tab); if (!t) return;
  const all = readLast(), cur = all[projectId] ?? {};
  // Die Übersicht ist ein Blick von außen: „Fortsetzen“ führt zum Reiter davor zurück.
  all[projectId] = { last: tab === 'uebersicht' ? cur.last ?? tab : tab, groups: { ...cur.groups, [t.group]: tab } };
  // Höchstens 50 Projekte merken: die ältesten Einträge fallen weg.
  const ids = Object.keys(all); for (const id of ids.slice(0, Math.max(0, ids.length - 50))) delete all[id];
  try { localStorage.setItem(LAST_KEY, JSON.stringify(all)); } catch { /* kein Speicher: dann eben ohne Erinnerung */ }
}
/** Letzter Reiter eines Projekts, sonst der Editor. */
export function lastTab(projectId: string): ProjectTabId {
  const t = readLast()[projectId]?.last;
  return known(t) ? t : 'editor';
}
/** Reiter, mit dem eine Hauptansicht öffnet: der zuletzt dort benutzte, sonst ihr erster. */
export function groupEntry(projectId: string, group: ProjectTabGroupId): ProjectTabId {
  const t = readLast()[projectId]?.groups?.[group];
  return known(t) && projectTabNames.find(x => x.id === t)!.group === group ? t : projectTabNames.find(x => x.group === group)!.id;
}
