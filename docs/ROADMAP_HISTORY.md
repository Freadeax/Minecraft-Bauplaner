# Roadmap-Änderungsverlauf

Aus [roadmap.json](roadmap.json) erzeugt. Ereignisse werden angehängt, nicht nachträglich umgeschrieben. Commitnachweise: Git-Historie der JSON-Datei; Veröffentlichung: deployment.json und Artefakt-Kindcommit.

**Ältere Ereignisse:** 293 Einträge bis 2026-11-07 sind verdichtet und vollständig in [b3f819f](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b3f819f8a68fa1bcb6de63e6b01fbba321af7357) (`docs/roadmap.json`, Prüfsumme `10c8f7419a16`).

## 2026-11-07T12:19:01.724Z · progress

**Aufgaben:** PLAN-01, ARCH-01, ARCH-02, DOC-01, STORE-02, QA-01, QA-02, QA-03, UI-01, UI-02, UX-01, OPS-02, OPS-03, PROFILE-01, NBT-01, FORMAT-01, FORMAT-02, MAT-02, MAT-04, DIFF-01, PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06, VIEW-02, BLOCK-01, BLOCK-02, GFX-01, GFX-02, GFX-03, MODEL-01, EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, UPDATE-01, LIB-02, LIB-03, WORLD-02, BUILD-05, TERRAIN-01, TERRAIN-02, TERRAIN-03, TERRAIN-04, TERRAIN-05, BUILD-06, GEN-02, MAP-01, MAP-03, MAP-04, MAP-02, GAME-02, GAME-07, GAME-08, GAME-03, WORLD-IMPORT-01, BACKUP-02, TEAM-02, TEAM-03, GAME-04, GAME-05, GAME-06, LAGER-01, OPS-04, LIB-04, ENTITY-01, LIB-05, LIB-06, BASE-01, SPLIT-01, GROSS-01, MAP-05, MAP-06, MAP-07, QA-04, GEN-03, SIZE-01, COOP-01, COOP-02, COOP-03, COOP-04, COOP-05, COOP-06, PROJ-01, GAME-09, GAME-10, GAME-11, GAME-12, COOP-07, COOP-08, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, LINK-01, LINK-02, LINK-03, LINK-04, LINK-05, LINK-06, COOP-09, COOP-10, COOP-11, PROJ-02, PROJ-03, PROJ-04, PROJ-05, LINK-07, EDIT-06, FALLBACK-01, LINK-10, LINK-11, STRUCT-01, DOC-02, CORE-04, WORLD-SHARE-01, GUIDE-01, UI-03, NAME-01

Repository übersichtlich: README als Überblick, Doku-Index, CONTRIBUTING mit Arbeitsablauf, Funktionsstand, Prüfstand, Hosting und Veröffentlichung neu; interne Arbeitsnotizen, Abstimmungsprotokoll und Archiv entfernt; Verantwortliche als Arbeitsstränge benannt; Roadmap-Historie verdichtet (293 Einträge, Prüfsumme). Prüfung: npm run check 1030/1030, Browsertests 211/212 (Handy-Navigation einzeln erneut grün).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PLAN-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Entwicklungsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen. |
| ARCH-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen. |
| ARCH-02 | 🧩 Implementiert · Abnahme offen | 6/7 | Stichprobe mit Philipps eigenen Browserdaten (Testfall GERAET-03); bei neuer DB_VERSION eine weitere gealterte Datenbank erzeugen. |
| DOC-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Aktuelle Prüf-/Main-/Live-Nachweise im nächsten sachlichen Quellblock nachführen; keine selbstreferenzielle Deploymentfolge. |
| STORE-02 | ✅ Im beschriebenen Umfang geprüft | 3/3 | CAS-/Migrationsregressionen bei Speicheränderungen fortführen; Safari/iPhone gesondert in QA-02. |
| QA-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Suite nach relevanten Änderungen wiederholen; echte Geräte in QA-02 und große Worker-Browserlatenz in PERF-01 prüfen. |
| QA-02 | 🚧 In Arbeit | 1/2 | Protokolle der Tester in docs/testing/GERAETEMATRIX.md eintragen und Befunde beheben. |
| QA-03 | ✅ Im beschriebenen Umfang geprüft | 7/7 | Bei neuen Ausfällen zuerst nach Lesen vor dem Laden (Manifest, IndexedDB, ResizeObserver, Worker-Neuberechnung) suchen. |
| UI-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Oberflächenregression bei Themen-/Layoutänderungen weiterführen; echte Geräte separat in QA-02. |
| UI-02 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Echte Geräteprüfung (Safari/iPhone, Touch) in QA-02; weitere Hauptbereiche (z. B. Karte MAP-01) als Eintrag in nav.ts anhängen. |
| UX-01 | 🚧 In Arbeit | 6/6 | Philipps Abnahme START-10..13 im Browser und auf dem iPad. Optik übernimmt „Planer-Oberfläche schön neu gestalten“. |
| OPS-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei tatsächlichem Vorfall bekannten Build neu bestätigen und Recovery regulär ohne Force vorbereiten; Livehashes danach gesondert prüfen. |
| OPS-03 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Bei künftigem temporärem Branch erneut vollständige Integration prüfen; aktuell keine Bereinigung nötig. |
| PROFILE-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Erledigt; ältere Datei in der Oberfläche in DATEI-02. |
| NBT-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Erledigt; Stichprobe in DATEI-08. |
| FORMAT-01 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Erledigt; Stichprobe mit Philipps Modpack in DATEI-08. |
| FORMAT-02 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Erledigt; Stichprobe mit Philipps Modpack in DATEI-08. |
| MAT-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme in der Testphase: Rohstoffliste eines großen Bauwerks mit gewählter Holzart und Brennstoff mit dem Spiel vergleichen. |
| MAT-04 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Erledigt; Glas/Beton/Terrakotta und Oberfläche in PROJ-14. |
| DIFF-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Erledigt; Oberfläche in BIB-02. |
| PERF-01 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Messung bei Rechenkernänderungen wiederholen; Übertragungs-/Invalidierungsarbeit in PERF-02, vollständige React-/Gerätelatenz gesondert prüfen. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Folge erledigt (06.11.): kompakte Laufzeitform als begrenzte Menge entpackter Bibliothekszellen (ARCH-02-S07); PERF-05-S08 lädt Zellen erst bei Bedarf. |
| PERF-03 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Erledigt; weitere Bundle-Arbeit läuft unter PERF-05 (O-5, gezielte Unterpfade). |
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus (S06); Firefox/Safari-Engine automatisch geprüft. |
| PERF-05 | 🧩 Implementiert · Abnahme offen | 9/9 | Weitere große Dateien (TeamClient, LiveLink, RoomClient, TeamModule) nach Merge der Mod-Arbeitsstränge teilen; inkrementelle Faltung des Teamprotokolls im Plugin beobachten. |
| PERF-06 | 🚧 In Arbeit | 3/3 | Abnahme: Safari/iPad und Firefox (Offline-Speicher); Verbindung Mod ↔ Planer einmal über https://bauplaner.pages.dev/Minecraft-Bauplaner/ im echten Spiel. |
| VIEW-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Mojang-Download im echten Browser und echte Geräte (S06); Firefox/Safari-Engine automatisch geprüft (Block 5). |
| BLOCK-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme im Spiel; PROFILE-01 kann die Berichtsfakten übernehmen. Die Katalogfehler aus der Spielprüfung behebt BLOCK-02. |
| BLOCK-02 | 🧩 Implementiert · Abnahme offen | 6/7 | S06 Stichprobe durch Philipp im eigenen Spiel (Gestaltung, Begehbarkeit); Gelände, Großprojekte und Basisplaner auf demselben Prüfstand. |
| GFX-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Nur noch echte GPU und Handy/iPad mit Schatten (S06); Firefox/Safari-Engine und Spielbildabgleich sind automatisch geprüft. |
| GFX-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Nur noch Abnahme auf echter GPU (S04); Firefox/Safari-Engine und Spielbildabgleich automatisch geprüft (Block 5). |
| GFX-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Rechner: großes Modell mit Wasser drehen und Blöcke anklicken (S04); Firefox/Safari-Engine automatisch geprüft. |
| MODEL-01 | 🧩 Implementiert · Abnahme offen | 7/8 | Echter Testdruck und Bambu Studio/Cura bei Philipp (S05-Rest); sonst abgeschlossen. |
| EDIT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Geräteprüfung (QA-02). Gruppenziehen im 3D-Bild ist mit EDIT-06 erledigt. |
| EDIT-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Spielprüfung. Picking an 3D-Blockflächen ist mit EDIT-06 erledigt. |
| EDIT-03 | 🧩 Implementiert · Abnahme offen | 5/5 | Spielprüfung der Schablonen-Zustände (Tür, Treppe, Laterne). Picking an 3D-Blockflächen ist mit EDIT-06 erledigt. |
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 7/8 | Spielprüfung gespiegelter Zustände im Planer (S07) und der Bauhilfen in der Mod (MOD-18/19); Gelände-Werkzeuge auf dem Projektgelände sind als TERRAIN-05 umgesetzt. |
| EDIT-05 | 🧩 Implementiert · Abnahme offen | 6/7 | EDIT-05-S07: Abnahme durch Philipp in der Werkstatt (Zauberstab, Stapeln, Extrudieren, Wendel) und Spielprüfung gestapelter/gedrehter Bauteile mit Ausstattung. |
| UPDATE-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Echtgeräteabnahme (QA-02); Teamreihenfolge der Updateoperationen in TEAM-02. |
| LIB-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Rückmeldung zur Bedienung der Sammlungen einholen. |
| LIB-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Vorlagen für Anlagen (Compounds) und BUILD-05 prüfen. |
| WORLD-02 | ✅ Im beschriebenen Umfang geprüft | 2/2 | Kuratierte Filter-/Treffernachweise bei Katalogänderungen fortführen; keine weitere Karte ohne tatsächliche Assets. |
| BUILD-05 | ✅ Im beschriebenen Umfang geprüft | 3/3 | Gelände-/Hanglagen und Türausrichtung zum Weg als eigene Folgeaufgabe; Echtgeräteabnahme mit QA-02. |
| TERRAIN-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit eigener Welt (S05); danach Weg mit Stufen/Kurven und Stützmauern als Blöcke als eigene Folgeaufgabe. |
| TERRAIN-02 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit eigener Welt (S05); Wegstufen und Brücken siehe TERRAIN-03. |
| TERRAIN-03 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme PROJ-19, BIB-19 und BIB-20 im Spiel (Treppen, Brücken, Wegenetz der Basis auf echtem Gelände). |
| TERRAIN-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp im Spiel (S05). |
| TERRAIN-05 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im Planer und im Spiel (PROJ-26). |
| BUILD-06 | 🧩 Implementiert · Abnahme offen | 5/5 | Echtgeräte- und Druckerabnahme mit QA-02; Philipps Spieltest mit Mod-Aufnahme (WorldAnchor) auf seinem Server. |
| GEN-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Generierte Bauten (v. a. Treppenhaus, Torhaus-Wehrgang, Hafen) im Spiel abnehmen; Treppenhaus-Anbau an Haus als Anlage erwägen. |
| MAP-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02. |
| MAP-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im echten Spiel (S06): Browserfreigabe „lokales Netzwerk“, Kopplung, Senden auf dem LMNT-Server. |
| MAP-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme durch Philipp (S06): Langdruck-Menü auf dem Touch-Gerät, Gruppen und Sperren auf dem iPad (Testfall KARTE-09). |
| MAP-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Rest von KARTE-08 auf Philipps Server-Karte (Link speichern, Sets ansehen, Markerdatei laden). |
| GAME-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp testet die aktuelle .jar auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md). |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 10/11 | Philipp prüft 0.19.0 im echten Spiel: gesperrter Bauplatz grau, Hologramm nur in einer Gruppe (Testfall MOD-21); danach Stufe 7. |
| GAME-08 | 🧩 Implementiert · Abnahme offen | 5/5 | Philipp prüft Protokoll 3 im echten Spiel (TESTPLAN MOD-17); Forge und Paper ohne Live-Verbindung. |
| GAME-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht. |
| WORLD-IMPORT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Mit einer Kopie von Philipps eigener 26.3-Welt (Modpack) einen Ausschnitt übernehmen und ein platziertes Projekt prüfen. |
| BACKUP-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02), besonders Safari-Downloads; Rückmeldung zur Erinnerungsschwelle (7 Tage) einholen. |
| TEAM-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme TEAMBAU-29 mit Mitspielern im echten Raum (zwei Geräte übernehmen gleichzeitig denselben Abschnitt). |
| TEAM-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-30 durch Philipp; Plugin-Faltung kommt mit der nächsten Plugin-Version. |
| GAME-04 | 🚧 In Arbeit | 3/4 | Abnahme auf Philipps eigenem Paper-Server (GAME-04-S04). |
| GAME-05 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme NeoForge über einen echten Launcher (Testphase). Forge 26.3 ist nach Philipps Versionsentscheidung (04.11.: neueste Version und Fabric 26.3, NeoForge mit) als GAME-13 zurückgestellt. |
| GAME-06 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LINK-14 auf Philipps Server mit echten Spielern. |
| LAGER-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf dem Paper-Server (Arbeitsstrang „Server-Plugin mit geprüften Lagerkisten“). |
| OPS-04 | 🧩 Implementiert · Abnahme offen | 4/4 | Abnahme TEAMBAU-31 mit zwei Geräten (sichern, wiederherstellen, löschen und zurückholen). |
| LIB-04 | 🧩 Implementiert · Abnahme offen | 4/4 | Weitere Ensembles und Tipps nach Spielrückmeldung; Redstone-Bauten im Spiel abnehmen. |
| ENTITY-01 | ✅ Im beschriebenen Umfang geprüft | 6/6 | Erledigt; Stichprobe in DATEI-08. |
| LIB-05 | 🧩 Implementiert · Abnahme offen | 7/8 | LIB-05-S08: Abnahme neuer Gebäude im Spiel durch Philipp. |
| LIB-06 | 🧩 Implementiert · Abnahme offen | 5/7 | Abnahme durch Philipp (S06) und erster echter Beitrag (S07). |
| BASE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06, BIB-10, BIB-19, BIB-20); Küstenlinie, Wegstufen und Brücken sind über TERRAIN-03-S06/S08 umgesetzt. |
| SPLIT-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Rest von BIB-11 mit einer eigenen Basis aus Philipps Welt. Bekannt: Brücke nimmt das Wasser darunter mit, Bibliotheksgebäude ohne Funktion. |
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S06 BIB-13, BIB-21, BIB-22). |
| MAP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); denkbar: gedrehte Projektlagen auf der Weltkarte, damit gedrehte Hologramme übernommen werden können. |
| MAP-06 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag). |
| MAP-07 | 🧩 Implementiert · Abnahme offen | 3/4 | Rest von KARTE-07 im eigenen Spiel (drehen, senden, übernehmen, F3). Server-Plugin könnte Pläne gedreht ablegen. |
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Arbeitsstränge gemerged sind und die Mod mit diagnose veröffentlicht ist. |
| GEN-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Philipp baut das Kolosseum im Spiel nach (BIB-14, mit Statuen und Hypogäum-Treppen). |
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Rest von MOD-11 im eigenen Spiel (Bildrate auf echter Grafikkarte). Folgepunkt Leistung: Werkstatt, Projekt anlegen, Export und Senden blockieren bei 1,5 Mio. Blöcken die Seite 4–10 s (in den Hintergrundrechner verlagern); Mod-Zahlen mit Tausenderpunkt. |
| COOP-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05). |
| COOP-02 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Regressionen bei Plugin-Änderungen mit scripts/mod/test_multiplayer.sh. |
| COOP-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore. |
| COOP-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung in COOP-05 (geprüfte Lagerkisten, docs/architecture/LAGERKISTEN.md). |
| COOP-05 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme LAGER-01…09 und LAGER-11 auf Philipps Server. |
| COOP-06 | 🧩 Implementiert · Abnahme offen | 4/5 | Plugin-Faltung der neuen Arten (Plugin-Arbeitsstrang); Abnahme durch Philipp mit Mitspielern. |
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind. |
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |
| GAME-11 | 🚧 In Arbeit | 2/4 | Fabric 26.4 ist vorbereitet (Snapshot, kein Release). Erscheint 26.4: Versionen in fabric-26.4/gradle.properties auf das Release setzen, Spieltest BAUPLANER_MC=26.4, dann #/mod und Modrinth je Version (S03); NeoForge 26.4 sobald NeoForge Builds hat. |
| GAME-12 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme MOD-25 bis MOD-28 im Spiel. |
| COOP-07 | 🧩 Implementiert · Abnahme offen | 6/7 | Spieltest TEAMBAU-25 mit Mitspielern (Philipp); Steuerkanal und Kopplung ohne Befehl umgesetzt (LINK-05). |
| COOP-08 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LAGER-10 mit einer echten Farm; Ertragsbuch in TEAMBAU-28. |
| PROD-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-12; später Erträge aus geprüften Lagerkisten (COOP-05) ins Ertragsbuch. |
| PROD-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-13. |
| PROD-03 | 🧩 Implementiert · Abnahme offen | 4/4 | Abnahme PROJ-12/13; Ofenstraße im Spiel prüfen (Trichterwege der Module). |
| PROD-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin. |
| PROD-05 | 🧩 Implementiert · Abnahme offen | 6/6 | Test im Spiel: Ertragskiste mit Farm verknüpfen, Rate im Reiter Produktion prüfen. |
| LINK-01 | ✅ Im beschriebenen Umfang geprüft | 4/4 | Regressionen mit test_bridge_paper_link.sh und test_multiplayer.sh. |
| LINK-02 | 🧩 Implementiert · Abnahme offen | 4/4 | Abnahme LINK-02 und LINK-11. |
| LINK-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LIVE-01 in Philipps Modpack. |
| LINK-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp. |
| LINK-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Abnahme vom iPad (Testplan LINK-04). |
| LINK-06 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme durch Philipp (Testplan LINK-05, LINK-06; Paper-Plugin 0.13.0 auf dem Server). |
| COOP-09 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit Mitspielern (TEAMBAU-25). |
| COOP-10 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit Mitspielern ohne Plugin (TEAMBAU-27, TEAMBAU-25). |
| COOP-11 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Arbeitsstrang „Mod, Server und Client mit Fallbacks ausbauen“). |
| PROJ-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05, PROJ-16…18). |
| PROJ-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-20 durch Philipp. |
| PROJ-04 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-21 durch Philipp. |
| PROJ-05 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-23 durch Philipp. |
| LINK-07 | 🚧 In Arbeit | 5/6 | Team-Arbeitsstrang deployt den Raum (Aufnahmen, Positionen); Modrinth 0.15.0; Abnahme LINK-07/LINK-08 durch Philipp. |
| EDIT-06 | 🧩 Implementiert · Abnahme offen | 4/5 | EDIT-06-S05: Philipp prüft das Bauen im 3D-Bild auf PC und iPad (WERK-08) und lädt eine Truhe/ein Schild mit Inhalt im Spiel (WERK-09). |
| FALLBACK-01 | 🚧 In Arbeit | 4/5 | Spieltest Mod 0.16.0, Release über den Modrinth-Arbeitsstrang, Abnahme LINK-09 durch Philipp. |
| LINK-10 | 🧩 Implementiert · Abnahme offen | 6/6 | Team-Raum mit bauplaner.pages.dev ausrollen (Karte), Release 0.17.2 über den Modrinth-Arbeitsstrang, Abnahme LINK-10. |
| LINK-11 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme LINK-12 und LINK-13 durch Philipp auf seinem Server; Weltplan/Karten im eigene Arbeitsstränge. |
| STRUCT-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Durchsicht der Ordnerkarte durch Philipp; parallele Arbeitsstränge ziehen neue Dateien mit dem Codemod nach. |
| DOC-02 | 🧩 Implementiert · Abnahme offen | 4/4 | Durchsicht von README und Doku-Index durch Philipp. |
| CORE-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme CORE-04-S05 durch Philipp. |
| WORLD-SHARE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme KARTE-10..12 im Spiel und auf der Server-Karte. |
| GUIDE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (START-08/09); Begriffe mit „Bedienung des Planers vereinfachen“ (Reiter-Kurzsätze) und UI-03 abgleichen. |
| UI-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme START-20/21 durch Philipp am iPad; gruppierte Projektreiter aus „Bedienung vereinfachen“ und Anleitung optisch mitziehen; Werte an das Mod-Menü weitergeben. |
| NAME-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp: Seite und Mod 0.24.0 im Spiel ansehen (Tastengruppe „Build Studio“, Menütitel). |

**Geänderte Dateien:**

- `AGENTS.md`
- `CONTRIBUTING.md`
- `README.md`
- `SECURITY.md`
- `apps/web/src/testing/testplan.ts`
- `docs/COMMUNICATION.md`
- `docs/README.md`
- `docs/REQUIREMENTS.md`
- `docs/REVIEW.md`
- `docs/STATUS.md`
- `docs/STRUKTUR.md`
- `docs/TESTING.md`
- `docs/architecture/betrieb/HOSTING.md`
- `docs/architecture/betrieb/TESTPHASE.md`
- `docs/architecture/bibliothek/CONTRIBUTIONS.md`
- `docs/architecture/bibliothek/GENERATORS.md`
- `docs/architecture/bibliothek/GROSSPROJEKTE.md`
- `docs/architecture/kern/DECISIONS.md`
- `docs/architecture/kern/PERFORMANCE_AUDIT.md`
- `docs/architecture/kern/PROJECT_BROWSER_BENCHMARK.md`
- `docs/architecture/kern/SIZE_LIMITS.md`
- `docs/architecture/planer/PRODUCTION.md`
- `docs/architecture/team/AUTO_LINK.md`
- `docs/architecture/team/FALLBACKS.md`
- `docs/architecture/team/LIVE_LINK.md`
- `docs/architecture/team/TEAMBAU.md`
- `docs/architecture/team/TEAM_LIVE.md`
- `docs/archiv/BLOCKS.md`
- `docs/archiv/IMPLEMENTATION_PLAN.md`
- `docs/archiv/NOVEMBER_EXPANSION.md`
- `docs/archiv/ROADMAP_LEGACY.md`
- `docs/archiv/STATUS_HISTORY.md`
- `docs/operations/GITHUB_CONNECTOR_RUNBOOK.md`
- `docs/operations/MAIN_ONLY_BRANCHES.md`
- `docs/operations/PAGES_RESTORE_PROBE.md`
- `docs/operations/VEROEFFENTLICHUNG.md`
- `docs/project/CODEX_PROMPT.md`
- `docs/project/CODEX_SETUP.md`
- `docs/project/GPT_PROJECT_INSTRUCTIONS.md`
- `docs/project/PLANER_VERGLEICH.md`
- `docs/testing/GERAETEMATRIX.md`
- `docs/testing/TESTPLAN.md`
- `package.json`
- `scripts/checks/check_docs.py`
- `scripts/dev/setup.mjs`
- `scripts/roadmap/roadmap.mjs`
- `tests/e2e/server-link.e2e.mjs`
- `tests/unit/tooling/main-pages.test.mjs`
- `tests/unit/tooling/roadmap.test.mjs`

## 2026-11-07T12:31:42.554Z · progress

**Aufgaben:** PERF-06, UX-01, LINK-07, FALLBACK-01, TEAM-03, GAME-09, GAME-11, QA-04, GAME-06

Inaktive Threads Block A: veraltete Roadmap-Stände bereinigt, offene Pakete auf lebende Threads, PERF-06 über GERAET-03 mit Offline-Nachweis; Team live verliert beim Speichern einer Raum-Antwort keine lokalen Schritte mehr (team.trust kam manchmal nie an). check grün, Browser 212/212.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PERF-06 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme GERAET-03 (Safari/iPad echtes Gerät, Mod über die Cloudflare-Adresse im eigenen Spiel). Browserteil in Chromium, Firefox und WebKit automatisch geprüft (offline.e2e, 07.11. 6/6 Läufe grün). |
| UX-01 | 🧩 Implementiert · Abnahme offen | 6/6 | Abnahme START-10/11 im Browser und START-12 auf dem iPad (Philipp); simple-ui.e2e in drei Engines grün. |
| LINK-07 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme LINK-07 automatisieren (Block C), Rest im eigenen Spiel durch Philipp. |
| FALLBACK-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme LINK-09 mit getrenntem Netz automatisieren (Block C). |
| TEAM-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Plugin-Faltung der Mitbauer ist seit Plugin 0.25.0 ausgeliefert. Offen: Mod zeigt Mitbauer je Abschnitt (Block D), Abnahme TEAMBAU-30 (Block B). |
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth prüft das Projekt weiter (Status processing, am 07.11.2026 nachgesehen); alle Versionen bis 0.26.0, Texte, Galerie und Offenlegungen sind aktuell (modrinth_publish.mjs plan). Kein Handlungsbedarf außer Abwarten. |
| GAME-11 | 🚧 In Arbeit | 2/4 | 26.4 ist am 07.11.2026 noch Snapshot 7 (piston-meta). Bei Erscheinen: fabric-26.4/gradle.properties auf das Release setzen, Spieltest BAUPLANER_MC=26.4, #/mod und Modrinth je Version. |
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Arbeitsstränge gemerged sind und die Mod mit diagnose veröffentlicht ist. Diagnose und Fehlerbehebung der offenen Fälle übernehmen ab 07.11. die Threads „Planer-Abnahmen ohne Nachweis automatisieren“ und „Mod-Abnahmen im Spiel automatisieren“. |
| GAME-06 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme LINK-14 auf Philipps Server mit echten Spielern. |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/ProjectView.tsx`
- `docs/TESTING.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/team-room.e2e.mjs`

## 2026-11-07T12:35:25.144Z · progress

**Aufgaben:** ARCH-02, QA-02, MAT-02, MAT-03, PERF-02, PERF-04, PERF-05, VIEW-01, VIEW-02, BLOCK-01, BLOCK-02, GFX-01, GFX-02, GFX-03, MODEL-01, EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, UPDATE-01, LIB-02, LIB-03, TERRAIN-03, TERRAIN-04, TERRAIN-05, BUILD-06, GEN-02, MAP-01, MAP-04, MAP-02, GAME-02, GAME-07, GAME-08, GAME-03, BACKUP-02, TEAM-02, GAME-04, GAME-05, LAGER-01, OPS-04, LIB-04, LIB-05, LIB-06, BASE-01, SPLIT-01, GROSS-01, MAP-05, MAP-06, MAP-07, GEN-03, SIZE-01, COOP-01, COOP-03, COOP-04, COOP-05, COOP-06, PROJ-01, GAME-10, GAME-12, COOP-07, COOP-08, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, LINK-02, LINK-03, LINK-04, LINK-05, LINK-06, COOP-09, COOP-10, COOP-11, PROJ-02, PROJ-03, PROJ-04, PROJ-05, EDIT-06, LINK-10, LINK-11, STRUCT-01, CORE-04, WORLD-SHARE-01, GUIDE-01, UI-03, NAME-01

Inaktive Threads Block A: Abnahme-Verantwortung offener Pakete von beendeten Threads auf lebende Threads umgestellt (Blöcke B/C/D, sonst „Große Testphase vorbereiten und betreuen“).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| ARCH-02 | 🧩 Implementiert · Abnahme offen | 6/7 | Stichprobe mit Philipps eigenen Browserdaten (Testfall GERAET-03); bei neuer DB_VERSION eine weitere gealterte Datenbank erzeugen. |
| QA-02 | 🚧 In Arbeit | 1/2 | Protokolle der Tester in docs/testing/GERAETEMATRIX.md eintragen und Befunde beheben. |
| MAT-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme in der Testphase: Rohstoffliste eines großen Bauwerks mit gewählter Holzart und Brennstoff mit dem Spiel vergleichen. |
| MAT-03 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme PROJ-14. |
| PERF-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Folge erledigt (06.11.): kompakte Laufzeitform als begrenzte Menge entpackter Bibliothekszellen (ARCH-02-S07); PERF-05-S08 lädt Zellen erst bei Bedarf. |
| PERF-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme auf Philipps Rechner mit Olympus (S06); Firefox/Safari-Engine automatisch geprüft. |
| PERF-05 | 🧩 Implementiert · Abnahme offen | 9/9 | Weitere große Dateien (TeamClient, LiveLink, RoomClient, TeamModule) nach Merge der Mod-Arbeitsstränge teilen; inkrementelle Faltung des Teamprotokolls im Plugin beobachten. |
| VIEW-01 | 🧩 Implementiert · Abnahme offen | 1/2 | Aktuelle GPU-/Touch-Prüfung mit negativen Koordinaten und allen Schnittachsen. |
| VIEW-02 | 🧩 Implementiert · Abnahme offen | 5/6 | Mojang-Download im echten Browser und echte Geräte (S06); Firefox/Safari-Engine automatisch geprüft (Block 5). |
| BLOCK-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme im Spiel; PROFILE-01 kann die Berichtsfakten übernehmen. Die Katalogfehler aus der Spielprüfung behebt BLOCK-02. |
| BLOCK-02 | 🧩 Implementiert · Abnahme offen | 6/7 | S06 Stichprobe durch Philipp im eigenen Spiel (Gestaltung, Begehbarkeit); Gelände, Großprojekte und Basisplaner auf demselben Prüfstand. |
| GFX-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Nur noch echte GPU und Handy/iPad mit Schatten (S06); Firefox/Safari-Engine und Spielbildabgleich sind automatisch geprüft. |
| GFX-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Nur noch Abnahme auf echter GPU (S04); Firefox/Safari-Engine und Spielbildabgleich automatisch geprüft (Block 5). |
| GFX-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme auf Philipps Rechner: großes Modell mit Wasser drehen und Blöcke anklicken (S04); Firefox/Safari-Engine automatisch geprüft. |
| MODEL-01 | 🧩 Implementiert · Abnahme offen | 7/8 | Echter Testdruck und Bambu Studio/Cura bei Philipp (S05-Rest); sonst abgeschlossen. |
| EDIT-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Geräteprüfung (QA-02). Gruppenziehen im 3D-Bild ist mit EDIT-06 erledigt. |
| EDIT-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Spielprüfung. Picking an 3D-Blockflächen ist mit EDIT-06 erledigt. |
| EDIT-03 | 🧩 Implementiert · Abnahme offen | 5/5 | Spielprüfung der Schablonen-Zustände (Tür, Treppe, Laterne). Picking an 3D-Blockflächen ist mit EDIT-06 erledigt. |
| EDIT-04 | 🧩 Implementiert · Abnahme offen | 7/8 | Spielprüfung gespiegelter Zustände im Planer (S07) und der Bauhilfen in der Mod (MOD-18/19); Gelände-Werkzeuge auf dem Projektgelände sind als TERRAIN-05 umgesetzt. |
| EDIT-05 | 🧩 Implementiert · Abnahme offen | 6/7 | EDIT-05-S07: Abnahme durch Philipp in der Werkstatt (Zauberstab, Stapeln, Extrudieren, Wendel) und Spielprüfung gestapelter/gedrehter Bauteile mit Ausstattung. |
| UPDATE-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Echtgeräteabnahme (QA-02); Teamreihenfolge der Updateoperationen in TEAM-02. |
| LIB-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Rückmeldung zur Bedienung der Sammlungen einholen. |
| LIB-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02); Vorlagen für Anlagen (Compounds) und BUILD-05 prüfen. |
| TERRAIN-03 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme PROJ-19, BIB-19 und BIB-20 im Spiel (Treppen, Brücken, Wegenetz der Basis auf echtem Gelände). |
| TERRAIN-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp im Spiel (S05). |
| TERRAIN-05 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp im Planer und im Spiel (PROJ-26). |
| BUILD-06 | 🧩 Implementiert · Abnahme offen | 5/5 | Echtgeräte- und Druckerabnahme mit QA-02; Philipps Spieltest mit Mod-Aufnahme (WorldAnchor) auf seinem Server. |
| GEN-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Generierte Bauten (v. a. Treppenhaus, Torhaus-Wehrgang, Hafen) im Spiel abnehmen; Treppenhaus-Anbau an Haus als Anlage erwägen. |
| MAP-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02. |
| MAP-04 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme durch Philipp (S06): Langdruck-Menü auf dem Touch-Gerät, Gruppen und Sperren auf dem iPad (Testfall KARTE-09). |
| MAP-02 | 🧩 Implementiert · Abnahme offen | 3/3 | Rest von KARTE-08 auf Philipps Server-Karte (Link speichern, Sets ansehen, Markerdatei laden). |
| GAME-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Philipp testet die aktuelle .jar auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md). |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 10/11 | Philipp prüft 0.19.0 im echten Spiel: gesperrter Bauplatz grau, Hologramm nur in einer Gruppe (Testfall MOD-21); danach Stufe 7. |
| GAME-08 | 🧩 Implementiert · Abnahme offen | 5/5 | Philipp prüft Protokoll 3 im echten Spiel (TESTPLAN MOD-17); Forge und Paper ohne Live-Verbindung. |
| GAME-03 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht. |
| BACKUP-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf echten Geräten (QA-02), besonders Safari-Downloads; Rückmeldung zur Erinnerungsschwelle (7 Tage) einholen. |
| TEAM-02 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme TEAMBAU-29 mit Mitspielern im echten Raum (zwei Geräte übernehmen gleichzeitig denselben Abschnitt). |
| GAME-04 | 🚧 In Arbeit | 3/4 | Abnahme auf Philipps eigenem Paper-Server (GAME-04-S04). |
| GAME-05 | 🧩 Implementiert · Abnahme offen | 3/3 | Abnahme NeoForge über einen echten Launcher (Testphase). Forge 26.3 ist nach Philipps Versionsentscheidung (04.11.: neueste Version und Fabric 26.3, NeoForge mit) als GAME-13 zurückgestellt. |
| LAGER-01 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme auf dem Paper-Server (Arbeitsstrang „Server-Plugin mit geprüften Lagerkisten“). |
| OPS-04 | 🧩 Implementiert · Abnahme offen | 4/4 | Abnahme TEAMBAU-31 mit zwei Geräten (sichern, wiederherstellen, löschen und zurückholen). |
| LIB-04 | 🧩 Implementiert · Abnahme offen | 4/4 | Weitere Ensembles und Tipps nach Spielrückmeldung; Redstone-Bauten im Spiel abnehmen. |
| LIB-05 | 🧩 Implementiert · Abnahme offen | 7/8 | LIB-05-S08: Abnahme neuer Gebäude im Spiel durch Philipp. |
| LIB-06 | 🧩 Implementiert · Abnahme offen | 5/7 | Abnahme durch Philipp (S06) und erster echter Beitrag (S07). |
| BASE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06, BIB-10, BIB-19, BIB-20); Küstenlinie, Wegstufen und Brücken sind über TERRAIN-03-S06/S08 umgesetzt. |
| SPLIT-01 | 🧩 Implementiert · Abnahme offen | 6/7 | Rest von BIB-11 mit einer eigenen Basis aus Philipps Welt. Bekannt: Brücke nimmt das Wasser darunter mit, Bibliotheksgebäude ohne Funktion. |
| GROSS-01 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S06 BIB-13, BIB-21, BIB-22). |
| MAP-05 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); denkbar: gedrehte Projektlagen auf der Weltkarte, damit gedrehte Hologramme übernommen werden können. |
| MAP-06 | 🧩 Implementiert · Abnahme offen | 7/8 | Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag). |
| MAP-07 | 🧩 Implementiert · Abnahme offen | 3/4 | Rest von KARTE-07 im eigenen Spiel (drehen, senden, übernehmen, F3). Server-Plugin könnte Pläne gedreht ablegen. |
| GEN-03 | 🧩 Implementiert · Abnahme offen | 5/6 | Philipp baut das Kolosseum im Spiel nach (BIB-14, mit Statuen und Hypogäum-Treppen). |
| SIZE-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Rest von MOD-11 im eigenen Spiel (Bildrate auf echter Grafikkarte). Folgepunkt Leistung: Werkstatt, Projekt anlegen, Export und Senden blockieren bei 1,5 Mio. Blöcken die Seite 4–10 s (in den Hintergrundrechner verlagern); Mod-Zahlen mit Tausenderpunkt. |
| COOP-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05). |
| COOP-03 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore. |
| COOP-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung in COOP-05 (geprüfte Lagerkisten, docs/architecture/LAGERKISTEN.md). |
| COOP-05 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme LAGER-01…09 und LAGER-11 auf Philipps Server. |
| COOP-06 | 🧩 Implementiert · Abnahme offen | 4/5 | Plugin-Faltung der neuen Arten (Plugin-Arbeitsstrang); Abnahme durch Philipp mit Mitspielern. |
| PROJ-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel. |
| GAME-10 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme MOD-16 auf Philipps Server mit Paper-Plugin. |
| GAME-12 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme MOD-25 bis MOD-28 im Spiel. |
| COOP-07 | 🧩 Implementiert · Abnahme offen | 6/7 | Spieltest TEAMBAU-25 mit Mitspielern (Philipp); Steuerkanal und Kopplung ohne Befehl umgesetzt (LINK-05). |
| COOP-08 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LAGER-10 mit einer echten Farm; Ertragsbuch in TEAMBAU-28. |
| PROD-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-12; später Erträge aus geprüften Lagerkisten (COOP-05) ins Ertragsbuch. |
| PROD-02 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-13. |
| PROD-03 | 🧩 Implementiert · Abnahme offen | 4/4 | Abnahme PROJ-12/13; Ofenstraße im Spiel prüfen (Trichterwege der Module). |
| PROD-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin. |
| PROD-05 | 🧩 Implementiert · Abnahme offen | 6/6 | Test im Spiel: Ertragskiste mit Farm verknüpfen, Rate im Reiter Produktion prüfen. |
| LINK-02 | 🧩 Implementiert · Abnahme offen | 4/4 | Abnahme LINK-02 und LINK-11. |
| LINK-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme LIVE-01 in Philipps Modpack. |
| LINK-04 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp. |
| LINK-05 | 🧩 Implementiert · Abnahme offen | 5/5 | Abnahme vom iPad (Testplan LINK-04). |
| LINK-06 | 🧩 Implementiert · Abnahme offen | 2/2 | Abnahme durch Philipp (Testplan LINK-05, LINK-06; Paper-Plugin 0.13.0 auf dem Server). |
| COOP-09 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme mit Mitspielern (TEAMBAU-25). |
| COOP-10 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme mit Mitspielern ohne Plugin (TEAMBAU-27, TEAMBAU-25). |
| COOP-11 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Arbeitsstrang „Mod, Server und Client mit Fallbacks ausbauen“). |
| PROJ-02 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (S05, PROJ-16…18). |
| PROJ-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme PROJ-20 durch Philipp. |
| PROJ-04 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-21 durch Philipp. |
| PROJ-05 | 🧩 Implementiert · Abnahme offen | 2/3 | Abnahme PROJ-23 durch Philipp. |
| EDIT-06 | 🧩 Implementiert · Abnahme offen | 4/5 | EDIT-06-S05: Philipp prüft das Bauen im 3D-Bild auf PC und iPad (WERK-08) und lädt eine Truhe/ein Schild mit Inhalt im Spiel (WERK-09). |
| LINK-10 | 🧩 Implementiert · Abnahme offen | 6/6 | Team-Raum mit bauplaner.pages.dev ausrollen (Karte), Release 0.17.2 über den Modrinth-Arbeitsstrang, Abnahme LINK-10. |
| LINK-11 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme LINK-12 und LINK-13 durch Philipp auf seinem Server; Weltplan/Karten im eigene Arbeitsstränge. |
| STRUCT-01 | 🧩 Implementiert · Abnahme offen | 4/4 | Durchsicht der Ordnerkarte durch Philipp; parallele Arbeitsstränge ziehen neue Dateien mit dem Codemod nach. |
| CORE-04 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme CORE-04-S05 durch Philipp. |
| WORLD-SHARE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme KARTE-10..12 im Spiel und auf der Server-Karte. |
| GUIDE-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme durch Philipp (START-08/09); Begriffe mit „Bedienung des Planers vereinfachen“ (Reiter-Kurzsätze) und UI-03 abgleichen. |
| UI-03 | 🧩 Implementiert · Abnahme offen | 4/5 | Abnahme START-20/21 durch Philipp am iPad; gruppierte Projektreiter aus „Bedienung vereinfachen“ und Anleitung optisch mitziehen; Werte an das Mod-Menü weitergeben. |
| NAME-01 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme durch Philipp: Seite und Mod 0.24.0 im Spiel ansehen (Tastengruppe „Build Studio“, Menütitel). |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/ProjectView.tsx`
- `docs/TESTING.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/team-room.e2e.mjs`

## 2026-11-07T12:53:56.832Z · progress

**Aufgaben:** TEAM-03

TEAM-03-S04: Mitbauer in Mod und Hologramm (Mod/Plugin 0.27.0) – crew im Planer-, Plugin- und Team-Raum-Stand, eigener Rahmen je Mitbauer, Teamanzeige/Abschnittsliste/Übersicht mit allen Beteiligten, /bauplaner team mitbauen|aussteigen, /bp mitbauen|aussteigen. Geprüft: RoomCrewTest, team-link.test, Spieltest Fabric und NeoForge 26.3, Paper-Teamtest 1.21.11/26.3. Offen: Abnahme TEAMBAU-30.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TEAM-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Abnahme TEAMBAU-30 (Block B / Philipp); Mitbauer jetzt auch in Mod und Hologramm sichtbar (Mod 0.27.0). |

**Geänderte Dateien:**

- `apps/web/src/views/mod/modCommands.json`
- `apps/web/src/views/mod/releases.json`
- `docs/architecture/team/TEAMBAU.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.27.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.27.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.27.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalogEn.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandWords.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomState.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamColors.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamOutbox.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamPlan.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamState.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomCrewTest.java`
- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`
- `mods/bauplaner-bridge/modrinth/gallery/15-co-builders.png`
- `mods/bauplaner-bridge/modrinth/project.json`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamChannel.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`
- `mods/bauplaner-bridge/paper/src/main/resources/plugin.yml`
- `packages/domain/src/team/teamLink.ts`
- `scripts/mod/bridge_gametest.mjs`
- `tests/unit/team/team-link.test.mjs`

## 2026-11-07T13:30:53.193Z · progress

**Aufgaben:** GAME-09

0.27.0 auf Modrinth (Fabric, NeoForge, Paper) mit Galeriebild Mitbauer

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth prüft das Projekt weiter (Status processing, am 07.11.2026 nachgesehen); alle Versionen bis 0.26.0, Texte, Galerie und Offenlegungen sind aktuell (modrinth_publish.mjs plan). Kein Handlungsbedarf außer Abwarten. |

## 2026-11-07T13:38:50.330Z · progress

**Aufgaben:** QA-04, QA-02

Block B (inaktive Threads): 17 Testfälle automatisch abgenommen – planer-abnahmen, team-abnahmen (echter Team-Raum, 2–3 Browser), werkstatt-abnahme in Chromium/Firefox/WebKit, BIB-15 bis in den Export (git worktree), KARTE-12 mit Bot-Spielern auf Paper 1.21.11/26.1.2, verzaubertes Schwert in der Exportprüfung im echten 26.3. Behoben: Projekt umbenennen, Gerät im Systemcheck, rotes Konflikt-Abzeichen, Ebenenschieber für Finger, Wiederverbinden nach Zurückholen des Team-Raums, Name statt Kennung im Weltplan, Plugin-Hinweis nach Umschalten. Grenzen: echte Geräte, REI, Mod-Hologramm.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Arbeitsstränge gemerged sind und die Mod mit diagnose veröffentlicht ist. Diagnose und Fehlerbehebung der offenen Fälle übernehmen ab 07.11. die Threads „Planer-Abnahmen ohne Nachweis automatisieren“ und „Mod-Abnahmen im Spiel automatisieren“. |
| QA-02 | 🚧 In Arbeit | 1/2 | Protokolle der Tester in docs/testing/GERAETEMATRIX.md eintragen und Befunde beheben. |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `docs/testing/TESTPLAN.md`

## 2026-11-07T13:59:37.996Z · progress

**Aufgaben:** QA-04

Block B Nachtrag: Dateizuordnung der Abnahme-Prüfungen (planer-abnahmen, team-abnahmen, werkstatt-abnahme, team-backup, Mod-Simulator, Team-Raum-Starter, Paper-Bots weltplan, Exportprüfung) nach dem Umzug auf main.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Arbeitsstränge gemerged sind und die Mod mit diagnose veröffentlicht ist. Diagnose und Fehlerbehebung der offenen Fälle übernehmen ab 07.11. die Threads „Planer-Abnahmen ohne Nachweis automatisieren“ und „Mod-Abnahmen im Spiel automatisieren“. |

**Geänderte Dateien:**

- `apps/web/src/app/diagnostics.ts`
- `apps/web/src/styles/shell.css`
- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/theme/design.css`
- `apps/web/src/views/SystemView.tsx`
- `apps/web/src/views/map/useWorldShare.ts`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/team/TeamBackup.tsx`
- `apps/web/src/views/project/team/roomClient.ts`
- `docs/TESTING.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/WorldModule.java`
- `scripts/library/test_contribution_live.mjs`
- `scripts/mod/bridge_paperbots.mjs`
- `scripts/mod/export_check.mjs`
- `scripts/mod/test_bridge_paper_bots.sh`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/planer-abnahmen.e2e.mjs`
- `tests/e2e/start.mjs`
- `tests/e2e/team-abnahmen.e2e.mjs`
- `tests/e2e/team-backup.e2e.mjs`
- `tests/e2e/teamRoomDev.mjs`
- `tests/e2e/werkstatt-abnahme.e2e.mjs`

## 2026-11-07T14:07:04.677Z · progress

**Aufgaben:** GAME-09

Changelog: Abschnitt Unreleased mit Plugin-Fix Sperrhinweis für die nächste Version

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth prüft das Projekt weiter (Status processing, am 07.11.2026 nachgesehen); alle Versionen bis 0.26.0, Texte, Galerie und Offenlegungen sind aktuell (modrinth_publish.mjs plan). Kein Handlungsbedarf außer Abwarten. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/CHANGELOG.md`

## 2026-11-07T14:44:36.135Z · progress

**Aufgaben:** QA-04, FALLBACK-01, GAME-07, LINK-07, GAME-09

Mod-/Spiel-Abnahmen automatisiert: Abnahme-Ablauf im echten 26.3-Client, Netzabbruch zum Team-Raum, Platzierhilfe auf Paper 26.3, Dateiwege nur als Notfall; Mod/Plugin 0.27.1 behebt verlorene Offline-Übernahmen im Einzelspieler und eine falsche Zwischenablage-Meldung und enthält den Plugin-Fix für den Sperrhinweis

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| QA-04 | 🧩 Implementiert · Abnahme offen | 4/6 | Testphase starten, sobald die laufenden Arbeitsstränge gemerged sind und die Mod mit diagnose veröffentlicht ist. Diagnose und Fehlerbehebung der offenen Fälle übernehmen ab 07.11. die Threads „Planer-Abnahmen ohne Nachweis automatisieren“ und „Mod-Abnahmen im Spiel automatisieren“. |
| FALLBACK-01 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme LINK-09 durch Philipp (echter Spielneustart ohne Internet); der Rest ist automatisch geprüft. |
| GAME-07 | 🧩 Implementiert · Abnahme offen | 10/11 | Philipp prüft 0.19.0 im echten Spiel: gesperrter Bauplatz grau, Hologramm nur in einer Gruppe (Testfall MOD-21); danach Stufe 7. |
| LINK-07 | 🧩 Implementiert · Abnahme offen | 6/7 | Abnahme LINK-07 automatisieren (Block C), Rest im eigenen Spiel durch Philipp. |
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth prüft das Projekt weiter (Status processing, am 07.11.2026 nachgesehen); alle Versionen bis 0.26.0, Texte, Galerie und Offenlegungen sind aktuell (modrinth_publish.mjs plan). Kein Handlungsbedarf außer Abwarten. |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/views/mod/releases.json`
- `docs/TESTING.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.27.1.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.27.1.jar`
- `downloads/mod/bauplaner-bridge-paper-0.27.1.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/AbnahmeScenario.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`
- `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/PaperMultiplayerTest.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramDiagnose.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomFallbackTest.java`
- `scripts/mod/bridge_block_c.mjs`
- `scripts/mod/bridge_gametest.mjs`
- `scripts/mod/bridge_multiplayer_client.mjs`
- `scripts/mod/bridge_netcut.mjs`
- `scripts/mod/test_bridge_ingame.sh`
- `scripts/mod/test_multiplayer_client.sh`
- `tests/e2e/file-fallback.e2e.mjs`

## 2026-11-07T18:58:50.082Z · progress

**Aufgaben:** BACKUP-03

Projekt- und Gesamtsicherungen ohne Team-Raum-Schlüssel, verschlüsselter Team-Zugang (PBKDF2 + AES-GCM), Wechsel des Verwaltungsschlüssels im Raum mit Neu-Bestätigung für den Server nur bis vor die erste abgewiesene Fälschung; Unit 9/9, Browsertest team-access und Team-Suiten grün, echter Worker unter wrangler dev geprüft; Ausrollen des Dienstes offen

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| BACKUP-03 | 🧩 Implementiert · Abnahme offen | 3/4 | Team-Raum-Dienst mit dem neuen Wechselweg ausrollen (bis dahin meldet der Planer „zu alte Version“ und empfiehlt einen neuen Raum). |

**Geänderte Dateien:**

- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/project/team/TeamAccess.tsx`
- `apps/web/src/views/project/team/TeamRoom.tsx`
- `apps/web/src/views/project/team/roomClient.ts`
- `docs/README.md`
- `docs/TESTING.md`
- `docs/architecture/kern/BACKUPS.md`
- `docs/architecture/team/SIGNED_EVENTS.md`
- `docs/architecture/team/TEAM_ACCESS.md`
- `docs/architecture/team/TEAM_LIVE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/data/backup.ts`
- `packages/domain/src/data/backupStatus.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/team/team.ts`
- `packages/domain/src/team/teamAccess.ts`
- `scripts/team/team_room_smoke.mjs`
- `services/team-room/src/core.js`
- `services/team-room/src/index.js`
- `tests/e2e/team-access.e2e.mjs`
- `tests/unit/data/backup-secrets.test.mjs`

## 2026-11-07T19:17:28.843Z · progress

**Aufgaben:** PRIV-01

Datenschutz und Freigaben: Seite #/datenschutz mit allen Datenwegen aus einer Liste, Hinweis an jeder Freigabe, Fußzeile ohne „Alles bleibt lokal“, fremde Webkarten erst nach Bestätigung der Domain, Live-Position und Aufnahmen getrennt freigeben (Planer + Mod-Quellcode roomshare, Auslieferung mit Mod 0.28.0), Speicherstatus „In diesem Browser gespeichert“ mit Datum der Sicherungsdatei und Speicherwarnung, geführter Umzug GitHub Pages ↔ Cloudflare, Release-Datenprobe (Offline-Start, Update bei offenem Projekt, Rücksprung). Offen: Einladungen einzeln widerrufen (wartet auf Schlüssel-API).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| PRIV-01 | 🚧 In Arbeit | 6/8 | S05 auf der Schlüssel-API des Team-Identitäten-Pakets bauen; S03 mit Mod 0.28.0 ausliefern. |

**Geänderte Dateien:**

- `apps/web/src/app/CommandPalette.tsx`
- `apps/web/src/app/ShareNote.tsx`
- `apps/web/src/app/Shell.tsx`
- `apps/web/src/app/StorageWarning.tsx`
- `apps/web/src/app/dataFlows.ts`
- `apps/web/src/app/nav.ts`
- `apps/web/src/app/router.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/styles/privacy.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/HostMove.tsx`
- `apps/web/src/views/PrivacyView.tsx`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/SystemView.tsx`
- `apps/web/src/views/map/LiveMapPanel.tsx`
- `apps/web/src/views/map/MapLink.tsx`
- `apps/web/src/views/map/WorldMapView.tsx`
- `apps/web/src/views/map/WorldSharePanel.tsx`
- `apps/web/src/views/map/mapHosts.ts`
- `apps/web/src/views/mod/serverClient.ts`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/team/TeamRoom.tsx`
- `docs/README.md`
- `docs/architecture/betrieb/DATENSCHUTZ.md`
- `docs/operations/VEROEFFENTLICHUNG.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomClientTest.java`
- `tests/e2e/persistence.e2e.mjs`
- `tests/e2e/privacy.e2e.mjs`
- `tests/e2e/release-data.e2e.mjs`
- `tests/unit/web/dataFlows.test.mjs`

## 2026-11-07T19:38:18.474Z · progress

**Aufgaben:** HARDEN-01

ZIP/GZIP-Importe zählen echte Bytes mit gemeinsamem Budget im abbrechbaren Worker; Team-Raum mit Grenzen für Raumerstellung, Verbindungen, Nachrichten, Origin-Prüfung, Anmelde-Timeout, Größen vor dem Parsen, Aufbewahrung nur mit Schlüssel. check 1056/1056, e2e 231/231, Proben unter wrangler dev grün; Ausrollen offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| HARDEN-01 | 🧩 Implementiert · Abnahme offen | 2/3 | Team-Raum ausrollen (wrangler deploy mit Migration v3 RoomGate), danach Missbrauchsprobe, Rauchtest und Sicherungsprobe gegen den echten Dienst. |

**Geänderte Dateien:**

- `apps/web/src/blockmodels/TexturePanel.tsx`
- `apps/web/src/blockmodels/assets.ts`
- `apps/web/src/blockmodels/pack.ts`
- `apps/web/src/blockmodels/zip.ts`
- `apps/web/src/jobs/jobs.ts`
- `apps/web/src/jobs/packJob.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/team/roomClient.ts`
- `docs/TESTING.md`
- `docs/architecture/formate/BLOCK_MODELS.md`
- `docs/architecture/team/TEAM_BACKUP.md`
- `docs/architecture/team/TEAM_LIVE.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/index.ts`
- `packages/domain/src/team/team.ts`
- `scripts/team/team_room_abuse_smoke.mjs`
- `services/team-room/README.md`
- `services/team-room/src/guard.js`
- `services/team-room/src/index.js`
- `services/team-room/wrangler.toml`
- `tests/unit/building/zip-limits.test.mjs`
- `tests/unit/team/team-room-abuse.test.mjs`

## 2026-11-07T19:33:20.416Z · progress

**Aufgaben:** LIB-07

Bibliothek vergleichbar und filterbar: jede Gebäude-, Generator- und Ensemblekarte zeigt Grundfläche, Höhe, Material, Survival-Aufwand, Minecraft-Profil und Prüfstand (Ergebnis je Gebäude aus dem Paper-26.3-Lauf, 559 Pläne ohne Abweichung, geänderte Inhalte = neu prüfen); Filter Grundstück, Survival-Aufwand, benötigte Mods, nur geprüft; einheitliche Ansichten außen/innen/oben; 8 Baustil-Paletten plus eigene, auf Merkliste/Sammlungen anwendbar. Prüfung: npm run check, 235 Browsertests, library-compare 4/4. Offen: Abnahme durch Philipp (BIB-02).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| LIB-07 | 🧩 Implementiert · Abnahme offen | 5/6 | Abnahme durch Philipp (S06, BIB-02). |

**Geänderte Dateien:**

- `apps/web/src/app/router.ts`
- `apps/web/src/styles/catalog.css`
- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/thumbnail/StandardViews.tsx`
- `apps/web/src/thumbnail/views.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/library/BuildingCard.tsx`
- `apps/web/src/views/library/BuildingDetail.tsx`
- `apps/web/src/views/library/CatalogFilters.tsx`
- `apps/web/src/views/library/CollectionsPage.tsx`
- `apps/web/src/views/library/ComparePage.tsx`
- `apps/web/src/views/library/EnsemblesPage.tsx`
- `apps/web/src/views/library/GeneratorsPage.tsx`
- `apps/web/src/views/library/PalettesPage.tsx`
- `apps/web/src/views/library/TemplatesPage.tsx`
- `apps/web/src/views/library/VersionsSection.tsx`
- `apps/web/src/views/library/paletteVariants.ts`
- `apps/web/src/views/library/templateWorld.ts`
- `apps/web/src/views/library/urlState.ts`
- `docs/TESTING.md`
- `docs/architecture/bibliothek/CATALOG.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/catalog/catalog.ts`
- `packages/domain/src/catalog/collections.ts`
- `packages/domain/src/catalog/compare.ts`
- `packages/domain/src/catalog/pruefstand.ts`
- `packages/domain/src/catalog/stylePalettes.ts`
- `packages/domain/src/index.ts`
- `scripts/mod/game_placement.mjs`
- `scripts/mod/test_game_placement.sh`
- `tests/e2e/library-compare.e2e.mjs`
- `tests/e2e/planer-abnahmen.e2e.mjs`
- `tests/unit/catalog/compare.test.mjs`

## 2026-11-07T19:44:24.512Z · progress

**Aufgaben:** RELEASE-01

Browser-Schutz und Release-Check: Sicherheitsheader für Cloudflare Pages (CSP durchgesetzt für Einbettung/Plugins, volle CSP als Report-Only, HSTS, Permissions-Policy), Einbettungsschutz und Meta-CSP für GitHub Pages, npm run check:release, sicherer Schem/Litematic-Export, Browserliste in der Mod (Quelle, nächste Mod-Version)

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| RELEASE-01 | 🧩 Implementiert · Abnahme offen | 5/7 | Entscheidung Philipp: eigene Team-Raum-Adressen beim Durchsetzen der CSP erlauben oder nicht; Mod-Version mit Browserliste mit dem nächsten Mod-Release ausliefern. |

**Geänderte Dateien:**

- `SECURITY.md`
- `apps/web/index.html`
- `apps/web/src/app/frameGuard.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/ExportTab.tsx`
- `docs/TESTING.md`
- `docs/architecture/betrieb/SICHERHEITSHEADER.md`
- `docs/operations/VEROEFFENTLICHUNG.md`
- `docs/testing/TESTPLAN.md`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/gradle/wrapper/gradle-wrapper.properties`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandScreen.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LinkPrompt.java`
- `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandWords.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `package.json`
- `packages/application/src/revisionExport.ts`
- `packages/voxel/src/exportSafety.ts`
- `packages/voxel/src/index.ts`
- `scripts/checks/release_check.mjs`
- `scripts/pages/publish_cloudflare.mjs`
- `scripts/pages/publish_main_pages.sh`
- `scripts/pages/security_headers.mjs`
- `tests/e2e/security-headers.e2e.mjs`
- `tests/unit/formats/export-safety.test.mjs`
- `tests/unit/tooling/cloudflare-pages.test.mjs`

## 2026-11-07T20:21:31.573Z · progress

**Aufgaben:** FLOW-01

Durchgängiger Bauablauf: Baumodus für Tablet und Zweitbildschirm mit Packliste, Nachweis je Schritt (manuell, im Spiel bestätigt, neu prüfen), Materialbilanz, Materialtausch mit Vorschau, Geländeschnitt mit Höhenprofil, Wassertiefe, Erdbewegung und Kollisionen; Abnahme mit der Großen Hafenstadt an einer Küste

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| FLOW-01 | 🧩 Implementiert · Abnahme offen | 6/6 | Philipps Spieltest: Baumodus auf Tablet bzw. zweitem Bildschirm neben dem Spiel, Materialtausch in einem eigenen Projekt, Geländeschnitt an einer echten Küste. |

**Geänderte Dateien:**

- `apps/web/src/styles/flow.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/project/BuildTab.tsx`
- `apps/web/src/views/project/MaterialLedgerPanel.tsx`
- `apps/web/src/views/project/MaterialsTab.tsx`
- `apps/web/src/views/project/ProjectSwapPanel.tsx`
- `apps/web/src/views/project/TerrainSectionPanel.tsx`
- `apps/web/src/views/project/TerrainTab.tsx`
- `apps/web/src/views/project/buildrun/BuildFocus.tsx`
- `apps/web/src/views/project/buildrun/LayerPlan.tsx`
- `apps/web/src/views/project/buildrun/SessionsView.tsx`
- `docs/README.md`
- `docs/STATUS.md`
- `docs/TESTING.md`
- `docs/architecture/planer/BAUABLAUF.md`
- `docs/testing/TESTPLAN.md`
- `packages/domain/src/building/gameCheck.ts`
- `packages/domain/src/building/guide.ts`
- `packages/domain/src/building/stepProof.ts`
- `packages/domain/src/core/types.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/materials/materialLedger.ts`
- `packages/domain/src/materials/projectSwap.ts`
- `packages/domain/src/world/terrainSection.ts`
- `tests/e2e/aged-browserdata.e2e.mjs`
- `tests/e2e/hafen-ablauf.e2e.mjs`
- `tests/unit/building/flow.test.mjs`

## 2026-11-07T20:17:06.217Z · progress

**Aufgaben:** TEAM-SEC-01

Team-Raum nimmt den Absender aus dem Schlüssel und prüft Rollen; eigene Schlüssel je Mitglied und Gerät mit Widerruf; Unterschrift der Bauleitung mit Ed25519, Server bekommt nur den Prüfschlüssel; Planer/Mod/Plugin übernehmen nur Geprüftes; alte Räume stellt die Bauleitung mit team.trust samt Ausnahmen um. Unit 1066/1066, Java grün, Team-Browser-Tests grün (auch gegen wrangler dev), echter Paper 1.21.11/26.3 grün; Ausrollen und Modrinth offen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TEAM-SEC-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Team-Raum gemeinsam mit HARDEN-01 ausrollen, Rauch-/Missbrauchsprobe gegen den echten Dienst, Mod/Plugin 0.28.0 auf Modrinth. |

**Geänderte Dateien:**

- `apps/web/src/testing/autochecks.ts`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/views/mod/releases.json`
- `apps/web/src/views/mod/serverClient.ts`
- `apps/web/src/views/project/team/TeamAccess.tsx`
- `apps/web/src/views/project/team/TeamRoom.tsx`
- `apps/web/src/views/project/team/roomClient.ts`
- `docs/architecture/team/SIGNED_EVENTS.md`
- `docs/architecture/team/TEAM_IDENTITY.md`
- `docs/architecture/team/TEAM_LIVE.md`
- `docs/testing/TESTPLAN.md`
- `downloads/mod/bauplaner-bridge-fabric-26.3-0.28.0.jar`
- `downloads/mod/bauplaner-bridge-neoforge-26.3-0.28.0.jar`
- `downloads/mod/bauplaner-bridge-paper-0.28.0.jar`
- `mods/bauplaner-bridge/CHANGELOG.md`
- `mods/bauplaner-bridge/VERSION`
- `mods/bauplaner-bridge/mod-core/build.gradle`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`
- `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/EventSig.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`
- `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/team/EventSigTest.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/EventTrust.java`
- `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`
- `mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/EventTrustTest.java`
- `packages/domain/src/index.ts`
- `packages/domain/src/team/eventSig.ts`
- `packages/domain/src/team/team.ts`
- `packages/domain/src/team/teamAccess.ts`
- `packages/domain/src/team/teamSync.ts`
- `scripts/mod/bridge_multiplayer_client.mjs`
- `scripts/mod/bridge_paperroom.mjs`
- `scripts/mod/bridge_papersigned.mjs`
- `scripts/mod/lib/multiplayer.mjs`
- `services/team-room/src/core.js`
- `services/team-room/src/guard.js`
- `services/team-room/src/index.js`
- `tests/e2e/modSimulator.mjs`
- `tests/e2e/team-acceptance.e2e.mjs`
- `tests/e2e/team-access.e2e.mjs`
- `tests/e2e/team-room.e2e.mjs`
- `tests/unit/data/backup-secrets.test.mjs`
- `tests/unit/team/team-backup.test.mjs`
- `tests/unit/team/team-concurrency.test.mjs`
- `tests/unit/team/team-identity.test.mjs`
- `tests/unit/team/team-room.test.mjs`

## 2026-11-07T20:38:47.757Z · progress

**Aufgaben:** TEAM-SEC-01

Auf main 49daa6f: Mod/Plugin 0.28.0 im Download, Fortschrittsnachweis vervollständigt; Ausrollen des Team-Raums und Modrinth folgen.

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| TEAM-SEC-01 | 🧩 Implementiert · Abnahme offen | 4/5 | Team-Raum gemeinsam mit HARDEN-01 ausrollen, Rauch-/Missbrauchsprobe gegen den echten Dienst, Mod/Plugin 0.28.0 auf Modrinth. |

## 2026-11-07T20:44:28.756Z · progress

**Aufgaben:** GAME-09

0.27.1 und 0.28.0 auf Modrinth (Fabric, NeoForge, Paper); Beschreibung: Team-Rollen mit eigenen Schlüsseln

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| GAME-09 | 🚧 In Arbeit | 4/5 | Modrinth prüft das Projekt weiter (Status processing, am 07.11.2026 nachgesehen); alle Versionen bis 0.26.0, Texte, Galerie und Offenlegungen sind aktuell (modrinth_publish.mjs plan). Kein Handlungsbedarf außer Abwarten. |

**Geänderte Dateien:**

- `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`

## 2026-11-07T20:35:12.255Z · progress

**Aufgaben:** UX-02

Startseite mit drei Einstiegen (fortsetzen, Bauwerk wählen, Datei ansehen/importieren) und geführter Tour mit der Burgmauer; Projekt in drei Ansichten Entwerfen/Bauen/Verwalten mit Kurzlinks und neuer Übersicht (letzter Stand, Offenes, nächster Bauabschnitt); Editor und Blockwerkstatt mit einklappbaren Leisten, Vollbild, Inspektor in Abschnitten, 2D-Schichtplan; 3D-Ansicht mit freiem Schnitt, Geistermodus und gespeicherten Kameras; Ersatzansicht-Hinweis unten mit Hilfe; „Was tun?“ an Fehlern. npm run check grün, workspace.e2e 5/5, Browserregression 241/242 (team-room.e2e wackelt auch auf main).

| Aufgabe | Status im Arbeitsblock | Teilschritte | Nächste Aktion |
|---|---|---:|---|
| UX-02 | 🧩 Implementiert · Abnahme offen | 5/5 | Abnahme START-10/11 im Browser und GERAET-04 auf dem iPad (Philipp). |

**Geänderte Dateien:**

- `apps/web/src/app/FixHelp.tsx`
- `apps/web/src/app/fixHelp.css`
- `apps/web/src/app/fixHelpText.ts`
- `apps/web/src/app/icons.tsx`
- `apps/web/src/app/workspaceLayout.css`
- `apps/web/src/app/workspaceLayout.tsx`
- `apps/web/src/editor/BlockEditor.tsx`
- `apps/web/src/schem/SchemView.tsx`
- `apps/web/src/styles/navGroups.css`
- `apps/web/src/styles/start.css`
- `apps/web/src/styles/style.css`
- `apps/web/src/testing/testplan.ts`
- `apps/web/src/theme/design.css`
- `apps/web/src/viewer/CameraMenu.tsx`
- `apps/web/src/viewer/PlanView2D.tsx`
- `apps/web/src/viewer/ThreeViewer.tsx`
- `apps/web/src/viewer/sceneController.ts`
- `apps/web/src/viewer/types.ts`
- `apps/web/src/viewer/viewTools.css`
- `apps/web/src/viewer/viewTools.ts`
- `apps/web/src/views/LibraryView.tsx`
- `apps/web/src/views/ProjectsView.tsx`
- `apps/web/src/views/project/EditorTab.tsx`
- `apps/web/src/views/project/InspectorSection.tsx`
- `apps/web/src/views/project/OverviewTab.tsx`
- `apps/web/src/views/project/ProjectView.tsx`
- `apps/web/src/views/project/Tour.tsx`
- `apps/web/src/views/project/overview.css`
- `apps/web/src/views/project/tabNames.ts`
- `apps/web/src/views/project/tabs.ts`
- `apps/web/src/views/project/tour.css`
- `docs/TESTING.md`
- `docs/architecture/planer/UI.md`
- `docs/testing/TESTPLAN.md`
- `tests/e2e/simple-ui.e2e.mjs`
- `tests/e2e/workspace.e2e.mjs`
- `tests/unit/web/view-tools.test.mjs`

