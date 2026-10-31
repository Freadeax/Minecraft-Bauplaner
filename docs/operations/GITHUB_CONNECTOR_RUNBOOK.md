# Selbstständiger GitHub- und Pages-Ablauf

Stand: 27.10.2026. Verbindlicher Ausführungsplan für `Freadeax/Minecraft-Bauplaner`, keine Behauptung einer bereits laufenden Deploymentstrecke. Ergänzt [Arbeitsregeln](../../AGENTS.md), [Hosting](../architecture/HOSTING.md) und [Umsetzungsplan](../IMPLEMENTATION_PLAN.md).

## Auftrag und Befugnisse

Der Agent übernimmt Entwicklung, lokale Prüfungen, reguläre Main-Integration und anschließende Pages-Veröffentlichung selbst. Die Nutzerfreigaben gelten dauerhaft für dieses Repository; Routine-Merges, Pushes und die Veröffentlichung geprüfter Websiteartefakte brauchen keine weitere Freigabe. Branchschutz, Rechteprüfung und lokale Qualitätsanforderungen bleiben bestehen. Andere Repositorys, Sichtbarkeitswechsel, kostenpflichtige Dienste und Weltänderungen sind daraus nicht automatisch beauftragt.

Die Ausführung findet während aktiver Aufträge statt. Es ist weder ein Hintergrunddienst noch ein Monitor für fremde Pushes eingerichtet. Keine eigenen GitHub-Actions-Workflows, keine Tokens vom Nutzer verlangen und keine Zugangsdaten in Build oder Repository schreiben.

## Nachgewiesene Konnektorfunktionen

Am 27.10.2026 anhand der verfügbaren Werkzeugschemata und bisheriger erfolgreicher Integration geprüft. Repository-Metadaten melden `admin`, `maintain` und `push`; das erweitert nicht die angebotene Werkzeugoberfläche.

| Aufgabe | Verfügbares Werkzeug | Grenze |
|---|---|---|
| Repository, Ref, Tree, Dateien lesen | `get_repo`, `fetch`, `fetch_file`, `fetch_blob` | Fetch akzeptiert nur zugelassene Endpunkte |
| Text/Binärdateien hochladen | `create_blob` mit utf-8 oder base64 | tatsächliche Größen-/Laufzeitlimits vor großen Artefakten prüfen |
| Dateibaum bauen | `create_tree` | Source-Tree bewahren; Deployment-Tree bewusst neu aufbauen |
| Commit erzeugen | `create_commit` | expliziter Elterncommit; keine lokale Ersatzhistorie pushen |
| Branch erstellen | `create_branch` | genau eine Ausgangs-SHA oder `base_ref` |
| Branch fortschreiben | `update_ref` | `expected_sha` setzen, `force=false`; bei Abweichung neu prüfen |
| PR erstellen, bereitstellen, mergen | PR-Werkzeuge | erwartete Head-SHA beim Merge prüfen |
| Pages konfigurieren/aktivieren | derzeit keine passende Aktion | weder aus Admin-Rechten noch einem Branchpush ableiten |
| Website überprüfen | HTTP-/Browserprüfung, wenn verfügbar | Konnektorgitobjekte beweisen keine Liveauslieferung |

`fetch` hat den `/pages`-Endpunkt als nicht zugelassen zurückgewiesen. Es handelt sich nicht um einen nachgewiesenen fehlenden Repositoryzugriff und nicht um einen Anlass, denselben Zugriff über manipulierte URLs oder Tokens zu erzwingen. Vor einem späteren Bootstrap Werkzeugkatalog erneut prüfen: Fähigkeiten können sich ändern.

## A. Quellstand übernehmen und entwickeln

1. AGENTS, README, STATUS, ROADMAP, COMMUNICATION und betroffene Entscheidungen lesen. Main-Ref `M` und Tree `T` erfassen; eigene und fremde Änderungen unterscheiden.
2. Kommunikation mit Aufgaben-ID, Dateiumfang, Abhängigkeiten und Prüfplan ergänzen. Überschneidungen klären, bevor fremde Arbeit verändert wird.
3. Wenn Git-Transport verfügbar ist, regulär verwenden. Andernfalls Dateien aus einem festgehaltenen Remote-Tree lokal materialisieren. Nachfolgende Dateiabrufe an Commit `M` binden, damit kein gemischter Snapshot entsteht. Git-Modi und Pfade erhalten; Symlinks nicht ungeprüft ausführen.
4. Ein lokaler Snapshot-Rootcommit dient nur dem Diff. Er darf niemals als Ersatzhistorie auf main gepusht werden. Die Remote-Elternschaft wird über echte Remote-SHAs hergestellt.
5. Kleine vollständige Aufgabe implementieren. Abhängigkeiten exakt fixieren, relevante Primärquellen und Lizenzen vor Einsatz prüfen. Kein Leerverzeichnis als fertiges Modul ausgeben.
6. Passende lokale Tests/Typprüfung/Build und Dokumentationsprüfung durchführen. Protokoll vor Integration aktualisieren. UI-Änderungen zusätzlich im Browser am Repository-Unterpfad prüfen.

## B. Main-Integration über Gitobjekte

1. Main und neueste Kommunikation erneut lesen. Hat sich `M` geändert, neue Arbeit fachlich integrieren, betroffene Tests erneut ausführen und neuen Basistree verwenden.
2. Nur eigene Änderungen als Blobs hochladen. Für Text ist utf-8 ausreichend; Binärdaten benötigen base64. Bei API-/Werkzeuggrößenlimits einzelne Blobs statt eines übergroßen Tree-Aufrufs verwenden. Keine Zugangsdaten im Aufruf protokollieren.
3. Neuen Source-Tree auf Basis von `T` mit den geänderten Einträgen erstellen. Löschungen nur ausdrücklich für eigene beabsichtigte Änderungen. Unveränderte Repositorydateien bleiben erhalten.
4. Tree-SHA mit dem lokal geprüften Git-Tree vergleichen. Bei Abweichung nicht fortfahren: Inhalt, Dateimodus und Zeilenenden prüfen.
5. Remotecommit mit Eltern-SHA `M` erstellen. Vor Refupdate Kommunikation/Ref prüfen. `update_ref(branch_name=main, sha=C, expected_sha=M, force=false)` verwenden. Ein fehlgeschlagener Lease ist Anlass zur erneuten Integration, nicht zu einem Force-Push.
6. Falls Schutzregeln einen PR verlangen, temporären Branch/PR verwenden; geprüfte Head-SHA beim Merge angeben. Keine Checks oder Schutzregeln abschalten. Main ist die Integrationslinie.
7. Main erneut lesen und tatsächliche Commit-/Tree-SHA feststellen. Erst dies gilt als bestätigte Integration. Direkt danach Ablauf C ausführen.

## C. Geprüftes Websiteartefakt veröffentlichen

Voraussetzung: Ein funktionsfähiger Webbuild und eine konfigurierte Pages-Quelle. Nachtrag vom 27.10.2026: Webbuild, Manifest und gh-pages / root sind inzwischen vorhanden; Website live geprüft. Der erste Webbuild soll bereits eine nutzbare Kernansicht liefern; keine unfertige Dokumentationsseite als Bauhelfer deklarieren.

1. Integrierten Quellcommit `C` festhalten. Statischen Build lokal aus genau diesem Quellstand erstellen. Build-Tools benötigen keine GitHub-Shell-Zugangsdaten; der Konnektor übernimmt den Transport.
2. Build unter `/Minecraft-Bauplaner/` lokal ausliefern. Start, Hashnavigation, Reload, Assets, Workerstart, Dateiauswahl, Layer und Fehleranzeige prüfen. Im Build keine node_modules, Rohwelten, internen Protokolle, Schlüssel oder absoluten lokalen Pfade.
3. `deployment.json` erzeugen: Schema, Quellcommit, Quell-Tree, Buildzeit in UTC, Tool-/Buildversionen, Dateiliste mit Bytegrößen und SHA-256. Kein eigenes Hashfeld für das Manifest selbst; keine eigene künftige Deployment-Commit-SHA in den Inhalt schreiben. So entsteht keine Selbstreferenz.
4. Alle Artefaktdateien inklusive `index.html`, `.nojekyll` und Manifest als Blobs übertragen. Buildverzeichnis ist eine ausdrückliche Allowlist. Keine Symlinks, Pfadtraversierung oder ungeklärten Fremdassets veröffentlichen.
5. Veröffentlichungstree ohne Source-Basistree aus genau dem Artefakt erzeugen. Das entfernt alte Artefaktdateien aus dem neuen Snapshot, ohne main-Dateien zu löschen. Alte Deployments bleiben in der Branchhistorie wiederherstellbar.
6. Für vorhandenen `gh-pages`-Branch aktuellen Head `P` lesen, Deploymentcommit mit Elterncommit `P` erstellen. Beim ersten Bootstrap kann der neue Artefaktcommit den Sourcecommit `C` als Eltern erhalten; erst dann den neuen Branch anlegen. Kein leerer Source-Tree muss dafür veröffentlicht werden.
7. Vor Aktualisierung prüfen, ob main noch `C` ist. Bei neuerem Main-Stand den alten Build nicht als neuesten Stand ausliefern; neuen Stand übernehmen, erneut bauen und prüfen. Gleichzeitige Deployments über erwartete `P`-SHA abfangen.
8. `gh-pages` ohne Force fortschreiben; bei Erstveröffentlichung Branch mit dem fertigen Deploymentcommit erstellen. Scheitert ein Upload vorher, bleibt der bisherige Veröffentlichungshead erhalten. Unreferenzierte Blobs/Commits sind keine Veröffentlichung.
9. GitHub-interne Pages-Verarbeitung abwarten und echte URL prüfen. Kurze begrenzte Wiederholungen mit Fortschrittsmeldung statt endloser Pollschleife. Bei nicht verfügbarem Livezugriff Status ausdrücklich ungeprüft lassen.
10. Live-Manifest muss `C` und erwartete Dateihashes ausweisen; zusätzlich Start und wenigstens ein mit JS geladenes Asset/Worker prüfen. HTTP 200 oder das Existieren eines Branches allein genügen nicht.

Unmittelbar bedeutet: keine neue Entwicklungsaufgabe zwischen Integration und Deploymentversuch beginnen. GitHubs eigene Verarbeitungszeit ist davon getrennt. Main, Artefaktbranch und Livewebsite erhalten jeweils ihren tatsächlichen Status.

## D. Einmaliger Pages-Bootstrap

Zielquelle: GitHub Pages → `Deploy from a branch` → `gh-pages` → `/`. Keine eigene Actions-Datei. Der Artefaktbranch wird erst aus einem geprüften Webbuild erzeugt. `.nojekyll` überspringt Jekyll, nicht GitHubs internen Pages-Deploymentlauf.

Vor Einrichtung Repositorytarif und Sichtbarkeit prüfen. Das Repository wurde inzwischen vom Nutzer öffentlich geschaltet; dies ist über den Konnektor bestätigt. Fehlt weiterhin eine Pages-Konfigurationsaktion, ist eine einmalige Einstellung über die GitHub-Oberfläche durch den Nutzer oder einen separat verfügbaren, autorisierten UI-Zugriff nötig. Kein zusätzlicher Token und kein Drittservice werden als vermeintlich notwendiger Standard eingeführt. Nach dieser Einrichtung können spätere Buildübertragungen über den bestehenden Konnektor erfolgen, soweit Branchpublishing im Konto funktioniert.

Ein fremder Push außerhalb einer aktiven Agentensitzung löst ohne eingerichteten externen Prozess keinen lokalen Agentenbuild aus. Diese Grenze bleibt sichtbar, statt automatische Überwachung zu versprechen.

## E. Fehler, Wiederholung und Rückkehr

| Ereignis | Verbindliche Reaktion |
|---|---|
| Prüfung/Build schlägt fehl | vor Main-Integration beheben; keinen defekten Stand freigeben |
| Main verändert sich während Arbeit | integrieren, neu prüfen, neuen erwarteten Head verwenden |
| Konnektorantwort nach Timeout unklar | Ref/Commit lesen und feststellen, ob die Aktion bereits abgeschlossen wurde |
| Teilweiser Blobupload | anhand Inhaltshashes wiederverwenden; Branchhead unverändert lassen |
| Neueres Deployment vorhanden | Quell-SHA vergleichen; keinen neueren Stand mit älterem Build verdrängen |
| Pages-Konfiguration/Tarif blockiert | Main aktuell / Pages nicht aktualisiert mit konkreter Ursache melden |
| Liveprüfung liefert alten Manifeststand | als ausstehend behandeln, nicht als veröffentlicht |
| Neuer Build bricht live | bekannten guten Artefakt-Tree in neuem Deploymentcommit wiederherstellen; kein Force-Push |
| Code muss zurückgenommen werden | normale Gegenänderung mit Prüfungen auf main; danach neuer Build/Deploy |

Kein nachträglicher Main-Commit nur zur Eintragung einer erfolgreichen Deployment-SHA: Das würde erneut eine Veröffentlichung auslösen. Deploymentmanifest, Artefaktcommit und Abschlussbericht bilden den Nachweis. Der nächste sachlich notwendige Main-Commit darf den historischen Status nachführen.

## Fertigkriterium

Fertig ist der Ablauf erst, wenn Main-Quellcommit, geprüfter Build, aktualisierter Artefaktbranch und bestätigte Liveversion zusammenpassen. Fehlt eines, wird es getrennt offen ausgewiesen. Aktueller Stand: Konnektor-Gittransport, Webbuild, Manifestgenerator und Artefakttransport ausgeführt; Pages-Quelle gh-pages / root im Browser bestätigt. Website mit Software-Isometrie, Picking, Schichten und Rotation live geprüft. Keine Hintergrundautomatik für fremde Pushes, kein eigener Actions-Workflow.

## Maßgeblicher Hostingstand · 31.10.2026

Die tatsächlichen GitHub-internen Pages-Buildlogs (Run 41201874786, Buildjob 124539104569) bestätigen Checkout `ref: main` und `source: .`. Damit ist Pages bereits auf main / Repositorywurzel gestellt; ältere Angaben zu gh-pages sind historisch überholt. Der bisher fehlende Root-Webbuild erklärt die 404-Antwort für deployment.json.

Aktiver Einstieg ist nun `scripts/publish_pages.sh`, der an `publish_main_pages.sh` delegiert. Geprüften Quellcommit bauen, Artefakte manifestgeprüft in den vollständigen Main-Tree übernehmen, als normalen Artefakt-Kindcommit auf main veröffentlichen und live prüfen. Das Manifest nennt den Quell-Elterncommit (keine selbstreferenzielle Commit-SHA). gh-pages wird nicht mehr benötigt, darf nach bestätigter Liveauslieferung gelöscht werden. Alte Arbeitsbranches bleiben bis zu einer verfügbaren Löschfunktion bestehen; alle Inhalte und auch die zuvor gesquashte WIP-Historie sind in main enthalten.
