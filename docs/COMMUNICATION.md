# Entwicklungskoordination

Dieses Dokument koordiniert Menschen und Coding-Agenten während aktiver Arbeit. Es startet keine Hintergrundüberwachung.

## Protokoll

Vor einem Arbeitsblock offene Nachrichten und Dateireservierungen lesen. Eintrag mit eindeutiger ID, Autor, Zeit einschließlich Zeitzone, Aufgabe, Dateien, Status und nächstem Schritt anlegen. Nach dem Block und vor Commit/Push Antworten und Status aktualisieren. Auf Fragen mit `Antwort auf MSG-...` Bezug nehmen. Bestehende Nachrichten nicht nachträglich sinnumdeuten; Korrekturen als neuen Eintrag ergänzen.

Reservierungen haben Gültigkeitsende und dienen der Abstimmung; sie sind keine technische Sperre. Bei abgelaufener Reservierung vorhandene Änderungen prüfen und bei Überschneidung abstimmen. Eine laufende fremde Bearbeitung nicht wegen abgelaufener Zeit überschreiben.

## Aktive Arbeit

| Aufgabe | Verantwortlich | Dateien | Status | Reservierung bis |
|---|---|---|---|---|
| Voxelvertrag und Kernstart P0-02/P0-03 | ChatGPT | packages/voxel, Tests/Fixtures, Architektur, Regeln, Prüfprotokoll | implementiert, geprüft und mit PR #1 in main integriert | beendet |
| Prüfstrategie ohne Actions | ChatGPT | Regeln, Dokumentation, Prüfer, Workflow | abgeschlossen mit diesem Stand | beendet |

## Nachrichten

### MSG-0001 · ChatGPT · 2026-10-27 · Planungsgrundlage

- Anlass: Nutzerauftrag zur vollständigen Planung für Freadeax/Minecraft-Bauplaner und festen Regeln für das GPT-Projekt.
- Ergebnis: Architektur, Grundsätze, Agentenregeln, Roadmap, Anforderungen und GPT-Anweisung vorbereitet.
- Bestandsaufnahme nach GitHub-Verbindung: privat, main, nur initiale README; Schreibrecht vorhanden, main als ungeschützt gemeldet. Ruleset-Abfrage ist tarifbedingt nicht verfügbar.
- Integration: dokumentierte Grundlage direkt auf main veröffentlichen; Commit-ID und CI-Ergebnis im Abschluss nennen.
- Nächste Aufgabe: P0-02 und P0-03, normativer Voxelvertrag und unabhängige Fixtures.
- Offene technische Entscheidungen: genaue Minecraft-Version/Modpack, Hostingprofil, erster Serveradapter und Projektlizenz.

### MSG-0002 · ChatGPT · 2026-10-27 · Prüfungen selbst ausführen

- Nutzerentscheidung: GitHub Actions können nicht genutzt werden; der Agent übernimmt die Prüfungen selbst.
- Umsetzung: Workflow entfernt; AGENTS, GPT-Anweisung, README und Beitragsregeln auf eigenständige Ausführung umgestellt. docs/TESTING.md dokumentiert Befehle, Ergebnisse und Grenzen.
- Qualitätsanforderungen bleiben bestehen. Keine externe CI und keine unbestätigten Prüfergebnisse voraussetzen.
- Nächste Aufgabe bleibt P0-02/P0-03.

### MSG-0003 · ChatGPT · 2026-10-27T00:35:00+01:00 · P0-02/P0-03 und Kernstart

- Status: in Arbeit; Reservierung bis 2026-10-27T02:35:00+01:00.
- Ziel: normativer Voxelvertrag, typisierter Datenkern und unabhängige handberechnete Fixtures; keine Versionskompatibilität voraussetzen.
- Dateien: packages/voxel/**, tests/**, fixtures/**, package.json, package-lock.json, tsconfig.json, .gitignore, docs/architecture/VOXEL_CONTRACT.md, README, STATUS, ROADMAP, TESTING, DECISIONS und dieses Protokoll.
- Prüfung: TypeScript strict, Node-Testläufe, Build und vorhandener Dokumentationsprüfer. Keine GitHub Actions, keine Veröffentlichung einer Website.
- Zugriff: authentifizierter GitHub-Dateisnapshot von main; direkter Git-Clone ohne Shell-Zugangsdaten nicht möglich. Integration erfolgt über GitHub-Gitobjekte mit explizitem Elterncommit und ohne Force-Update.

### MSG-0004 · ChatGPT · 2026-10-27T00:44:44+01:00 · Hostingzusatz und Kernabschluss

- Nutzerzusatz: Website über GitHub Pages. ADR-003/004 konkretisiert und ADR-011/HOSTING ergänzt; GPT-Anweisung, README, STATUS, ROADMAP und Spezifikation nachgeführt. Keine eigene Actions-Konfiguration. GitHubs interner Pages-Deploy bleibt laut Primärquelle erforderlich; echtes Hosting noch nicht eingerichtet.
- Antwort auf MSG-0003: Voxelvertrag, Immutable-Snapshots, begrenzter Transformationskatalog, Layerauswahl und Blockzustandszählung implementiert. 43 lokale Node-Tests sowie Typ-/Buildprüfung bestanden. Dokumentationsprüfer zunächst wegen Drittanbieter-Markdown fehlgeschlagen; auf eigene Quellen begrenzt und danach bestanden.
- Integration: direkte Aktualisierung von main durch automatische Freigabeprüfung abgelehnt, da keine ausdrückliche main-Push-Freigabe erkannt wurde. Reviewbranch codex/voxel-core angelegt; keine Änderungen an main, kein Deployment/Release.
- Reservierung beendet; kein Hintergrundprozess. Nächster Schritt P1-01 mit unabhängigem Schem-Binärfixture und Browser-Worker-Vertrag. P1-02/P1-04 bleiben teilweise umgesetzt.

### MSG-0005 · ChatGPT · 2026-10-27T00:46:30+01:00 · Reviewübergabe

- Implementierung auf codex/voxel-core gepusht: `94e9a6e4f0ad702660389fca423b426647b9ce90`. [Draft-PR #1](https://github.com/Freadeax/Minecraft-Bauplaner/pull/1) enthält das vollständige Paket.
- Remote-Tree entspricht exakt dem lokal geprüften Tree `db0bad8b4de656bab8f8ee155da7f25fa30c3a26`; Branch ohne Force aktualisiert, main unverändert.
- Dokumentationsnachtrag stellt Integrationsstatus richtig; keine weiteren Codeänderungen. Keine fremde Aufgabe aktiv, keine dauerhafte Überwachung. Nächster Arbeitsschritt bleibt P1-01.

### MSG-0006 · ChatGPT · 2026-10-27T00:51:36+01:00 · Main-Freigabe und Integration

- Nutzerentscheidung: „Du hast jegliche Main merge freigabe!“ Gilt für dieses Repository; nach bestandenen lokalen Prüfungen sind Main-Merges und reguläre Main-Integrationen ohne erneute Rückfrage autorisiert. Schutzregeln bleiben einzuhalten; kein Force-Push.
- Arbeitsblock: PR #1 integrieren; Freigabe in AGENTS und GPT-Anweisungsdatei festhalten, STATUS/TESTING/Kommunikation aktualisieren. Reservierung für diese Dokumente bis zum Abschluss dieses Integrationsblocks.
- Prüfung vor Integration: Remote-main unverändert, PR konfliktfrei, Head 0ee1a77b8ce8a4c23ef8eda4b9282a9a66b94e19. Remote-Tree stimmt exakt mit lokalem geprüftem Stand überein; keine Codeänderungen seit den 43 bestandenen Tests.

- Ergebnis zu MSG-0006: PR #1 nach Ready-Markierung erfolgreich mit erwartetem Head gemergt; Mergecommit `e791d68dda1b982e4e3e99536ba23ed80a61e749`. Merge-Tree `dc0f6cc26ef3265381166ec2230b9bcf424c3cbf` entspricht exakt dem zuvor geprüften Stand. Freigabe in AGENTS und GPT-Anweisungsdatei festgehalten; GPT-Einstellungen selbst nicht automatisch geändert. Dokumentationsnachtrag wird regulär auf main integriert. Reservierung beendet; kein Deployment/Release, kein Hintergrundprozess.

### MSG-0007 · ChatGPT · 2026-10-27T00:55:56+01:00 · Veröffentlichung nach Main-Integration

- Nutzerentscheidung: Nach jedem neuen Merge/Push auf main sofort den passenden geprüften Website-Build über GitHub Pages veröffentlichen. Dauerhafte Autorisierung für diesen Veröffentlichungsablauf, keine erneute Rückfrage bei regulären Updates.
- Arbeitsblock: Regel in AGENTS, GPT-Anweisungsdatei und HOSTING verankern, STATUS und TESTING nachführen; Reservierung dieser Dateien bis Abschluss.
- Aktuelle Grenze: Es existiert noch kein statischer Website-Build. Der GitHub-Connector bietet keine Pages-Konfigurationsaktion; der Abruf von /pages wird von der erlaubten Endpunktliste abgewiesen. Es wurde keine Pages-Einstellung oder tatsächliche Veröffentlichung bestätigt. Keine bloße Dokumentation als Bauhelfer-Website publizieren.

- Ergebnis zu MSG-0007: Veröffentlichungspflicht in Repository-Regeln, GPT-Anweisungsdatei und HOSTING festgehalten; Dokumentationsprüfungen bestanden. Main-Dokumentationsupdate vorgesehen, Pages derzeit nicht aktualisierbar: Webbuild fehlt und Pages-Konfiguration nicht über Connector verfügbar. Reservierung beendet, kein Hintergrundprozess.

### MSG-0008 · ChatGPT · 2026-10-27T01:01:30+01:00 · Vollständiger selbstständiger Konnektorplan

- Nutzerauftrag: Gesamtplanung so ausarbeiten, dass der Agent GitHub über den verbundenen Konnektor selbst bedient. Arbeitsumfang: IMPLEMENTATION_PLAN, Konnektor-Runbook, Verweise in AGENTS/README/HOSTING/ROADMAP/STATUS und TESTING. Reservierung bis Abschluss dieses Blocks.
- Nachweis: get_repo bestätigt admin/maintain/push; aktuelle Schemas erlauben Gitblobs einschließlich base64, Trees, Commits, Refupdates mit expected_sha sowie PR-Merges. Main und lokaler Ausgangstree identisch. Keine neue Pages-Konfigurationsaktion vorhanden.

- Ergebnis zu MSG-0008: Zwei vollständige Planungsdokumente mit ausführbarer Schrittfolge, Abnahmekriterien und Fähigkeitsgrenzen erstellt; zugehörige Verweise/Status aktualisiert. Dokumentations-/Whitespaceprüfung bestanden. Keine neue Appfunktion und kein Livebetrieb behauptet. Reservierung beendet. Nächste Umsetzung: P1-01a/01b und nutzbare statische Kernansicht P1-03a; HP-01/02 schließen unmittelbar an den Webbuild an.

### MSG-0009 · ChatGPT · 2026-10-27T07:12:48+01:00 · Erste echte Pages-Kernansicht

- Auftrag: erneut prüfen und Pages starten; Nutzer hat Repository öffentlich geschaltet. Konnektor bestätigt visibility=public. Browser zeigt Pages bisher deaktiviert, authentifizierte Einstellungen zugänglich.
- Arbeitsumfang: apps/web, Webbuild-/Manifestskript, Paket-/TS-Konfiguration, Tests und relevante Status-/Hosting-/Prüfdokumentation. Reservierung bis Abschluss.
- Ziel P1-03a/HP-01/02/03: bedienbare 3D-Demo mit Schichten und Zählung aus gemeinsamem Kern; geprüften statischen Build auf gh-pages übertragen und Quelle über Browser aktivieren. Schem-Import/Export und vollständiger Composer bleiben offen. Keine eigenen Actions.

- Zwischenstand zu MSG-0009: Webansicht und Artefaktmanifest implementiert, 45 lokale Tests/Typ-/Build-/Dokumentationsprüfungen bestanden. Authentifizierte Pages-UI zugänglich; kein Loginblocker. Lokaler Browserzugriff auf Container nicht möglich, echte Liveprüfung nach Bootstrap vorgesehen. Keine fremden Reservierungen oder neuen Remoteänderungen festgestellt.

- Live-Zwischenprüfung zu MSG-0009: gh-pages erstellt; Pages-UI zeigt jetzt Quelle gh-pages / root und aktiven Build. Öffentliche URL lädt die App. Live-Schichtprüfung: Y=10 liefert 26 sichtbare bei unverändert 425 Gesamtblöcken; Rotation ändert Achsen korrekt. Kein WebGL im Prüf-Browser, daher Canvas-Isometrie als ausdrücklich benannte Ersatzansicht ergänzt.

### MSG-0010 · ChatGPT · 2026-10-27T07:37:23+01:00 · Pages live

- Antwort auf MSG-0009: Erste Website öffentlich gestartet, Pages-Quelle gh-pages / root im Browser bestätigt. Eigenes synthetisches Hafenhaus, Schichten, Mengen, JSON-Worker/-Sicherung und WebGL-/Softwareansicht implementiert.
- Vollständige lokale Prüfung 45/45 bestanden. Live sichtbares Bauwerk, Picking, Y-Schicht 26/425 und Rotation geprüft. Canvas-DOM-Konflikt gefunden/behoben; GPU-WebGL und echte Mobil-/Dateidialogtests offen.
- Code auf main integriert; Artefaktupdates ohne Force über Konnektor. Interner Pages-Deploymentlauf erfolgreich. Abschlussdokumentation wird mit neuem Manifest erneut veröffentlicht; kein eigener Workflow und kein externer Monitor. Reservierungen beendet. Nächster Kernschritt bleibt echter Schem-v3-Import.

### MSG-0011 · ChatGPT · 2026-10-27T07:45:58+01:00 · Strukturprüfung und Schem-v3-Import

- Auftrag: gesamten Stand erneut anhand Regeln/Roadmap prüfen und weiterentwickeln. Main 23c43fcc12a4ba0e1f3bfd72c44f43bfadbc034d; lokaler Arbeitsbaum sauber.
- Reservierung: packages/formats, unabhängige binäre Fixtures/Tests, Browser-Importworker/-Dialog/-Bericht, Buildkonfiguration, Status/Roadmap/Anforderungen/Prüfprotokoll.
- Schwerpunkt P1-01: begrenzter Big-Endian-NBT-/GZip-/Sponge-v3-Reader, Originalerhalt, vollständiger Zustands-/BlockEntity-Erhalt und sichtbare Grenzen. Offizielle Sponge-v3-Spezifikation über GitHub gelesen. Kein Writer oder allgemeiner Versionskonverter.
- Prüfplan: unabhängiger Python-Fixturewriter, konkrete erwartete Zellen/Typen, beschädigte Daten und Limits; gesamte Kern-/Webprüfung; Main-Integration und unmittelbare Pages-Veröffentlichung, Liveprüfung. Veraltete Statusaussagen bereinigen.

- Steuerung zu MSG-0011: Nutzer verlangt aktuellen Block abschließen und warten. Umsetzung auf Importkern, Einbindung, Prüfungen und unmittelbare Veröffentlichung begrenzt. Keine weiteren Arbeitspakete starten. Lokale Prüfung 72/72 bestanden; Dokumentation/Strukturreview aktualisiert. Live-Workerprüfung folgt nach Deployment, danach Bearbeitung beendet.

### MSG-0012 · ChatGPT · 2026-10-27T08:00:47+01:00 · Importblock abgeschlossen, warten

- Antwort auf MSG-0011 und Nutzersteuerung: begrenzter Schem-v3-Reader samt Originalerhalt, Importbericht, Workerintegration, unabhängigen Binärfixtures und Strukturreview fertiggestellt.
- 72 lokale Tests/Typ-/Build-/Dokumentationsprüfungen bestanden. Live-Import über echte Workerstrecke: 7 Blöcke, 5 Luft, 3×2×2, BE=1, Offset −10/64/30, DataVersion 3465 und erwarteter SHA-256. Rotation und Layer sowie ungelöste Mod-/NBT-Regeln korrekt sichtbar.
- Main/Pages-Codequellstand bdcaee6f873c1abc9e6da4d648b8c940bc02e77a; finaler Dokumentationsnachtrag wird regulär veröffentlicht, Quelle danach im Live-Manifest. Grenzen: synthetische Fixture, keine echte WorldEdit-/Spiel-/GPU-/iPhone-Dateidialogabnahme.
- Alle Reservierungen beendet. Kein neues Arbeitspaket gestartet. Bearbeitung endet nach bestätigtem Abschlussdeploy; kein Hintergrundprozess. Warten auf neuen Nutzerauftrag.

### MSG-0012 · Claude · 2026-10-27T08:05:00+01:00 · Fundament B0 und Blockplan

- Nutzerauftrag: gesamtes Repository sichten, benötigte Systeme selbstständig ausarbeiten, strukturiert mit mehreren parallelen Threads. Arbeit direkt auf main, danach Pages.
- Ausgangsstand main d8dd9dc (72 Tests grün). Keine fremden Reservierungen aktiv.
- Umfang B0: `packages/domain`, Vanilla-Regel in `packages/voxel/src/transforms.ts`, Web-Grundgerüst (`apps/web/src/app`, `views`, Viewer-Farbschnittstelle), `tests/domain.test.mjs`, `tests/e2e`, `scripts/publish_pages.sh`, Dokumentation.
- Ergebnis: siehe TESTING. Blöcke B1–B7 mit Dateizuständigkeiten in docs/BLOCKS.md; jeder Block meldet sich hier mit eigenem MSG-Eintrag an.

### MSG-B4-01 · Claude · 2026-10-27T13:20:00+01:00 · Block B4 Bauanleitung abgeschlossen

- Auftrag laut [BLOCKS](BLOCKS.md) B4 (P3-02, R-007). Grundlage main 3584213, keine fremden Änderungen seitdem.
- Geänderte Dateien: eigene `packages/domain/src/guide.ts`, `tests/guide.test.mjs`, `tests/e2e/guide.e2e.mjs`, `apps/web/src/views/project/BuildTab.tsx`, `docs/architecture/GUIDE.md`; gemeinsame Dateien nur angehängt: zwei Exportzeilen in `packages/domain/src/index.ts`, ein Registry-Eintrag in `tabs.ts`, eigener CSS-Abschnitt „B4 · Bauanleitung“, eigene Zeilen in STATUS/ROADMAP/REVIEW, Abschnitt in TESTING.
- Hinweis an B1: Schritte liefern `materials` als Blockzustände je Schritt; eine Itemspalte kann später `materials.ts` auf `step.materials` anwenden, ohne Guide-Logik zu ändern.
- Reservierung beendet.
### MSG-B2-01 · Claude · 2026-10-27T13:30:00+01:00 · Block B2 Schem-v3-Export abgeschlossen

- Auftrag laut [BLOCKS](BLOCKS.md) B2 / P3-01. Dateien: `packages/formats/src/nbtWrite.ts`, `schemWrite.ts`, `packages/domain/src/schemExport.ts` (neu), Exportzeilen in beiden `index.ts`, `scripts/verify_schem.py`, `tests/schem-export.test.mjs`, `tests/e2e/export.e2e.mjs`, `views/project/ExportTab.tsx`, ein Eintrag in `tabs.ts`, eigener CSS-Abschnitt, `docs/architecture/SCHEM_EXPORT.md`, eigene Zeilen in STATUS/ROADMAP/REVIEW/TESTING.
- Ergebnis: Writer, Exportsperre, Revision einfrieren/wiederverwenden, reproduzierbare Datei, Bericht mit Offset und Luft-/Lösch-/Lückenpolitik; Prüfungen siehe TESTING. Reservierung mit dem Push beendet.
### MSG-B1-01 · Claude · 2026-10-27T13:45:00+01:00 · Block B1 Materialbedarf abgeschlossen

- Auftrag laut [BLOCKS](BLOCKS.md) B1 (P1-04a, R-017). Grundlage main 29d03ed (B0, B4, B2).
- Geänderte Dateien: eigene `packages/domain/src/materials.ts`, `tests/materials.test.mjs`, `tests/e2e/materials.e2e.mjs`, `apps/web/src/views/project/MaterialsTab.tsx`, `docs/architecture/MATERIALS.md`; gemeinsame Dateien nur angehängt: zwei Exportzeilen in `packages/domain/src/index.ts`, ein Registry-Eintrag in `tabs.ts`, CSS-Abschnitt „B1 · Materialbedarf“, eigene Zeilen in STATUS/ROADMAP/REVIEW, Abschnitt in TESTING.
- Antwort auf MSG-B4-01: `itemsForCell` und `computeMaterials` sind exportiert; eine Itemspalte in der Bauanleitung kann sie auf `step.materials` anwenden (Änderung in B4-Dateien, nicht hier vorgenommen).
- Nach Rebase auf 29c0d05 (Itemkatalog v2): Rezepte bzw. Rohstoffeinträge für die neuen v2-Items ergänzt; offen als „kein Rezept“ bleiben angeschlagene Ambosse, Kupferkiste, Froschlaich, gefüllte Kessel.
- Reservierung mit dem Push beendet.


### MSG-B7-01 · Claude · 2026-10-27T13:50:00+01:00 · Zustandskatalog Drehen/Spiegeln (B7, P1-02a)

- Umfang laut BLOCKS: `packages/voxel/src/states.ts` (neu), `transforms.ts`, Exportzeilen in `packages/voxel/src/index.ts`, `tests/states.test.mjs`, Abschnitt in VOXEL_CONTRACT, eigene Zeilen in STATUS/ROADMAP/TESTING.
- Ergebnis: 75 Familienregeln, 595 Vanilla-IDs mit exaktem Schema; Unbekanntes, Schemaabweichungen und nicht darstellbare Spiegelungen bleiben ungelöst mit Grund. Öffentliche API unverändert kompatibel, zusätzlich `family`/`reason`, `transformDirection`, `stateCatalog`, `stateRuleFor`.
- Prüfung siehe TESTING. Reservierung nach Push und Pages-Veröffentlichung beendet.
### MSG-B3-01 · Claude · 2026-10-27T08:30:00+01:00 · Block B3 Speicherung/Backup angemeldet

- Auftrag laut [Blockplan](BLOCKS.md) B3 (P2-01, R-023/R-024). Ausgangsstand main 3584213.
- Dateien: `apps/web/src/app/idbRepository.ts` (neu), `apps/web/src/app/repository.ts` (Speicherschnittstelle um Originale und atomare Sammelschreibung erweitert, `openRepository`), `packages/domain/src/backup.ts`, `tests/backup.test.mjs`, `tests/e2e/persistence.e2e.mjs`, Backup-UI in `ProjectsView.tsx`, `docs/architecture/PERSISTENCE.md`. Abgestimmte Kleinständerung außerhalb: Importspeicherung in `LibraryView.tsx` (`saveNew`/`saveVersion`) auf atomare Sammelschreibung mit Originaldatei umgestellt – nur diese zwei Funktionen.
- Ergebnis zu MSG-B3-01: IndexedDB-Repository mit Migrationstabelle, atomarer Sammelschreibung (`applyBatch`), `baseRevision`-Konflikten, BroadcastChannel-Aktualisierung, Originalen als Blobs; Sicherungsformat v1 mit Prüfsummen und Wiederherstellungsplan ohne stilles Überschreiben ([PERSISTENCE](architecture/PERSISTENCE.md)). Prüfungen siehe TESTING.
- Hinweis an alle Blöcke: `Repository` hat neue Pflichtmethoden (`applyBatch`, `getOriginal`, `listOriginalHashes`, `subscribe`, `storageInfo`, `requestPersistence`); `MemoryRepository` implementiert sie. Mehrere zusammengehörige Schreibvorgänge bitte über `applyBatch`. Außerhalb eigener Dateien geändert: `LibraryView.tsx` (`saveNew`/`saveVersion` + `originalOf`), `context.tsx` (eine Abo-Zeile für Bibliotheksänderungen anderer Tabs), ein Satz in `DOMAIN.md` zur Speichergrenze.
- Nach Rebase auf 29c0d05 (Itemkatalog v2): Rezepte bzw. Rohstoffeinträge für die neuen v2-Items ergänzt; offen als „kein Rezept“ bleiben angeschlagene Ambosse, Kupferkiste, Froschlaich, gefüllte Kessel.
- Reservierung mit dem Push beendet.

### MSG-B5 · Claude · 2026-10-27 · Block B5 Anschlüsse, Snap und Bereich als Bauteil

- Umfang laut [BLOCKS](BLOCKS.md): `packages/domain/src/connectors.ts`, `tests/connectors.test.mjs`, `tests/e2e/snap.e2e.mjs`, `views/project/SnapPanel.tsx` (Einbindung in `EditorTab.tsx`), `views/library/ConnectorEditor.tsx` und `CropPanel.tsx` (Einbindung in `LibraryView.tsx`), `docs/architecture/CONNECTORS.md`, eigene Zeilen in STATUS/ROADMAP/REQUIREMENTS/REVIEW, eigener CSS-Abschnitt.
- Ergebnis: siehe TESTING. Rebase auf B1/B3/B7 ohne fachliche Konflikte (nur angehängte Exporte, CSS- und Dokumentzeilen zusammengeführt). Reservierung nach Push und Pages-Prüfung beendet.

### MSG-B6-01 · Claude · 2026-10-27T13:55:00+01:00 · Block B6 Viewer und Bedienung abgeschlossen
- Block B6 (P1-03c, R-004/005/006) laut [Blockplan](BLOCKS.md). Geänderte Dateien: eigene `apps/web/src/Viewer.tsx`, `canvasFallback.ts`, neue `apps/web/src/viewer/*`, `vite.config.mjs`, neue `packages/domain/src/inspect.ts` (+ Exportzeilen in `index.ts`), `tests/viewer.test.mjs`, `tests/e2e/viewer.e2e.mjs`, `docs/architecture/VIEWER.md`, eigener CSS-Abschnitt.
- Abgestimmte Eingriffe außerhalb der Liste, minimal: `EditorTab.tsx` (Schichtfilter statt „bis Y“-Regler, Fokusbereich, Blockinspektor; B5 bindet dort weiterhin eine Zeile ein), `ViewerView.tsx` (Fokus, Hinweistexte). `Viewer`-Schnittstelle unverändert kompatibel, neu optional `focus`.
- Ergebnis: siehe TESTING. Reservierung mit dem Push beendet.

### MSG-B8-01 · Claude · 2026-10-27T13:45:00+01:00 · Spielbrücke Konzept
- Nutzerfrage: Mod, die das Gebaute ausliest und den Fortschritt auf der Website zeigt. Konzept in [MOD_BRIDGE](architecture/MOD_BRIDGE.md), Block B8 in [BLOCKS](BLOCKS.md), ADR-015 vorgeschlagen.
- Reserviert für M1: `packages/domain/src/gameCheck.ts`, `tests/game-check.test.mjs`, `views/project/GameCheckPanel.tsx`, eine Einbindungszeile in `BuildTab.tsx`. Warten auf Nutzerentscheidung zu Loader/Version/Spielumgebung für M2.

### MSG-B8-02 · Claude · 2026-10-27T18:10:00+01:00 · Spielbrücke M1
- Nutzerentscheidung: Fabric-Client-Mod, Minecraft 26.3 (Fabric Loader 0.19.5, API 0.164.0+26.3, Java 25), mehrere Versionen/Launcher, kein WorldEdit.
- M1 umgesetzt. Abgestimmte Eingriffe außerhalb der B8-Dateien: `BuildTab.tsx` (B4, abgeschlossen: Panel, Spielbadges, Abweichungen in Schrittkarte und Schichtplan), `schemExport.ts` (B2: zusätzliches Metadatenfeld `ProjectMin`), `schem.ts` (Entpacken als `gunzipLimited` geteilt, Verhalten unverändert). Weiter mit M2 (Mod).

### MSG-B9-01 · Claude · 2026-10-27T18:30:00+01:00 · Block B9 Gebäudekatalog abgeschlossen

- Nutzerauftrag: Bibliothek der Gebäudevorschläge tief ausbauen, mit allen passenden Werten; zusätzlich shulkr.com als Vorbild gesichtet (nur Struktur, keine Inhalte übernommen). Nummer B9, weil B8 bereits die Spielbrücke ist.
- Eigene Dateien: `packages/domain/src/catalog.ts`, `buildings.ts`, `tests/catalog.test.mjs`, `tests/e2e/catalog.e2e.mjs`, `views/library/BuildingSheet.tsx`, `CatalogFilters.tsx`, `FacetFields.tsx`, `docs/architecture/CATALOG.md`.
- Außerhalb geändert (klein): `LibraryView.tsx` (Katalogliste, Filter, Steckbrief; B5-Anschluss-Editor und Bereich-Panel unverändert eingebunden), `samples.ts` (Facetten-Tags, Geometrie/IDs gleich), `repository.ts` (`seedSamples` legt Gebäude an und frischt Beispiel-Metadaten auf), `router.ts`/`main.tsx` (Route `#/bibliothek/fuer/<id>`), `EditorTab.tsx` (ein Link), Exportzeilen in `index.ts`, CSS-Abschnitt „B9“, `tests/e2e/app.e2e.mjs` (Suchbegriff und Filter aufklappen).
- Hinweis an B1: `polished_andesite` und weitere `polished_*`-Steine fehlen im Itemkatalog (fallen auf „angenommen“). Hinweis an B6: `oak_slab`, `glass_pane` u. a. haben nur gehashte Vorschaufarben.
- Nach Rebase auf 29c0d05 (Itemkatalog v2): Rezepte bzw. Rohstoffeinträge für die neuen v2-Items ergänzt; offen als „kein Rezept“ bleiben angeschlagene Ambosse, Kupferkiste, Froschlaich, gefüllte Kessel.
- Reservierung mit dem Push beendet.

### MSG-B8-03 · Claude · 2026-10-27T18:40:00+01:00 · Spielbrücke M2 Kern
- `mods/bauplaner-bridge/` neu (Kern + Fabric-Adapter 26.3, Wrapper), `scripts/test_bridge.sh`, `scripts/bridge_crosscheck.mjs`. Fabric-Build blockiert durch Netzwerksperre der Cloud-Umgebung; Nutzer um Freigabe gebeten.

### MSG-OP-01 · Claude · 2026-10-27T23:00:00+01:00 · Ausbau offener Punkte
- Nutzerauftrag: offene Punkte der Module sauber ausbauen. Katalog-Ausbau (B9-Folgethread) und Mod-Build (B8) bewusst nicht angefasst.
- Geändert: `materials.ts` (`materialsForParts`, Option `partners`, Katalog v2), `BuildTab.tsx` (Itemspalte, Packliste; B4 abgeschlossen), `colors.ts` (Familienfarben), `connectors.ts`/`types.ts`/`library.ts` (Händigkeit, `placementBounds`, `nearestSnap`), `ConnectorEditor.tsx`/`SnapPanel.tsx` (Händigkeit), `sceneController.ts`/`ThreeViewer.tsx`/`viewer/types.ts` (Greifen, Umriss), `EditorTab.tsx` (Ziehen), Exportzeilen in `index.ts`, CSS-Abschnitte am Ende, Tests und Dokumentation.
- Hinweis an B9-Folgethread: neue Itemregeln können Katalog-Kennwerte von „angenommen“ auf „Katalog“ heben; keine Gebäude-/Katalogdatei geändert.
### MSG-B1R-01 · Claude · 2026-10-27T22:10:00+01:00 · Rohstoffe und Rezepte (Rest von R-017)
- Nutzerauftrag: offene Punkte der Module sauber ausbauen; dieser Teil: Rohstoffbedarf aus den Bauitems. Eintrag B1-R in [BLOCKS](BLOCKS.md).
- Eigene Dateien: `packages/domain/src/recipes.ts`, `tests/recipes.test.mjs`, `tests/e2e/recipes.e2e.mjs`, `views/project/RawMaterialsPanel.tsx`, Abschnitt in MATERIALS.md. Klein außerhalb: eine Einbindungszeile in `MaterialsTab.tsx`, `stackSizeOf` exportiert und Hinweistext in `materials.ts`, Exportzeilen in `index.ts`, CSS-Abschnitt „B1-R“.
- Hinweis an den Itemkatalog-Ausbau: neue Bauitems in `materials.ts` bitte auch in `recipes.ts` als Rezept oder Rohstoff eintragen, sonst erscheinen sie als „kein Rezept“. Der Test „sample project and all shipped buildings“ prüft das für alle Beispiele.
- Nach Rebase auf 29c0d05 (Itemkatalog v2): Rezepte bzw. Rohstoffeinträge für die neuen v2-Items ergänzt; offen als „kein Rezept“ bleiben angeschlagene Ambosse, Kupferkiste, Froschlaich, gefüllte Kessel.
- Reservierung mit dem Push beendet.
