# Bauplaner-Mod 2.0: Hologramm und Live-Abgleich (GAME-07)

Stand 02.11.2026 · Stufe 1 „Fundament + Hologramm“ (0.2.0, Wahl Philipp) Stufe 2 „Texturen, Material, Ebenen“ (0.3.0) und Stufe 3 „Platzierhilfe“ (0.4.0). Nur Fabric 26.3; die bisherige Aufnahme (`/bauplaner scan`, [MOD_BRIDGE](MOD_BRIDGE.md)) bleibt unverändert erhalten.

## Grundsätze

- **Reiner Client.** Kein zusätzliches oder verändertes Paket an den Server (die Platzierhilfe lässt einen normalen Klick durch oder verwirft ihn vorher, und wählt höchstens einen Schnellleistenplatz wie eine Zifferntaste), keine Weltänderung, kein automatisches Bauen („Printer“), kein Teleport. Funktioniert damit auf jedem Server, auch ohne Plugin und ohne Rechte.
- **Keine Abhängigkeiten** außer Fabric API: kein WorldEdit, kein Litematica, keine eigenen Shader. Gezeichnet wird mit Vanilla-Rendertypen (`debugQuads`, `lines`) über `LevelRenderEvents.COLLECT_SUBMITS`, damit Sodium und Iris nichts ersetzen müssen.
- **Eine Wahrheit für den Vergleich.** `BlockRules.compare` ist eine Portierung von `compareBlock`/`ignoredProperties` aus `packages/domain/src/gameCheck.ts`: Ergebnis im Spiel = Ergebnis der Website.

## Aufbau

| Teil | Inhalt |
|---|---|
| `mod-core/` (Java 21, ohne Minecraft) | `BlockState` (Text `id[k=v]`, sortiert), `BlockRules` (OK/STATE/MISSING/WRONG/UNKNOWN), `Placement` (Anker, Viertel­drehungen im Uhrzeigersinn, Spiegelung der x-Achse vor dem Drehen; Positionen und Zustände: facing, axis, rotation 0–15, Schienenformen, Jigsaw-Ausrichtung, Seiten-Eigenschaften, Tür-Scharnier, Treppenform, Kistentyp), `PlanModel` (liest die exportierte `.schem` inkl. `Metadata.Bauplaner.ProjectMin`), `LiveCheck` (Urteil je Planblock, Chunk-Index, Runden-Abgleich, nächster Fehler), `PlacementStore` (`bauplaner/platzierung.properties` je Server/Welt). 7 JUnit-Tests |
| `mod-core/.../Materials.java` | Materialliste: je Block offen/gesamt; Türen, hohe Pflanzen und Betten zählen einmal, Doppelstufen zwei Stufen; optional nur bestimmte Höhen (Ebenen) |
| `fabric-26.3/.../Hologram*.java`, `PlanScreen.java`, `MaterialScreen.java`, `GhostModels.java` | Zustand der Platzierung, Menü, Materialliste, Tasten, Befehle, HUD, Zeichnen, Blockmodelle der Geisterblöcke |

## Bedienung

| Taste (änderbar unter Steuerung → „Bauplaner“; Standard so gewählt, dass Xaero, Simple Voice Chat, Iris und Jade aus Philipps Modpack nicht kollidieren) | Wirkung |
|---|---|
| J | Planmenü: Pläne aus `bauplaner/plans/`; Klick platziert am angeschauten Block. Rechts: hierher, X/Y/Z ±1/±10, drehen, spiegeln, aus-/einblenden, entfernen |
| Pfeiltasten, Bild↑/Bild↓ | Plan relativ zur Blickrichtung verschieben (↑ = von mir weg) |
| Ende / Pos1 / Einfg | 90° rechts drehen / zum angeschauten Block / spiegeln |
| , (Komma) | Hologramm ein/aus |
| Num 7 | Materialliste: je Block offen, im Inventar, noch holen (Ebenen beachtet) |
| Num 6 / Num 9 / Num 3 | Ebenenmodus wechseln (alle → nur eine Ebene → bis zur Ebene) / Ebene höher / tiefer |
| . (Punkt) | Fehlerfinder: nächster falscher/fehlender Block bekommt violetten Rahmen und Strahl, HUD zeigt Richtung, Entfernung und was falsch ist |

Befehle (gleiche Aktionen, für Tastaturlose und Tests): `/bauplaner zeigen <datei>`, `fortschritt`, `hierher [x y z]`, `verschieben <dx> <dy> <dz>`, `drehen [viertel]`, `spiegeln`, `umschalten`, `fehler`, `entfernen`, `ebene <y>|bis <y>|alle`, `material`, `texturen`.

## Darstellung

- fehlt, bis 40 Blöcke Entfernung (höchstens 6 000): das echte Blockmodell des Spiels, durchscheinend und bläulich getönt (Texturen aus dem Blockatlas, Ressourcenpakete gelten; Flächen zwischen zwei vollen Geisterblöcken werden weggelassen, damit Wände nicht wie Gitter aussehen). Blöcke ohne Modell (Kisten, Schilder, Banner) und weiter entfernte: blaue Kiste. Im Menü „Texturen: aus“ schaltet auf Kisten um (gespeichert in `bauplaner/einstellungen.properties`).
- falsch: rote Kiste über dem Block · Zustand falsch: gelbe Kiste · richtig: nichts. Weißer Rahmen um die ganze Planbox.
- Gezeichnet werden höchstens 30 000 offene Blöcke im Umkreis von 72 Blöcken, nach Chunk-Ringen von der Kamera aus; die Auswahl wird nur neu berechnet, wenn sich ein Urteil ändert oder die Kamera den Chunk wechselt.
- HUD am rechten Rand (oben links liegt meist die Minikarte): Prozent richtig, Balken, fehlt/falsch/Zustand/nicht geladen, Fehlerfinder-Zeile.

## Live-Abgleich

Jeder Tick prüft 8 000 Planblöcke reihum (`LiveCheck.sweep`, ca. 160 000/s), nur in der Dimension der Platzierung. Ungeladene Chunks zählen als „nicht geladen“ statt als fehlend; beim Entladen eines Chunks werden seine Blöcke wieder unbekannt. Ohne Mixins, daher robust gegen andere Mods. Zustandstexte werden je Spiel-Blockzustand nur einmal erzeugt (Identitäts-Cache).

## Speicherung

`bauplaner/platzierung.properties`: je Schlüssel (`server:<adresse>` bzw. `welt:<name>`) Plan-Datei, Dimension, Anker, Drehung, Spiegelung, sichtbar. Beim Betreten des Servers/der Welt wird die Platzierung wiederhergestellt.

## Prüfung

- `./gradlew :mod-core:test` (9 Tests: Platzierhilfe-Urteil und Wegauswahl, Materialliste und Ebenen, Zustände, Regeln wie Website, Drehen/Spiegeln von Positionen und Zuständen inkl. Rückweg, Planlesen, Live-Abgleich, Speicher).
- `scripts/test_bridge_ingame.sh` spielt nach der Aufnahme das Hologramm durch: platzieren am angeschauten Block, Fortschritt genau „fehlt 1 · falsch 1“, Fehlerfinder zeigt den Diamantblock, Server setzt den fehlenden Block → ohne Befehl „fehlt 0“, gedreht passt der Plan nicht mehr, zurückgedreht wieder wie vorher, Platzierung gespeichert, Taste J öffnet das Menü; Materialliste „1 × Bruchstein“, Fehlerfinder bleibt in der gewählten Ebene, nach Teilabriss erscheinen die Mauerblöcke als texturierte Geister und in der Materialliste, Num 7 öffnet die Materialliste; Platzierhilfe über den echten Klickweg (`MultiPlayerGameMode.useItemOn`): Bruchstein statt Eichenstamm wird nicht gesetzt und der Stamm aus der Schnellleiste genommen, seitlich angeklickter Stamm wird nicht gesetzt und der Hinweis nennt „auf den Block darunter klicken“, so geklickt steht er aufrecht, Abbauen ist geschützt, nach „warnen“ möglich; Bildschirmfotos `hologramm.png`, `menue.png`, `geister.png`, `material.png`, `platzierhilfe.png` (mit `BAUPLANER_KEEP=<ordner>`).

## Ebenen und Materialliste (0.3.0)

- Ebenenmodus: „nur eine Ebene“ beginnt an der untersten Ebene mit offener Arbeit; ein türkiser Rahmen markiert sie. Zeichnen, Fehlerfinder, HUD-Zeile „Ebene …: x / y richtig, n offen“ und Materialliste gelten nur für die gewählten Höhen. Verschieben in y nimmt die Ebene mit.
- Materialliste: offen = fehlend oder falscher Block (Zustand falsch braucht kein neues Material). Inventar zählt nur die eigenen Slots, keine Shulkerkisten.

## Platzierhilfe (0.4.0)

Vorbild ist Litematicas „Easy Place“, aber serverkonform: Easy Place verändert Blickrichtung und Klickposition im Paket an den Server, damit der Block richtig herum landet. Das kann Anti-Cheat auslösen und gilt auf manchen Servern als unerlaubt. Der Bauplaner macht das nicht.

- **Vorhersage:** Vor jedem Rechtsklick in den Plan (Fabric `UseBlockCallback`, läuft im Client vor dem Senden) berechnet die Mod mit der Platzierlogik des Spiels selbst (`BlockItem.getPlacementState` über `updatePlacementContext`), welcher Zustand entstehen würde. Damit sind Wandfackeln, Schilder, Stufen zur Doppelstufe, Türen und Stämme abgedeckt, ohne eigene Regeln je Block.
- **Urteil** (`mod-core/PlacementAdvice.judge`, gleiche Regeln wie der Live-Abgleich): richtig → Klick geht normal durch; anderer Block → nicht gesetzt, liegt der richtige in der Schnellleiste, wird er gewählt („nochmal klicken“, bei gehaltener Taste setzt der nächste Wiederholklick); falsche Ausrichtung → nicht gesetzt, Hinweis wie es geht.
- **Ausrichtungsfinder:** Für die Zielstelle probiert die Mod 16 Blickrichtungen × waagerecht/oben/unten × jede feste Nachbarfläche × obere/untere Hälfte mit derselben Platzierlogik durch (Drehung nur rechnerisch, innerhalb eines Ticks zurückgesetzt, nie gesendet). `PlacementAdvice.best` wählt den einfachsten Weg: Haupthimmelsrichtung, wenig drehen, Blickneigung wie jetzt, Block darunter anklicken. Findet sich kein Weg (Zustand hängt von Nachbarn ab, die noch fehlen), wird **nicht** gesperrt, nur gewarnt.
- **Abbauschutz:** Richtig gesetzte Planblöcke lassen sich bei „an“ nicht abbauen (`AttackBlockCallback`).
- **Nie eingegriffen** wird bei geplanter Luft (Gerüst erlaubt), außerhalb des Plans, bei ausgeblendetem Hologramm, in anderer Dimension, mit Nicht-Block-Gegenständen und beim Klick auf Türen, Kisten, Knöpfe usw. (ohne Schleichen).
- **Fadenkreuz-Zeile:** was an der angezielten Stelle hingehört und wie (grün „✓ so setzen“, gelb „Blick nach Osten, auf den Block darunter klicken“, gelb „Num 8 nimmt ihn in die Hand“ / „nicht im Inventar“, rot „falscher Block, erst abbauen“). Zielt der Spieler durch das Hologramm, gilt die erste offene Planstelle auf dem Blickstrahl.
- **Modi:** an / nur warnen / aus, im Menü J, mit `/bauplaner platzierhilfe an|warnen|aus` oder einer frei belegbaren Taste (Standard: keine, alle Nummernblocktasten in der Nähe sind im Modpack belegt). Num 8 nimmt den Planblock in die Hand (nur Schnellleiste; Inventarverschiebungen werden bewusst nicht ausgelöst).
- Jede Meldung steht einmal im `latest.log` als `[Platzierhilfe] …` (für Fehlerberichte und den Spieltest).

## Nächste Stufen

Bauabschnitte aus der Website (BUILD-06) als Filter, Shulker-Inhalte in der Materialliste, Sicht durch Blöcke (Röntgen) für verdeckte Fehler, NeoForge-Port über `mod-core`.
