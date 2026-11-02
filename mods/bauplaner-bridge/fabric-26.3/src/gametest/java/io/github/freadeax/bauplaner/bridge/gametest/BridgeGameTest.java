package io.github.freadeax.bauplaner.bridge.gametest;

import com.mojang.blaze3d.platform.InputConstants;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.levelgen.Heightmap;


/**
 * Plays the bridge like a player in a real Minecraft 26.3 client: plan file into the folder, chat
 * commands typed into the chat screen, anchor taken from the block under the crosshair, scan written
 * by the mod. Only the test itself places blocks (server setblock from setblocks.txt, offsets from the
 * origin) to build the plan with one wrong and one missing block. Input/output folder: env BAUPLANER_GAMETEST_DIR
 * (prepared and verified by scripts/bridge_gametest.mjs).
 */
public final class BridgeGameTest implements FabricClientGameTest {
    private static final String PLAN = "spieltest.schem";

    @Override
    public void runTest(ClientGameTestContext context) {
        Path io = Path.of(require(System.getenv("BAUPLANER_GAMETEST_DIR"), "BAUPLANER_GAMETEST_DIR fehlt"));
        Path root = FabricLoader.getInstance().getGameDir().resolve("bauplaner");
        try {
            Files.createDirectories(root.resolve("plans"));
            Files.copy(io.resolve("plan.schem"), root.resolve("plans").resolve(PLAN), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            deleteScans(root);
            Files.deleteIfExists(root.resolve("state.properties"));
            Files.deleteIfExists(root.resolve("platzierung.properties"));
            List<String> setblocks = Files.readAllLines(io.resolve("setblocks.txt")).stream().filter(l -> !l.isBlank()).toList();

            try (TestSingleplayerContext world = context.worldBuilder().create()) {
                world.getServer().runCommand("time set noon");
                // Project origin 0/0/0 on the ground at x=8, z=8; the plan is built from there.
                int ground = world.getServer().computeOnServer(s -> s.overworld().getHeight(Heightmap.Types.MOTION_BLOCKING, 8, 8));
                int[] anchor = { 8, ground, 8 };
                for (String line : setblocks) {
                    String[] p = line.split(" ", 4);
                    world.getServer().runCommand("setblock " + (anchor[0] + Integer.parseInt(p[0])) + " " + (anchor[1] + Integer.parseInt(p[1])) + " "
                            + (anchor[2] + Integer.parseInt(p[2])) + " " + p[3]);
                }
                Files.writeString(io.resolve("anchor.txt"), anchor[0] + " " + anchor[1] + " " + anchor[2] + "\n");
                // Stand south of the origin block and look at it: "/bauplaner anker hier" must pick it up.
                world.getServer().runCommand("tp @a " + (anchor[0] + 0.5) + " " + anchor[1] + " " + (anchor[2] - 2.5) + " 0 30");
                world.getConnection().waitForChunksRender();
                context.getInput().lookAt(new BlockPos(anchor[0], anchor[1], anchor[2]));
                context.waitTicks(5);

                chat(context, "/bauplaner plaene");
                chat(context, "/bauplaner plan " + PLAN);
                chat(context, "/bauplaner anker hier");
                chat(context, "/bauplaner status");
                chat(context, "/bauplaner scan");
                context.waitFor(mc -> hasScan(root), 20 * 60);
                context.takeScreenshot("bauplaner-aufnahme");

                try {
                    hologram(context, world, io, root, anchor);
                    liveLink(context, io, anchor);
                } catch (Throwable t) {
                    // Modpack runs can hang on shutdown before the failure is reported: log it right away.
                    t.printStackTrace();
                    Files.writeString(io.resolve("fehler.txt"), String.valueOf(t));
                    throw t;
                }

                String state = Files.readString(root.resolve("state.properties"));
                if (!state.contains(".anchor=" + anchor[0] + " " + anchor[1] + " " + anchor[2]))
                    throw new AssertionError("Anker nicht gespeichert oder falsch: " + state);
                Files.copy(scans(root).getFirst(), io.resolve("scan.schem"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                Files.writeString(io.resolve("state.properties"), state);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * Mod 2.0: the plan as hologram on the same building. Progress must show exactly the wrong and the
     * missing block, follow a block placed afterwards, react to turning, and the placement must be
     * remembered. Chat lines are checked by scripts/bridge_gametest.mjs verify (game.log).
     */
    private static void hologram(ClientGameTestContext context, TestSingleplayerContext world, Path io, Path root, int[] anchor) throws IOException {
        chat(context, "/bauplaner zeigen " + PLAN);
        context.waitTicks(40);
        chat(context, "/bauplaner fortschritt");
        chat(context, "/bauplaner fehler");
        // Overview from the north-west on the ground, for the screenshot with blue/red ghost blocks.
        world.getServer().runCommand("tp @a " + (anchor[0] - 5.5) + " " + anchor[1] + " " + (anchor[2] - 8.5) + " 0 0");
        world.getConnection().waitForChunksRender();
        context.setScreen(() -> null);
        context.runOnClient(mc -> mc.gui.hud.getChat().clearMessages(false));
        context.waitTicks(5);
        context.getInput().lookAt(new BlockPos(anchor[0] + 3, anchor[1] + 4, anchor[2] + 2));
        context.waitTicks(10);
        copy(context.takeScreenshot("bauplaner-hologramm"), io.resolve("hologramm.png"));
        // Key J opens the plan menu.
        context.getInput().pressKey(InputConstants.KEY_J);
        context.waitTicks(10);
        String screen = context.computeOnClient(mc -> mc.gui.screen() == null ? "keiner" : mc.gui.screen().getClass().getSimpleName());
        if (!screen.equals("PlanScreen")) throw new AssertionError("Taste J öffnet nicht das Planmenü, offen: " + screen);
        copy(context.takeScreenshot("bauplaner-menue"), io.resolve("menue.png"));
        context.setScreen(() -> null);
        // Build the missing block: the live check must notice it without any command.
        String json = Files.readString(io.resolve("state.json"));
        var m = java.util.regex.Pattern.compile("\"missing\":\\[(-?\\d+),(-?\\d+),(-?\\d+)\\],\"missingState\":\"([^\"]+)\"").matcher(json);
        if (!m.find()) throw new AssertionError("state.json ohne missing/missingState");
        world.getServer().runCommand("setblock " + (anchor[0] + Integer.parseInt(m.group(1))) + " " + (anchor[1] + Integer.parseInt(m.group(2))) + " "
                + (anchor[2] + Integer.parseInt(m.group(3))) + " " + m.group(4));
        context.waitTicks(40);
        chat(context, "/bauplaner fortschritt");
        chat(context, "/bauplaner drehen");
        context.waitTicks(40);
        chat(context, "/bauplaner fortschritt");
        chat(context, "/bauplaner drehen -1");
        context.waitTicks(40);
        chat(context, "/bauplaner fortschritt");
        // Stage 2: material list, layer mode, textured ghost blocks.
        chat(context, "/bauplaner material");
        chat(context, "/bauplaner ebene " + anchor[1]);
        chat(context, "/bauplaner fehler");
        chat(context, "/bauplaner ebene " + (anchor[1] + 1));
        chat(context, "/bauplaner fehler");
        chat(context, "/bauplaner ebene alle");
        // Tear down part of the wall: those blocks must come back as see-through textured ghosts.
        world.getServer().runCommand("fill " + (anchor[0] + 4) + " " + (anchor[1] + 1) + " " + anchor[2] + " " + (anchor[0] + 8) + " " + (anchor[1] + 3) + " "
                + (anchor[2] + 3) + " minecraft:air");
        context.waitTicks(40);
        chat(context, "/bauplaner material");
        context.setScreen(() -> null);
        context.runOnClient(mc -> mc.gui.hud.getChat().clearMessages(false));
        world.getServer().runCommand("tp @a " + (anchor[0] + 6.5) + " " + anchor[1] + " " + (anchor[2] - 5.5) + " 0 0");
        world.getConnection().waitForChunksRender();
        context.waitTicks(5);
        context.getInput().lookAt(new BlockPos(anchor[0] + 6, anchor[1] + 1, anchor[2] + 2));
        context.waitTicks(10);
        copy(context.takeScreenshot("bauplaner-geister"), io.resolve("geister.png"));
        context.getInput().pressKey(InputConstants.KEY_NUMPAD7);
        context.waitTicks(10);
        String materialScreen = context.computeOnClient(mc -> mc.gui.screen() == null ? "keiner" : mc.gui.screen().getClass().getSimpleName());
        if (!materialScreen.equals("MaterialScreen")) throw new AssertionError("Num 7 öffnet nicht die Materialliste, offen: " + materialScreen);
        copy(context.takeScreenshot("bauplaner-material"), io.resolve("material.png"));
        context.setScreen(() -> null);
        // Stage 5: build sections from the plan file (Turm, Mauer) and X-ray through the walls.
        chat(context, "/bauplaner abschnitt 2");
        chat(context, "/bauplaner abschnitt");
        chat(context, "/bauplaner roentgen");
        context.setScreen(() -> null);
        context.runOnClient(mc -> mc.gui.hud.getChat().clearMessages(false));
        world.getServer().runCommand("tp @a " + (anchor[0] - 6.5) + " " + anchor[1] + " " + (anchor[2] - 6.5) + " -45 10");
        world.getConnection().waitForChunksRender();
        context.waitTicks(10);
        copy(context.takeScreenshot("bauplaner-roentgen"), io.resolve("roentgen.png"));
        chat(context, "/bauplaner roentgen");
        chat(context, "/bauplaner abschnitt alle");
        context.setScreen(() -> null);
        placementHelper(context, world, io, anchor);
        Files.copy(root.resolve("platzierung.properties"), io.resolve("platzierung.properties"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    }

    /**
     * Stage 3, placement helper: right clicks go through the real client path (MultiPlayerGameMode.useItemOn,
     * the same call a mouse click makes), the server decides as always. Wrong block → not placed, right block
     * taken from the hotbar; log on its side → not placed, hint names the working way; right click → placed;
     * correct plan block → not broken while the helper is on, broken after "warnen".
     */
    private static void placementHelper(ClientGameTestContext context, TestSingleplayerContext world, Path io, int[] anchor) throws IOException {
        var server = world.getServer();
        BlockPos target = new BlockPos(anchor[0] + 3, anchor[1] + 4, anchor[2]);
        BlockPos below = target.below(), side = target.north();
        server.runCommand("setblock " + target.getX() + " " + target.getY() + " " + target.getZ() + " minecraft:air");
        server.runCommand("setblock " + side.getX() + " " + side.getY() + " " + side.getZ() + " minecraft:stone");
        server.runCommand("tp @a " + (target.getX() + 0.5) + " " + anchor[1] + " " + (target.getZ() - 2.5) + " 0 -30");
        server.runCommand("gamemode creative @a");
        server.runCommand("clear @a");
        server.runCommand("item replace entity @a hotbar.0 with minecraft:stone 16");
        server.runCommand("item replace entity @a hotbar.1 with minecraft:oak_log 16");
        chat(context, "/bauplaner platzierhilfe an");
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(0));
        context.waitTicks(40);
        var top = new net.minecraft.world.phys.BlockHitResult(new net.minecraft.world.phys.Vec3(below.getX() + 0.5, below.getY() + 1.0, below.getZ() + 0.5),
                net.minecraft.core.Direction.UP, below, false);
        var onSide = new net.minecraft.world.phys.BlockHitResult(new net.minecraft.world.phys.Vec3(side.getX() + 0.5, side.getY() + 0.5, side.getZ() + 1.0),
                net.minecraft.core.Direction.SOUTH, side, false);
        // 1. Stone in hand where an oak log belongs: not placed, the log from hotbar slot 2 is taken instead.
        String r1 = context.computeOnClient(mc -> mc.gameMode.useItemOn(mc.player, net.minecraft.world.InteractionHand.MAIN_HAND, top).getClass().getSimpleName());
        context.waitTicks(10);
        int slot = context.computeOnClient(mc -> mc.player.getInventory().getSelectedSlot());
        expectBlock(context, target, "minecraft:air", "falscher Block wurde gesetzt (" + r1 + ")");
        if (slot != 1) throw new AssertionError("Platzierhilfe hat den Eichenstamm nicht in die Hand genommen, Platz " + slot);
        // 2. Log clicked on the side of a block: would lie sideways (axis z) → not placed.
        String r2 = context.computeOnClient(mc -> mc.gameMode.useItemOn(mc.player, net.minecraft.world.InteractionHand.MAIN_HAND, onSide).getClass().getSimpleName());
        context.waitTicks(10);
        expectBlock(context, target, "minecraft:air", "liegender Stamm wurde gesetzt (" + r2 + ")");
        // Crosshair line while aiming at the open position with the log in hand.
        context.getInput().lookAt(target);
        context.waitTicks(10);
        copy(context.takeScreenshot("bauplaner-platzierhilfe"), io.resolve("platzierhilfe.png"));
        // 3. The way the hint names (top of the block below): placed upright.
        context.runOnClient(mc -> mc.gameMode.useItemOn(mc.player, net.minecraft.world.InteractionHand.MAIN_HAND, top));
        context.waitTicks(10);
        expectBlock(context, target, "minecraft:oak_log[axis=y]", "richtiger Stamm wurde nicht gesetzt");
        // 4. Correct plan block is protected against breaking; after "warnen" it can be broken.
        context.runOnClient(mc -> mc.gameMode.startDestroyBlock(target, net.minecraft.core.Direction.UP));
        context.waitTicks(10);
        expectBlock(context, target, "minecraft:oak_log[axis=y]", "geschützter Planblock wurde abgebaut");
        chat(context, "/bauplaner platzierhilfe warnen");
        context.runOnClient(mc -> mc.gameMode.startDestroyBlock(target, net.minecraft.core.Direction.UP));
        context.waitTicks(10);
        expectBlock(context, target, "minecraft:air", "mit „nur warnen“ lässt sich der Block nicht abbauen");
        chat(context, "/bauplaner platzierhilfe an");
        server.runCommand("setblock " + target.getX() + " " + target.getY() + " " + target.getZ() + " minecraft:oak_log[axis=y]");
        server.runCommand("setblock " + side.getX() + " " + side.getY() + " " + side.getZ() + " minecraft:air");
        Files.writeString(io.resolve("platzierhilfe.txt"), r1 + " " + r2 + "\n");
    }

    private static void expectBlock(ClientGameTestContext context, BlockPos pos, String expected, String message) {
        String actual = context.computeOnClient(mc -> net.minecraft.commands.arguments.blocks.BlockStateParser.serialize(mc.level.getBlockState(pos)));
        if (!actual.equals(expected)) throw new AssertionError(message + ": " + actual + " bei " + pos.toShortString());
    }

    private static void copy(Path from, Path to) throws IOException {
        Files.copy(from, to, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    }

    private static void chat(ClientGameTestContext context, String line) {
        context.setScreen(() -> new ChatScreen("", false));
        context.getInput().typeChars(line);
        context.getInput().pressKey(InputConstants.KEY_RETURN);
        context.waitTicks(3);
    }

    private static boolean hasScan(Path root) {
        try { return !scans(root).isEmpty(); } catch (IOException e) { return false; }
    }

    private static List<Path> scans(Path root) throws IOException {
        Path dir = root.resolve("scans");
        if (!Files.isDirectory(dir)) return List.of();
        try (var files = Files.list(dir)) { return files.filter(p -> p.toString().endsWith(".schem")).toList(); }
    }

    private static void deleteScans(Path root) throws IOException {
        for (Path p : scans(root)) Files.delete(p);
    }

    // ------------------------------------------------------------------ MAP-03 website link

    /**
     * Website link over 127.0.0.1 like the website does it: pairing with the code from the chat, status
     * with player and hologram, live terrain of a chunk, Weltplan marks and a plan sent directly. Every
     * answer goes to live.json and is checked by scripts/bridge_gametest.mjs verify. The game thread
     * only runs while the test waits, so requests run on their own thread and the test waits in ticks.
     */
    private static void liveLink(ClientGameTestContext context, Path io, int[] anchor) throws IOException {
        // Philipp's first try (0.5.0): only the port command. Since 0.5.1 it starts the service and shows a code.
        chat(context, "/bauplaner verbinden port 47615");
        String code = pairingCode();
        if (code == null) throw new AssertionError("„/bauplaner verbinden port“ hat die Verbindung nicht gestartet");
        var http = java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build();
        String base = "http://127.0.0.1:47615";
        StringBuilder out = new StringBuilder("{");
        String hello = request(context, http, base + "/v1/hello", "GET", null, null, "https://freadeax.github.io");
        out.append("\"hello\":").append(hello);
        String foreign = request(context, http, base + "/v1/hello", "GET", null, null, "https://example.com");
        out.append(",\"foreign\":").append(foreign);
        String unpaired = request(context, http, base + "/v1/status", "GET", null, null, "https://freadeax.github.io");
        out.append(",\"unpaired\":").append(unpaired);
        String pair = request(context, http, base + "/v1/pair", "POST", "{\"code\":\"" + code + "\"}", null, "https://freadeax.github.io");
        out.append(",\"pair\":").append(pair);
        var m = java.util.regex.Pattern.compile("\"token\":\"([A-Za-z0-9_-]+)\"").matcher(pair);
        if (!m.find()) throw new AssertionError("Kopplung ohne Schlüssel: " + pair);
        String token = m.group(1);
        out.append(",\"status\":").append(request(context, http, base + "/v1/status", "GET", null, token, "https://freadeax.github.io"));
        int cx = Math.floorDiv(anchor[0], 16), cz = Math.floorDiv(anchor[2], 16);
        out.append(",\"chunks\":").append(request(context, http, base + "/v1/chunks?c=" + cx + "," + cz + ";4000,4000", "GET", null, token, "https://freadeax.github.io"));
        String marks = "{\"dimension\":\"minecraft:overworld\",\"items\":[{\"kind\":\"point\",\"id\":\"point_test\",\"name\":\"Brunnen\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"type\":\"ziel\",\"x\":"
                + (anchor[0] + 12) + ",\"y\":" + anchor[1] + ",\"z\":" + (anchor[2] + 3) + "},{\"kind\":\"site\",\"id\":\"site_test\",\"name\":\"Platz\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"minX\":"
                + (anchor[0] - 4) + ",\"minZ\":" + (anchor[2] - 4) + ",\"width\":16,\"length\":12,\"y\":null,\"projectId\":null}]}";
        out.append(",\"marks\":").append(request(context, http, base + "/v1/marks", "POST", marks, token, "https://freadeax.github.io"));
        context.waitTicks(30);
        copy(context.takeScreenshot("bauplaner-markierungen"), io.resolve("markierungen.png"));
        byte[] plan = Files.readAllBytes(io.resolve("plan.schem"));
        String q = "name=website-plan.schem&dimension=minecraft%3Aoverworld&x=" + (anchor[0] + 20) + "&y=" + anchor[1] + "&z=" + anchor[2] + "&turns=0&mirror=false";
        out.append(",\"plan\":").append(requestBytes(context, http, base + "/v1/plan?" + q, plan, token));
        context.waitTicks(40);
        out.append(",\"section\":").append(request(context, http, base + "/v1/section", "POST", "{\"section\":2}", token, "https://freadeax.github.io"));
        out.append(",\"after\":").append(request(context, http, base + "/v1/status", "GET", null, token, "https://freadeax.github.io"));
        out.append("}");
        Files.writeString(io.resolve("live.json"), out.toString());
        chat(context, "/bauplaner verbinden status");
    }

    /** Pairing code the mod just showed in the chat (read from the running link, like the player reads it). */
    private static String pairingCode() {
        try {
            Object client = FabricLoader.getInstance().getEntrypointContainers("client", net.fabricmc.api.ClientModInitializer.class).stream()
                    .map(c -> c.getEntrypoint()).filter(e -> e.getClass().getName().endsWith(".BridgeClient")).findFirst().orElseThrow();
            Object link = field(field(client, "client"), "link"), server = field(link, "server");
            return (String) field(server, "pairingCode");
        } catch (ReflectiveOperationException e) {
            throw new AssertionError("Kopplungscode nicht lesbar", e);
        }
    }

    private static Object field(Object o, String name) throws ReflectiveOperationException {
        var f = o.getClass().getDeclaredField(name);
        f.setAccessible(true);
        return f.get(o);
    }

    /** One request as {"status":n,"body":...}; runs beside the game so the mod can answer on the game thread. */
    private static String request(ClientGameTestContext context, java.net.http.HttpClient http, String url, String method, String body, String token, String origin) {
        var b = java.net.http.HttpRequest.newBuilder(java.net.URI.create(url)).timeout(java.time.Duration.ofSeconds(10)).header("Origin", origin);
        if (token != null) b.header("X-Bauplaner-Token", token);
        b.method(method, body == null ? java.net.http.HttpRequest.BodyPublishers.noBody() : java.net.http.HttpRequest.BodyPublishers.ofString(body));
        if (body != null) b.header("Content-Type", "application/json");
        return send(context, http, b.build());
    }

    private static String requestBytes(ClientGameTestContext context, java.net.http.HttpClient http, String url, byte[] body, String token) {
        return send(context, http, java.net.http.HttpRequest.newBuilder(java.net.URI.create(url)).timeout(java.time.Duration.ofSeconds(20))
                .header("Origin", "https://freadeax.github.io").header("X-Bauplaner-Token", token).header("Content-Type", "application/octet-stream")
                .POST(java.net.http.HttpRequest.BodyPublishers.ofByteArray(body)).build());
    }

    private static String send(ClientGameTestContext context, java.net.http.HttpClient http, java.net.http.HttpRequest r) {
        var f = http.sendAsync(r, java.net.http.HttpResponse.BodyHandlers.ofString());
        context.waitFor(mc -> f.isDone(), 20 * 30);
        var res = f.join();
        String text = res.body().isBlank() ? "null" : res.body();
        return "{\"status\":" + res.statusCode() + ",\"body\":" + text + "}";
    }

    private static <T> T require(T value, String message) {
        if (value == null) throw new IllegalStateException(message);
        return value;
    }
}
