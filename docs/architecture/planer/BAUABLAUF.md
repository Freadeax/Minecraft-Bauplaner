# Durchgängiger Bauablauf (FLOW-01)

Stand: 07.11.2026. Ziel: ein durchgehender Weg vom Entwurf bis zum nächsten Block im Spiel, ohne zwischen Plan, Material, Lager und Gelände rechnen zu müssen. Alles baut auf vorhandenen Rechnungen auf ([Bauführung](BUILD_RUN.md), [Baustelle](SITE.md), [Material](MATERIALS.md), [Gelände](../welt/TERRAIN.md)); es gibt keine zweite Geometrie-, Zähl- oder Itemlogik.

| Baustein | Rechenkern | Oberfläche |
|---|---|---|
| Nachweis je Schritt | `building/stepProof.ts` | Reiter „Bauen“: Liste, Schrittkarte, Baumodus, Zeile „Nachweis der Schritte“ |
| Baumodus für Tablet und Zweitbildschirm | `buildRun.ts`, `site.ts` (Packliste je Abschnitt) | `views/project/buildrun/BuildFocus.tsx`, `LayerPlan.tsx` |
| Materialbilanz | `materials/materialLedger.ts` | Reiter „Material“, `MaterialLedgerPanel.tsx` |
| Materialtausch mit Vorschau | `materials/projectSwap.ts` | Reiter „Material“, `ProjectSwapPanel.tsx` |
| Geländeschnitt und Erdbewegung | `world/terrainSection.ts` | Reiter „Gelände“, `TerrainSectionPanel.tsx` |

Stile: `apps/web/src/styles/flow.css`. Tests: `tests/unit/building/flow.test.mjs`, `tests/e2e/hafen-ablauf.e2e.mjs`.

## Nachweis je Schritt

Ein Haken bleibt eine ausdrückliche Angabe. Der Nachweis sagt, worauf sich „erledigt“ stützt:

| Nachweis | Bedeutung |
|---|---|
| ✓ manuell abgehakt | Haken ohne Beleg aus dem Spiel |
| ✔ im Spiel bestätigt | Haken kam aus einer Spielaufnahme („bestätigte Schritte abhaken“, `StepProgress.source = 'game'`) oder die geladene Aufnahme bestätigt den Schritt |
| ↻ neu prüfen (Plan geändert) | abgehakt, aber der Geometrie-Hash des Schritts hat sich seither geändert |
| ⚠ abgehakt, im Spiel abweichend | die geladene Aufnahme widerspricht dem Haken |
| ◐ im Spiel fertig, nicht abgehakt | die Aufnahme bestätigt den Schritt vollständig, der Haken fehlt |
| ▷ bereit / ○ offen | noch zu bauen; bereit = alle Vorgänger erledigt |

`source` ist optional; ältere Projekte und Team-Stände bleiben gültig (fehlend = manuell).

## Baumodus für Tablet und Zweitbildschirm

- Ab 960 px Breite steht der große Schichtplan (Draufsicht, Norden oben, Achsen mit Projektkoordinaten) links und bleibt beim Blättern stehen, rechts Schritt, Bauitems und Reihen mit Welt- und Ankerkoordinaten. Auf dem Handy stehen sie untereinander.
- Zurück/Weiter wie bisher, zusätzlich per Tastatur: ← und → blättern, Leertaste oder Enter hakt ab (nicht in Eingabefeldern).
- **Packliste des Bauabschnitts:** Bedarf der offenen Schritte des Abschnitts, „aus Lager“ und „besorgen“ aus dem Baustellenplan (Lager in Bau-Reihenfolge).
- **Vollbild** über die Fullscreen-API, „Bildschirm anlassen“ wie bisher.
- **Zweitbildschirm:** öffnet `#/projekt/<id>/bauen?zweitbildschirm=1` als eigenes Fenster im Baumodus. Beide Fenster übernehmen gespeicherte Änderungen des anderen (BroadcastChannel des Speichers), sobald sie selbst nichts Ungespeichertes haben; dabei wird der Rückgängig-Verlauf dieses Fensters neu begonnen. Ohne diesen Knopf bleibt es beim bisherigen Schutz: Zwei Tabs, die auf alter Basis speichern, melden einen Konflikt.

## Materialbilanz

Je Bauitem: Gesamtbedarf (Materialbericht des Projekts), verbaut (Gesamtbedarf − offen), offen (nicht abgehakte Schritte), Lager (Baustelle bzw. aus den Team-Lagerkisten übernommen), reserviert (Lager, das offene Abschnitte in Bau-Reihenfolge verbrauchen), frei und zu beschaffen; „jetzt“ meint den aktuellen Abschnitt. Es gilt immer verbaut + offen = Gesamtbedarf und reserviert + zu beschaffen = offen (getestet). Reservierung ist Planung, keine Sperre im Spiel. Export als CSV.

## Materialtausch mit Vorschau

Dieselbe Tauschregel wie die Materialvarianten der Bibliothek (`swapMaterials`, Form für Form, Ausrichtung bleibt), auf die zusammengesetzte Projektwelt oder eine Instanz. Die Vorschau zeigt vorher/nachher (bis 300 000 Zellen als Bild), betroffene Instanzen, Blockwechsel, Bauitems vorher/nachher mit Lager und Fehlmenge und die bereits abgehakten Schritte, die danach „neu prüfen“ stehen. „Tausch übernehmen“ schreibt über `commitProjectEdit` neue Bauteilversionen (wie der Reiter „Blöcke“) und ist ein Rückgängig-Schritt. Blöcke mit BlockEntity ohne sicheren Adapter und fehlende Formen im Zielsatz bleiben unverändert und werden genannt.

## Geländeschnitt und Erdbewegung

- **Drei Quellen, getrennt:** Plan (geplante Spalten an der Weltlage, Drehung eingerechnet), Geländeaufnahme (gespeicherte Höhenkarte mit Datum und Quelle) und Live (frische Höhenkarte aus der Mod). Live wird nur verglichen: Die Karte nennt, wie viele Spalten sich seit der Aufnahme geändert haben; alle Zahlen bleiben auf der Aufnahme. Übernehmen geht nur ausdrücklich mit „Gelände aus dem Spiel erneuern“.
- **Erdbewegungskarte:** je Spalte Abtrag/Kollision (Gelände ragt in den Plan), Unterbau (unter der untersten Planschicht bis zum Boden, auch Stützen im Wasser), Fundament im Wasser; umschaltbar auf Höhe und Wassertiefe. Ein Klick legt die Schnittlinie.
- **Geländeschnitt:** West → Ost oder Nord → Süd, Boden, Wasser, Plan, Abtrag, Unterbau und Live-Oberfläche, bei flachen langen Schnitten überhöht (Faktor in der Legende). Darunter das Höhenprofil der Linie.
- Die Summen entsprechen `estimateEarthwork` der Weltkarte (getestet). Grenzen: Höhenkarte ohne Höhlen und Überhänge; blockgenau prüft weiterhin „Blockgenau prüfen“.

## Abnahmeprojekt Hafen

`tests/e2e/hafen-ablauf.e2e.mjs` spielt den Weg mit der „Großen Hafenstadt“ (über 30 Gebäude, Straßen, Stege) an einer simulierten Küste durch: anlegen, platzieren, Gelände aus der Mod, Schnitt mit Wassertiefe 6, Kollisionen am Hügel, Live-Vergleich mit einer gegrabenen Grube, Baumodus mit Tastatur, Zweitbildschirm-Fenster, Bilanz, Materialtausch mit „neu prüfen“. `BAUPLANER_SHOTS=<Ordner>` legt dabei Bildschirmfotos ab.
