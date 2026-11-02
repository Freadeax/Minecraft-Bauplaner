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
 * Bauplaner website on the same computer. Only java.base, no game classes, so it is the same for
 * every loader and Minecraft version.
 *
 * <p>Security contract (docs/architecture/LIVE_LINK.md):
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
    public static final int PROTOCOL = 1;
    public static final int DEFAULT_PORT = 47615;
    public static final String TOKEN_HEADER = "x-bauplaner-token";
    public static final int MAX_CHUNKS = 64;
    public static final int MAX_PLAN_BYTES = 16 * 1024 * 1024;
    static final int MAX_JSON_BYTES = 1024 * 1024;
    static final int MAX_HEADER_BYTES = 16 * 1024;
    static final long PAIRING_MS = 5 * 60_000L;
    static final int PAIRING_ATTEMPTS = 5;
    static final int MAX_TOKENS = 8;
    static final Set<String> ALLOWED_ORIGINS = Set.of("https://freadeax.github.io");
    private static final Pattern LOCAL_ORIGIN = Pattern.compile("^http://(localhost|127\\.0\\.0\\.1)(:\\d{1,5})?$");

    /** Game side; every method runs on a server thread and must hop to the game thread itself. Returns JSON. */
    public interface Handler {
        String status() throws Exception;
        String chunks(int[][] chunks) throws Exception;
        String plan(Map<String, String> query, byte[] schem) throws Exception;
        String placement(Map<String, Object> body) throws Exception;
        String marks(Map<String, Object> body) throws Exception;
    }

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
        pool = Executors.newFixedThreadPool(2, r -> { Thread t = new Thread(r, "Bauplaner-Verbindung"); t.setDaemon(true); return t; });
        Thread acceptor = new Thread(() -> acceptLoop(s), "Bauplaner-Verbindung-Annahme");
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

    // ------------------------------------------------------------------ pairing

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
            if (!originAllowed(origin)) return error(h, 403, "Diese Website darf die Bauplaner-Mod nicht abfragen.");
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
                            + Json.quote(info.loader()) + ",\"minecraft\":" + Json.quote(info.minecraft()) + "},\"pairing\":" + pairingOpen() + "}");
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
            if (!tokenValid(token)) return error(h, 401, "Nicht gekoppelt. Im Spiel /bauplaner verbinden eingeben und den Code auf der Website eintragen.");
            switch (route) {
                case "GET /v1/status": return ok(h, handler.status());
                case "GET /v1/chunks": return ok(h, handler.chunks(chunkList(r.query().get("c"))));
                case "POST /v1/plan":
                    if (r.body().length == 0 || r.body().length > MAX_PLAN_BYTES) throw new HttpError(413, "Plandatei fehlt oder ist zu groß (höchstens 16 MB).");
                    return ok(h, handler.plan(r.query(), r.body()));
                case "POST /v1/placement": return ok(h, handler.placement(Json.obj(Json.parse(text(r, 65_536)), "Lage")));
                case "POST /v1/marks": return ok(h, handler.marks(Json.obj(Json.parse(text(r, MAX_JSON_BYTES)), "Markierungen")));
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
