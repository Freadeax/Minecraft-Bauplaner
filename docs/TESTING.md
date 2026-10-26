# Prüfstrategie ohne GitHub Actions

GitHub Actions werden nicht genutzt. Der jeweils bearbeitende Agent führt alle für seine Änderung erforderlichen Prüfungen selbst aus, behebt Fehler im Auftragsumfang und hält die Ergebnisse vor Commit/Push hier fest. Diese Regel gilt auch für spätere Tests, Builds und Releaseprüfungen.

## Vorgehen

1. Passende Prüfungen anhand der Änderung bestimmen; vorhandene Projektbefehle nutzen.
2. Dokumentation mit `python3 scripts/check_docs.py` prüfen.
3. Mit wachsendem Code zusätzlich Parser-/Transformations-/Materialtests, Typprüfung, Lint, Build und geeignete UI-/Integrationstests selbst ausführen.
4. Befehl, Ergebnis, geprüften Arbeitsstand und Grenzen dokumentieren. Änderungen nach der Prüfung erfordern die betroffenen Prüfungen erneut.
5. Erst danach geprüfte Änderungen committen und pushen. Fehlende Ausführungsmöglichkeiten ausdrücklich melden; nichts als bestanden erfinden.

## Prüfprotokoll

### 27.10.2026 – Umstellung ohne Actions

- Grundlage: main 54d628f6a44ebd06c75791e91d221493d953aec2 plus die in diesem Commit enthaltene Umstellung.
- `python3 scripts/check_docs.py`: bestanden; lokale Markdown-Dateiverweise und GPT-Anweisung unter 8.000 Zeichen geprüft.
- Repository-Dateibaum geprüft: nach Entfernung keine Workflowdateien vorgesehen; der Dokumentationsprüfer überwacht dies künftig zusätzlich.
- Grenzen: ausschließlich Dokumentation und Prüfkonfiguration verändert. Anwendungscode ist noch nicht vorhanden; keine Anwendungs-, Browser- oder Minecraft-Integrationstests behauptet.
