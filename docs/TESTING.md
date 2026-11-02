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

### 28.10.2026 – B11 Oberfläche Bibliothek und Projektzentrale
- Grundlage main dce4394 plus B11. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 234/234 Node-Tests, Dokumentationsprüfung bestanden.
- `npm run test:e2e`: 29/29. `catalog.e2e` neu geschrieben (1400 px und 390 px, siehe [UI](architecture/UI.md#prüfung)), dreimal hintereinander grün; `app`, `snap`, `persistence` auf Kartenlinks und Detailseite umgestellt, Prüfinhalte unverändert.
- Gefunden und behoben: Kategoriekacheln wuchsen vor dem Laden des Bildes auf 241 px (feste Höhe); alte Listenregel `max-height: 720px` schnitt das Kartenraster ab; mobile Navigation blendete „Bibliothek“ aus.
- Sichtprüfung per Screenshot: Übersicht, Detailseite, Ensembles, Projektzentrale (1400 px) und Übersicht/Detail (390 px).
- Grenzen: nur Chromium; Vorschaubilder sind Näherungsfarben ohne Texturen; Touch nur über Playwright-Viewport, nicht auf echtem Gerät.

### 28.10.2026 – B12 Schem-Ansichten, Bauversionen, Bibliothek
- Grundlage main c04b66c plus B12. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 247/247 Node-Tests (234 + 8 in `tests/variants.test.mjs` + 5 in `tests/schem-views.test.mjs`), Dokumentationsprüfung bestanden. B7-Drehtest um Braustand, Zielblock und Netherwarze erweitert.
- `npm run test:e2e`: 33/33 (29 + 4 in `tests/e2e/schem.e2e.mjs`, siehe [SCHEM_VIEWS](architecture/SCHEM_VIEWS.md#prüfung)); `catalog.e2e` scrollt auf schmalen Bildschirmen die erste Karte ins Bild, bevor es auf das (nachgeladene) Bild wartet.
- Gefunden und behoben: Kamera nach Import teils außerhalb des Bildes; mobile Detailseite 20 px breiter als der Bildschirm (alte `.stats`-Regel); Bildstreifen-Knöpfe 219 px hoch (globale `.loading`-Abstände).
- Sichtprüfung per Screenshot: Bilder, Ebenen, Versionen (1400 px) und Bilder/Ebenen (390 px).
- Grenzen: nur Chromium; keine Prüfung auf echtem Gerät; Hauptbundle rund 725 kB über der Warnschwelle.

### 28.10.2026 – B14 Baustelle
- Grundlage main 0a1d2a8 (mit B12, B13-Reservierung) plus B14. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 254/254 Node-Tests, Dokumentationsprüfung bestanden. `npm run test:e2e`: 35/35. Neu `tests/site.test.mjs` (7 Fälle) und `tests/e2e/site.e2e.mjs` (2 Fälle, 1400 px und 390 px), Inhalte in [SITE](architecture/SITE.md#prüfung). `recipes.e2e` weiter grün mit dauerhaft gespeichertem „vorhanden“.
- Gefunden und behoben: Die Beispiel-Burgmauer zeigte zunächst 8 „verbaute“ Freiräume, weil passende Nachbarn ohne gespeicherte Verbindung als Fremdblöcke galten; jetzt Zustand „angedockt“ mit Knopf „Angedockte verbinden“. Lagerfelder wurden von einer globalen Eingaberegel gestreckt (eigene Breite).
- Sichtprüfung per Screenshot (1400 px).
- Grenzen: nur Chromium; Sammelzeiten sind Richtwerte.

### 28.10.2026 – S1 Stabilität und Qualitätssicherung
- Grundlage main 577f4aa (nach Rebase auf B12 und B14) plus S1. Node 22, lokales Playwright/Chromium.
- Ausgangslage vor Änderungen: `npm run check` 234/234, `npm run test:e2e` 29/29.
- `npm run check`: Typprüfung Kern/Web, Builds, 268/268 Node-Tests (254 nach B12/B14 + 7 in `tests/integrity.test.mjs` + 7 in `tests/stability.test.mjs`), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: Datencheck je Befundart (beschädigte Payload, fehlende Version auch nur in eingefrorener Revision, Bauteil-/Versionsbuchhaltung, fehlende/beschädigte/unbenutzte/unlesbare Originale, kaputte Projektdatensätze ohne Abbruch, keine Mutation; Prüfsumme der Originale unabhängig über Node-crypto); Auslieferungsprüfung (gleich/verändert/fehlt, fremdes Manifest abgelehnt); Route `#/system`; Großmodell 605 568 Blöcke mit Zeitbudgets für Version, Auflösung, Material, Anleitung, Flächen, Datencheck, Sicherung; Geometriehash zeichengleich zur Referenzdefinition (zusätzlich vor/nach Umbau für 348 Schritte aus Modulen und Gebäuden identisch); Validierungscache nur bei mindestens so strengen Limits; schneller Validierungspfad mit denselben Meldungen.
- Messung Großmodell vorher → nachher: `resolveProject` 17,1 s → 4,3 s, `buildGuide` 6,0 s → 4,2 s, `computeMaterials` 2,9 s → 2,0 s (Container, schwankend).
- `npm run test:e2e`: 40/40 (35 nach B12/B14 + 5 in `tests/e2e/stability.e2e.mjs`): Importvorschau bei 1400 px und 400 px (3D-Fläche nicht höher als das Fenster, Bildmitte sichtbar; vorher 2 022 px hoch); Systemcheck ohne Befund; per IndexedDB beschädigte Version und verwaiste Instanz ⇒ „✕ 2 Fehler“ mit Empfehlung; Fehlerprotokoll mit Bericht über die Zwischenablage. Screenshots von Importvorschau (Desktop/schmal) und Systemcheck visuell geprüft.
- Nach Rebase auf B12 gefunden und behoben: die feste Höhe der 3D-Fläche galt zuerst für jede `.detail-stage` und ließ die Fläche in der B12-Schem-Ansicht (Flex-Spalte) auf 0 px Breite schrumpfen; jetzt nur für direkte Kinder von `.detail-hero`.
- Grenzen: Absturzschutz nicht mit echtem Zeichenfehler im Browser ausgelöst; nur Chromium; Zeitbudgets fangen nur grobe Rückschritte.

### 28.10.2026 – B13 Parametrische Generatoren
- Grundlage main 5467886 (mit B12, B14, S1) plus B13. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 281/281 Node-Tests (268 + 13 in `tests/generators.test.mjs`), Dokumentationsprüfung bestanden. `npm run test:e2e`: 42/42 (40 + 2 in `tests/e2e/generators.e2e.mjs`; ein erster mobiler Lauf zählte die Karten vor dem Rendern, jetzt mit Warten). Inhalte in [GENERATORS](architecture/GENERATORS.md#prüfung).
- Gefunden und behoben: Brückenvorschau zu hoch (Plot-Höhe vorgegeben), doppelte Klammern im Namen, Kartenlayout der Übersicht, Nachrechnungs-Hinweis mobil unsichtbar (globale `.small-note`-Regel).
- Sichtprüfung per Screenshot (1400 px): alle Generatoren, 9 Vorlagen, Burganlage, Festung, Altstadt, Kirschblütendorf.
- Grenzen: nur Chromium; keine Spielabnahme der Bauwerke.

## S2 · 31.10.2026 · Bibliothekseinstellungen

- Ausgangspunkt: main `3eddf50`. Änderungen in `prefs.ts`/`preferenceStore.ts`, vier Regressionen in `tests/preferences.test.mjs`.
- `npm ci --ignore-scripts`: erfolgreich, Lockfile unverändert.
- `npm run check`: 285/285 Node-Tests bestanden; strenge Kern-/Web-Typprüfung, Kern-/Pages-Build und Dokumentationsprüfung bestanden.
- `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" npm run test:e2e`: nicht ausführbar; jeder Browserstart scheitert vor dem Testverhalten an der fehlenden Datei `chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`. Keine Browserabnahme behauptet.
- Zusätzlicher Vorschauversuch über Sites-Preview: Browser erreicht den Server, Vite weist den Vorschauhost `terminal.local` ab. Keine Host-/Sicherheitsregeln geändert.
- Wegen der vollständigen Browserprüfpflicht aus AGENTS/BLOCKS keine Main-Integration oder Pages-Veröffentlichung. Keine Minecraft-/Safari-/iPhone-Abnahme.

### S2 · Veröffentlichung nach Nutzerpräzisierung
Expliziter Nutzerauftrag vom 31.10.2026 verlangt Push und anschließende Pages-Veröffentlichung trotz dokumentierter fehlender Browser-Testinfrastruktur. Code seit erfolgreicher Typprüfung und vier Regressionen unverändert. Veröffentlichungsskript baut aus dem gepushten Commit und prüft die Pages-Artefakte erneut; Liveprüfung erfolgt separat.

## B8P · 31.10.2026 · Spielaufnahmen und Verlauf

- Neue Regressionen `tests/scan-persistence.test.mjs`: atomare Referenz-/Originalübergabe, doppelte Importdatei, manuelle Ausrichtung, baseRevision-Konflikt, falscher SHA/Projekt-/Revisionsbezug, ungültige Koordinaten, beschädigte/fehlende Originale, Backup-Roundtrip, fehlende Dateien und Datencheck. Original-SHA wird unabhängig mit Node crypto berechnet.
- `npm run build:core && node --test tests/scan-persistence.test.mjs tests/backup.test.mjs tests/game-check.test.mjs`: 27/27 bestanden (acht neue Persistenztests). Strenge Kern-/Web-Typprüfung bestanden.
- Zusätzlich `tests/e2e/scan-persistence.e2e.mjs` erstellt: UI-Speichern, Reload mit Ausrichtung, Verlaufsauswahl und bytegleicher Originaldownload. Nicht als bestanden gewertet: vorhandenes Playwright-Chromium fehlt in dieser Umgebung (siehe S2).
- Echte Spiel-/Safari-/iPhone-Abnahme nicht durchgeführt. Keine Commits/Pushes durch den Teilthread; Integration und Gesamtprüfung übernimmt der Hauptthread.

## Parallelblöcke · 31.10.2026 · Gesamtintegration
`npm run check`: 303/303 Node-Tests, Kern-/Web-Typprüfung, vollständiger Build und Dokumentationsprüfung bestanden. B8P, S3 und B15-L gemeinsam geprüft. Zusätzliche Scan-Persistenz-E2E-Datei vorhanden, nicht als bestanden gezählt (Chromium fehlt). Livekartenadapter zusätzlich separat auf Origin-Invarianz geprüft; keine externe Providerverbindung oder Spielabnahme behauptet.

### Abschlussprüfung einschließlich Branchmigration
`npm run check`: 310/310 Node-Tests bestanden, Typprüfungen, Builds und Dokumentationsprüfung bestanden. Sieben zusätzliche Tests prüfen Main-Root-Artefaktmerge, Quellenkollisionen, Manifestmanipulation und tatsächlichen Git-Tree-Erhalt. Branchlöschung und Pages-Quellenwechsel nicht ausgeführt (fehlende Verwaltungsfähigkeit bzw. nicht abgeschlossene Browseranmeldung).

### Hostingkorrektur
Interner Buildjob 124539104569 (Run 41201874786) bestätigt main/root. 404-Live-Manifest mit fehlendem Root-Artefakt vereinbar; frühere Doku gh-pages war nicht aktuell. Publisherwechsel delegiert an bereits siebenfach geprüften Main-Root-Merge. Buildausgabe und Livesource werden nach Artefaktintegration getrennt geprüft.

## Strukturpflege und Marker-Rückweg · 31.10.2026
- `npm run check`: bestanden, 312 Node-Tests; strenge Kern-/Webtypprüfung, beide Builds und Dokumentationslinks gültig.
- Marker-Roundtrip über JSON, unabhängige Kopien, ungültige Schema-/Format-/Koordinatensystemwerte, fehlende/zusätzliche Felder, Duplikate und Arraygrenzen geprüft.
- `git diff --check`: bestanden. Keine neuen Abhängigkeiten oder UI-Änderungen. Browserprüfung weiterhin mangels Chromium offen; keine Spiel-/Providerabnahme behauptet.

## UI-01 Theme-Tokens · 01.11.2026
- Neue reine Theme-Funktionen und fünf Node-Regressionstests im Repository ergänzt.
- Isolierte Vorabprüfung des inhaltsgleichen Theme-Moduls in `/mnt/data/themecheck`: `node --test theme-tokens.test.mjs` — **5 bestanden, 0 fehlgeschlagen** (Node 22.16.0). Die im Repository gespeicherte Fassung wurde noch nicht in einer vollständigen Arbeitskopie geprüft.
- Vollständiges `npm run check`, Browser-E2E und Pages-Publishing **offen**: Container kann `github.com` nicht per DNS erreichen, vollständiger Checkout und npm-Installation nicht verfügbar.
- Noch keine React-Einbindung: UI bleibt unverändert. Keine GitHub Actions.

## UI-01 / MAT-02 / Navigation · 01.11.2026 · Gesamtintegration

- Grundlage: main `5521a8985db07e56561d3601b834cadeda34fda0`, drei vom Nutzer beauftragte parallele Arbeitsblöcke; keine neuen Abhängigkeiten. `npm ci --ignore-scripts` erfolgreich, Lockfile unverändert. Frühere fehlende Checkout-/DNS-Fähigkeit ist in dieser Sitzung behoben.
- `npm run check`: 334/334 Node-Tests, strenge Kern-/Web-Typprüfung, Kern-/Pages-Build und Dokumentationsprüfung bestanden. Enthalten sind zehn Theme-/Speichertests, drei Materiallabor-Tests und vier Routenregressionen. Vor Integration abschließende identische Gesamtprüfung; Ergebnis gilt nur bei erfolgreichem Exit.
- Geprüft: Text-/Akzent-/Buttonkontrast der zehn Paletten, Systemauflösung, beschädigter/gesperrter/voller Speicher; exakte Doppelstufen-/Türmengen, Familienfilter, Annahmen, Herkunft und Nichtmutation; 15 Routen-Roundtrips mit Unicode und Sonderzeichen, beschädigte Kodierung und Prototype-Namen.
- `npm run test:e2e` tatsächlich gestartet: Browserstarts scheitern vor dem Testverhalten am fehlenden Chromium/Headless-Shell-Executable. Keine Browserabnahme. Neue Theme- und erweiterte Material-E2E-Tests für 1400/390 px zusätzlich per `node --check` syntaktisch geprüft. Vollständige visuelle Hell-/Dunkel-/Touch-/Safari-/iPhone-Abnahme bleibt offen; Tokenkontrast allein belegt keine vollständige Barrierefreiheit.
- `git diff --check` bestanden. Bestehende Vite-Warnung für das große Hauptbundle bleibt bestehen; keine gemessene Bundleoptimierung behauptet.
- Veröffentlichung: Shell-Push hat keine GitHub-Anmeldung; der vorhandene GitHub-Konnektor übernimmt die reguläre Main-Integration mit erwarteter Head-SHA. Unmittelbar danach wird der Build mit dessen Quell-SHA neu erzeugt, über `prepare_main_pages.mjs` geprüft und als Artefakt-Kindcommit auf main übertragen. Live-Manifest und Dateihashes werden separat geprüft; kein Force-Push, keine eigenen Actions, kein zusätzlicher Branch.

## Bauwelten / MAT-03 · 01.11.2026

- Grundlage: main `885c814503385ba8a07d64a68cd712fab2ed8bd0`; zwei parallele Ausbaublöcke und Hauptthread-Einbindung. Keine zusätzlichen Abhängigkeiten oder Workflows.
- `npm run check`: 342/342 Node-Tests bestanden; strenge Kern-/Web-Typprüfung, Kern-/Pages-Build und Dokumentationsprüfung erfolgreich. Acht zusätzliche Tests: tatsächliche Themen-/Katalogabdeckung, identische Treffer-IDs aus serialisierten Suchlinks, eigene/archivierte Bauteile; getrennte Materialfamilien, Formbeschränkung, Properties, BlockEntity-Erhalt und Materialregeln aller scoped Farbsätze.
- Ergänzte Routen-Roundtrips für Bauwelten und kodierten Projektkontext. `git diff --check` und `node --check tests/e2e/build-themes.e2e.mjs` bestanden. Eingehende Themenlinks werden vor dem Zurückschreiben alter Filter übernommen; Sortierung fällt gezielt auf den Linkstandard zurück.
- `node --test tests/e2e/build-themes.e2e.mjs` gestartet: beide Viewportfälle scheitern beim Browserstart an fehlendem Playwright-Chromium, bevor das Produktverhalten geprüft wird. Kein Browsernachweis. Test deckt 1400/390 px, alte Suche → Bauwelten → identische Treffer, Reload, Detailnavigation und erhaltenen Projektkontext ab; visuelle Desktop-/iPhone-Prüfung bleibt offen.
- Bestehende Vite-Bundlewarnung bleibt bestehen. Keine neue Kupfer-/Modprofil-/Spielabnahme behauptet. Veröffentlichung regulär über den Konnektor; Main-Root-Artefakte mit `prepare_main_pages.mjs`, erwarteter Head-SHA und anschließendem Live-Manifest-/Hashvergleich wie im Runbook. Keine neue Branchhistorie und kein Force-Push.
- Zusätzlicher Reproduzierbarkeitsnachweis MAT-03: bisheriges variants.ts aus HEAD separat transpiliert, mit aktueller Fassung über dieselben BUILDING_SPECS verglichen; SHA-256 von JSON.stringify(payload) für alle 174 mitgelieferten Gebäude unverändert. Die neuen scoped Sätze ändern bestehende Bauversionen nicht.

## PLAN-01 / ARCH-01 / DOC-01 · 01.11.2026 · Roadmap und Anwendungsschicht

- Grundlage main `84838f0200be5fc4c8faef30a185a764ee474bd2`; vollständiger Git-Clone, Node 24.22.1. `npm ci --ignore-scripts` erfolgreich; keine neuen Abhängigkeiten, Lockfile unverändert.
- `npm run check`: **353/353 Node-Tests**, strenge Kern-/Web-Typprüfung, Kern-/Pages-Build und Dokumentationsprüfung bestanden. Elf neue Tests: fünf Roadmap-, drei Architektur- und drei Anwendungstests. Bestehende Export-/Aufnahmetests auf die neue Anwendungsschicht umgestellt; Assertions bleiben erhalten.
- Architektur: reine Domain ohne Formate/Browserpakete; Typimporte, Reexports und dynamische Importliterale geprüft. Export aus historischen Revisionen, fehlende Versionen, Writerfehler ohne neue gespeicherte Revision, beide Formate und gemeinsame Konfliktfehleridentität geprüft. Alle bisherigen unabhängigen Python-NBT-/Schem-/Litematic-Prüfungen bleiben Teil des Gesamtchecks.
- Roadmap: 56 eindeutige Aufgaben in vier Phasen, echte Nachweispfade, bekannte/azyklische Abhängigkeiten; falscher „geprüft“-Status abgewiesen. Quelländerung ohne neue Historie, Dateizuordnung oder Aufgabenereignis abgewiesen; historische Ereignisse dürfen nicht umgeschrieben werden. Reine Artefakt-Kindcommits sind von der Aufgabenpflege ausgenommen und werden weiterhin separat durch den Publisher manifestgeprüft.
- `npm run check:roadmap-change -- HEAD`: erste Roadmapmigration gegen den vorherigen Mainstand geprüft. `npm run setup:hooks` aktiviert den lokalen Pre-Push-Hook. Hook/Publisher mit `bash -n`, Änderungen mit `git diff --check` geprüft. API-Schreibzugriffe umgehen lokale Git-Hooks; explizite Vorprüfung im Konnektor-Runbook vorgeschrieben. Keine serverseitige Erzwingung und keine eigenen Actions.
- `npm run test:e2e` tatsächlich gestartet: Browserstart nicht möglich, da Playwright `chromium_headless_shell-1234` fehlt. Anschließender Browserinstallationsversuch über die vorhandene Playwright-CLI scheitert an ungültigen/leeren Downloadarchiven („End of central directory record signature not found“). Keine neue Browser-, GPU-, Safari-, iPhone- oder Spielabnahme behauptet. Testlauf parallel zum ersten Gesamtbuild nicht als Produktabnahme gewertet; Infrastrukturfehler separat durch isolierten Chromium-Start bestätigt.
- Bestehende Warnung zum großen Vite-Hauptbundle bleibt bestehen; dieser Block behauptet keine Bundleoptimierung. Kein Datenbankschema-/AssetVersion-/Dateiformatwechsel.
- Vor Veröffentlichung abschließender Gesamtcheck und Roadmapänderungsprüfung aus dem eingefrorenen Stand. Mainintegration, Artefakt-Kindcommit, Live-Manifest und Dateihashes anschließend getrennt prüfen. Kein selbstreferenzieller Folgecommit nur für Deployment-SHAs; Nachweis im Gitverlauf/Manifest und Abschluss.

## STORE-02 · 01.11.2026 · Asset-CAS, Migration und Bearbeitungsgrundlage

- Grundlage main `18f70b7`, Quellvorgänger `ccf4fa71c033c2f9415528192a04faed36730660`. Frühere PLAN-/ARCH-/DOC-Veröffentlichung separat live bestätigt: Quell-SHA identisch, zwölf Dateihashes/Größen identisch. Diese Integrationsnachweise werden mit diesem fachlichen Quellblock in der Roadmap nachgeführt.
- `npm run check`: 364/364 Node-Tests, strenge Kern-/Web-Typprüfung, ausführbare Modulprüfung, Roadmapschema/Generierung, Kern-/Pages-Build und Dokumentationsprüfung bestanden. Keine neue Abhängigkeit. Bestehende Bundlegrößenwarnung bleibt bestehen.
- Elf neue Node-Regressionen: sieben Speicherfälle (zwei konkurrierende Änderungen, Versionsanhang, Fehler/Overflow, Kopiergrenzen, Duplikate und fehlerhafte Assets), drei Domänen-/Restorefälle (alte checksummierte Sicherung ohne Feld, fremde lokale Revisionsbasis und veralteter Restoreplan), eine echte konkurrierende Katalogeinrichtung mit aktuellem Retry. Fehlgeschlagene Batches lassen Assets, Versionen, Originale und Projekte unverändert.
- `node --test --test-concurrency=1 tests/e2e/asset-concurrency.e2e.mjs tests/e2e/asset-editing.e2e.mjs`: tatsächlich gestartet, alle drei Fälle scheitern beim Chromiumstart vor dem geprüften Produktverhalten (Executable fehlt). Die Adapterregression beschreibt echte v1→v2-Migration, getrennte Verbindungen, Erhalt von Originalbytes und vollständiges Upgrade-Rollback bei fehlerhaften Altzeilen. Die UI-Regresssion beschreibt erhaltene Entwürfe trotz Broadcast sowie explizites Neuladen. Keine Browser-/Migrations-/iPhone-Abnahme behauptet; STORE-02 bleibt „implementiert, Abnahme offen“.
- `git diff --check`, strenge Typprüfung und gezielte 21 Speicher-/Anwendungs-/Aufnahme-/Restoretests zusätzlich bestanden. Getrennte Tests der alten Sicherungsbytes, lokaler Revisionsübernahme und 177 einmalig angelegter Katalogeinträge bestanden. Kein gespeichertes Geometrie-/AssetVersionformat geändert.

## WORLD-02 · 01.11.2026 · Bauwelten für fernöstliche Gärten, Wüstenhandel und End

- Grundlage main `8f22780` (vorheriger STORE-02-Stand des anderen Clients unverändert übernommen). Keine neuen Abhängigkeiten, Lockfile unverändert, keine Workflows.
- Abdeckung zuerst geprüft: `stil` kennt `fernoestlich` (5 Einträge), `wuestenstil` (6) und `end` (2); nur diese drei Richtungen wurden ergänzt. Bestehende Welten, Gebäude, Versionen und Payloadhashes bleiben unverändert.
- Neue Welten ausschließlich aus vorhandenen Facettenwerten: „Fernöstlicher Garten“ (`fernoestlich` + `garten`/`sakral`/`dekoration`, 3 Treffer), „Wüstenhandel & Oasenweg“ (`wuestenstil` + `wohnhaus`/`befestigung`/`wahrzeichen`, 6 Treffer), „End-Außenposten“ (`end`, 2 Treffer). Jede Welt hat drei Aufbauideen und denselben Serializer-Link wie die normale Bibliothek.
- `npm run build:core` und `node --test tests/build-themes.test.mjs`: 4/4 bestanden. Der neue Test prüft die drei Welten gegen den tatsächlich erzeugten Katalog (Trefferzahl, Vorschauen derselben Stilrichtung, reproduzierbarer Link mit identischen IDs) und dass keine Welt eine Stilrichtung ohne Bauteile nennt. Die bestehenden Prüfungen (11 eindeutige IDs, reale Facetten, 3 Aufgaben, eigener Bestand, Archivzustand, leerer Bestand) laufen unverändert weiter.
- `npm run check`: **365/365 Node-Tests**, Architektur-, Roadmap-, Typ-, Kern-/Pages-Build- und Dokumentationsprüfung bestanden.
- Grenzen: keine Browser-/Touch-Sichtprüfung der drei neuen Karten (Chromium fehlt weiterhin, QA-01 offen); keine Aussage über Minecraft-Kompatibilität, Gelände oder Spielverhalten. Die Stilrichtungen `klassisch`, `antik` und `tropisch` bleiben bewusst ohne eigene Welt.
- Veröffentlichung geprüft: Quellcommit `c3e6478` regulär auf main integriert, Pages-Artefakt-Kindcommit `bc74958`. Live-`deployment.json` meldet denselben Quellcommit und dieselben zwölf Dateihashes wie der lokale Build; `index.html` und das Hauptbundle wurden zusätzlich als Bytes geladen und stimmen in Größe und SHA-256 überein. Ein fehlendes Git-Identitätspaar brach den ersten Publisherlauf ab, bevor irgendetwas geschrieben wurde; nach lokaler Konfiguration lief er unverändert durch. Kein Force-Push, keine eigenen Actions.


- `npm run check:roadmap-change -- 18f70b7` vor Quellintegration erforderlich und bereits für den Zwischenstand erfolgreich. Abschlusseintrag deckt sämtliche Dateien ab; Quellcommit wird vor Refupdate nochmals mit demselben Checker geprüft. Artefakt-Kindcommit bleibt ausschließlich manifestgeprüft und erhält keinen neuen Roadmap-Zyklus.

## PERF-01 / PERF-02 · 01.11.2026 · Zusammenhängender Performanceblock

- Grundlage main `2b8ea8d3dfc7a640167f8bb2657ab044d9fa2c36` einschließlich Cline-WORLD-02. Keine fremden Themen-/Roadmapänderungen überschrieben und keine neue Abhängigkeit.
- `npm run check`: 377/377 Node-Tests bestanden; Architekturgrenzen, generierte Roadmap/Historie, strenge Kern-/Web-Typprüfung, Kern-/Pages-Build und Dokumentationsprüfung erfolgreich. Zwölf neue Tests: acht Rechenfall-/Worker-Lifecycle-/Übertragungsfälle und vier interne Indexregressionen. Aktuelle Vite-Bundlewarnung bleibt bestehen.
- Geprüfte Inhalte: identische Auflösung, Anleitung, Gesamt-/Instanz-/Schrittmaterialien und Baustellenpläne aus den vorhandenen Fachfunktionen; eingefrorene Revision; teilweise überlappende Instanzen; Packlistensummen mit gemeinsamer Stapelgrenze; Abbruch, supersedierte und verspätete Antworten, fremde Job-/Projekt-/Revisions-/Basis-Tags, Worker-/Clonefehler, Timeout, Retry und Dispose. Keine synchronen Ersatzberechnungen bei fehlendem Worker.
- Echter Node-worker_threads-Lauf: vollständige Structured-Clone-Rückgabe einschließlich Maps und Baustellenplan semantisch identisch. Abgegrenzte Teilthreadmessung auf Node v24.22.1 / AMD EPYC 9V74, 42.875 Zellen: Hauptthreadberechnung 478 ms, Worker inklusive Start/Kopieren 725 ms, 121 bediente Heartbeats, maximaler Abstand 23 ms. Node-Responsivität ist kein Browser-/Mobilnachweis und bedeutet keine kürzere Gesamtlaufzeit.
- `node --expose-gc scripts/benchmark_composition.mjs 2b8ea8d`: 266.784 Zellen, drei Vorher-/Nachherläufe, gesamte öffentliche Resolution inklusive Map-Reihenfolge in allen sechs Ausgaben SHA-256-identisch. Letzter Median 833,60 → 790,37 ms (5,2 % niedriger), erste Serie 14,7 %. Streuung, Hardware und sichere Indexgrenze dokumentiert in COMPOSITION_PERFORMANCE. Öffentliche owners-Map bleibt kompatibel; keine Chunk-/Cacheimplementierung behauptet.
- `node --test tests/e2e/project-computation.e2e.mjs`: vier reale Browserfälle tatsächlich gestartet, alle bereits beim Chromiumstart blockiert (Executable fehlt), kein Produktverhalten ausgeführt. Szenarien: 1400/390 px mit echten Workern, cancel/retry, schnelle Y-Änderungen, ausgeblendete alte Geometrie, Fehler/Retry und historische Revision. Kein Browser-/GPU-/iPhone-Leistungsnachweis. Sichtbare Berechnung und Speicherung bleiben getrennt.
- `git diff --check` und `npm run check:roadmap-change -- 2b8ea8d` bestanden. Abschlussereignis ordnet sämtliche Quelldateien zu; konkrete Commitprüfung vor Konnektor-Refupdate sowie erneuter Quellbuild vor manifestgeprüfter Main/root-Veröffentlichung folgen. Kein Force-Push und keine eigenen Actions.
- Grenzen: kompletter Rechenauftrag auch bei Fortschritts-/Lager-/Speicheränderung; selektive Invalidierung bleibt PERF-02-S03. Structured Clone und große Viewer-Aktualisierungen können Hauptthreadzeit verbrauchen. Exportwriter und zusätzlicher Spielvergleich wurden nicht vollständig ausgelagert.

### PERF-01 · Direkter veröffentlichter Desktop-Smoke nach Deployment

- Quelle `7dffd922f46876c70700afc0429afb969e5478aa`, Artefakt `e1d6ba067d903044dc478277721cb0d432205d4f`: Livesource und alle **13** Dateihashes/Größen einschließlich `project.worker-CzW_6JlY.js` bestätigt.
- Zusätzlich echter Cloud-Chrome-Browser auf der öffentlichen Pages-Seite: Projektzentrale mit IndexedDB geladen, eigenes synthetisches Beispielprojekt erzeugt, Workerzustand pending → ready und geometrisch konfliktfreies Ergebnis mit 350 Blöcken sichtbar bestätigt.
- Turm West zweimal nacheinander um Y +1 verschoben: sichtbare Koordinate 2, während Berechnung keine alten Blockmengen als aktuellen Stand angezeigt; anschließend Schritt 9 „Grundblöcke · Turm West · Y 2“ mit 16 Blöcken und korrektem Ebenenplan sichtbar. Materialtab: 350 Bauitems / 350 platzierte Blöcke / 10 Inventarplätze / 1 Shulkerkiste. Baustelle: 0 von 350 Blöcken, 31 offene Schritte, 5 bereit. Keine sichtbaren Produkt-Alerts.
- Screenshot dieses synthetischen Desktop-Teststands als Prüfnachweis in der Abschlussantwort. Er enthält keine echten Weltdaten oder privaten Projektinhalte. Die Beispieländerungen wurden ausschließlich in der Browser-Testinstanz lokal gespeichert.
- Grenze: dies ist eine direkte manuelle Funktionsprüfung, kein Ersatz für die vier automatisierten Workerregressionen, die vollständige DB-Migration, historische Revisionen, Abbruch-/Fehlerfälle, GPU-/Mobilabnahme oder gemessene Browserlatenz. Der konfigurierte lokale Playwrightlauf bleibt vor Produktstart blockiert. Browser-Erweiterungs-Metadatenfehler wurden nicht als Produktfehler gezählt.

## Codex-Arbeitsgrundlage · 01.11.2026 · Windows-Clone und echte Browserregression

- Grundlage: sauberer vollständiger Clone von main `9f1700eb17299a83a55929d59ad5998526b2143f` in den zuvor leeren Arbeitsordner. Node v24.18.0, npm 12.0.1, Python 3.14.6, Windows/PowerShell; Git Bash für Publisher/Hookprüfung. Git-Identität lokal aus der bestehenden Repositoryhistorie übernommen, globale Einstellungen unverändert.
- `npm ci --ignore-scripts`, Installation von exakt Playwright 1.64.1 und `npm run setup:codex` erfolgreich. Setup führt erneut Lockfileinstallation, Hookaktivierung und Kern-/Webbuild aus. `npm run setup:browser` erfolgreich; Chromium/Headless-Shell Revision 1248 ist tatsächlich nutzbar. Keine fremden Abhängigkeiten vorausgesetzt; keine neuen Produkt-Laufzeitpakete, keine eigenen Actions.
- Erster Windows-Check scheiterte an CRLF in generierten Roadmapansichten. `.gitattributes` legt LF fest. Unix-URL-Pfade in unabhängigen Python-/Main-Pages-Tests auf `fileURLToPath` umgestellt, Python auf Windows korrekt ausgewählt und UTF-8 explizit aktiviert. Danach vollständiger Check mit allen 377 Bestands-Node-Tests bestanden. Zwei zusätzliche Python-Prozessregressionen für Unicode/literale Argumente ohne Shellauswertung und Fehlercodeweitergabe separat 2/2 bestanden.
- Erste vollständige Browserausführung: 44/54 bestanden, zehn echte Testausfälle. Ursachen untersucht: veraltete Bauweltenzahl 8 statt 11, mehrdeutiger Konflikthinweis, exakter impliziter Labelname, Initialisierungsereignisse für bereits abgebrochene Worker und sofortige Rezeptzählung während asynchroner Neuberechnung. Selektoren und Wartepunkte korrigiert, keine fachlichen Mengen-/Konfliktassertionen entfernt. Workerstartanfragen und tatsächlich initialisierte Worker getrennt geprüft.
- Echter Produktfehler: GameCheckPanel wurde während pending/ready oder historischer Berechnung ausgehängt; sein Mount-Effekt löschte die Aufnahme bzw. verlor die Speicherbestätigung. Controller mit stabiler Identität in allen Bauzuständen erhalten; Vergleichsgeometrie bleibt weiterhin snapshotgebunden. Bestehende Aufnahmeimport-/Speicher-/Originalregressionen schlagen davor fehl und bestehen danach. Kein gespeichertes Datenformat geändert.
- Abschließendes `npm run test:e2e`: **54/54 bestanden**, 0 Fehler, 0 übersprungen, 195,68 Sekunden. Enthalten: echte v1→v2-IndexedDB-Migration/Altverbindung/Originalerhalt/Zwei-Verbindungs-CAS und Upgrade-Rollback; zwei sichtbare Bearbeitungs-Tabs mit Entwurfserhalt; Desktop/390-px-Abbruch/Retry/schnelle Änderungen/historische Grundlage; Aufnahmeimport, Ausrichtung, Speicherung/Reload und bytes-identischer Originaldownload; Import/Export, Katalog, Bauwelten, Materialien, Rohstoffe, Baustelle, Touchsimulation, Themes, Datencheck, WebGL und Softwarefallback.
- Abschließendes `npm run check`: **379/379 Node-Tests**, Modulgrenzen, Roadmapschema/Generierung, strenge Kern-/Web-Typprüfung, Kern-/Pages-Build und Dokumentationsprüfung bestanden. `bash -n` für beide Publisher und Pre-Push-Hook sowie `git diff --check` bestanden. Roadmap-Schema/Generierung und Dateizuordnung werden nach dem abschließenden Fortschrittsereignis erneut geprüft.
- Grenzen: geprüft wurde Windows mit lokalem Headless-Chromium, keine zusätzliche Linux-/macOS-Einrichtung, keine echte Safari-/iPhone-/Hardware-GPU-Abnahme und keine Mod-/Minecraft-Spielprüfung. Die Viewer-Messung der Suite (19.683 synthetische Zellen, 4.374 Hüllflächen, 35,7 ms Meshaufbau, 23,7 ms/Frame mit Software-WebGL) ist kein großer Worker-Vorher/Nachher-Leistungsnachweis; PERF-01-S03 und QA-02 bleiben offen. Die bestehende Vite-Warnung zum großen Hauptbundle bleibt bestehen.
- GitHub-Abfragen: Konnektor meldet push/admin; authentifizierte CLI vorhanden; main nicht geschützt, Remote enthält ausschließlich main. Keine Branchlöschung oder Schutz-/Sichtbarkeitsänderung durch diesen Auftrag. Pages-API: legacy, main / Repositorywurzel, built. Vorheriger Livezustand separat bestätigt: Quelle `ef8d9a103edb8cba604d945a375b2d15cab4da16`, alle 13 Manifestdateien live nach Größe/SHA-256 identisch.
- Codex: lokaler Checkout und Zugriff eingerichtet; zusätzliche App-Projektregistrierung und veröffentlichte Cloud-Umgebung mangels entsprechender Verwaltungswerkzeuge nicht angelegt oder bestätigt. Der konkrete Oberflächenweg und Setupbefehl stehen in CODEX_SETUP. GitHub-Rechte allein sind kein Beleg einer Codex-Umgebung.
- Veröffentlichung dieses Blocks: nach frischer Remote-/Kommunikationsprüfung regulärer Quellpush auf main, unmittelbar vorhandener Publisher mit erneutem Gesamtcheck und manifestgeprüftem Artefakt-Kindcommit. Tatsächliche neue SHAs und Livehashes werden im Abschluss separat berichtet; kein weiterer Quellcommit nur zur Eintragung seiner eigenen Deployment-SHA.

## Parallele Roadmapfortsetzung · 01.11.2026

- Ausgang main/Artefakt `6a309073872cda244a66a6b8d91452139cbdce09`, vorherige Buildquelle `b5eb5b9bc039160e668a7183c0ccfcdcd764a933`; Live-Manifest und alle 13 Dateigrößen/SHA-256 erneut bestätigt. Drei getrennte Teilagenten, Root integriert zentral. Keine Produktdateien, Abhängigkeiten, Workflows oder externen Dienste geändert.
- `node scripts/benchmark_project_browser.mjs`: 64.000 synthetische Zellen, je 1400/390 px Warmup und drei synchrone/Worker-Vergleichspaare. Alle zwölf vollständigen Ergebnisdigests je Snapshot gleich; 64.000 Zellen/Items/Besitzer, 40 Schritte, null Konflikte und echte Maps erhalten. Ryzen 5 3600/32 GiB, Chromium 156.0.8078.4, Windows, Node v24.18.0. DOM-Probe Median 693→30 bzw. 790→35 ms; Gesamtdauer 703→1184 bzw. 800→1420 ms. Größter einzelner Worker-Heartbeatabstand 230,6 ms. Rohdaten und Grenzen in architecture/project-browser-benchmark.json und PROJECT_BROWSER_BENCHMARK.md. Kein INP-/React-/GPU-/Echtgerätetest und kein historischer Versionsvergleich.
- `node --test tests/pages-restore.test.mjs`: 4/4 bestanden. `node scripts/probe_pages_restore.mjs`: 13 echte Ausgangsartefakte wiederhergestellt, sämtliche 333 Sourcepfade/Blobhashes/Modi erhalten; neues Recoverykind, bekannter Build unverändert, synthetischen Folgechunk entfernt. Nur Scratch-Clone ohne Remote, anschließend gelöscht; keine Live-/CDN-Abnahme.
- `node --test tests/e2e/ui-acceptance.e2e.mjs`: abschließend 4/4 bestanden, 25,14 s, null übersprungen. Fünf Themes × Hell/Dunkel × 1400/390 px, Materialmengen/Herkunft, elf Bauwelten und neue Links mit 3/6/2 realen Treffern über Reload. 48 Aufnahmen manuell mit Bildbetrachter geprüft, zusätzliche Kartenbilder unter ignoriertem dist/ui-acceptance; kein Produktfehler. Echte Safari-/iPhone-/GPU-Abnahme bleibt offen.
- Vollständiger Projektcheck und Browserregression laufen vor Integration; abschließendes Ergebnis wird vor Commit ergänzt.
- Erster vollständiger Browserlauf: 57/58 bestanden, ein 10-s-Timeout beim Erstellen des Beispielprojekts im Sicherungsfall, noch vor der Wiederherstellung (createSample, persistence.e2e.mjs:41/112). Gleichzeitig lief zeitweise der Kern-/Webgesamtcheck. Keine Produktdatei war geändert. Read-only Ursachenprüfung fand keinen belegten Restorefehler; deshalb keine Tests oder Timeoutgrenzen abgeschwächt. Isolierte vollständige persistence-Suite danach unverändert 3/3 bestanden (20,59 s). Vollständige Suite wird anschließend ohne parallelen Build wiederholt.
- Erster vollständiger `npm run check`: 383/383 Node-Tests, Architektur-, Roadmap-, Typ-, Kern-/Pages-Build- und Dokumentationsprüfung bestanden. Abschlussdokumentation und Dateizuordnung werden danach erneut validiert.
- Unabhängiger vollständiger Wiederholungslauf `npm run test:e2e` ohne parallelen Build: **58/58 bestanden**, null Fehler/übersprungen, 189,94 s. Auch der zuvor fehlgeschlagene Beispiel-/Sicherungsfall besteht unverändert (9,59 s). Initialen Timeout weiter oben erhalten, keine vermeintlich gesicherte Ursache behauptet. Bestehende Import-/Export-/Worker-/Migration-/Zwei-Tab-/Aufnahme-/Touch-/Viewer-/Fallbackfälle und vier neue Themen-/Bauweltenfälle enthalten.
- Bestehende Vite-Warnung zum großen Hauptbundle bleibt; kein Bundleoptimierungs- oder echter GPU-/Safari-/iPhone-/Minecraft-Nachweis. Syntax-/Diffprüfung bestanden. Abschließender Projektcheck und Roadmapänderungscheck nach diesen Dokumentationsnachträgen vor Commit; sofortiger Publisher prüft den tatsächlichen Quellcommit nochmals. Commit, Push und Livehashnachweis werden im Abschluss getrennt berichtet, keine selbstreferenzielle Deploymentfolge.

## Claude-Codex-Abstimmung · 01.11.2026 · Claude

Reine Dokumentationsänderung (MSG-CLAUDE-SYNC-00, `docs/project/CODEX_PROMPT.md`, Abschnitt in CODEX_SETUP), kein Produktcode. Ausgangsstand main `ce59efb`. `npm run check` vollständig bestanden: Architektur-, Roadmap-, Typprüfung, Build, alle Node-Tests, Dokumentationslinks. Keine E2E nötig, da keine Oberfläche geändert.

## VIEW-02 · 01.11.2026 · Blockformen und Texturen (Claude)

- `npm run check` auf dem rebasten Stand (Basis main `bcae977`): Architektur, Roadmap, Typen, Build, 391/391 Node-Tests, Doku bestanden. `npm run check:roadmap-change -- bcae977 HEAD` bestanden.
- `npm run test:e2e` in Chromium: 59/59 bestanden, darunter neu `textures.e2e.mjs`. In dieser Cloud-Umgebung passte das vorinstallierte Chromium (Build 1243) nicht zum gepinnten Playwright 1.64.1 (erwartet 1248); Lauf mit `PLAYWRIGHT_BROWSERS_PATH` auf einen Ordner mit Verweisen auf das vorhandene Chromium, ohne Teständerung.
- `BAUPLANER_ALL_BLOCKS=<pfad> node --test tests/blocks.test.mjs`: All-Blocks-Litematic 26.3 importiert (29.346 Zellen, 1016 Block-IDs, alle im Register) und vermascht.
- Manuelle Sichtprüfung in Chromium mit der lokalen 26.3-Client-Jar: Bibliotheksbilder, Detailseite, 3D-Betrachter und Ausschnitte der All-Blocks-Datei; ein Fehler gefunden und behoben (`heavy_core`: Texturvariable ohne `#`).
- Nicht geprüft: Mojang-Download im Browser selbst (nur CORS/Manifest per curl), Firefox/Safari, echte Geräte.

## MAP-01 Weltkarte · 01.11.2026 · Claude

- Ausgang main `1b58257` (Quelle `edbb520`), nach Rebase auf VIEW-02 (Konflikt in `ThreeViewer.tsx` fachlich gelöst: `markFor` von VIEW-02 plus `frameRequest`).
- `node --test tests/worldmap.test.mjs`: 8/8 bestanden (Validierung, Rückgängig, Sicherung, Welt = Projekt + Ursprung zellgenau, Dimensionen, Überschneidungen gegen Handzählung, Fortschritt inkl. „prüfen“, Budget, Vorschlag, Draufsicht, Determinismus, Marker, Link-Übernahme BlueMap/Dynmap/Pl3xMap).
- `npm run check`: bestanden, 399 Node-Tests bestanden, 1 übersprungen (Bestand), Architektur-, Roadmap-, Typ-, Build- und Dokumentationsprüfung.
- `node --test tests/e2e/worldmap.e2e.mjs`: 2/2 (1400 und 390 px, Headless-Chromium mit Software-WebGL). Visuelle Sichtprüfung der Screenshots im hellen Theme.
- Umgebungshinweis: Das Repository pinnt Playwright 1.64.1 (erwartet Headless-Shell 1248); im Container liegt 1243. Für die Läufe wurde lokal ein Verweis 1248 → 1243 angelegt, keine Repositoryänderung.
- Grenzen: kein Gelände, keine Spielprüfung, Live-Karten-Vorlagen nicht gegen einen laufenden Kartenserver geprüft, keine echte GPU-/Touch-Gerätprüfung (QA-02). Leistung: 40 Projekte mit 39.556 Blöcken in 573 ms (Node, ohne Worker-Transport).
- `npm run test:e2e` gesamt: 60/61 bestanden. Einziger Ausfall `snap.e2e.mjs` „Instanz im 3D-Bild ziehen“ (`data-ghost` nach dem Loslassen kurz `null`) ist zeitabhängig und **auch auf unverändertem main `1b58257` reproduzierbar** (1 von 7 Läufen); mit diesem Stand danach 5/5 isolierte Läufe bestanden. Nicht durch MAP-01 verursacht, Test nicht verändert; als bekannter Wackelkandidat an QA gemeldet.

## Eigene Sammlungen und Vorlagen (LIB-02/LIB-03) · 01.11.2026 · Claude

- Neu `tests/collections.test.mjs` (9 Fälle): Einträge/Version festhalten/Notiz/Reihenfolge, Ordnerbaum mit Kategorien, Tiefe 4, Zyklen und verwaiste Ordner, Löschen mit Nachrücken, Verweisauflösung (fehlend, Version fehlt, veraltet, archiviert), Ensemblevorlage aus Projekt mit Verbindungen, Projektübernahme als Kopie (Vorlagenänderung lässt Projekt bytegleich), Verlauf begrenzt auf 20 und Wiederherstellen, Generatorvorlage, mitgeliefertes Ensemble als Vorlage identisch zu „Als Projekt anlegen“, Datensatzprüfung, MemoryRepository-CAS (Konflikt schreibt nichts), Sicherung Format 1 unverändert (unabhängige Prüfsumme mit Node-crypto) und Format 2 mit Wiederherstellungsplan.
- Neu `tests/e2e/collections.e2e.mjs` (3 Fälle, lokales Chromium): Sammlungen samt Unterordner, Gebäude über „In Sammlung“, Version festhalten, Notiz, Katalogfilter über Neuladen, Löschen; Vorlagen aus Ensemble, Umbenennen/Bauteil entfernen/Wiederherstellen, Projekt bleibt unverändert, Generatorvorlage, Vollsicherung Format 2 und Wiederherstellung in frischem Profil; 390 px ohne horizontales Scrollen. Direkte IndexedDB-Lesungen prüfen den gespeicherten Stand unabhängig von der Oberfläche. 3/3 bestanden.
- `tests/e2e/asset-concurrency.e2e.mjs`: erwartete `DB_VERSION` 3; neuer Fall Migration v2→v3 mit Erhalt der Assetrevision und Sammlungs-CAS über zwei echte Verbindungen. 3/3 bestanden.
- Vollständiges `npm run test:e2e`: 60/62; die zwei Generatorfälle scheiterten an `getByLabel('Vorlage')`, das nun auch das neue Feld „Name der Generatorvorlage“ trifft. Selektor auf `exact: true` präzisiert (gleiche Aussage), danach `generators.e2e.mjs` 2/2 bestanden.
- Umgebung: Linux-Cloudcontainer, Playwright 1.64.1 gegen vorinstalliertes Chromium/Headless-Shell 1243 (Revision 1248 per lokalem Verweis auf 1243 abgebildet, nur Umgebung, nicht im Repo). Keine Safari-/iPhone-/Echtgeräteprüfung.
- Nach Rebase auf main `f8fb1a8` (MAP-01, VIEW-02, EDIT-Anmeldung): Konflikte in COMMUNICATION, TESTING, `backup.ts`, `index.ts` mit beiden Seiten gelöst; Vorlagenansicht auf die neue Viewer-Schnittstelle (ohne `colorFor`) umgestellt. `npm run check` auf diesem Stand: 409 Node-Tests, 408 bestanden, 1 übersprungen (Bestand), Architektur-, Roadmap-, Typ-, Build- und Dokumentationsprüfung bestanden. Browser auf diesem Stand: collections, asset-concurrency, generators, catalog, persistence 13/13 bestanden.

## UI-02 · 01.11.2026 · App-Hülle, Navigation und Handyoberfläche · Claude

- `npm run check` vollständig bestanden: Architektur-, Roadmap-, Typprüfung, Build, 391 Node-Tests (1 übersprungen, unverändert), Dokumentationslinks.
- `npm run test:e2e` 63/63 bestanden (280,7 s), darunter neu `tests/e2e/shell.e2e.mjs` (4 Fälle). Während der Arbeit gefunden und behoben: Vergleichsleiste der Bibliothek lag am Handy unter der neuen unteren Leiste (catalog 390 px), lange Editorlisten streckten die 3D-Fläche über den Bildschirm (snap), Baustellenkacheln/-tabellen verbreiterten die Seite bei 390 px.
- Nach Rebase auf MAP-01 und LIB-02/03 erneut: `npm run check` 399 Node-Tests (1 übersprungen) bestanden, `check:roadmap-change` gültig; Browserregression 69/70 im Gesamtlauf (309,9 s); einziger Fehlschlag „Systemcheck: Auslieferung …“ liest den Manifeststatus vor Ende des Ladens (Zeitabhängigkeit im Test, keine UI-02-Datei betroffen), isoliert 3 × 5/5 bestanden. Dabei behoben: Kopfzeile mit fünftem Eintrag (Weltkarte) war bei 1400 px zu breit, jetzt stufenweise Verdichtung, eigener Test 1920–761 px.
- Grenzen: Chromium mit Viewport-/Touchsimulation; keine echte Safari-/iPhone-Prüfung (QA-02). Playwright 1.64.1 benötigte `npm run setup:browser` (Chromium 1248) in dieser Umgebung.

## GAME-02 · Fabric-Mod gebaut und im echten Spiel geprüft · 01.11.2026 · Claude

- Umgebung: Linux-Cloudcontainer, OpenJDK 25.0.4 (Ubuntu-Paket), Gradle-Wrapper 9.8.2, Fabric Loom 1.19.3; `maven.fabricmc.net`, `meta.fabricmc.net`, `piston-meta`/`piston-data.mojang.com`, `libraries.minecraft.net` und `resources.download.minecraft.net` erreichbar. Mesa llvmpipe 25.2.8 unter `weston --backend=headless` (Xvfb scheitert: kein sRGB-fähiges GLX-Visual).
- `./gradlew -PwithFabric :fabric-26.3:build`: bestanden nach zwei Korrekturen (Klammerfehler im Befehlsbaum, `displayClientMessage` in 26.3 entfallen). Ergebnis `bauplaner-bridge-fabric-26.3-0.1.0.jar`, 34 262 Bytes, SHA-256 `2d9e4a7634029e80a2a605626028021eb96544646d595895e358e592a54d2a7f`, abgelegt in den Projektdateien unter `mod/`.
- `scripts/test_bridge.sh`: 6/6 JUnit-Tests und Querprüfung bestanden (242 Zellen, 21 Schritte, 1 Abweichung erkannt). Der Import von `exportRevisionSchem` zeigte nach dem Umzug nach `packages/application` ins Leere und ist korrigiert.
- `scripts/test_bridge_ingame.sh` (echter Minecraft-26.3-Client, Einzelspieler, Superflat): Plan per Chat geladen, `anker hier` auf den angeschauten Ursprungsblock (8/−60/8), Aufnahme 320 Zellen in einem Tick geschrieben; Website-Vergleich 146/148 korrekt, genau der präparierte Diamantblock (falsch) und der ausgelassene Block (fehlt) erkannt, keine nicht aufgenommenen Zellen; 51 s.
- Derselbe Test mit `BAUPLANER_MODPACK_MODS` und allen 21 Mods aus „Fabric 26.3 1.0.1mitRei“ (u. a. Sodium 0.9.3-beta.1, Iris 1.11.7, Distant Horizons 3.3.3, REI 26.3.824, Xaero Minimap/Weltkarte, Jade, Simple Voice Chat, Freecam) als Produktionsstart: bestanden, gleiches Ergebnis, 90 s. Hinweis: Distant Horizons braucht das volle JDK (AWT); einige Mods halten den Prozess nach Testende offen, das Skript beendet ihn nach der Ergebnisübergabe.
- `tests/roadmap.test.mjs`: Der Darstellungstest verlangte „Blocker:“ aus den Live-Daten; mit dem Ende der Blockade von GAME-02 gab es keinen Blocker mehr. Der Test setzt jetzt einen eigenen Testblocker.
- Grenzen: kein echter Mehrspieler-Server (der Test läuft im integrierten Server), keine Hardware-GPU, kein Windows-Launcher. Die Abnahme auf server.lmnt-gaming.net übernimmt Philipp (GAME-02-S04).

## LIB-04 Gebäudebibliothek v3 · 01.11.2026 · Claude

- Ausgang main `f8fb1a8` (nach VIEW-02 und MAP-01), Zusammenführung mit Konflikten in `states.ts` (Regeln von main übernommen) und `COMMUNICATION.md` (beide Seiten).
- Eigene Diagnose über alle 336 Gebäude: 0 Befunde (B7-Schema, Drehen/Spiegeln, Materiallücken = deklarierte `gaps`/`assumed`, Rezepte, Anschlüsse).
- `node --test` Katalog-, Rezept-, Varianten-, Zustands-, Baustellen- und Blocktests: 70/70 bestanden.
- Vorschaubild-Sichtprüfung je Set über Kontaktabzüge (Headless-Chromium); Innenräume als offene Schnitte.
- Grenzen: Redstone-Bauten (Technik) nach Java-Regeln gesetzt, nicht im Spiel abgenommen; Notenblock-Tonhöhen nur als Tipp.
- `npm run check`: bestanden, 399 Node-Tests bestanden, 1 übersprungen (Bestand), Architektur-, Roadmap-, Typ-, Build- und Dokumentationsprüfung.
- `npm run test:e2e`: alle Dateien bestanden außer `ui-acceptance.e2e.mjs`, das im Container am fehlenden Paket `playwright` scheitert (Bestand, nicht nur `@playwright/test`); mit lokalem Verweis auf das vorinstallierte Playwright 4/4 bestanden, nachdem die festen Bauwelt-Zählungen an den größeren Katalog angepasst wurden (Fernost 5, Wüstenhandel 7, End-Außenposten 6).

## GAME-02-S05 · Mod-Download mit Versionsauswahl · 01.11.2026 · Claude

- `node --test tests/mod-releases.test.mjs tests/router.test.mjs`: bestanden (jede gelistete .jar in `downloads/mod/` mit gelisteter Größe/SHA-256, numerische Versionssortierung 26.10 > 26.3, Rückfall auf vorhandene Builds, teilbare Auswahl, Route `#/mod` mit und ohne Auswahl).
- `node --test tests/e2e/mod-download.e2e.mjs` (Chromium, Pages-Build unter `/Minecraft-Bauplaner/`, 1400 und 390 px): 2/2 bestanden. Fußzeilenlink, Titel, Vorauswahl neueste Minecraft-Version/Fabric, NeoForge nicht wählbar, Linkziel, SHA-256 sichtbar, Download-Dateiname, 34 262 Bytes über denselben Link, teilbare Auswahl in der Adresszeile, keine waagerechte Scrollleiste, keine Seitenfehler. Bildschirmfotos beider Breiten angesehen.
- `tests/e2e/shell.e2e.mjs` Fall „Desktop: … Schnellsuche (Strg+K)“ scheitert in diesem Linux-Container auch auf unverändertem main (Dialog öffnet nicht auf Strg+K); die übrigen 4 Fälle und `game-check.e2e.mjs` bestehen. Nicht durch diese Änderung verursacht, nicht verändert.

## EDIT-01 / EDIT-02 Blockeditor und Mehrfachauswahl · 01.11.2026 · Claude

- `node --test tests/editor.test.mjs`: 11/11 bestanden (Entwurf/Umkehrung, Determinismus, Formen gegen Handzählung, Ersetzen, Füllen, Drehen, Ablage, Speichern als Version, `localCell` für alle 8 Transformationen, Projektzuordnung mit Rückgängig, Gruppenoperationen zellgenau gegen `transformCellPosition`/`transformBlockState`).
- `node --test tests/e2e/editor.e2e.mjs`: 4/4 in Headless-Chromium (Werkstatt, Projekt-Reiter „Blöcke“, Mehrfachauswahl, 390 px). Sichtprüfung der Screenshots von Werkstatt und Gruppenhülle.
- `npm run check`: 411 Node-Tests (410 bestanden, 1 übersprungen, Bestand), Architektur, Roadmap, Typen, Build, Doku. `npm run test:e2e` gesamt 65/65. Dabei zwei eigene Fehler gefunden und behoben: sechster Projekt-Reiter ließ die Seite bei 390 px waagrecht scrollen (Reiterleiste bricht jetzt um), ein Hinweistext im Eigenschaftenfeld verlängerte die Editorzeile so, dass der 3D-Ziehtest die Bildmitte verfehlte (Gruppenfeld erscheint nur noch bei aktiver Gruppe).
- Playwright-Hinweis wie bei VIEW-02/MAP-01: lokaler Verweis 1248 → 1243, keine Repositoryänderung.
- Grenzen: kein Picking an 3D-Blockflächen, keine Spielprüfung der gespeicherten Zustände, nur Chromium. Seltene Zustandswerte fehlen im Register, solange PROFILE-01 keinen Serverreport liefert (siehe [BLOCK_EDITOR](architecture/BLOCK_EDITOR.md)).
- Nach Rebase auf UI-02/LIB-02/03/04/GAME-02: Werkstatt nicht als fünfter Hauptbereich (UI-02-Kopfzeile ist auf vier ausgelegt, `shell.e2e.mjs` prüft das), sondern als Schnellsucheintrag und Knopf „✎ Neues Bauteil bauen“ in der Bibliothek. `npm run test:e2e` 73/74; einziger Ausfall `shell.e2e.mjs` „Schnellsuche (Strg+K)“ wartet auf den Dialog und scheitert **identisch auf unverändertem main `46444f3`** (eigener Build im sauberen Arbeitsbaum); per Hand öffnet Strg+K den Dialog. Nicht durch EDIT verursacht, Test nicht verändert.
## GEN-02 Neue Generatoren und Treppen-Eckformen · 01.11.2026 · Claude

- Ausgang main `a5fc972`, vor der Prüfung auf main `80631ef` (EDIT-02/EDIT-01, GAME-02-Downloadseite) gebracht; keine Konflikte.
- `tests/generators.test.mjs`: 17/17 bestanden (alle elf Generatoren über Standard, Vorlagen, acht Stile, 25 gewürfelte Sätze und Bereichsgrenzen; Begehbarkeit Treppenhaus; Eckformen nach Spielregel; Torhaus-Andocken in der Burganlage).
- Alt/neu-Vergleich über je 75 Parametersätze: Haus 6, Turm 21, Dach 9 abweichend (Eckformen) → Version 2; Mauer und Brücke 0 → Version 1 bleibt.
- `npm run check`: bestanden, 425 Node-Tests bestanden, 1 übersprungen (Bestand).
- `npm run test:e2e`: 74/76. `generators.e2e.mjs` 2/2 bestanden (14 Karten, Basilika-Hinweis, Dorfplatz ohne Überschneidungen). `textures.e2e.mjs` schlug einmal fehl und bestand im Einzellauf (zeitabhängig). `shell.e2e.mjs` „Schnellsuche (Strg+K)“ scheitert auch auf unverändertem main `80631ef` (Bestand, nicht GEN-02).
- Sichtprüfung der neuen Vorschauen in Headless-Chromium (Kathedrale, Treppenauge, Handelshafen, Burgtor, Holländermühle, Schlossbrunnen, Marktflecken, Burg mit Torhaus).
- Grenzen: nicht im Spiel abgenommen; Wasser im Hafen nicht enthalten, Brunnenwasser nicht als Item gezählt.
## BUILD-05 Bauwelt-Anlagen · 01.11.2026 · Claude

- Neu `tests/anlagen.test.mjs` (12 Fälle) gegen den echten mitgelieferten Gebäudebestand: alle 11 Anlagen ohne Blocker, ohne Voxelkonflikte, ohne Abstandsbefunde und exportierbar; Hauptweg-Fugen vollständig verbunden; feste Version bleibt trotz neuer Version 2.0; Tausch hält die aktuelle Version des neuen Bauteils fest; fehlende Version sperrt nur gewählte Bereiche; Verschieben erzeugt echte Voxelkonflikte, die Übernahme verlangt Bestätigung; Einfügen in bestehendes Projekt als ein Rückgängig-Schritt, veraltete Vorschau abgelehnt. 12/12 bestanden.
- Neu `tests/e2e/anlagen.e2e.mjs` (2 Fälle, lokales Chromium): Bauwelt-Link öffnet den Planer, Vorschau/Verschieben speichern nichts (IndexedDB direkt gelesen), Konflikt sperrt die Schaltfläche, Abwählen/Tauschen/Anlegen mit vier Bauabschnitten, End-Außenposten neben bestehende Bauten eingefügt; 390 px ohne horizontale Überbreite. 2/2 bestanden.
- Sichtprüfung per Bildschirmfoto (1400 px): Übersicht mit 11 Vorschaukarten, Planer mit 3D-Ansicht, Lageplan, Prüfliste, Bereichen und Übernahme.
- Grenzen: Gelände und Hanglagen werden nicht geplant; keine Echtgeräteprüfung (QA-02).
- Volle Browserregression nach dem Fix: 73/74 (624,8 s), einziger Fehlschlag der Schnellsuche-Fall unten.
- Nach erneutem Rebase auf main `f8f21e1` (EDIT-02, GEN-02): `npm run check` 438 Node-Tests (437 bestanden, 1 übersprungen, Bestand); zuvor auf `46444f3` 423 Node-Tests. Volle Browserregression: der neue Bauwelt-Link teilte zunächst die Klasse `build-theme-browse` mit dem Katalog-Link und machte vier Selektoren in `build-themes`/`ui-acceptance` mehrdeutig; eigene Klasse `build-theme-anlage`, danach build-themes 2/2, ui-acceptance 4/4, anlagen 2/2. `shell.e2e.mjs` Fall 1 (Strg+K-Schnellsuche) scheitert identisch auf unverändertem main `46444f3` (separater Worktree geprüft), nicht durch BUILD-05 verursacht.
## WORLD-IMPORT-01 Weltimport und Geländeprüfung · 01.11.2026 · Claude

- Ausgang main `61d8e9a`, vor dem Push auf `80631ef` (EDIT-01/02, Mod-Downloadseite) rebased; Konflikte in Router, Hauptansicht, Projektreitern, Symbolen, Domain-Index und `AssetSourceFormat` beidseitig erhalten.
- `node --test tests/anvil.test.mjs`: 14/14. Unabhängige Fixture `scripts/make_region_fixture.py` (eigener NBT-Schreiber, eigene Packung, eigener LZ4-Kodierer und XXH32): 26.x-, 1.21- und 1.17-Chunks, zlib/GZip/LZ4/ohne, unfertiger und fehlender Chunk, leere Regionsdatei; jede Zelle des Bereichs gegen die erwarteten Zustände geprüft (über 100 000 Zellen), BlockEntities mit Truheninhalt, Kopf-/Überlappungs-/Koordinatenfehler, beschädigte Daten → unlesbar statt Luft.
- Lastszenario im Test: 256 Chunks, 256 × 256 × 256 = 16 777 216 Zellen in rund 0,6 s (Node, Container).
- `node --test tests/terrain.test.mjs`: 6/6 mit handberechnetem Gelände (Hindernis, ersetzbares Gras, Wasser, Loch mit Unterbautiefe, unbekannte Spalte, außerhalb des Rasters, Y-Vorschlag).
- `scripts/test_world_import_real.sh` (nicht Teil von `npm run check`; Java 25, Netz zu Mojang): offizieller 26.3-Server (SHA-1 `33680f5f…`), drei Welten mit `region-file-compression` deflate, lz4 und none, Blöcke per Befehl gesetzt und gespeichert. Alle drei: DataVersion 5023, 286 Blöcke, Treppe/Truhe/Schild/Laterne mit vollständigen Zuständen, Truheninhalt erhalten, Fläche über Chunkgrenze. Befund dabei: 26.x speichert Standardzustände nur als ID; Standardwerte kommen aus dem Datengenerator-Bericht (`blocks.json` SHA-256 `7a0de8aa…`).
- `node --test tests/e2e/world-import.e2e.mjs`: 3/3 (1400 px und 390 px: Dateien wählen, Bereich in der Übersicht ziehen, 274 bzw. 18 Blöcke ohne Gelände, Speichern in die Bibliothek, kein waagerechtes Scrollen; Gelände-Reiter ohne Weltlage und nach Platzierung).
- Grenzen: keine Prüfung an Philipps eigener Welt oder einem Modpack-Server, keine echten Geräte; Entities werden nicht übernommen.
- Kopfzeile: Der fünfte Hauptmenüpunkt „Weltimport“ führte bei 1400 px zu Überbreite (Bauwelten-/Generatoren-Test). Stufen in `shell.css` angepasst (Versionsanzeige ab 1680 px aus, Suchtext ab 1460 px, kompakte Navigation ab 1340 px, Symbole ab 1100 px aus, schmale Abstände ab 900 px); 1920 bis 761 px und 390 px ohne Überbreite nachgemessen. `shell.e2e.mjs` erwartet jetzt fünf Hauptmenüpunkte.
- `npm run check`: bestanden (441 Node-Tests, 1 übersprungen). `npm run test:e2e`: 77/79, danach die betroffenen Dateien erneut 12/13. Verbleibender Fehler „Schnellsuche (Strg+K)“ tritt identisch auf unverändertem origin/main `80631ef` auf (separater Worktree geprüft) und ist nicht Teil dieses Blocks.
## BACKUP-02 · 01.11.2026 · Sicherungsstand und Abschnittsstände · Claude

- Neu `tests/backup-reminder.test.mjs` (9 Fälle): Belege aus dem Dateiinhalt, Speicherrevision ohne Einfluss, Hinweis vs. fällig nach 7 Tagen, neues Projekt sofort fällig, Projekt- und Gesamtsicherungen, entfernte Projekte, eigene Bauteile, Prüfen per Prüfsumme, Protokollvalidierung und Grenze 40, `MemoryRepository`; Stände einfrieren (Nummern, Sicherungsrundreise), jede Abweichungsart inkl. von früherem Abschnitt übernommener Schritte, Zurücksetzen reproduziert den Fingerabdruck exakt, Undo, Sperre bei fehlender Version, Kopie als Projekt mit ehrlichen Haken, Löschen.
- Neu `tests/e2e/backup-reminder.e2e.mjs` (3 Fälle, lokales Chromium 1400/390 px): Erinnerung ohne Cloudbehauptung, „Gesamtsicherung herunterladen“, Datei prüfen (gültig und manipuliert), Projektkopf-Chip, Neuladen; Einfrieren, Warnung im Abschnittseditor, Abweichung, Zurücksetzen mit Vorschau, entfernter Abschnitt wiederfinden und zurückholen, Stand als eigenes Projekt. 3/3 bestanden. Sichtprüfung hell und am Handy per Bildschirmfoto.
- Gesamtlauf `npm run test:e2e` zuerst 73/75: Das Erinnerungsbanner war `role=status` und hieß „Jetzt alles sichern“, wodurch fremde Selektoren (`getByRole('status')`, Button „Alles sichern“, `.file-button input`) mehrdeutig wurden. Behoben in der App (Banner als benannte Region, Knopf „Gesamtsicherung herunterladen“, Prüffeld mit eigener Klasse), fremde Tests unverändert. Zweiter Gesamtlauf: 75/75 bestanden. Nach Rebase auf main `877d591` (EDIT-01/02, GEN-02, BUILD-05, GAME-05): `npm run check` 446 Node-Tests bestanden (1 übersprungen), `npm run test:e2e` 80/81; einziger Fehlschlag `shell.e2e.mjs` „Desktop: … Schnellsuche (Strg+K)“ (Dialog öffnet nicht nach Strg+K) scheitert identisch auf unverändertem main `877d591` und `d2f7af8`, nicht durch BACKUP-02. Nach erneutem Rebase auf `d2f7af8` (WORLD-IMPORT-01): `npm run check` 466 Node-Tests bestanden; backup-reminder, site, persistence, collections bestanden. Quellstand auf main gepusht (`412867f` und Folgecommit), Pages per `scripts/publish_pages.sh`.
- Umgebung: Playwright 1.64.1 brauchte `npx playwright install chromium` (Headless-Shell 1248). Keine Safari-/Echtgeräteprüfung.

## GAME-04 Paper-Plugin · 01.11.2026 · Claude

- `./gradlew :core:test` (9 Tests inkl. BridgeSession) und `./gradlew -PwithPaper :paper:build` (Paper-API 1.18.2, Release 17): bestanden.
- `scripts/test_bridge_paper.sh` auf echten Paper-Servern: 1.18.2 (Build 388, Java 21), 1.20.6 (151), 1.21.4 (232), 1.21.11 (132), 26.3 (236, Java 25) jeweils bestanden: 148 Zellen aus der Serverwelt gelesen, 146 korrekt, genau der präparierte falsche und fehlende Block erkannt; Baustelle nach Neustart nicht geladen, 2 Chunks vom Plugin nachgeladen; Aufnahme in nie erzeugtem Gelände vollständig „nicht aufgenommen“, keine Regionsdatei erzeugt; keine Plugin-Warnung im Serverprotokoll.
- Grenzen: Spielerbefehl `anker hier` und Rechteprüfung nur manuell (Servertest läuft über die Konsole); Spigot ohne Paper und Folia ungeprüft bzw. nicht unterstützt; Abnahme auf Philipps Server offen.
- Download (GAME-04-S03): `npm run check` bestanden (439 Tests, 438 bestanden, 1 übersprungen; Architektur, Roadmap, Typen, Build, Doku). `npm run test:e2e`: 76/78; `mod-download.e2e.mjs` bestanden inkl. Paper-Auswahl für eine ältere Version, Serveranleitung und teilbarem Link. Nicht bestanden: `shell.e2e.mjs` Schnellsuche Strg+K (scheitert in diesem Container auch ohne diese Änderung, siehe GAME-02-S05) und einmal `snap.e2e.mjs` (Ziehen im 3D-Bild; zwei Wiederholungen bestanden, wackliger Test).

## QA-03 · Wacklige Browsertests stabilisiert · 01.11.2026 · Claude

- Ausgangslage: gelegentliche Ausfälle auf main in `shell.e2e.mjs` (Schnellsuche Strg+K), `stability.e2e.mjs` (Systemcheck), `editor.e2e.mjs` (Ziehtests); im eigenen Lauf zusätzlich `snap.e2e.mjs` (3D-Ziehen) und nach Rebase auf d2f7af8 dauerhaft der Suchknopf in `shell.e2e.mjs`.
- Ursachen und Behebung (kein Test abgeschaltet, keine Zeitgrenze erhöht): Strg+K vor dem Laden der lokalen Daten ging verloren (App: Anfrage wird gemerkt); Systemcheck-Test las vor dem Nachladen von `deployment.json` (Test wartet auf Quellstand); Ebenenraster wurde vor dem Einschwingen des ResizeObservers vermessen (Test: `gridGeometry` liest in einem Frame nach Stillstand) und Pinselstriche lasen veralteten Zustand (App: Ref); 3D-Ansicht im Projekteditor wurde bei jeder Worker-Neuberechnung neu aufgebaut (App: letzte Welt bleibt sichtbar); Suchknopf verlor unter 1460 px seinen zugänglichen Namen (App: `aria-label`).
- `npm run test:e2e` (Chromium headless, Pages-Build) nach Rebase auf fd22da6: drei Läufe hintereinander je **84/84 bestanden**, 0 übersprungen. Gezielte Wiederholungen: Editor/Schnellsuche/Systemcheck 7× grün (davon 4× mit `--test-concurrency=3`), Snap/App/Viewer/Editor/Projektberechnung 3× grün.
- Grenzen: nur Chromium im Linux-Container (Playwright-1248-Verweis auf installiertes 1243), keine echten Geräte.

## GAME-05 · NeoForge- und Forge-Brücke · 01.11.2026 · Claude
- Kern: `BridgeSessionTest` (3 Fälle: kompletter Ablauf mit Datei und gespeichertem Anker, Dimensionswechsel/Abbruch/Konsole ohne Blickziel, Serveraufnahme in anderer Welt) plus bestehende Kerntests über `scripts/test_bridge.sh` bestanden (Brückenprüfung 242 Zellen, Python-Leser bestätigt).
- Build: `./gradlew -PwithNeoForge -PwithForge :core:test :neoforge-26.3:build :forge-26.3:build` grün (NeoForge 26.3.0.100 über ModDevGradle 2.0.148, Forge 26.3-66.1.2 über ForgeGradle 7.0.40, JDK 25).
- NeoForge im echten Minecraft-26.3-Client: `scripts/test_bridge_ingame_forge.sh neoforge` bestanden. Testmod legt über den normalen „Welt erstellen“-Bildschirm eine flache Testwelt an, baut den exportierten Plan mit einem falschen und einem fehlenden Block, schaut auf den Ursprungsblock und schickt `/bauplaner plaene|plan|anker hier|status|scan` über `ClientPacketListener.sendCommand` (dort fängt NeoForge Client-Befehle ab). Website-Vergleich: 148 Zellen, 146 korrekt, genau 1 falscher und 1 fehlender Block an den erwarteten Stellen.
- Forge im echten Client: Mod und Testmod laden ohne Fehler, Client-Ticks laufen an, danach bleibt der kopflose Client (weston, Mesa llvmpipe) im Ladebildschirm stehen; mit Vsync bzw. Forges Frühfenster blockierte zuvor schon das Bildtauschen. Kein Fehler der Mod sichtbar, Spielprüfung aber **offen**; die Forge-.jar wird deshalb noch nicht auf `#/mod` angeboten.
- Grenzen: Entwicklungsstart (gleiche Klassen wie die .jar, Mojang-Namen auch im Produktivbetrieb), kein Start über einen echten Launcher, kein Mehrspieler-Server.
- Gesamtprüfung nach Rebase auf den Paper-Stand (GAME-04): `npm run check` grün (468 Tests, 467 bestanden, 1 übersprungen). `npm run test:e2e` 82/84: `mod-download.e2e.mjs` mit NeoForge-Auswahl bestanden; `snap.e2e.mjs` (Ziehen im Editor) einzeln wiederholt bestanden; `shell.e2e.mjs` „Schnellsuche (Strg+K)“ scheitert wie bereits bei EDIT-01/02 auf unverändertem main dokumentiert, nicht von GAME-05 berührt (Thread „Wacklige Browsertests stabilisieren“ kümmert sich).
- Nach erneutem Rebase auf QA-03 (`0a5a01b`): `npm run check` grün (467 bestanden, 1 übersprungen), `npm run test:e2e` **84/84**.

## EDIT-03 · Werkstatt vertieft · 02.11.2026 · Claude

- Neu `tests/editor-patterns.test.mjs` (9 Fälle): `cellNoise` deterministisch und gleichverteilt; Mischung mit Gewichtsanteilen, gleicher Würfelwert ⇒ gleiche Zellen, Lücken (`keep`); Verlauf je Achse mit handgezählten Stufen, Umkehr, weicher Übergang nur an Grenzen, radial; Schachbrett/Streifen auch bei negativen Koordinaten; Ersetzen mit Muster behält Ausrichtung; alle Vorlagenblöcke im Register mit gültigen Zuständen; Bögen (Kämpfer, Scheitel, freie Öffnung, Symmetrie, flächig verbundenes Band, Pfosten, Tiefe, Z-Richtung), Pyramide/Walmdach/Kegel/Mauerzug mit Handzählung; eingebaute Schablonen gültig, vier Drehungen = Identität, Tür dreht nach Osten, Rundreise Schablone → Entwurf → Nutzlast → Zwischenablage.
- Neu `tests/e2e/workshop-tools.e2e.mjs` (2 Fälle, Chromium 1400/390 px): Mauerzug mit „Alte Steinmauer“, Strg+Z/Y, Bogen über Taste O, Schablone „Tür mit Rahmen“ mit Vorschau und Maßanzeige, R dreht, Setzen; Strg+A/C, Entf, Rückgängig, Ebenenübersicht, G-Schnitt, ?-Übersicht; eigene Schablone speichern und laden; Ersetzen mit „Verwittern“ trifft nur einen Teil. Handy ohne waagrechtes Scrollen. Sichtprüfung per Bildschirmfoto.
- `editor.e2e.mjs`: nur der Selektor der Quaderform auf die neue Beschriftung „Quaderform“ umgestellt (das Werkzeugfeld enthält jetzt auch das Musterfeld).
- `npm run check` grün (477 Tests, 476 bestanden, 1 übersprungen). `npm run test:e2e` **86/86** auf main `7c4e95a` plus EDIT-03.
- Grenzen: nur Chromium im Linux-Container (Playwright-1248-Verweis auf 1243), keine Spielprüfung der Schablonenzustände, keine echten Geräte.
## UPDATE-01 · Kontrollierte Versionsupdates · 02.11.2026 · Claude

- `node --test tests/updates.test.mjs`: 10/10 bestanden (Updatequellen ohne fremde lokale Änderungen, Dreiwege-Patch mit beiden Regeln und pivotbezogener Ausrichtung, Folgenplan inkl. gelöster Verbindung und prüfbedürftiger Schritte, ein Rückgängig-Schritt, Rückkehr, Einfrieren, Validierung, Katalogzustellung über `seedSamples` mit MemoryRepository, neueste Version ohne lokale Änderungen in Bibliothek/Katalog).
- `node --test tests/e2e/updates.e2e.mjs` (Chromium headless, Pages-Build): 2/2 bestanden, 1400 px und 390 px ohne waagerechtes Scrollen.
- Gesamtlauf nach Rebase auf main `83f95c0` (inkl. EDIT-03): `npm run check` grün (487 Tests, 486 bestanden, 1 übersprungen; Architektur, Roadmap, Typen, Build, Doku). `npm run test:e2e` **88/88** bestanden.
- Grenzen: nur Chromium im Linux-Container, keine Echtgeräte; Folgenberechnung großer Projekte nicht gemessen.
## GAME-07 · Mod 2.0 Hologramm (Fabric 26.3, 0.2.0) · 02.11.2026 · Claude
- `./gradlew :core:test :mod-core:test` grün; `mod-core` 7 JUnit-Fälle (Zustände parsen/sortieren, Vergleichsregeln wie `gameCheck.ts`, Positionen drehen/spiegeln samt Rückweg, Zustände drehen/spiegeln inkl. Schienen, Türen, Treppen, Kisten, Banner, Redstone, Planlesen aus Website-Format, Live-Abgleich, Platzierungsspeicher).
- `scripts/test_bridge_ingame.sh` (echter 26.3-Client) bestanden: Aufnahme wie bisher (146/148, 1 falsch, 1 fehlt), danach Hologramm am angeschauten Block, `fortschritt` „98 % · richtig 146 · fehlt 1 · falsch 1 · Zustand 0 · nicht geladen 0“, Fehlerfinder zeigt den Diamantblock, Server setzt den fehlenden Block → ohne Befehl „fehlt 0“, gedreht 18 %, zurückgedreht wieder 99 %, `platzierung.properties` geschrieben, Taste J öffnet das Planmenü; Bildschirmfotos geprüft (rote Kiste, violetter Rahmen/Strahl, weißer Planrahmen, HUD).
- Gleicher Test als Produktionsstart mit allen Mods aus Philipps Modpack (`BAUPLANER_MODPACK_MODS`, u. a. Sodium 0.9.3, Iris 1.11.7, Xaero, Simple Voice Chat, REI, Distant Horizons) bestanden. Gefunden und behoben: Standardtaste B war in Xaero „Wegpunkt“, H/N in Simple Voice Chat belegt → Standard jetzt J / Komma / Punkt / Einfg; HUD vom Minikarten-Eck nach rechts verlegt.
- Grenzen: Shader nicht eingeschaltet (Iris geladen, ohne Shaderpack), kein Mehrspieler-Server, Geisterblöcke als farbige Kisten (noch keine Blocktexturen).


## BUILD-06 · Bauführung im Spiel · 02.11.2026 · Claude
- `tests/build-run.test.mjs` (9 Fälle): Rechtecke decken jede Schrittzelle genau einmal mit geplantem Zustand ab, Zeilenverschmelzung und Zustandswechsel, Anker = Weltlage bzw. Aufnahme-`WorldAnchor`, Packliste = Material-Tab-Summe mit Kisten zu 27 Plätzen in Reihenfolge des ersten Bedarfs und Lagerverbrauch, Bautempo-Validierung und Rückgängig, Bautage (jeder offene Schritt genau einmal, Budgets, Abschnittsreihenfolge, Lager über Tage, übergroße Schritte), Haken je Tag, Textzettel, Nacharbeitsliste und Spielstatus je Tag.
- `tests/e2e/build-run.e2e.mjs` (Chromium 1400 px und 390 px): echte Aufnahme aus exportierter Revision mit `WorldAnchor`, Anker übernehmen, Weltkoordinaten in der Schichtführung, Bautempo 100 ⇒ mehrere Bautage mit gleicher Blocksumme, Nacharbeit mit falschem Block, bestätigte Schritte eines Tages abhaken, Tagesziel, Bauzettel in Druckmedienemulation (nur Zettel sichtbar), Textdownload, Baumodus abhaken und weiter, kein waagerechtes Scrollen, Ansicht nach Neuladen erhalten.
- Gesamtprüfung: `npm run check` grün (477 Tests, 476 bestanden, 1 übersprungen). `npm run test:e2e` **85/85** bestanden.
- Grenzen: kein echter Drucker, keine echten Geräte (QA-02), kein Spieltest im Client (die Aufnahme ist aus dem Plan abgeleitet wie in GAME-01).


## TERRAIN-01 · Gelände in Weltkarte und Anlagen · 02.11.2026 · Claude
- Kern: `tests/terrain-survey.test.mjs` 9/9 bestanden (echte Regionsdatei aus `scripts/make_terrain_fixture.py` mit Hang, Teich, Baum und Gras gegen Handwerte und gegen die dichte 3D-Probe; Dateiformat/Hash; `terrain.set` mit Rückgängig, Sicherung, Wiederherstellung, Datencheck; Erdarbeiten von Hand gezählt; 3D-Anzeigezellen; Eingangsregel; alle 69 Katalogplätze mit Tür zeigen zum Weg; Terrassen/eine Ebene mit verbundenen Wegmodulen; Platzsuche).
- Browser: `tests/e2e/terrain.e2e.mjs` bei 1400 und 390 px bestanden (Bauplatz aus Regionsdatei, Weltkarte mit Gelände 2D/3D, Anlage „Dorf mit Hof“ auf dem Hang mit flachstem Platz und Moduswechsel, Einfügen, Erdarbeiten-Schätzung, Reiter „Gelände“, kein waagerechtes Scrollen, keine Konsolenfehler).
- Gesamtprüfung nach Rebase auf BUILD-06 (`a132275`): `npm run check` grün (505 Tests, 504 bestanden, 1 übersprungen), `npm run test:e2e` **91/91**.
- Nicht geprüft: Philipps eigene 26.3-Welt, echte Geräte.

## GAME-07 · Download-Prüfung gegen „EOCD nicht gefunden“ · 02.11.2026 · Claude
- Anlass: Modrinth App meldete beim Hinzufügen der 0.2.0-.jar „EOCD nicht gefunden“. Live-Datei von Pages geladen: 95 726 Bytes, SHA-256 wie Build, `unzip -t` und Python-`zipfile` fehlerfrei, EOCD am Dateiende, Verzeichnis passt → auf dem Server korrekt; bei Philipp kam eine abgeschnittene/falsche Datei an.
- Neu: `checkJarBytes` (releases.ts) prüft wie ein Launcher Größe, ZIP-Anfang, EOCD, Verzeichnis und Loader-Metadaten (`fabric.mod.json`, `neoforge.mods.toml`, `mods.toml`, `plugin.yml`). Die Download-Seite lädt die .jar, prüft zusätzlich SHA-256 und speichert nur geprüfte Bytes; sonst Meldung „Nicht gespeichert …“. `release_mod.mjs` bricht bei fehlerhafter .jar ab.
- `tests/mod-releases.test.mjs`: jede angebotene .jar besteht die Prüfung; abgeschnittene Datei, HTML-Seite, beschädigtes Verzeichnis und fehlende Metadaten werden erkannt. `mod-download.e2e.mjs` (1400/390 px): gespeicherte Datei hat genau die gelistete Größe, Statusmeldung „Geprüft und gespeichert“; abgeschnittene Antwort wird abgelehnt und nicht gespeichert.

## GAME-07 · Stufe 2: Texturen, Materialliste, Ebenen (Fabric 26.3, 0.3.0) · 02.11.2026 · Claude
- `./gradlew :core:test :mod-core:test` grün (mod-core 8 Fälle, neu: Materialliste mit Tür/Doppelstufe/falschem Block, Ebenenzählung, Fehlerfinder je Ebene).
- `scripts/test_bridge_ingame.sh` im echten Client und als Produktionsstart mit Philipps Modpack (Sodium 0.9.3, Iris 1.11.7, Xaero, Voice Chat, REI, Distant Horizons …) bestanden: alles aus 0.2.0, dazu `/bauplaner material` → „1 Blöcke in 1 Sorten, 1 × minecraft:cobblestone“, Ebene = Ankerhöhe → Fehlerfinder zeigt den Diamantblock, Ebene darüber → „Keine Fehler“, Teilabriss der Mauer (Server-`fill`) → 31 offen (24 Steinziegel, 6 bemooste, 1 Bruchstein) und texturierte Geisterblöcke im Bildschirmfoto (auch mit Sodium/Iris), Num 7 öffnet die Materialliste.
- Grenzen: Shader nicht eingeschaltet, kein Mehrspieler-Server, Shulker-Inhalte nicht gezählt, Blöcke ohne Modell (Kisten, Schilder) weiter als Kiste.

## FORMAT-02 · Echte Litematic-Dateien aufschlüsseln · 02.11.2026 · Claude
- Fünf echte Dateien von Philipp (2× Litematica 1.21, 3× Litemapy-Konverter; nicht im Repository) lokal mit `importStructure` gelesen: vorher 4 Fehlschläge („Erwartet GZip“ bei drei unkomprimierten Dateien, Knotenlimit bei Olympus 164×184×189), jetzt alle gelesen; `TotalBlocks` stimmt jeweils mit den gelesenen Blöcken. Export jeder Datei mit `writeLitematic` und Rückimport zellgleich (Blockzustände, BlockEntities 158/158); vier Exporte vom Python-Leser `verify_litematic.py` als gültig bestätigt (Olympus: reiner Python-Leser nach >15 min nicht fertig, dort nur der TS-Rückimport). Olympus: Import 1,0 s (Node), Export 5,5 s, 402 kB.
- Browser (Chromium headless, Software-WebGL, Pages-Build): alle fünf in der Bibliothek importiert, gespeichert, Reiter 3D/Bilder/Ebenen geöffnet, keine Konsolenfehler. Olympus (952.911 Blöcke): Import bis 3D-Bild ~17 s, Speichern ~26 s, Bilder ~8 s, Ebenen ~10 s.
- `tests/litematic.test.mjs` 28/28 (neu: unkomprimiert/zlib gleich GZip, realworld-Fixture mit ferner Ecke/negativer Größe/TAG_End-Listen/Entity-Arten/Roundtrip, große Modelle ohne Luftzellen, Zellgrenze, Metadata-Abweichung, Software, Einzelblock). `tests/blocks.test.mjs` 11/11 (alte IDs chain/grass). `tests/e2e/litematic.e2e.mjs` 4/4 (neu: unkomprimierte Datei mit Aufschlüsselung, Autor vorbelegt).
- Gesamtprüfung: `npm run check` grün (509 Tests, 508 bestanden, 1 übersprungen), `npm run test:e2e` **92/92** (650 s).
- Grenzen: Export nicht im Spiel mit Litematica geladen; freie Entities (Gemälde, Rahmen) werden weiter nicht dargestellt und nicht exportiert; große Modelle übernehmen Luft nicht als Zellen.

## GFX-01 · Grafik: Licht, Schatten, Spawnprüfung, Abschnitte · 02.11.2026 · Claude
- `tests/graphics.test.mjs` 8/8: Leuchtwerte (fest, `lit`, Kerzen, Seegurken, Anker, Lichtblock, Kupferbirne), Ausbreitung (Fackel −1 je Schritt, geschlossener Raum ohne Himmelslicht, Wasser dämpft, Dachöffnung), Eckschatten, Licht je Eckpunkt und Flächenhelligkeit, Spawnflächen (dunkler Raum 25 tagsüber + Dach 49 nachts, Fackel, niedrige Decke, Glas/Laub), 32³-Abschnitte (gleiche Flächenzahl wie ein Mesh, Reihenfolge egal, Änderung/Markierung/Ursprung/Licht über Abschnittsgrenze, inkrementell gleich neu gebaut), Sortierung durchscheinender Flächen, Einstellungen und Sonnenbahn.
- `tests/e2e/graphics.e2e.mjs` 3/3 (Chromium, Software-WebGL): Tag/Sonne/Nacht/Flach mit Helligkeitsvergleich der Bildschirmfotos (Schatten dunkeln ab, Nacht dunkler), Uhrzeit, Speicherung über Neuladen, Spawnprüfung mit Zählern, Umschalten ohne Geometrie-Neuaufbau, Dorfplatz mit mehreren Abschnitten und Picking.
- Messung: Großmodell 605.568 Blöcke `buildBlockMesh` ~5,5 s (vorher ~4,3 s, Budget 15 s); synthetisch 1,11 Mio. Blöcke Abschnittsaufbau ~9 s, nach Änderung eines Blocks ~2,4 s (161/162 Abschnitte übernommen).
- Gesamtprüfung: `npm test` 517 (516 bestanden, 1 übersprungen), `npm run test:e2e` **95/95** (875 s).
- Grenzen: nur Software-WebGL in Chromium; echte GPUs, Firefox/Safari, Handy-Leistung mit Schatten und Abgleich mit Spielbildern offen.

## BLOCK-01 · Echte Blocklogik 26.3 · 02.11.2026 · Claude
- Fakten aus dem offiziellen 26.3-Server (SHA-1 `33680f5f…`, DataVersion 5023) per Datengenerator und Prüfprogramm (Java 25), nicht im Repository außer den verdichteten Fakten.
- `tests/block-logic.test.mjs` 9/9: Fakten gegen Bericht, Stützflächen/Halt/Items/Stapel, alle 3.060 Spielvektoren (Verbindungen und Halt), Wasser/Kaktus/Gerüst, Platzierprüfung, Verbinden idempotent, Werkstatt-Schritt, Bauanleitung mit hängender Laterne, Material.
- Lokal 42.000 Vektoren (2.000 je Verbindungsfamilie, 16.000 Halt): alle gleich außer 9 Feuer-Fällen (nicht nachgebildet) und 6 Pilz-Fällen (Prüfwelt hell; der Planer nimmt Pilze im Dunkeln als haltend an).
- Katalogprüfung (339 Versionen, 136.863 Blöcke, 246 ms): 140 Blöcke ohne Halt, 1.239 abweichende Verbindungen, 1 fehlende Hälfte.
- `tests/e2e/block-logic.e2e.mjs` 3/3: Spielprüfung in der Bauanleitung (1400/390 px, kein Querscrollen), Zaunreihe in der Werkstatt prüfen, verbinden, erneut prüfen, rückgängig.
- Grenzen: keine Abnahme im echten Spiel; Stützausnahmen über ~2.000 Nachbarzustände gemessen.
