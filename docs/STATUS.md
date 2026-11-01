# Aktueller Projektstand

Stand: 01.11.2026. Der verbindliche Aufgabenbestand steht in [ROADMAP](ROADMAP.md), die maschinenlesbare Quelle in [roadmap.json](roadmap.json). [ROADMAP_HISTORY](ROADMAP_HISTORY.md) protokolliert Arbeitsblöcke, Teilschritte und Dateien. Frühere Statusangaben stehen ausdrücklich historisch in [STATUS_HISTORY](STATUS_HISTORY.md).

## Implementierter Bestand

| Bereich | Vorhanden | Noch nicht vollständig abgenommen |
|---|---|---|
| Daten und Composer | Unveränderliche Voxel/AssetVersionen, Instanzen/Revisionen, Zellkonflikte, Undo/Redo, Snap/Händigkeit/Freiraum | Registryprofil, semantische BlockEntity-Transformationen |
| Formate | Sponge Schem v3 und Litematic mit Import/Export, Originalerhalt, Limits und unabhängigen Fixtures | echte WorldEdit-/Litematica-/Spielabnahme; kein Vollweltimport |
| Viewer | Orbit, Flug, Schnitte/Layer, Picking, Touchbedienung und Softwarefallback | exakte Blockformen, echte GPU-/iPhone-Prüfung |
| Bibliothek | 336 Gebäude in 22 Themen-Sets, 30 Variantenfamilien, 16 Ensembles, Suche/Filter, Vergleich, Merkliste, Varianten, elf Generatoren (neu GEN-02: Treppenhaus, Kirche, Hafen, Torhaus, Windmühle, Brunnen; Treppen-Eckformen wie im Spiel) und drei Anlagen (neu Dorfplatz, Burganlage mit Torhaus) sowie eigene Sammlungen (Ordner, Kategorien, Katalogfilter) und Vorlagen (Ensemble-/Generatorvorlagen mit Verlauf, LIB-02/LIB-03) | Echtgeräteabnahme der Sammlungen/Vorlagen; Redstone-Bauwerke nicht im Spiel abgenommen |
| Bau und Materialien | Bauitems, Rohstoff-/Rezeptauflösung, Packlisten, eigene Abschnitte, Lager-/Sammelplanung und Freiraumprüfung | versionsgebundener Katalog, Kupfer-Farbvarianten und erweiterte NBT-Diffs |
| Speicherung | IndexedDB, Projekt-Revisionsschutz, Originale, atomare Batches, Backup/Restore und Datencheck | Asset-Revisionsschutz und DB-v2-Migration mit drei echten Chromiumfällen geprüft; Cloud-/Gerätesynchronisierung und Safari/iPhone offen |
| Novemberoberfläche | fünf visuelle Themen mit Hell/Dunkel/System, Materiallabor, elf Bauwelten, 50 gezielte Glas-/Beton-/Terrakottasätze | aktuelle visuelle Abnahme; keine neuen Gebäude aus bloßem Themenzugang |
| Spielbrücke | Fabric-Mod 0.1.0 für 26.3 (Download mit Versionsauswahl unter #/mod), Aufnahmevergleich, Original/Verlauf/Ausrichtung lokal gespeichert und gesichert; Java-Kern mit Tests | Fabricadapter gebaut und im echten 26.3-Client samt Philipps Modpack automatisch geprüft, Mehrspieler-Abnahme offen; Vergleich ohne BlockEntity-Inhalte |
| Weltkarte und Team | generischer Livekarten-/Markeradapter | Weltkartenoberfläche, konkrete Provideradapter, Teamdienst/Konten noch nicht vorhanden |
| Hosting | Pages-API bestätigt main / Repositorywurzel, gehashter statischer Build und Artefakt-Kindcommit; Remote enthält nur main | Restoreprobe offen |

## Projektberechnung und weitere Leistungsarbeit

PERF-01 verbindet Projektauflösung, Bauanleitung, Material-/Schrittberichte und Baustellenplanung zu einem abbrechbaren Workerauftrag. Session und Ansichten teilen das Ergebnis; veraltete Antworten werden durch Jobtags und Eingabesnapshot-Identität abgewiesen. UI-Zustände für Rechnen, Abbruch, Fehler und Retry sind implementiert. Historische Revisionen bleiben getrennt. Acht neue Kern-/Lifecycle-Tests und echte Node-Workerübertragung prüfen diesen Umfang; aktuelle Gesamtprüfung steht in TESTING. Direkter veröffentlichter Desktop-Smoke mit Beispielprojekt, zwei schnellen Y-Änderungen und übereinstimmenden Bau-/Material-/Baustellenwerten bestanden. Automatisierte Worker-/DB-Regressionsfälle sind lokal bestanden. Die neue isolierte Produktionsmessung mit 64.000 synthetischen Zellen bestätigt identische vollständige Ergebnisse und deutlich kürzere Verzögerung der terminierten DOM-Interaktion mit Worker; Übertragung und Gesamtdauer bleiben teuer. Echte Geräte und vollständige React-/Viewer-Interaktionslatenz bleiben offen. Details: [PROJECT_COMPUTATION](architecture/PROJECT_COMPUTATION.md).

PERF-02 führt intern sichere numerische Zellindizes ein; öffentliche Besitzer-Maps und sämtliche Mengen/Koordinaten bleiben unverändert. Vergleich mit der bisherigen Komposition: 266.784 Zellen, sechs vollständige Resolution-Ausgaben mit identischem Hash; letzte Medianmessung 833,60 → 790,37 ms (5,2 %, Node-Szenario mit Streuung). Übertragungsformate, Chunkcache und selektive Neuberechnung sind weiterhin offen. Details: [COMPOSITION_PERFORMANCE](architecture/COMPOSITION_PERFORMANCE.md).

STORE-02 ist als Quellcommit `8f22780`, Artefaktcommit `e860c84` integriert/veröffentlicht; seine echte DB-/Zwei-Tab-Abnahme ist inzwischen unter lokalem Chromium bestanden. WORLD-02 des anderen Clients wurde bis main `2b8ea8d` übernommen: elf Bauwelten aus tatsächlichem Katalog, keine fremde Arbeit überschrieben. Vorherige Quell-/Pagesnachweise werden in dieser Fortsetzung ohne neue Veröffentlichungsschleife in der Roadmap gepflegt.

## Codex-Arbeitsgrundlage · 01.11.2026

Vollständiger lokaler Clone mit GitHub-Remote, npm-Setup, aktiven Roadmap-Hooks und exakt fixiertem Playwright. Windows-Pfade, Python-UTF-8 und LF-Zeilenenden korrigiert. Die vollständige Chromium-Suite besteht mit 54/54 Tests, einschließlich echter IndexedDB-Migration und Zwei-Tab-Konflikten. Ein dabei entdeckter Aufnahmeverlust während Worker-Neuberechnung ist behoben. Keine eigenen Actions.

[CODEX_SETUP](project/CODEX_SETUP.md) beschreibt Einrichtung, Arbeitsablauf und nächste Aufgaben. Dieser Chat arbeitet im lokalen Repository; eine zusätzliche Registrierung in der Projektoberfläche oder veröffentlichte Codex-Cloud-Umgebung konnte mangels Verwaltungswerkzeug nicht eingerichtet oder bestätigt werden. Pages-Quelle main/root und ausschließlich main als Remote-Branch sind per GitHub-Abfrage bestätigt.

## Parallele Roadmapfortsetzung · 01.11.2026

Alle 56 Arbeitspakete wurden einschließlich Abhängigkeiten, offenen Teilschritten und Reservierungen gelesen. Drei Teilagenten haben getrennte Prüfblöcke abgeschlossen: PERF-01 die große Browsermessung, OPS-02 eine isolierte Wiederherstellungsprobe und UI-01/WORLD-02 die visuelle Chromiumabnahme. Der Hauptchat führt Roadmap, Gesamtprüfung, regulären Main-Push und sofortige Pages-Veröffentlichung zusammen. Nächste Entwicklungsaufgabe ist PERF-02-S03 für die gemessenen Übertragungskosten und vollständig abgesicherte selektive Invalidierung. Eigene Sidebar-Chats konnten mangels Verwaltungswerkzeug nicht angelegt werden; die Teilagenten gehören zu diesem Auftrag.

Die bisherige Setupveröffentlichung ist erneut bestätigt: Quelle `b5eb5b9bc039160e668a7183c0ccfcdcd764a933`, Artefakt `6a309073872cda244a66a6b8d91452139cbdce09`, alle 13 Live-Dateigrößen und SHA-256 stimmen. Ergebnisse: vier neue Chromiumfälle für fünf Themen in hell/dunkel bei 1400/390 px und die drei neuen Bauwelten bestanden; 13 echte Buildartefakte in einer isolierten Recoveryprobe wiederhergestellt, sämtliche 333 Sourcepfade einschließlich neuer Dateien und Git-Modi erhalten. Kein Live-Rollback. Die Browsermessung umfasst je Viewport drei Vergleichspaare plus Warmup: DOM-Verzögerung im Median 693 → 30 ms (1400 px) bzw. 790 → 35 ms (390 px); Gesamtdauer 703 → 1184 ms bzw. 800 → 1420 ms. Dies misst denselben Rechenfall synchron gegen echten Worker im eigenen Produktionsharness, keine vollständige React-/INP-/Geräteabnahme. Details: [Browsermessung](architecture/PROJECT_BROWSER_BENCHMARK.md), [Oberflächenabnahme](architecture/UI_ACCEPTANCE.md), [Recoveryprobe](operations/PAGES_RESTORE_PROBE.md). Reservierte Weltkartenarbeit wird nicht übernommen; echte Geräte, Spiel-/Referenzwerkzeugabnahmen und Lizenzentscheidung bleiben getrennte Aufgaben.

## Prüfen, integrieren und veröffentlichen

Konkrete Befehle, Ergebnisse und Grenzen: [TESTING](TESTING.md). Der vorherige Architekturblock dokumentierte 353 bestandene Node-Tests. Das ist kein Nachweis für noch nicht geprüfte neue Änderungen. Die aktuelle Blockabnahme umfasst 383/383 Node-Tests und nach dokumentiertem Ersttimeout einen unabhängigen vollständigen 58/58-Chromiumlauf. Konkrete Grenzen und Befehle stehen im Prüfprotokoll und in den Roadmap-Nachweisen.

Quellcommit, Main-Integration und Pages sind getrennte Schritte. Für die jüngste Veröffentlichung ist [deployment.json](https://freadeax.github.io/Minecraft-Bauplaner/deployment.json) maßgeblich; Quell-SHA und Artefakthashes müssen passen. Ein laufender Arbeitsblock ist kein Hintergrundmonitor.

Kein zusätzliches Materialrepository, keine externe Registry und kein produktiver GitHub-Login. Diese Punkte bleiben zurückgestellt.
