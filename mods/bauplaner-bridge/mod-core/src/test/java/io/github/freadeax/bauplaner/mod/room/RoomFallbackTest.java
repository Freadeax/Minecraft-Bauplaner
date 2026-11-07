package io.github.freadeax.bauplaner.mod.room;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.github.freadeax.bauplaner.mod.team.TeamState;
import io.github.freadeax.bauplaner.mod.team.TeamSync;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.BooleanSupplier;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * FALLBACK-01: the mod keeps working when the team room is only partly reachable. A small room stand-in
 * (same HTTP routes as services/team-room, but without WebSocket – like a proxy that blocks upgrades) checks
 * polling over HTTP, the stored state after a restart without network, and measurements sent after an outage.
 */
class RoomFallbackTest {
    static final String ROOM = "r_fallback1";

    /** Room stand-in: header, events with arrival numbers, POST with batch answers; /live is refused. */
    static final class FakeRoom {
        final HttpServer server;
        final List<JsonObject> rows = new CopyOnWriteArrayList<>();
        final List<String> gets = new CopyOnWriteArrayList<>();
        final List<String> wsTries = new CopyOnWriteArrayList<>();
        /** Stores POSTed events but answers 503 – like an answer lost on the way back. */
        volatile boolean loseAnswers;

        FakeRoom(int port) throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
            server.createContext("/v1/rooms/" + ROOM, this::handle);
            server.start();
        }

        int port() { return server.getAddress().getPort(); }

        void stop() { server.stop(0); }

        synchronized void add(JsonObject e) { rows.add(e); }

        private void handle(HttpExchange x) throws IOException {
            String path = x.getRequestURI().getPath().substring(("/v1/rooms/" + ROOM).length());
            if (!"Bearer mitglied".equals(x.getRequestHeaders().getFirst("Authorization"))) { send(x, 401, "{\"error\":\"key\"}"); return; }
            switch (path) {
                case "/header" -> send(x, 200, RoomClientTest.HEADER);
                case "/live" -> { wsTries.add("x"); send(x, 404, "{\"error\":\"kein WebSocket hier\"}"); }
                case "/events" -> {
                    if ("POST".equals(x.getRequestMethod())) {
                        JsonObject body = JsonParser.parseString(new String(x.getRequestBody().readAllBytes(), StandardCharsets.UTF_8)).getAsJsonObject();
                        JsonArray accepted = new JsonArray(), known = new JsonArray();
                        synchronized (this) {
                            for (JsonElement e : body.getAsJsonArray("events")) {
                                String id = e.getAsJsonObject().get("id").getAsString();
                                if (rows.stream().anyMatch(r -> r.get("id").getAsString().equals(id))) known.add(id);
                                else { rows.add(e.getAsJsonObject()); accepted.add(id); }
                            }
                        }
                        if (loseAnswers) { send(x, 503, "{\"error\":\"weg\"}"); return; }
                        send(x, 200, "{\"cursor\":\"" + rows.size() + "\",\"accepted\":" + accepted + ",\"known\":" + known + ",\"rejected\":[]}");
                    } else {
                        String q = x.getRequestURI().getRawQuery();
                        String after = q == null ? "" : java.util.Arrays.stream(q.split("&")).filter(p -> p.startsWith("after=")).map(p -> p.substring(6)).findFirst().orElse("");
                        gets.add(after);
                        int n = after.isEmpty() ? 0 : Integer.parseInt(after);
                        JsonArray out = new JsonArray();
                        List<JsonObject> snap = new ArrayList<>(rows);
                        boolean reset = n > snap.size();
                        if (reset) n = 0;
                        for (int i = n; i < snap.size(); i++) out.add(snap.get(i));
                        send(x, 200, "{\"events\":" + out + ",\"cursor\":\"" + snap.size() + "\",\"more\":false" + (reset ? ",\"reset\":true" : "") + "}");
                    }
                }
                default -> send(x, 404, "{\"error\":\"?\"}");
            }
        }

        private static void send(HttpExchange x, int code, String body) throws IOException {
            byte[] b = body.getBytes(StandardCharsets.UTF_8);
            x.getResponseHeaders().set("Content-Type", "application/json");
            x.sendResponseHeaders(code, b.length);
            x.getResponseBody().write(b);
            x.close();
        }

        boolean has(String kind) { return rows.stream().anyMatch(r -> kind.equals(r.get("kind").getAsString())); }

        JsonObject first(String kind) { return rows.stream().filter(r -> kind.equals(r.get("kind").getAsString())).findFirst().orElse(null); }
    }

    private long every, soon, welcome;

    @BeforeEach
    void fast() {
        every = RoomClient.pollEveryMs; soon = RoomClient.pollSoonMs; welcome = RoomClient.welcomeTimeoutMs;
        RoomClient.pollEveryMs = 150; RoomClient.pollSoonMs = 50; RoomClient.welcomeTimeoutMs = 1_000; RoomClient.resendAfterMs = 200;
    }

    @AfterEach
    void back() { RoomClient.pollEveryMs = every; RoomClient.pollSoonMs = soon; RoomClient.welcomeTimeoutMs = welcome; RoomClient.resendAfterMs = 10_000; }

    static void until(BooleanSupplier ok, String what) throws InterruptedException {
        for (int i = 0; i < 200 && !ok.getAsBoolean(); i++) Thread.sleep(50);
        assertTrue(ok.getAsBoolean(), what);
    }

    static Map<String, Object> config(int port) {
        return Map.of("url", "http://127.0.0.1:" + port, "room", ROOM, "key", "mitglied", "member", "mem_tom", "teamName", "Burg am See");
    }

    @Test
    void withoutWebSocketTheModPollsOverHttpAndStillSendsEverything() throws Exception {
        FakeRoom room = new FakeRoom(0);
        room.add(RoomClientTest.event("tev_join", "2026-11-04T10:00:00.000Z", "mem_lea", "member.join", ",\"member\":\"mem_tom\",\"name\":\"Tom\""));
        List<String> said = new CopyOnWriteArrayList<>();
        TeamSync sync = new TeamSync(Files.createTempDirectory("team"), "test", System::currentTimeMillis, said::add);
        RoomClient client = new RoomClient(null, said::add);
        sync.room(client);
        try {
            client.use(RoomClient.parse(config(room.port())));
            until(() -> client.status() == RoomClient.Status.POLL, "nach zwei WebSocket-Fehlversuchen über HTTP: " + client.status() + " " + client.lastError());
            assertTrue(client.live(), "HTTP zählt als live");
            assertEquals("http", client.mode());
            assertTrue(said.stream().anyMatch(t -> t.contains("über HTTP")), said.toString());
            until(() -> sync.state() != null && "mem_tom".equals(sync.state().me()), "Teamstand aus dem Raum");
            assertEquals(TeamState.Source.ROOM, sync.state().source());

            // Own action: goes out by POST, the room confirms, the outbox is empty.
            sync.act("section.claim", new LinkedHashMap<>(Map.of("section", "sec_b")), "Abschnitt 2 übernommen");
            until(() -> sync.outbox().pending().isEmpty(), "Ausgangskorb über HTTP geleert");
            assertTrue(room.has("section.claim"));
            until(() -> "mem_tom".equals(sync.roomState().sections().get(1).owner()), "eigene Übernahme kommt per Abfrage zurück");

            // Someone else writes in the planner: arrives by the next poll.
            room.add(RoomClientTest.event("tev_note", "2026-11-04T10:05:00.000Z", "mem_lea", "note.add", ",\"noteId\":\"note_1\",\"tag\":\"info\",\"text\":\"Steine am Tor\""));
            until(() -> !sync.state().notes().isEmpty(), "Notiz per Abfrage");

            // A measurement goes out directly.
            assertTrue(client.report("section.seen", new LinkedHashMap<>(Map.of("section", "sec_a", "placed", 10, "total", 50))));
            until(() -> room.has("section.seen"), "Messung über HTTP");
            until(() -> client.pendingReports() == 0, "vom Raum bestätigt");

            // The answer to a measurement gets lost: it stays waiting and goes out again with the same id.
            room.loseAnswers = true;
            assertTrue(client.report("store.seen", new LinkedHashMap<>(Map.of("chest", "ch_1", "items", Map.of("minecraft:stone", 12)))));
            until(() -> room.has("store.seen"), "Messung im Raum angekommen");
            Thread.sleep(300);
            assertEquals(1, client.pendingReports(), "ohne Antwort bleibt sie gemerkt");
            room.loseAnswers = false;
            until(() -> client.pendingReports() == 0, "beim nächsten Versuch bestätigt (known)");
            assertEquals(1, room.rows.stream().filter(r -> "store.seen".equals(r.get("kind").getAsString())).count(), "nicht doppelt im Raum");
        } finally { client.close(); room.stop(); }
    }

    @Test
    void afterARestartWithoutNetworkTheLastStateIsShownAndMeasurementsWait() throws Exception {
        Path dir = Files.createTempDirectory("raum-stand");
        Path f = dir.resolve("raum.json");
        FakeRoom room = new FakeRoom(0);
        int port = room.port();
        room.add(RoomClientTest.event("tev_join", "2026-11-04T10:00:00.000Z", "mem_lea", "member.join", ",\"member\":\"mem_tom\",\"name\":\"Tom\""));
        room.add(RoomClientTest.event("tev_claim", "2026-11-04T10:01:00.000Z", "mem_lea", "section.claim", ",\"section\":\"sec_a\""));
        RoomClient first = new RoomClient(f, t -> { });
        first.use(RoomClient.parse(config(port)));
        until(() -> first.live() && first.events() == 2, "erster Kontakt: " + first.status() + " " + first.lastError());
        first.close(); // writes raum-stand.json
        room.stop();
        assertTrue(Files.isRegularFile(dir.resolve("raum-stand.json")), "Stand gespeichert");
        assertTrue(!Files.readString(dir.resolve("raum-stand.json")).contains("mitglied"), "Schlüssel nie im gespeicherten Stand");

        // Game restarts, the room is unreachable: the team state is there anyway.
        List<String> said = new CopyOnWriteArrayList<>();
        TeamSync sync = new TeamSync(Files.createTempDirectory("team"), "test", System::currentTimeMillis, said::add);
        RoomClient again = new RoomClient(f, said::add);
        sync.room(again);
        FakeRoom back = null;
        try {
            until(() -> again.status() == RoomClient.Status.RETRY, "Raum weg: " + again.status());
            TeamState s = sync.state();
            assertNotNull(s, "Teamstand aus raum-stand.json");
            assertEquals("mem_lea", s.sections().get(0).owner());
            assertTrue(again.statusText().contains("zeigt den Stand von"), again.statusText());

            // Measurement while offline: kept (newest per section), with the time of the measurement.
            assertTrue(again.report("section.seen", new LinkedHashMap<>(Map.of("section", "sec_a", "placed", 5, "total", 50))));
            Thread.sleep(20);
            assertTrue(again.report("section.seen", new LinkedHashMap<>(Map.of("section", "sec_a", "placed", 7, "total", 50))));
            assertEquals(1, again.pendingReports());
            assertTrue(again.statusText().contains("1 Meldung wartet"), again.statusText());

            // The room is back (same address): only the rest is fetched, the waiting measurement goes out.
            back = new FakeRoom(port);
            back.rows.addAll(room.rows);
            back.add(RoomClientTest.event("tev_done", "2026-11-04T11:00:00.000Z", "mem_lea", "note.add", ",\"noteId\":\"note_2\",\"tag\":\"info\",\"text\":\"Weiter\""));
            again.connect();
            FakeRoom b = back;
            until(() -> b.has("section.seen"), "gemerkte Messung nachgereicht: " + again.status() + " " + again.lastError());
            JsonObject seen = b.first("section.seen");
            assertEquals(7, seen.get("placed").getAsInt(), "nur die neueste Messung");
            until(() -> again.pendingReports() == 0, "nachgereichte Messung bestätigt");
            assertTrue(!b.gets.isEmpty() && "2".equals(b.gets.get(0)), "nur der Rest ab dem gespeicherten Cursor: " + b.gets);
            until(() -> again.events() == 4, "neues Ereignis dazu, nichts doppelt: " + again.events());
        } finally { again.close(); if (back != null) back.stop(); }
    }

    @Test
    void aClaimTakenOfflineInSingleplayerSurvivesARestartAndGoesOutOnce() throws Exception {
        // LINK-09 (found by the Block C game test): the outbox of a singleplayer world is saved under the world key.
        Path dir = Files.createTempDirectory("raum-stand");
        Path f = dir.resolve("raum.json");
        Path team = Files.createTempDirectory("team");
        FakeRoom room = new FakeRoom(0);
        int port = room.port();
        room.add(RoomClientTest.event("tev_join", "2026-11-04T10:00:00.000Z", "mem_lea", "member.join", ",\"member\":\"mem_tom\",\"name\":\"Tom\""));
        RoomClient first = new RoomClient(f, t -> { });
        first.use(RoomClient.parse(config(port)));
        until(() -> first.live() && first.events() == 1, "erster Kontakt: " + first.status() + " " + first.lastError());
        first.close();
        room.stop();

        // Offline: the claim waits.
        List<String> said = new CopyOnWriteArrayList<>();
        TeamSync sync = new TeamSync(team, "test", System::currentTimeMillis, said::add);
        RoomClient offline = new RoomClient(f, said::add);
        sync.room(offline);
        sync.join("welt:Testwelt", null);
        FakeRoom back = null;
        RoomClient again;
        try {
            until(() -> offline.status() == RoomClient.Status.RETRY && sync.state() != null, "Raum weg: " + offline.status());
            String answer = sync.act("section.claim", new LinkedHashMap<>(Map.of("section", "sec_b")), "Abschnitt 2 übernommen");
            assertTrue(answer.contains("wartet"), answer);
            assertEquals(1, sync.outbox().pending().size());
        } finally { offline.close(); }

        // Game restarted, same world: the claim is still there and goes out exactly once when the room is back.
        TeamSync restarted = new TeamSync(team, "test", System::currentTimeMillis, t -> { });
        again = new RoomClient(f, t -> { });
        restarted.room(again);
        restarted.join("welt:Testwelt", null);
        try {
            assertEquals(1, restarted.outbox().pending().size(), "Übernahme nach dem Neustart noch im Ausgangskorb");
            back = new FakeRoom(port);
            back.rows.addAll(room.rows);
            again.connect();
            FakeRoom b = back;
            until(() -> { restarted.tick(); return b.has("section.claim"); }, "Übernahme nachgereicht: " + again.status() + " " + again.lastError());
            until(() -> { restarted.tick(); return restarted.outbox().pending().isEmpty(); }, "vom Raum bestätigt");
            for (int i = 0; i < 5; i++) { restarted.tick(); Thread.sleep(60); }
            Thread.sleep(300);
            assertEquals(1, b.rows.stream().filter(r -> "section.claim".equals(r.get("kind").getAsString())).count(), "genau einmal im Raum");
        } finally { again.close(); if (back != null) back.stop(); }
    }

    @Test
    void aDifferentRoomDropsTheStoredState() throws Exception {
        Path dir = Files.createTempDirectory("raum-wechsel");
        Path f = dir.resolve("raum.json");
        FakeRoom room = new FakeRoom(0);
        room.add(RoomClientTest.event("tev_join", "2026-11-04T10:00:00.000Z", "mem_lea", "member.join", ",\"member\":\"mem_tom\",\"name\":\"Tom\""));
        RoomClient c = new RoomClient(f, t -> { });
        try {
            c.use(RoomClient.parse(config(room.port())));
            until(() -> c.live() && c.events() == 1, "verbunden");
            c.saveNow();
            assertTrue(Files.isRegularFile(dir.resolve("raum-stand.json")));
            c.forget();
            assertTrue(!Files.exists(dir.resolve("raum-stand.json")), "Trennen löscht auch den gespeicherten Stand");
        } finally { c.close(); room.stop(); }
    }
}
