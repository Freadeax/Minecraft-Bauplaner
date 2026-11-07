# Team-Zugang getrennt von Sicherungen (BACKUP-03)

Stand 07.11.2026. Anlass: Sicherheitsprüfung vom 07.11.2026, Befund P0 „JSON-Sicherungen enthalten Raumschlüssel“. Ein Projekt im Team live trägt in `site.team.live` den Einladungsschlüssel, beim Planer der Bauleitung zusätzlich Verwaltungs- und Serverschlüssel. Projekt- und Gesamtsicherungen hatten diesen Block im Klartext übernommen. Wer eine solche Datei bekam, konnte den Raum verwalten und (über den daraus abgeleiteten Unterschriftsschlüssel, [SIGNED_EVENTS.md](SIGNED_EVENTS.md)) Ereignisse im Namen der Bauleitung unterschreiben.

## 1. Regeln

| Was | Schlüssel enthalten? |
|---|---|
| Projektsicherung, Gesamtsicherung (`createBackup`) | **nein**, `withoutTeamAccess` entfernt `site.team.live` (Schlüssel, Lesestand, Postausgang). Teamprotokoll und `self` bleiben. |
| Teampaket, Server-Datei, Planstand im Raum | nein (wie bisher `shareable`) |
| Team-Zugang-Datei (`*.lmnt-zugang.json`) | ja, **nur verschlüsselt** mit Passwort |
| Raumsicherungen im Tresor (OPS-04) | nur die Hashes der Schlüssel (wie bisher) |

- **Vergleich und Wiederherstellung:** `planRestore` vergleicht Projekte ohne den Live-Block. Eine schlüsselfreie Sicherung über dem laufenden Projekt ist „gleich“; bei „Ersetzen“ behält das Projekt seinen lokalen Zugang (`keepTeamAccess`). Nach einer Wiederherstellung in einem neuen Browser ist das Team nicht live, bis die Team-Zugang-Datei geöffnet wird.
- **Ältere Sicherungen** mit Schlüsseln lassen sich weiter lesen. `readBackup` nennt die Projekte (`teamAccessIn`), die Wiederherstellung warnt und empfiehlt den Wechsel des Verwaltungsschlüssels und eine neue Einladung.
- **Sicherungserinnerung:** Der Fingerabdruck eines Projekts (`recordFingerprint`) lässt den Live-Block aus. Der Lesestand bewegt sich laufend und ist keine Planänderung.

## 2. Team-Zugang-Datei

Im Reiter Team → Team live → „Team-Zugang sichern (verschlüsselt)“, zum Öffnen „Team-Zugang aus Datei wiederherstellen“ (sichtbar, solange das Team in diesem Browser nicht live ist). Inhalt: Team-ID, Teamname, Projektname, Zeit, Adresse, Raum, Einladungs-, Verwaltungs- und Serverschlüssel (soweit vorhanden).

```json
{ "format": "lmnt-team-zugang", "version": 1, "teamId": "…", "teamName": "…", "createdAt": "…",
  "kdf": { "name": "PBKDF2", "hash": "SHA-256", "iterations": 600000, "salt": "<16 Byte, base64>" },
  "cipher": { "name": "AES-GCM", "iv": "<12 Byte, base64>" }, "data": "<base64>" }
```

- Schlüssel = PBKDF2-SHA-256(Passwort in NFC, Salz, 600 000 Runden) → AES-256-GCM. Zusatzdaten (AAD) = `lmnt-team-zugang/1\n<Runden>\n<teamId>`: ein geändertes Team oder eine geänderte Rundenzahl im Kopf macht die Datei unlesbar. Gelesen werden 100 000 bis 5 000 000 Runden, Dateien bis 64 KB.
- Passwort mindestens 10 Zeichen. Falsches Passwort und veränderte Datei ergeben dieselbe Meldung „Passwort falsch oder Datei verändert“.
- Öffnen (`restoreTeamAccess`) prüft die Team-ID gegen das Projekt und schaltet mit `goLive` live: Lesestand von vorn, das ganze eigene Protokoll in den Postausgang. Der Raum antwortet für Bekanntes „known“, es geht nichts verloren.
- Das ist ein Notfallweg wie die Sicherung selbst. Der normale Weg in ein Team bleibt der Einladungslink.

## 3. Verwaltungsschlüssel wechseln

Raum: `POST /v1/rooms/<raum>/rotate?wer=admin` (nur mit Verwaltungsschlüssel) setzt einen neuen Hash, der alte Schlüssel gilt danach gar nicht mehr. Einladungs- und Serverschlüssel bleiben. `/v1/status` meldet das Merkmal `admin-rotate`; ohne es bietet der Planer stattdessen einen neuen Raum an. Eine Wiederherstellung aus dem Tresor in einen bestehenden Raum ändert die Schlüssel nie (OPS-04), die alten Hashes kommen also nicht zurück.

Planer (Knopf „Verwaltungsschlüssel wechseln“ bei der Bauleitung):

1. Mit dem alten Schlüssel alle Raumereignisse lesen (Seiten zu 500, Ankunftsnummern wie das Plugin sie zählt, `numberPage`).
2. `retrustAfterRekey` spielt den Filter des Plugins (`EventTrust.java`) mit dem **alten** Unterschriftsschlüssel nach: bisherige bestätigte Nummer (`team.trust`), danach jedes Ereignis wie auf dem Server (Herkunft Server, Unterschrift, im Namen der Bauleitung, Arten nur für die Bauleitung, Spielernamen „erster gilt“).
3. Neuen Schlüssel holen, im Projekt speichern.
4. Der Gründer unterschreibt mit dem **neuen** Schlüssel ein `team.trust` bis zur letzten Nummer vor dem ersten Ereignis, das der Server abgewiesen hatte (ohne Abweisung: bis zum Ende). Eine abgewiesene Fälschung wird so nie nachträglich bestätigt, alles bisher Übernommene bleibt übernommen.
5. Hinweis an die Bauleitung: wie viele spätere unterschriebene Änderungen neu zu setzen sind (`lostSigned`), neuen Team-Zugang sichern, „Mein Spiel verbinden“ neu drücken (die Mod der Bauleitung signiert sonst mit dem alten Schlüssel). Der Server bekommt den neuen Unterschriftsschlüssel beim nächsten Besuch über die Kopplung von selbst.

Grenzen: Wer den alten Verwaltungsschlüssel schon benutzt hat, konnte bis zum Wechsel gültig unterschreiben. Das lässt sich nachträglich nicht unterscheiden; der Verlauf zeigt jede Änderung mit Namen. Einen individuellen Zugang je Mitglied und eine Unterschrift mit öffentlichem Prüfschlüssel (statt HMAC) behandelt die Härtung der Team-Rollen getrennt.

## 4. Tests

- `tests/unit/data/backup-secrets.test.mjs`: Projekt- und Gesamtsicherung ohne die drei Schlüssel, Vergleich „gleich“, Ersetzen behält den Zugang, ältere Sicherung mit Warnung, Fingerabdruck, Versiegeln/Öffnen/falsches Passwort/geänderter Kopf, Wechsel im Raum, neue Bestätigung bis vor die erste Fälschung, Spielernamen-Regel, Rundreise Sicherung + Zugang.
- `tests/e2e/team-access.e2e.mjs`: Chromium mit Raumkern hinter Playwright, Gesamt- und Projektsicherung heruntergeladen und durchsucht, Wechsel des Verwaltungsschlüssels (alter abgewiesen, neues `team.trust` mit neuem Schlüssel unterschrieben), Team-Zugang versiegelt, Live trennen, falsches Passwort, wieder live mit Verwaltung.
