/**
 * GUIDE-01: Anleitung „Wie geh ich es an?“ (#/anleitung). Reine Daten ohne React, damit Einheitstests
 * Länge, Links und Begriffe prüfen können. Jeder Weg ist ein Ziel des Spielers („Ich will …“), jeder Schritt
 * eine kleine Grafik, ein kurzer Satz und ein Knopf, der genau an die Stelle im Planer führt.
 *
 * Regeln für neue Schritte:
 * - `text` ist genau ein kurzer Satz (höchstens {@link MAX_TEXT} Zeichen, endet mit Punkt).
 * - Knopf- und Reiternamen stehen in „…“ genau so, wie sie im Planer oder im Spiel heißen.
 * - Alles läuft über das Internet bzw. die Verbindung zur Mod; Dateiwege sind nie der Hauptweg.
 */
import type { IconName } from '../../app/icons';

/** Szene der Grafik: Planer-Fenster, Spielwelt oder Launcher. */
export type GuideScene = 'planer' | 'spiel' | 'launcher';

/** Wohin der Knopf eines Schritts führt. */
export type GuideTarget =
  /** Feste Seite des Planers, z. B. `#/bibliothek`. */
  | { readonly kind: 'route'; readonly href: string }
  /** Reiter im zuletzt geänderten (oder gewählten) Projekt; ohne Projekt geht es zur Projektzentrale. */
  | { readonly kind: 'project'; readonly tab: string }
  /** Bibliothek mit Vorschlägen für das gewählte Projekt. */
  | { readonly kind: 'library'; readonly page?: string }
  /** Weltkarte mit dem gewählten Projekt. */
  | { readonly kind: 'map' }
  /** Ein anderer Weg dieser Anleitung (Voraussetzung). */
  | { readonly kind: 'path'; readonly path: string }
  /** Nur im Spiel zu tun, kein Link. */
  | { readonly kind: 'game' };

export interface GuideStep {
  readonly id: string;
  /** Zwei bis vier Wörter. */
  readonly title: string;
  /** Ein kurzer Satz. */
  readonly text: string;
  readonly scene: GuideScene;
  readonly icon: IconName;
  /** Taste, die im Bild als Tastenkappe erscheint (z. B. „J“). */
  readonly key?: string;
  readonly target: GuideTarget;
  /** Beschriftung des Knopfs; ohne Angabe „Hinführen“. */
  readonly action?: string;
}

export interface GuidePath {
  readonly id: string;
  readonly title: string;
  /** Wofür der Weg ist, aus Sicht des Spielers. */
  readonly goal: string;
  readonly icon: IconName;
  /** Was man dafür braucht. */
  readonly needs: readonly ('planer' | 'mod' | 'internet' | 'team')[];
  readonly minutes: number;
  readonly steps: readonly GuideStep[];
}

export const MAX_TEXT = 110;

export const NEED_LABEL: Readonly<Record<GuidePath['needs'][number], string>> = {
  planer: 'nur der Planer', mod: 'Mod im Spiel', internet: 'Internet', team: 'Mitspieler',
};

export const GUIDE_PATHS: readonly GuidePath[] = [
  {
    id: 'erstes-projekt', title: 'Erstes Projekt planen', goal: 'Ich will einen Bau planen und wissen, was ich brauche.',
    icon: 'projects', needs: ['planer'], minutes: 5,
    steps: [
      { id: 'anlegen', title: 'Projekt anlegen', scene: 'planer', icon: 'plus', target: { kind: 'route', href: '#/' }, action: 'Zur Projektzentrale',
        text: 'Gib in der Projektzentrale einen Namen ein und klick „＋ Leeres Projekt anlegen“.' },
      { id: 'gebaeude', title: 'Gebäude aussuchen', scene: 'planer', icon: 'library', target: { kind: 'library' }, action: 'Bibliothek öffnen',
        text: 'Such dir in der Bibliothek ein Gebäude aus und klick „＋ Ins Projekt übernehmen“.' },
      { id: 'anordnen', title: 'Im Editor anordnen', scene: 'planer', icon: 'editor', target: { kind: 'project', tab: 'editor' }, action: 'Editor öffnen',
        text: 'Verschieb und dreh die Gebäude im „Editor“, bis der Plan passt.' },
      { id: 'material', title: 'Material ansehen', scene: 'planer', icon: 'material', target: { kind: 'project', tab: 'material' }, action: 'Material öffnen',
        text: 'Der Reiter „Material“ zählt alle Blöcke, die du sammeln musst.' },
      { id: 'bauen', title: 'Ebene für Ebene', scene: 'planer', icon: 'build', target: { kind: 'project', tab: 'bauen' }, action: '„Bauen“ öffnen',
        text: 'Der Reiter „Bauen“ zerlegt den Plan in Ebenen zum Nachbauen.' },
    ],
  },
  {
    id: 'mod', title: 'Mod installieren und verbinden', goal: 'Ich will meinen Plan im Spiel sehen.',
    icon: 'game', needs: ['mod'], minutes: 5,
    steps: [
      { id: 'profil', title: 'Profil öffnen', scene: 'launcher', icon: 'game', target: { kind: 'route', href: '#/mod' }, action: 'Anleitung je Launcher',
        text: 'Öffne in deinem Launcher ein Profil mit Fabric oder NeoForge für Minecraft 26.3.' },
      { id: 'installieren', title: 'Mod installieren', scene: 'launcher', icon: 'export', target: { kind: 'route', href: '#/mod' }, action: 'Zur Seite „Spiel“',
        text: 'Such im Profil nach „LMNT — Build Studio Bridge“ und klick „Installieren“.' },
      { id: 'starten', title: 'Spiel starten', scene: 'spiel', icon: 'terrain', target: { kind: 'game' },
        text: 'Starte das Profil und betritt eine Welt oder deinen Server.' },
      { id: 'verbinden', title: 'Planer verbinden', scene: 'planer', icon: 'link', target: { kind: 'route', href: '#/mod' }, action: 'Verbinden',
        text: 'Klick oben auf der Seite „Spiel“ auf „Verbinden“.' },
      { id: 'zulassen', title: 'Im Spiel zulassen', scene: 'spiel', icon: 'check', key: 'J', target: { kind: 'game' },
        text: 'Drück im Spiel J und klick „Planer zulassen“, fertig.' },
    ],
  },
  {
    id: 'hologramm', title: 'Im Spiel mit Hologramm bauen', goal: 'Ich will Block für Block nach Plan bauen.',
    icon: 'hologram', needs: ['mod'], minutes: 10,
    steps: [
      { id: 'mod', title: 'Mod verbunden?', scene: 'planer', icon: 'link', target: { kind: 'path', path: 'mod' }, action: 'Weg „Mod“ ansehen',
        text: 'Planer und Mod müssen verbunden sein, sonst zuerst den Weg „Mod installieren“.' },
      { id: 'senden', title: 'Ins Spiel senden', scene: 'planer', icon: 'map', target: { kind: 'map' }, action: 'Weltkarte öffnen',
        text: 'Klick auf der Weltkarte „▶ Ins Spiel senden“, der Plan kommt ohne Datei an.' },
      { id: 'setzen', title: 'Plan aufstellen', scene: 'spiel', icon: 'hologram', key: 'J', target: { kind: 'game' },
        text: 'Schau auf die Baustelle, drück J und klick den Plan an.' },
      { id: 'geister', title: 'Geisterblöcke füllen', scene: 'spiel', icon: 'building', target: { kind: 'game' },
        text: 'Setz Blöcke in die durchsichtigen Geisterblöcke, rote Blöcke sind falsch.' },
      { id: 'liste', title: 'Materialliste', scene: 'spiel', icon: 'material', key: 'Num 7', target: { kind: 'game' },
        text: 'Num 7 zeigt die Materialliste, Num 8 legt den nächsten Block in die Hand.' },
      { id: 'stand', title: 'Baustand holen', scene: 'planer', icon: 'update', target: { kind: 'project', tab: 'bauen' }, action: '„Bauen“ öffnen',
        text: 'Klick im Reiter „Bauen“ auf „⟳ Baustand holen“ und sieh, was noch fehlt.' },
    ],
  },
  {
    id: 'gelaende', title: 'Gelände aus der Mod holen', goal: 'Ich will mit dem echten Gelände meiner Welt planen.',
    icon: 'terrain', needs: ['mod'], minutes: 5,
    steps: [
      { id: 'mod', title: 'Mod verbunden?', scene: 'planer', icon: 'link', target: { kind: 'path', path: 'mod' }, action: 'Weg „Mod“ ansehen',
        text: 'Das Gelände kommt aus der Mod, also zuerst Planer und Mod verbinden.' },
      { id: 'ablaufen', title: 'Bauplatz ablaufen', scene: 'spiel', icon: 'terrain', target: { kind: 'game' },
        text: 'Lauf im Spiel einmal über den Bauplatz, dann kennt die Mod das Gelände.' },
      { id: 'pruefen', title: 'Gelände prüfen', scene: 'planer', icon: 'terrain', target: { kind: 'project', tab: 'gelaende' }, action: '„Gelände“ öffnen',
        text: 'Klick im Reiter „Gelände“ auf „Gelände aus dem Spiel prüfen“.' },
      { id: 'gestalten', title: 'Landschaft gestalten', scene: 'planer', icon: 'map', target: { kind: 'project', tab: 'landschaft' }, action: '„Landschaft“ öffnen',
        text: 'Klick im Reiter „Landschaft“ auf „Aus dem Spiel holen und gestalten“.' },
    ],
  },
  {
    id: 'team', title: 'Mit Freunden zusammen bauen', goal: 'Ich will mit anderen an einem Projekt bauen.',
    icon: 'team', needs: ['internet', 'team'], minutes: 10,
    steps: [
      { id: 'team', title: 'Team eintragen', scene: 'planer', icon: 'team', target: { kind: 'project', tab: 'team' }, action: '„Team“ öffnen',
        text: 'Trag im Reiter „Team“ alle Mitspieler ein und wähl bei „Ich bin“ dich selbst.' },
      { id: 'live', title: 'Live schalten', scene: 'planer', icon: 'link', target: { kind: 'project', tab: 'team' }, action: '„Team“ öffnen',
        text: 'Klick „Live schalten“, dann ist euer Team-Raum im Internet.' },
      { id: 'einladen', title: 'Freunde einladen', scene: 'planer', icon: 'page', target: { kind: 'project', tab: 'team' }, action: '„Team“ öffnen',
        text: 'Schick den „Einladungslink“ per Discord oder Chat an die anderen.' },
      { id: 'spiel', title: 'Spiel verbinden', scene: 'spiel', icon: 'game', target: { kind: 'project', tab: 'team' }, action: '„Team“ öffnen',
        text: 'Klick unter „Team live“ auf „Mein Spiel verbinden“, dann siehst du deinen Auftrag im Spiel.' },
      { id: 'server', title: 'Server dazu (freiwillig)', scene: 'planer', icon: 'system', target: { kind: 'route', href: '#/mod?loader=paper' }, action: 'Server-Plugin ansehen',
        text: 'Mit dem Paper-Plugin und „Server koppeln“ schützt der Server Abschnitte und Kisten.' },
    ],
  },
  {
    id: 'bibliothek', title: 'Bibliothek nutzen', goal: 'Ich suche Ideen und fertige Gebäude.',
    icon: 'library', needs: ['planer'], minutes: 3,
    steps: [
      { id: 'suchen', title: 'Suchen und filtern', scene: 'planer', icon: 'search', target: { kind: 'route', href: '#/bibliothek' }, action: 'Bibliothek öffnen',
        text: 'Such nach einem Namen oder filtere nach Kategorie und Stil.' },
      { id: 'ansehen', title: 'In 3D ansehen', scene: 'planer', icon: 'viewer', target: { kind: 'route', href: '#/bibliothek' }, action: 'Bibliothek öffnen',
        text: 'Öffne ein Gebäude und dreh es in 3D oder sieh es Ebene für Ebene.' },
      { id: 'generatoren', title: 'Selbst erzeugen', scene: 'planer', icon: 'editor', target: { kind: 'route', href: '#/bibliothek/generatoren' }, action: 'Generatoren öffnen',
        text: 'Generatoren bauen Häuser, Türme und Mauern nach deinen Maßen.' },
      { id: 'sammlungen', title: 'Ideen sammeln', scene: 'planer', icon: 'projects', target: { kind: 'route', href: '#/bibliothek/sammlungen' }, action: 'Sammlungen öffnen',
        text: 'Leg eigene Sammlungen an, um Lieblingsgebäude zu ordnen.' },
      { id: 'uebernehmen', title: 'Ins Projekt holen', scene: 'planer', icon: 'plus', target: { kind: 'library' }, action: 'Bibliothek fürs Projekt',
        text: 'Klick „＋ Ins Projekt übernehmen“, schon steht das Gebäude in deinem Plan.' },
    ],
  },
];

/** Kurze Erklärungen der Wörter, die in Planer und Mod immer wieder vorkommen. */
export const GUIDE_TERMS: readonly { readonly term: string; readonly text: string }[] = [
  { term: 'Projekt', text: 'Dein Bau mit allen Gebäuden, Material und Plan.' },
  { term: 'Bibliothek', text: 'Fertige Gebäude, Generatoren und deine Sammlungen.' },
  { term: 'Mod', text: 'Die „LMNT — Build Studio Bridge“ in deinem Minecraft, sie zeigt den Plan im Spiel.' },
  { term: 'Hologramm', text: 'Der durchsichtige Plan im Spiel, an dem du entlangbaust.' },
  { term: 'Geisterblock', text: 'Ein Block, der laut Plan noch fehlt.' },
  { term: 'Baustand', text: 'Was in der Welt schon steht, verglichen mit dem Plan.' },
  { term: 'Team-Raum', text: 'Der Treffpunkt im Internet, über den Planer, Mitspieler und Server sich abgleichen.' },
  { term: 'Abschnitt', text: 'Ein Teil des Baus, den ein Mitspieler übernimmt.' },
];

/** Empfohlene Reihenfolge für Neue. */
export const GUIDE_ORDER: readonly string[] = ['erstes-projekt', 'bibliothek', 'mod', 'hologramm', 'gelaende', 'team'];

export function guidePath(id: string | null | undefined): GuidePath | undefined {
  return GUIDE_PATHS.find(p => p.id === id);
}

/** Liest `?weg=<id>&schritt=<n>` (Schritt ab 1). */
export function parseGuideSearch(search: string | undefined): { path?: string; step?: number } {
  const q = new URLSearchParams(search ?? '');
  const path = q.get('weg') ?? undefined;
  const raw = Number(q.get('schritt'));
  const valid = path ? guidePath(path) : undefined;
  return {
    ...(valid && { path: valid.id }),
    ...(valid && Number.isInteger(raw) && raw >= 1 && raw <= valid.steps.length && { step: raw }),
  };
}

export function guideSearch(path: string, step?: number): string {
  return `weg=${encodeURIComponent(path)}${step ? `&schritt=${step}` : ''}`;
}

export interface GuideLink {
  readonly href: string | null;
  readonly label: string;
  /** Hinweis, wenn der Link ein Projekt bräuchte, aber keins da ist. */
  readonly note?: string;
}

/**
 * Löst das Ziel eines Schritts in einen Link auf. `projectId` ist das Projekt, in das die Links führen
 * (zuletzt geändertes oder gewähltes); ohne Projekt führen Projektlinks zur Projektzentrale.
 */
export function stepLink(step: GuideStep, projectId: string | null): GuideLink {
  const label = step.action ?? 'Hinführen';
  const p = projectId ? encodeURIComponent(projectId) : null;
  const t = step.target;
  switch (t.kind) {
    case 'route': return { href: t.href, label };
    case 'game': return { href: null, label: 'Im Spiel' };
    case 'path': return { href: `#/anleitung?${guideSearch(t.path)}`, label };
    case 'library': return { href: p ? `#/bibliothek/fuer/${p}${t.page ? `/${t.page}` : ''}` : `#/bibliothek${t.page ? `/${t.page}` : ''}`, label };
    case 'map': return { href: p ? `#/karte?projekt=${p}` : '#/karte', label };
    case 'project': return p
      ? { href: `#/projekt/${p}${t.tab === 'editor' ? '' : `/${encodeURIComponent(t.tab)}`}`, label }
      : { href: '#/', label: 'Erst ein Projekt anlegen', note: 'Dafür brauchst du ein Projekt.' };
  }
}

/** Erledigte Schritte als Menge von `weg/schritt`, robust gegen kaputte Speicherdaten. */
export function parseDone(raw: string | null): Set<string> {
  try {
    const list: unknown = JSON.parse(raw ?? '[]');
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string' && x.length < 80) : []);
  } catch { return new Set(); }
}

export const doneKey = (path: string, step: string) => `${path}/${step}`;

export function pathProgress(path: GuidePath, done: ReadonlySet<string>): { done: number; total: number } {
  return { done: path.steps.filter(s => done.has(doneKey(path.id, s.id))).length, total: path.steps.length };
}
