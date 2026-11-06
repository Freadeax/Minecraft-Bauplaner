package io.github.freadeax.bauplaner.bridge.hologram;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import com.mojang.brigadier.builder.RequiredArgumentBuilder;
import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import io.github.freadeax.bauplaner.mod.Placement;
import io.github.freadeax.bauplaner.mod.edit.BuildGuides;
import io.github.freadeax.bauplaner.mod.edit.Curve;
import io.github.freadeax.bauplaner.mod.edit.GuidePlan;
import io.github.freadeax.bauplaner.mod.edit.Symmetry;
import java.nio.file.Files;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;

/**
 * Bauhilfen im Spiel (EDIT-04, mod side): symmetry and curves while building by hand, as ghost blocks on top of
 * {@link BuildGuides}. Client only: the mod watches what the player places and breaks (the loader's block click
 * events plus the world the client sees a tick later), never places a block itself and sends nothing to the
 * server. {@code /bauplaner symmetrie …}, {@code /bauplaner kurve …}, {@code /bauplaner bauhilfe aus}; two keys
 * (unbound by default) set a curve point and the symmetry axis.
 */
final class GuideClient {
    static final int RADIUS = 64;
    static final int MAX_DRAWN = 6_000;
    private static final int GHOST = 0x555AA9FF, WRONG = 0x70FF4040, STATE = 0x70FFD54A, POINT = 0xFF35D0E0, AXIS = 0xC0FFB347, BREAK = 0xE0FF4040;

    private final Hologram hologram;
    private final BuildGuides guides = new BuildGuides();
    private final GhostModels models = new GhostModels();

    /** A click the guides wait to see in the world: position, state before, ticks waited, place or break. */
    private record Pending(BlockPos pos, io.github.freadeax.bauplaner.mod.BlockState before, boolean place, int[] age) {}
    private final List<Pending> pending = new ArrayList<>();

    /** Draw list rebuilt every 10 ticks: positions, verdict colour, model (null = box). */
    private int[] drawn = new int[0];
    private int[] colors = new int[0];
    private GhostModels.Model[] drawnModels = new GhostModels.Model[0];
    private int drawnCount;
    private int[] breaks = new int[0];
    private int breakCount;
    private float[] curveLine = new float[0];
    private BuildGuides.Progress progress = new BuildGuides.Progress(0, 0, 0, 0);
    private int ticks;

    GuideClient(Hologram hologram) { this.hologram = hologram; }

    BuildGuides guides() { return guides; }

    // ------------------------------------------------------------------ world events

    /** Right click on a block (after the placement helper let it through): watch where a block may appear. */
    void use(Player player, Level level, InteractionHand hand, BlockHitResult hit) {
        if (!guides.symmetry().active() || !(player.getItemInHand(hand).getItem() instanceof BlockItem)) return;
        for (BlockPos p : new BlockPos[] { hit.getBlockPos(), hit.getBlockPos().relative(hit.getDirection()) })
            pending.add(new Pending(p.immutable(), McCompat.modState(level.getBlockState(p)), true, new int[1]));
        while (pending.size() > 64) pending.remove(0);
    }

    /** Left click on a block: a source may be gone a few ticks later. */
    void attack(Level level, BlockPos pos) {
        if (!guides.symmetry().active()) return;
        pending.add(new Pending(pos.immutable(), McCompat.modState(level.getBlockState(pos)), false, new int[1]));
        while (pending.size() > 64) pending.remove(0);
    }

    /** Placeable cells: air and replaceable plants, snow layers, water count as "nothing built yet". */
    static LiveCheck.WorldReader reader(ClientLevel level) {
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        return (x, y, z) -> {
            if (level.isOutsideBuildHeight(y)) return io.github.freadeax.bauplaner.mod.BlockState.AIR;
            if (!McCompat.loaded(level, x >> 4, z >> 4)) return null;
            var s = level.getBlockState(pos.set(x, y, z));
            return !s.isAir() && s.canBeReplaced() ? io.github.freadeax.bauplaner.mod.BlockState.AIR : McCompat.modState(s);
        };
    }

    void tick(Minecraft mc) {
        if (mc.level == null || mc.player == null) return;
        String dim = McCompat.dimension(mc.level);
        if (!pending.isEmpty()) {
            var it = pending.iterator();
            while (it.hasNext()) {
                Pending p = it.next();
                if (++p.age()[0] < 2) continue;
                var now = McCompat.modState(mc.level.getBlockState(p.pos()));
                boolean changed = !now.equals(p.before());
                if (changed && p.place() && !now.isAir()) guides.placed(p.pos().getX(), p.pos().getY(), p.pos().getZ(), now, dim);
                if (changed && !p.place() && now.isAir()) guides.broken(p.pos().getX(), p.pos().getY(), p.pos().getZ(), dim);
                if (changed || p.age()[0] > 20) it.remove();
            }
        }
        if (++ticks % 10 != 0) return;
        drawnCount = 0;
        breakCount = 0;
        curveLine = new float[0];
        if (!guides.active() || !guides.in(dim)) { progress = new BuildGuides.Progress(0, 0, 0, 0); return; }
        LiveCheck.WorldReader read = reader(mc.level);
        guides.sweepBreaks(read);
        progress = guides.progress(read);
        double px = mc.player.getX(), py = mc.player.getY(), pz = mc.player.getZ();
        List<BuildGuides.Target> near = new ArrayList<>();
        for (BuildGuides.Target t : guides.targets()) {
            double dx = t.x() + 0.5 - px, dy = t.y() + 0.5 - py, dz = t.z() + 0.5 - pz;
            if (dx * dx + dy * dy + dz * dz <= RADIUS * RADIUS) near.add(t);
        }
        near.sort(java.util.Comparator.comparingDouble(t -> (t.x() - px) * (t.x() - px) + (t.y() - py) * (t.y() - py) + (t.z() - pz) * (t.z() - pz)));
        int n = Math.min(near.size(), MAX_DRAWN);
        if (drawn.length < n * 3) { drawn = new int[n * 3]; colors = new int[n]; drawnModels = new GhostModels.Model[n]; }
        for (BuildGuides.Target t : near.subList(0, n)) {
            Verdict v = BuildGuides.verdict(t, read);
            int c = v == Verdict.MISSING ? GHOST : v == Verdict.WRONG ? WRONG : v == Verdict.STATE ? STATE : 0;
            if (c == 0) continue;
            drawn[drawnCount * 3] = t.x(); drawn[drawnCount * 3 + 1] = t.y(); drawn[drawnCount * 3 + 2] = t.z();
            colors[drawnCount] = c;
            drawnModels[drawnCount] = v == Verdict.MISSING ? models.model(t.state()) : null;
            drawnCount++;
        }
        var br = guides.toBreak();
        if (breaks.length < br.size() * 3) breaks = new int[br.size() * 3];
        for (int[] p : br.keySet()) { breaks[breakCount * 3] = p[0]; breaks[breakCount * 3 + 1] = p[1]; breaks[breakCount * 3 + 2] = p[2]; breakCount++; }
        if (guides.points().size() >= 2) {
            try {
                List<double[]> line = Curve.line(guides.points(), guides.curve());
                int step = Math.max(1, line.size() / 400);
                List<double[]> kept = new ArrayList<>();
                for (int i = 0; i < line.size(); i += step) kept.add(line.get(i));
                kept.add(line.get(line.size() - 1));
                curveLine = new float[kept.size() * 3];
                for (int i = 0; i < kept.size(); i++) { curveLine[i * 3] = (float) kept.get(i)[0] + 0.5f; curveLine[i * 3 + 1] = (float) kept.get(i)[1] + 0.5f; curveLine[i * 3 + 2] = (float) kept.get(i)[2] + 0.5f; }
            } catch (IllegalArgumentException e) { curveLine = new float[0]; }
        }
    }

    // ------------------------------------------------------------------ drawing

    void render(PoseStack pose, SubmitNodeCollector out, Vec3 cam) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null || !guides.active() || !guides.in(McCompat.dimension(mc.level))) return;
        pose.pushPose();
        int ox = (int) Math.floor(cam.x), oy = (int) Math.floor(cam.y), oz = (int) Math.floor(cam.z);
        pose.translate(ox - cam.x, oy - cam.y, oz - cam.z);
        final int n = drawnCount;
        final int[] d = drawn, c = colors;
        final GhostModels.Model[] ms = drawnModels;
        if (n > 0) {
            out.submitCustomGeometry(pose, RenderTypes.entityTranslucent(net.minecraft.client.renderer.texture.TextureAtlas.LOCATION_BLOCKS), (p, vc) -> {
                for (int k = 0; k < n; k++) if (ms[k] != null) GhostModels.emit(p, vc, ms[k], d[k * 3] - ox, d[k * 3 + 1] - oy, d[k * 3 + 2] - oz, 150, 0);
            });
            out.submitCustomGeometry(pose, RenderTypes.debugQuads(), (p, vc) -> {
                for (int k = 0; k < n; k++) {
                    if (ms[k] != null && !McCompat.shadersActive()) continue;
                    float x = d[k * 3] - ox, y = d[k * 3 + 1] - oy, z = d[k * 3 + 2] - oz, g = ms[k] != null ? -0.02f : 0.006f;
                    HologramRenderer.box(p, vc, x - g, y - g, z - g, x + 1 + g, y + 1 + g, z + 1 + g, ms[k] != null ? HologramRenderer.SHADER_TINT : c[k]);
                }
            });
        }
        final int nb = breakCount;
        final int[] b = breaks;
        final float[] line = curveLine;
        final List<int[]> points = guides.points();
        final Symmetry sym = guides.symmetry();
        final double px = cam.x, pz = cam.z;
        out.submitCustomGeometry(pose, RenderTypes.lines(), (p, vc) -> {
            for (int k = 0; k < nb; k++) {
                float x = b[k * 3] - ox, y = b[k * 3 + 1] - oy, z = b[k * 3 + 2] - oz;
                HologramRenderer.frame(p, vc, x - 0.01f, y - 0.01f, z - 0.01f, x + 1.01f, y + 1.01f, z + 1.01f, BREAK, 2.5f);
                HologramRenderer.line(p, vc, x, y, z, x + 1, y + 1, z + 1, BREAK, 2.5f);
                HologramRenderer.line(p, vc, x + 1, y, z, x, y + 1, z + 1, BREAK, 2.5f);
            }
            for (int[] q : points) {
                float x = q[0] - ox, y = q[1] - oy, z = q[2] - oz;
                HologramRenderer.frame(p, vc, x + 0.25f, y + 0.25f, z + 0.25f, x + 0.75f, y + 0.75f, z + 0.75f, POINT, 3f);
            }
            for (int i = 3; i + 2 < line.length; i += 3) HologramRenderer.line(p, vc, line[i - 3] - ox, line[i - 2] - oy, line[i - 1] - oz, line[i] - ox, line[i + 1] - oy, line[i + 2] - oz, POINT, 2f);
            if (sym.active()) {
                // Axis: a vertical beam through the centre and the mirror lines on the player's height, 24 blocks each way.
                float ax = sym.cx2() / 2f + 0.5f - ox, az = sym.cz2() / 2f + 0.5f - oz, y0 = (float) (cam.y - 1.5) - oy;
                HologramRenderer.line(p, vc, ax, y0 - 4, az, ax, y0 + 12, az, AXIS, 3f);
                if (sym.mirrorX()) HologramRenderer.line(p, vc, ax, y0, (float) (pz - 24) - oz, ax, y0, (float) (pz + 24) - oz, AXIS, 2f);
                if (sym.mirrorZ()) HologramRenderer.line(p, vc, (float) (px - 24) - ox, y0, az, (float) (px + 24) - ox, y0, az, AXIS, 2f);
            }
        });
        pose.popPose();
    }

    /** HUD line(s) centred above the hotbar and the action bar: what the guides want and how far the player got. */
    void hud(GuiGraphicsExtractor g) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null || mc.gui.screen() != null || !guides.active() || !guides.in(McCompat.dimension(mc.level))) return;
        List<String> rows = new ArrayList<>();
        if (guides.symmetry().active()) rows.add("Symmetrie: " + guides.symmetry().label());
        if (!guides.points().isEmpty()) {
            String err = guides.curveError();
            rows.add("Kurve: " + guides.points().size() + " Punkte · " + guides.curve().profile().label + (err == null ? "" : " · " + err));
        }
        if (progress.total() > 0) rows.add("Bauhilfe: " + progress.done() + " / " + progress.total() + " gesetzt" + (progress.wrong() > 0 ? " · " + progress.wrong() + " falsch" : "") + (breakCount > 0 ? " · " + breakCount + " abbauen" : ""));
        var font = mc.font;
        int line = font.lineHeight + 2, w = 0;
        for (String r : rows) w = Math.max(w, font.width(r));
        int x = g.guiWidth() / 2 - w / 2, y = g.guiHeight() - 84 - rows.size() * line;
        g.fill(x - 3, y - 3, x + w + 3, y + rows.size() * line - 1, 0x90000000);
        for (String r : rows) { g.text(font, r, x, y, r.startsWith("Bauhilfe") ? HologramHud.GREEN : 0xFF35D0E0, true); y += line; }
    }

    // ------------------------------------------------------------------ actions (keys and commands)

    /** Where a block would go: next to the looked-at face, else the block at the player's feet. */
    static BlockPos placeTarget(Minecraft mc) {
        if (mc.hitResult instanceof BlockHitResult hit && hit.getType() == HitResult.Type.BLOCK) {
            var state = mc.level.getBlockState(hit.getBlockPos());
            return state.canBeReplaced() ? hit.getBlockPos() : hit.getBlockPos().relative(hit.getDirection());
        }
        return mc.player.blockPosition();
    }

    String addPoint(Minecraft mc) {
        BlockPos p = placeTarget(mc);
        guides.addPoint(p.getX(), p.getY(), p.getZ(), McCompat.dimension(mc.level));
        if (guides.block() == null) takeHeldBlock(mc);
        int n = guides.points().size();
        return "Kurvenpunkt " + n + " bei " + p.getX() + " " + p.getY() + " " + p.getZ() + (n == 1 ? " – noch mindestens einen Punkt setzen." : curveSummary());
    }

    private String curveSummary() {
        String err = guides.curveError();
        if (err != null) return " · " + err;
        return " · " + guides.curve().label() + " · " + Math.round(Curve.length(guides.points(), guides.curve())) + " m · " + guides.curveCells().length / 3 + " Blöcke " + McCompat.blockName(guides.block());
    }

    /** The block in the main hand becomes the curve block; false when the player holds none. */
    boolean takeHeldBlock(Minecraft mc) {
        var stack = mc.player.getMainHandItem();
        if (!(stack.getItem() instanceof BlockItem item)) return false;
        guides.setBlock(McCompat.modState(item.getBlock().defaultBlockState()));
        return true;
    }

    String axisHere(Minecraft mc, boolean border) {
        BlockPos p = McCompat.targetBlock(mc);
        Symmetry s = guides.symmetry();
        if (!s.active()) s = s.withMirrorX(true);
        guides.setSymmetry(s.withAxis(2 * p.getX() + (border ? 1 : 0), 2 * p.getZ() + (border ? 1 : 0)), McCompat.dimension(mc.level));
        return "Symmetrie: " + guides.symmetry().label() + ". Gesetzte Blöcke werden ab jetzt gespiegelt (nur Anzeige, die Mod baut nie selbst).";
    }

    private String setSymmetry(Minecraft mc, java.util.function.UnaryOperator<Symmetry> change) {
        Symmetry before = guides.symmetry();
        Symmetry next = change.apply(before);
        if (!before.active() && before.cx2() == 0 && before.cz2() == 0 && next.active()) {
            BlockPos p = McCompat.targetBlock(mc);
            next = next.withAxis(2 * p.getX(), 2 * p.getZ());
        }
        guides.setSymmetry(next, McCompat.dimension(mc.level));
        return next.active() ? "Symmetrie: " + next.label() + "." : "Symmetrie aus.";
    }

    /** Ghosts of the guides as a plan in the hologram (material list, placement helper, progress, recording). */
    String asPlan(Minecraft mc, String name) throws java.io.IOException {
        if (guides.targets().isEmpty()) return "Keine Geisterblöcke – erst eine Kurve zeichnen oder mit Symmetrie bauen.";
        String title = name == null || name.isBlank() ? (guides.points().size() >= 2 ? "Kurve " + guides.curve().profile().label.split(" ")[0] : "Symmetrie") : name.strip();
        GuidePlan.Result r = GuidePlan.write(title, guides.targets(), McCompat.dataVersion(), Instant.now());
        Files.createDirectories(hologram.plansDir());
        Files.write(hologram.plansDir().resolve(r.fileName()), r.bytes());
        String msg = hologram.place(mc, r.fileName(), new BlockPos(r.anchor()[0], r.anchor()[1], r.anchor()[2]));
        // The guide plan is in world orientation: never turn it with an earlier placement.
        if (hologram.active() && (hologram.check().placement().turns() != 0 || hologram.check().placement().mirror()))
            hologram.setPlacement(Placement.at(McCompat.dimension(mc.level), r.anchor()[0], r.anchor()[1], r.anchor()[2]));
        return msg + " Die Datei liegt in " + hologram.plansDir().resolve(r.fileName()) + "; auf der Website lässt sie sich als .schem importieren.";
    }

    // ------------------------------------------------------------------ commands

    private static <S> LiteralArgumentBuilder<S> literal(String name) { return LiteralArgumentBuilder.literal(name); }
    private static <S, T> RequiredArgumentBuilder<S, T> argument(String name, com.mojang.brigadier.arguments.ArgumentType<T> type) { return RequiredArgumentBuilder.argument(name, type); }

    private static int say(String text) { McCompat.chat(Minecraft.getInstance(), Component.literal("[Bauplaner] " + text)); return 1; }
    private static int fail(String text) { McCompat.chat(Minecraft.getInstance(), Component.literal("[Bauplaner] " + text).withStyle(ChatFormatting.RED)); return 0; }

    private interface Action { String run(Minecraft mc) throws Exception; }

    private int act(Action a) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null) return fail("Erst eine Welt betreten.");
        try { return say(a.run(mc)); } catch (IllegalArgumentException e) { return fail(e.getMessage()); } catch (Exception e) { return fail("Fehler: " + e.getMessage()); }
    }

    private String curveChange(java.util.function.UnaryOperator<Curve.Options> change) {
        guides.setCurve(change.apply(guides.curve()));
        return guides.points().size() >= 2 ? "Kurve: " + curveSummary().substring(3) : "Kurve: " + guides.curve().label() + ".";
    }

    <S> List<LiteralArgumentBuilder<S>> commands() {
        LiteralArgumentBuilder<S> sym = GuideClient.<S>literal("symmetrie").executes(c -> act(mc -> "Symmetrie: " + guides.symmetry().label() + (guides.symmetry().active() ? " · " + guides.sources() + " gespiegelte Blöcke" : ". Einschalten: /bauplaner symmetrie x | z | drehen 2|4 | hier")))
                .then(GuideClient.<S>literal("hier").executes(c -> act(mc -> axisHere(mc, false))))
                .then(GuideClient.<S>literal("kante").executes(c -> act(mc -> axisHere(mc, true))))
                .then(GuideClient.<S>literal("x").executes(c -> act(mc -> setSymmetry(mc, s -> s.withMirrorX(!s.mirrorX())))))
                .then(GuideClient.<S>literal("z").executes(c -> act(mc -> setSymmetry(mc, s -> s.withMirrorZ(!s.mirrorZ())))))
                .then(GuideClient.<S>literal("drehen").then(GuideClient.<S, Integer>argument("fach", IntegerArgumentType.integer(1, 4))
                        .executes(c -> act(mc -> {
                            int f = IntegerArgumentType.getInteger(c, "fach");
                            if (f == 3) throw new IllegalArgumentException("1, 2 oder 4 erwartet.");
                            return setSymmetry(mc, s -> f == 4 && Math.floorMod(s.cx2() - s.cz2(), 2) != 0 ? s.withAxis(s.cx2() - Math.floorMod(s.cx2(), 2), s.cz2() - Math.floorMod(s.cz2(), 2)).withRotate(4) : s.withRotate(f));
                        }))))
                .then(GuideClient.<S>literal("aus").executes(c -> act(mc -> setSymmetry(mc, s -> Symmetry.OFF))));
        RequiredArgumentBuilder<S, String> name = GuideClient.<S, String>argument("name", StringArgumentType.greedyString()).executes(c -> act(mc -> asPlan(mc, StringArgumentType.getString(c, "name"))));
        LiteralArgumentBuilder<S> curve = GuideClient.<S>literal("kurve").executes(c -> act(mc -> guides.points().isEmpty()
                        ? "Kurve: noch keine Punkte. /bauplaner kurve punkt setzt einen dort, wo ein Block hinkäme (oder Taste „Kurvenpunkt“)."
                        : "Kurve: " + guides.points().size() + " Punkte" + curveSummary()))
                .then(GuideClient.<S>literal("punkt").executes(c -> act(this::addPoint)))
                .then(GuideClient.<S>literal("zurueck").executes(c -> act(mc -> guides.undoPoint() ? "Letzten Kurvenpunkt entfernt (" + guides.points().size() + " übrig)." : "Keine Kurvenpunkte.")))
                .then(GuideClient.<S>literal("loeschen").executes(c -> act(mc -> { guides.clearCurve(); return "Kurve gelöscht."; })))
                .then(GuideClient.<S>literal("block").executes(c -> act(mc -> takeHeldBlock(mc) ? "Kurvenblock: " + McCompat.blockName(guides.block()) + "." : "Einen Block in die Hand nehmen.")))
                .then(GuideClient.<S>literal("profil")
                        .then(GuideClient.<S>literal("rohr").executes(c -> act(mc -> curveChange(o -> o.withProfile(Curve.Profile.ROHR)))))
                        .then(GuideClient.<S>literal("weg").executes(c -> act(mc -> curveChange(o -> o.withProfile(Curve.Profile.WEG)))))
                        .then(GuideClient.<S>literal("mauer").executes(c -> act(mc -> curveChange(o -> o.withProfile(Curve.Profile.MAUER))))))
                .then(GuideClient.<S>literal("breite").then(GuideClient.<S, Integer>argument("bloecke", IntegerArgumentType.integer(1, 33)).executes(c -> act(mc -> curveChange(o -> o.withWidth(IntegerArgumentType.getInteger(c, "bloecke")))))))
                .then(GuideClient.<S>literal("hoehe").then(GuideClient.<S, Integer>argument("bloecke", IntegerArgumentType.integer(1, 128)).executes(c -> act(mc -> curveChange(o -> o.withHeight(IntegerArgumentType.getInteger(c, "bloecke")))))))
                .then(GuideClient.<S>literal("radius").then(GuideClient.<S, Integer>argument("bloecke", IntegerArgumentType.integer(0, 16)).executes(c -> act(mc -> curveChange(o -> o.withRadius(IntegerArgumentType.getInteger(c, "bloecke")))))))
                .then(GuideClient.<S>literal("geschlossen").executes(c -> act(mc -> curveChange(o -> o.withClosed(!o.closed())))))
                .then(GuideClient.<S>literal("glatt").then(GuideClient.<S, Integer>argument("prozent", IntegerArgumentType.integer(0, 100)).executes(c -> act(mc -> curveChange(o -> o.withTension(IntegerArgumentType.getInteger(c, "prozent") / 100.0))))))
                .then(GuideClient.<S>literal("versetzen").then(GuideClient.<S, Integer>argument("dy", IntegerArgumentType.integer(-64, 64)).executes(c -> act(mc -> { guides.shiftCurve(IntegerArgumentType.getInteger(c, "dy")); return "Kurve versetzt" + curveSummary(); }))))
                .then(GuideClient.<S>literal("alsplan").executes(c -> act(mc -> asPlan(mc, null))).then(name));
        LiteralArgumentBuilder<S> off = GuideClient.<S>literal("bauhilfe")
                .executes(c -> act(mc -> guides.active() ? "Bauhilfe: " + progress.done() + " / " + progress.total() + " gesetzt. /bauplaner bauhilfe aus löscht Symmetrie und Kurve." : "Keine Bauhilfe aktiv. /bauplaner symmetrie x oder /bauplaner kurve punkt."))
                .then(GuideClient.<S>literal("aus").executes(c -> act(mc -> { guides.clearAll(); return "Symmetrie und Kurve gelöscht."; })))
                .then(GuideClient.<S>literal("alsplan").executes(c -> act(mc -> asPlan(mc, null))));
        return List.of(sym, curve, off);
    }
}
