# Weltimport und Geländeprüfung (WORLD-IMPORT-01)

Ein begrenzter Bereich wird direkt aus den Regionsdateien (`.mca`, Anvil) einer Minecraft-Java-Welt gelesen. Daraus entsteht entweder ein eigenes Bauteil in der Bibliothek (Seite `#/welt`) oder eine Geländeprüfung für ein Projekt mit Weltlage (Projektbereich „Gelände“, `#/projekt/<id>/gelaende`). Die Welt wird nie verändert, Dateien verlassen den Browser nicht.

## Bausteine

| Datei | Aufgabe |
|---|---|
| `packages/formats/src/anvil.ts` | Regionskopf, Chunk-Datensätze, Kompression, Chunk-NBT 1.16–26.3, Sections, BlockEntities, `RegionReader` mit wahlfreiem Lesen |
| `packages/formats/src/lz4.ts` | LZ4-Blockstrom im lz4-java-Format (Chunk-Kompression 4) mit XXH32-Prüfsumme |
| `packages/formats/src/defaultStates.ts` | Standardzustände aller 884 Blöcke mit Properties aus dem offiziellen 26.3-Bericht (generiert) |
| `packages/formats/src/worldExcerpt.ts` | Dichte Probe eines Weltbereichs (`sampleWorld`), Übernahme als Payload (`sampleToPayload`), Draufsicht (`surfaceMap`) |
| `packages/domain/src/world/terrain.ts` | Geländeprüfung eines platzierten Projekts (`checkTerrain`) |
| `apps/web/src/views/world/` | Worker (liest Dateien per `File.slice`), Dateiauswahl, Draufsicht mit Bereichswahl, Seite Weltimport |
| `apps/web/src/views/project/TerrainTab.tsx` | Projektbereich „Gelände“ |

## Format (geprüft an echten 26.3-Welten)

- Regionsdatei: 4 KiB Positionen (3 Byte Sektorversatz, 1 Byte Sektoranzahl, Index `(cx & 31) + (cz & 31)·32`), 4 KiB Speicherzeiten, dann Sektoren à 4 KiB. Datensatz: Länge (int32 BE, inkl. Typbyte), Typ, Daten. Typ 1 GZip, 2 zlib, 3 ohne, 4 LZ4; Bit 128 = Daten in `c.<x>.<z>.mcc`. Typ 127 (Mod-eigene Kompression) wird abgelehnt.
- LZ4 (26.3 mit `region-file-compression=lz4`): Blöcke `"LZ4Block"`, Token (Methode 0x10 roh / 0x20 LZ4 | Stufe), Längen und Prüfsumme LE; Prüfsumme = XXH32 (Seed `0x9747B28C`) & `0x0FFFFFFF`, Abschluss mit leerem Block. An echter Datei nachgemessen.
- Chunk ab 1.18 (DataVersion ≥ 2844): `xPos`, `zPos`, `yPos`, `Status`, `sections[]` mit `Y` und `block_states {palette, data}`, `block_entities[]` mit absoluten `x/y/z`. 1.16/1.17: `Level.Sections[]` mit `Palette`/`BlockStates`, `Level.TileEntities`. Vor 1.16 (DataVersion < 2529) wird abgelehnt, weil die Indizes dort über Long-Grenzen laufen.
- Indizes: `y·256 + z·16 + x`, Bitbreite `max(4, ⌈log2 n⌉)`, ⌊64/Bit⌋ Einträge je Long ab den niedrigsten Bits, keine Überlappung. Ein Eintrag ohne `data` ist einheitlich.
- **Neu in 26.x:** Ein Block im Standardzustand steht in der Palette nur als ID (`"minecraft:chest"`, in gemischten Listen `{"": "minecraft:chest"}`), alle anderen als `{id, properties}`; ältere Chunks derselben Welt behalten `{Name, Properties}`. Der Leser ergänzt bloße IDs mit den Standardwerten aus `defaultStates.ts`, damit Zustände vollständig bleiben (eine Truhe bleibt `facing=north,type=single,waterlogged=false`). Modblöcke als bloße ID behalten leere Properties und werden im Bericht genannt.
- Ordner: 26.x `<welt>/dimensions/minecraft/<dimension>/region`, ältere Versionen `region`, `DIM-1/region`, `DIM1/region`. Entities liegen in eigenen Dateien und werden nicht übernommen.

Standardzustände neu erzeugen: `java -DbundlerMainClass=net.minecraft.data.Main -jar server.jar --reports --output out` und `node scripts/gen/gen_default_states.mjs out/reports/blocks.json 26.3 5023 <sha1 von server.jar>`.

## Konsistente Sicherung und Bereichswahl (S01)

- Gelesen wird eine Kopie der Regionsdateien, am besten bei geschlossener Welt (Einzelspieler verlassen, Server-Sicherung oder nach `/save-all flush`). Eine während des Schreibens kopierte Datei fällt durch die Kopfprüfung auf: Einträge außerhalb der Datei oder überlappende Sektoren machen die Region unlesbar, ein Chunk mit fremden Koordinaten oder beschädigten Daten wird als „unlesbar“ geführt.
- Speicherzeiten je Chunk werden angezeigt (zuletzt gespeichert) und im Original vermerkt.
- Bereich: zwei Ecken wie im Spiel (inklusive). Höchstens 1024 Blöcke je waagerechter Richtung, 4064 Höhe, 16 777 216 Zellen, 4096 Chunks; für die Bibliothek zusätzlich höchstens 4 Mio. Zellen wie bei Dateiimporten (SIZE-01, vorher 256 je Achse und 250 000).
- Unbekannt ist jede Zelle, deren Chunk fehlt (Regionsdatei nicht gewählt, nie erzeugt, nicht fertig generiert, externe `.mcc` fehlt, unlesbar). Unbekannt wird nie zu Luft: In der Bibliothek bleibt es unausgewählt, in der Geländeprüfung „unbekannt“. Unfertige Chunks liest man nur auf ausdrücklichen Wunsch.

## Übernahme in die Bibliothek

Optionen: Luft weglassen oder als ausdrückliche Luft übernehmen, auf Blöcke zuschneiden, natürliches Gelände weglassen (`NATURAL_TERRAIN_IDS`). BlockEntities werden mit vollständigen Rohdaten übernommen; Export rechnet ihre Koordinaten wie bei anderen Rohdaten um. Quelle `world-region` mit Box und Dimension; als Original wird eine exakte Schem-v3-Datei des Ausschnitts gespeichert (`Metadata.Bauplaner.Kind = "world-excerpt"`, Weltursprung, Box, Regionsnamen, jüngste Speicherzeit). Die Regionsdateien selbst werden aus Größengründen nicht gespeichert.

## Geländeprüfung

Box = Projektgrenzen an der Weltlage, nach unten um die Suchtiefe (Standard 16) erweitert. Je geplanter Zelle: steht schon (gleiche Block-ID), frei (Luft oder ersetzbar wie Gras, Schnee), Gelände im Weg, freiräumen (geplante Luft in festem Gelände), im Wasser/Lava, unbekannt. Je Spalte der untersten Bauschicht: trägt, hängt in der Luft (mit Unterbautiefe bis zum Boden, als Untergrenze markiert, wenn die Suchtiefe nicht reicht), auf Wasser/Lava, unbekannt. Überhänge und obere Stockwerke werden nicht als Fundament gewertet. Dazu Abtragliste je Blockart, Bodenhöhe im Grundriss (Bäume zählen nicht als Boden) und ein Vorschlag für den Ursprung Y, den man als rückgängig machbare Operation `world.set` übernehmen kann.

## Geländeaufnahme und Bauplatz (TERRAIN-01)

Aus den gewählten Regionsdateien speichert der Reiter „Gelände“ eine dauerhafte Geländeaufnahme (Höhenkarte) des Bauplatzes; „Als Bauplatz anlegen“ in `#/welt` legt aus einem X/Z-Bereich ein leeres Projekt mit Weltlage und Aufnahme an und öffnet die Weltkarte. Weltkarte und Anlagen nutzen sie ohne die Dateien ([TERRAIN](TERRAIN.md)).

## Grenzen

- Nur Blöcke: keine Entities, kein Redstone-Verhalten, keine Server-Schutzgebiete.
- „Steht schon“ vergleicht Block-IDs, nicht alle Properties.
- Mod-Kompression (Typ 127) und Welten vor 1.16 werden nicht gelesen.
- Standardzustände stammen aus 26.3; für neuere Versionen den Bericht neu erzeugen. Das verbindliche Versionsprofil bleibt PROFILE-01.
