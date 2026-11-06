package io.github.freadeax.bauplaner.mod.edit;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Kurven im Spiel (EDIT-04, mod side): the same smooth Catmull-Rom curve through clicked control points as the
 * planner's workshop ({@code packages/domain/src/editor/curves.ts}), turned into cells with a profile:
 * <ul>
 * <li>{@code ROHR} (tube) round cross-section of radius r (r = 0: a single connected line),</li>
 * <li>{@code WEG} (road) flat horizontal band of {@code width} across the direction of travel,</li>
 * <li>{@code MAUER} (wall) band of {@code width} raised by {@code height} blocks.</li>
 * </ul>
 * Every result is face-connected along the path, so a wall or path has no gaps. The arithmetic is a line-by-line
 * port; {@code fixtures/edit/curve-vectors.json} holds cells computed by the planner that both sides must match.
 * Pure Java, positions only – the block comes from the player.
 */
public final class Curve {
    private Curve() {}

    public enum Profile {
        ROHR("tube", "Rohr / Linie", "pipe / line"), WEG("road", "Weg (flaches Band)", "path (flat band)"), MAUER("wall", "Mauer (Band mit Höhe)", "wall (band with height)");
        public final String id, label, labelEn;
        Profile(String id, String label, String labelEn) { this.id = id; this.label = label; this.labelEn = labelEn; }
        /** Label in the mod's language (GAME-12). */
        public String text() { return t(label, labelEn); }
        public static Profile parse(String s) {
            for (Profile p : values()) if (p.id.equals(s) || p.name().equalsIgnoreCase(s)) return p;
            throw new IllegalArgumentException("Profil rohr, weg oder mauer erwartet.");
        }
    }

    /** Same limits as the planner (radius 0–16, width 1–33, height 1–128, at most 64 points). */
    public record Options(Profile profile, int radius, int width, int height, boolean closed, double tension) {
        public Options {
            if (radius < 0 || radius > 16) throw new IllegalArgumentException("Radius 0–16 erwartet");
            if (width < 1 || width > 33) throw new IllegalArgumentException("Breite 1–33 erwartet");
            if (height < 1 || height > 128) throw new IllegalArgumentException("Höhe 1–128 erwartet");
            tension = Math.max(0, Math.min(1, tension));
        }
        public static Options of(Profile p) { return new Options(p, 0, 3, 4, false, 1); }
        public Options withProfile(Profile p) { return new Options(p, radius, width, height, closed, tension); }
        public Options withRadius(int r) { return new Options(profile, r, width, height, closed, tension); }
        public Options withWidth(int w) { return new Options(profile, radius, w, height, closed, tension); }
        public Options withHeight(int h) { return new Options(profile, radius, width, h, closed, tension); }
        public Options withClosed(boolean c) { return new Options(profile, radius, width, height, c, tension); }
        public Options withTension(double t) { return new Options(profile, radius, width, height, closed, t); }

        /** "Weg (flaches Band) · Breite 3 · offen". */
        public String label() {
            String size = switch (profile) {
                case ROHR -> "Radius " + radius;
                case WEG -> t("Breite ", "width ") + width;
                case MAUER -> t("Breite ", "width ") + width + t(" · Höhe ", " · height ") + height;
            };
            return profile.text() + " · " + size + " · " + (closed ? t("geschlossen", "closed") : t("offen", "open")) + (tension < 1 ? t(" · gerade Stücke ", " · straight parts ") + Math.round((1 - tension) * 100) + " %" : "");
        }
    }

    /** Most points of one curve, like the planner. */
    public static final int MAX_POINTS = 64;
    /** Most cells the game shows for one curve (the planner allows more per editing step; the game draws ghosts). */
    public static final int MAX_CELLS = 60_000;

    /** One dense sample: position and horizontal direction. */
    record Sample(double[] p, double[] dir) {}

    private static double[] catmull(int[] p0, int[] p1, int[] p2, int[] p3, double t, double tension) {
        double t2 = t * t, t3 = t2 * t;
        double[] out = new double[3];
        for (int i = 0; i < 3; i++) {
            double c = 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
            double lin = p1[i] + (p2[i] - p1[i]) * t;
            out[i] = lin + (c - lin) * tension;
        }
        return out;
    }

    static List<Sample> samples(List<int[]> points, boolean closedWanted, double tension) {
        if (points.size() < 2) throw new IllegalArgumentException("Eine Kurve braucht mindestens zwei Punkte");
        if (points.size() > MAX_POINTS) throw new IllegalArgumentException("Höchstens " + MAX_POINTS + " Kurvenpunkte");
        double ten = Math.max(0, Math.min(1, tension));
        boolean closed = closedWanted && points.size() >= 3;
        int n = points.size();
        java.util.function.IntFunction<int[]> at = i -> closed ? points.get(((i % n) + n) % n) : points.get(Math.max(0, Math.min(n - 1, i)));
        int segs = closed ? n : n - 1;
        List<Sample> out = new ArrayList<>();
        for (int s = 0; s < segs; s++) {
            int[] p0 = at.apply(s - 1), p1 = at.apply(s), p2 = at.apply(s + 1), p3 = at.apply(s + 2);
            double dx = p2[0] - p1[0], dy = p2[1] - p1[1], dz = p2[2] - p1[2], len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            int steps = (int) Math.max(1, Math.ceil(len * 4));
            for (int k = 0; k < steps + (s == segs - 1 ? 1 : 0); k++) out.add(new Sample(catmull(p0, p1, p2, p3, (double) k / steps, ten), new double[] { 0, 0 }));
        }
        // Horizontal direction from the neighbouring samples (central difference).
        for (int i = 0; i < out.size(); i++) {
            double[] a = out.get(Math.max(0, i - 1)).p, b = out.get(Math.min(out.size() - 1, i + 1)).p;
            double dx = b[0] - a[0], dz = b[2] - a[2];
            double l = Math.hypot(dx, dz);
            if (l < 1e-9) {
                double[] prev = i > 0 ? out.get(i - 1).dir : null;
                if (prev != null && (prev[0] != 0 || prev[1] != 0)) { dx = prev[0]; dz = prev[1]; } else { dx = 1; dz = 0; }
            } else { dx /= l; dz /= l; }
            out.get(i).dir[0] = dx; out.get(i).dir[1] = dz;
        }
        return out;
    }

    private static long key(int x, int y, int z) { return ((long) (x & 0x3FFFFFF) << 38) | ((long) (z & 0x3FFFFFF) << 12) | (y & 0xFFF); }
    private static int[] unkey(long k) {
        int x = (int) (k >> 38), z = (int) ((k << 26) >> 38), y = (int) ((k << 52) >> 52);
        return new int[] { x, y, z };
    }

    /** Adds the cell and, for a diagonal step from {@code prev}, the bridging cells (x, z, then y) so the path stays face-connected. */
    private static void addConnected(Set<Long> set, int[] prev, int[] p) {
        if (prev != null) {
            int[] cur = prev.clone();
            for (int i : new int[] { 0, 2, 1 }) while (cur[i] != p[i]) { cur[i] += Integer.signum(p[i] - cur[i]); set.add(key(cur[0], cur[1], cur[2])); }
        }
        set.add(key(p[0], p[1], p[2]));
    }

    private static int[] round3(double x, double y, double z) { return new int[] { (int) Math.round(x), (int) Math.round(y), (int) Math.round(z) }; }

    /** Cells of the curve (positions only), in the order the planner produces them. */
    public static List<int[]> cells(List<int[]> points, Options o) {
        List<Sample> samples = samples(points, o.closed(), o.tension());
        Set<Long> cells = new LinkedHashSet<>();
        if (o.profile() == Profile.ROHR) {
            int r = o.radius();
            Set<Long> spine = new LinkedHashSet<>();
            int[] prev = null;
            for (Sample s : samples) { int[] c = round3(s.p[0], s.p[1], s.p[2]); addConnected(spine, prev, c); prev = c; }
            if (r == 0) return decode(limit(spine));
            List<int[]> ball = new ArrayList<>();
            double r2 = (r + 0.5) * (r + 0.5);
            for (int dy = -r; dy <= r; dy++) for (int dz = -r; dz <= r; dz++) for (int dx = -r; dx <= r; dx++) if (dx * dx + dy * dy + dz * dz <= r2) ball.add(new int[] { dx, dy, dz });
            if ((long) spine.size() * ball.size() > MAX_CELLS * 8L) throw new IllegalArgumentException("Die Kurve ist für diesen Radius zu lang.");
            for (long k : spine) { int[] c = unkey(k); for (int[] d : ball) cells.add(key(c[0] + d[0], c[1] + d[1], c[2] + d[2])); }
        } else {
            int w = o.width();
            int h = o.profile() == Profile.MAUER ? o.height() : 1;
            double half = (w - 1) / 2.0;
            // One rail per half-block offset across the direction; neighbouring rails are at most half a block apart.
            for (double off = -half; off <= half + 1e-9; off += 0.5) {
                int[] prev = null;
                for (Sample s : samples) {
                    int[] c = round3(s.p[0] - s.dir[1] * off, s.p[1], s.p[2] + s.dir[0] * off);
                    addConnected(cells, prev, c); prev = c;
                }
            }
            if (h > 1) {
                List<Long> base = new ArrayList<>(cells);
                if ((long) base.size() * h > MAX_CELLS) throw new IllegalArgumentException("Die Mauer umfasst " + (long) base.size() * h + " Zellen; im Spiel höchstens " + MAX_CELLS + ".");
                for (long b : base) { int[] c = unkey(b); for (int dy = 1; dy < h; dy++) cells.add(key(c[0], c[1] + dy, c[2])); }
            }
        }
        return decode(limit(cells));
    }

    private static Set<Long> limit(Set<Long> cells) {
        if (cells.size() > MAX_CELLS) throw new IllegalArgumentException("Die Kurve umfasst " + cells.size() + " Zellen; im Spiel höchstens " + MAX_CELLS + ".");
        return cells;
    }

    private static List<int[]> decode(Set<Long> keys) {
        List<int[]> out = new ArrayList<>(keys.size());
        for (long k : keys) out.add(unkey(k));
        return out;
    }

    /** Approximate length in blocks (for the HUD). */
    public static double length(List<int[]> points, Options o) {
        List<Sample> s = samples(points, o.closed(), o.tension());
        double l = 0;
        for (int i = 1; i < s.size(); i++) {
            double[] a = s.get(i - 1).p, b = s.get(i).p;
            l += Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]) + (b[2] - a[2]) * (b[2] - a[2]));
        }
        return l;
    }

    /** Sample positions for drawing the curve line (every n-th sample). */
    public static List<double[]> line(List<int[]> points, Options o) {
        List<double[]> out = new ArrayList<>();
        for (Sample s : samples(points, o.closed(), o.tension())) out.add(s.p.clone());
        return out;
    }
}
