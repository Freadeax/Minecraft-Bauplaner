# Architekturentscheidungen

Status: angenommene Planungsbasis vom 27.10.2026. Das Repository wurde geprüft; bestehender Anwendungscode ist nicht vorhanden. Entscheidungen können mit dokumentierter Begründung geändert werden.

| ID | Entscheidung | Begründung / Konsequenz |
|---|---|---|
| ADR-001 | Java Edition, Schem v3 zuerst | Begrenzter überprüfbarer Import-/Exportkreis; weitere Formate als Adapter |
| ADR-002 | Gemeinsamer TypeScript-Domänenkern | Koordinaten, Material und Export folgen identischen Regeln |
| ADR-003 | React/Three.js plus Node-Worker | Gemeinsame Sprache; CPU-Arbeit blockiert die Oberfläche nicht |
| ADR-004 | PostgreSQL plus dauerhafte Payloads im Objektspeicher | Relationen und große Binärdaten getrennt; Redis optional |
| ADR-005 | Unveränderliche Versionen und explizite Instanzen | Reproduzierbare Pläne und kontrollierte Updates |
| ADR-006 | Diskrete Transformationen und semantische Zustandsadapter | Export bleibt auf dem Minecraft-Raster korrekt |
| ADR-007 | Chunkweise Daten und Geometrie | Selektives Laden, Prüfen und Neuvernetzen |
| ADR-008 | Servergeordnete Operationen vor freiem CRDT-Editor | Konflikte klar behandeln, Komplexität begrenzen |
| ADR-009 | Datei-Export vor Live-Sync | Zuerst korrekten Plan nachweisen; Integrationen separat testen |
| ADR-010 | Lokaler Entwurf ohne Konto | Einstieg möglich; Teamrechte erst für geteilte Daten |

Bei Umsetzung eines ADR: konkrete Versionen und Prüfnachweise ergänzen. Änderungen dokumentieren Anlass, Alternativen, Datenmigration, Tests und Rückweg. Ein ADR ersetzt keine Messung oder Quellenprüfung.
