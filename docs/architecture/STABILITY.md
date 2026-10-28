# Stabilität und Qualitätssicherung (S1)

Stand: 28.10.2026. Ziel: Fehler früh sichtbar machen, gespeicherte Daten prüfbar halten und große Bauwerke flüssig verarbeiten, ohne Verhalten oder Datenformate zu ändern.

## S-01 · Absturzschutz und Fehlerprotokoll

- `apps/web/src/app/ErrorBoundary.tsx` umschließt jede Seite. Stürzt eine Ansicht beim Zeichnen ab, erscheint statt einer leeren Seite eine Meldung mit „Erneut versuchen“, „Seite neu laden“, „Zur Projektzentrale“, „Fehlerbericht kopieren“ und dem Link zum Systemcheck. Ein Seitenwechsel setzt den Fehlerzustand zurück, ohne gesunde Seiten neu aufzubauen (Bibliotheksfilter bleiben erhalten).
- Gespeicherte Daten sind nicht betroffen: Schreibvorgänge laufen als eine IndexedDB-Transaktion ([PERSISTENCE](PERSISTENCE.md)).
- `apps/web/src/app/errorLog.ts` sammelt Zeichenfehler, unbehandelte Fehler und abgelehnte Promises dieser Sitzung (höchstens 50, nur im Speicher). Der Fehlerbericht enthält Zeit, Build-Stand, Browserkennung, Seite und Fehlertexte, aber keine Projektdaten. Es wird nichts gesendet.

## S-02 · Datencheck

`checkIntegrity` in `packages/domain/src/integrity.ts` prüft alle gespeicherten Datensätze, nur lesend:

| Code | Stufe | Bedeutung |
|---|---|---|
| `PROJECT_RECORD` / `ASSET_RECORD` | Fehler | Datensatz verletzt den Vertrag (Schema, Instanzen, Transformationen, Verbindungen) |
| `VERSION_HASH` | Fehler | Payload-Hash oder Versions-ID passt nicht mehr zum Inhalt (Inhaltsadresse neu berechnet) |
| `MISSING_VERSION` | Fehler | Projekt oder eingefrorene Revision verwendet eine nicht gespeicherte Version |
| `ASSET_VERSION_MISSING` | Fehler | Bauteil listet eine Version, die fehlt |
| `ORIGINAL_HASH` | Fehler | Originaldatei beschädigt (nur mit „Originaldateien neu einlesen“) |
| `VERSION_WITHOUT_ASSET` / `VERSION_NOT_LISTED` | Warnung | Version ohne bzw. nicht gelistet im Bauteil |
| `ORIGINAL_MISSING` | Warnung | Originaldatei einer Version fehlt oder ist nicht lesbar |
| `REVISION_ORDER` | Warnung | Revisionsnummern nicht aufsteigend |
| `ORIGINAL_UNUSED` | Hinweis | Originaldatei ohne Verwendung |

`ok` ist wahr, solange kein Fehler vorliegt. Es wird nichts repariert oder gelöscht; die Oberfläche empfiehlt zuerst eine Gesamtsicherung.

## S-03 · Systemcheck-Seite (`#/system`)

Erreichbar über den Fußbereich und „Datencheck“ in „Speicher & Sicherung“ der Projektzentrale.

- **Auslieferung:** liest `deployment.json` (Quellstand, Bauzeit) und vergleicht auf Knopfdruck alle ausgelieferten Programm-, Stil- und HTML-Dateien per SHA-256 mit dem Manifest (`apps/web/src/app/delivery.ts`). Findet veraltete Browser-Caches und halbfertige Pages-Veröffentlichungen. Ein fremdes oder kaputtes Manifest wird abgelehnt statt als „alles gut“ gewertet.
- **Browser:** IndexedDB, WebGL, Web Worker, Web Crypto, DecompressionStream, Zwischenablage, jeweils mit Folge für die App.
- **Speicher:** Belegung, Kontingent, Dauerhaftigkeit.
- **Datencheck** (S-02) und **Fehlerprotokoll** (S-01).

## S-04 · Leistung großer Modelle

Messung mit vier Hallen 128 × 48 × 128 (605 568 Blöcke, `tests/stability.test.mjs`, Node 22, Cloud-Container):

| Schritt | vorher | nachher |
|---|---|---|
| `resolveProject` | 17,1 s | 4,3–4,9 s |
| `buildGuide` | 6,0–6,9 s | 3,4–4,2 s |
| `computeMaterials` | 2,5–2,9 s | 1,7–2,0 s |

Maßnahmen, alle ohne Änderung von Ergebnissen oder Formaten:

- **Validierung merken:** `createPayload` und neu `adoptPayload` liefern tief eingefrorene Payloads und merken sich die bestandenen Limits (WeakMap). Eine erneute Prüfung entfällt nur, wenn diese Limits mindestens so streng waren wie die angefragten. Unversiegelte Objekte (z. B. aus IndexedDB) werden immer vollständig geprüft.
- **Keine Schutzkopie selbst gebauter Payloads:** `transformPayload` und `resolveProject` bauen ihre Zellen neu und übergeben sie per `adoptPayload` (einfrieren statt kopieren). `transformPayload` kopiert weiterhin, wenn die Eingabe nicht versiegelt ist, weil Palettenzustände und NBT geteilt würden.
- **Schneller Zellpfad in `validatePayload`:** wohlgeformte Zellen werden ohne Pfadtexte geprüft, Doppelungen über einen linearen Index innerhalb der Grenzen; jede Auffälligkeit läuft durch die bisherigen Einzelprüfungen und liefert dieselbe Meldung.
- **`stateKey`** wird für eingefrorene Zustände einmal je Objekt berechnet.
- **Bauanleitung:** Phase je Palettenindex, numerischer Zellindex statt Textschlüssel für Nachbarschaften, Schritt-Wiederverwendung bei aufeinanderfolgenden Zellen, Geometriehash als direkt gebauter Text. Der Hash ist zeichengleich mit `quickHash(canonicalJson([phase, [[x, y, z, kind, stateKey|null, data|null], …]]))`; ein Test vergleicht beides, abgehakte Schritte bleiben gültig.

Budgets im Test sind großzügige Obergrenzen für langsamere Rechner (z. B. `resolveProject` < 12 s); die gemessenen Zeiten stehen im Testprotokoll.

## S-05 · Import-Vorschau im Bild

Ursache des Fehlers „Modell nach Dateiimport außerhalb des Bildes, bis Einpassen gedrückt wird“: Die 3D-Fläche der Importansicht wuchs mit dem langen Importbericht auf über 2 000 px Höhe; die Kamera zielte korrekt auf die Mitte dieser Fläche, die aber unterhalb des Fensters lag. Behebung: feste Höhe der 3D-Fläche als direktes Kind von `.detail-hero` (Import, Ensembles; Desktop `min(82vh, 820px)`, schmal `62vh`). Parallel hat B12 das Neu-Einpassen bei Größenänderung und neuer Struktur ergänzt, solange der Nutzer die Kamera nicht bewegt hat (`autoFrame`, [VIEWER](VIEWER.md)); beide zusammen halten das Modell im Bild.

## Prüfung

- `tests/integrity.test.mjs` (7), `tests/stability.test.mjs` (7): Datencheck je Befund, keine Mutation; Manifestprüfung; Routen; Großmodell mit Zeitbudgets; Geometriehash-Gleichheit; Validierungscache und gleiche Fehlermeldungen des schnellen Pfads.
- `tests/e2e/stability.e2e.mjs` (5): Importvorschau bei 1400 px und 400 px im Bild; Systemcheck ohne Befund (Auslieferung, Browser, Datencheck); absichtlich beschädigte Version und fehlende Version per IndexedDB ⇒ zwei Fehler; Fehlerprotokoll und Bericht.

## Grenzen

- Nur Chromium geprüft; Safari/iPhone weiter offen.
- Der Absturzschutz ist nicht per Browsertest mit echtem Zeichenfehler ausgelöst (es gibt keinen absichtlichen Fehlerpfad im Produkt); geprüft sind Typen, Build und das Fehlerprotokoll.
- Zeitmessungen schwanken mit der Maschine; die Budgets fangen grobe Rückschritte ab, keine kleinen.
