# Basisplaner und Gebäude herauslösen (BASE-01, SPLIT-01)

Vorbild ist eine ganze Survival-Basis an der Küste: Dorfplatz in der Mitte, Lager, Waffenkammer, Schmiede, Verzauberungsturm, XP-Farm, Küche, Gemeinschaftshalle, Getreidefarm, Tierfarm, Hafen und Händler, alles über Wege verbunden. Die [Anlagen](ANLAGEN.md) ordnen kuratierte Bereiche entlang eines geraden Hauptwegs; der **Basisplaner** plant stattdessen nach **Funktionen** und verlegt ein **Wegenetz**. Umgekehrt zerlegt **Gebäude herauslösen** ein großes importiertes Modell (ganze Basis aus `.litematic`/`.schem`, Weltausschnitt) in einzelne Bauteile.

Route: `#/bibliothek/basis`, Reiter „Basisplaner“ in der Bibliothek. Herauslösen: Gebäudeblatt, Abschnitt „Verwalten“, „Gebäude herauslösen“. Nichts davon speichert ohne Knopfdruck.

## Funktionen (`packages/domain/src/baseFunctions.ts`)

`BASE_FUNCTIONS`: 13 Funktionen (Dorfplatz, Lager, Küche, Gemeinschaftshalle, Wohnhaus, Schmiede, Waffenkammer, Verzauberungsturm, XP-Farm, Getreidefarm, Tierfarm, Hafen, Händlerviertel). Jede Funktion kennt

- Zweck, Bauphase 1–4 (`BASE_PHASES`: Ankommen & Versorgen, Handwerk & Tiere, Handel & Hafen, Magie & Erfahrung), Tipps,
- Lagewunsch: `central` 0–3 (Nähe zum Platz), `coast` (`muss` Hafen, `gern` Farmen), `apart` (XP-Farm),
- Bauteile aus dem Katalog (`members`: Hauptgebäude zuerst, zählbare Teile wie Äcker 0–12 und Stege 0–6, Stege mit `water`), Alternativen fürs Hauptgebäude, optional einen freien Bauplatz (`reserve`, XP-Farm 17 × 17 um einen im Spiel gefundenen Spawner),
- `affinity(a, b)`: wer zu wem will (Lager–Schmiede 3, Küche–Felder 3, XP-Farm–Platz −2).

**Spielprüfungen** (`checkRequirements`) laufen auf den echten Blöcken der gewählten Bauteile: Verzauberungsstufe nach der Vanilla-Regel (Regale im Ring 2 Blöcke um den Tisch, Zwischenreihe Luft/Teppich/Schnee, maximal 15 wirksam; `enchantingPower`), bewässerter Ackerboden (Wasser ≤ 4 Blöcke, gleiche Höhe oder eine darüber; `farmlandHydration`), Arbeitsblöcke und Betten je Dorfbewohner, Lagerplatz in Stapeln, Amboss/Schmiedetisch/Hochofen, Kochstelle, Zaun und Tore, Stege im Wasser. Status `ok`/`warn`/`info`; offene Punkte wandern als Notiz in die Bauabschnitte.

`detectFunction(counts)` erkennt dieselben Signaturen in fremden Modellen (Zaubertisch → Verzauberungsturm, Amboss → Schmiede, viele Truhen → Lager, Ackerboden → Feld, Zaun → Gehege, Wegblöcke → Wege).

## Layout (`packages/domain/src/base.ts`)

`layoutBase(bibliothek, wahl)` ist rein und deterministisch:

1. **Zonen**: Vorlage (`BASE_TEMPLATES`: Küstenbasis, Starterbasis, Handelshafen) oder eigene Liste `BaseZoneChoice` (Funktion, aus/an, Hauptgebäude oder `RESERVE_ID`, Anzahlen, Name). Bauteile werden in Reihen gepackt; Stege bilden die Wasserreihe am +z-Rand der Zone.
2. **Anordnung** im kanonischen Rahmen (Wasser bei +z): Platz in die Mitte. Hinterland-Zonen nacheinander (zentrale und stark gebundene zuerst) an die beste Kante einer schon gesetzten Zone, bewertet nach Affinitätsabständen, Platznähe, Abstand (XP-Farm), Wasserferne und Gesamtausdehnung. Küstenzonen (Hafen, Felder, Tierfarm) bilden die Uferreihe: ihre Landteile enden auf einer Uferlinie, die Stege reichen darüber hinaus ins Wasser. Danach wird alles auf die gewählte Wasserseite gedreht (`WaterSide` nord/ost/sued/west, `isWaterCell`).
3. **Türen**: Eingänge (`entranceOf`) drehen sich zum Platz; danach wird mit den gedrehten Grundflächen noch einmal angeordnet.
4. **Wegenetz**: Von jedem Zoneneingang (Zelle vor der Tür des Hauptgebäudes, sonst Zonenkante zum Platz) läuft A* zum Ring um den Platz oder an bestehende Wege (billiger), mit Zuschlag nahe an Gebäuden und für Abbiegen; Gebäude und Wasser sind gesperrt. Zonen nahe am Platz werden zuerst verlegt, spätere Wege docken an den Stamm an. Breite 1–5, Laternen auf Zaunpfosten alle ≥ 10 Blöcke neben dem Weg. Das Netz wird ein eigenes Bauteil (`pathNetworkPayload`, Quelle `base-plan`, Stile Trampelpfad/Kies/Pflaster).
5. **Prüfung**: `BaseZonePlan.requirements` je Zone, `routed`, `atWater`, Warnungen (kein Platz, kein Weg), Blocker (fehlendes Bauteil).

`buildBasePlan(layout)` liefert einen `AnlagePlan`-kompatiblen `BasePlan` (Zonen als Bereiche, Wegenetz als `area`-Platzierung ohne Abstandsprüfung), damit `previewAnlage` (Voxelkonflikte über den Composer), `fitAnlageToTerrain` (Terrassen/Ebene, Erdarbeiten) und der 3D-Export unverändert funktionieren. `previewBase` ergänzt die Netz-Version.

**Übernahme**: `createBaseProject` / `baseIntoProject` (eine rückgängig machbare Batch-Operation, Veraltungsprüfung wie bei Anlagen). Die Oberfläche speichert zuerst das Wegenetz als Bauteil, dann das Projekt. Bauabschnitte: „Wege & Platz“, dann „Phase 1–4“ mit Zonen; offene Prüfpunkte und freigehaltene Bauplätze stehen in der Notiz.

Grenzen: Wege laufen nur orthogonal und auf einer Höhe (Stufen folgen aus der Geländeanpassung je Einheit, nicht als Blöcke); die Uferlinie ist eine Gerade; keine Brücken; Erkennung der Küstenlinie aus der Geländeaufnahme bleibt dem Geländereiter überlassen (der Planer nimmt die Wasserseite als Wahl).

## Gebäude herauslösen (`packages/domain/src/split.ts`)

`analyzeSplit(payload, optionen)` arbeitet säulenweise (x, z), linear in der Zellzahl (eine Million Zellen unter einer Sekunde):

- **Bodenhöhe** je Säule aus eindeutigem Boden (Grasblock, Erde, Sand, Erze …), Wegen und Ackerboden; Säulen ohne sichtbaren Boden (unter Gebäuden, Pflaster) übernehmen die Höhe des nächsten bekannten Nachbarn.
- **Klasse** je Zelle: Natur (Pflanzen, Bäume, Boden; Stein/Andesit/Kies/Sandstein/Terrakotta nur **unter oder auf** Bodenhöhe; Wasser unter der Oberfläche, am Feldrand nicht), Flach (Wegerde, Ackerboden, Pflanzen auf Feldern), Gebaut (alles andere).
- **Kernsäulen**: gebaute Blöcke reichen `coreHeight` (4) über den Boden; Kerne im Abstand ≤ `join` (2) bilden ein Gebäude, Kerne unter `minCore` (9) Säulen (Laternenpfosten, Pfeiler) fallen zurück; niedrige gebaute Säulen bis `margin` (2) ums Gebäude gehören dazu (Treppen, Vorbau), reine Weg-/Feldsäulen nie.
- **Flächen**: übrige niedrige Säulen, 8-verbunden innerhalb einer Kategorie (Feld samt Zaunring, Wege und Pflaster, Sonstiges), ab `minArea` (16) Säulen.
- Jedes Teil: Box, Säulen, Blöcke, Höhe, häufigste Blöcke, erkannte Funktion und Name („Schmiede“, „Feld 2“, „Wege & Plätze“).

`extractParts(payload, analyse, ids, { ground })` schneidet ein oder mehrere Teile (zusammengelegt, relative Lage bleibt) aus: `ohne` nur Gebautes und Flaches, `mit` auch Boden samt `foundation` Schichten darunter. Palette wird verdichtet, Blockentities und Entities ziehen mit, Quelle bleibt unverändert. `extractRest` liefert alles Übrige (Boden, Bäume, Kleinteile). `splitProject` baut ein Projekt mit einer Instanz je Teil an der ursprünglichen Stelle und Abschnitten „Gelände & Rest“, „Wege, Felder & Flächen“, „Gebäude“.

Oberfläche (`SplitPanel.tsx`): Optionen, Draufsicht der Teile, Liste mit Namen und Erkennung, Hervorhebung in der 3D-Ansicht, drei Wege: einzeln als Bauteile (Schlagwort `herausgeloest`, `funktion:<id>`), gewählte zu einem Bauteil, als Projekt aufteilen (optional mit Rest). Große Versionen laufen über `addAssetVersionInBackground`.

Grenzen: Erkennung über Säulen – Gebäude, die sich überlappen oder über Brücken verbunden sind, werden ein Teil (dann `join` senken oder die Anschlussbrücke als Fläche abwählen); unterirdische Räume ohne Boden darüber werden nicht als eigenes Gebäude erkannt; Höhlen zählen als Boden.

## Prüfung

- `tests/base.test.mjs`: Funktionen und Vorlagen gegen den Katalog, Verzauberungsstufe/Bewässerung/Arbeitsblöcke auf echten Bauteilen, Erkennung, Wahlprüfung, alle Vorlagen (keine Konflikte, Abstand, keine Wege durch Gebäude oder Wasser, Hafen im Wasser, Land nie im Wasser, XP-Farm am weitesten vom Platz, Determinismus), Zonenwahl (aus, Tausch, Anzahl, Bauplatz, Wasserseite, Zusatzzone, Hafen ohne Wasser), Übernahme mit Phasen und Netz, Einfügen mit Rückgängig und Veraltungsprüfung, Herauslösen einer ganzen Basis auf Gras (Gebäude, Felder, Wegenetz, Schmiede nahezu vollständig, mit/ohne Boden, Zusammenlegen, Rest, Bilanz), Aufteilen als Projekt (jeder Block am alten Platz, keine Konflikte).
- `tests/e2e/base.e2e.mjs` (Port 4297): Basisplaner mit Zonen, Tausch, Bauplatz, Wasserseite, Zusatzzone, Übernahme (Abschnitte, Wegenetz-Bauteil), Herauslösen im Gebäudeblatt, Handy 390 px.
