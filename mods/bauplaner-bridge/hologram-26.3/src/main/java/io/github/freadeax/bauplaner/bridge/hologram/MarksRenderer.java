package io.github.freadeax.bauplaner.bridge.hologram;

import com.mojang.blaze3d.vertex.PoseStack;
import io.github.freadeax.bauplaner.mod.live.WorldMarks;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.phys.Vec3;

/**
 * Weltplan marks from the website in the world (MAP-03): building sites as frames on the ground,
 * paths as lines along the surface, points as a short pillar with a beam. Heights come from the
 * client's own height map of loaded chunks; nothing is placed. A HUD line points to the nearest point.
 */
final class MarksRenderer {
    static final int RADIUS = 256;
    private final LiveLink link;
    /** Line list in world coordinates: x0,y0,z0,x1,y1,z1 and colour, rebuilt about once a second. */
    private float[] lines = new float[0];
    private int[] colors = new int[0];
    private int count;
    private int ticks;

    MarksRenderer(LiveLink link) { this.link = link; }

    void tick(Minecraft mc) {
        if (++ticks % 20 != 0) return;
        WorldMarks m = link.marks();
        count = 0;
        if (mc.level == null || mc.player == null || m.size() == 0 || !m.dimension().equals(McCompat.dimension(mc.level))) return;
        List<float[]> out = new ArrayList<>();
        List<Integer> col = new ArrayList<>();
        ClientLevel level = mc.level;
        double px = mc.player.getX(), pz = mc.player.getZ();
        for (WorldMarks.Site s : m.sites()) {
            if (far(px, pz, s.minX() + s.width() / 2.0, s.minZ() + s.length() / 2.0, Math.max(s.width(), s.length()))) continue;
            Integer y = s.y() != null ? s.y() : ground(level, s.minX() + s.width() / 2, s.minZ() + s.length() / 2);
            if (y == null) continue;
            float x0 = s.minX(), z0 = s.minZ(), x1 = s.minX() + s.width(), z1 = s.minZ() + s.length(), fy = y + 0.05f;
            add(out, col, x0, fy, z0, x1, fy, z0, 0xFFFFFFFF); add(out, col, x1, fy, z0, x1, fy, z1, 0xFFFFFFFF);
            add(out, col, x1, fy, z1, x0, fy, z1, 0xFFFFFFFF); add(out, col, x0, fy, z1, x0, fy, z0, 0xFFFFFFFF);
            for (float[] c : new float[][] { { x0, z0 }, { x1, z0 }, { x1, z1 }, { x0, z1 } }) add(out, col, c[0], fy, c[1], c[0], fy + 3, c[1], 0xFFFFFFFF);
        }
        for (WorldMarks.Path p : m.paths()) {
            int color = WorldMarks.pathColor(p.style());
            for (int i = 0; i + 1 < p.points().length; i++) {
                int[] a = p.points()[i], b = p.points()[i + 1];
                if (far(px, pz, (a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0, Math.hypot(a[0] - b[0], a[1] - b[1]))) continue;
                // Follow the ground in steps of about four blocks so the line does not cut through hills.
                int steps = Math.max(1, (int) Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
                Float lastX = null, lastY = null, lastZ = null;
                for (int k = 0; k <= steps; k++) {
                    float x = a[0] + (b[0] - a[0]) * k / (float) steps + 0.5f, z = a[1] + (b[1] - a[1]) * k / (float) steps + 0.5f;
                    Integer g = ground(level, (int) Math.floor(x), (int) Math.floor(z));
                    if (g == null) { lastX = null; continue; }
                    float y = g + 0.15f;
                    if (lastX != null) add(out, col, lastX, lastY, lastZ, x, y, z, color);
                    lastX = x; lastY = y; lastZ = z;
                }
            }
        }
        for (WorldMarks.Point p : m.points()) {
            if (far(px, pz, p.x(), p.z(), 0)) continue;
            int c = WorldMarks.pointColor(p.type());
            float x = p.x(), y = p.y(), z = p.z();
            add(out, col, x + 0.5f, y, z + 0.5f, x + 0.5f, y + 40, z + 0.5f, c);
            add(out, col, x, y, z, x + 1, y, z, c); add(out, col, x + 1, y, z, x + 1, y, z + 1, c);
            add(out, col, x + 1, y, z + 1, x, y, z + 1, c); add(out, col, x, y, z + 1, x, y, z, c);
        }
        if (lines.length < out.size() * 6) { lines = new float[out.size() * 6]; colors = new int[out.size()]; }
        for (int i = 0; i < out.size(); i++) { System.arraycopy(out.get(i), 0, lines, i * 6, 6); colors[i] = col.get(i); }
        count = out.size();
    }

    private static boolean far(double px, double pz, double x, double z, double size) { return Math.hypot(px - x, pz - z) > RADIUS + size; }

    /** Top of the ground (motion blocking, without leaves) in a loaded chunk; null when not loaded. */
    private static Integer ground(ClientLevel level, int x, int z) {
        if (!McCompat.loaded(level, x >> 4, z >> 4)) return null;
        return level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
    }

    private static void add(List<float[]> out, List<Integer> col, float x0, float y0, float z0, float x1, float y1, float z1, int c) {
        out.add(new float[] { x0, y0, z0, x1, y1, z1 });
        col.add(c);
    }

    void submit(PoseStack pose, SubmitNodeCollector out, Vec3 cam) {
        if (count == 0) return;
        pose.pushPose();
        int ox = (int) Math.floor(cam.x), oy = (int) Math.floor(cam.y), oz = (int) Math.floor(cam.z);
        pose.translate(ox - cam.x, oy - cam.y, oz - cam.z);
        final float[] l = lines;
        final int[] c = colors;
        final int n = count;
        out.submitCustomGeometry(pose, RenderTypes.lines(), (p, vc) -> {
            for (int i = 0; i < n; i++) {
                int k = i * 6;
                HologramRenderer.line(p, vc, l[k] - ox, l[k + 1] - oy, l[k + 2] - oz, l[k + 3] - ox, l[k + 4] - oy, l[k + 5] - oz, c[i], 3.0f);
            }
        });
        pose.popPose();
    }

    /** HUD, bottom right above the hotbar area: nearest Weltplan point and the website link state. */
    void hud(GuiGraphicsExtractor g, DeltaTracker delta) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null || mc.gui.screen() != null) return;
        List<String> rows = new ArrayList<>();
        WorldMarks m = link.marks();
        if (m.size() > 0 && m.dimension().equals(McCompat.dimension(mc.level))) {
            WorldMarks.Point p = m.nearestPoint(mc.player.getX(), mc.player.getZ());
            if (p != null) {
                int d = (int) Math.round(Math.hypot(p.x() + 0.5 - mc.player.getX(), p.z() + 0.5 - mc.player.getZ()));
                rows.add(WorldMarks.typeLabel(p.type()) + " „" + p.name() + "“: " + d + " m " + (d == 0 ? "hier" : HologramHud.compass(p.x() + 0.5 - mc.player.getX(), p.z() + 0.5 - mc.player.getZ())));
            }
        }
        if (link.running() && link.websiteActive()) rows.add("Website verbunden");
        if (rows.isEmpty()) return;
        var font = mc.font;
        int line = font.lineHeight + 2, w = 0;
        for (String r : rows) w = Math.max(w, font.width(r));
        int x = g.guiWidth() - w - 6, y = g.guiHeight() - 60 - rows.size() * line;
        g.fill(x - 3, y - 3, x + w + 3, y + rows.size() * line - 1, 0x90000000);
        for (String r : rows) { g.text(font, r, x, y, r.startsWith("Website") ? HologramHud.GREEN : HologramHud.CYAN, true); y += line; }
    }
}
