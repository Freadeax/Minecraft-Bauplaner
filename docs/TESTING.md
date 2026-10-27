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

### 27.10.2026 – Voxelvertrag und Kern P0-02/P0-03

- Grundlage: authentifizierter Dateisnapshot main `7dbd12e3fcb2cb71e5bfaa846a6398c9394b3317` plus dieses Arbeitspaket. Direkter Clone war ohne Shell-Zugangsdaten nicht verfügbar; Dateien über den GitHub-Connector geladen. Änderungen werden über einen Reviewbranch integriert, nicht über den lokalen Snapshot-Rootcommit.
- Umgebung: Linux x64, Node.js 24.22.1, npm 11.9.0, TypeScript 5.9.3. Einzige Entwicklungsabhängigkeit vor Einsatz per npm-Registry mit Version und Integrität geprüft und im Lockfile fixiert.
- `npm ci --ignore-scripts --no-audit --no-fund`: bestanden; saubere Installation aus dem Lockfile.
- `npm run check`: strenge Typprüfung, Bibliotheksbuild, 43 Node-Tests und Dokumentationsprüfung bestanden. GPT-Anweisung unter 8.000 Zeichen.
- Tests: handberechnete asymmetrische Zellen/Bounds, Grenzpunkt vs. Zellminimum, Nichtnullpivot und Reihenfolge, konkrete Achsen/Richtungen/Treppen/Verbindungen, vier Rotationen, doppelte Spiegelung, alle acht Kombinationen, int64/NBT-Typen und semantischer JSON-Roundtrip, getrennte Luft-/Löschzählung, X/Y/Z-Auswahl, unveränderliche Kopien, unbekannte Zustände/NBT, Struktur-/Index-/Bereichs-/Budgetfehler.
- `git diff --check`: bestanden. Keine GitHub-Actions-Workflows angelegt.
- Gefundener und behobener Fehler: vorhandener Dokumentationsprüfer lief nach npm-Installation auch durch node_modules und beanstandete fremde Mailto-Links. Jetzt werden .git, node_modules, dist und .venv beim Durchlaufen ausgeschlossen; eigene Dokumentationslinks werden weiterhin geprüft.
- Grenzen: synthetische interne Vertragsfixtures, kein unabhängiger binärer Schem-Reader/Writer, keine echte Minecraft-Version/Registry bestätigt. NBT-Transformationen und unbekannte Blockregeln bleiben ausdrücklich ungelöst. Keine UI-, Browser-, Last-, Pages-Deployment-, Spiel- oder Serverprüfungen. Kein eigener Lintbefehl konfiguriert; Compiler-/Build-/Testprüfungen ersetzen keinen behaupteten Lintlauf.
- Pages-Primärquellen für Architektur geprüft; dies ist kein Nachweis eines funktionierenden Deployments.

- Integrationsnachweis: Codecommit `94e9a6e4f0ad702660389fca423b426647b9ce90` mit Tree `db0bad8b4de656bab8f8ee155da7f25fa30c3a26` auf dem Reviewbranch. Exakter Treevergleich mit lokalem Prüflauf bestanden; Draft-PR #1 geöffnet. Nachtrag ändert nur Dokumentation; `npm run check:docs` und `git diff --check` erneut bestanden.

### 27.10.2026 – Autorisierte Main-Integration

- PR #1: erwarteten Head `0ee1a77b8ce8a4c23ef8eda4b9282a9a66b94e19` geprüft, konfliktfrei; Merge `e791d68dda1b982e4e3e99536ba23ed80a61e749` erfolgreich.
- Merge-Tree `dc0f6cc26ef3265381166ec2230b9bcf424c3cbf` ist identisch mit dem geprüften PR-/lokalen Tree. Keine erneuten Codetests nötig: keine Codeänderung seit 43 bestandenen Tests, Typprüfung und Build.
- Nachtrag ändert ausschließlich AGENTS, GPT-Anweisungsdatei, STATUS, Kommunikation und dieses Protokoll. `npm run check:docs` und `git diff --check` bestanden; GPT-Anweisung bleibt unter 8.000 Zeichen. Keine Actions ausgeführt, kein Deployment.

### 27.10.2026 – Pages-Veröffentlichungspflicht

- Ausschließlich Arbeitsregeln und Status ergänzt; kein Anwendungscode geändert.
- `npm run check:docs` und `git diff --check`: bestanden, GPT-Anweisung weiterhin unter 8.000 Zeichen.
- Remote-main und lokaler Ausgangs-Tree vor Bearbeitung identisch. Keine neue Codeprüfung erforderlich.
- GitHub-Connector auf Pages-Veröffentlichungs-/Konfigurationsaktionen geprüft: keine vorhanden; /pages-Fetch als nicht zugelassener Endpunkt abgewiesen. Kein Website-Build vorhanden, daher kein Deployment durchgeführt oder als erfolgreich gemeldet. Die Pflicht zur unmittelbaren Veröffentlichung ist dokumentiert; sie ersetzt keine technisch eingerichtete Deploymentstrecke.

### 27.10.2026 – Vollständiger Konnektor- und Umsetzungsplan

- Nur Dokumentation: Gesamtplanung P1–P7 und HP-01–04, API-Fähigkeitsmatrix, erwartete Ref-SHA, Source-/Artefakttrennung, Hashmanifest, Bootstrap, Liveprüfung und Rückkehr ausgearbeitet. Keine Anwendungsfunktion hinzugefügt.
- get_repo und tatsächlich angebotene Schemas geprüft; base64-Blobs und expected_sha verfügbar. Pages-Konfiguration weiterhin nicht durch angebotene Aktion abgedeckt. Keine fremde API oder zusätzliche Zugangsdaten vorausgesetzt.
- `npm run check:docs` und `git diff --check`: bestanden; GPT-Anweisungsdatei unverändert unter 8.000 Zeichen. Kein neuer Code-/Browsertest erforderlich oder behauptet.
- Main-Integration vorgesehen; keine Pages-Veröffentlichung möglich, weil Webbuild und bestätigte Pages-Quelle fehlen.

### 27.10.2026 – Erste öffentliche Browser-Kernansicht

- Grundlage main 1913c087c9c6e90a2ec63f8430657c6ec7fa67a4 plus Webansicht, Worker und Buildskript. Sichtbarkeit über Konnektor als public bestätigt; Pages-Oberfläche im Browser erreichbar und deaktiviert.
- `npm run check`: bestanden, 45 Tests (43 Kern + 2 Artefakt-/Manifesttests), TypeScript strict für Kern und React-App, Bibliotheks-/Vitebuild, Dokumentationsprüfung. `git diff --check`: bestanden.
- Artefakttests verifizieren jede Bytegröße und jeden SHA-256, vollständige Dateiliste, getrennten Worker, Repository-Unterpfad, keine TS-/Markdown-/Sourcemap-Dateien und Runtime-Lizenzhinweise.
- Buildwarnung: JS-Hauptbundle etwa 804 kB unkomprimiert / 216 kB gzip; keine mobile Performancezusage. Spätere Codeaufteilung sinnvoll.
- Vorschau mit 0.0.0.0 scheiterte am Umgebungssystemaufruf uv_interface_addresses; 127.0.0.1 funktioniert im Container. Cloud-Browser erreicht den Container-Loopback nicht (ERR_CONNECTION_REFUSED). Daher Browserprüfung auf echter Pages-URL nach Erstveröffentlichung vorgesehen, noch nicht als bestanden gemeldet.
- Keine eigenen Actions, keine Minecraft-Welt-/Schemtests. Noch kein Schem-Import/Export. JSON-Import ist ein begrenzter interner Vertragsimport im Browserworker. Geometrie als vereinfachte Würfel gekennzeichnet.

- Erstveröffentlichung auf echter URL erreicht: Start, 425 Gesamtblöcke, Y=10 als Einzelschicht mit 26 sichtbaren Blöcken, X-Schnitt und Vierteldrehung live per Browser geprüft; Gesamtmenge bleibt 425, Stammachse wechselt x→z. Browser bietet kein WebGL; deshalb Software-Isometrie mit Drehen/Zoom/Picking als Ersatz ergänzt. GPU-WebGL-Darstellung in dieser Umgebung nicht prüfbar.

- Liveprüfung des Software-Fallbacks fand einen React-DOM-Konflikt: Ein Statuswechsel entfernte den imperativ eingefügten Canvas. Rendererhost und Statusanzeige deshalb in getrennte DOM-Knoten gelegt. Zwischenzeitlich zeigte ein Artefakttest noch alte Build-Dateien im Verzeichnis; vollständiger erneuter Build-/Prüflauf bestand, Test nicht abgeschwächt.

### 27.10.2026 – Erfolgreiche Liveprüfung und Abschluss

- Pages-Oberfläche bestätigt Quelle gh-pages / root, HTTPS. GitHub-interner Lauf für Deployment c8573e23bbdfdc5d1c7bb83bac63b448254dbea6 abgeschlossen mit success; keine eigene Workflowdatei angelegt.
- Sichtbarer Browsercheck: Hafenhaus gerendert, Gesamtmenge 425; Y=10 einzeln zeigt 26; Rotation hält Mengen und ändert Stammachse x→z; Canvas-Picking liefert X=2/Y=7/Z=4 und minecraft:stone.
- Fehler aus echtem Browser gefunden und behoben: Status-Rendering entfernte imperativen Canvas. Getrennter Rendererhost beseitigt dies; Softwareansicht anschließend visuell bestätigt. Vorschauprozess beendet und eigener Prebuild-Cleanup beseitigt alte Builddateien. Test nicht abgeschwächt.
- Nach letzter Codeänderung: kompletter npm-run-check bestanden (45/45, strict Kern/Web, Builds, Docs). Abschlussnachtrag ändert nur Dokumentation; check:docs und diff --check erneut bestanden.
- Liveprüfung verwendet Quell-SHA und Dateihashes aus deployment.json. CDN/Browsercache lieferte vorübergehend ältere index.html; neuer versionsbezogener Seiteneinstieg und DOM-Skriptpfad bestätigten anschließend den korrigierten Build index-DkiQs1mp.js.
- Grenzen: Browser-WebGL deaktiviert, deshalb tatsächlicher GPU-Pfad nicht prüfbar; kein echter iPhone-/Touchtest oder Dateidialog-Importtest. Keine Schem-/Spiel-/Serverprüfung. JS-Bundle weiterhin ca. 807 kB unkomprimiert.
