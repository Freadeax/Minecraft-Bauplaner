package io.github.freadeax.bauplaner.bridge.fabric;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import java.util.Arrays;
import net.fabricmc.fabric.api.client.rendering.v1.level.LevelRenderContext;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.world.phys.Vec3;

/**
 * Draws the placed plan into the world: translucent boxes for every block that still needs work
 * (missing blue, wrong red, wrong state yellow; correct blocks are hidden), a frame around the whole
 * plan and a bright frame around the block the error finder points at. Only vanilla render types,
 * no shaders of its own, so it works next to Sodium and Iris. Draws nothing in other dimensions.
 */
final class HologramRenderer {
    /** Radius (blocks) around the camera in which ghost blocks are drawn. */
    static final int RADIUS = 72;
    /** Upper limit of drawn ghost blocks per frame; the nearest chunks come first. */
    static final int MAX_BLOCKS = 30_000;

    static final int MISSING = 0x555AA9FF, WRONG = 0x70FF4040, STATE = 0x70FFD54A;

    private final Hologram hologram;
    /** Cached selection: indices of the blocks to draw. */
    private int[] drawn = new int[0];
    private int drawnCount;
    private LiveCheck drawnFor;
    private long drawnRevision = -1;
    private int drawnChunkX = Integer.MIN_VALUE, drawnChunkZ;

    HologramRenderer(Hologram hologram) { this.hologram = hologram; }

    void submit(LevelRenderContext ctx) {
        LiveCheck check = hologram.check();
        Minecraft mc = Minecraft.getInstance();
        if (check == null || !hologram.visible() || mc.level == null) return;
        if (!McCompat.dimension(mc.level).equals(check.placement().dimension())) return;
        Vec3 cam = ctx.levelState().cameraRenderState.pos;
        select(check, cam);
        PoseStack pose = ctx.poseStack();
        pose.pushPose();
        // Floats lose precision far from 0/0/0, so everything is relative to the camera.
        int ox = (int) Math.floor(cam.x), oy = (int) Math.floor(cam.y), oz = (int) Math.floor(cam.z);
        pose.translate(ox - cam.x, oy - cam.y, oz - cam.z);
        var out = ctx.submitNodeCollector();
        if (drawnCount > 0) {
            final int[] list = drawn;
            final int n = drawnCount;
            out.submitCustomGeometry(pose, RenderTypes.debugQuads(), (p, vc) -> {
                for (int k = 0; k < n; k++) {
                    int i = list[k];
                    Verdict v = check.verdict(i);
                    int color = v == Verdict.MISSING ? MISSING : v == Verdict.WRONG ? WRONG : v == Verdict.STATE ? STATE : 0;
                    if (color == 0) continue;
                    float g = v == Verdict.MISSING ? -0.02f : 0.006f;
                    box(p, vc, check.worldX(i) - ox - g, check.worldY(i) - oy - g, check.worldZ(i) - oz - g,
                            check.worldX(i) - ox + 1 + g, check.worldY(i) - oy + 1 + g, check.worldZ(i) - oz + 1 + g, color);
                }
            });
        }
        int[] b = check.worldBox();
        int target = hologram.target();
        out.submitCustomGeometry(pose, RenderTypes.lines(), (p, vc) -> {
            frame(p, vc, b[0] - ox, b[1] - oy, b[2] - oz, b[3] + 1 - ox, b[4] + 1 - oy, b[5] + 1 - oz, 0xFFFFFFFF, 2.0f);
            if (target >= 0) {
                float x = check.worldX(target) - ox, y = check.worldY(target) - oy, z = check.worldZ(target) - oz;
                frame(p, vc, x - 0.04f, y - 0.04f, z - 0.04f, x + 1.04f, y + 1.04f, z + 1.04f, 0xFFFF40FF, 4.0f);
                // A vertical beam makes the target easy to find from far away.
                line(p, vc, x + 0.5f, y + 1.04f, z + 0.5f, x + 0.5f, y + 24f, z + 0.5f, 0xFFFF40FF, 4.0f);
            }
        });
        pose.popPose();
    }

    /** Recompute which blocks to draw when verdicts changed or the camera moved to another chunk. */
    private void select(LiveCheck check, Vec3 cam) {
        int cx = (int) Math.floor(cam.x) >> 4, cz = (int) Math.floor(cam.z) >> 4;
        if (check == drawnFor && check.revision() == drawnRevision && cx == drawnChunkX && cz == drawnChunkZ) return;
        drawnFor = check;
        drawnRevision = check.revision();
        drawnChunkX = cx;
        drawnChunkZ = cz;
        drawnCount = 0;
        int r = (RADIUS >> 4) + 1;
        // Rings from the camera chunk outwards, so the limit cuts the farthest blocks.
        for (int ring = 0; ring <= r && drawnCount < MAX_BLOCKS; ring++) {
            for (int dx = -ring; dx <= ring; dx++) for (int dz = -ring; dz <= ring; dz++) {
                if (Math.max(Math.abs(dx), Math.abs(dz)) != ring) continue;
                for (int i : check.inChunk(cx + dx, cz + dz)) {
                    Verdict v = check.verdict(i);
                    if (v == Verdict.OK || v == Verdict.UNKNOWN) continue;
                    if (Math.abs(check.worldY(i) - cam.y) > RADIUS) continue;
                    if (drawnCount == MAX_BLOCKS) break;
                    if (drawnCount == drawn.length) drawn = Arrays.copyOf(drawn, Math.max(1024, drawn.length * 2));
                    drawn[drawnCount++] = i;
                }
            }
        }
    }

    private static void box(PoseStack.Pose p, VertexConsumer vc, float x0, float y0, float z0, float x1, float y1, float z1, int c) {
        quad(p, vc, x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, c); // bottom
        quad(p, vc, x0, y1, z0, x0, y1, z1, x1, y1, z1, x1, y1, z0, c); // top
        quad(p, vc, x0, y0, z0, x0, y1, z0, x1, y1, z0, x1, y0, z0, c); // north
        quad(p, vc, x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, c); // south
        quad(p, vc, x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0, c); // west
        quad(p, vc, x1, y0, z0, x1, y1, z0, x1, y1, z1, x1, y0, z1, c); // east
    }

    private static void quad(PoseStack.Pose p, VertexConsumer vc, float ax, float ay, float az, float bx, float by, float bz,
            float cx, float cy, float cz, float dx, float dy, float dz, int c) {
        vc.addVertex(p, ax, ay, az).setColor(c);
        vc.addVertex(p, bx, by, bz).setColor(c);
        vc.addVertex(p, cx, cy, cz).setColor(c);
        vc.addVertex(p, dx, dy, dz).setColor(c);
    }

    private static void frame(PoseStack.Pose p, VertexConsumer vc, float x0, float y0, float z0, float x1, float y1, float z1, int c, float w) {
        float[][] corners = { { x0, y0, z0 }, { x1, y0, z0 }, { x1, y0, z1 }, { x0, y0, z1 }, { x0, y1, z0 }, { x1, y1, z0 }, { x1, y1, z1 }, { x0, y1, z1 } };
        int[][] edges = { { 0, 1 }, { 1, 2 }, { 2, 3 }, { 3, 0 }, { 4, 5 }, { 5, 6 }, { 6, 7 }, { 7, 4 }, { 0, 4 }, { 1, 5 }, { 2, 6 }, { 3, 7 } };
        for (int[] e : edges) {
            float[] a = corners[e[0]], b = corners[e[1]];
            line(p, vc, a[0], a[1], a[2], b[0], b[1], b[2], c, w);
        }
    }

    private static void line(PoseStack.Pose p, VertexConsumer vc, float ax, float ay, float az, float bx, float by, float bz, int c, float w) {
        float nx = bx - ax, ny = by - ay, nz = bz - az;
        float len = (float) Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len; ny /= len; nz /= len;
        vc.addVertex(p, ax, ay, az).setColor(c).setNormal(p, nx, ny, nz).setLineWidth(w);
        vc.addVertex(p, bx, by, bz).setColor(c).setNormal(p, nx, ny, nz).setLineWidth(w);
    }
}
