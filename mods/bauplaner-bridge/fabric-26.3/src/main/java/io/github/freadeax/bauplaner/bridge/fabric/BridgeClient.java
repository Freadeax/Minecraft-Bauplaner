package io.github.freadeax.bauplaner.bridge.fabric;

import static net.fabricmc.fabric.api.client.command.v2.ClientCommands.argument;
import static net.fabricmc.fabric.api.client.command.v2.ClientCommands.literal;

import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.context.CommandContext;
import io.github.freadeax.bauplaner.bridge.AnchorStore;
import io.github.freadeax.bauplaner.bridge.BridgeException;
import io.github.freadeax.bauplaner.bridge.Plan;
import io.github.freadeax.bauplaner.bridge.ScanJob;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.stream.Stream;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;

/**
 * Client entry point. Commands only read the world and write files below
 * {@code <game dir>/bauplaner/}: {@code plans/} (exported plans), {@code scans/} (recordings),
 * {@code state.properties} (plan and anchor per world/server).
 */
public final class BridgeClient implements ClientModInitializer {
    /** Cells per client tick; keeps the frame time low (about 0.4 s for 100 000 cells at 20 ticks/s with 12 000). */
    static final int CELLS_PER_TICK = 12_000;

    private final Path root = FabricLoader.getInstance().getGameDir().resolve("bauplaner");
    private Plan plan;
    private int[] anchor;
    private String anchorDimension;
    private ScanJob job;
    private String jobDimension;

    @Override
    public void onInitializeClient() {
        ClientCommandRegistrationCallback.EVENT.register((dispatcher, context) -> dispatcher.register(literal("bauplaner")
                .executes(c -> help(c.getSource()))
                .then(literal("plaene").executes(c -> listPlans(c.getSource())))
                .then(literal("plan").then(argument("datei", StringArgumentType.greedyString())
                        .suggests((c, b) -> { planFiles().forEach(b::suggest); return b.buildFuture(); })
                        .executes(c -> loadPlan(c.getSource(), StringArgumentType.getString(c, "datei")))))
                .then(literal("anker")
                        .then(literal("hier").executes(c -> setAnchor(c.getSource(), McCompat.targetBlock(c.getSource().getClient()))))
                        .then(argument("x", IntegerArgumentType.integer()).then(argument("y", IntegerArgumentType.integer()).then(argument("z", IntegerArgumentType.integer())
                                .executes(c -> setAnchor(c.getSource(), new BlockPos(IntegerArgumentType.getInteger(c, "x"), IntegerArgumentType.getInteger(c, "y"), IntegerArgumentType.getInteger(c, "z")))))))))
                .then(literal("scan").executes(c -> startScan(c.getSource())))
                .then(literal("abbrechen").executes(c -> cancel(c.getSource())))
                .then(literal("status").executes(c -> status(c.getSource())))));
        ClientTickEvents.END_CLIENT_TICK.register(this::tick);
    }

    private static void say(FabricClientCommandSource s, String text) { s.sendFeedback(Component.literal("[Bauplaner] " + text)); }
    private static int fail(FabricClientCommandSource s, String text) { s.sendError(Component.literal("[Bauplaner] " + text)); return 0; }

    private int help(FabricClientCommandSource s) {
        say(s, "1) Plan im Tab „Export“ der Website exportieren und nach " + root.resolve("plans") + " legen.");
        say(s, "2) /bauplaner plan <datei>  3) /bauplaner anker hier (angeschauter Block = Projektursprung 0/0/0)  4) /bauplaner scan");
        say(s, "Die Aufnahme landet in " + root.resolve("scans") + " und wird im Tab „Bauen“ importiert. Die Welt wird nie verändert.");
        return 1;
    }

    private Stream<String> planFiles() {
        try (var files = Files.list(root.resolve("plans"))) {
            return files.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(".schem")).sorted().toList().stream();
        } catch (IOException e) {
            return Stream.empty();
        }
    }

    private int listPlans(FabricClientCommandSource s) {
        try { Files.createDirectories(root.resolve("plans")); } catch (IOException e) { return fail(s, "Ordner nicht anlegbar: " + e.getMessage()); }
        var names = planFiles().toList();
        if (names.isEmpty()) return fail(s, "Keine Pläne in " + root.resolve("plans") + ".");
        names.forEach(n -> say(s, n));
        return names.size();
    }

    private int loadPlan(FabricClientCommandSource s, String name) {
        Path file = root.resolve("plans").resolve(name).normalize();
        if (!file.startsWith(root.resolve("plans"))) return fail(s, "Ungültiger Dateiname.");
        try {
            plan = Plan.read(file);
        } catch (IOException | BridgeException e) {
            return fail(s, "Plan nicht lesbar: " + e.getMessage());
        }
        say(s, "Plan geladen: " + plan.name() + " · " + plan.width() + "×" + plan.height() + "×" + plan.length() + " (" + plan.volume() + " Zellen).");
        if (plan.dataVersion() != McCompat.dataVersion()) say(s, "Hinweis: Plan für DataVersion " + plan.dataVersion() + ", Spiel " + McCompat.dataVersion() + ".");
        restoreAnchor(s);
        return 1;
    }

    private void restoreAnchor(FabricClientCommandSource s) {
        try {
            new AnchorStore(root.resolve("state.properties")).get(McCompat.worldKey(s.getClient()))
                    .filter(e -> e.planFile().equals(plan.fileName()))
                    .ifPresent(e -> { anchor = e.anchor(); anchorDimension = e.dimension(); say(s, "Gespeicherter Anker: " + anchor[0] + " " + anchor[1] + " " + anchor[2] + " (" + anchorDimension + ")."); });
        } catch (IOException e) {
            say(s, "Gespeicherter Anker nicht lesbar: " + e.getMessage());
        }
    }

    private int setAnchor(FabricClientCommandSource s, BlockPos pos) {
        if (plan == null) return fail(s, "Zuerst /bauplaner plan <datei>.");
        anchor = new int[] { pos.getX(), pos.getY(), pos.getZ() };
        anchorDimension = McCompat.dimension(s.getClient().level);
        int[] m = plan.projectMin();
        say(s, "Projektursprung 0/0/0 = " + pos.getX() + " " + pos.getY() + " " + pos.getZ() + ". Planbox von "
                + (pos.getX() + m[0]) + " " + (pos.getY() + m[1]) + " " + (pos.getZ() + m[2]) + " bis "
                + (pos.getX() + m[0] + plan.width() - 1) + " " + (pos.getY() + m[1] + plan.height() - 1) + " " + (pos.getZ() + m[2] + plan.length() - 1) + ".");
        try {
            new AnchorStore(root.resolve("state.properties")).put(McCompat.worldKey(s.getClient()), new AnchorStore.Entry(plan.fileName(), anchorDimension, anchor));
        } catch (IOException e) {
            say(s, "Anker nicht gespeichert: " + e.getMessage());
        }
        return 1;
    }

    private int startScan(FabricClientCommandSource s) {
        if (plan == null) return fail(s, "Zuerst /bauplaner plan <datei>.");
        if (anchor == null) return fail(s, "Zuerst /bauplaner anker hier.");
        if (job != null) return fail(s, "Es läuft bereits eine Aufnahme.");
        var level = s.getClient().level;
        String dim = McCompat.dimension(level);
        if (!dim.equals(anchorDimension)) return fail(s, "Der Anker liegt in " + anchorDimension + ", du bist in " + dim + ".");
        String version = FabricLoader.getInstance().getModContainer("bauplaner_bridge").map(c -> c.getMetadata().getVersion().getFriendlyString()).orElse("?");
        job = new ScanJob(plan, anchor, McCompat.clientBlocks(level), McCompat.dataVersion(), new ScanJob.Info(McCompat.gameVersion(), version, "fabric", dim, "client"));
        jobDimension = dim;
        say(s, "Aufnahme gestartet: " + plan.volume() + " Zellen. Bitte in der Nähe bleiben; nur geladene Chunks werden gelesen.");
        return 1;
    }

    private int cancel(FabricClientCommandSource s) {
        if (job == null) return fail(s, "Keine Aufnahme aktiv.");
        job = null;
        say(s, "Aufnahme abgebrochen, keine Datei geschrieben.");
        return 1;
    }

    private int status(FabricClientCommandSource s) {
        say(s, plan == null ? "Kein Plan geladen." : "Plan: " + plan.fileName() + " (Revision " + plan.revisionNumber() + ")");
        say(s, anchor == null ? "Kein Anker." : "Anker: " + anchor[0] + " " + anchor[1] + " " + anchor[2] + " (" + anchorDimension + ")");
        if (job != null) say(s, "Aufnahme: " + job.done() + " / " + job.total() + " Zellen");
        return 1;
    }

    private void tick(Minecraft mc) {
        if (job == null) return;
        if (mc.level == null || mc.player == null || !McCompat.dimension(mc.level).equals(jobDimension)) {
            job = null;
            if (mc.player != null) mc.player.displayClientMessage(Component.literal("[Bauplaner] Aufnahme abgebrochen: Welt oder Dimension gewechselt."), false);
            return;
        }
        try {
            boolean done = job.step(CELLS_PER_TICK);
            mc.player.displayClientMessage(Component.literal("Bauplaner-Aufnahme " + (job.done() * 100 / job.total()) + " %"), true);
            if (!done) return;
            Instant now = Instant.now();
            Path out = root.resolve("scans").resolve(ScanJob.fileName(plan, now));
            Files.createDirectories(out.getParent());
            Path tmp = out.resolveSibling(out.getFileName() + ".tmp");
            Files.write(tmp, job.toFile(now));
            Files.move(tmp, out, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
            String unloaded = job.unloaded() > 0 ? " " + job.unloaded() + " Zellen lagen in nicht geladenen Chunks (gelten als „nicht aufgenommen“)." : "";
            mc.player.displayClientMessage(Component.literal("[Bauplaner] Aufnahme gespeichert: " + out + "." + unloaded + " Jetzt im Tab „Bauen“ importieren."), false);
            job = null;
        } catch (IOException | RuntimeException e) {
            job = null;
            mc.player.displayClientMessage(Component.literal("[Bauplaner] Aufnahme fehlgeschlagen: " + e.getMessage()), false);
        }
    }
}
