package io.github.freadeax.bauplaner.bridge.hologram;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import java.nio.file.Path;
import java.util.List;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;

/**
 * The client mod without its loader: hologram, live check, HUD, keys, menu, material list, placement
 * helper and the website link with its Weltplan marks, built only on vanilla Minecraft 26.3 classes. Fabric and NeoForge each wire these methods to
 * their own events (ticks, rendering, HUD, keys, client commands, block clicks) and nothing else, so
 * both loaders behave the same.
 */
public final class HologramClient {
    private final Hologram hologram;
    private final HologramRenderer renderer;
    private final PlacementAssist assist;
    private final HologramKeys keys;
    private final HologramHud hud;
    private final LiveLink link;
    private final MarksRenderer marks;
    private final TeamClient team;

    /** @param loader "fabric" or "neoforge" (reported to the website); @param version mod version */
    public HologramClient(Path root, String loader, String version) {
        hologram = new Hologram(root);
        HologramDiagnose.init(loader, version);
        HologramDiagnose.errors(this::errors);
        link = new LiveLink(root, hologram, loader, version, McCompat.gameVersion());
        marks = new MarksRenderer(link);
        link.loadMarks();
        renderer = new HologramRenderer(hologram);
        assist = new PlacementAssist(hologram);
        keys = new HologramKeys(hologram, assist);
        hud = new HologramHud(hologram, assist);
        team = new TeamClient(root, hologram, version);
        link.team(team);
    }

    /** Teambau (COOP-03): team state, channel to the server plugin, section frames, {@code /bauplaner team}. */
    public TeamClient team() { return team; }

    public Hologram hologram() { return hologram; }

    /** Website link over 127.0.0.1 (MAP-03). */
    public LiveLink link() { return link; }

    /** Game window is up: resume the website link if it was switched on before the restart. */
    public void started(Minecraft mc) { link.resume(mc); }

    /** Game is closing: stop the website link. */
    public void stopping() { link.close(); }

    /** Keys to register with the loader (all in the "Bauplaner" category, {@link HologramKeys#CATEGORY}). */
    public List<KeyMapping> keys() { return keys.all(); }

    /** {@code zeigen}, {@code fortschritt}, … to hang below the loader's {@code /bauplaner} node. */
    public <S> List<LiteralArgumentBuilder<S>> commands() {
        List<LiteralArgumentBuilder<S>> list = new java.util.ArrayList<>(HologramCommands.build(hologram, link));
        list.add(team.command());
        return list;
    }

    /** End of every client tick. */
    public void tick(Minecraft mc) {
        guarded("tick", () -> { keys.tick(mc); hologram.tick(mc); assist.tick(mc); marks.tick(mc); team.tick(mc); });
    }

    /** Level render pass: ghost blocks, frames, finder beam. */
    public void render(PoseStack pose, SubmitNodeCollector out, Vec3 camera) {
        guarded("render", () -> { renderer.submit(pose, out, camera); marks.submit(pose, out, camera); team.render(pose, out, camera); });
    }

    /** HUD layer: progress panel and the crosshair line of the placement helper. */
    public void hud(GuiGraphicsExtractor g, DeltaTracker delta) {
        guarded("hud", () -> { hud.extract(g, delta); marks.hud(g, delta); team.hud(g); });
    }

    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger("bauplaner");
    private final java.util.Set<String> reported = new java.util.HashSet<>();
    private int errors;

    /**
     * Crash guard for the test phase: a bug in the mod must not end the game. The error goes to the log
     * once per kind ("[Fehler]" with stack, read by /bauplaner diagnose) and one chat hint; the same error
     * every frame is only counted.
     */
    private void guarded(String where, Runnable work) {
        try {
            work.run();
        } catch (RuntimeException | LinkageError e) {
            errors++;
            StackTraceElement top = e.getStackTrace().length > 0 ? e.getStackTrace()[0] : null;
            String kind = where + ":" + e.getClass().getName() + "@" + top;
            if (reported.size() < 50 && reported.add(kind)) {
                LOG.error("[Fehler] {} ({}): {}", where, errors, e.toString(), e);
                if (reported.size() == 1) McCompat.chat(Minecraft.getInstance(), Component.literal(
                        "[Bauplaner] Interner Fehler (" + e.getClass().getSimpleName() + "), das Spiel läuft weiter. Bitte /bauplaner diagnose ausführen und die Datei schicken.")
                        .withStyle(net.minecraft.ChatFormatting.GOLD));
            }
        }
    }

    /** Errors caught by the crash guard since start (for the diagnose report). */
    public int errors() { return errors; }

    /** Joined a world or server: restore its saved placement. */
    public void join(Minecraft mc) { join(mc, null); }

    /**
     * Joined a world or server. {@code teamChannel}: the loader's way to the team channel of the server
     * plugin (null in singleplayer or when the loader cannot offer it); nothing is sent before the player allows it.
     */
    public void join(Minecraft mc, io.github.freadeax.bauplaner.mod.team.TeamSync.Transport teamChannel) {
        String msg = hologram.join(mc);
        if (msg != null) McCompat.chat(mc, Component.literal("[Bauplaner] " + msg));
        guarded("team", () -> team.join(mc, mc.isLocalServer() ? null : teamChannel));
    }

    public void leave() { hologram.leave(); guarded("team", team::leave); }

    /** A frame on the team channel from the server plugin (any thread). */
    public void teamFrame(byte[] frame) { guarded("teamkanal", () -> team.receive(frame)); }

    public void chunkUnloaded(int cx, int cz) { hologram.chunkUnloaded(cx, cz); }

    /**
     * Right click on a block, before anything is sent. {@link InteractionResult#FAIL} means: drop the click
     * (nothing placed, nothing sent); {@link InteractionResult#PASS}: carry on normally.
     */
    public InteractionResult use(Player player, Level level, InteractionHand hand, BlockHitResult hit) {
        InteractionResult[] r = { InteractionResult.PASS };
        guarded("rechtsklick", () -> r[0] = assist.onUse(player, level, hand, hit));
        return r[0];
    }

    /** Left click on a block, before anything is sent; FAIL keeps a correct plan block from being broken. */
    public InteractionResult attack(Player player, Level level, BlockPos pos) {
        InteractionResult[] r = { InteractionResult.PASS };
        guarded("linksklick", () -> r[0] = assist.onAttack(player, level, pos));
        return r[0];
    }
}
