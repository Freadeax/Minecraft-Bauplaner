# Server-Plugin direkt mit dem Team-Raum – unterschriebene Ereignisse und Abschnittsschutz (GAME-06)

Stand 06.11.2026, Mod/Plugin 0.26.0. Anlass: Ausbaurunde Philipp, 06.11.2026 („Vollständiges komplexes Weiterbauen in mehreren Blöcken in allen Bereichen“), Block 5: Das Paper-Plugin verarbeitet Team-Raum-Ereignisse mit Ereignis-ID, unterschrieben und wiederholbar, alles über das Internet, und setzt den Abschnittsschutz nach den Team-Rollen aus dem Raum durch. Das Plugin bleibt freiwillig (CLIENT FIRST), es gibt keinen Datei-Weg (NUR INTERNET).

## 1. Problem

Der Team-Raum (`services/team-room`) prüft nur den Schlüssel. Wer die Einladung hat, darf Ereignisse schreiben – und das Feld `by` (wer es war) prüft niemand. Für Notizen und Übernahmen ist das in Ordnung, die Faltung zeigt jede Aktion mit Namen. Das Plugin setzt aber mit genau diesen Ereignissen den **Abschnittsschutz** durch. Ohne Prüfung könnte jeder mit Einladungslink

- sich im Namen der Bauleitung zur Bauleitung machen (`member.role`),
- den Schutz abschalten,
- seinen Minecraft-Namen auf ein anderes Mitglied legen (`member.player`) und dann in dessen Abschnitten bauen.

## 2. Lösung im Überblick

```
Planer der Bauleitung (hat den Verwaltungsschlüssel)
  signKey = base64url(HMAC-SHA-256(adminKey, "bauplaner-leitung/v1"))
  jedes eigene Ereignis (by = Gründer) → sig = base64url(HMAC-SHA-256(signKey, "bauplaner-team-event/v1\n" + teamId + "\n" + kanonisch(Ereignis ohne sig)))
        │ Team-Raum (speichert unverändert, kennt signKey nicht)
        ▼
Paper-Plugin (bekommt signKey einmal mit dem Server-Link, Parameter l)
  EventTrust: lässt nur vertrauenswürdige Raum-Ereignisse in seine Faltung
  Abschnittsschutz: Rollen, Spielernamen und Schutzstufe nur aus dieser Faltung
```

- **Unterschrift:** HMAC-SHA-256 wie bei den Steuernachrichten (LINK-02). Kanonisches JSON = Schlüssel sortiert, ohne Leerzeichen, Zeichenketten wie `JSON.stringify` (`canonical` in `services/team-room/src/core.js`). Team-ID, Ereignis-ID und Zeit stehen im unterschriebenen Text: eine Unterschrift gilt nie in einem anderen Team und nie für ein neues Ereignis. Gleiche Rechnung in `packages/domain/src/team/eventSig.ts` und `mods/bauplaner-bridge/mod-core/…/team/EventSig.java` (auch im Plugin); gemeinsamer Prüfvektor in `tests/unit/team/event-sig.test.mjs`, `EventSigTest`, `EventTrustTest`.
- **Wer unterschreibt:** Nur der Planer, der den Raum angelegt hat (er allein hat den Verwaltungsschlüssel), und die Mod der Bauleitung, wenn sie den Schlüssel bei „Mein Spiel verbinden“ bekommen hat (Merkmal `roomsign`). Unterschrieben werden nur Ereignisse im Namen des Gründers; Ereignisse anderer Mitglieder gehen unverändert weiter (die Bauleitung bürgt nicht für fremde Einträge). Deterministisch: dasselbe Ereignis bekommt immer dieselbe Unterschrift, ein erneutes Senden bleibt im Raum „bekannt“. Ein Ereignis, das nur ohne Unterschrift unter 4 KB passt, geht ohne.
- **Weitergabe an den Server:** Der Server-Link bekommt `&l=<signKey>` – nie den Verwaltungsschlüssel. Er kommt über die Mod (`link.room`, LINK-11) oder die unterschriebene Steueraktion `room` (LINK-04/05). Ist der Server schon im Raum, übernimmt das Plugin nur den Schlüssel (`same: true`, kein Neuverbinden). Der Planer schickt den Link dafür einmal je Besuch, auch wenn der Server schon im Raum ist.
- **Planer:** Die eigene Fassung eines Ereignisses bleibt ohne `sig`; kommt die unterschriebene aus dem Raum zurück, ist sie dasselbe Ereignis (`mergeTeam` vergleicht ohne `sig` und behält die unterschriebene Fassung, unabhängig von der Reihenfolge).

## 3. Was das Plugin übernimmt (`EventTrust.java`)

Erst wenn der Server den Unterschriftsschlüssel hat **und** die Bauleitung den bisherigen Stand bestätigt hat, filtert er. Bis dahin verhält er sich wie bis 0.23.0 und sagt das in `/bauplaner team raum`.

| Ereignis | übernommen? |
|---|---|
| Herkunft `server` (mit dem Serverschlüssel geschrieben, den nur das Plugin hat) | ja |
| mit Unterschrift der Bauleitung | nur wenn sie passt |
| nicht aus dem Raum (Teamdatei vom Server-Admin) | ja |
| aus dem Raum bis zur bestätigten Ankunftsnummer (`team.trust`, die Zeit vor GAME-06) | ja |
| sonst ohne Unterschrift im Namen der Bauleitung | **nein** |
| sonst ohne Unterschrift, Art nur für die Bauleitung (`member.role`, `team.protect`, `team.trust`, `plan.release`) | **nein** |
| sonst ohne Unterschrift, Spielername (`member.player`, `member.join` mit Spieler), wenn das Mitglied schon einen anderen Namen hat oder der Name einem anderen gehört | **nein** (erster Name gilt) |
| alles andere (Übernahmen, Notizen, Fertigmeldungen …) | ja |

- **`team.trust {upTo}`** (neu, nur Bauleitung): Der Planer der Bauleitung schreibt es einmal je Raum von selbst, sobald er verbunden ist, mit seinem Lesestand. Alles, was bis dahin im Raum ankam, gilt als von der Bauleitung bestätigt.
- **Ankunftsnummern:** Das Plugin merkt sich je Raum-Ereignis die Nummer im Raum (`team/<teamId>.room.seq`, eine Zeile `nummer<TAB>id`), ausgerechnet aus den lückenlosen Seiten des Raums (`cursor` = Nummer des letzten Ereignisses). Beim Update von 0.23.0 bekommen alle schon vorhandenen Raum-Ereignisse den gespeicherten Lesestand. Ein anderer Raum für dasselbe Team beginnt ohne Nummern.
- **Wiederholbar:** Jede Ereignis-ID wirkt einmal (`TeamLog.add`), erneut gesendete Stapel beantwortet der Raum aus dem Stapelgedächtnis, der Lesestand steht nach jeder Seite in `<teamId>.room.json`. Kommt eine bekannte ID mit anderem Inhalt, bleibt der erste Stand (eine Logzeile je ID). Nicht übernommene Ereignisse bleiben im Teamprotokoll des Servers (nichts geht verloren) und stehen in `/bauplaner team raum pruefen`.
- Der Planer selbst filtert nicht: Er zeigt alles mit Namen wie bisher. Streng ist nur der Server, der durchsetzt.

## 4. Abschnittsschutz nach Rollen (`ProtectRules.java`, `TeamModule.guard`)

Schutzstufe (`team.protect {mode, free}`, neu, nur Bauleitung, im Planer Reiter „Team“ → „Team live“ → **Abschnittsschutz auf dem Server**):

- `mode`: `aus`, `hinweis` (Chatzeile, Standard), `sperren` (Blocksetzen/-abbauen wird verhindert).
- `free`: `alle` (Standard) oder `team` – in freien Abschnitten bauen nur Mitglieder ab Helfer.

Regeln je Block in einer Abschnittsbox (Rollen und Spielernamen aus der geprüften Faltung):

1. Recht `bauplaner.team.leitung`, Bauleitung oder Baumeister: überall.
2. Bestätigter Abschnitt: nur Baumeister und Bauleitung.
3. Vergebener Abschnitt: nur der Inhaber und seine Mitbauer (TEAM-03, `section.crew`/`section.join`).
4. Freier Abschnitt: alle, oder mit `free: team` nur Mitglieder ab Helfer.

Server-Hoheit: `config.yml` `team.schutz-quelle: raum` (Standard; die Einstellung der Bauleitung gilt) oder `server` (nur `team.schutz` und `team.schutz-frei` aus der Datei). Beide sind auch über die Kopplung einstellbar (`LinkCore.SETTINGS`). Der Status (`/bauplaner team raum`, Steueraktion `status`: `protect`, `protectFree`, `checked`, `untrusted` je Team) zeigt, was gilt.

## 5. Sicherheit und Grenzen

| Gefahr | Schutz |
|---|---|
| Mitglied gibt sich als Bauleitung aus | ohne Unterschrift nicht übernommen |
| Mitglied ändert Rollen oder Schutz | nur mit Unterschrift der Bauleitung |
| Mitglied übernimmt die Identität eines anderen auf dem Server | erster Spielername gilt; der Server kennt den echten Spieler |
| Aufgezeichnetes Ereignis erneut gesendet | gleiche ID wirkt einmal |
| Unterschrift in ein anderes Team kopiert | Team-ID im unterschriebenen Text |
| Team-Raum fälscht Ereignisse | kennt den Unterschriftsschlüssel nicht (im Raum liegt nur der Hash des Verwaltungsschlüssels) |
| Schlüssel im Log | stehen nie in Chat oder Log |

Grenzen: Ein Mitglied mit Einladung kann sich weiterhin im Raum als **anderes Mitglied** (nicht als Bauleitung) ausgeben, etwa eine Übernahme im Namen eines Baumeisters. Das bleibt im Verlauf mit Namen sichtbar; harte Identität je Mitglied bräuchte eigene Schlüssel je Gerät und ist nicht Teil von GAME-06. Zur Bauleitung beförderte Mitglieder haben keinen Verwaltungsschlüssel: Ihre Rollen- und Schutzänderungen aus dem Planer gelten auf dem Server nicht (im Spiel über das Plugin, Herkunft `server`, schon). Den Raum ersetzt das nicht: „Einladung erneuern“ sperrt Fremde aus (COOP-09).

## 6. Tests

- `tests/unit/team/event-sig.test.mjs`: Prüfvektor, Team/Inhalt/Schlüssel, nur eigene Ereignisse, `team.protect`/`team.trust` in der Faltung, unterschriebene Fassung beim Zusammenführen, Server-Link mit `l`.
- `EventSigTest` (Mod-Kern): gleicher Vektor, Zahlen und Zeichen wie JavaScript, Link der Mod mit `l`.
- `EventTrustTest`, `RoomLinkTest` (Plugin): Vergangenheit bestätigt, vier Fälschungen abgewiesen, Planer-Faltung ungefiltert, Regeln des Abschnittsschutzes.
- Echter Server: `scripts/mod/test_bridge_paper_signed.sh` (`bridge_papersigned.mjs`) – Paper 1.21.11 und 26.3 mit `npx wrangler dev`: Verbinden mit `l`, „noch ungeprüft“, unterschriebenes `team.trust` und `team.protect`, vier Fälschungen (Rolle im Namen der Bauleitung, Schutz aus von einem Baumeister, gestohlener Spielername, falsche Unterschrift) in `/bauplaner team raum pruefen`, echte Übernahme gilt, Ben bleibt Baumeister, Wiederholung ohne Wirkung, Neustart gleich, `schutz-quelle: server`.
- Mit echten Spielern (Blocksetzen) prüft es Philipp auf seinem Server: Testfälle in der Testphase (`#/testphase`).
