# Bibliotheksbeiträge: eigene Bauwerke fest in die Bibliothek (LIB-06)

Stand: 03.11.2026. Code: `packages/domain/src/catalog/contribution.ts` (Paketformat, Prüfung, Katalog-Asset), `packages/domain/src/catalog/community/` (Register, Eintragsmodule, `createCommunityLibrary`), Übernahme `scripts/library/library_intake.mjs`, Oberfläche `apps/web/src/views/library/ContributePanel.tsx` im Gebäudeblatt, GitHub-Formular `.github/ISSUE_TEMPLATE/bibliotheksbeitrag.yml`. Tests: `tests/unit/catalog/contribution.test.mjs`, `tests/e2e/contribution.e2e.mjs`. Übersicht der aufgenommenen Beiträge: [BEITRAEGE](../../library/BEITRAEGE.md).

## Ziel und Abgrenzung

Eigene Sammlungen ([COLLECTIONS](COLLECTIONS.md)) bleiben im Browser einer Person. Ein **Bibliotheksbeitrag** macht ein eigenes Bauteil (importierte `.litematic`/`.schem`, Werkstattbau, Generatorergebnis, Weltausschnitt, herausgelöstes Gebäude …) zu einem **festen Katalogeintrag**, den alle sehen, die die veröffentlichte Seite öffnen – genau wie die mitgelieferten Entwürfe.

Die Seite ist statisch (GitHub Pages, keine Server, keine Konten). Deshalb lädt der Browser nichts hoch: Er erzeugt ein geprüftes Paket, das über das Repository in den Katalog kommt. Kein Zugangsschlüssel im Browser, keine eigene Infrastruktur (AGENTS.md).

## Ablauf

| Schritt | Wer | Was |
|---|---|---|
| 1. Einreichen | Spieler im Planer | Gebäudeblatt eines eigenen Bauteils → „⇪ In Bibliothek einreichen“ → „Beitrag vorbereiten …“: Name, Kennung, Beschreibung, Angaben (Kategorie, Stil, Biom, Funktion), Tags, Bautipps, Autor, Herkunft, Nutzungsrechte, Rechtebestätigung. „↓ Beitragspaket erstellen“ lädt `beitrag_<kennung>.bauplaner-beitrag.json` herunter. |
| 2. Übermitteln | Spieler | Link „Formular ‚Bibliotheksbeitrag‘ auf GitHub öffnen“ (vorausgefüllt: Name, Kennung, Autor, Rechte, Beschreibung) und die Datei in das Feld „Beitragsdatei“ ziehen. Ohne GitHub-Konto: Datei an den Betreuer geben (z. B. per Nachricht schicken). Lehnt GitHub die Endung ab, die Datei in `.txt` umbenennen; das Skript liest den Inhalt, nicht die Endung. |
| 3. Übernehmen | Betreuer | `npm run library:add -- <datei>` prüft und schreibt den Eintrag; Hinweise ansehen; `--trocken` prüft nur. Neue Fassung desselben Beitrags: `--ersetzen`. Entfernen: `npm run library:remove -- <kennung>`. Liste: `npm run library:list`. |
| 4. Veröffentlichen | Betreuer | wie jede Änderung: `npm run check`, Commit, Push auf main, `scripts/publish_pages.sh`, Livecheck. |
| 5. Ausliefern | App | Beim nächsten Start nach dem Update legt der Katalogabgleich den Beitrag als mitgeliefertes Gebäude mit Version „1.0“ an. |

## Paketformat `minecraft-bauplaner/bibliotheksbeitrag`, Version 1

```json
{ "format": "minecraft-bauplaner/bibliotheksbeitrag", "formatVersion": 1, "createdAt": "…",
  "meta": { "id": "beitrag_rathaus_am_see", "name": "…", "description": "…", "facets": { "kategorie": ["oeffentlich"] },
            "tags": ["…"], "tips": ["…"], "author": "…", "source": "…", "license": "frei-projekt", "rightsConfirmed": true },
  "version": { "…": "Version in Sicherungsform: payload ohne cells, packedCells.base64, payloadHash, connectors, source" },
  "preview": "data:image/png;base64,…",
  "origin": { "assetId": "…", "versionId": "…", "label": "2.0", "sourceFormat": "litematic" },
  "checksum": "SHA-256 über das kanonische JSON aller übrigen Felder" }
```

- **Blockdaten** in derselben Form wie Sicherungen (STORE-03): gepackte Zellen als Base64, Palette, Blockinhalte (Schilder, Truhen …) und freie Entities (Rahmen, Gemälde, Rüstungsständer) vollständig. Nicht exakt packbare Zelllisten bleiben als Liste.
- **Geprüft** (`readContribution`, in App und Skript dieselbe Funktion): Formatkennung und -version, Prüfsumme, Angaben (Kennung `beitrag_[a-z0-9_]`, Pflichtfelder, bekannte Facetten, keine Präfix-Tags), Rechtebestätigung, Nutzungsrechte aus fester Liste (`frei-projekt`, `cc-by-4.0`, `cc0`), dekodierte Zellen, Voxelvertrag (`validatePayload`), **Inhalts-Hash gegen den aufgezeichneten** `payloadHash`, Anschlüsse, Vorschaubild (nur PNG), Größen.
- **Grenzen:** höchstens 1 Mio. Zellen (wie der Dateiimport), 8 MB gepackte Blockdaten, Vorschaubild 600 kB. Ab 1,5 MB Blockdaten gibt es einen Hinweis (längeres erstes Laden nach einem Update).
- **Hinweise ohne Abbruch** (`contributionWarnings`): Mod-Blöcke, keine Blöcke, große Daten, fehlende Kategorie/Beschreibung, Kanten über 256 Blöcke.
- Eingereicht wird die **neueste Version** des Bauteils. Lokale Projektänderungen (`localTo`) und mitgelieferte Gebäude sind ausgeschlossen.
- **Vorschaubild** nur mit dem einfachen Farbrenderer (`renderShot`), nie mit geladenen Texturen: so gelangen keine Minecraft-Texturen ins Repository.

## Im Repository

- `packages/domain/src/catalog/community/entries/<kennung>.ts`: das Paket unverändert als Modul (`export default`), dazu `addedAt`. Jedes Modul wird **nur bei Bedarf geladen** (eigener Chunk); der Startcode wird nicht größer.
- `packages/domain/src/catalog/community/registry.ts`: vom Skript erzeugt (Kennung, Name, Autor, Datum, Prüfsumme, Bautipps, Lader). Nicht von Hand ändern; `npm run check:library` (Teil von `npm run check`) prüft, dass jedes Paket lesbar ist und das Register zu den Dateien passt.
- `docs/library/BEITRAEGE.md` und `docs/library/beitraege/<kennung>.png`: Übersicht mit Vorschau für die Durchsicht.

## In der App

- `createCommunityLibrary()` prüft jedes Paket erneut und erzeugt ein mitgeliefertes Asset (`demo: true`, Kennung = Asset-ID) mit genau einer Version „1.0“ (`source.format = 'demo'`, Dateiname und DataVersion des Originals bleiben erhalten). Tags: eigene Tags, `beitrag` und die Facetten-Tags. Herkunft: Autor, „Bibliotheksbeitrag: <Herkunft>“, Nutzungsrechte im Klartext.
- Der Start im Hintergrund (`libraryJob`) und `seedSamples` nehmen die Beiträge in die Katalog-Lieferung auf. Ein unlesbarer Beitrag wird ausgelassen und in der Konsole genannt; der Start bricht nie ab.
- Der Katalog-Cache (PERF-04-S07) hängt am Fingerabdruck aller Kerndateien; ein neuer Beitrag ändert ihn, also wird der Katalog einmal neu aufgebaut.
- **Neue Fassung** eines Beitrags (`--ersetzen`) kommt wie geänderte mitgelieferte Gebäude als nächste Version („2.0“ …) an (UPDATE-01); Projekte behalten ihre Version, bis jemand im Reiter „Updates“ wechselt.
- **Entfernen** nimmt den Beitrag aus dem Katalog neuer Besucher. Wer ihn schon gespeichert hat, behält ihn (der Abgleich löscht nie gespeicherte Bauteile).
- Kennzeichnung: Gebäudeblatt „Bibliotheksbeitrag von <Autor>“ statt „Synthetisches Beispiel“, Katalogkarte „· Beitrag“, Kopfzeile nennt die Zahl der Beiträge. Suche „beitrag“ findet alle. Bautipps erscheinen wie bei den Entwürfen.
- Beiträge behalten ihre Geometrie genau: keine Baustil-Veredelung (`build/refine.ts`, LIB-05), kein `gameReady`. Kennwerte, Spielphase, Material, Bauanleitung und Export rechnen wie bei jedem Gebäude.

## Grenzen

- Kein direktes Hochladen aus dem Browser (statische Seite, keine Zugangsschlüssel); der Weg führt über die Datei und das Repository.
- Die Prüfung sichert Daten, Größe und die Rechte-Erklärung, nicht Geschmack oder Spielbarkeit; die Durchsicht (Vorschau in BEITRAEGE.md, Hinweise des Skripts) bleibt Aufgabe des Betreuers.
- Variantenfamilien und Anschlüsse werden nur übernommen, wie sie am Bauteil hängen (Anschlüsse ja, Familie nein).
- Wer einreicht, hat das eigene Bauteil weiterhin in der eigenen Bibliothek; nach der Übernahme kann es archiviert werden.
- GitHub-Formulare nehmen Dateien bis 25 MB an; größere Pakete entstehen wegen der 8-MB-Grenze nicht.
