# Unabhängige Litematic-Vertragsfixture

Eigene synthetische Daten, keine fremde Welt und kein Export aus Litematica. `multiregion.nbt.hex` enthält feste Big-Endian-NBT-Bytes, erzeugt vom unabhängigen Python-`struct`-Writer [make_litematic_fixture.py](../../scripts/make_litematic_fixture.py). Der TypeScript-Reader erzeugt diese Erwartungen nicht. GZip ergänzen die Tests mit Node `zlib`; auf Pages liegt dieselbe Datei als `examples/contract-multiregion.litematic`.

Format 6, SubVersion 1, MinecraftDataVersion 3465 (reine Dateiangabe). Zwei Regionen mit vorzeichenbehafteten Größen; Koordinaten relativ zum Schematic-Ursprung:

| Region | Position | Size | Minimum | Maße | Palette | Bit je Eintrag | Longs |
|---|---|---|---|---|---|---|---|
| Haus | 4/0/1 | 3/2/−4 | 4/0/−2 | 3×2×4 | 6 | 3 | 2 |
| Turm | 1/0/0 | −2/3/1 | 0/0/0 | 2×3×1 | 3 | 2 | 1 |

Umschließende Box: Minimum 0/0/−2, Größe 7×3×4 = 84 Zellen, davon 30 belegt (22 Blöcke, 8 Luft) und 54 unausgewählt (Lücke zwischen den Regionen). Index je Region `y·B·L + z·B + x`.

Haus (x = 4, 5, 6):

| Y | Z | X=4 | X=5 | X=6 |
|---|---|---|---|---|
| 0 | −2 | Stein | Stein | Stein |
| 0 | −1 | Stein | Eichenbretter | Stein |
| 0 | 0 | Truhe | Luft | Eichentreppe |
| 0 | 1 | Stein | Stein | Modmaschine |
| 1 | −2 | Luft | Eichenbretter | Luft |
| 1 | −1 | Eichentreppe | Luft | Eichenbretter |
| 1 | 0 | Luft | Modmaschine | Luft |
| 1 | 1 | Modmaschine | Luft | Eichentreppe |

Zelle 21 (Y=1, Z=1, X=4, Modmaschine = Wert 5 = binär 101) liegt über der Grenze von Long 0 zu Long 1; ihr niedrigstes Bit ist Bit 63 und macht Long 0 negativ.

Turm (Z = 0): Y=0 Bruchstein, Bruchstein · Y=1 Bruchstein, Luft · Y=2 Stein, Bruchstein. Stein kommt in beiden Paletten vor und wird zusammengefasst.

Zusatzdaten: Truhen-Tile-Entity bei Haus-relativ 0/0/2 (absolut 4/0/0) mit Modified-UTF-8-Namen `Ä`, Nullzeichen, Emoji; ein Rüstungsständer als freie Entity; ein geplanter Blocktick; Metadata mit Vorschaubild-Array und int64-Grenze. Diese Daten müssen im Quell-NBT bleiben und im Bericht genannt werden.
