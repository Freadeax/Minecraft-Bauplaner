# Funktionsstand

Stand: 07.11.2026 · Mod 0.26.0 · Minecraft Java 26.3. Was das System heute kann und was noch offen ist. Die Arbeitspakete im Einzelnen stehen in der [Roadmap](ROADMAP.md), Prüfbefehle und Ergebnisse im [Prüfstand](TESTING.md).

**Lesart:** *Umgesetzt* heißt gebaut und automatisch getestet. *Abgenommen* heißt zusätzlich im echten Spiel oder auf echten Geräten bestätigt. Beides wird getrennt geführt.

## Überblick

| Bereich | Umgesetzt | Offen |
|---|---|---|
| **Kern und Daten** | Voxelvertrag mit expliziter Luft und Löschzellen; unveränderliche Asset-Versionen, Instanzen und Revisionen; blockgenaue Konflikte; Rückgängig/Wiederholen; Versionsprofil Java 26.3 aus dem echten Server (1286 Blöcke, 35 723 Zustände, Items, Tags, Rezepte); BlockEntity-Transformationen ([VERSION_PROFILE](architecture/formate/VERSION_PROFILE.md), [NBT_TRANSFORMS](architecture/formate/NBT_TRANSFORMS.md)) | – |
| **Formate** | Sponge Schem v3 und Litematic (Import und Export, auch große Modelle), Weltausschnitte aus Regionsdateien 1.16–26.3, 3D-Export glTF/GLB, OBJ, STL, 3MF; Exporte im echten Spiel mit Litematica, WorldEdit und Vanilla geprüft; „Passt zu deinem Spiel?“ meldet vor Export und Download fehlende Blöcke, angepasste Zustände und nötige Mods für Java 1.20.1 bis 26.3 je Loader und Werkzeug ([VERSION_COMPAT](architecture/formate/VERSION_COMPAT.md), [LITEMATIC](architecture/formate/LITEMATIC.md), [MODEL_EXPORT](architecture/formate/MODEL_EXPORT.md)) | – |
| **Bibliothek** | 358 Gebäude in Bauwelten und Themen-Sets, 17 Ensembles, 11 Anlagen, 13 Großprojekte, 12 Generatoren, Sammlungen und Vorlagen, Bibliotheksbeiträge; alle Katalog- und Generatorpläne auf einem echten Paper-26.3-Server ohne Abweichung platziert ([CATALOG](architecture/bibliothek/CATALOG.md), [GENERATORS](architecture/bibliothek/GENERATORS.md)) | – |
| **Werkstatt** | Blockeditor, Auswahl- und Formwerkzeuge, Kreativwerkzeuge (Symmetrie, Kurven, Glätten, Bild → Blöcke), Bauen direkt im 3D-Bild, echte Blocklogik (Verbindungen, Halt, Schwerkraft) ([CREATIVE_TOOLS](architecture/planer/CREATIVE_TOOLS.md), [BLOCK_LOGIC](architecture/formate/BLOCK_LOGIC.md)) | Abnahme der Werkzeuge im Spiel |
| **Projekt und Bau** | Materialbedarf mit Rezepten und Rohstoffen, Bauanleitung, Baustelle mit Abschnitten und Lager, Bauführung je Bautag, Baumodus für Tablet und Zweitbildschirm, Nachweis je Schritt (manuell, im Spiel bestätigt, neu prüfen), Materialbilanz und Materialtausch mit Vorschau, Geländeschnitt mit Erdbewegung, Zeitplan mit Meilensteinen, Produktion und Farmen, Verknüpfung zwischen Projekten, kontrollierte Updates ([GUIDE](architecture/planer/GUIDE.md), [BAUABLAUF](architecture/planer/BAUABLAUF.md), [PROGRAM](architecture/planer/PROGRAM.md), [PRODUCTION](architecture/planer/PRODUCTION.md)) | Abnahme durch Spieler |
| **Welt** | Weltkarte mit Weltbuilder, Gruppen und Sperren, Gelände live aus der Mod, Landschaft formen und bemalen, Wegnetze, BlueMap-/Dynmap-Marker, Weltplan über den Team-Raum geteilt ([WORLDMAP](architecture/welt/WORLDMAP.md), [TERRAIN](architecture/welt/TERRAIN.md), [WORLD_SHARE](architecture/welt/WORLD_SHARE.md)) | Abnahme mit eigener Welt |
| **Team** | Team-Raum (Cloudflare Worker) mit Live-Abgleich, Rollen, Abschnitten, Mitbauern, Lagerkisten, unterschriebenen Ereignissen, Sicherung und Wiederherstellung ([TEAM_LIVE](architecture/team/TEAM_LIVE.md), [SIGNED_EVENTS](architecture/team/SIGNED_EVENTS.md), [TEAM_BACKUP](architecture/team/TEAM_BACKUP.md)) | Abnahme mit mehreren Spielern |
| **Mod** | Fabric und NeoForge 26.3: Hologramm, Platzierhilfe, Röntgensicht, Live-Baustand, Materialliste, Bauhilfen, Gelände-Übergabe, Team-Funktionen, Menü und Befehle zweisprachig; Gametests im echten Client ([MOD_HOLOGRAM](architecture/mod/MOD_HOLOGRAM.md)) | Forge zurückgestellt; Mehrspieler-Abnahme auf eigenem Server |
| **Paper-Plugin** | Eine .jar für Paper 1.18.2 bis 26.3: Abschnittsschutz nach Rollen, geprüfte Lagerkisten, Verbindung zum Team-Raum ([LAGERKISTEN](architecture/team/LAGERKISTEN.md)) | Abnahme auf eigenem Server |
| **Oberfläche** | Vier Hauptbereiche plus Anleitung, Design-System mit Hell/Dunkel, Touch-Bedienung, Softwareansicht ohne WebGL, Offline-Speicher; Browsertests in Chromium, Firefox und WebKit ([UI](architecture/planer/UI.md), [OFFLINE](architecture/betrieb/OFFLINE.md)) | Prüfung auf echten Geräten nach [Gerätematrix](testing/GERAETEMATRIX.md) |
| **Leistung** | Projektzentrale startet vor dem Katalog (0,22 s), Start-JavaScript 428 KiB, Export großer Bauten im Hintergrund, feste Leistungstests für Großbauten (Öffnen, Schichtwechsel, Kamera, Export, [PERFORMANCE_AUDIT](architecture/kern/PERFORMANCE_AUDIT.md)); schwere Berechnungen im Hintergrund-Worker mit Abbrechen, Großbauten bis 1,45 Mio. Blöcke im echten Spiel geprüft, Laufzeitform bis 2 Mio. Zellen ([BACKGROUND_JOBS](architecture/kern/BACKGROUND_JOBS.md), [SIZE_LIMITS](architecture/kern/SIZE_LIMITS.md)) | Messung auf schwächeren Geräten |

## Abnahmen

Was nur Spieler im echten Spiel oder auf echten Geräten bestätigen können, sammelt die Testphase im Planer unter [`#/testphase`](https://freadeax.github.io/Minecraft-Bauplaner/#/testphase). Fehler werden dort über „Fehler melden“ oder im Spiel mit `/bauplaner diagnose` erfasst ([TESTPHASE](architecture/betrieb/TESTPHASE.md), [Testplan](testing/TESTPLAN.md)).

## Bewusste Grenzen

- Keine Konten und kein eigener Server: Projekte liegen im Browser, Zusammenarbeit läuft über den Team-Raum.
- Keine Minecraft-Texturen im Repository; Texturen kommen nur aus Quellen des Nutzers ([LICENSING](LICENSING.md)).
- Keine Weltveränderung durch Planer oder Mod: Die Mod zeigt und prüft, sie setzt keine Blöcke.
