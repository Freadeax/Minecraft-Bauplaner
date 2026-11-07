# Team-Raum: Absender aus der Sitzung, persönliche Schlüssel, Rollenprüfung (TEAM-SEC-01)

Stand 07.11.2026, Mod/Plugin 0.28.0. Anlass: Sicherheitsprüfung vom 07.11.2026, Befund P0 „Team-Rollen lassen sich vortäuschen“: Mit dem gemeinsamen Einladungsschlüssel ließ sich ein unsigniertes Ereignis mit der Absender-ID der Bauleitung einspeisen (`member.role` → Baumeister). Der Raum nahm es an, jeder Planer zeigte das Mitglied als Baumeister. Zweiter Befund: Das Paper-Plugin bekam zur Prüfung denselben HMAC-Schlüssel, mit dem man auch unterschreiben kann.

## 1. Grundsatz

Wer etwas geschrieben hat, sagt der **Schlüssel**, nicht das Feld `by` im Ereignis. Der Raum prüft vor dem Speichern

1. dass `by` zum Schlüssel passt (eigener Schlüssel → gebundenes Mitglied, Verwaltungsschlüssel → Gründer),
2. dass die Rolle des Mitglieds für die Ereignisart reicht (Tabelle `NEED` in `services/team-room/src/core.js`, gleich `TEAM_NEED` in `team.ts`, ein Test vergleicht beide).

Planer, Mod und Plugin übernehmen außerdem nur **geprüfte** Änderungen (§5).

## 2. Schlüssel

| Schlüssel | Wer | darf |
|---|---|---|
| Verwaltungsschlüssel | Bauleitung (Gründer) | alles; Absender = Gründer; darf beim Live-Schalten auch frühere Ereignisse anderer weitergeben |
| persönlicher Schlüssel | ein Mitglied, je Gerät einer (höchstens 8) | Ereignisse nur im eigenen Namen, nur was die Rolle erlaubt |
| Einladung (gemeinsam) | wer den Link hat | lesen und beitreten; in alten Räumen (nicht `strict`) noch Helferschritte unter nicht gebundenen IDs |
| Serverschlüssel | Paper-Plugin | Ereignisse mit Herkunft `server` |

Routen (alle unter `/v1/rooms/<raum>/`, `Authorization: Bearer <Schlüssel>`):

- `POST join` (Einladung) `{member, label?}` → `{member, key, keyId, role, pending}`. Die Gründer-ID gibt es nie per Einladung. Eine schon gebundene ID → 409 `mitglied-vergeben`. Eine ID, die der Raum als Baumeister/Bauleitung kennt, wird gebunden, gilt aber bis zur Bestätigung (`pending`) nur als Helfer – die Einladung allein bringt nie mehr Rechte.
- `POST keys` (eigener oder Verwaltungsschlüssel) `{label}` → weiterer Geräteschlüssel für sich selbst (z. B. die Mod).
- `GET keys` → Liste ohne Hashes; die Bauleitung sieht alle, andere nur die eigenen. `lastUsed` tagesgenau.
- `DELETE keys/<keyId>` → widerrufen (Bauleitung jeden, sonst nur eigene); offene Verbindungen mit dem Schlüssel schließen mit 4403.
- `POST members/<id>/approve` (Bauleitung) → Übernahme einer Baumeister-/Bauleitungs-ID bestätigen.
- `POST identity` (Verwaltungsschlüssel) `{founder, roles?, leaderKey?, strict?}` → Umstellung alter Räume (§3).
- `GET` (Rauminfo) und `welcome` tragen `identity: {founder, strict, checkedFrom, leaderKey}`; Seiten und Pushes tragen `seqs` (Ankunftsnummer je Ereignis).

Rollen kennt der Raum aus `member.role`-Ereignissen, die er selbst angenommen hat (nur von der Bauleitung). Neue Mitglieder sind Helfer. Persönliche Schlüssel und Rollen stehen in der Raumsicherung; eine Wiederherstellung eines bestehenden Raums behält die heutigen Schlüssel (ein widerrufener Schlüssel kommt nicht zurück).

## 3. Neue und alte Räume

- **Neuer Raum** (Planer ab 07.11.2026): `POST /v1/rooms` mit `founder` → der Raum prüft ab dem ersten Ereignis (`checkedFrom = 1`) und ist `strict` (mit der Einladung nur beitreten).
- **Alter Raum:** Bis die Bauleitung den neuen Planer öffnet, nimmt der Raum mit der Einladung keine Bauleitungs- oder Baumeister-Arten an und nichts im Namen des Gründers (der Gründer steht in den Kopfdaten). Öffnet die Bauleitung den Planer, stellt er den Raum um (`secureRoom` in `roomClient.ts`): Gründer, Rollen aus ihrer Faltung (ohne die ausgenommenen Schritte), öffentlicher Schlüssel; der Raum prüft ab der nächsten Ankunftsnummer. Dann schreibt die Bauleitung ein unterschriebenes `team.trust {upTo, except}` (§5).
- **Mitglieder** tauschen beim Verbinden die Einladung von selbst gegen einen persönlichen Schlüssel (`POST join` mit der eigenen ID). Die Mod bekommt bei „Mein Spiel verbinden“ einen eigenen Geräteschlüssel, nie die Einladung oder den Verwaltungsschlüssel.
- `strict` für alte Räume schaltet die Bauleitung ein (`POST identity {strict: true}`), sobald alle Mitglieder neue Planer/Mods haben.

## 4. Unterschrift der Bauleitung: Ed25519 statt HMAC

- Seed = `base64url(HMAC-SHA-256(adminKey, "bauplaner-leitung/ed25519/v1"))` (32 Byte, bleibt auf den Geräten der Bauleitung), öffentlicher Schlüssel daraus (32 Byte base64url).
- Unterschrift: Ed25519 über `"bauplaner-team-event/v2\n" + teamId + "\n" + kanonisch(Ereignis ohne sig)`, 86 Zeichen in `sig` (HMAC: 43 Zeichen). Gleicher Prüfvektor in `tests/unit/team/team-identity.test.mjs`, `EventSigTest`, `EventTrustTest`.
- Der Server-Link trägt `p=<öffentlicher Schlüssel>` statt `l=<HMAC-Schlüssel>`. Bekommt das Plugin `p`, löscht es einen gespeicherten `l`. Ein kompromittiertes Plugin kann damit keine Unterschrift der Bauleitung mehr erzeugen.
- Die Mod der Bauleitung bekommt den Seed (`leaderSeed`, Mod-Merkmal `roomsign2`) und gibt dem Plugin nur `p`. Mods vor 0.28.0 bekommen keinen Schlüssel mehr.

## 5. Nur geprüfte Änderungen übernehmen

„Beweispflichtig“ sind Ereignisse im Namen des Gründers und alle Arten ab Baumeister (`needsProof`). Sie gelten, wenn

- eine gültige Ed25519-Unterschrift der Bauleitung dranhängt, oder
- der Raum den Absender geprüft hat (Ankunftsnummer ≥ `checkedFrom`), oder
- ein unterschriebenes `team.trust` der Bauleitung sie abdeckt (Nummer ≤ `upTo`, nicht in `except`).

Planer: `screenFeed` vor `ingest`; nicht geprüfte Ereignisse kommen ins Protokoll, aber nach `live.held` und nicht in die Faltung (keine Meldung „neu“). Ein späteres `team.trust` gibt sie frei. Ereignisse, die ein unterschriebenes `team.trust` in `except` nennt, lässt die Faltung immer weg – auch aus alten lokalen Protokollen.

Mod und Plugin: `EventTrust` (aus dem Plugin in die Mod kopiert wie `TeamLog`) mit öffentlichem Schlüssel und `checkedFrom`. Das Plugin verlangt für Schritte im Namen der Bauleitung und für Bauleitungs-Arten weiter die Unterschrift (der Raum allein reicht dem Server dafür nicht).

`team.trust` bei der Umstellung: `upTo` = letzte Ankunftsnummer; `except` = Schritte im Namen des Gründers nach dem letzten früheren `team.trust`, die keine gültige alte HMAC-Unterschrift tragen (gab es noch keins, nur Schritte mit kaputter Unterschrift). Höchstens 50; darüber endet die Bestätigung vor dem 51.

## 6. Grenzen

- Wer eine alte, noch nicht gebundene Helfer-ID zuerst übernimmt, schreibt in deren Namen (wie bisher, ohne mehr Rechte). Das echte Mitglied bekommt 409 und bittet die Bauleitung, den Schlüssel zu widerrufen.
- Gefälschte Schritte anderer Mitglieder (nicht der Bauleitung) aus der Zeit vor der Umstellung bestätigt die Bauleitung mit; Baumeister-Schritte daraus lässt das Plugin weg.
- Zur Bauleitung beförderte Mitglieder ohne Verwaltungsschlüssel unterschreiben nicht: Ihre Bauleitungs-Arten gelten im Raum und im Planer, auf dem Server nicht (wie bei GAME-06).

## 7. Tests

- `tests/unit/team/team-identity.test.mjs`: Regression des Angriffs (Einladung, eigener Schlüssel, eigener Name), persönliche Schlüssel, Widerruf, Geräte, Umstellung alter Räume mit Bestätigung, Sicherung, Ed25519-Vektor, `screenFeed`/`held`/`except`, `upgradeTrust`.
- `EventSigTest` (Ed25519-Vektor), `EventTrustTest` (öffentlicher Schlüssel, HMAC-Fälschung abgewiesen, `except`, `checkedFrom`, Link mit `p`).
