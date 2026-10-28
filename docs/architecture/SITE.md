# Baustelle: Bauabschnitte, Lager, Sammelplan, Freiraum (B14)

Stand: 28.10.2026. Domäne `packages/domain/src/site.ts`, Oberfläche Tab „Baustelle“ (`#/projekt/<id>/baustelle`, `views/project/SiteTab.tsx`), Stile `apps/web/src/site.css`, Tests `tests/site.test.mjs` und `tests/e2e/site.e2e.mjs`.

## Datenmodell

Alles, was der Bauende über die *Baustelle* entscheidet (nicht über die Geometrie), steht in einem optionalen, versionierten Datensatz `project.site` (`SitePlan`, `schemaVersion: 1`). Ältere Projekte haben keinen; `siteOf(project)` liefert dann den leeren Standard. Dadurch ist keine IndexedDB-Migration nötig, und Sicherungen tragen den Plan automatisch mit (`checkProjectRecord` prüft ihn mit `checkSite`).

| Feld | Bedeutung |
|---|---|
| `sections` | Bauabschnitte in Bau-Reihenfolge. Mitglied = Instanz, optional mit Schichtbereich `fromLayer…toLayer` (Schicht 0 = unterste Schicht der Instanz, wie die Schritt-ID der [Bauanleitung](GUIDE.md)). |
| `stock` | Gesammelte Menge je Item (Bauitem, Zwischenprodukt oder Rohstoff). |
| `resolvedStock` | Im Rezeptbaum als „vorhanden“ markierte Items: werden nicht weiter aufgelöst und nicht gesammelt. |
| `recipeMethod` | Steinsäge oder Werkbank bevorzugen (vorher nur Sitzungszustand im Material-Tab). |
| `reservations` | Standardtiefe des Freiraums vor Anschlüssen und Abweichungen je `instanceId/connectorId`. |

Jede Änderung ist eine Operation `site.set` mit exakter Umkehrung (Rückgängig/Wiederholen, `baseRevision` beim Speichern). Bearbeitungsfunktionen (`addSection`, `moveSection`, `setStock`, `toggleResolvedStock`, `setReservation`, `pruneSite` …) sind rein und werden mit `siteOperation` verpackt; `checkSite` lehnt doppelte IDs, Kommazahlen, negative Mengen und vertauschte Schichtbereiche ab.

## Regeln

- **Zuordnung:** Ein Schritt gehört zum *ersten* Abschnitt, dessen Mitglied Instanz und Schicht trifft. Überschneidungen und Verweise auf entfernte Bauteile werden angezeigt (`checkSections`), nicht still bereinigt; „Entfernte Bauteile aus dem Plan lösen“ ist eine eigene, rückgängig machbare Operation.
- **Reihenfolge:** Braucht ein Schritt eine Voraussetzung aus einem später geplanten Abschnitt (z. B. Stütze darunter), meldet `checkSections` das als Reihenfolgeproblem. Die geometrische Reihenfolge der Anleitung bleibt unverändert.
- **Vorschläge:** „Je Bauteil ein Abschnitt“ oder „Fundament · Rohbau · Dach“ (Schicht 0 / Mitte / oberes Viertel, mindestens Schicht 2) – nur Startpunkt, frei änderbar.
- **Fortschritt** je Abschnitt aus den manuellen Haken (`evaluateProgress`), Summe = Bauanleitung. Keine Messung im Spiel.
- **Bedarf** je Abschnitt = Bauitems der *nicht abgehakten* Schritte (`materialsForParts`, Partnerhälften in der ganzen Welt, Summe = Material-Tab). Der Lagerbestand wird in Abschnitt-Reihenfolge verbraucht: zuerst gegen Bauitems, Rest gegen Rohstoffe. Nur fehlende Bauitems laufen durch den Rezeptbaum (`resolveRecipes`), dadurch wird nichts doppelt gesammelt. Brennstoff (Kohle) wird als eigene Zeile geplant.
- **Sammelplan:** Je Rohstoff Tätigkeit, Werkzeug, Dimension und passende Farm; Farmen aus dem Katalog sind verlinkt (`GATHER_BUILDING_IDS`, Test prüft, dass sie existieren). Stunden = fehlende Menge / Richtwert pro Stunde, ausdrücklich als Annahme gekennzeichnet; Funde/Handel haben keinen Richtwert („offen“).
- **Freiraum:** Vor jedem nicht verbundenen Anschluss wird ein Quader freigehalten: Tiefe entlang der Normale (Standard 3, 0 = aus), Breite mittig quer, Höhe entlang `up`. Breite × Höhe aus dem Profilnamen (`wall_2x5` → 2 × 5, `weg_4` → 4 breit, 3 hoch Laufhöhe), sonst 2 × 3, je Anschluss überschreibbar. Zustände: *frei*, *verbaut* (gesetzter Block irgendeiner Instanz im Quader, mit Verursacher), *angedockt* (ein passender Anschluss sitzt genau dort, aber ohne gespeicherte Verbindung – „Angedockte verbinden“ legt die Verbindungen als eine Operation an), *verbunden*, *aus*.

## Oberfläche

- Material-Tab: „vorhanden“ und „Steinsäge bevorzugen“ werden jetzt im Projekt gespeichert (überleben Neuladen und Sicherung).
- Bauen-Tab: Auswahl „Bauabschnitt“ filtert die Schrittliste, sobald Abschnitte existieren.
- Baustelle-Tab: Übersicht (Gesamtfortschritt, Lagerdeckung, Sammelzeit, aktueller Abschnitt, Freiraum), Abschnittsliste mit Fortschrittsbalken, ↑/↓, Bearbeiten (Name, Notiz, Bauteile mit Schichtbereich), Sammel- und Farmplan mit Lager-Eingabe (speichert bei Enter/Verlassen, ein Rückgängig-Schritt je Änderung) und CSV, Freiraum-Tabelle.

## Prüfung

`tests/site.test.mjs`: Validierung und Rückgängig, Erst-Treffer-Regel und Schichtbereiche, Überschneidung, Reihenfolgeproblem, Vorschläge decken alle Schritte, Bedarf je Abschnitt summiert sich zum Material-Tab, Lager fließt in den nächsten Abschnitt, abgehakte Abschnitte brauchen nichts, Rezeptbaum/Kohle/„vorhanden“, Sammelregeln und Katalogfarmen, Freiraum-Geometrie (Ost/West), verbaut/angedockt/verbunden/aus, Sicherung trägt den Plan.
`tests/e2e/site.e2e.mjs` (1400 px und 390 px): „vorhanden“ übersteht Neuladen, Vorschlag Stockwerke, Lagerbestand und Farmhinweis, Sammelplan-CSV, Andocken verbinden, Abschnitt umbenennen und nach Neuladen wiederfinden, kein horizontales Scrollen, Abschnittsfilter im Bauen-Tab.

## Grenzen

- Sammelzeiten sind Richtwerte ohne Verzauberungen und Laufwege.
- Lagerbestand von Zwischenprodukten (z. B. Bretter) wird nur genutzt, wenn das Item selbst als Bauitem oder Rohstoff auftaucht; sonst „vorhanden“ im Rezeptbaum markieren.
- Freiraum wird gegen geplante Blöcke geprüft, nicht gegen das Gelände der Welt.
