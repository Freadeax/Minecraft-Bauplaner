package io.github.freadeax.bauplaner.bridge.gametest;

import com.mojang.blaze3d.platform.InputConstants;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.world.level.levelgen.Heightmap;

/**
 * SIZE-01-S05 and SPLIT-01-S05 in the real game (scripts/size/test_grossbau_ingame.sh, files in BAUPLANER_GAMETEST_DIR):
 * <ol>
 * <li>Basis: builds the base from {@code basis.txt} (game commands relative to the anchor) into a real world with its
 * natural terrain around, and records it through the mod's own {@code GET /v1/box} as {@code basis-box.json}.</li>
 * <li>Großbau: opens the link for the real website (pairing code in {@code pair-code.txt}), waits until the website –
 * a real browser driven by tests/big/grossbau.big.mjs – has sent the big plan, and measures meanwhile how long the
 * game stood still (longest gap between two client ticks). Then render budget, turning with the End key, moving with
 * the arrow keys, diagnosis and a Baustand of the whole plan box, results in {@code grossbau-mod.json}.</li>
 * </ol>
 */
final class GrossbauScenario {
    private static final String SITE = "https://freadeax.github.io";
    private static final int PORT = 47615;
    /** Seed of the test world (normal terrain); dryGround picks the first dry spot east of spawn. */
    static final String SEED = "LMNT-Bauplaner-Grossbau";

    private GrossbauScenario() {}

    static void run(ClientGameTestContext context, Path io, Path root) throws IOException {
        Files.createDirectories(root);
        // A normal world with real terrain (hills, trees, water) and a fixed seed instead of the flat test world: the base
        // stands in natural surroundings and its cellar and bunker have real ground around them.
        try (TestSingleplayerContext world = context.worldBuilder().setUseConsistentSettings(false).adjustSettings(s -> s.setSeed(SEED)).create()) {
            world.getServer().runCommand("time set noon");
            world.getServer().runCommand("gamemode creative @a");
            int[] anchor = world.getServer().computeOnServer(GrossbauScenario::dryGround);
            Files.writeString(io.resolve("anchor.txt"), anchor[0] + " " + anchor[1] + " " + anchor[2] + "\n");
            BridgeGameTest.chat(context, "/bauplaner sprache deutsch");
            BridgeGameTest.chat(context, "/bauplaner verbinden port " + PORT);
            String code = BridgeGameTest.pairingCode();
            if (code == null) throw new AssertionError("„/bauplaner verbinden port“ hat die Verbindung nicht gestartet");
            var http = java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build();
            String base = "http://127.0.0.1:" + PORT;
            String pair = BridgeGameTest.request(context, http, base + "/v1/pair", "POST", "{\"code\":\"" + code + "\"}", null, SITE);
            var m = java.util.regex.Pattern.compile("\"token\":\"([A-Za-z0-9_-]+)\"").matcher(pair);
            if (!m.find()) throw new AssertionError("Kopplung ohne Schlüssel: " + pair);
            String token = m.group(1);
            try {
                if (Files.isRegularFile(io.resolve("basis.txt"))) basis(context, world, io, anchor, http, base, token);
                if (Files.isRegularFile(io.resolve("grossstadt.json"))) bigPlan(context, world, io, root, anchor, http, base, token);
            } catch (Throwable t) {
                t.printStackTrace();
                Files.writeString(io.resolve("fehler.txt"), String.valueOf(t));
                throw t;
            }
            Files.writeString(io.resolve("state.properties"), "grossbau=fertig\n");
        }
    }

    // ------------------------------------------------------------------ SPLIT-01: base in a real world

    private static void basis(ClientGameTestContext context, TestSingleplayerContext world, Path io, int[] anchor,
            java.net.http.HttpClient http, String base, String token) throws IOException {
        List<String> lines = Files.readAllLines(io.resolve("basis.txt")).stream().filter(l -> !l.isBlank()).toList();
        int[] box = java.util.Arrays.stream(Files.readString(io.resolve("basis-box.txt")).trim().split(" ")).mapToInt(Integer::parseInt).toArray();
        // Stand over the middle of the site so every chunk of the recording is loaded.
        world.getServer().runCommand("tp @a " + (anchor[0] + 40.5) + " " + (anchor[1] + 40) + " " + (anchor[2] + 32.5) + " 0 90");
        world.getConnection().waitForChunksRender();
        long t0 = System.nanoTime();
        int failed = 0;
        for (String line : lines) {
            String[] p = line.split(" ");
            StringBuilder cmd = new StringBuilder(p[0]);
            int coords = p[0].equals("fill") ? 6 : 3;
            for (int i = 1; i <= coords; i++) cmd.append(' ').append(anchor[(i - 1) % 3] + Integer.parseInt(p[i]));
            for (int i = coords + 1; i < p.length; i++) cmd.append(' ').append(p[i]);
            String c = cmd.toString();
            if (!world.getServer().computeOnServer(s -> runs(s, c))) failed++;
        }
        long buildMs = (System.nanoTime() - t0) / 1_000_000;
        // Water settles, wheat and fences update; then the mod records the box with the natural terrain around.
        context.waitTicks(60);
        world.getConnection().waitForChunksRender();
        String q = (anchor[0] + box[0]) + "," + (anchor[1] + box[1]) + "," + (anchor[2] + box[2]) + "," + (anchor[0] + box[3]) + "," + (anchor[1] + box[4]) + "," + (anchor[2] + box[5]);
        long r0 = System.nanoTime();
        String answer = BridgeGameTest.request(context, http, base + "/v1/box?b=" + q, "GET", null, token, SITE);
        long readMs = (System.nanoTime() - r0) / 1_000_000;
        Files.writeString(io.resolve("basis-box.json"), answer);
        Files.writeString(io.resolve("basis-mod.json"), "{\"commands\":" + lines.size() + ",\"failed\":" + failed + ",\"buildMs\":" + buildMs + ",\"readMs\":" + readMs + "}");
        // Picture from above the north-west corner.
        context.setScreen(() -> null);
        context.runOnClient(mc -> mc.gui.hud.getChat().clearMessages(false));
        world.getServer().runCommand("tp @a " + (anchor[0] - 14.5) + " " + (anchor[1] + 26) + " " + (anchor[2] - 14.5) + " -45 35");
        world.getConnection().waitForChunksRender();
        context.waitTicks(20);
        BridgeGameTest.copy(context.takeScreenshot("bauplaner-basis"), io.resolve("basis.png"));
    }

    /** First column (every 64 blocks east of 8/8) whose surface is not water, ice or leaves: the base's ground block. */
    private static int[] dryGround(net.minecraft.server.MinecraftServer s) {
        var level = s.overworld();
        for (int k = 0; k < 64; k++) {
            int x = 8 + 64 * k, z = 8;
            level.getChunk(x >> 4, z >> 4); // generate the chunk, otherwise the height map is still empty
            int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z) - 1;
            if (y <= level.getMinY() + 16) continue;
            var state = level.getBlockState(new net.minecraft.core.BlockPos(x, y, z));
            if (state.getFluidState().isEmpty() && !state.is(net.minecraft.world.level.block.Blocks.ICE)) return new int[] { x, y, z };
        }
        throw new AssertionError("kein trockener Bauplatz gefunden");
    }

    /** Runs one command on the server; false when the game refused it (counted, the recording shows the result). */
    private static boolean runs(net.minecraft.server.MinecraftServer s, String command) {
        try {
            var source = s.createCommandSourceStack().withSuppressedOutput();
            s.getCommands().performPrefixedCommand(source, command);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    // ------------------------------------------------------------------ SIZE-01: big plan from the real website

    private static void bigPlan(ClientGameTestContext context, TestSingleplayerContext world, Path io, Path root, int[] anchor,
            java.net.http.HttpClient http, String base, String token) throws IOException {
        world.getServer().runCommand("tp @a " + (anchor[0] + 0.5) + " " + (anchor[1] + 1) + " " + (anchor[2] + 0.5) + " 0 20");
        world.getConnection().waitForChunksRender();
        context.setScreen(() -> null);
        context.waitTicks(2);
        // A fresh code for the browser (the test's own pairing used the first one).
        BridgeGameTest.chat(context, "/bauplaner verbinden");
        String code = BridgeGameTest.pairingCode();
        if (code == null) throw new AssertionError("kein zweiter Kopplungscode");
        Files.writeString(io.resolve("pair-code.txt"), code + "\n");
        // LINK-03: the website asks, the player allows it in the game (J → „Planer zulassen“, same as this command).
        context.waitFor(mc -> Files.isRegularFile(io.resolve("verbinden.txt")) || Files.isRegularFile(io.resolve("browser-fehler.txt")), 20 * 600);
        context.waitTicks(40);
        context.setScreen(() -> null);
        BridgeGameTest.chat(context, "/bauplaner verbinden zulassen");
        Object hologram;
        try {
            Object client = FabricLoader.getInstance().getEntrypointContainers("client", net.fabricmc.api.ClientModInitializer.class).stream()
                    .map(c -> c.getEntrypoint()).filter(e -> e.getClass().getName().endsWith(".BridgeClient")).findFirst().orElseThrow();
            hologram = BridgeGameTest.field(BridgeGameTest.field(client, "client"), "hologram");
        } catch (ReflectiveOperationException e) {
            throw new AssertionError("Hologramm nicht erreichbar", e);
        }
        var holo = (io.github.freadeax.bauplaner.bridge.hologram.Hologram) hologram;
        // Wait for the website (import, workshop, project, export take minutes in the browser). Every client tick is timed:
        // from the moment the browser starts sending (senden.txt) the longest gap shows whether the game froze.
        long[] last = { System.nanoTime() }, maxGap = { 0 }, sendStart = { 0 };
        long limit = System.nanoTime() + 25L * 60 * 1_000_000_000L;
        context.waitFor(mc -> {
            long now = System.nanoTime();
            if (sendStart[0] != 0) maxGap[0] = Math.max(maxGap[0], now - last[0]);
            else if (Files.isRegularFile(io.resolve("senden.txt"))) sendStart[0] = now;
            last[0] = now;
            String f = holo.planFile();
            if (now > limit || Files.isRegularFile(io.resolve("browser-fehler.txt"))) return true;
            return f != null && f.startsWith("grossstadt") && !holo.loading();
        }, Integer.MAX_VALUE);
        if (Files.isRegularFile(io.resolve("browser-fehler.txt"))) throw new AssertionError("Browser: " + Files.readString(io.resolve("browser-fehler.txt")));
        if (holo.planFile() == null || !holo.planFile().startsWith("grossstadt")) throw new AssertionError("Der große Plan kam nicht im Spiel an.");
        long installedMs = sendStart[0] == 0 ? -1 : (System.nanoTime() - sendStart[0]) / 1_000_000;
        StringBuilder out = new StringBuilder("{\"planFile\":\"" + holo.planFile() + "\",\"installedMs\":" + installedMs + ",\"maxTickGapMs\":" + maxGap[0] / 1_000_000);
        out.append(",\"status\":").append(BridgeGameTest.request(context, http, base + "/v1/status", "GET", null, token, SITE));
        Runtime rt = Runtime.getRuntime();
        out.append(",\"heapUsedMb\":").append((rt.totalMemory() - rt.freeMemory()) >> 20).append(",\"heapMaxMb\":").append(rt.maxMemory() >> 20);

        // Stand inside the city next to the hologram: render budget and its HUD line.
        var pl = holo.check().placement();
        world.getServer().runCommand("tp @a " + (pl.x() + 30.5) + " " + (pl.y() + 12) + " " + (pl.z() - 6.5) + " 0 25");
        world.getConnection().waitForChunksRender();
        context.setScreen(() -> null);
        context.waitTicks(100);
        BridgeGameTest.copy(context.takeScreenshot("bauplaner-grossbau"), io.resolve("grossbau.png"));
        // Render budget: what the hologram draws per budget once the view has settled (the HUD line says when it cuts off).
        out.append(",\"budget\":[");
        String[] levels = { "normal", "niedrig", "hoch", "normal" };
        for (int i = 0; i < levels.length; i++) {
            BridgeGameTest.chat(context, "/bauplaner leistung " + levels[i]);
            context.setScreen(() -> null);
            context.waitTicks(60);
            out.append(i > 0 ? "," : "").append("{\"level\":\"").append(levels[i]).append("\",\"shown\":").append(holo.shown()).append(",\"capped\":").append(holo.capped()).append('}');
        }
        out.append(']');

        // Turn with the End key and move with the arrow keys like a player: the old hologram stays until the new one is ready.
        out.append(",\"turn\":").append(timed(context, holo, () -> context.getInput().pressKey(InputConstants.KEY_END)));
        var turned = holo.check().placement();
        out.append(",\"turnedTo\":").append(turned.turns());
        out.append(",\"move\":").append(timed(context, holo, () -> context.getInput().pressKey(InputConstants.KEY_RIGHT)));
        var moved = holo.check().placement();
        out.append(",\"moved\":[").append(moved.x() - turned.x()).append(',').append(moved.y() - turned.y()).append(',').append(moved.z() - turned.z()).append(']');

        BridgeGameTest.chat(context, "/bauplaner diagnose");
        context.setScreen(() -> null);
        BridgeGameTest.copyDiagnose(root, io);
        Files.move(io.resolve("diagnose.txt"), io.resolve("grossbau-diagnose.txt"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);

        // Baustand of the whole plan box (sliced in the game, 200 000 cells per tick).
        long s0 = System.nanoTime();
        last[0] = s0; maxGap[0] = 0;
        String scan = downloadTimed(context, http, base + "/v1/scan", token, io.resolve("grossbau-scan.schem"), last, maxGap);
        out.append(",\"scan\":").append(scan).append(",\"scanMs\":").append((System.nanoTime() - s0) / 1_000_000).append(",\"scanMaxTickGapMs\":").append(maxGap[0] / 1_000_000);
        out.append(",\"after\":").append(BridgeGameTest.request(context, http, base + "/v1/status", "GET", null, token, SITE)).append('}');
        Files.writeString(io.resolve("grossbau-mod.json"), out.toString());
    }

    /** Runs a key press and waits until the hologram stands at the new place; answers {"ms":…,"maxTickGapMs":…}. */
    private static String timed(ClientGameTestContext context, io.github.freadeax.bauplaner.bridge.hologram.Hologram holo, Runnable action) {
        context.setScreen(() -> null);
        context.waitTicks(2);
        var before = holo.check().placement();
        long t0 = System.nanoTime();
        action.run();
        long[] last = { System.nanoTime() }, gap = { 0 };
        context.waitFor(mc -> {
            long now = System.nanoTime();
            gap[0] = Math.max(gap[0], now - last[0]);
            last[0] = now;
            return !holo.loading() && !holo.check().placement().equals(before);
        }, 20 * 120);
        return "{\"ms\":" + (System.nanoTime() - t0) / 1_000_000 + ",\"maxTickGapMs\":" + gap[0] / 1_000_000 + "}";
    }

    /** Like BridgeGameTest.download, but times the client ticks while the game reads the box. */
    private static String downloadTimed(ClientGameTestContext context, java.net.http.HttpClient http, String url, String token, Path to, long[] last, long[] maxGap) {
        var r = java.net.http.HttpRequest.newBuilder(java.net.URI.create(url)).timeout(java.time.Duration.ofSeconds(240))
                .header("Origin", SITE).header("X-Bauplaner-Token", token).GET().build();
        var f = http.sendAsync(r, java.net.http.HttpResponse.BodyHandlers.ofByteArray());
        context.waitFor(mc -> {
            long now = System.nanoTime();
            maxGap[0] = Math.max(maxGap[0], now - last[0]);
            last[0] = now;
            return f.isDone();
        }, 20 * 300);
        var res = f.join();
        if (res.statusCode() != 200) return "{\"status\":" + res.statusCode() + ",\"body\":" + new String(res.body(), java.nio.charset.StandardCharsets.UTF_8) + "}";
        try { Files.write(to, res.body()); } catch (IOException e) { throw new java.io.UncheckedIOException(e); }
        return "{\"status\":200,\"bytes\":" + res.body().length + "}";
    }
}
