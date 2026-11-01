# Architekturentscheidungen

## Prüfumgebung · Konkretisierung vom 01.11.2026

Die frühere Aussage in ADR-014 über ein extern bereitgestelltes Playwright wird für neue Checkouts ersetzt: Playwright 1.64.1 ist exakt als Entwicklungsabhängigkeit fixiert. Die vorhandene Node-Test-Suite nutzt weiter die [Playwright Library](https://playwright.dev/docs/library); keine Runnerumstellung und kein Laufzeitpaket im Produkt. Chromium wird separat installiert. Windows-Dateipfade werden über `fileURLToPath` aufgelöst, Pythonprüfer mit explizitem UTF-8 gestartet und Textdateien per Git-Attribut auf LF vereinheitlicht. Anlass ist ein tatsächlich fehlgeschlagener frischer Windows-Check, keine Fachkernänderung oder Datenmigration. Rückweg: Setup-/Testwerkzeuge austauschen, ohne gespeicherte Projekte zu ändern. Ablauf und Nachweis: [CODEX_SETUP](../project/CODEX_SETUP.md), [TESTING](../TESTING.md).

Status: angenommene Planungsbasis vom 27.10.2026. Historische Planungsbasis; inzwischen sind Voxel-/Web-/Importkern implementiert. Aktueller Stand in STATUS.md. Entscheidungen können mit dokumentierter Begründung geändert werden.

| ID | Entscheidung | Begründung / Konsequenz |
|---|---|---|
| ADR-001 | Java Edition, Schem v3 zuerst | Begrenzter überprüfbarer Import-/Exportkreis; weitere Formate als Adapter |
| ADR-002 | Gemeinsamer TypeScript-Domänenkern | Koordinaten, Material und Export folgen identischen Regeln |
| ADR-003 | React/Three.js plus Browser-Web-Workers zuerst | GitHub Pages als statisches Ziel; Node-Worker erst für einen separaten späteren Dienst |
| ADR-004 | Lokale Projekte zuerst; PostgreSQL/Objektspeicher für späteren Teamdienst | Kein Serverzwang für Pages; Teamdaten benötigen einen separat betriebenen Dienst |
| ADR-005 | Unveränderliche Versionen und explizite Instanzen | Reproduzierbare Pläne und kontrollierte Updates |
| ADR-006 | Diskrete Transformationen und semantische Zustandsadapter | Export bleibt auf dem Minecraft-Raster korrekt |
| ADR-007 | Chunkweise Daten und Geometrie | Selektives Laden, Prüfen und Neuvernetzen |
| ADR-008 | Servergeordnete Operationen vor freiem CRDT-Editor | Konflikte klar behandeln, Komplexität begrenzen |
| ADR-009 | Datei-Export vor Live-Sync | Zuerst korrekten Plan nachweisen; Integrationen separat testen |
| ADR-010 | Lokaler Entwurf ohne Konto | Einstieg möglich; Teamrechte erst für geteilte Daten |

Bei Umsetzung eines ADR: konkrete Versionen und Prüfnachweise ergänzen. Änderungen dokumentieren Anlass, Alternativen, Datenmigration, Tests und Rückweg. Ein ADR ersetzt keine Messung oder Quellenprüfung.

## Konkretisierung · P0-02/P0-03 · 27.10.2026

- ADR-002: TypeScript 5.9.3 als exakt fixierte Entwicklungsabhängigkeit mit npm-Lockfile. Kein Laufzeitpaket; Standard-Node-Testläufer, strict plus noUncheckedIndexedAccess/exactOptionalPropertyTypes. Paketversion und Integrität vor Installation über die npm-Registry abgefragt. Keine Aussage, dass diese Version die neueste ist.
- ADR-006: [Voxelvertrag v1](VOXEL_CONTRACT.md) mit Grenzpunktpivot und Zellmittelpunkttransformation. Unbekannte Zustände/NBT bleiben erhalten und ungelöst. Expliziter kleiner Katalog statt heuristischer Propertytransformation.
- ADR-007: Sparse JSON-Austauschdaten zuerst; konkretes Chunkformat folgt gemessenen Anforderungen. Chunkarchitektur bleibt Ziel, wird nicht als implementiert ausgegeben.
- Vorläufig keine nicht-endlichen/signed-zero Gleitkomma-NBT-Daten; statt stiller Normalisierung erfolgt Ablehnung. Bei Bedarf additive Vertragserweiterung mit expliziter IEEE-Bitdarstellung vor Binärimport.
- Rückweg: Kern ohne Datenmigration ersetzbar, weil noch keine produktiven gespeicherten Payloads existieren. SchemaVersion 1 bleibt ausdrücklich begrenzt; keine unerkannten zusätzlichen Felder übernehmen.

## ADR-011 · angenommen · 27.10.2026 · GitHub Pages

Expliziter Nutzerzusatz ersetzt das offene Frontend-Hostingprofil: [statisches GitHub-Pages-Ziel](HOSTING.md). Browser-Worker statt vorausgesetzter Node-Import-API für die erste Fassung. Lokaler Build und Branchpublishing mit `.nojekyll`, keine eigenen Actions. GitHubs interner Pages-Deploy bleibt technisch erforderlich. Backendanbieter, Kontotarif und tatsächlicher Deploymentzugriff sind nicht bestätigt; Repository nicht automatisch öffentlich schalten. Alternative eines verpflichtenden Node-Hostings verworfen, da sie dem gewünschten Websitehosting widerspricht. Kein Datenmigrationsbedarf.

## Webbuild-Konkretisierung · 27.10.2026

React/React DOM 19.3.1, Three.js 0.186.1, Vite 8.3.5 und passende Typen per npm-Registry auf Version/Engine/Lizenz geprüft und exakt fixiert. Primärdokumentation für Vite-Unterpfad und Three.js-OrbitControls geprüft. Lokaler Build statt eigener Actions. Runtime-MIT-Lizenzen werden als THIRD_PARTY_NOTICES.txt mitgeliefert. Synthetische Beispieldaten aus eigenem Generator, keine fremden Minecraft-Texturen. Erstes Rendering bewusst auf farbige Einheitswürfel begrenzt.

## ADR-012 · Begrenzter Schem-Reader mit getrenntem Originalerhalt

27.10.2026: Browser-DecompressionStream statt neuer Laufzeitabhängigkeit; eigener begrenzter Big-Endian-NBT-Reader nach Java-DataInput und Sponge-v3-Schema. Quell-NBT/komprimiertes Original bleiben separat vom Voxel-Snapshot. BlockEntities erhalten vollständigen Wrapper. Nicht darstellbare Gleitkommafälle werden abgewiesen. Unabhängiger Python-struct-Fixturewriter; kein JS-Writer, der den Reader nur selbst bestätigt. JSON-Sicherung ausdrücklich nicht als vollständige Format-/Projektsicherung ausgeben. Details in SCHEM_IMPORT.md.

## ADR-013 · Domänenkern und Zusammensetzung · 27.10.2026

Neues Paket `packages/domain` ohne Laufzeitabhängigkeit. AssetVersion-ID aus SHA-256 über Inhalt statt Zufalls-ID: Duplikate werden erkannt, Wiederherstellung kann Manipulation prüfen. Operationen mit exakter Gegenoperation statt Snapshot-Undo: kleiner Speicher, später direkt als Teamoperation nutzbar. Konflikte per Zellmap statt paarweisem Vergleich; AABB nur als Bericht. Alternative „letzte Instanz gewinnt“ verworfen (verstößt gegen „nichts still per Reihenfolge“). Vanilla-Zustände ohne Properties gelten als ausrichtungsfrei (Begründung in [DOMAIN](DOMAIN.md)). Kein Datenmigrationsbedarf.

## ADR-014 · Hash-Router, Speicherschnittstelle, parallele Blöcke · 27.10.2026

Hash-Routen funktionieren auf Pages ohne Server-Rewrite. Eine einzige `Repository`-Schnittstelle mit `baseRevision`-Pflicht trennt UI und Speicher; IndexedDB folgt in B3 ohne UI-Umbau. Projektbereiche registrieren sich in einer Tab-Registry, damit parallele Blöcke unterschiedliche Dateien besitzen ([BLOCKS](../BLOCKS.md)). Pages-Veröffentlichung über `scripts/publish_pages.sh` (lokaler Build, Commit nur des Artefakts auf gh-pages, kein Force, Schutz gegen Verdrängen eines neueren Stands). Browserprüfung mit lokal vorhandenem Playwright/Chromium, nicht als Projektabhängigkeit fixiert.

## ADR-015 · angenommen · 27.10.2026 · Spielbrücke

Mod liest nur und liefert eine Ist-Aufnahme als Sponge Schem v3 mit `Metadata.Bauplaner.Kind = "scan"`; Soll/Ist-Vergleich und Zuordnung zu Bauschritten ausschließlich im TypeScript-Domänenkern. Alternative „Vergleich in der Mod“ verworfen (zweite Schritt-/Zähllogik). Übertragung zuerst per Datei, lokale Loopback-Verbindung optional; Server-API erst mit Teamdienst. Nutzerentscheidung: Fabric-Client-Mod, Start mit Minecraft 26.3, weitere Versionen über versionsneutralen Kern, kein WorldEdit. Details: [MOD_BRIDGE](MOD_BRIDGE.md).

## ADR-016 · Anwendungsschicht und ausführbare Paketgrenzen · 01.11.2026

Exportkoordination und Aufnahmeverwaltung liegen in `packages/application`; Repositoryports ebenfalls. Die Domäne enthält nur reine Revisions-/Profilregeln und importiert keine Formatwriter mehr. Der neutrale Aufnahmevertrag liegt im Voxelpaket. Web-Kompatibilitätsexporte erhalten bestehende Aufrufer und Fehleridentitäten; keine Datenmigration erforderlich. Alternative einer Domain→Application-Rückexportbrücke verworfen, weil sie die Abhängigkeit wieder umkehren würde. Erlaubte Paketmatrix und Regressionen: [MODULES](MODULES.md).

## ADR-017 · Eine Roadmapquelle mit überprüfbarem Fortschritt · 01.11.2026

`docs/roadmap.json` ist die technische Quelle für Aufgaben, Teilschritte, Abhängigkeiten, Nachweise und angehängte Fortschrittsereignisse. ROADMAP.md und ROADMAP_HISTORY.md werden daraus erzeugt und vor jedem Quellupdate validiert. Keine geschätzten Prozentwerte; Implementierung, Prüfstand, Main und Pages getrennt. Lokaler Pre-Push-Hook und Publisher verlangen dateibezogene Fortschrittspflege. Ohne eigene Actions kann dies externe Clients/API-Schreibzugriffe nicht serverseitig erzwingen; AGENTS und Konnektor-Runbook verpflichten zur gleichen Vorprüfung. Alte Dokumente bleiben ausdrücklich historische Quellen. Selbstreferenzielle Deployment-Updates werden durch Manifestnachweis statt Folgecommit vermieden.

## ADR-018 · Lokale Assetrevision und atomarer Konfliktabbruch · 01.11.2026

STORE-02 ergänzt eine additive Speicherrevision am Asset. CAS-Basis ist die beim Beginn eines Entwurfs gelesene Revision; AssetVersion- und Geometriehashes bleiben davon getrennt. Anwendungsschicht prüft Revisions-/Batchregeln, IndexedDB entscheidet und schreibt innerhalb einer Transaktion, MemoryRepository folgt demselben Vertrag. Neue DB-Migration v2, alte Sicherungen ohne Feld weiterhin gültig. Automatisches Zusammenführen konkurrierender Metadaten oder Versionslisten verworfen: fachliche Absicht wäre dabei unbekannt. Details und offene echte Browserabnahme: [ASSET_CONCURRENCY](ASSET_CONCURRENCY.md).

## ADR-019 · Snapshotgebundene Rechenaufträge mit echtem Abbruch · 01.11.2026

PERF-01 nutzt einen gemeinsamen Anwendungsschicht-Rechenfall und einen kurzlebigen Browser-Modulworker pro aktivem Auftrag. Job-/Projekt-/Revisions-/Basis-Tags und Eingabesnapshot-Identität verhindern verspätete Übernahme. Beenden des Workers unterbricht auch synchrone Fachkernschleifen. Bei Workerfehlern wird kein synchroner Ersatz auf der UI ausgeführt. Bauanleitung, Materialien und Baustelle verwenden ein gemeinsames Ergebnis; historische Revisionen bleiben getrennt. Allgemeiner Workerpool, Transferpuffer und selektiver Cache werden erst nach gesondertem Übertragungs-/Invalidierungsnachweis eingeführt. Node- und offene Browserabnahme sind in [PROJECT_COMPUTATION](PROJECT_COMPUTATION.md) getrennt.

## ADR-020 · Blockformen und Texturen ohne mitgelieferte Mojang-Dateien · 01.11.2026

VIEW-02 zeichnet Blöcke nach Blockzustand in Minecraft-Form. Texturen und Modelle lädt ausschließlich der Browser des Nutzers: offizielle Client-Jar direkt von Mojangs Servern (SHA-1-geprüft) oder eigene Jar/Ressourcenpakete/Mod-Jars; gespeichert nur lokal in IndexedDB. Repository und Pages enthalten nur abgeleitete Fakten (IDs, Property-Werte, Durchschnittsfarben, Silhouetten) und eigene Ersatzformen. Verworfen: Texturen mitliefern (keine Rechte), Proxy über eigenen Server (Weiterverbreitung, kein Server vorhanden), nur Würfel (Nutzerauftrag). Kein Datenmigrationsbedarf; Ansichten erhalten Markierungen (`markFor`) statt Farbfunktionen. Details: [BLOCK_MODELS](BLOCK_MODELS.md).
