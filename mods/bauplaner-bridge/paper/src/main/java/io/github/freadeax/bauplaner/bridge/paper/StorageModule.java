package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Chunk;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.Particle;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.HumanEntity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockExplodeEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.EntityExplodeEvent;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryCloseEvent;
import org.bukkit.event.inventory.InventoryDragEvent;
import org.bukkit.event.inventory.InventoryMoveItemEvent;
import org.bukkit.event.inventory.InventoryOpenEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.world.ChunkLoadEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

/**
 * Checked storage chests of a team on the server (COOP-05, docs/architecture/team/LAGERKISTEN.md). A container
 * marked as store is counted (with shulker and bundle content), compared with the expected content
 * (last count plus booked moves), protected by its level and the team roles, and every deposit and
 * withdrawal is booked per player. Writes only team events (origin {@code server}); never changes a
 * block, a block entity or an inventory – protection only cancels clicks, hopper moves, explosions and
 * block changes.
 */
final class StorageModule implements Listener {
    /** What the storage module needs from the team module. */
    interface TeamAccess {
        Collection<TeamLog> teams();
        TeamLog.View view(TeamLog team);
        /** Member id of the player in the team, empty when not a member. */
        Optional<String> member(TeamLog team, String playerName, UUID uuid);
        /** Member id; joins the player as Helfer when the server allows it. */
        Optional<String> join(TeamLog team, CommandSender s, String playerName, UUID uuid);
        /** Writes an event without asking the fold first (server facts such as counts). */
        boolean append(TeamLog team, JsonObject e, CommandSender s);
        /** Writes an event unless the fold rejects it, with an answer for the sender. */
        boolean submit(TeamLog team, JsonObject e, CommandSender s, String okText);
        /** Team the sender works in (chosen, by position, or the first). */
        TeamLog teamFor(CommandSender s, String playerName, UUID uuid);
    }

    static final List<String> SUBCOMMANDS = List.of("markieren", "entmarkieren", "info", "liste", "pruefen", "siegeln", "name", "abschnitt", "zweck", "schutz",
            "verlauf", "wer", "bedarf", "zeigen", "hilfe", "farm", "setzen", "entfernen", "zaehlen");
    private static final String PREFIX = ChatColor.GOLD + "[Bauplaner] " + ChatColor.RESET;

    private final JavaPlugin plugin;
    private final TeamAccess teams;

    /** An open store window of one player: what was there at the last click and what the player moved. */
    private static final class Session {
        final String teamId, storeId;
        final Inventory inventory;
        TreeMap<String, Long> last;
        final TreeMap<String, Long> net = new TreeMap<>();
        Session(String teamId, String storeId, Inventory inventory, TreeMap<String, Long> last) { this.teamId = teamId; this.storeId = storeId; this.inventory = inventory; this.last = last; }
    }

    private final Map<UUID, Session> sessions = new HashMap<>();
    /** Stores with pending hopper moves (flushed once a second). */
    private final Map<String, TeamLog> hopperDirty = new LinkedHashMap<>();
    /** Runtime time of the last check per store (checks without change are not written to the log). */
    private final Map<String, Long> lastChecked = new HashMap<>();
    private final Map<UUID, Long> lastHint = new HashMap<>();
    private BukkitTask hopperTask, yieldTask;
    /** Last hopper booking per store: hopper moves are bundled to one store.move per store and minute (lager.trichter-buendeln-sekunden). */
    private final Map<String, Long> hopperBooked = new HashMap<>();
    /** COOP-08: what went into yield stores (purpose ertrag) since the last store.yield, and loaded minutes. */
    private static final class Yield {
        final String teamId, from = java.time.Instant.now().toString();
        final TreeMap<String, Long> items = new TreeMap<>();
        long minutes;
        Yield(String teamId) { this.teamId = teamId; }
    }
    private final Map<String, Yield> yields = new LinkedHashMap<>();
    private long yieldTicks;

    StorageModule(JavaPlugin plugin, TeamAccess teams) {
        this.plugin = plugin;
        this.teams = teams;
    }

    void enable() {
        Bukkit.getPluginManager().registerEvents(this, plugin);
        hopperTask = Bukkit.getScheduler().runTaskTimer(plugin, () -> flushHoppers(false), 20L, 20L);
        yieldTask = Bukkit.getScheduler().runTaskTimer(plugin, this::yieldMinute, 1200L, 1200L);
        // Stores and per section need for players with the mod (team channel, COOP-03).
        TeamChannel.decorate = (team, state) -> {
            TeamLog.View v = teams.view(team);
            JsonArray list = new JsonArray();
            for (StoreIndex.Store st : v.stores.stores.values()) if (!st.removed) list.add(storeJson(st));
            state.add("stores", list);
            if (state.has("sections") && state.get("sections").isJsonArray())
                for (var el : state.getAsJsonArray("sections")) {
                    JsonObject sec = el.getAsJsonObject();
                    if (!sec.has("id")) continue;
                    String id = sec.get("id").getAsString();
                    TreeMap<String, Long> need = need(team, id);
                    if (need.isEmpty()) continue;
                    TreeMap<String, Long> have = stock(v, id);
                    JsonArray lines = new JsonArray();
                    need.entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(StoreLedger.MAX_LINES).forEach(n -> {
                        JsonObject l = new JsonObject(); l.addProperty("item", n.getKey()); l.addProperty("count", n.getValue()); l.addProperty("stored", Math.min(n.getValue(), have.getOrDefault(n.getKey(), 0L))); lines.add(l);
                    });
                    sec.add("need", lines);
                }
        };
        // Stores in chunks that are loaded at start (spawn chunks) are checked once the worlds are ready.
        Bukkit.getScheduler().runTaskLater(plugin, () -> checkLoaded(null), 100L);
    }

    /** A store as the mod reads it (state.stores, broadcast "store"). */
    static JsonObject storeJson(StoreIndex.Store st) {
        JsonObject j = new JsonObject();
        j.addProperty("id", st.id); j.addProperty("name", st.name); j.addProperty("dimension", st.dimension);
        j.add("pos", xyz(st.pos));
        if (st.pos2 != null) j.add("pos2", xyz(st.pos2));
        if (st.section != null) j.addProperty("section", st.section);
        j.addProperty("purpose", st.purpose);
        if (st.farm != null) j.addProperty("farm", st.farm);
        j.addProperty("status", st.deviating() && !"fehlt".equals(st.status) ? "abweichend" : st.status);
        if (st.checkedAt != null) j.addProperty("checkedAt", st.checkedAt);
        TreeMap<String, Long> items = st.items == null ? new TreeMap<>() : st.items;
        j.add("items", StoreLedger.json(items));
        if (StoreLedger.truncated(items) || st.partial) j.addProperty("more", true);
        return j;
    }

    /** Sends the current state of one store to players with the mod (no-op without the team channel). */
    private void broadcast(TeamLog team, String storeId) {
        if (!(plugin instanceof BridgePlugin bp) || bp.teamChannel() == null) return;
        StoreIndex.Store st = teams.view(team).stores.get(storeId);
        if (st != null) bp.teamChannel().broadcastStore(team, storeJson(st));
    }

    void disable() {
        TeamChannel.decorate = (t, s) -> { };
        for (UUID id : new ArrayList<>(sessions.keySet())) closeSession(id);
        flushHoppers(true);
        writeYields();
        if (hopperTask != null) hopperTask.cancel();
        if (yieldTask != null) yieldTask.cancel();
    }

    private static void say(CommandSender s, String text) { s.sendMessage(PREFIX + text); }
    private static boolean fail(CommandSender s, String text) { s.sendMessage(PREFIX + ChatColor.RED + text); return true; }

    // ------------------------------------------------------------------ config

    private String cfg(String key, String fallback, List<String> allowed) {
        String v = plugin.getConfig().getString("lager." + key, fallback);
        return v != null && allowed.contains(v.toLowerCase(Locale.ROOT)) ? v.toLowerCase(Locale.ROOT) : fallback;
    }
    private boolean blocking() { return cfg("modus", "sperren", List.of("sperren", "hinweis")).equals("sperren"); }
    private String defaultProtection() { return cfg("schutz-standard", "team", StoreLedger.PROTECTIONS); }
    private String hopperMode() { return cfg("trichter", "einlegen", StoreLedger.HOPPER_MODES); }

    // ------------------------------------------------------------------ lookup

    private record Found(TeamLog team, StoreIndex.Store store) {}

    private Found find(String dim, int x, int y, int z) {
        for (TeamLog team : teams.teams()) {
            StoreIndex.Store s = teams.view(team).stores.at(dim, x, y, z);
            if (s != null) return new Found(team, s);
        }
        return null;
    }

    private Found find(Inventory inv) {
        for (StoreWorld.Pos p : StoreWorld.positions(inv)) {
            Found f = find(p.dimension(), p.x(), p.y(), p.z());
            if (f != null) return f;
        }
        return null;
    }

    private Found find(Block b) { return find(PaperCompat.dimension(b.getWorld()), b.getX(), b.getY(), b.getZ()); }

    private static Block block(StoreIndex.Store s) {
        World w = PaperCompat.findWorld(s.dimension);
        if (w == null || !w.isChunkLoaded(s.pos[0] >> 4, s.pos[2] >> 4)) return null;
        return w.getBlockAt(s.pos[0], s.pos[1], s.pos[2]);
    }

    private record Rights(int rank, boolean owner, boolean admin, Optional<String> member) {}

    private Rights rights(TeamLog team, StoreIndex.Store s, Player p) {
        TeamLog.View v = teams.view(team);
        Optional<String> m = teams.member(team, p.getName(), p.getUniqueId());
        int rank = m.map(id -> StoreLedger.rank(v.role(id))).orElse(-1);
        boolean owner = m.isPresent() && s.section != null && m.get().equals(v.section(s.section).owner);
        return new Rights(rank, owner, p.hasPermission("bauplaner.lager.verwalten"), m);
    }

    private boolean may(TeamLog team, StoreIndex.Store s, Player p, StoreLedger.Action a) {
        Rights r = rights(team, s, p);
        return StoreLedger.allowed(s.protectionOr(defaultProtection()), a, r.rank, r.owner, r.admin);
    }

    private String sectionLabel(TeamLog team, String sectionId) {
        if (sectionId == null) return "ganzes Projekt";
        return team.sections.stream().filter(x -> x.id().equals(sectionId)).map(x -> "Abschnitt " + x.number() + " " + x.name()).findFirst().orElse("entfernter Abschnitt");
    }

    private static String statusLabel(StoreIndex.Store s) {
        return switch (s.status) {
            case "geprueft" -> ChatColor.GREEN + "geprüft" + ChatColor.RESET;
            case "abweichend" -> ChatColor.RED + "abweichend" + ChatColor.RESET;
            case "fehlt" -> ChatColor.DARK_RED + "Kiste fehlt" + ChatColor.RESET;
            default -> ChatColor.GRAY + "ungeprüft" + ChatColor.RESET;
        };
    }

    // ------------------------------------------------------------------ counting and checking

    /** Counts the store if its chunk is loaded and writes what changed: count, check result, double chest half. */
    private void check(TeamLog team, StoreIndex.Store s, boolean report, CommandSender to) { check(team, s, report, to, team.founder); }

    /** As above; {@code by} is the member a count is booked to (stored/taken of COOP-04 come from count differences). */
    private void check(TeamLog team, StoreIndex.Store s, boolean report, CommandSender to, String by) {
        // Hopper moves not yet booked (bundled) must be booked first, or they would look like a deviation.
        if (s != null && hopperDirty.containsKey(s.id)) { flushHopper(s.id, hopperDirty.remove(s.id), false); s = teams.view(team).stores.get(s.id); }
        if (s == null) return;
        Block b = block(s);
        if (b == null) { if (to != null) say(to, "„" + s.name + "“: Chunk nicht geladen, nicht geprüft."); return; }
        lastChecked.put(s.id, System.currentTimeMillis());
        if (!StoreWorld.isStoreBlock(b)) {
            if (!"fehlt".equals(s.status)) {
                JsonObject e = team.event(team.founder, "store.check");
                e.addProperty("chest", s.id); e.addProperty("status", "fehlt");
                teams.append(team, e, to != null ? to : Bukkit.getConsoleSender());
                broadcast(team, s.id);
                alert(team, "Lager „" + s.name + "“ bei " + s.pos[0] + " " + s.pos[1] + " " + s.pos[2] + " ist keine Kiste mehr.");
            }
            if (to != null) say(to, "„" + s.name + "“: an der Stelle steht keine Kiste mehr.");
            return;
        }
        // Second half of a double chest (built on later or removed).
        List<Block> parts = StoreWorld.blocks(b);
        int[] second = null;
        for (Block p : parts) if (p.getX() != s.pos[0] || p.getY() != s.pos[1] || p.getZ() != s.pos[2]) second = new int[] { p.getX(), p.getY(), p.getZ() };
        if (!java.util.Arrays.equals(second, s.pos2)) {
            JsonObject e = team.event(team.founder, "store.config");
            e.addProperty("chest", s.id);
            if (second != null) e.add("pos2", xyz(second)); else e.add("pos2", com.google.gson.JsonNull.INSTANCE);
            teams.append(team, e, Bukkit.getConsoleSender());
        }
        Inventory inv = StoreWorld.inventory(b);
        TreeMap<String, Long> actual = StoreWorld.contents(inv, null);
        int before = team.size();
        writeCheck(team, s, actual, report, to, by);
        if (team.size() != before) broadcast(team, s.id);
    }

    private void writeCheck(TeamLog team, StoreIndex.Store s, TreeMap<String, Long> actual, boolean report, CommandSender to, String by) {
        CommandSender log = to != null ? to : Bukkit.getConsoleSender();
        String before = s.status;
        if (s.expected == null) {
            writeCount(team, s, actual, log, by);
            JsonObject e = team.event(team.founder, "store.check");
            e.addProperty("chest", s.id); e.addProperty("status", "geprueft"); e.addProperty("sha256", StoreLedger.sha256(actual));
            teams.append(team, e, log);
            if (to != null) say(to, "„" + s.name + "“ erstmals gezählt: " + StoreLedger.total(actual) + " Items in " + actual.size() + " Sorten.");
            return;
        }
        TreeMap<String, Long> diff = StoreLedger.diff(s.expected, actual);
        if (!diff.isEmpty()) {
            JsonObject e = team.event(team.founder, "store.check");
            e.addProperty("chest", s.id); e.addProperty("status", "abweichend"); e.addProperty("sha256", StoreLedger.sha256(actual));
            e.add("diff", StoreLedger.jsonDiff(diff));
            teams.append(team, e, log);
            writeCount(team, s, actual, log, by);
            alert(team, "Lager „" + s.name + "“ weicht ab: " + StoreLedger.diffText(diff, 6) + " ohne Buchung. Prüfen und mit /bauplaner lager siegeln bestätigen.");
            if (to != null) say(to, "„" + s.name + "“: " + ChatColor.RED + "abweichend" + ChatColor.RESET + " – " + StoreLedger.diffText(diff, 8) + ".");
            return;
        }
        boolean changed = s.items == null || !StoreLedger.sha256(s.items).equals(StoreLedger.sha256(actual));
        if (changed) writeCount(team, s, actual, log, by);
        if (report || !"geprueft".equals(before) && !"abweichend".equals(before)) {
            JsonObject e = team.event(team.founder, "store.check");
            e.addProperty("chest", s.id); e.addProperty("status", "geprueft"); e.addProperty("sha256", StoreLedger.sha256(actual));
            teams.append(team, e, log);
        }
        if (to != null) say(to, "„" + s.name + "“: " + statusLabel(teams.view(team).stores.get(s.id)) + (changed ? "" : " · unverändert") + " · " + StoreLedger.total(actual) + " Items in " + actual.size() + " Sorten"
                + (!s.deviation.isEmpty() ? " · offene Abweichung " + StoreLedger.diffText(s.deviation, 4) : "") + ".");
    }

    private void writeCount(TeamLog team, StoreIndex.Store s, TreeMap<String, Long> actual, CommandSender log, String by) {
        JsonObject e = team.event(by, "store.count");
        e.addProperty("chest", s.id);
        e.add("items", StoreLedger.json(actual));
        if (StoreLedger.truncated(actual)) e.addProperty("more", true);
        teams.append(team, e, log);
    }

    /** Message to every online Baumeister/Bauleitung of the team (and holders of bauplaner.lager.verwalten). */
    private void alert(TeamLog team, String text) {
        plugin.getLogger().info(ChatColor.stripColor(text));
        if (!plugin.getConfig().getBoolean("lager.meldung-an-baumeister", true)) return;
        TeamLog.View v = teams.view(team);
        for (Player p : Bukkit.getOnlinePlayers()) {
            Optional<String> m = teams.member(team, p.getName(), p.getUniqueId());
            if (p.hasPermission("bauplaner.lager.verwalten") || m.isPresent() && StoreLedger.rank(v.role(m.get())) >= 2) say(p, ChatColor.YELLOW + text);
        }
    }

    private void checkLoaded(CommandSender to) {
        for (TeamLog team : new ArrayList<>(teams.teams()))
            for (StoreIndex.Store s : new ArrayList<>(teams.view(team).stores.stores.values()))
                if (!s.removed && block(s) != null) check(team, teams.view(team).stores.get(s.id), to != null, to);
    }

    /** All stores of one team in loaded chunks, counts booked to {@code by}. */
    private void checkTeam(TeamLog team, CommandSender to, String by) {
        int checked = 0;
        for (StoreIndex.Store s : new ArrayList<>(teams.view(team).stores.stores.values())) {
            if (s.removed) continue;
            checked++;
            check(team, teams.view(team).stores.get(s.id), true, to, by);
        }
        if (checked == 0) say(to, "Das Team hat noch kein Lager. Baumeister: auf eine Kiste schauen und /bauplaner lager markieren <name>.");
    }

    private static JsonArray xyz(int[] p) { JsonArray a = new JsonArray(); for (int v : p) a.add(v); return a; }

    // ------------------------------------------------------------------ moves

    /** Books what changed in an open window since the last click to the player (or a hopper). */
    private void book(UUID player) {
        Session ses = sessions.get(player);
        if (ses == null) return;
        TreeMap<String, Long> now = StoreWorld.contents(ses.inventory, null);
        TreeMap<String, Long> delta = StoreLedger.diff(ses.last, now);
        delta.forEach((k, v) -> StoreLedger.add(ses.net, k, v));
        ses.last = now;
    }

    private void closeSession(UUID player) {
        book(player);
        Session ses = sessions.remove(player);
        if (ses == null) return;
        TeamLog team = teams.teams().stream().filter(t -> t.teamId.equals(ses.teamId)).findFirst().orElse(null);
        if (team == null) return;
        StoreIndex.Store s = teams.view(team).stores.get(ses.storeId);
        if (s == null) return;
        Player p = Bukkit.getPlayer(player);
        String name = p != null ? p.getName() : player.toString();
        if (!ses.net.isEmpty()) {
            Optional<String> m = teams.member(team, name, player);
            if (m.isEmpty() && p != null) m = teams.join(team, p, name, player);
            JsonObject e = team.event(m.orElse(team.founder), "store.move");
            e.addProperty("chest", s.id);
            TreeMap<String, Long> in = StoreLedger.positive(ses.net), out = StoreLedger.negativeAsPositive(ses.net);
            if (!in.isEmpty()) e.add("in", StoreLedger.json(in));
            if (!out.isEmpty()) e.add("out", StoreLedger.json(out));
            e.addProperty("via", "spieler");
            if (m.isEmpty()) e.addProperty("player", name);
            teams.append(team, e, Bukkit.getConsoleSender());
            addYield(team, s, in);
            if (p != null) say(p, "Gebucht im Lager „" + s.name + "“: " + StoreLedger.diffText(ses.net, 6) + ".");
        }
        // Nobody else looks into the store: count and compare once.
        boolean others = sessions.values().stream().anyMatch(x -> x.storeId.equals(ses.storeId));
        if (!others) check(team, teams.view(team).stores.get(s.id), false, null);
    }

    private long bundleMillis() { return Math.max(0, plugin.getConfig().getLong("lager.trichter-buendeln-sekunden", 60)) * 1000L; }

    /** Books pending hopper moves; without {@code force} at most once per store and bundle time. */
    private void flushHoppers(boolean force) {
        if (hopperDirty.isEmpty()) return;
        long now = System.currentTimeMillis(), bundle = bundleMillis();
        for (Map.Entry<String, TeamLog> d : new ArrayList<>(hopperDirty.entrySet())) {
            if (!force && now - hopperBooked.getOrDefault(d.getKey(), 0L) < bundle) continue;
            hopperDirty.remove(d.getKey());
            flushHopper(d.getKey(), d.getValue(), true);
        }
    }

    private void flushHopper(String id, TeamLog team, boolean thenCheck) {
        {
            StoreIndex.Store s = teams.view(team).stores.get(id);
            if (s == null || s.removed) return;
            Block b = block(s);
            if (b == null || !StoreWorld.isStoreBlock(b)) return;
            TreeMap<String, Long> now = StoreWorld.contents(StoreWorld.inventory(b), null);
            // While players have the store open, their windows hold the baseline.
            for (Session ses : sessions.values()) if (ses.storeId.equals(id)) { book(sessionOwner(ses)); }
            TreeMap<String, Long> base = s.expected;
            if (base == null) { check(team, s, false, null); return; }
            TreeMap<String, Long> openNet = new TreeMap<>();
            for (Session ses : sessions.values()) if (ses.storeId.equals(id)) ses.net.forEach((k, v) -> StoreLedger.add(openNet, k, v));
            TreeMap<String, Long> delta = StoreLedger.diff(StoreLedger.plus(base, openNet, 1), now);
            for (Session ses : sessions.values()) if (ses.storeId.equals(id)) ses.last = now;
            if (!delta.isEmpty()) {
                JsonObject e = team.event(team.founder, "store.move");
                e.addProperty("chest", id);
                TreeMap<String, Long> in = StoreLedger.positive(delta), out = StoreLedger.negativeAsPositive(delta);
                if (!in.isEmpty()) e.add("in", StoreLedger.json(in));
                if (!out.isEmpty()) e.add("out", StoreLedger.json(out));
                e.addProperty("via", "trichter");
                teams.append(team, e, Bukkit.getConsoleSender());
                hopperBooked.put(id, System.currentTimeMillis());
                addYield(team, s, in);
            }
            if (thenCheck && sessions.values().stream().noneMatch(x -> x.storeId.equals(id))) check(team, teams.view(team).stores.get(id), false, null);
        }
    }

    // ------------------------------------------------------------------ yield stores (COOP-08)

    private void addYield(TeamLog team, StoreIndex.Store s, Map<String, Long> in) {
        if (s == null || !"ertrag".equals(s.purpose) || in.isEmpty()) return;
        Yield y = yields.computeIfAbsent(s.id, k -> new Yield(team.teamId));
        in.forEach((k, v) -> StoreLedger.add(y.items, k, v));
    }

    private int yieldMinutes() { return (int) Math.max(5, plugin.getConfig().getLong("lager.ertrag-minuten", 30)); }

    /** Every minute: a yield store whose chunk is loaded ran for a minute; every lager.ertrag-minuten a store.yield. */
    private void yieldMinute() {
        for (TeamLog team : teams.teams())
            for (StoreIndex.Store s : teams.view(team).stores.stores.values()) {
                if (s.removed || !"ertrag".equals(s.purpose) || s.pos == null) continue;
                World w = PaperCompat.findWorld(s.dimension);
                if (w == null || !w.isChunkLoaded(s.pos[0] >> 4, s.pos[2] >> 4)) continue;
                yields.computeIfAbsent(s.id, k -> new Yield(team.teamId)).minutes++;
            }
        if (++yieldTicks >= yieldMinutes()) { yieldTicks = 0; writeYields(); }
    }

    /** Writes one store.yield per yield store with something measured. */
    private void writeYields() {
        flushHoppers(true);
        String until = java.time.Instant.now().toString();
        for (Map.Entry<String, Yield> en : new ArrayList<>(yields.entrySet())) {
            Yield y = en.getValue();
            TeamLog team = teams.teams().stream().filter(t -> t.teamId.equals(y.teamId)).findFirst().orElse(null);
            StoreIndex.Store s = team == null ? null : teams.view(team).stores.get(en.getKey());
            if (s == null || s.removed || y.items.isEmpty() && y.minutes == 0) continue;
            JsonObject e = team.event(team.founder, "store.yield");
            e.addProperty("chest", s.id);
            if (s.farm != null) e.addProperty("farm", s.farm);
            e.add("items", StoreLedger.json(y.items));
            e.addProperty("from", y.from); e.addProperty("until", until.compareTo(y.from) > 0 ? until : y.from);
            e.addProperty("minutes", y.minutes);
            teams.append(team, e, Bukkit.getConsoleSender());
        }
        yields.clear();
    }

    /** Farms of the team file ({@code farms: [{id, name}]}): {id, name}. */
    static List<String[]> farms(TeamLog team) {
        List<String[]> out = new ArrayList<>();
        if (team.header.has("farms") && team.header.get("farms").isJsonArray())
            for (var el : team.header.getAsJsonArray("farms")) {
                if (!el.isJsonObject()) continue;
                JsonObject f = el.getAsJsonObject();
                String id = TeamLog.str(f, "id"), name = TeamLog.str(f, "name");
                if (id != null) out.add(new String[] { id, name == null ? id : name });
            }
        return out;
    }

    private static String farmName(TeamLog team, String id) {
        return farms(team).stream().filter(f -> f[0].equals(id)).map(f -> f[1]).findFirst().orElse(id);
    }

    private UUID sessionOwner(Session ses) {
        for (Map.Entry<UUID, Session> e : sessions.entrySet()) if (e.getValue() == ses) return e.getKey();
        return null;
    }

    // ------------------------------------------------------------------ events: windows

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onOpen(InventoryOpenEvent e) {
        if (!(e.getPlayer() instanceof Player p)) return;
        Found f = find(e.getInventory());
        if (f == null) return;
        // Compare before the player changes anything, so a deviation is never booked to the player.
        check(f.team, f.store, false, null);
        StoreIndex.Store s = teams.view(f.team).stores.get(f.store.id);
        sessions.put(p.getUniqueId(), new Session(f.team.teamId, s.id, e.getInventory(), StoreWorld.contents(e.getInventory(), null)));
        boolean put = may(f.team, s, p, StoreLedger.Action.DEPOSIT), take = may(f.team, s, p, StoreLedger.Action.WITHDRAW);
        String rights = put && take ? "du darfst einlegen und entnehmen" : put ? "du darfst nur einlegen" : take ? "du darfst nur entnehmen" : "nur ansehen";
        PaperCompat.actionBar(p, "Lager „" + s.name + "“ · " + sectionLabel(f.team, s.section) + " · " + ChatColor.stripColor(statusLabel(s)) + " · " + rights);
        if (s.deviating() && rights(f.team, s, p).rank >= 2) say(p, ChatColor.YELLOW + "Offene Abweichung: " + StoreLedger.diffText(s.deviation, 6) + ". /bauplaner lager siegeln bestätigt den jetzigen Inhalt.");
        needLine(f.team, s).ifPresent(line -> say(p, line));
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onClick(InventoryClickEvent e) {
        if (!(e.getWhoClicked() instanceof Player p)) return;
        Session ses = sessions.get(p.getUniqueId());
        if (ses == null || ses.inventory != e.getInventory()) return;
        TeamLog team = teams.teams().stream().filter(t -> t.teamId.equals(ses.teamId)).findFirst().orElse(null);
        if (team == null) return;
        StoreIndex.Store s = teams.view(team).stores.get(ses.storeId);
        if (s == null) return;
        boolean inTop = e.getRawSlot() >= 0 && e.getRawSlot() < e.getInventory().getSize();
        ItemStack slot = e.getCurrentItem();
        boolean empty = slot == null || slot.getType().isAir();
        boolean takes = StoreWorld.mayTake(e.getAction(), inTop, empty), puts = StoreWorld.mayPut(e.getAction(), inTop);
        String refused = null;
        if (takes && !may(team, s, p, StoreLedger.Action.WITHDRAW)) refused = "entnehmen";
        else if (puts && !may(team, s, p, StoreLedger.Action.DEPOSIT)) refused = "einlegen";
        if (refused != null) {
            if (blocking() || p.getGameMode() == GameMode.SPECTATOR) { e.setCancelled(true); hint(p, "Im Lager „" + s.name + "“ darfst du nicht " + refused + " (" + StoreLedger.describe(s.protectionOr(defaultProtection())) + ")."); return; }
            hint(p, "Lager „" + s.name + "“: " + refused + " ist hier eigentlich der Bauleitung vorbehalten – es wird gebucht.");
        }
        Bukkit.getScheduler().runTask(plugin, () -> book(p.getUniqueId()));
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onDrag(InventoryDragEvent e) {
        if (!(e.getWhoClicked() instanceof Player p)) return;
        Session ses = sessions.get(p.getUniqueId());
        if (ses == null || ses.inventory != e.getInventory()) return;
        boolean intoTop = e.getRawSlots().stream().anyMatch(r -> r < e.getInventory().getSize());
        if (!intoTop) return;
        TeamLog team = teams.teams().stream().filter(t -> t.teamId.equals(ses.teamId)).findFirst().orElse(null);
        StoreIndex.Store s = team == null ? null : teams.view(team).stores.get(ses.storeId);
        if (s == null) return;
        if (!may(team, s, p, StoreLedger.Action.DEPOSIT)) {
            if (blocking()) { e.setCancelled(true); hint(p, "Im Lager „" + s.name + "“ darfst du nicht einlegen."); return; }
            hint(p, "Lager „" + s.name + "“: einlegen ist hier eigentlich der Bauleitung vorbehalten – es wird gebucht.");
        }
        Bukkit.getScheduler().runTask(plugin, () -> book(p.getUniqueId()));
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onClose(InventoryCloseEvent e) {
        Session ses = sessions.get(e.getPlayer().getUniqueId());
        if (ses != null && ses.inventory == e.getInventory()) closeSession(e.getPlayer().getUniqueId());
    }

    private void hint(Player p, String text) {
        long now = System.currentTimeMillis();
        if (now - lastHint.getOrDefault(p.getUniqueId(), 0L) < 2_000) return;
        lastHint.put(p.getUniqueId(), now);
        say(p, ChatColor.YELLOW + text);
    }

    // ------------------------------------------------------------------ events: hoppers, blocks, explosions, chunks

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onHopper(InventoryMoveItemEvent e) {
        Found to = find(e.getDestination()), from = find(e.getSource());
        if (to == null && from == null) return;
        String mode = hopperMode();
        if (to != null && !StoreLedger.hopperMayInsert(mode) || from != null && !StoreLedger.hopperMayExtract(mode)) { e.setCancelled(true); return; }
        if (to != null) hopperDirty.put(to.store.id, to.team);
        if (from != null) hopperDirty.put(from.store.id, from.team);
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent e) {
        Found f = find(e.getBlock());
        if (f == null) return;
        Player p = e.getPlayer();
        if (!may(f.team, f.store, p, StoreLedger.Action.BREAK)) {
            if (blocking()) { e.setCancelled(true); say(p, ChatColor.RED + "Das Lager „" + f.store.name + "“ darf nur " + (f.store.protectionOr(defaultProtection()).equals("gesperrt") ? "die Bauleitung" : "ein Baumeister") + " abbauen."); return; }
            alert(f.team, p.getName() + " baut das Lager „" + f.store.name + "“ ab.");
        }
        Inventory inv = StoreWorld.inventory(e.getBlock());
        TreeMap<String, Long> before = inv == null ? new TreeMap<>() : StoreWorld.contents(inv, null);
        String dim = PaperCompat.dimension(e.getBlock().getWorld());
        int[] other = f.store.pos2 == null ? null : (e.getBlock().getX() == f.store.pos[0] && e.getBlock().getY() == f.store.pos[1] && e.getBlock().getZ() == f.store.pos[2] ? f.store.pos2 : f.store.pos);
        Bukkit.getScheduler().runTask(plugin, () -> afterBreak(f.team, f.store.id, p, before, dim, other));
    }

    private void afterBreak(TeamLog team, String id, Player p, TreeMap<String, Long> before, String dim, int[] remaining) {
        StoreIndex.Store s = teams.view(team).stores.get(id);
        if (s == null) return;
        TreeMap<String, Long> after = new TreeMap<>();
        World w = PaperCompat.findWorld(dim);
        Block rest = remaining != null && w != null ? w.getBlockAt(remaining[0], remaining[1], remaining[2]) : null;
        if (rest != null && StoreWorld.isStoreBlock(rest)) after = StoreWorld.contents(StoreWorld.inventory(rest), null);
        TreeMap<String, Long> out = StoreLedger.negativeAsPositive(StoreLedger.diff(before, after));
        Optional<String> m = teams.member(team, p.getName(), p.getUniqueId());
        if (!out.isEmpty()) {
            JsonObject e = team.event(m.orElse(team.founder), "store.move");
            e.addProperty("chest", id); e.add("out", StoreLedger.json(out)); e.addProperty("via", "abbau");
            if (m.isEmpty()) e.addProperty("player", p.getName());
            teams.append(team, e, Bukkit.getConsoleSender());
        }
        if (rest != null && StoreWorld.isStoreBlock(rest) && (s.pos[0] != remaining[0] || s.pos[1] != remaining[1] || s.pos[2] != remaining[2])) {
            // The marked half was broken, the other half stays: it becomes the store position.
            JsonObject e = team.event(team.founder, "store.chest");
            e.addProperty("chest", id); e.addProperty("name", s.name); e.add("pos", xyz(remaining)); e.addProperty("dimension", s.dimension);
            teams.append(team, e, Bukkit.getConsoleSender());
        }
        check(team, teams.view(team).stores.get(id), false, null);
        say(p, rest != null && StoreWorld.isStoreBlock(rest) ? "Lager „" + s.name + "“ ist jetzt eine einfache Kiste." : "Lager „" + s.name + "“ abgebaut; die Markierung bleibt als „Kiste fehlt“ stehen, bis sie aufgehoben wird (/bauplaner lager entmarkieren).");
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent e) {
        Block b = e.getBlockPlaced();
        if (!StoreWorld.isStoreBlock(b)) return;
        for (Block part : StoreWorld.blocks(b)) {
            if (part.equals(b)) continue;
            Found f = find(part);
            if (f == null) continue;
            if (!may(f.team, f.store, e.getPlayer(), StoreLedger.Action.BREAK) && blocking()) {
                e.setCancelled(true);
                say(e.getPlayer(), ChatColor.RED + "An das Lager „" + f.store.name + "“ darf nur ein Baumeister anbauen.");
                return;
            }
            Bukkit.getScheduler().runTask(plugin, () -> check(f.team, teams.view(f.team).stores.get(f.store.id), false, null));
        }
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onEntityExplode(EntityExplodeEvent e) { shield(e.blockList()); }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBlockExplode(BlockExplodeEvent e) { shield(e.blockList()); }

    private void shield(List<Block> blocks) {
        if (!plugin.getConfig().getBoolean("lager.explosionsschutz", true) || teams.teams().isEmpty()) return;
        blocks.removeIf(b -> StoreWorld.isStoreBlock(b) && find(b) != null);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onChunk(ChunkLoadEvent e) {
        if (!plugin.getConfig().getBoolean("lager.pruefen-beim-laden", true) || teams.teams().isEmpty()) return;
        Chunk c = e.getChunk();
        String dim = PaperCompat.dimension(c.getWorld());
        List<Found> due = new ArrayList<>();
        for (TeamLog team : teams.teams())
            for (StoreIndex.Store s : teams.view(team).stores.stores.values())
                if (!s.removed && s.dimension.equals(dim) && s.pos[0] >> 4 == c.getX() && s.pos[2] >> 4 == c.getZ()
                        && System.currentTimeMillis() - lastChecked.getOrDefault(s.id, 0L) > 60_000) due.add(new Found(team, s));
        if (!due.isEmpty()) Bukkit.getScheduler().runTask(plugin, () -> due.forEach(f -> check(f.team, teams.view(f.team).stores.get(f.store.id), false, null)));
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent e) {
        Player p = e.getPlayer();
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (!p.isOnline()) return;
            for (TeamLog team : teams.teams()) {
                TeamLog.View v = teams.view(team);
                Optional<String> m = teams.member(team, p.getName(), p.getUniqueId());
                if (!p.hasPermission("bauplaner.lager.verwalten") && (m.isEmpty() || StoreLedger.rank(v.role(m.get())) < 2)) continue;
                List<String> bad = v.stores.stores.values().stream().filter(s -> !s.removed && (s.deviating() || "fehlt".equals(s.status))).map(s -> s.name).collect(Collectors.toList());
                if (!bad.isEmpty()) say(p, ChatColor.YELLOW + team.name + ": " + bad.size() + " Lager mit Abweichung oder fehlender Kiste (" + String.join(", ", bad) + "). /bauplaner lager liste");
            }
        }, 60L);
    }

    // ------------------------------------------------------------------ need

    /** Material need of a section (or the whole project) from the server file: {@code need: [{item, count}]}. */
    static TreeMap<String, Long> need(TeamLog team, String sectionId) {
        JsonArray lines = null;
        if (sectionId == null) {
            if (team.header.has("need") && team.header.get("need").isJsonArray()) lines = team.header.getAsJsonArray("need");
        } else if (team.header.has("sections")) {
            for (var el : team.header.getAsJsonArray("sections")) {
                JsonObject s = el.getAsJsonObject();
                if (s.has("id") && s.get("id").getAsString().equals(sectionId) && s.has("need") && s.get("need").isJsonArray()) lines = s.getAsJsonArray("need");
            }
        }
        return StoreLedger.read(lines, "count");
    }

    /** Counted stock of the stores of a section plus the stores for the whole project (or all stores for the project). */
    static TreeMap<String, Long> stock(TeamLog.View v, String sectionId) {
        TreeMap<String, Long> out = new TreeMap<>();
        for (StoreIndex.Store s : v.stores.stores.values()) {
            if (s.removed || s.items == null || "fehlt".equals(s.status) || "rest".equals(s.purpose)) continue;
            if (sectionId != null && s.section != null && !s.section.equals(sectionId)) continue;
            s.items.forEach((k, n) -> StoreLedger.add(out, k, n));
        }
        return out;
    }

    private Optional<String> needLine(TeamLog team, StoreIndex.Store s) {
        TreeMap<String, Long> need = need(team, s.section);
        if (need.isEmpty()) return Optional.empty();
        TreeMap<String, Long> have = stock(teams.view(team), s.section);
        int full = 0; long missingTop = 0; String top = null;
        for (var e : need.entrySet()) {
            long miss = e.getValue() - have.getOrDefault(e.getKey(), 0L);
            if (miss <= 0) full++; else if (miss > missingTop) { missingTop = miss; top = e.getKey(); }
        }
        return Optional.of(sectionLabel(team, s.section) + ": " + full + " von " + need.size() + " Materialien liegen bereit"
                + (top != null ? " · am meisten fehlt " + StoreLedger.amount(missingTop) + " " + StoreLedger.shortItem(top) : " · alles da"));
    }

    // ------------------------------------------------------------------ commands

    /** {@code /bauplaner lager …}; {@code player}/{@code uuid} are the acting player (also for the console's „team als“). */
    boolean command(CommandSender s, String player, UUID uuid, boolean console, String label, String[] args) {
        // Acting for a player from the console ("team als") uses the player's team role only.
        boolean admin = console || s instanceof Player && s.hasPermission("bauplaner.lager.verwalten");
        if (!s.hasPermission("bauplaner.lager.use")) return fail(s, "Dir fehlt das Recht bauplaner.lager.use.");
        String sub = args.length == 0 ? "liste" : args[0].toLowerCase(Locale.ROOT);
        List<String> rest = new ArrayList<>(List.of(args).subList(Math.min(1, args.length), args.length));
        if (sub.equals("hilfe") || !SUBCOMMANDS.contains(sub)) return help(s, label);
        if (teams.teams().isEmpty()) return fail(s, "Auf diesem Server ist noch kein Team angelegt (/" + label + " team hilfe).");
        TeamLog team = teams.teamFor(s, player, uuid);
        TeamLog.View v = teams.view(team);
        // "bei <x> <y> <z> [welt]" names a container without looking at it (console, server test).
        Block target = null;
        int bei = rest.indexOf("bei");
        if (bei >= 0 && rest.size() >= bei + 4) {
            Integer x = BridgePlugin.coordinate(rest.get(bei + 1), null), y = BridgePlugin.coordinate(rest.get(bei + 2), null), z = BridgePlugin.coordinate(rest.get(bei + 3), null);
            if (x == null || y == null || z == null) return fail(s, "bei <x> <y> <z> [welt] erwartet ganze Zahlen.");
            World w = null;
            int used = 4;
            if (rest.size() > bei + 4 && PaperCompat.findWorld(rest.get(bei + 4)) != null) { w = PaperCompat.findWorld(rest.get(bei + 4)); used = 5; }
            if (w == null) w = s instanceof Player p ? p.getWorld() : Bukkit.getWorlds().get(0);
            target = w.getBlockAt(x, y, z);
            for (int i = 0; i < used; i++) rest.remove(bei);
        } else if (s instanceof Player p) {
            Block hit = p.getTargetBlockExact(6);
            if (hit != null && StoreWorld.isStoreBlock(hit)) target = hit;
        } else if (rest.size() >= 3 && rest.subList(rest.size() - 3, rest.size()).stream().allMatch(x -> x.matches("-?\\d+"))) {
            // COOP-04 console form: lager setzen <name> <x> <y> <z> (world of the team file).
            int n = rest.size();
            World w = PaperCompat.findWorld(Optional.ofNullable(TeamLog.str(team.header, "dimension")).orElse("minecraft:overworld"));
            if (w == null) w = Bukkit.getWorlds().get(0);
            target = w.getBlockAt(Integer.parseInt(rest.get(n - 3)), Integer.parseInt(rest.get(n - 2)), Integer.parseInt(rest.get(n - 1)));
            rest = new ArrayList<>(rest.subList(0, n - 3));
        }
        Found here = target != null ? find(target) : null;
        String text = String.join(" ", rest).trim();
        Optional<String> me = teams.member(team, player, uuid);
        String by = me.orElse(admin ? team.founder : "");
        // Counts are booked to the member who triggers them (COOP-04: stored/taken from count differences).
        switch (sub) {
            case "markieren", "setzen" -> {
                if (target == null) return fail(s, "Schau auf eine Kiste, ein Fass oder eine Shulkerkiste (höchstens 6 Blöcke) – oder /" + label + " lager markieren bei <x> <y> <z> [name].");
                if (!StoreWorld.isStoreBlock(target)) return fail(s, "Dort steht keine Kiste, kein Fass und keine Shulkerkiste.");
                if (here != null) return fail(s, "Das ist schon das Lager „" + here.store.name + "“ (" + here.team.name + ").");
                if (by.isEmpty()) return fail(s, "Du bist nicht im Team.");
                if (!admin && StoreLedger.rank(v.role(by)) < 2) return fail(s, "Lager markieren dürfen Baumeister und die Bauleitung.");
                String id = TeamLog.newId("chest");
                String name = text.isEmpty() ? "Lager " + (v.stores.stores.size() + 1) : clip(text, 60);
                JsonObject e = team.event(by, "store.chest");
                e.addProperty("chest", id); e.addProperty("name", name);
                e.add("pos", xyz(new int[] { target.getX(), target.getY(), target.getZ() })); e.addProperty("dimension", PaperCompat.dimension(target.getWorld()));
                if (!teams.submit(team, e, s, "Lager „" + name + "“ markiert bei " + target.getX() + " " + target.getY() + " " + target.getZ() + ".")) return true;
                // Section from the position, protection from the server default.
                String dim = PaperCompat.dimension(target.getWorld());
                Block t = target;
                String section = team.sections.stream().filter(sec -> sec.boxes().stream().anyMatch(b -> b.contains(dim, t.getX(), t.getY(), t.getZ()))).map(TeamLog.Section::id).findFirst().orElse(null);
                JsonObject c = team.event(by, "store.config");
                c.addProperty("chest", id);
                if (section != null) c.addProperty("section", section);
                c.addProperty("protection", defaultProtection());
                teams.append(team, c, s);
                say(s, "Zugeordnet: " + sectionLabel(team, section) + " · Schutz „" + defaultProtection() + "“ (" + StoreLedger.describe(defaultProtection()) + "). Ändern mit /" + label + " lager abschnitt|zweck|schutz.");
                check(team, teams.view(team).stores.get(id), true, s, by);
                return true;
            }
            case "liste" -> {
                List<StoreIndex.Store> list = v.stores.stores.values().stream().filter(x -> !x.removed).collect(Collectors.toList());
                if (list.isEmpty()) return fail(s, "Noch kein Lager markiert. /" + label + " lager markieren");
                for (StoreIndex.Store x : list)
                    say(s, x.name + " · " + statusLabel(x) + " · " + sectionLabel(team, x.section) + " · " + x.purpose + " · " + x.pos[0] + " " + x.pos[1] + " " + x.pos[2]
                            + (x.items != null ? " · " + StoreLedger.total(x.items) + " Items" : "") + (!x.deviation.isEmpty() ? ChatColor.RED + " · " + StoreLedger.diffText(x.deviation, 3) : ""));
                TreeMap<String, Long> stock = stock(v, null);
                if (!stock.isEmpty()) say(s, "Bestand: " + stock.entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(10)
                        .map(x -> x.getValue() + " " + StoreLedger.shortItem(x.getKey())).collect(Collectors.joining(", ")));
                return true;
            }
            case "bedarf" -> { return needReport(s, team, v, text, label); }
            case "pruefen", "zaehlen" -> {
                if (!text.equals("alle") && target != null && here == null) return fail(s, "Diese Kiste ist kein Lager.");
                TeamLog countTeam = here != null ? here.team : team;
                Optional<String> m = teams.member(countTeam, player, uuid);
                if (m.isEmpty() && uuid != null) m = teams.join(countTeam, s, player, uuid);
                String countBy = m.orElse(countTeam.founder);
                if (here != null) { check(here.team, here.store, true, s, countBy); return true; }
                checkTeam(team, s, countBy);
                return true;
            }
            case "zeigen" -> { return show(s, team, v); }
            default -> { }
        }
        // Everything below works on one store.
        if (here == null) return fail(s, target == null ? "Schau auf ein Lager (höchstens 6 Blöcke) oder nenne es mit bei <x> <y> <z>." : "Diese Kiste ist kein Lager. /" + label + " lager markieren");
        StoreIndex.Store st = here.store;
        team = here.team; v = teams.view(team);
        me = teams.member(team, player, uuid);
        by = me.orElse(admin ? team.founder : "");
        boolean manager = admin || me.isPresent() && StoreLedger.rank(v.role(me.get())) >= 2;
        switch (sub) {
            case "info" -> {
                say(s, ChatColor.BOLD + st.name + ChatColor.RESET + " · " + statusLabel(st) + " · " + sectionLabel(team, st.section) + " · Zweck " + st.purpose + " · Schutz " + st.protectionOr(defaultProtection())
                        + " (" + StoreLedger.describe(st.protectionOr(defaultProtection())) + ")");
                if (st.items != null) say(s, StoreLedger.total(st.items) + " Items: " + StoreLedger.diffText(st.items, 8).replace("+", "") + (st.partial ? " (gekürzt)" : ""));
                if (!st.deviation.isEmpty()) say(s, ChatColor.RED + "Offene Abweichung: " + StoreLedger.diffText(st.deviation, 8));
                if ("ertrag".equals(st.purpose)) {
                    Yield y = yields.get(st.id);
                    long minutes = st.yieldMinutes + (y == null ? 0 : y.minutes), total = StoreLedger.total(st.yieldIn) + (y == null ? 0 : StoreLedger.total(y.items));
                    say(s, "Ertragskiste" + (st.farm != null ? " der Farm „" + farmName(team, st.farm) + "“" : "") + ": " + total + " Items in " + minutes + " min geladen"
                            + (minutes >= 10 ? " · " + Math.round(total * 60.0 / minutes) + " je Stunde" : ""));
                }
                if (st.sealedBy != null) say(s, "Zuletzt gesiegelt von " + v.name(st.sealedBy) + " (" + st.sealedAt + ").");
                needLine(team, st).ifPresent(line -> say(s, line));
                return true;
            }
            case "siegeln" -> {
                if (!manager) return fail(s, "Siegeln dürfen Baumeister und die Bauleitung.");
                check(team, st, false, null);
                st = teams.view(team).stores.get(st.id);
                JsonObject e = team.event(by, "store.seal");
                e.addProperty("chest", st.id); e.addProperty("sha256", st.items == null ? StoreLedger.sha256(new TreeMap<>()) : StoreLedger.sha256(st.items));
                if (!text.isEmpty()) e.addProperty("note", clip(text, 300));
                return teams.submit(team, e, s, "Lager „" + st.name + "“ gesiegelt: der jetzige Inhalt gilt als richtig" + (!st.deviation.isEmpty() ? " (Abweichung " + StoreLedger.diffText(st.deviation, 4) + " angenommen)." : "."));
            }
            case "entmarkieren", "entfernen" -> {
                if (!manager) return fail(s, "Lager aufheben dürfen Baumeister und die Bauleitung.");
                JsonObject e = team.event(by, "store.chest");
                e.addProperty("chest", st.id); e.addProperty("name", st.name); e.add("pos", xyz(st.pos)); e.addProperty("dimension", st.dimension); e.addProperty("remove", true);
                return teams.submit(team, e, s, "Markierung von „" + st.name + "“ aufgehoben; die Kiste ist wieder eine normale Kiste. Der Verlauf bleibt im Teamprotokoll.");
            }
            case "name", "abschnitt", "zweck", "schutz", "farm" -> {
                if (!manager) return fail(s, "Das dürfen Baumeister und die Bauleitung.");
                if (text.isEmpty()) return fail(s, "/" + label + " lager " + sub + " <wert>");
                JsonObject e = team.event(by, "store.config");
                e.addProperty("chest", st.id);
                String ok;
                switch (sub) {
                    case "name" -> { e.addProperty("name", clip(text, 60)); ok = "Neuer Name: „" + clip(text, 60) + "“."; }
                    case "abschnitt" -> {
                        if (text.equalsIgnoreCase("projekt") || text.equalsIgnoreCase("alle")) { e.addProperty("section", ""); ok = "Lager gilt für das ganze Projekt."; }
                        else {
                            Optional<TeamLog.Section> sec = team.section(text);
                            if (sec.isEmpty()) return fail(s, "Abschnitt „" + text + "“ gibt es nicht.");
                            e.addProperty("section", sec.get().id()); ok = "Lager gehört jetzt zu Abschnitt " + sec.get().number() + " " + sec.get().name() + ".";
                        }
                    }
                    case "farm" -> {
                        if (text.equalsIgnoreCase("keine") || text.equals("-")) { e.addProperty("farm", ""); ok = "Keine Farm mehr verknüpft."; }
                        else {
                            String want = text.replace('_', ' ');
                            Optional<String[]> f = farms(team).stream().filter(x -> x[0].equals(text) || x[1].equalsIgnoreCase(want)).findFirst();
                            if (f.isEmpty()) return fail(s, "Farm „" + text + "“ steht nicht in der Teamdatei (Planer: Reiter „Produktion“, dann Planstand neu an den Server).");
                            e.addProperty("farm", f.get()[0]);
                            if (!"ertrag".equals(st.purpose)) e.addProperty("purpose", "ertrag");
                            ok = "Ertragskiste der Farm „" + f.get()[1] + "“: alles, was hineinkommt, zählt als Ertrag.";
                        }
                    }
                    case "zweck" -> {
                        Optional<String> p = StoreLedger.purpose(text);
                        if (p.isEmpty()) return fail(s, "Zweck vorrat, eingang, ausgabe, rest oder ertrag.");
                        e.addProperty("purpose", p.get()); ok = "Zweck: " + p.get() + ".";
                        if (p.get().equals("eingang") && st.protection == null) e.addProperty("protection", "eingang");
                    }
                    default -> {
                        Optional<String> p = StoreLedger.protection(text);
                        if (p.isEmpty()) return fail(s, "Schutz offen, team, abschnitt, eingang oder gesperrt.");
                        e.addProperty("protection", p.get()); ok = "Schutz „" + p.get() + "“: " + StoreLedger.describe(p.get()) + ".";
                    }
                }
                return teams.submit(team, e, s, ok);
            }
            case "verlauf" -> {
                int n = 8;
                try { if (!text.isEmpty()) n = Math.max(1, Math.min(StoreIndex.RECENT, Integer.parseInt(text))); } catch (NumberFormatException ex) { return fail(s, "/" + label + " lager verlauf [anzahl]"); }
                if (st.recent.isEmpty()) { say(s, "Noch keine Buchungen in „" + st.name + "“."); return true; }
                int i = 0;
                for (StoreIndex.Move m : st.recent) {
                    if (i++ == n) break;
                    TreeMap<String, Long> net = StoreLedger.plus(m.in(), m.out(), -1);
                    say(s, ChatColor.GRAY + m.at().replace('T', ' ').substring(0, Math.min(16, m.at().length())) + ChatColor.RESET + " "
                            + (m.via().equals("trichter") ? "Trichter" : v.name(m.by())) + ": " + StoreLedger.diffText(net, 5));
                }
                return true;
            }
            case "wer" -> {
                if (text.isEmpty()) return fail(s, "/" + label + " lager wer <item>");
                String item = text.toLowerCase(Locale.ROOT).contains(":") ? text.toLowerCase(Locale.ROOT) : "minecraft:" + text.toLowerCase(Locale.ROOT);
                Set<String> who = new HashSet<>(st.in.keySet()); who.addAll(st.out.keySet());
                List<String> lines = new ArrayList<>();
                for (String w : who) {
                    long in = st.in.getOrDefault(w, new TreeMap<>()).getOrDefault(item, 0L), out = st.out.getOrDefault(w, new TreeMap<>()).getOrDefault(item, 0L);
                    if (in != 0 || out != 0) lines.add((w.equals("trichter") ? "Trichter" : v.name(w)) + ": +" + StoreLedger.amount(in) + " / −" + StoreLedger.amount(out));
                }
                if (lines.isEmpty()) { say(s, "Niemand hat " + StoreLedger.shortItem(item) + " in „" + st.name + "“ bewegt."); return true; }
                lines.forEach(l -> say(s, l));
                return true;
            }
            default -> { return help(s, label); }
        }
    }

    private boolean needReport(CommandSender s, TeamLog team, TeamLog.View v, String text, String label) {
        String section = null;
        if (!text.isEmpty() && !text.equalsIgnoreCase("projekt")) {
            Optional<TeamLog.Section> sec = team.section(text);
            if (sec.isEmpty()) return fail(s, "Abschnitt „" + text + "“ gibt es nicht.");
            section = sec.get().id();
        }
        TreeMap<String, Long> need = need(team, section);
        if (need.isEmpty()) return fail(s, "Die Serverdatei enthält keinen Materialbedarf für " + sectionLabel(team, section) + " (im Planer neu als Serverdatei ausgeben).");
        TreeMap<String, Long> have = stock(v, section);
        List<String[]> rows = new ArrayList<>();
        int full = 0;
        for (var e : need.entrySet()) {
            long h = have.getOrDefault(e.getKey(), 0L), miss = e.getValue() - h;
            if (miss <= 0) full++;
            rows.add(new String[] { e.getKey(), String.valueOf(e.getValue()), String.valueOf(h), String.valueOf(Math.max(0, miss)) });
        }
        rows.sort((a, b) -> Long.compare(Long.parseLong(b[3]), Long.parseLong(a[3])));
        say(s, ChatColor.BOLD + "Bedarf " + sectionLabel(team, section) + ChatColor.RESET + ": " + full + " von " + need.size() + " Materialien liegen bereit (gezählte Lager).");
        int shown = 0;
        for (String[] r : rows) {
            if (shown++ == 12) { say(s, "… " + (rows.size() - 12) + " weitere."); break; }
            long miss = Long.parseLong(r[3]);
            say(s, (miss > 0 ? ChatColor.RED : ChatColor.GREEN) + StoreLedger.shortItem(r[0]) + ChatColor.RESET + ": Bedarf " + StoreLedger.amount(Long.parseLong(r[1]))
                    + " · im Lager " + StoreLedger.amount(Long.parseLong(r[2])) + (miss > 0 ? " · fehlt " + StoreLedger.amount(miss) : " · ✓"));
        }
        return true;
    }

    private boolean show(CommandSender s, TeamLog team, TeamLog.View v) {
        if (!(s instanceof Player p)) return fail(s, "Die Markierung ist nur im Spiel sichtbar.");
        String dim = PaperCompat.dimension(p.getWorld());
        Location l = p.getLocation();
        List<StoreIndex.Store> near = v.stores.stores.values().stream().filter(x -> !x.removed && x.dimension.equals(dim)
                && Math.abs(x.pos[0] - l.getBlockX()) <= 48 && Math.abs(x.pos[2] - l.getBlockZ()) <= 48).collect(Collectors.toList());
        if (near.isEmpty()) return fail(s, "Kein Lager in 48 Blöcken Umkreis.");
        say(s, near.size() + " Lager in der Nähe leuchten 20 s: " + near.stream().map(x -> x.name + " (" + ChatColor.stripColor(statusLabel(x)) + ")").collect(Collectors.joining(", ")));
        int[] runs = { 0 };
        BukkitTask[] task = new BukkitTask[1];
        task[0] = Bukkit.getScheduler().runTaskTimer(plugin, () -> {
            if (++runs[0] > 20 || !p.isOnline()) { task[0].cancel(); return; }
            for (StoreIndex.Store x : near) {
                Particle particle = x.deviating() || "fehlt".equals(x.status) ? Particle.FLAME : GOOD;
                try {
                    p.spawnParticle(particle, x.pos[0] + 0.5, x.pos[1] + 1.2, x.pos[2] + 0.5, 6, 0.3, 0.2, 0.3, 0);
                    if (x.pos2 != null) p.spawnParticle(particle, x.pos2[0] + 0.5, x.pos2[1] + 1.2, x.pos2[2] + 0.5, 6, 0.3, 0.2, 0.3, 0);
                } catch (Throwable ex) { task[0].cancel(); }
            }
        }, 0L, 20L);
        return true;
    }

    /** Green sparkle: {@code HAPPY_VILLAGER} since 1.20.5, {@code VILLAGER_HAPPY} before. */
    private static final Particle GOOD = particle("HAPPY_VILLAGER", "VILLAGER_HAPPY", "END_ROD");
    private static Particle particle(String... names) {
        for (String n : names) try { return Particle.valueOf(n); } catch (IllegalArgumentException e) { /* next */ }
        return Particle.FLAME;
    }

    private boolean help(CommandSender s, String label) {
        say(s, "Lager: /" + label + " lager markieren [name] · info · liste · pruefen [alle] · bedarf [nr|projekt] · verlauf [n] · wer <item> · zeigen");
        say(s, "Baumeister: siegeln [notiz] · name <name> · abschnitt <nr|projekt> · zweck <vorrat|eingang|ausgabe|rest|ertrag> · farm <name|keine> · schutz <offen|team|abschnitt|eingang|gesperrt> · entmarkieren");
        say(s, "Das Plugin zählt beim Schließen, bucht Ein- und Ausgaben je Spieler und meldet Abweichungen. Es verändert nie Kisteninhalte.");
        return true;
    }

    List<String> complete(String[] args) {
        // args[0] = "lager"
        if (args.length == 2) return SUBCOMMANDS.subList(0, 16);
        String sub = args[1].toLowerCase(Locale.ROOT);
        if (args.length == 3) return switch (sub) {
            case "zweck" -> StoreLedger.PURPOSES;
            case "schutz" -> StoreLedger.PROTECTIONS;
            case "pruefen" -> List.of("alle");
            case "farm" -> {
                List<String> out = new ArrayList<>(List.of("keine"));
                if (!teams.teams().isEmpty()) farms(teams.teams().iterator().next()).forEach(x -> out.add(x[1].replace(' ', '_')));
                yield out;
            }
            case "abschnitt", "bedarf" -> {
                List<String> out = new ArrayList<>(List.of("projekt"));
                if (!teams.teams().isEmpty()) teams.teams().iterator().next().ordered().forEach(sec -> out.add(String.valueOf(sec.number())));
                yield out;
            }
            default -> List.of();
        };
        return List.of();
    }

    private static String clip(String t, int max) { return t.length() <= max ? t : t.substring(0, max); }
}
