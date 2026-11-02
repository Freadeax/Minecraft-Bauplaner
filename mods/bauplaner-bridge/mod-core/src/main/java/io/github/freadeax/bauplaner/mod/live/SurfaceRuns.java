package io.github.freadeax.bauplaner.mod.live;

import java.util.ArrayList;
import java.util.List;

/**
 * Surface of one block column for the live map: runs of equal blocks from the top down
 * ({@code [yTop, id]}), until the second solid run starts, after {@link #MAX_RUNS} runs or
 * {@link #MAX_DEPTH} blocks. The website classifies surface and ground from these runs with the
 * same rules as its region-file survey, so the mod needs no block lists of its own.
 */
public final class SurfaceRuns {
    public static final int MAX_RUNS = 16;
    public static final int MAX_DEPTH = 64;

    private SurfaceRuns() {}

    /** Read access to one column of loaded blocks. */
    public interface Column {
        /** Block id, e.g. "minecraft:grass_block"; air ids count as empty. */
        String id(int y);
        /** Full, view-blocking block (ground, stone, also logs). */
        boolean solid(int y);
    }

    /** Runs from {@code top} (highest non-air block) down to {@code bottom} (world bottom). Empty when the column is air. */
    public static List<Run> scan(Column c, int top, int bottom) {
        List<Run> out = new ArrayList<>();
        int solidRuns = 0;
        String current = null;
        for (int y = top; y >= bottom && y > top - MAX_DEPTH; y--) {
            String id = c.id(y);
            if (isAir(id)) { current = null; continue; }
            if (id.equals(current)) continue;
            current = id;
            out.add(new Run(y, id));
            if (c.solid(y) && ++solidRuns == 2) break;
            if (out.size() == MAX_RUNS) break;
        }
        return out;
    }

    public record Run(int y, String id) {}

    static boolean isAir(String id) { return id == null || id.equals("minecraft:air") || id.equals("minecraft:cave_air") || id.equals("minecraft:void_air"); }
}
