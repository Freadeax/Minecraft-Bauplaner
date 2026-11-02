# Testplan der großen Testphase (QA-04)

Erzeugt aus `apps/web/src/testing/testplan.ts` mit `node scripts/render_testplan.mjs`; nicht von Hand ändern. Dieselben Fälle stehen im Planer unter **Testphase** (`#/testphase`) mit Haken, Notizen und „Fehler melden“.

Umfang: 64 Fälle in 9 Bereichen, davon 31 Kernfälle.

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

Katalog mit Gebäuden, Ensembles, Generatoren, Sammlungen, Vorlagen und Anlagen.

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
| BIB-12 | Neue Gebäude im Spiel bauen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | vertieft | 1. Zwei bis drei neue Bibliotheksgebäude (z. B. ein Meisterstück, eine Untergrundhalle, ein Interieur) als .schem exportieren und im Spiel (Litematica oder Mod-Hologramm) aufstellen. | Nichts schwebt, Türen/Treppen/Laternen stehen richtig, Innenräume sind begehbar und eingerichtet. (Abnahme LIB-05-S08) |

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

## WERK · Werkstatt (Blockeditor) (Planer)

Eigene Bauteile Block für Block bauen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| WERK-01 | Blöcke setzen und entfernen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | kern | 1. Werkstatt → neues Bauteil.<br>2. Block wählen, in der Ebenenansicht setzen, entfernen, ersetzen und drehen.<br>3. Speichern. | Blöcke erscheinen an der Klickstelle, 3D zeigt dasselbe; gespeichertes Bauteil in der Bibliothek. |
| WERK-02 | Formen und Muster ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | kern | 1. Linie, Rechteck, Bogen, Pyramide, Kegel, Ellipsoid ausprobieren.<br>2. Musterpinsel mit mehreren Blöcken. | Formen haben die gewählten Maße; Muster verteilt die Blöcke wie eingestellt. |
| WERK-03 | Auswahlwerkzeuge ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | vertieft | 1. Zauberauswahl, Stapeln, Extrudieren, Auswahl verschieben/drehen. | Nur die Auswahl ändert sich; Ausstattung (Gemälde, Rahmen) zieht mit. |
| WERK-04 | Kreativwerkzeuge ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | vertieft | 1. Symmetrie, Kurven, Naturwerkzeuge (Baum, Fels), Farbpaletten, Bild → Blöcke. | Ergebnisse sehen wie in der Vorschau aus; Bild → Blöcke nimmt passende Farben. |
| WERK-05 | Tastenkürzel und Rückgängig ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | kern | 1. Tastenkürzel-Übersicht öffnen, einige Kürzel testen.<br>2. Viele Schritte rückgängig machen und wiederholen. | Kürzel tun, was angezeigt wird; kein Schritt geht verloren. |
| WERK-06 | Gestapelte und gedrehte Bauteile im Spiel ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/werkstatt/neu)) | vertieft | 1. Ein Bauteil mit Ausstattung (Gemälde, Rahmen) stapeln, extrudieren und drehen, speichern.<br>2. Als .schem exportieren und im Spiel aufstellen. | Ausstattung hängt im Spiel an derselben Wand wie in der Werkstatt; gestapelte Teile sitzen lückenlos. (Abnahme EDIT-05-S07) |

## DATEI · Betrachter und Import (Planer)

Fremde .schem- und .litematic-Dateien öffnen und als Bauteil übernehmen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| DATEI-01 | Datei ansehen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/betrachter)) | kern | 1. Betrachter öffnen und eine .schem oder .litematic laden. | Bau erscheint in 3D, Kamera zeigt ihn ganz; Blockliste und Maße plausibel. |
| DATEI-02 | Import in die Bibliothek ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | kern | 1. In der Bibliothek eine Datei importieren.<br>2. Importbericht lesen und speichern. | Unbekannte Blöcke werden genannt, nicht verschluckt; Bauteil erscheint mit Vorschaubild. |
| DATEI-03 | Große Datei ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/bibliothek)) | vertieft | 1. Eine große Datei (über 200 000 Blöcke) importieren, einmal abbrechen, dann ganz laden. | Fortschritt und Abbrechen funktionieren, Seite bleibt bedienbar. |
| DATEI-04 | Licht, Nacht, Schatten | vertieft | 1. Im 3D-Betrachter Licht/Nacht/Sonne umschalten, Spawnprüfung ansehen. | Dunkle Stellen werden als Spawnflächen markiert, Ansicht bleibt flüssig. |

## KARTE · Weltkarte, Weltbuilder und Weltimport (Planer)

Projekte in der Welt platzieren, Wege und Bauplätze planen, Gelände aus der eigenen Welt übernehmen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| KARTE-01 | Projekte auf der Karte ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | kern | 1. Weltkarte öffnen, Projekt platzieren, verschieben, drehen. | Lage bleibt nach dem Neuladen; Koordinaten stimmen mit dem Projekt überein. |
| KARTE-02 | Weltbuilder: Löschen und Rückgängig ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | kern | 1. Bauplatz, Weg und Punkt anlegen.<br>2. Mehrfachauswahl (Rahmen, Taste A), Kontextmenü (Rechtsklick), Löschen mit Entf.<br>3. Strg+Z / Strg+Y. | Alles lässt sich löschen; ein Rückgängig bringt die ganze Löschung zurück. |
| KARTE-03 | Duplizieren, Drehen, Ebenen ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. Objekte duplizieren, drehen/spiegeln, Wegecken ziehen, Ebenen ein-/ausblenden. | Ergebnis wie erwartet, Objektliste stimmt mit der Karte überein. |
| KARTE-04 | Weltimport aus Regionsdateien ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/welt)) | vertieft | 1. Weltimport öffnen, Regionsdateien (.mca) der eigenen Welt wählen, Bereich auswählen, übernehmen. | Ausschnitt erscheint als Bauteil; Gelände-Reiter im Projekt kann ihn nutzen. |

## SYS · Systemcheck und Stabilität (Planer)

Prüft, ob die Seite richtig ausgeliefert ist und die gespeicherten Daten stimmen.

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| SYS-01 | Systemcheck ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/system)) | kern | 1. Systemcheck öffnen, „Geladene Dateien prüfen“ und „Datencheck starten“. | Alle Dateien stimmen, Datencheck ohne Fehler (oder verständliche Befunde). |
| SYS-02 | Fehler melden ausprobieren ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/testphase?melden)) | kern | 1. Unter „Testphase → Fehler melden“ einen Probebericht ausfüllen, kopieren und als Datei speichern (nicht abschicken). | Bericht enthält Build, Browser, Grafik und Protokoll, aber keine Projektdaten. |

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
| MOD-11 | Großer Plan | vertieft | 1. Plan mit über 10 000 Blöcken einblenden und herumlaufen. | Bildrate bleibt spielbar; weiter entfernte Blöcke werden zu Kisten (Grenze: Texturen bis 40 Blöcke, höchstens 30 000 offene Blöcke). |
| MOD-12 | Abschnitt fertig | vertieft | 1. Einen Bauabschnitt zu Ende bauen. | Genau eine Chat-Meldung nennt den nächsten Abschnitt; HUD-Zeile „Abschnitt k/n“ stimmt mit dem Planer überein. |
| MOD-13 | Platzierhilfe im Detail | vertieft | 1. Falschen Block in die Hand nehmen und setzen; Treppe falsch herum setzen; richtigen Planblock abbauen; Num 8 auf einen Planblock.<br>2. Tür, Kiste, Knopf bedienen; Gerüst auf Luft-Feldern setzen. | Falsches wird nicht gesetzt und der Hinweis erklärt es; Num 8 nimmt den Planblock in die Hand; Bedienen und Gerüst gehen normal; mit Tool Switcher kein ungewollter Werkzeugwechsel. |
| MOD-14 | Tasten umbelegen | vertieft | 1. Optionen → Steuerung → Bauplaner: eine Taste umbelegen, Spiel neu starten. | Belegung bleibt; `/bauplaner diagnose` zeigt keine Konflikte mit Jade (Num 0–5), Xaero (Num +), Voice Chat (H/N), Iris (I/K/R). Meldet er einen (alte Belegung aus einer früheren Version, z. B. „Ebene tiefer“ auf Num 3), die Taste dort zurücksetzen und erneut prüfen. |

## LIVE · Mod: Verbindung mit dem Planer (Mod)

Live-Karte und Übergabe zwischen Planer und Spiel über 127.0.0.1 (nur auf demselben Rechner).

| ID | Fall | Stufe | Schritte | Erwartet |
|---|---|---|---|---|
| LIVE-01 | Koppeln ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | kern | 1. Im Spiel `/bauplaner verbinden`.<br>2. Im Planer Weltkarte → Kasten „Spiel“ → Verbinden, Code eingeben. Browserfrage „Geräte im lokalen Netzwerk“ zulassen. | Verbunden; Karte zeigt die Spielerposition mit Spur. |
| LIVE-02 | Plan ins Spiel senden ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | kern | 1. Bei einem Projekt auf der Karte „▶ Ins Spiel senden“. | Hologramm erscheint im Spiel genau an der Kartenlage, ohne Datei zu kopieren. |
| LIVE-03 | Gelände und Weltplan ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. „Gelände um mich lesen“; „Weltplan ins Spiel senden“. | Geladene Chunks werden eingefärbt; Wege/Bauplätze erscheinen im Spiel als Linien. |
| LIVE-07 | Wiederverbinden ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. Spiel beenden und neu starten, Planer offen lassen. | Die Mod verbindet sich von selbst wieder; Karte zeigt die Position erneut. |
| LIVE-04 | Lage zurück und Fortschritt ([Start](https://freadeax.github.io/Minecraft-Bauplaner/#/karte)) | vertieft | 1. Hologramm im Spiel verschieben, im Planer „Lage aus dem Spiel übernehmen“.<br>2. Weiterbauen und Fortschritt im Planer beobachten. | Projekt auf der Karte springt an die neue Lage; Fortschritt aktualisiert sich. |
| LIVE-05 | Spielaufnahme | vertieft | 1. `/bauplaner scan` (bzw. Plan + Anker + Scan wie in der Anleitung auf der Seite „Spiel“).<br>2. Aufnahme im Projekt unter „Bauen“ → „Spielaufnahme importieren“. | Planer zeigt je Bauschritt bestätigt / teilweise / abweichend passend zum Bau. |
| LIVE-06 | Diagnose aus dem Spiel | kern | 1. `/bauplaner diagnose` eingeben. | Chat meldet die Datei in bauplaner/diagnose/ und dass der Bericht in der Zwischenablage liegt; Bericht nennt Mod-Version, Loader, Mods, Tasten, Hologramm-Zustand. |
