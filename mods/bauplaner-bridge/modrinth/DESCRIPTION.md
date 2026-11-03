**Bauplaner Bridge** brings the plans you make in the [Minecraft-Bauplaner](https://freadeax.github.io/Minecraft-Bauplaner/) into your world. The plan appears as a hologram exactly where you want to build, and the mod checks block by block what is already right, what is missing and what is wrong. It never places or removes a block for you.

*Deutsche Beschreibung weiter unten.*

## What it does

- **Hologram of your plan.** Load a `.schem` exported from the Bauplaner, put it where you are looking, then move, rotate and mirror it. The position is remembered per world and server.
- **Live progress.** The HUD shows how much is done and how many blocks are missing, wrong or in the wrong state (stairs facing the wrong way, for example), and points you to the next mistake.
- **Layers, sections and x-ray.** Show all layers, one layer or everything up to a layer. Build the plan section by section as planned on the website, and see open blocks through walls.
- **Material list.** Lists what is still open, what is in your inventory and what you still need to fetch. Shulker boxes and bundles you carry are counted.
- **Placement helper.** Optionally stops you from placing a wrong block or a wrong rotation inside the plan, or only warns you. You can pick the planned block straight into your hand.
- **Link to the website (optional).** On the same PC, the Bauplaner website can send plans and map markers to the game and read back the build state. The link only listens on `127.0.0.1` and only starts after `/bauplaner verbinden`, which shows a code you enter on the website.
- **Team building (optional).** With the Bauplaner Paper plugin on the server, a team can claim sections, report them as done and see who builds what. The mod only talks to the server after you run `/bauplaner team erlauben` once on that server.
- **Large builds.** Plans with up to 4 million blocks load in the background and are checked in slices.

## Good to know

- **Client-side.** The mod works in singleplayer and on any multiplayer server. The server does not need it.
- **No internet.** The mod sends nothing to the internet. Plans are files in your game folder (`bauplaner/plans`).
- **Language.** Key bindings are in English and German. The HUD, menus and chat messages are currently in German.
- **Keys.** `J` opens the plan menu. All keys can be changed under *Options → Controls → Bauplaner*. `/bauplaner` lists all commands.
- **Works with** Iris with shader packs, Xaero's Minimap, Jade and REI (tested in a real Fabric modpack).

## Downloads in this project

| File | For | Needs |
|---|---|---|
| Fabric | Minecraft 26.3 client | Fabric Loader 0.19.5+, Fabric API, Java 25 |
| NeoForge | Minecraft 26.3 client | NeoForge 26.3.0.100+, Java 25 |
| Paper plugin (optional) | Paper **server** 1.18.2 to 26.3 | Java 17+. Goes into the server's `plugins` folder, not into a client `mods` folder |

The Paper plugin reads a build area on the server to record progress, and is the team hub for team building. It never changes the world.

## Links

- Planner website: <https://freadeax.github.io/Minecraft-Bauplaner/>
- Mod guide and all versions: <https://freadeax.github.io/Minecraft-Bauplaner/#/mod>
- Source code: <https://github.com/Freadeax/Minecraft-Bauplaner>
- Report a bug: <https://github.com/Freadeax/Minecraft-Bauplaner/issues>

---

## Deutsch

**Bauplaner-Brücke** holt die Pläne aus dem [Minecraft-Bauplaner](https://freadeax.github.io/Minecraft-Bauplaner/) als Hologramm in deine Welt. Die Mod prüft Block für Block, was schon stimmt, was fehlt und was falsch ist, und baut nie selbst.

- **Hologramm** an der gewünschten Stelle, verschieben, drehen, spiegeln; die Lage wird je Welt und Server gemerkt.
- **Baustand live** im HUD mit Hinweis auf den nächsten Fehler.
- **Ebenen, Bauabschnitte und Röntgensicht.**
- **Materialliste** mit Inventar, Shulkerkisten und Bündeln.
- **Platzierhilfe**, die falsche Blöcke verhindert oder nur warnt.
- **Website-Verbindung** (freiwillig, nur auf demselben PC über `127.0.0.1`).
- **Teambau** (freiwillig) mit dem Paper-Plugin auf dem Server, erst nach `/bauplaner team erlauben`.

Reine Client-Mod, sendet nichts ins Internet. `J` öffnet das Planmenü, alle Tasten unter *Optionen → Steuerung → Bauplaner*. Das Paper-Plugin gehört nur auf den Server in den Ordner `plugins`.
