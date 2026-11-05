# Bauführung im Spiel (BUILD-06)

Stand: 02.11.2026. Domäne `packages/domain/src/building/buildRun.ts`, Oberfläche im Projekt-Tab „Bauen“ (`views/project/BuildTab.tsx`, Komponenten in `views/project/buildrun/`), Stile `apps/web/src/styles/buildrun.css`, Tests `tests/unit/building/build-run.test.mjs` und `tests/e2e/build-run.e2e.mjs`.

Ziel: Mit der Bauanleitung im Spiel Schritt für Schritt bauen, ohne zwischen Plan, Material und Koordinaten zu rechnen. Alles wird aus `buildGuide` (Schritte, Reihenfolge, Geometriehash), den Bauitems je Schritt (`materialsForParts`, wie Material-Tab) und `checkScan` (Spielaufnahme) abgeleitet. Es gibt **keine zweite Geometrie-, Zähl- oder Itemlogik**, und kein Haken wird ohne ausdrücklichen Klick gesetzt.

## Anker und Koordinaten

- **Anker = Weltposition von Projekt 0/0/0.** Das ist derselbe Wert wie die Weltlage der Weltkarte (`project.world.origin`, MAP-01) und `/bauplaner anker` der Mod. Gespeichert wird er nur dort; die Leiste „Anker“ im Bauen-Tab setzt oder ändert ihn als rückgängig machbare Operation `world.set`.
- Relativ zum Anker = Projektkoordinate; Welt = Projekt + Anker (genau wie `worldmap.toWorld`).
- Eine Spielaufnahme mit `WorldAnchor`/`Dimension` bietet „Anker aus Spielaufnahme übernehmen“ an, solange der Projektanker abweicht. Nie automatisch.

## Schichtführung

`stepRuns(step, lookup)` fasst die Zellen eines Schritts zu Rechtecken gleicher Zellen zusammen: gleiche Nachbarn entlang X bilden einen Lauf, Zeilen mit identischen Läufen auf aufeinanderfolgenden Z werden verschmolzen. Sortiert von Nord nach Süd (Z), dann West nach Ost (X), also wie die Draufsicht. Luft (freihalten) und Löschzellen (abbauen) erscheinen als eigene Läufe. Test: jede Zelle genau einmal, mit dem geplanten Zustand. Die Bezeichnung zeigt die beim Setzen relevanten Eigenschaften (`facing`, `half`, `type`, `axis`, …), die vollständige Zustands-ID steht im Tooltip.

Anzeige: Schrittkarte (Tabelle „Schichtführung“, Weltkoordinaten wie F3, darunter relativ zum Anker) und Baumodus.

## Packliste (Shulkerkisten)

`packSteps(steps, reports, stock?)` summiert die Bauitems der Schritte (Summe aller Schritte = Material-Tab, getestet), sortiert nach erstem Bedarf und füllt Stapel (`stackSize` aus `materials.ts`) in Kisten zu 27 Plätzen. Kiste 1 enthält, was zuerst gebraucht wird; jede Kiste nennt „ab Schritt N“. Nicht in Shulkerkisten verpackbare Items laufen als „lose“. Lagerbestand (`site.stock`) wird in Bau-Reihenfolge verbraucht; die Einkaufsliste zeigt Bedarf, „aus Lager“ und „besorgen“. Zustände ohne Item (Wasser, Modblöcke) werden genannt, nicht geraten. Annahmen oder ungeklärte Voxelkonflikte kennzeichnen die Liste als „vorläufig“.

Packlisten gibt es je Bautag und je Bauabschnitt (offene Schritte, Lager in Abschnitt-Reihenfolge).

## Bautage (Tagesziele)

- Bautempo `site.pace = { blocksPerSession, boxesPerSession }` (optional im `SitePlan`, `SITE_SCHEMA_VERSION` bleibt 1, Standard 1500 Blöcke und 3 Kisten; `checkPace`, Operation `site.set`).
- `planSessions` nimmt die offenen Schritte (prüfbedürftige zählen als offen) in Baustellen-Reihenfolge – Bauabschnitte wie geplant, darin Anleitungsreihenfolge, Schritte ohne Abschnitt zuletzt – und beendet einen Bautag vor dem Schritt, der das Block- oder Platzbudget (Kisten × 27) überschreiten würde. Ein Schritt wird nie geteilt; ist er allein größer, bildet er einen eigenen Tag („größer als Tagesziel“).
- „Heute“: `progressByDay` zählt Haken nach lokalem Kalendertag (Zeitpunkt `StepProgress.at`, nur bestehende Schritte mit unverändertem Hash). Fortschritt gegen das Tagesziel ist eine manuelle Angabe, keine Messung.

## Spielfortschritt und Nacharbeit

- Je Bautag: Anzahl der Schritte „im Spiel bestätigt/teilweise/abweichend/nicht geprüft“ (`gameCounts`) und die Schaltfläche „N bestätigte Schritte dieses Tages abhaken“ (ein Rückgängig-Schritt, `tickSteps`).
- `reworkList`: Abweichungen der Aufnahme je Schritt in Bau-Reihenfolge mit Aktion (setzen, ersetzen, neu ausrichten, abbauen), Koordinaten in Welt und relativ zum Anker, geplant/im Spiel. Nicht aufgenommene Zellen werden nur gezählt, nie als Fehler geführt.

## Druck und Handy

- **Bauzettel:** „Bauzettel drucken“ hängt ein Druckblatt an `<body>` und öffnet den Druckdialog; Druck-CSS blendet die App aus (Schwarz auf Weiß, Kästchen zum Abhaken auf Papier, kleine Draufsicht je Schritt bis 40 × 40). Auf dem Bildschirm bleibt nur ein Hinweis mit „Erneut drucken“/„Bauzettel schließen“. Dasselbe als Text (`sessionText`) zum Herunterladen.
- **Baumodus (Handy):** ein Schritt groß, Bauitems als Chips, Reihen mit Kästchen (nur Lesehilfe in diesem Tab, `sessionStorage`), großer Knopf „Abhaken & weiter“ in Bautag-Reihenfolge, Tagesziel oben, „Bildschirm anlassen“ über die Screen-Wake-Lock-API, wo der Browser sie anbietet. Die gewählte Ansicht (Schritte, Bautage, Baumodus) merkt sich der Browser.

## Grenzen

- Bautage sind eine Planungshilfe; Laufwege, Gerüste und Sammelzeiten (siehe Baustelle) sind nicht eingerechnet.
- Keine Drehung zwischen Plan und Welt (wie die Mod v1).
- Druck geprüft mit Chromium-Druckmedienemulation; echte Drucker und iPhone-Safari stehen mit QA-02 aus.
