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
  // ── Block 4: Mehrspieler und Server (echter Paper-Server, echte Spieler als Bots, echter 26.3-Client, Team-Raum)
  {
    caseId: 'TEAMBAU-06', scope: 'teil',
    covers: 'Server bekommt das Team über den Team-Raum ohne Datei; Mitspieler mit /bp abschnitte, nehmen, zeigen (Partikelumriss), fertig, notiz; Aktionsleiste „Abschnitt 2 · Rohbau · in Arbeit · Anna“; Hinweis bzw. Sperre im fremden Abschnitt; Baunachweis zählt nur in Teamabschnitten, „nachweis aus“ blendet aus; Teamkiste markiert, Einlegen mit gefüllter Shulkerkiste und Entnehmen gebucht; Planer-Faltung des Raums = Serverstand. Mit echtem 26.3-Client: /bauplaner team nehmen über den Teamkanal, Stand vom Server in der Mod.',
    remaining: '/bauplaner team mein und material mit eingeblendetem Teamplan im Hologramm; „Bestand ins Baustellen-Lager übernehmen“ (Strg+Z) im Planer; Stichprobe mit echten Mitspielern auf Philipps Server.',
    command: 'scripts/mod/test_multiplayer.sh && scripts/mod/test_multiplayer_client.sh',
    evidence: '06.11.2026, Plugin/Mod 0.23.0: Paper 1.21.11 (Build 132) und 26.1.2 (Build 74) mit drei Bot-Spielern, Paper 26.3 (Build 244) mit echtem Fabric-Client, Team-Raum wrangler dev.',
  },
  {
    caseId: 'LINK-12', scope: 'teil',
    covers: 'Paper-Server ohne Team-Raum; Bauleitung verbindet ihr Spiel („Mein Spiel verbinden“ über 127.0.0.1 mit Serverschlüssel), erlaubt den Teamkanal, die Mod übergibt den Raum: „Server-Plugin: Mit dem Team-Raum … verbunden“ ohne Herunterladen, Kopieren oder Eintippen; ein Spieler ohne OP kann den Raum nicht übergeben; Abschnittsschutz und Lagerkisten greifen danach; Neustart verbindet sich selbst wieder.',
    remaining: 'Zeile „Server-Plugin: ● im Team-Raum“ im Planer und Umbenennen/Verschieben eines Abschnitts im echten Planer (Browsertest team-room.e2e deckt die Planerseite gegen den Mod-Ersatz).',
    command: 'scripts/mod/test_multiplayer_client.sh && scripts/mod/test_multiplayer.sh',
    evidence: '06.11.2026, Mod/Plugin 0.23.0: echter Minecraft-26.3-Client (Fabric, weston) auf Paper 26.3 (Build 244); Bots auf Paper 1.21.11 und 26.1.2; Team-Raum wrangler dev.',
  },
  {
    caseId: 'LINK-01', scope: 'voll',
    covers: 'Plugin richtet sich selbst ein; Bauleitung als OP koppelt per Klick (link.claim), Nicht-OP abgewiesen; „Bauen in fremden Abschnitten: sperren“ als signierte Steuernachricht übernommen, config.yml geändert, das Setzen und Abbauen eines Mitspielers im fremden Abschnitt wird danach verhindert.',
    command: 'scripts/mod/test_multiplayer.sh && scripts/mod/test_bridge_paper_link.sh',
    evidence: '06.11.2026, Plugin 0.23.0: Paper 1.21.11 und 26.1.2 mit echten Spielern (Bots), Team-Raum wrangler dev; Planer-Oberfläche „Server koppeln“ per Browsertest server-link.e2e.',
  },
  {
    caseId: 'LINK-04', scope: 'teil',
    covers: 'Steuernachricht über den Team-Raum ohne Mod (der iPad-Weg, POST /control): Einstellung geändert, Wirkung auf echte Spieler im Spiel; Wiederholung und falscher Schlüssel abgewiesen.',
    remaining: 'Freigabe-Link auf einem echten iPad öffnen und das Gerät am PC entfernen (Browsertest server-link.e2e emuliert iPad 820 px).',
    command: 'scripts/mod/test_multiplayer.sh && BAUPLANER_ROOM=http://127.0.0.1:8787 scripts/mod/test_bridge_paper_link.sh',
    evidence: '06.11.2026, Plugin 0.23.0: Paper 1.21.11 und 26.1.2, Team-Raum wrangler dev.',
  },
];

export function autoCheckOf(caseId: string): AutoCheck | undefined {
  return AUTO_CHECKS.find(a => a.caseId === caseId);
}
