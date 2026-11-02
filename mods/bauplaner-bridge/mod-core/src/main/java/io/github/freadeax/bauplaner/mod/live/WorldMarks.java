package io.github.freadeax.bauplaner.mod.live;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Weltplan marks the website sent for one dimension (MAP-03, schema 2 since MAP-06 / GAME-08): building
 * sites, paths, points and zones, each optionally on a named layer and with its own colour. The mod only
 * draws them (client side) and points the way on the HUD; nothing is built. Same field names and limits
 * as the website (packages/domain/src/worldPlan.ts); unknown fields are ignored, unknown kinds rejected.
 */
public record WorldMarks(String dimension, List<Site> sites, List<Path> paths, List<Point> points, List<Zone> zones) {
    public static final int MAX_ITEMS = 500;
    public static final int LAYER_MAX = 40;
    private static final Set<String> POINT_TYPES = Set.of("anker", "ziel", "lager", "portal", "farm", "treffpunkt", "notiz", "gefahr", "rohstoff", "spawn", "aussicht");
    private static final Set<String> PATH_STYLES = Set.of("weg", "strasse", "bahn", "bruecke");
    private static final Set<String> ZONE_CATEGORIES = Set.of("wohnen", "farm", "industrie", "lager", "natur", "gefahr", "verkehr", "sonstiges");
    private static final int XZ = 29_999_984;

    /** Layer name ("" = none) and colour (ARGB, or null = colour of the kind), shared by every entry. */
    public record Extras(String layer, Integer color) {
        public static final Extras NONE = new Extras("", null);
    }

    public record Site(String name, int minX, int minZ, int width, int length, Integer y, Extras extras) {}
    public record Path(String name, String style, int width, int[][] points, Extras extras) {}
    public record Point(String name, String type, int x, int y, int z, Extras extras) {}
    /** Polygon on the ground, corners as [x, z] (3–256). */
    public record Zone(String name, String category, int[][] points, Extras extras) {
        /** Whether a column lies inside the polygon (even-odd rule on block centres). */
        public boolean contains(double x, double z) {
            boolean in = false;
            for (int i = 0, j = points.length - 1; i < points.length; j = i++) {
                double xi = points[i][0] + 0.5, zi = points[i][1] + 0.5, xj = points[j][0] + 0.5, zj = points[j][1] + 0.5;
                if ((zi > z) != (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) in = !in;
            }
            return in;
        }

        /** minX, minZ, maxX, maxZ of the corners. */
        public int[] bounds() {
            int[] b = { Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MIN_VALUE, Integer.MIN_VALUE };
            for (int[] p : points) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); }
            return b;
        }
    }

    public static final WorldMarks NONE = new WorldMarks("", List.of(), List.of(), List.of(), List.of());

    public int size() { return sites.size() + paths.size() + points.size() + zones.size(); }

    /** Layer names in order of first use, with the number of entries on each (entries without a layer are not listed). */
    public Map<String, Integer> layers() {
        Map<String, Integer> out = new LinkedHashMap<>();
        for (Site s : sites) count(out, s.extras());
        for (Path p : paths) count(out, p.extras());
        for (Point p : points) count(out, p.extras());
        for (Zone z : zones) count(out, z.extras());
        return out;
    }

    private static void count(Map<String, Integer> out, Extras e) { if (!e.layer().isEmpty()) out.merge(e.layer(), 1, Integer::sum); }

    public static WorldMarks parse(Map<String, Object> body) {
        String dimension = Json.str(body.get("dimension"), "Dimension", 200);
        if (!dimension.matches("[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}")) throw new Json.JsonException("Dimension ungültig");
        List<Object> items = Json.arr(body.get("items"), "Einträge");
        if (items.size() > MAX_ITEMS) throw new Json.JsonException("Höchstens " + MAX_ITEMS + " Markierungen");
        List<Site> sites = new ArrayList<>();
        List<Path> paths = new ArrayList<>();
        List<Point> points = new ArrayList<>();
        List<Zone> zones = new ArrayList<>();
        for (Object o : items) {
            Map<String, Object> m = Json.obj(o, "Eintrag");
            if (!dimension.equals(m.get("dimension"))) continue;
            String name = Json.str(m.get("name"), "Name", 120);
            Extras extras = extras(m);
            switch (Json.str(m.get("kind"), "Art", 10)) {
                case "site" -> sites.add(new Site(name, Json.integer(m.get("minX"), "X", -XZ, XZ), Json.integer(m.get("minZ"), "Z", -XZ, XZ),
                        Json.integer(m.get("width"), "Breite", 1, 4096), Json.integer(m.get("length"), "Länge", 1, 4096),
                        m.get("y") == null ? null : Json.integer(m.get("y"), "Höhe", -2032, 2031), extras));
                case "path" -> {
                    String style = Json.str(m.get("style"), "Wegart", 20);
                    if (!PATH_STYLES.contains(style)) throw new Json.JsonException("Wegart unbekannt");
                    paths.add(new Path(name, style, Json.integer(m.get("width"), "Wegbreite", 1, 15), corners(m.get("points"), "Weg", 2), extras));
                }
                case "point" -> {
                    String type = Json.str(m.get("type"), "Punktart", 20);
                    if (!POINT_TYPES.contains(type)) throw new Json.JsonException("Punktart unbekannt");
                    points.add(new Point(name, type, Json.integer(m.get("x"), "X", -XZ, XZ), Json.integer(m.get("y"), "Y", -2032, 2031), Json.integer(m.get("z"), "Z", -XZ, XZ), extras));
                }
                case "zone" -> {
                    String category = Json.str(m.get("category"), "Zonenart", 20);
                    if (!ZONE_CATEGORIES.contains(category)) throw new Json.JsonException("Zonenart unbekannt");
                    zones.add(new Zone(name, category, corners(m.get("points"), "Zone", 3), extras));
                }
                default -> throw new Json.JsonException("Unbekannte Art");
            }
        }
        return new WorldMarks(dimension, List.copyOf(sites), List.copyOf(paths), List.copyOf(points), List.copyOf(zones));
    }

    private static int[][] corners(Object raw, String what, int min) {
        List<Object> pts = Json.arr(raw, what + "punkte");
        if (pts.size() < min || pts.size() > 256) throw new Json.JsonException(what + " braucht " + min + " bis 256 Punkte");
        int[][] p = new int[pts.size()][];
        for (int i = 0; i < p.length; i++) {
            List<Object> xz = Json.arr(pts.get(i), what + "punkt");
            if (xz.size() != 2) throw new Json.JsonException(what + "punkt braucht X und Z");
            p[i] = new int[] { Json.integer(xz.get(0), "X", -XZ, XZ), Json.integer(xz.get(1), "Z", -XZ, XZ) };
        }
        return p;
    }

    /** Schema 2: optional layer (text up to 40) and colour (#rrggbb); absent, null or empty = none. */
    private static Extras extras(Map<String, Object> m) {
        Object l = m.get("layer"), c = m.get("color");
        String layer = l == null ? "" : Json.str(l, "Ebene", LAYER_MAX).trim();
        Integer color = null;
        if (c != null && !"".equals(c)) {
            String s = Json.str(c, "Farbe", 7);
            if (!s.matches("#[0-9a-fA-F]{6}")) throw new Json.JsonException("Farbe muss #rrggbb sein");
            color = 0xFF000000 | Integer.parseInt(s.substring(1), 16);
        }
        return layer.isEmpty() && color == null ? Extras.NONE : new Extras(layer, color);
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

    /** First zone containing a column, or null. */
    public Zone zoneAt(double x, double z) {
        for (Zone zone : zones) if (zone.contains(x, z)) return zone;
        return null;
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
            case "portal" -> 0xFFC79BFF; case "farm" -> 0xFF8FE36A; case "treffpunkt" -> 0xFFFF8FA3;
            case "notiz" -> 0xFFFFE08A; case "gefahr" -> 0xFFFF5C5C; case "rohstoff" -> 0xFFB8C4CC;
            case "spawn" -> 0xFFF5F5F5; default -> 0xFF8AD3FF;
        };
    }

    /** Colour per zone category (ARGB), same as the website legend. */
    public static int zoneColor(String category) {
        return switch (category) {
            case "wohnen" -> 0xFFF2B84B; case "farm" -> 0xFF8FE36A; case "industrie" -> 0xFFC79BFF; case "lager" -> 0xFF5FD7E8;
            case "natur" -> 0xFF3DDC84; case "gefahr" -> 0xFFFF5C5C; case "verkehr" -> 0xFF9AA4AB; default -> 0xFF7AB8FF;
        };
    }

    public static int pathColor(String style) {
        return switch (style) { case "strasse" -> 0xFF9AA4AB; case "bahn" -> 0xFFB07A4F; case "bruecke" -> 0xFF8C6A43; default -> 0xFFC9A66B; };
    }

    /** The entry's own colour, else the colour of its kind. */
    public static int color(Extras e, int fallback) { return e.color() != null ? e.color() : fallback; }

    public static String typeLabel(String type) {
        return switch (type) {
            case "anker" -> "Anker"; case "ziel" -> "Ziel"; case "lager" -> "Lager"; case "portal" -> "Portal"; case "farm" -> "Farm";
            case "treffpunkt" -> "Treffpunkt"; case "notiz" -> "Notiz"; case "gefahr" -> "Gefahr"; case "rohstoff" -> "Rohstoff";
            case "spawn" -> "Spawn/Bett"; default -> "Aussicht";
        };
    }

    public static String categoryLabel(String category) {
        return switch (category) {
            case "wohnen" -> "Wohnen"; case "farm" -> "Farmen"; case "industrie" -> "Industrie"; case "lager" -> "Lager";
            case "natur" -> "Natur"; case "gefahr" -> "Sperrgebiet"; case "verkehr" -> "Verkehr"; default -> "Zone";
        };
    }
}
