# Basisplaner und Gebäude herauslösen (BASE-01, SPLIT-01)

Vorbild ist eine ganze Survival-Basis an der Küste: Dorfplatz in der Mitte, Lager, Waffenkammer, Schmiede, Verzauberungsturm, XP-Farm, Küche, Gemeinschaftshalle, Getreidefarm, Tierfarm, Hafen und Händler, alles über Wege verbunden. Die [Anlagen](ANLAGEN.md) ordnen kuratierte Bereiche entlang eines geraden Hauptwegs; der **Basisplaner** plant stattdessen nach **Funktionen** und verlegt ein **Wegenetz**. Umgekehrt zerlegt **Gebäude herauslösen** ein großes importiertes Modell (ganze Basis aus `.litematic`/`.schem`, Weltausschnitt) in einzelne Bauteile.

Route: `#/bibliothek/basis`, Reiter „Basisplaner“ in der Bibliothek. Herauslösen: Gebäudeblatt, Abschnitt „Verwalten“, „Gebäude herauslösen“. Nichts davon speichert ohne Knopfdruck.

## Funktionen (`packages/domain/src/base/baseFunctions.ts`)

`BASE_FUNCTIONS`: 13 Funktionen (Dorfplatz, Lager, Küche, Gemeinschaftshalle, Wohnhaus, Schmiede, Waffenkammer, Verzauberungsturm, XP-Farm, Getreidefarm, Tierfarm, Hafen, Händlerviertel). Jede Funktion kennt

- Zweck, Bauphase 1–4 (`BASE_PHASES`: Ankommen & Versorgen, Handwerk & Tiere, Handel & Hafen, Magie & Erfahrung), Tipps,
- Lagewunsch: `central` 0–3 (Nähe zum Platz), `coast` (`muss` Hafen, `gern` Farmen), `apart` (XP-Farm),
- Bauteile aus dem Katalog (`members`: Hauptgebäude zuerst, zählbare Teile wie Äcker 0–12 und Stege 0–6, Stege mit `water`), Alternativen fürs Hauptgebäude, optional einen freien Bauplatz (`reserve`, XP-Farm 17 × 17 um einen im Spiel gefundenen Spawner),
- `affinity(a, b)`: wer zu wem will (Lager–Schmiede 3, Küche–Felder 3, XP-Farm–Platz −2).

**Spielprüfungen** (`checkRequirements`) laufen auf den echten Blöcken der gewählten Bauteile: Verzauberungsstufe nach der Vanilla-Regel (Regale im Ring 2 Blöcke um den Tisch, Zwischenreihe Luft/Teppich/Schnee, maximal 15 wirksam; `enchantingPower`), bewässerter Ackerboden (Wasser ≤ 4 Blöcke, gleiche Höhe oder eine darüber; `farmlandHydration`), Arbeitsblöcke und Betten je Dorfbewohner, Lagerplatz in Stapeln, Amboss/Schmiedetisch/Hochofen, Kochstelle, Zaun und Tore, Stege im Wasser. Status `ok`/`warn`/`info`; offene Punkte wandern als Notiz in die Bauabschnitte.

`detectFunction(counts)` erkennt dieselben Signaturen in fremden Modellen (Zaubertisch → Verzauberungsturm, Amboss → Schmiede, viele Truhen → Lager, Ackerboden → Feld, Zaun → Gehege, Wegblöcke → Wege).

## Layout (`packages/domain/src/base/base.ts`)

`layoutBase(bibliothek, wahl)` ist rein und deterministisch:

1. **Zonen**: Vorlage (`BASE_TEMPLATES`: Küstenbasis, Starterbasis, Handelshafen) oder eigene Liste `BaseZoneChoice` (Funktion, aus/an, Hauptgebäude oder `RESERVE_ID`, Anzahlen, Name). Bauteile werden in Reihen gepackt; Stege bilden die Wasserreihe am +z-Rand der Zone.
2. **Anordnung** im kanonischen Rahmen (Wasser bei +z): Platz in die Mitte. Hinterland-Zonen nacheinander (zentrale und stark gebundene zuerst) an die beste Kante einer schon gesetzten Zone, bewertet nach Affinitätsabständen, Platznähe, Abstand (XP-Farm), Wasserferne und Gesamtausdehnung. Küstenzonen (Hafen, Felder, Tierfarm) bilden die Uferreihe: ihre Landteile enden auf einer Uferlinie, die Stege reichen darüber hinaus ins Wasser. Danach wird alles auf die gewählte Wasserseite gedreht (`WaterSide` nord/ost/sued/west, `isWaterCell`).
3. **Türen**: Eingänge (`entranceOf`) drehen sich zum Platz; danach wird mit den gedrehten Grundflächen noch einmal angeordnet.
4. **Wegenetz**: Von jedem Zoneneingang (Zelle vor der Tür des Hauptgebäudes, sonst Zonenkante zum Platz) läuft A* zum Ring um den Platz oder an bestehende Wege (billiger), mit Zuschlag nahe an Gebäuden und für Abbiegen; Gebäude und Wasser sind gesperrt. Zonen nahe am Platz werden zuerst verlegt, spätere Wege docken an den Stamm an. Breite 1–5, Laternen auf Zaunpfosten alle ≥ 10 Blöcke neben dem Weg. Das Netz wird ein eigenes Bauteil (`pathNetworkPayload`, Quelle `base-plan`, Stile Trampelpfad/Kies/Pflaster).
5. **Prüfung**: `BaseZonePlan.requirements` je Zone, `routed`, `atWater`, Warnungen (kein Platz, kein Weg), Blocker (fehlendes Bauteil).

`buildBasePlan(layout)` liefert einen `AnlagePlan`-kompatiblen `BasePlan` (Zonen als Bereiche, Wegenetz als `area`-Platzierung ohne Abstandsprüfung), damit `previewAnlage` (Voxelkonflikte über den Composer), `fitAnlageToTerrain` (Terrassen/Ebene, Erdarbeiten) und der 3D-Export unverändert funktionieren. `previewBase` ergänzt die Netz-Version.

**Übernahme**: `createBaseProject` / `baseIntoProject` (eine rückgängig machbare Batch-Operation, Veraltungsprüfung wie bei Anlagen). Die Oberfläche speichert zuerst das Wegenetz als Bauteil, dann das Projekt. Bauabschnitte: „Wege & Platz“, dann „Phase 1–4“ mit Zonen; offene Prüfpunkte und freigehaltene Bauplätze stehen in der Notiz.

### Küste aus der Geländeaufnahme (TERRAIN-03-S06)

Ist das Ziel ein Projekt mit Weltlage und Geländeaufnahme (oder Geländegestaltung), vergleicht `fitBaseShore` (`packages/domain/src/base/baseShore.ts`) den Plan mit dem echten Ufer. Rein, nichts wird gespeichert; die Seite zeigt das Ergebnis im Kasten „Küste“ unter „Prüfung“.

- **Wasserseite**: Je Seite werden alle Reihen quer zur Basis vom Rand nach außen abgesucht (bis 64 Blöcke). Eine Reihe trifft „offenes Wasser“, wenn mindestens 8 Wassersäulen hintereinander folgen (Wasser, das aus der Aufnahme hinausläuft, zählt als offen). Erreichen mindestens 50 % der Reihen einer Seite offenes Wasser, ist das die Küste (mit mittlerem Abstand); gilt das für zwei Seiten, entscheidet der Planer nicht (Halbinsel, Bucht). Unter 10 % Reihen mit irgendeinem Wasser heißt „kein Wasser“; nur schmales Wasser heißt Bach oder Teich, keine Küste. Lava zählt weder als Wasser noch als Land. Bei einer Küstenbasis wird nur der Landteil (bis zur geplanten Uferlinie) betrachtet.
- **Uferlinie**: Je Reihe quer zur Basis wird vom Platz aus zum Wasser hin das erste Wasser gesucht; der Median ist das echte Ufer. Die Differenz zur geplanten Uferlinie ist die vorgeschlagene Verschiebung entlang der Wasserachse (höchstens 48 Blöcke, sonst Hinweis „an anderer Stelle planen“).
- **Lage**: gezählt werden Grundrissspalten von Gebäuden auf echtem Wasser und Stegspalten auf echtem Land, jetzt und nach der Verschiebung.
- **Oberfläche**: „Wasserseite übernehmen“ setzt die vorgeschlagene Seite, „Ans echte Ufer schieben“ addiert die Verschiebung zum Versatz neben den bestehenden Bauten (Vorschau, Geländeanpassung, Konfliktprüfung und Übernahme nutzen denselben Versatz), „Verschiebung zurücksetzen“ nimmt sie zurück. Ein anderes Zielprojekt setzt die Verschiebung zurück. Bei gedrehter Weltlage gibt es (wie bei der Höhenanpassung) keine Küstenprüfung.
- Prüfung: `tests/unit/catalog/base-shore.test.mjs` (alle vier Seiten, Verschiebung, zu weit, Binnenland, Bach, Bucht, Halbinsel, Aufnahmerand), `tests/e2e/base-shore.e2e.mjs` (Sicherung mit Küsten-Aufnahme, Seite übernehmen, schieben, übernehmen; 1400/390 px); Abnahme BIB-19.

**Echte Küstenlinie im Lageplan:** `realShoreMap(survey, bereich, { origin, offset })` liefert alle Wasserspalten der Aufnahme unter dem Plan (Ausdehnung + 8) als Läufe je Reihe; der Lageplan zeichnet sie hellblau über die (dann halbtransparente) geplante Wasserseite, darunter steht die Zahl der Wasserfelder. Der Versatz (auch nach „Ans echte Ufer schieben“) verschiebt den Plan, nicht das Wasser.

### Wegenetz als Landschaftsweg (TERRAIN-03-S08)

Mit Zielprojekt und Geländeaufnahme erscheint unter „Übernehmen“ der Kasten **Gelände anpassen** (`apps/web/src/views/library/planTerrain.tsx`, gemeinsam mit den Großprojekten). Domäne: `packages/domain/src/base/planLandscape.ts`.

- **Wegenetz:** „als eigenes Bauteil (eine Ebene)“ wie bisher oder „als Landschaftsweg“: Das Netz (`layout.paths`) wird mit `layPathCells` in die Geländegestaltung des Projekts gelegt (Treppen oder Halbstufen, über Wasser Brücke mit Geländer oder Damm, Belag nach Wegstil: Trampelpfad → Pfad, Kiesweg → Kiesweg, Pflaster → Steinweg). Das flache Wegenetz-Bauteil entfällt (`withoutNetwork`); die Laternen stehen einzeln auf dem geplanten Boden und werden ein kleines eigenes Bauteil „Laternen am Weg“ (`lampPostPart`, Pfosten einen Block über dem Boden, damit das Geländebauteil seinen Oberblock behält) unter dem Schlüssel `wegenetz`, also im Abschnitt „Wege & Platz“. Laternen im Wasser, auf dem Weg oder neben Boden in Zaunhöhe fallen weg. Stege (`inWater`) stehen einen Block unter dem Wasserspiegel und bleiben beim Einebnen im Wasser; offene Wasserkanten der Gebäude bekommen Randsteine (`openWaterEdges`) im Wegenetz bzw. im Laternen-Bauteil (Spielprüfstand, BLOCK_LOGIC.md).
- **Bauplätze einebnen:** Nach der Höhenanpassung (Terrassen/Ebene) bekommt jede Grundrissspalte Boden genau einen Block unter dem untersten Block des Gebäudes, drei Spalten Rand gleichen ins Gelände an (`gradeFootprints`); Bauplätze im Wasser werden aufgeschüttet, mit „Wasserkanten als Kaimauer“ bekommt das neue Ufer Steinziegel (`fortifyShore`).
- **Vorschau:** Die Prüfung zeigt den Bericht (Wegfelder, Treppen, Brückenfelder, eingeebnete Spalten, Kaimauer, Laternen, Gebäude im Wasser), gerechnet auf einer Wegwerf-Gestaltung aus dem geplanten Gelände; die 3D-Vorschau zeigt die Gebäude ohne flaches Wegenetz.
- **Übernahme:** lädt die vorhandene Gestaltung des Projekts (oder beginnt eine aus seiner Geländeaufnahme), schreibt Bauplätze und Netz hinein, speichert sie als Original und fügt Basis und `terrainDesign.set` als **eine** Batch-Operation ein (ein Rückgängig-Schritt). Danach im Reiter „Landschaft“ „Als Bauteil ins Projekt übernehmen“.
- Der Basisplaner liest das Zielprojekt beim Wählen frisch aus dem Speicher (`useStoredProject`), damit Vorschau und Konfliktprüfung auch nach einer Übernahme in derselben Sitzung den echten Stand sehen.
- Prüfung: `tests/unit/catalog/plan-landscape.test.mjs`, `tests/e2e/plan-landscape.e2e.mjs` (Hang mit Bach, Landschaftsweg, Einebnen, Übernahme; 1400/390 px); Abnahme BIB-20.

Grenzen: Wege laufen orthogonal; die geplante Uferlinie bleibt eine Gerade (die echte Küste wird gezeigt und geprüft, das Layout folgt ihr nicht); Brücken liegen immer einen Block über dem Wasser, an hohen Ufern schneidet der Weg ein; Laternen im Landschaftsweg stehen auf dem geplanten Boden, nicht auf späteren Pinselstrichen.

## Gebäude herauslösen (`packages/domain/src/core/split.ts`)

`analyzeSplit(payload, optionen)` arbeitet säulenweise (x, z), linear in der Zellzahl (eine Million Zellen unter einer Sekunde):

- **Bodenhöhe** je Säule aus eindeutigem Boden (Grasblock, Erde, Sand, Erze …), Wegen und Ackerboden; Säulen ohne sichtbaren Boden (unter Gebäuden, Pflaster) übernehmen die Höhe des nächsten bekannten Nachbarn.
- **Klasse** je Zelle: Natur (Pflanzen, Bäume, Boden; Stein/Andesit/Kies/Sandstein/Terrakotta nur **unter oder auf** Bodenhöhe; Wasser unter der Oberfläche, am Feldrand nicht), Flach (Wegerde, Ackerboden, Pflanzen auf Feldern), Gebaut (alles andere).
- **Kernsäulen**: gebaute Blöcke reichen `coreHeight` (4) über den Boden; Kerne im Abstand ≤ `join` (2) bilden ein Gebäude, Kerne unter `minCore` (9) Säulen (Laternenpfosten, Pfeiler) fallen zurück; niedrige gebaute Säulen bis `margin` (2) ums Gebäude gehören dazu (Treppen, Vorbau), reine Weg-/Feldsäulen nie.
- **Flächen**: übrige niedrige Säulen, 8-verbunden innerhalb einer Kategorie (Feld samt Zaunring, Wege und Pflaster, Sonstiges), ab `minArea` (16) Säulen.
- Jedes Teil: Box, Säulen, Blöcke, Höhe, häufigste Blöcke, erkannte Funktion und Name („Schmiede“, „Feld 2“, „Wege & Plätze“).

`extractParts(payload, analyse, ids, { ground })` schneidet ein oder mehrere Teile (zusammengelegt, relative Lage bleibt) aus: `ohne` nur Gebautes und Flaches, `mit` auch Boden samt `foundation` Schichten darunter. Palette wird verdichtet, Blockentities und Entities ziehen mit, Quelle bleibt unverändert. `extractRest` liefert alles Übrige (Boden, Bäume, Kleinteile). `splitProject` baut ein Projekt mit einer Instanz je Teil an der ursprünglichen Stelle und Abschnitten „Gelände & Rest“, „Wege, Felder & Flächen“, „Gebäude“.

Oberfläche (`SplitPanel.tsx`): Optionen, Draufsicht der Teile, Liste mit Namen und Erkennung, Hervorhebung in der 3D-Ansicht, drei Wege: einzeln als Bauteile (Schlagwort `herausgeloest`, `funktion:<id>`), gewählte zu einem Bauteil, als Projekt aufteilen (optional mit Rest). Große Versionen laufen über `addAssetVersionInBackground`.

**Unterirdisch und Brücken (SPLIT-01-S05, 05.11.2026).**

- *Unterirdische Räume*: Säulen, deren gebaute Blöcke alle auf oder unter dem Boden liegen, bilden eigene Kerne und verbinden sich nie mit Gebäuden an der Oberfläche. Liegt ein solcher Raum mindestens zur Hälfte im Grundriss eines Gebäudes (um `join` + 1 erweitert), ist er dessen **Keller** und gehört dazu (Erkennung „mit Keller (N Blöcke unter dem Gelände)“). Sonst wird er ein eigener Teil mit `role: 'underground'`, Name „Unterirdischer Raum“ oder „Lager (unterirdisch)“, Höhe = Raumhöhe. `below` zählt je Teil die gebauten Blöcke unter dem Gelände.
- *Brücken*: Säulen, deren feste Blöcke über einer Lücke (Luft ab 1 Block, über Wasser direkt) beginnen und dünner als `coreHeight` sind, schweben. Zwei Durchläufe: erst Gebäude ohne schwebende Säulen; ein 8-verbundener Schwebestreifen, der zwei dieser Gebäude direkt berührt, oder ein langer schmaler freier Steg (≥ 8 lang, ≤ 5 breit, dreimal so lang wie breit) wird ein eigener Teil mit `role: 'bridge'` und `connects` (Teile an beiden Enden). Alle anderen schwebenden Säulen (Dächer großer Hallen, Traufen, Balkone) gehören im zweiten Durchlauf wieder zu ihrem Gebäude. So legt eine Brücke zwei Häuser nicht mehr zu einem Teil zusammen.
- Liste: Art „Brücke“/„Unterirdisch“, „verbindet „A“ und „B““, eigene Farben, Schlagwörter `bruecke`/`unterirdisch`.

Grenzen: Erkennung über Säulen – Gebäude, die sich überlappen, werden ein Teil (dann `join` senken); eine Brücke von einem Gebäude zu einem Weg (nur ein Gebäude am Ende) bleibt beim Gebäude; unterirdische Räume ohne Boden darüber gelten als Oberflächengebäude; Höhlen zählen als Boden. Prüfung: `tests/unit/core/split-under.test.mjs`.

**Abnahme mit einer Basis aus dem echten Spiel (SPLIT-01-S05/S06, 06.11.2026).** `scripts/size/test_grossbau_ingame.sh` lässt Minecraft 26.3 (Fabric-Gametest, Welt mit festem Seed) eine Basis in echtes Gelände bauen (`scripts/size/basis_build.mjs`): drei Katalog-Häuser, Keller unter „Haus Nord“, Tiefenschiefer-Bunker abseits, zwei Weizenfelder, Gehege, Wegenetz, Bach mit Holzbrücke zwischen zwei Häusern. Die Mod nimmt den Bereich mit `GET /v1/box` auf, daraus wird `basis-aus-dem-spiel.litematic` (rund 123.000 Blöcke samt Wald, Strand und Ruinenportal). `scripts/size/grossbau_verify.mjs` prüft die Erkennung und das Aufteilen (jeder Block am alten Platz, keine Konflikte), `tests/big/basis.big.mjs` denselben Ablauf im Browser (Gebäudeblatt → Gebäude herauslösen → Als Projekt aufteilen). Ergebnis: „3 Gebäude, 9 Flächen, 1 unterirdisch, 1 Brücken“, Wohnhaus „mit Keller (381 Blöcke unter dem Gelände)“, Bunker als „Unterirdischer Raum“, Brücke „verbindet „Wohnhaus“ und „Schmiede““, beide Felder, Gehege, Wege. Dabei behoben: Wasser machte Säulen unter einem Steg über einem tiefen Bach „hoch“, der Steg wurde ein Gebäude (Test in `split-under.test.mjs`). Bekannt: die Brücke nimmt das Wasser darunter mit, die Bibliothek bekommt keine Funktion. Philipps eigene gewachsene Basen bleiben als Handabnahme (BIB-11 teilweise).

## Prüfung

- `tests/unit/catalog/base.test.mjs`: Funktionen und Vorlagen gegen den Katalog, Verzauberungsstufe/Bewässerung/Arbeitsblöcke auf echten Bauteilen, Erkennung, Wahlprüfung, alle Vorlagen (keine Konflikte, Abstand, keine Wege durch Gebäude oder Wasser, Hafen im Wasser, Land nie im Wasser, XP-Farm am weitesten vom Platz, Determinismus), Zonenwahl (aus, Tausch, Anzahl, Bauplatz, Wasserseite, Zusatzzone, Hafen ohne Wasser), Übernahme mit Phasen und Netz, Einfügen mit Rückgängig und Veraltungsprüfung, Herauslösen einer ganzen Basis auf Gras (Gebäude, Felder, Wegenetz, Schmiede nahezu vollständig, mit/ohne Boden, Zusammenlegen, Rest, Bilanz), Aufteilen als Projekt (jeder Block am alten Platz, keine Konflikte).
- `tests/e2e/base.e2e.mjs` (Port 4297): Basisplaner mit Zonen, Tausch, Bauplatz, Wasserseite, Zusatzzone, Übernahme (Abschnitte, Wegenetz-Bauteil), Herauslösen im Gebäudeblatt, Handy 390 px.
