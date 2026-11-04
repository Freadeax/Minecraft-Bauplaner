package io.github.freadeax.bauplaner.mod.room;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.team.TeamState;
import io.github.freadeax.bauplaner.mod.team.TeamSync;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** LINK-07: team room without a server file – folding, config checks and (with BAUPLANER_ROOM) the real room. */
class RoomClientTest {
    static final String HEADER = """
        {"format":"minecraft-bauplaner-team-server","formatVersion":1,"teamId":"team_room01","name":"Burg am See","founder":"mem_lea",
         "dimension":"minecraft:overworld","members":[{"id":"mem_lea","name":"Lea","player":"LeaBaut"},{"id":"mem_tom","name":"Tom"}],
         "sections":[{"id":"sec_a","name":"Torhaus","boxes":[[0,60,0,9,70,9]]},{"id":"sec_b","name":"Mauer","boxes":[[10,60,0,30,66,4]]}],"events":[]}""";

    static JsonObject event(String id, String at, String by, String kind, String extra) {
        return JsonParser.parseString("{\"id\":\"" + id + "\",\"at\":\"" + at + "\",\"by\":\"" + by + "\",\"origin\":\"planer\",\"kind\":\"" + kind + "\"" + extra + "}").getAsJsonObject();
    }

    @Test
    void foldsLikeThePluginIntoTheGameFormat() {
        TeamLog log = new TeamLog(JsonParser.parseString(HEADER).getAsJsonObject());
        log.add(event("tev_1", "2026-11-04T10:00:00.000Z", "mem_lea", "member.join", ",\"member\":\"mem_tom\",\"name\":\"Tom\""));
        log.add(event("tev_2", "2026-11-04T10:01:00.000Z", "mem_tom", "section.claim", ",\"section\":\"sec_b\""));
        log.add(event("tev_3", "2026-11-04T10:02:00.000Z", "mem_tom", "section.claim", ",\"section\":\"sec_b\""));
        Map<String, Object> m = RoomState.of(log, log.view(), "mem_tom");
        TeamState s = TeamState.parse(m, TeamState.Source.ROOM);
        assertEquals("team_room01", s.teamId());
        assertEquals("mem_tom", s.me());
        assertEquals(2, s.sections().size());
        assertEquals("mem_tom", s.sections().get(1).owner());
        assertEquals("vergeben", s.sections().get(1).status());
        assertEquals("frei", s.sections().get(0).status());
        assertTrue(s.sectionAt("minecraft:overworld", 12, 61, 2).isPresent());
        assertEquals("leitung", s.roleOf("mem_lea"));
    }

    @Test
    void acceptsOnlySafeRooms() {
        Map<String, Object> ok = Map.of("url", "https://bauplaner-team.team-room.workers.dev/", "room", "r_abc12345", "key", "k", "member", "mem_tom");
        RoomClient.Config c = RoomClient.parse(ok);
        assertEquals("https://bauplaner-team.team-room.workers.dev", c.url());
        assertTrue(!c.publicFields().containsKey("key"), "Schlüssel nie in der öffentlichen Antwort");
        assertThrows(IllegalArgumentException.class, () -> RoomClient.parse(Map.of("url", "http://example.org", "room", "r_abc12345", "key", "k", "member", "m")));
        assertThrows(IllegalArgumentException.class, () -> RoomClient.parse(Map.of("url", "https://x.dev", "room", "../etc", "key", "k", "member", "m")));
        RoomClient.parse(Map.of("url", "http://127.0.0.1:8787", "room", "r_abc12345", "key", "k", "member", "m"));
    }

    @Test
    void storesTheRoomButForgetsItCompletely() throws Exception {
        Path dir = Files.createTempDirectory("raum");
        Path f = dir.resolve("raum.json");
        RoomClient r = new RoomClient(f, t -> { });
        r.use(RoomClient.parse(Map.of("url", "http://127.0.0.1:9", "room", "r_abc12345", "key", "geheim", "member", "mem_tom", "teamName", "Burg")));
        assertTrue(Files.readString(f).contains("mem_tom"));
        RoomClient again = new RoomClient(f, t -> { });
        assertEquals("Burg", again.config().teamName());
        again.forget();
        assertTrue(!Files.exists(f));
        r.close(); again.close();
    }

    /** Against a running team room: BAUPLANER_ROOM=http://127.0.0.1:8787 (npx wrangler dev) or the deployed one. */
    @Test
    @EnabledIfEnvironmentVariable(named = "BAUPLANER_ROOM", matches = ".+")
    void liveWithTheRealRoomWithoutAnyServer() throws Exception {
        String base = System.getenv("BAUPLANER_ROOM").replaceAll("/+$", "");
        HttpClient http = HttpClient.newHttpClient();
        JsonObject created = JsonParser.parseString(http.send(HttpRequest.newBuilder(URI.create(base + "/v1/rooms")).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"teamId\":\"team_room01\",\"name\":\"Burg am See\"}")).build(), HttpResponse.BodyHandlers.ofString()).body()).getAsJsonObject();
        String room = created.get("room").getAsString(), admin = created.get("adminKey").getAsString(), member = created.get("memberKey").getAsString();
        var put = http.send(HttpRequest.newBuilder(URI.create(base + "/v1/rooms/" + room + "/header")).header("Content-Type", "application/json").header("Authorization", "Bearer " + admin)
                .PUT(HttpRequest.BodyPublishers.ofString(HEADER)).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, put.statusCode(), put.body());
        // The planner (Lea) adds Tom to the team before Tom's game connects.
        post(http, base, room, admin, "{\"batch\":\"b1\",\"events\":[" + event("tev_join", "2026-11-04T10:00:00.000Z", "mem_lea", "member.join", ",\"member\":\"mem_tom\",\"name\":\"Tom\"") + "]}");

        List<String> said = new ArrayList<>();
        TeamSync sync = new TeamSync(Files.createTempDirectory("team"), "test", System::currentTimeMillis, said::add);
        RoomClient client = new RoomClient(null, said::add);
        sync.room(client);
        client.use(RoomClient.parse(Map.of("url", base, "room", room, "key", member, "member", "mem_tom", "teamName", "Burg am See")));
        for (int i = 0; i < 100 && !(client.live() && sync.state() != null); i++) Thread.sleep(100);
        assertTrue(client.live(), "live: " + client.status() + " " + client.lastError());
        TeamState s = sync.state();
        assertNotNull(s);
        assertEquals(TeamState.Source.ROOM, s.source());
        assertEquals("mem_tom", s.me());

        // Tom takes section 2 in the game: the event goes to the room, the room confirms, the state shows it.
        String text = sync.act("section.claim", new java.util.LinkedHashMap<>(Map.of("section", "sec_b")), "Abschnitt 2 übernommen");
        assertTrue(text.contains("Team-Raum"), text);
        for (int i = 0; i < 100 && !sync.outbox().pending().isEmpty(); i++) Thread.sleep(100);
        assertTrue(sync.outbox().pending().isEmpty(), "vom Raum bestätigt");
        for (int i = 0; i < 50 && !"mem_tom".equals(ownerB(sync)); i++) Thread.sleep(100);
        assertEquals("mem_tom", ownerB(sync));
        String events = http.send(HttpRequest.newBuilder(URI.create(base + "/v1/rooms/" + room + "/events?after=")).header("Authorization", "Bearer " + admin).build(), HttpResponse.BodyHandlers.ofString()).body();
        assertTrue(events.contains("\"section.claim\"") && events.contains("\"mem_tom\""), events);

        // Lea (planner) writes a note: it arrives in the game by push.
        post(http, base, room, admin, "{\"batch\":\"b2\",\"events\":[" + event("tev_note", "2026-11-04T10:05:00.000Z", "mem_lea", "note.add", ",\"noteId\":\"note_1\",\"tag\":\"info\",\"text\":\"Steine liegen am Tor\"") + "]}");
        for (int i = 0; i < 50 && sync.state().notes().isEmpty(); i++) Thread.sleep(100);
        assertEquals("Steine liegen am Tor", sync.state().notes().get(0).text());

        // Position for the live map: the planner's socket sees Tom with player name and block position.
        java.util.concurrent.LinkedBlockingQueue<String> planner = new java.util.concurrent.LinkedBlockingQueue<>();
        var ws = http.newWebSocketBuilder().buildAsync(URI.create(base.replaceFirst("^http", "ws") + "/v1/rooms/" + room + "/live"), new java.net.http.WebSocket.Listener() {
            final StringBuilder buf = new StringBuilder();
            @Override public java.util.concurrent.CompletionStage<?> onText(java.net.http.WebSocket w, CharSequence d, boolean last) {
                buf.append(d); if (last) { planner.add(buf.toString()); buf.setLength(0); } w.request(1); return null;
            }
        }).get();
        ws.sendText("{\"type\":\"hello\",\"key\":\"" + admin + "\",\"member\":\"mem_lea\",\"device\":\"planer-test\",\"where\":\"planer\"}", true).get();
        client.player("TomBaut");
        assertTrue(client.position(12, 64, 3, "minecraft:overworld", 90, System.currentTimeMillis() + 10_000));
        assertTrue(!client.position(12, 64, 4, "minecraft:overworld", 90, System.currentTimeMillis() + 10_500), "kaum bewegt, zu früh");
        String seen = null;
        for (int i = 0; i < 50 && seen == null; i++) { String m = planner.poll(200, java.util.concurrent.TimeUnit.MILLISECONDS); if (m != null && m.contains("\"TomBaut\"") && m.contains("\"x\":12")) seen = m; }
        assertNotNull(seen, "Position kam beim Planer an");

        // The planner asks for a recording: the game gets the ask and uploads the file into the room.
        java.util.concurrent.LinkedBlockingQueue<RoomClient.Ask> asks = new java.util.concurrent.LinkedBlockingQueue<>();
        client.onAsk(asks::add);
        ws.sendText("{\"type\":\"ask\",\"what\":\"scan\",\"projectId\":\"prj_burg\"}", true).get();
        RoomClient.Ask ask = asks.poll(5, java.util.concurrent.TimeUnit.SECONDS);
        assertNotNull(ask, "Anforderung kam im Spiel an");
        assertEquals("prj_burg", ask.projectId());
        byte[] gz = gzip("Baustand".getBytes());
        Map<String, Object> up = client.uploadScan("burg-baustand.litematic", gz, "prj_burg", 3);
        assertEquals("prj_burg", up.get("projectId"));
        String list = http.send(HttpRequest.newBuilder(URI.create(base + "/v1/rooms/" + room + "/scans")).header("Authorization", "Bearer " + admin).build(), HttpResponse.BodyHandlers.ofString()).body();
        assertTrue(list.contains("burg-baustand.litematic"), list);
        var file = http.send(HttpRequest.newBuilder(URI.create(base + "/v1/rooms/" + room + "/scans/" + up.get("id"))).header("Authorization", "Bearer " + admin).build(), HttpResponse.BodyHandlers.ofByteArray());
        assertEquals(200, file.statusCode());
        assertTrue(java.util.Arrays.equals(gz, file.body()), "Datei unverändert");

        // What the game measured goes straight into the log (unverified, by Tom).
        assertTrue(client.report("section.seen", new java.util.LinkedHashMap<>(Map.of("section", "sec_b", "placed", 40, "total", 120))));
        String log = "";
        for (int i = 0; i < 50 && !log.contains("section.seen"); i++) {
            Thread.sleep(100);
            log = http.send(HttpRequest.newBuilder(URI.create(base + "/v1/rooms/" + room + "/events?after=")).header("Authorization", "Bearer " + admin).build(), HttpResponse.BodyHandlers.ofString()).body();
        }
        assertTrue(log.contains("\"section.seen\"") && log.contains("\"placed\":40"), log);
        ws.abort();
        client.forget();
        client.close();
    }

    private static byte[] gzip(byte[] raw) throws Exception {
        var out = new java.io.ByteArrayOutputStream();
        try (var z = new java.util.zip.GZIPOutputStream(out)) { z.write(raw); }
        return out.toByteArray();
    }

    private static String ownerB(TeamSync sync) {
        TeamState s = sync.roomState();
        return s == null ? null : s.sections().get(1).owner();
    }

    private static void post(HttpClient http, String base, String room, String key, String body) throws Exception {
        var r = http.send(HttpRequest.newBuilder(URI.create(base + "/v1/rooms/" + room + "/events")).header("Content-Type", "application/json").header("Authorization", "Bearer " + key)
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, r.statusCode(), r.body());
        assertTrue(!Json.obj(Json.parse(r.body()), "Antwort").containsKey("error"), r.body());
    }
}
