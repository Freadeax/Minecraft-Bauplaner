# LMNT — Build Studio

**Minecraft-Bauprojekte planen, im Browser zusammensetzen und gemeinsam im Spiel bauen.**

[![Planer öffnen](https://img.shields.io/badge/Planer-online%20%C3%B6ffnen-2f855a)](https://freadeax.github.io/Minecraft-Bauplaner/)
[![Mod auf Modrinth](https://img.shields.io/badge/Mod-Modrinth-1bd96a)](https://modrinth.com/mod/bauplaner-bridge)
[![Minecraft](https://img.shields.io/badge/Minecraft%20Java-26.3-6b8e23)](docs/architecture/formate/VERSION_PROFILE.md)
[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-blue)](LICENSE)

LMNT — Build Studio besteht aus drei Teilen, die über das Internet zusammenarbeiten. Es gibt keinen Datei-Austausch und keinen eigenen Server:

| Teil | Wofür | Wo |
|---|---|---|
| **Planer** (Web-App) | Bauwerke finden, entwerfen und zu Projekten zusammensetzen; Material, Bauablauf, Gelände und Weltkarte planen | [freadeax.github.io/Minecraft-Bauplaner](https://freadeax.github.io/Minecraft-Bauplaner/) · Spiegel [bauplaner.pages.dev](https://bauplaner.pages.dev/) |
| **Mod** (Fabric / NeoForge, nur Client) | Plan als Hologramm in die Welt legen, Baustand live prüfen, Gelände an den Planer übergeben | [Modrinth](https://modrinth.com/mod/bauplaner-bridge) · [`mods/bauplaner-bridge`](mods/bauplaner-bridge/) |
| **Team-Raum** (Cloud-Dienst) | Planer, Mod und optionales Paper-Plugin eines Teams live synchron halten | [`services/team-room`](services/team-room/) |

Optional schützt ein **Paper-Plugin** Bauabschnitte nach Rollen und prüft Lagerkisten auf dem Server.

---

## Funktionen

| Bereich | Was der Planer kann |
|---|---|
| **Bibliothek** | 358 eigene Gebäude in Bauwelten und Themen-Sets, 17 Ensembles, 11 Anlagen, 13 Großprojekte, 12 parametrische Generatoren (Haus, Turm, Mauer, Brücke, Kirche, Hafen, Arena …), Suche, Vergleich, Sammlungen und Vorlagen |
| **Projekte** | Bauteile platzieren und verbinden, blockgenaue Konfliktprüfung, Rückgängig/Wiederholen, Versionen mit gezielten Updates, Basisplaner |
| **Werkstatt** | Blockeditor mit Auswahl-, Form- und Kreativwerkzeugen (Symmetrie, Kurven, Glätten, Bild → Blöcke), echte Blocklogik von Minecraft 26.3 |
| **Bauen** | Materialbedarf mit Rezepten, Bauanleitung Schicht für Schicht, Baustelle mit Abschnitten und Lager, Zeitplan mit Meilensteinen, Produktion und Farmen |
| **Welt** | Weltkarte mit Bauplätzen, Wegen und Zonen, Gelände live aus der Mod, Landschaft formen und bemalen |
| **Team** | Abschnitte zuweisen, Fortschritt melden und prüfen, gemeinsamer Weltplan, Lagerkisten, Sicherung des Team-Raums |
| **Formate** | Import und Export von Sponge Schem v3 und Litematic, Weltausschnitte aus Regionsdateien, 3D-Export als glTF/GLB, OBJ, STL und 3MF |

Alles läuft im Browser und speichert lokal (IndexedDB, offline nutzbar). Die Anleitung im Planer unter [„Wie geh ich es an?“](https://freadeax.github.io/Minecraft-Bauplaner/#/anleitung) führt Schritt für Schritt durch einen Bau.

---

## Architektur

```mermaid
flowchart LR
  subgraph Browser
    P[Planer<br/>apps/web]
  end
  subgraph Minecraft
    M[Mod<br/>Fabric · NeoForge]
    S[Paper-Plugin<br/>optional]
  end
  R[(Team-Raum<br/>Cloudflare Worker)]
  P <-- WebSocket --> R
  M <-- WebSocket --> R
  S <-- signierte Ereignisse --> R
  P <-. lokal, 127.0.0.1 .-> M
```

Der Planer ist in Schichten gebaut; jede Schicht kennt nur die darunterliegenden:

```
apps/web  ──►  packages/application  ──►  packages/domain   ──►  packages/voxel
                                      └─►  packages/formats  ──┘
```

| Paket | Verantwortung |
|---|---|
| [`packages/voxel`](packages/voxel/) | Voxelvertrag: Zellen, Blockzustände, Drehen und Spiegeln, Blockfakten von 26.3 |
| [`packages/formats`](packages/formats/) | NBT-, Schem- und Litematic-Adapter, getrennt vom Fachmodell |
| [`packages/domain`](packages/domain/) | Fachkern: Katalog, Projekte, Material, Bauablauf, Welt, Team, Daten, Versionen |
| [`packages/application`](packages/application/) | Anwendungsfälle wie Export, Speicherports und Sitzungen |
| [`apps/web`](apps/web/) | React-Oberfläche, 3D-Ansicht (Three.js), Web-Worker, lokale Speicherung |

Grundregel: Vorschau, Materialbedarf, Bauanleitung und Export entstehen aus derselben aufgelösten Revision. Unbekannte Blockzustände bleiben sichtbar erhalten und werden nie still verworfen. Details: [Spezifikation](docs/architecture/kern/SPECIFICATION.md), [Voxelvertrag](docs/architecture/kern/VOXEL_CONTRACT.md), [Modulvertrag](docs/architecture/kern/MODULES.md), [Architekturentscheidungen](docs/architecture/kern/DECISIONS.md).

---

## Repository

```
├── apps/web/              Planer-Oberfläche
├── packages/              TypeScript-Kern ohne Browser (voxel, formats, domain, application)
├── mods/bauplaner-bridge/ Minecraft-Mod, Paper-Plugin, Modrinth-Angaben
├── services/team-room/    Team-Raum (Cloudflare Worker)
├── scripts/               Build, Prüfungen, Veröffentlichung, Datengeneratoren
├── tests/                 Einheitstests (unit/) und Browsertests (e2e/)
├── fixtures/              Testdaten (Schem, Litematic, Blöcke)
└── docs/                  Dokumentation, Roadmap und Prüfstand
```

Die vollständige Ordnerkarte mit allen Fachordnern steht in [docs/STRUKTUR.md](docs/STRUKTUR.md). `index.html`, `assets/`, `deployment.json` und `examples/` in der Wurzel sind die veröffentlichte Website und werden nur vom Veröffentlichungsskript geschrieben.

---

## Entwicklung

Voraussetzung: Node.js ≥ 22.18 und npm. Alle Abhängigkeiten sind exakt im Lockfile fixiert (TypeScript 5.9, React 19, Three.js 0.186, Vite 8, Playwright 1.64).

```sh
npm run setup          # Abhängigkeiten, Git-Hooks, erster Build
npm run dev            # Planer lokal unter http://127.0.0.1:5173/Minecraft-Bauplaner/
npm run check          # Architektur, Roadmap, Typen, Build, Einheitstests, Doku
npm run test:e2e       # Browsertests (einmalig: npm run setup:browser)
```

Die Mod wird mit Gradle gebaut, siehe [mods/bauplaner-bridge](mods/bauplaner-bridge/README.md). Wie Beiträge ablaufen, steht in [CONTRIBUTING.md](CONTRIBUTING.md), die Veröffentlichung in [docs/operations/VEROEFFENTLICHUNG.md](docs/operations/VEROEFFENTLICHUNG.md).

**Qualität:** rund 140 Einheitstest-Dateien und 90 Browsertests, dazu Prüfstände im echten Spiel (Export, Platzierung aller Katalogpläne auf Paper 26.3, Großbauten). Alle Prüfungen laufen lokal vor jeder Veröffentlichung; GitHub Actions werden bewusst nicht verwendet. Prüfstand: [docs/TESTING.md](docs/TESTING.md).

---

## Dokumentation

| Einstieg | |
|---|---|
| [Dokumentationsübersicht](docs/README.md) | alle Dokumente nach Bereich |
| [Funktionsstand](docs/STATUS.md) | was fertig ist und was noch abgenommen wird |
| [Roadmap](docs/ROADMAP.md) | Arbeitspakete mit Status, erzeugt aus [roadmap.json](docs/roadmap.json) |
| [Produktgrundsätze](docs/project/PRINCIPLES.md) | woran Entscheidungen gemessen werden |
| [Testplan](docs/testing/TESTPLAN.md) | Testfälle für Planer und Mod |

## Lizenz

Code unter [MIT](LICENSE). Herkunft aller Inhalte und Regeln für neue Inhalte: [docs/LICENSING.md](docs/LICENSING.md). Minecraft-Texturen werden nicht mitgeliefert. LMNT — Build Studio ist kein offizielles Minecraft-Produkt und steht in keiner Verbindung zu Mojang oder Microsoft. Sicherheitsmeldungen: [SECURITY.md](SECURITY.md).
