# Architekturentscheidungen

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
