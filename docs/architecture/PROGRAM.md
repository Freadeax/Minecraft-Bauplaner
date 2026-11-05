# Projektplanung: Meilensteine, Abhängigkeiten, Bauleute, Zeitplan (PROJ-01)

Stand: 03.11.2026. Domäne `packages/domain/src/program.ts`, Oberfläche Projektreiter „Planung“ (`#/projekt/<id>/planung`, `views/project/PlanningTab.tsx`), Stile `apps/web/src/planning.css`, Tests `tests/program.test.mjs` und `tests/e2e/program.e2e.mjs`. Ergänzt [SITE](SITE.md) (Bauabschnitte, Lager, Sammelplan) und [BUILD_RUN](BUILD_RUN.md) (Bautempo, Bautage).

Ziel: Große Projekte (Anlagen, Basen, Stadtviertel mit vielen Gebäuden) über die reine Reihenfolge der Bauabschnitte hinaus planen – Meilensteine mit Zieltermin, Abhängigkeiten zwischen Abschnitten, mehrere Bauleute, ein Zeitplan mit kritischem Pfad und der Material-/Sammelbedarf je Meilenstein und je Bauleute.

## Datenmodell

Alles, was die Planung entscheidet, liegt im optionalen Teil `project.site.program` (`BuildProgram`, `PROGRAM_SCHEMA_VERSION` 1). Er verweist ausschließlich auf Bauabschnitte **desselben** Baustellenplans über ihre IDs; es gibt keinen neuen Datensatz und keine neue Rolle im Verweisgraph ([PLAN_MODEL](PLAN_MODEL.md)). Dadurch läuft alles über die vorhandene Operation `site.set` (Rückgängig/Wiederholen, `baseRevision`), `checkSite` ruft `checkProgram` auf, Sicherungen und Datencheck tragen den Plan automatisch mit.

| Feld | Bedeutung |
|---|---|
| `builders` | Bauleute (`id`, `name`, optional eigenes `blocksPerSession` 16–100 000, Notiz). Höchstens 32. |
| `milestones` | Meilensteine in Anzeigereihenfolge: Name, Notiz, optional `due` (`JJJJ-MM-TT`), Abschnitts-IDs. Höchstens 64. |
| `dependencies` | `{ before, after }`: `after` beginnt erst, wenn `before` vollständig abgehakt ist. Keine Selbstbezüge, keine Doppel, **azyklisch** (`dependencyCycle`; Kreis wird mit dem Pfad in Abschnittsnamen abgelehnt). Höchstens 1024. |
| `assignments` | Abschnitts-ID → Bauleute-IDs. Mehrere Bauleute je Abschnitt teilen sich die Arbeit. Unbekannte Bauleute sind ungültig. |
| `start` | Erster Bautag (`JJJJ-MM-TT`); ohne Datum zählt der Zeitplan nur Bautage. |
| `sessionsPerWeek` | Bautage je Woche 1–7 (Standard 7 wird nicht gespeichert); `n < 7` nutzt die ersten `n` Wochentage ab Montag. |

Bearbeitungsfunktionen sind rein (`addBuilder`, `updateBuilder`, `removeBuilder` (löscht Zuweisungen), `assignSection`, `addMilestone`, `updateMilestone`, `moveMilestone`, `removeMilestone`, `addDependency`, `removeDependency`, `setProgramSettings`, `setProgram`) und werden mit `siteOperation` verpackt. `removeSection` und `pruneProgram` entfernen Verweise auf gelöschte Abschnitte aus Meilensteinen, Abhängigkeiten und Zuweisungen; `programIssues` meldet verbliebene hängende Verweise, leere Meilensteine, Abhängigkeiten gegen die Bau-Reihenfolge und (bei mehreren Bauleuten) nicht zugewiesene Abschnitte.

## Zeitplan (`planProgram`)

Eingaben: Baustellenplan, `SiteOverview` aus der Projektberechnung (Abschnittspläne mit Blöcken, Haken, Bedarf, Sammelzeit – [SITE](SITE.md)), Bautempo (`paceOf(site)`), optional das heutige Datum. Es wird nichts ein zweites Mal gezählt: Restarbeit eines Abschnitts = `blocks − blocksDone` des Abschnittsplans, Bedarf je Meilenstein/Bauleute = Summe der Abschnittspläne.

1. **Reihenfolge** (`sectionOrder`): topologisch nach Abhängigkeiten, Bau-Reihenfolge der Baustelle als Tie-Break.
2. **Spuren**: jede Bauleute-ID ist eine Spur und arbeitet an einem Abschnitt zugleich. Ein Abschnitt mit mehreren Bauleuten nutzt die Summe ihrer Tempi und belegt alle Spuren. Nicht zugewiesene Abschnitte laufen nacheinander in einer eigenen Spur mit dem Projekt-Bautempo. Ohne Bauleute ergibt das genau die Bau-Reihenfolge.
3. **Bautage** je Abschnitt = ⌈Restarbeit / Tempo⌉ (mindestens 1). Start = max(Ende aller Voraussetzungen, nächster freier Tag aller beteiligten Spuren). Abgehakte Abschnitte (alle Schritte „erledigt“) brauchen 0 Bautage und geben ihre Abhängigkeiten frei.
4. **Zustand** je Abschnitt: `done`, `blocked` (wartet auf unfertige Voraussetzungen), `open` (schon begonnen), `ready`.
5. **Kritischer Pfad**: spätester Start rückwärts über Abhängigkeits- und Spurnachfolger; Abschnitte ohne Puffer sind kritisch (bei einer einzigen Spur alle).
6. **Kalender** (`sessionCalendar`): Bautag-Index → Datum ab `start` unter Auslassung der nicht erlaubten Wochentage.
7. **Meilensteine**: Ende = letztes Ende ihrer Abschnitte; Status `done` (alle Abschnitte abgehakt), `ok` (voraussichtliches Ende ≤ Termin), `late` (später oder Termin ohne Datum bereits vorbei), `open` (kein Termin). Dazu Blöcke, Schritte, offene Bauitems und Sammelstunden der nicht fertigen Abschnitte.
8. **Bauleute** (`BuilderLoad`): Abschnitte, Bautage, Blöcke, nächster Abschnitt, zusammengeführte fehlende Bauitems und Sammelzeilen.

`programText` erzeugt das Bauprogramm als Text (Meilensteine, Abschnitte mit Zeiten und Bauleuten, Abhängigkeiten), `builderText` den persönlichen Bauzettel einer Bauleute-Person. `programSummary` ist der billige Kopf für Projektkarten (Anzahl, nächster terminierter Meilenstein) ohne Geometrie.

## Vorschläge

- `suggestDependencies(site, project, guide)`: aus der Bauanleitung (Schrittvoraussetzungen über Abschnittsgrenzen, z. B. Stütze darunter) und aus Anschlussverbindungen zwischen Bauteilen verschiedener Abschnitte (frühere Abschnitt zuerst). Vorhandene Abhängigkeiten und solche, die einen Kreis schließen würden, werden ausgelassen; alle Vorschläge zusammen bleiben gültig.
- `suggestProgram(site, preset)`: Startpunkt für große Anlagen. `phases`: Abschnitte „Phase N …“ (auch „Bauphase/Stufe/Etappe N“) werden zu Meilenstein N, Abschnitte davor (Straßen, Plätze, Hauptweg) zu „Erschließung“; jeder Abschnitt einer Phase wartet auf alle Abschnitte der vorigen. Ohne solche Namen fällt der Vorschlag auf `chain` (≤ 6 Abschnitte) bzw. `stages` zurück. `chain`: jeder Abschnitt nach dem vorigen, ein Meilenstein je Abschnitt. `stages`: vier Etappen über die Bau-Reihenfolge. Bauleute und Zuweisungen bleiben erhalten, Meilensteine und Abhängigkeiten werden ersetzt (ein Rückgängig-Schritt).

Anlagen ([ANLAGEN](ANLAGEN.md)), Basisplaner ([BASE_PLANNER](BASE_PLANNER.md)) und Großprojekte der Bibliothek liefern Projekte mit Abschnitten „Wege & Platz“/„Straßen & Plätze“ und „Phase N: …“; der Vorschlag `phases` macht daraus direkt den Projektplan. Wer ein Projekt programmatisch anlegt, kann `applyOperation(p, siteOperation(suggestProgram(siteOf(p)), 'Projektplan'))` nachschalten.

## Oberfläche

Reiter „Planung“ (nach „Baustelle“): Kopf (voraussichtliche Dauer bzw. Enddatum, nächster Meilenstein, Bauleute, kritischer Pfad), Befunde, **Zeitplan** als Balken je Abschnitt in Spuren je Bauleute (kritisch rot umrandet, wartend grau, Meilensteine als ◆), **Meilensteine** (anlegen mit Termin, bearbeiten mit Abschnittsauswahl, ↑/↓, Status, Fortschritt, fehlende Items, Sammelzeit; drei Vorschlagsknöpfe mit Bestätigung, wenn schon etwas da ist), **Abhängigkeiten** (Formular „A erst nach B“, Vorschlagsliste mit „Übernehmen“/„Alle übernehmen“, Kreis wird als Meldung angezeigt), **Bauleute** (Name und Tempo, Bauzettel in die Zwischenablage – ohne Zwischenablage als Datei –, Zuweisungsmatrix Abschnitt × Bauleute mit Zustand und Zeitfenster), **Einstellungen** (erster Bautag, Bautage je Woche, „Bauprogramm als Text“). Ohne Bauabschnitte verweist der Reiter auf die Baustelle. Die Projektkarte in der Projektzentrale zeigt den nächsten Meilenstein als Chip.

Alle Farben kommen aus den Theme-Tokens (hell/dunkel). Bei 390 px bricht der Balkenplan auf eine schmalere Beschriftungsspalte um; kein horizontales Scrollen.

## Prüfung

- `tests/program.test.mjs`: Prüfung (Schema, Kreise mit Pfad, Selbstbezug, Doppel, unbekannte Bauleute, Datumsformat, Bautage je Woche, Bautempo), Bearbeiten (rein, Rückgängig, Bereinigen beim Entfernen eines Abschnitts), Befunde, Vorschläge aus Geometrie und Anschlüssen (alle zusammen gültig, Gegenrichtung blockiert), Vorlagen (Phasen mit Erschließung, Kette, Etappen, Rückfall), Kalender (7/5/2 Tage je Woche), Zeitplan (parallele Spuren, geteilter Abschnitt, Warten auf Voraussetzung, kritischer Pfad, Daten, Meilensteinstatus ok/late/open/done, Bauleute-Bedarf, Texte, Abhaken gibt frei, ohne Bauleute eine Spur, deterministisch), Sicherung.
- `tests/e2e/program.e2e.mjs` (1400 px und 390 px, Port 4305): Hinweis ohne Abschnitte, Vorschläge übernehmen (wartende Balken), Kreis abgelehnt, Meilenstein mit Termin in der Vergangenheit (verspätet) und Abschnittsauswahl, zwei Bauleute mit Zuweisungsmatrix und Spuren, Bauzettel, Startdatum mit 5 Bautagen je Woche, Textdatei, Neuladen, Meilenstein-Chip auf der Projektkarte, kein horizontales Scrollen.

## Vertiefung PROJ-02 (04.11.2026)

Vier Erweiterungen, alle optional im selben Datensatz `project.site.program` (Schema bleibt 1, ältere Projekte unverändert):

| Feld | Bedeutung |
|---|---|
| `builders[].share` | Anteil der Bautage, an denen die Person dabei ist (10–99 %, fehlt = 100 %). Tempo im Plan = Tempo × Anteil. |
| `waitForMaterial: true` | Abschnitte beginnen erst, wenn ihr Material da ist (Planung ↔ Produktion). |
| `baseline` | Basisplan: `at` (Tag), `end` (letzter Bautag), `sections` (id → erster/letzter Bautag als Datum), `milestones` (id → Datum). Nur Daten, damit der Vergleich gilt, wenn der Plan ab heute neu rechnet. |

**Zeitplan ab heute.** Liegt das Startdatum in der Vergangenheit, beginnt die offene Arbeit am nächsten Bautag ab heute (`ProgramPlan.from`); vorher lag offene Arbeit auf vergangenen Tagen. Ein Hinweis unter dem Plan sagt das.

**Material abwarten.** `planProgramWithMaterial(site, overview, pace, today)` (`programMaterial.ts`) rechnet zuerst die Materialbereitschaft der Produktion (`analyzeProduction` ohne Zeitplan: Farmen, gemessene Raten, Sammelzeit je Spieltag, in Bau-Reihenfolge ab heute) und gibt sie als `materialDays` an `planProgram`. Ein Abschnitt beginnt frühestens am Bautag ⌈Bereitschaft⌉ (ein Spieltag = ein Bautag); `ScheduledSection.materialDay` und `materialWait` (um wie viele Bautage der Beginn wegen Material rückt) zeigen das. Abschnitte mit Items ohne Sammel-Richtwert (`materialUnknown`) können nicht warten. Es gibt keinen Kreis: die Bereitschaft hängt nicht vom Zeitplan ab, der Vergleich „Material zu spät“ im Reiter Produktion nutzt denselben wartenden Zeitplan und ist dann leer („Die Planung wartet auf das Material“).

**Basisplan.** `setBaseline(site, plan, today)` hält die Termine eines berechneten Plans fest (braucht ein Startdatum), `clearBaseline` verwirft ihn; beides ist ein Rückgängig-Schritt. `planProgram` liefert `baseline.slip` (Bautage zwischen geplantem und jetzigem Ende, `buildingDaysBetween` mit den Bautagen je Woche), je Abschnitt `baseline` (Lage im jetzigen Balkenplan, auch negativ) und `slip`, je Meilenstein `baselineEnd` und `slip`. `removeSection` bereinigt den Basisplan mit.

**Oberfläche.** Kopf: Karte „Basisplan vom …“ (± 0 / +N Bautage, geplantes und jetziges Ende) und „Material · aus Produktion“ (Bereitschaft, wartende Abschnitte, Link „Farmen & Engpässe“). Zeitplan: graue Linie = Basisplan, schraffiert = wartet auf Material. Meilensteine: „Basisplan TT.MM. · N Bautage später“. Bauleute: „dabei an 100/75/50/25/10 % der Bautage“. Einstellungen: Schalter „Abschnitte erst beginnen, wenn ihr Material da ist“ und „Basisplan festhalten / neu festhalten / verwerfen“.

**Prüfung.** `tests/program-depth.test.mjs` (Bautage zwischen Daten, Anteil, Start in der Vergangenheit, Basisplan mit Verzug/Bereinigung/Sicherung, Material abwarten gegen Produktion, Altbestand), `tests/e2e/program-depth.e2e.mjs` (1400/390 px, Port 4337), Testphase PROJ-16…18.

## Runde 3 PROJ-03 (05.11.2026)

Weiter optional in `project.site.program`, ältere Projekte bleiben unverändert:

| Feld | Bedeutung |
|---|---|
| `builders[].absences` | Abwesenheiten `{from, to, note?}` als Tage, geordnet und ohne Überlappung (`addAbsence` fügt angrenzende zusammen), höchstens 24, jede höchstens ein Jahr, Grund ≤ 80 Zeichen. |
| `baseline.name` | Name des aktiven Basisplans (1–60 Zeichen). |
| `baselines` | Frühere Basispläne (neueste zuerst, höchstens 8), gleiche Form wie `baseline`. |

**Abwesenheiten im Zeitplan.** Mit Startdatum rechnet `planProgram` für Bahnen mit Abwesenheiten Tag für Tag: an einem Bautag, an dem alle zugewiesenen Bauleute eines Abschnitts abwesend sind, ruht der Abschnitt (`ScheduledSection.absent` zählt diese Tage, `sessions` bleibt die Arbeitszeit). Bei gemeinsamen Abschnitten baut, wer da ist, mit seinem Tempo weiter. Ohne Abwesenheit bleibt die alte, geschlossene Rechnung (Altbestand identisch). Ohne Startdatum gibt es keine Daten, ein Hinweis sagt „Abwesenheiten wirken erst mit einem Startdatum“.

**Basisplan-Verlauf.** `setBaseline(site, plan, today, name?)` schiebt den bisherigen Basisplan in `baselines`; `clearBaseline` holt den neuesten früheren zurück; `activateBaseline(site, i)` tauscht einen früheren mit dem aktiven (Vergleichen), `renameBaseline(site, i | -1, name)`, `removeBaseline(site, i)`. `planProgram` liefert `baselines[]` mit `end`/`slip` je früherem Plan, damit die Liste „Frühere Basispläne“ den Verzug gegen jeden Stand zeigt. `removeSection` bereinigt alle Basispläne.

**Team → Planung.** `teamIntoProgram(program, view, today)` übernimmt „abwesend bis“ eines Mitglieds als Abwesenheit von heute bis zu diesem Tag (nicht doppelt, nichts Vergangenes) und meldet die Zahl.

**Prüfung.** `tests/program-absence.test.mjs`, `tests/e2e/program-absence.e2e.mjs` (1400/390 px, Port 4345), Testphase PROJ-20.

## Runde 4 PROJ-04: Reihenfolge zwischen Projekten (05.11.2026)

- **Datenmodell:** `program.after?: { projectId, note? }[]` (1–16 Einträge, keine Doppelten, Notiz ≤ 200 Zeichen). Jedes Projekt hält seine Vorgänger selbst, darum reisen sie mit Sicherung, Rückgängig und Teampaket mit. Bearbeitet wird über `addProjectAfter(site, ownId, projectId, note)` / `removeProjectAfter` als normale Bauplatz-Operation.
- **Projektübergreifend** (`packages/domain/src/projectOrder.ts`): `projectLinks` (Verweise auf gelöschte Projekte fallen weg), `projectCycle`, `projectAfterProblem` (Selbstbezug, doppelt, Kreis mit Namen), `projectLevels` (Stufe = längste Vorgängerkette), `projectSuccessors`.
- **Frühester Start:** `projectStartCheck` nimmt das Ende aus dem **aktiven Basisplan** des Vorgängers (ein Basisplan ohne Ende heißt „fertig seit“), sonst „Ende offen“. Frühester Start = Tag nach dem spätesten bekannten Ende; liegt das Startdatum davor, meldet die Planung das mit „Start auf … setzen“. Der Basisplan ist bewusst die Quelle: er ist der vereinbarte Termin, und die Planung muss dafür kein anderes Projekt durchrechnen.
- **Oberfläche:** Planung → „Reihenfolge der Projekte“ (Auswahl, Grund, Liste mit Endtermin, „Danach kommen“); Weltkarte: gestrichelte Pfeile vom Vorgänger zum Nachfolger (`PlanLayer.order`, Farbe `--map-order`) und im Detail „Erst nach … / Danach …“.
- Tests: `tests/project-order.test.mjs`, `tests/e2e/project-order.e2e.mjs`; Abnahme PROJ-21.

## Grenzen

- Bautage sind Projektionen aus Bautempo und Restbedarf – keine Messung, keine Sammel- oder Laufzeiten. Ein Abschnitt ist die kleinste Planungseinheit; ein großer Abschnitt mit einer Person bleibt lang.
- Abhängigkeiten gelten erst als erfüllt, wenn alle Schritte des vorausgesetzten Abschnitts abgehakt sind (auch geprüfte Schritte aus dem Spiel zählen erst nach dem Abhaken).
- Keine Teamsynchronisation: Bauleute sind Namen im lokalen Projekt; wer was abhakt, wird nicht festgehalten (TEAM-03). Abwesenheiten sind ganze Tage (keine halben). Lagerbuchungen je Bauleute und Abhängigkeiten zwischen verschiedenen Projekten auf der Weltkarte sind offen.
