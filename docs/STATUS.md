# Projektstand

Stand: 28.10.2026. Fundament (B0) und die Blöcke B1–B7, B9 (mit Katalog v2), B10, B11 (Oberfläche), B12 (Schem-Ansichten, Bauversionen), B14 (Baustelle) und S1 (Stabilität) sind auf main, B8 (Spielbrücke) läuft; Plan in [Blockplan](BLOCKS.md). Danach Ausbau offener Punkte (Itemspalte, Katalog v2, Farben, Händigkeit, Ziehen).

| Bereich | Implementiert / bestätigt | Offene Grenzen |
|---|---|---|
| Repository | öffentlich, main als Integrationslinie, reguläre Mainfreigabe | keine Force-Pushes |
| Website | statischer React-/Three.js-Build auf Pages, Quelle main / Repositorywurzel, Hashmanifest | keine eigenen Actions; kein Hintergrundmonitor |
| Datenkern | validierte unveränderliche Voxel, diskrete Geometrie, expliziter Vanilla-Zustandskatalog (77 Familienregeln, 598 IDs, Java 1.21.4 manuell) | Registry-Report-Abgleich, BlockEntity-NBT-Transformation, Modprofile offen |
| Import | GZip, Big-Endian-NBT und Sponge v3 im Worker, vollständige Blockzustände und BlockEntities | konservative Limits; keine alten Schematic-/Litematic-/Weltformate |
| Datenerhalt | komprimiertes Original, Quell-NBT, Offset, DataVersion, Metadata/Entities/Biome getrennt erhalten | keine Registry-/Modpackfreigabe aus DataVersion ableiten |
| Ansicht | Orbit/Zoom, freier Flug, Drauf-/Seitenansichten, Parallelprojektion, Fokus, Picking mit Welt-/Lokalkoordinate, Schichten Alles/Bereich/Einzeln, Touchsteuerung, nur sichtbare Flächen, three.js nachgeladen, Softwareansicht ohne WebGL, Vorschaufarben je Materialfamilie, Greifen/Ziehen mit Platzierungsumriss ([Viewer](architecture/VIEWER.md)) | keine exakten Blockmodelle; echte GPU-/Mobilgeräte offen |
| Mengen | Blockzustände/Luft/Löschzellen getrennt; Bauitems mit Mehrblock-/Stufen-/Anzahl-/Wandregeln, Stacks und Shulkerkisten im Tab „Material“, Katalog v2 mit Stein-/Kupfervarianten ([MATERIALS](architecture/MATERIALS.md)) | keine Rohstoff-/Rezeptauflösung; Katalog nicht an exakte Version gebunden |
| Speicherung/Export | Voxel-JSON und unverändertes Schem-Original herunterladbar; Tab „Export“ schreibt Sponge Schem v3 aus eingefrorener Revision mit Exportsperre, Luft-/Lösch-/Lückenpolitik, Offset und Bericht (B2) | keine echte WorldEdit-/Spielabnahme, DataVersion ungeprüft |
| Bibliothek | Assets mit Herkunft/Tags/Archiv, unveränderliche inhaltsadressierte Versionen, Suche, Dateiimport als Bauteil, [Anschluss-Editor und Bereich als Bauteil](architecture/CONNECTORS.md) (B5); Gebäudekatalog v2 mit 150 Gebäuden in zehn Themen-Sets, 12 Variantenfamilien, Spielphase, Bautipps und 9 Ensembles ([CATALOG](architecture/CATALOG.md)); Katalogoberfläche mit Vorschaubildern, Detailseiten, Vergleich und Merkliste ([UI](architecture/UI.md)); seit B12 174 Gebäude, Schem-Ansicht mit neun Blickwinkeln, Schnitt und Bauplan je Ebene, Bauversionen mit Vergleich A/B und Materialvarianten, teilbare Suche in der Adresse ([SCHEM_VIEWS](architecture/SCHEM_VIEWS.md)) | Redstone-Module nicht im Spiel abgenommen |
| Projekte/Composer | Projektzentrale, Instanzen einfügen/verschieben/drehen/spiegeln/duplizieren, Undo/Redo, Voxelkonflikte mit Override, Konfliktbericht, Revisionen im Kern, Snap mit Konfliktprüfung und gespeicherten Verbindungen (B5), Händigkeit unsymmetrischer Profile, Andocken per Ziehen im 3D-Bild | Freiräume an Anschlüssen, Mehrfachauswahl |
| Dauerhafte Speicherung (B3) | IndexedDB mit Schema-Migration, atomaren Transaktionen, `baseRevision`-Konflikt bei zwei Tabs, Tab-übergreifender Aktualisierung, sichtbaren Speicherfehlern; Originaldateien als Blobs; Projekt-/Gesamtsicherung mit SHA-256-Prüfsummen, Vollständigkeitsprüfung und Wiederherstellung ohne stilles Überschreiben ([PERSISTENCE](architecture/PERSISTENCE.md)) | keine Cloud-/Gerätesynchronisierung; Browser kann Daten ohne gewährte Dauerhaftigkeit löschen; Safari/iPhone ungeprüft |
| Bauanleitung (B4) | Tab „Bauen“: Schritte je Instanz × Y-Schicht × Phase mit stabiler ID, Prüfkriterium, Voraussetzungen ohne Zyklen, Schwerkraft/Anbringung/Flüssigkeiten zuletzt, manuelle Haken mit Geometriehash ⇒ prüfbedürftig, Schichtdraufsicht, Bauitems je Schritt und Packliste je Schicht, mobile Ansicht ([GUIDE](architecture/GUIDE.md)) | Abschnitt = Instanz |
| Spielbrücke (B8) | Konzept [MOD_BRIDGE](architecture/MOD_BRIDGE.md); Tab „Bauen“ importiert Spielaufnahmen (Schem v3 mit `Kind=scan`), vergleicht jede Zelle mit der Revision und zeigt Spielstatus je Schritt, Abweichungen und Schichtmarkierungen; bestätigte Schritte nur auf Klick abhaken ; Mod-Kern (Java) mit Tests und sprachübergreifender Prüfung, Fabric-Adapter 26.3 als Quelltext ([Mod](../mods/bauplaner-bridge/README.md)) | Fabric-Adapter noch nicht kompiliert/im Spiel geprüft (Netzwerksperre); Aufnahme samt Original, Verlauf und Ausrichtung lokal gespeichert und gesichert (B8P); Vergleich ohne BlockEntity-Inhalte
| Litematic (P5-01) | Import `.litematic` Format 2–7 mit mehreren Regionen, negativen Größen und Einzelregionswahl in Bibliothek/Betrachter; Export aus Revision als `.litematic` (Format nach DataVersion) ([LITEMATIC](architecture/LITEMATIC.md)) | keine Abnahme mit echter Litematica-Datei im Spiel; Entities/Ticks nur im Original |
| Team | Architektur geplant | nicht implementiert |
| Stabilität (S1) | Absturzschutz je Seite mit Fehlerbericht, Fehlerprotokoll der Sitzung, Systemcheck `#/system` (Auslieferung gegen Hashmanifest, Browserfähigkeiten, Speicher), Datencheck aller gespeicherten Datensätze ohne Reparatur, Großmodelle 2–4× schneller, Importvorschau im Bild ([STABILITY](architecture/STABILITY.md)) | Absturzschutz nicht mit echtem Zeichenfehler im Browser ausgelöst; nur Chromium |
| Prüfungen | 310 Node-Tests im letzten integrierten Stand; strict Kern/Web, Builds und Dokumentationsprüfung bestanden | aktuelle Browserausführung mangels Chromium offen; frühere Browserläufe historisch, echte Referenzwerkzeug-/Spielabnahme offen |

## Maßgebliche Einzelheiten

- [Strukturierte Prüfung aller Anforderungen](REVIEW.md)
- [Schem-Importvertrag, Limits und Datenerhalt](architecture/SCHEM_IMPORT.md)
- [Schem-v3-Export, Politik und Prüfung](architecture/SCHEM_EXPORT.md)
- [Litematic-Import und -Export](architecture/LITEMATIC.md)
- [Prüfprotokoll](TESTING.md)
- [Roadmap](ROADMAP.md)

Website: https://freadeax.github.io/Minecraft-Bauplaner/ . Der aktuelle ausgelieferte Quellstand steht in deployment.json. Importbericht nennt Hash, Offset, DataVersion und nicht dargestellte Zusatzdaten. Voxel-JSON ist nur die Blockansicht; vollständige Quelle über Original-Schem sichern.

## Aktueller Arbeitsstand

B0 (Fundament) ist auf main. Domänenvertrag: [DOMAIN](architecture/DOMAIN.md). Die Blöcke B1–B9 mit Dateizuständigkeiten, Regeln und Abnahmen stehen in [BLOCKS](BLOCKS.md). Veröffentlichung nach jedem Main-Push mit `scripts/publish_pages.sh`.

B9 Gebäudekatalog (v2 seit 28.10.2026): Bibliothek mit 150 mitgelieferten Gebäuden plus den drei Modulen, Variantenfamilien, Spielphase, Ensembles als fertige Anlagen, Steckbrief mit Angaben und berechneten Kennwerten, Filter, Bauplatz, Sortierung, Vorschläge für ein Projekt und Übernahme ins Projekt. Siehe [CATALOG](architecture/CATALOG.md).

Ausbau offener Punkte (27.10.2026): Itemspalte und Packliste in der Bauanleitung, Itemkatalog v2, Vorschaufarben je Familie, Händigkeit an Anschlüssen, Andocken per Ziehen. Offen bleiben u. a. Safari/iPhone-Prüfung der Speicherung (in der Cloud nur Chromium), Freiräume an Anschlüssen, frei definierte Bauabschnitte, Rohstoffe/Rezepte.

B11 Oberfläche (28.10.2026): Bibliothek als Katalog mit isometrischen Vorschaubildern, Kategorieleiste, Filterspalte mit Chips, Detailseite je Gebäude, Ensembles als Bildkarten, Vergleich bis vier Gebäude, Merkliste, „Überrasch mich“; Projektzentrale mit Projektbildern und Vorlagen. Details [UI](architecture/UI.md).

B14 Baustelle (28.10.2026): Tab „Baustelle“ mit Fortschrittsübersicht, eigenen Bauabschnitten, Lagerbestand und Sammel-/Farmplan je Abschnitt, Freiraum an Anschlüssen; „vorhanden“ im Material-Tab wird gespeichert. Details [SITE](architecture/SITE.md).
S1 Stabilität (28.10.2026): Kamera-Fehler nach Dateiimport behoben (3D-Fläche wuchs mit dem Importbericht), Absturzschutz und Fehlerprotokoll, Systemcheck mit Auslieferungs- und Datencheck, Leistung großer Modelle (605 568 Blöcke: Zusammensetzen 17 s → 4–5 s). Details [STABILITY](architecture/STABILITY.md).


B13 Parametrische Generatoren (28.10.2026): Bibliotheksreiter „Generatoren“ mit Haus, Turm, Mauer, Brücke, Dach nach Maß, Stil und Details; Anlagen Burganlage und Häuserzeile als Projekt; Parameter in der Version gespeichert und nachrechenbar. Details [GENERATORS](architecture/GENERATORS.md).

S2 Bibliothekseinstellungen (31.10.2026, lokal vorbereitet): Merkliste/Vergleich/Blickrichtung verlieren bei gesperrtem oder vollem localStorage keine Änderungen mehr während der laufenden Seite. Tab-Synchronisierung berücksichtigt Löschen/Leeren; Listen werden bereinigt. 285 Node-Tests, Typprüfung, Build und Dokumentationsprüfung bestanden. Vollständige Browserprüfung blockiert durch fehlendes Playwright-Chromium; Vorschau zusätzlich durch Vite-Hostfreigabe blockiert. Auf main integriert (`d5869c1`), Pages-Artefaktbranch aktualisiert; Browsergrenzen bleiben ausgewiesen.

## Parallelfortsetzung · 31.10.2026

B8P speichert Spielaufnahmen atomar mit dem Projekt, lädt den letzten Stand erneut und erhält Originale in Sicherungen. S3 prüft Bauteildatensätze vollständig und berechnet fehlende Originale aus den tatsächlichen Referenzen. B15-L stellt einen getesteten generischen Livekarten-URL-/Markeradapter bereit; noch keine Weltkartenoberfläche und kein natives Provider-Markerformat. Gesamtprüfung nach diesen Blöcken einschließlich Main-only-Publisher: 310 Node-Tests, Typprüfung, Build und Dokumentationsprüfung bestanden. Neue Browserregression vorbereitet, Chromium weiterhin nicht verfügbar.

Branchbereinigung: sieben alte Arbeitsbranches inhaltlich vollständig in main enthalten. Main-only-Pages-Migration wird vorbereitet; gh-pages darf erst nach bestätigter Umstellung der Pages-Quelle entfernt werden.

Main-only-Publisher und sichere Artefaktzusammenführung sind implementiert (sieben Tests). Aktivierung und Entfernung der sieben alten Arbeitsbranches bleiben offen: Konnektor ohne Lösch-/Pages-Konfigaktion, Browseranmeldung nicht abgeschlossen. Alle geprüften Quellinhalte sind auf main enthalten; die ursprüngliche gesquashte WIP-Historie wird bei der Integration zusätzlich als Merge-Elternschaft erhalten.

Korrektur Hosting (31.10.2026): aktuelle interne Buildlogs bestätigen bereits main / root; keine Einstellungsmutation erforderlich. Aktiver Publisher auf Main-Artefaktcommit umgestellt. Root-Build wird unmittelbar ergänzt und live geprüft. Browseranmeldung betrifft nur noch die nicht verfügbare Branchlöschung.

## Strukturpflege · 31.10.2026

README beschreibt die implementierten Module statt des initialen Fundaments. Pages arbeitet bereits auf main/root; ältere Abschnitte zur bevorstehenden Quellenmigration sind historisch überholt. Nur Branchlöschung bleibt mangels Konnektorfunktion offen. Der Livekartenkern kann sein eigenes Markerformat nun strikt wieder einlesen (keine Kartenoberfläche, keine Provideranbindung).
