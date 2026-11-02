package io.github.freadeax.bauplaner.bridge.fabric;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import io.github.freadeax.bauplaner.mod.Placement;
import io.github.freadeax.bauplaner.mod.PlacementStore;
import io.github.freadeax.bauplaner.mod.PlanModel;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;

/**
 * The placed plan of this world/server: which plan, where, turned/mirrored, visible or not, and the
 * running comparison with the world. Lives only on this computer (see {@link PlacementStore}); nothing
 * is ever sent to the server and the world is never changed.
 */
final class Hologram {
    /** Planned blocks re-read per client tick (about 160 000 per second). */
    static final int SWEEP_PER_TICK = 8_000;

    private final Path root;
    private final PlacementStore store;
    private String worldKey;
    private String planFile;
    private PlanModel plan;
    private LiveCheck check;
    private boolean visible = true;
    /** Error finder: index of the highlighted block, -1 when off. */
    private int target = -1;
    /** Layer mode: all layers, only one layer, or everything up to a layer (world height {@link #layerY}). */
    enum Layers { ALL, ONE, BELOW }
    private Layers layers = Layers.ALL;
    private int layerY;
    /** Missing blocks as see-through textured blocks (true) or as blue boxes. */
    private boolean textured = true;

    Hologram(Path root) {
        this.root = root;
        this.store = new PlacementStore(root.resolve("platzierung.properties"));
        loadSettings();
    }

    Path plansDir() { return root.resolve("plans"); }
    LiveCheck check() { return check; }
    PlanModel plan() { return plan; }
    String planFile() { return planFile; }
    boolean active() { return check != null; }
    boolean visible() { return visible && check != null; }
    int target() { return check == null || target >= check.size() ? -1 : target; }
    Layers layers() { return layers; }
    int layerY() { return layerY; }
    boolean textured() { return textured; }
    /** Lowest and highest world height currently shown. */
    int minY() { return layers == Layers.ONE ? layerY : Integer.MIN_VALUE; }
    int maxY() { return layers == Layers.ALL ? Integer.MAX_VALUE : layerY; }

    /** Next layer mode: all → one layer → up to the layer → all. Starts at the lowest layer that still has work. */
    void cycleLayers() {
        if (check == null) return;
        layers = Layers.values()[(layers.ordinal() + 1) % Layers.values().length];
        if (layers == Layers.ONE) layerY = firstOpenLayer();
        target = -1;
        saveSettings();
    }

    void setLayers(Layers mode, int y) { layers = mode; layerY = y; target = -1; saveSettings(); }

    /** One layer up or down, inside the plan box. */
    void stepLayer(int dy) {
        if (check == null) return;
        if (layers == Layers.ALL) { layers = Layers.ONE; layerY = firstOpenLayer(); }
        else {
            int[] box = check.worldBox();
            layerY = Math.max(box[1], Math.min(box[4], layerY + dy));
        }
        target = -1;
        saveSettings();
    }

    void toggleTextured() { textured = !textured; saveSettings(); }

    /** Lowest world height with missing, wrong or misaligned blocks; the bottom of the box when everything is done. */
    private int firstOpenLayer() {
        int best = Integer.MAX_VALUE;
        for (int i = 0; i < check.size(); i++) {
            var v = check.verdict(i);
            if (v != Verdict.OK && v != Verdict.UNKNOWN) best = Math.min(best, check.worldY(i));
        }
        return best == Integer.MAX_VALUE ? check.worldBox()[1] : best;
    }

    private Path settingsFile() { return root.resolve("einstellungen.properties"); }

    private void loadSettings() {
        var props = new java.util.Properties();
        try (var r = Files.newBufferedReader(settingsFile())) { props.load(r); } catch (IOException | RuntimeException ignored) { return; }
        textured = !"false".equals(props.getProperty("texturen"));
    }

    private void saveSettings() {
        var props = new java.util.Properties();
        props.setProperty("texturen", Boolean.toString(textured));
        try {
            Files.createDirectories(root);
            try (var w = Files.newBufferedWriter(settingsFile())) { props.store(w, "Bauplaner-Mod: Einstellungen"); }
        } catch (IOException ignored) { }
    }

    List<String> planFiles() {
        try (Stream<Path> files = Files.list(plansDir())) {
            return files.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(".schem")).sorted(String.CASE_INSENSITIVE_ORDER).toList();
        } catch (IOException e) {
            return List.of();
        }
    }

    /** World joined: restore what was placed here last time. Returns a message for the player or null. */
    String join(Minecraft mc) {
        clearState();
        worldKey = McCompat.worldKey(mc);
        try {
            var entry = store.get(worldKey);
            if (entry.isEmpty()) return null;
            var e = entry.get();
            plan = PlanModel.read(plansDir().resolve(e.planFile()));
            planFile = e.planFile();
            visible = e.visible();
            check = new LiveCheck(plan, e.placement());
            return "Plan „" + plan.name() + "“ wieder eingeblendet (" + planFile + ").";
        } catch (IOException | RuntimeException ex) {
            clearState();
            return "Gespeicherte Platzierung konnte nicht geladen werden: " + ex.getMessage();
        }
    }

    void leave() { clearState(); worldKey = null; }

    private void clearState() { plan = null; planFile = null; check = null; target = -1; visible = true; layers = Layers.ALL; }

    /** Load a plan and place its project origin on {@code anchor} (keeps turn and mirror of the current placement). */
    String place(Minecraft mc, String file, BlockPos anchor) throws IOException {
        PlanModel p = PlanModel.read(plansDir().resolve(file));
        Placement old = check == null ? null : check.placement();
        Placement at = new Placement(McCompat.dimension(mc.level), anchor.getX(), anchor.getY(), anchor.getZ(),
                old == null ? 0 : old.turns(), old != null && old.mirror());
        plan = p;
        planFile = file;
        visible = true;
        apply(at);
        return "„" + p.name() + "“ platziert bei " + anchor.getX() + " " + anchor.getY() + " " + anchor.getZ() + " (" + p.blockCount() + " Blöcke).";
    }

    void move(int dx, int dy, int dz) { if (check != null) { layerY += dy; apply(check.placement().moved(dx, dy, dz)); } }
    void moveTo(BlockPos pos) { if (check != null) { Placement p = check.placement(); apply(new Placement(p.dimension(), pos.getX(), pos.getY(), pos.getZ(), p.turns(), p.mirror())); } }
    void turn(int quarterTurns) { if (check != null) apply(check.placement().turned(quarterTurns)); }
    void mirror() { if (check != null) apply(check.placement().mirrored()); }

    void toggleVisible() {
        if (check == null) return;
        visible = !visible;
        save();
    }

    /** Remove the plan from this world (the plan file stays). */
    void remove() {
        clearState();
        if (worldKey != null) try { store.remove(worldKey); } catch (IOException ignored) { }
    }

    private void apply(Placement p) {
        check = new LiveCheck(plan, p);
        target = -1;
        save();
    }

    private void save() {
        if (worldKey == null || check == null) return;
        try {
            store.put(worldKey, new PlacementStore.Entry(planFile, check.placement(), visible));
        } catch (IOException ignored) {
            // Saving is a convenience; the hologram keeps working.
        }
    }

    /** Compare a slice of the planned blocks with the world. Only in the plan's dimension. */
    void tick(Minecraft mc) {
        if (check == null || mc.level == null) return;
        if (!McCompat.dimension(mc.level).equals(check.placement().dimension())) return;
        check.sweep(McCompat.liveReader(mc.level), SWEEP_PER_TICK);
        if (target >= 0 && check.verdict(target) == Verdict.OK) target = -1;
    }

    void chunkUnloaded(int cx, int cz) { if (check != null) check.forgetChunk(cx, cz); }

    /** Error finder: highlight the nearest wrong/missing block. Returns the index or -1. */
    int findNext(double x, double y, double z) {
        if (check == null) return -1;
        target = check.nearestProblem(x, y, z, minY(), maxY());
        return target;
    }

    void clearTarget() { target = -1; }
}
