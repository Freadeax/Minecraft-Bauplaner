# Server ohne Befehle (LINK-01 … LINK-06)

Stand 04.11.2026, Mod/Plugin 0.12.0. Anlass: Philipp, 04.11.2026: „Ich will keine Commands auf der Serverseite eingeben müssen! Denk das System weiter um!“

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
- `sig = base64url(HMAC-SHA-256(key, owner + "\n" + seq + "\n" + body))` – `LinkCore.sign` und `packages/domain/src/serverControl.ts` (`signControl`) rechnen gleich; gemeinsamer Prüfvektor in beiden Tests.
- `seq` muss je Gerät streng steigen (der Planer nimmt Millisekunden), die letzte Nummer liegt in `link.json`: eine aufgezeichnete Nachricht wirkt nie zweimal, auch nicht nach einem Neustart.
- Operationen: `status`, `config` (nur die Liste in `LinkCore.SETTINGS`, alles oder nichts; `team.kanal` ist absichtlich nicht fernsteuerbar), `team` (Teamdatei), `room` (Team-Raum verbinden/trennen), `plan` (.schem bis 4 MB, optional Anker), `rename`, `invite` (weiteres Gerät), `forget` (Gerät entfernen).
- Steuernachrichten setzen nie Blöcke und führen nie Serverbefehle aus.

## 4. Mod (LINK-03)

- Live-Dienst startet von selbst (Einstellung `aktiv` bleibt abschaltbar).
- `POST /v1/pair/ask {device}` → Frage im Spiel (Banner oben, Knöpfe im J-Menü „Planer zulassen“/„Ablehnen“, Ausweg `/bauplaner verbinden zulassen|ablehnen`). `GET /v1/pair/ask?request=` liefert `waiting`, einmal `ok` + Schlüssel, `denied` oder `expired` (3 Minuten, höchstens 3 offene Fragen). Der sechsstellige Code bleibt für ältere Planer.
- Teamkanal je Server weiter **nur freiwillig**: Die Frage „Teambau erlauben“ erscheint als Knopf statt als Befehl.
- `GET /v1/server`, `POST /v1/server/claim`, `POST /v1/server/control` reichen nur weiter (Token nötig). Feature-Liste: `pairask`, `server`.

## 5. Planer (LINK-04)

- Seite **Spiel** (`#/mod`), Bereich „Spiel und Server verbinden – ohne Befehle“ (`ServerPanel.tsx`, `serverClient.ts`): drei Schritte Spiel → Server → Kopplung, danach das Einstellungsformular aus dem Schema des Plugins, Teams, Raum, Pläne, gekoppelte Geräte (trennen/entfernen), Umbenennen.
- Gerätekopplungen in `localStorage` `bauplaner.server.kopplungen` (wie der Mod-Schlüssel nur in diesem Browser). Die benutzte Nummer wird vor dem Senden gespeichert und mit dem gespeicherten Stand zusammengeführt (der gemerkte Raum bleibt).
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

- `LinkCoreTest` (Paper), `LiveLinkTest` (Mod-Kern), `tests/server-link.test.mjs` (Planer, gemeinsamer Vektor, Freigabe-Link), `tests/team-room.test.mjs` (Raum-Weiterleitung).
- Browser: `tests/e2e/server-link.e2e.mjs` gegen den Mod-Simulator mit Plugin-Ersatz (PC 1400/390 px, iPad 820 px über einen Raum-Ersatz).
- Echter Server: `scripts/test_bridge_paper_link.sh` – Paper 1.21.11, ein Protokoll-Client (`minecraft-protocol`) spricht den Teamkanal wie die Mod: Selbsteinrichtung, Nicht-OP abgewiesen, Kopplung, Einstellungen, Team, Wiederholung/falsche Unterschrift/fremder Server abgewiesen, Neustart, Gerät entfernen; mit `BAUPLANER_ROOM` zusätzlich Steuerung über einen echten Team-Raum (`npx wrangler dev`).
- Spiel: `scripts/test_bridge_ingame.sh` klickt im echten Minecraft 26.3 „Planer zulassen“ mit der Maus.
