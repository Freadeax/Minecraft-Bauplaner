package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.github.freadeax.bauplaner.bridge.Plan;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Base64;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.World;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

/**
 * Server link without commands (LINK-02, docs/architecture/team/AUTO_LINK.md). The plugin sets itself up on the
 * first start ({@code link.json}: server id, name, owners), waits for an operator to pair it with a planner
 * and from then on takes signed control messages instead of commands: settings, team, team room, plans.
 * <ul>
 *   <li>Pairing ({@code link.claim}): only a player the server itself knows as operator or with
 *       {@code bauplaner.team.leitung}. The answer carries the owner key once; the planner keeps it.</li>
 *   <li>Control ({@code link.ctl}): checked by {@link LinkCore#verify}; the mod (team channel) and later the
 *       team room only pass it on.</li>
 *   <li>Operators who join an unpaired server get one chat hint where to click; nothing has to be typed.</li>
 * </ul>
 * Never touches the world; settings go to the plugin's own config.yml.
 */
final class ServerLink implements Listener {
    private static final String PREFIX = ChatColor.GOLD + "[Bauplaner] " + ChatColor.RESET;
    static final int MAX_PLAN_BYTES = 4 * 1024 * 1024;

    private final BridgePlugin plugin;
    private final Path file;
    private LinkCore.State state;
    private final Set<UUID> hinted = new HashSet<>();

    ServerLink(BridgePlugin plugin, Path dir) {
        this.plugin = plugin;
        this.file = dir.resolve("link.json");
    }

    void enable() {
        state = null;
        if (Files.exists(file)) {
            try { state = LinkCore.State.parse(Files.readString(file, StandardCharsets.UTF_8)); }
            catch (IOException | RuntimeException e) { plugin.getLogger().warning("link.json nicht lesbar (" + e.getMessage() + ") – der Server wird neu eingerichtet."); }
        }
        if (state == null) {
            state = LinkCore.State.fresh(serverName());
            save();
            plugin.getLogger().info("Bauplaner eingerichtet (Server-ID " + state.serverId + "). Koppeln: als OP mit der Bauplaner-Mod beitreten und im Planer auf der Seite „Spiel“ „Server koppeln“ klicken – auf dem Server muss niemand etwas eingeben.");
        } else {
            plugin.getLogger().info("Bauplaner-Kopplung: " + (state.paired() ? state.owners.size() + " Planer gekoppelt." : "noch nicht gekoppelt."));
        }
        Bukkit.getPluginManager().registerEvents(this, plugin);
    }

    boolean paired() { return state != null && state.paired(); }

    String serverId() { return state.serverId; }

    @SuppressWarnings("deprecation") // getMotd(): the plain text form exists in every Paper version 1.18–26.x
    private static String serverName() {
        String motd = Bukkit.getMotd();
        String plain = motd == null ? "" : ChatColor.stripColor(motd).replaceAll("\\s+", " ").trim();
        return plain.isEmpty() || plain.equalsIgnoreCase("A Minecraft Server") ? "Minecraft-Server" : plain;
    }

    static boolean mayClaim(Player p) { return p.isOp() || p.hasPermission("bauplaner.team.leitung"); }

    @EventHandler
    public void onJoin(PlayerJoinEvent e) {
        Player p = e.getPlayer();
        if (paired() || !mayClaim(p) || !hinted.add(p.getUniqueId())) return;
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (!p.isOnline() || paired()) return;
            p.sendMessage(PREFIX + "Dieser Server ist noch nicht mit dem Bauplaner gekoppelt. Im Planer auf der Seite "
                    + ChatColor.YELLOW + "Spiel" + ChatColor.RESET + " „Server koppeln“ klicken (vorher hier J → „Teambau erlauben“). Du musst nichts eintippen.");
        }, 60L);
    }

    // ------------------------------------------------------------------ messages from the team channel

    /**
     * Handles {@code link.info}, {@code link.claim} and {@code link.ctl} from a player's mod (main thread).
     * Completes with the answer fields (without {@code t}/{@code req}); {@code error} on failure.
     */
    CompletableFuture<JsonObject> handle(Player p, String type, JsonObject o) {
        try {
            return switch (type) {
                case "link.info" -> CompletableFuture.completedFuture(info(p));
                case "link.claim" -> CompletableFuture.completedFuture(claim(p, LinkCore.str(o, "device")));
                case "link.ctl" -> control(LinkCore.str(o, "owner"), o.has("seq") && o.get("seq").isJsonPrimitive() ? o.get("seq").getAsLong() : -1,
                        LinkCore.str(o, "body"), LinkCore.str(o, "sig"), p.getName());
                default -> CompletableFuture.completedFuture(error("Unbekannte Nachricht " + type));
            };
        } catch (RuntimeException e) {
            return CompletableFuture.completedFuture(error(e.getMessage()));
        }
    }

    /** What every player with the mod may know: who the server is and whether he could pair it. */
    JsonObject info(Player p) {
        JsonObject a = new JsonObject();
        a.addProperty("serverId", state.serverId);
        a.addProperty("name", state.name);
        a.addProperty("paired", state.paired());
        a.addProperty("canClaim", p != null && mayClaim(p));
        a.addProperty("plugin", plugin.getDescription().getVersion());
        a.addProperty("minecraft", PaperCompat.gameVersion());
        a.addProperty("protocol", 1);
        return a;
    }

    JsonObject claim(Player p, String device) {
        if (!mayClaim(p)) return error("Koppeln darf nur ein Operator (OP) oder wer das Recht bauplaner.team.leitung hat.");
        LinkCore.Owner o = state.addOwner(device, p.getName(), Instant.now());
        save();
        plugin.getLogger().info(p.getName() + " hat den Server mit einem Planer gekoppelt (" + o.name() + ").");
        JsonObject a = info(p);
        a.addProperty("paired", true);
        a.addProperty("owner", o.id());
        a.addProperty("key", o.key());
        return a;
    }

    /** A signed control message, from the mod or the team room ({@code via} = player name or "Team-Raum"). */
    CompletableFuture<JsonObject> control(String owner, long seq, String body, String sig, String via) {
        LinkCore.Control c;
        try { c = LinkCore.verify(state, owner, seq, body, sig); }
        catch (IllegalArgumentException e) { return CompletableFuture.completedFuture(error(e.getMessage())); }
        state.replace(c.owner().withSeq(c.seq()));
        save();
        JsonObject b = c.body();
        try {
            return switch (c.op()) {
                case "status" -> CompletableFuture.completedFuture(status());
                case "config" -> CompletableFuture.completedFuture(config(b.has("set") && b.get("set").isJsonObject() ? b.getAsJsonObject("set") : null, c.owner()));
                case "team" -> CompletableFuture.completedFuture(team(b.get("file"), c.owner()));
                case "room" -> room(b);
                case "plan" -> CompletableFuture.completedFuture(plan(b));
                case "scan" -> onMain(() -> scan(b, via));
                case "rename" -> CompletableFuture.completedFuture(rename(LinkCore.str(b, "name")));
                case "invite" -> CompletableFuture.completedFuture(invite(LinkCore.str(b, "name"), c.owner()));
                case "forget" -> CompletableFuture.completedFuture(forget(LinkCore.str(b, "owner"), c.owner()));
                default -> CompletableFuture.completedFuture(error("Unbekannte Steueraktion."));
            };
        } catch (RuntimeException e) {
            return CompletableFuture.completedFuture(error(e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()));
        }
    }

    // ------------------------------------------------------------------ operations

    JsonObject status() {
        JsonObject a = info(null);
        a.remove("canClaim");
        a.add("owners", state.ownersPublic());
        JsonObject values = new JsonObject();
        for (LinkCore.Setting s : LinkCore.SETTINGS) {
            Object v = plugin.getConfig().get(s.key());
            if (v instanceof Boolean x) values.addProperty(s.key(), x);
            else if (v instanceof Number x) values.addProperty(s.key(), x);
            else if (v != null) values.addProperty(s.key(), v.toString());
        }
        a.add("settings", values);
        a.add("schema", LinkCore.settingsSchema());
        JsonArray teams = new JsonArray();
        TeamModule tm = plugin.teamModule();
        for (TeamLog t : tm.teamList()) {
            JsonObject x = new JsonObject();
            x.addProperty("teamId", t.teamId);
            x.addProperty("name", t.name);
            x.addProperty("events", t.size());
            x.addProperty("sections", t.sections.size());
            teams.add(x);
        }
        a.add("teams", teams);
        JsonArray rooms = new JsonArray();
        tm.roomStatus().forEach(rooms::add);
        a.add("rooms", rooms);
        JsonArray plans = new JsonArray();
        plugin.planNames().forEach(plans::add);
        a.add("plans", plans);
        JsonArray worlds = new JsonArray();
        for (World w : Bukkit.getWorlds()) worlds.add(PaperCompat.dimension(w));
        a.add("worlds", worlds);
        a.addProperty("online", Bukkit.getOnlinePlayers().size());
        return a;
    }

    JsonObject config(JsonObject set, LinkCore.Owner who) {
        Map<String, Object> values = LinkCore.validate(set);
        boolean restart = false;
        for (Map.Entry<String, Object> e : values.entrySet()) {
            plugin.getConfig().set(e.getKey(), e.getValue());
            restart |= LinkCore.setting(e.getKey()).map(LinkCore.Setting::restart).orElse(false);
        }
        plugin.saveConfig();
        plugin.getLogger().info("Einstellungen aus dem Planer (" + who.name() + "): " + values);
        JsonObject a = status();
        a.addProperty("ok", true);
        a.addProperty("text", values.size() + (values.size() == 1 ? " Einstellung" : " Einstellungen") + " übernommen" + (restart ? " – ein Teil wirkt nach dem nächsten Serverneustart." : "."));
        if (restart) a.addProperty("restart", true);
        return a;
    }

    JsonObject team(JsonElement file, LinkCore.Owner who) {
        if (file == null || !file.isJsonObject()) return error("Teamdatei fehlt.");
        try {
            String summary = plugin.teamModule().importFile(TeamLog.GSON.toJson(file));
            plugin.getLogger().info("Teamstand aus dem Planer übernommen (" + who.name() + "): " + summary);
            JsonObject a = new JsonObject();
            a.addProperty("ok", true);
            a.addProperty("text", summary);
            return a;
        } catch (IOException | RuntimeException e) {
            return error("Teamdatei nicht übernommen: " + e.getMessage());
        }
    }

    CompletableFuture<JsonObject> room(JsonObject b) {
        String off = LinkCore.str(b, "off");
        TeamModule tm = plugin.teamModule();
        if (off != null) {
            JsonObject a = new JsonObject();
            a.addProperty("ok", true);
            a.addProperty("text", tm.roomDisconnect(off.isBlank() ? null : off));
            return CompletableFuture.completedFuture(a);
        }
        String link = LinkCore.str(b, "link");
        if (link == null || link.isBlank()) return CompletableFuture.completedFuture(error("Server-Link fehlt."));
        CompletableFuture<JsonObject> out = new CompletableFuture<>();
        tm.roomConnect(link).whenComplete((text, ex) -> Bukkit.getScheduler().runTask(plugin, () -> {
            JsonObject a = new JsonObject();
            if (ex != null) a.addProperty("error", "Team-Raum: " + ex.getMessage());
            else { a.addProperty("ok", !text.startsWith("Verbindung nicht möglich") && !text.startsWith("Das ist kein")); a.addProperty("text", text); if (!a.get("ok").getAsBoolean()) a.addProperty("error", text); }
            out.complete(a);
        }));
        return out;
    }

    JsonObject plan(JsonObject b) {
        String name = LinkCore.str(b, "name");
        String data = LinkCore.str(b, "data");
        if (name == null || data == null) return error("Plan fehlt.");
        String safe = name.replaceAll("\\.schem$", "").replaceAll("[^A-Za-z0-9ÄÖÜäöüß _-]+", "-").replaceAll("^[ -]+|[ -]+$", "");
        if (safe.isEmpty()) safe = "plan";
        if (safe.length() > 60) safe = safe.substring(0, 60);
        byte[] bytes;
        try { bytes = Base64.getDecoder().decode(data); } catch (IllegalArgumentException e) { return error("Plandaten sind kein Base64."); }
        if (bytes.length == 0 || bytes.length > MAX_PLAN_BYTES) return error("Plan zu groß (höchstens " + MAX_PLAN_BYTES / 1024 / 1024 + " MB über diesen Weg).");
        Path dir = plugin.root().resolve("plans");
        Path out = dir.resolve(safe + ".schem");
        Path tmp = dir.resolve(safe + ".schem.tmp");
        Plan plan;
        try {
            Files.createDirectories(dir);
            Files.write(tmp, bytes);
            plan = Plan.read(tmp);
            Files.move(tmp, out, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            plan = Plan.read(out);
        } catch (IOException | RuntimeException e) {
            try { Files.deleteIfExists(tmp); } catch (IOException ignored) { }
            return error("Plan nicht lesbar: " + e.getMessage());
        }
        JsonObject a = new JsonObject();
        a.addProperty("ok", true);
        a.addProperty("file", out.getFileName().toString());
        String text = "Plan „" + plan.name() + "“ liegt auf dem Server (" + plan.width() + "×" + plan.height() + "×" + plan.length() + ").";
        if (b.has("anchor") && b.get("anchor").isJsonArray() && b.getAsJsonArray("anchor").size() == 3) {
            JsonArray p = b.getAsJsonArray("anchor");
            int[] pos = { p.get(0).getAsInt(), p.get(1).getAsInt(), p.get(2).getAsInt() };
            String dim = LinkCore.str(b, "dimension");
            World w = dim == null ? Bukkit.getWorlds().get(0) : PaperCompat.findWorld(dim);
            if (w == null) return error("Welt „" + dim + "“ gibt es auf dem Server nicht.");
            try {
                plugin.storeAnchor(plan, PaperCompat.dimension(w), pos);
                text += " Anker " + pos[0] + " " + pos[1] + " " + pos[2] + " (" + PaperCompat.dimension(w) + ").";
            } catch (IOException e) {
                return error("Anker nicht gespeichert: " + e.getMessage());
            }
        }
        a.addProperty("text", text);
        plugin.getLogger().info(text);
        return a;
    }

    /** Runs {@code work} on the server thread (world access, scheduler). */
    private CompletableFuture<JsonObject> onMain(java.util.function.Supplier<JsonObject> work) {
        if (Bukkit.isPrimaryThread()) return CompletableFuture.completedFuture(work.get());
        CompletableFuture<JsonObject> out = new CompletableFuture<>();
        Bukkit.getScheduler().runTask(plugin, () -> {
            try { out.complete(work.get()); } catch (RuntimeException e) { out.complete(error(e.getMessage())); }
        });
        return out;
    }

    /** Raw bytes of one recording per {@code scan fetch} answer (base64 in the answer is a third larger). */
    static final int SCAN_PART = 384 * 1024;
    static final int SCAN_LIST = 20;
    static final int PLAN_LIST = 40;

    /**
     * LINK-06: recording of the build state, started from the planner instead of {@code /bp scan}.
     * {@code do}: {@code list} (plans with anchor, recordings, running/last), {@code start {plan, loaded?}},
     * {@code cancel}, {@code fetch {file, offset}} (one part of a recording as base64). Never changes the world.
     */
    JsonObject scan(JsonObject b, String via) {
        String what = LinkCore.str(b, "do");
        if (what == null) what = "list";
        switch (what) {
            case "start" -> {
                var plan = plugin.readPlan(LinkCore.str(b, "plan"));
                if (plan.isEmpty()) return error("Den Plan gibt es auf dem Server nicht (zuerst „Auf den Server legen“).");
                java.util.List<String> notes = new java.util.ArrayList<>();
                boolean loaded = b.has("loaded") && b.get("loaded").isJsonPrimitive() && b.get("loaded").getAsBoolean();
                String problem = plugin.startFromPlanner(plan.get(), loaded, via, notes);
                if (problem != null) return error(problem);
                plugin.getLogger().info("Aufnahme aus dem Planer (" + via + "): " + plan.get().fileName());
                JsonObject a = scanList();
                a.addProperty("text", ChatColor.stripColor(String.join(" ", notes)));
                return a;
            }
            case "cancel" -> {
                String text = plugin.cancelFromPlanner() ? "Aufnahme abgebrochen." : "Es lief keine Aufnahme.";
                JsonObject a = scanList();
                a.addProperty("text", text);
                return a;
            }
            case "fetch" -> { return scanFetch(LinkCore.str(b, "file"), b.has("offset") && b.get("offset").isJsonPrimitive() ? b.get("offset").getAsLong() : 0); }
            case "list" -> { return scanList(); }
            default -> { return error("Unbekannte Aufnahme-Aktion: " + what); }
        }
    }

    JsonObject scanList() {
        JsonObject a = new JsonObject();
        a.addProperty("ok", true);
        JsonArray plans = new JsonArray();
        for (String name : plugin.planNames().stream().limit(PLAN_LIST).toList()) {
            var plan = plugin.readPlan(name);
            if (plan.isEmpty()) continue;
            Plan p = plan.get();
            JsonObject o = new JsonObject();
            o.addProperty("file", name);
            o.addProperty("name", p.name());
            if (p.projectId() != null) o.addProperty("projectId", p.projectId());
            o.addProperty("revision", p.revisionNumber());
            o.addProperty("cells", p.volume());
            plugin.anchorOf(p).ifPresent(e -> {
                JsonArray pos = new JsonArray();
                for (int v : e.anchor()) pos.add(v);
                o.add("anchor", pos);
                o.addProperty("dimension", e.dimension());
            });
            plans.add(o);
        }
        a.add("plans", plans);
        JsonArray scans = new JsonArray();
        Path dir = plugin.root().resolve("scans");
        try (var files = Files.list(dir)) {
            files.filter(f -> f.getFileName().toString().endsWith(".schem") && Files.isRegularFile(f))
                    .sorted((x, y) -> Long.compare(modified(y), modified(x))).limit(SCAN_LIST).forEach(f -> {
                        JsonObject o = new JsonObject();
                        o.addProperty("file", f.getFileName().toString());
                        try { o.addProperty("bytes", Files.size(f)); } catch (IOException ignored) { }
                        o.addProperty("at", Instant.ofEpochMilli(modified(f)).toString());
                        scans.add(o);
                    });
        } catch (IOException ignored) { }
        a.add("scans", scans);
        ServerScan run = plugin.currentScan();
        String writing = plugin.writingPlan();
        if (run != null || writing != null) {
            JsonObject r = new JsonObject();
            r.addProperty("plan", run != null ? run.plan.fileName() : writing);
            r.addProperty("percent", run != null ? run.percent() : 100);
            r.addProperty("by", run != null ? run.ownerName : "");
            r.addProperty("phase", run == null ? "schreiben" : run.preparing() ? "chunks" : "lesen");
            a.add("running", r);
        }
        BridgePlugin.ScanResult last = plugin.lastScan();
        if (last != null) {
            JsonObject l = new JsonObject();
            l.addProperty("plan", last.plan());
            if (last.file() != null) l.addProperty("file", last.file());
            if (last.error() != null) l.addProperty("error", last.error());
            if (!last.summary().isEmpty()) l.addProperty("summary", last.summary());
            l.addProperty("at", Instant.ofEpochMilli(last.at()).toString());
            a.add("last", l);
        }
        a.addProperty("partBytes", SCAN_PART);
        return a;
    }

    private static long modified(Path f) {
        try { return Files.getLastModifiedTime(f).toMillis(); } catch (IOException e) { return 0; }
    }

    JsonObject scanFetch(String name, long offset) {
        Path dir = plugin.root().resolve("scans");
        Path file = dir.resolve(name == null ? "" : name).normalize();
        if (name == null || !file.startsWith(dir) || !file.getParent().equals(dir) || !name.endsWith(".schem") || !Files.isRegularFile(file))
            return error("Diese Aufnahme gibt es auf dem Server nicht.");
        try (var ch = java.nio.channels.FileChannel.open(file)) {
            long size = ch.size();
            if (offset < 0 || offset > size) return error("Ungültige Stelle in der Aufnahme.");
            int n = (int) Math.min(SCAN_PART, size - offset);
            java.nio.ByteBuffer buf = java.nio.ByteBuffer.allocate(n);
            while (buf.hasRemaining() && ch.read(buf, offset + buf.position()) > 0) { }
            JsonObject a = new JsonObject();
            a.addProperty("ok", true);
            a.addProperty("file", file.getFileName().toString());
            a.addProperty("size", size);
            a.addProperty("offset", offset);
            a.addProperty("data", Base64.getEncoder().encodeToString(java.util.Arrays.copyOf(buf.array(), buf.position())));
            return a;
        } catch (IOException e) {
            return error("Aufnahme nicht lesbar: " + e.getMessage());
        }
    }

    JsonObject rename(String name) {
        if (name == null || name.isBlank()) return error("Name fehlt.");
        state.name = LinkCore.clip(name, 60);
        save();
        JsonObject a = status();
        a.addProperty("ok", true);
        a.addProperty("text", "Server heißt jetzt „" + state.name + "“.");
        return a;
    }

    /** A further device (e.g. a tablet) for the same owner: a new key, returned once. */
    JsonObject invite(String name, LinkCore.Owner who) {
        LinkCore.Owner o = state.addOwner(name, who.name(), Instant.now());
        save();
        JsonObject a = new JsonObject();
        a.addProperty("ok", true);
        a.addProperty("serverId", state.serverId);
        a.addProperty("name", state.name);
        a.addProperty("owner", o.id());
        a.addProperty("key", o.key());
        a.addProperty("text", "Weiteres Gerät „" + o.name() + "“ freigegeben.");
        return a;
    }

    JsonObject forget(String owner, LinkCore.Owner who) {
        if (owner == null) return error("Welches Gerät?");
        if (!state.removeOwner(owner)) return error("Dieses Gerät ist nicht gekoppelt.");
        save();
        JsonObject a = status();
        a.addProperty("ok", true);
        a.addProperty("text", owner.equals(who.id()) ? "Dieser Planer ist jetzt vom Server getrennt." : "Gerät entfernt.");
        return a;
    }

    // ------------------------------------------------------------------ helpers

    private void save() {
        try {
            Files.createDirectories(file.getParent());
            Path tmp = file.resolveSibling("link.json.tmp");
            Files.writeString(tmp, state.json(), StandardCharsets.UTF_8);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            plugin.getLogger().warning("link.json nicht gespeichert: " + e.getMessage());
        }
    }

    static JsonObject error(String text) {
        JsonObject a = new JsonObject();
        a.addProperty("error", text == null ? "Fehler" : text);
        return a;
    }
}
