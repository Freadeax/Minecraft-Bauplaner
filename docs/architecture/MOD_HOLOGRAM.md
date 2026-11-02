# Bauplaner-Mod 2.0: Hologramm und Live-Abgleich (GAME-07)

Stand 02.11.2026 · erste Stufe „Fundament + Hologramm“ (Wahl Philipp). Nur Fabric 26.3; die bisherige Aufnahme (`/bauplaner scan`, [MOD_BRIDGE](MOD_BRIDGE.md)) bleibt unverändert erhalten.

## Grundsätze

- **Reiner Client.** Kein Paket an den Server, keine Weltänderung, kein automatisches Bauen („Printer“), kein Teleport. Funktioniert damit auf jedem Server, auch ohne Plugin und ohne Rechte.
- **Keine Abhängigkeiten** außer Fabric API: kein WorldEdit, kein Litematica, keine eigenen Shader. Gezeichnet wird mit Vanilla-Rendertypen (`debugQuads`, `lines`) über `LevelRenderEvents.COLLECT_SUBMITS`, damit Sodium und Iris nichts ersetzen müssen.
- **Eine Wahrheit für den Vergleich.** `BlockRules.compare` ist eine Portierung von `compareBlock`/`ignoredProperties` aus `packages/domain/src/gameCheck.ts`: Ergebnis im Spiel = Ergebnis der Website.

## Aufbau

| Teil | Inhalt |
|---|---|
| `mod-core/` (Java 21, ohne Minecraft) | `BlockState` (Text `id[k=v]`, sortiert), `BlockRules` (OK/STATE/MISSING/WRONG/UNKNOWN), `Placement` (Anker, Viertel­drehungen im Uhrzeigersinn, Spiegelung der x-Achse vor dem Drehen; Positionen und Zustände: facing, axis, rotation 0–15, Schienenformen, Jigsaw-Ausrichtung, Seiten-Eigenschaften, Tür-Scharnier, Treppenform, Kistentyp), `PlanModel` (liest die exportierte `.schem` inkl. `Metadata.Bauplaner.ProjectMin`), `LiveCheck` (Urteil je Planblock, Chunk-Index, Runden-Abgleich, nächster Fehler), `PlacementStore` (`bauplaner/platzierung.properties` je Server/Welt). 7 JUnit-Tests |
| `fabric-26.3/.../Hologram*.java`, `PlanScreen.java` | Zustand der Platzierung, Menü, Tasten, Befehle, HUD, Zeichnen |

## Bedienung

| Taste (änderbar unter Steuerung → „Bauplaner“; Standard so gewählt, dass Xaero, Simple Voice Chat, Iris und Jade aus Philipps Modpack nicht kollidieren) | Wirkung |
|---|---|
| J | Planmenü: Pläne aus `bauplaner/plans/`; Klick platziert am angeschauten Block. Rechts: hierher, X/Y/Z ±1/±10, drehen, spiegeln, aus-/einblenden, entfernen |
| Pfeiltasten, Bild↑/Bild↓ | Plan relativ zur Blickrichtung verschieben (↑ = von mir weg) |
| Ende / Pos1 / Einfg | 90° rechts drehen / zum angeschauten Block / spiegeln |
| , (Komma) | Hologramm ein/aus |
| . (Punkt) | Fehlerfinder: nächster falscher/fehlender Block bekommt violetten Rahmen und Strahl, HUD zeigt Richtung, Entfernung und was falsch ist |

Befehle (gleiche Aktionen, für Tastaturlose und Tests): `/bauplaner zeigen <datei>`, `fortschritt`, `hierher [x y z]`, `verschieben <dx> <dy> <dz>`, `drehen [viertel]`, `spiegeln`, `umschalten`, `fehler`, `entfernen`.

## Darstellung

- fehlt: blaue, leicht verkleinerte Kiste · falsch: rote Kiste über dem Block · Zustand falsch: gelbe Kiste · richtig: nichts. Weißer Rahmen um die ganze Planbox.
- Gezeichnet werden höchstens 30 000 offene Blöcke im Umkreis von 72 Blöcken, nach Chunk-Ringen von der Kamera aus; die Auswahl wird nur neu berechnet, wenn sich ein Urteil ändert oder die Kamera den Chunk wechselt.
- HUD am rechten Rand (oben links liegt meist die Minikarte): Prozent richtig, Balken, fehlt/falsch/Zustand/nicht geladen, Fehlerfinder-Zeile.

## Live-Abgleich

Jeder Tick prüft 8 000 Planblöcke reihum (`LiveCheck.sweep`, ca. 160 000/s), nur in der Dimension der Platzierung. Ungeladene Chunks zählen als „nicht geladen“ statt als fehlend; beim Entladen eines Chunks werden seine Blöcke wieder unbekannt. Ohne Mixins, daher robust gegen andere Mods. Zustandstexte werden je Spiel-Blockzustand nur einmal erzeugt (Identitäts-Cache).

## Speicherung

`bauplaner/platzierung.properties`: je Schlüssel (`server:<adresse>` bzw. `welt:<name>`) Plan-Datei, Dimension, Anker, Drehung, Spiegelung, sichtbar. Beim Betreten des Servers/der Welt wird die Platzierung wiederhergestellt.

## Prüfung

- `./gradlew :mod-core:test` (7 Tests: Zustände, Regeln wie Website, Drehen/Spiegeln von Positionen und Zuständen inkl. Rückweg, Planlesen, Live-Abgleich, Speicher).
- `scripts/test_bridge_ingame.sh` spielt nach der Aufnahme das Hologramm durch: platzieren am angeschauten Block, Fortschritt genau „fehlt 1 · falsch 1“, Fehlerfinder zeigt den Diamantblock, Server setzt den fehlenden Block → ohne Befehl „fehlt 0“, gedreht passt der Plan nicht mehr, zurückgedreht wieder wie vorher, Platzierung gespeichert, Taste J öffnet das Menü; Bildschirmfotos `hologramm.png`/`menue.png` (mit `BAUPLANER_KEEP=<ordner>`).

## Nächste Stufen

Texturierte Geisterblöcke (echte Blockmodelle, durchscheinend), Materialliste im Spiel (fehlende Blöcke nach Menge, Abgleich mit Inventar), Ebenen-/Bauabschnittsfilter aus der Website, Bauabschnitte aus BUILD-06, NeoForge-Port über `mod-core`.
