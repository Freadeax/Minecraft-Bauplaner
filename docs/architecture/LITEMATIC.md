# Litematic-Import und -Export (P5-01)

Stand: 27.10.2026. Implementierung in `packages/formats/src/litematic.ts` (Leser), `litematicWrite.ts` (Schreiber) und `structure.ts` (Formaterkennung), Einbindung im Import-Worker, in Bibliothek, Betrachter und Tab „Export“. Kein Versionskonverter und kein Nachweis beliebiger Minecraft-/Modpack-Kompatibilität.

## Format

GZip-komprimiertes NBT, wie es Litematica schreibt (Quelle: `LitematicaSchematic`, `LitematicaBitArray`, `LitematicaBlockStateContainer`, `PositionUtils` im Litematica-Quelltext für MC 1.20 und 1.21, am 27.10.2026 gelesen; kein Code übernommen):

- Wurzel: `Version` (Int), `SubVersion` (Int, optional), `MinecraftDataVersion` (Int, optional), `Metadata`, `Regions` (Compound Name → Region).
- Region: `Position` und `Size` je `{x,y,z}` relativ zum Schematic-Ursprung. `Size` darf je Achse negativ sein; dann reicht die Region von `Position` aus zu kleineren Koordinaten, Minimum = `Position + Size + 1`. Größe 0 wird abgewiesen.
- `BlockStatePalette`: Liste `{Name, Properties}`; `BlockStates`: LongArray, eng gepackt mit `max(2, ⌈log2(Palettengröße)⌉)` Bit je Zelle. Ein Eintrag darf über die Grenze zweier Longs reichen; Bit k des Datenstroms ist Bit k mod 64 von Long ⌊k/64⌋. Länge muss genau `⌈Volumen·Bit/64⌉` sein. Zellindex `y·B·L + z·B + x`.
- `TileEntities`: rohes Tile-NBT mit `id` und `x/y/z` relativ zum Regionsminimum. `Entities`, `PendingBlockTicks`, `PendingFluidTicks` werden nicht übernommen, bleiben aber im Quell-NBT und werden im Bericht gezählt.

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

Grenzen wie beim Schem-Import: 2 MB komprimiert, 8 MB entpackt, 20.000 Zellen über alle importierten Regionen, 256 je Achse der Box, 64 Regionen, 20.000 Paletteneinträge, NBT-Tiefe 32, 200.000 Knoten, 5 s.

## Formaterkennung

`importStructure` entpackt einmal und entscheidet am Inhalt: `Schematic`-Compound → Sponge Schem v3, `Regions` + `Version` → Litematic. Sponge v1/v2, MCEdit-`.schematic` und Vanilla-Strukturdateien werden mit eigener Meldung abgewiesen. Die Dateiendung entscheidet nicht.

## Export

Tab „Export“ → Dateiformat „Litematica (.litematic)“. Eine Region mit dem Projektnamen, `Position` = Einfügepunkt (Projektursprung oder untere Ecke wie beim Schem-Export), positive `Size`. Palette: Index 0 immer `minecraft:air`, dann Zustände in Y→Z→X-Reihenfolge des ersten Auftretens; Ausgabe deterministisch. Löschzellen werden Luft, nicht ausgewählte Zellen Luft oder `minecraft:structure_void`. BlockEntities im Sponge-Format (Id/Pos/Data) werden in Litematicas Tile-Format (id/x/y/z, Daten flach) übertragen; Zusatzfelder neben Id/Pos/Data haben dort keinen Platz und werden gezählt. Metadata enthält Name, Autor, Kommentar der Revision, Mengen, Zeit und das eigene Feld `Bauplaner` (Projekt, Revision, Profil, ProjectMin).

Litematica weist Dateien mit neuerer `Version` als der eigenen ab. Deshalb folgt die geschriebene Version der gewählten DataVersion: bis 2859 → 5, 2860–3700 → 6, ab 3701 → 7, jeweils `SubVersion` 1. Das Block-, Paletten- und Tile-Layout ist in allen drei gleich.

## Nachweis

- Unabhängige [Mehrregionen-Fixture](../../fixtures/litematic/README.md) aus eigenem Python-`struct`-Writer mit handgeschriebener Zelltabelle, negativen Größen, Lücke, über die Long-Grenze reichendem Eintrag und Zusatzdaten.
- Unabhängiger Python-Leser `scripts/verify_litematic.py` (rechnet mit einer großen Ganzzahl über den ganzen Bitstrom) vergleicht Leser und Schreiber Zelle für Zelle.
- `tests/litematic.test.mjs`: Fixture, Python-Abgleich, Einzelregion, Bitpacking für 2–20 Bit gegen eine BigInt-Referenz, Fehlerfälle, Limits, Überlappung, verworfene BlockEntities, 1.12-Dateien, Formaterkennung, Schreiber mit beiden Ankern und Lückenpolitiken, Roundtrip, Versionswahl, Export aus einer Revision.
- `tests/e2e/litematic.e2e.mjs`: Betrachter mit Testdatei, Bibliothek mit Regionswahl und Speichern, Export-Download geprüft vom Python-Leser.

Offen: Abnahme mit einer echten, von Litematica gespeicherten Datei und das Laden einer exportierten Datei in Litematica im Spiel (Rechner des Nutzers). Bis dahin ist die Kompatibilität aus dem Quelltext abgeleitet, nicht im Spiel bestätigt.
