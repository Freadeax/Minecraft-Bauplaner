# Projektstand

Stand: 27.10.2026. Fundament für Bibliothek, Projekte und Composer (B0); parallele Blöcke B1–B7 laufen laut [Blockplan](BLOCKS.md).

| Bereich | Implementiert / bestätigt | Offene Grenzen |
|---|---|---|
| Repository | öffentlich, main als Integrationslinie, reguläre Mainfreigabe | keine Force-Pushes |
| Website | statischer React-/Three.js-Build auf Pages, Quelle gh-pages / root, Hashmanifest | keine eigenen Actions; kein Hintergrundmonitor |
| Datenkern | validierte unveränderliche Voxel, diskrete Geometrie, expliziter Vanilla-Zustandskatalog (75 Familienregeln, 595 IDs, Java 1.21.4 manuell) | Registry-Report-Abgleich, BlockEntity-NBT-Transformation, Modprofile offen |
| Import | GZip, Big-Endian-NBT und Sponge v3 im Worker, vollständige Blockzustände und BlockEntities | konservative Limits; keine alten Schematic-/Litematic-/Weltformate |
| Datenerhalt | komprimiertes Original, Quell-NBT, Offset, DataVersion, Metadata/Entities/Biome getrennt erhalten | keine Registry-/Modpackfreigabe aus DataVersion ableiten |
| Ansicht | Orbit/Zoom, freier Flug, Drauf-/Seitenansichten, Parallelprojektion, Fokus, Picking mit Welt-/Lokalkoordinate, Schichten Alles/Bereich/Einzeln, Touchsteuerung, nur sichtbare Flächen, three.js nachgeladen, Softwareansicht ohne WebGL ([Viewer](architecture/VIEWER.md)) | keine exakten Blockmodelle; echte GPU-/Mobilgeräte offen |
| Mengen | Blockzustände/Luft/Löschzellen getrennt; Bauitems mit Mehrblock-/Stufen-/Anzahl-/Wandregeln, Stacks und Shulkerkisten im Tab „Material“ ([MATERIALS](architecture/MATERIALS.md)) | keine Rohstoff-/Rezeptauflösung; Katalog nicht an exakte Version gebunden |
| Speicherung/Export | Voxel-JSON und unverändertes Schem-Original herunterladbar; Tab „Export“ schreibt Sponge Schem v3 aus eingefrorener Revision mit Exportsperre, Luft-/Lösch-/Lückenpolitik, Offset und Bericht (B2) | keine echte WorldEdit-/Spielabnahme, DataVersion ungeprüft |
| Bibliothek | Assets mit Herkunft/Tags/Archiv, unveränderliche inhaltsadressierte Versionen, Suche, Dateiimport als Bauteil, [Anschluss-Editor und Bereich als Bauteil](architecture/CONNECTORS.md) (B5) | – |
| Projekte/Composer | Projektzentrale, Instanzen einfügen/verschieben/drehen/spiegeln/duplizieren, Undo/Redo, Voxelkonflikte mit Override, Konfliktbericht, Revisionen im Kern, Snap mit Konfliktprüfung und gespeicherten Verbindungen (B5) | Spiegelprofile/Freiräume an Anschlüssen |
| Dauerhafte Speicherung (B3) | IndexedDB mit Schema-Migration, atomaren Transaktionen, `baseRevision`-Konflikt bei zwei Tabs, Tab-übergreifender Aktualisierung, sichtbaren Speicherfehlern; Originaldateien als Blobs; Projekt-/Gesamtsicherung mit SHA-256-Prüfsummen, Vollständigkeitsprüfung und Wiederherstellung ohne stilles Überschreiben ([PERSISTENCE](architecture/PERSISTENCE.md)) | keine Cloud-/Gerätesynchronisierung; Browser kann Daten ohne gewährte Dauerhaftigkeit löschen; Safari/iPhone ungeprüft |
| Bauanleitung (B4) | Tab „Bauen“: Schritte je Instanz × Y-Schicht × Phase mit stabiler ID, Prüfkriterium, Voraussetzungen ohne Zyklen, Schwerkraft/Anbringung/Flüssigkeiten zuletzt, manuelle Haken mit Geometriehash ⇒ prüfbedürftig, Schichtdraufsicht, mobile Ansicht ([GUIDE](architecture/GUIDE.md)) | keine Messung im Spiel; Abschnitt = Instanz; Itemmengen über B1 |
| Spielbrücke (B8) | Konzept [MOD_BRIDGE](architecture/MOD_BRIDGE.md); Tab „Bauen“ importiert Spielaufnahmen (Schem v3 mit `Kind=scan`), vergleicht jede Zelle mit der Revision und zeigt Spielstatus je Schritt, Abweichungen und Schichtmarkierungen; bestätigte Schritte nur auf Klick abhaken | Fabric-Mod für 26.3 noch nicht gebaut/geprüft; Aufnahme nicht gespeichert; Vergleich ohne BlockEntity-Inhalte
| Team | Architektur geplant | nicht implementiert |
| Prüfungen | 145 Node-Tests, 12 Playwright-Browserprüfungen, strict Kern/Web, Builds und Dokumentationsprüfung bestanden | synthetische Formatfixtures, echte Referenzwerkzeug-/Spielabnahme offen |

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
