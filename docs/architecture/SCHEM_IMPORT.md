# Begrenzter Sponge-Schem-v3-Import

Stand: 27.10.2026. Implementierung in `packages/formats/src`, Einbindung im Browser-Worker. Dies ist ein Reader mit Vorschau, kein Writer, Versionskonverter oder Nachweis beliebiger Minecraft-/Modpack-Kompatibilität.

## Verarbeitungsweg

Dateiauswahl → komprimierte Größe prüfen → Kopie an Worker übertragen → GZip-Struktur prüfen und begrenzt entpacken → Big-Endian-NBT lesen → verschachteltes Root.Schematic mit Version 3 prüfen → Palette/VarInts/BlockEntities normalisieren → validierten Voxel-Snapshot samt Importbericht atomar übernehmen.

Die vorherige Ansicht bleibt bei Fehler oder Abbruch erhalten. GZip wird an der Signatur erkannt, nicht an der Endung allein. Nicht komprimiertes NBT und alte Schematic-Versionen werden mit Fehler abgewiesen; Litematic hat einen eigenen Adapter ([LITEMATIC](LITEMATIC.md)). Keine Daten werden an einen Server hochgeladen.

## Verlust sichtbar halten

- Block-ID inklusive unbekannter Mod-Namespace und vollständige String-Properties bleiben erhalten. Fehlender Namespace bedeutet nach Sponge-Regel minecraft. Lücken in Paletten-IDs sind zulässig; semantisch identische Zustände werden in der Vorschau zusammengefasst. Originalpalette bleibt im Quell-NBT erhalten.
- Blockdatenindex: x + z×Width + y×Width×Length. Explizite air/cave_air/void_air bleiben Luftzellen. Nichtnegative int32-VarInts werden geprüft; fehlende/überzählige Werte, doppelte IDs und unbekannte Referenzen abgewiesen.
- Offset wird als Importursprung plus eigenes Berichtsfeld erhalten; die Vorschau verwendet lokale Koordinaten. DataVersion wird gelesen, aber keinem ungeprüften Spiel-/Modpackprofil gleichgesetzt.
- BlockEntities halten den gesamten ursprünglichen Pos-/Id-/Data-Wrapper samt Zusatzfeldern als typisiertes NBT. Der gemeinsame Kern meldet ihre ungelöste Semantik bei Transformation statt versteckte NBT-Koordinaten zu raten.
- Vollständiges Quell-NBT, Metadata, Biome, freie Entities und unbekannte Zusatzfelder bleiben getrennt vom Voxel-Snapshot erhalten. Nicht dargestellte Daten werden im Bericht genannt. Keine Behauptung, sie wären Bestandteil der vereinfachten Blockvorschau.
- Die unveränderten komprimierten Originalbytes bleiben im Browser und sind mit „Original-Schem sichern“ herunterladbar; SHA-256 wird angezeigt. Das Original wird auch durch Vorschau-Drehungen nicht geändert.
- „Voxel-JSON sichern“ speichert nur den aktuellen Voxel-Snapshot. Es ersetzt weder die vollständige Originaldatei noch einen Minecraft-Export. Die Oberfläche weist ausdrücklich darauf hin.

## NBT und Grenzen

Unterstützte Tags: Byte, Short, Int, Long, Float, Double, ByteArray, String, List, Compound, IntArray, LongArray. Longwerte als int64-Dezimalstrings. Listen-/Arraylängen, Typen, doppelte Compoundnamen und Restbytes werden geprüft. Strings werden als Java Modified-UTF-8 gelesen, einschließlich NUL und UTF-16-Surrogatpaaren. Fehlerhafte Sequenzen werden abgewiesen. Nicht-endliche Gleitkommazahlen und negatives Float-/Double-Null sind im aktuellen JSON-Vertrag nicht verlustfrei abbildbar und führen ausdrücklich zum Importfehler; keine stille Normalisierung.

Standardlimits: 2.000.000 komprimierte Bytes, 8.000.000 entpackte Bytes, 20.000 Volumenzellen, 256 je Achse, 20.000 Paletteneinträge, NBT-Tiefe 32 und 200.000 Knoten/Arraybudget. Zeitbudget 5 Sekunden für Entpacken/Lesen/Normalisieren; zusätzlich beendet die Oberfläche einen Worker nach 12 Sekunden. Abbrechen und neue Dateiauswahl entwerten ältere Jobantworten. Limits sind konservative Startwerte, keine Lastmessung.

Der interne JSON-Import bleibt separat begrenzt (2 MB, 20.000 ausgewählte Zellen, 50.000 NBT-Budget). Datenbank, freie Entities und Biomgeometrie werden durch diesen Reader nicht implementiert.

## Nachweis und offene Abnahme

Unabhängige [Binärfixture](../../fixtures/schem/README.md) aus eigenem Python-struct-Writer, feste erwartete Koordinaten/Mengen und Bytefixtures für Fehlerfälle. Tests umfassen Offset, Palettenlücken, zweibyte VarInt, BlockEntities, int64-Grenzen, Arrays, Modified-UTF-8, Abbruchgrenzen, GZip-Prüfsumme und Trunkierung. Auf Pages liegt eine daraus gebaute synthetische `.schem`-Datei, die per Schaltfläche denselben Workerweg wie eine lokale Datei durchläuft.

Noch offen: Export aus einem echten Referenzwerkzeug/Spiel und unabhängige WorldEdit-Abnahme, bestätigte Versions-/Registryprofile, echter iPhone-Dateidialog, höhere Volumina/Lastmessung und Schem-Writer. Deshalb ist die Formatimplementierung begrenzt und die vollständige P1-01-Integrationsabnahme weiterhin teilweise offen.

## Primärquellen

- [Sponge Schematic v3](https://github.com/SpongePowered/Schematic-Specification/blob/master/versions/schematic-3.md): GZip, verschachtelte Schematic-Struktur, Feldtypen, unsigned Short, Paletten-/VarInt- und BlockEntity-Vertrag.
- [Java DataInput](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/DataInput.html): Modified-UTF-8 und Java-Datentypen.

Am 27.10.2026 vor Implementierung gelesen; keine fremde Welt oder fremder Fixturecode übernommen.
