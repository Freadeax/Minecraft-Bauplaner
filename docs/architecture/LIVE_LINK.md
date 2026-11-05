# Live-Verbindung Website ↔ Mod und Weltplan (MAP-03)

Die Weltkarte (`#/karte`) wird zur Live-Karte: Die Bauplaner-Mod (Fabric 26.3, ab 0.5.0) öffnet auf dem Computer des Spielers einen kleinen HTTP-Dienst, die Website fragt ihn ab. Es gibt keinen Server dazwischen, die Welt wird nie verändert, der Spielserver merkt nichts davon.

## Sicherheit

- Dienst nur auf `127.0.0.1` (Loopback), Standardport **47615**. Ab 0.12.0 läuft er von selbst (AUTO_LINK.md, LINK-03); vorher aus bis `/bauplaner verbinden`. `/bauplaner verbinden port <n>` speichert den Port und startet die Verbindung samt Code (ab 0.5.1; in 0.5.0 speicherte der Befehl nur den Port, die Website fand dann nichts – Philipps erster Spieltest 02.11.2026).
- `Host` muss `127.0.0.1:<port>` oder `localhost:<port>` sein (Schutz gegen DNS-Rebinding).
- `Origin`: nur `https://freadeax.github.io` und `http://localhost`/`http://127.0.0.1` mit beliebigem Port (lokale Entwicklung). Andere Ursprünge: 403. Antworten tragen CORS-Header nur für erlaubte Ursprünge; Vorabanfragen beantworten `Access-Control-Allow-Private-Network`.
- Kopplung ab 0.12.0 per Klick: Die Website fragt mit `POST /v1/pair/ask`, das Spiel zeigt „J drücken“, der Spieler klickt „Planer zulassen“, die Website holt den Schlüssel einmal mit `GET /v1/pair/ask` (AUTO_LINK.md §4). Weiter möglich (ältere Planer): `/bauplaner verbinden` zeigt einen sechsstelligen Code, 5 Minuten gültig, höchstens 5 Fehlversuche. Die Website tauscht ihn gegen einen Schlüssel (32 Byte, base64url). Die Mod speichert höchstens 8 Schlüssel in `bauplaner/verbindung.properties`; `/bauplaner verbinden aus` widerruft alle.
- Jede Anfrage außer `hello`/`pair` braucht den Kopf `X-Bauplaner-Token`, sonst 401.
- Die Website speichert Port und Schlüssel nur im Browser (`localStorage`, Schlüssel `bauplaner.spielverbindung`). Chrome fragt ggf. nach „Geräte im lokalen Netzwerk“; der Abruf setzt `targetAddressSpace: 'loopback'` (mit `'local'` verweigert Chrome die Anfrage an 127.0.0.1).
- Grenzen: höchstens 64 Chunks je Anfrage, Plandatei höchstens 64 MB ab Mod 0.9.0 (Fähigkeit `bigplans`, Planbox bis 16,7 Mio. Zellen; ältere Mods 16 MiB und 4 Mio. Zellen, die Website prüft das vor dem Senden mit `checkPlanForMod`), höchstens 500 Markierungen. Siehe [SIZE_LIMITS](SIZE_LIMITS.md).

## Protokoll 1

| Anfrage | Antwort |
|---|---|
| `GET /v1/hello` | `{app:"bauplaner-mod", protocol:1, mod:{version,loader,minecraft}, pairing}` |
| `POST /v1/pair` `{code}` | `{token}` |
| `GET /v1/status` | `{time, player:{x,y,z,yaw,pitch,dimension,name}\|null, world:{key,server,singleplayer}\|null, hologram:{planFile,name,projectId,revisionNumber,placement,visible,box,counts:{ok,state,missing,wrong,unknown},total}\|null, marks}` |
| `GET /v1/chunks?c=x,z;…` | `{dimension, ids:[…], chunks:[{x,z,columns:[256 × [yTop,idIndex,…]]}], missing:[[x,z]…]}` – oberste Abschnitte je Spalte von oben nach unten; Abbruch am Beginn des zweiten festen Abschnitts, nach 16 Abschnitten oder 64 Blöcken Tiefe |
| `POST /v1/plan?name&dimension&x&y&z&turns&mirror` (Rumpf: `.schem`) | Plan wird geprüft (`PlanModel.parse`), atomar nach `bauplaner/plans/` geschrieben und genau so als Hologramm platziert. Die Website sendet nicht ausgewählte Zellen als Luft (`LIVE_PLAN_EXPORT`): Die Mod überspringt Luft, nimmt aber jeden anderen Block, auch `structure_void`, als Planblock. Geprüft mit `scripts/bridge_sendcheck.mjs` |
| `POST /v1/placement` `{dimension,x,y,z,turns,mirror}` | verschiebt das aktuelle Hologramm |
| `POST /v1/marks` `{dimension, items:[Weltplan-Einträge]}` | Markierungen, gespeichert in `bauplaner/markierungen.json` |
| `GET /v1/scan` (ab 0.7.1, `hello.features` enthält `scan`) | **Baustand**: die ganze Planbox des Hologramms als Aufnahme (`bauplaner-scan` v1, gzip, `application/octet-stream`, Dateiname im Kopf `X-Bauplaner-File`, per `Access-Control-Expose-Headers` freigegeben). In **Plankoordinaten und Planausrichtung**, auch wenn das Hologramm gedreht oder gespiegelt ist (`ScanJob.inProjectFrame`, `PlanScan`); `WorldAnchor` = Lage des Hologramms. Höchstens 16 777 216 Zellen ab 0.9.0 (vorher 4 000 000; 413); gelesen in Scheiben zu 200 000 Zellen je Spieltick, Hologramm in anderer Dimension als der Spieler: 409. Die Datei landet zusätzlich in `bauplaner/scans/`. |
| `POST /v1/unpair` | widerruft den eigenen Schlüssel |

Fehler: `{error:"…"}` mit Status 400/401/403/404/409/411/413/503. Arbeit im Spiel läuft über den Spielthread (`CompletableFuture.supplyAsync(…, mc)`, 3 s Zeitlimit → 503).

Code: `mods/bauplaner-bridge/mod-core/…/mod/live/` (versionsneutral: `LiveLinkServer`, `Json`, `WorldMarks`, `SurfaceRuns`), `hologram-26.3/…/LiveLink.java` (Handler, Fabric und NeoForge), `MarksRenderer.java` (Linien und HUD); Website `packages/domain/src/team/liveLink.ts` (strenge Leser, Geländeeinstufung wie TERRAIN-01), `apps/web/src/views/map/liveClient.ts`.

## Protokoll 2 (GAME-08, Mod 0.8.0)

Abgestimmt am 02.11.2026 zwischen MAP-06 (Website) und dem Mod-Thread; Website und Mod (0.8.0, Fabric und NeoForge) sind fertig. Die Website schaltet nie nach Versionsnummern, sondern nach `hello.features`; `hello.protocol` darf 1 oder 2 sein (höhere Werte lehnt `readLiveHello` ab). Unbekannte Felder an Weltplan-Einträgen ignoriert jede Mod (`WorldMarks.parse`), unbekannte **Arten** lehnt sie mit 400 ab – deshalb filtert `marksForMod` vor dem Senden.

| Merkmal in `hello.features` | Bedeutung |
|---|---|
| `marks2` | `POST /v1/marks` nimmt Weltplan-Schema 2 an: `{kind:"zone", id, name, note?, category, points:[[x,z]…] (3–256), layer?, color?}`, neue Punktarten `notiz`, `gefahr`, `rohstoff`, `spawn`, `aussicht`, und an jedem Eintrag optional `layer` (Text bis 40 Zeichen) und `color` (`#rrggbb`). Die Mod (`WorldMarks` Schema 2, `MarksRenderer`) zeichnet Zonen als durchscheinenden Teppich aus Bodenzellen (bei großen Zonen gröber, höchstens 40 000 Zellen) mit Rand entlang des Geländes, nennt die Zone am Spielerstandort in der HUD-Zeile, nutzt `color` statt der Art-Farbe und blendet Ebenen mit `/bauplaner ebenen [<name>|alle]` ein und aus (nicht gespeichert; mit neuen Markierungen bleiben nur noch vorhandene Ebenen ausgeblendet). Ohne `marks2` schickt die Website nur Bauplätze, Wege und die sechs alten Punktarten ohne `layer`/`color` und meldet, was auf der Karte bleibt. |
| `players` | `GET /v1/players` → `{dimension, players:[{name, x, y, z, yaw}]}`: Mitspieler, die der Client gerade sieht (Tab-Liste reicht nicht, Position nötig; der eigene Spieler fehlt). Die Website fragt sie bei jedem zweiten Statusabruf ab und zeichnet sie als kleine Pfeile mit Namen. Die Mod liest `ClientLevel.players()` auf dem Spielthread, höchstens 200. |

`POST /v1/zones` entfällt (Zonen reisen in `marks`).

## Protokoll 3 (GAME-08, Mod 0.13.0)

Rückrichtung: Punkte, die im Spiel gesetzt werden, landen im Weltplan. Merkmal `marks3` in `hello.features`; `hello.protocol` bleibt 2, eine Website ohne Protokoll 3 merkt nichts.

| Route | Inhalt |
|---|---|
| `GET /v1/marks/game` | `{marks:[{id, type, name, dimension, x, y, z, at, by?}]}`: wartende Punkte (höchstens 200). `id` ist eindeutig (`g<Zeit base36>-<Zähler>`), `at` die Zeit des Setzens (ISO, UTC, wie `TeamWire.time`), `type` eine der elf Punktarten. |
| `POST /v1/marks/game/ack` | `{ids:[…]}`: Der Weltplan hat diese Punkte; die Mod streicht sie aus ihrem Ausgang und sagt es im Chat. |

- **Im Spiel.** `/bauplaner markieren <art> [name]` setzt einen Punkt an der Fußposition (Befehlsseite: Reiter „Website“). `/bauplaner markierungen` listet die wartenden, `/bauplaner markierungen loeschen <nr>` nimmt einen zurück. Bis zur Übernahme zeichnet die Mod sie wie Weltplan-Punkte auf der Ebene „Aus dem Spiel“. Der Ausgang liegt in `config/bauplaner/markierungen-aus-dem-spiel.json` und übersteht Neustarts.
- **Auf der Weltkarte.** Bei verbundener Mod mit `marks3` fragt die Seite alle 5 s ab und zeigt „N Markierungen aus dem Spiel“ mit „In den Weltplan übernehmen“. Das legt Punkte mit der ID `spiel-<id>`, Ebene „Aus dem Spiel“ und der Notiz „Im Spiel gesetzt von … am …“ als **ein** Rückgängig-Schritt an (`gameMarksToItems`) und quittiert danach alle IDs. Geht die Quittung verloren, erkennt der zweite Abgleich die Punkte an der ID und legt nichts doppelt an.
- **Sicherheit.** Beide Routen verlangen den Kopplungsschlüssel wie jede andere. Nichts davon geht an den Server.

## Weltplan

`packages/domain/src/world/worldPlan.ts` (**Schema 2** seit MAP-06; Schema 1 wird gelesen und beim Speichern angehoben): Bauplätze (Rechteck, Höhe, Projekt), Wege (Ecken, Art, Breite; vierfach verbundene Spalten, begehbar), Punkte (Anker, Ziel, Lager, Portal, Farm, Treffpunkt; seit Schema 2 auch Notiz, Gefahr, Rohstoff, Spawn/Bett, Aussicht) und Zonen (Polygon mit Art) je Dimension; jeder Eintrag optional mit Ebene und Farbe. Jede Änderung ist eine Operation mit exakter Umkehrung (Rückgängig/Wiederholen, Strg+Z/Strg+Y). Gespeichert in IndexedDB (`meta`, Schlüssel `worldPlan`) mit Revisionsprüfung wie Projekte; reist in der vollen Sicherung (Format 2, `worldPlanItems`) mit.

## Oberfläche

- Verbinden: ab Mod 0.12 „Verbinden“ und im Spiel J → „Planer zulassen“; bei älteren Mods Schritte in der richtigen Reihenfolge (erst im Spiel `/bauplaner verbinden`, dann „Verbinden“, dann Code). Nach „Verbinden“ sucht die Seite bis zu 3 Minuten alle 2 s weiter, damit der Befehl auch danach kommen darf. Meldet Chrome die Berechtigung für das lokale Netzwerk als „denied“ (`navigator.permissions`, Namen `local-network-access`/`loopback-network`), nennt die Seite den Weg in die Website-Einstellungen. Sonst bietet sie einen Selbsttest: `http://127.0.0.1:<port>/v1/hello` im neuen Tab unterscheidet „Dienst aus“ von „Browser blockiert“.

- Werkzeugleiste über der Draufsicht: Auswählen (V), Bauplatz (B, Umschalt rastet an Chunks), Weg (W, Doppelklick/Eingabe beendet, Rücktaste nimmt zurück), Zone (Z, wie Weg, mindestens drei Ecken), Punkt (P), Messen (M: mehrere Punkte, Luftlinie, Weg auf dem Raster, Höhenunterschied, Nether-Entfernung, Fläche). Vertiefung in [WORLD_BUILDER](WORLD_BUILDER.md#vertiefung-map-06). Gewählte Projekte und Einträge lassen sich ziehen; Verschieben eines Projekts ist ein normaler, rückgängig machbarer Projektschritt.
- Bauplatz: Projekt zuordnen, „hierher setzen“, „Gelände aus dem Spiel ins Projekt“ (aus den gelesenen Chunks eine TERRAIN-01-Geländeaufnahme, `terrain.set`).
- Panel „Spiel“: Verbinden, Koppeln, Spielerposition mit Blickrichtung, Folgen (auch über Dimensionen), Spur der letzten 10 Minuten, „Gelände um mich lesen“ (etwa 10 Chunks Umkreis, gefärbte Kacheln unter den Projekten, Höhe im Zeiger), Hologramm-Fortschritt mit Abgleich zur Weltkarte („Lage aus dem Spiel übernehmen“), „Weltplan ins Spiel senden“.
- **Baustand aus dem Spiel (MAP-05, Mod 0.7.1)** im Hologramm-Kasten des Panels „Spiel“: „⟳ Baustand holen“ liest die Planbox über `GET /v1/scan`, vergleicht sie mit `gameCheck.ts` genau wie eine importierte Aufnahme (Revision der Aufnahme als Grundlage) und speichert sie im Aufnahmeverlauf des Projekts (Reiter „Bauen“ zeigt sie mit Koordinaten). Anzeige: richtige Blöcke, fehlend/falsch/Zustand/abbauen, Schritte bestätigt/teilweise/abweichend, Ebenen von oben nach unten mit Balken (Klick filtert die Karte auf eine Höhe), Abweichungen als farbige Spalten auf der Draufsicht (dringendste je Spalte: falsch > Zustand > abbauen > fehlt; „nicht geladen“ wird nicht gezeichnet). „N bestätigte Schritte abhaken“ ist ein Kartenschritt mit Rückgängig; Haken ändern sich nie von selbst. „alle 20 s nachsehen“ holt den Baustand wiederholt, ohne jedes Mal zu speichern. Ältere Mods ohne `scan` bekommen einen Hinweis auf das Update.
- Weltplan automatisch abgleichen (Schalter, im Browser gemerkt): jede Änderung geht 1,5 s nach der letzten Änderung als Markierungen ins Spiel.
- Kontextmenü auf freier Fläche: „Hologramm hierher setzen“ (Projektursprung auf diese Spalte, Höhe aus dem Gelände, Drehung bleibt) und „Diese Stelle auf BlueMap/… zeigen ↗“ (Vorlage aus dem Feld „Live-Karte“). Für ein gewähltes Projekt zusätzlich „▶ Ins Spiel senden“.
- Projekt: „Ins Spiel senden“ (Revision einfrieren, `.schem`, an genau die Kartenlage), „Hier platzieren, wo ich stehe“.

## Prüfung

- `tests/worldplan.test.mjs`, `tests/livelink.test.mjs` (Domäne), `mod-core` `LiveLinkTest` (Kopplung, Ursprung, Host, Grenzen).
- `tests/game-check.test.mjs` (Ebenen, Kartenspalten, Schrittzählung), `tests/e2e/game-progress.e2e.mjs` (Baustand holen, Ebenenfilter, Abweichungen auf der Karte, Abhaken mit Rückgängig, Speicherung im Projekt, automatischer Weltplanabgleich, Hologramm per Kontextmenü, Hinweis bei alter Mod); `mod-core` `ModCoreTest` (gedrehter Baustand in Plankoordinaten, nicht geladene Chunks) und `LiveLinkTest` (Route, Kopf, Freigabe).
- `tests/e2e/livelink.e2e.mjs` gegen den Mod-Simulator `tests/e2e/modSimulator.mjs` (gleiche Routen und Regeln).
- `tests/e2e/map-depth.e2e.mjs`: Zonen, Ebenen, Messen, Notiz, Neuladen (Schema 2); gegen den Simulator als alte Mod (Protokoll 1: gefilterte Markierungen, Höhenprofil, Route über das Live-Gelände, Punkt wo ich stehe) und als neue Mod (`startModSimulator(port, {protocol: 2, features: ['scan','marks2','players']})`: Mitspieler, Zonen mit Ebene im Spiel). `tests/worldroute.test.mjs` (Messen, Profil, A*-Route um Kamm, Tor und Wasser, Vereinfachung).
- Spieltest `scripts/test_bridge_ingame.sh`: echtes Minecraft 26.3, `/bauplaner verbinden`, alle Anfragen über 127.0.0.1, Prüfung mit den Lesern der Website (`live.json`); seit 0.7.1 auch der Baustand am gebauten Plan (gleich der Live-Zählung der Mod, falscher Block an der erwarteten Stelle) und gedreht auf leerem Boden (gleiche Box, nichts gebaut).

## Grenzen

- Das Gelände kommt nur aus Chunks, die der Client gerade geladen hat (Sichtweite). Höhlen und Überhänge unter der Oberfläche fehlen (2,5D wie TERRAIN-01).
- Seit Mod 0.7.0: `POST /v1/section {section}` wählt den Bauabschnitt im Spiel (0 = alle); der Status meldet `hologram.section` und `hologram.sections`.
- Die Weltkarte plant Projekte ungedreht; ein im Spiel gedrehtes Hologramm wird gemeldet, aber nicht übernommen. Der Baustand funktioniert trotzdem (Plankoordinaten); die Abweichungen erscheinen an der Kartenlage des Projekts.
- BlueMap wird nicht eingebettet und nicht abgefragt: `server.lmnt-gaming.net:8100` läuft über `http://` und ist aus einer `https`-Seite heraus gesperrt. Der echte Vergleich läuft über die Mod (sie liest die tatsächlichen Blöcke), BlueMap bleibt der Blick von oben per Link.
- Fabric 26.3 und seit 0.6.0 NeoForge 26.3 (gemeinsamer Code in `hologram-26.3`, `LiveLink`/`MarksRenderer`); Forge und Paper haben die Verbindung noch nicht.
