package io.github.freadeax.bauplaner.mod.team;

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
        NONE("kein Server"),
        /** The server has no Bauplaner plugin with the team channel. */
        NO_PLUGIN("Server ohne Bauplaner-Plugin"),
        /** Plugin there, player has not allowed the channel for this server yet. */
        ASK("Plugin da – /bauplaner team erlauben"),
        /** Allowed, hello sent, waiting for the first state. */
        WAITING("verbinde …"),
        /** Live with the plugin. */
        LIVE("live mit dem Server"),
        /** Player switched it off for this server. */
        OFF("für diesen Server aus");
        public final String label;
        Link(String label) { this.label = label; }
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

    // ------------------------------------------------------------------ connection

    /** Joined a world/server ({@code key} as for placements, e.g. "server/example.org_25565"); transport null in singleplayer. */
    public synchronized void join(String key, Transport transport) {
        this.serverKey = key;
        this.transport = transport;
        announced = opened = false;
        fromServer = null;
        inFlight.clear();
        assembler.clear();
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
            else { link = Link.ASK; notify.accept("Auf diesem Server läuft das Bauplaner-Plugin mit Teambau. Live-Abgleich einschalten: /bauplaner team erlauben (einmal je Server). Bis dahin sendet die Mod nichts."); }
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
        if (serverKey == null || transport == null) return "Das geht nur auf einem Server.";
        allowed.setProperty(serverKey, yes ? "ja" : "nein");
        saveAllowed();
        if (!yes) { link = announced ? Link.OFF : Link.NO_PLUGIN; fromServer = null; return "Teamkanal für diesen Server aus. Die Mod sendet hier nichts mehr; Teamstand nur noch aus dem Planer."; }
        if (!transport.serverHasChannel()) return "Erlaubt. Dieser Server hat aber (noch) kein Bauplaner-Plugin mit Teambau – die Mod sendet erst, wenn es da ist.";
        announced = true;
        start();
        return "Teamkanal für diesen Server erlaubt. Die Mod holt den Teamstand vom Plugin.";
    }

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
                    // A fresh state answers everything that was sent before: resend what is still open.
                    for (TeamOutbox.Action a : outbox.pending()) if (!inFlight.containsKey(a.id())) sendAction(a);
                }
                case "none" -> { fromServer = null; link = Link.LIVE; lastError = m.get("text") instanceof String s ? s : "Kein Team auf diesem Server."; }
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
                        notify.accept("Nicht übernommen: " + reason);
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
        TeamState base = fromServer != null ? fromServer : fromPlaner;
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
        if (s == null) return "Kein Teamstand: im Planer im Reiter „Team“ „Mit Spiel abgleichen“ wählen, oder auf einem Server mit Bauplaner-Plugin spielen.";
        if (s.source() == TeamState.Source.PLANER && s.me() == null)
            return "Im Planer ist „Ich bin“ nicht gesetzt – die Mod weiß nicht, in wessen Namen sie meldet.";
        TeamOutbox.Action a;
        try { a = outbox.add(s.teamId(), kind, body); } catch (RuntimeException e) { return e.getMessage(); }
        if (link == Link.LIVE) { sendAction(a); return what + " – an den Server geschickt."; }
        String way = link == Link.ASK ? " Der Server hat das Plugin: /bauplaner team erlauben schickt es sofort."
                : link == Link.OFF ? "" : link == Link.WAITING ? " Wird geschickt, sobald der Server antwortet." : "";
        return what + " – wartet im Ausgangskorb (" + outbox.pending().size() + "), bis Planer oder Server es abholen." + way;
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

    // ------------------------------------------------------------------ relay website ↔ plugin

    /**
     * Sends a website request to the plugin and waits for the answer (type {@code pull} or {@code push}).
     * Fails at once when the channel is not live, so the website can say why.
     */
    public CompletableFuture<Map<String, Object>> request(String type, Map<String, Object> body) {
        synchronized (this) {
            if (link != Link.LIVE) return CompletableFuture.failedFuture(new IllegalStateException(switch (link) {
                case NONE -> "Die Mod ist mit keinem Server verbunden.";
                case NO_PLUGIN -> "team-plugin-fehlt: Auf diesem Server läuft kein Bauplaner-Plugin mit Teambau.";
                case ASK -> "team-nicht-erlaubt: Im Spiel /bauplaner team erlauben eingeben.";
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
                allowed.store(w, "Bauplaner-Mod: Teamkanal je Server erlaubt (ja) oder aus (nein). Löschen = wieder fragen.");
            }
        } catch (IOException ignored) { }
    }

    static String safe(String key) { return key.replaceAll("[^A-Za-z0-9._-]+", "_"); }
}
