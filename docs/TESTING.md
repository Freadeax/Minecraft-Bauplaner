# Prüfstand

Wie LMNT — Build Studio geprüft wird, mit welchen Befehlen und mit welchem letzten Ergebnis. GitHub Actions werden nicht verwendet: Jede Änderung wird vor dem Push lokal geprüft, und die Veröffentlichung bricht ab, wenn `npm run check` nicht grün ist ([VEROEFFENTLICHUNG](operations/VEROEFFENTLICHUNG.md)).

## Prüfebenen

| Ebene | Befehl | Umfang |
|---|---|---|
| Gesamtprüfung | `npm run check` | Modulgrenzen, Roadmap-Schema, strenge Typprüfung, Kern- und Webbuild, alle Einheitstests, Dokumentlinks, Testplan, Bibliotheksbestand |
| Einheitstests | `npm test` (nach `npm run build`) | `tests/unit/<bereich>/*.test.mjs` mit `node --test`: core, formats, catalog, materials, building, planning, world, team, data, editor, mod, web, tooling |
| Browsertests | `npm run test:e2e` | `tests/e2e/*.e2e.mjs` mit Playwright gegen den gebauten Planer, Desktop 1400 px und Handy 390 px |
| Andere Browser | `npm run test:e2e:firefox`, `npm run test:e2e:webkit` | dieselben Browsertests in Firefox und WebKit |
| Großdateien | `npm run test:grossbau` | Großstadt (1,45 Mio. Blöcke) und Spielbasis im echten Spiel, Browserläufe aus `tests/big/` |
| Formate | `npm run format:check-schem` | Schem-Roundtrip mit unabhängigem Leser |
| Release-Check | `npm run check:release` (`-- --offline`, `-- --commit <sha>`) | npm audit, Gradle-Wrapper und Distribution-Prüfsumme, Mod-JARs gegen `releases.json`, beide Adressen und Modrinth, HTTPS und Sicherheitsheader live, keine Zugangsdaten im Artefakt ([Browser-Schutz](architecture/betrieb/SICHERHEITSHEADER.md)) |

Einzelne Prüfungen: `npm run typecheck`, `npm run check:architecture`, `npm run check:roadmap`, `npm run check:docs`, `npm run check:testplan`, `npm run check:library`.

## Spielprüfstände

Diese Läufe starten echte Minecraft-Clients oder Paper-Server (kopflos) und sind nicht Teil von `npm run check`. Sie brauchen JDK 21/25 und Netzzugang zu den Mojang-, Fabric- und Paper-Servern.

| Prüfstand | Befehl | Was er beweist |
|---|---|---|
| Mod-Kern | `scripts/mod/test_bridge.sh` | JUnit der Kerne und sprachübergreifender Formatabgleich mit dem Planer |
| Mod im Spiel | `scripts/mod/test_bridge_ingame.sh` | Fabric-Client 26.3 mit Gametest: Hologramm, Oberfläche, Website-Verbindung, Team-Raum, auch mit Modpack |
| NeoForge | `scripts/mod/test_bridge_ingame_forge.sh neoforge` | derselbe Ablauf im NeoForge-Client |
| Exporte | `scripts/mod/test_exports_ingame.sh` | Litematica-, WorldEdit- und Vanilla-Exporte im echten Spiel, auch gedreht und gespiegelt, mit Truheninhalt, verzaubertem Schwert, Schildern und Ausstattung |
| Platzierung | `scripts/mod/test_game_placement.sh [satz]` | Katalog, Generatoren, Gelände, Basis und Großprojekte auf Paper 26.3 Block für Block gegen den Plan |
| Paper-Plugin | `scripts/mod/test_bridge_paper*.sh` | Plugin auf Paper 1.18.2 bis 26.3: Teambau, Lagerkisten, Team-Raum, unterschriebene Ereignisse, Weltplan in BlueMap/Dynmap, gesperrte Weltplan-Flächen mit Bot-Spielern (`test_bridge_paper_bots.sh weltplan`) |
| Mehrspieler | `scripts/mod/test_multiplayer.sh`, `test_multiplayer_client.sh` | echte Spieler als Bots und echter Client mit Mod am selben Server |
| Weltimport | `scripts/mod/test_world_import_real.sh` | Regionsdateien aus echten 26.3-Welten |

## Letzter Gesamtstand (07.11.2026)

| Prüfung | Ergebnis |
|---|---|
| `npm run check` | grün |
| Browsertests Chromium | 235/235 grün (96 Dateien, Stand LIB-07; `planer-abnahmen` einzeln nachgelaufen; `team-room.e2e` danach 10 Läufe hintereinander grün, `offline.e2e` 6/6) |
| FLOW-01 Bauablauf (07.11.) | `npm run check` grün; Browsertests 238/238 (99 Dateien, Stand vor LIB-07/RELEASE-01; im Gesamtlauf wackelten `offline.e2e` (Dienst-Worker-Wechsel) und `team-room.e2e` (echter Dienst), beide einzeln danach grün) |
| Firefox, WebKit, iPad-/iPhone-Profile | grün für Werkstatt, Weltkarte und Grafik |
| RELEASE-01 Browser-Schutz (07.11.) | `npm run check` grün; Browsertests 233/234 im Gesamtlauf, `team-room.e2e` danach 5 von 6 Einzelläufen grün (bekanntes Zeitverhalten, unverändert); `security-headers.e2e` null CSP-Verstöße; Mod-Kern-JUnit und Fabric-Build grün |
| RELEASE-01 volle CSP (10.11.) | `npm run check` grün; Browsertests 251/252, `release-data.e2e` scheitert genauso auf main ohne diese Änderung (Update bei offenem Projekt, unabhängig von der CSP) |
| GAME-11 Minecraft 26.4 Snapshot 8 (11.11.) | `npm run check` grün; Browsertests 253/254 im Gesamtlauf, `project-computation.e2e` danach einzeln 4/4 (Zeitverhalten unter Last); `BAUPLANER_MC=26.4 scripts/mod/test_bridge_ingame.sh` im echten 26.4-snapshot-8-Client komplett grün (Aufnahme 146/1/1, Hologramm, Oberfläche, Block C, Planer im Browser) |
| Platzierung im Spiel | Katalog, Generatoren und Gelände 670 Pläne, Basis 28, Großprojekte 169 + 13 auf Gelände: jeweils 0 Abweichungen |
| Exporte im Spiel | 22/22 Fälle |
| Großbau | 1,45 Mio. Blöcke im Spiel aufgebaut und geprüft |
| Paper-Plugin | 1.21.11 und 26.3 für Team, Lager, Team-Raum, Unterschriften |
| Mod im Spiel (Abnahmen Mod und Anbindung) | Fabric und NeoForge 26.3 grün; Tasten, Platzierhilfe, Gerüst, Gruppen, Diagnose, Netzabbruch zum Team-Raum (`BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh`); echter Client auf Paper 26.3 (`test_multiplayer_client.sh`) |
| Team-Raum live | Status, Rauchprobe, Sicherungsprobe und `team-room.e2e` gegen den echten Dienst |
| Missbrauchsschutz (HARDEN-01) | ausgerollt 10.11. (Version 037de87a), Missbrauchsprobe gegen den echten Dienst grün; `zip-limits` und `team-room-abuse` (Node) grün; `scripts/team/team_room_abuse_smoke.mjs` gegen `wrangler dev` grün (403 fremde Seite, 404 create über Raum, 413 vor dem Parsen, 4408 nach 10 s, 4401, 4413, 429 Raumflut); Browsertests 231/231 |
| Abnahmen Block B (17 Testfälle) | `planer-abnahmen`, `team-abnahmen` (echter Team-Raum per `wrangler dev`, 2–3 Browser), `werkstatt-abnahme`: 17/17 in Chromium, Firefox und WebKit; `scripts/library/test_contribution_live.mjs` (Beitrag bis in den Export) und `test_bridge_paper_bots.sh weltplan` (gesperrter Bauplatz, Paper 1.21.11 und 26.1.2) grün |
| Sicherungen ohne Team-Schlüssel (BACKUP-03) | 11.11.2026 gegen den echten Team-Raum (Version 037de87a): `scripts/team/team_room_smoke.mjs` mit Wechsel des Verwaltungsschlüssels (alter abgewiesen, Einladung gilt weiter) und `team_room_backup_smoke.mjs` grün; `tests/unit/data/backup-secrets.test.mjs` 9/9, `tests/e2e/team-access.e2e.mjs` grün (Chromium): Projekt- und Gesamtsicherung ohne Einladungs-, Verwaltungs- und Serverschlüssel, Team-Zugang verschlüsselt, Verwaltungsschlüssel gewechselt |
| Bibliothek vergleichbar (LIB-07) | `tests/unit/catalog/compare.test.mjs` 9/9, `tests/e2e/library-compare.e2e.mjs` 4/4 (1400/390 px); Prüfstand-Lauf 07.11. Paper 26.3 Build 244: 559 Pläne, 878.974 Blöcke, 0 Abweichungen, Ergebnis je Gebäude in `packages/domain/src/catalog/pruefstand.ts` |
| Ladezeit und Versions-Check (PERF-07, COMPAT-01) | Browsertests Chromium 252/252 grün (105 Dateien, nach UX-02); `home-before-catalog`, `compat`, `grossbau-leistung` (287 000 Blöcke: Öffnen 4,5 s, Schicht 0,44 s, Kamera 1,3 s/Bild in Software-WebGL, Export 1,3 s; Budgets in `tests/e2e/perf-budgets.json`); `version-compat` 7/7; Start-JS 1206 KiB, Projektzentrale nach 0,26 s bedienbar |
| Startpaket und Export im Hintergrund (PERF-07 O-9/O-10) | Browsertests Chromium 251/252 im Gesamtlauf, `textures.e2e` danach 3 von 3 Einzelläufen grün (Zeitüberschreitung nur unter Volllast); `barrel-imports` 2/2; `measure_start`: Start-JavaScript 428 KiB, Projektzentrale nach 0,22 s; Großbau-Export 0,6 s, Bildpause 228 ms |
| Startseite, Projektansichten, Editor (UX-02) | `tests/e2e/workspace.e2e.mjs` 5/5, `simple-ui.e2e` 2/2, `tests/unit/web/view-tools.test.mjs` 5/5; volle Browserregression 241/242 grün (Chromium), einzig `team-room.e2e` wackelt im Vorlauf-Hook des Mod-Simulators – auch auf unverändertem main (2 von 9 Einzelläufen) |
| Abhängigkeiten aktualisiert (OPS-05, 11.11.) | TypeScript 7.0.2, Three.js 0.187, Vite 8.3.8, Playwright 1.65.0, wrangler 4.160.0, Mod 0.28.1 (Fabric Loader 0.20.1, Fabric API 0.166.0, NeoForge 26.3.0.102, Gradle 9.9.1, JUnit 6): `npm test` 1100/1100, `npm audit` 0, `check:release --offline` grün; Browsertests 253/254, einzig `release-data.e2e` (neue Offline-Fassung bleibt manchmal dauerhaft „wartend“) – auf unverändertem main 3 von 4 Einzelläufen ebenso rot; echter Spieltest Fabric 26.3 mit Team-Raum unter wrangler dev 4.160.0 (compatibility_date 2026-11-01) und NeoForge 26.3 grün; Paper-Prüfstand 1.18.2, 1.20.6, 1.21.4, 1.21.11, 26.3 (Build 248) grün |
| Spiel-Abnahme im eigenen Modpack (11.11.) | Philipps Modrinth-Profil Fabric 26.3 mit REI, Iris + Complementary, Distant Horizons, Mod 0.28.1 im Einzelspieler: Menü, Sprache, Meldungen, Großbau 1,45 Mio. (12–33 fps), Katalog-, Generator-, Gelände- und Großprojekt-Pläne als Hologramm; 2 Fehler behoben in Mod 0.28.2 (Revisionswarnung bei teamfremden Plänen, deutsche Ladefehler im englischen Spiel); `:core:test`, `:mod-core:test`, Fabric- und NeoForge-Build grün |
| Flüssigere Bildrate beim Hologramm (11.11.) | Mod 0.29.0: Leistung „auto“ (FrameBudget, Standard), Innenflächen gleichfarbiger Kästen weg, Shader-Kanten nur für die nächsten 1 500 Geisterblöcke; `:core:test`, `:mod-core:test` (FrameBudgetTest), echter Spieltest Fabric 26.3 grün, `npm run test:grossbau` grün (auto bei 9 fps unter llvmpipe auf 12 % = 4 320 Blöcke, feste Stufen 18 000/36 000/54 097) |

**Offen** sind Prüfungen, die nur Menschen leisten können: echte Mitspieler auf einem eigenen Server, echte iPhones und iPads, Bedienung und Gestaltung. Sie stehen als Testfälle unter [`#/testphase`](https://freadeax.github.io/Minecraft-Bauplaner/#/testphase) und im [Testplan](testing/TESTPLAN.md). Welche Testfälle automatisch nachgewiesen sind, steht dort unter „Automatische Abnahmen“.

## Regeln

- Nach jeder Änderung die betroffenen Prüfungen erneut ausführen; Änderungen nach der Prüfung machen sie ungültig.
- Tests werden nie abgeschwächt, um ein grünes Ergebnis zu erreichen. Nicht ausführbare Prüfungen werden als offen geführt, nie als bestanden.
- Neue Ergebnisse kommen kurz in die Tabelle „Letzter Gesamtstand“ und als Nachweis in die betroffene Aufgabe in [roadmap.json](roadmap.json) (`verification`, `evidence`). Der ausführliche Verlauf früherer Prüfläufe steht in der Git-Historie dieser Datei.
