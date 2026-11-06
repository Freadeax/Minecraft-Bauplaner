package io.github.freadeax.bauplaner.bridge.hologram;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import io.github.freadeax.bauplaner.mod.Placement;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.bridge.ScanJob;
import io.github.freadeax.bauplaner.mod.live.LiveLinkServer;
import io.github.freadeax.bauplaner.mod.live.PlanScan;
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
 * Live-Verbindung zur Website (MAP-03/GAME-03), the same on Fabric and NeoForge. Off until the player types
 * {@code /bauplaner verbinden}; then a small service on 127.0.0.1 answers the paired website:
 * player position, the placed plan and its live check, the surface of loaded chunks. The website can
 * place a plan in the hologram and send Weltplan marks. Everything game related runs on the game
 * thread; nothing is sent to the server and the world is never changed.
 */
public final class LiveLink implements LiveLinkServer.Handler {
    private final Path root;
    private final Hologram hologram;
    private final LiveLinkServer server;
    private final String loader;
    private final String version;
    private volatile WorldMarks marks = WorldMarks.NONE;
    /** Weltplan layers hidden in the game (GAME-08); not persisted, cleared with new marks. */
    private final java.util.Set<String> hiddenLayers = java.util.concurrent.ConcurrentHashMap.newKeySet();
    private volatile long lastRequest;
    private int port = LiveLinkServer.DEFAULT_PORT;
    private boolean enabled;

    public LiveLink(Path root, Hologram hologram, String loader, String version, String minecraft) {
        this.root = root;
        this.hologram = hologram;
        this.loader = loader;
        this.version = version;
        this.gameMarks = new io.github.freadeax.bauplaner.mod.live.GameMarks(root.resolve("markierungen-aus-dem-spiel.json"));
        gameMarks.load();
        Properties p = load();
        // LINK-03: the service runs by default (loopback only, nothing happens without pairing); off only after
        // "/bauplaner verbinden aus" or the switch in the menu.
        enabled = !"false".equals(p.getProperty("aktiv"));
        try { port = Integer.parseInt(p.getProperty("port", String.valueOf(LiveLinkServer.DEFAULT_PORT))); } catch (NumberFormatException ignored) { }
        List<String> tokens = Arrays.stream(p.getProperty("schluessel", "").split(",")).filter(s -> !s.isBlank()).toList();
        server = new LiveLinkServer(new LiveLinkServer.Info(version, loader, minecraft), this, tokens, this::saveTokens, System::currentTimeMillis);
        server.onAsk(a -> {
            Minecraft mc = Minecraft.getInstance();
            mc.execute(() -> McCompat.chat(mc, Component.literal("[Bauplaner] Der Planer („" + a.device + "“) möchte sich mit dem Spiel verbinden. J drücken → „Planer zulassen“.")));
        });
    }

    /** A website waits for "Zulassen" (LINK-03); null if none. */
    public String pendingAsk() { var a = server.pendingAsk(); return a == null ? null : a.device; }

    public String approve() {
        String device = server.approveAsk();
        return device == null ? "Es wartet gerade kein Planer auf die Freigabe." : "Planer „" + device + "“ zugelassen. Er ist jetzt mit dem Spiel verbunden.";
    }

    public String deny() {
        int n = server.denyAsks();
        return n == 0 ? "Es wartet gerade kein Planer auf die Freigabe." : "Abgelehnt. Der Planer bekommt keinen Zugang.";
    }

    /** Points set in the game for the Weltkarte (live protocol 3, GAME-08). */
    private final io.github.freadeax.bauplaner.mod.live.GameMarks gameMarks;

    public io.github.freadeax.bauplaner.mod.live.GameMarks outbox() { return gameMarks; }

    /** Website marks plus the points set in the game that still wait for the planer (layer „Aus dem Spiel“). */
    public WorldMarks marks() {
        WorldMarks m = marks;
        if (gameMarks.size() == 0) return m;
        Minecraft mc = Minecraft.getInstance();
        String dim = m.size() > 0 ? m.dimension() : mc.level != null ? McCompat.dimension(mc.level) : m.dimension();
        var own = gameMarks.points(dim);
        if (own.isEmpty()) return m;
        List<WorldMarks.Point> points = new java.util.ArrayList<>(m.points());
        points.addAll(own);
        return new WorldMarks(dim, m.sites(), m.paths(), List.copyOf(points), m.zones());
    }

    @Override
    public String gameMarks() {
        lastRequest = System.currentTimeMillis();
        return gameMarks.json();
    }

    @Override
    public String gameMarksAck(Map<String, Object> body) {
        lastRequest = System.currentTimeMillis();
        List<String> ids = new java.util.ArrayList<>();
        for (Object o : Json.arr(body.get("ids"), "IDs")) ids.add(Json.str(o, "ID", 40));
        int n = gameMarks.ack(ids);
        if (n > 0) {
            Minecraft mc = Minecraft.getInstance();
            mc.execute(() -> McCompat.chat(mc, Component.literal("[Bauplaner] " + n + " Markierung" + (n == 1 ? "" : "en") + " aus dem Spiel ist jetzt im Weltplan der Website.")));
        }
        return "{\"acked\":" + n + ",\"waiting\":" + gameMarks.size() + "}";
    }

    /** Whether entries on this Weltplan layer are drawn ("" = entries without a layer, always shown). */
    public boolean layerShown(String layer) { return layer.isEmpty() || !hiddenLayers.contains(layer); }

    /** Shows or hides a layer; returns the new state. */
    public boolean toggleLayer(String layer) { if (!hiddenLayers.remove(layer)) hiddenLayers.add(layer); return layerShown(layer); }

    public void showAllLayers() { hiddenLayers.clear(); }

    // ------------------------------------------------------------ Weltplan groups and locks (GAME-07-S11, 0.19.0)

    /** Groups hidden in the game (marks and the hologram part inside them); not persisted, kept to known groups. */
    private final java.util.Set<String> hiddenGroups = java.util.concurrent.ConcurrentHashMap.newKeySet();
    /** Group the hologram is limited to, null = all. */
    private volatile String group;

    /** Whether marks of this group are drawn ("" = in no group, always). */
    public boolean groupShown(String g) { return g.isEmpty() || !hiddenGroups.contains(g); }

    /** Whether an entry is drawn: its layer and its group are shown. */
    public boolean shown(WorldMarks.Extras e) { return layerShown(e.layer()) && groupShown(e.group()); }

    public String group() { return group; }

    /** Shows or hides a group; returns the new state. */
    public boolean toggleGroup(String g) {
        if (!hiddenGroups.remove(g)) hiddenGroups.add(g);
        refreshAreas();
        return groupShown(g);
    }

    public void showAllGroups() { hiddenGroups.clear(); refreshAreas(); }

    /** Limits the hologram to one group (null = all). Returns a message for the player. */
    public String setGroup(String g) {
        if (g == null) { group = null; refreshAreas(); return "Hologramm zeigt wieder alle Gruppen."; }
        if (!marks.groups().containsKey(g)) return "Keine Weltplan-Gruppe „" + g + "“. Liste: /bauplaner gruppe";
        group = g;
        hiddenGroups.remove(g);
        refreshAreas();
        String filtered = hologram.active() && hologram.check().placement().dimension().equals(marks.dimension()) ? "" : " (gilt, sobald ein Plan in " + marks.dimension() + " steht)";
        return "Hologramm nur in Gruppe „" + g + "“" + filtered + ". Zurück: /bauplaner gruppe alle";
    }

    /** Next group (cycling through "all"), for the J menu. */
    public String stepGroup() {
        List<String> names = new java.util.ArrayList<>(marks.groups().keySet());
        if (names.isEmpty()) return "Im Weltplan gibt es keine Gruppen. Auf der Website im Weltbuilder Einträge auswählen und „Gruppe …“ wählen.";
        int at = group == null ? -1 : names.indexOf(group);
        return setGroup(at + 1 >= names.size() ? null : names.get(at + 1));
    }

    /** Hands locked areas and the shown part to the hologram (after marks, group or hidden groups changed). */
    void refreshAreas() {
        WorldMarks m = marks;
        if (group != null && !m.groups().containsKey(group)) group = null;
        hiddenGroups.retainAll(m.groups().keySet());
        var locked = io.github.freadeax.bauplaner.mod.live.MarkAreas.locked(m).area();
        var show = group == null ? null : io.github.freadeax.bauplaner.mod.live.MarkAreas.group(m, group).area();
        var hidden = io.github.freadeax.bauplaner.mod.live.MarkAreas.groups(m, java.util.Set.copyOf(hiddenGroups)).area();
        if (hidden != null) show = (show == null ? io.github.freadeax.bauplaner.mod.live.MarkAreas.Area.EVERYWHERE : show).andNot(hidden);
        final var l = locked;
        final var sh = show;
        final String g = group;
        // Plain field writes (volatile in Hologram), also fine before the game window exists (loadMarks at start).
        hologram.setAreas(m.dimension(), l, sh, g);
    }

    @Override
    public String group(Map<String, Object> body) throws Exception {
        lastRequest = System.currentTimeMillis();
        Object raw = body.get("group");
        String g = raw == null ? null : Json.str(raw, "Gruppe", WorldMarks.GROUP_MAX).trim();
        if (g != null && g.isEmpty()) throw new LiveLinkServer.HttpError(400, "Gruppe fehlt.");
        String text = onGame(() -> setGroup(g));
        if (!java.util.Objects.equals(group, g)) throw new LiveLinkServer.HttpError(400, text);
        Minecraft mc = Minecraft.getInstance();
        mc.execute(() -> McCompat.chat(mc, Component.literal("[Bauplaner] Website: " + text)));
        return "{\"group\":" + (g == null ? "null" : Json.quote(g)) + "}";
    }

    /** GET /v1/players (GAME-08): the other players the client currently sees, without the own one. */
    @Override
    public String players() throws Exception {
        lastRequest = System.currentTimeMillis();
        return onGame(() -> {
            Minecraft mc = Minecraft.getInstance();
            StringBuilder b = new StringBuilder("{\"dimension\":");
            if (mc.level == null || mc.player == null) return b.append("\"minecraft:overworld\",\"players\":[]}").toString();
            b.append(Json.quote(McCompat.dimension(mc.level))).append(",\"players\":[");
            int n = 0;
            for (var p : mc.level.players()) {
                if (p == mc.player || n >= 200) continue;
                if (n++ > 0) b.append(',');
                b.append("{\"name\":").append(Json.quote(p.getName().getString())).append(",\"x\":").append(Json.num(p.getX())).append(",\"y\":").append(Json.num(p.getY()))
                        .append(",\"z\":").append(Json.num(p.getZ())).append(",\"yaw\":").append(Json.num(p.getYRot())).append('}');
            }
            return b.append("]}").toString();
        });
    }
    public boolean running() { return server.running(); }
    public int port() { return server.port(); }
    /** A paired website asked within the last five seconds. */
    public boolean websiteActive() { return System.currentTimeMillis() - lastRequest < 5_000; }

    /** Game start: resume the service when the player switched it on before. */
    public void resume(Minecraft mc) {
        if (!enabled) return;
        try { server.start(port); } catch (IOException e) { mc.execute(() -> McCompat.chat(mc, Component.literal("[Bauplaner] Verbindung zur Website nicht gestartet: " + e.getMessage()))); }
    }

    // ------------------------------------------------------------------ commands

    public String connect() {
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

    public String disconnect() {
        server.close();
        server.revokeAll();
        enabled = false;
        save();
        return "Website-Verbindung aus. Alle gekoppelten Browser müssen sich neu koppeln.";
    }

    public String setPort(int p) {
        if (p < 1024 || p > 65535) return "Port muss zwischen 1024 und 65535 liegen.";
        // Since 0.12 the service already runs from the start: the same port needs no restart (a quick
        // close and bind of the same port can fail while the old socket is still closing).
        if (server.running() && server.port() == p && port == p) return "Port " + p + " ist schon eingestellt. " + connect();
        server.close();
        port = p;
        save();
        // Setting the port means "connect on this port": start the service and show a code right away
        // (0.5.0 only saved it, so the website found nothing until /bauplaner verbinden was typed again).
        String connected = connect();
        return "Port " + p + " gespeichert" + (p == LiveLinkServer.DEFAULT_PORT ? "" : " – auf der Website unter „Port“ denselben eintragen") + ". " + connected;
    }

    public String statusText() {
        if (!server.running()) return "Website-Verbindung aus. Einschalten: im Menü „Website koppeln“ (oder /bauplaner verbinden).";
        return "Website-Verbindung an, Port " + server.port() + ", " + server.pairedClients() + " gekoppelte(r) Browser" + (websiteActive() ? ", Website fragt gerade ab" : "")
                + (server.pairingOpen() ? ", Kopplung offen" : "") + ". Markierungen: " + marks.size() + ".";
    }

    public void close() { server.close(); }

    // ------------------------------------------------------------------ handler (server threads)

    private static <T> T onGame(Supplier<T> task) throws Exception { return onGame(task, 3); }

    private static <T> T onGame(Supplier<T> task, int seconds) throws Exception {
        Minecraft mc = Minecraft.getInstance();
        try {
            return CompletableFuture.supplyAsync(task, mc).get(seconds, TimeUnit.SECONDS);
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
                        .append(",\"wrong\":").append(check.count(Verdict.WRONG)).append(",\"unknown\":").append(check.count(Verdict.UNKNOWN)).append("},\"total\":").append(check.size());
                // Build sections (0.7.0): active one (0 = all) and per section name, correct and total blocks.
                b.append(",\"section\":").append(hologram.section()).append(",\"sections\":[");
                var names = hologram.sectionNames();
                for (int k = 1; k <= names.size(); k++) {
                    int[] c = check.count(new io.github.freadeax.bauplaner.mod.Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, k));
                    int total = 0;
                    for (int v : c) total += v;
                    if (k > 1) b.append(',');
                    b.append("{\"name\":").append(Json.quote(names.get(k - 1))).append(",\"ok\":").append(c[Verdict.OK.ordinal()]).append(",\"total\":").append(total).append('}');
                }
                // GAME-07-S11 (0.19.0): chosen Weltplan group and planned blocks inside locked areas.
                b.append("],\"group\":").append(hologram.group() == null ? "null" : Json.quote(hologram.group())).append(",\"locked\":").append(hologram.lockedBlocks()).append('}');
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

    // ------------------------------------------------------------------ Gelände (TERRAIN-04, 0.20.0)

    private TerrainRecorder terrain;

    /** Set once by {@link HologramClient}: the Geländegedächtnis behind {@code /v1/terrain}. */
    void terrain(TerrainRecorder recorder) { this.terrain = recorder; }

    @Override
    public String terrain(int[][] wanted) throws Exception {
        lastRequest = System.currentTimeMillis();
        TerrainRecorder rec = terrain;
        if (rec == null) throw new LiveLinkServer.HttpError(404, "Diese Mod hat kein Geländegedächtnis.");
        return onGame(() -> {
            var level = Minecraft.getInstance().level;
            if (level == null) throw new LiveLinkServer.HttpError(409, "Keine Welt geladen.");
            return rec.memory().answer(McCompat.dimension(level), wanted, System.currentTimeMillis(), (x, z) -> TerrainRecorder.read(level, x, z));
        });
    }

    @Override
    public String terrainKnown(int[] a) throws Exception {
        lastRequest = System.currentTimeMillis();
        TerrainRecorder rec = terrain;
        if (rec == null) throw new LiveLinkServer.HttpError(404, "Diese Mod hat kein Geländegedächtnis.");
        String dim = onGame(() -> {
            var level = Minecraft.getInstance().level;
            if (level == null) throw new LiveLinkServer.HttpError(409, "Keine Welt geladen.");
            return McCompat.dimension(level);
        });
        return rec.memory().knownJson(dim, a[0], a[1], a[2], a[3]);
    }

    @Override
    public String box(int[] b) throws Exception {
        lastRequest = System.currentTimeMillis();
        final net.minecraft.client.multiplayer.ClientLevel[] at = new net.minecraft.client.multiplayer.ClientLevel[1];
        io.github.freadeax.bauplaner.mod.live.BoxRead job = onGame(() -> {
            var level = Minecraft.getInstance().level;
            if (level == null) throw new LiveLinkServer.HttpError(409, "Keine Welt geladen.");
            at[0] = level;
            return new io.github.freadeax.bauplaner.mod.live.BoxRead(McCompat.dimension(level), b, McCompat.clientBlocks(level));
        });
        while (!job.finished()) {
            boolean done = onGame(() -> {
                if (Minecraft.getInstance().level != at[0]) throw new LiveLinkServer.HttpError(409, "Die Welt wurde während des Lesens gewechselt.");
                return job.step(io.github.freadeax.bauplaner.mod.live.BoxRead.CELLS_PER_SLICE);
            }, 15);
            if (done) break;
        }
        return job.json();
    }

    @Override
    public String plan(Map<String, String> q, byte[] schem) throws Exception {
        lastRequest = System.currentTimeMillis();
        String name = q.getOrDefault("name", "");
        if (!name.matches("[A-Za-z0-9._-]{1,120}\\.schem") || name.startsWith(".")) throw new LiveLinkServer.HttpError(400, "Dateiname ungültig.");
        Placement at = placementOf(q.get("dimension"), q.get("x"), q.get("y"), q.get("z"), q.get("turns"), q.get("mirror"));
        // Read and check the file here, on the web request's thread, before it lands in the plans folder. Big
        // plans (SIZE-01, millions of blocks) are fully prepared here too, so the game thread only swaps them in.
        io.github.freadeax.bauplaner.mod.PlanModel model;
        LiveCheck prepared;
        try {
            model = io.github.freadeax.bauplaner.mod.PlanModel.parse(name, schem);
            prepared = new LiveCheck(model, at);
        } catch (RuntimeException e) {
            throw new LiveLinkServer.HttpError(400, "Plandatei nicht lesbar: " + e.getMessage());
        } catch (OutOfMemoryError e) {
            throw new LiveLinkServer.HttpError(507, "Zu wenig Arbeitsspeicher für diesen Plan. Mehr Speicher für Minecraft einstellen oder den Plan auf der Website in Teilprojekte teilen.");
        }
        Path dir = hologram.plansDir();
        Files.createDirectories(dir);
        Path tmp = dir.resolve(name + ".tmp"), out = dir.resolve(name);
        Files.write(tmp, schem);
        Files.move(tmp, out, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        final io.github.freadeax.bauplaner.mod.PlanModel m = model;
        final LiveCheck c = prepared;
        String msg = onGame(() -> hologram.install(name, m, c));
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

    /** Website chooses the build section (0 = all); the game shows it like Num / would. */
    @Override
    public String section(Map<String, Object> body) throws Exception {
        lastRequest = System.currentTimeMillis();
        int n = Json.integer(body.get("section"), "Abschnitt", 0, 255);
        String msg = onGame(() -> {
            if (!hologram.active()) return null;
            String text = hologram.setSection(n);
            Minecraft mc = Minecraft.getInstance();
            McCompat.chat(mc, Component.literal("[Bauplaner] Website: " + text));
            return text;
        });
        if (msg == null) throw new LiveLinkServer.HttpError(409, "Im Spiel ist kein Plan platziert.");
        if (hologram.section() != n) throw new LiveLinkServer.HttpError(400, msg);
        return "{\"section\":" + n + "}";
    }

    @Override
    public String marks(Map<String, Object> body) throws Exception {
        lastRequest = System.currentTimeMillis();
        WorldMarks next = WorldMarks.parse(body);
        marks = next;
        hiddenLayers.retainAll(next.layers().keySet());
        refreshAreas();
        try {
            Files.createDirectories(root);
            Files.writeString(root.resolve("markierungen.json"), "{\"dimension\":" + Json.quote(next.dimension()) + ",\"items\":" + itemsText(body) + "}", StandardCharsets.UTF_8);
        } catch (IOException ignored) { }
        Minecraft mc = Minecraft.getInstance();
        mc.execute(() -> McCompat.overlay(mc, Component.literal("Bauplaner: " + next.size() + " Markierungen von der Website")));
        return "{\"marks\":" + next.size() + "}";
    }

    @Override
    public LiveLinkServer.Binary scan() throws Exception {
        lastRequest = System.currentTimeMillis();
        // Big plan boxes (SIZE-01, up to 16.7 million cells) are read in slices on the game thread, one slice
        // per call, so the game keeps rendering between them instead of hanging for seconds.
        final io.github.freadeax.bauplaner.bridge.Plan[] identity = new io.github.freadeax.bauplaner.bridge.Plan[1];
        final net.minecraft.client.multiplayer.ClientLevel[] at = new net.minecraft.client.multiplayer.ClientLevel[1];
        ScanJob job = onGame(() -> {
            Minecraft mc = Minecraft.getInstance();
            var level = mc.level;
            if (level == null) throw new LiveLinkServer.HttpError(409, "Keine Welt geladen.");
            LiveCheck check = hologram.check();
            if (check == null) throw new LiveLinkServer.HttpError(409, "Im Spiel ist kein Plan platziert.");
            Placement pl = check.placement();
            String here = McCompat.dimension(level);
            if (!pl.dimension().equals(here))
                throw new LiveLinkServer.HttpError(409, "Das Hologramm steht in " + pl.dimension() + ", du bist in " + here + ". Für den Baustand in dieselbe Dimension wechseln.");
            identity[0] = hologram.plan().identity();
            at[0] = level;
            return PlanScan.begin(identity[0], pl, McCompat.clientBlocks(level), McCompat.dataVersion(),
                    new ScanJob.Info(McCompat.gameVersion(), version, loader, pl.dimension(), "client"));
        }, 15);
        while (!job.finished()) {
            boolean done = onGame(() -> {
                if (Minecraft.getInstance().level != at[0]) throw new LiveLinkServer.HttpError(409, "Die Welt wurde während des Baustands gewechselt.");
                return job.step(PlanScan.CELLS_PER_SLICE);
            }, 15);
            if (done) break;
        }
        PlanScan.Result r = PlanScan.finish(identity[0], job, Instant.now());
        // Same folder as /bauplaner scan, so the file can also be imported by hand.
        try {
            Path dir = root.resolve("scans");
            Files.createDirectories(dir);
            Files.write(dir.resolve(r.fileName()), r.bytes());
        } catch (IOException ignored) { }
        return new LiveLinkServer.Binary(r.fileName(), r.bytes());
    }

    /** Marks of the last session, so the player sees them again without opening the website. */
    public void loadMarks() {
        try {
            String text = Files.readString(root.resolve("markierungen.json"), StandardCharsets.UTF_8);
            marks = WorldMarks.parse(Json.obj(Json.parse(text), "Markierungen"));
            refreshAreas();
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

    // ------------------------------------------------------------------ Teambau (COOP-03)

    private TeamClient team;

    /** Set once by {@link HologramClient}; the team endpoints answer 404 without it. */
    void team(TeamClient team) {
        this.team = team;
        team.recorder(this::recordToRoom);
        var room = team.sync().room();
        // LINK-07: „Aufnahme anfordern“ in the planner – the game records its loaded chunks and puts the file into the room.
        if (room != null) room.onAsk(ask -> {
            var plan = hologram.plan();
            if (!hologram.active() || plan == null) return;
            if (ask.projectId() != null && !ask.projectId().equals(plan.identity().projectId())) return;
            java.util.concurrent.CompletableFuture.runAsync(() -> recordToRoom(ask.from() == null ? "der Planer" : "ein Mitspieler"));
        });
    }

    private volatile boolean recording;

    /**
     * Records the placed plan (same as GET /v1/scan) and uploads it into the team room. Runs off the game thread;
     * returns the chat text. Also used by {@code /bauplaner team aufnahme}.
     */
    String recordToRoom(String askedBy) {
        var room = team == null ? null : team.sync().room();
        Minecraft mc = Minecraft.getInstance();
        java.util.function.Consumer<String> say = text -> mc.execute(() -> McCompat.chat(mc, Component.literal("[Bauplaner] " + text)));
        if (room == null || !room.live()) { say.accept("Aufnahme: kein Team-Raum verbunden."); return "kein Raum"; }
        if (recording) return "läuft schon";
        recording = true;
        try {
            var plan = hologram.plan();
            LiveLinkServer.Binary b = scan();
            room.uploadScan(b.fileName(), b.bytes(), plan == null ? null : plan.identity().projectId(), plan == null ? null : plan.identity().revisionNumber());
            say.accept("Baustand aufgenommen und in den Team-Raum gelegt" + (askedBy == null ? "" : " (angefordert von " + askedBy + ")") + ". Im Planer unter „Mit Spiel abgleichen“ holen.");
            return "ok";
        } catch (LiveLinkServer.HttpError e) {
            say.accept("Aufnahme nicht möglich: " + e.getMessage());
            return e.getMessage();
        } catch (Exception e) {
            say.accept("Aufnahme fehlgeschlagen: " + e.getMessage());
            return String.valueOf(e.getMessage());
        } finally {
            recording = false;
        }
    }

    private TeamClient needTeam() {
        if (team == null) throw new LiveLinkServer.HttpError(404, "Teambau ist in dieser Mod aus.");
        lastRequest = System.currentTimeMillis();
        return team;
    }

    /** GET /v1/team: link to the plugin, waiting own actions as planner events, what the game shows. */
    @Override
    public String teamGet() {
        TeamClient t = needTeam();
        var sync = t.sync();
        var shown = t.state();
        var server = sync.serverState();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("link", sync.link().name().toLowerCase(java.util.Locale.ROOT));
        out.put("linkText", sync.link().label);
        out.put("allowed", sync.allowed());
        if (shown != null) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("teamId", shown.teamId()); s.put("name", shown.name()); s.put("source", shown.source().name().toLowerCase(java.util.Locale.ROOT));
            s.put("revision", shown.revision()); s.put("me", shown.me()); s.put("sections", shown.sections().size());
            out.put("shown", s);
        }
        if (server != null) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("teamId", server.teamId()); s.put("name", server.name()); s.put("revision", server.revision()); s.put("me", server.me());
            s.put("stores", server.stores().size());
            out.put("server", s);
        }
        out.put("outbox", new ArrayList<Object>(sync.outboxForPlaner()));
        out.put("waiting", sync.outbox().pending().size());
        out.put("rejections", new ArrayList<Object>(sync.rejections()));
        if (sync.lastError() != null) out.put("lastError", sync.lastError());
        return Json.write(out);
    }

    /** GET /v1/room (LINK-07): the team room the mod uses without a server file; never the key. */
    @Override
    public String roomGet() {
        TeamClient t = needTeam();
        var room = t.sync().room();
        Map<String, Object> out = new LinkedHashMap<>();
        if (room == null || room.config() == null) { out.put("connected", false); out.put("status", "off"); return Json.write(out); }
        out.put("connected", true);
        out.putAll(room.config().publicFields());
        out.put("status", room.status().name().toLowerCase(java.util.Locale.ROOT));
        out.put("statusText", room.statusText());
        // FALLBACK-01: how the mod talks to the room right now and how old the shown state is.
        out.put("mode", room.mode());
        if (room.syncedAt() > 0) out.put("syncedAt", java.time.Instant.ofEpochMilli(room.syncedAt()).toString());
        out.put("pendingReports", room.pendingReports());
        if (t.sync().handoverText() != null) out.put("serverHandover", t.sync().handoverText());
        out.put("events", room.events());
        List<Object> here = new ArrayList<>();
        for (var p : room.presence()) { Map<String, Object> m = new LinkedHashMap<>(); m.put("member", p.member()); m.put("where", p.where()); if (p.section() != null) m.put("section", p.section()); here.add(m); }
        out.put("presence", here);
        var st = t.sync().roomState();
        if (st != null) {
            out.put("teamId", st.teamId()); out.put("sections", st.sections().size()); out.put("me", st.me());
            out.put("waiting", t.sync().outbox().pending(st.teamId()).size());
            List<Object> owners = new ArrayList<>();
            for (var sec : st.sections()) { Map<String, Object> m = new LinkedHashMap<>(); m.put("id", sec.id()); m.put("status", sec.status()); if (sec.owner() != null) m.put("owner", sec.owner()); owners.add(m); }
            out.put("sectionStates", owners);
        }
        if (room.lastError() != null) out.put("lastError", room.lastError());
        return Json.write(out);
    }

    /** POST /v1/room {url, room, key, member, …} or {off:true}: the planner connects (or disconnects) this game with a team room. */
    @Override
    public String roomPost(Map<String, Object> body) throws Exception {
        TeamClient t = needTeam();
        var room = t.sync().room();
        if (room == null) throw new LiveLinkServer.HttpError(404, "Diese Mod kennt keinen Team-Raum.");
        if (Boolean.TRUE.equals(body.get("off"))) { room.forget(); return Json.write(Map.of("ok", true, "text", "Team-Raum getrennt. Die Mod spricht mit keinem Raum mehr.")); }
        io.github.freadeax.bauplaner.mod.room.RoomClient.Config c;
        try { c = io.github.freadeax.bauplaner.mod.room.RoomClient.parse(body); }
        catch (RuntimeException e) { throw new LiveLinkServer.HttpError(400, e.getMessage()); }
        room.use(c);
        Minecraft mc = Minecraft.getInstance();
        mc.execute(() -> McCompat.chat(mc, Component.literal("[Bauplaner] Der Planer hat dein Spiel mit dem Team-Raum" + (c.teamName() != null ? " „" + c.teamName() + "“" : "")
                + " verbunden – Teambau ohne Server-Datei. Trennen: im Planer unter „Team live“ → „Spiel trennen“.")));
        // LINK-11: with the Bauleitung's server key the server plugin (if any) joins the room right away.
        if (c.serverKey() != null) mc.execute(() -> t.sync().handOverRoom());
        return Json.write(Map.of("ok", true, "text", "Spiel mit dem Team-Raum verbunden."));
    }

    /** POST /v1/team: the planner's team view (format team-link 1). */
    @Override
    public String teamPost(Map<String, Object> body) {
        TeamClient t = needTeam();
        t.sync().fromPlaner(body);
        var p = t.sync().planerState();
        int matched = 0;
        var plan = hologram.plan();
        if (plan != null) { var tp = new io.github.freadeax.bauplaner.mod.team.TeamPlan(p, plan); for (var s : p.sections()) if (tp.number(s.id()) > 0) matched++; }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        out.put("sections", p.sections().size());
        out.put("inPlan", matched);
        out.put("link", t.sync().link().name().toLowerCase(java.util.Locale.ROOT));
        return Json.write(out);
    }

    /** POST /v1/team/ack {ids}: the planner merged these events. */
    @Override
    public String teamAck(Map<String, Object> body) {
        TeamClient t = needTeam();
        List<String> ids = new ArrayList<>();
        for (Object o : Json.arr(body.get("ids"), "IDs")) ids.add(Json.str(o, "ID", 64));
        return "{\"removed\":" + t.sync().ackFromPlaner(ids) + "}";
    }

    /** POST /v1/team/push {file}: a team server file to the plugin (Bauleitung only, the plugin checks). */
    @Override
    public String teamPush(Map<String, Object> body) throws Exception {
        TeamClient t = needTeam();
        Map<String, Object> file = Json.obj(body.get("file"), "Teamdatei");
        return relay(t.sync().request("push", Map.of("file", file)));
    }

    /** GET /v1/team/pull?teamId=…&since=…: raw events from the plugin for the planner. */
    @Override
    public String teamPull(Map<String, String> query) throws Exception {
        TeamClient t = needTeam();
        Map<String, Object> q = new LinkedHashMap<>();
        if (query.get("teamId") != null) q.put("teamId", query.get("teamId"));
        if (query.get("since") != null) q.put("since", query.get("since"));
        return relay(t.sync().request("pull", q));
    }

    // ------------------------------------------------------------------ server link (LINK-03)

    /** GET /v1/server: who the server plugin is, whether this player may pair it; or why there is no way. */
    @Override
    public String serverInfo() throws Exception {
        TeamClient t = needTeam();
        var sync = t.sync();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("link", sync.link().name().toLowerCase(java.util.Locale.ROOT));
        out.put("linkText", sync.link().label);
        out.put("allowed", sync.allowed());
        if (sync.link() != io.github.freadeax.bauplaner.mod.team.TeamSync.Link.LIVE) return Json.write(out);
        try {
            Map<String, Object> info = sync.request("link.info", Map.of()).get(10, TimeUnit.SECONDS);
            info = new LinkedHashMap<>(info);
            info.remove("t"); info.remove("v"); info.remove("req");
            if (info.containsKey("error")) out.put("error", info.get("error")); else out.put("server", info);
        } catch (java.util.concurrent.ExecutionException | TimeoutException e) {
            out.put("error", e instanceof TimeoutException ? "Das Server-Plugin antwortet nicht." : String.valueOf(e.getCause() == null ? e : e.getCause().getMessage()));
        }
        return Json.write(out);
    }

    /** POST /v1/server/claim {device}: the plugin checks that this player is operator and returns the owner key once. */
    @Override
    public String serverClaim(Map<String, Object> body) throws Exception {
        TeamClient t = needTeam();
        Map<String, Object> m = new LinkedHashMap<>();
        if (body.get("device") instanceof String d) m.put("device", d.length() > 40 ? d.substring(0, 40) : d);
        return relay(t.sync().request("link.claim", m), 15);
    }

    /** POST /v1/server/control {owner, seq, body, sig}: passed on unchanged; only the plugin can check it. */
    @Override
    public String serverControl(Map<String, Object> body) throws Exception {
        TeamClient t = needTeam();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("owner", Json.str(body.get("owner"), "owner", 64));
        if (!(body.get("seq") instanceof Number n)) throw new LiveLinkServer.HttpError(400, "seq fehlt.");
        m.put("seq", n.longValue());
        m.put("body", Json.str(body.get("body"), "body", 6 * 1024 * 1024));
        m.put("sig", Json.str(body.get("sig"), "sig", 128));
        return relay(t.sync().request("link.ctl", m), 30);
    }

    private static String relay(java.util.concurrent.CompletableFuture<Map<String, Object>> f) throws Exception { return relay(f, 15); }

    private static String relay(java.util.concurrent.CompletableFuture<Map<String, Object>> f, int seconds) throws Exception {
        Map<String, Object> answer;
        try {
            answer = f.get(seconds, TimeUnit.SECONDS);
        } catch (java.util.concurrent.ExecutionException e) {
            throw new LiveLinkServer.HttpError(409, e.getCause() == null ? "Kein Weg zum Server." : e.getCause().getMessage());
        } catch (TimeoutException e) {
            throw new LiveLinkServer.HttpError(504, "Das Server-Plugin hat nicht innerhalb von " + seconds + " Sekunden geantwortet.");
        }
        if (answer.get("error") instanceof String err) throw new LiveLinkServer.HttpError(err.startsWith("Nur die Bauleitung") || err.startsWith("Koppeln darf nur") ? 403 : 409, err);
        Map<String, Object> out = new LinkedHashMap<>(answer);
        out.remove("t"); out.remove("v"); out.remove("req");
        return Json.write(out);
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
