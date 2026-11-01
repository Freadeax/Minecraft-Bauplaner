package io.github.freadeax.bauplaner.bridge.paper;

import io.github.freadeax.bauplaner.bridge.Plan;
import io.github.freadeax.bauplaner.bridge.ScanJob;
import java.util.ArrayList;
import java.util.List;
import org.bukkit.World;
import org.bukkit.plugin.Plugin;

/**
 * One recording on the server, run from the main thread tick by tick:
 * <ol>
 *   <li><b>Chunks</b>: every chunk of the plan box that is loaded gets a plugin ticket so it stays
 *       loaded until the end; with {@code load} set, chunks that exist on disk but are not loaded are
 *       loaded (a few at a time, asynchronously on Paper) and held the same way. Chunks that were never
 *       generated are never generated: their cells become {@link ScanJob#UNLOADED}.</li>
 *   <li><b>Reading</b>: {@link ScanJob} reads the cells within a time budget per tick.</li>
 * </ol>
 * {@link #close()} removes every ticket; the server then unloads the chunks as usual.
 */
final class ServerScan {
    /** Parallel chunk loads; keeps the load spread out instead of asking for thousands at once. */
    private static final int PARALLEL_LOADS = 8;
    private static final int STEP = 1024;

    final String owner;
    final String ownerName;
    final World world;
    final Plan plan;
    final ScanJob job;
    private final Plugin plugin;
    private final boolean load;
    private final List<int[]> chunks = new ArrayList<>();
    private final List<int[]> held = new ArrayList<>();
    private int nextChunk = 0;
    private int pending = 0;
    private int loadedByScan = 0;
    private int missingChunks = 0;
    private boolean closed = false;

    ServerScan(Plugin plugin, String owner, String ownerName, World world, Plan plan, ScanJob job, boolean load) {
        this.plugin = plugin;
        this.owner = owner;
        this.ownerName = ownerName;
        this.world = world;
        this.plan = plan;
        this.job = job;
        this.load = load;
        int[] min = job.worldMin();
        for (int cx = min[0] >> 4; cx <= (min[0] + plan.width() - 1) >> 4; cx++)
            for (int cz = min[2] >> 4; cz <= (min[2] + plan.length() - 1) >> 4; cz++)
                chunks.add(new int[] { cx, cz });
    }

    static long chunkCount(Plan plan, int[] worldMin) {
        long w = ((worldMin[0] + plan.width() - 1) >> 4) - (worldMin[0] >> 4) + 1;
        long l = ((worldMin[2] + plan.length() - 1) >> 4) - (worldMin[2] >> 4) + 1;
        return w * l;
    }

    int chunkTotal() { return chunks.size(); }
    int loadedByScan() { return loadedByScan; }
    int missingChunks() { return missingChunks; }
    boolean preparing() { return nextChunk < chunks.size() || pending > 0; }

    /** Percent for the status line; chunk preparation counts as the first fifth. */
    int percent() {
        if (preparing()) return (int) (20L * nextChunk / Math.max(1, chunks.size()));
        return 20 + (int) (80 * job.done() / Math.max(1, job.total()));
    }

    /**
     * Advances the recording for at most {@code budgetNanos}. Returns true once every cell is read.
     */
    boolean tick(long budgetNanos) {
        long until = System.nanoTime() + budgetNanos;
        while (nextChunk < chunks.size() && pending < PARALLEL_LOADS && System.nanoTime() < until) {
            int[] c = chunks.get(nextChunk++);
            if (world.isChunkLoaded(c[0], c[1])) { hold(c); continue; }
            if (!load) continue;
            pending++;
            PaperCompat.loadExisting(world, c[0], c[1]).whenComplete((ok, error) -> {
                // Paper completes on the main thread; the fallback completes immediately on it.
                pending--;
                if (closed) return;
                if (error == null && Boolean.TRUE.equals(ok) && world.isChunkLoaded(c[0], c[1])) { hold(c); loadedByScan++; }
                else missingChunks++;
            });
        }
        if (preparing()) return false;
        while (System.nanoTime() < until) if (job.step(STEP)) return true;
        return job.finished();
    }

    private void hold(int[] c) {
        PaperCompat.hold(world, c[0], c[1], plugin);
        held.add(c);
    }

    /** Releases all chunk tickets of this recording. Safe to call more than once. */
    void close() {
        if (closed) return;
        closed = true;
        for (int[] c : held) PaperCompat.release(world, c[0], c[1], plugin);
        held.clear();
    }
}
