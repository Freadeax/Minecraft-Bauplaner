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

### 27.10.2026 – Begrenzter Schem-v3-Import

- Grundlage main 23c43fcc12a4ba0e1f3bfd72c44f43bfadbc034d, keine fremden Änderungen. Regeln, Architektur, Kommunikation und alle Anforderungsgruppen systematisch geprüft; widersprüchliche alte Statusaussagen bereinigt.
- Offizielle Sponge-v3- und Java-DataInput-Primärquellen vor Implementierung gelesen. Keine neue Laufzeitabhängigkeit. Unabhängige Binärfixture aus Python struct, 756 feste NBT-Bytes; GZip in Tests/Build unabhängig mit Node zlib.
- npm run check: 72/72 bestanden (45 bisher + 27 Formatfälle), strict Kern/Web, Kern-/Webbuild und Dokumentationsprüfung. git diff --check bestanden. Testregex einmal an exakte Fehlermeldung „Bauvolumen“ angepasst, keine Validierung gelockert.
- Neue Fälle: verschachtelte v3-Wurzel, DataVersion/unsigned Short/Offset, lückenhafte IDs und mehrbyte VarInts, manuell erwartete 7 Block-/5 Luftzellen, exakte Koordinaten, vollständige BE-/Quellzusätze, int64-Grenzen, Arrays, NUL/Emoji-MUTF, korrupte GZip-Prüfsumme/Trunkierung, falsche Typen, negative/zu große Längen, doppelte Namen/IDs, unbekannte Palette, Zeit-/Größen-/Tiefenbudgets und bestehender Snapshot bei Fehler unverändert.
- Browser-Ende-zu-Ende-Prüfung der eingebundenen synthetischen Schem über dieselbe Workerstrecke erfolgt nach Pages-Update. Lokaler Cloud-Browser kann den Container nicht erreichen. Echte Minecraft-/WorldEdit-Datei, GPU und iPhone-Dateidialog weiterhin offen; keine allgemeine Kompatibilität behauptet.
- Nutzersteuerung: Nach Fertigstellung dieses Blocks ausdrücklich warten; keine neuen Module beginnen.

- Live-Ende-zu-Ende nach Veröffentlichung: Schaltfläche lädt 480-Byte-GZip-Schem über dieselbe Workerpipeline; Importbericht zeigt 3×2×2, 7 belegte Blöcke, 5 Luftzellen, 1 BlockEntity, DataVersion 3465, Offset −10/64/30 und Originalhash b73088cefabc64f860a527adc3765bf606cb530b77518d797223c74981bcf466 (entspricht lokalem Fixturehash). Modzustände bleiben mit Properties sichtbar; Biom-/Entity-/Customdaten als separat erhalten gekennzeichnet. Nach Rotation bleibt Hash unverändert, Fass facing east→south, Mod-/NBT-Transformationswarnungen sichtbar. Y=1 zeigt 3 bei 7 Gesamtblöcken.
- Kein echter Betriebssystem-Dateiauswahldialog oder WorldEdit-Export geprüft; Browser-Smoke verwendet die unabhängige synthetische Binärfixture, nicht einen Mock des Readers.
- Nutzeranweisung eingehalten: Importblock abgeschlossen; danach warten, kein Folgemodul oder Hintergrundprozess. Abschließender Dokumentationsnachtrag erfordert nur check:docs/diff --check; gleiches Anwendungscodeartefakt wird mit aktualisiertem Source-Manifest erneut veröffentlicht.

### 27.10.2026 – Fundament B0: Domänenkern, Composer, Web-Grundgerüst

- Grundlage main d8dd9dc9e517b2feb533758ce20a7c852abb9593 plus B0. Node 22.22.0, Python 3.13, lokal vorinstalliertes Playwright mit Chromium (keine neue Projektabhängigkeit).
- `npm run check`: strict Kern/Web, Kern- und Vitebuild, 83/83 Node-Tests (72 bisher + 11 Domänentests), Dokumentationsprüfung bestanden.
- Neue Domänenfälle: kanonisches JSON, inhaltsadressierte Versionen inkl. Manipulations- und Umbenennungserkennung, doppelte Anschluss-IDs, Bereichsauswahl, Suche/Tags/Archiv, exakte Undo/Redo-Gegenoperationen inkl. Verbindungen, atomare Fehler, konfliktfreier Turm-Mauer-Tor-Verbund (Mengen = Summe), Duplikate einmal gezählt, Zustands-/Luft-Konflikte, Override und Doppel-Override, ungelöste Moddrehung, fehlende Versionen, eingefrorene Revisionen. Erwartete Wandmenge von Hand gezählt (12 + 36 + 6 = 54); eine erste falsche Handerwartung (48) wurde korrigiert, nicht die Implementierung angepasst.
- `npm run test:e2e` gegen den gebauten Pages-Stand unter `/Minecraft-Bauplaner/`: 4/4 bestanden (Beispielprojekt konfliktfrei, Verschieben erzeugt Konflikt, Undo/Redo, Override, Entfernen/Einfügen; Bibliothek mit Herkunft/Suche/Tags; Schem-Testdatei im Betrachter und als Bauteil importiert; unbekannte Routen). Keine Konsolen-/Seitenfehler. Headless-Chromium bot WebGL; Screenshot des Editors visuell geprüft.
- Grenzen: Projekte nur sitzungslokal (B3 offen); keine echten Minecraft-Dateien, kein iPhone-Test, keine Lastmessung. Hauptbundle weiterhin > 500 kB (B6).

### 27.10.2026 – B4 Bauanleitung

- Grundlage main 3584213 plus B4. `npm run check`: strict Kern/Web, Builds, 92/92 Node-Tests (83 bisher + 9 Guide-Fälle), Dokumentationsprüfung bestanden. `npm run test:e2e`: 6/6 (4 bisher + 2 Bauen-Prüfungen), keine Konsolenfehler.
- Neue Fälle: Phasenregeln (Vanilla-Schwerkraft/Anbringung/Flüssigkeit, Mod bleibt Grundblock); von Hand hergeleitete Säule mit 7 Schritten, exakten IDs, Reihenfolge, Y-Werten und allen Voraussetzungslisten; Burgmauer: jede Weltzelle genau einmal, Summe = Weltzählung, Voraussetzungen stets früher, Zyklenprüfung; Determinismus; Haken → bereit-Liste, Verschieben ⇒ prüfbedürftig bei gleicher ID, unberührte Abschnitte bleiben abgehakt, erneut bestätigen, entfernte Instanz ⇒ verwaist; Drehen ändert nur Hashes des gedrehten Abschnitts; Schicht-Haken als ein Undo-Schritt; ungeklärte Konflikte je Schritt; leeres Projekt; Zyklus/unbekannte ID.
- Browser: Burgmauer → Bauen (31 Schritte), Schritt 1 Prüfkriterium „16 Blöcke“ und 16 markierte Zellen im Schichtplan, Abhaken springt weiter, Turm im Editor Y+1 ⇒ Hinweis prüfbedürftig, Filter, erneut bestätigen, ganze Schicht abhaken, 3D-Ansicht. Mobil 390×844 mit Touch: Schrittkarte vor Liste, Abhaken-Ziel ≥ 44 px hoch, kein horizontales Scrollen, Tap hakt ab. Desktop- und Mobil-Screenshot visuell geprüft.
- Grenzen: kein echtes Mobilgerät, keine Prüfung im Spiel, Projekte weiter nur sitzungslokal bis B3.
### 27.10.2026 – B2 Schem-v3-Export

- Grundlage main ed32566 (inkl. B4) plus B2. Node 22.22.0, Python 3.13, lokales Playwright/Chromium; keine neue Abhängigkeit.
- `npm run check`: strict Kern/Web, Kern- und Vitebuild, 116/116 Node-Tests (92 bisher inkl. B4 + 24 Export), Dokumentationsprüfung bestanden.
- `npm run build && npm run test:e2e`: 7/7 (6 bisher inkl. B4 + Export). Heruntergeladene Datei vom unabhängigen Python-Leser `scripts/verify_schem.py` bestätigt, gemeldeter SHA-256 = Dateihash, Konflikt sperrt Export, Revision 1 danach byte-gleich erneut exportiert. Screenshots Desktop 1400 px und Mobil 390 px visuell geprüft.
- Unabhängigkeit: NBT-Writer reproduziert die Python-struct-Fixture byte-genau; Erwartungen der 3×2×2-Handwelt (Palette, VarInt-Bytes, jede Zelle, BlockEntities) von Hand festgelegt. Eine eigene Handerwartung war falsch (6 statt 7 Blöcke) und wurde nach Nachzählen korrigiert, nicht die Implementierung.
- Grenzen: keine echte WorldEdit-/Minecraft-Abnahme, DataVersion nicht gegen Registry geprüft, WEOffset-Auslegung ungeprüft.

### 27.10.2026 – B1 Materialbedarf und Bauitems

- Grundlage main 29d03ed (inkl. B4 und B2) plus B1. Node 22.22.0, lokales Playwright/Chromium; keine neue Abhängigkeit.
- Neue Node-Fälle (`tests/materials.test.mjs`, 12): Ebenen getrennt (Doppelstufe = 2), Tür/Sonnenblume/hohes Gras/zwei Betten je ein Item, einzelne obere Hälfte bzw. Bettkopf mit fremdem Fuß mit Hinweis, Kerzen/Seegurken/Schneeschichten/Eier/Blütenblätter nach Anzahl und ungültige Anzahl ungelöst, neun Wandvarianten, Mauer bleibt Mauer, umbenannte/zusammengesetzte/abgeleitete Blöcke, Flüssigkeit/Mod/Feuer/Barriere ungelöst, unbekannte Vanilla-ID als Annahme, Stacks/Plätze/Shulkerkisten von Hand (200 Stein = 3 × 64 + 8, 20 Schilder = 1 × 16 + 4, 3 lose Shulkerkisten, 28 Plätze ⇒ 2 Kisten), Behälterinhalt, Projekt aus `resolution.world` (Duplikate einmal, Instanzsummen = Projekt, Konflikt ⇒ vorläufig), CSV.
- `npm run check`: strict Kern/Web, Kern- und Vitebuild, 128/128 Node-Tests (116 bisher inkl. B4/B2 + 12 Material), Dokumentationsprüfung bestanden.
- `npm run build && npm run test:e2e`: 9/9 (7 bisher + Material-Tab bei 1400 px und 390 px): Beispiel vollständig (Bauitems = platzierte Blöcke), Instanzumfang kleiner als Projekt, Suche, CSV-Download, kein horizontales Scrollen mobil, Konflikt aus dem Editor ⇒ „vorläufig“ mit Konfliktgrund; keine Konsolenfehler. Screenshots Desktop/Mobil visuell geprüft.
- Grenzen: Itemkatalog nicht gegen eine exakte Spielversion/Registry geprüft; Beispielbauteile decken nur `direct`-Regeln ab, Sonderregeln sind über Node-Fälle geprüft; keine Prüfung im Spiel.

### 27.10.2026 – B7 Zustandskatalog für Drehen/Spiegeln

- Grundlage main 7167d3a (B0, B1, B2, B4) plus B7. Node 22, lokal vorinstalliertes Playwright/Chromium.
- `npm run check`: strict Kern/Web, Kern- und Vitebuild, 135/135 Node-Tests inklusive 7 neuer in `tests/states.test.mjs`, Dokumentationsprüfung bestanden. `npm run test:e2e`: 9/9 bestanden.
- Neue Fälle: 38 handberechnete Einzelorientierungen; alle 24.556 Katalogzustände mit vier Vierteldrehungen = Identität, doppelter Spiegelung = Identität und Ergebnis im Schema; Gruppenverträglichkeit aller 64 Transformationspaare je Familie; unabhängige Geometriemodelle (Richtungsvektoren, `rotation` als Winkel, Treppenquadranten, Türscharnier, Doppeltruhe, Schienenenden, Verbindungsarme); ungelöst bei unbekannter ID, Modblock, Schemaabweichung und Spiegelung glasierter Keramik; Meldungstexte in `transformPayload`.
- Zwei eigene Handerwartungen (Bett und Treppe bei Spiegeln + Drehen) waren falsch berechnet und wurden korrigiert, nicht die Implementierung.
- Grenzen: Katalog von Hand nach Java 1.21.4, kein Abgleich mit einem Registry-Report und keine Prüfung im Spiel; BlockEntity-NBT weiterhin ungelöst gemeldet.

### 27.10.2026 – B3 Dauerhafte Speicherung und Sicherung

- Grundlage main 1892dd6 (B0, B1, B2, B4, B7) plus B3. Node 22, lokal vorinstalliertes Playwright/Chromium; keine neue Abhängigkeit.
- `npm run check`: strict Kern/Web, Kern- und Vitebuild, 145/145 Node-Tests (135 bisher + 10 in `tests/backup.test.mjs`), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: Base64 byte-genau (70 kB, Hochbytes, Abgleich mit Node `Buffer`); Projektsicherung selbsttragend inkl. aller Versionen verwendeter Bauteile, nur von Revisionen genutzter Versionen und Originale; Prüfsumme unabhängig mit Node `crypto` nachgerechnet; fehlende Originale gelistet statt erfunden; fehlende/manipulierte Versionen und beschädigte Originale brechen ab; vollständiger Roundtrip; Ablehnung von abgeschnittener Datei, Fremdformat, neuerem Format, geänderter Prüfsumme, nachgehashter Versions-/Originalmanipulation, Unvollständigkeit, neuerem Projektschema, Verbindung auf fehlende Instanz, ungültiger Drehung; identisches Projekt übersprungen, abweichendes standardmäßig als Kopie, „Ersetzen“ mit lokaler `baseRevision`, „Überspringen“; Bauteil-Zusammenführung behält lokale Angaben.
- `npm run build && npm run test:e2e`: 12/12 (9 bisher + 3 in `tests/e2e/persistence.e2e.mjs`): Projekt überlebt Neuladen inkl. Speicherrevision, zweiter Tab sieht neues Projekt ohne Neuladen; zwei Tabs auf demselben Projekt ⇒ zweites Speichern auf alter Basis wird als Konflikt gemeldet, nicht geschrieben, „Gespeicherten Stand laden“ zeigt den Stand des ersten Tabs; Schem-Import speichert Original (SHA-256 und Bytes in der Sicherung gegen Node geprüft), „Alles sichern“, Wiederherstellung in frischem Browserprofil erst nach Bestätigung, Reload, zweite Wiederherstellung „identisch vorhanden“, lokal geändertes Projekt ⇒ Kopie, lokales bleibt; manipulierte Datei abgelehnt ohne Änderung; Einzelprojektsicherung. Keine Konsolen-/Seitenfehler. Projektzentrale bei 1300 px und 390 px per Screenshot geprüft.
- Grenzen: nur Chromium; Safari/iPhone-Speicherverhalten, echte Kontingentüberschreitung und Upgrade-Migration (erst ab DB-Version 2 relevant) nicht im Browser geprüft.

### 27.10.2026 – B5: Anschlüsse, Snap und Bereich als Bauteil

- Grundlage main f1b95d9 (B0–B4, B7, B1) plus B5. Node 22, lokal vorinstalliertes Playwright/Chromium.
- `npm run check`: strict Kern/Web, Kern- und Vitebuild, 154/154 Node-Tests, Dokumentationsprüfung bestanden. Davon 9 neue Fälle in `tests/connectors.test.mjs`: Beispielanschlüsse gültig; Fehler OFF_FACE/OUTSIDE_FACE/NORMAL/UP/SHAPE und Warnung NO_BLOCK an einer von Hand nachgezählten Zinnenkante; vier Vierteldrehungen und doppelte Spiegelung = Identität, +X → +Z unabhängig erwartet; Passung nur bei gleichem Typ/Profil/Anker, entgegengesetzter Normale, gleichem Up; deterministische, rasterfeste Snap-Liste mit erwarteter Bestlage [4,0,1]; Anfügen = eine Undo-Operation mit Verbindung und konfliktfreier Auflösung; Nutzungsgrenze; Verschieben löst Verbindung sichtbar („misaligned“), Re-Snap ersetzt sie, veralteter Vorschlag wird abgewiesen; Tor zwischen zwei Türmen verbindet zwei Paare, zu enge Lücke liefert sichtbare Konfliktlagen nachrangig.
- Eine falsche Handerwartung im ersten Testlauf (Bezugspunkt [10,0,0] ⇒ gleichwertige 180°-Lage [10,0,3] ist näher) wurde durch korrekten Bezugspunkt ersetzt, die Implementierung blieb unverändert.
- `npm run test:e2e`: 14/14 bestanden, davon 2 neue in `tests/e2e/snap.e2e.mjs` (Beispielprojekt: 4 Anschlüsse verbinden, Verschieben ⇒ 2 gelöste Verbindungen, erster Vorschlag konfliktfrei mit 2 Anschlüssen stellt alles wieder her, Mauer an Turm Ost anfügen und Undo; Bibliothek: Eckturm-Sockel Y 0–2 als Bauteil mit 40 Blöcken und übernommener Herkunft, Anschluss mit falschem Anker gesperrt, korrigiert als Version 2.0 gespeichert). Keine Konsolenfehler. Screenshots von Snap-Panel und Ankermarkierung visuell geprüft.
- Grenzen: kein Touch-/iPhone-Test, kein Ziehen im Viewer, Spiegelprofile ohne Händigkeitsfeld, keine echten Minecraft-Bauteile.

### 27.10.2026 – B6 Viewer und Bedienung (P1-03c)
- Grundlage main 3584213 plus B6. Node 22.22.0, lokales Playwright/Chromium mit Software-WebGL (SwiftShader); keine neue Abhängigkeit.
- `npm run check`: strict Kern/Web, Builds, 89/89 Node-Tests (83 bisher + 6 neue in `tests/viewer.test.mjs`), Dokumentationsprüfung bestanden. Vite-Build ohne Chunkwarnung (Grenze 650 kB dokumentiert für den nachgeladenen three.js-Chunk).
- Neue Node-Fälle: Flächenkulling (Einzelblock 6, Nachbarn 10, Luft/Löschen verdecken nicht, Lücke, leer), Vollwürfel 27³ nur Hülle, Windungsrichtung gegen Normale, Viereck→Zelle, Ursprungsversatz; Kamerapresets als Einheitsvektoren, Bounding-Sphere passt für drei Seitenverhältnisse, Ortho-Zoom; Flug (Norden −Z, rechts Osten, Diagonale normiert, Yaw/Pitch-Rundlauf, Pitchgrenze); `inspectCell` Welt→Lokal bei Drehung und Spiegelung gegen **von Hand gerechnete** Zellen (7,0,1) und (17,0,−2) inkl. Konfliktnennung.
- `npm run test:e2e`: 9/9 (4 bisher + 5 in `tests/e2e/viewer.e2e.mjs`): Betrachter mit WebGL (1 118 Flächen, Draufsicht/Nordansicht über Kameraposition geprüft, Ortho, Flug mit W/Leertaste/Esc, Tastenkürzel, Picking); 27³-Import aus JSON (4 374 Flächen, Meshaufbau ~44 ms); Editor (Block → Welt-/Lokalkoordinate stimmt mit Pivot der Instanz, Fokus bewegt Kamera, Schichtmodi Einzeln/Bereich/Alles); Touch-Emulation Pixel 7 (Tippen wählt, Steuerkreuz fliegt per CDP-Touch, Loslassen stoppt, Flug beenden); erzwungenes Fehlen von WebGL (Softwareansicht, kein Flug, gekullte Flächen, Draufsicht nur Oberseiten, Auswahl). Keine Konsolen-/Seitenfehler.
- Vergleichsmessung vorher/nachher siehe [Viewer](architecture/VIEWER.md#messung-27102026-container-headless-chromium-mit-software-webglswiftshader-keine-gpu). Editor- und Flug-Screenshots visuell geprüft.
- Nach Rebase auf main 8a70370 (B1, B2, B3, B4, B5, B7 integriert): `npm run check` 160/160, `npm run test:e2e` 19/19 bestanden; Konflikte nur in Anhang-/Importzeilen, fachlich beidseitig übernommen.
- Grenzen: keine echte GPU, kein echtes Mobilgerät; Touch nur emuliert. Keine Blockmodelle.

### 27.10.2026 – B8 Spielbrücke (nur Konzept)
- Nur Dokumentation: `docs/architecture/MOD_BRIDGE.md`, Zeilen in BLOCKS/ROADMAP/DECISIONS/COMMUNICATION. Kein Code geändert.
- `npm run check`: Typprüfung, Builds, 160/160 Node-Tests, Dokumentationsprüfung bestanden.
- Erreichbarkeit geprüft: `maven.fabricmc.net`, `meta.fabricmc.net` und Mojang-Versionsserver aus der Cloud-Umgebung nicht erreichbar; Maven Central und Gradle erreichbar. Mod-Build nur auf dem Rechner des Nutzers.

### 27.10.2026 – B8 Spielbrücke M1 (Website)
- Grundlage main 6dcafb1 plus M1. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 169/169 Node-Tests (160 bisher + 9 in `tests/game-check.test.mjs`), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: handgezählte Aufnahme der Testsäule mit allen sechs Urteilen (ok/Zustand/fehlt/falsch/abbauen/nicht aufgenommen) und allen vier Schrittstatus; größere Box mit Ausrichtung und Indexreihenfolge x + z·W + y·W·L, nicht ausgewählte Zellen ignoriert, bestätigte Schritte als ein Batch; abgehakte, aber leere Schritte gemeldet ohne Haken zu ändern; Zellen außerhalb der Aufnahme; Bau-Properties (Zaunverbindungen, Treppenform, Laub, Türen offen, Ofen `lit` ignoriert; Ausrichtung, Scharnier, `waterlogged`, Kerzen `lit`, Mod-Properties verglichen; fehlende Plan-Properties frei); fremdes Projekt/unbekannte Revision/fremde Aufnahme; Ablehnung von Plan-Dateien, ScanVersion 2, fehlendem ProjectMin, kurzen Daten, Palettenlücken, Volumenlimit; GZip-Roundtrip mit SHA-256 und Mehrbyte-VarInts; Plan-Export enthält ProjectMin bei beiden Ankern.
- `npm run test:e2e`: 21/21 (19 bisher + 2 in `tests/e2e/game-check.e2e.mjs`): exportierter Plan → Aufnahme mit einem falschen Block → Import im Tab „Bauen“, Grundlage springt auf Revision 1, 349/350 Blöcke, genau ein abweichender Schritt mit Koordinate und Schichtmarkierung, bestätigte Schritte per Klick abgehakt; fremdes Projekt und Plan-Datei verständlich abgewiesen; Telefonbreite 390 px ohne waagerechtes Scrollen. Desktop- und Mobil-Screenshot visuell geprüft.
- Grenzen: synthetische Aufnahmen, keine echte Mod-/Spielaufnahme; nur Chromium; Aufnahme wird nicht gespeichert.

### 27.10.2026 – B9 Gebäudekatalog
- Grundlage main 09cc6c7 plus B9. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 188/188 Node-Tests (169 bisher + 19 in `tests/catalog.test.mjs`), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: alle 16 Gebäude deterministisch, Beispiel-gekennzeichnet, je eine Kategorie und Stil/Biom/Funktion; jeder Zustand mit Properties exakt im B7-Schema, vier Vierteldrehungen und doppelte Spiegelung = Identität; Materiallisten nur mit den gewollten Lücken (Wasser ungelöst, Ackerboden angenommen); Anschlüsse ohne Fehler; jedes Gebäude allein konfliktfrei, Bauanleitung azyklisch mit gleicher Blockzahl; unabhängige handgezählte Payload (Maße, Volumen, Grundfläche, Füllgrad, Betten, Türen, Licht, Lager, Beruf, Ausrichtung, Items); Facetten-Roundtrip; Filter ODER/UND, „überall“, Bauplatz mit/ohne Drehung, Höhe, Flags, Text über Blöcke/Berufe/Labels, Sortierung inkl. „Passung“ unabhängig von der Richtung; Trefferzahlen; Materialähnlichkeit; Vorschläge = Summe sichtbarer Gründe, Anschluss frei/belegt, Profilabweichung, leeres Projekt; ähnliche Gebäude; fehlende Versionen gemeldet.
- `npm run test:e2e`: 23/23 (21 bisher, `app.e2e` an neue Suchtreffer und eingeklappte Filter angepasst, + 2 in `tests/e2e/catalog.e2e.mjs` bei 1400 px und 390 px): Facettenfilter, Bauplatz mit/ohne Drehung, Steckbrief der Kapelle, Vorschläge für „Burgmauer“ absteigend, Dorfbrunnen übernommen und im Editor sichtbar. Desktop- und Mobil-Screenshot visuell geprüft.
- Grenzen: nur Chromium; Heuristiken (Schwierigkeit, Bauzeit) nicht gegen echte Spieler gemessen; keine Spielabnahme der Gebäude.

### 27.10.2026 – B8 Spielbrücke M2 (Mod-Kern)
- `scripts/test_bridge.sh` (JDK 21, Gradle-Wrapper 9.8.2, JUnit 5.14.4 aus Maven Central): 6/6 JUnit-Tests in `mods/bauplaner-bridge/core` (Plan-Identität und Box, Ablehnung von Aufnahmen/alten Plänen/Version 2/Nicht-GZip, handabgeleitete Besuchsreihenfolge x→z→y und Palette/Bytes mit nicht geladener Zelle und Metadaten, Mehrbyte-VarInt ab ID 128, Zustandsformat, Anker-Speicher und Dateiname).
- Sprachübergreifend (`scripts/bridge_crosscheck.mjs`): Website exportiert Revision (Anker untere Ecke), Java-`ScanJob` nimmt eine Welt mit Anker 1000/64/−300 und einem Diamantblock auf; Python-Leser: gültig, Box 14×8×4, gleiche Zelle; Website: Revision und PlanSha256 passen, 241/242 Zellen korrekt, genau ein abweichender Schritt.
- `npm run check` und `npm run test:e2e` grün; nach Rebase auf main c5c8d78 (B9): 188/188 Node-Tests, 23/23 Browserprüfungen, Brückenprüfung erneut bestanden.
- Nicht ausführbar: `./gradlew -PwithFabric :fabric-26.3:build` scheitert an der Netzwerksperre („Plugin net.fabricmc.fabric-loom 1.19-SNAPSHOT was not found“). Der Fabric-Adapter ist daher weder kompiliert noch im Spiel geprüft.

### 27.10.2026 – Ausbau offener Punkte (Itemspalte, Katalog v2, Farben, Händigkeit, Ziehen)
- Grundlage main fdd34d6. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 194/194 Node-Tests (188 bisher + 6), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: Teile einer Welt suchen Türhälften weltweit (Tür über zwei Schichten genau einmal, Doppelstufe 2, Wasser ungelöst, Konfliktzahl je Teil), Summe der Bauschritte der Beispielburg = Materialbericht je Item; Katalog v2 (14 Stein-/Kupfer-/Dekovarianten direkt, gefüllter Kessel abgeleitet, Froschlaich ohne Item, Chorus-Pflanze nur Kreativ, Unbekanntes bleibt Annahme); Vorschaufarben (Formen erben Material, light_blue ≠ blue, dark_oak ≠ oak, red_sandstone kein Farbstoff, entrindet = Brettfarbe, Mod-IDs gehasht); Händigkeit (links↔rechts, Spiegelung tauscht, Drehung nicht, doppelte Spiegelung = Identität, ungültiger Wert abgewiesen, unsymmetrische Mauer: nur Verlängerung und gespiegelte Kopie statt vier Lagen); Ziehen (`nearestSnap`: konfliktfrei vor nah, gleiche Drehung bei Gleichstand, außer Reichweite null; echte Mauer rastet bündig am Turm ein, Lagegrenzen).
- `npm run test:e2e`: 24/24 (23 bisher, `guide.e2e` um Itemspalte = 16 Items und Packliste erweitert, + 1 in `snap.e2e`): Mauer 1 um 1 versetzt, Ziehen an, Draufsicht, Esc bricht Greifen ohne Änderung ab, Ziehen zeigt grünen Umriss bei Pivot 4/0/1 und das Anschlusspaar, Loslassen = X 4, konfliktfrei, 2 Verbindungen; ein Undo stellt X 5 und 0 Verbindungen her. Desktop-Screenshots von Editor und Bauanleitung visuell geprüft.
- Grenzen: nur Chromium (kein WebKit in der Umgebung, daher keine Safari-Prüfung); Ziehen mit Maus geprüft, Touch-Ziehen nur über denselben Pointerweg, nicht auf einem echten Gerät.

### 27.10.2026 – B1-R Rohstoffe und Rezepte
- Grundlage main 29c0d05 (Itemkatalog v2) plus B1-R; Rezepte für die neuen v2-Items (Kupferstufen/Wachs, Regale, Lampen u. a.) ergänzt. Node 22, lokales Playwright/Chromium.
- Neue Node-Fälle (`tests/recipes.test.mjs`, 10): Katalog gültig und azyklisch für beide Methoden, alle Tag-Mitglieder und Zutaten erreichbar; handgezählter Baum (100 Fichtentreppen, 20 Fackeln, 30 Steinziegelmauern, 2 Betten, 3 Laternen ⇒ 40 Fichtenstämme, 30 Bruchstein, 6 Kohle, 6 Mohn, 6 weiße Wolle, 3 Roheisen; Rest 3 Nuggets, 2 Stöcke, 1 Fackel; 33 Schmelzvorgänge = 5 Kohle); geteilte Rundung (9 Planken = 3 Stämme); Steinsäge 4 vs. Werkbank 8 Bruchstein; Tag-Wahl aus dem Baum bzw. Standard; Rohstoff vor Rezept, „vorhanden“, unbekannte Items/Modblöcke; Farben/Beton/Wasser; Kupfer gewachst und oxidiert; Bilanzprüfung für Beispielprojekt und alle 16 Gebäude, deterministisch; CSV.
- `npm run check`: Typprüfung, Builds, 204/204 Node-Tests (194 + 10), Dokumentationsprüfung bestanden. `npm run test:e2e`: 26/26 (24 + 2).
- Neue Browserprüfung (`tests/e2e/recipes.e2e.mjs`, 1400 px und 390 px): Abschnitt vollständig aufgelöst, Schritt als vorhanden markieren und zurücksetzen, Werkbank-Modus nie weniger Rohstoffe, CSV-Download, kein waagerechtes Scrollen, keine Konsolenfehler. Desktop- und Mobil-Screenshot visuell geprüft.

### 27.10.2026 – P5-01 Litematic-Adapter
- Grundlage main 33872c5 (nach Rebase auf B1-R) plus P5-01. Node 22, lokales Playwright/Chromium, Python 3 (nur Standardbibliothek).
- `npm run check`: Typprüfung Kern/Web, Builds, 230/230 Node-Tests (204 bisher + 26 in `tests/litematic.test.mjs`), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: unabhängige Python-Fixture mit zwei Regionen (negative Größen, Lücke, Eintrag über Long-Grenze, Tile-Entity, Entity, Tick, Metadata mit int64-Grenze) gegen handgeschriebene Zelltabelle; TypeScript- und Python-Leser Zelle für Zelle gleich; Einzelregion; Bitpacking 2–20 Bit gegen BigInt-Referenz; Abweisung von Format ≥ 8, Format 1, fehlender Version, leeren Regionen, Größe 0, falscher Long-Anzahl, Palettenindex außerhalb, Palette ohne Name/ungültiger ID/Nicht-String-Property, negativer DataVersion, Sponge-Wurzel; Limits (Volumen, Box je Achse mit Hinweis, Regionenzahl); Überlappung mit Warnung und verworfenem BlockEntity; BlockEntity auf Luft; 1.12-Dateien; Formaterkennung Schem/Litematic/MCEdit/.nbt/unbekannt/ohne GZip; Schreiber (Layout, Luft auf Index 0, Tile-Format, Metadata, Zählung, reservierte Felder, kein WorldEdit-Hinweis), Python-Leser für beide Anker und Lückenpolitiken, deterministischer Roundtrip, Versionswahl 5/6/7 nach DataVersion, Export einer Revision aus der Domäne.
- `npm run test:e2e`: 29/29 (26 bisher + 3 in `tests/e2e/litematic.e2e.mjs`): Betrachter öffnet die Litematic-Testdatei mit beiden Regionen und Bericht; Bibliothek importiert, wählt Region „Turm“, speichert als Bauteil; Tab „Export“ lädt `.litematic` (Format 6 für DataVersion 3465) herunter, Python-Leser bestätigt. Betrachter-Screenshot visuell geprüft.
- Grenzen: keine echte, von Litematica gespeicherte Datei und keine Ladeprüfung in Litematica im Spiel; nur Chromium.

### 28.10.2026 – B9-A Gebäudekatalog v2
- Grundlage main 5c7e9c2 plus Katalog v2. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 234/234 Node-Tests, Dokumentationsprüfung bestanden.
- Neue bzw. geänderte Node-Fälle (`tests/catalog.test.mjs`): ≥ 150 Gebäude mit eindeutigen IDs und Namen; alle Zustände im B7-Katalog und drehinvariant; Materiallücken und Annahmen exakt wie in `gaps`/`assumed` deklariert; Versions-IDs der 16 klassischen Gebäude und drei Module unverändert (festgeschrieben); Familien (8 Starterhäuser, Familien-Tag kein normaler Tag, Zusammenfassen zählt genau eine je Familie, `buildingInfo`); Inspirationslinks nur auf minecraft.wiki; Spielphase (Regeln, Filter `stageMax`, Sortierung); 9 Ensembles: alle Mitglieder vorhanden, keine Voxelkonflikte, Minimum-Ecke bei `at`, fehlendes Bauteil ⇒ kein Projekt, `ensemblesWith`. Namensgenaue Abfragen laufen auf der festen klassischen Teilmenge. `tests/recipes.test.mjs` prüft alle 150 Gebäude auf Rezepte (Endertruhe ergänzt).
- `npm run test:e2e`: 29/29. `catalog.e2e` (1400 px und 390 px): ≥ 150 Einträge, Zusammenfassen verringert die Liste, nordische Wohnhäuser, Spielphase „bis früh“ ohne spätere Phasen, Starterhaus mit „+7 Varianten“, Umschalten auf Kirsche und Eiche, Ensemble-Verweis im Steckbrief, Ensemble „Burg“ konfliktfrei als Projekt mit 7 Instanzen, Vorschläge und Übernahme wie bisher. `app.e2e`: Tagfilter „tor“ findet das Modul und die neuen Tore; Editor-Bauteilliste > 150 Einträge, Suche „eckturm“ ⇒ 1.
- Gefunden und behoben: Die Editor-Bauteilliste streckte die 3D-Ansicht auf 6 511 px, Klicks in die Bildmitte trafen nichts (snap/viewer-E2E rot). Jetzt Suchfeld und Scrollfläche, 3D-Ansicht 721 px hoch.
- Vorschaubilder aller Sets mit eigenem Renderer gesichtet (Fenster, Dächer, Windmühlenflügel, Schiffsrumpf nachgebessert).
- Grenzen: Redstone-Module (Sortierer, Taktgeber, Schmelzmodul, Wasseraufzug) nach Java-Regeln gebaut, aber nicht im Spiel geprüft; nur Chromium.
