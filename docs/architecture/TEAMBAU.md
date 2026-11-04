# Teambau: mehrere Spieler bauen gemeinsam an einem Projekt (COOP)

Stand: 03.11.2026 – **COOP-01 bis COOP-06 umgesetzt** (siehe §17, §18). Roadmap: **COOP-01** (Teamprotokoll und Teampaket im Planer), **COOP-02** (Paper-Plugin als Teamknoten), **COOP-03** (Live-Abgleich über die Mod), **COOP-04** (Baunachweis je Spieler und Gemeinschaftslager). Baut auf [SITE](SITE.md) (Bauabschnitte, Lager, Sammelplan), PROJ-01 „Planung“ (`site.program`: Bauleute, Meilensteine, Zuweisungen), [BUILD_RUN](BUILD_RUN.md) (Bauzettel, Bautage), [LIVE_LINK](LIVE_LINK.md) (Mod ↔ Website) und dem Paper-Plugin (GAME-04) auf. Ersetzt für den Spielbetrieb den Backend-Weg aus TEAM-01…03, der als spätere Option bestehen bleibt.

## 1. Ausgangslage und Ziel

Philipp baut mit anderen auf seinem Paper-Server. Heute kann genau ein Browser ein Projekt planen; Bauleute aus PROJ-01 sind nur Namen in diesem einen Browser. Für gemeinsames Bauen fehlt:

1. **Ein gemeinsamer Stand** – wer hat welchen Abschnitt, was ist fertig, was fehlt – ohne eigenen Server, Konten oder Geheimnisse (Planer = statische GitHub-Pages-Seite, Daten lokal in IndexedDB).
2. **Klare Zuständigkeiten** – Rollen, Vergabe, Reservierung, Übergabe, damit nicht zwei Leute dieselbe Wand bauen und niemand den Plan versehentlich umwirft.
3. **Ein Weg für Mitspieler ohne Planer** – viele wollen nur bauen. Sie sollen im Spiel sehen, was ihr Auftrag ist, und „fertig“ melden können.
4. **Nachvollziehbarkeit** – wer hat was gebaut, geliefert, geändert; welche Planfassung gilt.

Leitsatz: **Der Plan hat eine Hoheit, der Baustand hat viele Hände.** Geometrie (Bauteile, Lage, Verbindungen) ändert nur die Bauleitung. Alles, was beim Bauen passiert (übernehmen, melden, liefern, Notiz), schreibt jeder als unveränderliches Ereignis in ein gemeinsames Teamprotokoll, das sich beliebig oft und in beliebiger Reihenfolge zusammenführen lässt.

## 2. Grundentscheidungen

| Entscheidung | Begründung |
|---|---|
| **Kein Backend.** Der einzige immer laufende gemeinsame Ort ist der Minecraft-Server selbst. | Pages bleibt statisch (AGENTS: keine produktive externe Infrastruktur voraussetzen). Der Paper-Server läuft ohnehin, kennt jeden Spieler sicher (UUID, online-mode) und hat Rechte (Permissions). |
| **Identität = Minecraft-Spieler.** Teammitglied = Bauleute-Eintrag aus PROJ-01 + optional `player` (Spielername, später UUID vom Server). | Keine Konten. Der Server bestätigt Namen; im reinen Dateiaustausch ist der Name eine Angabe (ausdrücklich so angezeigt). |
| **Teamprotokoll statt Datensatz-Abgleich.** Jede Teamhandlung ist ein Ereignis mit eindeutiger ID. Zusammenführen = Vereinigung der Ereignismengen; der Zustand wird daraus berechnet. | Vereinigung ist vertauschbar, wiederholbar und idempotent: zwei Browser, ein Server und ein Paket aus dem Discord ergeben immer denselben Stand, egal in welcher Reihenfolge. Kein „letzter gewinnt“, kein stiller Verlust. |
| **Plan-Hoheit bei der Bauleitung.** Geometrie reist nur als freigegebener Planstand (eingefrorene Revision) von der Bauleitung zu allen. Vorschläge anderer kommen als Änderungsvorschlag, den die Bauleitung mit dem vorhandenen Vergleich (Bauversionen/Diff) prüft. | Geometrie-Zusammenführung zweier frei bearbeiteter Pläne ist fehleranfällig (Überschneidungen, Verbindungen, Schrittnummern). Mit einer Hoheit entsteht nie ein unklarer Plan. |
| **Planung, Selbstmeldung und Spielnachweis bleiben getrennt** (Abnahme TEAM-03). | „Anna meldet fertig“, „Bauleitung bestätigt“ und „Plugin/Mod hat 1 204 richtige Blöcke gezählt“ sind drei verschiedene Aussagen und werden nie vermischt. |
| **Keine Weltveränderung.** Plugin und Mod setzen und entfernen keine Blöcke. Anzeigen für Spieler ohne Mod sind nicht gespeicherte Hinweise (Aktionsleiste, Bossleiste, Partikel). | AGENTS-Regel; Schutz vor Schäden auf einem gemeinsamen Server. |

## 3. Rollen und Rechte

| Rolle | Darf | Typisch |
|---|---|---|
| **Bauleitung** | alles: Plan ändern und freigeben, Rollen vergeben, Abschnitte zuweisen, Meldungen bestätigen/zurückweisen, Mitglieder entfernen | Philipp |
| **Baumeister** | Abschnitte zuweisen und übernehmen, Meldungen anderer bestätigen, Notizen schließen, Sammelaufträge verteilen | erfahrene Mitbauer |
| **Helfer** | freie Abschnitte übernehmen und zurückgeben, eigene Arbeit melden, liefern, Notizen schreiben | Standard für neue Mitspieler |
| **Gast** | ansehen, Notizen schreiben | Besucher, Zuschauer |

- Rechte prüft der Planer bei jedem Ereignis (`canTeam(role, action)`); ein nicht erlaubtes Ereignis wird beim Zusammenführen **sichtbar abgelehnt** (Liste „nicht übernommen, weil…“), nicht still verworfen.
- Rollenwechsel ist selbst ein Ereignis, das nur die Bauleitung (oder bei leerem Team der Ersteller) schreiben darf. Es muss immer mindestens eine Bauleitung geben.
- **Grenze ohne Server:** Ein Teampaket aus einer Datei kann jemand von Hand fälschen. Im Dateiaustausch sind Rechte deshalb eine Ordnungshilfe; verbindlich sind sie dort, wo der Server sie prüft (COOP-02: Plugin schreibt die Ereignisse mit der echten UUID des Spielers, Rechte über Rollen in der Teamdatei + Permissions). Die Oberfläche zeigt die Herkunft jedes Ereignisses („aus Datei“, „vom Server bestätigt“).

## 4. Datenmodell `site.team` (COOP-01)

Liegt in `project.site.team` neben `site.program` (PROJ-01) und reist dadurch mit Rückgängig (`site.set`), Sicherung, Datencheck und Abschnittsständen mit. Kein IDB-Schemasprung; `checkSite` ruft `checkTeam` auf. Domäne: `packages/domain/src/team.ts` (rein, ohne Oberfläche).

```ts
interface TeamState {
  schemaVersion: 1;
  teamId: string;                // gemeinsam für alle Kopien eines Projekts (bleibt bei Kopie im Browser gleich)
  self?: string;                 // „Ich bin“ – Builder-ID dieses Browsers, reist nicht im Teampaket
  events: TeamEvent[];           // nur anhängen, nach (at, id) sortiert, IDs eindeutig
}
interface TeamEventBase { id: string; at: string; by: string /* builderId */; origin: 'planer' | 'datei' | 'server'; }
```

| Ereignis `kind` | Inhalt | Wirkung |
|---|---|---|
| `member.role` | `member`, `role` | Rolle setzen (Bauleitung) |
| `member.player` | `member`, `player` | Spielername verknüpfen (selbst oder Bauleitung) |
| `section.claim` | `section`, `note?` | Abschnitt übernehmen (reservieren) |
| `section.assign` | `section`, `member` | Abschnitt jemandem zuweisen (Baumeister+) – schreibt zugleich die PROJ-01-Zuweisung |
| `section.release` | `section` | Abschnitt zurückgeben |
| `section.done` | `section`, `note?` | Fertig gemeldet (Selbstmeldung) |
| `section.verify` | `section`, `ok`, `note?` | Bauleitung/Baumeister bestätigt oder weist zurück (→ Nacharbeit) |
| `contribution` | `section?`, `blocks?`, `items?: {item, count}[]`, `note?` | „Ich habe gebaut/geliefert“ – Beitragsbuch, Lagerbuchung |
| `gather.claim` | `item`, `count` | Sammelauftrag übernehmen |
| `note.add` | `noteId`, `text`, `section?`, `pos?`, `tag` (`frage`/`problem`/`material`/`info`) | Notiz am Bau |
| `note.resolve` | `noteId`, `text?` | Notiz erledigt |
| `plan.release` | `revisionId`, `revisionNumber`, `summary` | Planstand für alle freigeben |
| `section.handover` (COOP-06) | `section`, `member`, `note?` | Übergabe anbieten; der Inhaber bleibt, bis angenommen wird |
| `section.accept` (COOP-06) | `section` | Angebot annehmen: Inhaber wechselt, Notiz des Angebots wird Abschnittsnotiz |
| `section.decline` (COOP-06) | `section` | Angebot ablehnen (Empfänger) oder zurückziehen (Anbieter, Inhaber, Baumeister+) |
| `member.away` (COOP-06) | `member`, `until?` (`YYYY-MM-DD`, einschließlich), `note?` (≤ 120) | Abwesenheit; ohne `until` und `note` = wieder da |
| `issue.ack` (COOP-06) | `events` (1–200 Ereignis-IDs) | Hinweise/abgelehnte Ereignisse als erledigt markieren (Baumeister+); ändert sonst nichts |

**Regeln der COOP-06-Arten** (gleich in `team.ts` und `TeamLog.java` (Plugin: `/bp uebergeben <nr> <spieler> [notiz]`, `annehmen [nr]`, `ablehnen [nr]`, `abwesend [bis JJJJ-MM-TT] [notiz]`, `zurueck`; auch über den Teamkanal); Rechteprüfung wie überall mit der Rolle zum Ereigniszeitpunkt):

- `section.handover`: Mindestrolle Helfer. Nur der Inhaber oder Baumeister+. Abgelehnt, wenn der Abschnitt gemeldet oder bestätigt ist, das Ziel unbekannt ist, schon Inhaber ist oder nur Gast ist. Ein freier Abschnitt kann von Baumeister+ angeboten werden. Ein neues Angebot ersetzt ein offenes.
- `section.accept`: nur das angebotene Mitglied, solange das Angebot offen ist (sonst abgelehnt „kein Übergabeangebot“). Wirkung: Inhaber = Annehmender, Status `frei` → `vergeben`, sonst unverändert; Angebot gelöscht.
- `section.decline`: Empfänger, Anbieter, aktueller Inhaber oder Baumeister+; ohne offenes Angebot abgelehnt.
- Jedes wirksame `section.claim`, `section.assign`, `section.release`, `section.done` und `section.verify` löscht ein offenes Angebot (es ist überholt).
- `member.away`: Mindestrolle Gast, für sich selbst immer; für andere nur die Bauleitung.
- `issue.ack`: Mindestrolle Baumeister. Die Ansicht führt die IDs als `acknowledged`; Konflikte und Ablehnungen bleiben im Protokoll und in der Faltung unverändert.
- Ansicht: `SectionTeamState.offer = {to, by, at, note?}`, `TeamMember.away = {until?, note?}`, `TeamView.acknowledged`.

**Abgeleiteter Zustand** (`teamView(team, site, project)`): je Abschnitt Inhaber, Status (`frei` → `vergeben` → `gemeldet` → `bestätigt` / `nacharbeit`), Verlauf; je Mitglied Rolle, Spielername, Abschnitte, Beiträge (Blöcke, Items), offene Notizen; aktueller Planstand; Lagerbuchungen als Summe je Item; Konfliktliste.

**Konfliktregeln** (deterministisch, auf jedem Gerät gleich):

- Ereignisse sind nach `(at, id)` geordnet. Uhrzeiten verschiedener Geräte können abweichen; die Reihenfolge ist trotzdem für alle gleich, weil die ID entscheidet, wenn Zeiten gleich sind.
- **Doppelte Übernahme:** Übernehmen zwei denselben freien Abschnitt, gilt die frühere; die spätere erscheint als Konflikt „Abschnitt war schon vergeben an …“ und hat keine Wirkung. Eine Zuweisung durch Baumeister/Bauleitung schlägt eine eigene Übernahme (bewusste Entscheidung), wird aber ebenfalls angezeigt.
- **Meldung ohne Inhaberschaft** (z. B. jemand meldet einen fremden Abschnitt fertig): wird übernommen, aber markiert („gemeldet von …, Inhaber …“).
- **Rechte:** Ereignisse, für die die Rolle des Urhebers zum Zeitpunkt des Ereignisses nicht reicht, werden abgelehnt und gelistet.
- **Unbekannte Abschnitte** (in der Datei, aber im eigenen Plan gelöscht): bleiben im Protokoll, erscheinen als „verwaist“; nach neuem Planstand passen sie wieder.
- **Unbekannte Ereignisarten** aus neueren Planer-Versionen bleiben erhalten (werden mitgeführt und weitergegeben), haben aber keine Wirkung – ältere Versionen zerstören nichts.
- **Zwei Bauleitungen geben unterschiedliche Planstände frei:** der Planer zeigt „Planstände auseinander“ mit beiden Revisionen und dem Vergleich; es gilt die zuletzt freigegebene, bis eine Bauleitung entscheidet.

## 5. Austauschwege

Alle Wege tragen dasselbe Teamprotokoll. Stufe für Stufe kommt ein bequemerer Weg dazu; die einfacheren bleiben.

| Weg | Stufe | Was reist | Für wen |
|---|---|---|---|
| **Teampaket** `*.bauteam.json` | COOP-01 | Projekt-Sicherung (Format 1–3) + Teamprotokoll + Einladung (Server, Rolle) | Bauleitung → alle; alle → Bauleitung |
| **Meldecode** `BPT1:…` (kurzer Text) | COOP-01 | nur die eigenen neuen Ereignisse, komprimiert, mit Prüfsumme | Helfer → Bauleitung über Discord/Chat, ohne Datei |
| **Statustext** | COOP-01 | lesbarer Tagesbericht (Abschnitte, Wer, Fehlt, Notizen) | zum Einfügen in Discord – der Planer sendet nichts selbst |
| **Server-Teamdatei** (Paper-Plugin) | COOP-02 | Ereignisse der Spieler im Spiel (`/bp nehmen`, `/bp fertig`, …) mit echter UUID | alle Spieler, auch ohne Planer/Mod |
| **Live über Mod** | COOP-03 | Website ↔ Mod (127.0.0.1) ↔ Plugin-Kanal `bauplaner:team`: Freigabe hochladen, Ereignisse holen | Bauleitung und Planer-Nutzer mit Mod |

### Teampaket (COOP-01)

- **Exportieren** (Bauleitung): enthält die eingefrorene freigegebene Revision mit allen benötigten Bauteilversionen (wie die Projektsicherung), Abschnitte, Programm, Teamprotokoll. Ohne `self`, ohne lokale Ansichtseinstellungen.
- **Einlesen** zeigt vor dem Schreiben eine Vorschau: neue Ereignisse je Person, Konflikte, abgelehnte Ereignisse, ob ein neuer Planstand kommt und was er ändert (Blöcke/Abschnitte, betroffene schon gebaute Abschnitte → „Nacharbeit prüfen“). Dann:
  - Projekt **fehlt** im Browser → wird angelegt (gleiche `teamId`, „Ich bin …“ wählen).
  - Projekt **vorhanden** (gleiche `teamId`) → Teamprotokoll wird vereinigt; Geometrie wird **nur** ersetzt, wenn das Paket einen neueren freigegebenen Planstand der Bauleitung trägt und der Nutzer zustimmt. Eigene, nicht freigegebene Geometrie-Änderungen eines Helfers werden nie überschrieben, ohne dass die Vorschau sie nennt (Wahl: übernehmen / als Kopie behalten).
  - Alles ist **ein** rückgängig machbarer Schritt.
- Datei = Klartext-JSON mit `contentSha256`; Fehler (zerschnitten, falsches Projekt, neuere Version) werden verständlich gemeldet.

### Meldecode (COOP-01)

Viele Helfer wollen nur „Abschnitt 3 fertig, 2 Stacks Stein geliefert“ melden. Der Meldecode packt die Ereignisse seit dem letzten Paket (gzip + base64url, Präfix `BPT1:`, Team-ID-Kürzel, Prüfsumme) in eine Zeile für den Chat. Die Bauleitung fügt ihn ein; Duplikate stören nicht (Ereignis-IDs). Grenze: 16 KB.

## 6. Paper-Plugin als Teamknoten (COOP-02)

Das vorhandene Plugin (GAME-04) bekommt ein Teammodul. Es ist der einzige Ort, an dem Rechte **verbindlich** sind und Ereignisse eine echte Spieleridentität haben.

- **Daten:** `plugins/BauplanerBridge/team/<teamId>.json` (Planstand-Kopf: Abschnitte mit Boxen in Weltkoordinaten, Mitglieder mit Rolle/UUID) und `<teamId>.events.jsonl` (nur anhängen). Die Bauleitung legt das Team an, indem sie das Teampaket als `team/<teamId>.bauteam.json` hochlädt oder (COOP-03) aus dem Planer sendet.
- **Befehle ohne Mod und ohne Planer** (deutsch, mit Tab-Ergänzung):
  - `/bp team` – Projekt, Planstand, meine Abschnitte, nächste freie Abschnitte, offene Notizen in der Nähe
  - `/bp abschnitte` – Liste mit Status und Inhaber; `/bp nehmen <nr>`, `/bp abgeben <nr>`, `/bp fertig [<nr>] [notiz]`
  - `/bp zeigen <nr>` – Umriss des Abschnitts 30 s als Partikel (nur für den Fragenden)
  - `/bp notiz <frage|problem|material|info> <text>` – Notiz an der eigenen Position; `/bp notizen` in 32 Blöcken Umkreis
  - `/bp geliefert <item> <menge>` oder mit dem Gegenstand in der Hand
  - Baumeister+: `/bp zuweisen <nr> <spieler>`, `/bp pruefen <nr> ok|nacharbeit [notiz]`; Bauleitung: `/bp rolle <spieler> <rolle>`
- **Anzeige für alle:** Betritt ein Spieler die Box eines Abschnitts, zeigt die Aktionsleiste „Abschnitt 3 · Dach · Anna · gemeldet“. Optional Bossleiste mit Projektfortschritt. Nichts davon wird in der Welt gespeichert.
- **Schutz statt Sperre:** Standard ist „Hinweis“: setzt jemand Blöcke im Abschnitt eines anderen, bekommt er einmal je Minute einen Hinweis. Der Server-Betreiber kann in `config.yml` `schutz: sperren` wählen (Blocksetzen/-abbauen in fremden vergebenen Abschnitten wird verhindert, Bauleitung/OP ausgenommen). Das ist Weltschutz, keine Weltveränderung. Für harten Regionsschutz bleibt das Schutz-Plugin des Servers zuständig; der Planer kann die Abschnittsboxen als Liste (CSV mit Koordinaten) ausgeben.
- **Rechte:** Paper-Permissions `bauplaner.team.use` (Standard true), `bauplaner.team.leitung` (Standard op). Rolle aus der Teamdatei und Permission müssen beide passen.
- **Ausfuhr:** `/bp team export` schreibt `team/<teamId>.events.jsonl`; der Planer liest die Datei wie ein Teampaket (Herkunft „server“).

## 7. Live-Abgleich über die Mod (COOP-03)

Für Planer-Nutzer mit Mod entfällt jeder Dateiversand. Umgesetzt mit Mod 0.10.0 (Fabric und NeoForge, 26.3), siehe §17.

**Zwei Wege, ein Format.** Den Teamstand („team-link“) bekommt die Mod entweder vom Planer auf demselben PC (`POST /v1/team`) oder vom Paper-Plugin über den Kanal `bauplaner:team`. Das Format ist in beiden Fällen gleich:

- `teamId`, `name`, `dimension`, `revision`, `revisionSummary` und `me` (das „Ich bin“ des Browsers bzw. das Mitglied mit der UUID des Spielers).
- `sections[{id, nr, name, owner, status, boxes?, need?, offer?}]`. `nr` zählt ab 1 in Bauordnung, wie in der Plandatei.
- `members[{id, name, player, role, color?, away?}]`, offene `notes[]`, beim Server zusätzlich `stores[]` (Lagerkisten, COOP-04) und `at`.

Die Mod nimmt den Stand des Servers, wenn er da ist, sonst den des Planers.

**Planabgleich.** Die Plandatei (`revisionExport.ts`) trägt neben `SectionNames` jetzt `SectionIds` in derselben Reihenfolge und `TeamId`. Damit ordnet die Mod Teamabschnitte genau den Planabschnitten zu. Ältere Dateien ohne IDs werden über eindeutige Namen zugeordnet. Passt das Team nicht zum eingeblendeten Plan, sagt das HUD es offen.

**Live-Protokoll (Mod, Merkmal `team` in `hello.features`, Protokoll bleibt 2):**

| Weg | Inhalt |
|---|---|
| `POST /v1/team` | Teamstand vom Planer. Antwort: Abschnitte und wie viele davon im Plan erkannt wurden. |
| `GET /v1/team` | Weg zum Server (`link`: `none`, `no_plugin`, `ask`, `waiting`, `live`, `off`), Erlaubnis, gezeigter Stand, Serverstand, `outbox` (eigene Meldungen aus dem Spiel als Planer-Ereignisse von „Ich bin“), Ablehnungen, letzter Fehler. |
| `POST /v1/team/ack` | `{ids}` – der Planer hat diese Meldungen übernommen; die Mod streicht sie aus dem Ausgang. |
| `GET /v1/team/pull?teamId=&since=` | Ereignisse vom Server-Plugin (Herkunft `server`), in Seiten zu höchstens 5000. |
| `POST /v1/team/push` | `{file}` – die Serverdatei (`teamServerFile`), nur für die Bauleitung, landet auf dem Server. |

Ohne Kanal antworten `pull` und `push` mit 409 und einem Code am Textanfang: `team-plugin-fehlt` oder `team-nicht-erlaubt`.

**Kanal `bauplaner:team`.** Er transportiert rohe Bytes mit UTF-8-JSON `{"v":1,"t":…}`. Ein Rahmen ist höchstens 24 000 Bytes groß, größere Nachrichten gehen als `{"t":"part","id","i","n","d":base64}` (bis 6 MB).

- Mod → Plugin: `hello`, `act{teamId, event}`, `pull{req, teamId, since}`, `push{req, file}`.
- Plugin → Mod: `state{state}`, `none`, `ack{id, ok, final, reason}`, `answer{req, …}`, `store{store}`, `error`.

Das Plugin setzt Urheber (Mitglied zur UUID), Zeit und Herkunft `server` selbst. Rechte und Konflikte prüft es mit seiner Faltung, bevor es das Ereignis anhängt. Die Ereignis-ID der Mod (`tev_m…`) bleibt, damit der Planer dieselbe Meldung nie doppelt zählt.

**Regel „keine zusätzlichen Pakete an den Server“ (Philipp, Client-Mod).** Philipp hat am 03.11.2026 entschieden: „Ja, nur freiwillig je Server“. Die Mod sendet auf `bauplaner:team` nur, wenn beides zutrifft:

1. Der Server hat den Kanal angemeldet, Fabric über `ClientPlayNetworking.canSend`, NeoForge über `NetworkRegistry.hasChannel`.
2. Der Spieler hat es für diesen Server einmal bestätigt: ab 0.12.0 per Knopf im J-Menü „Teambau erlauben“ (Frage oben im Bild), sonst `/bauplaner team erlauben` (`bauplaner/team/erlaubt.properties`). Über denselben Kanal koppelt der Planer den Server ohne Befehle (AUTO_LINK.md).

Sonst sendet die Mod nichts. Eingehende Rahmen ignoriert sie, solange der Kanal nicht geöffnet ist. Die Mod prüft jede Sekunde neu, ob der Server den Kanal anbietet.

Ehrlicher Hinweis zu den Loadern: Fabric meldet beim Registrieren eines Empfängers den Kanalnamen per `minecraft:register` an. Deshalb registriert die Mod ihren Empfänger erst nach der Erlaubnis. NeoForge handelt beim Verbinden alle optionalen Kanäle der installierten Mods aus. Dabei wird der Name `bauplaner:team` dem Server genannt, ohne dass ein Teampaket gesendet wird. Das ist ein Teil der Verbindungsaushandlung von NeoForge, den keine Mod abschalten kann.

**Ausgang und Offline.** Eigene Meldungen liegen je Server in `bauplaner/team/<server>.ausgang.json`. Die Mod sendet sie alle 15 s erneut, bis das Plugin `ack` schickt oder der Planer `ack` gibt. Bis dahin zeigt die Mod sie schon als vorläufigen Stand („wartet“). Lehnt das Plugin eine Meldung endgültig ab (`final`), etwa weil der Abschnitt schon vergeben ist, fliegt sie aus dem Ausgang und erscheint im Spiel und auf der Website als „Abgelehnt“.

**Im Spiel:**

- Abschnittsrahmen in der Farbe des Inhabers. Eigene Rahmen sind dicker, freie grün, gemeldete cyan, bestätigte grau und Nacharbeit rot.
- Lagerkisten als Rahmen nach Prüfstatus, Notizpfosten an ihrer Stelle.
- HUD: Teamzeile mit Verbindungsweg, „Hier: Abschnitt …“, „Mein Auftrag … % · offen“ und die nächste Notiz.
- `/bauplaner team …` mit `abschnitte`, `nehmen`, `abgeben`, `fertig`, `pruefen`, `zuweisen`, `zeigen`, `mein`, `frei`, `alle`, `material`, `notiz`, `notizen`, `erledigt`, `geliefert`, `sammle`, `lager`, `erlauben`, `verbieten`, `status`, `korb` und `rahmen`.
- `mein` und `frei` blenden nur die eigenen bzw. freien Abschnitte ein (Abschnittsmaske bis 256 Abschnitte, mit Fortschritt im HUD).
- `material` zeigt, was im eigenen Auftrag noch fehlt, getrennt nach „hab ich dabei“, „holen“ und „liegt im Lager“.

**Website.** Der Reiter „Team“ hat den Block **„Mit Spiel abgleichen“** (`TeamLive.tsx`).

- „Jetzt abgleichen“ schickt den Teamstand und holt die Meldungen aus dem Spiel. Vor dem Übernehmen zeigt eine Vorschau mit `mergeTeam` neue Konflikte und Ablehnungen. Das Übernehmen ist ein `site.set`, das sich direkt im Block mit „Rückgängig“ zurücknehmen lässt (oder im Editor), danach folgt die Quittung an die Mod.
- „Meldungen vom Server holen“ holt die Ereignisse aller Spieler.
- „Planstand auf den Server legen“ steht nur der Bauleitung zur Verfügung.
- Optional gleicht die Seite alle 15 s automatisch ab, ohne Vorschau.

## 8. Wer hat was gebaut (COOP-04)

Drei Quellen, getrennt ausgewiesen:

1. **Selbstmeldung** (`contribution`, `section.done`) – sofort, ohne Server.
2. **Bestätigung** (`section.verify`) – Bauleitung/Baumeister nach Sichtprüfung oder Baustand.
3. **Spielnachweis** (`build.tally`, nur `origin: server`) – das Plugin zählt `BlockPlaceEvent`/`BlockBreakEvent` je Spieler **nur innerhalb von Abschnittsboxen eines Teams** (nach dem Schutz, also nur wirklich gesetzte Blöcke) und schreibt alle `team.nachweis-minuten` (Standard 5) sowie bei Ausfuhr, Neuladen und Stopp je Mitglied und Abschnitt ein Ereignis mit gesetzt, abgebaut und den häufigsten Blockarten. Nur Zähler, keine Positionen je Spieler. Server-weit ausschaltbar (`team.nachweis: false`), je Spieler mit `/bauplaner nachweis aus` (`member.tally`, nur für sich selbst; blendet auch frühere Zahlen aus). Ein Vergleich „richtig/falsch nach Plan“ braucht die Planblöcke auf dem Server und bleibt dem Baustand-Scan (MAP-05). Der Baustand-Scan (MAP-05) bleibt die Wahrheit für „was steht“, die Zählung beantwortet „wer hat es gesetzt“.

Daraus: Fortschritt je Spieler, Beitragsliste („Anna 3 200 Blöcke, 12 Stacks geliefert“), Bautage je Spieler (BUILD-06). Keine Ranglisten-Pflicht – Ansicht „ohne Zahlen je Person“ für entspannte Server.

## 9. Gemeinschaftslager und Sammelaufträge

- Der Sammelplan (SITE) wird teilbar: `gather.claim` = „ich besorge 640 Stein“. Der Planer zeigt je Rohstoff: Bedarf, Lager, unterwegs (übernommen, nicht geliefert), fehlt.
- Lieferungen (`contribution.items`) erscheinen als „Gemeldete Lieferungen“ neben dem Lager. `site.stock` bleibt die Zahl der Bauleitung und wird nicht automatisch erhöht (keine doppelte Inventarquelle, LAGER-01); eine Übernahme per Klick mit Merker, was schon gebucht ist, folgt mit COOP-04.
- COOP-04 (umgesetzt): Ein Baumeister erklärt eine Kiste, ein Fass oder eine Shulkerkiste zur **Lagerkiste des Teams** (`/bauplaner lager setzen <Name>` mit Blick auf die Kiste, `store.chest`). Beim Schließen liest das Plugin den Inhalt (Doppelkisten beide Hälften, Inhalt eingelegter Shulkerkisten mit) und schreibt bei Änderung eine Zählung (`store.count`, nur `origin: server`, höchstens 64 Sorten, sonst `more`). Der Bestand ist die letzte Zählung je Kiste; die **Differenz zur vorigen Zählung** wird dem Spieler als „ins Lager“ bzw. „entnommen“ gebucht. Die erste Zählung und gekürzte Listen buchen nichts, ein zweites Einlesen desselben Protokolls auch nicht (Vereinigung nach ID). `/bauplaner lager zaehlen` zählt alle Kisten auf Befehl, `/bauplaner lager` zeigt den Bestand.
- Im Planer übernimmt Baumeister/Bauleitung den gezählten Bestand per Klick ins Lager der Baustelle (`site.stock`, rückgängig machbar); andere Einträge bleiben.
- Vertiefung (Schutz der Kisten, lückenloses Klickprotokoll `store.move`, Prüfstatus `store.check`, Siegel, Bedarf im Spiel) übernimmt der Thread „Server-Plugin mit geprüften Lagerkisten“, Konzept `docs/architecture/LAGERKISTEN.md`.

## 10. Planversionen, Freigabe und Änderungen während des Baus

- **Freigabe:** Bauleitung friert eine Revision ein und schreibt `plan.release`. Alle bauen gegen diese Revision; der Planer zeigt sie als „Baustand für alle: Planstand 4 vom 03.11.“.
- **Änderung nach Freigabe:** Der Planer vergleicht neue gegen alte Freigabe (vorhandener Diff aus B12) je Abschnitt: „Abschnitt 2: 120 Blöcke anders“. Bereits gemeldete/bestätigte Abschnitte mit Änderungen bekommen automatisch den Hinweis „Nacharbeit prüfen“ (kein automatischer Statuswechsel – die Bauleitung entscheidet).
- **Änderungsvorschlag eines Helfers:** Helfer ändert eine Kopie, exportiert sie als Vorschlag (Teampaket mit `proposal: true`); die Bauleitung öffnet ihn im Vergleich und übernimmt Teile oder alles.

## 11. Kommunikation am Bau

- Notizen mit Ort (Abschnitt und/oder Koordinate) und Art; sichtbar im Reiter „Team“, auf der Weltkarte als Punkt „Notiz“ (Weltplan-Schema 2 hat die Art schon) und im Spiel (Plugin `/bp notizen`, Mod als Markierung).
- `@Name` in Notizen hebt sie bei der genannten Person hervor („für mich“).
- Kein automatischer Versand nach außen (AGENTS). Statustext und Meldecode werden vom Nutzer selbst kopiert.

## 12. Einstieg für Mitspieler

- **Einladung** im Reiter „Team“: kurzer Text mit Servername, Projekt, Rolle und drei Wegen: (a) nur spielen – Plugin-Befehle, Bauzettel als Druck/Handy-Link; (b) mit Mod – Downloadlink `#/mod`, `/bauplaner verbinden`; (c) mit Planer – Teampaket öffnen, „Ich bin …“ wählen.
- **„Meine Aufgaben“** als erste Ansicht im Reiter Team, sobald „Ich bin“ gesetzt ist: meine Abschnitte mit Bauzettel, meine Sammelaufträge, Notizen für mich, Knopf „Fertig melden“ und „Meldecode kopieren“.
- Sprache ohne Fachbegriffe; jede Rolle bekommt einen Satz, was sie darf.

## 13. Was nur Philipp tun kann

1. Plugin-Jar (ab COOP-02) in `plugins/` seines Paper-Servers legen und den Server neu starten.
2. Sich selbst `bauplaner.team.leitung` geben (oder als OP) und anderen ggf. Baumeister-Rollen.
3. Entscheiden, ob `schutz: sperren` und `nachweis` auf seinem Server gelten sollen (Datenschutz gegenüber Mitspielern: Zähler je Spieler).
4. Teampakete/Meldecodes mit Mitspielern über Discord teilen (der Planer versendet nichts).
5. Abnahme mit echten Mitspielern auf `server.lmnt-gaming.net`.

Tokens, Konten oder Cloud-Dienste werden für keine Stufe benötigt.

## 14. Stufenplan

| ID | Inhalt | Abhängig | Abnahme |
|---|---|---|---|
| **COOP-01** | `team.ts` (Ereignisse, Rechte, Zusammenführen, Ansicht, Prüfung), Bauleute mit `player`/`role`/`color`, Reiter „Team“ (Mitglieder, Abschnitte vergeben/übernehmen/melden/bestätigen, Beiträge, Sammelaufträge, Notizen, Freigabe), Teampaket, Meldecode, Statustext, Testfälle TEAM-01…05 | PROJ-01 | Zwei getrennte Browser tauschen Pakete/Codes in beliebiger Reihenfolge und kommen zum selben Stand; doppelte Übernahme und fehlende Rechte werden gezeigt; nichts geht verloren; Rückgängig für jeden Import |
| **COOP-02** | Teammodul im Paper-Plugin: Teamdatei, Befehle, Aktionsleiste, Hinweis/Sperre, Ausfuhr; Servertest | COOP-01, GAME-04 | Befehle auf echtem Paper-Server (Testskript), Ereignisse der Ausfuhr ergeben im Planer denselben Stand |
| **COOP-03** | Merkmal `team` in Mod und Plugin-Kanal; Website „Mit Spiel abgleichen“ | COOP-02, GAME-08 | Spieltest: Freigabe hoch, Meldung im Spiel, Website holt sie |
| **COOP-04** | Spielnachweis je Spieler, Lagerkisten zählen, Beitragsauswertung | COOP-02, LAGER-01 | Zähler stimmen mit gesetzten Blöcken im Servertest |
| **COOP-06** | Teamplanung im Planer (§18): Arbeitspakete, Zuteilung, Zeitplan, Material je Spieler, Fortschritt mit Hinweisen, Konflikthilfe, Planstand-Vergleich, Übergabe, Abwesenheit, Rechteübersicht; Bedarf in der Serverdatei | COOP-01 | Browsertest (1400/390 px): teilen, zuweisen, Zeitplan, Material, Fortschritt, Vergleich, Übergabe annehmen, Abwesenheit, Bauleitung übergeben |

## 15. Schnittstellen

- **PROJ-01 (Thread „Projektmodul vertiefen“):** `Builder` bekommt optional `player`, `role`, `color` (geprüft in `checkProgram`, Patch in `updateBuilder`). `section.assign` schreibt zugleich `program.assignments` (eine Quelle für „wer baut was“ im Zeitplan). Teamprotokoll in `site.team`, geprüft in `checkSite`.
- **Mod-Thread (GAME-07/08):** COOP-03 ist umgesetzt (§7). Die Lagerkisten (COOP-04) hängen sich über `TeamChannel.decorate` (Felder `stores`, `need`) und `TeamChannel.broadcastStore` an den Kanal.
- **Paper-Thread (GAME-04):** COOP-02 erweitert `BridgePlugin` um ein eigenes `TeamModule` (eigene Klasse, eigene Befehle), Servertest wie `scripts/test_bridge_paper.sh`.
- **Testphase (QA-04):** neue Fälle im Bereich „Team“.
- **TEAM-01…03 / AUTH-01:** bleiben als Backend-Option zurückgestellt. Das Ereignismodell ist so gebaut, dass ein späterer Dienst dieselben Ereignisse speichern könnte (ID, Zeit, Urheber, Herkunft).

## 16. Grenzen

- Ohne Server-Plugin sind Rechte und Namen Angaben, keine Beweise.
- Uhrzeiten der Geräte können abweichen; die Reihenfolge ist für alle gleich, entspricht bei verstellten Uhren aber nicht immer der wirklichen.
- Gleichzeitiges Bearbeiten der Geometrie durch mehrere Personen wird bewusst nicht unterstützt (Plan-Hoheit).
- Das Teamprotokoll wächst; die Prüfung erlaubt höchstens 20 000 Ereignisse. „Verlauf verdichten“ (Zustand als ein Ereignis der Bauleitung) ist vorgesehen, aber noch nicht gebaut.

## 17. Umsetzungsstand (03.11.2026)

**COOP-01 (Planer)**
- Domäne `packages/domain/src/team.ts`: Ereignisse und Prüfung (`checkTeamEvent`, `checkTeam`, höchstens 20 000 Ereignisse, 4 KB je Ereignis), Faltung `teamView` mit Rechten zum Ereigniszeitpunkt, `mergeTeam` (Vereinigung, `clashes` bei gleicher ID mit anderem Inhalt), `authorize`, `laterThan` (nie vor dem letzten Ereignis), Meldecode `encodeReportCode`/`decodeReportCode` (gzip, base64url, Prüfsumme), Teampaket `buildTeamPackage`/`readTeamPackage` (SHA-256), Statustext, Serverdatei `teamServerFile`/`readTeamServerFile`, Planübernahme `takeOverPlan`. `site.team` wird von `checkSite` geprüft.
- Mitglieder: Gründer ist Bauleitung; Bauleute aus `site.program` (PROJ-01) und per `member.join` Beigetretene sind Helfer, Unbekannte Gäste.
- Oberfläche: Reiter **„Team“** (`views/project/TeamTab.tsx`, `TeamExchange.tsx`, `team.css`): Gründen, „Ich bin“, Planfreigabe (friert eine Revision ein), Meine Aufgaben, Abschnitte (übernehmen, zuweisen, bestätigen, Nacharbeit, Verlauf), Mitglieder mit Rollen und Spielernamen, Beiträge und Sammelaufträge, Notizen mit @Name, Teamprotokoll, Austausch (Teampaket mit Plan / nur Teamstand, Meldecode, Statustext, Einladung, Serverdatei, Einlesen mit Vorschau). Startseite: **„Teampaket öffnen“** (`TeamOpen.tsx`) legt das Projekt für neue Mitspieler an; ein vorhandenes Teamprojekt wird nie ersetzt.
- Einlesen ohne neuen Planstand ist ein `site.set` (Strg+Z). Mit neuem Planstand wird vorher eine Kopie „<Name> (vor Planstand N)“ gespeichert; Haken beider Seiten bleiben.

**COOP-02 (Paper-Plugin)**
- `mods/bauplaner-bridge/paper/…/TeamLog.java` (Faltung Regel für Regel wie `team.ts`, Gson) und `TeamModule.java` (Befehle, Aktionsleiste, Schutz `hinweis|sperren|aus`, Partikelumriss, Ausfuhr). Konsole: `/bauplaner team als <spieler> <befehl>` für Server-Admins. Neue Rechte `bauplaner.team.use`, `bauplaner.team.leitung`; `config.yml` Abschnitt `team`.
- Echter Servertest `scripts/test_bridge_paper_team.sh` (`scripts/bridge_paperteam.mjs`): Baustag mit Doppelübernahme, Beitritt, abgelehnter Prüfung, Rollenwechsel, Lieferung, Notiz, Neustart, Ausfuhr; die Planer-Faltung der Ausfuhr muss den Serverstand ergeben. Bestanden auf Paper 1.18.2, 1.21.4 und 26.3 (03.11.2026).

**Prüfung:** `tests/team.test.mjs` (12 Fälle), `tests/e2e/team.e2e.mjs` (zwei getrennte Browser, 1400 und 390 px), Testfälle TEAMBAU-01…06 auf `#/testphase`.

**COOP-04 (Planer und Plugin, 03.11.2026)**
- Neue Ereignisarten `build.tally`, `member.tally`, `store.chest`, `store.count` (§8, §9); `SERVER_ONLY_KINDS` lehnt Messwerte aus dem Planer ab. Faltung in `team.ts` und `TeamLog.java` gleich.
- Plugin: Zähler in `TeamModule.java` (`count`, `flushTallies`), Lagerkisten (`store`, `recount`, `onClose`), Befehle `/bauplaner lager [setzen|entfernen|zaehlen]`, `/bauplaner nachweis [an|aus]`, `/bauplaner beitrag [alle]`; `config.yml` `team.nachweis`, `team.nachweis-minuten`.
- Planer: Bereich „Baunachweis & Lager“ (`TeamProof.tsx`): je Mitglied gesetzt/abgebaut/ins Lager/entnommen, je Abschnitt Anteile, Verbautes, Lagerkisten, Bestand → Baustellen-Lager, eigener Nachweis an/aus.
- Prüfung: `tests/team.test.mjs` (14), `tests/e2e/team.e2e.mjs` liest eine Serverausfuhr mit Nachweis und Lager, `scripts/bridge_paperteam.mjs` mit echter Kiste auf Paper 1.18.2, 1.20.6, 1.21.4, 1.21.11 und 26.3. Testfälle TEAMBAU-07/08.

**COOP-03 (Mod 0.10.0, Plugin-Kanal, Website)**
- Mod-Kern (`mod-core/…/team/`):
  - `TeamState`: Teamstand, Fragen wie „wer hat Abschnitt 3“, vorläufiger Stand mit Ausgang.
  - `TeamColors`: Farbe je Mitglied aus der ID, ohne Grün.
  - `TeamWire`: Rahmen und Stücke.
  - `TeamOutbox`: Ausgang je Server, atomar gespeichert.
  - `TeamPlan`: Zuordnung zu Planabschnitten, Fortschritt und Material je Mitglied.
  - `TeamSync`: Kanalzustand, Erlaubnis, Anfragen mit Antwort.
  - Dazu `Filter.sections` (Abschnittsmaske) und `PlanModel.sectionIds/teamId`.
  - Tests: `TeamTest` (5) und `LiveLinkTest` (Merkmal `team`, Schlüssel für alle Teamwege).
- Spiel (`hologram-26.3`): `TeamClient` (Rahmen, HUD, Befehle), `TeamPayload`, Anbindung in `HologramClient` und `LiveLink`. Loader: Fabric `PayloadTypeRegistry`/`ClientPlayNetworking`, NeoForge `RegisterPayloadHandlersEvent` (optional, beidseitig).
- Plugin: `TeamChannel.java` und `config.yml` `team.kanal: true`. Die Fassade in `TeamModule` heißt `submitFor`, `importFile` und `onChange`. Das Plugin verwendet `Json`/`TeamWire` aus mod-core als gemeinsame Quelle (Gradle-Sync).
- Planer: `packages/domain/src/teamLink.ts` (`teamLinkState`, `readLiveTeam`, `readLiveTeamPull`), `revisionExport.ts` (`SectionIds`, `TeamId`), `liveClient.ts` und `TeamLive.tsx`. Tests: `tests/team-link.test.mjs` und `tests/game-check.test.mjs`.

**COOP-01-S04 (Projektplanung, 03.11.2026)**
- `Builder.player?` in `program.ts` (geprüft in `checkProgram`); Minecraft-Namen der Bauleute gelten im Team, solange kein `member.player` etwas anderes sagt.
- `teamIntoProgram` + Knopf „In die Projektplanung übernehmen“ (Baumeister/Bauleitung, Mitglieder-Block): nur im Team Beigetretene werden Bauleute mit derselben ID, Minecraft-Namen werden ergänzt, jeder vom Team berührte Abschnitt bekommt seinen aktuellen Inhaber als Zuweisung (freigegebene verlieren sie); unberührte Abschnitte behalten die Planung. Ein Schritt, Strg+Z.

**Offen:**
- Aktionsleiste, Partikel und Schutz mit echten Spielern, denn die Konsole kann sie nicht auslösen. Das prüft TEAMBAU-06 bis 08 auf Philipps Server.
- Teamkanal mit echtem Client gegen echten Paper-Server (Anmeldung des Kanals, Meldung, Quittung). Das prüft TEAMBAU-09.
- Lagerkisten vertiefen (eigener Thread). Sie hängen sich über `TeamChannel.decorate` und `broadcastStore` an den Kanal.
- „Verlauf verdichten“.

## 18. Teamplanung im Planer (COOP-06, 03.11.2026)

Ziel: Ein großer Bau (Burg, Stadt, Kolosseum) lässt sich mit mehreren Spielern **planen**, nicht nur verteilen. Der Reiter „Team“ hat dafür vier Bereiche: **Bauen** (Stufe 1, unverändert), **Planung**, **Fortschritt**, **Rechte & Übergabe**. Domäne: `packages/domain/src/teamPlan.ts` (rein); Oberfläche `views/project/TeamPlan.tsx`, `teamplan.css`.

| Baustein | Regel |
|---|---|
| **Arbeitspakete** (`splitSection`) | Teilt einen Abschnitt in 2–16 Pakete, die ihn an derselben Stelle der Bauordnung ersetzen. *Nach Schichten*: Einheiten (Bauteil, Schicht) in Bauordnung, Schnitt dort, wo die laufende Summe der Arbeit (Blöcke + Abbau) dem Anteil k/N am nächsten ist; Pakete liegen übereinander und bauen aufeinander auf. *Nach Bauteilen*: ganze Bauteile, größte zuerst ins leichteste Paket (LPT); unabhängig, gleichzeitig baubar. *Automatisch*: Bauteile, wenn es mindestens so viele wie Pakete gibt. Das erste Paket behält die Abschnitts-ID (Inhaber, Verlauf, Abschnittsstände bleiben). Offene Schichtenden bleiben offen, die Abdeckung ist exakt dieselbe. Nur Bauleitung; gemeldete/bestätigte Abschnitte werden nicht geteilt; ein `site.set` (Strg+Z). Höchstens 64 Abschnitte. |
| **Abhängigkeiten** (`sectionWork`) | Ein Abschnitt hängt von früheren Abschnitten ab, die Voraussetzungen seiner Schritte enthalten (Bauanleitung, `prerequisites`). Spätere Voraussetzungen werden gemeldet (Reihenfolge prüfen). |
| **Zuteilungsvorschlag** (`suggestTeamAssignment`) | Nur freie Abschnitte mit offener Arbeit; Kandidaten = Helfer+, nicht abwesend, Auswahl „Wer baut mit“. Wer am wenigsten offene Arbeit hat, bekommt den nächsten Abschnitt in Bauordnung; baut ein Abschnitt auf einem Paket eines Mitglieds auf, bleibt er bei diesem, solange es höchstens eine halbe Paketlast mehr hat als der Leichteste. Übernahme schreibt `section.assign`-Ereignisse in einem Schritt (Baumeister+). |
| **Zeitplan** (`teamSchedule`) | Je Mitglied eine Spur in Bauordnung, Tempo `site.pace.blocksPerSession` je Bautag; Start = max(Spur frei, Ende aller Voraussetzungs-Abschnitte). Freie Abschnitte so, als ob sie sofort jemand nähme (gestreift). Abwesende starten nach `until` (Tage × Bautage je Woche / 7). Gemeldet/bestätigt = fertig. Ausgabe: Ende in Bautagen und als Datum, „allein“, entscheidende Kette, Wartezeiten. Planungshilfe, keine Messung. |
| **Material im Team** (`teamMaterials`) | Je Item: offener Bedarf (planSite: Lager in Bauordnung verbraucht), Lager, fehlt, wird gesammelt (`gather.claim`), gemeldet geliefert, ohne Sammler. Je Mitglied: Bedarf seiner Abschnitte, Plätze, Shulkerkisten, Packliste als Text. Lieferungen werden nicht automatisch Lager (LAGER-01). |
| **Fortschritt** (`teamProgress`) | Brett nach Status; je Mitglied und gesamt drei getrennte Aussagen: abgehakt (Bauanleitung dieses Browsers), gemeldet, bestätigt. „Achtung“: Meldung wartet ≥ 2 Tage, Inhaber ≥ 7 Tage inaktiv, abwesender Inhaber, ganz abgehakt aber nicht gemeldet, gemeldet aber < 90 % abgehakt, Übergabe ≥ 2 Tage offen, Vorarbeit hat niemand übernommen, verwaiste Abschnitte, Planänderung seit Freigabe bei gemeldet/bestätigt – jeweils mit Knopf (Bestätigen, Nacharbeit, Fertig melden, Freigeben). |
| **Planstand-Vergleich** (`releaseChanges`) | Schritte der freigegebenen Revision gegen den aktuellen Plan: gleiche Schritt-ID (Bauteil, Schicht, Phase), anderer `geometryHash` = geändert; dazu neu/entfallen, zugeordnet nach heutiger Abschnittsregel. Nie automatischer Statuswechsel (§10). |
| **Konflikthilfe** (`teamIssues`) | Zu jedem Hinweis und jeder Ablehnung fertige Lösungen als normale Ereignisse: Doppelübernahme → „An X umweisen“ / „Bei Y lassen“; Umweisung → „Zurück an X“ (Inhaber vor dem Ereignis aus der Faltung bis dahin); fremde Meldung → „Prüfen und bestätigen“, „X als Inhaber eintragen“; abgelehnter Gast → „zum Helfer machen“, Abschnitt zuweisen; immer „erledigt“ (`issue.ack`). |
| **Übergabe & Rechte** | Angebot/Annahme (§4), Abwesenheit, „Bauleitung übergeben“ (zwei `member.role`-Ereignisse in einem Schritt: neue Bauleitung, man selbst Baumeister) oder „zusätzlich Bauleitung“; Rechteübersicht aus `canTeam`. |
| **Serverdatei** | `sections[].need` und `need` (volle Bau-Item-Mengen je Abschnitt bzw. Projekt aus `sectionNeeds`, höchstens 256 Zeilen, absteigend) für den Lagerabgleich des Plugins. |

**Abstimmung:** Mod-Thread baut `teamLink.ts` und `TeamLive.tsx` („Mit Spiel abgleichen“) und ergänzt `SectionIds`/`TeamId` im .schem-Export; Plugin-Thread faltet die COOP-06-Arten in `TeamLog.java` (`/bp uebergeben`, `/bp annehmen`, `/bp abwesend`) und liest `need`; Stufe-3-Thread (COOP-04) besitzt Baunachweis und Lagerkisten.

**Grenzen:** Teilung nur entlang Schichten und Bauteilen (Abschnittsmitglieder kennen keine Flächen). Zeitplan rechnet mit einem Tempo für alle. Abgehakt-Anteile stammen aus dem Browser, der die Ansicht zeigt.

**COOP-07 Team live ohne Dateien (03.11.2026)**
- Team-Raum (Cloudflare Worker, `services/team-room`), Sync-Kern `teamSync.ts`, Bereich „Team live“ im Reiter Team und Seite `#/team/beitreten`. Einladung per Link statt Teampaket, neuer Planstand kommt live an, Servermessungen nur mit Serverschlüssel. Teampaket, Meldecode und Serverdatei bleiben als Weg ohne Internet. Details: `TEAM_LIVE.md` §10.
