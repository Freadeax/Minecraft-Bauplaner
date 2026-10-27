# Dauerhafte Speicherung und Sicherung (B3)

Stand: 27.10.2026. Umsetzung zu P2-01, R-023/R-024. Code: `apps/web/src/app/idbRepository.ts`, `apps/web/src/app/repository.ts`, `packages/domain/src/backup.ts`. Tests: `tests/backup.test.mjs`, `tests/e2e/persistence.e2e.mjs`. Ergänzt den [Domänenvertrag](DOMAIN.md).

## Speicherschnittstelle

`Repository` ist die einzige Speichergrenze der Weboberfläche. Neu in B3:

| Methode | Vertrag |
|---|---|
| `applyBatch({assets, versions, originals, projects})` | eine Transaktion über alle betroffenen Speicher; Revisions-, Unveränderlichkeits- oder Kontingentfehler ⇒ nichts geschrieben |
| `getOriginal(sha256)`, `listOriginalHashes()` | unveränderte Originaldatei, adressiert über SHA-256 |
| `subscribe(listener)` | Änderungen aus anderen Tabs (`projects`/`library`) |
| `storageInfo()`, `requestPersistence()` | Belegung/Kontingent und dauerhafte Speicherung über `navigator.storage` |

`saveProject`, `saveVersion` und `saveAsset` laufen intern über `applyBatch`. Der Bibliotheksimport schreibt Version, Bauteil und Originaldatei in **einer** Transaktion; ein Abbruch hinterlässt kein Bauteil ohne Original.

## IndexedDB

- Datenbank `minecraft-bauplaner`, Version `DB_VERSION = 1`. Speicher: `projects`, `assets`, `versions` (Schlüssel `id`), `originals` (Schlüssel `sha256`, Bytes als `Blob`), `meta` (Schema-Eintrag).
- **Migration:** `MIGRATIONS[n]` hebt Version n−1 auf n; beim Öffnen laufen alle fehlenden Schritte nacheinander in der Upgrade-Transaktion. Freigegebene Schritte werden nie verändert, nur ergänzt. Jeder gelesene Datensatz prüft zusätzlich `schemaVersion` (`checkSchemaVersion`): neuere Daten ⇒ Fehler „neuere App-Version“, nie stilles Umschreiben.
- **Neuere Datenbank** (`VersionError`) ⇒ `StorageNewerError`, die App zeigt den Fehler statt auf Sitzungsspeicher auszuweichen (sonst würden neue Arbeiten scheinbar gespeichert, aber getrennt von den echten Daten liegen).
- **Upgrade in anderem Tab:** `onversionchange` schließt die Verbindung, weitere Schreibversuche melden „Bitte Seite neu laden“. Blockiertes Öffnen wird als verständlicher Fehler gemeldet.
- **Atomarität:** Alle Prüfungen (Revision, Versionsinhalt) lesen in derselben Readwrite-Transaktion wie die Schreibvorgänge. Ein Fehler bricht die Transaktion ab (`abort`), das Promise lehnt erst nach `abort` ab und löst erst nach `complete` auf.
- **Fehlertexte:** `QuotaExceededError`, `InvalidStateError` und `UnknownError` werden in handlungsorientierte deutsche Meldungen übersetzt; die Oberfläche zeigt Speicherstatus und Fehler (Projektkopf „Speichern fehlgeschlagen“, Projektzentrale).
- **Ausweichpfad:** Ist IndexedDB nicht verfügbar (z. B. gesperrt), startet `MemoryRepository` mit sichtbarem Hinweis „Nur Sitzungsspeicher“ und Empfehlung, Sicherungen herunterzuladen.

## Zwei Tabs und `baseRevision`

Jedes Projekt trägt `revision`. Gespeichert wird nur, wenn die gespeicherte Revision der `baseRevision` des Tabs entspricht; gespeichert wird dann `baseRevision + 1`. Sonst `RevisionConflictError`: Der Tab zeigt „Gespeicherter Stand wurde zwischenzeitlich geändert“, sperrt weitere Änderungen und bietet „Gespeicherten Stand laden“. Es gibt kein Last-Writer-Wins. Ein `BroadcastChannel` informiert andere Tabs zusätzlich, damit Projektliste und Bibliothek ohne Neuladen aktuell sind; die Entscheidung über Konflikte fällt trotzdem ausschließlich in der Transaktion.

## Sicherungsformat `minecraft-bauplaner-backup` v1

JSON-Datei `bauplaner-<projekt|alle-projekte>-<datum>.bauplaner.json`:

| Feld | Inhalt |
|---|---|
| `format`, `formatVersion`, `schemaVersion` | Kennung, Formatversion 1, Domänenschema 1 |
| `scope` | `project` (einzelnes Projekt) oder `all` (alle Projekte und alle eigenen, nicht-Beispiel-Bauteile) |
| `projects`, `assets`, `versions` | vollständige Datensätze; je verwendetem Bauteil **alle** Versionen, damit Versionslisten vollständig bleiben; auch Versionen, die nur eingefrorene Revisionen nutzen |
| `originals` | `{sha256, fileName, mediaType, size, createdAt, base64}` je referenzierter Originaldatei |
| `missingOriginals` | Originale, die lokal schon fehlten (sichtbar, nie erfunden) |
| `contentSha256` | SHA-256 über kanonisches JSON von `projects/assets/versions/originals` |

Vor dem Schreiben wird jede Version mit `verifyAssetVersion` geprüft und jedes Original neu gehasht; beschädigte lokale Daten brechen die Sicherung ab.

## Wiederherstellung

1. `readBackup` prüft Format/Version (neuer ⇒ `SCHEMA_NEWER`), Gesamtprüfsumme, Struktur jedes Projekts (Instanzen, Transformationen, Verbindungen, Revisionen), Inhaltsadresse jeder Version, SHA-256 und Länge jedes Originals sowie Vollständigkeit (jede verwendete Version und jedes Bauteil enthalten).
2. `planRestore` vergleicht mit dem lokalen Bestand: Projekt **neu**, **identisch vorhanden** (Inhalt ohne Revision/Änderungszeit gleich) oder **weicht lokal ab**; Bauteil neu, gleich oder zusammenführen; nur fehlende Versionen und Originale.
3. Die Oberfläche zeigt den Plan; bis zur Bestätigung wird nichts geschrieben. Für abweichende Projekte: **als Kopie anlegen** (Standard, neue ID, Name „(Wiederhergestellt …)“), **überspringen** oder ausdrücklich **ersetzen**.
4. `buildRestore` erzeugt die Schreibmenge; `applyBatch` schreibt sie atomar. „Ersetzen“ verwendet die lokale Revision als `baseRevision` – hat ein anderer Tab inzwischen gespeichert, scheitert die gesamte Wiederherstellung.
5. Vorhandene Bauteile behalten lokale Angaben (Name, Tags, Herkunft); nur fehlende Versionen werden angehängt. Identische Datensätze werden nicht erneut geschrieben.

## Grenzen

- Nur lokaler Browserspeicher; keine Geräte-/Cloudsynchronisierung. Ohne gewährte Dauerhaftigkeit (`persist()`) darf der Browser bei Platzmangel löschen – die Projektzentrale zeigt den Zustand und bietet die Anfrage an.
- Geprüft mit Chromium (Playwright). Safari/iPhone-Verhalten (Blob-Speicherung, Eviction nach 7 Tagen Inaktivität) ist nicht geprüft.
- Sicherungsdateien sind nicht verschlüsselt; Originale werden Base64-kodiert (~33 % größer). Leselimit 100 MB.
- Gelöschte Projekte entfernen keine Bauteile oder Originale (kein automatisches Aufräumen).
