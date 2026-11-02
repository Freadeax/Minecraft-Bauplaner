package io.github.freadeax.bauplaner.bridge.fabric;

import static net.fabricmc.fabric.api.client.command.v2.ClientCommands.argument;
import static net.fabricmc.fabric.api.client.command.v2.ClientCommands.literal;

import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import java.nio.file.Path;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;

/**
 * {@code /bauplaner zeigen|hierher|verschieben|drehen|spiegeln|umschalten|fehler|entfernen|fortschritt|ebene|material|texturen}: the same actions as menu and keys, as client commands (no server needed;
 * also used by the game test).
 */
final class HologramCommands {
    private HologramCommands() {}

    static java.util.List<LiteralArgumentBuilder<FabricClientCommandSource>> build(Hologram h) {
        var file = argument("datei", StringArgumentType.greedyString())
                .suggests((c, b) -> { h.planFiles().forEach(b::suggest); return b.buildFuture(); })
                .executes(c -> place(c.getSource(), h, StringArgumentType.getString(c, "datei")));
        var xyz = argument("x", IntegerArgumentType.integer()).then(argument("y", IntegerArgumentType.integer()).then(argument("z", IntegerArgumentType.integer())
                .executes(c -> need(c.getSource(), h, () -> h.move(IntegerArgumentType.getInteger(c, "x"), IntegerArgumentType.getInteger(c, "y"), IntegerArgumentType.getInteger(c, "z"))))));
        var at = argument("x", IntegerArgumentType.integer()).then(argument("y", IntegerArgumentType.integer()).then(argument("z", IntegerArgumentType.integer())
                .executes(c -> need(c.getSource(), h, () -> h.moveTo(new BlockPos(IntegerArgumentType.getInteger(c, "x"), IntegerArgumentType.getInteger(c, "y"), IntegerArgumentType.getInteger(c, "z")))))));
        return java.util.List.of(
                literal("zeigen").executes(c -> progress(c.getSource(), h)).then(file),
                literal("fortschritt").executes(c -> progress(c.getSource(), h)),
                literal("hierher").executes(c -> need(c.getSource(), h, () -> h.moveTo(McCompat.targetBlock(c.getSource().getClient())))).then(at),
                literal("verschieben").then(xyz),
                literal("drehen").executes(c -> need(c.getSource(), h, () -> h.turn(1)))
                        .then(argument("viertel", IntegerArgumentType.integer(-3, 3)).executes(c -> need(c.getSource(), h, () -> h.turn(IntegerArgumentType.getInteger(c, "viertel"))))),
                literal("spiegeln").executes(c -> need(c.getSource(), h, h::mirror)),
                literal("umschalten").executes(c -> need(c.getSource(), h, h::toggleVisible)),
                literal("fehler").executes(c -> finder(c.getSource(), h)),
                literal("entfernen").executes(c -> need(c.getSource(), h, h::remove)),
                literal("ebene").executes(c -> layer(c.getSource(), h))
                        .then(literal("alle").executes(c -> need(c.getSource(), h, () -> h.setLayers(Hologram.Layers.ALL, h.layerY()))))
                        .then(literal("bis").then(argument("y", IntegerArgumentType.integer()).executes(c -> need(c.getSource(), h, () -> h.setLayers(Hologram.Layers.BELOW, IntegerArgumentType.getInteger(c, "y"))))))
                        .then(argument("y", IntegerArgumentType.integer()).executes(c -> need(c.getSource(), h, () -> h.setLayers(Hologram.Layers.ONE, IntegerArgumentType.getInteger(c, "y"))))),
                literal("material").executes(c -> materials(c.getSource(), h)),
                literal("texturen").executes(c -> need(c.getSource(), h, h::toggleTextured)));
    }

    private static int layer(FabricClientCommandSource s, Hologram h) {
        if (!h.active()) return fail(s, "Kein Plan platziert.");
        say(s, switch (h.layers()) { case ALL -> "Alle Ebenen sichtbar."; case ONE -> "Nur Ebene " + h.layerY() + "."; case BELOW -> "Bis Ebene " + h.layerY() + "."; });
        return 1;
    }

    /** Open blocks per type (same list as the material screen), in the chat; also used by the game test. */
    private static int materials(FabricClientCommandSource s, Hologram h) {
        if (!h.active()) return fail(s, "Kein Plan platziert.");
        var lines = io.github.freadeax.bauplaner.mod.Materials.of(h.check(), h.minY(), h.maxY());
        int open = lines.stream().mapToInt(io.github.freadeax.bauplaner.mod.Materials.Line::open).sum();
        say(s, "Material offen: " + open + " Blöcke in " + lines.stream().filter(l -> l.open() > 0).count() + " Sorten.");
        lines.stream().filter(l -> l.open() > 0).limit(10).forEach(l -> say(s, "  " + l.open() + " × " + l.id() + " (von " + l.total() + ")"));
        return open;
    }

    private static int place(FabricClientCommandSource s, Hologram h, String name) {
        Path file = h.plansDir().resolve(name).normalize();
        if (!file.startsWith(h.plansDir())) return fail(s, "Ungültiger Dateiname.");
        try {
            say(s, h.place(s.getClient(), name, McCompat.targetBlock(s.getClient())));
            return 1;
        } catch (Exception e) {
            return fail(s, "Plan nicht lesbar: " + e.getMessage());
        }
    }

    private static int need(FabricClientCommandSource s, Hologram h, Runnable r) {
        if (!h.active()) return fail(s, "Kein Plan platziert. /bauplaner zeigen <datei> oder Taste J.");
        r.run();
        if (h.active()) {
            var p = h.check().placement();
            say(s, "Ursprung " + p.x() + " " + p.y() + " " + p.z() + " · " + p.turns() * 90 + "°" + (p.mirror() ? " · gespiegelt" : "") + (h.visible() ? "" : " · ausgeblendet")
                    + (h.layers() == Hologram.Layers.ALL ? "" : h.layers() == Hologram.Layers.ONE ? " · Ebene " + h.layerY() : " · bis Ebene " + h.layerY())
                    + (h.textured() ? "" : " · ohne Texturen"));
        } else {
            say(s, "Plan entfernt.");
        }
        return 1;
    }

    private static int progress(FabricClientCommandSource s, Hologram h) {
        if (!h.active()) return fail(s, "Kein Plan platziert. /bauplaner zeigen <datei> oder Taste J.");
        var c = h.check();
        say(s, h.plan().name() + ": " + c.percent() + " % · richtig " + c.count(Verdict.OK) + " · fehlt " + c.count(Verdict.MISSING) + " · falsch "
                + c.count(Verdict.WRONG) + " · Zustand " + c.count(Verdict.STATE) + " · nicht geladen " + c.count(Verdict.UNKNOWN));
        return c.percent();
    }

    private static int finder(FabricClientCommandSource s, Hologram h) {
        if (!h.active()) return fail(s, "Kein Plan platziert.");
        var p = s.getClient().player;
        int i = h.findNext(p.getX(), p.getY(), p.getZ());
        if (i < 0) { say(s, "Keine Fehler in geladenen Chunks."); return 0; }
        var c = h.check();
        say(s, "Nächster Fehler bei " + c.worldX(i) + " " + c.worldY(i) + " " + c.worldZ(i) + ": erwartet " + c.expected(i) + ", gefunden " + c.found(i) + ".");
        return 1;
    }

    private static void say(FabricClientCommandSource s, String text) { s.sendFeedback(Component.literal("[Bauplaner] " + text)); }
    private static int fail(FabricClientCommandSource s, String text) { s.sendError(Component.literal("[Bauplaner] " + text)); return 0; }
}
