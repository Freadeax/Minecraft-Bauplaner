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

STORE-02 implementiert den lokalen Asset-Revisionsschutz in beiden Speichern, DB-v2-Migration, atomare Version-/Asset-/Originalbatches und eine feste Bearbeitungsgrundlage im UI. Fehlerhafte Migration wechselt nicht still in einen leeren Sitzungsspeicher; veraltete Formulare behalten ihren Entwurf und zeigen den Konflikt. Sicherungen bleiben lesbar, Restore trägt die lokale erwartete Revision. Die vollständige Abnahme benötigt noch die echten IndexedDB-/Zwei-Tab-Browserregressionen. Details: [ASSET_CONCURRENCY](architecture/ASSET_CONCURRENCY.md).

WORLD-02 prüft die Bauwelten-Abdeckung und ergänzt drei redaktionelle Welten aus tatsächlichen Bibliothekseinträgen: Fernöstlicher Garten (3 Treffer), Wüstenhandel & Oasenweg (6) und End-Außenposten (2). Die Bibliothek zeigt damit elf Bauwelten; Stilrichtungen ohne Bauteile werden nicht behauptet. Quellcommit `c3e647855dc3b1bc5417a64cc6350b375b9b510d`, Artefaktcommit `bc7495830cbdf7a4cdcdddddf050ef59f637f256`, Live-Manifest und Dateihashes geprüft. Browser-Sichtprüfung der neuen Karten bleibt Teil von QA-01. Details: [Bauwelten](architecture/BUILD_THEMES.md).

PLAN-01, ARCH-01 und DOC-01 wurden zuvor als Quellcommit `ccf4fa71c033c2f9415528192a04faed36730660` integriert, Artefaktcommit `18f70b7` veröffentlicht; Live-Quell-SHA und zwölf Dateihashes in dieser Fortsetzung geprüft. Diese Nachweise werden jetzt in der zentralen Roadmap nachgeführt. Die separate Browseraufgabe QA-01 bleibt offen.

## Prüfen, integrieren und veröffentlichen

Konkrete Befehle, Ergebnisse und Grenzen: [TESTING](TESTING.md). Der vorherige Architekturblock dokumentierte 353 bestandene Node-Tests. Das ist kein Nachweis für noch nicht geprüfte neue Änderungen. Die aktuelle Blockabnahme wird im Prüfprotokoll ergänzt und in den Roadmap-Nachweisen festgehalten.

Quellcommit, Main-Integration und Pages sind getrennte Schritte. Für die jüngste Veröffentlichung ist [deployment.json](https://freadeax.github.io/Minecraft-Bauplaner/deployment.json) maßgeblich; Quell-SHA und Artefakthashes müssen passen. Ein laufender Arbeitsblock ist kein Hintergrundmonitor.

Kein zusätzliches Materialrepository, keine externe Registry und kein produktiver GitHub-Login. Diese Punkte bleiben zurückgestellt.
