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
