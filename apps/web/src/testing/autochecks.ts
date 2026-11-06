/**
 * Automatische Abnahmen der Testphase (Roadmap-Runde 06.11.2026, Regel aller Blöcke): ein Testfall gilt als
 * „automatisch geprüft“, wenn ein reproduzierbarer Test im Repository (Skript + Eintrag in docs/TESTING.md)
 * genau das beobachtbare Ergebnis des Falls nachweist. Die Seite #/testphase zeigt den Nachweis am Fall,
 * docs/testing/TESTPLAN.md listet alle Einträge (render_testplan.mjs prüft, dass die Fall-IDs existieren).
 *
 * `scope: 'voll'` nur, wenn der Test den beschriebenen Umfang des Falls wirklich abdeckt. Was nur ein Mensch
 * beurteilen kann (eigener Launcher, Gefühl beim Spielen, Philipps echter Server, Geräte), steht in `remaining`
 * und der Fall bleibt mit `scope: 'teil'` in der Handliste. Jeder Block trägt seine Fälle hier ein; ein Fall
 * hat höchstens einen Eintrag (mehrere Tests gehören in `command`/`covers`).
 */
export type AutoScope = 'voll' | 'teil';

export interface AutoCheck {
  /** Testfall-ID aus testplan.ts. */
  readonly caseId: string;
  readonly scope: AutoScope;
  /** Was der Test im echten Ablauf nachweist (beobachtbar, in Worten des Falls). */
  readonly covers: string;
  /** Was nur ein Mensch prüfen kann; Pflicht bei scope 'teil'. */
  readonly remaining?: string;
  /** Befehl, der den Nachweis wiederholt (steht auch in docs/TESTING.md). */
  readonly command: string;
  /** Letzter bestandener Lauf: Datum, geprüfter Stand (Commit/Mod-Version), Umgebung. */
  readonly evidence: string;
}

export const AUTO_SCOPE_LABEL: Readonly<Record<AutoScope, string>> = { voll: 'automatisch geprüft', teil: 'teilweise automatisch geprüft' };

export const AUTO_CHECKS: readonly AutoCheck[] = [
  {
    caseId: 'KARTE-07', scope: 'teil',
    covers: 'Auf einem echten Paper-26.3-Server setzt das Spiel selbst (/place template) einen Probebau mit Treppen, Tür, Doppelkiste, Bett, Schienen, Zaun, Mauer, Schild, Banner, Stamm, Kolben, Leiter, Hebel, Falltür, Verbundblock und Verstärker in allen 8 Lagen (4 Drehungen, je ungespiegelt und gespiegelt). Alle 1512 Zellen stimmen Block für Block mit der Regel der Mod (Placement.java) und der des Planers (placeToWorld/turnState) überein – Weltkoordinaten und Blockzustände; die gespiegelte Doppelkiste teilt das Spiel beim Spiegeln, die Regel hält sie als Doppelkiste zusammen (vom Spiel bestätigt). Das Server-Plugin bekommt eine gedrehte + gespiegelte und eine gedrehte Lage über den Team-Raum und legt die Abschnitte genau über die vom Spiel gesetzten Blöcke.',
    remaining: 'Im eigenen Spiel: Projekt auf der Karte mit R drehen, „Ins Spiel senden“, im Spiel weiterdrehen/spiegeln und „Lage aus dem Spiel übernehmen“; Hologramm steht auf dem Grundriss, F3-Koordinate passt zur Bauanleitung.',
    command: 'scripts/mod/test_bridge_paper_placement.sh',
    evidence: '06.11.2026, Paper 26.3 Build 244, Plugin 0.23.0 aus dem Quellstand, Team-Raum per wrangler dev: 8 Lagen × 189 Zellen grün, Plugin-Abschnitte bei 90° + gespiegelt und 270° richtig.',
  },
  {
    caseId: 'KARTE-08', scope: 'teil',
    covers: 'Plugin-Weg: Paper 26.3 + BlueMap 5.29 und Paper 1.21.4 + Dynmap 3.7-beta-8 holen den Weltplan aus dem Team-Raum, die Sets „Bauplaner: …“ erscheinen ohne .conf und Konsolenbefehle, eine Änderung ersetzt die Marker per Push ohne Doppelte, nach dem Neustart sind sie sofort da. Notfallweg ohne Plugin: der BlueMap-Block in maps/world.conf und die Dynmap-Befehle in der Konsole bringen alle Sets an die richtige Stelle und Höhe; ein zweiter, kleinerer Export ersetzt die alten Marker. Dabei behoben: der BlueMap-Block ließ die ganze Karte scheitern (Formen ohne Komma), ein im Planer gelöschter letzter Punkt blieb auf Dynmap und BlueMap stehen.',
    remaining: 'Auf Philipps Server-Karte: Link aus BlueMap/Dynmap einfügen, „Aktuelle Karte speichern“; dort die Sets ansehen und eine Markerdatei (JSON) als Punkte laden.',
    command: 'scripts/mod/test_bridge_paper_world.sh && scripts/mod/test_bridge_paper_mapfallback.sh',
    evidence: '06.11.2026, Paper 26.3 Build 244 + BlueMap 5.29, Paper 1.21.4 Build 232 + Dynmap 3.7-beta-8, Plugin 0.23.0 aus dem Quellstand, Team-Raum per wrangler dev: beide Wege grün nach den Korrekturen in liveMapExport.ts.',
  },
];

export function autoCheckOf(caseId: string): AutoCheck | undefined {
  return AUTO_CHECKS.find(a => a.caseId === caseId);
}
