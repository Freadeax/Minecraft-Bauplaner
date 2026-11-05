# Bauwelten: thematischer Einstieg in die Bibliothek

Elf redaktionelle Bauwelten ordnen vorhandene Bibliotheksinhalte: Hafen & Küste, Burg & Marktstadt, Moderne Stadt, Nordische Bergsiedlung, Magische Bauwelt, Nether-Expedition, Dorf & Landleben, Technik & Industrie, Fernöstlicher Garten, Wüstenhandel & Oasenweg und End-Außenposten. Jede Welt beschreibt ein mögliches Bauziel und drei Vorschläge für den Aufbau. Die Ideen sind keine bereits eingerichteten Projekte und keine automatisch ausgeführten Aufgaben.

`packages/domain/src/catalog/buildThemes.ts` definiert ausschließlich Themen und vorhandene Facetten. `selectBuildTheme` ruft den bestehenden `queryCatalog` auf; es entsteht kein zweiter Gebäudekatalog. Namen, Vorschauen und Maße stammen aus tatsächlichen `CatalogEntry`- und `AssetVersion`-Referenzen. Die Oberfläche zeigt bis zu drei nach Namen sortierte Vorschauen und die berechnete Trefferzahl. Alle Varianten zählen einzeln; archivierte Bauteile sind ausgeschlossen. Eigene Bauteile mit passenden Angaben erscheinen automatisch. Eine leere Welt zeigt den fehlenden Bestand verständlich an.

`BuildThemesPage.tsx` ist die reine Bibliotheksansicht. `buildThemeLinks.ts` nutzt denselben `encodeLibraryState`-Serializer wie die normale Bibliothek; Facetten, Sortierung und `varianten=alle` reproduzieren die gezeigten Treffer. Der aufrufende Bibliotheksadapter erhält einen eventuell ausgewählten Projektkontext. Die Vorschauen öffnen vorhandene Gebäudedetailseiten; Übernahme, Export und Projektanlage bleiben dort ausdrücklich bedienbar. Lokale Sprungschaltflächen bewegen den Ausschnitt, ohne die Hashroute zu verändern.

Die Zuordnung basiert auf den deklarierten Stil-/Kategorieangaben. Insbesondere „Nordische Bergsiedlung“ bedeutet keinen geprüften Geländeanschluss, und technische Entwürfe sind keine Versionsfreigabe für Redstone. Eigene Beschreibungen, keine externen Quellen oder fremden Bauwerke übernommen. Die Bauwelten verändern keine Gebäude-, Material-, Projekt- oder Speicherdaten. Jede Bauwelt verlinkt ihre Anlage ([ANLAGEN](ANLAGEN.md), BUILD-05): kuratierte Bereiche, feste Versionen, Konfliktvorschau und ausdrückliche Übernahme.

## Abdeckung der drei zuletzt geprüften Stilrichtungen (WORLD-02)

| Bauwelt | Facetten | Tatsächliche Treffer im mitgelieferten Bestand |
|---|---|---|
| Fernöstlicher Garten | stil `fernoestlich` + kategorie `garten`, `sakral`, `dekoration` | 3 (Schrein, Torii, Zen-Garten) |
| Wüstenhandel & Oasenweg | stil `wuestenstil` + kategorie `wohnhaus`, `befestigung`, `wahrzeichen` | 6 (Lehmhaus, Obelisk, Rundturm (Sandstein), Wüstenfort, Wüstenhaus, Wüstenpyramide) |
| End-Außenposten | stil `end` | 2 (Bergfried (Endstein), End-Startplattform) |

Die drei Welten wurden erst nach Prüfung der echten Katalogabdeckung ergänzt; jede nutzt ausschließlich vorhandene Facettenwerte und zeigt nur Vorschauen wirklicher Einträge dieser Stilrichtung. Kein Bauteil, keine Version und kein Treffer wurde dafür erfunden oder dupliziert. Die Stilrichtungen „klassisch“, „antik“ und „tropisch“ bleiben bewusst ohne eigene Welt, weil die Roadmap dafür keine Welt fordert; ein Test verhindert trotzdem, dass eine Welt eine Stilrichtung nennt, zu der es gar keine Bauteile gibt.

Prüfung: `tests/build-themes.test.mjs` verwendet den tatsächlich erzeugten Gebäudebestand, prüft alle Facetten und dynamischen Vorschauen, URL-/Kataloggleichheit inklusive Varianten, eigene neue Bauteile, Archivierung und leeren Bestand. Browser-/Touchprüfungen sind getrennt vom Kernnachweis auszuführen.
