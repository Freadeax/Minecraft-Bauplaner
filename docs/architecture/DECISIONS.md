# Architekturentscheidungen

Status: angenommene Planungsbasis vom 27.10.2026. Das Repository wurde geprüft; bestehender Anwendungscode ist nicht vorhanden. Entscheidungen können mit dokumentierter Begründung geändert werden.

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
