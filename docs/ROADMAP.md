# Verbindliche Roadmap und Fortschritt

Stand: 2026-11-06T15:49:33.071Z. Automatisch erzeugt aus [roadmap.json](roadmap.json); nicht direkt bearbeiten. Baseline: [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2).

## So liest du den Stand

- Jede Aufgabe hat eine feste ID, echte Teilschritte, Abhängigkeiten, Nachweise und eine nächste Aktion.
- **Implementiert ≠ geprüft ≠ auf Main ≠ live.** „Geprüft“ gilt nur für den beschriebenen Umfang und den genannten Nachweis.
- Teilschritte sind abzählbare Ergebnisse, keine geschätzten Fertigstellungsprozente. Eine Phase ist erst nach ihren Austrittskriterien abgeschlossen.
- Main-/Pages-Spalten nennen den letzten eingetragenen Nachweis; jüngste Integration ist über Git-Historie und das [Live-Manifest](https://freadeax.github.io/Minecraft-Bauplaner/deployment.json) nachprüfbar. Ein neuer Commit kann den eigenen Hash nicht enthalten.
- Historische Nachweise ersetzen keinen aktuellen Browser-, Geräte- oder Spieltest.

| Status | Pakete |
|---|---:|
| ⏳ Offen | 6 |
| 🚧 In Arbeit | 8 |
| ⛔ Blockiert | 0 |
| 🧩 Implementiert · Abnahme offen | 95 |
| ✅ Im beschriebenen Umfang geprüft | 26 |
| ⏸ Zurückgestellt | 2 |

## Überblick nach Bereichen

Je Bereich die offenen Pakete mit Status, Priorität, zuständigem Thread und dem, was nur Philipp tun kann. „Verwaist“ heißt: Arbeit offen, aber kein laufender Thread zuständig. Abgeschlossene Pakete stehen darunter in einer Zeile. Pflege: Felder `area`, `thread`, `philipp`, `orphans` je Aufgabe in roadmap.json; neue Wünsche ohne Paket als Eingang (`intake`).

| Bereich | Offen | Verwaist | Nur Philipp | Geprüft |
|---|---:|---:|---:|---:|
| [Planer: Werkstatt, Ansicht, Weltkarte, Gelände](#bereich-planer) | 27 | 2 | 27 | 2 |
| [Bibliothek, Generatoren und Großprojekte](#bereich-bibliothek) | 10 | 0 | 10 | 4 |
| [Projektmodul: Baustelle, Bauanleitung, Planung](#bereich-projekt) | 12 | 0 | 9 | 1 |
| [Teambau live (Planer, Mod, Plugin zusammen)](#bereich-team) | 14 | 0 | 14 | 0 |
| [Volumenlimit und Übertragung großer Pläne](#bereich-groesse) | 1 | 0 | 1 | 0 |
| [Client-Mod (Fabric, NeoForge, Forge)](#bereich-mod) | 12 | 0 | 10 | 0 |
| [Paper-Plugin (Server)](#bereich-plugin) | 5 | 0 | 4 | 0 |
| [Modrinth-Veröffentlichung](#bereich-modrinth) | 1 | 0 | 0 | 0 |
| [Performance und Stabilität](#bereich-perf) | 5 | 0 | 2 | 3 |
| [Kern, Minecraft-Daten und Dateiformate](#bereich-kern) | 14 | 0 | 7 | 8 |
| [Testphase, Qualität und Betrieb](#bereich-qa) | 2 | 1 | 2 | 8 |
| [Zurückgestellt (Backend-Option, ohne Auftrag)](#bereich-spaeter) | 6 | 0 | 0 | 0 |

<a id="bereich-planer"></a>

### Bereich: Planer: Werkstatt, Ansicht, Weltkarte, Gelände

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [BACKUP-02](#backup-02) | Sicherungserinnerung und Abschnittsrevisionen | 🧩 Implementiert · Abnahme offen 2/2 | P1 | „Große Testphase vorbereiten und betreuen“ | Sicherungs-Download in Safari; Rückmeldung, ob 7 Tage für die Erinnerung passen. |
| [EDIT-01](#edit-01) | Mehrfachauswahl und sichtbare Freiraumhüllen | 🧩 Implementiert · Abnahme offen 2/2 | P1 | „Große Testphase vorbereiten und betreuen“ | Mehrfachauswahl auf echten Geräten (QA-02). |
| [EDIT-02](#edit-02) | Blockeditor | 🧩 Implementiert · Abnahme offen 5/5 | P1 | „Große Testphase vorbereiten und betreuen“ | Gesetzte und gedrehte Zustände im Spiel prüfen. |
| [EDIT-03](#edit-03) | Werkstatt vertiefen | 🧩 Implementiert · Abnahme offen 5/5 | P1 | „Große Testphase vorbereiten und betreuen“ | Schablonen-Zustände (Tür, Treppe, Laterne) im Spiel prüfen. |
| [EDIT-04](#edit-04) | Kreativwerkzeuge aus dem Planer-Vergleich | 🧩 Implementiert · Abnahme offen 7/8 | P1 | „Mod-Werkzeuge und Planer-Anbindung erweitern“ · 1 verwaist | Gespiegelte und gedrehte Zustände (Türen, Truhen, Schienen) im Spiel (S07).<br>Bauhilfen Symmetrie und Kurven in der Mod (MOD-18, MOD-19). |
| [EDIT-05](#edit-05) | Auswahl- und Formwerkzeuge aus Editor-Mods | 🧩 Implementiert · Abnahme offen 6/7 | P1 | „Große Testphase vorbereiten und betreuen“ | Zauberstab, Stapeln, Extrudieren und Wendel in der Werkstatt abnehmen (S07).<br>Gestapelte und gedrehte Bauteile mit Ausstattung im Spiel. |
| [EDIT-06](#edit-06) | Direkt im 3D-Bild bauen | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Direkt im 3D-Bild bauen“ | Im 3D-Bild bauen auf PC und iPad (WERK-08).<br>Truhe und Schild mit Inhalt im Spiel laden (WERK-09). |
| [GFX-01](#gfx-01) | Grafik vertiefen | 🧩 Implementiert · Abnahme offen 5/6 | P1 | „Große Testphase vorbereiten und betreuen“ | Licht und Schatten auf echten GPUs, Firefox/Safari und Handy (S06). |
| [GFX-02](#gfx-02) | Darstellung und Leistung, Runde 2 | 🧩 Implementiert · Abnahme offen 3/4 | P1 | „Darstellung und Leistung weiter verbessern“ | Biom, Leuchtfeuer-Strahl und flüssiges Laden großer Modelle auf dem eigenen Rechner ansehen (S04). |
| [GUIDE-01](#guide-01) | Anleitung „Wie geh ich es an?“ | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Tutorial-Reiter „Wie geh ich es an?“ bauen“ | Anleitung am iPad durchgehen (START-08/09), unklare Sätze melden. |
| [MAP-01](#map-01) | Weltlage und begehbare Projektkarte | 🧩 Implementiert · Abnahme offen 4/4 | P1 | „Große Testphase vorbereiten und betreuen“ | Weltkarte auf echter GPU und mit Touch (QA-02). |
| [MAP-02](#map-02) | Gespeicherte Kartenziele und konkrete Provideradapter | 🧩 Implementiert · Abnahme offen 2/3 | P1 | „Module und Systeme komplex ausarbeiten“ | BlueMap-Marker (.conf) bzw. Dynmap-Befehle auf eurer Server-Karte einspielen und prüfen, ob Projekte, Wege und Punkte an der richtigen Stelle erscheinen (KARTE-08). |
| [MAP-03](#map-03) | Live-Karte mit Spielanbindung | 🧩 Implementiert · Abnahme offen 5/6 | P1 | „Große Testphase vorbereiten und betreuen“ | Kopplung und Senden auf dem LMNT-Server mit Browserfreigabe „lokales Netzwerk“ (S06). |
| [MAP-04](#map-04) | Weltbuilder vertiefen | 🧩 Implementiert · Abnahme offen 6/7 | P1 | „Gruppen und Sperren bis ins Hologramm bringen“ | Langdruck-Menü auf echtem Touch-Gerät (S06). |
| [MAP-05](#map-05) | Planung auf der Live-Karte vertiefen | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Große Testphase vorbereiten und betreuen“ | „Baustand holen“ mit der Mod auf server.lmnt-gaming.net (S05). |
| [MAP-06](#map-06) | Weltkarte in die Tiefe | 🧩 Implementiert · Abnahme offen 7/8 | P1 | „Weltkarte in die Tiefe ausbauen“ | Weltkarte mit Mod 0.8.0 oder neuer im Spiel abnehmen (S08, KARTE-05/06, LIVE-08). |
| [MAP-07](#map-07) | Gedrehte und gespiegelte Projektlagen auf der Weltkarte | 🧩 Implementiert · Abnahme offen 3/4 | P1 | „Module und Systeme komplex ausarbeiten“ | Ein Projekt auf der Weltkarte drehen, ins Spiel senden und mit F3 prüfen; ein im Spiel gedrehtes Hologramm übernehmen (KARTE-07). |
| [TERRAIN-01](#terrain-01) | Geländeaufnahmen für Weltkarte und Anlagen | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Große Testphase vorbereiten und betreuen“ | Kopie deiner 26.3-Welt für die Geländeabnahme (S05). |
| [TERRAIN-02](#terrain-02) | Landschaft gestalten | 🧩 Implementiert · Abnahme offen 6/7 | P1 | „Große Testphase vorbereiten und betreuen“ | Abnahme in deiner eigenen Welt und auf Touch-Geräten (S05). |
| [TERRAIN-03](#terrain-03) | Gelände und Wege im Projekt | 🧩 Implementiert · Abnahme offen 7/8 | P1 | „Gelände, Wege und Küste ausbauen“ | PROJ-19: Weg mit Treppen und Brücke als .litematic in deiner Welt ansehen.<br>BIB-20: Basis mit Wegenetz als Landschaftsweg auf einem echten Hang einfügen und im Spiel ansehen. |
| [TERRAIN-04](#terrain-04) | Gelände direkt aus der Mod | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Gelände direkt aus der Mod übernehmen“ | Mod 0.20.0 installieren, einmal um den Bauplatz laufen, im Reiter „Gelände“ „Gelände aus dem Spiel übernehmen“ und „Gelände aus dem Spiel prüfen“ (S05). |
| [UI-03](#ui-03) | Design-System | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Planer-Oberfläche schön neu gestalten“ | Am iPad die neue Oberfläche ansehen und START-20/21 in #/testphase abhaken (Thema „Werkbank“, Reiter wischen, „Bewegung reduzieren“). |
| [UX-01](#ux-01) | Bedienung des Planers vereinfachen (Struktur und Abläufe) | 🚧 In Arbeit 6/6 | P1 | **verwaist** | Testphase START-10..13: vier Hauptbereiche, Projektschritte mit Kurzsatz, eingeklappte Experten- und Datei-Wege im Browser prüfen.<br>START-12 auf dem iPad: Projektreiter waagerecht wischen, eingeklappte Bereiche per Finger öffnen. |
| [VIEW-01](#view-01) | Vorhandenen Viewer vollständig abnehmen | 🧩 Implementiert · Abnahme offen 1/2 | P1 | „Große Testphase vorbereiten und betreuen“ | Ansicht auf echter GPU und mit Touch prüfen, negative Koordinaten, alle Schnittachsen (S02). |
| [VIEW-02](#view-02) | Minecraft-nahe zustandsabhängige Blockformen | 🧩 Implementiert · Abnahme offen 5/6 | P1 | „Große Testphase vorbereiten und betreuen“ | Mojang-Download und Blockformen in Firefox/Safari und auf echten Geräten (S06). |
| [WORLD-IMPORT-01](#world-import-01) | Bereichsweiser Weltimport und Terrainprüfung | 🧩 Implementiert · Abnahme offen 2/2 | P1 | „Große Testphase vorbereiten und betreuen“ | Ausschnitt aus einer Kopie deiner Modpack-Welt übernehmen. |
| [MODEL-01](#model-01) | 3D-Export | 🧩 Implementiert · Abnahme offen 5/6 | P2 | „Module und Systeme komplex ausarbeiten“ | Export in Blender und einem Slicer öffnen, ein Testdruck (S05). |

Abgeschlossen oder zurückgestellt: UI-01 (geprüft), UI-02 (geprüft).

<a id="bereich-bibliothek"></a>

### Bereich: Bibliothek, Generatoren und Großprojekte

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [BASE-01](#base-01) | Basisplaner | 🧩 Implementiert · Abnahme offen 5/6 | P1 | „Große Testphase vorbereiten und betreuen“ | Basisplaner mit einer echten Basis aus eurer Welt abnehmen (S06). |
| [GEN-02](#gen-02) | Weitere Generatoren und Dachdetails | 🧩 Implementiert · Abnahme offen 5/5 | P1 | „Große Testphase vorbereiten und betreuen“ | Treppenhaus, Torhaus-Wehrgang und Hafen im Spiel. |
| [GEN-03](#gen-03) | Kolosseum aus Philipps Bauplan | 🧩 Implementiert · Abnahme offen 5/6 | P1 | „Große Testphase vorbereiten und betreuen“ | Kolosseum exportieren und im Spiel aufstellen (BIB-14). |
| [GROSS-01](#gross-01) | Großprojekte in der Bibliothek | 🧩 Implementiert · Abnahme offen 7/8 | P1 | „Gelände, Wege und Küste ausbauen“ | Großprojekte und die sechs Großbauten im Spiel ansehen (BIB-13).<br>BIB-21/BIB-22: Großprojekt auf einem echten Bauplatz am Wasser und eigenes Großprojekt aus einer Sammlung planen. |
| [LIB-02](#lib-02) | Eigene Sammlungen, Ordner und Kategorien | 🧩 Implementiert · Abnahme offen 2/2 | P1 | „Große Testphase vorbereiten und betreuen“ | Rückmeldung zur Bedienung der Sammlungen. |
| [LIB-03](#lib-03) | Eigene Ensembles und Generatorvorlagen speichern | 🧩 Implementiert · Abnahme offen 2/2 | P1 | „Große Testphase vorbereiten und betreuen“ | Eigene Ensembles und Generatorvorlagen ausprobieren. |
| [LIB-04](#lib-04) | Gebäudebibliothek v3 | 🧩 Implementiert · Abnahme offen 4/4 | P1 | „Große Testphase vorbereiten und betreuen“ | Redstone-Bauten im Spiel abnehmen. |
| [LIB-05](#lib-05) | Bibliothek im Stil der Vorlagen | 🧩 Implementiert · Abnahme offen 7/8 | P1 | „Große Testphase vorbereiten und betreuen“ | Einige neu gezeichnete Gebäude im Spiel ansehen (S08). |
| [LIB-06](#lib-06) | Bibliotheksbeiträge | 🧩 Implementiert · Abnahme offen 5/7 | P1 | „Hochgeladene Bauobjekte fest in Bibliothek übernehmen“ | Eigenes Bauwerk einreichen und das Paket im Thread hochladen (BIB-15/16). |
| [SPLIT-01](#split-01) | Gebäude aus großen Modellen herauslösen | 🧩 Implementiert · Abnahme offen 5/6 | P1 | „Große Testphase vorbereiten und betreuen“ | Echte Litematic-Basen zum Herauslösen bereitstellen (S05). |

Abgeschlossen oder zurückgestellt: LIB-01 (geprüft), GEN-01 (geprüft), WORLD-02 (geprüft), BUILD-05 (geprüft).

<a id="bereich-projekt"></a>

### Bereich: Projektmodul: Baustelle, Bauanleitung, Planung

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [BUILD-06](#build-06) | Bauführung im Spiel | 🧩 Implementiert · Abnahme offen 5/5 | P1 | „Große Testphase vorbereiten und betreuen“ | Bauführung mit Mod-Aufnahme auf deinem Server; Druck- und Handyansicht. |
| [PROJ-01](#proj-01) | Projektplanung für große Projekte | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Projektmodul vertiefen“ | Reiter „Planung“ abnehmen (PROJ-09…11). |
| [PROJ-02](#proj-02) | Projektplanung vertieft | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Projektmodul vertiefen“ | Basisplan, Material abwarten und Anteil der Bautage im Reiter „Planung“ abnehmen (PROJ-16…18). |
| [PROJ-03](#proj-03) | Planung Runde 3 | 🧩 Implementiert · Abnahme offen 3/4 | P1 | „Module und Systeme komplex ausarbeiten“ | Im Reiter „Planung“ eine Abwesenheit eintragen und zwei Basispläne vergleichen (PROJ-20). |
| [PROJ-04](#proj-04) | Reihenfolge zwischen Projekten | 🧩 Implementiert · Abnahme offen 2/3 | P1 | „Module und Systeme komplex ausarbeiten“ | Zwei Projekte nacheinander planen (erst Lager, dann Burg) und den Starthinweis prüfen (PROJ-21). |
| [PROJ-05](#proj-05) | Bauleute-Konto und Bauleute aus dem Spiel | 🧩 Implementiert · Abnahme offen 2/3 | P1 | „Projekte untereinander verknüpfen“ | Team übernehmen, Konto je Bauleute und Bauzettel prüfen, am besten mit einem Mitspieler im Team-Raum (PROJ-23). |
| [UPDATE-01](#update-01) | Kontrollierte Versionsupdates mit lokalen Overrides | 🧩 Implementiert · Abnahme offen 2/2 | P1 | „Große Testphase vorbereiten und betreuen“ | Versionsupdates auf echten Geräten (QA-02). |
| [PROD-01](#prod-01) | Produktionsdaten | 🧩 Implementiert · Abnahme offen 3/4 | P2 | „Produktion und Anbindung im Planer ausbauen“ | Reiter „Produktion“ abnehmen (PROJ-12). |
| [PROD-02](#prod-02) | Deckung und Engpässe | 🧩 Implementiert · Abnahme offen 3/4 | P2 | „Produktion und Anbindung im Planer ausbauen“ | Engpässe und Zeitplanvergleich prüfen (PROJ-13). |
| [PROD-03](#prod-03) | Verarbeitung und Logistik | 🧩 Implementiert · Abnahme offen 3/3 | P2 | „Produktion und Anbindung im Planer ausbauen“ | — |
| [PROD-04](#prod-04) | Anbindung der Produktion | 🧩 Implementiert · Abnahme offen 4/5 | P2 | „Produktion und Anbindung im Planer ausbauen“ | — |
| [PROD-05](#prod-05) | Erträge aus geprüften Lagerkisten | 🧩 Implementiert · Abnahme offen 5/5 | P2 | „Produktion und Anbindung im Planer ausbauen“ | — |

Abgeschlossen oder zurückgestellt: BUILD-01 (geprüft).

<a id="bereich-team"></a>

### Bereich: Teambau live (Planer, Mod, Plugin zusammen)

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [COOP-01](#coop-01) | Teambau im Planer | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Gemeinsames Bauen mehrerer Spieler ermöglichen“ | Mit Mitspielern TEAMBAU-01…05.<br>Weg für den Live-Abgleich ohne Herunter- und Hochladen wählen (Rückfrage im Thread). |
| [COOP-02](#coop-02) | Paper-Plugin als Teamknoten | 🧩 Implementiert · Abnahme offen 3/4 | P1 | „Gemeinsames Bauen mehrerer Spieler ermöglichen“ | Plugin auf deinem Paper-Server, TEAMBAU-06 mit Mitspielern. |
| [COOP-03](#coop-03) | Teamabgleich live über die Mod (Merkmal team, Plugin-Kanal bauplaner:team), Abschnitte i… | 🧩 Implementiert · Abnahme offen 2/3 | P1 | „Teambau und Befehle in der Mod ausbauen“ | TEAMBAU-09: aktuelle Mod und aktuelles Plugin (ab 0.10.0) zusammen auf deinem Server. |
| [COOP-04](#coop-04) | Baunachweis je Spieler (Plugin zählt Blöcke in Abschnittsboxen), Lagerkisten des Teams z… | 🧩 Implementiert · Abnahme offen 3/4 | P1 | „Gemeinsames Bauen mehrerer Spieler ermöglichen“ | TEAMBAU-07/08 mit echten Spielern. |
| [COOP-05](#coop-05) | Geprüfte Lagerkisten im Paper-Plugin | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Mod-Werkzeuge und Planer-Anbindung erweitern“ | LAGER-01…09 mit echten Spielern.<br>LAGER-11: Lagerstand im Materialfenster der Mod. |
| [COOP-06](#coop-06) | Teamplanung im Planer | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Server-Plugin mit geprüften Lagerkisten“ | TEAMBAU-21…24 mit Mitspielern an einem großen Bau. |
| [COOP-07](#coop-07) | Team live ohne Dateien | 🧩 Implementiert · Abnahme offen 6/7 | P1 | „Gemeinsames Bauen mehrerer Spieler ermöglichen“ | TEAMBAU-25 mit Mitspielern; auf dem Server /bauplaner team verbinden mit dem Server-Link (sobald das Plugin RoomLink hat). |
| [COOP-09](#coop-09) | Team live im Alltag | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Gemeinsames Bauen mehrerer Spieler ermöglichen“ | TEAMBAU-25 mit Mitspielern; auf dem Server /bauplaner team verbinden mit dem Server-Link (sobald das Plugin RoomLink hat). |
| [COOP-10](#coop-10) | Client zuerst | 🧩 Implementiert · Abnahme offen 6/7 | P1 | „Gemeinsames Bauen mehrerer Spieler ermöglichen“ | TEAMBAU-27 mit Mitspielern: Mod 0.15.0, Team live, ohne Plugin bauen und Kiste öffnen. |
| [COOP-11](#coop-11) | Verlauf verdichten | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Module und Systeme komplex ausarbeiten“ | TEAMBAU-28: einen echten Teamstand verdichten und mit einem Mitspieler abgleichen. |
| [LINK-04](#link-04) | Planer | 🧩 Implementiert · Abnahme offen 3/4 | P1 | „Verbindung ohne Server-Datei neu bauen“ | Testplan-Bereich LINK durchgehen. |
| [LINK-05](#link-05) | Zweiter Weg über den Team-Raum | 🧩 Implementiert · Abnahme offen 5/5 | P1 | „Verbindung ohne Server-Datei neu bauen“ | Am PC „Weiteres Gerät freigeben“, Link auf dem iPad öffnen, eine Einstellung ändern. |
| [WORLD-SHARE-01](#world-share-01) | Weltplan und Server-Karte nur über den Team-Raum | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Weltplan und Server-Karte über den Team-Raum“ | Mit dem Paper-Plugin und BlueMap oder Dynmap prüfen, ob die Marker des Weltplans ohne Datei auf der Server-Karte erscheinen und gesperrte Bauplätze geschützt sind (KARTE-10..12). |
| [COOP-08](#coop-08) | Ertragskisten | 🧩 Implementiert · Abnahme offen 3/4 | P2 | „Module und Systeme komplex ausarbeiten“ | LAGER-01…09 mit echten Spielern. |

<a id="bereich-groesse"></a>

### Bereich: Volumenlimit und Übertragung großer Pläne

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [SIZE-01](#size-01) | Volumenlimit für große Builds | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Volumenlimit für große Builds aufheben“ | Großen Bau (Olympus) ins Spiel senden und prüfen (DATEI-05, MOD-11, MOD-15, LIVE-09).<br>Im Thread beschreiben, was beim Senden falsch ankommt. |

<a id="bereich-mod"></a>

### Bereich: Client-Mod (Fabric, NeoForge, Forge)

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [FALLBACK-01](#fallback-01) | Ausweichwege über alle Verbindungen | 🚧 In Arbeit 4/5 | P1 | „Mod, Server und Client mit Fallbacks ausbauen“ | Abnahme LINK-09: mit Team live kurz das Internet trennen, Minecraft neu starten, Teamstand und „Baustand holen (bester Weg)“ prüfen. |
| [GAME-02](#game-02) | Fabric-Brücke kompilieren und im Spiel abnehmen | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Bauplaner-Mod von Grund auf neu entwickeln“ | Mehrspieler-Abnahme auf server.lmnt-gaming.net (S04). |
| [GAME-03](#game-03) | Optionale lokale Verbindung und Anzeige im Spiel | 🧩 Implementiert · Abnahme offen 2/2 | P1 | „Bauplaner-Mod von Grund auf neu entwickeln“ | Zusammen mit MAP-03-S06. |
| [GAME-05](#game-05) | NeoForge- und Forge-Brücke mit gemeinsamer Befehlslogik | 🧩 Implementiert · Abnahme offen 3/4 | P1 | „Teambau und Befehle in der Mod ausbauen“ | Forge-Testversion auf einem Rechner mit Bildschirm starten (S03). |
| [GAME-07](#game-07) | Bauplaner-Mod 2.0 | 🧩 Implementiert · Abnahme offen 10/11 | P1 | „Gruppen und Sperren bis ins Hologramm bringen“ | Hologramm, Abschnitte und Röntgensicht auf server.lmnt-gaming.net (S05). |
| [LINK-03](#link-03) | Mod | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Verbindung ohne Server-Datei neu bauen“ | Mod 0.12.0: Planer #/mod „Mit dem Spiel verbinden“, im Spiel J → „Planer zulassen“. |
| [LINK-07](#link-07) | Ohne Server-Datei | 🚧 In Arbeit 5/6 | P1 | „Verbindung ohne Server-Datei neu bauen“ | — |
| [LINK-10](#link-10) | Anbindung geprüft und gehärtet | 🧩 Implementiert · Abnahme offen 6/6 | P1 | „Anbindung von Mod, Team-Raum und Planer prüfen“ | Abnahme LINK-10: offline in mehreren Abschnitten bauen, wieder verbinden – alle Messungen genau einmal im Planer; mit Plugin bleibt die Raumverbindung stehen. |
| [LINK-11](#link-11) | Alles über das Internet | 🧩 Implementiert · Abnahme offen 5/6 | P1 | „Alle Systeme online verbinden“ | Abnahme LINK-12: als Bauleitung „Mein Spiel verbinden“, mit der Mod auf den Server – der Server verbindet sich selbst mit dem Team-Raum, Abschnittsschutz greift.<br>Abnahme LINK-13: alle Dateiwege nur noch zugeklappt unter „Notfall“. |
| [GAME-08](#game-08) | Bauplaner-Mod Protokoll 2 | 🧩 Implementiert · Abnahme offen 5/5 | P2 | „Teambau und Befehle in der Mod ausbauen“ | Mitspieler-Pfeile auf der Live-Karte mit einem zweiten Spieler. |
| [GAME-10](#game-10) | Befehlsseite im Plan-Menü (J) der Mod 0.11.0 | 🧩 Implementiert · Abnahme offen 3/4 | P2 | „Teambau und Befehle in der Mod ausbauen“ | Befehlsseite im J-Menü zusammen mit dem Plugin auf deinem Server (MOD-16). |
| [GAME-11](#game-11) | Client-Mod für weitere Minecraft-Versionen und Launcher | 🚧 In Arbeit 1/4 | P2 | „Mod-Werkzeuge und Planer-Anbindung erweitern“ | — |

<a id="bereich-plugin"></a>

### Bereich: Paper-Plugin (Server)

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [GAME-04](#game-04) | Paper-Plugin der Bauplaner-Brücke (serverseitig, mehrere Minecraft-Versionen) | 🚧 In Arbeit 3/4 | P1 | „Server-Plugin mit geprüften Lagerkisten“ | Plugin-Abnahme auf deinem Paper-Server (S04). |
| [LAGER-01](#lager-01) | Optionale Truhen-/Lagerintegration | 🧩 Implementiert · Abnahme offen 2/2 | P1 | „Server-Plugin mit geprüften Lagerkisten“ | Geprüfte Lagerkisten auf dem Paper-Server einrichten und den Bestand im Planer übernehmen (LAGERKISTEN.md). |
| [LINK-01](#link-01) | Plugin richtet sich selbst ein und lässt sich per Klick koppeln (link.json, Server-ID, K… | 🧩 Implementiert · Abnahme offen 3/4 | P1 | „Verbindung ohne Server-Datei neu bauen“ | Plugin 0.12.0 einspielen, als OP mit Mod beitreten, J → „Teambau erlauben“, im Planer #/mod „Server koppeln“. |
| [LINK-02](#link-02) | Signierte Steuernachrichten statt Serverbefehlen (HMAC, steigende Nummer, feste Einstell… | 🧩 Implementiert · Abnahme offen 4/4 | P1 | „Mod-Werkzeuge und Planer-Anbindung erweitern“ | LINK-11: Plan aus „Bauen“ auf den Server legen. |
| [LINK-06](#link-06) | Weitere Steuerung ohne Befehle | 🧩 Implementiert · Abnahme offen 2/2 | P2 | „Verbindung ohne Server-Datei neu bauen“ | — |

<a id="bereich-modrinth"></a>

### Bereich: Modrinth-Veröffentlichung

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [GAME-09](#game-09) | Bauplaner-Brücke auf Modrinth | 🚧 In Arbeit 4/5 | P2 | „Mod auf Modrinth veröffentlichen“ | — |

<a id="bereich-perf"></a>

### Bereich: Performance und Stabilität

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [GFX-03](#gfx-03) | Große Szenen flüssig bedienen | 🧩 Implementiert · Abnahme offen 3/4 | P1 | „Leistung bei großen Szenen steigern“ | Ein großes Modell mit Wasser oder Glas im Betrachter drehen und Blöcke anklicken: flüssig und der richtige Block (S04). |
| [PERF-02](#perf-02) | Zellindizes, Chunkdaten und selektive Neuberechnung | 🧩 Implementiert · Abnahme offen 3/3 | P1 | „Gesamtsystem auf Performance und Stabilität optimieren“ | — |
| [PERF-04](#perf-04) | Schwere Berechnungen im Hintergrund-Worker mit Fortschritt und Abbrechen | 🧩 Implementiert · Abnahme offen 6/7 | P1 | „Große Testphase vorbereiten und betreuen“ | Olympus auf deinem Rechner, dazu Firefox/Safari (S06). |
| [PERF-05](#perf-05) | Gesamtsystem auf Ladezeit und Stabilität optimiert | 🧩 Implementiert · Abnahme offen 9/9 | P1 | „Leistung bei großen Szenen steigern“ | — |
| [PERF-06](#perf-06) | Mehr Leistung ohne eigenen Server | 🚧 In Arbeit 2/3 | P1 | „Einfachsten Weg zu mehr Leistung finden“ | — |

Abgeschlossen oder zurückgestellt: STAB-01 (geprüft), PERF-01 (geprüft), PERF-03 (geprüft).

<a id="bereich-kern"></a>

### Bereich: Kern, Minecraft-Daten und Dateiformate

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [ARCH-02](#arch-02) | Planmodell | 🧩 Implementiert · Abnahme offen 4/5 | P0 | „Große Testphase vorbereiten und betreuen“ | Datencheck unter #/system mit deinen über Monate gewachsenen Browserdaten (S05). |
| [FORMAT-01](#format-01) | Schem v3 an echten Referenzwerkzeugen abnehmen | 🧩 Implementiert · Abnahme offen 1/2 | P0 | „Liegengebliebene Datenpakete abarbeiten“ | Auf deinem Paper-Server mit WorldEdit ein kleines Gebäude mit Kiste/Schild auswählen, //copy, //schem save bauplaner-test und die Datei aus plugins/WorldEdit/schematics hier hochladen (FORMAT-01-S02). |
| [FORMAT-02](#format-02) | Litematic an echten Referenzdateien abnehmen | 🧩 Implementiert · Abnahme offen 3/4 | P0 | „Große Testphase vorbereiten und betreuen“ | Litematic-Export im Spiel mit Litematica laden (S02). |
| [NBT-01](#nbt-01) | Semantische BlockEntity-Transformationen | 🧩 Implementiert · Abnahme offen 3/3 | P0 | „Liegengebliebene Datenpakete abarbeiten“ | — |
| [PROFILE-01](#profile-01) | Ein verbindliches Java-Versionsprofil | 🧩 Implementiert · Abnahme offen 3/3 | P0 | „Liegengebliebene Datenpakete abarbeiten“ | — |
| [BLOCK-01](#block-01) | Echte Minecraft-Blocklogik 26.3 | 🧩 Implementiert · Abnahme offen 6/7 | P1 | „Große Testphase vorbereiten und betreuen“ | Einen Bau mit Spielprüfung ohne Hinweise nachbauen und Verbindungen vergleichen (S07). |
| [BLOCK-02](#block-02) | Katalog und Generatoren spielgerecht | 🧩 Implementiert · Abnahme offen 5/6 | P1 | „Große Testphase vorbereiten und betreuen“ | Geänderte Gebäude (Werkstatt, Windmühle, Torhaus, Stadthaus) per Litematic setzen (S06). |
| [CORE-04](#core-04) | Planer-Kernmodule prüfen und überarbeiten | 🧩 Implementiert · Abnahme offen 4/5 | P1 | „Planer-Kernmodule prüfen und überarbeiten“ | Projekt mit Nachfolger und Bauplatz löschen; Blockeditor mit Änderungen verlassen; Truhe mit verzaubertem Schwert umsortieren (CORE-04-S05). |
| [DIFF-01](#diff-01) | Verschiebungserkennung und BlockEntity-Diff | 🧩 Implementiert · Abnahme offen 3/3 | P1 | „Liegengebliebene Datenpakete abarbeiten“ | — |
| [ENTITY-01](#entity-01) | Gemälde, Rahmen, Rüstungsständer und Blockinhalte | 🧩 Implementiert · Abnahme offen 5/6 | P1 | „Große Testphase vorbereiten und betreuen“ | Export mit Gemälden, Rahmen und Rüstungsständern im Spiel laden (S06). |
| [MAT-02](#mat-02) | Versionierte Item-/Rezeptauflösung vervollständigen | 🧩 Implementiert · Abnahme offen 3/3 | P1 | „Liegengebliebene Datenpakete abarbeiten“ | — |
| [MAT-03](#mat-03) | Vorhandene Glas-/Beton-/Terrakottavarianten abnehmen | 🧩 Implementiert · Abnahme offen 3/3 | P1 | „Module und Systeme komplex ausarbeiten“ | — |
| [MAT-04](#mat-04) | Kupfer mit Oxidation und Wachsstatus | 🧩 Implementiert · Abnahme offen 2/2 | P1 | „Liegengebliebene Datenpakete abarbeiten“ | — |
| [STRUCT-01](#struct-01) | Dateistruktur sauber neu ordnen | 🧩 Implementiert · Abnahme offen 4/4 | P1 | „Dateistruktur sauber neu ordnen“ | — |

Abgeschlossen oder zurückgestellt: CORE-01 (geprüft), CORE-02 (geprüft), CORE-03 (geprüft), STORE-01 (geprüft), MAT-01 (geprüft), ARCH-01 (geprüft), STORE-02 (geprüft), GAME-01 (geprüft).

<a id="bereich-qa"></a>

### Bereich: Testphase, Qualität und Betrieb

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [QA-04](#qa-04) | Große Testphase | 🧩 Implementiert · Abnahme offen 4/6 | P0 | „Große Testphase vorbereiten und betreuen“ · 1 verwaist | Testphase mit weiteren Testern: erst die Kernfälle auf #/testphase. |
| [QA-02](#qa-02) | Echte GPU-, Safari- und iPhone-Abnahme | 🚧 In Arbeit 1/2 | P1 | „Liegengebliebene Datenpakete abarbeiten“ | Bereich „Geräte und Browser“ (GERAET-01 … 06) auf #/testphase auf deinem PC (Chrome/Edge und Firefox) und deinem Handy durchgehen und das Protokoll schicken (QA-02-S02). |

Abgeschlossen oder zurückgestellt: OPS-01 (geprüft), PLAN-01 (geprüft), DOC-01 (geprüft), QA-01 (geprüft), QA-03 (geprüft), OPS-02 (geprüft), OPS-03 (geprüft), LICENSE-01 (geprüft).

<a id="bereich-spaeter"></a>

### Bereich: Zurückgestellt (Backend-Option, ohne Auftrag)

| ID | Paket | Status | Prio | Zuständiger Thread | Nur Philipp |
|---|---|---|---|---|---|
| [AUTH-01](#auth-01) | Konten, Rechte und Übernahme lokaler Projekte | ⏳ Offen 0/2 | P0 | — | — |
| [TEAM-01](#team-01) | Backendvertrag, Datenbank und Payloadspeicher | ⏳ Offen 0/2 | P0 | — | — |
| [TEAM-02](#team-02) | Geordnete Operationen, Reconnect und Team-Undo | ⏳ Offen 0/2 | P0 | — | — |
| [GAME-06](#game-06) | Sichere Serveranbindung (Webhooks) für Server-Plugins | ⏳ Offen 0/1 | P1 | — | — |
| [OPS-04](#ops-04) | Teamdienst betreiben und Wiederherstellung prüfen | ⏳ Offen 0/2 | P1 | — | — |
| [TEAM-03](#team-03) | Gemeinsame Aufgaben, Abschnitte und Sammelplanung | ⏳ Offen 0/2 | P1 | — | — |

Abgeschlossen oder zurückgestellt: DEFER-01 (zurückgestellt), DEFER-02 (zurückgestellt).

## Was nur Philipp tun kann

Gesammelt aus allen Paketen, nach Art. Die Testfälle stehen auf [#/testphase](https://freadeax.github.io/Minecraft-Bauplaner/#/testphase); Fehler dort über „Fehler melden“ oder im Spiel mit `/bauplaner diagnose`.

### Auf deinem Server mit Mitspielern

- **BUILD-06** · Bauführung mit Mod-Aufnahme auf deinem Server; Druck- und Handyansicht.
- **MAP-03** · Kopplung und Senden auf dem LMNT-Server mit Browserfreigabe „lokales Netzwerk“ (S06).
- **GAME-02** · Mehrspieler-Abnahme auf server.lmnt-gaming.net (S04).
- **GAME-07** · Hologramm, Abschnitte und Röntgensicht auf server.lmnt-gaming.net (S05).
- **GAME-08** · Mitspieler-Pfeile auf der Live-Karte mit einem zweiten Spieler.
- **GAME-03** · Zusammen mit MAP-03-S06.
- **GAME-04** · Plugin-Abnahme auf deinem Paper-Server (S04).
- **LAGER-01** · Geprüfte Lagerkisten auf dem Paper-Server einrichten und den Bestand im Planer übernehmen (LAGERKISTEN.md).
- **MAP-05** · „Baustand holen“ mit der Mod auf server.lmnt-gaming.net (S05).
- **QA-04** · Testphase mit weiteren Testern: erst die Kernfälle auf #/testphase.
- **COOP-01** · Mit Mitspielern TEAMBAU-01…05.
- **COOP-02** · Plugin auf deinem Paper-Server, TEAMBAU-06 mit Mitspielern.
- **COOP-03** · TEAMBAU-09: aktuelle Mod und aktuelles Plugin (ab 0.10.0) zusammen auf deinem Server.
- **COOP-04** · TEAMBAU-07/08 mit echten Spielern.
- **COOP-05** · LAGER-01…09 mit echten Spielern.
- **COOP-06** · TEAMBAU-21…24 mit Mitspielern an einem großen Bau.
- **GAME-10** · Befehlsseite im J-Menü zusammen mit dem Plugin auf deinem Server (MOD-16).
- **COOP-07** · TEAMBAU-25 mit Mitspielern; auf dem Server /bauplaner team verbinden mit dem Server-Link (sobald das Plugin RoomLink hat).
- **COOP-08** · LAGER-01…09 mit echten Spielern.
- **LINK-01** · Plugin 0.12.0 einspielen, als OP mit Mod beitreten, J → „Teambau erlauben“, im Planer #/mod „Server koppeln“.
- **LINK-02** · LINK-11: Plan aus „Bauen“ auf den Server legen.
- **COOP-09** · TEAMBAU-25 mit Mitspielern; auf dem Server /bauplaner team verbinden mit dem Server-Link (sobald das Plugin RoomLink hat).
- **COOP-10** · TEAMBAU-27 mit Mitspielern: Mod 0.15.0, Team live, ohne Plugin bauen und Kiste öffnen.

### Im Spiel an deinem PC

- **FORMAT-02** · Litematic-Export im Spiel mit Litematica laden (S02).
- **BLOCK-01** · Einen Bau mit Spielprüfung ohne Hinweise nachbauen und Verbindungen vergleichen (S07).
- **BLOCK-02** · Geänderte Gebäude (Werkstatt, Windmühle, Torhaus, Stadthaus) per Litematic setzen (S06).
- **EDIT-02** · Gesetzte und gedrehte Zustände im Spiel prüfen.
- **EDIT-03** · Schablonen-Zustände (Tür, Treppe, Laterne) im Spiel prüfen.
- **EDIT-04** · Gespiegelte und gedrehte Zustände (Türen, Truhen, Schienen) im Spiel (S07).
- **EDIT-04** · Bauhilfen Symmetrie und Kurven in der Mod (MOD-18, MOD-19).
- **EDIT-05** · Gestapelte und gedrehte Bauteile mit Ausstattung im Spiel.
- **TERRAIN-03** · PROJ-19: Weg mit Treppen und Brücke als .litematic in deiner Welt ansehen.
- **TERRAIN-03** · BIB-20: Basis mit Wegenetz als Landschaftsweg auf einem echten Hang einfügen und im Spiel ansehen.
- **TERRAIN-04** · Mod 0.20.0 installieren, einmal um den Bauplatz laufen, im Reiter „Gelände“ „Gelände aus dem Spiel übernehmen“ und „Gelände aus dem Spiel prüfen“ (S05).
- **GEN-02** · Treppenhaus, Torhaus-Wehrgang und Hafen im Spiel.
- **MAP-02** · BlueMap-Marker (.conf) bzw. Dynmap-Befehle auf eurer Server-Karte einspielen und prüfen, ob Projekte, Wege und Punkte an der richtigen Stelle erscheinen (KARTE-08).
- **GAME-05** · Forge-Testversion auf einem Rechner mit Bildschirm starten (S03).
- **LIB-04** · Redstone-Bauten im Spiel abnehmen.
- **ENTITY-01** · Export mit Gemälden, Rahmen und Rüstungsständern im Spiel laden (S06).
- **LIB-05** · Einige neu gezeichnete Gebäude im Spiel ansehen (S08).
- **GROSS-01** · Großprojekte und die sechs Großbauten im Spiel ansehen (BIB-13).
- **MAP-06** · Weltkarte mit Mod 0.8.0 oder neuer im Spiel abnehmen (S08, KARTE-05/06, LIVE-08).
- **MAP-07** · Ein Projekt auf der Weltkarte drehen, ins Spiel senden und mit F3 prüfen; ein im Spiel gedrehtes Hologramm übernehmen (KARTE-07).
- **GEN-03** · Kolosseum exportieren und im Spiel aufstellen (BIB-14).
- **SIZE-01** · Großen Bau (Olympus) ins Spiel senden und prüfen (DATEI-05, MOD-11, MOD-15, LIVE-09).
- **COOP-05** · LAGER-11: Lagerstand im Materialfenster der Mod.
- **LINK-03** · Mod 0.12.0: Planer #/mod „Mit dem Spiel verbinden“, im Spiel J → „Planer zulassen“.
- **EDIT-06** · Truhe und Schild mit Inhalt im Spiel laden (WERK-09).
- **FALLBACK-01** · Abnahme LINK-09: mit Team live kurz das Internet trennen, Minecraft neu starten, Teamstand und „Baustand holen (bester Weg)“ prüfen.
- **LINK-10** · Abnahme LINK-10: offline in mehreren Abschnitten bauen, wieder verbinden – alle Messungen genau einmal im Planer; mit Plugin bleibt die Raumverbindung stehen.
- **LINK-11** · Abnahme LINK-12: als Bauleitung „Mein Spiel verbinden“, mit der Mod auf den Server – der Server verbindet sich selbst mit dem Team-Raum, Abschnittsschutz greift.
- **WORLD-SHARE-01** · Mit dem Paper-Plugin und BlueMap oder Dynmap prüfen, ob die Marker des Weltplans ohne Datei auf der Server-Karte erscheinen und gesperrte Bauplätze geschützt sind (KARTE-10..12).

### Auf echten Geräten und Browsern

- **ARCH-02** · Datencheck unter #/system mit deinen über Monate gewachsenen Browserdaten (S05).
- **QA-02** · Bereich „Geräte und Browser“ (GERAET-01 … 06) auf #/testphase auf deinem PC (Chrome/Edge und Firefox) und deinem Handy durchgehen und das Protokoll schicken (QA-02-S02).
- **UX-01** · START-12 auf dem iPad: Projektreiter waagerecht wischen, eingeklappte Bereiche per Finger öffnen.
- **PERF-04** · Olympus auf deinem Rechner, dazu Firefox/Safari (S06).
- **VIEW-01** · Ansicht auf echter GPU und mit Touch prüfen, negative Koordinaten, alle Schnittachsen (S02).
- **VIEW-02** · Mojang-Download und Blockformen in Firefox/Safari und auf echten Geräten (S06).
- **GFX-01** · Licht und Schatten auf echten GPUs, Firefox/Safari und Handy (S06).
- **GFX-02** · Biom, Leuchtfeuer-Strahl und flüssiges Laden großer Modelle auf dem eigenen Rechner ansehen (S04).
- **GFX-03** · Ein großes Modell mit Wasser oder Glas im Betrachter drehen und Blöcke anklicken: flüssig und der richtige Block (S04).
- **EDIT-01** · Mehrfachauswahl auf echten Geräten (QA-02).
- **UPDATE-01** · Versionsupdates auf echten Geräten (QA-02).
- **MAP-01** · Weltkarte auf echter GPU und mit Touch (QA-02).
- **MAP-04** · Langdruck-Menü auf echtem Touch-Gerät (S06).
- **BACKUP-02** · Sicherungs-Download in Safari; Rückmeldung, ob 7 Tage für die Erinnerung passen.
- **LINK-05** · Am PC „Weiteres Gerät freigeben“, Link auf dem iPad öffnen, eine Einstellung ändern.
- **EDIT-06** · Im 3D-Bild bauen auf PC und iPad (WERK-08).
- **GUIDE-01** · Anleitung am iPad durchgehen (START-08/09), unklare Sätze melden.
- **UI-03** · Am iPad die neue Oberfläche ansehen und START-20/21 in #/testphase abhaken (Thema „Werkbank“, Reiter wischen, „Bewegung reduzieren“).

### Dateien oder Welt liefern

- **FORMAT-01** · Auf deinem Paper-Server mit WorldEdit ein kleines Gebäude mit Kiste/Schild auswählen, //copy, //schem save bauplaner-test und die Datei aus plugins/WorldEdit/schematics hier hochladen (FORMAT-01-S02).
- **MODEL-01** · Export in Blender und einem Slicer öffnen, ein Testdruck (S05).
- **TERRAIN-01** · Kopie deiner 26.3-Welt für die Geländeabnahme (S05).
- **TERRAIN-02** · Abnahme in deiner eigenen Welt und auf Touch-Geräten (S05).
- **WORLD-IMPORT-01** · Ausschnitt aus einer Kopie deiner Modpack-Welt übernehmen.
- **LIB-06** · Eigenes Bauwerk einreichen und das Paket im Thread hochladen (BIB-15/16).
- **BASE-01** · Basisplaner mit einer echten Basis aus eurer Welt abnehmen (S06).
- **SPLIT-01** · Echte Litematic-Basen zum Herauslösen bereitstellen (S05).
- **GROSS-01** · BIB-21/BIB-22: Großprojekt auf einem echten Bauplatz am Wasser und eigenes Großprojekt aus einer Sammlung planen.

### Im Planer abnehmen

- **UX-01** · Testphase START-10..13: vier Hauptbereiche, Projektschritte mit Kurzsatz, eingeklappte Experten- und Datei-Wege im Browser prüfen.
- **EDIT-05** · Zauberstab, Stapeln, Extrudieren und Wendel in der Werkstatt abnehmen (S07).
- **LIB-02** · Rückmeldung zur Bedienung der Sammlungen.
- **LIB-03** · Eigene Ensembles und Generatorvorlagen ausprobieren.
- **PROJ-01** · Reiter „Planung“ abnehmen (PROJ-09…11).
- **PROD-01** · Reiter „Produktion“ abnehmen (PROJ-12).
- **PROD-02** · Engpässe und Zeitplanvergleich prüfen (PROJ-13).
- **LINK-04** · Testplan-Bereich LINK durchgehen.
- **COOP-11** · TEAMBAU-28: einen echten Teamstand verdichten und mit einem Mitspieler abgleichen.
- **PROJ-02** · Basisplan, Material abwarten und Anteil der Bautage im Reiter „Planung“ abnehmen (PROJ-16…18).
- **PROJ-03** · Im Reiter „Planung“ eine Abwesenheit eintragen und zwei Basispläne vergleichen (PROJ-20).
- **PROJ-04** · Zwei Projekte nacheinander planen (erst Lager, dann Burg) und den Starthinweis prüfen (PROJ-21).
- **PROJ-05** · Team übernehmen, Konto je Bauleute und Bauzettel prüfen, am besten mit einem Mitspieler im Team-Raum (PROJ-23).
- **LINK-11** · Abnahme LINK-13: alle Dateiwege nur noch zugeklappt unter „Notfall“.
- **CORE-04** · Projekt mit Nachfolger und Bauplatz löschen; Blockeditor mit Änderungen verlassen; Truhe mit verzaubertem Schwert umsortieren (CORE-04-S05).

### Entscheiden oder Rückfrage beantworten

- **SIZE-01** · Im Thread beschreiben, was beim Senden falsch ankommt.
- **COOP-01** · Weg für den Live-Abgleich ohne Herunter- und Hochladen wählen (Rückfrage im Thread).

## Verwaiste Punkte

Arbeit, für die gerade kein laufender Thread zuständig ist. Zum Verteilen: Thread starten, `thread` in roadmap.json setzen und den Punkt aus `orphans` entfernen, sobald er ein eigener Teilschritt oder erledigt ist.

| ID | Bereich | Prio | Status | Offen ohne Bearbeiter |
|---|---|---|---|---|
| [QA-04](#qa-04) | Testphase, Qualität und Betrieb | P0 | 🧩 Implementiert · Abnahme offen | Der Thread „Große Testphase vorbereiten und betreuen“ ist beendet; die rund 30 Pakete, bei denen nur Philipps Abnahme fehlt, haben keinen aktiven Thread für Diagnose und Fehlerbehebung. |
| [EDIT-04](#edit-04) | Planer | P1 | 🧩 Implementiert · Abnahme offen | Gelände-Werkzeuge auf dem Projektgelände (als eigener Thread angekündigt, nie gestartet). |
| [UX-01](#ux-01) | Planer | P1 | 🚧 In Arbeit | Philipps Abnahme START-10..13 im Browser und auf dem iPad. Optik übernimmt „Planer-Oberfläche schön neu gestalten“. |

## Eingänge ohne eigenes Paket

Neue Wünsche und Folgeideen ohne eigenes Paket kommen hier hinein (IN-xx, nur anhängen). Ein Eingang ist erledigt, sobald er als Aufgabe in items steht oder ausdrücklich verworfen ist.

| ID | Eingang | Von | Bereich | Zustand | Thread | Bezug |
|---|---|---|---|---|---|---|
| IN-01 | Plan kommt nicht richtig vom Planer ins Spiel; das große Bauprojekt läuft weiter nicht sauber. | Philipp, 2026-11-03 | Volumenlimit und Übertragung großer Pläne | zugeteilt | „Volumenlimit für große Builds aufheben“ | SIZE-01 |
| IN-02 | Teambau live statt Teampaket herunter- und hochladen; einfacher und komplexer überarbeiten. | Philipp, 2026-11-03 | Teambau live | übernommen | „Gemeinsames Bauen mehrerer Spieler ermöglichen“ | COOP-01, COOP-07 |
| IN-03 | Befehle und Status von Mod und Plugin im J-Menü per Klick – als GAME-10 übernommen (Mod 0.11.0). | Philipp, 2026-11-03 | Client-Mod | übernommen | „Teambau und Befehle in der Mod ausbauen“ | GAME-10 |
| IN-04 | Client-Mod in mehreren Minecraft-Versionen und Launchern; bisher gibt es Fabric/NeoForge nur für 26.3 (Paper-Plugin läuft 1.18.2–26.3). Entscheidung Philipp 04.11.: neueste Version und vor allem die gespielte (Fabric 26.3). | Philipp, 2026-10-27 | Client-Mod | zugeteilt | „Teambau und Befehle in der Mod ausbauen“ | GAME-02, GAME-05, GAME-11 |
| IN-05 | Reale Orte aus Kartendaten (OSM) – zurückgestellt, bis die Lizenzfrage geklärt ist. | Koordinator, 2026-11-02 | Planer | zurückgestellt | — | LICENSE-01 |
| IN-06 | Seit 01.11. keine Codex-Commits auf main; die vorgeschlagenen Codex-Pakete (PROFILE-01, NBT-01, MAT-02/04, DIFF-01, PERF-02/03, FORMAT-01, QA-02) haben dadurch keinen Bearbeiter. | Koordinator, 2026-11-01 | Kern, Minecraft-Daten und Dateiformate | übernommen | „Liegengebliebene Datenpakete abarbeiten“ | PROFILE-01, NBT-01, MAT-02, MAT-04, DIFF-01, PERF-02, PERF-03, FORMAT-01, QA-02 |
| IN-07 | Alte Issues #2 (B16), #3 (B17) und #4 (S4) sind noch offen, obwohl VIEW-02, LIB-02/03 und STORE-02 auf main liegen: prüfen und schließen. | GitHub, 2026-10-31 | Testphase, Qualität und Betrieb | übernommen | „Offene Punkte prüfen und Roadmap neu ordnen“ | VIEW-02, LIB-02, LIB-03, STORE-02 |

## Aktiver Arbeitsblock

- **QA-02 · Echte GPU-, Safari- und iPhone-Abnahme** — 🚧 In Arbeit, 1/2 Teilschritte. Nächster Schritt: Protokolle der Tester in docs/testing/GERAETEMATRIX.md eintragen und Befunde beheben.
- **PROFILE-01 · Ein verbindliches Java-Versionsprofil** — 🧩 Implementiert · Abnahme offen, 3/3 Teilschritte. Nächster Schritt: Abnahme: Profilprüfung im Gebäudeblatt an einer echten älteren Schem-/Litematic-Datei ansehen (Testphase).
- **NBT-01 · Semantische BlockEntity-Transformationen** — 🧩 Implementiert · Abnahme offen, 3/3 Teilschritte. Nächster Schritt: Abnahme im Spiel: gedrehtes Bauteil mit Truhen, Schildern und einem Strukturblock exportieren und in 26.3 laden (Testphase).
- **FORMAT-01 · Schem v3 an echten Referenzwerkzeugen abnehmen** — 🧩 Implementiert · Abnahme offen, 1/2 Teilschritte. Nächster Schritt: Hochgeladene WorldEdit-Datei mit npm run format:check-schem prüfen; Befunde beheben.
- **MAT-02 · Versionierte Item-/Rezeptauflösung vervollständigen** — 🧩 Implementiert · Abnahme offen, 3/3 Teilschritte. Nächster Schritt: Abnahme in der Testphase: Rohstoffliste eines großen Bauwerks mit gewählter Holzart und Brennstoff mit dem Spiel vergleichen.
- **MAT-04 · Kupfer mit Oxidation und Wachsstatus** — 🧩 Implementiert · Abnahme offen, 2/2 Teilschritte. Nächster Schritt: Abnahme: Kupfervariante eines Bauwerks im Planer erzeugen und im Spiel ansehen (Testphase).
- **DIFF-01 · Verschiebungserkennung und BlockEntity-Diff** — 🧩 Implementiert · Abnahme offen, 3/3 Teilschritte. Nächster Schritt: Abnahme in der Testphase: zwei Stände eines verschobenen Bauwerks vergleichen.
- **GAME-02 · Fabric-Brücke kompilieren und im Spiel abnehmen** — 🧩 Implementiert · Abnahme offen, 4/5 Teilschritte. Nächster Schritt: Philipp testet die .jar aus /mnt/project-files/mod/ auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md).
- **GAME-07 · Bauplaner-Mod 2.0: Hologramm und Live-Abgleich (nur Client, ohne Server)** — 🧩 Implementiert · Abnahme offen, 10/11 Teilschritte. Nächster Schritt: Philipp prüft 0.19.0 im echten Spiel: gesperrter Bauplatz grau, Hologramm nur in einer Gruppe (Testfall MOD-21); danach Stufe 7.
- **GAME-08 · Bauplaner-Mod Protokoll 2: Zonen, Ebenen, Farben und neue Punktarten im Spiel (marks2), Mitspieler für die Karte (GET /v1/players), hello.protocol 2** — 🧩 Implementiert · Abnahme offen, 5/5 Teilschritte. Nächster Schritt: Philipp prüft Protokoll 3 im echten Spiel (TESTPLAN MOD-17); Forge und Paper ohne Live-Verbindung.
- **GAME-03 · Optionale lokale Verbindung und Anzeige im Spiel** — 🧩 Implementiert · Abnahme offen, 2/2 Teilschritte. Nächster Schritt: Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht.
- **GAME-05 · NeoForge- und Forge-Brücke mit gemeinsamer Befehlslogik** — 🧩 Implementiert · Abnahme offen, 3/4 Teilschritte. Nächster Schritt: Forge-Spieltest: kopfloser Client bleibt im Ladebildschirm stehen; auf einem Rechner mit Bildschirm (scripts/test_bridge_ingame_forge.sh forge) oder durch Philipp prüfen, dann Forge-Jar bereitstellen.
- **LIB-06 · Bibliotheksbeiträge: eigene Bauwerke (Importe, Werkstatt, Generator) als festen Katalogeintrag für alle einreichen – Beitragspaket mit Prüfsumme und Rechtebestätigung, GitHub-Formular, Übernahme-Skript, Auslieferung wie mitgelieferte Gebäude** — 🧩 Implementiert · Abnahme offen, 5/7 Teilschritte. Nächster Schritt: Abnahme durch Philipp (S06) und erster echter Beitrag (S07).
- **GROSS-01 · Großprojekte in der Bibliothek: Städte, Festungen und Anlagen als Plan mit Quartieren auf Straßenraster, eigenem Straßennetz, Bauphasen, Konfliktvorschau und Übernahme als Projekt** — 🧩 Implementiert · Abnahme offen, 7/8 Teilschritte. Nächster Schritt: Abnahme durch Philipp (S06 BIB-13, BIB-21, BIB-22).
- **MAP-06 · Weltkarte in die Tiefe: Zonen, benannte Ebenen und Farben (Weltplan-Schema 2), Messen mit Fläche, Höhenprofil und Route übers Gelände, Marker und Mitspieler aus dem Spiel, Mod-Anbindung über Protokoll 2 (features marks2, players)** — 🧩 Implementiert · Abnahme offen, 7/8 Teilschritte. Nächster Schritt: Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag).
- **SIZE-01 · Volumenlimit für große Builds: eine zentrale Größengrenze (4 Mio. Zellen, 16,7 Mio. Box) für Import, Werkstatt, Export, Aufnahmen und Mod-Übertragung; Hinweise statt Abbruch; Mod 0.9.0 lädt große Pläne ohne Hänger** — 🧩 Implementiert · Abnahme offen, 4/5 Teilschritte. Nächster Schritt: Abnahme durch Philipp (S05) mit einem großen Bau im Spiel.
- **COOP-01 · Teambau im Planer: Teamprotokoll ohne Backend (Rollen, Abschnittsvergabe, Meldungen, Beiträge, Notizen, Planfreigabe), Teampaket, Meldecode, Reiter „Team“** — 🧩 Implementiert · Abnahme offen, 4/5 Teilschritte. Nächster Schritt: Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05).
- **COOP-02 · Paper-Plugin als Teamknoten: Teambefehle ohne Mod und Planer, Aktionsleiste, Schutz in fremden Abschnitten, Umriss, Ausfuhr ins Teamprotokoll** — 🧩 Implementiert · Abnahme offen, 3/4 Teilschritte. Nächster Schritt: Abnahme auf Philipps Server.
- **COOP-03 · Teamabgleich live über die Mod (Merkmal team, Plugin-Kanal bauplaner:team), Abschnitte in Inhaberfarbe im Hologramm** — 🧩 Implementiert · Abnahme offen, 2/3 Teilschritte. Nächster Schritt: Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore.
- **COOP-04 · Baunachweis je Spieler (Plugin zählt Blöcke in Abschnittsboxen), Lagerkisten des Teams zählen, Bestand ins Baustellen-Lager übernehmen** — 🧩 Implementiert · Abnahme offen, 3/4 Teilschritte. Nächster Schritt: Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung in COOP-05 (geprüfte Lagerkisten, docs/architecture/LAGERKISTEN.md).
- **PROJ-01 · Projektplanung für große Projekte: Meilensteine mit Terminen, Abhängigkeiten zwischen Bauabschnitten (Vorschläge aus Geometrie und Anschlüssen), Bauleute mit Zuweisung, Zeitplan über Bautage mit kritischem Pfad, Bedarf je Meilenstein und Bauleute, Vorlagen aus Phasen-Abschnitten** — 🧩 Implementiert · Abnahme offen, 4/5 Teilschritte. Nächster Schritt: Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel.
- **GAME-09 · Bauplaner-Brücke auf Modrinth: Projekt „Bauplaner Bridge“ (Fabric, NeoForge, Paper-Plugin) mit Text, Icon, Bildern, Änderungsliste und Hochladeskript; jede Mod-Veröffentlichung lädt die neue Version hoch** — 🚧 In Arbeit, 4/5 Teilschritte. Nächster Schritt: Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind.
- **GAME-10 · Befehlsseite im Plan-Menü (J) der Mod 0.11.0: alle Mod- und Plugin-Befehle (Hologramm, Team, Lager, Nachweis, Verbindung, Aufnahme) per Klick mit Eingabefeldern, Statusübersicht und Antworten** — 🧩 Implementiert · Abnahme offen, 3/4 Teilschritte. Nächster Schritt: Abnahme MOD-16 auf Philipps Server mit Paper-Plugin.
- **GAME-11 · Client-Mod für weitere Minecraft-Versionen und Launcher: Versionsmatrix, zweite Version über den versionsneutralen Kern, Spieltests, Download und Modrinth je Version, Anleitung für Modrinth App, Prism, CurseForge und den offiziellen Launcher** — 🚧 In Arbeit, 1/4 Teilschritte. Nächster Schritt: Entschieden (Philipp 04.11.): Fabric 26.3 (sein Modpack mit REI) hat Vorrang, danach jeweils die neueste Minecraft-Version nachziehen; keine Matrix älterer Versionen.
- **COOP-07 · Team live ohne Dateien: Team-Raum (Worker + Durable Object), Einladungslink, Live-Abgleich in jedem Reiter, Planstand live, Servermessungen mit Serverschlüssel** — 🧩 Implementiert · Abnahme offen, 6/7 Teilschritte. Nächster Schritt: Spieltest TEAMBAU-25 mit Mitspielern (Philipp); Steuerkanal und Kopplung ohne Befehl umgesetzt (LINK-05).
- **PROD-01 · Produktionsdaten: Katalog von 34 Farmarten mit Richtwerten je Einheit, Bedingungen, Reichweite, Verbrauch und Bauplan; Farmliste je Projekt (Anzahl, Zustand, Ort, Bauteil, Kartenpunkt) und Ertragsbuch, das ins Baustellen-Lager bucht und gemessene Raten liefert** — 🧩 Implementiert · Abnahme offen, 3/4 Teilschritte. Nächster Schritt: Abnahme PROJ-12; später Erträge aus geprüften Lagerkisten (COOP-05) ins Ertragsbuch.
- **PROD-02 · Deckung und Engpässe: Restbedarf des Sammelplans gegen laufende Farmen und Handarbeit (gemeinsame Warteschlange, gieriger Ausgleich), Engpass, Materialbereitschaft je Abschnitt in Spieltagen, „Lohnt sich eine Farm?“ mit Amortisation aus Bauplan-Kosten** — 🧩 Implementiert · Abnahme offen, 3/4 Teilschritte. Nächster Schritt: Abnahme PROJ-13.
- **PROD-03 · Verarbeitung und Logistik: Öfen für eine Zielzeit, Brennstoff je Sorte und netto aus Brennstofffarmen (Seetang, Bambus, Lava), Lagerplatz/Shulker/Fahrten je Abschnitt, Trichterdurchsatz und „Truhe voll nach“ je Farm, Sortier-Module** — 🧩 Implementiert · Abnahme offen, 3/3 Teilschritte. Nächster Schritt: Später: Ofenstraße aus dem Katalog direkt vorschlagen und in die Planung legen.
- **PROD-04 · Anbindung der Produktion: Farmen aus Projekt-Bauteilen mit Baufortschritt, Farmpunkte der Weltkarte übernehmen und eintragen, bester AFK-Platz nach Simulationsdistanz, Materialbereitschaft gegen Zeitplan der Planung, Sammelaufträge je Bauleute (TEAM-03-S02), Produktionsblatt als Text** — 🧩 Implementiert · Abnahme offen, 4/5 Teilschritte. Nächster Schritt: Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin.
- **PROD-05 · Erträge aus geprüften Lagerkisten: Sammeltruhe je Farm, echte Rate aus Ertragsmeldungen des Servers (store.yield) oder Trichterbuchungen, Vorschläge zum Verknüpfen, ohne Doppelbuchung** — 🧩 Implementiert · Abnahme offen, 5/5 Teilschritte. Nächster Schritt: Test im Spiel: Ertragskiste mit Farm verknüpfen, Rate im Reiter Produktion prüfen.
- **LINK-01 · Plugin richtet sich selbst ein und lässt sich per Klick koppeln (link.json, Server-ID, Kopplung nur OP/Bauleitung über den Teamkanal)** — 🧩 Implementiert · Abnahme offen, 3/4 Teilschritte. Nächster Schritt: Abnahme LINK-01 auf Philipps Server.
- **LINK-02 · Signierte Steuernachrichten statt Serverbefehlen (HMAC, steigende Nummer, feste Einstellungsliste, Team, Raum, Plan, Umbenennen, Geräte)** — 🧩 Implementiert · Abnahme offen, 4/4 Teilschritte. Nächster Schritt: Abnahme LINK-02 und LINK-11.
- **LINK-03 · Mod: Live-Dienst startet selbst, Planer per Klick im Spiel zulassen, Teamfreigabe als Knopf, Server-Wege weiterreichen (Mod 0.12.0)** — 🧩 Implementiert · Abnahme offen, 4/5 Teilschritte. Nächster Schritt: Abnahme LIVE-01 in Philipps Modpack.
- **LINK-04 · Planer: Bereich „Spiel und Server verbinden – ohne Befehle“ (#/mod), Server koppeln und einstellen, Team und Raum per Knopf** — 🧩 Implementiert · Abnahme offen, 3/4 Teilschritte. Nächster Schritt: Abnahme durch Philipp.
- **LINK-05 · Zweiter Weg über den Team-Raum: Steuernachrichten ohne Mod (iPad), weiteres Gerät per Link freigeben** — 🧩 Implementiert · Abnahme offen, 5/5 Teilschritte. Nächster Schritt: Abnahme vom iPad (Testplan LINK-04).
- **LINK-06 · Weitere Steuerung ohne Befehle: Plan mit Anker von der Weltkarte auf den Server und Serveraufnahme per Klick zurück in den Planer** — 🧩 Implementiert · Abnahme offen, 2/2 Teilschritte. Nächster Schritt: Abnahme durch Philipp (Testplan LINK-05, LINK-06; Paper-Plugin 0.13.0 auf dem Server).
- **COOP-09 · Team live im Alltag: Status und Meldungen in jedem Reiter, Anwesenheit mit Abschnitt, Einladung/Server-Link erneuern, abgelehnte Meldungen sichtbar** — 🧩 Implementiert · Abnahme offen, 4/5 Teilschritte. Nächster Schritt: Abnahme mit Mitspielern (TEAMBAU-25).
- **PROJ-02 · Projektplanung vertieft: Zeitplan ab heute, Abschnitte warten auf Material aus der Produktion, Basisplan mit Verzug je Abschnitt/Meilenstein, Anteil der Bautage je Bauleute** — 🧩 Implementiert · Abnahme offen, 4/5 Teilschritte. Nächster Schritt: Abnahme durch Philipp (S05, PROJ-16…18).
- **LINK-07 · Ohne Server-Datei: Mod spricht direkt mit dem Team-Raum (Teamstand, eigene Meldungen, Anwesenheit); Plugin nur noch freiwilliger Zusatz für Schutz und geprüfte Kisten** — 🚧 In Arbeit, 5/6 Teilschritte. Nächster Schritt: Team-Thread deployt den Raum (Aufnahmen, Positionen); Modrinth 0.15.0; Abnahme LINK-07/LINK-08 durch Philipp.
- **TERRAIN-03 · Gelände und Wege im Projekt: Aufschütten, Abtragen, Rampe, Wegstufen als Treppen, Brücken mit Geländer, Weg aus der Weltkarte** — 🧩 Implementiert · Abnahme offen, 7/8 Teilschritte. Nächster Schritt: Abnahme PROJ-19, BIB-19 und BIB-20 im Spiel (Treppen, Brücken, Wegenetz der Basis auf echtem Gelände).
- **GFX-02 · Darstellung und Leistung, Runde 2: Biomfarben, leuchtende Blockentities (Leuchtfeuer-Strahl, Endportal, Magma), GPU-Upload großer Szenen in Stücken** — 🧩 Implementiert · Abnahme offen, 3/4 Teilschritte. Nächster Schritt: Abnahme auf echten GPUs, Firefox/Safari und Abgleich mit Spielbildern (S04, zusammen mit GFX-01-S06).
- **EDIT-06 · Direkt im 3D-Bild bauen: Blöcke an Flächen setzen/abbauen, Formen und Gruppen im 3D aufziehen und ziehen, Truhen- und Schildinhalte bearbeiten** — 🧩 Implementiert · Abnahme offen, 4/5 Teilschritte. Nächster Schritt: EDIT-06-S05: Philipp prüft das Bauen im 3D-Bild auf PC und iPad (WERK-08) und lädt eine Truhe/ein Schild mit Inhalt im Spiel (WERK-09).
- **STRUCT-01 · Dateistruktur sauber neu ordnen: Fachordner im Kern und in der Oberfläche, Skripte, Tests und Doku nach Bereich, Ordnerkarte docs/STRUKTUR.md** — 🧩 Implementiert · Abnahme offen, 4/4 Teilschritte. Nächster Schritt: Durchsicht der Ordnerkarte durch Philipp; parallele Threads ziehen neue Dateien mit dem Codemod nach.
- **UX-01 · Bedienung des Planers vereinfachen (Struktur und Abläufe)** — 🚧 In Arbeit, 6/6 Teilschritte. Nächster Schritt: Philipps Abnahme START-10..13 im Browser und auf dem iPad. Optik übernimmt „Planer-Oberfläche schön neu gestalten“.
- **UI-03 · Design-System: saubere, einheitliche und schön angepasste Planer-Oberfläche** — 🧩 Implementiert · Abnahme offen, 4/5 Teilschritte. Nächster Schritt: Abnahme START-20/21 durch Philipp am iPad; gruppierte Projektreiter aus „Bedienung vereinfachen“ und Anleitung optisch mitziehen; Werte an das Mod-Menü weitergeben.

## Verbindlicher Ablauf bei jedem Main-Merge oder Push

1. Vor Beginn Aufgabe und Dateiumfang in COMMUNICATION anmelden; Eintrag hier auf „In Arbeit“ setzen.
2. Teilschritte und Nachweise nach jedem vollständigen Arbeitsblock aktualisieren; Blocker mit Grund und nächster Aktion festhalten.
3. `npm run roadmap:record -- ID-01,ID-02 "Konkretes Ergebnis und Prüfgrenzen"` hängt Dateien und Aufgabenstände an die Historie an und rendert beide Ansichten. Änderungen an Aufgaben vorher in roadmap.json eintragen.
4. `npm run check` und ausführbare Browserprüfungen durchführen; Ergebnisse in TESTING festhalten.
5. `npm run check:roadmap-change -- <vorheriger-main> [quellcommit]` prüft vor Integration Dateizuordnung, neue Ereignisse und unveränderte Historie.
6. Regulär integrieren; den passenden manifestgeprüften Pages-Artefaktcommit unmittelbar veröffentlichen. Artefaktcommits benötigen keinen neuen Aufgabenstatus.
7. Integration und Live-Hash prüfen; tatsächliche SHAs im Abschluss berichten und beim nächsten sachlichen Quellupdate nachtragen. Keine künstliche Deployment-Commit-Schleife.

Lokaler Pre-Push-Hook: `npm run setup:hooks`. Ohne eigene Actions erzwingt GitHub diese lokale Regel nicht für fremde Clients oder direkte API-Schreibzugriffe. Auch beim Konnektor gilt deshalb die dokumentierte Vorprüfung.

## P1: Bestand konsolidieren und Architektur absichern

**Ziel:** Aktueller, prüfbarer Stand mit entkoppeltem Fachkern und verbindlicher Fortschrittsführung.

**Austrittskriterien:**

- Alle aktiven Aufgaben mit ID, Zuständigkeit und Abnahme erfasst.
- Export und Aufnahmeverwaltung laufen außerhalb der Domäne; Architekturgrenzen automatisch geprüft.
- Projekt- und Assetänderungen verlieren bei konkurrierenden Schreibvorgängen keine Daten.
- Aktuelle Browserabnahme durchgeführt; verbleibende Geräteprüfungen ausdrücklich offen.

| ID | Arbeitspaket | Status | Schritte | Abhängigkeiten | Main | Pages-Quelle |
|---|---|---|---:|---|---|---|
| [CORE-01](#core-01) | Voxelvertrag, unveränderliche Daten und Zellsemantik | ✅ Im beschriebenen Umfang geprüft | 1/1 | — | `84838f0` | `e232b26` |
| [CORE-02](#core-02) | Assets, feste Versionen und Projektoperationen | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-01 | `84838f0` | `e232b26` |
| [CORE-03](#core-03) | Composer, Voxelkonflikte und Anschlüsse | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-02 | `84838f0` | `e232b26` |
| [STORE-01](#store-01) | Lokale Speicherung, Migration und Sicherungen | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-02 | `84838f0` | `e232b26` |
| [MAT-01](#mat-01) | Bauitems und Rohstoffplanung im bestehenden Katalog | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-03 | `84838f0` | `e232b26` |
| [BUILD-01](#build-01) | Bauanleitung, eigene Abschnitte, Lager und Sammelplan | ✅ Im beschriebenen Umfang geprüft | 1/1 | MAT-01 | `84838f0` | `e232b26` |
| [LIB-01](#lib-01) | Bestehender Gebäudekatalog und Bibliotheksabläufe | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-02 | `84838f0` | `e232b26` |
| [GEN-01](#gen-01) | Vorhandene parametrische Generatoren | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-03 | `84838f0` | `e232b26` |
| [OPS-01](#ops-01) | Main/root-Pages mit manifestgeprüften Artefakten | ✅ Im beschriebenen Umfang geprüft | 1/1 | — | `84838f0` | `e232b26` |
| [PLAN-01](#plan-01) | Verbindlicher Aufgabenbestand und Merge-Fortschritt | ✅ Im beschriebenen Umfang geprüft | 4/4 | — | `b5eb5b9` | `b5eb5b9` |
| [ARCH-01](#arch-01) | Anwendungsschicht und überprüfte Modulgrenzen | ✅ Im beschriebenen Umfang geprüft | 4/4 | CORE-01, CORE-02 | `ccf4fa7` | `ccf4fa7` |
| [ARCH-02](#arch-02) | Planmodell: Verweisgraph, kompakter Blockdatenspeicher und Migrationsregeln | 🧩 Implementiert · Abnahme offen | 4/5 | ARCH-01, STORE-01, STORE-02 | ausstehend | ausstehend |
| [DOC-01](#doc-01) | Widerspruchsfreie aktuelle Statusdokumentation | ✅ Im beschriebenen Umfang geprüft | 3/3 | PLAN-01 | `b5eb5b9` | `b5eb5b9` |
| [STORE-02](#store-02) | Revisionsschutz bei konkurrierenden Assetänderungen | ✅ Im beschriebenen Umfang geprüft | 3/3 | ARCH-01 | `b5eb5b9` | `b5eb5b9` |
| [QA-01](#qa-01) | Aktuelle Browserregression für alle Hauptabläufe | ✅ Im beschriebenen Umfang geprüft | 2/2 | ARCH-01 | `b5eb5b9` | `b5eb5b9` |
| [QA-03](#qa-03) | Wacklige Browsertests stabilisieren (Schnellsuche, Systemcheck, Editor- und Snap-Ziehtests) | ✅ Im beschriebenen Umfang geprüft | 7/7 | QA-01 | ausstehend | ausstehend |
| [UI-01](#ui-01) | Neue Themen, Bauwelten und Materiallabor abnehmen | ✅ Im beschriebenen Umfang geprüft | 3/3 | QA-01 | `84838f0` | `e232b26` |
| [STAB-01](#stab-01) | Absturzschutz, Datencheck und Fehlerberichte abnehmen | ✅ Im beschriebenen Umfang geprüft | 2/2 | QA-01 | `84838f0` | `e232b26` |
| [OPS-02](#ops-02) | Deployment-Rückkehr und Wiederherstellungsprobe | ✅ Im beschriebenen Umfang geprüft | 2/2 | OPS-01, PLAN-01 | ausstehend | ausstehend |
| [OPS-03](#ops-03) | Alte vollständig integrierte Branches bereinigen | ✅ Im beschriebenen Umfang geprüft | 2/2 | OPS-01 | `b5eb5b9` | `b5eb5b9` |
| [LICENSE-01](#license-01) | Projektlizenz und öffentliche Inhalte klären | ✅ Im beschriebenen Umfang geprüft | 2/2 | — | ausstehend | ausstehend |
| [GAME-01](#game-01) | Spielaufnahmen und Soll/Ist-Vergleich | ✅ Im beschriebenen Umfang geprüft | 1/1 | CORE-02, BUILD-01 | `b5eb5b9` | `b5eb5b9` |

## P2: Minecraft-Datentreue und Berechnungen vervollständigen

**Ziel:** Ein benanntes Java-Profil liefert konsistente Transformationen, Mengen und Referenzexporte.

**Austrittskriterien:**

- Registry-, Item- und Rezeptdaten an dasselbe dokumentierte Profil gebunden.
- Echte Schem-/Litematic-Referenzen geprüft; unbekannte Semantik bleibt gesperrt.
- Diff und Export erhalten relevante BlockEntity-Inhalte.
- Große Berechnungen abbrechbar und mit dokumentiertem Szenario gemessen.

| ID | Arbeitspaket | Status | Schritte | Abhängigkeiten | Main | Pages-Quelle |
|---|---|---|---:|---|---|---|
| [PROFILE-01](#profile-01) | Ein verbindliches Java-Versionsprofil | 🧩 Implementiert · Abnahme offen | 3/3 | ARCH-01 | ausstehend | ausstehend |
| [NBT-01](#nbt-01) | Semantische BlockEntity-Transformationen | 🧩 Implementiert · Abnahme offen | 3/3 | PROFILE-01 | ausstehend | ausstehend |
| [FORMAT-01](#format-01) | Schem v3 an echten Referenzwerkzeugen abnehmen | 🧩 Implementiert · Abnahme offen | 1/2 | PROFILE-01, NBT-01 | `84838f0` | `e232b26` |
| [FORMAT-02](#format-02) | Litematic an echten Referenzdateien abnehmen | 🧩 Implementiert · Abnahme offen | 3/4 | PROFILE-01, NBT-01 | `84838f0` | `e232b26` |
| [MAT-02](#mat-02) | Versionierte Item-/Rezeptauflösung vervollständigen | 🧩 Implementiert · Abnahme offen | 3/3 | PROFILE-01, MAT-01 | ausstehend | ausstehend |
| [MAT-03](#mat-03) | Vorhandene Glas-/Beton-/Terrakottavarianten abnehmen | 🧩 Implementiert · Abnahme offen | 3/3 | PROFILE-01, QA-01 | `84838f0` | `e232b26` |
| [MAT-04](#mat-04) | Kupfer mit Oxidation und Wachsstatus | 🧩 Implementiert · Abnahme offen | 2/2 | PROFILE-01, MAT-03 | ausstehend | ausstehend |
| [DIFF-01](#diff-01) | Verschiebungserkennung und BlockEntity-Diff | 🧩 Implementiert · Abnahme offen | 3/3 | CORE-02, NBT-01 | `84838f0` | `e232b26` |
| [PERF-01](#perf-01) | Große Berechnungen als abbrechbare Worker-Aufträge | ✅ Im beschriebenen Umfang geprüft | 3/3 | ARCH-01 | `7dffd92` | `7dffd92` |
| [PERF-02](#perf-02) | Zellindizes, Chunkdaten und selektive Neuberechnung | 🧩 Implementiert · Abnahme offen | 3/3 | PERF-01 | `7dffd92` | `7dffd92` |
| [PERF-03](#perf-03) | Bundle, große Views und Vorschaucache | ✅ Im beschriebenen Umfang geprüft | 3/3 | ARCH-01, QA-01 | ausstehend | ausstehend |
| [VIEW-01](#view-01) | Vorhandenen Viewer vollständig abnehmen | 🧩 Implementiert · Abnahme offen | 1/2 | QA-01 | `84838f0` | `e232b26` |
| [ENTITY-01](#entity-01) | Gemälde, Rahmen, Rüstungsständer und Blockinhalte | 🧩 Implementiert · Abnahme offen | 5/6 | FORMAT-02 | ausstehend | ausstehend |

## P3: Architekturwerkbank und Bauablauf ausbauen

**Ziel:** Vom Import bis zum Nachbauen großer Projekte nachvollziehbar arbeiten.

**Austrittskriterien:**

- Zustandsabhängige Blockformen mit korrektem Picking und Layern.
- Eigene Sammlungen, Ensembles und kontrollierte Versionsupdates nutzbar.
- Weltkarte und Spielbrücke als vollständige, getrennt geprüfte Abläufe.
- Desktop und echtes iPhone für die vorgesehenen Abläufe geprüft.

| ID | Arbeitspaket | Status | Schritte | Abhängigkeiten | Main | Pages-Quelle |
|---|---|---|---:|---|---|---|
| [QA-02](#qa-02) | Echte GPU-, Safari- und iPhone-Abnahme | 🚧 In Arbeit | 1/2 | QA-01, VIEW-02 | ausstehend | ausstehend |
| [UI-02](#ui-02) | App-Hülle, Navigation und Handyoberfläche überarbeiten | ✅ Im beschriebenen Umfang geprüft | 4/4 | UI-01, QA-01 | ausstehend | ausstehend |
| [PERF-04](#perf-04) | Schwere Berechnungen im Hintergrund-Worker mit Fortschritt und Abbrechen: großer Import und Speichern, 3D-Ansicht mit Licht, 3D-Export, Versionsvergleich, Update-Vorschau, Bibliotheksstart | 🧩 Implementiert · Abnahme offen | 6/7 | PERF-01, MODEL-01, ARCH-02 | ausstehend | ausstehend |
| [PERF-05](#perf-05) | Gesamtsystem auf Ladezeit und Stabilität optimiert: Katalog beim Bauen vorberechnet, Seiten bei Bedarf geladen, schnelleres Hashing, plattformfeste Mathematik, priorisierter Befund | 🧩 Implementiert · Abnahme offen | 9/9 | PERF-04 | ausstehend | ausstehend |
| [PERF-06](#perf-06) | Mehr Leistung ohne eigenen Server: Offline-Speicher (Service Worker) und kostenlose zweite Adresse auf Cloudflare Pages | 🚧 In Arbeit | 2/3 | PERF-05 | ausstehend | ausstehend |
| [VIEW-02](#view-02) | Minecraft-nahe zustandsabhängige Blockformen | 🧩 Implementiert · Abnahme offen | 5/6 | PROFILE-01, VIEW-01 | ausstehend | ausstehend |
| [BLOCK-01](#block-01) | Echte Minecraft-Blocklogik 26.3: Zustände, Verbindungen, Halt, Bauschritte, Material | 🧩 Implementiert · Abnahme offen | 6/7 | VIEW-02, BUILD-01, MAT-01 | ausstehend | ausstehend |
| [BLOCK-02](#block-02) | Katalog und Generatoren spielgerecht: keine schwebenden Blöcke, Verbindungen wie im Spiel | 🧩 Implementiert · Abnahme offen | 5/6 | BLOCK-01, LIB-04, UPDATE-01 | ausstehend | ausstehend |
| [GFX-01](#gfx-01) | Grafik vertiefen: Minecraft-Licht, Eckschatten, Sonne mit Schatten, Nacht, Spawnprüfung, sortiertes Glas und 32³-Abschnitte für große Modelle | 🧩 Implementiert · Abnahme offen | 5/6 | VIEW-02 | ausstehend | ausstehend |
| [GFX-02](#gfx-02) | Darstellung und Leistung, Runde 2: Biomfarben, leuchtende Blockentities (Leuchtfeuer-Strahl, Endportal, Magma), GPU-Upload großer Szenen in Stücken | 🧩 Implementiert · Abnahme offen | 3/4 | GFX-01, VIEW-02, PERF-04 | ausstehend | ausstehend |
| [GFX-03](#gfx-03) | Große Szenen flüssig bedienen: Glas und Wasser je Bild sortiert, schnelles und richtiges Anklicken, Sichtfeld zuerst hochladen | 🧩 Implementiert · Abnahme offen | 3/4 | GFX-02, PERF-04 | ausstehend | ausstehend |
| [MODEL-01](#model-01) | 3D-Export: Bauteile, Projekte und Anlagen als OBJ/MTL, glTF/GLB, STL und 3MF (Ansichtsmodell mit Blockformen/Texturen, wasserdichte Druckhülle mit Maßstab, Füllen, Aushöhlen, Farben) | 🧩 Implementiert · Abnahme offen | 5/6 | VIEW-02, GFX-01 | ausstehend | ausstehend |
| [EDIT-01](#edit-01) | Mehrfachauswahl und sichtbare Freiraumhüllen | 🧩 Implementiert · Abnahme offen | 2/2 | STORE-02, VIEW-01 | ausstehend | ausstehend |
| [EDIT-02](#edit-02) | Blockeditor: Blöcke setzen, entfernen, ersetzen und drehen | 🧩 Implementiert · Abnahme offen | 5/5 | VIEW-01, STORE-02 | ausstehend | ausstehend |
| [EDIT-03](#edit-03) | Werkstatt vertiefen: Muster-Pinsel, Bogen/Pyramide/Kegel/Mauerzug, Schablonen, Ebenenübersicht und Tastenkürzel | 🧩 Implementiert · Abnahme offen | 5/5 | EDIT-02 | ausstehend | ausstehend |
| [EDIT-04](#edit-04) | Kreativwerkzeuge aus dem Planer-Vergleich: Symmetrie, Kurven, Naturwerkzeuge, Oberflächenmaske, Farbpaletten, Bild → Blöcke | 🧩 Implementiert · Abnahme offen | 7/8 | EDIT-03 | ausstehend | ausstehend |
| [EDIT-05](#edit-05) | Auswahl- und Formwerkzeuge aus Editor-Mods: Zauberauswahl, Auswahl wachsen/schrumpfen/einpassen, Stapeln, Extrudieren, Ellipsoid/Torus/Spirale, Entities ziehen mit | 🧩 Implementiert · Abnahme offen | 6/7 | EDIT-04, ENTITY-01 | ausstehend | ausstehend |
| [UPDATE-01](#update-01) | Kontrollierte Versionsupdates mit lokalen Overrides | 🧩 Implementiert · Abnahme offen | 2/2 | DIFF-01, STORE-02 | ausstehend | ausstehend |
| [LIB-02](#lib-02) | Eigene Sammlungen, Ordner und Kategorien | 🧩 Implementiert · Abnahme offen | 2/2 | STORE-02, LIB-01 | ausstehend | ausstehend |
| [LIB-03](#lib-03) | Eigene Ensembles und Generatorvorlagen speichern | 🧩 Implementiert · Abnahme offen | 2/2 | LIB-02, GEN-01 | ausstehend | ausstehend |
| [WORLD-02](#world-02) | Weitere kuratierte Bauwelten | ✅ Im beschriebenen Umfang geprüft | 2/2 | LIB-01, UI-01 | `c3e6478` | `c3e6478` |
| [BUILD-05](#build-05) | Bauwelt-Anlagen mit Konfliktvorschau | ✅ Im beschriebenen Umfang geprüft | 3/3 | LIB-03, CORE-03 | ausstehend | ausstehend |
| [TERRAIN-01](#terrain-01) | Geländeaufnahmen für Weltkarte und Anlagen | 🧩 Implementiert · Abnahme offen | 4/5 | WORLD-IMPORT-01, BUILD-05, MAP-01 | ausstehend | ausstehend |
| [TERRAIN-02](#terrain-02) | Landschaft gestalten: Gelände formen, bemalen, Wasser und Wege | 🧩 Implementiert · Abnahme offen | 6/7 | TERRAIN-01, BUILD-05, MAP-01 | ausstehend | ausstehend |
| [TERRAIN-03](#terrain-03) | Gelände und Wege im Projekt: Aufschütten, Abtragen, Rampe, Wegstufen als Treppen, Brücken mit Geländer, Weg aus der Weltkarte | 🧩 Implementiert · Abnahme offen | 7/8 | TERRAIN-02, TERRAIN-01, MAP-04, BASE-01 | ausstehend | ausstehend |
| [TERRAIN-04](#terrain-04) | Gelände direkt aus der Mod: Geländegedächtnis, Übernahme ohne Dateien, blockgenaue Prüfung aus dem Spiel | 🧩 Implementiert · Abnahme offen | 4/5 | TERRAIN-01, TERRAIN-02, MAP-03, GAME-08 | ausstehend | ausstehend |
| [BUILD-06](#build-06) | Bauführung im Spiel: Schichtführung, Tagesziele, Packlisten, Druck-/Handyansicht, Spielfortschritt | 🧩 Implementiert · Abnahme offen | 5/5 | BUILD-01, GAME-01, MAP-01 | ausstehend | ausstehend |
| [GEN-02](#gen-02) | Weitere Generatoren und Dachdetails | 🧩 Implementiert · Abnahme offen | 5/5 | GEN-01, PROFILE-01 | ausstehend | ausstehend |
| [MAP-01](#map-01) | Weltlage und begehbare Projektkarte | 🧩 Implementiert · Abnahme offen | 4/4 | CORE-03, STORE-02 | `84838f0` | `e232b26` |
| [MAP-03](#map-03) | Live-Karte mit Spielanbindung: Weltplan auf der Karte, Live-Position/Gelände/Fortschritt aus der Mod, Übergabe an die Mod | 🧩 Implementiert · Abnahme offen | 5/6 | MAP-01 | ausstehend | ausstehend |
| [MAP-04](#map-04) | Weltbuilder vertiefen: Löschen und Entfernen für alle Objekte der Weltkarte, Mehrfachauswahl, Kontextmenü, gemeinsames Rückgängig, Duplizieren/Drehen/Spiegeln, Wegecken, Ebenen, Objektliste | 🧩 Implementiert · Abnahme offen | 6/7 | MAP-03 | ausstehend | ausstehend |
| [MAP-02](#map-02) | Gespeicherte Kartenziele und konkrete Provideradapter: mehrere Server-Karten speichern und teilen, echte Marker für BlueMap (marker-sets) und Dynmap (dmarker-Befehle), Markerdatei als Weltplan-Punkte | 🧩 Implementiert · Abnahme offen | 2/3 | MAP-01 | ausstehend | ausstehend |
| [GAME-02](#game-02) | Fabric-Brücke kompilieren und im Spiel abnehmen | 🧩 Implementiert · Abnahme offen | 4/5 | FORMAT-01, GAME-01 | `84838f0` | `e232b26` |
| [GAME-07](#game-07) | Bauplaner-Mod 2.0: Hologramm und Live-Abgleich (nur Client, ohne Server) | 🧩 Implementiert · Abnahme offen | 10/11 | GAME-02 | ausstehend | ausstehend |
| [GAME-08](#game-08) | Bauplaner-Mod Protokoll 2: Zonen, Ebenen, Farben und neue Punktarten im Spiel (marks2), Mitspieler für die Karte (GET /v1/players), hello.protocol 2 | 🧩 Implementiert · Abnahme offen | 5/5 | GAME-07, MAP-06 | ausstehend | ausstehend |
| [GAME-03](#game-03) | Optionale lokale Verbindung und Anzeige im Spiel | 🧩 Implementiert · Abnahme offen | 2/2 | GAME-02 | ausstehend | ausstehend |
| [WORLD-IMPORT-01](#world-import-01) | Bereichsweiser Weltimport und Terrainprüfung | 🧩 Implementiert · Abnahme offen | 2/2 | PROFILE-01, PERF-02, FORMAT-01 | ausstehend | ausstehend |
| [BACKUP-02](#backup-02) | Sicherungserinnerung und Abschnittsrevisionen | 🧩 Implementiert · Abnahme offen | 2/2 | STORE-01, BUILD-01 | ausstehend | ausstehend |
| [GAME-04](#game-04) | Paper-Plugin der Bauplaner-Brücke (serverseitig, mehrere Minecraft-Versionen) | 🚧 In Arbeit | 3/4 | GAME-02 | ausstehend | ausstehend |
| [GAME-05](#game-05) | NeoForge- und Forge-Brücke mit gemeinsamer Befehlslogik | 🧩 Implementiert · Abnahme offen | 3/4 | GAME-02 | ausstehend | ausstehend |
| [LIB-04](#lib-04) | Gebäudebibliothek v3: Inhalte in alle Richtungen | 🧩 Implementiert · Abnahme offen | 4/4 | LIB-01 | ausstehend | ausstehend |
| [LIB-05](#lib-05) | Bibliothek im Stil der Vorlagen: Gestaltungsregeln, Baukasten, neu gezeichnete Gebäude und Generatoren | 🧩 Implementiert · Abnahme offen | 7/8 | LIB-04, BLOCK-02, GEN-02 | ausstehend | ausstehend |
| [LIB-06](#lib-06) | Bibliotheksbeiträge: eigene Bauwerke (Importe, Werkstatt, Generator) als festen Katalogeintrag für alle einreichen – Beitragspaket mit Prüfsumme und Rechtebestätigung, GitHub-Formular, Übernahme-Skript, Auslieferung wie mitgelieferte Gebäude | 🧩 Implementiert · Abnahme offen | 5/7 | LIB-02, LIB-05, PERF-04, UPDATE-01 | ausstehend | ausstehend |
| [BASE-01](#base-01) | Basisplaner: ganze Survival-Basis aus Funktionszonen (Platz, Lager, Schmiede, Verzauberung, XP-Farm, Küche, Halle, Felder, Tierfarm, Hafen, Händler), Wegenetz mit Laternen, Wasserseite, Spielprüfungen je Zone, Bauphasen | 🧩 Implementiert · Abnahme offen | 5/6 | BUILD-05, TERRAIN-01, BLOCK-02 | ausstehend | ausstehend |
| [SPLIT-01](#split-01) | Gebäude aus großen Modellen herauslösen: Gebäude, Felder, Gehege und Wegenetz erkennen, einzeln oder zusammen als Bauteile speichern, als Projekt an alter Stelle aufteilen | 🧩 Implementiert · Abnahme offen | 5/6 | LIB-04, WORLD-IMPORT-01, PERF-04 | ausstehend | ausstehend |
| [GROSS-01](#gross-01) | Großprojekte in der Bibliothek: Städte, Festungen und Anlagen als Plan mit Quartieren auf Straßenraster, eigenem Straßennetz, Bauphasen, Konfliktvorschau und Übernahme als Projekt | 🧩 Implementiert · Abnahme offen | 7/8 | BUILD-05, BASE-01, LIB-05 | ausstehend | ausstehend |
| [MAP-05](#map-05) | Planung auf der Live-Karte vertiefen: Baustand aus dem Spiel (Mod 0.7.1, GET /v1/scan), Ebenen und Abweichungen auf der Karte, bestätigte Schritte abhaken, Bauabschnitte wählen, Weltplan automatisch abgleichen, Hologramm und BlueMap aus dem Kontextmenü | 🧩 Implementiert · Abnahme offen | 4/5 | MAP-03, MAP-04, GAME-07, GAME-01 | ausstehend | ausstehend |
| [MAP-06](#map-06) | Weltkarte in die Tiefe: Zonen, benannte Ebenen und Farben (Weltplan-Schema 2), Messen mit Fläche, Höhenprofil und Route übers Gelände, Marker und Mitspieler aus dem Spiel, Mod-Anbindung über Protokoll 2 (features marks2, players) | 🧩 Implementiert · Abnahme offen | 7/8 | MAP-04, MAP-05, GAME-07 | ausstehend | ausstehend |
| [MAP-07](#map-07) | Gedrehte und gespiegelte Projektlagen auf der Weltkarte: dieselbe Regel wie das Hologramm der Mod, gedrehtes Hologramm übernehmen, Plan gedreht ins Spiel | 🧩 Implementiert · Abnahme offen | 3/4 | MAP-05, MAP-04, GAME-07 | ausstehend | ausstehend |
| [QA-04](#qa-04) | Große Testphase: Checklisten je Bereich, Testprotokoll, Fehlerberichte mit Diagnose (Planer und Mod), Triage | 🧩 Implementiert · Abnahme offen | 4/6 | QA-01, STAB-01, GAME-07 | ausstehend | ausstehend |
| [GEN-03](#gen-03) | Kolosseum aus Philipps Bauplan: Arena-Generator, Bauset Antike und Großprojekt Kolosseum-Viertel | 🧩 Implementiert · Abnahme offen | 5/6 | GEN-02, GROSS-01 | ausstehend | ausstehend |
| [SIZE-01](#size-01) | Volumenlimit für große Builds: eine zentrale Größengrenze (4 Mio. Zellen, 16,7 Mio. Box) für Import, Werkstatt, Export, Aufnahmen und Mod-Übertragung; Hinweise statt Abbruch; Mod 0.9.0 lädt große Pläne ohne Hänger | 🧩 Implementiert · Abnahme offen | 4/5 | PERF-04, ARCH-02, GFX-01, GAME-08 | ausstehend | ausstehend |
| [COOP-01](#coop-01) | Teambau im Planer: Teamprotokoll ohne Backend (Rollen, Abschnittsvergabe, Meldungen, Beiträge, Notizen, Planfreigabe), Teampaket, Meldecode, Reiter „Team“ | 🧩 Implementiert · Abnahme offen | 4/5 | BUILD-06, BACKUP-02 | ausstehend | ausstehend |
| [COOP-02](#coop-02) | Paper-Plugin als Teamknoten: Teambefehle ohne Mod und Planer, Aktionsleiste, Schutz in fremden Abschnitten, Umriss, Ausfuhr ins Teamprotokoll | 🧩 Implementiert · Abnahme offen | 3/4 | COOP-01, GAME-04 | ausstehend | ausstehend |
| [COOP-06](#coop-06) | Teamplanung im Planer: Arbeitspakete, Zuteilung, Zeitplan, Material je Spieler, Fortschritt mit Hinweisen, Konflikthilfe, Planstand-Vergleich, Übergabe und Abwesenheit | 🧩 Implementiert · Abnahme offen | 4/5 | COOP-01 | ausstehend | ausstehend |
| [PROJ-01](#proj-01) | Projektplanung für große Projekte: Meilensteine mit Terminen, Abhängigkeiten zwischen Bauabschnitten (Vorschläge aus Geometrie und Anschlüssen), Bauleute mit Zuweisung, Zeitplan über Bautage mit kritischem Pfad, Bedarf je Meilenstein und Bauleute, Vorlagen aus Phasen-Abschnitten | 🧩 Implementiert · Abnahme offen | 4/5 | BUILD-01, BUILD-06, BACKUP-02 | ausstehend | ausstehend |
| [GAME-09](#game-09) | Bauplaner-Brücke auf Modrinth: Projekt „Bauplaner Bridge“ (Fabric, NeoForge, Paper-Plugin) mit Text, Icon, Bildern, Änderungsliste und Hochladeskript; jede Mod-Veröffentlichung lädt die neue Version hoch | 🚧 In Arbeit | 4/5 | GAME-07, GAME-04 | ausstehend | ausstehend |
| [PROD-01](#prod-01) | Produktionsdaten: Katalog von 34 Farmarten mit Richtwerten je Einheit, Bedingungen, Reichweite, Verbrauch und Bauplan; Farmliste je Projekt (Anzahl, Zustand, Ort, Bauteil, Kartenpunkt) und Ertragsbuch, das ins Baustellen-Lager bucht und gemessene Raten liefert | 🧩 Implementiert · Abnahme offen | 3/4 | BUILD-01 | ausstehend | ausstehend |
| [PROD-02](#prod-02) | Deckung und Engpässe: Restbedarf des Sammelplans gegen laufende Farmen und Handarbeit (gemeinsame Warteschlange, gieriger Ausgleich), Engpass, Materialbereitschaft je Abschnitt in Spieltagen, „Lohnt sich eine Farm?“ mit Amortisation aus Bauplan-Kosten | 🧩 Implementiert · Abnahme offen | 3/4 | PROD-01, PROJ-01 | ausstehend | ausstehend |
| [PROD-03](#prod-03) | Verarbeitung und Logistik: Öfen für eine Zielzeit, Brennstoff je Sorte und netto aus Brennstofffarmen (Seetang, Bambus, Lava), Lagerplatz/Shulker/Fahrten je Abschnitt, Trichterdurchsatz und „Truhe voll nach“ je Farm, Sortier-Module | 🧩 Implementiert · Abnahme offen | 3/3 | PROD-01 | ausstehend | ausstehend |
| [PROD-04](#prod-04) | Anbindung der Produktion: Farmen aus Projekt-Bauteilen mit Baufortschritt, Farmpunkte der Weltkarte übernehmen und eintragen, bester AFK-Platz nach Simulationsdistanz, Materialbereitschaft gegen Zeitplan der Planung, Sammelaufträge je Bauleute (TEAM-03-S02), Produktionsblatt als Text | 🧩 Implementiert · Abnahme offen | 4/5 | PROD-02, MAP-06, PROJ-01 | ausstehend | ausstehend |
| [PROJ-02](#proj-02) | Projektplanung vertieft: Zeitplan ab heute, Abschnitte warten auf Material aus der Produktion, Basisplan mit Verzug je Abschnitt/Meilenstein, Anteil der Bautage je Bauleute | 🧩 Implementiert · Abnahme offen | 4/5 | PROJ-01, PROD-01 | ausstehend | ausstehend |
| [PROJ-03](#proj-03) | Planung Runde 3: Abwesenheiten je Bauleute nach Datum, mehrere Basispläne mit Namen und Vergleich, „abwesend bis“ aus dem Team in die Planung | 🧩 Implementiert · Abnahme offen | 3/4 | PROJ-02, COOP-06 | ausstehend | ausstehend |
| [PROJ-04](#proj-04) | Reihenfolge zwischen Projekten: „erst nach“ anderen Projekten, frühester Start aus dem Basisplan der Vorgänger, Kreise abweisen, Pfeile auf der Weltkarte | 🧩 Implementiert · Abnahme offen | 2/3 | PROJ-03, MAP-04 | ausstehend | ausstehend |
| [PROJ-05](#proj-05) | Bauleute-Konto und Bauleute aus dem Spiel: Lagerbuchungen, Sammelzusagen und Saldo je Bauleute, Mitspieler aus dem Team und live aus dem Team-Raum in der Planung | 🧩 Implementiert · Abnahme offen | 2/3 | PROJ-01, PROJ-03 | ausstehend | ausstehend |
| [EDIT-06](#edit-06) | Direkt im 3D-Bild bauen: Blöcke an Flächen setzen/abbauen, Formen und Gruppen im 3D aufziehen und ziehen, Truhen- und Schildinhalte bearbeiten | 🧩 Implementiert · Abnahme offen | 4/5 | EDIT-01, EDIT-02, EDIT-03, EDIT-05, ENTITY-01 | ausstehend | ausstehend |
| [STRUCT-01](#struct-01) | Dateistruktur sauber neu ordnen: Fachordner im Kern und in der Oberfläche, Skripte, Tests und Doku nach Bereich, Ordnerkarte docs/STRUKTUR.md | 🧩 Implementiert · Abnahme offen | 4/4 | — | ausstehend | ausstehend |
| [CORE-04](#core-04) | Planer-Kernmodule prüfen und überarbeiten: Verbindungen zwischen Projekt, Planung, Werkstatt, Import/Export und Speicher sauber, gefundene Fehler behoben | 🧩 Implementiert · Abnahme offen | 4/5 | ARCH-02, PROJ-04, EDIT-06 | ausstehend | ausstehend |
| [WORLD-SHARE-01](#world-share-01) | Weltplan und Server-Karte nur über den Team-Raum: Weltplan mit Bauplätzen, Gruppen und Sperren an alle Mods und das Paper-Plugin, Plugin schreibt BlueMap-/Dynmap-Marker selbst, Kartenliste geteilt, Dateiwege nur als Notfall | 🧩 Implementiert · Abnahme offen | 4/5 | MAP-02, MAP-04 | ausstehend | ausstehend |
| [UI-03](#ui-03) | Design-System: saubere, einheitliche und schön angepasste Planer-Oberfläche | 🧩 Implementiert · Abnahme offen | 4/5 | UI-01, UI-02 | ausstehend | ausstehend |

## P4: Optionale Zusammenarbeit und Integrationen

**Ziel:** Geteilte Projekte mit sicheren Rechten, geordneten Änderungen und Wiederherstellung.

**Austrittskriterien:**

- API, Rechte und dauerhafter Payloadspeicher mit Wiederherstellung geprüft.
- Parallele Operationen, Reconnect und Team-Undo ohne stillen Verlust.
- Lokaler Gastmodus bleibt nutzbar.
- Live- und weitere Spieladapter getrennt abgenommen; keine impliziten Weltänderungen.

| ID | Arbeitspaket | Status | Schritte | Abhängigkeiten | Main | Pages-Quelle |
|---|---|---|---:|---|---|---|
| [UX-01](#ux-01) | Bedienung des Planers vereinfachen (Struktur und Abläufe) | 🚧 In Arbeit | 6/6 | UI-02, GUIDE-01 | ausstehend | ausstehend |
| [TEAM-01](#team-01) | Backendvertrag, Datenbank und Payloadspeicher | ⏳ Offen | 0/2 | ARCH-01, FORMAT-01, STORE-02, LICENSE-01 | ausstehend | ausstehend |
| [AUTH-01](#auth-01) | Konten, Rechte und Übernahme lokaler Projekte | ⏳ Offen | 0/2 | TEAM-01 | ausstehend | ausstehend |
| [TEAM-02](#team-02) | Geordnete Operationen, Reconnect und Team-Undo | ⏳ Offen | 0/2 | AUTH-01, UPDATE-01 | ausstehend | ausstehend |
| [TEAM-03](#team-03) | Gemeinsame Aufgaben, Abschnitte und Sammelplanung | ⏳ Offen | 0/2 | TEAM-02, BUILD-01 | ausstehend | ausstehend |
| [GAME-06](#game-06) | Sichere Serveranbindung (Webhooks) für Server-Plugins | ⏳ Offen | 0/1 | TEAM-02, GAME-04 | ausstehend | ausstehend |
| [LAGER-01](#lager-01) | Optionale Truhen-/Lagerintegration | 🧩 Implementiert · Abnahme offen | 2/2 | GAME-04 | ausstehend | ausstehend |
| [OPS-04](#ops-04) | Teamdienst betreiben und Wiederherstellung prüfen | ⏳ Offen | 0/2 | TEAM-02 | ausstehend | ausstehend |
| [DEFER-01](#defer-01) | GitHub-Login, externes Materialrepo und Registry | ⏸ Zurückgestellt | 0/1 | — | ausstehend | ausstehend |
| [DEFER-02](#defer-02) | Optionale Discord-Integration | ⏸ Zurückgestellt | 0/1 | AUTH-01 | ausstehend | ausstehend |
| [COOP-03](#coop-03) | Teamabgleich live über die Mod (Merkmal team, Plugin-Kanal bauplaner:team), Abschnitte in Inhaberfarbe im Hologramm | 🧩 Implementiert · Abnahme offen | 2/3 | COOP-02, GAME-08 | ausstehend | ausstehend |
| [COOP-04](#coop-04) | Baunachweis je Spieler (Plugin zählt Blöcke in Abschnittsboxen), Lagerkisten des Teams zählen, Bestand ins Baustellen-Lager übernehmen | 🧩 Implementiert · Abnahme offen | 3/4 | COOP-02, LAGER-01 | ausstehend | ausstehend |
| [COOP-05](#coop-05) | Geprüfte Lagerkisten im Paper-Plugin: markieren und zuordnen, Sollstand und Prüfsumme, Schutzstufen, Buchungen je Spieler, Abgleich mit dem Materialbedarf | 🧩 Implementiert · Abnahme offen | 4/5 | COOP-04 | ausstehend | ausstehend |
| [GAME-10](#game-10) | Befehlsseite im Plan-Menü (J) der Mod 0.11.0: alle Mod- und Plugin-Befehle (Hologramm, Team, Lager, Nachweis, Verbindung, Aufnahme) per Klick mit Eingabefeldern, Statusübersicht und Antworten | 🧩 Implementiert · Abnahme offen | 3/4 | COOP-03, COOP-05, GAME-07 | ausstehend | ausstehend |
| [GAME-11](#game-11) | Client-Mod für weitere Minecraft-Versionen und Launcher: Versionsmatrix, zweite Version über den versionsneutralen Kern, Spieltests, Download und Modrinth je Version, Anleitung für Modrinth App, Prism, CurseForge und den offiziellen Launcher | 🚧 In Arbeit | 1/4 | GAME-07, GAME-10 | ausstehend | ausstehend |
| [COOP-07](#coop-07) | Team live ohne Dateien: Team-Raum (Worker + Durable Object), Einladungslink, Live-Abgleich in jedem Reiter, Planstand live, Servermessungen mit Serverschlüssel | 🧩 Implementiert · Abnahme offen | 6/7 | COOP-01, COOP-04 | ausstehend | ausstehend |
| [COOP-08](#coop-08) | Ertragskisten: Lagerkisten als Sammeltruhe einer Farm messen Ertrag und Laufzeit für das Ertragsbuch (Produktion) | 🧩 Implementiert · Abnahme offen | 3/4 | COOP-05, PROD-01 | ausstehend | ausstehend |
| [PROD-05](#prod-05) | Erträge aus geprüften Lagerkisten: Sammeltruhe je Farm, echte Rate aus Ertragsmeldungen des Servers (store.yield) oder Trichterbuchungen, Vorschläge zum Verknüpfen, ohne Doppelbuchung | 🧩 Implementiert · Abnahme offen | 5/5 | PROD-02, COOP-05, COOP-08 | ausstehend | ausstehend |
| [LINK-01](#link-01) | Plugin richtet sich selbst ein und lässt sich per Klick koppeln (link.json, Server-ID, Kopplung nur OP/Bauleitung über den Teamkanal) | 🧩 Implementiert · Abnahme offen | 3/4 | COOP-02 | ausstehend | ausstehend |
| [LINK-02](#link-02) | Signierte Steuernachrichten statt Serverbefehlen (HMAC, steigende Nummer, feste Einstellungsliste, Team, Raum, Plan, Umbenennen, Geräte) | 🧩 Implementiert · Abnahme offen | 4/4 | LINK-01 | ausstehend | ausstehend |
| [LINK-03](#link-03) | Mod: Live-Dienst startet selbst, Planer per Klick im Spiel zulassen, Teamfreigabe als Knopf, Server-Wege weiterreichen (Mod 0.12.0) | 🧩 Implementiert · Abnahme offen | 4/5 | GAME-08, COOP-03 | ausstehend | ausstehend |
| [LINK-04](#link-04) | Planer: Bereich „Spiel und Server verbinden – ohne Befehle“ (#/mod), Server koppeln und einstellen, Team und Raum per Knopf | 🧩 Implementiert · Abnahme offen | 3/4 | LINK-02, LINK-03 | ausstehend | ausstehend |
| [LINK-05](#link-05) | Zweiter Weg über den Team-Raum: Steuernachrichten ohne Mod (iPad), weiteres Gerät per Link freigeben | 🧩 Implementiert · Abnahme offen | 5/5 | LINK-04, COOP-07 | ausstehend | ausstehend |
| [LINK-06](#link-06) | Weitere Steuerung ohne Befehle: Plan mit Anker von der Weltkarte auf den Server und Serveraufnahme per Klick zurück in den Planer | 🧩 Implementiert · Abnahme offen | 2/2 | LINK-05 | ausstehend | ausstehend |
| [COOP-09](#coop-09) | Team live im Alltag: Status und Meldungen in jedem Reiter, Anwesenheit mit Abschnitt, Einladung/Server-Link erneuern, abgelehnte Meldungen sichtbar | 🧩 Implementiert · Abnahme offen | 4/5 | COOP-07 | ausstehend | ausstehend |
| [COOP-10](#coop-10) | Client zuerst: Baustand und Kisteninhalt laut Spiel (section.seen, store.seen) im Teamstand, ungeprüft getrennt von Servermessungen | 🧩 Implementiert · Abnahme offen | 6/7 | COOP-07, COOP-09 | ausstehend | ausstehend |
| [COOP-11](#coop-11) | Verlauf verdichten: Bauleitung ersetzt Messungen bis zu einem Stichtag durch Summen (team.digest), gleicher Teamstand, Merge ohne Doppelzählung, Produktion und Team live lesen mit | 🧩 Implementiert · Abnahme offen | 4/5 | COOP-01, COOP-05, COOP-08, COOP-09 | ausstehend | ausstehend |
| [LINK-07](#link-07) | Ohne Server-Datei: Mod spricht direkt mit dem Team-Raum (Teamstand, eigene Meldungen, Anwesenheit); Plugin nur noch freiwilliger Zusatz für Schutz und geprüfte Kisten | 🚧 In Arbeit | 5/6 | LINK-06, COOP-07 | ausstehend | ausstehend |
| [FALLBACK-01](#fallback-01) | Ausweichwege über alle Verbindungen: Teamstand offline in der Mod, HTTP statt WebSocket, offline gemerkte Messungen, Baustand über den besten Weg (Spiel → Team-Raum → Server → Datei) | 🚧 In Arbeit | 4/5 | LINK-07, COOP-10 | ausstehend | ausstehend |
| [LINK-10](#link-10) | Anbindung geprüft und gehärtet: Sendungen über den WebSocket nacheinander (Mod und Plugin), Messungen bis zur Bestätigung gemerkt, Team-Raum mit Ping ohne Aufwecken und sauberem Schließen, Planer ohne gestapelte Abfrage-Schleifen | 🧩 Implementiert · Abnahme offen | 6/6 | FALLBACK-01, LINK-07 | ausstehend | ausstehend |
| [LINK-11](#link-11) | Alles über das Internet: Server-Plugin bekommt die Team-Infos von Mod und Planer selbst über den Team-Raum, Dateiwege nur noch als versteckter Notfall (Mod/Plugin 0.21.0) | 🧩 Implementiert · Abnahme offen | 5/6 | LINK-10, COOP-07 | ausstehend | ausstehend |
| [GUIDE-01](#guide-01) | Anleitung „Wie geh ich es an?“: eigener Reiter mit Wegen nach Ziel, jeder Schritt mit Grafik, kurzem Satz und Link an die passende Stelle | 🧩 Implementiert · Abnahme offen | 4/5 | UI-02, GAME-11, TERRAIN-04, LINK-11 | ausstehend | ausstehend |

## Details aller Arbeitspakete

### CORE-01

**Voxelvertrag, unveränderliche Daten und Zellsemantik** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] CORE-01-S01: Validierung, Koordinaten und explizite Luft/Löschzellen umgesetzt.

**Abnahme:** Unabhängige erwartete Zellen und Grenzen bestehen Tests.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/unit/core/voxel.test.mjs](../tests/unit/core/voxel.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/voxel/`. **Abhängigkeiten:** keine. **Alte IDs:** P0-02, P0-03.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### CORE-02

**Assets, feste Versionen und Projektoperationen** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] CORE-02-S01: Asset/Version/Instanz/Revision getrennt; Undo/Redo und Hashprüfung vorhanden.

**Abnahme:** Projekte referenzieren feste Versionen; Originale werden nicht überschrieben.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/unit/core/domain.test.mjs](../tests/unit/core/domain.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/catalog/library.ts`, `packages/domain/src/core/project.ts`. **Abhängigkeiten:** CORE-01. **Alte IDs:** B0, P2-01.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### CORE-03

**Composer, Voxelkonflikte und Anschlüsse** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] CORE-03-S01: Auflösung, Override, Snap, Händigkeit und Freiraumprüfung vorhanden.

**Abnahme:** AABB ist kein Konfliktentscheid; identische Zellen werden einmal gezählt.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/unit/core/connectors.test.mjs](../tests/unit/core/connectors.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/core/compose.ts`, `packages/domain/src/core/connectors.ts`. **Abhängigkeiten:** CORE-02. **Alte IDs:** B5, P2-02.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### STORE-01

**Lokale Speicherung, Migration und Sicherungen** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] STORE-01-S01: Atomare Transaktionen, Projekt-revisionen, Originale und geprüfte Backups vorhanden.

**Abnahme:** Fehlgeschlagene Wiederherstellung überschreibt nichts still.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/unit/data/backup.test.mjs](../tests/unit/data/backup.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/e2e/persistence.e2e.mjs](../tests/e2e/persistence.e2e.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `apps/web/src/app/idbRepository.ts`, `packages/domain/src/data/backup.ts`. **Abhängigkeiten:** CORE-02. **Alte IDs:** B3.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### MAT-01

**Bauitems und Rohstoffplanung im bestehenden Katalog** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MAT-01-S01: Mehrblock-/Anzahlregeln, Stacks, Rezepte, Rundung und Reste vorhanden.

**Abnahme:** Mengen stammen aus der aufgelösten Welt; unbekannte Zuordnungen sichtbar.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/unit/materials/materials.test.mjs](../tests/unit/materials/materials.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/materials/recipes.test.mjs](../tests/unit/materials/recipes.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/materials/materials.ts`, `packages/domain/src/materials/recipes.ts`. **Abhängigkeiten:** CORE-03. **Alte IDs:** B1, B1-R.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### BUILD-01

**Bauanleitung, eigene Abschnitte, Lager und Sammelplan** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] BUILD-01-S01: Schritte, Packlisten, Fortschritt, Abschnitte und Lagerberechnung vorhanden.

**Abnahme:** Manuelle Haken und Spielnachweis getrennt; Voraussetzungen ohne Zyklen.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/unit/building/guide.test.mjs](../tests/unit/building/guide.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/building/site.test.mjs](../tests/unit/building/site.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/building/guide.ts`, `packages/domain/src/building/site.ts`. **Abhängigkeiten:** MAT-01. **Alte IDs:** B4, B14.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### LIB-01

**Bestehender Gebäudekatalog und Bibliotheksabläufe** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LIB-01-S01: 174 Gebäude, Suche, Filter, Vergleich, Merkliste und bestehende Ensembles vorhanden.

**Abnahme:** Stabile Gebäudeversionen, deklarierte Materiallücken und reale Treffer.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/unit/catalog/catalog.test.mjs](../tests/unit/catalog/catalog.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/build/`, `apps/web/src/views/library/`. **Abhängigkeiten:** CORE-02. **Alte IDs:** B9, B9-A, B11.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### GEN-01

**Vorhandene parametrische Generatoren** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GEN-01-S01: Haus, Turm, Mauer, Brücke, Dach und vorhandene Anlagen reproduzierbar.

**Abnahme:** Gleiche Parameter erzeugen gleiche Version; Projekte behalten ihre Version.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/unit/catalog/generators.test.mjs](../tests/unit/catalog/generators.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `packages/domain/src/generators/`. **Abhängigkeiten:** CORE-03. **Alte IDs:** B13.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### OPS-01

**Main/root-Pages mit manifestgeprüften Artefakten** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] OPS-01-S01: Statischer Build und quellenerhaltender Artefakt-Kindcommit implementiert.

**Abnahme:** Source-Hash und Dateihashes überprüfbar; keine eigenen Actions oder Force-Pushes.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Vorheriger dokumentierter Gesamtstand: 342 Node-Tests; kein aktueller Browsernachweis.

**Nachweise:** [tests/unit/tooling/main-pages.test.mjs](../tests/unit/tooling/main-pages.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `scripts/pages/publish_main_pages.sh`, `scripts/pages/prepare_main_pages.mjs`. **Abhängigkeiten:** keine. **Alte IDs:** HP-01, HP-02, HP-03.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### PLAN-01

**Verbindlicher Aufgabenbestand und Merge-Fortschritt** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex · Zuständiger Thread: „Offene Punkte prüfen und Roadmap neu ordnen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PLAN-01-S01: Gesamte Roadmap in vier Phasen und stabile Aufgaben-IDs aufgenommen.
- [x] PLAN-01-S02: Schema, Historie, Darstellung und Änderungsprüfung implementieren und testen.
- [x] PLAN-01-S03: Pflichtablauf in AGENTS und Publisher integrieren; Main-/Pages-Nachweis prüfen.
- [x] PLAN-01-S04: Codex-Setup, lokale Hooks, reproduzierbare Browserabhängigkeit und Werkzeuggrenzen einrichten und prüfen.

**Abnahme:** Jede Aufgabe zeigt Teilschritte, Abhängigkeiten, nächste Aktion und Nachweise. Quelländerungen benötigen eine Aufgabenaktualisierung; Artefaktcommits sind separat nachweisbar.

**Nächste Aktion:** Codex-Arbeitsablauf bei folgenden Quellblöcken anwenden; Cloud-Umgebung bei Bedarf über die Oberfläche erstellen und separat nachweisen.

**Prüfstand:** Lokales Setup, aktive Roadmap-Hooks und bestehende Roadmapregressionen geprüft; Chromium verfügbar, 54/54 E2E bestanden. Keine Codex-Cloud-Umgebung erstellt; fehlende Verwaltungsfunktion konkret dokumentiert. Main-/Pages-Nachweis dieses Blocks folgt getrennt im Abschluss.

**Nachweise:** [tests/unit/tooling/roadmap.test.mjs](../tests/unit/tooling/roadmap.test.mjs) — 5 Regressionen im Gesamtcheck 353/353 bestanden; Mergepflege dokumentiert.; [docs/TESTING.md](TESTING.md) — Aktuelle Blockabnahme mit Infrastrukturgrenzen.; [docs/project/CODEX_SETUP.md](project/CODEX_SETUP.md) — Lokaler Clone, Setupbefehle und getrennte Projekt-/Cloud-/Pageszustände nachgewiesen.

**Dateiumfang:** `docs/roadmap.json`, `scripts/roadmap/roadmap.mjs`, `.githooks/`. **Abhängigkeiten:** keine. **Alte IDs:** P0-01.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### ARCH-01

**Anwendungsschicht und überprüfte Modulgrenzen** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] ARCH-01-S01: Exportkoordination, Speicherports und Aufnahmeverwaltung herausgelöst.
- [x] ARCH-01-S02: Neutraler Aufnahmevertrag und Anwendungsexport an UI angebunden.
- [x] ARCH-01-S03: Gesamtprüfung und bestehende Format-/Browserregressionen ausführen.
- [x] ARCH-01-S04: Architekturvertrag dokumentieren und integriert veröffentlichen.

**Abnahme:** Domain importiert keine Formatwriter, Browseradapter oder Frameworks. Abhängigkeitsprüfung erfasst auch type-only, reexports und dynamische Imports.

**Nächste Aktion:** Bei folgenden Quellblöcken gepflegt halten; Browserabnahme separat in QA-01 verfolgen.

**Prüfstand:** Kern/Anwendung und bestehende Format-/Aufnahmeregressionen bestehen. Neue UI-Browserprüfung wegen fehlender Laufzeit offen. Vorherige Mainintegration und Pages in dieser Fortsetzung bestätigt: Artefakt 18f70b7, Livesource ccf4fa7 und zwölf Dateihashes identisch.

**Nachweise:** [tests/unit/core/application.test.mjs](../tests/unit/core/application.test.mjs) — Exportanwendungsfall, Writerfehler und atomarer Konfliktfall bestanden.; [tests/unit/tooling/architecture.test.mjs](../tests/unit/tooling/architecture.test.mjs) — 3 Architekturregressionen bestanden.; [docs/TESTING.md](TESTING.md) — 353/353 Node-Tests; strenge Typ-/Buildprüfungen bestanden; Browser offen.

**Dateiumfang:** `packages/application/`, `packages/domain/src/versions/revisionExport.ts`, `scripts/checks/check_architecture.mjs`. **Abhängigkeiten:** CORE-01, CORE-02. **Alte IDs:** —.

**Integration:** Main [ccf4fa7](https://github.com/Freadeax/Minecraft-Bauplaner/commit/ccf4fa71c033c2f9415528192a04faed36730660); Pages-Quelle [ccf4fa7](https://github.com/Freadeax/Minecraft-Bauplaner/commit/ccf4fa71c033c2f9415528192a04faed36730660).

### ARCH-02

**Planmodell: Verweisgraph, kompakter Blockdatenspeicher und Migrationsregeln** · 🧩 Implementiert · Abnahme offen · Priorität P0 · Verantwortlich: Claude (Thread „Grundstruktur des Planers erweitern“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] ARCH-02-S01: Bestand aller gespeicherten Datensätze, Teilschemata und Verweise dokumentieren (PLAN_MODEL).
- [x] ARCH-02-S02: Blockzellen gepackt speichern (bp-cells-1, bitgenau, IndexedDB-Migration 4, Sicherungsformat 3).
- [x] ARCH-02-S03: Gemeinsamer Verweisgraph für Sicherung, Datencheck und „Verwendet in“; Abschnittsstände in Projektsicherungen.
- [x] ARCH-02-S04: Datencheck um Sammlungen, Vorlagen und Verlaufsverweise erweitern; Datenmodell-Karte im Systemcheck.
- [ ] ARCH-02-S05: Migration mit echten, über Monate gewachsenen Browserdaten auf Philipps Geräten abnehmen.

**Abnahme:** Inhaltsadressen und Prüfsummen bleiben durch die Speicherform unverändert; ältere Sicherungen bleiben lesbar und werden nicht strenger geprüft; neue Verweise werden nur in planGraph.ts ergänzt.

**Nächste Aktion:** Abnahme der Migration mit echten Browserdaten (S05); danach kompakte Laufzeitform der Zellen als Folge von PERF-02.

**Nur Philipp:** Auf echten Geräten und Browsern: Datencheck unter #/system mit deinen über Monate gewachsenen Browserdaten (S05).

**Prüfstand:** Kern- und Chromiumtests bestanden; Abnahme mit echten Bestandsdaten auf Philipps Geräten offen.

**Nachweise:** [tests/unit/data/plan-model.test.mjs](../tests/unit/data/plan-model.test.mjs) — 13 Fälle: handgerechnete Bytes, Reihenfolge/negative Grenzen/>32 Bit, Ablehnung nicht exakter Zellen, beschädigte Daten, ganzer Katalog bitgenau (41× kleiner), Sicherungsformat 3, Abschnittsstand in Projektsicherung, whereUsed, Datencheck-Schweregrade.; [tests/e2e/plan-model.e2e.mjs](../tests/e2e/plan-model.e2e.mjs) — Chromium: echte Datenbank Version 3 → Migration 4 packt in place, Datencheck ohne Befund, Datenmodell-Karte; „Verwendet in“ nach Projektanlage.; [docs/architecture/kern/PLAN_MODEL.md](architecture/kern/PLAN_MODEL.md) — Datensätze, Verweisrollen mit Pflichtgrad, Speicherform, Migrationsregeln, Grenzen.

**Dateiumfang:** `packages/domain/src/data/planGraph.ts`, `packages/domain/src/data/versionStorage.ts`, `packages/voxel/src/packedCells.ts`, `packages/domain/src/data/backup.ts`, `packages/domain/src/data/integrity.ts`, `apps/web/src/app/idbRepository.ts`, `apps/web/src/views/SystemView.tsx`, `apps/web/src/views/library/UsageSection.tsx`, `docs/architecture/kern/PLAN_MODEL.md`, `tests/unit/data/plan-model.test.mjs`, `tests/e2e/plan-model.e2e.mjs`. **Abhängigkeiten:** ARCH-01, STORE-01, STORE-02. **Alte IDs:** STORE-03.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### DOC-01

**Widerspruchsfreie aktuelle Statusdokumentation** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex · Zuständiger Thread: „Offene Punkte prüfen und Roadmap neu ordnen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] DOC-01-S01: Widersprüche zu Litematic, Rohstoffen, Bauabschnitten und Hosting identifiziert.
- [x] DOC-01-S02: Aktuellen Status ersetzen; historische Aussagen ausdrücklich archivieren.
- [x] DOC-01-S03: Veralteten Webstart-, Browser- und Branchstatus durch aktuelle Codex-Einrichtung und tatsächliche Prüfungen ersetzen.

**Abnahme:** Keine implementierte Kernfunktion erscheint gleichzeitig als unbegonnen.

**Nächste Aktion:** Aktuelle Prüf-/Main-/Live-Nachweise im nächsten sachlichen Quellblock nachführen; keine selbstreferenzielle Deploymentfolge.

**Prüfstand:** Aktuelle Dokumentation mit lokaler Einrichtung, Browsernachweisen und Werkzeuggrenzen abgeglichen; alte historische Einträge erhalten. Generierte Ansichten werden geprüft; aktuelle Main-/Pages-SHAs nach Integration im Abschluss.

**Nachweise:** [docs/STATUS.md](STATUS.md) — Aktuelle Übersicht ersetzt widersprüchliche Aussagen.; [docs/TESTING.md](TESTING.md) — Dokumentationslinks und Roadmapansichten geprüft.

**Dateiumfang:** `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/archiv/STATUS_HISTORY.md`, `docs/archiv/ROADMAP_LEGACY.md`. **Abhängigkeiten:** PLAN-01. **Alte IDs:** —.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### STORE-02

**Revisionsschutz bei konkurrierenden Assetänderungen** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] STORE-02-S01: Vorhandene S4-Reservierung und Remoteänderungen vor Bearbeitung prüfen.
- [x] STORE-02-S02: Asset-Revisionsvertrag, UI-Konfliktbehandlung und Migration implementieren.
- [x] STORE-02-S03: Zwei konkurrierende Metadatenänderungen und atomare Batches prüfen.

**Abnahme:** Kein stilles Überschreiben; bestehende Datensätze kontrolliert migrieren.

**Nächste Aktion:** CAS-/Migrationsregressionen bei Speicheränderungen fortführen; Safari/iPhone gesondert in QA-02.

**Prüfstand:** Node-CAS-/Restoretests und drei echte Chromiumfälle bestanden: v1→v2 samt Originalerhalt/Altverbindung/Zwei-Verbindungs-CAS, fehlerhaftes Upgrade mit Rollback und UI-Zwei-Tab-Entwurfserhalt nach Broadcast. Alle enthalten in der vollständigen 54/54-E2E-Abnahme.

**Nachweise:** [tests/unit/core/asset-concurrency.test.mjs](../tests/unit/core/asset-concurrency.test.mjs) — CAS, atomare Batches, Aliasschutz, Duplikate und ungültige Datensätze; Kernlauf separat in TESTING.; [tests/unit/core/asset-restore.test.mjs](../tests/unit/core/asset-restore.test.mjs) — Alte Sicherung, lokale Revisionsbasis und veralteter Restoreplan.; [tests/unit/core/asset-seeding.test.mjs](../tests/unit/core/asset-seeding.test.mjs) — Zwei konkurrierende Katalogeinrichtungen mit begrenztem aktuellen Retry.; [docs/architecture/kern/ASSET_CONCURRENCY.md](architecture/kern/ASSET_CONCURRENCY.md) — Migration, Formularbasis und offene Browserabnahme.; [tests/e2e/asset-editing.e2e.mjs](../tests/e2e/asset-editing.e2e.mjs) — Tatsächlich unter Windows/Chromium bestanden: alter Entwurf bleibt nach abgewiesenem Speichern erhalten; ausdrückliches Neuladen übernimmt gespeicherte Tags.; [tests/e2e/asset-concurrency.e2e.mjs](../tests/e2e/asset-concurrency.e2e.mjs) — Echte erfolgreiche und abgebrochene IndexedDB-Migration mit Originalbytes und atomarem CAS bestanden.

**Dateiumfang:** `apps/web/src/app/idbRepository.ts`, `packages/application/src/repository.ts`. **Abhängigkeiten:** ARCH-01. **Alte IDs:** S4.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### QA-01

**Aktuelle Browserregression für alle Hauptabläufe** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex · Zuständiger Thread: — · Aktualisiert: 2026-11-03T20:52:59.449Z

- [x] QA-01-S01: Chromium-Laufzeit bereitstellen bzw. Verfügbarkeit prüfen.
- [x] QA-01-S02: Komplette aktuelle Desktop-/schmale E2E-Suite ausführen und Fehler beheben.

**Abnahme:** Keine nur syntaktisch geprüften E2E als bestanden zählen.

**Nächste Aktion:** Suite nach relevanten Änderungen wiederholen; echte Geräte in QA-02 und große Worker-Browserlatenz in PERF-01 prüfen.

**Prüfstand:** Vollständiger unabhängiger lokaler Chromium-Wiederholungslauf 58/58 bestanden, null übersprungen (189,94 s). Erster Lauf 57/58 mit transientem 10-s-Timeout vor Restore; isoliert 3/3 Speicherfälle und anschließend vollständige Suite unverändert bestanden, keine Testabschwächung. Vier zusätzliche Themen-/Bauweltenfälle. Keine echte Safari-/iPhone-/GPU-/Spielabnahme.

**Nachweise:** [docs/TESTING.md](TESTING.md) — Abgegrenzter tatsächlicher Desktop-Smoke nach PERF-Deployment, ausdrücklich kein vollständiger Browserregressionsnachweis.; [docs/project/CODEX_SETUP.md](project/CODEX_SETUP.md) — Exakte Entwicklungsabhängigkeit, getrennte Chromiuminstallation und ausgeführtes Windows-Setup.

**Dateiumfang:** `tests/e2e/`. **Abhängigkeiten:** ARCH-01. **Alte IDs:** —.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### QA-02

**Echte GPU-, Safari- und iPhone-Abnahme** · 🚧 In Arbeit · Priorität P1 · Verantwortlich: Claude (Thread „Liegengebliebene Datenpakete abarbeiten“) · Zuständiger Thread: „Liegengebliebene Datenpakete abarbeiten“ · Aktualisiert: 2026-11-03T22:26:51.801Z

- [x] QA-02-S01: Geräte-/Browsermatrix und reproduzierbare Aufgaben definieren.
- [ ] QA-02-S02: Dateiimport, IndexedDB, Touch, Themes und Layer auf echten Geräten prüfen.

**Abnahme:** Viewportsimulation wird nicht als echte Geräteprüfung ausgegeben.

**Nächste Aktion:** Protokolle der Tester in docs/testing/GERAETEMATRIX.md eintragen und Befunde beheben.

**Nur Philipp:** Auf echten Geräten und Browsern: Bereich „Geräte und Browser“ (GERAET-01 … 06) auf #/testphase auf deinem PC (Chrome/Edge und Firefox) und deinem Handy durchgehen und das Protokoll schicken (QA-02-S02).

**Prüfstand:** Matrix und Aufgaben stehen; echte Geräteprüfung offen.

**Nachweise:** [docs/testing/GERAETEMATRIX.md](testing/GERAETEMATRIX.md) — Sechs Geräte/Browser, sechs Aufgaben, Regel: Simulation zählt nie als bestanden.; [apps/web/src/testing/testplan.ts](../apps/web/src/testing/testplan.ts) — Bereich GERAET-01 … GERAET-06 im Testplan und auf #/testphase.

**Dateiumfang:** `docs/TESTING.md`, `docs/testing/GERAETEMATRIX.md`, `apps/web/src/testing/testplan.ts`. **Abhängigkeiten:** QA-01, VIEW-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### QA-03

**Wacklige Browsertests stabilisieren (Schnellsuche, Systemcheck, Editor- und Snap-Ziehtests)** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Claude-Thread „Wacklige Browsertests stabilisieren“ · Zuständiger Thread: — · Aktualisiert: 2026-11-03T20:52:59.449Z

- [x] QA-03-S01: Ursachen der gelegentlichen E2E-Ausfälle auf main finden (keine Tests abschalten oder abschwächen).
- [x] QA-03-S02: Schnellsuche: Strg+K und Suchknopf während des Ladens der lokalen Daten nicht mehr verlieren.
- [x] QA-03-S03: Systemcheck-Test wartet auf das nachgeladene Build-Manifest statt den Ladehinweis zu lesen.
- [x] QA-03-S04: Editor-Ziehtest misst das Ebenenraster erst nach dem Einschwingen; Pinselstrich verliert bei schnellen Zügen keine Zellen mehr.
- [x] QA-03-S05: 3D-Ansicht im Projekteditor bleibt während der Neuberechnung stehen statt neu aufgebaut zu werden (Snap-Ziehtest).
- [x] QA-03-S07: Suchknopf der Kopfzeile behält seinen zugänglichen Namen, wenn die Beschriftung bei schmaleren Fenstern ausgeblendet wird.
- [x] QA-03-S06: Gesamte E2E-Suite mehrfach hintereinander grün.

**Abnahme:** Kein Test übersprungen, abgeschwächt oder mit längeren Wartezeiten kaschiert; Ursache jeweils in App oder Testsynchronisation behoben. Gesamte Suite mindestens dreimal hintereinander grün.

**Nächste Aktion:** Bei neuen Ausfällen zuerst nach Lesen vor dem Laden (Manifest, IndexedDB, ResizeObserver, Worker-Neuberechnung) suchen.

**Prüfstand:** Gesamte Chromium-E2E-Suite nach Rebase auf fd22da6 dreimal hintereinander 84/84 bestanden, null übersprungen; vorher 75/76 bzw. 83/84. Kein Test abgeschwächt. Nur Chromium im Linux-Container.

**Nachweise:** [docs/TESTING.md](TESTING.md) — Ursachen, Behebung und Wiederholungsläufe.

**Dateiumfang:** `tests/e2e/shell.e2e.mjs`, `tests/e2e/stability.e2e.mjs`, `tests/e2e/editor.e2e.mjs`, `tests/e2e/snap.e2e.mjs`, `apps/web/src/app/CommandPalette.tsx`, `apps/web/src/editor/BlockEditor.tsx`, `apps/web/src/views/project/EditorTab.tsx`, `apps/web/src/viewer/sceneController.ts`, `apps/web/src/app/Shell.tsx`. **Abhängigkeiten:** QA-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### UI-01

**Neue Themen, Bauwelten und Materiallabor abnehmen** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Codex Teilagent ui_acceptance · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] UI-01-S01: Fünf Themen, Hell/Dunkel/System, elf Bauwelten und Materiallabor eingebunden.
- [x] UI-01-S02: Node-Regressionsprüfungen für Filter, Kontrast und Mengen dokumentiert.
- [x] UI-01-S03: Aktuelle visuelle Browserprüfung in hell/dunkel und 1400/390 px.

**Abnahme:** Filterlinks reproduzieren Treffer; keine unlesbaren Panels oder Mengenänderungen.

**Nächste Aktion:** Oberflächenregression bei Themen-/Layoutänderungen weiterführen; echte Geräte separat in QA-02.

**Prüfstand:** Vier neue reale Chromiumfälle bestanden (25,14 s); fünf Themen × hell/dunkel × 1400/390 px für Labor/Bauwelten, 48 Aufnahmen visuell geprüft. Materialmengen, Herkunftsfilter, reale Vorschauen und reproduzierbare Links/Reloadtreffer unverändert. Kein echter Safari-/iPhone-/GPU-Nachweis.

**Nachweise:** [tests/unit/web/theme-tokens.test.mjs](../tests/unit/web/theme-tokens.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/catalog/build-themes.test.mjs](../tests/unit/catalog/build-themes.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/materials/material-lab.test.mjs](../tests/unit/materials/material-lab.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/e2e/ui-acceptance.e2e.mjs](../tests/e2e/ui-acceptance.e2e.mjs) — Vier echte Chromiumfälle, Themenmatrix, Mengenerhalt und drei neue kanonische Filterlinks.; [docs/architecture/planer/UI_ACCEPTANCE.md](architecture/planer/UI_ACCEPTANCE.md) — 48 visuell geprüfte Aufnahmen; Desktop und Touchsimulation von echten Geräten getrennt.

**Dateiumfang:** `apps/web/src/theme/`, `apps/web/src/materials/`, `apps/web/src/views/library/BuildThemesPage.tsx`. **Abhängigkeiten:** QA-01. **Alte IDs:** UI-01, MAT-02, WORLD-01.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### UI-02

**App-Hülle, Navigation und Handyoberfläche überarbeiten** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Claude Thread „Oberfläche gründlich überarbeiten“ · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] UI-02-S01: App-Hülle mit Navigationsliste, Schnellsuche (Strg+K), Seitentiteln und unterer Leiste am Handy.
- [x] UI-02-S02: Projektkopf mit Pfad, Speicherstatus und scrollbarer Bereichsleiste; Editor am Handy mit 3D zuerst.
- [x] UI-02-S03: Einheitliche Lesegrößen (keine Schrift unter 11 px), Touch-Ziele und Fußzeile; alle Themen hell/dunkel.
- [x] UI-02-S04: Browserprüfung 1400/390 px für Hülle, Suche und Projektkopf; vollständige E2E-Regression.

**Abnahme:** Navigation, Schnellsuche und Projektbereiche sind auf 1400 und 390 px ohne waagerechtes Scrollen bedienbar; bestehende E2E-Abläufe bleiben grün; keine Funktion entfällt.

**Nächste Aktion:** Echte Geräteprüfung (Safari/iPhone, Touch) in QA-02; weitere Hauptbereiche (z. B. Karte MAP-01) als Eintrag in nav.ts anhängen.

**Prüfstand:** npm run check: 391 Node-Tests bestanden, 1 übersprungen; volle Browserregression 63/63 (Chromium, 1400/390 px, Touchsimulation). Keine echte Safari-/iPhone-/GPU-Prüfung (QA-02).

**Nachweise:** [tests/e2e/shell.e2e.mjs](../tests/e2e/shell.e2e.mjs) — Vier echte Chromiumfälle: Hauptnavigation, Seitentitel, Schnellsuche mit Tastatur, Projektkopf/Bereichssprung (hell), Handy 390 px dunkel/hell ohne Überbreite, aktiver Bereich sichtbar, 3D zuerst.; [docs/architecture/planer/UI.md](architecture/planer/UI.md) — Abschnitt UI-02: Hülle, Navigationsliste, Schnellsuche, Projektkopf, Handyleiste, Lesbarkeit, Selektoren.

**Dateiumfang:** `apps/web/src/app/CommandPalette.tsx`, `apps/web/src/app/Shell.tsx`, `apps/web/src/app/icons.tsx`, `apps/web/src/app/nav.ts`, `apps/web/src/main.tsx`, `apps/web/src/styles/shell.css`, `apps/web/src/styles/style.css`, `apps/web/src/views/project/ProjectView.tsx`, `docs/COMMUNICATION.md`, `docs/TESTING.md`, `docs/architecture/planer/UI.md`, `tests/e2e/shell.e2e.mjs`. **Abhängigkeiten:** UI-01, QA-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### UX-01

**Bedienung des Planers vereinfachen (Struktur und Abläufe)** · 🚧 In Arbeit · Priorität P1 · Verantwortlich: Claude Thread „Bedienung des Planers vereinfachen“ · Zuständiger Thread: **verwaist** · Aktualisiert: 2026-11-06T15:30:12.832Z

- [x] UX-01-S01: Hauptnavigation auf vier Bereiche (Projekte, Bibliothek, Weltkarte, Spiel); Datei-Wege Betrachter und Weltimport nur noch in Fußzeile und Schnellsuche.
- [x] UX-01-S02: Zwölf Projektreiter in vier Schritten (Gestalten, Bauen, Organisieren, Teilen) mit einem Kurzsatz je Reiter; Ids, Beschriftungen und Routen unverändert.
- [x] UX-01-S03: Bibliothek: zehn Unterseiten in drei Gruppen (Finden, Nach Maß, Größer planen); Datei-Import nicht mehr Hauptknopf.
- [x] UX-01-S04: Eingeklappte Bereiche (More): Speicher & Sicherung, Datei-Notfallwege beim neuen Projekt, ausführliche Mod-Anleitung, Spielverbindung auf der Weltkarte, Mod/Plugin-Hintergrund im Team.
- [x] UX-01-S05: Mod-Seite beginnt mit „So geht's in drei Schritten“; Team gründen in drei Schritten.
- [x] UX-01-S06: Werkstatt, Baustelle und Produktion: Hauptaktion zuerst; eingeklappt Kreativ-Werkzeuge (Schablonen, Natur, Farben, Bild), Abschnittsstände und Freiraum an Anschlüssen (öffnen sich selbst bei Ständen bzw. verbautem Freiraum), Zeitbudget sowie Öfen/Lager/AFK-Platz/Produktionsblatt.

**Abnahme:** Ein neuer Nutzer findet von der Startseite in höchstens zwei Klicks zu jedem Hauptablauf; jede Seite zeigt eine Hauptaktion zuerst; Datei-Wege sind als Notfall eingeklappt; keine Funktion entfällt; bestehende Browsertests bleiben grün.

**Nächste Aktion:** Philipps Abnahme START-10..13 im Browser und auf dem iPad. Optik übernimmt „Planer-Oberfläche schön neu gestalten“.

**Nur Philipp:** Im Planer abnehmen: Testphase START-10..13: vier Hauptbereiche, Projektschritte mit Kurzsatz, eingeklappte Experten- und Datei-Wege im Browser prüfen. Auf echten Geräten und Browsern: START-12 auf dem iPad: Projektreiter waagerecht wischen, eingeklappte Bereiche per Finger öffnen.

**Prüfstand:** npm run check grün; simple-ui.e2e 2/2; volle Browserregression grün bis auf offline.e2e (schlägt auch auf main fehl). Abnahme START-10..12 durch Philipp offen.

**Nachweise:** [tests/e2e/simple-ui.e2e.mjs](../tests/e2e/simple-ui.e2e.mjs) — Vier Hauptbereiche, Datei-Wege in Fußzeile, Projektschritte mit Kurzsatz, Bibliotheksgruppen, eingeklappte Sicherung (1400 und 390 px).

**Dateiumfang:** `apps/web/src/app/nav.ts`, `apps/web/src/app/Shell.tsx`, `apps/web/src/app/CommandPalette.tsx`, `apps/web/src/app/More.tsx`, `apps/web/src/app/more.css`, `apps/web/src/styles/navGroups.css`, `apps/web/src/styles/map.css`, `apps/web/src/views/project/tabNames.ts`, `apps/web/src/views/project/tabs.ts`, `apps/web/src/views/project/ProjectView.tsx`, `apps/web/src/views/project/team/TeamTab.tsx`, `apps/web/src/views/ProjectsView.tsx`, `apps/web/src/views/BackupPanel.tsx`, `apps/web/src/views/LibraryView.tsx`, `apps/web/src/views/mod/ModView.tsx`, `apps/web/src/views/map/LiveGamePanel.tsx`, `apps/web/src/testing/testplan.ts`, `docs/architecture/planer/UI.md`, `tests/e2e/shell.e2e.mjs`, `tests/e2e/simple-ui.e2e.mjs`, `apps/web/src/styles/shell.css`, `docs/testing/TESTPLAN.md`, `tests/e2e/collections.e2e.mjs`, `tests/e2e/persistence.e2e.mjs`, `docs/TESTING.md`, `tests/e2e/backup-reminder.e2e.mjs`, `tests/e2e/start.mjs`, `tests/e2e/stability.e2e.mjs`, `docs/ROADMAP.md`, `apps/web/src/views/project/SiteTab.tsx`, `apps/web/src/views/project/ProductionTab.tsx`, `apps/web/src/editor/BlockEditor.tsx`, `apps/web/src/editor/editor.css`, `tests/e2e/site.e2e.mjs`, `tests/e2e/production.e2e.mjs`, `tests/e2e/workshop-creative.e2e.mjs`, `tests/e2e/workshop-tools.e2e.mjs`. **Abhängigkeiten:** UI-02, GUIDE-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### STAB-01

**Absturzschutz, Datencheck und Fehlerberichte abnehmen** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: „Offene Punkte prüfen und Roadmap neu ordnen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] STAB-01-S01: Datencheck, Auslieferungsprüfung und Sitzungserrorlog mit Tests vorhanden.
- [x] STAB-01-S02: Echten Renderingfehler auslösen und Wiederaufnahme im Browser prüfen.

**Abnahme:** Fehlerhafte Datensätze verursachen keinen stillen Reparatureingriff.

**Nächste Aktion:** Erledigt.

**Prüfstand:** Renderingfehler im Browser ausgelöst; React-19-Lücke in der Fehlergrenze gefunden und behoben.

**Nachweise:** [tests/unit/data/integrity.test.mjs](../tests/unit/data/integrity.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/web/stability.test.mjs](../tests/unit/web/stability.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/e2e/render-crash.e2e.mjs](../tests/e2e/render-crash.e2e.mjs) — S02: nicht ladbarer Seitenbaustein im Browser; ein Neuladen, dann Fehlergrenze statt leerer App, Projekte bleiben, Wiederaufnahme nach „Seite neu laden“. Ohne die ErrorBoundary-Korrektur rot.

**Dateiumfang:** `apps/web/src/app/ErrorBoundary.tsx`, `packages/domain/src/data/integrity.ts`, `tests/e2e/render-crash.e2e.mjs`. **Abhängigkeiten:** QA-01. **Alte IDs:** S1, S3.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### OPS-02

**Deployment-Rückkehr und Wiederherstellungsprobe** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Codex Teilagent restore_probe · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] OPS-02-S01: Rückkehr auf bekannte Artefakte zunächst isoliert durchspielen.
- [x] OPS-02-S02: Source-Erhalt und neue Manifestzuordnung prüfen; Wiederanlauf dokumentieren.

**Abnahme:** Kein Force-Push; kein Live-Rollback ohne Anlass.

**Nächste Aktion:** Bei tatsächlichem Vorfall bekannten Build neu bestätigen und Recovery regulär ohne Force vorbereiten; Livehashes danach gesondert prüfen.

**Prüfstand:** 4/4 Recoveryregressionen sowie echte dist-web-Probe bestanden: 13 Artefakte, 333 erhaltene Sourcepfade einschließlich synthetischer neuer Dateien und ausführbarem Modus. Hashes, Elternkette, unverändertes Ursprungsdeployment und entfernten Nachfolgechunk geprüft. Nur Scratchrepository; keine Live-/CDN-Restoreabnahme.

**Nachweise:** [tests/unit/tooling/pages-restore.test.mjs](../tests/unit/tooling/pages-restore.test.mjs) — Vier Regressionen zu Integrität, Quellkollision, Provenienz und echter isolierter Git-Wiederherstellung.; [docs/operations/PAGES_RESTORE_PROBE.md](operations/PAGES_RESTORE_PROBE.md) — Probe, ehrliche Recoverymanifestzuordnung und Grenzen ohne Live-Rollback.

**Dateiumfang:** `scripts/pages/prepare_main_pages.mjs`, `docs/operations/`, `scripts/pages/probe_pages_restore.mjs`, `tests/unit/tooling/pages-restore.test.mjs`. **Abhängigkeiten:** OPS-01, PLAN-01. **Alte IDs:** HP-04.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### OPS-03

**Alte vollständig integrierte Branches bereinigen** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand / Codex-Prüfung · Zuständiger Thread: — · Aktualisiert: 2026-11-03T20:52:59.449Z

- [x] OPS-03-S01: Remote-Branches und vollständige Integration erneut nachweisen.
- [x] OPS-03-S02: Bei verfügbarer Löschfunktion integrierte Branches entfernen.

**Abnahme:** Keine unintegrierte Arbeit und keine benötigte Pages-Quelle löschen.

**Nächste Aktion:** Bei künftigem temporärem Branch erneut vollständige Integration prüfen; aktuell keine Bereinigung nötig.

**Prüfstand:** Authentifizierte GitHub-Refabfrage am 01.11.2026 liefert ausschließlich refs/heads/main. Keine Branchlöschung durch diesen Auftrag; historischer Fähigkeitsblocker überholt.

**Nachweise:** [docs/project/CODEX_SETUP.md](project/CODEX_SETUP.md) — Tatsächlicher Clone, GitHub-Berechtigungen, Pagesquelle und Werkzeuggrenzen geprüft.

**Dateiumfang:** `docs/COMMUNICATION.md`. **Abhängigkeiten:** OPS-01. **Alte IDs:** —.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### LICENSE-01

**Projektlizenz und öffentliche Inhalte klären** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: „Offene Punkte prüfen und Roadmap neu ordnen“ · Aktualisiert: 2026-11-03T21:19:45.021Z

- [x] LICENSE-01-S01: Eigene und fremde Bestandteile inventarisieren.
- [x] LICENSE-01-S02: Lizenzentscheidung dokumentieren; Herkunft und Nutzungsrechte für öffentliche Assets prüfen.

**Abnahme:** Keine ungeklärten fremden Texturen oder Bauwerke veröffentlichen.

**Nächste Aktion:** Erledigt. Neue fremde Inhalte nach den Regeln in LICENSING.md prüfen.

**Prüfstand:** Keine fremden Texturen oder Bauwerke im Repository; Texturen nur aus Nutzerquellen, Uploads und minemev-Bauten nicht ausgeliefert.

**Nachweise:** [LICENSE](../LICENSE) — MIT für das ganze Repository, wie bereits für die Mod auf Modrinth.; [docs/LICENSING.md](LICENSING.md) — Bestandsaufnahme eigener und fremder Bestandteile; Regeln für Texturen, Bauwerke, Beiträge, Abhängigkeiten und Kartendaten.

**Dateiumfang:** `README.md`, `THIRD_PARTY_NOTICES.txt`, `LICENSE`, `docs/LICENSING.md`, `package.json`, `package-lock.json`. **Abhängigkeiten:** keine. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROFILE-01

**Ein verbindliches Java-Versionsprofil** · 🧩 Implementiert · Abnahme offen · Priorität P0 · Verantwortlich: Claude (Thread „Liegengebliebene Datenpakete abarbeiten“) · Zuständiger Thread: „Liegengebliebene Datenpakete abarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PROFILE-01-S01: Registryreport und Zielversion mit Herkunft/Hash dokumentieren.
- [x] PROFILE-01-S02: Block-/Property-/Item-/Rezeptdaten an das Profil binden.
- [x] PROFILE-01-S03: Profilprüfung (Inhalt statt DataVersion) im Gebäudeblatt anzeigen.

**Abnahme:** DataVersion allein behauptet keine Kompatibilität.

**Nächste Aktion:** Abnahme: Profilprüfung im Gebäudeblatt an einer echten älteren Schem-/Litematic-Datei ansehen (Testphase).

**Prüfstand:** Offizielle server.jar 26.3 (SHA-1 geprüft) mit JDK 25 ausgewertet; blocks.json-Hash identisch mit BLOCK-01. tests/profile.test.mjs und die Block-/Zustandstests grün. Browserdarstellung der Profilprüfung nur im Build geprüft.

**Nachweise:** [tests/unit/formats/profile.test.mjs](../tests/unit/formats/profile.test.mjs) — Hashes/gleiche Jar wie BLOCK-01, Register = Serverbericht, Items, Brennstoffe, DataVersion-Regel.; [docs/architecture/formate/VERSION_PROFILE.md](architecture/formate/VERSION_PROFILE.md) — Herkunft, Hashes, Neuerzeugung, Regeln.

**Dateiumfang:** `packages/voxel/src/profile.ts`, `packages/voxel/src/profileData.ts`, `packages/domain/src/materials/profileRecipes.ts`, `packages/voxel/src/blockRegistry.ts`, `scripts/gen/gen_profile.mjs`. **Abhängigkeiten:** ARCH-01. **Alte IDs:** P1-02a.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### NBT-01

**Semantische BlockEntity-Transformationen** · 🧩 Implementiert · Abnahme offen · Priorität P0 · Verantwortlich: Claude (Thread „Liegengebliebene Datenpakete abarbeiten“) · Zuständiger Thread: „Liegengebliebene Datenpakete abarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] NBT-01-S01: Zu unterstützende NBT-Familien und Positions-/Ausrichtungsregeln festlegen.
- [x] NBT-01-S02: Adapter mit konkreten Richtungen und unbekannten Restdaten prüfen.
- [x] NBT-01-S03: Strukturblock-Adapter: SAVE-Bereich und LOAD-Anker/Drehung drehen mit, Spiegeln bleibt ungelöst.

**Abnahme:** Ungeklärte Transformation sperrt verlässlichen Export; keine stillen NBT-Verluste.

**Nächste Aktion:** Abnahme im Spiel: gedrehtes Bauteil mit Truhen, Schildern und einem Strukturblock exportieren und in 26.3 laden (Testphase).

**Prüfstand:** Node-Tests mit konkreten Richtungen; Spielabnahme offen.

**Nachweise:** [tests/unit/formats/nbt-transforms.test.mjs](../tests/unit/formats/nbt-transforms.test.mjs) — 49 Profiltypen mit Familie, Drehungen/Spiegelungen, Weltpositionen, Befehle, Strukturblock, Mod-Typ, Positionsfelder.; [docs/architecture/formate/NBT_TRANSFORMS.md](architecture/formate/NBT_TRANSFORMS.md) — Familien und Regeln.; [tests/unit/formats/nbt-transforms.test.mjs](../tests/unit/formats/nbt-transforms.test.mjs) — NBT-01-S03: handgerechnete SAVE-Bereiche, LOAD-Anker und Drehungsfolge, vier Drehungen = Ausgangszustand.

**Dateiumfang:** `packages/voxel/src/nbtTransforms.ts`, `packages/voxel/src/transforms.ts`. **Abhängigkeiten:** PROFILE-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### FORMAT-01

**Schem v3 an echten Referenzwerkzeugen abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P0 · Verantwortlich: Claude (Thread „Liegengebliebene Datenpakete abarbeiten“) · Zuständiger Thread: „Liegengebliebene Datenpakete abarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] FORMAT-01-S01: Import/Export, Worker, Limits, unabhängige Binärfixture und Python-Verifier vorhanden.
- [ ] FORMAT-01-S02: Echte WorldEdit-Dateien importieren, exportieren und vergleichen: Prüfwerkzeug `npm run format:check-schem` (Zellen, Zustände, Offset, WEOffset, BlockEntities, Entities, unabhängiger Verifier) steht; offen ist der Lauf mit einer echten, in WorldEdit gespeicherten Datei.

**Abnahme:** Zellen, Zustände, Ursprung und BlockEntities semantisch erhalten.

**Nächste Aktion:** Hochgeladene WorldEdit-Datei mit npm run format:check-schem prüfen; Befunde beheben.

**Blocker:** Echte WorldEdit-Datei fehlt: WorldEdit/Paper dürfen in der Cloud-Umgebung nicht als Fremdcode laufen.

**Nur Philipp:** Dateien oder Welt liefern: Auf deinem Paper-Server mit WorldEdit ein kleines Gebäude mit Kiste/Schild auswählen, //copy, //schem save bauplaner-test und die Datei aus plugins/WorldEdit/schematics hier hochladen (FORMAT-01-S02).

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** [tests/unit/formats/schem.test.mjs](../tests/unit/formats/schem.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/formats/schem-export.test.mjs](../tests/unit/formats/schem-export.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/formats/schem-roundtrip.test.mjs](../tests/unit/formats/schem-roundtrip.test.mjs) — Datei im WorldEdit-Aufbau (absoluter Offset, WEOffset, ungeordnete Properties, BlockEntity mit Data, Entity): Import → Export → Import semantisch gleich, WEOffset-Verschiebung als Hinweis gemeldet; kaputte Datei = Lesefehler.; [docs/architecture/formate/SCHEM_EXPORT.md](architecture/formate/SCHEM_EXPORT.md) — Abschnitt Rundlauf mit echten WorldEdit-Dateien.

**Dateiumfang:** `packages/formats/src/schem.ts`, `packages/formats/src/schemWrite.ts`, `scripts/checks/check_schem_roundtrip.mjs`. **Abhängigkeiten:** PROFILE-01, NBT-01. **Alte IDs:** B2, P1-01, P3-01.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### FORMAT-02

**Litematic an echten Referenzdateien abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P0 · Verantwortlich: Claude (Thread „Litematic-Dateien wie Vorlagen aufschlüsseln“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] FORMAT-02-S01: Mehrregionen, negative Größen, Regionswahl und Writer mit unabhängigen Fixtures vorhanden.
- [ ] FORMAT-02-S02: Echte Litematica-Dateien lesen (erledigt 02.11.: 2 Litematica- und 3 Konverterdateien) und Export im Spiel prüfen (offen).
- [x] FORMAT-02-S03: Grenzen für Entities/Ticks und ältere Formate im Bericht bestätigen.
- [x] FORMAT-02-S04: Unkomprimierte/zlib-Dateien, große Modelle bis 1 Mio. Blöcke, Aufschlüsselung (Metadata, Regionen, TileEntities/Entities nach Art) und alte IDs chain/grass in der Ansicht.

**Abnahme:** Format- und DataVersion-Grenzen werden explizit gemeldet. Echte Dateien aus dem Netz (unkomprimiert, ferne Ecke mit negativer Größe, große Modelle) lesen sich mit stimmigen Blockzahlen; Export hat dieselbe Gliederung wie Litematica.

**Nächste Aktion:** Export im Spiel mit Litematica laden (Philipps PC, Fabric 26.3) – FORMAT-02-S02.

**Nur Philipp:** Im Spiel an deinem PC: Litematic-Export im Spiel mit Litematica laden (S02).

**Prüfstand:** Leser an fünf echten Dateien geprüft (lokal, nicht im Repo); Export im Spiel weiter offen.

**Nachweise:** [tests/unit/formats/litematic.test.mjs](../tests/unit/formats/litematic.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/formats/litematic.test.mjs](../tests/unit/formats/litematic.test.mjs) — realworld-Fixture, Kompression, große Modelle, Metadata-Abgleich; [tests/e2e/litematic.e2e.mjs](../tests/e2e/litematic.e2e.mjs) — unkomprimierte Datei mit Aufschlüsselung in der Bibliothek; [docs/architecture/formate/LITEMATIC.md](architecture/formate/LITEMATIC.md) — Tabelle der fünf echten Dateien vorher/nachher

**Dateiumfang:** `apps/web/src/app/importLimits.ts`, `apps/web/src/import.worker.ts`, `apps/web/src/views/library/LitematicRegions.tsx`, `fixtures/litematic/realworld.nbt.hex`, `packages/formats/src/litematic.ts`, `packages/formats/src/litematicWrite.ts`, `packages/formats/src/structure.ts`. **Abhängigkeiten:** PROFILE-01, NBT-01. **Alte IDs:** B10, P5-01.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### MAT-02

**Versionierte Item-/Rezeptauflösung vervollständigen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Liegengebliebene Datenpakete abarbeiten“) · Zuständiger Thread: „Liegengebliebene Datenpakete abarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MAT-02-S01: Vorhandene Regeln mit Profilreport abgleichen.
- [x] MAT-02-S02: Mehrblockobjekte, Rezeptalternativen, Rest-/Brennstoffbilanzen profilgenau prüfen.
- [x] MAT-02-S03: Sorte je Rezept-Tag und Brennstoff wählbar (im Projekt gespeichert), Brennstoff auf Wunsch in den Rohstoffen mit eigenem Bedarf.

**Abnahme:** Blockzahl, Bauitems, Rohstoffe und Lagerbestand bleiben getrennt.

**Nächste Aktion:** Abnahme in der Testphase: Rohstoffliste eines großen Bauwerks mit gewählter Holzart und Brennstoff mit dem Spiel vergleichen.

**Prüfstand:** Node-Tests gegen 1696 Profilrezepte; Browsertest Rohstoffe/Alternativen.

**Nachweise:** [tests/unit/materials/recipe-profile.test.mjs](../tests/unit/materials/recipe-profile.test.mjs) — Jedes Stationsrezept = Profilrezept; Funde iron_chain, Quarzziegel 4, Holzkohle; Profil-Lückenfüller; Tür 3 je Vorgang mit Rest; Brennstoffbilanz.; [docs/architecture/planer/MATERIALS.md](architecture/planer/MATERIALS.md) — Abschnitt MAT-02.; [tests/unit/materials/recipe-prefs.test.mjs](../tests/unit/materials/recipe-prefs.test.mjs) — Gewählte Plankensorte, Brennstoffwahl, Holzkohle mit festem Punkt (92 für 640 Vorgänge), Lavaeimer nicht aufgenommen, Prüfung im Baustellenplan.

**Dateiumfang:** `packages/domain/src/materials/recipes.ts`, `packages/domain/src/materials/recipeProfile.ts`, `packages/domain/src/materials/profileRecipes.ts`, `apps/web/src/views/project/RawMaterialsPanel.tsx`, `apps/web/src/views/project/MaterialsTab.tsx`, `packages/domain/src/building/site.ts`. **Abhängigkeiten:** PROFILE-01, MAT-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### MAT-03

**Vorhandene Glas-/Beton-/Terrakottavarianten abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: „Module und Systeme komplex ausarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MAT-03-S01: 50 gezielte Materialsätze und Property-/BlockEntity-Sperren vorhanden.
- [x] MAT-03-S02: Alte 174 Gebäude-Payloadhashes unverändert nachgewiesen.
- [x] MAT-03-S03: Varianten im Zielprofil und in der Oberfläche prüfen.

**Abnahme:** Bestehende Versionen bleiben unverändert; Form und Properties kompatibel.

**Nächste Aktion:** Abnahme PROJ-14.

**Prüfstand:** Profil- und Browserprüfung bestanden (S03); Abnahme PROJ-14 im Spiel offen.

**Nachweise:** [tests/unit/core/variants.test.mjs](../tests/unit/core/variants.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/core/variants.test.mjs](../tests/unit/core/variants.test.mjs) — MAT-03-S03: jede Form jedes Materialsatzes im Profil 26.3, gleiche Eigenschaften je Art und Form.; [tests/e2e/mat-variants.e2e.mjs](../tests/e2e/mat-variants.e2e.mjs) — Leuchtturm: Beton, Glas, Terrakotta getrennt umgefärbt (208 Blöcke), gespeicherte Variante enthält genau die neuen Farben; 1400/390 px.

**Dateiumfang:** `packages/domain/src/materials/variants.ts`, `tests/unit/core/variants.test.mjs`, `tests/e2e/mat-variants.e2e.mjs`, `docs/TESTING.md`. **Abhängigkeiten:** PROFILE-01, QA-01. **Alte IDs:** MAT-03.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### MAT-04

**Kupfer mit Oxidation und Wachsstatus** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Liegengebliebene Datenpakete abarbeiten“) · Zuständiger Thread: „Liegengebliebene Datenpakete abarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MAT-04-S01: Zustandsmatrix und Formfamilien mit Profilbeleg definieren.
- [x] MAT-04-S02: Tausch mit Properties, Wachs und Oxidation testen.

**Abnahme:** Keine unvollständige Kupferzuordnung als kompatibel anbieten.

**Nächste Aktion:** Abnahme: Kupfervariante eines Bauwerks im Planer erzeugen und im Spiel ansehen (Testphase).

**Prüfstand:** Node-Tests; Browser nur über bestehende Variantenansicht.

**Nachweise:** [tests/unit/materials/copper.test.mjs](../tests/unit/materials/copper.test.mjs) — 15 vollständige Familien aus Weathering-Klassen, Tausch mit Properties und Truhen-NBT, Rezepte aller Stufen.

**Dateiumfang:** `packages/domain/src/materials/copper.ts`, `packages/domain/src/materials/variants.ts`, `packages/domain/src/materials/recipes.ts`. **Abhängigkeiten:** PROFILE-01, MAT-03. **Alte IDs:** MAT-04.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### DIFF-01

**Verschiebungserkennung und BlockEntity-Diff** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Liegengebliebene Datenpakete abarbeiten“) · Zuständiger Thread: „Liegengebliebene Datenpakete abarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] DIFF-01-S01: Basisvergleich A/B für Geometrie und Materialien vorhanden.
- [x] DIFF-01-S02: Verschiebung von echten Geometrieänderungen unterscheiden.
- [x] DIFF-01-S03: NBT-Änderungen und Folgen für Verbindungen/Schritte anzeigen.

**Abnahme:** Diff ist deterministisch und verändert keine Version.

**Nächste Aktion:** Abnahme in der Testphase: zwei Stände eines verschobenen Bauwerks vergleichen.

**Prüfstand:** Node-Tests; Browsertests Bauversionen, Update-Vorschau, Hintergrundvergleich.

**Nachweise:** [tests/unit/core/variants.test.mjs](../tests/unit/core/variants.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/core/diff-shift.test.mjs](../tests/unit/core/diff-shift.test.mjs) — Reine Verschiebung = 0 Änderungen, Verschiebung plus Anbau, Materialtausch und Anbau nicht als Verschiebung, Kisteninhalt als Inhaltsänderung, Zaunverbindung abgeleitet vs. gedrehte Treppe, deterministisch und ohne Veränderung der Eingaben.; [docs/architecture/planer/SCHEM_VIEWS.md](architecture/planer/SCHEM_VIEWS.md) — Abschnitte Verschiebung erkennen / Inhalte und Folgen.

**Dateiumfang:** `packages/voxel/src/diff.ts`, `apps/web/src/schem/DiffView.tsx`, `apps/web/src/jobs/diffJob.ts`, `packages/domain/src/versions/updates.ts`. **Abhängigkeiten:** CORE-02, NBT-01. **Alte IDs:** P5-03.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### PERF-01

**Große Berechnungen als abbrechbare Worker-Aufträge** · ✅ Im beschriebenen Umfang geprüft · Priorität P0 · Verantwortlich: Codex Teilagent perf_browser · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PERF-01-S01: Workerprotokoll mit Job-ID, Revisionsbezug und Abbruch definieren.
- [x] PERF-01-S02: Auflösung, Anleitung und Materialien auslagern; veraltete Ergebnisse verwerfen.
- [x] PERF-01-S03: Vorher/Nachher mit Modell, Hardware-/Browserangabe und UI-Reaktionszeit messen.

**Abnahme:** Keine Übernahme eines Ergebnisses für eine veraltete Revision.

**Nächste Aktion:** Messung bei Rechenkernänderungen wiederholen; Übertragungs-/Invalidierungsarbeit in PERF-02, vollständige React-/Gerätelatenz gesondert prüfen.

**Prüfstand:** 64.000 synthetische Zellen, echter isolierter Vite-Produktionsharness, Chromium 156 auf Ryzen 5 3600/32 GiB: je 1400/390 px Warmup plus drei Vergleichspaare. Vollständige Ergebnisdigests und handgezählte Invarianten gleich. DOM-Probe Median 693→30 / 790→35 ms, Gesamtdauer 703→1184 / 800→1420 ms; kein INP-/React-/GPU-/Echtgerätenachweis. Funktionale Workerregressionen weiterhin separat.

**Nachweise:** [tests/unit/core/project-computation.test.mjs](../tests/unit/core/project-computation.test.mjs) — Acht Kern-/Lifecycle-/Node-Workerfälle; Gesamtcheck in TESTING.; [tests/e2e/project-computation.e2e.mjs](../tests/e2e/project-computation.e2e.mjs) — Alle vier tatsächlichen Chromiumfälle am 01.11.2026 lokal bestanden; Funktionsnachweis ohne große Modelllatenzmessung.; [docs/architecture/kern/PROJECT_COMPUTATION.md](architecture/kern/PROJECT_COMPUTATION.md) — Protokoll, Snapshotbindung und abgegrenzte Node-Messung.; [docs/architecture/kern/PROJECT_BROWSER_BENCHMARK.md](architecture/kern/PROJECT_BROWSER_BENCHMARK.md) — Reproduzierbarer Browservergleich, Hardware, drei Paare je Viewport und ehrliche Interaktions-/Clonegrenzen.; [docs/architecture/kern/project-browser-benchmark.json](architecture/kern/project-browser-benchmark.json) — Vollständige Messläufe einschließlich Digests und unverändertem Rechenkernstand.

**Dateiumfang:** `apps/web/src/views/project/session.ts`, `packages/application/`, `apps/web/src/computation/`, `apps/web/src/app/useProjectComputation.ts`, `apps/web/src/views/project/`, `tests/unit/core/project-computation.test.mjs`, `scripts/bench/benchmark_project_browser.mjs`, `docs/architecture/kern/project-browser-benchmark.json`. **Abhängigkeiten:** ARCH-01. **Alte IDs:** —.

**Integration:** Main [7dffd92](https://github.com/Freadeax/Minecraft-Bauplaner/commit/7dffd922f46876c70700afc0429afb969e5478aa); Pages-Quelle [7dffd92](https://github.com/Freadeax/Minecraft-Bauplaner/commit/7dffd922f46876c70700afc0429afb969e5478aa).

### PERF-02

**Zellindizes, Chunkdaten und selektive Neuberechnung** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gesamtsystem auf Performance und Stabilität optimieren“) · Zuständiger Thread: „Gesamtsystem auf Performance und Stabilität optimieren“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PERF-02-S01: Kosten von owners/Strings/Übertragungen messen.
- [x] PERF-02-S02: Index-/Chunkstrategie nur mit identischem semantischem Ergebnis einführen.
- [x] PERF-02-S03: Chunk-/Übertragungsstrategie und selektive Neuberechnung mit vollständiger Invalidierungsprüfung ergänzen.

**Abnahme:** Unabhängige Mengen-/Geometrieregressionen; Importlimits bleiben wirksam.

**Nächste Aktion:** PERF-02-S03 zusammen mit PERF-05-S08 (Zellen erst bei Bedarf entpacken) im Performance-Thread umsetzen; beide ändern compose/Entpacken. Übergabe abgestimmt am 03.11.2026.

**Prüfstand:** Interner Indexteil mit 15 passenden bestehenden/neuen Regressionen und sechs hashgleichen Vergleichsausgaben geprüft. Kein Browser-, Chunk- oder selektiver Cache-Nachweis. Gemeinsame vollständige Prüfung mit 377 Node-Tests bestanden.

**Nachweise:** [tests/unit/core/composition-index.test.mjs](../tests/unit/core/composition-index.test.mjs) — Vier handberechnete Regressionsgruppen: Koordinaten, Konflikte, NBT, Grenzen.; [scripts/bench/benchmark_composition.mjs](../scripts/bench/benchmark_composition.mjs) — Vorher-/Nachher-Vergleich mit vollständigem Resolutionhash; Node-Szenario.; [docs/architecture/kern/COMPOSITION_PERFORMANCE.md](architecture/kern/COMPOSITION_PERFORMANCE.md) — Abschließender Median 5,2 % niedriger; Streuung und offene Chunk-/Browserabnahme ausdrücklich getrennt.

**Dateiumfang:** `packages/domain/src/core/compose.ts`, `packages/voxel/`. **Abhängigkeiten:** PERF-01. **Alte IDs:** —.

**Integration:** Main [7dffd92](https://github.com/Freadeax/Minecraft-Bauplaner/commit/7dffd922f46876c70700afc0429afb969e5478aa); Pages-Quelle [7dffd92](https://github.com/Freadeax/Minecraft-Bauplaner/commit/7dffd922f46876c70700afc0429afb969e5478aa).

### PERF-03

**Bundle, große Views und Vorschaucache** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: „Gesamtsystem auf Performance und Stabilität optimieren“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PERF-03-S01: Bundleanteile und UI-Verantwortungen messen.
- [x] PERF-03-S02: Views entlang Anwendungsfällen teilen und lazy laden.
- [x] PERF-03-S03: Versionierten Vorschaucache mit Quota-/Invalidierungsregeln ergänzen.

**Abnahme:** Gemessene Verbesserung statt bloßer Dateiaufteilung; keine verlorenen Filterzustände.

**Nächste Aktion:** Erledigt; weitere Bundle-Arbeit läuft unter PERF-05 (O-5, gezielte Unterpfade).

**Prüfstand:** Filterzustände im Browser geprüft (tests/e2e/library-filters.e2e.mjs): Suche, Liste und Treffer bleiben über Detailseite, Weltkarte, Neuladen und geteilten Link erhalten.

**Nachweise:** [docs/architecture/kern/PERFORMANCE_AUDIT.md](architecture/kern/PERFORMANCE_AUDIT.md) — S01: Startpaket gemessen, 1,33 MB auf 0,72 MB (PERF-05).; [apps/web/src/app/lazyPage.tsx](../apps/web/src/app/lazyPage.tsx) — S02: Seiten werden bei Bedarf geladen, Vorladen im Leerlauf.; [tests/e2e/thumb-store.e2e.mjs](../tests/e2e/thumb-store.e2e.mjs) — S03: Vorschaubilder je Render-Revision im Cache Storage, alte Stände gelöscht, Schreibfehler ohne Abbruch.; [tests/e2e/catalog-snapshot.e2e.mjs](../tests/e2e/catalog-snapshot.e2e.mjs) — Katalog-Cache beim Start.; [tests/e2e/library-filters.e2e.mjs](../tests/e2e/library-filters.e2e.mjs) — Akzeptanz „keine verlorenen Filterzustände“ beim Seitenwechsel bestätigt (GFX-02-Thread, 04.11.2026).

**Dateiumfang:** `apps/web/src/views/LibraryView.tsx`, `apps/web/src/views/project/`, `vite.config.mjs`, `apps/web/src/app/lazyPage.tsx`, `apps/web/src/thumbnail/thumbStore.ts`, `docs/architecture/kern/PERFORMANCE_AUDIT.md`. **Abhängigkeiten:** ARCH-01, QA-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PERF-04

**Schwere Berechnungen im Hintergrund-Worker mit Fortschritt und Abbrechen: großer Import und Speichern, 3D-Ansicht mit Licht, 3D-Export, Versionsvergleich, Update-Vorschau, Bibliotheksstart** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Große Modelle flüssig berechnen“ · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-06T09:11:06.629Z

- [x] PERF-04-S01: Gemeinsame Auftragsschicht: ein Worker je Auftrag, Fortschritt, Abbrechen per terminate, Zeitlimit, Rückfall ohne Worker; Zellen als übertragbare Spalten.
- [x] PERF-04-S02: Litematic-Import und Speichern großer Versionen (Prüfsumme, ID, Packen, Kennwerte) im Worker; versiegelte Payloads ohne erneute Kopie.
- [x] PERF-04-S03: 3D-Ansicht und Standbilder mit Licht ab 120 000 Zellen im Worker (Renderer-Schnappschuss, byte-gleiches Netz); 3D-Export im Worker mit Schrittanzeige.
- [x] PERF-04-S04: Versionsvergleich und Update-Vorschau großer Stände im Worker.
- [x] PERF-04-S05: Bibliotheksstart im Hintergrund: mitgelieferten Katalog erzeugen, Auslieferung planen und Katalogkennwerte aller Versionen im Worker; Seite schreibt nur den Plan und entpackt in Scheiben, Fortschritt auf dem Startbildschirm, Rückfall ohne Worker.
- [ ] PERF-04-S06: Abnahme auf echten Geräten (Philipps Rechner mit Olympus), Firefox/Safari; GPU-Upload großer Szenen in Stücken (seit GFX-02-S03 umgesetzt, Abnahme auf echter GPU offen).
- [x] PERF-04-S07: Katalogspeicher je App-Version: Kennung aus dem Kerncode beim Bauen, gebauter Katalog und Kennwerte im meta-Speicher; Neuladen bis zum Katalog ~5 s → ~1 s.

**Abnahme:** Ergebnisse (Prüfsumme, Version-ID, gepackte Zellen, 3D-Netz, Exportdatei) sind gleich wie auf dem direkten Weg. Abbrechen beendet die Berechnung sofort; nichts wird gespeichert oder heruntergeladen. Ein 927 000-Block-Litematic blockiert die Seite beim Speichern nicht mehr in langen Stücken (vorher bis 17 s). Der Start blockiert die Seite nicht mehr in langen Stücken (vorher bei jedem Start 3–4 s am Stück); die Bibliothek ist danach dieselbe wie auf dem direkten Weg.

**Nächste Aktion:** Abnahme auf Philipps Rechner mit Olympus und in Firefox/Safari (S06). Der GPU-Upload großer Szenen läuft seit GFX-02-S03 in Stücken, seit GFX-03 mit Sichtfeld zuerst.

**Nur Philipp:** Auf echten Geräten und Browsern: Olympus auf deinem Rechner, dazu Firefox/Safari (S06).

**Prüfstand:** Node- und Chromium-Prüfung bestanden; echte Geräte und andere Browser offen.

**Nachweise:** [tests/unit/core/background-jobs.test.mjs](../tests/unit/core/background-jobs.test.mjs) — Spaltenübergabe, Versiegeln, Caches, byte-gleiches Netz, Exportfortschritt, Auftragsclient mit Abbrechen und Fehlern.; [tests/e2e/background-jobs.e2e.mjs](../tests/e2e/background-jobs.e2e.mjs) — Chromium: 130 000 Blöcke importieren, speichern, Datencheck, STL wasserdicht; Abbrechen; Update-Vorschau und Vergleich über den Worker.; [docs/architecture/kern/BACKGROUND_JOBS.md](architecture/kern/BACKGROUND_JOBS.md) — Aufträge, Vertrauensregel, Caches, Schwellen, Messung, Grenzen.; [tests/unit/catalog/library-start.test.mjs](../tests/unit/catalog/library-start.test.mjs) — Worker-Start schreibt genau das, was seedSamples schreibt; Kennwerte gleich wie im Katalog; nichts zu schreiben beim zweiten Start; beschädigte Version stoppt den Start nicht.; [tests/e2e/library-start.e2e.mjs](../tests/e2e/library-start.e2e.mjs) — Chromium: Fortschritt beim Start, längste Blockade < 1,5 s, Katalog vollständig, Neuladen schreibt nichts, Datencheck ohne Befund; Start ohne Worker und mit defektem Worker.

**Dateiumfang:** `apps/web/src/jobs/`, `packages/voxel/src/cellColumns.ts`, `packages/voxel/src/validation.ts`, `packages/domain/src/catalog/library.ts`, `packages/domain/src/data/versionStorage.ts`, `apps/web/src/viewer/backgroundMesh.ts`, `apps/web/src/blockmodels/snapshot.ts`, `apps/web/src/app/importFile.ts`, `tests/unit/core/background-jobs.test.mjs`, `tests/e2e/background-jobs.e2e.mjs`, `docs/architecture/kern/BACKGROUND_JOBS.md`, `apps/web/src/app/context.tsx`, `apps/web/src/app/repository.ts`, `apps/web/src/app/idbRepository.ts`, `packages/application/src/catalogSync.ts`, `packages/application/src/repository.ts`, `packages/domain/src/catalog/buildings.ts`, `tests/unit/catalog/library-start.test.mjs`, `tests/e2e/library-start.e2e.mjs`, `vite.config.mjs`. **Abhängigkeiten:** PERF-01, MODEL-01, ARCH-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PERF-05

**Gesamtsystem auf Ladezeit und Stabilität optimiert: Katalog beim Bauen vorberechnet, Seiten bei Bedarf geladen, schnelleres Hashing, plattformfeste Mathematik, priorisierter Befund** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Gesamtsystem auf Performance und Stabilität optimieren“ · Zuständiger Thread: „Leistung bei großen Szenen steigern“ · Aktualisiert: 2026-11-06T09:11:06.629Z

- [x] PERF-05-S01: Messbasis und priorisierter Befund (Ladezeiten, Pakete, CPU-Brennpunkte, Fehlerbehandlung) in PERFORMANCE_AUDIT.md; Messskript scripts/perf/measure_start.mjs.
- [x] PERF-05-S02: Mitgelieferter Katalog als Datei beim Bauen (assets/catalog-<key>.json), Worker lädt sie bei fehlendem Katalogspeicher, Rückfall auf Erzeugen; Erststart 5,2 s → 1,4 s.
- [x] PERF-05-S03: Seiten bei Bedarf laden mit Vorladen im Leerlauf und einmaligem Neuladen nach Deploy; Startpaket 1,33 MB → 0,72 MB; Gebäudesets nicht mehr im Seitenpaket.
- [x] PERF-05-S04: canonicalJson ohne Zwischenarrays (Byte für Byte gleiche Ausgabe).
- [x] PERF-05-S05: Plattformfeste Winkelfunktionen für gespeicherte Geometrie (Kolosseum war in Node und Chromium verschieden).
- [x] PERF-05-S06: Dauerhafter Vorschaubildcache (O-1): Cache Storage je Render-Revision, Neustart ohne erneutes Rendern.
- [x] PERF-05-S07: Analyse Mod und Paper-Plugin (O-8): Teamstand-Zwischenspeicher je Team im Plugin (Trichter und Abbauen mit mehreren Teams), Lagerbefehle aus StorageModule in StorageCommands (O-6); Befund in PERFORMANCE_AUDIT Runde 5.
- [x] PERF-05-S08: Zellen erst bei Bedarf entpacken statt alle Versionen beim Start (O-2).
- [x] PERF-05-S09: Startpaket verkleinern (O-3): Projektreiter und Gebäudesets aus dem Start, Reiter einzeln nachladen.

**Abnahme:** Katalog aus der Datei ist Asset für Asset und Version für Version gleich dem im Browser erzeugten. Fehlende, beschädigte oder fremde Katalogdatei führt zum Erzeugen wie bisher, ohne Fehler. Hash- und ID-Ausgabe unverändert; kein mitgeliefertes Gebäude bekommt eine neue Version-ID gegenüber Node. Alle Kern- und Browsertests grün.

**Nächste Aktion:** Weitere große Dateien (TeamClient, LiveLink, RoomClient, TeamModule) nach Merge der Mod-Threads teilen; inkrementelle Faltung des Teamprotokolls im Plugin beobachten.

**Prüfstand:** Node- und Chromium-Prüfung im Cloud-Container; echte Geräte, Firefox/Safari offen.

**Nachweise:** [docs/architecture/kern/PERFORMANCE_AUDIT.md](architecture/kern/PERFORMANCE_AUDIT.md) — Messungen vorher/nachher, umgesetzte und offene Befunde mit Priorität.; [tests/e2e/catalog-snapshot.e2e.mjs](../tests/e2e/catalog-snapshot.e2e.mjs) — Chromium: Erststart aus Datei, Neustart aus Speicher, gleicher Katalog wie selbst erzeugt, Rückfall bei fehlender/beschädigter/fremder Datei.; [tests/unit/core/stable-math.test.mjs](../tests/unit/core/stable-math.test.mjs) — Genauigkeit gegen Math, Sonderwerte, feste Referenzbits.; [tests/unit/core/canonical-json.test.mjs](../tests/unit/core/canonical-json.test.mjs) — 2000 Zufallswerte und Sonderfälle gleich der alten Implementierung.; [tests/e2e/thumb-store.e2e.mjs](../tests/e2e/thumb-store.e2e.mjs) — Chromium: Vorschaubilder nach Neustart aus dem Speicher (blob), alter Speicher entfernt, ohne Cache Storage normal gerendert.

**Dateiumfang:** `docs/architecture/kern/PERFORMANCE_AUDIT.md`, `packages/application/src/catalogSnapshot.ts`, `packages/voxel/src/stableMath.ts`, `packages/domain/src/core/hash.ts`, `scripts/pages/build_catalog_snapshot.mjs`, `scripts/pages/catalog_key.mjs`, `scripts/bench/perf/measure_start.mjs`, `apps/web/src/app/lazyPage.tsx`, `apps/web/src/main.tsx`, `apps/web/src/jobs/libraryJob.ts`, `apps/web/src/jobs/library.ts`, `tests/e2e/catalog-snapshot.e2e.mjs`, `tests/unit/core/stable-math.test.mjs`, `tests/unit/core/canonical-json.test.mjs`, `apps/web/src/thumbnail/thumbStore.ts`, `apps/web/src/thumbnail/Thumb.tsx`, `tests/e2e/thumb-store.e2e.mjs`, `apps/web/src/views/map/useMapHistory.ts`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageModule.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageCommands.java`. **Abhängigkeiten:** PERF-04. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PERF-06

**Mehr Leistung ohne eigenen Server: Offline-Speicher (Service Worker) und kostenlose zweite Adresse auf Cloudflare Pages** · 🚧 In Arbeit · Priorität P1 · Verantwortlich: Claude-Thread „Einfachsten Weg zu mehr Leistung finden“ · Zuständiger Thread: „Einfachsten Weg zu mehr Leistung finden“ · Aktualisiert: 2026-11-06T15:17:03.640Z

- [x] PERF-06-S01: Offline-Speicher: sw.js aus dem Build (Programmdateien mit Inhalts-Hash, Startseite erst Netz), Start ohne Internet, nach Updates nur geänderte Dateien, Karte im Systemcheck zum Ausschalten, Notbremse.
- [x] PERF-06-S02: Zweite Adresse auf Cloudflare Pages (Gratis-Tarif) aus demselben Build, eigene Cache-Regeln; GitHub Pages bleibt. Live: https://bauplaner.pages.dev/Minecraft-Bauplaner/ (Brotli, assets ein Jahr unveränderlich); publish_pages.sh lädt mit hoch, wenn die Zugangsdaten da sind.
- [ ] PERF-06-S03: Team-Raum und Mod-Verbindung erlauben die Cloudflare-Adresse.

**Abnahme:** Zweiter Start lädt keine Programmdatei aus dem Netz, ohne Internet startet die zuletzt geladene Fassung. Neue Veröffentlichung kommt beim nächsten Laden an; alte Programmdateien werden entfernt. Ausschalten im Systemcheck entfernt Service Worker und Speicher dauerhaft; Notbremse über sw.js möglich. Automatisierte Browser bleiben ohne Testschalter unberührt; alle Tests grün.

**Nächste Aktion:** PERF-06-S03: Team-Raum mit neuer Herkunft deployen (zusammen mit dem offenen LINK-10-Raum-Deploy) und Mod-Herkunft in der nächsten Mod-Version (Thread „Anbindung von Planer, Mod und Server neu denken“).

**Prüfstand:** Chromium im Cloud-Container; Safari/iPad und Firefox offen.

**Nachweise:** [tests/e2e/offline.e2e.mjs](../tests/e2e/offline.e2e.mjs) — Chromium: Installation, Laden aus dem Speicher, Start offline, alte Dateien weg, Ausschalten.; [tests/unit/tooling/service-worker.test.mjs](../tests/unit/tooling/service-worker.test.mjs) — Manifest ohne Katalogdatei, Version folgt dem Inhalt, Notbremse, Publisher erlaubt sw.js.; [docs/architecture/betrieb/OFFLINE.md](architecture/betrieb/OFFLINE.md) — Regeln, Grenzen, Notbremse, Cloudflare-Plan.

**Dateiumfang:** `scripts/pages/service_worker.template.js`, `scripts/pages/build_service_worker.mjs`, `scripts/pages/prepare_main_pages.mjs`, `apps/web/src/app/offline.ts`, `apps/web/src/main.tsx`, `apps/web/src/views/SystemView.tsx`, `tests/e2e/offline.e2e.mjs`, `tests/unit/tooling/service-worker.test.mjs`, `docs/architecture/betrieb/HOSTING.md`, `docs/architecture/betrieb/OFFLINE.md`, `package.json`, `scripts/pages/publish_cloudflare.mjs`, `scripts/pages/publish_main_pages.sh`, `services/team-room/src/index.js`, `tests/unit/tooling/cloudflare-pages.test.mjs`. **Abhängigkeiten:** PERF-05. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### VIEW-01

**Vorhandenen Viewer vollständig abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] VIEW-01-S01: Orbit, Freiflug, Schnitte, Picking, Touch, Kulling und Softwarefallback vorhanden.
- [ ] VIEW-01-S02: Aktuelle GPU-/Touch-Prüfung mit negativen Koordinaten und allen Schnittachsen.

**Abnahme:** Sichtbarkeit verändert keine Quelldaten oder Gesamtmengen.

**Nächste Aktion:** Aktuelle GPU-/Touch-Prüfung mit negativen Koordinaten und allen Schnittachsen.

**Nur Philipp:** Auf echten Geräten und Browsern: Ansicht auf echter GPU und mit Touch prüfen, negative Koordinaten, alle Schnittachsen (S02).

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** [tests/unit/web/viewer.test.mjs](../tests/unit/web/viewer.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.

**Dateiumfang:** `apps/web/src/viewer/`. **Abhängigkeiten:** QA-01. **Alte IDs:** B6, P1-03.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### VIEW-02

**Minecraft-nahe zustandsabhängige Blockformen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude Thread „Blockdarstellung“ (B16) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] VIEW-02-S01: B16-Dateizuständigkeit vor Beginn prüfen.
- [x] VIEW-02-S02: Treppen, Stufen, Zäune, Mauern und Glas nach Zuständen darstellen.
- [x] VIEW-02-S03: Picking, Layer, Fallbacks und Performance unabhängig prüfen.
- [x] VIEW-02-S04: Originaltexturen nur im Browser des Nutzers (Mojang-Jar oder eigene Dateien), nichts mitgeliefert.
- [x] VIEW-02-S05: Blockregister 26.3 (1288 Blöcke) und Zustandsregeln für alle ausrichtbaren Blöcke.
- [ ] VIEW-02-S06: Mojang-Download im Browser, Firefox/Safari und echte Geräte prüfen (Registryreport seit PROFILE-01 übernommen).

**Abnahme:** Keine fremden Texturen ohne Rechte; sichtbare Geometrie stimmt mit Zellwahl überein.

**Nächste Aktion:** Mojang-Download im echten Browser und weitere Browser prüfen (Testphase); Register ist seit PROFILE-01 an den Serverbericht gebunden.

**Nur Philipp:** Auf echten Geräten und Browsern: Mojang-Download und Blockformen in Firefox/Safari und auf echten Geräten (S06).

**Prüfstand:** Node- und Chromium-Prüfungen bestanden (391 Node, 59 Browser); Mojang-Download im Browser, Firefox/Safari und Geräte offen.

**Nachweise:** [tests/unit/building/blocks.test.mjs](../tests/unit/building/blocks.test.mjs) — ZIP, Modelle, Formen aller 1288 Blöcke, Mesh/Kulling, Zustandsregeln.; [tests/e2e/textures.e2e.mjs](../tests/e2e/textures.e2e.mjs) — Texturdialog mit synthetischer Quelle, Speicherung, Entfernen, keine Mojang-Anfrage ohne Klick.; [docs/architecture/formate/BLOCK_MODELS.md](architecture/formate/BLOCK_MODELS.md) — Lizenzentscheidung, Module, Grenzen.

**Dateiumfang:** `apps/web/src/blockmodels/`, `apps/web/src/viewer/`, `apps/web/src/thumbnail/`, `apps/web/src/schem/`, `packages/voxel/src/blockRegistry.ts`, `packages/voxel/src/states.ts`, `scripts/gen/gen_block_data.py`. **Abhängigkeiten:** PROFILE-01, VIEW-01. **Alte IDs:** VIEW-03, B16.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### BLOCK-01

**Echte Minecraft-Blocklogik 26.3: Zustände, Verbindungen, Halt, Bauschritte, Material** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Echte Minecraft-Blocklogik einbauen“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] BLOCK-01-S01: Blockfakten aus dem echten 26.3-Server (Berichte + Prüfprogramm): alle 1286 Blöcke, 35.723 Zustände, Stützflächen, Halt, Items, Stapelgrößen, Tags.
- [x] BLOCK-01-S02: Verbindungen wie im Spiel (Zäune, Mauern hoch/niedrig/Pfosten, Scheiben/Gitter, Treppenformen, Tore, Schneegras, Pilzblöcke); 3.060 Spielvektoren gleich.
- [x] BLOCK-01-S03: Halt- und Schwerkraftregeln (canSurvive, FallingBlock, Kaktus, Zuckerrohr, Gerüst, Ranken, Pilze im Dunkeln) und Platzierprüfung.
- [x] BLOCK-01-S04: Bauschritt-Reihenfolge nach echtem Halt, Phase „Hängende Blöcke“, Halt-Voraussetzungen.
- [x] BLOCK-01-S05: Material mit echten Items (asItem) und Stapelgrößen; Werkstatt-Palette mit Spiel-Standardzuständen.
- [x] BLOCK-01-S06: Oberfläche: Spielprüfung in der Bauanleitung, „Wie im Spiel verbinden“ und „Spielprüfung“ in der Werkstatt.
- [ ] BLOCK-01-S07: Abnahme im echten Spiel: Bau mit Spielprüfung ohne Hinweise nachbauen, Verbindungen vergleichen.

**Abnahme:** Verbindungen und Halt entsprechen dem Spielcode (Prüfvektoren aus dem echten Server); keine Mojang-Dateien im Repository (ADR-020).

**Nächste Aktion:** Abnahme im Spiel; PROFILE-01 kann die Berichtsfakten übernehmen. Die Katalogfehler aus der Spielprüfung behebt BLOCK-02.

**Nur Philipp:** Im Spiel an deinem PC: Einen Bau mit Spielprüfung ohne Hinweise nachbauen und Verbindungen vergleichen (S07).

**Prüfstand:** Node- und Chromium-Prüfungen bestanden; Abnahme im echten Spiel offen.

**Nachweise:** [tests/unit/building/block-logic.test.mjs](../tests/unit/building/block-logic.test.mjs) — Fakten, alle 3.060 Spielvektoren, Halt-Sonderfälle, Platzierprüfung, Verbinden, Bauanleitung, Material.; [tests/e2e/block-logic.e2e.mjs](../tests/e2e/block-logic.e2e.mjs) — Spielprüfung in der Bauanleitung (1400/390 px), Zaunreihe in der Werkstatt verbinden und rückgängig.; [docs/architecture/formate/BLOCK_LOGIC.md](architecture/formate/BLOCK_LOGIC.md) — Herkunft der Fakten, Module, Regeln, Grenzen.

**Dateiumfang:** `packages/voxel/src/blockFacts.ts`, `packages/voxel/src/blocklogic/`, `packages/domain/src/core/placement.ts`, `packages/domain/src/editor/settle.ts`, `packages/domain/src/building/guide.ts`, `packages/domain/src/materials/materials.ts`, `packages/domain/src/editor/blocks.ts`, `apps/web/src/views/project/PlacementPanel.tsx`, `apps/web/src/editor/BlockEditor.tsx`, `scripts/probe/`, `scripts/gen/gen_block_facts.mjs`, `fixtures/blocks/`. **Abhängigkeiten:** VIEW-02, BUILD-01, MAT-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### BLOCK-02

**Katalog und Generatoren spielgerecht: keine schwebenden Blöcke, Verbindungen wie im Spiel** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Schwebende Blöcke im Katalog reparieren“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] BLOCK-02-S01: Gemeinsame Bauregel gameReady(): Laternen ohne Halt hängen an iron_chain bis zur nächsten Decke, danach alle Verbindungen wie im Spiel (settlePayload); gilt für jedes Katalog-Gebäude und jeden Generator.
- [x] BLOCK-02-S02: Alte Block-ID chain durch iron_chain ersetzt (in 26.3 gibt es chain nicht mehr): 152 Katalog- und alle Generator-Ketten.
- [x] BLOCK-02-S03: Alle 336 Katalog-Gebäude ohne Fehler: Leitern vor Fenstern/in Wandzellen, Banner, Fackeln, Haken, Glocke, Blumen auf Stein, Kakao, Kaktus, Zuckerrohr, Betten, Türen; 178 Gebäude erhalten über die Katalog-Lieferung eine neue Version.
- [x] BLOCK-02-S04: Generatoren erzeugen nur gültige Bauten (Kirche, Hafen, Torhaus, Windmühle, Brücke, Treppenhaus, Brunnen; Version jeweils erhöht, Dorfplatz-Anlage v2).
- [x] BLOCK-02-S05: Dauerhafte Prüfung tests/catalog-game.test.mjs (checkPlacement mit ownSpace) über alle Gebäude und Generator-Fälle; Kakao-Regel nachgetragen.
- [ ] BLOCK-02-S06: Abnahme im echten Spiel: einige geänderte Gebäude per Litematic setzen, nichts bricht ab.

**Abnahme:** Spielprüfung mit ownSpace meldet für jedes Katalog-Gebäude und jeden geprüften Generator-Fall 0 Fehler (ohne Halt, fällt, Hälfte, Verbindung, ungültiger Zustand, unbekannte Blöcke).

**Nächste Aktion:** Abnahme im Spiel (S06): geänderte Gebäude (z. B. Werkstatt, Windmühle, Torhaus, Stadthaus) per Litematic setzen.

**Nur Philipp:** Im Spiel an deinem PC: Geänderte Gebäude (Werkstatt, Windmühle, Torhaus, Stadthaus) per Litematic setzen (S06).

**Prüfstand:** Node-Prüfungen bestanden; Abnahme im echten Spiel steht aus.

**Nachweise:** [tests/unit/catalog/catalog-game.test.mjs](../tests/unit/catalog/catalog-game.test.mjs) — Alle Gebäude und Generator-Fälle ohne Halt-, Verbindungs- und ID-Fehler; hangLanterns, ownSpace, Kakao.; [docs/architecture/formate/BLOCK_LOGIC.md](architecture/formate/BLOCK_LOGIC.md) — Abschnitt „Spielgerechter Katalog (BLOCK-02)“.

**Dateiumfang:** `packages/domain/src/build/`, `packages/domain/src/catalog/buildings.ts`, `packages/domain/src/generators/`, `packages/domain/src/core/placement.ts`, `packages/voxel/src/blocklogic/support.ts`, `packages/domain/src/materials/materials.ts`, `packages/domain/src/building/guide.ts`, `tests/unit/catalog/catalog-game.test.mjs`. **Abhängigkeiten:** BLOCK-01, LIB-04, UPDATE-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GFX-01

**Grafik vertiefen: Minecraft-Licht, Eckschatten, Sonne mit Schatten, Nacht, Spawnprüfung, sortiertes Glas und 32³-Abschnitte für große Modelle** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Grafik der Blockdarstellung vertiefen“ · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GFX-01-S01: Licht wie im Spiel: Leuchtwerte je Blockzustand, Himmels- und Blocklicht mit Dämpfung, weiches Licht und Eckschatten je Eckpunkt.
- [x] GFX-01-S02: Lichtmodi Tag/Sonne/Nacht/Flach im Shader ohne Neuaufbau; Sonnenschatten nach Uhrzeit; Menü „Licht“ mit Speicherung im Browser.
- [x] GFX-01-S03: Spawnprüfung (Blocklicht 0, Boden, zwei freie Zellen; tagsüber/nachts) mit Kreuzen und Zählern.
- [x] GFX-01-S04: Durchscheinende Flächen von hinten nach vorn sortiert; Standbilder mit festem Look.
- [x] GFX-01-S05: 32³-Abschnitte mit Fingerabdruck: nur geänderte Abschnitte neu bauen, Picking über Position.
- [ ] GFX-01-S06: Echte GPUs, Firefox/Safari, Handy-Leistung mit Schatten und Abgleich mit Spielbildern prüfen.

**Abnahme:** Lichtwechsel baut keine Geometrie neu. Inkrementeller Aufbau ergibt dieselben Abschnitte wie ein vollständiger. Keine fremden Texturen; Licht nur aus eigenen Regeln und geladenen Quellen.

**Nächste Aktion:** Prüfung auf echten Geräten und Browsern (S06); Biomfarben und leuchtende Blockentities als GFX-02.

**Nur Philipp:** Auf echten Geräten und Browsern: Licht und Schatten auf echten GPUs, Firefox/Safari und Handy (S06).

**Prüfstand:** Node- und Chromium-Prüfung (Software-WebGL) bestanden; echte GPUs, Firefox/Safari und Geräte offen.

**Nachweise:** [tests/unit/web/graphics.test.mjs](../tests/unit/web/graphics.test.mjs) — Leuchtwerte, Ausbreitung, AO, Licht je Eckpunkt, Spawnflächen, Abschnitte inkrementell = neu, Sortierung, Einstellungen.; [tests/e2e/graphics.e2e.mjs](../tests/e2e/graphics.e2e.mjs) — Chromium: Lichtmodi mit Helligkeitsvergleich, Schatten, Spawnprüfung, Speicherung, Abschnitte und Picking.; [docs/architecture/planer/GRAPHICS.md](architecture/planer/GRAPHICS.md) — Regeln, Messwerte, Grenzen.

**Dateiumfang:** `apps/web/src/blockmodels/light.ts`, `apps/web/src/blockmodels/graphics.ts`, `apps/web/src/blockmodels/mesh.ts`, `apps/web/src/blockmodels/threeMesh.ts`, `apps/web/src/blockmodels/blocks.css`, `apps/web/src/viewer/`, `apps/web/src/thumbnail/`, `tests/unit/web/graphics.test.mjs`, `tests/e2e/graphics.e2e.mjs`, `docs/architecture/planer/GRAPHICS.md`. **Abhängigkeiten:** VIEW-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GFX-02

**Darstellung und Leistung, Runde 2: Biomfarben, leuchtende Blockentities (Leuchtfeuer-Strahl, Endportal, Magma), GPU-Upload großer Szenen in Stücken** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Darstellung und Leistung weiter verbessern“ · Zuständiger Thread: „Darstellung und Leistung weiter verbessern“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GFX-02-S01: Biomfarben für Gras, Laub und Wasser (Ebene, Wald, Dschungel, Taiga, Savanne, Sumpf, Kirschhain …) im Grafikmenü, umschaltbar im Shader ohne Neuaufbau; Standbilder bleiben Ebene.
- [x] GFX-02-S02: Leuchtende Blockentities: Leuchtfeuer-Strahl mit Pyramidenprüfung, Glasfarben und Sperre durch feste Blöcke; Endportal/Endtransitportal und Magma/aktive Sculk-Sensoren voll hell wie im Spiel.
- [x] GFX-02-S03: Große Szenen in Stücken auf die GPU: Abschnitte nahe der Kamera zuerst, Datenmenge je Bild nach Bildzeit geregelt, alte Abschnitte bleiben bis zum Ersatz sichtbar.
- [ ] GFX-02-S04: Echte GPUs, Firefox/Safari und Spielbildabgleich der neuen Darstellung (mit GFX-01-S06).

**Abnahme:** Biomwechsel baut keine Geometrie neu; Standbilder und 3D-Export bleiben unverändert. Inkrementeller Aufbau mit Leuchtfeuer ergibt dieselben Abschnitte wie ein vollständiger. Kleine Modelle erscheinen weiter in einem Bild; große bleiben während des Hochladens bedienbar.

**Nächste Aktion:** Abnahme auf echten GPUs, Firefox/Safari und Abgleich mit Spielbildern (S04, zusammen mit GFX-01-S06).

**Nur Philipp:** Auf echten Geräten und Browsern: Biom, Leuchtfeuer-Strahl und flüssiges Laden großer Modelle auf dem eigenen Rechner ansehen (S04).

**Prüfstand:** Node- und Chromium-Prüfung (Software-WebGL) bestanden; echte GPUs, Firefox/Safari und Spielbildabgleich offen.

**Nachweise:** [tests/unit/web/graphics2.test.mjs](../tests/unit/web/graphics2.test.mjs) — Biomfaktoren, Farbklassen je Fläche, Leuchten, Leuchtfeuer (Pyramide, Glas, Sperre, Grundgestein), Abschnitt neu bei Dach weit oben, inkrementell = neu, Upload-Reihenfolge und Budget.; [tests/e2e/graphics2.e2e.mjs](../tests/e2e/graphics2.e2e.mjs) — Chromium: Biomwechsel ohne Neuaufbau mit Farbvergleich, Leuchtfeuer 1 von 2, 150 000 Blöcke in mehreren Bildern hochgeladen, Auswahl danach.; [docs/architecture/planer/GRAPHICS.md](architecture/planer/GRAPHICS.md) — Abschnitt Runde 2 (GFX-02): Regeln, Prüfattribute, Grenzen.

**Dateiumfang:** `apps/web/src/blockmodels/beacon.ts`, `apps/web/src/blockmodels/biomes.ts`, `apps/web/src/blockmodels/graphics.ts`, `apps/web/src/blockmodels/light.ts`, `apps/web/src/blockmodels/mesh.ts`, `apps/web/src/blockmodels/snapshot.ts`, `apps/web/src/blockmodels/threeMesh.ts`, `apps/web/src/blockmodels/tint.ts`, `apps/web/src/jobs/meshJob.ts`, `apps/web/src/testing/testplan.ts`, `apps/web/src/viewer/`, `apps/web/src/viewer/backgroundMesh.ts`, `docs/architecture/planer/GRAPHICS.md`, `docs/testing/TESTPLAN.md`, `tests/e2e/graphics.e2e.mjs`, `tests/e2e/graphics2.e2e.mjs`, `tests/unit/web/graphics.test.mjs`, `tests/unit/web/graphics2.test.mjs`. **Abhängigkeiten:** GFX-01, VIEW-02, PERF-04. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GFX-03

**Große Szenen flüssig bedienen: Glas und Wasser je Bild sortiert, schnelles und richtiges Anklicken, Sichtfeld zuerst hochladen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Leistung bei großen Szenen steigern“ · Zuständiger Thread: „Leistung bei großen Szenen steigern“ · Aktualisiert: 2026-11-06T09:11:06.629Z

- [x] GFX-03-S01: Durchscheinende Flächen im Betrachter je Bild sortiert (höchstens 250 000 Flächen, Sichtfeld und Nähe zuerst, erneut erst nach Bewegung um ¼ Block oder 2 % des Abstands); schnellere Sortierung ohne Vergleichsfunktion.
- [x] GFX-03-S02: Anklicken prüft Abschnitte in Strahlreihenfolge und hört nach dem nächsten Treffer auf (gleiches Ergebnis); Fehler behoben: auf sortiertem Glas/Wasser wurde oft ein falscher Block gewählt.
- [x] GFX-03-S03: GPU-Upload: Abschnitte im Sichtfeld vor näheren außerhalb des Bildes.
- [ ] GFX-03-S04: Abnahme auf echter GPU mit einem großen Modell mit Wasser (Philipps Rechner), Firefox/Safari.

**Abnahme:** Standbilder und 3D-Export unverändert; die Sortierung ergibt dieselbe Reihenfolge wie eine einfache Abstandssortierung (auf 1/64 Block). Anklicken findet denselben nächsten Treffer wie das Prüfen aller Abschnitte; die Zelle enthält den Trefferpunkt, auch auf Glas und Wasser. Kein Bild sortiert mehr als das Budget; bei ruhender Kamera wird nichts sortiert.

**Nächste Aktion:** Abnahme auf Philipps Rechner: großes Modell mit Wasser drehen und Blöcke anklicken, dazu Firefox/Safari (S04).

**Nur Philipp:** Auf echten Geräten und Browsern: Ein großes Modell mit Wasser oder Glas im Betrachter drehen und Blöcke anklicken: flüssig und der richtige Block (S04).

**Prüfstand:** Node- und Chromium-Prüfung (Software-WebGL) bestanden; echte GPUs und Firefox/Safari offen.

**Nachweise:** [tests/unit/web/graphics3.test.mjs](../tests/unit/web/graphics3.test.mjs) — Sortierreihenfolge, 200 Zufallsstrahlen gleich allen Meshes und Zelle mit Trefferpunkt auf sortiertem Glas, Budget/Sichtfeld/Ruhe beim Sortieren, Sichtfeld beim Hochladen.; [tests/e2e/graphics2.e2e.mjs](../tests/e2e/graphics2.e2e.mjs) — Chromium: Feld mit Glas, Sortierung kommt zur Ruhe (data-sorting), danach Auswahl.; [docs/architecture/planer/GRAPHICS.md](architecture/planer/GRAPHICS.md) — Runde 3 (GFX-03): Messung 1,56 Mio. Blöcke, Regeln, Prüfattribut.

**Dateiumfang:** `apps/web/src/blockmodels/threeMesh.ts`, `apps/web/src/viewer/sceneController.ts`, `tests/unit/web/graphics3.test.mjs`, `tests/e2e/graphics2.e2e.mjs`, `docs/architecture/planer/GRAPHICS.md`, `docs/architecture/kern/PERFORMANCE_AUDIT.md`. **Abhängigkeiten:** GFX-02, PERF-04. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### MODEL-01

**3D-Export: Bauteile, Projekte und Anlagen als OBJ/MTL, glTF/GLB, STL und 3MF (Ansichtsmodell mit Blockformen/Texturen, wasserdichte Druckhülle mit Maßstab, Füllen, Aushöhlen, Farben)** · 🧩 Implementiert · Abnahme offen · Priorität P2 · Verantwortlich: Claude-Thread „Bauten als 3D-Modell exportieren“ · Zuständiger Thread: „Module und Systeme komplex ausarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MODEL-01-S01: Neutrales Dreiecksnetz und Schreiber OBJ/MTL, GLB (Textur eingebettet), STL, 3MF mit Farben; ZIP-Schreiber.
- [x] MODEL-01-S02: Ansichtsmodell aus buildBlockMesh: Blockformen, Glas getrennt, Texturen oder Farben, eingebackene Helligkeit, Lage.
- [x] MODEL-01-S03: Druckhülle aus dem Voxelgitter: Feinheit 1/2/4 mit eigenen Blockformen, Innenräume füllen, Aushöhlen, lose Teile, Kanten-/Eckreparatur, Wasserdichtprüfung.
- [x] MODEL-01-S04: Oberfläche „Modelldatei“ bei Bauteilen und im Betrachter, im Projekt-Export und bei Anlagen; Maßstab in mm/m, Warnungen.
- [ ] MODEL-01-S05: Dateien in Blender, Cura/PrusaSlicer/Bambu Studio öffnen und ein Modell drucken; Firefox/Safari.
- [x] MODEL-01-S06: Flächen der Druckhülle ohne T-Stöße zusammenfassen: gierige Rechtecke je Richtung/Ebene/Farbe, Randpunkte der Nachbarn, Fächer um die Mitte; wasserdicht geprüft.

**Abnahme:** Druckhülle ist bei jeder Feinheit geschlossen und mannigfaltig (unabhängige Prüfung der heruntergeladenen Datei). Ansichtsmodell nutzt dieselbe Geometrie wie der Betrachter. Keine Texturen im Repository; Texturen nur aus der geladenen Nutzerquelle.

**Nächste Aktion:** Dateien in Blender und Slicern prüfen und ein Testdruck; danach Flächenzusammenfassung (S06). Export läuft seit PERF-04 im Worker.

**Nur Philipp:** Dateien oder Welt liefern: Export in Blender und einem Slicer öffnen, ein Testdruck (S05).

**Prüfstand:** Node- und Chromium-Prüfung bestanden; Öffnen in Fremdprogrammen und echter Druck offen.

**Nachweise:** [tests/unit/formats/model3d.test.mjs](../tests/unit/formats/model3d.test.mjs) — Wasserdichtheit/Volumen, Reparatur, Füllen/Aushöhlen, Formen je Zustand, OBJ/GLB/STL/3MF/ZIP-Aufbau und Rundreisen.; [tests/e2e/model3d.e2e.mjs](../tests/e2e/model3d.e2e.mjs) — Chromium: GLB, STL (wasserdicht, 100 mm), 3MF mit 4 Farben, OBJ-ZIP auf Handybreite, Anlage.; [docs/architecture/formate/MODEL_EXPORT.md](architecture/formate/MODEL_EXPORT.md) — Verfahren, Formate, Achsen, Messwerte, Grenzen.; [tests/unit/formats/model3d.test.mjs](../tests/unit/formats/model3d.test.mjs) — MODEL-01-S06: Stufenpyramide mit Loch und zwei Farben sowie 12 zufällige Formen – zusammengefasst wasserdicht, gleiches Volumen, weniger Dreiecke.

**Dateiumfang:** `packages/formats/src/model3d.ts`, `packages/formats/src/printGrid.ts`, `packages/formats/src/zipWrite.ts`, `apps/web/src/export3d/`, `apps/web/src/blockmodels/shapes.ts`, `apps/web/src/schem/SchemView.tsx`, `tests/unit/formats/model3d.test.mjs`, `tests/e2e/model3d.e2e.mjs`, `docs/architecture/formate/MODEL_EXPORT.md`, `docs/TESTING.md`, `apps/web/src/testing/testplan.ts`, `docs/testing/TESTPLAN.md`. **Abhängigkeiten:** VIEW-02, GFX-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### EDIT-01

**Mehrfachauswahl und sichtbare Freiraumhüllen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Vollständigen Block-Builder bauen“ · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] EDIT-01-S01: Auswahlvertrag und atomare Gruppenoperationen definieren.
- [x] EDIT-01-S02: Freiraum-/Konflikthüllen und Undo/Redo ergänzen.

**Abnahme:** Keine zweite Transformationslogik; Gruppenaktionen vollständig oder gar nicht.

**Nächste Aktion:** Geräteprüfung (QA-02). Gruppenziehen im 3D-Bild ist mit EDIT-06 erledigt.

**Nur Philipp:** Auf echten Geräten und Browsern: Mehrfachauswahl auf echten Geräten (QA-02).

**Prüfstand:** Unit- und Chromium-Prüfung bestanden; Spielprüfung, Firefox/Safari und Geräte offen.

**Nachweise:** [tests/unit/editor/editor.test.mjs](../tests/unit/editor/editor.test.mjs) — Unit-Tests Entwurf, Werkzeuge, Speichern, Projektzuordnung, Gruppenoperationen.; [tests/e2e/editor.e2e.mjs](../tests/e2e/editor.e2e.mjs) — Chromium: Werkstatt, Projekt-Reiter, Mehrfachauswahl, 390 px.; [docs/architecture/planer/BLOCK_EDITOR.md](architecture/planer/BLOCK_EDITOR.md) — Vertrag, Grenzen und Prüfbefehle.

**Dateiumfang:** `apps/web/src/views/project/EditorTab.tsx`, `packages/domain/src/core/connectors.ts`, `apps/web/src/views/project/selection/`. **Abhängigkeiten:** STORE-02, VIEW-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### EDIT-02

**Blockeditor: Blöcke setzen, entfernen, ersetzen und drehen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Vollständigen Block-Builder bauen“ · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] EDIT-02-S01: Entwurfsvertrag mit invertierbaren Zelländerungen, Undo/Redo und Speichern als neue AssetVersion.
- [x] EDIT-02-S02: Werkzeuge: Setzen, Abbauen, Pipette, Ersetzen, Quader/Hohlkörper/Wände, Kugel, Zylinder, Linie, Fläche füllen, Drehen, Kopieren/Einfügen/Verschieben.
- [x] EDIT-02-S03: Blockpalette mit allen Blöcken des Profils, Zustandseditor mit erlaubten Werten und Standardwerten.
- [x] EDIT-02-S04: Einbindung: Bauteile/Bibliotheksgebäude als neue Version, Projekt-Reiter „Blöcke“ mit Zuordnung zu Instanzen.
- [x] EDIT-02-S05: Unit-, Browser- und Sichtprüfung, Doku.

**Abnahme:** Gespeicherte Versionen bleiben unverändert; jede Bearbeitung erzeugt eine neue Version, Projekte wechseln nur per invertierbarer Operation. Keine zweite Koordinaten- oder Drehlogik; Zustände ohne Regel bleiben sichtbar ungelöst. Gleiche Eingaben ergeben die gleiche Version (deterministische Palette).

**Nächste Aktion:** Spielprüfung. Picking an 3D-Blockflächen ist mit EDIT-06 erledigt.

**Nur Philipp:** Im Spiel an deinem PC: Gesetzte und gedrehte Zustände im Spiel prüfen.

**Prüfstand:** Unit- und Chromium-Prüfung bestanden; Spielprüfung, Firefox/Safari und Geräte offen.

**Nachweise:** [tests/unit/editor/editor.test.mjs](../tests/unit/editor/editor.test.mjs) — Unit-Tests Entwurf, Werkzeuge, Speichern, Projektzuordnung, Gruppenoperationen.; [tests/e2e/editor.e2e.mjs](../tests/e2e/editor.e2e.mjs) — Chromium: Werkstatt, Projekt-Reiter, Mehrfachauswahl, 390 px.; [docs/architecture/planer/BLOCK_EDITOR.md](architecture/planer/BLOCK_EDITOR.md) — Vertrag, Grenzen und Prüfbefehle.

**Dateiumfang:** `packages/domain/src/editor/`, `apps/web/src/editor/`, `apps/web/src/views/project/BlocksTab.tsx`, `tests/unit/editor/editor.test.mjs`, `tests/e2e/editor.e2e.mjs`, `docs/architecture/planer/BLOCK_EDITOR.md`. **Abhängigkeiten:** VIEW-01, STORE-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### EDIT-03

**Werkstatt vertiefen: Muster-Pinsel, Bogen/Pyramide/Kegel/Mauerzug, Schablonen, Ebenenübersicht und Tastenkürzel** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Werkstatt zum Bauen ausbauen“ · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] EDIT-03-S01: Muster-Pinsel (Mischung mit Gewichten und Lücken, Verlauf entlang Achse oder radial, Schachbrett, Streifen) deterministisch für Setzen, Formen, Füllen, Auswahlfüllung und Ersetzen; Vorlagen.
- [x] EDIT-03-S02: Formen Bogen (rund, spitz, flach; Pfosten, Tiefe, Wand mit Öffnung), Pyramide/Walmdach, Kegel, Mauerzug aus der Linie.
- [x] EDIT-03-S03: Schablonen: eingebaute Details, eigene Schablonen als Bibliotheksbauteile, jedes Bauteil als Vorlage; Einfüge-Vorschau unter dem Zeiger, Drehen/Spiegeln vor dem Setzen.
- [x] EDIT-03-S04: Bauen in Ebenen: Ebenenübersicht, 3D-Schnitt bis zur aktuellen Ebene, Maßanzeige beim Ziehen; Tastenkürzel mit Übersicht.
- [x] EDIT-03-S05: Unit-, Browser- und Handyprüfung, Doku.

**Abnahme:** Gleiche Eingaben (inkl. Musterwürfelwert) ergeben dieselben Zellen und dieselbe Version. Keine zweite Koordinaten- oder Drehregel; Schablonen drehen über transformClipboard. Eigene Schablonen liegen als normale Bauteile in Speicher und Sicherung.

**Nächste Aktion:** Spielprüfung der Schablonen-Zustände (Tür, Treppe, Laterne). Picking an 3D-Blockflächen ist mit EDIT-06 erledigt.

**Nur Philipp:** Im Spiel an deinem PC: Schablonen-Zustände (Tür, Treppe, Laterne) im Spiel prüfen.

**Prüfstand:** Unit- und Chromium-Prüfung bestanden; Spielprüfung, Firefox/Safari und Geräte offen.

**Nachweise:** [tests/unit/editor/editor-patterns.test.mjs](../tests/unit/editor/editor-patterns.test.mjs) — Muster, Formen mit Handzählung, Schablonen und Drehungen.; [tests/e2e/workshop-tools.e2e.mjs](../tests/e2e/workshop-tools.e2e.mjs) — Chromium 1400/390 px: Mauer mit Muster, Bogen, Schablone mit Vorschau und Drehen, Tastenkürzel, Schnitt, eigene Schablone, Ersetzen mit Muster.; [docs/architecture/planer/BLOCK_EDITOR.md](architecture/planer/BLOCK_EDITOR.md) — Vertrag und Grenzen EDIT-03.

**Dateiumfang:** `packages/domain/src/editor/patterns.ts`, `packages/domain/src/editor/shapes.ts`, `packages/domain/src/editor/stencils.ts`, `apps/web/src/editor/`, `tests/unit/editor/editor-patterns.test.mjs`, `tests/e2e/workshop-tools.e2e.mjs`, `docs/architecture/planer/BLOCK_EDITOR.md`. **Abhängigkeiten:** EDIT-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### EDIT-04

**Kreativwerkzeuge aus dem Planer-Vergleich: Symmetrie, Kurven, Naturwerkzeuge, Oberflächenmaske, Farbpaletten, Bild → Blöcke** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Ideen aus anderen Planern übernehmen“ · Zuständiger Thread: „Mod-Werkzeuge und Planer-Anbindung erweitern“ · Aktualisiert: 2026-11-06T10:12:51.224Z

- [x] EDIT-04-S01: Gap-Analyse: andere Planer und Bautools gegen unsere Module, Auswahl und Vorschläge für eigene Threads (docs/project/PLANER_VERGLEICH.md).
- [x] EDIT-04-S02: Symmetrie (Spiegeln X/Z, 2-/4-fach drehen, Achse auf Zellmitte oder -grenze) mit Zustandsdrehung über transformBlockState für alle Pinsel-Werkzeuge.
- [x] EDIT-04-S03: Kurven durch Punkte (Catmull-Rom, offen/geschlossen) mit Profilen Rohr, Weg, Mauer; lückenlos.
- [x] EDIT-04-S04: Natur- und Formwerkzeuge in der Auswahl: Glätten, Abtragen, Aufbauen, Überziehen, Naturalisieren; Oberflächenmaske (alle/oben/seitlich).
- [x] EDIT-04-S05: Farbpaletten (ähnliche Blöcke, Farbverlauf in Lab als Muster) und Bild → Blöcke (Wand/Boden, Dithering, Blockgruppen) über die Zwischenablage.
- [x] EDIT-04-S06: Unit-, Browser- und Handyprüfung, Doku.
- [ ] EDIT-04-S07: Spielprüfung gespiegelter und gedrehter Zustände (Türen, Truhen, Schienen) sowie Firefox/Safari/Geräte.
- [x] EDIT-04-S08: Symmetrie und Kurven auch in der Mod (Bauhilfen, nur Client): gleiche Gruppe, Zustandsdrehung und Kurvenzellen wie der Planer (gemeinsame Prüfvektoren), Geisterblöcke, Fortschritt, „als Plan“ ins Hologramm.

**Abnahme:** Gleiche Eingaben ergeben dieselben Zellen und dieselbe Version (auch Dithering). Keine zweite Koordinaten- oder Drehregel; Symmetrie nutzt transformVector/transformBlockState, ungelöste Zustände werden gemeldet. Jede Kurve ist flächenverbunden; jedes Werkzeug ist ein Rückgängig-Schritt. Keine Farbtabellen oder Texturen im Kern.

**Nächste Aktion:** Spielprüfung gespiegelter Zustände im Planer (S07) und der Bauhilfen in der Mod (MOD-18/19); Gelände-Werkzeuge auf dem Projektgelände bleiben offen.

**Nur Philipp:** Im Spiel an deinem PC: Gespiegelte und gedrehte Zustände (Türen, Truhen, Schienen) im Spiel (S07). Im Spiel an deinem PC: Bauhilfen Symmetrie und Kurven in der Mod (MOD-18, MOD-19).

**Verwaist (ohne Bearbeiter):** Gelände-Werkzeuge auf dem Projektgelände (als eigener Thread angekündigt, nie gestartet).

**Prüfstand:** Unit- und Chromium-Prüfung bestanden; Spielprüfung, Firefox/Safari und Geräte offen.

**Nachweise:** [tests/unit/editor/editor-creative.test.mjs](../tests/unit/editor/editor-creative.test.mjs) — Symmetrie, Kurven, Natur, Maske, Farben, Bild mit Handzählung.; [tests/e2e/workshop-creative.e2e.mjs](../tests/e2e/workshop-creative.e2e.mjs) — Chromium 1400/390 px: Symmetrie, Kurve, Abtragen, Naturalisieren, Farbverlauf, Oberfläche, PNG → Wollbild.; [docs/architecture/planer/CREATIVE_TOOLS.md](architecture/planer/CREATIVE_TOOLS.md) — Vertrag und Grenzen EDIT-04.; [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/edit/EditGuidesTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/edit/EditGuidesTest.java) — Java-Port gegen fixtures/edit/mod-edit-vectors.json: 7 Kurven, 6 Symmetrien, Zustände von Tür, Treppe, Truhe, Schiene, Stamm, Schild identisch zum Planer.

**Dateiumfang:** `packages/domain/src/editor/symmetry.ts`, `packages/domain/src/editor/curves.ts`, `packages/domain/src/editor/sculpt.ts`, `packages/domain/src/editor/colorMatch.ts`, `apps/web/src/editor/`, `tests/unit/editor/editor-creative.test.mjs`, `tests/e2e/workshop-creative.e2e.mjs`, `docs/architecture/planer/CREATIVE_TOOLS.md`, `docs/project/PLANER_VERGLEICH.md`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/edit/`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/GuideClient.java`, `scripts/fixtures/make_edit_vectors.mjs`, `fixtures/edit/mod-edit-vectors.json`, `tests/unit/editor/mod-edit-vectors.test.mjs`. **Abhängigkeiten:** EDIT-03. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### EDIT-05

**Auswahl- und Formwerkzeuge aus Editor-Mods: Zauberauswahl, Auswahl wachsen/schrumpfen/einpassen, Stapeln, Extrudieren, Ellipsoid/Torus/Spirale, Entities ziehen mit** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Vorschläge aus der Planer-Analyse umsetzen“ · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] EDIT-05-S01: Zauberauswahl (zusammenhängend: gleicher Zustand, gleicher Block, Blockfamilie, alles Feste; Ebene oder 3D) als Zellauswahl; wachsen, schrumpfen, an Inhalt anpassen.
- [x] EDIT-05-S02: Auswahloperationen auf Zellauswahlen: füllen/Muster, leeren, kopieren, verschieben, drehen, spiegeln, ersetzen.
- [x] EDIT-05-S03: Stapeln (Wiederholen in eine Richtung mit Abstand) und Extrudieren/Einschieben der Sichtfläche einer Richtung.
- [x] EDIT-05-S04: Neue Formen: Ellipsoid im aufgezogenen Quader, Torus (liegend/stehend), Spirale/Wendel.
- [x] EDIT-05-S05: Gemälde, Rahmen und Rüstungsständer ziehen beim Verschieben, Drehen, Spiegeln, Stapeln und Ausschneiden der Auswahl mit.
- [x] EDIT-05-S06: Werkstatt-Oberfläche, Tastenkürzel, Unit- und Browserprüfung (auch 390 px), Doku.
- [ ] EDIT-05-S07: Abnahme durch Philipp und Spielprüfung gestapelter/gedrehter Bauteile.

**Abnahme:** Jede Operation ist ein Rückgängig-Schritt und deterministisch. Keine zweite Koordinaten- oder Drehregel: Drehen/Spiegeln über transformBlockState und transformEntity. Zellauswahlen begrenzen jede Operation exakt auf ihre Zellen; Nachbarn bleiben unverändert. Grenzen MAX_EDIT_CELLS gelten auch für Zauberauswahl und Stapeln.

**Nächste Aktion:** EDIT-05-S07: Abnahme durch Philipp in der Werkstatt (Zauberstab, Stapeln, Extrudieren, Wendel) und Spielprüfung gestapelter/gedrehter Bauteile mit Ausstattung.

**Nur Philipp:** Im Planer abnehmen: Zauberstab, Stapeln, Extrudieren und Wendel in der Werkstatt abnehmen (S07). Im Spiel an deinem PC: Gestapelte und gedrehte Bauteile mit Ausstattung im Spiel.

**Prüfstand:** Unit- und Chromium-Prüfung bestanden; Abnahme durch Philipp, Spielprüfung, Firefox/Safari und Geräte offen.

**Nachweise:** [tests/unit/editor/editor-region.test.mjs](../tests/unit/editor/editor-region.test.mjs) — Zauberauswahl, Zellauswahl-Operationen, Ausstattung zieht mit, Stapeln, Extrudieren, Ellipsoid/Torus/Wendel.; [tests/e2e/workshop-region.e2e.mjs](../tests/e2e/workshop-region.e2e.mjs) — Chromium 1400/390 px: Zauberstab mit Shift/Alt, Stapeln, Extrudieren, Leeren der Zellauswahl, Verschieben, Ellipsoid, Torus, Wendel.; [docs/architecture/planer/CREATIVE_TOOLS.md](architecture/planer/CREATIVE_TOOLS.md) — Vertrag EDIT-05.

**Dateiumfang:** `packages/domain/src/editor/region.ts`, `packages/domain/src/editor/forms.ts`, `packages/domain/src/editor/tools.ts`, `apps/web/src/editor/`, `tests/unit/editor/editor-region.test.mjs`, `tests/e2e/workshop-region.e2e.mjs`, `docs/architecture/planer/CREATIVE_TOOLS.md`, `docs/project/PLANER_VERGLEICH.md`, `packages/domain/src/editor/stencils.ts`, `packages/domain/src/editor/symmetry.ts`, `packages/domain/src/editor/index.ts`, `docs/architecture/planer/BLOCK_EDITOR.md`, `docs/architecture/formate/ENTITIES.md`. **Abhängigkeiten:** EDIT-04, ENTITY-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### UPDATE-01

**Kontrollierte Versionsupdates mit lokalen Overrides** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Updates und neue Versionen anzeigen“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] UPDATE-01-S01: Updateplan mit Geometrie/Material/Anschluss-/Aufgabendiff erstellen.
- [x] UPDATE-01-S02: Bewusst übernehmen, einfrieren und zurückkehren ermöglichen.

**Abnahme:** Keine automatischen Updates fester Instanzreferenzen; Teamserver ist keine Voraussetzung.

**Nächste Aktion:** Echtgeräteabnahme (QA-02); Teamreihenfolge der Updateoperationen in TEAM-02.

**Nur Philipp:** Auf echten Geräten und Browsern: Versionsupdates auf echten Geräten (QA-02).

**Prüfstand:** Node- und lokale Chromium-Browsertests; keine Echtgeräteabnahme.

**Nachweise:** [tests/unit/core/updates.test.mjs](../tests/unit/core/updates.test.mjs) — Updatequellen ohne fremde lokale Änderungen, Patch-Übertragung mit Doppeländerung je Regel, pivotbezogen, Folgenplan (Geometrie/Material/Anschlüsse/Schritte), ein Rückgängig-Schritt, Rückkehr, Einfrieren, Validierung, Katalogzustellung als neue Version ohne Projektumstellung, neueste Version ohne lokale Änderungen.; [tests/e2e/updates.e2e.mjs](../tests/e2e/updates.e2e.mjs) — Chromium 1400/390 px: neue Version in der Werkstatt, Hinweise in Projektzentrale und Projektkopf, Folgen mit Vergleich, Übernehmen, Rückgängig, Zurückkehren, Einfrieren mit Notiz, Neuladen, Mehrfachauswahl.; [docs/architecture/kern/UPDATES.md](architecture/kern/UPDATES.md) — Vertrag, Datenmodell, Katalogzustellung und Grenzen.

**Dateiumfang:** `packages/domain/src/core/project.ts`, `packages/application/`. **Abhängigkeiten:** DIFF-01, STORE-02. **Alte IDs:** P5-03.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LIB-02

**Eigene Sammlungen, Ordner und Kategorien** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread Sammlungen und Vorlagen) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LIB-02-S01: B17-Dateizuständigkeit prüfen; Datenmodell und Sicherung erweitern.
- [x] LIB-02-S02: Sammlungen/Kategorien mit Migration und leerem Zustand nutzbar machen.

**Abnahme:** Katalog und eigene Inhalte bleiben dieselbe Bibliothek; referenzierte Versionen erhalten.

**Nächste Aktion:** Abnahme auf echten Geräten (QA-02); Rückmeldung zur Bedienung der Sammlungen einholen.

**Nur Philipp:** Im Planer abnehmen: Rückmeldung zur Bedienung der Sammlungen.

**Prüfstand:** Node- und lokale Chromium-Browsertests; keine Echtgeräte-/Safari-Abnahme.

**Nachweise:** [tests/unit/catalog/collections.test.mjs](../tests/unit/catalog/collections.test.mjs) — Domäne, Ordner/Kategorien, Verweisauflösung, Speicher-CAS, Sicherung Format 2 und Wiederherstellung.; [tests/e2e/collections.e2e.mjs](../tests/e2e/collections.e2e.mjs) — Chromium 1400/390 px: Ordner, Unterordner, Gebäude aufnehmen, Version festhalten, Notiz, Katalogfilter, Neuladen, Löschen.; [docs/architecture/bibliothek/COLLECTIONS.md](architecture/bibliothek/COLLECTIONS.md) — Datenmodell, Speicher, Sicherung und Grenzen.

**Dateiumfang:** `packages/domain/`, `apps/web/src/views/library/`. **Abhängigkeiten:** STORE-02, LIB-01. **Alte IDs:** LIB-02, B17.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LIB-03

**Eigene Ensembles und Generatorvorlagen speichern** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread Sammlungen und Vorlagen) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LIB-03-S01: Vorlagen referenzieren feste Versionen bzw. versionierte Generatorparameter.
- [x] LIB-03-S02: Speichern, Bearbeiten, Wiederherstellen und Projektübernahme umsetzen.

**Abnahme:** Vorlagenänderung überschreibt keine bereits übernommenen Projekte.

**Nächste Aktion:** Abnahme auf echten Geräten (QA-02); Vorlagen für Anlagen (Compounds) und BUILD-05 prüfen.

**Nur Philipp:** Im Planer abnehmen: Eigene Ensembles und Generatorvorlagen ausprobieren.

**Prüfstand:** Node- und lokale Chromium-Browsertests; keine Echtgeräte-/Safari-Abnahme.

**Nachweise:** [tests/unit/catalog/collections.test.mjs](../tests/unit/catalog/collections.test.mjs) — Feste Versionen, Verlauf/Wiederherstellen, Projektübernahme als Kopie, Generatorvorlagen.; [tests/e2e/collections.e2e.mjs](../tests/e2e/collections.e2e.mjs) — Ensemble als Vorlage, Bearbeiten, Wiederherstellen, Projekt bleibt unverändert, Generatorvorlage, Sicherung/Wiederherstellung in frischem Profil.; [tests/e2e/asset-concurrency.e2e.mjs](../tests/e2e/asset-concurrency.e2e.mjs) — IndexedDB-Migration v2→v3 und Revisionsprüfung über zwei Verbindungen.

**Dateiumfang:** `packages/domain/src/catalog/ensembles.ts`, `packages/domain/src/generators/`. **Abhängigkeiten:** LIB-02, GEN-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### WORLD-02

**Weitere kuratierte Bauwelten** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Codex Teilagent ui_acceptance · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] WORLD-02-S01: Abdeckung für fernöstliche Gärten, Wüstenhandel und End prüfen.
- [x] WORLD-02-S02: Nur mit tatsächlichen Treffern und reproduzierbaren Links ergänzen.

**Abnahme:** Keine erfundenen Treffer oder Gebäude; eigene Assets werden konsistent berücksichtigt.

**Nächste Aktion:** Kuratierte Filter-/Treffernachweise bei Katalogänderungen fortführen; keine weitere Karte ohne tatsächliche Assets.

**Prüfstand:** Alle elf Karten geladen; Fernost (3), Wüstenhandel (6), Endposten (2) mit realen Vorschauen, identischen geordneten Treffern nach URL-Reload und 1400/390-px-Sichtprüfung abgenommen. Vier neue Chromiumfälle bestanden. Keine neuen Gebäude oder Spielkompatibilität behauptet.

**Nachweise:** [tests/unit/catalog/build-themes.test.mjs](../tests/unit/catalog/build-themes.test.mjs) — Prüft elf Welten, reale Facetten, Treffer/Vorschauen der drei neuen Welten, reproduzierbare Links und dass keine Welt eine Stilrichtung ohne Bauteile nennt.; [docs/architecture/bibliothek/BUILD_THEMES.md](architecture/bibliothek/BUILD_THEMES.md) — Abdeckungstabelle der tatsächlichen Treffer je neuer Bauwelt.; [tests/e2e/ui-acceptance.e2e.mjs](../tests/e2e/ui-acceptance.e2e.mjs) — Vier echte Chromiumfälle, Themenmatrix, Mengenerhalt und drei neue kanonische Filterlinks.; [docs/architecture/planer/UI_ACCEPTANCE.md](architecture/planer/UI_ACCEPTANCE.md) — 48 visuell geprüfte Aufnahmen; Desktop und Touchsimulation von echten Geräten getrennt.

**Dateiumfang:** `packages/domain/src/catalog/buildThemes.ts`, `tests/unit/catalog/build-themes.test.mjs`, `docs/architecture/bibliothek/BUILD_THEMES.md`. **Abhängigkeiten:** LIB-01, UI-01. **Alte IDs:** WORLD-02.

**Integration:** Main [c3e6478](https://github.com/Freadeax/Minecraft-Bauplaner/commit/c3e647855dc3b1bc5417a64cc6350b375b9b510d); Pages-Quelle [c3e6478](https://github.com/Freadeax/Minecraft-Bauplaner/commit/c3e647855dc3b1bc5417a64cc6350b375b9b510d).

### BUILD-05

**Bauwelt-Anlagen mit Konfliktvorschau** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Claude Thread Bauwelt-Anlagen · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] BUILD-05-S01: Feste AssetVersionen, Abstände und Anschlüsse kuratieren.
- [x] BUILD-05-S02: Konfliktvorschau und ausdrückliche Projektübernahme anbieten.
- [x] BUILD-05-S03: Anlage je Bauwelt mit Bereichen, Hauptweg und Bauabschnitten für die Baustelle übernehmen.

**Abnahme:** Themenklick platziert nichts automatisch; tatsächliche Voxelkonflikte geprüft.

**Nächste Aktion:** Gelände-/Hanglagen und Türausrichtung zum Weg als eigene Folgeaufgabe; Echtgeräteabnahme mit QA-02.

**Prüfstand:** 12/12 Kerntests und 2/2 Chromiumfälle bestanden; Gelände, Hanglagen und Echtgeräte nicht geprüft.

**Nachweise:** [tests/unit/catalog/anlagen.test.mjs](../tests/unit/catalog/anlagen.test.mjs) — 12 Fälle gegen den echten Katalog: 11 Anlagen konflikt- und befundfrei, feste Versionen, Tausch, Blocker, echte Voxelkonflikte mit Bestätigungspflicht, Übernahme mit Bauabschnitten, Einfügen mit Rückgängig.; [tests/e2e/anlagen.e2e.mjs](../tests/e2e/anlagen.e2e.mjs) — Chromium: Bauwelt-Link, Vorschau speichert nichts, Konflikt sperrt Übernahme, Anlegen und Einfügen, 390 px.; [docs/architecture/bibliothek/ANLAGEN.md](architecture/bibliothek/ANLAGEN.md) — Datenmodell, Layout, Konfliktvorschau, Übernahme und Grenzen.

**Dateiumfang:** `packages/domain/src/base/anlagen.ts`, `packages/domain/src/catalog/ensembles.ts`, `apps/web/src/views/library/`, `tests/unit/catalog/anlagen.test.mjs`, `tests/e2e/anlagen.e2e.mjs`, `docs/architecture/bibliothek/ANLAGEN.md`. **Abhängigkeiten:** LIB-03, CORE-03. **Alte IDs:** BUILD-05.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### TERRAIN-01

**Geländeaufnahmen für Weltkarte und Anlagen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread Gelände in Anlagen und Weltkarte) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] TERRAIN-01-S01: Geländeaufnahme (Höhenkarte) aus Regionsdateien lesen, als Original speichern, sichern und prüfen; Bauplatz aus dem Weltimport.
- [x] TERRAIN-01-S02: Gelände in der Weltkarte (Draufsicht, 3D, Höhe unter dem Zeiger) mit Erdarbeiten-Schätzung und Höhenvorschlag.
- [x] TERRAIN-01-S03: Anlagen auf Gelände: Terrassen oder eine Ebene, Unterbau/Abtrag je Einheit, flachster Platz.
- [x] TERRAIN-01-S04: Türen der Einzelgebäude automatisch zum Hauptweg drehen.
- [ ] TERRAIN-01-S05: Abnahme mit Philipps eigener 26.3-Welt und echten Geräten.

**Abnahme:** Unbekannte Spalten werden nie als eben gewertet; Anlagen setzen sich nur mit ausdrücklicher Übernahme; Wegmodule bleiben verbunden; alle Katalogeingänge zeigen zum Weg.

**Nächste Aktion:** Abnahme mit eigener Welt (S05); danach Weg mit Stufen/Kurven und Stützmauern als Blöcke als eigene Folgeaufgabe.

**Nur Philipp:** Dateien oder Welt liefern: Kopie deiner 26.3-Welt für die Geländeabnahme (S05).

**Prüfstand:** Kern- und Chromiumtests bestanden; Abnahme mit eigener Welt und echten Geräten offen.

**Nachweise:** [tests/unit/world/terrain-survey.test.mjs](../tests/unit/world/terrain-survey.test.mjs) — 9 Fälle: echte Regionsdatei mit Hang/Teich/Baum/Gras gegen Handwerte und dichte Probe, Dateiformat, terrain.set mit Rückgängig/Sicherung/Datencheck, Erdarbeiten, 3D-Zellen, Eingangsregel, Katalogtüren, Terrassen/Ebene, Platzsuche.; [tests/e2e/terrain.e2e.mjs](../tests/e2e/terrain.e2e.mjs) — Chromium 1400/390 px: Bauplatz aus Regionsdatei, Weltkarte mit Gelände, Anlage auf dem Hang, Einfügen, Schätzung, Reiter Gelände.; [docs/architecture/welt/TERRAIN.md](architecture/welt/TERRAIN.md) — Datenmodell, Weltkarte, Anlagen auf Gelände, Türregel, Grenzen.

**Dateiumfang:** `packages/domain/src/world/terrainSurvey.ts`, `packages/domain/src/base/anlagenTerrain.ts`, `packages/domain/src/base/entrance.ts`, `packages/formats/src/worldExcerpt.ts`, `apps/web/src/views/world/surveys.ts`, `apps/web/src/views/project/TerrainSurveyPanel.tsx`, `apps/web/src/views/map/terrainLayer.ts`, `scripts/fixtures/make_terrain_fixture.py`, `tests/unit/world/terrain-survey.test.mjs`, `tests/e2e/terrain.e2e.mjs`, `docs/architecture/welt/TERRAIN.md`. **Abhängigkeiten:** WORLD-IMPORT-01, BUILD-05, MAP-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### TERRAIN-02

**Landschaft gestalten: Gelände formen, bemalen, Wasser und Wege** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread Gelände modellieren und bemalen) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] TERRAIN-02-S01: Geländegestaltung als Original (BPTDES01) mit terrainDesign.set, Sicherung samt Grund-Aufnahme und Datencheck.
- [x] TERRAIN-02-S02: Höhenpinsel (Anheben, Absenken, Glätten, Einebnen, Aufrauen, Terrassen, Hänge abflachen), Bemalen mit Biom-Stilen und Filtern, automatisches Bemalen.
- [x] TERRAIN-02-S03: Wasser füllen/entfernen, Wege mit Steigungsgrenze und Damm, Bauplätze einebnen.
- [x] TERRAIN-02-S04: Übergabe: geplantes Gelände in Weltkarte und Anlagen, Gelände als Bauteil im Projekt ohne Konflikt mit Bauten.
- [ ] TERRAIN-02-S05: Abnahme in Philipps eigener 26.3-Welt und auf Touch-Geräten.
- [x] TERRAIN-02-S06: Streu-Ebene: Natur-Bauteile (eingebaute Bäume, Büsche, Felsen, Pflanzen und eigene Schablonen aus der Werkstatt) nach Oberflächenstil, Hang, Höhe, Ufer und Dichte deterministisch verteilen, von Hand setzen/entfernen, im Geländebauteil für Material, Bauen, Export und Mod.
- [x] TERRAIN-02-S07: Wegstufen als Treppen/Stufen an den Höhenwechseln eines Wegs (umgesetzt in TERRAIN-03).

**Abnahme:** Unbekannte Spalten werden nie verändert; Werkzeuge sind deterministisch; in der Welt ändert sich nichts ohne Bau; Geländebauteil gerät nicht in Konflikt mit geplanten Bauten; Weltkarte und Anlagen zeigen dasselbe geplante Gelände. Streu-Ebene: gleiche Regeln und gleiches Gelände ergeben dieselben Teile; Teile stehen nie im Wasser, auf Wegen, in Bauten, im Bestand oder ineinander; sie folgen dem geplanten Boden und sind Teil des Geländebauteils.

**Nächste Aktion:** Abnahme mit eigener Welt (S05); Wegstufen und Brücken siehe TERRAIN-03.

**Nur Philipp:** Dateien oder Welt liefern: Abnahme in deiner eigenen Welt und auf Touch-Geräten (S05).

**Prüfstand:** Kern- und Chromiumtests bestanden; Abnahme mit eigener Welt und echten Geräten offen.

**Nachweise:** [tests/unit/world/terrain-design.test.mjs](../tests/unit/world/terrain-design.test.mjs) — 10 Fälle: Pinsel mit Handwerten, Stile/Filter, Wasser, Wege, Automatik, Einebnen, Blöcke, geplantes Gelände, Datei, Operation, Sicherung, Datencheck.; [tests/e2e/landscape.e2e.mjs](../tests/e2e/landscape.e2e.mjs) — Chromium 1400/390 px: formen, bemalen, Wasser, Weg, speichern, Weltkarte, Anlagen, Bauteil im Projekt.; [docs/architecture/welt/LANDSCAPE.md](architecture/welt/LANDSCAPE.md) — Datenmodell, Werkzeuge, Übergabe, Grenzen.; [tests/unit/world/terrain-scatter.test.mjs](../tests/unit/world/terrain-scatter.test.mjs) — 8 Fälle: Bauteile (Zustände 26.3, dauerhaftes Laub), Determinismus/Dichte/Abstand, Regeln (Stil, Hang, Höhe, Ufer, Wasser, Weg, Bauten, Bestand), Handsetzen/Entfernen, Teile folgen dem Gelände, Blöcke im Geländebauteil, Datei, Schablonen gedreht, Kaktus.; [tests/e2e/landscape-scatter.e2e.mjs](../tests/e2e/landscape-scatter.e2e.mjs) — Chromium 1400/390 px: Mischung streuen, Ebene ändern, von Hand setzen/entfernen, Rückgängig, 3D, Speichern/Neuladen, Bauteil mit Laub und Stämmen in der Materialliste.

**Dateiumfang:** `packages/domain/src/world/terrainDesign.ts`, `apps/web/src/views/world/designs.ts`, `apps/web/src/views/project/LandscapeTab.tsx`, `apps/web/src/views/project/landscape/`, `tests/unit/world/terrain-design.test.mjs`, `tests/e2e/landscape.e2e.mjs`, `docs/architecture/welt/LANDSCAPE.md`, `packages/domain/src/world/terrainScatter.ts`, `packages/domain/src/world/terrainScatterPlan.ts`, `tests/unit/world/terrain-scatter.test.mjs`, `tests/e2e/landscape-scatter.e2e.mjs`. **Abhängigkeiten:** TERRAIN-01, BUILD-05, MAP-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### TERRAIN-03

**Gelände und Wege im Projekt: Aufschütten, Abtragen, Rampe, Wegstufen als Treppen, Brücken mit Geländer, Weg aus der Weltkarte** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gelände, Wege und Küste ausbauen“) · Zuständiger Thread: „Gelände, Wege und Küste ausbauen“ · Aktualisiert: 2026-11-06T09:18:45.680Z

- [x] TERRAIN-03-S01: Geländewerkzeuge: Aufschütten (nur Mulden bis zur Zielhöhe), Abtragen (nur über der Zielhöhe), Rampe mit gleichmäßiger Steigung, Breite und weichem Übergang.
- [x] TERRAIN-03-S02: Wegstufen: Treppen (bergauf, über die ganze Breite) oder Halbstufen an jedem Höhenwechsel um einen Block, neun Materialfamilien, keine Treppen ins Leere nach späteren Änderungen; Dateiformat BPTDES01 mit optionalem Stufenfeld.
- [x] TERRAIN-03-S03: Brücken: Belag einen Block über dem Wasser, Wasser und Grund bleiben, Absatz am Ufer mit Treppen, Geländer (Zaun/Mauer) mit Verbindungen; Brücke als Oberfläche im geplanten Gelände.
- [x] TERRAIN-03-S04: Weg aus der Weltkarte (Weltplan-Wege) in die Landschaft übernehmen; Wegart bestimmt Belag und Brücke.
- [x] TERRAIN-03-S05: Unit- und Browserprüfung (1400/390 px), Doku LANDSCAPE.md, Testfall PROJ-19.
- [x] TERRAIN-03-S06: Basisplaner auf Gelände: Küstenlinie aus der Geländeaufnahme (baseShore.ts: Wasserseite je Seite aus Reihen mit offenem Wasser, echtes Ufer gegen geplante Uferlinie, Gebäude im Wasser/Stege an Land), Kasten „Küste“ mit „Wasserseite übernehmen“ und „Ans echte Ufer schieben“; Abnahme BIB-19.
- [ ] TERRAIN-03-S07: Abnahme im Spiel (PROJ-19): Treppen, Brücke und Geländer als .litematic in Philipps Welt.
- [x] TERRAIN-03-S08: Wegenetz der Basis als Landschaftsweg: ganze Wegnetze (layPathCells) folgen dem Gelände mit höchstens einem Block zwischen allen Nachbarfeldern, Treppen/Halbstufen nur in Laufrichtung, Brücke mit Geländer oder Damm; Bauplätze eingeebnet, Kaimauern, Laternen auf dem Gelände; echte Küstenlinie im Lageplan; Abnahme BIB-20.

**Abnahme:** Treppen nur an Höhenwechseln um genau einen Block, immer bergauf gerichtet und mit gültigen Zuständen 26.3; nach späteren Pinselstrichen keine Treppen ins Leere. Brücken lassen Wasser und Grund unverändert, liegen einen Block über dem Wasser und haben verbundene Geländer an offenen Seiten. Aufschütten hebt nie an, was über der Zielhöhe liegt; Abtragen senkt nie, was darunter liegt; unbekannte Spalten bleiben unverändert. Dateien ohne Wegstufen bleiben byte-identisch und ältere Gestaltungen laden unverändert.

**Nächste Aktion:** Abnahme PROJ-19, BIB-19 und BIB-20 im Spiel (Treppen, Brücken, Wegenetz der Basis auf echtem Gelände).

**Nur Philipp:** Im Spiel an deinem PC: PROJ-19: Weg mit Treppen und Brücke als .litematic in deiner Welt ansehen. Im Spiel an deinem PC: BIB-20: Basis mit Wegenetz als Landschaftsweg auf einem echten Hang einfügen und im Spiel ansehen.

**Prüfstand:** Kern- und Chromiumtests bestanden; Abnahme im Spiel offen.

**Nachweise:** [tests/unit/world/terrain-paths.test.mjs](../tests/unit/world/terrain-paths.test.mjs) — 8 Fälle: Aufschütten/Abtragen, Rampe, Treppen beidseitig, Halbstufen, Stufen nach Änderungen, Brücke, Brücke mit hohem Ufer, Datei, Materialien.; [tests/e2e/landscape-paths.e2e.mjs](../tests/e2e/landscape-paths.e2e.mjs) — Chromium 1400/390 px: Aufschütten, Graben, Rampe, Weg mit Treppen, Wasser, Brücke, 3D, Speichern/Neuladen, Bauteil mit Treppen und Zäunen im Material.; [docs/architecture/welt/LANDSCAPE.md](architecture/welt/LANDSCAPE.md) — Abschnitt „Wegstufen und Brücken (TERRAIN-03)“, Werkzeuge, Dateiformat, Grenzen.; [tests/unit/catalog/base-shore.test.mjs](../tests/unit/catalog/base-shore.test.mjs) — Küste aus der Geländeaufnahme: alle vier Seiten, Verschiebung, Binnenland, Bach, Bucht, Halbinsel, Aufnahmerand.; [tests/e2e/base-shore.e2e.mjs](../tests/e2e/base-shore.e2e.mjs) — Chromium 1400/390 px: Sicherung mit Küstenaufnahme, Wasserseite übernehmen, ans Ufer schieben, Übernahme an verschobener Stelle.; [tests/unit/world/terrain-network.test.mjs](../tests/unit/world/terrain-network.test.mjs) — 4 Fälle: Netz am Hang mit Abzweig (≤ 1 Block, Treppen nur in Laufrichtung, gültige Zustände), Grat mit Abzweig (Halbstufen), Brücke/Damm, unbekannte Felder und Kaimauer.; [tests/unit/catalog/plan-landscape.test.mjs](../tests/unit/catalog/plan-landscape.test.mjs) — Basis am Hang als Landschaftsweg mit Einebnen und Laternen-Bauteil ohne Konflikt; Großprojekt am Bach (Brücke, Aufschüttung, Kaimauer); echte Küstenlinie; eigenes Großprojekt aus Sammlung.; [tests/e2e/plan-landscape.e2e.mjs](../tests/e2e/plan-landscape.e2e.mjs) — Chromium 1400/390 px: Hang mit Bach aus Sicherung, Basis als Landschaftsweg einfügen, Großprojekt am flachsten Platz mit Landschaftsstraßen, eigenes Großprojekt aus Sammlung.

**Dateiumfang:** `packages/domain/src/world/terrainDesign.ts`, `packages/domain/src/index.ts`, `apps/web/src/views/project/LandscapeTab.tsx`, `apps/web/src/views/project/landscape/DesignCanvas.tsx`, `apps/web/src/testing/testplan.ts`, `docs/architecture/welt/LANDSCAPE.md`, `docs/testing/TESTPLAN.md`, `tests/unit/world/terrain-paths.test.mjs`, `tests/e2e/landscape-paths.e2e.mjs`, `packages/domain/src/base/planLandscape.ts`, `packages/domain/src/base/baseShore.ts`, `apps/web/src/views/library/planTerrain.tsx`, `apps/web/src/views/library/BasePage.tsx`, `tests/unit/world/terrain-network.test.mjs`, `tests/unit/catalog/plan-landscape.test.mjs`, `tests/e2e/plan-landscape.e2e.mjs`. **Abhängigkeiten:** TERRAIN-02, TERRAIN-01, MAP-04, BASE-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### TERRAIN-04

**Gelände direkt aus der Mod: Geländegedächtnis, Übernahme ohne Dateien, blockgenaue Prüfung aus dem Spiel** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gelände direkt aus der Mod übernehmen“) · Zuständiger Thread: „Gelände direkt aus der Mod übernehmen“ · Aktualisiert: 2026-11-06T13:09:28.727Z

- [x] TERRAIN-04-S01: Mod 0.20.0: Geländegedächtnis (gesehene Chunks mit Biom, je Welt/Server auf dem PC gespeichert), GET /v1/terrain, /v1/terrain/known, /bauplaner gelaende an|aus|vergessen.
- [x] TERRAIN-04-S02: Mod 0.20.0: GET /v1/box liest einen Weltbereich blockgenau aus den geladenen Chunks (bis 2 Mio. Zellen, in Scheiben je Tick).
- [x] TERRAIN-04-S03: Reiter Gelände: Spiel verbinden, Abdeckung des Bauplatzes, Geländeaufnahme aus dem Spiel (Quelle mod, Biome im Kopf der Datei), blockgenaue Prüfung aus dem Spiel; Regionsdateien nur noch als eingeklappter Notfall.
- [x] TERRAIN-04-S04: Reiter Landschaft: Gelände aus dem Spiel holen und gestalten, nach Biomen bemalen; ältere Mods liefern geladene Chunks über /v1/chunks.
- [ ] TERRAIN-04-S05: Abnahme durch Philipp im Spiel (Testfälle PROJ-24, PROJ-25).

**Abnahme:** Ohne Datei-Upload: Geländeaufnahme und blockgenaue Prüfung kommen über die Live-Verbindung; dieselbe Einstufung wie bei Regionsdateien (classifyRuns/checkTerrain). Nichts geht an den Server; das Gedächtnis liegt nur auf dem PC des Spielers. Alte Aufnahmen und alte Mods bleiben lesbar bzw. nutzbar.

**Nächste Aktion:** Abnahme durch Philipp im Spiel (S05).

**Nur Philipp:** Im Spiel an deinem PC: Mod 0.20.0 installieren, einmal um den Bauplatz laufen, im Reiter „Gelände“ „Gelände aus dem Spiel übernehmen“ und „Gelände aus dem Spiel prüfen“ (S05).

**Prüfstand:** Kern-, Browser- und Spieltests bestanden; Abnahme durch Philipp offen.

**Nachweise:** [tests/unit/world/live-terrain.test.mjs](../tests/unit/world/live-terrain.test.mjs) — Leser, Abdeckung, Aufnahme mit Biomen und Dateikopf, Box als Prüfraster, Biom-Stile.; [tests/e2e/terrain-game.e2e.mjs](../tests/e2e/terrain-game.e2e.mjs) — Chromium 1400/390 px gegen den Mod-Simulator: verbinden, Abdeckung, Übernahme, Prüfung aus dem Spiel, Landschaft nach Biomen, alte Mod.; [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/TerrainMemoryTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/TerrainMemoryTest.java) — Antwort live/Gedächtnis, Datei speichern/laden, Grenze, Box, Routen.

**Dateiumfang:** `packages/domain/src/world/liveTerrain.ts`, `packages/domain/src/world/terrainSurvey.ts`, `packages/domain/src/team/liveLink.ts`, `packages/domain/src/index.ts`, `apps/web/src/views/world/gameTerrain.ts`, `apps/web/src/views/world/GameLinkBar.tsx`, `apps/web/src/views/world/world.css`, `apps/web/src/views/project/TerrainSurveyPanel.tsx`, `apps/web/src/views/project/TerrainTab.tsx`, `apps/web/src/views/project/LandscapeTab.tsx`, `apps/web/src/views/map/liveClient.ts`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/TerrainMemory.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/BoxRead.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/TerrainMemoryTest.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TerrainRecorder.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`, `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`, `scripts/mod/bridge_gametest.mjs`, `mods/bauplaner-bridge/VERSION`, `mods/bauplaner-bridge/CHANGELOG.md`, `tests/unit/world/live-terrain.test.mjs`, `tests/e2e/terrain-game.e2e.mjs`, `tests/e2e/modSimulator.mjs`, `docs/architecture/welt/TERRAIN.md`, `docs/architecture/team/LIVE_LINK.md`, `apps/web/src/testing/testplan.ts`, `docs/testing/TESTPLAN.md`, `tests/e2e/map-depth.e2e.mjs`. **Abhängigkeiten:** TERRAIN-01, TERRAIN-02, MAP-03, GAME-08. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### BUILD-06

**Bauführung im Spiel: Schichtführung, Tagesziele, Packlisten, Druck-/Handyansicht, Spielfortschritt** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Bauanleitung fürs Spiel vertiefen“ · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] BUILD-06-S01: Schichtführung: Reihen/Rechtecke je Schritt mit Koordinaten relativ zum Anker und in Weltkoordinaten; Anker aus Weltlage oder Spielaufnahme.
- [x] BUILD-06-S02: Shulker-Packliste je Bauabschnitt und Bautag in Reihenfolge des ersten Bedarfs.
- [x] BUILD-06-S03: Tagesziele: offene Schritte nach Block- und Kistenbudget in Bautage teilen, Tagesverlauf aus Haken.
- [x] BUILD-06-S04: Druckansicht (Bauzettel) und Handy-Baumodus.
- [x] BUILD-06-S05: Spielfortschritt: bestätigte Schritte je Bautag übernehmen, Nacharbeitsliste mit Koordinaten.

**Abnahme:** Keine zweite Geometrie-, Zähl- oder Itemlogik: alles aus buildGuide/materialsForParts; Haken bleiben manuell und nur auf ausdrücklichen Klick.

**Nächste Aktion:** Echtgeräte- und Druckerabnahme mit QA-02; Philipps Spieltest mit Mod-Aufnahme (WorldAnchor) auf seinem Server.

**Nur Philipp:** Auf deinem Server mit Mitspielern: Bauführung mit Mod-Aufnahme auf deinem Server; Druck- und Handyansicht.

**Prüfstand:** npm run check grün (476 bestanden, 1 übersprungen); BUILD-06-E2E bestanden; keine echten Geräte/Drucker, kein Client-Spieltest.

**Nachweise:** [tests/unit/building/build-run.test.mjs](../tests/unit/building/build-run.test.mjs) — 9 Fälle: Rechteckabdeckung, Anker, Packliste = Material-Tab, Bautage/Budget/Abschnitte/Lager, Haken je Tag, Textzettel, Nacharbeit.; [tests/e2e/build-run.e2e.mjs](../tests/e2e/build-run.e2e.mjs) — Chromium 1400/390 px: Anker aus Aufnahme, Weltkoordinaten, Bautage, Packliste, Nacharbeit, Tag abhaken, Druckmedienemulation, Textdownload, Baumodus.

**Dateiumfang:** `packages/domain/src/building/buildRun.ts`, `packages/domain/src/building/site.ts`, `apps/web/src/views/project/BuildTab.tsx`, `apps/web/src/styles/buildrun.css`, `tests/unit/building/build-run.test.mjs`, `tests/e2e/build-run.e2e.mjs`, `docs/architecture/planer/BUILD_RUN.md`, `apps/web/src/views/project/buildrun/`. **Abhängigkeiten:** BUILD-01, GAME-01, MAP-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GEN-02

**Weitere Generatoren und Dachdetails** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Neue Gebäudegeneratoren ergänzen“ · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GEN-02-S01: Treppenhaus, Kirche und Hafen als getrennte Generatoren spezifizieren.
- [x] GEN-02-S02: Dachtreppen-Eckformen und Anschlüsse profilgenau erzeugen.
- [x] GEN-02-S03: Treppenhaus-, Kirchen- und Hafengenerator mit Stilen, Vorlagen und Anschlüssen umsetzen.
- [x] GEN-02-S04: Weitere sinnvolle Generatoren (Torhaus, Windmühle, Brunnen) und neue Anlage Dorfplatz; Burganlage mit Torhaus.
- [x] GEN-02-S05: Unit-/Browserprüfung, Doku, main und Pages.

**Abnahme:** Ganzzahliges Raster, reproduzierbare Parameter, Mengen-/Exportprüfung je Generator.

**Nächste Aktion:** Generierte Bauten (v. a. Treppenhaus, Torhaus-Wehrgang, Hafen) im Spiel abnehmen; Treppenhaus-Anbau an Haus als Anlage erwägen.

**Nur Philipp:** Im Spiel an deinem PC: Treppenhaus, Torhaus-Wehrgang und Hafen im Spiel.

**Prüfstand:** Node- und Browserprüfung bestanden; Bauwerke nicht im Spiel abgenommen.

**Nachweise:** [tests/unit/catalog/generators.test.mjs](../tests/unit/catalog/generators.test.mjs) — 17 Fälle über alle elf Generatoren: Gültigkeit, B7-Zustände, Material/Rezepte, Anschlüsse, Begehbarkeit Treppenhaus, Eckformen nach Spielregel, Torhaus-Andocken in der Burganlage, festgehaltene Hashes.; [tests/e2e/generators.e2e.mjs](../tests/e2e/generators.e2e.mjs) — Browser 1400/390 px: 14 Karten, Kirchenvorlage mit Hinweis, Dorfplatz ohne Überschneidungen.; [docs/architecture/bibliothek/GENERATORS.md](architecture/bibliothek/GENERATORS.md) — Abschnitt GEN-02 mit Parametern, Eckformen-Regel, Versionserhöhung und Grenzen.

**Dateiumfang:** `packages/domain/src/generators/`, `apps/web/src/views/library/GeneratorsPage.tsx`, `tests/unit/catalog/generators.test.mjs`, `tests/e2e/generators.e2e.mjs`, `docs/architecture/bibliothek/GENERATORS.md`. **Abhängigkeiten:** GEN-01, PROFILE-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### MAP-01

**Weltlage und begehbare Projektkarte** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread Weltkarte) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MAP-01-S01: B15-Konzept und generischer Livekarten-/Markeradapter vorhanden.
- [x] MAP-01-S02: B15-Reservierung vor Übernahme abgleichen.
- [x] MAP-01-S03: Projektursprung/Dimension, Undo und Sicherung ergänzen.
- [x] MAP-01-S04: Draufsicht, Chunkraster, 3D-Ansicht und projektübergreifende Voxelkonflikte umsetzen.

**Abnahme:** Weltkoordinate = Projektkoordinate + Ursprung; fehlendes Terrain ausdrücklich ungeprüft.

**Nächste Aktion:** Geräteprüfung (GPU/Touch, QA-02) und Abgleich mit einer echten Live-Karte; danach MAP-02.

**Nur Philipp:** Auf echten Geräten und Browsern: Weltkarte auf echter GPU und mit Touch (QA-02).

**Prüfstand:** Node- und Browsertests bestanden; Geräte-/Spiel-/Kartenserverabnahme offen.

**Nachweise:** [tests/unit/world/livemap.test.mjs](../tests/unit/world/livemap.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/world/worldmap.test.mjs](../tests/unit/world/worldmap.test.mjs) — Kernvertrag Weltlage/Weltkarte, 8 Tests.; [tests/e2e/worldmap.e2e.mjs](../tests/e2e/worldmap.e2e.mjs) — Browserablauf 1400/390 px.; [docs/architecture/welt/WORLDMAP.md](architecture/welt/WORLDMAP.md) — Vertrag, Quellen der Linkformate und Grenzen.

**Dateiumfang:** `packages/domain/src/world/worldmap.ts`, `apps/web/src/views/map/`. **Abhängigkeiten:** CORE-03, STORE-02. **Alte IDs:** B15, B15-L.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### MAP-03

**Live-Karte mit Spielanbindung: Weltplan auf der Karte, Live-Position/Gelände/Fortschritt aus der Mod, Übergabe an die Mod** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Live-Karte mit Spielanbindung neu bauen“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MAP-03-S01: Ist-Stand prüfen und Schwächen dokumentieren; Mod-Seite sichtbar in der Hauptnavigation („Spiel“).
- [x] MAP-03-S02: Weltplan (Bauplätze, Wege, Punkte/Anker) mit Rückgängig, Speicher und Sicherung.
- [x] MAP-03-S03: Planungswerkzeuge auf der Draufsicht: Projekte ziehen, Bauplatz/Weg/Punkt zeichnen, Messen.
- [x] MAP-03-S04: Live-Verbindung zur Mod (127.0.0.1, Kopplung): Spielerposition, Gelände geladener Chunks, Hologramm-Fortschritt auf der Karte.
- [x] MAP-03-S05: Übergabe: Plan und Lage an die Mod senden, Weltplan-Markierungen im Spiel, Lage aus dem Spiel übernehmen.
- [ ] MAP-03-S06: Abnahme durch Philipp im echten Spiel (Browserfreigabe lokales Netzwerk, LMNT-Server).

**Abnahme:** Karte zeigt Spielerposition und Gelände live, wenn die Mod gekoppelt ist; ohne Mod bleibt alles nutzbar. Keine Weltänderung, nur Loopback mit Kopplungscode, fremde Ursprünge werden abgewiesen.

**Nächste Aktion:** Abnahme durch Philipp im echten Spiel (S06): Browserfreigabe „lokales Netzwerk“, Kopplung, Senden auf dem LMNT-Server.

**Nur Philipp:** Auf deinem Server mit Mitspielern: Kopplung und Senden auf dem LMNT-Server mit Browserfreigabe „lokales Netzwerk“ (S06).

**Prüfstand:** Automatisch und im echten Client geprüft; Abnahme durch Philipp offen (S06).

**Nachweise:** [tests/unit/world/worldplan.test.mjs](../tests/unit/world/worldplan.test.mjs) — Weltplan: Prüfung, Umkehrung, Wege, Sicherung.; [tests/unit/team/livelink.test.mjs](../tests/unit/team/livelink.test.mjs) — Live-Leser, Geländeeinstufung, Hologrammabgleich, Übergabe.; [tests/e2e/livelink.e2e.mjs](../tests/e2e/livelink.e2e.mjs) — Zeichnen, Rückgängig, Kopplung, Spieler, Gelände, Hologramm, Senden gegen tests/e2e/modSimulator.mjs; 1400/390 px.; [scripts/mod/test_bridge_ingame.sh](../scripts/mod/test_bridge_ingame.sh) — Echter 26.3-Client allein und mit Philipps Modpack: Website-Verbindung über 127.0.0.1 (live.json).; [docs/architecture/team/LIVE_LINK.md](architecture/team/LIVE_LINK.md) — Vertrag, Sicherheit, Protokoll 1, Grenzen.

**Dateiumfang:** `apps/web/src/views/map/`, `apps/web/src/views/mod/`, `apps/web/src/app/`, `packages/domain/src/`, `mods/bauplaner-bridge/`, `tests/`, `docs/`. **Abhängigkeiten:** MAP-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### MAP-04

**Weltbuilder vertiefen: Löschen und Entfernen für alle Objekte der Weltkarte, Mehrfachauswahl, Kontextmenü, gemeinsames Rückgängig, Duplizieren/Drehen/Spiegeln, Wegecken, Ebenen, Objektliste** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Weltbuilder mit Löschen vertiefen“) · Zuständiger Thread: „Gruppen und Sperren bis ins Hologramm bringen“ · Aktualisiert: 2026-11-06T10:23:30.536Z

- [x] MAP-04-S01: Löschen/Entfernen für alle Objekte: Entf-Taste, Auswahlleiste, Kontextmenü, Listenzeilen; Projekte nur von der Karte nehmen.
- [x] MAP-04-S02: Mehrfachauswahl (Umschalt/Strg-Klick, Rahmen, Strg+A) und gemeinsames Rückgängig für Weltplan und Projektlagen.
- [x] MAP-04-S03: Verschieben (Ziehen, Pfeiltasten), Duplizieren, Drehen, Spiegeln, ans Gelände ausrichten.
- [x] MAP-04-S04: Wege bearbeiten: Ecken ziehen, einfügen, löschen, Weg teilen, umkehren, verbinden.
- [x] MAP-04-S05: Ebenen (Projekte/Bauplätze/Wege/Punkte) und durchsuchbare Objektliste mit Zeigen und Löschen je Zeile.
- [x] MAP-04-S07: Benannte Gruppen und Sperren (Weltplan-Schema 3): Gruppe bilden, Gruppenklick, ein-/ausblenden, Sperren gegen Verschieben/Umformen/Löschen, Mod-Vertrag (groups, POST /v1/group).
- [ ] MAP-04-S06: Abnahme durch Philipp, Langdruck-Menü auf echtem Touch-Gerät.

**Abnahme:** Jedes Objekt der Weltkarte lässt sich ohne Umweg löschen bzw. von der Karte nehmen und mit einem Schritt wiederherstellen. Aktionen auf mehreren Objekten sind ein Rückgängig-Schritt; Projekte selbst werden auf der Karte nie gelöscht. Weltplan-Schema 3 ergänzt nur freiwillige Felder (Gruppe, Sperre); Pläne der Schemata 1 und 2 laden unverändert, ältere Mods bekommen nur, was sie verstehen.

**Nächste Aktion:** Abnahme durch Philipp (S06): Langdruck-Menü auf dem Touch-Gerät, Gruppen und Sperren auf dem iPad (Testfall KARTE-09).

**Nur Philipp:** Auf echten Geräten und Browsern: Langdruck-Menü auf echtem Touch-Gerät (S06).

**Prüfstand:** Einheits- und Browsertests grün (auch Gruppen/Sperren); Abnahme durch Philipp offen (S06).

**Nachweise:** [tests/unit/world/worldbuilder.test.mjs](../tests/unit/world/worldbuilder.test.mjs) — Löschen mit linearer Umkehrung, Einfügen, Auswahl, Drehen/Spiegeln im Raster, Duplizieren, Wegecken, Geländehöhe.; [tests/e2e/worldbuilder.e2e.mjs](../tests/e2e/worldbuilder.e2e.mjs) — Entf, Kontextmenü, Listenlöschen, Rahmen, Verschieben mit Pfeilen, Löschen samt Projekt und Rückgängig, Duplizieren, Drehen, Wegecken, Ebenen, Strg+A, Neuladen; Handy 390 px.; [docs/architecture/welt/WORLD_BUILDER.md](architecture/welt/WORLD_BUILDER.md) — Bedienung, Technik, Grenzen.; [tests/unit/world/worldgroups.test.mjs](../tests/unit/world/worldgroups.test.mjs) — Schema 3, Gruppen bilden/umbenennen/auflösen, Gruppenklick, Sperrregel mit exakter Umkehrung, Mod-Vertrag.; [tests/e2e/world-groups.e2e.mjs](../tests/e2e/world-groups.e2e.mjs) — Gruppe bilden, Gruppenklick, Sperren gegen Entf/Pfeile, Rückgängig, Ausblenden, Neuladen, Simulator mit groups.

**Dateiumfang:** `apps/web/src/views/map/`, `apps/web/src/styles/map.css`, `packages/domain/src/`, `tests/`, `docs/`, `docs/architecture/welt/WORLD_BUILDER.md`. **Abhängigkeiten:** MAP-03. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### MAP-02

**Gespeicherte Kartenziele und konkrete Provideradapter: mehrere Server-Karten speichern und teilen, echte Marker für BlueMap (marker-sets) und Dynmap (dmarker-Befehle), Markerdatei als Weltplan-Punkte** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Module und Systeme komplex ausarbeiten“) · Zuständiger Thread: „Module und Systeme komplex ausarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MAP-02-S01: URL-/Markerformate anhand Primärquellen pro Provider verifizieren (BlueMap-Wiki Markers, Dynmap-Wiki Using markers/Commands, squaremap/Pl3xMap README: nur API).
- [x] MAP-02-S02: Gespeicherte Ziele (bis 20, Kartenliste als Datei), UI-Dateiadapter und eigene Markerdateien (Import als Weltplan-Punkte, Export mit Punkten), BlueMap-marker-sets und Dynmap-Befehle aus Projekten, Bauplätzen, Wegen, Zonen und Punkten.
- [ ] MAP-02-S03: Abnahme KARTE-08 auf einem echten BlueMap-/Dynmap-Server.

**Abnahme:** Keine behauptete BlueMap-/Dynmap-/squaremap-/Pl3xMap-Kompatibilität ohne Formatnachweis.

**Nächste Aktion:** Abnahme KARTE-08 auf Philipps Server-Karte.

**Nur Philipp:** Im Spiel an deinem PC: BlueMap-Marker (.conf) bzw. Dynmap-Befehle auf eurer Server-Karte einspielen und prüfen, ob Projekte, Wege und Punkte an der richtigen Stelle erscheinen (KARTE-08).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme auf echtem Kartenserver offen (S03).

**Nachweise:** [tests/unit/world/livemap-export.test.mjs](../tests/unit/world/livemap-export.test.mjs) — 5 Fälle: gespeicherte Karten/Datei/Zusammenführen, Markerdatei → Punkte ohne Doppelte, Formen je Dimension, BlueMap-Format (extrude/shape/line/poi, Maskierung, Klammern), Dynmap-Befehle.; [tests/e2e/livemap-export.e2e.mjs](../tests/e2e/livemap-export.e2e.mjs) — Chromium 1400/390 px: zwei Karten speichern/wechseln, Kartenliste, Dynmap- und BlueMap-Download, Markerdatei laden, doppelt, Rückgängig, Neuladen.

**Dateiumfang:** `packages/domain/src/world/livemap.ts`, `packages/domain/src/world/liveMapExport.ts`, `apps/web/src/views/map/LiveMapPanel.tsx`, `apps/web/src/views/map/liveMapConfig.ts`, `apps/web/src/views/map/WorldMapView.tsx`, `tests/unit/world/livemap-export.test.mjs`, `tests/e2e/livemap-export.e2e.mjs`, `docs/architecture/welt/LIVEMAP.md`. **Abhängigkeiten:** MAP-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-01

**Spielaufnahmen und Soll/Ist-Vergleich** · ✅ Im beschriebenen Umfang geprüft · Priorität P1 · Verantwortlich: Bestand · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GAME-01-S01: Vergleich, Originalspeicherung, Verlauf, Ausrichtung und Backup vorhanden.

**Abnahme:** Nicht geladene Zellen sind unbekannt, manuelle Haken werden nur ausdrücklich geändert.

**Nächste Aktion:** Regressionen bei Änderungen weiterführen.

**Prüfstand:** Aufnahmecontroller bleibt beim Neuberechnen und Wechsel auf historische Grundlage erhalten. Tatsächliche Browserregressionen für Soll/Ist-Import, ausdrückliches Abhaken, Originalspeicherung, Ausrichtung, Reload und bytegleichen Download in 54/54-E2E bestanden; keine Mod-/Spielabnahme.

**Nachweise:** [tests/unit/building/game-check.test.mjs](../tests/unit/building/game-check.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/unit/core/scan-persistence.test.mjs](../tests/unit/core/scan-persistence.test.mjs) — Bestandsnachweis; konkrete Befehle und Grenzen in TESTING.md.; [tests/e2e/game-check.e2e.mjs](../tests/e2e/game-check.e2e.mjs) — Reale Aufnahme gegen eingefrorene Revision, Abweichungszelle und ausdrücklich bestätigte Schritte.; [tests/e2e/scan-persistence.e2e.mjs](../tests/e2e/scan-persistence.e2e.mjs) — Original und Ausrichtung über Speichern/Neuladen hinweg erhalten; Download bytes-identisch.

**Dateiumfang:** `packages/domain/src/building/gameCheck.ts`, `packages/application/src/scanPersistence.ts`. **Abhängigkeiten:** CORE-02, BUILD-01. **Alte IDs:** B8-M1, B8P.

**Integration:** Main [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933); Pages-Quelle [b5eb5b9](https://github.com/Freadeax/Minecraft-Bauplaner/commit/b5eb5b9bc039160e668a7183c0ccfcdcd764a933).

### GAME-02

**Fabric-Brücke kompilieren und im Spiel abnehmen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Fabric-Mod 26.3 bauen und testen“) · Zuständiger Thread: „Bauplaner-Mod von Grund auf neu entwickeln“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GAME-02-S01: Versionsneutraler Java-Kern mit Tests und Fabric-Quelladapter vorhanden.
- [x] GAME-02-S02: Loader-/Versionsstand anhand offizieller Quellen prüfen und Build ermöglichen.
- [x] GAME-02-S03: Plan aufnehmen und Soll/Ist-Vergleich mit echtem Spiel durchführen.
- [ ] GAME-02-S04: Mehrspieler-Abnahme durch den Nutzer auf server.lmnt-gaming.net mit eigenem Bau.
- [x] GAME-02-S05: Mod-Download auf der Website mit Auswahl von Minecraft-Version, Loader und Mod-Version (#/mod).

**Abnahme:** Lesende Aufnahme setzt keine Weltblöcke; keine ungeprüfte Kompatibilität.

**Nächste Aktion:** Philipp testet die .jar aus /mnt/project-files/mod/ auf server.lmnt-gaming.net und meldet Ergebnis/Fehler (Anleitung ANLEITUNG_SPIELTEST.md).

**Nur Philipp:** Auf deinem Server mit Mitspielern: Mehrspieler-Abnahme auf server.lmnt-gaming.net (S04).

**Prüfstand:** Build, Einzelspieler-Spieltest im echten 26.3-Client und Modpack-Verträglichkeit bestanden; Mehrspieler-Abnahme auf echtem Server durch den Nutzer offen.

**Nachweise:** [mods/bauplaner-bridge/README.md](../mods/bauplaner-bridge/README.md) — Bau, Installation, Befehle, Spieltests.; [scripts/mod/test_bridge_ingame.sh](../scripts/mod/test_bridge_ingame.sh) — Echter Minecraft-26.3-Client (Fabric Client Game Test): Plan per Chat laden, Anker auf angeschauten Block, Aufnahme, Website-Vergleich findet genau 1 falschen und 1 fehlenden Block; zusätzlich als Produktionsstart mit allen 21 Mods aus Philipps Modpack.; [docs/TESTING.md](TESTING.md) — Befehle, Ergebnisse und Grenzen des Spieltests (01.11.2026).; [tests/e2e/mod-download.e2e.mjs](../tests/e2e/mod-download.e2e.mjs) — Download-Seite in Chromium (1400/390 px): Auswahl, Link unter Pages-Unterpfad, Dateiname, Bytes, teilbare Auswahl.; [tests/unit/mod/mod-releases.test.mjs](../tests/unit/mod/mod-releases.test.mjs) — Jede angebotene .jar liegt mit gelisteter Größe und SHA-256 in downloads/mod; Auswahl-Logik.

**Dateiumfang:** `apps/web/src/views/mod/`, `downloads/mod/`, `mods/bauplaner-bridge/`, `scripts/mod/bridge_crosscheck.mjs`, `scripts/mod/bridge_gametest.mjs`, `scripts/mod/release_mod.mjs`, `scripts/mod/test_bridge.sh`, `scripts/mod/test_bridge_ingame.sh`, `tests/e2e/mod-download.e2e.mjs`, `tests/unit/mod/mod-releases.test.mjs`. **Abhängigkeiten:** FORMAT-01, GAME-01. **Alte IDs:** B8-M2, P6-01.

**Integration:** Main [84838f0](https://github.com/Freadeax/Minecraft-Bauplaner/commit/84838f0200be5fc4c8faef30a185a764ee474bd2); Pages-Quelle [e232b26](https://github.com/Freadeax/Minecraft-Bauplaner/commit/e232b26fbc457c20182e4e35581244234218664e).

### GAME-07

**Bauplaner-Mod 2.0: Hologramm und Live-Abgleich (nur Client, ohne Server)** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Teambau und Befehle in der Mod ausbauen“) · Zuständiger Thread: „Gruppen und Sperren bis ins Hologramm bringen“ · Aktualisiert: 2026-11-06T10:43:17.217Z

- [x] GAME-07-S01: Versionsneutraler Mod-Kern: Blockzustände, Vergleichsregeln wie gameCheck.ts, Platzierung mit Drehen/Spiegeln, Planmodell, Live-Abgleich, Platzierungsspeicher; JUnit-Tests.
- [x] GAME-07-S02: Fabric 26.3: Planmenü, Tasten, Platzieren/Verschieben/Drehen/Spiegeln, Rahmen, Speicherung je Server/Welt.
- [x] GAME-07-S03: Hologramm: farbige Geisterblöcke (fehlt blau, falsch rot, Zustand gelb), HUD-Fortschritt, Fehlerfinder.
- [x] GAME-07-S04: Echter Spieltest (Client und Modpack mit Sodium/Iris), Release auf #/mod.
- [ ] GAME-07-S05: Abnahme durch Philipp auf server.lmnt-gaming.net.
- [x] GAME-07-S06: Stufe 2: texturierte Geisterblöcke, Materialliste im Spiel, Ebenenmodus (0.3.0).
- [x] GAME-07-S08: Stufe 3: Platzierhilfe wie Easy Place, aber serverkonform: Vorhersage mit der Platzierlogik des Spiels, Schutz vor falschem Block/falscher Ausrichtung, richtiger Block aus der Schnellleiste, Ausrichtungshinweis, Abbauschutz (0.4.0).
- [x] GAME-07-S09: Stufe 4: NeoForge auf Fabric-Stand über gemeinsamen Client-Kern hologram-26.3 (Hologramm, Platzierhilfe, Website-Verbindung), Geister unter Iris-Shadern getönt und umrandet, Platzierhilfe vor Tool Switcher, Ebene tiefer auf Num * (0.6.0).
- [x] GAME-07-S10: Stufe 5: Bauabschnitte aus der Website als Filter für Hologramm, Fortschritt, Material und Fehlerfinder (Num /, Menü, Befehl, Website über /v1/section), Röntgensicht (Num -), Shulkerkisten und Bündel im Inventar mitgezählt (0.7.0).
- [x] GAME-07-S07: Stufe 6: Abschnitt als Packliste mit Kistenstandorten (/bauplaner packliste), Gerüst-Hinweise für hängende und fallende Blöcke (/bauplaner geruest) (0.13.0).
- [x] GAME-07-S11: Stufe 6b: Gruppen/Sperren aus dem Weltbuilder im Hologramm: gesperrte Flächen grau ohne Platzierhilfe und Fehlerfinder, Gruppe als Filter (/bauplaner gruppe, Planmenü, Website über POST /v1/group), Gruppe ausblenden (0.19.0).

**Abnahme:** Reiner Client: keine Pakete an den Server, keine Weltänderung, kein automatisches Bauen, keine Abhängigkeit von WorldEdit oder Litematica; Ergebnis des Live-Abgleichs gleicht dem Website-Vergleich.

**Nächste Aktion:** Philipp prüft 0.19.0 im echten Spiel: gesperrter Bauplatz grau, Hologramm nur in einer Gruppe (Testfall MOD-21); danach Stufe 7.

**Nur Philipp:** Auf deinem Server mit Mitspielern: Hologramm, Abschnitte und Röntgensicht auf server.lmnt-gaming.net (S05).

**Prüfstand:** Automatisch im echten Client und mit Modpack geprüft; Mehrspieler-Abnahme durch Philipp offen.

**Nachweise:** [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/ModCoreTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/ModCoreTest.java) — 7 JUnit-Fälle: Zustände, Regeln wie gameCheck.ts, Drehen/Spiegeln mit Rückweg, Planlesen, Live-Abgleich, Speicher.; [scripts/mod/test_bridge_ingame.sh](../scripts/mod/test_bridge_ingame.sh) — Echter 26.3-Client und Produktionsstart mit Philipps Modpack (Sodium, Iris, Xaero …): Hologramm fehlt 1/falsch 1, gesetzter Block ohne Befehl erkannt, Drehen, Speichern, Taste J öffnet das Menü (02.11.2026).; [docs/architecture/mod/MOD_HOLOGRAM.md](architecture/mod/MOD_HOLOGRAM.md) — Grundsätze, Aufbau, Tasten, Darstellung, Live-Abgleich, Prüfung.; [tests/e2e/mod-download.e2e.mjs](../tests/e2e/mod-download.e2e.mjs) — Download-Seite wählt 0.2.0 vor, 0.1.0 bleibt wählbar.; [tests/unit/mod/mod-releases.test.mjs](../tests/unit/mod/mod-releases.test.mjs) — Jede .jar wie ein Launcher geprüft (EOCD, Verzeichnis, Loader-Metadaten); abgeschnittene/HTML/beschädigte Dateien erkannt. Download-Seite speichert nur geprüfte Bytes (02.11.2026).; [scripts/mod/bridge_gametest.mjs](../scripts/mod/bridge_gametest.mjs) — 0.3.0: Materialliste, Ebenenmodus, texturierte Geisterblöcke im echten Client und mit Philipps Modpack (Sodium/Iris) geprüft (02.11.2026).; [mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlacementAdvice.java](../mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/PlacementAdvice.java) — 0.4.0 Platzierhilfe: Urteil, Wegsuche und Hinweise; im echten Client und mit Philipps Modpack über den echten Klickweg geprüft (02.11.2026).; [mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java](../mods/bauplaner-bridge/neoforge-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/HologramScenario.java) — 0.6.0: echter NeoForge-26.3-Client spielt Hologramm, Materialliste, Ebenen, J/Num 7, Platzierhilfe über Minecraft.startUseItem/startAttack und die Website-Verbindung durch; Fabric zusätzlich mit Philipps 25 Mods und Complementary Unbound (BAUPLANER_SHADERPACK) bestanden (02.11.2026).; [mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Filter.java](../mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Filter.java) — 0.7.0: ein Filter (Ebenen + Bauabschnitt) für Hologramm, HUD, Material und Fehlerfinder; JUnit buildSectionsFilterEverything, Website-Test für SectionNames/SectionCells im Export und Abschnitte im Live-Status; Spieltests Fabric (auch Modpack + Complementary) und NeoForge prüfen Abschnittsliste, Röntgensicht und Abschnittswahl über die Website (02.11.2026).; [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/MarkAreasTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/MarkAreasTest.java) — Schema 3 lesen, Flächen aus Bauplatz/Zone/Weg, Filter mit Fläche, Fehlerfinder ohne gesperrte Flächen.

**Dateiumfang:** `mods/bauplaner-bridge/mod-core/`, `mods/bauplaner-bridge/fabric-26.3/`, `mods/bauplaner-bridge/settings.gradle`, `mods/bauplaner-bridge/VERSION`, `scripts/mod/bridge_gametest.mjs`, `scripts/mod/test_bridge_ingame.sh`, `docs/architecture/mod/MOD_HOLOGRAM.md`, `downloads/mod/`, `apps/web/src/views/mod/releases.json`, `tests/e2e/mod-download.e2e.mjs`, `apps/web/src/views/mod/`, `apps/web/src/styles/catalog.css`, `tests/unit/mod/mod-releases.test.mjs`, `scripts/mod/release_mod.mjs`, `mods/bauplaner-bridge/hologram-26.3/`, `mods/bauplaner-bridge/neoforge-26.3/`, `mods/bauplaner-bridge/client-26.3/`, `scripts/mod/test_bridge_ingame_forge.sh`, `mods/bauplaner-bridge/README.md`, `docs/architecture/team/LIVE_LINK.md`, `packages/application/src/revisionExport.ts`, `packages/domain/src/team/liveLink.ts`, `tests/unit/building/game-check.test.mjs`, `tests/unit/team/livelink.test.mjs`, `tests/e2e/modSimulator.mjs`, `mods/bauplaner-bridge/CHANGELOG.md`. **Abhängigkeiten:** GAME-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-08

**Bauplaner-Mod Protokoll 2: Zonen, Ebenen, Farben und neue Punktarten im Spiel (marks2), Mitspieler für die Karte (GET /v1/players), hello.protocol 2** · 🧩 Implementiert · Abnahme offen · Priorität P2 · Verantwortlich: Claude (Thread „Teambau und Befehle in der Mod ausbauen“) · Zuständiger Thread: „Teambau und Befehle in der Mod ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GAME-08-S01: WorldMarks: Art zone (category, points 3–256), Felder layer/color an allen Einträgen, Punktarten notiz/gefahr/rohstoff/spawn/aussicht; feature marks2 in hello.features.
- [x] GAME-08-S02: MarksRenderer: Zonen als gefüllte Fläche auf Bodenhöhe mit Rand, Name in der HUD-Zeile, Farbe aus color, Ebenen im Spiel ein-/ausblenden (/bauplaner ebenen).
- [x] GAME-08-S03: GET /v1/players → {dimension, players:[{name,x,y,z,yaw}]} aus den sichtbaren Spielern des Clients; feature players; hello.protocol 2.
- [x] GAME-08-S04: Spieltest mit scripts/bridge_gametest.mjs (Zonen und Mitspieler gegen die Leser der Website), Release auf #/mod.
- [x] GAME-08-S05: Protokoll 3: Markierungen im Spiel setzen und zurück in den Weltplan (Zeitstempel je Eintrag, Abgleich mit MAP-06), siehe LIVE_LINK.md (0.13.0, Merkmal marks3).

**Abnahme:** Eine Website ohne Kenntnis von Protokoll 2 arbeitet unverändert (alle alten Routen und Antworten bleiben). marks mit Zonen und neuen Punktarten werden angenommen und gezeichnet; Antworten entsprechen den Lesern in packages/domain/src/liveLink.ts (readLivePlayers). Der Simulator tests/e2e/modSimulator.mjs mit {protocol: 2, features: ['scan','marks2','players']} bleibt das Vorbild für Formen und Fehlerfälle.

**Nächste Aktion:** Philipp prüft Protokoll 3 im echten Spiel (TESTPLAN MOD-17); Forge und Paper ohne Live-Verbindung.

**Nur Philipp:** Auf deinem Server mit Mitspielern: Mitspieler-Pfeile auf der Live-Karte mit einem zweiten Spieler.

**Prüfstand:** Noch nicht begonnen.

**Nachweise:** [docs/architecture/team/LIVE_LINK.md](architecture/team/LIVE_LINK.md) — Protokoll 2 (GAME-08, Mod 0.8.0): Vertrag und Umsetzung.; [tests/e2e/modSimulator.mjs](../tests/e2e/modSimulator.mjs) — Simulator mit Protokoll 2, marks2, players.; [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java) — 0.8.0: Zone mit Ebene/Farbe, Punkt-in-Polygon, Ebenenliste, Ablehnungen (Zonenart, zwei Ecken, Farbe), /v1/players, hello mit protocol 2 und features (02.11.2026).; [scripts/mod/bridge_gametest.mjs](../scripts/mod/bridge_gametest.mjs) — 0.8.0: Spieltest schickt Zone und Gefahr-Punkt auf Ebene „Phase 2“, liest /v1/players mit readLivePlayers und die Ebenenliste im Chat; Fabric, Modpack + Complementary und NeoForge bestanden (02.11.2026).; [docs/TESTING.md](TESTING.md) — Abschnitt „GAME-08 · Mod 0.8.0 (Live-Protokoll 2)“.

**Dateiumfang:** `apps/web/src/views/mod/releases.json`, `docs/COMMUNICATION.md`, `docs/TESTING.md`, `docs/architecture/team/LIVE_LINK.md`, `docs/architecture/mod/MOD_HOLOGRAM.md`, `downloads/mod/`, `mods/bauplaner-bridge/`, `scripts/mod/bridge_gametest.mjs`. **Abhängigkeiten:** GAME-07, MAP-06. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-03

**Optionale lokale Verbindung und Anzeige im Spiel** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Live-Karte mit Spielanbindung neu bauen“) · Zuständiger Thread: „Bauplaner-Mod von Grund auf neu entwickeln“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GAME-03-S01: Loopback-Sicherheitsvertrag mit expliziter Kopplung definieren.
- [x] GAME-03-S02: Planübertragung und Bestätigungen getrennt von Weltänderungen umsetzen.

**Abnahme:** Keine unautorisierte Fernverbindung; Overlay ist kein serverseitiger Blocksetter.

**Nächste Aktion:** Abnahme mit MAP-03-S06; Forge/NeoForge/Paper haben die Verbindung noch nicht.

**Nur Philipp:** Auf deinem Server mit Mitspielern: Zusammen mit MAP-03-S06.

**Prüfstand:** Im echten Client geprüft; Abnahme durch Philipp offen.

**Nachweise:** [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java) — Kopplung, Token, Ursprung, Host, Grenzen.; [docs/architecture/team/LIVE_LINK.md](architecture/team/LIVE_LINK.md) — Loopback-Sicherheitsvertrag.

**Dateiumfang:** `mods/bauplaner-bridge/`, `packages/application/`. **Abhängigkeiten:** GAME-02. **Alte IDs:** B8-M3, B8-M4.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### WORLD-IMPORT-01

**Bereichsweiser Weltimport und Terrainprüfung** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread Weltausschnitte importieren) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] WORLD-IMPORT-01-S01: Konsistentes Sicherungsformat und Bereichsauswahl festlegen.
- [x] WORLD-IMPORT-01-S02: Begrenzten Adapter, Terrain-/Fundamentprüfung und Lastszenarien implementieren.

**Abnahme:** Keine unbeschränkte Vollwelt im Browser; unbekanntes Terrain bleibt ungeprüft.

**Nächste Aktion:** Mit einer Kopie von Philipps eigener 26.3-Welt (Modpack) einen Ausschnitt übernehmen und ein platziertes Projekt prüfen.

**Nur Philipp:** Dateien oder Welt liefern: Ausschnitt aus einer Kopie deiner Modpack-Welt übernehmen.

**Prüfstand:** Automatisch und an frisch erzeugten 26.3-Welten geprüft; Abnahme mit Philipps eigener Welt bzw. Modpack-Welt und echtem Gerät offen.

**Nachweise:** [tests/unit/formats/anvil.test.mjs](../tests/unit/formats/anvil.test.mjs) — Unabhängige Python-Regionsfixture (26.x/1.21/1.17, zlib/GZip/LZ4/ohne), jede Zelle geprüft, Fehlerfälle, Lastszenario 16,7 Mio. Zellen.; [tests/unit/world/terrain.test.mjs](../tests/unit/world/terrain.test.mjs) — Handberechnete Geländeprüfung: Hindernis, Wasser, Loch mit Unterbautiefe, unbekannt, außerhalb, Y-Vorschlag.; [tests/e2e/world-import.e2e.mjs](../tests/e2e/world-import.e2e.mjs) — Chromium 1400/390 px: Dateien, Übersicht, Bereich, Bibliothek, Gelände-Reiter.; [scripts/mod/test_world_import_real.sh](../scripts/mod/test_world_import_real.sh) — Echte 26.3-Welten vom offiziellen Server (deflate/lz4/none) gelesen und gegen gesetzte Blöcke geprüft.; [docs/architecture/welt/WORLD_IMPORT.md](architecture/welt/WORLD_IMPORT.md) — Format, Sicherung, Bereichswahl, Geländeprüfung und Grenzen.

**Dateiumfang:** `packages/formats/src/anvil.ts`, `packages/formats/src/lz4.ts`, `packages/formats/src/worldExcerpt.ts`, `packages/domain/src/world/terrain.ts`, `apps/web/src/views/world/`, `apps/web/src/views/project/TerrainTab.tsx`, `tests/unit/formats/anvil.test.mjs`, `docs/architecture/welt/WORLD_IMPORT.md`, `packages/formats/src/defaultStates.ts`, `packages/formats/src/nbt.ts`, `tests/unit/world/terrain.test.mjs`, `tests/e2e/world-import.e2e.mjs`, `scripts/fixtures/make_region_fixture.py`, `scripts/mod/test_world_import_real.sh`, `scripts/gen/gen_default_states.mjs`. **Abhängigkeiten:** PROFILE-01, PERF-02, FORMAT-01. **Alte IDs:** P7-01.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### BACKUP-02

**Sicherungserinnerung und Abschnittsrevisionen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude-Thread „Sicherungen erweitern“ · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] BACKUP-02-S01: Letzte erfolgreiche Sicherung mit Datenänderungen vergleichen.
- [x] BACKUP-02-S02: Abschnittsstand reproduzierbar einfrieren und wiederfinden.

**Abnahme:** Erinnerung behauptet keine Cloudkopie; keine stillen Abschnittsänderungen.

**Nächste Aktion:** Abnahme auf echten Geräten (QA-02), besonders Safari-Downloads; Rückmeldung zur Erinnerungsschwelle (7 Tage) einholen.

**Nur Philipp:** Auf echten Geräten und Browsern: Sicherungs-Download in Safari; Rückmeldung, ob 7 Tage für die Erinnerung passen.

**Prüfstand:** Node- und lokale Chromium-Browsertests; keine Safari-/Echtgeräteabnahme.

**Nachweise:** [tests/unit/data/backup-reminder.test.mjs](../tests/unit/data/backup-reminder.test.mjs) — Belege aus Dateiinhalt, Revision ignoriert, Hinweis/fällig nach Alter, Projekt- vs. Gesamtsicherung, eigene Bibliothek, Prüfen per Hash, Protokollgrenze; Stände einfrieren, jede Abweichungsart, Zurücksetzen reproduziert Fingerabdruck, Undo, Sperre bei fehlender Version, Kopie als Projekt.; [tests/e2e/backup-reminder.e2e.mjs](../tests/e2e/backup-reminder.e2e.mjs) — Chromium 1400/390 px: Erinnerung ohne Cloudbehauptung, Alles sichern, Datei prüfen (gültig/manipuliert), Projektkopf-Chip, Neuladen; Einfrieren, Warnung im Editor, Abweichung, Zurücksetzen mit Vorschau, entfernter Abschnitt wiederfinden, als Projekt öffnen.; [docs/architecture/kern/BACKUPS.md](architecture/kern/BACKUPS.md) — Vertrag, Ehrlichkeitsregeln und Grenzen.

**Dateiumfang:** `packages/domain/src/data/backupStatus.ts`, `packages/domain/src/building/sectionSnapshots.ts`, `packages/domain/src/building/site.ts`, `apps/web/src/views/BackupPanel.tsx`, `apps/web/src/views/project/`, `docs/architecture/kern/BACKUPS.md`. **Abhängigkeiten:** STORE-01, BUILD-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### TEAM-01

**Backendvertrag, Datenbank und Payloadspeicher** · ⏳ Offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: — · Aktualisiert: 2026-11-03T20:52:59.449Z

- [ ] TEAM-01-S01: API, Betriebsmodell und Kostenrahmen dokumentieren.
- [ ] TEAM-01-S02: PostgreSQL-Metadaten und dauerhaften Objektspeicher mit Integrität/Backup aufbauen.

**Abnahme:** Pages bleibt statisches Frontend; kein Geheimnis im Client oder Repo.

**Nächste Aktion:** API, Betriebsmodell und Kostenrahmen dokumentieren. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `docs/architecture/`, `packages/application/`. **Abhängigkeiten:** ARCH-01, FORMAT-01, STORE-02, LICENSE-01. **Alte IDs:** P4-01.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### AUTH-01

**Konten, Rechte und Übernahme lokaler Projekte** · ⏳ Offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: — · Aktualisiert: 2026-11-03T20:52:59.449Z

- [ ] AUTH-01-S01: Gast-/Kontovertrag und serverseitige Rechte definieren.
- [ ] AUTH-01-S02: Freigaben, Rollen, Rechtewechsel und kontrollierten lokalen Import prüfen.

**Abnahme:** Keine fremden Projektzugriffe; Gastmodus bleibt lokal nutzbar.

**Nächste Aktion:** Gast-/Kontovertrag und serverseitige Rechte definieren. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/application/`, `apps/web/src/`. **Abhängigkeiten:** TEAM-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### TEAM-02

**Geordnete Operationen, Reconnect und Team-Undo** · ⏳ Offen · Priorität P0 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: — · Aktualisiert: 2026-11-05T10:34:38.680Z

- [ ] TEAM-02-S01: Operation-ID, Revisionsprüfung und Wiederholung serverseitig umsetzen.
- [ ] TEAM-02-S02: Konkurrierende Änderungen, Reconnect und geprüfte Gegenoperationen testen.

**Abnahme:** Kein stiller Verlust und kein Überschreiben fremder Operationen.

**Nächste Aktion:** Operation-ID, Revisionsprüfung und Wiederholung serverseitig umsetzen. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/application/`, `packages/domain/src/core/project.ts`. **Abhängigkeiten:** AUTH-01, UPDATE-01. **Alte IDs:** P4-02.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### TEAM-03

**Gemeinsame Aufgaben, Abschnitte und Sammelplanung** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: — · Aktualisiert: 2026-11-05T10:34:38.680Z

- [ ] TEAM-03-S01: Zuständigkeiten und Lagerbuchungen versionieren.
- [ ] TEAM-03-S02: Abschnitte und Sammelaufträge mehreren Spielern zuweisen.

**Abnahme:** Planung, manuelle Bestätigung und Spielnachweis bleiben getrennt.

**Nächste Aktion:** Zuständigkeiten und Lagerbuchungen versionieren. Für den Spielbetrieb ohne Backend ersetzt durch COOP-01…04 (TEAMBAU.md); bleibt als spätere Option.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `packages/domain/src/building/site.ts`, `packages/application/`. **Abhängigkeiten:** TEAM-02, BUILD-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-04

**Paper-Plugin der Bauplaner-Brücke (serverseitig, mehrere Minecraft-Versionen)** · 🚧 In Arbeit · Priorität P1 · Verantwortlich: Claude (Thread „Bauplaner-Anbindung für Paper bauen“) · Zuständiger Thread: „Server-Plugin mit geprüften Lagerkisten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GAME-04-S01: Paper-Plugin: Plan laden, Anker je Plan (für alle Spieler), Aufnahme der ganzen Serverwelt mit Nachladen vorhandener Chunks ohne Geländeerzeugung, Rechte, Konsole.
- [x] GAME-04-S02: Auf echten Paper-Servern 1.18.2, 1.20.6, 1.21.4, 1.21.11 und 26.3 automatisch geprüft (scripts/test_bridge_paper.sh).
- [x] GAME-04-S03: Jar auf der Download-Seite #/mod für alle geprüften Versionen anbieten.
- [ ] GAME-04-S04: Abnahme auf Philipps eigenem Paper-Server.

**Abnahme:** Keine Weltänderung und keine Geländeerzeugung; dieselbe Aufnahmedatei wie die Fabric-Mod, vom Website-Vergleich geprüft; eine .jar für alle geprüften Versionen.

**Nächste Aktion:** Abnahme auf Philipps eigenem Paper-Server (GAME-04-S04).

**Nur Philipp:** Auf deinem Server mit Mitspielern: Plugin-Abnahme auf deinem Paper-Server (S04).

**Prüfstand:** Automatischer Servertest in fünf Paper-Versionen bestanden; Abnahme auf Philipps Server offen.

**Nachweise:** [scripts/mod/test_bridge_paper.sh](../scripts/mod/test_bridge_paper.sh) — Echter Servertest Paper 1.18.2/1.20.6/1.21.4/1.21.11/26.3 bestanden (01.11.2026), Ergebnisse in docs/TESTING.md

**Dateiumfang:** `mods/bauplaner-bridge/paper/`, `mods/bauplaner-bridge/settings.gradle`, `mods/bauplaner-bridge/README.md`, `scripts/mod/test_bridge_paper.sh`, `scripts/mod/bridge_papertest.mjs`, `scripts/mod/bridge_gametest.mjs`, `scripts/mod/release_mod.mjs`, `apps/web/src/views/mod/`, `downloads/mod/`, `tests/unit/mod/mod-releases.test.mjs`, `tests/e2e/mod-download.e2e.mjs`, `docs/architecture/mod/MOD_BRIDGE.md`. **Abhängigkeiten:** GAME-02. **Alte IDs:** P6-01.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-05

**NeoForge- und Forge-Brücke mit gemeinsamer Befehlslogik** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Teambau und Befehle in der Mod ausbauen“) · Zuständiger Thread: „Teambau und Befehle in der Mod ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GAME-05-S01: Gemeinsame Befehlslogik BridgeSession/BridgeHost im Kern, von allen Loadern genutzt, mit Tests.
- [x] GAME-05-S02: NeoForge-Adapter 26.3 bauen und im echten Client prüfen.
- [ ] GAME-05-S03: Forge-Adapter 26.3 bauen und im echten Client prüfen.
- [x] GAME-05-S04: NeoForge-Jar auf der Download-Seite #/mod anbieten (Forge erst nach bestandener Spielprüfung).

**Abnahme:** Nur lesend, keine Serverinstallation nötig; dieselbe Aufnahmedatei wie Fabric, vom Website-Vergleich geprüft.

**Nächste Aktion:** Forge-Spieltest: kopfloser Client bleibt im Ladebildschirm stehen; auf einem Rechner mit Bildschirm (scripts/test_bridge_ingame_forge.sh forge) oder durch Philipp prüfen, dann Forge-Jar bereitstellen.

**Nur Philipp:** Im Spiel an deinem PC: Forge-Testversion auf einem Rechner mit Bildschirm starten (S03).

**Prüfstand:** NeoForge im echten Client bestanden; Forge-Spielprüfung, Start über echten Launcher und Mehrspieler offen.

**Nachweise:** [scripts/mod/test_bridge_ingame_forge.sh](../scripts/mod/test_bridge_ingame_forge.sh) — NeoForge: echter 26.3-Client, Testwelt, Plan, Anker auf angeschauten Block, Aufnahme; Website-Vergleich findet genau 1 falschen und 1 fehlenden Block (zweimal bestanden 01.11.2026). Forge: lädt, Durchlauf kopflos hängend.; [mods/bauplaner-bridge/core/src/test/java/io/github/freadeax/bauplaner/bridge/BridgeSessionTest.java](../mods/bauplaner-bridge/core/src/test/java/io/github/freadeax/bauplaner/bridge/BridgeSessionTest.java) — Gemeinsame Befehlslogik aller Loader gegen ein nachgebautes Spiel.; [docs/TESTING.md](TESTING.md) — Befehle, Ergebnisse und Grenzen (GAME-05).; [tests/e2e/mod-download.e2e.mjs](../tests/e2e/mod-download.e2e.mjs) — Download-Seite bietet NeoForge mit eigener Datei und Installationsschritt, Forge als geplant.

**Dateiumfang:** `mods/bauplaner-bridge/core/src/main/java/io/github/freadeax/bauplaner/bridge/session/`, `mods/bauplaner-bridge/core/src/test/java/io/github/freadeax/bauplaner/bridge/BridgeSessionTest.java`, `mods/bauplaner-bridge/client-26.3/`, `mods/bauplaner-bridge/neoforge-26.3/`, `mods/bauplaner-bridge/forge-26.3/`, `mods/bauplaner-bridge/settings.gradle`, `scripts/mod/test_bridge_ingame_forge.sh`, `downloads/mod/`, `apps/web/src/views/mod/`. **Abhängigkeiten:** GAME-02. **Alte IDs:** P6-01.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-06

**Sichere Serveranbindung (Webhooks) für Server-Plugins** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: — · Aktualisiert: 2026-11-03T20:52:59.449Z

- [ ] GAME-06-S01: Signierte Webhooks, Ereignis-ID und wiederholbare Verarbeitung ergänzen (aus GAME-04-S02 ausgelagert).

**Abnahme:** Keine impliziten Weltänderungen; Planlieferung und Blocksetzen getrennt.

**Nächste Aktion:** Nach TEAM-02 spezifizieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `mods/`, `packages/application/`. **Abhängigkeiten:** TEAM-02, GAME-04. **Alte IDs:** P6-01.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LAGER-01

**Optionale Truhen-/Lagerintegration** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: „Server-Plugin mit geprüften Lagerkisten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LAGER-01-S01: Inventar-/NBT-Rechte und Herkunft der Aufnahme festlegen.
- [x] LAGER-01-S02: Bestand mit Zeitpunkt, Konflikten und ausdrücklicher Übernahme anzeigen.

**Abnahme:** Keine doppelte Inventarquelle; Aufnahmezeit und ungeprüfte Werte sichtbar.

**Nächste Aktion:** Abnahme auf dem Paper-Server (Thread „Server-Plugin mit geprüften Lagerkisten“).

**Nur Philipp:** Auf deinem Server mit Mitspielern: Geprüfte Lagerkisten auf dem Paper-Server einrichten und den Bestand im Planer übernehmen (LAGERKISTEN.md).

**Prüfstand:** Im Code durch COOP-04/05 umgesetzt; Abnahme auf Philipps Paper-Server offen. TEAM-03 als Abhängigkeit entfallen, weil die Lagerkisten über das Teammodul laufen.

**Nachweise:** [docs/architecture/team/LAGERKISTEN.md](architecture/team/LAGERKISTEN.md) — S01: Rechte (nur geprüfte Kisten, Freigabe durch Bauleitung) und Herkunft je Bestand festgelegt (COOP-04/05).; [tests/unit/team/lager.test.mjs](../tests/unit/team/lager.test.mjs) — S02: Bestand mit Zeitpunkt, Abweichungen und ausdrücklicher Übernahme ins Baustellen-Lager.

**Dateiumfang:** `packages/domain/src/building/site.ts`, `mods/`, `docs/architecture/team/LAGERKISTEN.md`, `mods/bauplaner-bridge/paper/`. **Abhängigkeiten:** GAME-04. **Alte IDs:** P6-02.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### OPS-04

**Teamdienst betreiben und Wiederherstellung prüfen** · ⏳ Offen · Priorität P1 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: — · Aktualisiert: 2026-11-03T20:52:59.449Z

- [ ] OPS-04-S01: Monitoring, Datenmigration, Lösch-/Aufbewahrung und Wiederanlauf definieren.
- [ ] OPS-04-S02: Wiederherstellung mit getrenntem Metadaten-/Objektspeicher testen.

**Abnahme:** Kein produktiver Teamstart ohne Rechte- und Restoreprüfung.

**Nächste Aktion:** Monitoring, Datenmigration, Lösch-/Aufbewahrung und Wiederanlauf definieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `docs/operations/`. **Abhängigkeiten:** TEAM-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### DEFER-01

**GitHub-Login, externes Materialrepo und Registry** · ⏸ Zurückgestellt · Priorität P1 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: — · Aktualisiert: 2026-11-05T11:03:24.121Z

- [ ] DEFER-01-S01: Nur nach neuem ausdrücklichem Nutzerauftrag neu bewerten.

**Abnahme:** Aktuell kein zusätzliches Repo, keine externe Registry, kein produktives GitHub-OAuth.

**Nächste Aktion:** Nur nach neuem ausdrücklichem Nutzerauftrag neu bewerten.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `docs/archiv/NOVEMBER_EXPANSION.md`. **Abhängigkeiten:** keine. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### DEFER-02

**Optionale Discord-Integration** · ⏸ Zurückgestellt · Priorität P1 · Verantwortlich: nicht zugewiesen · Zuständiger Thread: — · Aktualisiert: 2026-11-03T20:52:59.449Z

- [ ] DEFER-02-S01: Erst bei konkretem Bedarf und ausdrücklichem Auftrag spezifizieren.

**Abnahme:** Keine automatischen Nachrichten und keine abgeleiteten Rechte ohne Vertrag.

**Nächste Aktion:** Erst bei konkretem Bedarf und ausdrücklichem Auftrag spezifizieren.

**Prüfstand:** Abnahme noch nicht vollständig erbracht.

**Nachweise:** noch ausstehend

**Dateiumfang:** `docs/architecture/`. **Abhängigkeiten:** AUTH-01. **Alte IDs:** P6-02.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LIB-04

**Gebäudebibliothek v3: Inhalte in alle Richtungen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude Thread Bibliothek erweitern · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LIB-04-S01: Neue Kategorien/Stile/Funktionen, Möbel- und Zustandshelfer (furnish.ts) passend zu den B7-Regeln von main.
- [x] LIB-04-S02: Neue Themen-Sets: Interieur, Garten, Natur, Stadt, Küste, Fahrzeuge, Untergrund, Nether/End, Hof, Technik, Fantasy, Epochen.
- [x] LIB-04-S03: Biom-Stile als Materialfamilien und neue Ensembles.
- [x] LIB-04-S04: Katalogtests, Vorschaubild-Sichtprüfung, Doku, main und Pages.

**Abnahme:** Nur eigene Entwürfe; jede neue Version im B7-Schema drehbar/spiegelbar, keine stillen Material-/Rezeptlücken, bestehende Versions-IDs unverändert.

**Nächste Aktion:** Weitere Ensembles und Tipps nach Spielrückmeldung; Redstone-Bauten im Spiel abnehmen.

**Nur Philipp:** Im Spiel an deinem PC: Redstone-Bauten im Spiel abnehmen.

**Prüfstand:** Node-Katalogtests und Vorschaubild-Sichtprüfung bestanden; Redstone-Bauten nicht im Spiel abgenommen.

**Nachweise:** [tests/unit/catalog/catalog.test.mjs](../tests/unit/catalog/catalog.test.mjs) — Alle 336 Gebäude: Schema, vier Drehungen, doppelte Spiegelung, Material-/Rezeptlücken, Ensembles.; [packages/domain/src/catalog/build/sets/index.ts](../packages/domain/src/catalog/build/sets/index.ts) — 12 neue Sets (159 Gebäude) plus 20 Materialvarianten.; [docs/architecture/bibliothek/CATALOG.md](architecture/bibliothek/CATALOG.md) — Abschnitt Katalog v3 mit Sets, Facetten, Ensembles und Grenzen.

**Dateiumfang:** `packages/domain/src/build/`, `packages/domain/src/catalog/catalog.ts`, `packages/domain/src/catalog/ensembles.ts`, `docs/architecture/bibliothek/CATALOG.md`, `apps/web/src/colors.ts`. **Abhängigkeiten:** LIB-01. **Alte IDs:** B9-B.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### ENTITY-01

**Gemälde, Rahmen, Rüstungsständer und Blockinhalte** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gemälde, Rahmen und Rüstungsständer darstellen“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] ENTITY-01-S01: Datenmodell freie Entities (optional in der Nutzlast), Geometrie hängender Entities, Drehen/Spiegeln, Validierung.
- [x] ENTITY-01-S02: Litematic- und Schem-Import/-Export der Entities mit Bericht.
- [x] ENTITY-01-S03: Anzeige in 3D, Vorschaubildern und Ebenen; Karten für Entities und Blockinhalte (Schilder, Behälter, Banner).
- [x] ENTITY-01-S04: Materialliste (Ausstattung und Inhalte) und Bauanleitungsschritt „Ausstattung“.
- [x] ENTITY-01-S05: Werkstatt: Gemälde, Rahmen, Rüstungsständer platzieren und entfernen, rückgängig machbar.
- [ ] ENTITY-01-S06: Export mit Entities im Spiel laden (Litematica/WorldEdit, Philipps PC).

**Abnahme:** Echte Litematica-Dateien behalten Gemälde/Rahmen/Rüstungsständer an der richtigen Stelle; Roundtrip Litematic und Schem verlustfrei; alte Nutzlasten unverändert; keine Mojang-Texturen.

**Nächste Aktion:** Export mit Entities im Spiel prüfen (S06). Truhen-/Schildinhalte bearbeiten ist mit EDIT-06 erledigt.

**Nur Philipp:** Im Spiel an deinem PC: Export mit Gemälden, Rahmen und Rüstungsständern im Spiel laden (S06).

**Prüfstand:** Unit- und Browsertests grün; Laden im Spiel offen.

**Nachweise:** [tests/unit/formats/entities.test.mjs](../tests/unit/formats/entities.test.mjs) — Geometrie, Drehung/Spiegelung, Litematic-/Schem-Roundtrip, Inhalte, Materialliste, Bauanleitung, Draft.; [tests/e2e/entities.e2e.mjs](../tests/e2e/entities.e2e.mjs) — Werkstatt: platzieren, Rückgängig, 3D-Zählung, Steckbrief, Ebenenlegende.; [docs/architecture/formate/ENTITIES.md](architecture/formate/ENTITIES.md) — Vertrag und Grenzen.

**Dateiumfang:** `packages/voxel/src/entities.ts`, `packages/voxel/src/types.ts`, `packages/voxel/src/validation.ts`, `packages/voxel/src/transforms.ts`, `packages/formats/src/entityIo.ts`, `packages/formats/src/litematic.ts`, `packages/formats/src/litematicWrite.ts`, `packages/formats/src/schem.ts`, `packages/formats/src/schemWrite.ts`, `packages/domain/src/core/compose.ts`, `packages/domain/src/materials/materials.ts`, `packages/domain/src/building/guide.ts`, `packages/domain/src/editor/draft.ts`, `apps/web/src/blockmodels/entityShapes.ts`, `apps/web/src/blockmodels/entityScene.ts`, `apps/web/src/viewer/ContentInfo.tsx`, `apps/web/src/editor/EntityPanel.tsx`, `docs/architecture/formate/ENTITIES.md`. **Abhängigkeiten:** FORMAT-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LIB-05

**Bibliothek im Stil der Vorlagen: Gestaltungsregeln, Baukasten, neu gezeichnete Gebäude und Generatoren** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Bibliothek im Stil der Vorlagen neu gestalten“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LIB-05-S01: 31 Vorlagen (4 brauchbare der 5 hochgeladenen, 27 freie von minemev.com) vermessen: Detailblöcke, umgedrehte Treppen, Fassadenrelief, Fenster, Dächer; Regeln in BAUSTIL.md. Dateien nur als Studienmaterial, nicht im Repository.
- [x] LIB-05-S02: Baukasten build/style.ts: Mischungen, Looks, Fenster mit Läden/Sturz/Blumenkasten, Tür, Dächer mit Überstand/Traufkasten/Ortgang und Quergiebeln, house(), ladderUp, hangLantern; designMetrics.
- [x] LIB-05-S03: Neu gezeichnet: Klassiker, Wohnen, Dorf, Befestigung, Sakral, Hof (rund 50 Entwürfe, Varianten folgen); Ensembles neu angeordnet.
- [x] LIB-05-S04: Veredelung build/refine.ts (Verwitterung, Fensterläden und Sims) für jedes Katalog-Gebäude vor den Materialvarianten.
- [x] LIB-05-S05: Generatoren: Stil-Mischungen, pitchedRoof für alle Steildächer, Haus v3 (Vorkragung, Sockel, Läden, Quergiebel); alle Versionen erhöht.
- [x] LIB-05-S06: Runde 2: Fassadenbaukasten build/facade.ts (Lisenen, Gesimse, Fensterbänke, Maschikulis, Strebepfeiler, Dachtechnik) für Stadt, Küste, Epochen, Fantasy, Nether und Torhaus; sieben neue, eingerichtete Meisterstücke (sets/meister.ts).
- [x] LIB-05-S07: Runde 3: Wandgliederung für Interieur-Räume (dressRoom), Wandrippen für Untergrundhallen (innerRibs), Gehäuse des Wasseraufzugs.
- [ ] LIB-05-S08: Abnahme einiger neuer Gebäude im Spiel durch Philipp.

**Abnahme:** Wohnhäuser im Median ≥ 30 % Nicht-Vollblöcke, ≥ 20 % umgedrehte Treppen, ≤ 50 % Fassade auf der Hauptebene; alle Gebäude und Generator-Fälle weiter ohne Spielfehler (catalog-game). Runde 2: Stadt im Median ≤ 62 % Fassade auf der Hauptebene; jedes Meisterstück ≤ 50 % Hauptebene, ≥ 30 Blockarten, ≥ 20 % umgedrehte Treppen.

**Nächste Aktion:** LIB-05-S08: Abnahme neuer Gebäude im Spiel durch Philipp.

**Nur Philipp:** Im Spiel an deinem PC: Einige neu gezeichnete Gebäude im Spiel ansehen (S08).

**Prüfstand:** Node-Prüfungen bestanden (baustil 9/9, catalog-game, catalog, generators); Sichtprüfung über isometrische Ansichten; Abnahme im echten Spiel steht aus.

**Nachweise:** [tests/unit/catalog/baustil.test.mjs](../tests/unit/catalog/baustil.test.mjs) — Gestaltungsziele als Medianwerte, Baukasten deterministisch, Veredelung verlustfrei.; [docs/architecture/bibliothek/BAUSTIL.md](architecture/bibliothek/BAUSTIL.md) — Quellen, Messwerte vorher/nachher, Regeln, Baukasten.; [packages/domain/src/catalog/build/facade.ts](../packages/domain/src/catalog/build/facade.ts) — Fassadenbaukasten der Runde 2, getestet in tests/baustil.test.mjs.; [packages/domain/src/catalog/build/sets/meister.ts](../packages/domain/src/catalog/build/sets/meister.ts) — Sieben neue Meisterstücke mit Einrichtung.

**Dateiumfang:** `packages/domain/src/build/`, `packages/domain/src/catalog/buildings.ts`, `packages/domain/src/catalog/ensembles.ts`, `packages/domain/src/generators/`, `docs/architecture/bibliothek/BAUSTIL.md`, `docs/architecture/bibliothek/CATALOG.md`, `docs/architecture/bibliothek/GENERATORS.md`, `tests/unit/catalog/baustil.test.mjs`, `tests/unit/catalog/catalog.test.mjs`, `tests/unit/catalog/generators.test.mjs`. **Abhängigkeiten:** LIB-04, BLOCK-02, GEN-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LIB-06

**Bibliotheksbeiträge: eigene Bauwerke (Importe, Werkstatt, Generator) als festen Katalogeintrag für alle einreichen – Beitragspaket mit Prüfsumme und Rechtebestätigung, GitHub-Formular, Übernahme-Skript, Auslieferung wie mitgelieferte Gebäude** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Hochgeladene Bauobjekte fest in Bibliothek übernehmen“) · Zuständiger Thread: „Hochgeladene Bauobjekte fest in Bibliothek übernehmen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LIB-06-S01: Paketformat minecraft-bauplaner/bibliotheksbeitrag v1: Angaben, Rechtebestätigung, Nutzungsrechte, Version in Sicherungsform, Vorschaubild ohne Texturen, Prüfsumme; Prüfung mit Inhalts-Hash und Größengrenzen.
- [x] LIB-06-S02: Fester Katalog: Register und Eintragsmodule unter community/, je Beitrag ein nachgeladener Chunk; Auslieferung über Katalogabgleich (neu, neue Fassung als 2.0), kaputter Beitrag stoppt den Start nicht.
- [x] LIB-06-S03: Gebäudeblatt: „In Bibliothek einreichen“ mit Formular, Download und vorausgefülltem GitHub-Formular; Kennzeichnung „Bibliotheksbeitrag von …“ in Blatt, Karte und Kopf.
- [x] LIB-06-S04: Übernahme-Skript library:add/remove/list/check (Trockenlauf, ersetzen, Übersicht mit Vorschau in docs/library/BEITRAEGE.md), check:library in npm run check.
- [x] LIB-06-S05: Durchstich: im Browser erzeugtes Paket übernommen, gebaut, im Katalog mit Kennzeichnung und Bautipps geprüft (danach wieder entfernt).
- [ ] LIB-06-S06: Abnahme durch Philipp: eigenes Bauwerk einreichen (Testfall BIB-15).
- [ ] LIB-06-S07: Erster echter Beitrag übernommen und für alle sichtbar (Testfall BIB-16).

**Abnahme:** Ein eigenes Bauteil ergibt im Browser ein Paket, das readContribution ohne Änderung annimmt; Blöcke, Blockinhalte, Entities und Anschlüsse bleiben exakt (Inhalts-Hash). Ohne Rechtebestätigung, mit veränderter Datei oder fremder Formatkennung wird nichts übernommen. Nach library:add und Build steht der Beitrag in jedem frischen Browser als mitgeliefertes Gebäude mit Kennzeichnung; gespeicherte Bibliotheken erhalten neue Fassungen als neue Version, nie überschrieben.

**Nächste Aktion:** Abnahme durch Philipp (S06) und erster echter Beitrag (S07).

**Nur Philipp:** Dateien oder Welt liefern: Eigenes Bauwerk einreichen und das Paket im Thread hochladen (BIB-15/16).

**Prüfstand:** Node- und Browsertests grün, Durchstich mit Übernahme und Build lokal geprüft; Abnahme durch Philipp offen.

**Nachweise:** [tests/unit/catalog/contribution.test.mjs](../tests/unit/catalog/contribution.test.mjs) — Kennung, Angaben, Rundreise mit Blockinhalten, Manipulation, Ausschlüsse, Auslieferung und Katalogabgleich 1.0→2.0, Register, Skript im Testordner.; [tests/e2e/contribution.e2e.mjs](../tests/e2e/contribution.e2e.mjs) — Chromium 1400/390 px: Litematic importieren, Paket erstellen, Datei mit readContribution prüfen, GitHub-Link, keine seitliche Überbreite.; [docs/architecture/bibliothek/CONTRIBUTIONS.md](architecture/bibliothek/CONTRIBUTIONS.md) — Ablauf, Paketformat, Prüfungen, Auslieferung und Grenzen.

**Dateiumfang:** `packages/domain/src/catalog/contribution.ts`, `packages/domain/src/community/`, `packages/domain/src/catalog/buildings.ts`, `packages/domain/src/index.ts`, `apps/web/src/views/library/ContributePanel.tsx`, `apps/web/src/views/library/BuildingDetail.tsx`, `apps/web/src/views/library/BuildingCard.tsx`, `apps/web/src/views/LibraryView.tsx`, `apps/web/src/jobs/libraryJob.ts`, `apps/web/src/app/repository.ts`, `apps/web/src/styles/catalog.css`, `apps/web/src/testing/testplan.ts`, `scripts/library/library_intake.mjs`, `package.json`, `.github/ISSUE_TEMPLATE/bibliotheksbeitrag.yml`, `tests/unit/catalog/contribution.test.mjs`, `tests/e2e/contribution.e2e.mjs`, `docs/`. **Abhängigkeiten:** LIB-02, LIB-05, PERF-04, UPDATE-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### BASE-01

**Basisplaner: ganze Survival-Basis aus Funktionszonen (Platz, Lager, Schmiede, Verzauberung, XP-Farm, Küche, Halle, Felder, Tierfarm, Hafen, Händler), Wegenetz mit Laternen, Wasserseite, Spielprüfungen je Zone, Bauphasen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Basisanlagen wie im Bild planen“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-06T09:18:45.680Z

- [x] BASE-01-S01: Funktionskatalog mit Lagewünschen, Affinitäten, Katalogbauteilen, Alternativen, freiem Bauplatz und Bauphasen.
- [x] BASE-01-S02: Spielprüfungen auf echten Blöcken: Verzauberungsstufe (Vanilla-Regel), Bewässerung, Arbeitsblöcke/Betten, Lagerplatz, Schmiede, Kochstelle, Gehege, Stege im Wasser.
- [x] BASE-01-S03: Layout: Platz in der Mitte, Zonen nach Affinität und Platznähe, Uferreihe mit Stegen im Wasser, XP-Farm abseits, Türen zum Platz, Drehung auf die Wasserseite.
- [x] BASE-01-S04: Wegenetz (A*, Stammwege, Laternen) als eigenes Bauteil; AnlagePlan-kompatibel für Konfliktvorschau, Gelände und 3D-Export.
- [x] BASE-01-S05: Oberfläche #/bibliothek/basis: Lageplan wie eine gezeichnete Karte, Zonen je Phase mit Tausch/Anzahl/Bauplatz, Prüfung, Übernahme mit Bauphasen.
- [ ] BASE-01-S06: Abnahme durch Philipp in der Testphase; Küstenlinie aus der Geländeaufnahme, Wegstufen als Treppen, Brücken.

**Abnahme:** Alle Vorlagen planen ohne Voxelkonflikt, jede Zone hängt am Wegenetz, Stege liegen im Wasser, Wege nie im Wasser oder durch Gebäude. Jede Zone zeigt ihre Spielanforderungen auf den echten Blöcken; offene Punkte stehen in den Bauabschnitten. Nichts wird ohne Knopfdruck gespeichert; Einfügen ist ein Rückgängig-Schritt.

**Nächste Aktion:** Abnahme durch Philipp (S06, BIB-10, BIB-19, BIB-20); Küstenlinie, Wegstufen und Brücken sind über TERRAIN-03-S06/S08 umgesetzt.

**Nur Philipp:** Dateien oder Welt liefern: Basisplaner mit einer echten Basis aus eurer Welt abnehmen (S06).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme durch Philipp offen (S06).

**Nachweise:** [tests/unit/catalog/base.test.mjs](../tests/unit/catalog/base.test.mjs) — Funktionen, Spielprüfungen, alle Vorlagen (Konflikte, Abstand, Wasser, Wege), Zonenwahl, Übernahme mit Phasen, Einfügen mit Rückgängig.; [tests/e2e/base.e2e.mjs](../tests/e2e/base.e2e.mjs) — Chromium: Zonen, Tausch, Bauplatz, Wasserseite, Zusatzzone, Übernahme, Wegenetz-Bauteil, 390 px.; [docs/architecture/bibliothek/BASE_PLANNER.md](architecture/bibliothek/BASE_PLANNER.md) — Funktionen, Layout, Wegenetz, Prüfung, Grenzen.

**Dateiumfang:** `packages/domain/src/base/baseFunctions.ts`, `packages/domain/src/base/base.ts`, `packages/domain/src/base/anlagen.ts`, `apps/web/src/views/library/BasePage.tsx`, `apps/web/src/views/library/base.css`, `apps/web/src/app/router.ts`, `tests/unit/catalog/base.test.mjs`, `tests/e2e/base.e2e.mjs`, `docs/architecture/bibliothek/BASE_PLANNER.md`. **Abhängigkeiten:** BUILD-05, TERRAIN-01, BLOCK-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### SPLIT-01

**Gebäude aus großen Modellen herauslösen: Gebäude, Felder, Gehege und Wegenetz erkennen, einzeln oder zusammen als Bauteile speichern, als Projekt an alter Stelle aufteilen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Basisanlagen wie im Bild planen“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] SPLIT-01-S01: Säulenanalyse: Bodenhöhe (mit Auffüllen unter Gebäuden), Natur/Flach/Gebaut je Zelle, Kernsäulen, Rand, Flächen nach Kategorie.
- [x] SPLIT-01-S02: Funktionserkennung je Teil (Zaubertisch, Amboss, Truhen, Ackerboden, Zaun, Wegblöcke) und Benennung.
- [x] SPLIT-01-S03: Herauslösen ohne/mit Boden, Zusammenlegen, Rest, Projekt mit Instanzen an alter Stelle und Abschnitten.
- [x] SPLIT-01-S04: Oberfläche im Gebäudeblatt: Optionen, Draufsicht, Liste, Hervorhebung in 3D, drei Speicherwege.
- [ ] SPLIT-01-S05: Abnahme mit Philipps echten Litematic-Basen in der Testphase.
- [x] SPLIT-01-S06: Unterirdische Räume (eigene Teile, Keller gehört zum Haus) und Brücken zwischen Gebäuden (eigener Teil mit connects, legt Häuser nicht zusammen) erkennen; Liste zeigt Art und Verbindung.

**Abnahme:** Eine ganze Basis auf Gras zerfällt in ihre Gebäude, Felder und das Wegenetz; jeder Block des aufgeteilten Projekts steht am alten Platz. Das Quellmodell bleibt unverändert; Herkunft wird übernommen.

**Nächste Aktion:** Abnahme mit echten Dateien (S05).

**Nur Philipp:** Dateien oder Welt liefern: Echte Litematic-Basen zum Herauslösen bereitstellen (S05).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme mit echten Dateien offen (S05).

**Nachweise:** [tests/unit/catalog/base.test.mjs](../tests/unit/catalog/base.test.mjs) — Ganze Basis auf Gras: Gebäude, Felder, Wegenetz, Schmiede nahezu vollständig, mit/ohne Boden, Zusammenlegen, Rest, Bilanz; Projekt ohne Konflikte am alten Platz.; [tests/e2e/base.e2e.mjs](../tests/e2e/base.e2e.mjs) — Chromium: Herauslösen im Gebäudeblatt, Teil benennen und speichern.; [docs/architecture/bibliothek/BASE_PLANNER.md](architecture/bibliothek/BASE_PLANNER.md) — Analyse, Klassen, Herauslösen, Grenzen.; [tests/unit/core/split-under.test.mjs](../tests/unit/core/split-under.test.mjs) — 4 Fälle: Brücke zwischen zwei Häusern, Steg über Wasser und Dachüberstand, Bunker unter Gras, Keller unter einem Haus.

**Dateiumfang:** `packages/domain/src/core/split.ts`, `packages/domain/src/base/baseFunctions.ts`, `apps/web/src/views/library/SplitPanel.tsx`, `apps/web/src/views/library/BuildingDetail.tsx`, `tests/unit/catalog/base.test.mjs`, `tests/e2e/base.e2e.mjs`, `docs/architecture/bibliothek/BASE_PLANNER.md`, `tests/unit/core/split-under.test.mjs`, `docs/TESTING.md`, `apps/web/src/testing/testplan.ts`, `docs/testing/TESTPLAN.md`. **Abhängigkeiten:** LIB-04, WORLD-IMPORT-01, PERF-04. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GROSS-01

**Großprojekte in der Bibliothek: Städte, Festungen und Anlagen als Plan mit Quartieren auf Straßenraster, eigenem Straßennetz, Bauphasen, Konfliktvorschau und Übernahme als Projekt** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gelände, Wege und Küste ausbauen“) · Zuständiger Thread: „Gelände, Wege und Küste ausbauen“ · Aktualisiert: 2026-11-06T09:18:45.680Z

- [x] GROSS-01-S01: Lückenanalyse der Größenstufen (Gebäude ≤ 25 × 25, Ensembles, Anlagen, Basisplaner) und Datenmodell Großprojekt (Quartiere, Einheiten slot/ensemble/anlage, Phasen, Straßen), abgestimmt mit Projektmodul- und ChatGPT-Projekt-Thread.
- [x] GROSS-01-S02: Engine: deterministisches Rasterlayout aus echten Grundflächen, Türen zur Straße, Straßennetz als eigenes Bauteil (vier Stile, Laternen, Ring, Aussparung in Quartieren über mehrere Zellen), AnlagePlan-kompatible Vorschau, Übernahme mit Abschnitten je Phase.
- [x] GROSS-01-S03: Zehn kuratierte Großprojekte (27–62 Gebäude) für neun Bauwelten, darunter eines aus zwei ganzen Anlagen; alle ohne Voxelkonflikt.
- [x] GROSS-01-S04: Oberfläche #/bibliothek/grossprojekte: Übersicht mit Lageplan-Vorschau, Planer mit 3D-Ansicht, Lageplan, Prüfung, Quartiere je Phase (ab, Tausch, Drehung), Straßenwahl, Übernahme, 3D-Export.
- [x] GROSS-01-S05: Großbauten-Set: sechs große Einzelgebäude (Rathaus mit Turm, Schloss mit Innenhof, Kuppelbasilika, Arena, Großer Marktplatz, Stadttor) bis 45 × 41 Blöcke; Hauptstadt um Residenz und Großen Markt erweitert.
- [ ] GROSS-01-S06: Abnahme durch Philipp in der Testphase (BIB-13); danach Geländeanpassung im Planer, Wasserkanten, eigene Großprojekte aus Sammlungen.
- [x] GROSS-01-S07: Bibliothek Runde 2: Großbauten Klosteranlage mit Kreuzgang und Universität mit Sternwarte; Großprojekte „Residenzstadt mit Schlosspark“ und „Klosterdorf im Tal“ (je 27 Gebäude, ohne Konflikt).
- [x] GROSS-01-S08: Großprojekte auf Gelände und aus Sammlungen: Terrassen/Ebene aus der Geländeaufnahme, flachster Platz neben bestehenden Bauten, Wasserkanten (Quartiere im Wasser, Aufschüttung mit Kaimauer), Straßennetz als Landschaftsweg mit Treppen und Brücken; eigene Großprojekte aus Sammlungen (Unterordner = Quartier und Bauphase); Abnahme BIB-21/BIB-22.

**Abnahme:** Alle mitgelieferten Großprojekte planen ohne Voxelkonflikt und Abstandsbefund; das Straßennetz ist zusammenhängend, Laternen stehen neben der Fahrbahn. Übernahme liefert Abschnitte „Straßen & Plätze“ und „Phase N“ mit Zwecken; Einfügen ist ein Rückgängig-Schritt; nichts wird ohne Knopfdruck gespeichert. Eigene Großprojekte brauchen nur eine Datei und eine Registry-Zeile.

**Nächste Aktion:** Abnahme durch Philipp (S06 BIB-13, BIB-21, BIB-22).

**Nur Philipp:** Im Spiel an deinem PC: Großprojekte und die sechs Großbauten im Spiel ansehen (BIB-13). Dateien oder Welt liefern: BIB-21/BIB-22: Großprojekt auf einem echten Bauplatz am Wasser und eigenes Großprojekt aus einer Sammlung planen.

**Prüfstand:** Einheits- und Browsertests grün; Abnahme durch Philipp offen (S06).

**Nachweise:** [tests/unit/catalog/grossprojekte.test.mjs](../tests/unit/catalog/grossprojekte.test.mjs) — Kuratierung, Layouts ohne Konflikte, Straßennetz, Wahl, Datenprüfung, Übernahme, Einfügen mit Rückgängig.; [tests/e2e/grossprojekte.e2e.mjs](../tests/e2e/grossprojekte.e2e.mjs) — Chromium: Übersicht, Planer, Quartier ab, Straßen, Tausch/Drehung, Übernahme mit Netz-Bauteil, Einfügen, 390 px.; [docs/architecture/bibliothek/GROSSPROJEKTE.md](architecture/bibliothek/GROSSPROJEKTE.md) — Daten, Layout, Vorschau/Übernahme, eigene Projekte, Grenzen.; [tests/unit/catalog/plan-landscape.test.mjs](../tests/unit/catalog/plan-landscape.test.mjs) — Straßen über Bach als Brücke, Aufschüttung mit Kaimauer, Wasserkanten gemeldet; eigenes Großprojekt aus Sammlung mit Unterordnern ohne Konflikt.; [tests/e2e/plan-landscape.e2e.mjs](../tests/e2e/plan-landscape.e2e.mjs) — Flachster Platz, Landschaftsstraßen, Übernahme mit Geländegestaltung, Sammlung als Großprojekt (1400/390 px).

**Dateiumfang:** `packages/domain/src/catalog/grossprojekte.ts`, `packages/domain/src/grossprojekte/`, `apps/web/src/views/library/GrossprojektePage.tsx`, `apps/web/src/views/library/grossprojekte.css`, `apps/web/src/views/LibraryView.tsx`, `apps/web/src/app/router.ts`, `tests/unit/catalog/grossprojekte.test.mjs`, `tests/e2e/grossprojekte.e2e.mjs`, `docs/architecture/bibliothek/GROSSPROJEKTE.md`, `packages/domain/src/catalog/build/sets/grossbauten.ts`, `packages/domain/src/catalog/build/sets/index.ts`, `packages/domain/src/catalog/ownGrossprojekt.ts`, `packages/domain/src/base/anlagenTerrain.ts`, `apps/web/src/views/library/planTerrain.tsx`, `tests/unit/catalog/plan-landscape.test.mjs`, `tests/e2e/plan-landscape.e2e.mjs`. **Abhängigkeiten:** BUILD-05, BASE-01, LIB-05. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### MAP-05

**Planung auf der Live-Karte vertiefen: Baustand aus dem Spiel (Mod 0.7.1, GET /v1/scan), Ebenen und Abweichungen auf der Karte, bestätigte Schritte abhaken, Bauabschnitte wählen, Weltplan automatisch abgleichen, Hologramm und BlueMap aus dem Kontextmenü** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Planung auf der Live-Karte vertiefen“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MAP-05-S01: Mod 0.7.1: GET /v1/scan liefert die Planbox des Hologramms als bauplaner-scan-Aufnahme in Plankoordinaten (auch gedreht/gespiegelt), hello.features.
- [x] MAP-05-S02: Karte: Baustand holen (auch alle 20 s), Vergleich wie Spielaufnahme, Speicherung im Projektverlauf, Ebenen mit Filter, Abweichungen als Spalten auf der Draufsicht, bestätigte Schritte abhaken mit Rückgängig.
- [x] MAP-05-S03: Bauabschnitte der Mod 0.7.0 im Spielpanel anzeigen und im Spiel wählen (POST /v1/section).
- [x] MAP-05-S04: Weltplan automatisch abgleichen; Kontextmenü: Hologramm hierher setzen, Stelle auf BlueMap zeigen, Projekt ins Spiel senden.
- [ ] MAP-05-S05: Abnahme durch Philipp mit Mod 0.7.1 auf server.lmnt-gaming.net.

**Abnahme:** Der Baustand aus dem Spiel ergibt dieselben Abweichungen wie eine per /bauplaner scan erzeugte Aufnahme und wie die Live-Zählung der Mod (echter Spieltest). Haken ändern sich nur auf ausdrücklichen Klick und sind ein Rückgängig-Schritt auf der Karte. Ältere Mods ohne scan bekommen einen Hinweis, keine Fehlermeldung.

**Nächste Aktion:** Abnahme durch Philipp (S05); denkbar: gedrehte Projektlagen auf der Weltkarte, damit gedrehte Hologramme übernommen werden können.

**Nur Philipp:** Auf deinem Server mit Mitspielern: „Baustand holen“ mit der Mod auf server.lmnt-gaming.net (S05).

**Prüfstand:** Einheits-, Browser- und echte Spieltests grün; Abnahme durch Philipp offen (S05).

**Nachweise:** [tests/e2e/game-progress.e2e.mjs](../tests/e2e/game-progress.e2e.mjs) — Abschnitt wählen, Baustand holen, Ebenenfilter, Kartenspalten, Abhaken + Rückgängig, Bauen-Reiter, Weltplan-Autoabgleich, Hologramm per Kontextmenü, alte Mod.; [tests/unit/building/game-check.test.mjs](../tests/unit/building/game-check.test.mjs) — layerProgress, deviationColumns, stepStatusCounts.; [scripts/mod/bridge_gametest.mjs](../scripts/mod/bridge_gametest.mjs) — Echter Spieltest Fabric/NeoForge: Baustand = Live-Zählung, falscher Block an der erwarteten Stelle, gedreht in Plankoordinaten.; [docs/architecture/team/LIVE_LINK.md](architecture/team/LIVE_LINK.md) — Protokoll, Oberfläche, Grenzen (BlueMap http).

**Dateiumfang:** `apps/web/src/views/map/`, `apps/web/src/views/project/GameCheckPanel.tsx`, `apps/web/src/styles/map.css`, `packages/domain/src/`, `mods/bauplaner-bridge/`, `downloads/mod/`, `apps/web/src/views/mod/releases.json`, `scripts/mod/bridge_gametest.mjs`, `tests/`, `docs/`. **Abhängigkeiten:** MAP-03, MAP-04, GAME-07, GAME-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### MAP-06

**Weltkarte in die Tiefe: Zonen, benannte Ebenen und Farben (Weltplan-Schema 2), Messen mit Fläche, Höhenprofil und Route übers Gelände, Marker und Mitspieler aus dem Spiel, Mod-Anbindung über Protokoll 2 (features marks2, players)** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Weltkarte in die Tiefe ausbauen“) · Zuständiger Thread: „Weltkarte in die Tiefe ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MAP-06-S01: Plan und Vertrag: Stufen festgelegt, Mod-Protokoll 2 (hello.features marks2/players) als Entwurf in LIVE_LINK.md, GAME-08 für den Mod-Thread angelegt.
- [x] MAP-06-S02: Weltplan-Schema 2: Zonen (Polygon, Art, Fläche), Ebene und Farbe je Eintrag, neue Punktarten; Schema 1 lesbar, Umkehrungen, Sicherung.
- [x] MAP-06-S03: Ebenen und Filter: benannte Ebenen zuweisen (ein Rückgängig-Schritt), ausblenden (je Browser), Objektliste nach Ebene filtern, Farben.
- [x] MAP-06-S04: Messen mit mehreren Punkten und Fläche, Höhenprofil je Weg, Route übers Gelände (A* mit Stufen-, Steigungs- und Wasserkosten, Vereinfachung).
- [x] MAP-06-S05: Marker und Spieler: Notiz/Gefahr aus dem Kontextmenü, Punkt wo ich stehe, Spur als Weg, Entfernung zum Spieler, Mitspieler auf der Karte (players).
- [x] MAP-06-S06: Zwei-Wege-Abgleich Karte ↔ Spiel: marksForMod schickt jeder Mod nur, was sie versteht, und meldet den Rest; Simulator mit Protokoll 1 und 2.
- [x] MAP-06-S07: Mod-API-Versionierung: readLiveHello nimmt Protokoll 1–2, Oberfläche schaltet über hello.features („Mod kann … fehlt …“), Protokollnummer im Panel.
- [ ] MAP-06-S08: Abnahme durch Philipp auf der Weltkarte und mit Mod GAME-08 im Spiel.

**Abnahme:** Ein Weltplan mit Schema 1 lädt unverändert; nach dem Speichern ist er Schema 2 und enthält alles Alte. Eine Mod ohne marks2 bekommt nie Zonen, neue Punktarten oder die Felder layer/color und bricht nicht; die Website nennt, was auf der Karte bleibt. Route übers Gelände ersetzt den Weg als genau einen Rückgängig-Schritt und meldet Abschnitte ohne Route statt zu raten.

**Nächste Aktion:** Abnahme durch Philipp (S08); Mod-Umsetzung GAME-08; denkbar für Protokoll 3: Markierungen aus dem Spiel zurück in den Weltplan (Zeitstempel je Eintrag).

**Nur Philipp:** Im Spiel an deinem PC: Weltkarte mit Mod 0.8.0 oder neuer im Spiel abnehmen (S08, KARTE-05/06, LIVE-08).

**Prüfstand:** Einheits- und Browsertests grün; Protokoll 2 nur gegen den Simulator; Abnahme durch Philipp offen (S08).

**Nachweise:** [tests/e2e/map-depth.e2e.mjs](../tests/e2e/map-depth.e2e.mjs) — Zonen, Ebenen, Messen, Notiz, Neuladen; alte Mod gefiltert, Höhenprofil, Route, Punkt wo ich stehe; Protokoll-2-Simulator mit Mitspielern und Zonen.; [tests/unit/world/worldroute.test.mjs](../tests/unit/world/worldroute.test.mjs) — Messung, Profil, A*-Route um Kamm/Tor/Wasser, Vereinfachung.; [tests/unit/team/livelink.test.mjs](../tests/unit/team/livelink.test.mjs) — Protokoll 1–2, marksForMod, readLivePlayers.; [docs/architecture/team/LIVE_LINK.md](architecture/team/LIVE_LINK.md) — Protokoll 2 (Entwurf) als Vertrag mit der Mod.

**Dateiumfang:** `apps/web/src/views/map/`, `apps/web/src/styles/map.css`, `packages/domain/src/world/worldPlan.ts`, `packages/domain/src/world/worldPlanEdit.ts`, `packages/domain/src/world/worldRoute.ts`, `packages/domain/src/team/liveLink.ts`, `packages/domain/src/index.ts`, `tests/unit/world/worldplan.test.mjs`, `tests/unit/world/worldbuilder.test.mjs`, `tests/unit/world/worldroute.test.mjs`, `tests/unit/team/livelink.test.mjs`, `tests/e2e/map-depth.e2e.mjs`, `tests/e2e/modSimulator.mjs`, `apps/web/src/testing/testplan.ts`, `docs/`. **Abhängigkeiten:** MAP-04, MAP-05, GAME-07. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### MAP-07

**Gedrehte und gespiegelte Projektlagen auf der Weltkarte: dieselbe Regel wie das Hologramm der Mod, gedrehtes Hologramm übernehmen, Plan gedreht ins Spiel** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Module und Systeme komplex ausarbeiten“) · Zuständiger Thread: „Module und Systeme komplex ausarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] MAP-07-S01: Weltlage mit optionaler Drehung/Spiegelung (turns 1–3, mirror), Regel wie Placement.java (Spiegeln X, dann (x,z)→(−z,x) auf Blockpositionen), Blockzustände über den Voxelkern.
- [x] MAP-07-S02: Weltkarte zeichnet gedreht (Zellen, Zustände, Grenzen, Überschneidungen, placementsJson); R/Kontextmenü/Spiegeln drehen Projekte um ihre Nordwestecke; Weltlage-Formular mit Drehung.
- [x] MAP-07-S03: Mod: Plan gedreht senden, gedrehtes Hologramm übernehmen, Vergleich nur bei anderer Drehung; Baustand-Abweichungen, Bauführung (Weltkoordinaten), Teamdatei (Abschnittsboxen), Geländeprüfung gedreht.
- [ ] MAP-07-S04: Abnahme KARTE-07 im Spiel.

**Abnahme:** Ungedrehte Lagen bleiben Feld für Feld gleich (keine neuen Felder). Eine Weltposition ist für Karte, Mod-Hologramm, Bauführung und Teamdatei dieselbe. Wo eine Funktion nur ungedreht rechnen kann (Server-Plugin-Plan, Geländebauteil, Anlagen ans Gelände), sagt der Planer das statt falsch zu rechnen.

**Nächste Aktion:** Abnahme KARTE-07; Server-Plugin könnte Pläne gedreht ablegen (Thread „Mod, Server und Client mit Fallbacks ausbauen“).

**Nur Philipp:** Im Spiel an deinem PC: Ein Projekt auf der Weltkarte drehen, ins Spiel senden und mit F3 prüfen; ein im Spiel gedrehtes Hologramm übernehmen (KARTE-07).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme im Spiel offen (S04).

**Nachweise:** [tests/unit/world/world-turn.test.mjs](../tests/unit/world/world-turn.test.mjs) — 5 Fälle: Regel gegen die Mod-Formel für alle 8 Lagen, Prüfung/Drehen an Ort, Weltkarte mit Zuständen und Überschneidungen, Hologramm/Plan/Teamdatei, Baustand/Bauführung/Geländebox.; [tests/e2e/world-turn.e2e.mjs](../tests/e2e/world-turn.e2e.mjs) — Chromium: Drehung im Formular, R an Ort und Stelle, Rückgängig, zurück auf ungedreht.

**Dateiumfang:** `packages/domain/src/world/worldmap.ts`, `packages/domain/src/world/terrain.ts`, `packages/domain/src/team/liveLink.ts`, `packages/domain/src/building/gameCheck.ts`, `packages/domain/src/building/buildRun.ts`, `packages/domain/src/team/team.ts`, `apps/web/src/views/map/WorldMapView.tsx`, `apps/web/src/views/map/PlacementForm.tsx`, `apps/web/src/views/map/GameProgress.tsx`, `apps/web/src/views/project/TerrainTab.tsx`, `apps/web/src/views/project/LandscapeTab.tsx`, `apps/web/src/views/project/buildrun/AnchorBar.tsx`, `apps/web/src/views/library/AnlagenPage.tsx`, `apps/web/src/views/library/BasePage.tsx`, `tests/unit/world/world-turn.test.mjs`, `tests/e2e/world-turn.e2e.mjs`, `docs/architecture/welt/WORLDMAP.md`, `docs/TESTING.md`. **Abhängigkeiten:** MAP-05, MAP-04, GAME-07. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### QA-04

**Große Testphase: Checklisten je Bereich, Testprotokoll, Fehlerberichte mit Diagnose (Planer und Mod), Triage** · 🧩 Implementiert · Abnahme offen · Priorität P0 · Verantwortlich: Claude (Thread „Große Testphase vorbereiten und betreuen“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] QA-04-S01: Testplan (eine Quelle: testplan.ts → TESTPLAN.md) mit Kern-/vertieften Fällen für alle Planer-Bereiche und die Mod.
- [x] QA-04-S02: Seite #/testphase: Checklisten mit Protokoll im Browser, Protokoll-Export, Fehlerbericht mit automatischer Diagnose (Umgebung, Fehlerprotokoll, Konsole, Seiten) und GitHub-Issue-Vorbelegung.
- [x] QA-04-S03: Mod: /bauplaner diagnose (Datei + Zwischenablage, geschwärzt) mit Tastenkonflikten, Shader, Hologramm-Zustand, Logauszug.
- [x] QA-04-S04: GitHub-Issue-Formulare „Testphase: Planer“ und „Testphase: Mod“.
- [ ] QA-04-S05: Testphase starten (alle laufenden Blöcke auf main, Mod-Version mit diagnose veröffentlicht), Tester einladen.
- [ ] QA-04-S06: Eingehende Berichte sichten, beheben, Testprotokolle auswerten; Abschluss mit Liste der offenen Punkte.

**Abnahme:** Jeder Kernfall ist ohne Vorwissen nachspielbar und nennt ein beobachtbares Ergebnis. Ein Fehlerbericht aus dem Planer enthält Build, Browser, Grafik und Fehlerprotokoll, aber keine Projektdaten. Der Mod-Diagnosebericht nennt Version, Loader, Modliste, Tastenkonflikte und Hologramm-Zustand; Benutzerordner und Adressen sind geschwärzt.

**Nächste Aktion:** Testphase starten, sobald die laufenden Threads gemerged sind und die Mod mit diagnose veröffentlicht ist.

**Nur Philipp:** Auf deinem Server mit Mitspielern: Testphase mit weiteren Testern: erst die Kernfälle auf #/testphase.

**Verwaist (ohne Bearbeiter):** Der Thread „Große Testphase vorbereiten und betreuen“ ist beendet; die rund 30 Pakete, bei denen nur Philipps Abnahme fehlt, haben keinen aktiven Thread für Diagnose und Fehlerbehebung.

**Prüfstand:** Abnahme durch Tester steht aus (ist Zweck der Testphase).

**Nachweise:** [tests/unit/web/testphase.test.mjs](../tests/unit/web/testphase.test.mjs) — Testplan-Konsistenz, Protokoll, Fehlerbericht, Issue-Adresse gegen die Vorlage.; [tests/e2e/testphase.e2e.mjs](../tests/e2e/testphase.e2e.mjs) — Checklisten, Neuladen, Fehlerbericht mit echtem Fehler und Konsole im Chromium.; [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/DiagnosticsTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/DiagnosticsTest.java) — Logauswahl, Schwärzen, Berichtstext.

**Dateiumfang:** `apps/web/src/testing/`, `apps/web/src/app/diagnostics.ts`, `scripts/checks/render_testplan.mjs`, `docs/testing/TESTPLAN.md`, `docs/architecture/betrieb/TESTPHASE.md`, `.github/ISSUE_TEMPLATE/`, `tests/unit/web/testphase.test.mjs`, `tests/e2e/testphase.e2e.mjs`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/Diagnostics.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramDiagnose.java`. **Abhängigkeiten:** QA-01, STAB-01, GAME-07. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GEN-03

**Kolosseum aus Philipps Bauplan: Arena-Generator, Bauset Antike und Großprojekt Kolosseum-Viertel** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Projekt aus ChatGPT-Verlauf ausarbeiten“) · Zuständiger Thread: „Große Testphase vorbereiten und betreuen“ · Aktualisiert: 2026-11-06T09:18:45.680Z

- [x] GEN-03-S01: Bauplan aus Philipps ChatGPT-Verlauf übernehmen (81 × 61, vier Etagen à 8, Ellipsen-Ringe, Arena, 8 Sitzreihen, 4 Tore, Hypogäum Y 55–63, Materialien).
- [x] GEN-03-S02: Generator „Arena“ (ovale Ringe nach Tiefe, Bögen nach Bogenlänge, Wandelgang mit Treppen, zwei Ränge auf Gewölben, Tore mit Wegeanschluss weg_5, Hypogäum, Velarium) mit sechs Vorlagen.
- [x] GEN-03-S03: Bauset Antike: Kolosseum, Provinzarena, Kaiserlicher Ehrenbogen, Ehrensäule, Tabernae, Thermen, Gladiatorenschule; Ensemble Kolosseumsplatz.
- [x] GEN-03-S04: Großprojekt „Kolosseum-Viertel“ (9 Quartiere, 30 Gebäude, 4 Phasen) auf dem Großprojekt-Typ GROSS-01.
- [ ] GEN-03-S05: Abnahme im Spiel durch Philipp: Kolosseum exportieren und aufstellen (Testfall BIB-14).
- [x] GEN-03-S06: Feinschliff Kolosseum (Generator v2): Statuen auf Sockeln in jedem zweiten Attikafenster, zwei Treppen aus dem Hypogäum auf den Arenaboden; Spielprüfung, festgehaltener Hash neu.

**Abnahme:** Vorlage „Kolosseum“ hält die Maße des Bauplans, alle Bauten bestehen Spielprüfung, Material-/Rezeptprüfung und B7-Zustände; das Großprojekt hat keine Voxelkonflikte und ein zusammenhängendes Straßennetz.

**Nächste Aktion:** Philipp baut das Kolosseum im Spiel nach (BIB-14, mit Statuen und Hypogäum-Treppen).

**Nur Philipp:** Im Spiel an deinem PC: Kolosseum exportieren und im Spiel aufstellen (BIB-14).

**Prüfstand:** Node-Prüfung bestanden; Browser- und Spielabnahme siehe TESTING.md.

**Nachweise:** [tests/unit/catalog/generators.test.mjs](../tests/unit/catalog/generators.test.mjs) — Arena in allen Generatorprüfungen (Vorlagen, Stile, Zufallswerte, Bereichsenden, Spielprüfung, Material, Anschlüsse, festgehaltener Hash).; [tests/unit/catalog/grossprojekte.test.mjs](../tests/unit/catalog/grossprojekte.test.mjs) — Kolosseum-Viertel automatisch geprüft: echte Bauteile, keine Voxelkonflikte, Straßennetz, Phasen, Übernahme.; [docs/architecture/bibliothek/GENERATORS.md](architecture/bibliothek/GENERATORS.md) — Abschnitt GEN-03 Arena mit Aufbau, Parametern und Grenzen.

**Dateiumfang:** `packages/domain/src/catalog/generators/arena.ts`, `packages/domain/src/catalog/generators/index.ts`, `packages/domain/src/catalog/build/sets/antike.ts`, `packages/domain/src/catalog/build/sets/index.ts`, `packages/domain/src/catalog/ensembles.ts`, `packages/domain/src/catalog/grossprojekte/kolosseum.ts`, `packages/domain/src/catalog/grossprojekte/index.ts`, `tests/unit/catalog/generators.test.mjs`, `tests/e2e/generators.e2e.mjs`, `tests/e2e/grossprojekte.e2e.mjs`, `apps/web/src/testing/testplan.ts`, `docs/architecture/bibliothek/GENERATORS.md`, `docs/architecture/bibliothek/CATALOG.md`, `docs/architecture/bibliothek/GROSSPROJEKTE.md`. **Abhängigkeiten:** GEN-02, GROSS-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### SIZE-01

**Volumenlimit für große Builds: eine zentrale Größengrenze (4 Mio. Zellen, 16,7 Mio. Box) für Import, Werkstatt, Export, Aufnahmen und Mod-Übertragung; Hinweise statt Abbruch; Mod 0.9.0 lädt große Pläne ohne Hänger** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Volumenlimit für große Builds aufheben“) · Zuständiger Thread: „Volumenlimit für große Builds aufheben“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] SIZE-01-S01: Bestandsaufnahme aller harten Größen-/Blockgrenzen in Planer und Mod, Messung von Speicher und Zeit bei 1–4 Mio. Zellen.
- [x] SIZE-01-S02: Planer: zentrale Grenzen in sizeLimits.ts, Importe ohne Kopie (adoptPayload), Luft ab 250.000 Zellen Box unausgewählt, Werkstatt 4 Mio./1 Mio. je Schritt mit linearer Umkehrung und Rückgängig-Budget, Export/Aufnahmen bis 16,7 Mio. Box, Größenhinweise.
- [x] SIZE-01-S03: Übertragung: SectionRuns statt einem Byte je Boxzelle, Prüfung gegen die verbundene Mod (Fähigkeit bigplans), Dateien bis 64 MB, passende Wartezeit.
- [x] SIZE-01-S04: Mod 0.9.0 (Fabric, NeoForge): Plan einmal entpacken, 6 Byte je Planblock, LiveCheck ohne Objekt je Block mit Abschnittszählung, Laden/Verschieben großer Pläne im Hintergrund, Baustand in Scheiben, Render-Budget /bauplaner leistung, Diagnose.
- [ ] SIZE-01-S05: Abnahme durch Philipp in der Testphase (DATEI-05, WERK-07, MOD-11, MOD-15, LIVE-09) mit einem echten großen Bau im Spiel.

**Abnahme:** Schem/Litematic bis 16,7 Mio. Zellen Box und 4 Mio. Blöcke importieren, bearbeiten, exportieren und ins Spiel senden, ohne harte Grenze darunter. Über der Grenze eine Meldung mit Rat (teilen) statt Abbruch ohne Erklärung; darunter nur Hinweise. Ältere Mods bekommen nur Pläne, die sie laden können; die Website sagt es vor dem Senden. Mod: 3 Mio. Blöcke Live-Abgleich in unter einer Sekunde, Verschieben großer Hologramme ohne Spielhänger.

**Nächste Aktion:** Abnahme durch Philipp (S05) mit einem großen Bau im Spiel.

**Nur Philipp:** Im Spiel an deinem PC: Großen Bau (Olympus) ins Spiel senden und prüfen (DATEI-05, MOD-11, MOD-15, LIVE-09). Entscheiden oder Rückfrage beantworten: Im Thread beschreiben, was beim Senden falsch ankommt.

**Prüfstand:** Node- und JUnit-Tests grün, Spieltests Fabric/NeoForge/Modpack; Abnahme durch Philipp mit einem großen Bau offen (S05).

**Nachweise:** [tests/unit/core/size-limits.test.mjs](../tests/unit/core/size-limits.test.mjs) — Grenzen, Stufen, großer Schem-Import ohne Luft, SectionRuns, lineare Werkstattschritte, Rückgängig-Budget, Prüfung gegen alte/neue Mod.; [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/BigPlanTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/BigPlanTest.java) — 6,3 Mio. Box / 3,1 Mio. Blöcke laden und abgleichen, SectionRuns = SectionCells, Ablehnung zu großer Pläne.; [docs/architecture/kern/SIZE_LIMITS.md](architecture/kern/SIZE_LIMITS.md) — Grenzen vorher/jetzt, Messwerte, Umbau Website und Mod.

**Dateiumfang:** `packages/voxel/src/sizeLimits.ts`, `packages/voxel/src/validation.ts`, `packages/formats/src/schem.ts`, `packages/formats/src/litematic.ts`, `packages/formats/src/worldExcerpt.ts`, `packages/formats/src/schemWrite.ts`, `packages/formats/src/litematicWrite.ts`, `packages/formats/src/scan.ts`, `packages/domain/src/editor/draft.ts`, `packages/domain/src/team/liveLink.ts`, `packages/application/src/revisionExport.ts`, `packages/application/src/scanPersistence.ts`, `apps/web/src/app/SizeNotice.tsx`, `apps/web/src/app/importLimits.ts`, `apps/web/src/jobs/importJob.ts`, `apps/web/src/editor/BlockEditor.tsx`, `apps/web/src/views/map/WorldMapView.tsx`, `apps/web/src/views/map/liveClient.ts`, `mods/bauplaner-bridge/`, `tests/unit/core/size-limits.test.mjs`, `docs/architecture/kern/SIZE_LIMITS.md`. **Abhängigkeiten:** PERF-04, ARCH-02, GFX-01, GAME-08. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-01

**Teambau im Planer: Teamprotokoll ohne Backend (Rollen, Abschnittsvergabe, Meldungen, Beiträge, Notizen, Planfreigabe), Teampaket, Meldecode, Reiter „Team“** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gemeinsames Bauen mehrerer Spieler ermöglichen“) · Zuständiger Thread: „Gemeinsames Bauen mehrerer Spieler ermöglichen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] COOP-01-S01: Konzept TEAMBAU.md: Rollen, Ereignismodell, Konfliktregeln, Austauschwege, Plugin, Mod, Nachweis, Lager, Freigabe, Einstieg, was nur Philipp tun kann.
- [x] COOP-01-S02: Domäne team.ts: Ereignisse, Prüfung, Faltung mit Rechten, Zusammenführen, Meldecode, Teampaket, Statustext, Serverdatei, Planübernahme; site.team in checkSite.
- [x] COOP-01-S03: Reiter „Team“ und „Teampaket öffnen“ mit Vorschau vor jedem Einlesen.
- [x] COOP-01-S04: Bauleute aus PROJ-01 mit Spielernamen verknüpfen und Zuweisungen in den Zeitplan spiegeln.
- [ ] COOP-01-S05: Abnahme mit Mitspielern (TEAMBAU-01…05).

**Abnahme:** Zwei Browser tauschen Pakete/Codes in beliebiger Reihenfolge und kommen zum selben Stand; doppelte Übernahme und fehlende Rechte werden gezeigt; nichts geht verloren. Kein Backend, keine Konten, kein automatischer Versand nach außen.

**Nächste Aktion:** Abnahme durch Philipp mit Mitspielern (TEAMBAU-01…05).

**Nur Philipp:** Auf deinem Server mit Mitspielern: Mit Mitspielern TEAMBAU-01…05. Entscheiden oder Rückfrage beantworten: Weg für den Live-Abgleich ohne Herunter- und Hochladen wählen (Rückfrage im Thread).

**Prüfstand:** 12 Domänentests und Browsertest mit zwei getrennten Browsern (1400/390 px) grün; Abnahme mit echten Mitspielern offen.

**Nachweise:** [tests/unit/team/team.test.mjs](../tests/unit/team/team.test.mjs) — Faltung, Rechte, Zusammenführen vertauschbar/idempotent, Meldecode, Teampaket, Statustext.; [tests/e2e/team.e2e.mjs](../tests/e2e/team.e2e.mjs) — Zwei Browser: Paket mit Plan, Meldecode, Doppelübernahme, Bestätigen, Neuladen, Rückgängig.

**Dateiumfang:** `packages/domain/src/team/team.ts`, `packages/domain/src/building/site.ts`, `apps/web/src/views/project/team/TeamTab.tsx`, `apps/web/src/views/project/team/TeamExchange.tsx`, `apps/web/src/views/project/team/TeamOpen.tsx`, `apps/web/src/styles/team.css`, `tests/unit/team/team.test.mjs`, `tests/e2e/team.e2e.mjs`, `docs/architecture/team/TEAMBAU.md`, `packages/domain/src/planning/program.ts`. **Abhängigkeiten:** BUILD-06, BACKUP-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-02

**Paper-Plugin als Teamknoten: Teambefehle ohne Mod und Planer, Aktionsleiste, Schutz in fremden Abschnitten, Umriss, Ausfuhr ins Teamprotokoll** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gemeinsames Bauen mehrerer Spieler ermöglichen“) · Zuständiger Thread: „Gemeinsames Bauen mehrerer Spieler ermöglichen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] COOP-02-S01: TeamLog (Faltung wie team.ts) und TeamModule (Befehle, Aktionsleiste, Schutz, Partikel, Ausfuhr), Rechte und config.yml.
- [x] COOP-02-S02: Echter Servertest Paper 1.18.2, 1.21.4 und 26.3: Planer-Faltung der Ausfuhr = Serverstand.
- [x] COOP-02-S03: Plugin-Jar mit Teammodul auf der Download-Seite veröffentlichen.
- [ ] COOP-02-S04: Abnahme auf Philipps Paper-Server mit Mitspielern (TEAMBAU-06).

**Abnahme:** Plugin verändert die Welt nie; Schutz verhindert höchstens Blockänderungen in fremden Abschnitten und ist abschaltbar. Ereignisse vom Server tragen die echte Spieleridentität und die Herkunft server.

**Nächste Aktion:** Abnahme auf Philipps Server.

**Nur Philipp:** Auf deinem Server mit Mitspielern: Plugin auf deinem Paper-Server, TEAMBAU-06 mit Mitspielern.

**Prüfstand:** Servertest mit Konsolenbefehlen auf drei Paper-Versionen bestanden; Aktionsleiste, Partikel und Schutz brauchen echte Spieler.

**Nachweise:** [scripts/mod/bridge_paperteam.mjs](../scripts/mod/bridge_paperteam.mjs) — Baustag auf echtem Paper-Server, Neustart, Ausfuhr, Vergleich mit teamView.

**Dateiumfang:** `mods/bauplaner-bridge/paper/`, `scripts/mod/bridge_paperteam.mjs`, `scripts/mod/test_bridge_paper_team.sh`. **Abhängigkeiten:** COOP-01, GAME-04. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-03

**Teamabgleich live über die Mod (Merkmal team, Plugin-Kanal bauplaner:team), Abschnitte in Inhaberfarbe im Hologramm** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Teambau in der Mod“) · Zuständiger Thread: „Teambau und Befehle in der Mod ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] COOP-03-S01: Vertrag mit dem Mod-Thread abstimmen (Vorschlag TEAMBAU.md §7).
- [x] COOP-03-S02: Mod, Plugin und Website umsetzen, Spieltest.
- [ ] COOP-03-S03: Abnahme im Spiel auf Philipps Server (TEAMBAU-09): Kanal mit echtem Paper-Plugin, Meldungen mehrerer Spieler.

**Abnahme:** Ohne Plugin oder ohne /bauplaner team erlauben sendet die Mod nichts an den Server; pull/push antworten 409 mit Grund. Teamstand vom Planer erscheint im Spiel (Abschnitte in Inhaberfarbe, Mein Auftrag), Meldungen aus dem Spiel kommen als Ereignisse von „Ich bin“ zurück und werden mit Vorschau übernommen und quittiert. Der Planer schreibt nie stellvertretend für andere; das Plugin setzt Urheber und Zeit selbst.

**Nächste Aktion:** Abnahme TEAMBAU-09 auf Philipps Server mit Mod 0.10.0 und Paper-Plugin mit Teamkanal; Lagerkisten (COOP-04) über TeamChannel.decorate/broadcastStore.

**Nur Philipp:** Auf deinem Server mit Mitspielern: TEAMBAU-09: aktuelle Mod und aktuelles Plugin (ab 0.10.0) zusammen auf deinem Server.

**Prüfstand:** Spieltests Fabric und NeoForge 26.3, Paper-26.3-Servertest mit eingeschaltetem Kanal und Browsertest bestanden; der Kanal selbst mit echtem Client gegen echtes Paper-Plugin ist nur auf Philipps Server prüfbar (TEAMBAU-09).

**Nachweise:** [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/TeamTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/TeamTest.java) — Teamstand, Ausgang, Planzuordnung, Rahmen, Kanalregel (nichts ohne Ankündigung und Erlaubnis).; [scripts/mod/bridge_gametest.mjs](../scripts/mod/bridge_gametest.mjs) — Echter Fabric-Client 26.3: Teamstand vom Planer, nehmen 2, mein, Übernahme im Ausgang, 409 ohne Server. NeoForge-Spieltest grün.; [tests/e2e/team-live.e2e.mjs](../tests/e2e/team-live.e2e.mjs) — Browser gegen Mod-Simulator: Vorschau, Übernehmen, Quittung, Server-Meldungen, Rückgängig (1400/390 px).; [tests/unit/team/team-link.test.mjs](../tests/unit/team/team-link.test.mjs) — Format team-link, Lesen der Mod-Antworten, Fehlercodes.

**Dateiumfang:** `mods/bauplaner-bridge/`, `packages/domain/src/team/teamLink.ts`, `packages/application/src/revisionExport.ts`, `apps/web/src/views/project/team/TeamLive.tsx`, `apps/web/src/views/project/team/TeamTab.tsx`, `apps/web/src/views/map/liveClient.ts`, `apps/web/src/views/mod/`, `apps/web/src/testing/testplan.ts`, `scripts/mod/bridge_gametest.mjs`, `tests/`, `docs/`. **Abhängigkeiten:** COOP-02, GAME-08. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-04

**Baunachweis je Spieler (Plugin zählt Blöcke in Abschnittsboxen), Lagerkisten des Teams zählen, Bestand ins Baustellen-Lager übernehmen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gemeinsames Bauen mehrerer Spieler ermöglichen“) · Zuständiger Thread: „Gemeinsames Bauen mehrerer Spieler ermöglichen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] COOP-04-S01: Zähler je Spieler mit Datenschutzschalter.
- [x] COOP-04-S02: Lagerkisten lesen und Lieferungen buchen ohne Doppelzählung.
- [x] COOP-04-S03: Bereich „Baunachweis & Lager“ im Reiter Team, Bestand ins Baustellen-Lager.
- [ ] COOP-04-S04: Abnahme mit echten Spielern auf Philipps Server (TEAMBAU-07/08).

**Abnahme:** Selbstmeldung, Bestätigung und Spielnachweis bleiben getrennt sichtbar.

**Nächste Aktion:** Abnahme TEAMBAU-07/08 auf Philipps Server; Vertiefung in COOP-05 (geprüfte Lagerkisten, docs/architecture/LAGERKISTEN.md).

**Nur Philipp:** Auf deinem Server mit Mitspielern: TEAMBAU-07/08 mit echten Spielern.

**Prüfstand:** Servertest auf fünf Paper-Versionen und Browsertest bestanden; Zählen beim Bauen und Schließen braucht echte Spieler.

**Nachweise:** [scripts/mod/bridge_paperteam.mjs](../scripts/mod/bridge_paperteam.mjs) — Echte Kiste, Zählungen, Baunachweis und Abschalten auf Paper 1.18.2 bis 26.3; Planer-Faltung = Server.; [tests/unit/team/team.test.mjs](../tests/unit/team/team.test.mjs) — Faltung Baunachweis und Lagerkisten.

**Dateiumfang:** `mods/bauplaner-bridge/paper/`, `packages/domain/src/team/team.ts`, `apps/web/src/views/project/team/TeamProof.tsx`. **Abhängigkeiten:** COOP-02, LAGER-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-05

**Geprüfte Lagerkisten im Paper-Plugin: markieren und zuordnen, Sollstand und Prüfsumme, Schutzstufen, Buchungen je Spieler, Abgleich mit dem Materialbedarf** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Server-Plugin mit geprüften Lagerkisten“) · Zuständiger Thread: „Mod-Werkzeuge und Planer-Anbindung erweitern“ · Aktualisiert: 2026-11-06T09:35:19.769Z

- [x] COOP-05-S01: Konzept LAGERKISTEN.md, reine Regeln StoreLedger/StoreIndex mit Unit-Tests.
- [x] COOP-05-S02: StorageModule: Markieren, Schutzstufen bei Klicks/Trichtern/Explosionen/Abbau/Anbau, Buchungen je Öffnen, Prüfen gegen Sollstand, Siegeln, Bedarf, Verlauf.
- [x] COOP-05-S03: Planer: store.config/move/check/seal falten, Lagerkisten mit Status, Abweichung und Buchungen im Reiter Team.
- [x] COOP-05-S04: Lagerstände über den Team-Raum an die Mod: Plugin-Zählung oder im Spiel gesehener Inhalt (mit * markiert), Spalte „Lager“ im Materialfenster, /bp lager mit Quelle.
- [ ] COOP-05-S05: Abnahme LAGER-01…09 mit echten Spielern auf Philipps Server.

**Abnahme:** Jede Abweichung zwischen Zählung und Sollstand bleibt sichtbar, bis ein Baumeister siegelt; Buchungen je Spieler und Trichter stimmen mit dem Inhalt; das Plugin verändert nie Kisteninhalte.

**Nächste Aktion:** Abnahme LAGER-01…09 und LAGER-11 auf Philipps Server.

**Nur Philipp:** Auf deinem Server mit Mitspielern: LAGER-01…09 mit echten Spielern. Im Spiel an deinem PC: LAGER-11: Lagerstand im Materialfenster der Mod.

**Prüfstand:** Servertests und Unit-Tests bestanden; Inventarklicks, Schutz und Buchungen beim Schließen brauchen echte Spieler (LAGER-02…06).

**Nachweise:** [scripts/mod/bridge_paperlager.mjs](../scripts/mod/bridge_paperlager.mjs) — Echter Server 1.18.2, 1.21.4, 26.3: Abweichung, Siegel, Trichter, TNT, Doppelkiste, fehlende Kiste, Bedarf, Sammelauftrag, Neustart; Planer-Faltung = Server.; [tests/unit/team/lager.test.mjs](../tests/unit/team/lager.test.mjs) — Faltung, Rechte, Herkunft und Prüfung der neuen Arten.; [mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndexTest.java](../mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndexTest.java) — Unit-Tests der Rechte-Matrix, Differenzen, Prüfsumme und Faltung (StoreIndex).; [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomStockTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomStockTest.java) — Raum-Faltung store.* und store.seen → Lagerstand der Mod, Summen je Dimension, fehlende Kisten ausgelassen.

**Dateiumfang:** `mods/bauplaner-bridge/paper/`, `packages/domain/src/team/team.ts`, `apps/web/src/views/project/team/TeamProof.tsx`, `docs/architecture/team/LAGERKISTEN.md`, `scripts/mod/bridge_paperlager.mjs`, `apps/web/src/testing/testplan.ts`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/StoreStock.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomState.java`. **Abhängigkeiten:** COOP-04. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-06

**Teamplanung im Planer: Arbeitspakete, Zuteilung, Zeitplan, Material je Spieler, Fortschritt mit Hinweisen, Konflikthilfe, Planstand-Vergleich, Übergabe und Abwesenheit** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gemeinsames Bauen im Planer vertiefen“) · Zuständiger Thread: „Server-Plugin mit geprüften Lagerkisten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] COOP-06-S01: Domäne teamPlan.ts: Arbeitspakete teilen, Abhängigkeiten, Zuteilungsvorschlag, Zeitplan, Material je Spieler, Fortschritt/Achtung, Konflikthilfe, Planstand-Vergleich, Rechteübersicht.
- [x] COOP-06-S02: Teamprotokoll: section.handover/accept/decline, member.away, issue.ack; Bedarf je Abschnitt in der Serverdatei.
- [x] COOP-06-S03: Reiter Team: Bereiche Planung, Fortschritt, Rechte & Übergabe; Hinweise mit Ein-Klick-Lösung.
- [x] COOP-06-S04: Plugin faltet die neuen Arten in TeamLog.java; Befehle /bp uebergeben, annehmen, ablehnen, abwesend, zurueck; Teamkanal nimmt sie an.
- [ ] COOP-06-S05: Abnahme mit Mitspielern an einem großen Bau (TEAMBAU-21…24).

**Abnahme:** Teilen ändert die Abdeckung nicht und ist ein Rückgängig-Schritt; das erste Paket behält die Abschnitts-ID. Übergabe wechselt den Inhaber erst nach Annahme; Faltung bleibt reihenfolgeunabhängig. Zeitplan und Mengen sind als Planungshilfe gekennzeichnet.

**Nächste Aktion:** Plugin-Faltung der neuen Arten (Plugin-Thread); Abnahme durch Philipp mit Mitspielern.

**Nur Philipp:** Auf deinem Server mit Mitspielern: TEAMBAU-21…24 mit Mitspielern an einem großen Bau.

**Prüfstand:** Automatisch geprüft; Abnahme mit echten Mitspielern offen.

**Nachweise:** [tests/unit/team/teamPlan.test.mjs](../tests/unit/team/teamPlan.test.mjs) — 13 Fälle: Teilen, Zuteilung, Zeitplan, Material, Fortschritt, Konflikte, Vergleich, Übergabe, Abwesenheit, Serverdatei.; [tests/e2e/teamplan.e2e.mjs](../tests/e2e/teamplan.e2e.mjs) — Browser 1400/390 px: teilen, zuweisen, Zeitplan, Material, Fortschritt, Vergleich, Übergabe, Abwesenheit, Bauleitung übergeben.

**Dateiumfang:** `packages/domain/src/team/teamPlan.ts`, `packages/domain/src/team/team.ts`, `apps/web/src/views/project/team/TeamPlan.tsx`, `apps/web/src/styles/teamplan.css`, `tests/unit/team/teamPlan.test.mjs`, `tests/e2e/teamplan.e2e.mjs`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`, `scripts/mod/bridge_paperteam.mjs`. **Abhängigkeiten:** COOP-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROJ-01

**Projektplanung für große Projekte: Meilensteine mit Terminen, Abhängigkeiten zwischen Bauabschnitten (Vorschläge aus Geometrie und Anschlüssen), Bauleute mit Zuweisung, Zeitplan über Bautage mit kritischem Pfad, Bedarf je Meilenstein und Bauleute, Vorlagen aus Phasen-Abschnitten** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Projektmodul vertiefen“) · Zuständiger Thread: „Projektmodul vertiefen“ · Aktualisiert: 2026-11-06T09:06:53.011Z

- [x] PROJ-01-S01: Datensatz project.site.program (Bauleute, Meilensteine, Abhängigkeiten azyklisch, Zuweisungen, Start, Bautage je Woche) mit Prüfung, Rückgängig über site.set, Sicherung und Datencheck.
- [x] PROJ-01-S02: Zeitplan: Spur je Bauleute, gemeinsames Tempo bei geteilten Abschnitten, Abhängigkeiten, kritischer Pfad, Kalender mit Bautagen je Woche, Meilensteinstatus und Bedarf je Meilenstein/Bauleute.
- [x] PROJ-01-S03: Vorschläge: Abhängigkeiten aus Schrittvoraussetzungen und Anschlüssen; Programmvorlagen Phasen/Reihenfolge/Etappen aus den Bauabschnitten.
- [x] PROJ-01-S04: Reiter „Planung“ (Balkenplan, Meilensteine, Abhängigkeiten, Bauleute mit Zuweisungsmatrix und Bauzettel, Einstellungen, Bauprogramm als Text) und Meilenstein-Chip in der Projektzentrale.
- [ ] PROJ-01-S05: Abnahme durch Philipp in der Testphase (PROJ-09…11); Folgeideen: Abhängigkeiten zwischen Projekten auf der Weltkarte, Bauleute aus dem Spiel (Mitspieler), Lagerbuchungen je Bauleute (TEAM-03).

**Abnahme:** Abhängigkeiten sind azyklisch; ein Kreis wird mit lesbarer Meldung abgelehnt; entfernte Abschnitte verschwinden aus Meilensteinen, Abhängigkeiten und Zuweisungen. Zeitplan rechnet nur mit Restbedarf der nicht abgehakten Schritte und dem Bautempo; abgehakte Abschnitte brauchen keine Bautage; Daten sind als Projektion gekennzeichnet. Keine zweite Geometrie-, Schritt- oder Materiallogik: Bedarf je Meilenstein ist die Summe der Abschnittspläne der Baustelle.

**Nächste Aktion:** Abnahme durch Philipp (S05); danach Lagerbuchungen je Bauleute und Mitspieler aus dem Spiel.

**Nur Philipp:** Im Planer abnehmen: Reiter „Planung“ abnehmen (PROJ-09…11).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme durch Philipp offen (S05).

**Nachweise:** [tests/unit/planning/program.test.mjs](../tests/unit/planning/program.test.mjs) — 9 Fälle: Prüfung (Kreise, Daten, Bauleute), Bearbeiten/Rückgängig/Bereinigen, Befunde, Vorschläge aus Geometrie und Anschlüssen, Vorlagen Phasen/Kette/Etappen, Kalender, Zeitplan mit Spuren/kritischem Pfad/Meilensteinen/Texten, Sicherung, Großprojekt aus der Bibliothek (GROSS-01) mit Phasen-Meilensteinen.; [tests/e2e/program.e2e.mjs](../tests/e2e/program.e2e.mjs) — Chromium 1400/390 px: Vorschläge übernehmen, Kreis abgelehnt, Meilenstein mit Abschnitten und Status, zwei Bauleute mit Zuweisung, Bauzettel, Startdatum, Textdatei, Neuladen, Projektkarte.; [docs/architecture/planer/PROGRAM.md](architecture/planer/PROGRAM.md) — Datenmodell, Zeitplanregeln, Vorschläge, Oberfläche, Grenzen.

**Dateiumfang:** `packages/domain/src/planning/program.ts`, `packages/domain/src/building/site.ts`, `apps/web/src/views/project/PlanningTab.tsx`, `apps/web/src/styles/planning.css`, `apps/web/src/views/ProjectsView.tsx`, `tests/unit/planning/program.test.mjs`, `tests/e2e/program.e2e.mjs`, `docs/architecture/planer/PROGRAM.md`. **Abhängigkeiten:** BUILD-01, BUILD-06, BACKUP-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-09

**Bauplaner-Brücke auf Modrinth: Projekt „Bauplaner Bridge“ (Fabric, NeoForge, Paper-Plugin) mit Text, Icon, Bildern, Änderungsliste und Hochladeskript; jede Mod-Veröffentlichung lädt die neue Version hoch** · 🚧 In Arbeit · Priorität P2 · Verantwortlich: Claude (Thread „Mod auf Modrinth veröffentlichen“) · Zuständiger Thread: „Mod auf Modrinth veröffentlichen“ · Aktualisiert: 2026-11-06T14:23:13.593Z

- [x] GAME-09-S01: Projektdaten: project.json (Slug, Titel, Kurztext, Kategorien, Seiten, Lizenz, Links, Loader, Abhängigkeit Fabric API), DESCRIPTION.md Englisch + Deutsch, Icon 512 px, 6 Bilder aus den Spieltests.
- [x] GAME-09-S02: scripts/modrinth_publish.mjs check|plan|create|sync|release: Dateien aus releases.json mit SHA-256-Vergleich, Änderungsliste aus CHANGELOG.md je Version, Token nur aus MODRINTH_TOKEN; Offline-Prüfung in npm test, Ablauf gegen nachgebaute API geprüft.
- [x] GAME-09-S03: Philipp bestätigt Name, Beschreibung, Sichtbarkeit öffentlich (03.11.2026) und Lizenz MIT; MODRINTH_TOKEN in der Cloud-Umgebung (keine Actions).
- [ ] GAME-09-S04: Projekt angelegt (create, Modrinth-ID uL1mPEKJ), 0.10.0 für Fabric, NeoForge (client_only) und Paper (server_only) hochgeladen, 03.11.2026 zur Prüfung eingereicht; offen: Freigabe durch Modrinth.
- [x] GAME-09-S05: Jede neue Mod-Version: nach release_mod.mjs und Abschnitt in CHANGELOG.md `node scripts/modrinth_publish.mjs release` (Daueranweisung Philipp 04.11.2026; bisher 0.10.0–0.15.0 hochgeladen, 21 Dateien, Stand 04.11.2026 22:05).

**Abnahme:** Das Projekt ist auf Modrinth sichtbar und im Modrinth-Launcher für Fabric und NeoForge 26.3 installierbar; Fabric zieht die Fabric API mit. Nur auf der Website geprüfte .jar (gleiche SHA-256) werden hochgeladen; Forge bleibt draußen, bis es im Spiel geprüft ist. Kein Token im Repo, in Logs oder im Chat.

**Nächste Aktion:** Modrinth-Freigabe abwarten (Status processing seit 03.11.2026 20:19); neue Versionen hochladen, sobald sie auf main sind.

**Prüfstand:** Echte API: Projekt, 6 Bilder, 3 Versionen und Einreichung erfolgreich; kein „Claude“ im Livetext (geprüft 03.11.2026). Freigabe durch Modrinth offen.

**Nachweise:** [tests/unit/mod/modrinth.test.mjs](../tests/unit/mod/modrinth.test.mjs) — Offline-Prüfung der Modrinth-Daten und Versionen (03.11.2026).

**Dateiumfang:** `mods/bauplaner-bridge/modrinth/`, `mods/bauplaner-bridge/CHANGELOG.md`, `scripts/mod/modrinth_publish.mjs`, `tests/unit/mod/modrinth.test.mjs`, `mods/bauplaner-bridge/README.md`, `scripts/mod/release_mod.mjs`, `docs/TESTING.md`, `mods/bauplaner-bridge/LICENSE`, `mods/bauplaner-bridge/fabric-26.3/src/main/resources/fabric.mod.json`. **Abhängigkeiten:** GAME-07, GAME-04. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-10

**Befehlsseite im Plan-Menü (J) der Mod 0.11.0: alle Mod- und Plugin-Befehle (Hologramm, Team, Lager, Nachweis, Verbindung, Aufnahme) per Klick mit Eingabefeldern, Statusübersicht und Antworten** · 🧩 Implementiert · Abnahme offen · Priorität P2 · Verantwortlich: Claude (Thread „Teambau in der Mod“) · Zuständiger Thread: „Teambau und Befehle in der Mod ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] GAME-10-S01: Befehlskatalog im Mod-Kern (CommandCatalog, CommandContext, ReplyLog) mit den Befehlen von Mod und Paper-Plugin (/bp), mit dem Plugin-Thread abgeglichen; JUnit liest die Plugin-Befehle aus den Quellen, damit ein neuer Befehl ohne Knopf auffällt.
- [x] GAME-10-S02: Befehlsseite „Befehle & Status“ (Knopf im Plan-Menü, /bauplaner befehle): Reiter je Gruppe, Statusübersicht, Eingabefelder, ausgegraute Knöpfe mit Grund, Antworten von Mod und Server; Fabric + NeoForge.
- [x] GAME-10-S03: Spieltest Fabric mit echten Mausklicks und NeoForge-Szenario, Release 0.11.0 auf #/mod.
- [ ] GAME-10-S04: Abnahme im Spiel auf Philipps Server mit Plugin (MOD-16).

**Abnahme:** Ein Klick sendet genau den Befehl, den man eintippen würde – keine zusätzlichen Pakete an den Server. Serverbefehle sind nur aktiv, wenn der Server das Bauplaner-Plugin hat (/bp im Befehlsbaum); Knöpfe ohne Voraussetzung sind ausgegraut und nennen den Grund. Antworten von Mod und Server erscheinen auf der Seite.

**Nächste Aktion:** Abnahme MOD-16 auf Philipps Server mit Paper-Plugin.

**Nur Philipp:** Auf deinem Server mit Mitspielern: Befehlsseite im J-Menü zusammen mit dem Plugin auf deinem Server (MOD-16).

**Prüfstand:** Spieltests Fabric und NeoForge 26.3 bestanden; Serverbefehle mit echtem Paper-Plugin nur auf Philipps Server prüfbar (MOD-16).

**Nachweise:** [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/CommandCatalogTest.java) — Katalog deckt alle Mod-Befehle und alle Plugin-Befehle ab (aus TeamModule.COMMANDS und StorageModule.SUBCOMMANDS gelesen), Eingaben werden geprüft, Gründe für ausgegraute Knöpfe, Antwortfenster, keine doppelten Zeilen.; [scripts/mod/bridge_gametest.mjs](../scripts/mod/bridge_gametest.mjs) — Echter Fabric-Client 26.3 mit echten Mausklicks: Reiter Team, Übersicht, „Abschnitt zeigen 2“, Antworten auf der Seite, Serverknöpfe ohne Plugin ausgegraut. NeoForge-Szenario öffnet die Seite und führt einen Befehl aus.

**Dateiumfang:** `mods/bauplaner-bridge/`, `scripts/mod/bridge_gametest.mjs`, `apps/web/src/views/mod/`, `apps/web/src/testing/testplan.ts`, `downloads/mod/`, `docs/`. **Abhängigkeiten:** COOP-03, COOP-05, GAME-07. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GAME-11

**Client-Mod für weitere Minecraft-Versionen und Launcher: Versionsmatrix, zweite Version über den versionsneutralen Kern, Spieltests, Download und Modrinth je Version, Anleitung für Modrinth App, Prism, CurseForge und den offiziellen Launcher** · 🚧 In Arbeit · Priorität P2 · Verantwortlich: Claude (Thread „Teambau und Befehle in der Mod ausbauen“) · Zuständiger Thread: „Mod-Werkzeuge und Planer-Anbindung erweitern“ · Aktualisiert: 2026-11-06T09:35:19.769Z

- [ ] GAME-11-S01: Versionsmatrix festlegen: welche Minecraft-Versionen und Loader (Philipps Server, verbreitete Modpacks), was der Kern schon versionsneutral abdeckt.
- [ ] GAME-11-S02: Zweite Minecraft-Version (Fabric und NeoForge) als eigener Adapter über mod-core und eine Versionsfassade, ohne 26.3 zu verändern.
- [ ] GAME-11-S03: Echte Spieltests je Version, Release auf #/mod mit Versionswahl, Modrinth je Version.
- [x] GAME-11-S04: Installationsanleitung für Modrinth App, Prism Launcher, CurseForge und den offiziellen Launcher auf #/mod.

**Abnahme:** Die Mod läuft in mindestens einer weiteren Minecraft-Version mit Hologramm, Platzierhilfe, Website-Verbindung, Teambau und Befehlsseite. #/mod und Modrinth bieten je Version und Loader die passende Datei an.

**Nächste Aktion:** Entschieden (Philipp 04.11.): Fabric 26.3 (sein Modpack mit REI) hat Vorrang, danach jeweils die neueste Minecraft-Version nachziehen; keine Matrix älterer Versionen.

**Prüfstand:** S04 Launcher-Anleitung auf #/mod fertig; S01–S03 (weitere Versionen) offen.

**Nachweise:** [tests/unit/mod/install-guide.test.mjs](../tests/unit/mod/install-guide.test.mjs) — Anleitung je Launcher und Loader, Fabric API nur bei Fabric.

**Dateiumfang:** `mods/bauplaner-bridge/`, `scripts/`, `apps/web/src/views/mod/`, `downloads/mod/`, `docs/`, `apps/web/src/views/mod/installGuide.ts`. **Abhängigkeiten:** GAME-07, GAME-10. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-07

**Team live ohne Dateien: Team-Raum (Worker + Durable Object), Einladungslink, Live-Abgleich in jedem Reiter, Planstand live, Servermessungen mit Serverschlüssel** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gemeinsames Bauen mehrerer Spieler ermöglichen“) · Zuständiger Thread: „Gemeinsames Bauen mehrerer Spieler ermöglichen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] COOP-07-S01: Konzept TEAM_LIVE.md: Varianten, Raumprotokoll team-room v1, Schlüssel und Rollen, Ablauf, Offline, Aufteilung.
- [x] COOP-07-S02: Sync-Kern teamSync.ts: Postausgang, Stapel, Cursor, Einladungs- und Server-Link; Pakete ohne Schlüssel.
- [x] COOP-07-S03: Raumdienst services/team-room (core.js in Node getestet, Worker + Durable Object mit SQLite, WebSocket, Anwesenheit, Planstand, Kopfdaten); Rauchtest gegen wrangler dev.
- [x] COOP-07-S04: Planer: Verbindung je geöffnetem Projekt, Bereich „Team live“ (Live schalten, Links, Plan in den Raum, Planstand übernehmen, Anwesenheit, Status), Seite #/team/beitreten.
- [x] COOP-07-S05: Paper-Plugin verbindet sich mit dem Serverschlüssel (RoomLink, /bauplaner team verbinden|trennen|raum); echter Paper-Server 1.18.2, 1.21.4, 26.3 gegen wrangler dev (scripts/test_bridge_paper_room.sh).
- [x] COOP-07-S07: Team-Raum ausgerollt (https://bauplaner-team.team-room.workers.dev), im Planer voreingestellt; Planer und Paper-Plugin gegen den echten Dienst geprüft.
- [ ] COOP-07-S06: Spieltest mit Mitspielern über den echten Team-Raum (TEAMBAU-25).

**Abnahme:** Beitreten nur per Link, keine Datei; Plan und Protokoll kommen aus dem Raum. Jeder neue lokale Eintrag (Aktion, Import, Spielabgleich) geht ohne weiteres Zutun in den Raum; wiederholtes Senden bucht nichts doppelt. Ereignisse mit Herkunft server nimmt der Raum nur mit dem Serverschlüssel an. Offline weiterarbeiten; beim nächsten Verbinden gleichen alle auf denselben Stand ab.

**Nächste Aktion:** Spieltest TEAMBAU-25 mit Mitspielern (Philipp); Steuerkanal und Kopplung ohne Befehl umgesetzt (LINK-05).

**Nur Philipp:** Auf deinem Server mit Mitspielern: TEAMBAU-25 mit Mitspielern; auf dem Server /bauplaner team verbinden mit dem Server-Link (sobald das Plugin RoomLink hat).

**Prüfstand:** Automatisch geprüft; echter Dienst bei Philipp und Spieltest offen.

**Nachweise:** [tests/unit/team/team-room.test.mjs](../tests/unit/team/team-room.test.mjs) — Raum, zwei Browser und Server ohne Datei, Serverschlüssel, verlorene Antworten, Seiten.; [tests/e2e/team-room.e2e.mjs](../tests/e2e/team-room.e2e.mjs) — Zwei Browser 1400/390 px über den Raumkern: Live schalten, Beitreten per Link, Schritte live, Servermessung, neuer Planstand übernommen, Neuladen.; [scripts/team/team_room_smoke.mjs](../scripts/team/team_room_smoke.mjs) — Gegen wrangler dev (Worker + Durable Object) bestanden, 03.11.2026.; [tests/e2e/team-room.e2e.mjs](../tests/e2e/team-room.e2e.mjs) — Mit TEAM_ROOM_URL gegen den echten Dienst: zwei Browser 1400/390 px grün (04.11.2026).; [scripts/mod/test_bridge_paper_room.sh](../scripts/mod/test_bridge_paper_room.sh) — Paper 26.3 mit RoomLink gegen den echten Dienst: 10 Ereignisse, 6 vom Server, Faltung gleich (04.11.2026).

**Dateiumfang:** `packages/domain/src/team/teamSync.ts`, `packages/domain/src/team/team.ts`, `services/team-room/src/core.js`, `services/team-room/src/index.js`, `services/team-room/wrangler.toml`, `services/team-room/README.md`, `apps/web/src/views/project/team/roomClient.ts`, `apps/web/src/views/project/team/TeamRoom.tsx`, `apps/web/src/views/project/team/TeamJoinView.tsx`, `apps/web/src/views/project/team/teamTransfer.ts`, `apps/web/src/views/project/team/TeamOpen.tsx`, `apps/web/src/views/project/team/TeamExchange.tsx`, `apps/web/src/views/project/ProjectView.tsx`, `apps/web/src/views/project/team/TeamTab.tsx`, `apps/web/src/app/router.ts`, `apps/web/src/main.tsx`, `apps/web/src/styles/team.css`, `docs/architecture/team/TEAM_LIVE.md`, `tests/unit/team/team-room.test.mjs`, `tests/e2e/team-room.e2e.mjs`, `scripts/team/team_room_smoke.mjs`, `apps/web/src/testing/testplan.ts`, `docs/architecture/team/TEAMBAU.md`, `docs/testing/TESTPLAN.md`, `packages/domain/src/index.ts`, `services/team-room/.gitignore`, `tests/unit/web/router.test.mjs`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`, `scripts/mod/bridge_paperroom.mjs`, `scripts/mod/test_bridge_paper_room.sh`. **Abhängigkeiten:** COOP-01, COOP-04. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-08

**Ertragskisten: Lagerkisten als Sammeltruhe einer Farm messen Ertrag und Laufzeit für das Ertragsbuch (Produktion)** · 🧩 Implementiert · Abnahme offen · Priorität P2 · Verantwortlich: Claude (Thread „Server-Plugin mit geprüften Lagerkisten“) · Zuständiger Thread: „Module und Systeme komplex ausarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] COOP-08-S01: Zweck ertrag, store.config.farm, store.yield (nur Server) in team.ts und TeamLog/StoreIndex; farms in der Serverdatei (production.serverFarms).
- [x] COOP-08-S02: Plugin misst Ertrag und Laufzeit, /bauplaner lager farm, Info mit Rate; Trichterbuchungen gebündelt (lager.trichter-buendeln-sekunden).
- [x] COOP-08-S03: Planer zeigt Ertragskisten im Reiter Team (Ertragsbuch: Items je Stunde, Laufzeit, Planwert der Farm); Reiter Produktion nutzt yields als gemessene Rate (PROD-05).
- [ ] COOP-08-S04: Abnahme mit einer echten Farm auf Philipps Server (LAGER-10).

**Abnahme:** Ertragskiste (Zweck ertrag, Farm) misst Trichter- und Spielereinlagen und geladene Minuten; store.yield alle 30 min und beim Herunterfahren; Planer-Faltung yields gleich Plugin; Trichterbuchungen je Minute gebündelt; echte Paper-Server 1.18.2, 1.21.4, 26.3.

**Nächste Aktion:** Abnahme LAGER-10 mit einer echten Farm; Ertragsbuch in TEAMBAU-28.

**Nur Philipp:** Auf deinem Server mit Mitspielern: LAGER-01…09 mit echten Spielern.

**Prüfstand:** Servertests und Unit-Tests bestanden; Inventarklicks, Schutz und Buchungen beim Schließen brauchen echte Spieler (LAGER-02…06).

**Nachweise:** [scripts/mod/bridge_paperlager.mjs](../scripts/mod/bridge_paperlager.mjs) — Echter Server 1.18.2, 1.21.4, 26.3: Abweichung, Siegel, Trichter, TNT, Doppelkiste, fehlende Kiste, Bedarf, Sammelauftrag, Neustart; Planer-Faltung = Server.; [tests/unit/team/lager.test.mjs](../tests/unit/team/lager.test.mjs) — Faltung, Rechte, Herkunft und Prüfung der neuen Arten.; [mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndexTest.java](../mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndexTest.java) — Unit-Tests der Rechte-Matrix, Differenzen, Prüfsumme und Faltung (StoreIndex).

**Dateiumfang:** `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StorageModule.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreIndex.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/StoreLedger.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`, `mods/bauplaner-bridge/paper/src/main/resources/config.yml`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`, `packages/domain/src/team/team.ts`, `packages/domain/src/materials/production.ts`, `packages/domain/src/index.ts`, `apps/web/src/views/project/team/TeamProof.tsx`, `apps/web/src/views/project/team/TeamTab.tsx`, `apps/web/src/views/project/team/TeamLive.tsx`, `apps/web/src/views/project/team/teamTransfer.ts`, `apps/web/src/views/project/team/TeamExchange.tsx`, `apps/web/src/styles/team.css`, `apps/web/src/testing/testplan.ts`, `docs/architecture/team/LAGERKISTEN.md`, `docs/testing/TESTPLAN.md`, `tests/unit/team/lager.test.mjs`, `scripts/mod/bridge_paperlager.mjs`. **Abhängigkeiten:** COOP-05, PROD-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROD-01

**Produktionsdaten: Katalog von 34 Farmarten mit Richtwerten je Einheit, Bedingungen, Reichweite, Verbrauch und Bauplan; Farmliste je Projekt (Anzahl, Zustand, Ort, Bauteil, Kartenpunkt) und Ertragsbuch, das ins Baustellen-Lager bucht und gemessene Raten liefert** · 🧩 Implementiert · Abnahme offen · Priorität P2 · Verantwortlich: Claude (Thread „Produktion und Anbindung im Planer ausbauen“) · Zuständiger Thread: „Produktion und Anbindung im Planer ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PROD-01-S01: Farmarten mit Raten, covers, inputs, Bauplan/Aufwand, Reichweitenart.
- [x] PROD-01-S02: Datensatz site.production mit Prüfung, Rückgängig über site.set, Sicherung, Bereinigung.
- [x] PROD-01-S03: Ertragsbuch: Ernte bucht ins Lager, gemessene Rate ab 1 h ersetzt den Richtwert.
- [ ] PROD-01-S04: Abnahme durch Philipp (PROJ-12).

**Abnahme:** Ernte und Lagerbuchung sind ein Rückgängig-Schritt. Jede Farmart nennt Grundlage und Bedingungen; Raten sind als Richtwert oder gemessen gekennzeichnet.

**Nächste Aktion:** Abnahme PROJ-12; später Erträge aus geprüften Lagerkisten (COOP-05) ins Ertragsbuch.

**Nur Philipp:** Im Planer abnehmen: Reiter „Produktion“ abnehmen (PROJ-12).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme durch Philipp in der Testphase offen (PROJ-12/13).

**Nachweise:** [tests/unit/materials/production.test.mjs](../tests/unit/materials/production.test.mjs) — 10 Fälle: Katalog, Datensatz/Rückgängig/Sicherung, Ertragsbuch, Reichweiten/AFK, Deckung/Engpass/Bereitschaft, Vorschläge, Öfen/Lager/Logistik, Verbrauch, Anbindung, Integration mit planSite.; [tests/e2e/production.e2e.mjs](../tests/e2e/production.e2e.mjs) — Reiter „Produktion“ in Chromium (1400/390 px): Farm, Ernte ins Lager, gemessene Rate, Ort, AFK-Platz, Neuladen, kein Querscrollen.; [docs/architecture/planer/PRODUCTION.md](architecture/planer/PRODUCTION.md) — Grundsätze, Datensatz, Farmarten, Auswertung, Anbindung, Grenzen.

**Dateiumfang:** `packages/domain/src/materials/production.ts`, `packages/domain/src/building/site.ts`, `tests/unit/materials/production.test.mjs`, `docs/architecture/planer/PRODUCTION.md`. **Abhängigkeiten:** BUILD-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROD-02

**Deckung und Engpässe: Restbedarf des Sammelplans gegen laufende Farmen und Handarbeit (gemeinsame Warteschlange, gieriger Ausgleich), Engpass, Materialbereitschaft je Abschnitt in Spieltagen, „Lohnt sich eine Farm?“ mit Amortisation aus Bauplan-Kosten** · 🧩 Implementiert · Abnahme offen · Priorität P2 · Verantwortlich: Claude (Thread „Produktion und Anbindung im Planer ausbauen“) · Zuständiger Thread: „Produktion und Anbindung im Planer ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PROD-02-S01: Deckung je Rohstoff mit Weg Farm/Hand/offen und Engpass.
- [x] PROD-02-S02: Bereitschaft je Abschnitt kumulativ in Bau-Reihenfolge, Vergleich mit Baubeginn aus planProgram.
- [x] PROD-02-S03: Vorschläge je Farmart über alle abgedeckten Items, Einheiten für 7 Tage, Urteil.
- [ ] PROD-02-S04: Abnahme durch Philipp (PROJ-13).

**Abnahme:** Bedarf ist genau „Noch sammeln“ der Baustelle, keine zweite Materiallogik. Abschnitte mit Material nach Baubeginn sind markiert.

**Nächste Aktion:** Abnahme PROJ-13.

**Nur Philipp:** Im Planer abnehmen: Engpässe und Zeitplanvergleich prüfen (PROJ-13).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme durch Philipp in der Testphase offen (PROJ-12/13).

**Nachweise:** [tests/unit/materials/production.test.mjs](../tests/unit/materials/production.test.mjs) — 10 Fälle: Katalog, Datensatz/Rückgängig/Sicherung, Ertragsbuch, Reichweiten/AFK, Deckung/Engpass/Bereitschaft, Vorschläge, Öfen/Lager/Logistik, Verbrauch, Anbindung, Integration mit planSite.; [tests/e2e/production.e2e.mjs](../tests/e2e/production.e2e.mjs) — Reiter „Produktion“ in Chromium (1400/390 px): Farm, Ernte ins Lager, gemessene Rate, Ort, AFK-Platz, Neuladen, kein Querscrollen.; [docs/architecture/planer/PRODUCTION.md](architecture/planer/PRODUCTION.md) — Grundsätze, Datensatz, Farmarten, Auswertung, Anbindung, Grenzen.

**Dateiumfang:** `packages/domain/src/materials/productionPlan.ts`, `apps/web/src/views/project/ProductionTab.tsx`, `apps/web/src/styles/production.css`, `tests/unit/materials/production.test.mjs`. **Abhängigkeiten:** PROD-01, PROJ-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROD-03

**Verarbeitung und Logistik: Öfen für eine Zielzeit, Brennstoff je Sorte und netto aus Brennstofffarmen (Seetang, Bambus, Lava), Lagerplatz/Shulker/Fahrten je Abschnitt, Trichterdurchsatz und „Truhe voll nach“ je Farm, Sortier-Module** · 🧩 Implementiert · Abnahme offen · Priorität P2 · Verantwortlich: Claude (Thread „Produktion und Anbindung im Planer ausbauen“) · Zuständiger Thread: „Produktion und Anbindung im Planer ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PROD-03-S01: SectionPlan.smelts/cookTicks aus dem Rezeptbaum.
- [x] PROD-03-S02: Ofen- und Brennstoffplan inkl. Netto-Seetang.
- [x] PROD-03-S03: Lager je Abschnitt und Logistik je automatischer Farm.

**Abnahme:** Brennstoff aus Farmen ist netto gerechnet. Farm-Logistik warnt, wenn die Doppeltruhe innerhalb eines Spieltags voll ist.

**Nächste Aktion:** Später: Ofenstraße aus dem Katalog direkt vorschlagen und in die Planung legen.

**Prüfstand:** Einheits- und Browsertests grün; Abnahme durch Philipp in der Testphase offen (PROJ-12/13).

**Nachweise:** [tests/unit/materials/production.test.mjs](../tests/unit/materials/production.test.mjs) — 10 Fälle: Katalog, Datensatz/Rückgängig/Sicherung, Ertragsbuch, Reichweiten/AFK, Deckung/Engpass/Bereitschaft, Vorschläge, Öfen/Lager/Logistik, Verbrauch, Anbindung, Integration mit planSite.; [tests/e2e/production.e2e.mjs](../tests/e2e/production.e2e.mjs) — Reiter „Produktion“ in Chromium (1400/390 px): Farm, Ernte ins Lager, gemessene Rate, Ort, AFK-Platz, Neuladen, kein Querscrollen.; [docs/architecture/planer/PRODUCTION.md](architecture/planer/PRODUCTION.md) — Grundsätze, Datensatz, Farmarten, Auswertung, Anbindung, Grenzen.

**Dateiumfang:** `packages/domain/src/materials/productionPlan.ts`, `packages/domain/src/building/site.ts`, `apps/web/src/views/project/ProductionTab.tsx`. **Abhängigkeiten:** PROD-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROD-04

**Anbindung der Produktion: Farmen aus Projekt-Bauteilen mit Baufortschritt, Farmpunkte der Weltkarte übernehmen und eintragen, bester AFK-Platz nach Simulationsdistanz, Materialbereitschaft gegen Zeitplan der Planung, Sammelaufträge je Bauleute (TEAM-03-S02), Produktionsblatt als Text** · 🧩 Implementiert · Abnahme offen · Priorität P2 · Verantwortlich: Claude (Thread „Produktion und Anbindung im Planer ausbauen“) · Zuständiger Thread: „Produktion und Anbindung im Planer ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PROD-04-S01: detectFarms aus Katalog-Bauteilen und Anleitungsfortschritt.
- [x] PROD-04-S02: Weltkarte: farmsOnMap mit guessFarmType, Punkte eintragen, Bauplatz als Standardort.
- [x] PROD-04-S03: AFK: inRange je Reichweitenart, bestAfkSpot.
- [x] PROD-04-S04: splitGathering (LPT, Nether/End als Tour) und productionText.
- [ ] PROD-04-S05: Abnahme durch Philipp mit Mitspielern (PROJ-13).

**Abnahme:** AFK-Platz nennt erreichte und verfehlte Farmen mit Grund. Sammelaufträge verteilen nur Handarbeit.

**Nächste Aktion:** Abnahme PROJ-13; danach Farmerträge aus Mod/Plugin.

**Prüfstand:** Einheits- und Browsertests grün; Abnahme durch Philipp in der Testphase offen (PROJ-12/13).

**Nachweise:** [tests/unit/materials/production.test.mjs](../tests/unit/materials/production.test.mjs) — 10 Fälle: Katalog, Datensatz/Rückgängig/Sicherung, Ertragsbuch, Reichweiten/AFK, Deckung/Engpass/Bereitschaft, Vorschläge, Öfen/Lager/Logistik, Verbrauch, Anbindung, Integration mit planSite.; [tests/e2e/production.e2e.mjs](../tests/e2e/production.e2e.mjs) — Reiter „Produktion“ in Chromium (1400/390 px): Farm, Ernte ins Lager, gemessene Rate, Ort, AFK-Platz, Neuladen, kein Querscrollen.; [docs/architecture/planer/PRODUCTION.md](architecture/planer/PRODUCTION.md) — Grundsätze, Datensatz, Farmarten, Auswertung, Anbindung, Grenzen.

**Dateiumfang:** `packages/domain/src/materials/productionPlan.ts`, `apps/web/src/views/project/ProductionTab.tsx`, `apps/web/src/views/project/SiteTab.tsx`, `apps/web/src/views/project/tabs.ts`, `apps/web/src/testing/testplan.ts`, `docs/testing/TESTPLAN.md`, `tests/e2e/production.e2e.mjs`. **Abhängigkeiten:** PROD-02, MAP-06, PROJ-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROD-05

**Erträge aus geprüften Lagerkisten: Sammeltruhe je Farm, echte Rate aus Ertragsmeldungen des Servers (store.yield) oder Trichterbuchungen, Vorschläge zum Verknüpfen, ohne Doppelbuchung** · 🧩 Implementiert · Abnahme offen · Priorität P2 · Verantwortlich: Claude (Thread „Produktion und Anbindung im Planer ausbauen“) · Zuständiger Thread: „Produktion und Anbindung im Planer ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PROD-05-S01: FarmEntry.chest (geprüft, rückgängig machbar über updateFarm).
- [x] PROD-05-S02: teamChests/chestYield: store.yield bevorzugt, sonst Trichterbuchungen mit Lückenregel 5 min.
- [x] PROD-05-S03: Rate aus Sammeltruhe vor Ertragsbuch vor Richtwert; Hinweise bei entfernter Truhe und < 1 h.
- [x] PROD-05-S04: suggestChests und Reiter: Truhe wählen, Ertrag anzeigen, „Als Sammeltruhe verknüpfen“.
- [x] PROD-05-S05: Plugin schreibt store.yield für Kisten mit Zweck „ertrag“ (COOP-08, Lagerkisten-Thread).

**Abnahme:** Eine verknüpfte Sammeltruhe ersetzt den Richtwert ab 1 h Laufzeit. Lesen der Truhe bucht nichts ins Lager oder Ertragsbuch.

**Nächste Aktion:** Test im Spiel: Ertragskiste mit Farm verknüpfen, Rate im Reiter Produktion prüfen.

**Prüfstand:** Einheits- und Browsertests grün; Plugin schreibt store.yield seit COOP-08. Abnahme im Spiel offen (PROJ-13).

**Nachweise:** [tests/unit/materials/production.test.mjs](../tests/unit/materials/production.test.mjs) — PROD-05-Fall: Trichter-Rückfall, Vorschläge, Serverberichte, entfernte Truhe, keine Lagerbuchung.; [tests/e2e/production.e2e.mjs](../tests/e2e/production.e2e.mjs) — Server-Export mit Lagerkiste und zwei Ertragsmeldungen, Vorschlag, Verknüpfen, Rate 300 Eisen/h.; [docs/architecture/planer/PRODUCTION.md](architecture/planer/PRODUCTION.md) — Abschnitt Sammeltruhen aus dem Team-Lager.

**Dateiumfang:** `packages/domain/src/materials/production.ts`, `packages/domain/src/materials/productionPlan.ts`, `apps/web/src/views/project/ProductionTab.tsx`, `tests/unit/materials/production.test.mjs`, `tests/e2e/production.e2e.mjs`, `docs/architecture/planer/PRODUCTION.md`. **Abhängigkeiten:** PROD-02, COOP-05, COOP-08. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LINK-01

**Plugin richtet sich selbst ein und lässt sich per Klick koppeln (link.json, Server-ID, Kopplung nur OP/Bauleitung über den Teamkanal)** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Anbindung von Planer, Mod und Server neu denken“) · Zuständiger Thread: „Verbindung ohne Server-Datei neu bauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LINK-01-S01: Selbsteinrichtung beim ersten Start (link.json, Log-Hinweis), Chat-Hinweis für ungekoppelte OPs.
- [x] LINK-01-S02: link.info/link.claim über bauplaner:team, nur OP oder bauplaner.team.leitung, höchstens 8 Geräte, Schlüssel nie im Log.
- [x] LINK-01-S03: Echter Servertest Paper 1.21.11 mit Protokoll-Client.
- [ ] LINK-01-S04: Abnahme bei Philipp auf seinem Paper-Server (LINK-01 im Testplan).

**Abnahme:** Auf dem Server muss niemand etwas eintippen; ein OP koppelt mit einem Klick im Planer. Nicht-OPs können nicht koppeln; Schlüssel erscheinen nie im Log.

**Nächste Aktion:** Abnahme LINK-01 auf Philipps Server.

**Nur Philipp:** Auf deinem Server mit Mitspielern: Plugin 0.12.0 einspielen, als OP mit Mod beitreten, J → „Teambau erlauben“, im Planer #/mod „Server koppeln“.

**Prüfstand:** Automatisch und auf echtem Paper geprüft; Abnahme auf Philipps Server offen.

**Nachweise:** [scripts/mod/test_bridge_paper_link.sh](../scripts/mod/test_bridge_paper_link.sh) — Paper 1.21.11 (Build 132): selbst eingerichtet, Nicht-OP abgewiesen, Kopplung, Neustart behält sie (04.11.2026).; [mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/LinkCoreTest.java](../mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/LinkCoreTest.java) — Regeln, Prüfvektor, Obergrenze.

**Dateiumfang:** `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/LinkCore.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/ServerLink.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamChannel.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`, `mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/LinkCoreTest.java`, `docs/architecture/team/AUTO_LINK.md`. **Abhängigkeiten:** COOP-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LINK-02

**Signierte Steuernachrichten statt Serverbefehlen (HMAC, steigende Nummer, feste Einstellungsliste, Team, Raum, Plan, Umbenennen, Geräte)** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Anbindung von Planer, Mod und Server neu denken“) · Zuständiger Thread: „Mod-Werkzeuge und Planer-Anbindung erweitern“ · Aktualisiert: 2026-11-06T09:35:19.769Z

- [x] LINK-02-S01: Format und Unterschrift in Plugin und Planer gleich (gemeinsamer Prüfvektor).
- [x] LINK-02-S02: Operationen status, config, team, room, plan, rename, invite, forget; config nur Liste, alles oder nichts, Teamkanal ausgenommen.
- [x] LINK-02-S03: Wiederholung, falsche Unterschrift, fremder Server auf echtem Paper abgewiesen; Nummer übersteht Neustart.
- [x] LINK-02-S04: Plan-Upload im Planer anbieten: Reiter „Bauen“ und Weltkarte, Anker aus Kartenplatzierung oder Hologramm.

**Abnahme:** Eine aufgezeichnete Nachricht wirkt nie zweimal, eine Nachricht für Server A nie auf B. Keine Nachricht setzt Blöcke oder führt Befehle aus.

**Nächste Aktion:** Abnahme LINK-02 und LINK-11.

**Nur Philipp:** Auf deinem Server mit Mitspielern: LINK-11: Plan aus „Bauen“ auf den Server legen.

**Prüfstand:** Automatisch und auf echtem Paper geprüft; Abnahme LINK-02 offen.

**Nachweise:** [scripts/mod/test_bridge_paper_link.sh](../scripts/mod/test_bridge_paper_link.sh) — 2 Einstellungen und ein Team per signierter Nachricht, alle Abweisungen geprüft (04.11.2026).; [tests/unit/team/server-link.test.mjs](../tests/unit/team/server-link.test.mjs) — Prüfvektor, Inhalt, Nummer, Leser.; [tests/unit/team/server-link.test.mjs](../tests/unit/team/server-link.test.mjs) — Ankerwahl Karte > Hologramm > keiner, gedrehte Platzierung abgewiesen.

**Dateiumfang:** `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/LinkCore.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/ServerLink.java`, `packages/domain/src/team/serverControl.ts`, `packages/domain/src/index.ts`, `tests/unit/team/server-link.test.mjs`, `scripts/mod/bridge_paperlink.mjs`, `scripts/mod/test_bridge_paper_link.sh`, `apps/web/src/views/mod/planUpload.ts`, `apps/web/src/views/project/GameCheckPanel.tsx`. **Abhängigkeiten:** LINK-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LINK-03

**Mod: Live-Dienst startet selbst, Planer per Klick im Spiel zulassen, Teamfreigabe als Knopf, Server-Wege weiterreichen (Mod 0.12.0)** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Anbindung von Planer, Mod und Server neu denken“) · Zuständiger Thread: „Verbindung ohne Server-Datei neu bauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LINK-03-S01: /v1/pair/ask mit Frage im Spiel (Banner, eigene Frage-Ansicht im J-Menü mit Später), Schlüssel einmal, 3 Minuten, höchstens 3.
- [x] LINK-03-S02: Teamkanal-Freigabe als Knopf, Regel „nur freiwillig je Server“ bleibt.
- [x] LINK-03-S03: /v1/server, /v1/server/claim, /v1/server/control nur mit Token.
- [x] LINK-03-S04: Spieltest Fabric 26.3: „Planer zulassen“ per Mausklick.
- [ ] LINK-03-S05: Abnahme in Philipps Modpack.

**Abnahme:** Kein Code und kein Befehl zum Verbinden; ohne Klick im Spiel bekommt keine Website einen Schlüssel.

**Nächste Aktion:** Abnahme LIVE-01 in Philipps Modpack.

**Nur Philipp:** Im Spiel an deinem PC: Mod 0.12.0: Planer #/mod „Mit dem Spiel verbinden“, im Spiel J → „Planer zulassen“.

**Prüfstand:** Mod-Kern und echtes Minecraft 26.3 geprüft; Abnahme bei Philipp offen.

**Nachweise:** [scripts/mod/test_bridge_ingame.sh](../scripts/mod/test_bridge_ingame.sh) — Fabric 26.3: Frage im Spiel, Klick auf „Planer zulassen“, Schlüssel einmal, /v1/server (04.11.2026).; [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java) — Zulassen, Ablehnen, Ablauf, Obergrenze.

**Dateiumfang:** `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/TeamTest.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LinkPrompt.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/CommandScreen.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramCommands.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/HologramClient.java`, `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`, `scripts/mod/bridge_gametest.mjs`, `mods/bauplaner-bridge/VERSION`, `mods/bauplaner-bridge/CHANGELOG.md`. **Abhängigkeiten:** GAME-08, COOP-03. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LINK-04

**Planer: Bereich „Spiel und Server verbinden – ohne Befehle“ (#/mod), Server koppeln und einstellen, Team und Raum per Knopf** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Anbindung von Planer, Mod und Server neu denken“) · Zuständiger Thread: „Verbindung ohne Server-Datei neu bauen“ · Aktualisiert: 2026-11-05T10:34:38.680Z

- [x] LINK-04-S01: Drei Schritte Spiel → Server → Kopplung, Einstellungsformular aus dem Schema, Geräte, Umbenennen.
- [x] LINK-04-S02: „Planstand auf den Server legen“ und „Server mit dem Raum verbinden“ über Steuernachrichten.
- [x] LINK-04-S03: Browsertest gegen Mod-Simulator mit Plugin-Ersatz 1400/390 px.
- [ ] LINK-04-S04: Abnahme LINK-01…03 im Testplan.

**Abnahme:** Vom Start des Spiels bis zur geänderten Server-Einstellung nur Klicks.

**Nächste Aktion:** Abnahme durch Philipp.

**Nur Philipp:** Im Planer abnehmen: Testplan-Bereich LINK durchgehen.

**Prüfstand:** Browsertests grün; Abnahme offen.

**Nachweise:** [tests/e2e/server-link.e2e.mjs](../tests/e2e/server-link.e2e.mjs) — Kopplung per Klick, Server koppeln, signierte Einstellung, 1400/390 px ohne Querscrollen (04.11.2026).

**Dateiumfang:** `apps/web/src/views/mod/ServerPanel.tsx`, `apps/web/src/views/mod/serverClient.ts`, `apps/web/src/views/mod/ModView.tsx`, `apps/web/src/views/map/liveClient.ts`, `apps/web/src/views/map/LiveGamePanel.tsx`, `apps/web/src/views/project/team/TeamLive.tsx`, `apps/web/src/views/project/team/TeamRoom.tsx`, `apps/web/src/views/project/team/TeamJoinView.tsx`, `apps/web/src/views/project/team/TeamExchange.tsx`, `apps/web/src/styles/catalog.css`, `apps/web/src/testing/testplan.ts`, `tests/e2e/modSimulator.mjs`, `tests/e2e/server-link.e2e.mjs`. **Abhängigkeiten:** LINK-02, LINK-03. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LINK-05

**Zweiter Weg über den Team-Raum: Steuernachrichten ohne Mod (iPad), weiteres Gerät per Link freigeben** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Anbindung von Planer, Mod und Server neu denken“) · Zuständiger Thread: „Verbindung ohne Server-Datei neu bauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LINK-05-S01: Raum: POST /control (Formprüfung, Weiterleitung an die Plugin-Verbindung, Antwort, 20 s, 409 ohne Server), serverOnline.
- [x] LINK-05-S02: Plugin: control über RoomLink, gleiche Prüfung wie auf dem Mod-Weg.
- [x] LINK-05-S03: Planer: Freigabe-Link #/mod?geraet=…, Bereich „Ohne Mod über den Team-Raum“.
- [x] LINK-05-S04: Echter Test: Paper + wrangler dev; Browsertest iPad 820 px.
- [x] LINK-05-S05: Team-Raum mit den neuen Nachrichten ausrollen (04.11.2026, Version 0eb3b458, vom Team-Thread mit Philipps Zustimmung).

**Abnahme:** Vom iPad ohne Minecraft eine Server-Einstellung ändern; der Raum kann keine Nachricht fälschen.

**Nächste Aktion:** Abnahme vom iPad (Testplan LINK-04).

**Nur Philipp:** Auf echten Geräten und Browsern: Am PC „Weiteres Gerät freigeben“, Link auf dem iPad öffnen, eine Einstellung ändern.

**Prüfstand:** Automatisch und gegen wrangler dev geprüft; Abnahme LINK-04 (Testplan) offen.

**Nachweise:** [scripts/mod/test_bridge_paper_link.sh](../scripts/mod/test_bridge_paper_link.sh) — Mit BAUPLANER_ROOM gegen wrangler dev: Status, Einstellung, Wiederholung abgewiesen (04.11.2026).; [tests/e2e/server-link.e2e.mjs](../tests/e2e/server-link.e2e.mjs) — iPad 820 px: Freigabe-Link, Einstellung über Raum-Ersatz, Server offline klar gemeldet.; [tests/unit/team/team-room.test.mjs](../tests/unit/team/team-room.test.mjs) — Formprüfung, Weiterleitung, Zeitlimit, Obergrenze.; [tests/e2e/server-link.e2e.mjs](../tests/e2e/server-link.e2e.mjs) — Mit TEAM_ROOM_URL gegen https://bauplaner-team.team-room.workers.dev: iPad-Weg Ende-zu-Ende grün (04.11.2026).

**Dateiumfang:** `services/team-room/src/core.js`, `services/team-room/src/index.js`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`, `tests/unit/team/team-room.test.mjs`, `packages/domain/src/team/serverControl.ts`, `apps/web/src/views/mod/ServerPanel.tsx`, `apps/web/src/views/mod/serverClient.ts`, `docs/architecture/team/TEAM_LIVE.md`. **Abhängigkeiten:** LINK-04, COOP-07. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LINK-06

**Weitere Steuerung ohne Befehle: Plan mit Anker von der Weltkarte auf den Server und Serveraufnahme per Klick zurück in den Planer** · 🧩 Implementiert · Abnahme offen · Priorität P2 · Verantwortlich: Claude (Thread „Anbindung von Planer, Mod und Server neu denken“) · Zuständiger Thread: „Verbindung ohne Server-Datei neu bauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LINK-06-S01: Plan-Upload mit Anker aus der Weltkarte („⇪ Auf den Server legen“, über Mod oder Team-Raum).
- [x] LINK-06-S02: Serveraufnahme als Steueraktion scan (list/start/fetch/cancel), Reiter „Bauen“ → „⇩ Auf dem Server aufnehmen“, Paper-Plugin 0.13.0.

**Abnahme:** Auch Pläne und Aufnahmen gehen ohne Befehl auf/vom Server.

**Nächste Aktion:** Abnahme durch Philipp (Testplan LINK-05, LINK-06; Paper-Plugin 0.13.0 auf dem Server).

**Prüfstand:** Automatisch, gegen echten Paper-Server und echten Team-Raum geprüft; Abnahme Testplan LINK-06 offen.

**Nachweise:** [scripts/mod/test_bridge_paper_link.sh](../scripts/mod/test_bridge_paper_link.sh) — Paper 1.21.11: Plan mit Anker per Steuernachricht abgelegt, kaputter Plan abgewiesen; mit BAUPLANER_ROOM gegen den echten Team-Raum (04.11.2026).; [tests/e2e/server-link.e2e.mjs](../tests/e2e/server-link.e2e.mjs) — iPad 820 px: Weltkarte → „Auf den Server legen“ über den Raum; mit TEAM_ROOM_URL gegen den echten Dienst grün.; [scripts/mod/test_bridge_paper_link.sh](../scripts/mod/test_bridge_paper_link.sh) — Paper 1.21.11 (04.11.2026): Aufnahme per Steuernachricht scan gestartet, Fortschritt abgefragt, Datei byte-gleich in Teilen geholt; fremde Pfade und unbekannte Pläne abgewiesen.; [tests/e2e/server-link.e2e.mjs](../tests/e2e/server-link.e2e.mjs) — iPad 820 px: Reiter „Bauen“ → „Auf dem Server aufnehmen“ über den Raum, in Teilen geholt, gespeichert, „Letzte Aufnahme holen“; auch mit TEAM_ROOM_URL gegen den echten Dienst grün.; [scripts/mod/test_bridge_paper.sh](../scripts/mod/test_bridge_paper.sh) — Paper 1.21.11 und 26.3: /bp scan nach dem Umbau unverändert (Spieltest bestanden); Lagerkisten-Test 1.21.11/26.3 mit Ertragskisten grün.

**Dateiumfang:** `apps/web/src/testing/testplan.ts`, `apps/web/src/views/map/WorldMapView.tsx`, `apps/web/src/views/mod/ModView.tsx`, `apps/web/src/views/mod/ServerPanel.tsx`, `apps/web/src/views/mod/releases.json`, `apps/web/src/views/mod/serverClient.ts`, `apps/web/src/views/project/GameCheckPanel.tsx`, `docs/TESTING.md`, `docs/architecture/team/AUTO_LINK.md`, `docs/testing/TESTPLAN.md`, `mods/bauplaner-bridge/CHANGELOG.md`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/BridgePlugin.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/LinkCore.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/ServerLink.java`, `packages/domain/src/team/serverControl.ts`, `scripts/mod/bridge_paperlink.mjs`, `scripts/mod/test_bridge_paper_link.sh`, `tests/e2e/modSimulator.mjs`, `tests/e2e/server-link.e2e.mjs`. **Abhängigkeiten:** LINK-05. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-09

**Team live im Alltag: Status und Meldungen in jedem Reiter, Anwesenheit mit Abschnitt, Einladung/Server-Link erneuern, abgelehnte Meldungen sichtbar** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gemeinsames Bauen mehrerer Spieler ermöglichen“) · Zuständiger Thread: „Gemeinsames Bauen mehrerer Spieler ermöglichen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] COOP-09-S01: Chip im Projektkopf und Meldungen der anderen in jedem Reiter (ohne Flut beim Nachholen).
- [x] COOP-09-S02: Anwesenheit mit eigenem Abschnitt in Arbeit.
- [x] COOP-09-S03: Einladung und Server-Link erneuern (alte Links gesperrt, Verbindungen schließen mit 4403, Neu-Beitritt verbindet vorhandenes Projekt).
- [x] COOP-09-S04: Vom Raum abgelehnte eigene Meldungen mit Grund anzeigen.
- [ ] COOP-09-S05: Abnahme mit Mitspielern (TEAMBAU-25).

**Abnahme:** Meldungen nur für neue Schritte anderer, nicht für das Nachholen. Nach „Einladung erneuern“ kommt niemand mit dem alten Link mehr in den Raum.

**Nächste Aktion:** Abnahme mit Mitspielern (TEAMBAU-25).

**Nur Philipp:** Auf deinem Server mit Mitspielern: TEAMBAU-25 mit Mitspielern; auf dem Server /bauplaner team verbinden mit dem Server-Link (sobald das Plugin RoomLink hat).

**Prüfstand:** Automatisch geprüft, auch gegen den echten Dienst; Abnahme mit Mitspielern offen.

**Nachweise:** [tests/e2e/team-room.e2e.mjs](../tests/e2e/team-room.e2e.mjs) — Meldung, Chip in anderem Reiter, Anwesenheit mit Abschnitt, Einladung erneuern mit Aussperren und Wiederbeitritt; 1400/390 px, auch gegen den echten Dienst (04.11.2026).

**Dateiumfang:** `apps/web/src/views/project/team/TeamLiveBar.tsx`, `apps/web/src/views/project/team/roomClient.ts`, `apps/web/src/views/project/team/TeamRoom.tsx`, `apps/web/src/views/project/ProjectView.tsx`, `apps/web/src/styles/team.css`, `tests/e2e/team-room.e2e.mjs`, `docs/architecture/team/TEAM_LIVE.md`. **Abhängigkeiten:** COOP-07. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-10

**Client zuerst: Baustand und Kisteninhalt laut Spiel (section.seen, store.seen) im Teamstand, ungeprüft getrennt von Servermessungen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Gemeinsames Bauen mehrerer Spieler ermöglichen“) · Zuständiger Thread: „Gemeinsames Bauen mehrerer Spieler ermöglichen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] COOP-10-S01: Ereignisse section.seen und store.seen mit Prüfung und Recht Helfer (team.ts, TeamLog.java).
- [x] COOP-10-S02: Faltung: neuester Stand je Abschnitt, gesehener Kisteninhalt, Bestand laut Spiel nur ohne Serverzählung.
- [x] COOP-10-S03: Planer zeigt „laut Spiel … ungeprüft“ je Abschnitt und Kiste.
- [x] COOP-10-S06: „Gerade da“ zeigt, in welchem Abschnitt ein Mitspieler im Spiel steht oder wie weit er weg ist.
- [x] COOP-10-S07: Team live zeigt den Stand der eigenen Mod (live, über HTTP, wartende Meldungen, anderer Raum).
- [x] COOP-10-S04: Mod meldet beides selbst (Thread „Anbindung von Planer, Mod und Server neu denken“). Mod 0.15.0 meldet beides (9d20e54), Team-Raum ausgerollt (Version 8318d1eb).
- [ ] COOP-10-S05: Abnahme mit Mitspielern ohne Plugin (TEAMBAU-25).

**Abnahme:** Eine Meldung des Mods ändert nie die Servermessung (build.tally, store.count). Gäste können keinen Baustand melden; unbekannte Kisten werden abgelehnt.

**Nächste Aktion:** Abnahme mit Mitspielern ohne Plugin (TEAMBAU-27, TEAMBAU-25).

**Nur Philipp:** Auf deinem Server mit Mitspielern: TEAMBAU-27 mit Mitspielern: Mod 0.15.0, Team live, ohne Plugin bauen und Kiste öffnen.

**Prüfstand:** Automatisch geprüft; Mod-Seite und Abnahme offen.

**Nachweise:** [tests/unit/team/team.test.mjs](../tests/unit/team/team.test.mjs) — Client zuerst: Faltung, Rechte, Serverzählung gewinnt.; [tests/e2e/team-room.e2e.mjs](../tests/e2e/team-room.e2e.mjs) — Mod-Meldung mit Mitgliedsschlüssel erscheint in beiden Browsern als ungeprüft.

**Dateiumfang:** `packages/domain/src/team/team.ts`, `packages/domain/src/index.ts`, `apps/web/src/views/project/team/TeamProof.tsx`, `apps/web/src/styles/team.css`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamLog.java`, `tests/unit/team/team.test.mjs`, `tests/e2e/team-room.e2e.mjs`, `docs/architecture/team/TEAM_LIVE.md`, `apps/web/src/testing/testplan.ts`, `docs/testing/TESTPLAN.md`, `apps/web/src/views/project/team/TeamRoom.tsx`, `tests/e2e/modSimulator.mjs`. **Abhängigkeiten:** COOP-07, COOP-09. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### COOP-11

**Verlauf verdichten: Bauleitung ersetzt Messungen bis zu einem Stichtag durch Summen (team.digest), gleicher Teamstand, Merge ohne Doppelzählung, Produktion und Team live lesen mit** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Module und Systeme komplex ausarbeiten“) · Zuständiger Thread: „Module und Systeme komplex ausarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] COOP-11-S01: Ereignis team.digest (Teile unter 4 KB, Prüfung), Lauf in Kraft (vollständig, spätester Stichtag, Bauleitung zum Stichtag), Faltung überspringt Ersetztes.
- [x] COOP-11-S02: compactTeam: Summen je Mitglied/Abschnitt/Kiste/Farm, neueste Zählung bleibt, erledigte Notizen und alte Ablehnungen entfallen; Gleichheitsprüfung vor dem Speichern.
- [x] COOP-11-S03: mergeTeam lässt Ersetztes weg (alte und halbe Kopien), Team live: Teile in den Postausgang, ersetzte Wartende heraus; Produktion liest Ertrag und Trichterlaufzeit aus dem Lauf.
- [x] COOP-11-S04: Oberfläche „Verlauf verdichten“ (Füllstand, Vorschau, Rückgängig) und Ertragsbuch im Reiter Team.
- [ ] COOP-11-S05: Abnahme TEAMBAU-28 mit einem echten Teamstand.

**Abnahme:** Der sichtbare Teamstand ist vor und nach dem Verdichten gleich (automatisch geprüft). Eine ältere Kopie bringt ersetzte Ereignisse nicht zurück; nichts wird doppelt gezählt. Nur wer zum Stichtag Bauleitung war, kann wirksam verdichten.

**Nächste Aktion:** Abnahme TEAMBAU-28 durch Philipp; danach optional team.digest im Plugin/Mod-TeamLog (Thread „Mod, Server und Client mit Fallbacks ausbauen“).

**Nur Philipp:** Im Planer abnehmen: TEAMBAU-28: einen echten Teamstand verdichten und mit einem Mitspieler abgleichen.

**Prüfstand:** Automatisch geprüft; Abnahme offen.

**Nachweise:** [tests/unit/team/team-digest.test.mjs](../tests/unit/team/team-digest.test.mjs) — Gleicher Stand, Merge, Rechte, Produktion, Postausgang.; [tests/e2e/team-digest.e2e.mjs](../tests/e2e/team-digest.e2e.mjs) — Ertragsbuch, Verdichten, Rückgängig auf Desktop und Handy.

**Dateiumfang:** `packages/domain/src/team/team.ts`, `packages/domain/src/team/teamDigest.ts`, `packages/domain/src/team/teamSync.ts`, `packages/domain/src/materials/productionPlan.ts`, `packages/domain/src/index.ts`, `apps/web/src/views/project/team/TeamCompact.tsx`, `apps/web/src/views/project/team/TeamTab.tsx`, `apps/web/src/views/project/team/TeamProof.tsx`, `apps/web/src/styles/team.css`, `tests/unit/team/team-digest.test.mjs`, `tests/e2e/team-digest.e2e.mjs`, `docs/architecture/team/TEAMBAU.md`, `apps/web/src/testing/testplan.ts`, `docs/testing/TESTPLAN.md`, `docs/TESTING.md`. **Abhängigkeiten:** COOP-01, COOP-05, COOP-08, COOP-09. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROJ-02

**Projektplanung vertieft: Zeitplan ab heute, Abschnitte warten auf Material aus der Produktion, Basisplan mit Verzug je Abschnitt/Meilenstein, Anteil der Bautage je Bauleute** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Projektmodul vertiefen“) · Zuständiger Thread: „Projektmodul vertiefen“ · Aktualisiert: 2026-11-06T09:06:53.011Z

- [x] PROJ-02-S01: Zeitplan ab heute bei Startdatum in der Vergangenheit; Bautage zwischen Daten nach Bautagen je Woche (buildingDaysBetween).
- [x] PROJ-02-S02: Planung ↔ Produktion: waitForMaterial, planProgramWithMaterial (Bereitschaft → frühester Beginn, materialWait), Produktion vergleicht mit demselben Zeitplan.
- [x] PROJ-02-S03: Basisplan (setBaseline/clearBaseline, nur Daten) mit Verzug für Plan, Abschnitte und Meilensteine; Bereinigung beim Entfernen; Sicherung.
- [x] PROJ-02-S04: Anteil der Bautage je Bauleute (10–100 %); Oberfläche: Karten Basisplan/Material, Basisplan-Linie und Materialwarten im Balkenplan, Einstellungen.
- [ ] PROJ-02-S05: Abnahme durch Philipp in der Testphase (PROJ-16…18).

**Abnahme:** Ohne neue Felder bleibt jeder Plan unverändert (Altbestand). Kein Kreis zwischen Planung und Produktion: Bereitschaft hängt nicht vom Zeitplan ab; mit Materialwarten meldet die Produktion keinen zu späten Baubeginn. Basisplan speichert nur Daten und bleibt vergleichbar, wenn der Plan ab heute neu rechnet; Verzug in Bautagen nach Bautagen je Woche.

**Nächste Aktion:** Abnahme durch Philipp (S05, PROJ-16…18).

**Nur Philipp:** Im Planer abnehmen: Basisplan, Material abwarten und Anteil der Bautage im Reiter „Planung“ abnehmen (PROJ-16…18).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme durch Philipp offen (S05).

**Nachweise:** [tests/unit/planning/program-depth.test.mjs](../tests/unit/planning/program-depth.test.mjs) — 6 Fälle: Bautage zwischen Daten, Anteil der Bautage, Start in der Vergangenheit, Basisplan mit Verzug/Bereinigung/Sicherung, Material abwarten gegen Produktion, Altbestand.; [tests/e2e/program-depth.e2e.mjs](../tests/e2e/program-depth.e2e.mjs) — Chromium 1400/390 px: Basisplan ± 0 → +N Bautage, Anteil 25 %, Material-Karte mit Link zur Produktion, Neuladen, Verwerfen, kein Querscrollen.; [docs/architecture/planer/PROGRAM.md](architecture/planer/PROGRAM.md) — Abschnitt „Vertiefung PROJ-02“.

**Dateiumfang:** `packages/domain/src/planning/program.ts`, `packages/domain/src/planning/programMaterial.ts`, `apps/web/src/views/project/PlanningTab.tsx`, `apps/web/src/views/project/ProductionTab.tsx`, `apps/web/src/styles/planning.css`, `tests/unit/planning/program-depth.test.mjs`, `tests/e2e/program-depth.e2e.mjs`, `docs/architecture/planer/PROGRAM.md`. **Abhängigkeiten:** PROJ-01, PROD-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROJ-03

**Planung Runde 3: Abwesenheiten je Bauleute nach Datum, mehrere Basispläne mit Namen und Vergleich, „abwesend bis“ aus dem Team in die Planung** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Module und Systeme komplex ausarbeiten“) · Zuständiger Thread: „Module und Systeme komplex ausarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PROJ-03-S01: Abwesenheiten je Bauleute (von–bis, Grund; geordnet, zusammengeführt, höchstens 24, höchstens ein Jahr); Zeitplan rechnet Tag für Tag um Abwesenheiten herum, gemeinsame Abschnitte bauen weiter.
- [x] PROJ-03-S02: Basisplan-Verlauf: bis zu 8 frühere Basispläne mit Namen, Vergleichen (aktiv schalten), Umbenennen, Entfernen, Verwerfen holt den vorigen zurück; Bereinigung beim Entfernen eines Abschnitts.
- [x] PROJ-03-S03: Team → Planung übernimmt „abwesend bis“ als Abwesenheit ab heute (kein Doppel, Vergangenes nicht).
- [ ] PROJ-03-S04: Abnahme durch Philipp im Reiter „Planung“ (PROJ-20).

**Abnahme:** Ohne Abwesenheiten und frühere Basispläne bleibt jeder Plan unverändert (Altbestand). Abwesenheit verschiebt nur die Bahn dieser Bauleute; ohne Startdatum wirkt sie nicht und der Plan sagt das. Frühere Basispläne speichern nur Daten und zeigen ihren Verzug gegen den aktuellen Plan.

**Nächste Aktion:** Abnahme PROJ-20 durch Philipp.

**Nur Philipp:** Im Planer abnehmen: Im Reiter „Planung“ eine Abwesenheit eintragen und zwei Basispläne vergleichen (PROJ-20).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme durch Philipp offen (S04).

**Nachweise:** [tests/unit/planning/program-absence.test.mjs](../tests/unit/planning/program-absence.test.mjs) — 4 Fälle: Prüfung/Zusammenführen, Zeitplan um Abwesenheiten, Basisplan-Verlauf, Team → Planung.; [tests/e2e/program-absence.e2e.mjs](../tests/e2e/program-absence.e2e.mjs) — Chromium 1400/390 px: Basisplan mit Namen, Abwesenheit verschiebt Beginn um 3 Bautage, zweiter Basisplan, Vergleichen, Neuladen, Entfernen.

**Dateiumfang:** `packages/domain/src/planning/program.ts`, `packages/domain/src/team/team.ts`, `packages/domain/src/index.ts`, `apps/web/src/views/project/PlanningTab.tsx`, `apps/web/src/views/project/team/TeamTab.tsx`, `apps/web/src/styles/planning.css`, `tests/unit/planning/program-absence.test.mjs`, `tests/e2e/program-absence.e2e.mjs`, `docs/architecture/planer/PROGRAM.md`, `apps/web/src/testing/testplan.ts`, `docs/testing/TESTPLAN.md`, `docs/TESTING.md`. **Abhängigkeiten:** PROJ-02, COOP-06. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROJ-04

**Reihenfolge zwischen Projekten: „erst nach“ anderen Projekten, frühester Start aus dem Basisplan der Vorgänger, Kreise abweisen, Pfeile auf der Weltkarte** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Module und Systeme komplex ausarbeiten“) · Zuständiger Thread: „Module und Systeme komplex ausarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] PROJ-04-S01: program.after (Vorgängerprojekte mit Grund) mit Prüfung; projectOrder.ts: Verknüpfungen, Kreise, Stufen, Nachfolger, frühester Start aus dem aktiven Basisplan.
- [x] PROJ-04-S02: Planung „Reihenfolge der Projekte“ (erst nach, Kreis-Hinweis, Start mit einem Klick korrigieren, Danach kommen) und Weltkarte (Pfeile, Detail).
- [ ] PROJ-04-S03: Abnahme PROJ-21 durch Philipp.

**Abnahme:** Die Reihenfolge reist mit dem Projekt (Sicherung, Rückgängig, Teampaket). Kein Kreis über Projekte hinweg; gelöschte Vorgänger werden angezeigt und lassen sich entfernen. Der früheste Start nennt seine Quelle (Basisplan des Vorgängers) und sagt „Ende offen“, wenn es keine gibt.

**Nächste Aktion:** Abnahme PROJ-21 durch Philipp.

**Nur Philipp:** Im Planer abnehmen: Zwei Projekte nacheinander planen (erst Lager, dann Burg) und den Starthinweis prüfen (PROJ-21).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme PROJ-21 offen.

**Nachweise:** [tests/unit/planning/project-order.test.mjs](../tests/unit/planning/project-order.test.mjs) — 3 Fälle: anlegen/prüfen/entfernen, Kreise/Stufen/Nachfolger, frühester Start aus Basisplan (offen, fertig, gelöscht).; [tests/e2e/project-order.e2e.mjs](../tests/e2e/project-order.e2e.mjs) — Chromium: Basisplan in A, B erst nach A, Start korrigieren, Kreis abgewiesen, Weltkarte nennt die Reihenfolge, entfernen.

**Dateiumfang:** `packages/domain/src/planning/program.ts`, `packages/domain/src/planning/projectOrder.ts`, `apps/web/src/views/project/ProjectOrder.tsx`, `apps/web/src/views/project/PlanningTab.tsx`, `apps/web/src/views/map/OverviewMap.tsx`, `apps/web/src/views/map/WorldMapView.tsx`, `tests/unit/planning/project-order.test.mjs`, `tests/e2e/project-order.e2e.mjs`, `docs/architecture/planer/PROGRAM.md`. **Abhängigkeiten:** PROJ-03, MAP-04. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### PROJ-05

**Bauleute-Konto und Bauleute aus dem Spiel: Lagerbuchungen, Sammelzusagen und Saldo je Bauleute, Mitspieler aus dem Team und live aus dem Team-Raum in der Planung** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Projekte untereinander verknüpfen“) · Zuständiger Thread: „Projekte untereinander verknüpfen“ · Aktualisiert: 2026-11-06T09:06:53.011Z

- [x] PROJ-05-S01: builderAccounts: je Bauleute Restbedarf der Abschnitte gegen eigene und fremde Sammelzusagen, eingebracht (Beiträge, Einlagerungen), entnommen, Saldo; „Noch ohne Sammelzusage“ je Item; Kandidaten (Teammitglieder ohne Planung) und fremde Spieler im Team-Raum.
- [x] PROJ-05-S02: Planung: Live-Abzeichen (im Spiel/Planer, abwesend), aufklappbares Konto mit Tabelle, Bauzettel mit Zusagen und Lagerbuchungen, Kasten „Bauleute aus dem Spiel“ mit „Team übernehmen“ und Rückgängig.
- [ ] PROJ-05-S03: Abnahme PROJ-23 durch Philipp (mit Mitspielern oder zwei Browsern).

**Abnahme:** Konto und Kandidaten sind nur abgeleitet: nichts Neues wird gespeichert, die Übernahme ist ein Rückgängig-Schritt. Ohne Team zeigt das Konto nur den Bedarf; der Serverschlüssel zählt nie als Bauleute. Kein Querscrollen bei 390 px.

**Nächste Aktion:** Abnahme PROJ-23 durch Philipp.

**Nur Philipp:** Im Planer abnehmen: Team übernehmen, Konto je Bauleute und Bauzettel prüfen, am besten mit einem Mitspieler im Team-Raum (PROJ-23).

**Prüfstand:** Einheits- und Browsertests grün; Abnahme PROJ-23 offen.

**Nachweise:** [tests/unit/planning/builder-account.test.mjs](../tests/unit/planning/builder-account.test.mjs) — 3 Fälle: ohne Team nur Bedarf; Zusagen eigene/andere, Lieferung, Saldo, Live (Spiel vor Planer, Server ausgenommen), Kandidat und fremder Spieler, Übernahme, Bauzettel; „ohne Zusage“ einmal je Item.; [tests/e2e/builder-account.e2e.mjs](../tests/e2e/builder-account.e2e.mjs) — Chromium 1400/390 px: Team gründen, Lieferung und Sammelzusage, Kandidat in der Planung, Team übernehmen, Rückgängig, Konto mit Saldo +32, kein Querscrollen.

**Dateiumfang:** `packages/domain/src/planning/builderAccount.ts`, `apps/web/src/views/project/PlanningTab.tsx`, `apps/web/src/styles/planning.css`, `apps/web/src/testing/testplan.ts`, `tests/unit/planning/builder-account.test.mjs`, `tests/e2e/builder-account.e2e.mjs`, `docs/architecture/planer/PROGRAM.md`. **Abhängigkeiten:** PROJ-01, PROJ-03. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LINK-07

**Ohne Server-Datei: Mod spricht direkt mit dem Team-Raum (Teamstand, eigene Meldungen, Anwesenheit); Plugin nur noch freiwilliger Zusatz für Schutz und geprüfte Kisten** · 🚧 In Arbeit · Priorität P1 · Verantwortlich: Claude (Thread „Anbindung von Planer, Mod und Server neu denken“) · Zuständiger Thread: „Verbindung ohne Server-Datei neu bauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] LINK-07-S01: RoomClient in mod-core: Kopf + Ereignisse aus dem Raum, Faltung mit dem TeamLog des Plugins, eigene Aktionen per append, Anwesenheit, Wiederverbinden.
- [x] LINK-07-S02: Planer „Mein Spiel verbinden“/„Spiel trennen“ (POST /v1/room, Feature room).
- [x] LINK-07-S03: Echter Spieltest Fabric 26.3 gegen einen laufenden Raum ohne Server.
- [x] LINK-07-S04: Mitspieler-Positionen über den Raum: Anwesenheit mit Spielername und Position (alle 2 s nach Bewegung), im Planer unter „Gerade da“ (Mod 0.15.0).
- [x] LINK-07-S05: Aufnahme per Klick über den Raum („Aufnahme im Spiel anfordern“, /bauplaner team aufnahme, PUT …/scans), section.seen und store.seen aus der Mod, Lagerkisten aus dem Raum (Mod 0.15.0).
- [ ] LINK-07-S06: Release Mod 0.14.0/0.15.0 (Modrinth über den Thread „Mod auf Modrinth veröffentlichen“), Raum-Deploy durch den Team-Thread und Abnahme LINK-07/LINK-08.

**Abnahme:** Teambau funktioniert auf einem Server ganz ohne Bauplaner-Datei. Was nur mit Server-Code geht, ist klar benannt; das Plugin bleibt freiwillig.

**Nächste Aktion:** Team-Thread deployt den Raum (Aufnahmen, Positionen); Modrinth 0.15.0; Abnahme LINK-07/LINK-08 durch Philipp.

**Prüfstand:** Automatisch, gegen einen laufenden Raum und im echten Minecraft 26.3 geprüft; Raum-Deploy und Abnahme LINK-07/LINK-08 offen.

**Nachweise:** [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomClientTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomClientTest.java) — Mit BAUPLANER_ROOM gegen wrangler dev: live, Abschnitt aus dem Spiel im Raum, Notiz aus dem Planer im Spiel (04.11.2026).; [scripts/mod/test_bridge_ingame.sh](../scripts/mod/test_bridge_ingame.sh) — Minecraft 26.3 Fabric mit BAUPLANER_ROOM: live mit dem Raum, /bauplaner team nehmen 2 kommt im Raum an, ohne Server (04.11.2026).; [tests/e2e/team-room.e2e.mjs](../tests/e2e/team-room.e2e.mjs) — „Mein Spiel verbinden“ übergibt nur den Mitgliedsschlüssel (1400/390 px).; [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomClientTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomClientTest.java) — 0.15.0 gegen wrangler dev: Position kommt beim Planer an, Anforderung erreicht das Spiel, Aufnahme hochgeladen und byte-gleich geholt, section.seen im Protokoll (04.11.2026).; [tests/e2e/team-room.e2e.mjs](../tests/e2e/team-room.e2e.mjs) — Position unter „Gerade da“, „Aufnahme im Spiel anfordern“ lädt die Aufnahme aus dem Raum (1400 px und 390 px).; [tests/unit/team/team-room.test.mjs](../tests/unit/team/team-room.test.mjs) — Raum: Aufnahmen (gzip-Prüfung, 8 MB, neueste 12), Position nur bei where spiel.

**Dateiumfang:** `apps/web/src/testing/testplan.ts`, `apps/web/src/views/map/liveClient.ts`, `apps/web/src/views/mod/releases.json`, `apps/web/src/views/mod/serverClient.ts`, `apps/web/src/views/project/GameCheckPanel.tsx`, `apps/web/src/views/project/team/TeamRoom.tsx`, `apps/web/src/views/project/team/roomClient.ts`, `docs/architecture/team/AUTO_LINK.md`, `docs/testing/TESTPLAN.md`, `downloads/mod/bauplaner-bridge-fabric-26.3-0.15.0.jar`, `downloads/mod/bauplaner-bridge-neoforge-26.3-0.15.0.jar`, `mods/bauplaner-bridge/CHANGELOG.md`, `mods/bauplaner-bridge/VERSION`, `mods/bauplaner-bridge/fabric-26.3/build.gradle`, `mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/McCompat.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`, `mods/bauplaner-bridge/mod-core/build.gradle`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/commands/CommandCatalog.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomState.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamState.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomClientTest.java`, `mods/bauplaner-bridge/neoforge-26.3/build.gradle`, `scripts/mod/bridge_gametest.mjs`, `scripts/mod/bridge_room_prepare.mjs`, `scripts/mod/test_bridge_ingame.sh`, `services/team-room/src/core.js`, `services/team-room/src/index.js`, `tests/e2e/modSimulator.mjs`, `tests/e2e/team-room.e2e.mjs`, `tests/unit/team/team-room.test.mjs`. **Abhängigkeiten:** LINK-06, COOP-07. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### EDIT-06

**Direkt im 3D-Bild bauen: Blöcke an Flächen setzen/abbauen, Formen und Gruppen im 3D aufziehen und ziehen, Truhen- und Schildinhalte bearbeiten** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Direkt im 3D-Bild bauen“) · Zuständiger Thread: „Direkt im 3D-Bild bauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] EDIT-06-S01: Picking an 3D-Blockflächen (Zelle, Flächenrichtung, Zelle davor) und Bau-Geste im 3D-Bild mit Vorschau; Setzen/Abbauen per Klick und Ziehen.
- [x] EDIT-06-S02: Formen und Auswahl im 3D aufziehen (Oberseite waagrecht, Seitenfläche als Wand), Gruppe mit dem Auswahl-Werkzeug im 3D-Bild verschieben.
- [x] EDIT-06-S03: Truhen-, Behälter- und Schildinhalte in der Werkstatt bearbeiten (26.3-Format, unbekannte NBT bleibt, Profilprüfung der Gegenstände).
- [x] EDIT-06-S04: Unit- und Browserprüfung, Testplan WERK-08/WERK-09, Doku.
- [ ] EDIT-06-S05: Abnahme durch Philipp: iPad/Touch (WERK-08) und Inhalte im Spiel (WERK-09).

**Abnahme:** Jede 3D-Bauaktion ist ein Rückgängig-Schritt und nutzt dieselben Werkzeuge wie das Ebenenraster (keine zweite Formlogik). Inhaltsänderungen ersetzen nur die BlockEntity der Zelle; unbekannte Felder bleiben erhalten.

**Nächste Aktion:** EDIT-06-S05: Philipp prüft das Bauen im 3D-Bild auf PC und iPad (WERK-08) und lädt eine Truhe/ein Schild mit Inhalt im Spiel (WERK-09).

**Nur Philipp:** Auf echten Geräten und Browsern: Im 3D-Bild bauen auf PC und iPad (WERK-08). Im Spiel an deinem PC: Truhe und Schild mit Inhalt im Spiel laden (WERK-09).

**Prüfstand:** Unit- und Chromium-Prüfung bestanden; iPad/Touch und Spielprüfung offen.

**Nachweise:** [tests/unit/building/block-content-edit.test.mjs](../tests/unit/building/block-content-edit.test.mjs) — Behälter/Schilder lesen und schreiben, Erhalt unbekannter Felder, Sponge-Hülle, Prüfungen, Rückgängig im Entwurf.; [tests/e2e/workshop-build3d.e2e.mjs](../tests/e2e/workshop-build3d.e2e.mjs) — Chromium 1400 px: Setzen/Abbauen im 3D, Boden und Wand aufziehen, Gruppe wählen und ziehen, Bauen aus; Truhe und Schild bearbeiten, Rückgängig, Steckbrief.; [docs/architecture/planer/BLOCK_EDITOR.md](architecture/planer/BLOCK_EDITOR.md) — Abschnitt EDIT-06.

**Dateiumfang:** `apps/web/src/blockmodels/threeMesh.ts`, `apps/web/src/viewer/sceneController.ts`, `apps/web/src/viewer/ThreeViewer.tsx`, `apps/web/src/viewer/types.ts`, `apps/web/src/editor/BlockEditor.tsx`, `apps/web/src/editor/ContentEditor.tsx`, `apps/web/src/editor/editor.css`, `packages/voxel/src/blockContentEdit.ts`, `packages/voxel/src/index.ts`, `apps/web/src/testing/testplan.ts`, `docs/testing/TESTPLAN.md`, `docs/architecture/planer/BLOCK_EDITOR.md`, `tests/unit/building/block-content-edit.test.mjs`, `tests/e2e/workshop-build3d.e2e.mjs`. **Abhängigkeiten:** EDIT-01, EDIT-02, EDIT-03, EDIT-05, ENTITY-01. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### FALLBACK-01

**Ausweichwege über alle Verbindungen: Teamstand offline in der Mod, HTTP statt WebSocket, offline gemerkte Messungen, Baustand über den besten Weg (Spiel → Team-Raum → Server → Datei)** · 🚧 In Arbeit · Priorität P1 · Verantwortlich: Claude (Thread „Mod, Server und Client mit Fallbacks ausbauen“) · Zuständiger Thread: „Mod, Server und Client mit Fallbacks ausbauen“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] FALLBACK-01-S01: Mod: Teamstand aus dem Raum in bauplaner/team/raum-stand.json (Kopf, Ereignisse, Cursor); nach Neustart offline sichtbar, beim Wiederverbinden nur der Rest.
- [x] FALLBACK-01-S02: Mod: HTTP-Ausweg (GET/POST …/events) nach zwei WebSocket-Fehlschlägen bei erreichbarem Raum, alle 5 min neuer WebSocket-Versuch.
- [x] FALLBACK-01-S03: Mod: section.seen/store.seen offline je Abschnitt/Kiste gemerkt (Zeit der Messung), beim Wiederverbinden nachgereicht.
- [x] FALLBACK-01-S04: Planer: „Baustand holen (bester Weg)“ – eigenes Spiel → Team-Raum → Server-Plugin, jeder Fehlschlag mit Grund, Datei als letzter Ausweg.
- [ ] FALLBACK-01-S05: Spieltest Mod 0.16.0, Release (Modrinth-Thread), Abnahme LINK-09.

**Abnahme:** Fällt ein Weg aus (Raum offline, WebSocket gesperrt, Plugin fehlt), arbeitet Mod oder Planer über den nächsten weiter und sagt, welcher Weg gerade gilt. Nichts geht verloren: eigene Aktionen und Messungen warten und gehen beim nächsten Kontakt raus.

**Nächste Aktion:** Spieltest Mod 0.16.0, Release über den Modrinth-Thread, Abnahme LINK-09 durch Philipp.

**Nur Philipp:** Im Spiel an deinem PC: Abnahme LINK-09: mit Team live kurz das Internet trennen, Minecraft neu starten, Teamstand und „Baustand holen (bester Weg)“ prüfen.

**Prüfstand:** Mod-Kern gegen Raum-Ersatz ohne WebSocket und gegen den echten Team-Raum, Planer im Browser gegen den Mod-Simulator geprüft; Spieltest und Abnahme LINK-09 offen.

**Nachweise:** [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomFallbackTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomFallbackTest.java) — Raum-Ersatz ohne WebSocket: HTTP-Abfrage, Aktion/Notiz/Messung; Neustart ohne Netz mit gespeichertem Stand, Nachreichen, Cursor (04.11.2026).; [tests/e2e/game-progress.e2e.mjs](../tests/e2e/game-progress.e2e.mjs) — „Baustand holen (bester Weg)“ über das eigene Spiel; anderer Plan → alle Gründe und Datei-Ausweg (04.11.2026).; [scripts/mod/test_bridge_ingame.sh](../scripts/mod/test_bridge_ingame.sh) — Minecraft 26.3 Fabric (mit BAUPLANER_ROOM gegen den echten Team-Raum) und NeoForge bestanden mit Mod 0.16.0 (04.11.2026).

**Dateiumfang:** `apps/web/src/testing/testplan.ts`, `apps/web/src/views/mod/releases.json`, `apps/web/src/views/project/GameCheckPanel.tsx`, `docs/architecture/team/AUTO_LINK.md`, `docs/architecture/team/FALLBACKS.md`, `docs/testing/TESTPLAN.md`, `downloads/mod/bauplaner-bridge-fabric-26.3-0.16.0.jar`, `downloads/mod/bauplaner-bridge-neoforge-26.3-0.16.0.jar`, `mods/bauplaner-bridge/CHANGELOG.md`, `mods/bauplaner-bridge/VERSION`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/TeamClient.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomFallbackTest.java`, `packages/domain/src/index.ts`, `packages/domain/src/world/scanRoutes.ts`, `tests/e2e/game-progress.e2e.mjs`, `tests/unit/world/scan-routes.test.mjs`. **Abhängigkeiten:** LINK-07, COOP-10. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LINK-10

**Anbindung geprüft und gehärtet: Sendungen über den WebSocket nacheinander (Mod und Plugin), Messungen bis zur Bestätigung gemerkt, Team-Raum mit Ping ohne Aufwecken und sauberem Schließen, Planer ohne gestapelte Abfrage-Schleifen** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Anbindung von Mod, Team-Raum und Planer prüfen“) · Zuständiger Thread: „Anbindung von Mod, Team-Raum und Planer prüfen“ · Aktualisiert: 2026-11-05T12:23:25.618Z

- [x] LINK-10-S01: Mod und Plugin: alle WebSocket-Rahmen über WsQueue streng nacheinander (JDK erlaubt nur eine offene Sendung, zweite scheiterte still mit „Send pending“); Plugin trennte vorher bei gleichzeitiger Steuerantwort und Ereignissen.
- [x] LINK-10-S02: Mod: section.seen/store.seen bleiben gemerkt, bis der Raum die Kennung beantwortet; über HTTP stilles Nachsenden nach 10 s.
- [x] LINK-10-S03: Team-Raum: Ping per setWebSocketAutoResponse ohne Aufwecken, webSocketClose schließt sauber und lässt die Verbindung aus der Anwesenheit, „Server“ nur mit Serverschlüssel; Plugin pingt alle 30 s, Rahmen über 4 MB trennen.
- [x] LINK-10-S04: Planer: höchstens eine Abfrage-Schleife und ein Wiederverbindungs-Zeitgeber (vorher je gescheitertem WebSocket eine weitere Schleife); Planstand-Prüfung ohne veraltete Closure.
- [x] LINK-10-S05: PERF-06: Planer unter https://bauplaner.pages.dev als erlaubte Herkunft in Team-Raum, Mod 0.17.1 (LiveLinkServer) und Planer (LIVE_ALLOWED_ORIGINS).
- [x] LINK-10-S06: Mod 0.17.2: Planmenü (J) bei kleinem Fenster/großer GUI-Größe kompakt – „Befehle & Status“/„Fertig“ verdecken „Abschnitt: alle“ nicht mehr (Fund aus dem Spieltest des Modrinth-Threads); Modrinth-Offenlegung nennt beide Planer-Adressen.

**Abnahme:** Mehrere gleichzeitige Nachrichten von Mod oder Plugin kommen alle im Team-Raum an, ohne Verbindungsabbruch. Eine Messung geht bei einem Verbindungsabbruch nicht verloren und steht im Raum genau einmal.

**Nächste Aktion:** Team-Raum mit bauplaner.pages.dev ausrollen (Karte), Release 0.17.2 über den Modrinth-Thread, Abnahme LINK-10.

**Nur Philipp:** Im Spiel an deinem PC: Abnahme LINK-10: offline in mehreren Abschnitten bauen, wieder verbinden – alle Messungen genau einmal im Planer; mit Plugin bleibt die Raumverbindung stehen.

**Prüfstand:** Unit-Tests, RoomClientTest gegen lokalen Team-Raum (wrangler dev), Ping/Schließen/Anwesenheit per WebSocket gegen wrangler dev geprüft; Spieltest und Abnahme durch Philipp offen.

**Nachweise:** [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/WsQueueTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/WsQueueTest.java) — Ersatz-Socket mit JDK-Verhalten: Reihenfolge, 8 Threads × 25 Rahmen ohne Verlust, Fehler einmal, Rückstau (05.11.2026).; [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomFallbackTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomFallbackTest.java) — Verlorene Antwort: Messung bleibt gemerkt, geht erneut raus, einmal im Raum (05.11.2026).; [tests/unit/team/team-room.test.mjs](../tests/unit/team/team-room.test.mjs) — Anwesenheit „Server“ nur mit Serverschlüssel (05.11.2026).

**Dateiumfang:** `apps/web/src/views/project/team/roomClient.ts`, `apps/web/src/views/mod/releases.json`, `docs/architecture/team/FALLBACKS.md`, `docs/architecture/team/TEAM_LIVE.md`, `downloads/mod/bauplaner-bridge-fabric-26.3-0.17.0.jar`, `downloads/mod/bauplaner-bridge-neoforge-26.3-0.17.0.jar`, `downloads/mod/bauplaner-bridge-paper-0.17.0.jar`, `mods/bauplaner-bridge/CHANGELOG.md`, `mods/bauplaner-bridge/VERSION`, `mods/bauplaner-bridge/paper/build.gradle`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WsQueue.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/WsQueueTest.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/room/RoomFallbackTest.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`, `services/team-room/src/core.js`, `services/team-room/src/index.js`, `tests/unit/team/team-room.test.mjs`, `apps/web/src/testing/testplan.ts`, `docs/testing/TESTPLAN.md`, `packages/domain/src/team/liveLink.ts`, `tests/unit/team/livelink.test.mjs`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`, `mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/live/LiveLinkTest.java`, `downloads/mod/bauplaner-bridge-fabric-26.3-0.17.1.jar`, `downloads/mod/bauplaner-bridge-neoforge-26.3-0.17.1.jar`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/PlanScreen.java`, `mods/bauplaner-bridge/modrinth/project.json`, `downloads/mod/bauplaner-bridge-fabric-26.3-0.17.2.jar`, `downloads/mod/bauplaner-bridge-neoforge-26.3-0.17.2.jar`. **Abhängigkeiten:** FALLBACK-01, LINK-07. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### LINK-11

**Alles über das Internet: Server-Plugin bekommt die Team-Infos von Mod und Planer selbst über den Team-Raum, Dateiwege nur noch als versteckter Notfall (Mod/Plugin 0.21.0)** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Alle Systeme online verbinden“) · Zuständiger Thread: „Alle Systeme online verbinden“ · Aktualisiert: 2026-11-06T13:02:57.153Z

- [x] LINK-11-S01: Bestandsaufnahme: alle Stellen, an denen Dateien exportiert, kopiert oder eingefügt werden mussten (Teampaket, Meldecode, Serverdatei, Server-Link, Aufnahme-Datei, Plan-Ordner der Mod, Weltplan-/Kartenmarker) – AUTO_LINK §10.
- [x] LINK-11-S02: Mod 0.21.0: „Mein Spiel verbinden“ gibt der Bauleitung auch den Serverschlüssel (Merkmal roomserver); auf einem Server mit Plugin übergibt die Mod den Team-Raum selbst (link.room über bauplaner:team, einmal je Verbindung und Raum).
- [x] LINK-11-S03: Plugin 0.21.0: link.room nur für OP/bauplaner.team.leitung, verbindet sich über das Internet mit dem Raum (Kopf mit Abschnitten, Boxen, Bedarf; Ereignisse live); Hinweise und Hilfe nennen den Online-Weg, Datei-Befehle nur noch als Notfall.
- [x] LINK-11-S04: Planer: Bauleitung stellt den Kopf bei jeder Änderung von Abschnitten, Lage und Bedarf von selbst neu in den Raum (ohne Freigabe); gekoppelte Server werden automatisch verbunden; Zeile „Server-Plugin“ in „Team live“.
- [x] LINK-11-S05: Planer: Teampaket, Meldecode, Serverdatei, Server-Link und Aufnahme-Datei nur noch zugeklappt unter „Notfall“; Texte auf Seite „Spiel“, Reiter „Team“ und „Bauen“ nennen den Online-Weg.
- [ ] LINK-11-S06: Weltplan mit Gruppen/Sperren und BlueMap/Dynmap-Marker über den Team-Raum: eigener Thread „Weltplan und Karten über das Internet teilen“ (Mod/Plugin 0.22.0).

**Abnahme:** Der Server bekommt Team-Infos (Abschnitte, Lagerkisten, Abschnittsschutz) ohne Herunterladen, Hochladen, Kopieren oder Befehl. Kein Hauptweg im Planer verlangt eine Datei; Dateiwege stehen nur zugeklappt als Notfall.

**Nächste Aktion:** Abnahme LINK-12 und LINK-13 durch Philipp auf seinem Server; Weltplan/Karten im eigenen Thread.

**Nur Philipp:** Im Spiel an deinem PC: Abnahme LINK-12: als Bauleitung „Mein Spiel verbinden“, mit der Mod auf den Server – der Server verbindet sich selbst mit dem Team-Raum, Abschnittsschutz greift. Im Planer abnehmen: Abnahme LINK-13: alle Dateiwege nur noch zugeklappt unter „Notfall“.

**Prüfstand:** Einheitstests (TeamTest, RoomLinkTest, LiveLinkTest, team-room), Browsertests team-room/team/game-check, echter Paper 1.21.11 mit lokalem Team-Raum (link.room) grün; Abnahme durch Philipp offen.

**Nachweise:** [mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/TeamTest.java](../mods/bauplaner-bridge/mod-core/src/test/java/io/github/freadeax/bauplaner/mod/TeamTest.java) — roomHandOverToThePlugin: Helfer ohne Übergabe, Bauleitung einmal je Verbindung, „same“ still, Nicht-OP gemeldet, Schlüssel nie in publicFields (06.11.2026).; [mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/RoomLinkTest.java](../mods/bauplaner-bridge/paper/src/test/java/io/github/freadeax/bauplaner/bridge/paper/RoomLinkTest.java) — Link der Mod wird vom Plugin gelesen; nur https/127.0.0.1, nie ohne Serverschlüssel.; [scripts/mod/bridge_paperlink.mjs](../scripts/mod/bridge_paperlink.mjs) — Echter Paper 1.21.11 + Team-Raum (wrangler dev): link.room vom OP verbindet, Nicht-OP abgewiesen, zweite Übergabe ändert nichts (06.11.2026).; [tests/e2e/team-room.e2e.mjs](../tests/e2e/team-room.e2e.mjs) — Bauleitung gibt der Mod den Serverschlüssel, Helfer nie; Server-Link nur im Notfall-Block.; [tests/unit/team/team-room.test.mjs](../tests/unit/team/team-room.test.mjs) — headerFingerprint folgt Abschnitten/Lage, nicht Zeit/Mitgliedern.

**Dateiumfang:** `apps/web/src/views/project/team/TeamRoom.tsx`, `apps/web/src/views/project/team/TeamExchange.tsx`, `apps/web/src/views/project/team/TeamTab.tsx`, `apps/web/src/views/project/team/TeamOpen.tsx`, `apps/web/src/views/project/team/TeamPlan.tsx`, `apps/web/src/views/project/GameCheckPanel.tsx`, `apps/web/src/views/mod/serverClient.ts`, `apps/web/src/views/mod/ModView.tsx`, `apps/web/src/views/mod/ServerPanel.tsx`, `apps/web/src/styles/team.css`, `packages/domain/src/team/team.ts`, `packages/domain/src/index.ts`, `packages/domain/src/world/scanRoutes.ts`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/team/TeamSync.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/LiveLinkServer.java`, `mods/bauplaner-bridge/hologram-26.3/src/main/java/io/github/freadeax/bauplaner/bridge/hologram/LiveLink.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/ServerLink.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamChannel.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/RoomLink.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/TeamModule.java`, `docs/architecture/team/AUTO_LINK.md`, `docs/architecture/team/FALLBACKS.md`, `downloads/mod/bauplaner-bridge-fabric-26.3-0.21.0.jar`, `downloads/mod/bauplaner-bridge-neoforge-26.3-0.21.0.jar`, `downloads/mod/bauplaner-bridge-paper-0.21.0.jar`, `apps/web/src/views/mod/releases.json`, `mods/bauplaner-bridge/CHANGELOG.md`, `mods/bauplaner-bridge/VERSION`, `mods/bauplaner-bridge/modrinth/DESCRIPTION.md`, `mods/bauplaner-bridge/modrinth/project.json`, `apps/web/src/testing/testplan.ts`, `docs/testing/TESTPLAN.md`, `packages/domain/src/team/liveLink.ts`. **Abhängigkeiten:** LINK-10, COOP-07. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### STRUCT-01

**Dateistruktur sauber neu ordnen: Fachordner im Kern und in der Oberfläche, Skripte, Tests und Doku nach Bereich, Ordnerkarte docs/STRUKTUR.md** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Dateistruktur sauber neu ordnen“) · Zuständiger Thread: „Dateistruktur sauber neu ordnen“ · Aktualisiert: 2026-11-05T11:06:42.936Z

- [x] STRUCT-01-S01: Codemod scripts/dev/restructure.mjs: verschiebt nach Liste und schreibt Importe, Markdown-Links, Pfade ab Wurzel und Roadmap-Umfang um; wiederholbar nach Rebase.
- [x] STRUCT-01-S02: Stufe 2: packages/domain/src in Fachordner (core, catalog, base, materials, building, planning, world, team, data, versions), Web-CSS nach styles/, Team-Ansichten nach views/project/team/.
- [x] STRUCT-01-S03: Stufe 1: scripts/ in 10 Unterordner (publish_pages.sh bleibt oben), tests/*.test.mjs nach tests/unit/<bereich>/, docs/architecture nach Bereich, Altbestand nach docs/archiv/.
- [x] STRUCT-01-S04: Ordnerkarte docs/STRUKTUR.md und Strukturtest (keine neuen flachen Dateien in scripts/, tests/, domain/src).

**Abnahme:** npm run check und Browsertests grün, Pages unverändert erreichbar. Jede Datei liegt in dem Fachordner, den docs/STRUKTUR.md nennt. Parallele Threads können nach Rebase mit dem Codemod veraltete Pfade nachziehen.

**Nächste Aktion:** Durchsicht der Ordnerkarte durch Philipp; parallele Threads ziehen neue Dateien mit dem Codemod nach.

**Prüfstand:** npm run check (911 Einheitstests) und 176 Browsertests grün; Pages nach Stufe 2 live geprüft.

**Nachweise:** [tests/unit/tooling/restructure.test.mjs](../tests/unit/tooling/restructure.test.mjs) — Codemod: Importe, dist-Verweise, Markdown-Links, Wurzelpfade, Wiederholung nach Rebase, veraltete Importe in verschobenen Dateien, restructure:keep.; [tests/unit/tooling/structure.test.mjs](../tests/unit/tooling/structure.test.mjs) — Keine neuen flachen Dateien in tests/, scripts/, packages/domain/src/, docs/architecture/.; [docs/STRUKTUR.md](STRUKTUR.md) — Verbindliche Ordnerkarte.

**Dateiumfang:** `scripts/dev/restructure.mjs`, `scripts/dev/moves`, `packages/domain/src`, `apps/web/src/styles`, `apps/web/src/views/project/team`, `scripts`, `tests`, `docs/STRUKTUR.md`. **Abhängigkeiten:** keine. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### CORE-04

**Planer-Kernmodule prüfen und überarbeiten: Verbindungen zwischen Projekt, Planung, Werkstatt, Import/Export und Speicher sauber, gefundene Fehler behoben** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Planer-Kernmodule prüfen und überarbeiten“) · Zuständiger Thread: „Planer-Kernmodule prüfen und überarbeiten“ · Aktualisiert: 2026-11-05T11:03:24.121Z

- [x] CORE-04-S01: Projekt/Planung: „erst nach“ (PROJ-04) im Verweisgraphen und Datencheck; Löschen eines Projekts nennt und entfernt Nachfolger-Verweise und gibt Bauplätze der Weltkarte frei.
- [x] CORE-04-S02: Projektsitzung: Aktionen bauen auf dem neuesten Stand (keine verlorenen Änderungen bei zwei Aktionen im selben Takt); Rückgängig/Wiederholen behalten live empfangene Teamereignisse.
- [x] CORE-04-S03: Werkstatt: Ausstattung im Reiter „Blöcke“ nicht mehr scheinbar verschoben, Rückfrage bei ungespeichertem Entwurf, 3D-Klick mit aktueller Symmetrie/Muster, Truhen-/Schild-NBT bleibt erhalten, Fehler großer Auswahlen sichtbar, Schablonen behalten Ausstattung, Touch-Abbruch beendet Striche, Speichern meldet Teilerfolg richtig.
- [x] CORE-04-S04: Import/Export/Speicher: Sicherung über der Wiederherstellungsgrenze wird nicht mehr erzeugt, große Schem-Dateien nicht mehr am Litematic-Knotenlimit abgewiesen, Wiederherstellung prüft den Weltplan vorab und meldet Teilerfolg.
- [ ] CORE-04-S05: Abnahme durch Philipp: Projekt mit Nachfolger löschen, Werkstatt-Entwurf verlassen, Truhe mit verzaubertem Gegenstand umsortieren.

**Abnahme:** Kein Datensatz verweist nach dem Löschen eines Projekts still ins Leere. Keine Aktion im Planer meldet Erfolg oder Misserfolg falsch. Ungespeicherte Arbeit im Blockeditor geht nicht ohne Rückfrage verloren.

**Nächste Aktion:** Abnahme CORE-04-S05 durch Philipp.

**Nur Philipp:** Im Planer abnehmen: Projekt mit Nachfolger und Bauplatz löschen; Blockeditor mit Änderungen verlassen; Truhe mit verzaubertem Schwert umsortieren (CORE-04-S05).

**Prüfstand:** Einheitstests grün; Browsertests der betroffenen Bereiche siehe TESTING.md; Abnahme offen.

**Nachweise:** [tests/unit/core/core-links.test.mjs](../tests/unit/core/core-links.test.mjs) — Verweisgraph, Datencheck, Löschen mit Nachfolgern/Bauplätzen, Rückgängig mit Teamereignissen.; [tests/unit/building/block-content-edit.test.mjs](../tests/unit/building/block-content-edit.test.mjs) — Verschobener Gegenstand behält Komponenten, formatierte Namen/Zeilen bleiben.; [tests/unit/editor/editor-patterns.test.mjs](../tests/unit/editor/editor-patterns.test.mjs) — Schablone behält Ausstattung.

**Dateiumfang:** `packages/domain/src/data/planGraph.ts`, `packages/domain/src/data/integrity.ts`, `packages/domain/src/planning/projectOrder.ts`, `packages/domain/src/core/project.ts`, `packages/domain/src/data/backup.ts`, `packages/domain/src/editor/stencils.ts`, `packages/voxel/src/blockContentEdit.ts`, `packages/formats/src/structure.ts`, `apps/web/src/app/router.ts`, `apps/web/src/views/ProjectsView.tsx`, `apps/web/src/views/project/session.ts`, `apps/web/src/views/project/BlocksTab.tsx`, `apps/web/src/editor/BlockEditor.tsx`, `apps/web/src/editor/LayerGrid.tsx`, `apps/web/src/editor/WorkshopPage.tsx`, `tests/unit/core/core-links.test.mjs`. **Abhängigkeiten:** ARCH-02, PROJ-04, EDIT-06. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### WORLD-SHARE-01

**Weltplan und Server-Karte nur über den Team-Raum: Weltplan mit Bauplätzen, Gruppen und Sperren an alle Mods und das Paper-Plugin, Plugin schreibt BlueMap-/Dynmap-Marker selbst, Kartenliste geteilt, Dateiwege nur als Notfall** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Weltplan und Server-Karte über den Team-Raum“) · Zuständiger Thread: „Weltplan und Server-Karte über den Team-Raum“ · Aktualisiert: 2026-11-06T14:07:27.429Z

- [x] WORLD-SHARE-01-S01: Team-Raum: geteilte Dokumente weltplan und karten (Revision, If-Match/409, ?known, Serverschlüssel nur lesen, Ankündigung per WebSocket).
- [x] WORLD-SHARE-01-S02: Planer: „Weltplan im Team“ auf der Weltkarte, Dreiwege-Abgleich je Eintrag, Marker je Dimension mitgeschickt, Kartenliste geteilt; Datei-Knöpfe nur noch unter „Notfall ohne Team-Raum oder Plugin“.
- [x] WORLD-SHARE-01-S03: Mod 0.22.0: Weltplan des Teams aus dem Raum im Spiel (Markierungen, Gruppen, gesperrte Flächen grau) ohne Planer-Verbindung.
- [x] WORLD-SHARE-01-S04: Paper-Plugin 0.22.0: Marker selbst in BlueMap (API 2) und Dynmap (Marker-API), Zwischenspeicher für Neustart, Sperrschutz aus/hinweis/sperren, /bauplaner weltplan.
- [ ] WORLD-SHARE-01-S05: Abnahme KARTE-10..12 durch Philipp (zwei Browser, Server-Karte, Sperrschutz im Spiel).

**Abnahme:** Kein Herunterladen und Einfügen im normalen Ablauf: Planer, Mods und Plugin tauschen Weltplan und Kartenliste nur über den Team-Raum. Gleichzeitige Änderungen gehen nicht verloren (If-Match, Abgleich je Eintrag), Sperren bleiben erhalten. Echte Paper-Server mit BlueMap 5.29 und Dynmap 3.7 zeigen die Marker, auch nach Neustart.

**Nächste Aktion:** Abnahme KARTE-10..12 im Spiel und auf der Server-Karte.

**Nur Philipp:** Im Spiel an deinem PC: Mit dem Paper-Plugin und BlueMap oder Dynmap prüfen, ob die Marker des Weltplans ohne Datei auf der Server-Karte erscheinen und gesperrte Bauplätze geschützt sind (KARTE-10..12).

**Prüfstand:** Einheits-, Browser-, Spiel- und Echtserver-Tests grün; Abnahme durch Philipp offen (S05).

**Nachweise:** [tests/unit/team/team-room.test.mjs](../tests/unit/team/team-room.test.mjs) — Geteilte Dokumente: Revision, 409, unchanged, Serverschlüssel 403, Ankündigung.; [tests/unit/world/world-share.test.mjs](../tests/unit/world/world-share.test.mjs) — Dreiwege-Abgleich, Marker je Dimension, Kartenliste.; [tests/e2e/team-room.e2e.mjs](../tests/e2e/team-room.e2e.mjs) — Zwei Browser: Raum-Weltplan mit Sperre kommt an, Punkte des einen erscheinen beim anderen und im Raum.; [scripts/mod/test_bridge_paper_world.sh](../scripts/mod/test_bridge_paper_world.sh) — Echter Paper-Server 26.3 + BlueMap 5.29 und 1.21.4 + Dynmap 3.7-beta-8: Marker aus dem Raum, Push, Neustart.; [mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java](../mods/bauplaner-bridge/fabric-26.3/src/gametest/java/io/github/freadeax/bauplaner/bridge/gametest/BridgeGameTest.java) — Spieltest: Weltplan des Teams aus dem Raum im Hologramm (teamMarks 4, Bild team-weltplan.png).

**Dateiumfang:** `services/team-room/src/core.js`, `services/team-room/src/index.js`, `packages/domain/src/world/worldShare.ts`, `apps/web/src/views/map/useWorldShare.ts`, `apps/web/src/views/map/WorldSharePanel.tsx`, `apps/web/src/views/map/LiveMapPanel.tsx`, `apps/web/src/views/map/WorldMapView.tsx`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/room/RoomClient.java`, `mods/bauplaner-bridge/mod-core/src/main/java/io/github/freadeax/bauplaner/mod/live/WorldMarks.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/WorldModule.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/WorldShare.java`, `mods/bauplaner-bridge/paper/src/main/java/io/github/freadeax/bauplaner/bridge/paper/MapMarkers.java`, `scripts/mod/bridge_paperworld.mjs`, `docs/architecture/welt/WORLD_SHARE.md`. **Abhängigkeiten:** MAP-02, MAP-04. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### GUIDE-01

**Anleitung „Wie geh ich es an?“: eigener Reiter mit Wegen nach Ziel, jeder Schritt mit Grafik, kurzem Satz und Link an die passende Stelle** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude (Thread „Tutorial-Reiter „Wie geh ich es an?“ bauen“) · Zuständiger Thread: „Tutorial-Reiter „Wie geh ich es an?“ bauen“ · Aktualisiert: 2026-11-06T14:18:29.478Z

- [x] GUIDE-01-S01: Sechs Wege nach Ziel (Erstes Projekt, Bibliothek, Mod, Hologramm, Gelände aus der Mod, Team) mit je 4–6 Schritten; jeder Schritt ein Satz (≤110 Zeichen), nur Online-/Mod-Wege.
- [x] GUIDE-01-S02: Grafik je Schritt (Szene Planer/Spiel/Launcher, Symbol, Tastenkappe), animiert ohne reduced-motion, hell/dunkel über Theme-Tokens.
- [x] GUIDE-01-S03: Knöpfe führen ins zuletzt geänderte oder gewählte Projekt; ohne Projekt zur Projektzentrale; Voraussetzungen springen in den anderen Weg; Haken und Fortschritt pro Browser; teilbare Adresse ?weg=&schritt=.
- [x] GUIDE-01-S04: Einstiege: Hauptnavigation (bei knapper Breite ?-Symbol), Schnellsuche, Projektzentrale, Seite „Spiel“; Testfälle START-08/09.
- [ ] GUIDE-01-S05: Philipp prüft die Anleitung am iPad und im Spiel (START-08/09) und meldet unklare Sätze.

**Abnahme:** Jeder Schritt hat Bild und einen kurzen Satz; jeder Knopf führt an die genannte Stelle; Kopfzeile ohne Überbreite 1920–761 px; Handy 390 px ohne seitlichen Überhang.

**Nächste Aktion:** Abnahme durch Philipp (START-08/09); Begriffe mit „Bedienung des Planers vereinfachen“ (Reiter-Kurzsätze) und UI-03 abgleichen.

**Nur Philipp:** Auf echten Geräten und Browsern: Anleitung am iPad durchgehen (START-08/09), unklare Sätze melden.

**Prüfstand:** Einheits- und Browsertests grün; Abnahme am Gerät offen.

**Nachweise:** [tests/unit/web/guide.test.mjs](../tests/unit/web/guide.test.mjs) — Satzlänge, ein Satz, Symbole, gültige Routen und Reiter, Projektlinks, Adresse, Fortschritt.; [tests/e2e/anleitung.e2e.mjs](../tests/e2e/anleitung.e2e.mjs) — Chromium 1400/390 px: Einstieg, Bilder, Projektlinks, Wegsprung, Haken nach Neuladen, Schnellsuche.

**Dateiumfang:** `apps/web/src/views/guide/guideSteps.ts`, `apps/web/src/views/guide/GuideView.tsx`, `apps/web/src/views/guide/GuideArt.tsx`, `apps/web/src/views/guide/guide.css`, `apps/web/src/app/nav.ts`, `apps/web/src/app/router.ts`, `apps/web/src/app/icons.tsx`, `apps/web/src/app/Shell.tsx`, `apps/web/src/styles/shell.css`, `apps/web/src/main.tsx`, `apps/web/src/views/ProjectsView.tsx`, `apps/web/src/views/mod/ModView.tsx`, `apps/web/src/testing/testplan.ts`, `tests/unit/web/guide.test.mjs`, `tests/e2e/anleitung.e2e.mjs`, `tests/e2e/shell.e2e.mjs`, `docs/architecture/planer/UI.md`. **Abhängigkeiten:** UI-02, GAME-11, TERRAIN-04, LINK-11. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

### UI-03

**Design-System: saubere, einheitliche und schön angepasste Planer-Oberfläche** · 🧩 Implementiert · Abnahme offen · Priorität P1 · Verantwortlich: Claude Thread „Planer-Oberfläche schön neu gestalten“ · Zuständiger Thread: „Planer-Oberfläche schön neu gestalten“ · Aktualisiert: 2026-11-06T15:49:33.071Z

- [x] UI-03-S01: Design-Tokens (Abstände, Radien, Schrift, Schatten, Bewegung, Zustandsfarben) und Standardthema „Werkbank“ (Grasgrün/Gold, hell und dunkel).
- [x] UI-03-S02: Gemeinsame Bausteine angeglichen: Knöpfe mit Blockkante, Felder, Karten, Hinweise, Chips, Segmente, Tabellen; aktiver Reiter mit Akzentstrich, Schrittgruppen aus UX-01 mitgestaltet.
- [x] UI-03-S03: Darstellungsmenü mit Farbfeldern und Hell/Dunkel-Schalter; Thema ohne Aufblitzen beim Laden.
- [x] UI-03-S04: Dezente Animationen (Seitenwechsel, Karten, Menüs) mit „Bewegung reduzieren“; iPad-Ziele 44 px.
- [ ] UI-03-S05: Kontrastprüfung aller Hauptseiten und Projektreiter hell/dunkel, iPad-Browsertest; Abnahme durch Philipp am iPad (START-20/21).

**Abnahme:** Alle Hauptseiten und Projektreiter nutzen dieselben Knöpfe, Felder, Karten und Hinweise; jeder sichtbare Text erreicht WCAG AA hell und dunkel; am iPad sind Ziele ≥ 44 px, alle Reiter sichtbar, keine Querverschiebung; „Bewegung reduzieren“ schaltet Animationen ab.

**Nächste Aktion:** Abnahme START-20/21 durch Philipp am iPad; gruppierte Projektreiter aus „Bedienung vereinfachen“ und Anleitung optisch mitziehen; Werte an das Mod-Menü weitergeben.

**Nur Philipp:** Auf echten Geräten und Browsern: Am iPad die neue Oberfläche ansehen und START-20/21 in #/testphase abhaken (Thema „Werkbank“, Reiter wischen, „Bewegung reduzieren“).

**Prüfstand:** Browserprüfung in Chromium bestanden; echte iPad-/Safari-Abnahme durch Philipp offen.

**Nachweise:** [tests/e2e/design.e2e.mjs](../tests/e2e/design.e2e.mjs) — Standardthema beim ersten Bild, WCAG-Kontrast auf Hauptseiten und fünf Projektreitern hell/dunkel, iPad Pro 11 (44 px, Reiter in der Leiste, keine Querverschiebung), reduzierte Bewegung.; [docs/architecture/planer/UI.md](architecture/planer/UI.md) — Abschnitt „Design-System (UI-03)“ mit Farbwerten, Tokens, Bausteinen und Regeln.

**Dateiumfang:** `apps/web/src/theme/`, `apps/web/src/main.tsx`, `apps/web/src/testing/testplan.ts`, `docs/architecture/planer/UI.md`, `docs/TESTING.md`, `docs/testing/TESTPLAN.md`, `tests/e2e/design.e2e.mjs`, `tests/e2e/theme.e2e.mjs`, `tests/e2e/ui-acceptance.e2e.mjs`, `tests/unit/web/`. **Abhängigkeiten:** UI-01, UI-02. **Alte IDs:** —.

**Integration:** Main ausstehend; Pages-Quelle ausstehend.

## Weiterführende Dokumente

- [Änderungsverlauf mit Dateien und Aufgabenständen](ROADMAP_HISTORY.md)
- [Aktueller Systemstatus](STATUS.md)
- [Tests und Prüfgrenzen](TESTING.md)
- [Historische Roadmap, nicht mehr steuernd](archiv/ROADMAP_LEGACY.md)
- [Modulvertrag](architecture/kern/MODULES.md)
- [Entwicklungskoordination](COMMUNICATION.md)
