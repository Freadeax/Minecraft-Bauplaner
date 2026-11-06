package io.github.freadeax.bauplaner.bridge.gametest;

import com.mojang.blaze3d.platform.InputConstants;
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
 * the Minecraft 26.3 client with the mod joins a real Paper 26.3 server with the Bauplaner plugin
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
        Files.writeString(io.resolve("mp-done.txt"), "ok\n");
        context.waitTicks(20);
        context.runOnClient(mc -> mc.disconnectFromWorld(net.minecraft.network.chat.Component.literal("Spieltest fertig")));
        context.waitFor(mc -> mc.level == null, 20 * 30);
        context.setScreen(TitleScreen::new);
    }

    private static void chat(ClientGameTestContext context, String line) {
        context.setScreen(() -> new ChatScreen("", false));
        context.getInput().typeChars(line);
        context.getInput().pressKey(InputConstants.KEY_RETURN);
        context.waitTicks(10);
    }
}
