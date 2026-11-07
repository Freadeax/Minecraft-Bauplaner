package io.github.freadeax.bauplaner.bridge.gametest;

import com.mojang.blaze3d.platform.InputConstants;
import io.github.freadeax.bauplaner.bridge.hologram.McCompat;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.multiplayer.resolver.ServerAddress;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;

/**
 * Multiplayer acceptance with the real game (Roadmap block 4, GAME-02 Mehrspieler, TEAMBAU-06 with the mod, LINK-12):
 * the Minecraft 26.3 client with the mod joins a real Paper 26.3 server with the Build Studio plugin
 * (scripts/mod/bridge_multiplayer_client.mjs starts both the server and the team room). The planner has handed the
 * team room to this game before (raum.json with the server key, like „Mein Spiel verbinden“ as Bauleitung).
 * The player allows the team channel once, the mod hands the room to the plugin by itself, then takes a section,
 * reads „mein“ and the material list and builds in the section. Chat lines and the room are checked by the driver.
 * Hand-shake files in BAUPLANER_GAMETEST_DIR: mp-room.json (in), mp-player.txt (out), mp-op.txt (in), mp-done.txt (out).
 */
final class PaperMultiplayerTest {
    private PaperMultiplayerTest() { }

    static void run(ClientGameTestContext context, Path io, String address) throws IOException {
        Path root = FabricLoader.getInstance().getGameDir().resolve("bauplaner");
        Path team = root.resolve("team");
        Files.createDirectories(team);
        for (String f : new String[] { "raum.json", "raum-stand.json", "erlaubt.properties" }) Files.deleteIfExists(team.resolve(f));
        String name = context.computeOnClient(mc -> mc.getUser().getName());
        Files.writeString(io.resolve("mp-player.txt"), name);

        context.runOnClient(mc -> ConnectScreen.startConnecting(new TitleScreen(), mc, ServerAddress.parseString(address),
                new ServerData("Paper", address, ServerData.Type.OTHER), false, null));
        context.waitFor(mc -> mc.player != null && mc.level != null && mc.getConnection() != null, 20 * 180);
        // The driver makes this player operator (like the server owner) and puts the items in place.
        context.waitFor(mc -> Files.exists(io.resolve("mp-op.txt")), 20 * 60);
        context.waitTicks(40);

        chat(context, "/bauplaner sprache deutsch");
        // „Mein Spiel verbinden“ as Bauleitung: the planner pairs over 127.0.0.1 and hands room, member key and
        // server key to the mod (POST /v1/room), exactly like the website does.
        chat(context, "/bauplaner verbinden port 47616");
        String code = BridgeGameTest.pairingCode();
        if (code == null) throw new AssertionError("Kein Kopplungscode");
        var http = java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build();
        String base = "http://127.0.0.1:47616", site = "https://freadeax.github.io";
        String pair = BridgeGameTest.request(context, http, base + "/v1/pair", "POST", "{\"code\":\"" + code + "\"}", null, site);
        var m = java.util.regex.Pattern.compile("\"token\":\"([A-Za-z0-9_-]+)\"").matcher(pair);
        if (!m.find()) throw new AssertionError("Kopplung ohne Schlüssel: " + pair);
        String set = BridgeGameTest.request(context, http, base + "/v1/room", "POST", Files.readString(io.resolve("mp-room.json")), m.group(1), site);
        Files.writeString(io.resolve("mp-roomset.json"), set);
        context.waitTicks(40);
        chat(context, "/bauplaner team erlauben");
        context.waitTicks(100);
        chat(context, "/bauplaner team");
        chat(context, "/bauplaner team abschnitte");
        chat(context, "/bauplaner team nehmen 1");
        context.waitTicks(60);
        chat(context, "/bauplaner team mein");
        chat(context, "/bauplaner team material");
        context.waitTicks(20);

        // Build three blocks inside section 1 (origin 0/-60/0) as a player: right click on the grass below.
        context.waitFor(mc -> mc.player.getMainHandItem().getCount() > 0, 20 * 20);
        for (int x = 1; x <= 3; x++) {
            BlockPos below = new BlockPos(x, -61, 2);
            context.getInput().lookAt(below.above());
            context.waitTicks(3);
            BlockHitResult hit = new BlockHitResult(Vec3.atCenterOf(below).add(0, 0.5, 0), Direction.UP, below, false);
            context.runOnClient(mc -> mc.gameMode.useItemOn(mc.player, InteractionHand.MAIN_HAND, hit));
            context.waitTicks(10);
        }
        chat(context, "/bp beitrag");
        context.waitTicks(40);
        chat(context, "/bauplaner team");
        context.waitTicks(40);
        context.setScreen(() -> null);
        context.takeScreenshot("bauplaner-paper-mehrspieler");
        if (Files.isRegularFile(io.resolve("plan.schem"))) helperOnServer(context, io, root);
        Files.writeString(io.resolve("mp-done.txt"), "ok\n");
        context.waitTicks(20);
        context.runOnClient(mc -> mc.disconnectFromWorld(net.minecraft.network.chat.Component.literal("Spieltest fertig")));
        context.waitFor(mc -> mc.level == null, 20 * 30);
        context.setScreen(TitleScreen::new);
    }

    /**
     * MOD-10 (Block C, 07.11.2026): the hologram and the placement helper on a server without the mod. The plan stands
     * beside the team sections on the flat world; a wrong block is refused and the right one taken from the hotbar,
     * the right block goes in – all through the real client path against the real Paper server. Results in
     * mp-helper.json (judged by bridge_multiplayer_client.mjs together with the server log).
     */
    private static void helperOnServer(ClientGameTestContext context, Path io, Path root) throws IOException {
        Files.createDirectories(root.resolve("plans"));
        Files.copy(io.resolve("plan.schem"), root.resolve("plans").resolve("server-plan.schem"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        chat(context, "/gamemode creative");
        chat(context, "/clear");
        chat(context, "/bauplaner zeigen server-plan.schem");
        context.waitTicks(40);
        int ox = 20, oy = -60, oz = 20;
        context.runOnClient(mc -> AbnahmeScenario.client().hologram().setPlacement(new io.github.freadeax.bauplaner.mod.Placement("minecraft:overworld", ox, oy, oz, 0, false)));
        chat(context, "/tp @s " + (ox + 1.5) + " " + oy + " " + (oz - 2.5) + " 0 30");
        context.waitTicks(60);
        chat(context, "/bauplaner platzierhilfe an");
        chat(context, "/item replace entity @s hotbar.0 with minecraft:dirt 16");
        chat(context, "/item replace entity @s hotbar.2 with minecraft:cobblestone 16");
        context.waitTicks(20);
        context.runOnClient(mc -> mc.player.getInventory().setSelectedSlot(0));
        context.waitTicks(5);
        java.util.Map<String, Object> out = new java.util.LinkedHashMap<>();
        BlockPos target = new BlockPos(ox + 1, oy, oz), below = target.below();
        out.put("planned", context.computeOnClient(mc -> {
            var c = AbnahmeScenario.client().hologram().check();
            int i = c.indexAt(target.getX(), target.getY(), target.getZ());
            return i < 0 ? "kein Planblock" : c.expected(i).toString();
        }));
        BlockHitResult hit = new BlockHitResult(Vec3.atCenterOf(below).add(0, 0.5, 0), Direction.UP, below, false);
        context.getInput().lookAt(target);
        context.waitTicks(3);
        out.put("wrongResult", context.computeOnClient(mc -> mc.gameMode.useItemOn(mc.player, InteractionHand.MAIN_HAND, hit).getClass().getSimpleName()));
        context.waitTicks(20);
        out.put("afterWrong", context.computeOnClient(mc -> net.minecraft.commands.arguments.blocks.BlockStateParser.serialize(mc.level.getBlockState(target))));
        out.put("slotAfterWrong", context.computeOnClient(mc -> mc.player.getInventory().getSelectedSlot()));
        context.runOnClient(mc -> mc.gameMode.useItemOn(mc.player, InteractionHand.MAIN_HAND, hit));
        context.waitTicks(20);
        out.put("afterRight", context.computeOnClient(mc -> net.minecraft.commands.arguments.blocks.BlockStateParser.serialize(mc.level.getBlockState(target))));
        // Protected plan block: breaking it is refused on the client, the server keeps it.
        context.runOnClient(mc -> mc.gameMode.startDestroyBlock(target, Direction.UP));
        context.waitTicks(20);
        out.put("afterBreak", context.computeOnClient(mc -> net.minecraft.commands.arguments.blocks.BlockStateParser.serialize(mc.level.getBlockState(target))));
        chat(context, "/bauplaner fortschritt");
        context.waitTicks(10);
        out.put("connected", context.computeOnClient(mc -> mc.getConnection() != null && mc.player != null));
        out.put("worldKey", context.computeOnClient(mc -> McCompat.worldKey(mc)));
        Path stored = root.resolve("platzierung.properties");
        out.put("stored", Files.isRegularFile(stored) ? Files.readString(stored) : "");
        Files.writeString(io.resolve("mp-helper.json"), new com.google.gson.Gson().toJson(out));
        chat(context, "/bauplaner entfernen");
    }

    private static void chat(ClientGameTestContext context, String line) {
        context.setScreen(() -> new ChatScreen("", false));
        context.getInput().typeChars(line);
        context.getInput().pressKey(InputConstants.KEY_RETURN);
        context.waitTicks(10);
    }
}
