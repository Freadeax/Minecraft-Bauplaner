# Server ohne Befehle (LINK-01 … LINK-06)

Stand 04.11.2026, Mod/Plugin 0.12.0, Aufnahme per Klick ab Plugin 0.13.0. Anlass: Philipp, 04.11.2026: „Ich will keine Commands auf der Serverseite eingeben müssen! Denk das System weiter um!“

Prinzip für alle drei Verbindungen (Planer ↔ Mod, Mod ↔ Plugin, Planer ↔ Plugin): **erkennen, einmal klicken, selbst einrichten.** Befehle bleiben als Ausweg, sind aber nirgends mehr der Hauptweg.

## 1. Überblick

```
Planer (Browser)                     Mod (Client, 127.0.0.1)             Paper-Plugin
──────────────────                   ───────────────────────             ──────────────
findet die Mod selbst  ── /v1/hello ─▶ Live-Dienst läuft von selbst
„Mit dem Spiel verbinden“ ─ /v1/pair/ask ─▶ Frage oben im Bild: „J drücken“
                                     J → „Planer zulassen“ (Klick)
                       ◀─ Schlüssel ── (einmal)
                                     J → „Teambau erlauben“ ── bauplaner:team ──▶ link.info
„Server koppeln“ ───── /v1/server/claim ─────────────────────── link.claim ─▶ prüft OP, legt Gerät an
                       ◀────────────── Besitzerschlüssel ─────────────────────── (einmal)
Einstellungen ändern ── signierte Steuernachricht ── /v1/server/control ── link.ctl ─▶ prüft, schreibt config.yml

iPad ohne Mod ─── POST /v1/rooms/<raum>/control ──▶ Team-Raum ── WebSocket (Serverschlüssel) ──▶ Plugin prüft genauso
```

## 2. Plugin richtet sich selbst ein (LINK-01)

- Erster Start: `plugins/BauplanerBridge/link.json` mit `serverId` (`srv_…`), Name (MOTD) und leerer Geräteliste. Log: „Bauplaner eingerichtet … Koppeln: als OP mit der Bauplaner-Mod beitreten und im Planer auf der Seite „Spiel“ „Server koppeln“ klicken“.
- Ungekoppelt: ein OP bekommt beim Beitreten einmal einen Chat-Hinweis (nichts eintippen).
- **Koppeln** (`link.claim` über den Teamkanal): nur OP oder Recht `bauplaner.team.leitung`. Das Plugin legt ein Gerät an (`own_…`, 32-Byte-Schlüssel, höchstens 8) und gibt den Schlüssel genau einmal zurück. Der Schlüssel steht nie im Log.
- `LinkCore.java` (reine Regeln, Tests in `LinkCoreTest`), `ServerLink.java` (Ereignisse, Datei, Operationen).

## 3. Signierte Steuernachrichten (LINK-02)

- Format `{owner, seq, body, sig}`; `body` ist der exakte JSON-Text mit `server` (Server-ID) und `op`.
- `sig = base64url(HMAC-SHA-256(key, owner + "\n" + seq + "\n" + body))` – `LinkCore.sign` und `packages/domain/src/team/serverControl.ts` (`signControl`) rechnen gleich; gemeinsamer Prüfvektor in beiden Tests.
- `seq` muss je Gerät streng steigen (der Planer nimmt Millisekunden), die letzte Nummer liegt in `link.json`: eine aufgezeichnete Nachricht wirkt nie zweimal, auch nicht nach einem Neustart.
- Operationen: `status`, `config` (nur die Liste in `LinkCore.SETTINGS`, alles oder nichts; `team.kanal` ist absichtlich nicht fernsteuerbar), `team` (Teamdatei), `room` (Team-Raum verbinden/trennen), `plan` (.schem bis 4 MB, optional Anker), `scan` (Aufnahme, siehe §5), `rename`, `invite` (weiteres Gerät), `forget` (Gerät entfernen).
- Steuernachrichten setzen nie Blöcke und führen nie Serverbefehle aus.

## 4. Mod (LINK-03)

- Live-Dienst startet von selbst (Einstellung `aktiv` bleibt abschaltbar).
- `POST /v1/pair/ask {device}` → Frage im Spiel (Banner oben, Knöpfe im J-Menü „Planer zulassen“/„Ablehnen“, Ausweg `/bauplaner verbinden zulassen|ablehnen`). `GET /v1/pair/ask?request=` liefert `waiting`, einmal `ok` + Schlüssel, `denied` oder `expired` (3 Minuten, höchstens 3 offene Fragen). Der sechsstellige Code bleibt für ältere Planer.
- Teamkanal je Server weiter **nur freiwillig**: Die Frage „Teambau erlauben“ erscheint als Knopf statt als Befehl.
- `GET /v1/server`, `POST /v1/server/claim`, `POST /v1/server/control` reichen nur weiter (Token nötig). Feature-Liste: `pairask`, `server`.

## 5. Planer (LINK-04)

- Seite **Spiel** (`#/mod`), Bereich „Spiel und Server verbinden – ohne Befehle“ (`ServerPanel.tsx`, `serverClient.ts`): drei Schritte Spiel → Server → Kopplung, danach das Einstellungsformular aus dem Schema des Plugins, Teams, Raum, Pläne, gekoppelte Geräte (trennen/entfernen), Umbenennen.
- Gerätekopplungen in `localStorage` `bauplaner.server.kopplungen` (wie der Mod-Schlüssel nur in diesem Browser). Die benutzte Nummer wird vor dem Senden gespeichert und mit dem gespeicherten Stand zusammengeführt (der gemerkte Raum bleibt).
- **Weltkarte** (LINK-06): „⇪ Auf den Server legen“ beim gewählten Projekt exportiert die Revision und schickt sie als Steuernachricht `plan` mit Anker (Kartenlage) an den gekoppelten Server – über die Mod, wenn Minecraft auf dem Server läuft (bis 4 MB), sonst über den Team-Raum (bis 700 KB). Das Plugin prüft die Datei (`Plan.read`) und legt nur lesbare Pläne ab (`serverClient.planToServer`).
- **Reiter „Bauen“** (LINK-02 S04): „⇪ Plan auf den Server legen“ schickt denselben Export direkt aus dem Projekt (`views/mod/planUpload.ts`, auch von der Weltkarte genutzt). Der Anker kommt aus `chooseServerAnchor` (`team/serverControl.ts`): zuerst die Lage auf der Weltkarte, sonst das Hologramm im eigenen Spiel, wenn es dieses Projekt zeigt (`GET /v1/status`), sonst keiner – dann nennt die Meldung `/bp anker hier`. Gedrehte oder gespiegelte Lagen werden nie als Anker genommen (das Plugin legt Pläne nur ungedreht ab); der Grund steht in der Meldung. Ist der Arbeitsstand neuer als die letzte Revision, wird wie beim Export eine Revision eingefroren und das Projekt neu geladen.
- **Aufnahme per Klick** (LINK-06 S02, statt `/bp scan`): Reiter „Bauen“ → „⇩ Auf dem Server aufnehmen“. Steuernachricht `scan` mit `do`:
  - `list` – Pläne (Datei, Name, Projekt-ID, Revision, Anker), die 20 neuesten Aufnahmen, laufende Aufnahme (`running`: Prozent, Phase) und das letzte Ergebnis (`last`: Datei oder Fehler).
  - `start {plan, loaded?}` – startet die Aufnahme am gespeicherten Anker wie `/bp scan` (Chunks nachladen nach `chunks-nachladen`/`max-chunks`, höchstens eine Aufnahme gleichzeitig).
  - `fetch {file, offset}` – ein Teil der Aufnahme (384 KB roh, Base64) aus `scans/`; nur Dateinamen direkt in diesem Ordner.
  - `cancel` – bricht ab, schreibt nichts.
  Der Planer wählt den neuesten Plan des Projekts mit Anker (`serverPlanFor`), fragt den Fortschritt ab, holt die Datei in Teilen und lädt sie wie eine importierte Aufnahme (`recordOnServer`). „Letzte Aufnahme vom Server holen“ nimmt die neueste Datei mit dem Namensanfang des Plans (`scanPrefix` = `ScanJob.fileName`). Über die Mod und über den Team-Raum gleich; die Welt wird nie verändert. Plugin 0.12.0 meldet „Unbekannte Steueraktion“, der Planer sagt dann „Plugin 0.13.0 nötig“.
- Reiter „Team“: „Planstand auf den Server legen“ geht über die Steuernachricht `team`, wenn der Server gekoppelt ist. „Team live“: „Server mit dem Raum verbinden“ (`room`) und merkt den Raum bei der Kopplung.

## 6. Zweiter Weg über den Team-Raum (LINK-05)

- `POST /v1/rooms/<raum>/control` (jeder Raumschlüssel): der Raum prüft nur die Form (`checkControl`) und gibt die Nachricht an die neueste Plugin-Verbindung mit Serverschlüssel weiter; die Antwort (`control.answer`) kommt zurück (`ControlRelay`, 20 s, höchstens 16 offen). Ohne verbundenen Server: 409 `server-offline`. `GET /v1/rooms/<raum>` meldet `serverOnline`.
- Der Raum kennt keinen Besitzerschlüssel; Unterschrift, Nummer und Server prüft das Plugin wie auf dem Mod-Weg.
- **Weiteres Gerät** (iPad): am gekoppelten PC „Weiteres Gerät freigeben“ → `invite` → Link `#/mod?geraet=…` (Schlüssel und Raum im Fragment, nie in einer Anfrage). Auf dem iPad öffnen: die Kopplung wird gespeichert, die Adresszeile geleert, der Server erscheint unter „Ohne Mod über den Team-Raum“.
- Ältere Räume ohne diese Nachrichten bleiben verträglich (neue, optionale Nachrichtentypen).

## 7. Sicherheit

| Gefahr | Schutz |
|---|---|
| Fremder koppelt den Server | nur OP / `bauplaner.team.leitung`, nur über den eigenen Spielclient |
| Fremde Website steuert die Mod | Origin-Prüfung, Token nur nach Klick im Spiel |
| Mitschnitt wird wiederholt | steigende Nummer je Gerät, gespeichert |
| Nachricht für Server A an Server B | `server` steht im unterschriebenen Text |
| Team-Raum fälscht Nachrichten | kennt keinen Besitzerschlüssel |
| Verlorenes Gerät | am PC „entfernen“ (`forget`); das Plugin vergisst den Schlüssel |
| Gefährliche Einstellung | feste Liste, Teamkanal ausgenommen; nichts setzt Blöcke oder führt Befehle aus |

## 8. Tests

- `LinkCoreTest` (Paper), `LiveLinkTest` (Mod-Kern), `tests/unit/team/server-link.test.mjs` (Planer, gemeinsamer Vektor, Freigabe-Link), `tests/unit/team/team-room.test.mjs` (Raum-Weiterleitung).
- Browser: `tests/e2e/server-link.e2e.mjs` gegen den Mod-Simulator mit Plugin-Ersatz (PC 1400/390 px, iPad 820 px über einen Raum-Ersatz, dort auch Plan von der Weltkarte auf den Server und die Aufnahme per Klick in Teilen zurück). Mit `TEAM_ROOM_URL=https://bauplaner-team.team-room.workers.dev` läuft der iPad-Teil über den echten Team-Raum; ein WebSocket mit Serverschlüssel spielt das Plugin.
- Echter Server: `scripts/mod/test_bridge_paper_link.sh` – Paper 1.21.11, ein Protokoll-Client (`minecraft-protocol`) spricht den Teamkanal wie die Mod: Selbsteinrichtung, Nicht-OP abgewiesen, Kopplung, Einstellungen, Team, Plan mit Anker, Aufnahme per Klick (Datei byte-gleich in Teilen geholt, fremde Pfade abgewiesen), Wiederholung/falsche Unterschrift/fremder Server abgewiesen, Neustart, Gerät entfernen; mit `BAUPLANER_ROOM` zusätzlich Steuerung über einen echten Team-Raum (`npx wrangler dev`).
- Spiel: `scripts/mod/test_bridge_ingame.sh` klickt im echten Minecraft 26.3 „Planer zulassen“ mit der Maus.

## 9. Ohne Server-Datei: Mod ↔ Team-Raum direkt (LINK-07)

Anlass: Philipp, 04.11.2026 12:12: „Überarbeiten des Systems, dass man keine extra Datei auf den Server laden muss! Es muss eine saubere Kommunikation in allen Richtungen zwischen Client, Server und Planer gebaut werden.“

```
Planer (PC/iPad) ⇄ Team-Raum (Cloud) ⇄ Mod von Spieler A, B, C …      Minecraft-Server: unverändert, kein Plugin
```

- **Planer → Mod:** Reiter „Team“ → „Team live“ → **„Mein Spiel verbinden“** schickt `POST /v1/room {url, room, key (Mitgliedsschlüssel), member, memberName, teamName}` an die Mod auf diesem Rechner (Feature `room`, ab Mod 0.14.0). „Spiel trennen“ schickt `{off:true}`. Die Mod speichert den Raum in `bauplaner/team/raum.json` (nur auf diesem Rechner); `GET /v1/room` nennt ihn nie mit Schlüssel.
- **Mod ⇄ Raum:** `RoomClient` (mod-core) holt den Kopf (`GET …/header`), öffnet `…/live` (WebSocket, `hello` mit `where: "spiel"`), faltet die Ereignisse mit **demselben `TeamLog` wie das Plugin** (beim Bauen aus `paper/…/TeamLog.java`, `StoreIndex.java`, `StoreLedger.java` übernommen, nur das Paket heißt `mod.room`) und zeigt den Stand wie bisher (Rahmen, HUD, Befehle). Eigene Teamaktionen (`/bauplaner team nehmen …`, fertig melden, Notizen) gehen als Ereignis des Mitglieds (`origin: "planer"`) per `append` in den Raum; erst `appended` (angenommen/bekannt) leert den Ausgangskorb, abgelehnte erscheinen im Chat. Anwesenheit: Abschnitt, in dem der Spieler steht. Neu verbinden mit 2…60 s Abstand; 4401/4403 (Schlüssel erneuert) → nicht mehr versuchen, Hinweis im Chat.
- **Vorrang:** Server-Plugin live (freiwillig) → Team-Raum → Stand aus dem Planer. Mit Plugin bleibt alles wie in §2–§6.
- **Regel „nichts an den Server“ bleibt:** Die Mod schickt dem Minecraft-Server weiterhin nichts ohne die Teambau-Erlaubnis je Server; der Team-Raum ist ein anderer Ort, den der Spieler im Planer selbst verbunden hat.

| Funktion | Ohne Plugin | Nur mit Plugin |
|---|---|---|
| Plan, Hologramm, Packliste, Gerüst, Markierungen | ja | – |
| Team: Abschnitte nehmen, melden, Notizen, Rollen | ja (Raum) | – |
| Anwesenheit „im Spiel“ mit Abschnitt, Spielername und Position | ja (Raum, ab 0.15.0) | – |
| Baustand/Aufnahme | im Umkreis des Spielers (Mod), per Klick über den Raum (0.15.0) | ferne, nicht geladene Chunks |
| Fortschritt je Abschnitt | gemessen vom Hologramm (`section.seen`, ungeprüft) | Baunachweis (`build.tally`) |
| Abschnittsschutz (Bauen verhindern) | nur Hinweis | erzwingen |
| Lagerkisten | gesehener Inhalt beim Öffnen (`store.seen`, ungeprüft) | geprüft (Servermessung, `origin: "server"`) |
| Ertragskisten, Baunachweis | – | geprüft |

### 9.1 Positionen, Aufnahmen und Meldungen über den Raum (Mod 0.15.0)

- **Position:** `presence {where:"spiel", player, pos:{x,y,z,dim,yaw}}` – höchstens alle 2 s und nur nach mindestens 2 Blöcken Bewegung oder Dimensionswechsel; der Raum nimmt `pos`/`player` nur bei `where:"spiel"` an (`cleanPos`, Name `[A-Za-z0-9_]{1,16}`) und verteilt sie mit der Anwesenheit. Der Planer zeigt sie unter „Gerade da“ (`AnnaMC bei 12 64 -3`).
- **Aufnahme anfordern:** Planer (Reiter „Bauen“) schickt `{type:"ask", what:"scan", projectId}`; der Raum reicht sie an alle Sockets mit `where:"spiel"` weiter (höchstens eine Anforderung je Socket in 10 s) und antwortet `{type:"asked", games}`. Ein Spiel mit platziertem Plan desselben Projekts liest die Planbox in Scheiben (wie `GET /v1/scan`, außerhalb des Spiel-Threads) und lädt die Datei mit `PUT /v1/rooms/{raum}/scans/{id}?file&project&revision&by` hoch (gzip-Prüfung, höchstens 8 MB, die neuesten 12 bleiben). Der Raum meldet `{type:"scan", scan}`; der Planer lädt die angeforderte Aufnahme sofort und listet ältere unter „Aufnahmen im Team-Raum“. Im Spiel geht dasselbe mit `/bauplaner team aufnahme`.
- **Meldungen aus dem Spiel** (direkt, ohne Ausgangskorb, `origin:"planer"`, Recht `helfer`): `section.seen {section, placed, total, wrong?, missing?[≤24]}` höchstens alle 30 s je Abschnitt und nur bei Änderung; `store.seen {chest, items[≤64], more?}` beim Öffnen und Schließen einer bekannten Kiste (`store.chest`), gelesen nur aus dem, was der Server dem Client ohnehin zeigt (ohne Spielerinventar). Die Faltung im Planer/Plugin gehört dem Thread „Gemeinsames Bauen mehrerer Spieler ermöglichen“.
- Die Lagerkisten (`store.chest`) faltet die Mod jetzt auch aus dem Raum, damit Packliste und `/bauplaner team lager` sie ohne Plugin kennen.

Tests: `RoomClientTest` (Faltung, Raumprüfung, Speichern; mit `BAUPLANER_ROOM` gegen einen laufenden Raum: Tom nimmt einen Abschnitt im „Spiel“, Lea schreibt eine Notiz im Planer), `tests/e2e/team-room.e2e.mjs` („Mein Spiel verbinden“ übergibt nur den Mitgliedsschlüssel), `scripts/mod/test_bridge_ingame.sh` mit `BAUPLANER_ROOM` (echtes Minecraft 26.3: live mit dem Raum, `/bauplaner team nehmen 2` kommt im Raum an, `/bauplaner team aufnahme` legt eine lesbare Aufnahme in den Raum – ohne Server). 0.15.0: `RoomClientTest` live zusätzlich Position beim Planer, Anforderung → Hochladen → Holen, `section.seen` im Protokoll; der Browsertest zeigt die Position unter „Gerade da“ und lädt die angeforderte Aufnahme.

### 9.2 Ausweichwege (Mod 0.16.0, FALLBACK-01)

Raum offline, WebSocket gesperrt, Neustart ohne Internet: Die Mod speichert den Teamstand (`raum-stand.json`), gleicht ohne WebSocket über HTTP ab und merkt Messungen bis zum nächsten Kontakt. Der Planer holt den Baustand über den besten verfügbaren Weg (eigenes Spiel → Team-Raum → Server-Plugin → Datei). Alles dazu in [FALLBACKS](FALLBACKS.md).
