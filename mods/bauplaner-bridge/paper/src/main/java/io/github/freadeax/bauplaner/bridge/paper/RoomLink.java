package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.github.freadeax.bauplaner.mod.live.WsQueue;
import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.bukkit.Bukkit;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

/**
 * Live team room (team-room v1, docs/architecture/team/TEAM_LIVE.md): the server connects outward over
 * {@code wss://ROOM/v1/rooms/RID/live} with its own server key, uploads every event it writes and takes
 * the planner's events as they arrive – no team file is copied any more.
 * <ul>
 *   <li>State per team in {@code team/<teamId>.room.json}: room address, room id, server key, device id,
 *       cursor (arrival number in the room) and the outbox (ids not yet confirmed by the room).</li>
 *   <li>The plan (sections, boxes, need) comes from {@code GET …/header} and is stored as
 *       {@code team/<teamId>.room.team.json}; the newest header file wins when the team files are read.</li>
 *   <li>Network work runs on the HTTP client's threads; everything that touches the team runs on the
 *       server's main thread.</li>
 * </ul>
 * The key is never written to chat or log.
 */
final class RoomLink implements TeamUplink {
    static final int BATCH = 200;
    /** Largest frame from the room (a page of 500 events of at most 4 KB each fits easily). */
    static final int MAX_FRAME = 4 * 1024 * 1024;
    /** Keep-alive every 30 s (600 ticks): the room answers without waking up, idle sockets are not cut by proxies. */
    static final long PING_TICKS = 600L;
    private static final String PREFIX = "Team-Raum: ";

    private final JavaPlugin plugin;
    private final TeamModule teams;
    private final Path dir;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    private final Map<String, Room> rooms = new LinkedHashMap<>();

    RoomLink(JavaPlugin plugin, TeamModule teams, Path dir) {
        this.plugin = plugin;
        this.teams = teams;
        this.dir = dir;
    }

    /** One connection to a room (one team). Fields are only touched on the main thread. */
    final class Room {
        final String base, rid, key, device;
        String teamId, cursor, status = "verbindet …";
        /** GAME-06: signing key of the Bauleitung (link parameter l), null = the room's events are not checked. */
        String signKey;
        /** GAME-06: arrival number in the room per event id (file team/&lt;teamId&gt;.room.seq). */
        final Map<String, Long> seqs = new HashMap<>();
        final LinkedHashSet<String> outbox = new LinkedHashSet<>();
        WebSocket ws;
        /** Frames over {@link #ws} one after the other: the JDK socket fails a second outstanding send. */
        WsQueue out;
        BukkitTask ping;
        boolean live, stopped, caughtUp;
        long backoff = 5;
        BukkitTask retry;
        /** Batch in flight: batch id → event ids. */
        String inflight;
        List<String> inflightIds = List.of();

        Room(String base, String rid, String key, String device) { this.base = base; this.rid = rid; this.key = key; this.device = device; }

        Path file() { return dir.resolve(teamId + ".room.json"); }
        Path seqFile() { return dir.resolve(teamId + ".room.seq"); }
        URI http(String path) { return URI.create(base + "/v1/rooms/" + rid + path); }
        URI wss() { return URI.create(base.replaceFirst("^http", "ws") + "/v1/rooms/" + rid + "/live"); }
    }

    // ------------------------------------------------------------------ link and files

    /**
     * Room address, id and server key from a planner link ({@code …#/team/beitreten?raum=URL&id=RID&s=KEY}); GAME-06:
     * optionally {@code &l=SIGNKEY}, the Bauleitung's signing key (never the admin key).
     */
    record Link(String base, String rid, String key, String signKey) {}

    static Optional<Link> parse(String link) {
        int q = link.indexOf('?');
        if (q < 0) return Optional.empty();
        Map<String, String> p = new HashMap<>();
        for (String part : link.substring(q + 1).split("&")) {
            int eq = part.indexOf('=');
            if (eq > 0) p.put(part.substring(0, eq), URLDecoder.decode(part.substring(eq + 1), StandardCharsets.UTF_8));
        }
        String base = p.get("raum"), rid = p.get("id"), key = p.get("s"), sign = p.get("l");
        if (sign != null && !sign.matches(io.github.freadeax.bauplaner.mod.team.EventSig.KEY_PATTERN)) sign = null;
        if (base == null || rid == null || key == null || key.isBlank() || !rid.matches("[A-Za-z0-9_-]{1,64}")) return Optional.empty();
        base = base.replaceAll("/+$", "");
        if (!base.startsWith("https://") && !base.startsWith("http://127.0.0.1") && !base.startsWith("http://localhost")) return Optional.empty();
        return Optional.of(new Link(base, rid, key, sign));
    }

    /** Starts the rooms saved in {@code team/*.room.json}. */
    void enable() {
        try (Stream<Path> files = Files.list(dir)) {
            for (Path f : files.filter(x -> x.getFileName().toString().endsWith(".room.json")).sorted().collect(Collectors.toList())) {
                try {
                    JsonObject j = JsonParser.parseString(Files.readString(f, StandardCharsets.UTF_8)).getAsJsonObject();
                    Room r = new Room(TeamLog.str(j, "raum"), TeamLog.str(j, "id"), TeamLog.str(j, "key"), TeamLog.str(j, "device"));
                    r.teamId = TeamLog.str(j, "teamId"); r.cursor = TeamLog.str(j, "cursor"); r.signKey = TeamLog.str(j, "signKey");
                    for (JsonElement x : TeamLog.array(j, "outbox")) r.outbox.add(x.getAsString());
                    rooms.put(r.teamId, r);
                    loadSeqs(r);
                    open(r);
                } catch (IOException | RuntimeException e) { plugin.getLogger().warning(PREFIX + f.getFileName() + " nicht lesbar: " + e.getMessage()); }
            }
        } catch (IOException e) { plugin.getLogger().warning(PREFIX + e.getMessage()); }
    }

    void disable() {
        for (Room r : rooms.values()) stop(r, "getrennt");
    }

    private void save(Room r) {
        JsonObject j = new JsonObject();
        j.addProperty("format", "minecraft-bauplaner-team-room-link"); j.addProperty("formatVersion", 1);
        j.addProperty("raum", r.base); j.addProperty("id", r.rid); j.addProperty("key", r.key); j.addProperty("device", r.device);
        j.addProperty("teamId", r.teamId);
        if (r.cursor != null) j.addProperty("cursor", r.cursor);
        if (r.signKey != null) j.addProperty("signKey", r.signKey);
        JsonArray o = new JsonArray(); r.outbox.forEach(o::add); j.add("outbox", o);
        try {
            Path tmp = r.file().resolveSibling(r.file().getFileName() + ".tmp");
            Files.writeString(tmp, TeamLog.GSON.toJson(j), StandardCharsets.UTF_8);
            Files.move(tmp, r.file(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) { plugin.getLogger().warning(PREFIX + "Verbindungsdatei nicht gespeichert: " + e.getMessage()); }
    }

    // ------------------------------------------------------------------ commands

    /** {@code team verbinden <link>}: fetches the plan, stores the link, sends all known events once. */
    CompletableFuture<String> connect(String link) {
        Optional<Link> l = parse(link.trim());
        if (l.isEmpty()) return CompletableFuture.completedFuture("Das ist kein Server-Link aus dem Planer (Reiter „Team“ → „Live“, Link mit raum, id und s).");
        byte[] b = new byte[8]; new SecureRandom().nextBytes(b);
        Room r = new Room(l.get().base(), l.get().rid(), l.get().key(), "srv_" + HexFormat.of().formatHex(b));
        r.signKey = l.get().signKey();
        return header(r).thenApply(header -> {
            String teamId = TeamLog.str(header, "teamId");
            Room old = rooms.remove(teamId);
            if (old != null) stop(old, "ersetzt");
            r.teamId = teamId;
            // Arrival numbers belong to one room: a different room starts without them.
            if (old == null || !old.rid.equals(r.rid) || !old.base.equals(r.base)) {
                try { Files.deleteIfExists(r.seqFile()); } catch (IOException e) { plugin.getLogger().warning(PREFIX + e.getMessage()); }
            }
            teams.reload();
            TeamLog team = teams.team(teamId);
            if (team != null) for (JsonObject e : team.events()) r.outbox.add(TeamLog.str(e, "id"));
            rooms.put(teamId, r);
            loadSeqs(r);
            save(r);
            open(r);
            return "Mit dem Team-Raum von „" + TeamLog.str(header, "name") + "“ verbunden. " + r.outbox.size() + " Ereignisse werden abgeglichen.";
        }).exceptionally(ex -> "Verbindung nicht möglich: " + reason(ex));
    }

    /**
     * LINK-11: whether this room (address, id, key) is already connected – a repeated hand-over from a mod changes nothing.
     * GAME-06: a signing key in the link is taken over without reconnecting (first hand-over after the update).
     */
    boolean has(String link) {
        Optional<Link> l = parse(link.trim());
        if (l.isEmpty()) return false;
        for (Room r : rooms.values()) if (!r.stopped && r.base.equals(l.get().base()) && r.rid.equals(l.get().rid()) && r.key.equals(l.get().key())) {
            String sign = l.get().signKey();
            if (sign != null && !sign.equals(r.signKey)) {
                r.signKey = sign;
                save(r);
                teams.trustChanged();
                plugin.getLogger().info(PREFIX + "Unterschriftsschlüssel der Bauleitung übernommen – Rollen und Schutz aus dem Raum werden jetzt geprüft.");
            }
            return true;
        }
        return false;
    }

    /** GAME-06: what the server lets into its fold for this team (null without room). */
    EventTrust trust(TeamLog team) {
        Room r = rooms.get(team.teamId);
        return r == null ? null : new EventTrust(team, r.signKey, r.seqs::get);
    }

    /** Changes when the signing key or the known arrival numbers change (view cache). */
    String trustStamp(String teamId) {
        Room r = rooms.get(teamId);
        return r == null ? "" : (r.signKey == null ? "-" : Integer.toHexString(r.signKey.hashCode())) + ":" + r.seqs.size();
    }

    // ------------------------------------------------------------------ arrival numbers (GAME-06)

    /**
     * Reads team/&lt;teamId&gt;.room.seq. Without the file (plugin up to 0.23.0) every room event already in the log
     * arrived at or before the saved cursor: it gets that number, so a confirmation by the Bauleitung covers it.
     */
    private void loadSeqs(Room r) {
        r.seqs.clear();
        Path f = r.seqFile();
        try {
            if (Files.exists(f)) {
                for (String line : Files.readAllLines(f, StandardCharsets.UTF_8)) {
                    int t = line.indexOf('\t');
                    if (t > 0) try { r.seqs.putIfAbsent(line.substring(t + 1), Long.parseLong(line.substring(0, t))); } catch (NumberFormatException ignored) { }
                }
                return;
            }
            TeamLog team = teams.team(r.teamId);
            long upTo = r.cursor != null && r.cursor.matches("\\d{1,15}") ? Long.parseLong(r.cursor) : -1;
            StringBuilder out = new StringBuilder();
            if (team != null && upTo >= 0) for (JsonObject e : team.events()) {
                if ("server".equals(TeamLog.str(e, "origin"))) continue;
                String id = TeamLog.str(e, "id");
                r.seqs.put(id, upTo);
                out.append(upTo).append('\t').append(id).append('\n');
            }
            Files.writeString(f, out.toString(), StandardCharsets.UTF_8);
        } catch (IOException e) { plugin.getLogger().warning(PREFIX + "Ankunftsnummern nicht lesbar: " + e.getMessage()); }
    }

    /** Remembers the arrival numbers of a page of room events (contiguous, the last one has {@code cursor}). */
    private void noteSeqs(Room r, JsonArray events, String cursor) {
        if (cursor == null || !cursor.matches("\\d{1,15}") || events.size() == 0) return;
        long last = Long.parseLong(cursor);
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < events.size(); i++) {
            if (!events.get(i).isJsonObject()) continue;
            String id = TeamLog.str(events.get(i).getAsJsonObject(), "id");
            long seq = last - (events.size() - 1 - i);
            if (id == null || seq <= 0 || r.seqs.containsKey(id)) continue;
            r.seqs.put(id, seq);
            out.append(seq).append('\t').append(id).append('\n');
        }
        if (out.length() == 0) return;
        try { Files.writeString(r.seqFile(), out.toString(), StandardCharsets.UTF_8, java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND); }
        catch (IOException e) { plugin.getLogger().warning(PREFIX + "Ankunftsnummern nicht gespeichert: " + e.getMessage()); }
    }

    boolean any() { return !rooms.isEmpty(); }

    String disconnect(String teamId) {
        Room r = teamId != null ? rooms.remove(teamId) : rooms.isEmpty() ? null : rooms.remove(rooms.keySet().iterator().next());
        if (r == null) return "Kein Team-Raum verbunden.";
        stop(r, "getrennt");
        try { Files.deleteIfExists(r.seqFile()); Files.deleteIfExists(r.file()); } catch (IOException e) { return "Getrennt, aber " + r.file().getFileName() + " ließ sich nicht löschen: " + e.getMessage(); }
        return "Vom Team-Raum getrennt. Die Ereignisse bleiben auf dem Server; der Teamstand gilt bis zum nächsten Verbinden wie eine Teamdatei.";
    }

    List<String> status() {
        List<String> out = new ArrayList<>();
        if (rooms.isEmpty()) out.add("Kein Team-Raum verbunden. Die Bauleitung verbindet ihn ohne Befehl: im Planer „Team live“ → „Mein Spiel verbinden“, dann mit der Mod hier beitreten.");
        for (Room r : rooms.values()) {
            TeamLog t = teams.team(r.teamId);
            out.add((t != null ? t.name : r.teamId) + ": " + r.status + (r.outbox.isEmpty() ? "" : " · " + r.outbox.size() + " Ereignisse warten") + " · " + host(r.base));
            if (t != null) out.add("  " + trustText(t));
        }
        return out;
    }

    /** GAME-06: one line on how the server checks the room's events. */
    String trustText(TeamLog team) {
        Room r = rooms.get(team.teamId);
        if (r == null) return "Ereignisse aus Teamdatei.";
        if (r.signKey == null) return "Rollen und Schutz ungeprüft: der Server hat den Unterschriftsschlüssel der Bauleitung noch nicht (Bauleitung einmal mit der Mod 0.26.0+ beitreten oder im Planer „Server mit dem Raum verbinden“).";
        EventTrust t = trust(team);
        if (!t.active()) return "Rollen und Schutz noch ungeprüft: die Bauleitung bestätigt den bisherigen Stand, sobald sie den Planer öffnet.";
        int n = teams.untrusted(team).size();
        return "Rollen und Schutz geprüft (Unterschrift der Bauleitung) · Schutz " + teams.protectMode(team) + ", freie Abschnitte " + teams.protectFree(team)
                + (n == 0 ? "." : " · " + n + " Ereignisse nicht übernommen (/bauplaner team raum pruefen).");
    }

    private static String host(String base) { return URI.create(base).getHost(); }

    // ------------------------------------------------------------------ uplink

    @Override public void sent(TeamLog team, JsonObject event) {
        Room r = rooms.get(team.teamId);
        if (r == null) return;
        r.outbox.add(TeamLog.str(event, "id"));
        save(r);
        flush(r);
    }

    /** Sends the next batch of the outbox (one batch at a time; the answer sends the next). */
    private void flush(Room r) {
        if (!r.live || !r.caughtUp || r.inflight != null || r.outbox.isEmpty()) return;
        TeamLog team = teams.team(r.teamId);
        if (team == null) return;
        Map<String, JsonObject> byId = new HashMap<>();
        for (JsonObject e : team.events()) byId.put(TeamLog.str(e, "id"), e);
        List<String> ids = new ArrayList<>();
        JsonArray events = new JsonArray();
        for (String id : new ArrayList<>(r.outbox)) {
            JsonObject e = byId.get(id);
            if (e == null) { r.outbox.remove(id); continue; }
            ids.add(id); events.add(e);
            if (ids.size() == BATCH) break;
        }
        if (ids.isEmpty()) { save(r); return; }
        JsonObject m = new JsonObject();
        m.addProperty("type", "append"); m.addProperty("batch", batchId(ids)); m.add("events", events);
        r.inflight = TeamLog.str(m, "batch"); r.inflightIds = ids;
        send(r, m);
    }

    static String batchId(List<String> ids) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(String.join("\n", ids).getBytes(StandardCharsets.UTF_8));
            return "b_" + HexFormat.of().formatHex(d).substring(0, 32);
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    // ------------------------------------------------------------------ network

    private CompletableFuture<JsonObject> header(Room r) {
        HttpRequest req = HttpRequest.newBuilder(r.http("/header")).timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + r.key).header("Accept", "application/json").GET().build();
        return http.sendAsync(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).thenCompose(res -> {
            if (res.statusCode() == 401 || res.statusCode() == 403) return CompletableFuture.failedFuture(new IOException("Schlüssel ungültig oder erneuert (" + res.statusCode() + ")"));
            if (res.statusCode() != 200) return CompletableFuture.failedFuture(new IOException("Raum antwortet " + res.statusCode()));
            JsonObject h = JsonParser.parseString(res.body()).getAsJsonObject();
            h.add("events", new JsonArray());
            h.remove("plan");
            TeamLog check = TeamLog.parse(TeamLog.GSON.toJson(h)); // same checks as a team file
            CompletableFuture<JsonObject> done = new CompletableFuture<>();
            Bukkit.getScheduler().runTask(plugin, () -> {
                try {
                    Path f = dir.resolve(check.teamId + ".room.team.json"), tmp = f.resolveSibling(f.getFileName() + ".tmp");
                    Files.writeString(tmp, TeamLog.GSON.toJson(h), StandardCharsets.UTF_8);
                    Files.move(tmp, f, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
                    done.complete(h);
                } catch (IOException e) { done.completeExceptionally(e); }
            });
            return done;
        });
    }

    private void open(Room r) {
        if (r.stopped) return;
        r.status = "verbindet …";
        http.newWebSocketBuilder().connectTimeout(Duration.ofSeconds(20)).buildAsync(r.wss(), new Listener(r)).whenComplete((ws, ex) -> main(() -> {
            if (ex != null) { retry(r, "nicht erreichbar (" + reason(ex) + ")"); return; }
            if (r.stopped) { ws.sendClose(WebSocket.NORMAL_CLOSURE, "stop"); return; }
            r.ws = ws; r.live = true; r.caughtUp = false; r.inflight = null;
            r.out = new WsQueue(ws, failure -> main(() -> lost(r, ws, reason(failure))));
            if (r.ping != null) r.ping.cancel();
            JsonObject ping = new JsonObject(); ping.addProperty("type", "ping");
            r.ping = Bukkit.getScheduler().runTaskTimer(plugin, () -> { if (r.ws == ws) send(r, ping); }, PING_TICKS, PING_TICKS);
            JsonObject hello = new JsonObject();
            hello.addProperty("type", "hello"); hello.addProperty("key", r.key); hello.addProperty("member", "server");
            hello.addProperty("device", r.device); hello.addProperty("where", "server");
            if (r.cursor != null) hello.addProperty("after", r.cursor);
            send(r, hello);
        }));
    }

    private void send(Room r, JsonObject m) {
        WsQueue q = r.out;
        if (q == null || r.ws == null) return;
        q.send(TeamLog.GSON.toJson(m)); // a failure ends the connection through the queue's onFail (lost)
    }

    /** Forgets the current socket (main thread). */
    private static void drop(Room r) {
        r.ws = null; r.out = null; r.live = false; r.inflight = null;
        if (r.ping != null) { r.ping.cancel(); r.ping = null; }
    }

    private void lost(Room r, WebSocket ws, String why) {
        if (r.ws != ws) return;
        try { ws.abort(); } catch (RuntimeException ignored) { }
        drop(r);
        retry(r, "Verbindung verloren (" + why + ")");
    }

    private void retry(Room r, String why) {
        if (r.stopped) return;
        r.status = why + ", neuer Versuch in " + r.backoff + " s";
        long wait = r.backoff;
        r.backoff = Math.min(60, r.backoff * 2);
        if (r.retry != null) r.retry.cancel();
        r.retry = Bukkit.getScheduler().runTaskLater(plugin, () -> open(r), wait * 20L);
    }

    private void stop(Room r, String why) {
        r.stopped = true; r.live = false; r.status = why;
        if (r.retry != null) r.retry.cancel();
        if (r.ws != null) { try { r.ws.sendClose(WebSocket.NORMAL_CLOSURE, why); } catch (RuntimeException ignored) { } }
        drop(r);
    }

    private void main(Runnable task) {
        if (!plugin.isEnabled()) return;
        if (Bukkit.isPrimaryThread()) task.run(); else Bukkit.getScheduler().runTask(plugin, task);
    }

    private static String reason(Throwable ex) {
        while (ex.getCause() != null && (ex instanceof java.util.concurrent.CompletionException || ex instanceof java.util.concurrent.ExecutionException)) ex = ex.getCause();
        return ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
    }

    // ------------------------------------------------------------------ messages

    private final class Listener implements WebSocket.Listener {
        private final Room r;
        /** Parts of the current frame; one per socket, so a broken old socket cannot mix into a new one. */
        private final StringBuilder partial = new StringBuilder();
        Listener(Room r) { this.r = r; }

        @Override public CompletionStage<?> onText(WebSocket ws, CharSequence data, boolean last) {
            if (partial.length() + data.length() > MAX_FRAME) {
                partial.setLength(0);
                ws.abort();
                main(() -> lost(r, ws, "Nachricht vom Raum größer als 4 MB"));
                return null;
            }
            partial.append(data);
            if (last) {
                String text = partial.toString();
                partial.setLength(0);
                main(() -> { if (r.ws == ws) message(r, text); });
            }
            ws.request(1);
            return null;
        }

        @Override public CompletionStage<?> onClose(WebSocket ws, int code, String reason) {
            main(() -> {
                if (r.ws != ws) return;
                drop(r);
                if (code == 4401 || code == 4403) {
                    r.stopped = true;
                    r.status = "Schlüssel ungültig oder erneuert – im Planer unter „Team live“ erneut „Server mit dem Raum verbinden“ klicken";
                    plugin.getLogger().warning(PREFIX + r.status);
                } else retry(r, "getrennt (" + code + (reason == null || reason.isBlank() ? "" : " " + reason) + ")");
            });
            return null;
        }

        @Override public void onError(WebSocket ws, Throwable error) { main(() -> lost(r, ws, reason(error))); }
    }

    private void message(Room r, String text) {
        JsonObject m;
        try { m = JsonParser.parseString(text).getAsJsonObject(); } catch (RuntimeException e) { plugin.getLogger().warning(PREFIX + "unlesbare Nachricht"); return; }
        switch (String.valueOf(TeamLog.str(m, "type"))) {
            case "welcome" -> {
                r.backoff = 5; r.status = "verbunden, gleicht ab …";
                // WORLD-SHARE-01: the team's Weltplan (markers on BlueMap/Dynmap, optional lock protection).
                WorldModule w = plugin instanceof BridgePlugin b ? b.worldModule() : null;
                if (w != null) w.welcome(r.teamId, r.base, r.rid, r.key, m.has("docs") && m.get("docs").isJsonObject() ? m.getAsJsonObject("docs") : null);
            }
            case "doc" -> { WorldModule w = plugin instanceof BridgePlugin b ? b.worldModule() : null; if (w != null) w.announced(r.teamId, r.base, r.rid, r.key, m); }
            case "events" -> {
                if (m.has("reset") && m.get("reset").getAsBoolean()) plugin.getLogger().info(PREFIX + "Raum kennt den Stand nicht mehr, gleiche ab Anfang ab.");
                int taken = 0;
                // Before folding: the trust check needs to know that these came from the room.
                noteSeqs(r, TeamLog.array(m, "events"), TeamLog.str(m, "cursor"));
                for (JsonElement x : TeamLog.array(m, "events")) {
                    if (!x.isJsonObject()) continue;
                    JsonObject e = x.getAsJsonObject();
                    if (teams.receive(r.teamId, e)) { taken++; r.outbox.remove(TeamLog.str(e, "id")); }
                }
                if (TeamLog.str(m, "cursor") != null) r.cursor = TeamLog.str(m, "cursor");
                boolean more = m.has("more") && m.get("more").getAsBoolean();
                if (!more && !r.caughtUp) { r.caughtUp = true; r.status = "live"; }
                save(r);
                if (taken > 0) plugin.getLogger().fine(PREFIX + taken + " Ereignisse übernommen.");
                flush(r);
            }
            case "appended" -> {
                if (!String.valueOf(TeamLog.str(m, "batch")).equals(r.inflight) && r.inflight != null && TeamLog.str(m, "batch") != null) return;
                for (JsonElement x : TeamLog.array(m, "rejected")) {
                    JsonObject o = x.getAsJsonObject();
                    plugin.getLogger().warning(PREFIX + "Ereignis " + TeamLog.str(o, "id") + " abgelehnt: " + TeamLog.str(o, "reason"));
                }
                r.inflightIds.forEach(r.outbox::remove);
                r.inflight = null; r.inflightIds = List.of();
                save(r);
                flush(r);
            }
            case "header" -> header(r).whenComplete((h, ex) -> main(() -> {
                if (ex != null) plugin.getLogger().warning(PREFIX + "neuer Planstand nicht geholt: " + reason(ex));
                else teams.reload();
            }));
            case "control" -> control(r, m);
            case "error" -> plugin.getLogger().warning(PREFIX + "Raum meldet: " + Optional.ofNullable(TeamLog.str(m, "message")).orElse(TeamLog.str(m, "error")));
            default -> { }
        }
    }

    /**
     * LINK-05: a control message signed in the planner, passed on by the room (docs/architecture/team/AUTO_LINK.md).
     * The room knows no owner key; {@link ServerLink#control} checks signature, number and server like on the mod way.
     */
    private void control(Room r, JsonObject m) {
        String id = TeamLog.str(m, "id");
        if (id == null) return;
        ServerLink link = plugin instanceof BridgePlugin b ? b.serverLink() : null;
        java.util.concurrent.CompletableFuture<JsonObject> answer;
        if (link == null) {
            JsonObject e = new JsonObject();
            e.addProperty("error", "Diese Plugin-Version kennt keine Kopplung.");
            answer = java.util.concurrent.CompletableFuture.completedFuture(e);
        } else {
            long seq = m.has("seq") && m.get("seq").isJsonPrimitive() ? m.get("seq").getAsLong() : -1;
            answer = link.control(TeamLog.str(m, "owner"), seq, TeamLog.str(m, "body"), TeamLog.str(m, "sig"), "Team-Raum");
        }
        answer.whenComplete((a, ex) -> main(() -> {
            JsonObject out = new JsonObject();
            out.addProperty("type", "control.answer");
            out.addProperty("id", id);
            JsonObject body = a;
            if (ex != null || body == null) { body = new JsonObject(); body.addProperty("error", "Fehler im Plugin: " + (ex == null ? "keine Antwort" : reason(ex))); }
            out.add("answer", body);
            send(r, out);
        }));
    }
}
