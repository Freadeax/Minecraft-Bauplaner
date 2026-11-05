# Oberflächenabnahme UI-01 und WORLD-02

Stand: 01.11.2026. Abnahme des bestehenden Pages-Builds mit Quelle `b5eb5b9bc039160e668a7183c0ccfcdcd764a933`, auf main als Artefaktcommit `6a309073872cda244a66a6b8d91452139cbdce09`. Der Abnahmeblock ändert keine Produktdateien. Neue Integration und Liveveröffentlichung werden getrennt durch den Hauptthread nachgewiesen.

## Ausgeführter Browserumfang

Die vier zusätzlichen Fälle in [ui-acceptance.e2e.mjs](../../../tests/e2e/ui-acceptance.e2e.mjs) ergänzen die vorhandenen [Themeprüfungen](../../../tests/e2e/theme.e2e.mjs), [Materialprüfungen](../../../tests/e2e/materials.e2e.mjs) und [Bauweltenprüfungen](../../../tests/e2e/build-themes.e2e.mjs). Ausgeführt unter Windows mit Node v24.18.0, exakt fixiertem Playwright 1.64.1 und dessen lokalem Headless-Chromium. Der Server liefert den gebauten Pages-Artefakt auf einem eigenen lokalen Port aus; kein externer Dienst und keine Änderung echter Benutzerprojekte.

- Materiallabor bei 1400 × 1000 und 390 × 844 Pixeln: alle fünf Oberflächenthemen Modern, Mittelalter, Industrie, Fantasy und Nether jeweils in Hell und Dunkel. Das synthetische Beispielprojekt bleibt bei 350 Bauitems, 350 platzierten Blöcken, zehn Inventarplätzen und einer Shulkerkiste. Die vollständige Itemtabelle und sämtliche Gesamtwerte bleiben bei Darstellungswechsel, Suche und Zurücksetzen identisch. Die Suche nach `cobble` zeigt genau `cobblestone`; die aufgeklappte Herkunft zeigt die zugehörigen Zellen und Bauitems.
- Bauwelten bei denselben zwei Größen: elf vorhandene Karten; Darstellung in allen fünf Themen jeweils Hell/Dunkel. Die drei neuen Karten Fernöstlicher Garten, Wüstenhandel & Oasenweg und End-Außenposten werden zusätzlich vollständig in Hell/Dunkel erfasst. Ihre echten Vorschauen sind geladen, bevor der Screenshot entsteht.
- Die drei Kataloglinks liefern 3, 6 und 2 tatsächliche Treffer. Vorschaugebäude stehen in den Ergebnissen. Nach Neuladen bleiben Filter, Variantenwahl und geordnete Treffer identisch. Der Router darf die voreingestellte Namenssortierung aus der kanonischen URL entfernen; die Abnahme prüft die semantisch identischen Ergebnisse.
- In allen Kombinationen passt die Seite horizontal in den Ausschnitt. Die 390-Pixel-Kontexte unterstützen simulierte Touchereignisse. Während der vier Fälle treten keine JavaScript-Seitenfehler auf.

Gezielter endgültiger Lauf: `node --test tests/e2e/ui-acceptance.e2e.mjs`, **4/4 bestanden**, 0 Fehler und 0 übersprungen, 25,14 Sekunden. Dieser Lauf enthält auch die zusätzlichen vollständigen Kartenaufnahmen. Gesamtprüfung und weitere Regressionen protokolliert der Hauptthread in [TESTING](../../TESTING.md).

## Visuelle Sichtprüfung

Alle 40 Ansichtsaufnahmen der Themenmatrix wurden mit dem Bildbetrachter angesehen: je zehn für Materiallabor und Bauwelten bei jeder der beiden Bildschirmgrößen. Zusätzlich wurden die acht vollständigen Wüsten-/Endkarten in Hell/Dunkel bei beiden Größen mit dem Bildbetrachter geprüft. Die Fernostkarte ist bereits in allen zwanzig Bauweltenaufnahmen vollständig sichtbar. Weitere vollständige Kartenaufnahmen sind ebenfalls lokal erzeugt.

Ergebnis: Texte, Trefferzahlen, Itemmengen, Filter und Aktionsflächen sind in den geprüften Ausschnitten lesbar. Die Materialkarten stehen auf Desktop in drei Spalten und bei 390 Pixeln untereinander; die Laborfilter bleiben erreichbar. Kartenüberschriften und Beschreibungen brechen auf schmalen Ausschnitten ohne Überlagerung um. Die Vorschauen von Schrein, Torii und Zen-Garten sowie Wüsten- und Endbauten sind sichtbar. Es wurden keine durch den Themenwechsel veränderten Bauitemmengen und keine abgeschnittenen horizontalen Seiteninhalte gefunden. Eine lange Materialliste wird auf schmalen Geräten vertikal gescrollt.

Screenshots sind ausschließlich lokale, ignorierte Prüfartefakte. Der abschließende Lauf legt sie unter `dist/ui-acceptance/` ab; der erste Sichtprüfungslauf verwendete `node_modules/.cache/ui-acceptance/`. Reproduktion mit optionalen Screenshots in PowerShell nach erfolgreichem Webbuild:

```powershell
$env:LMNT_UI_SCREENSHOTS='dist/ui-acceptance'
node --test tests/e2e/ui-acceptance.e2e.mjs
```

Ohne diese Variable laufen dieselben vier Funktionsfälle ohne Bildausgabe. Der Test schreibt keine Bilder in den auszuliefernden Webbuild.

## Abnahmegrenzen und nächste Aufgabe

UI-01-S03 und die offene Browser-Sichtprüfung von WORLD-02 sind im beschriebenen Chromiumumfang erbracht. Das ist keine Abnahme eines echten iPhones, Safari, einer Hardware-GPU oder jedes möglichen Inhalts-/Schriftgrößenzustands. Die visuelle Sichtprüfung ist eine manuelle Bewertung der tatsächlich erzeugten Aufnahmen, kein automatischer pixelgenauer Vergleich und keine vollständige Barrierefreiheitsprüfung. Vorhandene Kontrastregressionen bleiben zusätzlich relevant. Minecraft-Version, Gelände, Redstoneverhalten und Spielkompatibilität werden damit nicht bestätigt.

Nächste konkrete Aktion: die vier Fälle mit der vollständigen Browserregression fortführen; tatsächliche Geräteprüfung separat in QA-02 durchführen. Neue Produktfunktionen, weitere Gebäude oder eigene Vorlagen sind durch diese Abnahme nicht hinzugefügt.
