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
    covers: 'Plugin-Weg: Paper 26.3 + BlueMap 5.29 und Paper 1.21.4 + Dynmap 3.7-beta-8 holen den Weltplan aus dem Team-Raum, die Sets „Build Studio: …“ erscheinen ohne .conf und Konsolenbefehle, eine Änderung ersetzt die Marker per Push ohne Doppelte, nach dem Neustart sind sie sofort da. Notfallweg ohne Plugin: der BlueMap-Block in maps/world.conf und die Dynmap-Befehle in der Konsole bringen alle Sets an die richtige Stelle und Höhe; ein zweiter, kleinerer Export ersetzt die alten Marker. Dabei behoben: der BlueMap-Block ließ die ganze Karte scheitern (Formen ohne Komma), ein im Planer gelöschter letzter Punkt blieb auf Dynmap und BlueMap stehen.',
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
  },  // ── Block 2: Bibliothek und Generatoren im echten Server (Spielprüfstand, BLOCK-02-S07)
  {
    caseId: 'BIB-12', scope: 'teil',
    covers: 'Jedes Katalog-Gebäude (alle 358, darunter alle Meisterstücke, Untergrundhallen und Interieur-Räume) wird Block für Block in einen echten Paper-26.3-Server gesetzt; danach aktualisiert das Spiel jede Zelle (Nachbarformen, Halt, geplante Ticks, Schwerkraft, Wasser). Nichts fällt ab oder schwebt, keine Laterne, Tür, Treppe, Leiter, Truhe oder Verbindung ändert sich, kein Wasser läuft aus, keine Drops.',
    remaining: 'Im eigenen Spiel: zwei bis drei Gebäude per Litematica oder Mod-Hologramm aufstellen und ansehen, ob Innenräume begehbar und stimmig eingerichtet sind (Gestaltung kann nur ein Mensch beurteilen).',
    command: 'scripts/mod/test_game_placement.sh catalog',
    evidence: '06.11.2026, Paper 26.3 Build 244 (Java 25), Quellstand BLOCK-02-S07: 559 Pläne (358 Katalog-Gebäude, 201 Generator-Fälle), 878.974 Blöcke, 0 Abweichungen; der erste Lauf fand 47 Gebäude und den Brunnen-Generator, alle behoben.',
  },
  {
    caseId: 'BIB-06', scope: 'teil',
    covers: 'Jeder Generator (Haus, Turm, Mauer, Brücke, Dach, Treppenhaus, Kirche, Hafen, Torhaus, Windmühle, Brunnen, Arena) mit Standardwerten, allen Vorlagen, allen Stilen, drei Würfelwerten und beiden Bereichsenden im echten Paper-26.3-Server gesetzt und vom Spiel aktualisiert: keine schwebenden oder abfallenden Blöcke, keine anderen Verbindungen, kein auslaufendes Wasser.',
    remaining: 'Bedienung im Browser: Maße und Stil ändern, als Bauteil und als Vorlage speichern und wieder öffnen.',
    command: 'scripts/mod/test_game_placement.sh generators',
    evidence: '06.11.2026, Paper 26.3 Build 244 (Java 25), Quellstand BLOCK-02-S07: 559 Pläne (358 Katalog-Gebäude, 201 Generator-Fälle), 878.974 Blöcke, 0 Abweichungen; der erste Lauf fand 47 Gebäude und den Brunnen-Generator, alle behoben.',
  },
  {
    caseId: 'BIB-14', scope: 'teil',
    covers: 'Der Arena-Generator mit den Vorlagen „Kolosseum“ und „Provinzarena“, allen Stilen und Bereichsenden steht im echten Paper-26.3-Server ohne einen abfallenden, schwebenden oder anders verbundenen Block (Statuen, Hypogäum-Treppen, Bögen, Ränge eingeschlossen); die Antike-Gebäude des Bausets ebenso.',
    remaining: 'Kolosseum-Viertel als Projekt (Quartiere, Bauanleitung, Material) im Browser und ein Kolosseum in der eigenen Welt aufstellen; das ganze Viertel auf Gelände prüft der Gelände-Block.',
    command: 'scripts/mod/test_game_placement.sh catalog generators',
    evidence: '06.11.2026, Paper 26.3 Build 244 (Java 25), Quellstand BLOCK-02-S07: 559 Pläne (358 Katalog-Gebäude, 201 Generator-Fälle), 878.974 Blöcke, 0 Abweichungen; der erste Lauf fand 47 Gebäude und den Brunnen-Generator, alle behoben.',
  },
  // Block 4b: Lagerkisten und Ertragsfarm (echte Spieler als Bots auf Paper, Team-Raum, echte Farm)
  {
    caseId: 'LAGER-01', scope: 'teil',
    covers: 'Server holt das Team aus dem Team-Raum (keine Datei). Der Baumeister setzt als Spieler eine Kiste im Abschnitt, schaut darauf und tippt /bp lager markieren Steinlager: „Lager „Steinlager“ markiert“, „Zugeordnet: Abschnitt 1 Fundament“, „erstmals gezählt“; /bp lager liste zeigt es als „geprüft“.',
    remaining: 'Paper-Jar von #/mod laden, alte Jar in plugins/ löschen und auf Philipps Server neu starten. Stichprobe auf Paper 26.3 mit dem eigenen Client (die Bot-Bibliothek kann 26.3 noch nicht; auf 26.3 läuft nur der Konsolentest).',
    command: 'scripts/mod/test_bridge_paper_bots.sh lager',
    evidence: '06.11.2026, Plugin 0.23.0 aus dem Quellstand (mit den Korrekturen von COOP-05-S06): Paper 1.21.11 (Build 132) und 26.1.2 (Build 74), zwei Bot-Spieler (mineflayer 4.39) Anna_MC als Baumeister und Ben_MC als Helfer, Team-Raum wrangler dev; Konsolentest test_bridge_paper_lager.sh auf 1.18.2, 1.21.11 und 26.3 grün.',
  },
  {
    caseId: 'LAGER-02', scope: 'teil',
    covers: 'Helfer öffnet die Kiste: Aktionsleiste „Lager „Steinlager“ · Abschnitt 1 Fundament · geprüft · du darfst einlegen und entnehmen“ (bleibt stehen, solange die Kiste offen ist). 64 Stein hinein, 10 heraus, schließen: „Gebucht … +54 stone“, der Verlauf nennt Ben, im Spielerinventar liegen genau 10. Der Helfer kann keine zweite Kiste anbauen („darf nur ein Baumeister anbauen“), der Baumeister schon: Doppelkiste mit 54 Plätzen, beide Hälften gehören zum Lager. Eine Shulkerkiste mit 32 Stein wird samt Inhalt gezählt (87 Items) und gebucht; im Planer stehen die Buchungen je Spieler.',
    remaining: 'Stichprobe auf Paper 26.3 mit dem eigenen Client (die Bot-Bibliothek kann 26.3 noch nicht; auf 26.3 läuft nur der Konsolentest).',
    command: 'scripts/mod/test_bridge_paper_bots.sh lager',
    evidence: '06.11.2026, Plugin 0.23.0 aus dem Quellstand (mit den Korrekturen von COOP-05-S06): Paper 1.21.11 (Build 132) und 26.1.2 (Build 74), zwei Bot-Spieler (mineflayer 4.39) Anna_MC als Baumeister und Ben_MC als Helfer, Team-Raum wrangler dev; Konsolentest test_bridge_paper_lager.sh auf 1.18.2, 1.21.11 und 26.3 grün.',
  },
  {
    caseId: 'LAGER-03', scope: 'teil',
    covers: 'Schutz „abschnitt“: Aktionsleiste „du darfst nur einlegen“; Herausnehmen per Klick, Umschalt-Klick und Doppelklick wird verhindert (Kiste und Inventar unverändert, „darfst du nicht entnehmen“), Hineinlegen geht und wird gebucht. Schutz „gesperrt“: „nur ansehen“, auch Hineinlegen verhindert, kein Item verschwindet oder verdoppelt sich. Nach lager.modus: hinweis und Neustart geht die Entnahme aus „gesperrt“, wird gebucht (−2 dirt) und der Baumeister bekommt eine Meldung im Chat.',
    remaining: 'Stichprobe auf Paper 26.3 mit dem eigenen Client (die Bot-Bibliothek kann 26.3 noch nicht; auf 26.3 läuft nur der Konsolentest).',
    command: 'scripts/mod/test_bridge_paper_bots.sh lager',
    evidence: '06.11.2026, Plugin 0.23.0 aus dem Quellstand (mit den Korrekturen von COOP-05-S06): Paper 1.21.11 (Build 132) und 26.1.2 (Build 74), zwei Bot-Spieler (mineflayer 4.39) Anna_MC als Baumeister und Ben_MC als Helfer, Team-Raum wrangler dev; Konsolentest test_bridge_paper_lager.sh auf 1.18.2, 1.21.11 und 26.3 grün.',
  },
  {
    caseId: 'LAGER-04', scope: 'teil',
    covers: 'Helfer will das Lager abbauen (auch im Kreativmodus): Kiste bleibt, Meldung. Ein Trichter darunter zieht nichts heraus, ein gefüllter darüber füllt ein (97 Items, Verlauf „Trichter: +… oak_log“). TNT neben dem Lager: Kiste und Inhalt bleiben.',
    remaining: 'Stichprobe auf Paper 26.3 mit dem eigenen Client (die Bot-Bibliothek kann 26.3 noch nicht; auf 26.3 läuft nur der Konsolentest).',
    command: 'scripts/mod/test_bridge_paper_bots.sh lager',
    evidence: '06.11.2026, Plugin 0.23.0 aus dem Quellstand (mit den Korrekturen von COOP-05-S06): Paper 1.21.11 (Build 132) und 26.1.2 (Build 74), zwei Bot-Spieler (mineflayer 4.39) Anna_MC als Baumeister und Ben_MC als Helfer, Team-Raum wrangler dev; Konsolentest test_bridge_paper_lager.sh auf 1.18.2, 1.21.11 und 26.3 grün.',
  },
  {
    caseId: 'LAGER-05', scope: 'teil',
    covers: 'Inhalt ohne Öffnen geändert (/item replace … dirt 5): /bp lager pruefen meldet „abweichend – +5 dirt“; der Baumeister bekommt beim nächsten Betreten „1 Lager mit Abweichung oder fehlender Kiste (Steinlager)“ und beim Öffnen „Offene Abweichung: +5 dirt“; /bp lager siegeln Aufgeräumt nimmt die Abweichung an, Info: „geprüft“, „Zuletzt gesiegelt von Anna“.',
    remaining: 'Stichprobe auf Paper 26.3 mit dem eigenen Client (die Bot-Bibliothek kann 26.3 noch nicht; auf 26.3 läuft nur der Konsolentest).',
    command: 'scripts/mod/test_bridge_paper_bots.sh lager',
    evidence: '06.11.2026, Plugin 0.23.0 aus dem Quellstand (mit den Korrekturen von COOP-05-S06): Paper 1.21.11 (Build 132) und 26.1.2 (Build 74), zwei Bot-Spieler (mineflayer 4.39) Anna_MC als Baumeister und Ben_MC als Helfer, Team-Raum wrangler dev; Konsolentest test_bridge_paper_lager.sh auf 1.18.2, 1.21.11 und 26.3 grün.',
  },
  {
    caseId: 'LAGER-07', scope: 'teil',
    covers: '/bp lager bedarf 1 und /bp lager bedarf zeigen je Material Bedarf, im Lager und fehlt (oder ✓); /bp sammle stone ohne Menge übernimmt genau „fehlt“ minus die 20, die Anna schon sammelt. Nach zwei Server-Neustarts sind alle Lager da und „geprüft“. Der Planer faltet den Team-Raum ohne Datei zu genau diesem Stand: Status, Abschnitt, Schutz, Abweichung, Siegel, Buchungen je Spieler, Trichter.',
    remaining: 'Ansicht „Team“ → „Baunachweis & Lager“ im Planer selbst ansehen (der Test prüft die Daten, die sie zeigt). Stichprobe auf Paper 26.3 mit dem eigenen Client (die Bot-Bibliothek kann 26.3 noch nicht; auf 26.3 läuft nur der Konsolentest).',
    command: 'scripts/mod/test_bridge_paper_bots.sh lager',
    evidence: '06.11.2026, Plugin 0.23.0 aus dem Quellstand (mit den Korrekturen von COOP-05-S06): Paper 1.21.11 (Build 132) und 26.1.2 (Build 74), zwei Bot-Spieler (mineflayer 4.39) Anna_MC als Baumeister und Ben_MC als Helfer, Team-Raum wrangler dev; Konsolentest test_bridge_paper_lager.sh auf 1.18.2, 1.21.11 und 26.3 grün.',
  },
  {
    caseId: 'LAGER-11', scope: 'teil',
    covers: 'Server-Seite: der Team-Raum hat jedes Lager mit gezählten Mengen, Prüfstand, Zweck und Zählzeit (vom Server gezählt vor wenigen Minuten) – das, was die Mod für die Spalte „Lager“ und /bauplaner team lager liest.',
    remaining: 'In der Mod: Spalte „Lager“ in der Materialliste (Num 7), /bauplaner team lager mit „vom Server gezählt vor … Min“ und eine nur im Spiel gesehene Kiste mit * „(ungeprüft)“ – gehört in den Clientspieltest.',
    command: 'scripts/mod/test_bridge_paper_bots.sh lager',
    evidence: '06.11.2026, Plugin 0.23.0 aus dem Quellstand (mit den Korrekturen von COOP-05-S06): Paper 1.21.11 (Build 132) und 26.1.2 (Build 74), zwei Bot-Spieler (mineflayer 4.39) Anna_MC als Baumeister und Ben_MC als Helfer, Team-Raum wrangler dev; Konsolentest test_bridge_paper_lager.sh auf 1.18.2, 1.21.11 und 26.3 grün.',
  },
  {
    caseId: 'LAGER-10', scope: 'teil',
    covers: 'Auf Paper 1.21.11 steht eine echte Zuckerrohrfarm (Beobachter sieht das dritte Rohr, Kolben bricht es ab, Trichterlore unter dem Sand sammelt, Trichter in die Sammeltruhe). Die Truhe wird markiert und mit /bp lager farm Zuckerrohrfarm Ertragskiste der Farm; der Ertrag kommt nur aus der Farm, eine Entnahme durch den Helfer zählt nicht als Ertrag. /bp lager info: „Ertragskiste der Farm „Zuckerrohrfarm“: N Items in M min geladen“ und ab 10 min „… je Stunde“; der Team-Raum bekommt die store.yield-Meldungen, die Produktion des Planers rechnet für die Farm mit genau dieser Rate (Quelle Lagerkiste, Basis Server). Dabei behoben: der Planer nahm die Server-Rate erst ab 1 h statt ab 10 min und rundete die Laufzeit vor dem Teilen.',
    remaining: 'Im Planer den Reiter „Produktion“ mit der Farm ansehen und eine echte Farm auf Philipps Server über 30 min laufen lassen. Stichprobe auf Paper 26.3 mit dem eigenen Client (die Bot-Bibliothek kann 26.3 noch nicht; auf 26.3 läuft nur der Konsolentest).',
    command: 'scripts/mod/test_bridge_paper_bots.sh farm 1.21.11',
    evidence: '07.11.2026, Plugin aus dem Quellstand (COOP-08-S05): Paper 1.21.11 (Build 132), zwei Bot-Spieler, Team-Raum wrangler dev: 26 Zuckerrohr in 10 min = 156/h im Spiel und im Planer, grün in 680 s.',
  },
  // Block 7 „Projekt, Produktion und Weltkarte vertiefen“ (06.11.2026)
  { caseId: 'PROJ-03', scope: 'teil', covers: 'Bauabschnitte anlegen, Schritte abhaken, Neuladen, Druckansicht (Druckmedium) und Handy-Baumodus in Chromium.', remaining: 'Echter Drucker und echtes Telefon (GERAET-06).',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/site.e2e.mjs tests/e2e/build-run.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-07', scope: 'voll', covers: 'Bauteil in der Werkstatt ändern, Updates-Reiter mit Vergleich, Übernehmen nur des Gezeigten, Rückgängig, Zurückkehren, Einfrieren, Neuladen, Telefonbreite.',
    command: 'npm run build && node --test tests/unit/core/updates.test.mjs && node --test tests/e2e/updates.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-09', scope: 'voll', covers: 'Vorschlag „Fundament · Rohbau · Dach“, Abhängigkeiten aus Geometrie, Kreis abgewiesen, Meilenstein mit Termin, Neuladen, Projektkarte; Großprojekt „Große Burganlage“: Meilensteine aus Abschnittsnamen je Phase, Straßen zuerst, kritischer Pfad durch alle Phasen.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/program.e2e.mjs tests/e2e/scenario-project.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-10', scope: 'teil', covers: 'Zwei Bauleute mit eigenem Tempo und gemeinsamem Abschnitt, 5 Bautage je Woche, Bauzettel, Abwesenheit mit Grund, „abwesend bis“ aus dem Team übernehmen, Team als Bauleute übernehmen mit Rückgängig, Konto je Bauleute.', remaining: 'Ein echter Mitspieler live im Team-Raum (zwei Geräte).',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/program.e2e.mjs tests/e2e/program-absence.e2e.mjs tests/e2e/team.e2e.mjs tests/e2e/builder-account.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-12', scope: 'voll', covers: 'Bruchsteingenerator läuft („mit Farm“), echte Ernte ins Baustellen-Lager, Rate „gemessen“, Restbedarf sinkt, Neuladen, Öfen je Zielzeit; dazu Ofenstraße aus dem Katalog als Bauabschnitt und in der Planung, Rückgängig, Telefonbreite.',
    command: 'npm run build && node --test tests/unit/materials/furnace-line.test.mjs && node --test --test-concurrency=1 tests/e2e/production.e2e.mjs tests/e2e/scenario-project.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-13', scope: 'voll', covers: 'Großprojekt mit Bauleuten und Start: wenig Sammelzeit gibt Engpass und gefährdeten Baubeginn, vorgeschlagene Farm „Als geplant anlegen“, „Auf Material warten“ schraffiert, „Die Planung wartet auf das Material“, laufende Farm ändert die Wartezeit, AFK-Platz nennt erreichte und verfehlte Farm mit Grund.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/scenario-project.e2e.mjs tests/e2e/program-depth.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-16', scope: 'voll', covers: 'Basisplan mit Namen (± 0), Anteil 25 % gibt Verzug und Basisplan-Linie, zweiter Basisplan und Vergleich, Start in der Vergangenheit läuft ab heute, Neuladen, Verwerfen.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/program-depth.e2e.mjs tests/e2e/program-absence.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  { caseId: 'PROJ-21', scope: 'voll', covers: '„Erst nach“ A, zu früher Start mit einem Klick korrigiert, Kreis abgewiesen, Pfeil auf der Weltkarte; A mit Bauplatz löschen: Rückfrage nennt Nachfolger und Bauplatz, danach wartet B auf nichts.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/project-order.e2e.mjs tests/e2e/scenario-project.e2e.mjs', evidence: '06.11.2026, main 3bdb39e + Block 7 (Ofenstraße, Szenariotests), Chromium headless im Container, voller Browserlauf grün' },
  // Block 6 (MODEL-01, ARCH-02)
  { caseId: 'PROJ-05', scope: 'teil',
    covers: 'OBJ, GLB, STL und 3MF werden erzeugt; Khronos glTF-Validator ohne Fehler und Warnungen; eigener STL/3MF-Prüfer und lib3mf: dicht, mannigfaltig, Verweise gültig; Blender 5.2 öffnet GLB mit Textur, OBJ+MTL und STL; PrusaSlicer 2.7 meldet „manifold“ und schneidet STL/3MF zu G-Code (auch Kolosseum 120 mm).',
    remaining: 'Echter Druck auf einem Drucker; Bambu Studio oder Cura; Export in Firefox/Safari am iPad.',
    command: 'node --test tests/unit/formats/model3d-files.test.mjs tests/unit/formats/model3d-external.test.mjs tests/e2e/model3d.e2e.mjs (BLENDER_PYTHON, PRUSA_SLICER)',
    evidence: '06.11.2026, Block 6, Chromium und Linux-Container: 6/6, 2/2, 2/2' },
  { caseId: 'GERAET-03', scope: 'teil',
    covers: 'Browserdaten, die echte alte Stände geschrieben haben (28.10. Datenbank v1, 02.11. v3, 04.11. v4: Katalog, eigenes Gebäude mit Versionen, Projekt mit Baustelle und Haken, Sammlung, Vorlage, Sicherung), öffnet die aktuelle App: alles ist noch da und unverändert, Datencheck ohne Fehler, altes Projekt öffnet, alte Sicherung lesbar.',
    remaining: 'Stichprobe mit deinen eigenen, lange gewachsenen Daten auf PC und iPad; „Dauerhaft speichern“ im echten Browser.',
    command: 'npm run build && node --test tests/e2e/aged-browserdata.e2e.mjs',
    evidence: '06.11.2026, Block 6, Chromium: 3/3' },
  // Block 5 Werkstatt und Weltkarte (EDIT-01/02/03/05/06, MAP-01, MAP-04) auf iPad/iPhone-Profilen und Firefox.
  {
    caseId: 'WERK-01', scope: 'teil',
    covers: 'Neues Bauteil: Blöcke setzen (Raster und 3D, auch per Finger), Quader und Treppenlinie, viele Schritte rückgängig/wiederholen, Tastenkürzel-Übersicht (?), Speichern als Bauteil und neue Version; iPad/iPhone ohne waagrechtes Scrollen.',
    remaining: 'Rückfrage beim Verlassen ohne Speichern („Abbrechen“ behält den Entwurf) und Drehen einzelner Blöcke nur von Hand; Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/editor.e2e.mjs tests/e2e/workshop-tools.e2e.mjs tests/e2e/touch-devices.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'WERK-02', scope: 'teil',
    covers: 'Linie, Quader, Bogen, Ellipsoid, Torus, Wendel und Musterpinsel (Mischung, Verlauf) erzeugen die eingestellten Maße und Verteilungen; Schablone mit Vorschau.',
    remaining: 'Pyramide und Kegel nur im Einheitstest (editor-patterns.test.mjs), nicht im Browser gezogen; Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/workshop-tools.e2e.mjs tests/e2e/workshop-region.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'WERK-03', scope: 'teil',
    covers: 'Zauberauswahl, Stapeln, Extrudieren, Auswahl verschieben/drehen, Symmetrie, Kurve, Naturwerkzeuge, Oberfläche, Farbverlauf und Bild → Blöcke wirken nur auf die Auswahl; am Handy ohne waagrechtes Scrollen.',
    remaining: 'Ob die Ergebnisse optisch „wie in der Vorschau“ aussehen und Bild → Blöcke passende Farben trifft, beurteilt ein Mensch; Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/workshop-region.e2e.mjs tests/e2e/workshop-creative.e2e.mjs tests/e2e/editor.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'WERK-08', scope: 'teil',
    covers: 'Im 3D-Bild setzen und abbauen, Boden und senkrechte Wand mit dem Quader aufziehen, Gruppe per Shift-Ziehen wählen und verschieben, Rückgängig; auf iPad Pro 11 und iPhone 15 setzt ein Finger genau einen Block, zwei Finger zoomen ohne zu bauen.',
    remaining: 'Rechte Maustaste dreht (Maus) und echte Zwei-Finger-Geste auf dem iPad; Test nutzt Zeiger-Ereignisse vom Typ touch. Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/workshop-build3d.e2e.mjs tests/e2e/touch-devices.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'KARTE-01', scope: 'teil',
    covers: 'Projekt platzieren (auch per Finger auf iPad/iPhone), über die Weltlage verschieben, drehen und spiegeln; Lage und Weltkoordinaten bleiben nach dem Neuladen.',
    remaining: 'Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/worldmap.e2e.mjs tests/e2e/world-turn.e2e.mjs tests/e2e/touch-devices.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'KARTE-02', scope: 'teil',
    covers: 'Bauplatz, Weg und Punkt anlegen (Maus und Finger), duplizieren, drehen, Wegecken ziehen, Rahmen-Auswahl, Kontextmenü per Rechtsklick und per langem Drücken (iPad/iPhone), Löschen mit Entf/Menü/Liste, Strg+Z/Strg+Y; Objektliste stimmt mit der Karte.',
    remaining: 'Langdruck im Test als touch-Zeiger ausgelöst; Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/worldbuilder.e2e.mjs tests/e2e/touch-devices.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  {
    caseId: 'KARTE-05', scope: 'teil',
    covers: 'Ebenen und Gruppen zuweisen, ganze Gruppe/Einzeleintrag wählen, Sperren verhindert Verschieben und Löschen, Rückgängig nimmt Sperren und Zuweisen zurück, Neuladen behält alles; Sperren/Entsperren über das Langdruck-Menü am iPad.',
    remaining: 'Zone mit drei Ecken und Fläche in Blöcken² nur am Desktop geprüft; Echtes iPad bzw. iPhone mit Safari (GPU, Systemgesten, Gefühl beim Bedienen); Container-WebKit ist nur die Engine.',
    command: 'npm run test:e2e:webkit -- tests/e2e/world-groups.e2e.mjs tests/e2e/worldbuilder.e2e.mjs tests/e2e/touch-devices.e2e.mjs',
    evidence: '06.11.2026, main 3bdb39e + Block 5 Werkstatt/Karte: grün in WebKit 2370 (iPad Pro 11, iPhone 15), Firefox 1555 und Chromium im Container',
  },
  // Block 4c (Team live mit zwei Geräten): echter Team-Raum unter wrangler dev, drei Browser, Mod-Client, Plugin-Schlüssel.
  { caseId: 'TEAMBAU-01', scope: 'voll', covers: 'Team gründen, Bauleitung, „Planstand 1 gilt“, Revision im Reiter „Export“.', command: 'npm run build && node --test tests/e2e/team-acceptance.e2e.mjs', evidence: '06.11.2026, main 94a2487 mit Block 4c, echter Team-Raum unter wrangler dev 4.158.0, Chromium (Rechner 1400 px, Handy 390 px Touch, Tablet 820 px Touch), 5 volle Läufe grün' },
  { caseId: 'TEAMBAU-03', scope: 'voll', covers: 'Über den echten Team-Raum: Abschnitt übernehmen, „Fertig melden“, „✓ Bestätigen“ und „Nacharbeit“ erscheinen mit Namen auf allen drei Geräten; Brett und „Achtung“; beim gleichzeitigen Übernehmen gehört der Abschnitt dem Ersten, der andere sieht „… schneller war“. Planvergleich in teamplan.e2e.mjs.', command: 'npm run build && node --test tests/e2e/team-acceptance.e2e.mjs tests/e2e/teamplan.e2e.mjs', evidence: '06.11.2026, main 94a2487 mit Block 4c, echter Team-Raum unter wrangler dev 4.158.0, Chromium (Rechner 1400 px, Handy 390 px Touch, Tablet 820 px Touch), 5 volle Läufe grün' },
  { caseId: 'TEAMBAU-05', scope: 'teil', covers: 'Blöcke, Lieferung, „Ich sammle“ und Notiz mit @Philipp vom Handy erscheinen live bei der Bauleitung (Mitglieder, „wird gesammelt“, „Meine Aufgaben“); der Statustext nennt Abschnitte, Sammelauftrag und offene Notiz.', remaining: 'Packliste kopieren (Stacks/Shulkerkisten) und den Statustext in Discord einfügen.', command: 'npm run build && node --test tests/e2e/team-acceptance.e2e.mjs', evidence: '06.11.2026, main 94a2487 mit Block 4c, echter Team-Raum unter wrangler dev 4.158.0, Chromium (Rechner 1400 px, Handy 390 px Touch, Tablet 820 px Touch), 5 volle Läufe grün' },
  { caseId: 'TEAMBAU-21', scope: 'teil', covers: 'Arbeitspakete teilen, „Zuweisungen übernehmen“, Zeitplan „Fertig in …“; im Live-Team bringt der neue Planstand die Pakete zu allen Helfern und in den Raum für das Plugin.', remaining: 'Strg+Z nach dem Teilen und die Länge „Fertig in … Bautagen“ gegen „allein“ einschätzen.', command: 'npm run build && node --test tests/e2e/team-acceptance.e2e.mjs tests/e2e/teamplan.e2e.mjs', evidence: '06.11.2026, main 94a2487 mit Block 4c, echter Team-Raum unter wrangler dev 4.158.0, Chromium (Rechner 1400 px, Handy 390 px Touch, Tablet 820 px Touch), 5 volle Läufe grün' },
  { caseId: 'TEAMBAU-24', scope: 'voll', covers: 'Übergabe vom Handy an das Tablet: bis „Annehmen“ beim alten Inhaber, danach beim neuen, live bei der Bauleitung; Abwesenheit erscheint unter „Achtung“; Bauleitung übergeben lässt immer eine Bauleitung (teamplan.e2e.mjs).', command: 'npm run build && node --test tests/e2e/team-acceptance.e2e.mjs tests/e2e/teamplan.e2e.mjs', evidence: '06.11.2026, main 94a2487 mit Block 4c, echter Team-Raum unter wrangler dev 4.158.0, Chromium (Rechner 1400 px, Handy 390 px Touch, Tablet 820 px Touch), 5 volle Läufe grün' },
  { caseId: 'TEAMBAU-25', scope: 'teil', covers: 'Ohne Datei: Live schalten, Einladungslink, Beitreten am Handy und Tablet, „Gerade da“, Helfer mit allen Abschnitten, neuer Planstand mit einem Klick, Meldung in anderem Reiter, WLAN aus („offline · 1 warten“, Notiz kommt nach), Neuladen ohne Doppel, „Einladung erneuern“ sperrt den alten Link für einen dritten Browser.', remaining: 'Echtes Handy im WLAN mit dem Link aus Discord/QR.', command: 'npm run build && node --test tests/e2e/team-acceptance.e2e.mjs', evidence: '06.11.2026, main 94a2487 mit Block 4c, echter Team-Raum unter wrangler dev 4.158.0, Chromium (Rechner 1400 px, Handy 390 px Touch, Tablet 820 px Touch), 5 volle Läufe grün' },
  { caseId: 'TEAMBAU-27', scope: 'teil', covers: 'Ein Mod-Client wie mod-core RoomClient meldet mit dem Mitgliedsschlüssel section.seen und store.seen: „laut Spiel 72 % … ungeprüft“ mit fehlenden Blöcken und Kisteninhalt bei zwei Browsern; eine gefälschte Servermessung wird abgelehnt.', remaining: 'Im echten Spiel mit Mod auf einem Server ohne Plugin bauen und eine Teamkiste öffnen.', command: 'npm run build && node --test tests/e2e/team-acceptance.e2e.mjs', evidence: '06.11.2026, main 94a2487 mit Block 4c, echter Team-Raum unter wrangler dev 4.158.0, Chromium (Rechner 1400 px, Handy 390 px Touch, Tablet 820 px Touch), 5 volle Läufe grün' },
  { caseId: 'TEAMBAU-28', scope: 'teil', covers: '60 Plugin-Messungen und Erträge über 6 Tage per Serverschlüssel: Ertragsbuch 300 cactus/h, „älter als 3 Tage“ verdichtet auf unter 100 Ereignisse bei gleichen Zahlen; Helferin online und Helfer mit älterem Stand bekommen denselben Stand ohne Doppel. Rückgängig in team-digest.e2e.mjs.', remaining: 'Echte Ertragskiste mit Farm am Paper-Plugin über mehrere Tage.', command: 'npm run build && node --test tests/e2e/team-acceptance.e2e.mjs tests/e2e/team-digest.e2e.mjs', evidence: '06.11.2026, main 94a2487 mit Block 4c, echter Team-Raum unter wrangler dev 4.158.0, Chromium (Rechner 1400 px, Handy 390 px Touch, Tablet 820 px Touch), 5 volle Läufe grün' },
  { caseId: 'TEAMBAU-29', scope: 'teil', covers: 'Zwei Helfer klicken im selben Moment „Übernehmen“: ein Inhaber bei allen, Hinweis „Nicht übernommen, weil … schneller war“, „Zurücknehmen“ macht den Abschnitt überall frei; zugeklappter Laptop (Leitung tot ohne Abmeldung): dort abgeben, der Herzschlag erkennt es, Wiederverbinden ohne Neuladen, nichts doppelt.', remaining: 'Echtes Gerät zwei Minuten ohne WLAN bzw. zugeklappt.', command: 'npm run build && node --test tests/e2e/team-acceptance.e2e.mjs', evidence: '06.11.2026, main 94a2487 mit Block 4c, echter Team-Raum unter wrangler dev 4.158.0, Chromium (Rechner 1400 px, Handy 390 px Touch, Tablet 820 px Touch), 5 volle Läufe grün' },
  // Block 5 Grafik in Firefox und Safari (VIEW-01/02, GFX-01/02/03, PERF-04): WebGL in WebKit und Firefox, Spielbildabgleich mit Minecraft 26.3.
  {
    caseId: 'DATEI-01', scope: 'teil',
    covers: 'Betrachter mit WebGL in WebKit (Safari-Engine), Firefox und Chromium: Bau erscheint ganz, verdeckte Flächen fallen weg (1118 statt 2550), Draufsicht/Nord/Ortho/Freiflug, Blockauswahl mit Welt- und Lokalkoordinate, Tippen und Flugtasten; ohne WebGL Ersatzansicht. Spielbildabgleich: derselbe Plan im echten Minecraft 26.3 und im Planer aus derselben Kamera (Augenpunkt, Blickrichtung, Sichtfeld aus dem Spiel) mit Originaltexturen – 30/30 Bildfelder farbgleich, Umriss deckungsgleich, in allen drei Engines; eine um 15° verdrehte Kamera fällt durch.',
    remaining: 'Echte GPU (Philipps Rechner) und echtes iPad/iPhone mit Safari; negative Koordinaten und alle Schnittachsen mit Touch (VIEW-01-S02).',
    command: 'npm run build && npm run test:e2e:webkit -- tests/e2e/viewer.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/viewer.e2e.mjs && BAUPLANER_KEEP=/tmp/spiel scripts/mod/test_bridge_ingame.sh && node scripts/checks/compare_game_shot.mjs /tmp/spiel --engine webkit',
    evidence: '06.11.2026, main ff748e7 + Block 5 Grafik: grün in WebKit 2370, Firefox 1555 (xvfb, llvmpipe-WebGL) und Chromium im Container; Spieltest Minecraft 26.3 (weston, Mesa) bestanden, Spielbildabgleich 100 % in Chromium, Firefox und WebKit',
  },
  {
    caseId: 'DATEI-04', scope: 'teil',
    covers: 'Licht Tag/Sonne mit Schatten/Nacht/Flach (bleibt nach Neuladen), Spawnprüfung mit Zähler, Eckenschatten ohne Neuaufbau, Biomfarben ohne Neuaufbau, Leuchtfeuer mit Pyramide und Glasfarbe, große Szene in 32³-Abschnitten und in mehreren Bildern auf die Grafikkarte, Auswahl über Abschnitte hinweg – in WebKit, Firefox und Chromium mit WebGL. Farben und Form der Blöcke mit Originaltexturen stimmen mit einem echten Spielbild überein (DATEI-01).',
    remaining: 'Flüssiges Drehen eines großen Modells mit viel Wasser/Glas auf echter GPU und auf dem iPad (Software-WebGL misst keine echte Bildrate).',
    command: 'npm run build && npm run test:e2e:webkit -- tests/e2e/graphics.e2e.mjs tests/e2e/graphics2.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/graphics.e2e.mjs tests/e2e/graphics2.e2e.mjs',
    evidence: '06.11.2026, main ff748e7 + Block 5 Grafik: grün in WebKit 2370, Firefox 1555 (xvfb, llvmpipe-WebGL) und Chromium im Container',
  },
  {
    caseId: 'DATEI-05', scope: 'teil',
    covers: 'Großes Litematic (130 085 Blöcke) über den Hintergrund-Worker: Import mit Fortschritt, 3D-Ansicht im Worker gebaut, als Bauteil gespeichert, Datencheck nach Neuladen ohne Befund, STL wasserdicht; Abbrechen von Import und 3MF-Export sofort ohne Datei; Update-Vorschau und Versionsvergleich über den Worker – in WebKit, Firefox und Chromium. Dabei behoben: Speichern scheiterte in Safari-Privatfenstern (Blob in IndexedDB), die Bibliothek wuchs in WebKit bis zum Absturz (Unschärfe auf jedem Kartenknopf).',
    remaining: 'Über 1 Mio. Blöcke (Olympus) auf Philipps Rechner und Safari auf echtem Gerät; Projekt mit dem großen Bauteil anlegen.',
    command: 'npm run build && npm run test:e2e:webkit -- tests/e2e/background-jobs.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/background-jobs.e2e.mjs',
    evidence: '06.11.2026, main ff748e7 + Block 5 Grafik: grün in WebKit 2370, Firefox 1555 (xvfb, llvmpipe-WebGL) und Chromium im Container',
  },
  {
    caseId: 'GERAET-05', scope: 'teil',
    covers: 'Texturen: eigenes Ressourcenpaket (.zip) laden, nach Neuladen noch aktiv (jetzt auch im Safari-Privatfenster gespeichert), Paket ohne Blockzustände abgewiesen, entfernen – in WebKit, Firefox und Chromium; die Originaltexturen aus der Client-Jar von Minecraft 26.3 zeichnen Blöcke wie das Spiel (Spielbildabgleich DATEI-01).',
    remaining: 'Farbschema des Geräts (hell/dunkel/automatisch) auf echten Geräten; Mojang-Download im echten Browser (VIEW-02-S06).',
    command: 'npm run build && npm run test:e2e:webkit -- tests/e2e/textures.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/textures.e2e.mjs',
    evidence: '06.11.2026, main ff748e7 + Block 5 Grafik: grün in WebKit 2370, Firefox 1555 (xvfb, llvmpipe-WebGL) und Chromium im Container',
  },
  // Block 1 (Exportprüfung im echten Spiel)
  {
    caseId: 'DATEI-08', scope: 'teil',
    covers: 'Prüfbau mit Truhe, Doppeltruhe, Fass, zwei Schildern (Vorder-/Rückseite, Farbe, Leuchten, Wachs), Strukturblock, Treppe, Stamm, Tür, Verstärker, Schiene, Hebel, Fackel, Gemälde, Rahmen und Rüstungsständer: ungedreht, um 90° gedreht und gespiegelt als .litematic (Litematica fügt ein) und .schem (//schem load, //paste) – im Spiel Block für Block, jede BlockEntity und jede Entity wie im Plan, gedreht und gespiegelt zusätzlich wie die eigene Drehung des Spiels (StructureTemplate). Im Spiel mit WorldEdit (//copy, //schem save) und Litematica gespeicherte Dateien öffnen im Planer mit allen Blöcken, Inhalten und dem Offset des Originals, als Bauteil übernommen und wieder exportiert sitzen sie im Spiel an derselben Stelle.',
    remaining: 'Bedienung über die Knöpfe im Browser (Import, Export-Reiter) und Einfügen in deinem Modpack (Fabric 26.3 mit REI); Litematica wurde im Test über seine Schnittstelle statt über das Menü bedient.',
    command: 'scripts/mod/test_exports_ingame.sh',
    evidence: '06.11.2026, main b786572 + Block 1 (Exportprüfung), Minecraft 26.3 Fabric-Clientspieltest mit Litematica 0.29.1 und WorldEdit 7.4.6, headless (weston/Mesa): 22/22 Prüfungen bestanden',
  },
  {
    caseId: 'PROJ-04', scope: 'teil',
    covers: 'Exporte als .schem und .litematic laden im echten Spiel mit WorldEdit und Litematica; Ausrichtung von Treppen, Türen, Stämmen, Verstärkern und Schienen stimmt Block für Block, auch gedreht und gespiegelt.',
    remaining: 'Download im Browser und der Blick, ob das Spiel wie die Vorschau aussieht.',
    command: 'scripts/mod/test_exports_ingame.sh',
    evidence: '06.11.2026, main b786572 + Block 1 (Exportprüfung), Minecraft 26.3 Fabric-Clientspieltest mit Litematica 0.29.1 und WorldEdit 7.4.6, headless (weston/Mesa): 22/22 Prüfungen bestanden',
  },
  {
    caseId: 'PROJ-14', scope: 'teil',
    covers: 'Kupfervariante (verwittert + gewachst und angelaufen) aller 15 Kupferfamilien des Profils: Form und Zustände bleiben, im Spiel stehen genau die gewählten Stufen; unter schnellen Zufallsticks bleibt gewachstes Kupfer unverändert, ungewachstes altert; die Kupfermatrix des Planers ist gleich der Alterungs- und Wachsliste des laufenden Spiels.',
    remaining: 'Glas-, Beton- und Terrakottavarianten im Spiel, die Materialliste und die Bedienung im Browser.',
    command: 'scripts/mod/test_exports_ingame.sh',
    evidence: '06.11.2026, main b786572 + Block 1 (Exportprüfung), Minecraft 26.3 Fabric-Clientspieltest mit Litematica 0.29.1 und WorldEdit 7.4.6, headless (weston/Mesa): 22/22 Prüfungen bestanden',
  },
  {
    caseId: 'BIB-02', scope: 'teil',
    covers: 'Versionsvergleich mit einer im Spiel geänderten Truhe und einem geänderten Schild, mit WorldEdit zwei Blöcke weiter gespeichert: der Vergleich meldet die Verschiebung um 2 Blöcke und genau zwei Inhaltsänderungen (Inhalt, Schild), keine weiteren Abweichungen.',
    remaining: 'Detailseite, 3D, Ebenen, Gebäudevergleich und der Versionsvergleich in der Werkstatt-Oberfläche.',
    command: 'scripts/mod/test_exports_ingame.sh',
    evidence: '06.11.2026, main b786572 + Block 1 (Exportprüfung), Minecraft 26.3 Fabric-Clientspieltest mit Litematica 0.29.1 und WorldEdit 7.4.6, headless (weston/Mesa): 22/22 Prüfungen bestanden',
  },
  {
    caseId: 'DATEI-02', scope: 'teil',
    covers: 'Das Java-26.3-Profil des Planers ist gleich den Registern des laufenden Spiels (1286 Blöcke mit allen Zuständen und Grundzuständen, 1658 Items, 49 BlockEntity-Typen, DataVersion 5023); im Spiel gespeicherte WorldEdit- und Litematica-Dateien bekommen die Profilprüfung „passt“.',
    remaining: 'Eine ältere Datei (1.20/1.21) importieren und die Profilprüfung auf der Detailseite ansehen; Importbericht im Browser.',
    command: 'scripts/mod/test_exports_ingame.sh',
    evidence: '06.11.2026, main b786572 + Block 1 (Exportprüfung), Minecraft 26.3 Fabric-Clientspieltest mit Litematica 0.29.1 und WorldEdit 7.4.6, headless (weston/Mesa): 22/22 Prüfungen bestanden',
  },
];

export function autoCheckOf(caseId: string): AutoCheck | undefined {
  return AUTO_CHECKS.find(a => a.caseId === caseId);
}
