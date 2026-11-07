package io.github.freadeax.bauplaner.bridge.hologram;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import java.nio.file.Path;
import io.github.freadeax.bauplaner.mod.Lang;
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
    /** EDIT-04: symmetry and curves while building by hand (ghosts only). */
    private final GuideClient guides;
    /** TERRAIN-04: remembered surface of the chunks the player has seen, for the website's Gelände tab. */
    private final TerrainRecorder terrain;

    /** @param loader "fabric" or "neoforge" (reported to the website); @param version mod version */
    public HologramClient(Path root, String loader, String version) {
        ClientSettings.load(root);
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
        guides = new GuideClient(hologram);
        keys.guides(guides);
        link.team(team);
        terrain = new TerrainRecorder(root);
        link.terrain(terrain);
        current = this;
    }

    private static HologramClient current;

    /** The one client of this game (for screens opened from keys). */
    static HologramClient current() { return current; }

    /** Teambau (COOP-03): team state, channel to the server plugin, section frames, {@code /bauplaner team}. */
    public TeamClient team() { return team; }

    public Hologram hologram() { return hologram; }

    /** EDIT-04 build guides (symmetry, curves). */
    GuideClient guides() { return guides; }

    /** Website link over 127.0.0.1 (MAP-03). */
    public LiveLink link() { return link; }

    /** Game window is up: resume the website link if it was switched on before the restart. */
    public void started(Minecraft mc) { link.resume(mc); }

    /** Game is closing: stop the website link. */
    public void stopping() { guarded("gelaende", terrain::leave); link.close(); }

    /** Geländegedächtnis (TERRAIN-04). */
    TerrainRecorder terrain() { return terrain; }

    /** Keys to register with the loader (all in the "Build Studio" category, {@link HologramKeys#CATEGORY}). */
    public List<KeyMapping> keys() { return keys.all(); }

    /** {@code zeigen}, {@code fortschritt}, … to hang below the loader's {@code /bauplaner} node. */
    public <S> List<LiteralArgumentBuilder<S>> commands() {
        List<LiteralArgumentBuilder<S>> list = new java.util.ArrayList<>(HologramCommands.build(hologram, link));
        list.add(team.command());
        list.addAll(guides.<S>commands());
        list.add(terrainCommand());
        // GAME-10: command page; opened on the next tick because the chat screen closes right after the command.
        list.add(LiteralArgumentBuilder.<S>literal("befehle").executes(c -> { openScreen = 2; return 1; }));
        // GAME-12 (0.23.0): help, plan menu, language, where messages go, how much the build panel shows.
        list.add(LiteralArgumentBuilder.<S>literal("hilfe").executes(c -> help()));
        list.add(LiteralArgumentBuilder.<S>literal("menue").executes(c -> { openScreen = 1; return 1; }));
        java.util.function.Function<String, Integer> say = t -> { McCompat.chat(Minecraft.getInstance(), Component.literal("[Build Studio] " + t)); return 1; };
        var lang = LiteralArgumentBuilder.<S>literal("sprache").executes(c -> say.apply(Lang.t("Sprache: ", "Language: ") + Lang.choice().label() + " · /bauplaner sprache deutsch|englisch|auto"));
        for (Lang.Choice ch : Lang.Choice.values())
            lang.then(LiteralArgumentBuilder.<S>literal(ch == Lang.Choice.EN ? "englisch" : ch.key).executes(c -> say.apply(ClientSettings.setLanguage(ch))));
        list.add(lang);
        var notices = LiteralArgumentBuilder.<S>literal("meldungen").executes(c -> say.apply(Lang.t("Meldungen: ", "Messages: ") + ClientSettings.notices().label() + " · /bauplaner meldungen einblendung|chat|beides"));
        for (ClientSettings.Notices n : ClientSettings.Notices.values())
            notices.then(LiteralArgumentBuilder.<S>literal(n.key).executes(c -> say.apply(ClientSettings.setNotices(n))));
        list.add(notices);
        var panel = LiteralArgumentBuilder.<S>literal("anzeige").executes(c -> say.apply(ClientSettings.setPanel(ClientSettings.panel().next())));
        for (ClientSettings.Panel pa : ClientSettings.Panel.values())
            panel.then(LiteralArgumentBuilder.<S>literal(pa.key).executes(c -> say.apply(ClientSettings.setPanel(pa))));
        list.add(panel);
        return list;
    }

    /** {@code /bauplaner} and {@code /bauplaner hilfe}: the five steps and where to click, in the mod's language. */
    public int help() {
        Minecraft mc = Minecraft.getInstance();
        String root = Lang.en() ? "/buildplanner" : "/bauplaner";
        String[][] steps = {
                { "So geht's – Build Studio in 5 Schritten:", "How it works – Build Studio in 5 steps:" },
                { " 1. Im Planer „Spiel verbinden“ klicken und hier zulassen (J).", " 1. Click “Connect game” in the planner and allow it here (J)." },
                { " 2. Plan im Planer ins Spiel senden oder im Menü (J) wählen.", " 2. Send the plan from the planner or pick it in the menu (J)." },
                { " 3. Auf den Startblock schauen und „Hierher“ klicken.", " 3. Look at the start block and click “Here”." },
                { " 4. Bauen: das Hologramm zeigt, was fehlt; Punkt-Taste = nächster Fehler.", " 4. Build: the hologram shows what is missing; period key = next error." },
                { " 5. Fortschritt steht oben rechts und im Planer.", " 5. Progress is shown at the top right and in the planner." },
                { "Alle Befehle per Klick: J → „Befehle“. Tippen: " + root + " <Tab>. Sprache: " + root + " sprache deutsch|englisch|auto",
                  "Every command by click: J → “Commands”. Typing: " + root + " <Tab>. Language: " + root + " language german|english|auto" } };
        for (String[] s : steps) McCompat.chatLine(mc, Component.literal("[Build Studio] " + Lang.t(s[0], s[1])));
        return 1;
    }

    /** {@code /bauplaner gelaende [an|aus|vergessen]}: Geländegedächtnis for the website (TERRAIN-04). */
    private <S> LiteralArgumentBuilder<S> terrainCommand() {
        java.util.function.Consumer<String> say = t -> McCompat.chat(Minecraft.getInstance(), Component.literal("[Build Studio] " + t));
        return LiteralArgumentBuilder.<S>literal("gelaende")
                .executes(c -> { say.accept(terrain.status(Minecraft.getInstance())); return 1; })
                .then(LiteralArgumentBuilder.<S>literal("an").executes(c -> { say.accept(terrain.setEnabled(true)); return 1; }))
                .then(LiteralArgumentBuilder.<S>literal("aus").executes(c -> { say.accept(terrain.setEnabled(false)); return 1; }))
                .then(LiteralArgumentBuilder.<S>literal("vergessen").executes(c -> { say.accept(terrain.forget()); return 1; }));
    }

    /** 1 = plan menu, 2 = command page: opened on the next tick, after the chat screen closed. */
    private volatile int openScreen;

    /** Commands and status by click (GAME-10), also reachable from the J menu. */
    public void openCommands(Minecraft mc) { CommandScreen.open(mc, this); }

    /** End of every client tick. */
    public void tick(Minecraft mc) {
        guarded("tick", () -> { keys.tick(mc); hologram.tick(mc); assist.tick(mc); marks.tick(mc); link.tickShared(mc); team.tick(mc); guides.tick(mc); });
        guarded("gelaende", () -> terrain.tick(mc));
        Lang.game(mc.options.languageCode);
        if (openScreen != 0 && mc.gui.screen() == null) { int which = openScreen; openScreen = 0; if (which == 2) openCommands(mc); else PlanScreen.open(mc, hologram); }
    }

    /** Level render pass: ghost blocks, frames, finder beam. */
    public void render(PoseStack pose, SubmitNodeCollector out, Vec3 camera) {
        guarded("render", () -> { renderer.submit(pose, out, camera); marks.submit(pose, out, camera); team.render(pose, out, camera); guides.render(pose, out, camera); });
    }

    /** HUD layer: progress panel and the crosshair line of the placement helper. */
    public void hud(GuiGraphicsExtractor g, DeltaTracker delta) {
        guarded("hud", () -> {
            // The mod's own screens show the same things; the HUD would only shine through the panel.
            var screen = Minecraft.getInstance().gui.screen();
            if (screen instanceof PlanScreen || screen instanceof CommandScreen || screen instanceof MaterialScreen) return;
            hud.extract(g, delta);
            LinkPrompt.hud(g, this);
            Toasts.extract(g, HudCard.ceiling() > 0 ? HudCard.ceiling() + 4 : 6);
            HudCard.ceiling(Math.round(Toasts.bottom()));
            marks.hud(g, delta); team.hud(g); guides.hud(g);
        });
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
                        "[Build Studio] " + Lang.t("Interner Fehler (" + e.getClass().getSimpleName() + "), das Spiel läuft weiter. Bitte /bauplaner diagnose ausführen und die Datei schicken.",
                        "Internal error (" + e.getClass().getSimpleName() + "), the game keeps running. Please run /buildplanner diagnose and send the file."))
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
        if (msg != null) McCompat.chat(mc, Component.literal("[Build Studio] " + msg));
        guarded("team", () -> team.join(mc, mc.isLocalServer() ? null : teamChannel));
    }

    public void leave() { hologram.leave(); guarded("team", team::leave); guarded("gelaende", terrain::leave); }

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
        if (r[0] != InteractionResult.FAIL) guarded("bauhilfe", () -> guides.use(player, level, hand, hit));
        return r[0];
    }

    /** Left click on a block, before anything is sent; FAIL keeps a correct plan block from being broken. */
    public InteractionResult attack(Player player, Level level, BlockPos pos) {
        InteractionResult[] r = { InteractionResult.PASS };
        guarded("linksklick", () -> r[0] = assist.onAttack(player, level, pos));
        if (r[0] != InteractionResult.FAIL) guarded("bauhilfe", () -> guides.attack(level, pos));
        return r[0];
    }
}
