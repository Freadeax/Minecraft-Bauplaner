package io.github.freadeax.bauplaner.mod.live;

import static org.junit.jupiter.api.Assertions.*;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class LiveLinkTest {
    static final String SITE = "https://freadeax.github.io";
    final AtomicLong now = new AtomicLong(1_000_000);
    final List<List<String>> saved = new ArrayList<>();
    final List<String> calls = new ArrayList<>();

    LiveLinkServer server(List<String> known) {
        LiveLinkServer.Handler h = new LiveLinkServer.Handler() {
            public String status() { calls.add("status"); return "{\"player\":null}"; }
            public String chunks(int[][] c) { calls.add("chunks " + c.length); return "{\"chunks\":[]}"; }
            public String plan(Map<String, String> q, byte[] b) { calls.add("plan " + q.get("name") + " " + b.length); return "{\"placed\":true}"; }
            public String placement(Map<String, Object> b) { calls.add("placement " + b.get("x")); return "{}"; }
            public String marks(Map<String, Object> b) { calls.add("marks " + WorldMarks.parse(b).size()); return "{}"; }
            public LiveLinkServer.Binary scan() { calls.add("scan"); return new LiveLinkServer.Binary("haus_r1_x.schem", new byte[] { 31, -117, 8 }); }
            public String players() { calls.add("players"); return "{\"dimension\":\"minecraft:overworld\",\"players\":[]}"; }
        };
        return new LiveLinkServer(new LiveLinkServer.Info("0.5.0", "fabric", "26.3"), h, known, t -> saved.add(List.copyOf(t)), now::get);
    }

    static LiveLinkServer.Request req(String method, String path, String origin, String token, String body) {
        Map<String, String> h = new HashMap<>();
        h.put("host", "127.0.0.1:0");
        if (origin != null) h.put("origin", origin);
        if (token != null) h.put(LiveLinkServer.TOKEN_HEADER, token);
        int q = path.indexOf('?');
        Map<String, String> query = new LinkedHashMap<>();
        if (q >= 0) for (String p : path.substring(q + 1).split("&")) { String[] kv = p.split("=", 2); query.put(kv[0], kv.length > 1 ? kv[1] : ""); }
        return new LiveLinkServer.Request(method, q < 0 ? path : path.substring(0, q), query, h, body == null ? new byte[0] : body.getBytes(StandardCharsets.UTF_8));
    }

    String pair(LiveLinkServer s) {
        String code = s.openPairing();
        var r = s.handle(req("POST", "/v1/pair", SITE, null, "{\"code\":\"" + code + "\"}"));
        assertEquals(200, r.status(), r.text());
        return Json.str(Json.obj(Json.parse(r.text()), "x").get("token"), "token", 200);
    }

    @Test
    void pairingByClickHandsOutTheTokenOnceAfterZulassen() {
        var s = server(List.of());
        List<String> shown = new ArrayList<>();
        s.onAsk(a -> shown.add(a.device));
        var r = s.handle(req("POST", "/v1/pair/ask", SITE, null, "{\"device\":\"Planer (Chrome)\"}"));
        assertEquals(200, r.status(), r.text());
        String id = Json.str(Json.obj(Json.parse(r.text()), "a").get("request"), "id", 100);
        assertEquals(List.of("Planer (Chrome)"), shown);
        assertEquals("waiting", Json.obj(Json.parse(s.handle(req("GET", "/v1/pair/ask?request=" + id, SITE, null, null)).text()), "s").get("state"));
        assertEquals("Planer (Chrome)", s.approveAsk());
        var ok = Json.obj(Json.parse(s.handle(req("GET", "/v1/pair/ask?request=" + id, SITE, null, null)).text()), "s");
        assertEquals("ok", ok.get("state"));
        String token = Json.str(ok.get("token"), "token", 200);
        assertEquals(200, s.handle(req("GET", "/v1/status", SITE, token, null)).status());
        // Only once: a second poll gets nothing.
        assertEquals("expired", Json.obj(Json.parse(s.handle(req("GET", "/v1/pair/ask?request=" + id, SITE, null, null)).text()), "s").get("state"));
        assertEquals(1, saved.size());
    }

    @Test
    void pairingByClickCanBeDeniedExpiresAndIsLimited() {
        var s = server(List.of());
        String a = Json.str(Json.obj(Json.parse(s.handle(req("POST", "/v1/pair/ask", SITE, null, "{}")).text()), "a").get("request"), "id", 100);
        assertEquals(1, s.denyAsks());
        assertEquals("denied", Json.obj(Json.parse(s.handle(req("GET", "/v1/pair/ask?request=" + a, SITE, null, null)).text()), "s").get("state"));
        assertNull(s.approveAsk());
        for (int i = 0; i < LiveLinkServer.MAX_ASKS; i++) assertEquals(200, s.handle(req("POST", "/v1/pair/ask", SITE, null, "{}")).status());
        assertEquals(429, s.handle(req("POST", "/v1/pair/ask", SITE, null, "{}")).status());
        now.addAndGet(LiveLinkServer.ASK_MS + 1);
        assertNull(s.pendingAsk());
        assertEquals(403, s.handle(req("POST", "/v1/pair/ask", "https://evil.example", null, "{}")).status());
        assertEquals(404, s.handle(req("GET", "/v1/server", SITE, pair(s), null)).status());
    }

    @Test
    void helloNeedsNoTokenAndNamesTheMod() {
        var s = server(List.of());
        var r = s.handle(req("GET", "/v1/hello", SITE, null, null));
        assertEquals(200, r.status());
        var m = Json.obj(Json.parse(r.text()), "hello");
        assertEquals("bauplaner-mod", m.get("app"));
        assertEquals(2.0, m.get("protocol"));
        assertEquals(false, m.get("pairing"));
        assertEquals(SITE, r.headers().get("Access-Control-Allow-Origin"));
        s.openPairing();
        assertEquals(true, Json.obj(Json.parse(s.handle(req("GET", "/v1/hello", SITE, null, null)).text()), "h").get("pairing"));
    }

    @Test
    void baustandIsAFileWithItsNameExposedToTheSite() {
        var s = server(List.of());
        var hello = Json.obj(Json.parse(s.handle(req("GET", "/v1/hello", SITE, null, null)).text()), "hello");
        assertEquals(List.of("scan", "marks2", "players", "bigplans", "team", "pairask", "server", "marks3", "room", "roomfallback", "groups", "terrain", "box"), hello.get("features"));
        assertEquals(401, s.handle(req("GET", "/v1/scan", SITE, null, null)).status());
        String token = pair(s);
        var r = s.handle(req("GET", "/v1/scan", SITE, token, null));
        assertEquals(200, r.status(), r.text());
        assertEquals("application/octet-stream", r.headers().get("Content-Type"));
        assertEquals("haus_r1_x.schem", r.headers().get("X-Bauplaner-File"));
        assertEquals("X-Bauplaner-File", r.headers().get("Access-Control-Expose-Headers"));
        assertArrayEquals(new byte[] { 31, -117, 8 }, r.body());
        assertTrue(calls.contains("scan"));
    }

    @Test
    void foreignOriginsAndHostsAreRejected() {
        var s = server(List.of());
        for (String bad : List.of("https://evil.example", "https://freadeax.github.io.evil.example", "http://localhost.evil.example", "null", "https://freadeax.github.io:443", "https://bauplaner.pages.dev.evil.example", "https://evil.pages.dev")) {
            var r = s.handle(req("GET", "/v1/hello", bad, null, null));
            assertEquals(403, r.status(), bad);
            assertNull(r.headers().get("Access-Control-Allow-Origin"), bad);
        }
        assertEquals(200, s.handle(req("GET", "/v1/hello", "http://127.0.0.1:4173", null, null)).status());
        assertEquals(200, s.handle(req("GET", "/v1/hello", "https://bauplaner.pages.dev", null, null)).status(), "Cloudflare Pages (PERF-06)");
        assertEquals(200, s.handle(req("GET", "/v1/hello", "http://localhost:5173", null, null)).status());
        // DNS rebinding: a page on another name resolving to 127.0.0.1 sends its own Host.
        var rebind = req("GET", "/v1/hello", null, null, null);
        rebind.headers().put("host", "evil.example:0");
        assertEquals(403, s.handle(rebind).status());
        var noHost = req("GET", "/v1/hello", null, null, null);
        noHost.headers().remove("host");
        assertEquals(403, s.handle(noHost).status());
    }

    @Test
    void preflightAllowsTheTokenHeaderAndPrivateNetwork() {
        var s = server(List.of());
        var pre = req("OPTIONS", "/v1/status", SITE, null, null);
        pre.headers().put("access-control-request-private-network", "true");
        var r = s.handle(pre);
        assertEquals(204, r.status());
        assertEquals("true", r.headers().get("Access-Control-Allow-Private-Network"));
        assertTrue(r.headers().get("Access-Control-Allow-Headers").contains("X-Bauplaner-Token"));
    }

    @Test
    void pairingIsSingleUseLimitedAndExpires() {
        var s = server(List.of());
        assertEquals(403, s.handle(req("POST", "/v1/pair", SITE, null, "{\"code\":\"123456\"}")).status(), "keine Kopplung offen");
        String token = pair(s);
        assertTrue(token.length() >= 40);
        assertEquals(List.of(token), saved.get(saved.size() - 1));
        assertFalse(s.pairingOpen(), "Code gilt nur einmal");
        // Wrong codes: five attempts close pairing.
        String code = s.openPairing();
        String wrong = code.equals("000000") ? "111111" : "000000";
        for (int i = 0; i < 4; i++) assertEquals(403, s.handle(req("POST", "/v1/pair", SITE, null, "{\"code\":\"" + wrong + "\"}")).status());
        assertTrue(s.pairingOpen());
        var fifth = s.handle(req("POST", "/v1/pair", SITE, null, "{\"code\":\"" + wrong + "\"}"));
        assertTrue(fifth.text().contains("Zu viele"));
        assertFalse(s.pairingOpen());
        assertEquals(403, s.handle(req("POST", "/v1/pair", SITE, null, "{\"code\":\"" + code + "\"}")).status(), "auch der richtige Code gilt danach nicht mehr");
        // Expiry after five minutes.
        code = s.openPairing();
        now.addAndGet(LiveLinkServer.PAIRING_MS + 1);
        assertEquals(403, s.handle(req("POST", "/v1/pair", SITE, null, "{\"code\":\"" + code + "\"}")).status());
        assertEquals(400, s.handle(req("POST", "/v1/pair", SITE, null, "kein json")).status());
    }

    @Test
    void everyOtherRouteNeedsAValidToken() {
        var s = server(List.of("x".repeat(43)));
        assertEquals(401, s.handle(req("GET", "/v1/status", SITE, null, null)).status());
        assertEquals(401, s.handle(req("GET", "/v1/status", SITE, "y".repeat(43), null)).status());
        assertTrue(calls.isEmpty(), "ohne Schlüssel erreicht nichts das Spiel");
        assertEquals(200, s.handle(req("GET", "/v1/status", SITE, "x".repeat(43), null)).status(), "gespeicherter Schlüssel gilt nach Neustart");
        String token = pair(s);
        assertEquals(200, s.handle(req("GET", "/v1/chunks?c=1,2;3,-4", SITE, token, null)).status());
        assertEquals(400, s.handle(req("GET", "/v1/chunks?c=1;2", SITE, token, null)).status());
        StringBuilder many = new StringBuilder();
        for (int i = 0; i < 65; i++) many.append(i == 0 ? "" : ";").append(i).append(",0");
        assertEquals(400, s.handle(req("GET", "/v1/chunks?c=" + many, SITE, token, null)).status());
        assertEquals(200, s.handle(req("POST", "/v1/plan?name=a.schem", SITE, token, "abc")).status());
        assertEquals(413, s.handle(req("POST", "/v1/plan?name=a.schem", SITE, token, "")).status());
        assertEquals(200, s.handle(req("POST", "/v1/placement", SITE, token, "{\"x\":5}")).status());
        assertEquals(200, s.handle(req("POST", "/v1/marks", SITE, token, "{\"dimension\":\"minecraft:overworld\",\"items\":[{\"kind\":\"point\",\"id\":\"a\",\"name\":\"Lager\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"type\":\"lager\",\"x\":1,\"y\":64,\"z\":2}]}")).status());
        assertEquals(400, s.handle(req("POST", "/v1/marks", SITE, token, "{\"dimension\":\"minecraft:overworld\",\"items\":[{\"kind\":\"point\",\"name\":\"x\",\"dimension\":\"minecraft:overworld\",\"type\":\"bombe\",\"x\":1,\"y\":64,\"z\":2}]}")).status());
        // Protocol 2 (GAME-08): zones, new point types, layer and colour; players route.
        assertEquals(200, s.handle(req("POST", "/v1/marks", SITE, token, "{\"dimension\":\"minecraft:overworld\",\"items\":[{\"kind\":\"zone\",\"id\":\"z\",\"name\":\"Markt\",\"dimension\":\"minecraft:overworld\",\"category\":\"wohnen\",\"points\":[[0,0],[8,0],[8,8]],\"layer\":\"Phase 2\",\"color\":\"#ff8800\"},{\"kind\":\"point\",\"id\":\"g\",\"name\":\"Lava\",\"dimension\":\"minecraft:overworld\",\"type\":\"gefahr\",\"x\":1,\"y\":64,\"z\":2}]}")).status());
        assertEquals(400, s.handle(req("POST", "/v1/marks", SITE, token, "{\"dimension\":\"minecraft:overworld\",\"items\":[{\"kind\":\"zone\",\"name\":\"x\",\"dimension\":\"minecraft:overworld\",\"category\":\"wohnen\",\"points\":[[0,0],[8,0]]}]}")).status(), "Zone mit zwei Ecken");
        assertEquals(400, s.handle(req("POST", "/v1/marks", SITE, token, "{\"dimension\":\"minecraft:overworld\",\"items\":[{\"kind\":\"point\",\"name\":\"x\",\"dimension\":\"minecraft:overworld\",\"type\":\"ziel\",\"x\":1,\"y\":64,\"z\":2,\"color\":\"rot\"}]}")).status(), "Farbe nicht #rrggbb");
        assertEquals(200, s.handle(req("GET", "/v1/players", SITE, token, null)).status());
        assertTrue(new String(s.handle(req("GET", "/v1/hello", SITE, null, null)).body(), StandardCharsets.UTF_8).contains("\"protocol\":2"));
        assertTrue(new String(s.handle(req("GET", "/v1/hello", SITE, null, null)).body(), StandardCharsets.UTF_8).contains("\"features\":[\"scan\",\"marks2\",\"players\",\"bigplans\",\"team\",\"pairask\",\"server\",\"marks3\",\"room\",\"roomfallback\",\"groups\",\"terrain\",\"box\"]"));
        // GAME-07-S11: POST /v1/group needs the key; a handler without groups answers 404.
        assertEquals(401, s.handle(req("POST", "/v1/group", SITE, null, "{\"group\":null}")).status());
        assertEquals(404, s.handle(req("POST", "/v1/group", SITE, token, "{\"group\":null}")).status());
        assertEquals(404, s.handle(req("GET", "/v1/welt-aendern", SITE, token, null)).status());
        // COOP-03: team routes need the key like every other route.
        for (String[] r : new String[][] { { "GET", "/v1/team" }, { "POST", "/v1/team" }, { "POST", "/v1/team/ack" }, { "POST", "/v1/team/push" }, { "GET", "/v1/team/pull" }, { "GET", "/v1/server" }, { "POST", "/v1/server/claim" }, { "POST", "/v1/server/control" }, { "GET", "/v1/room" }, { "POST", "/v1/room" } })
            assertEquals(401, s.handle(req(r[0], r[1], SITE, null, "{}")).status(), r[1] + " ohne Schlüssel");
        assertEquals(List.of("status", "chunks 2", "plan a.schem 3", "placement 5.0", "marks 1", "marks 2", "players"), calls);
        assertEquals(200, s.handle(req("POST", "/v1/unpair", SITE, token, null)).status());
        assertEquals(401, s.handle(req("GET", "/v1/status", SITE, token, null)).status(), "nach dem Trennen ungültig");
        s.revokeAll();
        assertEquals(401, s.handle(req("GET", "/v1/status", SITE, "x".repeat(43), null)).status());
    }

    @Test
    void realSocketOnLoopbackOnly() throws Exception {
        var s = server(List.of());
        s.start(freePort());
        try {
            String code = s.openPairing();
            String hello = exchange(s.port(), "GET /v1/hello HTTP/1.1\r\nHost: 127.0.0.1:" + s.port() + "\r\nOrigin: " + SITE + "\r\n\r\n");
            assertTrue(hello.startsWith("HTTP/1.1 200"), hello);
            assertTrue(hello.contains("Access-Control-Allow-Origin: " + SITE));
            String body = "{\"code\":\"" + code + "\"}";
            String paired = exchange(s.port(), "POST /v1/pair HTTP/1.1\r\nHost: localhost:" + s.port() + "\r\nContent-Type: application/json\r\nContent-Length: " + body.length() + "\r\n\r\n" + body);
            assertTrue(paired.startsWith("HTTP/1.1 200"), paired);
            String bad = exchange(s.port(), "GET /v1/status HTTP/1.1\r\nHost: 127.0.0.1:" + s.port() + "\r\nTransfer-Encoding: chunked\r\n\r\n");
            assertTrue(bad.startsWith("HTTP/1.1 411"), bad);
        } finally {
            s.close();
        }
        assertFalse(s.running());
    }

    @Test
    void requestParserHandlesQueryAndLimits() throws Exception {
        var r = LiveLinkServer.read(new ByteArrayInputStream("GET /v1/chunks?c=1%2C2%3B3%2C4&x HTTP/1.1\r\nHost: a\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1)));
        assertEquals("/v1/chunks", r.path());
        assertEquals("1,2;3,4", r.query().get("c"));
        assertNull(LiveLinkServer.read(new ByteArrayInputStream("Unsinn\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1))));
        byte[] huge = ("GET / HTTP/1.1\r\nX: " + "a".repeat(20_000) + "\r\n\r\n").getBytes(StandardCharsets.ISO_8859_1);
        assertThrows(LiveLinkServer.HttpError.class, () -> LiveLinkServer.read(new ByteArrayInputStream(huge)));
    }

    @Test
    void jsonReaderIsStrict() {
        assertEquals(Map.of("a", List.of(1.0, "x", true)), Json.parse(" {\"a\":[1,\"x\",true]} "));
        assertEquals("ä\n\"", Json.parse("\"\\u00e4\\n\\\"\""));
        for (String bad : List.of("{", "{\"a\":1,}", "[1 2]", "{\"a\":1,\"a\":2}", "nul", "1e999", "\"\u0001\"", "{} x"))
            assertThrows(Json.JsonException.class, () -> Json.parse(bad), bad);
        StringBuilder deep = new StringBuilder();
        for (int i = 0; i < 40; i++) deep.append('[');
        assertThrows(Json.JsonException.class, () -> Json.parse(deep.toString()));
        assertEquals("\"a\\\"b\\u0001\"", Json.quote("a\"b\u0001"));
        assertEquals("3", Json.num(3.0));
        assertEquals("-1.5", Json.num(-1.5));
        assertEquals(2, Json.integer(2.0, "x", 0, 5));
        assertThrows(Json.JsonException.class, () -> Json.integer(2.5, "x", 0, 5));
    }

    @Test
    void marksAndSurfaceRuns() {
        var m = WorldMarks.parse(Json.obj(Json.parse("""
            {"dimension":"minecraft:overworld","items":[
             {"kind":"site","id":"s","name":"Markt","note":"","dimension":"minecraft:overworld","minX":0,"minZ":0,"width":16,"length":8,"y":null,"projectId":null},
             {"kind":"path","id":"p","name":"Weg","note":"","dimension":"minecraft:overworld","style":"weg","width":3,"points":[[0,0],[10,0]]},
             {"kind":"point","id":"a","name":"Lager","note":"","dimension":"minecraft:overworld","type":"lager","x":100,"y":64,"z":0},
             {"kind":"point","id":"b","name":"Portal","note":"","dimension":"minecraft:the_nether","type":"portal","x":0,"y":64,"z":0}]}"""), "m"));
        assertEquals(3, m.size(), "andere Dimension bleibt draußen");
        assertNull(m.sites().get(0).y());
        assertEquals(WorldMarks.Extras.NONE, m.points().get(0).extras(), "Schema 1 ohne Ebene und Farbe");
        var z = WorldMarks.parse(Json.obj(Json.parse("""
            {"dimension":"minecraft:overworld","items":[
             {"kind":"zone","id":"z","name":"Hof","note":"","dimension":"minecraft:overworld","category":"lager","points":[[0,0],[10,0],[10,10],[5,5],[0,10]],"layer":" Phase 2 ","color":"#FF8800"},
             {"kind":"point","id":"s","name":"Bett","note":"","dimension":"minecraft:overworld","type":"spawn","x":3,"y":64,"z":3,"layer":"Phase 2"}]}"""), "z"));
        assertEquals(2, z.size());
        var zone = z.zones().get(0);
        assertEquals("Phase 2", zone.extras().layer(), "Ebene getrimmt");
        assertEquals(0xFFFF8800, zone.extras().color());
        assertEquals(0xFFFF8800, WorldMarks.color(zone.extras(), WorldMarks.zoneColor("lager")));
        assertTrue(zone.contains(2.5, 2.5), "innen");
        assertTrue(!zone.contains(5.5, 8.5), "in der Kerbe des Polygons");
        assertTrue(!zone.contains(12, 2), "außen");
        assertEquals("Hof", z.zoneAt(1.5, 1.5).name());
        assertNull(z.zoneAt(12, 12));
        assertEquals(java.util.Map.of("Phase 2", 2), z.layers());
        assertThrows(Json.JsonException.class, () -> WorldMarks.parse(Json.obj(Json.parse("""
            {"dimension":"minecraft:overworld","items":[{"kind":"zone","name":"x","dimension":"minecraft:overworld","category":"park","points":[[0,0],[1,0],[1,1]]}]}"""), "x")), "Zonenart unbekannt");
        assertEquals("Lager", m.nearestPoint(0, 0).name());
        assertEquals("O", WorldMarks.direction(0, 0, 100, 0));
        assertEquals("N", WorldMarks.direction(0, 0, 0, -5));
        assertEquals("SW", WorldMarks.direction(0, 0, -5, 5));
        // Column: plant, leaves, log, grass, dirt ... → stops when the second solid run starts.
        String[] col = new String[100];
        col[80] = "minecraft:short_grass"; col[79] = "minecraft:oak_leaves"; col[78] = "minecraft:oak_leaves";
        col[77] = "minecraft:oak_log"; col[76] = "minecraft:oak_log"; col[75] = "minecraft:grass_block";
        for (int y = 0; y < 75; y++) col[y] = y > 71 ? "minecraft:dirt" : "minecraft:stone";
        int[] reads = { 0 };
        var runs = SurfaceRuns.scan(new SurfaceRuns.Column() {
            public String id(int y) { reads[0]++; return col[y] == null ? "minecraft:air" : col[y]; }
            public boolean solid(int y) { return col[y] != null && !col[y].contains("leaves") && !col[y].contains("short_grass"); }
        }, 80, -64);
        assertEquals(List.of(new SurfaceRuns.Run(80, "minecraft:short_grass"), new SurfaceRuns.Run(79, "minecraft:oak_leaves"), new SurfaceRuns.Run(77, "minecraft:oak_log"),
                new SurfaceRuns.Run(75, "minecraft:grass_block")), runs);
        assertEquals(6, reads[0], "liest nur bis zum zweiten festen Abschnitt");
        assertEquals("[80,0,79,1]", LiveLinkServer.runs(List.of(new int[] { 80, 0 }, new int[] { 79, 1 })));
    }

    private static int freePort() throws Exception {
        try (var ss = new java.net.ServerSocket(0, 1, InetAddress.getLoopbackAddress())) { return ss.getLocalPort(); }
    }

    private static String exchange(int port, String request) throws Exception {
        try (Socket c = new Socket(InetAddress.getLoopbackAddress(), port)) {
            c.setSoTimeout(5000);
            OutputStream out = c.getOutputStream();
            out.write(request.getBytes(StandardCharsets.UTF_8));
            out.flush();
            InputStream in = c.getInputStream();
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
