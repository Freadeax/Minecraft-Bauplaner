package io.github.freadeax.bauplaner.mod.edit;

import io.github.freadeax.bauplaner.mod.BlockRules;
import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.BlockState;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Bauhilfen im Spiel (EDIT-04, mod side): symmetry and curves while building by hand, client only. The mod never
 * places a block and sends nothing to the server; it shows ghost blocks where the player still has to build.
 * <ul>
 * <li><b>Symmetrie</b>: every block the player places near the axis becomes a source; its images under the
 * symmetry group (mirror east/west, north/south, 2- or 4-fold turns) are shown with turned states. Placing a
 * block onto a ghost follows the guide and never starts a new source. Breaking a source removes its ghosts and
 * marks images that already stand as "also break here".</li>
 * <li><b>Kurve</b>: control points set in the world; the cells of the curve (profile tube/road/wall) in the
 * chosen block are shown as ghosts – mirrored too while symmetry is on.</li>
 * </ul>
 * Pure state and arithmetic; the client feeds placements, breaks and a world reader.
 */
public final class BuildGuides {
    /** Most sources the symmetry remembers (oldest go first). */
    public static final int MAX_SOURCES = 4096;
    /** Most ghost cells in total (curve and images). */
    public static final int MAX_TARGETS = 120_000;
    /** Sources farther than this from the axis are ignored (a far-away build is not meant to be mirrored). */
    public static final int SYMMETRY_RADIUS = 256;

    /** One ghost: world cell, wanted state, from the curve (or a mirror image). */
    public record Target(int x, int y, int z, BlockState state, boolean curve) {}

    private String dimension;
    private Symmetry symmetry = Symmetry.OFF;
    private final LinkedHashMap<Long, BlockState> sources = new LinkedHashMap<>();
    /** Images of removed sources that still stand: shown red until they are gone. */
    private final LinkedHashMap<Long, BlockState> clear = new LinkedHashMap<>();
    private final List<int[]> points = new ArrayList<>();
    private Curve.Options curve = Curve.Options.of(Curve.Profile.WEG);
    private BlockState block;
    private String curveError;
    private int[] curveCells = new int[0];
    private final LinkedHashMap<Long, Target> targets = new LinkedHashMap<>();
    private boolean dirty = true;
    private long revision;

    static long key(int x, int y, int z) { return ((long) (x & 0x3FFFFFF) << 38) | ((long) (z & 0x3FFFFFF) << 12) | (y & 0xFFF); }

    // ------------------------------------------------------------------ state

    public String dimension() { return dimension; }
    public Symmetry symmetry() { return symmetry; }
    public List<int[]> points() { return List.copyOf(points); }
    public Curve.Options curve() { return curve; }
    public BlockState block() { return block; }
    public int sources() { return sources.size(); }
    /** Why the curve cannot be drawn (too few points, too big), or null. */
    public String curveError() { rebuild(); return curveError; }
    /** Counter that changes whenever the ghosts change (for render caches). */
    public long revision() { rebuild(); return revision; }
    public boolean active() { return symmetry.active() || !points.isEmpty(); }

    /** Guides belong to one dimension; switching dimension keeps them but they are not shown elsewhere. */
    public boolean in(String dim) { return dimension != null && dimension.equals(dim); }

    private void touch(String dim) {
        if (dim != null && !dim.equals(dimension)) { dimension = dim; sources.clear(); clear.clear(); points.clear(); }
        dirty = true;
    }

    public void setSymmetry(Symmetry s, String dim) {
        touch(dim);
        if (!s.active()) { sources.clear(); clear.clear(); }
        symmetry = s;
    }

    public void addPoint(int x, int y, int z, String dim) {
        touch(dim);
        if (points.size() >= Curve.MAX_POINTS) throw new IllegalArgumentException("Höchstens " + Curve.MAX_POINTS + " Kurvenpunkte.");
        points.add(new int[] { x, y, z });
    }

    /** Removes the last point; false when there was none. */
    public boolean undoPoint() {
        if (points.isEmpty()) return false;
        points.remove(points.size() - 1);
        dirty = true;
        return true;
    }

    public void clearCurve() { points.clear(); dirty = true; }

    /** Moves all points (and so the curve) up or down. */
    public void shiftCurve(int dy) { for (int[] p : points) p[1] += dy; dirty = true; }

    public void setCurve(Curve.Options o) { curve = o; dirty = true; }
    public void setBlock(BlockState b) { block = b; dirty = true; }

    public void clearAll() { sources.clear(); clear.clear(); points.clear(); symmetry = Symmetry.OFF; dirty = true; }

    // ------------------------------------------------------------------ placing and breaking

    /**
     * The player placed {@code state} at x/y/z (seen on the client after the click). Returns true when it became a
     * symmetry source; a block placed onto a ghost (following the guide) or on a curve cell is no source.
     */
    public boolean placed(int x, int y, int z, BlockState state, String dim) {
        if (!symmetry.active() || state == null || state.isAir() || !in(dim)) return false;
        rebuild();
        long k = key(x, y, z);
        if (targets.containsKey(k)) return false;
        if (Math.abs(2 * x - symmetry.cx2()) > 2 * SYMMETRY_RADIUS || Math.abs(2 * z - symmetry.cz2()) > 2 * SYMMETRY_RADIUS) return false;
        sources.remove(k);
        sources.put(k, state);
        while (sources.size() > MAX_SOURCES) sources.remove(sources.keySet().iterator().next());
        clear.remove(k);
        dirty = true;
        return true;
    }

    /** The player broke x/y/z. A source takes its ghosts with it; images that already stand get a "break" mark. */
    public boolean broken(int x, int y, int z, String dim) {
        if (!in(dim)) return false;
        long k = key(x, y, z);
        clear.remove(k);
        BlockState s = sources.remove(k);
        if (s == null) return false;
        for (Symmetry.Turn t : symmetry.group().subList(1, symmetry.group().size())) {
            int[] p = symmetry.image(x, y, z, t);
            long pk = key(p[0], p[1], p[2]);
            if (!sources.containsKey(pk)) clear.put(pk, symmetry.state(s, t));
        }
        dirty = true;
        return true;
    }

    // ------------------------------------------------------------------ ghosts

    /** All ghost cells (curve cells first, then images), rebuilt when something changed. */
    public Collection<Target> targets() { rebuild(); return targets.values(); }

    /** Cells marked "also break here" with the state that stands there. */
    public Map<int[], BlockState> toBreak() {
        Map<int[], BlockState> out = new LinkedHashMap<>();
        for (var e : clear.entrySet()) out.put(unkey(e.getKey()), e.getValue());
        return out;
    }

    /** Drops break marks whose block is gone (reader null = not loaded, kept). */
    public void sweepBreaks(LiveCheck.WorldReader reader) {
        clear.entrySet().removeIf(e -> {
            int[] p = unkey(e.getKey());
            BlockState now = reader.stateAt(p[0], p[1], p[2]);
            return now != null && (now.isAir() || !now.id().equals(e.getValue().id()));
        });
    }

    static int[] unkey(long k) { return new int[] { (int) (k >> 38), (int) ((k << 52) >> 52), (int) ((k << 26) >> 38) }; }

    private void rebuild() {
        if (!dirty) return;
        dirty = false;
        revision++;
        targets.clear();
        curveError = null;
        curveCells = new int[0];
        List<Symmetry.Turn> group = symmetry.active() ? symmetry.group() : List.of(new Symmetry.Turn(0, false));
        if (points.size() >= 2 && block != null) {
            try {
                List<int[]> cells = Curve.cells(points, curve);
                curveCells = new int[cells.size() * 3];
                for (int i = 0; i < cells.size(); i++) { int[] c = cells.get(i); curveCells[i * 3] = c[0]; curveCells[i * 3 + 1] = c[1]; curveCells[i * 3 + 2] = c[2]; }
                for (Symmetry.Turn t : group) for (int[] c : cells) {
                    int[] p = t.quarterTurns() == 0 && !t.mirrorX() ? c : symmetry.image(c[0], c[1], c[2], t);
                    if (!add(p, symmetry.state(block, t), true)) { curveError = "Zu viele Geisterblöcke – nur ein Teil wird gezeigt."; break; }
                }
            } catch (IllegalArgumentException e) {
                curveError = e.getMessage();
            }
        } else if (points.size() == 1) curveError = "Noch einen Punkt setzen.";
        else if (!points.isEmpty() && block == null) curveError = "Erst einen Block für die Kurve wählen.";
        if (symmetry.active()) {
            List<Symmetry.Turn> images = group.subList(1, group.size());
            for (var e : sources.entrySet()) {
                int[] s = unkey(e.getKey());
                for (Symmetry.Turn t : images) {
                    int[] p = symmetry.image(s[0], s[1], s[2], t);
                    if (sources.containsKey(key(p[0], p[1], p[2]))) continue;
                    if (!add(p, symmetry.state(e.getValue(), t), false)) return;
                }
            }
        }
    }

    private boolean add(int[] p, BlockState s, boolean curveCell) {
        if (targets.size() >= MAX_TARGETS) return false;
        targets.putIfAbsent(key(p[0], p[1], p[2]), new Target(p[0], p[1], p[2], s, curveCell));
        return true;
    }

    /** Cells of the curve itself (without images), x/y/z flat; empty when no curve is drawn. */
    public int[] curveCells() { rebuild(); return curveCells; }

    // ------------------------------------------------------------------ checking

    /** Counts of the ghosts against the world: done, open (missing), wrong (other block or state), unknown. */
    public record Progress(int done, int open, int wrong, int unknown) {
        public int total() { return done + open + wrong + unknown; }
    }

    public Progress progress(LiveCheck.WorldReader reader) {
        int done = 0, open = 0, wrong = 0, unknown = 0;
        for (Target t : targets()) {
            switch (verdict(t, reader)) {
                case OK -> done++;
                case MISSING -> open++;
                case UNKNOWN -> unknown++;
                default -> wrong++;
            }
        }
        return new Progress(done, open, wrong, unknown);
    }

    public static Verdict verdict(Target t, LiveCheck.WorldReader reader) { return BlockRules.compare(t.state(), reader.stateAt(t.x(), t.y(), t.z())); }
}
