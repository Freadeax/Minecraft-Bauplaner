# Lizenz und Herkunft der Inhalte (LICENSE-01)

Stand 03.11.2026. Entscheidung von Philipp: Das ganze Repository steht unter der **MIT-Lizenz** ([LICENSE](../LICENSE), Copyright 2026 Freadeax), dieselbe Lizenz wie die Bauplaner-Brücke ([mods/bauplaner-bridge/LICENSE](../mods/bauplaner-bridge/LICENSE)) und das Modrinth-Projekt `bauplaner-bridge`.

Minecraft ist eine Marke von Mojang. Der Bauplaner ist ein unabhängiges Projekt und kein offizielles Minecraft-Produkt; die Seite sagt das im Fuß.

## Bestandsaufnahme

| Bestandteil | Herkunft | Lizenz / Recht | Ausgeliefert |
|---|---|---|---|
| Quellcode Planer (`apps/`, `packages/`, `scripts/`, `tests/`) | eigen | MIT | ja (Pages) |
| Mod, NeoForge-/Forge-Adapter, Paper-Plugin (`mods/bauplaner-bridge/`) | eigen | MIT | ja (`downloads/mod/`, Modrinth) |
| Gebäudekatalog, Generatoren, Bausets, Großprojekte | eigen, im Code erzeugt (`packages/`); Stilregeln aus der Auswertung fremder Bauten abgeleitet ([BAUSTIL](architecture/bibliothek/BAUSTIL.md)), **keine fremde Geometrie übernommen** | MIT | ja |
| Ausgewertete fremde Bauten (Philipps Uploads, 27 Gebäude von minemev.com) | Dritte | Rechte bei den Urhebern | **nein**: nicht im Repository, nur zur Analyse gelesen |
| Beispieldateien `examples/contract-*.litematic`, `examples/contract-v3.schem` | eigen, synthetische Formatverträge | MIT | ja |
| Blocktexturen und Blockmodelle | nur aus Quellen des Nutzers (eigenes Ressourcenpaket oder Download von Mojang im Browser des Nutzers), gespeichert nur in dessen Browser ([BLOCK_MODELS](architecture/formate/BLOCK_MODELS.md)) | Mojang-EULA beim Nutzer | **nein** |
| Block-, Property-, Item- und Rezeptfakten (`blockRegistry.ts`, `recipes.ts`, `fixtures/blocks/`) | aus den Datengenerator-Berichten des offiziellen Servers abgeleitete Spielfakten ([BLOCK_LOGIC](architecture/formate/BLOCK_LOGIC.md)); keine Mojang-Dateien, keine Texturen | Fakten; eigene Aufbereitung MIT | ja |
| React, React DOM, three.js | npm | MIT, Texte in [THIRD_PARTY_NOTICES.txt](../THIRD_PARTY_NOTICES.txt), mit `build:web` ausgeliefert | ja |
| Fabric Loader/API, NeoForge, Forge, Paper-API | Abhängigkeiten zur Laufzeit | jeweilige Lizenz; **nicht** in die Jars eingebaut | nein |
| Modrinth-Bilder (`mods/bauplaner-bridge/modrinth/gallery/`) | Spielbildschirmfotos aus Philipps Modpack | eigene Screenshots; Mojang erlaubt Screenshots des Spiels | ja (Modrinth) |
| Entwicklungswerkzeuge (TypeScript, Vite, Playwright, @types) | npm, nur beim Bauen | jeweilige Lizenz | nein |

## Regeln für neue Inhalte

- Keine fremden Texturen, Modelle oder Bauwerke ins Repository oder in die Auslieferung. Fremde Bauten nur auswerten, nicht kopieren.
- Bibliotheksbeiträge ([CONTRIBUTIONS](architecture/bibliothek/CONTRIBUTIONS.md)) brauchen die Rechtebestätigung im Beitragspaket; ohne sie keine Übernahme.
- Neue npm-Laufzeitabhängigkeit: Lizenz prüfen und ihren Text in `THIRD_PARTY_NOTICES.txt` aufnehmen.
- Reale Orte aus Kartendaten (Eingang IN-05) erst nach Prüfung der Kartenlizenz (z. B. ODbL bei OpenStreetMap mit Namensnennung).
