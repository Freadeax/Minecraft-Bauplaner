# Projektstand

Stand: 27.10.2026. Fundament für Bibliothek, Projekte und Composer (B0); parallele Blöcke B1–B7 laufen laut [Blockplan](BLOCKS.md).

| Bereich | Implementiert / bestätigt | Offene Grenzen |
|---|---|---|
| Repository | öffentlich, main als Integrationslinie, reguläre Mainfreigabe | keine Force-Pushes |
| Website | statischer React-/Three.js-Build auf Pages, Quelle gh-pages / root, Hashmanifest | keine eigenen Actions; kein Hintergrundmonitor |
| Datenkern | validierte unveränderliche Voxel, diskrete Geometrie, begrenzte Zustandsregeln | vollständige Registry-/NBT-Transformation offen |
| Import | GZip, Big-Endian-NBT und Sponge v3 im Worker, vollständige Blockzustände und BlockEntities | konservative Limits; keine alten Schematic-/Litematic-/Weltformate |
| Datenerhalt | komprimiertes Original, Quell-NBT, Offset, DataVersion, Metadata/Entities/Biome getrennt erhalten | keine Registry-/Modpackfreigabe aus DataVersion ableiten |
| Ansicht | Orbit/Zoom, Picking, X/Y/Z-Schnitte, Software-Isometrie ohne WebGL | kein freier Flug, keine exakten Blockmodelle; GPU-/Mobiltest offen |
| Mengen | Blockzustände/Luft/Löschzellen getrennt | kein Bauitem-/Rohstoff-/Lagerbedarf |
| Speicherung/Export | Voxel-JSON und unverändertes Schem-Original herunterladbar; Tab „Export“ schreibt Sponge Schem v3 aus eingefrorener Revision mit Exportsperre, Luft-/Lösch-/Lückenpolitik, Offset und Bericht (B2) | kein vollständiges Projektbackup (B3); keine echte WorldEdit-/Spielabnahme, DataVersion ungeprüft |
| Bibliothek | Assets mit Herkunft/Tags/Archiv, unveränderliche inhaltsadressierte Versionen, Suche, Dateiimport als Bauteil | Anschluss-Editor/Bereichsauswahl (B5), dauerhafte Speicherung (B3) |
| Projekte/Composer | Projektzentrale, Instanzen einfügen/verschieben/drehen/spiegeln/duplizieren, Undo/Redo, Voxelkonflikte mit Override, Konfliktbericht, Revisionen im Kern | Snap (B5); Speicherung nur Sitzung bis B3 |
| Bauanleitung (B4) | Tab „Bauen“: Schritte je Instanz × Y-Schicht × Phase mit stabiler ID, Prüfkriterium, Voraussetzungen ohne Zyklen, Schwerkraft/Anbringung/Flüssigkeiten zuletzt, manuelle Haken mit Geometriehash ⇒ prüfbedürftig, Schichtdraufsicht, mobile Ansicht ([GUIDE](architecture/GUIDE.md)) | keine Messung im Spiel; Abschnitt = Instanz; Itemmengen über B1 |
| Team | Architektur geplant | nicht implementiert |
| Prüfungen | 92 Node-Tests, 6 Playwright-Browserprüfungen, strict Kern/Web, Builds und Dokumentationsprüfung bestanden | synthetische Formatfixtures, echte Referenzwerkzeug-/Spielabnahme offen |

## Maßgebliche Einzelheiten

- [Strukturierte Prüfung aller Anforderungen](REVIEW.md)
- [Schem-Importvertrag, Limits und Datenerhalt](architecture/SCHEM_IMPORT.md)
- [Schem-v3-Export, Politik und Prüfung](architecture/SCHEM_EXPORT.md)
- [Prüfprotokoll](TESTING.md)
- [Roadmap](ROADMAP.md)

Website: https://freadeax.github.io/Minecraft-Bauplaner/ . Der aktuelle ausgelieferte Quellstand steht in deployment.json. Importbericht nennt Hash, Offset, DataVersion und nicht dargestellte Zusatzdaten. Voxel-JSON ist nur die Blockansicht; vollständige Quelle über Original-Schem sichern.

## Frühere Blocksteuerung

Der Nutzer hat „aktuellen Block fertig machen und warten“ angeordnet. Der Importblock ist lokal geprüft, auf main integriert und auf Pages veröffentlicht. Live-Workerimport der unabhängigen Schem-Testdatei bestanden: 7 belegte / 5 Luftzellen, DataVersion 3465, Offset −10/64/30, ein BlockEntity und korrekter Originalhash. Rotation und Einzelschicht sowie Warnungen für Mod-/NBT-Regeln live geprüft. Anschließend keine weitere aktive Entwicklung oder Überwachung. Nächste geplante Arbeitspakete bleiben ungestartet.

## Aktueller Arbeitsstand

B0 (Fundament) ist auf main. Domänenvertrag: [DOMAIN](architecture/DOMAIN.md). Die Blöcke B1–B7 mit Dateizuständigkeiten, Regeln und Abnahmen stehen in [BLOCKS](BLOCKS.md). Veröffentlichung nach jedem Main-Push mit `scripts/publish_pages.sh`.
