# Änderungen der LMNT — Build Studio Bridge

Je Version ein Abschnitt `## <Version> – <Datum>`. `scripts/mod/modrinth_publish.mjs release` übernimmt den Abschnitt der Version unverändert als Änderungsliste auf Modrinth und bricht ab, wenn er fehlt. Englisch zuerst, Deutsch danach.

## 0.28.0 – 2026-11-07

**Team roles can no longer be faked / Team-Rollen lassen sich nicht mehr vortäuschen**

- Team room: every member now gets an own key. The room takes the author from the key, not from the event, and checks the role: nobody with the invitation can write in the name of the Bauleitung or of another member any more, and nobody makes themselves Baumeister.
- The game gets its own device key from the planner (“Connect my game”), never the invitation or the admin key.
- The mod only shows checked changes: steps in the Bauleitung's name need its signature or the room's check.
- Bauleitung: your game signs with a new Ed25519 key. The server plugin only gets the public key – it can check the Bauleitung's signature but never make one. Open the planner once as Bauleitung; it switches the room and the server over by itself.
- Server plugin: takes the public key from the server link (`p`) and deletes the old signing key. Baumeister steps from before the room checked authors need the Bauleitung's confirmation.

- Team-Raum: Jedes Mitglied bekommt jetzt einen eigenen Schlüssel. Der Raum nimmt den Absender aus dem Schlüssel, nicht aus dem Ereignis, und prüft die Rolle: Mit der Einladung kann niemand mehr im Namen der Bauleitung oder eines anderen Mitglieds schreiben, und niemand macht sich selbst zum Baumeister.
- Das Spiel bekommt vom Planer („Mein Spiel verbinden“) einen eigenen Geräteschlüssel, nie die Einladung oder den Verwaltungsschlüssel.
- Die Mod zeigt nur geprüfte Änderungen: Schritte im Namen der Bauleitung brauchen ihre Unterschrift oder die Prüfung des Raums.
- Bauleitung: Dein Spiel unterschreibt mit einem neuen Ed25519-Schlüssel. Das Server-Plugin bekommt nur den öffentlichen Prüfschlüssel – es kann die Unterschrift der Bauleitung prüfen, aber nie selbst eine erzeugen. Öffne den Planer einmal als Bauleitung; er stellt Raum und Server von selbst um.
- Server-Plugin: übernimmt den Prüfschlüssel aus dem Server-Link (`p`) und löscht den alten Unterschriftsschlüssel. Baumeister-Schritte aus der Zeit, bevor der Raum Absender prüfte, brauchen die Bestätigung der Bauleitung.

**Share your position and scans separately / Position und Aufnahmen getrennt freigeben**

- Two switches in the planner (Team live → “What my game shares with the team”): share my position, send scans on request. The game applies them at once and keeps them with the team room. Position off removes your coordinates from “who is here” right away; scans off turns down requests from the team (your own `/bauplaner team aufnahme` still works). Rooms set up before keep both on.

- Zwei Schalter im Planer (Team live → „Was mein Spiel mit dem Team teilt“): Meine Position teilen, Aufnahmen auf Anfrage senden. Das Spiel übernimmt sie sofort und merkt sie sich mit dem Team-Raum. Position aus nimmt deine Koordinaten sofort aus „Gerade da“; Aufnahmen aus lehnt Anfragen aus dem Team ab (dein eigenes `/bauplaner team aufnahme` geht weiter). Bisher eingerichtete Räume behalten beides an.

**Who may access the game / Wer Zugriff auf das Spiel hat**

- The pairing question now names the website (for example freadeax.github.io) next to the device, and says what the planner may do after “Allow”: read your position and the world around you, load and place plans, set marks, hand over team building.
- `/buildplanner connect status` and the status tab of the menu list every paired browser with website, device, pairing time, last use and what it has used since the game started. `/buildplanner connect disconnect <id>` removes a single browser; the others stay paired. The keys themselves are never shown or stored next to these details.

- Die Kopplungsfrage nennt jetzt neben dem Gerät die Website (zum Beispiel freadeax.github.io) und sagt, was der Planer nach „Zulassen“ darf: deine Position und die Welt um dich lesen, Pläne laden und platzieren, Markierungen setzen, Teambau übergeben.
- `/bauplaner verbinden status` und der Status-Reiter im Menü listen jeden gekoppelten Browser mit Website, Gerät, Kopplungszeit, letzter Nutzung und dem, was er seit Spielstart genutzt hat. `/bauplaner verbinden trennen <Kennung>` trennt einen einzelnen Browser; die anderen bleiben gekoppelt. Die Schlüssel selbst werden nie angezeigt oder neben diesen Angaben gespeichert.

## 0.27.1 – 2026-11-07

**Nothing lost offline, honest diagnosis / Offline geht nichts verloren, ehrliche Diagnose**

- Team room in singleplayer: a section you take while the internet is down now waits in a saved outbox for this world. Before, it was lost when you left the world or closed the game; now it goes to the team room exactly once as soon as the connection is back.
- `/bauplaner diagnose` only says “copied to the clipboard” when the report really is in the clipboard. Otherwise it says to attach the file from bauplaner/diagnose/.
- Fix (Paper plugin): after `/bp weltplan sperren hinweis` the hint line appears right away instead of after a minute.
- Checked automatically in the real game: the internet between the mod and the team room cut and restored (measurements, chest contents and the taken section each arrive exactly once), leaving and re-entering the world, moving and turning keys, layer and section keys, placement helper, scaffold hints, groups and locks, rebinding the menu key and key conflicts in the diagnosis.

- Team-Raum im Einzelspieler: Ein Abschnitt, den du ohne Internet übernimmst, wartet jetzt in einem gespeicherten Ausgangskorb dieser Welt. Vorher ging er beim Verlassen der Welt oder beim Beenden des Spiels verloren; jetzt kommt er genau einmal im Team-Raum an, sobald die Verbindung wieder steht.
- `/bauplaner diagnose` sagt nur noch „in die Zwischenablage kopiert“, wenn der Bericht wirklich in der Zwischenablage liegt. Sonst bittet sie, die Datei aus bauplaner/diagnose/ anzuhängen.
- Behoben (Paper-Plugin): Nach `/bp weltplan sperren hinweis` erscheint die Hinweiszeile sofort statt erst nach einer Minute.
- Im echten Spiel automatisch geprüft: Internet zwischen Mod und Team-Raum getrennt und wieder verbunden (Messungen, Kisteninhalt und die Übernahme kommen je genau einmal an), Welt verlassen und neu betreten, Tasten zum Verschieben und Drehen, Ebenen- und Abschnittstasten, Platzierhilfe, Gerüsthinweise, Gruppen und Sperren, Umbelegen der Menütaste und Tastenkonflikte in der Diagnose.

## 0.27.0 – 2026-11-07

**Co-builders in the game / Mitbauer im Spiel**

- Several players per section are now visible in the game: the section frame keeps the owner's colour, and every co-builder gets a thinner frame of their own colour just inside it.
- Team panel, section list and overview name everyone who builds there (“Anna + Ben, Cem”); in your own section you see who builds with you.
- New commands: `/buildplanner team join <no.>` builds along at a section someone already has (up to 8 players per section), `/buildplanner team leave [no.]` stops again – if the owner leaves, the first co-builder takes over. German: `mitbauen`, `aussteigen`.
- Sections you build along at count as your own: “only my sections” in the hologram, material list and the done hint include them.
- Server plugin: the same commands as `/bp mitbauen <nr>` and `/bp aussteigen [nr]`; the team channel accepts join and leave from the mod.

- Mehrere Spieler je Abschnitt sind jetzt im Spiel sichtbar: Der Abschnittsrahmen bleibt in der Farbe der Verantwortlichen, jeder Mitbauer bekommt direkt darin einen dünneren Rahmen in seiner eigenen Farbe.
- Teamanzeige, Abschnittsliste und Übersicht nennen alle, die dort bauen („Anna + Ben, Cem“); im eigenen Abschnitt steht, wer mit dir baut.
- Neue Befehle: `/bauplaner team mitbauen <nr>` baut an einem schon vergebenen Abschnitt mit (bis zu 8 Spieler je Abschnitt), `/bauplaner team aussteigen [nr]` hört wieder auf – steigt die Verantwortliche aus, übernimmt der erste Mitbauer. Englisch: `join`, `leave`.
- Abschnitte, an denen du mitbaust, zählen als deine: „Nur meine zeigen“ im Hologramm, Materialliste und der Fertig-Hinweis schließen sie ein.
- Server-Plugin: dieselben Befehle als `/bp mitbauen <nr>` und `/bp aussteigen [nr]`; der Teamkanal nimmt Mitbauen und Aussteigen aus der Mod an.

## 0.26.0 – 2026-11-07

**Server plugin trusts the team room only with the Bauleitung's signature / Server-Plugin prüft den Team-Raum mit der Unterschrift der Bauleitung**

- Signed team events: the planner of the team lead (Bauleitung) signs its own events; the mod of the team lead does the same and passes the signing key to the server plugin together with the team room (never the room's admin key). Nothing to download, nothing to paste.
- Server plugin: roles, player names and the section protection are only taken from what it can trust – its own events, signed events, and the room's past once the team lead confirmed it. Unsigned events in the team lead's name, role or protection changes without signature and a player name already used by someone else are not taken; `/bp team raum pruefen` lists them.
- Section protection by team role, set by the team lead in the planner (tab “Team” → “Team live” → “Section protection on the server”): off, notice or block; free sections for everybody or only the team. Team lead and master builders build everywhere, a confirmed section only they, a taken section only its owner and co-builders. Server admins keep the last word with `team.schutz-quelle: server`.
- Every room event works once by its id, also after a restart; the same id with other content never replaces the first one.
- Several players per section: co-builders (set in the planner or joined in the game) build in a taken section like its owner; the storage protection “section” lets them in too.

- Unterschriebene Teamereignisse: Der Planer der Bauleitung unterschreibt seine eigenen Ereignisse; die Mod der Bauleitung ebenso, und sie gibt den Unterschriftsschlüssel mit dem Team-Raum an das Server-Plugin weiter (nie den Verwaltungsschlüssel des Raums). Nichts herunterladen, nichts einfügen.
- Server-Plugin: Rollen, Spielernamen und Abschnittsschutz übernimmt es nur noch aus dem, was es prüfen kann – eigene Ereignisse, unterschriebene Ereignisse und die Vergangenheit des Raums, sobald die Bauleitung sie bestätigt hat. Unterschriftslose Ereignisse im Namen der Bauleitung, Rollen- oder Schutzänderungen ohne Unterschrift und ein Spielername, den schon jemand anderes hat, wirken nicht; `/bp team raum pruefen` listet sie.
- Abschnittsschutz nach Team-Rollen, eingestellt von der Bauleitung im Planer (Reiter „Team“ → „Team live“ → „Abschnittsschutz auf dem Server“): aus, Hinweis oder Bauen verhindern; freie Abschnitte für alle oder nur fürs Team. Bauleitung und Baumeister bauen überall, bestätigte Abschnitte nur sie, vergebene nur Inhaber und Mitbauer. Server-Admins behalten mit `team.schutz-quelle: server` das letzte Wort.
- Jedes Raum-Ereignis wirkt genau einmal über seine ID, auch nach einem Neustart; dieselbe ID mit anderem Inhalt ersetzt nie den ersten Stand.
- Mehrere Spieler je Abschnitt: Mitbauer (im Planer festgelegt oder im Spiel beigetreten) bauen in einem vergebenen Abschnitt wie der Inhaber; der Lagerschutz „abschnitt“ lässt sie ebenfalls zu.

## 0.25.0 – 2026-11-06

**Tidy screen in every window size / Aufgeräumtes Bild in jeder Fenstergröße**

- The question “Planner wants to connect – press J” is now a card at the top right below the build panel. Before, in small windows it lay on top of the build panel.
- The build guide line (symmetry, curve) above the hotbar moves aside and wraps in small windows instead of running under the message cards or the team panel.
- Command page (J → “Commands & status”): when the status does not fit a small window, the last line ends with “…” instead of stopping mid-sentence. The menu button reads “Commands” when “Commands & status” does not fit.
- Buttons in the J menu are no longer cut too early (“Ausblen…” instead of “Ausblenden” in small windows).
- Checked automatically in the real game: every tab of the menu and of the command page plus all panels in three window sizes (854×480, 1366×768, Full HD with GUI size 4), and the planner in a real browser against the running game (pairing by click, sending from the map, taking the position back, terrain from the game).

- Die Frage „Planer möchte sich verbinden – J drücken“ ist jetzt eine Karte oben rechts unter dem Baufenster. Vorher lag sie in kleinen Fenstern über dem Baufenster.
- Die Bauhilfe-Zeile (Symmetrie, Kurve) über der Schnellleiste weicht in kleinen Fenstern aus und bricht um, statt unter den Meldungskarten oder der Team-Anzeige zu verschwinden.
- Befehlsseite (J → „Befehle & Status“): Passt der Status nicht ins kleine Fenster, endet die letzte Zeile mit „…“ statt mitten im Satz. Der Menüknopf heißt „Befehle“, wenn „Befehle & Status“ nicht passt.
- Knöpfe im J-Menü werden nicht mehr zu früh gekürzt („Ausblen…“ statt „Ausblenden“ in kleinen Fenstern).
- Im echten Spiel automatisch geprüft: jeder Reiter des Menüs und der Befehlsseite sowie alle Anzeigen in drei Fenstergrößen (854×480, 1366×768, Full HD mit GUI-Größe 4), dazu der Planer in einem echten Browser gegen das laufende Spiel (Koppeln per Klick, Senden von der Karte, Lage zurück, Gelände aus dem Spiel).

## 0.24.0 – 2026-11-06

**New name: LMNT — Build Studio / Neuer Name: LMNT — Build Studio**

- The planner is now called **LMNT — Build Studio**, the mod **LMNT — Build Studio Bridge**. Menu titles, the key group under Options → Controls, the chat prefix `[Build Studio]` and the server plugin's messages use the new name.
- Nothing else changes: the commands stay `/bauplaner …` and `/buildplanner …`, folders, saved settings, plan files and the team room keep working as before. Search for “Build Studio” in the Modrinth App.

- Der Planer heißt jetzt **LMNT — Build Studio**, die Mod **LMNT — Build Studio Bridge**. Menütitel, die Tastengruppe unter Optionen → Steuerung, der Chat-Vorsatz `[Build Studio]` und die Meldungen des Server-Plugins tragen den neuen Namen.
- Sonst ändert sich nichts: Die Befehle bleiben `/bauplaner …` und `/buildplanner …`, Ordner, gespeicherte Einstellungen, Plandateien und der Team-Raum funktionieren wie bisher. In der Modrinth App nach „Build Studio“ suchen.

## 0.23.0 – 2026-11-06

**Easier to use, in German and English / Einfacher zu bedienen, auf Deutsch und Englisch**

- New menu (J): a side panel slides in from the right with four tabs – Plan, Move, View, Options. The world and the hologram stay visible next to it, nothing is blurred; it also fits small windows.
- Messages no longer fill the chat: they appear as short animated cards at the top right and fade out. Errors are red and shake briefly, the same message counts up (“×3”) instead of stacking. Lists you ask for (sections, materials, notes) stay in the chat. `/bauplaner meldungen einblendung|chat|beides` or the Options tab switch it.
- Build panel at the top right redone and compact: name, percent, an animated bar, what is still open and the way to the next error. `/bauplaner anzeige kompakt|ausfuehrlich|aus`. Team and world plan panels at the bottom right are stacked and never cover each other.
- Every command in German and English: `/bauplaner …` with German words and `/buildplanner …` with English words (e.g. `/buildplanner progress`, `/buildplanner team take 2`). Tab completion shows the words of the game language. All texts of the mod follow the game language; `/bauplaner sprache deutsch|englisch|auto` sets it.
- New `/bauplaner hilfe` (five short steps) and `/bauplaner menue`. The command page (J → “Commands & status”) speaks both languages and fades in.
- Colours and style match the new planner design.
- Server plugin: `/bauplaner weltplan` also works as `/bauplaner worldplan locks off|notice|lock` and answers in English for players with an English game language.
- Settings are stored in `bauplaner/oberflaeche.properties`. Nothing changes for the planner or the team room.

- Neues Menü (J): rechts gleitet eine Seitenleiste mit vier Reitern herein – Plan, Position, Ansicht, Optionen. Welt und Hologramm bleiben daneben sichtbar, nichts wird verschwommen; passt auch in kleine Fenster.
- Meldungen füllen den Chat nicht mehr: Sie erscheinen als kurze animierte Karten oben rechts und blenden wieder aus. Fehler sind rot und rütteln kurz, dieselbe Meldung zählt hoch („×3“) statt sich zu stapeln. Listen, die du abfragst (Abschnitte, Material, Notizen), bleiben im Chat. Umstellen mit `/bauplaner meldungen einblendung|chat|beides` oder im Reiter Optionen.
- Baufenster oben rechts neu und kompakt: Name, Prozent, animierter Balken, was noch offen ist, und der Weg zum nächsten Fehler. `/bauplaner anzeige kompakt|ausfuehrlich|aus`. Team- und Weltplan-Anzeige unten rechts stehen übereinander und überdecken sich nie.
- Jeder Befehl auf Deutsch und Englisch: `/bauplaner …` mit deutschen und `/buildplanner …` mit englischen Wörtern (z. B. `/buildplanner progress`, `/buildplanner team take 2`). Die Tab-Vervollständigung zeigt die Wörter der Spielsprache. Alle Texte der Mod folgen der Spielsprache; `/bauplaner sprache deutsch|englisch|auto` stellt sie ein.
- Neu `/bauplaner hilfe` (fünf kurze Schritte) und `/bauplaner menue`. Die Befehlsseite (J → „Befehle & Status“) spricht beide Sprachen und blendet weich ein.
- Farben und Stil passen zum neuen Planer-Design.
- Server-Plugin: `/bauplaner weltplan` geht auch als `/bauplaner worldplan locks off|notice|lock` und antwortet Spielern mit englischer Spielsprache auf Englisch.
- Einstellungen liegen in `bauplaner/oberflaeche.properties`. Für Planer und Team-Raum ändert sich nichts.

## 0.22.0 – 2026-11-06

**The team's world plan over the internet / Der Weltplan des Teams über das Internet**

- New: the planner shares the world plan (building sites, paths, zones, points, groups and locks) through the team room. Every mod in the team shows it in the game – marks, groups and locked areas in grey – without a planner on the same computer and without any file.
- Optional server plugin: draws the markers of the world plan itself on BlueMap (5.x, API 2) and Dynmap (3.7) and keeps them current whenever someone changes the plan. Nothing to download, copy or paste on the server any more. After a restart the markers are back at once.
- Optional server plugin: protection for locked entries, `/bauplaner weltplan sperren aus|hinweis|sperren` (default off). "hinweis" writes a chat line, "sperren" prevents placing, breaking and buckets there; permission `bauplaner.weltplan.umgehen` is exempt.
- `/bauplaner weltplan` on the server shows version, author, entries, markers, locks and the map plugins found.
- The list of saved server web maps is shared through the team room as well. The old file exports stay only as an emergency fallback in the planner.

- Neu: Der Planer teilt den Weltplan (Bauplätze, Wege, Zonen, Punkte, Gruppen und Sperren) über den Team-Raum. Jede Mod im Team zeigt ihn im Spiel – Markierungen, Gruppen und gesperrte Flächen grau – ohne Planer auf demselben Rechner und ohne Datei.
- Freiwilliges Server-Plugin: zeichnet die Marker des Weltplans selbst auf BlueMap (5.x, API 2) und Dynmap (3.7) und hält sie aktuell, sobald jemand den Plan ändert. Auf dem Server muss nichts mehr heruntergeladen, kopiert oder eingefügt werden. Nach einem Neustart sind die Marker sofort wieder da.
- Freiwilliges Server-Plugin: Schutz gesperrter Einträge, `/bauplaner weltplan sperren aus|hinweis|sperren` (Standard aus). „hinweis“ schreibt eine Chatzeile, „sperren“ verhindert dort Setzen, Abbauen und Eimer; die Berechtigung `bauplaner.weltplan.umgehen` ist ausgenommen.
- `/bauplaner weltplan` auf dem Server zeigt Stand, Urheber, Einträge, Marker, Sperren und die gefundenen Karten-Plugins.
- Auch die Liste der gespeicherten Server-Webkarten teilt sich über den Team-Raum. Die alten Datei-Exporte bleiben im Planer nur noch als Notfall.

## 0.21.0 – 2026-11-06

**The server gets the team over the internet / Der Server bekommt das Team über das Internet**

- New: when the team lead connects the game with the team room in the planner (“Team live” → “Connect my game”), the mod hands the room over to the optional server plugin by itself as soon as the lead (operator or `bauplaner.team.leitung`) joins the server. The plugin then gets sections, boxes, needed items, storage chests and section protection straight from the team room – nothing to download, upload or type.
- The planner keeps the room up to date on its own: changed sections, world placement or needs reach the server without a new release.
- Helpers never get the server key; the hand-over happens once per connection and room, a repeated one changes nothing.
- Server plugin: hints and help name the online way; team files (`team laden`, `team export`, `team verbinden <link>`) remain only as an emergency way without internet.
- New feature `roomserver` for the planner. Older planners and plugins keep working unchanged.

- Neu: Verbindet die Bauleitung im Planer ihr Spiel mit dem Team-Raum („Team live“ → „Mein Spiel verbinden“), übergibt die Mod den Raum selbst an das freiwillige Server-Plugin, sobald die Bauleitung (OP oder `bauplaner.team.leitung`) auf den Server kommt. Das Plugin holt Abschnitte, Boxen, Bedarf, Lagerkisten und Abschnittsschutz dann direkt aus dem Team-Raum – nichts herunterladen, hochladen oder eintippen.
- Der Planer hält den Raum selbst aktuell: geänderte Abschnitte, Lage auf der Weltkarte oder Bedarf kommen ohne neue Freigabe auf dem Server an.
- Helfer bekommen nie den Serverschlüssel; die Übergabe passiert einmal je Verbindung und Raum, eine wiederholte ändert nichts.
- Server-Plugin: Hinweise und Hilfe nennen den Online-Weg; Teamdateien (`team laden`, `team export`, `team verbinden <link>`) bleiben nur als Notfall ohne Internet.
- Neue Fähigkeit `roomserver` für den Planer. Ältere Planer und Plugins arbeiten unverändert weiter.
## 0.20.0 – 2026-11-06

**Terrain straight from the game / Gelände direkt aus dem Spiel**

- New terrain memory: while you walk or fly around, the mod remembers the surface of the chunks you see (top blocks, ground, water, biome), a few chunks per second, separately for every world or server. It is saved only on your computer (`bauplaner/gelaende/`) and never sent to the server.
- The planner's tabs “Terrain” and “Landscape” take a building site's terrain straight from the game – also parts you saw earlier and are no longer loaded – including biomes. No region files to upload. The planner shows how much of the site the game already knows and in which direction terrain is still missing.
- Block-exact terrain check from the game: the planner reads the blocks under a project from the loaded chunks (up to 2 million cells) and shows what is in the way and where the foundation hangs.
- `/bauplaner gelaende` shows how much the mod remembers; `an`/`aus` switches remembering on or off, `vergessen` deletes it for this world. Also on the command page.
- New features `terrain` and `box` for the planner (GET /v1/terrain, /v1/terrain/known, /v1/box). Older planners keep working unchanged.

- Neu Geländegedächtnis: Während du läufst oder fliegst, merkt sich die Mod die Oberfläche der Chunks, die du siehst (oberster Block, Boden, Wasser, Biom), ein paar Chunks pro Sekunde, getrennt je Welt oder Server. Gespeichert wird nur auf deinem PC (`bauplaner/gelaende/`), nichts geht an den Server.
- Die Reiter „Gelände“ und „Landschaft“ im Planer übernehmen das Gelände eines Bauplatzes direkt aus dem Spiel – auch Teile, die du früher gesehen hast und die gerade nicht geladen sind – samt Biomen. Keine Regionsdateien mehr hochladen. Der Planer zeigt, wie viel vom Bauplatz das Spiel schon kennt und in welcher Richtung noch Gelände fehlt.
- Blockgenaue Geländeprüfung aus dem Spiel: Der Planer liest die Blöcke unter einem Projekt aus den geladenen Chunks (bis 2 Mio. Zellen) und zeigt, was im Weg ist und wo das Fundament hängt.
- `/bauplaner gelaende` zeigt, wie viel sich die Mod gemerkt hat; `an`/`aus` schaltet das Merken ein oder aus, `vergessen` löscht es für diese Welt. Auch auf der Befehlsseite.
- Neue Fähigkeiten `terrain` und `box` für den Planer (GET /v1/terrain, /v1/terrain/known, /v1/box). Ältere Planer arbeiten unverändert weiter.

## 0.19.0 – 2026-11-06

**Groups and locks from the planner in the hologram / Gruppen und Sperren aus dem Planer im Hologramm**

- New: building sites, zones and paths of the world plan can carry a named group and a lock (planner: world builder, “Group …” and “🔒 Lock”). The mod reads both with the world plan.
- Locked areas: the hologram shows the plan there in grey, without textures and x-ray frames; the placement helper and the error finder leave these blocks alone, the HUD counts them (“40 locked (grey)”).
- One group only: `/bauplaner gruppe <name>` limits hologram, progress, material list, packing list and error finder to the area of that group; `/bauplaner gruppe alle` shows everything again. The planner can choose the group as well (live panel “World plan groups in game”), and the plan menu (J) has a row “Group”.
- Hide a group: `/bauplaner gruppe aus <name>` hides its marks and the hologram inside it, `/bauplaner gruppe an <name>` shows it again.
- New feature `groups` for the planner (POST /v1/group, status `hologram.group` and `hologram.locked`). Older planners keep working unchanged.

- Neu: Bauplätze, Zonen und Wege des Weltplans können eine benannte Gruppe und eine Sperre tragen (Planer: Weltbuilder, „Gruppe …“ und „🔒 Sperren“). Die Mod liest beides mit dem Weltplan.
- Gesperrte Flächen: Das Hologramm zeigt den Plan dort grau, ohne Texturen und ohne Röntgenrahmen; Platzierhilfe und Fehlerfinder lassen diese Blöcke in Ruhe, das HUD zählt sie („40 gesperrt (grau)“).
- Nur eine Gruppe: `/bauplaner gruppe <name>` beschränkt Hologramm, Fortschritt, Materialliste, Packliste und Fehlerfinder auf die Fläche dieser Gruppe; `/bauplaner gruppe alle` zeigt wieder alles. Auch der Planer kann die Gruppe wählen (Spielverbindung „Weltplan-Gruppen im Spiel“), und das Planmenü (J) hat eine Zeile „Gruppe“.
- Gruppe ausblenden: `/bauplaner gruppe aus <name>` blendet ihre Markierungen und das Hologramm darin aus, `/bauplaner gruppe an <name>` zeigt sie wieder.
- Neue Fähigkeit `groups` für den Planer (POST /v1/group, Status `hologram.group` und `hologram.locked`). Ältere Planer arbeiten unverändert weiter.

## 0.18.0 – 2026-11-06

**Build guides: symmetry and curves / Bauhilfen: Symmetrie und Kurven**

- New build guide symmetry: `/bauplaner symmetrie hier` (or `kante`, `x`, `z`, `drehen 2|4`, `aus`) sets a mirror or rotation axis where you stand. Every block you place then shows its mirrored and rotated copies as ghost blocks – doors, stairs, chests, rails and logs turn correctly, exactly like the symmetry tool in the planner. Breaking a placed source block removes its copies.
- New build guide curves: `/bauplaner kurve punkt` adds control points (also on a key, unbound by default), the mod shows a smooth curve as a pipe, path or wall (`profil`, `breite`, `hoehe`, `radius`, `geschlossen`, `glatt`). The cells are the same as in the planner's curve tool.
- Ghost blocks show progress above the hotbar; `/bauplaner bauhilfe alsplan [name]` saves the guide as a plan and shows it as hologram, so section, material list and placement helper work with it. Everything stays in your game – nothing is sent to the server.
- Material list (plan menu): new column “Lager” (storage) with the stock of the team's storage chests from the team room. Counts from the optional server plugin are checked; content only seen in the game is marked with *. `/bauplaner team lager` also names the source and age of each count.
- Optional server plugin: its storage records also keep the chest content last seen in the game (same rules as planner and mod).
- Server plugin: faster with several teams (team state is kept per team instead of rebuilt for every request).

- Neu Bauhilfe Symmetrie: `/bauplaner symmetrie hier` (oder `kante`, `x`, `z`, `drehen 2|4`, `aus`) setzt eine Spiegel- oder Drehachse an deiner Stelle. Jeder gesetzte Block zeigt dann seine gespiegelten und gedrehten Kopien als Geisterblöcke – Türen, Treppen, Truhen, Schienen und Stämme drehen richtig mit, genau wie das Symmetrie-Werkzeug im Planer. Wird ein gesetzter Ausgangsblock abgebaut, verschwinden seine Kopien.
- Neu Bauhilfe Kurven: `/bauplaner kurve punkt` setzt Kontrollpunkte (auch per Taste, standardmäßig nicht belegt), die Mod zeigt eine glatte Kurve als Rohr, Weg oder Mauer (`profil`, `breite`, `hoehe`, `radius`, `geschlossen`, `glatt`). Die Zellen sind dieselben wie im Kurvenwerkzeug des Planers.
- Geisterblöcke zeigen den Fortschritt über der Schnellleiste; `/bauplaner bauhilfe alsplan [name]` speichert die Bauhilfe als Plan und blendet sie als Hologramm ein, damit Abschnitte, Materialliste und Platzierhilfe damit arbeiten. Alles bleibt in deinem Spiel – nichts geht an den Server.
- Materialliste (Planmenü): neue Spalte „Lager“ mit dem Bestand der Team-Lagerkisten aus dem Team-Raum. Zählungen des freiwilligen Server-Plugins gelten als geprüft; nur im Spiel gesehener Inhalt ist mit * markiert. `/bauplaner team lager` nennt zusätzlich Quelle und Alter jeder Zählung.
- Freiwilliges Server-Plugin: seine Lagerdaten führen je Kiste auch den zuletzt im Spiel gesehenen Inhalt (gleiche Regeln wie Planer und Mod).
- Server-Plugin: schneller mit mehreren Teams (der Teamstand wird je Team vorgehalten statt bei jeder Anfrage neu aufgebaut).

## 0.17.2 – 2026-11-05

**Plan menu fits small windows / Planmenü passt in kleine Fenster**

- Fixed: in a small game window or with a large GUI scale (e.g. 854×480), the buttons “Commands & status” and “Done” covered the row “Section: all” in the plan menu (J). The right column now gets tighter rows when space is short, and these two buttons move under the plan list.

- Behoben: In einem kleinen Spielfenster oder bei großer GUI-Größe (z. B. 854×480) verdeckten die Knöpfe „Befehle & Status“ und „Fertig“ im Planmenü (J) die Zeile „Abschnitt: alle“. Die rechte Spalte rückt bei wenig Platz enger zusammen, und die beiden Knöpfe wandern unter die Planliste.

## 0.17.1 – 2026-11-05

**Planner also on Cloudflare Pages / Planer auch unter Cloudflare Pages**

- The game connection now also accepts the planner at https://bauplaner.pages.dev/Minecraft-Bauplaner/ (faster mirror of the planner), besides https://freadeax.github.io. Nothing else changes.

- Die Spielverbindung nimmt den Planer jetzt auch unter https://bauplaner.pages.dev/Minecraft-Bauplaner/ an (schnellerer Spiegel des Planers), neben https://freadeax.github.io. Sonst ändert sich nichts.

## 0.17.0 – 2026-11-05

**More reliable connection to the team room / Verbindung zum Team-Raum zuverlässiger**

- Fixed: when several messages left the game at the same moment (e.g. waiting measurements after reconnecting, position and team actions), only the first one reached the team room – the others were dropped without notice. Messages now go out strictly one after the other.
- Fixed: a measurement sent right before the connection broke could get lost. It now stays waiting until the team room confirms it, and goes out again with the same id (never twice in the room).
- Optional server plugin: when it sent two messages at once (an answer to the planner and new team events), it dropped its room connection and reconnected. Now queued as well; it also keeps the connection alive with a small ping every 30 seconds and shows the room's error texts correctly.

- Behoben: Gingen mehrere Nachrichten gleichzeitig aus dem Spiel (z. B. gemerkte Messungen nach dem Wiederverbinden, Position und Teamaktionen), kam nur die erste im Team-Raum an – die anderen fielen unbemerkt weg. Nachrichten gehen jetzt streng nacheinander raus.
- Behoben: Eine Messung, die kurz vor einem Verbindungsabbruch rausging, konnte verloren gehen. Sie bleibt jetzt gemerkt, bis der Team-Raum sie bestätigt, und geht mit derselben Kennung erneut raus (im Raum nie doppelt).
- Freiwilliges Server-Plugin: Schickte es zwei Nachrichten auf einmal (Antwort an den Planer und neue Teamereignisse), trennte es die Raumverbindung und verband neu. Jetzt ebenfalls in einer Warteschlange; dazu hält ein kleiner Ping alle 30 Sekunden die Verbindung offen, und Fehlertexte des Raums werden richtig angezeigt.

## 0.16.0 – 2026-11-04

**Fallbacks: team mode keeps working when the connection does not / Ausweichwege: Teammodus läuft weiter, wenn die Verbindung nicht will**

- The game keeps the team state from the team room on this computer. After a restart without internet you still see sections, owners and notes (“shows the state of …”); on reconnect only the new part is fetched.
- If the network blocks WebSockets (proxy, firewall) but the room is reachable, the mod switches to plain HTTP polling by itself – everything keeps working with a few seconds delay; every few minutes it tries the WebSocket again.
- What the hologram measures per section and what you see in team chests is no longer lost while offline: the newest measurement per section/chest waits and is sent on reconnect, with the time it was measured.
- J → “Commands & status” shows how the mod is connected and how many reports are waiting. The planner’s new “Fetch build state (best way)” uses your game on this PC first, then the games in the team room, then the optional server plugin.

- Das Spiel behält den Teamstand aus dem Team-Raum auf diesem Rechner. Nach einem Neustart ohne Internet siehst du Abschnitte, Zuständige und Notizen weiter („zeigt den Stand von …“); beim Wiederverbinden kommt nur das Neue.
- Sperrt das Netz WebSockets (Proxy, Firewall), ist der Raum aber erreichbar, wechselt die Mod von selbst auf einfache HTTP-Abfragen – alles läuft weiter, nur ein paar Sekunden verzögert; alle paar Minuten versucht sie den WebSocket erneut.
- Was das Hologramm je Abschnitt misst und was du in Team-Kisten siehst, geht offline nicht mehr verloren: Die neueste Messung je Abschnitt/Kiste wartet und geht beim Wiederverbinden raus, mit dem Zeitpunkt der Messung.
- J → „Befehle & Status“ zeigt, wie die Mod verbunden ist und wie viele Meldungen warten. Im Planer nimmt „Baustand holen (bester Weg)“ zuerst dein Spiel auf diesem PC, dann die Spiele im Team-Raum, dann das freiwillige Server-Plugin.

## 0.15.0 – 2026-11-04

**Team mode in the game, even less server / Teammodus im Spiel, noch weniger Server**

- Positions: while your game is connected to the team room, the others see where you are (player name and block position, at most every 2 seconds and only after moving) – in the planner under “Who's here”. Nothing goes to the Minecraft server.
- Recording through the room: in the planner (“Build” tab) “Request recording from the game” – the game that has the plan placed reads its loaded chunks and puts the file into the team room; the planner loads it right away. Or in the game: `/bauplaner team aufnahme`. No plugin, no copying files.
- The game reports what the hologram measures per section (placed, total, wrong, what is missing) at most every 30 seconds and only on change, and the content of marked team chests when you open and close them. These reports are marked as unverified; the plugin's checked chests stay the proof.
- Marked team chests come from the room now as well, so `/bauplaner team lager` and the packing list know them without the plugin.

- Positionen: Solange dein Spiel mit dem Team-Raum verbunden ist, sehen die anderen, wo du bist (Spielername und Blockposition, höchstens alle 2 Sekunden und nur nach Bewegung) – im Planer unter „Gerade da“. An den Minecraft-Server geht nichts.
- Aufnahme über den Raum: im Planer (Reiter „Bauen“) „Aufnahme im Spiel anfordern“ – das Spiel mit dem platzierten Plan liest seine geladenen Chunks und legt die Datei in den Team-Raum; der Planer lädt sie sofort. Oder im Spiel `/bauplaner team aufnahme`. Kein Plugin, kein Dateienkopieren.
- Das Spiel meldet, was das Hologramm je Abschnitt misst (gesetzt, gesamt, falsch, was fehlt), höchstens alle 30 Sekunden und nur bei Änderung, und den Inhalt markierter Team-Kisten beim Öffnen und Schließen. Diese Meldungen sind als ungeprüft gekennzeichnet; die geprüften Kisten des Plugins bleiben der Nachweis.
- Markierte Team-Kisten kommen jetzt auch aus dem Raum, damit `/bauplaner team lager` und die Packliste sie ohne Plugin kennen.

## 0.14.0 – 2026-11-04

**Team building without any server file / Teambau ohne Server-Datei**

- The mod now talks to the team room itself: section owners, reports, notes and roles come live into the game, and your own “take section”, “report done” and notes go straight to the room – the Minecraft server needs no plugin and no file.
- Connect from the planner with one click (“Team live” → “Connect my game”); disconnect there as well. The room is kept on this computer only; the mod still sends nothing to the Minecraft server unless you allow the team channel there.
- J → “Commands & status” shows the team room (live, who is there). The Paper plugin stays optional for enforced section protection and checked storage chests.

- Die Mod spricht jetzt selbst mit dem Team-Raum: Abschnitte, Meldungen, Notizen und Rollen kommen live ins Spiel, und dein „Abschnitt nehmen“, „fertig melden“ und Notizen gehen direkt in den Raum – der Minecraft-Server braucht kein Plugin und keine Datei.
- Verbinden im Planer mit einem Klick („Team live“ → „Mein Spiel verbinden“), dort auch trennen. Der Raum bleibt nur auf diesem Rechner gespeichert; an den Minecraft-Server schickt die Mod weiter nichts ohne Teambau-Erlaubnis.
- J → „Befehle & Status“ zeigt den Team-Raum (live, wer da ist). Das Paper-Plugin bleibt freiwillig für erzwungenen Abschnittsschutz und geprüfte Lagerkisten.

## 0.13.0 – 2026-11-04

**Packing list, scaffold hints, marks for the world map / Packliste, Gerüst, Markierungen für die Weltkarte**

- `/bauplaner packliste`: what you still have to fetch for the shown part of the plan, minus what you carry, in stacks and shulker boxes, and which team storage chest holds it (nearest first).
- `/bauplaner geruest`: open blocks with nothing to place them against (floating parts) and falling blocks (sand, gravel, concrete powder) without support; the pointer jumps to the nearest.
- `/bauplaner markieren <type> [name]` sets a point where you stand; the planner's world map takes it into the world plan with one click (“Take into world plan”). `/bauplaner markierungen` lists waiting points. Website connection only, nothing goes to the server.
- All three are on the commands page (J → “Commands & status”).
- Paper plugin: the planner starts the capture of the build state on the server and fetches the file itself (“Record on the server” in the “Build” tab) – no `/bp scan`, no copying files from the server folder. Works through the mod and through the team room; the world is never changed. Only files in the captures folder can be fetched.
- Paper plugin: yield chests – a farm's collecting chest measures items and running time (only while its chunk is loaded) for the planner's yield book; hopper moves are bundled (at most one booking per minute).

- `/bauplaner packliste`: was du für den gezeigten Teil des Plans noch holen musst, abzüglich dessen, was du trägst, in Stapeln und Shulkerkisten, und welche Team-Lagerkiste es hat (nächste zuerst).
- `/bauplaner geruest`: offene Blöcke ohne Halt zum Ansetzen (schwebende Teile) und fallende Blöcke (Sand, Kies, Trockenbeton) ohne Block darunter; der Zeiger springt zum nächsten.
- `/bauplaner markieren <art> [name]` setzt einen Punkt, wo du stehst; die Weltkarte des Planers übernimmt ihn mit einem Klick („In den Weltplan übernehmen“). `/bauplaner markierungen` listet die wartenden. Nur über die Website-Verbindung, nichts geht an den Server.
- Alle drei stehen auf der Befehlsseite (J → „Befehle & Status“).
- Paper-Plugin: Der Planer startet die Aufnahme des Baustands auf dem Server und holt die Datei selbst („Auf dem Server aufnehmen“ im Reiter „Bauen“) – kein `/bp scan`, kein Kopieren aus dem Serverordner. Geht über die Mod und über den Team-Raum; die Welt wird nie verändert. Abholbar sind nur Dateien aus dem Aufnahmeordner.
- Paper-Plugin: Ertragskisten – die Sammeltruhe einer Farm misst Ertrag und Laufzeit (nur bei geladenem Chunk) für das Ertragsbuch im Planer; Trichterbewegungen werden gebündelt (höchstens eine Buchung pro Minute).

## 0.12.0 – 2026-11-04

**No more server commands / Server ohne Befehle**

- Website link starts by itself. The website asks, the game shows “Press J”, you click “Allow planner” – no code, no command.
- Team channel: allowing it for a server is now a button in the J menu (“Allow team building”). It is still off until you allow it, per server.
- Paper plugin sets itself up on first start (server ID, no configuration needed). An operator pairs the server from the planner with one click while playing with the mod.
- The planner changes server settings (section protection, storage chests, proof, capture), loads the team, connects the team room, renames the server and manages paired devices by signed messages – nobody types a command on the server. Replays, wrong signatures and messages for another server are refused; nothing ever places blocks or runs commands.
- Second way through the team room: a paired PC can authorise another own device (e.g. an iPad), which then controls the server without the mod.
- The old commands still work as a fallback.

- Website-Verbindung startet von selbst. Die Website fragt, im Spiel steht „J drücken“, du klickst „Planer zulassen“ – kein Code, kein Befehl.
- Teamkanal: Die Freigabe je Server ist jetzt ein Knopf im J-Menü („Teambau erlauben“). Ohne Freigabe bleibt er wie bisher aus.
- Paper-Plugin richtet sich beim ersten Start selbst ein (Server-ID, nichts einzustellen). Ein OP koppelt den Server im Planer mit einem Klick, während er mit der Mod spielt.
- Der Planer ändert Server-Einstellungen (Abschnittsschutz, Lagerkisten, Baunachweis, Aufnahme), lädt das Team, verbindet den Team-Raum, benennt den Server um und verwaltet gekoppelte Geräte per unterschriebener Nachricht – auf dem Server tippt niemand einen Befehl. Wiederholungen, falsche Unterschriften und Nachrichten für einen anderen Server werden abgewiesen; nichts setzt Blöcke oder führt Befehle aus.
- Zweiter Weg über den Team-Raum: Ein gekoppelter PC gibt ein weiteres eigenes Gerät frei (z. B. iPad), das den Server dann ohne Mod einstellt.
- Die bisherigen Befehle funktionieren weiter als Ausweg.

## 0.11.2 – 2026-11-03

- Paper plugin: live connection to a team room (`/bp team verbinden <link>` in the server console, `/bp team raum`, `/bp team trennen`).
- Mod: the commands page shows “Team room (status)” and “Disconnect team room”.

- Paper-Plugin: Live-Verbindung zu einem Team-Raum (`/bp team verbinden <link>` in der Serverkonsole, `/bp team raum`, `/bp team trennen`).
- Mod: Befehlsseite mit „Team-Raum (Status)“ und „Team-Raum trennen“.

## 0.11.1 – 2026-11-03

- Plans exported with “structure void” for empty space are shown correctly: those cells are no longer treated as blocks to build.

- Pläne, die leere Stellen als „Strukturleere“ (structure_void) enthalten, werden richtig angezeigt: diese Zellen zählen nicht mehr als zu bauende Blöcke.

## 0.11.0 – 2026-11-03

**Commands & status page / Befehle & Status**

- New page “Befehle & Status” in the plan menu (J), also via `/bauplaner befehle`: every command of the mod and of the Bauplaner Paper plugin (hologram, team, storage chests, proof, website link, capture) by click, with input fields, a status overview and the answers of mod and server.
- A click sends exactly the command you would type – no extra packets. Server buttons only work when the server has the Bauplaner plugin; buttons that need something else (a plan, a team, the build lead role, a chest in view) are greyed out and say why.
- Paper plugin: hand over sections (`/bp uebergeben`, `annehmen`, `ablehnen`) and mark yourself away (`/bp abwesend`, `zurueck`); the team channel carries these events too.

- Neue Seite „Befehle & Status“ im Plan-Menü (J), auch mit `/bauplaner befehle`: alle Befehle der Mod und des Bauplaner-Paper-Plugins (Hologramm, Team, Lagerkisten, Nachweis, Website-Verbindung, Aufnahme) per Klick, mit Eingabefeldern, Statusübersicht und den Antworten von Mod und Server.
- Ein Klick sendet genau den Befehl, den man eintippen würde – keine zusätzlichen Pakete. Serverknöpfe gehen nur, wenn der Server das Bauplaner-Plugin hat; Knöpfe, denen etwas fehlt (Plan, Team, Bauleitung, angeschaute Kiste), sind ausgegraut und nennen den Grund.
- Paper-Plugin: Abschnitte übergeben (`/bp uebergeben`, `annehmen`, `ablehnen`) und Abwesenheit melden (`/bp abwesend`, `zurueck`); auch über den Teamkanal.

## 0.10.0 – 2026-11-03

**Team building / Teambau**

- Team building with the Bauplaner Paper plugin: section frames in the owner's colour, “My task” in the HUD, `/bauplaner team` to claim, finish and hand back sections, notes and deliveries, storage chests of the team.
- The mod only talks to the server's team channel after the server announces it and you run `/bauplaner team erlauben` once on that server.
- Website link: “Sync with game” exchanges the team state with the planner on the same PC.
- NeoForge: fixed a crash at load time caused by the team channel.
- Paper plugin: team hub for the channel above and protected team storage chests that count deliveries.

- Teambau mit dem Paper-Plugin: Abschnittsrahmen in der Farbe des Bauenden, „Mein Auftrag“ im HUD, `/bauplaner team` zum Nehmen, Fertigmelden und Zurückgeben, Notizen, Lieferungen und Lagerkisten.
- Der Teamkanal zum Server wird erst benutzt, wenn der Server ihn anbietet und du einmal je Server `/bauplaner team erlauben` eingibst.
- Website-Verbindung: „Mit Spiel abgleichen“ tauscht den Teamstand mit dem Planer auf demselben PC aus.
- NeoForge: Absturz beim Laden durch den Teamkanal behoben.
- Paper-Plugin: Teamknoten für den Kanal und geschützte Lagerkisten des Teams, die Lieferungen mitzählen.

## 0.9.0 – 2026-11-03

- Large plans up to 4 million blocks: loading and moving in the background, build state checked in slices, `/bauplaner leistung` adjusts the render budget. / Große Pläne bis 4 Mio. Blöcke, Laden im Hintergrund, `/bauplaner leistung`.

## 0.8.0 – 2026-11-02

- Live protocol 2: zones, layers and colours for map markers, new point types, nearby players for the website. / Zonen, Ebenen, Farben, neue Punktarten, Mitspieler für die Website.

## 0.7.2 – 2026-11-02

- `/bauplaner diagnose` writes a report for bug reports; crash guard for the hologram. / Diagnosebericht und Absturzschutz.

## 0.7.1 – 2026-11-02

- The website can read the build state from the game (`/v1/scan`). / Baustand für die Live-Karte.

## 0.7.0 – 2026-11-02

- Build sections, x-ray view, shulker boxes and bundles in the material list. / Bauabschnitte, Röntgensicht, Shulkerkisten.

## 0.6.0 – 2026-11-02

- NeoForge gets the full client mod; works with shaders. / NeoForge mit vollem Funktionsumfang, Shader-tauglich.

## 0.5.0 – 2026-11-02

- Optional local link to the planner website and map markers. / Website-Verbindung und Weltplan-Markierungen.

## 0.4.0 – 2026-11-02

- Placement helper. / Platzierhilfe.

## 0.3.0 – 2026-11-02

- Textures, material list and layers. / Texturen, Materialliste, Ebenen.

## 0.2.0 – 2026-11-02

- Hologram with live progress. / Hologramm mit Live-Abgleich.

## 0.1.0

- First version: record a build area for the planner. / Erste Version: Aufnahme für den Planer.
