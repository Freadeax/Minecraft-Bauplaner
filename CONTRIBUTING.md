# Beiträge und Definition of Done

AGENTS.md und docs/project/PRINCIPLES.md gelten als gemeinsame Grundlage. Ein Beitrag erklärt Problem, neue Wirkung, Umfang und Grenzen. Jede größere Änderung referenziert Anforderungs-/Roadmap-ID oder ein Issue.

Vor Bearbeitung die Kommunikation lesen und betroffene Dateien anmelden. Änderungen klein und zusammenhängend halten. Für Architekturwechsel eine Entscheidung mit Alternativen und Auswirkungen ergänzen.

## Definition of Done

- Gewünschtes Verhalten implementiert und mit passender Prüfung belegt.
- Fehlerfälle, Kompatibilitätsgrenzen und Berechtigungen berücksichtigt.
- Keine unmarkierten Platzhalter, erfundenen Daten oder unbewiesenen Erfolgsmeldungen.
- Relevante Dokumentation, Status und offene Aufgaben aktualisiert.
- Keine geheimen Daten, privaten Welten oder ungeklärten Fremdassets eingecheckt.
- Reviewbeschreibung nennt Ergebnis, Prüfung und wesentliche Grenzen.
- Erforderliche Prüfungen vom bearbeitenden Agenten selbst ausgeführt und in docs/TESTING.md dokumentiert; keine Testabschwächung. GitHub Actions werden nicht genutzt.

Einrichtung: `npm run setup:codex` installiert exakt aus dem Lockfile, aktiviert lokale Roadmap-Hooks und baut Kern und Website. Voraussetzungen und Codex-Anbindung stehen in [CODEX_SETUP](docs/project/CODEX_SETUP.md). `npm run dev` startet die vorhandene Webanwendung unter `/Minecraft-Bauplaner/`.

Vor Integration `npm run check` ausführen. Für Browserprüfungen einmal `npm run setup:browser`, danach `npm run test:e2e` ausführen. Browserfehler und Infrastrukturblocker getrennt dokumentieren. Die Dokumentationsprüfung ersetzt keine Parser-, Rendering- oder Integrationstests. Keine eigenen GitHub Actions.

Aufgaben ausschließlich in `docs/roadmap.json` pflegen, vor Beginn in COMMUNICATION anmelden und mit `npm run roadmap:record` dokumentieren. Die generierten ROADMAP/HISTORY nicht manuell bearbeiten. Vor Push `npm run check:roadmap-change -- <vorheriger-main>`; nach Mainintegration unmittelbar den vorhandenen Pages-Publisher verwenden. Historische Blockregeln werden durch aktuelle Nutzerpräzisierungen in AGENTS ergänzt.
