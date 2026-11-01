# Isolierte Pages-Wiederherstellungsprobe

Aufgabe: OPS-02. Datum: 01.11.2026. Diese Probe verändert weder main noch GitHub Pages. Sie prüft die Rückkehr auf bekannte Artefakte in einem wegwerfbaren lokalen Git-Clone. Der normale [Veröffentlichungsablauf](GITHUB_CONNECTOR_RUNBOOK.md) bleibt maßgeblich.

## Ausführen

Voraussetzungen: Git, Node und ein vorhandener manifestgeprüfter Webbuild, dessen `sourceCommit` im lokalen Repository enthalten ist. Nach Bedarf zuerst den üblichen Build erstellen; der Prüfbefehl selbst baut nichts.

```sh
node scripts/probe_pages_restore.mjs
node --test tests/pages-restore.test.mjs
```

Optional nimmt das Probenskript als erstes Argument ein anderes Buildverzeichnis. Dateien müssen vollständig im Manifest stehen und auf der vorhandenen Pages-Allowlist liegen. Symlinks, zusätzliche Dateien, manipulierte Hashes und Kollisionen mit Quellpfaden führen zum Abbruch.

## Geprüfter Ablauf

1. Reale lokale Builddateien gegen Größen, SHA-256 und Manifest prüfen. Repository lokal ohne Checkout kopieren und den Remote im Probeclone entfernen.
2. Bekannte Artefakte mit dem bestehenden Publisherplan auf ihren tatsächlichen Quellcommit aufsetzen. Der vollständige Source-Tree bleibt erhalten.
3. Ausschließlich im Clone eine spätere Quelländerung einschließlich einer Datei mit ausführbarem Git-Modus erzeugen. Darauf eine ausdrücklich synthetische Folgeveröffentlichung mit verändertem HTML und einem zusätzlichen Chunk setzen. Sie simuliert den zurückzunehmenden Stand; ein tatsächlich defektes Produkt wird damit nicht behauptet.
4. Die bekannten Artefaktbytes in einen neuen Kindcommit des synthetischen Folgestands übernehmen. Nur manifestierte Artefakte ersetzen und den allein im Folgestand vorhandenen Chunk entfernen.
5. Sämtliche Quellpfade, Git-Modi und Blobhashes vor/nach Wiederherstellung exakt vergleichen. Bekannte Builddateien bytegleich prüfen, Elternkette und Recoveryprovenienz prüfen. Der bekannte ursprüngliche Deploymentcommit bleibt unverändert.
6. Probeclone einschließlich seiner Commits entfernen. Der Ergebnisbericht enthält die kurzlebigen Scratch-SHAs als lokale Prüfergebnisse; sie sind keine Commits auf main oder GitHub.

Die Regressionen prüfen zusätzlich manipulierte bekannte Artefakte, nachträglich veränderte aktuelle Artefakte, Quellkollisionen, nicht manifestierte Dateien und ungültige Provenienz. Der vollständige isolierte Gitfall prüft, dass das Eingaberepository seinen HEAD, sauberen Arbeitsbaum und einzigen Branch behält.

## Manifestzuordnung bei einer Rückkehr

Bei einer normalen Veröffentlichung bezeichnet `sourceCommit` den geprüften Quell-Elterncommit des neu gebauten Artefakts. Bei Wiederherstellung alter Artefakte bleibt dieser Wert beim **tatsächlichen ursprünglichen Buildquellcommit**, ebenso `builtAt`. Alte Bytes werden dadurch nicht als neuer Build ausgegeben.

Der Probeplan ergänzt `recovery` mit `parentCommit` (aktuell zurückzulassender Deploymentstand), `restoredFromArtifactCommit` (bekanntes Deployment) und `artifactSourceCommit` (ursprüngliche Buildquelle). Die Datei-/Hashliste bleibt die des bekannten Builds. Der neue Recoverycommit ist Kind des aktuellen Deploymentstands und erhält dessen neuere Quellen; er ist kein Reset auf den alten Source-Tree.

Dies ist eine ausdrücklich dokumentierte Ausnahme von der normalen direkten Manifest-/Elternzuordnung. Der normale Publisher und seine Regeln werden nicht geändert. Bei erneutem regulärem Quellbuild erstellt der Publisher wieder ein Manifest für den neuen Quell-Elterncommit ohne Recoveryfelder.

## Einsatz bei einem tatsächlichen Vorfall

Die Probe besitzt absichtlich keinen Pushbefehl und ist kein Live-Rollbackwerkzeug. Bei einem realen Ausfall zuerst aktuellen main und Kommunikation lesen, bekannte Deployment-/Buildquelle und sämtliche Artefakthashes bestätigen sowie Art und Umfang des Fehlers festhalten. Die Wiederherstellung als neuen Kindcommit vorbereiten und dabei Quellen vollständig erhalten. Vor Remoteänderung konkurrierende Updates ausschließen, regulär ohne Force integrieren und die tatsächlich gelieferte Manifestzuordnung plus sämtliche Dateihashes live prüfen. Falls der Quellcode zurückgenommen werden muss, eine normale fachliche Gegenänderung prüfen und neu bauen.

Eine erfolgreiche lokale Probe beweist weder Pages-/CDN-Wiederanlauf noch Browsercacheverhalten, noch stellt sie eine produktive Teamdatenbank oder Benutzersicherungen wieder her. Ohne Anlass wird kein Live-Rollback durchgeführt.
