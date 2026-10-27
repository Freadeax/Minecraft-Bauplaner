# Unabhängige binäre Vertragsfixture

Eigene synthetische Daten, keine fremde Welt und kein Nachweis einer bestimmten Minecraft-/WorldEdit-Version. `asymmetric.nbt.hex` enthält feste Big-Endian-NBT-Bytes, erzeugt vom unabhängigen Python-`struct`-Writer [make_schem_fixture.py](../../scripts/make_schem_fixture.py). Der TypeScript-Reader/Normalizer erzeugt diese Erwartungen nicht. GZip wird für Tests/Website unabhängig mit Node `zlib` ergänzt. Kein produktiver Schem-Writer.

Manuelle Erwartungen: Dimensionen 3×2×2, Offset (−10,64,30), DataVersion 3465 als reine Quelldateiangabe, ohne Mapping auf eine bestätigte Spielversion. Reihenfolge x + z×3 + y×6. Zustände pro Ebene:

| Y | Z | X=0 | X=1 | X=2 |
|---|---|---|---|---|
| 0 | 0 | Stein | Luft | Modmaschine |
| 0 | 1 | Fass | Stein | Luft |
| 1 | 0 | Luft | Stein | Modmaschine |
| 1 | 1 | Luft | Luft | Stein |

7 belegte Blöcke (4 Stein, 2 Modmaschine, 1 Fass), 5 explizite Luftzellen. Palette bewusst mit Lücken: 0,7,130,2. 130 braucht zwei VarInt-Bytes. Fass-BlockEntity bei (0,0,1) mit vollständigem Id-/Pos-/Data-Wrapper und unbekanntem Zusatzfeld. Long-Grenzen, typisierte Arrays und Java-Modified-UTF-8 (`Ä`, Nullzeichen, Emoji als Surrogatpaar) sind bekannt. Biom-/Entity-/Metadaten und CustomField müssen im vollständigen Quell-NBT erhalten bleiben und als nicht dargestellte Zusatzdaten gemeldet werden.

Dies prüft Formatvertrag und unabhängige Bytes. Ein Export aus einem echten Referenzwerkzeug und eine unabhängige Spiel-/WorldEdit-Prüfung bleiben als zusätzliche Integrationsabnahme offen.
