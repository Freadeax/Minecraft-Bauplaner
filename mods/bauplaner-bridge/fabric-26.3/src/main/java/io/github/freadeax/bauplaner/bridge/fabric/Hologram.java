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

    Hologram(Path root) {
        this.root = root;
        this.store = new PlacementStore(root.resolve("platzierung.properties"));
    }

    Path plansDir() { return root.resolve("plans"); }
    LiveCheck check() { return check; }
    PlanModel plan() { return plan; }
    String planFile() { return planFile; }
    boolean active() { return check != null; }
    boolean visible() { return visible && check != null; }
    int target() { return check == null || target >= check.size() ? -1 : target; }

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

    private void clearState() { plan = null; planFile = null; check = null; target = -1; visible = true; }

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

    void move(int dx, int dy, int dz) { if (check != null) apply(check.placement().moved(dx, dy, dz)); }
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
        target = check.nearestProblem(x, y, z);
        return target;
    }

    void clearTarget() { target = -1; }
}
