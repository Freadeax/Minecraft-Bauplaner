# Produktion: Farmen, Deckung und Anbindung (PROD-01…04)

Stand 04.11.2026 · Thread „Produktion und Anbindung im Planer ausbauen“

Der Reiter **Produktion** (`#/projekt/<id>/produktion`) beantwortet die Frage, die der Sammelplan der Baustelle (B14, [SITE.md](SITE.md)) offen lässt: *Wie komme ich an das Material – mit welchen Farmen, wie schnell, und reicht das für den Zeitplan?*

## Grundsätze

- **Eine Bedarfsquelle.** Bedarf ist genau „Noch sammeln“ aus `planSite` (nur offene Schritte, Lager schon in Abschnitt-Reihenfolge abgezogen). Produktion zählt kein Material ein zweites Mal.
- **Annahmen sichtbar.** Farmraten in `FARM_TYPES` sind Richtwerte für einfache, verbreitete Bauweisen; jede Farmart nennt ihre Grundlage (`basis`) und Bedingungen (`needs`). Sobald für eine Farm mindestens eine Stunde im Ertragsbuch steht, rechnet der Planer mit der **gemessenen** Rate.
- **Ein Datensatz, rückgängig machbar.** Alles liegt optional in `project.site.production` (Schema 1) und läuft über `site.set`; Sicherung, Datencheck und `checkSite` prüfen es mit `checkProduction`. Ohne Produktion ändert sich nichts an älteren Projekten.

## Datensatz (`packages/domain/src/production.ts`)

| Feld | Bedeutung |
|---|---|
| `farms[]` | `type` (Farmart), `name`, `units` (Module/Zellen/Händler, 1–256), `state` (geplant · im Bau · läuft · stillgelegt), optional `instanceId` (Bauteil im Projekt), `pointId` (Punkt der Weltkarte), `at` (x/y/z + Dimension), `note` |
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

## Anbindung

| Modul | Richtung | Was passiert |
|---|---|---|
| Projekt/Editor | → Produktion | Bauteile aus Katalog-Farmen (`detectFarms`) mit Baufortschritt der Anleitung; Übernehmen mit passendem Zustand, „fertig abgehakt → läuft?“ |
| Baustelle (B14) | ↔ | Bedarf = Sammelplan; Ernten landen im Lager; Link „Farmen & Engpässe“ im Baustellen-Kopf |
| Planung (PROJ-01) | → Produktion | Baubeginn je Abschnitt; Warnung „Material zu spät“ mit Gegenmitteln |
| Team / Bauleute | → Produktion | `splitGathering`: Handarbeit nach LPT auf die Bauleute, Nether- und End-Items als eine Tour (TEAM-03-S02) |
| Weltkarte (MAP-03/06) | ↔ | Farmpunkte (Typ „Farm“) übernehmen mit erkannter Art (`guessFarmType`); Farmen und AFK-Platz als Punkt eintragen; Bauplatz des Projekts als Standardort |
| Bibliothek | → | Baukosten der Farm-Baupläne (`farmCostOf`), Links „Bauplan“ |

Das **Produktionsblatt** (`productionText`) fasst alles als Text zusammen (Download/Kopieren).

## Grenzen

- Raten schwanken je Bauweise, Biom, Höhe und Server stark – deshalb Ertragsbuch.
- Die Rechnung nimmt an, dass der Spieler während der Sammelzeit in der Nähe der automatischen Farmen ist.
- Handel und Tausch sind als Richtwert mit Verbrauch modelliert, nicht als vollständige Handelsbäume.
- Spätere Ideen: Erträge aus geprüften Lagerkisten des Paper-Plugins (COOP-05) direkt ins Ertragsbuch; Farm-Ertrag aus der Mod (Zählung an der Sammeltruhe); Produktionsketten mehrerer Projekte auf der Weltkarte.

## Prüfung

- `tests/production.test.mjs` – Katalog, Datensatz/Rückgängig/Sicherung, Ertragsbuch, Reichweiten/AFK, Deckung/Engpass/Bereitschaft mit Zeitplan, Vorschläge, Öfen/Brennstoff/Lager/Logistik, Verbrauch, Anbindung, Integration mit `planSite`.
- `tests/e2e/production.e2e.mjs` – Reiter in Chromium (1400/390 px): Farm anlegen, Ernte ins Lager, gemessene Rate, Ort und AFK-Platz, Lager in der Baustelle, Neuladen, kein Querscrollen.
- Testphase: PROJ-12, PROJ-13.
