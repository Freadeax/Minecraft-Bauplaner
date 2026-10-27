package io.github.freadeax.bauplaner.bridge;

/**
 * Read-only view on a world, implemented per loader and Minecraft version.
 * Implementations never change the world.
 */
public interface BlockSource {
    /**
     * Full block state as {@code namespace:id[key=value,...]}, or {@code null} when the
     * position is in a chunk that is not loaded (recorded as {@link ScanJob#UNLOADED}).
     * Positions outside the build height are air.
     */
    String stateAt(int x, int y, int z);
}
