# Blockeditor und Mehrfachauswahl (EDIT-02, EDIT-01)

Stand: 01.11.2026 · Roadmap-IDs EDIT-02 (Blockeditor) und EDIT-01 (Mehrfachauswahl) · Routen `#/werkstatt/neu`, `#/werkstatt/<versionId>`, Projekt-Reiter „Blöcke“

Einstiege: Bibliothek „✎ Neues Bauteil bauen“, Gebäudeseite „✎ Blöcke bearbeiten“, Schnellsuche (Strg+K) „Werkstatt“, Projekt-Reiter „Blöcke“. Die Hauptnavigation bleibt bei vier Bereichen (UI-02).

Der Blockeditor setzt, entfernt, ersetzt und dreht einzelne Blöcke mit ihren Zuständen. Er arbeitet an drei Stellen mit demselben Kern: an einem neuen Bauteil, an einer Bibliotheksversion (Bauteil oder Gebäude) und an der ganzen zusammengesetzten Welt eines Projekts. Die Palette enthält jeden Block des 26.3-Registers. Gespeicherte Versionen werden nie verändert; jede Bearbeitung erzeugt eine neue, inhaltsadressierte `AssetVersion`.

## Entwurfsvertrag (`packages/domain/src/editor/draft.ts`)

- `Draft { profileId, base, baseCells, overlay }`: `base` ist die unveränderte Ausgangsnutzlast (oder `null`), `overlay` eine Abbildung `positionKey → CellSlot`.
- Zellwerte (`CellValue`): `block` (Zustand, optional Blockentität), `air` (geforderte Luft), `erase` (Löschzelle). `null` heißt „nicht im Modell“. Damit bleiben die vier Zellarten der Nutzlast unterscheidbar.
- `applyEdit(draft, edit)` gibt den neuen Entwurf **und die exakte Umkehrung** zurück. No-ops fallen weg, ein Overlay-Eintrag gleich dem Ausgangswert wird gelöscht. Luft-IDs als Block werden abgewiesen.
- `executeEdit`/`undoEdit`/`redoEdit` bilden die Verlaufsliste; eine Werkzeugaktion (Linie, Quader, Einfügen …) ist genau ein Schritt.
- `materializeDraft` erzeugt die Nutzlast deterministisch: Zellreihenfolge y, z, x; Palette in Reihenfolge der ersten Verwendung; Grenzen = Vereinigung aus Ausgangsgrenzen und Zellen; `pivot` und `sourceOrigin` bleiben. Gleiche Eingaben ergeben dieselbe Version.
- Grenzen (SIZE-01, [SIZE_LIMITS](SIZE_LIMITS.md)): `MAX_EDIT_CELLS` 1 000 000 je Aktion, `MAX_DRAFT_CELLS` 4 000 000 im Entwurf, Rückgängig bis 300 Schritte und 6 Mio. geänderte Zellen. Ab 500 000 Zellen zeigt die Werkstatt einen Größenhinweis.

## Werkzeuge (`editor/tools.ts`)

Alle Werkzeuge erzeugen nur Zelländerungen; es gibt keine zweite Koordinaten- oder Drehregel.

| Werkzeug | Funktion |
| --- | --- |
| Stift, Abbauen, Pipette | Einzelzelle setzen, löschen, Zustand übernehmen |
| Quader (`boxEdit`) | voll, hohl, Wände, Rahmen, Boden, optional anderer Innenwert |
| Kugel, Zylinder, Linie | `sphereEdit` (auch hohl, obere Hälfte), `cylinderEdit`, `lineEdit` |
| Fläche füllen (`floodEdit`) | in der Ebene; in leerer Fläche nur mit Begrenzungsbox |
| Ersetzen (`replaceEdit`) | Block A → B im Modell oder in der Auswahl, auf Wunsch mit Übernahme passender Eigenschaften |
| Drehen (`rotateCellEdit`) | Zustand einer Zelle über `transformBlockState` |
| Auswahl | Kopieren/Ausschneiden/Einfügen (`copyBox`, `transformClipboard`, `pasteEdit`), Verschieben (`moveBoxEdit`), Drehen und Spiegeln des Zwischenspeichers |

Die Ablage dreht mit `transformCellPosition` und `transformBlockState`; vier Vierteldrehungen sind die Identität (Unit-Test).

## Blockschicht (`editor/blocks.ts`)

Das einzige Register ist `packages/voxel/src/blockRegistry.ts` (VIEW-02, 1286 Blöcke Java 26.3, seit PROFILE-01 direkt aus dem Serverbericht, siehe [VERSION_PROFILE](VERSION_PROFILE.md)). Die Schicht ergänzt:

- `blockSchema(id)`: Registerwerte, ergänzt um Eigenschaften, die die Litematic-Quelle nicht vollständig liefert (z. B. `waterlogged`, `powered`, `note_block` `instrument`/`note`, Laub `distance`/`persistent`, `stage`, `power`), überlagert mit dem Schema der B7-Drehregel.
- `defaultState`: Spielstandard (z. B. `facing=north`, `half=bottom`, `type=bottom`, Laub `persistent=true`).
- deutsche Suchnamen (`blockLabel`), zehn Kategorien, Rangfolge der Suche (`searchPalette`).

**Grenze:** Wo das Register Werte nur aus einer Beispieldatei kennt, kann ein seltener Wert fehlen. Fehlende Eigenschaften füllt das Spiel beim Platzieren mit seinem Standard. Ein Registerreport aus dem Datengenerator des Servers (PROFILE-01) ersetzt diese Lücken.

## Speichern

- **Werkstatt** (`commitDraftAsVersion`, `commitDraftAsNewAsset`): Quelle `{ format: 'editor', editedFrom }`, Anschlüsse bleiben, Warnungen aus `validateConnectors` werden angezeigt. „Als Version N.0 speichern“ hängt an dasselbe Bauteil an (Revisionsprüfung im Repository), „Als neues Bauteil“ legt ein neues mit Schlagwort `eigenbau` an. Projekte behalten ihre bisherige Version, bis sie umgestellt werden.
- **Projekt-Reiter „Blöcke“** (`planProjectEdit`, `commitProjectEdit`): Jede geänderte Weltzelle geht an **alle** besitzenden Instanzen (`resolution.owners`), zurückgerechnet mit der exakten Umkehrung der Instanztransformation (`localCell`, gegen die Vorwärtsregel geprüft) und umgekehrt gedrehtem Zustand. Neue Blöcke in leerer Fläche gehen an eine gewählte Instanz oder an ein neues Bauteil „Eigene Blöcke“. Ergebnis ist ein Projektbatch „Blöcke bearbeitet“ (`instance.update`, `instance.remove` für geleerte, `instance.add` für neue Instanzen), also **ein** Rückgängig-Schritt im Projekt. Eine Änderung an einer Konfliktzelle wird in alle beteiligten Bauteile geschrieben.

## Mehrfachauswahl (EDIT-01)

- Im Editor-Reiter bilden Kästchen oder Strg-/Shift-Klick in der Instanzliste eine Gruppe. Die Hülle erscheint im 3D-Bild (Konfliktfarbe bei Konflikten in der Gruppe), Gruppenzellen sind markiert, verbaute Freiraumzellen der Gruppenanschlüsse rot.
- `groupOperation(project, ids, action, centre)` (`project.ts`): Verschieben, Drehen um 90° um die Gruppenmitte, Spiegeln, Duplizieren, Vorrang, Entfernen. Drehen nutzt dieselbe Regel wie `transformVector` (Position `G(p − C) + C`, Vierteldrehungen addiert); Spiegeln setzt `quarterTurns = (4 − q) % 4` und schaltet `mirrorX` um. Das Ergebnis ist ein Batch: alle oder keine Instanz, ein Rückgängig-Schritt. Unit-Test vergleicht jede Weltzelle und jeden Zustand mit `transformCellPosition`/`transformBlockState` um die Mitte.
- Freiraumzonen der Gruppe (`reservationsFor`) mit Zustand frei/verbaut/angedockt/verbunden stehen im Gruppenfeld.

## Oberfläche (`apps/web/src/editor/`)

`BlockEditor.tsx` (zwölf Werkzeuge, Tasten 1–9, Strg+Z/Y), `LayerGrid.tsx` (Ebenenansicht mit Schatten der Ebene darunter, Richtungskeilen, Ziehen, Zoom, Einpassen), `BlockPalette.tsx` (Suche, Kategorien, „Im Modell“, Zuletzt benutzt, Zustandsfelder), 3D-Vorschau über den gemeinsamen Viewer (`markFor`), `WorkshopPage.tsx`, `views/project/BlocksTab.tsx`, `views/project/selection/GroupPanel.tsx`. Mobil (390 px) ohne waagrechtes Scrollen; Setzen per Tippen.

## Werkstatt vertieft (EDIT-03)

Stand 02.11.2026. Alles bleibt auf dem Entwurfsvertrag oben: Werkzeuge erzeugen nur Zelländerungen, ein Werkzeugschritt ist ein Rückgängig-Schritt.

**Muster-Pinsel** (`editor/patterns.ts`, Oberfläche `PatternPanel.tsx`). Ein `Pattern` bestimmt je Zelle den Wert: `mix` (gewichtete Mischung, auch Einträge `'keep'` = Block bleibt, `null` = entfernen), `gradient` (Stufen entlang X/Y/Z oder radial über die Ausdehnung des Schritts, `blend` 0–1 mischt die Grenzen), `checker` (3D-Schachbrett mit Feldgröße), `stripes` (Streifen quer zu einer Achse). `paintEdit(edit, pattern)` ersetzt die geschriebenen Werte eines beliebigen Schritts; Entfernen bleibt Entfernen. Zufall ist ein fester 32-Bit-Hash aus Position und `seed` (`cellNoise`), also reproduzierbar: gleiche Eingaben, gleiche Version. „Neu würfeln“ wählt nur einen anderen festen Wert. `replacePatternEdit` ersetzt mit Muster und übernimmt wie `replaceEdit` passende Eigenschaften (Ausrichtung) und Blockentitäten nur bei gleicher ID. Zehn Vorlagen (`PATTERN_PRESETS`, z. B. „Alte Steinmauer“, „Verwittern (30 %)“, Sockel-, Holz- und Sandsteinverlauf, Schachbrettboden). Das Muster wirkt auf Setzen, alle Formen, Fläche füllen, die Füllknöpfe der Auswahl und Ersetzen; nicht auf Pipette, Abbauen, Luft, Leeren und Einfügen.

**Formen** (`editor/shapes.ts`):

| Werkzeug | Funktion |
| --- | --- |
| Bogen (`archEdit`) | Rund-, Spitz- (gleichseitig, auf die Höhe skaliert) oder Flachbogen von Fußpunkt zu Fußpunkt entlang der vorherrschenden Achse; Stärke, Tiefe (nach +Z bzw. +X), Pfosten unter dem Kämpfer, wahlweise Wand mit Bogenöffnung. Rein diagonale Stufen im Bogenband werden geschlossen (jede Zelle hat eine Flächennachbarin), damit im Spiel keine Lücken entstehen. |
| Pyramide (`pyramidEdit`) | Stufenpyramide auf der aufgezogenen Grundfläche, Stufe 1–8, optional Höchsthöhe und hohl; auf Rechtecken entsteht ein Walmdach mit First. |
| Kegel (`coneEdit`) | Kegeldach für runde Türme, Radius per Ziehen, Höhe, hohl ohne Boden. |
| Mauerzug (`wallLineEdit`) | Linie (auch schräg) mit Höhe und Stärke. |

**Schablonen** (`editor/stencils.ts`, `StencilPanel.tsx`): sieben eingebaute Details (Fenster, Tür, Säule, Zinnen mit expliziter Luft in den Scharten, Treppenaufgang, Laternenpfosten, kleiner Baum) mit vollständigen Zuständen. „Auswahl speichern“ legt die Auswahl als normales Bauteil mit Schlagwort `schablone` an (gespeichert, versioniert, in Sicherungen); jedes Bibliotheksbauteil lässt sich über die Suche als Vorlage laden (`clipboardFromPayload`, relativ zur Grenzbox). Eine Schablone füllt die Zwischenablage und wählt „Einfügen“: die Vorschau folgt dem Zeiger, R dreht und M spiegelt über `transformClipboard` (B7-Regeln), Klick setzt.

**Bauen in Ebenen**: Ebenenübersicht (ein Balken je Ebene, Länge nach Zellzahl, Klick springt), „3D bis Ebene“ zeigt im 3D-Bild nur die Ebenen bis zur aktuellen (Schnitt), Formvorschau zeigt Zellen anderer Ebenen als Punkte und im Raster die Maße „B × H × T · Zellen“.

**Tastenkürzel** (Übersicht mit „?“ oder „⌨ Tasten“): 1–9 und Buchstaben je Werkzeug (B Setzen, E Abbauen, I Pipette, F Füllen, D Drehen, P Prüfen, A Auswahl, L Linie, Q Quader, Z Zylinder, K Kugel, O Bogen, Y Pyramide, C Kegel, V Einfügen), Strg+C/X/V, Strg+A ganzes Modell, Entf leert die Auswahl, Pfeile verschieben die Auswahl samt Inhalt (Shift+↑/↓ in der Höhe), R/M drehen/spiegeln Zwischenablage oder Auswahl, G Schnitt, Esc. Ist das 3D-Bild fokussiert, gelten dort dessen eigene Tasten; nur Strg-Kürzel erreichen den Editor.

Prüfung: `node --test tests/editor-patterns.test.mjs` (Muster, Formen mit Handzählung, Bogensymmetrie und Verbundenheit, Schablonen mit vier Drehungen = Identität, Rundreise Nutzlast ⇄ Zwischenablage), `node --test tests/e2e/workshop-tools.e2e.mjs` (nach `npm run build`). Offen: Spielprüfung der Schablonenzustände, Firefox/Safari, echte Geräte.

## Prüfung

- `node --test tests/editor.test.mjs`: Entwurf und Umkehrung, Determinismus, Formen mit Handzählung, Ersetzen, Füllen, Drehen, Ablage, Speichern, `localCell` für alle acht Transformationen, Projektzuordnung mit Rückgängig, Gruppenoperationen.
- `node --test tests/e2e/editor.e2e.mjs` (nach `npm run build`): Werkstatt mit Speichern und Version 2.0, Projekt-Reiter mit einem Rückgängig-Schritt, Mehrfachauswahl drehen/rückgängig/verschieben, 390 px.
- Offen: Picking direkt im 3D-Bild an Blockflächen (bisher Ebenenansicht), Prüfung im Spiel, Firefox/Safari.

## Kreativwerkzeuge (EDIT-04)

Stand 02.11.2026. Symmetrie beim Bauen, Kurven/Pfade, Natur- und Formwerkzeuge (Glätten, Abtragen, Aufbauen, Überziehen, Naturalisieren), Oberflächenmaske, Farbverläufe nach Blockfarbe und Bild → Blöcke. Vertrag und Prüfung: [CREATIVE_TOOLS](CREATIVE_TOOLS.md). Werkzeug „Kurve“ hat die Taste U; Enter setzt die Kurve, Rücktaste nimmt den letzten Punkt.

## Auswahl- und Formwerkzeuge (EDIT-05)

Stand 02.11.2026. Zauberstab (W, Zauberauswahl als Zellauswahl; Shift/Alt fügt hinzu/nimmt weg), Auswahl wachsen/schrumpfen/an Inhalt anpassen/nur Blöcke, Stapeln, Extrudieren (Herausziehen/Einschieben), Ellipsoid (J), Torus (T), Wendel (H); Gemälde, Rahmen und Rüstungsständer ziehen beim Verschieben, Drehen, Spiegeln, Stapeln und Ausschneiden mit. Vertrag und Prüfung: [CREATIVE_TOOLS](CREATIVE_TOOLS.md#auswahl--und-formwerkzeuge-edit-05).

## Direkt im 3D-Bild bauen (EDIT-06)

Stand 04.11.2026. Schalter „Im 3D bauen“ in der Ebenenleiste (an, pro Browser gemerkt unter `bauplaner.werkstatt.bauen3d.v1`).

- **Flächen-Picking:** `BlockObject.pickFace` liefert Zelle und Achsrichtung der getroffenen Fläche (schräge/eingerückte Flächen auf die Hauptachse gerundet, Rückseiten zum Betrachter gedreht). `SceneController` meldet daraus `PickHit { cell, normal, adjacent }`.
- **Bau-Geste:** `ViewerProps.build` (`BuildHandler`): Druck auf eine Blockfläche startet die Geste, wenn das Werkzeug sie will (Setzen, Abbauen, Auswahl, Linie und alle Formen; Shift wählt mit jedem Werkzeug). Ziehen läuft auf der Ebene der Startfläche: Oberseite ⇒ waagrecht wie im Ebenenraster, Seitenfläche ⇒ senkrecht, Quader/Ellipsoid spannen dann eine Wand. Setzen/Abbauen folgen den Flächen unter dem Zeiger (kurze Sprünge in einer Ebene werden zur Linie verbunden). Ein Klick ohne Ziehen ist dieselbe Geste mit einer Zelle. Escape, zweiter Finger oder Abbruch des Zeigers verwerfen die Geste.
- **Bedienung:** Mit „Im 3D bauen“ dreht die rechte Maustaste, die mittlere verschiebt; Ziehen ins Leere dreht weiter. Klickwerkzeuge (Pipette, Drehen, Prüfen, Füllen, Zauberstab) wirken auf den Block, Einfügen und Kurvenpunkte vor die Fläche.
- **Vorschau:** `ViewerProps.preview` (`PreviewCells`) zeichnet geplante Zellen als durchscheinende Würfel (Instanzen, max. 30 000), Abbauen rot. Beim Überfahren zeigt sie die Zelle, die ein Klick ändern würde. Auswahlquader und verschobene Gruppen erscheinen als Umriss (`ghost`).
- **Gruppe ziehen:** Mit dem Auswahl-Werkzeug lässt sich ein ausgewählter Block greifen und die Gruppe (Quader- oder Zellauswahl, samt Ausstattung) waagrecht ziehen; das Loslassen ruft dieselbe `transformSelection` wie die Pfeiltasten auf, also ein Rückgängig-Schritt.
- **Inhalte:** `packages/voxel/src/blockContentEdit.ts` (`editableContent`, `readContainer`/`withContainer`, `readSign`/`withSign`) und `apps/web/src/editor/ContentEditor.tsx` im Feld „Gewählter Block“: Behälter (Truhe, Fass, Shulkerkiste, Trichter, Werfer, Spender, Werkbank-Crafter, Öfen, Braustand) mit Gegenständen je Platz und Amboss-Name; Schilder und Hängeschilder mit beiden Seiten, Farbe, Leuchten, Wachs. Geschrieben wird das Java-26.3-Format (`Items` mit `Slot`/`id`/`count`, `front_text`/`back_text`); unbekannte Felder (Beutetabelle, Schloss, Komponenten unveränderter Plätze) bleiben, Sponge-Hüllen (`Data`) ebenso. Gegenstände werden gegen das Versionsprofil geprüft. Übernehmen ist ein Rückgängig-Schritt (`setCells` mit neuer `entity`).
- **Prüfung:** `tests/block-content-edit.test.mjs`, `tests/e2e/workshop-build3d.e2e.mjs` (Port 4341). Offen: Geräteprüfung (iPad, WERK-08) und Laden der Inhalte im Spiel (WERK-09).
