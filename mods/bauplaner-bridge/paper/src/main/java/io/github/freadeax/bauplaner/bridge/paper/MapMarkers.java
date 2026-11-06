package io.github.freadeax.bauplaner.bridge.paper;

import java.lang.reflect.Array;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.logging.Logger;
import org.bukkit.Bukkit;
import org.bukkit.World;
import org.bukkit.plugin.Plugin;

/**
 * WORLD-SHARE-01: the plugin writes the Weltplan markers into the server's web map itself – no
 * {@code .conf} block to paste, no console commands to type. BlueMap (API 2, BlueMap 3–5) and Dynmap
 * (marker API, 3.x) are reached by reflection: the plugin keeps working without them, needs no compile
 * time dependency (BlueMap's API is Java 21 bytecode, this plugin Java 17) and never ships their code.
 * <p>
 * Formats and calls: BlueMap API {@code BlueMapAPI.onEnable / getWorld(World) / BlueMapMap.getMarkerSets},
 * markers {@code ShapeMarker, ExtrudeMarker, LineMarker, POIMarker}; Dynmap {@code DynmapAPI.getMarkerAPI},
 * {@code createMarkerSet / createAreaMarker / createPolyLineMarker / createMarker}. Marker sets are not
 * persistent on either map: the plugin writes them again after every start from its cached Weltplan.
 */
final class MapMarkers {
    /** One web map plugin. */
    interface Sink {
        String name();
        /** Replaces all Build Studio marker sets of this web map with these shapes (dimension id → shapes). */
        void replace(Map<String, List<WorldShare.Shape>> shapes) throws Exception;
    }

    private final Logger log;
    private final List<Sink> sinks = new ArrayList<>();
    private Map<String, List<WorldShare.Shape>> last = Map.of();

    MapMarkers(Logger log) { this.log = log; }

    /** Looks for BlueMap and Dynmap; BlueMap calls back when its API is ready (also after /bluemap reload). */
    void enable() {
        Plugin blue = Bukkit.getPluginManager().getPlugin("BlueMap");
        if (blue != null) {
            try {
                BlueMapSink sink = new BlueMapSink(blue.getClass().getClassLoader(), this::rewrite);
                sinks.add(sink);
            } catch (Throwable e) { log.warning("Weltplan: BlueMap gefunden, aber die Schnittstelle passt nicht (" + e + ") – keine Marker auf BlueMap."); }
        }
        Plugin dyn = Bukkit.getPluginManager().getPlugin("dynmap");
        if (dyn != null) {
            try { sinks.add(new DynmapSink(dyn)); }
            catch (Throwable e) { log.warning("Weltplan: Dynmap gefunden, aber die Schnittstelle passt nicht (" + e + ") – keine Marker auf Dynmap."); }
        }
    }

    /** Names of the web maps the plugin writes to (for /bauplaner weltplan). */
    List<String> names() { List<String> out = new ArrayList<>(); for (Sink s : sinks) out.add(s.name()); return out; }

    /** Writes the shapes into every web map (main thread). */
    void write(Map<String, List<WorldShare.Shape>> shapes) {
        last = shapes;
        rewrite();
    }

    private void rewrite() {
        for (Sink s : sinks) {
            try { s.replace(last); }
            catch (Throwable e) { log.warning("Weltplan: Marker auf " + s.name() + " nicht geschrieben: " + (e.getCause() != null ? e.getCause() : e)); }
        }
    }

    static World worldOf(String dimension) {
        for (World w : Bukkit.getWorlds()) if (PaperCompat.dimension(w).equals(dimension)) return w;
        return null;
    }

    // ------------------------------------------------------------------ BlueMap

    static final class BlueMapSink implements Sink {
        private final Class<?> api, markerSet, shapeMarker, extrudeMarker, lineMarker, poiMarker, shape, line, color, v2, v3;
        private Object instance;

        BlueMapSink(ClassLoader cl, Runnable ready) throws Exception {
            api = Class.forName("de.bluecolored.bluemap.api.BlueMapAPI", true, cl);
            markerSet = Class.forName("de.bluecolored.bluemap.api.markers.MarkerSet", true, cl);
            shapeMarker = Class.forName("de.bluecolored.bluemap.api.markers.ShapeMarker", true, cl);
            extrudeMarker = Class.forName("de.bluecolored.bluemap.api.markers.ExtrudeMarker", true, cl);
            lineMarker = Class.forName("de.bluecolored.bluemap.api.markers.LineMarker", true, cl);
            poiMarker = Class.forName("de.bluecolored.bluemap.api.markers.POIMarker", true, cl);
            shape = Class.forName("de.bluecolored.bluemap.api.math.Shape", true, cl);
            line = Class.forName("de.bluecolored.bluemap.api.math.Line", true, cl);
            color = Class.forName("de.bluecolored.bluemap.api.math.Color", true, cl);
            v2 = Class.forName("com.flowpowered.math.vector.Vector2d", true, cl);
            v3 = Class.forName("com.flowpowered.math.vector.Vector3d", true, cl);
            Consumer<Object> onEnable = a -> { instance = a; Bukkit.getScheduler().runTask(Bukkit.getPluginManager().getPlugin("BauplanerBridge"), ready); };
            Consumer<Object> onDisable = a -> instance = null;
            api.getMethod("onEnable", Consumer.class).invoke(null, onEnable);
            api.getMethod("onDisable", Consumer.class).invoke(null, onDisable);
        }

        @Override public String name() { return "BlueMap"; }

        @Override public void replace(Map<String, List<WorldShare.Shape>> shapes) throws Exception {
            Object a = instance;
            if (a == null) return; // not ready yet: onEnable writes them
            for (World w : Bukkit.getWorlds()) {
                Optional<?> bw = (Optional<?>) api.getMethod("getWorld", Object.class).invoke(a, w);
                if (bw.isEmpty()) continue;
                List<WorldShare.Shape> list = shapes.getOrDefault(PaperCompat.dimension(w), List.of());
                for (Object map : (Collection<?>) findMethod(bw.get().getClass(), "getMaps").invoke(bw.get())) {
                    Method getSets = findMethod(map.getClass(), "getMarkerSets");
                    @SuppressWarnings("unchecked") Map<String, Object> sets = (Map<String, Object>) getSets.invoke(map);
                    int sorting = 0;
                    for (Map.Entry<String, String> g : WorldShare.GROUPS.entrySet()) {
                        String id = "bauplaner-" + g.getKey();
                        List<WorldShare.Shape> mine = list.stream().filter(s -> s.group().equals(g.getKey())).toList();
                        if (mine.isEmpty()) { sets.remove(id); sorting++; continue; }
                        Object set = markerSet.getConstructor(String.class, boolean.class, boolean.class).newInstance(g.getValue(), true, g.getKey().equals("bauplaetze") || g.getKey().equals("zonen"));
                        markerSet.getMethod("setSorting", int.class).invoke(set, sorting++);
                        Method put = markerSet.getMethod("put", String.class, Class.forName("de.bluecolored.bluemap.api.markers.Marker", true, markerSet.getClassLoader()));
                        for (WorldShare.Shape s : mine) put.invoke(set, s.id(), marker(s));
                        sets.put(id, set);
                    }
                }
            }
        }

        private static Method findMethod(Class<?> c, String name) throws NoSuchMethodException {
            // Implementation classes may be non-public: take the interface method.
            for (Class<?> i : allInterfaces(c)) for (Method m : i.getMethods()) if (m.getName().equals(name) && m.getParameterCount() == 0) return m;
            return c.getMethod(name);
        }

        private static List<Class<?>> allInterfaces(Class<?> c) {
            List<Class<?>> out = new ArrayList<>();
            for (Class<?> k = c; k != null; k = k.getSuperclass()) for (Class<?> i : k.getInterfaces()) out.add(i);
            return out;
        }

        private Object vec2(double x, double z) throws Exception { return v2.getConstructor(double.class, double.class).newInstance(x, z); }
        private Object vec3(double x, double y, double z) throws Exception { return v3.getConstructor(double.class, double.class, double.class).newInstance(x, y, z); }
        private Object rgba(int rgb, float a) throws Exception { return color.getConstructor(int.class, int.class, int.class, float.class).newInstance((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255, a); }

        private Object marker(WorldShare.Shape s) throws Exception {
            Object m;
            if (s.kind().equals("poi")) {
                m = poiMarker.getConstructor(String.class, v3).newInstance(s.label(), vec3(s.x() + 0.5, s.y(), s.z() + 0.5));
                poiMarker.getMethod("setDetail", String.class).invoke(m, WorldShare.html(s));
                return m;
            }
            double cx = 0, cz = 0;
            for (double[] p : s.points()) { cx += p[0]; cz += p[1]; }
            cx /= s.points().length; cz /= s.points().length;
            if (s.kind().equals("line")) {
                Object pts = Array.newInstance(v3, s.points().length);
                for (int i = 0; i < s.points().length; i++) Array.set(pts, i, vec3(s.points()[i][0], s.y(), s.points()[i][1]));
                Object l = line.getConstructor(pts.getClass()).newInstance(new Object[] { pts });
                m = lineMarker.getConstructor(String.class, v3, line).newInstance(s.label(), vec3(cx, s.y(), cz), l);
                lineMarker.getMethod("setLineWidth", int.class).invoke(m, (int) Math.max(2, Math.min(8, s.width())));
                lineMarker.getMethod("setLineColor", color).invoke(m, rgba(s.rgb(), 1f));
                lineMarker.getMethod("setDepthTestEnabled", boolean.class).invoke(m, false);
            } else {
                Object pts = Array.newInstance(v2, s.points().length);
                for (int i = 0; i < s.points().length; i++) Array.set(pts, i, vec2(s.points()[i][0], s.points()[i][1]));
                Object sh = shape.getConstructor(pts.getClass()).newInstance(new Object[] { pts });
                if (s.extruded()) {
                    m = extrudeMarker.getConstructor(String.class, v3, shape, float.class, float.class).newInstance(s.label(), vec3(cx, s.maxY(), cz), sh, (float) s.y(), (float) (double) s.maxY());
                    extrudeMarker.getMethod("setColors", color, color).invoke(m, rgba(s.rgb(), 1f), rgba(s.rgb(), 0.25f));
                    extrudeMarker.getMethod("setLineWidth", int.class).invoke(m, 2);
                } else {
                    m = shapeMarker.getConstructor(String.class, v3, shape, float.class).newInstance(s.label(), vec3(cx, s.y(), cz), sh, (float) s.y());
                    shapeMarker.getMethod("setColors", color, color).invoke(m, rgba(s.rgb(), 1f), rgba(s.rgb(), 0.25f));
                    shapeMarker.getMethod("setLineWidth", int.class).invoke(m, 2);
                    shapeMarker.getMethod("setDepthTestEnabled", boolean.class).invoke(m, false);
                }
            }
            m.getClass().getMethod("setDetail", String.class).invoke(m, WorldShare.html(s));
            return m;
        }
    }

    // ------------------------------------------------------------------ Dynmap

    static final class DynmapSink implements Sink {
        private final Plugin dynmap;

        DynmapSink(Plugin dynmap) throws Exception {
            this.dynmap = dynmap;
            dynmap.getClass().getMethod("getMarkerAPI");
        }

        @Override public String name() { return "Dynmap"; }

        private static Method method(Object target, String name, Class<?>... types) throws NoSuchMethodException {
            for (Class<?> i : BlueMapSink.allInterfaces(target.getClass())) {
                try { return i.getMethod(name, types); } catch (NoSuchMethodException ignored) { }
            }
            return target.getClass().getMethod(name, types);
        }

        @Override public void replace(Map<String, List<WorldShare.Shape>> shapes) throws Exception {
            Object api = dynmap.getClass().getMethod("getMarkerAPI").invoke(dynmap);
            if (api == null) return; // Dynmap still starting
            int priority = 10;
            for (Map.Entry<String, String> g : WorldShare.GROUPS.entrySet()) {
                String id = "bauplaner-" + g.getKey();
                Object old = method(api, "getMarkerSet", String.class).invoke(api, id);
                if (old != null) method(old, "deleteMarkerSet").invoke(old);
                List<Map.Entry<World, WorldShare.Shape>> mine = new ArrayList<>();
                for (Map.Entry<String, List<WorldShare.Shape>> e : shapes.entrySet()) {
                    World w = worldOf(e.getKey());
                    if (w != null) for (WorldShare.Shape s : e.getValue()) if (s.group().equals(g.getKey())) mine.add(Map.entry(w, s));
                }
                if (mine.isEmpty()) continue;
                Object set = method(api, "createMarkerSet", String.class, String.class, java.util.Set.class, boolean.class).invoke(api, id, g.getValue(), null, false);
                method(set, "setLayerPriority", int.class).invoke(set, priority++);
                method(set, "setHideByDefault", boolean.class).invoke(set, g.getKey().equals("bauplaetze") || g.getKey().equals("zonen"));
                Object icon = method(api, "getMarkerIcon", String.class).invoke(api, "default");
                for (Map.Entry<World, WorldShare.Shape> e : mine) {
                    WorldShare.Shape s = e.getValue();
                    String world = e.getKey().getName();
                    Object m;
                    if (s.kind().equals("poi")) {
                        m = method(set, "createMarker", String.class, String.class, boolean.class, String.class, double.class, double.class, double.class, Class.forName("org.dynmap.markers.MarkerIcon", true, api.getClass().getClassLoader()), boolean.class)
                                .invoke(set, s.id(), s.label(), false, world, s.x() + 0.5, s.y(), s.z() + 0.5, icon, false);
                    } else if (s.kind().equals("line")) {
                        int n = s.points().length;
                        double[] x = new double[n], y = new double[n], z = new double[n];
                        for (int i = 0; i < n; i++) { x[i] = s.points()[i][0]; y[i] = s.y(); z[i] = s.points()[i][1]; }
                        m = method(set, "createPolyLineMarker", String.class, String.class, boolean.class, String.class, double[].class, double[].class, double[].class, boolean.class)
                                .invoke(set, s.id(), s.label(), false, world, x, y, z, false);
                        if (m != null) method(m, "setLineStyle", int.class, double.class, int.class).invoke(m, (int) Math.max(2, Math.min(8, s.width())), 0.9, s.rgb());
                    } else {
                        int n = s.points().length;
                        double[] x = new double[n], z = new double[n];
                        for (int i = 0; i < n; i++) { x[i] = s.points()[i][0]; z[i] = s.points()[i][1]; }
                        m = method(set, "createAreaMarker", String.class, String.class, boolean.class, String.class, double[].class, double[].class, boolean.class)
                                .invoke(set, s.id(), s.label(), false, world, x, z, false);
                        if (m != null) {
                            method(m, "setLineStyle", int.class, double.class, int.class).invoke(m, 2, 0.9, s.rgb());
                            method(m, "setFillStyle", double.class, int.class).invoke(m, 0.25, s.rgb());
                            if (s.extruded()) method(m, "setRangeY", double.class, double.class).invoke(m, s.maxY(), s.y());
                        }
                    }
                    if (m != null) { try { method(m, "setDescription", String.class).invoke(m, WorldShare.html(s)); } catch (NoSuchMethodException ignored) { } }
                }
            }
        }
    }
}
