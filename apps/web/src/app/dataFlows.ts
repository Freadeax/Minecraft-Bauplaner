/**
 * PRIV-01: Welche Daten wohin gehen. Eine Liste für die Seite „Datenschutz und Freigaben“ (#/datenschutz)
 * und für die Hinweise direkt an jeder Freigabe (ShareNote). Neue Wege ins Internet bekommen hier einen
 * Eintrag, bevor sie in die Oberfläche kommen; der Test tests/unit/web/dataFlows.test.mjs prüft die Felder.
 */
export type DataFlowId = 'browser' | 'team-room' | 'team-plan' | 'world-share' | 'position' | 'scans' | 'server-link' | 'mod-link' | 'webmap' | 'github';

export interface DataFlow {
  readonly id: DataFlowId;
  /** Kurzer Name, z. B. „Team-Raum“. */
  readonly title: string;
  /** Was übertragen oder gespeichert wird. */
  readonly what: string;
  /** Wohin: Gerät, Dienst oder Adresse. */
  readonly where: string;
  /** Wer es sehen kann. */
  readonly who: string;
  /** Wie lange es dort bleibt. */
  readonly keep: string;
  /** Wie man es abschaltet oder zurücknimmt. */
  readonly stop: string;
  /** true: verlässt diesen Browser über das Internet. */
  readonly online: boolean;
}

export const DATA_FLOWS: readonly DataFlow[] = [
  { id: 'browser', title: 'Projekte und Bibliothek', online: false,
    what: 'Projekte, eigene Bauteile, Sammlungen, Vorlagen, Weltplan, Sicherungsbelege und Einstellungen.',
    where: 'Nur in diesem Browser auf diesem Gerät (IndexedDB). Jede Adresse des Planers hat ihren eigenen Speicher: GitHub Pages und Cloudflare Pages sehen sich gegenseitig nicht.',
    who: 'Nur wer diesen Browser benutzt.',
    keep: 'Bis du es löschst. Ohne „Dauerhaft speichern“ darf der Browser die Daten bei Platzmangel entfernen – deshalb Sicherungsdateien herunterladen.',
    stop: 'Projekt löschen oder die Website-Daten im Browser löschen.' },
  { id: 'team-room', title: 'Team live (Team-Raum)', online: true,
    what: 'Teamstand: Mitgliedsnamen und Rollen, Abschnitte, Fertigmeldungen, Notizen mit Koordinaten, Lagerkisten, Lieferungen, Messungen des Servers sowie wer gerade da ist.',
    where: 'Der Team-Raum des Build Studios, ein Cloudflare Worker (bauplaner-team.team-room.workers.dev). Andere Adressen sperrt die Seite.',
    who: 'Alle mit dem Einladungslink, die Bauleitung, der Server mit dem Server-Link und der Betreiber des Team-Raums.',
    keep: 'Bis die Bauleitung den Raum löscht; 365 Tage ohne Nutzung löscht er sich selbst. Nach dem Löschen hält der Tresor die Sicherungen noch 90 Tage für eine Wiederherstellung.',
    stop: '„Live trennen“ trennt nur diesen Browser. Einzelne Personen oder Geräte widerruft die Bauleitung unter „Zugänge im Team-Raum“; „Einladung erneuern“ sperrt alle alten Links für Neue. Den Raum selbst löscht die Bauleitung unter „Sicherung und Zustand“.' },
  { id: 'team-plan', title: 'Planstand im Team-Raum', online: true,
    what: 'Der freigegebene Plan als Paket (Bauteile, Blöcke, Lage in der Welt) und Kopfdaten mit den Abschnitten in Weltkoordinaten für das Server-Plugin. Zugangsschlüssel sind nicht enthalten.',
    where: 'Derselbe Team-Raum.', who: 'Alle mit Einladungslink und der Server.',
    keep: 'Die neuesten drei Planstände; ältere fallen weg.', stop: 'Nur die Bauleitung stellt Pläne in den Raum; ohne „Live“ geht nichts hinein.' },
  { id: 'world-share', title: 'Weltplan im Team', online: true,
    what: 'Bauplätze, Wege, Zonen, Punkte, Gruppen und Sperren mit Weltkoordinaten sowie die Liste der Server-Webkarten (Adressen).',
    where: 'Der gewählte Team-Raum (Weltkarte → „Weltplan im Team“).',
    who: 'Alle im Team, ihre Mods und das Server-Plugin (zeichnet Marker auf BlueMap/Dynmap, die auf dem Server öffentlich sein können).',
    keep: 'Die jeweils neueste Fassung, solange der Raum besteht.', stop: 'Auf der Weltkarte „nicht teilen (nur dieser Browser)“ wählen.' },
  { id: 'position', title: 'Live-Position aus dem Spiel', online: true,
    what: 'Deine Spielerposition (x, y, z, Dimension, Blickrichtung) und dein Minecraft-Name, höchstens alle 2 Sekunden.',
    where: 'Von der Mod direkt an den Team-Raum.',
    who: 'Alle, die gerade mit dem Raum verbunden sind („Gerade da“, Live-Karte).',
    keep: 'Nur solange du verbunden bist; der Raum speichert Positionen nicht.',
    stop: 'Im Team-Reiter „Meine Position teilen“ ausschalten (gilt sofort für dein Spiel) oder „Spiel trennen“.' },
  { id: 'scans', title: 'Aufnahmen aus dem Spiel', online: true,
    what: 'Eine Aufnahme der geladenen Blöcke im Planbereich (Schem-Datei), wenn jemand im Team „Aufnahme anfordern“ drückt.',
    where: 'Von der Mod an den Team-Raum.',
    who: 'Alle mit Einladungslink.',
    keep: 'Die neuesten 12 Aufnahmen; sie sind nicht in den Raum-Sicherungen.',
    stop: 'Im Team-Reiter „Aufnahmen auf Anfrage senden“ ausschalten; dann lehnt dein Spiel Anfragen ab.' },
  { id: 'server-link', title: 'Server-Link', online: true,
    what: 'Adresse, Raum und Serverschlüssel, bei der Bauleitung zusätzlich der Prüfschlüssel für Unterschriften.',
    where: 'An das Paper-Plugin deines Servers (über die Mod oder als Befehl).',
    who: 'Wer Zugriff auf die Serverkonsole oder die Plugin-Einstellungen hat.',
    keep: 'Bis „Server-Link erneuern“.', stop: '„Server-Link erneuern“ macht den alten Link ungültig.' },
  { id: 'mod-link', title: 'Verbindung zur Mod', online: false,
    what: 'Pläne, Hologramm, Markierungen und Befehle zwischen Planer und deinem Minecraft.',
    where: 'Nur auf diesem Gerät über 127.0.0.1; gekoppelt wird einmal mit dem Code aus dem Spiel-Chat.',
    who: 'Nur dieser Browser mit gültiger Freigabe.', keep: 'Die Kopplung bleibt in diesem Browser, bis du trennst.',
    stop: 'Auf der Weltkarte unter „Spiel“ auf „Trennen“ drücken; die Kopplung gilt sonst bis dahin in diesem Browser.' },
  { id: 'webmap', title: 'Server-Webkarte', online: true,
    what: 'Nichts aus dem Planer. Öffnest oder bettest du eine Karte ein, lädt dein Browser die fremde Seite und diese sieht deine IP-Adresse und die Koordinaten in der Adresse.',
    where: 'Die Domain der Webkarte (BlueMap, Dynmap …), die du oder jemand im Team eingetragen hat.',
    who: 'Der Betreiber dieser Karte.', keep: 'Nach den Regeln dieser Seite.',
    stop: 'Karte entfernen; neue Domains fragt der Planer vor dem ersten Öffnen nach.' },
  { id: 'github', title: 'Fehlerberichte und Beiträge', online: true,
    what: 'Nur was du im GitHub-Formular selbst abschickst (Testprotokoll, Diagnose ohne Projektdaten, Bibliotheksbeitrag).',
    where: 'GitHub (öffentliches Repository).', who: 'Öffentlich.', keep: 'Bis zum Löschen des Issues.',
    stop: 'Nicht absenden; der Planer öffnet nur das Formular.' },
];

export function dataFlow(id: DataFlowId): DataFlow {
  const f = DATA_FLOWS.find(x => x.id === id);
  if (!f) throw new Error(`Unbekannter Datenweg ${id}`);
  return f;
}

/** Der andere öffentliche Auslieferungsort mit getrenntem Browser-Speicher (null: lokal, Vorschau oder unbekannt). */
export const HOSTS = [
  { id: 'github', label: 'GitHub Pages', origin: 'https://freadeax.github.io', path: '/Minecraft-Bauplaner/' },
  { id: 'cloudflare', label: 'Cloudflare Pages', origin: 'https://bauplaner.pages.dev', path: '/Minecraft-Bauplaner/' },
] as const;
export type HostInfo = (typeof HOSTS)[number];

export function hostOf(origin: string): { here: HostInfo; other: HostInfo } | null {
  const i = HOSTS.findIndex(h => h.origin === origin);
  if (i < 0) return null;
  return { here: HOSTS[i]!, other: HOSTS[1 - i]! };
}
