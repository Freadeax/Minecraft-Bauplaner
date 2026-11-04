package io.github.freadeax.bauplaner.mod.room;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.github.freadeax.bauplaner.mod.live.Json;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

/**
 * LINK-07 „ohne Server-Datei“: the mod talks to the team room itself (docs/architecture/AUTO_LINK.md §9).
 * It reads the plan header and the team log, folds them with the plugin's {@link TeamLog}, sends the player's
 * own team actions as events and its presence („im Spiel“, section). The Minecraft server is not involved:
 * nothing goes to it, it needs no plugin.
 * <p>
 * The room comes from the planner (POST /v1/room after the player clicked „Mein Spiel verbinden“) and is kept
 * in {@code bauplaner/team/raum.json} on this computer only. The member key never appears in a log line.
 */
public final class RoomClient {
    /** Where the room is and who this player is in the team. */
    public record Config(String url, String room, String key, String member, String memberName, String teamName, String device) {
        public Map<String, Object> publicFields() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("url", url); m.put("room", room); m.put("member", member);
            if (memberName != null) m.put("memberName", memberName);
            if (teamName != null) m.put("teamName", teamName);
            return m;
        }
    }

    /** What the player sees. */
    public enum Status {
        OFF("kein Team-Raum"), CONNECTING("verbinde mit dem Team-Raum …"), LIVE("live über den Team-Raum"),
        RETRY("Team-Raum nicht erreichbar – neuer Versuch"), REFUSED("Team-Raum lehnt den Schlüssel ab – im Planer neu verbinden");
        public final String label;
        Status(String label) { this.label = label; }
    }

    /** A member seen in the room right now (planner, game, server). */
    public record Presence(String member, String where, String section, String player, int[] pos, String dim) {}

    /** A request from the planner for a fresh recording (projectId null: whatever plan is placed). */
    public record Ask(String from, String projectId, String id) {}

    private static final int MAX_FRAME = 4 * 1024 * 1024;

    private final Path file;
    private final Consumer<String> notify;
    private final ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor(r -> { Thread t = new Thread(r, "Bauplaner-Team-Raum"); t.setDaemon(true); return t; });
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private Config config;
    private volatile Status status = Status.OFF;
    private volatile String lastError;
    private WebSocket ws;
    private ScheduledFuture<?> retry, ping;
    private int attempts;
    private long generation;
    private JsonObject header;
    private final List<JsonObject> events = new ArrayList<>();
    private String cursor = "";
    private TeamLog log;
    private Map<String, Object> state;
    private boolean dirty = true;
    private volatile List<Presence> presence = List.of();
    private String section;
    /** Answers to own appends: accepted or known ids; rejected id with reason. */
    private Consumer<List<String>> onAck = ids -> { };
    private BiConsumer<String, String> onReject = (id, why) -> { };
    private Runnable onChange = () -> { };
    private Consumer<Ask> onAsk = a -> { };
    private String player;
    private int[] lastPos;
    private String lastDim;
    private long lastPosAt;

    /** @param file {@code bauplaner/team/raum.json} (null: nothing is stored, for tests) */
    public RoomClient(Path file, Consumer<String> notify) {
        this.file = file;
        this.notify = notify;
        if (file != null && Files.isRegularFile(file)) {
            try { config = parse(Json.obj(Json.parse(Files.readString(file, StandardCharsets.UTF_8)), "Team-Raum")); }
            catch (IOException | RuntimeException e) { lastError = "raum.json nicht lesbar: " + e.getMessage(); }
        }
    }

    public void listen(Consumer<List<String>> ack, BiConsumer<String, String> reject, Runnable change) { onAck = ack; onReject = reject; onChange = change; }

    /** Requests for a recording from the planer („Aufnahme anfordern“), called on the room thread. */
    public void onAsk(Consumer<Ask> handler) { onAsk = handler; }

    // ------------------------------------------------------------------ config

    /** Checks a room sent by the planner: https (or http for 127.0.0.1 in tests), room id, key, member. */
    public static Config parse(Map<String, Object> m) {
        String url = Json.str(m.get("url"), "Adresse", 300).replaceAll("/+$", "");
        URI u = URI.create(url);
        boolean local = "http".equals(u.getScheme()) && ("127.0.0.1".equals(u.getHost()) || "localhost".equals(u.getHost()));
        if (!"https".equals(u.getScheme()) && !local) throw new IllegalArgumentException("Der Team-Raum muss über https erreichbar sein.");
        String room = Json.str(m.get("room"), "Raum", 80);
        if (!room.matches("[A-Za-z0-9_-]{4,80}")) throw new IllegalArgumentException("Ungültige Raum-ID.");
        String key = Json.str(m.get("key"), "Schlüssel", 200);
        String member = Json.str(m.get("member"), "Mitglied", 64);
        String memberName = m.get("memberName") instanceof String s ? s.substring(0, Math.min(60, s.length())) : null;
        String teamName = m.get("teamName") instanceof String s ? s.substring(0, Math.min(80, s.length())) : null;
        String device = m.get("device") instanceof String s ? s.substring(0, Math.min(64, s.length())) : "Minecraft";
        return new Config(url, room, key, member, memberName, teamName, device);
    }

    public synchronized Config config() { return config; }

    /** Uses this room from now on (stored) and connects. */
    public synchronized void use(Config c) throws IOException {
        config = c;
        if (file != null) {
            Files.createDirectories(file.getParent());
            Map<String, Object> m = new LinkedHashMap<>(c.publicFields());
            m.put("key", c.key()); m.put("device", c.device());
            Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.writeString(tmp, Json.write(m), StandardCharsets.UTF_8);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        }
        reset();
        connect();
    }

    /** Forgets the room (planner „Spiel trennen“). */
    public synchronized void forget() {
        config = null;
        stop();
        reset();
        if (file != null) { try { Files.deleteIfExists(file); } catch (IOException ignored) { } }
        status = Status.OFF;
    }

    private void reset() { header = null; events.clear(); cursor = ""; log = null; state = null; dirty = true; presence = List.of(); }

    // ------------------------------------------------------------------ connection

    /** Starts the connection when a room is configured (idempotent). */
    public synchronized void connect() {
        if (config == null || ws != null || status == Status.REFUSED) return;
        stop();
        long gen = ++generation;
        status = Status.CONNECTING;
        Config c = config;
        fetchHeader(c).thenCompose(h -> {
            synchronized (this) { if (gen != generation) return CompletableFuture.completedFuture(null); setHeader(h); }
            String wsUrl = c.url().replaceFirst("^http", "ws") + "/v1/rooms/" + c.room() + "/live";
            return http.newWebSocketBuilder().connectTimeout(Duration.ofSeconds(10)).buildAsync(URI.create(wsUrl), new Listener(gen));
        }).whenComplete((socket, ex) -> {
            synchronized (this) {
                if (gen != generation) { if (socket != null) socket.abort(); return; }
                if (ex != null) { failed(reason(ex), unwrap(ex) instanceof Refused); return; }
                if (socket == null) return;
                ws = socket;
                Map<String, Object> hello = new LinkedHashMap<>();
                hello.put("type", "hello"); hello.put("key", c.key()); hello.put("member", c.member()); hello.put("device", c.device());
                hello.put("where", "spiel"); hello.put("after", cursor);
                if (section != null) hello.put("section", section);
                if (player != null) hello.put("player", player);
                if (lastPos != null) hello.put("pos", posMap(lastPos, lastDim, null));
                send(hello);
                ping = timer.scheduleAtFixedRate(() -> { synchronized (this) { if (ws != null) send(Map.of("type", "ping")); } }, 30, 30, TimeUnit.SECONDS);
            }
        });
    }

    private CompletableFuture<JsonObject> fetchHeader(Config c) {
        HttpRequest req = HttpRequest.newBuilder(URI.create(c.url() + "/v1/rooms/" + c.room() + "/header")).timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + c.key()).header("Accept", "application/json").GET().build();
        return http.sendAsync(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).thenApply(res -> {
            if (res.statusCode() == 401 || res.statusCode() == 403) throw new Refused("Schlüssel ungültig oder erneuert (" + res.statusCode() + ")");
            if (res.statusCode() == 404) throw new IllegalStateException("Im Raum liegt noch kein Planstand – die Bauleitung schaltet im Planer „Live“.");
            if (res.statusCode() != 200) throw new IllegalStateException("Team-Raum antwortet " + res.statusCode());
            JsonObject h = JsonParser.parseString(res.body()).getAsJsonObject();
            h.remove("plan");
            h.add("events", new JsonArray());
            new TeamLog(h); // same checks as a team server file
            return h;
        });
    }

    private void setHeader(JsonObject h) { header = h; log = null; dirty = true; }

    private void stop() {
        generation++;
        if (retry != null) { retry.cancel(false); retry = null; }
        if (ping != null) { ping.cancel(false); ping = null; }
        if (ws != null) { try { ws.sendClose(WebSocket.NORMAL_CLOSURE, "aus"); } catch (RuntimeException ignored) { } ws = null; }
    }

    private void failed(String why, boolean refused) {
        if (ping != null) { ping.cancel(false); ping = null; }
        ws = null;
        lastError = why;
        presence = List.of();
        if (refused) { status = Status.REFUSED; notify.accept("Team-Raum: " + why + ". Im Planer unter „Team live“ das Spiel neu verbinden."); onChange.run(); return; }
        boolean wasLive = status == Status.LIVE;
        status = Status.RETRY;
        if (wasLive) notify.accept("Verbindung zum Team-Raum verloren – die Mod versucht es weiter. Eigene Meldungen warten so lange.");
        long wait = Math.min(60, 2L << Math.min(attempts++, 5));
        long gen = generation;
        retry = timer.schedule(() -> { synchronized (this) { if (gen == generation && config != null) connect(); } }, wait, TimeUnit.SECONDS);
        onChange.run();
    }

    private static Throwable unwrap(Throwable ex) {
        Throwable t = ex;
        while (t.getCause() != null && (t instanceof java.util.concurrent.CompletionException || t instanceof java.util.concurrent.ExecutionException)) t = t.getCause();
        return t;
    }

    private static String reason(Throwable ex) {
        Throwable t = unwrap(ex);
        return t.getMessage() == null ? t.getClass().getSimpleName() : t.getMessage();
    }

    private static final class Refused extends RuntimeException { Refused(String m) { super(m); } }

    private final class Listener implements WebSocket.Listener {
        private final long gen;
        private final StringBuilder text = new StringBuilder();
        Listener(long gen) { this.gen = gen; }

        @Override public CompletionStage<?> onText(WebSocket w, CharSequence data, boolean last) {
            text.append(data);
            if (text.length() > MAX_FRAME) { text.setLength(0); w.abort(); }
            else if (last) { String t = text.toString(); text.setLength(0); receive(gen, t); }
            w.request(1);
            return null;
        }

        @Override public CompletionStage<?> onClose(WebSocket w, int code, String why) {
            synchronized (RoomClient.this) { if (gen == generation) failed(code == 4401 || code == 4403 ? "Schlüssel ungültig oder erneuert" : "getrennt (" + code + ")", code == 4401 || code == 4403); }
            return null;
        }

        @Override public void onError(WebSocket w, Throwable error) {
            synchronized (RoomClient.this) { if (gen == generation) failed(reason(error), false); }
        }
    }

    private synchronized void receive(long gen, String raw) {
        if (gen != generation) return;
        JsonObject m;
        try { m = JsonParser.parseString(raw).getAsJsonObject(); } catch (RuntimeException e) { return; }
        String type = TeamLog.str(m, "type");
        if (type == null) return;
        switch (type) {
            case "welcome" -> {
                boolean first = status != Status.LIVE;
                status = Status.LIVE; attempts = 0; lastError = null;
                if (first) notify.accept("Team live über den Team-Raum" + (config.teamName() != null ? " „" + config.teamName() + "“" : "") + " – ohne Server-Datei.");
                onChange.run();
            }
            case "events" -> {
                for (JsonElement e : TeamLog.array(m, "events")) {
                    if (!e.isJsonObject()) continue;
                    events.add(e.getAsJsonObject());
                    if (log != null) { try { log.add(e.getAsJsonObject()); } catch (RuntimeException ignored) { } }
                }
                String c = TeamLog.str(m, "cursor");
                if (c != null) cursor = c;
                dirty = true;
                onChange.run();
            }
            case "header" -> {
                Config c = config;
                long g = generation;
                fetchHeader(c).whenComplete((h, ex) -> { synchronized (this) { if (g == generation && h != null) { setHeader(h); onChange.run(); } } });
            }
            case "presence" -> {
                List<Presence> list = new ArrayList<>();
                for (JsonElement e : TeamLog.array(m, "members")) {
                    if (!e.isJsonObject() || list.size() >= 200) continue;
                    JsonObject p = e.getAsJsonObject();
                    int[] pos = null; String dim = null;
                    if (p.has("pos") && p.get("pos").isJsonObject()) {
                        JsonObject q = p.getAsJsonObject("pos");
                        try { pos = new int[] { q.get("x").getAsInt(), q.get("y").getAsInt(), q.get("z").getAsInt() }; dim = TeamLog.str(q, "dim"); } catch (RuntimeException ignored) { pos = null; }
                    }
                    list.add(new Presence(TeamLog.str(p, "member"), TeamLog.str(p, "where"), TeamLog.str(p, "section"), TeamLog.str(p, "player"), pos, dim));
                }
                presence = List.copyOf(list);
            }
            case "appended" -> {
                List<String> ok = new ArrayList<>();
                for (JsonElement e : TeamLog.array(m, "accepted")) ok.add(e.getAsString());
                for (JsonElement e : TeamLog.array(m, "known")) ok.add(e.getAsString());
                if (!ok.isEmpty()) onAck.accept(ok);
                for (JsonElement e : TeamLog.array(m, "rejected")) {
                    JsonObject r = e.getAsJsonObject();
                    onReject.accept(TeamLog.str(r, "id"), TeamLog.str(r, "reason"));
                }
            }
            case "ask" -> {
                if ("scan".equals(TeamLog.str(m, "what"))) {
                    Ask a = new Ask(TeamLog.str(m, "from"), TeamLog.str(m, "projectId"), TeamLog.str(m, "id"));
                    try { onAsk.accept(a); } catch (RuntimeException e) { lastError = "Aufnahme anfordern: " + e.getMessage(); }
                }
            }
            case "error" -> lastError = "Team-Raum: " + java.util.Optional.ofNullable(TeamLog.str(m, "message")).orElse(TeamLog.str(m, "error"));
            default -> { }
        }
    }

    private void send(Map<String, Object> m) {
        WebSocket w = ws;
        if (w == null) return;
        try { w.sendText(Json.write(m), true); } catch (RuntimeException e) { lastError = "Senden: " + e.getMessage(); }
    }

    // ------------------------------------------------------------------ use

    public Status status() { return status; }
    public String lastError() { return lastError; }
    public List<Presence> presence() { return presence; }
    public synchronized int events() { return events.size(); }

    /** The folded state for the game (team-link format) or null while there is none. */
    public synchronized Map<String, Object> state() {
        if (header == null || config == null) return null;
        if (dirty || state == null) {
            try {
                if (log == null) {
                    log = new TeamLog(header);
                    for (JsonObject e : events) { try { log.add(e); } catch (RuntimeException ignored) { } }
                }
                state = RoomState.of(log, log.view(), config.member());
            } catch (RuntimeException e) {
                lastError = "Teamstand aus dem Raum: " + e.getMessage();
                state = null;
            }
            dirty = false;
        }
        return state;
    }

    /** Whether own team actions can go to the room right now. */
    public boolean live() { return status == Status.LIVE; }

    /** Sends own team events (already in event form with {@code by}); false when not live. */
    public synchronized boolean append(String batch, List<Map<String, Object>> list) {
        if (status != Status.LIVE || ws == null || list.isEmpty()) return false;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "append"); m.put("batch", batch); m.put("events", new ArrayList<Object>(list));
        send(m);
        return true;
    }

    /** Presence: the section the player stands in (null: none); sent only when it changes. */
    public synchronized void section(String id) {
        if (java.util.Objects.equals(id, section)) return;
        section = id;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "presence"); m.put("where", "spiel");
        if (id != null) m.put("section", id);
        send(m);
    }

    /** Minecraft name of the player (shown next to the position on the live map). */
    public synchronized void player(String name) { if (name != null && name.matches("[A-Za-z0-9_]{1,16}")) player = name; }

    private static Map<String, Object> posMap(int[] p, String dim, Double yaw) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("x", p[0]); m.put("y", p[1]); m.put("z", p[2]); m.put("dim", dim == null ? "minecraft:overworld" : dim);
        if (yaw != null) m.put("yaw", Math.round(yaw));
        return m;
    }

    /**
     * Position for the live map of the team (LINK-07): sent at most every 2 s and only after moving at least
     * two blocks or changing the dimension; nothing while not live.
     */
    public synchronized boolean position(int x, int y, int z, String dim, double yaw, long now) {
        if (status != Status.LIVE || ws == null) { lastPos = new int[] { x, y, z }; lastDim = dim; return false; }
        boolean moved = lastPos == null || !java.util.Objects.equals(dim, lastDim) || Math.abs(x - lastPos[0]) + Math.abs(y - lastPos[1]) + Math.abs(z - lastPos[2]) >= 2;
        if (!moved || now - lastPosAt < 2000) return false;
        lastPos = new int[] { x, y, z }; lastDim = dim; lastPosAt = now;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "presence"); m.put("where", "spiel");
        if (section != null) m.put("section", section);
        if (player != null) m.put("player", player);
        m.put("pos", posMap(lastPos, dim, yaw));
        send(m);
        return true;
    }

    /**
     * Uploads a recording of the player's loaded chunks into the room (LINK-07; PUT …/scans/{id}). Runs on the
     * caller's thread; returns the room's description of the file.
     */
    public Map<String, Object> uploadScan(String fileName, byte[] bytes, String projectId, Integer revision) throws IOException, InterruptedException {
        Config c;
        synchronized (this) { c = config; }
        if (c == null) throw new IllegalStateException("Kein Team-Raum verbunden.");
        String id = "scan_" + Long.toString(System.currentTimeMillis(), 36) + Integer.toString((int) (Math.random() * 46656), 36);
        StringBuilder q = new StringBuilder("?file=").append(java.net.URLEncoder.encode(fileName, StandardCharsets.UTF_8)).append("&by=").append(java.net.URLEncoder.encode(c.member(), StandardCharsets.UTF_8));
        if (projectId != null) q.append("&project=").append(java.net.URLEncoder.encode(projectId, StandardCharsets.UTF_8));
        if (revision != null) q.append("&revision=").append(revision);
        HttpRequest req = HttpRequest.newBuilder(URI.create(c.url() + "/v1/rooms/" + c.room() + "/scans/" + id + q)).timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + c.key()).header("Content-Type", "application/octet-stream").PUT(HttpRequest.BodyPublishers.ofByteArray(bytes)).build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (res.statusCode() != 200) {
            String why;
            try { why = TeamLog.str(JsonParser.parseString(res.body()).getAsJsonObject(), "message"); } catch (RuntimeException e) { why = null; }
            throw new IOException(why != null ? why : "Team-Raum antwortet " + res.statusCode());
        }
        return Json.obj(Json.parse(res.body()), "Aufnahme");
    }

    /**
     * Sends a report the game measured itself (section.seen, store.seen; unverified, origin planer) straight to the
     * room – no outbox: a newer report replaces it anyway. False when not live or no member.
     */
    public synchronized boolean report(String kind, Map<String, Object> body) {
        if (status != Status.LIVE || ws == null || config == null) return false;
        Map<String, Object> e = new LinkedHashMap<>();
        String id = "tev_" + Long.toString(System.currentTimeMillis(), 36) + Integer.toString((int) (Math.random() * 1_679_616), 36);
        e.put("id", id); e.put("at", io.github.freadeax.bauplaner.mod.team.TeamWire.time(java.time.Instant.now())); e.put("by", config.member()); e.put("origin", "planer"); e.put("kind", kind);
        e.putAll(body);
        return append("b_" + id, List.of(e));
    }

    /** Stops everything (game closes). */
    public synchronized void close() { stop(); timer.shutdownNow(); }
}
