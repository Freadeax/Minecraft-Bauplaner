# Blockdarstellung: Formen, Modelle, Texturen (VIEW-02 · B16)

Stand 01.11.2026. Betrachter, Katalogbilder, Bildergalerie, Ebenenpläne und Vergleichsansichten zeichnen Blöcke nicht mehr als Würfel, sondern in ihrer Minecraft-Form nach Blockzustand: Treppen, Stufen, Zäune, Mauern, Scheiben, Türen, Falltüren, Fackeln, Pflanzen, Schilder, Banner, Betten, Truhen, Schienen, Redstone, Laternen, Ketten usw.

## Lizenzentscheidung (ADR-020)

- Der Bauplaner veröffentlicht **keine** Minecraft-Texturen, -Modelle oder -Blockstate-Dateien, weder im Repository noch auf Pages (AGENTS: „Keine Minecraft-Texturen ohne entsprechende Rechte beilegen.“).
- **Ohne Texturquelle** zeichnet der Bauplaner eigene Formen (`shapes.ts`) in Durchschnittsfarben. Im Repository liegen nur abgeleitete Fakten: Block-IDs, Property-Werte, je Block drei Durchschnittsfarben und eine grobe Silhouette (`colors26.ts`, `blockRegistry.ts`). Das sind keine Texturen.
- **Mit Texturquelle** lädt der Browser des Nutzers die Dateien selbst, auf eine von zwei Arten:
  - „Von Mojang laden“: die offizielle Client-Jar direkt von `piston-data.mojang.com`, wie ein Launcher; SHA-1 aus Mojangs Versionsmanifest wird geprüft. Mojangs Server erlauben CORS (`access-control-allow-origin: *`, geprüft am 28.10.2026).
  - „Eigene Dateien“: Client-Jar der eigenen Installation, Ressourcenpakete, Mod-Jars.
  Nur Blockstates, Blockmodelle und die von ihnen benutzten Texturen werden entpackt und ausschließlich in diesem Browser gespeichert (IndexedDB `bauplaner-texturen`). Nichts wird hochgeladen. Der Dialog nennt Lizenzvoraussetzung und EULA.
- Mojang wird nur auf Klick kontaktiert (Versionsliste beim Öffnen der Versionsauswahl, Jar über die Schaltfläche). Der Browsertest prüft, dass ohne Klick keine Anfrage an mojang.com geht.

## Module (`apps/web/src/blockmodels/`)

| Datei | Aufgabe |
| --- | --- |
| `zip.ts` | ZIP/JAR-Leser ohne Abhängigkeit (Zentralverzeichnis, `DecompressionStream('deflate-raw')`), Grenzen für Archiv, Einträge und entpackte Bytes; ZIP64/mehrteilig abgewiesen. |
| `model.ts` | Blockstates (`variants`, `multipart` mit `OR`/`AND`), Modellvererbung, Texturvariablen (auch `{sprite, force_translucent}` und Variablen ohne `#` wie bei `heavy_core`), Elemente mit `uv`, Flächenrotation, alter `rotation`-Achse mit `rescale` und neuer x/y/z-Form, Varianten-`x`/`y`, `uvlock`, `cullface`, `tintindex`, `shade`. Ergebnis: gebackene Vierecke je Zustand (gecacht). |
| `shapes.ts` | Eigene Formen für alle 1288 Blöcke ohne Texturquelle, und für Blockentity-Blöcke (Truhen, Schilder, Banner, Köpfe, Betten, Shulkerkisten, Krug), deren Aussehen Minecraft nicht über Blockmodelle beschreibt. |
| `tint.ts` | Färbung für Gras, Laub, Wasser, Redstone-Stärke, Stängel (Ebenen-Standardwerte, kein Biom). |
| `mesh.ts` | Mesh aus Zellen: zwei Schichten (fest/ausgeschnitten und durchscheinend), Flächen gegen verdeckende Nachbarn verworfen; gleiche volle Blöcke (Glas, Wasser, Laub) verbergen ihre gemeinsamen Flächen. Feste Minecraft-Helligkeit je Seite. Markierungen (`Mark {color, amount}`) für Auswahl, Konflikte und Vergleiche. |
| `atlas.ts` | Texturatlas 16 px je Kachel (erstes Animationsbild), Einordnung opak/ausgeschnitten/durchscheinend. |
| `pack.ts`, `packKit.ts` | Quellen laden, entpacken, speichern; nachgeladen (eigener Chunk), damit die Startseite klein bleibt. |
| `assets.ts`, `TexturePanel.tsx` | Zustand „Eigene Formen“ / „Originaltexturen“, Dialog in der Kopfzeile, Hinweis im Betrachter. |
| `threeMesh.ts` | three.js-Shader (Atlas, Alpha-Test, Kanten nur ohne Texturen), Picking Dreieck → Viereck → Zelle. |
| `colors26.ts` | erzeugt: Durchschnittsfarben oben/Seite/unten und Silhouette je Block. |

Standbilder (`thumbnail/glShot.ts`) nutzen einen einzigen geteilten Offscreen-WebGL-Kontext mit Parallelprojektion und 2× Überabtastung. Ohne WebGL bleiben 2D-Isometrie und Software-Ansicht als Rückfall.

## Blockregister 26.3

`packages/voxel/src/blockRegistry.ts` (erzeugt mit `scripts/gen_block_data.py <client.jar> [palette.json]`, nur Entwicklerwerkzeug, Pillow nötig): 1288 Block-IDs mit Property-Werten. Quelle sind die Blockstate-Dateien der 26.3-Client-Jar und die Palette der Litematic „All Blocks in 26.3 v2“. Properties, die kein Modell auswertet und die in der Palette fehlen, können fehlen (z. B. `waterlogged` mancher Blöcke); **Standardwerte sind nicht enthalten**. Der Datengenerator des Servers (vollständiger Registryreport) wurde nicht ausgeführt; das bleibt Teil von PROFILE-01. Die Editor-Schicht `packages/domain/src/editor/blocks.ts` (EDIT-01) ergänzt Standardwerte darüber; ein zweites Register gibt es nicht.

Die Zustandsregeln (`states.ts`, Profil `java-vanilla-1.21.4-manual+26.3`) decken jetzt jeden Registerblock mit Ausrichtungs-Property ab (Test in `tests/blocks.test.mjs`), darunter Kupferketten/-gitter/-laternen/-truhen/-golemstatuen, Regale, Glocke, Kakao, Krug, Tresor, Pappel-Holz und Zinnober-/Schwefel-Familien.

## Importgrenzen

Schem und Litematic: 4 MB komprimiert, 16 MB entpackt, 250.000 Zellen (vorher 2 MB/8 MB/20.000). Anlass war die Litematic mit allen 26.3-Blöcken (29.346 Zellen). Die Dateigrößengrenze der Oberfläche bleibt 2 MB.

## Prüfungen und Grenzen

- Node (`tests/blocks.test.mjs`): ZIP gespeichert/deflate/Grenzen, Pack-Extraktion nur benötigter Dateien, Modellbacken mit synthetischem Minipaket (`tests/helpers/minipack.mjs`, eigene PNGs, keine Mojang-Dateien), Formen für alle 1288 Blöcke, Tönung, Kulling, 27³-Hülle, Markierungen, optionaler Import der All-Blocks-Litematic über `BAUPLANER_ALL_BLOCKS=<pfad>`.
- Großmodell (605.568 Blöcke, 1,22 Mio. Flächen): Meshaufbau rund 5,4 s in Node (`tests/stability.test.mjs`).
- Browser (`tests/e2e/textures.e2e.mjs`): Dialog, Quelle laden, Speicherung über Neuladen, Fehlermeldung für Ressourcenpaket ohne Blockstates, Entfernen, keine Mojang-Anfrage ohne Klick.
- Manuell in Chromium mit der echten 26.3-Jar und der All-Blocks-Litematic: 1011 Zustände aus Modellen, 54 Blockentity-/Flüssigkeitszustände über eigene Formen; Türen, Falltüren, Schilder, Treppen, Stufen, Teppiche, Lagerfeuer, Pflanzen, Betten und Glas sichtbar korrekt.
- Nicht geprüft: Download von Mojang im Browser selbst (nur CORS und Manifest per curl), Firefox/Safari, echte Geräte. Blockentity-Blöcke zeigen mit Texturquelle nur ihre Partikeltextur auf eigener Form. Biomfarben sind fest (Ebene).
