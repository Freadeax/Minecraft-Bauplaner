**LMNT — Build Studio Bridge** brings the plans you make in the [LMNT — Build Studio](https://freadeax.github.io/Minecraft-Bauplaner/) into your world. The plan appears as a hologram exactly where you want to build, and the mod checks block by block what is already right, what is missing and what is wrong. It never places or removes a block for you.

*Deutsche Beschreibung weiter unten.*

## What it does

- **Hologram of your plan.** Load a `.schem` exported from the Build Studio, put it where you are looking, then move, rotate and mirror it. The position is remembered per world and server.
- **Live progress.** The HUD shows how much is done and how many blocks are missing, wrong or in the wrong state (stairs facing the wrong way, for example), and points you to the next mistake.
- **Layers, sections and x-ray.** Show all layers, one layer or everything up to a layer. Build the plan section by section as planned on the website, and see open blocks through walls.
- **Material and packing list.** What is still open, what you carry (shulker boxes and bundles count) and what you still need to fetch, in stacks and shulker boxes. With a team, a *storage* column shows the stock of your team's storage chests and the packing list names the nearest chest that holds it.
- **Build guides: symmetry and curves.** Set a mirror or rotation axis where you stand, and every block you place shows its mirrored and rotated copies as ghost blocks (doors, stairs, chests and logs turn correctly). Or set control points and the mod shows a smooth curve as a pipe, path or wall. Save a guide as a plan to use sections, material list and placement helper with it. Everything stays in your game.
- **Groups and locked areas.** Building sites, zones and paths of your world plan can have a group and a lock. Locked areas appear grey in the hologram and the placement helper leaves them alone. `/bauplaner gruppe <name>` limits hologram, progress and material list to one group.
- **Placement helper.** Optionally stops you from placing a wrong block or a wrong rotation inside the plan, or only warns you. Pick the planned block straight into your hand. `/bauplaner geruest` finds floating parts and falling blocks without support.
- **Simple menu and quiet chat.** `J` slides in a side panel with four tabs – Plan, Move, View, Options – while the world stays visible. Messages appear as short animated cards at the top right instead of filling the chat; errors are red. The build panel at the top right is compact and can be switched to detailed or off.
- **Commands & status.** Press `J` → *Commands & status* for every command as a button, and to see how the mod is connected. `/bauplaner hilfe` shows the five steps to get started.
- **Link to the planner on the same PC.** The website finds the game by itself. Nothing happens until you press `J` in the game and click *Allow planner*. Then the website can send plans and map markers to the game and read back the build state. You can also set map markers in the game (`/bauplaner markieren`).
- **Terrain for the planner.** While you walk or fly around, the mod remembers the surface of the chunks you have seen (heights, top blocks, water, biomes) on this PC. The planner's *Terrain* and *Landscape* tabs take a building site's terrain straight from the game, without region files, and can check the site block by block. `/bauplaner gelaende aus` switches it off.
- **Team building (optional).** Connect your game to your team's *team room* from the planner with one click. Section owners, reports, notes and storage chests come live into the game, and your own actions go to the team. Nothing goes to the Minecraft server; the server needs no plugin for this. If the network blocks WebSockets, the mod falls back to plain HTTP, and it keeps the last team state when you are offline. With the optional Paper plugin, the team lead's game hands the team room to the server by itself when the lead (operator) joins – the plugin then gets sections, storage chests and section protection over the internet, with no file to download or upload.
- **The team's world plan.** Building sites, paths, zones, points, groups and locks from the planner reach every player of the team through the team room, even when their planner is not open.
- **Large builds.** Plans with up to 4 million blocks load in the background and are checked in slices.

## Good to know

- **Client-side.** The mod works in singleplayer and on any multiplayer server. The server does not need it.
- **What goes over the network.** Without a team room, nothing leaves your PC: the planner link only listens on `127.0.0.1`. With a team room (your choice in the planner), the mod sends your player name, your position and build section while you play, and your team actions and measurements to that room. See *Content disclosures* on this page.
- **Language.** Everything is in English and German and follows your game language (or `/buildplanner language english|german|auto`). Every command works in both languages: `/buildplanner …` with English words, `/bauplaner …` with German words, with tab completion in your language.
- **Keys.** `J` opens the plan menu. All keys can be changed under *Options → Controls → Build Studio*. `/buildplanner help` shows how to start; all commands are listed on the [planner page](https://freadeax.github.io/Minecraft-Bauplaner/#/mod).
- **Works with** Iris with shader packs, Xaero's Minimap, Jade and REI (tested in a real Fabric modpack).

## Downloads in this project

| File | For | Needs |
|---|---|---|
| Fabric | Minecraft 26.3 client | Fabric Loader 0.19.5+, Fabric API, Java 25 |
| NeoForge | Minecraft 26.3 client | NeoForge 26.3.0.100+, Java 25 |
| Paper plugin (optional) | Paper **server** 1.18.2 to 26.3 | Java 17+. Goes into the server's `plugins` folder, not into a client `mods` folder |

The Paper plugin is optional. It sets itself up, an operator pairs it from the planner with one click, and nobody needs to type server commands. It adds what only a server can do: recording the build state of the whole area, enforced section protection, checked team storage chests, yield chests for farms, markers of the team's world plan drawn on BlueMap or Dynmap, and optional protection of locked building sites. It never changes the world.

## Links

- Planner website: <https://freadeax.github.io/Minecraft-Bauplaner/>
- Mod guide and all versions: <https://freadeax.github.io/Minecraft-Bauplaner/#/mod>
- Source code: <https://github.com/Freadeax/Minecraft-Bauplaner>
- Report a bug: <https://github.com/Freadeax/Minecraft-Bauplaner/issues>

---

## Deutsch

**Build-Studio-Brücke** holt die Pläne aus [LMNT — Build Studio](https://freadeax.github.io/Minecraft-Bauplaner/) als Hologramm in deine Welt. Die Mod prüft Block für Block, was schon stimmt, was fehlt und was falsch ist, und baut nie selbst.

- **Hologramm** an der gewünschten Stelle, verschieben, drehen, spiegeln; die Lage wird je Welt und Server gemerkt.
- **Baustand live** im HUD mit Hinweis auf den nächsten Fehler.
- **Ebenen, Bauabschnitte und Röntgensicht.**
- **Material- und Packliste** mit Inventar, Shulkerkisten, Bündeln, Lagerbestand des Teams und der nächsten Team-Kiste.
- **Bauhilfen Symmetrie und Kurven:** Spiegel- oder Drehachse setzen, jeder Block zeigt seine Kopien als Geisterblöcke; Kurven als Rohr, Weg oder Mauer. Als Plan speicherbar, alles bleibt im Spiel.
- **Gruppen und Sperren** aus dem Weltplan: gesperrte Flächen grau im Hologramm, `/bauplaner gruppe <name>` zeigt nur eine Gruppe samt Fortschritt und Material.
- **Platzierhilfe**, die falsche Blöcke verhindert oder nur warnt; `/bauplaner geruest` findet schwebende Teile.
- **Einfaches Menü, ruhiger Chat:** `J` schiebt eine Seitenleiste mit den Reitern Plan, Position, Ansicht, Optionen herein, die Welt bleibt sichtbar. Meldungen erscheinen als kurze animierte Karten oben rechts statt im Chat, Fehler rot. Das Baufenster oben rechts ist kompakt.
- **Befehle & Status** im J-Menü: jeder Befehl als Knopf, dazu der Verbindungsstand. `/bauplaner hilfe` zeigt die fünf Schritte zum Start.
- **Deutsch und Englisch:** Alles folgt der Spielsprache; jeder Befehl geht als `/bauplaner …` (deutsch) und `/buildplanner …` (englisch).
- **Planer auf demselben PC:** Die Website findet das Spiel selbst; erst nach `J` → *Planer zulassen* tauscht sie Pläne, Markierungen und Baustand aus.
- **Gelände für den Planer:** Die Mod merkt sich auf diesem PC das Gelände, das du gesehen hast (Höhen, oberste Blöcke, Wasser, Biome). Die Reiter *Gelände* und *Landschaft* übernehmen es direkt aus dem Spiel, ohne Regionsdateien. `/bauplaner gelaende aus` schaltet es ab.
- **Weltplan des Teams:** Bauplätze, Wege, Zonen, Punkte, Gruppen und Sperren aus dem Planer kommen über den Team-Raum zu allen im Team, auch wenn deren Planer nicht offen ist. Das freiwillige Paper-Plugin zeichnet sie selbst auf BlueMap oder Dynmap.
- **Teambau** (freiwillig): Spiel im Planer mit einem Klick mit dem Team-Raum verbinden. Abschnitte, Meldungen, Notizen und Kisten kommen live ins Spiel. Der Minecraft-Server braucht dafür nichts. Mit dem freiwilligen Paper-Plugin verbindet das Spiel der Bauleitung den Server selbst mit dem Team-Raum – ohne Datei herunterladen oder hochladen.

Reine Client-Mod. Ohne Team-Raum verlässt nichts deinen PC; mit Team-Raum gehen Spielername, Position, Abschnitt, Teamaktionen und Messungen an diesen Raum. `J` öffnet das Planmenü, alle Tasten unter *Optionen → Steuerung → Build Studio*. Das Paper-Plugin ist freiwillig und gehört nur auf den Server in den Ordner `plugins`.
