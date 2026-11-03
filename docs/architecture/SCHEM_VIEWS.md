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
- **Verschiebung erkennen (DIFF-01-S02):** nach der Ausrichtung an der Minimum-Ecke sucht `diffPayloads` eine Verschiebung des ganzen Stands B, die den Unterschied klar besser erklärt. Kandidaten sind die acht Eck-Ausrichtungen der belegten Ausdehnung und Versätze, für die seltene Blockzustände (höchstens 8 je Seite, höchstens 4096 Paare) stimmen. Bewertet wird jede Zelle, die auf beiden Seiten belegt ist (1 Punkt), mit gleichem Zustand doppelt – ein Materialtausch bleibt so Materialtausch und wird nie als Verschiebung gedeutet. Eine Verschiebung gilt erst ab 5 % der kleineren Seite Vorsprung vor der festen Ausrichtung, unter 8 Blöcken gar nicht. Ergebnis `shift`: Versatz, angewendet ja/nein, „nur verschoben“ und wie viele Zellen ohne Ausgleich anders wären. Die Ansicht zeigt das als Hinweis mit Schalter „Ohne Verschiebungsausgleich vergleichen“. Updates (`diffVersions`) vergleichen weiter fest am Pivot, weil eine verschobene Version in der Welt wirklich woanders landet.
- **Inhalte und Folgen (DIFF-01-S03):** gleiche Blockzustände mit anderer BlockEntity (Kisteninhalt, Schildtext, Banner, Name, sonstige Daten) zählen als „anderer Inhalt“; eigene Positionsfelder (`x/y/z`, `Pos`) zählen nicht, damit eine verschobene Kiste gleich bleibt. Zustandsänderungen, die nur aus den Nachbarn folgen (Zaun-/Mauer-/Scheibenverbindungen, Treppenecken, Tor in Mauer, verschneit, Pilzseiten; Regeln aus BLOCK-01 `connectFamily`), heißen „folgt aus Nachbarn“ – das Spiel setzt sie selbst. `followUps.layers` nennt die Ebenen mit echten Änderungen, deren Bauschritte man ansehen sollte.
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

- Node: `tests/diff-shift.test.mjs` (DIFF-01: reine Verschiebung, Verschiebung plus Anbau, Materialtausch/Anbau ohne Fehldeutung, Kisteninhalt, Verbindungen als abgeleitet), `tests/variants.test.mjs` (Diff handgezählt, Materialsätze, Tausch mit Eigenschaften/Paletten-Zusammenführung/Ungelöstem, alle Gebäude in drei Holzarten, Familien nur Materialtausch, 15 Bücherregale, Variantengruppen), `tests/schem-views.test.mjs` (Blickwinkel, Schnitt, Ebenenhilfen, Dateinamen).
- Browser: `tests/e2e/schem.e2e.mjs` (Reiter, Bilder, Schnitt und Download, Ebenen mit Legende und Zeigen, 1400 px und 390 px ohne waagerechtes Scrollen; Varianten vergleichen, Materialvariante speichern und als Version v2.0; URL-Filter, Stöbern, Blickrichtung, Betrachter mit Bauplan).

## Grenzen

- Bilder ohne Texturen und ohne exakte Blockmodelle (Treppen, Zäune als Würfel bzw. Pfeil/Schraffur im Plan).
- Diff erkennt eine Verschiebung des ganzen Bauwerks, keine Verschiebung einzelner Teile und keine Drehung; freie Entities (Gemälde, Rahmen) zählen nicht mit.
- Materialtausch kennt nur die gelisteten Sätze. Glas, Beton und Terrakotta sind seit MAT-03 getrennt auswählbar, Kupfer (Oxidationsstufe × Wachs) seit MAT-04 mit Profilnachweis ([MATERIALS](MATERIALS.md#kupfer-mit-oxidation-und-wachs-mat-04--03112026)).
- Hauptbundle rund 725 kB (Warnschwelle 650 kB), Aufteilung offen.


## MAT-03 · Getrennte Glas-, Beton- und Terrakottavarianten · 01.11.2026

50 zusätzliche, gezielt wählbare Sätze ergänzen die bestehenden Varianten: Klarglas und 16 Glasfarben (Vollblock/Scheibe), 16 Betonfarben (Beton/Trockenbeton), Naturterrakotta und 16 Terrakottafarben (normal/glasiert). Eine Scheibe bleibt eine Scheibe, Trockenbeton bleibt Trockenbeton, glasierte Keramik behält `facing`. Naturterrakotta hat keine glasierte Form; diese bleibt beim Wechsel unverändert und wird im Bericht genannt. Es wird weder Glas aus Beton noch feste Keramik aus Trockenbeton erzeugt.

Die Oberfläche nutzt `detectMaterials(payload, { scoped: true })`, `materialTargets` und eine ausdrückliche `forms`-Einschränkung je Tausch. Dadurch betrifft etwa „rote Wolle → blau“ ausschließlich die angezeigten Formen, während rote Glasflächen getrennt gewählt werden. Die kanonischen `MATERIAL_SETS`, `materialOf` und bisherige Aufrufe von `detectMaterials` bleiben unverändert. Bestehende Aufrufe `farbe_red → farbe_blue` ohne Formeinschränkung behalten den früheren vollständigen Farbsatztausch. Neue Sätze liegen additiv in `SCOPED_MATERIAL_SETS`; es gibt keinen Schemawechsel gespeicherter Versionen. Bereits gespeicherte AssetVersion-Payloads bleiben unveränderlich.

Vor Übernahme von Properties prüft der Tausch beide vollständigen Schemas des vorhandenen manuellen Zustandskatalogs. Ungültige oder unbekannte Properties werden abgewiesen; Eigenschaften werden nicht still entfernt. Ändert ein Tausch eine Zelle mit BlockEntity, wird der gesamte Vorgang mit verständlichem NBT-Adapterhinweis abgewiesen. Der unveränderte Originalzustand und seine NBT-Daten bleiben erhalten. No-op und Änderungen anderer Zellen sind weiter möglich. Eine vollständige Registry-/Spielabnahme ersetzt diese interne Prüfung nicht.

Prüfung: handgezählte Trennung von Wolle/Glas/Beton/Keramik, vollständige Pane-Properties, glasierte Orientierung, fehlende Zielform, überlappende Quellen, fremde Properties, BlockEntity-Sperre und quellseitige Unveränderlichkeit. Alle 50 neuen Sätze und ihre gleichartigen Ziele gegen vorhandene Schemas und Bauitemregeln geprüft. Separater Vergleich mit der vorherigen `variants.ts` bestätigt identische SHA-256-Payloads aller 174 mitgelieferten Gebäude. Kupfer und Einzelblock-Overrides sind weitere, getrennte Ausbauschritte.
