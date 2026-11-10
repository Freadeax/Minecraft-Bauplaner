# Oberfläche: Bibliothek als Katalog (B11)

Stand 28.10.2026. Ziel: Build Studio und Bibliothek so bedienbar und ansehnlich wie gängige Schematic-Sammlungen (z. B. shulkr.com, Planet Minecraft, Litematica-Sammlungen). Von dort übernommen ist nur das **Muster** – Kartenraster mit Vorschaubild, Kategorieleiste, Filterspalte mit aktiven Filterchips, Detailseite mit großem Bild, Kennzahlen und ähnlichen Einträgen. Keine fremden Inhalte, Bilder oder Schematics.

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
- **Hülle** `app/Shell.tsx`: klebende, kompakte Kopfzeile (Marke, Navigation, Suchfeld, Darstellung), Fußzeile mit Werkzeugen, Systemcheck, GitHub und Versionshinweis (seit UI-04); Titel des Browser-Tabs je Seite (`Seite · LMNT — Build Studio`, Projekte mit Name und Bereich). Symbole in `app/icons.tsx` (eigene Linien-SVGs, `currentColor`, immer `aria-hidden`).
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

## Einfache Bedienung (UX-01) · 06.11.2026

Philipp: „Komplexität … also die Nutzerbedienung nicht das System dahinter vereinfachen“. Regeln für neue Oberflächen:

- **Vier Hauptbereiche** in `app/nav.ts` (`mainNav`): Projekte, Bibliothek, Weltkarte, Spiel. Datei-Wege (Betrachter, Weltimport aus Regionsdateien) stehen in `fileTools` und erscheinen nur in Fußzeile und Schnellsuche (Regel „nur Internet“). Ein neuer Hauptbereich braucht einen guten Grund; Unterseiten gehören in einen bestehenden Bereich.
- **Projektreiter** (`views/project/tabNames.ts`): seit UX-02 in drei Hauptansichten (siehe unten); jeder Reiter hat `group`, einen Kurzsatz `hint` (unter der Leiste, `.tab-hint`, und in der Schnellsuche) und `related`. Ids, Beschriftungen und Routen bleiben stabil. Neuer Reiter = Eintrag mit Ansicht, Satz und passenden Kurzlinks.
- **Bibliothek**: Unterseiten in drei Gruppen „Finden“, „Nach Maß“, „Größer planen“ (`.lib-tab-group`); der Datei-Import ist kein Hauptknopf mehr.
- **Eingeklappt mit `<More title hint>`** (`app/More.tsx`): Experten-Optionen, Hintergrundwissen und Datei-Notfallwege. Jede Seite zeigt zuerst ihre Hauptaktion. Bisher: Speicher & Sicherung (öffnet sich selbst, wenn eine Sicherung fällig ist), ausführliche Mod-Anleitung und „Mehr wissen“ auf der Mod-Seite, „Mehr zu Mod und Server“ im Team, „Schritt für Schritt“ bei der Spielverbindung der Weltkarte; Werkstatt „Kreativ-Werkzeuge“ (Schablonen, Natur, Farben, Bild); Baustelle „Abschnittsstände“ und „Freiraum an Anschlüssen“ (öffnen sich bei vorhandenen Ständen bzw. verbautem Freiraum); Produktion „Zeitbudget und Server“ und „Öfen, Lager, AFK-Platz und Produktionsblatt“. E2E öffnen sie mit `locator('details.<klasse>').evaluate(d => { d.open = true; })`.
- **Kurze Einstiege**: Mod-Seite „So geht's in drei Schritten“, Team gründen in drei Schritten.
- Optik (Farben, Abstände, Animation) gehört dem Design-System; diese Klassen nutzen nur Theme-Tokens.

Prüfung: `tests/e2e/simple-ui.e2e.mjs` (1400 und 390 px), `tests/e2e/shell.e2e.mjs`; Testphase START-10..13.
## Einstiege, Projektansichten und Arbeitsfläche (UX-02) · 07.11.2026

Aus Philipps Check vom 07.11.: „ein durchgängiger Weg vom Entwurf bis zum nächsten Block im Spiel“. Baut auf UX-01 (Struktur) und UI-03 (Optik) auf.

- **Startseite: drei Einstiege** (`views/ProjectsView.tsx`, `styles/start.css`): „Projekt fortsetzen“ (letztes Projekt im zuletzt benutzten Reiter, `lastTab()`), „Bauwerk auswählen“ (Bibliothek, Ensembles, Generatoren) und „Datei ansehen oder importieren“ (Betrachter, `#/bibliothek?import=1` fokussiert den Importknopf, Sicherung zurückholen, Teampaket). Der Datei-Import heißt nicht mehr Notfallweg.
- **Geführte Tour** (`views/project/Tour.tsx`): „Geführte Tour mit der Burgmauer“ legt das Beispiel an und führt in acht Schritten durch Editor, 3D-Bild, Inspektor, Konflikte, Bauen, Material, Übersicht und Verwalten. Nicht modal (`role=dialog`, `aria-modal=false`), hebt das Ziel mit `.tour-spot` hervor, Schritt in `localStorage` (`bauplaner.tour.v1`), Esc oder „Tour beenden“ schließt. Neue Schritte: `TOUR_STEPS` mit Reiter, Ziel-Selektoren (erster vorhandener gewinnt) und einem Satz.
- **Drei Hauptansichten** (`tabNames.ts`): Entwerfen (Editor, Blöcke, Gelände, Landschaft) → Bauen (Bauen, Material, Baustelle, Produktion) → Verwalten (Übersicht, Planung, Team, Export, Updates). Die aktive Ansicht zeigt ihre Reiter mit Namen; die beiden anderen nur Symbole (`.tab-label` bleibt für Screenreader und als Tooltip). Der Schalter einer Ansicht (`button.view-switch`, kein Link, damit Reiternamen eindeutig bleiben) öffnet den dort zuletzt benutzten Reiter (`groupEntry()`). `related` je Reiter erzeugt „Passt dazu“-Kurzlinks unter der Leiste (z. B. Editor → Gelände, Material, Export); sie wiederholen nur Reiter der Leiste und sind daher für Screenreader und Tab-Taste ausgeblendet (`aria-hidden`), die Leiste bleibt der zugängliche Weg. Am Handy steht jede Ansicht in eigener Zeile, nichts scrollt seitlich.
- **Projektübersicht** (`views/project/OverviewTab.tsx`, Reiter `uebersicht`): letzter Arbeitsstand mit „Weiter im Reiter …“, alles Offene (Speicherproblem, nicht berechenbar, Voxelkonflikte, prüfbedürftige Schritte, Team-Hinweise, Exportsperren) mit Link zum passenden Reiter, nächster Bauabschnitt mit Fortschritt und Packliste, nächster Meilenstein. Liest nur die vorhandene Projektberechnung.
- **Arbeitsfläche** (`app/workspaceLayout.tsx`, Editor und Blockwerkstatt): Seitenleisten einklappbar (merkt sich der Browser je Fläche), Vollbild (Fullscreen-API, ohne sie per CSS `[data-max]`; Esc beendet), im Editor „2D“ als Schichtplan (`viewer/PlanView2D.tsx`: ohne WebGL, Pfeile/Bild↑↓/Eingabe, Ansage per `aria-live`).
- **Inspektor** (`InspectorSection.tsx`): Bauteil, Koordinaten, Ausrichtung und Anschlüsse als zuklappbare Abschnitte untereinander; Angeklicktes (Block, Entity, Gruppe) darüber.
- **3D-Werkzeuge** (`viewer/viewTools.ts`, Prop `sectionTools`): freier Schnitt entlang X/Y/Z mit Schieber und Seitenwechsel (C), Geistermodus (G) zeigt Weggeschnittenes und – mit `xrayFor`, im Editor alle nicht gewählten Bauteile – verdeckende Blöcke als blasse Kästen (`SceneController.setXray`, höchstens 60 000). Mit `cameraKey` merkt „Kameras“ bis zu zwölf Ansichten je Projekt (`bauplaner.kameras.v1`, `SceneController.getPose`). Aktiv in Editor, Blockwerkstatt und Betrachter.
- **Ersatzansicht ohne WebGL**: Hinweis unten links statt über der Werkzeugleiste, mit „Was tun?“. Schnitt funktioniert dort auch.
- **Hilfe am Fehler** (`app/FixHelp.tsx`, Texte in `app/fixHelpText.ts`): „Was tun?“ an Speicherfehler, Berechnungsfehler, Konflikten (Bericht und Inspektor), prüfbedürftigen Schritten und fehlendem WebGL, mit Link in die Anleitung, wo es einen passenden Schritt gibt.

Prüfung: `tests/e2e/workspace.e2e.mjs` (Tour, Übersicht, Arbeitsfläche, Ersatzansicht, Handy 390 px), `tests/e2e/simple-ui.e2e.mjs`, `tests/unit/web/view-tools.test.mjs`; Testphase START-10, START-11, GERAET-04.

## Name (NAME-01)

Stand 06.11.2026. Das Produkt heißt **LMNT — Build Studio** (mit Geviertstrich), die Mod **LMNT — Build Studio Bridge**. Im Fließtext genügt „Build Studio“ („das Build Studio“, „des Build Studios“), zusammengesetzt „Build-Studio-Mod“ und „Build-Studio-Plugin“; Chat-Vorsatz der Mod und des Plugins ist `[Build Studio]`. Technische Kennungen bleiben bewusst beim alten Wort, damit Welten, Pläne, Einstellungen und Links weiterlaufen: Repo und Pages-Pfad `LMNT — Build Studio`, Modrinth-Slug `bauplaner-bridge`, Mod-ID `bauplaner_bridge`, Befehle `/bauplaner` und `/buildplanner`, Ordner `plugins/BauplanerBridge` und `<Instanz>/bauplaner/`, NBT-Feld `Metadata.Bauplaner`, Header `X-Bauplaner-*` und Formatkennungen `bauplaner-*`.

## Design-System (UI-03)

Stand 06.11.2026. Eine gemeinsame Gestaltungsschicht für alle Seiten des Planers: `apps/web/src/theme/design.css`, geladen als letzte Datei in `main.tsx`. Sie ändert nur die Optik, kein Markup und keine Abläufe (Struktur und Bedienwege liegen bei „Bedienung vereinfachen“, die Mod gleicht sich über die Werte unten an).

**Thema „Werkbank“ (Standard bis UI-04, seitdem wählbar; Standard ist „LMNT“, siehe unten).** Minecraft-nah, aber ruhig: Grasgrün auf Tiefenschiefer (dunkel) bzw. auf Birkenholz-Hell (hell), Gold als Zweitfarbe. Die fünf bisherigen Themen bleiben wählbar. Werte in `theme/themeTokens.mjs` (jede Palette hat jetzt `accent2`); der Kontrast Text/Akzent/Knopf ≥ 4,5 : 1 ist in `tests/unit/web/theme-tokens.test.mjs` für alle Themen hell und dunkel festgeschrieben. Das Thema wird schon beim Laden des Moduls gesetzt (kein Aufblitzen) und färbt die Browserleiste (`meta theme-color`).

| Farbe | Dunkel | Hell | Verwendung |
|---|---|---|---|
| `accent` | `#7fd494` | `#2d6c3c` | Hauptknöpfe, aktive Reiter, Links, Fokus |
| `accent2` | `#e9c46a` | `#8a5a00` | Gold: kleine Akzente, Grasnarbe unter der Kopfzeile |
| `surface` | `#1a2220` | `#ffffff` | Karten, Flächen |
| `canvas` | `#111715` | `#f1efe7` | Seitenhintergrund |
| `text` | `#edf3ee` | `#1c2621` | Schrift |
| Zustände | Erfolg `#7fd494`, Warnung `#f0b45a`, Fehler `#ff8a7a` | `#2d6c3c`, `#8a5200`, `#b3261e` | `--ds-success/-warning/-danger` |

**Tokens** (`--ds-*`): Abstände 4/8/12/16/24/32/48 px (`--ds-space-1..7`), Radien 4/6/10/14/20 px (`--ds-r-xs..xl`), Schrift 12/13/14/16/20/26 px, Bedienhöhe `--ds-control-h` 40 px (44 px bei Fingerbedienung, `pointer: coarse`), Schatten `--ds-shadow-1..3`, Bewegung 120/180/240 ms mit `--ds-ease`. Neue Ansichts-CSS nutzt diese Tokens statt fester Werte.

**Bausteine.** `.primary` (Akzentverlauf mit dunkler Unterkante wie ein Block), `.secondary`, `button.danger`, `.button-link`, `.file-button`: gleiche Höhe, Rundung, Schrift; heben sich beim Zeigen 1 px und drücken sich beim Klicken ein. Felder und Auswahllisten: gleiche Höhe, eigener Pfeil, Fokusring in Akzentfarbe; in Tabellen kompakt. Karten (`.card`, `.system-card`, `.team-block`, `.site-block`, `.workspace` …) mit Radius 14 px und weichem Schatten; Projekt- und Bibliothekskarten heben sich beim Zeigen. Hinweise (`.notice`, `.info-box`) mit farbiger linker Kante je Zustand (`.warning`, `.error`, `.ok`). Chips/Abzeichen als Pillen, `.seg` als Segmentschalter mit erhabenem gewähltem Feld. Der aktive Projektreiter trägt einen Akzentstrich; die vier Schrittgruppen aus UX-01 bekommen eine leuchtende Schrittnummer, ältere ungruppierte Reiterleisten stehen in einer wischbaren Zeile. Überzeilen (`.eyebrow`) tragen einen kleinen „Block“ davor.

**Darstellungsmenü.** Farbfelder je Thema (`radiogroup` „Oberflächenthema“, Knöpfe `data-theme-id`) und Segmentschalter „Wie Gerät / Hell / Dunkel“ (`radiogroup` „Erscheinungsbild“, `data-mode`) ersetzen die beiden Auswahllisten.

**Bewegung.** Seiten blenden 240 ms ein, Kopfbereiche und Kartenraster steigen leicht gestaffelt auf, Menüs und Dialoge öffnen mit kurzem Zoom, Aufklapper blenden ein. Animationen laufen nur „rückwärts gefüllt“, danach bleibt kein `transform` (fixe Leisten bleiben am Bildschirm). Bei „Bewegung reduzieren“ ist alles aus.

**Regeln für neue Stile.** Selektoren der Schicht beginnen mit `:root[data-theme]`, damit sie gegen später geladene Ansichts-CSS gewinnen (ohne `!important`). 3D-Bühnen (`.viewport`, `.detail-stage`, Vorschaubilder) bleiben bewusst dunkel. Hover-Effekte nur unter `@media (hover: hover)`, damit das iPad keine hängenden Zustände zeigt.

Prüfung: `tests/e2e/design.e2e.mjs` – Standardthema beim ersten Bild, WCAG-Kontrast aller sichtbaren Texte auf Projektzentrale, Anleitung, Bibliothek, Generatoren, Weltkarte, Spiel, Systemcheck und den Reitern Editor/Bauen/Material/Baustelle/Team (hell und dunkel), iPad Pro 11 (Ziele ≥ 44 px, alle Reiter in der Leiste, keine Querverschiebung), „Bewegung reduzieren“. Testphase: START-20, START-21.


## LMNT-Auftritt (UI-04)

Stand 10.11.2026. Das Build Studio sieht aus und bewegt sich wie die LMNT-Website (lmnt-gaming.net): tiefes Schwarz, LMNT-Rot, breite Überschriften, runde Knöpfe, eine große Bühne auf der Startseite. Die Schicht liegt in `apps/web/src/theme/brand.css` (nach `design.css` geladen) und `apps/web/src/app/motion.ts`. Die Tokens und Regeln aus UI-03 gelten weiter; diese Schicht überschreibt nur Werte und ergänzt Bausteine.

**Thema „LMNT“ (Standard).** Die sechs älteren Themen bleiben wählbar. Der Speicherschlüssel der Darstellung heißt `lmnt:appearance:v2`, damit jedes Gerät den neuen Auftritt einmal bekommt.

| Farbe | Dunkel | Hell | Verwendung |
|---|---|---|---|
| `accent` | `#ff3131` | `#c20d1f` | Links, aktive Navigation, Zahlen, Linien |
| `accent2` | `#f2efe8` | `#08070c` | gewählte Reiter und Segmente (umgekehrte Fläche) |
| `surface` | `#111018` | `#fffdf8` | Karten |
| `canvas` | `#08070c` | `#f2efe8` | Seitenhintergrund mit feinem Raster |
| `text` | `#fffdf8` | `#08070c` | Schrift |
| Füllfarbe | `#e10f22` mit Weiß | gleich | `--ds-fill` / `--ds-on-fill` für Hauptknöpfe, Laufband, Abschlusskarte |

**Füllregel.** Weiß auf `#ff3131` reicht für Text nicht (3,6 : 1). Flächen mit weißer Schrift nutzen deshalb immer `--ds-fill` (4,9 : 1). „In Ordnung“ bleibt grün (`--ds-success`), auch wenn ältere Regeln dafür die Akzentfarbe nahmen.

**Schrift.** Überschriften in Archivo Black (`--ds-display`), Text in DM Sans (`--ds-font`). Beide Dateien liegen im Paket (`theme/fonts/`, SIL Open Font License, Lizenztexte daneben und in den Drittanbieterhinweisen); es wird nichts von fremden Servern geladen.

**Bausteine.** Kopfzeile durchsichtig, beim Scrollen mit Hintergrund (`html[data-scrolled]`), Textnavigation mit Unterstrich, Knöpfe als Pillen. Abschnittsköpfe `.section-head` mit Zähler („01 / EINSTIEG“). Startseite: Bühne `.home-hero` mit `.hero-copy` und `.hero-visual` (Kugel, zwei Umlaufbahnen, schwebende Gebäudekacheln, Etiketten), Laufband `.ticker`, drei große Einstiegskarten, Abschlusskarte `.join-card` zur Mod, Fußzeile als Raster. Die Bühne steht immer, auch wenn schon Projekte da sind. 3D-Bühnen und ihre Leisten sind im Thema LMNT tintenschwarz statt blaugrün; die Blöcke selbst bleiben unverändert.

**Bewegung: kräftig außen, ruhig im Editor.**
- Einblenden beim Scrollen: Element bekommt `data-reveal` (optional `--reveal-i` für die Staffelung). `motion.ts` setzt `data-revealed`, sobald es ins Bild kommt. Versteckt wird nur unter `html[data-motion=on]`; ohne Skript steht alles sofort da.
- Dauerbewegung (Umlaufbahnen, Schweben, Laufband, Kippen zum Zeiger, Hochzählen der Kennzahlen) gibt es nur auf der Startseite.
- Seitenwechsel: rote Linie `.route-sweep` unter der Kopfzeile; Kopfbereiche und Kartenraster steigen gestaffelt auf.
- Im Projekt (Editor, Reiter, Werkzeuge) bleibt es bei den kurzen Übergängen aus UI-03.
- Weiterhin gilt: Animationen nur „rückwärts gefüllt“, Hover nur unter `@media (hover: hover)`, kein `backdrop-filter` auf vielen Elementen (nur die Kopfzeile). Bei „Bewegung reduzieren“ setzt `motion.ts` kein `data-motion`, Laufband, Linie und Umlaufbahnen stehen still.

Prüfung: `tests/e2e/design.e2e.mjs` – Standardthema LMNT beim ersten Bild, Schriften aus dem Paket, Bühne mit und ohne Projekte, Einblenden beim Scrollen, Seitenwechsel-Linie, „Bewegung reduzieren“, dazu die Kontrast- und iPad-Prüfungen aus UI-03 mit den neuen Farben. `tests/unit/web/theme-tokens.test.mjs` schreibt die Kontraste des Themas fest. Testphase: START-01, GERAET-04.
