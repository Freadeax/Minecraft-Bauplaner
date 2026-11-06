package io.github.freadeax.bauplaner.mod.commands;

import java.util.HashMap;
import java.util.Map;

/**
 * English label and help of every {@link CommandCatalog} entry (GAME-12, 0.23.0). Kept apart so the German list
 * stays readable; {@code CommandCatalogTest} fails when an entry has no English text here.
 */
final class CommandCatalogEn {
    private CommandCatalogEn() {}

    static final Map<String, String[]> TEXT = new HashMap<>();
    static final Map<String, String> GROUPS = Map.of(CommandCatalog.STATUS, "Status", CommandCatalog.HOLOGRAM, "Hologram", CommandCatalog.TEAM, "Team",
            CommandCatalog.SERVER_TEAM, "Server team", CommandCatalog.STORAGE, "Storage", CommandCatalog.PROOF, "Record", CommandCatalog.LINK, "Connection",
            CommandCatalog.RECORD, "Scan", CommandCatalog.GUIDES, "Build guides", CommandCatalog.SETTINGS, "Settings");
    static final Map<String, String> ARGS = Map.ofEntries(Map.entry("viertel", "quarters"), Map.entry("nummer", "number"), Map.entry("stufe", "level"), Map.entry("modus", "mode"),
            Map.entry("fach", "fold"), Map.entry("profil", "profile"), Map.entry("bloecke", "blocks"), Map.entry("abschnitt", "section"), Map.entry("notiz", "note"),
            Map.entry("spieler", "player"), Map.entry("art", "kind"), Map.entry("menge", "amount"), Map.entry("ergebnis", "result"), Map.entry("datum notiz", "date note"),
            Map.entry("rolle", "role"), Map.entry("anzahl", "count"), Map.entry("zweck", "purpose"), Map.entry("nr", "no."), Map.entry("datei", "file"),
            Map.entry("umfang", "scope"), Map.entry("sprache", "language"), Map.entry("ort", "where"));

    private static void e(String id, String label, String help) { if (TEXT.put(id, new String[] { label, help }) != null) throw new IllegalStateException("doppelt: " + id); }

    static {
        // Hologram
        e("fortschritt", "Progress", "Percent, correct, missing, wrong.");
        e("fehler", "Next error", "Marks the next wrong or missing block.");
        e("packliste", "Packing list", "What to fetch for the shown part: stacks, shulker boxes, which storage chest.");
        e("geruest", "Scaffold hints", "Open blocks with nothing to place against and falling blocks without support; marks the nearest.");
        e("umschalten", "Show/hide", "Hologram visible or hidden.");
        e("roentgen", "X-ray", "Open blocks also through walls.");
        e("texturen", "Textures on/off", "Real block models or simple boxes.");
        e("material", "Material list (chat)", "What is still missing, with your inventory.");
        e("hierher", "Here", "Plan to the block you look at.");
        e("drehen", "Turn", "Turn by quarters (empty = 1 to the right).");
        e("spiegeln", "Mirror", "Mirror on the x axis.");
        e("verschieben", "Move", "By x y z blocks.");
        e("ebene", "Only layer y", "Show only this height.");
        e("ebene.bis", "Up to layer y", "Everything up to this height.");
        e("ebene.alle", "All layers", "Layer filter off.");
        e("abschnitt", "Choose section", "Only this build section (no.).");
        e("abschnitt.weiter", "Next section", "To the next build section.");
        e("abschnitt.alle", "All sections", "Section filter off.");
        e("platzierhilfe", "Placement helper", "on: wrong blocks are not placed, warn: hint only.");
        e("leistung", "Performance", "How many ghost blocks are drawn.");
        e("entfernen", "Remove plan", "Remove the hologram (the file stays).");
        e("diagnose", "Diagnosis", "Versions, plan, memory – for bug reports.");
        // Build guides
        e("symmetrie", "Symmetry state", "Axis, mode and how many blocks are mirrored.");
        e("symmetrie.x", "Mirror east/west", "Placed blocks appear mirrored as ghosts (on/off).");
        e("symmetrie.z", "Mirror north/south", "Mirrors on an east-west line (on/off).");
        e("symmetrie.drehen", "Rotational symmetry", "Turn 2- or 4-fold around the axis (1 = off).");
        e("symmetrie.hier", "Axis here", "Axis through the middle of the block you look at.");
        e("symmetrie.kante", "Axis on edge", "Axis at the corner of the block you look at (even widths).");
        e("symmetrie.aus", "Symmetry off", "Mirroring and turning off, ghosts gone.");
        e("kurve", "Curve state", "Points, profile, length and blocks of the curve.");
        e("kurve.punkt", "Add curve point", "Point where a block would go (crosshair).");
        e("kurve.zurueck", "Remove last point", "Removes the last curve point.");
        e("kurve.block", "Block from hand", "The block in your hand becomes the curve block.");
        e("kurve.profil", "Profile", "Pipe/line, path (flat band) or wall.");
        e("kurve.breite", "Width", "Width of path and wall (1–33).");
        e("kurve.hoehe", "Wall height", "Height of the wall (1–128).");
        e("kurve.radius", "Pipe radius", "Radius of the pipe (0 = line).");
        e("kurve.geschlossen", "Close ring", "Curve back to the first point (on/off).");
        e("kurve.versetzen", "Up/down", "Whole curve up (+) or down (−) by blocks.");
        e("kurve.loeschen", "Delete curve", "All curve points gone.");
        e("bauhilfe.alsplan", "As plan into the hologram", "Ghosts become a plan: material list, placement helper, progress.");
        e("bauhilfe.aus", "Build guides off", "Delete symmetry and curve.");
        // Team (client)
        e("team", "Overview", "Team, way to the server, your task.");
        e("team.abschnitte", "Sections", "All sections with owner and state.");
        e("team.nehmen", "Take section", "Take a free section.");
        e("team.abgeben", "Release", "Release your section (empty = the one you stand in).");
        e("team.fertig", "Report done", "Report a section as done, optionally with a note.");
        e("team.mein", "Show only mine", "Hologram only with your sections.");
        e("team.frei", "Show only free", "Hologram only with free sections.");
        e("team.alle", "Show all", "Clear the section choice.");
        e("team.zeigen", "Show section", "Frame and direction to a section.");
        e("team.material", "My material", "What your task still needs: carried, to fetch, in storage (empty = you).");
        e("team.notiz", "Write note", "Note at your position.");
        e("team.notizen", "Notes", "Open notes, nearest first.");
        e("team.erledigt", "Note resolved", "Mark a note as resolved (ID from “Notes”).");
        e("team.geliefert.hand", "Delivered from hand", "Report the stack in your hand as a delivery.");
        e("team.geliefert", "Report delivery", "Item and amount as a delivery.");
        e("team.sammle", "Collect order", "I collect this item.");
        e("team.pruefen", "Review", "Confirm a section or ask for rework (master builder).");
        e("team.zuweisen", "Assign", "Give a section to a player (master builder).");
        e("team.lager", "Storage chests", "Storage chests from the server with checked state.");
        e("team.aufnahme", "Build state to the team room", "Scan the placed plan and put it into the team room; the planner fetches it under “Compare with game”.");
        e("team.korb", "Outbox", "Messages still waiting for planner or server.");
        e("team.rahmen", "Frames on/off", "Section frames in the game.");
        e("team.anzeige", "Panel on/off", "Team panel at the bottom right.");
        e("team.status", "Channel status", "Way to the server plugin and permission.");
        e("team.erlauben", "Allow team building", "Switch on the team channel for this server (once per server). Server link and planner settings use it too.");
        e("team.verbieten", "Forbid channel", "Team channel off for this server: the mod sends nothing.");
        // Server team (plugin)
        e("bp.team", "Overview (server)", "What the server knows about you and the team.");
        e("bp.abschnitte", "Sections (server)", "Sections according to the server.");
        e("bp.nehmen", "Take (server)", "Take a section directly on the server.");
        e("bp.abgeben", "Release (server)", "Release a section.");
        e("bp.fertig", "Done (server)", "Report done (empty = where you stand).");
        e("bp.zeigen", "Show outline", "Particle outline of the section.");
        e("bp.notiz", "Note (server)", "Note at your position.");
        e("bp.notizen", "Notes (server)", "Open notes.");
        e("bp.geliefert", "Delivered from hand (server)", "Stack in your hand as a delivery.");
        e("bp.sammle", "Collect order (server)", "I collect … (without amount: what the needs still lack).");
        e("bp.pruefen", "Review (server)", "Confirm or rework (master builder).");
        e("bp.zuweisen", "Assign (server)", "Give a section to a player.");
        e("bp.uebergeben", "Hand over (server)", "Offer a section to a team mate; it stays yours until they accept.");
        e("bp.annehmen", "Accept hand-over", "Take an offered section (empty = the offer to you).");
        e("bp.ablehnen", "Decline hand-over", "Decline a hand-over offer (empty = the offer to you).");
        e("bp.abwesend", "Report away", "Mark yourself away for the team, optionally with a date (YYYY-MM-DD, inclusive) and note, e.g. “2026-11-10 holiday”.");
        e("bp.zurueck", "Back again", "End your absence.");
        e("bp.rolle", "Set role", "Change a player's role.");
        e("bp.team.wahl", "Choose team", "With several teams: which one counts for you.");
        e("bp.team.export", "Write export", "Write the team log for the planner.");
        e("bp.team.laden", "Reload team files", "After uploading a server file.");
        e("bp.team.raum", "Team room (status)", "Live link of the server to the team room. Connect without a command: in the planner on the page “Game” → “Server” → “Connect team room”.");
        e("bp.team.trennen", "Disconnect team room", "Disconnect the server from the team room (team lead).");
        e("bp.team.hilfe", "Help (server)", "All team commands of the server.");
        // Storage (plugin)
        e("bp.lager.liste", "Storage chests", "All storage chests with checked state.");
        e("bp.lager.info", "This chest", "Chest you look at: content, purpose, protection.");
        e("bp.lager.bedarf", "Needs", "What is missing and what is in storage (empty = whole project).");
        e("bp.lager.wer", "Who has …", "Who put this item into the chest you look at or took it out.");
        e("bp.lager.zeigen", "Show chests", "Particles at all storage chests.");
        e("bp.lager.verlauf", "History", "Last inputs and outputs of the chest you look at.");
        e("bp.lager.pruefen", "Check", "Recount the chest you look at, all chests without one.");
        e("bp.lager.pruefen.alle", "Check all", "Recount all storage chests.");
        e("bp.lager.markieren", "Mark chest", "Chest you look at becomes a team storage chest (master builder).");
        e("bp.lager.entmarkieren", "Remove mark", "Chest you look at is no storage chest any more.");
        e("bp.lager.siegeln", "Seal", "Confirm the current content as checked (master builder).");
        e("bp.lager.name", "Rename", "New name of the chest you look at.");
        e("bp.lager.abschnitt", "Assign section", "Chest belongs to this section.");
        e("bp.lager.zweck", "Purpose", "Stock, input, output, rest or yield (collecting chest of a farm).");
        e("bp.lager.farm", "Link farm", "Chest you look at becomes the yield chest of a farm from the planner (master builder).");
        e("bp.lager.schutz", "Protection", "Who may take things out.");
        e("bp.lager.hilfe", "Storage help", "All storage commands of the server.");
        // Record (plugin)
        e("bp.beitrag", "My contribution", "Placed and broken blocks, into storage, taken out.");
        e("bp.beitrag.alle", "Everyone's contribution", "For everyone in the team (master builder).");
        e("bp.nachweis", "Record on/off", "Switch your own counting on or off.");
        // Connection (client)
        e("verbinden.zulassen", "Allow planner", "The planner chose “Connect”: link it with this game (no code).");
        e("verbinden.ablehnen", "Deny planner", "Deny the waiting connection request of the planner.");
        e("verbinden", "Link website (code)", "Way out without click approval: shows a code for the website (5 minutes).");
        e("verbinden.status", "Connection status", "Linked browsers and port.");
        e("verbinden.aus", "Disconnect all browsers", "Remove all links.");
        e("ebenen", "World plan layers", "Layers from the live map.");
        e("markieren", "Mark here", "Point at your position for the world map (storage, portal, farm, danger …); the website takes it over.");
        e("markierungen", "Waiting marks", "Points set in the game that the world map has not taken yet.");
        e("markierungen.loeschen", "Delete mark", "Delete a waiting mark (number from the list).");
        e("ebenen.alle", "Show all layers", "All world plan layers visible.");
        e("gruppe", "World plan groups", "Groups from the world builder; locked areas are grey in the hologram.");
        e("gruppe.waehlen", "Only this group", "Hologram, progress and material only inside this group.");
        e("gruppe.alle", "All groups", "Show everything again, hidden groups visible.");
        e("gruppe.aus", "Hide group", "Hide marks and hologram of this group.");
        e("gruppe.an", "Show group", "Show a hidden group again.");
        e("gelaende", "Terrain memory", "How much terrain the mod remembers; the website uses it for sites without region files.");
        e("gelaende.an", "Remember terrain on", "The mod remembers the terrain you see (only on this PC).");
        e("gelaende.aus", "Remember terrain off", "Remember nothing new; what is remembered stays.");
        e("gelaende.vergessen", "Forget terrain", "Delete the remembered terrain of this world.");
        // Scan
        e("plaene", "Plans", "Plans in the folder bauplaner/plans.");
        e("plan", "Load plan", "Load a plan for the scan.");
        e("anker", "Anchor here", "Project origin on the block you look at.");
        e("scan", "Start scan", "Read the plan box and save it for the website.");
        e("status", "Scan status", "Plan, anchor, running scan.");
        e("abbrechen", "Cancel scan", "Stop the running scan.");
        e("bp.status", "Server: status", "Plan, anchor and scan on the server.");
        e("bp.plaene", "Server: plans", "Plans in plugins/BauplanerBridge/plans.");
        e("bp.plan", "Server: load plan", "Load a plan on the server.");
        e("bp.anker", "Server: anchor here", "Anchor on the block you look at.");
        e("bp.scan", "Server: scan", "Scan from the server world (“geladen”: only loaded chunks).");
        e("bp.abbrechen", "Server: cancel", "Stop the running server scan.");
        e("bp.weltplan", "World plan (server)", "World plan from the team room: revision, markers on BlueMap/Dynmap, locks.");
        e("bp.weltplan.sperren", "World plan locks", "Protect locked world plan entries (team lead only): aus = off, hinweis = notice, sperren = lock.");
        // Settings (0.23.0)
        e("hilfe", "Help", "How it works in 5 steps.");
        e("menue", "Plan menu", "Opens the plan menu (key J).");
        e("sprache", "Language", "German, English or like the game.");
        e("meldungen", "Messages", "Pop-up at the top right, chat or both.");
        e("anzeige", "Build panel", "Compact, detailed or off.");
    }
}
