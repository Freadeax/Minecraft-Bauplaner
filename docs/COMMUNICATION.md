# Entwicklungskoordination

Dieses Dokument koordiniert Menschen und Coding-Agenten während aktiver Arbeit. Es startet keine Hintergrundüberwachung.

## Protokoll

Vor einem Arbeitsblock offene Nachrichten und Dateireservierungen lesen. Eintrag mit eindeutiger ID, Autor, Zeit einschließlich Zeitzone, Aufgabe, Dateien, Status und nächstem Schritt anlegen. Nach dem Block und vor Commit/Push Antworten und Status aktualisieren. Auf Fragen mit `Antwort auf MSG-...` Bezug nehmen. Bestehende Nachrichten nicht nachträglich sinnumdeuten; Korrekturen als neuen Eintrag ergänzen.

Reservierungen haben Gültigkeitsende und dienen der Abstimmung; sie sind keine technische Sperre. Bei abgelaufener Reservierung vorhandene Änderungen prüfen und bei Überschneidung abstimmen. Eine laufende fremde Bearbeitung nicht wegen abgelaufener Zeit überschreiben.

## Aktive Arbeit

| Aufgabe | Verantwortlich | Dateien | Status | Reservierung bis |
|---|---|---|---|---|
| Voxelvertrag und Kernstart P0-02/P0-03 | ChatGPT | packages/voxel, Tests/Fixtures, Architektur, Regeln, Prüfprotokoll | lokal implementiert und geprüft; Reviewintegration | beendet |
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
