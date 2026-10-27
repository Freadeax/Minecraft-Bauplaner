# Materialbedarf und Bauitems (B1)

Stand: 27.10.2026. Umsetzung von P1-04a / R-017. Implementierung in [materials.ts](../../packages/domain/src/materials.ts), Tests in `tests/materials.test.mjs` und `tests/e2e/materials.e2e.mjs`, Oberfläche im Projekt-Tab „Material“ (`apps/web/src/views/project/MaterialsTab.tsx`). Ergänzt den [Domänenvertrag](DOMAIN.md).

## Drei getrennte Ebenen

| Ebene | Inhalt | Quelle |
|---|---|---|
| Platzierte Zustände | exakte Zellzahl je Blockzustand (ID + alle Properties), getrennt von Luft- und Löschzellen | `resolution.world` |
| Bauitems | Items, die zum Platzieren nötig sind, mit Regel, Herkunft und Konfidenz | Vanilla-Java-Katalog `vanilla-java-items-v2` (v2: Stein-/Kupfervarianten, Kessel mit Inhalt, Froschlaich, Chorus-Pflanze) |
| Lager | volle Stacks + Rest, Inventarplätze, Shulkerkisten à 27 Plätze | Stapelgröße 1/16/64 je Item |

Rohstoffe und Rezepte (z. B. Steinziegel ← Stein) werden nicht abgeleitet; Werkzeuge ebenfalls nicht. Kein unvollständiger Bedarf wird als vollständige Liste dargestellt.

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
- Keine Rohstoff-/Rezeptauflösung, kein Lager-/Besitzabgleich.
- Paarprüfung von Mehrblockobjekten erfolgt beim Umfang „Instanz“ nur innerhalb der Instanz; für Teile einer Welt (Bauschritte, Schichten) sucht `materialsForParts` bzw. `computeMaterials(…, { partners: 'world' })` in der ganzen Welt, damit sich die Teile exakt zum Gesamtbedarf addieren.
- Die Bauanleitung (B4) zeigt die Bauitems je Schritt und eine Packliste je Schicht ([GUIDE](GUIDE.md)).
