package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.team.TeamWire;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiConsumer;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.plugin.messaging.PluginMessageListener;

/**
 * Teamkanal {@code bauplaner:team} for players with the Bauplaner mod (COOP-03, docs/architecture/team/TEAMBAU.md §7).
 * The plugin announces the channel (Bukkit sends {@code minecraft:register}); a mod only talks on it after its
 * player allowed it for this server. Messages: see {@link TeamWire} (JSON, split into parts above 24 KB).
 * <ul>
 * <li>Mod → plugin: {@code hello}, {@code act} (one team action, judged like the chat commands, answered with
 * {@code ack}), {@code pull} (raw events for the planner), {@code push} (a team server file from the planner,
 * only for the Bauleitung).</li>
 * <li>Plugin → mod: {@code state} (folded team view with the player's own member id, sent after every change to
 * every listening player), {@code none}, {@code ack}, {@code answer}, {@code store} (one counted chest, COOP-04).</li>
 * </ul>
 * Players without the mod never get anything here; the world is never changed.
 */
final class TeamChannel implements PluginMessageListener, Listener {
    static final String CHANNEL = TeamWire.CHANNEL;
    /** Most events in one pull answer; the mod asks again with the last id. */
    static final int PULL_MAX = 5_000;

    /**
     * Extra fields for the state of a team, set by the storage module (COOP-04): {@code stores} and per section
     * {@code need}. Called on the main thread with the team and the state object before it is sent.
     */
    static volatile BiConsumer<TeamLog, JsonObject> decorate = (t, s) -> { };

    private final JavaPlugin plugin;
    private final TeamModule team;
    private final Map<UUID, TeamWire.Assembler> assemblers = new ConcurrentHashMap<>();
    /** Players whose mod said hello (and therefore listens). */
    private final Set<UUID> listening = ConcurrentHashMap.newKeySet();
    private boolean dirty;
    private int partCounter;
    /** Server link without commands (LINK-02): pairing and signed control messages from the planner. */
    private ServerLink link;

    TeamChannel(JavaPlugin plugin, TeamModule team) {
        this.plugin = plugin;
        this.team = team;
    }

    void link(ServerLink link) { this.link = link; }

    void enable() {
        Bukkit.getMessenger().registerIncomingPluginChannel(plugin, CHANNEL, this);
        Bukkit.getMessenger().registerOutgoingPluginChannel(plugin, CHANNEL);
        Bukkit.getPluginManager().registerEvents(this, plugin);
        team.onChange(this::changed);
    }

    void disable() {
        team.onChange(null);
        Bukkit.getMessenger().unregisterIncomingPluginChannel(plugin, CHANNEL, this);
        Bukkit.getMessenger().unregisterOutgoingPluginChannel(plugin, CHANNEL);
        listening.clear();
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        listening.remove(e.getPlayer().getUniqueId());
        assemblers.remove(e.getPlayer().getUniqueId());
    }

    /** Some team changed: send fresh states once at the end of this tick (several events, one send). */
    private void changed() {
        if (dirty || listening.isEmpty()) return;
        dirty = true;
        Bukkit.getScheduler().runTask(plugin, () -> { dirty = false; for (UUID id : listening) { Player p = Bukkit.getPlayer(id); if (p != null) sendState(p); } });
    }

    /** One counted chest for everyone in that team (called by the storage module after a count). */
    void broadcastStore(TeamLog t, JsonObject store) {
        for (UUID id : listening) {
            Player p = Bukkit.getPlayer(id);
            if (p == null || team.teamFor(p) != t) continue;
            JsonObject m = new JsonObject();
            m.addProperty("t", "store");
            m.add("store", store);
            send(p, m);
        }
    }

    // ------------------------------------------------------------------ incoming

    @Override
    public void onPluginMessageReceived(String channel, Player player, byte[] message) {
        if (!CHANNEL.equals(channel)) return;
        Map<String, Object> m;
        try {
            m = assemblers.computeIfAbsent(player.getUniqueId(), k -> new TeamWire.Assembler()).accept(message);
        } catch (RuntimeException e) {
            error(player, "Teamkanal: " + e.getMessage());
            return;
        }
        if (m == null) return;
        JsonObject o = JsonParser.parseString(Json.write(m)).getAsJsonObject();
        String t = TeamLog.str(o, "t");
        try {
            switch (t == null ? "" : t) {
                case "hello" -> { listening.add(player.getUniqueId()); sendState(player); }
                case "act" -> act(player, o);
                case "pull" -> pull(player, o);
                case "push" -> push(player, o);
                case "link.info", "link.claim", "link.ctl", "link.room" -> linkMessage(player, t, o);
                default -> error(player, "Unbekannte Nachricht " + t);
            }
        } catch (RuntimeException e) {
            plugin.getLogger().warning("Teamkanal von " + player.getName() + ": " + e);
            error(player, "Fehler im Plugin: " + e.getMessage());
        }
    }

    private void act(Player p, JsonObject o) {
        JsonObject event = o.has("event") && o.get("event").isJsonObject() ? o.getAsJsonObject("event") : new JsonObject();
        String id = TeamLog.str(event, "id");
        String teamId = TeamLog.str(o, "teamId");
        TeamLog t = teamId != null ? team.team(teamId) : team.teamFor(p);
        JsonObject ack = new JsonObject();
        ack.addProperty("t", "ack");
        ack.addProperty("id", id == null ? "" : id);
        if (t == null) {
            ack.addProperty("ok", false);
            // Not final: the Bauleitung may load the team file later; the mod keeps the action.
            ack.addProperty("final", team.teamList().isEmpty() ? false : true);
            ack.addProperty("reason", team.teamList().isEmpty() ? "Auf diesem Server ist noch kein Team angelegt." : "Dieses Team kennt der Server nicht.");
        } else {
            TeamModule.ChannelResult r = team.submitFor(p, t, event);
            ack.addProperty("ok", r.ok());
            ack.addProperty("final", r.fin());
            if (r.text() != null) ack.addProperty("reason", r.text());
        }
        send(p, ack);
    }

    private void pull(Player p, JsonObject o) {
        String req = TeamLog.str(o, "req"), teamId = TeamLog.str(o, "teamId"), since = TeamLog.str(o, "since");
        JsonObject a = answer(req);
        TeamLog t = teamId != null ? team.team(teamId) : team.teamFor(p);
        if (!p.hasPermission("bauplaner.team.use")) { a.addProperty("error", "Dir fehlt das Recht bauplaner.team.use."); send(p, a); return; }
        if (t == null) { a.addProperty("error", "team-fehlt: Dieses Team gibt es auf dem Server nicht."); send(p, a); return; }
        List<JsonObject> all = t.events();
        int from = 0;
        if (since != null) for (int i = 0; i < all.size(); i++) if (since.equals(TeamLog.str(all.get(i), "id"))) { from = i + 1; break; }
        JsonArray list = new JsonArray();
        int to = Math.min(all.size(), from + PULL_MAX);
        for (int i = from; i < to; i++) list.add(all.get(i));
        a.addProperty("teamId", t.teamId);
        a.addProperty("name", t.name);
        a.add("events", list);
        a.addProperty("more", to < all.size());
        a.addProperty("total", all.size());
        send(p, a);
    }

    private void push(Player p, JsonObject o) {
        JsonObject a = answer(TeamLog.str(o, "req"));
        JsonElement file = o.get("file");
        if (file == null || !file.isJsonObject()) { a.addProperty("error", "Teamdatei fehlt."); send(p, a); return; }
        String teamId = TeamLog.str(file.getAsJsonObject(), "teamId");
        TeamLog known = teamId == null ? null : team.team(teamId);
        // A new team may only be created with the permission; a known one also by its Bauleitung.
        if (!team.leads(p, known)) {
            a.addProperty("error", "Nur die Bauleitung (oder bauplaner.team.leitung) darf einen Planstand auf den Server legen.");
            send(p, a);
            return;
        }
        try {
            String summary = team.importFile(TeamLog.GSON.toJson(file));
            a.addProperty("ok", true);
            a.addProperty("text", summary);
            TeamLog now = team.team(teamId);
            if (now != null) a.addProperty("events", now.size());
            plugin.getLogger().info(p.getName() + " hat den Teamstand „" + (now == null ? teamId : now.name) + "“ aus dem Planer übertragen.");
        } catch (Exception e) {
            a.addProperty("error", "Teamdatei nicht übernommen: " + e.getMessage());
        }
        send(p, a);
    }

    /** LINK-02: the planner talks to the server through this player's mod; the answer goes back as {@code answer}. */
    private void linkMessage(Player p, String type, JsonObject o) {
        String req = TeamLog.str(o, "req");
        if (link == null) { JsonObject a = answer(req); a.addProperty("error", "Diese Plugin-Version kennt keine Kopplung."); send(p, a); return; }
        link.handle(p, type, o).whenComplete((result, ex) -> Bukkit.getScheduler().runTask(plugin, () -> {
            if (!p.isOnline()) return;
            JsonObject a = answer(req);
            if (ex != null) a.addProperty("error", "Fehler im Plugin: " + ex.getMessage());
            else for (Map.Entry<String, JsonElement> e : result.entrySet()) a.add(e.getKey(), e.getValue());
            send(p, a);
        }));
    }

    private static JsonObject answer(String req) {
        JsonObject a = new JsonObject();
        a.addProperty("t", "answer");
        a.addProperty("req", req == null ? "" : req);
        return a;
    }

    private void error(Player p, String text) {
        JsonObject m = new JsonObject();
        m.addProperty("t", "error");
        m.addProperty("text", text);
        send(p, m);
    }

    // ------------------------------------------------------------------ state

    private void sendState(Player p) {
        TeamLog t = team.teamFor(p);
        if (t == null) {
            JsonObject m = new JsonObject();
            m.addProperty("t", "none");
            m.addProperty("text", "Auf diesem Server ist noch kein Team angelegt.");
            send(p, m);
            return;
        }
        JsonObject m = new JsonObject();
        m.addProperty("t", "state");
        m.add("state", state(t, team.memberFor(t, p)));
        send(p, m);
    }

    /** The folded view in the mod's team-link format (same as the planner sends on POST /v1/team). */
    JsonObject state(TeamLog t, Optional<String> me) {
        TeamLog.View v = team.viewOf(t);
        JsonObject s = new JsonObject();
        s.addProperty("teamId", t.teamId);
        s.addProperty("name", t.name);
        String dim = TeamLog.str(t.header, "dimension");
        s.addProperty("dimension", dim == null ? "minecraft:overworld" : dim);
        if (v.releaseNumber >= 0) s.addProperty("revision", v.releaseNumber);
        if (v.releaseSummary != null) s.addProperty("revisionSummary", v.releaseSummary.length() > 300 ? v.releaseSummary.substring(0, 300) : v.releaseSummary);
        me.ifPresent(x -> s.addProperty("me", x));
        JsonArray sections = new JsonArray();
        for (TeamLog.Section sec : t.ordered()) {
            TeamLog.SectionState st = v.section(sec.id());
            JsonObject j = new JsonObject();
            j.addProperty("id", sec.id());
            j.addProperty("nr", sec.number());
            j.addProperty("name", sec.name());
            if (st.owner != null) j.addProperty("owner", st.owner);
            j.addProperty("status", st.status);
            JsonArray boxes = new JsonArray();
            for (TeamLog.Box b : sec.boxes()) {
                if (boxes.size() >= 64) break;
                JsonArray a = new JsonArray();
                a.add(b.minX()); a.add(b.minY()); a.add(b.minZ()); a.add(b.maxX()); a.add(b.maxY()); a.add(b.maxZ());
                boxes.add(a);
            }
            j.add("boxes", boxes);
            sections.add(j);
        }
        s.add("sections", sections);
        JsonArray members = new JsonArray();
        Map<String, String> ids = new LinkedHashMap<>(v.names);
        for (String id : v.known) ids.putIfAbsent(id, id);
        for (var e : ids.entrySet()) {
            if (members.size() >= 500) break;
            JsonObject j = new JsonObject();
            j.addProperty("id", e.getKey());
            j.addProperty("name", e.getValue().length() > 60 ? e.getValue().substring(0, 60) : e.getValue());
            String player = v.players.get(e.getKey());
            if (player != null) j.addProperty("player", player);
            j.addProperty("role", v.role(e.getKey()));
            members.add(j);
        }
        s.add("members", members);
        JsonArray notes = new JsonArray();
        for (TeamLog.NoteState n : v.notes.values()) {
            if (n.resolvedBy != null || notes.size() >= 500) continue;
            JsonObject j = new JsonObject();
            j.addProperty("id", n.id);
            j.addProperty("tag", n.tag == null ? "info" : n.tag);
            j.addProperty("text", n.text == null ? "" : n.text);
            if (n.by != null) j.addProperty("by", n.by);
            if (n.section != null) j.addProperty("section", n.section);
            if (n.pos != null) { JsonArray a = new JsonArray(); a.add(n.pos[0]); a.add(n.pos[1]); a.add(n.pos[2]); j.add("pos", a); }
            notes.add(j);
        }
        s.add("notes", notes);
        s.addProperty("at", java.time.Instant.now().toString());
        try { decorate.accept(t, s); } catch (RuntimeException e) { plugin.getLogger().warning("Teamstand ergänzen: " + e); }
        return s;
    }

    // ------------------------------------------------------------------ outgoing

    private void send(Player p, JsonObject message) {
        if (!p.isOnline() || !p.getListeningPluginChannels().contains(CHANNEL)) return;
        Map<String, Object> m = Json.obj(Json.parse(TeamLog.GSON.toJson(message)), "Nachricht");
        for (byte[] frame : TeamWire.frames(m, "s" + (++partCounter))) p.sendPluginMessage(plugin, CHANNEL, frame);
    }

    /** For the diagnose: how many players listen right now. */
    int listeners() { return listening.size(); }
}
