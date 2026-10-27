# Schem-v3-Export (P3-01, R-022)

Stand: 27.10.2026, Block B2. Ergänzt [Schem-Import](SCHEM_IMPORT.md), [Domäne](DOMAIN.md) und [Voxelvertrag](VOXEL_CONTRACT.md).

## Datenfluss

1. **Exportsperre.** `resolveProject` liefert `exportBlockers` (ungeklärte Voxelkonflikte, fehlende Versionen, ungelöste Zustands-/NBT-Transformationen, leeres Projekt). Ist die Liste nicht leer, wird weder eingefroren noch geschrieben (`DomainError('EXPORT_BLOCKED')`).
2. **Revision.** `revisionForExport` verwendet die neueste Revision, wenn sie Instanzen und Verbindungen des aktuellen Stands exakt (kanonisches JSON) enthält; sonst friert sie eine neue nummerierte Revision ein. Die Oberfläche speichert eine neue Revision erst, nachdem die Datei erfolgreich erzeugt wurde – ein fehlgeschlagener Export hinterlässt keinen halben Zustand.
3. **Auflösung der Revision.** `exportRevisionSchem` löst die *eingefrorenen* Instanzen mit demselben Composer und denselben unveränderlichen Bauteilversionen auf wie der Editor und prüft die Sperre erneut. Ältere Revisionen bleiben exportierbar und liefern dieselbe Datei (Metadata.Date = Zeitpunkt der Revision, deterministische Palette).
4. **Writer.** `buildSchemV3` (rein, `packages/formats/src/schemWrite.ts`) baut den NBT-Baum, `writeNbt` (`nbtWrite.ts`) serialisiert Big-Endian-NBT mit Modified UTF-8, `gzip` komprimiert über `CompressionStream`.

Material, Vorschau und Export nutzen dasselbe Weltpayload; es gibt keine zweite Koordinaten- oder Zähllogik.

## Dateiaufbau

| Feld | Inhalt |
|---|---|
| `Schematic.Version` | 3 |
| `DataVersion` | gewählte Zielversion; Vorschlag aus Projektprofil (`dataversion-N`) oder gemeinsamer DataVersion importierter Bauteile, sonst Pflichteingabe. Nie geraten, nie gegen eine Registry geprüft |
| `Width/Height/Length` | Weltbox (unsigned Short, ≤ 65535); Volumen ≤ 4 000 000 Zellen |
| `Offset` | Einfügepunkt (siehe unten) |
| `Blocks.Palette` | `id[key=value,…]` mit sortierten Properties; IDs 0…n−1 in Reihenfolge des ersten Auftretens (Y → Z → X) |
| `Blocks.Data` | ein VarInt je Zelle, Index `x + z·W + y·W·L` |
| `Blocks.BlockEntities` | `Pos` (lokal), `Id`, `Data`; aus Schem importierte Einträge behalten zusätzliche Felder, Roh-NBT (`id/x/y/z`) wird in `Id`/`Data` übertragen |
| `Metadata` | `Name` (Projekt · Revision), optional `Author`, `Date`, `RequiredMods` (Nicht-`minecraft`-Namespaces), `WEOffsetX/Y/Z`, `Bauplaner{ProjectId, RevisionId, RevisionNumber, Profile}` |

Biome und freie Entities werden nicht geschrieben; der Bericht sagt das.

## Luft-, Lösch- und Auswahlpolitik

| Zelle im Weltpayload | Geschrieben als | Bericht |
|---|---|---|
| Block | eigener Zustand | `counts.blocks` |
| ausdrückliche Luft (`air`, `cave_air`, `void_air`) | eigener Luftzustand | `counts.explicitAir` |
| Löschen (`erase`) | `minecraft:air` | `counts.erasedAsAir` |
| nicht ausgewählt (Lücke in der Box) | Wahl: `minecraft:air` (Standard) oder `minecraft:structure_void` | `counts.unselected`, `unselectedState` |

Luft räumt in der Welt nur, wenn beim Einfügen Luft nicht übersprungen wird (WorldEdit ohne `-a`). Mit `air` als Lückenpolitik löscht ein solches Einfügen auch Gelände in nicht ausgewählten Zellen; der Bericht warnt jeweils mit der genauen Anzahl. `structure_void` wird von WorldEdit als echter Block gesetzt und ist nur für Werkzeuge gedacht, die ihn überspringen.

## Einfügepunkt

- **Projektursprung** (Standard): `Offset` = Weltminimum. Die Projektkoordinate 0/0/0 liegt auf dem Einfügepunkt; Instanzen behalten ihre relative Lage zum Projektursprung.
- **Untere Ecke**: `Offset` = 0/0/0; die untere Nordwest-Ecke der Box liegt auf dem Einfügepunkt.

`WEOffsetX/Y/Z` wird gleich `Offset` gesetzt, damit WorldEdit (liest Offset als Minimum und WEOffset relativ dazu) denselben Ursprung ergibt. Diese WorldEdit-Auslegung ist nicht mit echtem WorldEdit geprüft.

## Ablehnungen statt stiller Verluste

DataVersion keine positive int32-Ganzzahl; unbekannter Anker oder unbekannte Politik; Volumen-/Achsgrenzen; Property-Schlüssel oder -Werte außerhalb `[a-z0-9_.+-]` (im Palettentext nicht darstellbar); BlockEntity ohne `Id`/`id`; reservierte Metadata-Felder. Der NBT-Writer prüft jeden Wert (Byte/Short/Int-Bereich, Long als int64-Text, Float exakt float32, endliche Doubles, homogene Listen, leere End-Listen, Text ≤ 65535 Bytes, Tiefe ≤ 512).

## Prüfung

- `scripts/verify_schem.py`: unabhängiger Python-Leser (nur `gzip`/`struct`, kein gemeinsamer Code). Prüft GZip, Wurzel, Version 3, Abmessungen, lückenlose eindeutige Paletten-IDs, VarInt-Länge/-Anzahl = Volumen, unbenutzte Paletteneinträge, BlockEntities (in der Box, nicht auf Luft, eindeutig, `Id` vorhanden). Ausgabe JSON mit Zellen, Mengen, BlockEntities, Metadata-Schlüsseln; `--expect` vergleicht mit Erwartungswerten.
- `tests/schem-export.test.mjs`: Writer reproduziert die unabhängige Python-Fixture byte-genau; handgezählte 3×2×2-Welt mit negativem Ursprung, Lösch-/Luft-/Lückenzellen, Modblock und zwei BlockEntity-Formen – Palette, VarInt-Bytes und jede Zelle von Hand erwartet und vom Python-Leser bestätigt; Mehrbyte-VarInts (300 Zustände); Roundtrip über den eigenen Reader; Exportsperre, Revisionswiederverwendung, Reproduzierbarkeit alter Revisionen, Ablehnungen und beschädigte Dateien.
- `tests/e2e/export.e2e.mjs`: Browser lädt die Datei herunter, Python-Leser prüft sie, gemeldeter SHA-256 = Dateihash, Konflikt sperrt den Export, Revision 1 bleibt byte-gleich exportierbar.

## Grenzen

Keine Abnahme mit echtem WorldEdit/Minecraft; DataVersion und Blockzustände werden weder geprüft noch zwischen Versionen umgewandelt. Themes/Generatoren (P5-02) gibt es noch nicht, daher wird nichts davon angewendet. Exportgrenze 4 000 000 Zellen im Browser-Hauptthread.
