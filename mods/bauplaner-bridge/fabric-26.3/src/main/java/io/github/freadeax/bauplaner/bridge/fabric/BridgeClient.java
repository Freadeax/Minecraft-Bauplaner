package io.github.freadeax.bauplaner.bridge.fabric;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import static net.fabricmc.fabric.api.client.command.v2.ClientCommands.argument;
import static net.fabricmc.fabric.api.client.command.v2.ClientCommands.literal;

import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
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
import io.github.freadeax.bauplaner.bridge.hologram.HologramClient;
import io.github.freadeax.bauplaner.bridge.hologram.McCompat;

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
    /** Hologram, live check, HUD, keys, menu, material list, placement helper: shared with NeoForge (hologram-26.3). */
    private final HologramClient client = new HologramClient(root, "fabric",
            FabricLoader.getInstance().getModContainer("bauplaner_bridge").map(c -> c.getMetadata().getVersion().getFriendlyString()).orElse("?"));

    @Override
    public void onInitializeClient() {
        ClientCommandRegistrationCallback.EVENT.register((dispatcher, context) -> {
            var planCmd = literal("plan").then(argument("datei", StringArgumentType.greedyString())
                    .suggests((c, b) -> { planFiles().forEach(b::suggest); return b.buildFuture(); })
                    .executes(c -> loadPlan(c.getSource(), StringArgumentType.getString(c, "datei"))));
            var xyz = argument("x", IntegerArgumentType.integer())
                    .then(argument("y", IntegerArgumentType.integer())
                            .then(argument("z", IntegerArgumentType.integer())
                                    .executes(c -> setAnchor(c.getSource(), new BlockPos(IntegerArgumentType.getInteger(c, "x"),
                                            IntegerArgumentType.getInteger(c, "y"), IntegerArgumentType.getInteger(c, "z"))))));
            var anchorCmd = literal("anker")
                    .then(literal("hier").executes(c -> setAnchor(c.getSource(), McCompat.targetBlock(c.getSource().getClient()))))
                    .then(xyz);
            var cmd = literal("bauplaner");
            client.<FabricClientCommandSource>commands().forEach(cmd::then);
            // GAME-12 (0.23.0): /bauplaner in German and /buildplanner in English, tab completion in the mod's language.
            io.github.freadeax.bauplaner.bridge.hologram.CommandLang.register(dispatcher, cmd
                    .executes(c -> client.help())
                    .then(literal("plaene").executes(c -> listPlans(c.getSource())))
                    .then(planCmd)
                    .then(anchorCmd)
                    .then(literal("scan").executes(c -> startScan(c.getSource())))
                    .then(literal("abbrechen").executes(c -> cancel(c.getSource())))
                    .then(literal("status").executes(c -> status(c.getSource()))));
        });
        ClientTickEvents.END_CLIENT_TICK.register(this::tick);
        client.keys().forEach(net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper::registerKeyMapping);
        ClientTickEvents.END_CLIENT_TICK.register(client::tick);
        // GAME-10: server answers to commands sent from the command page (system lines, not the action bar).
        net.fabricmc.fabric.api.client.message.v1.ClientReceiveMessageEvents.GAME.register((message, overlay) -> { if (!overlay) McCompat.serverLine(message); });
        // Website link (MAP-03): off until /bauplaner verbinden; resumes after a restart once switched on.
        net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientLifecycleEvents.CLIENT_STARTED.register(client::started);
        net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientLifecycleEvents.CLIENT_STOPPING.register(mc -> client.stopping());
        // Placement helper: decides on the client before anything is sent; FAIL means the click is dropped.
        // Own phase before the default one: a click the helper drops is never seen by other mods, e.g. Tool
        // Switcher would otherwise swap to a pickaxe for a protected block that is not going to break.
        var early = net.minecraft.resources.Identifier.fromNamespaceAndPath("bauplaner_bridge", "platzierhilfe");
        var use = net.fabricmc.fabric.api.event.player.UseBlockCallback.EVENT;
        use.addPhaseOrdering(early, net.fabricmc.fabric.api.event.Event.DEFAULT_PHASE);
        use.register(early, client::use);
        var attack = net.fabricmc.fabric.api.event.player.AttackBlockCallback.EVENT;
        attack.addPhaseOrdering(early, net.fabricmc.fabric.api.event.Event.DEFAULT_PHASE);
        attack.register(early, (player, level, hand, pos, dir) -> client.attack(player, level, pos));
        net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientChunkEvents.CHUNK_UNLOAD.register((level, chunk) -> client.chunkUnloaded(chunk.getPos().x(), chunk.getPos().z()));
        // Teambau (COOP-03): payload type for the team channel of the Paper plugin. Registering the type sends nothing;
        // the receiver (and with it the channel announcement) comes only after /bauplaner team erlauben.
        net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry.serverboundPlay().register(io.github.freadeax.bauplaner.bridge.hologram.TeamPayload.TYPE, io.github.freadeax.bauplaner.bridge.hologram.TeamPayload.CODEC);
        net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry.clientboundPlay().register(io.github.freadeax.bauplaner.bridge.hologram.TeamPayload.TYPE, io.github.freadeax.bauplaner.bridge.hologram.TeamPayload.CODEC);
        net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents.JOIN.register((handler, sender, mc) -> mc.execute(() -> client.join(mc, teamChannel)));
        net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents.DISCONNECT.register((handler, mc) -> mc.execute(client::leave));
        net.fabricmc.fabric.api.client.rendering.v1.level.LevelRenderEvents.COLLECT_SUBMITS.register(ctx ->
                client.render(ctx.poseStack(), ctx.submitNodeCollector(), ctx.levelState().cameraRenderState.pos));
        net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry.addLast(
                net.minecraft.resources.Identifier.fromNamespaceAndPath("bauplaner_bridge", "fortschritt"), client::hud);
    }

    /** The team channel on Fabric: announced by the server → canSend; receiver registered after the player's OK. */
    private final io.github.freadeax.bauplaner.mod.team.TeamSync.Transport teamChannel = new io.github.freadeax.bauplaner.mod.team.TeamSync.Transport() {
        @Override public boolean serverHasChannel() {
            try { return net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking.canSend(io.github.freadeax.bauplaner.bridge.hologram.TeamPayload.TYPE); }
            catch (IllegalStateException e) { return false; }
        }
        @Override public void open() {
            net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking.registerReceiver(io.github.freadeax.bauplaner.bridge.hologram.TeamPayload.TYPE,
                    (payload, context) -> client.teamFrame(payload.data()));
        }
        @Override public void send(byte[] frame) {
            net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking.send(new io.github.freadeax.bauplaner.bridge.hologram.TeamPayload(frame));
        }
    };

    private static void say(FabricClientCommandSource s, String text) { s.sendFeedback(Component.literal("[Build Studio] " + text)); }
    private static int fail(FabricClientCommandSource s, String text) { s.sendError(Component.literal("[Build Studio] " + text)); return 0; }

    private Stream<String> planFiles() {
        try (var files = Files.list(root.resolve("plans"))) {
            return files.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(".schem")).sorted().toList().stream();
        } catch (IOException e) {
            return Stream.empty();
        }
    }

    private int listPlans(FabricClientCommandSource s) {
        try { Files.createDirectories(root.resolve("plans")); } catch (IOException e) { return fail(s, t("Ordner nicht anlegbar: ", "Cannot create folder: ") + e.getMessage()); }
        var names = planFiles().toList();
        if (names.isEmpty()) return fail(s, t("Keine Pläne in ", "No plans in ") + root.resolve("plans") + ".");
        names.forEach(n -> say(s, n));
        return names.size();
    }

    private int loadPlan(FabricClientCommandSource s, String name) {
        Path file = root.resolve("plans").resolve(name).normalize();
        if (!file.startsWith(root.resolve("plans"))) return fail(s, t("Ungültiger Dateiname.", "Invalid file name."));
        try {
            plan = Plan.read(file);
        } catch (IOException | BridgeException e) {
            return fail(s, t("Plan nicht lesbar: ", "Plan not readable: ") + io.github.freadeax.bauplaner.bridge.BridgeException.text(e, io.github.freadeax.bauplaner.mod.Lang.en()));
        }
        say(s, t("Plan geladen: ", "Plan loaded: ") + plan.name() + " · " + plan.width() + "×" + plan.height() + "×" + plan.length() + " (" + plan.volume() + t(" Zellen).", " cells)."));
        if (plan.dataVersion() != McCompat.dataVersion()) say(s, t("Hinweis: Plan für DataVersion ", "Note: plan for DataVersion ") + plan.dataVersion() + t(", Spiel ", ", game ") + McCompat.dataVersion() + ".");
        restoreAnchor(s);
        return 1;
    }

    private void restoreAnchor(FabricClientCommandSource s) {
        try {
            new AnchorStore(root.resolve("state.properties")).get(McCompat.worldKey(s.getClient()))
                    .filter(e -> e.planFile().equals(plan.fileName()))
                    .ifPresent(e -> { anchor = e.anchor(); anchorDimension = e.dimension(); say(s, t("Gespeicherter Anker: ", "Saved anchor: ") + anchor[0] + " " + anchor[1] + " " + anchor[2] + " (" + anchorDimension + ")."); });
        } catch (IOException e) {
            say(s, t("Gespeicherter Anker nicht lesbar: ", "Saved anchor not readable: ") + e.getMessage());
        }
    }

    private int setAnchor(FabricClientCommandSource s, BlockPos pos) {
        if (plan == null) return fail(s, t("Zuerst /bauplaner plan <datei>.", "First /buildplanner plan <file>."));
        anchor = new int[] { pos.getX(), pos.getY(), pos.getZ() };
        anchorDimension = McCompat.dimension(s.getClient().level);
        int[] m = plan.projectMin();
        say(s, t("Projektursprung 0/0/0 = ", "Project origin 0/0/0 = ") + pos.getX() + " " + pos.getY() + " " + pos.getZ() + t(". Planbox von ", ". Plan box from ")
                + (pos.getX() + m[0]) + " " + (pos.getY() + m[1]) + " " + (pos.getZ() + m[2]) + t(" bis ", " to ")
                + (pos.getX() + m[0] + plan.width() - 1) + " " + (pos.getY() + m[1] + plan.height() - 1) + " " + (pos.getZ() + m[2] + plan.length() - 1) + ".");
        try {
            new AnchorStore(root.resolve("state.properties")).put(McCompat.worldKey(s.getClient()), new AnchorStore.Entry(plan.fileName(), anchorDimension, anchor));
        } catch (IOException e) {
            say(s, t("Anker nicht gespeichert: ", "Anchor not saved: ") + e.getMessage());
        }
        return 1;
    }

    private int startScan(FabricClientCommandSource s) {
        if (plan == null) return fail(s, t("Zuerst /bauplaner plan <datei>.", "First /buildplanner plan <file>."));
        if (anchor == null) return fail(s, t("Zuerst /bauplaner anker hier.", "First /buildplanner anchor here."));
        if (job != null) return fail(s, t("Es läuft bereits eine Aufnahme.", "A scan is already running."));
        var level = s.getClient().level;
        String dim = McCompat.dimension(level);
        if (!dim.equals(anchorDimension)) return fail(s, t("Der Anker liegt in ", "The anchor is in ") + anchorDimension + t(", du bist in ", ", you are in ") + dim + ".");
        String version = FabricLoader.getInstance().getModContainer("bauplaner_bridge").map(c -> c.getMetadata().getVersion().getFriendlyString()).orElse("?");
        job = new ScanJob(plan, anchor, McCompat.clientBlocks(level), McCompat.dataVersion(), new ScanJob.Info(McCompat.gameVersion(), version, "fabric", dim, "client"));
        jobDimension = dim;
        say(s, t("Aufnahme gestartet: " + plan.volume() + " Zellen. Bitte in der Nähe bleiben; nur geladene Chunks werden gelesen.", "Scan started: " + plan.volume() + " cells. Please stay nearby; only loaded chunks are read."));
        return 1;
    }

    private int cancel(FabricClientCommandSource s) {
        if (job == null) return fail(s, t("Keine Aufnahme aktiv.", "No scan running."));
        job = null;
        say(s, t("Aufnahme abgebrochen, keine Datei geschrieben.", "Scan cancelled, no file written."));
        return 1;
    }

    private int status(FabricClientCommandSource s) {
        say(s, plan == null ? t("Kein Plan geladen.", "No plan loaded.") : "Plan: " + plan.fileName() + " (Revision " + plan.revisionNumber() + ")");
        say(s, anchor == null ? t("Kein Anker.", "No anchor.") : t("Anker: ", "Anchor: ") + anchor[0] + " " + anchor[1] + " " + anchor[2] + " (" + anchorDimension + ")");
        if (job != null) say(s, t("Aufnahme: ", "Scan: ") + job.done() + " / " + job.total() + t(" Zellen", " cells"));
        return 1;
    }

    private void tick(Minecraft mc) {
        if (job == null) return;
        if (mc.level == null || mc.player == null || !McCompat.dimension(mc.level).equals(jobDimension)) {
            job = null;
            if (mc.player != null) McCompat.chat(mc, Component.literal("[Build Studio] " + t("Aufnahme abgebrochen: Welt oder Dimension gewechselt.", "Scan cancelled: world or dimension changed.")));
            return;
        }
        try {
            boolean done = job.step(CELLS_PER_TICK);
            McCompat.overlay(mc, Component.literal(t("Build-Studio-Aufnahme ", "Build Studio scan ") + (job.done() * 100 / job.total()) + " %"));
            if (!done) return;
            Instant now = Instant.now();
            Path out = root.resolve("scans").resolve(ScanJob.fileName(plan, now));
            Files.createDirectories(out.getParent());
            Path tmp = out.resolveSibling(out.getFileName() + ".tmp");
            Files.write(tmp, job.toFile(now));
            Files.move(tmp, out, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
            String unloaded = job.unloaded() > 0 ? " " + job.unloaded() + t(" Zellen lagen in nicht geladenen Chunks (gelten als „nicht aufgenommen“).", " cells were in unloaded chunks (count as “not scanned”).") : "";
            McCompat.chat(mc, Component.literal("[Build Studio] " + t("Aufnahme gespeichert: ", "Scan saved: ") + out + "." + unloaded + t(" Jetzt im Tab „Bauen“ importieren.", " Now import it in the “Build” tab.")));
            job = null;
        } catch (IOException | RuntimeException e) {
            job = null;
            McCompat.chat(mc, Component.literal("[Build Studio] " + t("Aufnahme fehlgeschlagen: ", "Scan failed: ") + e.getMessage()));
        }
    }
}
