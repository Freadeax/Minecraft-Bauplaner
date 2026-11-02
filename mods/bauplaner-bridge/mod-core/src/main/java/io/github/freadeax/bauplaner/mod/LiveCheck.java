package io.github.freadeax.bauplaner.mod;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Running comparison of a placed plan with the world. Every planned block has a verdict; the game
 * reports changed blocks ({@link #update}) and sweeps loaded blocks in small slices ({@link #sweep}),
 * so the progress follows the building without a scan command. Read-only towards the world.
 */
public final class LiveCheck {
    /** Reads one world block; {@code null} when its chunk is not loaded. */
    @FunctionalInterface
    public interface WorldReader { BlockState stateAt(int x, int y, int z); }

    private final PlanModel plan;
    private final Placement placement;
    private final BlockState[] expected;
    private final int[] world;
    private final Verdict[] verdicts;
    private final BlockState[] found;
    private final Map<Long, Integer> byPosition = new HashMap<>();
    private final Map<Long, int[]> byChunk = new HashMap<>();
    private final EnumMap<Verdict, Integer> counts = new EnumMap<>(Verdict.class);
    private int sweepNext;
    private long revision;

    public LiveCheck(PlanModel plan, Placement placement) {
        this.plan = plan;
        this.placement = placement;
        int n = plan.blockCount();
        expected = new BlockState[n];
        world = new int[n * 3];
        verdicts = new Verdict[n];
        found = new BlockState[n];
        Arrays.fill(verdicts, Verdict.UNKNOWN);
        for (Verdict v : Verdict.values()) counts.put(v, 0);
        counts.put(Verdict.UNKNOWN, n);
        Map<Long, List<Integer>> chunks = new HashMap<>();
        for (int i = 0; i < n; i++) {
            int[] w = placement.toWorld(plan.x(i), plan.y(i), plan.z(i));
            System.arraycopy(w, 0, world, i * 3, 3);
            expected[i] = placement.toWorld(plan.state(i));
            byPosition.put(key(w[0], w[1], w[2]), i);
            chunks.computeIfAbsent(chunkKey(w[0] >> 4, w[2] >> 4), k -> new ArrayList<>()).add(i);
        }
        chunks.forEach((k, list) -> byChunk.put(k, list.stream().mapToInt(Integer::intValue).toArray()));
    }

    public static long key(int x, int y, int z) { return ((long) (x & 0x3FFFFFF) << 38) | ((long) (z & 0x3FFFFFF) << 12) | (y & 0xFFF); }
    public static long chunkKey(int cx, int cz) { return ((long) cx << 32) | (cz & 0xFFFFFFFFL); }

    public PlanModel plan() { return plan; }
    public Placement placement() { return placement; }
    public int size() { return verdicts.length; }
    public int worldX(int i) { return world[i * 3]; }
    public int worldY(int i) { return world[i * 3 + 1]; }
    public int worldZ(int i) { return world[i * 3 + 2]; }
    public BlockState expected(int i) { return expected[i]; }
    public BlockState found(int i) { return found[i]; }
    public Verdict verdict(int i) { return verdicts[i]; }
    public int count(Verdict v) { return counts.get(v); }
    /** Increases on every verdict change; renderers rebuild when it moved. */
    public long revision() { return revision; }

    /** Planned blocks inside a chunk (indices), empty when none. */
    public int[] inChunk(int cx, int cz) { return byChunk.getOrDefault(chunkKey(cx, cz), new int[0]); }

    /** Index of the planned block at a world position, or -1. */
    public int indexAt(int x, int y, int z) { return byPosition.getOrDefault(key(x, y, z), -1); }

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
        Verdict v = BlockRules.compare(expected[i], actual);
        found[i] = actual;
        if (v == verdicts[i]) return false;
        counts.merge(verdicts[i], -1, Integer::sum);
        counts.merge(v, 1, Integer::sum);
        verdicts[i] = v;
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
        for (int i = 0; i < verdicts.length; i++) {
            Verdict v = verdicts[i];
            if (v == Verdict.OK || v == Verdict.UNKNOWN) continue;
            if (!filter.test(this, i)) continue;
            double dx = worldX(i) + 0.5 - px, dy = worldY(i) + 0.5 - py, dz = worldZ(i) + 0.5 - pz;
            double score = dx * dx + dy * dy + dz * dz + (v == Verdict.MISSING ? 0.25 : 0);
            if (score < bestScore) { bestScore = score; best = i; }
        }
        return best;
    }

    /** Verdict counts of the planned blocks at world heights {@code minY..maxY}, indexed by {@link Verdict#ordinal()}. */
    public int[] countLayers(int minY, int maxY) { return count(new Filter(minY, maxY, 0)); }

    /** Verdict counts of the planned blocks inside a filter, indexed by {@link Verdict#ordinal()}. */
    public int[] count(Filter filter) {
        int[] out = new int[Verdict.values().length];
        for (int i = 0; i < verdicts.length; i++) if (filter.test(this, i)) out[verdicts[i].ordinal()]++;
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
