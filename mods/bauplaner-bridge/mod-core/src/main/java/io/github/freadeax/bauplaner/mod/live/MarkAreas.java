package io.github.freadeax.bauplaner.mod.live;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Predicate;

/**
 * Ground areas of Weltplan marks (GAME-07-S11, mod 0.19.0): building sites (rectangles), zones (polygons)
 * and paths (centre line with its width) as a column test, so the hologram can grey out what lies in a
 * locked area and show only the part of a plan inside one named group. Points have no area. A column is
 * tested by its centre, with the same rules the website uses (worldPlan.ts: insideZone, pathColumns
 * approximately: a column belongs to a path when its centre is within half the width of the centre line).
 */
public final class MarkAreas {
    /** Columns of the world: {@code contains(x, z)} for block coordinates. */
    @FunctionalInterface
    public interface Area {
        boolean contains(int x, int z);

        default Area and(Area other) { return other == null ? this : (x, z) -> contains(x, z) && other.contains(x, z); }

        default Area andNot(Area other) { return other == null ? this : (x, z) -> contains(x, z) && !other.contains(x, z); }

        Area EVERYWHERE = (x, z) -> true;
    }

    private record Shape(int minX, int minZ, int maxX, int maxZ, Area test) {}

    private final List<Shape> shapes;

    private MarkAreas(List<Shape> shapes) { this.shapes = shapes; }

    /** Number of entries with an area (sites, zones, paths) that were taken. */
    public int size() { return shapes.size(); }

    public boolean isEmpty() { return shapes.isEmpty(); }

    /** Whether any taken entry covers the column. Bounding boxes first, so most entries cost one compare. */
    public boolean contains(int x, int z) {
        for (Shape s : shapes) if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ && s.test.contains(x, z)) return true;
        return false;
    }

    /** As an {@link Area}; null when empty, so filters can skip the test. */
    public Area area() { return shapes.isEmpty() ? null : this::contains; }

    /** Areas of the locked entries. */
    public static MarkAreas locked(WorldMarks m) { return of(m, e -> e.locked()); }

    /** Areas of the entries in one named group. */
    public static MarkAreas group(WorldMarks m, String group) { return of(m, e -> e.group().equals(group)); }

    /** Areas of the entries in any of these groups (hidden groups). */
    public static MarkAreas groups(WorldMarks m, Set<String> groups) { return groups.isEmpty() ? new MarkAreas(List.of()) : of(m, e -> !e.group().isEmpty() && groups.contains(e.group())); }

    /** Areas of the entries whose extras pass a test. */
    public static MarkAreas of(WorldMarks m, Predicate<WorldMarks.Extras> which) {
        List<Shape> out = new ArrayList<>();
        for (WorldMarks.Site s : m.sites()) {
            if (!which.test(s.extras())) continue;
            int x1 = s.minX() + s.width() - 1, z1 = s.minZ() + s.length() - 1;
            out.add(new Shape(s.minX(), s.minZ(), x1, z1, (x, z) -> true));
        }
        for (WorldMarks.Zone zone : m.zones()) {
            if (!which.test(zone.extras())) continue;
            int[] b = zone.bounds();
            out.add(new Shape(b[0], b[1], b[2], b[3], (x, z) -> zone.contains(x + 0.5, z + 0.5)));
        }
        for (WorldMarks.Path p : m.paths()) {
            if (!which.test(p.extras())) continue;
            int[][] pts = p.points();
            int h = (p.width() + 1) / 2;
            int minX = Integer.MAX_VALUE, minZ = Integer.MAX_VALUE, maxX = Integer.MIN_VALUE, maxZ = Integer.MIN_VALUE;
            for (int[] q : pts) { minX = Math.min(minX, q[0]); minZ = Math.min(minZ, q[1]); maxX = Math.max(maxX, q[0]); maxZ = Math.max(maxZ, q[1]); }
            double half = p.width() / 2.0;
            out.add(new Shape(minX - h, minZ - h, maxX + h, maxZ + h, (x, z) -> nearLine(pts, x + 0.5, z + 0.5, half)));
        }
        return new MarkAreas(List.copyOf(out));
    }

    /** Whether a point lies within {@code half} blocks of the polyline through the column centres (square brush like the website). */
    static boolean nearLine(int[][] pts, double px, double pz, double half) {
        for (int i = 0; i + 1 < pts.length; i++) {
            double ax = pts[i][0] + 0.5, az = pts[i][1] + 0.5, bx = pts[i + 1][0] + 0.5, bz = pts[i + 1][1] + 0.5;
            double vx = bx - ax, vz = bz - az, len = vx * vx + vz * vz;
            double t = len == 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / len));
            // Chebyshev distance: the website widens the line with a square brush of `width` columns.
            if (Math.max(Math.abs(px - (ax + t * vx)), Math.abs(pz - (az + t * vz))) <= half) return true;
        }
        return pts.length == 1 && Math.max(Math.abs(px - pts[0][0] - 0.5), Math.abs(pz - pts[0][1] - 0.5)) <= half;
    }
}
