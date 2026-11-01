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
- Grenzen: `MAX_EDIT_CELLS` 250 000 je Aktion, `MAX_DRAFT_CELLS` 400 000 im Entwurf.

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

Das einzige Register ist `packages/voxel/src/blockRegistry.ts` (VIEW-02, 1288 Blöcke Java 26.3). Die Schicht ergänzt:

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

## Prüfung

- `node --test tests/editor.test.mjs`: Entwurf und Umkehrung, Determinismus, Formen mit Handzählung, Ersetzen, Füllen, Drehen, Ablage, Speichern, `localCell` für alle acht Transformationen, Projektzuordnung mit Rückgängig, Gruppenoperationen.
- `node --test tests/e2e/editor.e2e.mjs` (nach `npm run build`): Werkstatt mit Speichern und Version 2.0, Projekt-Reiter mit einem Rückgängig-Schritt, Mehrfachauswahl drehen/rückgängig/verschieben, 390 px.
- Offen: Picking direkt im 3D-Bild an Blockflächen (bisher Ebenenansicht), Prüfung im Spiel, Firefox/Safari.
