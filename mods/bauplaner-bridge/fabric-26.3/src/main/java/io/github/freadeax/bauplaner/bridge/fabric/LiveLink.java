package io.github.freadeax.bauplaner.bridge.fabric;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import io.github.freadeax.bauplaner.mod.Placement;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.live.LiveLinkServer;
import io.github.freadeax.bauplaner.mod.live.SurfaceRuns;
import io.github.freadeax.bauplaner.mod.live.WorldMarks;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;
import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.level.levelgen.Heightmap;

/**
 * Live-Verbindung zur Website (MAP-03/GAME-03), Fabric side. Off until the player types
 * {@code /bauplaner verbinden}; then a small service on 127.0.0.1 answers the paired website:
 * player position, the placed plan and its live check, the surface of loaded chunks. The website can
 * place a plan in the hologram and send Weltplan marks. Everything game related runs on the game
 * thread; nothing is sent to the server and the world is never changed.
 */
final class LiveLink implements LiveLinkServer.Handler {
    private final Path root;
    private final Hologram hologram;
    private final LiveLinkServer server;
    private volatile WorldMarks marks = WorldMarks.NONE;
    private volatile long lastRequest;
    private int port = LiveLinkServer.DEFAULT_PORT;
    private boolean enabled;

    LiveLink(Path root, Hologram hologram, String version, String minecraft) {
        this.root = root;
        this.hologram = hologram;
        Properties p = load();
        enabled = "true".equals(p.getProperty("aktiv"));
        try { port = Integer.parseInt(p.getProperty("port", String.valueOf(LiveLinkServer.DEFAULT_PORT))); } catch (NumberFormatException ignored) { }
        List<String> tokens = Arrays.stream(p.getProperty("schluessel", "").split(",")).filter(s -> !s.isBlank()).toList();
        server = new LiveLinkServer(new LiveLinkServer.Info(version, "fabric", minecraft), this, tokens, this::saveTokens, System::currentTimeMillis);
    }

    WorldMarks marks() { return marks; }
    boolean running() { return server.running(); }
    int port() { return server.port(); }
    /** A paired website asked within the last five seconds. */
    boolean websiteActive() { return System.currentTimeMillis() - lastRequest < 5_000; }

    /** Game start: resume the service when the player switched it on before. */
    void resume(Minecraft mc) {
        if (!enabled) return;
        try { server.start(port); } catch (IOException e) { mc.execute(() -> McCompat.chat(mc, Component.literal("[Bauplaner] Verbindung zur Website nicht gestartet: " + e.getMessage()))); }
    }

    // ------------------------------------------------------------------ commands

    String connect() {
        try {
            server.start(port);
        } catch (IOException e) {
            return "Port " + port + " ist belegt oder gesperrt (" + e.getMessage() + "). Anderen Port wählen: /bauplaner verbinden port <zahl>.";
        }
        enabled = true;
        save();
        String code = server.openPairing();
        return "Website-Verbindung an (nur dieser PC, Port " + server.port() + "). Code: " + code
                + " – auf der Website unter „Spiel“ oder in der Weltkarte eintragen. Gilt 5 Minuten.";
    }

    String disconnect() {
        server.close();
        server.revokeAll();
        enabled = false;
        save();
        return "Website-Verbindung aus. Alle gekoppelten Browser müssen sich neu koppeln.";
    }

    String setPort(int p) {
        if (p < 1024 || p > 65535) return "Port muss zwischen 1024 und 65535 liegen.";
        boolean was = server.running();
        server.close();
        port = p;
        save();
        if (was) {
            try { server.start(port); } catch (IOException e) { return "Port " + p + " nicht nutzbar: " + e.getMessage(); }
        }
        return "Port " + p + " gespeichert. Auf der Website denselben Port eintragen.";
    }

    String statusText() {
        if (!server.running()) return "Website-Verbindung aus. Einschalten: /bauplaner verbinden";
        return "Website-Verbindung an, Port " + server.port() + ", " + server.pairedClients() + " gekoppelte(r) Browser" + (websiteActive() ? ", Website fragt gerade ab" : "")
                + (server.pairingOpen() ? ", Kopplung offen" : "") + ". Markierungen: " + marks.size() + ".";
    }

    void close() { server.close(); }

    // ------------------------------------------------------------------ handler (server threads)

    private static <T> T onGame(Supplier<T> task) throws Exception {
        Minecraft mc = Minecraft.getInstance();
        try {
            return CompletableFuture.supplyAsync(task, mc).get(3, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            throw new LiveLinkServer.HttpError(503, "Das Spiel antwortet gerade nicht (Ladebildschirm?).");
        } catch (java.util.concurrent.ExecutionException e) {
            Throwable c = e.getCause();
            if (c instanceof LiveLinkServer.HttpError h) throw h;
            throw new Exception(c == null ? "Fehler im Spiel" : c.getMessage(), c);
        }
    }

    @Override
    public String status() throws Exception {
        lastRequest = System.currentTimeMillis();
        return onGame(() -> {
            Minecraft mc = Minecraft.getInstance();
            StringBuilder b = new StringBuilder("{\"time\":").append(Json.quote(Instant.now().toString()));
            if (mc.player != null && mc.level != null) {
                var p = mc.player;
                b.append(",\"player\":{\"x\":").append(Json.num(p.getX())).append(",\"y\":").append(Json.num(p.getY())).append(",\"z\":").append(Json.num(p.getZ()))
                        .append(",\"yaw\":").append(Json.num(p.getYRot())).append(",\"pitch\":").append(Json.num(Math.max(-90, Math.min(90, p.getXRot()))))
                        .append(",\"dimension\":").append(Json.quote(McCompat.dimension(mc.level))).append(",\"name\":").append(Json.quote(p.getName().getString())).append('}');
                boolean single = mc.getSingleplayerServer() != null;
                b.append(",\"world\":{\"key\":").append(Json.quote(McCompat.worldKey(mc))).append(",\"server\":")
                        .append(mc.getCurrentServer() != null ? Json.quote(mc.getCurrentServer().ip) : "null").append(",\"singleplayer\":").append(single).append('}');
            } else b.append(",\"player\":null,\"world\":null");
            LiveCheck check = hologram.check();
            if (check != null) {
                var id = hologram.plan().identity();
                Placement pl = check.placement();
                int[] box = check.worldBox();
                b.append(",\"hologram\":{\"planFile\":").append(Json.quote(hologram.planFile())).append(",\"name\":").append(Json.quote(hologram.plan().name()))
                        .append(",\"projectId\":").append(Json.quote(id.projectId())).append(",\"revisionNumber\":").append(id.revisionNumber())
                        .append(",\"placement\":{\"dimension\":").append(Json.quote(pl.dimension())).append(",\"x\":").append(pl.x()).append(",\"y\":").append(pl.y()).append(",\"z\":").append(pl.z())
                        .append(",\"turns\":").append(pl.turns()).append(",\"mirror\":").append(pl.mirror()).append("},\"visible\":").append(hologram.visible())
                        .append(",\"box\":[").append(box[0]).append(',').append(box[1]).append(',').append(box[2]).append(',').append(box[3]).append(',').append(box[4]).append(',').append(box[5]).append(']')
                        .append(",\"counts\":{\"ok\":").append(check.count(Verdict.OK)).append(",\"state\":").append(check.count(Verdict.STATE)).append(",\"missing\":").append(check.count(Verdict.MISSING))
                        .append(",\"wrong\":").append(check.count(Verdict.WRONG)).append(",\"unknown\":").append(check.count(Verdict.UNKNOWN)).append("},\"total\":").append(check.size()).append('}');
            } else b.append(",\"hologram\":null");
            return b.append(",\"marks\":").append(marks.size()).append('}').toString();
        });
    }

    @Override
    public String chunks(int[][] wanted) throws Exception {
        lastRequest = System.currentTimeMillis();
        return onGame(() -> {
            Minecraft mc = Minecraft.getInstance();
            var level = mc.level;
            if (level == null) throw new LiveLinkServer.HttpError(409, "Keine Welt geladen.");
            Map<String, Integer> ids = new LinkedHashMap<>();
            List<String> chunks = new ArrayList<>(), missing = new ArrayList<>();
            BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
            int bottom = level.getMinY();
            for (int[] c : wanted) {
                if (!McCompat.loaded(level, c[0], c[1])) { missing.add("[" + c[0] + "," + c[1] + "]"); continue; }
                StringBuilder cols = new StringBuilder();
                for (int i = 0; i < 256; i++) {
                    int x = c[0] * 16 + (i & 15), z = c[1] * 16 + (i >> 4);
                    int top = level.getHeight(Heightmap.Types.WORLD_SURFACE, x, z) - 1;
                    final int fx = x, fz = z;
                    List<SurfaceRuns.Run> runs = top < bottom ? List.of() : SurfaceRuns.scan(new SurfaceRuns.Column() {
                        public String id(int y) { return BuiltInRegistries.BLOCK.getKey(level.getBlockState(pos.set(fx, y, fz)).getBlock()).toString(); }
                        public boolean solid(int y) { return level.getBlockState(pos.set(fx, y, fz)).canOcclude(); }
                    }, top, bottom);
                    List<int[]> pairs = new ArrayList<>(runs.size());
                    for (SurfaceRuns.Run r : runs) pairs.add(new int[] { r.y(), ids.computeIfAbsent(r.id(), k -> ids.size()) });
                    if (i > 0) cols.append(',');
                    cols.append(LiveLinkServer.runs(pairs));
                }
                chunks.add("{\"x\":" + c[0] + ",\"z\":" + c[1] + ",\"columns\":[" + cols + "]}");
            }
            StringBuilder idList = new StringBuilder();
            for (String id : ids.keySet()) idList.append(idList.length() == 0 ? "" : ",").append(Json.quote(id));
            return "{\"dimension\":" + Json.quote(McCompat.dimension(level)) + ",\"ids\":[" + idList + "],\"chunks\":[" + String.join(",", chunks) + "],\"missing\":[" + String.join(",", missing) + "]}";
        });
    }

    @Override
    public String plan(Map<String, String> q, byte[] schem) throws Exception {
        lastRequest = System.currentTimeMillis();
        String name = q.getOrDefault("name", "");
        if (!name.matches("[A-Za-z0-9._-]{1,120}\\.schem") || name.startsWith(".")) throw new LiveLinkServer.HttpError(400, "Dateiname ungültig.");
        Placement at = placementOf(q.get("dimension"), q.get("x"), q.get("y"), q.get("z"), q.get("turns"), q.get("mirror"));
        // Check the file before it lands in the plans folder.
        try { io.github.freadeax.bauplaner.mod.PlanModel.parse(name, schem); }
        catch (RuntimeException e) { throw new LiveLinkServer.HttpError(400, "Plandatei nicht lesbar: " + e.getMessage()); }
        Path dir = hologram.plansDir();
        Files.createDirectories(dir);
        Path tmp = dir.resolve(name + ".tmp"), out = dir.resolve(name);
        Files.write(tmp, schem);
        Files.move(tmp, out, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        String msg = onGame(() -> {
            try { return hologram.placeExact(name, at); }
            catch (IOException e) { throw new LiveLinkServer.HttpError(500, e.getMessage()); }
        });
        Minecraft mc = Minecraft.getInstance();
        mc.execute(() -> McCompat.chat(mc, Component.literal("[Bauplaner] " + msg)));
        return "{\"placed\":true,\"planFile\":" + Json.quote(name) + ",\"message\":" + Json.quote(msg) + "}";
    }

    @Override
    public String placement(Map<String, Object> body) throws Exception {
        lastRequest = System.currentTimeMillis();
        Placement at = new Placement(Json.str(body.get("dimension"), "Dimension", 200), Json.integer(body.get("x"), "X", -30_000_000, 30_000_000),
                Json.integer(body.get("y"), "Y", -2032, 2031), Json.integer(body.get("z"), "Z", -30_000_000, 30_000_000),
                Json.integer(body.get("turns"), "Drehung", 0, 3), Json.bool(body.get("mirror"), "Spiegelung"));
        boolean moved = onGame(() -> hologram.setPlacement(at));
        if (!moved) throw new LiveLinkServer.HttpError(409, "Im Spiel ist kein Plan platziert.");
        return "{\"moved\":true}";
    }

    @Override
    public String marks(Map<String, Object> body) throws Exception {
        lastRequest = System.currentTimeMillis();
        WorldMarks next = WorldMarks.parse(body);
        marks = next;
        try {
            Files.createDirectories(root);
            Files.writeString(root.resolve("markierungen.json"), "{\"dimension\":" + Json.quote(next.dimension()) + ",\"items\":" + itemsText(body) + "}", StandardCharsets.UTF_8);
        } catch (IOException ignored) { }
        Minecraft mc = Minecraft.getInstance();
        mc.execute(() -> McCompat.overlay(mc, Component.literal("Bauplaner: " + next.size() + " Markierungen von der Website")));
        return "{\"marks\":" + next.size() + "}";
    }

    /** Marks of the last session, so the player sees them again without opening the website. */
    void loadMarks() {
        try {
            String text = Files.readString(root.resolve("markierungen.json"), StandardCharsets.UTF_8);
            marks = WorldMarks.parse(Json.obj(Json.parse(text), "Markierungen"));
        } catch (IOException | RuntimeException ignored) { }
    }

    private static String itemsText(Map<String, Object> body) {
        // Re-serialise only what WorldMarks understands is not needed: the body was validated, keep it as sent.
        return toJson(body.get("items"));
    }

    @SuppressWarnings("unchecked")
    private static String toJson(Object v) {
        if (v == null) return "null";
        if (v instanceof String s) return Json.quote(s);
        if (v instanceof Double d) return Json.num(d);
        if (v instanceof Boolean b) return b.toString();
        if (v instanceof List<?> l) { List<String> parts = new ArrayList<>(); for (Object o : l) parts.add(toJson(o)); return "[" + String.join(",", parts) + "]"; }
        if (v instanceof Map<?, ?> m) {
            List<String> parts = new ArrayList<>();
            for (var e : ((Map<String, Object>) m).entrySet()) parts.add(Json.quote(e.getKey()) + ":" + toJson(e.getValue()));
            return "{" + String.join(",", parts) + "}";
        }
        return "null";
    }

    private static Placement placementOf(String dim, String x, String y, String z, String turns, String mirror) {
        try {
            if (dim == null || !dim.matches("[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}")) throw new NumberFormatException();
            int t = Integer.parseInt(turns == null ? "0" : turns);
            if (t < 0 || t > 3) throw new NumberFormatException();
            return new Placement(dim, Integer.parseInt(x), Integer.parseInt(y), Integer.parseInt(z), t, "true".equals(mirror));
        } catch (NumberFormatException | NullPointerException e) {
            throw new LiveLinkServer.HttpError(400, "Lage ungültig (Dimension, X, Y, Z, Drehung).");
        }
    }

    // ------------------------------------------------------------------ settings

    private Path file() { return root.resolve("verbindung.properties"); }

    private Properties load() {
        Properties p = new Properties();
        try (var r = Files.newBufferedReader(file())) { p.load(r); } catch (IOException | RuntimeException ignored) { }
        return p;
    }

    private void saveTokens(Collection<String> tokens) {
        Properties p = load();
        p.setProperty("schluessel", String.join(",", tokens));
        store(p);
    }

    private void save() {
        Properties p = load();
        p.setProperty("aktiv", Boolean.toString(enabled));
        p.setProperty("port", Integer.toString(port));
        store(p);
    }

    private void store(Properties p) {
        try {
            Files.createDirectories(root);
            try (var w = Files.newBufferedWriter(file())) { p.store(w, "Bauplaner-Mod: Verbindung zur Website (nur 127.0.0.1). Schlüssel nicht weitergeben."); }
        } catch (IOException ignored) { }
    }
}
