package io.github.freadeax.bauplaner.bridge.gametest;

import com.mojang.blaze3d.platform.InputConstants;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;

/**
 * The client mod on NeoForge, same steps as the Fabric test (BridgeGameTest.hologram/placementHelper):
 * hologram on the recorded building with live progress, finder, turning, material list, layers, plan
 * menu (J) and material screen (Num 7), then the placement helper. Clicks go through the real input path
 * ({@code Minecraft.startUseItem}/{@code startAttack} with the crosshair target), where NeoForge fires the
 * cancelable click event the mod listens to; a cancelled click never reaches MultiPlayerGameMode. Chat
 * lines and files are checked by scripts/mod/bridge_gametest.mjs verify, like for Fabric.
 */
final class HologramScenario {
    private static final String PLAN = "spieltest.schem";

    /** Whether the last right/left click event was cancelled (set by a lowest-priority listener). */
    static volatile Boolean lastClickCancelled;

    private HologramScenario() {}

    static List<ClientScenario.Step> steps(ClientScenario s) {
        int[] a = s.anchor();
        List<ClientScenario.Step> out = new ArrayList<>();
        step(out, 40, mc -> s.command("bauplaner zeigen " + PLAN));
        step(out, 3, mc -> s.command("bauplaner fortschritt"));
        step(out, 3, mc -> s.command("bauplaner fehler"));
        step(out, 10, mc -> KeyMapping.click(InputConstants.Type.KEYBOARD.getOrCreate(InputConstants.KEY_J)));
        step(out, 3, mc -> { expectScreen(mc, "PlanScreen", "Taste J öffnet nicht das Planmenü"); mc.gui.setScreen(null); });
        // GAME-10: command page from the chat command (opens on the next tick), the mod's answers land on the page.
        step(out, 3, mc -> s.command("bauplaner packliste"));
        step(out, 3, mc -> s.command("bauplaner geruest"));
        step(out, 3, mc -> s.command("bauplaner markieren lager Testlager"));
        step(out, 3, mc -> s.command("bauplaner markierungen loeschen 1"));
        step(out, 5, mc -> s.command("bauplaner befehle"));
        step(out, 3, mc -> {
            expectScreen(mc, "CommandScreen", "/bauplaner befehle öffnet nicht die Befehlsseite");
            // Like a click on „Leistung“: what the page sends (its progress lines stay out of the log check).
            io.github.freadeax.bauplaner.bridge.hologram.CommandScreen.REPLIES.sent("bauplaner leistung", false, System.currentTimeMillis());
            mc.player.connection.sendCommand("bauplaner leistung");
        });
        step(out, 3, mc -> {
            var last = io.github.freadeax.bauplaner.bridge.hologram.CommandScreen.REPLIES.last(5);
            int sent = -1;
            for (int i = 0; i < last.size(); i++) if (last.get(i).text().equals("› /bauplaner leistung")) sent = i;
            if (sent < 0 || sent == last.size() - 1 || last.get(sent + 1).sent())
                throw new AssertionError("Antwort von „leistung“ fehlt auf der Befehlsseite: " + last);
            mc.gui.setScreen(null);
        });
        // Build the missing block: the live check must notice it without any command.
        step(out, 40, mc -> {
            String json = Files.readString(s.io().resolve("state.json"));
            var m = java.util.regex.Pattern.compile("\"missing\":\\[(-?\\d+),(-?\\d+),(-?\\d+)\\],\"missingState\":\"([^\"]+)\"").matcher(json);
            if (!m.find()) throw new AssertionError("state.json ohne missing/missingState");
            s.server("setblock " + (a[0] + Integer.parseInt(m.group(1))) + " " + (a[1] + Integer.parseInt(m.group(2))) + " "
                    + (a[2] + Integer.parseInt(m.group(3))) + " " + m.group(4));
        });
        step(out, 3, mc -> s.command("bauplaner fortschritt"));
        step(out, 40, mc -> s.command("bauplaner drehen"));
        step(out, 3, mc -> s.command("bauplaner fortschritt"));
        step(out, 40, mc -> s.command("bauplaner drehen -1"));
        step(out, 3, mc -> s.command("bauplaner fortschritt"));
        // Stage 2: material list, layer mode.
        step(out, 3, mc -> s.command("bauplaner material"));
        step(out, 3, mc -> { mc.gui.setScreen(null); s.command("bauplaner ebene " + a[1]); });
        step(out, 3, mc -> s.command("bauplaner fehler"));
        step(out, 3, mc -> s.command("bauplaner ebene " + (a[1] + 1)));
        step(out, 3, mc -> s.command("bauplaner fehler"));
        step(out, 3, mc -> s.command("bauplaner ebene alle"));
        step(out, 40, mc -> s.server("fill " + (a[0] + 4) + " " + (a[1] + 1) + " " + a[2] + " " + (a[0] + 8) + " " + (a[1] + 3) + " " + (a[2] + 3) + " minecraft:air"));
        step(out, 3, mc -> s.command("bauplaner material"));
        step(out, 3, mc -> mc.gui.setScreen(null));
        step(out, 10, mc -> KeyMapping.click(InputConstants.Type.KEYBOARD.getOrCreate(InputConstants.KEY_NUMPAD7)));
        step(out, 3, mc -> { expectScreen(mc, "MaterialScreen", "Num 7 öffnet nicht die Materialliste"); mc.gui.setScreen(null); });
        // Stage 5: build sections from the plan file (Turm, Mauer) and X-ray.
        step(out, 3, mc -> s.command("bauplaner abschnitt 2"));
        step(out, 3, mc -> s.command("bauplaner abschnitt"));
        step(out, 10, mc -> s.command("bauplaner roentgen"));
        step(out, 3, mc -> s.command("bauplaner roentgen"));
        step(out, 3, mc -> s.command("bauplaner abschnitt alle"));
        // Test phase (QA-04): the diagnosis report is written and readable.
        step(out, 3, mc -> s.command("bauplaner diagnose"));
        step(out, 3, mc -> {
            try (var files = Files.list(s.root().resolve("diagnose"))) {
                var newest = files.filter(f -> f.getFileName().toString().endsWith(".txt")).max(java.util.Comparator.comparing(f -> f.getFileName().toString())).orElseThrow(() -> new AssertionError("kein Diagnosebericht in bauplaner/diagnose/"));
                Files.copy(newest, s.io().resolve("diagnose.txt"), StandardCopyOption.REPLACE_EXISTING);
            }
        });
        placementHelper(out, s, a);
        step(out, 1, mc -> Files.copy(s.root().resolve("platzierung.properties"), s.io().resolve("platzierung.properties"), StandardCopyOption.REPLACE_EXISTING));
        return out;
    }

    /**
     * Stage 3: stone in hand where an oak log belongs → not placed, log taken from the hotbar; log on the side
     * of a block (would lie) → not placed; on top of the block below → placed upright; the correct block is
     * protected against breaking, after "warnen" it can be broken.
     */
    private static void placementHelper(List<ClientScenario.Step> out, ClientScenario s, int[] a) {
        BlockPos target = new BlockPos(a[0] + 3, a[1] + 4, a[2]);
        BlockPos below = target.below(), side = target.north();
        BlockHitResult top = new BlockHitResult(new Vec3(below.getX() + 0.5, below.getY() + 1.0, below.getZ() + 0.5), Direction.UP, below, false);
        BlockHitResult onSide = new BlockHitResult(new Vec3(side.getX() + 0.5, side.getY() + 0.5, side.getZ() + 1.0), Direction.SOUTH, side, false);
        BlockHitResult onTarget = new BlockHitResult(new Vec3(target.getX() + 0.5, target.getY() + 1.0, target.getZ() + 0.5), Direction.UP, target, false);
        String[] results = new String[2];
        step(out, 40, mc -> {
            s.server("setblock " + target.getX() + " " + target.getY() + " " + target.getZ() + " minecraft:air");
            s.server("setblock " + side.getX() + " " + side.getY() + " " + side.getZ() + " minecraft:stone");
            s.server("tp @a " + (target.getX() + 0.5) + " " + a[1] + " " + (target.getZ() - 2.5) + " 0 -30");
            s.server("gamemode creative @a");
            s.server("clear @a");
            s.server("item replace entity @a hotbar.0 with minecraft:stone 16");
            s.server("item replace entity @a hotbar.1 with minecraft:oak_log 16");
            s.command("bauplaner platzierhilfe an");
            mc.player.getInventory().setSelectedSlot(0);
        });
        step(out, 10, mc -> results[0] = click(mc, "startUseItem", top));
        step(out, 1, mc -> {
            expectBlock(mc, target, "minecraft:air", "falscher Block wurde gesetzt (" + results[0] + ")");
            int slot = mc.player.getInventory().getSelectedSlot();
            if (slot != 1) throw new AssertionError("Platzierhilfe hat den Eichenstamm nicht in die Hand genommen, Platz " + slot);
        });
        step(out, 10, mc -> results[1] = click(mc, "startUseItem", onSide));
        step(out, 1, mc -> expectBlock(mc, target, "minecraft:air", "liegender Stamm wurde gesetzt (" + results[1] + ")"));
        step(out, 10, mc -> click(mc, "startUseItem", top));
        step(out, 1, mc -> expectBlock(mc, target, "minecraft:oak_log[axis=y]", "richtiger Stamm wurde nicht gesetzt"));
        step(out, 10, mc -> click(mc, "startAttack", onTarget));
        step(out, 3, mc -> {
            expectBlock(mc, target, "minecraft:oak_log[axis=y]", "geschützter Planblock wurde abgebaut");
            s.command("bauplaner platzierhilfe warnen");
        });
        step(out, 10, mc -> click(mc, "startAttack", onTarget));
        step(out, 3, mc -> {
            expectBlock(mc, target, "minecraft:air", "mit „nur warnen“ lässt sich der Block nicht abbauen");
            s.command("bauplaner platzierhilfe an");
            s.server("setblock " + target.getX() + " " + target.getY() + " " + target.getZ() + " minecraft:oak_log[axis=y]");
            s.server("setblock " + side.getX() + " " + side.getY() + " " + side.getZ() + " minecraft:air");
            Files.writeString(s.io().resolve("platzierhilfe.txt"), results[0] + " " + results[1] + "\n");
        });
    }

    /**
     * A mouse click at {@code hit}: the crosshair target is set and Minecraft's own click handler runs, the
     * same one the mouse button calls. Returns "Fail" if the click event was cancelled, else "Pass".
     */
    private static String click(Minecraft mc, String handler, BlockHitResult hit) throws ReflectiveOperationException {
        mc.hitResult = hit;
        Field miss = Minecraft.class.getDeclaredField("missTime");
        miss.setAccessible(true);
        miss.setInt(mc, 0);
        lastClickCancelled = null;
        Method m = Minecraft.class.getDeclaredMethod(handler);
        m.setAccessible(true);
        m.invoke(mc);
        if (lastClickCancelled == null) throw new AssertionError(handler + ": kein Klick-Ereignis ausgelöst");
        return lastClickCancelled ? "Fail" : "Pass";
    }

    private static void expectScreen(Minecraft mc, String expected, String message) {
        String screen = mc.gui.screen() == null ? "keiner" : mc.gui.screen().getClass().getSimpleName();
        if (!screen.equals(expected)) throw new AssertionError(message + ", offen: " + screen);
    }

    private static void expectBlock(Minecraft mc, BlockPos pos, String expected, String message) {
        String actual = BlockStateParser.serialize(mc.level.getBlockState(pos));
        if (!actual.equals(expected)) throw new AssertionError(message + ": " + actual + " bei " + pos.toShortString());
    }

    private static void step(List<ClientScenario.Step> out, int wait, ClientScenario.Action action) {
        out.add(new ClientScenario.Step(wait, action));
    }
}
