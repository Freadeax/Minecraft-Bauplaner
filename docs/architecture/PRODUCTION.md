# Produktion: Farmen, Deckung und Anbindung (PROD-01…05)

Stand 04.11.2026 · Thread „Produktion und Anbindung im Planer ausbauen“

Der Reiter **Produktion** (`#/projekt/<id>/produktion`) beantwortet die Frage, die der Sammelplan der Baustelle (B14, [SITE.md](SITE.md)) offen lässt: *Wie komme ich an das Material – mit welchen Farmen, wie schnell, und reicht das für den Zeitplan?*

## Grundsätze

- **Eine Bedarfsquelle.** Bedarf ist genau „Noch sammeln“ aus `planSite` (nur offene Schritte, Lager schon in Abschnitt-Reihenfolge abgezogen). Produktion zählt kein Material ein zweites Mal.
- **Annahmen sichtbar.** Farmraten in `FARM_TYPES` sind Richtwerte für einfache, verbreitete Bauweisen; jede Farmart nennt ihre Grundlage (`basis`) und Bedingungen (`needs`). Sobald für eine Farm mindestens eine Stunde gemessen ist, rechnet der Planer mit der echten Rate: zuerst aus der verknüpften **Sammeltruhe** im Team-Lager (PROD-05), sonst aus dem **Ertragsbuch**.
- **Ein Datensatz, rückgängig machbar.** Alles liegt optional in `project.site.production` (Schema 1) und läuft über `site.set`; Sicherung, Datencheck und `checkSite` prüfen es mit `checkProduction`. Ohne Produktion ändert sich nichts an älteren Projekten.

## Datensatz (`packages/domain/src/production.ts`)

| Feld | Bedeutung |
|---|---|
| `farms[]` | `type` (Farmart), `name`, `units` (Module/Zellen/Händler, 1–256), `state` (geplant · im Bau · läuft · stillgelegt), optional `instanceId` (Bauteil im Projekt), `pointId` (Punkt der Weltkarte), `at` (x/y/z + Dimension), `chest` (Lagerkiste des Teams, PROD-05), `note` |
| `log[]` | Ertragsbuch: `day`, `farmId`, `itemId`, `count`, `hours` (Lauf-/Arbeitszeit seit der letzten Ernte) |
| `gatherHoursPerDay` | Sammelzeit je Spieltag (Standard 1,5 h) |
| `afkHoursPerDay` | zusätzliche AFK-Zeit je Spieltag (Standard 0) |
| `simulationDistance` | Simulationsdistanz des Servers (Standard 10) |
| `afk` | gewählter AFK-Platz |

`logHarvest` bucht die Menge **im selben Schritt** ins Baustellen-Lager (`site.stock`); `removeHarvest` nimmt sie wieder heraus. `removeFarm` entfernt die Ernten der Farm, der Lagerbestand bleibt. `pruneSite` löst Verweise auf entfernte Bauteile.

### Farmarten

34 Arten in sechs Gruppen (Pflanzen, Tiere, Mobs, Handel & Tausch, Gestein & Flüssiges, Nether & Ende). Jede Art hat:

- `mode`: **auto** (läuft nebenbei, solange ein Spieler in Reichweite ist) oder **halb** (braucht Spielerzeit; erhöht die Handrate ihrer Items);
- `range`: **zufall** (Zufallsticks, Spieler ≤ 128 Blöcke, Chunk simuliert), **mob** (Spieler 24–128 Blöcke), **sim** (Chunk in Simulationsdistanz);
- `outputs` je Einheit und Stunde, optional `covers` (Eisenbarren ersetzen Roheisen samt Schmelzen, Holz der Baumfarm jede Holzart);
- optional `inputs` (Piglin-Tausch braucht Gold, Bibliothekar Zuckerrohr) – der Planer prüft, ob andere Farmen genug liefern;
- `buildingId` (Bauplan im Katalog; Baukosten werden daraus gezählt) oder `effortHours` (Richtwert für den Bauaufwand).

## Auswertung (`packages/domain/src/productionPlan.ts`)

`analyzeProduction({ site, overview, pace, farmCosts?, schedule? })` liefert:

1. **Farmzustand** je Farm: Raten (Richtwert/gemessen), Ertrag je Spieltag, Verbrauch gegen Angebot, Logistik (Trichterstränge bei 9 000 Items/h, „Truhe/Doppeltruhe voll nach … h“), Hinweise.
2. **Deckung je Rohstoff:** laufende automatische Farmen (Items/Tag) gegen Handarbeit (Richtwert oder halbautomatische Farm). Handarbeit ist **eine** gemeinsame Warteschlange aus Spielerstunden. Ein gieriger Ausgleich verschiebt die langsamste Farm-Position in die Handarbeit, solange das den ganzen Plan verkürzt. Engpass = was das Ende bestimmt (langsamste Farm oder größter Brocken Handarbeit).
3. **Materialbereitschaft je Abschnitt** in Spieltagen (kumulativ in Bau-Reihenfolge), verglichen mit dem Baubeginn aus `planProgram` (PROJ-01). Ein Spieltag = ein Bautag. Abschnitte, deren Material nach Baubeginn kommt, sind „zu spät“.
4. **Lohnt sich eine Farm?** je Farmart über alle Items, die sie abdeckt: gesparte Spielerzeit gegen Bauaufwand (Material des Katalog-Bauplans per Rezeptbaum und Sammel-Richtwerten + Blöcke ÷ 500/h, sonst `effortHours`), Einheiten für 7 Spieltage, Urteil *lohnt / knapp / lohnt nicht / macht planbar*. Vorschläge unter 1 h Ersparnis entfallen.
5. **Öfen und Brennstoff:** Schmelzvorgänge der fehlenden Bauitems (`SectionPlan.smelts/cookTicks` aus dem Rezeptbaum), Öfen für 1/2/4/8 h, Brennstoff je Sorte (Profil-Brennzeiten) und Brennstoff aus laufenden Farmen netto (getrockneter Seetang: (20 − 9) ÷ 9 Vorgänge je Seetang).
6. **Lager:** Plätze, Doppeltruhen, Shulkerkisten und Fahrten (Tempo `boxesPerSession`) je offenem Abschnitt; Sortier-Module für die Items aller automatischen Farmen.
7. **AFK-Platz:** Reichweitenprüfung je Farmart (`inRange`), bester Platz unter Farmen, Mittelpunkten von Paaren, Schwerpunkt je Dimension und 32 Blöcke über Mobfarmen (die meisten Farmen, dann die meisten Items/h).

## Sammeltruhen aus dem Team-Lager (PROD-05)

Farmen füllen über Trichter meist eine feste Truhe. Ist diese Truhe auf dem Server als geprüfte Lagerkiste markiert (Paper-Plugin, COOP-05, [LAGERKISTEN.md](LAGERKISTEN.md)), kennt das Team-Protokoll jede Einlage. Der Planer liest daraus die echte Rate der Farm:

- **Verknüpfen:** je Farm im Reiter Produktion „Sammeltruhe“ wählen (`updateFarm(…, { chest })`). `suggestChests` schlägt Truhen vor, in die Trichter Items der Farmart liefern (+ Nähe ≤ 32 Blöcke zum Farmort); Knopf „Als Sammeltruhe verknüpfen“ unter „Gefunden“.
- **Ertragsmeldungen des Servers (bevorzugt):** Ereignis `store.yield { chest, farm?, items, from, until, minutes }` – Items, die in der Zeitspanne über Trichter hineinkamen, und die Minuten, in denen der Chunk der Truhe wirklich geladen war. Zuordnung über `farm` (Planer-Farm-ID, aus `store.config.farm`) oder die Truhe. Laufzeit = Σ `minutes`.
- **Rückfall für ältere Plugins:** Trichterbuchungen (`store.move` mit `via: "trichter"`, sekündlich gebucht). Lücken bis `CHEST_GAP_MINUTES` (5 min) zählen als Laufzeit, längere als Pause; die Laufzeit ist dann als geschätzt gekennzeichnet.
- **Rangfolge der Rate:** Sammeltruhe (≥ 1 h Laufzeit) vor Ertragsbuch (≥ 1 h) vor Richtwert (`FarmRate.source`: `Lagerkiste` · `gemessen` · `Richtwert`). Unter einer Stunde nennt der Farmzustand die bisherige Laufzeit als Hinweis; eine verknüpfte, inzwischen entfernte Truhe ebenfalls.
- **Nichts doppelt:** Die Truhe wird nur gelesen. Sie bucht weder ins Ertragsbuch noch ins Baustellen-Lager – der Bestand kommt wie bisher über „Bestand ins Baustellen-Lager übernehmen“ im Reiter Team.

## Anbindung

| Modul | Richtung | Was passiert |
|---|---|---|
| Projekt/Editor | → Produktion | Bauteile aus Katalog-Farmen (`detectFarms`) mit Baufortschritt der Anleitung; Übernehmen mit passendem Zustand, „fertig abgehakt → läuft?“ |
| Baustelle (B14) | ↔ | Bedarf = Sammelplan; Ernten landen im Lager; Link „Farmen & Engpässe“ im Baustellen-Kopf |
| Planung (PROJ-01/02) | ↔ | Baubeginn je Abschnitt; Warnung „Material zu spät“ mit Gegenmitteln. Mit „Auf Material warten“ (PROJ-02) beginnt die Planung Abschnitte erst bei Materialbereitschaft und Produktion vergleicht mit diesem Zeitplan |
| Team / Bauleute | → Produktion | `splitGathering`: Handarbeit nach LPT auf die Bauleute, Nether- und End-Items als eine Tour (TEAM-03-S02) |
| Weltkarte (MAP-03/06) | ↔ | Farmpunkte (Typ „Farm“) übernehmen mit erkannter Art (`guessFarmType`); Farmen und AFK-Platz als Punkt eintragen; Bauplatz des Projekts als Standardort |
| Bibliothek | → | Baukosten der Farm-Baupläne (`farmCostOf`), Links „Bauplan“ |
| Team-Lager / Paper-Plugin (COOP-05) | → Produktion | Sammeltruhe je Farm, echte Rate aus `store.yield` bzw. Trichterbuchungen (`teamChests`, `chestYield`, `suggestChests`) |

Das **Produktionsblatt** (`productionText`) fasst alles als Text zusammen (Download/Kopieren).

## Grenzen

- Raten schwanken je Bauweise, Biom, Höhe und Server stark – deshalb Ertragsbuch.
- Die Rechnung nimmt an, dass der Spieler während der Sammelzeit in der Nähe der automatischen Farmen ist.
- Handel und Tausch sind als Richtwert mit Verbrauch modelliert, nicht als vollständige Handelsbäume.
- Die Sammeltruhen-Rate braucht ein Teampaket bzw. Server-Export mit den Lagerereignissen. `store.yield` schreibt das Plugin seit COOP-08 für Kisten mit Zweck „ertrag“ (`/bp lager farm`, alle 30 min und beim Herunterfahren); ältere Plugins liefern nur Trichterbuchungen (seit COOP-08 je Minute gebündelt) und damit eine geschätzte Laufzeit.
- Spätere Ideen: Farm-Ertrag aus der Mod (Zählung an der Sammeltruhe ohne Server); Produktionsketten mehrerer Projekte auf der Weltkarte.

## Prüfung

- `tests/production.test.mjs` – Katalog, Datensatz/Rückgängig/Sicherung, Ertragsbuch, Reichweiten/AFK, Deckung/Engpass/Bereitschaft mit Zeitplan, Vorschläge, Öfen/Brennstoff/Lager/Logistik, Verbrauch, Anbindung, Integration mit `planSite`, Sammeltruhen (Trichter-Rückfall, Vorschläge, Serverberichte, entfernte Truhe, keine Lagerbuchung).
- `tests/e2e/production.e2e.mjs` – Reiter in Chromium (1400/390 px): Farm anlegen, Ernte ins Lager, gemessene Rate, Ort und AFK-Platz, Lager in der Baustelle, Neuladen, kein Querscrollen; Sammeltruhe aus einem Server-Export vorgeschlagen, verknüpft, Rate 300 Eisen/h aus zwei Ertragsmeldungen.
- Testphase: PROJ-12, PROJ-13.
