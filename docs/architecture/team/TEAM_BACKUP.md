# Team-Raum betreiben: Sicherung, Wiederherstellung, Aufbewahrung, Zustand (OPS-04)

Stand 06.11.2026. Gilt für den Team-Raum `services/team-room` (Cloudflare Worker + Durable Objects, kostenloser
Workers-Tarif). Protokoll und Live-Sync: `TEAM_LIVE.md`. Regeln: NUR INTERNET (keine Datei herunterladen oder
einfügen), CLIENT FIRST (jeder Planer hält den ganzen Teamverlauf selbst).

## 1 Ziel

- Kein Schritt eines Teams geht verloren, wenn der Raum beschädigt, versehentlich überschrieben oder gelöscht wird.
- Wiederherstellen geht mit einem Klick der Bauleitung, online, ohne Datei.
- Alles bleibt im kostenlosen Cloudflare-Tarif (keine Kreditkarte, kein R2, kein KV-Schreibkontingent).

## 2 Bausteine

| Baustein | Wo | Aufgabe |
|---|---|---|
| Raum (`TeamRoom`) | ein Durable Object je Raum, SQLite | Ereignisse, Planstände, Dokumente, Aufnahmen; plant die automatische Sicherung per Alarm |
| Tresor (`RoomVault`) | eigenes Durable Object je Raum (`idFromName(<raum>)` in der Klasse `RoomVault`), eigener SQLite-Speicher | hält die Sicherungen; nur der Raum spricht mit ihm (RPC), keine öffentliche Adresse |
| Planer | jeder Browser im Team | hält den ganzen Verlauf; reicht nach einer Wiederherstellung seine Schritte selbst nach |
| Zustand | `GET /v1/status` (öffentlich) und `GET /v1/rooms/{raum}/status` (Bauleitung) | erreichbar, Version, Füllstand, letzte Sicherung, nächster Termin, Löschdatum, letzter Fehler |

Die Raumlogik steht ohne Cloudflare-Abhängigkeit in `src/core.js` (Schnappschuss, Wiederherstellen) und
`src/vault.js` (Tresor, Aufbewahrung); `src/index.js` verbindet beides mit Durable Objects, Alarmen und Routen.

## 3 Was eine Sicherung enthält

`head` (Format `bauplaner-team-room-backup` v1): Raumdaten samt Hashes der drei Schlüssel, Kopfdaten für das
Plugin, Liste der Planstände, geteilte Dokumente (Weltplan, Karten) mit Revision, höchste ausgegebene
Ankunftsnummer (`floor`), Marke `epoch`. Dazu alle Ereignisse als `[seq, id, json]`. Kopf und Ereignisse gehen
gzip-gepackt mit SHA-256 in den Tresor; Planstände und Dokumente liegen dort einmal nach SHA-256 und werden von
allen Sicherungen gemeinsam benutzt (25-MB-Planstände kosten nicht je Sicherung Platz).

Nicht enthalten: Aufnahmen aus dem Spiel (`scans`, bis 96 MB, jederzeit neu aufnehmbar), Anwesenheit, offene
Steuernachrichten, Stapelantworten.

## 4 Wann gesichert wird

- **Automatisch:** jede Änderung (Ereignis, Kopfdaten, Planstand, Dokument, neuer Schlüssel) stellt den Alarm auf
  „15 Minuten später, aber frühestens eine Stunde nach der letzten Sicherung“. Der Alarm sichert nur, wenn sich
  seit der letzten Sicherung wirklich etwas geändert hat (`stateKey`).
- **Von Hand:** Bauleitung, „Jetzt sichern“ (`POST /backups`), höchstens einmal je Minute.
- **Vor einer Wiederherstellung** und **vor dem Löschen** immer.
- Scheitert eine automatische Sicherung, steht der Fehler im Zustand und der Alarm versucht es nach einer Stunde
  wieder.

## 5 Aufbewahrung und Löschen alter Räume

| Was | Wie lange |
|---|---|
| automatische Sicherungen | alle der letzten 48 Stunden, danach die neueste je Tag bis 30 Tage |
| Sicherungen mit Grund (von Hand, vor Wiederherstellung, vor Löschen) | 30 Tage, höchstens 20 |
| die neueste Sicherung | immer |
| insgesamt | höchstens 80 |
| Raum ohne Nutzung | nach 365 Tagen ohne Öffnen gelöscht (letzte Sicherung „lange unbenutzt“) |
| Tresor eines gelöschten Raums | 90 Tage, dann weg |

„Benutzt“ = eine Anfrage oder Live-Verbindung mit gültigem Schlüssel; Anfragen ohne oder mit falschem Schlüssel
zählen seit dem 07.11.2026 nicht mehr (TEAM_LIVE.md §15). Geschrieben wird das höchstens einmal am Tag.
Planstände und Dokumente, die keine verbleibende Sicherung mehr braucht, löscht der Tresor sofort mit.
Ein Raum, der vor OPS-04 angelegt und seitdem nie mehr geöffnet wurde, hat keinen Alarm und wird nicht von selbst
gelöscht (Cloudflare kann Durable Objects nicht aufzählen); beim nächsten Öffnen bekommt er einen.

Rahmen des kostenlosen Tarifs: 5 GB Speicher in allen Durable Objects des Kontos, 100 000 Anfragen je Tag.
Ein typischer Raum (einige tausend Ereignisse, ein Planstand von 1–5 MB) belegt mit allen Sicherungen deutlich
unter 50 MB; eine Sicherung kostet einige wenige Anfragen.

## 6 Wiederherstellen

`POST /v1/rooms/{raum}/restore` mit `{ "backup": "<id>" }` und Verwaltungsschlüssel.

1. Raum besteht: zuerst Sicherung „vor einer Wiederherstellung“; die heutigen Schlüssel bleiben (alle Links gelten
   weiter). Raum ist gelöscht: Prüfung gegen den Verwaltungsschlüssel der neuesten Sicherung im Tresor; die Schlüssel
   der Sicherung kommen zurück, also gelten die alten Einladungs- und Server-Links wieder.
2. Ereignisse, Planstände, Dokumente und Kopfdaten werden in einer Transaktion durch den Stand der Sicherung ersetzt;
   die Revisionsprüfung (TEAM-02, `subjects`) wird aus dem Verlauf neu aufgebaut, alte Stapelantworten vergessen.
3. **Nummern laufen weiter:** Ereignisse behalten ihre Ankunftsnummern; neue bekommen Nummern über allem, was der
   Raum je ausgegeben hat (`floor`). Ein Planer mit altem Lesestand überspringt so nie ein neues Ereignis und muss
   nicht von vorn lesen. Ist ein Raum ohne letzte Sicherung verloren gegangen, legt der Raum 20 000 Nummern Abstand
   drauf.
4. Neue Marke `epoch`; alle Live-Verbindungen werden mit Code 4012 getrennt und verbinden sich nach etwa einer
   Sekunde neu.
5. **CLIENT FIRST:** Der Planer sieht im `welcome` die neue Marke (`afterRestore` in `teamSync.ts`) und legt alle
   Planer-Ereignisse seines Verlaufs noch einmal in den Postausgang. Der Raum antwortet „bekannt“ für alles, was er
   hat, und nimmt den Rest. So kommen alle Schritte nach der Sicherung von selbst zurück, sobald jeder Planer einmal
   online war. Messungen des Servers (`origin: server`) darf nur das Plugin schreiben; es misst ohnehin weiter.

Gelöscht wird mit `DELETE /v1/rooms/{raum}?bestaetigen=<raum>` (Bauleitung): letzte Sicherung, Tresor merkt sich das
Löschdatum (90 Tage), Live-Verbindungen bekommen Code 4404 („Der Team-Raum wurde gelöscht“), der Raum wird geleert.

## 7 Oberfläche

Reiter „Team“ → „Team live“ → **Sicherung und Zustand** (nur mit Verwaltungsschlüssel, also bei der Bauleitung):
Dienst erreichbar, Schritte von 20 000, Verbindungen, letzte Sicherung, nächster Termin, Aufbewahrung und
Löschdatum, Fehler; „Jetzt sichern“, Liste der Sicherungen mit „Wiederherstellen“, „Raum löschen“. Ist der Raum
gelöscht, zeigt der Bereich das und bietet die Sicherungen zum Zurückholen an. Testfall TEAMBAU-31.

## 8 Wiederanlauf und Überwachung

- `node scripts/team/team_room_smoke.mjs <url>`: Grundfunktionen. `node scripts/team/team_room_backup_smoke.mjs <url>`:
  Sicherung, Rechte, Wiederherstellung mit Live-Trennung und fortlaufenden Nummern, Löschen und Zurückholen.
  Mit `wrangler dev --var BACKUP_DELAY_MS:2000 --var BACKUP_EVERY_MS:2000` und `BACKUP_ALARM_WAIT_MS=6000` prüft
  die Probe auch die automatische Sicherung per Alarm (nur lokal; die Variablen nie im Betrieb setzen).
- `GET /v1/status` nennt die ausgerollte Version (`deployment`); nach jedem Ausrollen beide Proben gegen den Dienst.
- Rücksprung auf die vorige Worker-Version: `npx wrangler rollback <version>` (Daten bleiben, die Migration v2 legt
  nur die Klasse `RoomVault` an).
- Zweite Linie bei einem beschädigten Raum ohne brauchbare Sicherung: Cloudflare bietet laut Doku für SQLite-Durable-Objects
  30 Tage Point-in-Time-Recovery (`ctx.storage.getBookmarkForTime`, `onNextSessionRestoreBookmark`). Das ist bewusst
  nicht im Planer, weil es den ganzen Raum ohne Vorabsicherung zurückdreht; bei Bedarf als einmaliges Skript.
- Datenmigration: Neue Felder kommen abwärtsverträglich dazu (Format-Version `1`); eine Sicherung eines älteren
  Formats wird beim Wiederherstellen abgelehnt statt halb gelesen.

## 9 Grenzen

- Während eine Sicherung geschrieben wird, warten andere Anfragen an den Raum kurz (Durable Objects arbeiten eine
  Anfrage nach der anderen); bei vollen Räumen (20 000 Ereignisse) nicht gemessen.
- Wer nach einer Wiederherstellung nie wieder online kommt, reicht seine Schritte nie nach.
- Der Tresor liegt beim selben Cloudflare-Konto. Gegen den Verlust des ganzen Kontos schützt CLIENT FIRST: jeder
  Planer hält den Verlauf, und „Live schalten“ in einem neuen Raum lädt den ganzen Verlauf wieder hoch.
