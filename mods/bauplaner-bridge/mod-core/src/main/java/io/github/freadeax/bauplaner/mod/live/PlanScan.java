package io.github.freadeax.bauplaner.mod.live;

import io.github.freadeax.bauplaner.bridge.BlockSource;
import io.github.freadeax.bauplaner.bridge.Plan;
import io.github.freadeax.bauplaner.bridge.ScanJob;
import io.github.freadeax.bauplaner.mod.BlockState;
import io.github.freadeax.bauplaner.mod.Placement;
import java.time.Instant;

/**
 * Baustand for the website (MAP-05, {@code GET /v1/scan}): records the whole box of the plan that is
 * placed as hologram, in the plan's own coordinates and orientation, as a {@code bauplaner-scan} v1 file.
 * The website compares it like a recording made with {@code /bauplaner scan}, maps every cell onto its
 * construction step and can tick confirmed steps. Read-only towards the world.
 */
public final class PlanScan {
    /** Same bound as the website's recording reader and the bridge (16.7 million cells since 0.9.0). */
    public static final long MAX_VOLUME = Plan.MAX_VOLUME;
    /** Cells read per game-thread slice; the website's request waits while the game keeps running between slices. */
    public static final int CELLS_PER_SLICE = 200_000;

    public record Result(String fileName, byte[] bytes, long cells, int unloaded) {}

    private PlanScan() {}

    /**
     * World reader in project coordinates: a project position is moved to where the placement puts it,
     * and the state found there is turned back into the plan's orientation.
     */
    public static BlockSource projected(Placement placement, BlockSource world) {
        boolean plain = placement.turns() == 0 && !placement.mirror();
        return (x, y, z) -> {
            int[] w = placement.toWorld(x, y, z);
            String state = world.stateAt(w[0], w[1], w[2]);
            if (state == null || plain) return state;
            return placement.toProject(BlockState.parse(state)).toString();
        };
    }

    public static Result record(Plan plan, Placement placement, BlockSource world, int dataVersion, ScanJob.Info info, Instant at) {
        ScanJob job = begin(plan, placement, world, dataVersion, info);
        while (!job.step(CELLS_PER_SLICE)) { }
        return finish(plan, job, at);
    }

    /**
     * Starts a Baustand recording that the caller advances in slices ({@link ScanJob#step}) on the game thread,
     * so a big plan box (millions of cells) never freezes the game: each slice takes a few dozen milliseconds at most.
     */
    public static ScanJob begin(Plan plan, Placement placement, BlockSource world, int dataVersion, ScanJob.Info info) {
        if (plan.volume() > MAX_VOLUME)
            throw new LiveLinkServer.HttpError(413, "Der Plan ist zu groß für einen Baustand (" + plan.volume() + " Zellen, höchstens " + MAX_VOLUME + ").");
        return ScanJob.inProjectFrame(plan, projected(placement, world), new int[] { placement.x(), placement.y(), placement.z() }, dataVersion, info);
    }

    public static Result finish(Plan plan, ScanJob job, Instant at) {
        if (!job.finished()) throw new IllegalStateException("Aufnahme nicht fertig");
        return new Result(ScanJob.fileName(plan, at), job.toFile(at), job.total(), job.unloaded());
    }
}
