# Projektstand

Stand: 27.10.2026. Browser-Kernansicht und begrenzter Sponge-Schem-v3-Import.

| Bereich | Implementiert / bestätigt | Offene Grenzen |
|---|---|---|
| Repository | öffentlich, main als Integrationslinie, reguläre Mainfreigabe | keine Force-Pushes |
| Website | statischer React-/Three.js-Build auf Pages, Quelle gh-pages / root, Hashmanifest | keine eigenen Actions; kein Hintergrundmonitor |
| Datenkern | validierte unveränderliche Voxel, diskrete Geometrie, begrenzte Zustandsregeln | vollständige Registry-/NBT-Transformation offen |
| Import | GZip, Big-Endian-NBT und Sponge v3 im Worker, vollständige Blockzustände und BlockEntities | konservative Limits; keine alten Schematic-/Litematic-/Weltformate |
| Datenerhalt | komprimiertes Original, Quell-NBT, Offset, DataVersion, Metadata/Entities/Biome getrennt erhalten | keine Registry-/Modpackfreigabe aus DataVersion ableiten |
| Ansicht | Orbit/Zoom, Picking, X/Y/Z-Schnitte, Software-Isometrie ohne WebGL | kein freier Flug, keine exakten Blockmodelle; GPU-/Mobiltest offen |
| Mengen | Blockzustände/Luft/Löschzellen getrennt | kein Bauitem-/Rohstoff-/Lagerbedarf |
| Speicherung/Export | Voxel-JSON und unverändertes Schem-Original herunterladbar | kein vollständiges Projektbackup, kein Schem-Writer/Minecraft-Export |
| Bibliothek/Composer/Team | Architektur und Abnahmen geplant | nicht implementiert |
| Prüfungen | 72 lokale Tests, strict Kern/Web, Builds und Dokumentationsprüfung bestanden | synthetische Formatfixtures, echte Referenzwerkzeug-/Spielabnahme offen |

## Maßgebliche Einzelheiten

- [Strukturierte Prüfung aller Anforderungen](REVIEW.md)
- [Schem-Importvertrag, Limits und Datenerhalt](architecture/SCHEM_IMPORT.md)
- [Prüfprotokoll](TESTING.md)
- [Roadmap](ROADMAP.md)

Website: https://freadeax.github.io/Minecraft-Bauplaner/ . Der aktuelle ausgelieferte Quellstand steht in deployment.json. Importbericht nennt Hash, Offset, DataVersion und nicht dargestellte Zusatzdaten. Voxel-JSON ist nur die Blockansicht; vollständige Quelle über Original-Schem sichern.

## Abschluss des laufenden Blocks

Der Nutzer hat „aktuellen Block fertig machen und warten“ angeordnet. Der Importblock ist lokal geprüft, auf main integriert und auf Pages veröffentlicht. Live-Workerimport der unabhängigen Schem-Testdatei bestanden: 7 belegte / 5 Luftzellen, DataVersion 3465, Offset −10/64/30, ein BlockEntity und korrekter Originalhash. Rotation und Einzelschicht sowie Warnungen für Mod-/NBT-Regeln live geprüft. Anschließend keine weitere aktive Entwicklung oder Überwachung. Nächste geplante Arbeitspakete bleiben ungestartet.
