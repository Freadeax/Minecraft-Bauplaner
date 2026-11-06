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
 * Weltplan marks from the website in the world (MAP-03, schema 2 since GAME-08): building sites as
 * frames on the ground, paths as lines along the surface, points as a short pillar with a beam, zones
 * as a translucent carpet of ground cells with a border. Heights come from the client's own height map
 * of loaded chunks; nothing is placed. Entries use their own colour when the website gave one; hidden
 * layers and groups are skipped, locked entries drawn grey (GAME-07-S11). A HUD line points to the nearest point and names the zone the player stands in.
 */
final class MarksRenderer {
    static final int RADIUS = 256;
    private final LiveLink link;
    /** Line list in world coordinates: x0,y0,z0,x1,y1,z1 and colour, rebuilt about once a second. */
    private float[] lines = new float[0];
    private int[] colors = new int[0];
    private int count;
    private int ticks;
    /** Zone cells in world coordinates: x, y, z (top of the ground column) and colour, rebuilt with the lines. */
    private float[] cells = new float[0];
    private int[] cellColors = new int[0];
    private int cellCount;
    static final int MAX_CELLS = 40_000;

    MarksRenderer(LiveLink link) { this.link = link; }

    void tick(Minecraft mc) {
        if (++ticks % 20 != 0) return;
        WorldMarks m = link.marks();
        count = 0;
        cellCount = 0;
        if (mc.level == null || mc.player == null || m.size() == 0 || !m.dimension().equals(McCompat.dimension(mc.level))) return;
        List<float[]> out = new ArrayList<>();
        List<Integer> col = new ArrayList<>();
        List<float[]> cellOut = new ArrayList<>();
        List<Integer> cellCol = new ArrayList<>();
        ClientLevel level = mc.level;
        double px = mc.player.getX(), pz = mc.player.getZ();
        for (WorldMarks.Zone zone : m.zones()) {
            if (!link.shown(zone.extras())) continue;
            int[] b = zone.bounds();
            if (far(px, pz, (b[0] + b[2]) / 2.0, (b[1] + b[3]) / 2.0, Math.max(b[2] - b[0], b[3] - b[1]))) continue;
            int color = tone(zone.extras(), WorldMarks.color(zone.extras(), WorldMarks.zoneColor(zone.category())));
            // Carpet: one cell per ground column inside the polygon, coarser for big zones so the count stays bounded.
            long area = (long) (b[2] - b[0] + 1) * (b[3] - b[1] + 1);
            int step = area <= 4_096 ? 1 : area <= 16_384 ? 2 : area <= 65_536 ? 4 : 8;
            for (int x = b[0]; x <= b[2] && cellOut.size() < MAX_CELLS; x += step) {
                for (int z = b[1]; z <= b[3] && cellOut.size() < MAX_CELLS; z += step) {
                    if (!zone.contains(x + 0.5, z + 0.5) || Math.hypot(px - x, pz - z) > RADIUS) continue;
                    Integer g = ground(level, x, z);
                    if (g == null) continue;
                    cellOut.add(new float[] { x, g + 0.03f, z, step });
                    cellCol.add((color & 0xFFFFFF) | 0x48000000);
                }
            }
            // Border along the ground, like paths.
            int[][] pts = zone.points();
            for (int i = 0; i < pts.length; i++) surfaceLine(level, out, col, pts[i], pts[(i + 1) % pts.length], px, pz, color);
        }
        for (WorldMarks.Site s : m.sites()) {
            if (!link.shown(s.extras())) continue;
            if (far(px, pz, s.minX() + s.width() / 2.0, s.minZ() + s.length() / 2.0, Math.max(s.width(), s.length()))) continue;
            Integer y = s.y() != null ? s.y() : ground(level, s.minX() + s.width() / 2, s.minZ() + s.length() / 2);
            if (y == null) continue;
            int c = tone(s.extras(), WorldMarks.color(s.extras(), HudCard.TEXT));
            float x0 = s.minX(), z0 = s.minZ(), x1 = s.minX() + s.width(), z1 = s.minZ() + s.length(), fy = y + 0.05f;
            add(out, col, x0, fy, z0, x1, fy, z0, c); add(out, col, x1, fy, z0, x1, fy, z1, c);
            add(out, col, x1, fy, z1, x0, fy, z1, c); add(out, col, x0, fy, z1, x0, fy, z0, c);
            for (float[] k : new float[][] { { x0, z0 }, { x1, z0 }, { x1, z1 }, { x0, z1 } }) add(out, col, k[0], fy, k[1], k[0], fy + 3, k[1], c);
        }
        for (WorldMarks.Path p : m.paths()) {
            if (!link.shown(p.extras())) continue;
            int color = tone(p.extras(), WorldMarks.color(p.extras(), WorldMarks.pathColor(p.style())));
            for (int i = 0; i + 1 < p.points().length; i++) surfaceLine(level, out, col, p.points()[i], p.points()[i + 1], px, pz, color);
        }
        for (WorldMarks.Point p : m.points()) {
            if (!link.shown(p.extras())) continue;
            if (far(px, pz, p.x(), p.z(), 0)) continue;
            int c = tone(p.extras(), WorldMarks.color(p.extras(), WorldMarks.pointColor(p.type())));
            float x = p.x(), y = p.y(), z = p.z();
            add(out, col, x + 0.5f, y, z + 0.5f, x + 0.5f, y + 40, z + 0.5f, c);
            add(out, col, x, y, z, x + 1, y, z, c); add(out, col, x + 1, y, z, x + 1, y, z + 1, c);
            add(out, col, x + 1, y, z + 1, x, y, z + 1, c); add(out, col, x, y, z + 1, x, y, z, c);
        }
        if (lines.length < out.size() * 6) { lines = new float[out.size() * 6]; colors = new int[out.size()]; }
        for (int i = 0; i < out.size(); i++) { System.arraycopy(out.get(i), 0, lines, i * 6, 6); colors[i] = col.get(i); }
        count = out.size();
        if (cells.length < cellOut.size() * 4) { cells = new float[cellOut.size() * 4]; cellColors = new int[cellOut.size()]; }
        for (int i = 0; i < cellOut.size(); i++) { System.arraycopy(cellOut.get(i), 0, cells, i * 4, 4); cellColors[i] = cellCol.get(i); }
        cellCount = cellOut.size();
    }

    /** A line from corner a to corner b that follows the ground in steps of about four blocks, so it does not cut through hills. */
    private static void surfaceLine(ClientLevel level, List<float[]> out, List<Integer> col, int[] a, int[] b, double px, double pz, int color) {
        if (far(px, pz, (a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0, Math.hypot(a[0] - b[0], a[1] - b[1]))) return;
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

    private static boolean far(double px, double pz, double x, double z, double size) { return Math.hypot(px - x, pz - z) > RADIUS + size; }

    /** Locked entries (schema 3, GAME-07-S11) are drawn grey, whatever their own colour. */
    static final int LOCKED = HudCard.DIM;

    private static int tone(WorldMarks.Extras e, int color) { return e.locked() ? LOCKED : color; }

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
        if (count == 0 && cellCount == 0) return;
        pose.pushPose();
        int ox = (int) Math.floor(cam.x), oy = (int) Math.floor(cam.y), oz = (int) Math.floor(cam.z);
        pose.translate(ox - cam.x, oy - cam.y, oz - cam.z);
        if (cellCount > 0) {
            final float[] q = cells;
            final int[] qc = cellColors;
            final int n = cellCount;
            out.submitCustomGeometry(pose, RenderTypes.debugQuads(), (p, vc) -> {
                for (int i = 0; i < n; i++) {
                    int k = i * 4;
                    float x = q[k] - ox, y = q[k + 1] - oy, z = q[k + 2] - oz, s = q[k + 3];
                    vc.addVertex(p, x, y, z).setColor(qc[i]);
                    vc.addVertex(p, x, y, z + s).setColor(qc[i]);
                    vc.addVertex(p, x + s, y, z + s).setColor(qc[i]);
                    vc.addVertex(p, x + s, y, z).setColor(qc[i]);
                }
            });
        }
        if (count == 0) { pose.popPose(); return; }
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
    private static String website() { return io.github.freadeax.bauplaner.mod.Lang.t("✔ Planer verbunden", "✔ Planner connected"); }

    void hud(GuiGraphicsExtractor g, DeltaTracker delta) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null || mc.gui.screen() != null) return;
        List<String> rows = new ArrayList<>();
        WorldMarks m = link.marks();
        if (m.size() > 0 && m.dimension().equals(McCompat.dimension(mc.level))) {
            WorldMarks.Zone zone = m.zoneAt(mc.player.getX(), mc.player.getZ());
            if (zone != null && link.shown(zone.extras())) rows.add(WorldMarks.categoryLabel(zone.category()) + " „" + zone.name() + "“" + (zone.extras().group().isEmpty() ? "" : " · " + zone.extras().group()) + (zone.extras().locked() ? io.github.freadeax.bauplaner.mod.Lang.t(" · gesperrt", " · locked") : ""));
            WorldMarks.Point p = m.nearestPoint(mc.player.getX(), mc.player.getZ());
            if (p != null) {
                int d = (int) Math.round(Math.hypot(p.x() + 0.5 - mc.player.getX(), p.z() + 0.5 - mc.player.getZ()));
                rows.add(WorldMarks.typeLabel(p.type()) + " „" + p.name() + "“: " + d + " m " + (d == 0 ? io.github.freadeax.bauplaner.mod.Lang.t("hier", "here") : HologramHud.compass(p.x() + 0.5 - mc.player.getX(), p.z() + 0.5 - mc.player.getZ())));
            }
        }
        // GAME-12: "website connected" only in the detailed panel – the build panel shows the link as a dot.
        if (link.running() && link.websiteActive() && ClientSettings.panel() == ClientSettings.Panel.DETAILED) rows.add(website());
        if (rows.isEmpty()) return;
        if (ClientSettings.panel() == ClientSettings.Panel.HIDDEN) return;
        List<String[]> cells = new ArrayList<>();
        for (String r : rows) cells.add(new String[] { r, Integer.toHexString(r.equals(website()) ? HologramHud.GREEN : HologramHud.CYAN) });
        HudCard.bottomRight(g, mc.font, cells, HologramHud.CYAN);
    }
}
