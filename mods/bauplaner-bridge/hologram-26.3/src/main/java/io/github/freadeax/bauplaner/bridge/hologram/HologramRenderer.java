package io.github.freadeax.bauplaner.bridge.hologram;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import java.util.Arrays;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.world.phys.Vec3;

/**
 * Draws the placed plan into the world: missing blocks near the camera as see-through block models
 * (the game's own textures), farther ones as blue boxes; wrong blocks red, wrong state yellow; correct
 * blocks are hidden. Layer mode limits everything to one layer or the layers up to it. Also a frame around the whole
 * plan and a bright frame around the block the error finder points at. Only vanilla render types,
 * no shaders of its own, so it works next to Sodium and Iris. Draws nothing in other dimensions.
 */
public final class HologramRenderer {
    /** Radius (blocks) around the camera in which ghost blocks are drawn. */
    static final int RADIUS = 72;
    /** Upper limit of drawn ghost blocks per frame at budget "normal"; the nearest chunks come first. */
    static final int MAX_BLOCKS = 30_000;
    /**
     * Big builds (SIZE-01): while only verdicts change (chunks loading, the sweep), the selection is rebuilt at
     * most this often. Rebuilding walks every planned block in the radius, which for a dense city are millions.
     */
    static final long REVISION_REFRESH_NANOS = 250_000_000L;
    private long selectedAt;

    /** Extra tint and edges for textured ghosts while a shader pack is on. */
    static final int SHADER_TINT = 0x405AA9FF, SHADER_EDGE = 0xFF7FC4FF;
    static final int MISSING = 0x555AA9FF, WRONG = 0x70FF4040, STATE = 0x70FFD54A;
    /** Missing blocks this close to the camera are drawn as see-through block models. */
    static final int TEXTURED_RADIUS = 40;
    static final int MAX_TEXTURED = 6_000;
    /** X-ray: at most this many open blocks get a see-through frame (the nearest ones, chunk rings first). */
    static final int MAX_XRAY = 4_000;
    /** Direction offsets in {@link net.minecraft.core.Direction} order: down, up, north, south, west, east. */
    private static final int[][] SIDES = { { 0, -1, 0 }, { 0, 1, 0 }, { 0, 0, -1 }, { 0, 0, 1 }, { -1, 0, 0 }, { 1, 0, 0 } };

    private final GhostModels models = new GhostModels();
    /** Cached selection of textured ghosts: indices and hidden-face masks. */
    private int[] ghosts = new int[0];
    private int[] ghostFaces = new int[0];
    private GhostModels.Model[] ghostModels = new GhostModels.Model[0];
    private int ghostCount;
    private String drawnSettings = "";

    private final Hologram hologram;
    /** Cached selection: indices of the blocks to draw. */
    private int[] drawn = new int[0];
    private int drawnCount;
    private LiveCheck drawnFor;
    private long drawnRevision = -1;
    private int drawnChunkX = Integer.MIN_VALUE, drawnChunkZ;

    public HologramRenderer(Hologram hologram) { this.hologram = hologram; }

    /** Called by the loader once per frame in the level render pass, with the camera position. */
    public void submit(PoseStack pose, net.minecraft.client.renderer.SubmitNodeCollector out, Vec3 cam) {
        LiveCheck check = hologram.check();
        Minecraft mc = Minecraft.getInstance();
        if (check == null || !hologram.visible() || mc.level == null) return;
        if (!McCompat.dimension(mc.level).equals(check.placement().dimension())) return;
        select(check, cam);
        pose.pushPose();
        // Floats lose precision far from 0/0/0, so everything is relative to the camera.
        int ox = (int) Math.floor(cam.x), oy = (int) Math.floor(cam.y), oz = (int) Math.floor(cam.z);
        pose.translate(ox - cam.x, oy - cam.y, oz - cam.z);
        if (ghostCount > 0) {
            final int[] list = ghosts, faces = ghostFaces;
            final GhostModels.Model[] ms = ghostModels;
            final int n = ghostCount;
            out.submitCustomGeometry(pose, RenderTypes.entityTranslucent(net.minecraft.client.renderer.texture.TextureAtlas.LOCATION_BLOCKS), (p, vc) -> {
                for (int k = 0; k < n; k++) {
                    int i = list[k];
                    if (check.verdict(i) != Verdict.MISSING) continue;
                    GhostModels.emit(p, vc, ms[k], check.worldX(i) - ox, check.worldY(i) - oy, check.worldZ(i) - oz, 175, faces[k]);
                }
            });
        }
        if (ghostCount > 0 && McCompat.shadersActive()) {
            // Shader packs (Iris) relight and recolour the ghost textures until they look like real blocks.
            // A light blue tint plus block edges keep them recognisable as "still missing".
            final int[] list = ghosts;
            final int n = ghostCount;
            out.submitCustomGeometry(pose, RenderTypes.debugQuads(), (p, vc) -> {
                for (int k = 0; k < n; k++) {
                    int i = list[k];
                    if (check.verdict(i) != Verdict.MISSING) continue;
                    float x = check.worldX(i) - ox, y = check.worldY(i) - oy, z = check.worldZ(i) - oz;
                    box(p, vc, x - 0.01f, y - 0.01f, z - 0.01f, x + 1.01f, y + 1.01f, z + 1.01f, SHADER_TINT);
                }
            });
            out.submitCustomGeometry(pose, RenderTypes.lines(), (p, vc) -> {
                for (int k = 0; k < n; k++) {
                    int i = list[k];
                    if (check.verdict(i) != Verdict.MISSING) continue;
                    float x = check.worldX(i) - ox, y = check.worldY(i) - oy, z = check.worldZ(i) - oz;
                    frame(p, vc, x, y, z, x + 1, y + 1, z + 1, SHADER_EDGE, 1.5f);
                }
            });
        }
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
        if (hologram.xray() && drawnCount + ghostCount > 0) {
            // X-ray: frames of open blocks drawn without depth test, so hidden errors behind walls show up.
            final int[] a = drawn, g = ghosts;
            final int na = drawnCount, ng = ghostCount;
            out.submitCustomGeometry(pose, McCompat.xrayLines(), (p, vc) -> {
                int done = 0;
                final int limit = xrayLimit;
                for (int k = 0; k < ng + na && done < limit; k++) {
                    int i = k < ng ? g[k] : a[k - ng];
                    Verdict v = check.verdict(i);
                    int color = v == Verdict.MISSING ? 0xC05AA9FF : v == Verdict.WRONG ? 0xE0FF4040 : v == Verdict.STATE ? 0xE0FFD54A : 0;
                    if (color == 0) continue;
                    float x = check.worldX(i) - ox, y = check.worldY(i) - oy, z = check.worldZ(i) - oz;
                    frame(p, vc, x + 0.1f, y + 0.1f, z + 0.1f, x + 0.9f, y + 0.9f, z + 0.9f, color, 1.5f);
                    done++;
                }
            });
        }
        int[] b = check.worldBox();
        int target = hologram.target();
        boolean layered = hologram.layers() != Hologram.Layers.ALL;
        int ly = hologram.layerY();
        out.submitCustomGeometry(pose, RenderTypes.lines(), (p, vc) -> {
            frame(p, vc, b[0] - ox, b[1] - oy, b[2] - oz, b[3] + 1 - ox, b[4] + 1 - oy, b[5] + 1 - oz, 0xFFFFFFFF, 2.0f);
            // Layer mode: a cyan frame marks the current layer.
            if (layered) frame(p, vc, b[0] - ox - 0.02f, ly - oy, b[2] - oz - 0.02f, b[3] + 1.02f - ox, ly + 1 - oy, b[5] + 1.02f - oz, 0xFF40E0FF, 3.0f);
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
        String settings = hologram.layers() + "/" + hologram.layerY() + "/" + hologram.section() + "/" + hologram.sectionSet() + "/" + hologram.textured() + "/" + ((int) Math.floor(cam.y) >> 3);
        String settings2 = settings + "/" + hologram.budget();
        boolean sameView = check == drawnFor && cx == drawnChunkX && cz == drawnChunkZ && settings2.equals(drawnSettings);
        if (sameView && check.revision() == drawnRevision) return;
        long now = System.nanoTime();
        // Only verdicts moved: the draw loops skip blocks that became correct anyway, so a short delay costs nothing visible.
        if (sameView && now - selectedAt < REVISION_REFRESH_NANOS) return;
        selectedAt = now;
        drawnSettings = settings2;
        drawnFor = check;
        drawnRevision = check.revision();
        drawnChunkX = cx;
        drawnChunkZ = cz;
        drawnCount = 0;
        ghostCount = 0;
        io.github.freadeax.bauplaner.mod.Filter filter = hologram.filter();
        boolean textured = hologram.textured();
        double tr2 = (double) TEXTURED_RADIUS * TEXTURED_RADIUS;
        int r = (RADIUS >> 4) + 1;
        double f = hologram.budget().factor;
        int maxBlocks = (int) (MAX_BLOCKS * f), maxTextured = (int) (MAX_TEXTURED * f);
        xrayLimit = (int) (MAX_XRAY * f);
        boolean cut = false;
        // Rings from the camera chunk outwards, so the limit cuts the farthest blocks.
        for (int ring = 0; ring <= r && !cut; ring++) {
            for (int dx = -ring; dx <= ring && !cut; dx++) for (int dz = -ring; dz <= ring && !cut; dz++) {
                if (Math.max(Math.abs(dx), Math.abs(dz)) != ring) continue;
                for (int i : check.inChunk(cx + dx, cz + dz)) {
                    Verdict v = check.verdict(i);
                    if (v == Verdict.OK || v == Verdict.UNKNOWN) continue;
                    int wy = check.worldY(i);
                    if (!filter.test(check, i)) continue;
                    if (Math.abs(wy - cam.y) > RADIUS) continue;
                    if (textured && v == Verdict.MISSING && ghostCount < maxTextured) {
                        double gx = check.worldX(i) + 0.5 - cam.x, gy = wy + 0.5 - cam.y, gz = check.worldZ(i) + 0.5 - cam.z;
                        GhostModels.Model m = gx * gx + gy * gy + gz * gz < tr2 ? models.model(check.expected(i)) : null;
                        if (m != null) { addGhost(check, i, m, filter); continue; }
                    }
                    if (drawnCount == maxBlocks) { cut = true; break; }
                    if (drawnCount == drawn.length) drawn = Arrays.copyOf(drawn, Math.max(1024, drawn.length * 2));
                    drawn[drawnCount++] = i;
                }
            }
        }
        hologram.reportShown(drawnCount + ghostCount, cut);
    }

    /** X-ray frames at the current budget. */
    private int xrayLimit = MAX_XRAY;

    private void addGhost(LiveCheck check, int i, GhostModels.Model m, io.github.freadeax.bauplaner.mod.Filter filter) {
        if (ghostCount == ghosts.length) {
            int size = Math.max(256, ghosts.length * 2);
            ghosts = Arrays.copyOf(ghosts, size);
            ghostFaces = Arrays.copyOf(ghostFaces, size);
            ghostModels = Arrays.copyOf(ghostModels, size);
        }
        int mask = 0;
        if (m.fullCube()) {
            // Faces between two full ghost blocks are inside the wall: hide them, otherwise walls look like glass grids.
            for (int d = 0; d < 6; d++) {
                int ny = check.worldY(i) + SIDES[d][1];
                if (!filter.inHeight(ny)) continue;
                int j = check.indexAt(check.worldX(i) + SIDES[d][0], ny, check.worldZ(i) + SIDES[d][2]);
                if (j < 0 || check.verdict(j) != Verdict.MISSING || !filter.test(check, j)) continue;
                GhostModels.Model other = models.model(check.expected(j));
                if (other != null && other.fullCube()) mask |= 1 << d;
            }
        }
        ghosts[ghostCount] = i;
        ghostFaces[ghostCount] = mask;
        ghostModels[ghostCount] = m;
        ghostCount++;
    }

    static void box(PoseStack.Pose p, VertexConsumer vc, float x0, float y0, float z0, float x1, float y1, float z1, int c) {
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

    public static void frame(PoseStack.Pose p, VertexConsumer vc, float x0, float y0, float z0, float x1, float y1, float z1, int c, float w) {
        float[][] corners = { { x0, y0, z0 }, { x1, y0, z0 }, { x1, y0, z1 }, { x0, y0, z1 }, { x0, y1, z0 }, { x1, y1, z0 }, { x1, y1, z1 }, { x0, y1, z1 } };
        int[][] edges = { { 0, 1 }, { 1, 2 }, { 2, 3 }, { 3, 0 }, { 4, 5 }, { 5, 6 }, { 6, 7 }, { 7, 4 }, { 0, 4 }, { 1, 5 }, { 2, 6 }, { 3, 7 } };
        for (int[] e : edges) {
            float[] a = corners[e[0]], b = corners[e[1]];
            line(p, vc, a[0], a[1], a[2], b[0], b[1], b[2], c, w);
        }
    }

    public static void line(PoseStack.Pose p, VertexConsumer vc, float ax, float ay, float az, float bx, float by, float bz, int c, float w) {
        float nx = bx - ax, ny = by - ay, nz = bz - az;
        float len = (float) Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len; ny /= len; nz /= len;
        vc.addVertex(p, ax, ay, az).setColor(c).setNormal(p, nx, ny, nz).setLineWidth(w);
        vc.addVertex(p, bx, by, bz).setColor(c).setNormal(p, nx, ny, nz).setLineWidth(w);
    }
}
