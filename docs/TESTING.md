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
| Browsertests Chromium | 212/212 grün (91 Dateien; `team-room.e2e` danach 10 Läufe hintereinander grün, `offline.e2e` 6/6) |
| Firefox, WebKit, iPad-/iPhone-Profile | grün für Werkstatt, Weltkarte und Grafik |
| Platzierung im Spiel | Katalog, Generatoren und Gelände 670 Pläne, Basis 28, Großprojekte 169 + 13 auf Gelände: jeweils 0 Abweichungen |
| Exporte im Spiel | 22/22 Fälle |
| Großbau | 1,45 Mio. Blöcke im Spiel aufgebaut und geprüft |
| Paper-Plugin | 1.21.11 und 26.3 für Team, Lager, Team-Raum, Unterschriften |
| Mod im Spiel (Abnahmen Mod und Anbindung) | Fabric und NeoForge 26.3 grün; Tasten, Platzierhilfe, Gerüst, Gruppen, Diagnose, Netzabbruch zum Team-Raum (`BAUPLANER_ROOM=start scripts/mod/test_bridge_ingame.sh`); echter Client auf Paper 26.3 (`test_multiplayer_client.sh`) |
| Team-Raum live | Status, Rauchprobe, Sicherungsprobe und `team-room.e2e` gegen den echten Dienst |
| Abnahmen Block B (17 Testfälle) | `planer-abnahmen`, `team-abnahmen` (echter Team-Raum per `wrangler dev`, 2–3 Browser), `werkstatt-abnahme`: 17/17 in Chromium, Firefox und WebKit; `scripts/library/test_contribution_live.mjs` (Beitrag bis in den Export) und `test_bridge_paper_bots.sh weltplan` (gesperrter Bauplatz, Paper 1.21.11 und 26.1.2) grün |
| Sicherungen ohne Team-Schlüssel (BACKUP-03) | `tests/unit/data/backup-secrets.test.mjs` 9/9, `tests/e2e/team-access.e2e.mjs` grün (Chromium): Projekt- und Gesamtsicherung ohne Einladungs-, Verwaltungs- und Serverschlüssel, Team-Zugang verschlüsselt, Verwaltungsschlüssel gewechselt |

**Offen** sind Prüfungen, die nur Menschen leisten können: echte Mitspieler auf einem eigenen Server, echte iPhones und iPads, Bedienung und Gestaltung. Sie stehen als Testfälle unter [`#/testphase`](https://freadeax.github.io/Minecraft-Bauplaner/#/testphase) und im [Testplan](testing/TESTPLAN.md). Welche Testfälle automatisch nachgewiesen sind, steht dort unter „Automatische Abnahmen“.

## Regeln

- Nach jeder Änderung die betroffenen Prüfungen erneut ausführen; Änderungen nach der Prüfung machen sie ungültig.
- Tests werden nie abgeschwächt, um ein grünes Ergebnis zu erreichen. Nicht ausführbare Prüfungen werden als offen geführt, nie als bestanden.
- Neue Ergebnisse kommen kurz in die Tabelle „Letzter Gesamtstand“ und als Nachweis in die betroffene Aufgabe in [roadmap.json](roadmap.json) (`verification`, `evidence`). Der ausführliche Verlauf früherer Prüfläufe steht in der Git-Historie dieser Datei.
