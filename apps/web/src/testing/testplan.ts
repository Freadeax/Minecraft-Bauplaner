/**
 * Testplan der großen Testphase (QA-04). Eine Quelle für die Seite „Testphase“ (#/testphase), das
 * Testprotokoll und docs/testing/TESTPLAN.md (erzeugt mit `node scripts/render_testplan.mjs`).
 *
 * Regeln für neue Fälle: stabile ID (Bereichskürzel + laufende Nummer, nie umnummerieren), Schritte so
 * schreiben, dass jemand ohne Vorwissen sie nachmachen kann, ein beobachtbares Ergebnis nennen.
 * „kern“ = muss jede Testrunde einmal laufen; „vertieft“ = wenn Zeit ist oder der Bereich geändert wurde.
 */
export type TestLevel = 'kern' | 'vertieft';

export interface TestCase {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly string[];
  readonly expect: string;
  readonly level: TestLevel;
  /** Seite zum Starten, falls sinnvoll. */
  readonly start?: string;
}

export interface TestArea {
  readonly id: string;
  readonly title: string;
  /** Planer (Browser) oder Mod (im Spiel). */
  readonly kind: 'planer' | 'mod';
  readonly intro: string;
  readonly cases: readonly TestCase[];
}

const k = (id: string, title: string, steps: readonly string[], expect: string, start?: string): TestCase => ({ id, title, steps, expect, level: 'kern', ...(start && { start }) });
const v = (id: string, title: string, steps: readonly string[], expect: string, start?: string): TestCase => ({ id, title, steps, expect, level: 'vertieft', ...(start && { start }) });

export const TEST_AREAS: readonly TestArea[] = [
  {
    id: 'START', kind: 'planer', title: 'Start, Projektzentrale und Sicherung',
    intro: 'Erster Eindruck, Projekte anlegen und Daten sichern. Am besten in einem frischen Browserprofil oder privaten Fenster beginnen.',
    cases: [
      k('START-01', 'Erster Start', ['Seite öffnen (am besten privates Fenster).', 'Warten, bis die Bibliothek geladen ist (Fortschrittsanzeige).'], 'Startbildschirm mit Fortschritt, danach die Projektzentrale; keine Fehlermeldung, Seite friert nicht ein.', '#/'),
      k('START-02', 'Projekt anlegen, umbenennen, löschen', ['In der Projektzentrale ein neues Projekt anlegen.', 'Umbenennen.', 'Ein zweites Projekt anlegen und wieder löschen.'], 'Namen bleiben nach dem Neuladen (F5) erhalten; das gelöschte Projekt ist weg, das andere unverändert.', '#/'),
      k('START-03', 'Sichern und wiederherstellen', ['„Alles sichern“ in der Projektzentrale.', 'Ein Projekt ändern oder löschen.', '„Sicherung wiederherstellen …“ mit der gespeicherten Datei.'], 'Die Sicherungsdatei lädt herunter; nach dem Wiederherstellen ist der gesicherte Stand wieder da.', '#/'),
      v('START-04', 'Sicherungserinnerung', ['Mehrere Änderungen machen, ohne zu sichern.', 'Projektzentrale ansehen.'], 'Ein Hinweis zeigt, wie alt die letzte Sicherung ist, und bietet „Sichern“ an.', '#/'),
      k('START-05', 'Schnellsuche', ['Strg+K (Mac: ⌘K) drücken.', 'Nach einem Gebäude und nach „Werkstatt“ suchen und öffnen.'], 'Die Suche öffnet sofort, Treffer führen zur richtigen Seite.'),
      v('START-06', 'Farbschema und Texturen', ['Oben das Farbschema wechseln (hell/dunkel/automatisch).', 'Über den Texturen-Knopf ein eigenes Ressourcenpaket (.zip) laden, falls vorhanden.'], 'Alle Seiten bleiben lesbar; mit Ressourcenpaket zeigen Blöcke Texturen, ohne Paket einfache Farben.'),
      v('START-07', 'Handy und Tablet', ['Seite auf dem Handy öffnen.', 'Untere Leiste benutzen, ein Projekt und die Bibliothek öffnen.'], 'Nichts ragt seitlich aus dem Bild, Knöpfe sind mit dem Finger treffbar.'),
    ],
  },
  {
    id: 'BIB', kind: 'planer', title: 'Bibliothek',
    intro: 'Katalog mit Gebäuden, Ensembles, Generatoren, Sammlungen, Vorlagen, Anlagen und Großprojekten.',
    cases: [
      k('BIB-01', 'Katalog durchsuchen und filtern', ['Bibliothek öffnen.', 'Suchbegriff eingeben (z. B. „Turm“), Kategorie und Spielphase filtern.', 'Adresse kopieren und in neuem Tab öffnen.'], 'Treffer passen zum Filter, Vorschaubilder erscheinen; der neue Tab zeigt dieselbe Suche.', '#/bibliothek'),
      k('BIB-02', 'Gebäude-Detailseite', ['Ein Gebäude öffnen.', 'Ansichten „Bilder“, „Ebenen“ und „Versionen“ durchklicken, 3D drehen und zoomen.'], '3D-Ansicht flüssig, Ebenen lassen sich einzeln ansehen, Materialliste plausibel.', '#/bibliothek'),
      k('BIB-03', 'Gebäude in ein Projekt übernehmen', ['Auf der Detailseite das Gebäude einem Projekt hinzufügen.', 'Projekt öffnen.'], 'Das Gebäude steht im Projekt-Editor und ist auswählbar.'),
      v('BIB-04', 'Vergleich und Merkliste', ['Zwei bis drei Gebäude merken.', 'Vergleich öffnen.'], 'Gebäude stehen nebeneinander mit Maßen und Material.', '#/bibliothek'),
      v('BIB-05', 'Ensembles', ['Ensembles öffnen, eins ansehen und als Projekt übernehmen.'], 'Alle Gebäude des Ensembles stehen im Projekt an sinnvoller Stelle, ohne Überschneidung.', '#/bibliothek/ensembles'),
      k('BIB-06', 'Generatoren', ['Generatoren öffnen (Haus, Turm, Mauer, Brücke, Dach …).', 'Maße und Stil ändern.', 'Ergebnis als Bauteil speichern.'], 'Vorschau ändert sich sofort; keine schwebenden Blöcke; gespeichertes Bauteil erscheint in der Bibliothek.', '#/bibliothek/generatoren'),
      v('BIB-07', 'Eigene Sammlungen und Ordner', ['Eine Sammlung anlegen, Gebäude hinzufügen, Ordner anlegen und verschieben.'], 'Sammlung bleibt nach dem Neuladen erhalten; Katalogfilter nach Sammlung funktioniert.', '#/bibliothek/sammlungen'),
      v('BIB-08', 'Vorlagen speichern', ['Ein Ensemble oder einen Generator mit eigenen Werten als Vorlage speichern und wieder öffnen.'], 'Vorlage stellt genau die gespeicherten Werte wieder her.', '#/bibliothek/vorlagen'),
      v('BIB-09', 'Anlagen und Bauwelten', ['Anlagen öffnen, eine Anlage mit Konfliktvorschau ansehen.', 'Bauwelten durchblättern.'], 'Konflikte werden markiert; Übernahme legt die Anlage in ein Projekt.', '#/bibliothek/anlagen'),
      k('BIB-10', 'Basisplaner', ['Bibliothek → Reiter „Basisplaner“.', 'Zonen an- und abwählen, zwei Zonen tauschen, Wasserseite und Bauplatz ändern.', 'Übernehmen.'], 'Vorschau ohne Überschneidungen, Wege durch kein Gebäude; das Projekt hat Abschnitte „Wege & Platz“ und „Phase 1–4“, das Wegenetz liegt als Bauteil vor. (Abnahme BASE-01-S06)', '#/bibliothek/basis'),
      v('BIB-11', 'Gebäude aus einer eigenen Basis herauslösen', ['Eine eigene große .litematic/.schem (ganze Basis) in die Bibliothek importieren.', 'Gebäudeblatt → „Verwalten“ → „Gebäude herauslösen“.', 'Teile ansehen, einige einzeln speichern, als Projekt aufteilen.'], 'Gebäude, Felder, Gehege und Wege werden erkannt (Grenze: unterirdische Räume und Brücken noch nicht sicher); das Projekt zeigt jeden Block am alten Platz ohne Konflikte. (Abnahme SPLIT-01-S05 mit echten Dateien)', '#/bibliothek'),
      k('BIB-13', 'Großprojekt planen und übernehmen', ['Bibliothek → Reiter „Großprojekte“, ein Projekt (z. B. „Freie Marktstadt“) öffnen.', 'Ein Quartier abwählen, Straßenbreite und -stil ändern, einen Platz tauschen und drehen.', 'Als Projekt anlegen; Baustelle und Editor ansehen.', 'Im Katalog nach „großbau“ suchen und ein Großbauwerk (z. B. Schloss mit Innenhof) öffnen.'], 'Lageplan und 3D-Vorschau zeigen Quartiere und Straßen ohne Voxelkonflikte; das Projekt hat Abschnitte „Straßen & Plätze“ und „Phase 1–4“, das Straßennetz liegt als Bauteil vor; Türen zeigen zur Straße; die sechs Großbauten sind begehbar und eingerichtet. (Abnahme GROSS-01-S06)', '#/bibliothek/grossprojekte'),
      k('BIB-14', 'Kolosseum-Viertel und Arena-Generator', ['Bibliothek → Reiter „Großprojekte“ → „Kolosseum-Viertel“ öffnen und als Projekt anlegen.', 'Im Editor das Kolosseum ansehen (Ebenen: Hypogäum unter dem Platz, Arena, Ränge, vier Etagen), Bauanleitung und Materialliste öffnen.', 'Bibliothek → Generatoren → „Arena“: Vorlage „Kolosseum“ und „Provinzarena“ ausprobieren.', 'Das Kolosseum als .schem/.litematic exportieren und im Spiel aufstellen.'], 'Neun Quartiere mit 30 Gebäuden ohne Voxelkonflikte, Abschnitte „Straßen & Plätze“ und „Phase 1–4“; Kolosseum 81 × 61 mit begehbaren Rängen, Treppen im Wandelgang und Toren zur Straße; im Spiel schwebt nichts. (Abnahme GEN-03-S05)', '#/bibliothek/grossprojekte/gp_kolosseum'),
      v('BIB-12', 'Neue Gebäude im Spiel bauen', ['Zwei bis drei neue Bibliotheksgebäude (z. B. ein Meisterstück, eine Untergrundhalle, ein Interieur) als .schem exportieren und im Spiel (Litematica oder Mod-Hologramm) aufstellen.'], 'Nichts schwebt, Türen/Treppen/Laternen stehen richtig, Innenräume sind begehbar und eingerichtet. (Abnahme LIB-05-S08)', '#/bibliothek'),
      k('BIB-15', 'Eigenes Bauwerk in die Bibliothek einreichen', ['Eine eigene .litematic oder .schem importieren und als Bauteil speichern (oder ein Werkstatt-/Generatorbauteil nehmen).', 'Gebäudeblatt → „⇪ In Bibliothek einreichen“ → „Beitrag vorbereiten …“.', 'Name, Kategorie, Autor ausfüllen, Rechte bestätigen, „↓ Beitragspaket erstellen“.', 'Den Link „Formular ‚Bibliotheksbeitrag‘ auf GitHub öffnen“ ansehen (nicht absenden, wenn nur getestet wird).'], 'Eine Datei „beitrag_….bauplaner-beitrag.json“ wird heruntergeladen; das Formular ist mit Name, Kennung und Autor vorausgefüllt; ohne Rechtebestätigung entsteht keine Datei; auf dem Handy ragt nichts seitlich heraus. (Abnahme LIB-06-S06)', '#/bibliothek'),
      v('BIB-16', 'Eingereichtes Bauwerk ist fest in der Bibliothek', ['Nach der Übernahme eines Beitrags und dem Update der Seite: Bibliothek öffnen, nach „beitrag“ suchen.', 'Den Beitrag öffnen, in ein Projekt übernehmen und als .litematic exportieren.', 'In einem zweiten Browser (oder privaten Fenster) prüfen, dass er auch dort erscheint.'], 'Der Beitrag steht mit „Bibliotheksbeitrag von …“, Bautipps und genau den eingereichten Blöcken in der Bibliothek, auch in einem frischen Browser; Export und Material funktionieren wie bei jedem Gebäude. (Abnahme LIB-06-S07)', '#/bibliothek?q=beitrag'),
    ],
  },
  {
    id: 'PROJ', kind: 'planer', title: 'Projekt: Editor, Material, Bauen, Export',
    intro: 'Das Herzstück: Bauteile anordnen, Material planen, Bauanleitung und Export.',
    cases: [
      k('PROJ-01', 'Bauteile anordnen', ['Projekt mit 2–3 Bauteilen öffnen.', 'Bauteil verschieben, drehen, spiegeln; Mehrfachauswahl mit Umschalt.', 'Rückgängig/Wiederholen.'], 'Bewegungen folgen der Maus/Tastatur; Überschneidungen werden rot gemeldet; Rückgängig stellt jeden Schritt wieder her.'),
      k('PROJ-02', 'Material', ['Tab „Material“ öffnen.', 'Bauitems und Rohstoffe ansehen, nach Bauteil filtern.'], 'Mengen plausibel (Treppen, Stufen, Türen als Items gezählt); Rohstoffplanung zeigt Stapel und Kisten.'),
      k('PROJ-03', 'Bauanleitung und Baustelle', ['Tab „Baustelle“: Bauabschnitte anlegen.', 'Tab „Bauen“: Schritte abhaken, Druck-/Handyansicht öffnen.'], 'Abschnitte und Fortschritt bleiben nach dem Neuladen; Druckansicht vollständig.'),
      k('PROJ-04', 'Export .schem und .litematic', ['Tab „Export“: Revision einfrieren und als .schem exportieren.', 'Dasselbe als .litematic.', 'Optional: Datei in Litematica/WorldEdit im Spiel laden.'], 'Dateien laden herunter; im Spiel stimmt der Bau mit der Vorschau überein (Ausrichtung, Treppen, Türen).'),
      v('PROJ-05', '3D-Modelldatei', ['Tab „Export“ → „Modelldatei“: OBJ, GLB, STL oder 3MF erzeugen.'], 'Fortschritt läuft, Abbrechen geht; Datei öffnet sich in einem 3D-Programm.'),
      v('PROJ-06', 'Blöcke, Gelände, Landschaft', ['Tab „Blöcke“: Blöcke ansehen/ersetzen.', 'Tab „Gelände“ und „Landschaft“: Gelände formen, bemalen, Wasser/Wege.'], 'Änderungen sichtbar in 3D; Rückgängig funktioniert.'),
      v('PROJ-07', 'Updates von Bauteilen', ['Ein verwendetes Bauteil in der Werkstatt ändern.', 'Im Projekt Tab „Updates“ öffnen und die Vorschau ansehen.'], 'Unterschiede werden gezeigt; Übernehmen ändert nur, was angezeigt wurde.'),
      v('PROJ-08', 'Großes Projekt', ['Ein Projekt mit vielen Gebäuden (z. B. Ensemble Burg) öffnen und durch alle Tabs gehen.'], 'Seite bleibt bedienbar; lange Berechnungen zeigen Fortschritt statt einzufrieren.'),
    ],
  },
  {
    id: 'WERK', kind: 'planer', title: 'Werkstatt (Blockeditor)',
    intro: 'Eigene Bauteile Block für Block bauen.',
    cases: [
      k('WERK-01', 'Blöcke setzen und entfernen', ['Werkstatt → neues Bauteil.', 'Block wählen, in der Ebenenansicht setzen, entfernen, ersetzen und drehen.', 'Speichern.'], 'Blöcke erscheinen an der Klickstelle, 3D zeigt dasselbe; gespeichertes Bauteil in der Bibliothek.', '#/werkstatt/neu'),
      k('WERK-02', 'Formen und Muster', ['Linie, Rechteck, Bogen, Pyramide, Kegel, Ellipsoid ausprobieren.', 'Musterpinsel mit mehreren Blöcken.'], 'Formen haben die gewählten Maße; Muster verteilt die Blöcke wie eingestellt.', '#/werkstatt/neu'),
      v('WERK-03', 'Auswahlwerkzeuge', ['Zauberauswahl, Stapeln, Extrudieren, Auswahl verschieben/drehen.'], 'Nur die Auswahl ändert sich; Ausstattung (Gemälde, Rahmen) zieht mit.', '#/werkstatt/neu'),
      v('WERK-04', 'Kreativwerkzeuge', ['Symmetrie, Kurven, Naturwerkzeuge (Baum, Fels), Farbpaletten, Bild → Blöcke.'], 'Ergebnisse sehen wie in der Vorschau aus; Bild → Blöcke nimmt passende Farben.', '#/werkstatt/neu'),
      k('WERK-05', 'Tastenkürzel und Rückgängig', ['Tastenkürzel-Übersicht öffnen, einige Kürzel testen.', 'Viele Schritte rückgängig machen und wiederholen.'], 'Kürzel tun, was angezeigt wird; kein Schritt geht verloren.', '#/werkstatt/neu'),
      v('WERK-07', 'Großes Modell bearbeiten (SIZE-01)', ['Ein großes Bauteil (über 500 000 Zellen, z. B. aus DATEI-05) in der Werkstatt öffnen.', 'Einen großen Bereich füllen (mehrere 100 000 Zellen), rückgängig machen, wiederholen, speichern.'], 'Hinweis „Großes Modell“ bzw. „Sehr großes Modell“ unter der Werkzeugleiste, aber keine Sperre; Füllen und Rückgängig dauern Sekunden, nicht Minuten; gespeichert ist alles.', '#/werkstatt/neu'),
      v('WERK-06', 'Gestapelte und gedrehte Bauteile im Spiel', ['Ein Bauteil mit Ausstattung (Gemälde, Rahmen) stapeln, extrudieren und drehen, speichern.', 'Als .schem exportieren und im Spiel aufstellen.'], 'Ausstattung hängt im Spiel an derselben Wand wie in der Werkstatt; gestapelte Teile sitzen lückenlos. (Abnahme EDIT-05-S07)', '#/werkstatt/neu'),
    ],
  },
  {
    id: 'DATEI', kind: 'planer', title: 'Betrachter und Import',
    intro: 'Fremde .schem- und .litematic-Dateien öffnen und als Bauteil übernehmen.',
    cases: [
      k('DATEI-01', 'Datei ansehen', ['Betrachter öffnen und eine .schem oder .litematic laden.'], 'Bau erscheint in 3D, Kamera zeigt ihn ganz; Blockliste und Maße plausibel.', '#/betrachter'),
      k('DATEI-02', 'Import in die Bibliothek', ['In der Bibliothek eine Datei importieren.', 'Importbericht lesen und speichern.'], 'Unbekannte Blöcke werden genannt, nicht verschluckt; Bauteil erscheint mit Vorschaubild.', '#/bibliothek'),
      v('DATEI-03', 'Große Datei', ['Eine große Datei (über 200 000 Blöcke) importieren, einmal abbrechen, dann ganz laden.'], 'Fortschritt und Abbrechen funktionieren, Seite bleibt bedienbar.', '#/bibliothek'),
      v('DATEI-04', 'Licht, Nacht, Schatten', ['Im 3D-Betrachter Licht/Nacht/Sonne umschalten, Spawnprüfung ansehen.'], 'Dunkle Stellen werden als Spawnflächen markiert, Ansicht bleibt flüssig.'),
      k('DATEI-05', 'Große Datei (SIZE-01)', ['Eine große .schem oder .litematic öffnen (über 250 000 Zellen Box, gern über 1 Mio. Blöcke, bis 64 MB).', 'Als Bauteil übernehmen und in ein Projekt legen.'], 'Import läuft mit Fortschritt durch, ohne „Bauvolumen überschreitet“; der Bericht sagt, dass nur Blöcke übernommen sind und die Luft unausgewählt bleibt. Über 4 Mio. Blöcke oder 16,7 Mio. Zellen Box: klare Meldung mit dem Rat, die Datei zu teilen.', '#/'),
    ],
  },
  {
    id: 'KARTE', kind: 'planer', title: 'Weltkarte, Weltbuilder und Weltimport',
    intro: 'Projekte in der Welt platzieren, Wege und Bauplätze planen, Gelände aus der eigenen Welt übernehmen.',
    cases: [
      k('KARTE-01', 'Projekte auf der Karte', ['Weltkarte öffnen, Projekt platzieren, verschieben, drehen.'], 'Lage bleibt nach dem Neuladen; Koordinaten stimmen mit dem Projekt überein.', '#/karte'),
      k('KARTE-02', 'Weltbuilder: Löschen und Rückgängig', ['Bauplatz, Weg und Punkt anlegen.', 'Mehrfachauswahl (Rahmen, Taste A), Kontextmenü (Rechtsklick), Löschen mit Entf.', 'Strg+Z / Strg+Y.'], 'Alles lässt sich löschen; ein Rückgängig bringt die ganze Löschung zurück.', '#/karte'),
      v('KARTE-03', 'Duplizieren, Drehen, Ebenen', ['Objekte duplizieren, drehen/spiegeln, Wegecken ziehen, Ebenen ein-/ausblenden.'], 'Ergebnis wie erwartet, Objektliste stimmt mit der Karte überein.', '#/karte'),
      v('KARTE-04', 'Weltimport aus Regionsdateien', ['Weltimport öffnen, Regionsdateien (.mca) der eigenen Welt wählen, Bereich auswählen, übernehmen.'], 'Ausschnitt erscheint als Bauteil; Gelände-Reiter im Projekt kann ihn nutzen.', '#/welt'),
      k('KARTE-05', 'Zonen und benannte Ebenen', ['Werkzeug „Zone“ (Taste Z), drei oder mehr Ecken klicken, Eingabe beendet; Art (Wohnen, Farmen, …) und Farbe setzen.', 'Zone und einen Punkt wählen, in der Auswahlleiste „Ebene zuweisen“ → „Neue Ebene …“ (z. B. „Phase 2“).', 'Die neue Ebene unter „Benannt:“ ausblenden, wieder einblenden; in der Objektliste nach der Ebene filtern.', 'Seite neu laden.'], 'Zone liegt als gefüllte Fläche mit Namen und Fläche (Blöcke²) auf der Karte; ausgeblendete Ebenen verschwinden samt Auswahl; nach dem Neuladen sind Zone, Ebene und Farbe noch da.', '#/karte'),
      v('KARTE-06', 'Messen, Höhenprofil, Route übers Gelände', ['Messen (M): drei Punkte klicken, Eingabe beendet, Escape löscht.', 'Gelände laden („Gelände um mich lesen“ mit Mod oder eine Geländeaufnahme), einen Weg über einen Hang zeichnen.', 'Im Bearbeitungsfeld des Wegs „⤳ Route übers Gelände“.'], 'Messung nennt Luftlinie, Weg zu Fuß, Punkte, Nether-Entfernung und bei drei oder mehr Punkten die Fläche. Das Höhenprofil zeigt Y-Bereich, Auf-/Abstieg und Stufen; die Route weicht Wasser und Steilstufen aus (oder meldet, dass es keinen Weg gibt).', '#/karte'),
    ],
  },
  {
    id: 'SYS', kind: 'planer', title: 'Systemcheck und Stabilität',
    intro: 'Prüft, ob die Seite richtig ausgeliefert ist und die gespeicherten Daten stimmen.',
    cases: [
      k('SYS-01', 'Systemcheck', ['Systemcheck öffnen, „Geladene Dateien prüfen“ und „Datencheck starten“.'], 'Alle Dateien stimmen, Datencheck ohne Fehler (oder verständliche Befunde).', '#/system'),
      k('SYS-02', 'Fehler melden ausprobieren', ['Unter „Testphase → Fehler melden“ einen Probebericht ausfüllen, kopieren und als Datei speichern (nicht abschicken).'], 'Bericht enthält Build, Browser, Grafik und Protokoll, aber keine Projektdaten.', '#/testphase?melden'),
    ],
  },
  {
    id: 'MOD', kind: 'mod', title: 'Mod: Installation und Hologramm',
    intro: 'Die Bauplaner-Mod im Spiel (Fabric oder NeoForge, Minecraft 26.3). Nur Client – auf dem Server muss nichts installiert werden. Bei jedem Fehler im Spiel `/bauplaner diagnose` eingeben und den Bericht anhängen.',
    cases: [
      k('MOD-01', 'Installation', ['Auf der Seite „Spiel“ die passende .jar laden (Loader und Version wählen).', 'Alte bauplaner-bridge-*.jar aus dem mods-Ordner löschen, neue hineinlegen (Fabric: Fabric API nötig).', 'Spiel starten.'], 'Spiel startet ohne Absturz; `/bauplaner` wird im Chat vervollständigt.', '#/mod'),
      k('MOD-02', 'Plan einblenden', ['Im Planer ein Projekt als .schem exportieren und nach <Instanz>/bauplaner/plans/ kopieren.', 'Im Spiel auf einen Block schauen, J drücken, Plan anklicken.'], 'Hologramm erscheint am angeschauten Block: fehlende Blöcke durchscheinend, rechts der Fortschritt.'),
      k('MOD-03', 'Ausrichten', ['Pfeiltasten, Bild↑/↓, Ende (drehen), Einfg (spiegeln), Pos1 (zum angeschauten Block).'], 'Hologramm bewegt sich wie erwartet; Lage bleibt nach Neustart der Welt erhalten.'),
      k('MOD-04', 'Bauen und Fehlerfinder', ['Einige Blöcke richtig, einen falsch und einen falsch herum setzen.', 'Punkt (.) drücken.'], 'Richtige Blöcke verschwinden aus dem Hologramm, falsche rot, falsch ausgerichtete gelb; Punkt zeigt den nächsten Fehler.'),
      k('MOD-05', 'Materialliste', ['Num 7 oder `/bauplaner material`.'], 'Liste zeigt offen / im Inventar (auch Shulkerkisten) / noch holen.'),
      v('MOD-06', 'Ebenen und Bauabschnitte', ['Num 6 (Ebenenmodus), Num 9 / Num * (Ebene hoch/runter).', 'Plan mit Bauabschnitten: Num / oder `/bauplaner abschnitt`.'], 'Hologramm, Fortschritt und Material gelten nur für die gewählte Ebene bzw. den Abschnitt.'),
      v('MOD-07', 'Platzierhilfe', ['Im Menü J die Platzierhilfe auf „an“, „warnen“, „aus“ stellen und jeweils einen falschen Block setzen.'], '„an“ verhindert falsche Blöcke, „warnen“ zeigt nur einen Hinweis, „aus“ tut nichts.'),
      v('MOD-08', 'Röntgensicht und Texturen', ['Num - (Röntgensicht), `/bauplaner texturen`.'], 'Fehlende Blöcke durch Wände sichtbar; ohne Texturen farbige Kästen.'),
      v('MOD-09', 'Mit Shadern und Modpack', ['Mit Iris/Shaderpaket und dem eigenen Modpack spielen.'], 'Hologramm bleibt sichtbar (blau getönt); `/bauplaner diagnose` meldet keine Tastenkonflikte.'),
      k('MOD-10', 'Mehrspieler-Server (Paper)', ['Auf einem Server (ohne Mod auf dem Server) dieselben Schritte wiederholen, besonders die Platzierhilfe.'], 'Alles wie im Einzelspieler; kein Kick, keine „illegal packet“-Meldung; Platzierung je Server gespeichert.'),
      v('MOD-11', 'Großer Plan', ['Plan mit über 10 000 Blöcken einblenden und herumlaufen.', '`/bauplaner leistung` lesen, dann `niedrig` und `hoch` ausprobieren.'], 'Bildrate bleibt spielbar; weiter entfernte Blöcke werden zu Kisten (Grenze bei „normal“: Texturen bis 40 Blöcke, höchstens 30 000 offene Blöcke). Greift die Grenze, steht rechts „Zeigt die nächsten …“; „niedrig“ halbiert, „hoch“ verdoppelt sie.'),
      v('MOD-15', 'Sehr großer Plan (Mod 0.9.0, SIZE-01)', ['Einen Plan mit über 1 Mio. Blöcken oder einer Box über 4 Mio. Zellen einblenden (Datei in plans/ oder von der Karte senden).', 'Mit den Pfeiltasten und Ende verschieben und drehen.', '`/bauplaner diagnose`.'], 'Das Spiel hängt nicht: rechts steht kurz „Plan wird vorbereitet …“, dann erscheint das Hologramm am neuen Ort. Die Diagnose nennt Planbox, Chunks, Leistung und Java-Speicher.'),
      v('MOD-12', 'Abschnitt fertig', ['Einen Bauabschnitt zu Ende bauen.'], 'Genau eine Chat-Meldung nennt den nächsten Abschnitt; HUD-Zeile „Abschnitt k/n“ stimmt mit dem Planer überein.'),
      v('MOD-13', 'Platzierhilfe im Detail', ['Falschen Block in die Hand nehmen und setzen; Treppe falsch herum setzen; richtigen Planblock abbauen; Num 8 auf einen Planblock.', 'Tür, Kiste, Knopf bedienen; Gerüst auf Luft-Feldern setzen.'], 'Falsches wird nicht gesetzt und der Hinweis erklärt es; Num 8 nimmt den Planblock in die Hand; Bedienen und Gerüst gehen normal; mit Tool Switcher kein ungewollter Werkzeugwechsel.'),
      v('MOD-14', 'Tasten umbelegen', ['Optionen → Steuerung → Bauplaner: eine Taste umbelegen, Spiel neu starten.'], 'Belegung bleibt; `/bauplaner diagnose` zeigt keine Konflikte mit Jade (Num 0–5), Xaero (Num +), Voice Chat (H/N), Iris (I/K/R). Meldet er einen (alte Belegung aus einer früheren Version, z. B. „Ebene tiefer“ auf Num 3), die Taste dort zurücksetzen und erneut prüfen.'),
    ],
  },
  {
    id: 'LIVE', kind: 'mod', title: 'Mod: Verbindung mit dem Planer',
    intro: 'Live-Karte und Übergabe zwischen Planer und Spiel über 127.0.0.1 (nur auf demselben Rechner).',
    cases: [
      k('LIVE-01', 'Koppeln', ['Im Spiel `/bauplaner verbinden`.', 'Im Planer Weltkarte → Kasten „Spiel“ → Verbinden, Code eingeben. Browserfrage „Geräte im lokalen Netzwerk“ zulassen.'], 'Verbunden; Karte zeigt die Spielerposition mit Spur.', '#/karte'),
      k('LIVE-02', 'Plan ins Spiel senden', ['Bei einem Projekt auf der Karte „▶ Ins Spiel senden“.'], 'Hologramm erscheint im Spiel genau an der Kartenlage, ohne Datei zu kopieren.', '#/karte'),
      v('LIVE-03', 'Gelände und Weltplan', ['„Gelände um mich lesen“; „Weltplan ins Spiel senden“.'], 'Geladene Chunks werden eingefärbt; Wege/Bauplätze erscheinen im Spiel als Linien.', '#/karte'),
      v('LIVE-07', 'Wiederverbinden', ['Spiel beenden und neu starten, Planer offen lassen.'], 'Die Mod verbindet sich von selbst wieder; Karte zeigt die Position erneut.', '#/karte'),
      v('LIVE-04', 'Lage zurück und Fortschritt', ['Hologramm im Spiel verschieben, im Planer „Lage aus dem Spiel übernehmen“.', 'Weiterbauen und Fortschritt im Planer beobachten.'], 'Projekt auf der Karte springt an die neue Lage; Fortschritt aktualisiert sich.', '#/karte'),
      v('LIVE-05', 'Spielaufnahme', ['`/bauplaner scan` (bzw. Plan + Anker + Scan wie in der Anleitung auf der Seite „Spiel“).', 'Aufnahme im Projekt unter „Bauen“ → „Spielaufnahme importieren“.'], 'Planer zeigt je Bauschritt bestätigt / teilweise / abweichend passend zum Bau.'),
      v('LIVE-08', 'Weltplan mit alter und neuer Mod', ['Mit der Mod verbunden: „📍 Punkt, wo ich stehe“, „Spur als Weg“ (nach ein paar Schritten im Spiel).', 'Eine Zone und eine Notiz anlegen, „Weltplan ins Spiel senden“.', 'Zeile „Mod kann: …“ im Kasten „Spiel“ lesen.'], 'Punkt liegt genau an der Spielerposition mit Spielhöhe. Mit einer Mod ohne „marks2“ bleiben Zonen und neue Punktarten nur auf der Karte, die Meldung nennt sie; mit „marks2“ erscheinen sie im Spiel, mit „players“ stehen Mitspieler in Sichtweite auf der Karte.', '#/karte'),
      v('LIVE-09', 'Großen Plan senden (SIZE-01)', ['Ein großes Projekt (z. B. Großprojekt Hauptstadt oder ein Import über 1 Mio. Blöcke) auf der Karte „▶ Ins Spiel senden“.', 'Wenn möglich einmal mit Mod 0.8.0 und einmal mit 0.9.0.'], 'Mit 0.9.0: Meldung „Großer Plan …“, das Hologramm erscheint ohne Hänger. Mit 0.8.0 und Box über 4 Mio. Zellen: der Planer sendet nicht und nennt Mod 0.9.0; „Mod kann“ zeigt „große Pläne“ nur bei 0.9.0.', '#/karte'),
      k('LIVE-06', 'Diagnose aus dem Spiel', ['`/bauplaner diagnose` eingeben.'], 'Chat meldet die Datei in bauplaner/diagnose/ und dass der Bericht in der Zwischenablage liegt; Bericht nennt Mod-Version, Loader, Mods, Tasten, Hologramm-Zustand.'),
    ],
  },
];

export const ALL_CASES: readonly TestCase[] = TEST_AREAS.flatMap(a => a.cases);

export function areaOf(caseId: string): TestArea | undefined {
  return TEST_AREAS.find(a => a.cases.some(c => c.id === caseId));
}
