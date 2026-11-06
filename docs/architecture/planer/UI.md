# Oberfläche: Bibliothek als Katalog (B11)

Stand 28.10.2026. Ziel: Bauplaner und Bibliothek so bedienbar und ansehnlich wie gängige Schematic-Sammlungen (z. B. shulkr.com, Planet Minecraft, Litematica-Sammlungen). Von dort übernommen ist nur das **Muster** – Kartenraster mit Vorschaubild, Kategorieleiste, Filterspalte mit aktiven Filterchips, Detailseite mit großem Bild, Kennzahlen und ähnlichen Einträgen. Keine fremden Inhalte, Bilder oder Schematics.

Seit B12: Schem-Ansicht, Bauversionen, teilbare Suche und Stöbern – siehe [SCHEM_VIEWS](SCHEM_VIEWS.md).

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

Zusätzliches Stylesheet `apps/web/src/styles/catalog.css` nach `style.css`: Farbtokens (`--panel`, `--line-2`, `--gold` …), größere Grundschriftgrade (vorher 8–11 px, jetzt 11–15 px), Karten mit Hover-Anhebung, `prefers-reduced-motion` respektiert. Mobil (≤ 900 px) Filter hinter einem Schalter, ≤ 560 px zwei Karten je Zeile; die Hauptnavigation zeigt dort Projekte, Bibliothek, Betrachter.

## Prüfung

`tests/e2e/catalog.e2e.mjs` (1400 px und 390 px): Vorschaubild als PNG-Daten vorhanden, Seiten zu 48, Kategorieleiste, Filterchips, Merkliste, Vergleich hinzufügen/entfernen, Varianten über Bildlinks, Detailseite mit Steckbrief, Ensembles, „Neues Projekt damit starten“, Vorschläge und Übernahme ins Projekt. Übrige Browserprüfungen auf die Detailseite umgestellt.

## Stabilisierung S2 · 31.10.2026

Merkliste, Vergleich und Blickrichtung behalten fehlgeschlagene Schreibvorgänge in einem gemeinsamen Speicher der laufenden Seite. Damit bleiben sie bei Navigation und zwischen mehreren Komponenten erhalten, auch wenn localStorage gesperrt oder voll ist. Ohne erfolgreichen Browser-Schreibvorgang endet diese Garantie beim Neuladen. Echte Storage-Ereignisse anderer Tabs (auch Löschen und Leeren) ersetzen den lokalen Fallback. Listen werden beim Lesen bereinigt und begrenzt; schnelle Änderungen lesen den aktuellen gemeinsamen Stand. Regressionen: `tests/unit/web/preferences.test.mjs`.

## App-Hülle, Navigation und Handy (UI-02)

Stand 01.11.2026. Ergänzt B11 und die Themen aus UI-01; nutzt ausschließlich deren semantische Tokens (`--text`, `--muted`, `--mint`, `--panel*`, `--line`), daher gelten alle fünf Themen hell und dunkel.

- **Navigationsliste** `apps/web/src/app/nav.ts`: Kopfzeile, untere Handyleiste und Schnellsuche lesen dieselben Einträge. Ein neuer Hauptbereich hängt genau einen Eintrag an (Label, Ziel, Symbol, zugehörige Routen, Kurzbeschreibung).
- **Hülle** `app/Shell.tsx`: klebende, kompakte Kopfzeile (Marke, Navigation mit Symbolen, Suchfeld, GitHub, Darstellung, Versionshinweis), Fußzeile mit Systemcheck; Titel des Browser-Tabs je Seite (`Seite · LMNT Build Studio`, Projekte mit Name und Bereich). Symbole in `app/icons.tsx` (eigene Linien-SVGs, `currentColor`, immer `aria-hidden`).
- **Schnellsuche** `app/CommandPalette.tsx`: Strg+K / ⌘K oder Suchfeld. Springt zu Seiten, Bereichen des offenen Projekts, Projekten (zuletzt geändert zuerst) und Bibliotheksgebäuden; Suche ohne Groß-/Kleinschreibung, Akzente und ß. Rein lokal, verändert nichts. Rollen: `dialog` „Schnellsuche“, `combobox`, `listbox`/`option`.
- **Projektkopf** (`ProjectView.tsx`): Pfad „Projekte › Name“, Speicherstatus als Punktmarke, Bereichsleiste mit Symbolen; am Handy waagerecht scrollbar, der aktive Bereich wird in die Mitte gerückt.
- **Handy (≤ 760 px)**: Hauptnavigation als feste untere Leiste (Projekte, Bibliothek, Betrachter, Weltkarte, Suchen; Safe-Area beachtet), Kopfzeile nur mit Marke, Suche und Darstellung. Im Editor steht die 3D-Ansicht vor den Listen; Vergleichsleiste der Bibliothek und Abhakleiste beim Bauen sitzen über der unteren Leiste. Baustellenkacheln und -spalten schrumpfen statt die Seite zu verbreitern.
- **Editor (Desktop)**: Die 3D-Fläche hat eine feste, fenster­hohe Höhe und bleibt beim Scrollen langer Instanz-/Bauteillisten unter der Kopfzeile stehen (`overflow: clip` am Editorraster); vorher streckten lange Listen sie über den Bildschirm hinaus.
- **Blockdarstellung (VIEW-02)**: Der Texturschalter sitzt als gleich hohes Element in der Kopfzeile; der Dialog bleibt unverändert.
- **Lesbarkeit**: keine Schrift unter 11 px mehr (ältere 7–10-px-Angaben in `style.css` mechanisch auf 11–12 px angehoben). Graue Literalfarben älterer Abschnitte werden in hellen Themen auf `--muted` umgelenkt; Bedienelemente und dunkle 3D-Bühnen bleiben ausgenommen.

E2E-Selektoren: `navigation` „Hauptnavigation“ (Desktop) bzw. „Hauptnavigation mobil“ (Handy) sind nie gleichzeitig sichtbar; „Projektbereiche“, `.save-state`, `.theme-control` und alle Bereichsnamen sind unverändert. Prüfung: `tests/e2e/shell.e2e.mjs` (1400 px; 390 px dunkel und hell).

## Anleitung „Wie geh ich es an?“ (GUIDE-01)

Seite `#/anleitung[?weg=<id>&schritt=<n>]`, Hauptnavigation „Anleitung“ (unter 1600 px nur das ?-Symbol, Name bleibt als Tooltip und für Screenreader), Schnellsuche, Knopf „? Wie geh ich es an?“ in der Projektzentrale und Link oben auf `#/mod`.

- **Daten:** `apps/web/src/views/guide/guideSteps.ts`, reine Daten ohne React. Ein Weg = ein Ziel des Spielers („Ich will …“), ein Schritt = Titel (≤ 4 Wörter), **ein** kurzer Satz (≤ 110 Zeichen), Szene (`planer`/`spiel`/`launcher`), Symbol, optional Tastenkappe, Ziel. Knopf- und Reiternamen stehen in „…“ genau wie im Planer. Dateiwege sind nie Hauptweg (Regel „nur Internet“); der Einheitstest prüft das.
- **Ziele:** `route` (feste Seite), `project` (Reiter im zuletzt geänderten oder oben gewählten Projekt; ohne Projekt zur Projektzentrale mit Hinweis), `library`, `map`, `path` (Voraussetzung, wechselt den Weg ohne Seitenwechsel), `game` (nur im Spiel, kein Link).
- **Grafik:** `GuideArt.tsx` zeichnet je Szene ein kleines SVG mit Theme-Tokens (Planer-Fenster, Spielwelt mit pulsierenden Geisterblöcken, Launcher mit Startknopf) plus Symbol aus `icons.tsx` (`iconPath`). Bewegung nur ohne `prefers-reduced-motion`.
- **Fortschritt:** Haken „erledigt“ in `localStorage` (`bauplaner.anleitung.erledigt`), nur Komfort, nicht in Sicherungen. Der erste offene Schritt ist markiert (`aria-current=step`).
- **Neuer Schritt:** Eintrag in `GUIDE_PATHS` anhängen; neuer Weg zusätzlich in `GUIDE_ORDER`. Tests: `tests/unit/web/guide.test.mjs`, `tests/e2e/anleitung.e2e.mjs`, Testfälle START-08/09.
