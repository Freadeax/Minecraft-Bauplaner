# Aktueller Projektstand

Stand: 01.11.2026. Der verbindliche Aufgabenbestand steht in [ROADMAP](ROADMAP.md), die maschinenlesbare Quelle in [roadmap.json](roadmap.json). [ROADMAP_HISTORY](ROADMAP_HISTORY.md) protokolliert Arbeitsblöcke, Teilschritte und Dateien. Frühere Statusangaben stehen ausdrücklich historisch in [STATUS_HISTORY](STATUS_HISTORY.md).

## Implementierter Bestand

| Bereich | Vorhanden | Noch nicht vollständig abgenommen |
|---|---|---|
| Daten und Composer | Unveränderliche Voxel/AssetVersionen, Instanzen/Revisionen, Zellkonflikte, Undo/Redo, Snap/Händigkeit/Freiraum | Registryprofil, semantische BlockEntity-Transformationen, Asset-Revisionsschutz |
| Formate | Sponge Schem v3 und Litematic mit Import/Export, Originalerhalt, Limits und unabhängigen Fixtures | echte WorldEdit-/Litematica-/Spielabnahme; kein Vollweltimport |
| Viewer | Orbit, Flug, Schnitte/Layer, Picking, Touchbedienung und Softwarefallback | exakte Blockformen, echte GPU-/iPhone-Prüfung |
| Bibliothek | 174 Gebäude, Suche/Filter, Vergleich, Merkliste, Varianten, Ensembles und Generatoren | eigene Sammlungen/Vorlagen; Redstone-Bauwerke nicht im Spiel abgenommen |
| Bau und Materialien | Bauitems, Rohstoff-/Rezeptauflösung, Packlisten, eigene Abschnitte, Lager-/Sammelplanung und Freiraumprüfung | versionsgebundener Katalog, Kupfer-Farbvarianten und erweiterte NBT-Diffs |
| Speicherung | IndexedDB, Projekt-Revisionsschutz, Originale, atomare Batches, Backup/Restore und Datencheck | Cloud-/Gerätesynchronisierung; echte Safari-/iPhone-Speicherabnahme |
| Novemberoberfläche | fünf visuelle Themen mit Hell/Dunkel/System, Materiallabor, acht Bauwelten, 50 gezielte Glas-/Beton-/Terrakottasätze | aktuelle visuelle Abnahme; keine neuen Gebäude aus bloßem Themenzugang |
| Spielbrücke | Aufnahmevergleich, Original/Verlauf/Ausrichtung lokal gespeichert und gesichert; Java-Kern mit Tests | Fabricadapter nicht im Spiel abgenommen; Vergleich ohne BlockEntity-Inhalte |
| Weltkarte und Team | generischer Livekarten-/Markeradapter | Weltkartenoberfläche, konkrete Provideradapter, Teamdienst/Konten noch nicht vorhanden |
| Hosting | Pages main / Repositorywurzel, gehashter statischer Build und Artefakt-Kindcommit | alte integrierte Branches ohne verfügbare Löschfunktion; Restoreprobe offen |

## Aktueller Arbeitsblock

PLAN-01 führt 56 Aufgaben mit festen IDs, Abhängigkeiten, nachvollziehbaren Teilschritten und getrenntem Prüf-/Integrations-/Pages-Nachweis ein. Aus JSON erzeugte Roadmap und Historie verhindern voneinander abweichende Statuslisten. Quell-Merges benötigen ein angehängtes, dateibezogenes Fortschrittsereignis; lokale Hooks und Publisher prüfen den Ablauf ohne eigene Actions.

ARCH-01 verlagert Exportkoordination, Speicherports und Aufnahmeverwaltung nach `packages/application`. Der Fachkern importiert keine Writer oder Browseradapter mehr; die Paketgrenzen werden automatisch geprüft. Die Weboberfläche verwendet den Exportanwendungsfall. Gespeicherte Daten und bestehende Gebäudeversionen erhalten ihr Format.

DOC-01 ersetzt widersprüchliche Alteinträge durch diese Übersicht und die verbindliche Roadmap. Historische Kommunikation/Prüfnachweise bleiben erhalten.

## Prüfen, integrieren und veröffentlichen

Konkrete Befehle, Ergebnisse und Grenzen: [TESTING](TESTING.md). Der vorherige Main-Snapshot `84838f0` dokumentierte 342 bestandene Node-Tests. Das ist kein Nachweis für noch nicht geprüfte neue Änderungen. Die aktuelle Blockabnahme wird im Prüfprotokoll ergänzt und in den Roadmap-Nachweisen festgehalten.

Quellcommit, Main-Integration und Pages sind getrennte Schritte. Für die jüngste Veröffentlichung ist [deployment.json](https://freadeax.github.io/Minecraft-Bauplaner/deployment.json) maßgeblich; Quell-SHA und Artefakthashes müssen passen. Ein laufender Arbeitsblock ist kein Hintergrundmonitor.

Kein zusätzliches Materialrepository, keine externe Registry und kein produktiver GitHub-Login. Diese Punkte bleiben zurückgestellt.
