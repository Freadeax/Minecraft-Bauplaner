# Datenschutz, Freigaben und Speicherstatus (PRIV-01)

Ohne Team bleibt alles im Browser: keine Anmeldung, kein Konto, kein Welt-Upload. Sobald ein Team live ist, gehen Daten über das Internet. Diese Seite beschreibt, wie der Planer das sichtbar macht. Für Nutzer steht dasselbe auf `#/datenschutz`.

## Eine Liste für alle Hinweise

`apps/web/src/app/dataFlows.ts` beschreibt jeden Datenweg mit **was, wohin, wer sieht es, wie lange, wie zurücknehmen** und ob er den Browser verlässt. Die Seite `#/datenschutz` (`views/PrivacyView.tsx`) und der Hinweis `ShareNote` an jeder Freigabe lesen dieselben Einträge. Ein neuer Weg ins Internet bekommt zuerst hier einen Eintrag. `tests/unit/web/dataFlows.test.mjs` prüft die Felder und gleicht Aufbewahrungsfristen mit dem Team-Raum ab (365 Tage ohne Nutzung, 90 Tage Tresor nach dem Löschen, 12 Aufnahmen).

| Weg | Hinweis steht an |
|---|---|
| Team-Raum, Planstand | „Live schalten“, Team live, Einladungslink |
| Server-Link | „Link für den Server“ |
| Weltplan im Team | Weltkarte → „Weltplan im Team“ |
| Live-Position, Aufnahmen | Team live → „Was mein Spiel mit dem Team teilt“ |
| Server-Webkarte | Weltkarte → „Server-Webkarte verknüpfen“ |

Die Fußzeile sagt nicht mehr „Alles bleibt lokal“, sondern: Projekte liegen in diesem Browser, ins Internet geht nur, was im Team geteilt wird.

## Live-Position und Aufnahmen getrennt

Zwei Schalter je Gerät (`bauplaner.spiel.teilen` in localStorage, `serverClient.ts`): „Meine Position teilen“ und „Aufnahmen auf Anfrage senden“. Der Planer schickt sie bei „Mein Spiel verbinden“ mit und sofort bei jeder Änderung (`POST /v1/room {share:{position, scans}}`, Mod-Feature `roomshare`). Die Mod speichert sie in `raum.json` (`teilen.position`, `teilen.aufnahmen`). Ohne Eintrag (ältere `raum.json`) bleibt beides an wie bisher.

- Position aus: Die Mod sendet keine Position mehr und ersetzt die letzte im Raum durch eine leere (`pos: {}`), der Raum lässt sie dann weg. „Gerade da“ zeigt den Spieler ohne Koordinaten.
- Aufnahmen aus: Eine Anfrage aus dem Team wird abgelehnt und im Chat gemeldet. `/bauplaner team aufnahme` des Spielers selbst geht weiter.
- Mods vor `roomshare` teilen beides immer; der Team-Reiter sagt das.

## Server-Webkarten

Webkarten können über den Team-Raum von anderen eingetragen werden. Der Planer öffnet oder bettet eine Karte erst ein, wenn ihre Domain in diesem Browser freigegeben ist (`views/map/mapHosts.ts`, `bauplaner.webkarten.freigegeben`). Eine selbst eingefügte Adresse gilt als freigegeben. Vorher zeigt `MapLink` die Domain mit Warnung (IP-Adresse und Koordinaten gehen an den Betreiber, `http` unverschlüsselt). Eingebettet wird mit `sandbox="allow-scripts allow-same-origin"`, `allow=""` und `referrerpolicy="no-referrer"`: keine Pop-ups, keine Formulare, keine Gerätefunktionen. Freigaben lassen sich auf `#/datenschutz` entfernen.

## Einladungen

Bis zum Paket Team-Identitäten gibt es einen Einladungsschlüssel für alle; „Einladung erneuern“ sperrt alle alten Links auf einmal. Der Hinweis am Link sagt, dass er für jeden gilt, der ihn bekommt. Einzeln widerrufbare persönliche Schlüssel baut das Team-Identitäten-Paket im Worker; die Liste im Team-Reiter folgt darauf (PRIV-01-S05).

## Speicherstatus

- Am Projekt steht „In diesem Browser gespeichert“ (bzw. „nur in dieser Sitzung“) und daneben der Zeitpunkt der letzten Sicherungsdatei („Sicherungsdatei vom …“, „seit Sicherungsdatei vom … geändert“, „noch keine Sicherungsdatei“).
- `StorageWarning` am Projekt: Browser darf löschen (`persisted === false`), Speicher zu 80 % voll oder nur Sitzungsspeicher. Mit „Dauerhaft speichern anfragen“ (`navigator.storage.persist`); die schwächste Stufe lässt sich für die Sitzung ausblenden.
- Beim Anlegen eines Projekts fragt der Planer einmal selbst nach dauerhaftem Speicher (Klick des Nutzers; Chrome entscheidet ohne Dialog).

## Zwei Adressen, zwei Speicher

GitHub Pages und Cloudflare Pages liefern dasselbe Programm, aber jeder Browser-Speicher gehört zu genau einer Adresse. `HostMove` in „Speicher & Sicherung“ erkennt die Adresse (`hostOf`) und führt in drei Schritten um: Gesamtsicherung herunterladen, andere Adresse öffnen, dort wiederherstellen (vorhandene Projekte bleiben, geänderte kommen als Kopie). Ist die Projektliste leer, ist der Bereich offen und fragt „Kommst du von …?“.

## Release-Datenprobe

Bei jeder Veröffentlichung laufen mit `npm run test:e2e`:

- `tests/e2e/release-data.e2e.mjs`: Offline-Start mit vorhandenem Projekt, App-Update (neue Service-Worker-Fassung) bei offenem Projekt ohne Datenverlust, Speicherwarnung, Rücksprung auf eine ältere Fassung (Daten einer neueren Datenbankversion bleiben unangetastet, klare Meldung).
- `tests/e2e/persistence.e2e.mjs`: Sicherung und Wiederherstellung in leerem Browser.
- `tests/e2e/privacy.e2e.mjs`: Fußzeile, Datenschutz-Seite, fremde Webkarte.
- Website-Rollback: [Wiederherstellungsprobe](../../operations/PAGES_RESTORE_PROBE.md).
