package io.github.freadeax.bauplaner.mod;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Where a plan stands in the world: the world block of project coordinate 0/0/0 (anchor), quarter
 * turns clockwise seen from above and an optional mirror of the x axis (applied before turning).
 * Positions and block states are transformed the same way as by the game's own structure rotation
 * (north → east → south → west for one clockwise turn; mirror swaps east and west).
 */
public record Placement(String dimension, int x, int y, int z, int turns, boolean mirror) {
    public Placement {
        turns = Math.floorMod(turns, 4);
    }

    public static Placement at(String dimension, int x, int y, int z) { return new Placement(dimension, x, y, z, 0, false); }

    public Placement moved(int dx, int dy, int dz) { return new Placement(dimension, x + dx, y + dy, z + dz, turns, mirror); }
    public Placement turned(int quarterTurns) { return new Placement(dimension, x, y, z, turns + quarterTurns, mirror); }
    public Placement mirrored() { return new Placement(dimension, x, y, z, turns, !mirror); }

    /** World position of a project position. */
    public int[] toWorld(int px, int py, int pz) {
        int mx = mirror ? -px : px, rx = mx, rz = pz;
        for (int i = 0; i < turns; i++) { int t = rx; rx = -rz; rz = t; }
        return new int[] { x + rx, y + py, z + rz };
    }

    /** Project position of a world position (inverse of {@link #toWorld}). */
    public int[] toProject(int wx, int wy, int wz) {
        int rx = wx - x, rz = wz - z;
        for (int i = 0; i < turns; i++) { int t = rx; rx = rz; rz = -t; }
        return new int[] { mirror ? -rx : rx, wy - y, rz };
    }

    /** Planned state as it must stand in the world. */
    public BlockState toWorld(BlockState s) {
        if (!mirror && turns == 0) return s;
        Map<String, String> p = new HashMap<>(s.properties());
        if (mirror) mirrorX(s.id(), p);
        for (int i = 0; i < turns; i++) turn(p);
        return s.with(p);
    }

    /** World state as it would stand in the plan (for recordings in plan coordinates). */
    public BlockState toProject(BlockState s) {
        if (!mirror && turns == 0) return s;
        Map<String, String> p = new HashMap<>(s.properties());
        for (int i = 0; i < 4 - turns; i++) turn(p);
        if (mirror) mirrorX(s.id(), p);
        return s.with(p);
    }

    private static final List<String> RING = List.of("north", "east", "south", "west");

    private static String cw(String dir) {
        int i = RING.indexOf(dir);
        return i < 0 ? dir : RING.get((i + 1) % 4);
    }

    private static String flipX(String dir) {
        return switch (dir) { case "east" -> "west"; case "west" -> "east"; default -> dir; };
    }

    /** One clockwise quarter turn of every direction-bearing property. */
    private static void turn(Map<String, String> p) {
        p.computeIfPresent("facing", (k, v) -> cw(v));
        p.computeIfPresent("axis", (k, v) -> v.equals("x") ? "z" : v.equals("z") ? "x" : v);
        p.computeIfPresent("rotation", (k, v) -> rotation16(v, r -> (r + 4) % 16));
        p.computeIfPresent("shape", (k, v) -> railShape(v, Placement::cw));
        p.computeIfPresent("orientation", (k, v) -> jigsaw(v, Placement::cw));
        rotateSides(p, Placement::cw);
    }

    /** Mirror across the x axis (east ↔ west). Handedness flips with it. */
    private static void mirrorX(String id, Map<String, String> p) {
        p.computeIfPresent("facing", (k, v) -> flipX(v));
        p.computeIfPresent("rotation", (k, v) -> rotation16(v, r -> (16 - r) % 16));
        p.computeIfPresent("orientation", (k, v) -> jigsaw(v, Placement::flipX));
        p.computeIfPresent("hinge", (k, v) -> v.equals("left") ? "right" : v.equals("right") ? "left" : v);
        if (id.endsWith("_stairs")) p.computeIfPresent("shape", (k, v) -> v.replace("left", "#").replace("right", "left").replace("#", "right"));
        else p.computeIfPresent("shape", (k, v) -> railShape(v, Placement::flipX));
        if (id.endsWith("chest")) p.computeIfPresent("type", (k, v) -> v.equals("left") ? "right" : v.equals("right") ? "left" : v);
        rotateSides(p, Placement::flipX);
    }

    private static String rotation16(String v, java.util.function.IntUnaryOperator f) {
        try { return Integer.toString(f.applyAsInt(Integer.parseInt(v))); } catch (NumberFormatException e) { return v; }
    }

    /** Fences, walls, panes, redstone, vines: the side properties move to their new side. */
    private static void rotateSides(Map<String, String> p, java.util.function.UnaryOperator<String> f) {
        Map<String, String> sides = new HashMap<>();
        for (String d : RING) if (p.containsKey(d)) sides.put(f.apply(d), p.remove(d));
        p.putAll(sides);
    }

    /** Rail shapes: north_south, east_west, ascending_east, south_east … */
    private static String railShape(String v, java.util.function.UnaryOperator<String> f) {
        String[] w = v.split("_");
        if (w.length == 2 && w[0].equals("ascending")) return "ascending_" + f.apply(w[1]);
        if (w.length != 2 || !RING.contains(w[0]) || !RING.contains(w[1])) return v;
        String a = f.apply(w[0]), b = f.apply(w[1]);
        boolean straight = RING.indexOf(a) % 2 == RING.indexOf(b) % 2;
        if (straight) return RING.indexOf(a) % 2 == 0 ? "north_south" : "east_west";
        String ns = a.equals("north") || a.equals("south") ? a : b, ew = ns.equals(a) ? b : a;
        return ns + "_" + ew;
    }

    /** Jigsaw/crafter orientation like {@code north_up} or {@code up_east}. */
    private static String jigsaw(String v, java.util.function.UnaryOperator<String> f) {
        String[] w = v.split("_");
        if (w.length != 2) return v;
        return f.apply(w[0]) + "_" + f.apply(w[1]);
    }
}
