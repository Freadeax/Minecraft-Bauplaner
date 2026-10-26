# Entwicklungskoordination

Dieses Dokument koordiniert Menschen und Coding-Agenten während aktiver Arbeit. Es startet keine Hintergrundüberwachung.

## Protokoll

Vor einem Arbeitsblock offene Nachrichten und Dateireservierungen lesen. Eintrag mit eindeutiger ID, Autor, Zeit einschließlich Zeitzone, Aufgabe, Dateien, Status und nächstem Schritt anlegen. Nach dem Block und vor Commit/Push Antworten und Status aktualisieren. Auf Fragen mit `Antwort auf MSG-...` Bezug nehmen. Bestehende Nachrichten nicht nachträglich sinnumdeuten; Korrekturen als neuen Eintrag ergänzen.

Reservierungen haben Gültigkeitsende und dienen der Abstimmung; sie sind keine technische Sperre. Bei abgelaufener Reservierung vorhandene Änderungen prüfen und bei Überschneidung abstimmen. Eine laufende fremde Bearbeitung nicht wegen abgelaufener Zeit überschreiben.

## Aktive Arbeit

| Aufgabe | Verantwortlich | Dateien | Status | Reservierung bis |
|---|---|---|---|---|
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
