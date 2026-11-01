## Problem und Ergebnis

Was löst die Änderung, und welches Verhalten entsteht?

## Zuordnung und Umfang

Anforderungs-/Roadmap-ID oder Issue; relevante Grenzen.

## Prüfung

Tatsächlich ausgeführte Prüfungen und Ergebnis. Nicht ausgeführte erforderliche Prüfungen begründen.

`npm run check` und passende Browserfälle ausführen; Ergebnis in docs/TESTING.md festhalten. Roadmap nur über docs/roadmap.json und `npm run roadmap:record` pflegen; vor Integration `npm run check:roadmap-change -- <vorheriger-main> [quellcommit]` ausführen. Keine eigenen GitHub Actions.

## Auswirkungen

Format, Kompatibilität, Migration, Rechte oder Performance; nur relevante Punkte nennen.

Main-Quellcommit und anschließenden Pages-Artefaktcommit getrennt nachweisen; Live-Manifest und Dateihashes prüfen.
