package io.github.freadeax.bauplaner.bridge.gametest;

import com.mojang.blaze3d.platform.InputConstants;
import io.github.freadeax.bauplaner.bridge.hologram.CommandScreen;
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
 * (prepared and verified by scripts/mod/bridge_gametest.mjs).
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
                // Keep this recording: the Baustand requests later write more files into scans/.
                Files.copy(scans(root).getFirst(), io.resolve("scan.schem"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                context.takeScreenshot("bauplaner-aufnahme");

                try {
                    hologram(context, world, io, root, anchor);
                    liveLink(context, io, anchor);
                    guides(context, world, io, anchor);
                } catch (Throwable t) {
                    // Modpack runs can hang on shutdown before the failure is reported: log it right away.
                    t.printStackTrace();
                    Files.writeString(io.resolve("fehler.txt"), String.valueOf(t));
                    throw t;
                }

                String state = Files.readString(root.resolve("state.properties"));
                if (!state.contains(".anchor=" + anchor[0] + " " + anchor[1] + " " + anchor[2]))
                    throw new AssertionError("Anker nicht gespeichert oder falsch: " + state);
                Files.writeString(io.resolve("state.properties"), state);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * Mod 2.0: the plan as hologram on the same building. Progress must show exactly the wrong and the
     * missing block, follow a block placed afterwards, react to turning, and the placement must be
     * remembered. Chat lines are checked by scripts/mod/bridge_gametest.mjs verify (game.log).
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
        // Test phase (QA-04): the diagnosis report is written and readable.
        chat(context, "/bauplaner diagnose");
        context.setScreen(() -> null);
        copyDiagnose(root, io);
        placementHelper(context, world, io, anchor);
        Files.copy(root.resolve("platzierung.properties"), io.resolve("platzierung.properties"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    }

    /** Copies the newest report from bauplaner/diagnose/ to io/diagnose.txt for the verify step. */
    static void copyDiagnose(Path root, Path io) throws java.io.IOException {
        try (var files = Files.list(root.resolve("diagnose"))) {
            Path newest = files.filter(f -> f.getFileName().toString().endsWith(".txt")).max(java.util.Comparator.comparing(f -> f.getFileName().toString())).orElseThrow(() -> new AssertionError("kein Diagnosebericht in bauplaner/diagnose/"));
            Files.copy(newest, io.resolve("diagnose.txt"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
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

    /**
     * EDIT-04 build guides (Mod 0.18.0), next to the plan on flat ground: symmetry axis where the player looks,
     * mirrored and turned 4×, a few blocks placed through the real client path (door, stairs, chest, wall), then a
     * wall curve through three points. The ghosts are drawn for every image; the overview is the screenshot
     * bauhilfen.png (Modrinth gallery). Chat lines are checked in bridge_gametest.mjs.
     */
    private static void guides(ClientGameTestContext context, TestSingleplayerContext world, Path io, int[] anchor) throws IOException {
        var server = world.getServer();
        final int gx = anchor[0] + 40, gz = anchor[2];
        server.runCommand("tp @a " + (gx + 0.5) + " 200 " + (gz - 2.5) + " 0 60");
        world.getConnection().waitForChunksRender();
        final int gy = server.computeOnServer(s -> s.overworld().getHeight(Heightmap.Types.MOTION_BLOCKING, gx, gz));
        server.runCommand("fill " + (gx - 14) + " " + (gy - 2) + " " + (gz - 14) + " " + (gx + 14) + " " + (gy - 2) + " " + (gz + 14) + " minecraft:dirt");
        server.runCommand("fill " + (gx - 14) + " " + (gy - 1) + " " + (gz - 14) + " " + (gx + 14) + " " + (gy - 1) + " " + (gz + 14) + " minecraft:grass_block");
        server.runCommand("fill " + (gx - 14) + " " + gy + " " + (gz - 14) + " " + (gx + 14) + " " + (gy + 14) + " " + (gz + 14) + " minecraft:air");
        server.runCommand("gamemode creative @a");
        server.runCommand("clear @a");
        server.runCommand("item replace entity @a hotbar.0 with minecraft:stone_bricks 64");
        server.runCommand("item replace entity @a hotbar.1 with minecraft:oak_door 4");
        server.runCommand("item replace entity @a hotbar.2 with minecraft:oak_stairs 8");
        server.runCommand("item replace entity @a hotbar.3 with minecraft:chest 4");
        server.runCommand("item replace entity @a hotbar.4 with minecraft:mossy_cobblestone 64");
        server.runCommand("tp @a " + (gx + 0.5) + " " + gy + " " + (gz - 2.5) + " 0 30");
        world.getConnection().waitForChunksRender();
        context.getInput().lookAt(new BlockPos(gx, gy - 1, gz));
        context.waitTicks(5);
        chat(context, "/bauplaner symmetrie hier");
        chat(context, "/bauplaner symmetrie drehen 4");
        // Small corner east of the axis, placed like mouse clicks; the player stands within reach.
        server.runCommand("tp @a " + (gx + 4.5) + " " + gy + " " + (gz - 1.5) + " 0 40");
        context.waitTicks(5);
        int[][] wall = { { 3, 2 }, { 4, 2 }, { 5, 2 }, { 6, 2 }, { 6, 3 }, { 6, 4 } };
        for (int layer = 0; layer < 2; layer++)
            for (int[] c : wall) place(context, 0, new BlockPos(gx + c[0], gy - 1 + layer, gz + c[1]));
        place(context, 1, new BlockPos(gx + 4, gy - 1, gz + 4));
        place(context, 2, new BlockPos(gx + 3, gy - 1, gz + 4));
        place(context, 3, new BlockPos(gx + 5, gy - 1, gz + 5));
        context.waitTicks(10);
        chat(context, "/bauplaner symmetrie");
        // Wall curve with mossy cobblestone through three points north of the corner; the symmetry repeats it.
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(4));
        chat(context, "/bauplaner kurve profil mauer");
        chat(context, "/bauplaner kurve hoehe 2");
        server.runCommand("tp @a " + (gx + 4.5) + " " + gy + " " + (gz + 0.5) + " 0 40");
        context.waitTicks(5);
        for (int[] c : new int[][] { { 2, 8 }, { 5, 7 }, { 8, 4 } }) {
            context.getInput().lookAt(new BlockPos(gx + c[0], gy - 1, gz + c[1]));
            context.waitTicks(3);
            chat(context, "/bauplaner kurve punkt");
        }
        chat(context, "/bauplaner kurve");
        // Overview from above the south-west: ghosts of all eight images, curve, axis lines and the progress line.
        // Stand on an invisible barrier block high above the south-west corner for the overview.
        server.runCommand("setblock " + (gx - 7) + " " + (gy + 6) + " " + (gz - 7) + " minecraft:barrier");
        // Facing north-east and down onto the corner (yaw -41°, pitch 38°), set by the server so it holds after the teleport.
        server.runCommand("tp @a " + (gx - 6.5) + " " + (gy + 7) + " " + (gz - 6.5) + " -41 38");
        world.getConnection().waitForChunksRender();
        context.setScreen(() -> null);
        context.runOnClient(mc -> mc.gui.hud.getChat().clearMessages(false));
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(0));
        context.waitTicks(30);
        copy(context.takeScreenshot("bauplaner-bauhilfen-hud"), io.resolve("bauhilfen-hud.png"));
        // Gallery picture without the HUD of the plan and team tests: only the world with the ghosts.
        context.runOnClient(mc -> { if (!mc.gui.hud.isHidden()) mc.gui.hud.toggle(); });
        context.waitTicks(5);
        copy(context.takeScreenshot("bauplaner-bauhilfen"), io.resolve("bauhilfen.png"));
        context.runOnClient(mc -> { if (mc.gui.hud.isHidden()) mc.gui.hud.toggle(); });
        chat(context, "/bauplaner bauhilfe aus");
    }

    /** Right click with hotbar slot {@code slot} on top of {@code below}, through the real client path. */
    private static void place(ClientGameTestContext context, int slot, BlockPos below) {
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(slot));
        var top = new net.minecraft.world.phys.BlockHitResult(new net.minecraft.world.phys.Vec3(below.getX() + 0.5, below.getY() + 1.0, below.getZ() + 0.5),
                net.minecraft.core.Direction.UP, below, false);
        context.runOnClient(mc -> mc.gameMode.useItemOn(mc.player, net.minecraft.world.InteractionHand.MAIN_HAND, top));
        context.waitTicks(4);
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
     * answer goes to live.json and is checked by scripts/mod/bridge_gametest.mjs verify. The game thread
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
                + (anchor[0] - 4) + ",\"minZ\":" + (anchor[2] - 4) + ",\"width\":16,\"length\":12,\"y\":null,\"projectId\":null}"
                // Protocol 2 (GAME-08): a zone with layer and colour, a new point type on the same layer.
                + ",{\"kind\":\"zone\",\"id\":\"zone_test\",\"name\":\"Hofanlage\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"category\":\"wohnen\",\"layer\":\"Phase 2\",\"color\":\"#ff8800\",\"points\":[["
                + (anchor[0] - 10) + "," + (anchor[2] - 10) + "],[" + (anchor[0] + 2) + "," + (anchor[2] - 10) + "],[" + (anchor[0] + 2) + "," + (anchor[2] - 2) + "],[" + (anchor[0] - 4) + "," + (anchor[2] - 2) + "],[" + (anchor[0] - 10) + "," + (anchor[2] - 6) + "]]}"
                + ",{\"kind\":\"point\",\"id\":\"point_gefahr\",\"name\":\"Lava\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"type\":\"gefahr\",\"layer\":\"Phase 2\",\"x\":"
                + (anchor[0] - 8) + ",\"y\":" + anchor[1] + ",\"z\":" + (anchor[2] - 8) + "}]}";
        out.append(",\"marks\":").append(request(context, http, base + "/v1/marks", "POST", marks, token, "https://freadeax.github.io"));
        out.append(",\"players\":").append(request(context, http, base + "/v1/players", "GET", null, token, "https://freadeax.github.io"));
        chat(context, "/bauplaner ebenen");
        context.waitTicks(30);
        copy(context.takeScreenshot("bauplaner-markierungen"), io.resolve("markierungen.png"));
        byte[] plan = Files.readAllBytes(io.resolve("plan.schem"));
        String q = "name=website-plan.schem&dimension=minecraft%3Aoverworld&x=" + (anchor[0] + 20) + "&y=" + anchor[1] + "&z=" + anchor[2] + "&turns=0&mirror=false";
        out.append(",\"plan\":").append(requestBytes(context, http, base + "/v1/plan?" + q, plan, token));
        context.waitTicks(40);
        out.append(",\"section\":").append(request(context, http, base + "/v1/section", "POST", "{\"section\":2}", token, "https://freadeax.github.io"));
        out.append(",\"after\":").append(request(context, http, base + "/v1/status", "GET", null, token, "https://freadeax.github.io"));
        // GAME-07-S11 (0.19.0): a locked site of group „Markt“ over the whole plan – the hologram turns grey there and
        // the website limits it to the group; afterwards the original marks come back for the later steps.
        String grouped = "{\"dimension\":\"minecraft:overworld\",\"items\":[{\"kind\":\"site\",\"id\":\"site_markt\",\"name\":\"Marktplatz\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"minX\":"
                + (anchor[0] - 80) + ",\"minZ\":" + (anchor[2] - 100) + ",\"width\":200,\"length\":200,\"y\":null,\"projectId\":null,\"group\":\"Markt\",\"locked\":true}]}";
        out.append(",\"groupMarks\":").append(request(context, http, base + "/v1/marks", "POST", grouped, token, "https://freadeax.github.io"));
        out.append(",\"group\":").append(request(context, http, base + "/v1/group", "POST", "{\"group\":\"Markt\"}", token, "https://freadeax.github.io"));
        out.append(",\"groupUnknown\":").append(request(context, http, base + "/v1/group", "POST", "{\"group\":\"Gibt es nicht\"}", token, "https://freadeax.github.io"));
        context.waitTicks(25);
        chat(context, "/bauplaner gruppe");
        context.waitTicks(30);
        copy(context.takeScreenshot("bauplaner-gruppe"), io.resolve("gruppe.png"));
        out.append(",\"groupStatus\":").append(request(context, http, base + "/v1/status", "GET", null, token, "https://freadeax.github.io"));
        out.append(",\"groupAll\":").append(request(context, http, base + "/v1/group", "POST", "{\"group\":null}", token, "https://freadeax.github.io"));
        out.append(",\"marksBack\":").append(request(context, http, base + "/v1/marks", "POST", marks, token, "https://freadeax.github.io"));
        // COOP-03 Teambau: team view from the planner (written by bridge_gametest.mjs), take section 2 in the game,
        // only my sections in the hologram, the planner fetches the claim from the outbox and acknowledges it.
        out.append(",\"teamPost\":").append(request(context, http, base + "/v1/team", "POST", Files.readString(io.resolve("team.json")), token, "https://freadeax.github.io"));
        context.waitTicks(25);
        chat(context, "/bauplaner team abschnitte");
        chat(context, "/bauplaner team nehmen 2");
        context.waitTicks(25);
        chat(context, "/bauplaner team mein");
        context.waitTicks(30);
        copy(context.takeScreenshot("bauplaner-team"), io.resolve("team.png"));
        out.append(",\"team\":").append(request(context, http, base + "/v1/team", "GET", null, token, "https://freadeax.github.io"));
        out.append(",\"teamPull\":").append(request(context, http, base + "/v1/team/pull?teamId=x", "GET", null, token, "https://freadeax.github.io"));
        chat(context, "/bauplaner team alle");
        context.waitTicks(5);
        commandPage(context, io);
        // LINK-03: pairing by click – the planner asks, the game shows the question, the player clicks
        // „Planer zulassen“ in the J menu with the mouse and the planner gets its key once. No code, no command.
        String ask = request(context, http, base + "/v1/pair/ask", "POST", "{\"device\":\"Spieltest-Browser\"}", null, "https://freadeax.github.io");
        out.append(",\"ask\":").append(ask);
        var rq = java.util.regex.Pattern.compile("\"request\":\"([A-Za-z0-9_-]+)\"").matcher(ask);
        if (!rq.find()) throw new AssertionError("Keine Anfrage-ID: " + ask);
        String askUrl = base + "/v1/pair/ask?request=" + rq.group(1);
        context.waitTicks(10);
        copy(context.takeScreenshot("bauplaner-frage"), io.resolve("frage.png"));
        out.append(",\"askWaiting\":").append(request(context, http, askUrl, "GET", null, null, "https://freadeax.github.io"));
        context.getInput().pressKey(InputConstants.KEY_J);
        context.waitTicks(10);
        copy(context.takeScreenshot("bauplaner-frage-menue"), io.resolve("frage-menue.png"));
        click(context, "Planer zulassen");
        context.waitTicks(5);
        String granted = request(context, http, askUrl, "GET", null, null, "https://freadeax.github.io");
        out.append(",\"askGranted\":").append(granted);
        var tk = java.util.regex.Pattern.compile("\"token\":\"([A-Za-z0-9_-]+)\"").matcher(granted);
        if (!tk.find()) throw new AssertionError("Nach „Planer zulassen“ kein Schlüssel: " + granted);
        out.append(",\"askAgain\":").append(request(context, http, askUrl, "GET", null, null, "https://freadeax.github.io"));
        out.append(",\"server\":").append(request(context, http, base + "/v1/server", "GET", null, tk.group(1), "https://freadeax.github.io"));
        boolean promptLeft = context.computeOnClient(mc -> has(mc, "Planer zulassen"));
        out.append(",\"promptLeft\":").append(promptLeft);
        // LINK-07: team room without a server file – the planner hands the room to the mod, the mod goes live
        // with the room on its own and sends „Abschnitt nehmen“ there (room.json from scripts/mod/bridge_room_prepare.mjs).
        Path roomFile = io.resolve("room.json");
        if (Files.isRegularFile(roomFile)) {
            String roomJson = Files.readString(roomFile).replaceAll(",\"adminKey\":\"[^\"]*\"", "");
            out.append(",\"roomSet\":").append(request(context, http, base + "/v1/room", "POST", roomJson, tk.group(1), "https://freadeax.github.io"));
            String roomState = "";
            for (int i = 0; i < 60; i++) {
                context.waitTicks(10);
                roomState = request(context, http, base + "/v1/room", "GET", null, tk.group(1), "https://freadeax.github.io");
                if (roomState.contains("\"status\":\"live\"") && roomState.contains("\"sections\":2")) break;
            }
            out.append(",\"roomLive\":").append(roomState);
            context.setScreen(() -> null);
            context.waitTicks(2);
            chat(context, "/bauplaner team nehmen 2");
            context.waitTicks(40);
            out.append(",\"roomAfter\":").append(request(context, http, base + "/v1/room", "GET", null, tk.group(1), "https://freadeax.github.io"));
        }
        context.setScreen(() -> null);
        context.waitTicks(2);
        // MAP-05 Baustand: hologram back onto the built plan, then the whole box as recording (one wrong, one missing block).
        String back = "{\"dimension\":\"minecraft:overworld\",\"x\":" + anchor[0] + ",\"y\":" + anchor[1] + ",\"z\":" + anchor[2] + ",\"turns\":0,\"mirror\":false}";
        out.append(",\"back\":").append(request(context, http, base + "/v1/placement", "POST", back, token, "https://freadeax.github.io"));
        context.waitTicks(10);
        out.append(",\"scan\":").append(download(context, http, base + "/v1/scan", token, io.resolve("live-scan.schem")));
        if (Files.isRegularFile(roomFile)) {
            // LINK-07: the game records the placed plan itself and puts the file into the team room (no plugin).
            context.setScreen(() -> null);
            context.waitTicks(2);
            chat(context, "/bauplaner team aufnahme");
            context.waitTicks(100);
        }
        // Turned once on empty ground: the recording must still be in plan coordinates (everything missing).
        String turned = "{\"dimension\":\"minecraft:overworld\",\"x\":" + (anchor[0] + 20) + ",\"y\":" + anchor[1] + ",\"z\":" + (anchor[2] + 20) + ",\"turns\":1,\"mirror\":false}";
        out.append(",\"turned\":").append(request(context, http, base + "/v1/placement", "POST", turned, token, "https://freadeax.github.io"));
        context.waitTicks(10);
        out.append(",\"scanTurned\":").append(download(context, http, base + "/v1/scan", token, io.resolve("live-scan-gedreht.schem")));
        out.append("}");
        Files.writeString(io.resolve("live.json"), out.toString());
        chat(context, "/bauplaner verbinden status");
    }

    /**
     * GAME-10 command page: opened with /bauplaner befehle, real mouse clicks on its buttons. A client command
     * without input, one with input (section 2), and greyed-out server buttons in singleplayer (no plugin).
     */
    private static void commandPage(ClientGameTestContext context, Path io) throws IOException {
        // GAME-07 stage 6: packing list and scaffold hints for the placed plan (checked in bridge_gametest.mjs).
        chat(context, "/bauplaner packliste");
        chat(context, "/bauplaner geruest");
        chat(context, "/bauplaner markieren lager Testlager");
        chat(context, "/bauplaner markierungen loeschen 1");
        chat(context, "/bauplaner befehle");
        context.waitForScreen(CommandScreen.class);
        context.waitTicks(5);
        copy(context.takeScreenshot("bauplaner-befehle"), io.resolve("befehle.png"));
        click(context, "Team");
        click(context, "Übersicht");
        click(context, "Abschnitt zeigen …");
        context.runOnClient(mc -> {
            var box = mc.gui.screen().children().stream().filter(c -> c instanceof net.minecraft.client.gui.components.EditBox).map(c -> (net.minecraft.client.gui.components.EditBox) c)
                    .findFirst().orElseThrow(() -> new AssertionError("Eingabefeld fehlt"));
            box.setValue("2");
        });
        click(context, "Ausführen");
        context.waitTicks(5);
        copy(context.takeScreenshot("bauplaner-befehle-team"), io.resolve("befehle-team.png"));
        click(context, "Lager");
        boolean serverGrey = context.computeOnClient(mc -> button(mc, "Lagerkisten").active);
        click(context, "Verbindung");
        boolean linkActive = context.computeOnClient(mc -> button(mc, "Verbindungsstatus").active);
        List<String> replies = CommandScreen.REPLIES.last(40).stream().map(l -> l.text()).toList();
        String out = "{\"replies\":[" + String.join(",", replies.stream().map(r -> "\"" + r.replace("\\", "\\\\").replace("\"", "\\\"") + "\"").toList())
                + "],\"serverButtonActive\":" + serverGrey + ",\"clientButtonActive\":" + linkActive + "}";
        Files.writeString(io.resolve("befehle.json"), out);
        context.setScreen(() -> null);
        context.waitTicks(2);
    }

    private static net.minecraft.client.gui.components.Button button(net.minecraft.client.Minecraft mc, String label) {
        return mc.gui.screen().children().stream().filter(c -> c instanceof net.minecraft.client.gui.components.Button b && b.getMessage().getString().equals(label))
                .map(c -> (net.minecraft.client.gui.components.Button) c).findFirst().orElseThrow(() -> new AssertionError("Knopf fehlt: " + label + " – da sind: " + mc.gui.screen().children().stream()
                        .filter(c -> c instanceof net.minecraft.client.gui.components.Button).map(c -> ((net.minecraft.client.gui.components.Button) c).getMessage().getString()).toList()));
    }

    private static void click(ClientGameTestContext context, String label) {
        // Small windows page the buttons: turn pages like a player until the button shows up.
        for (int i = 0; i < 8 && !context.computeOnClient(mc -> has(mc, label)) && context.computeOnClient(mc -> has(mc, "▶")); i++) {
            pressAt(context, "▶");
        }
        pressAt(context, label);
    }

    private static boolean has(net.minecraft.client.Minecraft mc, String label) {
        return mc.gui.screen().children().stream().anyMatch(c -> c instanceof net.minecraft.client.gui.components.Button b && b.getMessage().getString().equals(label));
    }

    /**
     * Real mouse click in the middle of the button: cursor in window pixels, then the left button (26.3 uses SDL,
     * where the left button is 1, not 0 as with GLFW).
     */
    private static void pressAt(ClientGameTestContext context, String label) {
        double[] at = context.computeOnClient(mc -> {
            var b = button(mc, label);
            double scale = (double) mc.getWindow().getScreenWidth() / mc.getWindow().getGuiScaledWidth();
            return new double[] { (b.getX() + b.getWidth() / 2.0) * scale, (b.getY() + b.getHeight() / 2.0) * scale };
        });
        context.getInput().setCursorPos(at[0], at[1]);
        context.getInput().pressMouse(com.mojang.blaze3d.platform.InputConstants.MOUSE_BUTTON_LEFT);
        context.waitTicks(3);
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

    /** GET of a file: saved to {@code to}, answered as {"status":n,"file":name,"bytes":n} (or the error body). */
    private static String download(ClientGameTestContext context, java.net.http.HttpClient http, String url, String token, Path to) {
        var r = java.net.http.HttpRequest.newBuilder(java.net.URI.create(url)).timeout(java.time.Duration.ofSeconds(30))
                .header("Origin", "https://freadeax.github.io").header("X-Bauplaner-Token", token).GET().build();
        var f = http.sendAsync(r, java.net.http.HttpResponse.BodyHandlers.ofByteArray());
        context.waitFor(mc -> f.isDone(), 20 * 40);
        var res = f.join();
        if (res.statusCode() != 200) return "{\"status\":" + res.statusCode() + ",\"body\":" + new String(res.body(), java.nio.charset.StandardCharsets.UTF_8) + "}";
        try { Files.write(to, res.body()); } catch (IOException e) { throw new java.io.UncheckedIOException(e); }
        return "{\"status\":200,\"file\":\"" + res.headers().firstValue("X-Bauplaner-File").orElse("") + "\",\"expose\":\""
                + res.headers().firstValue("Access-Control-Expose-Headers").orElse("") + "\",\"bytes\":" + res.body().length + "}";
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
