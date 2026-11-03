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
  /** Planer (Browser), Mod (im Spiel) oder Server (Paper-Plugin, nur auf einem echten Server testbar). */
  readonly kind: 'planer' | 'mod' | 'server';
  readonly intro: string;
  readonly cases: readonly TestCase[];
}

const k = (id: string, title: string, steps: readonly string[], expect: string, start?: string): TestCase => ({ id, title, steps, expect, level: 'kern', ...(start && { start }) });
const v = (id: string, title: string, steps: readonly string[], expect: string, start?: string): TestCase => ({ id, title, steps, expect, level: 'vertieft', ...(start && { start }) });

/** Anzeigename der Art eines Bereichs. */
export const AREA_KIND_LABEL: Readonly<Record<TestArea['kind'], string>> = { planer: 'Planer', mod: 'Mod', server: 'Server' };

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
      k('PROJ-09', 'Projektplanung: Meilensteine und Abhängigkeiten', ['Tab „Baustelle“: Vorschlag „Fundament · Rohbau · Dach“ übernehmen.', 'Tab „Planung“: Vorschläge aus Geometrie übernehmen, einen Meilenstein mit Termin anlegen und Abschnitte zuordnen.', 'Versuchen, eine Abhängigkeit „Fundament erst nach Dach“ anzulegen.', 'Neu laden (F5).'], 'Zeitplan zeigt Balken je Abschnitt und wartende Abschnitte; der Meilenstein zeigt im Plan/verspätet und voraussichtliches Datum; der Kreis wird mit Meldung abgelehnt; alles bleibt nach dem Neuladen. Die Projektkarte zeigt den nächsten Meilenstein.'),
      v('PROJ-10', 'Mehrere Bauleute und Bauzettel', ['Tab „Planung“: zwei Bauleute mit verschiedenem Tempo anlegen, Abschnitte zuweisen (einen Abschnitt beiden).', 'Startdatum setzen, 5 Bautage je Woche wählen.', '„Bauzettel kopieren“ und „Bauprogramm als Text“ ausführen.'], 'Zeitplan zeigt je Bauleute eine Spur, gemeinsame Abschnitte sind kürzer; Daten überspringen das Wochenende; Bauzettel nennt die eigenen Abschnitte mit fehlenden Items und Sammelzeit.'),
      v('PROJ-11', 'Großprojekt mit Phasen planen', ['Ein Projekt aus Basisplaner oder Anlage anlegen (Abschnitte „Phase 1 …“).', 'Tab „Planung“ → „Meilensteine aus Abschnittsnamen“.'], 'Je Phase ein Meilenstein, Wege/Platz als „Erschließung“ zuerst; jede Phase wartet auf die vorige; kritischer Pfad läuft durch alle Phasen.'),
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
    id: 'TEAMBAU', kind: 'planer', title: 'Gemeinsam bauen (Team)',
    intro: 'Mehrere Spieler an einem Projekt: Reiter „Team“ im Planer und Teambefehle des Paper-Plugins. Für den Austausch zwei Browser oder zwei Rechner nehmen (z. B. normales und privates Fenster).',
    cases: [
      k('TEAMBAU-01', 'Team gründen und Plan freigeben', ['Projekt mit Bauabschnitten öffnen (Reiter „Baustelle“ → Vorschlag „Fundament · Rohbau · Dach“).', 'Reiter „Team“: Name und Minecraft-Name eintragen, „Team gründen“.', '„Aktuellen Plan freigeben“, kurze Beschreibung eingeben.'], 'Du bist Bauleitung; oben steht „Planstand N gilt“; im Reiter „Export“ gibt es die neue Revision.'),
      k('TEAMBAU-02', 'Mitspieler einladen', ['„Teampaket mit Plan“ herunterladen und im zweiten Browser auf der Startseite „Teampaket öffnen“.', 'Dort „Ich bin neu“ mit Namen und Minecraft-Namen, „Beitreten“.'], 'Das Projekt erscheint mit allen Bauteilen und Abschnitten; der Mitspieler ist Helfer und sieht denselben Planstand.'),
      k('TEAMBAU-03', 'Abschnitt übernehmen, melden, bestätigen', ['Im zweiten Browser einen freien Abschnitt „Übernehmen“, dann unter „Meine Aufgaben“ „Fertig melden“.', '„Meldecode kopieren“ und den Code im ersten Browser unter „Einlesen“ einfügen, „Prüfen“, „Übernehmen“.', 'Im ersten Browser „✓ Bestätigen“.'], 'Vorschau nennt die neuen Ereignisse; danach steht der Abschnitt auf „fertig gemeldet“ bzw. „bestätigt“ mit dem richtigen Namen. Strg+Z nimmt das Einlesen zurück.'),
      v('TEAMBAU-04', 'Gleichzeitig denselben Abschnitt nehmen', ['Beide Browser übernehmen denselben freien Abschnitt, ohne vorher auszutauschen.', 'Meldecodes in beide Richtungen einlesen.'], 'In beiden Browsern gehört der Abschnitt derselben Person (wer zuerst war); oben erscheint ein Hinweis „… wollte übernehmen, war schon vergeben“. Nichts geht verloren.'),
      v('TEAMBAU-05', 'Beiträge, Sammelaufträge, Notizen', ['Gebaute Blöcke und eine Lieferung melden, einen Sammelauftrag übernehmen, eine Notiz mit @Name schreiben.', 'Austauschen und „Statustext für Discord“ ansehen.'], 'Mitgliederliste zählt Blöcke/Items; die erwähnte Person sieht die Notiz unter „Meine Aufgaben“; der Statustext listet Abschnitte, Sammelaufträge und offene Notizen.'),
      v('TEAMBAU-06', 'Team auf dem Paper-Server', ['Projekt auf der Weltkarte platzieren, im Reiter „Team“ „Serverdatei herunterladen“.', 'Datei nach plugins/BauplanerBridge/team/ legen, im Spiel `/bauplaner team laden` (als OP).', 'Als Mitspieler `/bauplaner team`, `/bauplaner nehmen 2`, im Abschnitt stehen, `/bauplaner zeigen 2`, `/bauplaner fertig`, `/bauplaner notiz frage …`.', '`/bauplaner team export` und die Datei im Planer unter „Einlesen“ wählen.'], 'Im Spiel: Aktionsleiste „Abschnitt 2 · … · in Arbeit“, Partikelumriss, verständliche Antworten, Hinweis beim Bauen im fremden Abschnitt. Im Planer kommen die Meldungen mit „vom Server“ an.'),
      v('TEAMBAU-07', 'Baunachweis auf dem Server', ['Mit zwei Spielern in Abschnitten des Teams Blöcke setzen und abbauen (einer innerhalb, einer außerhalb der Abschnitte).', '`/bauplaner beitrag` und als Baumeister `/bauplaner beitrag alle`.', 'Ein Spieler: `/bauplaner nachweis aus`, dann wieder `beitrag alle`.', '`/bauplaner team export` und im Planer einlesen, Bereich „Baunachweis & Lager“ ansehen.'], 'Gezählt wird nur in Teamabschnitten; je Abschnitt stimmen die Anteile; nach „nachweis aus“ verschwinden die Zahlen dieses Spielers überall (auch frühere); der Planer zeigt dieselben Zahlen wie der Server.'),
      v('TEAMBAU-08', 'Lagerkiste des Teams', ['Als Baumeister auf eine Kiste schauen: `/bauplaner lager setzen Hauptlager`.', 'Als anderer Spieler etwas hineinlegen und die Kiste schließen, später etwas herausnehmen (auch eine gefüllte Shulkerkiste einlegen).', '`/bauplaner lager`; Ausfuhr im Planer einlesen, „Bestand ins Baustellen-Lager übernehmen“.'], 'Beim Schließen meldet die Aktionsleiste „+64 stone“ bzw. „-32 …“; der Inhalt der Shulkerkiste wird mitgezählt; im Planer stehen Bestand, „ins Lager“ und „entnommen“ beim richtigen Spieler; das Lager im Reiter „Baustelle“ übernimmt die Mengen (Strg+Z möglich).'),
      v('TEAMBAU-09', 'Teambau im Spiel mit der Mod 0.10.0', ['Mod 0.10.0 installieren, im Planer Reiter „Team“ „Ich bin“ wählen, im Menü „Spiel“ koppeln, Plan ins Spiel schicken.', 'Im Reiter „Team“ unter „Mit Spiel abgleichen“ „Jetzt abgleichen“.', 'Im Spiel `/bauplaner team abschnitte`, `/bauplaner team nehmen 2`, `/bauplaner team mein`, `/bauplaner team material`, `/bauplaner team notiz frage Treppe?`.', 'Auf dem Server mit Plugin: `/bauplaner team erlauben`, dann `/bauplaner team status`; im Planer „Meldungen vom Server holen“.'], 'Abschnitte erscheinen als Rahmen in der Farbe ihres Inhabers, das HUD zeigt „Mein Auftrag … %“; nur der eigene Abschnitt ist eingeblendet. Beim nächsten Abgleich zeigt die Website die Meldungen aus dem Spiel zur Übernahme. Ohne `erlauben` sendet die Mod nichts an den Server (Status „Plugin da – /bauplaner team erlauben“); mit Erlaubnis steht „live“ und Meldungen anderer Spieler kommen an.'),
      k('TEAMBAU-21', 'Großen Abschnitt in Arbeitspakete teilen und verteilen', ['Reiter „Team“ → „Planung“: unter „Arbeitspakete“ den größten Abschnitt wählen, „Teilen in 3 Pakete“, Art „automatisch“.', 'Vorschau prüfen, „In 3 Pakete teilen“.', 'Unter „Zuteilung“ die Mitspieler anhaken und „Zuweisungen übernehmen“.'], 'Drei Pakete „… · Teil 1/3“ ersetzen den Abschnitt an derselben Stelle (Strg+Z nimmt es zurück); der Vorschlag verteilt nach offener Arbeit, Pakete übereinander bleiben möglichst bei einer Person; Abwesende bekommen nichts.'),
      v('TEAMBAU-22', 'Zeitplan und Material je Spieler', ['„Planung“ → „Zeitplan“: Bautage je Woche einstellen.', '„Material im Team“: bei einem Item „Ich sammle“, bei einem Mitglied „Packliste kopieren“.'], 'Balken je Mitglied, Wartezeiten auf Vorarbeit und die entscheidende Kette sind sichtbar; „Fertig in … Bautagen“ ist kleiner als „allein“. Das Item zählt danach unter „wird gesammelt“; die Packliste nennt Stacks und Shulkerkisten.'),
      v('TEAMBAU-23', 'Fortschritt, Achtung und Planänderung', ['„Fortschritt“ öffnen, einen Abschnitt im zweiten Browser fertig melden und austauschen.', 'Plan im Editor ändern, „Mit Planstand N vergleichen“.'], 'Brett nach Status, je Mitglied abgehakt/gemeldet/bestätigt getrennt; unter „Achtung“ erscheinen gemeldete Abschnitte mit Haken-Lücke oder Planänderung mit Knopf „Bestätigen“ bzw. „Nacharbeit verlangen“.'),
      k('TEAMBAU-24', 'Übergabe, Abwesenheit, Bauleitung übergeben', ['„Rechte & Übergabe“: eigenen Abschnitt „übergeben an …“ wählen; im anderen Browser nach Austausch „Annehmen“.', 'Abwesenheit mit Datum eintragen und austauschen.', 'Als Bauleitung „Bauleitung übergeben“.'], 'Bis zur Annahme bleibt der Abschnitt beim alten Inhaber; danach wechselt er mit Notiz. Abwesende erscheinen unter „Achtung“ und im Zeitplan erst nach Rückkehr. Nach der Übergabe ist man Baumeister; es bleibt immer eine Bauleitung.'),
    ],
  },
  {
    id: 'LAGER', kind: 'server', title: 'Server: geprüfte Lagerkisten',
    intro: 'Lagerkisten des Teams im Paper-Plugin (COOP-05): markieren, zählen, prüfen, schützen, Buchungen und Bedarf. Braucht einen Paper-Server mit dem Plugin (1.18.2 bis 26.3), die Serverdatei eines Teams und zwei Spieler: einer mit OP oder Rolle Baumeister, einer als Helfer. Die Mod wird dafür nicht gebraucht. Bei jedem Fehler die Ausgabe von `/bauplaner lager info` und die Serverlog-Zeilen mit „BauplanerBridge“ anhängen.',
    cases: [
      k('LAGER-01', 'Plugin installieren und Lager markieren', ['Auf der Seite „Spiel“ die Paper-Jar laden und nach plugins/ legen, alte bauplaner-bridge-paper-*.jar löschen, Server neu starten.', 'Serverdatei des Teams nach plugins/BauplanerBridge/team/ legen, `/bauplaner team laden`.', 'Als Baumeister eine Kiste in einem Abschnitt aufstellen, daraufschauen und `/bauplaner lager markieren Steinlager`.'], 'Antwort „Lager „Steinlager“ markiert“, „Zugeordnet: Abschnitt …“ und „erstmals gezählt“. `/bauplaner lager liste` zeigt das Lager als „geprüft“.', '#/mod'),
      k('LAGER-02', 'Einlegen und entnehmen wird gebucht', ['Als Helfer die Kiste öffnen: Aktionsleiste lesen.', '64 Stein hineinlegen, 10 wieder herausnehmen, Kiste schließen.', '`/bauplaner lager verlauf` (auf die Kiste schauen).'], 'Die Aktionsleiste nennt Lager, Abschnitt, Status und „du darfst einlegen und entnehmen“. Nach dem Schließen: „Gebucht im Lager … +54 stone“. Der Verlauf zeigt die Buchung mit deinem Namen.'),
      k('LAGER-03', 'Schutzstufen', ['Als Baumeister `/bauplaner lager schutz abschnitt` auf die Kiste.', 'Als Helfer ohne den Abschnitt: etwas herausnehmen (auch Umschalt-Klick und Doppelklick), dann etwas hineinlegen.', 'Als Baumeister `/bauplaner lager schutz gesperrt`; als Helfer wieder hineinlegen.'], 'Bei „abschnitt“ wird das Herausnehmen verhindert (Hinweis im Chat), Hineinlegen geht. Bei „gesperrt“ geht beides nicht. Kein Item verschwindet oder verdoppelt sich.'),
      k('LAGER-04', 'Abbauen, Trichter, Explosion', ['Als Helfer versuchen, das Lager abzubauen.', 'Einen Trichter unter das Lager setzen; einen Trichter mit Items darüber.', 'Neben dem Lager TNT zünden (Testwelt!).'], 'Abbauen wird verhindert („darf nur ein Baumeister abbauen“). Der untere Trichter zieht nichts heraus, der obere füllt ein (Verlauf: „Trichter: +…“). Das Lager übersteht die Explosion samt Inhalt.'),
      k('LAGER-05', 'Abweichung erkennen und siegeln', ['Mit einem anderen Plugin, `/item replace` oder im Kreativmodus per Mittelklick-Kopie den Inhalt ändern, ohne die Kiste zu öffnen (z. B. `/item replace block <x y z> container.0 with dirt 5`).', 'Als Baumeister die Kiste öffnen oder `/bauplaner lager pruefen`.', '`/bauplaner lager siegeln Aufgeräumt`.'], 'Beim Prüfen: „abweichend – +5 dirt“, Baumeister bekommen eine Meldung (auch beim nächsten Betreten des Servers). Nach dem Siegeln ist das Lager wieder „geprüft“; `/bauplaner lager info` nennt, wer gesiegelt hat.'),
      v('LAGER-06', 'Doppelkiste und Shulkerkisten', ['An ein markiertes Lager eine zweite Kiste anbauen (als Baumeister; als Helfer versuchen).', 'Eine gefüllte Shulkerkiste hineinlegen, schließen, `/bauplaner lager info`.'], 'Helfer können nicht anbauen; beim Baumeister gehören beide Hälften zum Lager. Der Inhalt der Shulkerkiste wird mitgezählt.'),
      v('LAGER-07', 'Bedarf und Sammelaufträge', ['Serverdatei mit Materialbedarf (aktueller Planer) laden.', '`/bauplaner lager bedarf 1` und `/bauplaner lager bedarf`.', '`/bauplaner sammle stone` ohne Menge.'], 'Liste je Material: Bedarf, im Lager, fehlt (rot) oder ✓. „sammle“ ohne Menge übernimmt genau die fehlende Menge abzüglich dessen, was andere schon sammeln.'),
      v('LAGER-08', 'Neustart und Planer', ['Server neu starten; `/bauplaner lager liste`.', '`/bauplaner team export`, die Datei im Planer im Reiter „Team“ unter „Einlesen“ wählen.', 'Bereich „Baunachweis & Lager“ ansehen.'], 'Nach dem Neustart sind alle Lager mit Status da. Im Planer erscheint jedes Lager mit Status, Abschnitt, Schutz, offener Abweichung, Siegel und den Buchungen je Spieler und Trichter.', '#/'),
      v('LAGER-09', 'Einstellung „hinweis“', ['In plugins/BauplanerBridge/config.yml `lager: modus: hinweis` setzen, Server neu starten.', 'Als Helfer aus einem „gesperrt“-Lager etwas nehmen.'], 'Die Entnahme geht, wird aber gebucht; Hinweis an den Spieler und eine Meldung an Baumeister.'),
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
      k('MOD-16', 'Befehlsseite im Plan-Menü (Mod 0.11.0)', ['Plan ins Spiel schicken, J drücken, unten links „Befehle & Status“.', 'Reiter „Status“ lesen, dann Reiter „Hologramm“ → „Fortschritt“ und „Nächster Abschnitt“.', 'Reiter „Team“ → „Abschnitt zeigen …“, Nummer eintragen, „Ausführen“.', 'Auf einem Server mit Bauplaner-Plugin: Reiter „Lager“ → „Lagerkisten“; auf eine markierte Kiste schauen und „Diese Kiste“. Auf einem Server ohne Plugin den Reiter „Lager“ öffnen.', 'Bei kleinem Fenster (oder GUI-Größe 3–4) durch die Reiter blättern (◀ ▶ unten links).'], 'Der Status zeigt Plan, Fortschritt, Ebenen/Abschnitte, Team und ob der Server das Plugin hat. Jeder Klick gibt dieselbe Antwort wie der getippte Befehl, sie erscheint unten auf der Seite. Ohne Plugin sind die Serverknöpfe ausgegraut und nennen beim Darüberfahren den Grund; Knöpfe für eine Kiste werden erst aktiv, wenn man auf eine schaut. Nichts ist abgeschnitten oder überlappt.'),
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
