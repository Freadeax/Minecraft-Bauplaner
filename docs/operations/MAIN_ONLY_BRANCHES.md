# Nur Main: Branchbereinigung und Pages-Migration

Vorbereitet am 31.10.2026 auf ausdrücklichen Nutzerauftrag. Noch **nicht aktiviert**: Der aktuelle Publisher und Pages verwenden weiterhin `gh-pages`. Vorbereitung durch Thread `branch_cleanup`; keine Branches gelöscht oder Pages-Einstellungen geändert.

## Geprüfter Branchbestand

Abruf über `git ls-remote --heads origin` und GitHub-Branches-API. Geprüfter Main-Stand: `d5869c1400f153b35e4da85993e8fa9faa2dc752`; spätere Main-/Pages-Updates vor jeder Mutation erneut lesen.

| Branch | Abruf-SHA | Nachweis |
|---|---|---|
| `main` | `d5869c1400f153b35e4da85993e8fa9faa2dc752` | zentrale Integrationslinie, behalten |
| `claude/project-thread-7ma2ey` | `48aa1f3ab1afdd18c6dba80fbddf64e744e3a8cf` | Vorfahr von Main, vollständig enthalten |
| `claude/project-thread-hdb9gz` | `fdd34d6d8e98f08d10c69562151c55432367328d` | Vorfahr von Main, vollständig enthalten |
| `claude/project-thread-puhy2v` | `0a1d2a8640dc23e9e520eeb9b9aa886914014314` | Vorfahr von Main, vollständig enthalten |
| `claude/project-thread-qhiqlj` | `c04b66c2946c242a722949749ba837360c8c0611` | Vorfahr von Main, vollständig enthalten |
| `claude/project-thread-wjvl36` | `577f4aa29523fba37bb7b24674e3fc8086ce367c` | Vorfahr von Main, vollständig enthalten |
| `codex/voxel-core` | `0ee1a77b8ce8a4c23ef8eda4b9282a9a66b94e19` | Vorfahr von Main, vollständig enthalten |
| `claude/project-thread-ar9kx8` | `a65f9e302a39d992f097193ff48f96ea3bfc2778` | sechs WIP-Commits gesquasht enthalten; identischer vollständiger Tree wie Main-Vorfahr `dce4394e74e35b4783391a4f23270ace940bada7` |
| `gh-pages` | `4a5c80b2803145b04b9a11f430294e683e32a769` | bisheriger Veröffentlichungsbranch; erst nach bestätigtem Quellenwechsel entfernen |

Für die sechs direkten Vorfahren besteht `git merge-base --is-ancestor <sha> origin/main`. Für `ar9kx8` und `dce4394` ist die Tree-SHA identisch: `e45b2a776590a3642d956c70865bf0e0cf4c7251`; `git diff a65f9e3 dce4394` ist leer. Es fehlt damit kein Quellinhalt auf Main. Keine offenen Pull Requests beim Abruf.

Vor Entfernung von `ar9kx8` kann ein normaler Mergecommit mit aktuellem Main-Tree und Eltern `[aktuelles Main, a65f9e3]` auch dessen ursprüngliche WIP-Historie erhalten. Nicht die alten Katalogdateien erneut über den neueren Stand kopieren. Nach jedem erneuten Branchabruf prüfen, ob sich die Spitzen verändert haben; neue Arbeit zuerst fachlich integrieren.

## Zielbetrieb

Nur `main` bleibt dauerhaft. Temporäre Arbeitsbranches werden vor Veröffentlichung fachlich integriert und anschließend entfernt. GitHub Pages liest `main` / `/(root)`. Keine eigenen Actions-Workflows; GitHubs interner Pages-Deploymentlauf bleibt technisch erforderlich.

Branchpublishing unterstützt nur Repositorywurzel oder `/docs`, nicht `/dist-web`. Die Wurzel ist hier vorbereitet, damit bestehende Projektdokumentation nicht verschoben werden muss. Repositoryquellen sind bereits öffentlich; durch die Root-Quelle sind sie auch unter der Pages-Domain abrufbar. Geheimnisse oder private Nutzerdaten dürfen weiterhin nicht im Repository liegen.

## Vorbereiteter Publisher

- Neuer, noch nicht aktiver Einstieg: `scripts/publish_main_pages.sh`.
- Helfer: `scripts/prepare_main_pages.mjs`.
- Bestehendes `scripts/publish_pages.sh` bleibt bis zur Umstellung unverändert aktiv.
- Voraussetzung: sauber ausgechecktes `main`, `HEAD == origin/main`, funktionierender Git-Schreibzugriff.
- `npm run check` prüft Typen, Kern-/Webbuild, Node-Tests und Dokumentation. Der Build nennt den geprüften Quellcommit `C`.
- Ein separater Git-Index startet mit dem vollständigen Main-Tree. Nur manifestierte, größen- und SHA-256-geprüfte Artefakte werden ergänzt. Dateikollisionen mit nicht zuvor manifestierten Quellen brechen ab.
- Die feste Allowlist umfasst `index.html`, `.nojekyll`, `favicon.svg`, `THIRD_PARTY_NOTICES.txt`, `deployment.json`, die zwei bekannten Beispieldateien und reguläre Assetdateien unmittelbar unter `assets/` mit bekannten Dateiendungen. Neue Ausgabekategorien benötigen eine ausdrückliche Codeänderung.
- Nur bisherige, noch bytegenau zum alten Manifest passende Artefakte dürfen ersetzt oder entfernt werden. Manipulierte Pfade, Symlinks, zusätzliche Builddateien und veränderte alte Artefakte brechen ab; andere Quellen bleiben unangetastet.
- Vor Commit und Push werden Arbeitsbaum, HEAD und Remote erneut geprüft. Konkurrenz auf Main führt zum Abbruch oder Ablehnung des normalen Pushs. Kein Force und kein automatischer Reset.
- Artefaktcommit `D` ist ein Kind von `C` und enthält identische Quelltexte plus Builddateien. Das Manifest referenziert bewusst `C`: Die eigene Commit-SHA kann nicht in den Inhalt ihres eigenen Commits eingebettet werden. `D` ist die aktuelle Main-/Pages-Version, `C` der geprüfte Quellstand.
- Nach dem Artefaktpush folgt kein rekursiver zweiter Publishaufruf. Erst die nächste sachliche Quelländerung startet den Ablauf erneut.
- Das Skript aktualisiert anschließend den lokalen Checkout per Fast-forward, sofern er unverändert ist. Liveauslieferung und Hashvergleich bleiben ein separater Nachweis.

## Einmalige Aktivierung und Bereinigung

1. Laufende Arbeitsblöcke auf Main integrieren; sämtliche erforderlichen ausführbaren Prüfungen abschließen und nicht ausführbare Browserprüfungen dokumentieren.
2. Vorbereitete Skripte/Dokumentation auf Main integrieren. Bis zum tatsächlichen Quellenwechsel weiterhin den bestehenden `gh-pages`-Ablauf bedienen.
3. Den neuen Publisher einmal ausführen, sodass Main einen vollständigen geprüften Root-Build enthält. Main-Quellcommit und Artefaktcommit erfassen.
4. GitHub Settings → Pages → `Deploy from a branch` → `main` → `/(root)` → Save. Die Oberfläche muss den gespeicherten Zustand bestätigen. Nicht vorher `gh-pages` löschen.
5. GitHubs internen Pages-Lauf abwarten. Live-`deployment.json` muss den erwarteten Quellcommit und die erwarteten Dateihashes nennen; zusätzlich `index.html`, ein Modul und einen Worker prüfen.
6. Den bisherigen Publisher, Agentenregeln und Hostingdokumente im koordinierten Folgecommit auf den neuen Standard umstellen. Erneut Main-Publisher und Liveprüfung ausführen.
7. Branchspitzen neu abrufen. Sicher integrierte sieben Arbeitsbranches entfernen; `gh-pages` erst nach bestandener Main-Pages-Prüfung entfernen. Keine unbestätigte aktuelle Spitze löschen. Ergebnisliste muss nur `main` enthalten.

Die vorbereiteten Skripte ändern selbst keine Pages-Konfiguration und löschen keine Branches. Bei fehlendem Shell-Schreibzugriff denselben Allowlist-Merge über Gitobjekt-Konnektor ausführen: bestehender Main-Tree als Basis, Artefaktblobs, normale Elternschaft, erwartete Main-SHA und `force=false`. Niemals den reinen Artefakttree als vollständigen Main-Tree verwenden.

## Fähigkeiten und aktueller Blocker

Der verfügbare GitHub-Konnektor kann Gitobjekte/Refs lesen und schreiben, bietet aber weder `delete_ref` noch eine Pages-Konfigurationsaktion. Shell-Git besitzt in der aktuellen Umgebung keine Schreibanmeldung. Die Browseroberfläche wurde vom Hauptthread abgemeldet beobachtet. Für Quellenwechsel und Branchlöschung ist daher ein authentifizierter autorisierter GitHub-Oberflächenzugriff nötig. Bis dahin keine erfolgreiche Main-only-Umstellung behaupten.

## Primärquelle

[GitHub: Publishing source konfigurieren](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), geprüft am 31.10.2026: Branchquelle ist frei wählbar, Ordner ist `/(root)` oder `/docs`; auch Branchpublishing nutzt intern einen Pages-Workflow.

## Prüfungen

`node --test tests/main-pages.test.mjs`: Allowlist, Source-Erhalt, Entfernen alter Chunks, Kollisionen, Pfadmanipulation, Manifest-/Hashfehler und echte Git-Tree-Zusammenführung ohne Quellcommitänderung. `bash -n scripts/publish_main_pages.sh`; Dokumentationsprüfung. Kein tatsächlicher Main-Push, Quellenwechsel oder Löschversuch durch diesen Thread.
