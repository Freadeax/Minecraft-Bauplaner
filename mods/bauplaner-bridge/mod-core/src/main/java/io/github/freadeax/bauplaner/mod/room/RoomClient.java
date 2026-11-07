package io.github.freadeax.bauplaner.mod.room;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.live.WsQueue;
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
 * LINK-07 „ohne Server-Datei“: the mod talks to the team room itself (docs/architecture/team/AUTO_LINK.md §9).
 * It reads the plan header and the team log, folds them with the plugin's {@link TeamLog}, sends the player's
 * own team actions as events and its presence („im Spiel“, section). The Minecraft server is not involved:
 * nothing goes to it, it needs no plugin.
 * <p>
 * The room comes from the planner (POST /v1/room after the player clicked „Mein Spiel verbinden“) and is kept
 * in {@code bauplaner/team/raum.json} on this computer only. The member key never appears in a log line.
 */
public final class RoomClient {
    /** Where the room is and who this player is in the team. */
    /**
     * @param serverKey LINK-11: only for the Bauleitung – the room's server key, handed to the server plugin over the team
     *                  channel ({@code link.room}) so the server joins the room by itself. Stored like the key, never shown.
     * @param signKey   GAME-06: only for the Bauleitung – its signing key (derived from the admin key in the planner). The mod
     *                  signs its own events with it and hands it to the server plugin with the server link ({@code l}).
     */
    public record Config(String url, String room, String key, String member, String memberName, String teamName, String device, String serverKey, String signKey) {
        public Config(String url, String room, String key, String member, String memberName, String teamName, String device) {
            this(url, room, key, member, memberName, teamName, device, null, null);
        }
        public Config(String url, String room, String key, String member, String memberName, String teamName, String device, String serverKey) {
            this(url, room, key, member, memberName, teamName, device, serverKey, null);
        }
        public Map<String, Object> publicFields() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("url", url); m.put("room", room); m.put("member", member);
            if (memberName != null) m.put("memberName", memberName);
            if (teamName != null) m.put("teamName", teamName);
            if (serverKey != null) m.put("serverHandover", true);
            return m;
        }
        /** The server link the plugin reads ({@code RoomLink.parse}): {@code …?raum=URL&id=RID&s=KEY}; null without server key. */
        public String serverLink() {
            if (serverKey == null) return null;
            java.util.function.Function<String, String> enc = v -> java.net.URLEncoder.encode(v, StandardCharsets.UTF_8);
            return url + "/#/team/beitreten?raum=" + enc.apply(url) + "&id=" + enc.apply(room) + "&s=" + enc.apply(serverKey) + (signKey == null ? "" : "&l=" + enc.apply(signKey));
        }
    }

    /** What the player sees. */
    public enum Status {
        OFF("kein Team-Raum", "no team room"), CONNECTING("verbinde mit dem Team-Raum …", "connecting to the team room …"), LIVE("live über den Team-Raum", "live via the team room"),
        /** FALLBACK-01: the WebSocket is blocked (proxy, firewall), plain HTTP works – poll and post. */
        POLL("live über HTTP (WebSocket gesperrt) – Abgleich alle paar Sekunden", "live via HTTP (WebSocket blocked) – sync every few seconds"),
        RETRY("Team-Raum nicht erreichbar – neuer Versuch", "team room unreachable – retrying"), REFUSED("Team-Raum lehnt den Schlüssel ab – im Planer neu verbinden", "team room refuses the key – reconnect in the planner");
        /** German label (also sent to the website). */
        public final String label;
        private final String en;
        Status(String label, String en) { this.label = label; this.en = en; }
        public String text() { return io.github.freadeax.bauplaner.mod.Lang.t(label, en); }
    }

    /** A member seen in the room right now (planner, game, server). */
    public record Presence(String member, String where, String section, String player, int[] pos, String dim) {}

    /** A request from the planner for a fresh recording (projectId null: whatever plan is placed). */
    public record Ask(String from, String projectId, String id) {}

    private static final int MAX_FRAME = 4 * 1024 * 1024;
    /** FALLBACK-01: the stored room state is skipped above this size (the room then sends everything again). */
    static final int MAX_CACHE = 24 * 1024 * 1024;
    /** At most this many unsent own measurements (section.seen/store.seen) wait while the room is away. */
    static final int MAX_REPORTS = 64;
    /** Older waiting measurements are dropped: nobody needs a chest content from yesterday. */
    static final long REPORT_TTL_MS = 24L * 3600 * 1000;
    /** WebSocket failures (while HTTP works) before the mod switches to polling. */
    static final int WS_FAILS_FOR_POLL = 2;
    /** Poll pause in normal operation, shortly after an own append and between WebSocket probes. */
    static long pollEveryMs = 5_000, pollSoonMs = 1_000, probeEveryMs = 5 * 60_000, welcomeTimeoutMs = 15_000;
    /** While polling: own measurements without an answer this long go out again (same ids, the room answers "known"). */
    static long resendAfterMs = 10_000;

    private final Path file;
    /** {@code raum-stand.json} next to {@code raum.json}: header, events and cursor of the last contact. */
    private final Path cacheFile;
    private final Consumer<String> notify;
    private final ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor(r -> { Thread t = new Thread(r, "Build-Studio-Team-Raum"); t.setDaemon(true); return t; });
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private Config config;
    private volatile Status status = Status.OFF;
    private volatile String lastError;
    private WebSocket ws;
    /** Frames over {@link #ws} strictly one after the other (the JDK socket fails a second outstanding send). */
    private WsQueue out;
    private ScheduledFuture<?> retry, ping, poll, save, welcomeWait;
    private int attempts;
    /** FALLBACK-01: polling instead of a WebSocket; WebSocket failures in a row while HTTP worked. */
    private boolean polling;
    private int wsFails;
    private long headerGen = -1, welcomedGen = -1, probeAt, lastAppendAt;
    /** When the shown state was last confirmed by the room (ms, 0 = never); from the stored state after a restart. */
    private volatile long syncedAt;
    private final java.util.Set<String> eventIds = new java.util.HashSet<>();
    /** Own measurements that could not go out yet, newest per section/chest. */
    private final LinkedHashMap<String, Map<String, Object>> reports = new LinkedHashMap<>();
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
    /** WORLD-SHARE-01: shared documents of the team this client follows (name → handler with the {@code doc} part). */
    private final Map<String, Consumer<JsonObject>> docHandlers = new LinkedHashMap<>();
    /** Revision of each followed document this client has handed on (0 = none yet). */
    private final Map<String, Integer> docRevs = new java.util.HashMap<>();
    private final java.util.Set<String> docLoading = new java.util.HashSet<>();
    /** Largest shared document (room limit). */
    static final int MAX_DOC = 4 * 1024 * 1024;
    /** While polling, shared documents are asked for this often. */
    static long docPollEveryMs = 15_000;
    private long docPollAt;
    private String player;
    /**
     * PRIV-01: what this player shares with the room, chosen in the planner (stored in raum.json). Position: the live
     * position for „Gerade da“ and the live map. Scans: recordings when someone in the team asks for one. Both on for
     * rooms stored before 0.28.0 (unchanged behaviour); an own {@code /bauplaner team aufnahme} always works.
     */
    private boolean sharePos = true, shareScans = true;
    private int[] lastPos;
    private String lastDim;
    private long lastPosAt;

    /** @param file {@code bauplaner/team/raum.json} (null: nothing is stored, for tests) */
    public RoomClient(Path file, Consumer<String> notify) {
        this.file = file;
        this.cacheFile = file == null ? null : file.resolveSibling("raum-stand.json");
        this.notify = notify;
        if (file != null && Files.isRegularFile(file)) {
            try {
                Map<String, Object> stored = Json.obj(Json.parse(Files.readString(file, StandardCharsets.UTF_8)), "Team-Raum");
                config = parse(stored);
                if (stored.get("teilen") instanceof Map<?, ?> t) { sharePos = !Boolean.FALSE.equals(t.get("position")); shareScans = !Boolean.FALSE.equals(t.get("aufnahmen")); }
            }
            catch (IOException | RuntimeException e) { lastError = "raum.json nicht lesbar: " + e.getMessage(); }
        }
        if (config != null) loadCache();
    }

    public void listen(Consumer<List<String>> ack, BiConsumer<String, String> reject, Runnable change) { onAck = ack; onReject = reject; onChange = change; }

    /** Requests for a recording from the planer („Aufnahme anfordern“), called on the room thread. */
    public void onAsk(Consumer<Ask> handler) { onAsk = handler; }

    /**
     * WORLD-SHARE-01: follow a shared document of the team ({@code weltplan}: the Weltplan with sites, groups
     * and locks). The handler gets the document whenever a newer revision is in the room – after connecting,
     * on the room's {@code doc} push and, while polling, with every poll. Runs on the client's own thread.
     */
    public synchronized void onDoc(String name, Consumer<JsonObject> handler) { docHandlers.put(name, handler); }

    /** Revision of a followed document last handed on (0 = none). */
    public synchronized int docRev(String name) { return docRevs.getOrDefault(name, 0); }

    private void checkDocs(JsonObject revs) {
        for (String name : docHandlers.keySet()) {
            Integer rev = null;
            if (revs != null && revs.has(name) && revs.get(name).isJsonPrimitive()) { try { rev = revs.get(name).getAsInt(); } catch (RuntimeException ignored) { } }
            if (revs == null || (rev != null && rev != docRevs.getOrDefault(name, 0))) fetchDoc(name);
        }
    }

    /** GET …/doc/NAME?known=REV; a newer document goes to its handler. */
    private void fetchDoc(String name) {
        Config c = config;
        if (c == null || !docLoading.add(name)) return;
        long gen = generation;
        int known = docRevs.getOrDefault(name, 0);
        HttpRequest req = HttpRequest.newBuilder(URI.create(c.url() + "/v1/rooms/" + c.room() + "/doc/" + name + (known > 0 ? "?known=" + known : "")))
                .timeout(Duration.ofSeconds(30)).header("Authorization", "Bearer " + c.key()).header("Accept", "application/json").GET().build();
        http.sendAsync(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).whenComplete((res, ex) -> {
            Consumer<JsonObject> handler;
            JsonObject doc = null;
            synchronized (this) {
                docLoading.remove(name);
                if (gen != generation || ex != null || res.statusCode() != 200 || res.body().length() > MAX_DOC) return;
                try {
                    JsonObject m = JsonParser.parseString(res.body()).getAsJsonObject();
                    int rev = m.get("rev").getAsInt();
                    if (m.has("unchanged") || rev == docRevs.getOrDefault(name, 0) || !m.has("doc") || !m.get("doc").isJsonObject()) return;
                    docRevs.put(name, rev);
                    doc = m.getAsJsonObject("doc");
                } catch (RuntimeException e) { lastError = "Team-Raum: Dokument „" + name + "“ nicht lesbar"; return; }
                handler = docHandlers.get(name);
            }
            if (handler != null) {
                try { handler.accept(doc); } catch (RuntimeException e) { synchronized (this) { lastError = "Team-Raum: „" + name + "“ nicht übernommen: " + e.getMessage(); } }
            }
        });
    }

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
        String serverKey = m.get("serverKey") instanceof String s && !s.isBlank() ? Json.str(s, "Serverschlüssel", 200) : null;
        String signKey = m.get("signKey") instanceof String s && s.matches(io.github.freadeax.bauplaner.mod.team.EventSig.KEY_PATTERN) ? s : null;
        return new Config(url, room, key, member, memberName, teamName, device, serverKey, signKey);
    }

    public synchronized Config config() { return config; }

    /** Uses this room from now on (stored) and connects. */
    public synchronized void use(Config c) throws IOException {
        boolean same = config != null && config.url().equals(c.url()) && config.room().equals(c.room()) && config.member().equals(c.member());
        config = c;
        if (file != null) {
            Files.createDirectories(file.getParent());
            Map<String, Object> m = new LinkedHashMap<>(c.publicFields());
            m.put("key", c.key()); m.put("device", c.device());
            if (c.serverKey() != null) m.put("serverKey", c.serverKey());
            if (c.signKey() != null) m.put("signKey", c.signKey());
            m.put("teilen", shareFields());
            Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.writeString(tmp, Json.write(m), StandardCharsets.UTF_8);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        }
        // Same room again (new key, other name): keep what is known, the room only sends the rest.
        stop();
        if (!same) reset();
        if (status == Status.REFUSED) status = Status.OFF;
        connect();
    }

    /** PRIV-01: {position, aufnahmen} as stored in raum.json and shown to the planner. */
    public synchronized Map<String, Object> shareFields() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("position", sharePos); m.put("aufnahmen", shareScans);
        return m;
    }
    public synchronized boolean sharesPosition() { return sharePos; }
    public synchronized boolean sharesScans() { return shareScans; }

    /**
     * PRIV-01: the planner sets what this game shares (null: keep). Switching the position off takes it out of the
     * room's presence right away (an empty {@code pos}); the setting is stored with the room.
     */
    public synchronized void share(Boolean position, Boolean scans) throws IOException {
        boolean posOff = Boolean.FALSE.equals(position) && sharePos;
        if (position != null) sharePos = position;
        if (scans != null) shareScans = scans;
        if (posOff) {
            Map<String, Object> m = new LinkedHashMap<>();
            // An empty position replaces the last one in the room (it keeps presence fields it is not sent again) and is dropped there.
            m.put("type", "presence"); m.put("where", "spiel"); m.put("pos", new LinkedHashMap<String, Object>());
            if (section != null) m.put("section", section);
            send(m);
        }
        if (config != null && file != null && Files.isRegularFile(file)) {
            Map<String, Object> m = new LinkedHashMap<>(Json.obj(Json.parse(Files.readString(file, StandardCharsets.UTF_8)), "Team-Raum"));
            m.put("teilen", shareFields());
            Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.writeString(tmp, Json.write(m), StandardCharsets.UTF_8);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        }
    }

    /** Forgets the room (planner „Spiel trennen“). */
    public synchronized void forget() {
        config = null;
        stop();
        reset();
        if (file != null) { try { Files.deleteIfExists(file); } catch (IOException ignored) { } }
        status = Status.OFF;
    }

    private void reset() {
        header = null; events.clear(); eventIds.clear(); cursor = ""; log = null; state = null; dirty = true; presence = List.of();
        reports.clear(); syncedAt = 0; polling = false; wsFails = 0; docRevs.clear();
        if (cacheFile != null) { try { Files.deleteIfExists(cacheFile); } catch (IOException ignored) { } }
    }

    // ------------------------------------------------------------------ connection

    /** Starts the connection when a room is configured (idempotent). */
    public synchronized void connect() {
        if (config == null || ws != null || status == Status.REFUSED) return;
        stop();
        long gen = ++generation;
        status = Status.CONNECTING;
        Config c = config;
        fetchHeader(c).thenCompose(h -> {
            synchronized (this) { if (gen != generation) return CompletableFuture.completedFuture(null); setHeader(h); headerGen = gen; }
            String wsUrl = c.url().replaceFirst("^http", "ws") + "/v1/rooms/" + c.room() + "/live";
            return http.newWebSocketBuilder().connectTimeout(Duration.ofSeconds(10)).buildAsync(URI.create(wsUrl), new Listener(gen));
        }).whenComplete((socket, ex) -> {
            synchronized (this) {
                if (gen != generation) { if (socket != null) socket.abort(); return; }
                if (ex != null) { failed(reason(ex), unwrap(ex) instanceof Refused, headerGen == gen); return; }
                if (socket == null) return;
                ws = socket;
                out = new WsQueue(socket, ex2 -> timer.execute(() -> { synchronized (this) {
                    if (gen == generation && ws == socket) { ws = null; out = null; socket.abort(); failed("Senden: " + reason(ex2), false, welcomedGen != gen); }
                } }));
                // A proxy may accept the upgrade and then swallow everything: no welcome in time counts as a WebSocket failure.
                welcomeWait = timer.schedule(() -> { synchronized (this) {
                    if (gen == generation && welcomedGen != gen && ws != null) { WebSocket w = ws; ws = null; out = null; w.abort(); failed("keine Antwort über den WebSocket", false, true); }
                } }, welcomeTimeoutMs, TimeUnit.MILLISECONDS);
                Map<String, Object> hello = new LinkedHashMap<>();
                hello.put("type", "hello"); hello.put("key", c.key()); hello.put("member", c.member()); hello.put("device", c.device());
                hello.put("where", "spiel"); hello.put("after", cursor);
                if (section != null) hello.put("section", section);
                if (player != null) hello.put("player", player);
                if (lastPos != null && sharePos) hello.put("pos", posMap(lastPos, lastDim, null));
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

    private void setHeader(JsonObject h) { header = h; log = null; dirty = true; scheduleSave(); }

    private void stop() {
        generation++;
        if (retry != null) { retry.cancel(false); retry = null; }
        if (ping != null) { ping.cancel(false); ping = null; }
        if (poll != null) { poll.cancel(false); poll = null; }
        if (welcomeWait != null) { welcomeWait.cancel(false); welcomeWait = null; }
        if (ws != null) { try { ws.sendClose(WebSocket.NORMAL_CLOSURE, "aus"); } catch (RuntimeException ignored) { } ws = null; }
        out = null;
    }

    /**
     * @param wsStage the room answered over HTTP (header) but the WebSocket failed: after
     *        {@link #WS_FAILS_FOR_POLL} such failures (or while already polling) the mod polls over HTTP instead.
     */
    private void failed(String why, boolean refused, boolean wsStage) {
        if (ping != null) { ping.cancel(false); ping = null; }
        if (poll != null) { poll.cancel(false); poll = null; }
        if (welcomeWait != null) { welcomeWait.cancel(false); welcomeWait = null; }
        ws = null; out = null;
        lastError = why;
        presence = List.of();
        if (refused) { status = Status.REFUSED; polling = false; notify.accept("Team-Raum: " + why + ". Im Planer unter „Team live“ das Spiel neu verbinden."); onChange.run(); return; }
        if (wsStage) wsFails++;
        if (wsStage && (polling || wsFails >= WS_FAILS_FOR_POLL)) { startPolling(); return; }
        boolean wasLive = status == Status.LIVE || status == Status.POLL;
        status = Status.RETRY;
        if (wasLive) notify.accept("Verbindung zum Team-Raum verloren – die Mod versucht es weiter. Eigene Meldungen warten so lange.");
        // The room answered but the WebSocket did not: try once more soon, then poll (see above).
        long wait = wsStage ? 1 : Math.min(60, 2L << Math.min(attempts, 5));
        attempts++;
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
            synchronized (RoomClient.this) { if (gen == generation) failed(code == 4401 || code == 4403 ? "Schlüssel ungültig oder erneuert" : "getrennt (" + code + ")", code == 4401 || code == 4403, welcomedGen != gen); }
            return null;
        }

        @Override public void onError(WebSocket w, Throwable error) {
            synchronized (RoomClient.this) { if (gen == generation) failed(reason(error), false, welcomedGen != gen); }
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
                boolean fromPoll = status == Status.POLL || polling;
                welcomedGen = gen;
                if (welcomeWait != null) { welcomeWait.cancel(false); welcomeWait = null; }
                status = Status.LIVE; attempts = 0; wsFails = 0; polling = false; lastError = null; syncedAt = System.currentTimeMillis();
                if (first) notify.accept(fromPoll ? "Team-Raum wieder über den WebSocket verbunden."
                        : "Team live über den Team-Raum" + (config.teamName() != null ? " „" + config.teamName() + "“" : "") + " – ohne Server-Datei.");
                flushReports(true);
                checkDocs(m.has("docs") && m.get("docs").isJsonObject() ? m.getAsJsonObject("docs") : null);
                onChange.run();
            }
            case "doc" -> {
                String name = TeamLog.str(m, "name");
                if (name != null && docHandlers.containsKey(name)) fetchDoc(name);
            }
            case "events" -> { ingest(m); onChange.run(); }
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
            case "appended" -> answered(m);
            case "ask" -> {
                if ("scan".equals(TeamLog.str(m, "what")) && !shareScans) {
                    notify.accept("Team-Raum: Aufnahme-Anfrage abgelehnt – „Aufnahmen auf Anfrage senden“ ist für dieses Spiel aus (Planer → Team live).");
                } else if ("scan".equals(TeamLog.str(m, "what"))) {
                    Ask a = new Ask(TeamLog.str(m, "from"), TeamLog.str(m, "projectId"), TeamLog.str(m, "id"));
                    try { onAsk.accept(a); } catch (RuntimeException e) { lastError = "Aufnahme anfordern: " + e.getMessage(); }
                }
            }
            case "error" -> lastError = "Team-Raum: " + java.util.Optional.ofNullable(TeamLog.str(m, "message")).orElse(TeamLog.str(m, "error"));
            default -> { }
        }
    }

    private void send(Map<String, Object> m) {
        WsQueue q = out;
        if (q == null) return;
        q.send(Json.write(m));
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
    public boolean live() { return status == Status.LIVE || status == Status.POLL; }

    /** Status line for HUD and planner: with the age of the shown state while the room is away. */
    /** Status in German, for the website. */
    public String statusText() { return statusText(false); }

    /** Status in the player's language, for the game (GAME-12). */
    public String statusLine() { return statusText(io.github.freadeax.bauplaner.mod.Lang.en()); }

    private String statusText(boolean en) {
        String s = en ? status.en : status.label;
        long at = syncedAt;
        if (!live() && config != null && header != null && at > 0)
            s += (en ? " · showing the state of " : " · zeigt den Stand von ") + java.time.format.DateTimeFormatter.ofPattern(en ? "MM/dd HH:mm" : "dd.MM. HH:mm").format(java.time.LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(at), java.time.ZoneId.systemDefault()));
        int n = pendingReports();
        if (n > 0) s += " · " + n + (en ? (n == 1 ? " report waiting" : " reports waiting") : (n == 1 ? " Meldung wartet" : " Meldungen warten"));
        return s;
    }

    /** ws, http (polling) or off. */
    public String mode() { return status == Status.LIVE ? "ws" : status == Status.POLL ? "http" : "off"; }

    /** When the room last confirmed the shown state (ms since 1970, 0 = never). */
    public long syncedAt() { return syncedAt; }

    /** Own measurements waiting for the room. */
    public synchronized int pendingReports() { return reports.size(); }

    /** Sends own team events (already in event form with {@code by}); false when not live. */
    public synchronized boolean append(String batch, List<Map<String, Object>> plain) {
        if (plain.isEmpty()) return false;
        List<Map<String, Object>> list = signed(plain);
        if (status == Status.POLL) { appendHttp(batch, list); return true; }
        if (status != Status.LIVE || ws == null) return false;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "append"); m.put("batch", batch); m.put("events", new ArrayList<Object>(list));
        send(m);
        return true;
    }

    /**
     * GAME-06: with the Bauleitung's signing key, the mod signs the events it writes in the founder's name (deterministic:
     * a resend keeps the signature, the room answers "known"). Others' events and those without key stay as they are.
     */
    private List<Map<String, Object>> signed(List<Map<String, Object>> list) {
        Config c = config;
        TeamLog l = log;
        if (c == null || c.signKey() == null || l == null) return list;
        List<Map<String, Object>> out = new ArrayList<>(list.size());
        for (Map<String, Object> e : list) out.add(l.founder.equals(e.get("by")) ? io.github.freadeax.bauplaner.mod.team.EventSig.signed(c.signKey(), l.teamId, e) : e);
        return out;
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
        if (status != Status.LIVE || ws == null || !sharePos) { lastPos = new int[] { x, y, z }; lastDim = dim; return false; }
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
     * Sends a report the game measured itself (section.seen, store.seen; unverified, origin planer) to the room.
     * It stays in {@link #reports} until the room confirmed (accepted, known or rejected) its id, so a connection
     * that breaks right after sending loses nothing; a newer report for the same section/chest replaces it.
     * False only without a room.
     */
    public synchronized boolean report(String kind, Map<String, Object> body) {
        if (config == null) return false;
        Map<String, Object> e = new LinkedHashMap<>();
        String id = "tev_" + Long.toString(System.currentTimeMillis(), 36) + Integer.toString((int) (Math.random() * 1_679_616), 36);
        // at = time of the measurement, also when it goes out later: the fold keeps the latest per section/chest.
        e.put("id", id); e.put("at", io.github.freadeax.bauplaner.mod.team.TeamWire.time(java.time.Instant.now())); e.put("by", config.member()); e.put("origin", "planer"); e.put("kind", kind);
        e.putAll(body);
        String key = kind + ":" + (body.get("section") instanceof String s ? s : body.get("chest") instanceof String s ? s : "");
        // FALLBACK-01: kept until confirmed – while the room is away it goes out on reconnect (flushReports).
        reports.remove(key);
        reports.put(key, e);
        while (reports.size() > MAX_REPORTS) reports.remove(reports.keySet().iterator().next());
        if (live()) append("b_" + id, List.of(e));
        scheduleSave();
        return true;
    }

    /** The room answered for these ids: own measurements with them are done. */
    private synchronized void reportsDone(List<String> ids) {
        if (reports.isEmpty() || ids.isEmpty()) return;
        java.util.Set<String> done = new java.util.HashSet<>(ids);
        if (reports.values().removeIf(e -> done.contains(e.get("id")))) scheduleSave();
    }

    /** @param announce tell the player (after an outage), not for a quiet resend while polling */
    private void flushReports(boolean announce) {
        if (reports.isEmpty() || !live()) return;
        long now = System.currentTimeMillis();
        List<Map<String, Object>> due = new ArrayList<>();
        for (Map<String, Object> e : reports.values()) {
            try { if (now - java.time.Instant.parse((String) e.get("at")).toEpochMilli() > REPORT_TTL_MS) continue; } catch (RuntimeException ignored) { continue; }
            due.add(e);
        }
        reports.values().removeIf(e -> !due.contains(e));
        // Each one with its own batch id: repeated after a lost answer, the room answers from its batch memory.
        for (Map<String, Object> e : due) append("b_" + e.get("id"), List.of(e));
        if (announce && !due.isEmpty()) notify.accept("Team-Raum: " + due.size() + (due.size() == 1 ? " gemerkte Messung" : " gemerkte Messungen") + " aus der Offline-Zeit nachgereicht.");
        scheduleSave();
    }

    // ------------------------------------------------------------------ FALLBACK-01: events, polling, stored state

    /** Takes a page of events (WebSocket push or HTTP poll); {@code reset}: the room no longer knows our cursor. */
    private void ingest(JsonObject m) {
        if (m.has("reset") && m.get("reset").isJsonPrimitive() && m.get("reset").getAsBoolean()) { events.clear(); eventIds.clear(); log = null; }
        for (JsonElement e : TeamLog.array(m, "events")) {
            if (!e.isJsonObject()) continue;
            String id = TeamLog.str(e.getAsJsonObject(), "id");
            if (id != null && !eventIds.add(id)) continue;
            events.add(e.getAsJsonObject());
            if (log != null) { try { log.add(e.getAsJsonObject()); } catch (RuntimeException ignored) { } }
        }
        String c = TeamLog.str(m, "cursor");
        if (c != null) cursor = c;
        dirty = true;
        syncedAt = System.currentTimeMillis();
        scheduleSave();
    }

    private void startPolling() {
        boolean first = !polling;
        polling = true;
        status = Status.POLL;
        attempts = 0;
        lastError = "WebSocket nicht möglich – Abgleich über HTTP";
        probeAt = System.currentTimeMillis() + probeEveryMs;
        if (first) notify.accept("Team-Raum: WebSocket gesperrt (Netz oder Proxy?) – die Mod gleicht jetzt über HTTP ab. Alles geht weiter, nur mit ein paar Sekunden Verzögerung.");
        flushReports(true);
        schedulePoll(0);
        onChange.run();
    }

    private void schedulePoll(long ms) {
        if (poll != null) poll.cancel(false);
        long gen = generation;
        poll = timer.schedule(() -> pollOnce(gen), ms, TimeUnit.MILLISECONDS);
    }

    private void pollOnce(long gen) {
        Config c;
        String after;
        synchronized (this) {
            if (gen != generation || status != Status.POLL || config == null) return;
            if (System.currentTimeMillis() >= probeAt) { connect(); return; } // try the WebSocket again now and then
            c = config; after = cursor;
        }
        HttpRequest req = HttpRequest.newBuilder(URI.create(c.url() + "/v1/rooms/" + c.room() + "/events?limit=500&after=" + java.net.URLEncoder.encode(after, StandardCharsets.UTF_8)))
                .timeout(Duration.ofSeconds(20)).header("Authorization", "Bearer " + c.key()).header("Accept", "application/json").GET().build();
        http.sendAsync(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).whenComplete((res, ex) -> {
            synchronized (this) {
                if (gen != generation || status != Status.POLL) return;
                if (ex != null) { failed("HTTP: " + reason(ex), false, false); return; }
                if (res.statusCode() == 401 || res.statusCode() == 403) { failed("Schlüssel ungültig oder erneuert (" + res.statusCode() + ")", true, false); return; }
                if (res.statusCode() != 200) { failed("Team-Raum antwortet " + res.statusCode(), false, false); return; }
                boolean more;
                try {
                    JsonObject m = JsonParser.parseString(res.body()).getAsJsonObject();
                    int before = events.size();
                    ingest(m);
                    more = m.has("more") && m.get("more").getAsBoolean();
                    if (events.size() != before || m.has("reset")) onChange.run();
                } catch (RuntimeException e) { failed("Antwort nicht lesbar: " + e.getMessage(), false, false); return; }
                lastError = "WebSocket nicht möglich – Abgleich über HTTP";
                // Shared documents every few polls (cheap: the room answers „unchanged“ for a known revision).
                if (System.currentTimeMillis() - docPollAt >= docPollEveryMs) { docPollAt = System.currentTimeMillis(); checkDocs(null); }
                // A lost POST answer leaves measurements unconfirmed: send them again now and then.
                if (!reports.isEmpty() && System.currentTimeMillis() - lastAppendAt >= resendAfterMs) flushReports(false);
                schedulePoll(more ? 0 : System.currentTimeMillis() - lastAppendAt < 10_000 ? pollSoonMs : pollEveryMs);
            }
        });
    }

    /** POST …/events while polling; the answer is handled like {@code appended}. */
    private void appendHttp(String batch, List<Map<String, Object>> list) {
        Config c = config;
        long gen = generation;
        lastAppendAt = System.currentTimeMillis();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("batch", batch); body.put("events", new ArrayList<Object>(list));
        HttpRequest req = HttpRequest.newBuilder(URI.create(c.url() + "/v1/rooms/" + c.room() + "/events")).timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + c.key()).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(Json.write(body), StandardCharsets.UTF_8)).build();
        http.sendAsync(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).whenComplete((res, ex) -> {
            // Lost answers are fine: the outbox resends with the same ids and the room answers "known".
            if (ex != null || res.statusCode() != 200) return;
            JsonObject m;
            try { m = JsonParser.parseString(res.body()).getAsJsonObject(); } catch (RuntimeException e) { return; }
            answered(m);
            synchronized (this) { if (gen == generation && status == Status.POLL) schedulePoll(pollSoonMs); }
        });
    }

    private void answered(JsonObject m) {
        List<String> ok = new ArrayList<>();
        for (JsonElement e : TeamLog.array(m, "accepted")) ok.add(e.getAsString());
        for (JsonElement e : TeamLog.array(m, "known")) ok.add(e.getAsString());
        List<String> rejected = new ArrayList<>();
        for (JsonElement e : TeamLog.array(m, "rejected")) {
            if (!e.isJsonObject()) continue;
            JsonObject r = e.getAsJsonObject();
            rejected.add(TeamLog.str(r, "id"));
            onReject.accept(TeamLog.str(r, "id"), TeamLog.str(r, "reason"));
        }
        if (!ok.isEmpty()) onAck.accept(ok);
        List<String> done = new ArrayList<>(ok); done.addAll(rejected);
        reportsDone(done);
    }

    private void scheduleSave() {
        if (cacheFile == null || save != null || config == null) return;
        save = timer.schedule(() -> { synchronized (this) { save = null; saveNow(); } }, 3, TimeUnit.SECONDS);
    }

    /** Writes header, events, cursor and waiting measurements (atomic); test hook. */
    synchronized void saveNow() {
        if (cacheFile == null || config == null || header == null) return;
        JsonObject o = new JsonObject();
        o.addProperty("format", "bauplaner-raum-stand"); o.addProperty("version", 1);
        o.addProperty("url", config.url()); o.addProperty("room", config.room()); o.addProperty("member", config.member());
        o.addProperty("cursor", cursor); o.addProperty("syncedAt", syncedAt);
        o.add("header", header);
        JsonArray ev = new JsonArray(); for (JsonObject e : events) ev.add(e); o.add("events", ev);
        JsonArray rp = new JsonArray(); for (Map<String, Object> e : reports.values()) rp.add(JsonParser.parseString(Json.write(e))); o.add("reports", rp);
        String text = o.toString();
        if (text.length() > MAX_CACHE) { try { Files.deleteIfExists(cacheFile); } catch (IOException ignored) { } return; }
        try {
            Files.createDirectories(cacheFile.getParent());
            Path tmp = cacheFile.resolveSibling(cacheFile.getFileName() + ".tmp");
            Files.writeString(tmp, text, StandardCharsets.UTF_8);
            Files.move(tmp, cacheFile, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) { lastError = "Teamstand nicht gespeichert: " + e.getMessage(); }
    }

    private void loadCache() {
        if (cacheFile == null || !Files.isRegularFile(cacheFile)) return;
        try {
            JsonObject o = JsonParser.parseString(Files.readString(cacheFile, StandardCharsets.UTF_8)).getAsJsonObject();
            if (!config.url().equals(TeamLog.str(o, "url")) || !config.room().equals(TeamLog.str(o, "room")) || !config.member().equals(TeamLog.str(o, "member"))) return;
            JsonObject h = o.getAsJsonObject("header");
            new TeamLog(h); // same checks as a fresh header
            header = h;
            for (JsonElement e : TeamLog.array(o, "events")) {
                if (!e.isJsonObject()) continue;
                String id = TeamLog.str(e.getAsJsonObject(), "id");
                if (id != null && !eventIds.add(id)) continue;
                events.add(e.getAsJsonObject());
            }
            String c = TeamLog.str(o, "cursor");
            cursor = c == null ? "" : c;
            syncedAt = o.has("syncedAt") ? o.get("syncedAt").getAsLong() : 0;
            for (JsonElement e : TeamLog.array(o, "reports")) {
                if (!e.isJsonObject()) continue;
                Map<String, Object> m = Json.obj(Json.parse(e.toString()), "Meldung");
                String kind = m.get("kind") instanceof String s ? s : "";
                reports.put(kind + ":" + (m.get("section") instanceof String s ? s : m.get("chest") instanceof String s ? s : ""), m);
            }
            dirty = true;
        } catch (IOException | RuntimeException e) {
            header = null; events.clear(); eventIds.clear(); cursor = ""; reports.clear();
            lastError = "Gespeicherter Teamstand nicht lesbar – kommt beim nächsten Kontakt neu: " + e.getMessage();
        }
    }

    /** Stops everything (game closes). */
    public synchronized void close() { if (save != null) { save.cancel(false); save = null; saveNow(); } stop(); timer.shutdownNow(); }
}
