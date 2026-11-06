# Geprüfte Lagerkisten auf dem Server (COOP-05)

Stand: 03.11.2026 – **umgesetzt** (Roadmap COOP-05, Stand §12) im Paper-Plugin `bauplaner-bridge` (Teammodul, Klasse `StorageModule`) und im Planer (Reiter „Team“, Bereich „Baunachweis & Lager“). Baut auf [TEAMBAU](TEAMBAU.md) (Teamprotokoll, Rollen, COOP-02 Teammodul, COOP-04 Baunachweis und einfache Lagerkisten), [SITE](../planer/SITE.md) (Lager `site.stock`, Sammelplan, Bauabschnitte) und [MATERIALS](../planer/MATERIALS.md) (Materialbedarf) auf.

## 1. Ziel

Auf einem gemeinsamen Server liegt das Baumaterial eines Projekts in Kisten am Bauplatz. Heute weiß niemand sicher, was darin liegt, wer etwas hineingelegt oder herausgenommen hat und ob es für den nächsten Abschnitt reicht. COOP-05 macht aus normalen Kisten **geprüfte Baulager**:

1. **Markieren und zuordnen** – eine Kiste (auch Doppelkiste, Fass, Shulkerkiste als Block) wird zum Lager eines Teams, optional eines Bauabschnitts, mit Namen und Zweck.
2. **Zählen und prüfen** – das Plugin kennt den Inhalt jedes Lagers (mit Shulker- und Bündelinhalt) und führt einen **Sollstand**. Jede Abweichung vom Sollstand, die nicht durch eine protokollierte Handlung erklärt ist, wird als „abweichend“ sichtbar.
3. **Schützen** – Entnehmen, Abbauen, Trichter und Explosionen nach Rolle und Einstellung erlauben, melden oder verhindern.
4. **Protokollieren** – jede Ein- und Ausgabe mit Spieler, Item, Menge und Zeit, zusammengefasst je Öffnen.
5. **Abgleichen** – Bedarf des Projekts oder Abschnitts gegen den Lagerbestand: was liegt bereit, was fehlt, was ist zu viel.

Leitsätze aus TEAMBAU gelten weiter: **keine Weltveränderung** (das Plugin setzt, entfernt oder benennt nie Blöcke und verändert nie Kisteninhalte; es verhindert nur Handlungen), **Planung, Selbstmeldung und Spielnachweis getrennt** (eine geprüfte Kistenzählung ist Spielnachweis, `/bp geliefert` bleibt Selbstmeldung), **Rechte verbindlich nur auf dem Server**.

## 2. Begriffe

| Begriff | Bedeutung |
|---|---|
| **Lager** | Markierter Behälter: Welt, Position (bei Doppelkisten beide Hälften), Team, optional Abschnitt, Name, Zweck, Schutzstufe |
| **Zählung** | Inhalt eines Lagers als Liste `item → Anzahl` (Shulker/Bündel aufgelöst, Shulker selbst zusätzlich gezählt) mit SHA-256 über die sortierte Liste |
| **Sollstand** | Letzte geprüfte Zählung + alle seitdem protokollierten Bewegungen. Stimmt eine neue Zählung mit dem Sollstand überein, ist das Lager **geprüft** |
| **Bewegung** | Ein- oder Ausgabe eines Spielers (aus den Inventarklicks bestimmt) oder eines Trichters; je Öffnen zu einer Buchung zusammengefasst |
| **Abweichung** | Unterschied zwischen Zählung und Sollstand ohne protokollierte Ursache (anderes Plugin, Rollback, Absturz zwischen Klick und Speichern, Befehle wie `/item`, ungeschützter Trichter) |
| **Siegel** | Bestätigung einer Zählung durch Baumeister/Bauleitung („so ist es richtig“) – setzt den Sollstand neu und schließt offene Abweichungen |

## 3. Zustände eines Lagers

```
           markieren
              │
              ▼
  ┌──────── geprüft ◄──────────────── siegeln (Baumeister+)
  │           │  ▲                         ▲
  │  Bewegung │  │ Zählung = Sollstand     │
  │  (protok.)▼  │                         │
  │       geprüft (mit Buchung)            │
  │           │                            │
  │   Zählung ≠ Sollstand                  │
  │           ▼                            │
  │       abweichend ──────────────────────┘
  │           │
  │  Block weg / Chunk fehlt
  │           ▼
  └──────► fehlt (Kiste abgebaut, gesprengt, ersetzt) ── entmarkieren / neu markieren
```

- **geprüft**: Inhalt entspricht dem Sollstand; Zeit der letzten Prüfung wird angezeigt.
- **abweichend**: Liste „+ 12 Stein, − 3 Eichenstämme ohne Buchung“, bleibt sichtbar, bis eine Bauleitung oder ein Baumeister siegelt. Nie stilles Überschreiben.
- **ungeprüft**: Chunk war seit dem Serverstart nicht geladen; der letzte Stand gilt als Annahme und wird beim nächsten Laden des Chunks geprüft.
- **fehlt**: Der Block ist kein Behälter mehr. Die Markierung bleibt mit letztem Stand erhalten (Verlust nachvollziehbar), bis sie aufgehoben wird.

## 4. Markieren und zuordnen

- `/bp lager markieren [name]` auf den angeschauten Behälter (bis 6 Blöcke). Konsole: `/bp lager markieren bei <x> <y> <z> [welt] [name]` (`bei …` geht bei jedem Lagerbefehl).
- Wer markieren darf: Baumeister, Bauleitung oder `bauplaner.lager.verwalten`. Behälter in einer Abschnittsbox werden automatisch diesem Abschnitt zugeordnet (änderbar).
- **Doppelkisten**: beide Hälften gehören zu einem Lager; wird eine zweite Kiste an ein markiertes Lager angebaut, wird sie mit aufgenommen (Schutz greift) – wer das nicht darf, kann sie dort nicht setzen.
- **Zweck** steuert die Anzeige und Rechte: *vorrat* (Material für das Projekt), *eingang* (alle dürfen einlegen, Entnahme nur Baumeister+ – Abgabestelle für Sammelaufträge), *ausgabe* (für die Bauleute eines Abschnitts), *rest* (Überschuss/Abbruch).
- **Sichtbarkeit ohne Weltveränderung**: Beim Öffnen und beim Anschauen nennt die Aktionsleiste „Lager „Stein Nord“ · Abschnitt 2 · geprüft 14:02“. `/bp lager zeigen` lässt alle Lager in 48 Blöcken 20 s als Partikel leuchten. Kein Schild, keine umbenannte Kiste.
- `/bp lager entmarkieren`, `/bp lager name <name>`, `/bp lager abschnitt <nr|projekt>`, `/bp lager zweck <…>`, `/bp lager schutz <stufe>`, `/bp lager info`, `/bp lager liste`. Die COOP-04-Befehle `lager setzen|entfernen|zaehlen` bleiben als andere Namen gültig.

## 5. Zählen und prüfen

- **Zählen** passiert ohne Befehl: beim Öffnen (vor der ersten Änderung des Spielers, damit eine fremde Abweichung nie ihm angelastet wird), beim Schließen, nach Trichterbewegungen (gebündelt einmal je Sekunde), beim Laden des Chunks (höchstens einmal je Minute) und auf Befehl `/bp lager pruefen [alle]` (nur geladene Chunks).
- **Inhalt**: Itemtyp als Namespaced-ID; Shulkerkisten und Bündel werden geöffnet (eine Ebene tiefer, wie im Spiel möglich) und zusätzlich als Behälter gezählt. Items mit Namen oder Verzauberung zählen als ihr Typ.
- **Prüfsumme**: SHA-256 über die sortierte Liste. Gleich bleibende Zählungen schreiben kein neues Ereignis (das Protokoll wächst nur bei Änderungen).
- **Sollstand-Vergleich**: Nach jeder Zählung wird `Zählung − Sollstand` gebildet. Ist der Unterschied leer → geprüft. Sonst → abweichend mit der Differenzliste. Abweichungen werden Baumeistern/Bauleitung beim nächsten Login und beim Öffnen gemeldet (einmal, nicht bei jedem Klick).
- **Siegeln**: `/bp lager siegeln [notiz]` – Baumeister+ bestätigt die aktuelle Zählung als richtig (z. B. nach Aufräumen). Schreibt ein Ereignis mit Prüfsumme; Abweichung ist damit geschlossen und nachvollziehbar („gesiegelt von Ben, 14:20: + 12 Stein ohne Buchung akzeptiert“).

## 6. Schutz

Schutzstufe je Lager (Standard aus `config.yml`, `lager.schutz-standard`):

| Stufe | Einlegen | Entnehmen | Abbauen |
|---|---|---|---|
| `offen` | alle | alle (protokolliert) | Baumeister+ |
| `team` (Standard) | Teammitglieder | Teammitglieder ab Helfer | Baumeister+ |
| `abschnitt` | Teammitglieder | Inhaber des Abschnitts und Baumeister+ | Baumeister+ |
| `eingang` | alle | Baumeister+ | Baumeister+ |
| `gesperrt` | Baumeister+ | Baumeister+ | Bauleitung |

- `lager.modus: hinweis | sperren` – *hinweis* erlaubt alles, protokolliert und meldet fremde Entnahmen sofort an Baumeister+ online; *sperren* (Standard) verhindert, was die Stufe nicht erlaubt. Der Inventar-Klick wird abgebrochen, nichts geht verloren.
- Ausgenommen: `bauplaner.lager.verwalten` (Standard op). Ansehen ist immer erlaubt (Aktionsleiste nennt, was man darf); im Zuschauermodus wird jeder verbotene Klick auch bei `modus: hinweis` verhindert.
- **Trichter und Trichterloren**: `lager.trichter: einlegen` (Standard: Trichter dürfen hineinfüllen, nicht herausziehen) | `beides` | `aus`. Trichterbewegungen werden als Bewegung „Trichter bei x y z“ gebucht.
- **Explosionen** (Creeper, TNT, Bett/Ankerexplosion): markierte Behälter werden aus der Explosionsliste genommen (`lager.explosionsschutz: true`). Feuer, Kolben und Wasser bewegen Kisten nicht.
- **Abbauen** eines Lagers ohne Recht wird verhindert; mit Recht bleibt die Markierung als „fehlt“ mit letztem Stand und wer abgebaut hat.
- Hartes Gebietsschutz-Plugin (WorldGuard o. ä.) bleibt davon unberührt; das Lager-Plugin entscheidet nur über markierte Behälter und läuft nach den Schutzplugins (`ignoreCancelled`).

## 7. Protokoll der Ein- und Ausgaben

- Beim Öffnen merkt sich das Plugin den Inhalt. Nach jedem Klick/Ziehen (nächster Tick) wird die Änderung dem klickenden Spieler zugerechnet. Mehrere Spieler gleichzeitig an einem Lager: jeder Klick wird einzeln zugeordnet, weil zwischen zwei Klicks gezählt wird.
- Beim Schließen wird je Spieler **eine** Buchung geschrieben: `ein: [{item, count}]`, `aus: [{item, count}]`. Ein Spieler, der 64 Stein hinein- und wieder herauslegt, erzeugt keine Buchung.
- Trichterbewegungen werden je Lager und Minute zusammengefasst.
- Buchungen fließen in den Sollstand. Lieferungen aus Sammelaufträgen (`gather.claim`) gelten als erfüllt, soweit der Spieler die Items in ein Lager des Teams eingelegt hat („geprüft geliefert“ statt nur „gemeldet“).
- `/bp lager verlauf [anzahl]` am Lager: letzte Buchungen; `/bp lager wer <item>`: wer hat dieses Item eingelegt/entnommen.

## 8. Abgleich mit dem Materialbedarf

- Die Server-Teamdatei trägt optional je Abschnitt den **Bedarf** (`need: {item: Anzahl}`) aus dem Planer (Materialliste der Bauteile im Abschnitt, Rohstoffe nach Wahl der Bauleitung) und den **Projektbedarf**.
- `/bp lager bedarf [abschnitt|projekt]`: je Item Bedarf, im Lager (Lager des Abschnitts + Projektlager), fehlt, zu viel; sortiert nach „fehlt“. Mit `/bp lager bedarf <nr> hand` nur das Item in der Hand.
- Aktionsleiste beim Öffnen eines Abschnittslagers: „Abschnitt 2: 7 von 12 Materialien vollständig · fehlt 3×64 Stein“.
- `sammle` aus dem Teammodul schlägt automatisch die fehlende Menge vor (`/bp sammle stone` ohne Menge).
- Im Planer: Bereich „Lagerkisten“ im Reiter Team (COOP-04) mit Bestand je Lager, Status geprüft/abweichend, Buchungen je Spieler und der Übernahme „Bestand ins Baustellen-Lager übernehmen“.

## 9. Daten und Persistenz

- Ereignisse im Teamprotokoll (Herkunft `server`, echte Spieler-UUID), so dass der Planer über die Ausfuhr alles sieht und `mergeTeam` unverändert gilt:

| `kind` | Inhalt | Wer | Wirkung |
|---|---|---|---|
| `store.chest` (COOP-04) | `chest` (ID), `name`, `pos: [x,y,z]`, `dimension`, `remove?: true` | Baumeister+ | Lager markieren, umsetzen (Hälfte einer Doppelkiste abgebaut) oder aufheben |
| `store.count` (COOP-04) | `chest`, `items: [{item, count}]` (höchstens 64 Zeilen), `more?` | nur Server | Gezählter Inhalt; Sollstand = diese Zählung. Bestand, Eingelagert/Entnommen kommen nur aus Zählungen |
| `store.config` | `chest`, `section?` (`""` = ganzes Projekt), `purpose?`, `protection?`, `pos2?` (zweite Hälfte, `null` = keine), `name?` | Baumeister+ | Zuordnung, Zweck, Schutzstufe, Doppelkiste |
| `store.move` | `chest`, `in?`, `out?` (`[{item, count}]`), `via`: `spieler` / `trichter` / `abbau`, `player?` (Spielername, wenn kein Mitglied) | nur Server | Wer hat was bewegt (je Öffnen netto). Verschiebt den Sollstand, wird **nicht** zusätzlich als eingelagert/entnommen gebucht |
| `store.check` | `chest`, `status`: `geprueft` / `abweichend` / `fehlt`, `sha256`, `diff?: [{item, delta}]` | nur Server | Ergebnis des Vergleichs Zählung ↔ Sollstand. Abweichungen addieren sich bis zum nächsten Siegel; eine spätere saubere Prüfung verdeckt sie nicht |
| `store.seal` | `chest`, `sha256`, `note?` | Baumeister+ | Jetziger Inhalt gilt als richtig: offene Abweichung geschlossen, Sollstand = letzte Zählung |

Reihenfolge auf dem Server bei einer Prüfung mit Abweichung: erst `store.check` (mit `diff` gegen den alten Sollstand), dann `store.count` (neuer Inhalt). Die Faltung steht in `StoreIndex.java` (Plugin) und `team.ts` (Planer) Regel für Regel gleich.

- Unbekannte Ereignisarten bleiben in älteren Planern erhalten (TEAMBAU §4), haben dort nur keine Wirkung.
- Keine zweite Datei: Der Zustand jedes Lagers wird beim Start aus dem Teamprotokoll (`<teamId>.events.jsonl`, nur anhängen) gefaltet. Ein Absturz zwischen zwei Klicks verliert höchstens die offene Buchung des Fensters; die nächste Prüfung zeigt sie als Abweichung.
- Rechte: `bauplaner.lager.use` (Standard true: Lager sehen, Bedarf, Verlauf), `bauplaner.lager.verwalten` (Standard op: markieren ohne Teamrolle, Schutz-Ausnahme, siegeln).

## 10. Mehrere Versionen

- Eine Jar für Paper 1.18.2 bis 26.3 (gebaut gegen paper-api 1.18.2, Java-17-Bytecode). `InventoryView` ist ab 1.21 eine Schnittstelle statt einer Klasse; das Plugin ruft deshalb nur `InventoryEvent#getInventory`, `InventoryClickEvent#getClickedInventory` und `HumanEntity#getOpenInventory` nicht auf und meidet `getView()`.
- Bündel gibt es erst ab 1.21.2 regulär; das Auslesen geht über `BundleMeta`, wenn vorhanden, sonst zählt das Bündel als Item.
- Echter Servertest auf 1.18.2, 1.21.4 und 26.3 (`scripts/mod/test_bridge_paper_lager.sh`): Markieren per Konsole, Befüllen per Vanilla-Befehl (`/item replace block …`, damit eine nicht gebuchte Änderung entsteht), Prüfen, Abweichung, Siegeln, Trichter, Explosion, Abbauen, Neustart, Ausfuhr und Faltung im Planer. Spielerklicks können nur echte Spieler auslösen (Abnahme LAGER-xx auf `#/testphase`).

## 11. Grenzen

- Das Plugin sieht nur, was über die Bukkit-Ereignisse läuft. Andere Plugins, die Inventare direkt ändern, und Rollbacks erscheinen als Abweichung – das ist gewollt.
- Ender- und Spielerinventare sind kein Lager.
- Nicht geladene Chunks werden nie geladen, nur um zu zählen; ihre Lager bleiben bis zum nächsten Laden beim letzten Stand.
- Kistenschutz ersetzt kein Grief-Schutz-Plugin für die übrige Welt.

## 12. Umsetzungsstand (03.11.2026)

- **Plugin** (`mods/bauplaner-bridge/paper/`): `StoreLedger` (Rechte-Matrix, Differenzen, Prüfsumme, Texte), `StoreIndex` (Faltung der Lagerereignisse, von `TeamLog` nach Rechte- und Herkunftsprüfung aufgerufen), `StoreWorld` (nur lesender Zugriff auf Kisten, Fässer, Shulkerkisten; Doppelkisten; Shulker- und Bündelinhalt; Klickarten), `StorageModule` (Ereignisse, Prüfen, Buchen), `StorageCommands` (`/bauplaner lager …`, seit PERF-05 O-6 eigene Datei). Ersetzt die einfachen Lagerkisten aus COOP-04; deren Befehle `lager setzen|entfernen|zaehlen` und Ereignisse bleiben gültig, `store.count` bleibt die einzige Bestandsquelle für „ins Lager/entnommen“.
- **Befehle:** `/bauplaner lager` (Liste und Bestand), `markieren [name]`, `info`, `liste`, `pruefen [alle]`, `bedarf [nr|projekt]`, `verlauf [n]`, `wer <item>`, `zeigen`; Baumeister: `siegeln [notiz]`, `name`, `abschnitt <nr|projekt>`, `zweck`, `schutz`, `entmarkieren`. Konsole und Servertest: `bei <x> <y> <z> [welt]` statt Anschauen, `team als <spieler> lager …`. `/bauplaner sammle <item>` ohne Menge übernimmt die fehlende Menge.
- **Konfiguration** `config.yml` Abschnitt `lager` (`modus`, `schutz-standard`, `trichter`, `explosionsschutz`, `pruefen-beim-laden`, `meldung-an-baumeister`); Rechte `bauplaner.lager.use`, `bauplaner.lager.verwalten`.
- **Planer:** `team.ts` faltet `store.config`, `store.move`, `store.check`, `store.seal` (Felder an `StoreChest`: `section`, `purpose`, `protection`, `pos2`, `status`, `checkedAt`, `deviation`, `sealedBy/At`, `movedIn/Out`, `hopperIn/Out`). `TeamProof.tsx` zeigt je Lager Status, Zuordnung, Schutz, offene Abweichung, Siegel und Buchungen je Spieler und Trichter.
- **Prüfung:** Unit-Tests `paper/src/test/` (Rechte, Differenz, Prüfsumme, Faltung), `tests/unit/team/lager.test.mjs` (Planer-Faltung, Rechte, Herkunft, Prüfung). Echter Servertest `scripts/mod/test_bridge_paper_lager.sh` auf Paper 1.18.2, 1.21.4 und 26.3; `scripts/mod/test_bridge_paper_team.sh` bleibt grün. Testfälle LAGER-01…09 auf `#/testphase` (Bereich „Server“).
- **Offen:** Lagerstände an die Mod über den Teamkanal (`TeamChannel.decorate`, COOP-03) und Paper-Jar 0.10.0 auf `#/mod` zusammen mit dem Mod-Thread; Inventarklicks, Schutz und Buchungen beim Schließen kann nur ein echter Spieler auslösen (Abnahme LAGER-02…06 auf Philipps Server).

## 13. Ertragskisten für das Ertragsbuch (COOP-08, 04.11.2026)

Die Sammeltruhe einer Farm wird eine **Ertragskiste**: Zweck `ertrag` und optional `farm` (ID der Farm aus dem Reiter „Produktion“, `site.production.farms`) über `store.config`. Der Planer (Reiter „Produktion“, Thread PROD-05) kann die Zuordnung selbst als `store.config` senden; auf dem Server geht `/bauplaner lager farm <Name|keine>` (Baumeister, setzt den Zweck mit). Die Serverdatei bzw. der Kopf im Team-Raum trägt dafür `farms: [{id, name, items}]` (`production.serverFarms`).

- **Messen:** Alles, was Trichter und Spieler in eine Ertragskiste legen, zählt als Ertrag; Entnahmen zählen nicht. Jede Minute, in der der Chunk der Kiste geladen ist, zählt als Laufzeit (die Farm lief wirklich – AFK und entladene Chunks sind damit erledigt).
- **Melden:** `store.yield` {`chest`, `farm?`, `items` ≤ 64, `from`, `until`, `minutes`} nur vom Server, je Ertragskiste alle `lager.ertrag-minuten` (Standard 30, mindestens 5) und beim Herunterfahren. Die Planer-Faltung führt je Kiste `yieldIn`/`yieldMinutes` und `TeamView.yields` (je Meldung, mit `farm` der Kiste, wenn das Ereignis keine nennt). Rate = Σ Items ÷ (Σ Minuten ÷ 60).
- **Keine Doppelbuchung:** `store.yield` bucht nichts ins Baustellen-Lager; der Bestand kommt wie bisher nur aus `store.count`.
- **Trichter gebündelt:** Trichterbewegungen werden je Lager höchstens alle `lager.trichter-buendeln-sekunden` (Standard 60) als ein `store.move` gebucht; vor jeder Prüfung wird ein offener Rest sofort gebucht, damit nichts als Abweichung erscheint. Eine laufende Farm schreibt damit höchstens 60 Ereignisse je Stunde statt 3 600.
- **Test:** `scripts/mod/test_bridge_paper_lager.sh` (Kürbistruhe mit Trichter, Info, Ertrag beim Herunterfahren, ≤ 2 Trichterbuchungen), `tests/unit/team/lager.test.mjs`; Testfall LAGER-10.
