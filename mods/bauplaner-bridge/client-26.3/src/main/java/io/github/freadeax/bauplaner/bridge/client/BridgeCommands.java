package io.github.freadeax.bauplaner.bridge.client;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import io.github.freadeax.bauplaner.bridge.session.BridgeSession;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;

/**
 * The {@code /bauplaner} client command tree on vanilla Brigadier types, shared by the NeoForge and
 * Forge adapters (both register client commands on a {@code CommandDispatcher<CommandSourceStack>}).
 * Every command only calls {@link BridgeSession}; feedback goes through the session's host.
 */
public final class BridgeCommands {
    private BridgeCommands() {}

    public static void register(CommandDispatcher<CommandSourceStack> dispatcher, BridgeSession session) {
        dispatcher.register(builder(session));
    }

    /** The tree without registering it: NeoForge adds the client mod's commands and registers it in German and English (0.23.0). */
    public static com.mojang.brigadier.builder.LiteralArgumentBuilder<CommandSourceStack> builder(BridgeSession session) {
        var plan = Commands.literal("plan").then(Commands.argument("datei", StringArgumentType.greedyString())
                .suggests((c, b) -> { session.planNames().forEach(b::suggest); return b.buildFuture(); })
                .executes(c -> session.loadPlan(StringArgumentType.getString(c, "datei"))));
        var xyz = Commands.argument("x", IntegerArgumentType.integer())
                .then(Commands.argument("y", IntegerArgumentType.integer())
                        .then(Commands.argument("z", IntegerArgumentType.integer())
                                .executes(c -> session.setAnchor(IntegerArgumentType.getInteger(c, "x"),
                                        IntegerArgumentType.getInteger(c, "y"), IntegerArgumentType.getInteger(c, "z"), null))));
        var anchor = Commands.literal("anker")
                .then(Commands.literal("hier").executes(c -> session.setAnchorHere()))
                .then(xyz);
        return Commands.literal("bauplaner")
                .executes(c -> session.help())
                .then(Commands.literal("plaene").executes(c -> session.listPlans()))
                .then(plan)
                .then(anchor)
                .then(Commands.literal("scan").executes(c -> session.startScan()))
                .then(Commands.literal("abbrechen").executes(c -> session.cancel()))
                .then(Commands.literal("status").executes(c -> session.status()));
    }
}
