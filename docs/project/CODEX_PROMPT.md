# Prompt für Codex: Zusammenarbeit mit Claude

Stand: 01.11.2026. Diesen Text gibt Philipp Codex (ChatGPT) als Auftrag bzw. als Projektanweisung. Er ergänzt [AGENTS](../../AGENTS.md) und [CODEX_SETUP](CODEX_SETUP.md), ersetzt sie nicht. Bei Widerspruch gilt AGENTS bzw. der jüngste ausdrückliche Auftrag von Philipp.

---

## Prompt (ab hier kopieren)

Du arbeitest im Repository `Freadeax/Minecraft-Bauplaner` (lokal z. B. `F:\LMNT\Bauplaner`, Branch `main`). Du bist nicht allein: **Claude** (Anthropic, Claude Code) arbeitet parallel in mehreren Threads am selben Repository, außerdem gelegentlich Cline. Philipp ist der Auftraggeber und will, dass ihr euch über das Repository abstimmt und ohne gegenseitiges Überschreiben gemeinsam weiterentwickelt. Kommuniziere mit Philipp auf Deutsch; Dokumentation ist Deutsch.

### 1. Vor jedem Arbeitsblock

1. `git pull --rebase origin main`. Arbeitsbaum prüfen; fremde Änderungen nie verwerfen.
2. Lesen: `AGENTS.md`, `docs/STATUS.md`, `docs/roadmap.json` (einzige Aufgabenquelle), `docs/ROADMAP.md`, `docs/archiv/BLOCKS.md`, **die neuesten Einträge in `docs/COMMUNICATION.md`** (neue Nachrichten stehen am Dateiende) und den Architekturvertrag des betroffenen Moduls unter `docs/architecture/`.
3. Beantworte zuerst offene Nachrichten, die an Codex gerichtet sind, insbesondere `MSG-CLAUDE-SYNC-00` (siehe unten), mit einem neuen Eintrag `Antwort auf MSG-…`.
4. Aufgabe über ihre stabile Roadmap-ID anmelden: neuer MSG-Eintrag **am Ende** von `COMMUNICATION.md` mit ID, Autor `Codex`, Zeit mit Zeitzone, Aufgabe, Dateien, Reservierung bis, nächster Schritt. In `roadmap.json` `owner` der Aufgabe setzen (z. B. `Codex`), danach `npm run roadmap:record -- ID "…"`.

### 2. Dateibesitz und Aufteilung mit Claude

- Jede Aufgabe besitzt ihre Dateien (Scope in `roadmap.json`, ältere Blöcke in `docs/archiv/BLOCKS.md`). Dateien einer Aufgabe, deren Owner Claude ist, änderst du nicht. Brauchst du dort etwas, schreib eine Nachricht an Claude in `COMMUNICATION.md` und arbeite an etwas anderem weiter.
- Aktuell vorgeschlagene Aufteilung (gilt, sobald du in `COMMUNICATION.md` zustimmst oder Änderungen vorschlägst):
  - **Codex:** Kern, Datentreue, Performance, Formate und Abnahme: `PERF-02` (S03 Transport/selektive Neuberechnung), `PERF-03`, `PROFILE-01` (früh, VIEW-02 und GEN-02 hängen daran), `MAT-02`, `MAT-04`, `NBT-01`, `DIFF-01`, `FORMAT-01/02`, `QA-02`-Vorbereitung, `STAB-01`-Abnahme.
  - **Claude:** sichtbare und kreative Werkbankfunktionen: `VIEW-02` Blockformen/Texturen (B16), `MAP-01` Weltkarte (B15), `GAME-02` Fabric-Mod bauen, `LIB-02`/`LIB-03` eigene Sammlungen und Vorlagen (B17), `EDIT-01` Editor-Mehrfachauswahl, danach `GEN-02`/`BUILD-05`.
- Gemeinsame Dateien nur **anhängend** bearbeiten, nie umsortieren oder fremde Zeilen umschreiben:
  - `packages/domain/src/index.ts`: eigene Exportzeilen anhängen.
  - `apps/web/src/views/project/tabs.ts`: genau einen Registry-Eintrag anhängen.
  - `apps/web/src/styles/style.css` und andere gemeinsame CSS: eigener kommentierter Abschnitt am Ende.
  - `router.ts`, `main.tsx`, `types.ts`, `project.ts`, `backup.ts`: nur minimale, klar abgegrenzte Ergänzungen.
  - `docs/COMMUNICATION.md`, `docs/TESTING.md`: eigener Abschnitt am Ende; alte Einträge nie umdeuten.
  - `docs/STATUS.md`: nur eigene Zeilen.
  - `package.json`/Lockfile: neue Abhängigkeiten nur begründet und exakt fixiert.
- `docs/ROADMAP.md` und `docs/ROADMAP_HISTORY.md` werden generiert, nie von Hand ändern. Bei einem Konflikt in `roadmap.json` beide Seiten fachlich zusammenführen (alle Events beider Seiten in zeitlicher Reihenfolge behalten), dann `npm run roadmap:render`.

### 3. Prüfen, integrieren, veröffentlichen (Pflicht)

1. Tests selbst ausführen, **keine GitHub Actions** (nie `.github/workflows` anlegen): `npm run check` vollständig grün; bei UI-/Speicheränderungen zusätzlich `npm run build && npm run test:e2e`. Nicht ausführbare Prüfungen als offen melden, nie als bestanden. Tests nie abschwächen, um grün zu werden.
2. Ergebnis in `docs/TESTING.md` (eigener Abschnitt), Aufgabe in `roadmap.json` pflegen und `npm run roadmap:record -- IDs "Ergebnis und Grenzen"`.
3. Direkt vor dem Push: `git pull --rebase origin main`, Konflikte fachlich mit beiden Seiten lösen, erneut `npm run check`, dann `npm run check:roadmap-change -- <vorheriger-main> HEAD`.
4. Regulär auf `main` pushen. Kein Force-Push, keine History-Umschreibung, keine dauerhaften Nebenbranches.
5. Sofort danach `bash scripts/publish_pages.sh` und `https://freadeax.github.io/Minecraft-Bauplaner/deployment.json` auf den neuen `sourceCommit` und die Dateihashes prüfen.
6. Abschluss-MSG in `COMMUNICATION.md`: Ergebnis, Prüfungen, Quell-/Artefaktcommit, Livestand, offene Grenzen, nächster Schritt; Reservierung aufheben.

### 4. Zusammenarbeit mit Claude

- Claude liest `COMMUNICATION.md` zu Beginn und vor jedem Push seiner Threads. Schreib Fragen oder Absprachen direkt an Claude, z. B. `### MSG-CODEX-…-00 · Codex · <Zeit> · An Claude: …`. Antworten kommen als `Antwort auf MSG-…`.
- Weder Claude noch du laufen als Hintergrundprozess. Nicht auf eine Antwort warten, sondern an der eigenen Aufgabe weiterarbeiten; Philipp leitet bei Bedarf weiter.
- Wer zuerst pusht, gewinnt nicht: Der zweite rebased und integriert die Arbeit des ersten vollständig. Fremde Arbeit nie überschreiben oder doppelt implementieren; wenn dieselbe Aufgabe schon belegt ist, Kommunikation prüfen und nur unabhängige Prüfung beitragen.
- Abgelaufene Reservierungen ohne Code dürfen nach einem MSG-Eintrag übernommen werden. Reservierungen mit vorhandenem, unintegriertem Code vorher abstimmen.

### 5. Deine erste Aufgabe jetzt

1. Pull, die Pflichtdokumente lesen, `MSG-CLAUDE-SYNC-00` beantworten: Woran arbeitest du gerade (Roadmap-IDs, Dateien, Reservierung bis)? Passt die Aufteilung oben, oder willst du andere Aufgaben? Welche Dateien sollen Claudes Threads aktuell nicht anfassen?
2. Danach deinen nächsten Block nach obigem Ablauf anmelden, umsetzen, prüfen, auf main integrieren und Pages veröffentlichen.

## Prompt-Ende
