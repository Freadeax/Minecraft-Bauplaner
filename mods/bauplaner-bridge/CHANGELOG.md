# Änderungen der Bauplaner-Brücke

Je Version ein Abschnitt `## <Version> – <Datum>`. `scripts/modrinth_publish.mjs release` übernimmt den Abschnitt der Version unverändert als Änderungsliste auf Modrinth und bricht ab, wenn er fehlt. Englisch zuerst, Deutsch danach.

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
