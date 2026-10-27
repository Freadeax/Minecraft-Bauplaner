# Anschlüsse, Snap und Bereich als Bauteil (B5)

Stand: 27.10.2026. Umsetzung von P2-02 (Snap-Anteil), R-009 und Bereichsauswahl aus R-008. Code: `packages/domain/src/connectors.ts`, Tests `tests/connectors.test.mjs` und `tests/e2e/snap.e2e.mjs`. Oberfläche: `views/project/SnapPanel.tsx`, `views/library/ConnectorEditor.tsx`, `views/library/CropPanel.tsx`. Ergänzt den [Domänenvertrag](DOMAIN.md).

## Anschlussvertrag

Ein `Connector` (Typ in `types.ts`) ist ein ganzzahliger Punkt auf einer Außenfläche der Payload-Grenzen (Zellgrenze, nicht Zellminimum) mit nach außen zeigender Normale, dazu senkrechtem Up-Vektor, semantischem Typ, Querschnittsprofil und Nutzungsgrenze `maxLinks` (Standard 1).

`validateConnectors(payload, connectors)` prüft zusätzlich zur Struktur (`checkConnectorShape`):

| Code | Schwere | Regel |
|---|---|---|
| `NORMAL` / `UP` | Fehler | Normale und Up sind Achseinheitsvektoren; Up steht senkrecht zur Normale |
| `OFF_FACE` | Fehler | Koordinate auf der Normalenachse liegt genau auf der zugehörigen Grenzfläche (`min` für negative, `maxExclusive` für positive Richtung) |
| `OUTSIDE_FACE` | Fehler | übrige Koordinaten liegen innerhalb der Fläche (Ränder eingeschlossen) |
| `NO_BLOCK` | Warnung | keine der bis zu vier Zellen der Randschicht berührt den Ankerpunkt (`anchorCells`) |

Anschlüsse mit Fehlern werden beim Snap ignoriert; der Anschluss-Editor sperrt das Speichern.

## Transformation

`transformConnector` verwendet ausschließlich `transformBoundaryPoint` aus `packages/voxel`: Position mit Pivot und Platzierung, Normale und Up als reine Richtung (Pivot und Verschiebung null). Damit drehen Anschlüsse exakt wie die Zellen. Geprüft: vier Vierteldrehungen und doppelte Spiegelung ergeben die Identität; +X wird bei 90° zu +Z.

## Passung und Snap

Zwei Anschlüsse in Projektkoordinaten passen (`connectorsMate`), wenn Typ und Profil gleich, Ankerpunkte gleich, Normalen entgegengesetzt und Up-Vektoren gleich sind.

`findSnapCandidates` erzeugt für jeden gültigen Anschluss des zu platzierenden Bauteils und jeden freien, gültigen Anschluss anderer Instanzen alle diskreten Lagen (vier Drehungen, mit „Spiegeln zulassen“ acht), deren Normale/Up passen. Die Verschiebung folgt exakt aus dem ganzzahligen Anker, das Ergebnis liegt daher immer auf dem Raster. Gleiche Endlagen werden zusammengefasst; jede Lage nennt alle gleichzeitig passenden freien Anschlusspaare (z. B. Tor zwischen zwei Türmen ⇒ zwei Paare).

- Voxelkonflikte: AABB nur als Vorfilter, entschieden wird mit `resolveProject` über das bewegte Bauteil und die Instanzen mit überlappender Box. Keine zweite Konfliktregel. Konfliktbehaftete Lagen bleiben sichtbar, werden aber nachrangig sortiert.
- Nutzungsgrenze: Anschlüsse mit `links ≥ maxLinks` sind keine Ziele. Verbindungen der bewegten Instanz zählen nicht, weil sie durch das Verschieben ohnehin neu entstehen.
- Determinismus: Sortierung nach Konflikten, Vorrangentscheidungen, Manhattan-Abstand zum Bezugspunkt, Anzahl Paare, Projektreihenfolge des Ziels, Anschluss-IDs, Drehung, Spiegelung. Gleiche Eingabe ⇒ gleiche Liste (getestet).
- Spiegelung kehrt die Händigkeit des Profils um. Sie ist deshalb nur auf ausdrücklichen Wunsch zugelassen und nur für symmetrische Profile korrekt; ein Händigkeitsfeld im Vertrag fehlt noch.

## Verbindungen

`snapOperation` liefert eine einzige rückgängig machbare `batch`-Operation: Instanz hinzufügen bzw. transformieren, nicht mehr passende Verbindungen der bewegten Instanz entfernen und alle passenden Paare verbinden. Ist der Vorschlag inzwischen veraltet, wird `STALE` gemeldet statt etwas zu speichern. `linkOperation` verbindet zwei bereits aufeinanderliegende Anschlüsse und lehnt alles andere ab. `checkLinks` prüft gespeicherte Verbindungen jederzeit neu (`ok`, fehlende Instanz/Version/Anschluss, Typ-/Profilabweichung, versetzt, Nutzungsgrenze überschritten); ein normales Verschieben löst Verbindungen nicht still, sie werden als „liegen nicht mehr aufeinander“ angezeigt. `unlinkedMates` findet passende, noch unverbundene Paare.

## Oberfläche

- **Editor → Anschlüsse & Snap:** Anschlüsse der gewählten Instanz mit Belegung, Andock-Vorschläge mit Konfliktzahl, Anfügen eines Bibliotheksbauteils an die gewählte Instanz, Verbindungsliste mit Status und „Lösen“, Verbinden aufeinanderliegender Anschlüsse.
- **Bibliothek → Anschlüsse bearbeiten:** Fläche, Anker, Up, Typ, Profil, Nutzungsgrenze; Vorschlag „Flächenmitte unten“ (`suggestConnector`); Prüfung live, Ankerzellen gelb markiert. Speichern erzeugt eine neue unveränderliche Version; Projekte behalten ihre Version. Beispielbauteile sind schreibgeschützt.
- **Bibliothek → Bereich als Bauteil speichern:** einschließliche Integer-Box auf importierter Datei oder Bauteilversion, außerhalb liegende Zellen abgedunkelt, Speichern über `cropPayload` als neues Asset (`source.format = 'crop'`, Ursprungsoffset und Herkunft übernommen, Originalhash der Quelle verweist auf die Ausgangsdatei).

## Grenzen

Keine Händigkeit/Spiegelprofile, keine Freiraum-Reservierung an Anschlüssen, kein Ziehen im 3D-Viewer (Andocken über Liste), keine Mehrfachauswahl. Fundament/Gelände bleibt ungeprüft.
