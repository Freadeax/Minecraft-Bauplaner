package io.github.freadeax.bauplaner.bridge.session;

import io.github.freadeax.bauplaner.bridge.BlockSource;

/**
 * Everything a {@link BridgeSession} needs from the game, implemented once per loader and Minecraft
 * version (Fabric/NeoForge/Forge client: the local player; Paper: one host per player or the console).
 * Implementations only read the world and talk to the person who runs the commands.
 * Java 17 compatible on purpose (the Paper plugin compiles the core with release 17).
 */
public interface BridgeHost {
    /** Normal feedback line, only visible to the person who runs the commands. */
    void say(String text);

    /** Error feedback line. */
    void error(String text);

    /** Short status line (action bar above the hotbar); may fall back to {@link #say}. */
    default void status(String text) {}

    /** True while a world is loaded and the person is in it; a running scan stops otherwise. */
    boolean inWorld();

    /**
     * Key for the stored plan and anchor, e.g. {@code server:<address>} or {@code welt:<name>}.
     * A server plugin may include the plan or player to keep several anchors per world.
     */
    String worldKey();

    /** Dimension (or world) the person is in now, e.g. {@code minecraft:overworld}. */
    String dimension();

    /** Block the person looks at, or {@code null} when there is none (console). */
    int[] targetBlock();

    /** Read-only block access for the given dimension. */
    BlockSource blocks(String dimension);

    /**
     * Called every tick before cells are read; return {@code false} while the host still prepares
     * the area (e.g. a server loads generated chunks asynchronously). Default: ready at once.
     */
    default boolean prepareScan(String dimension, int[] worldMin, int[] size) { return true; }

    /** Called once when a scan ends (finished, cancelled or failed), e.g. to release chunk tickets. */
    default void scanEnded() {}

    int dataVersion();

    String gameVersion();

    String modVersion();

    /** {@code fabric}, {@code neoforge}, {@code forge}, {@code paper}, … */
    String loader();

    /** {@code client} (chunks the player has loaded) or {@code server} (server world). */
    String source();
}
