# Normativer Voxelvertrag v1

Geltung: P0-02/P0-03 und erster Kern für P1-02/P1-04. Implementierung: [Typen](../../packages/voxel/src/types.ts), [Validierung](../../packages/voxel/src/validation.ts), [Transformationen](../../packages/voxel/src/transforms.ts), [Analyse](../../packages/voxel/src/analysis.ts). Die [Fixtures](../../fixtures/voxel/README.md) sind eigene synthetische Vertragsdaten; keine Minecraft-Versionsfreigabe.

## Raum und Grenzen

Rechtshändiger Java-Koordinatenraum: +X Ost, +Y oben, +Z Süd; Nord = −Z. `position=[x,y,z]` ist das Minimum der Einheitszelle [x,x+1)×[y,y+1)×[z,z+1). Grenzen sind `min` inklusive und `maxExclusive` exklusiv. Negative Koordinaten sind zulässig. Alle Zell-, Grenz-, Ursprungs- und Pivotkoordinaten sind vorzeichenbehaftete int32-Ganzzahlen. Jede Bounds-Achse hat positive Länge; ein leerer Entwurf darf keine ausgewählten Zellen haben, braucht aber gültige Auswahlgrenzen.

`pivot` ist ein lokaler Grenzpunkt. `sourceOrigin` ist ausschließlich die erhaltene Herkunftskoordinate aus dem Importadapter, keine zusätzliche Transformation und kein impliziter Zielweltversatz. Eine Instanztransformation setzt ihren Pivot auf `transform.position`. Reihenfolge: lokalen Pivot abziehen → optional an lokaler Ebene X=0 spiegeln → Y-Vierteldrehung → Zielpivot addieren. Positive Vierteldrehung bildet Nord auf Ost ab: (x,y,z)→(−z,y,x). Vier Vierteldrehungen ergeben die Identität; zweimal dieselbe Spiegelung ebenfalls.

Grenzpunkte werden direkt transformiert; Zellen über ihren Mittelpunkt und dessen abgerundetes Ergebnis. Ein Block bei (0,0,0) liegt nach Vierteldrehung um den Grenzpunkt (0,0,0) bei (−1,0,0), nicht bei (0,0,0). Bounds entstehen aus allen acht transformierten Grenzpunkten. Integerüberlauf wird abgewiesen. Kontinuierliche Konnektoren und Halbblockanker folgen erst in einem separaten Vertrag.

## Palette und Zellsemantik

Ein Zustand besitzt vollständige `namespace:id` und alle String-Properties. Der kanonische Vergleichsschlüssel sortiert Propertynamen deterministisch; die Eingabereihenfolge ist nicht bedeutungstragend. Doppelte Palettenzustände und doppelte Zellpositionen werden abgewiesen. Mod-IDs bleiben erhalten; Validierung ersetzt keine Registryprüfung.

| Repräsentation | Bedeutung | Zählung |
|---|---|---|
| `kind: block`, `paletteIndex` | belegter Blockzustand | ein platzierter Block |
| `kind: air`, `paletteIndex` | ausdrücklich ausgewählte Luft; air/cave_air/void_air bleiben verschieden | eigene Luftzahl |
| `kind: erase` ohne Palette | ausdrückliche Löschabsicht | eigene Löschzahl |
| keine Zelle, auch innerhalb Bounds | nicht ausgewählt, keine Aussage über die Welt | keine |
| außerhalb Bounds | außerhalb des Arbeitsbereichs | keine |

Luft ist keine automatische Löschoperation. Ein Exportadapter muss seine Luft-/Löschpolitik ausdrücklich festlegen. Mehrere Instanzen dürfen erst nach Konfliktauflösung gemeinsam gezählt werden; `countBlocks` zählt ausschließlich einen bereits eindeutigen Payload. Es gibt hier keine Item-, Stack-, Rohstoff- oder Lagerberechnung.

Das Austauschformat v1 ist sparse und JSON-kompatibel. Chunkweises Laufzeit-/Binärformat bleibt offen, statt die Darstellung vor Lastmessungen festzuschreiben. Asset-, AssetVersion-, Instanz- und BlueprintRevision-Identitäten gehören in den späteren Domänenvertrag, nicht als vermischte Identität in den Payload.

## Typisiertes NBT

Jeder Tag trägt seinen NBT-Typ. Byte/Short/Int und Arrays werden in ihren vorzeichenbehafteten Grenzen geprüft. Long und LongArray verwenden kanonische dezimale Strings im int64-Bereich, damit JavaScript keine Bits rundet. Listen speichern zusätzlich `elementType`; alle Elemente müssen denselben Typ tragen. Leere End-Listen sind zulässig. Compounds sind benannte Tag-Mappings.

Float muss exakt als float32 darstellbar sein, Double als endliche JavaScript-Zahl. Nicht-endliche Zahlen und negatives Gleitkomma-Null werden ausdrücklich abgelehnt: Der JSON-Vertrag kann deren ursprüngliche Bitdarstellung nicht verlustfrei bewahren. Ein späterer Binäradapter muss dafür eine Vertragserweiterung einführen oder den Import als nicht unterstützt abbrechen; niemals still normalisieren. Das unmodifizierte Binäroriginal bleibt separat zu speichern.

BlockEntities sind lokale Zuordnungen zu genau einer belegten Zelle und besitzen ein NBT-Compound. NBT-Koordinaten werden nicht aus beliebigen Zahlen geraten. Entities, Biome und unbekannte zusätzliche Felder sind in v1 nicht abbildbar und werden abgewiesen; ein Importadapter darf sie nicht still entfernen. Originalpayloads und vollständige Formate werden erst mit entsprechend erweitertem Vertrag freigegeben.

## Sicherheit und Unveränderlichkeit

`createPayload(unknown)` prüft Struktur und Limits, kopiert und friert alle Ebenen ein. `validatePayload` validiert ohne Kopie. Externe Daten durchlaufen die Snapshot-Fabrik; TypeScript-Readonly allein ist keine Laufzeitgarantie. Der Kern führt NBT-Inhalte niemals aus.

Standardlimits: 1.000.000 ausgewählte Zellen, 65.536 Paletteinträge, 16.777.216 Zellen Bounding-Volumen, NBT-Tiefe 64, insgesamt 1.000.000 NBT-Knoten/Arrayelemente und maximal 1.000.000 Zeichen je String. Volumen wird mit BigInt vor weiteren Arbeitsschritten geprüft. Limits sind für vertrauenswürdige aufrufende Komponenten konfigurierbar. Datei-/Dekompressionsgrößen, kumulierte Bytes, Laufzeit, Abbruch und Workerisolation gehören zum noch offenen Importadapter; dieser Kern ist kein abgesicherter Dateiparser.

## Transformationsgrenzen

Die Geometrie unterstützt ganzzahlige Translation, 0–3 Y-Vierteldrehungen und lokale X-Spiegelung. Blockzustände werden über den expliziten Zustandskatalog transformiert (siehe nächster Abschnitt).

### Zustandskatalog (B7, P1-02a)

`packages/voxel/src/states.ts` enthält die einzige Orientierungsregel des Kerns (`transformVector`, von Geometrie und Zuständen gemeinsam genutzt) und den Regelkatalog. Profilkennung `STATE_CATALOG_PROFILE = java-vanilla-1.21.4-manual`: Block-IDs und Propertymengen sind von Hand nach Java 1.21.4 zusammengestellt und **nicht** gegen einen Registry-Report geprüft. Jede Regel nennt Familie, exakte IDs, exaktes Schema (Propertynamen und erlaubte Werte) und eine Abbildung. Ein Zustand gilt nur als gelöst, wenn die ID gelistet ist und die Properties exakt dem Schema entsprechen; ein Raten anhand von Propertynamen findet nicht statt. Eine ID darf nur in einer Regel stehen (beim Laden geprüft). Aktuell 75 Regeln mit 595 IDs (24.556 vollständige Zustände).

| Familie | Abbildung |
|---|---|
| Stämme, Holz, Stängel, Säulen, Basalt, Kette, Netherportal (`axis`) | ungerade Vierteldrehung tauscht x/z; y bleibt; Spiegeln ändert nichts |
| `facing` horizontal oder 6 Richtungen (Fass, Werfer, Beobachter, Kolben, Trichter, Öfen, Truhen, Leitern, Fackeln, Betten, Wandschilder/-banner/-köpfe, Knöpfe/Hebel u. a.) | Richtungsvektor wird gespiegelt und gedreht; up/down bleibt |
| Treppen (`shape`) | facing transformiert; Spiegeln vertauscht links/rechts **immer**. Abweichung von Vanilla `StairBlock.mirror()` (nach Quelltextkenntnis, nicht im Spiel geprüft), das bei Blickrichtung parallel zur Spiegelebene die Form unverändert lässt; geometrisch korrekt ist der Tausch (Quadrantenmodell im Test) |
| Türen (`hinge`), Truhen (`type`) | facing transformiert; Spiegeln vertauscht Scharnier bzw. linke/rechte Doppeltruhenhälfte |
| Zäune, Scheiben, Gitter, Mauern, Ranken, Flechten, Pilzblöcke, Redstone, Stolperdraht, Feuer | Richtungs-Properties werden permutiert (Wert wandert zur transformierten Seite) |
| Schienen | Endpunkte bzw. ansteigende Seite transformiert; Kurven nur bei normaler Schiene |
| Stehende Schilder, Hängeschilder, Banner, Köpfe (`rotation` 0–15) | 0 = Süd, im Uhrzeigersinn: Drehung +4, X-Spiegelung r → (16 − r) mod 16 |
| Crafter, Verbundblock (`orientation`) | Vorder- und Oberseite getrennt transformiert |
| Glasierte Keramik | Drehen gelöst; Spiegeln ist mit dem chiralen Muster nicht darstellbar ⇒ ungelöst (`unrepresentable`) |
| ausrichtungsfreie Familien mit Properties (Stufen, Laub, Flüssigkeiten, Schnee, Feldfrüchte, Kerzen, Laternen, Druckplatten, Tropfstein u. a.) | unverändert, gelöst |
| `minecraft:` ohne Properties | ausrichtungsfrei, gelöst |

`transformBlockState` liefert zusätzlich `family` und bei ungelöstem Ergebnis `reason`: `unknown-block` (nicht im Katalog, Mod-Namespace), `schema-mismatch` (bekannte ID, unerwartete Property oder ungültiger Wert) oder `unrepresentable`. Der Originalzustand bleibt dann unverändert; `transformPayload` erzeugt eine passende `UNRESOLVED_BLOCK_STATE`-Meldung. Bewusst nicht im Katalog: Sonnenblume (Ausrichtung nicht im Zustand), Chiseled Bookshelf (Slotreihenfolge), Strukturblöcke, Notenblock, Modblöcke sowie alle Blöcke nach 1.21.4.

Nachweis `tests/states.test.mjs`: handberechnete Einzelfälle je Familie; für jeden Katalogzustand vier Vierteldrehungen = Identität, doppelte Spiegelung = Identität, Ergebnis im Schema; Gruppenverträglichkeit (zwei Transformationen nacheinander = zusammengesetzte Transformation) für alle Paare der acht Elemente; unabhängige Geometriemodelle für Richtungen, `rotation` als Winkelvektor, Treppenquadranten, Türscharnier, Doppeltruhenpartner, Schienenenden und Verbindungsarme.

Unbekannte Regeln erzeugen `UNRESOLVED_BLOCK_STATE`; der Originalzustand bleibt für die Vorschau erhalten. Bei jeder nicht identischen Transformation von BlockEntities wird nur ihre Zuordnungsposition verschoben und `UNRESOLVED_BLOCK_ENTITY` gemeldet; das NBT bleibt original. So wird keine falsche Ausrichtung oder versteckte NBT-Koordinate als korrekt ausgegeben.

`semanticsResolved` bedeutet ausschließlich, dass keine dieser Transformationsregeln offen ist. Es bedeutet weder kompatible Registry noch gültigen Export noch aufgelöste Projektkonflikte. Aktuell gibt es keinen Exporter. Späterer Export muss alle offenen Berichte zwingend prüfen; ein Vorschaupayload allein ist keine Exportfreigabe.

`selectLayers` erzeugt bewusst einen neuen Teilpayload mit ganzzahligem X-/Y-/Z-Bereich und zugehörigen BlockEntities. Der Viewer muss für bloße Ansichtsfilter den unveränderten Originalpayload behalten. Mengen beziehen sich immer auf den ausdrücklich übergebenen Payload, nicht auf gerade sichtbare Meshes.

## Abnahme und offene Arbeit

P0-02: dieser Vertrag plus ausführbare Typen/Validator. P0-03: handberechnete interne Fixtures, konkrete Richtungen, Gruppenidentitäten, Luft/Löschen, negative Ursprünge, NBT und Fehler-/Budgettests. Echte Schem-Referenzdateien, Parser, vollständige Zustands-/NBT-Adapter, Profilprüfung, Viewer und Export bleiben eigenständige Folgepakete.
