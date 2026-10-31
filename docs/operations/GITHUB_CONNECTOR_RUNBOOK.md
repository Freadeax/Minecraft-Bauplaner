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

## C. Geprüftes Websiteartefakt auf main veröffentlichen

Aktive Quelle: **main / Repositorywurzel**. Einstieg `scripts/publish_pages.sh`, Implementierung `scripts/publish_main_pages.sh`, sichere Zusammenführung `scripts/prepare_main_pages.mjs`. Keine eigene Actions-Datei.

1. Integrierten Quellcommit C und aktuellen Main-Tree festhalten; vollständigen Check aus C ausführen. Offene Browserprüfungen dokumentieren.
2. Build mit `LMNT_SOURCE_SHA=C` erzeugen. Manifest und Artefakt-Allowlist prüfen; keine Symlinks oder fremden Dateien übernehmen.
3. Mit dem Prepare-Skript den vollständigen Source-Tree erhalten, geprüfte Artefakte ergänzen und ausschließlich bekannte unveränderte alte Artefakte entfernen.
4. Über Shell oder Konnektor einen Artefakt-Kindcommit D mit Elterncommit C erzeugen. Vor Refupdate main und Kommunikation erneut prüfen. Bei konkurrierendem Update neu integrieren und bauen.
5. main regulär mit erwarteter SHA C aktualisieren; kein Force. Der Manifestwert sourceCommit nennt C, nicht den noch unbekannten eigenen Commit D.
6. Live-Manifest und geladene Dateien samt Hash prüfen. Solange alte Dateien ausgeliefert werden, Veröffentlichung als ausstehend melden.

Keine neue Entwicklungsaufgabe zwischen Integration und Veröffentlichung beginnen. Nur Branchlöschung erfordert derzeit eine zusätzliche Verwaltungsfunktion. gh-pages ist für die aktive Veröffentlichung nicht erforderlich.

## D. Hostingkonfiguration

Main/root ist anhand interner Pages-Buildlogs bestätigt; Details im maßgeblichen Hostingstand unten. Keine erneute Quellenumstellung nötig. Der Konnektor bietet keine Pages-Konfigurationsaktion. Ein fremder Push außerhalb eines aktiven Auftrags löst keinen lokalen Agentenbuild aus.

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

Geprüfter Quellcommit C, Artefakt-Kindcommit D auf main und tatsächliche Liveversion müssen zusammenpassen. Manifest, Dateihashes und Liveprüfung sind der Nachweis. Fehlende Teile getrennt offen melden.

## Maßgeblicher Hostingstand · 31.10.2026

Die tatsächlichen GitHub-internen Pages-Buildlogs (Run 41201874786, Buildjob 124539104569) bestätigen Checkout `ref: main` und `source: .`. Damit ist Pages bereits auf main / Repositorywurzel gestellt; ältere Angaben zu gh-pages sind historisch überholt. Der bisher fehlende Root-Webbuild erklärt die 404-Antwort für deployment.json.

Aktiver Einstieg ist nun `scripts/publish_pages.sh`, der an `publish_main_pages.sh` delegiert. Geprüften Quellcommit bauen, Artefakte manifestgeprüft in den vollständigen Main-Tree übernehmen, als normalen Artefakt-Kindcommit auf main veröffentlichen und live prüfen. Das Manifest nennt den Quell-Elterncommit (keine selbstreferenzielle Commit-SHA). gh-pages wird nicht mehr benötigt, darf nach bestätigter Liveauslieferung gelöscht werden. Alte Arbeitsbranches bleiben bis zu einer verfügbaren Löschfunktion bestehen; alle Inhalte und auch die zuvor gesquashte WIP-Historie sind in main enthalten.
