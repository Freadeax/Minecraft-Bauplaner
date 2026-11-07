# Dokumentation

Alle Dokumente von LMNT — Build Studio nach Bereich. Für den Gesamtüberblick zuerst das [README](../README.md) lesen.

## Stand und Planung

| Dokument | Inhalt |
|---|---|
| [STATUS](STATUS.md) | Funktionsstand je Bereich, offene Abnahmen, bewusste Grenzen |
| [ROADMAP](ROADMAP.md) | alle Arbeitspakete mit Status und Teilschritten (erzeugt aus [roadmap.json](roadmap.json)) |
| [ROADMAP_HISTORY](ROADMAP_HISTORY.md) | Fortschrittsereignisse mit geänderten Dateien (erzeugt) |
| [TESTING](TESTING.md) | Prüfbefehle, Ergebnisse und Grenzen |
| [REQUIREMENTS](REQUIREMENTS.md) | Anforderungsregister |
| [STRUKTUR](STRUKTUR.md) | Ordnerkarte: wo liegt was, wo kommen neue Dateien hin |
| [LICENSING](LICENSING.md) | Lizenz und Herkunft aller Inhalte |

## Grundlagen

| Dokument | Inhalt |
|---|---|
| [Produktgrundsätze](project/PRINCIPLES.md) | woran Entscheidungen gemessen werden |
| [Spezifikation](architecture/kern/SPECIFICATION.md) | technische Gesamtspezifikation |
| [Voxelvertrag](architecture/kern/VOXEL_CONTRACT.md) | Zellen, Koordinaten, Drehen und Spiegeln (normativ) |
| [Domänenvertrag](architecture/kern/DOMAIN.md) | Bibliothek, Projekte, Zusammensetzung |
| [Modulvertrag](architecture/kern/MODULES.md) | Paketgrenzen und Anwendungsschicht |
| [Architekturentscheidungen](architecture/kern/DECISIONS.md) | Entscheidungen mit Alternativen und Folgen |
| [Planer-Vergleich](project/PLANER_VERGLEICH.md) | Abgleich mit anderen Minecraft-Planern |

## Architektur nach Bereich

**Kern** (`architecture/kern/`): [Planmodell](architecture/kern/PLAN_MODEL.md) · [Speicherung](architecture/kern/PERSISTENCE.md) · [Sicherungen](architecture/kern/BACKUPS.md) · [Revisionsschutz](architecture/kern/ASSET_CONCURRENCY.md) · [Anschlüsse](architecture/kern/CONNECTORS.md) · [Updates](architecture/kern/UPDATES.md) · [Projektberechnung](architecture/kern/PROJECT_COMPUTATION.md) · [Hintergrundaufträge](architecture/kern/BACKGROUND_JOBS.md) · [Größengrenzen](architecture/kern/SIZE_LIMITS.md) · [Stabilität](architecture/kern/STABILITY.md) · [Leistungsbefund](architecture/kern/PERFORMANCE_AUDIT.md) · [Zellindizes](architecture/kern/COMPOSITION_PERFORMANCE.md) · [Browsermessung](architecture/kern/PROJECT_BROWSER_BENCHMARK.md)

**Formate** (`architecture/formate/`): [Schem-Import](architecture/formate/SCHEM_IMPORT.md) · [Schem-Export](architecture/formate/SCHEM_EXPORT.md) · [Litematic](architecture/formate/LITEMATIC.md) · [BlockEntity-Transformationen](architecture/formate/NBT_TRANSFORMS.md) · [3D-Export](architecture/formate/MODEL_EXPORT.md) · [Ausstattung](architecture/formate/ENTITIES.md) · [Versionsprofil 26.3](architecture/formate/VERSION_PROFILE.md) · [Blocklogik](architecture/formate/BLOCK_LOGIC.md) · [Blockdarstellung](architecture/formate/BLOCK_MODELS.md)

**Bibliothek** (`architecture/bibliothek/`): [Katalog](architecture/bibliothek/CATALOG.md) · [Bauwelten](architecture/bibliothek/BUILD_THEMES.md) · [Baustil](architecture/bibliothek/BAUSTIL.md) · [Generatoren](architecture/bibliothek/GENERATORS.md) · [Sammlungen und Vorlagen](architecture/bibliothek/COLLECTIONS.md) · [Anlagen](architecture/bibliothek/ANLAGEN.md) · [Großprojekte](architecture/bibliothek/GROSSPROJEKTE.md) · [Basisplaner](architecture/bibliothek/BASE_PLANNER.md) · [Beiträge](architecture/bibliothek/CONTRIBUTIONS.md)

**Planer** (`architecture/planer/`): [Oberfläche](architecture/planer/UI.md) · [Farbschema](architecture/planer/THEME_TOKENS.md) · [Oberflächenabnahme](architecture/planer/UI_ACCEPTANCE.md) · [Betrachter](architecture/planer/VIEWER.md) · [Grafik](architecture/planer/GRAPHICS.md) · [Schem-Ansichten](architecture/planer/SCHEM_VIEWS.md) · [Blockeditor](architecture/planer/BLOCK_EDITOR.md) · [Kreativwerkzeuge](architecture/planer/CREATIVE_TOOLS.md) · [Material](architecture/planer/MATERIALS.md) · [Materiallabor](architecture/planer/MATERIAL_LAB.md) · [Produktion](architecture/planer/PRODUCTION.md) · [Bauanleitung](architecture/planer/GUIDE.md) · [Bauführung](architecture/planer/BUILD_RUN.md) · [Baustelle](architecture/planer/SITE.md) · [Projektplanung](architecture/planer/PROGRAM.md)

**Welt** (`architecture/welt/`): [Weltkarte](architecture/welt/WORLDMAP.md) · [Weltbuilder](architecture/welt/WORLD_BUILDER.md) · [Livekarten](architecture/welt/LIVEMAP.md) · [Gelände](architecture/welt/TERRAIN.md) · [Landschaft](architecture/welt/LANDSCAPE.md) · [Weltimport](architecture/welt/WORLD_IMPORT.md) · [Weltplan teilen](architecture/welt/WORLD_SHARE.md)

**Team** (`architecture/team/`): [Teambau](architecture/team/TEAMBAU.md) · [Team live](architecture/team/TEAM_LIVE.md) · [Live-Verbindung zur Mod](architecture/team/LIVE_LINK.md) · [Server ohne Befehle](architecture/team/AUTO_LINK.md) · [Ausweichwege](architecture/team/FALLBACKS.md) · [Unterschriebene Ereignisse](architecture/team/SIGNED_EVENTS.md) · [Lagerkisten](architecture/team/LAGERKISTEN.md) · [Team-Raum betreiben](architecture/team/TEAM_BACKUP.md)

**Mod** (`architecture/mod/`): [Spielbrücke](architecture/mod/MOD_BRIDGE.md) · [Hologramm und Live-Abgleich](architecture/mod/MOD_HOLOGRAM.md) · Bauen und Testen: [mods/bauplaner-bridge](../mods/bauplaner-bridge/README.md)

**Betrieb** (`architecture/betrieb/`, `operations/`): [Hosting](architecture/betrieb/HOSTING.md) · [Offline und zweite Adresse](architecture/betrieb/OFFLINE.md) · [Veröffentlichung](operations/VEROEFFENTLICHUNG.md) · [Wiederherstellungsprobe](operations/PAGES_RESTORE_PROBE.md) · [Testphase](architecture/betrieb/TESTPHASE.md)

## Testen

[Testplan](testing/TESTPLAN.md) (erzeugt) · [Gerätematrix](testing/GERAETEMATRIX.md) · [Bibliotheksbeiträge](library/BEITRAEGE.md)
