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

Der Voxelkern wird mit `npm run check` vollständig lokal geprüft (Installation: `npm ci --ignore-scripts`). Ein Web-Anwendungsstart ist noch nicht vorhanden. Die enthaltene Dokumentationsprüfung ist kein Ersatz für Parser-, Rendering- oder Integrationstests.
