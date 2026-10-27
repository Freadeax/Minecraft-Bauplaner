# Domänenvertrag v1: Bibliothek, Projekte, Zusammensetzung

Stand: 27.10.2026. Implementierung in `packages/domain/src`, Tests in `tests/domain.test.mjs`. Ergänzt den [Voxelvertrag](VOXEL_CONTRACT.md); Koordinaten, Transformationen und Zählung kommen ausschließlich aus `packages/voxel`.

## Identitäten

| Typ | Datei | Regel |
|---|---|---|
| `Asset` | `types.ts`, `library.ts` | dauerhafte Identität mit Name, Beschreibung, Tags, Herkunft (Autor, Quelle, Nutzungsrechte; leer ⇒ „ungeklärt“), Archivstatus, Demo-Kennzeichen und geordneten Versions-IDs |
| `AssetVersion` | `library.ts` | unveränderlich, eingefroren; `payloadHash` = SHA-256 über kanonisches Payload-JSON; `id` = `av_` + SHA-256 über Asset-ID, Bezeichnung, Payloadhash und Anschlüsse. `verifyAssetVersion` berechnet beides neu und erkennt Manipulation |
| `Instance` | `project.ts` | feste Versions-ID (nie „neueste“), diskrete Transformation relativ zum Payload-Pivot, expliziter `override` |
| `Project` | `project.ts` | Instanzen, Anschlussverbindungen, manueller Fortschritt, eingefrorene Revisionen und Speicherrevision für optimistische Nebenläufigkeit |
| `BlueprintRevision` | `project.ts` | eingefrorene Kopie von Instanzen und Verbindungen mit fortlaufender Nummer |

Kanonisches JSON sortiert Objektschlüssel und lehnt `NaN`, `Infinity` und `undefined` ab. `quickHash` ist nur ein schneller Änderungsdetektor (z. B. Schrittgeometrie), nie ein Integritätsnachweis.

## Operationen, Undo und Redo

Jede Projektänderung ist eine `Operation` (`instance.add/remove/transform/update`, `link.add/remove`, `progress.set`, `project.rename`, `batch`). `applyOperation` liefert neues eingefrorenes Projekt plus exakte Gegenoperation; Fehler lassen das Eingangsprojekt unverändert (atomar auch für `batch`). Entfernen einer Instanz entfernt ihre Verbindungen und stellt beides beim Rückgängigmachen in ursprünglicher Reihenfolge wieder her. `execute/undo/redo` verwalten eine sitzungslokale Historie (max. 200 Einträge). Der spätere Teamdienst kann dieselben Operationen mit `operationId`/`baseRevision` ordnen.

## Zusammensetzung und Konflikte

`resolveProject(project, versions)` transformiert jede Instanz über `transformPayload` und baut ein Weltpayload:

- AABB-Überschneidungen werden nur als Vorfilter berichtet (`boundsOverlaps`).
- Verbindlich ist die belegte Zelle. Gleicher Zustand (und gleiches BlockEntity-NBT) ⇒ Duplikat, einmal gezählt.
- Verschiedener Zustand, Luft gegen Block, Löschen gegen Block oder verschiedenes BlockEntity-NBT ⇒ Konflikt.
- Nichts wird still per Reihenfolge entschieden. Nur genau eine Instanz mit `override` gewinnt (`overridden`); zwei Override-Instanzen bleiben ein Konflikt. Für die Vorschau zeigt ein ungeklärter Konflikt die erste Instanz, rot markiert.
- `owners` ordnet jede Weltzelle ihren Instanzen zu (Picking → Instanz).
- `exportBlockers` nennt ungeklärte Konflikte, fehlende Versionen, ungelöste Zustands-/NBT-Transformationen und leere Projekte. Profilabweichungen erscheinen als Hinweis.
- Weltpayload durchläuft die Voxelvalidierung; Grenzüberschreitung wird als `DomainError('LIMIT')` gemeldet.

Material und Export verwenden ausschließlich `resolution.world`, nie sichtbare Meshes.

## Zustandsregel für Vanilla ohne Properties

Vanilla speichert jede Ausrichtung in Blockzustands-Properties. Ein `minecraft:`-Zustand ohne Properties ist daher ausrichtungsfrei und gilt bei Drehen/Spiegeln als gelöst. Mod-Namespaces ohne Properties bleiben ungelöst. Die Registry selbst wird damit nicht geprüft.

## Beispielbauteile

`samples.ts` erzeugt drei eigene synthetische Module (Eckturm 4×8×4, Mauersegment und Tor je 6×5×2) mit Anschlüssen `wall_joint`/`wall_2x5`. Sie sind als Beispiel gekennzeichnet; keine Minecraft-Texturen, kein importiertes Bauwerk. Die Anschlussmaße erlauben einen nachgewiesen überlappungsfreien Verbund (Test „tower and wall joined …“).

## Weboberfläche und Speichergrenze

`apps/web/src/app/repository.ts` definiert die einzige Speicherschnittstelle (`Repository`): Projekte nur mit passender `baseRevision` speichern, sonst `RevisionConflictError`; Versionen sind unveränderlich. Standard ist IndexedDB ([PERSISTENCE](PERSISTENCE.md)); nur wenn der Browser sie verweigert, gilt `MemoryRepository` mit sichtbarem Hinweis „nur diese Sitzung“. Projektunterseiten registrieren sich in `apps/web/src/views/project/tabs.ts` und erhalten eine `ProjectSession` (Projekt, Auflösung, `execute`, Undo/Redo, Speicherstatus, Auswahl). Hash-Routen: `#/`, `#/bibliothek`, `#/betrachter`, `#/projekt/<id>[/<bereich>]`.
