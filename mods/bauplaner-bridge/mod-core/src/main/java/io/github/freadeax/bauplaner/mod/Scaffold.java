package io.github.freadeax.bauplaner.mod;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import java.util.Set;

/**
 * Scaffold hints (GAME-07 stage 6): open plan blocks that cannot be placed right now because no neighbour
 * exists in the world to place them against ("hängend": all six neighbours empty), and falling blocks
 * (sand, gravel, concrete powder, anvils …) that would drop because nothing is below them yet. Only cells
 * the live check knows (loaded chunks) count; neighbours outside the plan are read from the world.
 */
public final class Scaffold {
    /** Counts in the filter and the nearest cell of each kind (index into the check, -1 if none). */
    public record Result(int hanging, int falling, int nearestHanging, int nearestFalling) {
        public int total() { return hanging + falling; }
    }

    private static final int[][] SIDES = { { 1, 0, 0 }, { -1, 0, 0 }, { 0, 1, 0 }, { 0, -1, 0 }, { 0, 0, 1 }, { 0, 0, -1 } };
    private static final Set<String> FALLING = Set.of("minecraft:sand", "minecraft:red_sand", "minecraft:suspicious_sand", "minecraft:gravel",
            "minecraft:suspicious_gravel", "minecraft:anvil", "minecraft:chipped_anvil", "minecraft:damaged_anvil", "minecraft:dragon_egg",
            "minecraft:scaffolding");

    private Scaffold() {}

    /** Blocks that fall when nothing holds them from below. */
    public static boolean falls(String id) { return FALLING.contains(id) || id.endsWith("_concrete_powder"); }

    /**
     * Hanging means: the open block belongs to a part of the plan that touches nothing standing in the world,
     * so even building in the best order there is nothing to place the first block against (floating roof,
     * bridge without pillars, sky island). Found by spreading from every open block that has a standing
     * neighbour through neighbouring open plan blocks; what is not reached hangs. Cells in unloaded chunks
     * count as possible support, so nothing is reported that cannot be seen.
     *
     * @param world reads blocks outside the plan (and inside when the check has not seen them yet); may return null
     *              for unloaded positions
     */
    public static Result of(LiveCheck check, Filter filter, LiveCheck.WorldReader world, double px, double py, double pz) {
        int n = check.size();
        boolean[] reached = new boolean[n];
        int[] queue = new int[n];
        int head = 0, tail = 0;
        for (int i = 0; i < n; i++) {
            if (check.verdict(i) != Verdict.MISSING) continue;
            int x = check.worldX(i), y = check.worldY(i), z = check.worldZ(i);
            for (int[] s : SIDES) {
                BlockState b = at(check, world, x + s[0], y + s[1], z + s[2]);
                if (b == null || standing(b)) { reached[i] = true; queue[tail++] = i; break; }
            }
        }
        while (head < tail) {
            int i = queue[head++];
            int x = check.worldX(i), y = check.worldY(i), z = check.worldZ(i);
            for (int[] s : SIDES) {
                int j = check.indexAt(x + s[0], y + s[1], z + s[2]);
                if (j >= 0 && !reached[j] && check.verdict(j) == Verdict.MISSING) { reached[j] = true; queue[tail++] = j; }
            }
        }
        int hanging = 0, falling = 0, nh = -1, nf = -1;
        double dh = Double.MAX_VALUE, df = Double.MAX_VALUE;
        for (int i = 0; i < n; i++) {
            if (check.verdict(i) != Verdict.MISSING || !filter.test(check, i)) continue;
            int x = check.worldX(i), y = check.worldY(i), z = check.worldZ(i);
            double d = sq(x + 0.5 - px) + sq(y + 0.5 - py) + sq(z + 0.5 - pz);
            if (!reached[i]) {
                hanging++;
                if (d < dh) { dh = d; nh = i; }
            } else if (falls(check.expected(i).id())) {
                // Falls if nothing stands below now and the plan puts nothing there either.
                BlockState below = at(check, world, x, y - 1, z);
                int under = check.indexAt(x, y - 1, z);
                if (below != null && !standing(below) && under < 0) {
                    falling++;
                    if (d < df) { df = d; nf = i; }
                }
            }
        }
        return new Result(hanging, falling, nh, nf);
    }

    private static boolean standing(BlockState b) {
        return !b.isAir() && !b.id().equals("minecraft:water") && !b.id().equals("minecraft:lava");
    }

    private static BlockState at(LiveCheck check, LiveCheck.WorldReader world, int x, int y, int z) {
        int j = check.indexAt(x, y, z);
        if (j >= 0 && check.verdict(j) != Verdict.UNKNOWN && check.found(j) != null) return check.found(j);
        return world == null ? null : world.stateAt(x, y, z);
    }

    private static double sq(double v) { return v * v; }
}
