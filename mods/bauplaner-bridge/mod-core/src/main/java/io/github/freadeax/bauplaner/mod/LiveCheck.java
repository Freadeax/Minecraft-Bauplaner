package io.github.freadeax.bauplaner.mod;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import java.util.Arrays;

/**
 * Running comparison of a placed plan with the world. Every planned block has a verdict; the game
 * reports changed blocks ({@link #update}) and sweeps loaded blocks in small slices ({@link #sweep}),
 * so the progress follows the building without a scan command. Read-only towards the world.
 *
 * <p>Big builds (SIZE-01, mod 0.9.0): no object per block. Positions are int arrays, verdicts bytes,
 * the expected world state is shared per palette entry, and the position lookup is a sorted key list per
 * chunk instead of a hash map entry per block. About 30 bytes per planned block, so four million blocks
 * fit in roughly 120 MB, and building the check for a moved hologram takes a fraction of a second.
 * Totals per build section are kept up to date, so section progress costs nothing per tick.
 */
public final class LiveCheck {
    /** Reads one world block; {@code null} when its chunk is not loaded. */
    @FunctionalInterface
    public interface WorldReader { BlockState stateAt(int x, int y, int z); }

    private static final Verdict[] VERDICTS = Verdict.values();
    private static final int V = VERDICTS.length;

    /** Planned blocks of one chunk: indices sorted by their position inside the chunk, and those positions. */
    private record Chunk(int[] indices, int[] keys) {}

    private final PlanModel plan;
    private final Placement placement;
    /** Expected world state per palette entry of the plan (turned and mirrored once, not per block). */
    private final BlockState[] expectedByState;
    private final int[] world;
    private final byte[] verdicts;
    private final BlockState[] found;
    /** Chunks of the plan's world box, by (cx − minCx) · spanCz + (cz − minCz); null where no block is planned. */
    private final Chunk[] chunks;
    private final int minCx, minCz, spanCz;
    private int chunkCount;
    private final int[] counts = new int[V];
    /** Verdict counts per build section: row = section (0 = in no section), column = verdict. */
    private final int[] sectionCounts;
    private final int sectionRows;
    private int sweepNext;
    private long revision;

    public LiveCheck(PlanModel plan, Placement placement) {
        this.plan = plan;
        this.placement = placement;
        int n = plan.blockCount();
        expectedByState = new BlockState[plan.paletteSize()];
        for (int k = 0; k < expectedByState.length; k++) expectedByState[k] = placement.toWorld(plan.paletteEntry(k));
        world = new int[n * 3];
        verdicts = new byte[n];
        found = new BlockState[n];
        Arrays.fill(verdicts, (byte) Verdict.UNKNOWN.ordinal());
        counts[Verdict.UNKNOWN.ordinal()] = n;
        sectionRows = plan.sectionNames().size() + 1;
        sectionCounts = new int[sectionRows * V];
        for (int i = 0; i < n; i++) sectionCounts[plan.section(i) * V + Verdict.UNKNOWN.ordinal()]++;
        // World positions without an array per block: the placement is a fixed integer map
        // (mirror x, then quarter turns), so every block costs two multiplications.
        int[] u = placement.toWorld(1, 0, 0), v = placement.toWorld(0, 0, 1);
        int ax = u[0] - placement.x(), az = u[2] - placement.z(), bx = v[0] - placement.x(), bz = v[2] - placement.z();
        int minCx = Integer.MAX_VALUE, minCz = Integer.MAX_VALUE, maxCx = Integer.MIN_VALUE, maxCz = Integer.MIN_VALUE;
        for (int i = 0; i < n; i++) {
            int px = plan.x(i), pz = plan.z(i);
            int wx = placement.x() + ax * px + bx * pz, wz = placement.z() + az * px + bz * pz;
            world[i * 3] = wx; world[i * 3 + 1] = placement.y() + plan.y(i); world[i * 3 + 2] = wz;
            minCx = Math.min(minCx, wx >> 4); maxCx = Math.max(maxCx, wx >> 4);
            minCz = Math.min(minCz, wz >> 4); maxCz = Math.max(maxCz, wz >> 4);
        }
        // One sort over (chunk, position inside the chunk, block) groups the blocks by chunk and orders each
        // chunk for the binary search in indexAt – no hash lookups per block. A plan box is at most 4096
        // wide, so chunk numbers fit 17 bits, positions 20 bits and block numbers 22 bits (4 194 304).
        this.minCx = minCx; this.minCz = minCz;
        spanCz = n == 0 ? 1 : maxCz - minCz + 1;
        chunks = new Chunk[n == 0 ? 0 : (maxCx - minCx + 1) * spanCz];
        long[] order = new long[n];
        for (int i = 0; i < n; i++) {
            int wx = world[i * 3], wz = world[i * 3 + 2];
            long id = (long) ((wx >> 4) - minCx) * spanCz + ((wz >> 4) - minCz);
            order[i] = id << 42 | (long) localKey(wx, world[i * 3 + 1], wz) << 22 | i;
        }
        Arrays.sort(order);
        for (int from = 0; from < n;) {
            long id = order[from] >>> 42;
            int to = from;
            while (to < n && order[to] >>> 42 == id) to++;
            int[] idx = new int[to - from], keys = new int[to - from];
            for (int j = from; j < to; j++) { idx[j - from] = (int) (order[j] & 0x3FFFFF); keys[j - from] = (int) (order[j] >>> 22 & 0xFFFFF); }
            chunks[(int) id] = new Chunk(idx, keys);
            chunkCount++;
            from = to;
        }
    }

    public static long key(int x, int y, int z) { return ((long) (x & 0x3FFFFFF) << 38) | ((long) (z & 0x3FFFFFF) << 12) | (y & 0xFFF); }
    public static long chunkKey(int cx, int cz) { return ((long) cx << 32) | (cz & 0xFFFFFFFFL); }
    /** Position inside a chunk: height (offset so negative heights stay positive), then z and x. Fits 20 bits. */
    private static int localKey(int x, int y, int z) { return ((y + 2048) & 0xFFF) << 8 | (z & 15) << 4 | (x & 15); }

    public PlanModel plan() { return plan; }
    public Placement placement() { return placement; }
    public int size() { return verdicts.length; }
    public int worldX(int i) { return world[i * 3]; }
    public int worldY(int i) { return world[i * 3 + 1]; }
    public int worldZ(int i) { return world[i * 3 + 2]; }
    public BlockState expected(int i) { return expectedByState[plan.stateIndex(i)]; }
    public BlockState found(int i) { return found[i]; }
    public Verdict verdict(int i) { return VERDICTS[verdicts[i]]; }
    public int count(Verdict v) { return counts[v.ordinal()]; }
    /** Increases on every verdict change; renderers rebuild when it moved. */
    public long revision() { return revision; }
    /** Number of chunks the plan touches (for the diagnosis report). */
    public int chunkCount() { return chunkCount; }

    private Chunk chunk(int cx, int cz) {
        int dx = cx - minCx, dz = cz - minCz;
        if (dx < 0 || dz < 0 || dz >= spanCz) return null;
        long id = (long) dx * spanCz + dz;
        return id < chunks.length ? chunks[(int) id] : null;
    }

    private static final int[] NONE = new int[0];
    /** Planned blocks inside a chunk (indices), empty when none. The array belongs to the check: read it, never change it. */
    public int[] inChunk(int cx, int cz) {
        Chunk c = chunk(cx, cz);
        return c == null ? NONE : c.indices();
    }

    /** Index of the planned block at a world position, or -1. */
    public int indexAt(int x, int y, int z) {
        Chunk c = chunk(x >> 4, z >> 4);
        if (c == null) return -1;
        int at = Arrays.binarySearch(c.keys(), localKey(x, y, z));
        if (at < 0) return -1;
        int i = c.indices()[at];
        return worldY(i) == y ? i : -1;
    }

    /** A block changed in the world (placed, broken, chunk loaded). Returns true when a planned block's verdict moved. */
    public boolean update(int x, int y, int z, BlockState actual) {
        int i = indexAt(x, y, z);
        return i >= 0 && set(i, actual);
    }

    /** A chunk was unloaded: its blocks become unknown again. */
    public void forgetChunk(int cx, int cz) {
        for (int i : inChunk(cx, cz)) set(i, null);
    }

    /** Re-reads up to {@code budget} planned blocks, round robin. Returns how many verdicts moved. */
    public int sweep(WorldReader reader, int budget) {
        int moved = 0, n = verdicts.length;
        for (int k = 0; k < Math.min(budget, n); k++) {
            int i = sweepNext;
            sweepNext = (sweepNext + 1) % n;
            if (set(i, reader.stateAt(worldX(i), worldY(i), worldZ(i)))) moved++;
        }
        return moved;
    }

    private boolean set(int i, BlockState actual) {
        Verdict v = BlockRules.compare(expected(i), actual);
        found[i] = actual;
        int before = verdicts[i];
        if (v.ordinal() == before) return false;
        counts[before]--;
        counts[v.ordinal()]++;
        int row = plan.section(i) * V;
        sectionCounts[row + before]--;
        sectionCounts[row + v.ordinal()]++;
        verdicts[i] = (byte) v.ordinal();
        revision++;
        return true;
    }

    /** Correct planned blocks in percent of all planned blocks (0–100, rounded down). */
    public int percent() { return verdicts.length == 0 ? 100 : (int) ((long) count(Verdict.OK) * 100 / verdicts.length); }

    /** Nearest block that is wrong, has a wrong state or is missing; -1 when there is none. Wrong blocks win ties of distance. */
    public int nearestProblem(double px, double py, double pz) {
        return nearestProblem(px, py, pz, Integer.MIN_VALUE, Integer.MAX_VALUE);
    }

    /** Same, only for world heights {@code minY..maxY} (layer mode). */
    public int nearestProblem(double px, double py, double pz, int minY, int maxY) {
        return nearestProblem(px, py, pz, new Filter(minY, maxY, 0));
    }

    /** Same, only inside a filter (layer mode, build section). */
    public int nearestProblem(double px, double py, double pz, Filter filter) {
        int best = -1;
        double bestScore = Double.MAX_VALUE;
        int ok = Verdict.OK.ordinal(), unknown = Verdict.UNKNOWN.ordinal(), missing = Verdict.MISSING.ordinal();
        for (int i = 0; i < verdicts.length; i++) {
            int v = verdicts[i];
            if (v == ok || v == unknown) continue;
            if (!filter.test(this, i)) continue;
            double dx = worldX(i) + 0.5 - px, dy = worldY(i) + 0.5 - py, dz = worldZ(i) + 0.5 - pz;
            double score = dx * dx + dy * dy + dz * dz + (v == missing ? 0.25 : 0);
            if (score < bestScore) { bestScore = score; best = i; }
        }
        return best;
    }

    /** Verdict counts of the planned blocks at world heights {@code minY..maxY}, indexed by {@link Verdict#ordinal()}. */
    public int[] countLayers(int minY, int maxY) { return count(new Filter(minY, maxY, 0)); }

    /**
     * Verdict counts of the planned blocks inside a filter, indexed by {@link Verdict#ordinal()}. Without a
     * height limit the kept totals answer at once (whole plan or one section); with one it counts.
     */
    public int[] count(Filter filter) {
        boolean allHeights = filter.minY() == Integer.MIN_VALUE && filter.maxY() == Integer.MAX_VALUE;
        if (allHeights && filter.section() == 0) return counts.clone();
        if (allHeights) {
            int[] out = new int[V];
            if (filter.section() > 0 && filter.section() < sectionRows) System.arraycopy(sectionCounts, filter.section() * V, out, 0, V);
            return out;
        }
        int[] out = new int[V];
        for (int i = 0; i < verdicts.length; i++) if (filter.test(this, i)) out[verdicts[i]]++;
        return out;
    }

    /** World box of the placed plan: min x/y/z and max x/y/z (inclusive), from the plan file's box. */
    public int[] worldBox() {
        int[] min = plan.min(), size = plan.size();
        int[] a = placement.toWorld(min[0], min[1], min[2]);
        int[] b = placement.toWorld(min[0] + size[0] - 1, min[1] + size[1] - 1, min[2] + size[2] - 1);
        return new int[] { Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]) };
    }
}
