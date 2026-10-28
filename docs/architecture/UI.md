# Oberfläche: Bibliothek als Katalog (B11)

Stand 28.10.2026. Ziel: Bauplaner und Bibliothek so bedienbar und ansehnlich wie gängige Schematic-Sammlungen (z. B. shulkr.com, Planet Minecraft, Litematica-Sammlungen). Von dort übernommen ist nur das **Muster** – Kartenraster mit Vorschaubild, Kategorieleiste, Filterspalte mit aktiven Filterchips, Detailseite mit großem Bild, Kennzahlen und ähnlichen Einträgen. Keine fremden Inhalte, Bilder oder Schematics.

## Seiten und Routen

| Route | Inhalt |
|---|---|
| `#/` | Projektzentrale: Einstieg mit Bildmosaik aus der Bibliothek, Projektkarten mit Vorschau der aufgelösten Welt, Vorlagen (Ensembles) mit „Als Projekt anlegen“, Speicher & Sicherung |
| `#/bibliothek[/fuer/<projekt>]` | Übersicht: Kategorieleiste mit Trefferzahlen, Such-/Sortierleiste (Raster/Liste, „Überrasch mich“), Filterspalte (mobil einklappbar), aktive Filter als entfernbare Chips, Karten in Seiten zu 48 |
| `…/gebaeude/<assetId>` | Detailseite: 3D-Ansicht neben Zusammenfassung (Kennzahlkacheln, Materialbalken, Varianten mit Bild, „Ins Projekt übernehmen“ mit Zielprojekt, „Neues Projekt damit starten“, Merken, Vergleichen), Abschnittsnavigation, Steckbrief in Karten, ähnliche Gebäude als Bildkarten, „Verwalten“ (Herkunft, Versionen, Archiv, Anschlüsse, Bereich als Bauteil) |
| `…/ensembles[/<id>]` | Ensembles als Bildkarten, Detail mit 3D-Ansicht und Mitgliederliste |
| `…/vergleich/<id>,<id>,…` | bis zu vier Gebäude nebeneinander; kleinster/größter Wert je Zeile markiert, ausdrücklich ohne Wertung |

Die Bibliothek bleibt zwischen Übersicht und Unterseiten eingehängt: Suche, Filter und Scrollposition überleben „Zurück“. Ein Link für ein anderes Projekt (`fuer/<id>`) wechselt nur die Vorschläge.

## Vorschaubilder

`apps/web/src/thumbnail/iso.ts` zeichnet eine isometrische Ansicht auf ein 2D-Canvas (kein WebGL je Karte): echte Isometrie von +x/+y/+z, Malerreihenfolge nach x+y+z (für Einheitswürfel exakt), verdeckte Flächen entfallen, Seitenflächen abgedunkelt. Farben sind die genäherten Vorschaufarben aus `colors.ts`, keine Minecraft-Texturen. `Thumb.tsx` rendert erst in Sichtnähe (IntersectionObserver), ein Bild pro Leerlaufmoment, und speichert das Ergebnis für die Sitzung unter der Versions-ID (Projekte: ID + Speicherrevision). Damit ist ein Bild immer zum unveränderlichen Stand passend.

## Merkliste und Vergleich

Beides sind Ansichtseinstellungen je Browser in `localStorage` (`bauplaner.merkliste`, `bauplaner.vergleich`), keine Projektdaten und daher nicht in Sicherungen. Ohne Speicherzugriff (privater Modus) gelten sie nur für die Sitzung.

## Gestaltung

Zusätzliches Stylesheet `apps/web/src/catalog.css` nach `style.css`: Farbtokens (`--panel`, `--line-2`, `--gold` …), größere Grundschriftgrade (vorher 8–11 px, jetzt 11–15 px), Karten mit Hover-Anhebung, `prefers-reduced-motion` respektiert. Mobil (≤ 900 px) Filter hinter einem Schalter, ≤ 560 px zwei Karten je Zeile; die Hauptnavigation zeigt dort Projekte, Bibliothek, Betrachter.

## Prüfung

`tests/e2e/catalog.e2e.mjs` (1400 px und 390 px): Vorschaubild als PNG-Daten vorhanden, Seiten zu 48, Kategorieleiste, Filterchips, Merkliste, Vergleich hinzufügen/entfernen, Varianten über Bildlinks, Detailseite mit Steckbrief, Ensembles, „Neues Projekt damit starten“, Vorschläge und Übernahme ins Projekt. Übrige Browserprüfungen auf die Detailseite umgestellt.
