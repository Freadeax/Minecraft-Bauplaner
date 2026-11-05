# Ausweichwege über alle Verbindungen (FALLBACK-01)

Stand 04.11.2026 · Mod 0.16.0 · Thread „Mod, Server und Client mit Fallbacks ausbauen“.
Anlass: Philipp, 04.11.2026: „Komplette Ausarbeitung von Mod und für Server- und Client-Seite, Erarbeiten von Fallbacks.“
Grundregel bleibt **Client zuerst**: so viel wie möglich im Spiel und im Planer, so wenig Server wie nötig.

## 1. Die Wege im Überblick

```
             ┌──────── 127.0.0.1 (LIVE_LINK) ────────┐
Planer (PC) ─┤                                        ├─ Mod (Client) ── bauplaner:team (freiwillig) ── Paper-Plugin
             └── Team-Raum (https/wss, TEAM_LIVE) ─────┘                                                    │
Planer (iPad) ──── Team-Raum ───────────────────────────────────────────── RoomLink (Serverschlüssel) ─────┘
Datei (.schem/.bauteam.json/Meldecode) ─ geht immer, ohne jede Verbindung
```

Jede Funktion hat eine feste Reihenfolge. Fällt ein Weg aus, nimmt die Seite den nächsten und **sagt, welcher gerade gilt**. Nichts geht verloren: Aktionen und Messungen tragen ihre endgültige ID und warten, bis ein Weg offen ist (gleiche ID = keine Doppelbuchung).

## 2. Matrix je Funktion

| Funktion | 1. Weg | 2. Weg | 3. Weg | Letzter Ausweg |
|---|---|---|---|---|
| Teamstand im Spiel | Plugin live (geprüft) | Team-Raum (WebSocket) | Team-Raum über HTTP | gespeicherter Stand `raum-stand.json` / Stand aus dem Planer |
| Eigene Teamaktion aus dem Spiel | Plugin-Kanal | Team-Raum (WS oder HTTP) | Ausgangskorb je Server (`*.ausgang.json`) | Planer holt ihn über 127.0.0.1 (`/v1/team`) |
| Messung des Spiels (`section.seen`, `store.seen`) | Team-Raum (WS oder HTTP) | gemerkt je Abschnitt/Kiste (neueste, mit Messzeit, ≤ 64, 24 h) | – | – |
| Teamstand im Planer | Team-Raum (WebSocket) | HTTP-Abfrage 5–60 s (`roomClient.ts`) | Postausgang `site.team.live.pending` | Teampaket, Meldecode |
| Baustand ins Projekt | eigenes Spiel (`GET /v1/scan`) | Spiele im Team-Raum (`ask` → `PUT …/scans`) | Server-Plugin (`scan` per Steuernachricht) | Datei importieren (`/bauplaner scan`) |
| Plan auf den Server | über die Mod (bis 4 MB) | über den Team-Raum (bis 700 KB) | – | Datei hochladen |
| Servereinstellungen | über die Mod | über den Team-Raum (iPad) | – | `config.yml` |
| Protokollversionen | Merkmale in `hello.features` | ältere Mod: Knopf aus + Hinweis „Update“ | – | – |

## 3. Mod ↔ Team-Raum (Mod 0.16.0, `RoomClient`)

- **Gespeicherter Stand.** Nach jedem neuen Ereignis (gebündelt, höchstens alle 3 s) schreibt die Mod Kopf, Ereignisse, Cursor, Zeitpunkt des letzten Kontakts und wartende Messungen atomar nach `bauplaner/team/raum-stand.json` (neben `raum.json`; **nie der Schlüssel**, höchstens 24 MB). Beim Start liest sie ihn, wenn Adresse, Raum und Mitglied passen. Folge: Nach einem Neustart ohne Internet zeigt das Spiel den Teamstand weiter, mit „zeigt den Stand von 04.11. 21:40“ in J → „Befehle & Status“; beim Wiederverbinden schickt der Raum nur, was nach dem Cursor kam. Meldet der Raum `reset` (Cursor unbekannt), verwirft die Mod den Stand und lädt neu. „Spiel trennen“ löscht beides.
- **HTTP statt WebSocket.** Antwortet der Raum über HTTP (Kopf geladen), aber der WebSocket scheitert zweimal (Proxy, Firewall, kein `welcome` in 15 s), schaltet die Mod auf Abfragen: `GET …/events?after=` alle 5 s (1 s nach eigener Aktion, sofort weiter bei `more`), eigene Ereignisse per `POST …/events`; die Antwort (`accepted`/`known`/`rejected`) leert den Ausgangskorb wie `appended`. Status „live über HTTP (WebSocket gesperrt)“, Chatzeile einmal. Alle 5 Minuten ein neuer WebSocket-Versuch; klappt er, „wieder über den WebSocket verbunden“. Über HTTP gibt es keine Anwesenheit/Position und keine Aufnahme-Anforderung (die laufen nur über den WebSocket).
- **Messungen offline.** `section.seen`/`store.seen` werden nicht mehr verworfen: je Abschnitt bzw. Kiste bleibt die neueste Messung mit dem Zeitpunkt der Messung (`at`), denn die Faltung nimmt je Abschnitt das späteste `at`. Beim Wiederverbinden gehen sie raus („2 gemerkte Messungen aus der Offline-Zeit nachgereicht“). Das Spiel misst auch offline weiter, solange ein Teamstand (auch der gespeicherte) da ist; Kisten werden offline ebenfalls gelesen.
- **Bestätigt statt gesendet (Mod 0.17.0, LINK-10).** Eine Messung bleibt in der Warteliste, bis der Raum ihre Kennung beantwortet (`accepted`, `known` oder `rejected`) – auch wenn sie bei bestehender Verbindung rausging. Bricht die Verbindung direkt danach ab, geht sie beim Wiederverbinden mit derselben Kennung und demselben Stapel erneut raus; der Raum antwortet aus seinem Stapelgedächtnis bzw. mit `known`, im Protokoll steht sie nie doppelt. Über HTTP gehen unbeantwortete Messungen nach 10 s still erneut raus.
- **Senden nacheinander (Mod und Plugin 0.17.0).** Der WebSocket des JDK erlaubt nur eine offene Sendung; eine zweite scheitert still mit „Send pending“. Alle Rahmen gehen deshalb über `WsQueue` (mod-core `live/WsQueue.java`, als Quelltext auch im Paper-Plugin): streng nacheinander, beim ersten Fehler oder mehr als 512 wartenden Rahmen gilt die Verbindung als gestört und wird neu aufgebaut. Vorher gingen z. B. mehrere nachgereichte Messungen bis auf die erste verloren, und das Plugin trennte bei gleichzeitiger Steuerantwort und Ereignissen die Verbindung.
- **Abgelehnte Schlüssel** (401/403, 4401/4403): kein weiterer Versuch, Hinweis „im Planer neu verbinden“. „Mein Spiel verbinden“ mit demselben Raum und Mitglied (neuer Schlüssel) behält den gespeicherten Stand.
- **`GET /v1/room`** meldet zusätzlich `mode` (`ws`, `http`, `off`), `syncedAt` und `pendingReports`; `statusText` enthält Alter und Wartende. Merkmal `roomfallback` in `hello.features`.

### Team-Raum (LINK-10)

- **Ping ohne Aufwecken:** `{"type":"ping"}` beantwortet der Durable Object per `setWebSocketAutoResponse` mit `{"type":"pong"}`, ohne aus dem Ruhezustand zu erwachen. Mod und Plugin pingen alle 30 s.
- **Sauberes Schließen:** `webSocketClose` schließt die Gegenseite (sonst sieht der Client 1006) und lässt die schließende Verbindung aus der Anwesenheit weg.
- **Anwesenheit „Server“** nur mit dem Serverschlüssel; ein Mitglied kann sich nicht als Server ausgeben (der Planer hätte sonst „Server online“ angezeigt).

### Planer ↔ Team-Raum (LINK-10)

- Höchstens eine Abfrage-Schleife und ein Wiederverbindungs-Zeitgeber je Projekt. Vorher startete jeder gescheiterte WebSocket-Versuch eine weitere Abfrage-Schleife; bei gesperrtem WebSocket vervielfachten sich so die HTTP-Abfragen.

## 4. Planer: Baustand über den besten Weg

Reiter „Bauen“ → **„⟳ Baustand holen (bester Weg)“** (`planScanRoutes`/`scanRouteSummary` in `packages/domain/src/world/scanRoutes.ts`, `GameCheckPanel.tsx`). Daneben steht je Weg ✓ oder – mit Grund im Tooltip.

1. **Dein Spiel auf diesem PC** (gekoppelt, Merkmal `scan`, Hologramm dieses Projekts platziert): `GET /v1/scan`, ohne Server und ohne Internet.
2. **Spiele im Team-Raum** (Team live, mindestens ein Spiel da): Anforderung, das Spiel mit dem platzierten Plan lädt die Aufnahme in den Raum (bis 90 s).
3. **Server-Plugin** (freiwillig, gekoppelt): Aufnahme per Steuernachricht, liest auch ferne Chunks.
4. Klappt nichts: Meldung mit dem Grund je Weg und dem Ausweg „/bauplaner scan und Datei importieren“.

Das Ergebnis nennt den benutzten Weg und was vorher nicht ging („Baustand über Spiele im Team-Raum geholt … Vorher versucht: dein Spiel auf diesem PC: Keine Verbindung zur Mod“). Die einzelnen Knöpfe („Auf dem Server aufnehmen“, „Aufnahme im Spiel anfordern“, Liste „Aufnahmen im Team-Raum“) bleiben.

## 5. Was bewusst nicht ausweicht

- Geprüfte Messungen (`build.tally`, `store.count`, Abschnittsschutz) gibt es nur mit Plugin; ohne Plugin bleiben die Werte „laut Spiel, ungeprüft“ (TEAM_LIVE §12).
- Die Mod schickt dem Minecraft-Server ohne Teambau-Erlaubnis je Server nichts – auch nicht als Ausweichweg.
- Kein Ausweichen auf fremde Dienste: Der Team-Raum ist der einzige Ort außerhalb von Planer, Spiel und Server.

## 6. Prüfung

- `RoomFallbackTest` (mod-core): Raum-Ersatz mit denselben HTTP-Routen wie `services/team-room`, aber ohne WebSocket → Abfragen über HTTP, eigene Aktion bestätigt, fremde Notiz kommt an, Messung geht raus; Neustart ohne Netz → Stand aus `raum-stand.json`, Messung wartet (nur die neueste), Raum zurück → nachgereicht, erste Abfrage ab gespeichertem Cursor, nichts doppelt; Trennen löscht den Stand. `RoomClientTest` mit `BAUPLANER_ROOM` gegen den echten Team-Raum (WebSocket-Weg unverändert).
- `WsQueueTest` (mod-core): Ersatz-Socket mit dem Verhalten des JDK (zweite offene Sendung scheitert) → Reihenfolge, 8 Threads × 25 Rahmen ohne Verlust, erster Fehler einmal gemeldet, Rückstau. `RoomFallbackTest` zusätzlich: verlorene Antwort → Messung bleibt gemerkt, geht erneut raus, im Raum einmal.
- `tests/team-room.test.mjs`: Anwesenheit „Server“ nur mit Serverschlüssel.
- `tests/scan-routes.test.mjs`: Reihenfolge, Gründe, Mod zu alt/anderer Plan, Zusammenfassung.
- `tests/e2e/game-progress.e2e.mjs`: „Baustand holen (bester Weg)“ über das eigene Spiel; anderer Plan im Spiel → alle Gründe und der Datei-Ausweg.
- Abnahme: Testfall LINK-09.
