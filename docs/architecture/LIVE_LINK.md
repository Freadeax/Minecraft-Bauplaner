# Live-Verbindung Website ↔ Mod und Weltplan (MAP-03)

Die Weltkarte (`#/karte`) wird zur Live-Karte: Die Bauplaner-Mod (Fabric 26.3, ab 0.5.0) öffnet auf dem Computer des Spielers einen kleinen HTTP-Dienst, die Website fragt ihn ab. Es gibt keinen Server dazwischen, die Welt wird nie verändert, der Spielserver merkt nichts davon.

## Sicherheit

- Dienst nur auf `127.0.0.1` (Loopback), Standardport **47615**, im Spiel änderbar (`/bauplaner verbinden port <n>`).
- `Host` muss `127.0.0.1:<port>` oder `localhost:<port>` sein (Schutz gegen DNS-Rebinding).
- `Origin`: nur `https://freadeax.github.io` und `http://localhost`/`http://127.0.0.1` mit beliebigem Port (lokale Entwicklung). Andere Ursprünge: 403. Antworten tragen CORS-Header nur für erlaubte Ursprünge; Vorabanfragen beantworten `Access-Control-Allow-Private-Network`.
- Kopplung: `/bauplaner verbinden` zeigt einen sechsstelligen Code, 5 Minuten gültig, höchstens 5 Fehlversuche. Die Website tauscht ihn gegen einen Schlüssel (32 Byte, base64url). Die Mod speichert höchstens 8 Schlüssel in `bauplaner/verbindung.properties`; `/bauplaner verbinden aus` widerruft alle.
- Jede Anfrage außer `hello`/`pair` braucht den Kopf `X-Bauplaner-Token`, sonst 401.
- Die Website speichert Port und Schlüssel nur im Browser (`localStorage`, Schlüssel `bauplaner.spielverbindung`). Chrome fragt ggf. nach „Geräte im lokalen Netzwerk“; der Abruf setzt `targetAddressSpace: 'loopback'` (mit `'local'` verweigert Chrome die Anfrage an 127.0.0.1).
- Grenzen: höchstens 64 Chunks je Anfrage, Plandatei höchstens 16 MB, höchstens 500 Markierungen.

## Protokoll 1

| Anfrage | Antwort |
|---|---|
| `GET /v1/hello` | `{app:"bauplaner-mod", protocol:1, mod:{version,loader,minecraft}, pairing}` |
| `POST /v1/pair` `{code}` | `{token}` |
| `GET /v1/status` | `{time, player:{x,y,z,yaw,pitch,dimension,name}\|null, world:{key,server,singleplayer}\|null, hologram:{planFile,name,projectId,revisionNumber,placement,visible,box,counts:{ok,state,missing,wrong,unknown},total}\|null, marks}` |
| `GET /v1/chunks?c=x,z;…` | `{dimension, ids:[…], chunks:[{x,z,columns:[256 × [yTop,idIndex,…]]}], missing:[[x,z]…]}` – oberste Abschnitte je Spalte von oben nach unten; Abbruch am Beginn des zweiten festen Abschnitts, nach 16 Abschnitten oder 64 Blöcken Tiefe |
| `POST /v1/plan?name&dimension&x&y&z&turns&mirror` (Rumpf: `.schem`) | Plan wird geprüft (`PlanModel.parse`), atomar nach `bauplaner/plans/` geschrieben und genau so als Hologramm platziert |
| `POST /v1/placement` `{dimension,x,y,z,turns,mirror}` | verschiebt das aktuelle Hologramm |
| `POST /v1/marks` `{dimension, items:[Weltplan-Einträge]}` | Markierungen, gespeichert in `bauplaner/markierungen.json` |
| `POST /v1/unpair` | widerruft den eigenen Schlüssel |

Fehler: `{error:"…"}` mit Status 400/401/403/404/409/411/413/503. Arbeit im Spiel läuft über den Spielthread (`CompletableFuture.supplyAsync(…, mc)`, 3 s Zeitlimit → 503).

Code: `mods/bauplaner-bridge/mod-core/…/mod/live/` (versionsneutral: `LiveLinkServer`, `Json`, `WorldMarks`, `SurfaceRuns`), `fabric-26.3/…/LiveLink.java` (Handler), `MarksRenderer.java` (Linien und HUD); Website `packages/domain/src/liveLink.ts` (strenge Leser, Geländeeinstufung wie TERRAIN-01), `apps/web/src/views/map/liveClient.ts`.

## Weltplan

`packages/domain/src/worldPlan.ts`: Bauplätze (Rechteck, Höhe, Projekt), Wege (Ecken, Art, Breite; vierfach verbundene Spalten, begehbar) und Punkte (Anker, Ziel, Lager, Portal, Farm, Treffpunkt) je Dimension. Jede Änderung ist eine Operation mit exakter Umkehrung (Rückgängig/Wiederholen, Strg+Z/Strg+Y). Gespeichert in IndexedDB (`meta`, Schlüssel `worldPlan`) mit Revisionsprüfung wie Projekte; reist in der vollen Sicherung (Format 2, `worldPlanItems`) mit.

## Oberfläche

- Werkzeugleiste über der Draufsicht: Auswählen (V), Bauplatz (B, Umschalt rastet an Chunks), Weg (W, Doppelklick/Eingabe beendet, Rücktaste nimmt zurück), Punkt (P), Messen (M: Luftlinie, Weg auf dem Raster, Höhenunterschied, Nether-Entfernung). Gewählte Projekte und Einträge lassen sich ziehen; Verschieben eines Projekts ist ein normaler, rückgängig machbarer Projektschritt.
- Bauplatz: Projekt zuordnen, „hierher setzen“, „Gelände aus dem Spiel ins Projekt“ (aus den gelesenen Chunks eine TERRAIN-01-Geländeaufnahme, `terrain.set`).
- Panel „Spiel“: Verbinden, Koppeln, Spielerposition mit Blickrichtung, Folgen (auch über Dimensionen), Spur der letzten 10 Minuten, „Gelände um mich lesen“ (etwa 10 Chunks Umkreis, gefärbte Kacheln unter den Projekten, Höhe im Zeiger), Hologramm-Fortschritt mit Abgleich zur Weltkarte („Lage aus dem Spiel übernehmen“), „Weltplan ins Spiel senden“.
- Projekt: „Ins Spiel senden“ (Revision einfrieren, `.schem`, an genau die Kartenlage), „Hier platzieren, wo ich stehe“.

## Prüfung

- `tests/worldplan.test.mjs`, `tests/livelink.test.mjs` (Domäne), `mod-core` `LiveLinkTest` (Kopplung, Ursprung, Host, Grenzen).
- `tests/e2e/livelink.e2e.mjs` gegen den Mod-Simulator `tests/e2e/modSimulator.mjs` (gleiche Routen und Regeln).
- Spieltest `scripts/test_bridge_ingame.sh`: echtes Minecraft 26.3, `/bauplaner verbinden`, alle Anfragen über 127.0.0.1, Prüfung mit den Lesern der Website (`live.json`).

## Grenzen

- Das Gelände kommt nur aus Chunks, die der Client gerade geladen hat (Sichtweite). Höhlen und Überhänge unter der Oberfläche fehlen (2,5D wie TERRAIN-01).
- Die Weltkarte plant Projekte ungedreht; ein im Spiel gedrehtes Hologramm wird gemeldet, aber nicht übernommen.
- Nur Fabric 26.3; Forge/NeoForge/Paper haben die Verbindung noch nicht.
