package io.github.freadeax.bauplaner.mod.live;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Weltplan marks the website sent for one dimension (MAP-03): building sites, paths and points.
 * The mod only draws them (client side) and points the way on the HUD; nothing is built.
 * Same field names and limits as the website (packages/domain/src/worldPlan.ts).
 */
public record WorldMarks(String dimension, List<Site> sites, List<Path> paths, List<Point> points) {
    public static final int MAX_ITEMS = 500;
    private static final Set<String> POINT_TYPES = Set.of("anker", "ziel", "lager", "portal", "farm", "treffpunkt");
    private static final Set<String> PATH_STYLES = Set.of("weg", "strasse", "bahn", "bruecke");
    private static final int XZ = 29_999_984;

    public record Site(String name, int minX, int minZ, int width, int length, Integer y) {}
    public record Path(String name, String style, int width, int[][] points) {}
    public record Point(String name, String type, int x, int y, int z) {}

    public static final WorldMarks NONE = new WorldMarks("", List.of(), List.of(), List.of());

    public int size() { return sites.size() + paths.size() + points.size(); }

    public static WorldMarks parse(Map<String, Object> body) {
        String dimension = Json.str(body.get("dimension"), "Dimension", 200);
        if (!dimension.matches("[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}")) throw new Json.JsonException("Dimension ungültig");
        List<Object> items = Json.arr(body.get("items"), "Einträge");
        if (items.size() > MAX_ITEMS) throw new Json.JsonException("Höchstens " + MAX_ITEMS + " Markierungen");
        List<Site> sites = new ArrayList<>();
        List<Path> paths = new ArrayList<>();
        List<Point> points = new ArrayList<>();
        for (Object o : items) {
            Map<String, Object> m = Json.obj(o, "Eintrag");
            if (!dimension.equals(m.get("dimension"))) continue;
            String name = Json.str(m.get("name"), "Name", 120);
            switch (Json.str(m.get("kind"), "Art", 10)) {
                case "site" -> sites.add(new Site(name, Json.integer(m.get("minX"), "X", -XZ, XZ), Json.integer(m.get("minZ"), "Z", -XZ, XZ),
                        Json.integer(m.get("width"), "Breite", 1, 4096), Json.integer(m.get("length"), "Länge", 1, 4096),
                        m.get("y") == null ? null : Json.integer(m.get("y"), "Höhe", -2032, 2031)));
                case "path" -> {
                    String style = Json.str(m.get("style"), "Wegart", 20);
                    if (!PATH_STYLES.contains(style)) throw new Json.JsonException("Wegart unbekannt");
                    List<Object> pts = Json.arr(m.get("points"), "Wegpunkte");
                    if (pts.size() < 2 || pts.size() > 256) throw new Json.JsonException("Weg braucht 2 bis 256 Punkte");
                    int[][] p = new int[pts.size()][];
                    for (int i = 0; i < p.length; i++) {
                        List<Object> xz = Json.arr(pts.get(i), "Wegpunkt");
                        if (xz.size() != 2) throw new Json.JsonException("Wegpunkt braucht X und Z");
                        p[i] = new int[] { Json.integer(xz.get(0), "X", -XZ, XZ), Json.integer(xz.get(1), "Z", -XZ, XZ) };
                    }
                    paths.add(new Path(name, style, Json.integer(m.get("width"), "Wegbreite", 1, 15), p));
                }
                case "point" -> {
                    String type = Json.str(m.get("type"), "Punktart", 20);
                    if (!POINT_TYPES.contains(type)) throw new Json.JsonException("Punktart unbekannt");
                    points.add(new Point(name, type, Json.integer(m.get("x"), "X", -XZ, XZ), Json.integer(m.get("y"), "Y", -2032, 2031), Json.integer(m.get("z"), "Z", -XZ, XZ)));
                }
                default -> throw new Json.JsonException("Unbekannte Art");
            }
        }
        return new WorldMarks(dimension, List.copyOf(sites), List.copyOf(paths), List.copyOf(points));
    }

    /** Nearest point to a position (horizontal distance), or null. */
    public Point nearestPoint(double x, double z) {
        Point best = null;
        double bestD = Double.MAX_VALUE;
        for (Point p : points) {
            double d = Math.hypot(p.x() + 0.5 - x, p.z() + 0.5 - z);
            if (d < bestD) { bestD = d; best = p; }
        }
        return best;
    }

    /** Compass word from a position to a target (north = −Z). */
    public static String direction(double fromX, double fromZ, double toX, double toZ) {
        double angle = Math.toDegrees(Math.atan2(toX - fromX, -(toZ - fromZ)));
        String[] names = { "N", "NO", "O", "SO", "S", "SW", "W", "NW" };
        return names[(int) Math.floorMod(Math.round(angle / 45.0), 8L)];
    }

    /** Colour per point type (ARGB), same as the website legend. */
    public static int pointColor(String type) {
        return switch (type) {
            case "anker" -> 0xFF5FF0B0; case "ziel" -> 0xFF7AB8FF; case "lager" -> 0xFFF2B84B;
            case "portal" -> 0xFFC79BFF; case "farm" -> 0xFF8FE36A; default -> 0xFFFF8FA3;
        };
    }

    public static int pathColor(String style) {
        return switch (style) { case "strasse" -> 0xFF9AA4AB; case "bahn" -> 0xFFB07A4F; case "bruecke" -> 0xFF8C6A43; default -> 0xFFC9A66B; };
    }

    public static String typeLabel(String type) {
        return switch (type) {
            case "anker" -> "Anker"; case "ziel" -> "Ziel"; case "lager" -> "Lager"; case "portal" -> "Portal"; case "farm" -> "Farm"; default -> "Treffpunkt";
        };
    }
}
