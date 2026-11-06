package io.github.freadeax.bauplaner.mod.live;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;
import java.util.function.LongSupplier;
import java.util.regex.Pattern;

/**
 * Live-Verbindung Website ↔ Mod (GAME-03/MAP-03): a very small HTTP/1.1 service for the
 * Build Studio website on the same computer. Only java.base, no game classes, so it is the same for
 * every loader and Minecraft version.
 *
 * <p>Security contract (docs/architecture/team/LIVE_LINK.md):
 * <ul>
 * <li>Bound to the loopback address only, switched off until the player starts it in game.</li>
 * <li>{@code Host} must be {@code 127.0.0.1:<port>} or {@code localhost:<port>} (no DNS rebinding).</li>
 * <li>A browser {@code Origin} must be the published website or a local development server; others get 403
 * and no CORS headers.</li>
 * <li>Pairing: the mod shows a six digit code in the chat (5 minutes, 5 attempts); the website trades it for a
 * random token. Every other request needs that token. Tokens can be revoked in game.</li>
 * <li>Nothing here changes the world. Plans and marks only feed the client side hologram.</li>
 * </ul>
 */
public final class LiveLinkServer implements AutoCloseable {
    public static final int PROTOCOL = 2;
    public static final int DEFAULT_PORT = 47615;
    public static final String TOKEN_HEADER = "x-bauplaner-token";
    public static final int MAX_CHUNKS = 64;
    /** Largest plan upload (SIZE-01, mod 0.9.0; before 16 MiB). Same as the website's MODEL_MAX_FILE_BYTES. */
    public static final int MAX_PLAN_BYTES = 64_000_000;
    static final int MAX_JSON_BYTES = 1024 * 1024;
    /** Team server file handed to the plugin (20 000 events ≈ 3 MB). */
    static final int TEAM_PUSH_BYTES = 6 * 1024 * 1024;
    static final int MAX_HEADER_BYTES = 16 * 1024;
    static final long PAIRING_MS = 5 * 60_000L;
    static final int PAIRING_ATTEMPTS = 5;
    static final int MAX_TOKENS = 8;
    /** A pairing request waits this long for the player's click (LINK-03). */
    static final long ASK_MS = 3 * 60_000L;
    static final int MAX_ASKS = 3;
    static final Set<String> ALLOWED_ORIGINS = Set.of("https://freadeax.github.io", "https://bauplaner.pages.dev"); // GitHub Pages + Cloudflare Pages (PERF-06)
    private static final Pattern LOCAL_ORIGIN = Pattern.compile("^http://(localhost|127\\.0\\.0\\.1)(:\\d{1,5})?$");

    /** Game side; every method runs on a server thread and must hop to the game thread itself. Returns JSON. */
    public interface Handler {
        String status() throws Exception;
        String chunks(int[][] chunks) throws Exception;
        String plan(Map<String, String> query, byte[] schem) throws Exception;
        String placement(Map<String, Object> body) throws Exception;
        String marks(Map<String, Object> body) throws Exception;
        /** POST /v1/section {"section":n}: choose the build section shown in the game (0 = all). Since mod 0.7.0. */
        default String section(Map<String, Object> body) throws Exception { throw new HttpError(404, "Diese Mod kennt keine Bauabschnitte."); }
        /** POST /v1/group {"group":name|null}: limit the hologram to one Weltplan group (GAME-07-S11, since 0.19.0). */
        default String group(Map<String, Object> body) throws Exception { throw new HttpError(404, "Diese Mod kennt keine Weltplan-Gruppen."); }
        /** Baustand of the placed plan as {@code bauplaner-scan} file (MAP-05, since 0.7.1). */
        default Binary scan() throws Exception { throw new HttpError(404, "Diese Mod kann keinen Baustand liefern."); }
        /** TERRAIN-04 (feature {@code terrain}): surface of loaded or remembered chunks, see {@link TerrainMemory#answer}. */
        default String terrain(int[][] chunks) throws Exception { throw new HttpError(404, "Diese Mod hat kein Geländegedächtnis."); }
        /** Remembered chunks in a chunk rectangle {@code [x0, z0, x1, z1]}. */
        default String terrainKnown(int[] area) throws Exception { throw new HttpError(404, "Diese Mod hat kein Geländegedächtnis."); }
        /** TERRAIN-04 (feature {@code box}): every block of a world box, see {@link BoxRead}. */
        default String box(int[] box) throws Exception { throw new HttpError(404, "Diese Mod kann keinen Geländebereich lesen."); }
        /** GET /v1/players: other players the client sees, {@code {dimension, players:[{name,x,y,z,yaw}]}} (GAME-08, since 0.8.0). */
        default String players() throws Exception { throw new HttpError(404, "Diese Mod meldet keine Mitspieler."); }
        /**
         * Teambau (COOP-03, since 0.10.0). GET /v1/team: link to the server plugin, own waiting actions as planner
         * events ({@code outbox}); POST /v1/team: the planner's team view for the game; POST /v1/team/ack {ids}:
         * the planner merged those events; POST /v1/team/push {file}: hand a team server file to the plugin;
         * GET /v1/team/pull?teamId=…&since=…: events from the plugin. Push and pull answer 409 with code
         * {@code team-plugin-fehlt} / {@code team-nicht-erlaubt} when there is no way to the server.
         */
        default String teamGet() throws Exception { throw new HttpError(404, "Diese Mod kennt keinen Teambau."); }
        default String teamPost(Map<String, Object> body) throws Exception { throw new HttpError(404, "Diese Mod kennt keinen Teambau."); }
        default String teamAck(Map<String, Object> body) throws Exception { throw new HttpError(404, "Diese Mod kennt keinen Teambau."); }
        default String teamPush(Map<String, Object> body) throws Exception { throw new HttpError(404, "Diese Mod kennt keinen Teambau."); }
        default String teamPull(Map<String, String> query) throws Exception { throw new HttpError(404, "Diese Mod kennt keinen Teambau."); }
        /**
         * Server link without commands (LINK-03, docs/architecture/team/AUTO_LINK.md). GET /v1/server: who the server
         * plugin is ({@code link.info}); POST /v1/server/claim {device}: pair the server with this planner (the
         * plugin checks that the player is operator); POST /v1/server/control {owner,seq,body,sig}: a signed
         * control message, passed on unchanged. All three go over the team channel and answer 409 without it.
         */
        /** Live protocol 3 (GAME-08): points set in the game, waiting for the Weltkarte. */
        default String gameMarks() throws Exception { throw new HttpError(404, "Diese Mod kennt keine Markierungen aus dem Spiel."); }
        default String gameMarksAck(Map<String, Object> body) throws Exception { throw new HttpError(404, "Diese Mod kennt keine Markierungen aus dem Spiel."); }
        default String serverInfo() throws Exception { throw new HttpError(404, "Diese Mod kennt keine Server-Kopplung."); }
        default String serverClaim(Map<String, Object> body) throws Exception { throw new HttpError(404, "Diese Mod kennt keine Server-Kopplung."); }
        default String serverControl(Map<String, Object> body) throws Exception { throw new HttpError(404, "Diese Mod kennt keine Server-Kopplung."); }
        /**
         * Team room without a server file (LINK-07, since 0.14.0). GET /v1/room: connected room (without key),
         * status, who is there; POST /v1/room {url, room, key, member, memberName?, teamName?}: use this room
         * from now on; POST /v1/room {off:true}: forget it.
         */
        default String roomGet() throws Exception { throw new HttpError(404, "Diese Mod kennt keinen Team-Raum."); }
        default String roomPost(Map<String, Object> body) throws Exception { throw new HttpError(404, "Diese Mod kennt keinen Team-Raum."); }
    }

    /** A file answer: name for the website, bytes as sent. */
    public record Binary(String fileName, byte[] bytes) {}

    /** What this mod can do beyond protocol 1; the website enables buttons by it. */
    public static final List<String> FEATURES = List.of("scan", "marks2", "players", "bigplans", "team", "pairask", "server", "marks3", "room", "roomfallback", "groups", "terrain", "box", "roomserver");

    public record Info(String version, String loader, String minecraft) {}

    /** Error with an HTTP status and a message for the website (German, shown to the player). */
    public static final class HttpError extends RuntimeException {
        final int status;
        public HttpError(int status, String message) { super(message); this.status = status; }
    }

    public record Request(String method, String path, Map<String, String> query, Map<String, String> headers, byte[] body) {}
    public record Response(int status, Map<String, String> headers, byte[] body) {
        public String text() { return new String(body, StandardCharsets.UTF_8); }
    }

    private final Info info;
    private final Handler handler;
    private final SecureRandom random = new SecureRandom();
    private final LongSupplier clock;
    private final Consumer<Collection<String>> saveTokens;
    private final LinkedHashSet<String> tokens = new LinkedHashSet<>();
    private String pairingCode;
    private long pairingUntil;
    private int pairingAttempts;
    /** Pairing requests of websites waiting for "Zulassen" in the game (LINK-03), oldest first. */
    private final List<Ask> asks = new ArrayList<>();
    private volatile Consumer<Ask> onAsk = a -> { };
    private volatile ServerSocket socket;
    private volatile int port;
    private ExecutorService pool;

    public LiveLinkServer(Info info, Handler handler, Collection<String> knownTokens, Consumer<Collection<String>> saveTokens, LongSupplier clock) {
        this.info = info;
        this.handler = handler;
        this.saveTokens = saveTokens;
        this.clock = clock;
        for (String t : knownTokens) if (t != null && t.matches("[A-Za-z0-9_-]{24,128}")) tokens.add(t);
    }

    // ------------------------------------------------------------------ lifecycle

    public synchronized void start(int port) throws IOException {
        if (socket != null) return;
        if (port < 1024 || port > 65535) throw new IOException("Port muss zwischen 1024 und 65535 liegen.");
        ServerSocket s = new ServerSocket(port, 16, InetAddress.getLoopbackAddress());
        socket = s;
        this.port = s.getLocalPort();
        pool = Executors.newFixedThreadPool(2, r -> { Thread t = new Thread(r, "Build-Studio-Verbindung"); t.setDaemon(true); return t; });
        Thread acceptor = new Thread(() -> acceptLoop(s), "Build-Studio-Verbindung-Annahme");
        acceptor.setDaemon(true);
        acceptor.start();
    }

    public boolean running() { return socket != null; }
    public int port() { return port; }

    @Override
    public synchronized void close() {
        ServerSocket s = socket;
        socket = null;
        if (s != null) try { s.close(); } catch (IOException ignored) { }
        if (pool != null) pool.shutdownNow();
        pool = null;
    }

    private void acceptLoop(ServerSocket s) {
        while (!s.isClosed()) {
            try {
                Socket c = s.accept();
                ExecutorService p = pool;
                if (p == null) { c.close(); return; }
                p.execute(() -> serve(c));
            } catch (SocketException closed) {
                return;
            } catch (IOException | RuntimeException ignored) {
                // One broken connection must not stop the service.
            }
        }
    }

    // ------------------------------------------------------------------ pairing by click (LINK-03)

    /** One website that asked to pair; {@code state} waiting → ok (token handed out once) / denied / expired. */
    public static final class Ask {
        public final String id;
        public final String device;
        final long until;
        String state = "waiting";
        String token;
        Ask(String id, String device, long until) { this.id = id; this.device = device; this.until = until; }
        public String state() { return state; }
    }

    /** Called (on a server thread) when a website asks to pair; the game shows "Zulassen / Ablehnen". */
    public void onAsk(Consumer<Ask> listener) { onAsk = listener == null ? a -> { } : listener; }

    /** The oldest request still waiting for the player, if any. */
    public synchronized Ask pendingAsk() {
        expireAsks();
        for (Ask a : asks) if (a.state.equals("waiting")) return a;
        return null;
    }

    /** The player clicked "Zulassen": the oldest waiting website gets a token on its next poll. */
    public synchronized String approveAsk() {
        Ask a = pendingAsk();
        if (a == null) return null;
        a.token = newToken();
        a.state = "ok";
        return a.device;
    }

    /** The player clicked "Ablehnen" (all waiting requests). */
    public synchronized int denyAsks() {
        int n = 0;
        for (Ask a : asks) if (a.state.equals("waiting")) { a.state = "denied"; n++; }
        return n;
    }

    private void expireAsks() {
        long now = clock.getAsLong();
        for (Ask a : asks) if (a.state.equals("waiting") && now > a.until) a.state = "expired";
        asks.removeIf(a -> now > a.until + 60_000L);
    }

    private String ask(String device) {
        Ask a;
        synchronized (this) {
            expireAsks();
            long waiting = asks.stream().filter(x -> x.state.equals("waiting")).count();
            if (waiting >= MAX_ASKS) throw new HttpError(429, "Es warten schon " + waiting + " Anfragen im Spiel. Dort zulassen oder ablehnen.");
            byte[] raw = new byte[18];
            random.nextBytes(raw);
            String name = device == null ? "" : device.replaceAll("[\\p{Cntrl}]", "").trim();
            a = new Ask(Base64.getUrlEncoder().withoutPadding().encodeToString(raw), name.isEmpty() ? "Browser" : name.length() > 40 ? name.substring(0, 40) : name, clock.getAsLong() + ASK_MS);
            asks.add(a);
        }
        onAsk.accept(a);
        return "{\"request\":" + Json.quote(a.id) + ",\"state\":\"waiting\",\"seconds\":" + ASK_MS / 1000 + "}";
    }

    private synchronized String askState(String id) {
        expireAsks();
        Ask a = null;
        for (Ask x : asks) if (id != null && constantEquals(id, x.id)) a = x;
        if (a == null) return "{\"state\":\"expired\"}";
        if (a.state.equals("ok") && a.token != null) {
            String t = a.token;
            a.token = null; // handed out once
            a.state = "done";
            return "{\"state\":\"ok\",\"token\":" + Json.quote(t) + "}";
        }
        return "{\"state\":" + Json.quote(a.state.equals("done") ? "expired" : a.state) + "}";
    }

    private synchronized String newToken() {
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        tokens.add(token);
        while (tokens.size() > MAX_TOKENS) tokens.remove(tokens.iterator().next());
        saveTokens.accept(List.copyOf(tokens));
        return token;
    }

    // ------------------------------------------------------------------ pairing by code

    /** Opens pairing and returns the code to show in the chat. */
    public synchronized String openPairing() {
        pairingCode = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        pairingUntil = clock.getAsLong() + PAIRING_MS;
        pairingAttempts = 0;
        return pairingCode;
    }

    public synchronized boolean pairingOpen() { return pairingCode != null && clock.getAsLong() < pairingUntil; }

    public synchronized int pairedClients() { return tokens.size(); }

    /** Forgets every paired website (all browsers must pair again). */
    public synchronized void revokeAll() {
        tokens.clear();
        saveTokens.accept(List.copyOf(tokens));
    }

    private synchronized String pair(String code) {
        if (!pairingOpen()) throw new HttpError(403, "Keine Kopplung offen. Im Spiel /bauplaner verbinden eingeben und den Code hier eintragen.");
        if (code == null || !constantEquals(code.trim(), pairingCode)) {
            if (++pairingAttempts >= PAIRING_ATTEMPTS) pairingCode = null;
            throw new HttpError(403, pairingCode == null ? "Zu viele falsche Codes. Im Spiel erneut /bauplaner verbinden eingeben." : "Code stimmt nicht.");
        }
        pairingCode = null;
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        tokens.add(token);
        while (tokens.size() > MAX_TOKENS) tokens.remove(tokens.iterator().next());
        saveTokens.accept(List.copyOf(tokens));
        return token;
    }

    private synchronized boolean tokenValid(String token) {
        if (token == null) return false;
        boolean ok = false;
        for (String t : tokens) ok |= constantEquals(token, t);
        return ok;
    }

    private synchronized void revoke(String token) {
        tokens.removeIf(t -> constantEquals(token, t));
        saveTokens.accept(List.copyOf(tokens));
    }

    private static boolean constantEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    // ------------------------------------------------------------------ requests

    public static boolean originAllowed(String origin) {
        return origin != null && (ALLOWED_ORIGINS.contains(origin) || LOCAL_ORIGIN.matcher(origin).matches());
    }

    /** Decides one request. Pure apart from pairing state and the handler; used directly by the tests. */
    public Response handle(Request r) {
        Map<String, String> h = new LinkedHashMap<>();
        h.put("Content-Type", "application/json; charset=utf-8");
        h.put("Cache-Control", "no-store");
        h.put("X-Content-Type-Options", "nosniff");
        String host = r.headers().get("host");
        if (host == null || !(host.equals("127.0.0.1:" + port) || host.equals("localhost:" + port)))
            return error(h, 403, "Nur über 127.0.0.1 erreichbar.");
        String origin = r.headers().get("origin");
        if (origin != null) {
            if (!originAllowed(origin)) return error(h, 403, "Diese Website darf die Build-Studio-Mod nicht abfragen.");
            h.put("Access-Control-Allow-Origin", origin);
            h.put("Vary", "Origin");
        }
        if (r.method().equals("OPTIONS")) {
            h.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            h.put("Access-Control-Allow-Headers", "Content-Type, X-Bauplaner-Token");
            h.put("Access-Control-Max-Age", "600");
            if (r.headers().containsKey("access-control-request-private-network")) h.put("Access-Control-Allow-Private-Network", "true");
            return new Response(204, h, new byte[0]);
        }
        try {
            String route = r.method() + " " + r.path();
            switch (route) {
                case "GET /v1/hello":
                    return ok(h, "{\"app\":\"bauplaner-mod\",\"protocol\":" + PROTOCOL + ",\"mod\":{\"version\":" + Json.quote(info.version()) + ",\"loader\":"
                            + Json.quote(info.loader()) + ",\"minecraft\":" + Json.quote(info.minecraft()) + "},\"pairing\":" + pairingOpen()
                            + ",\"features\":[" + String.join(",", FEATURES.stream().map(Json::quote).toList()) + "]}");
                case "POST /v1/pair/ask": {
                    Map<String, Object> body = r.body().length == 0 ? Map.of() : Json.obj(Json.parse(text(r, 4096)), "Anfrage");
                    return ok(h, ask(body.get("device") instanceof String s ? s : null));
                }
                case "GET /v1/pair/ask": return ok(h, askState(r.query().get("request")));
                case "POST /v1/pair": {
                    Map<String, Object> body = Json.obj(Json.parse(text(r, 4096)), "Kopplung");
                    String code = body.get("code") instanceof String s ? s : null;
                    return ok(h, "{\"token\":" + Json.quote(pair(code)) + "}");
                }
                default:
                    break;
            }
            if (!r.path().startsWith("/v1/")) return error(h, 404, "Unbekannte Adresse.");
            String token = r.headers().get(TOKEN_HEADER);
            if (!tokenValid(token)) return error(h, 401, "Nicht gekoppelt. Auf der Website „Verbinden“ wählen und im Spiel „Zulassen“ klicken.");
            switch (route) {
                case "GET /v1/status": return ok(h, handler.status());
                case "GET /v1/chunks": return ok(h, handler.chunks(chunkList(r.query().get("c"))));
                case "GET /v1/terrain": return ok(h, handler.terrain(chunkList(r.query().get("c"))));
                case "GET /v1/terrain/known": return ok(h, handler.terrainKnown(TerrainMemory.area(r.query().get("a"))));
                case "GET /v1/box": return ok(h, handler.box(BoxRead.parse(r.query().get("b"))));
                case "POST /v1/plan":
                    if (r.body().length == 0 || r.body().length > MAX_PLAN_BYTES) throw new HttpError(413, "Plandatei fehlt oder ist zu groß (höchstens " + MAX_PLAN_BYTES / 1_000_000 + " MB).");
                    return ok(h, handler.plan(r.query(), r.body()));
                case "POST /v1/placement": return ok(h, handler.placement(Json.obj(Json.parse(text(r, 65_536)), "Lage")));
                case "POST /v1/marks": return ok(h, handler.marks(Json.obj(Json.parse(text(r, MAX_JSON_BYTES)), "Markierungen")));
                case "GET /v1/marks/game": return ok(h, handler.gameMarks());
                case "POST /v1/marks/game/ack": return ok(h, handler.gameMarksAck(Json.obj(Json.parse(text(r, 65_536)), "Quittung")));
                case "POST /v1/section": return ok(h, handler.section(Json.obj(Json.parse(text(r, 4_096)), "Abschnitt")));
                case "POST /v1/group": return ok(h, handler.group(Json.obj(Json.parse(text(r, 4_096)), "Gruppe")));
                case "GET /v1/players": return ok(h, handler.players());
                case "GET /v1/team": return ok(h, handler.teamGet());
                case "POST /v1/team": return ok(h, handler.teamPost(Json.obj(Json.parse(text(r, MAX_JSON_BYTES)), "Teamstand")));
                case "POST /v1/team/ack": return ok(h, handler.teamAck(Json.obj(Json.parse(text(r, 65_536)), "Quittung")));
                case "POST /v1/team/push": return ok(h, handler.teamPush(Json.obj(Json.parse(text(r, TEAM_PUSH_BYTES)), "Teamdatei")));
                case "GET /v1/team/pull": return ok(h, handler.teamPull(r.query()));
                case "GET /v1/room": return ok(h, handler.roomGet());
                case "POST /v1/room": return ok(h, handler.roomPost(Json.obj(Json.parse(text(r, 4096)), "Team-Raum")));
                case "GET /v1/server": return ok(h, handler.serverInfo());
                case "POST /v1/server/claim": return ok(h, handler.serverClaim(r.body().length == 0 ? Map.of() : Json.obj(Json.parse(text(r, 4096)), "Kopplung")));
                case "POST /v1/server/control": return ok(h, handler.serverControl(Json.obj(Json.parse(text(r, TEAM_PUSH_BYTES)), "Steuernachricht")));
                case "GET /v1/scan": {
                    Binary file = handler.scan();
                    h.put("Content-Type", "application/octet-stream");
                    h.put("X-Bauplaner-File", file.fileName());
                    if (h.containsKey("Access-Control-Allow-Origin")) h.put("Access-Control-Expose-Headers", "X-Bauplaner-File");
                    return new Response(200, h, file.bytes());
                }
                case "POST /v1/unpair": revoke(token); return ok(h, "{\"unpaired\":true}");
                default: return error(h, 404, "Unbekannte Adresse.");
            }
        } catch (HttpError e) {
            return error(h, e.status, e.getMessage());
        } catch (Json.JsonException | IllegalArgumentException e) {
            return error(h, 400, "Ungültige Anfrage: " + e.getMessage());
        } catch (Exception e) {
            return error(h, 500, e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
        }
    }

    private static String text(Request r, int max) {
        if (r.body().length > max) throw new HttpError(413, "Anfrage zu groß.");
        return new String(r.body(), StandardCharsets.UTF_8);
    }

    static int[][] chunkList(String value) {
        if (value == null || value.isBlank()) return new int[0][];
        String[] parts = value.split(";");
        if (parts.length > MAX_CHUNKS) throw new HttpError(400, "Höchstens " + MAX_CHUNKS + " Chunks je Anfrage.");
        int[][] out = new int[parts.length][];
        for (int i = 0; i < parts.length; i++) {
            String[] xz = parts[i].split(",");
            if (xz.length != 2) throw new HttpError(400, "Chunk " + parts[i] + " ungültig.");
            try {
                int x = Integer.parseInt(xz[0].trim()), z = Integer.parseInt(xz[1].trim());
                if (Math.abs(x) > 2_000_000 || Math.abs(z) > 2_000_000) throw new NumberFormatException();
                out[i] = new int[] { x, z };
            } catch (NumberFormatException e) { throw new HttpError(400, "Chunk " + parts[i] + " ungültig."); }
        }
        return out;
    }

    private static Response ok(Map<String, String> h, String json) { return new Response(200, h, json.getBytes(StandardCharsets.UTF_8)); }

    private static Response error(Map<String, String> h, int status, String message) {
        return new Response(status, h, ("{\"error\":" + Json.quote(message) + "}").getBytes(StandardCharsets.UTF_8));
    }

    // ------------------------------------------------------------------ wire

    private void serve(Socket c) {
        try (c) {
            c.setSoTimeout(5000);
            Response res;
            try {
                Request r = read(c.getInputStream());
                res = r == null ? plain(400, "Ungültige Anfrage") : handle(r);
            } catch (HttpError e) {
                res = plain(e.status, e.getMessage());
            }
            write(c.getOutputStream(), res);
        } catch (IOException | RuntimeException ignored) {
            // Client went away or sent garbage.
        }
    }

    private static Response plain(int status, String text) {
        return new Response(status, Map.of("Content-Type", "text/plain; charset=utf-8"), text.getBytes(StandardCharsets.UTF_8));
    }

    /** Reads one request; null when the request line is malformed. */
    static Request read(InputStream in) throws IOException {
        ByteArrayOutputStream head = new ByteArrayOutputStream();
        int last = 0; // last four bytes, to find the blank line "\r\n\r\n"
        while (last != 0x0D0A0D0A) {
            int b = in.read();
            if (b < 0) return null;
            head.write(b);
            if (head.size() > MAX_HEADER_BYTES) throw new HttpError(431, "Kopfzeilen zu groß.");
            last = (last << 8) | b;
        }
        String[] lines = head.toString(StandardCharsets.ISO_8859_1).split("\r\n");
        String[] first = lines[0].split(" ");
        if (first.length != 3 || !first[2].startsWith("HTTP/1.")) return null;
        Map<String, String> headers = new LinkedHashMap<>();
        for (int i = 1; i < lines.length; i++) {
            int colon = lines[i].indexOf(':');
            if (colon <= 0) continue;
            if (headers.size() > 64) throw new HttpError(431, "Zu viele Kopfzeilen.");
            headers.put(lines[i].substring(0, colon).trim().toLowerCase(Locale.ROOT), lines[i].substring(colon + 1).trim());
        }
        if (headers.containsKey("transfer-encoding")) throw new HttpError(411, "Bitte mit Content-Length senden.");
        int length = 0;
        if (headers.containsKey("content-length")) {
            try { length = Integer.parseInt(headers.get("content-length")); } catch (NumberFormatException e) { throw new HttpError(400, "Content-Length ungültig."); }
            if (length < 0 || length > MAX_PLAN_BYTES) throw new HttpError(413, "Anfrage zu groß.");
        }
        byte[] body = in.readNBytes(length);
        if (body.length != length) return null;
        String target = first[1];
        int q = target.indexOf('?');
        String path = q < 0 ? target : target.substring(0, q);
        Map<String, String> query = new LinkedHashMap<>();
        if (q >= 0) for (String pair : target.substring(q + 1).split("&")) {
            if (pair.isEmpty()) continue;
            int eq = pair.indexOf('=');
            String k = URLDecoder.decode(eq < 0 ? pair : pair.substring(0, eq), StandardCharsets.UTF_8);
            String v = eq < 0 ? "" : URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
            query.putIfAbsent(k, v);
        }
        return new Request(first[0], path, query, headers, body);
    }

    static void write(OutputStream out, Response r) throws IOException {
        StringBuilder b = new StringBuilder("HTTP/1.1 ").append(r.status()).append(' ').append(reason(r.status())).append("\r\n");
        for (var e : r.headers().entrySet()) b.append(e.getKey()).append(": ").append(e.getValue()).append("\r\n");
        b.append("Content-Length: ").append(r.body().length).append("\r\nConnection: close\r\n\r\n");
        out.write(b.toString().getBytes(StandardCharsets.ISO_8859_1));
        out.write(r.body());
        out.flush();
    }

    private static String reason(int status) {
        return switch (status) {
            case 200 -> "OK"; case 204 -> "No Content"; case 400 -> "Bad Request"; case 401 -> "Unauthorized"; case 403 -> "Forbidden";
            case 404 -> "Not Found"; case 411 -> "Length Required"; case 413 -> "Payload Too Large"; case 431 -> "Request Header Fields Too Large";
            default -> status >= 500 ? "Internal Server Error" : "Status";
        };
    }

    /** Helper for adapters: column runs as JSON array text "[y,i,y,i]". */
    public static String runs(List<int[]> runs) {
        List<String> parts = new ArrayList<>(runs.size() * 2);
        for (int[] r : runs) { parts.add(Integer.toString(r[0])); parts.add(Integer.toString(r[1])); }
        return "[" + String.join(",", parts) + "]";
    }
}
