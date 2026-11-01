# Aktueller Projektstand

Stand: 01.11.2026. Der verbindliche Aufgabenbestand steht in [ROADMAP](ROADMAP.md), die maschinenlesbare Quelle in [roadmap.json](roadmap.json). [ROADMAP_HISTORY](ROADMAP_HISTORY.md) protokolliert Arbeitsblöcke, Teilschritte und Dateien. Frühere Statusangaben stehen ausdrücklich historisch in [STATUS_HISTORY](STATUS_HISTORY.md).

## Implementierter Bestand

| Bereich | Vorhanden | Noch nicht vollständig abgenommen |
|---|---|---|
| Daten und Composer | Unveränderliche Voxel/AssetVersionen, Instanzen/Revisionen, Zellkonflikte, Undo/Redo, Snap/Händigkeit/Freiraum | Registryprofil, semantische BlockEntity-Transformationen |
| Formate | Sponge Schem v3 und Litematic mit Import/Export, Originalerhalt, Limits und unabhängigen Fixtures | echte WorldEdit-/Litematica-/Spielabnahme; kein Vollweltimport |
| Viewer | Orbit, Flug, Schnitte/Layer, Picking, Touchbedienung und Softwarefallback | exakte Blockformen, echte GPU-/iPhone-Prüfung |
| Bibliothek | 174 Gebäude, Suche/Filter, Vergleich, Merkliste, Varianten, Ensembles und Generatoren | eigene Sammlungen/Vorlagen; Redstone-Bauwerke nicht im Spiel abgenommen |
| Bau und Materialien | Bauitems, Rohstoff-/Rezeptauflösung, Packlisten, eigene Abschnitte, Lager-/Sammelplanung und Freiraumprüfung | versionsgebundener Katalog, Kupfer-Farbvarianten und erweiterte NBT-Diffs |
| Speicherung | IndexedDB, Projekt-Revisionsschutz, Originale, atomare Batches, Backup/Restore und Datencheck | Asset-Revisionsschutz und DB-v2-Migration implementiert, echte Browserabnahme offen; Cloud-/Gerätesynchronisierung und Safari/iPhone offen |
| Novemberoberfläche | fünf visuelle Themen mit Hell/Dunkel/System, Materiallabor, elf Bauwelten, 50 gezielte Glas-/Beton-/Terrakottasätze | aktuelle visuelle Abnahme; keine neuen Gebäude aus bloßem Themenzugang |
| Spielbrücke | Aufnahmevergleich, Original/Verlauf/Ausrichtung lokal gespeichert und gesichert; Java-Kern mit Tests | Fabricadapter nicht im Spiel abgenommen; Vergleich ohne BlockEntity-Inhalte |
| Weltkarte und Team | generischer Livekarten-/Markeradapter | Weltkartenoberfläche, konkrete Provideradapter, Teamdienst/Konten noch nicht vorhanden |
| Hosting | Pages main / Repositorywurzel, gehashter statischer Build und Artefakt-Kindcommit | alte integrierte Branches ohne verfügbare Löschfunktion; Restoreprobe offen |

## Aktueller Arbeitsblock

PERF-01 verbindet Projektauflösung, Bauanleitung, Material-/Schrittberichte und Baustellenplanung zu einem abbrechbaren Workerauftrag. Session und Ansichten teilen das Ergebnis; veraltete Antworten werden durch Jobtags und Eingabesnapshot-Identität abgewiesen. UI-Zustände für Rechnen, Abbruch, Fehler und Retry sind implementiert. Historische Revisionen bleiben getrennt. Acht neue Kern-/Lifecycle-Tests und echte Node-Workerübertragung prüfen diesen Umfang; aktuelle Gesamtprüfung steht in TESTING. Echte Browser-/iPhone-Reaktion bleibt offen. Details: [PROJECT_COMPUTATION](architecture/PROJECT_COMPUTATION.md).

PERF-02 führt intern sichere numerische Zellindizes ein; öffentliche Besitzer-Maps und sämtliche Mengen/Koordinaten bleiben unverändert. Vergleich mit der bisherigen Komposition: 266.784 Zellen, sechs vollständige Resolution-Ausgaben mit identischem Hash; letzte Medianmessung 833,60 → 790,37 ms (5,2 %, Node-Szenario mit Streuung). Übertragungsformate, Chunkcache und selektive Neuberechnung sind weiterhin offen. Details: [COMPOSITION_PERFORMANCE](architecture/COMPOSITION_PERFORMANCE.md).

STORE-02 ist als Quellcommit `8f22780`, Artefaktcommit `e860c84` integriert/veröffentlicht; seine echte DB-/Zwei-Tab-Abnahme bleibt offen. WORLD-02 des anderen Clients wurde bis main `2b8ea8d` übernommen: elf Bauwelten aus tatsächlichem Katalog, keine fremde Arbeit überschrieben. Vorherige Quell-/Pagesnachweise werden in dieser Fortsetzung ohne neue Veröffentlichungsschleife in der Roadmap gepflegt.

## Prüfen, integrieren und veröffentlichen

Konkrete Befehle, Ergebnisse und Grenzen: [TESTING](TESTING.md). Der vorherige Architekturblock dokumentierte 353 bestandene Node-Tests. Das ist kein Nachweis für noch nicht geprüfte neue Änderungen. Die aktuelle Blockabnahme wird im Prüfprotokoll ergänzt und in den Roadmap-Nachweisen festgehalten.

Quellcommit, Main-Integration und Pages sind getrennte Schritte. Für die jüngste Veröffentlichung ist [deployment.json](https://freadeax.github.io/Minecraft-Bauplaner/deployment.json) maßgeblich; Quell-SHA und Artefakthashes müssen passen. Ein laufender Arbeitsblock ist kein Hintergrundmonitor.

Kein zusätzliches Materialrepository, keine externe Registry und kein produktiver GitHub-Login. Diese Punkte bleiben zurückgestellt.
