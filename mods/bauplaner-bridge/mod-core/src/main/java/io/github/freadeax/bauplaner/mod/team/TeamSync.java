package io.github.freadeax.bauplaner.mod.team;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import io.github.freadeax.bauplaner.mod.live.Json;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import java.util.function.LongSupplier;

/**
 * Teambau in the mod without Minecraft classes (COOP-03): where the team state comes from, the opt-in
 * plugin channel, the outbox of own actions and the relay between website and plugin. The game side
 * ({@code TeamClient}) feeds it with connection events and frames and draws what it says.
 * <p>
 * Rule "keine zusätzlichen Pakete an den Server" (Philipp): {@link #send} only ever runs when the server
 * announced the channel itself ({@link #serverAnnounced}) <em>and</em> the player allowed it for this
 * server ({@code /bauplaner team erlauben}, kept in {@code erlaubt.properties}). Without that the mod
 * stays silent; team state then only comes from the planner over 127.0.0.1.
 */
public final class TeamSync {
    /** How the mod sends frames to the server; implemented per loader (Fabric, NeoForge). */
    public interface Transport {
        /** Whether the server registered {@link TeamWire#CHANNEL} (minecraft:register from the plugin). */
        boolean serverHasChannel();
        /** Registers the channel for this connection (tells the server the mod listens); called once after opt-in. */
        void open();
        void send(byte[] frame);
    }

    /** What the player sees about the server connection. */
    public enum Link {
        /** Singleplayer, no server, or not connected. */
        NONE("kein Server", "no server"),
        /** The server has no Build Studio plugin with the team channel. */
        NO_PLUGIN("Server ohne Build-Studio-Plugin", "server without Build Studio plugin"),
        /** Plugin there, player has not allowed the channel for this server yet. */
        ASK("Plugin da – J drücken → „Teambau erlauben“", "plugin found – press J → “Allow team building”"),
        /** Allowed, hello sent, waiting for the first state. */
        WAITING("verbinde …", "connecting …"),
        /** Live with the plugin. */
        LIVE("live mit dem Server", "live with the server"),
        /** Player switched it off for this server. */
        OFF("für diesen Server aus", "off for this server");
        /** German label (also sent to the website). */
        public final String label;
        private final String en;
        Link(String label, String en) { this.label = label; this.en = en; }
        /** Label in the player's language (GAME-12). */
        public String text() { return io.github.freadeax.bauplaner.mod.Lang.t(label, en); }
    }

    private final Path dir;
    private final LongSupplier clock;
    private final Consumer<String> notify;
    private final String modVersion;
    private final Properties allowed = new Properties();
    private TeamOutbox outbox;
    private String serverKey;
    private Transport transport;
    private boolean announced, opened;
    private Link link = Link.NONE;
    private final TeamWire.Assembler assembler = new TeamWire.Assembler();
    private volatile TeamState fromPlaner, fromServer;
    private volatile long planerAt, serverAt;
    private volatile String lastError;
    private int partCounter;
    /** Website requests waiting for a plugin answer (pull/push), by request id. */
    private final Map<String, CompletableFuture<Map<String, Object>>> waiting = new ConcurrentHashMap<>();
    /** Actions sent on the channel and not yet answered: id → send time (resent after 15 s). */
    private final Map<String, Long> inFlight = new ConcurrentHashMap<>();
    /** Rejected own actions with the reason, for the HUD/chat (newest last, at most 20). */
    private final List<String> rejections = new ArrayList<>();
    private int stateCount;
    /** LINK-07: team room without a server plugin (null when the mod has none). */
    private io.github.freadeax.bauplaner.mod.room.RoomClient room;
    private Map<String, Object> roomMap;
    private TeamState roomState;
    /** Own actions sent to the room and not yet answered: id → send time. */
    private final Map<String, Long> roomFlight = new ConcurrentHashMap<>();
    /** LINK-11: server + room + key the team room was last handed to on this connection (null = not yet). */
    private String handedTo;
    private volatile String handoverText;

    /**
     * @param dir {@code <game dir>/bauplaner/team}
     * @param notify chat lines for the player (called on the thread that fed the event)
     */
    public TeamSync(Path dir, String modVersion, LongSupplier clock, Consumer<String> notify) {
        this.dir = dir;
        this.modVersion = modVersion;
        this.clock = clock;
        this.notify = notify;
        try (Reader r = Files.newBufferedReader(dir.resolve("erlaubt.properties"), StandardCharsets.UTF_8)) { allowed.load(r); } catch (IOException ignored) { }
        outbox = new TeamOutbox(null);
    }

    // ------------------------------------------------------------------ team room (LINK-07)

    /** Connects the team room: its answers empty the outbox, rejections are shown like the plugin's. */
    public void room(io.github.freadeax.bauplaner.mod.room.RoomClient r) {
        room = r;
        r.listen(ids -> { synchronized (this) { ids.forEach(roomFlight::remove); outbox.remove(ids); } },
                (id, why) -> { synchronized (this) {
                    if (id != null) { roomFlight.remove(id); outbox.remove(List.of(id)); }
                    if (why != null) { synchronized (rejections) { rejections.add(why); if (rejections.size() > 20) rejections.remove(0); } notify.accept(t("Nicht übernommen: ", "Not accepted: ") + why); }
                } },
                () -> { });
        r.connect();
    }

    public io.github.freadeax.bauplaner.mod.room.RoomClient room() { return room; }

    /** The room's folded state, parsed once per change. */
    public synchronized TeamState roomState() {
        if (room == null) return null;
        Map<String, Object> m = room.state();
        if (m == null) { roomMap = null; roomState = null; return null; }
        if (m != roomMap) {
            try { roomState = TeamState.parse(m, TeamState.Source.ROOM); } catch (RuntimeException e) { roomState = null; lastError = "Team-Raum: " + e.getMessage(); }
            roomMap = m;
        }
        return roomState;
    }

    private boolean roomLive() { return room != null && room.live() && link != Link.LIVE; }

    private void sendToRoom(TeamOutbox.Action a) {
        var c = room.config();
        if (c == null) return;
        if (room.append(a.id(), List.of(a.asEvent(c.member())))) roomFlight.put(a.id(), clock.getAsLong());
    }

    // ------------------------------------------------------------------ connection

    /** Joined a world/server ({@code key} as for placements, e.g. "server/example.org_25565"); transport null in singleplayer. */
    public synchronized void join(String key, Transport transport) {
        this.serverKey = key;
        this.transport = transport;
        announced = opened = false;
        fromServer = null;
        inFlight.clear();
        assembler.clear();
        handedTo = null;
        outbox = new TeamOutbox(dir == null || key == null ? null : dir.resolve(safe(key) + ".ausgang.json"));
        link = transport == null ? Link.NONE : Link.NO_PLUGIN;
        check();
    }

    public synchronized void leave() {
        transport = null;
        announced = opened = false;
        fromServer = null;
        link = Link.NONE;
        failWaiting("Verbindung zum Server getrennt.");
    }

    /** Called every second or so: notices a late channel announcement and resends unanswered actions. */
    public synchronized void tick() {
        if (roomLive()) {
            long now = clock.getAsLong();
            String team = roomState() == null ? null : roomState.teamId();
            if (team != null) for (TeamOutbox.Action a : outbox.pending(team)) {
                Long sent = roomFlight.get(a.id());
                if (sent == null || now - sent > 15_000) sendToRoom(a);
            }
        }
        if (transport == null) return;
        check();
        if (link == Link.LIVE) {
            long now = clock.getAsLong();
            for (TeamOutbox.Action a : outbox.pending()) {
                Long sent = inFlight.get(a.id());
                if (sent == null || now - sent > 15_000) sendAction(a);
            }
        }
    }

    private void check() {
        if (transport == null) return;
        boolean has = transport.serverHasChannel();
        if (has && !announced) {
            announced = true;
            String a = allowed.getProperty(serverKey);
            if ("ja".equals(a)) start();
            else if ("nein".equals(a)) link = Link.OFF;
            else { link = Link.ASK; notify.accept(t("Auf diesem Server läuft das Build-Studio-Plugin. Teambau und Server-Kopplung einschalten: J drücken → „Teambau erlauben“ (einmal je Server). Bis dahin sendet die Mod nichts.", "This server runs the Build Studio plugin. Turn on team building and the server link: press J → “Allow team building” (once per server). Until then the mod sends nothing.")); }
        } else if (!has && !announced) link = Link.NO_PLUGIN;
    }

    private void start() {
        if (!opened) { transport.open(); opened = true; }
        link = Link.WAITING;
        Map<String, Object> hello = new LinkedHashMap<>();
        hello.put("t", "hello"); hello.put("mod", "bauplaner"); hello.put("version", modVersion);
        send(hello);
    }

    /** {@code /bauplaner team erlauben|verbieten}: per server, saved. */
    public synchronized String allow(boolean yes) {
        if (serverKey == null || transport == null) return t("Das geht nur auf einem Server.", "This only works on a server.");
        allowed.setProperty(serverKey, yes ? "ja" : "nein");
        saveAllowed();
        if (!yes) { link = announced ? Link.OFF : Link.NO_PLUGIN; fromServer = null; return t("Teamkanal für diesen Server aus. Die Mod sendet hier nichts mehr; Teamstand nur noch aus dem Planer.", "Team channel off for this server. The mod sends nothing here; team state only from the planner."); }
        if (!transport.serverHasChannel()) return t("Erlaubt. Dieser Server hat aber (noch) kein Build-Studio-Plugin mit Teambau – die Mod sendet erst, wenn es da ist.", "Allowed. This server has no Build Studio plugin with team building (yet) – the mod sends once it is there.");
        announced = true;
        start();
        return t("Teamkanal für diesen Server erlaubt. Die Mod holt den Teamstand vom Plugin.", "Team channel allowed for this server. The mod gets the team state from the plugin.");
    }

    /** The server offers the plugin and the player has not decided yet (LINK-03: the J menu shows the question). */
    public synchronized boolean asking() { return link == Link.ASK; }

    public synchronized boolean allowed() { return serverKey != null && "ja".equals(allowed.getProperty(serverKey)); }

    public Link link() { return link; }

    public String lastError() { return lastError; }

    // ------------------------------------------------------------------ incoming

    /** A frame from the plugin (any thread the loader delivers on; synchronized). */
    public synchronized void receive(byte[] frame) {
        if (!opened) return; // never asked for: ignore
        Map<String, Object> m;
        try { m = assembler.accept(frame); }
        catch (RuntimeException e) { lastError = "Teamkanal: " + e.getMessage(); return; }
        if (m == null) return;
        String t = m.get("t") instanceof String s ? s : "";
        try {
            switch (t) {
                case "state" -> {
                    fromServer = TeamState.parse(Json.obj(m.get("state"), "Teamstand"), TeamState.Source.SERVER);
                    serverAt = clock.getAsLong();
                    if (link != Link.LIVE) {
                        link = Link.LIVE;
                        if (stateCount == 0) notify.accept("Teambau live: " + fromServer.summary() + ".");
                    }
                    stateCount++;
                    handOverRoom();
                    // A fresh state answers everything that was sent before: resend what is still open.
                    for (TeamOutbox.Action a : outbox.pending()) if (!inFlight.containsKey(a.id())) sendAction(a);
                }
                case "none" -> { fromServer = null; link = Link.LIVE; lastError = m.get("text") instanceof String s ? s : "Kein Team auf diesem Server."; handOverRoom(); }
                case "store" -> { if (fromServer != null) fromServer = fromServer.withStore(TeamState.store(Json.obj(m.get("store"), "Lagerkiste"), fromServer.dimension())); }
                case "ack" -> {
                    String id = Json.str(m.get("id"), "ID", 64);
                    inFlight.remove(id);
                    boolean ok = Boolean.TRUE.equals(m.get("ok"));
                    String reason = m.get("reason") instanceof String s ? s : null;
                    // Only a final answer empties the outbox; "später" (team file missing, server busy) keeps it.
                    if (ok || Boolean.TRUE.equals(m.get("final"))) outbox.remove(List.of(id));
                    if (!ok && reason != null) {
                        synchronized (rejections) { rejections.add(reason); if (rejections.size() > 20) rejections.remove(0); }
                        notify.accept(t("Nicht übernommen: ", "Not accepted: ") + reason);
                    }
                }
                case "answer" -> {
                    CompletableFuture<Map<String, Object>> f = waiting.remove(Json.str(m.get("req"), "Anfrage", 64));
                    if (f != null) f.complete(m);
                }
                case "error" -> lastError = m.get("text") instanceof String s ? s : "Fehler vom Plugin";
                default -> { } // newer plugin messages: ignore
            }
        } catch (RuntimeException e) {
            lastError = "Teamkanal (" + t + "): " + e.getMessage();
        }
    }

    // ------------------------------------------------------------------ state

    /** {@code POST /v1/team}: the planner's view of the team. */
    public void fromPlaner(Map<String, Object> body) {
        TeamState s = TeamState.parse(body, TeamState.Source.PLANER);
        fromPlaner = s;
        planerAt = clock.getAsLong();
    }

    /** The state the game shows: the server's when live, else the planner's; own waiting actions overlaid. */
    public TeamState state() {
        TeamState fromRoom = roomState();
        TeamState base = fromServer != null ? fromServer : fromRoom != null ? fromRoom : fromPlaner;
        if (base == null) return null;
        TeamState withMe = base.me() != null || fromPlaner == null || !fromPlaner.teamId().equals(base.teamId()) ? base
                : new TeamState(base.source(), base.teamId(), base.name(), base.dimension(), base.revision(), base.revisionSummary(), fromPlaner.me(),
                        base.sections(), base.members(), base.notes(), base.stores(), base.at());
        return withMe.overlay(outbox.pending(base.teamId()));
    }

    public TeamState planerState() { return fromPlaner; }
    public TeamState serverState() { return fromServer; }

    public long planerAt() { return planerAt; }
    public long serverAt() { return serverAt; }

    public List<String> rejections() { synchronized (rejections) { return List.copyOf(rejections); } }

    public TeamOutbox outbox() { return outbox; }

    // ------------------------------------------------------------------ actions

    /**
     * A team action of the player. Goes to the plugin at once when live; otherwise it waits in the outbox
     * for the plugin or for the planner (which fetches it with GET /v1/team). Returns the text for the chat.
     */
    public synchronized String act(String kind, Map<String, Object> body, String what) {
        TeamState s = state();
        if (s == null) return t("Kein Teamstand: im Planer unter „Team live“ „Mein Spiel verbinden“ klicken (ohne Server-Datei) oder im Reiter „Team“ „Mit Spiel abgleichen“.", "No team state: in the planner click “Connect my game” under “Team live” (no server file) or “Compare with game” in the “Team” tab.");
        if (s.source() == TeamState.Source.PLANER && s.me() == null)
            return t("Im Planer ist „Ich bin“ nicht gesetzt – die Mod weiß nicht, in wessen Namen sie meldet.", "“I am” is not set in the planner – the mod does not know in whose name it reports.");
        TeamOutbox.Action a;
        try { a = outbox.add(s.teamId(), kind, body); } catch (RuntimeException e) { return e.getMessage(); }
        if (link == Link.LIVE) { sendAction(a); return what + t(" – an den Server geschickt.", " – sent to the server."); }
        if (s.source() == TeamState.Source.ROOM && roomLive()) { sendToRoom(a); return what + t(" – an den Team-Raum geschickt.", " – sent to the team room."); }
        if (s.source() == TeamState.Source.ROOM) return what + t(" – wartet (" + outbox.pending().size() + "), bis der Team-Raum wieder erreichbar ist.", " – waiting (" + outbox.pending().size() + ") until the team room is reachable again.");
        String way = link == Link.ASK ? t(" Der Server hat das Plugin: J → „Teambau erlauben“ schickt es sofort.", " The server has the plugin: J → “Allow team building” sends it right away.")
                : link == Link.OFF ? "" : link == Link.WAITING ? t(" Wird geschickt, sobald der Server antwortet.", " Sent as soon as the server answers.") : "";
        return what + t(" – wartet im Ausgangskorb (" + outbox.pending().size() + "), bis Planer oder Server es abholen.", " – waiting in the outbox (" + outbox.pending().size() + ") until planner or server pick it up.") + way;
    }

    private void sendAction(TeamOutbox.Action a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("t", "act"); m.put("teamId", a.teamId()); m.put("event", a.asWire());
        inFlight.put(a.id(), clock.getAsLong());
        send(m);
    }

    /** Events for the planner (GET /v1/team): own waiting actions as planner events of "me". */
    public List<Map<String, Object>> outboxForPlaner() {
        TeamState p = fromPlaner;
        if (p == null || p.me() == null) return List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (TeamOutbox.Action a : outbox.pending(p.teamId())) out.add(a.asEvent(p.me()));
        return out;
    }

    /** POST /v1/team/ack: the planner merged these events. */
    public int ackFromPlaner(List<String> ids) { ids.forEach(inFlight::remove); return outbox.remove(ids); }

    // ------------------------------------------------------------------ team room → server plugin (LINK-11)

    /**
     * Hands the team room to the server plugin: when the planner gave this game the server key (Bauleitung) and the
     * channel with the plugin is live, the mod sends {@code link.room {link}} once per server connection and room.
     * The plugin checks OP / {@code bauplaner.team.leitung} and connects itself over the internet – nothing is
     * downloaded or copied. Runs again after the planner connects another room ({@code POST /v1/room}).
     */
    public synchronized void handOverRoom() {
        if (link != Link.LIVE || room == null) return;
        var c = room.config();
        if (c == null || c.serverLink() == null) return;
        String mark = serverKey + "|" + c.url() + "|" + c.room() + "|" + Integer.toHexString(c.serverKey().hashCode()) + (c.signKey() == null ? "" : "|" + Integer.toHexString(c.signKey().hashCode()));
        if (mark.equals(handedTo)) return;
        handedTo = mark;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("link", c.serverLink());
        if (c.teamName() != null) body.put("teamName", c.teamName());
        request("link.room", body).orTimeout(30, java.util.concurrent.TimeUnit.SECONDS).whenComplete((a, ex) -> {
            if (ex != null) {
                synchronized (this) { if (mark.equals(handedTo)) handedTo = null; }
                handoverText = "Server nicht übergeben: " + (ex.getCause() != null ? ex.getCause().getMessage() : ex.getMessage());
                return;
            }
            if (a.get("error") instanceof String e) { handoverText = "Server nicht mit dem Team-Raum verbunden: " + e; notify.accept(handoverText); return; }
            handoverText = a.get("text") instanceof String t ? t : "Server mit dem Team-Raum verbunden.";
            if (!Boolean.TRUE.equals(a.get("same"))) notify.accept("Server-Plugin: " + handoverText);
        });
    }

    /** Last answer of the plugin to the room handover (null when none happened). */
    public String handoverText() { return handoverText; }

    // ------------------------------------------------------------------ relay website ↔ plugin

    /**
     * Sends a website request to the plugin and waits for the answer (type {@code pull} or {@code push}).
     * Fails at once when the channel is not live, so the website can say why.
     */
    public CompletableFuture<Map<String, Object>> request(String type, Map<String, Object> body) {
        synchronized (this) {
            if (link != Link.LIVE) return CompletableFuture.failedFuture(new IllegalStateException(switch (link) {
                case NONE -> "Die Mod ist mit keinem Server verbunden.";
                case NO_PLUGIN -> "team-plugin-fehlt: Auf diesem Server läuft kein Build-Studio-Plugin mit Teambau.";
                case ASK -> "team-nicht-erlaubt: Im Spiel J drücken und „Teambau erlauben“ klicken.";
                case OFF -> "team-nicht-erlaubt: Der Teamkanal ist für diesen Server ausgeschaltet.";
                default -> "Die Mod wartet noch auf die erste Antwort des Plugins.";
            }));
            String req = "r" + Long.toString(clock.getAsLong(), 36) + (++partCounter);
            CompletableFuture<Map<String, Object>> f = new CompletableFuture<>();
            waiting.put(req, f);
            Map<String, Object> m = new LinkedHashMap<>(body);
            m.put("t", type); m.put("req", req);
            try { send(m); } catch (RuntimeException e) { waiting.remove(req); return CompletableFuture.failedFuture(e); }
            return f;
        }
    }

    private void failWaiting(String why) {
        waiting.values().forEach(f -> f.completeExceptionally(new IllegalStateException(why)));
        waiting.clear();
    }

    private void send(Map<String, Object> message) {
        if (transport == null || !opened || !announced) return; // the rule: nothing without announcement + permission
        for (byte[] f : TeamWire.frames(message, "p" + Long.toString(clock.getAsLong(), 36) + (++partCounter))) transport.send(f);
    }

    // ------------------------------------------------------------------ helpers

    private void saveAllowed() {
        if (dir == null) return;
        try {
            Files.createDirectories(dir);
            try (Writer w = Files.newBufferedWriter(dir.resolve("erlaubt.properties"), StandardCharsets.UTF_8)) {
                allowed.store(w, "Build-Studio-Mod: Teamkanal je Server erlaubt (ja) oder aus (nein). Löschen = wieder fragen.");
            }
        } catch (IOException ignored) { }
    }

    static String safe(String key) { return key.replaceAll("[^A-Za-z0-9._-]+", "_"); }
}
