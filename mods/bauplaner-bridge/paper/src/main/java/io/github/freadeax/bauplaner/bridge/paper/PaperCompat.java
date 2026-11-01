package io.github.freadeax.bauplaner.bridge.paper;

import io.github.freadeax.bauplaner.bridge.BlockSource;
import java.util.concurrent.CompletableFuture;
import org.bukkit.Bukkit;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.plugin.Plugin;

/**
 * Every call whose availability differs between Minecraft/Paper versions (1.18.2 … 26.x) or between
 * Paper and plain Spigot. Each falls back to an older or more general method instead of failing, so
 * the same jar runs on every supported server.
 */
final class PaperCompat {
    private PaperCompat() {}

    /** DataVersion of the running server, 0 if the server does not reveal it. */
    @SuppressWarnings("deprecation")
    static int dataVersion() {
        try {
            return Bukkit.getUnsafe().getDataVersion();
        } catch (Throwable e) {
            return 0;
        }
    }

    /** Minecraft version such as {@code 26.3} or {@code 1.21.11}. */
    static String gameVersion() {
        try {
            return Bukkit.getMinecraftVersion();
        } catch (Throwable e) {
            // Spigot: "1.21.4-R0.1-SNAPSHOT"
            return Bukkit.getBukkitVersion().split("-")[0];
        }
    }

    /** "paper", "folia", "purpur", "spigot" … for the scan metadata. */
    static String loader() {
        String name = Bukkit.getName().toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
        return name.isEmpty() ? "bukkit" : name;
    }

    @SuppressWarnings("deprecation")
    static String pluginVersion(Plugin plugin) {
        return plugin.getDescription().getVersion();
    }

    /**
     * Dimension id of a world, e.g. {@code minecraft:overworld}; extra worlds of a server have their
     * own key ({@code minecraft:bauwelt}), so the id also tells the worlds of one server apart.
     */
    static String dimension(World world) {
        try {
            return world.getKey().toString();
        } catch (Throwable e) {
            // Spigot before world keys: vanilla dimension ids for the default worlds, folder name otherwise.
            String main = Bukkit.getWorlds().get(0).getName();
            if (world.getName().equals(main)) return "minecraft:overworld";
            if (world.getName().equals(main + "_nether")) return "minecraft:the_nether";
            if (world.getName().equals(main + "_the_end")) return "minecraft:the_end";
            return "bukkit:" + world.getName().toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z0-9_./-]", "_");
        }
    }

    /** World by dimension id ({@link #dimension}), by world folder name or by a short name such as {@code nether}. */
    static World findWorld(String name) {
        String n = name.toLowerCase(java.util.Locale.ROOT);
        for (World w : Bukkit.getWorlds()) {
            String d = dimension(w);
            if (d.equals(n) || w.getName().equalsIgnoreCase(name) || d.endsWith(":" + n)) return w;
        }
        return null;
    }

    /** Block the player looks at (up to 10 blocks), otherwise the block below the feet. */
    static Block targetBlock(Player player) {
        Block hit = player.getTargetBlockExact(10);
        return hit != null ? hit : player.getLocation().getBlock().getRelative(0, -1, 0);
    }

    /**
     * Loads a chunk without generating it. Completes with false when the chunk was never generated.
     * Paper loads asynchronously; plain Spigot loads synchronously on the main thread.
     */
    static CompletableFuture<Boolean> loadExisting(World world, int cx, int cz) {
        try {
            return world.getChunkAtAsync(cx, cz, false).thenApply(c -> c != null);
        } catch (Throwable e) {
            if (!world.isChunkGenerated(cx, cz)) return CompletableFuture.completedFuture(false);
            return CompletableFuture.completedFuture(world.loadChunk(cx, cz, false));
        }
    }

    /** Keeps the chunk loaded until {@link #release}; plugin tickets exist since 1.14. */
    static void hold(World world, int cx, int cz, Plugin plugin) {
        world.addPluginChunkTicket(cx, cz, plugin);
    }

    static void release(World world, int cx, int cz, Plugin plugin) {
        world.removePluginChunkTicket(cx, cz, plugin);
    }

    /**
     * Read-only view on the server world. Unloaded chunks are reported ({@code null}) and never loaded
     * or generated here; loading happens beforehand in {@link ServerScan}.
     */
    static BlockSource serverBlocks(World world) {
        int min = world.getMinHeight(), max = world.getMaxHeight();
        return (x, y, z) -> {
            if (y < min || y >= max) return "minecraft:air";
            if (!world.isChunkLoaded(x >> 4, z >> 4)) return null;
            return world.getBlockAt(x, y, z).getBlockData().getAsString();
        };
    }

    /** Short status line above the hotbar (action bar). */
    @SuppressWarnings("deprecation")
    static void actionBar(Player player, String text) {
        try {
            player.sendActionBar(text);
        } catch (Throwable e) {
            // Older or non-Paper servers without the String variant: skip the status line.
        }
    }
}
