# Prüfstrategie ohne GitHub Actions

GitHub Actions werden nicht genutzt. Der jeweils bearbeitende Agent führt alle für seine Änderung erforderlichen Prüfungen selbst aus, behebt Fehler im Auftragsumfang und hält die Ergebnisse vor Commit/Push hier fest. Diese Regel gilt auch für spätere Tests, Builds und Releaseprüfungen.

## Vorgehen

1. Passende Prüfungen anhand der Änderung bestimmen; vorhandene Projektbefehle nutzen.
2. Dokumentation mit `python3 scripts/checks/check_docs.py` prüfen.
3. Mit wachsendem Code zusätzlich Parser-/Transformations-/Materialtests, Typprüfung, Lint, Build und geeignete UI-/Integrationstests selbst ausführen.
4. Befehl, Ergebnis, geprüften Arbeitsstand und Grenzen dokumentieren. Änderungen nach der Prüfung erfordern die betroffenen Prüfungen erneut.
5. Erst danach geprüfte Änderungen committen und pushen. Fehlende Ausführungsmöglichkeiten ausdrücklich melden; nichts als bestanden erfinden.

## Prüfprotokoll

### 27.10.2026 – Umstellung ohne Actions

- Grundlage: main 54d628f6a44ebd06c75791e91d221493d953aec2 plus die in diesem Commit enthaltene Umstellung.
- `python3 scripts/checks/check_docs.py`: bestanden; lokale Markdown-Dateiverweise und GPT-Anweisung unter 8.000 Zeichen geprüft.
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
- `npm run build && npm run test:e2e`: 7/7 (6 bisher inkl. B4 + Export). Heruntergeladene Datei vom unabhängigen Python-Leser `scripts/checks/verify_schem.py` bestätigt, gemeldeter SHA-256 = Dateihash, Konflikt sperrt Export, Revision 1 danach byte-gleich erneut exportiert. Screenshots Desktop 1400 px und Mobil 390 px visuell geprüft.
- Unabhängigkeit: NBT-Writer reproduziert die Python-struct-Fixture byte-genau; Erwartungen der 3×2×2-Handwelt (Palette, VarInt-Bytes, jede Zelle, BlockEntities) von Hand festgelegt. Eine eigene Handerwartung war falsch (6 statt 7 Blöcke) und wurde nach Nachzählen korrigiert, nicht die Implementierung.
- Grenzen: keine echte WorldEdit-/Minecraft-Abnahme, DataVersion nicht gegen Registry geprüft, WEOffset-Auslegung ungeprüft.

### 27.10.2026 – B1 Materialbedarf und Bauitems

- Grundlage main 29d03ed (inkl. B4 und B2) plus B1. Node 22.22.0, lokales Playwright/Chromium; keine neue Abhängigkeit.
- Neue Node-Fälle (`tests/unit/materials/materials.test.mjs`, 12): Ebenen getrennt (Doppelstufe = 2), Tür/Sonnenblume/hohes Gras/zwei Betten je ein Item, einzelne obere Hälfte bzw. Bettkopf mit fremdem Fuß mit Hinweis, Kerzen/Seegurken/Schneeschichten/Eier/Blütenblätter nach Anzahl und ungültige Anzahl ungelöst, neun Wandvarianten, Mauer bleibt Mauer, umbenannte/zusammengesetzte/abgeleitete Blöcke, Flüssigkeit/Mod/Feuer/Barriere ungelöst, unbekannte Vanilla-ID als Annahme, Stacks/Plätze/Shulkerkisten von Hand (200 Stein = 3 × 64 + 8, 20 Schilder = 1 × 16 + 4, 3 lose Shulkerkisten, 28 Plätze ⇒ 2 Kisten), Behälterinhalt, Projekt aus `resolution.world` (Duplikate einmal, Instanzsummen = Projekt, Konflikt ⇒ vorläufig), CSV.
- `npm run check`: strict Kern/Web, Kern- und Vitebuild, 128/128 Node-Tests (116 bisher inkl. B4/B2 + 12 Material), Dokumentationsprüfung bestanden.
- `npm run build && npm run test:e2e`: 9/9 (7 bisher + Material-Tab bei 1400 px und 390 px): Beispiel vollständig (Bauitems = platzierte Blöcke), Instanzumfang kleiner als Projekt, Suche, CSV-Download, kein horizontales Scrollen mobil, Konflikt aus dem Editor ⇒ „vorläufig“ mit Konfliktgrund; keine Konsolenfehler. Screenshots Desktop/Mobil visuell geprüft.
- Grenzen: Itemkatalog nicht gegen eine exakte Spielversion/Registry geprüft; Beispielbauteile decken nur `direct`-Regeln ab, Sonderregeln sind über Node-Fälle geprüft; keine Prüfung im Spiel.

### 27.10.2026 – B7 Zustandskatalog für Drehen/Spiegeln

- Grundlage main 7167d3a (B0, B1, B2, B4) plus B7. Node 22, lokal vorinstalliertes Playwright/Chromium.
- `npm run check`: strict Kern/Web, Kern- und Vitebuild, 135/135 Node-Tests inklusive 7 neuer in `tests/unit/core/states.test.mjs`, Dokumentationsprüfung bestanden. `npm run test:e2e`: 9/9 bestanden.
- Neue Fälle: 38 handberechnete Einzelorientierungen; alle 24.556 Katalogzustände mit vier Vierteldrehungen = Identität, doppelter Spiegelung = Identität und Ergebnis im Schema; Gruppenverträglichkeit aller 64 Transformationspaare je Familie; unabhängige Geometriemodelle (Richtungsvektoren, `rotation` als Winkel, Treppenquadranten, Türscharnier, Doppeltruhe, Schienenenden, Verbindungsarme); ungelöst bei unbekannter ID, Modblock, Schemaabweichung und Spiegelung glasierter Keramik; Meldungstexte in `transformPayload`.
- Zwei eigene Handerwartungen (Bett und Treppe bei Spiegeln + Drehen) waren falsch berechnet und wurden korrigiert, nicht die Implementierung.
- Grenzen: Katalog von Hand nach Java 1.21.4, kein Abgleich mit einem Registry-Report und keine Prüfung im Spiel; BlockEntity-NBT weiterhin ungelöst gemeldet.

### 27.10.2026 – B3 Dauerhafte Speicherung und Sicherung

- Grundlage main 1892dd6 (B0, B1, B2, B4, B7) plus B3. Node 22, lokal vorinstalliertes Playwright/Chromium; keine neue Abhängigkeit.
- `npm run check`: strict Kern/Web, Kern- und Vitebuild, 145/145 Node-Tests (135 bisher + 10 in `tests/unit/data/backup.test.mjs`), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: Base64 byte-genau (70 kB, Hochbytes, Abgleich mit Node `Buffer`); Projektsicherung selbsttragend inkl. aller Versionen verwendeter Bauteile, nur von Revisionen genutzter Versionen und Originale; Prüfsumme unabhängig mit Node `crypto` nachgerechnet; fehlende Originale gelistet statt erfunden; fehlende/manipulierte Versionen und beschädigte Originale brechen ab; vollständiger Roundtrip; Ablehnung von abgeschnittener Datei, Fremdformat, neuerem Format, geänderter Prüfsumme, nachgehashter Versions-/Originalmanipulation, Unvollständigkeit, neuerem Projektschema, Verbindung auf fehlende Instanz, ungültiger Drehung; identisches Projekt übersprungen, abweichendes standardmäßig als Kopie, „Ersetzen“ mit lokaler `baseRevision`, „Überspringen“; Bauteil-Zusammenführung behält lokale Angaben.
- `npm run build && npm run test:e2e`: 12/12 (9 bisher + 3 in `tests/e2e/persistence.e2e.mjs`): Projekt überlebt Neuladen inkl. Speicherrevision, zweiter Tab sieht neues Projekt ohne Neuladen; zwei Tabs auf demselben Projekt ⇒ zweites Speichern auf alter Basis wird als Konflikt gemeldet, nicht geschrieben, „Gespeicherten Stand laden“ zeigt den Stand des ersten Tabs; Schem-Import speichert Original (SHA-256 und Bytes in der Sicherung gegen Node geprüft), „Alles sichern“, Wiederherstellung in frischem Browserprofil erst nach Bestätigung, Reload, zweite Wiederherstellung „identisch vorhanden“, lokal geändertes Projekt ⇒ Kopie, lokales bleibt; manipulierte Datei abgelehnt ohne Änderung; Einzelprojektsicherung. Keine Konsolen-/Seitenfehler. Projektzentrale bei 1300 px und 390 px per Screenshot geprüft.
- Grenzen: nur Chromium; Safari/iPhone-Speicherverhalten, echte Kontingentüberschreitung und Upgrade-Migration (erst ab DB-Version 2 relevant) nicht im Browser geprüft.

### 27.10.2026 – B5: Anschlüsse, Snap und Bereich als Bauteil

- Grundlage main f1b95d9 (B0–B4, B7, B1) plus B5. Node 22, lokal vorinstalliertes Playwright/Chromium.
- `npm run check`: strict Kern/Web, Kern- und Vitebuild, 154/154 Node-Tests, Dokumentationsprüfung bestanden. Davon 9 neue Fälle in `tests/unit/core/connectors.test.mjs`: Beispielanschlüsse gültig; Fehler OFF_FACE/OUTSIDE_FACE/NORMAL/UP/SHAPE und Warnung NO_BLOCK an einer von Hand nachgezählten Zinnenkante; vier Vierteldrehungen und doppelte Spiegelung = Identität, +X → +Z unabhängig erwartet; Passung nur bei gleichem Typ/Profil/Anker, entgegengesetzter Normale, gleichem Up; deterministische, rasterfeste Snap-Liste mit erwarteter Bestlage [4,0,1]; Anfügen = eine Undo-Operation mit Verbindung und konfliktfreier Auflösung; Nutzungsgrenze; Verschieben löst Verbindung sichtbar („misaligned“), Re-Snap ersetzt sie, veralteter Vorschlag wird abgewiesen; Tor zwischen zwei Türmen verbindet zwei Paare, zu enge Lücke liefert sichtbare Konfliktlagen nachrangig.
- Eine falsche Handerwartung im ersten Testlauf (Bezugspunkt [10,0,0] ⇒ gleichwertige 180°-Lage [10,0,3] ist näher) wurde durch korrekten Bezugspunkt ersetzt, die Implementierung blieb unverändert.
- `npm run test:e2e`: 14/14 bestanden, davon 2 neue in `tests/e2e/snap.e2e.mjs` (Beispielprojekt: 4 Anschlüsse verbinden, Verschieben ⇒ 2 gelöste Verbindungen, erster Vorschlag konfliktfrei mit 2 Anschlüssen stellt alles wieder her, Mauer an Turm Ost anfügen und Undo; Bibliothek: Eckturm-Sockel Y 0–2 als Bauteil mit 40 Blöcken und übernommener Herkunft, Anschluss mit falschem Anker gesperrt, korrigiert als Version 2.0 gespeichert). Keine Konsolenfehler. Screenshots von Snap-Panel und Ankermarkierung visuell geprüft.
- Grenzen: kein Touch-/iPhone-Test, kein Ziehen im Viewer, Spiegelprofile ohne Händigkeitsfeld, keine echten Minecraft-Bauteile.

### 27.10.2026 – B6 Viewer und Bedienung (P1-03c)
- Grundlage main 3584213 plus B6. Node 22.22.0, lokales Playwright/Chromium mit Software-WebGL (SwiftShader); keine neue Abhängigkeit.
- `npm run check`: strict Kern/Web, Builds, 89/89 Node-Tests (83 bisher + 6 neue in `tests/unit/web/viewer.test.mjs`), Dokumentationsprüfung bestanden. Vite-Build ohne Chunkwarnung (Grenze 650 kB dokumentiert für den nachgeladenen three.js-Chunk).
- Neue Node-Fälle: Flächenkulling (Einzelblock 6, Nachbarn 10, Luft/Löschen verdecken nicht, Lücke, leer), Vollwürfel 27³ nur Hülle, Windungsrichtung gegen Normale, Viereck→Zelle, Ursprungsversatz; Kamerapresets als Einheitsvektoren, Bounding-Sphere passt für drei Seitenverhältnisse, Ortho-Zoom; Flug (Norden −Z, rechts Osten, Diagonale normiert, Yaw/Pitch-Rundlauf, Pitchgrenze); `inspectCell` Welt→Lokal bei Drehung und Spiegelung gegen **von Hand gerechnete** Zellen (7,0,1) und (17,0,−2) inkl. Konfliktnennung.
- `npm run test:e2e`: 9/9 (4 bisher + 5 in `tests/e2e/viewer.e2e.mjs`): Betrachter mit WebGL (1 118 Flächen, Draufsicht/Nordansicht über Kameraposition geprüft, Ortho, Flug mit W/Leertaste/Esc, Tastenkürzel, Picking); 27³-Import aus JSON (4 374 Flächen, Meshaufbau ~44 ms); Editor (Block → Welt-/Lokalkoordinate stimmt mit Pivot der Instanz, Fokus bewegt Kamera, Schichtmodi Einzeln/Bereich/Alles); Touch-Emulation Pixel 7 (Tippen wählt, Steuerkreuz fliegt per CDP-Touch, Loslassen stoppt, Flug beenden); erzwungenes Fehlen von WebGL (Softwareansicht, kein Flug, gekullte Flächen, Draufsicht nur Oberseiten, Auswahl). Keine Konsolen-/Seitenfehler.
- Vergleichsmessung vorher/nachher siehe [Viewer](architecture/planer/VIEWER.md#messung-27102026-container-headless-chromium-mit-software-webglswiftshader-keine-gpu). Editor- und Flug-Screenshots visuell geprüft.
- Nach Rebase auf main 8a70370 (B1, B2, B3, B4, B5, B7 integriert): `npm run check` 160/160, `npm run test:e2e` 19/19 bestanden; Konflikte nur in Anhang-/Importzeilen, fachlich beidseitig übernommen.
- Grenzen: keine echte GPU, kein echtes Mobilgerät; Touch nur emuliert. Keine Blockmodelle.

### 27.10.2026 – B8 Spielbrücke (nur Konzept)
- Nur Dokumentation: `docs/architecture/mod/MOD_BRIDGE.md`, Zeilen in BLOCKS/ROADMAP/DECISIONS/COMMUNICATION. Kein Code geändert.
- `npm run check`: Typprüfung, Builds, 160/160 Node-Tests, Dokumentationsprüfung bestanden.
- Erreichbarkeit geprüft: `maven.fabricmc.net`, `meta.fabricmc.net` und Mojang-Versionsserver aus der Cloud-Umgebung nicht erreichbar; Maven Central und Gradle erreichbar. Mod-Build nur auf dem Rechner des Nutzers.

### 27.10.2026 – B8 Spielbrücke M1 (Website)
- Grundlage main 6dcafb1 plus M1. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 169/169 Node-Tests (160 bisher + 9 in `tests/unit/building/game-check.test.mjs`), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: handgezählte Aufnahme der Testsäule mit allen sechs Urteilen (ok/Zustand/fehlt/falsch/abbauen/nicht aufgenommen) und allen vier Schrittstatus; größere Box mit Ausrichtung und Indexreihenfolge x + z·W + y·W·L, nicht ausgewählte Zellen ignoriert, bestätigte Schritte als ein Batch; abgehakte, aber leere Schritte gemeldet ohne Haken zu ändern; Zellen außerhalb der Aufnahme; Bau-Properties (Zaunverbindungen, Treppenform, Laub, Türen offen, Ofen `lit` ignoriert; Ausrichtung, Scharnier, `waterlogged`, Kerzen `lit`, Mod-Properties verglichen; fehlende Plan-Properties frei); fremdes Projekt/unbekannte Revision/fremde Aufnahme; Ablehnung von Plan-Dateien, ScanVersion 2, fehlendem ProjectMin, kurzen Daten, Palettenlücken, Volumenlimit; GZip-Roundtrip mit SHA-256 und Mehrbyte-VarInts; Plan-Export enthält ProjectMin bei beiden Ankern.
- `npm run test:e2e`: 21/21 (19 bisher + 2 in `tests/e2e/game-check.e2e.mjs`): exportierter Plan → Aufnahme mit einem falschen Block → Import im Tab „Bauen“, Grundlage springt auf Revision 1, 349/350 Blöcke, genau ein abweichender Schritt mit Koordinate und Schichtmarkierung, bestätigte Schritte per Klick abgehakt; fremdes Projekt und Plan-Datei verständlich abgewiesen; Telefonbreite 390 px ohne waagerechtes Scrollen. Desktop- und Mobil-Screenshot visuell geprüft.
- Grenzen: synthetische Aufnahmen, keine echte Mod-/Spielaufnahme; nur Chromium; Aufnahme wird nicht gespeichert.

### 27.10.2026 – B9 Gebäudekatalog
- Grundlage main 09cc6c7 plus B9. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 188/188 Node-Tests (169 bisher + 19 in `tests/unit/catalog/catalog.test.mjs`), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: alle 16 Gebäude deterministisch, Beispiel-gekennzeichnet, je eine Kategorie und Stil/Biom/Funktion; jeder Zustand mit Properties exakt im B7-Schema, vier Vierteldrehungen und doppelte Spiegelung = Identität; Materiallisten nur mit den gewollten Lücken (Wasser ungelöst, Ackerboden angenommen); Anschlüsse ohne Fehler; jedes Gebäude allein konfliktfrei, Bauanleitung azyklisch mit gleicher Blockzahl; unabhängige handgezählte Payload (Maße, Volumen, Grundfläche, Füllgrad, Betten, Türen, Licht, Lager, Beruf, Ausrichtung, Items); Facetten-Roundtrip; Filter ODER/UND, „überall“, Bauplatz mit/ohne Drehung, Höhe, Flags, Text über Blöcke/Berufe/Labels, Sortierung inkl. „Passung“ unabhängig von der Richtung; Trefferzahlen; Materialähnlichkeit; Vorschläge = Summe sichtbarer Gründe, Anschluss frei/belegt, Profilabweichung, leeres Projekt; ähnliche Gebäude; fehlende Versionen gemeldet.
- `npm run test:e2e`: 23/23 (21 bisher, `app.e2e` an neue Suchtreffer und eingeklappte Filter angepasst, + 2 in `tests/e2e/catalog.e2e.mjs` bei 1400 px und 390 px): Facettenfilter, Bauplatz mit/ohne Drehung, Steckbrief der Kapelle, Vorschläge für „Burgmauer“ absteigend, Dorfbrunnen übernommen und im Editor sichtbar. Desktop- und Mobil-Screenshot visuell geprüft.
- Grenzen: nur Chromium; Heuristiken (Schwierigkeit, Bauzeit) nicht gegen echte Spieler gemessen; keine Spielabnahme der Gebäude.

### 27.10.2026 – B8 Spielbrücke M2 (Mod-Kern)
- `scripts/mod/test_bridge.sh` (JDK 21, Gradle-Wrapper 9.8.2, JUnit 5.14.4 aus Maven Central): 6/6 JUnit-Tests in `mods/bauplaner-bridge/core` (Plan-Identität und Box, Ablehnung von Aufnahmen/alten Plänen/Version 2/Nicht-GZip, handabgeleitete Besuchsreihenfolge x→z→y und Palette/Bytes mit nicht geladener Zelle und Metadaten, Mehrbyte-VarInt ab ID 128, Zustandsformat, Anker-Speicher und Dateiname).
- Sprachübergreifend (`scripts/mod/bridge_crosscheck.mjs`): Website exportiert Revision (Anker untere Ecke), Java-`ScanJob` nimmt eine Welt mit Anker 1000/64/−300 und einem Diamantblock auf; Python-Leser: gültig, Box 14×8×4, gleiche Zelle; Website: Revision und PlanSha256 passen, 241/242 Zellen korrekt, genau ein abweichender Schritt.
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
- Neue Node-Fälle (`tests/unit/materials/recipes.test.mjs`, 10): Katalog gültig und azyklisch für beide Methoden, alle Tag-Mitglieder und Zutaten erreichbar; handgezählter Baum (100 Fichtentreppen, 20 Fackeln, 30 Steinziegelmauern, 2 Betten, 3 Laternen ⇒ 40 Fichtenstämme, 30 Bruchstein, 6 Kohle, 6 Mohn, 6 weiße Wolle, 3 Roheisen; Rest 3 Nuggets, 2 Stöcke, 1 Fackel; 33 Schmelzvorgänge = 5 Kohle); geteilte Rundung (9 Planken = 3 Stämme); Steinsäge 4 vs. Werkbank 8 Bruchstein; Tag-Wahl aus dem Baum bzw. Standard; Rohstoff vor Rezept, „vorhanden“, unbekannte Items/Modblöcke; Farben/Beton/Wasser; Kupfer gewachst und oxidiert; Bilanzprüfung für Beispielprojekt und alle 16 Gebäude, deterministisch; CSV.
- `npm run check`: Typprüfung, Builds, 204/204 Node-Tests (194 + 10), Dokumentationsprüfung bestanden. `npm run test:e2e`: 26/26 (24 + 2).
- Neue Browserprüfung (`tests/e2e/recipes.e2e.mjs`, 1400 px und 390 px): Abschnitt vollständig aufgelöst, Schritt als vorhanden markieren und zurücksetzen, Werkbank-Modus nie weniger Rohstoffe, CSV-Download, kein waagerechtes Scrollen, keine Konsolenfehler. Desktop- und Mobil-Screenshot visuell geprüft.

### 27.10.2026 – P5-01 Litematic-Adapter
- Grundlage main 33872c5 (nach Rebase auf B1-R) plus P5-01. Node 22, lokales Playwright/Chromium, Python 3 (nur Standardbibliothek).
- `npm run check`: Typprüfung Kern/Web, Builds, 230/230 Node-Tests (204 bisher + 26 in `tests/unit/formats/litematic.test.mjs`), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: unabhängige Python-Fixture mit zwei Regionen (negative Größen, Lücke, Eintrag über Long-Grenze, Tile-Entity, Entity, Tick, Metadata mit int64-Grenze) gegen handgeschriebene Zelltabelle; TypeScript- und Python-Leser Zelle für Zelle gleich; Einzelregion; Bitpacking 2–20 Bit gegen BigInt-Referenz; Abweisung von Format ≥ 8, Format 1, fehlender Version, leeren Regionen, Größe 0, falscher Long-Anzahl, Palettenindex außerhalb, Palette ohne Name/ungültiger ID/Nicht-String-Property, negativer DataVersion, Sponge-Wurzel; Limits (Volumen, Box je Achse mit Hinweis, Regionenzahl); Überlappung mit Warnung und verworfenem BlockEntity; BlockEntity auf Luft; 1.12-Dateien; Formaterkennung Schem/Litematic/MCEdit/.nbt/unbekannt/ohne GZip; Schreiber (Layout, Luft auf Index 0, Tile-Format, Metadata, Zählung, reservierte Felder, kein WorldEdit-Hinweis), Python-Leser für beide Anker und Lückenpolitiken, deterministischer Roundtrip, Versionswahl 5/6/7 nach DataVersion, Export einer Revision aus der Domäne.
- `npm run test:e2e`: 29/29 (26 bisher + 3 in `tests/e2e/litematic.e2e.mjs`): Betrachter öffnet die Litematic-Testdatei mit beiden Regionen und Bericht; Bibliothek importiert, wählt Region „Turm“, speichert als Bauteil; Tab „Export“ lädt `.litematic` (Format 6 für DataVersion 3465) herunter, Python-Leser bestätigt. Betrachter-Screenshot visuell geprüft.
- Grenzen: keine echte, von Litematica gespeicherte Datei und keine Ladeprüfung in Litematica im Spiel; nur Chromium.

### 28.10.2026 – B9-A Gebäudekatalog v2
- Grundlage main 5c7e9c2 plus Katalog v2. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 234/234 Node-Tests, Dokumentationsprüfung bestanden.
- Neue bzw. geänderte Node-Fälle (`tests/unit/catalog/catalog.test.mjs`): ≥ 150 Gebäude mit eindeutigen IDs und Namen; alle Zustände im B7-Katalog und drehinvariant; Materiallücken und Annahmen exakt wie in `gaps`/`assumed` deklariert; Versions-IDs der 16 klassischen Gebäude und drei Module unverändert (festgeschrieben); Familien (8 Starterhäuser, Familien-Tag kein normaler Tag, Zusammenfassen zählt genau eine je Familie, `buildingInfo`); Inspirationslinks nur auf minecraft.wiki; Spielphase (Regeln, Filter `stageMax`, Sortierung); 9 Ensembles: alle Mitglieder vorhanden, keine Voxelkonflikte, Minimum-Ecke bei `at`, fehlendes Bauteil ⇒ kein Projekt, `ensemblesWith`. Namensgenaue Abfragen laufen auf der festen klassischen Teilmenge. `tests/unit/materials/recipes.test.mjs` prüft alle 150 Gebäude auf Rezepte (Endertruhe ergänzt).
- `npm run test:e2e`: 29/29. `catalog.e2e` (1400 px und 390 px): ≥ 150 Einträge, Zusammenfassen verringert die Liste, nordische Wohnhäuser, Spielphase „bis früh“ ohne spätere Phasen, Starterhaus mit „+7 Varianten“, Umschalten auf Kirsche und Eiche, Ensemble-Verweis im Steckbrief, Ensemble „Burg“ konfliktfrei als Projekt mit 7 Instanzen, Vorschläge und Übernahme wie bisher. `app.e2e`: Tagfilter „tor“ findet das Modul und die neuen Tore; Editor-Bauteilliste > 150 Einträge, Suche „eckturm“ ⇒ 1.
- Gefunden und behoben: Die Editor-Bauteilliste streckte die 3D-Ansicht auf 6 511 px, Klicks in die Bildmitte trafen nichts (snap/viewer-E2E rot). Jetzt Suchfeld und Scrollfläche, 3D-Ansicht 721 px hoch.
- Vorschaubilder aller Sets mit eigenem Renderer gesichtet (Fenster, Dächer, Windmühlenflügel, Schiffsrumpf nachgebessert).
- Grenzen: Redstone-Module (Sortierer, Taktgeber, Schmelzmodul, Wasseraufzug) nach Java-Regeln gebaut, aber nicht im Spiel geprüft; nur Chromium.

### 28.10.2026 – B11 Oberfläche Bibliothek und Projektzentrale
- Grundlage main dce4394 plus B11. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 234/234 Node-Tests, Dokumentationsprüfung bestanden.
- `npm run test:e2e`: 29/29. `catalog.e2e` neu geschrieben (1400 px und 390 px, siehe [UI](architecture/planer/UI.md#prüfung)), dreimal hintereinander grün; `app`, `snap`, `persistence` auf Kartenlinks und Detailseite umgestellt, Prüfinhalte unverändert.
- Gefunden und behoben: Kategoriekacheln wuchsen vor dem Laden des Bildes auf 241 px (feste Höhe); alte Listenregel `max-height: 720px` schnitt das Kartenraster ab; mobile Navigation blendete „Bibliothek“ aus.
- Sichtprüfung per Screenshot: Übersicht, Detailseite, Ensembles, Projektzentrale (1400 px) und Übersicht/Detail (390 px).
- Grenzen: nur Chromium; Vorschaubilder sind Näherungsfarben ohne Texturen; Touch nur über Playwright-Viewport, nicht auf echtem Gerät.

### 28.10.2026 – B12 Schem-Ansichten, Bauversionen, Bibliothek
- Grundlage main c04b66c plus B12. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 247/247 Node-Tests (234 + 8 in `tests/unit/core/variants.test.mjs` + 5 in `tests/unit/formats/schem-views.test.mjs`), Dokumentationsprüfung bestanden. B7-Drehtest um Braustand, Zielblock und Netherwarze erweitert.
- `npm run test:e2e`: 33/33 (29 + 4 in `tests/e2e/schem.e2e.mjs`, siehe [SCHEM_VIEWS](architecture/planer/SCHEM_VIEWS.md#prüfung)); `catalog.e2e` scrollt auf schmalen Bildschirmen die erste Karte ins Bild, bevor es auf das (nachgeladene) Bild wartet.
- Gefunden und behoben: Kamera nach Import teils außerhalb des Bildes; mobile Detailseite 20 px breiter als der Bildschirm (alte `.stats`-Regel); Bildstreifen-Knöpfe 219 px hoch (globale `.loading`-Abstände).
- Sichtprüfung per Screenshot: Bilder, Ebenen, Versionen (1400 px) und Bilder/Ebenen (390 px).
- Grenzen: nur Chromium; keine Prüfung auf echtem Gerät; Hauptbundle rund 725 kB über der Warnschwelle.

### 28.10.2026 – B14 Baustelle
- Grundlage main 0a1d2a8 (mit B12, B13-Reservierung) plus B14. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 254/254 Node-Tests, Dokumentationsprüfung bestanden. `npm run test:e2e`: 35/35. Neu `tests/unit/building/site.test.mjs` (7 Fälle) und `tests/e2e/site.e2e.mjs` (2 Fälle, 1400 px und 390 px), Inhalte in [SITE](architecture/planer/SITE.md#prüfung). `recipes.e2e` weiter grün mit dauerhaft gespeichertem „vorhanden“.
- Gefunden und behoben: Die Beispiel-Burgmauer zeigte zunächst 8 „verbaute“ Freiräume, weil passende Nachbarn ohne gespeicherte Verbindung als Fremdblöcke galten; jetzt Zustand „angedockt“ mit Knopf „Angedockte verbinden“. Lagerfelder wurden von einer globalen Eingaberegel gestreckt (eigene Breite).
- Sichtprüfung per Screenshot (1400 px).
- Grenzen: nur Chromium; Sammelzeiten sind Richtwerte.

### 28.10.2026 – S1 Stabilität und Qualitätssicherung
- Grundlage main 577f4aa (nach Rebase auf B12 und B14) plus S1. Node 22, lokales Playwright/Chromium.
- Ausgangslage vor Änderungen: `npm run check` 234/234, `npm run test:e2e` 29/29.
- `npm run check`: Typprüfung Kern/Web, Builds, 268/268 Node-Tests (254 nach B12/B14 + 7 in `tests/unit/data/integrity.test.mjs` + 7 in `tests/unit/web/stability.test.mjs`), Dokumentationsprüfung bestanden.
- Neue Node-Fälle: Datencheck je Befundart (beschädigte Payload, fehlende Version auch nur in eingefrorener Revision, Bauteil-/Versionsbuchhaltung, fehlende/beschädigte/unbenutzte/unlesbare Originale, kaputte Projektdatensätze ohne Abbruch, keine Mutation; Prüfsumme der Originale unabhängig über Node-crypto); Auslieferungsprüfung (gleich/verändert/fehlt, fremdes Manifest abgelehnt); Route `#/system`; Großmodell 605 568 Blöcke mit Zeitbudgets für Version, Auflösung, Material, Anleitung, Flächen, Datencheck, Sicherung; Geometriehash zeichengleich zur Referenzdefinition (zusätzlich vor/nach Umbau für 348 Schritte aus Modulen und Gebäuden identisch); Validierungscache nur bei mindestens so strengen Limits; schneller Validierungspfad mit denselben Meldungen.
- Messung Großmodell vorher → nachher: `resolveProject` 17,1 s → 4,3 s, `buildGuide` 6,0 s → 4,2 s, `computeMaterials` 2,9 s → 2,0 s (Container, schwankend).
- `npm run test:e2e`: 40/40 (35 nach B12/B14 + 5 in `tests/e2e/stability.e2e.mjs`): Importvorschau bei 1400 px und 400 px (3D-Fläche nicht höher als das Fenster, Bildmitte sichtbar; vorher 2 022 px hoch); Systemcheck ohne Befund; per IndexedDB beschädigte Version und verwaiste Instanz ⇒ „✕ 2 Fehler“ mit Empfehlung; Fehlerprotokoll mit Bericht über die Zwischenablage. Screenshots von Importvorschau (Desktop/schmal) und Systemcheck visuell geprüft.
- Nach Rebase auf B12 gefunden und behoben: die feste Höhe der 3D-Fläche galt zuerst für jede `.detail-stage` und ließ die Fläche in der B12-Schem-Ansicht (Flex-Spalte) auf 0 px Breite schrumpfen; jetzt nur für direkte Kinder von `.detail-hero`.
- Grenzen: Absturzschutz nicht mit echtem Zeichenfehler im Browser ausgelöst; nur Chromium; Zeitbudgets fangen nur grobe Rückschritte.

### 28.10.2026 – B13 Parametrische Generatoren
- Grundlage main 5467886 (mit B12, B14, S1) plus B13. Node 22, lokales Playwright/Chromium.
- `npm run check`: Typprüfung Kern/Web, Builds, 281/281 Node-Tests (268 + 13 in `tests/unit/catalog/generators.test.mjs`), Dokumentationsprüfung bestanden. `npm run test:e2e`: 42/42 (40 + 2 in `tests/e2e/generators.e2e.mjs`; ein erster mobiler Lauf zählte die Karten vor dem Rendern, jetzt mit Warten). Inhalte in [GENERATORS](architecture/bibliothek/GENERATORS.md#prüfung).
- Gefunden und behoben: Brückenvorschau zu hoch (Plot-Höhe vorgegeben), doppelte Klammern im Namen, Kartenlayout der Übersicht, Nachrechnungs-Hinweis mobil unsichtbar (globale `.small-note`-Regel).
- Sichtprüfung per Screenshot (1400 px): alle Generatoren, 9 Vorlagen, Burganlage, Festung, Altstadt, Kirschblütendorf.
- Grenzen: nur Chromium; keine Spielabnahme der Bauwerke.

## S2 · 31.10.2026 · Bibliothekseinstellungen

- Ausgangspunkt: main `3eddf50`. Änderungen in `prefs.ts`/`preferenceStore.ts`, vier Regressionen in `tests/unit/web/preferences.test.mjs`.
- `npm ci --ignore-scripts`: erfolgreich, Lockfile unverändert.
- `npm run check`: 285/285 Node-Tests bestanden; strenge Kern-/Web-Typprüfung, Kern-/Pages-Build und Dokumentationsprüfung bestanden.
- `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" npm run test:e2e`: nicht ausführbar; jeder Browserstart scheitert vor dem Testverhalten an der fehlenden Datei `chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`. Keine Browserabnahme behauptet.
- Zusätzlicher Vorschauversuch über Sites-Preview: Browser erreicht den Server, Vite weist den Vorschauhost `terminal.local` ab. Keine Host-/Sicherheitsregeln geändert.
- Wegen der vollständigen Browserprüfpflicht aus AGENTS/BLOCKS keine Main-Integration oder Pages-Veröffentlichung. Keine Minecraft-/Safari-/iPhone-Abnahme.

### S2 · Veröffentlichung nach Nutzerpräzisierung
Expliziter Nutzerauftrag vom 31.10.2026 verlangt Push und anschließende Pages-Veröffentlichung trotz dokumentierter fehlender Browser-Testinfrastruktur. Code seit erfolgreicher Typprüfung und vier Regressionen unverändert. Veröffentlichungsskript baut aus dem gepushten Commit und prüft die Pages-Artefakte erneut; Liveprüfung erfolgt separat.

## B8P · 31.10.2026 · Spielaufnahmen und Verlauf

- Neue Regressionen `tests/unit/core/scan-persistence.test.mjs`: atomare Referenz-/Originalübergabe, doppelte Importdatei, manuelle Ausrichtung, baseRevision-Konflikt, falscher SHA/Projekt-/Revisionsbezug, ungültige Koordinaten, beschädigte/fehlende Originale, Backup-Roundtrip, fehlende Dateien und Datencheck. Original-SHA wird unabhängig mit Node crypto berechnet.
- `npm run build:core && node --test tests/unit/core/scan-persistence.test.mjs tests/unit/data/backup.test.mjs tests/unit/building/game-check.test.mjs`: 27/27 bestanden (acht neue Persistenztests). Strenge Kern-/Web-Typprüfung bestanden.
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
- `npm run build:core` und `node --test tests/unit/catalog/build-themes.test.mjs`: 4/4 bestanden. Der neue Test prüft die drei Welten gegen den tatsächlich erzeugten Katalog (Trefferzahl, Vorschauen derselben Stilrichtung, reproduzierbarer Link mit identischen IDs) und dass keine Welt eine Stilrichtung ohne Bauteile nennt. Die bestehenden Prüfungen (11 eindeutige IDs, reale Facetten, 3 Aufgaben, eigener Bestand, Archivzustand, leerer Bestand) laufen unverändert weiter.
- `npm run check`: **365/365 Node-Tests**, Architektur-, Roadmap-, Typ-, Kern-/Pages-Build- und Dokumentationsprüfung bestanden.
- Grenzen: keine Browser-/Touch-Sichtprüfung der drei neuen Karten (Chromium fehlt weiterhin, QA-01 offen); keine Aussage über Minecraft-Kompatibilität, Gelände oder Spielverhalten. Die Stilrichtungen `klassisch`, `antik` und `tropisch` bleiben bewusst ohne eigene Welt.
- Veröffentlichung geprüft: Quellcommit `c3e6478` regulär auf main integriert, Pages-Artefakt-Kindcommit `bc74958`. Live-`deployment.json` meldet denselben Quellcommit und dieselben zwölf Dateihashes wie der lokale Build; `index.html` und das Hauptbundle wurden zusätzlich als Bytes geladen und stimmen in Größe und SHA-256 überein. Ein fehlendes Git-Identitätspaar brach den ersten Publisherlauf ab, bevor irgendetwas geschrieben wurde; nach lokaler Konfiguration lief er unverändert durch. Kein Force-Push, keine eigenen Actions.


- `npm run check:roadmap-change -- 18f70b7` vor Quellintegration erforderlich und bereits für den Zwischenstand erfolgreich. Abschlusseintrag deckt sämtliche Dateien ab; Quellcommit wird vor Refupdate nochmals mit demselben Checker geprüft. Artefakt-Kindcommit bleibt ausschließlich manifestgeprüft und erhält keinen neuen Roadmap-Zyklus.

## PERF-01 / PERF-02 · 01.11.2026 · Zusammenhängender Performanceblock

- Grundlage main `2b8ea8d3dfc7a640167f8bb2657ab044d9fa2c36` einschließlich Cline-WORLD-02. Keine fremden Themen-/Roadmapänderungen überschrieben und keine neue Abhängigkeit.
- `npm run check`: 377/377 Node-Tests bestanden; Architekturgrenzen, generierte Roadmap/Historie, strenge Kern-/Web-Typprüfung, Kern-/Pages-Build und Dokumentationsprüfung erfolgreich. Zwölf neue Tests: acht Rechenfall-/Worker-Lifecycle-/Übertragungsfälle und vier interne Indexregressionen. Aktuelle Vite-Bundlewarnung bleibt bestehen.
- Geprüfte Inhalte: identische Auflösung, Anleitung, Gesamt-/Instanz-/Schrittmaterialien und Baustellenpläne aus den vorhandenen Fachfunktionen; eingefrorene Revision; teilweise überlappende Instanzen; Packlistensummen mit gemeinsamer Stapelgrenze; Abbruch, supersedierte und verspätete Antworten, fremde Job-/Projekt-/Revisions-/Basis-Tags, Worker-/Clonefehler, Timeout, Retry und Dispose. Keine synchronen Ersatzberechnungen bei fehlendem Worker.
- Echter Node-worker_threads-Lauf: vollständige Structured-Clone-Rückgabe einschließlich Maps und Baustellenplan semantisch identisch. Abgegrenzte Teilthreadmessung auf Node v24.22.1 / AMD EPYC 9V74, 42.875 Zellen: Hauptthreadberechnung 478 ms, Worker inklusive Start/Kopieren 725 ms, 121 bediente Heartbeats, maximaler Abstand 23 ms. Node-Responsivität ist kein Browser-/Mobilnachweis und bedeutet keine kürzere Gesamtlaufzeit.
- `node --expose-gc scripts/bench/benchmark_composition.mjs 2b8ea8d`: 266.784 Zellen, drei Vorher-/Nachherläufe, gesamte öffentliche Resolution inklusive Map-Reihenfolge in allen sechs Ausgaben SHA-256-identisch. Letzter Median 833,60 → 790,37 ms (5,2 % niedriger), erste Serie 14,7 %. Streuung, Hardware und sichere Indexgrenze dokumentiert in COMPOSITION_PERFORMANCE. Öffentliche owners-Map bleibt kompatibel; keine Chunk-/Cacheimplementierung behauptet.
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
- `node scripts/bench/benchmark_project_browser.mjs`: 64.000 synthetische Zellen, je 1400/390 px Warmup und drei synchrone/Worker-Vergleichspaare. Alle zwölf vollständigen Ergebnisdigests je Snapshot gleich; 64.000 Zellen/Items/Besitzer, 40 Schritte, null Konflikte und echte Maps erhalten. Ryzen 5 3600/32 GiB, Chromium 156.0.8078.4, Windows, Node v24.18.0. DOM-Probe Median 693→30 bzw. 790→35 ms; Gesamtdauer 703→1184 bzw. 800→1420 ms. Größter einzelner Worker-Heartbeatabstand 230,6 ms. Rohdaten und Grenzen in architecture/project-browser-benchmark.json und PROJECT_BROWSER_BENCHMARK.md. Kein INP-/React-/GPU-/Echtgerätetest und kein historischer Versionsvergleich.
- `node --test tests/unit/tooling/pages-restore.test.mjs`: 4/4 bestanden. `node scripts/pages/probe_pages_restore.mjs`: 13 echte Ausgangsartefakte wiederhergestellt, sämtliche 333 Sourcepfade/Blobhashes/Modi erhalten; neues Recoverykind, bekannter Build unverändert, synthetischen Folgechunk entfernt. Nur Scratch-Clone ohne Remote, anschließend gelöscht; keine Live-/CDN-Abnahme.
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
- `BAUPLANER_ALL_BLOCKS=<pfad> node --test tests/unit/building/blocks.test.mjs`: All-Blocks-Litematic 26.3 importiert (29.346 Zellen, 1016 Block-IDs, alle im Register) und vermascht.
- Manuelle Sichtprüfung in Chromium mit der lokalen 26.3-Client-Jar: Bibliotheksbilder, Detailseite, 3D-Betrachter und Ausschnitte der All-Blocks-Datei; ein Fehler gefunden und behoben (`heavy_core`: Texturvariable ohne `#`).
- Nicht geprüft: Mojang-Download im Browser selbst (nur CORS/Manifest per curl), Firefox/Safari, echte Geräte.

## MAP-01 Weltkarte · 01.11.2026 · Claude

- Ausgang main `1b58257` (Quelle `edbb520`), nach Rebase auf VIEW-02 (Konflikt in `ThreeViewer.tsx` fachlich gelöst: `markFor` von VIEW-02 plus `frameRequest`).
- `node --test tests/unit/world/worldmap.test.mjs`: 8/8 bestanden (Validierung, Rückgängig, Sicherung, Welt = Projekt + Ursprung zellgenau, Dimensionen, Überschneidungen gegen Handzählung, Fortschritt inkl. „prüfen“, Budget, Vorschlag, Draufsicht, Determinismus, Marker, Link-Übernahme BlueMap/Dynmap/Pl3xMap).
- `npm run check`: bestanden, 399 Node-Tests bestanden, 1 übersprungen (Bestand), Architektur-, Roadmap-, Typ-, Build- und Dokumentationsprüfung.
- `node --test tests/e2e/worldmap.e2e.mjs`: 2/2 (1400 und 390 px, Headless-Chromium mit Software-WebGL). Visuelle Sichtprüfung der Screenshots im hellen Theme.
- Umgebungshinweis: Das Repository pinnt Playwright 1.64.1 (erwartet Headless-Shell 1248); im Container liegt 1243. Für die Läufe wurde lokal ein Verweis 1248 → 1243 angelegt, keine Repositoryänderung.
- Grenzen: kein Gelände, keine Spielprüfung, Live-Karten-Vorlagen nicht gegen einen laufenden Kartenserver geprüft, keine echte GPU-/Touch-Gerätprüfung (QA-02). Leistung: 40 Projekte mit 39.556 Blöcken in 573 ms (Node, ohne Worker-Transport).
- `npm run test:e2e` gesamt: 60/61 bestanden. Einziger Ausfall `snap.e2e.mjs` „Instanz im 3D-Bild ziehen“ (`data-ghost` nach dem Loslassen kurz `null`) ist zeitabhängig und **auch auf unverändertem main `1b58257` reproduzierbar** (1 von 7 Läufen); mit diesem Stand danach 5/5 isolierte Läufe bestanden. Nicht durch MAP-01 verursacht, Test nicht verändert; als bekannter Wackelkandidat an QA gemeldet.

## Eigene Sammlungen und Vorlagen (LIB-02/LIB-03) · 01.11.2026 · Claude

- Neu `tests/unit/catalog/collections.test.mjs` (9 Fälle): Einträge/Version festhalten/Notiz/Reihenfolge, Ordnerbaum mit Kategorien, Tiefe 4, Zyklen und verwaiste Ordner, Löschen mit Nachrücken, Verweisauflösung (fehlend, Version fehlt, veraltet, archiviert), Ensemblevorlage aus Projekt mit Verbindungen, Projektübernahme als Kopie (Vorlagenänderung lässt Projekt bytegleich), Verlauf begrenzt auf 20 und Wiederherstellen, Generatorvorlage, mitgeliefertes Ensemble als Vorlage identisch zu „Als Projekt anlegen“, Datensatzprüfung, MemoryRepository-CAS (Konflikt schreibt nichts), Sicherung Format 1 unverändert (unabhängige Prüfsumme mit Node-crypto) und Format 2 mit Wiederherstellungsplan.
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
- `scripts/mod/test_bridge.sh`: 6/6 JUnit-Tests und Querprüfung bestanden (242 Zellen, 21 Schritte, 1 Abweichung erkannt). Der Import von `exportRevisionSchem` zeigte nach dem Umzug nach `packages/application` ins Leere und ist korrigiert.
- `scripts/mod/test_bridge_ingame.sh` (echter Minecraft-26.3-Client, Einzelspieler, Superflat): Plan per Chat geladen, `anker hier` auf den angeschauten Ursprungsblock (8/−60/8), Aufnahme 320 Zellen in einem Tick geschrieben; Website-Vergleich 146/148 korrekt, genau der präparierte Diamantblock (falsch) und der ausgelassene Block (fehlt) erkannt, keine nicht aufgenommenen Zellen; 51 s.
- Derselbe Test mit `BAUPLANER_MODPACK_MODS` und allen 21 Mods aus „Fabric 26.3 1.0.1mitRei“ (u. a. Sodium 0.9.3-beta.1, Iris 1.11.7, Distant Horizons 3.3.3, REI 26.3.824, Xaero Minimap/Weltkarte, Jade, Simple Voice Chat, Freecam) als Produktionsstart: bestanden, gleiches Ergebnis, 90 s. Hinweis: Distant Horizons braucht das volle JDK (AWT); einige Mods halten den Prozess nach Testende offen, das Skript beendet ihn nach der Ergebnisübergabe.
- `tests/unit/tooling/roadmap.test.mjs`: Der Darstellungstest verlangte „Blocker:“ aus den Live-Daten; mit dem Ende der Blockade von GAME-02 gab es keinen Blocker mehr. Der Test setzt jetzt einen eigenen Testblocker.
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

- `node --test tests/unit/mod/mod-releases.test.mjs tests/unit/web/router.test.mjs`: bestanden (jede gelistete .jar in `downloads/mod/` mit gelisteter Größe/SHA-256, numerische Versionssortierung 26.10 > 26.3, Rückfall auf vorhandene Builds, teilbare Auswahl, Route `#/mod` mit und ohne Auswahl).
- `node --test tests/e2e/mod-download.e2e.mjs` (Chromium, Pages-Build unter `/Minecraft-Bauplaner/`, 1400 und 390 px): 2/2 bestanden. Fußzeilenlink, Titel, Vorauswahl neueste Minecraft-Version/Fabric, NeoForge nicht wählbar, Linkziel, SHA-256 sichtbar, Download-Dateiname, 34 262 Bytes über denselben Link, teilbare Auswahl in der Adresszeile, keine waagerechte Scrollleiste, keine Seitenfehler. Bildschirmfotos beider Breiten angesehen.
- `tests/e2e/shell.e2e.mjs` Fall „Desktop: … Schnellsuche (Strg+K)“ scheitert in diesem Linux-Container auch auf unverändertem main (Dialog öffnet nicht auf Strg+K); die übrigen 4 Fälle und `game-check.e2e.mjs` bestehen. Nicht durch diese Änderung verursacht, nicht verändert.

## EDIT-01 / EDIT-02 Blockeditor und Mehrfachauswahl · 01.11.2026 · Claude

- `node --test tests/unit/editor/editor.test.mjs`: 11/11 bestanden (Entwurf/Umkehrung, Determinismus, Formen gegen Handzählung, Ersetzen, Füllen, Drehen, Ablage, Speichern als Version, `localCell` für alle 8 Transformationen, Projektzuordnung mit Rückgängig, Gruppenoperationen zellgenau gegen `transformCellPosition`/`transformBlockState`).
- `node --test tests/e2e/editor.e2e.mjs`: 4/4 in Headless-Chromium (Werkstatt, Projekt-Reiter „Blöcke“, Mehrfachauswahl, 390 px). Sichtprüfung der Screenshots von Werkstatt und Gruppenhülle.
- `npm run check`: 411 Node-Tests (410 bestanden, 1 übersprungen, Bestand), Architektur, Roadmap, Typen, Build, Doku. `npm run test:e2e` gesamt 65/65. Dabei zwei eigene Fehler gefunden und behoben: sechster Projekt-Reiter ließ die Seite bei 390 px waagrecht scrollen (Reiterleiste bricht jetzt um), ein Hinweistext im Eigenschaftenfeld verlängerte die Editorzeile so, dass der 3D-Ziehtest die Bildmitte verfehlte (Gruppenfeld erscheint nur noch bei aktiver Gruppe).
- Playwright-Hinweis wie bei VIEW-02/MAP-01: lokaler Verweis 1248 → 1243, keine Repositoryänderung.
- Grenzen: kein Picking an 3D-Blockflächen, keine Spielprüfung der gespeicherten Zustände, nur Chromium. Seltene Zustandswerte fehlen im Register, solange PROFILE-01 keinen Serverreport liefert (siehe [BLOCK_EDITOR](architecture/planer/BLOCK_EDITOR.md)).
- Nach Rebase auf UI-02/LIB-02/03/04/GAME-02: Werkstatt nicht als fünfter Hauptbereich (UI-02-Kopfzeile ist auf vier ausgelegt, `shell.e2e.mjs` prüft das), sondern als Schnellsucheintrag und Knopf „✎ Neues Bauteil bauen“ in der Bibliothek. `npm run test:e2e` 73/74; einziger Ausfall `shell.e2e.mjs` „Schnellsuche (Strg+K)“ wartet auf den Dialog und scheitert **identisch auf unverändertem main `46444f3`** (eigener Build im sauberen Arbeitsbaum); per Hand öffnet Strg+K den Dialog. Nicht durch EDIT verursacht, Test nicht verändert.
## GEN-02 Neue Generatoren und Treppen-Eckformen · 01.11.2026 · Claude

- Ausgang main `a5fc972`, vor der Prüfung auf main `80631ef` (EDIT-02/EDIT-01, GAME-02-Downloadseite) gebracht; keine Konflikte.
- `tests/unit/catalog/generators.test.mjs`: 17/17 bestanden (alle elf Generatoren über Standard, Vorlagen, acht Stile, 25 gewürfelte Sätze und Bereichsgrenzen; Begehbarkeit Treppenhaus; Eckformen nach Spielregel; Torhaus-Andocken in der Burganlage).
- Alt/neu-Vergleich über je 75 Parametersätze: Haus 6, Turm 21, Dach 9 abweichend (Eckformen) → Version 2; Mauer und Brücke 0 → Version 1 bleibt.
- `npm run check`: bestanden, 425 Node-Tests bestanden, 1 übersprungen (Bestand).
- `npm run test:e2e`: 74/76. `generators.e2e.mjs` 2/2 bestanden (14 Karten, Basilika-Hinweis, Dorfplatz ohne Überschneidungen). `textures.e2e.mjs` schlug einmal fehl und bestand im Einzellauf (zeitabhängig). `shell.e2e.mjs` „Schnellsuche (Strg+K)“ scheitert auch auf unverändertem main `80631ef` (Bestand, nicht GEN-02).
- Sichtprüfung der neuen Vorschauen in Headless-Chromium (Kathedrale, Treppenauge, Handelshafen, Burgtor, Holländermühle, Schlossbrunnen, Marktflecken, Burg mit Torhaus).
- Grenzen: nicht im Spiel abgenommen; Wasser im Hafen nicht enthalten, Brunnenwasser nicht als Item gezählt.
## BUILD-05 Bauwelt-Anlagen · 01.11.2026 · Claude

- Neu `tests/unit/catalog/anlagen.test.mjs` (12 Fälle) gegen den echten mitgelieferten Gebäudebestand: alle 11 Anlagen ohne Blocker, ohne Voxelkonflikte, ohne Abstandsbefunde und exportierbar; Hauptweg-Fugen vollständig verbunden; feste Version bleibt trotz neuer Version 2.0; Tausch hält die aktuelle Version des neuen Bauteils fest; fehlende Version sperrt nur gewählte Bereiche; Verschieben erzeugt echte Voxelkonflikte, die Übernahme verlangt Bestätigung; Einfügen in bestehendes Projekt als ein Rückgängig-Schritt, veraltete Vorschau abgelehnt. 12/12 bestanden.
- Neu `tests/e2e/anlagen.e2e.mjs` (2 Fälle, lokales Chromium): Bauwelt-Link öffnet den Planer, Vorschau/Verschieben speichern nichts (IndexedDB direkt gelesen), Konflikt sperrt die Schaltfläche, Abwählen/Tauschen/Anlegen mit vier Bauabschnitten, End-Außenposten neben bestehende Bauten eingefügt; 390 px ohne horizontale Überbreite. 2/2 bestanden.
- Sichtprüfung per Bildschirmfoto (1400 px): Übersicht mit 11 Vorschaukarten, Planer mit 3D-Ansicht, Lageplan, Prüfliste, Bereichen und Übernahme.
- Grenzen: Gelände und Hanglagen werden nicht geplant; keine Echtgeräteprüfung (QA-02).
- Volle Browserregression nach dem Fix: 73/74 (624,8 s), einziger Fehlschlag der Schnellsuche-Fall unten.
- Nach erneutem Rebase auf main `f8f21e1` (EDIT-02, GEN-02): `npm run check` 438 Node-Tests (437 bestanden, 1 übersprungen, Bestand); zuvor auf `46444f3` 423 Node-Tests. Volle Browserregression: der neue Bauwelt-Link teilte zunächst die Klasse `build-theme-browse` mit dem Katalog-Link und machte vier Selektoren in `build-themes`/`ui-acceptance` mehrdeutig; eigene Klasse `build-theme-anlage`, danach build-themes 2/2, ui-acceptance 4/4, anlagen 2/2. `shell.e2e.mjs` Fall 1 (Strg+K-Schnellsuche) scheitert identisch auf unverändertem main `46444f3` (separater Worktree geprüft), nicht durch BUILD-05 verursacht.
## WORLD-IMPORT-01 Weltimport und Geländeprüfung · 01.11.2026 · Claude

- Ausgang main `61d8e9a`, vor dem Push auf `80631ef` (EDIT-01/02, Mod-Downloadseite) rebased; Konflikte in Router, Hauptansicht, Projektreitern, Symbolen, Domain-Index und `AssetSourceFormat` beidseitig erhalten.
- `node --test tests/unit/formats/anvil.test.mjs`: 14/14. Unabhängige Fixture `scripts/fixtures/make_region_fixture.py` (eigener NBT-Schreiber, eigene Packung, eigener LZ4-Kodierer und XXH32): 26.x-, 1.21- und 1.17-Chunks, zlib/GZip/LZ4/ohne, unfertiger und fehlender Chunk, leere Regionsdatei; jede Zelle des Bereichs gegen die erwarteten Zustände geprüft (über 100 000 Zellen), BlockEntities mit Truheninhalt, Kopf-/Überlappungs-/Koordinatenfehler, beschädigte Daten → unlesbar statt Luft.
- Lastszenario im Test: 256 Chunks, 256 × 256 × 256 = 16 777 216 Zellen in rund 0,6 s (Node, Container).
- `node --test tests/unit/world/terrain.test.mjs`: 6/6 mit handberechnetem Gelände (Hindernis, ersetzbares Gras, Wasser, Loch mit Unterbautiefe, unbekannte Spalte, außerhalb des Rasters, Y-Vorschlag).
- `scripts/mod/test_world_import_real.sh` (nicht Teil von `npm run check`; Java 25, Netz zu Mojang): offizieller 26.3-Server (SHA-1 `33680f5f…`), drei Welten mit `region-file-compression` deflate, lz4 und none, Blöcke per Befehl gesetzt und gespeichert. Alle drei: DataVersion 5023, 286 Blöcke, Treppe/Truhe/Schild/Laterne mit vollständigen Zuständen, Truheninhalt erhalten, Fläche über Chunkgrenze. Befund dabei: 26.x speichert Standardzustände nur als ID; Standardwerte kommen aus dem Datengenerator-Bericht (`blocks.json` SHA-256 `7a0de8aa…`).
- `node --test tests/e2e/world-import.e2e.mjs`: 3/3 (1400 px und 390 px: Dateien wählen, Bereich in der Übersicht ziehen, 274 bzw. 18 Blöcke ohne Gelände, Speichern in die Bibliothek, kein waagerechtes Scrollen; Gelände-Reiter ohne Weltlage und nach Platzierung).
- Grenzen: keine Prüfung an Philipps eigener Welt oder einem Modpack-Server, keine echten Geräte; Entities werden nicht übernommen.
- Kopfzeile: Der fünfte Hauptmenüpunkt „Weltimport“ führte bei 1400 px zu Überbreite (Bauwelten-/Generatoren-Test). Stufen in `shell.css` angepasst (Versionsanzeige ab 1680 px aus, Suchtext ab 1460 px, kompakte Navigation ab 1340 px, Symbole ab 1100 px aus, schmale Abstände ab 900 px); 1920 bis 761 px und 390 px ohne Überbreite nachgemessen. `shell.e2e.mjs` erwartet jetzt fünf Hauptmenüpunkte.
- `npm run check`: bestanden (441 Node-Tests, 1 übersprungen). `npm run test:e2e`: 77/79, danach die betroffenen Dateien erneut 12/13. Verbleibender Fehler „Schnellsuche (Strg+K)“ tritt identisch auf unverändertem origin/main `80631ef` auf (separater Worktree geprüft) und ist nicht Teil dieses Blocks.
## BACKUP-02 · 01.11.2026 · Sicherungsstand und Abschnittsstände · Claude

- Neu `tests/unit/data/backup-reminder.test.mjs` (9 Fälle): Belege aus dem Dateiinhalt, Speicherrevision ohne Einfluss, Hinweis vs. fällig nach 7 Tagen, neues Projekt sofort fällig, Projekt- und Gesamtsicherungen, entfernte Projekte, eigene Bauteile, Prüfen per Prüfsumme, Protokollvalidierung und Grenze 40, `MemoryRepository`; Stände einfrieren (Nummern, Sicherungsrundreise), jede Abweichungsart inkl. von früherem Abschnitt übernommener Schritte, Zurücksetzen reproduziert den Fingerabdruck exakt, Undo, Sperre bei fehlender Version, Kopie als Projekt mit ehrlichen Haken, Löschen.
- Neu `tests/e2e/backup-reminder.e2e.mjs` (3 Fälle, lokales Chromium 1400/390 px): Erinnerung ohne Cloudbehauptung, „Gesamtsicherung herunterladen“, Datei prüfen (gültig und manipuliert), Projektkopf-Chip, Neuladen; Einfrieren, Warnung im Abschnittseditor, Abweichung, Zurücksetzen mit Vorschau, entfernter Abschnitt wiederfinden und zurückholen, Stand als eigenes Projekt. 3/3 bestanden. Sichtprüfung hell und am Handy per Bildschirmfoto.
- Gesamtlauf `npm run test:e2e` zuerst 73/75: Das Erinnerungsbanner war `role=status` und hieß „Jetzt alles sichern“, wodurch fremde Selektoren (`getByRole('status')`, Button „Alles sichern“, `.file-button input`) mehrdeutig wurden. Behoben in der App (Banner als benannte Region, Knopf „Gesamtsicherung herunterladen“, Prüffeld mit eigener Klasse), fremde Tests unverändert. Zweiter Gesamtlauf: 75/75 bestanden. Nach Rebase auf main `877d591` (EDIT-01/02, GEN-02, BUILD-05, GAME-05): `npm run check` 446 Node-Tests bestanden (1 übersprungen), `npm run test:e2e` 80/81; einziger Fehlschlag `shell.e2e.mjs` „Desktop: … Schnellsuche (Strg+K)“ (Dialog öffnet nicht nach Strg+K) scheitert identisch auf unverändertem main `877d591` und `d2f7af8`, nicht durch BACKUP-02. Nach erneutem Rebase auf `d2f7af8` (WORLD-IMPORT-01): `npm run check` 466 Node-Tests bestanden; backup-reminder, site, persistence, collections bestanden. Quellstand auf main gepusht (`412867f` und Folgecommit), Pages per `scripts/publish_pages.sh`.
- Umgebung: Playwright 1.64.1 brauchte `npx playwright install chromium` (Headless-Shell 1248). Keine Safari-/Echtgeräteprüfung.

## GAME-04 Paper-Plugin · 01.11.2026 · Claude

- `./gradlew :core:test` (9 Tests inkl. BridgeSession) und `./gradlew -PwithPaper :paper:build` (Paper-API 1.18.2, Release 17): bestanden.
- `scripts/mod/test_bridge_paper.sh` auf echten Paper-Servern: 1.18.2 (Build 388, Java 21), 1.20.6 (151), 1.21.4 (232), 1.21.11 (132), 26.3 (236, Java 25) jeweils bestanden: 148 Zellen aus der Serverwelt gelesen, 146 korrekt, genau der präparierte falsche und fehlende Block erkannt; Baustelle nach Neustart nicht geladen, 2 Chunks vom Plugin nachgeladen; Aufnahme in nie erzeugtem Gelände vollständig „nicht aufgenommen“, keine Regionsdatei erzeugt; keine Plugin-Warnung im Serverprotokoll.
- Grenzen: Spielerbefehl `anker hier` und Rechteprüfung nur manuell (Servertest läuft über die Konsole); Spigot ohne Paper und Folia ungeprüft bzw. nicht unterstützt; Abnahme auf Philipps Server offen.
- Download (GAME-04-S03): `npm run check` bestanden (439 Tests, 438 bestanden, 1 übersprungen; Architektur, Roadmap, Typen, Build, Doku). `npm run test:e2e`: 76/78; `mod-download.e2e.mjs` bestanden inkl. Paper-Auswahl für eine ältere Version, Serveranleitung und teilbarem Link. Nicht bestanden: `shell.e2e.mjs` Schnellsuche Strg+K (scheitert in diesem Container auch ohne diese Änderung, siehe GAME-02-S05) und einmal `snap.e2e.mjs` (Ziehen im 3D-Bild; zwei Wiederholungen bestanden, wackliger Test).

## QA-03 · Wacklige Browsertests stabilisiert · 01.11.2026 · Claude

- Ausgangslage: gelegentliche Ausfälle auf main in `shell.e2e.mjs` (Schnellsuche Strg+K), `stability.e2e.mjs` (Systemcheck), `editor.e2e.mjs` (Ziehtests); im eigenen Lauf zusätzlich `snap.e2e.mjs` (3D-Ziehen) und nach Rebase auf d2f7af8 dauerhaft der Suchknopf in `shell.e2e.mjs`.
- Ursachen und Behebung (kein Test abgeschaltet, keine Zeitgrenze erhöht): Strg+K vor dem Laden der lokalen Daten ging verloren (App: Anfrage wird gemerkt); Systemcheck-Test las vor dem Nachladen von `deployment.json` (Test wartet auf Quellstand); Ebenenraster wurde vor dem Einschwingen des ResizeObservers vermessen (Test: `gridGeometry` liest in einem Frame nach Stillstand) und Pinselstriche lasen veralteten Zustand (App: Ref); 3D-Ansicht im Projekteditor wurde bei jeder Worker-Neuberechnung neu aufgebaut (App: letzte Welt bleibt sichtbar); Suchknopf verlor unter 1460 px seinen zugänglichen Namen (App: `aria-label`).
- `npm run test:e2e` (Chromium headless, Pages-Build) nach Rebase auf fd22da6: drei Läufe hintereinander je **84/84 bestanden**, 0 übersprungen. Gezielte Wiederholungen: Editor/Schnellsuche/Systemcheck 7× grün (davon 4× mit `--test-concurrency=3`), Snap/App/Viewer/Editor/Projektberechnung 3× grün.
- Grenzen: nur Chromium im Linux-Container (Playwright-1248-Verweis auf installiertes 1243), keine echten Geräte.

## GAME-05 · NeoForge- und Forge-Brücke · 01.11.2026 · Claude
- Kern: `BridgeSessionTest` (3 Fälle: kompletter Ablauf mit Datei und gespeichertem Anker, Dimensionswechsel/Abbruch/Konsole ohne Blickziel, Serveraufnahme in anderer Welt) plus bestehende Kerntests über `scripts/mod/test_bridge.sh` bestanden (Brückenprüfung 242 Zellen, Python-Leser bestätigt).
- Build: `./gradlew -PwithNeoForge -PwithForge :core:test :neoforge-26.3:build :forge-26.3:build` grün (NeoForge 26.3.0.100 über ModDevGradle 2.0.148, Forge 26.3-66.1.2 über ForgeGradle 7.0.40, JDK 25).
- NeoForge im echten Minecraft-26.3-Client: `scripts/mod/test_bridge_ingame_forge.sh neoforge` bestanden. Testmod legt über den normalen „Welt erstellen“-Bildschirm eine flache Testwelt an, baut den exportierten Plan mit einem falschen und einem fehlenden Block, schaut auf den Ursprungsblock und schickt `/bauplaner plaene|plan|anker hier|status|scan` über `ClientPacketListener.sendCommand` (dort fängt NeoForge Client-Befehle ab). Website-Vergleich: 148 Zellen, 146 korrekt, genau 1 falscher und 1 fehlender Block an den erwarteten Stellen.
- Forge im echten Client: Mod und Testmod laden ohne Fehler, Client-Ticks laufen an, danach bleibt der kopflose Client (weston, Mesa llvmpipe) im Ladebildschirm stehen; mit Vsync bzw. Forges Frühfenster blockierte zuvor schon das Bildtauschen. Kein Fehler der Mod sichtbar, Spielprüfung aber **offen**; die Forge-.jar wird deshalb noch nicht auf `#/mod` angeboten.
- Grenzen: Entwicklungsstart (gleiche Klassen wie die .jar, Mojang-Namen auch im Produktivbetrieb), kein Start über einen echten Launcher, kein Mehrspieler-Server.
- Gesamtprüfung nach Rebase auf den Paper-Stand (GAME-04): `npm run check` grün (468 Tests, 467 bestanden, 1 übersprungen). `npm run test:e2e` 82/84: `mod-download.e2e.mjs` mit NeoForge-Auswahl bestanden; `snap.e2e.mjs` (Ziehen im Editor) einzeln wiederholt bestanden; `shell.e2e.mjs` „Schnellsuche (Strg+K)“ scheitert wie bereits bei EDIT-01/02 auf unverändertem main dokumentiert, nicht von GAME-05 berührt (Thread „Wacklige Browsertests stabilisieren“ kümmert sich).
- Nach erneutem Rebase auf QA-03 (`0a5a01b`): `npm run check` grün (467 bestanden, 1 übersprungen), `npm run test:e2e` **84/84**.

## EDIT-03 · Werkstatt vertieft · 02.11.2026 · Claude

- Neu `tests/unit/editor/editor-patterns.test.mjs` (9 Fälle): `cellNoise` deterministisch und gleichverteilt; Mischung mit Gewichtsanteilen, gleicher Würfelwert ⇒ gleiche Zellen, Lücken (`keep`); Verlauf je Achse mit handgezählten Stufen, Umkehr, weicher Übergang nur an Grenzen, radial; Schachbrett/Streifen auch bei negativen Koordinaten; Ersetzen mit Muster behält Ausrichtung; alle Vorlagenblöcke im Register mit gültigen Zuständen; Bögen (Kämpfer, Scheitel, freie Öffnung, Symmetrie, flächig verbundenes Band, Pfosten, Tiefe, Z-Richtung), Pyramide/Walmdach/Kegel/Mauerzug mit Handzählung; eingebaute Schablonen gültig, vier Drehungen = Identität, Tür dreht nach Osten, Rundreise Schablone → Entwurf → Nutzlast → Zwischenablage.
- Neu `tests/e2e/workshop-tools.e2e.mjs` (2 Fälle, Chromium 1400/390 px): Mauerzug mit „Alte Steinmauer“, Strg+Z/Y, Bogen über Taste O, Schablone „Tür mit Rahmen“ mit Vorschau und Maßanzeige, R dreht, Setzen; Strg+A/C, Entf, Rückgängig, Ebenenübersicht, G-Schnitt, ?-Übersicht; eigene Schablone speichern und laden; Ersetzen mit „Verwittern“ trifft nur einen Teil. Handy ohne waagrechtes Scrollen. Sichtprüfung per Bildschirmfoto.
- `editor.e2e.mjs`: nur der Selektor der Quaderform auf die neue Beschriftung „Quaderform“ umgestellt (das Werkzeugfeld enthält jetzt auch das Musterfeld).
- `npm run check` grün (477 Tests, 476 bestanden, 1 übersprungen). `npm run test:e2e` **86/86** auf main `7c4e95a` plus EDIT-03.
- Grenzen: nur Chromium im Linux-Container (Playwright-1248-Verweis auf 1243), keine Spielprüfung der Schablonenzustände, keine echten Geräte.
## UPDATE-01 · Kontrollierte Versionsupdates · 02.11.2026 · Claude

- `node --test tests/unit/core/updates.test.mjs`: 10/10 bestanden (Updatequellen ohne fremde lokale Änderungen, Dreiwege-Patch mit beiden Regeln und pivotbezogener Ausrichtung, Folgenplan inkl. gelöster Verbindung und prüfbedürftiger Schritte, ein Rückgängig-Schritt, Rückkehr, Einfrieren, Validierung, Katalogzustellung über `seedSamples` mit MemoryRepository, neueste Version ohne lokale Änderungen in Bibliothek/Katalog).
- `node --test tests/e2e/updates.e2e.mjs` (Chromium headless, Pages-Build): 2/2 bestanden, 1400 px und 390 px ohne waagerechtes Scrollen.
- Gesamtlauf nach Rebase auf main `83f95c0` (inkl. EDIT-03): `npm run check` grün (487 Tests, 486 bestanden, 1 übersprungen; Architektur, Roadmap, Typen, Build, Doku). `npm run test:e2e` **88/88** bestanden.
- Grenzen: nur Chromium im Linux-Container, keine Echtgeräte; Folgenberechnung großer Projekte nicht gemessen.
## GAME-07 · Mod 2.0 Hologramm (Fabric 26.3, 0.2.0) · 02.11.2026 · Claude
- `./gradlew :core:test :mod-core:test` grün; `mod-core` 7 JUnit-Fälle (Zustände parsen/sortieren, Vergleichsregeln wie `gameCheck.ts`, Positionen drehen/spiegeln samt Rückweg, Zustände drehen/spiegeln inkl. Schienen, Türen, Treppen, Kisten, Banner, Redstone, Planlesen aus Website-Format, Live-Abgleich, Platzierungsspeicher).
- `scripts/mod/test_bridge_ingame.sh` (echter 26.3-Client) bestanden: Aufnahme wie bisher (146/148, 1 falsch, 1 fehlt), danach Hologramm am angeschauten Block, `fortschritt` „98 % · richtig 146 · fehlt 1 · falsch 1 · Zustand 0 · nicht geladen 0“, Fehlerfinder zeigt den Diamantblock, Server setzt den fehlenden Block → ohne Befehl „fehlt 0“, gedreht 18 %, zurückgedreht wieder 99 %, `platzierung.properties` geschrieben, Taste J öffnet das Planmenü; Bildschirmfotos geprüft (rote Kiste, violetter Rahmen/Strahl, weißer Planrahmen, HUD).
- Gleicher Test als Produktionsstart mit allen Mods aus Philipps Modpack (`BAUPLANER_MODPACK_MODS`, u. a. Sodium 0.9.3, Iris 1.11.7, Xaero, Simple Voice Chat, REI, Distant Horizons) bestanden. Gefunden und behoben: Standardtaste B war in Xaero „Wegpunkt“, H/N in Simple Voice Chat belegt → Standard jetzt J / Komma / Punkt / Einfg; HUD vom Minikarten-Eck nach rechts verlegt.
- Grenzen: Shader nicht eingeschaltet (Iris geladen, ohne Shaderpack), kein Mehrspieler-Server, Geisterblöcke als farbige Kisten (noch keine Blocktexturen).


## BUILD-06 · Bauführung im Spiel · 02.11.2026 · Claude
- `tests/unit/building/build-run.test.mjs` (9 Fälle): Rechtecke decken jede Schrittzelle genau einmal mit geplantem Zustand ab, Zeilenverschmelzung und Zustandswechsel, Anker = Weltlage bzw. Aufnahme-`WorldAnchor`, Packliste = Material-Tab-Summe mit Kisten zu 27 Plätzen in Reihenfolge des ersten Bedarfs und Lagerverbrauch, Bautempo-Validierung und Rückgängig, Bautage (jeder offene Schritt genau einmal, Budgets, Abschnittsreihenfolge, Lager über Tage, übergroße Schritte), Haken je Tag, Textzettel, Nacharbeitsliste und Spielstatus je Tag.
- `tests/e2e/build-run.e2e.mjs` (Chromium 1400 px und 390 px): echte Aufnahme aus exportierter Revision mit `WorldAnchor`, Anker übernehmen, Weltkoordinaten in der Schichtführung, Bautempo 100 ⇒ mehrere Bautage mit gleicher Blocksumme, Nacharbeit mit falschem Block, bestätigte Schritte eines Tages abhaken, Tagesziel, Bauzettel in Druckmedienemulation (nur Zettel sichtbar), Textdownload, Baumodus abhaken und weiter, kein waagerechtes Scrollen, Ansicht nach Neuladen erhalten.
- Gesamtprüfung: `npm run check` grün (477 Tests, 476 bestanden, 1 übersprungen). `npm run test:e2e` **85/85** bestanden.
- Grenzen: kein echter Drucker, keine echten Geräte (QA-02), kein Spieltest im Client (die Aufnahme ist aus dem Plan abgeleitet wie in GAME-01).


## TERRAIN-01 · Gelände in Weltkarte und Anlagen · 02.11.2026 · Claude
- Kern: `tests/unit/world/terrain-survey.test.mjs` 9/9 bestanden (echte Regionsdatei aus `scripts/fixtures/make_terrain_fixture.py` mit Hang, Teich, Baum und Gras gegen Handwerte und gegen die dichte 3D-Probe; Dateiformat/Hash; `terrain.set` mit Rückgängig, Sicherung, Wiederherstellung, Datencheck; Erdarbeiten von Hand gezählt; 3D-Anzeigezellen; Eingangsregel; alle 69 Katalogplätze mit Tür zeigen zum Weg; Terrassen/eine Ebene mit verbundenen Wegmodulen; Platzsuche).
- Browser: `tests/e2e/terrain.e2e.mjs` bei 1400 und 390 px bestanden (Bauplatz aus Regionsdatei, Weltkarte mit Gelände 2D/3D, Anlage „Dorf mit Hof“ auf dem Hang mit flachstem Platz und Moduswechsel, Einfügen, Erdarbeiten-Schätzung, Reiter „Gelände“, kein waagerechtes Scrollen, keine Konsolenfehler).
- Gesamtprüfung nach Rebase auf BUILD-06 (`a132275`): `npm run check` grün (505 Tests, 504 bestanden, 1 übersprungen), `npm run test:e2e` **91/91**.
- Nicht geprüft: Philipps eigene 26.3-Welt, echte Geräte.

## GAME-07 · Download-Prüfung gegen „EOCD nicht gefunden“ · 02.11.2026 · Claude
- Anlass: Modrinth App meldete beim Hinzufügen der 0.2.0-.jar „EOCD nicht gefunden“. Live-Datei von Pages geladen: 95 726 Bytes, SHA-256 wie Build, `unzip -t` und Python-`zipfile` fehlerfrei, EOCD am Dateiende, Verzeichnis passt → auf dem Server korrekt; bei Philipp kam eine abgeschnittene/falsche Datei an.
- Neu: `checkJarBytes` (releases.ts) prüft wie ein Launcher Größe, ZIP-Anfang, EOCD, Verzeichnis und Loader-Metadaten (`fabric.mod.json`, `neoforge.mods.toml`, `mods.toml`, `plugin.yml`). Die Download-Seite lädt die .jar, prüft zusätzlich SHA-256 und speichert nur geprüfte Bytes; sonst Meldung „Nicht gespeichert …“. `release_mod.mjs` bricht bei fehlerhafter .jar ab.
- `tests/unit/mod/mod-releases.test.mjs`: jede angebotene .jar besteht die Prüfung; abgeschnittene Datei, HTML-Seite, beschädigtes Verzeichnis und fehlende Metadaten werden erkannt. `mod-download.e2e.mjs` (1400/390 px): gespeicherte Datei hat genau die gelistete Größe, Statusmeldung „Geprüft und gespeichert“; abgeschnittene Antwort wird abgelehnt und nicht gespeichert.

## GAME-07 · Stufe 2: Texturen, Materialliste, Ebenen (Fabric 26.3, 0.3.0) · 02.11.2026 · Claude
- `./gradlew :core:test :mod-core:test` grün (mod-core 8 Fälle, neu: Materialliste mit Tür/Doppelstufe/falschem Block, Ebenenzählung, Fehlerfinder je Ebene).
- `scripts/mod/test_bridge_ingame.sh` im echten Client und als Produktionsstart mit Philipps Modpack (Sodium 0.9.3, Iris 1.11.7, Xaero, Voice Chat, REI, Distant Horizons …) bestanden: alles aus 0.2.0, dazu `/bauplaner material` → „1 Blöcke in 1 Sorten, 1 × minecraft:cobblestone“, Ebene = Ankerhöhe → Fehlerfinder zeigt den Diamantblock, Ebene darüber → „Keine Fehler“, Teilabriss der Mauer (Server-`fill`) → 31 offen (24 Steinziegel, 6 bemooste, 1 Bruchstein) und texturierte Geisterblöcke im Bildschirmfoto (auch mit Sodium/Iris), Num 7 öffnet die Materialliste.
- Grenzen: Shader nicht eingeschaltet, kein Mehrspieler-Server, Shulker-Inhalte nicht gezählt, Blöcke ohne Modell (Kisten, Schilder) weiter als Kiste.

## FORMAT-02 · Echte Litematic-Dateien aufschlüsseln · 02.11.2026 · Claude
- Fünf echte Dateien von Philipp (2× Litematica 1.21, 3× Litemapy-Konverter; nicht im Repository) lokal mit `importStructure` gelesen: vorher 4 Fehlschläge („Erwartet GZip“ bei drei unkomprimierten Dateien, Knotenlimit bei Olympus 164×184×189), jetzt alle gelesen; `TotalBlocks` stimmt jeweils mit den gelesenen Blöcken. Export jeder Datei mit `writeLitematic` und Rückimport zellgleich (Blockzustände, BlockEntities 158/158); vier Exporte vom Python-Leser `verify_litematic.py` als gültig bestätigt (Olympus: reiner Python-Leser nach >15 min nicht fertig, dort nur der TS-Rückimport). Olympus: Import 1,0 s (Node), Export 5,5 s, 402 kB.
- Browser (Chromium headless, Software-WebGL, Pages-Build): alle fünf in der Bibliothek importiert, gespeichert, Reiter 3D/Bilder/Ebenen geöffnet, keine Konsolenfehler. Olympus (952.911 Blöcke): Import bis 3D-Bild ~17 s, Speichern ~26 s, Bilder ~8 s, Ebenen ~10 s.
- `tests/unit/formats/litematic.test.mjs` 28/28 (neu: unkomprimiert/zlib gleich GZip, realworld-Fixture mit ferner Ecke/negativer Größe/TAG_End-Listen/Entity-Arten/Roundtrip, große Modelle ohne Luftzellen, Zellgrenze, Metadata-Abweichung, Software, Einzelblock). `tests/unit/building/blocks.test.mjs` 11/11 (alte IDs chain/grass). `tests/e2e/litematic.e2e.mjs` 4/4 (neu: unkomprimierte Datei mit Aufschlüsselung, Autor vorbelegt).
- Gesamtprüfung: `npm run check` grün (509 Tests, 508 bestanden, 1 übersprungen), `npm run test:e2e` **92/92** (650 s).
- Grenzen: Export nicht im Spiel mit Litematica geladen; freie Entities (Gemälde, Rahmen) werden weiter nicht dargestellt und nicht exportiert; große Modelle übernehmen Luft nicht als Zellen.

## GFX-01 · Grafik: Licht, Schatten, Spawnprüfung, Abschnitte · 02.11.2026 · Claude
- `tests/unit/web/graphics.test.mjs` 8/8: Leuchtwerte (fest, `lit`, Kerzen, Seegurken, Anker, Lichtblock, Kupferbirne), Ausbreitung (Fackel −1 je Schritt, geschlossener Raum ohne Himmelslicht, Wasser dämpft, Dachöffnung), Eckschatten, Licht je Eckpunkt und Flächenhelligkeit, Spawnflächen (dunkler Raum 25 tagsüber + Dach 49 nachts, Fackel, niedrige Decke, Glas/Laub), 32³-Abschnitte (gleiche Flächenzahl wie ein Mesh, Reihenfolge egal, Änderung/Markierung/Ursprung/Licht über Abschnittsgrenze, inkrementell gleich neu gebaut), Sortierung durchscheinender Flächen, Einstellungen und Sonnenbahn.
- `tests/e2e/graphics.e2e.mjs` 3/3 (Chromium, Software-WebGL): Tag/Sonne/Nacht/Flach mit Helligkeitsvergleich der Bildschirmfotos (Schatten dunkeln ab, Nacht dunkler), Uhrzeit, Speicherung über Neuladen, Spawnprüfung mit Zählern, Umschalten ohne Geometrie-Neuaufbau, Dorfplatz mit mehreren Abschnitten und Picking.
- Messung: Großmodell 605.568 Blöcke `buildBlockMesh` ~5,5 s (vorher ~4,3 s, Budget 15 s); synthetisch 1,11 Mio. Blöcke Abschnittsaufbau ~9 s, nach Änderung eines Blocks ~2,4 s (161/162 Abschnitte übernommen).
- Gesamtprüfung: `npm test` 517 (516 bestanden, 1 übersprungen), `npm run test:e2e` **95/95** (875 s).
- Grenzen: nur Software-WebGL in Chromium; echte GPUs, Firefox/Safari, Handy-Leistung mit Schatten und Abgleich mit Spielbildern offen.

## BLOCK-01 · Echte Blocklogik 26.3 · 02.11.2026 · Claude
- Fakten aus dem offiziellen 26.3-Server (SHA-1 `33680f5f…`, DataVersion 5023) per Datengenerator und Prüfprogramm (Java 25), nicht im Repository außer den verdichteten Fakten.
- `tests/unit/building/block-logic.test.mjs` 9/9: Fakten gegen Bericht, Stützflächen/Halt/Items/Stapel, alle 3.060 Spielvektoren (Verbindungen und Halt), Wasser/Kaktus/Gerüst, Platzierprüfung, Verbinden idempotent, Werkstatt-Schritt, Bauanleitung mit hängender Laterne, Material.
- Lokal 42.000 Vektoren (2.000 je Verbindungsfamilie, 16.000 Halt): alle gleich außer 9 Feuer-Fällen (nicht nachgebildet) und 6 Pilz-Fällen (Prüfwelt hell; der Planer nimmt Pilze im Dunkeln als haltend an).
- Katalogprüfung (339 Versionen, 136.863 Blöcke, 246 ms): 140 Blöcke ohne Halt, 1.239 abweichende Verbindungen, 1 fehlende Hälfte.
- `tests/e2e/block-logic.e2e.mjs` 3/3: Spielprüfung in der Bauanleitung (1400/390 px, kein Querscrollen), Zaunreihe in der Werkstatt prüfen, verbinden, erneut prüfen, rückgängig.
- Grenzen: keine Abnahme im echten Spiel; Stützausnahmen über ~2.000 Nachbarzustände gemessen.

## GAME-07 · Stufe 3: Platzierhilfe (Fabric 26.3, 0.4.0) · 02.11.2026 · Claude
- `./gradlew :mod-core:test` grün (9 Fälle, neu: Platzierhilfe-Urteil mit Treppenform/Wandfackel/geplanter Luft, Modi, Wegauswahl und Hinweistext ohne unnötige Richtung/Neigung).
- `scripts/mod/test_bridge_ingame.sh` im echten Client und mit Philipps Modpack: Klicks über den echten Klickweg `MultiPlayerGameMode.useItemOn`, Server entscheidet wie immer. Bruchstein statt Eichenstamm → nicht gesetzt, Stamm aus Schnellleistenplatz 2 gewählt; Stamm seitlich angeklickt → nicht gesetzt, Hinweis „Auf den Block darunter klicken“; so geklickt → aufrecht gesetzt; Abbauen des richtigen Planblocks verhindert, nach `/bauplaner platzierhilfe warnen` möglich. Bildschirmfoto `platzierhilfe.png` mit Fadenkreuz-Zeile.
- Grenzen: kein Mehrspieler-Server mit Anti-Cheat geprüft (die Mod sendet nur normale Klicks und Schnellleistenwahl), Zustände, die erst durch Nachbarn entstehen, werden nur gewarnt.
### 02.11.2026 – ARCH-02 Planmodell: Verweisgraph, gepackte Blockzellen, DB v4, Sicherungsformat 3

- Grundlage: main `0b20ed6` (Quelle `ec92349`, inkl. GFX-01 und BLOCK-01) plus dieses Arbeitspaket; Linux-Cloudcontainer, Node 24, Chromium Headless Shell 1248 (`npm run setup:browser`).
- `npm run check`: Architektur, Roadmap, strenge Typprüfung, Build, 539 Node-Tests (538 bestanden, 0 fehlgeschlagen, 1 übersprungen) und Dokumentationsprüfung bestanden. Neu `tests/unit/data/plan-model.test.mjs` mit 13 Fällen: handgerechnete Bytes, beliebige Zellreihenfolge/negative Grenzen/Indizes über 32 Bit, Ablehnung nicht exakt darstellbarer Zellen, beschädigte Daten, alle 339 mitgelieferten Versionen bitgenau (Inhaltsadressen unverändert, 10,6 MB → 0,26 MB), Sicherungsformat 3 inkl. Manipulation und unbekanntem Grundformat, Abschnittsstand-Version in Projektsicherung, `whereUsed`, Datencheck-Schweregrade.
- Browser: alle 38 E2E-Dateien einzeln nacheinander, 100 Tests bestanden, 0 fehlgeschlagen. Neu `tests/e2e/plan-model.e2e.mjs`: echte Datenbank Version 3 → Migration 4 packt in place (binär, Hash/ID gleich), Datencheck ohne Befund, Datenmodell-Karte; „Verwendet in“ nach Projektanlage. Angepasst, weil sich die Speicherform bewusst änderte: `asset-concurrency` (erwartet DB_VERSION 4), `stability` (beschädigt jetzt die gepackten Bytes statt der Zellliste; vorher hing der Test an der fehlenden Zellliste), `collections` (Download ist Format 3 mit Grundformat 2), `tests/unit/catalog/collections.test.mjs` (neueres Format ist jetzt 4).
- Gefundener und behobener Fehler während der Prüfung: unvollständige Altdatensätze (Version ohne Payload) ließen Migration 4 abbrechen; sie bleiben jetzt unverändert und werden von den Leseprüfungen gemeldet. Ein beschädigter gepackter Datensatz macht die Bibliothek nicht mehr unlesbar, sondern erscheint im Datencheck als beschädigt.
- Grenzen: keine Abnahme mit echten, lange gewachsenen Browserdaten auf Philipps Geräten (ARCH-02-S05); Safari/iPhone nicht geprüft (QA-02).

## GAME-07 · Download-Seite: Client-Mod und Server-Plugin getrennt · 02.11.2026 · Claude
- `tests/e2e/mod-download.e2e.mjs` (1400 px und 390 px): „Für mein Spiel“ ist vorausgewählt, Paper fehlt in der Client-Auswahl, Modrinth-Anleitung sichtbar; „Für einen Server“ zeigt nur Paper mit Serveranleitung, ein geteilter Paper-Link öffnet direkt die Serverwahl, zurück zur Client-Mod ergibt wieder die neueste Fabric-Version. Download-Prüfung wie bisher.
- Anlass: Philipp hatte das Paper-Plugin in sein Modrinth-Profil gelegt (latest.log: „Found 1 non-fabric mod: bauplaner-bridge-paper-0.1.0.jar“).
## MODEL-01 · 3D-Export OBJ/GLB/STL/3MF · 02.11.2026 · Claude
- `tests/unit/formats/model3d.test.mjs` 15/15: Wasserdichtheit und Volumen (Würfel, Raum gefüllt/hohl, Haus mit Treppen/Zaun/Tür/Glas/Fackel/Blume bei Feinheit 1/2/4), Kanten-, Eck- und Schachbrettreparatur, Aushöhlen/Füllen, lose Teile, Farbreduktion, Druckformen je Zustand (Platte, Treppe, Tür gedreht, Mauer; Pflanzen/Schienen ohne Form), Ansichtsnetz (Flächen, Glas getrennt, eingebackene Helligkeit, Lage), OBJ/MTL-Verweise, GLB-Aufbau (Chunks, Accessoren mit Grenzen, Textur, nur Y oben), STL-Rundreise mit Außennormalen, ZIP gegen App-ZIP-Leser, 3MF-Paket mit Farben je Dreieck.
- `tests/e2e/model3d.e2e.mjs` 2/2 (Chromium): Bauteil Fachwerkhaus → GLB, STL (Download unabhängig wasserdicht, längste Seite 100 mm), 3MF mit höchstens 4 Farben und Aushöhlen; Betrachter auf 390 px → OBJ-ZIP mit MTL, kein Querscrollen; Anlage zeigt den Export.
- Messung (Node): 64.912 Blöcke als 3MF gefüllt – Feinheit 1/2/4 ≈ 1/4/20 s, 0,16/0,72/2,9 Mio. Dreiecke, alle wasserdicht; Ansichtsmodell ≈ 0,5 s. Wasserdichtprüfung von Map-Schlüsseln auf Zeilenlisten umgestellt (2,9 Mio. Dreiecke: 20,7 s → 1,0 s).
- Gesamtprüfung: `npm run check` grün (541 Tests, 540 bestanden, 1 übersprungen), `npm run test:e2e` **100/100** (793 s).
- Grenzen: nicht in Blender/Cura/PrusaSlicer/Bambu Studio geöffnet, kein Testdruck, nur Chromium; Export läuft im Hauptthread.
## TERRAIN-02 · Landschaft gestalten · 02.11.2026 · Claude
- `tests/unit/world/terrain-design.test.mjs` 10/10: Start aus Aufnahme und ebenem Grund, Pinsel mit Handwerten (harte/weiche Kante, Einebnen, Glätten, Terrassen, Klippen abflachen, Höhengrenzen, unbekannte Spalten unberührt), Stile deterministisch mit Filtern, Eimerfüllung (Mulde, offener Rand), Wege (4-verbunden, Steigung ≤ 1, Breite, Damm), automatisches Bemalen, Einebnen unter Bauten (Erdarbeiten danach 0), Blöcke Zelle für Zelle mit expliziter Luft und Spielzuständen, geplantes Gelände, Dateiformat, `terrainDesign.set`, Sicherung mit beiden Originalen, Wiederherstellung, Datencheck.
- `tests/e2e/landscape.e2e.mjs` 2/2 (Chromium 1400 px und 390 px mit Touch): Bauplatz aus Regionsdatei, Anheben per Ziehen, Rückgängig/Wiederholen, Bemalen, Mulde graben und füllen, Weg legen, Ansichten, 3D, Speichern und Neuladen, Weltkarte mit geplantem Gelände, Anlage mit vorausgewähltem Ziel, Geländebauteil im Projekt mit Materialliste, kein Querscrollen.
- Gesamtprüfung nach Rebase auf ARCH-02 und MODEL-01: `npm run check` grün (`npm test` 564: 563 bestanden, 1 übersprungen), `npm run test:e2e` **104/104** ( Chromium 1243 per `PLAYWRIGHT_BROWSERS_PATH` als 1248 verlinkt).
- Grenzen: keine Abnahme in eigener 26.3-Welt, keine echten Touch-Geräte; Höhenkarte ohne Höhlen.
## EDIT-04 · Kreativwerkzeuge aus dem Planer-Vergleich · 02.11.2026 · Claude
- `tests/unit/editor/editor-creative.test.mjs` 18/18: Symmetriegruppen (1/2/4/8), Spiegelbilder auf Zellmitte und -grenze, vier Vierteldrehungen = Identität, Treppen nach Spiegeln/Drehen gegen `transformBlockState`, ungelöste Mod-Zustände gemeldet; Kurven durch alle Punkte, flächenverbunden, Wegbreite 3 exakt (30 Zellen), Mauerhöhe, Ring ohne lose Enden; Abtragen (8 Ecken), Aufbauen, Glätten (Spitze ab, Grube auf, Gras oben), Überziehen (nur auf Gras, Ausrichtung übernommen), Naturalisieren (Gras/3× Erde/Stein, Bauwerk bleibt), Oberflächenmaske 98/25/80; Lab, Grauverlauf, Bild mit Transparenz, Lage und reproduzierbarem Dithering.
- `tests/e2e/workshop-creative.e2e.mjs` 2/2 (Chromium 1400/390 px): gespiegelter Block, gespiegelte Kurve als ein Rückgängig-Schritt, Abtragen in der Auswahl, Naturalisieren, Farbverlauf als Muster, Oberfläche bemalen, PNG → Wollbild → Einfügen; kein waagrechtes Scrollen.
- Gesamtprüfung nach Rebase auf BLOCK-01 (ec92349): `npm run check` grün (544 Tests, 543 bestanden, 1 übersprungen), `npm run test:e2e` **100/100** (1152 s); nach Rebase auf ARCH-02/GAME-07 Stufe 3 (e4ba8b2): 557 Tests (556 bestanden, 1 übersprungen), **102/102** (1037 s); nach Rebase auf MODEL-01 (386fca4): 572 Tests (571 bestanden, 1 übersprungen), **104/104** (1044 s). Danach kam TERRAIN-02 (014a665) hinzu: erneut `npm run check` sowie Werkstatt-, Editor- und Landschafts-Browsertests (Ergebnis im Commit-Text), weil ein weiterer voller Lauf (17 min) wieder von neuen Pushes überholt würde. Chromium-Build 1243 über `PLAYWRIGHT_BROWSERS_PATH` mit Verweisen eingebunden (Playwright 1.64.1 erwartet 1248), ohne Teständerung.
- Grenzen: keine Spielprüfung gespiegelter Zustände (Türen, Truhen, Schienen); Firefox/Safari und echte Geräte offen.
## MAP-03/GAME-03 · Live-Karte mit Spielanbindung (Mod 0.5.0) · 02.11.2026 · Claude
- `tests/unit/world/worldplan.test.mjs` 6/6, `tests/unit/team/livelink.test.mjs` 5/5; `./gradlew :mod-core:test` grün (neu `LiveLinkTest`: Kopplung mit Code/Fehlversuchen, Token, Ursprung, Host, Grenzen, Fehlerantworten).
- `tests/e2e/livelink.e2e.mjs` (Chromium, 1400 und 390 px) gegen den Mod-Simulator `tests/e2e/modSimulator.mjs`: Bauplatz aufziehen, Projekt zuordnen, Rückgängig/Wiederholen, Weg mit drei Ecken, Punkt über Taste P, Messen, Neuladen behält den Weltplan; Verbinden über eigenen Port, falscher Code abgewiesen, Kopplung, Spielerbewegung, Gelände (Wasserspalte „aus dem Spiel“), Markierungen, „Ins Spiel senden“ (gzip-.schem, Lage der Karte), Hologramm-Fortschritt, „Lage aus dem Spiel übernehmen“, Trennen widerruft den Schlüssel.
- Echter Client: `scripts/mod/test_bridge_ingame.sh` allein und mit `BAUPLANER_MODPACK_MODS` (Philipps Modpack, voller JDK 25 für Distant Horizons) bestanden; neu Website-Verbindung über 127.0.0.1 mit den Lesern der Website geprüft (Kopplung, 403 für fremde Website, 401 ohne Kopplung, Status mit Spieler und Hologramm, 256 Spalten Gelände, ferner Chunk als nicht geladen, 2 Markierungen mit HUD-Hinweis, Plan direkt platziert).
- Gefundener Fehler: `ClientLevel.hasChunk` meldet auch nicht geladene Chunks (Platzhalterchunk). Jetzt `McCompat.loaded` (echter Chunk, nicht leer) für Gelände, Markierungen und den Live-Abgleich des Hologramms.
- Gefundener Fehler: `fetch(…, { targetAddressSpace: 'local' })` lässt Chrome Anfragen an 127.0.0.1 verweigern; richtig ist `'loopback'`.
- Grenzen: keine Abnahme auf Philipps PC (Browserfreigabe „lokales Netzwerk“ von https://freadeax.github.io), kein Mehrspieler-Server, nur Fabric 26.3.
## TERRAIN-02-S06 · Streu-Ebene (Bäume, Felsen, Pflanzen) · 02.11.2026 · Claude
- `tests/unit/world/terrain-scatter.test.mjs` 8/8: alle eingebauten Bauteile mit gültigen 26.3-Zuständen und dauerhaftem Laub, Determinismus (gleiche Regeln → gleiche Teile, anderer Startwert → andere), Dichte und Mindestabstand, keine Überschneidung; Regeln Stil/Hang/Höhe/Ufer, nie im Wasser, auf Wegen, an Bauten oder im gemessenen Bestand; Setzen von Hand mit Grund, Entfernen im Radius, erneutes Streuen behält Handteile; Teile folgen angehobenem Boden, überflutete Teile werden gezählt und ausgelassen; Blöcke im Geländebauteil (gültiger Payload, Felsen ersetzen das Gras, `skip` für Bauten), Weltkarte zeigt Kronen; Datei-Rundreise, alte Dateien ohne Streu-Ebene, ungültige Pläne abgewiesen; eigene Schablone gedreht samt `facing`, Kaktus mit freien Seiten.
- `tests/e2e/landscape-scatter.e2e.mjs` 2/2 (Chromium 1400 px und 390 px mit Touch): Bauplatz aus Regionsdatei, Mischwald streuen, erneutes Streuen identisch, Farn-Dichte 0, Eiche von Hand setzen, Teile wegziehen, Rückgängig, 3D, Speichern/Neuladen, Bauteil im Projekt mit Eichenlaub und -stamm in der Materialliste, kein Querscrollen.
- Gesamtprüfung vor Rebase: `npm run check` grün (601 Tests: 600 bestanden, 1 übersprungen), `npm run test:e2e` **110/110** (706 s, Chromium 1243 per `PLAYWRIGHT_BROWSERS_PATH` als 1248 verlinkt).
- Grenzen: keine Abnahme in Philipps Welt (Wuchs, Licht, Mobs zwischen Bäumen ungeprüft); Oberflächenstil wird am obersten Block erkannt; eigene Schablonen erscheinen nicht auf der Weltkarte.

## GAME-07 Stufe 4 · Mod 0.6.0 (NeoForge, Shader, Tool Switcher) · 02.11.2026 · Claude

- Build: `./gradlew -PwithFabric -PwithNeoForge :mod-core:test :fabric-26.3:build :neoforge-26.3:build` grün (JDK 25). Beide Jars über `release_mod.mjs` geprüft (EOCD, Loader-Metadaten).
- NeoForge im echten 26.3-Client: `scripts/mod/test_bridge_ingame_forge.sh neoforge` bestanden: Aufnahme (146/148 korrekt, 1 falsch, 1 fehlt), Hologramm (Fortschritt 98 % → 99 %, Drehen und zurück, Speichern), Fehlerfinder je Ebene, Materialliste (31 offen nach Teilabriss), Taste J und Num 7, Platzierhilfe über `Minecraft.startUseItem`/`startAttack` (beide falschen Klicks verworfen, Stamm aus der Schnellleiste, Abbauschutz, „warnen“), Website-Verbindung (Port-Befehl zeigt Code, Kopplung, Status, Gelände 256 Spalten, 2 Markierungen, Plan gesendet, Loader „neoforge“).
- Fabric im echten 26.3-Client: `scripts/mod/test_bridge_ingame.sh` bestanden, ebenso mit Philipps 25 Mods (inkl. Tool Switcher, Sodium, Iris, Jade, Xaero) und `BAUPLANER_SHADERPACK=ComplementaryUnbound_r5.9.3.zip` (Log: „Using shaderpack: ComplementaryUnbound_r5.9.3.zip“). Bildschirmfoto `geister.png` angesehen: fehlende Mauerblöcke unter dem Shader mit hellblauen Kanten klar von echten Blöcken unterscheidbar.
- Grenzen: kein Test auf Philipps PC und auf dem Paper-Server; Tool Switcher nur im Modpack-Lauf geladen, sein Werkzeugwechsel selbst wird nicht automatisch ausgelöst.
## BLOCK-02 · Katalog und Generatoren spielgerecht · 02.11.2026 · Claude
- `tests/unit/catalog/catalog-game.test.mjs` 6/6: alle 336 Katalog-Gebäude und 466 Generator-Fälle (Standard, Vorlagen, 8 Stile, 25 Würfelwerte, Bereichsenden je Generator) mit `checkPlacement(…, { ownSpace: true })`: 0 ohne Halt, 0 fallend, 0 halbe Blöcke, 0 Verbindungen anders als im Spiel, 0 ungültige Zustände, 0 Blöcke ohne 26.3-Fakten; `hangLanterns` (Kette bis zur Decke, stehend→hängend, ohne Decke unverändert, höchstens 8 Glieder), `ownSpace`, Kakao an Tropenholz.
- Vorher (main 1b1b08a): 140 Blöcke ohne Halt im Standardmodus, 208 im strengen Modus in 85 Gebäuden, 1.239 Verbindungsabweichungen, 152 `minecraft:chain` (unbekannt in 26.3); Generatoren Kirche, Hafen, Torhaus, Windmühle mit Fehlern.
- Angepasst: `catalog.test.mjs` (sechs der 16 klassischen Inhaltsadressen bewusst neu), `generators.test.mjs` (Pin-Hashes Kirche, Hafen, Windmühle zusammen mit erhöhter Version).
- Grenzen: keine Abnahme im echten Spiel (BLOCK-02-S06); Licht/Spawnfreiheit nicht Teil dieser Prüfung.

## MAP-04 · Weltbuilder (Löschen, Mehrfachauswahl, Kontextmenü, Rückgängig) · 02.11.2026 · Claude
- `npm run check` grün: 625 Tests (davon neu `tests/unit/world/worldbuilder.test.mjs` 7/7: Löschen mehrerer Einträge mit linearer Umkehrung auch bei 2000 Einträgen, `insert`, Auswahlgrenzen/Rahmen, Drehen/Spiegeln im Blockraster und umkehrbar, Duplizieren, Wegecken, Geländehöhe), Doku-Links gültig.
- `npm run test:e2e` 113/113 grün (Basis main 387fb4e), darunter `tests/e2e/worldbuilder.e2e.mjs` (1400 px: Entf + Strg+Z/Strg+Y, Rechtsklick-Menü, Löschen je Listenzeile, Rahmen-Auswahl, Pfeiltasten verschieben Einträge und Projekt in einem Schritt, Löschen samt „von der Karte nehmen“ und ein Rückgängig, Duplizieren, Drehen, Wegecke einfügen/löschen, Ebenen, Strg+A + Entf, Neuladen; 390 px Touch: Auswahlleiste, Löschen, kein waagerechtes Scrollen).
- Angepasst: `livelink.e2e.mjs` – Knopfnamen „Karte: Schritt zurück/wiederholen“ und Zeichenfläche vor dem Zeichnen in die Bildmitte scrollen (Auswahlleiste und Ebenenzeile machen die Seite höher).
- Grenzen: Langdruck-Menü nicht auf echtem Touch-Gerät geprüft; Abnahme durch Philipp offen (MAP-04-S06).

## PERF-04 · Schwere Berechnungen im Hintergrund · 02.11.2026 · Claude
- `tests/unit/core/background-jobs.test.mjs` 11/11: Spaltenübergabe verlustfrei mit gleicher Prüfsumme und Versiegelung, beschädigte Spalten/Limits abgewiesen, Abbrechen beim Zusammensetzen, `createPayload`/`cropPayload` unverändert, gemerkte Prüfsumme und gepackte Zellen nur für versiegelte Payloads, `validateConnectors` wie vorher, Renderer-Schnappschuss ergibt byte-gleiches 3D-Netz, Fortschritt von Netz und Export ohne Einfluss auf die Datei, Auftragsclient (Fortschritt, Ergebnis, Workerabsturz, fremde Antworten, Abbrechen, Zeitlimit).
- `tests/e2e/background-jobs.e2e.mjs` 3/3 (Chromium, 130.085 Blöcke): Import mit 3D-Ansicht aus dem Worker, Speichern, Datencheck nach Neuladen ohne Befund, STL wasserdicht; 3MF-Export und Import abbrechen (kein Download, nichts geladen); Update-Vorschau und Versionsvergleich über den Worker (Testschwelle 1).
- Messung 927.000-Block-Litematic (Chromium headless, Software-GL): Speichern 70,7 s → 18,1 s, Seitenblockierung zusammen ~102 s → 6,7 s; Import bis Bericht 15,8 s → 7,4 s.
- Gesamtprüfung vor Rebase: `npm run check` grün (604 Tests, 603 bestanden, 1 übersprungen), `npm run test:e2e` **111/111** in 43 Dateien. `tests/unit/tooling/pages.test.mjs` erwartet jetzt `assets/heavy.worker-*.js` statt `import.worker`.
- Nach Rebase auf main 838863c (BLOCK-02, Mod 0.6.0, Streu-Ebene): `npm run check` grün (618 Tests, 617 bestanden, 1 übersprungen), `npm run test:e2e` **113/113** in 44 Dateien. Nach Rebase auf ENTITY-01 (387fb4e; freie Entities laufen im Worker-Netz mit, Konflikte in `ThreeViewer.tsx`/`glShot.ts` mit beiden Seiten gelöst): `npm run check` grün (629 Tests, 628 bestanden, 1 übersprungen), `npm run test:e2e` **114/114** in 45 Dateien. Nach Rebase auf MAP-04 (915de96, nur Weltkarte): `npm run check` grün (636 Tests, 635 bestanden, 1 übersprungen), Browser `worldbuilder`, `worldmap`, `livelink`, `background-jobs`, `viewer`, `entities` 15/15.
- Grenzen: nur Chromium im Container; keine Abnahme mit Olympus auf Philipps Rechner; Bibliotheksstart und GPU-Upload weiter im Hauptthread.

## LIB-05 · Bibliothek im Stil der Vorlagen · 02.11.2026 · Claude
- `tests/unit/catalog/baustil.test.mjs` 6/6: Medianwerte der Wohnhäuser (≥ 30 % Nicht-Vollblöcke, ≥ 20 % umgedrehte Treppen, ≤ 50 % Fassade auf der Hauptebene, ≥ 20 Blockarten) und der Architektur (≤ 55 % Hauptebene, ≥ 25 % Detail); `pick` deterministisch und gewichtet; `house()` reproduzierbar mit Läden, Blumenkasten, Sturz/Knaggen/Traufkasten und rauchendem Schornstein; `pitchedRoof` mit Überstand und geschlossenem Giebel; Veredelung ändert keine Grenzen und entfernt keine Zelle.
- `tests/unit/catalog/catalog-game.test.mjs` weiter 0 Fehler über alle 336 Gebäude und alle Generator-Fälle (neue Entwürfe eingeschlossen).
- Angepasst: Inhaltsadressen der geänderten Klassiker (`catalog.test.mjs`), `PINNED` und Hausmaß mit Vorkragung (`generators.test.mjs`), Ensembles Marktdorf/Burg/Küstendorf/Wüstenaußenposten ohne Überschneidung.
- `npm run check` grün (641/641, Basis main e71b404), Browsertests 116/116 (angepasst: Kapelle 11 × 22 × 17 im Katalog, 3D-Export an der Villa statt am Fachwerkhaus, weil dessen Schornstein-Lagerfeuer als Teilblock die 100-mm-Kante nicht ganz erreicht; Bauversionen-Auswahl „Eiche“ exakt, da der Wachturm jetzt auch entrindete Eiche trägt).
- `worldbuilder.e2e.mjs`: Liste nach Strg+Z erst lesen, wenn die dritte Zeile gerendert ist (las vorher gelegentlich eine leere Liste).
- Sichtprüfung: isometrische Ansichten aller neu gezeichneten Gebäude (nicht im Repository).
- Grenzen: keine Abnahme im Spiel; Stadt, Küste, Epochen und Fantasy nur veredelt, nicht neu gezeichnet.

## LIB-05 Runde 2 · Fassadenbaukasten und Meisterstücke · 02.11.2026 · Claude
- `tests/unit/catalog/baustil.test.mjs` 9/9, neu:
  - Stadt im Median höchstens 62 % auf der Hauptebene (gemessen 56 %, vorher 77 %).
  - Jedes Meisterstück höchstens 50 % auf der Hauptebene, mindestens 30 Blockarten und mindestens 20 % umgedrehte Treppen.
  - `facade()` setzt Lisenen, Fensterbank und Gesims nur in freie Zellen, belegte Zellen und Entwurf bleiben.
  - `machicolations()` setzt Konsole, Brüstung und Eckstufe.
- `tests/unit/catalog/catalog-game.test.mjs`: weiter 0 Fehler über alle 343 Gebäude und alle Generator-Fälle.
- `npm run check` 644/644. Browsertests 116/116, zwei Tests angepasst: `app.e2e.mjs` und `snap.e2e.mjs` suchen das Beispiel „Eckturm“ jetzt über die Suche. Mit 343 Gebäuden steht es nicht mehr sicher auf der ersten Katalogseite.
- Sichtprüfung: isometrische Ansichten der überarbeiteten Gebäude und der Meisterstücke (nicht im Repository).
- Grenzen:
  - Keine Abnahme im Spiel.
  - Untergrundhallen, Interieur-Räume und Redstone-Technik sind nicht überarbeitet.
## GAME-07 Stufe 5 · Mod 0.7.0 (Bauabschnitte, Röntgensicht, Shulker) · 02.11.2026 · Claude
- `tests/unit/building/game-check.test.mjs`: Planexport trägt `SectionNames`/`SectionCells` (Zellen je Abschnitt, Plan ohne Abschnitte ohne Felder); `tests/unit/team/livelink.test.mjs`: Status mit `section`/`sections`, Abschnitt 300 und negative Zahlen werden abgelehnt.
- `mod-core` JUnit 10/10, neu `buildSectionsFilterEverything` (Filter aus Höhe und Abschnitt für Fehler, Zählung, Material).
- Spieltest NeoForge (`scripts/mod/test_bridge_ingame_forge.sh neoforge`), Fabric ohne Modpack und Fabric mit Philipps Modpack + Complementary-Shader (`BAUPLANER_MODPACK_MODS`, `BAUPLANER_SHADERPACK`) jeweils bestanden: Abschnitte „Turm“ (1 offen) und „Mauer“ (30 offen), Zeile „Abschnitt 2/2: „Mauer““, Röntgensicht an/aus, „Alle Bauabschnitte.“; Website-Verbindung mit Abschnittssummen (Turm 93/94, Mauer 24/54) und `POST /v1/section`. Bildschirmfoto `roentgen.png` unter Shader geprüft.
- Grenzen: keine Abnahme auf Philipps Paper-Server; Shulker-/Bündelinhalt nur durch Code und Sichtprüfung, nicht im Spieltest gezählt.
## PERF-04-S05 · Bibliotheksstart im Hintergrund · 02.11.2026 · Claude
- `tests/unit/catalog/library-start.test.mjs` 3/3: Worker-Start schreibt genau dieselben Bauteile, Versionen, Revisionen wie `seedSamples` (Versionen gepackt, Bytes übertragen) und liefert dieselben Kennwerte wie `buildCatalog`; Fortschritt nie rückwärts, höchstens 95 %; zweiter Start schreibt nichts, eigener Bau mit zwei Versionen bekommt nur für die neueste Kennwerte; veraltete Katalogangaben werden erneuert, Archivstand und Versionsliste bleiben; beschädigte gepackte Version stoppt den Start nicht.
- `tests/e2e/library-start.e2e.mjs` 2/2 (Chromium): Startbildschirm zeigt Schritt und Fortschritt, längste Blockade < 1,5 s, Bildschirm zeichnet weiter, alle Katalogeinträge gespeichert, Neuladen ändert keine Revision, Datencheck ohne Befund; Start ohne `Worker` und mit defektem Worker (Rückfall mit Warnung) ohne Fehler.
- Messung (Chromium headless, Long Tasks bis zum Katalog): Neuladen 4,6 s Blockierung (größter Block 2,8 s) → 0,8 s (0,12 s); mit eigenem 600.000-Block-Bau 6,7 s (3,3 s) → 0,5–0,8 s (0,26 s). Zeit bis zum Katalog unverändert ~5 s.
- `npm run check` grün (645 Tests, 644 bestanden, 1 übersprungen), `npm run test:e2e` **118/118** in 48 Dateien (Basis main 4178c7b).
- Nach Rebase auf main dd9d930 (LIB-05 Runde 2, Mod 0.7.0): `npm run check` grün (649 Tests, 648 bestanden, 1 übersprungen), Browser `library-start`, `background-jobs`, `catalog`, `persistence`, `updates`, `app`, `stability`, `collections`, `ui-acceptance` 28/28.
- Grenzen: nur Chromium; Katalog wird bei jedem Start im Worker neu erzeugt.

## EDIT-05 · Auswahl- und Formwerkzeuge · 02.11.2026 · Claude
- `tests/unit/editor/editor-region.test.mjs` 14/14: Materialfamilien, Zauberauswahl (Zustand/Block/Material/alle, Ebene, über Kanten, Grenze), Wachsen/Schrumpfen/Einpassen/Größe ändern, Quaderwerkzeuge nur auf der Zellauswahl, Verschieben/Drehen einer L-Zellauswahl mit gedrehten Treppen und exaktem Rückgängig, Leeren samt verankerter Ausstattung, Gemälde/Rüstungsständer beim Verschieben und Drehen eines Bereichs (Gemälde hängt danach an der gedrehten Wand), Zwischenablage/Schablone mit Ausstattung, Stapeln (auch diagonal, ohne Luft), Extrudieren heraus/hinein, Ellipsoid/Torus/Wendel (Symmetrie, Flächenverbund, Stufenrichtung, Begehbarkeit, deterministisch).
- `tests/e2e/workshop-region.e2e.mjs` 2/2 (Chromium 1400 px und 390 px Touch).
- Nach Rebase auf main 1ac08e9 (LIB-05 Runde 2), erneut geprüft nach Rebase auf 68773a6 (Mod 0.7.0, Bibliotheksstart im Worker): `npm run check` grün (659 Tests, 658 bestanden, 1 übersprungen), `npm run test:e2e` 117/118 in 47 Dateien; der eine Ausfall `worldbuilder.e2e.mjs` (Weltkarte, von EDIT-05 nicht berührt) bestand im Einzellauf 2/2.
- Grenzen: nur Chromium im Container; keine Abnahme durch Philipp und keine Spielprüfung (EDIT-05-S07).

## PERF-04-S07 · Katalogspeicher je App-Version · 02.11.2026 · Claude
- `tests/unit/catalog/library-start.test.mjs` 4/4 (neu Test 4): Katalogspeicher mit passendem Schlüssel liefert ohne Bauen exakt dieselben Bauteile, Versionen und Kennwerte; eigener Bau ergänzt nur seine Kennwerte und erneuert den Speicher; anderer Schlüssel, fehlende oder beschädigte Version, Text oder null → neu gebaut mit gleichem Ergebnis; ohne Schlüssel kein Speicher.
- `tests/e2e/library-start.e2e.mjs` 2/2: erster Start `built` mit 32-stelligem Schlüssel im meta-Speicher, Neuladen `cache`, Rückfall `direct`.
- Messung (Chromium headless): Neuladen bis zum Katalog 5,1 s → 1,0 s; mit eigenem 600.000-Block-Bau 3,2 s beim ersten Start danach, dann 1,0 s; Blockierung weiter ≤ 0,6 s gesamt.
- `npm run check` grün (650 Tests, 649 bestanden, 1 übersprungen), `npm run test:e2e` **118/118**. Nach Rebase auf main 951395f (EDIT-05): `npm run check` grün (664 Tests, 663 bestanden, 1 übersprungen), Browser `library-start`, `background-jobs`, `catalog`, `persistence`, `stability`, `workshop-tools`, `app` 21/21.


## BASE-01 Basisplaner · SPLIT-01 Gebäude herauslösen · 02.11.2026 · Claude
- `tests/unit/catalog/base.test.mjs` 10/10: Funktionen und Vorlagen gegen den echten Katalog; Verzauberungsstufe 15/15 am Zaubererturm, Bewässerung 80/80 am Weizenacker und 4/11 bei 11 Blöcken Entfernung; alle drei Vorlagen ohne Voxelkonflikt, jede Zone am Wegenetz, Abstand ≥ Wegbreite + 2 × Abstand, Wege nie durch Gebäude oder Wasser, Stege im Wasser, Land nie im Wasser, XP-Farm im Hinterland am weitesten vom Platz, deterministisch; Zonenwahl; Übernahme mit „Wege & Platz“ und Phasen; Einfügen mit Rückgängig und Veraltungsprüfung; ganze Starterbasis auf Gras zerlegt (Gebäude, 4 Felder, ein Wegenetz, Schmiede 95–110 % ihrer Blöcke, Bilanz Natur + Teile + Rest = alle Blöcke); aufgeteiltes Projekt ohne Konflikte mit jedem Block am alten Platz.
- `tests/e2e/base.e2e.mjs` 1/1 (Chromium, Port 4297): Basisplaner mit Abwählen, Tausch, freiem Bauplatz, Wasserseite West, Zusatzzone, Übernahme (Abschnitte, Wegenetz-Bauteil), Herauslösen an der Handelsscheune, 390 px.
- Grenzen: nur Chromium im Container; keine Abnahme mit Philipps eigenen Litematic-Basen; Küstenlinie als Wahl, nicht aus der Geländeaufnahme.



## LIB-05 Runde 3 · Innenräume, Untergrundhallen, Technik · 02.11.2026 · Claude
- `tests/unit/catalog/baustil.test.mjs` 12/12, neu:
  - `dressRoom()` setzt Pfosten, Sockelleiste, Deckenprofil und Bodenrand nur an geschlossenen Wänden; Möbel, Bodenmitte und offene Seite bleiben.
  - `innerRibs()` setzt Rippen nur in freien Spalten vor geschlossener Wand; Truhe und Türöffnung bleiben.
  - Bauernküche und Zwergenhalle tragen die neuen Bauteile.
- `tests/unit/catalog/catalog-game.test.mjs`: weiter 0 Fehler über alle Gebäude und Generator-Fälle.
- Sichtprüfung: Schnittansichten der Hallen und Räume (nicht im Repository). Die Skizzen-Farbtabelle kennt jetzt alle im Katalog benutzten Blockarten.
- Grenzen: keine Abnahme im Spiel.

## MAP-05 · Baustand aus dem Spiel auf der Live-Karte, Mod 0.7.1 · 02.11.2026 · Claude

- `npm run check`: Architektur, Roadmap, Typen, Build, Node-Tests (neu: `game-check.test.mjs` Ebenen/Kartenspalten/Schrittzählung, `livelink.test.mjs` Fähigkeitenliste), Doku.
- `mod-core`/`core` JUnit 31/31 (neu: gedrehter Baustand in Plankoordinaten, nicht geladene Chunks, Route `GET /v1/scan` mit Kopf und Freigabe).
- Browser: `tests/e2e/game-progress.e2e.mjs` gegen den Mod-Simulator (Abschnitt wählen, Baustand holen, Ebenenfilter, Abweichungen auf der Karte, Abhaken mit Rückgängig, Aufnahme im Reiter „Bauen“, Weltplan-Autoabgleich, Hologramm per Kontextmenü, Hinweis bei alter Mod); dazu die gesamte `npm run test:e2e`.
- Echtes Spiel: `scripts/mod/test_bridge_ingame.sh` (Fabric) und `scripts/mod/test_bridge_ingame_forge.sh neoforge` mit 0.7.1 bestanden: Baustand über 127.0.0.1 = Live-Zählung der Mod (117 richtig, 1 falsch, 30 fehlen nach Teilabriss im Hologrammtest), falscher Block an der erwarteten Stelle, gedrehtes Hologramm auf leerem Boden in Plankoordinaten (148 fehlen, gleiche Box).
- Grenze: im Container antwortete Maven Central mit 429; gebaut wurde über den Google-Spiegel per Gradle-Init-Skript außerhalb des Repos. BlueMap (http) nicht erreichbar, nur Links.
## QA-04 · Große Testphase vorbereitet · 02.11.2026 · Claude
- `tests/unit/web/testphase.test.mjs` 4/4: Testplan-Konsistenz (eindeutige IDs je Bereich, Schritte/Erwartung, Startadressen sind Routen, Kernfall je Bereich), Testprotokoll (setzen/aufheben, Notiz ohne Ergebnis = offen, Zusammenfassung, Markdown, kaputte Daten verworfen, Roundtrip), Fehlerbericht (Konsolen-Mitschnitt, Seitenverlauf, Diagnosetext, Zaun-Entschärfung, Bericht ohne Titel), GitHub-Adresse (Feld-IDs gegen `.github/ISSUE_TEMPLATE/testphase-planer.yml`, Kürzung unter 7 500 Zeichen), Route `#/testphase`.
- `tests/e2e/testphase.e2e.mjs` 3/3 (Chromium): Fälle öffnen/bewerten/notieren, Zusammenfassung, Haken und Notiz nach Neuladen, „Nur Kernfälle“, Protokoll in Zwischenablage mit Build; „Fehler melden“ aus einem Fall vorausgefüllt, Diagnose mit echtem `throw` und `console.warn`, Grafik/Speicherart, GitHub-Adresse mit Vorlage und Feldern, Bericht ohne Katalognamen; Einstieg aus dem Systemcheck.
- `mod-core` JUnit 13/13 (neu `DiagnosticsTest` 3: Logauswahl mit Stack und fremden ERROR-Zeilen, Schwärzen von Home/IPv4/Codes, Berichtstext und Dateiname). Spielschicht `HologramDiagnose` nur kompiliert gegen die Vanilla-Klassen geprüft (kein Gradle-Mod-Build in dieser Umgebung); Spieltest folgt mit dem Release durch den Mod-Thread.
- `npm run check` grün (653 Tests, 652 bestanden, 1 übersprungen, neu `check:testplan`), Browser `testphase`, `shell`, `stability` 13/13 (Basis main 68773a6).
- Nach Rebase auf main 988d230 (EDIT-05, Mod-Absturzschutz): `npm run check` grün (667 Tests, 666 bestanden, 1 übersprungen), `check:roadmap-change` ok, Browser `npm run test:e2e` 121/121 bis `worldbuilder`, danach blieb der Lauf in der Cloud-Umgebung vor `worldmap` hängen (kein Fehler, Zeitlimit); `worldmap.e2e.mjs` einzeln 2/2 – zusammen alle 49 Dateien, 123/123.
- Nach zweitem Rebase auf main 75ff89d (BASE-01/SPLIT-01, PERF-04-S07): `npm run check` grün (678 Tests, 677 bestanden, 1 übersprungen), `check:roadmap-change` ok, `npm run test:e2e` **124/124** in 49 Dateien ohne Hänger.
- Grenzen: GitHub-Issue-Vorbelegung nur gegen die Adresse geprüft, nicht gegen das echte GitHub-Formular; keine Abnahme der Seite auf Handy/Safari.

## GAME-07 / QA-04 · Mod 0.7.2 (Diagnose, Absturzschutz) · 02.11.2026 · Claude
- Spieltest NeoForge, Fabric ohne Modpack und Fabric mit Philipps Modpack + Complementary-Shader jeweils bestanden; neu im Ablauf: `/bauplaner diagnose` nach den Abschnitten, Bericht aus `bauplaner/diagnose/` kopiert und geprüft (Version, Loader, Minecraft, Konflikte gesamt, Plan eingeblendet, Planblöcke, Fortschritt, abgefangene Fehler 0, Website-Verbindung). Baustand über die Verbindung (0.7.1) weiter grün.
- Fund im Modpack-Lauf: der alte Spielordner `fabric-26.3/build/run/modpackGameTest/options.txt` hielt „Ebene tiefer“ noch auf Keypad 3 (aus 0.3.0), der Bericht meldete „KONFLIKT mit Show Recipes“ (Jade). Minecraft behält gespeicherte Tastenbelegungen einer Mod über Updates; die Anleitung nennt das Zurücksetzen der Taste.
- Der Mod-Code auf main 8c07dd6 ließ sich nicht bauen (eine Klammer zu viel in `HologramCommands.java`); mit 0.7.2 behoben. Der Spieltest-Verify braucht ein frisches `dist` (`npm run build`), sonst fehlen neue Felder wie `hello.features`.
- `mod-core` JUnit 13/13; `tests/e2e/mod-download.e2e.mjs` und `livelink.e2e.mjs` 4/4 mit 0.7.2 als neuester Version.

## MAP-06 · Weltkarte in die Tiefe (Zonen, Ebenen, Messen, Route, Mod-Protokoll 2) · 02.11.2026 · Claude
- Kern: `tests/unit/world/worldplan.test.mjs` (Schema 1 → 2, Zonen, Ebene/Farbe-Felder, Treffer und Zusammenfassung), `tests/unit/world/worldbuilder.test.mjs` (Zonenecken, `setLayerOp`, Duplizieren/Drehen mit Zonen), neu `tests/unit/world/worldroute.test.mjs` 4/4 (Messung mit Fläche und Auf-/Abstieg, Profil mit Stufen und Wasser, A*-Route um Kamm und durch ein Tor, Wasser nur wenn nötig, Vereinfachung ≤ 256 Ecken), `tests/unit/team/livelink.test.mjs` (Protokoll 1 und 2, Protokoll 3 abgelehnt, `marksForMod` alt/neu, `readLivePlayers`).
- Browser `tests/e2e/map-depth.e2e.mjs` 3/3 (Chromium, Port 4301, Simulator 47697 alt / 47699 Protokoll 2): Zone mit Art und Ebene, Ebene zuweisen und ausblenden, Listenfilter, Messen mit drei Punkten (Fläche 50 Blöcke²), Notiz aus dem Kontextmenü, Neuladen; alte Mod: „Mod kann … fehlt …“, 2 Einträge bleiben auf der Karte, nur `point` ohne `layer` beim Simulator, Höhenprofil „ohne Treppe begehbar“, Route übers Live-Gelände, Punkt wo ich stehe (40/65/-21, „0 Blöcke von dir“); neue Mod: Protokoll 2, Mitspieler „Anna (X 52 · Z -15)“, Zone mit Ebene „Hafen“ im Simulator.
- Bestand: `worldbuilder`, `livelink`, `game-progress`, `worldmap` 8/8 (ein Fund: der verallgemeinerte Eckenhinweis hieß „Ecke eingefügt“, der Test erwartet „Wegecke eingefügt“ – Hinweise wieder nach Art benannt, Zonen sagen „Zonenecke“).
- Grenzen: Protokoll 2 ist nur gegen den Simulator geprüft, die echte Mod folgt (GAME-08); Route übers Gelände nur mit dem flachen Simulator-Gelände im Browser, Kamm/Wasser im Kerntest. Abnahme durch Philipp offen (MAP-06-S08).

## GAME-08 · Mod 0.8.0 (Live-Protokoll 2) · 02.11.2026 · Claude
- `mod-core` JUnit 25/25: Zone mit Ebene (getrimmt) und Farbe, Punkt-in-Polygon mit Kerbe, `zoneAt`, `layers()`, unbekannte Zonenart, Zone mit zwei Ecken (400), Farbe „rot“ (400), `GET /v1/players` über den Handler, `hello` mit `protocol` 2 und `features` scan/marks2/players; Schema-1-Einträge ohne Ebene und Farbe unverändert.
- Spieltest NeoForge, Fabric ohne Modpack und Fabric mit Philipps Modpack + Complementary-Shader (`scripts/mod/bridge_gametest.mjs verify`): 4 Markierungen angenommen (Punkt, Bauplatz, Zone „Hofanlage“ mit Farbe, Gefahr-Punkt auf Ebene „Phase 2“), `readLivePlayers` liest `/v1/players` (Einzelspieler: leer, Dimension overworld), Chat „Weltplan-Ebenen (1)“ mit „● Phase 2: 2“, Bildschirmfoto `markierungen.png` mit der Zone.
- Grenzen: Mitspieler nur im Einzelspieler geprüft (leere Liste); Zonen-Teppich folgt nur geladenen Chunks; Ebenen-Ausblendung nicht gespeichert.

## GROSS-01 · Großprojekte in der Bibliothek · 03.11.2026 · Claude

- `npm run build:core && node --test tests/unit/catalog/grossprojekte.test.mjs`: 11/11 bestanden – alle zehn Großprojekte ohne Voxelkonflikt und Abstandsbefund, Straßennetz zusammenhängend, Laternen neben der Fahrbahn, Übernahme mit Abschnitten „Straßen & Plätze“ und „Phase N“, Einfügen mit Rückgängig und Veraltungsprüfung.
- `npm run build && node --test tests/e2e/grossprojekte.e2e.mjs`: 2/2 bestanden (Chromium 1243 per `PLAYWRIGHT_BROWSERS_PATH` als 1248 verlinkt): Übersicht mit zehn Karten, Planer, Quartier ab, Straßenbreite 6 und Asphalt, Tausch und Drehung, Übernahme „Meine Burg“ mit vier Abschnitten und Straßennetz-Bauteil, Einfügen der Tempelstadt, 390 px.
- Grenzen: keine Geländeanpassung im Großprojekt-Planer; Abnahme im Spiel offen (BIB-13).

## GEN-03 · Kolosseum (Arena-Generator, Bauset Antike, Kolosseum-Viertel) · 03.11.2026 · Claude
- `npm run check` grün (699 Tests, 698 bestanden, 1 übersprungen): `generators.test.mjs` mit `arena` in allen Fällen (Standard, sechs Vorlagen, alle Stile, 25 gewürfelte Sätze, Bereichsenden; Spielprüfung, B7-Zustände, Material/Rezepte, Anschlüsse `weg_5`, festgehaltener Hash), `catalog-game`/`catalog` mit den sieben Antike-Bauten und dem Ensemble „Kolosseumsplatz“ (keine Überschneidung, Kolosseum bei y −9), `grossprojekte.test.mjs` mit „Kolosseum-Viertel“ (30 Gebäude, keine Voxelkonflikte, Abstände, Straßennetz, Phasen, Übernahme).
- Sichtprüfung über Draufsicht, Abwicklung der Fassade, Schnitte und Ebenen des Kolosseums (Bögen gleichmäßig, Ränge begehbar, Umgang, Durchgänge, Hypogäum) und der Einzelbauten.
- Browser (Chromium, vorinstalliertes Headless-Shell 1243 für Playwright 1.64.1 verlinkt): `catalog`, `generators` (15 Karten), `grossprojekte` (11 Karten) 6/6; Seite „Kolosseum-Viertel“ (51 296 Blöcke) und Generator „Arena“ (27 819 Blöcke) ohne Konsolenfehler geladen.
- Grenzen: nicht im Spiel abgenommen (GEN-03-S05, Testfall BIB-14); ganze Browser-Suite nicht erneut gelaufen.

## GROSS-01-S05 · Großbauten-Set · 03.11.2026 · Claude

- Blocklogik je Gebäude (Zustandsregeln, Drehen/Spiegeln, `checkPlacement` mit eigenem Raum): alle sechs Großbauten ohne Befund.
- `node --test` Katalog, Katalog-Spiel, Bauwelten, Blocklogik, Zustände, Varianten, Bibliotheksstart: 66/66 bestanden. `tests/unit/catalog/grossprojekte.test.mjs`: 11/11 bestanden, auch die erweiterte Hauptstadt ohne Konflikt.
- Sichtprüfung im Browser (3D-Ansicht Iso/Nord/Süd) für alle sechs Gebäude; danach Rathausturm über das Dach gehoben und die Arena mit dünner Bogenmauer und Umgang neu aufgebaut.
- Grenzen: Abnahme im Spiel offen (BIB-13); Arena und Basilika sind antik und stecken noch in keinem Großprojekt.

## LIB-06 · Bibliotheksbeiträge (fest in die Bibliothek einreichen) · 03.11.2026 · Claude

- `npm run build:core && node --test tests/unit/catalog/contribution.test.mjs`: 8/8 bestanden – Kennung aus Namen, Angabenprüfung (Rechte, Lizenz, Kennung, Facetten, Präfix-Tags), Rundreise mit Blockinhalten und Herkunft (Inhalts-Hash gleich, Version „1.0“, DataVersion), Ablehnung veränderter/fremder Dateien und gefälschter Blockdaten, Ausschlüsse (mitgeliefert, lokale Projektänderung, falsches Vorschaubild), Auslieferung mit kaputtem Eintrag und Katalogabgleich 1.0→2.0, Register im Repository, Übernahme-Skript im Testordner (Trockenlauf, add, doppelt, ersetzen, list, remove, check).
- `npm run build && node --test tests/e2e/contribution.e2e.mjs`: 3/3 bestanden (Chromium 1243 als 1248 verlinkt): Litematic importieren, „In Bibliothek einreichen“, ohne Rechtebestätigung kein Paket, Paket mit `readContribution` geprüft (18 Blöcke, Schild, Rahmen/Gemälde, DataVersion 4556, Vorschaubild), GitHub-Link mit Vorlage und Kennung, Autor gemerkt, 1400 px und 390 px ohne seitliche Überbreite; mitgelieferte Gebäude ohne Einreichen.
- Durchstich lokal: das im Browser erzeugte Paket mit `npm run library:add` übernommen, `npm run check:library` grün, Build mit eigenem Chunk je Beitrag (32 kB), im Katalog „347 … (davon 1 Bibliotheksbeitrag)“, Karte „· Beitrag“, Blatt „Bibliotheksbeitrag von Philipp“ mit Bautipps, nach Neuladen aus dem Katalog-Cache; danach mit `library:remove` wieder entfernt (kein Testinhalt ausgeliefert).
- Gefunden und behoben: die alte Betrachterregel blendet `.small-note` unter 650 px aus; die Anleitung nach dem Erstellen nutzt eine eigene Klasse. Lange Dateinamen brechen um.
- `npm run check`: grün (706/706 Node-Tests, Doku, Testplan, `check:library`). `npm run test:e2e` komplett: Lauf unter Last mit Zeitüberschreitungen; die betroffenen Dateien einzeln erneut: backup-reminder 3/3, materials 2/2, shell 5/5, site 2/2, snap 3/3 grün. `ui-acceptance` „Bauwelten … survive reload“ (1400/390 px) scheitert auch auf unverändertem main 2b83089 (vorbestehend, nicht LIB-06).
- Grenzen: GitHub-Formular und Dateianhang nicht automatisch abgeschickt (manuelle Abnahme BIB-15); kein Safari-/Echtgerätetest.

## SIZE-01 · Größengrenzen für große Bauwerke, Mod 0.9.0 · 03.11.2026 · Claude
- Kern: neu `tests/unit/core/size-limits.test.mjs` 6/6 (eine Grenze für Import, Werkstatt, Export, Aufnahmen und Mod-Übertragung; Stufen „groß/sehr groß“ nur als Hinweis; Schem 600 × 12 × 600 = 4,3 Mio. Zellen Box exportiert und wieder eingelesen, Luft bleibt unausgewählt, Zellen versiegelt ohne Kopie; `SectionRuns`; Werkstattschritt mit 300.000 Zellen linear, Rückgängig-Budget; `checkPlanForMod` gegen Mod 0.8.0 und 0.9.0). `tests/unit/formats/schem.test.mjs` (Volumengrenze jetzt 257 × 256 × 256), `tests/unit/building/game-check.test.mjs` (`SectionRuns` im Plan).
- Messung in Node 22: 1 Mio. Zellen ≈ 130 MB; Import-Kopie über `createPayload` 3,0 s → `adoptPayload` 0,3 s.
- `mod-core` JUnit 28/28, neu `BigPlanTest`: 512 × 48 × 256 (6,3 Mio. Box, 3,1 Mio. Blöcke) lesen 130–180 ms, Abgleich aufbauen ≈ 0,9 s kalt / 0,7 s warm, Positionssuche, Abschnittszählungen nach Urteilswechseln gleich einer vollen Zählung; `SectionRuns` = `SectionCells`; kaputte Läufe und zu große Pläne mit Grund abgelehnt.
- Spieltests (`scripts/mod/test_bridge_ingame.sh`, `scripts/mod/test_bridge_ingame_forge.sh neoforge`, Fabric mit Philipps Modpack + Complementary-Shader): Hologramm, Website-Verbindung mit direkt gesendetem Plan, Abschnittswahl und Baustand über die Verbindung (jetzt in Scheiben) bestanden.
- Nach Rebase auf main f2ea179 (mit LIB-06): `npm run check` 712/713 (1 übersprungen), `pages.test` 2/2 nach `build:web`; Browser (Chromium 1243 als 1248 verlinkt) `mod-download`, `livelink`, `editor`, `schem`, `litematic`, `worldmap` 18/18 mit 0.9.0 als neuester Mod.
- Grenzen: Ein echter Plan mit Millionen Blöcken wurde im Spiel nur über die JUnit-Messung geprüft, nicht über den Spieltest-Client (dort 148 Blöcke). Render-Budget und `/bauplaner leistung` sind nicht mit Bildrate gemessen. Abnahme durch Philipp offen (SIZE-01-S05; Testfälle DATEI-05, WERK-07, MOD-15, LIVE-09).
- Olympus-Prüffall (952.911 Blöcke): `tests/unit/core/computation-transport.test.mjs` (Hin- und Rückweg zum Hintergrundrechner gleich der direkten Berechnung, gedrehte/gespiegelte Bauteile), `tests/unit/core/large-edit.test.mjs` (Prüfsummen-Schnellweg textgleich, Werkstattmodell nach Änderung gleich sortiert, Grenzen, Palette). Browserablauf von Hand mit der echten Datei gemessen: Import, Werkstatt (Block, Rückgängig, Speichern), Projekt, Export, Weltkarte, Senden an die simulierte Mod; keine Konsolenfehler.
- Sendeprüfung Planer → Mod (03.11.2026 abends, nach Philipps Meldung „Plan wird nicht richtig übertragen“): neues `scripts/mod/bridge_sendcheck.mjs` (in `scripts/mod/test_bridge.sh`) exportiert wie „Senden“ auf der Weltkarte und liest den Plan mit dem `PlanModel` der Mod. Gefunden: „Senden“ füllte leere Zellen mit `minecraft:structure_void`, die Mod nahm sie als Blöcke (kleiner Testplan 38.160 Leerzellen als fehlende Blöcke, Olympus 4,75 Mio. → von der Mod abgelehnt). Jetzt Luft (`LIVE_PLAN_EXPORT`). Außerdem sperrten Zustände älterer Spielversionen (Laub ohne `waterlogged`, Köpfe ohne `powered`) den Export gedrehter Bauteile. Ergebnis: gedrehte/gespiegelte Teile, alle 11 Großprojekte und Olympus gerade und gedreht – jeder Block gleich, keine Leerzellen als Blöcke. Grenze: nicht im laufenden Spiel nachgestellt, gespiegeltes Olympus bleibt wegen glasierter Keramik (Muster nicht spiegelbar) gesperrt.

## COOP-01 / COOP-02 · Teambau (Planer und Paper-Plugin) · 03.11.2026 · Claude
- `node --test tests/unit/team/team.test.mjs`: 12/12 bestanden – Rollen und Rechte zum Ereigniszeitpunkt, Lebenslauf eines Abschnitts, Doppelübernahme, Beitritt/Spielernamen/@Name, Beiträge und Sammelaufträge, Zusammenführen vertauschbar und idempotent (auch dreiseitig), unbekannte Ereignisarten bleiben, Meldecode mit Prüfsumme, Teampaket mit SHA-256, Statustext.
- `node --test tests/e2e/team.e2e.mjs`: 2/2 bestanden (1400 und 390 px, Chromium 1243 als 1248 verlinkt) – zwei getrennte Browser: Gründen, Freigabe, Teampaket mit Plan öffnen, Beitreten, Übernehmen, Fertig melden, Beitrag, Notiz, Meldecode, Doppelübernahme als Hinweis, Bestätigen, Rolle, Neuladen, Teampaket nur Teamstand, Rückgängig; kein waagerechtes Scrollen, keine Konsolenfehler.
- `scripts/mod/bridge_paperteam.mjs` auf echten Paper-Servern 1.18.2 (Build 388), 1.21.4 (Build 232) und 26.3 (Build 238, JDK 25): Baustag per Konsole für drei Spieler, Neustart, Ausfuhr; Planer-Faltung der Ausfuhr = Serverstand, keine Plugin-Warnungen.
- Grenzen: Aktionsleiste, Partikelumriss und Schutz brauchen echte Spieler (TEAMBAU-06 auf Philipps Server); keine Mitspieler-Abnahme.

## COOP-04 · Baunachweis und Lagerkisten · 03.11.2026 · Claude
- `node --test tests/unit/team/team.test.mjs`: 14/14 – neu: Baunachweis nur vom Server, Summen je Mitglied und Abschnitt, „aus“ blendet auch frühere Zahlen aus, nur für sich selbst; Lagerkisten nur durch Baumeister, Bestand aus letzter Zählung, Einlagern/Entnehmen als Differenz, keine Buchung bei erster Zählung, gekürzter Liste oder doppeltem Einlesen.
- `node --test tests/e2e/team.e2e.mjs`: 2/2 (1400 und 390 px) – zusätzlich Serverausfuhr mit Nachweis und Lagerzählungen einlesen, Anteile je Abschnitt, Bestand ins Baustellen-Lager übernehmen, eigenen Nachweis aus- und anschalten.
- `scripts/mod/test_bridge_paper_team.sh` auf echten Paper-Servern 1.18.2 (388), 1.20.6 (151), 1.21.4 (232), 1.21.11 (132), 26.3 (238): echte Kiste per `setblock`/`item replace`, Lagerkiste setzen, Zählen mit +32/-64, `beitrag`/`beitrag alle`, `nachweis aus`; Planer-Faltung der Ausfuhr = Serverzustand. Die Testskripte nehmen jetzt die Jar der aktuellen VERSION (vorher konnte eine ältere Jar im build-Ordner gewählt werden).
- Grenzen: Zählen beim Blocksetzen und beim Schließen einer Kiste braucht echte Spieler (TEAMBAU-07/08); kein Vergleich „richtig nach Plan“ im Plugin.
## COOP-06 · Teamplanung im Planer · 03.11.2026 · Claude
- `node --test tests/unit/team/teamPlan.test.mjs`: 13/13 bestanden – Teilen nach Schichten (Ausgleich, erste ID, gleiche Abdeckung, offene Enden) und nach Bauteilen (LPT, unabhängig), Grenzen (zu wenig Schritte, 64 Abschnitte); Zuteilungsvorschlag (Last, Ketten, Abwesende/Gäste, vergebene unberührt); Zeitplan (parallel, Warten auf Vorarbeit, Abwesenheit, Kette, Kalender); Material je Mitglied; Bedarf je Abschnitt; Fortschritt/Achtung; Konfliktlösungen; Planstand-Vergleich; Rechte; Übergabe mit Annahme/Ablehnen/Überholt; Abwesenheit und `issue.ack` reihenfolgeunabhängig; Serverdatei mit `need`.
- `node --test tests/unit/team/team.test.mjs`: 14/14 weiterhin bestanden (mit COOP-04).
- `node --test tests/e2e/teamplan.e2e.mjs`: 2/2 bestanden (1400 und 390 px): Team gründen, Freigabe, zweites Mitglied, Rohbau in 2 Schichtpakete teilen, 4 Zuweisungen übernehmen, Zeitplan mit zwei Spuren, Material und Packlisten, Brett mit 4 Abschnitten „in Arbeit“, Vergleich mit Planstand 1, Übergabe anbieten und annehmen, Abwesenheit (erscheint unter „Achtung“), Bauleitung übergeben; keine Konsolenfehler.
- Grenzen: keine Abnahme mit echten Mitspielern; Plugin faltet die neuen Arten noch nicht (Plugin-Thread).

## GAME-10 · Mod 0.11.2: Team-Raum-Befehle · 03.11.2026 · Claude
- Katalog um `/bp team raum` und `team trennen` ergänzt; `team verbinden <link>` bewusst ohne Knopf (Link enthält den Serverschlüssel, nur Serverkonsole). `CommandCatalogTest` liest jetzt auch die `team`-Unterbefehle aus der Tab-Vervollständigung des Plugins.
- Paper-Jar ab main cb02624 (RoomLink). Paper-26.3-Teamtest, echte Spieltests Fabric und NeoForge 26.3 bestanden.

## GAME-07 · Mod 0.11.1: structure_void ist kein Planblock · 03.11.2026 · Claude
- Fund aus dem Volumenlimit-Thread (`scripts/mod/bridge_sendcheck.mjs`): Exporte mit „Strukturleere“ füllten in der Mod die ganze leere Box mit Blöcken. `PlanModel` überspringt `minecraft:structure_void` jetzt wie Luft (JUnit `structureVoidIsNotAPlannedBlock`).
- `scripts/mod/test_bridge.sh` mit Sendeprüfung aller Großprojekte grün. Echte Spieltests Fabric und NeoForge 26.3 mit 0.11.1 bestanden.

## GAME-10 · Befehlsseite im Plan-Menü, Mod 0.11.0 (Fabric, NeoForge) · 03.11.2026 · Claude
- `npm run check` grün. Gradle `:mod-core:test`, `:paper:build`, `:fabric-26.3:build` und `:neoforge-26.3:build` grün.
  - `CommandCatalogTest`: alle Mod-Befehle und alle Plugin-Befehle (`/bp`, aus `TeamModule.COMMANDS` und `StorageModule.SUBCOMMANDS` gelesen, also auch `uebergeben`, `annehmen`, `ablehnen`, `abwesend`, `zurueck` aus COOP-06) im Katalog, 103 Befehle, Eingaben werden geprüft und zu genau dem getippten Befehl, Gründe für ausgegraute Knöpfe, Antwortfenster für Serverbefehle, keine doppelten eigenen Zeilen.
- Echter Fabric-Client 26.3 (`scripts/mod/test_bridge_ingame.sh`, weston, Fenster 854×480 = GUI 427×240) mit echten Mausklicks: `/bauplaner befehle`, Reiter „Team“, „Übersicht“, „Abschnitt zeigen …“ mit Eingabe 2, „Ausführen“. Die Antworten stehen auf der Seite, im Einzelspieler sind die Serverknöpfe ausgegraut.
  - Gefunden und behoben: Bei kleinem Fenster passten nur zwei Knöpfe auf die Seite (Blättern jetzt unten links, Status nur im Reiter „Status“). Eigene Antwortzeilen standen doppelt auf der Seite (Chat-Ereignis des Loaders meldete sie noch einmal).
  - Hinweis für Spieltests: Minecraft 26.3 nutzt SDL, die linke Maustaste ist dort 1 (`InputConstants.MOUSE_BUTTON_LEFT`), nicht 0.
- Echter NeoForge-Client 26.3 (`scripts/mod/test_bridge_ingame_forge.sh neoforge`): `/bauplaner befehle` öffnet die Seite, ein von dort gesendeter Befehl antwortet auf der Seite; alle bisherigen Schritte bestanden.
- Grenzen: Serverbefehle über `/bp` gegen ein echtes Paper-Plugin laufen in keinem automatischen Test (kein Client, der sich mit Paper verbindet). Das prüft MOD-16 auf Philipps Server.

## COOP-03 · Teambau in der Mod 0.10.0 (Fabric, NeoForge, Plugin-Kanal, Website) · 03.11.2026 · Claude
- `npm run check`: 727 bestanden, 0 fehlgeschlagen, 1 übersprungen. Neu sind `tests/unit/team/team-link.test.mjs` (Format team-link, Lesen von `GET /v1/team` und `/v1/team/pull`, Fehlercodes) und die Prüfung von `SectionIds`/`TeamId` in `tests/unit/building/game-check.test.mjs`.
- Gradle `:mod-core:test`, `:paper:build`, `:fabric-26.3:build` und `:neoforge-26.3:build` sind grün.
  - `TeamTest`: Teamstand, vorläufiger Stand mit Ausgang, Planzuordnung über IDs und Namen, Rahmen und Stücke bis 6 MB, Zeitformat wie `toISOString`, und dass der Kanal ohne Ankündigung und Erlaubnis nichts sendet.
  - `LiveLinkTest`: Merkmal `team`, alle Teamwege nur mit Schlüssel.
- Echter Fabric-Client 26.3 (`scripts/mod/test_bridge_ingame.sh`, weston): alle bisherigen Schritte und zusätzlich der Team-Rundweg.
  - `POST /v1/team` erkennt 2 von 2 Abschnitten im Plan.
  - `/bauplaner team nehmen 2` legt die Übernahme in den Ausgang, `GET /v1/team` liefert sie als Ereignis von „Ich bin“, und die Planer-Faltung ergibt den neuen Inhaber.
  - `/bauplaner team mein` blendet nur die eigenen Abschnitte ein.
  - Im Einzelspieler antwortet `pull` mit 409.
- Echter NeoForge-Client 26.3 (`scripts/mod/test_bridge_ingame_forge.sh neoforge`): Der erste Lauf fand einen Absturz beim Laden („clientbound payloads are missing client-side handlers: [bauplaner:team]“). Behoben mit einem eigenen Client-Handler in `playBidirectional`, danach bestanden.
- Echter Paper-Server 26.3 (Build 238, `scripts/mod/test_bridge_paper_team.sh 26.3`) mit eingeschaltetem `team.kanal`: Baustag, Neustart und Ausfuhr bestanden; die Planer-Faltung entspricht dem Serverstand.
- Browser (`tests/e2e/team-live.e2e.mjs`, Mod-Simulator, Chromium 1243 als 1248 verlinkt, 1400 und 390 px), alles bestanden:
  - Teamstand an die Mod, Übernahme aus dem Spiel mit Vorschau, Quittung.
  - Eine schon bekannte Meldung wird ohne Vorschau quittiert.
  - Server live: eine Notiz vom Server wird übernommen und mit „Rückgängig“ zurückgenommen.
  - Kein waagerechtes Scrollen, keine Konsolenfehler.
- Grenzen: Den Kanal `bauplaner:team` zwischen echtem Client und echtem Paper-Plugin (Anmeldung über `minecraft:register`, `act`/`ack`, `state` an alle Spieler) hat noch kein automatischer Test durchlaufen. Die Testumgebung hat keinen Client, der sich mit einem Paper-Server verbindet. Plugin-Seite und Mod-Seite sind je für sich geprüft, das Zusammenspiel prüft TEAMBAU-09 auf Philipps Server.

## PERF-04 · Erststart der Bibliothek, gemeinsamer Startwarter · 03.11.2026 · Claude

- Ursache der 46 roten Browsertests auf main 2b83089: der erste Katalogaufbau (frischer Browser, kein Cache) dauerte seit Kolosseum und Großprojekten rund 12 s, die Tests warteten 10 s auf „Beispielprojekt „Burgmauer““.
- Katalogaufbau beschleunigt: `refinePayload` mit Zahlenraster statt Zeichenketten-Schlüsseln und flacher Außen-Flutfüllung; `Plot.payload()` und `refinePayload` versiegeln frische Arrays mit `adoptPayload` statt zu kopieren. `createBuildingLibrary` 7,5 s → 4,7 s; alle Versionskennungen bitgenau gleich (Vergleich der Kennungsliste vorher/nachher).
- `tests/e2e/start.mjs` mit `waitForStart`/`openSampleProject` (90 s Startgrenze) in allen 28 betroffenen Browsertest-Dateien.
- `ui-acceptance` „Bauwelten“: Wüstenhandel zeigt 8 statt 7 Treffer, weil das Kolosseum (GEN-03) Wahrzeichen im Wüstenstil ist; Erwartung angepasst.
- Node-Tests 706 bestanden, 1 übersprungen. Browser-Suite komplett (`--test-concurrency=1`): 132/134, danach die zwei Bauwelten-Fälle mit neuer Erwartung 2/2 grün.
## PROJ-01 · Projektplanung (Meilensteine, Abhängigkeiten, Bauleute, Zeitplan) · 03.11.2026 · Claude
- `tests/unit/planning/program.test.mjs` 9/9 (neu nach Rebase auf GROSS-01: Großprojekt „Innenstadt“ aus der Bibliothek → Meilenstein „Erschließung“ + je Phase, alle Abschnitte nach den Straßen, kritischer Pfad durch alle Phasen): Prüfung (Schema, Kreis mit Pfad, Selbstbezug, Doppel, unbekannte Bauleute, Datum, Bautage je Woche, Bautempo, Prüfung über `checkSite`), Bearbeiten rein und über `site.set` rückgängig, `removeSection` bereinigt Meilensteine/Abhängigkeiten/Zuweisungen, Befunde (hängend, Reihenfolge, leer, nicht zugewiesen), Vorschläge aus Geometrie (Türme brauchen Fundament) und Anschlüssen (Mauer am Turm), alle Vorschläge zusammen gültig und danach leer, Vorlagen Phasen/Erschließung/Kette/Etappen/Rückfall, Kalender 7/5/2 Bautage je Woche, Zeitplan (parallele Spuren, geteilter Abschnitt mit Summentempo, Warten auf Voraussetzung, kritischer Pfad, Daten, Meilensteine ok/late/open/done, Bauleute-Bedarf, Texte, Abhaken gibt frei, eine Spur ohne Bauleute, deterministisch), Sicherung trägt den Plan und lehnt einen kaputten ab.
- `tests/e2e/program.e2e.mjs` 2/2 (Chromium 1400 px und 390 px, Port 4305): Hinweis ohne Abschnitte, Vorschläge übernehmen, Kreis abgelehnt, Meilenstein verspätet mit Abschnittsauswahl, zwei Bauleute mit Matrix und Spuren, Bauzettel, Startdatum mit fünf Bautagen, Textdatei, Neuladen, Projektkarte, kein horizontales Scrollen.
- Sichtprüfung: Reiter „Planung“ im hellen Thema bei 1400 px (Theme-Tokens, keine festen Farben).
- Grenzen: nur Chromium im Container; keine Abnahme durch Philipp (PROJ-01-S05).

## PROJ-02 · Projektplanung vertieft (ab heute, Material abwarten, Basisplan, Anteil) · 04.11.2026 · Claude
- `tests/unit/planning/program-depth.test.mjs` 6/6: Bautage zwischen Daten (7/5 je Woche, Vorzeichen, Grenze 20 Jahre), Anteil der Bautage (Prüfung, Rückgängig, halbes Tempo), Startdatum in der Vergangenheit (Beginn am nächsten Montag bei 5 Bautagen), Basisplan (braucht Startdatum, ± 0, langsamer → Verzug für Plan/Abschnitt/Meilenstein, später angefangen → +3, Bereinigung beim Entfernen, Sicherung, Verwerfen, kaputter Basisplan abgelehnt), Material abwarten (aus Produktion, Beginn ≥ Bereitschaft, Plan länger, Produktion meldet danach nichts zu spät, ausgeschaltet identisch), Altbestand unverändert.
- `tests/e2e/program-depth.e2e.mjs` 2/2 (Chromium 1400/390 px, Port 4337) und `program.e2e.mjs` 2/2.
- Sichtprüfung bei 1400 px: Karten „Basisplan“ und „Material · aus Produktion“, Basisplan-Linie und schraffiertes Materialwarten im Balkenplan.
- Grenzen: nur Chromium im Container; keine Abnahme durch Philipp (PROJ-02-S05).

## COOP-05 · Geprüfte Lagerkisten im Paper-Plugin 0.10.0 · 03.11.2026 · Claude
- `npm run check`: 741 bestanden, 0 fehlgeschlagen. Neu: `tests/unit/team/lager.test.mjs` (Planer-Faltung von `store.config/move/check/seal`, Abweichung bleibt bis zum Siegel, Bewegungen sind nur Zuordnung, nur Server darf `store.move/check`).
- Gradle `:paper:test`: `StoreLedgerTest` (Rechtematrix aller Schutzstufen, Prüfsumme, Mengen, Trichterregeln) und `StoreIndexTest` (Sollstand = letzte Zählung + Bewegungen, Abweichung summiert, Siegel, Doppelkiste) grün.
- `scripts/mod/test_bridge_paper_lager.sh` auf echten Paper-Servern 1.18.2, 1.20.6 (151), 1.21.4, 1.21.11 (132), 26.3 (238): Markieren, `item replace` → „abweichend“ mit Unterschied, Helfer darf nicht siegeln, Siegel als Baumeister, Trichter rein/raus, TNT lässt die Kiste stehen, Doppelkiste, Entmarkieren, Fass „fehlt“, `bedarf`, `sammle glass` → 3, Neustart, Ausfuhr; Planer-Faltung = Serverzustand. `test_bridge_paper_team.sh` und `test_bridge_paper.sh` (1.21.11, 26.3) weiter grün.
- Browser `team`, `testphase`, `mod-download`, `team-live`: 9/9.
- Grenzen: Inventarklicks, Schutz gegen echte Spieler, Abbauen durch Spieler und die Anzeige in der Mod brauchen echte Spieler (LAGER-02…06, LAGER-09 auf Philipps Server).


## PERF-05 · Ladezeit und Stabilität des Gesamtsystems · 03.11.2026 · Claude

- Messung mit `node scripts/bench/perf/measure_start.mjs --runs 3` (Chromium 1243 headless, Cloud-Container): Erststart bis Projektzentrale 5,2 s → 1,4 s, Neustart unverändert 1,1 s, Einstiegspaket 1 329 kB → 720 kB. Details und offene Punkte: [PERFORMANCE_AUDIT](architecture/kern/PERFORMANCE_AUDIT.md).
- Neu `tests/unit/core/canonical-json.test.mjs` (2000 Zufallswerte gleich der alten Ausgabe), `tests/unit/core/stable-math.test.mjs` (Genauigkeit, Sonderwerte, feste Referenzbits), `tests/e2e/catalog-snapshot.e2e.mjs` (Katalog aus Datei = im Browser erzeugt; fehlende, beschädigte, fremde Datei → Erzeugen).
- Gefunden beim Abgleich: Kolosseum in Node und Chromium mit verschiedener Version-ID (Winkelfunktionen je Engine); nach `stableMath` sind alle 359 mitgelieferten Versions-IDs gleich dem bisherigen Node-Ergebnis und gleich im Browser.
- Durch das Nachladen der Seiten zuerst rot: `anlagen` und `app` (die alte Seite blieb während des Ladens versteckt im DOM, der Test traf deren Dateifeld). Behoben mit `Suspense key={route.view}` und direktem Rendern bereits geladener Seiten; danach grün.
- `map-depth` „Neue Mod (Protokoll 2)“ war auf main 7b975a0 rot (fremd); inzwischen von SIZE-01 auf main behoben (ad668c9), dessen Fassung übernommen.
- `npm run check:architecture`, `typecheck`, `build`, `npm test`: 732 Tests, 731 bestanden, 1 übersprungen. Browser-Suite dateiweise (`--test-concurrency=1`): 137/138 (nur das fremde `map-depth`); nach Rebase auf main 651e5a6 erneut komplett: **140/140**.
- Runde 2 (O-1 Vorschaubildcache): neu `tests/e2e/thumb-store.e2e.mjs` (Port 4319). Neustart im Profil: kein `drawImage`/WebGL-Rendern mehr, längste Hauptthread-Blockade 326 ms → 123 ms (Wandzeit bis Projektzentrale unverändert ~1,1 s, bestimmt durch Worker und IndexedDB). `npm run check` 746 Tests grün, Browser-Suite **144/144**.
- Weltbuilder Strg+Z nach Entf (worldbuilder.e2e.mjs:193, bei einem anderen Thread reproduzierbar rot): Ursache war ein Wettlauf im Kartenverlauf. Das Löschen mit Projektlage zeigt den leeren Plan, bevor die Projektlage gespeichert und der Schritt im Verlauf steht; ein Strg+Z dazwischen ging verloren. Nachgestellt mit 4-facher CPU-Drosselung (CDP) ohne Warten nach Entf: alter Stand 2/2 rot mit genau der Meldung, neuer Stand (`useMapHistory` führt Änderung, Rückgängig und Wiederholen nacheinander aus) grün.
- Runde 3 (PERF-02-S03, PERF-05-S08): Prüfstand mit den 60 größten Gebäuden (256 000 Zellen, gedreht, gespiegelt, überlappend): SHA-256 aller Ergebnisteile vor/nach jeder Änderung gleich; `computeProject` 2,2 → 1,85 s, Rückweg aus dem Worker 0,8 → 0,45 s. Neu `tests/unit/team/owner-wire.test.mjs`, `tests/unit/core/selective-recompute.test.mjs`, `tests/unit/core/lazy-cells.test.mjs`. Chromium: Projektzentrale entpackt 0 Versionen, Bibliothek 20; Heap nach Neustart 42 → 18 MB, Neustart weiter ~1,05 s. `npm run check` 788 Tests grün; Browser-Suite siehe Commit.
- Runde 4 (O-3 Startpaket, 04.11.2026): `node scripts/bench/perf/measure_start.mjs --runs 3`: Erststart 1,43 → 1,09 s, längste Hauptthread-Blockade 214 → 106 ms; Start-JavaScript laut index.html 2,0 MB → 1,56 MB (587 → 458 kB gzip), Projektseite 335 → 10 kB plus je Reiter ein Baustein. `npm run check` 823 Tests grün; Browser-Suite siehe Commit.
## COOP-01-S04 · Team in die Projektplanung · 03.11.2026 · Claude
- `node --test tests/unit/team/team.test.mjs tests/unit/planning/program.test.mjs`: 24/24 – Minecraft-Name aus der Planung gilt im Team, Beigetretene werden Bauleute, Zuweisungen folgen den Abschnittsinhabern, unberührte bleiben, zweites Übernehmen ändert nichts, `checkProgram` lehnt ungültige Minecraft-Namen ab.
- `node --test tests/e2e/team.e2e.mjs tests/e2e/program.e2e.mjs`: 4/4 (Knopf „In die Projektplanung übernehmen“ im Ablauf).

## GAME-09 · Modrinth-Projekt der Bauplaner-Brücke · 03.11.2026 · Claude
- `tests/unit/mod/modrinth.test.mjs` 3/3: project.json, Beschreibung, Icon (< 256 KiB), 6 Bilder (< 5 MiB), Änderungsliste je Version, SHA-256 der hochzuladenden .jar gegen releases.json, eindeutige Versionsnummern (`0.10.0+fabric-26.3`, `0.10.0+neoforge-26.3`, `0.10.0+paper`), Fabric API als Pflichtabhängigkeit, kein Forge.
- `node scripts/mod/modrinth_publish.mjs plan` gegen die echte Modrinth-API ohne Token: Minecraft 26.3/1.18.2–1.21.11, Loader fabric/neoforge/paper und Kategorien sind bekannt; Slug `bauplaner-bridge` ist frei.
- `create`, `sync`, `release` gegen eine nachgebaute Modrinth-API (lokaler Server): Projekt als Entwurf mit Icon, 6 Bilder, 3 Versionen mit Datei und Abhängigkeiten, Einreichen zur Prüfung; zweiter Lauf lädt nichts doppelt hoch.
- Echte Modrinth-API (03.11.2026, nach Philipps Bestätigung, Lizenz MIT): `create` legte das Projekt `bauplaner-bridge` (ID uL1mPEKJ) mit Icon, 6 Bildern und 3 Versionen an. Modrinth verlangt vor dem Einreichen die Umgebung je Version (API v3: Fabric/NeoForge `client_only`, Paper `server_only`); das Skript setzt sie jetzt nach jedem Hochladen, `sync` schickt `client_side/server_side` nicht mehr (überschreibt sonst die Versionen). Danach `sync`: eingereicht, Status `processing`. Livetext ohne „Claude“/„Anthropic“.
- Grenzen: Freigabe durch das Modrinth-Team steht aus.
- Grenzen: echte Modrinth-API mit Token noch nicht benutzt (Token fehlt, Bestätigung von Philipp offen).

## COOP-06-S04 · Übergabe und Abwesenheit im Paper-Plugin · 03.11.2026 · Claude
- `TeamLog.java` faltet `section.handover/accept/decline`, `member.away`, `issue.ack` nach TEAMBAU §4 wie `team.ts` (Angebot verfällt bei claim/assign/release/done/verify; leere Notiz = keine Notiz).
- `scripts/mod/test_bridge_paper_team.sh` auf echten Paper-Servern 1.18.2 (388), 1.21.4 (232), 26.3 (238): `uebergeben 3 Carla …`, Anzeige im `team`/`abschnitte`, falscher Annehmer abgelehnt, `annehmen` ohne Nummer, `abwesend bis 2026-11-10 Urlaub`, `abwesend`/`zurueck`; Planer-Faltung der Ausfuhr: neuer Inhaber, Notiz übernommen, kein offenes Angebot, Abwesenheit wie im Spiel. `test_bridge_paper_lager.sh 26.3` weiter grün.
- Grenzen: Benachrichtigung des Empfängers im Chat braucht echte Spieler (TEAMBAU-21…24).

## PLAN-01 · Roadmap nach Bereichen neu geordnet · 03.11.2026 · Claude
- `tests/unit/tooling/roadmap.test.mjs` um zwei Fälle erweitert: Übersicht enthält alle Bereiche, „Was nur Philipp tun kann“ und jede offene Aufgabe ohne Thread unter „Verwaiste Punkte“; Aufgaben ohne `area` bleiben gültig (eigene Gruppe); unbekannte Bereiche, Philipp-Arten und Eingangsbezüge werden abgelehnt.
- `npm run check` auf main f18c3c3 plus diesem Stand: Architektur, Roadmap (99 Aufgaben), Typprüfung, Build, 770 Node-Tests (769 bestanden, 1 übersprungen, 0 fehlgeschlagen), Doku-, Testplan- und Bibliotheksprüfung bestanden.
- Browsertests nicht ausgeführt: die Anwendung liest roadmap.json nicht, kein Anwendungscode geändert. Grenzen: Zuordnung der Threads ist der Stand vom 03.11.2026 ~20:45.

## STAB-01-S02 · Renderingfehler im Browser, Aufräumen LAGER-01/PERF-03/LICENSE-01 · 03.11.2026 · Claude
- Neuer Browsertest `tests/e2e/render-crash.e2e.mjs` (Port 4323): Der Baustein des Systemchecks wird gesperrt, wie bei einem offenen Tab nach einer Veröffentlichung. Erwartet und geprüft: genau ein automatisches Neuladen, danach die Fehlergrenze mit „Erneut versuchen“, „Seite neu laden“ und „Fehlerbericht kopieren“, Navigation sichtbar, Projektzentrale und gespeichertes Projekt öffnen ohne Fehler, nach Freigabe und „Seite neu laden“ erscheint der Systemcheck. 3 von 3 Läufen grün.
- Gefundener Fehler: Unter React 19 setzte `ErrorBoundary.getDerivedStateFromError` keinen Zustand, der Fehler lief bis zur Wurzel, die App wurde leer. Korrigiert; ohne Korrektur schlägt der neue Test fehl (Gegenprobe).
- `tests/e2e/stability.e2e.mjs` und `tests/e2e/app.e2e.mjs` nach der Korrektur 9/9 grün. Lauf im Cloud-Browser mit Playwright 1.64.1; dort fehlte Chromium 1248, Lauf mit `PLAYWRIGHT_BROWSERS_PATH` auf die vorhandene Build 1243.
- LICENSE-01: `LICENSE` (MIT) und `docs/LICENSING.md` (Bestandsaufnahme); `npm run check:docs` grün. LAGER-01 und PERF-03 nur in der Roadmap mit COOP-04/05 bzw. PERF-05 abgeglichen, kein Code geändert. GitHub-Issues #2 bis #4 geschlossen.

## COOP-07-S05 · Paper-Plugin im Team-Raum (RoomLink) · 03.11.2026 · Claude
- `scripts/mod/test_bridge_paper_room.sh` gegen `npx wrangler dev` (services/team-room, Port 8787) auf echten Paper-Servern 1.18.2 (388), 1.21.4 (232), 26.3 (238), Server ohne Teamdatei:
  - `/bauplaner team verbinden <Server-Link>` holt den Planstand aus dem Raum (3 Abschnitte), Status „live“, Schlüssel steht nie im Log.
  - Serverereignisse (`nehmen`, `notiz`) liegen sofort mit Herkunft server im Raum; ein Planerereignis (Zuweisung) kommt live auf dem Server an.
  - Neuer Kopf (Abschnitt umbenannt) wird nach `type: header` neu geladen.
  - Neustart: Verbindung aus `TEAMID.room.json`, Fortsetzung am Cursor, neues Ereignis geht hoch, keine doppelten IDs im Raum.
  - Serverschlüssel erneuert (Close 4403): kein neuer Versuch, Status „Schlüssel ungültig oder erneuert“.
  - Planer-Faltung des Raum-Feeds = Serverzustand.
- Grenzen: nur lokaler Raum (wrangler dev); der gehostete Dienst und Mitspieler auf Philipps Server bleiben COOP-07-S06/TEAMBAU-09.

## DIFF-01, FORMAT-01-S02, QA-02-S01 · Vergleich, WorldEdit-Rundlauf, Gerätematrix · 03.11.2026 · Claude

- DIFF-01: `tests/unit/core/diff-shift.test.mjs` (reine Verschiebung = 0 Änderungen, Verschiebung plus Anbau, Materialtausch und Pivot-Anbau nicht als Verschiebung, Kisteninhalt als Inhaltsänderung, Zaunverbindung abgeleitet, gedrehte Treppe echt; deterministisch, Eingaben unverändert); `tests/unit/core/variants.test.mjs` angepasst (neue Art `content`).
- FORMAT-01-S02: `tests/unit/formats/schem-roundtrip.test.mjs` prüft `scripts/checks/check_schem_roundtrip.mjs` mit einer Datei im WorldEdit-Aufbau (absoluter Offset, WEOffset, ungeordnete Properties, BlockEntity mit Data, Rüstungsständer): semantisch gleich, beide Dateien vom Python-Verifier als gültig erkannt, WEOffset-Änderung als Hinweis.
- QA-02-S01: Gerätematrix `docs/testing/GERAETEMATRIX.md`, Testplanbereich GERAET-01 … 06 (`npm run check:testplan`).
- Grenzen: keine echte WorldEdit-Datei (WorldEdit/Paper als Fremdcode in der Cloud nicht erlaubt; Philipp lädt eine hoch); keine echten Geräte – alle Matrixzellen „offen“; Verschiebung nur für das ganze Bauwerk, nicht für Teile oder Drehungen.

### 04.11.2026 – Produktion (PROD-01…04)

- Grundlage: main 823cbb6 plus Reiter „Produktion“ (production.ts, productionPlan.ts, ProductionTab.tsx), Thread „Produktion und Anbindung im Planer ausbauen“.
- `npm run check`: bestanden (Architektur, Roadmap, Typprüfung, Build, 818 Node-Tests inkl. 10 neue in `tests/unit/materials/production.test.mjs`, Doku, Testplan, Bibliothek).
- `npm run test:e2e` (Chromium 1243 über PLAYWRIGHT_BROWSERS_PATH-Symlinks): 151/151 bestanden, darunter `tests/e2e/production.e2e.mjs` bei 1400 und 390 px (Farm anlegen, Ernte bucht ins Lager, gemessene Rate, Ort/AFK-Platz, Neuladen, kein Querscrollen, keine Konsolenfehler).
- Sichtprüfung per Screenshot im hellen Thema (1400/390 px); Farbwerte über Theme-Tokens.
- Grenzen: Farmraten sind Richtwerte; keine Messung im echten Spiel. Abnahme PROJ-12/13 durch Philipp offen.

### 04.11.2026 – Sammeltruhen aus dem Team-Lager (PROD-05)

- Grundlage: main d69bb49 plus PROD-05 (Thread „Produktion und Anbindung im Planer ausbauen“).
- `npm run check`: bestanden, 825 Node-Tests nach Rebase auf COOP-08; `npm run test:e2e`: 155/155 bestanden (vor Rebase), danach production + team erneut grün. Neu: PROD-05-Fall in `tests/unit/materials/production.test.mjs` (Trichter-Rückfall mit Lückenregel, Vorschläge, Serverberichte `store.yield`, entfernte Truhe, keine Lagerbuchung).
- `tests/e2e/production.e2e.mjs`: neuer Fall bei 1400 px – Team gründen, Server-Export mit Lagerkiste und zwei Ertragsmeldungen einlesen, Vorschlag „Als Sammeltruhe verknüpfen“, Rate 300 Eisen/h aus 450 Barren in 90 min, kein Eintrag im Ertragsbuch.
- Grenzen: Vertrag `store.yield` deckt sich mit COOP-08 (Plugin), aber noch kein Durchlauf mit echtem Server-Export; Test im Spiel offen.

## LINK-01 … LINK-05 · Server ohne Befehle · 04.11.2026 · Claude

- Einheiten: `LinkCoreTest` (Paper: Rundlauf, Prüfvektor, Wiederholung, falsche Unterschrift, fremder Server, unbekannte Aktion, Einstellungsliste, Obergrenze), `LiveLinkTest` (Mod-Kern: Zulassen per Klick, Ablehnen, Ablauf, Obergrenze, Server-Routen nur mit Token), `tests/unit/team/server-link.test.mjs` (gleicher Prüfvektor, Freigabe-Link), `tests/unit/team/team-room.test.mjs` (Raum-Weiterleitung).
- Browser: `tests/e2e/server-link.e2e.mjs` gegen den Mod-Simulator mit Plugin-Ersatz – PC 1400/390 px (Kopplung per Klick, Server koppeln, signierte Einstellung, Freigabe-Link) und iPad 820 px ohne Mod über einen Raum-Ersatz (Einstellung ändern, Server offline klar gemeldet).
- Echter Server: `scripts/mod/test_bridge_paper_link.sh` – Paper 1.21.11 mit `minecraft-protocol` als Client: Selbsteinrichtung, Nicht-OP abgewiesen, Kopplung, 2 Einstellungen, Team, Wiederholung/falsche Unterschrift/fremder Server/Einstellung außerhalb der Liste abgewiesen, Neustart behält Kopplung und Nummer, Gerät entfernen; mit `BAUPLANER_ROOM` (wrangler dev) Steuerung über den Team-Raum. Bestehende Paper-Tests (Teambau 1.21.11/26.3, Lagerkisten, Team-Raum) weiter grün.
- Spiel: `scripts/mod/test_bridge_ingame.sh` (Fabric 26.3) klickt „Planer zulassen“ mit der Maus; Schlüssel kommt genau einmal.
- Grenzen: Der Protokoll-Client kann Paper 26.3 noch nicht (Bibliothek bis 26.1), daher Servertest auf 1.21.11; kein Test mit Philipps echtem Server und Modpack; Plan-Upload aus dem Planer (LINK-06) offen.
- Nachtrag nach Rebase auf PROD-01…04 (04.11.2026): `npm run check` 823/823 grün; Browser `server-link`, `team-live`, `team-room`, `mod-download`, `livelink` grün (der überflüssige Link „Mod herunterladen“ im Bereich „Spiel und Server verbinden“ wurde entfernt, er zeigte auf dieselbe Seite und brach den Download-Test).

## LINK-05/06 · iPad-Weg gegen den echten Team-Raum, Plan auf den Server · 04.11.2026 · Claude

- `TEAM_ROOM_URL=https://bauplaner-team.team-room.workers.dev node --test tests/e2e/server-link.e2e.mjs`: 3/3 grün – iPad 820 px über den echten Dienst (Freigabe-Link, Einstellung, Plan von der Weltkarte mit Anker, Server offline klar gemeldet); ein WebSocket mit Serverschlüssel spielt das Plugin.
- `BAUPLANER_ROOM=https://bauplaner-team.team-room.workers.dev scripts/mod/test_bridge_paper_link.sh`: Paper 1.21.11 – zusätzlich Plan mit Anker per Steuernachricht abgelegt, kaputter Plan abgewiesen und nicht abgelegt; Steuerung über den echten Raum.
- Grenzen: Serveraufnahme per Steuernachricht noch offen (LINK-06-S02); Planlimit über den Raum 700 KB, über die Mod 4 MB.
## COOP-08 · Ertragskisten für das Ertragsbuch · 04.11.2026 · Claude
- `node --test tests/unit/team/lager.test.mjs`: neu Ertragskiste (Zweck ertrag, Farm, store.yield nur vom Server, unbekannte Kiste abgelehnt, Summe und Meldungen, Farm der Kiste als Rückfall, Prüfung von Datum/Minuten).
- `scripts/mod/test_bridge_paper_lager.sh` auf echten Paper-Servern 1.18.2 (388), 1.21.4 (232), 26.3 (240): Kürbistruhe markiert, `lager farm … Kürbisfarm` (Farm aus `farms` der Serverdatei), Trichter legt 6 Kürbisse ein, `info` zeigt „6 Items in N min geladen“, beim Herunterfahren ein `store.yield`; Planer-Faltung: Zweck ertrag, Farm, yieldIn, eine Meldung, höchstens 2 Trichterbuchungen (gebündelt). Alle bisherigen Lagerschritte weiter grün; `test_bridge_paper_team.sh 26.3` grün.
- Gradle `:paper:build`, `:mod-core:test` (Befehlskatalog mit `lager farm`, Zweck ertrag) grün.
- Grenzen: Laufzeit über eine echte Farm und Spielereinlagen von Hand nur auf Philipps Server (LAGER-10); die Rate im Reiter „Produktion“ baut PROD-05.


## GROSS-01-S07 · Bibliothek Runde 2 · 04.11.2026 · Claude

- Blocklogik: Klosteranlage und Universität ohne Befund (Halt, Verbindungen, Zustände, Drehen/Spiegeln).
- `tests/unit/catalog/grossprojekte.test.mjs`: 11/11 bestanden mit 13 Großprojekten; Residenzstadt und Klosterdorf je 27 Gebäude ohne Voxelkonflikt.
- Sichtprüfung im Browser: beide Großbauten in 3D (Iso, Nord, Draufsicht), beide Großprojekte im Planer mit Lageplan.
- Grenzen: Abnahme im Spiel offen (BIB-13).

## GAME-07-S07, GAME-08-S05 · Mod 0.13.0: Packliste, Gerüst, Markierungen aus dem Spiel · 04.11.2026 · Claude

- Mod-Kern (JUnit): `StageSixTest` (Packliste zieht Getragenes ab, Stapelgrößen, nächste Lagerkiste zuerst, Shulkerkisten; Gerüst: nur der freischwebende Block hängt, Sand über Luft fällt, mit Block darunter nicht), `GameMarksTest` (Ausgang übersteht Neustart, Quittung/Löschen, Zeitformat, Merkmal `marks3`), `LiveLinkTest`, `CommandCatalogTest` (neue Befehle auf der Befehlsseite).
- Spiel: `scripts/mod/test_bridge_ingame.sh` (Fabric 26.3) und `scripts/mod/test_bridge_ingame_forge.sh neoforge` bestanden; beide führen `packliste`, `geruest`, `markieren lager Testlager` und `markierungen loeschen 1` aus, `scripts/mod/bridge_gametest.mjs` prüft die Antworten (Gerüst am Testplan: kein hängender Block).
- Website: `tests/unit/team/livelink.test.mjs` (Leser `readLiveGameMarks`, `gameMarksToItems` ohne Doppelte, gültiger Weltplan-Eintrag); Browser `tests/e2e/map-depth.e2e.mjs` 3/3 (Simulator mit `marks3`: zwei Punkte übernehmen, Quittung, verlorene Quittung legt nichts doppelt an, ein Rückgängig).
- Grenzen: kein Test auf Philipps Server und mit echten Lagerkisten im Spiel (MOD-17); Gruppen/Sperren aus dem Weltbuilder (GAME-07-S11) offen.

## GFX-02 · Darstellung und Leistung, Runde 2 · 04.11.2026 · Claude

- `npm run check` grün nach Rebase auf f646511 (848 Tests: 847 bestanden, 1 übersprungen; neuer Testfall DATEI-09 für GFX-02 im Testplan), darunter neu `tests/unit/web/graphics2.test.mjs` 9/9: Biomfaktoren, Farbklassen je Fläche (Grasblock nur oben bei eigenen Formen, Fichtenlaub fest), Lichtquellen und Magma voll hell im geschlossenen Raum, Leuchtfeuer (Pyramidenstufen, erste Glasscheibe setzt, weitere mischen, Grundgestein lässt durch, Stein sperrt), Strahl im Netz (voll hell, endet 32 Blöcke über dem höchsten Block, zwei Farben mit Glas), Dach in einem anderen Abschnitt baut den Leuchtfeuer-Abschnitt neu und inkrementell = neu, Farbkachel im Schnappschuss, progressiver Upload (nächster Abschnitt zuerst, kein Loch während des Hochladens, Budget wächst/schrumpft).
- Browser (Chromium 1243 per `PLAYWRIGHT_BROWSERS_PATH` als 1248 verlinkt): `tests/e2e/graphics2.e2e.mjs` 2/2 (Garten mit Teich, Laub und zwei Leuchtfeuern: `data-beacons` 1/2, Menü „1 von 2 leuchten“; Sumpf weniger grün, Kirschblütenhain heller grün, `data-build-ms` unverändert, Speicherung über Neuladen; Feld 96 × 24 × 96 mit rund 150 000 Blöcken in mehreren Bildern hochgeladen, danach Auswahl mit Koordinaten), `tests/e2e/library-filters.e2e.mjs` 1/1 (PERF-03: Suche „Turm“ und Liste bleiben über Detailseite, Weltkarte, Neuladen und geteilten Link erhalten).
- Gesamter Browserlauf `npm run test:e2e`: **160/160** bestanden (911 s).
- Grenzen: Software-WebGL; echte GPUs (Budgetregel), Firefox/Safari und Abgleich mit Spielbildern offen (GFX-02-S04).

## COOP-11, COOP-08-S03, PROJ-03, MAP-07 · Team verdichten, Planung Runde 3, gedrehte Weltlagen · 05.11.2026 · Claude

- `npm run check` grün (888 Tests, 887 bestanden, 1 übersprungen), neu: `tests/unit/team/team-digest.test.mjs` 10/10 (gleicher Teamstand vor/nach dem Verdichten, Produktionsrate und Trichterzeit bleiben, Merge alter Kopien ohne Doppelzählung, zweimal verdichten, Rechte, gefälschte und halbe Läufe, Postausgang Team live), `tests/unit/planning/program-absence.test.mjs` 4/4 (Abwesenheiten prüfen/zusammenführen, Zeitplan um Abwesenheiten, Basisplan-Verlauf, „abwesend bis“ aus dem Team), `tests/unit/world/world-turn.test.mjs` 5/5 (Drehregel gegen die Formel aus `Placement.java` für alle acht Lagen, Drehen an Ort und Stelle, Weltkarte mit gedrehten Zuständen und Überschneidungen, Hologramm/Plan/Teamdatei, Baustand/Bauführung/Geländebox).
- Browser (Chromium 1243 per `PLAYWRIGHT_BROWSERS_PATH` als 1248 verlinkt): voller Lauf `npm run test:e2e` 166/166 vor MAP-07; danach neu `team-digest.e2e.mjs` 2/2 (Ertragsbuch 300 cactus/h, Verdichten, gleiche Zahlen, Rückgängig), `program-absence.e2e.mjs` 2/2 (1400/390 px), `world-turn.e2e.mjs` 1/1 und die berührten Bereiche Weltkarte, Weltbuilder, Live-Karte, Baustand, Bauführung, Gelände, Landschaft, Anlagen, Basis, Planung, Team erneut.
- Grenzen: Abnahmen TEAMBAU-28, PROJ-20 und KARTE-07 offen; der Raum behält alte Ereignisse (nur Kopien werden kleiner); das Server-Plugin legt Pläne weiter nur ungedreht ab.
- Nachtrag: `check:roadmap-change` beim Veröffentlichen verlangte eine Zuordnung für diese Datei und die übernommenen Restpunkte (MAP-05, COOP-01, PROJ-02); nachgetragen.

## SPLIT-01-S06, MODEL-01-S06, MAT-03-S03 · Unterirdisch und Brücken, Druckhülle zusammengefasst, Materialvarianten im Profil · 05.11.2026 · Claude

- `tests/unit/core/split-under.test.mjs` 4/4: Brücke zwischen zwei Häusern (eigener Teil, `connects` beide, Häuser bleiben getrennt, Ausschnitt nur Deck und Geländer), Steg über Wasser ohne Gebäude (Brücke) und breite Traufe (bleibt beim Haus), Bunker unter Gras (eigener „Unterirdischer Raum“, Höhe 6, Ausschnitt ohne Boden), Keller unter und neben einem Haus (gehört zum Haus, „mit Keller“). `tests/unit/catalog/base.test.mjs` 10/10 unverändert (Starterbasis: gleiche Gebäude, Felder, Wegenetz).
- `tests/unit/formats/model3d.test.mjs` 16/16, neu: Stufenpyramide mit Loch und zwei Farben sowie 12 zufällige reparierte Formen – zusammengefasste Hülle wasserdicht (0 offene Kanten), gleiches Volumen wie Einheitsflächen, weniger als halb so viele Flächen; Würfel 3×3×3: 6 statt 54 Flächen.
- `tests/unit/core/variants.test.mjs` 13/13, neu: jede Form jedes Materialsatzes (Holz, Stein, Farbe, Glas, Beton, Terrakotta, Kupfer) steht im Profil Java 26.3 und hat je Art und Form dieselben Eigenschaften und Werte.
- Browser: `tests/e2e/mat-variants.e2e.mjs` 2/2 (Leuchtturm 1400/390 px: Beton, Klarglas und Terrakotta getrennt umgefärbt, 208 Blöcke, kein fehlendes Gegenstück, gespeicherte Variante enthält genau die neuen Farben), `base.e2e.mjs`, `model3d.e2e.mjs`, `schem.e2e.mjs` grün.
- Grenzen: Abnahmen BIB-11 mit echten Basen, PROJ-05 im Slicer und PROJ-14 im Spiel offen.

## MAP-02 · Gespeicherte Server-Karten, BlueMap-/Dynmap-Marker, Markerdatei als Punkte · 05.11.2026 · Claude

- Formate aus Primärquellen geprüft (BlueMap-Wiki „Markers“, Dynmap-Wiki „Using markers“/„Commands“, squaremap/Pl3xMap README), Tabelle in `docs/architecture/welt/LIVEMAP.md`.
- `tests/unit/world/livemap-export.test.mjs` 5/5: gespeicherte Karten (Prüfung, gleicher Name ersetzt, Grenze 20, Datei hin und zurück, Zusammenführen), Markerdatei → Weltplan-Punkte ohne Doppelte, Formen je Dimension und Gruppe, BlueMap-`marker-sets` (extrude/shape/line/poi, JSON-/HTML-Maskierung, ausgeglichene Klammern), Dynmap-Befehle (deleteset/addset/addcorner/addarea/addline/add).
- Browser: `tests/e2e/livemap-export.e2e.mjs` 2/2 (1400/390 px) und `tests/e2e/worldmap.e2e.mjs` 2/2 (Knopf jetzt „Marker (JSON, Bauplaner-Format) herunterladen“).
- Offen: Abnahme KARTE-08 auf einem echten Kartenserver.

## PROJ-04 · Reihenfolge zwischen Projekten · 05.11.2026 · Claude

- `tests/unit/planning/project-order.test.mjs` 3/3: „erst nach“ anlegen/prüfen/entfernen (Selbstbezug, doppelt, unbekannte Felder, Grenze 16), Verknüpfungen ohne gelöschte Projekte, Kreis mit Namen, Stufen, Nachfolger, frühester Start aus dem aktiven Basisplan (Ende, fertig, offen, gelöscht).
- Browser: `tests/e2e/project-order.e2e.mjs` 1/1 (Basisplan in A, B erst nach A mit Grund, zu früher Start mit einem Klick korrigiert, Kreis in A abgewiesen, Weltkarte „Erst nach … (bis …)“, entfernen); erneut grün: `program*.e2e.mjs`, `world-turn`, `worldbuilder`, `worldmap`, `livemap-export`.
- Offen: Abnahme PROJ-21.

## TERRAIN-03-S06, PROD-04, COOP-06, PROJ-01 · Prüfrunde Bibliothek/Welt/Team, Küste im Basisplaner · 05.11.2026 · Claude

- Ausgangsstand 98f41eb: `npm test` 899/901 (1 Fehlschlag `tests/unit/tooling/pages.test.mjs` nur ohne vorherigen Webbuild, danach 2/2), Browser der Bereiche (Katalog, Filter, Start, Sammlungen, Generatoren, Großprojekte, Anlagen, Basis, Bauwelten, Beiträge, Weltkarte, Weltbuilder, Weltimport, gedrehte Lagen, Kartentiefe, Gelände, Landschaft ×3, Team, Teamplanung, Team live, Verdichten, Produktion, Kartenexport, Projektreihenfolge) 53/53; Durchklickprüfung aller Bibliotheks-, Welt- und Projektreiter (1400 und 390 px, jeder Reiter-/Bereichsknopf) ohne Seiten-/Konsolenfehler und ohne Querscrollen.
- Neu `tests/unit/catalog/base-shore.test.mjs` 6/6 (alle vier Wasserseiten am geplanten Ufer, Verschiebung ans echte Ufer in beide Richtungen und erneute Prüfung ohne Rest, zu weit/kein Ufer, Binnenland mit Küste im Osten, Bach, Bucht, Halbinsel, Aufnahme zu klein, Aufnahmerand, ungültiger Versatz); `tests/unit/materials/production.test.mjs` +1 (AFK-Annahme).
- Browser `tests/e2e/base-shore.e2e.mjs` 2/2 (Chromium 1400/390 px, Port 4331): Projekt mit Weltlage und Küsten-Geländeaufnahme per Sicherung, Kasten „Küste“, Wasserseite übernehmen, ans echte Ufer schieben, Übernahme mit Stegen hinter dem echten Ufer.
- Nach den Änderungen: `npm run check` grün (909 Tests, 908 bestanden, 1 übersprungen); Browser base, base-shore, production, teamplan, team, team-live, team-digest, program ×3, project-order, build-run, site, app 28/28; base + terrain 3/3.
- Grenzen: echte Küste nur mit synthetischer Aufnahme geprüft (Abnahme BIB-19 mit eigener Welt offen); Wegenetz der Basis als Landschaftsweg (TERRAIN-03-S08) offen; Ortszeit-Tagesdatum nicht mit verstellter Zeitzone im Browser geprüft.

## CORE-04 · Planer-Kernmodule geprüft und Fehler behoben · 05.11.2026 · Claude

- Grundlage: main 44d877e (nach STRUCT-01 Stufe 2) plus dieses Paket.
- `npm run check` grün (916 Tests, 915 bestanden, 1 übersprungen). Neu: `tests/unit/core/core-links.test.mjs` 4/4 („erst nach“ im Verweisgraphen, Datencheck-Hinweis für gelöschten Vorgänger, Löschen räumt Nachfolger und Bauplätze auf, Rückgängig/Wiederholen behalten live empfangene Teamereignisse, Teamimport bleibt rückgängig machbar); `tests/unit/building/block-content-edit.test.mjs` +1 (verschobener Gegenstand behält Komponenten, unveränderter Name und Schildzeilen bleiben formatiert, gefilterter Text nur bei unveränderter Seite); `tests/unit/editor/editor-patterns.test.mjs` erweitert (Schablone behält Ausstattung).
- Browser (Chromium 1243 als 1248 verlinkt): voller Lauf 77 Dateien, 175 Tests; `team-room.e2e.mjs` schlug einmal mit Zeitüberschreitung beim Warten auf „live“ fehl und lief danach zweimal hintereinander grün (2/2), wird als wackelig beobachtet. Davor auf dem Stand vor dem Rebase: Werkstatt-, Editor-, Ausstattungs-, Speicher-, Reihenfolge-, Team- und Baustellentests grün.
- Nicht automatisch geprüft: Schem-Import über dem bisherigen Litematic-Knotenlimit (braucht >16 Mio. Knoten große Datei), Sicherungsgrenze von 100 MB (braucht >100 MB Testdaten), Touch-Abbruch eines Strichs (Systemgeste). Diese drei sind per Codeprüfung belegt; Abnahme PROJ-22 offen.

## PERF-06-S01 · Offline-Speicher (Service Worker) · 05.11.2026 · Claude

- `npm run check` grün (919 Tests: 918 bestanden, 1 übersprungen), darin neu `tests/unit/tooling/service-worker.test.mjs` (Manifest ohne Katalogdatei, Version folgt Inhalt, Notbremse, Publisher erlaubt `sw.js`).
- Browser: `tests/e2e/offline.e2e.mjs` 3/3 (Chromium 1243 per `PLAYWRIGHT_BROWSERS_PATH` als 1248 verlinkt): alle 104 Programmdateien gespeichert, Neuladen ohne Programmdatei aus dem Netz, Start und Systemseite ohne Netz, alte Dateien fallen beim Aktivieren weg, Ausschalten entfernt Worker und Speicher dauerhaft, ohne Testschalter bleibt er in automatisierten Browsern aus (übrige Browsertests unberührt).
- Offen: Safari/iPad und Firefox auf echten Geräten.

## PERF-06-S02 · Cloudflare Pages als zweite Adresse · 05.11.2026 · Claude

- `tests/unit/tooling/cloudflare-pages.test.mjs` 1/1 (Upload-Ordner, Mod-Downloads, `_headers`, `_redirects`), `tests/unit/team/team-room.test.mjs` 5/5 nach neuer Herkunft.
- Live (Upload aus dem geprüften Artefakt von 9c76f89): `/` → 302 auf `/Minecraft-Bauplaner/`, Startseite, `sw.js`, `deployment.json` und ein Mod-Download 200; `assets/*` mit `content-encoding: br` und `max-age=31536000, immutable`. Chromium gegen die Live-Adresse: Start bis Projektzentrale aus der Katalogdatei (`snapshot`), Service Worker steuert die Seite, keine Seitenfehler.
- Offen: Team-Raum-Deploy mit neuer Herkunft, Mod-Herkunft (S03); Safari/iPad.

## GAME-09 · Modrinth-Seite vollständig: Offenlegungen, Galerie, Icon · 05.11.2026 · Claude
- `tests/unit/mod/modrinth.test.mjs` 5/5 (neu: Offenlegungen ai_content code+text, telemetry opt_in, system_interactions mit 127.0.0.1; kaputte Offenlegung wird abgelehnt).
- Echter Spieltest Fabric 26.3 (`scripts/mod/test_bridge_ingame.sh`, BAUPLANER_KEEP) bestanden; daraus neue Galeriebilder (Hologramm, Materialliste, Befehle & Status, Team-Befehle, Team-HUD, „Planer zulassen“). Icon jetzt ein Ausschnitt einer echten Spielaufnahme (Geisterblöcke mit Shader) statt der gezeichneten Würfelgrafik.
- Echte Modrinth-API: `sync` setzte Beschreibung (Stand 0.17.0), Offenlegungen (API v3 `PATCH /project/{id}/disclosures` mit `set`/`remove`), Icon (Vergleich über SHA-1 im raw_icon_url) und Galerie (4 alte Bilder entfernt, 6 neue, Reihenfolge und Hervorhebung); zweiter Lauf: alles „aktuell“, nichts doppelt. `release` ruft danach immer `sync` auf.
- Befund nebenbei: Im Planmenü überlappen bei 854×480 „Befehle & Status“/„Fertig“ die Zeile „Abschnitt: alle“ (kleines Fenster/hohe GUI-Größe).

## PROJ-05 · Bauleute-Konto und Bauleute aus dem Spiel · 06.11.2026 · Claude

- Grundlage: main 4aaac11 plus dieses Paket.
- `npm run check` grün (924 Tests: 923 bestanden, 1 übersprungen), neu `tests/unit/planning/builder-account.test.mjs` 3/3 (ohne Team nur Bedarf; eigene und fremde Sammelzusagen, Lieferung, Saldo, Live-Anwesenheit mit Spiel vor Planer und ohne Serverschlüssel, Kandidat und fremder Spieler, Übernahme und Bauzettel; „ohne Zusage“ einmal je Item).
- Browser (Chromium 1243 als 1248 verlinkt): voller Lauf 78 Dateien, 181/181 grün, darin neu `tests/e2e/builder-account.e2e.mjs` 2/2 (1400/390 px, Port 4371: Team gründen, Lieferung 32 oak_log, Sammelzusage 10 cobblestone, Kandidat in der Planung, „Team übernehmen“, Rückgängig, Konto mit „zugesagt 10“, „eingebracht 32“, „Saldo +32“, kein Querscrollen).
- Nicht automatisch geprüft: echte Live-Anwesenheit eines Mitspielers mit Mod im Team-Raum (im Einheitstest mit Anwesenheitsdaten belegt); Abnahme PROJ-23 offen.

## GFX-03 + PERF-05-S07 · Große Szenen flüssig, Mod/Plugin-Analyse · 06.11.2026 · Claude

- `npm run check` grün (925 Tests, 924 bestanden, 1 übersprungen), darin neu `tests/unit/web/graphics3.test.mjs` 4/4 (Sortierreihenfolge gleich Abstandssortierung auf 1/64 Block, 200 Zufallsstrahlen gleich allen Meshes und Zelle enthält Trefferpunkt auf sortiertem Glas, Sortierbudget/Sichtfeld/Ruhe, Sichtfeld beim Hochladen). Der Glas-Treffertest schlägt mit dem alten Stand fehl.
- Browser: voller Lauf `npm run test:e2e` 179/179 (Chromium 1243 als 1248 verlinkt), `graphics2.e2e.mjs` prüft zusätzlich `data-sorting` = false nach dem Feld mit Glas.
- Messung Node (1,56 Mio. Blöcke, 1,8 Mio. durchscheinende Flächen): alles sortieren 400–460 → ~200 ms, im Betrachter höchstens ~25 ms je Bild; Anklicken 11–19 → 3–4 ms.
- Paper-Plugin: `./gradlew -PwithPaper :paper:build` (Unit-Tests) grün; echte Server `scripts/mod/test_bridge_paper_lager.sh 1.21.11` (45 Lagerereignisse, Planer-Faltung = Serverzustand) und `test_bridge_paper_team.sh 1.21.11` (30 Ereignisse) grün. 1.18.2 und 26.3 nicht gelaufen (kein JDK 25; Skript bricht ohne `BAUPLANER_JAVA25` wegen `pipefail` ab, Umgehung `BAUPLANER_JAVA25=none`).
- Offen: echte GPU, Firefox/Safari (GFX-03-S04, Testfall DATEI-10).

## MAP-04-S07 + GAME-07-S11 · Gruppen und Sperren im Weltplan und Hologramm (Mod 0.19.0) · 06.11.2026 · Claude
- `npm test` grün (925 Tests: 924 bestanden, 1 übersprungen), neu `tests/unit/world/worldgroups.test.mjs` 4/4 (Schema 3 rundum, Sperre verhindert Löschen/Umformen, Entsperren rückgängig machbar, Gruppen umbenennen/auflösen, Duplikate entsperrt); Weltplan-Schema 4 wird abgelehnt, Schema 1/2 bleiben bytegleich.
- mod-core JUnit grün, neu `MarkAreasTest` (Bauplatz, Zone, Weg mit Breite, Gruppe, Sperre, leere Fläche); `LiveLinkTest` mit Fähigkeit „groups“ und `/v1/group` (401 ohne Schlüssel).
- Echter Spieltest Fabric 26.3 (`scripts/mod/test_bridge_ingame.sh`) und NeoForge 26.3 (`scripts/mod/test_bridge_ingame_forge.sh neoforge`) bestanden: gesperrter Bauplatz der Gruppe „Markt“ über dem Plan, `POST /v1/group` beschränkt das Hologramm, unbekannte Gruppe 400, Status nennt `group: "Markt"` und `locked: 54` (= alle Blöcke des gezeigten Abschnitts), `/bauplaner gruppe` listet die Gruppe; danach volle Rückkehr zum ganzen Plan, alle übrigen Schritte unverändert grün.
- Browser: `tests/e2e/world-groups.e2e.mjs` (Gruppe zuweisen, Klick wählt Gruppe/zweiter Klick Eintrag, Sperren blockiert Verschieben/Löschen, Gruppe ausblenden, Rückgängig, Neuladen, Mod-Simulator mit `/v1/group`), `map-depth.e2e.mjs` (neuer Hinweis „fehlt: Gruppen und Sperren im Hologramm“), voller Lauf siehe unten.
- Nicht automatisch geprüft: iPad-Bedienung, Grau-Darstellung mit Shadern; Abnahme KARTE-09 und MOD-21 offen.
- Voller Browserlauf: 180 Tests, 178 bestanden; die zwei Ausfälle: `shell.e2e.mjs` lief allein grün (Last durch den gleichzeitigen NeoForge-Spieltest), `worldbuilder.e2e.mjs` fand einen echten Fehler (Gruppenwahl machte die Auswahlleiste zweizeilig hoch und schob die Karte aus dem Bild) – Ebenen- und Gruppenwahl stehen jetzt nebeneinander, danach world-groups, worldbuilder, map-depth und livelink 8/8 grün.
- Browser nach dem Rebase: voller Lauf 182 Tests in zwei Teilen (117 + 65), alles grün bis auf `shell.e2e.mjs` (Lesen von aria-current vor dem Neuzeichnen der Navigation, 2 von 3 Läufen rot); Test wartet jetzt auf den markierten Link, danach 4/4 grün.
- Neu auf 0.19.0 nach Rebase auf die Mod 0.18.0 des Werkzeug-Threads (Bauhilfen): mod-core JUnit grün, echte Spieltests Fabric und NeoForge 26.3 erneut bestanden (Gruppe „Markt“, 54 gesperrt), `npm run check` grün (944 Tests: 943 bestanden, 1 übersprungen), voller Browserlauf 184 Tests: 182 grün, `mod-download.e2e.mjs` lief zuerst gegen den Build vor `release_mod` und ist nach neuem Build 2/2 grün.
- Galeriebild 0.19.0: Fabric-Spieltest nimmt bei jedem Lauf `gruppe-galerie.png` auf (Turm normal, Mauer in gesperrtem Bauplatz grau, ohne HUD); Spieltest danach bestanden (Gruppe „Markt“, 54 gesperrt).

## WORLD-SHARE-01 · Weltplan und Server-Karte über den Team-Raum (Mod/Plugin 0.22.0) · 06.11.2026 · Claude
- `npm run check` grün (956 Tests: 955 bestanden, 1 übersprungen); neu `tests/unit/world/world-share.test.mjs` (Dreiwege-Abgleich je Eintrag, Marker je Dimension, Kartenliste) und in `tests/unit/team/team-room.test.mjs` die geteilten Dokumente (Revision, If-Match → 409, `?known` → unverändert, Serverschlüssel nur lesen, Ankündigung).
- Java: `core`, `mod-core` (RoomClient folgt dem Dokument gegen `wrangler dev`, `MarkAreasTest.sharedWeltplanIsCutPerDimension`) und `paper` (`WorldShareTest` 3/3) grün.
- Echter Spieltest Fabric 26.3 und NeoForge 26.3 bestanden: ein Planer legt den Weltplan in den Raum, die Mod zeigt ihn ohne Planer-Verbindung (`teamMarks: 4`, davon 3 in der Oberwelt, Marktplatz gesperrt grau); Galeriebild `weltplan-galerie.png`.
- Echter Paper-Server (`scripts/mod/test_bridge_paper_world.sh`): Paper 26.3 + BlueMap 5.29 und Paper 1.21.4 + Dynmap 3.7-beta-8 – Marker aus dem Raum selbst geschrieben, Neuladen per Ankündigung, Neustart aus dem Zwischenspeicher.
- Browser: `team-room.e2e.mjs` (zwei Browser, Raum-Weltplan mit Sperre kommt an, Punkte des einen erscheinen beim anderen und im Raum; nach „Einladung erneuern“ nimmt der Planer den gültigen Schlüssel), `livemap-export.e2e.mjs` (Datei-Wege nur unter „Notfall“).
- Offen: Abnahme KARTE-10..12 durch Philipp.
- Nach Rebase auf main mit Mod/Plugin 0.21.0 (LINK-11): `npm run check` grün (957 Tests: 956 bestanden, 1 übersprungen), Java core/mod-core/paper grün, voller Browserlauf vor dem Rebase 186/186, danach die betroffenen Browsertests 27/27 grün; Spieltest Fabric 26.3, Paper 26.3 + BlueMap und Paper-Team-Raum-Test erneut bestanden.

## GUIDE-01 · Anleitung „Wie geh ich es an?“ · 06.11.2026 · Claude
- `npm run check` grün (955 Tests: 954 bestanden, 1 übersprungen), neu `tests/unit/web/guide.test.mjs` 3/3 (ein Satz ≤ 110 Zeichen je Schritt, höchstens vier Wörter Titel, Symbole vorhanden, kein Dateiweg als Hauptweg, Routen und Projektreiter gültig, Projektlinks mit Sonderzeichen, Adresse `?weg=&schritt=`, Fortschritt, kaputte Speicherdaten).
- Browser: neu `tests/e2e/anleitung.e2e.mjs` 2/2 (Einstieg aus der Projektzentrale, sechs Wege, Grafik je Schritt, ohne Projekt zur Projektzentrale, mit Beispielprojekt in dessen Reiter „Gelände“, Voraussetzung wechselt den Weg, Tastenkappe J, Haken nach Neuladen, Schnellsuche; Handy 390 px ohne Überhang). `shell.e2e.mjs` 5/5 mit siebtem Navigationseintrag: Kopfzeile 1920–761 px ohne Überbreite (Anleitung unter 1600 px als ?-Symbol).
- Voller Browserlauf: 188 Tests, 187 grün; der Ausfall war der neue Test (Schnellsuche unter Last vor dem Öffnen getippt), wartet jetzt auf den Dialog, danach 3/3 grün.
- Nicht automatisch geprüft: iPad/Safari, Verständlichkeit der Sätze (Abnahme START-08/09 offen).

## UX-01 · Bedienung des Planers vereinfachen · 06.11.2026 · Claude
- `npm run check` grün; neu `tests/e2e/simple-ui.e2e.mjs` 2/2 (1400 und 390 px: vier Hauptbereiche plus Anleitung, Datei-Wege in der Fußzeile, Sicherung und Datei-Notfallwege eingeklappt, zwölf Projektreiter in vier Schritten mit Kurzsatz, Bibliothek in drei Gruppen, Mod-Seite mit drei Schritten und eingeklapptem Hintergrund, keine Überbreite).
- Angepasst, weil „Speicher & Sicherung“ jetzt eingeklappt ist (Helfer `openStorage` in `tests/e2e/start.mjs`): `backup-reminder`, `collections`, `persistence`, `stability`; `shell.e2e.mjs` zählt 5 Hauptlinks.
- Voller Browserlauf vor dem Rebase in fünf Teilen: alles grün bis auf `offline.e2e.mjs` „alte Programmdateien fallen weg“ – schlägt auf unverändertem main (de68c45) genauso fehl, nicht von UX-01 verursacht.
- Nicht automatisch geprüft: iPad/Safari und Verständlichkeit (Abnahme START-10..12 offen).
- Nachtrag UX-01-S06 (Werkstatt, Baustelle, Produktion eingeklappt): voller Browserlauf in fünf Teilen 190/190 grün (auch `offline.e2e.mjs` diesmal grün); angepasst `site`, `production`, `workshop-creative`, `workshop-tools` (öffnen die eingeklappten Bereiche vor der Nutzung). Abnahme START-13 offen.


## PERF-06 · Offline-Speicher-Browsertest stabilisiert · 06.11.2026 · Claude

- Ursache: `offline.e2e.mjs` wartete höchstens 20 s, bis ein neuer Service Worker (`sw.js?neu=1`) aktiv ist; unter Last (voller Browserlauf, frischer Build) reichte das nicht. Außerdem teilte er Port 4317 mit `catalog-snapshot` und `teamplan`. Jetzt eigener Port 4387, bis 60 s Wartezeit, Fehlermeldung nennt aktive/wartende/installierende Worker. Keine Prüfung abgeschwächt.
- `offline.e2e.mjs` 3/3, fünfmal hintereinander, davon dreimal unter künstlicher CPU-Last; voller Lauf `npm run test:e2e` 189/190, der eine Ausfall ist `simple-ui.e2e.mjs` (UX-01, wechselnd 1400 px/390 px, nicht Offline-Speicher).
- Nachtrag: `simple-ui.e2e.mjs` wartet jetzt auf den Kurzsatz des jeweiligen Reiters (`.tab-hint[data-tab-hint=…]`) statt ihn direkt nach dem Hashwechsel zu lesen; 6 Läufe hintereinander, teils unter Parallellast, grün.
## UI-03 · Design-System und Thema „Werkbank“ · 06.11.2026 · Claude
- `npm run check` grün (959 Tests: 958 bestanden, 1 übersprungen); `tests/unit/web/theme-tokens.test.mjs` prüft jetzt sechs Themen (Kontrast Text/Akzent/Knopf ≥ 4,5 hell und dunkel), `theme-preferences.test.mjs` mit Standard „werkbank“.
- Neu `tests/e2e/design.e2e.mjs` 5/5: Standardthema beim ersten Bild samt `theme-color`, WCAG-Kontrast aller sichtbaren Texte auf Projektzentrale, Anleitung, Bibliothek, Generatoren, Weltkarte, Spiel, Systemcheck und den Reitern Editor/Bauen/Material/Baustelle/Team (hell und dunkel), iPad Pro 11 (Ziele ≥ 44 px, Reiter in der Leiste, keine Querverschiebung), „Bewegung reduzieren“.
- Die Kontrastprüfung fand ältere feste Farben (Sterne hell, Generator-Chips, Spielprüfungsleiste, Bauphasen-Abzeichen); alle auf Tokens umgelenkt.
- Voller Browserlauf 1: 188/191; Ursachen behoben: Kopfbereiche animieren nur noch die Deckkraft (Abbrechen-Knopf war während des Aufstiegs „nicht stabil“), zwei Kartentests rückten die Karte so in die Mitte, dass die Werkzeugleiste unter der klebenden Kopfzeile lag (jetzt `block: 'end'`).
- Voller Browserlauf 2 nach Rebase auf GUIDE-01/WORLD-SHARE-01: 191/193; `background-jobs` fiel nur, weil parallel `npm run check` die Pages-Ausgabe neu baute (allein 3/3 grün); `shell.e2e.mjs` fand 10 px Überbreite bei 761 px (siebter Menüpunkt „Anleitung“ + breiteres Darstellungsfeld) → unter 1000 px zeigt „Darstellung“ nur das Farbfeld; danach shell 5/5, theme 2/2, ui-acceptance 4/4, design 5/5, background-jobs 3/3.
- Nach Rebase auf UX-01 (vier Schrittgruppen): Schrittgruppen mitgestaltet (aktive Schrittnummer in Akzentfarbe, ohne Ausblendkante); `simple-ui.e2e.mjs` las den Kurzsatz direkt nach dem URL-Wechsel (1 von 3 Läufen rot); die Wartestelle kam zeitgleich vom UX-01-Thread und ist übernommen. Voller Browserlauf 3: 194/195, einziger Ausfall `offline.e2e.mjs` (Service-Worker-Aktivierung unter Last), allein zweimal 3/3 grün.
- Voller Browserlauf 4 (nach Rebase auf PERF-06-Teststabilisierung): 194/195, erneut nur `offline.e2e.mjs`: nach „Offline-Speicher leeren und ausschalten“ schrieb der alte Service Worker eine laufende Antwort zurück in einen neuen Speicher. `clearOffline()` löscht jetzt, bis der Speicher wirklich weg bleibt; danach offline 3/3 und unter Last (l*, m*, offline: 31/31) grün.
- Nicht automatisch geprüft: echtes iPad/Safari (Testfälle START-20/21).

## TERRAIN-05 · Gelände-Werkzeuge auf dem Projektgelände · 06.11.2026 · Claude
- `npm run check` grün (966 Tests bestanden); neu `tests/unit/world/terrain-sculpt.test.mjs` 5/5: Verwittern (Hanggrenze, gleiche Erdmenge, Schutzmaske, Pinselkreis, Wege/Wasser bleiben, Regenrinnen), alle fünf Formstempel, Fluss (Spiegel flussab nie steigend, Bett, Ufer halten das Wasser, Wegstufen entfernt), Maske für Anheben/Formstempel und Höhenfilter beim Absenken.
- Neu `tests/e2e/landscape-sculpt.e2e.mjs` 2/2 (Chromium 1400/390 px, Touch); zusammen mit landscape, landscape-paths, landscape-scatter, plan-landscape und terrain-game 12/12.
- Nicht automatisch geprüft: Abnahme im Spiel und auf dem iPad (Testfall PROJ-26).
- Voller Browserlauf auf main acd5d33 + TERRAIN-05: 197/197 grün (alle 85 Browserdateien).

## GAME-11-S02 + PERF-06-S03 · Mod auf Minecraft 26.4 vorbereitet · 06.11.2026 · Claude

- `./gradlew -PwithFabric264 :fabric-26.4:build` gegen 26.4-snapshot-7 (Fabric API 0.165.4+26.4, Loader 0.20.1) grün; `-PwithFabric -PwithNeoForge` für 26.3 unverändert grün.
- `BAUPLANER_MC=26.4 scripts/mod/test_bridge_ingame.sh` (weston, Mesa): bestanden – Aufnahme 146 korrekt/1 falsch/1 fehlt, Hologramm inkl. Röntgensicht und Platzierhilfe, Gruppen und Sperren, Oberfläche DE/EN, Website-Verbindung.
- `tests/unit/mod/mod-versions.test.mjs`: jede 26.3→26.4-Regel greift, eigener Schalter, keine 26.4-Datei in releases.json.
- PERF-06-S03: Team-Raum live (`OPTIONS` mit `Origin: https://bauplaner.pages.dev` → passender CORS-Kopf, fremde Herkunft nicht), Mod-Herkunft seit 0.17.2 in `LiveLinkTest`.
- Grenze: kein Spieltest mit Philipps Modpack unter 26.4 (Modpack gibt es nur für 26.3); NeoForge 26.4 ohne Builds.

### 06.11.2026 – QA-04 Testphase gekürzt und neu geordnet

- Grundlage: main 5b20f53 plus diese Änderung (testplan.ts, protocol.ts, TestphaseView.tsx, testphase.css, render_testplan.mjs, TESTPLAN.md, TESTPHASE.md, Tests).
- Testplan von 177 auf 106 Fälle (46 Kern) in drei Teilen (Browser, Minecraft, Paper-Server); jede frühere Fall-ID steht in `merged` eines aktuellen Falls, `ACCEPTANCE` nennt nur aktuelle IDs, kein implementiertes Paket verliert seine Abnahme (Vergleich alt/neu per Skript: 0 Pakete mit fehlender Zuordnung).
- `npm run check`: bestanden (962 Unit-Tests vor dem Rebase, darunter neu „Neuordnung: frühere Fälle …“ mit Übertragung alter Haken, `check:testplan` aktuell).
- `npm run test:e2e` in drei Läufen (je ≤ 10 min, alle 84 Dateien): 91 + 56 + 48 Browsertests bestanden; nach dem Rebase auf 5b20f53 erneut `npm run check` und `testphase.e2e.mjs`; `testphase.e2e.mjs` prüft neu drei Teile, zugeklappte Bereiche, Sprungleiste, Filter Ort/Kern/Erledigte, Suche nach früherer ID und `?melden=<frühere ID>`.
- Grenzen: Inhalt der Fälle nicht im Spiel nachgespielt; die Schritte sind aus den bisherigen Fällen zusammengeführt.
