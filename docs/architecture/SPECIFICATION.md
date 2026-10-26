# LMNT Minecraft Bauhelfer – Entwicklungsgrundlage

Version 1.0 · 27.10.2026 · Sprache: Deutsch

Status: Ausgearbeitetes Zielbild und technische Spezifikation. Noch keine implementierte oder getestete Anwendung. Die genannten Leistungswerte sind Abnahmeziele, keine Messergebnisse. Arbeitsname: LMNT Build Studio.

## 1. Produkt und durchgängiger Ablauf

Der Bauhelfer verbindet eine modulare Bauteilbibliothek, einen browserbasierten Minecraft-Editor und eine gemeinsame Bauanleitung. Der Nutzer importiert ein Bauwerk, schneidet wiederverwendbare Teile heraus, setzt daraus neue Projekte zusammen und baut diese allein oder im Team nach.

Hauptablauf: Datei importieren → Version und Blockpalette prüfen → Bereich auswählen → Asset speichern → Konnektoren festlegen → Instanzen platzieren → Konflikte auflösen → Bauabschnitte planen → Materialbedarf berechnen → freigegebene Revision exportieren → Fortschritt verfolgen.

Zunächst Minecraft Java Edition. Bedrock erfordert eigene Format-, Registry- und Versionsadapter und gehört nicht zum ersten Umfang. Vanilla und Modpacks werden anhand konkreter getesteter Profile unterstützt. Kompatibilität hängt nicht allein von einer Versionsnummer ab: Registry, Mods, Blockzustände und optional Ressourcenpakete gehören zum Profil.

Der Hafen eignet sich als Pilotprojekt: Kaimauer, Steg, Lagerhaus, Turm, Kran und Dekoration werden separate Module. Die vorhandenen Hafen-Dateien werden bei einer späteren Migration zuerst inhaltlich geprüft; ihre Maße und Materialien werden hier nicht vorausgesetzt.

## 2. Verbindliche Korrekturen gegenüber der Ideensammlung

1. Die Litematica-Dateiendung lautet `.litematic`. Modname und Dateiendung unterscheiden sich.
2. Schematic, Litematic und vollständige Java-Welt sind unterschiedliche Importadapter. Ein GZIP-NBT-Parser allein liest keine komplette Welt korrekt ein.
3. Luft darf im Renderer übersprungen werden. In der Semantik bleiben jedoch leerer Raum, ausdrücklich zu löschende Blöcke und außerhalb der Auswahl liegende Zellen unterscheidbar.
4. Beliebiges Skalieren erzeugt keine zuverlässigen Minecraft-Baupläne. Exportierbar sind zunächst ganzzahlige Verschiebung, Vierteldrehung um Y und definierte Spiegelungen. Länge und Höhe ändern sich später durch segmentierte Generatoren.
5. Drehungen und Spiegelungen betreffen Koordinaten, Blockzustände, Konnektoren, BlockEntities und gegebenenfalls Entities. Unbekannte Transformationen dürfen nicht stillschweigend als korrekt exportiert werden.
6. Redis ist ein entbehrlicher Cache, kein alleiniger Speicher für Originaldateien oder Voxel. Dauerhafte Payloads gehören in Objektspeicher mit Sicherung.
7. Bounding-Box-Überschneidung ist nur ein schneller Vorfilter. Verbindlich wird erst die Prüfung belegter Zellen beziehungsweise ausdrücklich reservierter Räume.
8. Ein Paper-Plugin ersetzt keine NeoForge- oder Fabric-Servermod. Der jeweilige Server braucht einen passenden Adapter.
9. Ein Server-Plugin aktualisiert nicht automatisch die lokalen Litematica-Daten aller Spieler. Client-Overlay und Server-Vorschau sind getrennte Integrationen.
10. Aus Blöcken entsteht zuverlässig eine schichtweise Anleitung. Die fachliche Bedeutung als Kanone, Dach oder Fundament erfordert Annotationen beziehungsweise bestätigte Vorschläge.

## 3. Arbeitsbereiche und Bedienung

### Projektzentrale

Projektkarten zeigen Titel, Vorschau, Minecraft-Profil, räumliche Ausdehnung, offene Aufgaben, Revision und letzten Bearbeiter. Ein neues Projekt beginnt leer, durch Import oder anhand einer Vorlage. Ein lokaler Entwurf funktioniert ohne Konto; Teamprojekte benötigen Anmeldung und projektbezogene Berechtigungen.

### Editor

Links: Projektbaum und Bibliothek. Mitte: 3D-Arbeitsfläche. Rechts: Eigenschaften der Auswahl. Unten: Layer, Aufgaben und Änderungsverlauf. Eine reduzierte Bauansicht blendet Bearbeitungswerkzeuge aus.

- Orbitansicht für Übersicht, freier Flug mit WASD und Maus, Auf/Ab und einstellbare Geschwindigkeit.
- Escape gibt den Mauszeiger frei. Tastenkürzel gelten nicht in Eingabefeldern.
- Draufsicht und vier Seitenansichten, gespeicherte Kamerapositionen, Auswahl fokussieren.
- Koordinatenkreuz, Blockraster, Maßwerkzeug und Trennung lokaler von Weltkoordinaten.
- Mobil: Touch-Orbit, Layer und Aufgaben; komplexe Komposition zuerst für Desktop.
- Status zusätzlich durch Text und Symbole zeigen, damit Farbe nicht die einzige Information bleibt.

### Layer und Filter

Y-Minimum und Y-Maximum sind ganzzahlig, auch wenn sich der Regler flüssig bedienen lässt. Modi: einzelne Schicht, Bereich, bis zur aktuellen Höhe und transparente Nachbarschichten. X- und Z-Schnitte ergänzen den Y-Slicer.

Filter nach Asset, Bauabschnitt, Blocktyp, Palettenrolle, Bearbeiter und Aufgabenstatus. Innenausblendung und Außenhülle sind geometrische Filter. Eine echte Wandansicht benötigt markierte Wandgruppen oder eine bestätigte Erkennung. Verdeckte Blöcke bleiben Bestandteil von Export und Materialbedarf, sofern keine ausdrücklich bezeichnete Auswahl exportiert wird.

## 4. Domänenmodell: Original, Version und Instanz

| Entität | Verantwortung |
|---|---|
| Workspace / Membership | Gemeinsamer Arbeitsraum und Mitgliedschaft |
| CompatibilityProfile | Edition, Zielversion, DataVersion, Registry und Modpackkennung |
| Asset | Dauerhafte Identität, Name, Autor, Sichtbarkeit, Lizenz und Archivstatus |
| AssetVersion | Unveränderliche Geometrie, Metadaten-Snapshot, Palette, Konnektoren, Payload-Hash |
| AssetRelation | Benötigt, kompatibel mit oder Variante von; mit konkreten Versionsbezügen |
| Blueprint | Dauerhafte Projektidentität und ausgewählte aktuelle Revision |
| BlueprintRevision | Unveränderlicher Stand mit Elternrevision, Autor und Kommentar |
| Instance | Stabile Instanz-ID; konkrete AssetVersion, Transformation und Overrides je Revision |
| Group / BuildSection | Strukturbaum und Bauabschnitte, unabhängig von Asset-Dateien |
| Task / TaskDependency | Arbeitsauftrag, Abhängigkeiten, Fortschritt und Planbezug |
| InventorySnapshot | Lagerbestand mit Herkunft und Erfassungszeit |
| ImportJob / ExportJob | Reproduzierbarer Hintergrundauftrag und Ergebnisbericht |
| SyncTarget / SyncDelivery | Zielserver, freigegebener Stand und Zustellung |
| AuditEvent / OutboxEvent | Nachvollziehbare Aktion und zuverlässig zustellbares Ereignis |

Relationale Tabellen halten Beziehungen und Suchfelder; JSONB eignet sich für validierte flexible Eigenschaften. Große binäre Payloads bleiben im Objektspeicher. Tags und Blockhäufigkeiten erhalten eigene indexierbare Beziehungen. Keine SQL-Zeile pro Block als Standardmodell.

Ein Projekt kann zusätzlich eigene Voxel-Patches enthalten. Dadurch werden kleine Änderungen an einzelnen Instanzen möglich, ohne das Bibliotheksoriginal zu verändern. Diese Patches sind explizit versioniert und beim Asset-Update auf Konflikte zu prüfen.

Beispiel eines internen Asset-Manifests; die Bezeichner sind illustrative Beispiele:

```json
{
  "schemaVersion": 1,
  "assetId": "asset_gothic_window",
  "assetVersionId": "av_window_001",
  "versionLabel": "1.0.0",
  "edition": "java",
  "compatibilityProfileId": "profile_project",
  "bounds": { "min": [0,0,0], "maxExclusive": [5,9,2] },
  "pivot": [2,0,0],
  "payloadRef": "payload_window_001",
  "palette": [
    { "id": "minecraft:deepslate_bricks", "properties": {} },
    { "id": "minecraft:gray_stained_glass", "properties": {} }
  ],
  "materialRoles": { "primaryWall": [0], "glass": [1] },
  "connectors": [
    { "id": "left", "position": [0,0,1], "normal": [-1,0,0],
      "up": [0,1,0], "type": "wall_joint", "profile": "wall_2x9" },
    { "id": "right", "position": [5,0,1], "normal": [1,0,0],
      "up": [0,1,0], "type": "wall_joint", "profile": "wall_2x9" }
  ]
}
```

Konnektoren liegen in kontinuierlichen lokalen Grenzkoordinaten auf Flächen. Ein fünf Blöcke breites Modul hat Grenzflächen bei X=0 und X=5; die Blockzellen liegen bei X=0 bis X=4. Diese Unterscheidung verhindert Überlappungen um einen Block. Halbblock-Konnektoren sind zulässig, wenn die resultierende Instanztransformation trotzdem auf das Blockraster passt.

## 5. Einheitliches Voxelmodell

Ein Blockzustand besteht aus vollständiger Namespaced-ID und sortierten Properties. Ein unbekannter Modblock erhält einen sichtbaren Platzhalter, bleibt aber mit seinem ursprünglichen Zustand erhalten. Export in eine unpassende Registry erzeugt einen Kompatibilitätsbericht und erfordert eine aufgelöste Zuordnung.

Payloads enthalten Palette, versioniertes Chunkformat, belegte Zellen, explizite Leer- beziehungsweise Löschmasken, BlockEntities sowie optionale Entities und Biome. NBT-Datentypen werden erhalten: insbesondere dürfen 64-Bit-Werte nicht unbemerkt durch JavaScript-Number gerundet werden. Ein gewöhnlicher JSON-Export braucht dafür eine typisierte Darstellung.

Interne Chunks mit beispielsweise 16³ Zellen erlauben Nachladen, räumliche Indizes und gezielte Neuvernetzung. Das ist eine eigene Produktentscheidung; sie macht die Anwendung nicht vom Chunklayout eines bestimmten Quelldateiformats abhängig. Dichte palettierte Arrays oder dünn besetzte Darstellung werden je Chunk gewählt.

Originaldatei und normalisierter Inhalt erhalten getrennte Prüfsummen. Ein Cache-Schlüssel enthält mindestens Payload-Hash, Generatorversion, Kompatibilitätsprofil und relevante Overrides. Meshes, Vorschaubilder und glTF sind abgeleitete Produkte und niemals die einzige Exportgrundlage.

## 6. Import und Export

### Importpipeline

1. Dateityp anhand Struktur prüfen; Endung allein genügt nicht.
2. Upload, Dekompressionsmenge, NBT-Tiefe, Volumen, Palette und Laufzeit begrenzen.
3. Format und Minecraft-Datenversion erkennen; Mehrregionen-Strukturen und Ursprünge erhalten.
4. In ein einheitliches Voxelmodell übersetzen, ohne unbekannte Daten still zu verwerfen.
5. Blockverteilung, Bounds und Kompatibilitätsprobleme berechnen.
6. Vorschau und Validierungsbericht anzeigen. Leere Ränder nur nach bewusster Auswahl zuschneiden; ursprünglichen Offset erhalten.
7. Bestätigte AssetVersion atomar veröffentlichen. Fehlgeschlagene Jobs hinterlassen keine halbfertigen Assets.

Reihenfolge: Sponge `.schem` v3 zuerst; weitere Sponge-Versionen getrennt validieren; anschließend `.litematic`; vollständige Java-Welten zuletzt. Weltimport verarbeitet bewusst ausgewählte Dimensionen und Bereiche aus einer konsistenten Sicherung. Er lädt nicht ungefragt eine ganze Welt in den Browser.

Für Litematic sind unter anderem Regionspositionen, Größen und palettierte BlockStates zu verifizieren. Implementierung anhand Herstellerquellcode und Testdateien; Details nicht aus der Schematic-Spezifikation ableiten.

### Exportpipeline

Revision fixieren → Abhängigkeiten auflösen → Transformationen anwenden → Overrides und Themes anwenden → Überlappungen prüfen → Palette und Materialzahlen neu aufbauen → Zielprofil prüfen → Zielformat schreiben → Datei erneut einlesen und semantisch vergleichen.

Export enthält einen Bericht über Zielversion, unbekannte Zustände, ausgelassene Daten und Entscheidungen bei Konflikten. Keine stille Konvertierung zwischen inkompatiblen Minecraft-Versionen. Ein universeller DataVersion-Konverter gehört nicht in den ersten Umfang.

## 7. Transformationen und Snap-System

Die autoritative Transformation einer Instanz ist diskret: ganzzahlige Translation, Y-Drehung um 0/90/180/270 Grad sowie definierte lokale Spiegelung. Reihenfolge: lokaler Pivot abziehen, spiegeln, drehen, Weltposition addieren. Die Implementierung verwendet eine gemeinsame Transformationsbibliothek für Renderer, Export und Prüfungen.

Geprüfte Zustandsregeln umfassen unter anderem `facing`, `axis`, richtungsabhängige Verbindungen, Treppenform und orientierte Mehrblockstrukturen. BlockEntities und Entities besitzen eigene Adapter. Unbekannte Richtungssemantik wird als ungelöste Transformation gemeldet. Nicht jede NBT-Zahl ist eine Koordinate.

Snap-Ablauf:

1. Räumlicher Index liefert nahe Konnektoren.
2. Typ, Querschnitt, Profil, erlaubte Verbindung und Kompatibilität prüfen.
3. Kandidaten aus erlaubten Drehungen und Spiegelungen erzeugen.
4. Normale entgegengesetzt und Up-Vektoren passend ausrichten.
5. Translation aus Zielanker minus transformiertem Quellanker berechnen.
6. Gittertreue, Nutzungszahl des Anschlusses und Voxelkonflikte prüfen.
7. Kandidaten nach Abstand und Orientierungsänderung sortieren; stabilen Tie-Breaker verwenden.

Snap-Toleranz wird in Bildschirmnähe und Weltabstand begrenzt. Der Nutzer kann zwischen Kandidaten wechseln und Snapping kurzfristig deaktivieren. Eine Verbindung speichert beide Konnektor-IDs; sie ist mehr als eine zufällige Positionsübereinstimmung.

## 8. Kollisions- und Fundamentprüfung

Breitphase: AABB und räumlicher Index. Feinphase: transformierte belegte Zellen. Gleichartige überlappende Blöcke werden als Duplikat erkannt, unterschiedliche Zustände als Konflikt. Eine explicit gewählte Prioritätsregel kann Konflikte auflösen; der Standard verlangt Klärung. Materialbedarf zählt die resultierende Weltzelle einmal.

Bauraum, Freiraum und technische Minecraft-Kollisionsform sind unterschiedliche Begriffe. Zwei Instanzen mit verschiedenen Blöcken können nicht dieselbe Minecraft-Zelle belegen, auch wenn deren Teilgeometrien sich theoretisch ergänzen würden.

Fundamentprüfung braucht ein Geländeprofil oder eine importierte Umgebung. Ohne diese Daten lautet das Ergebnis „nicht geprüft“. Zusätzlich sind Durchgänge, Türbereiche, Dachüberstände und benötigte Leerräume als reservierte Volumen definierbar. Fehlende Fundamente sind zunächst Warnungen nach deklarierter Regel, keine universelle Aussage über Minecraft-Statik.

## 9. Composer und parametrische Generatoren

Grundwerkzeuge: Einfügen, Verschieben, Drehen, Spiegeln, Duplizieren, Gruppieren, Mehrfachauswahl, Ausrichten, Undo und Redo. Drag-and-drop erzeugt zunächst eine Vorschau; erst Bestätigung schreibt eine Operation.

Linienwerkzeuge verwenden Konnektorabstand statt pauschaler Bounding-Box-Breite. Für verfügbare Länge L, Startlänge S, Endlänge E und Wiederholungsabstand P ergibt sich zunächst n=floor((L-S-E)/P), sofern L≥S+E und P>0. Der Rest wird angezeigt. Erlaubte Ausgleichsmodule, Abstände oder ein verändertes Endziel werden ausdrücklich ausgewählt. Keine Behauptung eines nahtlosen Ergebnisses bei beliebiger Länge.

Erste Generatoren verarbeiten achsenparallele Linien und 90-Grad-Ecken. Andere Winkel erfordern dafür passende Module oder einen gesonderten Voxelgenerator. Kurven, Steigungen, Brückenpfeiler und Dachdetaillierung sind spätere Erweiterungen.

Ein Generator speichert Eingaben, Seed, Generatorversion, Varianten und Ergebnisinstanzen. Dadurch bleiben Vorschau und Export reproduzierbar. Start/Loop/Ende und zulässige Eckmodule bilden die Grundlage für Straße, Mauer, Steg und Brücke.

Themes ersetzen konkrete Zustände über Palettenrollen. Ein Mapping muss Properties und BlockEntity-Kompatibilität prüfen. Beim Wechsel von Holztreppe zu Sandsteintreppe kann die Ausrichtung übernommen werden; von Treppe zu Vollblock ändern sich Geometrie und Regeln. Nach jeder Änderung laufen Material- und Konfliktprüfung neu.

## 10. Bauanleitung und Aufgaben

Baubereich → Modulinstanz → Arbeitsschritt → konkrete Blockmenge. Jeder Schritt enthält Ziel, Koordinaten, Layerbereich, Kameraposition, Blockliste, Voraussetzungen und Prüfkriterien. Schrittgeometrie und Text referenzieren dieselben Daten.

Deterministische Grundlagen: Schichten, Blockgruppen und deklarierte Abhängigkeiten. Optionale KI formuliert verständliche Erläuterungen oder schlägt Gruppen vor; Koordinaten und Materialmengen bleiben rechnerisch ermittelt. Fachliche Reihenfolgen berücksichtigen beispielsweise Untergrund für Schwerkraftblöcke, Mehrblockobjekte und spätere Flüssigkeiten. Unbekannte Regeln werden zur Prüfung markiert.

Aufgabenstatus: offen, bereit, in Arbeit, blockiert, zur Prüfung, erledigt. Verantwortlicher, Reservierung, Kommentar, optional Screenshot und Abnahme sind möglich. Zyklische Abhängigkeiten werden abgewiesen. Tastaturkürzel können den ausgewählten Schritt erledigen und die nächste bereite Aufgabe öffnen.

Fortschritt getrennt anzeigen: erledigte Schritte, geplante Blockmenge und tatsächlich im Spiel geprüfte Blöcke. Manuelles Abhaken ist kein automatisch gemessener Ingame-Fortschritt. Wenn eine neue Revision betroffene Blöcke verändert, braucht die Aufgabe eine erneute Prüfung.

## 11. Material- und Lagerverwaltung

Vier Werte bleiben getrennt: platzierte Blockzustände, benötigte Bauitems, Rezept-Rohstoffe und vorhandener Lagerbestand. Eine Tür, ein Bett, Flüssigkeiten, Doppelstufen oder technisch nicht als Item platzierbare Blöcke verhindern eine pauschale 1:1-Umrechnung.

Berechnung immer auf dem aufgelösten, konfliktfreien Projektstand nach Transformationen und Themes. Filterbereich, Revision und eventuell fehlende Item-Mappings erscheinen im Ergebnis. Stackgrößen stammen aus dem kompatiblen Registryprofil. Mengen werden als Stück, Stacks und optional Lagerkapazität gezeigt.

Bedarf minus nutzbarer Bestand minus bereits reservierte Mengen ergibt den Fehlbestand. Erfassungszeit und Quelle eines Lagerstands sind sichtbar. Automatische Lagerprüfung setzt eine entsprechende Ingame-Anbindung voraus; ein Browser kennt keine privaten Servertruhen ohne diese Integration.

## 12. Versionierung und Zusammenarbeit

AssetVersionen und freigegebene BlueprintRevisionen bleiben unveränderlich. Jede Instanz referenziert eine konkrete Version; „automatisch immer neueste Version“ ist kein Standard. Updates erscheinen als Vorschlag mit Voxel-Diff, Materialänderung, Konnektoränderung und betroffenen Aufgaben.

Ein Update wird zunächst probeweise aufgelöst. Bestehende Verbindungen, lokale Patches, Bauabschnitte und Konflikte werden geprüft. Danach kann der Nutzer ausgewählte Instanzen aktualisieren oder die Version einfrieren. Archivierte Assets bleiben für bestehende Projekte verfügbar; hartes Löschen referenzierter Payloads ist gesperrt.

Der erste Teameditor nutzt serverseitig geordnete Operationen mit `baseRevision` und `operationId`. Bei veraltetem Stand: unabhängige Operationen kontrolliert erneut anwenden oder Konflikt zurückmelden. Keine stillen Überschreibungen desselben Objekts. Anwesenheit und Cursor sind flüchtig, Projektänderungen dauerhaft.

Undo erzeugt im Team eine prüfbare Gegenoperation. Ein gesamtes fremdes Projekt wird nicht auf den eigenen letzten lokalen Snapshot zurückgesetzt. Task-Kommentare und persönliche Kameras brauchen keinen vollständigen Editor-Merge.

## 13. Technische Architektur

Empfehlung als Projektentscheidung: TypeScript für gemeinsamen Domänenkern, React für Bedienoberfläche, Three.js für 3D, Node.js mit separaten Parser-/Export-Workern, PostgreSQL für dauerhafte Beziehungen und Objektspeicher für Binärdaten. Redis erst einsetzen, wenn Cache, Jobs oder verteilte Verarbeitung dies rechtfertigen. Go oder Rust sind gezielte spätere Optionen bei gemessenen Engpässen.

Frontend, API und Worker beginnen als modularer Monolith mit gemeinsamen Schemas, nicht als umfangreiche Microservice-Landschaft. API, Worker und WebSocket-Verbindungen benötigen eine Laufzeit; rein statisches Hosting deckt den gesamten Umfang nicht ab.

Codebereiche: `apps/web`, `apps/api`, `apps/worker`, `packages/domain`, `packages/voxel`, `packages/formats`, `packages/transforms`, `packages/generators`, `packages/contracts`, `integrations`, `fixtures`, `docs`.

Der Renderer startet mit Instancing für einfache Modelle und chunkweisem Meshing. Verdeckte Flächen weglassen, Materialwechsel bündeln, Geometrie nur betroffener Chunks neu berechnen und Sichtweite begrenzen. Greedy Meshing gilt zunächst für passende Vollblockflächen. Treppen, Zäune, Pflanzen, Transparenz und Ressourcenpaketmodelle brauchen gesonderte Darstellung.

Parser und Mesher laufen außerhalb des UI-Hauptthreads. Blockauswahl erfolgt mit Voxel-Raytraversierung oder einer geprüften Picking-Lösung und liefert Instanz-ID, lokale sowie Weltkoordinate. Das Materialinventar stammt aus Voxeldaten, niemals aus den gerade sichtbaren Flächen.

## 14. API und Ereignisse

| Schnittstelle | Zweck |
|---|---|
| POST /v1/import-jobs | Import starten, Limits und Profil prüfen |
| GET /v1/jobs/{id} | Fortschritt, Warnungen und Fehlerbericht |
| GET /v1/assets | Suche nach Stil, Typ, Palette, Maßen und Profil |
| POST /v1/assets/{id}/versions | Neue unveränderliche Asset-Version |
| POST /v1/blueprints/{id}/operations | Geprüfte Änderung mit baseRevision und operationId |
| POST /v1/blueprints/{id}/revisions | Benannten Stand freigeben |
| POST /v1/revisions/{id}/validate | Geometrie und Kompatibilität prüfen |
| POST /v1/revisions/{id}/export-jobs | Fixierte Revision exportieren |
| PATCH /v1/tasks/{id} | Statuswechsel mit Versionsprüfung |
| POST /v1/sync-targets/{id}/deliveries | Revision gezielt zur Vorschau zustellen |

Operationen: `instance.add`, `instance.transform`, `instance.remove`, `instance.override`, `connector.link`, `generator.apply`. Für jede Operation existieren Schema, Rechteprüfung und Audit-Eintrag. Wiederholte Zustellung derselben operationId darf keine zweite Instanz erzeugen.

Ereignisse: `asset.version.published`, `blueprint.revision.published`, `task.ready`, `task.completed`, `inventory.shortage`, `sync.acknowledged`. Eine transaktionale Outbox verhindert verlorene Ereignisse nach erfolgreicher Datenbankänderung. Webhooks enthalten Ereignis-ID, Zeit, Signatur und Retry-Regeln. Discord ist ein optionales Ziel; Erwähnungen sind ausdrücklich konfigurierbar.

## 15. Live-Synchronisation

Stufe A: reproduzierbarer Datei-Export. Stufe B: Serveradapter empfängt ein Manifest einer freigegebenen Revision und bestätigt Prüfsumme, Welt, Dimension und Platzierungsursprung. Stufe C: Client-Mod stellt Overlay und Soll-Ist-Vergleich bereit. Stufe D: optionale geprüfte Übertragung tatsächlicher Blockänderungen.

Server initiieren die Verbindung nach außen. Pro Server begrenztes, widerrufbares Token; keine frei nutzbare Fernkonsole. Zustellungen sind idempotent, Größenlimits gelten auch auf Serverseite. Verbindungsabbruch behält den letzten bestätigten Stand und zeigt die ausstehende Revision.

Paper kann Display Entities für begrenzte Vorschauen verwenden. Große Bauwerke brauchen Sichtbereich, Limits und Lasttests; ein Display pro Block ist keine pauschale Lösung. NeoForge und Fabric erhalten eigene Adapter. Ein eigener Client-Bridge-Mod kann Overlays empfangen; eine direkte Litematica-Integration muss für konkrete Versionen gesondert untersucht werden.

Standard ist Planübertragung, kein automatisches Setzen oder Löschen von Weltblöcken. Tatsächliche Änderungen benötigen einen Dry-Run, ausgewiesenen Bereich, serverseitige Rechte, Mengenbudget, Sicherung und Konfliktprüfung gegen zwischenzeitliche Weltänderungen. Rollback darf spätere fremde Änderungen nicht überschreiben.

## 16. Sicherheit, Betrieb und Offline-Verhalten

Projektrollen: Eigentümer, Planer, Builder und Betrachter. Rechte gelten serverseitig für jede Projekt-, Asset- und Downloadoperation. Öffentliche Bibliotheksassets sind eine bewusste Freigabe mit Autor und Nutzungsrechten.

ZIP-/GZIP-Bombs, Pfadtraversal, übergroße NBT-Strukturen und Parserabbrüche werden im Import isoliert. Importierte Commandblocks und sonstige aktive Daten werden ausgewiesen; das Vorschau- oder Importverfahren führt sie nicht aus. Webhookziele werden gegen interne Netzzugriffe abgesichert. Block- und Texturdaten werden nur mit passenden Nutzungsrechten weitergegeben.

Sicherungen umfassen Datenbank und referenzierte Payloads gemeinsam. Wiederherstellung wird praktisch getestet. Telemetrie erfasst Joblaufzeiten, Fehler, Speichernutzung, Queue-Rückstand und Bildzeiten ohne komplette private Weltinhalte zu protokollieren.

IndexedDB kann lokale Entwürfe und zuletzt benötigte Daten halten. Offline-Änderungen erhalten eine ausstehende Kennzeichnung; „synchronisiert“ gilt erst nach Serverbestätigung. Konflikte beim Wiederverbinden sind sichtbar. Ein Browser kann lokale Dateien nicht ohne Auswahl des Nutzers auslesen.

## 17. Umsetzungsplan mit Abnahme

| Phase | Lieferumfang | Konkretes Abnahmekriterium |
|---|---|---|
| 0 – Kernvertrag | Koordinatenkonvention, Zustandsmodell, Schemas, Fixtures | Vier Vierteldrehungen und zwei gleiche Spiegelungen ergeben semantisch das Original |
| 1 – Lesbarer Plan | Schem-v3-Import, 3D, Flug, Layer, Blockauswahl, Materialien | Testdateien stimmen bei Bounds, vollständigen Zuständen und BlockEntities überein; Warnungen sichtbar |
| 2 – Bibliothek und Composer | Versionierte Assets, Suche, Vierteldrehung, Snap, Kollision, Undo | Turm und Mauer verbinden sich ohne ungeklärte Überlappung; Reload erhält denselben Stand |
| 3 – Baubarer Kreislauf | Schem-Export, Guide, Aufgaben und lokales Speichern | Export erneut importiert ergibt die erwartete aufgelöste Geometrie und Zustände |
| 4 – Team | Konten, Rechte, gemeinsame Aufgaben, Revisionskonflikte | Zwei Clients verlieren bei paralleler Änderung keine still überschriebenen Daten |
| 5 – Erweiterte Werkzeuge | Litematic, Themes, Generatoren, Update-Diff | Mehrregionen-Fixtures und deterministische Generatoren bestehen unabhängige Referenzprüfungen |
| 6 – Spielanbindung | Ein festgelegter Serveradapter, bestätigte Planübertragung | Neuverbindung und doppelte Zustellung ändern das Ergebnis nicht; Weltblöcke bleiben im Vorschaumodus unangetastet |
| 7 – Große Projekte | Selektiver Weltimport, Streaming, Optimierung | Dokumentierte Lasttests auf festgelegter Hardware und Browserprofilen |

Jede Phase liefert einen nutzbaren Zwischenstand. Die erste öffentliche Version braucht Phase 0 bis 3; der gesamte Zielumfang erfordert weitere Releases. Zeit- und Kostenplanung erst nach einem Parser-/Renderer-Prototyp und geklärtem Hostingprofil schätzen.

## 18. Tests und messbare Qualitätsziele

Testdateien enthalten negative Weltkoordinaten, asymmetrische Objekte, Hohlräume, Wasserzustände, Treppen, Türen, Zäune, Schilder, unbekannte Modblöcke, Mehrregionen und beschädigte Daten. Erwartungswerte kommen aus unabhängig erstellten Fixtures beziehungsweise einem Referenzwerkzeug; ein fehlerhafter Reader und Writer dürfen sich nicht gegenseitig bestätigen.

Transformationstests prüfen Gruppenidentitäten und konkrete bekannte Richtungen. Snap-Tests prüfen Bündigkeit, Rollausrichtung und ungeeignete Profile. Materialtests prüfen Duplikate, Türen und Overrides. API-Tests prüfen fremde Projektzugriffe, Wiederholungen und konkurrierende Revisionen. Sicherheitstests prüfen Parserlimits und Abbruch ohne Teilveröffentlichung.

Vorläufige Leistungsziele: flüssige Bedienung bei 100.000 belegten Zellen im festgelegten Desktopprofil; p95-Bildzeit höchstens 33 ms in der definierten Testsituation; Auswahlreaktion unter 100 ms. Eine Million Zellen ist ein gesonderter Lasttest. Alle Messungen benennen Hardware, Browser, sichtbare Flächen, Transparenz und Speicherverbrauch. Keine pauschale FPS-Zusage anhand der Blockzahl allein.

## 19. Erstes konkretes Entwicklungspaket

1. Normatives Koordinaten- und Payload-Schema schreiben.
2. Kleine asymmetrische Testassets mit unabhängig bekannten Ergebnissen erstellen.
3. Schem-v3-Importer mit Grenzen und Fehlerbericht implementieren.
4. Gemeinsamen Voxel-/Transformationskern entwickeln.
5. Desktopviewer mit Flug, Orbit, Layer und Blockinspektor verbinden.
6. Materialzählung aus dem kanonischen Inhalt ergänzen.
7. Schem-Writer und unabhängigen Roundtrip-Test hinzufügen.
8. Danach erst Bibliothekskonto, Teamfunktionen und externe Integrationen auf diesen Kern aufsetzen.

Definition of Done: implementiert, mit passenden Fixtures geprüft, Grenzen dokumentiert und in der Oberfläche verfügbar. Platzhalter, Demo-Daten und angekündigte Funktionen werden als solche bezeichnet.

## 20. Primärquellen und Einordnung

Die Architekturentscheidungen dieses Dokuments sind eigene Vorschläge. Die Quellen belegen einzelne technische Grundlagen; sie sind keine Bestätigung einer bereits entwickelten Anwendung.

- Sponge Schematic v3: https://github.com/SpongePowered/Schematic-Specification/blob/master/versions/schematic-3.md – Dateistruktur, Palette, Blockzustände, DataVersion und BlockEntities.
- Litematica: https://github.com/maruohon/litematica – offizielles Projekt und Grundlage für versionsbezogene Format-/Integrationsprüfung.
- Three.js: https://threejs.org/docs/ – Renderer, Instancing und Steuerungswerkzeuge.
- Paper Display Entities: https://docs.papermc.io/paper/dev/display-entities/ – serverseitige Darstellungsoptionen.

Vor einer konkreten Implementierung werden Abhängigkeiten, Lizenzen und Zielversionen fixiert. Aus diesem Konzept folgt keine Unterstützung beliebiger Minecraft-Versionen oder Modpacks.
