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
    remaining: 'Kolosseum-Viertel als Projekt (Quartiere, Bauanleitung, Material) im Browser und ein Kolosseum in der eigenen Welt aufstellen; das ganze Viertel flach und auf Gelände prüfen die Sätze grossprojekte und grossprojekteGelaende (BIB-13, BIB-21).',
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
  // Block 2 Unterthread „Gelände und Großprojekte im Spiel prüfen“ (07.11.2026): Sätze gelaende, basis, grossprojekte, grossprojekteGelaende
  {
    caseId: 'PROJ-06', scope: 'teil',
    covers: 'Geländebauteile aus dem Landschaftsreiter stehen im echten Paper-26.3-Server so, wie der Planer sie übergibt (volle Säulen, vom Spiel aktualisiert): Wege mit Treppen und Halbstufen am Hang in allen 9 Stufenmaterialien, Wegkurven in jeder Wegart, Brücken mit Geländer (Breite 1 und 3, jedes Material) und Dämme über einen Bach, Brücken am Hang, Rampen hinauf, hinunter und steil, Wegnetze über Hügel und Wasser. Keine Treppe ändert ihre Form, kein Geländer seine Pfosten, kein Pfad unter einer Stufe wird zu Erde, kein Wasser läuft aus. Für den früheren Fall PROJ-19 (Pläne auf geplantem Gelände) stehen dazu Basen und Großprojekte mit Landschaftsweg, eingeebneten Bauplätzen, Kaimauer, Laternen und Stegen auf einem Hügel am Meer ohne Abweichung (Sätze basis, grossprojekteGelaende).',
    remaining: 'Bedienung im Browser (Rampe mit M, Aufschütten mit U, Weg-Werkzeug, Rückgängig, 3D-Ansicht) und „Als Bauteil ins Projekt übernehmen“ → .litematic in der eigenen Welt ansehen.',
    command: 'scripts/mod/test_game_placement.sh gelaende basis && BAUPLANER_PLACEMENT_XMX=11G scripts/mod/test_game_placement.sh grossprojekteGelaende',
    evidence: '07.11.2026, Paper 26.3 Build 244 (Java 25), Quellstand Spielprüfstand Gelände/Großprojekte: 111 Geländepläne (831.346 Blöcke), 6 Basen und 13 Großprojekte auf Gelände, 0 Abweichungen. Der erste Lauf fand Treppen ohne Eckform in Kurven, Mauergeländer mit falschen Pfosten, Trampelpfad unter Stufen (wird Erde) – jetzt verbindet designPayload wie das Spiel.',
  },
  {
    caseId: 'PROJ-26', scope: 'teil',
    covers: 'Formstempel (Hügel, Berg, Krater, Mulde, Plateau, je zwei Formen, auto-bemalt), Verwittern mit und ohne Regen an einem steilen Berg, Fluss durch einen Hang (Kies-, Sand-, Lehmbett, schmal und breit), Terrassen und Aufrauen, jede Bodenart am Hügel, Kaimauer am See und jede Streu-Vorlage (Wald, Wiese, Felsen, Wüste, Ufer, Kirschhain, Pilze) stehen im echten Paper-26.3-Server ohne abfallende Blöcke, auslaufendes Wasser oder Drops.',
    remaining: 'Werkzeuge im Browser bedienen (F, V, L, Maske „Bauplätze schützen“, „nur bis Y“) und das Bauteil in der eigenen Welt ansehen.',
    command: 'scripts/mod/test_game_placement.sh gelaende',
    evidence: '07.11.2026, Paper 26.3 Build 244 (Java 25), Quellstand Spielprüfstand Gelände/Großprojekte: 111 Geländepläne, 0 Abweichungen. Der erste Lauf fand Pilze auf Gras/Moos im Tageslicht (fallen ab, jetzt nur auf Podsol/Myzel) und einen Absturz beim Übernehmen von Bruchstein-Felsen auf Geröll (doppelter Palettenzustand), beide behoben.',
  },
  {
    caseId: 'BIB-10', scope: 'teil',
    covers: 'Alle drei Basis-Vorlagen mit jeder Wegart, Wegbreite 1 und 5, ohne Laternen, größerem Abstand und jeder Wasserseite als ganze Projektwelt (Gebäude + Wegenetz-Bauteil) im echten Paper-26.3-Server: nichts fällt ab, keine Verbindung ändert sich, kein Wasser läuft aus.',
    remaining: 'Bedienung im Browser: Zonen an-/abwählen und tauschen, Übernehmen, Abschnitte „Wege & Platz“ und „Phase 1–4“ ansehen.',
    command: 'scripts/mod/test_game_placement.sh basis',
    evidence: '07.11.2026, Paper 26.3 Build 244 (Java 25), Quellstand Spielprüfstand Gelände/Großprojekte: 28 Basispläne (22 flach, 6 auf Gelände), 1.020.450 Blöcke, 0 Abweichungen. Behoben: das Bootshausbecken lief über den Strand aus (Schwelle wie beim Werft-Docktor).',
  },
  {
    caseId: 'BIB-19', scope: 'teil',
    covers: 'Küstenbasis, Starterbasis und Handelshafen auf einem Hügel mit Meer: Wegenetz als Landschaftsweg (Treppen/Halbstufen, Brücke/Damm), Bauplätze eingeebnet mit Kaimauer, Laternen auf dem Gelände, alles zusammen im echten Paper-26.3-Server ohne Abweichung.',
    remaining: 'Echte Küste aus der eigenen Welt (Gelände aus der Mod), Kasten zur Küste, „Ans echte Ufer schieben“ und das Ergebnis im eigenen Spiel ansehen.',
    command: 'scripts/mod/test_game_placement.sh basis',
    evidence: '07.11.2026, Paper 26.3 Build 244 (Java 25), Quellstand Spielprüfstand Gelände/Großprojekte: 6 Basen auf Gelände, 0 Abweichungen. Behoben: Stege sanken auf den Meeresgrund (Deck unter Wasser) und wurden beim Einebnen trockengelegt; Erde lag an Hauswänden und unter Vordächern und Windmühlenflügeln an (Zäune verbanden sich); Laternenzäune berührten den Hang.',
  },
  {
    caseId: 'BIB-13', scope: 'teil',
    covers: 'Alle 13 Großprojekte (darunter das Kolosseum-Viertel) als ganze Projektwelt mit Straßennetz im echten Paper-26.3-Server, dazu jedes Straßennetz in allen vier Belägen und den Breiten 2, 5 und 9: nichts fällt ab, kein Wasser läuft aus, keine Verbindung ändert sich (2 Nähte Zaun–Randstein im Kolosseum-Viertel als Hinweis).',
    remaining: 'Bedienung im Browser: Quartier abwählen, Straßen ändern, Platz tauschen/drehen, als Projekt anlegen; Großbauwerke begehen.',
    command: 'scripts/mod/test_game_placement.sh grossprojekte',
    evidence: '07.11.2026, Paper 26.3 Build 244 (Java 25), Quellstand Spielprüfstand Gelände/Großprojekte: 169 Pläne, 1.202.411 Blöcke, 0 Abweichungen. Der erste Lauf fand in 10 Großprojekten Wasser, das aus Mühlbach, Wassergraben, Fischteich, Bewässerung, Werft oder Aquädukt auf die Straße lief – jetzt setzt das Straßennetz Randsteine an offene Wasserkanten.',
  },
  {
    caseId: 'BIB-21', scope: 'teil',
    covers: 'Alle 12 Großprojekte mit Straßen auf einem Hügel: Straßennetz als Landschaftsweg mit Treppen und Brücken, Bauplätze eingeebnet, Laternen und Randsteine auf dem Gelände, zusammen im echten Paper-26.3-Server ohne Abweichung (Nähte Haus–Gelände nur als Hinweis).',
    remaining: 'Echter Bauplatz mit Geländeaufnahme („Flachsten Platz suchen“, Wasserkanten in der Prüfung), eigenes Großprojekt aus einer Sammlung, Ergebnis im eigenen Spiel.',
    command: 'BAUPLANER_PLACEMENT_XMX=11G scripts/mod/test_game_placement.sh grossprojekteGelaende',
    evidence: '07.11.2026, Paper 26.3 Build 244 (Java 25), Quellstand Spielprüfstand Gelände/Großprojekte: 13 Welten, 3.086.268 Blöcke, 0 Abweichungen, 8 Nähte als Hinweis.',
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
    remaining: 'Stichprobe mit deinen eigenen, lange gewachsenen Daten auf PC und iPad; „Dauerhaft speichern“ im echten Browser; Flugmodus auf dem echten iPad (Safari-Speicherverhalten).',
    command: 'npm run build && node --test tests/e2e/aged-browserdata.e2e.mjs tests/e2e/offline.e2e.mjs',
    evidence: '06.11.2026, Block 6, Chromium: 3/3; Offline-Speicher (PERF-06: installiert, Start ohne Netz, alte Dateien fallen weg, Ausschalten) 07.11.2026 Chromium 6/6 Läufe grün, Firefox und WebKit im Block 5 Geräte grün' },
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
  { caseId: 'TEAMBAU-27', scope: 'teil', covers: 'Ein Mod-Client wie mod-core RoomClient meldet mit dem eigenen Geräteschlüssel (TEAM-SEC-01; mit der Einladung abgewiesen) section.seen und store.seen: „laut Spiel 72 % … ungeprüft“ mit fehlenden Blöcken und Kisteninhalt bei zwei Browsern; eine gefälschte Servermessung wird abgelehnt.', remaining: 'Im echten Spiel mit Mod auf einem Server ohne Plugin bauen und eine Teamkiste öffnen.', command: 'npm run build && node --test tests/e2e/team-acceptance.e2e.mjs', evidence: '06.11.2026, main 94a2487 mit Block 4c, echter Team-Raum unter wrangler dev 4.158.0, Chromium (Rechner 1400 px, Handy 390 px Touch, Tablet 820 px Touch), 5 volle Läufe grün' },
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
    covers: 'Großes Litematic (130 085 Blöcke) über den Hintergrund-Worker: Import mit Fortschritt, 3D-Ansicht im Worker gebaut, als Bauteil gespeichert, Datencheck nach Neuladen ohne Befund, STL wasserdicht; Abbrechen von Import und 3MF-Export sofort ohne Datei; Update-Vorschau und Versionsvergleich über den Worker – in WebKit, Firefox und Chromium. Dabei behoben: Speichern scheiterte in Safari-Privatfenstern (Blob in IndexedDB), die Bibliothek wuchs in WebKit bis zum Absturz (Unschärfe auf jedem Kartenknopf). Über 1 Mio. Blöcke in Chromium: Großstadt.litematic mit 1.451.347 Blöcken (Box 600 × 31 × 600 = 11,2 Mio. Zellen) einmal abbrechen, ganz laden (3–4,5 s, längste Bildpause 0,5 s), Bericht „Luftzellen sind nicht als Zellen übernommen“, kein „Bauvolumen überschreitet“, als Bauteil gespeichert und als Projekt angelegt; eine Datei mit 4,2 Mio. Blöcken wird mit „… 4,2 Mio. Blöcke … teilen“ abgewiesen.',
    remaining: 'Safari auf echtem Gerät; die 1,45-Mio.-Datei nur in Chromium geprüft.',
    command: 'npm run test:e2e:webkit -- tests/e2e/background-jobs.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/background-jobs.e2e.mjs && npm run test:grossbau',
    evidence: '06.11.2026, main ff748e7 + Block 5 Grafik: grün in WebKit 2370, Firefox 1555 (xvfb, llvmpipe-WebGL) und Chromium im Container; test:grossbau 06.11.2026 auf main 7f48d4b + SIZE-01-S06 grün (Chromium, Minecraft 26.3 Gametest).',
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
    covers: 'Versionsvergleich mit einer im Spiel geänderten Truhe und einem geänderten Schild, mit WorldEdit zwei Blöcke weiter gespeichert: der Vergleich meldet die Verschiebung um 2 Blöcke und genau zwei Inhaltsänderungen (Inhalt, Schild), keine weiteren Abweichungen. Dazu (LIB-07) Chromium 1400/390 px: jede Karte zeigt Grundfläche, Höhe, Material, Survival-Aufwand, Profil Java 26.3 und Prüfstand; Grundstück 16 × 16 und Aufwand filtern über die Adresse, jeder Treffer passt; Aufwand, „nur Vanilla“ und „nur im Spiel geprüft“ über die Filterleiste; Innenansicht ändert die Bilder; Detail mit Ansichten außen/innen/oben, Vergleich mit allen neuen Zeilen, Generator- und Ensemblekarten mit Prüfstand; eigene Palette speichern und auf die Merkliste anwenden, Varianten erscheinen in der Bibliothek. Einheitstests: Aufwandsformel, Grundstücke, Prüfstand-Abgleich über den Inhalts-Hash (geändert = „neu prüfen“), Ensemble-Rechteck, Schnitthöhe, Palettenrollen und exakter Tausch, Palette als Vorlage mit Verlauf.',
    remaining: 'Detailseite, 3D, Ebenen und der Versionsvergleich in der Werkstatt-Oberfläche; ob Vergleichswerte und Baustil-Paletten beim Aussuchen helfen und gut aussehen, kann nur ein Mensch beurteilen.',
    command: 'scripts/mod/test_exports_ingame.sh && node --test tests/unit/catalog/compare.test.mjs && node --test tests/e2e/library-compare.e2e.mjs',
    evidence: '06.11.2026, main b786572 + Block 1 (Exportprüfung), Minecraft 26.3 Fabric-Clientspieltest mit Litematica 0.29.1 und WorldEdit 7.4.6, headless (weston/Mesa): 22/22 Prüfungen bestanden; 07.11.2026 LIB-07: Prüfstand-Lauf Paper 26.3 Build 244, 559 Pläne ohne Abweichung, Ergebnis je Gebäude in packages/domain/src/catalog/pruefstand.ts',
  },
  {
    caseId: 'DATEI-02', scope: 'teil',
    covers: 'Das Java-26.3-Profil des Planers ist gleich den Registern des laufenden Spiels (1286 Blöcke mit allen Zuständen und Grundzuständen, 1658 Items, 49 BlockEntity-Typen, DataVersion 5023); im Spiel gespeicherte WorldEdit- und Litematica-Dateien bekommen die Profilprüfung „passt“.',
    remaining: 'Eine ältere Datei (1.20/1.21) importieren und die Profilprüfung auf der Detailseite ansehen; Importbericht im Browser.',
    command: 'scripts/mod/test_exports_ingame.sh',
    evidence: '06.11.2026, main b786572 + Block 1 (Exportprüfung), Minecraft 26.3 Fabric-Clientspieltest mit Litematica 0.29.1 und WorldEdit 7.4.6, headless (weston/Mesa): 22/22 Prüfungen bestanden',
  },
  // ── Block 3: Mod im echten Spiel (Fenstergrößen, Modpack mit REI und Shader) und der echte Planer im Browser dagegen
  { caseId: 'MOD-25', scope: 'teil', covers: 'Im echten Spiel in 854×480, 1366×768 und 1920×1080 (GUI 4): J-Menü mit den Reitern Plan, Position, Ansicht, Optionen und alle 10 Gruppen von „Befehle & Status“; jeder Knopf liegt im Fenster, keine Beschriftung ist gekürzt oder breiter als ihr Knopf, nichts überdeckt sich (48 Bilder layout-*.png); auch im Modpack mit REI. `/bauplaner hilfe` zeigt fünf Schritte, `/bauplaner menue` öffnet das Menü. Dabei behoben: „Ausblen…“ statt „Ausblenden“, abgeschnittener Status ohne „…“, „Befehle & Status“ passte im kleinen Fenster nicht.', remaining: 'Wie sich das Hereingleiten anfühlt; auf einem echten Server ohne Plugin die ausgegrauten Serverknöpfe mit Grund.', command: 'scripts/mod/test_bridge_ingame.sh (Modpack: BAUPLANER_MODPACK_MODS=… BAUPLANER_SHADERPACK=…; NeoForge: test_bridge_ingame_forge.sh; 26.4: BAUPLANER_MC=26.4)', evidence: '07.11.2026, Mod 0.25.0 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium; am 06.11. zusätzlich Philipps Modpack (21 Mods mit REI, Iris + Complementary Reimagined, Distant Horizons, Sodium, Xaero: alle Layout-Prüfungen grün), NeoForge 26.3 und Fabric 26.4 Snapshot 7 grün; am 11.11. Fabric 26.4 Snapshot 8 komplett grün' },
  { caseId: 'MOD-26', scope: 'teil', covers: 'Meldungskarten oben rechts, dieselbe Meldung zählt „×2“; „Chat (wie früher)“ schreibt die Meldung in den Chat und erzeugt keine Karte; Bauanzeige kompakt, ausführlich (höher) und aus; Baufenster, Frage-Karte, Meldungen, Weltplan-, Team- und Bauhilfe-Anzeige überdecken sich in keiner der drei Fenstergrößen und bleiben im Fenster.', remaining: 'Farben (Fehler rot) und Lesbarkeit unter dem eigenen Shader beim Spielen.', command: 'scripts/mod/test_bridge_ingame.sh (Modpack: BAUPLANER_MODPACK_MODS=… BAUPLANER_SHADERPACK=…; NeoForge: test_bridge_ingame_forge.sh; 26.4: BAUPLANER_MC=26.4)', evidence: '07.11.2026, Mod 0.25.0 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium; am 06.11. zusätzlich Philipps Modpack (21 Mods mit REI, Iris + Complementary Reimagined, Distant Horizons, Sodium, Xaero: alle Layout-Prüfungen grün), NeoForge 26.3 und Fabric 26.4 Snapshot 7 grün; am 11.11. Fabric 26.4 Snapshot 8 komplett grün' },
  { caseId: 'MOD-28', scope: 'teil', covers: 'Tab-Vervollständigung von /bauplaner und /buildplanner zeigt die Wörter der eingestellten Sprache; englische Spielsprache: „auto“ schaltet Menü, Befehlsseite und Meldungen auf Englisch; die Befehlsseite und alle Knöpfe passen in beiden Sprachen in jede Fenstergröße.', remaining: 'Die Befehlsliste auf #/mod in beiden Sprachen ansehen.', command: 'scripts/mod/test_bridge_ingame.sh (Modpack: BAUPLANER_MODPACK_MODS=… BAUPLANER_SHADERPACK=…; NeoForge: test_bridge_ingame_forge.sh; 26.4: BAUPLANER_MC=26.4)', evidence: '07.11.2026, Mod 0.25.0 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium; am 06.11. zusätzlich Philipps Modpack (21 Mods mit REI, Iris + Complementary Reimagined, Distant Horizons, Sodium, Xaero: alle Layout-Prüfungen grün), NeoForge 26.3 und Fabric 26.4 Snapshot 7 grün; am 11.11. Fabric 26.4 Snapshot 8 komplett grün' },
  { caseId: 'MOD-18', scope: 'teil', covers: 'Die Bauhilfe-Zeile über der Schnellleiste weicht in allen drei Fenstergrößen den anderen Anzeigen aus und bricht um; Geister und Kurven stimmen mit den Prüfvektoren der Werkstatt überein (fixtures/edit, Block 5).', remaining: 'Im eigenen Spiel spiegeln, drehen, Kurve setzen und dabei bauen.', command: 'scripts/mod/test_bridge_ingame.sh (Modpack: BAUPLANER_MODPACK_MODS=… BAUPLANER_SHADERPACK=…; NeoForge: test_bridge_ingame_forge.sh; 26.4: BAUPLANER_MC=26.4)', evidence: '07.11.2026, Mod 0.25.0 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium; am 06.11. zusätzlich Philipps Modpack (21 Mods mit REI, Iris + Complementary Reimagined, Distant Horizons, Sodium, Xaero: alle Layout-Prüfungen grün), NeoForge 26.3 und Fabric 26.4 Snapshot 7 grün; am 11.11. Fabric 26.4 Snapshot 8 komplett grün' },
  { caseId: 'LIVE-01', scope: 'teil', covers: 'Planer im Browser: „Verbinden“ ohne Code; im Spiel erscheint oben rechts „Planer möchte sich verbinden – J drücken“, J → „Planer zulassen“; danach verbunden, die Karte zeigt die Spielerposition.', remaining: 'Spiel beenden und neu starten: Wiederverbinden von selbst; Browserfrage „lokales Netzwerk“ im eigenen Browser.', command: 'scripts/mod/test_bridge_ingame.sh (Browserteil: scripts/mod/bridge_browser.mjs, braucht npm run build)', evidence: '07.11.2026, Mod 0.25.0 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) gegen den gebauten Planer in Chromium (vite preview), nichts nachgebildet' },
  { caseId: 'LIVE-03', scope: 'teil', covers: '„Gelände um mich lesen“ liest geladene Chunks; „📍 Punkt, wo ich stehe“ und „Weltplan ins Spiel senden“ blenden die Einträge im Spiel als Markierungen ein.', remaining: '„Spur als Weg“ und Mitspieler auf der Karte.', command: 'scripts/mod/test_bridge_ingame.sh (Browserteil: scripts/mod/bridge_browser.mjs, braucht npm run build)', evidence: '07.11.2026, Mod 0.25.0 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) gegen den gebauten Planer in Chromium (vite preview), nichts nachgebildet' },
  { caseId: 'LIVE-04', scope: 'teil', covers: 'Im Spiel mit den Tasten verschoben und gedreht: der Planer meldet die andere Lage, „Lage aus dem Spiel übernehmen“ setzt das Projekt dorthin, der Fortschritt kommt live; „Baustand holen“ legt die Aufnahme im Projekt ab.', remaining: 'Die Aufnahme unter „Bauen“ je Bauschritt ansehen.', command: 'scripts/mod/test_bridge_ingame.sh (Browserteil: scripts/mod/bridge_browser.mjs, braucht npm run build)', evidence: '07.11.2026, Mod 0.25.0 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) gegen den gebauten Planer in Chromium (vite preview), nichts nachgebildet' },
  { caseId: 'PROJ-24', scope: 'teil', covers: 'Ohne Datei: „Gelände aus dem Spiel übernehmen“ legt eine Geländeaufnahme „aus dem Spiel“ mit Biomen an; „Gelände aus dem Spiel prüfen“ zeigt das Urteil mit „Quelle: Blöcke aus dem Spiel (geladene Chunks)“; 3000 Blöcke entfernt kommt das Gelände aus dem Geländegedächtnis; die Landschaft wird nach Biomen bemalt. Dabei behoben: Testreihenfolge, damit die Prüfung am Bauplatz läuft.', remaining: 'Notfall-Import aus Regionsdateien (#/welt) und der Hinweis auf die fehlende Richtung beim eigenen Bauplatz.', command: 'scripts/mod/test_bridge_ingame.sh (Browserteil: scripts/mod/bridge_browser.mjs, braucht npm run build)', evidence: '07.11.2026, Mod 0.25.0 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) gegen den gebauten Planer in Chromium (vite preview), nichts nachgebildet' },
  // ── Block 5 Geräte (QA-02, PERF-06, UI-03, UX-01, GUIDE-01, LIB-02/03, BACKUP-02): dieselben Abläufe in drei Engines.
  {
    caseId: 'START-01', scope: 'teil',
    covers: 'Frischer Browser: Startbildschirm, dann Projektzentrale ohne Fehlermeldung; Standardthema „LMNT“ schon beim ersten Bild; WCAG-Kontrast aller sichtbaren Texte auf Projektzentrale, Anleitung, Bibliothek, Generatoren, Weltkarte, Spiel, Systemcheck und den Reitern Editor/Bauen/Material/Baustelle/Team hell und dunkel; Bewegung reduzieren; iPad-Profil mit 44-px-Zielen ohne Querscrollen – in Chromium, Firefox und WebKit. Dabei behoben: Bibliothek wuchs in WebKit bis zum Absturz.',
    remaining: 'Ansehen auf dem echten iPad und PC: wirken Knöpfe, Karten und Reiter überall gleich, flackert nichts beim Seitenwechsel (Geschmack und echte Bildschirme).',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/design.e2e.mjs tests/e2e/app.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/design.e2e.mjs tests/e2e/app.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/design.e2e.mjs tests/e2e/app.e2e.mjs',
    evidence: '07.11.2026, Block 5 Geräte auf main + Fixes: grün in Chromium, Firefox 1555 (xvfb) und WebKit 2370 (Safari-Engine) im Container',
  },
  {
    caseId: 'START-03', scope: 'teil',
    covers: 'Sicherungsstand mit Alter und „Sichern“, Protokoll, Prüfen; „Alles sichern“ lädt die Datei herunter (auch in WebKit/Safari), Wiederherstellen in einem leeren Browser mit Prüfplan, identischer Stand wird übersprungen, lokal geänderter als Kopie, manipulierte Datei abgewiesen; Abschnittsstände einfrieren und zurücksetzen. Dabei behoben: in Safari war die Download-Adresse nach 1 s ungültig (iPad fragt erst nach), Speichern hing bei einem Speicherfehler.',
    remaining: 'Auf dem iPad: Download-Frage von Safari bestätigen und die Datei aus „Dateien“ wieder einspielen.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/persistence.e2e.mjs tests/e2e/backup-reminder.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/persistence.e2e.mjs tests/e2e/backup-reminder.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/persistence.e2e.mjs tests/e2e/backup-reminder.e2e.mjs',
    evidence: '07.11.2026, Block 5 Geräte auf main + Fixes: grün in Chromium, Firefox 1555 (xvfb) und WebKit 2370 (Safari-Engine) im Container',
  },
  {
    caseId: 'START-08', scope: 'teil',
    covers: 'Anleitung: sechs Wege, Bild und Satz je Schritt, Knöpfe führen an die Stelle, Haken und Fortschritt bleiben nach Neuladen, Handybreite ohne Überstand – in Chromium, Firefox und WebKit.',
    remaining: 'Ob die Sätze verständlich sind und die Bilder zum Spiel passen, kann nur ein Mensch sagen.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/guide.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/guide.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/guide.e2e.mjs',
    evidence: '07.11.2026, Block 5 Geräte auf main + Fixes: grün in Chromium, Firefox 1555 (xvfb) und WebKit 2370 (Safari-Engine) im Container',
  },
  {
    caseId: 'START-10', scope: 'teil',
    covers: 'Vier Hauptbereiche und Anleitung, Fußzeilen-Wege, eingeklappte Bereiche (Speicher & Sicherung, Weitere Wege, Kreativ-Werkzeuge, Abschnittsstände, Zeitbudget) öffnen vollständig, bei 1400 und 390 px – in Chromium, Firefox und WebKit.',
    remaining: 'Strg+K/⌘K auf der echten Tastatur (Mac) und das Gefühl „Wichtigstes zuerst“.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/simple-ui.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/simple-ui.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/simple-ui.e2e.mjs',
    evidence: '07.11.2026, Block 5 Geräte auf main + Fixes: grün in Chromium, Firefox 1555 (xvfb) und WebKit 2370 (Safari-Engine) im Container',
  },
  {
    caseId: 'START-11', scope: 'teil',
    covers: 'Projektreiter in vier Schritten mit Kurzsatz je Reiter, aktiver Schritt hervorgehoben, Bibliothek in drei Gruppen; iPad-Profil: alle Reiter in der Leiste, mindestens 44 px hoch – in Chromium, Firefox und WebKit.',
    remaining: 'Kurzsätze lesen und beurteilen.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/simple-ui.e2e.mjs tests/e2e/design.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/simple-ui.e2e.mjs tests/e2e/design.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/simple-ui.e2e.mjs tests/e2e/design.e2e.mjs',
    evidence: '07.11.2026, Block 5 Geräte auf main + Fixes: grün in Chromium, Firefox 1555 (xvfb) und WebKit 2370 (Safari-Engine) im Container',
  },
  {
    caseId: 'BIB-07', scope: 'teil',
    covers: 'Sammlung mit Kategorie und Unterordner, Gebäude aufnehmen, Version festhalten, Notiz, Katalogfilter nach Sammlung, bleibt nach Neuladen; Vorlagen und Telefonbreite 390 px – in Chromium, Firefox und WebKit. Dabei behoben: Vorschaubilder aus dem Speicher luden in Safari nicht (Offline-Speicher, Privatfenster).',
    remaining: 'Ordner per Finger verschieben auf dem echten iPad.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/collections.e2e.mjs tests/e2e/thumb-store.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/collections.e2e.mjs tests/e2e/thumb-store.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/collections.e2e.mjs tests/e2e/thumb-store.e2e.mjs',
    evidence: '07.11.2026, Block 5 Geräte auf main + Fixes: grün in Chromium, Firefox 1555 (xvfb) und WebKit 2370 (Safari-Engine) im Container',
  },
  {
    caseId: 'GERAET-02', scope: 'teil',
    covers: 'Schem-Testdatei im Betrachter und eine .schem über das Dateifeld als Bauteil gespeichert (Importbericht, Name, Detailseite mit Format) – in Chromium, Firefox und WebKit. Dabei behoben: „Als neues Bauteil speichern“ hing in WebKit/Safari-Privatfenstern.',
    remaining: 'Die Dateiauswahl des Geräts selbst (iPad „Dateien“, Android „Downloads“) lässt sich nicht automatisieren.',
    command: 'npm run build && node --test --test-concurrency=1 tests/e2e/app.e2e.mjs tests/e2e/persistence.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/app.e2e.mjs tests/e2e/persistence.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/app.e2e.mjs tests/e2e/persistence.e2e.mjs',
    evidence: '07.11.2026, Block 5 Geräte auf main + Fixes: grün in Chromium, Firefox 1555 (xvfb) und WebKit 2370 (Safari-Engine) im Container',
  },
  // ── SIZE-01 / SPLIT-01: Großbau und Herauslösen im echten Spiel (Minecraft 26.3 Fabric-Gametest + Chromium auf der gebauten Website)
  {
    caseId: 'WERK-07', scope: 'voll',
    covers: 'Das 1,45-Mio.-Bauteil in der Werkstatt: Hinweis „Großes Modell“ bzw. „Sehr großes Modell“ ohne Sperre, 356.055 Grasblöcke durch Moos ersetzen (4–6 s), Rückgängig (2,4 s), Wiederholen, „Als Version 2.0 speichern“; der Litematic-Export der gespeicherten Version enthält alle Blöcke, kein Gras mehr und genau das ersetzte Moos. Bekannt: bei diesen Schritten stockt die Seite mehrere Sekunden (Folgepunkt Leistung).',
    command: 'npm run test:grossbau',
    evidence: '06.11.2026, main 7f48d4b + SIZE-01-S06, Mod 0.23.0 aus dem Quellstand: Minecraft 26.3 Fabric-Client-Gametest (weston, ohne GPU) und Chromium auf dist-web, Lauf grün.',
  },
  {
    caseId: 'LIVE-02', scope: 'voll',
    covers: 'Kleiner Plan (test_bridge_ingame.sh, Mod 0.25.0): „▶ Ins Spiel senden“ von der Weltkarte, das Hologramm liegt genau an der Kartenlage, ohne Datei. Großer Plan: echte Website → echte Mod im echten Spiel (auch LIVE-09): Verbinden per Klickfreigabe, das Projekt mit 1,45 Mio. Blöcken auf der Weltkarte „Wo ich stehe“ und „▶ Ins Spiel senden“; die Website meldet „Großer Plan (1,5 Mio. Blöcke) …“, das Spiel „von der Website platziert … Revision 1“; das Hologramm steht genau am Kartenursprung der Website, das Spiel hängt dabei nicht (längste Tickpause 0,1 s).',
    command: 'scripts/mod/test_bridge_ingame.sh && npm run test:grossbau',
    evidence: '07.11.2026 test_bridge_ingame.sh mit Mod 0.25.0 (echter Client gegen den gebauten Planer); 06.11.2026, main 7f48d4b + SIZE-01-S06, Mod 0.23.0 aus dem Quellstand: Minecraft 26.3 Fabric-Client-Gametest (weston, ohne GPU) und Chromium auf dist-web, Lauf grün.',
  },
  {
    caseId: 'MOD-11', scope: 'teil',
    covers: 'Sehr großer Plan (1,45 Mio. Blöcke, auch MOD-15) im echten Spiel: Hologramm kommt ohne Hänger, `/bauplaner leistung` normal/niedrig/hoch – die Grenze greift („niedrig“ zeigt weniger als „normal“, „hoch“ mehr), Drehen mit Ende und Verschieben mit Pfeiltaste in unter einer Sekunde, `/bauplaner diagnose` nennt den Plan, Scan-Download läuft.',
    remaining: 'Bildrate auf echter Grafikkarte (auch mit Shadern) beim Herumlaufen, ferne Blöcke als Kisten und kurz „Plan wird vorbereitet …“ ansehen – nur im eigenen Spiel.',
    command: 'npm run test:grossbau',
    evidence: '06.11.2026, main 7f48d4b + SIZE-01-S06, Mod 0.23.0 aus dem Quellstand: Minecraft 26.3 Fabric-Client-Gametest (weston, ohne GPU) und Chromium auf dist-web, Lauf grün.',
  },
  {
    caseId: 'BIB-11', scope: 'teil',
    covers: 'Das echte Spiel baut eine Basis in Gelände mit festem Seed (drei Häuser, Keller, Bunker, zwei Felder, Gehege, Wege, Bach mit Brücke), die Mod nimmt sie auf (basis-aus-dem-spiel.litematic, rund 123.000 Blöcke mit Wald, Strand, Ruinenportal); im Browser Gebäudeblatt → „Gebäude herauslösen“: 3 Gebäude, Keller beim Haus darüber, „Unterirdischer Raum“, „Brücke“ mit „verbindet „Wohnhaus“ und „Schmiede““, Felder, Gehege, Wege; „Als Projekt aufteilen“ ohne Konflikte, jeder Block am alten Platz.',
    remaining: 'Eine eigene, gewachsene Basis aus Philipps Welt herauslösen und die Erkennung beurteilen.',
    command: 'npm run test:grossbau && node --test tests/unit/core/split-game-base.test.mjs',
    evidence: '06.11.2026, main 7f48d4b + SIZE-01-S06, Mod 0.23.0 aus dem Quellstand: Minecraft 26.3 Fabric-Client-Gametest (weston, ohne GPU) und Chromium auf dist-web, Lauf grün.',
  },
  {
    caseId: 'LINK-14', scope: 'teil',
    covers: 'Echter Paper-Server (1.21.11 und 26.3) mit lokalem Team-Raum: Server-Link mit Unterschriftsschlüssel, „noch ungeprüft“ bis zur Bestätigung, unterschriebene Schutzstufe „sperren/team“ gilt, vier gefälschte Ereignisse (Rolle im Namen der Bauleitung, Schutz aus von einem Baumeister, fremder Spielername, falsche Unterschrift) stehen in /bp team raum pruefen, nach Neustart gleich, schutz-quelle server; Planer schickt Schlüssel und unterschriebene Schutzstufe (team-room.e2e).',
    remaining: 'Blocksetzen echter Spieler in fremden, freien und eigenen Abschnitten auf Philipps Server.',
    command: 'scripts/mod/test_bridge_paper_signed.sh; node --test tests/e2e/team-room.e2e.mjs',
    evidence: '06.11.2026, Mod/Plugin 0.26.0, Paper 1.21.11 + 26.3, wrangler dev',
  },
  // ── Block B (07.11.2026): inaktive Threads – Planer, Team-Raum, Geräte (planer-abnahmen, team-abnahmen, werkstatt-abnahme)
  {
    caseId: 'START-02', scope: 'voll',
    covers: 'Projektzentrale: Projekt „Hafenviertel“ anlegen, im Projektkopf mit ✎ umbenennen (leerer Name abgelehnt), ein zweites anlegen und löschen; nach dem Neuladen steht nur „Hafenviertel Nord“ da, mit derselben Kennung und Revision im Speicher.',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün; dabei behoben: Umbenennen fehlte in der Oberfläche.',
  },
  {
    caseId: 'BIB-01', scope: 'voll',
    covers: 'Sichtbare Vorschaubilder sind in wenigen Sekunden da (auch nach dem Scrollen); „Turm“ + Kategorie Befestigung + Spielphase „Mittleres Spiel“ + Größe „Mittel“: jede Karte passt zu Kategorie, Phase und Größe, der Suchbegriff grenzt wirklich ein; „Weitere 48 laden“ (Seite 2), Gebäude öffnen und „Zurück“: Suchwort, Filter, Anzahl und letzte Karte wie vorher; die kopierte Adresse in einem neuen Tab zeigt dieselben Treffer.',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün',
  },
  {
    caseId: 'BIB-03', scope: 'voll',
    covers: 'Dorfbrunnen über „＋ Ins Projekt übernehmen“ → „Zum Editor →“ steht im Projekt und ist auswählbar; Ensemble Marktdorf als Projekt ist „geometrisch konfliktfrei“, jedes Gebäude an eigener Stelle; „Bauwelten“ zeigt alle Welten; Anlage „Landleben“ mit verschobener Handwerkerzeile markiert Konflikte, die Übernahme geht erst nach Bestätigung und legt das Projekt mit allen Bauteilen an.',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün',
  },
  {
    caseId: 'PROJ-01', scope: 'voll',
    covers: 'Bauteil verschieben (Knopf und X-Feld), drehen, spiegeln; Strg+Z/Strg+Y und Rückgängig/Wiederholen stellen jeden Schritt mit genau der gespeicherten Lage wieder her; Mehrfachauswahl mit Umschalt bewegt zwei Bauteile in einem Schritt; Überschneidung wird rot gemeldet (Farbe gemessen).',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün; dabei behoben: Konflikt-Abzeichen waren in den Themen grau.',
  },
  {
    caseId: 'PROJ-02', scope: 'teil',
    covers: 'Marktdorf: Bauitems mit Treppen/Platten als Items, Filter nach Bauteil verkleinert die Liste, Rohstoffplanung zeigt Inventarplätze (Stacks) und Shulkerkisten; alle 103 angezeigten Rezeptschritte stimmen mit den Rezepten des offiziellen Minecraft-26.3-Servers überein (Station, Zutaten, Ausgabemenge, z. B. 6 Platten aus 3, 4 Treppen aus 6), mit Steinsäge und nur mit Werkbank.',
    remaining: 'Ein paar Rezepte im eigenen Spiel mit Rezeptbuch bzw. REI ansehen (nur Gefühl: die Daten stammen aus derselben server.jar).',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs && node --test tests/unit/materials/recipes.test.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün',
  },
  {
    caseId: 'PROJ-08', scope: 'voll',
    covers: 'Ensemble Burg als Projekt: alle Projektreiter nacheinander geöffnet, die Seite blieb bedienbar (längste Sperre der Seite in Chromium 412 ms, Grenze 5 s), lange Rechnungen laufen im Hintergrund mit Fortschritt.',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün',
  },
  {
    caseId: 'WERK-09', scope: 'teil',
    covers: 'Werkstatt im Browser: Mauer, Truhe mit Gegenständen auf festen Plätzen und Namen, Schild mit beiden Seiten und roter Schrift, Gemälde; Mauer gestapelt, extrudiert, alles 90° gedreht, gespeichert, in ein Projekt übernommen und als .litematic und .schem exportiert – beide Dateien tragen jede Zelle, Truhe, Schild und Gemälde (mitgedreht nach Westen). Im echten Minecraft 26.3 stellt die Exportprüfung (Litematica, WorldEdit, Vanilla) Truhen mit Plätzen, benannte Truhe mit verzaubertem Schwert (Schärfe III, Haltbarkeit II), Schilder mit beiden Seiten/Farbe/Leuchten, Gemälde und Rahmen an derselben Wand auf.',
    remaining: 'Werkstatt-Bauteil im eigenen Spiel mit Litematica aufstellen und ansehen; ein verzaubertes Schwert lässt sich in der Werkstatt nicht eintragen (nur aus einer importierten Datei).',
    command: 'node --test tests/e2e/werkstatt-abnahme.e2e.mjs && scripts/mod/test_exports_ingame.sh',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün (Werkstatt); Spiel: test_exports_ingame.sh 22/22 mit Minecraft 26.3, Litematica 0.29.1, WorldEdit 7.4.6 – die eingefügte Truhe trägt „Vorräte“ und das Schwert mit Schärfe III und Haltbarkeit II in Litematica-, WorldEdit- und Vanilla-Abzug',
  },
  {
    caseId: 'KARTE-06', scope: 'voll',
    covers: 'Gelände aus der Mod (Mod-Nachbau mit Teich und 8 Blöcke hohem Plateau): Messen mit drei Punkten nennt Luftlinie 21, zu Fuß 21, Höhe, Nether 2,6 und Fläche ≈ 54, Escape löscht; Weg über den Hang zeigt Y 64 … 72, ↑ 8 ↓ 8, größte Stufe 8; „⤳ Route übers Gelände“ umgeht Steilstufe und Teich; Ziel oben auf dem Plateau meldet „Keine Route gefunden … Stufen sind zu steil“ und lässt den Weg gerade.',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün',
  },
  {
    caseId: 'KARTE-10', scope: 'voll',
    covers: 'Zwei Geräte (PC und iPad-Größe mit Touch) im echten Team-Raum: Bauplatz am PC gesperrt, Punkt am iPad gesetzt – nach etwa 5 s hat jedes Gerät beide, die Sperre gilt auch am iPad; gleichzeitiges Umbenennen (das iPad speichert kurz ohne Netz, bevor es den Stand des PCs hat): der zuerst geteilte Name gilt, das andere Gerät sieht „gleichzeitig geändert, der Stand im Team gilt“; die am PC gespeicherte Server-Webkarte erscheint am iPad verknüpft; nichts wird heruntergeladen.',
    command: 'node --test tests/e2e/team-abnahmen.e2e.mjs (dazu test:e2e:firefox/webkit)',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün, Team-Raum per wrangler dev; dabei behoben: „zuletzt von“ zeigte die Kennung statt des Namens.',
  },
  {
    caseId: 'KARTE-12', scope: 'teil',
    covers: 'Echter Paper-Server mit dem Plugin aus dem Quellstand und dem Weltplan aus dem Team-Raum: Spieler ohne OP im gesperrten Bauplatz – Setzen, Abbauen und Eimer werden verhindert, die Chatzeile nennt den Bauplatz; außerhalb baut er normal; mit „hinweis“ geht Bauen, nur die Zeile kommt (sofort nach dem Umschalten); ein OP ist ausgenommen.',
    remaining: 'Mitspieler mit Mod sieht den gesperrten Platz grau im Hologramm und im Nether die Nether-Einträge – nur im echten Spiel (Mod-Hologramm).',
    command: 'scripts/mod/test_bridge_paper_bots.sh weltplan 1.21.11 26.1.2',
    evidence: '07.11.2026, Plugin aus dem Quellstand nach 0.27.0, Paper 1.21.11 und 26.1.2, zwei mineflayer-Spieler, wrangler dev; dabei behoben: nach dem Umschalten auf „hinweis“ kam die Zeile erst nach einer Minute.',
  },
  {
    caseId: 'TEAMBAU-30', scope: 'voll',
    covers: 'Drei Browser im echten Team-Raum (Bauleitung, Baumeisterin, Helfer): Mitbauer an „Fundament“ fast gleichzeitig von zwei Geräten – die überholte Zuweisung steht bei allen als „Überholt …“ mit „Trotzdem so übernehmen“ (nicht beim Helfer); Verantwortliche + Mitbauer bei allen, unter „Meine Aufgaben“, „Aussteigen“/„Mitbauen“ ohne Bauleitung; Sammelauftrag 51/60 verteilt, jeder sieht seinen Anteil; Lieferung gemeldet, V2 korrigiert, storniert, bei der Bauleitung neu gerechnet; im Zeitplan geht der Abschnitt mit Mitbauer schneller.',
    command: 'node --test tests/e2e/team-abnahmen.e2e.mjs (dazu test:e2e:firefox/webkit)',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün, Team-Raum per wrangler dev',
  },
  {
    caseId: 'TEAMBAU-31', scope: 'voll',
    covers: 'Zwei Browser im echten Team-Raum (Durable Objects wie im Dienst, Sicherungsalarm auf Sekunden): Zustand mit „erreichbar“, Schritten, Aufbewahrung; „Jetzt sichern“; Notiz der Mitspielerin danach; Wiederherstellen – die Notiz ist nach Sekunden wieder bei allen und im Raum, „vor einer Wiederherstellung“ steht in der Liste; Raum löschen – die Mitspielerin sieht „Der Team-Raum wurde gelöscht“; „vor dem Löschen“ zurückholen – ihr alter Link gilt wieder; automatische Sicherung erscheint; keine Datei wird heruntergeladen.',
    command: 'node --test tests/e2e/team-abnahmen.e2e.mjs (dazu test:e2e:firefox/webkit)',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün, Team-Raum per wrangler dev; dabei behoben: die Bauleitung verband sich nach dem Zurückholen erst nach einer Minute wieder.',
  },
  {
    caseId: 'GERAET-01', scope: 'teil',
    covers: 'Systemcheck nennt unter „Dieses Gerät“ Browser, System und Grafik in Klartext; das Testprotokoll mit Namen „Philipp · iPad Air (Test)“ enthält Tester, Browser, System und Build.',
    remaining: 'Auf jedem echten Gerät (iPad, Handy, PC) einmal ablesen, ob Gerät und Grafik stimmen.',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün; dabei behoben: Browser und System standen nur als roher User-Agent da.',
  },
  {
    caseId: 'GERAET-04', scope: 'teil',
    covers: 'iPad Pro 11 hoch/quer und iPhone 15 mit Touch: 3D mit einem Finger drehen, mit zwei zoomen, die Seite scrollt nicht mit; Schichtfilter-Schieber und Knöpfe mindestens 44 px; Reiterleiste: aktiver Reiter sichtbar, alle Reiter treffbar; „Spiel“-Bereiche öffnen per Tippen; nichts ragt seitlich heraus (Start, Bibliothek, Karte, Anleitung); Langdruck öffnet das Kontextmenü (touch-devices); „Bewegung reduzieren“: keine Animationen mehr.',
    remaining: 'Echte Gesten auf Philipps iPad und Handy (Safari, Systemgesten, Gefühl); der Test nutzt Zeiger-Ereignisse vom Typ touch in Container-WebKit.',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/touch-devices.e2e.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün; dabei behoben: Ebenenschieber war 110 × 20 px.',
  },
  {
    caseId: 'GERAET-06', scope: 'voll',
    covers: 'Gebäude, Reiter „Ebenen“, „Alle Ebenen“: jede Ebene als kleiner Plan; Druckansicht (A4, Druckmedien): jede Ebene und jedes Bild liegt innerhalb der Seite, Kopf da, Navigation ausgeblendet; in Chromium als PDF gedruckt mit höchstens drei Ebenen je Seite.',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün',
  },
  {
    caseId: 'SYS-01', scope: 'voll',
    covers: '„Geladene Dateien prüfen“ ohne Befund, „Datencheck starten“ → „✓ Alles in Ordnung“; Testphase → „Fehler melden“: Probebericht ausgefüllt und als Datei gespeichert – enthält Build, Browser, Grafik und Diagnose, aber keinen Projektnamen.',
    command: 'npm run test:e2e -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:firefox -- tests/e2e/planer-abnahmen.e2e.mjs && npm run test:e2e:webkit -- tests/e2e/planer-abnahmen.e2e.mjs',
    evidence: '07.11.2026, main a902c4e + Block B: Chromium, Firefox 1555 (xvfb) und WebKit 2370 im Container grün',
  },
  {
    caseId: 'BIB-15', scope: 'voll',
    covers: 'Eigene .litematic als Bauteil, „In Bibliothek einreichen“: ohne Rechtebestätigung keine Datei, sonst „beitrag_….bauplaner-beitrag.json“ und vorausgefülltes GitHub-Formular (contribution.e2e); dann `library_intake add --root` in einen frischen Checkout, Seite dort gebaut: ein frischer Browser findet „beitrag“, sieht „Bibliotheksbeitrag von Philipp“, übernimmt ihn in ein Projekt, Material öffnet, .litematic-Export trägt genau die 18 eingereichten Blöcke.',
    command: 'node --test tests/e2e/contribution.e2e.mjs && node --test scripts/library/test_contribution_live.mjs',
    evidence: '07.11.2026, main a902c4e + Block B, Chromium, git worktree',
  },
  // ── Block C (07.11.2026): Mod, Diagnose und Anbindung im echten Spiel (Fabric-26.3-Client headless, Paper 26.3, Team-Raum per wrangler dev mit Netz-Trenner)
  {
    caseId: 'MOD-01', scope: 'teil',
    covers: 'Die Seite „Spiel“ zeigt je Launcher (Modrinth App, Prism, CurseForge, Offizieller Launcher) eigene Schritte mit Dateiname, Version, Ordner mods und Fabric API, die Wahl bleibt nach Neuladen, die .jar kommt aus dem Planer (mod-download.e2e). Die gebaute .jar startet im echten Minecraft-26.3-Client (Fabric) und NeoForge-Client ohne Absturz, `/bauplaner` wird vervollständigt, J öffnet das Planmenü.',
    remaining: 'Die Schritte im eigenen Launcher von vorn bis hinten durchgehen (neues Profil, alte bauplaner-bridge-*.jar gelöscht).',
    command: 'node --test tests/e2e/mod-download.e2e.mjs && scripts/mod/test_bridge_ingame.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: mod-download.e2e (Chromium) grün; echter Minecraft-26.3-Client mit Fabric und mit NeoForge (weston/llvmpipe) startet die gebaute .jar, beide Spieltests grün',
  },
  {
    caseId: 'MOD-02', scope: 'teil',
    covers: 'Plan im echten Spiel eingeblendet: Pfeiltasten (±X/±Z), Bild↑/↓ (±Y), Ende (Drehen um 90°, viermal = Ausgang), Einfg (Spiegeln), Pos1 (Plan zum angeschauten Block) verschieben das Hologramm genau um die erwarteten Werte; nach Verlassen und neuem Betreten der Welt sind Plan, Lage, Drehung und Tastenbelegung unverändert.',
    remaining: 'Im eigenen Spiel ansehen, ob die durchscheinenden fehlenden Blöcke und die Fortschrittsanzeige rechts gut lesbar sind; Neustart des ganzen Spiels.',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'MOD-04', scope: 'teil',
    covers: 'Ein falsch herum gesetzter Stamm wird gelb (Zustand falsch), ein falscher Block rot, richtige verschwinden; Punkt (.) springt zum nächsten Fehler; Num 7 öffnet die Materialliste, `/bauplaner material` und `packliste` zählen getragene Blöcke samt Inhalt einer Shulkerkiste ab; am Ende des Abschnitts „Turm“ kommt genau eine Meldung „Abschnitt „Turm“ fertig … Weiter mit „Mauer“: /bauplaner abschnitt 2“.',
    remaining: 'Mit echtem Bauen (nicht per Befehl gesetzt) einen Abschnitt fertigstellen und „Abschnitt k/n“ mit dem Planer vergleichen.',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'MOD-06', scope: 'voll',
    covers: 'Num 6 schaltet auf eine Ebene, Num 9 / Num * wandern eine Ebene hoch/runter, der Fehlersucher bleibt in der Ebene, Num 6 weiter auf „bis Ebene“ und „alle“; Num / schaltet die Abschnitte 1 → 2 → alle durch, Fortschritt und Material gelten nur für den Abschnitt; Num - schaltet die Röntgensicht an und aus; `/bauplaner texturen` wechselt zu farbigen Kästen und zurück (Bilder abnahme-kaesten.png, roentgen.png).',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'MOD-07', scope: 'teil',
    covers: 'Platzierhilfe „an“ verhindert den falschen Block mit Erklärung, „warnen“ lässt ihn zu und zeigt „Hier gehört Stone Bricks hin“, „aus“ lässt ihn ohne Meldung zu; Num 8 auf eine offene Zelle nimmt die Steinziegel aus Platz 4 in die Hand; Kiste, Knopf und Tür im Plan lassen sich mit Planblock in der Hand bedienen; Gerüst auf geplanter Luft wird gesetzt; der richtige Block geht.',
    remaining: 'Mit Tool Switcher im eigenen Modpack: kein ungewollter Werkzeugwechsel; Treppe falsch herum im eigenen Spiel.',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'MOD-09', scope: 'teil',
    covers: 'Menütaste in den Steuerungsoptionen auf K umbelegt: K öffnet das Planmenü, J nichts mehr, options.txt hält „key.keyboard.k“ (bleibt nach Neustart); doppelt auf E belegt meldet `/bauplaner diagnose` „KONFLIKT mit …“, nach „Zurücksetzen“ keinen Konflikt mehr. Mit Philipps Modpack (REI, Iris + Complementary, Sodium, Distant Horizons, Xaero) läuft derselbe Spieltest und das Hologramm bleibt sichtbar (06.11.).',
    remaining: 'Gefühl beim Spielen mit dem eigenen Shader; Jade und Voice Chat (nicht im Modpack des Prüfstands).',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh (Modpack: BAUPLANER_MODPACK_MODS=… BAUPLANER_SHADERPACK=…)',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'MOD-10', scope: 'teil',
    covers: 'Echter Minecraft-26.3-Client mit Mod auf Paper 26.3 ohne Mod auf dem Server: Plan eingeblendet, Platzierhilfe verhindert den falschen Block (Erde) und lässt den richtigen (Bruchstein) zu, Abbauschutz greift; kein Kick, keine „illegal packet“-Zeile im Serverlog; die Platzierung steht unter dem Schlüssel des Servers in platzierung.properties.',
    remaining: 'Auf Philipps eigenem Server mit Mitspielern spielen.',
    command: 'scripts/mod/test_multiplayer_client.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric) auf Paper 26.3, Platzierhilfe-Schritt in PaperMultiplayerTest, Serverlog ohne Kick',
  },
  {
    caseId: 'MOD-17', scope: 'teil',
    covers: '`/bauplaner packliste` zieht getragene Steinziegel samt Inhalt einer Shulkerkiste ab („dabei 67“) und rechnet Stapel; `/bauplaner geruest` nennt bei einer abgerissenen Mauer keinen Fehlalarm, beim Plan 40 Blöcke in der Luft genau alle hängenden Blöcke und nach einem Stützblock unter der untersten Zelle genau den Rest – jeweils gleich der eigenen Zählung des Tests aus der Spielwelt.',
    remaining: 'Packliste auf einem Teamserver mit Lagerkisten (nennt die nächste Kiste); `/bauplaner markieren lager …` und im Planer #/karte „In den Weltplan übernehmen“ mit Rückgängig.',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'MOD-21', scope: 'teil',
    covers: 'Weltplan mit gesperrter Gruppe „Markt“ über dem Turm und offener Gruppe „Hof“ über der Mauer: der Turm gilt als gesperrt, `/bauplaner gruppe Hof` zeigt nur die Hof-Fläche, `gruppe aus Hof` blendet sie aus, `gruppe an Hof` wieder ein, `gruppe alle` zeigt alles; die Menüzeile „Gruppe“ schaltet durch; `gruppen` nennt die gesperrten Blöcke, die Packliste gilt nur für die Gruppe; im gesperrten Bereich ruht die Platzierhilfe, der Fehlersucher springt nicht hinein; der Planer bekommt die Zahl gesperrter Blöcke im Status.',
    remaining: 'Die graue Darstellung gesperrter Flächen im eigenen Spiel ansehen; Gruppe im echten Planer anlegen und senden.',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'MOD-29', scope: 'teil',
    covers: 'Tastengruppe „Build Studio“ in den Steuerungsoptionen (alle Tasten der Mod darin), Modname „LMNT — Build Studio Bridge“ in der Modliste, Menütitel und Meldungen mit „Build Studio“; Befehle, Pläne und Einstellungen gehen wie vorher.',
    remaining: 'Modliste im eigenen Launcher ansehen.',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'LIVE-06', scope: 'teil',
    covers: '`/bauplaner diagnose` legt den Bericht in bauplaner/diagnose/ ab und nennt die Datei; der Bericht nennt Mod-Version, Loader, Mods, Tasten (mit Konflikten) und Hologramm-Zustand. Nur wenn die Zwischenablage den Bericht wirklich hält, heißt es „in die Zwischenablage kopiert“, sonst „bitte die Datei anhängen“ (dabei behoben: die Mod meldete „kopiert“ auch ohne Zwischenablage).',
    remaining: 'Im eigenen Spiel den Bericht aus der Zwischenablage einfügen (der kopflose Prüfstand hat keine Zwischenablage).',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'LINK-05', scope: 'teil',
    covers: 'Planerseite gegen den Server-Ersatz (server-link.e2e): „⇪ Auf den Server legen“ von der Weltkarte und aus „Bauen“ nennt Server, Revision und Anker samt Herkunft, ohne Position der Hinweis auf /bp anker hier; „⇩ Auf dem Server aufnehmen“ zeigt Prozent und „Aufnahme von … geladen“. Echter Paper-Server: Plan mit Anker per Steuernachricht abgelegt, kaputter Plan abgewiesen, Aufnahme per Klick in Teilen geholt – gleiche Bytes wie auf dem Server, ohne /bp scan und ohne Datei.',
    remaining: 'Mit Philipps eigenem Server und dem echten Planer zusammen (Planerseite ist gegen den Ersatz geprüft, der Server mit dem Protokoll-Client).',
    command: 'node --test tests/e2e/server-link.e2e.mjs && scripts/mod/test_bridge_paper_link.sh',
    evidence: '07.11.2026: server-link.e2e (Chromium, 1400/390 px) und test_bridge_paper_link.sh (Paper 1.21.11, Plugin 0.27.1 aus dem Quellstand) grün',
  },
  {
    caseId: 'LINK-07', scope: 'teil',
    covers: 'Echter 26.3-Client, Einzelspieler ohne Plugin, Team-Raum per wrangler dev: die Mod bekommt den Raum vom Planer („Mein Spiel verbinden“), meldet „Team live über den Team-Raum“, `/bauplaner team nehmen` steht in Sekunden im Raum, die Position geht mit, die Aufnahme liegt nach `/bauplaner team aufnahme` lesbar im Raum, eine markierte Teamkiste wird beim Öffnen „laut Spiel“ gemeldet – ohne Datei und ohne Plugin.',
    remaining: '„Gerade da“ im eigenen Planer ansehen, auf einem echten Server ohne Plugin.',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'LINK-09', scope: 'teil',
    covers: 'Netz zwischen Mod und Team-Raum hart getrennt (Relais): die Mod zeigt den gemerkten Teamstand weiter („zeigt den Stand von …“, „Meldungen warten“), offline in zwei Abschnitten gebaut, Abschnitt übernommen und eine markierte Teamkiste geöffnet; Welt verlassen und neu betreten – alles noch gemerkt; Netz zurück: „gemerkte Messungen … nachgereicht“, „Meldungen warten“ auf 0, im Raum stehen beide Abschnitte, die Kiste (20 Steinziegel, 7 Stämme) und die Übernahme genau einmal, kein Ereignis doppelt. Dabei behoben: im Einzelspieler ging eine offline gemachte Übernahme beim Verlassen der Welt verloren.',
    remaining: 'Ganzes Spiel ohne Internet neu starten (Prüfstand verlässt nur die Welt); mit Plugin dabei eine Servereinstellung ändern; im Planer „⟳ Baustand holen (bester Weg)“.',
    command: 'BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh; JUnit RoomFallbackTest',
    evidence: '07.11.2026, Mod 0.27.1 aus dem Quellstand: echter Minecraft-26.3-Client (Fabric, weston/llvmpipe) mit dem gebauten Planer in Chromium, Team-Raum per wrangler dev hinter einem Netz-Trenner (scripts/mod/bridge_netcut.mjs), Abnahme-Ablauf AbnahmeScenario + bridge_block_c.mjs grün',
  },
  {
    caseId: 'LINK-13', scope: 'voll',
    covers: 'Gebauter Planer (Desktop 1400 px und Handy 390 px): in „Team“ (vor und nach dem Gründen), „Bauen“, der Seite „Spiel“ (auch „Mehr wissen“) und der Weltkarte führt kein sichtbarer Knopf oder Link außerhalb von „Notfall“ zu Teampaket, Meldecode, Serverdatei oder Aufnahme-Datei; alle „Notfall“-Abschnitte sind zugeklappt und halten aufgeklappt die Dateiwege; die Texte nennen „Team live“, „Mein Spiel verbinden“ und „Baustand“ als normalen Weg.',
    command: 'node --test tests/e2e/file-fallback.e2e.mjs',
    evidence: '07.11.2026, main nach DOC-02, gebauter Planer in Chromium (1400 und 390 px) grün',
  },
];

export function autoCheckOf(caseId: string): AutoCheck | undefined {
  return AUTO_CHECKS.find(a => a.caseId === caseId);
}
