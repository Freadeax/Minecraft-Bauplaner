# Team live – Team-Raum statt Datei-Austausch (COOP-07)

Stand 03.11.2026 · Claude (Thread „Gemeinsames Bauen mehrerer Spieler ermöglichen“) · baut auf [TEAMBAU](TEAMBAU.md) auf.

## 1. Anlass

Philipp (03.11.2026): „Das Team ist gut gedacht, aber viel zu umständlich mit extra was runterladen und dann hochladen. Das muss besser und live sein.“
Bisher wandern Ereignisse als Teampaket, Meldecode oder Serverdatei. Das Datenmodell bleibt richtig, denn das Teamprotokoll ist eine Ereignisliste, und Zusammenführen bedeutet Vereinigung nach ID. Falsch ist nur der Transport. Dieses Konzept ersetzt ihn durch einen **Team-Raum**: Jede neue Aktion geht sofort an alle, ohne Datei und ohne Knopf.

## 2. Warum nicht einfach „Browser ↔ Minecraft-Server“

- Der Planer läuft über **https** (GitHub Pages). Browser erlauben von dort keine Verbindung zu `http://` oder `ws://` auf einem fremden Rechner. Mixed Content wird gesperrt, bei `127.0.0.1` gibt es die Ausnahme, die die Mod nutzt.
- Ein Paper-Server bei einem Hoster hat meist weder Domain noch Zertifikat noch einen freien Port. Er läuft außerdem nicht immer.
- Mitspieler planen auch, wenn Minecraft nicht läuft, etwa abends am Handy.

Ein Live-Weg, der für alle funktioniert, braucht deshalb einen Ort mit https, den Browser **und** Server von sich aus erreichen. Beide bauen dabei nur **ausgehende** Verbindungen auf. Das ist der Team-Raum.

## 3. Varianten (Entscheidung Philipp)

| Variante | Live für | Was Philipp tun muss | Grenzen |
|---|---|---|---|
| **A Team-Raum im Netz** (empfohlen) | alle, immer, auch Handy | einmal ein Cloudflare-Konto anlegen, `npx wrangler deploy` im Ordner `services/team-room` ausführen (Gratis-Tarif), die Adresse im Planer eintragen | ein kleiner Dienst außerhalb von GitHub Pages; Daten liegen bei Cloudflare |
| **B Plugin als Hub** | alle, solange der Server läuft | Port freigeben, Domain mit Zertifikat beim Hoster | bei den meisten Hostern nicht möglich; aus, wenn der Server aus ist |
| **C Nur über die Mod** | wer gerade mit Mod im Spiel ist | nichts | alle anderen bleiben bei Code/Link |

Das **Protokoll ist für alle drei gleich** (§4). Der Sync-Kern im Planer (`teamSync.ts`) kennt nur „Ereignisse nach Cursor holen“ und „Stapel anhängen“. Ob dahinter der Raum, das Plugin oder die Mod (`/v1/team`) steht, ist ein austauschbarer Adapter. Wenn A gewählt wird, bleiben B und C als zusätzliche Wege bestehen. Die Mod zeigt im Spiel weiter alles über den Plugin-Kanal (COOP-03).

## 4. Raum-Protokoll `team-room` 1

Ein Raum gehört zu genau einem Team (`teamId`). Alle Antworten sind JSON. Grenzen: höchstens 20 000 Ereignisse und 4 KB je Ereignis wie `team.ts`, höchstens 200 Ereignisse je Stapel.

| Aufruf | Zweck |
|---|---|
| `POST /v1/rooms` `{teamId, name}` | Raum anlegen; Antwort `{room, adminKey, memberKey, serverKey}` (nur jetzt im Klartext, der Raum speichert SHA-256) |
| `POST /v1/rooms/{room}/events` `{batch, events[]}` | Stapel anhängen. Antwort `{cursor, accepted[], known[], rejected[{id, reason}]}`. Gleicher `batch` ergibt dieselbe Antwort, also keine Doppelbuchung bei Wiederholung |
| `GET /v1/rooms/{room}/events?after=<cursor>&limit=500` | Ereignisse in Ankunftsreihenfolge nach dem Cursor; `{events, cursor, more}` |
| `GET /v1/rooms/{room}/live` (WebSocket) | Client sendet zuerst `hello {key, member, device, where, after}`; der Raum antwortet `welcome` und schickt **von sich aus** alle Seiten `events {events, cursor, more}` ab `after`, danach jede neue Menge als Push. Weiter: `append {batch, events}` → `appended`, `presence {where, section?}`, `header`/`plan` (neu holen), `ping` → `pong`. Close 4401/4403 = Schlüssel ungültig/erneuert, nicht erneut versuchen |
| `PUT/GET /v1/rooms/{room}/plan/{sha256}` | Planstand (gzip-Sicherung, höchstens 25 MB) zu einer Freigabe |
| `PUT/GET /v1/rooms/{room}/header` | Abschnitte mit Weltboxen, Dimension, Bedarf (heute Inhalt der Serverdatei) für Plugin und Mod |
| `POST /v1/rooms/{room}/rotate?wer=member\|server` (admin) | neuer `memberKey` bzw. `serverKey`; alte Links werden ungültig, offene Verbindungen mit dem alten Schlüssel schließen mit 4403 |

- **Cursor** ist die Ankunftsnummer im Raum, nicht die Ereigniszeit. Die Faltung sortiert weiter nach `(at, id)`, der Cursor sagt nur „was habe ich schon“. Damit gehen Ereignisse mit älterer Zeit nicht verloren, etwa von einem Gerät, das offline war.
- Der Raum **prüft nur Form und Größe** (`checkTeamEvent`), keine Rechte. Rechte bleiben die Faltung jedes Teilnehmers. Damit gilt dieselbe Wahrheit wie offline, und der Dienst bleibt dumm und billig.
- **Anwesenheit** ist flüchtig, sie wird nicht ins Protokoll geschrieben: wer gerade im Planer, im Spiel oder auf dem Server ist, in welchem Abschnitt, seit wann.

## 5. Zugang und Fälschungsschutz

- **Einladung = Link:** `…/#/team/beitreten?raum=<url>&id=<room>&k=<memberKey>`. Der Schlüssel steht im Fragment und geht damit nicht in Server-Logs von Pages. Wer den Link hat, ist Gast, bis er beitritt (`member.join`). Rollen vergibt weiter die Bauleitung im Protokoll.
- **Drei Schlüssel, drei Rollen im Raum:** `adminKey` (Bauleitung: Planstand und Kopfdaten hochladen, Schlüssel erneuern), `memberKey` (alle Mitspieler: lesen, eigene Ereignisse anhängen), `serverKey` (Paper-Plugin). Ereignisse mit `origin: "server"` (`build.tally`, `store.count`, `SERVER_ONLY_KINDS`) nimmt der Raum **nur mit dem Serverschlüssel** an. Damit ist eine Servermessung im Live-Weg fälschungssicher, was sie beim Dateiweg nicht war.
- **Server-Link:** wie die Einladung, aber `s=<serverKey>` statt `k=`. Ab 0.12.0 schickt der Planer ihn als Steuernachricht `room` an den gekoppelten Server („Server mit dem Raum verbinden“, AUTO_LINK.md); nur ohne Kopplung gibt die Bauleitung ihn mit `/bauplaner team verbinden <Link>` ein. Im Browser geöffnet erklärt der Planer nur, wofür er ist.
- **Später (nicht in v1):** Gerätschlüssel je Mitglied (ECDSA P-256, `member.key`, Unterschrift `sig`), damit auch innerhalb des Teams niemand im Namen anderer schreibt. Heute gilt wie offline: Rechte prüft die Faltung, der Urheber steht im Ereignis.
- **Verlust des adminKey:** neuen Raum anlegen und live schalten; das Protokoll geht als Vereinigung wieder hoch.

## 6. Ablauf ohne Datei

1. Bauleitung: Reiter „Team“ → **„Live schalten“**. Raum anlegen, das ganze Protokoll und den freigegebenen Planstand hochladen, Einladungslink und QR anzeigen.
2. Mitspieler: Link öffnen. Der Planer holt Plan und Protokoll aus dem Raum und fragt „Wer bist du?“. Danach ist er drin. Ein Paket öffnen ist nicht nötig.
3. Server: Bauleitung klickt unter „Team live“ „Server mit dem Raum verbinden“ (gekoppelter Server; sonst `/bauplaner team verbinden <Link>` als OP). Das Plugin holt Header und Protokoll, meldet seinen Schlüssel und schickt ab dann jedes Ereignis sofort. Eine Teamdatei muss nicht mehr kopiert werden.
4. Jede Aktion (übernehmen, melden, Notiz, Kiste, Nachweis) geht sofort an alle. Oben steht „● live · 3 im Planer · 2 im Spiel“.
5. Neue Planfreigabe: der Planstand geht in den Raum. Alle sehen „Neuer Planstand 4 – übernehmen?“. Das Plugin aktualisiert die Abschnittsboxen, die Mod lädt den Plan über den Plugin-Kanal.

## 7. Offline und Störungen

- Der Planer arbeitet immer lokal weiter (IndexedDB). Nicht bestätigte Ereignisse liegen im **Postausgang**, `site.team.live.pending` mit ihren IDs. Sie gehen beim nächsten Kontakt als Stapel raus. Ein Stapel aus mehreren Ereignissen eines Schritts (z. B. `useActMany`) bleibt ein Stapel.
- Wiederholen ist sicher, weil gleiche `batch`/IDs nicht doppelt gezählt werden. Ein Ereignis mit gleicher ID und anderem Inhalt wird abgelehnt und als Hinweis gezeigt wie heute `clashes`.
- WebSocket weg → alle 5–60 s `GET …/events?after` (wachsender Abstand), Anzeige „○ offline seit 14:02 · 3 Aktionen warten“.
- Teampaket, Meldecode und Serverdatei bleiben unter „Ohne Internet“ als Ausweg.

## 8. Aufteilung

| Teil | Wer |
|---|---|
| Protokoll, Sync-Kern `packages/domain/src/teamSync.ts`, Raumdienst `services/team-room/` (Worker + Durable Object, Tests), „Live schalten“/Beitreten/Statuszeile | dieser Thread |
| Bedienung im Reiter Team (Anwesenheit, Hinweise, neue Bereiche) | Thread „Gemeinsames Bauen im Planer vertiefen“ |
| `TeamUplink` im Plugin (ausgehend wss/https, Serverschlüssel, Header statt Datei), Befehl `team verbinden` | Thread „Server-Plugin mit geprüften Lagerkisten“ |
| `/v1/team/pull` als Cursor-Feed, Plan aus dem Raum über den Plugin-Kanal | Mod-Thread |

## 9. Was nur Philipp tun kann

- Die Variante wählen.
- Erledigt (04.11.2026): Cloudflare-Zugang in der Cloud-Umgebung hinterlegt; Claude deployt den Dienst damit (§10).
- Server einmal koppeln (Seite „Spiel“, AUTO_LINK.md) und „Server mit dem Raum verbinden“ klicken – ohne Kopplung `/bauplaner team verbinden <Server-Link>` eingeben. Danach lässt sich der Server auch vom iPad über den Raum einstellen (`POST /v1/rooms/<raum>/control`, LINK-05).
- Der Live-Test mit Mitspielern.

## 10. Umsetzungsstand (03.11.2026, COOP-07)

- Sync-Kern `packages/domain/src/teamSync.ts`: `goLive`, `joinLive`, `leaveLive`, `trackOutbox` (jeder neue lokale Eintrag geht in den Postausgang, egal über welchen Weg), `nextBatch`/`confirm` (Stapel-ID aus den Ereignis-IDs), `ingest` (Cursor nur vorwärts, `reset`), `roomStatus`, `inviteLink`/`serverLink`/`readInvite`. Teampakete und Sicherungen für das Team tragen nie `live` oder Schlüssel.
- Raumdienst `services/team-room`: `src/core.js` (Raumlogik ohne Cloudflare, auch in Node getestet), `src/index.js` (Worker + Durable Object mit SQLite, WebSocket-Ruhezustand), `wrangler.toml`.
- Planer: Die Verbindung hängt am geöffneten Projekt (`ProjectView` → `useTeamRoom` in `views/project/roomClient.ts`), also in jedem Reiter. Eingehende Ereignisse werden ohne Rückgängig-Schritt gespeichert. Reiter „Team“ → Bereich **„Team live“** (`TeamRoom.tsx`): Live schalten, Einladungslink, Link für den Server, Plan in den Raum stellen (bei jeder Freigabe automatisch), „Planstand übernehmen“ für die anderen (vorheriger Stand bleibt als Kopie), Anwesenheit, Status (live / sendet / offline mit wartenden Aktionen), Live trennen. Seite `#/team/beitreten` (`TeamJoinView.tsx`) lädt Plan und Protokoll aus dem Raum, ohne Datei.
- Prüfung: `tests/team-room.test.mjs` (Raum, zwei Browser und Server ohne Datei, verlorene Antworten, Seiten), `tests/e2e/team-room.e2e.mjs` (zwei echte Browser über den Raumkern hinter Playwright-Routing, 1400 und 390 px), `scripts/team_room_smoke.mjs <url>` gegen `wrangler dev` oder den echten Dienst.
- Rückgängig: Ein schon gesendetes Ereignis lässt sich nicht zurückholen (das Protokoll ist nur anhängend); Strg+Z nimmt es lokal zurück, beim nächsten Abgleich kommt es aus dem Raum wieder. Korrekturen laufen wie bisher über Gegenereignisse (freigeben, Nacharbeit).
- Paper-Plugin: `RoomLink.java` (Plugin-Thread, COOP-07-S05), `/bauplaner team verbinden <Server-Link>`; Test `scripts/test_bridge_paper_room.sh` (BAUPLANER_ROOM).
- **Betrieb (04.11.2026):** Der Dienst läuft unter `https://bauplaner-team.team-room.workers.dev` (Worker `bauplaner-team`, Cloudflare-Konto des Projekts, Deploy mit `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` aus der Cloud-Umgebung: `cd services/team-room && npx wrangler deploy`). Der Planer schlägt diese Adresse vor (`DEFAULT_ROOM_URL` in `roomClient.ts`); eigene Räume bleiben eintragbar. Geprüft gegen den echten Dienst: Rauchtest, `TEAM_ROOM_URL=… node --test tests/e2e/team-room.e2e.mjs` (zwei Browser, 1400/390 px) und Paper 26.3 mit RoomLink.
- Offen: Spieltest mit Mitspielern (TEAMBAU-25).

## 11. Team live im Alltag (04.11.2026, COOP-09)

- **In jedem Reiter:** Im Projektkopf steht ein Chip „● Team live · 2 da“ (bzw. „sendet …“, „offline · 3 warten“), Klick öffnet den Reiter „Team“. Schritte der anderen erscheinen unten rechts als kurze Meldung („Anna: Abschnitt „Fundament“ übernommen“), etwa 9 s lang, Klick öffnet „Team“. Das Nachholen beim Verbinden zeigt keine Meldungen (sonst Flut nach einer Nacht offline). `TeamLiveBar.tsx`.
- **Gerade da mit Abschnitt:** Der Planer meldet den eigenen Abschnitt in Arbeit als Anwesenheit (`presence.section`), bei jedem Wechsel neu.
- **Aussperren:** Die Bauleitung (mit adminKey) kann „Einladung erneuern“ und „Server-Link erneuern“ (`POST …/rotate?wer=member|server`). Alte Links gelten sofort nicht mehr; offene Verbindungen schließen mit 4403, der Planer zeigt „Bitte die Bauleitung um einen neuen Einladungslink“. Wer den neuen Link öffnet, wird im vorhandenen Projekt nur neu verbunden.
- **Abgelehnte Meldungen:** Lehnt der Raum ein eigenes Ereignis ab (Form, Größe, Serverherkunft), zeigt der Planer den Grund als Hinweis, statt es still zu verlieren.
- Prüfung: `tests/e2e/team-room.e2e.mjs` (auch mit `TEAM_ROOM_URL` gegen den echten Dienst).

## 12. Client zuerst: was der Mod im Spiel sieht (04.11.2026, COOP-10)

Philipps Vorgabe: so viel wie möglich im Client, so wenig Server wie nötig. Viele Teamzahlen braucht man nicht vom Plugin, wenn der Mod eines Mitspielers sie selbst sieht und mit dem Mitgliedsschlüssel in den Team-Raum schreibt. Damit niemand eine Messung fälschen kann, bleiben sie **getrennt von den Servermessungen** und sind im Planer als „ungeprüft“ gekennzeichnet.

| Ereignis | Felder | Recht | Wirkung im Teamstand |
|---|---|---|---|
| `section.seen` | `section`, `placed ≤ total`, `wrong?`, `missing?` (≤ 24 Zeilen) | Helfer | neuester Stand je Abschnitt (`SectionTeamState.seen`); ändert nie `placed`/`builders` aus `build.tally` |
| `store.seen` | `chest` (bekannte Lagerkiste), `items` (≤ 64), `more?: true` | Helfer | `StoreChest.seen`; zählt in `stockSeen` nur, solange der Server die Kiste nie gezählt hat; unbekannte Kiste wird abgelehnt |

- Herkunft `planer` (Mitgliedsschlüssel). Der Mod meldet `section.seen` höchstens alle 30 s je Abschnitt und nur bei Änderung, `store.seen` beim Schließen einer bekannten Teamkiste (Vertrag mit dem Thread „Anbindung von Planer, Mod und Server neu denken“, Mod ab 0.15.0).
- Planer: Reiter „Team“ → „Baunachweis & Lager“ zeigt je Abschnitt „laut Spiel 72 % (72 von 100) · Anna, …, ungeprüft“ samt den fehlenden Blöcken, je Lagerkiste den gesehenen Inhalt und darunter den „Bestand laut Spiel“ für Kisten ohne Serverzählung. Der Knopf „Bestand ins Baustellen-Lager übernehmen“ nimmt weiterhin nur geprüfte Serverzahlen.
- Paper `TeamLog.java` kennt beide Arten mit denselben Rechten; das Plugin wertet sie nicht aus (es misst selbst), behält sie aber im Protokoll.
- Prüfung: `tests/team.test.mjs` („Client zuerst“), `tests/e2e/team-room.e2e.mjs` (Mod-Meldung mit Mitgliedsschlüssel erscheint in beiden Browsern).
- **Wo steht wer:** Meldet ein Spiel seine Position (LINK-07, nur `where: 'spiel'`), zeigt „Gerade da“ neben „AnnaMC bei 12 64 -3“ auch „steht in „Fundament““, „8 Blöcke von „Dach““ oder „weit weg von der Baustelle“. Grundlage sind dieselben Weltboxen je Abschnitt wie in der Serverdatei (`teamServerFile`), Rechnung in `whereInPlan` (team.ts); bei überlappenden Boxen gewinnt die kleinere.
- **Mein Spiel:** Unter „Team live“ steht, wie die eigene Mod gerade mit dem Raum spricht („Mein Spiel: live“, „über HTTP (Ausweichweg) · 2 Meldungen warten“, „Stand vor 5 min“), aus `GET /v1/room` der Mod (Felder aus FALLBACK-01, docs/architecture/FALLBACKS.md). Ist das Spiel mit einem anderen Raum verbunden, warnt die Zeile. Abgefragt beim Öffnen, nach „Mein Spiel verbinden“/„Spiel trennen“ und mit „Neu prüfen“.
