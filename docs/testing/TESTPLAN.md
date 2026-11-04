# Testplan der großen Testphase (QA-04)

Erzeugt aus `apps/web/src/testing/testplan.ts` mit `node scripts/render_testplan.mjs`; nicht von Hand ändern. Dieselben Fälle stehen im Planer unter **Testphase** (`#/testphase`) mit Haken, Notizen und „Fehler melden“.

Umfang: 138 Fälle in 13 Bereichen, davon 62 Kernfälle.

**Kern** = in jeder Testrunde einmal; **vertieft** = wenn Zeit ist oder der Bereich geändert wurde. Fehler bitte über den Planer (Testphase → Fehler melden) oder die GitHub-Vorlagen „Testphase: Planer“ / „Testphase: Mod“ melden; im Spiel vorher `/bauplaner diagnose`.

## START · Start, Projektzentrale und Sicherung (Planer)

Erster Eindruck, Projekte anlegen und Daten sichern. Am besten in einem frischen Browserprofil oder privaten Fenster beginnen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| START-01 | Erster Start ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | kern | 1. Seite öffnen (am besten privates Fenster).<br>2. Warten, bis die Bibliothek geladen ist (Fortschrittsanzeige). | Startbildschirm mit Fortschritt, danach die Projektzentrale; keine Fehlermeldung, Seite friert nicht ein. |
| START-02 | Projekt anlegen, umbenennen, löschen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | kern | 1. In der Projektzentrale ein neues Projekt anlegen.<br>2. Umbenennen.<br>3. Ein zweites Projekt anlegen und wieder löschen. | Namen bleiben nach dem Neuladen (F5) erhalten; das gelöschte Projekt ist weg, das andere unverändert. |
| START-03 | Sichern und wiederherstellen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | kern | 1. „Alles sichern“ in der Projektzentrale.<br>2. Ein Projekt ändern oder löschen.<br>3. „Sicherung wiederherstellen …“ mit der gespeicherten Datei. | Die Sicherungsdatei lädt herunter; nach dem Wiederherstellen ist der gesicherte Stand wieder da. |
| START-04 | Sicherungserinnerung ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | vertieft | 1. Mehrere Änderungen machen, ohne zu sichern.<br>2. Projektzentrale ansehen. | Ein Hinweis zeigt, wie alt die letzte Sicherung ist, und bietet „Sichern“ an. |
| START-05 | Schnellsuche | kern | 1. Strg+K (Mac: ⌘K) drücken.<br>2. Nach einem Gebäude und nach „Werkstatt“ suchen und öffnen. | Die Suche öffnet sofort, Treffer führen zur richtigen Seite. |
| START-06 | Farbschema und Texturen | vertieft | 1. Oben das Farbschema wechseln (hell/dunkel/automatisch).<br>2. Über den Texturen-Knopf ein eigenes Ressourcenpaket (.zip) laden, falls vorhanden. | Alle Seiten bleiben lesbar; mit Ressourcenpaket zeigen Blöcke Texturen, ohne Paket einfache Farben. |
| START-07 | Handy und Tablet | vertieft | 1. Seite auf dem Handy öffnen.<br>2. Untere Leiste benutzen, ein Projekt und die Bibliothek öffnen. | Nichts ragt seitlich aus dem Bild, Knöpfe sind mit dem Finger treffbar. |

## BIB · Bibliothek (Planer)

Katalog mit Gebäuden, Ensembles, Generatoren, Sammlungen, Vorlagen, Anlagen und Großprojekten.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| BIB-01 | Katalog durchsuchen und filtern ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | kern | 1. Bibliothek öffnen.<br>2. Suchbegriff eingeben (z. B. „Turm“), Kategorie und Spielphase filtern.<br>3. Adresse kopieren und in neuem Tab öffnen. | Treffer passen zum Filter, Vorschaubilder erscheinen; der neue Tab zeigt dieselbe Suche. |
| BIB-02 | Gebäude-Detailseite ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | kern | 1. Ein Gebäude öffnen.<br>2. Ansichten „Bilder“, „Ebenen“ und „Versionen“ durchklicken, 3D drehen und zoomen. | 3D-Ansicht flüssig, Ebenen lassen sich einzeln ansehen, Materialliste plausibel. |
| BIB-03 | Gebäude in ein Projekt übernehmen | kern | 1. Auf der Detailseite das Gebäude einem Projekt hinzufügen.<br>2. Projekt öffnen. | Das Gebäude steht im Projekt-Editor und ist auswählbar. |
| BIB-04 | Vergleich und Merkliste ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | vertieft | 1. Zwei bis drei Gebäude merken.<br>2. Vergleich öffnen. | Gebäude stehen nebeneinander mit Maßen und Material. |
| BIB-05 | Ensembles ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek/ensembles)) | vertieft | 1. Ensembles öffnen, eins ansehen und als Projekt übernehmen. | Alle Gebäude des Ensembles stehen im Projekt an sinnvoller Stelle, ohne Überschneidung. |
| BIB-06 | Generatoren ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek/generatoren)) | kern | 1. Generatoren öffnen (Haus, Turm, Mauer, Brücke, Dach …).<br>2. Maße und Stil ändern.<br>3. Ergebnis als Bauteil speichern. | Vorschau ändert sich sofort; keine schwebenden Blöcke; gespeichertes Bauteil erscheint in der Bibliothek. |
| BIB-07 | Eigene Sammlungen und Ordner ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek/sammlungen)) | vertieft | 1. Eine Sammlung anlegen, Gebäude hinzufügen, Ordner anlegen und verschieben. | Sammlung bleibt nach dem Neuladen erhalten; Katalogfilter nach Sammlung funktioniert. |
| BIB-08 | Vorlagen speichern ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek/vorlagen)) | vertieft | 1. Ein Ensemble oder einen Generator mit eigenen Werten als Vorlage speichern und wieder öffnen. | Vorlage stellt genau die gespeicherten Werte wieder her. |
| BIB-09 | Anlagen und Bauwelten ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek/anlagen)) | vertieft | 1. Anlagen öffnen, eine Anlage mit Konfliktvorschau ansehen.<br>2. Bauwelten durchblättern. | Konflikte werden markiert; Übernahme legt die Anlage in ein Projekt. |
| BIB-10 | Basisplaner ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek/basis)) | kern | 1. Bibliothek → Reiter „Basisplaner“.<br>2. Zonen an- und abwählen, zwei Zonen tauschen, Wasserseite und Bauplatz ändern.<br>3. Übernehmen. | Vorschau ohne Überschneidungen, Wege durch kein Gebäude; das Projekt hat Abschnitte „Wege & Platz“ und „Phase 1–4“, das Wegenetz liegt als Bauteil vor. (Abnahme BASE-01-S06) |
| BIB-11 | Gebäude aus einer eigenen Basis herauslösen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | vertieft | 1. Eine eigene große .litematic/.schem (ganze Basis) in die Bibliothek importieren.<br>2. Gebäudeblatt → „Verwalten“ → „Gebäude herauslösen“.<br>3. Teile ansehen, einige einzeln speichern, als Projekt aufteilen. | Gebäude, Felder, Gehege und Wege werden erkannt (Grenze: unterirdische Räume und Brücken noch nicht sicher); das Projekt zeigt jeden Block am alten Platz ohne Konflikte. (Abnahme SPLIT-01-S05 mit echten Dateien) |
| BIB-13 | Großprojekt planen und übernehmen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek/grossprojekte)) | kern | 1. Bibliothek → Reiter „Großprojekte“, ein Projekt (z. B. „Freie Marktstadt“) öffnen.<br>2. Ein Quartier abwählen, Straßenbreite und -stil ändern, einen Platz tauschen und drehen.<br>3. Als Projekt anlegen; Baustelle und Editor ansehen.<br>4. Im Katalog nach „großbau“ suchen und ein Großbauwerk (z. B. Schloss mit Innenhof, Klosteranlage oder Universität) öffnen. | Lageplan und 3D-Vorschau zeigen Quartiere und Straßen ohne Voxelkonflikte; das Projekt hat Abschnitte „Straßen & Plätze“ und „Phase 1–4“, das Straßennetz liegt als Bauteil vor; Türen zeigen zur Straße; die acht Großbauten sind begehbar und eingerichtet. (Abnahme GROSS-01-S06) |
| BIB-14 | Kolosseum-Viertel und Arena-Generator ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek/grossprojekte/gp_kolosseum)) | kern | 1. Bibliothek → Reiter „Großprojekte“ → „Kolosseum-Viertel“ öffnen und als Projekt anlegen.<br>2. Im Editor das Kolosseum ansehen (Ebenen: Hypogäum unter dem Platz, Arena, Ränge, vier Etagen), Bauanleitung und Materialliste öffnen.<br>3. Bibliothek → Generatoren → „Arena“: Vorlage „Kolosseum“ und „Provinzarena“ ausprobieren.<br>4. Das Kolosseum als .schem/.litematic exportieren und im Spiel aufstellen. | Neun Quartiere mit 30 Gebäuden ohne Voxelkonflikte, Abschnitte „Straßen & Plätze“ und „Phase 1–4“; Kolosseum 81 × 61 mit begehbaren Rängen, Treppen im Wandelgang und Toren zur Straße; im Spiel schwebt nichts. (Abnahme GEN-03-S05) |
| BIB-12 | Neue Gebäude im Spiel bauen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | vertieft | 1. Zwei bis drei neue Bibliotheksgebäude (z. B. ein Meisterstück, eine Untergrundhalle, ein Interieur) als .schem exportieren und im Spiel (Litematica oder Mod-Hologramm) aufstellen. | Nichts schwebt, Türen/Treppen/Laternen stehen richtig, Innenräume sind begehbar und eingerichtet. (Abnahme LIB-05-S08) |
| BIB-15 | Eigenes Bauwerk in die Bibliothek einreichen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | kern | 1. Eine eigene .litematic oder .schem importieren und als Bauteil speichern (oder ein Werkstatt-/Generatorbauteil nehmen).<br>2. Gebäudeblatt → „⇪ In Bibliothek einreichen“ → „Beitrag vorbereiten …“.<br>3. Name, Kategorie, Autor ausfüllen, Rechte bestätigen, „↓ Beitragspaket erstellen“.<br>4. Den Link „Formular ‚Bibliotheksbeitrag‘ auf GitHub öffnen“ ansehen (nicht absenden, wenn nur getestet wird). | Eine Datei „beitrag_….bauplaner-beitrag.json“ wird heruntergeladen; das Formular ist mit Name, Kennung und Autor vorausgefüllt; ohne Rechtebestätigung entsteht keine Datei; auf dem Handy ragt nichts seitlich heraus. (Abnahme LIB-06-S06) |
| BIB-16 | Eingereichtes Bauwerk ist fest in der Bibliothek ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek?q=beitrag)) | vertieft | 1. Nach der Übernahme eines Beitrags und dem Update der Seite: Bibliothek öffnen, nach „beitrag“ suchen.<br>2. Den Beitrag öffnen, in ein Projekt übernehmen und als .litematic exportieren.<br>3. In einem zweiten Browser (oder privaten Fenster) prüfen, dass er auch dort erscheint. | Der Beitrag steht mit „Bibliotheksbeitrag von …“, Bautipps und genau den eingereichten Blöcken in der Bibliothek, auch in einem frischen Browser; Export und Material funktionieren wie bei jedem Gebäude. (Abnahme LIB-06-S07) |
| BIB-17 | Zwei Stände eines Bauwerks vergleichen | vertieft | 1. Ein eigenes Bauteil in der Werkstatt öffnen, alles markieren und um ein paar Blöcke verschieben, eine Truhe oder ein Schild ändern, als neue Version speichern.<br>2. In der Bibliothek beim Bauteil unter „Bauversionen & Varianten“ die ältere mit der neuen Version vergleichen. | Der Vergleich meldet „ist verschoben“ mit dem richtigen Versatz statt aller Blöcke als geändert; die geänderte Truhe bzw. das Schild steht als Inhaltsänderung da. (Abnahme DIFF-01) |
| BIB-18 | Filter bleiben beim Seitenwechsel ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | vertieft | 1. Bibliothek filtern (Kategorie, Größe, Suchwort), auf Seite 2 blättern.<br>2. Ein Gebäude öffnen und mit „Zurück“ des Browsers zurückgehen. | Filter, Suchwort und Seite sind wie vorher; Vorschaubilder erscheinen ohne langes Nachladen. (Abnahme PERF-03) |

## PROJ · Projekt: Editor, Material, Bauen, Export (Planer)

Das Herzstück: Bauteile anordnen, Material planen, Bauanleitung und Export.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| PROJ-01 | Bauteile anordnen | kern | 1. Projekt mit 2–3 Bauteilen öffnen.<br>2. Bauteil verschieben, drehen, spiegeln; Mehrfachauswahl mit Umschalt.<br>3. Rückgängig/Wiederholen. | Bewegungen folgen der Maus/Tastatur; Überschneidungen werden rot gemeldet; Rückgängig stellt jeden Schritt wieder her. |
| PROJ-02 | Material | kern | 1. Tab „Material“ öffnen.<br>2. Bauitems und Rohstoffe ansehen, nach Bauteil filtern. | Mengen plausibel (Treppen, Stufen, Türen als Items gezählt); Rohstoffplanung zeigt Stapel und Kisten. |
| PROJ-03 | Bauanleitung und Baustelle | kern | 1. Tab „Baustelle“: Bauabschnitte anlegen.<br>2. Tab „Bauen“: Schritte abhaken, Druck-/Handyansicht öffnen. | Abschnitte und Fortschritt bleiben nach dem Neuladen; Druckansicht vollständig. |
| PROJ-04 | Export .schem und .litematic | kern | 1. Tab „Export“: Revision einfrieren und als .schem exportieren.<br>2. Dasselbe als .litematic.<br>3. Optional: Datei in Litematica/WorldEdit im Spiel laden. | Dateien laden herunter; im Spiel stimmt der Bau mit der Vorschau überein (Ausrichtung, Treppen, Türen). |
| PROJ-05 | 3D-Modelldatei | vertieft | 1. Tab „Export“ → „Modelldatei“: OBJ, GLB, STL oder 3MF erzeugen. | Fortschritt läuft, Abbrechen geht; Datei öffnet sich in einem 3D-Programm. |
| PROJ-06 | Blöcke, Gelände, Landschaft | vertieft | 1. Tab „Blöcke“: Blöcke ansehen/ersetzen.<br>2. Tab „Gelände“ und „Landschaft“: Gelände formen, bemalen, Wasser/Wege. | Änderungen sichtbar in 3D; Rückgängig funktioniert. |
| PROJ-07 | Updates von Bauteilen | vertieft | 1. Ein verwendetes Bauteil in der Werkstatt ändern.<br>2. Im Projekt Tab „Updates“ öffnen und die Vorschau ansehen. | Unterschiede werden gezeigt; Übernehmen ändert nur, was angezeigt wurde. |
| PROJ-08 | Großes Projekt | vertieft | 1. Ein Projekt mit vielen Gebäuden (z. B. Ensemble Burg) öffnen und durch alle Tabs gehen. | Seite bleibt bedienbar; lange Berechnungen zeigen Fortschritt statt einzufrieren. |
| PROJ-09 | Projektplanung: Meilensteine und Abhängigkeiten | kern | 1. Tab „Baustelle“: Vorschlag „Fundament · Rohbau · Dach“ übernehmen.<br>2. Tab „Planung“: Vorschläge aus Geometrie übernehmen, einen Meilenstein mit Termin anlegen und Abschnitte zuordnen.<br>3. Versuchen, eine Abhängigkeit „Fundament erst nach Dach“ anzulegen.<br>4. Neu laden (F5). | Zeitplan zeigt Balken je Abschnitt und wartende Abschnitte; der Meilenstein zeigt im Plan/verspätet und voraussichtliches Datum; der Kreis wird mit Meldung abgelehnt; alles bleibt nach dem Neuladen. Die Projektkarte zeigt den nächsten Meilenstein. |
| PROJ-10 | Mehrere Bauleute und Bauzettel | vertieft | 1. Tab „Planung“: zwei Bauleute mit verschiedenem Tempo anlegen, Abschnitte zuweisen (einen Abschnitt beiden).<br>2. Startdatum setzen, 5 Bautage je Woche wählen.<br>3. „Bauzettel kopieren“ und „Bauprogramm als Text“ ausführen. | Zeitplan zeigt je Bauleute eine Spur, gemeinsame Abschnitte sind kürzer; Daten überspringen das Wochenende; Bauzettel nennt die eigenen Abschnitte mit fehlenden Items und Sammelzeit. |
| PROJ-11 | Großprojekt mit Phasen planen | vertieft | 1. Ein Projekt aus Basisplaner oder Anlage anlegen (Abschnitte „Phase 1 …“).<br>2. Tab „Planung“ → „Meilensteine aus Abschnittsnamen“. | Je Phase ein Meilenstein, Wege/Platz als „Erschließung“ zuerst; jede Phase wartet auf die vorige; kritischer Pfad läuft durch alle Phasen. |
| PROJ-12 | Produktion: Farmen und Ernten | kern | 1. Tab „Produktion“: Bruchsteingenerator anlegen, auf „läuft“ stellen.<br>2. „Ernte & Details“: eine echte Ernte mit Menge und Arbeitszeit eintragen.<br>3. Tab „Baustelle“ öffnen, dann neu laden (F5).<br>4. Zurück im Tab „Produktion“ unter „Öfen und Brennstoff“ die Ofenzahl je Zielzeit und den Brennstoff ansehen. | Die Deckung zeigt Bruchstein „mit Farm“; nach der Ernte steht „gemessen“ an der Rate, die Menge steht im Baustellen-Lager und der Restbedarf sinkt; alles bleibt nach dem Neuladen. Öfen und Brennstoff passen zu den fehlenden Schmelzitems (10 s je Vorgang). |
| PROJ-13 | Produktion: Engpässe, Zeitplan, AFK-Platz | vertieft | 1. Projekt mit Abschnitten und Planung (Bauleute, Startdatum) öffnen, Tab „Produktion“.<br>2. Sammelzeit je Tag verkleinern; eine vorgeschlagene Farm „Als geplant anlegen“ und auf „läuft“ stellen.<br>3. Zwei automatischen Farmen einen Ort geben (oder Farmpunkte der Weltkarte übernehmen) und den AFK-Vorschlag übernehmen. | Engpass und „Material da nach“ ändern sich nachvollziehbar; Abschnitte mit Material nach Baubeginn sind markiert; Sammelaufträge verteilen die Handarbeit auf die Bauleute; der AFK-Platz nennt erreichte und verfehlte Farmen mit Grund. |
| PROJ-14 | Materialvarianten: Glas, Beton, Terrakotta, Kupfer | vertieft | 1. Ein Gebäude mit Glas, Beton, Terrakotta oder Kupfer öffnen (Bibliothek, Detailseite).<br>2. Unter „Bauversionen & Varianten → Materialvariante erzeugen“ eine Farbe bzw. bei Kupfer eine Oxidationsstufe und „gewachst“ wählen und speichern.<br>3. Variante in ein Projekt legen, als .litematic exportieren und im Spiel ansehen. | Nur das Material wechselt, Form und Ausrichtung bleiben; Kupfer zeigt die gewählte Stufe und bleibt gewachst im Spiel unverändert; Materialliste nennt die neuen Blöcke. (Abnahme MAT-03, MAT-04) |
| PROJ-15 | Rohstoffliste gegen das Spiel prüfen | vertieft | 1. Ein großes Projekt öffnen, Tab „Material“ → „Rohstoffe und Rezepte“.<br>2. Drei bis fünf Rezepte (z. B. Treppen, Platten, Glasscheiben, Laternen) mit dem Rezeptbuch bzw. REI im Spiel vergleichen. | Mengen und Zutaten stimmen mit Minecraft 26.3 überein (z. B. 6 Platten aus 3 Blöcken, 4 Treppen aus 6 Blöcken); Abweichungen bitte mit Rezeptname melden. (Abnahme MAT-02) |
| PROJ-16 | Planung: Basisplan und Verzug | kern | 1. Projekt mit Bauabschnitten, Tab „Planung“: Startdatum setzen, „Basisplan festhalten“.<br>2. Bauleute anlegen, alle Abschnitte zuweisen und „dabei an 25 % der Bautage“ wählen.<br>3. Neu laden (F5), dann „Basisplan verwerfen“. | Nach dem Festhalten steht „± 0“; mit 25 % zeigt die Karte „+N Bautage“, Meilensteine nennen „später als im Basisplan“ und im Zeitplan liegt unter den Balken eine Linie für den Basisplan; alles bleibt nach dem Neuladen; Verwerfen entfernt den Vergleich. |
| PROJ-17 | Planung wartet auf Material aus der Produktion | vertieft | 1. Projekt mit Abschnitten, Tab „Produktion“: Sammelzeit je Tag klein stellen (z. B. 0,5 h).<br>2. Tab „Planung“ → Einstellungen: „Abschnitte erst beginnen, wenn ihr Material da ist“ einschalten.<br>3. Im Tab „Produktion“ eine Farm auf „läuft“ stellen und zurück zur Planung. | Abschnitte, deren Material noch fehlt, beginnen später (schraffierter Teil vor dem Balken); die Karte „Material · aus Produktion“ nennt die Wartezeit; im Tab „Produktion“ steht „Die Planung wartet auf das Material“ statt „Material zu spät“; eine laufende Farm verkürzt die Wartezeit. |
| PROJ-18 | Startdatum in der Vergangenheit | vertieft | 1. In der Planung ein Startdatum vor zwei Wochen setzen, ein Abschnitt ist noch offen. | Die offene Arbeit beginnt am nächsten Bautag ab heute (nicht in der Vergangenheit); ein Hinweis unter dem Plan sagt das; Daten überspringen freie Wochentage. |
| PROJ-19 | Gelände und Wege: Rampe, Treppen, Brücke | vertieft | 1. Tab „Landschaft“: Gestaltung beginnen, mit „Rampe“ (M) eine Zufahrt zu einem höheren Platz legen, mit „Aufschütten“ (U) eine Mulde füllen.<br>2. Werkzeug „Weg“: Stufen „Treppen“, Belag Steinweg, einen Weg die Rampe hinauf legen; einen zweiten Weg mit „Über Wasser: Brücke mit Geländer“ über einen Bach legen (oder einen Weg aus der Weltkarte übernehmen).<br>3. „Als Bauteil ins Projekt übernehmen“, als .litematic exportieren und im Spiel ansehen. | Jeder Höhenwechsel des Wegs hat eine Treppe, die bergauf zeigt (über die ganze Breite); die Brücke liegt einen Block über dem Wasser, das Wasser bleibt, Zäune oder Mauern stehen an den Seiten und hängen zusammen; Materialliste zählt Treppen, Planken und Zäune. (Abnahme TERRAIN-03) |

## WERK · Werkstatt (Blockeditor) (Planer)

Eigene Bauteile Block für Block bauen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| WERK-01 | Blöcke setzen und entfernen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | kern | 1. Werkstatt → neues Bauteil.<br>2. Block wählen, in der Ebenenansicht setzen, entfernen, ersetzen und drehen.<br>3. Speichern. | Blöcke erscheinen an der Klickstelle, 3D zeigt dasselbe; gespeichertes Bauteil in der Bibliothek. |
| WERK-02 | Formen und Muster ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | kern | 1. Linie, Rechteck, Bogen, Pyramide, Kegel, Ellipsoid ausprobieren.<br>2. Musterpinsel mit mehreren Blöcken. | Formen haben die gewählten Maße; Muster verteilt die Blöcke wie eingestellt. |
| WERK-03 | Auswahlwerkzeuge ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | vertieft | 1. Zauberauswahl, Stapeln, Extrudieren, Auswahl verschieben/drehen. | Nur die Auswahl ändert sich; Ausstattung (Gemälde, Rahmen) zieht mit. |
| WERK-04 | Kreativwerkzeuge ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | vertieft | 1. Symmetrie, Kurven, Naturwerkzeuge (Baum, Fels), Farbpaletten, Bild → Blöcke. | Ergebnisse sehen wie in der Vorschau aus; Bild → Blöcke nimmt passende Farben. |
| WERK-05 | Tastenkürzel und Rückgängig ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | kern | 1. Tastenkürzel-Übersicht öffnen, einige Kürzel testen.<br>2. Viele Schritte rückgängig machen und wiederholen. | Kürzel tun, was angezeigt wird; kein Schritt geht verloren. |
| WERK-07 | Großes Modell bearbeiten (SIZE-01) ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | vertieft | 1. Ein großes Bauteil (über 500 000 Zellen, z. B. aus DATEI-05) in der Werkstatt öffnen.<br>2. Einen großen Bereich füllen (mehrere 100 000 Zellen), rückgängig machen, wiederholen, speichern. | Hinweis „Großes Modell“ bzw. „Sehr großes Modell“ unter der Werkzeugleiste, aber keine Sperre; Füllen und Rückgängig dauern Sekunden, nicht Minuten; gespeichert ist alles. |
| WERK-08 | Direkt im 3D-Bild bauen (EDIT-06) ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | kern | 1. Werkstatt → neues Bauteil, einen Block setzen; „Im 3D bauen“ ist an.<br>2. Im 3D-Bild auf Blockflächen klicken (Setzen), mit „Abbauen“ entfernen, mit Quader auf einer Oberseite einen Boden und an einer Seitenfläche eine Wand aufziehen.<br>3. Shift+Ziehen wählt eine Gruppe; mit dem Auswahl-Werkzeug die Gruppe im 3D-Bild verschieben.<br>4. Rechte Maustaste dreht die Ansicht; auf dem iPad mit einem Finger bauen, mit zwei Fingern zoomen. | Blöcke landen vor der angeklickten Fläche, die Vorschau zeigt vorher, was entsteht; Wände stehen senkrecht; die Gruppe zieht samt Inhalt mit und ein Rückgängig stellt sie zurück. |
| WERK-09 | Truhen- und Schildinhalte im Spiel (EDIT-06) ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | vertieft | 1. Eine Truhe mit Gegenständen und Namen und ein Schild mit Text auf beiden Seiten in der Werkstatt anlegen, speichern.<br>2. Als .litematic oder .schem exportieren und im Spiel aufstellen. | Die Truhe enthält im Spiel dieselben Gegenstände auf denselben Plätzen und trägt den Namen; das Schild zeigt beide Seiten, Farbe und Leuchten wie geplant. |
| WERK-06 | Gestapelte und gedrehte Bauteile im Spiel ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | vertieft | 1. Ein Bauteil mit Ausstattung (Gemälde, Rahmen) stapeln, extrudieren und drehen, speichern.<br>2. Als .schem exportieren und im Spiel aufstellen. | Ausstattung hängt im Spiel an derselben Wand wie in der Werkstatt; gestapelte Teile sitzen lückenlos. (Abnahme EDIT-05-S07) |

## DATEI · Betrachter und Import (Planer)

Fremde .schem- und .litematic-Dateien öffnen und als Bauteil übernehmen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| DATEI-01 | Datei ansehen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/betrachter)) | kern | 1. Betrachter öffnen und eine .schem oder .litematic laden. | Bau erscheint in 3D, Kamera zeigt ihn ganz; Blockliste und Maße plausibel. |
| DATEI-02 | Import in die Bibliothek ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | kern | 1. In der Bibliothek eine Datei importieren.<br>2. Importbericht lesen und speichern. | Unbekannte Blöcke werden genannt, nicht verschluckt; Bauteil erscheint mit Vorschaubild. |
| DATEI-03 | Große Datei ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | vertieft | 1. Eine große Datei (über 200 000 Blöcke) importieren, einmal abbrechen, dann ganz laden. | Fortschritt und Abbrechen funktionieren, Seite bleibt bedienbar. |
| DATEI-04 | Licht, Nacht, Schatten | vertieft | 1. Im 3D-Betrachter Licht/Nacht/Sonne umschalten, Spawnprüfung ansehen. | Dunkle Stellen werden als Spawnflächen markiert, Ansicht bleibt flüssig. |
| DATEI-05 | Große Datei (SIZE-01) ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | kern | 1. Eine große .schem oder .litematic öffnen (über 250 000 Zellen Box, gern über 1 Mio. Blöcke, bis 64 MB).<br>2. Als Bauteil übernehmen und in ein Projekt legen. | Import läuft mit Fortschritt durch, ohne „Bauvolumen überschreitet“; der Bericht sagt, dass nur Blöcke übernommen sind und die Luft unausgewählt bleibt. Über 4 Mio. Blöcke oder 16,7 Mio. Zellen Box: klare Meldung mit dem Rat, die Datei zu teilen. |
| DATEI-06 | Ältere Datei: Profilprüfung | vertieft | 1. Eine ältere .schem oder .litematic (z. B. aus 1.20 oder 1.21) importieren.<br>2. Detailseite öffnen, unter „Bauen & Technik“ die Zeile „Profilprüfung“ ansehen. | Die Zeile nennt die Datenversion und ob die Datei zu Java 26.3 passt; unbekannte oder umbenannte Blöcke stehen in der aufklappbaren Liste. (Abnahme PROFILE-01) |
| DATEI-07 | Gedrehtes Bauteil mit Truhen, Schildern, Gemälden | vertieft | 1. Ein Bauteil mit gefüllter Truhe, beschriftetem Schild und Gemälde/Rahmen in ein Projekt legen und um 90° drehen (oder spiegeln).<br>2. Als .schem und .litematic exportieren und im Spiel mit WorldEdit bzw. Litematica einfügen. | Truhe behält ihren Inhalt, Schildtext steht auf der richtigen Seite, Doppeltruhen und Gemälde zeigen in die gedrehte Richtung. (Abnahme NBT-01, ENTITY-01) |
| DATEI-08 | Datei aus WorldEdit und Litematica | vertieft | 1. Im Spiel mit WorldEdit (//copy, //schem save) und mit Litematica je ein Bauwerk speichern.<br>2. Beide Dateien im Planer öffnen, als Bauteil übernehmen und wieder exportieren; die Exporte im Spiel laden.<br>3. Die Originaldatei gern an Philipp schicken (ohne private Welt), damit sie mit dem Prüfwerkzeug verglichen wird. | Beide Dateien öffnen mit allen Blöcken, Zuständen und Inhalten; die Exporte sitzen im Spiel an derselben Stelle (Offset) wie das Original. (Abnahme FORMAT-01, FORMAT-02) |
| DATEI-09 | Biom, Leuchtfeuer, große Szene (GFX-02) | vertieft | 1. Im 3D-Betrachter unter „☀ Tag“ das Biom wechseln (z. B. Sumpf, Kirschblütenhain).<br>2. Ein Leuchtfeuer auf eine 3×3-Pyramide aus Eisenblöcken setzen, gefärbtes Glas darüber, einmal einen Stein darüber.<br>3. Eine große Datei (über 500 000 Blöcke) öffnen und beim Laden schon drehen. | Gras, Laub und Wasser färben sich sofort ohne Neuberechnung; der Strahl leuchtet in der Glasfarbe und verschwindet unter dem Stein; nahe Teile erscheinen zuerst, die Ansicht bleibt bedienbar. |

## KARTE · Weltkarte, Weltbuilder und Weltimport (Planer)

Projekte in der Welt platzieren, Wege und Bauplätze planen, Gelände aus der eigenen Welt übernehmen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| KARTE-01 | Projekte auf der Karte ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | kern | 1. Weltkarte öffnen, Projekt platzieren, verschieben, drehen. | Lage bleibt nach dem Neuladen; Koordinaten stimmen mit dem Projekt überein. |
| KARTE-02 | Weltbuilder: Löschen und Rückgängig ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | kern | 1. Bauplatz, Weg und Punkt anlegen.<br>2. Mehrfachauswahl (Rahmen, Taste A), Kontextmenü (Rechtsklick), Löschen mit Entf.<br>3. Strg+Z / Strg+Y. | Alles lässt sich löschen; ein Rückgängig bringt die ganze Löschung zurück. |
| KARTE-03 | Duplizieren, Drehen, Ebenen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. Objekte duplizieren, drehen/spiegeln, Wegecken ziehen, Ebenen ein-/ausblenden. | Ergebnis wie erwartet, Objektliste stimmt mit der Karte überein. |
| KARTE-04 | Weltimport aus Regionsdateien ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/welt)) | vertieft | 1. Weltimport öffnen, Regionsdateien (.mca) der eigenen Welt wählen, Bereich auswählen, übernehmen. | Ausschnitt erscheint als Bauteil; Gelände-Reiter im Projekt kann ihn nutzen. |
| KARTE-05 | Zonen und benannte Ebenen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | kern | 1. Werkzeug „Zone“ (Taste Z), drei oder mehr Ecken klicken, Eingabe beendet; Art (Wohnen, Farmen, …) und Farbe setzen.<br>2. Zone und einen Punkt wählen, in der Auswahlleiste „Ebene zuweisen“ → „Neue Ebene …“ (z. B. „Phase 2“).<br>3. Die neue Ebene unter „Benannt:“ ausblenden, wieder einblenden; in der Objektliste nach der Ebene filtern.<br>4. Seite neu laden. | Zone liegt als gefüllte Fläche mit Namen und Fläche (Blöcke²) auf der Karte; ausgeblendete Ebenen verschwinden samt Auswahl; nach dem Neuladen sind Zone, Ebene und Farbe noch da. |
| KARTE-06 | Messen, Höhenprofil, Route übers Gelände ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. Messen (M): drei Punkte klicken, Eingabe beendet, Escape löscht.<br>2. Gelände laden („Gelände um mich lesen“ mit Mod oder eine Geländeaufnahme), einen Weg über einen Hang zeichnen.<br>3. Im Bearbeitungsfeld des Wegs „⤳ Route übers Gelände“. | Messung nennt Luftlinie, Weg zu Fuß, Punkte, Nether-Entfernung und bei drei oder mehr Punkten die Fläche. Das Höhenprofil zeigt Y-Bereich, Auf-/Abstieg und Stufen; die Route weicht Wasser und Steilstufen aus (oder meldet, dass es keinen Weg gibt). |

## SYS · Systemcheck und Stabilität (Planer)

Prüft, ob die Seite richtig ausgeliefert ist und die gespeicherten Daten stimmen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| SYS-01 | Systemcheck ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/system)) | kern | 1. Systemcheck öffnen, „Geladene Dateien prüfen“ und „Datencheck starten“. | Alle Dateien stimmen, Datencheck ohne Fehler (oder verständliche Befunde). |
| SYS-02 | Fehler melden ausprobieren ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/testphase?melden)) | kern | 1. Unter „Testphase → Fehler melden“ einen Probebericht ausfüllen, kopieren und als Datei speichern (nicht abschicken). | Bericht enthält Build, Browser, Grafik und Protokoll, aber keine Projektdaten. |
| SYS-03 | Alte Browserdaten übernehmen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/system)) | vertieft | 1. Auf einem Gerät, auf dem der Planer schon länger benutzt wird, die Seite neu laden.<br>2. #/system → „Datencheck“ ausführen; ein altes Projekt und ein eigenes Bauteil öffnen. | Alle Projekte, eigenen Bauteile, Sammlungen und Sicherungen sind da; der Datencheck meldet keine Fehler. (Abnahme ARCH-02-S05) |

## GERAET · Geräte und Browser (Planer)

Dieselben kurzen Aufgaben auf jedem echten Gerät (Geräte- und Browsermatrix QA-02, docs/testing/GERAETEMATRIX.md). Im Testprotokoll beim Namen das Gerät dazuschreiben (z. B. „Anna · Pixel 8“); Browser und System trägt die Seite selbst ein. Eine verkleinerte Desktop-Ansicht zählt nicht als Handy-Test.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| GERAET-01 | Gerät festhalten ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/system)) | kern | 1. Systemcheck öffnen und Browser, System und Grafik ablesen.<br>2. Im Testprotokoll beim Namen das Gerät dazuschreiben. | Systemcheck nennt Browser und Grafik; das kopierte Protokoll enthält Gerät, Browser und System, damit jeder Befund einer Zeile der Matrix zugeordnet werden kann. |
| GERAET-02 | Datei öffnen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/betrachter)) | kern | 1. Betrachter öffnen, „Schem / Litematic / JSON öffnen“.<br>2. Eine .schem oder .litematic vom Gerät wählen (auf dem Handy aus „Dateien“/„Downloads“). | Dateiauswahl öffnet sich, das Bauwerk erscheint mit Blockzahl und Maßen; keine Fehlermeldung. |
| GERAET-03 | Daten bleiben gespeichert ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | kern | 1. Ein Projekt anlegen und ein Gebäude hinzufügen.<br>2. Browser ganz schließen (auf dem Handy aus den offenen Apps wischen), wieder öffnen. | Projekt und Gebäude sind noch da. In der Projektzentrale steht beim Speicher „vor Löschen geschützt“ oder ein Knopf „Dauerhaft speichern anfragen“. Im privaten Fenster darf das Projekt nach dem Schließen fehlen. |
| GERAET-04 | Bedienen mit dem Finger ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | kern | 1. Ein Gebäude in 3D öffnen: mit einem Finger drehen, mit zwei Fingern zoomen.<br>2. Ebenenansicht: Ebene mit dem Schieber wechseln.<br>3. Weltkarte: lange auf ein Objekt drücken. | Drehen und Zoomen folgen dem Finger, die Seite scrollt dabei nicht mit; der Schieber trifft jede Ebene; langes Drücken öffnet das Kontextmenü. |
| GERAET-05 | Farbschema des Geräts | vertieft | 1. Im Planer „automatisch“ wählen.<br>2. Am Gerät zwischen hellem und dunklem Modus wechseln, dann hell und dunkel fest wählen. | Die Seite folgt dem Gerät bei „automatisch“; in jedem Schema sind Texte, Knöpfe und 3D-Hintergrund lesbar. |
| GERAET-06 | Ebenen und Druck ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | vertieft | 1. Gebäude öffnen, Reiter „Ebenen“, „Alle Ebenen“.<br>2. „⎙ Drucken“ wählen und die Druckvorschau ansehen. | Alle Ebenen erscheinen als kleine Pläne; die Druckvorschau zeigt die Pläne ohne abgeschnittene Ränder. |

## TEAMBAU · Gemeinsam bauen (Team) (Planer)

Mehrere Spieler an einem Projekt: Reiter „Team“ im Planer und Teambefehle des Paper-Plugins. Für den Austausch zwei Browser oder zwei Rechner nehmen (z. B. normales und privates Fenster).

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| TEAMBAU-01 | Team gründen und Plan freigeben | kern | 1. Projekt mit Bauabschnitten öffnen (Reiter „Baustelle“ → Vorschlag „Fundament · Rohbau · Dach“).<br>2. Reiter „Team“: Name und Minecraft-Name eintragen, „Team gründen“.<br>3. „Aktuellen Plan freigeben“, kurze Beschreibung eingeben. | Du bist Bauleitung; oben steht „Planstand N gilt“; im Reiter „Export“ gibt es die neue Revision. |
| TEAMBAU-02 | Mitspieler einladen | kern | 1. „Teampaket mit Plan“ herunterladen und im zweiten Browser auf der Startseite „Teampaket öffnen“.<br>2. Dort „Ich bin neu“ mit Namen und Minecraft-Namen, „Beitreten“. | Das Projekt erscheint mit allen Bauteilen und Abschnitten; der Mitspieler ist Helfer und sieht denselben Planstand. |
| TEAMBAU-03 | Abschnitt übernehmen, melden, bestätigen | kern | 1. Im zweiten Browser einen freien Abschnitt „Übernehmen“, dann unter „Meine Aufgaben“ „Fertig melden“.<br>2. „Meldecode kopieren“ und den Code im ersten Browser unter „Einlesen“ einfügen, „Prüfen“, „Übernehmen“.<br>3. Im ersten Browser „✓ Bestätigen“. | Vorschau nennt die neuen Ereignisse; danach steht der Abschnitt auf „fertig gemeldet“ bzw. „bestätigt“ mit dem richtigen Namen. Strg+Z nimmt das Einlesen zurück. |
| TEAMBAU-04 | Gleichzeitig denselben Abschnitt nehmen | vertieft | 1. Beide Browser übernehmen denselben freien Abschnitt, ohne vorher auszutauschen.<br>2. Meldecodes in beide Richtungen einlesen. | In beiden Browsern gehört der Abschnitt derselben Person (wer zuerst war); oben erscheint ein Hinweis „… wollte übernehmen, war schon vergeben“. Nichts geht verloren. |
| TEAMBAU-05 | Beiträge, Sammelaufträge, Notizen | vertieft | 1. Gebaute Blöcke und eine Lieferung melden, einen Sammelauftrag übernehmen, eine Notiz mit @Name schreiben.<br>2. Austauschen und „Statustext für Discord“ ansehen. | Mitgliederliste zählt Blöcke/Items; die erwähnte Person sieht die Notiz unter „Meine Aufgaben“; der Statustext listet Abschnitte, Sammelaufträge und offene Notizen. |
| TEAMBAU-06 | Team auf dem Paper-Server | vertieft | 1. Projekt auf der Weltkarte platzieren, im Reiter „Team“ „Serverdatei herunterladen“.<br>2. Datei nach plugins/BauplanerBridge/team/ legen, im Spiel `/bauplaner team laden` (als OP).<br>3. Als Mitspieler `/bauplaner team`, `/bauplaner nehmen 2`, im Abschnitt stehen, `/bauplaner zeigen 2`, `/bauplaner fertig`, `/bauplaner notiz frage …`.<br>4. `/bauplaner team export` und die Datei im Planer unter „Einlesen“ wählen. | Im Spiel: Aktionsleiste „Abschnitt 2 · … · in Arbeit“, Partikelumriss, verständliche Antworten, Hinweis beim Bauen im fremden Abschnitt. Im Planer kommen die Meldungen mit „vom Server“ an. |
| TEAMBAU-07 | Baunachweis auf dem Server | vertieft | 1. Mit zwei Spielern in Abschnitten des Teams Blöcke setzen und abbauen (einer innerhalb, einer außerhalb der Abschnitte).<br>2. `/bauplaner beitrag` und als Baumeister `/bauplaner beitrag alle`.<br>3. Ein Spieler: `/bauplaner nachweis aus`, dann wieder `beitrag alle`.<br>4. `/bauplaner team export` und im Planer einlesen, Bereich „Baunachweis & Lager“ ansehen. | Gezählt wird nur in Teamabschnitten; je Abschnitt stimmen die Anteile; nach „nachweis aus“ verschwinden die Zahlen dieses Spielers überall (auch frühere); der Planer zeigt dieselben Zahlen wie der Server. |
| TEAMBAU-08 | Lagerkiste des Teams | vertieft | 1. Als Baumeister auf eine Kiste schauen: `/bauplaner lager setzen Hauptlager`.<br>2. Als anderer Spieler etwas hineinlegen und die Kiste schließen, später etwas herausnehmen (auch eine gefüllte Shulkerkiste einlegen).<br>3. `/bauplaner lager`; Ausfuhr im Planer einlesen, „Bestand ins Baustellen-Lager übernehmen“. | Beim Schließen meldet die Aktionsleiste „+64 stone“ bzw. „-32 …“; der Inhalt der Shulkerkiste wird mitgezählt; im Planer stehen Bestand, „ins Lager“ und „entnommen“ beim richtigen Spieler; das Lager im Reiter „Baustelle“ übernimmt die Mengen (Strg+Z möglich). |
| TEAMBAU-09 | Teambau im Spiel über den Plugin-Kanal (ab Mod 0.10.0) | vertieft | 1. Mod ab 0.10.0 installieren (aktuell 0.14.0; ohne Plugin auf dem Server stattdessen LINK-07), im Planer Reiter „Team“ „Ich bin“ wählen, im Menü „Spiel“ koppeln, Plan ins Spiel schicken.<br>2. Im Reiter „Team“ unter „Mit Spiel abgleichen“ „Jetzt abgleichen“.<br>3. Im Spiel `/bauplaner team abschnitte`, `/bauplaner team nehmen 2`, `/bauplaner team mein`, `/bauplaner team material`, `/bauplaner team notiz frage Treppe?`.<br>4. Auf dem Server mit Plugin: `/bauplaner team erlauben`, dann `/bauplaner team status`; im Planer „Meldungen vom Server holen“. | Abschnitte erscheinen als Rahmen in der Farbe ihres Inhabers, das HUD zeigt „Mein Auftrag … %“; nur der eigene Abschnitt ist eingeblendet. Beim nächsten Abgleich zeigt die Website die Meldungen aus dem Spiel zur Übernahme. Ohne `erlauben` sendet die Mod nichts an den Server (Status „Plugin da – /bauplaner team erlauben“); mit Erlaubnis steht „live“ und Meldungen anderer Spieler kommen an. |
| TEAMBAU-21 | Großen Abschnitt in Arbeitspakete teilen und verteilen | kern | 1. Reiter „Team“ → „Planung“: unter „Arbeitspakete“ den größten Abschnitt wählen, „Teilen in 3 Pakete“, Art „automatisch“.<br>2. Vorschau prüfen, „In 3 Pakete teilen“.<br>3. Unter „Zuteilung“ die Mitspieler anhaken und „Zuweisungen übernehmen“. | Drei Pakete „… · Teil 1/3“ ersetzen den Abschnitt an derselben Stelle (Strg+Z nimmt es zurück); der Vorschlag verteilt nach offener Arbeit, Pakete übereinander bleiben möglichst bei einer Person; Abwesende bekommen nichts. |
| TEAMBAU-22 | Zeitplan und Material je Spieler | vertieft | 1. „Planung“ → „Zeitplan“: Bautage je Woche einstellen.<br>2. „Material im Team“: bei einem Item „Ich sammle“, bei einem Mitglied „Packliste kopieren“. | Balken je Mitglied, Wartezeiten auf Vorarbeit und die entscheidende Kette sind sichtbar; „Fertig in … Bautagen“ ist kleiner als „allein“. Das Item zählt danach unter „wird gesammelt“; die Packliste nennt Stacks und Shulkerkisten. |
| TEAMBAU-23 | Fortschritt, Achtung und Planänderung | vertieft | 1. „Fortschritt“ öffnen, einen Abschnitt im zweiten Browser fertig melden und austauschen.<br>2. Plan im Editor ändern, „Mit Planstand N vergleichen“. | Brett nach Status, je Mitglied abgehakt/gemeldet/bestätigt getrennt; unter „Achtung“ erscheinen gemeldete Abschnitte mit Haken-Lücke oder Planänderung mit Knopf „Bestätigen“ bzw. „Nacharbeit verlangen“. |
| TEAMBAU-24 | Übergabe, Abwesenheit, Bauleitung übergeben | kern | 1. „Rechte & Übergabe“: eigenen Abschnitt „übergeben an …“ wählen; im anderen Browser nach Austausch „Annehmen“.<br>2. Abwesenheit mit Datum eintragen und austauschen.<br>3. Als Bauleitung „Bauleitung übergeben“. | Bis zur Annahme bleibt der Abschnitt beim alten Inhaber; danach wechselt er mit Notiz. Abwesende erscheinen unter „Achtung“ und im Zeitplan erst nach Rückkehr. Nach der Übergabe ist man Baumeister; es bleibt immer eine Bauleitung. |
| TEAMBAU-25 | Team live ohne Dateien ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | kern | 1. Reiter „Team“ → „Team live“: Die Adresse des Team-Raums ist vorausgefüllt (https://bauplaner-team.team-room.workers.dev). „Live schalten“, Einladungslink an einen Mitspieler schicken.<br>2. Mitspieler öffnet den Link auf seinem Rechner oder Handy, „Beitreten und Plan laden“, wählt „Ich bin“ und übernimmt einen Abschnitt.<br>3. Bauleitung gibt einen neuen Planstand frei; Mitspieler klickt „Planstand übernehmen“. Danach WLAN kurz aus, eine Notiz schreiben, WLAN wieder an.<br>4. Spiel dazu: mit Mod 0.14.0 im Planer „Mein Spiel verbinden“ (ohne Plugin, siehe LINK-07) oder auf einem Server mit Plugin `/bauplaner team verbinden <Link für den Server>`; ein paar Blöcke setzen. | Ohne jede Datei sieht jeder die Schritte der anderen nach wenigen Sekunden; unter „Gerade da“ stehen beide (und der Server); der neue Planstand kommt mit einem Klick an, der alte bleibt als Kopie; offline zeigt der Status „offline · 1 warten“ und holt die Notiz nach dem Verbinden nach; Messungen des Servers (mit Plugin) erscheinen im Baunachweis; ohne Plugin kommen Abschnittsschritte aus dem Spiel über die Mod an. |
| TEAMBAU-26 | Team live im Alltag: Meldungen, Anwesenheit, Einladung erneuern | vertieft | 1. Team live wie in TEAMBAU-25, zwei Rechner (oder Rechner und Handy).<br>2. Mitspieler übernimmt einen Abschnitt und meldet ihn; Bauleitung ist dabei in einem anderen Reiter (z. B. „Material“).<br>3. Mitspieler lädt die Seite neu (Nachholen).<br>4. Bauleitung: „Einladung erneuern“; ein dritter Browser versucht es mit dem alten Link. | Die Meldung erscheint bei der Bauleitung in jedem Reiter, mit Name und Abschnitt in der Anwesenheit; nach dem Neuladen kommen keine alten Meldungen erneut; mit dem alten Link kommt niemand mehr in den Raum, abgelehnte Meldungen sind sichtbar. (Abnahme COOP-09) |
| TEAMBAU-27 | Baustand laut Spiel ohne Plugin | vertieft | 1. Team live mit Mod ab 0.15.0, Server ohne Bauplaner-Plugin.<br>2. Mitspieler baut im eigenen Abschnitt ein paar Minuten und öffnet und schließt eine markierte Teamkiste.<br>3. Bauleitung öffnet Reiter „Team“ → „Baunachweis & Lager“. | Beim Abschnitt steht „laut Spiel … % … ungeprüft“ mit fehlenden Blöcken, bei der Kiste der gesehene Inhalt; die geprüften Serverzahlen bleiben davon unberührt. (Abnahme COOP-10) |

## LAGER · Server: geprüfte Lagerkisten (Server)

Lagerkisten des Teams im Paper-Plugin (COOP-05): markieren, zählen, prüfen, schützen, Buchungen und Bedarf. Braucht einen Paper-Server mit dem Plugin (1.18.2 bis 26.3), die Serverdatei eines Teams und zwei Spieler: einer mit OP oder Rolle Baumeister, einer als Helfer. Die Mod wird dafür nicht gebraucht. Bei jedem Fehler die Ausgabe von `/bauplaner lager info` und die Serverlog-Zeilen mit „BauplanerBridge“ anhängen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| LAGER-01 | Plugin installieren und Lager markieren ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/mod)) | kern | 1. Auf der Seite „Spiel“ die Paper-Jar laden und nach plugins/ legen, alte bauplaner-bridge-paper-*.jar löschen, Server neu starten.<br>2. Serverdatei des Teams nach plugins/BauplanerBridge/team/ legen, `/bauplaner team laden`.<br>3. Als Baumeister eine Kiste in einem Abschnitt aufstellen, daraufschauen und `/bauplaner lager markieren Steinlager`. | Antwort „Lager „Steinlager“ markiert“, „Zugeordnet: Abschnitt …“ und „erstmals gezählt“. `/bauplaner lager liste` zeigt das Lager als „geprüft“. |
| LAGER-02 | Einlegen und entnehmen wird gebucht | kern | 1. Als Helfer die Kiste öffnen: Aktionsleiste lesen.<br>2. 64 Stein hineinlegen, 10 wieder herausnehmen, Kiste schließen.<br>3. `/bauplaner lager verlauf` (auf die Kiste schauen). | Die Aktionsleiste nennt Lager, Abschnitt, Status und „du darfst einlegen und entnehmen“. Nach dem Schließen: „Gebucht im Lager … +54 stone“. Der Verlauf zeigt die Buchung mit deinem Namen. |
| LAGER-03 | Schutzstufen | kern | 1. Als Baumeister `/bauplaner lager schutz abschnitt` auf die Kiste.<br>2. Als Helfer ohne den Abschnitt: etwas herausnehmen (auch Umschalt-Klick und Doppelklick), dann etwas hineinlegen.<br>3. Als Baumeister `/bauplaner lager schutz gesperrt`; als Helfer wieder hineinlegen. | Bei „abschnitt“ wird das Herausnehmen verhindert (Hinweis im Chat), Hineinlegen geht. Bei „gesperrt“ geht beides nicht. Kein Item verschwindet oder verdoppelt sich. |
| LAGER-04 | Abbauen, Trichter, Explosion | kern | 1. Als Helfer versuchen, das Lager abzubauen.<br>2. Einen Trichter unter das Lager setzen; einen Trichter mit Items darüber.<br>3. Neben dem Lager TNT zünden (Testwelt!). | Abbauen wird verhindert („darf nur ein Baumeister abbauen“). Der untere Trichter zieht nichts heraus, der obere füllt ein (Verlauf: „Trichter: +…“). Das Lager übersteht die Explosion samt Inhalt. |
| LAGER-05 | Abweichung erkennen und siegeln | kern | 1. Mit einem anderen Plugin, `/item replace` oder im Kreativmodus per Mittelklick-Kopie den Inhalt ändern, ohne die Kiste zu öffnen (z. B. `/item replace block <x y z> container.0 with dirt 5`).<br>2. Als Baumeister die Kiste öffnen oder `/bauplaner lager pruefen`.<br>3. `/bauplaner lager siegeln Aufgeräumt`. | Beim Prüfen: „abweichend – +5 dirt“, Baumeister bekommen eine Meldung (auch beim nächsten Betreten des Servers). Nach dem Siegeln ist das Lager wieder „geprüft“; `/bauplaner lager info` nennt, wer gesiegelt hat. |
| LAGER-06 | Doppelkiste und Shulkerkisten | vertieft | 1. An ein markiertes Lager eine zweite Kiste anbauen (als Baumeister; als Helfer versuchen).<br>2. Eine gefüllte Shulkerkiste hineinlegen, schließen, `/bauplaner lager info`. | Helfer können nicht anbauen; beim Baumeister gehören beide Hälften zum Lager. Der Inhalt der Shulkerkiste wird mitgezählt. |
| LAGER-07 | Bedarf und Sammelaufträge | vertieft | 1. Serverdatei mit Materialbedarf (aktueller Planer) laden.<br>2. `/bauplaner lager bedarf 1` und `/bauplaner lager bedarf`.<br>3. `/bauplaner sammle stone` ohne Menge. | Liste je Material: Bedarf, im Lager, fehlt (rot) oder ✓. „sammle“ ohne Menge übernimmt genau die fehlende Menge abzüglich dessen, was andere schon sammeln. |
| LAGER-08 | Neustart und Planer ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | vertieft | 1. Server neu starten; `/bauplaner lager liste`.<br>2. `/bauplaner team export`, die Datei im Planer im Reiter „Team“ unter „Einlesen“ wählen.<br>3. Bereich „Baunachweis & Lager“ ansehen. | Nach dem Neustart sind alle Lager mit Status da. Im Planer erscheint jedes Lager mit Status, Abschnitt, Schutz, offener Abweichung, Siegel und den Buchungen je Spieler und Trichter. |
| LAGER-09 | Einstellung „hinweis“ | vertieft | 1. In plugins/BauplanerBridge/config.yml `lager: modus: hinweis` setzen, Server neu starten.<br>2. Als Helfer aus einem „gesperrt“-Lager etwas nehmen. | Die Entnahme geht, wird aber gebucht; Hinweis an den Spieler und eine Meldung an Baumeister. |
| LAGER-10 | Ertragskiste einer Farm | vertieft | 1. Im Planer im Reiter „Produktion“ eine Farm anlegen, Planstand an den Server (Team live oder Serverdatei).<br>2. Auf die Sammeltruhe der Farm schauen: `/bauplaner lager markieren`, dann `/bauplaner lager farm <Farmname>`.<br>3. Farm eine Weile laufen lassen (oder Items von Hand einlegen), dann `/bauplaner lager info`.<br>4. Nach 30 Minuten (config `lager.ertrag-minuten`) im Planer Reiter „Team“ und „Produktion“ ansehen. | Info zeigt „Ertragskiste der Farm …: N Items in M min geladen“ und ab 10 min die Rate je Stunde. Entnahmen zählen nicht als Ertrag, Trichterbuchungen erscheinen höchstens einmal je Minute. Im Planer steht die gemessene Rate der Farm (Quelle „Lagerkiste (Server)“). |

## MOD · Mod: Installation und Hologramm (Mod)

Die Bauplaner-Mod im Spiel (Fabric oder NeoForge, Minecraft 26.3). Nur Client – auf dem Server muss nichts installiert werden. Bei jedem Fehler im Spiel `/bauplaner diagnose` eingeben und den Bericht anhängen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| MOD-01 | Installation ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/mod)) | kern | 1. Auf der Seite „Spiel“ die passende .jar laden (Loader und Version wählen).<br>2. Alte bauplaner-bridge-*.jar aus dem mods-Ordner löschen, neue hineinlegen (Fabric: Fabric API nötig).<br>3. Spiel starten. | Spiel startet ohne Absturz; `/bauplaner` wird im Chat vervollständigt. |
| MOD-02 | Plan einblenden | kern | 1. Im Planer ein Projekt als .schem exportieren und nach <Instanz>/bauplaner/plans/ kopieren.<br>2. Im Spiel auf einen Block schauen, J drücken, Plan anklicken. | Hologramm erscheint am angeschauten Block: fehlende Blöcke durchscheinend, rechts der Fortschritt. |
| MOD-03 | Ausrichten | kern | 1. Pfeiltasten, Bild↑/↓, Ende (drehen), Einfg (spiegeln), Pos1 (zum angeschauten Block). | Hologramm bewegt sich wie erwartet; Lage bleibt nach Neustart der Welt erhalten. |
| MOD-04 | Bauen und Fehlerfinder | kern | 1. Einige Blöcke richtig, einen falsch und einen falsch herum setzen.<br>2. Punkt (.) drücken. | Richtige Blöcke verschwinden aus dem Hologramm, falsche rot, falsch ausgerichtete gelb; Punkt zeigt den nächsten Fehler. |
| MOD-05 | Materialliste | kern | 1. Num 7 oder `/bauplaner material`. | Liste zeigt offen / im Inventar (auch Shulkerkisten) / noch holen. |
| MOD-06 | Ebenen und Bauabschnitte | vertieft | 1. Num 6 (Ebenenmodus), Num 9 / Num * (Ebene hoch/runter).<br>2. Plan mit Bauabschnitten: Num / oder `/bauplaner abschnitt`. | Hologramm, Fortschritt und Material gelten nur für die gewählte Ebene bzw. den Abschnitt. |
| MOD-07 | Platzierhilfe | vertieft | 1. Im Menü J die Platzierhilfe auf „an“, „warnen“, „aus“ stellen und jeweils einen falschen Block setzen. | „an“ verhindert falsche Blöcke, „warnen“ zeigt nur einen Hinweis, „aus“ tut nichts. |
| MOD-08 | Röntgensicht und Texturen | vertieft | 1. Num - (Röntgensicht), `/bauplaner texturen`. | Fehlende Blöcke durch Wände sichtbar; ohne Texturen farbige Kästen. |
| MOD-09 | Mit Shadern und Modpack | vertieft | 1. Mit Iris/Shaderpaket und dem eigenen Modpack spielen. | Hologramm bleibt sichtbar (blau getönt); `/bauplaner diagnose` meldet keine Tastenkonflikte. |
| MOD-10 | Mehrspieler-Server (Paper) | kern | 1. Auf einem Server (ohne Mod auf dem Server) dieselben Schritte wiederholen, besonders die Platzierhilfe. | Alles wie im Einzelspieler; kein Kick, keine „illegal packet“-Meldung; Platzierung je Server gespeichert. |
| MOD-11 | Großer Plan | vertieft | 1. Plan mit über 10 000 Blöcken einblenden und herumlaufen.<br>2. `/bauplaner leistung` lesen, dann `niedrig` und `hoch` ausprobieren. | Bildrate bleibt spielbar; weiter entfernte Blöcke werden zu Kisten (Grenze bei „normal“: Texturen bis 40 Blöcke, höchstens 30 000 offene Blöcke). Greift die Grenze, steht rechts „Zeigt die nächsten …“; „niedrig“ halbiert, „hoch“ verdoppelt sie. |
| MOD-15 | Sehr großer Plan (Mod 0.9.0, SIZE-01) | vertieft | 1. Einen Plan mit über 1 Mio. Blöcken oder einer Box über 4 Mio. Zellen einblenden (Datei in plans/ oder von der Karte senden).<br>2. Mit den Pfeiltasten und Ende verschieben und drehen.<br>3. `/bauplaner diagnose`. | Das Spiel hängt nicht: rechts steht kurz „Plan wird vorbereitet …“, dann erscheint das Hologramm am neuen Ort. Die Diagnose nennt Planbox, Chunks, Leistung und Java-Speicher. |
| MOD-12 | Abschnitt fertig | vertieft | 1. Einen Bauabschnitt zu Ende bauen. | Genau eine Chat-Meldung nennt den nächsten Abschnitt; HUD-Zeile „Abschnitt k/n“ stimmt mit dem Planer überein. |
| MOD-13 | Platzierhilfe im Detail | vertieft | 1. Falschen Block in die Hand nehmen und setzen; Treppe falsch herum setzen; richtigen Planblock abbauen; Num 8 auf einen Planblock.<br>2. Tür, Kiste, Knopf bedienen; Gerüst auf Luft-Feldern setzen. | Falsches wird nicht gesetzt und der Hinweis erklärt es; Num 8 nimmt den Planblock in die Hand; Bedienen und Gerüst gehen normal; mit Tool Switcher kein ungewollter Werkzeugwechsel. |
| MOD-14 | Tasten umbelegen | vertieft | 1. Optionen → Steuerung → Bauplaner: eine Taste umbelegen, Spiel neu starten. | Belegung bleibt; `/bauplaner diagnose` zeigt keine Konflikte mit Jade (Num 0–5), Xaero (Num +), Voice Chat (H/N), Iris (I/K/R). Meldet er einen (alte Belegung aus einer früheren Version, z. B. „Ebene tiefer“ auf Num 3), die Taste dort zurücksetzen und erneut prüfen. |
| MOD-16 | Befehlsseite im Plan-Menü (Mod 0.11.0) | kern | 1. Plan ins Spiel schicken, J drücken, unten links „Befehle & Status“.<br>2. Reiter „Status“ lesen, dann Reiter „Hologramm“ → „Fortschritt“ und „Nächster Abschnitt“.<br>3. Reiter „Team“ → „Abschnitt zeigen …“, Nummer eintragen, „Ausführen“.<br>4. Auf einem Server mit Bauplaner-Plugin: Reiter „Lager“ → „Lagerkisten“; auf eine markierte Kiste schauen und „Diese Kiste“. Auf einem Server ohne Plugin den Reiter „Lager“ öffnen.<br>5. Bei kleinem Fenster (oder GUI-Größe 3–4) durch die Reiter blättern (◀ ▶ unten links). | Der Status zeigt Plan, Fortschritt, Ebenen/Abschnitte, Team und ob der Server das Plugin hat. Jeder Klick gibt dieselbe Antwort wie der getippte Befehl, sie erscheint unten auf der Seite. Ohne Plugin sind die Serverknöpfe ausgegraut und nennen beim Darüberfahren den Grund; Knöpfe für eine Kiste werden erst aktiv, wenn man auf eine schaut. Nichts ist abgeschnitten oder überlappt. |
| MOD-17 | Packliste, Gerüst und Markieren (Mod 0.13.0) ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | kern | 1. Plan mit Teilbau ins Spiel schicken, etwas Material ins Inventar legen, `/bauplaner packliste`.<br>2. Auf einem Teamserver mit Lagerkisten: Packliste erneut.<br>3. Einen Plan mit Dach ohne Stützen oder Sand über Luft zeigen, `/bauplaner geruest`.<br>4. `/bauplaner markieren lager Erzlager`, dann im Planer #/karte mit verbundener Mod „In den Weltplan übernehmen“; danach im Spiel `/bauplaner markierungen`. | Die Packliste zieht getragenes Material ab, rechnet Stapel und Shulkerkisten und nennt die nächste Lagerkiste. Gerüst nennt nur wirklich hängende oder fallende Blöcke, der Zeiger zeigt auf den nächsten. Der Punkt erscheint auf der Weltkarte in der Ebene „Aus dem Spiel“, ein Rückgängig nimmt ihn wieder heraus, im Spiel wartet danach nichts mehr. |

## LIVE · Mod: Verbindung mit dem Planer (Mod)

Live-Karte und Übergabe zwischen Planer und Spiel über 127.0.0.1 (nur auf demselben Rechner).

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| LIVE-01 | Koppeln per Klick ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | kern | 1. Minecraft mit Mod 0.12 starten (die Verbindung ist von selbst an).<br>2. Im Planer Weltkarte → Kasten „Spiel“ → Verbinden. Browserfrage „Geräte im lokalen Netzwerk“ zulassen.<br>3. Im Spiel steht oben „J drücken“: J drücken, „Planer zulassen“ klicken. | Ohne Code und ohne Befehl verbunden; Karte zeigt die Spielerposition mit Spur. |
| LIVE-02 | Plan ins Spiel senden ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | kern | 1. Bei einem Projekt auf der Karte „▶ Ins Spiel senden“. | Hologramm erscheint im Spiel genau an der Kartenlage, ohne Datei zu kopieren. |
| LIVE-03 | Gelände und Weltplan ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. „Gelände um mich lesen“; „Weltplan ins Spiel senden“. | Geladene Chunks werden eingefärbt; Wege/Bauplätze erscheinen im Spiel als Linien. |
| LIVE-07 | Wiederverbinden ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. Spiel beenden und neu starten, Planer offen lassen. | Die Mod verbindet sich von selbst wieder; Karte zeigt die Position erneut. |
| LIVE-04 | Lage zurück und Fortschritt ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. Hologramm im Spiel verschieben, im Planer „Lage aus dem Spiel übernehmen“.<br>2. Weiterbauen und Fortschritt im Planer beobachten. | Projekt auf der Karte springt an die neue Lage; Fortschritt aktualisiert sich. |
| LIVE-05 | Spielaufnahme | vertieft | 1. `/bauplaner scan` (bzw. Plan + Anker + Scan wie in der Anleitung auf der Seite „Spiel“).<br>2. Aufnahme im Projekt unter „Bauen“ → „Spielaufnahme importieren“. | Planer zeigt je Bauschritt bestätigt / teilweise / abweichend passend zum Bau. |
| LIVE-08 | Weltplan mit alter und neuer Mod ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. Mit der Mod verbunden: „📍 Punkt, wo ich stehe“, „Spur als Weg“ (nach ein paar Schritten im Spiel).<br>2. Eine Zone und eine Notiz anlegen, „Weltplan ins Spiel senden“.<br>3. Zeile „Mod kann: …“ im Kasten „Spiel“ lesen. | Punkt liegt genau an der Spielerposition mit Spielhöhe. Mit einer Mod ohne „marks2“ bleiben Zonen und neue Punktarten nur auf der Karte, die Meldung nennt sie; mit „marks2“ erscheinen sie im Spiel, mit „players“ stehen Mitspieler in Sichtweite auf der Karte. |
| LIVE-09 | Großen Plan senden (SIZE-01) ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. Ein großes Projekt (z. B. Großprojekt Hauptstadt oder ein Import über 1 Mio. Blöcke) auf der Karte „▶ Ins Spiel senden“.<br>2. Wenn möglich einmal mit Mod 0.8.0 und einmal mit 0.9.0. | Mit 0.9.0: Meldung „Großer Plan …“, das Hologramm erscheint ohne Hänger. Mit 0.8.0 und Box über 4 Mio. Zellen: der Planer sendet nicht und nennt Mod 0.9.0; „Mod kann“ zeigt „große Pläne“ nur bei 0.9.0. |
| LIVE-06 | Diagnose aus dem Spiel | kern | 1. `/bauplaner diagnose` eingeben. | Chat meldet die Datei in bauplaner/diagnose/ und dass der Bericht in der Zwischenablage liegt; Bericht nennt Mod-Version, Loader, Mods, Tasten, Hologramm-Zustand. |

## LINK · Server ohne Befehle (Mod)

Planer, Mod und Paper-Plugin verbinden sich per Klick; der Server wird aus dem Planer eingestellt (auch vom iPad über den Team-Raum).

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| LINK-01 | Server ohne Befehle koppeln ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/mod)) | kern | 1. Paper-Server mit Plugin 0.12 starten (nichts einstellen). Als OP mit der Mod beitreten: Chat-Hinweis lesen.<br>2. J → „Teambau erlauben“.<br>3. Im Planer #/mod, Bereich „Spiel und Server verbinden“: „Server koppeln“. | Servername und Plugin-Version erscheinen, danach „dieser Browser steuert den Server“; im Serverordner steht plugins/BauplanerBridge/link.json mit einem Gerät. Kein Befehl getippt. |
| LINK-02 | Server-Einstellungen aus dem Planer ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/mod)) | kern | 1. Gekoppelt: „Bauen in fremden Abschnitten“ auf „sperren“, „Übernehmen“.<br>2. Im Spiel in einem fremden Abschnitt einen Block setzen. | Meldung „1 Einstellung übernommen“; das Setzen wird verhindert. config.yml des Plugins zeigt den neuen Wert. |
| LINK-03 | Team und Team-Raum per Knopf ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/mod)) | vertieft | 1. Im Projekt Reiter „Team“ → „Planstand auf den Server legen“.<br>2. Unter „Team live“ → „Server mit dem Raum verbinden“. | Beides ohne Datei und ohne Befehl; #/mod zeigt Team und Raum beim Server. |
| LINK-05 | Plan von der Weltkarte auf den Server ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. Gekoppelt (Mod auf dem Server oder Team-Raum): Weltkarte → Projekt wählen → „⇪ Auf den Server legen“.<br>2. Auf dem Server /bp plaene ansehen (nur zur Kontrolle). | Meldung „Plan … liegt auf dem Server … Anker …“; der Plan steht in plugins/BauplanerBridge/plans, ohne Datei kopiert zu haben. |
| LINK-06 | Baustand per Klick vom Server holen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | vertieft | 1. Plan vorher mit „⇪ Auf den Server legen“ hochgeladen (LINK-05).<br>2. Im Projekt Reiter „Bauen“ → „⇩ Auf dem Server aufnehmen“.<br>3. Danach „Aufnahme im Projekt speichern“. | Fortschritt in Prozent, dann „Aufnahme von … geladen“ mit den Zählern (fehlt, falscher Block …) – ohne /bp scan und ohne Datei herunterzuladen. Plugin 0.13.0 nötig. |
| LINK-07 | Teambau ohne Server-Datei ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | kern | 1. Server ohne Bauplaner-Plugin. Im Planer Reiter „Team“ → „Team live“ (live geschaltet), „Ich bin“ gewählt.<br>2. Minecraft mit Mod 0.14.0 oder neuer läuft: „Mein Spiel verbinden“.<br>3. Im Spiel /bauplaner team nehmen <nr> (oder J → Befehle).<br>4. Im Planer auf die Abschnittsliste schauen. | Im Spiel „Team live über den Team-Raum“; der Abschnitt steht im Planer innerhalb von Sekunden als „in Arbeit“ – ohne Datei und ohne Plugin auf dem Server. J → „Befehle & Status“ zeigt „Team-Raum: live“. |
| LINK-08 | Positionen und Aufnahme über den Team-Raum ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | kern | 1. Wie LINK-07: Server ohne Plugin, Team live, Mod 0.15.0 mit „Mein Spiel verbinden“, Plan im Spiel platziert.<br>2. Im Spiel ein paar Schritte gehen; im Planer Reiter „Team“ → „Gerade da“ ansehen.<br>3. Im Planer Reiter „Bauen“ → „⇩ Aufnahme im Spiel anfordern“.<br>4. Im Spiel eine im Planer markierte Lagerkiste öffnen und schließen. | Unter „Gerade da“ steht dein Spielername mit Blockposition und wandert mit; die Aufnahme ist nach wenigen Sekunden geladen („Aufnahme aus dem Team-Raum geladen …“) und steht unter „Aufnahmen im Team-Raum“; im Spiel kommt eine Chatzeile „Baustand aufgenommen …“. Ohne Plugin und ohne Datei auf dem Server. |
| LINK-09 | Ausweichwege: Team-Raum weg, WebSocket gesperrt, Baustand über den besten Weg ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/)) | kern | 1. Mod 0.16.0, Team live, „Mein Spiel verbinden“, Plan im Spiel platziert.<br>2. Minecraft beenden, WLAN/Internet trennen, Minecraft neu starten und J → „Befehle & Status“ öffnen.<br>3. Ohne Internet einen Abschnitt bauen (Hologramm misst), dann Internet wieder verbinden.<br>4. Im Planer Reiter „Bauen“ → „⟳ Baustand holen (bester Weg)“. | Ohne Internet zeigt die Mod den Teamstand weiter („zeigt den Stand von …“, „1 Meldung wartet“); nach dem Wiederverbinden meldet der Chat „gemerkte Messung … nachgereicht“ und der Planer zeigt den Abschnitt „laut Spiel“. Der Planer holt den Baustand über „dein Spiel auf diesem PC“ und nennt den Weg; ohne Mod nimmt er den Team-Raum oder den Server und sagt, warum. |
| LINK-04 | Vom iPad ohne Mod steuern ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/mod)) | vertieft | 1. Am PC (#/mod, gekoppelt, Server mit Raum verbunden): „Weiteres Gerät freigeben (z. B. iPad)“ → Link erstellen.<br>2. Link auf dem iPad öffnen, eine Einstellung ändern.<br>3. Am PC das iPad wieder „entfernen“. | iPad zeigt „über den Team-Raum“ und ändert die Einstellung; nach dem Entfernen meldet es „nicht (mehr) gekoppelt“. |

## Abnahme je Roadmap-Paket

Welche Fälle die Abnahme eines Pakets abdecken (Quelle `ACCEPTANCE` in testplan.ts), geordnet nach dem Ort, den die Abnahme braucht. Ein Paket gilt als abgenommen, wenn alle genannten Fälle ✓ sind; Ob ein Paket noch auf Abnahme wartet, steht in `docs/ROADMAP.md`.

### Nur im Browser (38 Pakete)

| Paket | Testfälle |
|---|---|
| ARCH-02 | SYS-03, START-03 |
| BACKUP-02 | START-03, START-04 |
| BASE-01 | BIB-10 |
| BUILD-06 | PROJ-03, GERAET-06 |
| COOP-06 | TEAMBAU-21, TEAMBAU-22, TEAMBAU-23, TEAMBAU-24 |
| DIFF-01 | BIB-17, PROJ-07 |
| EDIT-01 | WERK-03 |
| EDIT-02 | WERK-01 |
| EDIT-03 | WERK-02, WERK-05 |
| EDIT-04 | WERK-04 |
| EDIT-05 | WERK-03 |
| GFX-01 | DATEI-04, GERAET-05 |
| GFX-02 | DATEI-09, GERAET-05 |
| GROSS-01 | BIB-13, PROJ-11 |
| LIB-02 | BIB-07 |
| LIB-03 | BIB-08 |
| LIB-06 | BIB-15, BIB-16 |
| MAP-01 | KARTE-01 |
| MAP-04 | KARTE-02, KARTE-03 |
| MODEL-01 | PROJ-05 |
| PERF-02 | PROJ-08, DATEI-05 |
| PERF-03 | BIB-18, BIB-01 |
| PERF-04 | DATEI-03, PROJ-05, PROJ-08 |
| PERF-05 | START-01, PROJ-08, WERK-07 |
| PROD-01 | PROJ-12 |
| PROD-02 | PROJ-13 |
| PROD-03 | PROJ-12, PROJ-13 |
| PROD-04 | PROJ-13 |
| PROFILE-01 | DATEI-06 |
| PROJ-01 | PROJ-09, PROJ-10, PROJ-11 |
| PROJ-02 | PROJ-16, PROJ-17, PROJ-18 |
| SPLIT-01 | BIB-11 |
| TERRAIN-01 | KARTE-04, PROJ-06 |
| TERRAIN-02 | PROJ-06 |
| UPDATE-01 | PROJ-07 |
| VIEW-01 | DATEI-01, GERAET-04 |
| VIEW-02 | START-06, DATEI-01 |
| WORLD-IMPORT-01 | KARTE-04 |

### Mit Minecraft (Mod oder Spiel) (35 Pakete)

| Paket | Testfälle |
|---|---|
| BLOCK-01 | WERK-06, PROJ-04 |
| BLOCK-02 | BIB-12, WERK-06 |
| COOP-01 | TEAMBAU-01, TEAMBAU-02, TEAMBAU-03, TEAMBAU-04, TEAMBAU-05 |
| COOP-03 | TEAMBAU-09 |
| COOP-07 | TEAMBAU-25, LINK-07 |
| COOP-09 | TEAMBAU-26, TEAMBAU-25 |
| COOP-10 | TEAMBAU-27, TEAMBAU-25 |
| EDIT-06 | WERK-08, WERK-09 |
| ENTITY-01 | DATEI-07 |
| FALLBACK-01 | LINK-09 |
| FORMAT-01 | DATEI-08, PROJ-04 |
| FORMAT-02 | DATEI-08, PROJ-04 |
| GAME-02 | MOD-01, MOD-02 |
| GAME-03 | LIVE-01, LIVE-02 |
| GAME-05 | MOD-01 |
| GAME-07 | MOD-02, MOD-06, MOD-07, MOD-08, MOD-12 |
| GAME-08 | LIVE-08, KARTE-05 |
| GAME-10 | MOD-16 |
| GEN-02 | BIB-06, BIB-12 |
| GEN-03 | BIB-14 |
| LIB-04 | BIB-05, BIB-12 |
| LIB-05 | BIB-12 |
| LINK-02 | LINK-02 |
| LINK-05 | LINK-04 |
| LINK-07 | LINK-07, LINK-08 |
| MAP-03 | LIVE-01, LIVE-03, LIVE-04 |
| MAP-05 | LIVE-04, LIVE-05 |
| MAP-06 | KARTE-05, KARTE-06, LIVE-08 |
| MAT-02 | PROJ-15, PROJ-02 |
| MAT-03 | PROJ-14 |
| MAT-04 | PROJ-14 |
| NBT-01 | DATEI-07 |
| QA-04 | SYS-01, SYS-02, LIVE-06 |
| SIZE-01 | DATEI-05, WERK-07, MOD-15, LIVE-09 |
| TERRAIN-03 | PROJ-19, PROJ-06 |

### Mit Paper-Server und Plugin (10 Pakete)

| Paket | Testfälle |
|---|---|
| COOP-02 | TEAMBAU-06 |
| COOP-04 | TEAMBAU-07, TEAMBAU-08 |
| COOP-05 | LAGER-01, LAGER-02, LAGER-03, LAGER-04, LAGER-05, LAGER-06, LAGER-07, LAGER-08, LAGER-09 |
| COOP-08 | LAGER-10, PROJ-12 |
| LAGER-01 | LAGER-01, TEAMBAU-08 |
| LINK-01 | LINK-01 |
| LINK-03 | LIVE-01, LINK-01 |
| LINK-04 | LINK-01, LINK-02, LINK-03 |
| LINK-06 | LINK-05, LINK-06 |
| PROD-05 | LAGER-10, PROJ-12 |
