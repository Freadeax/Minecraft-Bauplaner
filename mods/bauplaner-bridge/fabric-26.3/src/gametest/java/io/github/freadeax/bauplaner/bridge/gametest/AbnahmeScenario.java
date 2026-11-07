package io.github.freadeax.bauplaner.bridge.gametest;

import static io.github.freadeax.bauplaner.bridge.gametest.BridgeGameTest.chat;
import static io.github.freadeax.bauplaner.bridge.gametest.BridgeGameTest.copy;

import com.google.gson.Gson;
import com.mojang.blaze3d.platform.InputConstants;
import io.github.freadeax.bauplaner.bridge.hologram.Hologram;
import io.github.freadeax.bauplaner.bridge.hologram.HologramClient;
import io.github.freadeax.bauplaner.bridge.hologram.HologramKeys;
import io.github.freadeax.bauplaner.bridge.hologram.McCompat;
import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.Materials;
import io.github.freadeax.bauplaner.mod.Placement;
import io.github.freadeax.bauplaner.mod.PlacementAdvice;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;
import net.fabricmc.fabric.api.client.gametest.v1.world.TestWorldSave;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;

/**
 * Block C of the test phase (07.11.2026): the mod cases a player checks by hand – MOD-02/04/06/07/09/17/21/29,
 * LIVE-06 and LINK-09 – played in the same real Minecraft 26.3 client as {@link BridgeGameTest}, with real key
 * presses, real clicks through the client path and the game's own chat. Every observation goes to
 * abnahme-c.json (and the offline part to offline.json); scripts/mod/bridge_gametest.mjs verify judges them, so
 * a failure names the case. Runs after the browser part on the plan built by the main test (plan origin =
 * anchor, sections 1 „Turm“ x 0..3 and 2 „Mauer“ x 4..8); afterwards the world is left and entered again.
 */
final class AbnahmeScenario {
    private static final Gson GSON = new Gson();
    private static final Map<String, Object> FACTS = new LinkedHashMap<>();
    private static final Map<String, Object> OFFLINE = new LinkedHashMap<>();
    private static final String DIM = "minecraft:overworld";
    private static final org.slf4j.Logger MARKS = org.slf4j.LoggerFactory.getLogger("abnahme");

    private AbnahmeScenario() {}

    /** The mod's shared client (hologram, link, team) behind the Fabric entry point. */
    static HologramClient client() {
        try {
            Object bc = FabricLoader.getInstance().getEntrypointContainers("client", net.fabricmc.api.ClientModInitializer.class).stream()
                    .map(c -> c.getEntrypoint()).filter(e -> e.getClass().getName().endsWith(".BridgeClient")).findFirst().orElseThrow();
            return (HologramClient) BridgeGameTest.field(bc, "client");
        } catch (ReflectiveOperationException e) {
            throw new AssertionError("Mod-Client nicht lesbar", e);
        }
    }

    private static Hologram holo() { return client().hologram(); }

    private static Map<String, Object> placement(ClientGameTestContext context) {
        return context.computeOnClient(mc -> {
            Placement p = holo().check().placement();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("x", p.x()); m.put("y", p.y()); m.put("z", p.z()); m.put("turns", p.turns()); m.put("mirror", p.mirror());
            return m;
        });
    }

    private static void key(ClientGameTestContext context, int code) {
        context.setScreen(() -> null);
        context.getInput().pressKey(code);
        context.waitTicks(6);
    }

    private static String screen(ClientGameTestContext context) {
        return context.computeOnClient(mc -> mc.gui.screen() == null ? "keiner" : mc.gui.screen().getClass().getSimpleName());
    }

    private static String state(ClientGameTestContext context, BlockPos pos) {
        return context.computeOnClient(mc -> net.minecraft.commands.arguments.blocks.BlockStateParser.serialize(mc.level.getBlockState(pos)));
    }

    private static String verdict(ClientGameTestContext context, BlockPos pos) {
        return context.computeOnClient(mc -> {
            var c = holo().check();
            int i = c.indexAt(pos.getX(), pos.getY(), pos.getZ());
            return i < 0 ? "kein Planblock" : c.verdict(i).name();
        });
    }

    private static String expected(ClientGameTestContext context, BlockPos pos) {
        return context.computeOnClient(mc -> {
            var c = holo().check();
            int i = c.indexAt(pos.getX(), pos.getY(), pos.getZ());
            return i < 0 ? null : c.expected(i).toString();
        });
    }

    /** Right click on a face of {@code on} through the real client path (same call a mouse click makes). */
    private static String use(ClientGameTestContext context, BlockPos on, Direction face) {
        Vec3 hit = Vec3.atCenterOf(on).add(face.getStepX() * 0.5, face.getStepY() * 0.5, face.getStepZ() * 0.5);
        var r = new BlockHitResult(hit, face, on, false);
        String result = context.computeOnClient(mc -> mc.gameMode.useItemOn(mc.player, InteractionHand.MAIN_HAND, r).getClass().getSimpleName());
        context.waitTicks(6);
        return result;
    }

    private static void standAt(ClientGameTestContext context, TestSingleplayerContext world, double x, double y, double z, float yaw, float pitch) {
        world.getServer().runCommand("tp @a " + x + " " + y + " " + z + " " + yaw + " " + pitch);
        world.getConnection().waitForChunksRender();
        context.waitTicks(5);
    }

    /** Marks the game log so verify can read exactly what one step said (a chat line of its own). */
    private static void mark(ClientGameTestContext context, String step) {
        context.waitTicks(2);
        context.runOnClient(mc -> MARKS.info("[Abnahme] {}", step));
    }

    // ------------------------------------------------------------------ singleplayer cases

    static void run(ClientGameTestContext context, TestSingleplayerContext world, Path io, Path root, int[] anchor, String token) throws IOException {
        var server = world.getServer();
        int ax = anchor[0], ay = anchor[1], az = anchor[2];
        // Clean start: plan at its origin, unturned, all sections and layers, helper on, textured, all groups.
        standAt(context, world, ax + 0.5, ay, az - 2.5, 0, 30);
        // The browser part sent its own project: back to the test plan with its two sections.
        chat(context, "/bauplaner zeigen spieltest.schem");
        context.waitFor(mc -> holo().active() && "spieltest.schem".equals(holo().planFile()) && !holo().loading(), 20 * 30);
        context.runOnClient(mc -> {
            var h = holo();
            h.setPlacement(new Placement(DIM, ax, ay, az, 0, false));
            h.setLayers(Hologram.Layers.ALL, ay);
            h.setSection(0);
            h.setGuard(PlacementAdvice.Guard.ON);
            if (!h.textured()) h.toggleTextured();
            if (h.xray()) h.toggleXray();
            if (!h.visible()) h.toggleVisible();
        });
        chat(context, "/bauplaner gruppe alle");
        server.runCommand("gamemode creative @a");
        server.runCommand("clear @a");
        context.waitTicks(40);

        names(context);
        keysMove(context, world, ax, ay, az);
        orientationAndFinder(context, world, io, ax, ay, az);
        materials(context, world, io, ax, ay, az);
        layerKeys(context, io, ay);
        helper(context, world, io, ax, ay, az);
        scaffold(context, world, ax, ay, az);
        sectionDone(context, world, ax, ay, az);
        groups(context, world, io, ax, ay, az, token);
        keyBinding(context, io, root);
        Files.writeString(io.resolve("abnahme-c.json"), GSON.toJson(FACTS));
    }

    /** MOD-29: name in the controls, the menu, the launcher's mod list. */
    private static void names(ClientGameTestContext context) {
        FACTS.put("category", context.computeOnClient(mc -> net.minecraft.locale.Language.getInstance().getOrDefault("key.category.bauplaner_bridge.bauplaner")));
        FACTS.put("modName", FabricLoader.getInstance().getModContainer("bauplaner_bridge").map(c -> c.getMetadata().getName()).orElse(""));
        FACTS.put("keyCount", context.computeOnClient(mc -> client().keys().size()));
        FACTS.put("keysInCategory", context.computeOnClient(mc -> client().keys().stream().filter(k -> k.getCategory() == HologramKeys.CATEGORY).count()));
        chat(context, "/bauplaner menue");
        context.waitTicks(8);
        FACTS.put("menuTitle", context.computeOnClient(mc -> mc.gui.screen() == null ? "" : mc.gui.screen().getTitle().getString()));
        context.setScreen(() -> null);
    }

    /** MOD-02: arrow keys, Page up/down, End, Insert, Home – every key with its effect on the placement. */
    private static void keysMove(ClientGameTestContext context, TestSingleplayerContext world, int ax, int ay, int az) {
        Map<String, Object> m = new LinkedHashMap<>();
        Direction facing = context.computeOnClient(mc -> mc.player.getDirection());
        m.put("facing", List.of(facing.getStepX(), facing.getStepZ()));
        Direction side = facing.getClockWise();
        m.put("side", List.of(side.getStepX(), side.getStepZ()));
        m.put("start", placement(context));
        int[][] keys = { { InputConstants.KEY_UP }, { InputConstants.KEY_DOWN }, { InputConstants.KEY_RIGHT }, { InputConstants.KEY_LEFT },
            { InputConstants.KEY_PAGEUP }, { InputConstants.KEY_PAGEDOWN }, { InputConstants.KEY_END }, { InputConstants.KEY_INSERT }, { InputConstants.KEY_INSERT } };
        String[] names = { "up", "down", "right", "left", "pageUp", "pageDown", "end", "insert", "insert2" };
        for (int i = 0; i < keys.length; i++) { key(context, keys[i][0]); m.put(names[i], placement(context)); }
        for (int i = 0; i < 3; i++) key(context, InputConstants.KEY_END);
        m.put("end4", placement(context));
        // Home (Pos1): the plan jumps to the block under the crosshair.
        BlockPos look = new BlockPos(ax + 12, ay - 1, az + 6);
        context.getInput().lookAt(look);
        context.waitTicks(4);
        m.put("lookedAt", context.computeOnClient(mc -> { BlockPos p = McCompat.targetBlock(mc); return List.of(p.getX(), p.getY(), p.getZ()); }));
        key(context, InputConstants.KEY_HOME);
        m.put("home", placement(context));
        FACTS.put("keys", m);
        context.runOnClient(mc -> holo().setPlacement(new Placement(DIM, ax, ay, az, 0, false)));
        context.getInput().lookAt(new BlockPos(ax, ay, az));
        context.waitTicks(30);
    }

    /** MOD-04: a log lying the wrong way is "STATE" (yellow), the dot key marks the nearest error. */
    private static void orientationAndFinder(ClientGameTestContext context, TestSingleplayerContext world, Path io, int ax, int ay, int az) throws IOException {
        BlockPos log = new BlockPos(ax, ay + 1, az + 3);
        FACTS.put("logPlanned", expected(context, log));
        world.getServer().runCommand("setblock " + log.getX() + " " + log.getY() + " " + log.getZ() + " minecraft:oak_log[axis=x]");
        context.waitTicks(40);
        FACTS.put("logVerdict", verdict(context, log));
        FACTS.put("counts", context.computeOnClient(mc -> {
            var c = holo().check();
            Map<String, Integer> out = new LinkedHashMap<>();
            for (Verdict v : Verdict.values()) out.put(v.name(), c.count(v));
            return out;
        }));
        standAt(context, world, ax + 1.5, ay, az - 3.5, 0, 20);
        context.runOnClient(mc -> holo().clearTarget());
        key(context, InputConstants.KEY_PERIOD);
        FACTS.put("finder", context.computeOnClient(mc -> {
            var c = holo().check();
            int t = holo().target();
            if (t < 0) return Map.of("target", -1);
            return Map.of("target", t, "verdict", c.verdict(t).name(), "pos", List.of(c.worldX(t) - ax, c.worldY(t) - ay, c.worldZ(t) - az));
        }));
        context.waitTicks(4);
        copy(context.takeScreenshot("bauplaner-abnahme-fehler"), io.resolve("abnahme-fehler.png"));
        world.getServer().runCommand("setblock " + log.getX() + " " + log.getY() + " " + log.getZ() + " minecraft:oak_log[axis=y]");
        context.waitTicks(20);
    }

    /** MOD-04/MOD-17: material list and packing list count what is carried, shulker boxes included. */
    private static void materials(ClientGameTestContext context, TestSingleplayerContext world, Path io, int ax, int ay, int az) throws IOException {
        var server = world.getServer();
        server.runCommand("clear @a");
        context.waitTicks(5);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("openStoneBricks", context.computeOnClient(mc -> Materials.of(holo().check(), holo().filter()).stream()
                .filter(l -> l.id().equals("minecraft:stone_bricks")).mapToInt(l -> l.open()).sum()));
        mark(context, "packliste-leer");
        chat(context, "/bauplaner packliste");
        // 3 loose blocks plus a shulker box with 64 stone bricks in the hotbar: the lists must count 67.
        server.runCommand("item replace entity @a hotbar.0 with minecraft:stone_bricks 3");
        server.runCommand("item replace entity @a hotbar.5 with minecraft:shulker_box[minecraft:container=[{slot:0,item:{id:\"minecraft:stone_bricks\",count:64}}]] 1");
        context.waitTicks(10);
        m.put("carried", context.computeOnClient(mc -> McCompat.carried(mc.player).entrySet().stream()
                .filter(e -> e.getKey() == net.minecraft.world.item.Items.STONE_BRICKS).mapToInt(Map.Entry::getValue).sum()));
        mark(context, "packliste-shulker");
        chat(context, "/bauplaner packliste");
        context.setScreen(() -> null);
        key(context, InputConstants.KEY_NUMPAD7);
        context.waitTicks(25);
        m.put("screen", screen(context));
        copy(context.takeScreenshot("bauplaner-abnahme-material"), io.resolve("abnahme-material.png"));
        context.setScreen(() -> null);
        FACTS.put("materials", m);
        server.runCommand("clear @a");
    }

    /** MOD-06 keys: Num 6 layer mode, Num 9 / Num * layer up and down, Num / next section, Num - X-ray, textures off. */
    private static void layerKeys(ClientGameTestContext context, Path io, int ay) throws IOException {
        Map<String, Object> m = new LinkedHashMap<>();
        java.util.function.Supplier<String> layer = () -> context.computeOnClient(mc -> holo().layers().name() + " " + holo().layerY());
        context.runOnClient(mc -> holo().setLayers(Hologram.Layers.ALL, ay + 1));
        m.put("start", layer.get());
        key(context, InputConstants.KEY_NUMPAD6); m.put("num6", layer.get());
        key(context, InputConstants.KEY_NUMPAD9); m.put("num9", layer.get());
        key(context, InputConstants.KEY_MULTIPLY); m.put("numMul", layer.get());
        m.put("finderLayer", context.computeOnClient(mc -> { var f = holo().finderFilter(); return List.of(f.minY(), f.maxY()); }));
        key(context, InputConstants.KEY_NUMPAD6); m.put("num6b", layer.get());
        key(context, InputConstants.KEY_NUMPAD6); m.put("num6c", layer.get());
        java.util.function.Supplier<Integer> section = () -> context.computeOnClient(mc -> holo().section());
        m.put("section0", section.get());
        key(context, 84); m.put("numSlash1", section.get());
        m.put("sectionOpen", context.computeOnClient(mc -> holo().open(holo().section())));
        key(context, 84); m.put("numSlash2", section.get());
        key(context, 84); m.put("numSlash3", section.get());
        java.util.function.Supplier<Boolean> xray = () -> context.computeOnClient(mc -> holo().xray());
        key(context, 86); m.put("xrayOn", xray.get());
        key(context, 86); m.put("xrayOff", xray.get());
        chat(context, "/bauplaner texturen");
        m.put("texturedAfter", context.computeOnClient(mc -> holo().textured()));
        context.setScreen(() -> null);
        context.runOnClient(mc -> mc.gui.hud.getChat().clearMessages(false));
        context.waitTicks(10);
        copy(context.takeScreenshot("bauplaner-abnahme-kaesten"), io.resolve("abnahme-kaesten.png"));
        chat(context, "/bauplaner texturen");
        m.put("texturedBack", context.computeOnClient(mc -> holo().textured()));
        context.runOnClient(mc -> { holo().setSection(0); holo().setLayers(Hologram.Layers.ALL, ay); });
        FACTS.put("layers", m);
    }

    /** First open wall cell (section „Mauer“, layer 1) that wants stone bricks; the wall was torn down before. */
    private static BlockPos openWallCell(ClientGameTestContext context, int ax, int ay, int az) {
        int[] p = context.computeOnClient(mc -> {
            var c = holo().check();
            for (int x = 4; x <= 8; x++) for (int z = 1; z <= 2; z++) {
                int i = c.indexAt(ax + x, ay + 1, az + z);
                if (i >= 0 && c.verdict(i) == Verdict.MISSING && c.expected(i).id().equals("minecraft:stone_bricks")) return new int[] { ax + x, ay + 1, az + z };
            }
            return null;
        });
        if (p == null) throw new AssertionError("keine offene Steinziegel-Zelle in der Mauer");
        return new BlockPos(p[0], p[1], p[2]);
    }

    /** Turns the camera to a point in the world (TestInput.lookAt(BlockPos) aims at the block's centre). */
    private static void lookAtPoint(ClientGameTestContext context, double x, double y, double z) {
        float[] r = context.computeOnClient(mc -> {
            var eye = mc.player.getEyePosition();
            double dx = x - eye.x, dy = y - eye.y, dz = z - eye.z;
            return new float[] { (float) Math.toDegrees(Math.atan2(-dx, dz)), (float) -Math.toDegrees(Math.atan2(dy, Math.sqrt(dx * dx + dz * dz))) };
        });
        context.getInput().lookAt(r[0], r[1]);
    }

    /** MOD-07: „warnen“ only hints, „aus“ is silent, Num 8 takes the plan block, doors/chests/buttons work, scaffolding on planned air. */
    private static void helper(ClientGameTestContext context, TestSingleplayerContext world, Path io, int ax, int ay, int az) throws IOException {
        var server = world.getServer();
        Map<String, Object> m = new LinkedHashMap<>();
        BlockPos t = openWallCell(context, ax, ay, az);
        BlockPos below = t.below();
        m.put("cell", List.of(t.getX() - ax, t.getY() - ay, t.getZ() - az));
        standAt(context, world, t.getX() + 0.5, ay, t.getZ() - 3.5, 0, 30);
        server.runCommand("clear @a");
        server.runCommand("item replace entity @a hotbar.0 with minecraft:dirt 16");
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(0));
        context.waitTicks(5);
        // 1. „warnen“: the wrong block goes in, with a hint.
        mark(context, "warnen");
        chat(context, "/bauplaner platzierhilfe warnen");
        m.put("warnResult", use(context, below, Direction.UP));
        m.put("warnBlock", state(context, t));
        server.runCommand("setblock " + t.getX() + " " + t.getY() + " " + t.getZ() + " minecraft:air");
        context.waitTicks(10);
        // 2. „aus“: the wrong block goes in, nothing is said.
        mark(context, "aus");
        chat(context, "/bauplaner platzierhilfe aus");
        m.put("offResult", use(context, below, Direction.UP));
        m.put("offBlock", state(context, t));
        mark(context, "aus-ende");
        server.runCommand("setblock " + t.getX() + " " + t.getY() + " " + t.getZ() + " minecraft:air");
        chat(context, "/bauplaner platzierhilfe an");
        context.waitTicks(10);
        // 3. Num 8 with the dirt in hand, aiming at the open cell: the stone bricks from slot 4 come into the hand.
        server.runCommand("item replace entity @a hotbar.3 with minecraft:stone_bricks 16");
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(0));
        // Aim at the middle of the floor block's top face, so the dirt in hand would go into the open cell (aiming at
        // the block's centre from the side hits its north face and points next to the plan).
        lookAtPoint(context, below.getX() + 0.5, below.getY() + 1.0, below.getZ() + 0.5);
        context.waitTicks(8);
        m.put("aim", context.computeOnClient(mc -> mc.hitResult instanceof BlockHitResult h ? List.of(h.getBlockPos().getX() - ax, h.getBlockPos().getY() - ay, h.getBlockPos().getZ() - az) : List.of()));
        key(context, InputConstants.KEY_NUMPAD8);
        m.put("pickSlot", context.computeOnClient(mc -> mc.player.getInventory().getSelectedSlot()));
        // 4. Interactive blocks inside the plan with a plan block in hand and the helper on: they work as usual.
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(3));
        server.runCommand("setblock " + t.getX() + " " + t.getY() + " " + t.getZ() + " minecraft:chest[facing=north]");
        context.waitTicks(10);
        use(context, t, Direction.NORTH);
        context.waitTicks(6);
        m.put("chestScreen", screen(context));
        context.setScreen(() -> null);
        server.runCommand("setblock " + t.getX() + " " + t.getY() + " " + t.getZ() + " minecraft:stone_button[face=floor,facing=north]");
        context.waitTicks(10);
        use(context, t, Direction.UP);
        m.put("button", state(context, t));
        server.runCommand("setblock " + t.getX() + " " + (t.getY() + 1) + " " + t.getZ() + " minecraft:air");
        server.runCommand("setblock " + t.getX() + " " + t.getY() + " " + t.getZ() + " minecraft:oak_door[half=lower,facing=north]");
        server.runCommand("setblock " + t.getX() + " " + (t.getY() + 1) + " " + t.getZ() + " minecraft:oak_door[half=upper,facing=north]");
        context.waitTicks(10);
        use(context, t, Direction.NORTH);
        m.put("door", state(context, t));
        server.runCommand("setblock " + t.getX() + " " + (t.getY() + 1) + " " + t.getZ() + " minecraft:air");
        server.runCommand("setblock " + t.getX() + " " + t.getY() + " " + t.getZ() + " minecraft:air");
        context.waitTicks(10);
        // 5. Placing the plan block itself still works (helper on, right block, top of the block below).
        m.put("rightResult", use(context, below, Direction.UP));
        m.put("rightBlock", state(context, t));
        copy(context.takeScreenshot("bauplaner-abnahme-platzierhilfe"), io.resolve("abnahme-platzierhilfe.png"));
        FACTS.put("helper", m);
    }

    /** MOD-07 (Gerüst auf Luft) and MOD-17 (/bauplaner geruest names only blocks that really hang). */
    private static void scaffold(ClientGameTestContext context, TestSingleplayerContext world, int ax, int ay, int az) {
        var server = world.getServer();
        Map<String, Object> m = new LinkedHashMap<>();
        // Scaffolding on planned air inside the plan's box (in front of the wall, ground level), helper on.
        BlockPos air = new BlockPos(ax + 6, ay, az);
        m.put("airPlanned", expected(context, air));
        server.runCommand("setblock " + air.getX() + " " + air.getY() + " " + air.getZ() + " minecraft:air");
        server.runCommand("item replace entity @a hotbar.6 with minecraft:scaffolding 16");
        standAt(context, world, air.getX() + 0.5, ay, air.getZ() - 3.5, 0, 30);
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(6));
        m.put("scaffoldResult", use(context, air.below(), Direction.UP));
        m.put("scaffoldBlock", state(context, air));
        server.runCommand("setblock " + air.getX() + " " + air.getY() + " " + air.getZ() + " minecraft:air");
        // Wall torn down above its base: nothing hangs, everything grows from the base (no false alarm).
        // Our own count of what really hangs (MOD-17): open plan blocks that cannot be reached, through other open plan
        // blocks, from any open block with something standing next to it (not air, water or lava) – read straight
        // from the client world, independent of the mod's own check.
        java.util.function.Supplier<Integer> hanging = () -> context.computeOnClient(mc -> {
            var c = holo().check();
            var f = holo().filter();
            java.util.Set<BlockPos> open = new java.util.HashSet<>();
            for (int i = 0; i < c.size(); i++) {
                BlockPos p = new BlockPos(c.worldX(i), c.worldY(i), c.worldZ(i));
                if (mc.level.getBlockState(p).isAir() && !c.expected(i).isAir()) open.add(p);
            }
            java.util.ArrayDeque<BlockPos> queue = new java.util.ArrayDeque<>();
            java.util.Set<BlockPos> reached = new java.util.HashSet<>();
            for (BlockPos p : open) for (Direction d : Direction.values()) {
                BlockPos q = p.relative(d);
                if (open.contains(q)) continue;
                var b = mc.level.getBlockState(q);
                if (!b.isAir() && b.getFluidState().isEmpty()) { reached.add(p); queue.add(p); break; }
            }
            while (!queue.isEmpty()) {
                BlockPos p = queue.poll();
                for (Direction d : Direction.values()) { BlockPos q = p.relative(d); if (open.contains(q) && reached.add(q)) queue.add(q); }
            }
            int n = 0;
            for (int i = 0; i < c.size(); i++) {
                BlockPos p = new BlockPos(c.worldX(i), c.worldY(i), c.worldZ(i));
                if (open.contains(p) && !reached.contains(p) && f.test(c, i)) n++;
            }
            return n;
        });
        mark(context, "geruest-1");
        m.put("hangingBefore", hanging.get());
        chat(context, "/bauplaner geruest");
        // Build the first wall layer as planned: the second layer gets something to stand on.
        context.runOnClient(mc -> {});
        List<String> layer = context.computeOnClient(mc -> {
            var c = holo().check();
            List<String> out = new ArrayList<>();
            for (int i = 0; i < c.size(); i++) if (c.worldY(i) == ay + 1 && c.worldX(i) >= ax + 4 && c.verdict(i) != Verdict.OK)
                out.add(c.worldX(i) + " " + c.worldY(i) + " " + c.worldZ(i) + " " + c.expected(i));
            return out;
        });
        for (String l : layer) server.runCommand("setblock " + l);
        context.waitTicks(40);
        mark(context, "geruest-2");
        m.put("hangingAfter", hanging.get());
        m.put("layerBuilt", layer.size());
        chat(context, "/bauplaner geruest");
        // The same plan 40 blocks up in the air: every open block hangs; one support block under the lowest cell lets
        // everything connected to it grow again.
        context.runOnClient(mc -> holo().setPlacement(new Placement(DIM, ax, ay + 40, az, 0, false)));
        context.waitTicks(60);
        mark(context, "geruest-luft");
        m.put("airTotal", context.computeOnClient(mc -> { var c = holo().check(); var f = holo().filter(); int n = 0; for (int i = 0; i < c.size(); i++) if (f.test(c, i) && !c.expected(i).isAir()) n++; return n; }));
        m.put("hangingAir", hanging.get());
        chat(context, "/bauplaner geruest");
        int[] low = context.computeOnClient(mc -> {
            var c = holo().check();
            int best = -1;
            for (int i = 0; i < c.size(); i++) if (!c.expected(i).isAir() && (best < 0 || c.worldY(i) < c.worldY(best))) best = i;
            return new int[] { c.worldX(best), c.worldY(best) - 1, c.worldZ(best) };
        });
        server.runCommand("setblock " + low[0] + " " + low[1] + " " + low[2] + " minecraft:stone");
        context.waitTicks(40);
        mark(context, "geruest-stuetze");
        m.put("hangingSupported", hanging.get());
        chat(context, "/bauplaner geruest");
        server.runCommand("setblock " + low[0] + " " + low[1] + " " + low[2] + " minecraft:air");
        context.runOnClient(mc -> holo().setPlacement(new Placement(DIM, ax, ay, az, 0, false)));
        context.waitTicks(40);
        context.setScreen(() -> null);
        FACTS.put("scaffold", m);
    }

    /** MOD-04: finishing a section says so exactly once and names the next one. */
    private static void sectionDone(ClientGameTestContext context, TestSingleplayerContext world, int ax, int ay, int az) {
        var server = world.getServer();
        standAt(context, world, ax + 1.5, ay, az - 3.5, 0, 20);
        chat(context, "/bauplaner abschnitt 1");
        context.waitTicks(30);
        mark(context, "abschnitt-turm");
        List<String> open = context.computeOnClient(mc -> {
            var c = holo().check();
            List<String> out = new ArrayList<>();
            var f = holo().filter();
            for (int i = 0; i < c.size(); i++) if (f.test(c, i) && c.verdict(i) != Verdict.OK) out.add(c.worldX(i) + " " + c.worldY(i) + " " + c.worldZ(i) + " " + c.expected(i));
            return out;
        });
        FACTS.put("towerOpenBefore", open.size());
        for (String l : open) server.runCommand("setblock " + l);
        context.waitTicks(120);
        FACTS.put("towerOpenAfter", context.computeOnClient(mc -> holo().open(1)));
        // Nothing else must come: wait as long again, the line stays single (checked between the marks).
        context.waitTicks(100);
        mark(context, "abschnitt-turm-ende");
        chat(context, "/bauplaner abschnitt alle");
    }

    /** MOD-21: groups and locks from the Weltplan, by command, by the menu row and with the helper resting. */
    private static void groups(ClientGameTestContext context, TestSingleplayerContext world, Path io, int ax, int ay, int az, String token) throws IOException {
        var http = java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build();
        String base = "http://127.0.0.1:47615", origin = "https://freadeax.github.io";
        Map<String, Object> m = new LinkedHashMap<>();
        // Tower in the locked group „Markt“, wall in the open group „Hof“.
        String marks = "{\"dimension\":\"" + DIM + "\",\"items\":["
                + "{\"kind\":\"site\",\"id\":\"site_markt\",\"name\":\"Marktstand\",\"note\":\"\",\"dimension\":\"" + DIM + "\",\"minX\":" + (ax - 1) + ",\"minZ\":" + (az - 1) + ",\"width\":5,\"length\":6,\"y\":null,\"projectId\":null,\"group\":\"Markt\",\"locked\":true},"
                + "{\"kind\":\"site\",\"id\":\"site_hof\",\"name\":\"Hofmauer\",\"note\":\"\",\"dimension\":\"" + DIM + "\",\"minX\":" + (ax + 4) + ",\"minZ\":" + (az - 1) + ",\"width\":6,\"length\":5,\"y\":null,\"projectId\":null,\"group\":\"Hof\",\"locked\":false}]}";
        m.put("marks", BridgeGameTest.request(context, http, base + "/v1/marks", "POST", marks, token, origin));
        context.waitTicks(20);
        // Open some blocks again: one in the locked tower, the wall's second layer is still open.
        BlockPos lockedCell = new BlockPos(ax + 1, ay + 1, az);
        world.getServer().runCommand("setblock " + lockedCell.getX() + " " + lockedCell.getY() + " " + lockedCell.getZ() + " minecraft:air");
        context.waitTicks(30);
        java.util.function.Supplier<Map<String, Object>> view = () -> context.computeOnClient(mc -> {
            var h = holo();
            var c = h.check();
            var f = h.filter();
            int shown = 0, towerShown = 0;
            for (int i = 0; i < c.size(); i++) if (f.test(c, i)) { shown++; if (c.worldX(i) <= ax + 3) towerShown++; }
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("group", h.group() == null ? "alle" : h.group());
            out.put("shown", shown); out.put("towerShown", towerShown);
            out.put("locked", h.lockedBlocks()); out.put("lockedTower", h.lockedAt(ax + 1, az));
            int[] counts = c.count(f);
            out.put("open", counts[Verdict.MISSING.ordinal()] + counts[Verdict.WRONG.ordinal()] + counts[Verdict.STATE.ordinal()]);
            return out;
        });
        m.put("all", view.get());
        mark(context, "gruppe-liste");
        chat(context, "/bauplaner gruppe");
        chat(context, "/bauplaner gruppe Hof");
        context.waitTicks(10);
        m.put("hof", view.get());
        mark(context, "gruppe-packliste");
        chat(context, "/bauplaner packliste");
        chat(context, "/bauplaner gruppe aus Hof");
        context.waitTicks(10);
        m.put("hofHidden", view.get());
        chat(context, "/bauplaner gruppe an Hof");
        context.waitTicks(10);
        m.put("hofShownAgain", view.get());
        chat(context, "/bauplaner gruppe alle");
        context.waitTicks(10);
        m.put("allAgain", view.get());
        // Menu row „Gruppe“: one click goes to the next group.
        chat(context, "/bauplaner menue");
        context.waitTicks(8);
        BridgeGameTest.clickLabel(context, "Ansicht");
        context.waitTicks(6);
        List<String> menuGroups = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            String label = context.computeOnClient(mc -> mc.gui.screen() == null ? "" : mc.gui.screen().children().stream()
                    .filter(c -> c instanceof net.minecraft.client.gui.components.Button b && b.getMessage().getString().startsWith("Gruppe"))
                    .map(c -> ((net.minecraft.client.gui.components.Button) c).getMessage().getString()).findFirst().orElse(""));
            if (label.isEmpty()) { menuGroups.add("keine Zeile Gruppe"); break; }
            BridgeGameTest.clickLabel(context, label);
            context.waitTicks(6);
            menuGroups.add(label + " -> " + context.computeOnClient(mc -> holo().group() == null ? "alle" : holo().group()));
        }
        m.put("menu", menuGroups);
        context.setScreen(() -> null);
        chat(context, "/bauplaner gruppe alle");
        // Locked tower: the helper rests – dirt in the open tower cell goes in without a word; the finder skips it.
        world.getServer().runCommand("clear @a");
        world.getServer().runCommand("item replace entity @a hotbar.0 with minecraft:dirt 4");
        standAt(context, world, lockedCell.getX() + 0.5, ay, lockedCell.getZ() - 3.5, 0, 30);
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(0));
        mark(context, "gesperrt");
        m.put("lockedPlace", use(context, lockedCell.below(), Direction.UP));
        m.put("lockedBlock", state(context, lockedCell));
        context.waitTicks(20);
        context.runOnClient(mc -> holo().clearTarget());
        key(context, InputConstants.KEY_PERIOD);
        m.put("finder", context.computeOnClient(mc -> {
            int t = holo().target();
            var c = holo().check();
            return t < 0 ? List.of() : List.of(c.worldX(t) - ax, c.worldY(t) - ay, c.worldZ(t) - az);
        }));
        mark(context, "gesperrt-ende");
        m.put("status", BridgeGameTest.request(context, http, base + "/v1/status", "GET", null, token, origin));
        copy(context.takeScreenshot("bauplaner-abnahme-gruppen"), io.resolve("abnahme-gruppen.png"));
        // Back: the tower block as planned, marks cleared.
        world.getServer().runCommand("setblock " + lockedCell.getX() + " " + lockedCell.getY() + " " + lockedCell.getZ() + " minecraft:stone_bricks");
        m.put("cleared", BridgeGameTest.request(context, http, base + "/v1/marks", "POST", "{\"dimension\":\"" + DIM + "\",\"items\":[]}", token, origin));
        world.getServer().runCommand("clear @a");
        FACTS.put("groups", m);
    }

    /** MOD-09 / LIVE-06: a key moved to K works and lands in options.txt; a clash shows in the diagnosis, which is also on the clipboard. */
    private static void keyBinding(ClientGameTestContext context, Path io, Path root) throws IOException {
        Map<String, Object> m = new LinkedHashMap<>();
        var menuKey = context.computeOnClient(mc -> client().keys().stream().filter(k -> k.getName().equals("key.bauplaner_bridge.menu")).findFirst().orElseThrow());
        context.runOnClient(mc -> { menuKey.setKey(InputConstants.Type.KEYBOARD.getOrCreate(InputConstants.KEY_K)); net.minecraft.client.KeyMapping.resetMapping(); mc.options.save(); });
        context.waitTicks(5);
        key(context, InputConstants.KEY_K);
        context.waitTicks(6);
        m.put("kOpens", screen(context));
        context.setScreen(() -> null);
        key(context, InputConstants.KEY_J);
        context.waitTicks(6);
        m.put("jOpens", screen(context));
        context.setScreen(() -> null);
        Path options = context.computeOnClient(mc -> mc.options.getFile().toPath());
        m.put("optionsLine", Files.readAllLines(options).stream().filter(l -> l.startsWith("key_key.bauplaner_bridge.menu:")).findFirst().orElse(""));
        // Clash on purpose: the menu on E (inventory) – the diagnosis must name it; back to J – no clash.
        context.runOnClient(mc -> { menuKey.setKey(InputConstants.Type.KEYBOARD.getOrCreate(InputConstants.KEY_E)); net.minecraft.client.KeyMapping.resetMapping(); });
        // The earlier report (diagnose.txt, checked by the hologram part) stays; these two get their own names.
        Path earlier = io.resolve("diagnose-frueher.txt");
        if (Files.exists(io.resolve("diagnose.txt"))) Files.copy(io.resolve("diagnose.txt"), earlier, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        chat(context, "/bauplaner diagnose");
        context.waitTicks(5);
        BridgeGameTest.copyDiagnose(root, io);
        Files.move(io.resolve("diagnose.txt"), io.resolve("diagnose-konflikt.txt"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        m.put("clipboardClash", context.computeOnClient(mc -> mc.keyboardHandler.getClipboard()));
        context.runOnClient(mc -> { menuKey.setKey(menuKey.getDefaultKey()); net.minecraft.client.KeyMapping.resetMapping(); mc.options.save(); });
        context.setScreen(() -> null);
        chat(context, "/bauplaner diagnose");
        context.waitTicks(5);
        BridgeGameTest.copyDiagnose(root, io);
        Files.move(io.resolve("diagnose.txt"), io.resolve("diagnose-ok.txt"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        if (Files.exists(earlier)) Files.move(earlier, io.resolve("diagnose.txt"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        m.put("clipboard", context.computeOnClient(mc -> mc.keyboardHandler.getClipboard()));
        m.put("optionsLineBack", Files.readAllLines(options).stream().filter(l -> l.startsWith("key_key.bauplaner_bridge.menu:")).findFirst().orElse(""));
        context.setScreen(() -> null);
        FACTS.put("keyBinding", m);
    }

    // ------------------------------------------------------------------ LINK-09: offline and back

    /** Whether this run has a team room behind the cuttable relay (scripts/mod/bridge_netcut.mjs). */
    static boolean offlineReady(Path io) { return Files.isRegularFile(io.resolve("room.json")) && Files.isRegularFile(io.resolve("netcut-ready")); }

    private static String room(ClientGameTestContext context, java.net.http.HttpClient http, String token) {
        return BridgeGameTest.request(context, http, "http://127.0.0.1:47615/v1/room", "GET", null, token, "https://freadeax.github.io");
    }

    private static void waitFile(ClientGameTestContext context, Path f) {
        context.waitFor(mc -> Files.exists(f), 20 * 60);
    }

    /**
     * LINK-09 first half, in the running world: a team chest from the room, then the line is cut; in the game the
     * player takes a section, builds in both sections and opens/closes the team chest. Everything waits in the mod.
     */
    static void offline(ClientGameTestContext context, TestSingleplayerContext world, Path io, int[] anchor, String token) throws IOException {
        var http = java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build();
        var server = world.getServer();
        int ax = anchor[0], ay = anchor[1], az = anchor[2];
        var rj = com.google.gson.JsonParser.parseString(Files.readString(io.resolve("room.json"))).getAsJsonObject();
        String roomUrl = rj.get("url").getAsString().replaceAll("/+$", ""), roomId = rj.get("room").getAsString(), roomKey = rj.get("adminKey").getAsString();
        // The team chest the Bauleitung (Lea, role meister and up) marked (store.chest in the room), beside the wall.
        BlockPos chest = new BlockPos(ax + 11, ay, az + 1);
        server.runCommand("setblock " + chest.getX() + " " + chest.getY() + " " + chest.getZ() + " minecraft:chest[facing=north]");
        server.runCommand("item replace block " + chest.getX() + " " + chest.getY() + " " + chest.getZ() + " container.0 with minecraft:stone_bricks 20");
        server.runCommand("item replace block " + chest.getX() + " " + chest.getY() + " " + chest.getZ() + " container.1 with minecraft:oak_log 7");
        String ev = "{\"batch\":\"chest\",\"events\":[{\"id\":\"tev_chest_spieltest\",\"at\":\"" + java.time.Instant.now() + "\",\"by\":\"mem_lea\",\"origin\":\"planer\",\"kind\":\"store.chest\",\"chest\":\"kiste_spieltest\",\"name\":\"Teamkiste\",\"pos\":["
                + chest.getX() + "," + chest.getY() + "," + chest.getZ() + "],\"dimension\":\"" + DIM + "\"}]}";
        var post = java.net.http.HttpRequest.newBuilder(java.net.URI.create(roomUrl + "/v1/rooms/" + roomId + "/events")).timeout(java.time.Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + roomKey).header("Content-Type", "application/json").POST(java.net.http.HttpRequest.BodyPublishers.ofString(ev)).build();
        OFFLINE.put("chestEvent", BridgeGameTest.send(context, http, post));
        context.waitFor(mc -> client().team().state() != null && client().team().state().stores().stream().anyMatch(s -> s.id().equals("kiste_spieltest")), 20 * 40);
        // Everything measured so far is out: start from zero waiting reports.
        for (int i = 0; i < 60 && !room(context, http, token).contains("\"pendingReports\":0"); i++) context.waitTicks(10);
        OFFLINE.put("before", com.google.gson.JsonParser.parseString(room(context, http, token)));

        // Cut the line.
        Files.writeString(io.resolve("offline-cut-at"), java.time.Instant.now().toString());
        Files.writeString(io.resolve("net-off"), "");
        waitFile(context, io.resolve("net-is-off"));
        String st = "";
        for (int i = 0; i < 90; i++) {
            context.waitTicks(10);
            st = room(context, http, token);
            if (!st.contains("\"status\":\"live\"") && !st.contains("\"status\":\"poll\"")) break;
        }
        OFFLINE.put("cut", com.google.gson.JsonParser.parseString(st));
        // Offline in the game: take section 1, build in both sections, open and close the team chest.
        context.setScreen(() -> null);
        chat(context, "/bauplaner abschnitt alle");
        chat(context, "/bauplaner team nehmen 1");
        context.waitTicks(10);
        List<String> wall = context.computeOnClient(mc -> {
            var c = holo().check();
            List<String> out = new ArrayList<>();
            for (int i = 0; i < c.size(); i++) if (c.worldY(i) == ay + 2 && c.worldX(i) >= ax + 4 && c.verdict(i) != Verdict.OK)
                out.add(c.worldX(i) + " " + c.worldY(i) + " " + c.worldZ(i) + " " + c.expected(i));
            return out;
        });
        for (String l : wall) server.runCommand("setblock " + l);
        // The tower loses two blocks (the section measurement changes there too).
        server.runCommand("setblock " + (ax + 2) + " " + (ay + 1) + " " + az + " minecraft:air");
        server.runCommand("setblock " + (ax + 1) + " " + (ay + 2) + " " + az + " minecraft:air");
        OFFLINE.put("built", wall.size());
        standAt(context, world, chest.getX() + 0.5, ay, chest.getZ() - 2.5, 0, 25);
        context.getInput().lookAt(chest);
        context.waitTicks(6);
        server.runCommand("clear @a");
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(8));
        use(context, chest, Direction.NORTH);
        context.waitTicks(30);
        OFFLINE.put("chestScreen", screen(context));
        context.setScreen(() -> null);
        context.waitTicks(10);
        // Section reports go out every 10 s, each section at most every 30 s: wait until all three wait.
        String waiting = "";
        for (int i = 0; i < 120; i++) {
            context.waitTicks(10);
            waiting = room(context, http, token);
            var w = com.google.gson.JsonParser.parseString(waiting).getAsJsonObject().getAsJsonObject("body");
            if (w.has("pendingReports") && w.get("pendingReports").getAsInt() >= 3) break;
        }
        OFFLINE.put("offline", com.google.gson.JsonParser.parseString(waiting));
        OFFLINE.put("statusLine", context.computeOnClient(mc -> client().team().sync().room().statusLine()));
        context.setScreen(() -> null);
        context.runOnClient(mc -> mc.gui.hud.getChat().clearMessages(false));
        standAt(context, world, ax - 5.5, ay, az - 8.5, 0, 0);
        context.getInput().lookAt(new BlockPos(ax + 3, ay + 4, az + 2));
        context.waitTicks(10);
        copy(context.takeScreenshot("bauplaner-offline"), io.resolve("offline.png"));
    }

    /**
     * After the world is left and entered again: the plan stands where it stood (MOD-02); while still offline the
     * waiting reports are still there; then the line comes back and everything goes out once (LINK-09).
     */
    static void reopen(ClientGameTestContext context, TestWorldSave save, Path io, int[] anchor, String token, Map<String, Object> placedBefore) throws IOException {
        var http = java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build();
        Map<String, Object> m = new LinkedHashMap<>();
        boolean offline = offlineReady(io) && OFFLINE.containsKey("offline");
        try (TestSingleplayerContext world = save.open()) {
            world.getConnection().waitForChunksRender();
            context.waitTicks(40);
            m.put("active", context.computeOnClient(mc -> holo().active()));
            m.put("planFile", context.computeOnClient(mc -> holo().active() ? holo().planFile() : ""));
            m.put("placement", context.computeOnClient(mc -> holo().active()) ? placement(context) : Map.of());
            m.put("before", placedBefore);
            m.put("menuKey", context.computeOnClient(mc -> client().keys().getFirst().saveString()));
            if (offline) {
                String st = room(context, http, token);
                OFFLINE.put("rejoined", com.google.gson.JsonParser.parseString(st));
                mark(context, "netz-zurueck");
                Files.writeString(io.resolve("net-on"), "");
                waitFile(context, io.resolve("net-is-on"));
                String back = "";
                for (int i = 0; i < 180; i++) {
                    context.waitTicks(10);
                    back = room(context, http, token);
                    if ((back.contains("\"status\":\"live\"") || back.contains("\"status\":\"poll\"")) && back.contains("\"pendingReports\":0") && back.contains("\"waiting\":0")) break;
                }
                OFFLINE.put("back", com.google.gson.JsonParser.parseString(back));
                context.waitTicks(40);
                OFFLINE.put("statusLineBack", context.computeOnClient(mc -> client().team().sync().room().statusLine()));
                mark(context, "netz-zurueck-ende");
                Files.writeString(io.resolve("offline.json"), GSON.toJson(OFFLINE));
            }
        }
        Files.writeString(io.resolve("wiederbetreten.json"), GSON.toJson(m));
    }

    static Map<String, Object> placementNow(ClientGameTestContext context) { return placement(context); }
}
