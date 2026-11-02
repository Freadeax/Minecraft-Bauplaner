# Planmodell: Datensätze, Verweise und Blockdatenspeicher

Stand: 02.11.2026 · ARCH-02 (mit STORE-03). Code: `packages/domain/src/planGraph.ts`, `packages/domain/src/versionStorage.ts`, `packages/voxel/src/packedCells.ts`. Tests: `tests/plan-model.test.mjs`, `tests/e2e/plan-model.e2e.mjs`. Ergänzt [DOMAIN](DOMAIN.md), [MODULES](MODULES.md) und [PERSISTENCE](PERSISTENCE.md).

Ziel: Bibliothek, Werkstatt, Baustelle, Welt und Mod wachsen auf **einer** Grundstruktur. Jeder Bereich darf eigene Felder ergänzen, aber Verweise zwischen Datensätzen und die Speicherform der Blockdaten sind hier einmal festgelegt.

## Gespeicherte Datensätze

| Datensatz | Speicher (IndexedDB) | Identität | Schema | Gehört zu Bereich |
|---|---|---|---|---|
| Projekt `Project` | `projects` | `id`, `revision` (CAS) | `schemaVersion` 1 + optionale Teilschemata | alle Projektreiter |
| · Baustelle `project.site` | im Projekt | – | `SITE_SCHEMA_VERSION` 1 | Baustelle, Bauführung |
| · Abschnittsstände `site.snapshots` | im Projekt | `id` | über `checkSite` | Sicherungen (BACKUP-02) |
| · Weltlage `project.world` | im Projekt | – | `WORLD_SCHEMA_VERSION` 1 | Weltkarte, Bauführung, Mod-Anker |
| · Updates `project.updates` | im Projekt | – | `UPDATES_SCHEMA_VERSION` 1 | Updates (UPDATE-01) |
| · Aufnahmen `scanHistory`, Gelände `terrain` | Verweis, Bytes in `originals` | SHA-256 | Gelände `SURVEY_SCHEMA_VERSION` | Spielabgleich, Gelände |
| Bauteil `Asset` | `assets` | `id`, `revision` (CAS) | 1 | Bibliothek |
| Bauteilversion `AssetVersion` | `versions` (Zellen gepackt) | Inhaltsadresse `av_…` | 1, Payload 1 | Bibliothek, Werkstatt, Generatoren, Import |
| Originaldatei | `originals` | SHA-256 | – | Import, Aufnahmen, Gelände |
| Sammlung `Collection` | `collections` | `id`, `revision` | `LIBRARY_RECORD_SCHEMA` 1 | Bibliothek (LIB-02) |
| Vorlage `LibraryTemplate` | `templates` | `id`, `revision` | 1 | Bibliothek (LIB-03) |
| Sicherungsbelege | `meta` (`backupLedger`) | – | `BACKUP_LEDGER_SCHEMA` | Sicherungsstand |

Anlagen (BUILD-05), Bauwelten, Ensembles und Generatoren sind **Programmdaten**, keine gespeicherten Datensätze. Sie erzeugen Projekte oder Versionen ausschließlich über ausdrückliche Nutzeraktionen; danach gilt nur der gespeicherte Datensatz. Die Mod liest Projekte über Exportdateien und schreibt nie direkt in den Speicher.

## Verweisgraph

`buildPlanGraph({ projects, assets, versions, collections?, templates?, originalHashes? })` kennt jeden Verweis mit **Rolle** und **Pflichtgrad**:

| Von | Rolle | Ziel | Pflicht | Bedeutung bei fehlendem Ziel |
|---|---|---|---|---|
| Projekt | `instance`, `revision`, `update-log` | Version | ja | Projekt nicht darstell-/exportierbar; Sicherung verweigert |
| Projekt | `pin` | Version | nein | Warnung, im Reiter „Updates“ lösen |
| Projekt | `section-snapshot` | Version | nein | Warnung, Stand nicht vollständig wiederherstellbar |
| Projekt | `scan`, `terrain` | Original | nein | Warnung (bisheriger Datencheck) |
| Bauteil | `version-list` | Version | ja | Fehler (bisheriger Datencheck) |
| Version | `version-asset` | Bauteil | ja | Warnung (bisheriger Datencheck) |
| Version | `original-file` | Original | nein | Warnung, Originalexport nicht möglich |
| Version | `edited-from` | Version | nein | Hinweis |
| Version | `local-to` | Projekt | nein | Hinweis |
| Sammlung | `collection-asset`, `collection-version`, `collection-template` | Bauteil/Version/Vorlage | nein | Warnung |
| Sammlung | `collection-parent` | Sammlung | nein | Hinweis, Sammlung erscheint oben |
| Vorlage | `template-member` (aktueller Stand) | Version | ja | Fehler, Vorlage nicht übernehmbar |
| Vorlage | `template-member` (Verlauf) | Version | nein | Hinweis |

Verbraucher:

- `referencedVersionIds` (Sicherung, Wiederherstellung, Datencheck) = Pflichtverweise eines Projekts (`projectVersionIds(p, true)`). Damit bleibt die Wiederherstellung älterer Sicherungen unverändert streng, aber nie strenger.
- `createBackup` nimmt zusätzlich die Bauteile aller Verlaufsverweise auf, sofern lokal vorhanden. **Behobener Bruch:** Abschnittsstände (BACKUP-02) konnten Versionen eines später aus dem Projekt entfernten Bauteils enthalten; eine Projektsicherung enthielt diese Version bisher nicht.
- `checkIntegrity` meldet alle hängenden Verweise, die die Einzelprüfungen noch nicht abdecken (`DANGLING_REFERENCE`), und prüft jetzt auch Sammlungen und Vorlagen strukturell.
- `whereUsed(graph, { kind: 'asset', id })` beantwortet „Wo wird das verwendet?“ einschließlich alter, eingefrorener oder nur in Abschnittsständen gemerkter Versionen. Die Gebäudeseite zeigt das unter „Verwaltung → Verwendet in“.

**Regel für neue Verweise:** Wer einen Datensatz um einen Verweis auf einen anderen Datensatz erweitert (z. B. Kartenziele MAP-02, Lager LAGER-01, Teamaufgaben TEAM-03), ergänzt die Rolle in `planGraph.ts` mit Pflichtgrad, Bezeichnung und Datencheck-Hinweis plus einen Test in `tests/plan-model.test.mjs`. Keine eigenen ID-Sammler in UI oder Sicherung.

## Blockdatenspeicher `bp-cells-1`

`VoxelPayload.cells` ist im Arbeitsspeicher eine Liste einzelner Zellobjekte. Als JSON sind das etwa 56 Byte je Zelle; der mitgelieferte Katalog allein belegte so 10,6 MB, große Litematic-Importe (bis 16,7 Mio. Zellen Exportbox) ein Vielfaches. Speicher und Sicherungen nutzen deshalb eine gepackte Form:

- Läufe aus drei LEB128-Zahlen: Zickzack-Abstand des linearen Index zum vorigen Zellindex, Kennung (`0` Löschen, `1+2·i` Luft, `2+2·i` Block mit Palettenindex `i`), Lauflänge − 1. Linearer Index wie im Validator: `x + sx·(y + sy·z)` relativ zu `bounds.min`.
- **Bitgenau:** Die ursprüngliche Zellreihenfolge bleibt erhalten (Abstände dürfen negativ sein). Damit bleiben kanonisches Payload-JSON, `payloadHash` und jede Versions-ID unverändert. `packCells` dekodiert zur Kontrolle sofort wieder und liefert `null`, wenn etwas nicht exakt darstellbar ist; die Version bleibt dann ungepackt gespeichert.
- Ergebnis Katalog (336 Gebäudeversionen, 199 879 Zellen): 10,6 MB → 0,26 MB (41×), Hin- und Rückweg aller Versionen ≈ 0,9 s in Node.
- **IndexedDB:** `DB_VERSION` 4, Migration 4 packt vorhandene Versionen in der Upgrade-Transaktion (`packedCells.bytes` als `Uint8Array`). Lesen über `unpackVersion`; ein beschädigter Datensatz wirft `DomainError('STORAGE')`, nie eine stille Teilversion.
- **Sicherungen:** Format 3 ist ein Behälter um Format 1 oder 2 (`baseFormatVersion`), Zellen als Base64. `contentSha256` wird wie bisher über den **entpackten** Inhalt gebildet; Belege und Prüfsummen bleiben gleich. `readBackup` liest 1, 2 und 3; Format 1/2-Dateien bleiben gültig.
- Im Arbeitsspeicher und in Workern bleibt die Zellliste unverändert. Eine kompakte Laufzeitform (Chunks, typisierte Felder) ist eigene Folgeaufgabe von PERF-02 und muss dieselbe Rückwegprüfung erfüllen.

## Migrationsregeln

1. Neue Felder in gespeicherten Datensätzen sind optional; „fehlt“ hat eine dokumentierte Bedeutung (z. B. `site` fehlt = leerer Plan).
2. Speicherform ändern ⇒ neuer Schritt in `MIGRATIONS` plus `DB_VERSION` +1; freigegebene Schritte nie ändern. Jede Migration liest über die Prüffunktion des Datensatzes und bricht bei einem Fehler die ganze Upgrade-Transaktion ab (`StorageMigrationError`, alte Daten bleiben).
3. Sicherungsformat ändern ⇒ neue `formatVersion`; ältere bleiben lesbar; Prüfsumme über den logischen Inhalt.
4. Inhaltsadressen (`av_…`, `payloadHash`) ändern sich durch Speicherformen nie.
5. Teilschemata (Baustelle, Welt, Updates, Gelände, Sammlungen) behalten eigene `schemaVersion` und eigene Prüffunktion; `checkProjectRecord` ruft sie auf.

## Grenzen

- Der Graph prüft Existenz, nicht Inhalt; Inhaltsadressen prüft weiterhin `verifyAssetVersion`.
- Ensembles in Sammlungen sind Programmdaten; unbekannte Ensemble-IDs meldet weiterhin `resolveCollection`.
- Die Datenmodell-Karte im Systemcheck schätzt die Größen aus den geladenen Versionen; die tatsächliche Browserbelegung zeigt „Speicher“.
