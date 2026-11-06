package io.github.freadeax.bauplaner.bridge.paper;

import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.live.MarkAreas;
import io.github.freadeax.bauplaner.mod.live.WorldMarks;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * WORLD-SHARE-01: the team's Weltplan as the planner put it into the Team-Raum (document {@code weltplan},
 * packages/domain/src/world/worldShare.ts) – read without Bukkit, so it is unit tested.
 * <ul>
 *   <li>{@link #shapes}: ready map markers per dimension (the planner computed them with the same rules
 *       as the BlueMap/Dynmap writers); the plugin only draws them.</li>
 *   <li>{@link #locked}: the locked sites, zones and paths per dimension as column areas (the same
 *       {@link MarkAreas} the mod greys out), for the optional build protection.</li>
 * </ul>
 */
final class WorldShare {
    static final String FORMAT = "bauplaner-weltplan";
    static final int MAX_ITEMS = 2000, MAX_SHAPES = 6000;
    /** Marker groups in the order of the planner (MAP_SHAPE_GROUPS) with their set labels. */
    static final Map<String, String> GROUPS = new LinkedHashMap<>();
    static {
        GROUPS.put("projekte", "Build Studio: Projekte");
        GROUPS.put("bauplaetze", "Build Studio: Bauplätze");
        GROUPS.put("wege", "Build Studio: Wege");
        GROUPS.put("zonen", "Build Studio: Zonen");
        GROUPS.put("punkte", "Build Studio: Punkte");
    }

    /** One map marker: area (outline, optional height), line (path) or poi (point). */
    record Shape(String kind, String id, String label, String detail, int rgb, String group, double[][] points, Double minY, Double maxY, double y, double width, double x, double z) {
        boolean extruded() { return "area".equals(kind) && maxY != null; }
    }

    /** A locked entry with its area. */
    record Lock(String name, String kind, MarkAreas area) {}

    final String by, at;
    final int items;
    final Map<String, List<Shape>> shapes;
    final Map<String, List<Lock>> locked;

    private WorldShare(String by, String at, int items, Map<String, List<Shape>> shapes, Map<String, List<Lock>> locked) {
        this.by = by; this.at = at; this.items = items; this.shapes = shapes; this.locked = locked;
    }

    static final WorldShare NONE = new WorldShare("", "", 0, Map.of(), Map.of());

    int shapeCount() { return shapes.values().stream().mapToInt(List::size).sum(); }

    int lockCount() { return locked.values().stream().mapToInt(List::size).sum(); }

    /** The locked entry covering a column, or null. */
    Lock lockAt(String dimension, int x, int z) {
        for (Lock l : locked.getOrDefault(dimension, List.of())) if (l.area().contains(x, z)) return l;
        return null;
    }

    /** Reads the {@code doc} part of {@code GET …/doc/weltplan}. */
    @SuppressWarnings("unchecked")
    static WorldShare parse(String json) {
        Map<String, Object> doc = Json.obj(Json.parse(json), "Weltplan");
        if (!FORMAT.equals(doc.get("format"))) throw new Json.JsonException("kein geteilter Weltplan");
        List<Object> items = Json.arr(doc.get("items"), "Einträge");
        if (items.size() > MAX_ITEMS) throw new Json.JsonException("mehr als " + MAX_ITEMS + " Einträge");
        Map<String, List<Shape>> shapes = new LinkedHashMap<>();
        int n = 0;
        if (doc.get("shapes") instanceof Map<?, ?> all) {
            for (Map.Entry<?, ?> e : all.entrySet()) {
                String dim = String.valueOf(e.getKey());
                if (!dim.matches("[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}")) throw new Json.JsonException("Dimension ungültig");
                List<Shape> list = new ArrayList<>();
                for (Object o : Json.arr(e.getValue(), "Marker")) {
                    if (++n > MAX_SHAPES) throw new Json.JsonException("mehr als " + MAX_SHAPES + " Marker");
                    list.add(shape(Json.obj(o, "Marker")));
                }
                if (!list.isEmpty()) shapes.put(dim, List.copyOf(list));
            }
        }
        // Locks per dimension, one area per locked entry (so a refusal can name it).
        Set<String> dims = new LinkedHashSet<>();
        for (Object o : items) if (o instanceof Map<?, ?> m && m.get("dimension") instanceof String d) dims.add(d);
        Map<String, List<Lock>> locked = new LinkedHashMap<>();
        for (String dim : dims) {
            List<Object> mine = new ArrayList<>();
            for (Object o : items) if (o instanceof Map<?, ?> m && dim.equals(m.get("dimension")) && Boolean.TRUE.equals(m.get("locked"))) mine.add(o);
            if (mine.isEmpty()) continue;
            List<Lock> list = new ArrayList<>();
            for (Object o : mine) {
                WorldMarks one;
                try { one = WorldMarks.shared(List.of(o), dim); } catch (RuntimeException ex) { continue; }
                MarkAreas a = MarkAreas.locked(one);
                if (a.isEmpty()) continue; // points have no area
                Map<String, Object> m = (Map<String, Object>) o;
                list.add(new Lock(String.valueOf(m.get("name")), String.valueOf(m.get("kind")), a));
            }
            if (!list.isEmpty()) locked.put(dim, List.copyOf(list));
        }
        return new WorldShare(str(doc.get("by"), 64), str(doc.get("at"), 40), items.size(), shapes, locked);
    }

    private static String str(Object v, int max) { return v instanceof String s ? s.substring(0, Math.min(max, s.length())) : ""; }

    private static double num(Object v, String what) {
        if (!(v instanceof Number d) || !Double.isFinite(d.doubleValue()) || Math.abs(d.doubleValue()) > 30_000_000) throw new Json.JsonException("Marker: " + what + " ungültig");
        return d.doubleValue();
    }

    private static Shape shape(Map<String, Object> m) {
        String kind = Json.str(m.get("kind"), "Art", 10), group = Json.str(m.get("group"), "Gruppe", 20);
        if (!GROUPS.containsKey(group)) throw new Json.JsonException("Marker: Gruppe unbekannt");
        String id = Json.str(m.get("id"), "ID", 80).replaceAll("[^A-Za-z0-9_-]", "_");
        String label = Json.str(m.get("label"), "Name", 200), detail = m.get("detail") instanceof String d ? d.substring(0, Math.min(600, d.length())) : "";
        String color = m.get("color") instanceof String c && c.matches("#[0-9a-fA-F]{6}") ? c : "#f2b84b";
        int rgb = Integer.parseInt(color.substring(1), 16);
        switch (kind) {
            case "poi" -> { return new Shape(kind, id, label, detail, rgb, group, new double[0][], null, null, num(m.get("y"), "Y"), 0, num(m.get("x"), "X"), num(m.get("z"), "Z")); }
            case "line" -> { return new Shape(kind, id, label, detail, rgb, group, points(m.get("points")), null, null, num(m.get("y"), "Y"), num(m.get("width"), "Breite"), 0, 0); }
            case "area" -> {
                Double minY = m.get("minY") == null ? null : num(m.get("minY"), "Y"), maxY = m.get("maxY") == null ? null : num(m.get("maxY"), "Y");
                return new Shape(kind, id, label, detail, rgb, group, points(m.get("points")), minY, maxY, minY == null ? 64 : minY, 0, 0, 0);
            }
            default -> throw new Json.JsonException("Marker: Art unbekannt");
        }
    }

    private static double[][] points(Object raw) {
        List<Object> list = Json.arr(raw, "Punkte");
        if (list.size() < 2 || list.size() > 256) throw new Json.JsonException("Marker: 2 bis 256 Punkte");
        double[][] out = new double[list.size()][];
        for (int i = 0; i < out.length; i++) {
            List<Object> p = Json.arr(list.get(i), "Punkt");
            if (p.size() != 2) throw new Json.JsonException("Marker: Punkt braucht X und Z");
            out[i] = new double[] { num(p.get(0), "X"), num(p.get(1), "Z") };
        }
        return out;
    }

    /** HTML detail for the map pop-up (label bold, text escaped). */
    static String html(Shape s) {
        return "<b>" + esc(s.label()) + "</b>" + (s.detail().isEmpty() ? "" : "<br>" + esc(s.detail()));
    }

    private static String esc(String t) { return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;"); }

    /** Several teams on one server: their markers side by side (ids prefixed with the team, so they never collide). */
    static Map<String, List<Shape>> combine(Map<String, WorldShare> teams) {
        Map<String, List<Shape>> out = new LinkedHashMap<>();
        boolean prefix = teams.size() > 1;
        for (Map.Entry<String, WorldShare> t : teams.entrySet())
            for (Map.Entry<String, List<Shape>> e : t.getValue().shapes.entrySet())
                for (Shape s : e.getValue())
                    out.computeIfAbsent(e.getKey(), k -> new ArrayList<>()).add(prefix ? new Shape(s.kind(), t.getKey() + "_" + s.id(), s.label(), s.detail(), s.rgb(), s.group(), s.points(), s.minY(), s.maxY(), s.y(), s.width(), s.x(), s.z()) : s);
        return out;
    }
}
