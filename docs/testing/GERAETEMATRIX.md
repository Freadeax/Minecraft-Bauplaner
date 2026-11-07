# Geräte- und Browsermatrix (QA-02)

Stand: 03.11.2026. Diese Matrix legt fest, **auf welchen echten Geräten** der Planer geprüft wird und **welche Aufgaben** dort jeweils laufen. Die Aufgaben stehen als Bereich „Geräte und Browser“ (GERAET-01 … GERAET-06) im [Testplan](TESTPLAN.md) und auf der Seite `#/testphase`; dort lässt sich das Ergebnis je Gerät abhaken und als Protokoll kopieren.

## Regel

- Eine verkleinerte Desktop-Ansicht, die Geräteemulation von Playwright oder der Entwicklertools ist **keine Geräteprüfung**. Sie zählt in der Matrix als „simuliert“ und nie als „bestanden“.
- Eine Zelle gilt erst als geprüft, wenn ein Mensch die Aufgabe auf genau diesem Gerät und Browser gemacht und das Protokoll (mit Gerät, Browser, System, Build) gemeldet hat.
- Ein Befund verweist auf Gerät + Browser + Aufgabe, z. B. „Pixel 8 · Chrome 141 · GERAET-04“.

## Geräte

| Kürzel | Gerät / System | Browser | Warum | Pflicht |
| --- | --- | --- | --- | --- |
| W-C | Windows-PC (Philipps Rechner) | Chrome oder Edge (aktuell) | Hauptgerät, Mod-Anbindung über 127.0.0.1 | ja |
| W-F | Windows-PC | Firefox (aktuell) | andere Engine, eigene IndexedDB- und WebGL-Umsetzung | ja |
| M-S | Mac | Safari (aktuell) | WebKit auf dem Desktop | wenn vorhanden |
| A-C | Android-Handy | Chrome | Touch, kleine Breite, Dateiauswahl aus „Downloads“ | ja |
| I-S | iPhone | Safari | WebKit mobil, strengste Speicher- und Dateiregeln | wenn vorhanden |
| T | Tablet (iPad oder Android) | Safari bzw. Chrome | Touch bei großer Fläche, Querformat | wenn vorhanden |

## Aufgaben je Gerät

| Aufgabe | W-C | W-F | M-S | A-C | I-S | T |
| --- | --- | --- | --- | --- | --- | --- |
| GERAET-01 Gerät festhalten | offen | offen | offen | offen | offen | offen |
| GERAET-02 Datei öffnen (.schem/.litematic) | offen | offen | offen | offen | offen | offen |
| GERAET-03 Daten bleiben gespeichert (IndexedDB) | offen | offen | offen | offen | offen | offen |
| GERAET-04 Bedienen mit dem Finger | – | – | – | offen | offen | offen |
| GERAET-05 Farbschema des Geräts | offen | offen | offen | offen | offen | offen |
| GERAET-06 Ebenen und Druck | offen | offen | offen | offen | offen | offen |

„–“ = auf diesem Gerät nicht sinnvoll (keine Toucheingabe). Werte: offen · bestanden (Datum, Build) · Befund (Link zum Bericht).

## Was im Container läuft (simuliert, kein Ersatz)

Die Browsertests (`npm run test:e2e`) laufen in Headless-Chromium mit Software-WebGL, auch mit Handybreite (390 × 844) und Touch-Emulation. Sie sichern Abläufe und Layout ab (kein seitliches Scrollen, Knöpfe erreichbar), sagen aber nichts über Safari/WebKit, Firefox, echte GPUs, Dateiauswahl des Systems, Speicherlöschung des Browsers oder Fingerbedienung. Diese Zellen bleiben deshalb „offen“, bis jemand auf dem Gerät testet.

## Firefox und WebKit im Container (Block 5, 06.11.2026)

Neben Chromium laufen die Browsertests auch in **Firefox** und **WebKit** (die Engine von Safari auf Mac, iPad und iPhone). Das ist näher an Safari als die Chromium-Emulation, ersetzt aber weiterhin kein echtes Gerät (keine echte GPU, kein iOS-Speicherverhalten, keine Systemdateiauswahl).

- Einmalig: `npx playwright install firefox webkit` und `npx playwright install-deps firefox webkit`.
- `npm run test:e2e:webkit -- tests/e2e/shell.e2e.mjs` bzw. `npm run test:e2e:firefox -- --part 1/6` (Teilläufe, weil WebKit deutlich langsamer ist).
- Die Tests bleiben unverändert: `tests/e2e/engine-hook.mjs` leitet `chromium.launch()` auf die gewählte Engine um (`BAUPLANER_ENGINE`). Firefox hat ohne Anzeige kein WebGL und läuft deshalb automatisch unter `xvfb-run` (llvmpipe).
- Tests, die Chromium-eigene Schnittstellen (CDP) brauchen, gelten in Firefox/WebKit nicht als Befund.
- Grafik (06.11.2026): Betrachter, Licht, Biome, Leuchtfeuer, große Szenen, Texturen und Hintergrund-Worker laufen in WebKit und Firefox grün; dabei zwei Safari-Fehler behoben (Speicherwachstum der Bibliothek durch Unschärfe-Ebenen, Speichern im Privatfenster). Der Spielbildabgleich (`scripts/checks/compare_game_shot.mjs`) zeigt in allen drei Engines dasselbe Bild wie Minecraft 26.3. Echte GPU und echtes iPad bleiben „offen“.
- Fingerbedienung mit Geräteprofilen (iPad Pro 11, iPhone 15): `npm run test:e2e:webkit -- tests/e2e/touch-devices.e2e.mjs` – Werkstatt und Weltkarte mit Tippen, Ziehen, Zwei-Finger-Zoom und Langdruck-Menü. Ziehen, Langdruck und zwei Finger sind künstliche touch-Zeiger; die Zelle „T“/„I-S“ bleibt trotzdem offen, bis jemand am echten Gerät prüft.

## Ablauf für Tester

1. `#/testphase` auf dem Gerät öffnen, beim Namen das Gerät dazuschreiben.
2. Bereich „Geräte und Browser“ durchgehen, jede Aufgabe abhaken oder als Fehler markieren.
3. „Protokoll kopieren“ und an Philipp oder in ein GitHub-Issue geben; Fehler über „Fehler melden“ mit Diagnose.
4. Claude trägt das Ergebnis in diese Matrix ein (Datum, Build, Befund).
