# Litematic-Import und -Export (P5-01)

Stand: 02.11.2026 (FORMAT-02: echte Dateien aus dem Netz, siehe unten; Erstfassung 27.10.2026). Implementierung in `packages/formats/src/litematic.ts` (Leser), `litematicWrite.ts` (Schreiber) und `structure.ts` (Formaterkennung), Einbindung im Import-Worker, in Bibliothek, Betrachter und Tab „Export“. Kein Versionskonverter und kein Nachweis beliebiger Minecraft-/Modpack-Kompatibilität.

## Format

NBT, wie es Litematica schreibt (GZip). Seit FORMAT-02 werden auch unkomprimiertes und zlib-NBT gelesen, weil Download-Seiten und Konverter (z. B. Litemapy) solche Dateien ausliefern; erkannt wird am Dateianfang (`1f 8b` GZip, `78 xx` zlib, `0a` unkomprimiert), nie an der Endung. Quelle des Layouts: `LitematicaSchematic`, `LitematicaBitArray`, `LitematicaBlockStateContainer`, `PositionUtils` im Litematica-Quelltext für MC 1.20 und 1.21, am 27.10.2026 gelesen; kein Code übernommen):

- Wurzel: `Version` (Int), `SubVersion` (Int, optional), `MinecraftDataVersion` (Int, optional), `Metadata`, `Regions` (Compound Name → Region).
- Region: `Position` und `Size` je `{x,y,z}` relativ zum Schematic-Ursprung. `Size` darf je Achse negativ sein; dann reicht die Region von `Position` aus zu kleineren Koordinaten, Minimum = `Position + Size + 1`. Größe 0 wird abgewiesen.
- `BlockStatePalette`: Liste `{Name, Properties}`; `BlockStates`: LongArray, eng gepackt mit `max(2, ⌈log2(Palettengröße)⌉)` Bit je Zelle. Ein Eintrag darf über die Grenze zweier Longs reichen; Bit k des Datenstroms ist Bit k mod 64 von Long ⌊k/64⌋. Länge muss genau `⌈Volumen·Bit/64⌉` sein. Zellindex `y·B·L + z·B + x`.
- `TileEntities`: rohes Tile-NBT mit `id` und `x/y/z` relativ zum Regionsminimum. `Entities` (Gemälde, Rahmen, Rüstungsständer …; `Pos` relativ zur Region-`Position`, daher oft negativ), `PendingBlockTicks`, `PendingFluidTicks` werden nicht übernommen, bleiben aber im Quell-NBT und werden im Bericht nach `id` gezählt. Leere Listen tragen bei Litematica den Elementtyp TAG_End.
- `Metadata`: `Name`, `Author`, `Description`, `TimeCreated`/`TimeModified` (Long, ms), `EnclosingSize`, `RegionCount`, `TotalBlocks`, `TotalVolume`, optional `PreviewImageData` (quadratisches ARGB-IntArray). Konverter schreiben zusätzlich `Software`. Name (außer Platzhaltern wie „Unnamed“), Autor und Beschreibung füllen beim Bibliotheksimport die Felder vor.

## Versionsgrenzen

| Version | Herkunft | Verhalten |
|---|---|---|
| 1 | frühe Litematica-Versionen, anderes Tile-/Entity-Layout | abgewiesen mit Hinweis „in Litematica öffnen und neu speichern“ |
| 2–4 oder DataVersion 1–1630 | Minecraft 1.12 | gelesen, Block-IDs nicht umgewandelt, Warnung |
| 5 | Litematica für MC 1.13–1.17 | unterstützt |
| 6 | Litematica für MC 1.18–1.20.4 | unterstützt |
| 7 | Litematica ab MC 1.20.5 | unterstützt |
| ≥ 8 | unbekannt | abgewiesen, keine stille Fehldeutung |

Fehlt `MinecraftDataVersion`, gilt 0 mit Warnung. Die DataVersion bleibt eine Dateiangabe; das Profil heißt `java:dataversion-<n>:registry-unverified`.

## Mehrere Regionen

Standard: alle Regionen werden in eine Nutzlast zusammengeführt. Lokales 0/0/0 ist das Minimum der umschließenden Box; dieses Minimum steht als `sourceOrigin`/`offset` im Bericht. Zellen zwischen Regionen bleiben unausgewählt, nicht Luft. Überlappen Regionen, gilt die spätere in Dateireihenfolge; abweichende Zellen werden gezählt und gewarnt, weil Litematica selbst keine feste Reihenfolge garantiert. Eine überschriebene Zelle verliert ihr BlockEntity.

Alternativ lässt sich genau eine Region importieren (`region`-Option, in der Bibliothek „Übernehmen: Nur …“). Alle Regionen werden trotzdem gelesen und geprüft, damit der Bericht vollständig ist. Spannen die Regionen mehr als 256 Blöcke je Achse auf, nennt die Fehlermeldung den Einzelimport als Ausweg.

Grenzen (seit FORMAT-02): Datei bis 16 MB (Oberfläche und Worker), davon GZip/zlib bis 4 MB komprimiert, 32 MB entpackt; Box bis 256 je Achse und 16,7 Mio. Zellen; höchstens 1 Mio. übernommene Zellen; 64 Regionen, 20.000 Paletteneinträge, NBT-Tiefe 32, 4 Mio. Knoten (das BlockStates-LongArray zählt je Long), 8 s. Bis 250.000 Zellen Volumen bleibt Luft wie beim Schem-Import eine ausdrückliche `air`-Zelle. Größere Dateien (ganze Bauwerke, oft aus Schematics umgewandelt) übernehmen nur ihre Blöcke; Luft bleibt unausgewählt, der Bericht nennt die Zahl, das Original bleibt unverändert. Das Zusammenführen arbeitet auf einer dichten Box (`Int32Array`) statt auf Textschlüsseln.

## Echte Dateien (FORMAT-02, 02.11.2026)

Fünf von Philipp bereitgestellte Dateien (nicht im Repository, Rechte ungeklärt) wurden aufgeschlüsselt. Vorher scheiterten vier davon.

| Datei | Herkunft | Speicherung | Format · DataVersion | Region (Position · Size) | Inhalt | vorher | jetzt |
|---|---|---|---|---|---|---|---|
| City Hall | Litematica (Autor geo_rz) | unkomprimiert | 7.1 · 4556 | Unnamed · 0/0/40 · 37/46/−41 | 7.164 Blöcke, 88 Zustände | „Erwartet GZip“ | gelesen |
| Medieval House with full interior | Litematica (xMsBean) | unkomprimiert | 7.1 · 3953 | Unnamed · 24/27/46 · −25/−28/−47 | 6.218 Blöcke, 158 TileEntities, 17 Entities | „Erwartet GZip“ | gelesen, Entities nach Art im Bericht |
| Medieval House | Litemapy 0.11 (aus Sponge v3) | unkomprimiert | 6.1 · 2975 | Main · 0/0/0 · 47/33/40 | 10.171 Blöcke | „Erwartet GZip“ | gelesen |
| Olympus | Litemapy 0.11 (aus Sponge v2) | GZip | 6.1 · 2975 | Main · 164/184/189 | 952.911 Blöcke in 5,7 Mio. Zellen | Knotenlimit | gelesen, Luft unausgewählt |
| Ocean Kingdom | Litemapy 0.11 | GZip | 6.1 · 2975 | Main · 1/1/1 | 1 Goldblock | gelesen | gelesen, Hinweis „Umwandlung an der Quelle fehlgeschlagen“ |

Alle `TotalBlocks` stimmen mit den gelesenen Blöcken überein. Unser Export dieser Bauwerke hat dieselbe Gliederung wie die Litematica-Dateien (Wurzel `MinecraftDataVersion`/`Version`/`SubVersion`/`Metadata`/`Regions`, gleiche Metadata-Felder, gleiche Palettengröße, Bitbreite und Longzahl) und liest sich zellgleich zurück; Unterschiede: positive `Size` ab `Position`, GZip, kein `PreviewImageData` (die beiden Litematica-Dateien haben auch keins) und keine freien Entities. Alte IDs `chain` und `grass` (vor 1.21.9 bzw. 1.20.3) werden in der Ansicht wie `iron_chain` und `short_grass` gezeichnet; die Datei behält die alte ID.

## Formaterkennung

`importStructure` erkennt GZip, zlib oder unkomprimiertes NBT, entpackt einmal und entscheidet am Inhalt: `Schematic`-Compound → Sponge Schem v3, `Regions` + `Version` → Litematic. Sponge v1/v2, MCEdit-`.schematic` und Vanilla-Strukturdateien werden mit eigener Meldung abgewiesen. Die Dateiendung entscheidet nicht.

## Export

Tab „Export“ → Dateiformat „Litematica (.litematic)“. Eine Region mit dem Projektnamen, `Position` = Einfügepunkt (Projektursprung oder untere Ecke wie beim Schem-Export), positive `Size`. Palette: Index 0 immer `minecraft:air`, dann Zustände in Y→Z→X-Reihenfolge des ersten Auftretens; Ausgabe deterministisch. Löschzellen werden Luft, nicht ausgewählte Zellen Luft oder `minecraft:structure_void`. BlockEntities im Sponge-Format (Id/Pos/Data) werden in Litematicas Tile-Format (id/x/y/z, Daten flach) übertragen; Zusatzfelder neben Id/Pos/Data haben dort keinen Platz und werden gezählt. Metadata enthält Name, Autor, Kommentar der Revision, Mengen, Zeit und das eigene Feld `Bauplaner` (Projekt, Revision, Profil, ProjectMin).

Exportgrenze: Box bis 16,7 Mio. Zellen (Litematic packt eng; Olympus 5,7 Mio. Zellen ergibt rund 400 kB). Litematica weist Dateien mit neuerer `Version` als der eigenen ab. Deshalb folgt die geschriebene Version der gewählten DataVersion: bis 2859 → 5, 2860–3700 → 6, ab 3701 → 7, jeweils `SubVersion` 1. Das Block-, Paletten- und Tile-Layout ist in allen drei gleich.

## Nachweis

- Unabhängige [Mehrregionen-Fixture](../../fixtures/litematic/README.md) aus eigenem Python-`struct`-Writer mit handgeschriebener Zelltabelle, negativen Größen, Lücke, über die Long-Grenze reichendem Eintrag und Zusatzdaten.
- Unabhängiger Python-Leser `scripts/verify_litematic.py` (rechnet mit einer großen Ganzzahl über den ganzen Bitstrom) vergleicht Leser und Schreiber Zelle für Zelle.
- `tests/litematic.test.mjs`: Fixture, Python-Abgleich, Einzelregion, Bitpacking für 2–20 Bit gegen eine BigInt-Referenz, Fehlerfälle, Limits, Überlappung, verworfene BlockEntities, 1.12-Dateien, Formaterkennung, Schreiber mit beiden Ankern und Lückenpolitiken, Roundtrip, Versionswahl, Export aus einer Revision.
- `tests/e2e/litematic.e2e.mjs`: Betrachter mit Testdatei, Bibliothek mit Regionswahl und Speichern, Export-Download geprüft vom Python-Leser, unkomprimierte Datei mit Aufschlüsselung und vorbelegtem Autor.
- Zweite unabhängige Fixture `realworld.nbt.hex` (gleicher Python-Writer) in der Form echter Dateien: unkomprimiert, Wurzel ohne `SubVersion`, `Position` an der fernen Ecke mit ganz negativer `Size`, TAG_End-Leerlisten, Schild-TileEntity, Gemälde und Rahmen mit negativer `Pos`, alte IDs `chain`/`grass`.
- Offen: im Spiel geprüfter Export (Litematica auf Philipps PC, FORMAT-02-S02).

Offen: Abnahme mit einer echten, von Litematica gespeicherten Datei und das Laden einer exportierten Datei in Litematica im Spiel (Rechner des Nutzers). Bis dahin ist die Kompatibilität aus dem Quelltext abgeleitet, nicht im Spiel bestätigt.
