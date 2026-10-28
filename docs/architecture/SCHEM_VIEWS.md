# Schem-Ansichten und Bauversionen (B12)

Stand: 28.10.2026. Ergänzt [UI](UI.md), [Viewer](VIEWER.md) und [Katalog](CATALOG.md). Vorbilder waren Schematic-Galerien wie shulkr.com (mehrere Blickwinkel, Materialliste, „mehr davon“) und Bauplan-Seiten mit Ebenenplänen. Übernommen wurden nur Muster der Darstellung, keine fremden Bauten, Bilder oder Texte.

## Schem-Ansicht

`apps/web/src/schem/SchemView.tsx` zeigt eine Struktur hinter drei Reitern (Tastatur: Pfeil links/rechts). Der Reiter steht in der Adresse: `#/bibliothek/gebaeude/<id>/3d|bilder|ebenen`. Die Ansicht ist reine Darstellung; Mengen und Exporte lesen nie aus ihr.

- **3D:** bisheriger Viewer mit Schichtfilter darunter.
- **Bilder** (`ShotGallery.tsx`): neun Standbilder aus `thumbnail/views.ts` – vier isometrische Blickwinkel (SO, SW, NW, NO), Draufsicht (Norden oben) und vier Fassaden (Süd, Ost, Nord, West). Fassaden und Draufsicht sind Parallelansichten: der jeweils vorderste Block gewinnt, tiefere Blöcke werden bis 45 % abgedunkelt. „Schnitt“ blendet alles über einer wählbaren Höhe aus (Innenräume). „Bild speichern“ lädt ein PNG mit 1600 × 1100 px, Dateiname ASCII (`<name>-<blick>[-schnitt-y<n>].png`, Umlaute umschrieben).
- **Ebenen** (`LayerSheet.tsx`, reine Hilfen in `layers.ts`): Bauplan je Y-Schicht als Raster wie auf Papier – jede fünfte Linie kräftiger, die Schicht darunter als blasser Schatten, Pfeile für die Blickrichtung (Treppen, Türen, Öfen …), schraffierte Stufen, Norden oben. Zeigen mit der Maus nennt Block, Zustand und Koordinate. Legende mit Mengen der Schicht, „Alle Ebenen“ als Übersicht kleiner Pläne, Drucken über `window.print` mit eigener Druckregel.

Der Betrachter (`ViewerView.tsx`) zeigt unter dem 3D-Bild denselben Abschnitt „Bilder und Bauplan“ mit den Reitern Bilder und Bauplan je Ebene.

Bilder entstehen im Browser auf Canvas (`thumbnail/iso.ts`), sind Näherungsfarben ohne Texturen und werden je Versions-ID, Blick, Schnitt und Größe zwischengespeichert. In der Bibliothek lässt sich die Blickrichtung der Kartenbilder wählen (gespeichert im Browser).

## Bauversionen und Unterschiede

Auf der Detailseite steht der Abschnitt „Bauversionen“ (`views/library/VersionsSection.tsx`, Anker `#…/versionen`):

- **Varianten** der Familie bzw. aus derselben Basis als Bildkarten.
- **Vergleich Stand A ↔ Stand B:** aktuelle Fassung, jede Variante und ältere Versionen eigener Bauteile. `diffPayloads` (`packages/voxel/src/diff.ts`) richtet beide Strukturen an ihrer Minimum-Ecke aus und ordnet jede Zelle als gleich, neu, entfernt, anderes Material oder anderer Zustand (gleiche ID, andere Properties) ein; dazu die Blockmengen, die sich ändern. Darstellung als drei Bilder (A, B, Unterschiede eingefärbt), als 3D oder als Ebenenplan; Unveränderte lassen sich ausblenden.
- **Materialvariante erzeugen:** `swapMaterials` (`packages/domain/src/variants.ts`) tauscht ganze Materialsätze gleichzeitig (12 Holzarten, 25 Steinsätze mit Block/Treppe/Stufe/Mauer, 16 Farben mit Wolle bis Shulkerkiste). Properties bleiben erhalten, nur gleichartige Sätze sind tauschbar. Fehlt im Ziel eine Form (z. B. keine Mauer aus poliertem Andesit), bleibt der Block und wird als „nicht getauscht“ gemeldet. Ergebnis wird als neues Bauteil (Herkunft „abgeleitet von …“, Quellformat `variant`, Tag `basis:<assetId>`) oder bei eigenen Bauteilen als neue Version gespeichert.

`variantGroup` (`catalog.ts`) fasst Familienmitglieder und über `basis:` abgeleitete Bauteile transitiv zusammen; `basis:`-Tags zählen wie `familie:` nicht als normale Schlagwörter.

## Bibliothek

- **Teilbare Suche:** Suchtext und alle Filter stehen im Hash nach `?` (`views/library/urlState.ts`, z. B. `#/bibliothek?kategorie=statue&q=statue`); Neuladen und Zurück behalten die Auswahl. Aktualisierung über `history.replaceState`, damit die Seite nicht springt.
- **Stöbern:** ohne Suche und Filter zeigt die Übersicht Reihen „Nach Stil“ und „Nach Biom“ mit je einem eigenen Titelbild.
- **Neue Gebäude (24, gesamt 174 plus 3 Module):** Spielhilfen (Verzauberungsraum mit genau 15 Bücherregalen im Abstand 2, Braustube, Handelshalle mit sechs Arbeitsplätzen, Leuchtfeuer Stufe 1–3 als Familie mit dem bisherigen Leuchtfeuer als Stufe 4, Axolotl-, Bienen- und Schweine-Statue, Schießstand) und 14 Materialvarianten bestehender Gebäude (Rundturm, Stadthaus, Bauernhaus, Bergfried je 3, Windmühle 2), erzeugt mit demselben `swapMaterials` (`build/sets/varianten.ts`).
- Zustandskatalog um Braustand, Zielblock und Netherwarze erweitert (77 Regeln, 598 IDs).

## Viewer: Einpassen nach Import

Behoben (Beobachtung aus P5-01): Der Viewer passt die Kamera neu ein, wenn eine Struktur zum ersten Mal oder an ganz anderer Stelle erscheint, und solange der Nutzer die Kamera nicht selbst bewegt hat (`autoFrame` in `sceneController.ts`), auch bei geänderter Größe und beim Ändern der Fenstergröße.

## Prüfung

- Node: `tests/variants.test.mjs` (Diff handgezählt, Materialsätze, Tausch mit Eigenschaften/Paletten-Zusammenführung/Ungelöstem, alle Gebäude in drei Holzarten, Familien nur Materialtausch, 15 Bücherregale, Variantengruppen), `tests/schem-views.test.mjs` (Blickwinkel, Schnitt, Ebenenhilfen, Dateinamen).
- Browser: `tests/e2e/schem.e2e.mjs` (Reiter, Bilder, Schnitt und Download, Ebenen mit Legende und Zeigen, 1400 px und 390 px ohne waagerechtes Scrollen; Varianten vergleichen, Materialvariante speichern und als Version v2.0; URL-Filter, Stöbern, Blickrichtung, Betrachter mit Bauplan).

## Grenzen

- Bilder ohne Texturen und ohne exakte Blockmodelle (Treppen, Zäune als Würfel bzw. Pfeil/Schraffur im Plan).
- Diff vergleicht nur Blockzustände, keine BlockEntity-Inhalte; Verschiebungen werden nicht erkannt (Ausrichtung immer an der Minimum-Ecke).
- Materialtausch kennt nur die gelisteten Sätze; Kupfer, Glas und Terrakotta als Sätze fehlen noch.
- Hauptbundle rund 725 kB (Warnschwelle 650 kB), Aufteilung offen.
