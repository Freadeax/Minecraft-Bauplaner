# Verbindliche Roadmap und Fortschritt

Stand: 2026-11-01T14:08:37.152Z. Automatisch erzeugt aus [roadmap.json](roadmap.json); nicht direkt bearbeiten. Baseline: [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2).

## So liest du den Stand

- Jede Aufgabe hat eine feste ID, echte Teilschritte, Abhängigkeiten, Nachweise und eine nächste Aktion.
- **Implementiert ≠ geprüft ≠ auf Main ≠ live.** „Geprüft“ gilt nur für den beschriebenen Umfang und den genannten Nachweis.
- Teilschritte sind abzählbare Ergebnisse, keine geschätzten Fertigstellungsprozente. Eine Phase ist erst nach ihren Austrittskriterien abgeschlossen.
- Main-/Pages-Spalten nennen den letzten eingetragenen Nachweis; jüngste Integration ist über Git-Historie und das [Live-Manifest](https://freadeax.github.io/Minecraft-Bauplaner/deployment.json) nachprüfbar. Ein neuer Commit kann den eigenen Hash nicht enthalten.
- Historische Nachweise ersetzen keinen aktuellen Browser-, Geräte- oder Spieltest.

| Status | Pakete |
|---|---:|
| ⏳ Offen | 20 |
| 🚧 In Arbeit | 3 |
| ⛔ Blockiert | 0 |
| 🧩 Implementiert · Abnahme offen | 13 |
| ✅ Im beschriebenen Umfang geprüft | 21 |
| ⏸ Zurückgestellt | 2 |

## Aktiver Arbeitsblock

- **PERF-02 · Zellindizes, Chunkdaten und selektive Neuberechnung** — 🧩 Implementiert · Abnahme offen, 2/3 Teilschritte. Nächster Schritt: Gemessene Structured-Clone-/Worker-Rückgabekosten reduzieren; selektive Geometrie-/Fortschrittsinvalidierung zuerst mit vollständigen semantischen Regressionen absichern.
- **MAP-01 · Weltlage und begehbare Projektkarte** — 🧩 Implementiert · Abnahme offen, 4/4 Teilschritte. Nächster Schritt: Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02.
- **EDIT-01 · Mehrfachauswahl und sichtbare Freiraumhüllen** — 🚧 In Arbeit, 0/2 Teilschritte. Nächster Schritt: Auswahlvertrag und atomare Gruppenoperationen definieren.
- **EDIT-02 · Blockeditor: Blöcke setzen, entfernen, ersetzen und drehen** — 🚧 In Arbeit, 0/5 Teilschritte. Nächster Schritt: Entwurfsvertrag und Werkzeuge umsetzen, Blockregister von VIEW-02 übernehmen.
- **GEN-02 · Weitere Generatoren und Dachdetails** — 🚧 In Arbeit, 0/5 Teilschritte. Nächster Schritt: Generatorspezifikation und Umsetzung Treppenhaus, Kirche, Hafen.

## Verbindlicher Ablauf bei jedem Main-Merge oder Push

1. Vor Beginn Aufgabe und Dateiumfang in COMMUNICATION anmelden; Eintrag hier auf „In Arbeit“ setzen.
2. Teilschritte und Nachweise nach jedem vollständigen Arbeitsblock aktualisieren; Blocker mit Grund und nächster Aktion festhalten.
3. `npm run roadmap:record -- ID-01,ID-02 "Konkretes Ergebnis und Prüfgrenzen"` hängt Dateien und Aufgabenstände an die Historie an und rendert beide Ansichten. Änderungen an Aufgaben vorher in roadmap.json eintragen.
4. `npm run check` und ausführbare Browserprüfungen durchführen; Ergebnisse in TESTING festhalten.
5. `npm run check:roadmap-change -- <vorheriger-main> [quellcommit]` prüft vor Integration Dateizuordnung, neue Ereignisse und unveränderte Historie.
6. Regulär integrieren; den passenden manifestgeprüften Pages-Artefaktcommit unmittelbar veröffentlichen. Artefaktcommits benötigen keinen neuen Aufgabenstatus.
7. Integration und Live-Hash prüfen; tatsächliche SHAs im Abschluss berichten und beim nächsten sachlichen Quellupdate nachtragen. Keine künstliche Deployment-Commit-Schleife.

Lokaler Pre-Push-Hook: `npm run setup:hooks`. Ohne eigene Actions erzwingt GitHub diese lokale Regel nicht für fremde Clients oder direkte API-Schreibzugriffe. Auch beim Konnektor gilt deshalb die dokumentierte Vorprüfung.

## P1: Bestand konsolidieren und Architektur absichern

**Ziel:** Aktueller, prüfbarer Stand mit entkoppeltem Fachkern und verbindlicher Fortschrittsführung.

**Austrittskriterien:**

- Alle aktiven Aufgaben mit ID, Zuständigkeit und Abnahme erfasst.
- Export und Aufnahmeverwaltung laufen außerhalb der Domäne; Architekturgrenzen automatisch geprüft.
- Projekt- und Assetänderungen verlieren bei konkurrierenden Schreibvorgängen keine Daten.
- Aktuelle Browserabnahme durchgeführt; verbleibende Geräteprüfungen ausdrücklich offen.

| ID | Arbeitspaket | Status | Schritte | Abhängigkeiten | Main | Pages-Quelle |
|---|---|---|---:|---|---|---|
| [CORE-01](#core-01) | Voxelvertrag, unveränderliche Daten und Zellsemantik | ✅ Im beschriebenen Umfang geprüft | 1/1 | — | `84838f0` | `e232b26` |
| [CORE-02](#core-02) | Assets, feste Versionen und Projektoperationen | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-01 | `84838f0` | `e232b26` |
| [CORE-03](#core-03) | Composer, Voxelkonflikte und Anschlüsse | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-02 | `84838f0` | `e232b26` |
| [STORE-01](#store-01) | Lokale Speicherung, Migration und Sicherungen | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-02 | `84838f0` | `e232b26` |
| [MAT-01](#mat-01) | Bauitems und Rohstoffplanung im bestehenden Katalog | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-03 | `84838f0` | `e232b26` |
| [BUILD-01](#build-01) | Bauanleitung, eigene Abschnitte, Lager und Sammelplan | ✅ Im beschriebenen Umfang geprüft | 1/1 | MAT-01 | `84838f0` | `e232b26` |
| [LIB-01](#lib-01) | Bestehender Gebäudekatalog und Bibliotheksabläufe | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-02 | `84838f0` | `e232b26` |
| [GEN-01](#gen-01) | Vorhandene parametrische Generatoren | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-03 | `84838f0` | `e232b26` |
| [OPS-01](#ops-01) | Main/root-Pages mit manifestgeprüften Artefakten | ✅ Im beschriebenen Umfang geprüft | 1/1 | — | `84838f0` | `e232b26` |
| [PLAN-01](#plan-01) | Verbindlicher Aufgabenbestand und Merge-Fortschritt | ✅ Im beschriebenen Umfang geprüft | 4/4 | — | `b5eb5b9` | `b5eb5b9` |
| [ARCH-01](#arch-01) | Anwendungsschicht und überprüfte Modulgrenzen | ✅ Im beschriebenen Umfang geprüft | 4/4 | CORE-01, CORE-02 | `ccf4fa7` | `ccf4fa7` |
| [DOC-01](#doc-01) | Widerspruchsfreie aktuelle Statusdokumentation | ✅ Im beschriebenen Umfang geprüft | 3/3 | PLAN-01 | `b5eb5b9` | `b5eb5b9` |
| [STORE-02](#store-02) | Revisionsschutz bei konkurrierenden Assetänderungen | ✅ Im beschriebenen Umfang geprüft | 3/3 | ARCH-01 | `b5eb5b9` | `b5eb5b9` |
| [QA-01](#qa-01) | Aktuelle Browserregression für alle Hauptabläufe | ✅ Im beschriebenen Umfang geprüft | 2/2 | ARCH-01 | `b5eb5b9` | `b5eb5b9` |
| [UI-01](#ui-01) | Neue Themen, Bauwelten und Materiallabor abnehmen | ✅ Im beschriebenen Umfang geprüft | 3/3 | QA-01 | `84838f0` | `e232b26` |
| [STAB-01](#stab-01) | Absturzschutz, Datencheck und Fehlerberichte abnehmen | 🧩 Implementiert · Abnahme offen | 1/2 | QA-01 | `84838f0` | `e232b26` |
| [OPS-02](#ops-02) | Deployment-Rückkehr und Wiederherstellungsprobe | ✅ Im beschriebenen Umfang geprüft | 2/2 | OPS-01, PLAN-01 | ausstehend | ausstehend |
| [OPS-03](#ops-03) | Alte vollständig integrierte Branches bereinigen | ✅ Im beschriebenen Umfang geprüft | 2/2 | OPS-01 | `b5eb5b9` | `b5eb5b9` |
| [LICENSE-01](#license-01) | Projektlizenz und öffentliche Inhalte klären | ⏳ Offen | 0/2 | — | ausstehend | ausstehend |
| [GAME-01](#game-01) | Spielaufnahmen und Soll/Ist-Vergleich | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-02, BUILD-01 | `b5eb5b9` | `b5eb5b9` |

## P2: Minecraft-Datentreue und Berechnungen vervollständigen

**Ziel:** Ein benanntes Java-Profil liefert konsistente Transformationen, Mengen und Referenzexporte.

**Austrittskriterien:**

- Registry-, Item- und Rezeptdaten an dasselbe dokumentierte Profil gebunden.
- Echte Schem-/Litematic-Referenzen geprüft; unbekannte Semantik bleibt gesperrt.
- Diff und Export erhalten relevante BlockEntity-Inhalte.
- Große Berechnungen abbrechbar und mit dokumentiertem Szenario gemessen.

| ID | Arbeitspaket | Status | Schritte | Abhängigkeiten | Main | Pages-Quelle |
|---|---|---|---:|---|---|---|
| [PROFILE-01](#profile-01) | Ein verbindliches Java-Versionsprofil | ⏳ Offen | 0/2 | ARCH-01 | ausstehend | ausstehend |
| [NBT-01](#nbt-01) | Semantische BlockEntity-Transformationen | ⏳ Offen | 0/2 | PROFILE-01 | ausstehend | ausstehend |
| [FORMAT-01](#format-01) | Schem v3 an echten Referenzwerkzeugen abnehmen | 🧩 Implementiert · Abnahme offen | 1/2 | PROFILE-01, NBT-01 | `84838f0` | `e232b26` |
| [FORMAT-02](#format-02) | Litematic an echten Referenzdateien abnehmen | 🧩 Implementiert · Abnahme offen | 1/3 | PROFILE-01, NBT-01 | `84838f0` | `e232b26` |
| [MAT-02](#mat-02) | Versionierte Item-/Rezeptauflösung vervollständigen | ⏳ Offen | 0/2 | PROFILE-01, MAT-01 | ausstehend | ausstehend |
| [MAT-03](#mat-03) | Vorhandene Glas-/Beton-/Terrakottavarianten abnehmen | 🧩 Implementiert · Abnahme offen | 2/3 | PROFILE-01, QA-01 | `84838f0` | `e232b26` |
| [MAT-04](#mat-04) | Kupfer mit Oxidation und Wachsstatus | ⏳ Offen | 0/2 | PROFILE-01, MAT-03 | ausstehend | ausstehend |
| [DIFF-01](#diff-01) | Verschiebungserkennung und BlockEntity-Diff | 🧩 Implementiert · Abnahme offen | 1/3 | CORE-02, NBT-01 | `84838f0` | `e232b26` |
| [PERF-01](#perf-01) | Große Berechnungen als abbrechbare Worker-Aufträge | ✅ Im beschriebenen Umfang geprüft | 3/3 | ARCH-01 | `7dffd92` | `7dffd92` |
| [PERF-02](#perf-02) | Zellindizes, Chunkdaten und selektive Neuberechnung | 🧩 Implementiert · Abnahme offen | 2/3 | PERF-01 | `7dffd92` | `7dffd92` |
| [PERF-03](#perf-03) | Bundle, große Views und Vorschaucache | ⏳ Offen | 0/3 | ARCH-01, QA-01 | ausstehend | ausstehend |
| [VIEW-01](#view-01) | Vorhandenen Viewer vollständig abnehmen | 🧩 Implementiert · Abnahme offen | 1/2 | QA-01 | `84838f0` | `e232b26` |

## P3: Architekturwerkbank und Bauablauf ausbauen

**Ziel:** Vom Import bis zum Nachbauen großer Projekte nachvollziehbar arbeiten.

**Austrittskriterien:**

- Zustandsabhängige Blockformen mit korrektem Picking und Layern.
- Eigene Sammlungen, Ensembles und kontrollierte Versionsupdates nutzbar.
- Weltkarte und Spielbrücke als vollständige, getrennt geprüfte Abläufe.
- Desktop und echtes iPhone für die vorgesehenen Abläufe geprüft.

| ID | Arbeitspaket | Status | Schritte | Abhängigkeiten | Main | Pages-Quelle |
|---|---|---|---:|---|---|---|
| [QA-02](#qa-02) | Echte GPU-, Safari- und iPhone-Abnahme | ⏳ Offen | 0/2 | QA-01, VIEW-02 | ausstehend | ausstehend |
| [UI-02](#ui-02) | App-Hülle, Navigation und Handyoberfläche überarbeiten | ✅ Im beschriebenen Umfang geprüft | 4/4 | UI-01, QA-01 | ausstehend | ausstehend |
| [VIEW-02](#view-02) | Minecraft-nahe zustandsabhängige Blockformen | 🧩 Implementiert · Abnahme offen | 5/6 | PROFILE-01, VIEW-01 | ausstehend | ausstehend |
| [EDIT-01](#edit-01) | Mehrfachauswahl und sichtbare Freiraumhüllen | 🚧 In Arbeit | 0/2 | STORE-02, VIEW-01 | ausstehend | ausstehend |
| [EDIT-02](#edit-02) | Blockeditor: Blöcke setzen, entfernen, ersetzen und drehen | 🚧 In Arbeit | 0/5 | VIEW-01, STORE-02 | ausstehend | ausstehend |
| [UPDATE-01](#update-01) | Kontrollierte Versionsupdates mit lokalen Overrides | ⏳ Offen | 0/2 | DIFF-01, STORE-02 | ausstehend | ausstehend |
| [LIB-02](#lib-02) | Eigene Sammlungen, Ordner und Kategorien | 🧩 Implementiert · Abnahme offen | 2/2 | STORE-02, LIB-01 | ausstehend | ausstehend |
| [LIB-03](#lib-03) | Eigene Ensembles und Generatorvorlagen speichern | 🧩 Implementiert · Abnahme offen | 2/2 | LIB-02, GEN-01 | ausstehend | ausstehend |
| [WORLD-02](#world-02) | Weitere kuratierte Bauwelten | ✅ Im beschriebenen Umfang geprüft | 2/2 | LIB-01, UI-01 | `c3e6478` | `c3e6478` |
| [BUILD-05](#build-05) | Bauwelt-Anlagen mit Konfliktvorschau | ⏳ Offen | 0/2 | LIB-03, CORE-03 | ausstehend | ausstehend |
| [GEN-02](#gen-02) | Weitere Generatoren und Dachdetails | 🚧 In Arbeit | 0/5 | GEN-01, PROFILE-01 | ausstehend | ausstehend |
| [MAP-01](#map-01) | Weltlage und begehbare Projektkarte | 🧩 Implementiert · Abnahme offen | 4/4 | CORE-03, STORE-02 | `84838f0` | `e232b26` |
| [MAP-02](#map-02) | Gespeicherte Kartenziele und konkrete Provideradapter | ⏳ Offen | 0/2 | MAP-01 | ausstehend | ausstehend |
| [GAME-02](#game-02) | Fabric-Brücke kompilieren und im Spiel abnehmen | 🧩 Implementiert · Abnahme offen | 3/4 | FORMAT-01, GAME-01 | `84838f0` | `e232b26` |
| [GAME-03](#game-03) | Optionale lokale Verbindung und Anzeige im Spiel | ⏳ Offen | 0/2 | GAME-02 | ausstehend | ausstehend |
| [WORLD-IMPORT-01](#world-import-01) | Bereichsweiser Weltimport und Terrainprüfung | ⏳ Offen | 0/2 | PROFILE-01, PERF-02, FORMAT-01 | ausstehend | ausstehend |
| [BACKUP-02](#backup-02) | Sicherungserinnerung und Abschnittsrevisionen | ⏳ Offen | 0/2 | STORE-01, BUILD-01 | ausstehend | ausstehend |
| [LIB-04](#lib-04) | Gebäudebibliothek v3: Inhalte in alle Richtungen | 🧩 Implementiert · Abnahme offen | 4/4 | LIB-01 | ausstehend | ausstehend |

## P4: Optionale Zusammenarbeit und Integrationen

**Ziel:** Geteilte Projekte mit sicheren Rechten, geordneten Änderungen und Wiederherstellung.

**Austrittskriterien:**

- API, Rechte und dauerhafter Payloadspeicher mit Wiederherstellung geprüft.
- Parallele Operationen, Reconnect und Team-Undo ohne stillen Verlust.
- Lokaler Gastmodus bleibt nutzbar.
- Live- und weitere Spieladapter getrennt abgenommen; keine impliziten Weltänderungen.

| ID | Arbeitspaket | Status | Schritte | Abhängigkeiten | Main | Pages-Quelle |
|---|---|---|---:|---|---|---|
| [TEAM-01](#team-01) | Backendvertrag, Datenbank und Payloadspeicher | ⏳ Offen | 0/2 | ARCH-01, FORMAT-01, STORE-02, LICENSE-01 | ausstehend | ausstehend |
| [AUTH-01](#auth-01) | Konten, Rechte und Übernahme lokaler Projekte | ⏳ Offen | 0/2 | TEAM-01 | ausstehend | ausstehend |
| [TEAM-02](#team-02) | Geordnete Operationen, Reconnect und Team-Undo | ⏳ Offen | 0/2 | AUTH-01, UPDATE-01 | ausstehend | ausstehend |
| [TEAM-03](#team-03) | Gemeinsame Aufgaben, Abschnitte und Sammelplanung | ⏳ Offen | 0/2 | TEAM-02, BUILD-01 | ausstehend | ausstehend |
| [GAME-04](#game-04) | Paper-/NeoForge-Adapter und sichere Serveranbindung | ⏳ Offen | 0/2 | TEAM-02, GAME-02 | ausstehend | ausstehend |
| [LAGER-01](#lager-01) | Optionale Truhen-/Lagerintegration | ⏳ Offen | 0/2 | TEAM-03, GAME-04 | ausstehend | ausstehend |
| [OPS-04](#ops-04) | Teamdienst betreiben und Wiederherstellung prüfen | ⏳ Offen | 0/2 | TEAM-02 | ausstehend | ausstehend |
| [DEFER-01](#defer-01) | GitHub-Login, externes Materialrepo und Registry | ⏸ Zurückgestellt | 0/1 | — | ausstehend | ausstehend |
| [DEFER-02](#defer-02) | Optionale Discord-Integration | ⏸ Zurückgestellt | 0/1 | AUTH-01 | ausstehend | ausstehend |

## Details aller Arbeitspakete

### CORE-01

**Voxelvertrag, unveränderliche Daten und Zellsemantik** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] CORE-01-S01: Validierung, Koordinaten und explizite Luft/Löschzellen umgesetzt.

**Abnahme:** Unabhängige erwartete Zellen und Grenzen bestehen Tests.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/voxel.test.mjs](../tests/voxel.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/voxel/`. **Abhängigkeiten:** keine. **Alte IDs:** P0-02, P0-03.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### CORE-02

**Assets, feste Versionen und Projektoperationen** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] CORE-02-S01: Asset/Version/Instanz/Revision getrennt; Undo/Redo und Hashprüfung vorhanden.

**Abnahme:** Projekte referenzieren feste Versionen; Originale werden nicht überschrieben.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/domain.test.mjs](../tests/domain.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/library.ts`, `packages/domain/src/project.ts`. **Abhängigkeiten:** CORE-01. **Alte IDs:** B0, P2-01.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### CORE-03

**Composer, Voxelkonflikte und Anschlüsse** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] CORE-03-S01: Auflösung, Override, Snap, Händigkeit und Freiraumprüfung vorhanden.

**Abnahme:** AABB ist kein Konfliktentscheid; identische Zellen werden einmal gezählt.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/connectors.test.mjs](../tests/connectors.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/compose.ts`, `packages/domain/src/connectors.ts`. **Abhängigkeiten:** CORE-02. **Alte IDs:** B5, P2-02.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### STORE-01

**Lokale Speicherung, Migration und Sicherungen** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] STORE-01-S01: Atomare Transaktionen, Projekt-revisionen, Originale und geprüfte Backups vorhanden.

**Abnahme:** Fehlgeschlagene Wiederherstellung überschreibt nichts still.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/backup.test.mjs](../tests/backup.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/e2e/persistence.e2e.mjs](../tests/e2e/persistence.e2e.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `apps/web/src/app/idbRepository.ts`, `packages/domain/src/backup.ts`. **Abhängigkeiten:** CORE-02. **Alte IDs:** B3.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### MAT-01

**Bauitems und Rohstoffplanung im bestehenden Katalog** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] MAT-01-S01: Mehrblock-/Anzahlregeln, Stacks, Rezepte, Rundung und Reste vorhanden.

**Abnahme:** Mengen stammen aus der aufgelösten Welt; unbekannte Zuordnungen sichtbar.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/materials.test.mjs](../tests/materials.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/recipes.test.mjs](../tests/recipes.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/materials.ts`, `packages/domain/src/recipes.ts`. **Abhängigkeiten:** CORE-03. **Alte IDs:** B1, B1-R.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### BUILD-01

**Bauanleitung, eigene Abschnitte, Lager und Sammelplan** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] BUILD-01-S01: Schritte, Packlisten, Fortschritt, Abschnitte und Lagerberechnung vorhanden.

**Abnahme:** Manuelle Haken und Spielnachweis getrennt; Voraussetzungen ohne Zyklen.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/guide.test.mjs](../tests/guide.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/site.test.mjs](../tests/site.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/guide.ts`, `packages/domain/src/site.ts`. **Abhängigkeiten:** MAT-01. **Alte IDs:** B4, B14.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### LIB-01

**Bestehender Gebäudekatalog und Bibliotheksabläufe** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] LIB-01-S01: 174 Gebäude, Suche, Filter, Vergleich, Merkliste und bestehende Ensembles vorhanden.

**Abnahme:** Stabile Gebäudeversionen, deklarierte Materiallücken und reale Treffer.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/catalog.test.mjs](../tests/catalog.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/build/`, `apps/web/src/views/library/`. **Abhängigkeiten:** CORE-02. **Alte IDs:** B9, B9-A, B11.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### GEN-01

**Vorhandene parametrische Generatoren** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] GEN-01-S01: Haus, Turm, Mauer, Brücke, Dach und vorhandene Anlagen reproduzierbar.

**Abnahme:** Gleiche Parameter erzeugen gleiche Version; Projekte behalten ihre Version.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/generators.test.mjs](../tests/generators.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/generators/`. **Abhängigkeiten:** CORE-03. **Alte IDs:** B13.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### OPS-01

**Main/root-Pages mit manifestgeprüften Artefakten** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] OPS-01-S01: Statischer Build und quellenerhaltender Artefakt-Kindcommit implementiert.

**Abnahme:** Source-Hash und Dateihashes überprüfbar; keine eigenen Actions oder Force-Pushes.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/main-pages.test.mjs](../tests/main-pages.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `scripts/publish_main_pages.sh`, `scripts/prepare_main_pages.mjs`. **Abhängigkeiten:** keine. **Alte IDs:** HP-01, HP-02, HP-03.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### PLAN-01

**Verbindlicher Aufgabenbestand und Merge-Fortschritt** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex · Aktualisiert: 2026-11-01T12:48:14.548Z

- [x] PLAN-01-S01: Gesamte Roadmap in vier Phasen und stabile Aufgaben-IDs aufgenommen.
- [x] PLAN-01-S02: Schema, Historie, Darstellung und Änderungsprüfung implementieren und testen.
- [x] PLAN-01-S03: Pflichtablauf in AGENTS und Publisher integrieren; Main-/Pages-Nachweis prüfen.
- [x] PLAN-01-S04: Codex-Setup, lokale Hooks, reproduzierbare Browserabhängigkeit und Werkzeuggrenzen einrichten und prüfen.

**Abnahme:** Jede Aufgabe zeigt Teilschritte, Abhängigkeiten, nächste Aktion und Nachweise. Quelländerungen benötigen eine Aufgabenaktualisierung; Artefaktcommits sind separat nachweisbar.

**Nächste Aktion:** Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen.

**Prüfstand:** Lokales Setup, aktive Roadmap-Hooks und bestehende Roadmapregressionen geprüft; Chromium verfügbar, 54/54 E2E bestanden. Keine Codex-Cloud-Umgebung erstellt; fehlende Verwaltungsfunktion konkret dokumentiert. Main-/Pages-Nachweis dieses Blocks folgt getrennt im Abschluss.

**Nachweise:** [tests/roadmap.test.mjs](../tests/roadmap.test.mjs) — 5 Regressionen im Gesamtcheck 353/353 bestanden; Mergepflege dokumentiert.; [docs/TESTING.md](TESTING.md) — Aktuelle Blockabnahme mit Infrastrukturgrenzen.; [docs/project/CODEX_SETUP.md](project/CODEX_SETUP.md) — Lokaler Clone, Setupbefehle und getrennte Projekt-/Cloud-/Pageszustände nachgewiesen.

**Dateiumfang:** `docs/roadmap.json`, `scripts/roadmap.mjs`, `.githooks/`. **Abhängigkeiten:** keine. **Alte IDs:** P0-01.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### ARCH-01

**Anwendungsschicht und überprüfte Modulgrenzen** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex · Aktualisiert: 2026-11-01T09:33:55.354Z

- [x] ARCH-01-S01: Exportkoordination, Speicherports und Aufnahmeverwaltung herausgelöst.
- [x] ARCH-01-S02: Neutraler Aufnahmevertrag und Anwendungsexport an UI angebunden.
- [x] ARCH-01-S03: Gesamtprüfung und bestehende Format-/Browserregressionen ausführen.
- [x] ARCH-01-S04: Architekturvertrag dokumentieren und integriert veröffentlichen.

**Abnahme:** Domain importiert keine Formatwriter, Browseradapter oder Frameworks. Abhängigkeitsprüfung erfasst auch type-only, reexports und dynamische Imports.

**Nächste Aktion:** Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen.

**Prüfstand:** Kern/Anwendung und bestehende Format-/Aufnahmeregressionen bestehen. Neue UI-Browserprüfung wegen fehlender Laufzeit offen. Vorherige Mainintegration und Pages in dieser Fortsetzung bestätigt: Artefakt 18f70b7, Livesource ccf4fa7 und zwölf Dateihashes identisch.

**Nachweise:** [tests/application.test.mjs](../tests/application.test.mjs) — Exportanwendungsfall, Writerfehler und atomarer Konfliktfall bestanden.; [tests/architecture.test.mjs](../tests/architecture.test.mjs) — 3 Architekturregressionen bestanden.; [docs/TESTING.md](TESTING.md) — 353/353 Node-Tests; strenge Typ-/Buildprüfungen bestanden; Browser offen.

**Dateiumfang:** `packages/application/`, `packages/domain/src/revisionExport.ts`, `scripts/check_architecture.mjs`. **Abhängigkeiten:** CORE-01, CORE-02. **Alte IDs:** —.

**Integration:** Main [ccf4fa7](https://github.com/Freadeax/Minecraft-Bauplaner/commit/ccf4fa71c033c2f9415528192a04faed36730660); Pages-Quelle [ccf4fa7](https://github.com/Freadeax/Minecraft-Bauplaner/commit/ccf4fa71c033c2f9415528192a04faed36730660).

### DOC-01

**Widerspruchsfreie aktuelle Statusdokumentation** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex · Aktualisiert: 2026-11-01T12:42:58.241Z

- [x] DOC-01-S01: Widersprüche zu Litematic, Rohstoffen, Bauabschnitten und Hosting identifiziert.
- [x] DOC-01-S02: Aktuellen Status ersetzen; historische Aussagen ausdrücklich archivieren.
- [x] DOC-01-S03: Veralteten Webstart-, Browser- und Branchstatus durch aktuelle Codex-Einrichtung und tatsächliche Prüfungen ersetzen.

**Abnahme:** Keine implementierte Kernfunktion erscheint gleichzeitig als unbegonnen.

**Nächste Aktion:** Aktuelle Prüf-/Main-/Live-Nachweise im nächsten sachlichen Quellblock nachführen; keine selbstreferenzielle Deploymentfolge.

**Prüfstand:** Aktuelle Dokumentation mit lokaler Einrichtung, Browsernachweisen und Werkzeuggrenzen abgeglichen; alte historische Einträge erhalten. Generierte Ansichten werden geprüft; aktuelle Main-/Pages-SHAs nach Integration im Abschluss.

**Nachweise:** [docs/STATUS.md](STATUS.md) — Aktuelle Übersicht ersetzt widersprüchliche Aussagen.; [docs/TESTING.md](TESTING.md) — Dokumentationslinks und Roadmapansichten geprüft.

**Dateiumfang:** `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/STATUS_HISTORY.md`, `docs/ROADMAP_LEGACY.md`. **Abhängigkeiten:** PLAN-01. **Alte IDs:** —.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### STORE-02

**Revisionsschutz bei konkurrierenden Assetänderungen** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex · Aktualisiert: 2026-11-01T12:42:58.241Z

- [x] STORE-02-S01: Vorhandene S4-Reservierung und Remoteänderungen vor Bearbeitung prüfen.
- [x] STORE-02-S02: Asset-Revisionsvertrag, UI-Konfliktbehandlung und Migration implementieren.
- [x] STORE-02-S03: Zwei konkurrierende Metadatenänderungen und atomare Batches prüfen.

**Abnahme:** Kein stilles Überschreiben; bestehende Datensätze kontrolliert migrieren.

**Nächste Aktion:** CAS-/Migrationsregressionen bei Speicheränderungen fortführen; Safari/iPhone gesondert in QA-02.

**Prüfstand:** Node-CAS-/Restoretests und drei echte Chromiumfälle bestanden: v1→v2 samt Originalerhalt/Altverbindung/Zwei-Verbindungs-CAS, fehlerhaftes Upgrade mit Rollback und UI-Zwei-Tab-Entwurfserhalt nach Broadcast. Alle enthalten in der vollständigen 54/54-E2E-Abnahme.

**Nachweise:** [tests/asset-concurrency.test.mjs](../tests/asset-concurrency.test.mjs) — CAS, atomare Batches, Aliasschutz, Duplikate und ungültige Datensätze; Kernlauf separat in TESTING.; [tests/asset-restore.test.mjs](../tests/asset-restore.test.mjs) — Alte Sicherung, lokale Revisionsbasis und veralteter Restoreplan.; [tests/asset-seeding.test.mjs](../tests/asset-seeding.test.mjs) — Zwei konkurrierende Katalogeinrichtungen mit begrenztem aktuellen Retry.; [docs/architecture/ASSET_CONCURRENCY.md](architecture/ASSET_CONCURRENCY.md) — Migration, Formularbasis und offene Browserabnahme.; [tests/e2e/asset-editing.e2e.mjs](../tests/e2e/asset-editing.e2e.mjs) — Tatsächlich unter Windows/Chromium bestanden: alter Entwurf bleibt nach abgewiesenem Speichern erhalten; ausdrückliches Neuladen übernimmt gespeicherte Tags.; [tests/e2e/asset-concurrency.e2e.mjs](../tests/e2e/asset-concurrency.e2e.mjs) — Echte erfolgreiche und abgebrochene IndexedDB-Migration mit Originalbytes und atomarem CAS bestanden.

**Dateiumfang:** `apps/web/src/app/idbRepository.ts`, `packages/application/src/repository.ts`. **Abhängigkeiten:** ARCH-01. **Alte IDs:** S4.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### QA-01

**Aktuelle Browserregression für alle Hauptabläufe** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex · Aktualisiert: 2026-11-01T12:42:58.241Z

- [x] QA-01-S01: Chromium-Laufzeit bereitstellen bzw. Verfügbarkeit prüfen.
- [x] QA-01-S02: Komplette aktuelle Desktop-/schmale E2E-Suite ausführen und Fehler beheben.

**Abnahme:** Keine nur syntaktisch geprüften E2E als bestanden zählen.

**Nächste Aktion:** Suite nach relevanten Änderungen wiederholen; echte Geräte in QA-02 und große Worker-Browserlatenz in PERF-01 prüfen.

**Prüfstand:** Vollständiger unabhängiger lokaler Chromium-Wiederholungslauf 58/58 bestanden, null übersprungen (189,94 s). Erster Lauf 57/58 mit transientem 10-s-Timeout vor Restore; isoliert 3/3 Speicherfälle und anschließend vollständige Suite unverändert bestanden, keine Testabschwächung. Vier zusätzliche Themen-/Bauweltenfälle. Keine echte Safari-/iPhone-/GPU-/Spielabnahme.

**Nachweise:** [docs/TESTING.md](TESTING.md) — Abgegrenzter tatsächlicher Desktop-Smoke nach PERF-Deployment, ausdrücklich kein vollständiger Browserregressionsnachweis.; [docs/project/CODEX_SETUP.md](project/CODEX_SETUP.md) — Exakte Entwicklungsabhängigkeit, getrennte Chromiuminstallation und ausgeführtes Windows-Setup.

**Dateiumfang:** `tests/e2e/`. **Abhängigkeiten:** ARCH-01. **Alte IDs:** —.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### QA-02

**Echte GPU-, Safari- und iPhone-Abnahme** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] QA-02-S01: Geräte-/Browsermatrix und reproduzierbare Aufgaben definieren.
- [ ] QA-02-S02: Dateiimport, IndexedDB, Touch, Themes und Layer auf echten Geräten prüfen.

**Abnahme:** Viewportsimulation wird nicht als echte Geräteprüfung ausgegeben.

**Nächste Aktion:** Geräte-/Browsermatrix und reproduzierbare Aufgaben definieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `docs/TESTING.md`. **Abhängigkeiten:** QA-01, VIEW-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### UI-01

**Neue Themen, Bauwelten und Materiallabor abnehmen** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Codex Teilagent ui_acceptance · Aktualisiert: 2026-11-01T12:42:58.241Z

- [x] UI-01-S01: Fünf Themen, Hell/Dunkel/System, elf Bauwelten und Materiallabor eingebunden.
- [x] UI-01-S02: Node-Regressionsprüfungen für Filter, Kontrast und Mengen dokumentiert.
- [x] UI-01-S03: Aktuelle visuelle Browserprüfung in hell/dunkel und 1400/390 px.

**Abnahme:** Filterlinks reproduzieren Treffer; keine unlesbaren Panels oder Mengenänderungen.

**Nächste Aktion:** Oberflächenregression bei Themen-/Layoutänderungen weiterführen; echte Geräte separat in QA-02.

**Prüfstand:** Vier neue reale Chromiumfälle bestanden (25,14 s); fünf Themen × hell/dunkel × 1400/390 px für Labor/Bauwelten, 48 Aufnahmen visuell geprüft. Materialmengen, Herkunftsfilter, reale Vorschauen und reproduzierbare Links/Reloadtreffer unverändert. Kein echter Safari-/iPhone-/GPU-Nachweis.

**Nachweise:** [tests/theme-tokens.test.mjs](../tests/theme-tokens.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/build-themes.test.mjs](../tests/build-themes.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/material-lab.test.mjs](../tests/material-lab.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/e2e/ui-acceptance.e2e.mjs](../tests/e2e/ui-acceptance.e2e.mjs) — Vier echte Chromiumfälle, Themenmatrix, Mengenerhalt und drei neue kanonische Filterlinks.; [docs/architecture/UI_ACCEPTANCE.md](architecture/UI_ACCEPTANCE.md) — 48 visuell geprüfte Aufnahmen; Desktop und Touchsimulation von echten Geräten getrennt.

**Dateiumfang:** `apps/web/src/theme/`, `apps/web/src/materials/`, `apps/web/src/views/library/BuildThemesPage.tsx`. **Abhängigkeiten:** QA-01. **Alte IDs:** UI-01, MAT-02, WORLD-01.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### UI-02

**App-Hülle, Navigation und Handyoberfläche überarbeiten** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Claude Thread „Oberfläche gründlich überarbeiten“ · Aktualisiert: 2026-11-01T13:31:11.269Z

- [x] UI-02-S01: App-Hülle mit Navigationsliste, Schnellsuche (Strg+K), Seitentiteln und unterer Leiste am Handy.
- [x] UI-02-S02: Projektkopf mit Pfad, Speicherstatus und scrollbarer Bereichsleiste; Editor am Handy mit 3D zuerst.
- [x] UI-02-S03: Einheitliche Lesegrößen (keine Schrift unter 11 px), Touch-Ziele und Fußzeile; alle Themen hell/dunkel.
- [x] UI-02-S04: Browserprüfung 1400/390 px für Hülle, Suche und Projektkopf; vollständige E2E-Regression.

**Abnahme:** Navigation, Schnellsuche und Projektbereiche sind auf 1400 und 390 px ohne waagerechtes Scrollen bedienbar; bestehende E2E-Abläufe bleiben grün; keine Funktion entfällt.

**Nächste Aktion:** Echte Geräteprüfung (Safari/iPhone, Touch) in QA-02; weitere Hauptbereiche (z. B. Karte MAP-01) als Eintrag in nav.ts anhängen.

**Prüfstand:** npm run check: 391 Node-Tests bestanden, 1 übersprungen; volle Browserregression 63/63 (Chromium, 1400/390 px, Touchsimulation). Keine echte Safari-/iPhone-/GPU-Prüfung (QA-02).

**Nachweise:** [tests/e2e/shell.e2e.mjs](../tests/e2e/shell.e2e.mjs) — Vier echte Chromiumfälle: Hauptnavigation, Seitentitel, Schnellsuche mit Tastatur, Projektkopf/Bereichssprung (hell), Handy 390 px dunkel/hell ohne Überbreite, aktiver Bereich sichtbar, 3D zuerst.; [docs/architecture/UI.md](architecture/UI.md) — Abschnitt UI-02: Hülle, Navigationsliste, Schnellsuche, Projektkopf, Handyleiste, Lesbarkeit, Selektoren.

**Dateiumfang:** `apps/web/src/app/CommandPalette.tsx`, `apps/web/src/app/Shell.tsx`, `apps/web/src/app/icons.tsx`, `apps/web/src/app/nav.ts`, `apps/web/src/main.tsx`, `apps/web/src/shell.css`, `apps/web/src/style.css`, `apps/web/src/views/project/ProjectView.tsx`, `docs/COMMUNICATION.md`, `docs/TESTING.md`, `docs/architecture/UI.md`, `tests/e2e/shell.e2e.mjs`. **Abhängigkeiten:** UI-01, QA-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### STAB-01

**Absturzschutz, Datencheck und Fehlerberichte abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] STAB-01-S01: Datencheck, Auslieferungsprüfung und Sitzungserrorlog mit Tests vorhanden.
- [ ] STAB-01-S02: Echten Renderingfehler auslösen und Wiederaufnahme im Browser prüfen.

**Abnahme:** Fehlerhafte Datensätze verursachen keinen stillen Reparatureingriff.

**Nächste Aktion:** Echten Renderingfehler auslösen und Wiederaufnahme im Browser prüfen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** [tests/integrity.test.mjs](../tests/integrity.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/stability.test.mjs](../tests/stability.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `apps/web/src/app/ErrorBoundary.tsx`, `packages/domain/src/integrity.ts`. **Abhängigkeiten:** QA-01. **Alte IDs:** S1, S3.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### OPS-02

**Deployment-Rückkehr und Wiederherstellungsprobe** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Codex Teilagent restore_probe · Aktualisiert: 2026-11-01T12:42:58.241Z

- [x] OPS-02-S01: Rückkehr auf bekannte Artefakte zunächst isoliert durchspielen.
- [x] OPS-02-S02: Source-Erhalt und neue Manifestzuordnung prüfen; Wiederanlauf dokumentieren.

**Abnahme:** Kein Force-Push; kein Live-Rollback ohne Anlass.

**Nächste Aktion:** Bei tatsächlichem Vorfall bekannten Build neu bestätigen und Recovery regulär ohne Force vorbereiten; Livehashes danach gesondert prüfen.

**Prüfstand:** 4/4 Recoveryregressionen sowie echte dist-web-Probe bestanden: 13 Artefakte, 333 erhaltene Sourcepfade einschließlich synthetischer neuer Dateien und ausführbarem Modus. Hashes, Elternkette, unverändertes Ursprungsdeployment und entfernten Nachfolgechunk geprüft. Nur Scratchrepository; keine Live-/CDN-Restoreabnahme.

**Nachweise:** [tests/pages-restore.test.mjs](../tests/pages-restore.test.mjs) — Vier Regressionen zu Integrität, Quellkollision, Provenienz und echter isolierter Git-Wiederherstellung.; [docs/operations/PAGES_RESTORE_PROBE.md](operations/PAGES_RESTORE_PROBE.md) — Probe, ehrliche Recoverymanifestzuordnung und Grenzen ohne Live-Rollback.

**Dateiumfang:** `scripts/prepare_main_pages.mjs`, `docs/operations/`, `scripts/probe_pages_restore.mjs`, `tests/pages-restore.test.mjs`. **Abhängigkeiten:** OPS-01, PLAN-01. **Alte IDs:** HP-04.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### OPS-03

**Alte vollständig integrierte Branches bereinigen** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand / Codex-Prüfung · Aktualisiert: 2026-11-01T12:42:58.241Z

- [x] OPS-03-S01: Remote-Branches und vollständige Integration erneut nachweisen.
- [x] OPS-03-S02: Bei verfügbarer Löschfunktion integrierte Branches entfernen.

**Abnahme:** Keine unintegrierte Arbeit und keine benötigte Pages-Quelle löschen.

**Nächste Aktion:** Bei künftigem temporärem Branch erneut vollständige Integration prüfen; aktuell keine Bereinigung nötig.

**Prüfstand:** Authentifizierte GitHub-Refabfrage am 01.11.2026 liefert ausschließlich refs/heads/main. Keine Branchlöschung durch diesen Auftrag; historischer Fähigkeitsblocker überholt.

**Nachweise:** [docs/project/CODEX_SETUP.md](project/CODEX_SETUP.md) — Tatsächlicher Clone, GitHub-Berechtigungen, Pagesquelle und Werkzeuggrenzen geprüft.

**Dateiumfang:** `docs/COMMUNICATION.md`. **Abhängigkeiten:** OPS-01. **Alte IDs:** —.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### LICENSE-01

**Projektlizenz und öffentliche Inhalte klären** · ⏳ Offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] LICENSE-01-S01: Eigene und fremde Bestandteile inventarisieren.
- [ ] LICENSE-01-S02: Lizenzentscheidung dokumentieren; Herkunft und Nutzungsrechte für öffentliche Assets prüfen.

**Abnahme:** Keine ungeklärten fremden Texturen oder Bauwerke veröffentlichen.

**Nächste Aktion:** Eigene und fremde Bestandteile inventarisieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `README.md`, `THIRD_PARTY_NOTICES.txt`. **Abhängigkeiten:** keine. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROFILE-01

**Ein verbindliches Java-Versionsprofil** · ⏳ Offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] PROFILE-01-S01: Registryreport und Zielversion mit Herkunft/Hash dokumentieren.
- [ ] PROFILE-01-S02: Block-/Property-/Item-/Rezeptdaten an das Profil binden.

**Abnahme:** DataVersion allein behauptet keine Kompatibilität.

**Nächste Aktion:** Registryreport und Zielversion mit Herkunft/Hash dokumentieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/voxel/src/states.ts`, `packages/domain/src/materials.ts`. **Abhängigkeiten:** ARCH-01. **Alte IDs:** P1-02a.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### NBT-01

**Semantische BlockEntity-Transformationen** · ⏳ Offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] NBT-01-S01: Zu unterstützende NBT-Familien und Positions-/Ausrichtungsregeln festlegen.
- [ ] NBT-01-S02: Adapter mit konkreten Richtungen und unbekannten Restdaten prüfen.

**Abnahme:** Ungeklärte Transformation sperrt verlässlichen Export; keine stillen NBT-Verluste.

**Nächste Aktion:** Zu unterstützende NBT-Familien und Positions-/Ausrichtungsregeln festlegen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/voxel/`. **Abhängigkeiten:** PROFILE-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### FORMAT-01

**Schem v3 an echten Referenzwerkzeugen abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] FORMAT-01-S01: Import/Export, Worker, Limits, unabhängige Binärfixture und Python-Verifier vorhanden.
- [ ] FORMAT-01-S02: Echte WorldEdit-Dateien importieren, exportieren und im Referenzwerkzeug vergleichen.

**Abnahme:** Zellen, Zustände, Ursprung und BlockEntities semantisch erhalten.

**Nächste Aktion:** Echte WorldEdit-Dateien importieren, exportieren und im Referenzwerkzeug vergleichen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** [tests/schem.test.mjs](../tests/schem.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/schem-export.test.mjs](../tests/schem-export.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/formats/src/schem.ts`, `packages/formats/src/schemWrite.ts`. **Abhängigkeiten:** PROFILE-01, NBT-01. **Alte IDs:** B2, P1-01, P3-01.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### FORMAT-02

**Litematic an echten Referenzdateien abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] FORMAT-02-S01: Mehrregionen, negative Größen, Regionswahl und Writer mit unabhängigen Fixtures vorhanden.
- [ ] FORMAT-02-S02: Echte Litematica-Datei und Export im Spiel prüfen.
- [ ] FORMAT-02-S03: Grenzen für Entities/Ticks und ältere Formate im Bericht bestätigen.

**Abnahme:** Format- und DataVersion-Grenzen werden explizit gemeldet.

**Nächste Aktion:** Echte Litematica-Datei und Export im Spiel prüfen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** [tests/litematic.test.mjs](../tests/litematic.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/formats/src/litematic.ts`, `packages/formats/src/litematicWrite.ts`. **Abhängigkeiten:** PROFILE-01, NBT-01. **Alte IDs:** B10, P5-01.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### MAT-02

**Versionierte Item-/Rezeptauflösung vervollständigen** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] MAT-02-S01: Vorhandene Regeln mit Profilreport abgleichen.
- [ ] MAT-02-S02: Mehrblockobjekte, Rezeptalternativen, Rest-/Brennstoffbilanzen profilgenau prüfen.

**Abnahme:** Blockzahl, Bauitems, Rohstoffe und Lagerbestand bleiben getrennt.

**Nächste Aktion:** Vorhandene Regeln mit Profilreport abgleichen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/materials.ts`, `packages/domain/src/recipes.ts`. **Abhängigkeiten:** PROFILE-01, MAT-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### MAT-03

**Vorhandene Glas-/Beton-/Terrakottavarianten abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] MAT-03-S01: 50 gezielte Materialsätze und Property-/BlockEntity-Sperren vorhanden.
- [x] MAT-03-S02: Alte 174 Gebäude-Payloadhashes unverändert nachgewiesen.
- [ ] MAT-03-S03: Varianten im Zielprofil und in der Oberfläche prüfen.

**Abnahme:** Bestehende Versionen bleiben unverändert; Form und Properties kompatibel.

**Nächste Aktion:** Varianten im Zielprofil und in der Oberfläche prüfen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** [tests/variants.test.mjs](../tests/variants.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/variants.ts`. **Abhängigkeiten:** PROFILE-01, QA-01. **Alte IDs:** MAT-03.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### MAT-04

**Kupfer mit Oxidation und Wachsstatus** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] MAT-04-S01: Zustandsmatrix und Formfamilien mit Profilbeleg definieren.
- [ ] MAT-04-S02: Tausch mit Properties, Wachs und Oxidation testen.

**Abnahme:** Keine unvollständige Kupferzuordnung als kompatibel anbieten.

**Nächste Aktion:** Zustandsmatrix und Formfamilien mit Profilbeleg definieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/variants.ts`. **Abhängigkeiten:** PROFILE-01, MAT-03. **Alte IDs:** MAT-04.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### DIFF-01

**Verschiebungserkennung und BlockEntity-Diff** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] DIFF-01-S01: Basisvergleich A/B für Geometrie und Materialien vorhanden.
- [ ] DIFF-01-S02: Verschiebung von echten Geometrieänderungen unterscheiden.
- [ ] DIFF-01-S03: NBT-Änderungen und Folgen für Verbindungen/Schritte anzeigen.

**Abnahme:** Diff ist deterministisch und verändert keine Version.

**Nächste Aktion:** Verschiebung von echten Geometrieänderungen unterscheiden.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** [tests/variants.test.mjs](../tests/variants.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/voxel/src/diff.ts`, `apps/web/src/schem/DiffView.tsx`. **Abhängigkeiten:** CORE-02, NBT-01. **Alte IDs:** P5-03.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### PERF-01

**Große Berechnungen als abbrechbare Worker-Aufträge** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex Teilagent perf_browser · Aktualisiert: 2026-11-01T12:42:58.241Z

- [x] PERF-01-S01: Workerprotokoll mit Job-ID, Revisionsbezug und Abbruch definieren.
- [x] PERF-01-S02: Auflösung, Anleitung und Materialien auslagern; veraltete Ergebnisse verwerfen.
- [x] PERF-01-S03: Vorher/Nachher mit Modell, Hardware-/Browserangabe und UI-Reaktionszeit messen.

**Abnahme:** Keine Übernahme eines Ergebnisses für eine veraltete Revision.

**Nächste Aktion:** Messung bei Rechenkernänderungen wiederholen; Übertragungs-/Invalidierungsarbeit in PERF-02, vollständige React-/Gerätelatenz gesondert prüfen.

**Prüfstand:** 64.000 synthetische Zellen, echter isolierter Vite-Produktionsharness, Chromium 156 auf Ryzen 5 3600/32 GiB: je 1400/390 px Warmup plus drei Vergleichspaare. Vollständige Ergebnisdigests und handgezählte Invarianten gleich. DOM-Probe Median 693→30 / 790→35 ms, Gesamtdauer 703→1184 / 800→1420 ms; kein INP-/React-/GPU-/Echtgerätenachweis. Funktionale Workerregressionen weiterhin separat.

**Nachweise:** [tests/project-computation.test.mjs](../tests/project-computation.test.mjs) — Acht Kern-/Lifecycle-/Node-Workerfälle; Gesamtcheck in TESTING.; [tests/e2e/project-computation.e2e.mjs](../tests/e2e/project-computation.e2e.mjs) — Alle vier tatsächlichen Chromiumfälle am 01.11.2026 lokal bestanden; Funktionsnachweis ohne große Modelllatenzmessung.; [docs/architecture/PROJECT_COMPUTATION.md](architecture/PROJECT_COMPUTATION.md) — Protokoll, Snapshotbindung und abgegrenzte Node-Messung.; [docs/architecture/PROJECT_BROWSER_BENCHMARK.md](architecture/PROJECT_BROWSER_BENCHMARK.md) — Reproduzierbarer Browservergleich, Hardware, drei Paare je Viewport und ehrliche Interaktions-/Clonegrenzen.; [docs/architecture/project-browser-benchmark.json](architecture/project-browser-benchmark.json) — Vollständige Messläufe einschließlich Digests und unverändertem Rechenkernstand.

**Dateiumfang:** `apps/web/src/views/project/session.ts`, `packages/application/`, `apps/web/src/computation/`, `apps/web/src/app/useProjectComputation.ts`, `apps/web/src/views/project/`, `tests/project-computation.test.mjs`, `scripts/benchmark_project_browser.mjs`, `docs/architecture/project-browser-benchmark.json`. **Abhängigkeiten:** ARCH-01. **Alte IDs:** —.

**Integration:** Main [7dffd92](https://github.com/Freadeax/Minecraft-Bauplaner/commit/7dffd922f46876c70700afc0429afb969e5478aa); Pages-Quelle [7dffd92](https://github.com/Freadeax/Minecraft-Bauplaner/commit/7dffd922f46876c70700afc0429afb969e5478aa).

### PERF-02

**Zellindizes, Chunkdaten und selektive Neuberechnung** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Codex · Aktualisiert: 2026-11-01T12:42:58.241Z

- [x] PERF-02-S01: Kosten von owners/Strings/Übertragungen messen.
- [x] PERF-02-S02: Index-/Chunkstrategie nur mit identischem semantischem Ergebnis einführen.
- [ ] PERF-02-S03: Chunk-/Übertragungsstrategie und selektive Neuberechnung mit vollständiger Invalidierungsprüfung ergänzen.

**Abnahme:** Unabhängige Mengen-/Geometrieregressionen; Importlimits bleiben wirksam.

**Nächste Aktion:** Gemessene Structured-Clone-/Worker-Rückgabekosten reduzieren; selektive Geometrie-/Fortschrittsinvalidierung zuerst mit vollständigen semantischen Regressionen absichern.

**Prüfstand:** Interner Indexteil mit 15 passenden bestehenden/neuen Regressionen und sechs hashgleichen Vergleichsausgaben geprüft. Kein Browser-, Chunk- oder selektiver Cache-Nachweis. Gemeinsame vollständige Prüfung mit 377 Node-Tests bestanden.

**Nachweise:** [tests/composition-index.test.mjs](../tests/composition-index.test.mjs) — Vier handberechnete Regressionsgruppen: Koordinaten, Konflikte, NBT, Grenzen.; [scripts/benchmark_composition.mjs](../scripts/benchmark_composition.mjs) — Vorher-/Nachher-Vergleich mit vollständigem Resolutionhash; Node-Szenario.; [docs/architecture/COMPOSITION_PERFORMANCE.md](architecture/COMPOSITION_PERFORMANCE.md) — Abschließender Median 5,2 % niedriger; Streuung und offene Chunk-/Browserabnahme ausdrücklich getrennt.

**Dateiumfang:** `packages/domain/src/compose.ts`, `packages/voxel/`. **Abhängigkeiten:** PERF-01. **Alte IDs:** —.

**Integration:** Main [7dffd92](https://github.com/Freadeax/Minecraft-Bauplaner/commit/7dffd922f46876c70700afc0429afb969e5478aa); Pages-Quelle [7dffd92](https://github.com/Freadeax/Minecraft-Bauplaner/commit/7dffd922f46876c70700afc0429afb969e5478aa).

### PERF-03

**Bundle, große Views und Vorschaucache** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] PERF-03-S01: Bundleanteile und UI-Verantwortungen messen.
- [ ] PERF-03-S02: Views entlang Anwendungsfällen teilen und lazy laden.
- [ ] PERF-03-S03: Versionierten Vorschaucache mit Quota-/Invalidierungsregeln ergänzen.

**Abnahme:** Gemessene Verbesserung statt bloßer Dateiaufteilung; keine verlorenen Filterzustände.

**Nächste Aktion:** Bundleanteile und UI-Verantwortungen messen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `apps/web/src/views/LibraryView.tsx`, `apps/web/src/views/project/`, `vite.config.mjs`. **Abhängigkeiten:** ARCH-01, QA-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### VIEW-01

**Vorhandenen Viewer vollständig abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [x] VIEW-01-S01: Orbit, Freiflug, Schnitte, Picking, Touch, Kulling und Softwarefallback vorhanden.
- [ ] VIEW-01-S02: Aktuelle GPU-/Touch-Prüfung mit negativen Koordinaten und allen Schnittachsen.

**Abnahme:** Sichtbarkeit verändert keine Quelldaten oder Gesamtmengen.

**Nächste Aktion:** Aktuelle GPU-/Touch-Prüfung mit negativen Koordinaten und allen Schnittachsen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** [tests/viewer.test.mjs](../tests/viewer.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `apps/web/src/viewer/`. **Abhängigkeiten:** QA-01. **Alte IDs:** B6, P1-03.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### VIEW-02

**Minecraft-nahe zustandsabhängige Blockformen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude Thread „Blockdarstellung“ (B16) · Aktualisiert: 2026-11-01T13:02:14.162Z

- [x] VIEW-02-S01: B16-Dateizuständigkeit vor Beginn prüfen.
- [x] VIEW-02-S02: Treppen, Stufen, Zäune, Mauern und Glas nach Zuständen darstellen.
- [x] VIEW-02-S03: Picking, Layer, Fallbacks und Performance unabhängig prüfen.
- [x] VIEW-02-S04: Originaltexturen nur im Browser des Nutzers (Mojang-Jar oder eigene Dateien), nichts mitgeliefert.
- [x] VIEW-02-S05: Blockregister 26.3 (1288 Blöcke) und Zustandsregeln für alle ausrichtbaren Blöcke.
- [ ] VIEW-02-S06: Mojang-Download im Browser, Firefox/Safari und echte Geräte prüfen; Registryreport über PROFILE-01 übernehmen.

**Abnahme:** Keine fremden Texturen ohne Rechte; sichtbare Geometrie stimmt mit Zellwahl überein.

**Nächste Aktion:** Mojang-Download im echten Browser und weitere Browser prüfen; Registerdaten an PROFILE-01 binden, sobald es auf main liegt.

**Prüfstand:** Node- und Chromium-Prüfungen bestanden (391 Node, 59 Browser); Mojang-Download im Browser, Firefox/Safari und Geräte offen.

**Nachweise:** [tests/blocks.test.mjs](../tests/blocks.test.mjs) — ZIP, Modelle, Formen aller 1288 Blöcke, Mesh/Kulling, Zustandsregeln.; [tests/e2e/textures.e2e.mjs](../tests/e2e/textures.e2e.mjs) — Texturdialog mit synthetischer Quelle, Speicherung, Entfernen, keine Mojang-Anfrage ohne Klick.; [docs/architecture/BLOCK_MODELS.md](architecture/BLOCK_MODELS.md) — Lizenzentscheidung, Module, Grenzen.

**Dateiumfang:** `apps/web/src/blockmodels/`, `apps/web/src/viewer/`, `apps/web/src/thumbnail/`, `apps/web/src/schem/`, `packages/voxel/src/blockRegistry.ts`, `packages/voxel/src/states.ts`, `scripts/gen_block_data.py`. **Abhängigkeiten:** PROFILE-01, VIEW-01. **Alte IDs:** VIEW-03, B16.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### EDIT-01

**Mehrfachauswahl und sichtbare Freiraumhüllen** · 🚧 In Arbeit · Priorität P1 · Verantwortlich: Claude-Thread „Vollständigen Block-Builder bauen“ · Aktualisiert: 2026-11-01T12:56:16.487Z

- [ ] EDIT-01-S01: Auswahlvertrag und atomare Gruppenoperationen definieren.
- [ ] EDIT-01-S02: Freiraum-/Konflikthüllen und Undo/Redo ergänzen.

**Abnahme:** Keine zweite Transformationslogik; Gruppenaktionen vollständig oder gar nicht.

**Nächste Aktion:** Auswahlvertrag und atomare Gruppenoperationen definieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `apps/web/src/views/project/EditorTab.tsx`, `packages/domain/src/connectors.ts`, `apps/web/src/views/project/selection/`. **Abhängigkeiten:** STORE-02, VIEW-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### EDIT-02

**Blockeditor: Blöcke setzen, entfernen, ersetzen und drehen** · 🚧 In Arbeit · Priorität P1 · Verantwortlich: Claude-Thread „Vollständigen Block-Builder bauen“ · Aktualisiert: 2026-11-01T12:56:16.487Z

- [ ] EDIT-02-S01: Entwurfsvertrag mit invertierbaren Zelländerungen, Undo/Redo und Speichern als neue AssetVersion.
- [ ] EDIT-02-S02: Werkzeuge: Setzen, Abbauen, Pipette, Ersetzen, Quader/Hohlkörper/Wände, Kugel, Zylinder, Linie, Fläche füllen, Drehen, Kopieren/Einfügen/Verschieben.
- [ ] EDIT-02-S03: Blockpalette mit allen Blöcken des Profils, Zustandseditor mit erlaubten Werten und Standardwerten.
- [ ] EDIT-02-S04: Einbindung: Bauteile/Bibliotheksgebäude als neue Version, Projekt-Reiter „Blöcke“ mit Zuordnung zu Instanzen.
- [ ] EDIT-02-S05: Unit-, Browser- und Sichtprüfung, Doku.

**Abnahme:** Gespeicherte Versionen bleiben unverändert; jede Bearbeitung erzeugt eine neue Version, Projekte wechseln nur per invertierbarer Operation. Keine zweite Koordinaten- oder Drehlogik; Zustände ohne Regel bleiben sichtbar ungelöst. Gleiche Eingaben ergeben die gleiche Version (deterministische Palette).

**Nächste Aktion:** Entwurfsvertrag und Werkzeuge umsetzen, Blockregister von VIEW-02 übernehmen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/editor/`, `apps/web/src/editor/`, `apps/web/src/views/project/BlocksTab.tsx`, `tests/editor.test.mjs`, `tests/e2e/editor.e2e.mjs`, `docs/architecture/BLOCK_EDITOR.md`. **Abhängigkeiten:** VIEW-01, STORE-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### UPDATE-01

**Kontrollierte Versionsupdates mit lokalen Overrides** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] UPDATE-01-S01: Updateplan mit Geometrie/Material/Anschluss-/Aufgabendiff erstellen.
- [ ] UPDATE-01-S02: Bewusst übernehmen, einfrieren und zurückkehren ermöglichen.

**Abnahme:** Keine automatischen Updates fester Instanzreferenzen; Teamserver ist keine Voraussetzung.

**Nächste Aktion:** Updateplan mit Geometrie/Material/Anschluss-/Aufgabendiff erstellen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/project.ts`, `packages/application/`. **Abhängigkeiten:** DIFF-01, STORE-02. **Alte IDs:** P5-03.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LIB-02

**Eigene Sammlungen, Ordner und Kategorien** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread Sammlungen und Vorlagen) · Aktualisiert: 2026-11-01T13:30:13.842Z

- [x] LIB-02-S01: B17-Dateizuständigkeit prüfen; Datenmodell und Sicherung erweitern.
- [x] LIB-02-S02: Sammlungen/Kategorien mit Migration und leerem Zustand nutzbar machen.

**Abnahme:** Katalog und eigene Inhalte bleiben dieselbe Bibliothek; referenzierte Versionen erhalten.

**Nächste Aktion:** Abnahme auf echten Geräten (QA-02); Rückmeldung zur Bedienung der Sammlungen einholen.

**Prüfstand:** Node- und lokale Chromium-Browsertests; keine Echtgeräte-/Safari-Abnahme.

**Nachweise:** [tests/collections.test.mjs](../tests/collections.test.mjs) — Domäne, Ordner/Kategorien, Verweisauflösung, Speicher-CAS, Sicherung Format 2 und Wiederherstellung.; [tests/e2e/collections.e2e.mjs](../tests/e2e/collections.e2e.mjs) — Chromium 1400/390 px: Ordner, Unterordner, Gebäude aufnehmen, Version festhalten, Notiz, Katalogfilter, Neuladen, Löschen.; [docs/architecture/COLLECTIONS.md](architecture/COLLECTIONS.md) — Datenmodell, Speicher, Sicherung und Grenzen.

**Dateiumfang:** `packages/domain/`, `apps/web/src/views/library/`. **Abhängigkeiten:** STORE-02, LIB-01. **Alte IDs:** LIB-02, B17.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LIB-03

**Eigene Ensembles und Generatorvorlagen speichern** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread Sammlungen und Vorlagen) · Aktualisiert: 2026-11-01T13:30:13.842Z

- [x] LIB-03-S01: Vorlagen referenzieren feste Versionen bzw. versionierte Generatorparameter.
- [x] LIB-03-S02: Speichern, Bearbeiten, Wiederherstellen und Projektübernahme umsetzen.

**Abnahme:** Vorlagenänderung überschreibt keine bereits übernommenen Projekte.

**Nächste Aktion:** Abnahme auf echten Geräten (QA-02); Vorlagen für Anlagen (Compounds) und BUILD-05 prüfen.

**Prüfstand:** Node- und lokale Chromium-Browsertests; keine Echtgeräte-/Safari-Abnahme.

**Nachweise:** [tests/collections.test.mjs](../tests/collections.test.mjs) — Feste Versionen, Verlauf/Wiederherstellen, Projektübernahme als Kopie, Generatorvorlagen.; [tests/e2e/collections.e2e.mjs](../tests/e2e/collections.e2e.mjs) — Ensemble als Vorlage, Bearbeiten, Wiederherstellen, Projekt bleibt unverändert, Generatorvorlage, Sicherung/Wiederherstellung in frischem Profil.; [tests/e2e/asset-concurrency.e2e.mjs](../tests/e2e/asset-concurrency.e2e.mjs) — IndexedDB-Migration v2→v3 und Revisionsprüfung über zwei Verbindungen.

**Dateiumfang:** `packages/domain/src/ensembles.ts`, `packages/domain/src/generators/`. **Abhängigkeiten:** LIB-02, GEN-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### WORLD-02

**Weitere kuratierte Bauwelten** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Codex Teilagent ui_acceptance · Aktualisiert: 2026-11-01T12:42:58.241Z

- [x] WORLD-02-S01: Abdeckung für fernöstliche Gärten, Wüstenhandel und End prüfen.
- [x] WORLD-02-S02: Nur mit tatsächlichen Treffern und reproduzierbaren Links ergänzen.

**Abnahme:** Keine erfundenen Treffer oder Gebäude; eigene Assets werden konsistent berücksichtigt.

**Nächste Aktion:** Kuratierte Filter-/Treffernachweise bei Katalogänderungen fortführen; keine weitere Karte ohne tatsächliche Assets.

**Prüfstand:** Alle elf Karten geladen; Fernost (3), Wüstenhandel (6), Endposten (2) mit realen Vorschauen, identischen geordneten Treffern nach URL-Reload und 1400/390-px-Sichtprüfung abgenommen. Vier neue Chromiumfälle bestanden. Keine neuen Gebäude oder Spielkompatibilität behauptet.

**Nachweise:** [tests/build-themes.test.mjs](../tests/build-themes.test.mjs) — Prüft elf Welten, reale Facetten, Treffer/Vorschauen der drei neuen Welten, reproduzierbare Links und dass keine Welt eine Stilrichtung ohne Bauteile nennt.; [docs/architecture/BUILD_THEMES.md](architecture/BUILD_THEMES.md) — Abdeckungstabelle der tatsächlichen Treffer je neuer Bauwelt.; [tests/e2e/ui-acceptance.e2e.mjs](../tests/e2e/ui-acceptance.e2e.mjs) — Vier echte Chromiumfälle, Themenmatrix, Mengenerhalt und drei neue kanonische Filterlinks.; [docs/architecture/UI_ACCEPTANCE.md](architecture/UI_ACCEPTANCE.md) — 48 visuell geprüfte Aufnahmen; Desktop und Touchsimulation von echten Geräten getrennt.

**Dateiumfang:** `packages/domain/src/buildThemes.ts`, `tests/build-themes.test.mjs`, `docs/architecture/BUILD_THEMES.md`. **Abhängigkeiten:** LIB-01, UI-01. **Alte IDs:** WORLD-02.

**Integration:** Main [c3e6478](https://github.com/Freadeax/Minecraft-Bauplaner/commit/c3e647855dc3b1bc5417a64cc6350b375b9b510d); Pages-Quelle [c3e6478](https://github.com/Freadeax/Minecraft-Bauplaner/commit/c3e647855dc3b1bc5417a64cc6350b375b9b510d).

### BUILD-05

**Bauwelt-Anlagen mit Konfliktvorschau** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] BUILD-05-S01: Feste AssetVersionen, Abstände und Anschlüsse kuratieren.
- [ ] BUILD-05-S02: Konfliktvorschau und ausdrückliche Projektübernahme anbieten.

**Abnahme:** Themenklick platziert nichts automatisch; tatsächliche Voxelkonflikte geprüft.

**Nächste Aktion:** Feste AssetVersionen, Abstände und Anschlüsse kuratieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/ensembles.ts`, `apps/web/src/views/library/`. **Abhängigkeiten:** LIB-03, CORE-03. **Alte IDs:** BUILD-05.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GEN-02

**Weitere Generatoren und Dachdetails** · 🚧 In Arbeit · Priorität P1 · Verantwortlich: Claude-Thread „Neue Gebäudegeneratoren ergänzen“ · Aktualisiert: 2026-11-01T14:08:37.152Z

- [ ] GEN-02-S01: Treppenhaus, Kirche und Hafen als getrennte Generatoren spezifizieren.
- [ ] GEN-02-S02: Dachtreppen-Eckformen und Anschlüsse profilgenau erzeugen.
- [ ] GEN-02-S03: Treppenhaus-, Kirchen- und Hafengenerator mit Stilen, Vorlagen und Anschlüssen umsetzen.
- [ ] GEN-02-S04: Weitere sinnvolle Generatoren (z. B. Torhaus, Windmühle, Brunnen/Platz) und eine neue Anlage.
- [ ] GEN-02-S05: Unit-/Browserprüfung, Doku, main und Pages.

**Abnahme:** Ganzzahliges Raster, reproduzierbare Parameter, Mengen-/Exportprüfung je Generator.

**Nächste Aktion:** Generatorspezifikation und Umsetzung Treppenhaus, Kirche, Hafen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/generators/`, `apps/web/src/views/library/GeneratorsPage.tsx`, `tests/generators.test.mjs`, `tests/e2e/generators.e2e.mjs`, `docs/architecture/GENERATORS.md`. **Abhängigkeiten:** GEN-01, PROFILE-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### MAP-01

**Weltlage und begehbare Projektkarte** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread Weltkarte) · Aktualisiert: 2026-11-01T13:15:45.514Z

- [x] MAP-01-S01: B15-Konzept und generischer Livekarten-/Markeradapter vorhanden.
- [x] MAP-01-S02: B15-Reservierung vor Übernahme abgleichen.
- [x] MAP-01-S03: Projektursprung/Dimension, Undo und Sicherung ergänzen.
- [x] MAP-01-S04: Draufsicht, Chunkraster, 3D-Ansicht und projektübergreifende Voxelkonflikte umsetzen.

**Abnahme:** Weltkoordinate = Projektkoordinate + Ursprung; fehlendes Terrain ausdrücklich ungeprüft.

**Nächste Aktion:** Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02.

**Prüfstand:** Node- und Browsertests bestanden; Geräte-/Spiel-/Kartenserverabnahme offen.

**Nachweise:** [tests/livemap.test.mjs](../tests/livemap.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/worldmap.test.mjs](../tests/worldmap.test.mjs) — Kernvertrag Weltlage/Weltkarte, 8 Tests.; [tests/e2e/worldmap.e2e.mjs](../tests/e2e/worldmap.e2e.mjs) — Browserablauf 1400/390 px.; [docs/architecture/WORLDMAP.md](architecture/WORLDMAP.md) — Vertrag, Quellen der Linkformate und Grenzen.

**Dateiumfang:** `packages/domain/src/worldmap.ts`, `apps/web/src/views/map/`. **Abhängigkeiten:** CORE-03, STORE-02. **Alte IDs:** B15, B15-L.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### MAP-02

**Gespeicherte Kartenziele und konkrete Provideradapter** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] MAP-02-S01: URL-/Markerformate anhand Primärquellen pro Provider verifizieren.
- [ ] MAP-02-S02: Gespeicherte Ziele, UI-Dateiadapter und eigene Markerdateien anbinden.

**Abnahme:** Keine behauptete BlueMap-/Dynmap-/squaremap-/Pl3xMap-Kompatibilität ohne Formatnachweis.

**Nächste Aktion:** URL-/Markerformate anhand Primärquellen pro Provider verifizieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/livemap.ts`, `apps/web/src/views/map/`. **Abhängigkeiten:** MAP-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-01

**Spielaufnahmen und Soll/Ist-Vergleich** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Aktualisiert: 2026-11-01T12:42:58.241Z

- [x] GAME-01-S01: Vergleich, Originalspeicherung, Verlauf, Ausrichtung und Backup vorhanden.

**Abnahme:** Nicht geladene Zellen sind unbekannt, manuelle Haken werden nur ausdrücklich geändert.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Aufnahmecontroller bleibt beim Neuberechnen und Wechsel auf historische Grundlage erhalten. Tatsächliche Browserregressionen für Soll/Ist-Import, ausdrückliches Abhaken, Originalspeicherung, Ausrichtung, Reload und bytegleichen Download in 54/54-E2E bestanden; keine Mod-/Spielabnahme.

**Nachweise:** [tests/game-check.test.mjs](../tests/game-check.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/scan-persistence.test.mjs](../tests/scan-persistence.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/e2e/game-check.e2e.mjs](../tests/e2e/game-check.e2e.mjs) — Reale Aufnahme gegen eingefrorene Revision, Abweichungszelle und ausdrücklich bestätigte Schritte.; [tests/e2e/scan-persistence.e2e.mjs](../tests/e2e/scan-persistence.e2e.mjs) — Original und Ausrichtung über Speichern/Neuladen hinweg erhalten; Download bytes-identisch.

**Dateiumfang:** `packages/domain/src/gameCheck.ts`, `packages/application/src/scanPersistence.ts`. **Abhängigkeiten:** CORE-02, BUILD-01. **Alte IDs:** B8-M1, B8P.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### GAME-02

**Fabric-Brücke kompilieren und im Spiel abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Fabric-Mod 26.3 bauen und testen“) · Aktualisiert: 2026-11-01T13:33:15.064Z

- [x] GAME-02-S01: Versionsneutraler Java-Kern mit Tests und Fabric-Quelladapter vorhanden.
- [x] GAME-02-S02: Loader-/Versionsstand anhand offizieller Quellen prüfen und Build ermöglichen.
- [x] GAME-02-S03: Plan aufnehmen und Soll/Ist-Vergleich mit echtem Spiel durchführen.
- [ ] GAME-02-S04: Mehrspieler-Abnahme durch den Nutzer auf server.lmnt-gaming.net mit eigenem Bau.

**Abnahme:** Lesende Aufnahme setzt keine Weltblöcke; keine ungeprüfte Kompatibilität.

**Nächste Aktion:** Philipp testet die .jar aus /mnt/project-files/mod/ auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md).

**Prüfstand:** Build, Einzelspieler-Spieltest im echten 26.3-Client und Modpack-Verträglichkeit bestanden; Mehrspieler-Abnahme auf echtem Server durch den Nutzer offen.

**Nachweise:** [mods/bauplaner-bridge/README.md](../mods/bauplaner-bridge/README.md) — Bau, Installation, Befehle, Spieltests.; [scripts/test_bridge_ingame.sh](../scripts/test_bridge_ingame.sh) — Echter Minecraft-26.3-Client (Fabric Client Game Test): Plan per Chat laden, Anker auf angeschauten Block, Aufnahme, Website-Vergleich findet genau 1 falschen und 1 fehlenden Block; zusätzlich als Produktionsstart mit allen 21 Mods aus Philipps Modpack.; [docs/TESTING.md](TESTING.md) — Befehle, Ergebnisse und Grenzen des Spieltests (01.11.2026).

**Dateiumfang:** `mods/bauplaner-bridge/`, `scripts/test_bridge.sh`, `scripts/test_bridge_ingame.sh`, `scripts/bridge_crosscheck.mjs`, `scripts/bridge_gametest.mjs`. **Abhängigkeiten:** FORMAT-01, GAME-01. **Alte IDs:** B8-M2, P6-01.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### GAME-03

**Optionale lokale Verbindung und Anzeige im Spiel** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] GAME-03-S01: Loopback-Sicherheitsvertrag mit expliziter Kopplung definieren.
- [ ] GAME-03-S02: Planübertragung und Bestätigungen getrennt von Weltänderungen umsetzen.

**Abnahme:** Keine unautorisierte Fernverbindung; Overlay ist kein serverseitiger Blocksetter.

**Nächste Aktion:** Loopback-Sicherheitsvertrag mit expliziter Kopplung definieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `mods/bauplaner-bridge/`, `packages/application/`. **Abhängigkeiten:** GAME-02. **Alte IDs:** B8-M3, B8-M4.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### WORLD-IMPORT-01

**Bereichsweiser Weltimport und Terrainprüfung** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] WORLD-IMPORT-01-S01: Konsistentes Sicherungsformat und Bereichsauswahl festlegen.
- [ ] WORLD-IMPORT-01-S02: Begrenzten Adapter, Terrain-/Fundamentprüfung und Lastszenarien implementieren.

**Abnahme:** Keine unbeschränkte Vollwelt im Browser; unbekanntes Terrain bleibt ungeprüft.

**Nächste Aktion:** Konsistentes Sicherungsformat und Bereichsauswahl festlegen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/formats/`, `packages/voxel/`. **Abhängigkeiten:** PROFILE-01, PERF-02, FORMAT-01. **Alte IDs:** P7-01.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### BACKUP-02

**Sicherungserinnerung und Abschnittsrevisionen** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] BACKUP-02-S01: Letzte erfolgreiche Sicherung mit Datenänderungen vergleichen.
- [ ] BACKUP-02-S02: Abschnittsstand reproduzierbar einfrieren und wiederfinden.

**Abnahme:** Erinnerung behauptet keine Cloudkopie; keine stillen Abschnittsänderungen.

**Nächste Aktion:** Letzte erfolgreiche Sicherung mit Datenänderungen vergleichen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/site.ts`, `apps/web/src/views/project/`. **Abhängigkeiten:** STORE-01, BUILD-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### TEAM-01

**Backendvertrag, Datenbank und Payloadspeicher** · ⏳ Offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] TEAM-01-S01: API, Betriebsmodell und Kostenrahmen dokumentieren.
- [ ] TEAM-01-S02: PostgreSQL-Metadaten und dauerhaften Objektspeicher mit Integrität/Backup aufbauen.

**Abnahme:** Pages bleibt statisches Frontend; kein Geheimnis im Client oder Repo.

**Nächste Aktion:** API, Betriebsmodell und Kostenrahmen dokumentieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `docs/architecture/`, `packages/application/`. **Abhängigkeiten:** ARCH-01, FORMAT-01, STORE-02, LICENSE-01. **Alte IDs:** P4-01.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### AUTH-01

**Konten, Rechte und Übernahme lokaler Projekte** · ⏳ Offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] AUTH-01-S01: Gast-/Kontovertrag und serverseitige Rechte definieren.
- [ ] AUTH-01-S02: Freigaben, Rollen, Rechtewechsel und kontrollierten lokalen Import prüfen.

**Abnahme:** Keine fremden Projektzugriffe; Gastmodus bleibt lokal nutzbar.

**Nächste Aktion:** Gast-/Kontovertrag und serverseitige Rechte definieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/application/`, `apps/web/src/`. **Abhängigkeiten:** TEAM-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### TEAM-02

**Geordnete Operationen, Reconnect und Team-Undo** · ⏳ Offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] TEAM-02-S01: Operation-ID, Revisionsprüfung und Wiederholung serverseitig umsetzen.
- [ ] TEAM-02-S02: Konkurrierende Änderungen, Reconnect und geprüfte Gegenoperationen testen.

**Abnahme:** Kein stiller Verlust und kein Überschreiben fremder Operationen.

**Nächste Aktion:** Operation-ID, Revisionsprüfung und Wiederholung serverseitig umsetzen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/application/`, `packages/domain/src/project.ts`. **Abhängigkeiten:** AUTH-01, UPDATE-01. **Alte IDs:** P4-02.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### TEAM-03

**Gemeinsame Aufgaben, Abschnitte und Sammelplanung** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] TEAM-03-S01: Zuständigkeiten und Lagerbuchungen versionieren.
- [ ] TEAM-03-S02: Abschnitte und Sammelaufträge mehreren Spielern zuweisen.

**Abnahme:** Planung, manuelle Bestätigung und Spielnachweis bleiben getrennt.

**Nächste Aktion:** Zuständigkeiten und Lagerbuchungen versionieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/site.ts`, `packages/application/`. **Abhängigkeiten:** TEAM-02, BUILD-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-04

**Paper-/NeoForge-Adapter und sichere Serveranbindung** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] GAME-04-S01: Loader getrennt spezifizieren; zuerst einen weiteren Adapter vollständig prüfen.
- [ ] GAME-04-S02: Signierte Webhooks, Ereignis-ID und wiederholbare Verarbeitung ergänzen.

**Abnahme:** Keine impliziten Weltänderungen; Planlieferung und Blocksetzen getrennt.

**Nächste Aktion:** Loader getrennt spezifizieren; zuerst einen weiteren Adapter vollständig prüfen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `mods/`, `packages/application/`. **Abhängigkeiten:** TEAM-02, GAME-02. **Alte IDs:** P6-01.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LAGER-01

**Optionale Truhen-/Lagerintegration** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] LAGER-01-S01: Inventar-/NBT-Rechte und Herkunft der Aufnahme festlegen.
- [ ] LAGER-01-S02: Bestand mit Zeitpunkt, Konflikten und ausdrücklicher Übernahme anzeigen.

**Abnahme:** Keine doppelte Inventarquelle; Aufnahmezeit und ungeprüfte Werte sichtbar.

**Nächste Aktion:** Inventar-/NBT-Rechte und Herkunft der Aufnahme festlegen.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/site.ts`, `mods/`. **Abhängigkeiten:** TEAM-03, GAME-04. **Alte IDs:** P6-02.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### OPS-04

**Teamdienst betreiben und Wiederherstellung prüfen** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] OPS-04-S01: Monitoring, Datenmigration, Lösch-/Aufbewahrung und Wiederanlauf definieren.
- [ ] OPS-04-S02: Wiederherstellung mit getrenntem Metadaten-/Objektspeicher testen.

**Abnahme:** Kein produktiver Teamstart ohne Rechte- und Restoreprüfung.

**Nächste Aktion:** Monitoring, Datenmigration, Lösch-/Aufbewahrung und Wiederanlauf definieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `docs/operations/`. **Abhängigkeiten:** TEAM-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### DEFER-01

**GitHub-Login, externes Materialrepo und Registry** · ⏸ Zurückgestellt · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] DEFER-01-S01: Nur nach neuem ausdrücklichem Nutzerauftrag neu bewerten.

**Abnahme:** Aktuell kein zusätzliches Repo, keine externe Registry, kein produktives GitHub-OAuth.

**Nächste Aktion:** Nur nach neuem ausdrücklichem Nutzerauftrag neu bewerten.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `docs/NOVEMBER_EXPANSION.md`. **Abhängigkeiten:** keine. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### DEFER-02

**Optionale Discord-Integration** · ⏸ Zurückgestellt · Priorität P1 · Verantwortlich: nicht zugewiesen · Aktualisiert: 2026-11-01T06:15:35+01:00

- [ ] DEFER-02-S01: Erst bei konkretem Bedarf und ausdrücklichem Auftrag spezifizieren.

**Abnahme:** Keine automatischen Nachrichten und keine abgeleiteten Rechte ohne Vertrag.

**Nächste Aktion:** Erst bei konkretem Bedarf und ausdrücklichem Auftrag spezifizieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `docs/architecture/`. **Abhängigkeiten:** AUTH-01. **Alte IDs:** P6-02.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LIB-04

**Gebäudebibliothek v3: Inhalte in alle Richtungen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude Thread Bibliothek erweitern · Aktualisiert: 2026-11-01T13:36:58.036Z

- [x] LIB-04-S01: Neue Kategorien/Stile/Funktionen, Möbel- und Zustandshelfer (furnish.ts) passend zu den B7-Regeln von main.
- [x] LIB-04-S02: Neue Themen-Sets: Interieur, Garten, Natur, Stadt, Küste, Fahrzeuge, Untergrund, Nether/End, Hof, Technik, Fantasy, Epochen.
- [x] LIB-04-S03: Biom-Stile als Materialfamilien und neue Ensembles.
- [x] LIB-04-S04: Katalogtests, Vorschaubild-Sichtprüfung, Doku, main und Pages.

**Abnahme:** Nur eigene Entwürfe; jede neue Version im B7-Schema drehbar/spiegelbar, keine stillen Material-/Rezeptlücken, bestehende Versions-IDs unverändert.

**Nächste Aktion:** Weitere Ensembles und Tipps nach Spielrückmeldung; Redstone-Bauten im Spiel abnehmen.

**Prüfstand:** Node-Katalogtests und Vorschaubild-Sichtprüfung bestanden; Redstone-Bauten nicht im Spiel abgenommen.

**Nachweise:** [tests/catalog.test.mjs](../tests/catalog.test.mjs) — Alle 336 Gebäude: Schema, vier Drehungen, doppelte Spiegelung, Material-/Rezeptlücken, Ensembles.; [packages/domain/src/build/sets/index.ts](../packages/domain/src/build/sets/index.ts) — 12 neue Sets (159 Gebäude) plus 20 Materialvarianten.; [docs/architecture/CATALOG.md](architecture/CATALOG.md) — Abschnitt Katalog v3 mit Sets, Facetten, Ensembles und Grenzen.

**Dateiumfang:** `packages/domain/src/build/`, `packages/domain/src/catalog.ts`, `packages/domain/src/ensembles.ts`, `docs/architecture/CATALOG.md`, `apps/web/src/colors.ts`. **Abhängigkeiten:** LIB-01. **Alte IDs:** B9-B.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

## Weiterführende Dokumente

- [Änderungsverlauf mit Dateien und Aufgabenständen](ROADMAP_HISTORY.md)
- [Aktueller Systemstatus](STATUS.md)
- [Tests und Prüfgrenzen](TESTING.md)
- [Historische Roadmap, nicht mehr steuernd](ROADMAP_LEGACY.md)
- [Modulvertrag](architecture/MODULES.md)
- [Entwicklungskoordination](COMMUNICATION.md)
