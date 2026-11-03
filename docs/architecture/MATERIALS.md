# Materialbedarf und Bauitems (B1)

Stand: 27.10.2026. Umsetzung von P1-04a / R-017. Implementierung in [materials.ts](../../packages/domain/src/materials.ts), Tests in `tests/materials.test.mjs` und `tests/e2e/materials.e2e.mjs`, Oberfläche im Projekt-Tab „Material“ (`apps/web/src/views/project/MaterialsTab.tsx`). Ergänzt den [Domänenvertrag](DOMAIN.md).

## Drei getrennte Ebenen

| Ebene | Inhalt | Quelle |
|---|---|---|
| Platzierte Zustände | exakte Zellzahl je Blockzustand (ID + alle Properties), getrennt von Luft- und Löschzellen | `resolution.world` |
| Bauitems | Items, die zum Platzieren nötig sind, mit Regel, Herkunft und Konfidenz | Vanilla-Java-Katalog `vanilla-java-items-v2` (v2: Stein-/Kupfervarianten, Kessel mit Inhalt, Froschlaich, Chorus-Pflanze) |
| Lager | volle Stacks + Rest, Inventarplätze, Shulkerkisten à 27 Plätze | Stapelgröße 1/16/64 je Item |

Rohstoffe und Rezepte (z. B. Steinziegel ← Stein) sind eine vierte, getrennte Ebene, siehe [Rohstoffe und Rezepte](#rohstoffe-und-rezepte-b1-r). Werkzeuge werden nicht gezählt. Kein unvollständiger Bedarf wird als vollständige Liste dargestellt.

## Mengenquelle

Mengen kommen ausschließlich aus `resolution.world` (nie aus Meshes). Identische Überlappungen sind dort bereits einmal gezählt. Ungeklärte Voxelkonflikte folgen der Vorschauwahl; der Bericht zählt sie (`conflicts`) und gilt dann als vorläufig. Der Umfang „Instanz“ zählt die Weltzellen, deren erster Eigentümer diese Instanz ist; damit ergeben die Instanzberichte zusammen exakt den Projektbericht. Gemeinsam genutzte identische Zellen erscheinen nur bei der zuerst eingefügten Instanz.

## Itemregeln

| Regel | Beispiele | Ergebnis |
|---|---|---|
| `direct` | Planken, Stämme, Treppen, Steinziegel, gelistete Einzelblöcke | Item-ID = Block-ID |
| `renamed` | `redstone_wire`, `tripwire`, `carrots`, `cocoa`, Stängel, Ranken | Redstone, Faden, Karotte, Kakaobohnen, Samen … |
| `wall-variant` | `wall_torch`, `*_wall_sign`, `*_wall_hanging_sign`, `*_wall_banner`, `*_wall_head/skull`, Korallen-Wandfächer | stehendes Item; Mauern (`*_wall`) bleiben Mauern |
| `multiblock` | Türen, Doppelpflanzen (`half`), Betten (`part`/`facing`) | genau ein Item je Objekt; die untere Hälfte bzw. das Fußteil trägt es. Partner wird geometrisch geprüft (Tür: Zelle darunter, Bett: Fuß = Kopf − facing). Eine einzelne obere Hälfte bzw. ein Kopfteil ohne Fuß zählt ein Item mit Hinweis |
| `slab` | `type=double` | 2 Stufen; `top`/`bottom` 1; fehlendes `type` 1 als Annahme |
| `count` | Kerzen `candles`, Seegurken `pickles`, Schnee `layers`, Schildkröteneier `eggs`, Blütenblätter/Wildblumen `flower_amount`, Laubstreu `segment_amount` | Anzahl laut Property; ungültige Werte ⇒ ungelöst |
| `composite` | `potted_*`, Kerzenkuchen | Blumentopf + Pflanze bzw. Kuchen + Kerze |
| `derived` | Ackerboden, Trampelpfad, hohes Seegras | Ausgangsitem, als Annahme markiert |
| `assumed` | Vanilla-ID ohne Katalogeintrag | Item-ID = Block-ID **angenommen**, sichtbar markiert |

Kolbenkopf (`piston_head`) gehört zum Kolben und erzeugt kein eigenes Item.

## Ungelöst (nicht in den Bauitems)

| Grund | Beispiele |
|---|---|
| `liquid` | Wasser, Lava, Blasensäule |
| `mod-namespace` | jede ID außerhalb `minecraft:` |
| `no-item` | Feuer, Portale, brüchiges Eis, bewegter Kolben, gespeicherte Luftzustände |
| `creative-only` | Barriere, Licht, Befehls-/Strukturblöcke, Grundgestein, Spawner, befallene Blöcke |
| `invalid-state` | Zweiteiler ohne `half`, Bett ohne `part`/`facing`, Anzahl außerhalb des Bereichs |

Ungelöste Zustände bleiben in der Ebene „platzierte Zustände“ gezählt und werden mit Grund angezeigt.

## Lager

Stapelgröße 1: Betten, Shulkerkisten, Kuchen, gefüllte Eimer, verzierter Krug. 16: Schilder, Hängeschilder, Banner. Sonst 64. Inventarplätze = ⌈Menge / Stapelgröße⌉. Shulkerkisten = ⌈Plätze lagerbarer Items / 27⌉; Shulkerkisten selbst sind nicht lagerbar und werden separat ausgewiesen.

## Vollständigkeit und Hinweise

`complete` ist nur wahr, wenn Blöcke vorhanden sind und es keine ungeklärten Konflikte, keine ungelösten Zustände und keine Annahmen gibt. Zusätzliche Hinweise: wassergeflutete Blöcke (Wasser nicht gezählt), Behälter mit gespeichertem Inhalt (Inhalt nicht gezählt), Löschzellen (abbauen), Katalogversion ohne exakte Versionsprüfung.

## Oberfläche

Tab „Material“: Umfang Gesamtprojekt oder einzelne Instanz, Status vollständig/vorläufig mit Gründen, Kennzahlen (Bauitems, Plätze, Shulkerkisten, platzierte Blöcke), Itemtabelle mit Stacks/Plätzen/Regel/Herkunft, Tabelle ungelöster Zustände, aufklappbare Liste platzierter Zustände, Suche, CSV-Export (Semikolon, UTF-8 mit BOM, Status- und Hinweisspalten).

## Grenzen

- Katalog ist Vanilla Java ohne Bindung an eine exakte Version; neue Blöcke landen als Annahme, nicht als falsche Gewissheit.
- Kein Lager-/Besitzabgleich; „vorhanden“ im Rohstoffabschnitt ist eine Sitzungsangabe und wird nicht gespeichert.
- Paarprüfung von Mehrblockobjekten erfolgt beim Umfang „Instanz“ nur innerhalb der Instanz; für Teile einer Welt (Bauschritte, Schichten) sucht `materialsForParts` bzw. `computeMaterials(…, { partners: 'world' })` in der ganzen Welt, damit sich die Teile exakt zum Gesamtbedarf addieren.
- Die Bauanleitung (B4) zeigt die Bauitems je Schritt und eine Packliste je Schicht ([GUIDE](GUIDE.md)).

## Rohstoffe und Rezepte (B1-R)

Stand: 27.10.2026. Rest von R-017. Implementierung in [recipes.ts](../../packages/domain/src/recipes.ts), Tests in `tests/recipes.test.mjs` und `tests/e2e/recipes.e2e.mjs`, Oberfläche als Abschnitt „Rohstoffe und Rezepte“ im Tab „Material“ (`apps/web/src/views/project/RawMaterialsPanel.tsx`).

Eingang sind die Bauitems des Materialberichts (gleicher Umfang: Projekt oder Instanz). Ungelöste Blockzustände fehlen dort und damit auch hier; der Abschnitt sagt das, solange der Materialbericht vorläufig ist.

| Baustein | Regel |
|---|---|
| Katalog `vanilla-java-recipes-v1` | 866 Rezepte für 734 Items: Holzfamilien (9 Hölzer, 2 Netherstämme, Bambus), 40 Steinfamilien mit Treppe/Stufe/Mauer, Polier-/Meißelvarianten, Schmelzen, 16 Farben (Wolle, Teppich, Bett, Banner, Trockenbeton/Beton, Keramik, Glas, Kerzen, Shulkerkisten), Farbstoffe, Erz- und Kompressionsblöcke, Kupfer mit Oxidationsstufen und Wachs, Licht, Arbeitsblöcke, Redstone, Schienen |
| Stationen | Werkbank, Steinsäge, Ofen, Werkzeug/Zeit (Axt entrindet, Schere schnitzt, Kupfer oxidiert), Wasser (Beton aushärten, Schlamm) |
| Rohstoffe | ausdrückliche Liste mit Herkunft (Abbau, Behutsamkeit, Holzfällen, Pflanzen, Schere, Mob-Drop, Fund/Handel). Rohstoffstatus gewinnt vor einem Rezept (weiße Wolle wird geschoren). Stein, Glas, Tiefenschiefer werden standardmäßig hergestellt und lassen sich als „vorhanden“ markieren |
| Rezeptwahl | je Item genau ein Rezept; „Steinsäge bevorzugen“ (Standard) nimmt die Steinsäge, sonst Werkbank/Ofen |
| Tags | „beliebige Planken/Stämme/Holzstufen“, Kohle/Holzkohle, Ofenstein, Seelenerde: die Sorte, die im Baum schon vorkommt (erste in Entdeckungsreihenfolge, Bauitems nach Menge), sonst ein benannter Standard – beides als Hinweis sichtbar |
| Rechnung | topologisch, Verbraucher zuerst: der Gesamtbedarf eines Zwischenprodukts steht fest, bevor auf ganze Vorgänge aufgerundet wird. Aufrundungsreste werden so geteilt (4 Eichentreppen + Knopf + Druckplatte = 9 Planken = 3 Stämme, nicht 4) und als Rest ausgewiesen |
| Ergebnis | Grundbedarf (Rohstoff / vorhanden / kein Rezept) mit Stacks, Arbeitsschritte in Bauordnung, Vorgänge je Station, Rest, Brennstoff (Schmelzvorgänge ÷ 8 Kohle, getrennt, nicht im Grundbedarf), CSV |
| Vollständig | nur ohne Items „kein Rezept“; solche Items (z. B. angeschlagener Amboss, Modblöcke) bleiben als Grundbedarf markiert |

Katalogprüfung (`assertRecipeCatalog`, Test): jedes Rezept gültig, jeder Tag bekannt, jede Zutat herstellbar oder Rohstoff, alle 734 Ausgaben azyklisch auflösbar mit beiden Methoden. Bilanz-Test: für jedes Item ist direkter Bedarf + Verbrauch aller Schritte = Bedarf des herstellenden Schritts bzw. Grundbedarf; Rundung minimal; Zutaten stehen vor ihren Verbrauchern. Alle Beispielbauteile und 16 Katalog-Gebäude lösen vollständig auf.

Grenzen (Stand B1-R, siehe MAT-02 unten): nur ein Rezept je Item; Werkzeuge, Brennstoff und Wasser nicht im Grundbedarf; „vorhanden“ wird nicht gespeichert; Oxidation als Zeitschritt ohne Dauer; seltene Items ohne Eintrag erscheinen als „kein Rezept“.

## Profilgebundene Rezepte (MAT-02) · 03.11.2026

Katalog jetzt `vanilla-java-recipes-v2+java-26.3`. Jedes Werkbank-, Steinsägen- und Ofenrezept des eigenen Katalogs ist gegen die 1696 Rezepte des offiziellen 26.3-Servers geprüft (`packages/domain/src/recipeProfile.ts`, Herkunft in [VERSION_PROFILE](VERSION_PROFILE.md)) und trägt die Datei, der es folgt (`profileFile`). Der Abgleich hat 15 echte Fehler gefunden und behoben:

- Die Kette heißt in 26.3 `iron_chain`; das alte `chain`-Item gibt es nicht mehr (12 Hängeschilder brauchten es).
- Quarzziegel: 4 Quarzblöcke ergeben **4** Quarzziegel, nicht 1.
- Holzkohle nur aus brennbaren Stämmen (`logs_that_burn`); Karmesin- und Wirrstämme ergeben keine.

Bauitems, die der Katalog nicht kennt, nehmen ein Rezept aus dem Profil (`source: 'profile'`, Hinweis „Rezept aus dem Profil java-26.3“): Pappel (jetzt eigene Holzfamilie im Katalog), Beton- und Wollstufen/-treppen, Zinnober- und Schwefelfamilien, Harz, Kupferstangen/-ketten/-laternen/-truhen, Rohkupfer-/Rohgoldblock, Netheritblock und weitere (147 Items). Gewählt wird je Station ein Rezept ohne Umfärben und ohne Eigenzutat, bei mehreren das mit dem ähnlichsten Zutatnamen; ein Ofenrezept nur, wenn nichts herstellbar ist (keine Nuggets aus Werkzeugen).

- **Alternativen:** Jeder Arbeitsschritt nennt die übrigen Rezepte des Spiels für dasselbe Item (aufklappbar „n Alternativen im Spiel“).
- **Mehrblockobjekte:** Tür und Bett bleiben ein Item für zwei Zellen; 3 Türen je Vorgang, der Rest steht in der Restbilanz.
- **Brennstoff:** Brennzeiten aus der Item-Komponente `cooking_fuel` des Profils. Bilanz in Ticks; 1 Kohle = 1600 Ticks = 8 Vorgänge, auch im Schmelzofen (halbe Brennzeit, doppelte Geschwindigkeit). Daneben derselbe Bedarf in Holzkohle, Kohleblock (80), getrocknetem Seetangblock (4001 Ticks ≈ 20), Lohenrute (12), Lavaeimer (100) und Eichenplanken (1,5) mit Restvorgängen.
- Ohne Rezept bleiben nur Blöcke, die das Spiel nicht herstellen lässt (Kreativ-/Technikblöcke, befallener Stein, beschädigte Ambosse, Grundgestein …); der Test prüft, dass keines davon ein Profilrezept hätte.

Prüfung: `tests/recipe-profile.test.mjs`, `tests/recipes.test.mjs`, `tests/e2e/recipes.e2e.mjs`.

## Kupfer mit Oxidation und Wachs (MAT-04) · 03.11.2026

Die Zustandsmatrix kommt aus dem Profil (`packages/domain/src/copper.ts`): jeder Block mit einer `Weathering*`-Spielklasse oxidiert. Eine Familie zählt nur, wenn alle vier Stufen (Kupfer, angelaufen, verwittert, oxidiert) und ihre vier gewachsten Gegenstücke existieren, die gewachsten nicht oxidieren und alle acht dieselben Eigenschaften haben. In 26.3 sind das 15 vollständige Familien: Block, geschnitten, Treppe, Stufe, gemeißelt, Gitter, Lampe, Tür, Falltür, Stangen, Kette, Truhe, Golemstatue, Laterne, Blitzableiter. Unvollständige Familien würden in `incomplete` stehen und nie angeboten.

- **Materialvarianten:** acht Sätze „Kupfer/Angelaufen/Verwittert/Oxidiert“, je mit und ohne Wachs, Art „Kupfer“. Der Tausch behält jede Eigenschaft (Treppenform, Lampe an/aus, Truhenart). Kupfertruhen und Golemstatuen behalten ihr NBT, weil der BlockEntity-Typ gleich bleibt und sein Inhalt relativ ist (NBT-01).
- **Rezepte:** jede Stufe entsteht aus der vorigen durch Oxidation (Zeitschritt), jede gewachste aus ihrer Stufe plus Honigwabe (gegen das Profil geprüft). Die Golemstatue entsteht nur aus einem vollständig oxidierten Kupfergolem.

Prüfung: `tests/copper.test.mjs`, `tests/variants.test.mjs`.
