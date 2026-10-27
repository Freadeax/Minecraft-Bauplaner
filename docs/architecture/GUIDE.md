# Bauanleitung und manueller Fortschritt (B4 · P3-02 · R-007)

Stand: 27.10.2026. Implementierung `packages/domain/src/guide.ts`, Tests `tests/guide.test.mjs` und `tests/e2e/guide.e2e.mjs`, Oberfläche `apps/web/src/views/project/BuildTab.tsx` (Projekt-Tab „Bauen“, Route `#/projekt/<id>/bauen`).

## Grundlage

`buildGuide(project, resolution)` liest ausschließlich `resolution.world` und `resolution.owners` aus [`resolveProject`](DOMAIN.md). Es gibt keine zweite Koordinaten-, Transformations- oder Zähllogik: Material, Export und Anleitung sehen dieselben Zellen. Jede Weltzelle liegt in genau einem Schritt (Test „every world cell in exactly one step“). Bei Überschneidungen gehört die Zelle der Instanz, die `owners` an erster Stelle nennt (Vorrang-Instanz bzw. Vorschauwahl).

Grundlage ist wahlweise der aktuelle Arbeitsstand oder eine eingefrorene `BlueprintRevision`; die Oberfläche löst die Revision mit denselben Bauteilversionen auf.

## Schritte

Ein Schritt = **Bauabschnitt** (derzeit eine Instanz) × **Y-Schicht** × **Bauphase**.

| Feld | Regel |
|---|---|
| `id` | `<instanzId>~L<schicht>~<phase>`; `schicht` zählt ab der untersten transformierten Schicht der Instanz. Verschieben/Drehen ändert die ID nicht, nur den Geometriehash. |
| `order` | Nicht-Flüssigkeiten nach (Y, Phase, Instanzreihenfolge), danach Flüssigkeiten nach (Y, Instanzreihenfolge). Deterministisch. |
| `bounds`, `positions` | Weltkoordinaten der Zellen (maxExclusive), sortiert nach Z, dann X |
| `materials` | gesetzte Blockzustände mit vollständigen Properties und Anzahl. Umrechnung in Bauitems/Stacks gehört zum Materialblock (B1) |
| `air`, `erase` | ausdrückliche Luft (freihalten) und Löschzellen (abbauen) |
| `conflicts` | Zellen mit ungeklärtem Voxelkonflikt; Schritt zeigt dann nur die Vorschauwahl |
| `geometryHash` | `quickHash` über Phase, Positionen, Zustände und BlockEntity-Daten – Änderungsdetektor, kein Integritätsnachweis |
| `check` | Prüfkriterium in Klartext: Schicht, Bereich, exakte Blockanzahl |
| `notes` | Schwerkraft, Anbringung, Flüssigkeit, waterlogged, BlockEntity-Inhalt, Mod-Blöcke |

### Bauphasen

| Phase | Inhalt |
|---|---|
| `clear` | Luft- und Löschzellen |
| `structure` | alle übrigen Blöcke; Mod-Namespaces bleiben hier mit sichtbarem Hinweis „ohne bekannte Bauregel“ |
| `gravity` | Sand, roter Sand, Kies, verdächtiger Sand/Kies, Trockenbetonpulver, Ambosse, Drachenei, Tropfstein, Gerüst |
| `attached` | Fackeln, Leitern, Knöpfe, Hebel, Druckplatten, Schienen, Redstone, Teppiche, Schilder, Banner, Setzlinge, Falltüren, Köpfe, Kerzen u. a. (Liste in `guide.ts`) |
| `liquid` | Wasser, Lava, Blasensäule – immer nach allen anderen Schritten |

Die Liste ist bewusst explizit. Unbekannte Blöcke werden nicht geraten.

### Voraussetzungen (ohne Zyklen)

Ein Schritt setzt voraus:

1. alle festen Schritte der nächsttieferen Schicht desselben Abschnitts,
2. frühere Phasen derselben Schicht desselben Abschnitts,
3. feste Schritte, die direkt darunter liegen (Stütze, auch abschnittsübergreifend),
4. bei `attached`/`liquid`: waagerecht benachbarte Grund-/Schwerkraftschritte,
5. bei `liquid`: die oberste feste Schicht des Abschnitts und die tiefere Flüssigkeitsschicht.

Jede Voraussetzung liegt in `order` strikt früher; `buildGuide` bricht sonst ab. Damit ist der Graph konstruktionsbedingt zyklenfrei. `assertGuideAcyclic` prüft gespeicherte oder zusammengeführte Anleitungen zusätzlich per Tiefensuche.

## Fortschritt

- Abhaken ist eine normale, rückgängig machbare Operation `progress.set` mit `StepProgress { status: 'done', geometryHash, at }`. Mehrere Haken (ganze Schicht, Aufräumen) sind ein `batch`.
- `evaluateProgress` liefert je Schritt `open`, `done` oder `review`: **prüfbedürftig**, wenn der gespeicherte Hash nicht mehr zum aktuellen Schritt passt. Ein Schritt ist **bereit**, wenn alle Voraussetzungen `done` sind; `review` blockiert Nachfolger.
- Haken ohne passenden Schritt (Instanz entfernt, Schicht leer) erscheinen als **verwaist** und lassen sich gezielt entfernen. Nichts wird still gelöscht.
- „Abgehakt“ ist eine manuelle Angabe. Eine Prüfung im Spiel gibt es nicht; die Oberfläche sagt das ausdrücklich. Ein späterer Spieladapter (P6-01) könnte einen getrennten Status „im Spiel geprüft“ ergänzen, ohne den manuellen Haken zu überschreiben.

## Oberfläche „Bauen“

Fortschrittsbalken (gesetzte Blöcke laut Haken), Wahl der Grundlage, Hinweise zu Exportsperren, prüfbedürftigen und verwaisten Haken; Schrittliste nach Schichten mit Filter; Schrittkarte mit Prüfkriterium, offenen Voraussetzungen, Abhaken/Erneut bestätigen, Blockzustandstabelle, Draufsicht der Schicht (Nord oben, Koordinaten an beiden Achsen, Zellen anderer Schritte gedimmt, erledigte grün getönt) und optionaler 3D-Ansicht bis zur Schicht. Unter 900 px steht die Schrittkarte vor der Liste, die Aktionsleiste bleibt beim Scrollen sichtbar, Touchziele ≥ 44 px.

## Grenzen

- Bauabschnitt = Instanz. Frei definierte Abschnitte oder semantische Gruppen (z. B. „Dach“) brauchen später eine Nutzerbestätigung.
- Phasen und Stützen sind geometrische Heuristiken; Mehrblockobjekte (Türen, Betten) werden je Zelle geführt, die Itemzählung leistet B1.
- Keine Mengen in Bauitems/Stacks in diesem Block; keine Messung im Spiel; Schichtplan ab 96 Zellen Breite auf den Schrittbereich zugeschnitten.
